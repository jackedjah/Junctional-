/* filmstrip of one attack under virtual time: node probe_arc.mjs <skill PA_PUSH|PA_PULL|PA_HINGE|PA_ROTATION> <tag> [stepMs] */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var skill = process.argv[2] || 'PA_PUSH'; var tag = process.argv[3] || skill; var STEP = +(process.argv[4] || 45); var view = process.argv[5] || 'side';
var K = 0.12; var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 700, height: 700, timeScale: K });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(2500);
  var camExpr = view === 'front' ? "P.cam(Math.PI*0.02, 0.06, 4.0, 1.0)" : view === 'q' ? "P.cam(Math.PI*0.3, 0.08, 4.0, 1.0)" : "P.cam(Math.PI*0.5, 0.05, 4.0, 1.0)";
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); " + camExpr + "; return 1; })()");
  await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; await P.send('MOVE',{forward:0,strafe:0,run:false,yaw:0}); return 1; })()"); await sleep(1500);
  var r = await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; return await P.send('RULES_CAST',{skill_id:'" + skill + "'}); })()");
  console.log('cast', JSON.stringify(r).slice(0, 160));
  var frames = []; var t0 = Date.now(); var i = 0;
  while (Date.now() - t0 < 900 / K) { var f = path.join(OUT, tag + '_' + String(i).padStart(2, '0') + '.png'); await pg.screenshot(f); var st = await pg.evaluate("(function(){ var s=window.MAHWORLD_PLAY.snap().play; var c=s.rules&&s.rules.me&&s.rules.me.cast; return c?JSON.stringify(c).slice(0,80):null; })()"); frames.push({ i: i, real_ms: Date.now() - t0, game_ms: Math.round((Date.now() - t0) * K), cast: st }); i++; }
  console.log(JSON.stringify(frames));
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
