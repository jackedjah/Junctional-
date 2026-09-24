/* JOB B FIVE CLASS SANCTUARIES real-runtime proof (owner next-pass 2026-09-20 §6–§10, §16, §25; architecture add-on): the static demo boots in
   headless Chrome (GPU), the world layer reports READY, and a FREE inspection camera photographs each sanctuary (region tint + crystal meadow +
   the class house / landmark with its root skirt, energy seams, square-diamond crown, entrance frame + converging diamonds), the road → forecourt
   → spur correction, the ponds with their shores, the Titan gate + ledge, the Visionary highland overlook, the Lean spire house top platform,
   the Bage basin rings, the match-hall ring crown, a PHONE-size portrait frame (EMULATED — never iPhone acceptance) and the MAP. Records the
   architecture / meadow / terrain module debug, draw calls per place and console errors (a silent shader failure is not a pass).
   node deploy/jobb/sanctuary_proof.mjs [out dir] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); var OUT = path.resolve(argv[0] || path.join(HERE, '..', 'probe_out', 'jobb', 'sanctuary_proof')); fs.mkdirSync(OUT, { recursive: true });
var DIST = path.join(HERE, '..', 'static_dist'); var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1280, height: 800, gpu: true, unlockFps: true });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function freeCam(from, at, fov) { await ev("var THREE=P.THREE; var r=P.rendererDebug(); if(!r.__orig){ r.__orig=r.render.bind(r); r.render=function(sc,cam){ if(window.__freecam){ r.__orig(sc, window.__freecam); } else r.__orig(sc,cam); }; } var c=new THREE.PerspectiveCamera(" + (fov || 45) + ", 1280/800, 0.1, 2400); c.position.set(" + from.join(',') + "); c.lookAt(" + at.join(',') + "); c.updateProjectionMatrix(); window.__freecam=c; return 1;"); }
async function shot(name, keepHud) { if (!keepHud) await ev("document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1;"); await sleep(320); await pg.screenshot(path.join(OUT, name + '.png')); await ev("document.querySelectorAll('body > *').forEach(function(e){ e.style.visibility=''; }); return 1;"); var st = await ev("var r=P.rendererDebug(); return r && r.info ? { calls: r.info.render.calls, tris: r.info.render.triangles } : null;"); report.shots.push({ name: name, calls: st && st.calls, tris: st && st.tris }); console.log('shot', name, st ? st.calls + ' calls ' + st.tris + ' tris' : ''); }
var report = { shots: [], errors: [], notes: [], console_errors: [] };
pg.on('Runtime.consoleAPICalled', function (p) { if (p.type !== 'error') return; var t = (p.args || []).map(function (a) { return a.value !== undefined ? String(a.value) : (a.description || ''); }).join(' '); if (/toNonIndexed/.test(t)) return; report.console_errors.push(t.slice(0, 400)); });
/* camera placement: the player is teleported near each place first so the streamed layers (meadow chunks, creatures, wildlife) are the ones a player there would see */
async function near(x, z) { await ev("return P.devPlay('PLACE', { x: " + x + ", z: " + z + " });"); await sleep(1400); }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 120000); await sleep(3000); await ev("P.hud.showGuide(false); return 1;");
  for (var i = 0; i < 240; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED') break; await sleep(500); }
  for (var w0 = 0; w0 < 120; w0++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(2500);
  report.world_status = await ev("return P.world().status;"); report.build = await ev("return window.MAHWORLD_BUILD_INFO || null;");
  /* 0. the hub + five spokes from high above (regions, causeways 20 m, forecourts) */
  await near(0, 60); await freeCam([0, 420, -120], [0, 0, 130], 60); await shot('00_plan_hub_and_spokes');
  await freeCam([-300, 220, -200], [0, 0, 120], 55); await shot('01_overview_sw');
  await near(0, 0); await freeCam([-34, 8, -34], [0, 5, 0], 52); await shot('02_nexus_four_truthful_facades');
  /* 1. ATHLETE sanctuary — the gold temple: root skirt, seams, the hovering square-diamond crown, roof diamonds, the causeway forecourt */
  await near(0, 140); await freeCam([-36, 12, 120], [0, 24, 178], 50); await shot('10_athlete_temple_crown');
  await freeCam([-14, 2.2, 132], [4, 4, 160], 55); await shot('11_athlete_forecourt_skirt');
  await freeCam([30, 70, 120], [0, 40, 178], 45); await shot('12_athlete_crown_high');
  /* 2. TITAN sanctuary — the blue tower + gate pillars with caps and beam, the lake, the mountain ledge, the blue meadow */
  await near(90, 66); await freeCam([70, 5, 40], [92, 8, 70], 50); await shot('20_titan_gate');
  await near(112, 80); await freeCam([80, 30, 60], [112, 30, 110], 50); await shot('21_titan_tower_crown');
  await near(140, 124); await freeCam([120, 6, 140], [146, 0, 104], 55); await shot('22_titan_lake_meadow');
  await near(150, 130); await freeCam([140, 26, 150], [165, 12, 130], 50); await shot('23_titan_ledge');
  /* 3. LEAN sanctuary — the spire house on the NW terrace: three spires, crimson blades, the 22 m platform + crown, the red meadow */
  await near(-100, 250); await freeCam([-80, 8, 240], [-110, 14, 272], 50); await shot('30_lean_spire_house');
  await freeCam([-120, 34, 250], [-110, 22, 272], 50); await shot('31_lean_top_platform');
  await freeCam([-96, 2.0, 262], [-110, 6, 272], 60); await shot('32_lean_ground_skirt');
  /* 4. VISIONARY sanctuary — the highland overlook: four supports, the slab, the suspended amethyst core, the pool, the purple meadow */
  await near(-130, 0); await freeCam([-110, 6, -30], [-152, 10, 0], 50); await shot('40_visionary_overlook');
  await freeCam([-150, 30, 30], [-152, 12, 0], 50); await shot('41_visionary_platform_core');
  await near(-94, 30); await freeCam([-80, 4, 46], [-96, 0, 30], 55); await shot('42_visionary_pool');
  /* 5. BAGE sanctuary — the market with its rose crown + entrance frame + converging diamonds, the twin basins with platinum rings */
  await near(0, 236); await freeCam([-10, 3, 226], [0, 5, 243.5], 55); await shot('50_bage_market_entrance');
  await freeCam([-60, 24, 236], [-30, 0, 261], 50); await shot('51_bage_basin_west_ring');
  await freeCam([0, 60, 300], [0, 10, 258], 55); await shot('52_bage_from_north_high');
  await near(60, 258); await freeCam([78, 7, 240], [60, 1, 258], 52); await shot('53_bage_ordered_garden_pack');
  /* 6. ROADS: the gym causeway → forecourt → spur aligned with the real door; the platinum door frame + diamonds */
  await near(-70, 110); await freeCam([-52, 10, 96], [-86, 2, 110], 50); await shot('60_gym_forecourt_spur');
  await freeCam([-72, 2.4, 116], [-86, 3, 110], 55); await shot('61_gym_entrance_frame');
  await near(0, 205); await freeCam([-28, 11, 202], [0, 0, 226], 50); await shot('62_main_bridge_link');
  await near(-112, 205); await freeCam([-140, 10, 205], [-112, 0, 228], 50); await shot('63_west_bridge_link');
  await near(112, 205); await freeCam([140, 10, 205], [112, 0, 228], 50); await shot('64_east_bridge_link');
  /* the four original civic façades are no longer false doors: prove one representative shell through the same authoritative transaction. */
  await near(-17, 0); report.civic_entry = await ev("return P.send('ENTER_ROOM', { room: 'CIVIC_TRAINING_HALL' });"); await sleep(1400); await freeCam([9, 6, 13], [0, 1.5, 0], 52); await shot('65_civic_training_shell'); await ev("return P.devPlay('PLACE', { x: 0, z: 8.4 });"); report.civic_exit = await ev("return P.send('ENTER_ROOM', { room: 'FIELD' });"); await sleep(1600);
  /* 7. MATCH HALL: the platinum ring crown + cyan seams, the door frame at the west face */
  await near(90, 6); await freeCam([80, 8, -20], [122, 14, 6], 50); await shot('70_match_hall_ring');
  /* 8. MEADOW close-up: the blades in the gold family beside the temple causeway */
  await near(20, 150); await freeCam([22, 1.3, 146], [30, 0.1, 152], 55); await shot('80_meadow_close_gold');
  await near(-100, 20); await freeCam([-98, 1.6, 18], [-108, 0.2, 26], 55); await shot('81_meadow_close_purple');
  report.modules = await ev("var d=P.world(); return d.modules ? { architecture: d.modules.architecture, meadow: d.modules.meadow, terrain: d.modules.terrain, forest: d.modules.forest, water: d.modules.water && { rivers: d.modules.water.rivers, drawCalls: d.modules.water.drawCalls }, creatures: d.modules.creatures && { count: d.modules.creatures.count, active: d.modules.creatures.active } } : null;");
  /* 9. MAP */
  await ev("window.__freecam=null; return 1;"); await near(0, 60); await ev("P.menu.open('MAP'); return 1;"); await sleep(900); await shot('90_map', true); await ev("P.menu.close('probe'); return 1;");
  report.errors = pg.errors.filter(function (e) { return !/404|favicon/.test(e); }).slice(0, 20);
} catch (e) { report.fatal = String(e && e.stack || e); console.error(e); } finally { fs.writeFileSync(path.join(OUT, 'sanctuary_proof.json'), JSON.stringify(report, null, 1)); await pg.close(); srv.close(); }
/* PHONE-size frame: portrait 393 × 852 @2, mobile emulation, real HUD, at the Titan gate — EMULATED touch, never iPhone acceptance */
try { var srv2 = await serveStatic(DIST); var pg2 = await launchChrome({ width: 393, height: 852, dpr: 2, mobile: true, gpu: true }); await pg2.goto(srv2.origin + PLAY_PATH + '?field=1&sky=night'); await waitForGame(pg2, 120000); await sleep(3000); for (var j = 0; j < 200; j++) { var ws = await pg2.evaluate("(function(){ var P=window.MAHWORLD_PLAY; return P.world ? P.world().status : null; })()"); if (ws === 'READY' || ws === 'FAILED') break; await sleep(500); } await sleep(2500); await pg2.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); return 1; })()"); report.phone_nav = await pg2.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; return await P.goTo(74, 50, undefined, undefined, 60000); })()"); await sleep(2500); await pg2.screenshot(path.join(OUT, '95_phone_portrait_emulated_titan_gate.png')); var ph = await pg2.evaluate("(function(){ var P=window.MAHWORLD_PLAY; var r=P.rendererDebug(); return r && r.info ? { calls: r.info.render.calls, tris: r.info.render.triangles } : null; })()"); report.phone = ph; console.log('phone frame', JSON.stringify(ph), 'nav', JSON.stringify(report.phone_nav)); await pg2.close(); srv2.close(); fs.writeFileSync(path.join(OUT, 'sanctuary_proof.json'), JSON.stringify(report, null, 1)); } catch (e) { console.error('phone frame', e); }
console.log('RESULT sanctuary_proof ' + (report.fatal ? 'FATAL' : 'OK') + ' shots ' + report.shots.length + ' errors ' + report.errors.length + ' console_errors ' + report.console_errors.length + ' world ' + report.world_status);
