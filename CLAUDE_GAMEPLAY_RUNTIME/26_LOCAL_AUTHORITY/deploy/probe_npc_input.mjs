/* NPC through REAL input: walk the last metres with W (camera-relative), Enter -> TALK dialog, Enter/Escape to advance/close, W moves again. node deploy/probe_npc_input.mjs */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var srv = await serveStatic(path.join(HERE, 'static_dist')); var pg = await launchChrome({ width: 1100, height: 700, gpu: true });
async function key(code, down) { await pg.evaluate("document.dispatchEvent(new KeyboardEvent('" + (down ? 'keydown' : 'keyup') + "',{code:'" + code + "',key:'" + (code.startsWith('Key') ? code.slice(3).toLowerCase() : code) + "',bubbles:true})); 1"); }
async function tap(code) { await key(code, true); await sleep(60); await key(code, false); }
var ev = function (x) { return pg.evaluate(x); };
var dlg = function () { return ev("(function(){ var d=document.getElementById('g-dialog'); return d && d.style.display==='block' ? d.textContent.slice(0,110) : 'closed'; })()"); };
var pos = function () { return ev("JSON.stringify(window.MAHWORLD_PLAY.snap().play.position)"); };
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1'); await waitForGame(pg, 90000); await sleep(3000); await ev("window.MAHWORLD_PLAY.hud.showGuide(false); window.MAHWORLD_PLAY.camFollow(false); 1");
  var npc = JSON.parse(await ev("JSON.stringify((window.MAHWORLD_PLAY.snap().play.npcs||[]).filter(function(n){return n.quest;})[0].position)")); console.log('quest NPC at', JSON.stringify(npc));
  await ev("window.MAHWORLD_PLAY.goTo(" + npc.x + "," + (npc.z - 7) + ", " + npc.x + "," + npc.z + ", 12000)");   /* 7 m short of the NPC: the rest is real input */
  var best = null; for (var k = 0; k < 16; k++) { var yaw = k * Math.PI / 8; await ev("window.MAHWORLD_PLAY.cam(" + yaw + ", 0.15, 5.5, 1.0)"); await sleep(700); var f = JSON.parse(await ev("JSON.stringify(window.MAHWORLD_PLAY.camForward())")); var p0 = JSON.parse(await pos()); var dx = npc.x - p0.x, dz = npc.z - p0.z, d = Math.hypot(dx, dz); var dot = (f.fx * dx + f.fz * dz) / d; if (!best || dot > best.dot) best = { yaw: yaw, dot: dot }; }
  await ev("window.MAHWORLD_PLAY.cam(" + best.yaw + ", 0.15, 5.5, 1.0)"); await sleep(1800); console.log('camera yaw toward NPC', best.yaw.toFixed(2), 'dot', best.dot.toFixed(2), 'start', await pos());
  await key('KeyW', true); var steps = 0; while (steps++ < 40) { await sleep(120); var p1 = JSON.parse(await pos()); if (Math.hypot(npc.x - p1.x, npc.z - p1.z) < 2.6) break; } await key('KeyW', false); await sleep(500);
  var pr = await ev("JSON.stringify((window.MAHWORLD_PLAY.snap().play.prompts||[]).map(function(x){return x.intent}))"); console.log('after W walk', await pos(), 'prompts', pr);
  await tap('Enter'); await sleep(700); console.log('after Enter #1:', await dlg()); await pg.screenshot(path.join(OUT, 'npc_dialog.png'));
  await tap('Enter'); await sleep(400); console.log('after Enter #2:', await dlg());
  await tap('Enter'); await sleep(400); console.log('after Enter #3:', await dlg());
  await tap('Escape'); await sleep(400); console.log('after Escape:', await dlg());
  var pA = JSON.parse(await pos()); await key('KeyS', true); await sleep(900); await key('KeyS', false); await sleep(300); var pB = JSON.parse(await pos()); console.log('S after dialog moved', Math.hypot(pB.x - pA.x, pB.z - pA.z).toFixed(2), 'm');
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
