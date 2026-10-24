import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseRun, countSteps, parseEvents, findReference } from '../lighthouse/parse.mjs';

const fixture = await readFile(new URL('./fixtures/kane-run-after-passed.ndjson', import.meta.url), 'utf8');

test('genuine AFTER stream parses as a passed run with split step counts', () => {
  const run = parseRun(fixture, { exitCode: 0 });
  assert.equal(run.status, 'passed');
  assert.equal(run.stepsTaken, 15);
  assert.equal(run.failedSteps, 0);
  assert.equal(run.overheadSteps, 5);
  assert.equal(run.actionSteps, 10);
  assert.equal(run.reference, 'PL-4821');
  assert.equal(run.credits, 23.0090075);
  assert.equal(run.durationSec, 62.9);
  assert.equal(run.rejectedLines, 0);
  assert.match(run.evidencePack, /\.evidence$/);
});

test('run_end.duration is seconds: it fits inside the stream timestamp span', () => {
  const { events } = parseEvents(fixture);
  const progress = events.filter(event => event.step != null);
  const end = events.find(event => event.type === 'run_end');
  const spanSec = (Date.parse(end.ts) - Date.parse(progress[0].ts)) / 1000;
  assert.ok(end.duration <= spanSec + 1 && end.duration > spanSec / 2, `${end.duration}s vs span ${spanSec}s`);
});

test('exit 2 with no progress is not started and carries no metrics', () => {
  const head = fixture.split('\n').slice(0, 3).join('\n');
  const run = parseRun(head, { exitCode: 2 });
  assert.equal(run.status, 'not_started');
  assert.equal(run.started, false);
  assert.equal(run.stepsTaken, null);
  assert.equal(run.durationSec, null);
});

test('exit 3 is a timeout observation; missing run_end leaves duration and credits unknown', () => {
  const partial = fixture.split('\n').slice(0, 12).join('\n');
  const run = parseRun(partial, { exitCode: 3 });
  assert.equal(run.status, 'timeout');
  assert.ok(run.stepsTaken > 0);
  assert.equal(run.credits, null);
});

test('repeated step indices in separate child agents are counted separately; final status decides failure', () => {
  const events = [
    { step: 1, status: 'running', remark: 'Step 1' }, { step: 1, status: 'failed', remark: 'click: Go' },
    { type: 'child_agent_start', child_id: 'a' },
    { step: 1, status: 'running' }, { step: 1, status: 'done', remark: 'click: Book' },
    { type: 'child_agent_end', child_id: 'a' },
    { step: 1, status: 'running' }, { step: 1, status: 'done', remark: 'wait: queued plan' },
    { step: 2, status: 'running' }, { step: 2, status: 'done', remark: '' },
  ];
  const counts = countSteps(events);
  assert.equal(counts.stepsTaken, 4);
  assert.equal(counts.failedSteps, 1);
  assert.equal(counts.overheadSteps, 2);
  assert.equal(counts.actionSteps, 2);
});

test('reference is found under the key Kane chose', () => {
  assert.equal(findReference({ booking_reference: 'PL-4821' }), 'PL-4821');
  assert.equal(findReference({ booking_confirmation_shown: 'true', reference_code: 'PL-4821' }), 'PL-4821');
  assert.equal(findReference({ reference_code_shown: 'true' }), null);
  assert.equal(findReference({}), null);
});
