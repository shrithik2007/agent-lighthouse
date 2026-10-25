// Optional line under Agent Tax: observed PostHog medians for this page. Null hides the line.
const num = value => value == null ? 'n/a' : String(Math.round(value));
export function humanLine(baseline) {
  if (!baseline || !baseline.sessions) return null;
  return `vs real humans on this page: ${num(baseline.medianSteps)} steps, ${num(baseline.medianSeconds)} s (${baseline.sessions} session${baseline.sessions === 1 ? '' : 's'})`;
}
