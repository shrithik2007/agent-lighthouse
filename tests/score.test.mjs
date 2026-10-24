import { test } from 'node:test';
import assert from 'node:assert/strict';
import { median, scoreFlow, scoreSite, compare, gateDecision, agentTax } from '../core/score.mjs';

// Synthetic unit inputs, not Kane observations or reportable measurements.
const run = overrides => ({ flow: 'unit-fixture', status: 'passed', stepsTaken: 7, failedSteps: 0, durationSec: 20, credits: 10, ...overrides });
const three = overrides => Array.from({ length: 3 }, () => run(overrides));
const score = runs => scoreFlow(runs, { optimalSteps: 7 });

test('median handles odd/even arrays without mutation and preserves missingness', () => {
  const values = [9, 1, 3];
  assert.equal(median(values), 3);
  assert.deepEqual(values, [9, 1, 3]);
  assert.equal(median([10, 2, 4, 6]), 5);
  assert.equal(median([]), null);
  assert.throws(() => median([null]), TypeError);
  assert.throws(() => median([NaN]), TypeError);
});

test('perfect runs score 100 without low confidence', () => {
  const result = score(three());
  assert.equal(result.score, 100);
  assert.equal(result.passRate, 1);
  assert.equal(result.lowConfidence, false);
  assert.equal(result.medianSteps, 7);
});

test('never-passing runs score zero, including timeouts', () => {
  const result = score([run({ status: 'failed' }), run({ status: 'timeout' }), run({ status: 'failed' })]);
  assert.equal(result.score, 0);
  assert.equal(result.timeoutCount, 1);
});

test('extra steps lower efficiency, failed steps lower cleanliness', () => {
  const inefficient = score(three({ stepsTaken: 14 }));
  assert.equal(inefficient.score, 90);
  const unclean = score(three({ failedSteps: 2 }));
  assert.ok(unclean.score < 100);
  assert.ok(score(three({ stepsTaken: 14, failedSteps: 2 })).score < inefficient.score);
});

test('flakiness lowers score and passing-run medians exclude failed outliers', () => {
  const result = score([run(), run({ durationSec: 30 }), run({ status: 'failed', stepsTaken: 100, durationSec: 600, credits: 100 })]);
  assert.equal(result.medianSteps, 7);
  assert.equal(result.medianDurationSec, 25);
  assert.equal(result.medianCredits, 10);
  assert.ok(Math.abs(result.flakiness - 8 / 9) < 1e-10);
  assert.equal(result.score, 58);
});

test('confidence uses observation count, missing metrics stay null', () => {
  assert.equal(score([run()]).lowConfidence, true);
  assert.equal(score([run(), run()]).lowConfidence, true);
  assert.equal(score(three({ credits: undefined })).medianCredits, null);
  assert.equal(score([run(), run({ credits: undefined }), run()]).medianCredits, null);
  assert.equal(score(three({ stepsTaken: undefined })).score, null);
  assert.equal(score(three({ durationSec: undefined })).medianDurationSec, null);
  assert.equal(score(three({ stepsTaken: 0 })).score, null);
});

test('invalid records and non-started runs cannot become scored failures', () => {
  assert.throws(() => score([]));
  for (const optimalSteps of [0, -1, null, NaN, Infinity]) assert.throws(() => scoreFlow(three(), { optimalSteps }));
  for (const status of ['did_not_start', 'error', 'unknown']) assert.throws(() => score([run({ status })]));
  assert.throws(() => score([run({ stepsTaken: -1 })]));
  assert.throws(() => score([run({ stepsTaken: 1.5 })]));
  assert.throws(() => score([run({ failedSteps: 8 })]));
});

test('scoreSite equally weights named flow scores and propagates unknown scores', () => {
  const good = score(three());
  const bad = score(three({ status: 'failed' }));
  assert.equal(scoreSite({ agent: good, human: bad }).score, 50);
  assert.equal(scoreSite({ agent: good, human: { score: null, lowConfidence: true } }).score, null);
  assert.equal(scoreSite({ agent: good, human: score([run()]) }).lowConfidence, true);
  assert.throws(() => scoreSite({}));
});

test('compare reports signed improvement, preserving unknown values', () => {
  const before = score(three({ stepsTaken: 14, durationSec: 40, credits: undefined }));
  const after = score(three());
  assert.deepEqual(compare(before, after), { scoreDelta: 10, stepsSaved: 7, secondsSaved: 20, creditsSaved: null, lowConfidence: false });
  assert.equal(compare(after, before).scoreDelta, -10);
});

test('gate passes at threshold, retries below it and escalates at limit', () => {
  const args = { threshold: 80, attempt: 1, maxAttempts: 3 };
  assert.equal(gateDecision({ ...args, score: 80 }), 'pass');
  assert.equal(gateDecision({ ...args, score: 79 }), 'retry');
  assert.equal(gateDecision({ ...args, score: 79, attempt: 3 }), 'escalate');
  assert.equal(gateDecision({ ...args, score: null, attempt: 3 }), 'escalate');
  assert.equal(gateDecision({ ...args, score: 80, attempt: 3 }), 'pass');
  assert.throws(() => gateDecision({ ...args, score: 80, attempt: 0 }));
  assert.throws(() => gateDecision({ ...args, score: 80, threshold: 101 }));
});

test('Agent Tax without baseline reports only excess steps', () => {
  assert.deepEqual(agentTax(three({ stepsTaken: 10 }), { optimalSteps: 7 }), { extraSteps: 3, extraSeconds: null, extraCredits: null });
  assert.deepEqual(agentTax(three(), { optimalSteps: 10 }), { extraSteps: 0, extraSeconds: null, extraCredits: null });
  assert.throws(() => agentTax(three()));
});

test('Agent Tax compares successful medians and floors gains at zero', () => {
  const baselineRuns = three({ stepsTaken: 8, durationSec: 30, credits: 11 });
  const runs = [run({ stepsTaken: 10, durationSec: 40, credits: 15 }), run({ stepsTaken: 12, durationSec: 50, credits: 17 }), run({ status: 'failed', stepsTaken: 99 })];
  assert.deepEqual(agentTax(runs, { baselineRuns }), { extraSteps: 3, extraSeconds: 15, extraCredits: 5 });
  assert.deepEqual(agentTax(three(), { baselineRuns }), { extraSteps: 0, extraSeconds: 0, extraCredits: 0 });
});

test('Agent Tax is unknown with no success, no baseline successes or absent credits', () => {
  const unknown = { extraSteps: null, extraSeconds: null, extraCredits: null };
  assert.deepEqual(agentTax(three({ status: 'failed' }), { optimalSteps: 7 }), unknown);
  assert.deepEqual(agentTax(three(), { baselineRuns: [] }), unknown);
  assert.deepEqual(agentTax(three(), { baselineRuns: three({ status: 'failed' }) }), unknown);
  assert.equal(agentTax(three({ credits: undefined }), { baselineRuns: three() }).extraCredits, null);
});

test('agentTax uses humanBaseline when no baseline runs exist, with optimalSteps as the step fallback', () => {
  const human = { medianSteps: 6, medianSeconds: 12, sessions: 4, range: { from: '2026-10-01', to: '2026-10-24' } };
  assert.deepEqual(agentTax(three({ stepsTaken: 10 }), { humanBaseline: human }), { extraSteps: 4, extraSeconds: 8, extraCredits: null });
  assert.deepEqual(agentTax(three({ stepsTaken: 10 }), { humanBaseline: { ...human, medianSteps: null }, optimalSteps: 7 }), { extraSteps: 3, extraSeconds: 8, extraCredits: null });
  // Measured baseline runs still win over the human substitute.
  assert.deepEqual(agentTax(three({ stepsTaken: 10 }), { baselineRuns: three(), humanBaseline: human }), { extraSteps: 3, extraSeconds: 0, extraCredits: 0 });
  assert.throws(() => agentTax(three(), { humanBaseline: { ...human, sessions: 0 } }), RangeError);
  assert.throws(() => agentTax(three(), { humanBaseline: { ...human, medianSeconds: -1 } }), TypeError);
});
