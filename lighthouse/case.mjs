import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { collectRun, summarize } from './collect.mjs';
import { agentTax } from '../core/score.mjs';
import { caseConfig } from './loop.mjs';

/** Build a case's baseline.json from captured runs (no reference fix: tax is against optimalSteps). */
export async function buildCaseBaseline({ flowPath, runsPath, cwd = process.cwd() }) {
  const flow = JSON.parse(await readFile(join(cwd, flowPath), 'utf8'));
  const cfg = caseConfig(flow);
  const captured = JSON.parse(await readFile(join(cwd, runsPath), 'utf8'));
  const runs = [];
  for (const [i, run] of captured.entries()) runs.push(await collectRun(run.metadataPath, { label: `${cfg.id}-baseline-${i + 1}`, cwd }));
  const summary = summarize(runs, flow);
  const usable = runs.filter(run => run.started && run.status !== 'unknown');
  const result = {
    case: cfg.id, flow: flow.name, optimalSteps: flow.optimalSteps, generatedAt: new Date().toISOString(),
    before: { url: cfg.url, summary, runs },
    after: null,
    // Without a reference fix only extra steps over optimalSteps are computable; seconds and credits stay null.
    agentTax: usable.some(run => run.status === 'passed') ? agentTax(usable, { optimalSteps: flow.optimalSteps }) : null,
  };
  await mkdir(join(cwd, cfg.outDir), { recursive: true });
  await writeFile(join(cwd, cfg.baselineFile), JSON.stringify(result, null, 2) + '\n');
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [flowPath, runsPath] = process.argv.slice(2);
  const result = await buildCaseBaseline({ flowPath, runsPath });
  for (const run of result.before.runs) console.log([run.label, run.status, run.exitCode, run.stepsTaken ?? 'n/a', run.actionSteps ?? 'n/a', run.overheadSteps ?? 'n/a', run.durationSec ?? 'n/a', run.credits?.toFixed(1) ?? 'n/a', run.reference ?? 'n/a', run.kaneRunId ?? 'n/a', run.failedRemarks?.[0] ?? ''].join(' | '));
  console.log(JSON.stringify({ summary: result.before.summary, agentTax: result.agentTax }));
}
