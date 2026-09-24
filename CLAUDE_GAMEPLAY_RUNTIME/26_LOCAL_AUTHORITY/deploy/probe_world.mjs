/* WORLD PROBE — floor / plaza wide, tree elevator landmark, elevator ride (TRANSIT prompt -> up -> platform), draw calls. */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1100, height: 720, gpu: true });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1'); await waitForGame(pg, 90000); await sleep(5000);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); return 1; })()");
  await pg.evaluate("window.MAHWORLD_PLAY.cam(0.2, 0.55, 26, 1.0)"); await sleep(500); await pg.screenshot(path.join(OUT, 'world_plaza.png'));
  console.log('render', await pg.evaluate("JSON.stringify(window.MAHWORLD_PLAY.renderInfo())"));
  await pg.evaluate("window.MAHWORLD_PLAY.goTo(22, 34)"); await sleep(400); await pg.evaluate("window.MAHWORLD_PLAY.cam(-2.4, 0.25, 16, 4.0)"); await sleep(500); await pg.screenshot(path.join(OUT, 'world_tree.png'));
  await pg.evaluate("window.MAHWORLD_PLAY.goTo(26.6, 40)"); await sleep(600); var prompts = await pg.evaluate("JSON.stringify((window.MAHWORLD_PLAY.snap().play.prompts||[]).map(function(p){return p.intent+':'+(p.label||'')}))"); console.log('prompts', prompts);
  var tr = await pg.evaluate("window.MAHWORLD_PLAY.send('TRANSIT',{id:'ELEVATOR_UP'})"); console.log('transit', JSON.stringify(tr).slice(0, 200));
  for (var i = 0; i < 5; i++) { await sleep(500); await pg.screenshot(path.join(OUT, 'world_lift_' + i + '.png')); }
  console.log('after', await pg.evaluate("JSON.stringify({pos: window.MAHWORLD_PLAY.snap().play.position, alt: window.MAHWORLD_PLAY.snap().play.flight.altitude, ground: window.MAHWORLD_PLAY.snap().play.flight.ground, prompts: (window.MAHWORLD_PLAY.snap().play.prompts||[]).map(function(p){return p.intent})})"));
  await pg.evaluate("window.MAHWORLD_PLAY.cam(-2.0, 0.35, 12, 10.0)"); await sleep(500); await pg.screenshot(path.join(OUT, 'world_platform.png'));
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
