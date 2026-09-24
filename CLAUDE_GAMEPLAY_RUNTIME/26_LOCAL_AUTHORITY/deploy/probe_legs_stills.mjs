/* S13 split-leg stills: FUSED and SPLIT from the front / side / three-quarter (manual framing), plus a mid-transformation frame.
   node deploy/probe_legs_stills.mjs [tag] -> deploy/probe_out/<tag>_*.png */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true }); var tag = process.argv[2] || 'legs';
var srv = await serveStatic(path.join(HERE, 'static_dist')); var pg = await launchChrome({ width: 900, height: 900, gpu: true });
var P = function (e) { return pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + e + " })()"); };
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1' + (process.argv[3] ? '&avatar=' + process.argv[3] : '')); await waitForGame(pg, 120000); await sleep(4000); await P("P.hud.showGuide(false); P.camFollow(false); document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1;");
  console.log('avatar', await P("return P.slot().id"));
  var ry = await P("return P.mePose().root_yaw;");
  async function shots(name) { await P("P.cam(" + (Math.PI - ry) + ", 0.05, 3.2, 1.0); return 1;"); await sleep(300); await pg.screenshot(path.join(OUT, tag + '_' + name + '_front.png')); await P("P.cam(" + (Math.PI / 2 - ry) + ", 0.05, 3.2, 1.0); return 1;"); await sleep(300); await pg.screenshot(path.join(OUT, tag + '_' + name + '_side.png')); await P("P.cam(" + (Math.PI * 0.75 - ry) + ", 0.25, 3.2, 0.8); return 1;"); await sleep(300); await pg.screenshot(path.join(OUT, tag + '_' + name + '_34low.png')); }
  await shots('fused');
  await P("return P.send('TRANSFORM',{to:'SPLIT'})"); await sleep(900); await P("P.cam(" + (Math.PI * 0.75 - ry) + ", 0.25, 3.2, 0.8); return 1;"); await sleep(150); await pg.screenshot(path.join(OUT, tag + '_transition.png')); await sleep(3500);
  await shots('split');
  /* a walking frame in split form (rear three-quarter) */
  await P("return P.send('MOVE',{forward:1,strafe:0,run:false,yaw:0})"); await sleep(700); await P("P.cam(" + (-Math.PI * 0.2 - ry) + ", 0.2, 3.4, 1.0); return 1;"); await sleep(120); await pg.screenshot(path.join(OUT, tag + '_split_walk.png')); await P("return P.send('MOVE',{forward:0,strafe:0,run:false})");
  console.log('legs stills done');
} finally { await pg.close(); srv.close(); }
