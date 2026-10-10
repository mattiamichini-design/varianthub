import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, cp, readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repo = process.cwd();
const root = await mkdtemp(path.join(tmpdir(), 'varianthub-packed-'));
const run = (args, cwd = repo) => execFileSync('npm', args, {cwd, stdio: 'inherit'});
const json = async filename => JSON.parse(await readFile(filename, 'utf8'));
const writeJSON = (filename, value) => writeFile(filename, JSON.stringify(value, null, 2) + '\n');
const archives = {};
const packages = {};
for (const name of ['core', 'runner']) {
  const pkg = await json(`packages/${name}/package.json`);
  assert.equal(pkg.private, true, 'Application packages must not be published to a public registry');
  // Real pack invokes prepack: missing/stale dist must never be silently distributed.
  const output = execFileSync('npm', ['pack', '--workspace', pkg.name, '--pack-destination', root, '--json'], {cwd: repo, encoding: 'utf8'});
  const [packed] = JSON.parse(output);
  const files = packed.files.map(file => file.path);
  assert(files.includes('LICENSE'));
  assert(files.some(file => file.startsWith('dist/')));
  assert(!files.some(file => /marketing|next\.config|\.test\.|\.tgz$/.test(file)), 'Product includes maintainer/site files');
  if (name === 'runner') {
    for (const file of ['dist/viewer.js', 'dist/viewer.css', 'dist/index.html', 'dist/THIRD_PARTY_NOTICES.txt', 'skills/varianthub/SKILL.md', 'skills/varianthub-builder/SKILL.md']) assert(files.includes(file), `Missing ${file}`);
  }
  archives[name] = path.join(root, packed.filename);
  packages[name] = {name: packed.name, version: packed.version, size: packed.size, unpackedSize: packed.unpackedSize, files: files.length};
}

const html = path.join(root, 'html');
await mkdir(html);
await writeJSON(path.join(html, 'package.json'), {name: 'plain-html-consumer', private: true, devDependencies: {varianthub: archives.runner}});
run(['install', '--no-audit', '--no-fund'], html);
assert.deepEqual((await readdir(path.join(html, 'node_modules'))).filter(name => !name.startsWith('.')), ['varianthub']);
const cli = path.join(html, 'node_modules/varianthub/src/cli.mjs');
const invoke = (...args) => execFileSync(process.execPath, [cli, ...args], {cwd: html, stdio: 'inherit'});
invoke('init');
const initial = await readFile(path.join(html, 'varianthub.config.json'), 'utf8');
invoke('init');
assert.equal(await readFile(path.join(html, 'varianthub.config.json'), 'utf8'), initial);
for (const skill of ['varianthub', 'varianthub-builder']) {
  await cp(path.join(html, 'node_modules/varianthub/skills', skill), path.join(html, '.agents/skills', skill), {recursive: true});
}

const react = path.join(root, 'react');
await cp(path.join(repo, 'tests/consumers/react'), react, {recursive: true});
const runner = await json('packages/runner/package.json');
await writeJSON(path.join(react, 'package.json'), {
  name: 'react-consumer', private: true, type: 'module',
  scripts: {build: 'esbuild main.tsx --bundle --format=esm --jsx=automatic --outdir=dist', start: 'node server.mjs'},
  dependencies: {'varianthub-core': archives.core, varianthub: archives.runner, react: runner.devDependencies.react, 'react-dom': runner.devDependencies['react-dom']},
  devDependencies: {esbuild: runner.devDependencies.esbuild},
});
await writeJSON(path.join(react, 'varianthub.config.json'), {version: 1, projectId: 'packed-react', roots: ['.'], explorations: [{key: 'counter', sourcePaths: ['main.tsx'], variants: [{id: 'quiet'}, {id: 'bold'}]}]});
await writeFile(path.join(react, 'index.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>React consumer</title><link rel="stylesheet" href="/main.css"><div id="root"></div><script type="module" src="/main.js"></script></html>');
run(['install', '--no-audit', '--no-fund'], react);
run(['run', 'build'], react);
const installed = await json(path.join(react, 'package-lock.json'));
assert(!Object.values(installed.packages).some(pkg => pkg.link), 'Consumer must not resolve workspace symlinks');
assert(!installed.packages['node_modules/next'], 'React consumer must not install the marketing host');
await mkdir('output', {recursive: true});
await writeJSON('output/packed-consumers.json', {root, html, react, cli, packages});
console.log(JSON.stringify(packages, null, 2));
console.log(`PACKED_CONSUMERS=${root}`);
run(['exec', '--', 'playwright', 'test', '--config', 'tests/consumers/playwright.config.ts'], repo);
