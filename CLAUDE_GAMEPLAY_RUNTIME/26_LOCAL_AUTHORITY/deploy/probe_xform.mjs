/* TRANSFORMATION FILMSTRIP — real GPU, HUD hidden, front-left camera on the whole body; 14 frames across the SPLIT transform, then hover/fly. */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var tag = process.argv[2] || 'x'; var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 700, height: 900, gpu: true });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(1500);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1; })()");
  var yaw0 = await pg.evaluate("window.MAHWORLD_PLAY.mePose().root_yaw");
  await pg.evaluate("window.MAHWORLD_PLAY.cam(" + (yaw0 + Math.PI + 0.6) + ", 0.08, 3.0, 0.9)"); await sleep(400);
  await pg.evaluate('window.MAHWORLD_PLAY.send("TRANSFORM",{to:"SPLIT"})');
  for (var i = 0; i < 14; i++) { await pg.screenshot(path.join(OUT, 'xf_' + tag + '_' + String(i).padStart(2, '0') + '.png')); await sleep(220); }
  await pg.evaluate('window.MAHWORLD_PLAY.send("FLIGHT",{on:true})').catch(function(){}); await sleep(1500);
  await pg.screenshot(path.join(OUT, 'xf_' + tag + '_fly.png'));
  console.log('form', await pg.evaluate("JSON.stringify(window.MAHWORLD_PLAY.formOf('me'))"), 'errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
