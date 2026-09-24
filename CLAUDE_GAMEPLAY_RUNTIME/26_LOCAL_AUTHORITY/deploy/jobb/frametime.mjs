/* JOB B frame-time comparison (desktop GPU headless Chrome — relative numbers, never a phone measurement): the same three spots with the
   world layer ON vs OFF (?world=0): plaza, the canal while wading with ripples running, the deep forest. 240 rAF deltas per spot → p50 / p95 / max.
   node deploy/jobb/frametime.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var OUT = path.join(HERE, '..', 'probe_out', 'jobb', 'frametime'); fs.mkdirSync(OUT, { recursive: true });
var DIST = path.join(HERE, '..', 'static_dist'); var report = { runs: [] };
async function one(world) {
  var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1280, height: 800, gpu: true, unlockFps: false });
  async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
  var out = { world: world, spots: {} };
  try {
    await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1' + (world ? '' : '&world=0')); await waitForGame(pg, 120000); await sleep(3000); await ev("P.hud.showGuide(false); return 1;");
    for (var i = 0; i < 240; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED' || w === 'DISABLED') break; await sleep(500); }
    for (var w0 = 0; w0 < 120; w0++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(2500);
    async function sample(tag, moving) { if (moving) await ev("P.send('MOVE', { forward: -1, strafe: 0.3, run: true, fast: true, yaw: 3.1416 }); return 1;"); var r = await ev("return new Promise(function(res){ var ts=[]; var last=performance.now(); function f(){ var n=performance.now(); ts.push(n-last); last=n; if(ts.length<240) requestAnimationFrame(f); else res(ts); } requestAnimationFrame(f); });"); if (moving) await ev("P.send('MOVE', { forward: 0, strafe: 0 }); return 1;"); r.sort(function (a, b) { return a - b; }); var p = function (q) { return +r[Math.min(r.length - 1, Math.floor(q * r.length))].toFixed(1); }; var ri = await ev("var i=P.renderInfo(); return { calls: i.calls, tris: i.triangles };"); out.spots[tag] = { p50: p(0.5), p95: p(0.95), max: +r[r.length - 1].toFixed(1), calls: ri.calls, tris: ri.tris }; console.log('world', world, tag, JSON.stringify(out.spots[tag])); }
    await ev("return P.goTo(0, -20, undefined, undefined, 40000);"); await sleep(800); await sample('plaza_rest', false);
    await ev("return P.goTo(-40, 205, undefined, undefined, 60000);"); await sleep(500); await ev("return P.goTo(-40, 222, undefined, undefined, 40000);"); await sleep(800); await sample('canal_wading_run', true);
    await ev("return P.goTo(-40, 205, undefined, undefined, 40000);"); await ev("return P.goTo(-96, 2, undefined, undefined, 60000);"); await sleep(1500); await sample('forest_rest', false);
  } catch (e) { out.error = String(e && e.message || e); console.error(e); } finally { await pg.close(); srv.close(); }
  return out;
}
report.runs.push(await one(true)); report.runs.push(await one(false));
fs.writeFileSync(path.join(OUT, 'frametime.json'), JSON.stringify(report, null, 1)); console.log('RESULT frametime OK');
