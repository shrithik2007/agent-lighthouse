/**
 * Human baseline from PostHog: median steps and seconds real visitors spend on the booking page.
 * Credentials come from the environment only (POSTHOG_HOST, POSTHOG_PROJECT_ID, POSTHOG_API_KEY) and are never written anywhere.
 * A "step" is one autocaptured click, change (PostHog's event type for input fields) or submit event.
 * A session counts toward the booking flow only if it fired at least one submit on the page.
 * Seconds run from a session's first to its last step event on the page.
 * No key, no data or an unexpected response returns null with the reason logged; nothing is invented.
 */
import { median } from '../core/score.mjs';

export const STEP_EVENT_TYPES = ['click', 'change', 'submit'];
const ENV_NAMES = ['POSTHOG_HOST', 'POSTHOG_PROJECT_ID', 'POSTHOG_API_KEY'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Placeholders are bound by PostHog (HogQL `values`), so the page URL and dates are never spliced into the query text.
export const SESSIONS_QUERY = `
SELECT properties.$session_id AS session,
  countIf(properties.$event_type IN ('click', 'change', 'submit')) AS steps,
  countIf(properties.$event_type = 'submit') AS submits,
  dateDiff('second', min(timestamp), max(timestamp)) AS seconds
FROM events
WHERE event = '$autocapture'
  AND timestamp >= toDateTime({from}) AND timestamp < toDateTime({to})
  AND startsWith(properties.$current_url, {pageUrl})
  AND notEmpty(coalesce(properties.$session_id, ''))
GROUP BY session
HAVING submits > 0
LIMIT 10000`.trim();

export function defaultRange(now = new Date(), days = 30) {
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** Pure: PostHog query response -> baseline, or { reason } when it cannot be computed honestly. */
export function summarizeSessions(response, { range, pageUrl }) {
  const columns = response?.columns;
  const rows = response?.results;
  if (!Array.isArray(columns) || !Array.isArray(rows)) return { reason: 'PostHog response has no columns/results arrays' };
  const index = Object.fromEntries(['session', 'steps', 'seconds'].map(name => [name, columns.indexOf(name)]));
  if (Object.values(index).some(i => i < 0)) return { reason: `PostHog response is missing columns (got ${columns.join(', ')})` };
  const sessions = rows.map(row => ({ steps: Number(row[index.steps]), seconds: Number(row[index.seconds]) }))
    .filter(row => Number.isFinite(row.steps) && Number.isFinite(row.seconds) && row.steps > 0 && row.seconds >= 0);
  if (!sessions.length) return { reason: `no PostHog sessions with a submit on ${pageUrl} between ${range.from} and ${range.to}` };
  return {
    medianSteps: median(sessions.map(row => row.steps)),
    medianSeconds: median(sessions.map(row => row.seconds)),
    sessions: sessions.length,
    range,
  };
}

/** Returns { medianSteps, medianSeconds, sessions, range } or null (reason passed to log). */
export async function humanBaseline({ pageUrl, from, to, env = process.env, fetchImpl = globalThis.fetch, log = console.error } = {}) {
  const fail = reason => { log(`human baseline: unavailable, ${reason}`); return null; };
  const missing = ENV_NAMES.filter(name => !env[name]);
  if (missing.length) return fail(`${missing.join(', ')} not set in the environment`);
  if (!pageUrl) return fail('no page URL given');
  const range = from || to ? { from, to } : defaultRange();
  if (!DATE.test(range.from ?? '') || !DATE.test(range.to ?? '') || range.from >= range.to) return fail(`range must be YYYY-MM-DD with from < to (got ${range.from} .. ${range.to})`);
  if (!/^\d+$/.test(env.POSTHOG_PROJECT_ID)) return fail('POSTHOG_PROJECT_ID must be numeric');
  const key = env.POSTHOG_API_KEY;
  const redact = text => String(text).replaceAll(key, '[redacted]');
  const endpoint = `${env.POSTHOG_HOST.replace(/\/+$/, '')}/api/projects/${env.POSTHOG_PROJECT_ID}/query/`;
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: SESSIONS_QUERY, values: { from: range.from, to: range.to, pageUrl } } }),
    });
  } catch (error) {
    return fail(`PostHog request failed: ${redact(error.message)}`);
  }
  if (!response.ok) return fail(`PostHog returned HTTP ${response.status}: ${redact((await response.text().catch(() => '')).slice(0, 200))}`);
  let body;
  try { body = await response.json(); } catch { return fail('PostHog response was not JSON'); }
  const result = summarizeSessions(body, { range, pageUrl });
  return result.reason ? fail(result.reason) : result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
  const result = await humanBaseline({ pageUrl: opt('url'), from: opt('from'), to: opt('to') });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result ? 0 : 1);
}
