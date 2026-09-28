/* In-page tuning harness (preserved from the M20 session): node CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/tools/tune_variants.mjs <outDir> --cam 'ID=x,y,z:lx,ly,lz;...' --variants v.json [--tod DAY,NIGHT] [--quality HIGH|MED|LOW]; v.json = [{id, js}] where js is evaluated against window.WP AFTER WP.time(tod) (e.g. set a uniform, then shoot) — cheaper than a code change + capture for tuning. Needs global playwright + /opt/pw-browsers/chromium (edit executablePath elsewhere). one page load, N variants (JS evaluated against window.WP), M cameras, one tod. */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';
var HERE = process.env.WPDIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../26_LOCAL_AUTHORITY/deploy/world_preview'); var LA = path.resolve(HERE, '..', '..'); var ROOT = path.resolve(LA, '..', '..'); var LAB_URL = '/CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/lab/';
var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }
var OUT = path.resolve(argv[0]); fs.mkdirSync(OUT, { recursive: true }); var SIZE = arg('--size', '960x540').split('x').map(Number); var Q = arg('--quality', 'HIGH'); var TODS = arg('--tod', 'DAY').split(',');
var cams = arg('--cam').split(';').filter(Boolean).map(function (c) { var kv = c.split('='), pl = kv[1].split(':'); return [kv[0], pl[0].split(',').map(Number), pl[1].split(',').map(Number)]; });
var variants = JSON.parse(fs.readFileSync(arg('--variants'), 'utf8'));
function mime(p) { return ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream', '.ktx2': 'image/ktx2' })[path.extname(p).toLowerCase()] || 'application/octet-stream'; }
var virt = { [LAB_URL + 'world_preview.html']: path.join(HERE, 'world_preview.html'), [LAB_URL + 'world_preview.js']: path.join(HERE, 'world_preview.js') };
var srv = http.createServer(function (req, res) { var u = decodeURIComponent(new URL(req.url, 'http://x').pathname); var f = virt[u] || path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime(f), 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res); });
await new Promise(function (ok) { srv.listen(0, '127.0.0.1', ok); });
var req = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js')); var chromium = req('playwright').chromium;
var b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
var pg = await b.newPage({ viewport: { width: SIZE[0], height: SIZE[1] }, deviceScaleFactor: 1 }); var errs = []; pg.on('console', function (m) { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); }); pg.on('pageerror', function (e) { errs.push(String(e).slice(0, 300)); });
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
await pg.goto('http://127.0.0.1:' + srv.address().port + LAB_URL + 'world_preview.html?quality=' + Q + '&sky=day', { waitUntil: 'load', timeout: 120000 });
for (var i = 0; i < 300; i++) { var st = await pg.evaluate(function () { return window.WP ? window.WP.state() : null; }); if (st && (st.error || (st.world && st.world.status === 'READY'))) break; await sleep(1000); }
await pg.evaluate(function () { return window.WP.prewarm(); });
for (var tod of TODS) { await pg.evaluate(function (t) { return window.WP.time(t); }, tod); await sleep(800);
  for (var v of variants) { var r = await pg.evaluate(function (js) { try { return eval(js); } catch (e) { return 'ERR ' + e; } }, v.js || '0'); console.log('variant', v.id, JSON.stringify(r));
    for (var c of cams) { await pg.evaluate(function (a) { window.WP.view(a[0], a[1]); window.WP.tag(''); window.WP.clock(40); return 1; }, [c[1], c[2]]); await sleep(+arg('--settle', '1800')); await pg.evaluate(function () { return window.WP.clock(40); });
      await pg.screenshot({ path: path.join(OUT, c[0] + '_' + tod + '_' + v.id + '.jpg'), type: 'jpeg', quality: 84, timeout: 180000 }); console.log('shot', c[0], tod, v.id); } } }
console.log('errors', JSON.stringify(errs.slice(0, 5))); await b.close(); srv.close();
