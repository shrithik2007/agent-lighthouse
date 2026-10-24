import { readFile } from 'node:fs/promises';
import { runKane } from './kane.mjs';

/** Run `count` fresh, sequential, wrapped Kane runs of a flow against one URL. */
export async function measure({ flowPath = 'flows/book.json', url, count = 3, cwd = process.cwd(), log = console.error }) {
  const flow = JSON.parse(await readFile(flowPath, 'utf8'));
  const objective = flow.objective.replaceAll('{{url}}', url);
  const runs = [];
  for (let i = 1; i <= count; i++) {
    log(`run ${i}/${count} on ${url}`);
    const run = await runKane({ objective, cwd });
    log(`  exit ${run.exitCode} -> ${run.rawPath}`);
    runs.push({ id: run.id, url, exitCode: run.exitCode, metadataPath: run.metadataPath, rawPath: run.rawPath });
  }
  return runs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [url, count = '3', flowPath = 'flows/book.json'] = process.argv.slice(2);
  if (!url) { console.error('usage: node lighthouse/measure.mjs <url> [count] [flow.json]'); process.exit(2); }
  const runs = await measure({ url, count: Number(count), flowPath });
  console.log(JSON.stringify(runs, null, 2));
}
