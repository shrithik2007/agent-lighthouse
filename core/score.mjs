/** Pure scoring only. Inputs are observations, never invented defaults. */
const clamp = value => Math.min(1, Math.max(0, value));
const finite = value => typeof value === 'number' && Number.isFinite(value);
const statuses = new Set(['passed', 'failed', 'timeout']);

export function median(values) {
  if (!Array.isArray(values)) throw new TypeError('median expects an array');
  if (values.length === 0) return null;
  if (!values.every(finite)) throw new TypeError('median expects finite numbers');
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function validateRuns(runs, { allowEmpty = false } = {}) {
  if (!Array.isArray(runs) || (!allowEmpty && !runs.length)) throw new TypeError('runs must be a non-empty array');
  for (const run of runs) {
    if (!run || !statuses.has(run.status)) throw new TypeError('status must be passed, failed, or timeout; exclude runs that did not start');
    for (const field of ['stepsTaken', 'failedSteps', 'durationSec', 'credits']) {
      if (run[field] != null && (!finite(run[field]) || run[field] < 0)) throw new TypeError(`${field} must be non-negative or null`);
    }
    for (const field of ['stepsTaken', 'failedSteps']) {
      if (run[field] != null && !Number.isInteger(run[field])) throw new TypeError(`${field} must be an integer`);
    }
    if (run.stepsTaken != null && run.failedSteps != null && run.failedSteps > run.stepsTaken) throw new RangeError('failedSteps exceeds stepsTaken');
  }
}

function validateOptimal(optimalSteps) {
  if (!finite(optimalSteps) || optimalSteps <= 0) throw new RangeError('optimalSteps must be positive');
}

// If any observation lacks a metric, do not present a subset median as complete.
function metricMedian(runs, key) {
  return !runs.length || runs.some(run => run[key] == null) ? null : median(runs.map(run => run[key]));
}

export function scoreFlow(runs, { optimalSteps } = {}) {
  validateRuns(runs);
  validateOptimal(optimalSteps);
  const passed = runs.filter(run => run.status === 'passed');
  const selected = passed.length ? passed : runs;
  const passRate = passed.length / runs.length;
  const medianSteps = metricMedian(selected, 'stepsTaken');
  const medianFailedSteps = metricMedian(selected, 'failedSteps');
  const efficiency = medianSteps > 0 ? clamp(optimalSteps / medianSteps) : null;
  const cleanliness = medianSteps > 0 && medianFailedSteps != null ? 1 - clamp(medianFailedSteps / medianSteps) : null;
  const flakiness = 4 * passRate * (1 - passRate);
  const score = passRate === 0 ? 0 : efficiency == null || cleanliness == null ? null
    : Math.round(100 * passRate * (0.50 + 0.20 * efficiency + 0.15 * cleanliness + 0.15 * (1 - flakiness)));
  return {
    score, runCount: runs.length, passedCount: passed.length, passRate,
    medianSteps, medianFailedSteps,
    medianDurationSec: metricMedian(selected, 'durationSec'),
    medianCredits: metricMedian(selected, 'credits'),
    efficiency, cleanliness, flakiness, lowConfidence: runs.length < 3,
    timeoutCount: runs.filter(run => run.status === 'timeout').length,
  };
}

/** Equal weight per named flow. A missing flow score keeps the site score unknown. */
export function scoreSite(flows) {
  if (!flows || Array.isArray(flows) || !Object.keys(flows).length) throw new TypeError('provide named flow summaries');
  const values = Object.values(flows);
  for (const flow of values) {
    if (!flow || (flow.score != null && (!finite(flow.score) || flow.score < 0 || flow.score > 100))) throw new TypeError('invalid flow summary');
  }
  return {
    score: values.some(flow => flow.score == null) ? null : Math.round(values.reduce((sum, flow) => sum + flow.score, 0) / values.length),
    lowConfidence: values.some(flow => flow.lowConfidence !== false),
    flows,
  };
}

const difference = (a, b) => finite(a) && finite(b) ? a - b : null;
export function compare(before, after) {
  if (!before || !after) throw new TypeError('provide before and after flow summaries');
  return {
    scoreDelta: difference(after.score, before.score),
    stepsSaved: difference(before.medianSteps, after.medianSteps),
    secondsSaved: difference(before.medianDurationSec, after.medianDurationSec),
    creditsSaved: difference(before.medianCredits, after.medianCredits),
    lowConfidence: before.lowConfidence !== false || after.lowConfidence !== false,
  };
}

export function gateDecision({ score, threshold, attempt, maxAttempts }) {
  if (!finite(threshold) || threshold < 0 || threshold > 100) throw new RangeError('threshold must be between 0 and 100');
  if (score != null && (!finite(score) || score < 0 || score > 100)) throw new RangeError('score must be between 0 and 100 or null');
  if (!Number.isInteger(attempt) || attempt < 1 || !Number.isInteger(maxAttempts) || maxAttempts < 1 || attempt > maxAttempts) throw new RangeError('attempts are one-based and bounded by maxAttempts');
  if (score != null && score >= threshold) return 'pass';
  return attempt >= maxAttempts ? 'escalate' : 'retry';
}

/** Tax is per successful booking. No successful observations means no computable tax. */
export function agentTax(runs, { optimalSteps, baselineRuns } = {}) {
  validateRuns(runs);
  if (optimalSteps == null && baselineRuns == null) throw new TypeError('provide optimalSteps or baselineRuns');
  if (optimalSteps != null) validateOptimal(optimalSteps);
  if (baselineRuns != null) validateRuns(baselineRuns, { allowEmpty: true });
  const passing = runs.filter(run => run.status === 'passed');
  const baseline = baselineRuns?.filter(run => run.status === 'passed');
  const extra = (key, fallback = null) => {
    const value = metricMedian(passing, key);
    const reference = baseline ? metricMedian(baseline, key) : fallback;
    return value == null || reference == null ? null : Math.max(0, value - reference);
  };
  return { extraSteps: extra('stepsTaken', optimalSteps), extraSeconds: extra('durationSec'), extraCredits: extra('credits') };
}
