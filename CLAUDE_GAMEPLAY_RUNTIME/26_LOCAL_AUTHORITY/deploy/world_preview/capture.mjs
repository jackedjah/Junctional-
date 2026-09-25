/* MAHWORLD :: WORLD PREVIEW CAPTURE (dev only). Serves the repository root on 127.0.0.1 with the preview page mounted at
   lab/world_preview.html, opens it in headless Chromium (software WebGL is fine for stills) and writes one JPEG per fixed viewpoint plus a
   JSON report (world status, renderer counters, per-view timing). The viewpoints are FIXED so every world-pivot pass compares like with like.
   node deploy/world_preview/capture.mjs <outDir> [--views V01,V08] [--tod DAY|NIGHT|BOTH] [--quality HIGH|MED|LOW] [--size 1280x720] [--settle 2500]
   Needs Playwright (global) and a Chromium: PLAYWRIGHT_CHROMIUM or /opt/pw-browsers/chromium. Never used by the game or the package. */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var LA = path.resolve(HERE, '..', '..'); var ROOT = path.resolve(LA, '..', '..');
var LAB_URL = '/CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/lab/';
var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }
var OUT = path.resolve(argv[0] && argv[0].indexOf('--') !== 0 ? argv[0] : path.join(HERE, 'out')); fs.mkdirSync(OUT, { recursive: true });
var SIZE = arg('--size', '1280x720').split('x').map(Number); var MAPS = argv.indexOf('--map') >= 0; var QUALITY = arg('--quality', 'HIGH'); var TOD = arg('--tod', 'DAY'); var SETTLE = +arg('--settle', '2500');

/* FIXED viewpoints: [id, label, camera position, look-at]. World axes: +z north (temple / market), +x east (tower), HALO tree at (30, 40). */
export var VIEWS = [
  ['V01', 'plaza hub toward the temple causeway', [0, 7, -30], [0, 6, 60]],
  ['V02', 'world overview from the south', [0, 170, -270], [0, 0, 70]],
  ['V03', 'ATHLETE gold temple forecourt', [0, 8, 122], [0, 14, 178]],
  ['V04', 'TITAN blue tower and gate', [58, 10, 104], [112, 20, 110]],
  ['V05', 'LEAN crimson canyon corridor', [-86, 11, 138], [-112, 12, 210]],
  ['V06', 'VISIONARY purple highland overlook', [-96, 14, -8], [-150, 12, 0]],
  ['V07', 'BAGE pink market and basins', [0, 9, 212], [0, 8, 258]],
  ['V08', 'HALO deck arrival court', [80, 251, 40], [51, 240.5, 40]],
  ['V09', 'HALO dome from the ground', [-130, 22, -150], [30, 230, 40]],
  ['V10', 'sky toward the Sun', [0, 3, 0], [260, 150, 140]],
  ['V11', 'south coast horizon', [0, 7, -140], [0, 4, -300]],
  ['V12', 'view back over MAHWORLD from the HALO rim', [30, 247, 184], [20, 40, 520]],
  ['V13', 'plaza street level toward the tree elevator', [-10, 3.2, -14], [30, 10, 40]],
  ['V14', 'HALO glass sky-walk looking down', [30, 243, 172], [30, 0, 262]],
  ['V15', 'civic facade close (Mentor Spire)', [6, 2.6, -9], [24, 7, 0]]
];

function mime(p) { return ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.bin': 'application/octet-stream', '.ktx2': 'image/ktx2' })[path.extname(p).toLowerCase()] || 'application/octet-stream'; }
function serve() {
  var virt = { [LAB_URL + 'world_preview.html']: path.join(HERE, 'world_preview.html'), [LAB_URL + 'world_preview.js']: path.join(HERE, 'world_preview.js') };
  var srv = http.createServer(function (req, res) {
    var u = decodeURIComponent(new URL(req.url, 'http://x').pathname); var file = virt[u] || path.join(ROOT, u);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('404 ' + u); return; }
    res.writeHead(200, { 'content-type': mime(file), 'cache-control': 'no-store' }); fs.createReadStream(file).pipe(res);
  });
  return new Promise(function (ok) { srv.listen(0, '127.0.0.1', function () { ok(srv); }); });
}
function chromium() { var req = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js')); return req('playwright').chromium; }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var want = arg('--views', null); var views = VIEWS.filter(function (v) { return !want || want.split(',').indexOf(v[0]) >= 0; });
  var tods = TOD === 'BOTH' ? ['DAY', 'NIGHT'] : [TOD];
  var srv = await serve(); var origin = 'http://127.0.0.1:' + srv.address().port;
  var browser = await chromium().launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  var page = await browser.newPage({ viewport: { width: SIZE[0], height: SIZE[1] }, deviceScaleFactor: 1 });
  var consoleErrors = []; page.on('console', function (m) { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); }); page.on('pageerror', function (e) { consoleErrors.push('pageerror: ' + String(e).slice(0, 300)); }); page.on('response', function (r) { if (r.status() >= 400) consoleErrors.push('HTTP ' + r.status() + ' ' + r.url().replace(/^https?:\/\/[^/]+/, '')); });
  var report = { started: new Date().toISOString(), size: SIZE, quality: QUALITY, settle_ms: SETTLE, views: [], console_errors: consoleErrors };
  try {
    await page.goto(origin + LAB_URL + 'world_preview.html?quality=' + QUALITY + '&sky=day', { waitUntil: 'load', timeout: 120000 });
    var st = null; for (var i = 0; i < 240; i++) { st = await page.evaluate(function () { return window.WP ? window.WP.state() : null; }); if (st && (st.error || (st.world && (st.world.status === 'READY' || st.world.status === 'FAILED')))) break; await sleep(1000); }
    report.ready = st; console.log('state', JSON.stringify(st).slice(0, 400));
    report.prewarm = await page.evaluate(function () { return window.WP.prewarm(); });
    for (var ti = 0; ti < tods.length; ti++) {
      await page.evaluate(function (t) { return window.WP.time(t); }, tods[ti]); await sleep(800);
      for (var vi = 0; vi < views.length; vi++) {
        var v = views[vi]; var t0 = Date.now();
        await page.evaluate(function (a) { window.WP.view(a[0], a[1]); window.WP.tag(''); return 1; }, [v[2], v[3]]); await sleep(SETTLE);
        var f0 = await page.evaluate(function () { return window.WP.state().frames; }); await sleep(600); var f1 = await page.evaluate(function () { return window.WP.state().frames; });
        var file = v[0] + '_' + tods[ti] + '.jpg'; await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 84 });
        var stats = await page.evaluate(function () { return window.WP.stats(); });
        report.views.push({ id: v[0], label: v[1], tod: tods[ti], file: file, pos: v[2], look: v[3], stats: stats, frames_in_600ms: f1 - f0, ms: Date.now() - t0 });
        console.log(v[0], tods[ti], JSON.stringify(stats));
      }
    }
  } catch (e) { report.error = String(e && e.stack || e); console.log('ERROR', report.error); }
  if (MAPS) { try { for (var ms of [[390, 430, 'MAP_phone.png'], [720, 640, 'MAP_desktop.png']]) { var du = await page.evaluate(function (a) { return window.WP.map(a[0], a[1], { x: 0, z: -20, heading: 0.3 }); }, ms); if (du) { fs.writeFileSync(path.join(OUT, ms[2]), Buffer.from(du.split(',')[1], 'base64')); report.maps = (report.maps || []).concat(ms[2]); } } } catch (e) { report.map_error = String(e && e.stack || e); } }
  report.finished = new Date().toISOString(); report.final_state = await page.evaluate(function () { return window.WP ? window.WP.state() : null; }).catch(function () { return null; });
  fs.writeFileSync(path.join(OUT, 'capture_report.json'), JSON.stringify(report, null, 1));
  console.log('console errors', consoleErrors.length); await browser.close(); srv.close();
}
