import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function createSiteServer(file) {
  return http.createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end('Method not allowed');
    }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!['/', '/index.html'].includes(pathname)) {
      res.writeHead(404); return res.end('Not found');
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(500); res.end('Site file could not be read');
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const servers = [
    [4101, new URL('../site/index.html', import.meta.url), 'BEFORE / working copy'],
    [4102, new URL('../fixtures/after/index.html', import.meta.url), 'AFTER / reference'],
  ].map(([port, file, label]) => {
    const server = createSiteServer(file);
    server.on('error', error => {
      console.error(`Cannot serve ${label}: ${error.message}`);
      for (const running of servers) running.close();
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => console.log(`${label}: http://localhost:${port}`));
    return server;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => servers.forEach(server => server.close()));
}
