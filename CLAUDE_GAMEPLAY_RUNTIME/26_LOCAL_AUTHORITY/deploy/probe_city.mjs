import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out');
var q = process.argv[2] || ''; var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1100, height: 700 });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1' + q); await waitForGame(pg, 90000); await sleep(4000);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); P.hud.toggleDev(); P.cam(0.35, 0.62, 46, 2); return 1; })()"); await sleep(2500);
  await pg.screenshot(path.join(OUT, 'city_wide' + q.replace(/[^a-z]/g, '') + '.png'));
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.cam(0.35, 0.38, 9, 1.2); return 1; })()"); await sleep(2000);
  await pg.screenshot(path.join(OUT, 'city_ground' + q.replace(/[^a-z]/g, '') + '.png'));
  var ri = await pg.evaluate("JSON.stringify({render: window.MAHWORLD_PLAY.renderInfo(), perf: window.MAHWORLD_PLAY.perf()})"); console.log(ri);
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
