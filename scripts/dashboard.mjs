import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png' };
// Only the dashboard, the results it reads and committed evidence are served.
const allowed = [/^dashboard\//, /^results\/(latest|demo-backup|cases)\.json$/, /^results\/cases\/[a-z0-9-]+\/(latest\.json|proposal\.md)$/, /^results\/proposal\.md$/, /^results\/loop\/[^/]+\.md$/, /^evidence\/.+\.(jpg|png|json|txt|md)$/];

export function createDashboardServer() {
  return http.createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '');
    if (path === '' ) path = 'dashboard/index.html';
    const clean = normalize(path);
    if (clean.startsWith('..') || clean.includes(`..${sep}`) || !allowed.some(rule => rule.test(clean.split(sep).join('/')))) {
      res.writeHead(404); return res.end('Not found');
    }
    try {
      const body = await readFile(join(root, clean));
      res.writeHead(200, { 'Content-Type': types[extname(clean)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('Not found');
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4100);
  createDashboardServer().listen(port, '127.0.0.1', () => console.log(`Dashboard: http://localhost:${port}  (recorded run: http://localhost:${port}/?recorded=1)`));
}
