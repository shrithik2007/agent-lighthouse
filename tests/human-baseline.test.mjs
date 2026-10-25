import { test } from 'node:test';
import assert from 'node:assert/strict';
import { humanBaseline, summarizeSessions, defaultRange } from '../lighthouse/human-baseline.mjs';

// Stub PostHog HogQL responses, not real visitor data.
const env = { POSTHOG_HOST: 'https://posthog.example/', POSTHOG_PROJECT_ID: '42', POSTHOG_API_KEY: 'phx_secret_stub' };
const range = { from: '2026-10-01', to: '2026-10-24' };
const pageUrl = 'https://demo.example/before/';
const columns = ['session', 'steps', 'submits', 'seconds'];
const stub = (body, status = 200) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) };
  };
  return { fetchImpl, calls };
};
const logs = () => { const lines = []; return { lines, log: line => lines.push(line) }; };

test('medians over sessions that submitted, with the query bound through values', async () => {
  const { fetchImpl, calls } = stub({ columns, results: [['s1', 9, 1, 40], ['s2', 12, 1, 65], ['s3', 10, 2, 50]] });
  const result = await humanBaseline({ pageUrl, ...range, env, fetchImpl, log: () => {} });
  assert.deepEqual(result, { medianSteps: 10, medianSeconds: 50, sessions: 3, range });
  assert.equal(calls[0].url, 'https://posthog.example/api/projects/42/query/');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer phx_secret_stub');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.query.kind, 'HogQLQuery');
  assert.deepEqual(body.query.values, { ...range, pageUrl });
  assert.ok(!body.query.query.includes(pageUrl), 'page URL is a bound value, not query text');
  assert.match(body.query.query, /'click', 'change', 'submit'/);
});

test('missing credentials return null and name the variables, never their values', async () => {
  const { lines, log } = logs();
  const { fetchImpl, calls } = stub({});
  assert.equal(await humanBaseline({ pageUrl, ...range, env: { POSTHOG_HOST: 'x' }, fetchImpl, log }), null);
  assert.equal(calls.length, 0);
  assert.match(lines[0], /POSTHOG_PROJECT_ID, POSTHOG_API_KEY not set/);
});

test('no sessions, HTTP errors and odd shapes return null with a reason; the key is redacted', async () => {
  for (const [body, status, pattern] of [
    [{ columns, results: [] }, 200, /no PostHog sessions with a submit/],
    [{ detail: 'bad key phx_secret_stub' }, 401, /HTTP 401/],
    [{ results: [] }, 200, /no columns\/results/],
    [{ columns: ['session'], results: [['s1']] }, 200, /missing columns/],
  ]) {
    const { lines, log } = logs();
    assert.equal(await humanBaseline({ pageUrl, ...range, env, fetchImpl: stub(body, status).fetchImpl, log }), null);
    assert.match(lines[0], pattern);
    assert.ok(!lines[0].includes('phx_secret_stub'));
  }
  const { lines, log } = logs();
  assert.equal(await humanBaseline({ pageUrl, from: '2026-10-24', to: '2026-10-01', env, fetchImpl: stub({}).fetchImpl, log }), null);
  assert.match(lines[0], /from < to/);
});

test('summarizeSessions drops rows without steps and keeps the even-count median', () => {
  const result = summarizeSessions({ columns, results: [['a', 8, 1, 30], ['b', 0, 1, 5], ['c', 12, 1, 60], ['d', null, 1, 9]] }, { range, pageUrl });
  assert.deepEqual(result, { medianSteps: 10, medianSeconds: 45, sessions: 2, range });
  assert.deepEqual(defaultRange(new Date('2026-10-24T15:00:00Z')), { from: '2026-09-25', to: '2026-10-25' });
});
