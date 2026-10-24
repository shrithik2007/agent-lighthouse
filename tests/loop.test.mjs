import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scopeGuard, proposal } from '../lighthouse/loop.mjs';

test('scope guard keeps site/ edits and reverts everything else', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lh-scope-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir });
  git('init', '-q');
  git('config', 'user.email', 't@example.com'); git('config', 'user.name', 't');
  await mkdir(join(dir, 'site')); await mkdir(join(dir, 'core'));
  await writeFile(join(dir, 'site', 'index.html'), 'old');
  await writeFile(join(dir, 'core', 'score.mjs'), 'original');
  git('add', '.'); git('commit', '-q', '-m', 'init');
  await writeFile(join(dir, 'site', 'index.html'), 'new');
  await writeFile(join(dir, 'core', 'score.mjs'), 'tampered');
  await writeFile(join(dir, 'stray.txt'), 'x');
  const result = await scopeGuard(dir);
  assert.deepEqual(result.kept, ['site/index.html']);
  assert.deepEqual(result.reverted.sort(), ['core/score.mjs', 'stray.txt']);
  assert.equal(await readFile(join(dir, 'core', 'score.mjs'), 'utf8'), 'original');
  assert.equal(existsSync(join(dir, 'stray.txt')), false);
  assert.equal(await readFile(join(dir, 'site', 'index.html'), 'utf8'), 'new');
});

test('proposal reports a qualified attempt with linked failure, human path and n/a for unknown tax', () => {
  const summary = (score, passed) => ({ score, passedCount: passed, runCount: 3, medianSteps: 15 });
  const text = proposal({
    flow: 'book', mode: 'propose', threshold: 80, outcome: 'qualified',
    qualified: { attempt: 2, branch: 'lighthouse/x/attempt-2', commit: 'abcdef1234' },
    baseline: { score: 0, summary: summary(0, 0), humanPath: { status: 'failed', kaneRunId: 'KR-1' }, runs: [{ status: 'failed', kaneRunId: 'KR-2', evidenceDir: 'evidence/runs/b1' }] },
    attempts: [
      { attempt: 1, gate: 'retry', commit: '1111111aaa', diagnosis: { model: 'm', cause: 'toast vanishes', changes: ['persist confirmation'] }, fixer: 'codex exec', filesChanged: ['site/index.html'], scopeGuard: { reverted: [] }, summary: summary(85, 3), humanPath: { status: 'failed' }, gateReason: 'score qualified but the human path failed' },
      { attempt: 2, gate: 'pass', commit: 'abcdef1234', diagnosis: { model: 'm', cause: 'x', changes: [] }, fixer: 'codex exec', filesChanged: ['site/index.html'], scopeGuard: { reverted: ['core/score.mjs'] }, summary: summary(90, 3), humanPath: { status: 'passed', kaneRunId: 'KR-9' }, runs: [], agentTaxBefore: null, gateReason: 'score 90 vs threshold 80' },
    ],
  });
  assert.match(text, /Qualified on attempt 2: score 90/);
  assert.match(text, /score qualified but the human path failed/);
  assert.match(text, /Scope guard reverted: core\/score\.mjs/);
  assert.match(text, /Agent Tax of BEFORE per successful booking: n\/a/);
  assert.match(text, /not merged/);
});
