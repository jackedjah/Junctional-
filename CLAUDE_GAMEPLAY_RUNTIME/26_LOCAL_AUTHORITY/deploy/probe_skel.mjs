/* SKELETON OVERLAY — bind-ish idle pose with the SkeletonHelper drawn over the body: front / side / 3-4, plus a raised-arm pose (DOUBLE_BICEPS). */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var tag = process.argv[2] || 's'; var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 700, height: 1000, gpu: true });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(1500);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); P.skeletonHelper(true); return 1; })()");
  var yaw0 = await pg.evaluate("window.MAHWORLD_PLAY.mePose().root_yaw"); var views = { front: 0, side: Math.PI * 0.5, q34: Math.PI * 0.3, rear34: Math.PI * 0.75 };
  await pg.evaluate('window.MAHWORLD_PLAY.send("TRANSFORM",{to:"SPLIT"})'); await sleep(3200); for (var v in views) { await pg.evaluate("window.MAHWORLD_PLAY.cam(" + (yaw0 + Math.PI + views[v]) + ", 0.0, 3.6, 0.95)"); await sleep(350); await pg.screenshot(path.join(OUT, 'skel_' + tag + '_' + v + '.png')); } await pg.evaluate('window.MAHWORLD_PLAY.send("TRANSFORM",{to:"FUSED"})'); await sleep(3200);
  var emo = process.argv[3] || 'DOUBLE_BICEPS'; console.log('emote', JSON.stringify(await pg.evaluate('window.MAHWORLD_PLAY.send("EMOTE",{emote_id:"' + emo + '"})')).slice(0, 120)); await sleep(1350);
  for (var v2 of ['front', 'q34']) { await pg.evaluate("window.MAHWORLD_PLAY.cam(" + (yaw0 + Math.PI + views[v2]) + ", 0.0, 3.0, 1.15)"); await sleep(250); await pg.screenshot(path.join(OUT, 'skel_' + tag + '_biceps_' + v2 + '.png')); }
  console.log('muscle', await pg.evaluate("JSON.stringify(window.MAHWORLD_PLAY.muscleOf('me').values)"));
  await pg.evaluate("window.MAHWORLD_PLAY.skeletonHelper(false)"); await sleep(200);
  for (var v3 of ['front', 'q34', 'side']) { await pg.evaluate("window.MAHWORLD_PLAY.cam(" + (yaw0 + Math.PI + views[v3]) + ", 0.0, 3.0, 1.15)"); await sleep(250); await pg.screenshot(path.join(OUT, 'flex_' + tag + '_biceps_' + v3 + '.png')); }
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
