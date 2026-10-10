import { build } from 'esbuild';
import { mkdir, writeFile, readFile, readdir, cp } from 'node:fs/promises';
import path from 'node:path';
await mkdir('dist',{recursive:true});
await cp('../../public/examples', 'dist/examples', {recursive:true});
const result=await build({entryPoints:['viewer/main.tsx'],bundle:true,outfile:'dist/viewer.js',format:'esm',jsx:'automatic',minify:true,metafile:true,define:{'process.env.NODE_ENV':'"production"'},alias:{'varianthub-core':'../core/src/index.ts'}});
await writeFile('dist/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VariantHub</title><link rel="stylesheet" href="/viewer.css"><div id="root"></div><script type="module" src="/viewer.js"></script></html>');
const packages=new Map();
for(const input of Object.keys(result.metafile.inputs)){
  if(!input.includes('node_modules/'))continue;
  let directory=path.dirname(path.resolve(input));
  while(directory!==path.dirname(directory)){
    try{
      const pkg=JSON.parse(await readFile(path.join(directory,'package.json'),'utf8'));
      if(pkg.name && pkg.version){packages.set(directory,pkg);break;}
    }catch{/* Walk from a bundled module to its package root. */}
    directory=path.dirname(directory);
  }
}
const notices=[];
for(const [directory,pkg] of packages){
  if(!['MIT','ISC','BSD-2-Clause','BSD-3-Clause','Apache-2.0','0BSD'].includes(pkg.license))throw new Error(`Review bundled license: ${pkg.name} (${pkg.license})`);
  const files=(await readdir(directory)).filter(name=>/^(licen[cs]e|copying|notice)(\.|$)/i.test(name));
  if(!files.length)throw new Error(`Missing bundled license text: ${pkg.name}`);
  notices.push(`${pkg.name}@${pkg.version} — ${pkg.license}\n\n${(await Promise.all(files.map(file=>readFile(path.join(directory,file),'utf8')))).join('\n')}`);
}
await writeFile('dist/THIRD_PARTY_NOTICES.txt',notices.join('\n\n'+'='.repeat(72)+'\n\n'));
