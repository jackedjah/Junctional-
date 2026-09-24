/* browser shim for node:fs — the host only ever readFileSync()s a fixed set of JSON files; the build pre-bakes them into
   host_files.js keyed by site-relative path, so the synchronous reads the modules were written with keep working. */
import { FILES } from './host_files.js';
var BS = String.fromCharCode(92);
function key(p) { p = String(p).split(BS).join('/'); if (p.indexOf('file:') === 0) p = new URL(p).pathname; return p.toLowerCase(); }   /* the host lowercases URLs (Netlify pretty URLs); keys are lowercase too */
function enoent(k) { var e = new Error('ENOENT: no such file (static demo bundle): ' + k); e.code = 'ENOENT'; return e; }
export function readFileSync(p) { var k = key(p); if (!(k in FILES)) throw enoent(k); return FILES[k]; }
export function existsSync(p) { return key(p) in FILES; }
export function readdirSync() { return []; }
export function statSync(p) { if (!existsSync(p)) throw enoent(key(p)); return { isFile: function () { return true; }, isDirectory: function () { return false; }, size: FILES[key(p)].length }; }
export function mkdirSync() { }
export function writeFileSync() { throw new Error('read-only static demo'); }
export function unlinkSync() { }
export function openSync() { throw new Error('read-only static demo'); }
export default { readFileSync: readFileSync, existsSync: existsSync, readdirSync: readdirSync, statSync: statSync, mkdirSync: mkdirSync, writeFileSync: writeFileSync, unlinkSync: unlinkSync, openSync: openSync };
