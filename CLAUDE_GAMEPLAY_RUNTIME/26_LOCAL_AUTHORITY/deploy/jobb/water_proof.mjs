/* JOB B interjection proof (owner 2026-09-19 — environment + guide scale): everything captured from the REAL playable runtime with the
   game's own follow camera (no free camera): the canal at rest (ambient motion), the player WADING in from the bank (contact ripples
   expanding and fading over a timed frame series), running through the water, two hook impulses overlapping, a flight LANDING splash,
   the floating crystal pads riding the waves, and the Mrs. Mah screen-presence measurement (her projected height vs the player's head
   and the reference ratio). node deploy/jobb/water_proof.mjs [--night] [--mobile] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); var night = argv.indexOf('--night') >= 0; var mobile = argv.indexOf('--mobile') >= 0;
var OUT = path.join(HERE, '..', 'probe_out', 'jobb', 'water' + (night ? '_night' : '') + (mobile ? '_mobile' : '')); fs.mkdirSync(OUT, { recursive: true });
var DIST = path.join(HERE, '..', 'static_dist'); var srv = await serveStatic(DIST); var pg = await launchChrome(mobile ? { width: 393, height: 852, gpu: true, unlockFps: true, mobile: true, dpr: 2 } : { width: 1280, height: 800, gpu: true, unlockFps: true });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
var stage = ''; function mark(s2) { stage = s2; report.stage = s2; fs.writeFileSync(path.join(OUT, 'water_proof.json'), JSON.stringify(report, null, 1)); }
async function shot(name) { mark(name); await ev("document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1;"); await sleep(60); await pg.screenshot(path.join(OUT, name + '.png')); await ev("document.querySelectorAll('body > *').forEach(function(e){ e.style.visibility=''; }); return 1;"); }
async function water() { return await ev("var wb=P.worldLayer(); var w=wb && wb.modules().water; return w && w.debug ? w.debug() : null;"); }
var report = { night: night, mobile: mobile, steps: [], errors: [], console: [] }; pg.on('Runtime.consoleAPICalled', function (p) { if ((p.type === 'warning' || p.type === 'error') && report.console.length < 40) { var t = (p.args || []).map(function (a) { return a.value !== undefined ? String(a.value) : (a.description || a.type); }).join(' ').slice(0, 300); if (!/toNonIndexed/.test(t)) report.console.push(p.type + ': ' + t); } });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1' + (night ? '&sky=night' : '')); await waitForGame(pg, 120000); await sleep(3000); await ev("P.hud.showGuide(false); return 1;");
  for (var i = 0; i < 240; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED') break; await sleep(500); }
  for (var w0 = 0; w0 < 120; w0++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(1500);
  var wd = await water(); report.water = wd; console.log('water', JSON.stringify(wd && wd.ripples));
  /* 1. approach the canal on foot (the navigator plans; the drop into the water is a 35 cm wade) and rest on the bank: ambient motion + floats */
  await ev("return P.goTo(-40, 200, undefined, undefined, 60000);"); await sleep(400); await ev("return P.goTo(-40, 213, undefined, undefined, 40000);"); await sleep(1200); await ev("P.camFollow(true); P.cam(3.14, 0.28, 7.5, 6); return 1;"); await sleep(1200); await shot('01_bank_rest');
  /* 2. wade in: MOVE forward for 1.2 s, stop, then the timed series (impact → expansion → damping → calm) */
  await ev("P.send('MOVE', { forward: -1, strafe: 0, run: false, fast: true, yaw: 3.1416 }); return 1;"); await sleep(1300); await ev("P.send('MOVE', { forward: 0, strafe: 0 }); return 1;");
  var series = [0, 350, 800, 1500, 2600, 4200]; var t0 = Date.now(); for (var k = 0; k < series.length; k++) { var wait = series[k] - (Date.now() - t0); if (wait > 0) await sleep(wait); await shot('02_wade_stop_' + (k + 1) + '_' + series[k] + 'ms'); }
  var pos = await ev("var p=P.snap().play; return { pos: p.position, alt: p.flight.altitude, ground: p.flight.ground };"); report.steps.push({ id: 'wade', pos: pos, water: (await water()).ripples }); console.log('wade', JSON.stringify(pos));
  /* 3. run through the water (continuous wake) */
  await ev("P.send('MOVE', { forward: 0, strafe: 1, run: true, fast: true, yaw: 0 }); return 1;"); await sleep(900); await shot('03_run_wake_a'); await sleep(700); await shot('03_run_wake_b'); await ev("P.send('MOVE', { forward: 0, strafe: 0 }); return 1;"); await sleep(600);
  /* 4. two hook impulses 5 m apart → overlapping rings (the hook JOB A's projectiles will call) */
  var me = await ev("return P.snap().play.position;"); await ev("var w=P.worldLayer().modules().water; w.impulse(" + (me.x + 2.5) + ", " + (me.z + 3) + ", 0.9, 1.0); w.impulse(" + (me.x - 2.5) + ", " + (me.z + 3) + ", 0.9, 1.0); return 1;"); await sleep(250); await shot('04_two_impulses_a'); await sleep(600); await shot('04_two_impulses_b'); await sleep(900); await shot('04_two_impulses_c');
  /* 5. flight landing splash: enter flight, ascend a little, exit over the water → landed_count increments → splash */
  await ev("P.send('FLIGHT', { op: 'ENTER' }); return 1;"); await sleep(300); await ev("P.send('FLIGHT', { op: 'ASCEND' }); return 1;"); await sleep(1500); await ev("P.send('FLIGHT', { op: 'HOVER' }); return 1;"); await sleep(400); await shot('05_hover_over_water'); await ev("P.send('FLIGHT', { op: 'EXIT' }); return 1;");
  for (var l = 0; l < 30; l++) { await sleep(120); var f = await ev("var p=P.snap().play; return { powered: p.flight.powered, alt: p.flight.altitude, landed: p.flight.landed_count };"); if (!f.powered && f.alt < 0.1) break; } await shot('05_landing_splash_a'); await sleep(450); await shot('05_landing_splash_b'); await sleep(900); await shot('05_landing_splash_c');
  report.steps.push({ id: 'landing', water: (await water()).ripples });
  /* 6. floating pads close-up from the follow camera looking along the canal */
  await ev("P.camFollow(false); P.cam(1.57, 0.2, 9, 6); return 1;"); await sleep(900); await shot('06_float_pads');
  /* 7. Mrs. Mah screen presence in the REAL rear-follow camera at rest and while running; measured: her projected height vs the head */
  await ev("return P.goTo(-40, 205, undefined, undefined, 40000);"); await sleep(400); await ev("var g=P.worldLayer().guides(); g.setGuide('MRS'); g.setVisible(true); P.camFollow(true); P.cam(3.14, 0.22, undefined, 6); return 1;"); await sleep(3000);
  async function measure(tag) { var m = await ev("var g=P.worldLayer().guides(); var d=g.debug(); var sc=P.sceneDebug(); var r=sc.getObjectByName('GUIDE_MRS'); if(!r) return null; var THREE=P.THREE; var box=new THREE.Box3().setFromObject(r); var c=box.getCenter(new THREE.Vector3()); var top=P.projectPoint(c.x, box.max.y, c.z), bot=P.projectPoint(c.x, box.min.y, c.z); var me=P.snap().play.position; var cam=P.cameraDebug(); var hd=cam && cam.H ? cam.H : 2.0; var headTop=P.projectPoint(me.x, hd, me.z), headBot=P.projectPoint(me.x, hd - 0.28, me.z); return { guide_px: Math.abs(bot.sy - top.sy), head_px: Math.abs(headBot.sy - headTop.sy), guide_on: top.on_screen !== false, height_m: d.height_m, pos: d.pos, follow: d.follow, view_h: innerHeight };"); if (m) { m.ratio_guide_over_head = +(m.guide_px / Math.max(1, m.head_px)).toFixed(2); m.reference_ratio = 0.66; m.target_ratio = 2.0; m.x_over_reference = +(m.ratio_guide_over_head / 0.66).toFixed(2); } report.steps.push({ id: 'guide_' + tag, m: m }); console.log('guide', tag, JSON.stringify(m)); return m; }
  await shot('07_mrs_rest'); await measure('rest');
  await ev("P.send('MOVE', { forward: -1, strafe: 0, run: true, fast: true, yaw: 3.1416 }); return 1;"); await sleep(1400); await shot('07_mrs_running'); await measure('running'); await ev("P.send('MOVE', { forward: 0, strafe: 0 }); return 1;"); await sleep(800);
  await ev("var g=P.worldLayer().guides(); g.setGuide('MR'); return 1;"); await sleep(2500); await shot('07_mr_rest');
  report.errors = pg.errors.filter(function (e) { return !/404|favicon/.test(e); }).slice(0, 20); console.log('errors', report.errors.slice(0, 5));
} catch (e) { report.fatal = String(e && e.stack || e); console.error(e); } finally { fs.writeFileSync(path.join(OUT, 'water_proof.json'), JSON.stringify(report, null, 1)); await pg.close(); srv.close(); }
console.log('RESULT water_proof ' + (report.fatal ? 'FATAL' : 'OK') + ' errors ' + report.errors.length);
