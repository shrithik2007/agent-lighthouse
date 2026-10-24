import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { extractFailedScreenshot } from './pack.mjs';

const slim = ({ steps, ...run }) => run;
// Prefer the pack committed under evidence/packs/ (portable) over the local session path.
function committedPack(cwd, kaneRunId) {
  if (!kaneRunId) return null;
  const dir = join(cwd, 'evidence', 'packs');
  if (!existsSync(dir)) return null;
  const name = readdirSync(dir).find(file => file.startsWith(`${kaneRunId}-`) && file.endsWith('.evidence'));
  return name ? `evidence/packs/${name}` : null;
}
const sideSummary = (summary, label) => summary ? {
  label, score: summary.score, passedCount: summary.passedCount, runCount: summary.runCount,
  medianSteps: summary.medianSteps, medianDurationSec: summary.medianDurationSec, medianCredits: summary.medianCredits, lowConfidence: summary.lowConfidence,
} : null;

/** Compose results/latest.json from the recorded baseline and the newest loop record (if any). */
export async function buildLatest({ cwd = process.cwd(), loopFile, headline, links = {} } = {}) {
  const baseline = JSON.parse(await readFile(join(cwd, 'results', 'baseline.json'), 'utf8'));
  let loop = null;
  const loopDir = join(cwd, 'results', 'loop');
  if (loopFile) loop = JSON.parse(await readFile(loopFile, 'utf8'));
  else if (existsSync(loopDir)) {
    const files = (await readdir(loopDir)).filter(name => name.endsWith('.json')).sort();
    if (files.length) loop = JSON.parse(await readFile(join(loopDir, files.at(-1)), 'utf8'));
  }
  const final = loop?.attempts.find(a => a.attempt === loop.qualified?.attempt) ?? loop?.attempts.findLast(a => a.summary);
  const beforeRuns = baseline.before.runs;
  const failing = beforeRuns.find(run => run.status === 'failed' && run.failedRemarks?.length) ?? beforeRuns.find(run => run.status !== 'passed');

  let screenshot = null;
  if (failing?.evidencePack) {
    const out = join(cwd, failing.evidenceDir, 'failing-step.jpg');
    screenshot = await extractFailedScreenshot(failing.evidencePack.replace(/^~/, process.env.HOME), out).catch(() => null) ? join(failing.evidenceDir, 'failing-step.jpg') : null;
  }
  const failedStep = failing?.firstFailedStep;
  const proposalPath = join(cwd, 'results', 'proposal.md');
  const proposal = existsSync(proposalPath) ? { path: 'results/proposal.md', excerpt: (await readFile(proposalPath, 'utf8')).split('\n').slice(0, 14).join('\n') } : null;

  // The loop's own post-fix measurement and the hand-built reference fix are separate fields.
  const postFix = final ? sideSummary(final.summary, 'After loop repair') : null;
  const referenceFix = sideSummary(baseline.after.summary, 'Reference fix (AFTER fixture)');
  const agentTaxValue = final?.agentTaxBefore ?? baseline.agentTax;
  const headlineSide = postFix ?? referenceFix;
  const scoreGap = baseline.before.summary.score != null && headlineSide?.score != null ? headlineSide.score - baseline.before.summary.score : null;
  return {
    site: { name: 'Pitchline', beforeUrl: baseline.before.url, referenceUrl: baseline.after.url },
    flow: baseline.flow, optimalSteps: baseline.optimalSteps, mode: loop?.mode ?? null, threshold: loop?.threshold ?? 80,
    outcome: loop?.outcome ?? 'baseline', loopId: loop?.loopId ?? null,
    headline: headline ?? (scoreGap != null && scoreGap >= 15 ? 'score' : 'tax'),
    before: sideSummary(baseline.before.summary, 'Before'),
    postFix, postFixScore: postFix?.score ?? null,
    referenceFix, referenceFixScore: referenceFix?.score ?? null,
    agentTax: agentTaxValue, agentTaxBasis: final?.agentTaxBefore ? 'BEFORE vs repaired page, successful-run medians' : 'BEFORE vs AFTER reference fixture, successful-run medians',
    runGroups: [
      ['Before', beforeRuns.map(slim)],
      ...(loop?.attempts ?? []).filter(a => a.runs).map(a => [`Attempt ${a.attempt}`, [...a.runs, ...(a.humanPath ? [{ ...a.humanPath, humanPath: true }] : [])].map(slim)]),
      ['Reference fix', baseline.after.runs.map(slim)],
    ],
    failingStep: failing ? {
      runLabel: failing.label, kaneRunId: failing.kaneRunId, site: failing.url, step: failedStep?.step ?? null,
      remark: failedStep?.remark ?? failing.oneLiner, summary: failing.oneLiner, reasonCode: failing.reasonCode, testUrl: failing.testUrl,
      screenshot, evidencePack: committedPack(cwd, failing.kaneRunId) ?? failing.evidencePack,
      viewerCommand: `kane-cli evidence serve ${committedPack(cwd, failing.kaneRunId) ?? failing.evidencePack}`,
    } : null,
    attempts: (loop?.attempts ?? []).map(a => ({
      attempt: a.attempt, commit: a.commit ?? null, filesChanged: a.filesChanged ?? [], cause: a.diagnosis?.cause ?? null, error: a.error ?? null,
      score: a.summary?.score ?? null, humanPath: a.humanPath?.status ?? null, gate: a.gate, gateReason: a.gateReason ?? null,
      scopeGuardReverted: a.scopeGuard?.reverted ?? [], fixer: a.fixer ?? null,
      highlight: a.summary?.score != null && a.summary.score >= (loop.threshold ?? 80) && a.humanPath?.status !== 'passed',
    })),
    humanPath: { baseline: loop?.baseline.humanPath ? slim(loop.baseline.humanPath) : null, final: final?.humanPath ? slim(final.humanPath) : null },
    proposal,
    links: { runReport: 'https://kaneclihack.sh/t/lighthouse/proof', repo: null, video: null, ...links },
    recorded: false,
    generatedAt: new Date().toISOString(),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
  const latest = await buildLatest({ loopFile: opt('loop'), headline: opt('headline') });
  await mkdir('results', { recursive: true });
  await writeFile('results/latest.json', JSON.stringify(latest, null, 2) + '\n');
  console.log(`results/latest.json: headline ${latest.headline}, outcome ${latest.outcome}, before ${latest.before?.score ?? 'n/a'}, post-fix ${latest.postFixScore ?? 'n/a'}, reference fix ${latest.referenceFixScore ?? 'n/a'}`);
}
