/* stills: idle, walk (mid), attack startup / release / recover, from a front-3/4 camera */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var tag = process.argv[2] || 'a';
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 900, height: 700 });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(2000);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); P.hud.toggleDev&&P.hud.toggleDev(); P.cam(Math.PI*0.66, 0.03, 3.2, 0.95); return 1; })()"); await sleep(1200); await pg.evaluate("window.MAHWORLD_PLAY.goTo(0, 2.0, 0, -4)"); await sleep(800);
  await pg.screenshot(path.join(OUT, tag + '_idle.png'));
  await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; var f=P.moveVector(1,0); for(var k=0;k<7;k++){ await P.send('MOVE',{forward:+f.f.toFixed(3),strafe:+f.s.toFixed(3),run:false,yaw:+f.yaw.toFixed(3)}); await new Promise(function(r){setTimeout(r,120)}); } return 1; })()");
  await pg.screenshot(path.join(OUT, tag + '_walk.png'));
  await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; var f=P.moveVector(1,0); for(var k=0;k<3;k++){ await P.send('MOVE',{forward:+f.f.toFixed(3),strafe:+f.s.toFixed(3),run:false,yaw:+f.yaw.toFixed(3)}); await new Promise(function(r){setTimeout(r,120)}); } return 1; })()");
  await pg.screenshot(path.join(OUT, tag + '_walk2.png'));
  await pg.evaluate("window.MAHWORLD_PLAY.send('MOVE',{forward:0,strafe:0,run:false})"); await sleep(900);
  var a = await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; var a=await P.send('ATTACK',{hint:'UP'}); return a; })()"); console.log('attack', JSON.stringify(a).slice(0, 300));
  for (var i = 0; i < 6; i++) { await sleep(60); await pg.screenshot(path.join(OUT, tag + '_attack_' + i + '.png')); }
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
  var st = await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; var s=P.snap().play; return {cast:s.rules&&s.rules.me&&s.rules.me.cast, skills:(s.rules&&s.rules.skills&&s.rules.skills.PHYSICAL||[]).map(function(x){return x.id+':'+(x.effect||'')+':'+(x.gesture||'')})}; })()"); console.log(JSON.stringify(st).slice(0, 900));
} finally { await pg.close(); srv.close(); }
