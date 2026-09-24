/* S09 §41 performance evidence: draw calls / triangles / frame time at the plaza wide shot, in combat, at the tree elevator; desktop 1280x720 and phone 390x844 (GPU d3d11). node deploy/probe_perf.mjs */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var srv = await serveStatic(path.join(HERE, 'static_dist'));
async function run(label, w, h) {
  var pg = await launchChrome({ width: w, height: h, gpu: true });
  try {
    await pg.goto(srv.origin + PLAY_PATH + '?field=1'); await waitForGame(pg, 90000); await sleep(2500);
    await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); return 1; })()");
    var out = {};
    async function sample(name, prep) { await pg.evaluate(prep); await sleep(4000); await pg.evaluate("window.MAHWORLD_PLAY.perfReset(); 1"); await sleep(3000); out[name] = await pg.evaluate("JSON.stringify(Object.assign({}, window.MAHWORLD_PLAY.renderInfo(), (function(p){ return { avg_ms: p.avg_ms, max_ms: p.max_ms, over_50ms: p.over_50ms, frames: p.frames }; })(window.MAHWORLD_PLAY.perf())))"); }
    await sample('plaza_wide', "window.MAHWORLD_PLAY.goTo(0,-6); window.MAHWORLD_PLAY.cam(2.2, 0.35, 34, 4.0); 1");
    await sample('combat_close', "window.MAHWORLD_PLAY.cam(0.9, 0.12, 3.8, 1.0); document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyZ',key:'z',bubbles:true})); document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyZ',key:'z',bubbles:true})); document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true})); 1");
    await sample('tree_elevator', "window.MAHWORLD_PLAY.goTo(22,34).then(function(){ window.MAHWORLD_PLAY.cam(-2.4, 0.25, 16, 4.0); }); 1");
    await sample('district_skyline', "window.MAHWORLD_PLAY.goTo(0,60).then(function(){ window.MAHWORLD_PLAY.cam(3.14, 0.12, 30, 6); }); 1");
    await sample('district_temple_close', "window.MAHWORLD_PLAY.goTo(0,125).then(function(){ window.MAHWORLD_PLAY.cam(3.14, 0.2, 40, 20); }); 1");
    console.log(label, JSON.stringify(out));
  } finally { await pg.close(); }
}
try { await run('DESKTOP 1280x720', 1280, 720); await run('PHONE 390x844', 390, 844); } finally { srv.close(); }
