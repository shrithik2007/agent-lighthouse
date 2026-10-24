/**
 * Turn one captured `kane-cli run --agent` stream into a scoring observation.
 * Verified against kane-cli 0.10.0-rc.3 (tests/fixtures/kane-run-after-passed.ndjson).
 * Unknowns stay null; a run that never started returns started: false and must not be scored.
 */

const OVERHEAD = /^(wait:|\s*$)/i;

export function parseEvents(text) {
  const events = [];
  const rejected = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { rejected.push(line.slice(0, 120)); }
  }
  return { events, rejected };
}

/**
 * Steps are keyed by child-agent context and step index. A `running` frame for a key that
 * already completed starts a new execution, so a repeated index is never collapsed into
 * earlier work. The final status of each execution decides whether it failed.
 */
export function countSteps(events) {
  const executions = new Map();
  const order = [];
  let context = 'root';
  const contexts = [];
  for (const event of events) {
    if (event.type === 'child_agent_start') {
      contexts.push(context);
      context = `child:${event.child_id ?? event.id ?? event.index ?? contexts.length}:${order.length}`;
      continue;
    }
    if (event.type === 'child_agent_end') { context = contexts.pop() ?? 'root'; continue; }
    if (event.type || event.step == null) continue;
    const base = `${context}#${event.step}`;
    let current = executions.get(base);
    if (!current || (event.status === 'running' && current.completed)) {
      current = { key: `${base}@${order.length}`, step: event.step, context, status: null, remark: '', completed: false };
      executions.set(base, current);
      order.push(current);
    }
    current.status = event.status;
    // `running` frames carry a "Step N" placeholder; only the completion remark describes the work.
    if (event.status === 'done' || event.status === 'failed') { current.completed = true; current.remark = event.remark ?? ''; }
  }
  const completed = order.filter(step => step.completed);
  const failed = completed.filter(step => step.status === 'failed');
  const overhead = completed.filter(step => OVERHEAD.test(step.remark));
  return {
    stepsTaken: completed.length,
    failedSteps: failed.length,
    overheadSteps: overhead.length,
    actionSteps: completed.length - overhead.length,
    steps: completed.map(({ step, context, status, remark }) => ({ step, context, status, remark, overhead: OVERHEAD.test(remark) })),
  };
}

// Kane picks its own key for "store the reference as 'ref'" (ref, reference_code, booking_reference).
export function findReference(state) {
  if (!state || typeof state !== 'object') return null;
  if (typeof state.ref === 'string') return state.ref;
  const match = Object.entries(state).find(([key, value]) => /ref/i.test(key) && typeof value === 'string' && /^[A-Z]{2,}-\d+$/.test(value));
  return match?.[1] ?? null;
}

const num = value => typeof value === 'number' && Number.isFinite(value) ? value : null;

export function parseRun(text, { exitCode, stderr = '' } = {}) {
  const { events, rejected } = parseEvents(text);
  const runEnd = events.findLast(event => event.type === 'run_end') ?? null;
  const started = events.some(event => event.type == null && event.step != null) || runEnd != null;
  const counts = countSteps(events);
  const coverage = events.find(event => event.type === 'coverage');
  const packFromStderr = /evidence serve (\S+\.evidence)/.exec(String(stderr))?.[1] ?? null;

  let status;
  if (!started || exitCode === 2) status = 'not_started';
  else if (exitCode === 3) status = 'timeout';
  else if (exitCode === 0 && runEnd?.status === 'passed') status = 'passed';
  else if (exitCode === 1 || runEnd?.status === 'failed') status = 'failed';
  else status = 'unknown';

  const firstFailed = counts.steps.find(step => step.status === 'failed') ?? null;
  return {
    status,
    started: status !== 'not_started',
    exitCode: exitCode ?? null,
    kaneStatus: runEnd?.status ?? null,
    stepsTaken: started ? counts.stepsTaken : null,
    failedSteps: started ? counts.failedSteps : null,
    actionSteps: started ? counts.actionSteps : null,
    overheadSteps: started ? counts.overheadSteps : null,
    // run_end.duration is seconds: checked against event timestamps in tests/parse.test.mjs.
    durationSec: num(runEnd?.duration),
    credits: num(runEnd?.credits_consumed),
    reference: findReference(runEnd?.final_state),
    summary: runEnd?.summary ?? null,
    oneLiner: runEnd?.one_liner ?? null,
    reasonCode: runEnd?.reason_code ?? null,
    testUrl: runEnd?.test_url ?? null,
    sessionDir: runEnd?.session_dir ?? null,
    evidencePack: coverage?.pack ?? packFromStderr,
    firstFailedStep: firstFailed,
    failedRemarks: counts.steps.filter(step => step.status === 'failed').map(step => step.remark),
    steps: counts.steps,
    rejectedLines: rejected.length,
  };
}
