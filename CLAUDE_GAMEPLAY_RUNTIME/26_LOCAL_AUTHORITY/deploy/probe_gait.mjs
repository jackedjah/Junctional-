/* GAIT FILMSTRIP — SPLIT form, W held, side camera, 12 frames at ~150 ms; prints gait phase/speed per frame. probe_out/gait_<tag>_NN.png */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var tag = process.argv[2] || 'g'; var view = process.argv[3] || 'side'; var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 800, height: 800, gpu: true });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(1500);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1; })()");
  await pg.evaluate('window.MAHWORLD_PLAY.send("TRANSFORM",{to:"SPLIT"})'); await sleep(3000);
  /* face -z (W with camera yaw 0 → travel heading 0) and put the camera on the character's side / front-3/4 */
  await pg.evaluate("window.MAHWORLD_PLAY.cam(0, 0.05, 3.2, 0.8)"); await sleep(300);
  await pg.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',key:'w',bubbles:true})); 1"); await sleep(1400);
  var camYaw = view === 'side' ? Math.PI * 0.5 : (view === 'front34' ? Math.PI * 0.8 : Math.PI * 1.25);
  await pg.evaluate("window.MAHWORLD_PLAY.cam(" + camYaw + ", 0.02, 3.0, 0.75)"); await sleep(200);
  for (var i = 0; i < 12; i++) { var g = await pg.evaluate("JSON.stringify((function(){ var G=window.MAHWORLD_PLAY.gaitOf('me'); var p=window.MAHWORLD_PLAY.poseOf('me',['THIGH_L','THIGH_R','SHIN_L','SHIN_R']); return {phase:+G.phase.toFixed(2), v:+G.speed_mps.toFixed(2), TL:p.composed&&p.composed.THIGH_L?p.composed.THIGH_L.map(function(x){return +x.toFixed(2)}):null, SL:p.composed&&p.composed.SHIN_L?p.composed.SHIN_L.map(function(x){return +x.toFixed(2)}):null}; })())"); await pg.screenshot(path.join(OUT, 'gait_' + tag + '_' + String(i).padStart(2, '0') + '.png')); console.log(i, g); await sleep(150); }
  await pg.evaluate("document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',key:'w',bubbles:true})); 1");
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
