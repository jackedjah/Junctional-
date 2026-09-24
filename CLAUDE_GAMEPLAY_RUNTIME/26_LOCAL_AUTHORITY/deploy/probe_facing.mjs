/* FACING PROBE — real keyboard events W/A/S/D/diagonals; per key: host facing, presentation root yaw, measured travel heading, error. */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 900, height: 700, gpu: true });
function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(1500);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); P.cam(0.4, 0.35, 5.5); return 1; })()"); await sleep(400);
  var keys = { W: ['KeyW'], A: ['KeyA'], S: ['KeyS'], D: ['KeyD'], WA: ['KeyW', 'KeyA'], SD: ['KeyS', 'KeyD'] };
  for (var k in keys) {
    var codes = keys[k];
    await pg.evaluate("(function(){ " + codes.map(function (c) { return "document.dispatchEvent(new KeyboardEvent('keydown',{code:'" + c + "',key:'" + c.slice(3).toLowerCase() + "',bubbles:true}));"; }).join('') + " return 1; })()");
    var samples = [];
    for (var i = 0; i < 6; i++) { await sleep(250); samples.push(await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; var s=P.snap().play; var mp=P.mePose(); return { x:s.position.x, z:s.position.z, facing:s.facing, root_yaw: mp.root_yaw, t: performance.now() }; })()")); }
    await pg.screenshot(path.join(OUT, 'facing_' + k + '.png'));
    await pg.evaluate("(function(){ " + codes.map(function (c) { return "document.dispatchEvent(new KeyboardEvent('keyup',{code:'" + c + "',key:'" + c.slice(3).toLowerCase() + "',bubbles:true}));"; }).join('') + " return 1; })()"); await sleep(700);
    var a = samples[1], b = samples[5]; var travel = Math.atan2(b.x - a.x, -(b.z - a.z)); var last = samples[5];
    console.log(k.padEnd(3), 'travel', travel.toFixed(2), 'host facing', (last.facing === undefined ? 'n/a' : (+last.facing).toFixed(2)), 'root yaw', last.root_yaw.toFixed(2), 'err(root-travel)', (wrap(-last.root_yaw - travel) * 180 / Math.PI).toFixed(0) + '°', 'moved', Math.hypot(b.x - a.x, b.z - a.z).toFixed(2));
  }
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
