import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const read = async (pack, pattern) => {
  try { return (await run('unzip', ['-p', pack, pattern], { maxBuffer: 20 * 1024 * 1024 })).stdout; } catch { return ''; }
};

/** Short failure, console and network excerpts from a sealed Kane evidence pack, for the diagnosis brief. */
export async function packExcerpts(pack, { limit = 2000 } = {}) {
  if (!pack) return { failure: null, console: null, network: null };
  const [failure, consoleLog, har] = await Promise.all([read(pack, 'failure.yaml'), read(pack, 'tests/*/logs/0-console.ndjson'), read(pack, 'tests/*/logs/0-network.har')]);
  let network = null;
  try {
    network = JSON.parse(har).log.entries.map(entry => `${entry.request.method} ${entry.request.url} -> ${entry.response.status}`).join('\n');
  } catch { network = har ? har.slice(0, limit) : null; }
  return { failure: failure.slice(0, limit) || null, console: consoleLog.slice(0, limit) || null, network: network?.slice(0, limit) || null };
}

/** Extract the failing step's screenshot so the dashboard can show it. */
export async function extractFailedScreenshot(pack, outFile) {
  const { writeFile } = await import('node:fs/promises');
  const listing = await read(pack, 'tests/*/steps/*/failure.yaml');
  if (!listing) return null;
  const { stdout } = await run('unzip', ['-Z1', pack]);
  const failureStep = stdout.split('\n').find(name => /steps\/[^/]+\/failure\.yaml$/.test(name));
  if (!failureStep) return null;
  const shot = failureStep.replace('failure.yaml', 'screenshot.jpg');
  const { stdout: image } = await run('unzip', ['-p', pack, shot], { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 });
  if (!image.length) return null;
  await writeFile(outFile, image);
  return outFile;
}
