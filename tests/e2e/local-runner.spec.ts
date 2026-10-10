import { expect, test } from './fixtures';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, type Server } from 'node:http';

let root: string;
let runner: ChildProcess;
let sourceServer: Server;
const port = 4318;
test.describe.configure({mode:'serial'});
test.beforeAll(async () => {
  sourceServer=createServer((req,res)=>{if(req.url==='/blocked')res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");res.setHeader('Content-Type','text/html');res.end('<h1>Remote source</h1><input aria-label="Remote note">');});
  await new Promise<void>(resolve=>sourceServer.listen(4319,'127.0.0.1',resolve));
  root = await mkdtemp(path.join(tmpdir(),'varianthub-html-consumer-'));
  await mkdir(path.join(root,'pages'));
  await writeFile(path.join(root,'pages','index.html'),'<!doctype html><html><link rel="stylesheet" href="./style.css"><body><h1>Plain HTML exploration</h1><label>Project note <input aria-label="Project note"></label><button id="action">Count 0</button><a href="./details.html">Details</a><script src="./script.js"></script></body></html>');
  await writeFile(path.join(root,'pages','style.css'),'body{background:rgb(230,245,239);font:16px system-ui;padding:24px}');
  await writeFile(path.join(root,'pages','script.js'),'let count=0;document.getElementById("action").onclick=event=>event.target.textContent="Count "+ ++count;');
  await writeFile(path.join(root,'pages','details.html'),'<h1>Local details</h1>');
  await writeFile(path.join(root,'varianthub.config.json'),JSON.stringify({version:1,projectId:'plain-test',roots:['pages'],explorations:[{key:'plain',name:'Plain HTML',path:'pages',kind:'page',sourcePaths:['pages/index.html'],variants:[{id:'first',name:'HTML first',source:{type:'html',entry:'pages/index.html'}},{id:'second',name:'URL second',source:{type:'url',url:'http://127.0.0.1:4319/'}},{id:'invalid',name:'Invalid source',source:{type:'url',url:'javascript:alert(1)'}},{id:'blocked',name:'Blocked source',source:{type:'url',url:'http://127.0.0.1:4319/blocked'}}]}]}));
  runner=spawn(process.execPath,[process.env.VARIANTHUB_RUNNER_CLI ?? 'packages/runner/src/cli.mjs','start','--root',root,'--port',String(port)],{cwd:process.cwd(),stdio:'pipe'});
  await new Promise<void>((resolve,reject)=>{runner.stdout!.on('data',data=>{if(String(data).includes('VariantHub:'))resolve();});runner.once('exit',code=>reject(new Error(`Runner exited ${code}`)));runner.once('error',reject);});
});
// Wait for both servers to release their ports, or a retried group cannot listen on them again.
test.afterAll(async () => {
  if (runner && runner.exitCode === null && runner.signalCode === null) await new Promise(resolve => { runner.once('exit', resolve); runner.kill(); });
  if (sourceServer?.listening) await new Promise(resolve => { sourceServer.close(resolve); sourceServer.closeAllConnections(); });
  if (root) await rm(root, {recursive:true, force:true});
});

test('plain HTML package uses the same viewer, relative assets and live scripts without a React project', async ({page}) => {
  await page.goto(`http://127.0.0.1:${port}/`);
  await expect(page.getByText('Plain HTML',{exact:true}).filter({visible:true}).first()).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.goto(`http://127.0.0.1:${port}/items/plain`);
  const frame=page.frameLocator('iframe').first();
  await expect(frame.getByRole('heading',{name:'Plain HTML exploration'})).toBeVisible();
  await frame.getByLabel('Project note').fill('Local source works');
  await frame.getByRole('button',{name:'Count 0'}).click();
  await expect(frame.getByRole('button',{name:'Count 1'})).toBeVisible();
  await expect(frame.locator('body')).toHaveCSS('background-color','rgb(230, 245, 239)');
  await frame.getByRole('link',{name:'Details'}).click();
  await expect(frame.getByRole('heading',{name:'Local details'})).toBeVisible();
  await page.getByRole('button',{name:'More actions',exact:true}).click();
  await page.getByRole('menuitem',{name:'Compare all',exact:true}).click();
  await expect(page).toHaveURL(/preview\/plain\/first/);
  await expect(page.getByRole('button',{name:/next variant/i})).toBeVisible();
  await page.reload();
  await expect(page.frameLocator('iframe:visible').first().getByRole('heading',{name:'Plain HTML exploration'})).toBeVisible();
});

test('runner rejects private paths and stale or foreign writes', async ({request}) => {
  const endpoint=`http://127.0.0.1:${port}`;
  expect((await request.get(endpoint+'/sources/varianthub.config.json')).status()).toBe(403);
  const session=await (await request.get(endpoint+'/api/workspace')).json();
  const layout={version:1,variantOrder:['first','second'],comparedVariantIds:['first'],gridCols:4};
  const headers={Origin:endpoint,'X-VariantHub-Token':session.token};
  const first=await request.put(endpoint+'/api/workspace/plain',{headers,data:{revision:(await (await request.get(endpoint+'/api/workspace/plain')).json()).revision,layout}});
  expect(first.status()).toBe(200);
  expect((await request.put(endpoint+'/api/workspace/plain',{headers,data:{revision:null,layout}})).status()).toBe(409);
  expect((await request.put(endpoint+'/api/workspace/plain',{headers:{...headers,Origin:'https://example.com'},data:{revision:null,layout}})).status()).toBe(403);
});

 test('cross-origin sources stay interactive and restricted or malformed siblings remain isolated',async({page})=>{
  await page.goto(`http://127.0.0.1:${port}/items/plain`);
  await page.getByRole('button',{name:'More actions',exact:true}).click();
  await page.getByRole('menuitem',{name:'Manage variants',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Visible variants',exact:true});
  for(const name of ['URL second','Invalid source','Blocked source']){
    const button=dialog.getByRole('button',{name,exact:true});
    if(await button.getAttribute('aria-pressed')!=='true')await button.click();
  }
  await dialog.getByRole('button',{name:'Apply',exact:true}).click();
  await page.locator('.vh-card').filter({hasText:'URL second'}).scrollIntoViewIfNeeded();
  const remote=page.frameLocator('iframe[title="URL second page preview"]');
  await remote.getByLabel('Remote note').fill('Cross-origin input');
  await expect(remote.getByLabel('Remote note')).toHaveValue('Cross-origin input');
  await expect(page.getByRole('alert').filter({hasText:/HTTP|URL|http/i})).toBeVisible();
  await expect(page.locator('iframe[title="Invalid source page preview"]')).toHaveCount(0);
  await page.locator('.vh-card').filter({hasText:'Blocked source'}).scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'More actions',exact:true}).click();
  await expect(page.getByRole('menuitem',{name:'Compare all',exact:true})).toBeEnabled();
});

test('installed HTML artboards keep live state during zoom and save their viewport', async ({page}) => {
  await page.goto(`http://127.0.0.1:${port}/items/plain`);
  await page.getByRole('button', {name:'Canvas', exact:true}).click();
  await page.getByRole('button', {name:'Hand tool', exact:true}).click();
  const frame = page.frameLocator('iframe').first();
  await frame.getByLabel('Project note').fill('Keep this HTML state');
  await page.getByRole('button', {name:'Zoom in', exact:true}).click();
  await page.getByRole('button', {name:'Fit all', exact:true}).click();
  await expect(frame.getByLabel('Project note')).toHaveValue('Keep this HTML state');
  const width = page.getByRole('spinbutton', {name:/width/i}).first();
  await width.fill('390');
  await width.press('Enter');
  await expect.poll(() => page.locator('iframe').first().evaluate(el => el instanceof HTMLIFrameElement ? el.contentWindow?.innerWidth : undefined)).toBe(390);
  await expect.poll(async () => {
    const response = await page.request.get(`http://127.0.0.1:${port}/api/workspace/plain`);
    return (await response.json()).layout?.canvas?.artboards?.first?.width;
  }).toBe(390);
  await page.reload();
  await expect(page.getByRole('spinbutton', {name:/width/i}).first()).toHaveValue('390');
});
