/* MAHWORLD :: RUNTIME BRIDGE TRACER (PASS 0 of the world pivot). One owner-run, READ-ONLY command that finds the MINIMUM files the public
   recovery branch is missing and stages only the public-safe ones for upload.

   WHY: the recovery branch carries CLAUDE_GAMEPLAY_RUNTIME/ only, but 00_CORE/bootstrap.js, the static build and 34 of the 58 test programs
   also import files from sibling roots (CLAUDE_RUNTIME_FOUNDATION/, CLAUDE_DUAL_LOCOMOTION/, CLAUDE_GAMEPLAY_FOUNDATION/, …) that exist only
   in the owner's archive folder. The repository is PUBLIC, so whole folders must never be uploaded blindly.

   WHAT IT DOES (nothing inside --root is ever written, moved or deleted):
     1. runs every CLAUDE_GAMEPLAY_RUNTIME/16_TESTS/*.test.mjs and deploy/build_static_demo.mjs against --root, each in its own node process
        with a preload that RECORDS every file read / stat / directory listing / ES-module load and REDIRECTS every write aimed inside --root
        into a temporary shadow folder (reads prefer the shadow copy, so tests still see their own output);
     2. adds the static import closure of every JavaScript file it found outside CLAUDE_GAMEPLAY_RUNTIME/;
     3. classifies each outside file: RUNTIME_SOURCE (.js/.mjs) · RUNTIME_CONFIG (.json) · CHARACTER_RAW (models / RAW_* / masters) ·
        EVIDENCE (probe output, captures, reports) · SECRET_RISK (name or content looks like a credential or private path) · OTHER;
     4. copies ONLY clean RUNTIME_SOURCE / RUNTIME_CONFIG files into <out>/files/<same relative path> and writes <out>/BRIDGE_MANIFEST.json
        plus <out>/BRIDGE_REVIEW.md (every file with bytes, SHA-256, class, which programs needed it, and everything deliberately excluded).

   OWNER ACTION (Windows example; paths are yours):
     node trace_runtime_bridge.mjs --root C:\Users\<you>\Downloads\MAHWORLD_CHARACTERS --out C:\Users\<you>\Downloads\MAHWORLD_RUNTIME_BRIDGE
   then read BRIDGE_REVIEW.md and upload the CONTENTS of <out>\files\ to the repository root on backup/mahworld-m6-20260924T190351Z.
   --out must be OUTSIDE --root. Requires Node 20.6+ (module.register). Add --tests a,b to limit programs, --no-build to skip the build. */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';

var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; } function has(k) { return argv.indexOf(k) >= 0; }
var ROOT = path.resolve(arg('--root', process.cwd())); var OUT = path.resolve(arg('--out', path.join(path.dirname(ROOT), 'MAHWORLD_RUNTIME_BRIDGE')));
var RT = path.join(ROOT, 'CLAUDE_GAMEPLAY_RUNTIME'); var LA = path.join(RT, '26_LOCAL_AUTHORITY');
function inside(p, dir) { var r = path.relative(dir, p); return !!r && !r.startsWith('..') && !path.isAbsolute(r); }
if (!fs.existsSync(path.join(RT, '00_CORE', 'bootstrap.js'))) { console.error('--root must be the MAHWORLD folder that contains CLAUDE_GAMEPLAY_RUNTIME/ (not found under ' + ROOT + ')'); process.exit(2); }
if (OUT === ROOT || inside(OUT, ROOT)) { console.error('--out must be OUTSIDE --root so the archive folder is never written: ' + OUT); process.exit(2); }
var nodeMajor = +process.versions.node.split('.')[0], nodeMinor = +process.versions.node.split('.')[1]; if (nodeMajor < 20 || (nodeMajor === 20 && nodeMinor < 6)) { console.error('Node 20.6+ is required (found ' + process.versions.node + ')'); process.exit(2); }

var WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-bridge-')); var SHADOW = path.join(WORK, 'shadow'); var LOGS = path.join(WORK, 'logs'); fs.mkdirSync(SHADOW, { recursive: true }); fs.mkdirSync(LOGS, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

/* ---- the preload (main thread): fs recording + write redirection; registers the ES-module load recorder ---- */
var HOOKS = path.join(WORK, 'hooks.mjs'), PRELOAD = path.join(WORK, 'preload.mjs');
fs.writeFileSync(HOOKS, [
  "import fs from 'node:fs'; import { fileURLToPath } from 'node:url';",
  "var LOG = process.env.MW_TRACE_LOG;",
  "export async function load(url, context, next) { if (LOG && url.startsWith('file:')) { try { fs.appendFileSync(LOG, JSON.stringify({ op: 'import', p: fileURLToPath(url) }) + '\\n'); } catch (e) { } } return next(url, context); }",
  "export async function resolve(spec, context, next) { try { return await next(spec, context); } catch (e) { if (LOG && (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('file:')) && context.parentURL && context.parentURL.startsWith('file:')) { try { fs.appendFileSync(LOG, JSON.stringify({ op: 'import-missing', p: fileURLToPath(new URL(spec, context.parentURL)) }) + '\\n'); } catch (e2) { } } throw e; } }"
].join('\n'));
fs.writeFileSync(PRELOAD, [
  "import fs from 'node:fs'; import fsp from 'node:fs/promises'; import path from 'node:path'; import { register } from 'node:module'; import { pathToFileURL, fileURLToPath } from 'node:url';",
  "var ROOT = path.resolve(process.env.MW_TRACE_ROOT), SHADOW = path.resolve(process.env.MW_TRACE_SHADOW), LOG = process.env.MW_TRACE_LOG;",
  "register(pathToFileURL(process.env.MW_TRACE_HOOKS).href, pathToFileURL('./'));",
  "var O = {}; ['appendFileSync', 'existsSync'].forEach(function (k) { O[k] = fs[k]; });",
  "function norm(p) { try { if (p instanceof URL) p = fileURLToPath(p); if (Buffer.isBuffer(p)) p = p.toString(); if (typeof p !== 'string') return null; return path.resolve(p); } catch (e) { return null; } }",
  "function inRoot(p) { var r = path.relative(ROOT, p); return !r.startsWith('..') && !path.isAbsolute(r); }",
  "function shadowOf(p) { return path.join(SHADOW, path.relative(ROOT, p)); }",
  "function rec(op, p) { try { O.appendFileSync(LOG, JSON.stringify({ op: op, p: p }) + '\\n'); } catch (e) { } }",
  "function rd(op, p) { var a = norm(p); if (!a) return p; rec(op, a); if (inRoot(a) && O.existsSync(shadowOf(a))) return shadowOf(a); return a; }",
  "function wr(op, p) { var a = norm(p); if (!a) return p; if (!inRoot(a)) return a; var s = shadowOf(a); rec('write-redirected', a); try { fs.mkdirSync.orig(path.dirname(s), { recursive: true }); } catch (e) { } return s; }",
  "function wrapRead(obj, k, op) { var f = obj[k]; if (typeof f !== 'function') return; obj[k] = function (p) { var a = [].slice.call(arguments); a[0] = rd(op, p); return f.apply(this, a); }; obj[k].orig = f; }",
  "function wrapWrite(obj, k, argIdx) { var f = obj[k]; if (typeof f !== 'function') return; obj[k] = function () { var a = [].slice.call(arguments); (argIdx || [0]).forEach(function (i) { if (a[i] !== undefined) a[i] = wr(k, a[i]); }); return f.apply(this, a); }; obj[k].orig = f; }",
  "['readFileSync', 'readFile', 'createReadStream', 'readdirSync', 'readdir', 'statSync', 'stat', 'lstatSync', 'lstat', 'accessSync', 'access', 'realpathSync'].forEach(function (k) { wrapRead(fs, k, k); });",
  "['openSync', 'open'].forEach(function (k) { var f = fs[k]; fs[k] = function (p, flags) { var a = [].slice.call(arguments); var w = typeof flags === 'string' ? /[wa+]/.test(flags) : typeof flags === 'number' ? (flags & 3) !== 0 : false; a[0] = w ? wr(k, p) : rd(k, p); return f.apply(this, a); }; fs[k].orig = f; });",
  "['existsSync'].forEach(function (k) { var f = fs[k]; fs[k] = function (p) { var a = norm(p); if (a) { var sh = inRoot(a) && f(shadowOf(a)); var ok = sh || f(a); rec(ok ? 'exists' : 'exists-missing', a); return ok; } return f(p); }; });",
  "['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'rmdirSync', 'unlinkSync', 'writeFile', 'appendFile', 'mkdir', 'rm', 'unlink', 'createWriteStream', 'mkdtempSync'].forEach(function (k) { wrapWrite(fs, k); });",
  "['renameSync', 'copyFileSync', 'cpSync', 'rename', 'copyFile', 'symlinkSync', 'linkSync'].forEach(function (k) { wrapWrite(fs, k, [1]); });",
  "['readFile', 'readdir', 'stat', 'lstat', 'access', 'open', 'realpath'].forEach(function (k) { wrapRead(fsp, k, 'p.' + k); });",
  "['writeFile', 'appendFile', 'mkdir', 'rm', 'unlink', 'mkdtemp'].forEach(function (k) { wrapWrite(fsp, k); }); ['rename', 'copyFile', 'cp'].forEach(function (k) { wrapWrite(fsp, k, [1]); });",
  "O.appendFileSync = O.appendFileSync || fs.appendFileSync.orig;"
].join('\n'));

/* ---- run the programs ---- */
var tests = fs.readdirSync(path.join(RT, '16_TESTS')).filter(function (f) { return /\.test\.mjs$/.test(f); }).sort(); var only = arg('--tests', null); if (only) tests = tests.filter(function (t) { return only.split(',').some(function (o) { return t.indexOf(o) >= 0; }); });
var runs = []; var env = Object.assign({}, process.env, { MW_TRACE_ROOT: ROOT, MW_TRACE_SHADOW: SHADOW, MW_TRACE_HOOKS: HOOKS });
function runOne(id, args, cwd) { var log = path.join(LOGS, id.replace(/[^\w.-]/g, '_') + '.jsonl'); var e = Object.assign({}, env, { MW_TRACE_LOG: log, NODE_OPTIONS: ((process.env.NODE_OPTIONS || '') + ' --import=' + pathToFileURL(PRELOAD).href).trim() });
  var t0 = Date.now(); var r = spawnSync(process.execPath, args, { cwd: cwd, env: e, encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024 }); var out = (r.stdout || '') + (r.stderr || ''); var m = /(\d+) passed, (\d+) failed/.exec(out);
  var row = { id: id, exit: r.status, passed: m ? +m[1] : null, failed: m ? +m[2] : null, ms: Date.now() - t0, log: log, tail: out.trim().split('\n').slice(-2).join(' | ').slice(0, 300) }; runs.push(row); console.log((r.status === 0 ? 'ok   ' : 'FAIL ') + id + ' (' + row.ms + ' ms)'); return row; }
tests.forEach(function (t) { runOne(t, [path.join('16_TESTS', t)], RT); });
if (!has('--no-build')) runOne('build_static_demo', [path.join(LA, 'deploy', 'build_static_demo.mjs'), '--out', path.join(WORK, 'static_dist')], RT);

/* ---- collect every touched path outside CLAUDE_GAMEPLAY_RUNTIME/ ---- */
var touched = new Map(); /* abs -> { ops:Set, by:Set } */
runs.forEach(function (r) { if (!fs.existsSync(r.log)) return; fs.readFileSync(r.log, 'utf8').split('\n').forEach(function (ln) { if (!ln) return; var e; try { e = JSON.parse(ln); } catch (x) { return; } var p = path.resolve(e.p);
  if (inside(p, SHADOW) || inside(p, WORK) || p === WORK) return; var t = touched.get(p) || { ops: new Set(), by: new Set() }; t.ops.add(e.op); t.by.add(r.id); touched.set(p, t); }); });
var outsideRuntime = []; var externalToRoot = []; var missing = [];
touched.forEach(function (t, p) { var isMissing = t.ops.has('exists-missing') || t.ops.has('import-missing'); var exists = false; try { var st = fs.statSync(p); if (st.isDirectory()) return; exists = st.isFile(); } catch (e) { }
  if (!inside(p, ROOT)) { if (exists && !/node_modules|[\\/]node[\\/]|nodejs/i.test(p) && !p.startsWith(path.dirname(process.execPath))) externalToRoot.push({ path: p, by: [...t.by] }); return; }
  if (inside(p, RT) || p === RT) return; if (!exists) { if (isMissing || !t.ops.has('write-redirected')) missing.push({ path: path.relative(ROOT, p).split(path.sep).join('/'), by: [...t.by] }); return; }
  outsideRuntime.push({ abs: p, rel: path.relative(ROOT, p).split(path.sep).join('/'), ops: [...t.ops], by: [...t.by] }); });

/* static import closure for JavaScript outside the runtime root (catches imports a failing program never reached) */
var seen = new Set(outsideRuntime.map(function (x) { return x.abs; })); var queue = outsideRuntime.filter(function (x) { return /\.(m?js)$/.test(x.abs); }).map(function (x) { return x.abs; });
while (queue.length) { var f = queue.shift(); var src; try { src = fs.readFileSync(f, 'utf8'); } catch (e) { continue; } var re = /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g, m;
  while ((m = re.exec(src))) { var spec = m[1] || m[2] || m[3]; if (!/^\.{1,2}\//.test(spec)) continue; var p = path.resolve(path.dirname(f), spec); if (!inside(p, ROOT) || inside(p, RT) || seen.has(p)) continue; seen.add(p); var ex = false; try { ex = fs.statSync(p).isFile(); } catch (e) { }
    if (!ex) { missing.push({ path: path.relative(ROOT, p).split(path.sep).join('/'), by: ['static-import:' + path.relative(ROOT, f)] }); continue; } outsideRuntime.push({ abs: p, rel: path.relative(ROOT, p).split(path.sep).join('/'), ops: ['static-import'], by: ['static-import:' + path.relative(ROOT, f).split(path.sep).join('/')] }); if (/\.(m?js)$/.test(p)) queue.push(p); } }

/* ---- classify + scan + stage ---- */
var SECRET_NAME = /(^|[\\/._-])(\.env|secret|secrets|password|passwd|credential|token|apikey|api_key|private[_-]?key|id_rsa|\.pem|\.p12|\.pfx|\.key)([\\/._-]|$)/i;
var SECRET_CONTENT = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\b(sk|pk|rk)_(live|test)_[0-9A-Za-z]{10,}/, /\bghp_[0-9A-Za-z]{20,}/, /\bgithub_pat_[0-9A-Za-z_]{20,}/, /\bxox[baprs]-[0-9A-Za-z-]{10,}/, /\bAKIA[0-9A-Z]{16}\b/, /\bAIza[0-9A-Za-z_-]{30,}/, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./, /(MAHDEMO_PW|MAHWORLD_DEMO_PASSWORD|NETLIFY_AUTH_TOKEN|SUPABASE_SERVICE_ROLE|SCENARIO_API)\s*[=:]\s*\S/i, /\b(password|passwd|secret|api[_-]?key|access[_-]?token)\b\s*[=:]\s*['"][^'"]{6,}['"]/i];
var PRIVATE_PATH = /[A-Za-z]:\\\\?Users\\\\?[^\\\s"']+|\/Users\/[^/\s"']+|\/home\/[^/\s"']+/;
function classOf(x) { var r = x.rel; if (SECRET_NAME.test(r)) return 'SECRET_RISK';
  if (/(^|\/)(RAW_[^/]*|originals?|masters?|MASTER_[^/]*|Blender|blender|source_models|INCOMING[^/]*)(\/|$)/.test(r) || /\.(glb|gltf|fbx|blend|blend1|obj|stl|vox|psd|kra|mp4|mov|webm|wav|mp3|zip|7z|png|jpg|jpeg|webp|exr|hdr|ktx2|bin)$/i.test(r)) return 'CHARACTER_RAW';
  if (/(^|\/)(evidence|probe_out|checkpoints|captures|screens|video|logs?)(\/|$)/i.test(r) || /\.(log|jsonl)$/i.test(r)) return 'EVIDENCE';
  if (/\.(m?js|cjs)$/i.test(r)) return 'RUNTIME_SOURCE'; if (/\.json$/i.test(r)) return 'RUNTIME_CONFIG'; return 'OTHER'; }
var rows = outsideRuntime.map(function (x) { var buf = fs.readFileSync(x.abs); var cls = classOf(x); var flags = [];
  if (cls === 'RUNTIME_SOURCE' || cls === 'RUNTIME_CONFIG' || cls === 'OTHER') { var txt = buf.toString('utf8'); SECRET_CONTENT.forEach(function (re) { if (re.test(txt)) flags.push('secret-pattern ' + String(re).slice(0, 40)); }); var pm = PRIVATE_PATH.exec(txt); if (pm) flags.push('private-path ' + pm[0].slice(0, 60)); }
  var staged = (cls === 'RUNTIME_SOURCE' || cls === 'RUNTIME_CONFIG') && !flags.length && buf.length <= 2 * 1024 * 1024;
  if ((cls === 'RUNTIME_SOURCE' || cls === 'RUNTIME_CONFIG') && buf.length > 2 * 1024 * 1024) flags.push('over 2 MB: review manually');
  if (staged) { var dst = path.join(OUT, 'files', x.rel); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, buf); }
  return { path: x.rel, class: cls, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex'), staged: staged, flags: flags, needed_by: x.by.sort(), ops: x.ops.sort() }; }).sort(function (a, b) { return a.path < b.path ? -1 : 1; });

var manifest = { tool: 'trace_runtime_bridge.mjs', created: new Date().toISOString(), node: process.versions.node, platform: process.platform,
  root_name: path.basename(ROOT), programs: runs.map(function (r) { return { id: r.id, exit: r.exit, passed: r.passed, failed: r.failed, ms: r.ms }; }),
  staged: rows.filter(function (r) { return r.staged; }).length, staged_bytes: rows.filter(function (r) { return r.staged; }).reduce(function (a, r) { return a + r.bytes; }, 0),
  files: rows, still_missing: missing.sort(function (a, b) { return a.path < b.path ? -1 : 1; }), outside_root_reads: externalToRoot.map(function (x) { return { name: path.basename(x.path), by: x.by }; }) };
fs.writeFileSync(path.join(OUT, 'BRIDGE_MANIFEST.json'), JSON.stringify(manifest, null, 1));
var md = ['# MAHWORLD runtime bridge review', '', 'Created ' + manifest.created + ' with Node ' + manifest.node + ' on ' + manifest.platform + '. The archive folder was read only; writes were redirected to a temporary shadow folder.', '',
  '**Upload:** the contents of `files/` (' + manifest.staged + ' files, ' + (manifest.staged_bytes / 1024).toFixed(1) + ' KB) to the repository root on `backup/mahworld-m6-20260924T190351Z`. Nothing else.', '',
  '## Staged (public-safe runtime source/config)', '', '| file | class | bytes | needed by |', '|---|---|---:|---|'].concat(rows.filter(function (r) { return r.staged; }).map(function (r) { return '| `' + r.path + '` | ' + r.class + ' | ' + r.bytes + ' | ' + r.needed_by.slice(0, 4).join(', ') + (r.needed_by.length > 4 ? ' +' + (r.needed_by.length - 4) : '') + ' |'; }),
  ['', '## Excluded (NOT staged — review only)', '', '| file | class | why |', '|---|---|---|'], rows.filter(function (r) { return !r.staged; }).map(function (r) { return '| `' + r.path + '` | ' + r.class + ' | ' + (r.flags.join('; ') || (r.class === 'CHARACTER_RAW' ? 'Character / raw / binary source stays private' : r.class === 'EVIDENCE' ? 'generated evidence' : 'not runtime source')) + ' |'; }),
  ['', '## Still missing after the trace (' + missing.length + ')', ''], missing.map(function (m) { return '- `' + m.path + '` ← ' + m.by.slice(0, 3).join(', '); }),
  ['', '## Files read outside the archive folder (names only)', ''], manifest.outside_root_reads.map(function (x) { return '- `' + x.name + '` ← ' + x.by.slice(0, 3).join(', '); }),
  ['', '## Programs', '', '| program | exit | passed | failed |', '|---|---:|---:|---:|'], runs.map(function (r) { return '| ' + r.id + ' | ' + r.exit + ' | ' + (r.passed === null ? '' : r.passed) + ' | ' + (r.failed === null ? '' : r.failed) + ' |'; })).join('\n');
fs.writeFileSync(path.join(OUT, 'BRIDGE_REVIEW.md'), md + '\n');
try { fs.rmSync(WORK, { recursive: true, force: true }); } catch (e) { }
console.log('\nstaged ' + manifest.staged + ' files (' + (manifest.staged_bytes / 1024).toFixed(1) + ' KB) → ' + path.join(OUT, 'files') + '\nexcluded ' + rows.filter(function (r) { return !r.staged; }).length + ' · still missing ' + missing.length + '\nreview: ' + path.join(OUT, 'BRIDGE_REVIEW.md'));
