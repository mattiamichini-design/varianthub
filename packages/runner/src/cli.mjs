#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createWorkspace, initializeProject } from './workspace.mjs';

const command = process.argv[2] ?? 'start';
const rootIndex = process.argv.indexOf('--root');
const root = path.resolve(rootIndex < 0 ? process.cwd() : process.argv[rootIndex + 1]);
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex < 0 ? 4310 : process.argv[portIndex + 1]);
const quote = value => /[^\w@%+=:,./-]/.test(value) ? `'${value.replaceAll("'", `'\\''`)}'` : value;
const cli = `node ${quote(fileURLToPath(import.meta.url))}`;
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon'};

if (command === 'init') {
  const config = await initializeProject(root, {examples:process.argv.includes('--examples')});
  console.log(`Workspace ${config.projectId} ready. Edit ${quote(path.join(root,'varianthub.config.json'))}, then run:\n  ${cli} start --root ${quote(root)}`);
} else if (command === 'start') {
  const config = JSON.parse(await readFile(path.join(root,'varianthub.config.json'),'utf8'));
  const workspace = await createWorkspace({root,config});
  const dist = fileURLToPath(new URL('../dist/',import.meta.url));
  const server = createServer(async (incoming, outgoing) => {
    try {
      const origin = `http://127.0.0.1:${port}`;
      const url = new URL(incoming.url ?? '/',origin);
      if (![new URL(origin).host,`localhost:${port}`].includes(incoming.headers.host)) {
        outgoing.writeHead(403); outgoing.end('Unexpected host'); return;
      }
      const requestOrigin = incoming.headers.origin;
      if (requestOrigin && requestOrigin !== `http://${incoming.headers.host}`) {
        outgoing.writeHead(403); outgoing.end('Unexpected origin'); return;
      }
      if (url.pathname === '/api/explorations') {
        outgoing.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});outgoing.end(JSON.stringify(config));return;
      }
      if (url.pathname === '/api/workspace' || url.pathname.startsWith('/api/workspace/')) {
        const chunks = []; let size = 0;
        for await (const chunk of incoming) { size += chunk.length; if (size > 1_000_000) throw Object.assign(new Error('Request too large'),{status:413}); chunks.push(chunk); }
        const request = new Request(`http://${incoming.headers.host}${url.pathname}${url.search}`, {method:incoming.method,headers:incoming.headers,...(incoming.method === 'PUT' ? {body:Buffer.concat(chunks)} : {})});
        const itemKey = url.pathname === '/api/workspace' ? undefined : decodeURIComponent(url.pathname.slice('/api/workspace/'.length));
        const response = await workspace.handle(request,itemKey);
        outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(Buffer.from(await response.arrayBuffer()));return;
      }
      if (incoming.method !== 'GET' && incoming.method !== 'HEAD') {outgoing.writeHead(405);outgoing.end();return;}
      let filename;
      if (url.pathname.startsWith('/sources/')) filename = await workspace.asset(decodeURIComponent(url.pathname.slice(9)));
      else if (['/viewer.js','/viewer.css'].includes(url.pathname)) filename = path.join(dist,url.pathname.slice(1));
      else filename = path.join(dist,'index.html');
      const content = await readFile(filename);
      outgoing.writeHead(200,{'Content-Type':mime[path.extname(filename)] ?? 'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
      outgoing.end(incoming.method === 'HEAD' ? undefined : content);
    } catch (error) { outgoing.writeHead(error.status ?? (error.code === 'ENOENT' ? 404 : 500),{'Content-Type':'text/plain'});outgoing.end(error.status ? error.message : 'Source unavailable. Check the registered path and try again.'); }
  });
  server.listen(port,'127.0.0.1',() => console.log(`VariantHub: http://127.0.0.1:${port}`));
} else {
  console.error(`Usage: ${cli} init|start [--root path] [--port 4310] [--examples]`);process.exitCode = 1;
}
