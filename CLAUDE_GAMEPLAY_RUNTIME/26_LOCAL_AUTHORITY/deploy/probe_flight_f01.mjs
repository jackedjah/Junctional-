/* MAHWORLD :: F01 FLIGHT-STATE PROBE — reproduce "meter refilled, still FORCED LANDING, cannot move" (17-44-45 @00:29–04:24).
   Four scenarios in the real runtime (in-page authority, headless Chrome): (A) exhaust the flight resource over CLEAR ground;
   (B) exhaust it while hovering above a non-walkable solid top of a landmark (the recording shows the player over the gym);
   (C) deliberate landing (EXIT) onto a solid top before exhaustion; (D) walk off the perch → unpowered fall → landing below.
   Per 250 ms trace: powered / forced / warning / intent / hold / altitude / ground / height / vz / resource / MOVE + ENTER acceptance.
   node deploy/probe_flight_f01.mjs [static_dist] [--spot x,z] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); var DIST = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out', 'flight'); fs.mkdirSync(OUT, { recursive: true });
var spot = argv.indexOf('--spot') >= 0 ? argv[argv.indexOf('--spot') + 1].split(',').map(Number) : [108.75, 110];   /* TOWER_S122: the blue tower's spire top — the exposed NON-walkable solid top with the most clearance (2.5 × 5 m, top 48.25 m, neighbours ≤ 44.25 m) — the page probe needs the room: an airborne settle glides ~1.7 m after a stop */
var SPOT_TOP = argv.indexOf('--top') >= 0 ? +argv[argv.indexOf('--top') + 1] : 48.25; var CLIMB_MS = argv.indexOf('--climb') >= 0 ? +argv[argv.indexOf('--climb') + 1] : 8500; var APPROACH = [[60, 110]];   /* the tower approach (on foot), 37 m before the west face — free air above for the climb */
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1000, height: 700, gpu: true, unlockFps: true }); var pass = 0, fail = 0, lines = [];
function ok(id, cond, detail) { (cond ? pass++ : fail++); var l = (cond ? 'PASS ' : 'FAIL ') + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''); lines.push(l); console.log(l.slice(0, 600)); }
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function key(code, down) { await pg.evaluate("document.dispatchEvent(new KeyboardEvent('" + (down ? 'keydown' : 'keyup') + "',{code:'" + code + "',key:'" + (code.startsWith('Key') ? code.slice(3).toLowerCase() : code) + "',bubbles:true})); 1"); }
async function tap(code) { await key(code, true); await sleep(40); await key(code, false); }
var TR = "var p=P.snap().play; var f=p.flight; var fm=p.flight_mahgic; return {t:+(performance.now()/1000).toFixed(2), powered:f.powered, forced:f.forced_landing, warning:f.warning, intent:f.intent, hold:f.hold, perch:f.perch, falling:f.falling, alt:f.altitude, ground:f.ground, h:f.height_above_ground, vz:f.vz, res:fm?+fm.current.toFixed(1):null, landed:f.landed_count, pos:[+p.position.x.toFixed(1),+p.position.z.toFixed(1)], mahloco:p.mahloco};";
async function trace() { return await ev(TR); }
async function tryMove() { return await ev("return P.send('MOVE',{forward:1,strafe:0,run:false,yaw:0}).then(function(r){ return r; });"); }
async function tryEnter() { return await ev("return P.send('FLIGHT',{op:'ENTER'}).then(function(r){ return r; });"); }
function accepted(r) { return !!(r && (r.accepted === true || r.ok === true)); }
var report = { spot: spot, scenarios: {} }; var ONLY = argv.indexOf('--only') >= 0 ? argv[argv.indexOf('--only') + 1] : null;
async function scenario(name, fn) { console.log('\n== ' + name); var rows = []; report.scenarios[name] = rows; await fn(rows); }
async function walkApproach() { for (var i = 0; i < APPROACH.length; i++) await ev("return P.goTo(" + APPROACH[i][0] + ", " + APPROACH[i][1] + ", undefined, undefined, 60000);"); await sleep(400); }
async function flyOverSpot() { /* take off, climb above the whole gym (Space held ~9 s), fly to the spot, settle, C down to top + 6, release = hold */
  /* climb in free air ABOVE the landmark first (overhangs cap a climb from below), then travel to the spot (the pool lasts ~40 s: the approach starts 7.7 m from the facade) */
  await tap('KeyF'); await sleep(300); await key('Space', true); await sleep(CLIMB_MS); await key('Space', false); await sleep(300); var reached = false;
  for (var i = 0; i < 100; i++) { var t = await trace(); var dx = spot[0] - t.pos[0], dz = spot[1] - t.pos[1]; var d = Math.hypot(dx, dz); if (d < 0.8) { reached = true; break; } await ev("return P.send('MOVE',{forward:" + (-dz / d * 0.8).toFixed(3) + ",strafe:" + (dx / d * 0.8).toFixed(3) + ",run:false,yaw:" + Math.atan2(dx, -dz).toFixed(3) + "});"); await sleep(200); }
  await ev("return P.send('MOVE',{forward:0,strafe:0,run:false});"); await sleep(1000);
  /* fine settle: short pulses toward the spot, each followed by a full glide-out (the host decelerates after a stop), until within 0.5 m */
  for (var k = 0; k < 6; k++) { var t2 = await trace(); var dx2 = spot[0] - t2.pos[0], dz2 = spot[1] - t2.pos[1]; var d2 = Math.hypot(dx2, dz2); if (d2 < 0.6) break; var ms = Math.max(40, Math.min(600, Math.sqrt(d2 / 7) * 1000 - 60));   /* s ≈ ½·accel·T² with accel 14 m/s² (decel 40: the glide is negligible), minus the command latency */ await ev("return P.send('MOVE',{forward:" + (-dz2 / d2).toFixed(3) + ",strafe:" + (dx2 / d2).toFixed(3) + ",run:false,yaw:0});"); await sleep(ms); await ev("return P.send('MOVE',{forward:0,strafe:0,run:false});"); await sleep(900); }
  await key('KeyC', true); for (var j = 0; j < 60; j++) { var t3 = await trace(); if (t3.alt <= SPOT_TOP + 6) break; await sleep(100); } await key('KeyC', false); await sleep(1200); return reached; }
async function waitRes(min, ms) { var end = Date.now() + ms; var t = null; while (Date.now() < end) { t = await trace(); if (t.res !== null && t.res >= min) return t; await sleep(500); } return t; }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 120000); await sleep(7000); await ev("P.hud.showGuide(false); return 1;");
  for (var w = 0; w < 120; w++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(500);
  /* ── A: clear ground ── */
  await scenario('A_clear_ground', async function (rows) {
    await ev("return P.goTo(20, 20, undefined, undefined, 60000);"); await sleep(600); var t0 = await trace(); rows.push(t0);
    await tap('KeyF'); await sleep(1500); await key('Space', true); await sleep(2500); await key('Space', false); var t1 = await trace(); rows.push(t1); ok('A1 took off, hovering above clear ground', t1.powered && t1.h > 3, t1);
    var deadline = Date.now() + 75000; var landedAt = null, forcedSeen = false, last = null; while (Date.now() < deadline) { var t = await trace(); rows.push(t); last = t; if (t.forced) forcedSeen = true; if (!t.powered && !t.forced && t.landed > t0.landed) { landedAt = t; break; } await sleep(250); }
    var warnSeen = rows.some(function (r) { return r.warning; }); ok('A2 resource exhaustion → landing (low-energy controller and/or forced) → terminal landed state on clear ground', (forcedSeen || warnSeen) && !!landedAt && landedAt.h < 0.05, { forced_seen: forcedSeen, warning_seen: warnSeen, landed: landedAt || last });
    await sleep(1200); var mv = await tryMove(); ok('A3 after the landing MOVE is accepted (no stale FORCED_LANDING lock)', accepted(mv), mv); await ev("return P.send('MOVE',{forward:0,strafe:0,run:false});");
    var tE = await trace(); var en = await tryEnter(); ok('A4 ENTER right after exhaustion answers by the rules (NO_FLIGHT_ENERGY while the pool is empty, or accepted)', (en && en.reason === 'NO_FLIGHT_ENERGY') || accepted(en), { res: tE.res, enter: en });
    if (accepted(en)) { await sleep(800); await ev("return P.send('FLIGHT',{op:'EXIT'});"); await sleep(4000); }
    await waitRes(20, 45000); var en2 = await tryEnter(); ok('A5 with resource regained, takeoff is permitted again', accepted(en2), en2); await sleep(600); await ev("return P.send('FLIGHT',{op:'EXIT'});"); await sleep(5000);
  });
  /* ── B: above a non-walkable solid top ── */
  await scenario('B_over_solid_top', async function (rows) {
    await waitRes(98, 80000);
    await walkApproach(); var t0 = await trace(); rows.push(t0); var reached = await flyOverSpot(); var tS = await trace(); rows.push(tS);
    ok('B1 hovering above the solid top ' + JSON.stringify(spot) + ' (powered, intent 0, altitude between top + 1 and top + 8, within 1.2 m of the spot)', reached && tS.powered && tS.intent === 0 && tS.alt > SPOT_TOP + 1 && tS.alt < SPOT_TOP + 8 && Math.hypot(tS.pos[0] - spot[0], tS.pos[1] - spot[1]) < 1.2, tS);
    var deadline = Date.now() + 75000; var forcedSeen = false, holdSeen = null, landedAt = null, last = null; while (Date.now() < deadline) { var t = await trace(); rows.push(t); last = t; if (t.forced) forcedSeen = true; if (t.hold) holdSeen = t; if (!t.powered && !t.forced && t.landed > t0.landed) { landedAt = t; break; } await sleep(250); }
    var warnSeen2 = rows.some(function (r) { return r.warning; }); var mv = await tryMove(); await ev("return P.send('MOVE',{forward:0,strafe:0,run:false});"); var en = await tryEnter();
    ok('B2 exhaustion above a solid top: the REQUIRED landing (low-energy controller and/or zero-energy forced descent) reaches a terminal landed state on the support (perch) — the 17-44-45 defect is the hold that never lands; the pure zero-energy case is 16_TESTS/gameplay_flight_f01.test.mjs #8', (forcedSeen || warnSeen2) && !!landedAt && !!landedAt.perch, { forced_seen: forcedSeen, warning_seen: warnSeen2, hold_seen: holdSeen ? { hold: holdSeen.hold, alt: holdSeen.alt, ground: holdSeen.ground } : null, last: last, landed: landedAt });
    var warnTxt = await ev("var w=document.getElementById('g-warn'); return w?{shown:w.style.display!=='none', text:w.textContent}:null;"); ok('B3 afterwards the HUD state and permissions agree: not forced, no EMPTY — LANDING notice, MOVE accepted, ENTER answers by the rules', last && !last.forced && accepted(mv) && !!(en && (accepted(en) || en.reason === 'NO_FLIGHT_ENERGY')) && !(warnTxt && warnTxt.shown && /LANDING/.test(warnTxt.text)), { last: last, move: mv, enter: en, warn: warnTxt });
    if (accepted(en)) { await sleep(500); await ev("return P.send('FLIGHT',{op:'EXIT'});"); for (var q2 = 0; q2 < 60; q2++) { var tq = await trace(); if (!tq.powered) break; await sleep(250); } await sleep(600); }
    await pg.screenshot(path.join(OUT, 'f01_B_end.png'));
    /* ── D: walk off the perch → fall → land below (no teleport, no endless state) ── */
    var tP = await trace(); if (tP.perch) { var fell = false, landedD = null, fallRows = []; var dl2 = Date.now() + 20000; var mvAcc = 0; while (Date.now() < dl2) { var mv2 = await ev("return P.send('MOVE',{forward:0,strafe:-1,run:true,yaw:0});"); if (accepted(mv2)) mvAcc++; var t = await trace(); rows.push(t); fallRows.push(t); if (t.falling) fell = true; if (fell && !t.forced && !t.falling && t.landed > tP.landed) { landedD = t; break; } await sleep(200); }
      await ev("return P.send('MOVE',{forward:0,strafe:0,run:false});"); var maxDrop = 0; for (var q = 1; q < fallRows.length; q++) maxDrop = Math.max(maxDrop, fallRows[q - 1].alt - fallRows[q].alt);
      report.scenarios.D_walk_off_perch = fallRows; ok('D1 walking off the perch starts a FALL (falling flag, forced descent) and ends in a completed landing below', fell && !!landedD, { perch: tP.perch, from_alt: tP.alt, landed: landedD, moves_accepted: mvAcc });
      ok('D2 the fall is continuous (no teleport: max drop per ~200 ms sample ≤ 4.5 m at the 9 m/s descent cap, sampling jitter included)', fallRows.length > 1 && maxDrop <= 4.5, { max_drop_per_sample: +maxDrop.toFixed(2), samples: fallRows.length });
    } else ok('D0 (skipped) not perched after scenario B', false, tP);
  });
  /* ── C: deliberate landing (EXIT) onto a solid top before exhaustion ── */
  await scenario('C_deliberate_land_on_solid', async function (rows) {
    await waitRes(98, 90000); await walkApproach(); var t0 = await trace(); rows.push(t0); var reached = await flyOverSpot(); var tS = await trace(); rows.push(tS); await tap('KeyF'); var ex = { accepted: true, via: 'F key while flying = deliberate landing (EXIT)' };
    var landedC = null, last = null, dl3 = Date.now() + 30000; while (Date.now() < dl3) { var t = await trace(); rows.push(t); last = t; if (!t.powered && !t.forced && t.landed > t0.landed) { landedC = t; break; } await sleep(250); }
    var mv = await tryMove(); await ev("return P.send('MOVE',{forward:0,strafe:0,run:false});"); await waitRes(45, 30000); var en = await tryEnter();
    ok('C1 a deliberate landing (F while flying) above the landmark completes on a support up there (the spire top = perch, or the deck beside it when the airborne settle drifted past the 2.5 m spire), resource still available, no forced flag — the perch case itself is proven by 16_TESTS/gameplay_flight_f01.test.mjs #3', reached && accepted(ex) && !!landedC && !landedC.forced && landedC.res > 5 && landedC.alt >= SPOT_TOP - 5 && (!!landedC.perch || Math.abs(landedC.alt - landedC.ground) < 0.06), { exit: ex, landed: landedC, support: landedC && (landedC.perch ? 'perch ' + landedC.perch : 'deck at ' + landedC.ground), last: last });
    ok('C2 while perched: MOVE accepted and ENTER accepted (takeoff from the perch clears it)', accepted(mv) && accepted(en), { move: mv, enter: en });
    await sleep(600); var tA = await trace(); rows.push(tA); ok('C3 after takeoff from the perch the body is powered and no perch is reported', tA.powered && !tA.perch, tA); await ev("return P.send('FLIGHT',{op:'EXIT'});"); await sleep(3000);
  });
  ok('Z zero page / console errors', pg.errors.filter(function (x) { return !/404/.test(x); }).length === 0, pg.errors.slice(0, 3));
} catch (e) { ok('X probe completed without an exception', false, String(e && e.stack || e)); }
finally { await pg.close(); srv.close(); }
report.pass = pass; report.fail = fail; report.checks = lines; fs.writeFileSync(path.join(OUT, 'f01_trace.json'), JSON.stringify(report, null, 1));
console.log('\nRESULT F01: ' + pass + ' passed, ' + fail + ' failed · ' + path.join(OUT, 'f01_trace.json')); process.exit(fail ? 1 : 0);
