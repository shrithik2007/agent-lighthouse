import { savings } from '/dashboard/savings.js';
// Renders results/latest.json (or results/demo-backup.json with ?recorded=1). Unknown values render as n/a.
const params = new URLSearchParams(location.search);
if (['light', 'dark'].includes(params.get('theme'))) document.documentElement.dataset.theme = params.get('theme');
const recorded = params.has('recorded');
const caseId = params.get('case') ?? 'demo';
let source = recorded ? '/results/demo-backup.json' : '/results/latest.json';

// Case switcher from results/cases.json; falls back to case 1 alone if the manifest is missing.
async function loadCases() {
  try {
    const response = await fetch('/results/cases.json', { cache: 'no-store' });
    if (!response.ok) return;
    const cases = await response.json();
    const current = cases.find(c => c.id === caseId) ?? cases[0];
    source = `/${recorded && current.recorded ? current.recorded : current.latest}`;
    document.getElementById('cases').replaceChildren(...cases.map(c => el('a', {
      href: `?case=${encodeURIComponent(c.id)}${params.get('theme') ? `&theme=${params.get('theme')}` : ''}`,
      'aria-current': c.id === current.id ? 'page' : null,
    }, c.title)));
  } catch { /* single-case view */ }
}

function renderSavings(view, data) {
  // The note is set on the template; values update in the live page after insertion.
  const slot = name => view.querySelector(`[data-slot="${name}"]`) ?? document.querySelector(`[data-slot="${name}"]`);
  const after = data.postFix ?? data.referenceFix ?? null;
  const update = () => {
    const bookings = Number(document.getElementById('bookings').value);
    const rateText = document.getElementById('rate').value.trim();
    const result = savings({ agentTax: data.agentTax, before: data.before, after }, bookings, rateText === '' ? NaN : Number(rateText));
    slot('saved').textContent = result.saved == null ? 'n/a' : `${result.saved.toFixed(1)} credits`;
    slot('ratio').textContent = result.ratio == null ? 'n/a' : `${result.ratio.toFixed(1)}×`;
    slot('monthly').textContent = result.monthly == null ? 'n/a' : `${Math.round(result.monthly).toLocaleString()} credits saved`;
    slot('dollars').textContent = result.dollars == null ? 'Enter your plan’s rate to see dollars.' : `≈ $${result.dollars.toLocaleString(undefined, { maximumFractionDigits: 2 })} a month at your rate`;
  };
  slot('savings-note').textContent = `Per successful booking, from Agent Tax (${data.agentTaxBasis ?? 'n/a'}). Ratio compares median credits before (${num(data.before?.medianCredits, 1)}) with ${after ? `${after.label?.toLowerCase() ?? 'after'} (${num(after.medianCredits, 1)})` : 'n/a'}. No price is assumed.`;
  return update;
}

const na = value => value == null || Number.isNaN(value) ? 'n/a' : value;
const num = (value, digits = 0) => value == null ? 'n/a' : Number(value).toFixed(digits);
const signed = (value, digits = 0) => value == null ? 'n/a' : `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)}`;
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (key === 'class') node.className = value; else if (key in node && key !== 'list') node[key] = value; else node.setAttribute(key, value);
  }
  node.append(...children.flat().filter(child => child != null && child !== false));
  return node;
};

const chip = document.getElementById('status-chip');
const report = document.getElementById('report');
const setChip = (state, text) => { chip.dataset.state = state; chip.textContent = text; };
const showState = (text, error = false) => {
  report.replaceChildren(el('section', { class: `state${error ? ' error' : ''}` }, el('p', {}, text)));
};

export function taxLine(tax) {
  if (!tax) return 'Agent Tax: n/a';
  return `+${num(tax.extraSteps)} steps · +${num(tax.extraSeconds)} s · +${num(tax.extraCredits)} credits per booking`;
}

function runTip(run) {
  const steps = run.stepsTaken == null ? 'n/a steps' : `${run.stepsTaken} steps: ${na(run.actionSteps)} actions, ${na(run.overheadSteps)} overhead`;
  return `${run.kaneRunId ?? run.label}${run.humanPath ? ' · human path' : ''} · ${run.status}\n${steps}\n${num(run.durationSec, 1)} s · ${num(run.credits, 1)} credits${run.failedRemarks?.length ? `\nFailed: ${run.failedRemarks[0]}` : ''}`;
}

function dotsRow(groups) {
  return groups.flatMap(([name, runs]) => [
    el('span', { class: 'group' }, name),
    runs?.length
      ? el('ol', {}, runs.map(run => el('li', {},
        el('button', { class: `dot${run.humanPath ? ' human' : ''}`, type: 'button', 'data-status': run.status, 'aria-label': runTip(run).replaceAll('\n', '; ') },
          run.humanPath ? 'H' : String(run.stepsTaken ?? '?'), el('span', { class: 'tip', role: 'tooltip' }, ...runTip(run).split('\n').flatMap((line, i) => i ? [el('br'), line] : [line]))))))
      : el('span', { class: 'note' }, 'No runs recorded'),
  ]);
}

function render(data) {
  const view = document.getElementById('report-template').content.cloneNode(true);
  const slot = name => view.querySelector(`[data-slot="${name}"]`);
  document.getElementById('site-title').textContent = data.case?.title ?? `${data.site?.name ?? 'Site'} · ${data.flow ?? 'flow'} flow`;

  // Row 1
  const row1 = view.querySelector('.row-1');
  const taxFirst = data.headline === 'tax';
  row1.classList.toggle('tax-first', taxFirst);
  const tax = data.agentTax;
  slot('tax-line').replaceChildren('Agent Tax ', el('strong', {}, taxLine(tax)));
  if (taxFirst) row1.prepend(slot('tax-line'));
  else row1.append(slot('tax-line'));
  slot('before-score').textContent = na(data.before?.score);
  slot('before-sub').textContent = `${na(data.before?.passedCount)}/${na(data.before?.runCount)} runs passed · median ${num(data.before?.medianSteps)} steps`;
  // The loop's post-fix score leads; the hand-built reference fix is context, never substituted for it.
  const after = data.postFix ?? null;
  slot('after-label').textContent = after ? 'After loop repair' : 'After loop repair (not run yet)';
  slot('after-score').textContent = na(after?.score);
  slot('after-sub').textContent = after ? `${na(after.passedCount)}/${na(after.runCount)} runs passed · median ${num(after.medianSteps)} steps` : 'n/a';
  const delta = data.before?.score != null && after?.score != null ? after.score - data.before.score : null;
  slot('delta').textContent = signed(delta);
  const low = [data.before, after].some(side => side && side.runCount < 3);
  const ref = data.referenceFix;
  slot('score-note').textContent = [
    data.headline === 'tax' ? 'Headline is Agent Tax: the extra work an agent spends per successful booking on BEFORE compared with the repaired page.' : null,
    'Steps count every completed Kane step (actions plus planning and wait overhead); overhead appears on both sides, so it largely nets out of Agent Tax.',
    ref ? `Reference fix (hand-built AFTER fixture): ${na(ref.score)}, ${na(ref.passedCount)}/${na(ref.runCount)} passed, median ${num(ref.medianSteps)} steps.` : null,
    low ? 'Low confidence: fewer than three runs on one side.' : null,
  ].filter(Boolean).join(' ');

  const updateSavings = renderSavings(view, data);

  // Row 2
  slot('dots').replaceChildren(...dotsRow(data.runGroups ?? []));

  // Row 3
  const fail = data.failingStep;
  slot('fail-card').replaceChildren(...(fail ? [
    el('div', {},
      el('p', { class: 'meta' }, `${fail.kaneRunId ?? fail.runLabel} · step ${na(fail.step)} · ${fail.site ?? ''}`),
      el('pre', {}, fail.remark ?? 'n/a'),
      fail.summary ? el('p', {}, fail.summary) : null,
      fail.reasonCode ? el('p', { class: 'meta' }, `Kane reason: ${fail.reasonCode}`) : null,
      fail.viewerCommand ? el('p', { class: 'meta' }, 'Open in Kane evidence viewer: ', el('code', {}, fail.viewerCommand)) : null,
      fail.testUrl ? el('p', {}, el('a', { href: fail.testUrl, target: '_blank', rel: 'noopener' }, 'Open the run in Test Manager')) : null),
    fail.screenshot ? el('img', { src: `/${fail.screenshot}`, alt: `Kane screenshot at the failing step: ${fail.remark}` }) : el('p', { class: 'note' }, 'Screenshot: n/a'),
  ] : [el('p', {}, 'No failing step recorded.')]));

  // Row 4
  const attempts = data.attempts ?? [];
  slot('timeline').replaceChildren(...(attempts.length ? attempts.map(a => el('tr', { class: a.highlight ? 'highlight' : null },
    el('td', {}, String(a.attempt)),
    el('td', {}, a.commit ? el('code', {}, a.commit.slice(0, 7)) : 'n/a'),
    el('td', {}, a.filesChanged?.join(', ') || 'n/a'),
    el('td', {}, a.cause ?? a.error ?? 'n/a'),
    el('td', {}, num(a.score)),
    el('td', {}, el('span', { class: `pill ${a.humanPath === 'passed' ? 'ok' : 'bad'}` }, na(a.humanPath))),
    el('td', {}, el('span', { class: `pill ${a.gate === 'pass' ? 'ok' : 'bad'}` }, na(a.gate)), a.gateReason ? el('div', { class: 'note' }, a.gateReason) : null),
  )) : [el('tr', {}, el('td', { colspan: 7 }, 'No repair attempts yet.'))]));
  const reverted = attempts.flatMap(a => a.scopeGuardReverted ?? []);
  slot('scope-note').textContent = `Scope guard: the fixer may change only site/. ${reverted.length ? `Reverted outside scope: ${reverted.join(', ')}.` : 'Nothing outside site/ had to be reverted.'} Qualifies only when score ≥ ${na(data.threshold)} and the human path passes.`;

  // Row 5
  const proposal = data.proposal;
  slot('review').replaceChildren(...(proposal ? [
    el('p', { class: 'meta' }, data.proposeRun
      ? `Propose-mode run ${data.proposeRun.loopId}: ${na(data.proposeRun.outcome)} on attempt ${na(data.proposeRun.attempts)}, score ${na(data.proposeRun.score)}, human path ${na(data.proposeRun.humanPath)}. Branch ${na(data.proposeRun.branch)} is left unmerged for the owner.`
      : `Mode: ${na(data.mode)} · outcome: ${na(data.outcome)}`),
    el('pre', {}, proposal.excerpt ?? ''),
    el('a', { href: `/${proposal.path}` }, 'Read the full proposal'),
  ] : [el('p', {}, 'No proposal yet.')]));

  report.replaceChildren(view);
  for (const id of ['bookings', 'rate']) document.getElementById(id).addEventListener('input', updateSavings);
  updateSavings();
  const outcome = data.outcome ?? 'baseline';
  if (recorded || data.recorded) setChip('recorded', 'Recorded run');
  else setChip(outcome, outcome === 'qualified' ? 'Qualified for owner review' : outcome === 'escalated' ? 'Escalated' : outcome === 'baseline' ? 'Baseline measured' : outcome);

  const links = data.links ?? {};
  document.getElementById('footer').replaceChildren(
    el('span', {}, 'Repo: ', links.repo ? el('a', { href: links.repo }, links.repo) : 'n/a'),
    el('span', {}, 'Kane run report: ', links.runReport ? el('a', { href: links.runReport }, 'Proof tab') : 'n/a'),
    el('span', {}, 'Video: ', links.video ? el('a', { href: links.video }, 'watch') : 'n/a'),
    el('span', {}, `Generated ${data.generatedAt ? new Date(data.generatedAt).toLocaleString() : 'n/a'}`),
  );
}

await loadCases();
try {
  const response = await fetch(source, { cache: 'no-store' });
  if (response.status === 404) { setChip('loading', 'No results'); showState(`No results yet: ${source} was not found. Run the baseline and loop first.`); }
  else if (!response.ok) throw new Error(`HTTP ${response.status}`);
  else render(await response.json());
} catch (error) {
  setChip('error', 'Error');
  showState(`Could not load ${source}: ${error.message}`, true);
}
