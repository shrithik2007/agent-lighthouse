import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/** Capture the real wrapped stream. Interpretation belongs to the verified adapter. */
export async function runKane({ objective, cwd = process.cwd(), killTimeoutMs = 600_000, onProgress = () => {} }) {
  if (typeof objective !== 'string' || !objective.trim()) throw new TypeError('objective is required');
  if (!Number.isInteger(killTimeoutMs) || killTimeoutMs <= 0) throw new RangeError('killTimeoutMs must be positive');
  const directory = join(cwd, 'results', 'raw');
  await mkdir(directory, { recursive: true });
  const startedAt = new Date().toISOString();
  const id = `${startedAt.replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`;
  const rawPath = join(directory, `${id}.ndjson`);
  const stderrPath = join(directory, `${id}.stderr.txt`);
  const metadataPath = join(directory, `${id}.meta.json`);
  const args = ['report', '--', 'kane-cli', 'run', objective, '--agent', '--headless', '--timeout', '180'];
  const stdoutChunks = [];
  const stderrChunks = [];
  const child = spawn('kanehack', args, {
    cwd, env: { ...process.env, KANE_CLI_USER_AGENT: 'codex' },
    stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
  });
  let hostTimedOut = false;
  let escalation;
  let spawnError = null;
  const stopTree = signal => {
    try {
      if (process.platform === 'win32') child.kill(signal);
      else if (child.pid) process.kill(-child.pid, signal);
    } catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  const timer = setTimeout(() => {
    hostTimedOut = true;
    stopTree('SIGTERM');
    escalation = setTimeout(() => stopTree('SIGKILL'), 5000);
    escalation.unref();
  }, killTimeoutMs);
  child.stdout.on('data', chunk => { stdoutChunks.push(chunk); onProgress({ source: 'stdout', bytes: chunk.length }); });
  child.stderr.on('data', chunk => { stderrChunks.push(chunk); onProgress({ source: 'stderr', bytes: chunk.length }); });
  child.on('error', error => { spawnError = { code: error.code, message: error.message }; });
  const completion = await new Promise(resolve => child.on('close', (exitCode, signal) => resolve({ exitCode, signal })));
  clearTimeout(timer); clearTimeout(escalation);
  const stdout = Buffer.concat(stdoutChunks);
  const stderr = Buffer.concat(stderrChunks);
  const metadata = {
    id, objective, startedAt, finishedAt: new Date().toISOString(),
    command: ['kanehack', ...args], ...completion, hostTimedOut, spawnError,
    rawPath, stderrPath,
  };
  await Promise.all([
    writeFile(rawPath, stdout, { mode: 0o600 }),
    writeFile(stderrPath, stderr, { mode: 0o600 }),
    writeFile(metadataPath, JSON.stringify(metadata, null, 2)+'\n', { mode: 0o600 }),
  ]);
  return { ...metadata, metadataPath, stdout, stderr };
}
