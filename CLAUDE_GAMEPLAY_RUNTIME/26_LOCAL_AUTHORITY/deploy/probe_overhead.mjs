/* OVERHEAD INSPECTION (S10 §9): both arms at 120/150/165° in the frontal plane (abduction) and the sagittal plane (flexion), front / side / rear, HUD hidden. node deploy/probe_overhead.mjs [tag] */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var tag = process.argv[2] || 'oh'; var srv = await serveStatic(path.join(HERE, 'static_dist')); var pg = await launchChrome({ width: 640, height: 760, gpu: true });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1' + (process.argv[3] ? '&avatar=' + process.argv[3] : '')); await waitForGame(pg, 90000); await sleep(1800);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); P.goTo(-3,-13,-3,-8); return 1; })()"); await sleep(1500);
  var yaw0 = await pg.evaluate("window.MAHWORLD_PLAY.mePose().root_yaw");
  var planes = { abd: function (r) { return { UPPERARM_L: [-0.05, 0, -r], UPPERARM_R: [-0.05, 0, r], FOREARM_L: [-0.1, 0, 0], FOREARM_R: [-0.1, 0, 0] }; }, flex: function (r) { return { UPPERARM_L: [-r, 0, -0.25], UPPERARM_R: [-r, 0, 0.25], FOREARM_L: [-0.1, 0, 0], FOREARM_R: [-0.1, 0, 0] }; } };
  for (var pl in planes) for (var deg of (process.argv[4] ? process.argv[4].split(',').map(Number) : [120, 150, 165])) {
    var r = deg * Math.PI / 180; await pg.evaluate("window.MAHWORLD_PLAY.poseOverride('me', " + JSON.stringify(planes[pl](r)) + ")"); await sleep(700);
    var views = { front: yaw0 + Math.PI, front34: yaw0 + Math.PI - 0.6, side: yaw0 + Math.PI / 2, rear: yaw0 };
    for (var v in views) { await pg.evaluate("window.MAHWORLD_PLAY.cam(" + views[v] + ", 0.02, 1.9, 1.25)"); await sleep(350); await pg.screenshot(path.join(OUT, 'oh_' + tag + '_' + pl + deg + '_' + v + '.png')); }
  }
  await pg.evaluate("window.MAHWORLD_PLAY.poseOverride('me', null)");
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
