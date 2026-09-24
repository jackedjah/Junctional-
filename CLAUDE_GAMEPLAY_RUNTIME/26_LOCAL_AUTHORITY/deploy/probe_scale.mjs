import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out');
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1100, height: 700 });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(2500);
  var r = await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); var s=P.snap().play; var sp=P.screenPos('me',0); var sp2=P.screenPos('me',1.8); var slot=P.slot(); return {pos:s.position, alt:s.flight&&s.flight.altitude, screen_feet:sp, screen_head:sp2, slot:{id:slot.id, fallback:slot.fallback_reason, glb:slot.glb, impl:slot.implementation}, cam:P.cam(), render:P.renderInfo()}; })()");
  console.log(JSON.stringify(r, null, 1)); await pg.screenshot(path.join(OUT, 'scale_check.png'));
} finally { await pg.close(); srv.close(); }
