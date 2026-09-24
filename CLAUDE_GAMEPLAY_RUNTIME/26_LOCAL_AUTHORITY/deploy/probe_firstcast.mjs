/* FIRST-CAST HITCH: cold (?warm=0) vs warmed boot — per-frame times around the first SPECIAL cast (projectile + impact), 1280x720 d3d11. node deploy/probe_firstcast.mjs */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var srv = await serveStatic(path.join(HERE, 'static_dist'));
async function run(label, q) {
  var pg = await launchChrome({ width: 1280, height: 720, gpu: true });
  try {
    await pg.goto(srv.origin + PLAY_PATH + '?field=1' + q); await waitForGame(pg, 90000); await sleep(3500);
    await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); P.cam(0.9, 0.12, 3.8, 1.0); return 1; })()"); await sleep(1200);
    var warm = await pg.evaluate("JSON.stringify(window.MAHWORLD_PLAY.warm())");
    await pg.evaluate("window.__FT=[]; window.__prev=performance.now(); (function tick(){ var n=performance.now(); window.__FT.push(+(n-window.__prev).toFixed(1)); window.__prev=n; if (window.__FT.length<240) requestAnimationFrame(tick); })(); 1");
    await sleep(500);
    await pg.evaluate("['KeyZ','KeyZ','KeyE'].forEach(function(c){ document.dispatchEvent(new KeyboardEvent('keydown',{code:c,key:c.slice(3).toLowerCase(),bubbles:true})); document.dispatchEvent(new KeyboardEvent('keyup',{code:c,key:c.slice(3).toLowerCase(),bubbles:true})); }); 1");
    await sleep(3200);
    var ft = await pg.evaluate("JSON.stringify(window.__FT)"); var arr = JSON.parse(ft); var mx = Math.max.apply(null, arr); var over = arr.filter(function (x) { return x > 40; });
    var progs = await pg.evaluate("window.MAHWORLD_PLAY.renderInfo().programs"); var sd = await pg.evaluate("JSON.stringify(window.MAHWORLD_PLAY.perf().slow_list)");
    console.log(label, 'warm=' + warm, 'frames=' + arr.length, 'max_ms=' + mx, 'frames>40ms=' + JSON.stringify(over), 'programs=' + progs, 'slow=' + sd);
  } finally { await pg.close(); }
}
try { await run('COLD  (?warm=0)', '&warm=0'); await run('WARMED (default)', ''); } finally { srv.close(); }
