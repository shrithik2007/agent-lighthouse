import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

async function load(t, variant) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const html = await readFile(new URL(`../fixtures/${variant}/index.html`, import.meta.url), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true, virtualConsole });
  t.after(() => { dom.window.close(); assert.deepEqual(errors, [], 'page scripts must not throw'); });
  return { dom, document: dom.window.document, $: id => dom.window.document.getElementById(id) };
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function details($, date = '2026-11-02') {
  $('name').value = 'Sam Rivera'; $('email').value = 'sam@example.com'; $('date').value = date;
}

test('BEFORE has ambiguous entry points and the first Go is a dead end', async t => {
  const { document, $ } = await load(t, 'before');
  const buttons = [...document.querySelectorAll('button')].filter(button => button.textContent === 'Go');
  assert.equal(buttons.length, 2);
  assert.equal(buttons[0].id, 'nav-go');
  buttons[0].click();
  assert.equal($('prices').hidden, false);
  assert.equal($('booking').hidden, true);
  buttons[1].click();
  assert.equal($('booking').hidden, false);
});

test('BEFORE cookie layer blocks the page and only an unlabeled 13px div dismisses it', async t => {
  const { dom, $ } = await load(t, 'before');
  const close = $('cookie-close');
  assert.equal(close.tagName, 'DIV');
  for (const attr of ['role', 'aria-label', 'tabindex']) assert.equal(close.hasAttribute(attr), false);
  assert.equal(dom.window.getComputedStyle(close).width, '13px');
  assert.equal(dom.window.getComputedStyle($('cookies')).position, 'fixed');
  assert.equal($('cookies').querySelectorAll('button').length, 0);
  close.click();
  assert.equal($('cookies').hidden, true);
});

test('BEFORE fields have placeholders only, date format is undisclosed, validation is generic', async t => {
  const { document, $ } = await load(t, 'before');
  for (const id of ['name', 'email', 'date']) {
    assert.ok($(id).placeholder);
    assert.equal($(id).labels.length, 0);
    assert.equal($(id).hasAttribute('aria-label'), false);
  }
  assert.equal($('date').type, 'text');
  assert.equal(document.body.textContent.includes('YYYY-MM-DD'), false);
  $('cookie-close').click(); $('hero-go').click();
  details($, 'November 2, 2026');
  document.querySelector('[data-time="12:00"]').click(); $('waiver').click();
  $('submit-booking').click();
  assert.equal($('error').textContent, 'Invalid input');
  assert.equal($('toast').hidden, true);
});

test('BEFORE waiver and time slots are clickable non-semantic divs', async t => {
  const { document, $ } = await load(t, 'before');
  const slots = [...document.querySelectorAll('[data-time]')];
  assert.deepEqual(slots.map(slot => slot.textContent), ['9am', '12pm', '6pm']);
  for (const element of [...slots, $('waiver')]) {
    assert.equal(element.tagName, 'DIV');
    assert.equal(element.hasAttribute('role'), false);
  }
  slots[1].click(); assert.ok(slots[1].classList.contains('selected'));
  $('waiver').click(); assert.ok($('waiver').classList.contains('selected'));
});

test('BEFORE completes, but its sole confirmation disappears after 2.5 seconds', async t => {
  const { document, $ } = await load(t, 'before');
  $('cookie-close').click(); $('hero-go').click(); details($);
  document.querySelector('[data-time="12:00"]').click(); $('waiver').click(); $('submit-booking').click();
  assert.equal($('error').textContent, '');
  assert.equal($('toast').hidden, false);
  assert.equal($('toast').textContent, 'Done! Ref PL-4821');
  assert.equal(document.querySelector('[role="status"]'), null);
  await delay(2700);
  assert.equal($('toast').hidden, true);
});

test('AFTER both descriptive entry points open booking', async t => {
  const { $ } = await load(t, 'after');
  for (const id of ['nav-go', 'hero-go']) {
    $('booking').hidden = true;
    assert.equal($(id).textContent, 'Book a free first visit');
    $(id).click();
    assert.equal($('booking').hidden, false);
  }
});

test('AFTER cookies are a dismissible non-modal bar; controls have labels and native semantics', async t => {
  const { document, $ } = await load(t, 'after');
  assert.ok($('cookies').classList.contains('cookie-bar'));
  assert.equal(document.querySelector('.cookie-overlay'), null);
  assert.equal($('accept-cookies').tagName, 'BUTTON');
  assert.equal($('accept-cookies').textContent, 'Accept cookies');
  // Booking remains operable without dismissing this bar.
  $('nav-go').click(); assert.equal($('booking').hidden, false);
  for (const id of ['name', 'email', 'date', 'time', 'waiver']) assert.ok($(id).labels.length > 0);
  assert.equal($('date').type, 'date');
  assert.match($('date-hint').textContent, /date picker/);
  assert.equal($('waiver').type, 'checkbox');
  assert.equal($('time').tagName, 'SELECT');
  assert.deepEqual([...$('time').options].slice(1).map(option => option.value), ['09:00', '12:00', '18:00']);
  $('accept-cookies').click(); assert.equal($('cookies').hidden, true);
});

test('AFTER shows specific linked errors for every invalid field', async t => {
  const { $ } = await load(t, 'after');
  $('hero-go').click(); $('submit-booking').click();
  const expected = { name: 'Enter your name.', email: 'Enter a valid email address.', date: 'Choose a valid visit date using the date picker.', time: 'Choose an arrival time.', waiver: 'Accept the climbing waiver to book your visit.' };
  for (const [id, message] of Object.entries(expected)) {
    assert.equal($(id+'-error').textContent, message);
    assert.equal($(id).getAttribute('aria-invalid'), 'true');
    assert.ok($(id).getAttribute('aria-describedby').includes(id+'-error'));
  }
  assert.equal($('confirmation').hidden, true);
});

test('AFTER completes and confirmation remains visible beyond the five-second assertion', async t => {
  const { $ } = await load(t, 'after');
  $('hero-go').click(); details($); $('time').value = '12:00'; $('waiver').click(); $('submit-booking').click();
  assert.equal($('confirmation').hidden, false);
  assert.equal($('confirmation').getAttribute('role'), 'status');
  assert.match($('confirmation').textContent, /Booking confirmed/);
  assert.match($('confirmation').textContent, /PL-4821/);
  assert.match($('confirmation-detail').textContent, /Sam Rivera.*2026-11-02.*noon/);
  assert.equal($('submit-booking').disabled, true);
  await delay(5100);
  assert.equal($('confirmation').hidden, false);
  assert.match($('confirmation').textContent, /PL-4821/);
});

test('working copy initially matches BEFORE exactly', async () => {
  const [working, before] = await Promise.all(['../site/index.html', '../fixtures/before/index.html'].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.equal(working, before);
});

test('PostHog snippet is inert without a build-time key and loads only once one is set', async t => {
  for (const variant of ['before', 'after']) {
    const { dom } = await load(t, variant);
    assert.equal(dom.window.posthog, undefined);
    assert.equal(dom.window.document.querySelector('script[src*="posthog"]'), null);
  }
  const html = (await readFile(new URL('../fixtures/before/index.html', import.meta.url), 'utf8'))
    .replace("'__POSTHOG_PUBLIC_KEY__'", "'phc_stub'").replace("'__POSTHOG_PUBLIC_HOST__'", "'https://us.i.posthog.com'");
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
  t.after(() => dom.window.close());
  assert.equal(dom.window.document.querySelector('script[src]')?.src, 'https://us-assets.i.posthog.com/static/array.js');
  assert.equal(dom.window.posthog._i[0][0], 'phc_stub');
});
