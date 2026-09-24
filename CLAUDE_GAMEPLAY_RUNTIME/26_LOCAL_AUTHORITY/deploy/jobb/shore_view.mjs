/* JOB B shore views (free inspection camera): the canal BEACH banks with the foam line, the mainland COAST beach into the sea, an island
   in the distance, the sea at a grazing angle. node deploy/jobb/shore_view.mjs [--night] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var night = process.argv.indexOf('--night') >= 0; var OUT = path.join(HERE, '..', 'probe_out', 'jobb', night ? 'shore_night' : 'shore'); fs.mkdirSync(OUT, { recursive: true });
var DIST = path.join(HERE, '..', 'static_dist'); var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1280, height: 800, gpu: true, unlockFps: true });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function freeCam(from, at, fov) { await ev("var THREE=P.THREE; var r=P.rendererDebug(); if(!r.__orig){ r.__orig=r.render.bind(r); r.render=function(sc,cam){ if(window.__freecam){ r.__orig(sc, window.__freecam); } else r.__orig(sc,cam); }; } var c=new THREE.PerspectiveCamera(" + (fov || 50) + ", 1280/800, 0.1, 1400); c.position.set(" + from.join(',') + "); c.lookAt(" + at.join(',') + "); c.updateProjectionMatrix(); window.__freecam=c; return 1;"); }
async function shot(name) { await ev("document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1;"); await sleep(250); await pg.screenshot(path.join(OUT, name + '.png')); await ev("document.querySelectorAll('body > *').forEach(function(e){ e.style.visibility=''; }); return 1;"); }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1' + (night ? '&sky=night' : '')); await waitForGame(pg, 120000); await sleep(3000); await ev("P.hud.showGuide(false); return 1;");
  for (var i = 0; i < 240; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED') break; await sleep(500); }
  for (var w0 = 0; w0 < 120; w0++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(1500);
  /* the player near the canal so the near ripple field is active */ await ev("return P.goTo(-40, 205, undefined, undefined, 60000);"); await sleep(1500);
  await freeCam([-52, 2.2, 208], [-40, -0.2, 222]); await shot('01_canal_beach_bank'); await sleep(1400); await shot('01b_canal_beach_bank_later');
  await freeCam([-30, 6, 200], [-30, 0, 236], 55); await shot('02_canal_across');
  await freeCam([-40, 0.9, 214.5], [-40, -0.3, 224]); await shot('03_canal_waterline_low');
  /* the coast: south edge at z −56 (wall) → the beach and the sea */ await freeCam([0, 3.5, -70], [0, -0.5, -140], 55); await shot('04_coast_south_beach');
  await freeCam([-160, 12, 60], [-330, -2, 90], 55); await shot('05_coast_west_island');
  await freeCam([120, 30, 300], [140, 0, 700], 55); await shot('06_north_islands');
  await freeCam([0, 1.6, -95], [60, 0.5, -180], 60); await shot('07_sea_grazing');
  var cd = await ev("var wb=P.worldLayer(); var m=wb.modules(); return { coast: m.coast && m.coast.debug ? m.coast.debug() : null, water: m.water && m.water.debug ? m.water.debug().ripples : null };"); fs.writeFileSync(path.join(OUT, 'shore.json'), JSON.stringify(cd, null, 1));
  console.log('coast', JSON.stringify(cd.coast)); console.log('errors', pg.errors.filter(function (e) { return !/404|favicon/.test(e); }).slice(0, 4));
} catch (e) { console.error(e); } finally { await pg.close(); srv.close(); }
console.log('RESULT shore_view OK');
