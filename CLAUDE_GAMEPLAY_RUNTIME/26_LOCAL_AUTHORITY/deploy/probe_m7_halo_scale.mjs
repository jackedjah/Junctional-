/* M7 HALO scale/access addendum — one bounded rendered route, not a regression suite.
   Captures the enlarged structure/underside, the live cabin, upper arrival/interior,
   road-gradient continuity and one phone-sized internal composition. */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)), DIST = path.join(HERE, 'static_dist'), OUT = path.join(HERE, 'probe_out', 'm7_halo_scale'); fs.mkdirSync(OUT, { recursive: true });
var srv = await serveStatic(DIST), pg = await launchChrome({ width: 1440, height: 900, gpu: true, unlockFps: true, cmdTimeoutMs: 120000 });
var report = { generated_at: new Date().toISOString(), source: DIST, viewport: { desktop: [1440, 900], phone: [430, 932] }, shots: [], checks: {}, console_errors: [] };
async function ev(src) { return await pg.evaluate("(async function(){var P=window.MAHWORLD_PLAY,H=window.MAHWORLD_STATIC_HOST;" + src + "})()"); }
async function freeCam(from, at, fov) { return await ev("var THREE=P.THREE,r=P.rendererDebug();if(!r.__m7haloOrig){r.__m7haloOrig=r.render.bind(r);r.render=function(sc,cam){r.__m7haloOrig(sc,window.__m7haloCam||cam);};}var c=new THREE.PerspectiveCamera(" + (fov || 48) + ",innerWidth/innerHeight,0.1,2400);c.position.set(" + from.join(',') + ");c.lookAt(" + at.join(',') + ");c.updateProjectionMatrix();window.__m7haloCam=c;return 1;"); }
async function shot(name) { await ev("document.querySelectorAll('body > *').forEach(function(e){if(e.tagName!=='CANVAS')e.style.visibility='hidden';});return 1;"); await sleep(260); var f = path.join(OUT, name + '.png'); await pg.screenshot(f); report.shots.push(name + '.png'); await ev("document.querySelectorAll('body > *').forEach(function(e){e.style.visibility='';});return 1;"); console.log('SHOT ' + name); }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1&tier=high'); await waitForGame(pg, 120000); await sleep(1800); await ev("P.hud.showGuide(false);return 1;");
  for (var i = 0; i < 240; i++) { var w = await ev("return P.world?P.world().status:null;"); if (w === 'READY' || w === 'FAILED') break; await sleep(500); }
  for (var j = 0; j < 120; j++) { var d = await ev("var q=P.district?P.district():null;return q?q.loaded.length:-1;"); if (d >= 4) break; await sleep(500); } await sleep(1200);
  report.checks.boot = await ev("return {world:P.world(),tree:P.treeAscentInfo&&P.treeAscentInfo(),render:P.renderInfo(),chain:P.renderChain&&P.renderChain(),build:window.MAHWORLD_BUILD_INFO||null,terrain:P.worldLayer&&P.worldLayer().debug?P.worldLayer().debug():null};");
  await freeCam([-255, 170, -255], [30, 185, 40], 54); await shot('01_ground_scale_context');
  await freeCam([-6, 43, -2], [30, 178, 40], 49); await shot('02_engineered_underside');
  await freeCam([-18, 20, 58], [30, 3, 40], 48); await shot('03_ground_road_gradients');
  await ev("window.__m7haloCam=null;P.devPlay('PLACE',{x:22.7,z:40});return 1;"); await sleep(300); var before = await ev("var s=P.snap().play;return {domain:s.spatial_domain,ground:s.flight.ground,pool:s.flight_mahgic.current,prompts:s.prompts};"); var up = await ev("return P.send('TRANSIT',{id:'ELEVATOR_UP'});"); await sleep(10000); var middle = await ev("var s=P.snap().play;return {domain:s.spatial_domain,ground:s.flight.ground,transit:s.transit,pool:s.flight_mahgic.current};"); await freeCam([-6, 129, 62], [22.7, 124, 40], 47); await shot('04_live_ascent_midpoint'); await sleep(10800);
  var upper = await ev("var s=P.snap().play;return {domain:s.spatial_domain,position:s.position,ground:s.flight.ground,altitude:s.flight.altitude,pool:s.flight_mahgic.current,halo:s.halo,prompts:s.prompts,equipment:s.equipment};");
  await freeCam([30, 335, -178], [30, 266, 40], 48); await shot('05_halo_exterior_scale');
  await freeCam([22.7, 247, 4], [30, 246, 40], 52); await shot('06_upper_arrival_court');
  await freeCam([30, 275, 158], [30, 244, 40], 55); await shot('07_halo_interior_panorama');
  await freeCam([135, 250, 42], [30, 242, 40], 49); await shot('08_shell_and_promenade_close');
  await pg.cmd('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 1, mobile: true }); await pg.cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); await sleep(400);
  await freeCam([22.7, 249, 8], [34, 245, 49], 61); await shot('09_phone_upper_arrival');
  var guide = await ev("window.__m7haloCam=null;P.devPlay('PLACE',{x:34,z:49});return P.send('NPC_TALK',{npc:'NPC_HALO_GUIDE'});"); await ev("P.devPlay('PLACE',{x:22.7,z:40});return 1;"); var down = await ev("return P.send('TRANSIT',{id:'ELEVATOR_DOWN'});"); await sleep(20500); var lower = await ev("var s=P.snap().play;return {domain:s.spatial_domain,ground:s.flight.ground,altitude:s.flight.altitude,pool:s.flight_mahgic.current,transit:s.transit};");
  report.checks.route = { before: before, up: up, middle: middle, upper: upper, guide: guide, down: down, lower: lower };
  report.checks.final = await ev("return {render:P.renderInfo(),chain:P.renderChain&&P.renderChain(),perf:P.perf(),world:P.world(),tree:P.treeAscentInfo&&P.treeAscentInfo()};");
  report.console_errors = pg.errors.filter(function (e) { return !/404|favicon/.test(e); });
} catch (e) { report.fatal = String(e && e.stack || e); console.error(report.fatal); }
finally { fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1)); await pg.close(); srv.close(); }
console.log('RESULT M7 HALO SCALE probe shots ' + report.shots.length + ' errors ' + report.console_errors.length + (report.fatal ? ' FATAL' : ' OK') + ' → ' + OUT); process.exit(report.fatal || report.console_errors.length ? 1 : 0);
