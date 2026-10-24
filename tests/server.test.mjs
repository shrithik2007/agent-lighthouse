import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createSiteServer } from '../scripts/serve.mjs';

test('static server serves current fixture and refuses writes and unrelated paths', async t => {
  const server = createSiteServer(new URL('../site/index.html', import.meta.url));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(await response.text(), /Pitchline/);
  assert.equal((await fetch(url+'/.env')).status, 404);
  assert.equal((await fetch(url, { method: 'POST' })).status, 405);
  assert.equal(await (await fetch(url, { method: 'HEAD' })).text(), '');
});
