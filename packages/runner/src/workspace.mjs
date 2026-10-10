import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cp, mkdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const sourcePaths = item => [...new Set([...(item.sourcePaths ?? []), ...(item.variants ?? []).flatMap(variant => variant.sourcePaths ?? [])])];
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
export function validId(value) { return typeof value === 'string' && idPattern.test(value); }
const inside = (root, target) => target === root || target.startsWith(root + path.sep);

export async function resolveProjectFile(root, relative) {
  if (typeof relative !== 'string' || relative.includes('\0') || path.isAbsolute(relative)) throw fail('Invalid project path');
  const base = await realpath(root);
  const candidate = path.resolve(base, relative);
  if (!inside(base, candidate)) throw fail('Path is outside the configured project', 403);
  const resolved = await realpath(candidate);
  if (!inside(base, resolved)) throw fail('Symlink is outside the configured project', 403);
  return resolved;
}

function validGeometry(value) {
  return value && ['x','y','width','height'].every(key => typeof value[key] === 'number' && Number.isFinite(value[key])) &&
    Math.abs(value.x) <= 1e7 && Math.abs(value.y) <= 1e7 && value.width >= 100 && value.width <= 7680 && value.height >= 100 && value.height <= 7680;
}
function validBoards(boards) {
  return boards && typeof boards === 'object' && !Array.isArray(boards) && Object.keys(boards).length <= 10000 &&
    Object.entries(boards).every(([id, geometry]) => validId(id) && validGeometry(geometry));
}
export function validateLayout(layout) {
  const ids = value => Array.isArray(value) && value.length <= 10000 && value.every(validId) && new Set(value).size === value.length;
  if (!layout || layout.version !== 1 || !ids(layout.variantOrder) || !ids(layout.comparedVariantIds) ||
      layout.comparedVariantIds.length > 20 || !layout.comparedVariantIds.every(id => layout.variantOrder.includes(id)) ||
      (layout.pendingVariantIds !== undefined && (!ids(layout.pendingVariantIds) || !layout.pendingVariantIds.every(id => layout.variantOrder.includes(id)))) ||
      ![1,2,3,4].includes(layout.gridCols)) throw fail('Invalid exploration layout');
  if (layout.canvas && (!['mobile','tablet','desktop','wide','custom'].includes(layout.canvas.preset) ||
      typeof layout.canvas.resizeLocked !== 'boolean' || !validBoards(layout.canvas.artboards))) throw fail('Invalid canvas layout');
  if (layout.responsive && (typeof layout.responsive !== 'object' || Array.isArray(layout.responsive) ||
      Object.entries(layout.responsive).some(([id, value]) => !validId(id) || !validBoards(value?.artboards) || Object.keys(value.artboards).length > 4))) throw fail('Invalid responsive layout');
  // Persist only the shared contract. Personal camera, visits and favorites never enter this file.
  return { version: 1, variantOrder: layout.variantOrder, comparedVariantIds: layout.comparedVariantIds,
    ...(layout.pendingVariantIds?.length ? {pendingVariantIds: layout.pendingVariantIds} : {}), gridCols: layout.gridCols,
    ...(layout.canvas ? {canvas: layout.canvas} : {}), ...(layout.responsive ? {responsive: layout.responsive} : {}) };
}

export async function initializeProject(root, { examples = false } = {}) {
  const configPath = path.join(root, 'varianthub.config.json');
  try { return JSON.parse(await readFile(configPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const config = { version: 1, projectId: randomUUID(), roots: ['.'], explorations: [] };
  if (examples) {
    // Refuse an existing destination: starter installation must never replace project files.
    const destination = path.join(root, 'varianthub-examples');
    const bundled = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/examples');
    await readFile(path.join(bundled, 'fieldwork/index.html'));
    await mkdir(destination);
    await cp(path.join(bundled, 'fieldwork'), path.join(destination, 'fieldwork'), {recursive:true, force:false, errorOnExist:true});
    config.roots = ['varianthub-examples'];
    config.explorations = [
      {key:'fieldwork-html',name:'Fieldwork · HTML journal',kind:'page',path:'varianthub-examples/fieldwork',description:'Two independent editorial directions in HTML, CSS and JavaScript.',variants:[
        {id:'fieldwork',name:'Fieldwork / botanical',source:{type:'html',entry:'varianthub-examples/fieldwork/index.html'}},
        {id:'afterhours',name:'Afterhours / nocturnal',source:{type:'html',entry:'varianthub-examples/fieldwork/afterhours.html'}},
      ]},
      {key:'external-playground',name:'External · Spatial playground',kind:'page',description:'A live external three.js example. Requires an internet connection.',variants:[{id:'periodic-table',name:'Periodic table / three.js',source:{type:'url',url:'https://threejs.org/examples/css3d_periodictable.html'}}]},
    ];
  }
  try { await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', {flag:'wx'}); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return JSON.parse(await readFile(configPath, 'utf8'));
}

export async function createWorkspace({ root, config, allowWrites = true }) {
  const projectRoot = await realpath(root);
  if (!validId(config.projectId) || !Array.isArray(config.explorations)) throw fail('Invalid project configuration');
  const keys = config.explorations.map(item => item.key);
  if (!keys.every(validId) || new Set(keys).size !== keys.length) throw fail('Explorations need unique stable identifiers');
  for (const item of config.explorations) {
    const variants = item.variants ?? [];
    if (!Array.isArray(variants) || !variants.every(variant => variant && validId(variant.id)) || new Set(variants.map(variant => variant.id)).size !== variants.length) throw fail('Variants need unique stable identifiers');
    for (const entry of [item, ...variants]) if (entry.sourcePaths !== undefined && (!Array.isArray(entry.sourcePaths) || !entry.sourcePaths.every(value => typeof value === 'string' && !path.isAbsolute(value) && !value.split(/[\\/]/).includes('..')))) throw fail('Invalid source history paths');
  }
  if (config.roots !== undefined && !Array.isArray(config.roots)) throw fail('Invalid project roots');
  const token = randomUUID();
  const roots = await Promise.all((config.roots ?? ['.']).map(entry => resolveProjectFile(projectRoot, entry)));
  const layoutsPath = path.join(projectRoot, '.varianthub', 'layouts');
  let scanPromise;
  let scanTime = 0;
  // ponytail: project-wide write queue; split by exploration only if local save throughput matters.
  let writes = Promise.resolve();
  async function safeLayoutPath(itemKey, create = false) {
    if (!validId(itemKey) || !keys.includes(itemKey)) throw fail('Unknown exploration', 404);
    // Resolve existing ancestors before mkdir so a .varianthub symlink cannot create directories elsewhere.
    for (const relative of ['.varianthub', '.varianthub/layouts']) {
      // Layouts belong to the live local project, not a deployment bundle.
      const candidate = path.join(/* turbopackIgnore: true */ projectRoot, relative);
      try { if (!inside(projectRoot, await realpath(/* turbopackIgnore: true */ candidate))) throw fail('Layout directory is outside the project', 403); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (create) await mkdir(candidate, {recursive: true});
    }
    const filename = path.join(layoutsPath, itemKey + '.json');
    try { if (!inside(layoutsPath, await realpath(filename))) throw fail('Layout symlink is outside the layout directory', 403); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return filename;
  }
  async function load(itemKey) {
    const filename = await safeLayoutPath(itemKey);
    try {
      const raw = await readFile(filename, 'utf8');
      return {revision: digest(raw), layout: validateLayout(JSON.parse(raw))};
    } catch (error) { if (error.code === 'ENOENT') return {revision:null, layout:null}; throw error; }
  }
  async function save(itemKey, revision, value) {
    if (!allowWrites) throw fail('Repository writes are disabled', 403);
    const layout = validateLayout(value);
    const operation = writes.then(async () => {
      const filename = await safeLayoutPath(itemKey, true);
      const current = await load(itemKey);
      if (revision !== current.revision) throw fail('The layout changed elsewhere. Reload it before saving.', 409);
      const raw = JSON.stringify(layout, null, 2) + '\n';
      const temporary = filename + '.' + randomUUID() + '.tmp';
      try {
        await writeFile(temporary, raw, {flag:'wx'});
        // Detect edits occurring during preparation as well as before the request.
        if ((await load(itemKey)).revision !== revision) throw fail('The layout changed elsewhere. Reload it before saving.', 409);
        await rename(temporary, filename);
      } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
      return {revision:digest(raw), layout};
    });
    writes = operation.catch(() => {});
    return operation;
  }
  async function scan() {
    const metadata = Object.fromEntries(config.explorations.map(item => [item.key, {history:'unknown',localChanges:false}]));
    let status, log, gitRoot;
    try {
      gitRoot = (await exec('git', ['rev-parse','--show-toplevel'], {cwd:projectRoot})).stdout.trim();
      status = (await exec('git', ['status','--porcelain=v1','-z','--untracked-files=all'], {cwd:projectRoot,maxBuffer:8e6})).stdout;
    } catch { for (const value of Object.values(metadata)) value.history = 'no-git'; return metadata; }
    let hasHead = true;
    try { await exec('git', ['rev-parse','--verify','HEAD'], {cwd:projectRoot}); } catch { hasHead = false; }
    const declaredPaths = [...new Set(config.explorations.flatMap(sourcePaths))];
    log = hasHead && declaredPaths.length ? (await exec('git', ['log','--relative','--format=%x1e%cI','--name-only','-z','--', ...declaredPaths], {cwd:projectRoot,maxBuffer:16e6})).stdout : '';
    const changed = [];
    const entries = status.split('\0');
    for (let index=0; index<entries.length; index++) {
      const entry = entries[index];
      if (!entry) continue;
      changed.push(entry.slice(3));
      if (/R|C/.test(entry.slice(0,2)) && entries[index+1]) changed.push(entries[++index]);
    }
    for (const item of config.explorations) {
      const paths = sourcePaths(item);
      if (!paths.length) continue;
      if (!paths.every(p => typeof p === 'string' && !path.isAbsolute(p) && !p.split(/[\\/]/).includes('..'))) throw fail('Invalid source history paths');
      const matches = file => paths.some(p => file === p || file.startsWith(p.replace(/\/$/,'') + '/'));
      const value = metadata[item.key];
      value.history = hasHead ? 'git' : 'no-head';
      value.localChanges = changed.map(file => path.relative(projectRoot, path.join(gitRoot, file))).some(matches);
      for (const commit of log.split('\x1e')) {
        const [date, ...files] = commit.split(/[\0\n]/).filter(Boolean);
        if (date && files.some(matches)) { value.lastCommit = date; break; }
      }
    }
    return metadata;
  }
  async function metadata(refresh = false) {
    if (!scanPromise || refresh || Date.now() - scanTime > 2000) { scanTime = Date.now(); scanPromise = scan().catch(error => {scanPromise = undefined; throw error;}); }
    return scanPromise;
  }
  async function asset(relative) {
    const filename = await resolveProjectFile(projectRoot, relative);
    if (!roots.some(root => inside(root, filename))) throw fail('Asset is outside configured roots', 403);
    const segments = path.relative(projectRoot, filename).split(path.sep);
    if (segments.some(part => part.startsWith('.') || part === 'node_modules') || segments.includes('varianthub.config.json')) throw fail('Private project files are not served', 403);
    return filename;
  }
  async function handle(request, itemKey) {
    try {
      const url = new URL(request.url);
      const origin = request.headers.get('origin');
      // Next may normalize request.url to its bind address; validate the actual Host authority.
      const expected = new URL(`${url.protocol}//${request.headers.get('host') ?? url.host}`);
      const host = expected.hostname;
      if (!['localhost','127.0.0.1','[::1]'].includes(host) || (origin && origin !== expected.origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw fail('Unexpected request origin', 403);
      if (request.method === 'GET') return Response.json(itemKey ? await load(itemKey) : {projectId:config.projectId,workspaceRoot:projectRoot,token,metadata:await metadata(url.searchParams.has('refresh'))}, {headers:{'Cache-Control':'no-store'}});
      if (request.method !== 'PUT') throw fail('Method not allowed', 405);
      if (origin !== expected.origin || request.headers.get('x-varianthub-token') !== token) throw fail('Invalid workspace session', 403);
      if (!request.headers.get('content-type')?.startsWith('application/json')) throw fail('Expected JSON');
      const raw = await request.text();
      if (raw.length > 1_000_000) throw fail('Layout is too large', 413);
      const body = JSON.parse(raw);
      return Response.json(await save(itemKey, body.revision, body.layout));
    } catch (error) {
      return Response.json({error: error.status ? error.message : 'Workspace operation failed. Your changes remain in memory.'}, {status:error.status ?? 500});
    }
  }
  return {load,save,metadata,asset,handle,token,config};
}
