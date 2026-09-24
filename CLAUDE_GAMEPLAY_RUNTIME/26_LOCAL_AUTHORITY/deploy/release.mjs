/* MAHWORLD :: RELEASE — build the static demo, run the smoke test, then (optionally) upload to Netlify.
   node 26_LOCAL_AUTHORITY/deploy/release.mjs [--proxy-path <url from the Netlify MCP deploy-site call>] [--skip-test]
   The proxy path is minted per deploy by the Netlify MCP connector (Claude session); with `netlify login` on this machine you can instead run
   `npx netlify-cli deploy --prod --cwd 26_LOCAL_AUTHORITY/deploy/static_dist --dir . --site 968f80e5-889b-43a8-b2cd-5860c588546a`
   (cwd = the built site root, so netlify.toml and the edge-function gate are bundled; a --dir deploy from elsewhere would publish an OPEN site).
   After ANY deploy run `node 26_LOCAL_AUTHORITY/deploy/release.mjs --check <https url>`: it asserts the gate answers 401 (never 200) on the play page and on a private asset. */
import { spawnSync } from 'node:child_process'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var RUNTIME = path.resolve(HERE, '..', '..'); var argv = process.argv.slice(2);
function arg(k) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; }
var SITE = '968f80e5-889b-43a8-b2cd-5860c588546a';
function run(cmd, args, cwd) { var r = spawnSync(cmd, args, { cwd: cwd || RUNTIME, stdio: 'inherit', shell: process.platform === 'win32' }); if (r.status !== 0) { console.error('FAILED:', cmd, args.join(' ')); process.exit(r.status || 1); } }
async function assertGated(base) { /* fail closed: unauthenticated navigation -> 401 HTML password page; asset -> 401 JSON; both no-store. 503 (unconfigured) is closed too but reported. */ base = base.replace(/\/$/, ''); var play = base + '/claude_gameplay_runtime/26_local_authority/lab/play?field=1', asset = base + '/claude_gameplay_runtime/26_local_authority/lab/play.js'; var r1 = await fetch(play, { headers: { accept: 'text/html' }, redirect: 'manual' }); var t1 = await r1.text(); var r2 = await fetch(asset, { headers: { accept: '*/*' }, redirect: 'manual' }); var okPage = r1.status === 401 && /name="password"/.test(t1) && /no-store/.test(r1.headers.get('cache-control') || ''); var okAsset = r2.status === 401 && /json/.test(r2.headers.get('content-type') || ''); console.log('GATE CHECK', base, '· play', r1.status, okPage ? 'password page' : 'NOT the password page', '· asset', r2.status, r2.headers.get('content-type')); if (r1.status === 503 && r2.status === 503) { console.error('gate is CLOSED but UNCONFIGURED (503): set the MAHDEMO_* env vars, redeploy'); process.exit(5); } if (!okPage || !okAsset) { console.error('GATE CHECK FAILED: the deploy is not password-gated - roll back to the previous deploy'); process.exit(6); } }
var check = arg('--check'); if (check) { await assertGated(check); process.exit(0); }
run('node', [path.join(HERE, 'build_static_demo.mjs')]);
if (argv.indexOf('--skip-test') < 0) run('node', [path.join(HERE, 'test_static_demo.mjs')]);
var info = JSON.parse(fs.readFileSync(path.join(HERE, 'static_dist', 'BUILD_INFO.json'), 'utf8')); console.log('build', info.built, info.files, 'files');
var proxy = arg('--proxy-path');
if (proxy) run('npx', ['-y', '@netlify/mcp@latest', '--site-id', SITE, '--proxy-path', proxy], path.join(HERE, 'static_dist'));
else console.log('no --proxy-path: built + tested only (deploy with the Netlify MCP deploy-site command or netlify-cli)');
