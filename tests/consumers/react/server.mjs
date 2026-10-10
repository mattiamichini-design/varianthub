import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createWorkspace } from 'varianthub/server';

const port = Number(process.env.PORT ?? 4321);
const config = JSON.parse(await readFile('varianthub.config.json', 'utf8'));
const workspace = await createWorkspace({root: process.cwd(), config});
createServer(async (req, res) => {
  try {
    const origin = `http://127.0.0.1:${port}`;
    if (req.headers.host !== `127.0.0.1:${port}`) { res.writeHead(403).end(); return; }
    const url = new URL(req.url, origin);
    if (url.pathname.startsWith('/api/workspace')) {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1_000_000) { res.writeHead(413).end(); return; }
        chunks.push(chunk);
      }
      const request = new Request(url, {method: req.method, headers: req.headers,
        ...(req.method === 'PUT' ? {body: Buffer.concat(chunks)} : {})});
      const response = await workspace.handle(request, url.pathname.split('/')[3]);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const assets = {'/main.js':'text/javascript', '/main.css':'text/css'};
    const type = assets[url.pathname];
    res.setHeader('Content-Type', type ?? 'text/html');
    res.end(await readFile(type ? `dist${url.pathname}` : 'index.html'));
  } catch { res.writeHead(500).end('Consumer failed'); }
}).listen(port, '127.0.0.1', () => console.log(`React consumer: http://127.0.0.1:${port}`));
