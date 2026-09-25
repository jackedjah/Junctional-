/* MAHWORLD :: SECTION 2 PACKAGING — the complete, full ZIP of the flat Netlify root for a code-changing pass (never a patch).
   Order is the brief's, and every stage must pass before the next runs:
     1. all tests (16_TESTS/*.test.mjs, each in its own node process)
     2. JS syntax sweep (node --check on every .js / .mjs in the static root)
     3. CSS parse sweep (every .css file and every <style> block: balanced braces, terminated strings and comments, no empty selectors)
     4. runtime / cache stamps (BUILD_INFO.json carries built + commit + pass; netlify.toml carries the cache + gate rules)
     5. protected backend boundaries (the static root holds no server stores, tests, evidence, env files, tokens or DEV_DATA_ONLY data; the
        edge gate is the only function; the runtime never imports outside the four whitelisted trees)
     6. secret scan (token / key / password-assignment patterns; the demo password value is NEVER known to this script — it scans by shape)
     7. ZIP (bsdtar, deflate) → integrity test (listing + entry count + size) → extraction to a FRESH folder → static smoke test rerun from the
        extraction (deploy/test_static_demo.mjs <extracted root>) → SHA-256 of the archive.
   Output: deploy/packages/<label>.zip + <label>.PACKAGE.json (the evidence record). Exit 1 at the first failed stage — a package that did not
   survive the fresh-extraction test is not complete.
       node 26_LOCAL_AUTHORITY/deploy/package_pass.mjs <label> [--skip-build]      (from CLAUDE_GAMEPLAY_RUNTIME) */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var RT = path.resolve(HERE, '..', '..'); var REPO = path.resolve(RT, '..'); var DIST = path.join(HERE, 'static_dist'); var PKG = path.join(HERE, 'packages');
var label = process.argv[2]; if (!label || /[^A-Za-z0-9_.-]/.test(label)) { console.error('usage: node deploy/package_pass.mjs <label> [--skip-build]   (label: letters, digits, _ . -)'); process.exit(2); }
var skipBuild = process.argv.indexOf('--skip-build') >= 0; var TAR = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
var R = { label: label, started: new Date().toISOString(), stages: [] }; function stage(name, ok, detail) { R.stages.push({ stage: name, ok: !!ok, detail: detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail && typeof detail === 'string' ? ' — ' + detail : '')); if (!ok) { R.finished = new Date().toISOString(); R.complete = false; fs.mkdirSync(PKG, { recursive: true }); fs.writeFileSync(path.join(PKG, label + '.PACKAGE.json'), JSON.stringify(R, null, 1)); console.log('PACKAGE INCOMPLETE — stopped at: ' + name); process.exit(1); } }
function run(cmd, args, cwd, timeoutMs) { var r = spawnSync(cmd, args, { cwd: cwd || RT, encoding: 'utf8', timeout: timeoutMs || 600000, maxBuffer: 64 * 1024 * 1024, shell: false }); return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), signal: r.signal }; }
function walk(dir, list) { list = list || []; fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) { var p = path.join(dir, d.name); if (d.isDirectory()) walk(p, list); else list.push(p); }); return list; }
function git(args) { var r = run('git', args, REPO, 20000); return r.code === 0 ? r.out.trim() : null; }

/* 0. build the static root (unless told the current one is the candidate) */
if (!skipBuild) { var b = run(process.execPath, [path.join(HERE, 'build_static_demo.mjs')], RT); stage('0 static build', b.code === 0 && /private-content scan clean/.test(b.out), b.out.trim().split('\n').pop()); }
else stage('0 static build', fs.existsSync(path.join(DIST, 'index.html')), 'skipped (--skip-build): existing static_dist is the candidate');

/* 1. all tests, one node process each */
var tests = fs.readdirSync(path.join(RT, '16_TESTS')).filter(function (f) { return /\.test\.mjs$/.test(f); }).sort(); var testRes = [];
tests.forEach(function (t) { var r = run(process.execPath, [path.join('16_TESTS', t)], RT, 600000); var last = r.out.trim().split('\n').filter(Boolean).pop() || ''; var m = /(\d+) passed, (\d+) failed/.exec(r.out); testRes.push({ test: t, code: r.code, passed: m ? +m[1] : null, failed: m ? +m[2] : null, last: last.slice(0, 160) }); console.log('   ' + (r.code === 0 ? 'ok   ' : 'FAIL ') + t + ' — ' + last.slice(0, 120)); });
stage('1 all tests', testRes.every(function (x) { return x.code === 0 && x.failed === 0; }), testRes.length + ' files, ' + testRes.reduce(function (a, x) { return a + (x.passed || 0); }, 0) + ' checks passed, ' + testRes.filter(function (x) { return x.code !== 0 || x.failed; }).length + ' files failing'); R.tests = testRes;

/* 2. JS syntax sweep over the static root */
var files = walk(DIST); var js = files.filter(function (f) { return /\.(m?js)$/.test(f); }); var jsBad = [];
js.forEach(function (f) { var r = run(process.execPath, ['--check', f], RT, 60000); if (r.code !== 0) jsBad.push(path.relative(DIST, f) + ': ' + r.out.trim().split('\n')[0]); });
stage('2 JS syntax sweep', jsBad.length === 0, js.length + ' files' + (jsBad.length ? '; bad: ' + jsBad.join(' | ') : ''));

/* 3. CSS parse sweep: .css files + <style> blocks */
function cssCheck(src, where) { var problems = []; var depth = 0, i = 0, n = src.length, line = 1; while (i < n) { var c = src[i]; if (c === '\n') line++; if (c === '/' && src[i + 1] === '*') { var e = src.indexOf('*/', i + 2); if (e < 0) { problems.push(where + ':' + line + ' unterminated comment'); break; } line += (src.slice(i, e).match(/\n/g) || []).length; i = e + 2; continue; } if (c === '"' || c === "'") { var j = i + 1; while (j < n && src[j] !== c) { if (src[j] === '\\') j++; if (src[j] === '\n') { problems.push(where + ':' + line + ' unterminated string'); break; } j++; } i = j + 1; continue; } if (c === '{') { depth++; var head = src.slice(Math.max(0, src.lastIndexOf('}', i) + 1), i).replace(/\/\*[\s\S]*?\*\//g, '').trim(); if (depth === 1 && head === '') problems.push(where + ':' + line + ' empty selector before {'); } else if (c === '}') { depth--; if (depth < 0) { problems.push(where + ':' + line + ' stray }'); depth = 0; } } i++; } if (depth !== 0) problems.push(where + ' unbalanced braces (' + depth + ' open at end)'); return problems; }
var cssProblems = [], cssCount = 0; files.filter(function (f) { return /\.css$/.test(f); }).forEach(function (f) { cssCount++; cssProblems = cssProblems.concat(cssCheck(fs.readFileSync(f, 'utf8'), path.relative(DIST, f))); });
files.filter(function (f) { return /\.html$/.test(f); }).forEach(function (f) { var h = fs.readFileSync(f, 'utf8'); var re = /<style[^>]*>([\s\S]*?)<\/style>/gi, m; while ((m = re.exec(h))) { cssCount++; cssProblems = cssProblems.concat(cssCheck(m[1], path.relative(DIST, f) + '<style>')); } });
/* runtime CSS injected from JS (Control Lab, HUD) is swept too: every textContent = '...' string that looks like a stylesheet */
js.forEach(function (f) { var s = fs.readFileSync(f, 'utf8'); var re = /textContent = '((?:[^'\\]|\\.)*\{[^']*)'/g, m; while ((m = re.exec(s))) { if (/[#.][a-zA-Z][^{]*\{[^}]*:/.test(m[1])) { cssCount++; cssProblems = cssProblems.concat(cssCheck(m[1].replace(/\\'/g, "'"), path.relative(DIST, f) + ' (injected css)')); } } });
stage('3 CSS parse sweep', cssProblems.length === 0, cssCount + ' stylesheets / blocks' + (cssProblems.length ? '; ' + cssProblems.join(' | ') : ''));

/* 4. runtime / cache stamps */
var infoP = path.join(DIST, 'BUILD_INFO.json'); var info = fs.existsSync(infoP) ? JSON.parse(fs.readFileSync(infoP, 'utf8')) : null; var declaredCommit = process.env.MAHWORLD_RELEASE_COMMIT; if (declaredCommit && !/^[0-9a-f]{40}$/i.test(declaredCommit)) { console.error('MAHWORLD_RELEASE_COMMIT must be an exact 40-character Git commit'); process.exit(2); } var commit = declaredCommit || git(['rev-parse', '--short', 'HEAD']); var dirty = git(['status', '--porcelain', '--', 'CLAUDE_GAMEPLAY_RUNTIME']);
if (info) { info.commit = commit; info.pass = label; info.package_stamp = new Date().toISOString(); info.worktree_clean = dirty === ''; fs.writeFileSync(infoP, JSON.stringify(info, null, 1)); }
var toml = fs.existsSync(path.join(DIST, 'netlify.toml')) ? fs.readFileSync(path.join(DIST, 'netlify.toml'), 'utf8') : '';
stage('4 runtime / cache stamps', !!info && !!info.built && /Cache-Control/.test(toml) && /function = "gate"/.test(toml), info ? 'built ' + info.built + ' · commit ' + commit + (dirty === '' ? ' (clean)' : ' (WORKTREE DIRTY: ' + (dirty || '').split('\n').length + ' paths)') + ' · netlify.toml cache + gate rules present' : 'BUILD_INFO.json missing'); R.stamp = info;

/* 5. protected backend boundaries */
var rel = files.map(function (f) { return path.relative(DIST, f).replace(/\\/g, '/'); });
var forbidden = rel.filter(function (p) { return /(^|\/)(16_TESTS|evidence|DEV_DATA_ONLY|checkpoints|node_modules|\.git)(\/|$)/.test(p) || /\.(env|sqlite|db|log|zip|py|bak_\w+)$/.test(p) || /(^|\/)\.env/.test(p) || /secret|password/i.test(path.basename(p)); });
var funcs = rel.filter(function (p) { return /^netlify\//.test(p); }); var topLevel = fs.readdirSync(DIST).filter(function (d) { return fs.statSync(path.join(DIST, d)).isDirectory(); });
var allowedTop = ['CLAUDE_GAMEPLAY_RUNTIME', 'CLAUDE_RUNTIME_FOUNDATION', 'CLAUDE_GAMEPLAY_FOUNDATION', 'CLAUDE_DUAL_LOCOMOTION', 'vendor', 'netlify']; var strayTop = topLevel.filter(function (d) { return allowedTop.indexOf(d) < 0; });
var importBad = []; js.forEach(function (f) { var s = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''); var re = /(?:^|[;}\s])import\s+(?:[\w$*{},\s]+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g, m; while ((m = re.exec(s))) { var spec = m[1] || m[2]; if (/^(https?:)?\/\//.test(spec)) importBad.push(path.relative(DIST, f) + ' → ' + spec); } });   /* real import statements only (comments stripped): the runtime must load nothing from a remote origin */
stage('5 protected backend boundaries', forbidden.length === 0 && funcs.length === 1 && /gate\.js$/.test(funcs[0]) && strayTop.length === 0 && importBad.length === 0, 'top-level ' + topLevel.join(', ') + ' · functions: ' + funcs.join(', ') + (forbidden.length ? ' · FORBIDDEN: ' + forbidden.slice(0, 8).join(', ') : '') + (strayTop.length ? ' · STRAY: ' + strayTop.join(', ') : '') + (importBad.length ? ' · REMOTE IMPORTS: ' + importBad.join(', ') : ''));

/* 6. secret scan (by shape; the password value is never known here) */
var SECRET = [/nfp_[A-Za-z0-9]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /sk_(live|test)_[A-Za-z0-9]{10,}/, /AKIA[0-9A-Z]{16}/, /ghp_[A-Za-z0-9]{30,}/, /xox[bap]-[A-Za-z0-9-]{10,}/, /MAHWORLD_DEMO_PASSWORD\s*[:=]\s*['"][^'"]+['"]/, /NETLIFY_AUTH_TOKEN\s*[:=]\s*['"][^'"]+['"]/, /(password|passwd|pwd)\s*[:=]\s*['"][^'"]{6,}['"]/i, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/];
var hits = []; files.filter(function (f) { return /\.(m?js|json|html|toml|txt|md|css)$/.test(f); }).forEach(function (f) { var s = fs.readFileSync(f, 'utf8'); SECRET.forEach(function (re) { var m = re.exec(s); if (m) hits.push(path.relative(DIST, f) + ': ' + re.source.slice(0, 30) + ' @' + m.index); }); });
stage('6 secret scan', hits.length === 0, files.length + ' files scanned' + (hits.length ? '; HITS: ' + hits.join(' | ') : ''));

/* 7. ZIP → integrity → fresh extraction → smoke test from the extraction → SHA-256 */
fs.mkdirSync(PKG, { recursive: true }); var zipP = path.join(PKG, label + '.zip'); if (fs.existsSync(zipP)) fs.unlinkSync(zipP);
var z = run(TAR, ['-a', '-cf', zipP, '-C', DIST, '.'], RT, 600000); stage('7a ZIP written', z.code === 0 && fs.existsSync(zipP) && fs.statSync(zipP).size > 1e6, zipP + ' ' + (fs.existsSync(zipP) ? (fs.statSync(zipP).size / 1048576).toFixed(1) + ' MB' : z.out.slice(0, 200)));
var lst = run(TAR, ['-tf', zipP], RT, 300000); var entries = lst.out.split('\n').map(function (l) { return l.trim().replace(/^\.\//, ''); }).filter(function (l) { return l && !/\/$/.test(l); });
var missing = rel.filter(function (p) { return entries.indexOf(p) < 0; }); stage('7b ZIP integrity (listing)', lst.code === 0 && missing.length === 0 && entries.length === rel.length, entries.length + ' entries = ' + rel.length + ' files' + (missing.length ? '; MISSING: ' + missing.slice(0, 6).join(', ') : ''));
var FRESH = fs.mkdtempSync(path.join(PKG, 'fresh_' + label + '_')); var x = run(TAR, ['-xf', zipP, '-C', FRESH], RT, 600000); var extracted = walk(FRESH).map(function (f) { return path.relative(FRESH, f).replace(/\\/g, '/'); });
var sizeBad = rel.filter(function (p) { var a = fs.statSync(path.join(DIST, p)).size, b = fs.existsSync(path.join(FRESH, p)) ? fs.statSync(path.join(FRESH, p)).size : -1; return a !== b; });
stage('7c fresh extraction', x.code === 0 && extracted.length === rel.length && sizeBad.length === 0, FRESH + ' · ' + extracted.length + ' files, byte sizes match' + (sizeBad.length ? '; MISMATCH: ' + sizeBad.slice(0, 6).join(', ') : ''));
var smoke = run(process.execPath, [path.join(HERE, 'test_static_demo.mjs'), FRESH], RT, 600000); var smokeLast = smoke.out.trim().split('\n').filter(Boolean).slice(-3).join(' | ');
stage('7d smoke test from the extraction', smoke.code === 0 && /PASS/.test(smoke.out) && !/FAIL/.test(smoke.out), smokeLast.slice(0, 400));
var jsBad2 = []; extracted.filter(function (p) { return /\.m?js$/.test(p); }).forEach(function (p) { var r = run(process.execPath, ['--check', path.join(FRESH, p)], RT, 60000); if (r.code !== 0) jsBad2.push(p); });
stage('7e JS syntax sweep from the extraction', jsBad2.length === 0, jsBad2.length ? 'bad: ' + jsBad2.join(', ') : 'clean');
var sha = crypto.createHash('sha256').update(fs.readFileSync(zipP)).digest('hex'); R.zip = { path: zipP, bytes: fs.statSync(zipP).size, sha256: sha, entries: entries.length, fresh_folder: FRESH };
fs.rmSync(FRESH, { recursive: true, force: true }); R.finished = new Date().toISOString(); R.complete = true; fs.writeFileSync(path.join(PKG, label + '.PACKAGE.json'), JSON.stringify(R, null, 1));
console.log('\nPACKAGE COMPLETE\n  zip      ' + zipP + '\n  bytes    ' + R.zip.bytes + '\n  sha256   ' + sha + '\n  entries  ' + entries.length + '\n  record   ' + path.join(PKG, label + '.PACKAGE.json'));
