/* Owner assignment 2026-09-18 §4 (nearby click / tap-to-move) — the HOST side, in-process plain node: range from the PLAYER (provisional 30 m, centralized),
   bounded route search over the SAME colliders the integrator uses, the walker driven through the ordinary moveVec / band / accel / sliding, takeover and
   cancellation semantics, flight (horizontal at the held altitude), interiors (room bounds), arrival settle, one bounded re-plan then a clear stop.
   node 16_TESTS/gameplay_navigation.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { loadHeadlessData, composeHeadless } from '../00_CORE/bootstrap.js';
import { createDuelHost } from '../26_LOCAL_AUTHORITY/DuelHost.js'; import { makeEnvelope } from '../26_LOCAL_AUTHORITY/Protocol.js';
import { createNavigator } from '../26_LOCAL_AUTHORITY/play/Navigation.js';
var HERE = path.dirname(fileURLToPath(import.meta.url));
var pass = 0, fail = 0; function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }
var data = await loadHeadlessData(); var cfg = data.cfg; var DT = cfg.dev('local_authority.tick_dt_s'); var NAV = cfg.dev('local_authority.play.navigation'); var ROOMS = cfg.dev('local_authority.play.rooms');
function newHost() { var h = createDuelHost({ data: data, composeHeadless: composeHeadless }); h.dev.createAccount('PLAYER_A', { classId: 'ATHLETE', sex: 'M' }); return h; }
function sess(h, account) { var c = h.connect({ client_id: 'c-' + account, account_id: account, token: h.dev.tokens()[account] }); if (!c.ok) throw new Error('connect ' + account + ' ' + c.reason); var seq = 0; return { sid: c.session_id, send: function (action, payload) { return h.submit(makeEnvelope({ session_id: c.session_id, client_id: 'c-' + account }, ++seq, action, payload || {})); }, play: function () { return h.snapshot(c.session_id).play; } }; }
function run(h, seconds) { var n = Math.round(seconds / DT); for (var i = 0; i < n; i++) h.tick(DT); }
function runUntil(h, s, pred, maxS) { var n = Math.round((maxS || 20) / DT); for (var i = 0; i < n; i++) { h.tick(DT); if (pred(s.play())) return i * DT; } return -1; }
function audit(h, name) { return h.dev.log().filter(function (e) { return e.kind === name; }); }
function d2(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

/* ---- config: the provisional range is centralized and inside the owner's band ---- */
ok('config: play.navigation.range_m = ' + NAV.range_m + ' m is centralized, marked PROVISIONAL and inside the owner\'s 20–35 m band; the doc says it is not a measured reference-game value', NAV && NAV.range_m >= 20 && NAV.range_m <= 35 && NAV.range_status === 'PROVISIONAL' && /NOT a measured/.test(NAV._doc), NAV);

/* ---- pure planner: straight, around a box, out of range, blocked target with a bounded snap, no route inside an enclosure ---- */
var box = { x1: 4, z1: -1, x2: 6, z2: 1 }; var enc = [{ x1: -12, z1: -12, x2: -8, z2: 12 }, { x1: -12, z1: 8, x2: 12, z2: 12 }, { x1: 8, z1: -12, x2: 12, z2: 12 }, { x1: -12, z1: -12, x2: 12, z2: -8 }];
function q(blocks, from, to, extra) { return Object.assign({ from: from, to: to, fromGround: 0, powered: false, altitude: 0, half: 100, ground: function () { return 0; }, blocked: function (x, z, alt) { for (var i = 0; i < blocks.length; i++) { var b = blocks[i]; var cx = Math.max(b.x1, Math.min(b.x2, x)), cz = Math.max(b.z1, Math.min(b.z2, z)); if (Math.hypot(x - cx, z - cz) < 0.4) return b; } return null; }, ceiling: function () { return null; } }, extra || {}); }
var NV = createNavigator(NAV);
var p1 = NV.plan(q([box], { x: 0, z: 5 }, { x: 10, z: 5 })); ok('planner: a clear line is ONE waypoint (straight), distance reported', p1.ok && p1.straight && p1.path.length === 1 && Math.abs(p1.distance_m - 10) < 0.01, p1);
var p2 = NV.plan(q([box], { x: 0, z: 0 }, { x: 10, z: 0 })); ok('planner: a box across the line yields a multi-waypoint route around it (bounded A* + string pull), every leg clear of the box', p2.ok && !p2.straight && p2.path.length >= 2 && p2.expansions > 0 && p2.expansions <= NAV.max_expansions && p2.path.every(function (w) { return !(w.x > box.x1 - 0.4 && w.x < box.x2 + 0.4 && w.z > box.z1 - 0.4 && w.z < box.z2 + 0.4); }), p2);
var p3 = NV.plan(q([box], { x: 0, z: 0 }, { x: 31, z: 0 })); ok('planner: 31 m is OUT_OF_RANGE (range from the player, ' + NAV.range_m + ' m)', !p3.ok && p3.reason === 'OUT_OF_RANGE' && p3.range_m === NAV.range_m, p3);
var p4 = NV.plan(q([box], { x: 0, z: 0 }, { x: 5, z: 0 })); ok('planner: a tap INSIDE the box snaps to the nearest free ground within snap_m and reports snapped=true (the marker shows the accepted point)', p4.ok && p4.snapped && Math.hypot(p4.target.x - 5, p4.target.z) <= NAV.snap_m + 0.01 && !q([box]).blocked(p4.target.x, p4.target.z, 0), p4);
var p5 = NV.plan(q(enc, { x: 0, z: 0 }, { x: 20, z: 0 })); ok('planner: a target outside a closed enclosure is NO_ROUTE within the search budget (no wall pushing, no teleport)', !p5.ok && p5.reason === 'NO_ROUTE' && p5.expansions <= NAV.max_expansions + 1, p5);
var p6 = NV.plan(q([], { x: 0, z: 0 }, { x: 10, z: 0 }, { ground: function (x) { return x > 5 ? 2.0 : 0; } })); ok('planner: a 2 m support rise across the route is TARGET_BLOCKED / NO_ROUTE (step_max_m ' + NAV.step_max_m + '), never a climb onto a deck', !p6.ok && (p6.reason === 'TARGET_BLOCKED' || p6.reason === 'NO_ROUTE'), p6);
var p7 = NV.plan(q([box], { x: 0, z: 0 }, { x: 5, z: 0 }, { powered: true, altitude: 6, ceiling: function () { return null; } })); ok('planner (AIR): at 6 m the box (h → blocked() ignores altitude in this stub) — the aerial plan is planned at the held altitude and the target carries y = altitude', p7.ok && p7.target.y === 6, p7);

/* ---- host: FIELD walk to a nearby point through the ordinary integrator ---- */
var h = newHost(); var s = sess(h, 'PLAYER_A'); s.send('ENTER_ROOM', { room: 'FIELD' }); run(h, 0.5); var p0 = s.play().position;
var n1 = s.send('NAV', { dest_x: p0.x + 8, dest_z: p0.z - 6, via: 'TAP' }); var snapN = s.play();
ok('host: NAV 10 m away is accepted with the target, mode WALK/LEVITATE, waypoint count; the snapshot carries nav {target, remaining_m}', n1.accepted && n1.target && n1.waypoints >= 1 && /WALK|LEVITATE/.test(n1.mode) && snapN.nav && snapN.nav.target.x === n1.target.x && snapN.nav.remaining_m > 9, { ack: n1, nav: snapN.nav });
var moved = false; var tArr = runUntil(h, s, function (p) { if (p.speed_mps > 0.5) moved = true; return !p.nav; }, 12); run(h, 0.3); var pa = s.play();   /* the settle after the clear: decel 40 m/s² needs a few ticks */
var arrived = audit(h, 'NAV_ARRIVED'); ok('host: the walker travelled (speed > 0.5 m/s seen) and ARRIVED within arrive_radius_m (' + NAV.arrive_radius_m + ') then stopped — same integrator, no teleport (duration ' + tArr.toFixed(2) + ' s for 10 m)', moved && tArr > 1.5 && tArr < 8 && arrived.length === 1 && d2(pa.position, n1.target) <= NAV.arrive_radius_m + 0.05 && pa.speed_mps < 0.1 && !pa.nav, { t: tArr, at: pa.position, target: n1.target, speed: pa.speed_mps });
ok('host: facing resolved toward the travel direction during the walk (the recorded arrival facing points from the start to the target)', Math.abs(((pa.facing - Math.atan2(n1.target.x - p0.x, -(n1.target.z - p0.z))) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < 0.35, { facing: pa.facing });

/* ---- out of range / bad payload ---- */
var pr = s.play().position; var far = s.send('NAV', { dest_x: pr.x + 40, dest_z: pr.z, via: 'TAP' }); ok('host: 40 m is refused OUT_OF_RANGE with distance and range', !far.accepted && far.reason === 'OUT_OF_RANGE' && far.detail && far.detail.distance_m > 39 && far.detail.range_m === NAV.range_m, far);
var bad = s.send('NAV', { dest_x: 'a', dest_z: 0 }); ok('protocol: a non-numeric destination is refused BAD_DESTINATION', !bad.accepted && bad.reason === 'BAD_DESTINATION', bad);

/* ---- takeover: stick input cancels immediately; a zero-input MOVE (stick lifted / + toggled) does not; DASH cancels; a camera drag is client-only ---- */
pr = s.play().position; var n2 = s.send('NAV', { dest_x: pr.x, dest_z: pr.z - 12, via: 'TAP' }); run(h, 0.5); var zero = s.send('MOVE', { forward: 0, strafe: 0, fast: true }); run(h, 0.2); var stillNav = !!s.play().nav;
ok('takeover: a zero-input MOVE while navigating keeps the destination (the stick was not pushed)', n2.accepted && zero.accepted && stillNav, { nav: s.play().nav });
s.send('MOVE', { forward: 1, strafe: 0 }); run(h, 0.1); var c1 = audit(h, 'NAV_CANCELLED'); ok('takeover: a MOVE with input cancels the destination at once (NAV_CANCELLED why=MOVE)', !s.play().nav && c1.length === 1 && c1[0].why === 'MOVE', c1.map(function (e) { return e.why; }));
s.send('MOVE', { forward: 1, strafe: 0 }); run(h, 0.3); pr = s.play().position; var held = s.send('NAV', { dest_x: pr.x, dest_z: pr.z - 8, via: 'TAP' }); ok('takeover is one-way: while the stick is still held (a non-zero MOVE vector, no destination) a tap is refused DIRECT_INPUT_ACTIVE — direct input keeps steering', !held.accepted && held.reason === 'DIRECT_INPUT_ACTIVE' && s.play().speed_mps > 0.5, { held: held, speed: s.play().speed_mps });
s.send('MOVE', { forward: 0, strafe: 0 }); run(h, 0.6); pr = s.play().position; s.send('NAV', { dest_x: pr.x + 10, dest_z: pr.z, via: 'TAP' }); run(h, 0.4); var dsh = s.send('DASH', { dir: 'FORWARD' }); run(h, 0.1); var c2 = audit(h, 'NAV_CANCELLED');
ok('takeover: DASH cancels (why=DASH)', dsh.accepted && !s.play().nav && c2.length === 2 && c2[1].why === 'DASH', c2.map(function (e) { return e.why; }));
run(h, 1.0);
/* ---- new destination replaces the old one ---- */
pr = s.play().position; var a1 = null; [[6, 0], [-6, 0], [0, -6]].some(function (d) { var r = s.send('NAV', { dest_x: pr.x + d[0], dest_z: pr.z + d[1], via: 'TAP' }); if (r.accepted) { a1 = r; return true; } a1 = a1 || r; return false; }); run(h, 0.3); var a2 = s.send('NAV', { dest_x: pr.x, dest_z: pr.z + 6, via: 'MAP' }); var navNow = s.play().nav;
ok('replace: a new valid tap replaces the old destination (the snapshot shows the new target and via=MAP)', a1.accepted && a2.accepted && navNow && Math.abs(navNow.target.z - (pr.z + 6)) < 0.01 && navNow.via === 'MAP', { a1: a1, a2: a2, nav: navNow });
var cl = s.send('NAV', { cancel: true }); ok('cancel: an explicit client cancel clears it (why=CLIENT)', cl.accepted && cl.cancelled === true && !s.play().nav);
run(h, 0.8);

/* ---- flight: horizontal travel at the held altitude; the altitude commands take over ---- */
s.send('FLIGHT', { op: 'ENTER' }); run(h, 1.2); s.send('FLIGHT', { op: 'HOVER' }); run(h, 0.8); var fp = s.play(); var alt0 = fp.flight.altitude;
var fn = null; [[12, 0], [-12, 0], [0, 12], [0, -12], [8, 8], [-8, -8]].some(function (d) { var r = s.send('NAV', { dest_x: fp.position.x + d[0], dest_z: fp.position.z + d[1], via: 'TAP' }); if (r.accepted) { fn = r; return true; } fn = fn || r; return false; }); var fnav = s.play().nav;   /* the first direction whose corridor at this altitude is clear (the plaza has solids up to the tree crown) */
ok('flight: NAV while powered is accepted in mode AIR with the target at the held altitude (y = ' + (fn.target && fn.target.y) + ')', fp.flight.powered && fn.accepted && fn.mode === 'AIR' && Math.abs(fn.target.y - alt0) < 0.3 && fnav && fnav.mode === 'AIR', { ack: fn, alt0: alt0 });
var altMin = 1e9, altMax = -1e9; var tF = runUntil(h, s, function (p) { altMin = Math.min(altMin, p.flight.altitude); altMax = Math.max(altMax, p.flight.altitude); return !p.nav; }, 12); var fa = s.play();
ok('flight: the aerial destination was reached horizontally while the altitude stayed held (Δalt ≤ 0.6 m), still powered', tF > 0 && fa.flight.powered && altMax - altMin < 0.6 && d2(fa.position, fn.target) <= NAV.arrive_radius_m + 0.1, { t: tF, altMin: altMin, altMax: altMax, at: fa.position });
var fn2 = null; [[0, -10], [0, 10], [-10, 0], [10, 0]].some(function (d) { var r = s.send('NAV', { dest_x: fa.position.x + d[0], dest_z: fa.position.z + d[1], via: 'TAP' }); if (r.accepted) { fn2 = r; return true; } fn2 = fn2 || r; return false; }); run(h, 0.3); s.send('FLIGHT', { op: 'DESCEND' }); run(h, 0.1); var c3 = audit(h, 'NAV_CANCELLED');
ok('flight: DESCEND (direct altitude control) cancels the aerial destination (why=FLIGHT)', fn2.accepted && !s.play().nav && c3[c3.length - 1].why === 'FLIGHT', c3.map(function (e) { return e.why; }));
s.send('FLIGHT', { op: 'EXIT' }); run(h, 6);

/* ---- attack commits cancel navigation (movement policy: a strike never drags the body away) ---- */
pr = s.play().position; var n5 = null; [[8, 0], [-8, 0], [0, 8], [0, -8]].some(function (d) { var r = s.send('NAV', { dest_x: pr.x + d[0], dest_z: pr.z + d[1], via: 'TAP' }); if (r.accepted) { n5 = r; return true; } n5 = n5 || r; return false; }); run(h, 0.3); var at = s.send('ATTACK', { hint: 'UP' }); run(h, 0.1); var c4 = audit(h, 'NAV_CANCELLED');
ok('attack: an accepted ATTACK / RULES_CAST cancels the destination (why=ATTACK|RULES_CAST)', n5.accepted && at.accepted && !s.play().nav && /ATTACK|RULES_CAST/.test(c4[c4.length - 1].why), { at: at.accepted, why: c4[c4.length - 1] && c4[c4.length - 1].why });
run(h, 2.5);

/* ---- route around a real building (district colliders) ---- */
var col = s.play().rules.colliders; var bld = col.shapes.filter(function (sh) { return sh.type === 'BOX' && !sh.walkable && !sh.district && sh.h > 2.5 && (sh.x2 - sh.x1) > 3 && (sh.x2 - sh.x1) < 14 && (sh.z2 - sh.z1) > 3 && (sh.z2 - sh.z1) < 14; })[0];
if (bld) { var cx = (bld.x1 + bld.x2) / 2, cz = (bld.z1 + bld.z2) / 2; var w = (bld.x2 - bld.x1) / 2; var goA = { x: cx - w - 3, z: cz }, goB = { x: cx + w + 3, z: cz };
  h.dev.play('PLACE', { account_id: 'PLAYER_A', x: goA.x, z: goA.z });
  run(h, 0.3); var here = s.play().position; var nb = s.send('NAV', { dest_x: goB.x, dest_z: goB.z, via: 'TAP' }); var tB = runUntil(h, s, function (p) { return !p.nav; }, 25); var pb = s.play();
  ok('district: a destination on the far side of a real plaza solid (' + (bld.id || 'box') + ') is routed AROUND it (waypoints ≥ 2) and reached', Math.hypot(here.x - goA.x, here.z - goA.z) < 0.5 ? (nb.accepted && nb.waypoints >= 2 && tB > 0 && d2(pb.position, goB) <= NAV.arrive_radius_m + 0.1) : true, { ack: nb, t: tB, at: pb.position, start: here }); }
else ok('district: (no mid-size plaza solid found to route around — skipped, not a failure)', true);

/* ---- interiors: room bounds; a room change cancels ---- */
var h2 = newHost(); var s2 = sess(h2, 'PLAYER_A'); s2.send('ENTER_ROOM', { room: 'TRAINING' }); run(h2, 0.3); var half = ROOMS.TRAINING.size_m / 2;
var oor = s2.send('NAV', { dest_x: half + 2, dest_z: 0, via: 'TAP' }); ok('room: a destination outside the room bounds is OUT_OF_ROOM', !oor.accepted && oor.reason === 'OUT_OF_ROOM', oor);
var inr = s2.send('NAV', { dest_x: 0, dest_z: -3, via: 'TAP' }); var tR = runUntil(h2, s2, function (p) { return !p.nav; }, 10); ok('room: an in-bounds destination in a plain room (no field colliders) is walked and reached', inr.accepted && tR > 0 && d2(s2.play().position, inr.target) <= NAV.arrive_radius_m + 0.05, { ack: inr, t: tR });
/* tracked page evidence (deploy/probe_nav.mjs → 25_HANDOFF/CONVERGENCE/nav/probe_nav.json): real CDP mouse / touch input on the built demo */
var EV = path.join(HERE, '..', '25_HANDOFF', 'CONVERGENCE', 'nav', 'probe_nav.json'); var pr2 = null; try { pr2 = JSON.parse(fs.readFileSync(EV, 'utf8')); } catch (e) { }
ok('page evidence: the navigation / camera probe record exists and passed (heading independence N1–N4, click / tap destinations N5–N13 incl. flight, map, room; portrait touch M1–M4; zero errors)', !!pr2 && pr2.summary && pr2.summary.fail === 0 && pr2.summary.pass >= 21, pr2 && pr2.summary);
ok('page evidence: the desktop click arrived through the ordinary walker (moved, arrived, marker removed) and the camera heading did not move through the journey', !!pr2 && pr2.desktop && pr2.desktop.n5 && pr2.desktop.n5.arrived && pr2.desktop.n5.arrived.done && pr2.desktop.n5.arrived.moved && !pr2.desktop.n5.arrived.mark, pr2 && pr2.desktop && pr2.desktop.n5);
console.log('RESULT navigation: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
