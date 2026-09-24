/* E/R/T/Y direct attacks + gold MAHGIC: press E (push), then Z to SPECIAL, E (vector shot streak); stills at release. */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var tag = process.argv[2] || 'atk'; var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 960, height: 720, gpu: true });
async function key(code) { await pg.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{code:'" + code + "',key:'" + code.slice(3).toLowerCase() + "',bubbles:true})); document.dispatchEvent(new KeyboardEvent('keyup',{code:'" + code + "',key:'" + code.slice(3).toLowerCase() + "',bubbles:true})); 1"); }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(1500);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); return 1; })()");
  await pg.evaluate("window.MAHWORLD_PLAY.goTo(0, 4, 0, -2)"); await sleep(300); var yaw0 = await pg.evaluate("window.MAHWORLD_PLAY.mePose().root_yaw");
  await pg.evaluate("window.MAHWORLD_PLAY.cam(" + (yaw0 + Math.PI + 0.9) + ", 0.12, 3.6, 1.0)"); await sleep(300);
  await pg.screenshot(path.join(OUT, tag + '_hud.png'));
  await key('KeyE'); for (var i = 0; i < 5; i++) { await sleep(110); await pg.screenshot(path.join(OUT, tag + '_E_' + i + '.png')); }
  var st = await pg.evaluate("JSON.stringify({cast: window.MAHWORLD_PLAY.snap().play.rules.me.cast, sel: window.MAHWORLD_PLAY.snap().play.rules.me.selection})"); console.log('after E', st.slice(0, 200)); await sleep(900);
  await key('KeyR'); await sleep(220); await pg.screenshot(path.join(OUT, tag + '_R.png')); await sleep(900);
  await key('KeyZ'); await key('KeyZ'); await sleep(300); await key('KeyE'); for (var j = 0; j < 6; j++) { await sleep(120); await pg.screenshot(path.join(OUT, tag + '_special_' + j + '.png')); }
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
