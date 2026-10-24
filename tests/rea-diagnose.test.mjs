import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractCodeEvidence, reaDiagnose, controlText, ReaShapeError } from '../lighthouse/rea-diagnose.mjs';

// Saved output of `npx -y rea-agents@latest inspect-web-page … --include-script-sources --json` (rea-agents 6.7.0)
// against fixtures/before served on 127.0.0.1:4190, captured 2026-10-24 before the PostHog snippet was added.
const rea = JSON.parse(await readFile(new URL('./fixtures/rea/inspect-web-page-before.json', import.meta.url), 'utf8'));
const html = await readFile(new URL('../fixtures/before/index.html', import.meta.url), 'utf8');
const quiet = () => {};

test('finds the toast timer and the handlers on both ambiguous "Go" controls', () => {
  const evidence = extractCodeEvidence(rea, { html, failingRemark: 'click: Clicking the Go booking button in the top hero section' });
  const [timer, ...handlers] = evidence;
  assert.equal(timer.kind, 'timer-hides-element');
  assert.equal(timer.delayMs, 2500);
  assert.deepEqual(timer.targets, ['toast']);
  assert.equal(timer.sha256, rea.normalized_result.scripts.items[0].source.artifact.sha256);
  assert.deepEqual(handlers.map(h => h.control).slice(0, 2), ['#hero-go', '#nav-go']);
  assert.ok(handlers.every(h => h.kind === 'handler-on-matching-control' && h.event && h.line > 0));
  assert.match(handlers[1].snippet, /\$\('prices'\)\.hidden = false/);
});

test('a quoted control label in the remark matches its handler', () => {
  const evidence = extractCodeEvidence(rea, { html, failingRemark: "Tried to click the 'x' close icon on the cookie banner" });
  assert.equal(evidence[1].control, '#cookie-close');
  assert.match(evidence[1].why, /quoted "x"/);
});

test('control text comes from the page HTML, including nested elements', () => {
  const text = controlText(html);
  assert.equal(text['cookie-close'], 'x');
  assert.equal(text['hero-go'], 'Go');
});

test('an unexpected REA shape degrades to an empty list with the reason', async () => {
  assert.throws(() => extractCodeEvidence({ normalized_result: {} }), ReaShapeError);
  const lines = [];
  const result = await reaDiagnose({ url: 'http://127.0.0.1:1/', html, failingRemark: 'x', run: async () => ({ normalized_result: { scripts: { items: [{ url: 'u' }] } } }), log: line => lines.push(line) });
  assert.deepEqual(result.codeEvidence, []);
  assert.match(result.reason, /differs from docs\/browser-observation\.md/);
  assert.match(lines[0], /continuing without code evidence/);
});

test('REA missing or failing degrades to an empty list; the loop is never blocked', async () => {
  const missing = Object.assign(new Error('spawn npx ENOENT'), { code: 'ENOENT', path: 'npx' });
  const a = await reaDiagnose({ url: 'http://127.0.0.1:1/', run: async () => { throw missing; }, log: quiet });
  assert.deepEqual(a, { codeEvidence: [], evidenceId: null, reason: 'REA not available (npx not found)' });
  const b = await reaDiagnose({ url: 'http://127.0.0.1:1/', run: async () => { throw Object.assign(new Error('Command failed'), { stderr: 'npm ERR!\nendpoint_unreachable' }); }, log: quiet });
  assert.equal(b.reason, 'REA run failed: endpoint_unreachable');
  const c = await reaDiagnose({ url: 'http://127.0.0.1:1/', html, failingRemark: 'Go', run: async () => rea, log: quiet });
  assert.equal(c.evidenceId, rea.evidence_id);
  assert.ok(c.codeEvidence.length >= 2);
});
