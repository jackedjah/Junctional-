import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out');
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1100, height: 700, mobile: false });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(1500);
  var r = await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); var s=P.snap().play; var c0=P.cam(); P.cam(0.6,0.45,7); await new Promise(function(r){setTimeout(r,1500)}); var c1=P.cam(); return {pos:s.position,facing:s.facing,room:s.room,size:s.room_size_m,cam0:c0,cam1:c1,colliders:(s.rules&&s.rules.colliders)?s.rules.colliders.length||Object.keys(s.rules.colliders).length:null, ri:P.renderInfo?P.renderInfo():null, perf:P.perf?P.perf():null}; })()");
  console.log(JSON.stringify(r, null, 1)); await pg.screenshot(path.join(OUT, 'cam_wide.png'));
  var mv = await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; var mv=P.moveVector(1,0); for(var k=0;k<12;k++){ await P.send('MOVE',{forward:+mv.f.toFixed(3),strafe:+mv.s.toFixed(3),run:false,yaw:+mv.yaw.toFixed(3)}); await new Promise(function(r){setTimeout(r,90)}); } return P.snap().play.facing; })()");
  await pg.screenshot(path.join(OUT, 'cam_wide_moving_right.png')); console.log('facing while moving right', mv);
  await pg.evaluate("window.MAHWORLD_PLAY.send('MOVE',{forward:0,strafe:0,run:false})");
} finally { await pg.close(); srv.close(); }
