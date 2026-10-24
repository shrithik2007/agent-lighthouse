import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

async function load(t) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const html = await readFile(new URL('../fixtures/hard/index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true, virtualConsole });
  t.after(() => { dom.window.close(); assert.deepEqual(errors, [], 'page scripts must not throw'); });
  return { dom, document: dom.window.document, $: id => dom.window.document.getElementById(id) };
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const hover = (dom, el, type) => el.dispatchEvent(new dom.window.MouseEvent(type, { bubbles: false }));

// A careful human's path, step by step; used by the completion test.
async function bookCarefully(dom, document, $) {
  $('cookie-close').click(); $('hero-go').click();
  document.querySelector('[data-class="free-first-visit"]').click(); $('step1-next').click();
  $('name').value = 'Sam Rivera'; $('email').value = 'sam@example.com';
  $('cal-next').click();
  document.querySelector('[data-date="2026-11-02"]').click();
  hover(dom, $('time-dd'), 'mouseenter');
  document.querySelector('[data-time="12:00"]').click();
  $('waiver').click(); $('captcha').click();
  await delay(900);
  $('submit-booking').click();
}

test('HARD keeps the six original frictions', async t => {
  const { dom, document, $ } = await load(t);
  assert.equal([...document.querySelectorAll('button')].filter(b => b.textContent === 'Go').length >= 2, true);
  $('nav-go').click(); assert.equal($('prices').hidden, false); assert.equal($('booking').hidden, true);
  assert.equal($('cookie-close').tagName, 'DIV');
  assert.equal(dom.window.getComputedStyle($('cookies')).position, 'fixed');
  for (const id of ['name', 'email']) { assert.ok($(id).placeholder); assert.equal($(id).labels.length, 0); }
  assert.equal(document.querySelectorAll('select, input[type="radio"], input[type="checkbox"], input[type="date"]').length, 0);
  assert.equal($('waiver').tagName, 'DIV');
  assert.match($('toast').textContent, /PL-7302/);
});

test('HARD class step uses div cards and a generic error', async t => {
  const { document, $ } = await load(t);
  $('cookie-close').click(); $('hero-go').click();
  assert.equal(document.querySelector('[data-class]').tagName, 'DIV');
  $('step1-next').click();
  assert.equal($('error1').textContent, 'Invalid input');
  assert.equal($('booking-form').hidden, true);
});

test('HARD newsletter modal opens over the page about 3 s after load', async t => {
  const { $ } = await load(t);
  assert.equal($('newsletter').hidden, true);
  await delay(3100);
  assert.equal($('newsletter').hidden, false);
  assert.equal($('news-close').tagName, 'DIV');
  $('news-skip').click();
  assert.equal($('newsletter').hidden, true);
});

test('HARD time slots open on hover only; clicking the trigger does nothing', async t => {
  const { dom, $ } = await load(t);
  $('time-trigger').click();
  assert.equal($('time-list').hidden, true);
  hover(dom, $('time-dd'), 'mouseenter'); assert.equal($('time-list').hidden, false);
  hover(dom, $('time-dd'), 'mouseleave'); assert.equal($('time-list').hidden, true);
});

test('HARD date picker is an unlabeled div grid that starts on October 2026', async t => {
  const { document, $ } = await load(t);
  assert.equal($('cal-title').textContent, 'October 2026');
  const cell = document.querySelector('[data-date]');
  assert.equal(cell.tagName, 'DIV');
  for (const attr of ['role', 'aria-label', 'tabindex']) assert.equal(cell.hasAttribute(attr), false);
  assert.equal(document.querySelector('[data-date="2026-11-02"]'), null);
  $('cal-next').click();
  assert.equal($('cal-title').textContent, 'November 2026');
  assert.ok(document.querySelector('[data-date="2026-11-02"]'));
});

test('HARD reCAPTCHA-style check is a styled div, and submit without it is refused', async t => {
  const { dom, document, $ } = await load(t);
  assert.equal($('captcha').tagName, 'DIV');
  $('cookie-close').click(); $('hero-go').click();
  document.querySelector('[data-class="free-first-visit"]').click(); $('step1-next').click();
  $('name').value = 'Sam Rivera'; $('email').value = 'sam@example.com';
  $('cal-next').click(); document.querySelector('[data-date="2026-11-02"]').click();
  hover(dom, $('time-dd'), 'mouseenter'); document.querySelector('[data-time="12:00"]').click();
  $('waiver').click();
  $('submit-booking').click();
  assert.equal($('error').textContent, 'Invalid input');
  assert.equal($('confirm').hidden, true);
});

test('HARD confirm step: the primary button says "Go back" and returns to the form', async t => {
  const { dom, document, $ } = await load(t);
  await bookCarefully(dom, document, $);
  assert.equal($('confirm').hidden, false);
  assert.equal($('confirm-back').textContent, 'Go back');
  assert.equal($('confirm-yes').className, 'linkish');
  $('confirm-back').click();
  assert.equal($('booking-form').hidden, false);
  assert.equal($('toast').hidden, true);
});

test('HARD is completable by a careful human; the reference then vanishes after 2.5 s', async t => {
  const { dom, document, $ } = await load(t);
  await bookCarefully(dom, document, $);
  $('confirm-yes').click();
  assert.equal($('toast').hidden, false);
  assert.match($('toast').textContent, /PL-7302/);
  await delay(2600);
  assert.equal($('toast').hidden, true);
});
