/**
 * Code-level evidence for the fix brief, from REA (npx rea-agents) website observation.
 * REA captures the page's script sources over CDP (docs/browser-observation.md: inspect-web-page --include-script-sources);
 * this module then reads those sources statically for timers that hide elements and for event handlers on
 * controls whose text matches Kane's failing remark. REA's DOM capture keeps attribute names only, so control
 * text comes from the page HTML we serve. Any failure degrades to an empty list with the reason logged.
 */
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';

const exec = promisify(execFile);
const SNIPPET = 240;
const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'then', 'was', 'were', 'not', 'but', 'page', 'button', 'click', 'clicked', 'clicking', 'element', 'field', 'agent', 'could', 'would', 'after', 'before', 'still', 'visible', 'found', 'find', 'unable', 'failed', 'try', 'tried']);
const HIDES = /\.hidden\s*=\s*true|\.style\.display\s*=\s*['"]none['"]|\.style\.visibility\s*=\s*['"]hidden['"]|classList\.add\(\s*['"](?:hidden|hide|d-none)['"]|\.remove\(\s*\)|setAttribute\(\s*['"]hidden['"]/;
const ID_REF = /(?:\$|getElementById)\(\s*['"]([\w-]+)['"]\s*\)|querySelector\(\s*['"]#([\w-]+)['"]\s*\)/g;

export class ReaShapeError extends Error {}

/** Index just past the parenthesis that closes the one at `open`, skipping strings and template literals. */
function closeParen(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') { for (i++; i < text.length && text[i] !== c; i++) if (text[i] === '\\') i++; continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i + 1;
  }
  return text.length;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const clip = text => text.replace(/\s+/g, ' ').trim().slice(0, SNIPPET);
const ids = text => [...new Set([...text.matchAll(ID_REF)].map(m => m[1] ?? m[2]))];
const words = text => (String(text).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(w => w.length >= 3 && !STOP.has(w));

/** The documented Evidence shape: normalized_result.scripts.items[].source.artifact.text. */
export function scriptsFrom(rea) {
  const items = rea?.normalized_result?.scripts?.items;
  if (!Array.isArray(items)) throw new ReaShapeError('normalized_result.scripts.items is not an array');
  const withSource = items.filter(item => typeof item?.source?.artifact?.text === 'string');
  if (items.length && !withSource.length) throw new ReaShapeError('no scripts[].source.artifact.text (were script sources requested?)');
  return withSource.map(item => ({ key: item.script_key ?? null, url: item.url ?? null, sha256: item.source.artifact.sha256 ?? null, text: item.source.artifact.text }));
}

/** id -> visible text, aria-label, placeholder and value, from the page HTML. */
export function controlText(html = '') {
  const out = {};
  // Opening tags only, so nested elements with ids are not swallowed by their parent's match.
  for (const m of html.matchAll(/<(\w+)\b([^>]*)>/g)) {
    const attr = name => m[2].match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`))?.[1] ?? '';
    const id = attr('id');
    if (!id) continue;
    const start = m.index + m[0].length;
    const close = html.indexOf(`</${m[1]}`, start);
    const inner = /^(?:input|img|br|hr|meta|link)$/i.test(m[1]) || close < 0 ? '' : html.slice(start, close).replace(/<[^>]*>/g, ' ');
    out[id] = [inner, attr('aria-label'), attr('placeholder'), attr('value'), attr('alt')].join(' ').replace(/\s+/g, ' ').trim();
  }
  return out;
}

/** Why a control matches the remark, or null: a quoted phrase equals its text, or its text/id shares words with the remark. */
function remarkMatch(id, text, remark) {
  if (!remark) return null;
  const lower = remark.toLowerCase();
  const quoted = [...remark.matchAll(/["'“‘]([^"'”’]{1,60})["'”’]/g)].map(m => m[1].trim().toLowerCase()).filter(Boolean);
  const label = text.toLowerCase();
  const exact = quoted.find(q => label && (label === q || label.includes(q) && q.length >= 3));
  if (exact) return { strength: 3, why: `control text "${text.slice(0, 60)}" matches the quoted "${exact}" in Kane's remark` };
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const short = label && label.length <= 20 && new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(lower);
  const remarkWords = new Set(words(lower));
  const shared = [...new Set([...words(text), ...words(id.replaceAll('-', ' '))])].filter(w => remarkWords.has(w));
  const strength = shared.length + (short ? 2 : 0);
  if (!strength) return null;
  const reasons = [short ? `its text "${text}" appears in Kane's remark` : null, shared.length ? `it shares ${shared.map(w => `"${w}"`).join(', ')} with the remark` : null].filter(Boolean);
  return { strength, why: `control #${id}: ${reasons.join('; ')}` };
}

/** Pure: REA Evidence + page HTML + failing remark -> codeEvidence findings. Throws ReaShapeError on an unexpected shape. */
export function extractCodeEvidence(rea, { html = '', failingRemark = '' } = {}) {
  const scripts = scriptsFrom(rea);
  const texts = controlText(html);
  const findings = [];
  for (const script of scripts) {
    const { text } = script;
    const where = index => ({ script: script.url, scriptKey: script.key, sha256: script.sha256, line: lineOf(text, index) });
    for (const m of text.matchAll(/\b(setTimeout|setInterval)\s*\(/g)) {
      const end = closeParen(text, m.index + m[0].length - 1);
      const call = text.slice(m.index, end);
      if (!HIDES.test(call)) continue;
      const delay = call.match(/,\s*(\d+)\s*\)\s*$/)?.[1];
      findings.push({ kind: 'timer-hides-element', ...where(m.index), timer: m[1], delayMs: delay ? Number(delay) : null, targets: ids(call), snippet: clip(call),
        why: `${m[1]} hides ${ids(call).map(id => `#${id}`).join(', ') || 'an element'}${delay ? ` after ${delay} ms` : ''}` });
    }
    for (const m of text.matchAll(/((?:\$|document\.getElementById)\(\s*['"]([\w-]+)['"]\s*\)|document\.querySelector\(\s*['"]#([\w-]+)['"]\s*\))\s*\.addEventListener\(\s*['"](\w+)['"]/g)) {
      const id = m[2] ?? m[3];
      const match = remarkMatch(id, texts[id] ?? '', failingRemark);
      if (!match) continue;
      const end = closeParen(text, m.index + m[1].length + text.slice(m.index + m[1].length).indexOf('('));
      findings.push({ kind: 'handler-on-matching-control', ...where(m.index), control: `#${id}`, controlText: texts[id] ?? null, event: m[4],
        snippet: clip(text.slice(m.index, end)), why: match.why, strength: match.strength });
    }
  }
  // Timers first (they hide state the agent needs), then the best-matching handlers.
  return [
    ...findings.filter(f => f.kind === 'timer-hides-element'),
    ...findings.filter(f => f.kind === 'handler-on-matching-control').sort((a, b) => b.strength - a.strength).slice(0, 5),
  ].map(({ strength, ...finding }) => finding);
}

async function freePort() {
  return new Promise((ok, fail) => {
    const server = createServer().once('error', fail);
    server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => ok(port)); });
  });
}

function chromePath(env) {
  const candidates = [env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find(path => path && existsSync(path)) ?? null;
}

/** Runs REA against `url` in a throwaway headless Chrome profile, or a caller-owned browser at REA_CDP_ENDPOINT. */
export async function runRea({ url, env = process.env, timeoutMs = 240_000 }) {
  const rea = env.REA_BIN ? [env.REA_BIN] : ['npx', '-y', 'rea-agents@latest'];
  const call = async args => {
    const { stdout } = await exec(rea[0], [...rea.slice(1), ...args, '--json'], { maxBuffer: 128 * 1024 * 1024, timeout: timeoutMs });
    try { return JSON.parse(stdout); } catch { throw new ReaShapeError(`${args[0]} did not print JSON`); }
  };
  let endpoint = env.REA_CDP_ENDPOINT ?? null;
  let browser = null;
  let profile = null;
  try {
    if (!endpoint) {
      const chrome = chromePath(env);
      if (!chrome) throw new Error('no Chrome-family browser found (set CHROME_PATH or REA_CDP_ENDPOINT)');
      const port = await freePort();
      profile = await mkdtemp(join(tmpdir(), 'lighthouse-rea-'));
      browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', url], { stdio: 'ignore' });
      endpoint = `http://127.0.0.1:${port}`;
      const deadline = Date.now() + 15_000;
      while (!(await fetch(`${endpoint}/json/version`).then(r => r.ok, () => false))) {
        if (Date.now() > deadline) throw new Error('Chrome DevTools endpoint did not open within 15 s');
        await new Promise(ok => setTimeout(ok, 250));
      }
    }
    const listing = await call(['list-browser-targets', endpoint]);
    const targets = listing?.normalized_result?.targets;
    if (!Array.isArray(targets)) throw new ReaShapeError('list-browser-targets: normalized_result.targets is not an array');
    const origin = new URL(url).origin;
    const target = targets.find(t => t.url === url) ?? targets.find(t => t.origin === origin);
    if (!target?.target_id) throw new Error(`no browser target for ${origin} (targets: ${targets.map(t => t.url).join(', ') || 'none'})`);
    return await call(['inspect-web-page', endpoint, target.target_id, '--observation-ms', '1000', '--include-script-sources']);
  } finally {
    browser?.kill('SIGTERM');
    if (profile) await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

/** Never throws: returns { codeEvidence, evidenceId, reason }; reason is set whenever the list is empty for a cause other than "nothing found". */
export async function reaDiagnose({ url, html, failingRemark, env = process.env, run = runRea, log = console.error } = {}) {
  let rea;
  try {
    rea = await run({ url, env });
  } catch (error) {
    const reason = error instanceof ReaShapeError ? `REA output shape differs from docs/browser-observation.md: ${error.message}`
      : error.code === 'ENOENT' ? `REA not available (${error.path ?? 'npx'} not found)` : `REA run failed: ${String(error.stderr || error.message).trim().split('\n').at(-1).slice(0, 200)}`;
    log(`  rea: ${reason}; continuing without code evidence`);
    return { codeEvidence: [], evidenceId: null, reason };
  }
  try {
    const codeEvidence = extractCodeEvidence(rea, { html, failingRemark });
    log(`  rea: ${codeEvidence.length} code finding(s) from ${rea.evidence_id ?? 'unidentified evidence'}`);
    return { codeEvidence, evidenceId: rea.evidence_id ?? null, reason: null };
  } catch (error) {
    const reason = `REA output shape differs from docs/browser-observation.md: ${error.message}`;
    log(`  rea: ${reason}; continuing without code evidence`);
    return { codeEvidence: [], evidenceId: rea?.evidence_id ?? null, reason };
  }
}
