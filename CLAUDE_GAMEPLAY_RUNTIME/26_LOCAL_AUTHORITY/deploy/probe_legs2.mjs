/* LEG CLOSE-UPS — HUD hidden, camera 1.1 m from the knees, 8 angles, idle + frozen stride. probe_out/legc_<tag>_<angle>_<state>.png */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var tag = process.argv[2] || 'a'; var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 800, height: 800, gpu: process.argv[3] === 'gpu' });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(1500);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1; })()");
  await pg.evaluate('window.MAHWORLD_PLAY.send("TRANSFORM",{to:"SPLIT"})'); await sleep(3200);
  var yaw0 = await pg.evaluate("window.MAHWORLD_PLAY.mePose().root_yaw");
  var angles = { front: 0, fl: Math.PI * 0.25, left: Math.PI * 0.5, rl: Math.PI * 0.75, rear: Math.PI, rr: Math.PI * 1.25, right: Math.PI * 1.5, fr: Math.PI * 1.75 };
  async function shoot(state) { for (var a in angles) { await pg.evaluate("window.MAHWORLD_PLAY.cam(" + (yaw0 + Math.PI + angles[a]) + ", 0.0, 1.25, 0.42)"); await sleep(350); await pg.screenshot(path.join(OUT, 'legc_' + tag + '_' + a + '_' + state + '.png')); } }
  await shoot('idle');
  await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; var f=P.moveVector(1,0); for(var k=0;k<4;k++){ await P.send('MOVE',{forward:+f.f.toFixed(3),strafe:+f.s.toFixed(3),run:false,yaw:+f.yaw.toFixed(3)}); await new Promise(function(r){setTimeout(r,120)}); } P.holdPose('me', true); await P.send('MOVE',{forward:0,strafe:0,run:false}); return 1; })()"); await sleep(300);
  var yaw1 = await pg.evaluate("window.MAHWORLD_PLAY.mePose().root_yaw"); yaw0 = yaw1;
  await shoot('stride');
  console.log('yaw', yaw1, 'errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
