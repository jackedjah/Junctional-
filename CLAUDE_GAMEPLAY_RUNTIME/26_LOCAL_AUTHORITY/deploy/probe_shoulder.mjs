/* SHOULDER PROBE — hold the pose, raise the left arm to 15/45/90/135° abduction (UPPERARM z) with the clavicle rhythm, close-up of the armpit/deltoid from front and rear-3/4. */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var tag = process.argv[2] || 'sh'; var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 700, height: 700, gpu: true });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(1500);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1; })()"); await sleep(300);
  var yaw0 = await pg.evaluate("window.MAHWORLD_PLAY.mePose().root_yaw");
  for (var deg of [0, 45, 90, 120, 150, 170]) {
    var z = -deg * Math.PI / 180; var clav = Math.max(0, (deg - 30) / 2) * Math.PI / 180;   /* scapulohumeral rhythm: 1° clavicle per 2° past 30° */
    await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.poseOverride('me', { UPPERARM_L: [-0.05, 0, " + z + "], FOREARM_L: [-0.1, 0, 0] }); return 1; })()"); await sleep(450);   /* through the animator: girdle rhythm + twist + correctives apply */
    await pg.evaluate("window.MAHWORLD_PLAY.cam(" + (yaw0 + Math.PI - 0.55) + ", 0.05, 1.35, 1.35)"); await sleep(300); await pg.screenshot(path.join(OUT, 'sh_' + tag + '_' + deg + '_front.png'));
    await pg.evaluate("window.MAHWORLD_PLAY.cam(" + (yaw0 - 0.7) + ", 0.05, 1.35, 1.35)"); await sleep(300); await pg.screenshot(path.join(OUT, 'sh_' + tag + '_' + deg + '_rear.png'));
  }
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
