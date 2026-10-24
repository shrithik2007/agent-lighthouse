import { test } from 'node:test';
import assert from 'node:assert/strict';
import { savings } from '../dashboard/savings.js';

const data = { agentTax: { extraCredits: 36.2 }, before: { medianCredits: 55.4 }, after: { medianCredits: 19.2 } };

test('credits saved, ratio and monthly projection come from Agent Tax and medians', () => {
  const result = savings(data, 500, NaN);
  assert.equal(result.saved, 36.2);
  assert.equal(result.ratio.toFixed(1), '2.9');
  assert.equal(result.monthly, 18100);
  assert.equal(result.dollars, null);
});

test('dollars appear only with a positive viewer-entered rate', () => {
  assert.equal(savings(data, 500, 0).dollars, null);
  assert.equal(savings(data, 500, -1).dollars, null);
  assert.equal(savings(data, 500, 0.01).dollars.toFixed(2), '181.00');
});

test('unknown tax or medians stay null, never zero', () => {
  const result = savings({ agentTax: null, before: { medianCredits: null }, after: null }, 500, 0.01);
  assert.deepEqual(result, { saved: null, ratio: null, monthly: null, dollars: null });
});
