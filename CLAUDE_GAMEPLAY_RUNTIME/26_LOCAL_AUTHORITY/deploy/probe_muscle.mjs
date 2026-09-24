/* MUSCLE + SEAM PROOF — explicit muscle.* controls and the seam/aura uniforms on the real GPU; close-ups of the arm/chest. */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var tag = process.argv[2] || 'm'; var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 800, height: 800, gpu: true });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(1500);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1; })()");
  console.log('muscle', await pg.evaluate("JSON.stringify(window.MAHWORLD_PLAY.muscleOf('me'))"));
  var yaw0 = await pg.evaluate("window.MAHWORLD_PLAY.mePose().root_yaw");
  await pg.evaluate("window.MAHWORLD_PLAY.cam(" + (yaw0 + Math.PI + 0.35) + ", 0.05, 1.6, 1.25)"); await sleep(400);
  await pg.evaluate("window.MAHWORLD_PLAY.holdPose('me', true)"); await sleep(200);
  await pg.screenshot(path.join(OUT, 'muscle_' + tag + '_rest.png'));
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; ['BICEPS_L','BICEPS_R','DELTOID_L','DELTOID_R','PEC_L','PEC_R','LAT_L','LAT_R','TRAP','ABS','FOREARM_L','FOREARM_R'].forEach(function(n){ P.muscleSet('me', n, 1, 30); }); return 1; })()"); await sleep(900);
  console.log('values', await pg.evaluate("JSON.stringify(window.MAHWORLD_PLAY.muscleOf('me').values)"));
  await pg.screenshot(path.join(OUT, 'muscle_' + tag + '_flexed.png'));
  await pg.evaluate("window.MAHWORLD_PLAY.seamSet('me', 1, 1)"); await sleep(300);
  await pg.evaluate("window.MAHWORLD_PLAY.cam(" + (yaw0 + Math.PI + 0.35) + ", 0.05, 3.4, 0.9)"); await sleep(300);
  await pg.screenshot(path.join(OUT, 'muscle_' + tag + '_seam.png'));
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
