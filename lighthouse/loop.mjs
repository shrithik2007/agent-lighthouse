import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runKane } from './kane.mjs';
import { collectRun, summarize } from './collect.mjs';
import { packExcerpts } from './pack.mjs';
import { callOpenAI } from './openai.mjs';
import { compare, agentTax, gateDecision } from '../core/score.mjs';
import { createSiteServer } from '../scripts/serve.mjs';

const exec = promisify(execFile);
const git = async (args, cwd) => (await exec('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 })).stdout.trim();
const ATTEMPT_PORT = 4103;

export const FRICTION_CHECKLIST = [
  'Ambiguous or duplicate call-to-action labels, or a control that leads to a dead end instead of the booking form',
  'Blocking overlays (cookie walls, modals) whose dismiss control is tiny, unlabeled or not a real button',
  'Form fields identified only by placeholder text, with no associated visible <label>',
  'Undisclosed input format requirements (for example an ISO date) and generic errors such as "Invalid input"',
  'Custom div-based controls (time slots, checkboxes) instead of native select, radio or checkbox elements',
  'Transient success feedback (toasts that disappear) instead of a persistent, announced confirmation with the reference',
];

const DIAGNOSIS_SCHEMA = {
  name: 'diagnosis',
  schema: {
    type: 'object', additionalProperties: false,
    required: ['cause', 'patterns', 'filesToTouch', 'changes', 'acceptanceCheck'],
    properties: {
      cause: { type: 'string', description: 'One-sentence root cause of the Kane failures, citing the failing remark.' },
      patterns: { type: 'array', items: { type: 'string' }, description: 'Which checklist patterns are present on the page.' },
      filesToTouch: { type: 'array', items: { type: 'string' } },
      changes: { type: 'array', items: { type: 'string' }, description: 'Concrete edits, smallest first, each naming the element.' },
      acceptanceCheck: { type: 'string', description: 'What a fresh agent run must observe for the fix to count.' },
    },
  },
};

/** One-shot measurement: `count` fresh wrapped Kane runs plus one named human-path run, all from this shell. */
async function measureSite({ flow, url, label, count, cwd, log }) {
  const objective = flow.objective.replaceAll('{{url}}', url);
  const runs = [];
  for (let i = 1; i <= count; i++) {
    log(`  kane ${label} run ${i}/${count} on ${url}`);
    const raw = await runKane({ objective, cwd });
    runs.push(await collectRun(raw.metadataPath, { label: `${label}-${i}`, cwd }));
    log(`    ${runs.at(-1).status} · ${runs.at(-1).stepsTaken ?? 'n/a'} steps · ${runs.at(-1).kaneRunId ?? 'n/a'}`);
  }
  return runs;
}

async function humanPath({ flow, url, label, cwd, log }) {
  log(`  kane human-path on ${url}`);
  const raw = await runKane({ objective: flow.humanPath.objective.replaceAll('{{url}}', url), cwd, extraArgs: ['--name', 'human-path'] });
  const run = await collectRun(raw.metadataPath, { label: `${label}-human-path`, cwd });
  log(`    human path ${run.status} · ${run.kaneRunId ?? 'n/a'}`);
  return run;
}

function failureBrief(runs) {
  return runs.filter(run => run.status !== 'passed').map(run => ({
    run: run.kaneRunId ?? run.id, status: run.status, failedRemarks: run.failedRemarks, summary: run.summary,
    steps: run.steps?.map(step => `${step.status} ${step.remark}`),
  }));
}

async function diagnose({ cwd, worktree, runs, human, attempt, previous }) {
  const failing = runs.filter(run => run.status !== 'passed');
  const excerpts = await Promise.all(failing.slice(0, 2).map(run => packExcerpts(run.evidencePack?.replace(/^~/, process.env.HOME))));
  const html = await readFile(join(worktree, 'site', 'index.html'), 'utf8');
  const input = JSON.stringify({
    attempt, task: 'Book a free first visit for Sam Rivera on 2 November 2026 at noon and read back the reference PL-4821.',
    kaneFailures: failureBrief(runs), humanPath: { status: human.status, failedRemarks: human.failedRemarks, summary: human.summary },
    evidenceExcerpts: excerpts, previousAttempt: previous ?? null, checklist: FRICTION_CHECKLIST, file: 'site/index.html', html,
  });
  return callOpenAI({
    cwd, purpose: `diagnosis attempt ${attempt}`, schema: DIAGNOSIS_SCHEMA, input,
    instructions: 'You diagnose why an AI browser agent (Kane CLI) struggles to complete a booking on a small owned website. Use the Kane failure remarks, step lists and evidence excerpts as primary evidence and the checklist as a guide. Only site/index.html may change. Keep the visual design, copy tone and the PL-4821 reference. Human visitors must still be able to complete the booking and see PL-4821 for at least five seconds.',
  });
}

function fixBrief(diagnosis, attempt) {
  return [
    `You are fixing site/index.html (attempt ${attempt}) so an AI browser agent and a human can both book a free first visit.`,
    `Root cause from Kane failures: ${diagnosis.cause}`,
    'Make these changes:', ...diagnosis.changes.map(change => `- ${change}`),
    `Acceptance check: ${diagnosis.acceptanceCheck}`,
    'Rules: edit ONLY site/index.html. Do not touch fixtures/, tests/, lighthouse/ or any other file. Keep the reference PL-4821 and the overall look. Vanilla HTML/CSS/JS only. Do not commit; just leave the edited file.',
  ].join('\n');
}

/** Codex non-interactively in the attempt worktree; falls back to an OpenAI unified diff if Codex is unavailable. */
async function applyFix({ cwd, worktree, diagnosis, attempt, log }) {
  const brief = fixBrief(diagnosis.json, attempt);
  const lastMessage = join(cwd, 'results', 'loop', `codex-attempt-${attempt}.txt`);
  const codex = await new Promise(resolvePromise => {
    const child = spawn('codex', ['exec', '-C', worktree, '-s', 'workspace-write', '--ephemeral', '--skip-git-repo-check', '-o', lastMessage, '-'], { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), 600_000);
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => resolvePromise({ code: null, error: error.message }));
    child.on('close', code => { clearTimeout(timer); resolvePromise({ code, error: code ? stderr.slice(-500) : null }); });
    child.stdin.end(brief);
  });
  await appendCall(cwd, { purpose: `fixer attempt ${attempt}`, tool: 'codex exec', ok: codex.code === 0, error: codex.error ?? null });
  if (codex.code === 0) { log(`  fixer: codex exec finished`); return { tool: 'codex exec', brief }; }
  log(`  fixer: codex unavailable (${codex.error?.split('\n').at(-1) ?? 'error'}); falling back to an OpenAI diff`);
  const html = await readFile(join(worktree, 'site', 'index.html'), 'utf8');
  const result = await callOpenAI({
    cwd, purpose: `fixer attempt ${attempt} (diff fallback)`,
    instructions: 'Return only a unified diff (git apply format, paths a/site/index.html and b/site/index.html) implementing the brief. No prose.',
    input: `${brief}\n\n--- site/index.html ---\n${html}`,
  });
  const patch = join(cwd, 'results', 'loop', `fallback-attempt-${attempt}.diff`);
  await writeFile(patch, result.text.replace(/^```(?:diff)?\n|```\s*$/g, ''));
  await exec('git', ['apply', '--include=site/*', patch], { cwd: worktree });
  return { tool: 'openai diff', brief };
}

// The fixer's own tool use is not an OpenAI API call from the product; it is recorded so the log is complete.
async function appendCall(cwd, entry) {
  const { appendFile } = await import('node:fs/promises');
  await appendFile(join(cwd, 'results', 'openai-calls.jsonl'), JSON.stringify({
    ts: new Date().toISOString(), model: null, inputTokens: null, outputTokens: null, totalTokens: null, ...entry,
  }) + '\n');
}

/** Keep only the fixer's changes inside site/. Everything else is reverted and recorded. */
export async function scopeGuard(worktree) {
  // Untrimmed -z output: the two status columns are positional and paths may contain spaces.
  const { stdout } = await exec('git', ['status', '--porcelain', '-z', '--untracked-files=all', '--no-renames'], { cwd: worktree });
  const reverted = [];
  const kept = [];
  for (const line of stdout.split('\0').filter(Boolean)) {
    const code = line.slice(0, 2);
    const path = line.slice(3);
    if (path.startsWith('site/')) { kept.push(path); continue; }
    if (code === '??') await rm(join(worktree, path), { recursive: true, force: true });
    else await git(['checkout', 'HEAD', '--', path], worktree);
    reverted.push(path);
  }
  return { kept, reverted };
}

async function serve(file) {
  const server = createSiteServer(file);
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(ATTEMPT_PORT, '127.0.0.1', ok); });
  return server;
}

export async function loop({ flowName = 'book', threshold = 80, maxAttempts = 3, mode = 'propose', count = 3, cwd = process.cwd(), log = console.error } = {}) {
  if (!['propose', 'apply'].includes(mode)) throw new Error('mode must be propose or apply');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set: the diagnosis step requires the OpenAI API');
  const flow = JSON.parse(await readFile(join(cwd, 'flows', `${flowName}.json`), 'utf8'));
  const dirty = (await git(['status', '--porcelain', '--untracked-files=no'], cwd)).split('\n').filter(Boolean);
  if (dirty.length) throw new Error(`Refusing to run with uncommitted tracked changes (${dirty.join(', ')}); commit or stash them first`);
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  const baseSha = await git(['rev-parse', 'HEAD'], cwd);
  const loopId = new Date().toISOString().replaceAll(':', '-').slice(0, 19);
  await mkdir(join(cwd, 'results', 'loop'), { recursive: true });

  // Baseline: reuse the recorded BEFORE measurement, then one named human-path run on the working copy.
  const baseline = JSON.parse(await readFile(join(cwd, 'results', 'baseline.json'), 'utf8'));
  const beforeRuns = baseline.before.runs;
  const beforeSummary = baseline.before.summary;
  log(`baseline: BEFORE score ${beforeSummary.score ?? 'n/a'} from ${beforeRuns.length} recorded runs`);
  const beforeHuman = await humanPath({ flow, url: 'http://localhost:4101', label: `loop-${loopId}-baseline`, cwd, log });

  const record = {
    loopId, mode, flow: flow.name, threshold, maxAttempts, baseBranch: branch, baseSha, startedAt: new Date().toISOString(),
    baseline: { score: beforeSummary.score, summary: beforeSummary, runs: beforeRuns.map(({ steps, ...run }) => run), humanPath: beforeHuman },
    attempts: [], outcome: null,
  };
  const save = () => writeFile(join(cwd, 'results', 'loop', `${loopId}.json`), JSON.stringify(record, null, 2) + '\n');

  let parent = baseSha;
  let lastRuns = beforeRuns;
  let lastHuman = beforeHuman;
  let previous = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptBranch = `lighthouse/${loopId}/attempt-${attempt}`;
    const worktree = resolve(cwd, '.lighthouse', 'worktrees', `${loopId}-a${attempt}`);
    await git(['worktree', 'add', '-q', '-b', attemptBranch, worktree, parent], cwd);
    const entry = { attempt, branch: attemptBranch, startedAt: new Date().toISOString() };
    record.attempts.push(entry);
    let server;
    try {
      log(`attempt ${attempt}/${maxAttempts}: diagnosis`);
      const diagnosis = await diagnose({ cwd, worktree, runs: lastRuns, human: lastHuman, attempt, previous });
      entry.diagnosis = { ...diagnosis.json, model: diagnosis.model, responseId: diagnosis.responseId };
      log(`  cause: ${diagnosis.json.cause}`);
      const fix = await applyFix({ cwd, worktree, diagnosis, attempt, log });
      entry.fixer = fix.tool;
      entry.scopeGuard = await scopeGuard(worktree);
      if (entry.scopeGuard.reverted.length) log(`  scope guard reverted: ${entry.scopeGuard.reverted.join(', ')}`);
      if (!entry.scopeGuard.kept.length) throw new Error('fixer made no change inside site/');
      const answers = lastRuns.find(run => run.status !== 'passed') ?? lastHuman;
      const subject = `fix(site): attempt ${attempt} answers Kane ${answers.kaneRunId ?? answers.id}`;
      const body = `Kane failure: ${answers.failedRemarks?.[0] ?? answers.oneLiner ?? answers.status}\nCause (OpenAI diagnosis): ${diagnosis.json.cause}\n\n${diagnosis.json.changes.map(c => `- ${c}`).join('\n')}\n\nFixer: ${fix.tool}. Scope guard reverted: ${entry.scopeGuard.reverted.join(', ') || 'nothing'}.`;
      await git(['add', 'site'], worktree);
      await git(['commit', '-q', '-m', subject, '-m', body], worktree);
      entry.commit = await git(['rev-parse', 'HEAD'], worktree);
      entry.filesChanged = (await git(['diff', '--name-only', `${parent}..${entry.commit}`], worktree)).split('\n').filter(Boolean);
      entry.diffStat = await git(['diff', '--shortstat', `${parent}..${entry.commit}`], worktree);
      log(`  committed ${entry.commit.slice(0, 7)} (${entry.diffStat})`);

      server = await serve(join(worktree, 'site', 'index.html'));
      const url = `http://localhost:${ATTEMPT_PORT}`;
      entry.runs = await measureSite({ flow, url, label: `loop-${loopId}-a${attempt}`, count, cwd, log });
      entry.humanPath = await humanPath({ flow, url, label: `loop-${loopId}-a${attempt}`, cwd, log });
      entry.summary = summarize(entry.runs, flow);
      const usable = entry.runs.filter(run => run.started && run.status !== 'unknown');
      entry.comparison = entry.summary.runCount ? compare(beforeSummary, entry.summary) : null;
      entry.agentTaxBefore = usable.some(run => run.status === 'passed') ? agentTax(beforeRuns.filter(run => run.started), { baselineRuns: usable }) : null;
      const scoreGate = gateDecision({ score: entry.summary.score, threshold, attempt, maxAttempts });
      entry.humanPathPassed = entry.humanPath.status === 'passed';
      entry.gate = scoreGate === 'pass' && !entry.humanPathPassed ? (attempt >= maxAttempts ? 'escalate' : 'retry') : scoreGate;
      entry.gateReason = scoreGate === 'pass' && !entry.humanPathPassed ? 'score qualified but the human path failed' : `score ${entry.summary.score ?? 'n/a'} vs threshold ${threshold}`;
      log(`  score ${entry.summary.score ?? 'n/a'} · human path ${entry.humanPath.status} · gate ${entry.gate}`);
      parent = entry.commit;
      lastRuns = entry.runs;
      lastHuman = entry.humanPath;
      previous = { cause: diagnosis.json.cause, changes: diagnosis.json.changes, score: entry.summary.score, humanPath: entry.humanPath.status };
    } catch (error) {
      entry.error = error.message;
      entry.gate = attempt >= maxAttempts ? 'escalate' : 'retry';
      log(`  attempt ${attempt} error: ${error.message}`);
      if (/OPENAI_API_KEY|OpenAI diagnosis/.test(error.message)) { record.outcome = 'blocked'; entry.finishedAt = new Date().toISOString(); await save(); throw error; }
    } finally {
      if (server) await new Promise(ok => server.close(ok));
      entry.finishedAt = new Date().toISOString();
      await git(['worktree', 'remove', '--force', worktree], cwd).catch(() => {});
      await save();
    }
    if (entry.gate === 'pass') {
      record.outcome = 'qualified';
      record.qualified = { attempt, branch: attemptBranch, commit: entry.commit };
      break;
    }
    if (entry.gate === 'escalate') { record.outcome = 'escalated'; break; }
  }

  if (record.outcome === 'qualified' && mode === 'apply') {
    await git(['merge', '--ff-only', '-q', record.qualified.branch], cwd);
    record.applied = { into: branch, head: await git(['rev-parse', 'HEAD'], cwd) };
    log(`applied: ${branch} fast-forwarded to ${record.applied.head.slice(0, 7)}`);
  }
  record.finishedAt = new Date().toISOString();
  await save();
  await writeFile(join(cwd, 'results', 'proposal.md'), proposal(record));
  return record;
}

const fmt = (value, digits = 0) => value == null ? 'n/a' : Number(value).toFixed(digits);

export function proposal(record) {
  const final = record.attempts.find(a => a.attempt === record.qualified?.attempt) ?? record.attempts.at(-1);
  const head = record.outcome === 'qualified'
    ? `Qualified on attempt ${record.qualified.attempt}: score ${fmt(final.summary?.score)} (threshold ${record.threshold}) and the human path passed.`
    : record.outcome === 'escalated' ? `Escalated after ${record.attempts.length} attempts: no attempt reached score ${record.threshold} with a passing human path. Owner input needed.` : `Outcome: ${record.outcome}.`;
  const tax = final?.agentTaxBefore;
  const lines = [
    `# Agent Lighthouse: repair proposal for ${record.flow}`, '',
    head, '',
    `Mode: **${record.mode}**${record.applied ? ` (applied to ${record.applied.into} at ${record.applied.head.slice(0, 7)})` : ' (not merged; review the branch below)'}.`,
    record.qualified ? `Branch: \`${record.qualified.branch}\` · commit \`${record.qualified.commit.slice(0, 7)}\`` : '', '',
    '## Before and after', '',
    '| | BEFORE | Proposed |', '| --- | --- | --- |',
    `| Score | ${fmt(record.baseline.score)} | ${fmt(final?.summary?.score)} |`,
    `| Passed runs | ${record.baseline.summary.passedCount}/${record.baseline.summary.runCount} | ${final?.summary?.passedCount ?? 'n/a'}/${final?.summary?.runCount ?? 'n/a'} |`,
    `| Median steps | ${fmt(record.baseline.summary.medianSteps)} | ${fmt(final?.summary?.medianSteps)} |`,
    `| Human path (PL-4821 visible after 5 s) | ${record.baseline.humanPath.status} | ${final?.humanPath?.status ?? 'n/a'} |`, '',
    `Agent Tax of BEFORE per successful booking: ${tax ? `+${fmt(tax.extraSteps)} steps · +${fmt(tax.extraSeconds)} s · +${fmt(tax.extraCredits, 1)} credits` : 'n/a (BEFORE had no successful booking, so tax per booking is not computable)'}.`, '',
    '## Changes, each linked to the Kane failure it answers', '',
    ...record.attempts.flatMap(a => [
      `### Attempt ${a.attempt}${a.commit ? ` · \`${a.commit.slice(0, 7)}\`` : ''} · gate **${a.gate}**`, '',
      a.diagnosis ? `Cause (OpenAI ${a.diagnosis.model}): ${a.diagnosis.cause}` : `Error: ${a.error}`,
      ...(a.diagnosis?.changes ?? []).map(c => `- ${c}`),
      a.fixer ? `Fixer: ${a.fixer}. Files: ${a.filesChanged?.join(', ') ?? 'n/a'}. Scope guard reverted: ${a.scopeGuard?.reverted.join(', ') || 'nothing'}.` : '',
      a.summary ? `Result: score ${fmt(a.summary.score)}, ${a.summary.passedCount}/${a.summary.runCount} passed, human path ${a.humanPath?.status}. ${a.gateReason}.` : '',
      '',
    ]),
    '## Evidence', '',
    `- BEFORE failing runs: ${record.baseline.runs.filter(r => r.status !== 'passed').map(r => `${r.kaneRunId ?? r.id} (\`${r.evidenceDir}\`)`).join(', ') || 'none'}`,
    `- Proposed runs: ${final?.runs?.map(r => `${r.kaneRunId ?? r.id} ${r.status} (\`${r.evidenceDir}\`)`).join(', ') ?? 'n/a'}`,
    `- Human path: baseline ${record.baseline.humanPath.kaneRunId ?? 'n/a'} ${record.baseline.humanPath.status}; proposed ${final?.humanPath?.kaneRunId ?? 'n/a'} ${final?.humanPath?.status ?? 'n/a'}`,
    '- Kane run reports: https://kaneclihack.sh/t/lighthouse/proof (the event wrapper labels Kane 0.10 runs "errored"; see README limitations)', '',
    'A score alone never qualifies a patch: the named human-path run must also pass. Generated by `lighthouse loop`.', '',
  ];
  return lines.filter(line => line !== null).join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
  const record = await loop({
    flowName: opt('flow', 'book'), threshold: Number(opt('threshold', 80)), maxAttempts: Number(opt('max-attempts', 3)),
    mode: opt('mode', 'propose'), count: Number(opt('runs', 3)),
  }).catch(error => { console.error(`lighthouse loop: ${error.message}`); process.exit(1); });
  console.log(JSON.stringify({ loopId: record.loopId, outcome: record.outcome, attempts: record.attempts.map(a => ({ attempt: a.attempt, commit: a.commit?.slice(0, 7), score: a.summary?.score ?? null, humanPath: a.humanPath?.status ?? null, gate: a.gate })) }, null, 2));
  process.exit(record.outcome === 'qualified' ? 0 : 1);
}
