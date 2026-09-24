/* JOB B frame-time ATTRIBUTION (desktop GPU headless Chrome with vsync — relative numbers, never a phone measurement): the same spots with
   the full world vs one client module skipped at a time (?nomod=…; the host simulation is untouched). 240 rAF deltas per spot → p50 / p95.
   node deploy/jobb/frametime_modules.mjs [configs: comma list of nomod values; default full,meadow,architecture,creatures,wildlife,terrain,forest] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var OUT = path.join(HERE, '..', 'probe_out', 'jobb', 'frametime_modules'); fs.mkdirSync(OUT, { recursive: true });
var DIST = path.join(HERE, '..', 'static_dist'); var report = { runs: [] }; var CONFIGS = (process.argv[2] || 'full,meadow,architecture,creatures,wildlife,terrain,forest').split(',');
async function one(nomod) {
  var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1280, height: 800, gpu: true, unlockFps: false });
  async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
  var out = { nomod: nomod, spots: {} };
  try {
    await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1' + (nomod === 'full' ? '' : '&nomod=' + nomod)); await waitForGame(pg, 120000); await sleep(3000); await ev("P.hud.showGuide(false); return 1;");
    for (var i = 0; i < 240; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED' || w === 'DISABLED') break; await sleep(500); }
    for (var w0 = 0; w0 < 120; w0++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(2500);
    async function sample(tag) { var r = await ev("return new Promise(function(res){ var ts=[]; var last=performance.now(); function f(){ var n=performance.now(); ts.push(n-last); last=n; if(ts.length<240) requestAnimationFrame(f); else res(ts); } requestAnimationFrame(f); });"); r.sort(function (a, b) { return a - b; }); var p = function (q) { return +r[Math.min(r.length - 1, Math.floor(q * r.length))].toFixed(1); }; var ri = await ev("var i=P.renderInfo(); var s=P.snap().play; return { calls: i.calls, tris: i.triangles || i.tris, creatures: (s.creatures||[]).length, wildlife: (s.wildlife||[]).length };"); out.spots[tag] = { p50: p(0.5), p95: p(0.95), max: p(0.999), calls: ri.calls, tris: ri.tris, creatures: ri.creatures, wildlife: ri.wildlife }; console.log(nomod, tag, JSON.stringify(out.spots[tag])); }
    await ev("return P.devPlay('PLACE', { x: -40, z: 222 });"); await sleep(2500); await sample('canal_rest');
    await ev("return P.devPlay('PLACE', { x: -96, z: 2 });"); await sleep(2500); await sample('forest_rest');
    await ev("return P.devPlay('PLACE', { x: 0, z: 150 });"); await sleep(2500); await sample('athlete_rest');
  } catch (e) { out.error = String(e && e.message || e); console.error(e); } finally { await pg.close(); srv.close(); }
  return out;
}
for (var c = 0; c < CONFIGS.length; c++) report.runs.push(await one(CONFIGS[c]));
fs.writeFileSync(path.join(OUT, 'frametime_modules.json'), JSON.stringify(report, null, 1)); console.log('RESULT frametime_modules OK');
