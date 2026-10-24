import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Product-side OpenAI calls (diagnosis and fixer). The key is read from OPENAI_API_KEY only;
 * it is never logged, printed or written. Every call, successful or not, appends one line to
 * results/openai-calls.jsonl with timestamp, model, purpose and token counts (null if absent).
 */
export async function callOpenAI({ purpose, instructions, input, schema, model = process.env.OPENAI_MODEL, cwd = process.cwd(), fetchImpl = fetch }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set in the environment');
  if (!model) throw new Error('OPENAI_MODEL is not set');
  const startedAt = new Date().toISOString();
  const body = {
    model, instructions, input,
    ...(schema ? { text: { format: { type: 'json_schema', name: schema.name, schema: schema.schema, strict: true } } } : {}),
  };
  let response, payload, error = null;
  try {
    response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    payload = await response.json();
    if (!response.ok) error = payload?.error?.message ?? `HTTP ${response.status}`;
  } catch (cause) {
    error = cause.message;
  }
  if (error) error = String(error).replaceAll(key, '[redacted]').slice(0, 300);
  const usage = payload?.usage ?? {};
  await log(cwd, {
    ts: startedAt, finishedAt: new Date().toISOString(), purpose, model: payload?.model ?? model,
    responseId: payload?.id ?? null, ok: !error, error,
    inputTokens: usage.input_tokens ?? null, outputTokens: usage.output_tokens ?? null, totalTokens: usage.total_tokens ?? null,
  });
  if (error) throw new Error(`OpenAI ${purpose} call failed: ${error}`);
  const text = payload.output_text ?? payload.output?.flatMap(item => item.content ?? []).filter(part => part.type === 'output_text').map(part => part.text).join('') ?? '';
  return { text, json: schema ? JSON.parse(text) : null, model: payload.model, responseId: payload.id };
}

async function log(cwd, entry) {
  const path = join(cwd, 'results', 'openai-calls.jsonl');
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, JSON.stringify(entry) + '\n');
}
