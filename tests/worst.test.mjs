import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

async function load(t) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  // jsdom has no canvas backend; the page guards getContext, so that notice is expected.
  virtualConsole.on('jsdomError', error => { if (!/getContext|Not implemented: HTMLCanvasElement/.test(error.message)) errors.push(error); });
  const html = await readFile(new URL('../fixtures/worst/index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true, virtualConsole });
  t.after(() => { dom.window.close(); assert.deepEqual(errors, [], 'page scripts must not throw'); });
  return { dom, document: dom.window.document, $: id => dom.window.document.getElementById(id) };
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const consentDone = dom => dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: 'consent-done' }));

async function bookCarefully(dom, $) {
  consentDone(dom);
  $('book').click(); await delay(450);
  $('news-close').click(); $('loc-accept').click();
  $('name').value = 'Sam Rivera'; $('email').value = 'sam@example.com'; $('date').value = '2026-11-02';
  const noon = dom.window.document.querySelector('input[name="time"][value="12:00"]');
  noon.checked = true; noon.dispatchEvent(new dom.window.Event('change'));
  assert.equal($('location-picker').hidden, false, 'choosing a time first asks for a location');
  $('gym').value = 'Downtown'; $('gym-save').click();
  noon.dispatchEvent(new dom.window.Event('change'));
  $('waiver').click();
  $('submit-booking').click();
}

test('WORST consent lives in a same-origin iframe and the page is scroll-locked until it is answered', async t => {
  const { dom, document, $ } = await load(t);
  assert.equal($('consent').tagName, 'IFRAME');
  assert.match($('consent').getAttribute('srcdoc'), /aria-modal=true/);
  assert.match($('consent').getAttribute('srcdoc'), /key==='Tab'/, 'focus is trapped inside the consent dialog');
  assert.ok(document.body.classList.contains('scroll-locked'));
  consentDone(dom);
  assert.equal(document.body.classList.contains('scroll-locked'), false);
  assert.equal($('consent'), null);
});

test('WORST overlapping modals: the newsletter lands on top, focus stays on the lower location dialog', async t => {
  const { dom, document, $ } = await load(t);
  consentDone(dom);
  $('book').click(); await delay(450);
  assert.equal($('news-card').hidden, false);
  assert.equal(document.activeElement, $('loc-accept'));
  $('news-accept').click(); // accepting the upper one does not open booking
  assert.equal($('booking').hidden, true);
  $('loc-accept').click();
  assert.equal($('booking').hidden, false);
});

test('WORST declining location blocks booking', async t => {
  const { dom, $ } = await load(t);
  consentDone(dom); $('book').click(); await delay(450); $('news-close').click();
  $('loc-decline').click();
  assert.match($('loc-error').textContent, /required/);
  assert.equal($('booking').hidden, true);
});

test('WORST time slots are a canvas with no DOM nodes, plus a visually hidden radio list', async t => {
  const { document, $ } = await load(t);
  assert.equal($('slots').tagName, 'CANVAS');
  assert.equal($('slots').children.length, 0);
  assert.equal($('slots').getAttribute('aria-hidden'), 'true');
  assert.equal(document.querySelectorAll('fieldset.sr-only input[name="time"]').length, 3);
});

test('WORST submit sits after three screen-height filler sections', async t => {
  const { document, $ } = await load(t);
  const form = $('booking-form');
  const children = [...form.children];
  assert.ok(children.indexOf(form.querySelector('.filler')) < children.indexOf($('submit-booking')));
  assert.equal(form.querySelectorAll('.filler section').length, 3);
});

test('WORST is completable by a careful human; the confirmation arrives about 4 s after submit and stays', async t => {
  const { dom, $ } = await load(t);
  await bookCarefully(dom, $);
  assert.equal($('processing').hidden, false);
  assert.equal($('confirmation').hidden, true);
  await delay(4100);
  assert.equal($('confirmation').hidden, false);
  assert.match($('confirmation').textContent, /PL-5519/);
  await delay(1000);
  assert.equal($('confirmation').hidden, false);
});
