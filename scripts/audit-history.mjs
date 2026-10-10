import { execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, {maxBuffer: 64 * 1024 * 1024});
const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/],
  ['provider-token', /\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,}|AKIA[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{20,})\b/],
  ['credential-url', /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s/:]+:[^\s/@]+@/i],
  ['literal-secret', /(?:api[_-]?key|secret|password|access[_-]?token)\s*[=:]\s*["'][A-Za-z0-9_+\/-]{20,}["']/i],
];
const findings = [];
let blobs = 0;
let archives = 0;
function scan(buffer, file, revision) {
  if (/\.tgz$|\.tar\.gz$/.test(file)) {
    buffer = gunzipSync(buffer, {maxOutputLength: 64 * 1024 * 1024});
    archives++;
  }
  const text = buffer.toString('utf8');
  for (const [rule, pattern] of rules) {
    if (pattern.test(text)) findings.push({rule, file, revision});
  }
  if (/(?:^|\/)(?:\.env(?:\.(?!example$|sample$)[^/]*)?|id_rsa|credentials\.json)$/.test(file)) findings.push({rule: 'sensitive-filename', file, revision});
}
const objects = git('rev-list', '--objects', '--all').toString().trim().split('\n');
const types = git('cat-file', '--batch-check=%(objectname) %(objecttype)', '--batch-all-objects').toString();
const blobIds = new Set(types.split('\n').filter(line => line.endsWith(' blob')).map(line => line.split(' ')[0]));
for (const entry of objects) {
  const split = entry.indexOf(' ');
  const id = entry.slice(0, split);
  if (split < 0 || !blobIds.has(id)) continue;
  scan(git('cat-file', 'blob', id), entry.slice(split + 1), id.slice(0, 12));
  blobs++;
}
for (const file of git('ls-files', '-z').toString().split('\0').filter(Boolean)) {
  try { scan(readFileSync(file), file, 'working-tree'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
console.log(JSON.stringify({
  commits: Number(git('rev-list', '--all', '--count').toString()), blobs, archives,
  findings, scope: 'All locally reachable Git blobs and tracked working files; gzip archives decompressed. Values never printed.',
  limits: 'Targeted patterns only. Not an exhaustive secret, binary, license or confidential-content audit. Remote-only refs and unreachable objects excluded.',
}, null, 2));
if (findings.length) process.exitCode = 1;
