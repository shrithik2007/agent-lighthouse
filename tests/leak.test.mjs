import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leakCheck, objectiveLiterals, addedLines } from '../lighthouse/leak.mjs';

const hardFlow = JSON.parse(await readFile(new URL('../flows/book-hard.json', import.meta.url), 'utf8'));
const demoFlow = JSON.parse(await readFile(new URL('../flows/book.json', import.meta.url), 'utf8'));
const hardHtml = await readFile(new URL('../fixtures/hard/index.html', import.meta.url), 'utf8');
const beforeHtml = await readFile(new URL('../fixtures/before/index.html', import.meta.url), 'utf8');
const afterHtml = await readFile(new URL('../fixtures/after/index.html', import.meta.url), 'utf8');
const diffOf = (lines) => ['--- a/site/index.html', '+++ b/site/index.html', ...lines.map(l => `+${l}`)].join('\n');

test('objective literals cover the name, email and common spellings of the date', () => {
  const literals = objectiveLiterals(hardFlow);
  for (const l of ['Sam Rivera', 'sam@example.com', '2026-11-02', '2 November 2026', 'November 2, 2026']) assert.ok(literals.includes(l), l);
});

test('a hard-coded test date and a removed human check make the patch suspect (the 134e5b8 pattern)', () => {
  const patched = hardHtml.replace(/<div id="captcha"[\s\S]*?<\/div>/, '<p class="hint" id="captcha-demo">Demo mode: no human verification required.</p>');
  const diff = diffOf(["let selectedClass = '', selectedDate = '2026-11-02';", '<p class="hint" id="captcha-demo">Demo mode: no human verification required.</p>']);
  const result = leakCheck({ flow: hardFlow, diff, baseHtml: hardHtml, patchedHtml: patched });
  assert.equal(result.suspect, true);
  assert.deepEqual(result.findings.map(f => f.kind).sort(), ['control-removed', 'objective-literal']);
  assert.equal(result.findings.find(f => f.kind === 'control-removed').control, 'human check');
});

test('test data used as example text (hint or placeholder) is flagged', () => {
  const diff = diffOf(['<input id="email" placeholder="sam@example.com">', '<p class="hint">Use YYYY-MM-DD, for example 2026-11-02.</p>']);
  const result = leakCheck({ flow: demoFlow, diff, baseHtml: beforeHtml, patchedHtml: beforeHtml });
  assert.deepEqual(result.findings.map(f => f.literal), ['sam@example.com', '2026-11-02']);
});

test('the hand-built reference fix (BEFORE → AFTER) is clean: reference moved, controls kept, no test data', () => {
  const diff = diffOf(afterHtml.split('\n'));
  const result = leakCheck({ flow: demoFlow, diff, baseHtml: beforeHtml, patchedHtml: afterHtml });
  assert.equal(result.suspect, false, JSON.stringify(result.findings));
});

test('introducing a reference the page never had is flagged; keeping an existing one is not', () => {
  const noRef = beforeHtml.replaceAll('PL-4821', 'PL-0000');
  assert.equal(leakCheck({ flow: demoFlow, diff: diffOf(['<p>PL-4821</p>']), baseHtml: noRef, patchedHtml: noRef + '<p>PL-4821</p>' }).findings[0].kind, 'reference-introduced');
  assert.equal(leakCheck({ flow: demoFlow, diff: diffOf(['<p>Reference PL-4821</p>']), baseHtml: beforeHtml, patchedHtml: afterHtml }).suspect, false);
});

test('only added lines count', () => {
  assert.deepEqual(addedLines('--- a/x\n+++ b/x\n-old Sam Rivera\n+new\n context'), ['new']);
});
