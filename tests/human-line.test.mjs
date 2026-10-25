import { test } from 'node:test';
import assert from 'node:assert/strict';
import { humanLine } from '../dashboard/human.js';

test('human baseline line renders only when a baseline exists', () => {
  assert.equal(humanLine({ medianSteps: 9.5, medianSeconds: 41, sessions: 12 }), 'vs real humans on this page: 10 steps, 41 s (12 sessions)');
  assert.equal(humanLine({ medianSteps: 8, medianSeconds: 30, sessions: 1 }), 'vs real humans on this page: 8 steps, 30 s (1 session)');
  assert.equal(humanLine(null), null);
  assert.equal(humanLine(undefined), null);
});
