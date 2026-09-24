/* JOB B extras probe: the Mr / Mrs Mah guides (hook exercised through the world layer API — the HUD toggle is JOB A's), the sun / moon at
   their apparent size (a dedicated sky camera looking along the registry direction), and the night template (fixtures lit, pools, moon).
   node deploy/jobb/world_extras.mjs [--night] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); var night = argv.indexOf('--night') >= 0;
var OUT = path.join(HERE, '..', 'probe_out', 'jobb', night ? 'extras_night' : 'extras'); fs.mkdirSync(OUT, { recursive: true });
var DIST = path.join(HERE, '..', 'static_dist'); var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1280, height: 800, gpu: true, unlockFps: true });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function shot(name) { await ev("document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1;"); await sleep(150); await pg.screenshot(path.join(OUT, name + '.png')); await ev("document.querySelectorAll('body > *').forEach(function(e){ e.style.visibility=''; }); return 1;"); }
var report = { night: night, guides: null, celestial: null, fixtures: null, errors: [] };
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1' + (night ? '&sky=night' : '')); await waitForGame(pg, 120000); await sleep(3000); await ev("P.hud.showGuide(false); return 1;");
  for (var i = 0; i < 240; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED') break; await sleep(500); }
  for (var w0 = 0; w0 < 120; w0++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(1500);
  /* 1. guides: MR then MRS following the player while it walks (hook: worldLayer().guides().setGuide) */
  await ev("return P.goTo(0, -20, undefined, undefined, 30000);"); await sleep(300);
  for (var gi = 0; gi < 2; gi++) { var gid = gi ? 'MRS' : 'MR'; await ev("var g=P.worldLayer().guides(); g.setGuide('" + gid + "'); g.setVisible(true); return 1;"); await sleep(2500); await ev("return P.goTo(0, -4, undefined, undefined, 20000);"); await sleep(600); await ev("P.camFollow(false); P.cam(2.3, 0.02, 2.6, 6); return 1;"); await sleep(900); await shot('guide_' + gid.toLowerCase()); var gd = await ev("var g=P.worldLayer().guides(); return g.debug ? g.debug() : null;"); report.guides = report.guides || {}; report.guides[gid] = gd; console.log('guide', gid, JSON.stringify(gd).slice(0, 300)); }
  await ev("var g=P.worldLayer().guides(); g.setGuide(null); return 1;");
  /* 2. sun / moon: render one frame with a sky camera at the player looking along the registry direction (renderer.render patched for the capture) */
  var cel = await ev("var wb=P.worldLayer(); var m=wb.modules().celestial; return m && m.debug ? m.debug() : null;"); report.celestial = cel; console.log('celestial', JSON.stringify(cel).slice(0, 400));
  var dir = night ? (cel && cel.moon && cel.moon.direction) : (cel && cel.sun && cel.sun.direction);
  if (dir) { await ev("var THREE=P.THREE; var r=P.rendererDebug(); if(!r.__orig){ r.__orig=r.render.bind(r); r.render=function(sc,cam){ if(window.__skycam){ r.__orig(sc, window.__skycam); } else r.__orig(sc,cam); }; } var c=new THREE.PerspectiveCamera(50, 1280/800, 0.5, 1400); var me=P.snap().play.position; c.position.set(me.x, 1.7, me.z); c.lookAt(me.x + " + dir[0] + " * 100, 1.7 + " + dir[1] + " * 100, me.z + " + dir[2] + " * 100); c.updateProjectionMatrix(); window.__skycam=c; return 1;"); await sleep(500); await shot(night ? 'moon_sky' : 'sun_sky'); await ev("window.__skycam=null; return 1;"); }
  /* 3. fixtures near the player (night: pools + lights) */
  await ev("return P.goTo(-40, 62, undefined, undefined, 30000);"); await sleep(400); await ev("P.camFollow(false); P.cam(0.9, 0.16, 9, 6); return 1;"); await sleep(900); await shot('fixtures_route');
  report.fixtures = await ev("var wb=P.worldLayer(); var m=wb.modules().fixtures; return m && m.debug ? m.debug() : null;"); console.log('fixtures', JSON.stringify(report.fixtures).slice(0, 300));
  await ev("return P.goTo(0, 226, undefined, undefined, 60000);"); await sleep(400); await ev("P.camFollow(false); P.cam(-2.2, 0.2, 18, 6); return 1;"); await sleep(900); await shot('canal_wide');
  await ev("return P.goTo(-100, 5, undefined, undefined, 60000);"); await sleep(2500); await ev("P.camFollow(false); P.cam(-1.2, 0.14, 14, 6); return 1;"); await sleep(900); await shot('forest_creatures');
  /* creature close-up: walk next to the nearest active Dogkie and look at it */
  var near = await ev("var p=P.snap().play; var me=p.position; var best=null, bd=1e9; (p.creatures||[]).forEach(function(c){ var d=Math.hypot(c.position.x-me.x, c.position.z-me.z); if(d<bd){ bd=d; best=c; } }); return best ? { id: best.id, x: best.position.x, z: best.position.z, state: best.state } : null;");
  if (near) { await ev("return P.goTo(" + (near.x + 3.2) + ", " + (near.z + 2.4) + ", undefined, undefined, 40000);"); await sleep(600); var me2 = await ev("return P.snap().play.position;"); var dx = near.x - me2.x, dz = near.z - me2.z; var yaw = Math.atan2(-dx, -dz); await ev("P.camFollow(false); P.cam(" + yaw.toFixed(3) + ", 0.08, 5.5, 6); return 1;"); await sleep(900); await shot('dogkie_closeup'); report.dogkie_closeup = near; console.log('dogkie close-up', JSON.stringify(near)); } var cr = await ev("var wb=P.worldLayer(); var m=wb.creatures(); return m && m.debug ? m.debug() : null;"); report.creatures = cr; console.log('creatures', JSON.stringify(cr).slice(0, 400));
  report.errors = pg.errors.filter(function (e) { return !/404|favicon/.test(e); }).slice(0, 20);
} catch (e) { report.fatal = String(e && e.stack || e); console.error(e); } finally { fs.writeFileSync(path.join(OUT, 'extras.json'), JSON.stringify(report, null, 1)); await pg.close(); srv.close(); }
console.log('RESULT world_extras ' + (report.fatal ? 'FATAL' : 'OK') + ' errors ' + report.errors.length);
