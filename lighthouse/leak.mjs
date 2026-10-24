import { JSDOM } from 'jsdom';

/**
 * Fixture-leak check: a patch must not teach to the test. It is "suspect" (owner review required)
 * when its added lines contain a literal from the test objective (the visitor's name, email or the
 * booking date in any common spelling), when it introduces the booking reference into a page that
 * never had it, or when it removes a control the human path depends on.
 *
 * The reference itself is the site's own output and is already on the page before any patch;
 * moving it into a persistent confirmation is the repair Kane asks for, so only a reference the
 * base page never contained counts as a leak.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function objectiveLiterals(flow) {
  const t = flow.testData ?? {};
  const literals = [t.name, t.email].filter(Boolean);
  if (t.date) {
    const [y, m, d] = t.date.split('-').map(Number);
    const month = MONTHS[m - 1];
    literals.push(t.date, `${d} ${month} ${y}`, `${month} ${d}, ${y}`, `${month} ${d} ${y}`, `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`);
  }
  return literals;
}

/** Added lines from a unified diff (without the leading '+'), ignoring file headers. */
export function addedLines(diff) {
  return diff.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).map(line => line.slice(1));
}

function controlsPresent(html, required) {
  const { document } = new JSDOM(html).window;
  const text = el => `${el.textContent ?? ''} ${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('placeholder') ?? ''} ${el.getAttribute('name') ?? ''} ${el.id ?? ''} ${[...(el.labels ?? [])].map(l => l.textContent).join(' ')}`;
  const candidates = [...document.querySelectorAll('input, select, textarea, button, [role], [data-time], [data-date], [data-class], div[id], label')];
  return Object.fromEntries(required.map(control => {
    const pattern = new RegExp(control.match, 'i');
    return [control.name, candidates.some(el => pattern.test(text(el)) && !/^(p|span)$/i.test(el.tagName))];
  }));
}

export function leakCheck({ flow, diff, baseHtml, patchedHtml }) {
  const findings = [];
  const added = addedLines(diff);
  for (const literal of objectiveLiterals(flow)) {
    const hit = added.find(line => line.includes(literal));
    if (hit) findings.push({ kind: 'objective-literal', literal, line: hit.trim().slice(0, 160) });
  }
  const reference = flow.expectedReference;
  if (reference && !baseHtml.includes(reference) && patchedHtml.includes(reference)) {
    findings.push({ kind: 'reference-introduced', literal: reference });
  }
  const required = flow.humanPathControls ?? [];
  if (required.length) {
    const before = controlsPresent(baseHtml, required);
    const after = controlsPresent(patchedHtml, required);
    for (const control of required) {
      if (before[control.name] && !after[control.name]) findings.push({ kind: 'control-removed', control: control.name });
    }
  }
  return { suspect: findings.length > 0, findings };
}

export function describeFindings(findings) {
  return findings.map(f => f.kind === 'objective-literal' ? `hard-codes "${f.literal}" from the test objective`
    : f.kind === 'reference-introduced' ? `introduces the reference ${f.literal}, which the page never had`
    : `removes the "${f.control}" control the human path depends on`).join('; ');
}
