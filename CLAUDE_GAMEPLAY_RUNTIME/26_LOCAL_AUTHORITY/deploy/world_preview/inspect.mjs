/* MAHWORLD :: WORLD PREVIEW INSPECT (dev only). Loads the preview page (same server/mount as capture.mjs), waits for READY, then evaluates
   one expression against window.WP and prints the JSON result — scene-graph questions answered from the real client world.
   node deploy/world_preview/inspect.mjs "<js expression using WP>" [--quality HIGH] [--tod DAY|NIGHT]
   e.g. node deploy/world_preview/inspect.mjs "WP.find(/COAST|GROUND|HAZE/)" */
import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module'; import { execSync } from 'node:child_process'; import http from 'node:http'; import fs from 'node:fs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var ROOT = path.resolve(HERE, '..', '..', '..', '..'); var LAB_URL = '/CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/lab/';
var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; } var EXPR = argv[0];
function mime(p) { return ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png' })[path.extname(p).toLowerCase()] || 'application/octet-stream'; }
var virt = { [LAB_URL + 'world_preview.html']: path.join(HERE, 'world_preview.html'), [LAB_URL + 'world_preview.js']: path.join(HERE, 'world_preview.js') };
var srv = http.createServer(function (req, res) { var u = decodeURIComponent(new URL(req.url, 'http://x').pathname); var f = virt[u] || path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime(f) }); fs.createReadStream(f).pipe(res); });
await new Promise(function (ok) { srv.listen(0, '127.0.0.1', ok); });
var req = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js')); var chromium = req('playwright').chromium;
var b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
var pg = await b.newPage({ viewport: { width: 640, height: 360 } });
await pg.goto('http://127.0.0.1:' + srv.address().port + LAB_URL + 'world_preview.html?quality=' + arg('--quality', 'HIGH'), { waitUntil: 'load', timeout: 120000 });
for (var i = 0; i < 240; i++) { var st = await pg.evaluate(function () { return window.WP ? window.WP.state() : null; }); if (st && (st.error || (st.world && st.world.status === 'READY'))) break; await new Promise(function (r) { setTimeout(r, 1000); }); }
if (arg('--tod', null)) await pg.evaluate(function (t) { return window.WP.time(t); }, arg('--tod', null));
await pg.evaluate(function () {   /* a generic scene-graph finder: name regex → world-space bounds, visibility, material summary */
  window.WP.find = function (re) { var T = window.WP.THREE, out = []; window.WP.scene.traverse(function (o) { if (!o.name || !re.test(o.name)) return; var bx = new T.Box3().setFromObject(o); var m = o.material; out.push({ name: o.name, type: o.type, visible: o.visible, min: bx.isEmpty() ? null : bx.min.toArray().map(function (v) { return +v.toFixed(1); }), max: bx.isEmpty() ? null : bx.max.toArray().map(function (v) { return +v.toFixed(1); }), y: +o.position.y.toFixed(3), mat: m && !Array.isArray(m) ? { type: m.type, color: m.color ? '#' + m.color.getHexString() : null, transparent: m.transparent, opacity: m.opacity, metalness: m.metalness, roughness: m.roughness } : null }); }); return out; };
});
var out = await pg.evaluate(function (e) { try { return JSON.parse(JSON.stringify(eval(e))); } catch (x) { return { error: String(x) }; } }, EXPR);
console.log(JSON.stringify(out, null, 1)); await b.close(); srv.close();
