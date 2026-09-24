import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 960, height: 720, gpu: true });
async function key(code) { await pg.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{code:'" + code + "',key:'" + code.slice(3).toLowerCase() + "',bubbles:true})); document.dispatchEvent(new KeyboardEvent('keyup',{code:'" + code + "',key:'" + code.slice(3).toLowerCase() + "',bubbles:true})); 1"); }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1'); await waitForGame(pg, 90000); await sleep(3000);
  await pg.evaluate("window.MAHWORLD_PLAY.hud.showGuide(false)");
  await key('KeyQ'); await sleep(500); await pg.screenshot(path.join(OUT, 'menu_stats.png'));
  await pg.evaluate("document.querySelector('[data-tab=\"MAP\"]').click()"); await sleep(500); await pg.screenshot(path.join(OUT, 'menu_map.png'));
  await pg.evaluate("document.querySelector('[data-tab=\"DMS\"]').click()"); await sleep(400); await pg.screenshot(path.join(OUT, 'menu_dms.png'));
  var p0 = await pg.evaluate("JSON.stringify(window.MAHWORLD_PLAY.snap().play.position)"); await key('KeyW'); await sleep(600); var p1 = await pg.evaluate("JSON.stringify(window.MAHWORLD_PLAY.snap().play.position)"); console.log('input owned by menu (no move on W):', p0 === p1);
  await key('KeyQ'); await sleep(300); await key('Tab'); await sleep(400); await pg.screenshot(path.join(OUT, 'menu_emotes_tab.png')); console.log('emote radial open', await pg.evaluate("window.MAHWORLD_PLAY.hud.panelOpen()"));
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
