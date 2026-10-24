import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { callOpenAI } from '../lighthouse/openai.mjs';

// A stubbed transport; these are not model calls and log only to a temporary directory.
const KEY = 'sk-test-not-a-real-key';

async function withKey(fn) {
  const saved = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = KEY;
  try { return await fn(); } finally { if (saved == null) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = saved; }
}

test('logs model, purpose and tokens without the key, and parses structured output', () => withKey(async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'lh-openai-'));
  let sent;
  const fetchImpl = async (url, init) => {
    sent = init;
    return { ok: true, json: async () => ({ id: 'resp_1', model: 'm-1', output_text: '{"ok":true}', usage: { input_tokens: 10, output_tokens: 3, total_tokens: 13 } }) };
  };
  const result = await callOpenAI({ purpose: 'diagnosis', instructions: 'i', input: 'x', model: 'm-1', cwd, fetchImpl, schema: { name: 's', schema: { type: 'object' } } });
  assert.deepEqual(result.json, { ok: true });
  assert.equal(sent.headers.authorization, `Bearer ${KEY}`);
  const log = await readFile(join(cwd, 'results', 'openai-calls.jsonl'), 'utf8');
  const entry = JSON.parse(log);
  assert.equal(entry.purpose, 'diagnosis');
  assert.equal(entry.inputTokens, 10);
  assert.equal(entry.ok, true);
  assert.ok(!log.includes(KEY));
}));

test('failed calls are logged with nulls and never echo the key', () => withKey(async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'lh-openai-'));
  const fetchImpl = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: `bad key ${KEY}` } }) });
  await assert.rejects(callOpenAI({ purpose: 'fix', instructions: 'i', input: 'x', model: 'm', cwd, fetchImpl }), error => !error.message.includes(KEY));
  const entry = JSON.parse(await readFile(join(cwd, 'results', 'openai-calls.jsonl'), 'utf8'));
  assert.equal(entry.ok, false);
  assert.equal(entry.inputTokens, null);
  assert.ok(!JSON.stringify(entry).includes(KEY));
}));

test('refuses to run without OPENAI_API_KEY', async () => {
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try { await assert.rejects(callOpenAI({ purpose: 'x', instructions: 'i', input: 'x', model: 'm' }), /OPENAI_API_KEY/); }
  finally { if (saved != null) process.env.OPENAI_API_KEY = saved; }
});
