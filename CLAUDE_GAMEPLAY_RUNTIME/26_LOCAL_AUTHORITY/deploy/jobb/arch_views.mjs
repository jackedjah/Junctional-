/* JOB B B7 before / after views with a FREE inspection camera (the page renderer is patched to draw with a probe camera; the game camera is
   untouched): the four mainland landmarks + the match hall (§6 / §7 colour rationalisation), the skyline / horizon (§8 sky), the canal and a
   sanctuary pond (§9 fish), the hazard-looking route (§10 C). Same views on any build so labels compare.
   node deploy/jobb/arch_views.mjs <label> [--mobile] [--dist <root>] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }
var LABEL = (argv[0] && argv[0][0] !== '-') ? argv[0] : 'run'; var MOBILE = argv.indexOf('--mobile') >= 0; var DIST = path.resolve(arg('--dist', path.join(HERE, '..', 'static_dist')));
var OUT = path.join(HERE, '..', 'probe_out', 'jobb', 'arch_b7', LABEL); fs.mkdirSync(OUT, { recursive: true });
var W = MOBILE ? 393 : 1280, H = MOBILE ? 852 : 800; var srv = await serveStatic(DIST); var pg = await launchChrome({ width: W, height: H, gpu: true, unlockFps: true, mobile: MOBILE, dpr: MOBILE ? 2 : 1 });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function freeCam(from, at, fov) { await ev("var THREE=P.THREE; var r=P.rendererDebug(); if(!r.__orig){ r.__orig=r.render.bind(r); r.render=function(sc,cam){ if(window.__freecam){ r.__orig(sc, window.__freecam); } else r.__orig(sc,cam); }; } var c=new THREE.PerspectiveCamera(" + (fov || 50) + ", " + W + "/" + H + ", 0.4, 1400); c.position.set(" + from.join(',') + "); c.lookAt(" + at.join(',') + "); c.updateProjectionMatrix(); window.__freecam=c; return 1;"); }
async function shot(name) { await ev("document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1;"); await sleep(350); await pg.screenshot(path.join(OUT, name + '.png')); await ev("document.querySelectorAll('body > *').forEach(function(e){ e.style.visibility=''; }); return 1;"); console.log('shot ' + name); }
var report = { label: LABEL, mobile: MOBILE, shots: [] };
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 150000); await sleep(3000); await ev("P.hud.showGuide(false); return 1;");
  for (var i = 0; i < 300; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED') break; await sleep(500); }
  for (var w0 = 0; w0 < 120; w0++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(2500);
  var views = [
    { id: 'tower_titan_3q', from: [160, 26, 160], at: [111, 22, 110], fov: 48, place: [140, 140] },
    { id: 'tower_titan_ground', from: [88, 2.2, 150], at: [111, 30, 110], fov: 60, place: [90, 148] },
    { id: 'temple_gold_causeway', from: [6, 3, 118], at: [0, 28, 178], fov: 55, place: [4, 120] },
    { id: 'gym_athlete_forecourt', from: [-70, 4, 120], at: [-112, 26, 110], fov: 50, place: [-70, 118] },
    { id: 'market_bage', from: [26, 5, 226], at: [0, 20, 257], fov: 52, place: [24, 228] },
    { id: 'match_hall', from: [140, 6, 40], at: [122, 10, 6], fov: 50, place: [136, 36] },
    { id: 'skyline_mainland', from: [-20, 42, -150], at: [0, 30, 160], fov: 55, place: [0, -60] },
    { id: 'horizon_east_range', from: [60, 3, 60], at: [400, 60, 130], fov: 62, place: [60, 60] },
    { id: 'horizon_sea_west', from: [-200, 6, 60], at: [-600, 40, 120], fov: 62, place: [-190, 60] },
    { id: 'canal_fish', from: [10, 4, 206], at: [-10, -0.2, 228], fov: 55, place: [8, 208] },
    { id: 'pond_visionary', from: [-94, 3.5, 44], at: [-94, 0.2, 30], fov: 55, place: [-94, 42] },
    { id: 'pond_bage_east', from: [30, 3.5, 250], at: [30, 0, 261], fov: 55, place: [30, 250] },
    { id: 'route_forest_water', from: [-110, 4, 190], at: [-130, 0.5, 226], fov: 60, place: [-108, 192] },
  ];
  for (var v = 0; v < views.length; v++) { var V = views[v]; if (V.place) { await ev("return P.devPlay('PLACE', { x: " + V.place[0] + ", z: " + V.place[1] + " });"); await sleep(1800); } await freeCam(V.from, V.at, V.fov); await sleep(900); await shot(V.id); report.shots.push(V.id); }
  report.architecture = await ev("var A=P.worldLayer().architecture ? P.worldLayer().architecture() : null; return A && A.debug ? A.debug() : null;");
  report.sky = await ev("var S=P.worldLayer().sky ? P.worldLayer().sky() : null; return S && S.debug ? S.debug() : null;");
  report.wildlife = await ev("var Wl=P.worldLayer().wildlife ? P.worldLayer().wildlife() : null; return Wl && Wl.debug ? Wl.debug() : null;");
  report.renderer = await ev("var r=P.rendererDebug(); return { calls: r.info.render.calls, tris: r.info.render.triangles, programs: r.info.programs ? r.info.programs.length : null, geometries: r.info.memory.geometries, textures: r.info.memory.textures };");
} catch (e) { report.fatal = String(e && e.stack || e); console.error(e); } finally { fs.writeFileSync(path.join(OUT, 'views.json'), JSON.stringify(report, null, 1)); await pg.close(); srv.close(); }
console.log('RESULT arch_views ' + LABEL + ' ' + report.shots.length + ' shots' + (report.fatal ? ' FATAL' : '') + ' → ' + OUT);
