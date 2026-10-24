import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { homedir } from 'node:os';
import { parseRun } from './parse.mjs';
import { scoreFlow, agentTax, compare } from '../core/score.mjs';

const HOME = homedir();
const redact = text => String(text).replaceAll(HOME, '~');

/** Parse one captured run and copy its stream, run_end line and test_url into evidence/runs/<label>/. */
export async function collectRun(metadataPath, { label, cwd = process.cwd() }) {
  const meta = JSON.parse(await readFile(metadataPath, 'utf8'));
  const [stdout, stderr] = await Promise.all([readFile(meta.rawPath, 'utf8'), readFile(meta.stderrPath, 'utf8')]);
  const run = parseRun(stdout, { exitCode: meta.exitCode, stderr });
  const dir = join(cwd, 'evidence', 'runs', label);
  await mkdir(dir, { recursive: true });
  const runEndLine = stdout.split('\n').filter(Boolean).findLast(line => line.includes('"type":"run_end"')) ?? null;
  const wrapperLine = /Kane run (KR-\d+): ([A-Z]+)/.exec(stderr);
  await Promise.all([
    writeFile(join(dir, 'stream.ndjson'), redact(stdout)),
    writeFile(join(dir, 'stderr.txt'), redact(stderr)),
    runEndLine ? writeFile(join(dir, 'run_end.json'), JSON.stringify(JSON.parse(redact(runEndLine)), null, 2) + '\n') : null,
    writeFile(join(dir, 'test_url.txt'), (run.testUrl ?? 'n/a') + '\n'),
  ]);
  const { steps, ...summary } = run;
  return {
    label, id: meta.id, url: meta.objective.match(/https?:\/\/\S+?(?=\s)/)?.[0] ?? null,
    startedAt: meta.startedAt, finishedAt: meta.finishedAt,
    kaneRunId: wrapperLine?.[1] ?? null, wrapperLabel: wrapperLine?.[2]?.toLowerCase() ?? null,
    evidenceDir: relative(cwd, dir),
    ...summary, sessionDir: run.sessionDir && redact(run.sessionDir), evidencePack: run.evidencePack && redact(run.evidencePack),
    steps,
  };
}

/** Score a set of collected runs; runs that never started are kept for the record but excluded. */
export function summarize(runs, { optimalSteps }) {
  const scored = runs.filter(run => run.started && run.status !== 'unknown');
  if (!scored.length) return { score: null, runCount: 0, lowConfidence: true, excluded: runs.length };
  return { ...scoreFlow(scored, { optimalSteps }), excluded: runs.length - scored.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [beforeList, afterList, out = 'results/baseline.json'] = process.argv.slice(2);
  const flow = JSON.parse(await readFile('flows/book.json', 'utf8'));
  const load = async (path, side) => Promise.all(JSON.parse(await readFile(path, 'utf8'))
    .map((run, i) => collectRun(run.metadataPath, { label: `baseline-${side}-${i + 1}` })));
  const before = await load(beforeList, 'before');
  const after = await load(afterList, 'after');
  const beforeSummary = summarize(before, flow);
  const afterSummary = summarize(after, flow);
  const usable = runs => runs.filter(run => run.started && run.status !== 'unknown');
  const result = {
    flow: flow.name, optimalSteps: flow.optimalSteps, generatedAt: new Date().toISOString(),
    before: { url: before[0]?.url ?? null, summary: beforeSummary, runs: before },
    after: { url: after[0]?.url ?? null, summary: afterSummary, runs: after },
    comparison: beforeSummary.runCount && afterSummary.runCount ? compare(beforeSummary, afterSummary) : null,
    // Agent Tax: BEFORE's successful-run medians over AFTER's (the reference), per booking.
    agentTax: usable(before).length && usable(after).length ? agentTax(usable(before), { baselineRuns: usable(after) }) : null,
  };
  await mkdir('results', { recursive: true });
  await writeFile(out, JSON.stringify(result, null, 2) + '\n');
  const row = run => [run.label, run.status, run.exitCode, run.stepsTaken ?? 'n/a', run.actionSteps ?? 'n/a', run.overheadSteps ?? 'n/a', run.failedSteps ?? 'n/a', run.durationSec ?? 'n/a', run.credits == null ? 'n/a' : run.credits.toFixed(1), run.reference ?? 'n/a', run.kaneRunId ?? 'n/a'].join(' | ');
  console.log([...before, ...after].map(row).join('\n'));
  console.log(JSON.stringify({ before: beforeSummary, after: afterSummary, comparison: result.comparison, agentTax: result.agentTax }, null, 2));
}
