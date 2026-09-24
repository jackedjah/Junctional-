/* browser shim for node:path — POSIX semantics over site-relative paths (the build mirrors the folder tree under the site root) */
var BS = String.fromCharCode(92);
function fwd(p) { return String(p).split(BS).join('/'); }
function norm(p) { var abs = p.charAt(0) === '/'; var parts = p.split('/'); var out = []; for (var i = 0; i < parts.length; i++) { var s = parts[i]; if (!s || s === '.') continue; if (s === '..') { if (out.length && out[out.length - 1] !== '..') out.pop(); else if (!abs) out.push('..'); } else out.push(s); } var r = (abs ? '/' : '') + out.join('/'); return r || (abs ? '/' : '.'); }
export function join() { var a = Array.prototype.slice.call(arguments).filter(Boolean).map(fwd).join('/'); return norm(a); }
export function resolve() { var r = ''; for (var i = arguments.length - 1; i >= 0; i--) { var s = fwd(arguments[i]); if (!s) continue; r = r ? s + '/' + r : s; if (s.charAt(0) === '/') break; } if (r.charAt(0) !== '/') r = '/' + r; return norm(r); }
export function dirname(p) { p = fwd(p); var i = p.lastIndexOf('/'); if (i < 0) return '.'; if (i === 0) return '/'; return p.slice(0, i); }
export function basename(p, ext) { p = fwd(p); var b = p.slice(p.lastIndexOf('/') + 1); if (ext && b.endsWith(ext)) b = b.slice(0, -ext.length); return b; }
export function extname(p) { var b = basename(p); var i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; }
export function isAbsolute(p) { return fwd(p).charAt(0) === '/'; }
export var sep = '/';
export var posix = { join: join, resolve: resolve, dirname: dirname, basename: basename, extname: extname, isAbsolute: isAbsolute, sep: sep };
export default { join: join, resolve: resolve, dirname: dirname, basename: basename, extname: extname, isAbsolute: isAbsolute, sep: sep, posix: posix };
