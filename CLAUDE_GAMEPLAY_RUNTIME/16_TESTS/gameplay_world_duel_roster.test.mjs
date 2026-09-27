/* M17 (owner 2026-09-27, "PIVOTAL DUEL RULE — 2 TO 5 PLAYERS"): the duel roster engine (lab/world/duelRoster.js) and the court that draws
   it (lab/world/combatZones.js). Matches are 2..5 fighters; same-class rosters are legal and duplicate classes are FIRST-CLASS
   (fighterId ≠ classId); a 30 s WAITING window opened by the first fighter; one fighter never starts combat; the sixth is refused; OD-29
   for disconnects. Coverage is mathematical, not a pile of fixtures: every one of the 246 class COMPOSITIONS of 2..5 fighters, every join
   order of a strategic subset, and seeded random event storms — never 7,750 hand-made cases.
   node 16_TESTS/gameplay_world_duel_roster.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { createDuelRoster, arrangeTerritories, bestColourScore, territorySlots, territoryAdjacency, territoryColourAt, displayRGB, hexRGB, rosterCompositions, blendFields, fieldWeight, rosterDrives, classSimilarity, CLASS_IDS, CLASS_HEX, PEARL_HEX, DUEL_RULES, TIMING, PHASES, MAX_FIGHTERS, THREE_AT } from '../26_LOCAL_AUTHORITY/lab/world/duelRoster.js';
import { createCombatZones, combatZoneList } from '../26_LOCAL_AUTHORITY/lab/world/combatZones.js';
import { classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function J(p) { return JSON.parse(fs.readFileSync(path.join(LA, p), 'utf8')); } function src(p) { return fs.readFileSync(path.join(LA, p), 'utf8'); }
var REG = J('lab/assets/world/world_registry_v1.json'), DT = JSON.parse(fs.readFileSync(path.join(HERE, '..', '00_CORE', 'dev_tuning.dev.json'), 'utf8')), OD = DT.local_authority;
var FAM = { ATHLETE: 'gold', TITAN: 'blue', LEAN: 'red', VISIONARY: 'purple', BAGE: 'pink' }, LAWFAM = { ATHLETE: 'GOLD', TITAN: 'BLUE', LEAN: 'RED', VISIONARY: 'PURPLE', BAGE: 'PINK' };
function lcg(seed) { var s = (seed >>> 0) || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function hexOf(rgb) { return (Math.round(Math.max(0, Math.min(1, rgb[0])) * 255) << 16) | (Math.round(Math.max(0, Math.min(1, rgb[1])) * 255) << 8) | Math.round(Math.max(0, Math.min(1, rgb[2])) * 255); }
function fighter(id, cls, x, z) { return { fighterId: id, classId: cls, local: [x, z], worldPosition: { x: x, y: 0, z: z } }; }
function finiteDeep(o) { if (typeof o === 'number') return isFinite(o); if (o && typeof o === 'object') return Object.keys(o).every(function (k) { return finiteDeep(o[k]); }); return true; }
var H = 12;

/* 0. the contract matches its sources: five class colours = the registry crystal families' glow (five distinct law families); the rules =
      2..5 fighters, a 30 s window; OD-29 = dev_tuning local_authority (owner-approved 2026-09-14): PAUSE_AND_WAIT, 10 s, NO_CONTEST,
      voluntary exit concedes */
var famOk = CLASS_IDS.every(function (c) { return ('#' + ('000000' + CLASS_HEX[c].toString(16)).slice(-6)) === REG.crystal_families[FAM[c]].glow && classify(CLASS_HEX[c]).family === LAWFAM[c]; }) && new Set(CLASS_IDS.map(function (c) { return classify(CLASS_HEX[c]).family; })).size === 5 && classify(PEARL_HEX).verdict === 'NEUTRAL';
ok('0. contract sources: five class colours = the registry crystal families (five distinct colour-law families; pearl is NEUTRAL); 2..5 fighters, a 30 s window; OD-29 from dev_tuning (PAUSE_AND_WAIT, ' + OD.reconnect_window_s + ' s, ' + OD.disconnect_expiry_outcome + ', exit = ' + OD.voluntary_exit_in_duel + ')',
  famOk && DUEL_RULES.min_fighters === 2 && DUEL_RULES.max_fighters === 5 && MAX_FIGHTERS === 5 && DUEL_RULES.wait_s === 30 && REG.combat_zones.roster.wait_s === 30 && OD.disconnect_strategy === 'PAUSE_AND_WAIT_DEV' && DUEL_RULES.reconnect_window_s === OD.reconnect_window_s && OD.disconnect_expiry_outcome === 'NO_CONTEST' && DUEL_RULES.disconnect_expiry === 'NO_CONTEST' && /^CONCEDE/.test(OD.voluntary_exit_in_duel) && DUEL_RULES.voluntary_exit === 'CONCEDE', null);

/* 1. one fighter never starts combat: the window runs out (READY, expired) and stays READY — no LOCK, ever; the host cannot start a
      one-fighter match either */
var r1 = createDuelRoster({ zoneId: 'Z', halfWidth: H }); r1.join(fighter('solo', 'LEAN', 2, 1), 0);
var s1a = r1.snapshot(29.9), s1b = r1.snapshot(30.1), s1c = r1.snapshot(600), lock1 = r1.events().filter(function (e) { return e.type === 'LOCK'; }).length, b1 = createDuelRoster({ halfWidth: H }).begin([fighter('x', 'ATHLETE', 0, 0)], 5);
ok('1. one fighter never starts combat: READY through the window, still READY (window expired) at 30.1 s and at 600 s, no LOCK; the host begin() with one fighter is refused (NEED_TWO)',
  s1a.state === 'READY' && !s1a.waiting.expired && s1b.state === 'READY' && s1b.waiting.expired && s1c.state === 'READY' && lock1 === 0 && rosterDrives(s1c, 600).live === 0 && !b1.ok && b1.reason === 'NEED_TWO', { s1b: s1b.state, lock1: lock1 });

/* 2. two fighters start after the valid wait — exactly at the window's end; joining never restarts the window; a second fighter arriving
      AFTER the window has passed starts the match at once (no second timer) */
var r2 = createDuelRoster({ halfWidth: H }); r2.join(fighter('a', 'ATHLETE', -4, -4), 0); r2.join(fighter('b', 'TITAN', 4, 4), 10); r2.join(fighter('c', 'BAGE', 0, 5), 20);
var s2a = r2.snapshot(29.99), s2b = r2.snapshot(30.5), lockE = r2.events().filter(function (e) { return e.type === 'LOCK'; })[0];
var r2b = createDuelRoster({ halfWidth: H }); r2b.join(fighter('a', 'ATHLETE', -4, -4), 0); var late = r2b.join(fighter('b', 'ATHLETE', 4, 4), 47.5), s2c = r2b.snapshot(47.5), lockL = r2b.events().filter(function (e) { return e.type === 'LOCK'; })[0];
ok('2. two+ fighters lock exactly when the window ends (joins at 0 / 10 / 20 s do not restart it: LOCK at ' + (lockE && lockE.t) + ' s); a second fighter arriving after the window passed starts it at once (LOCK at ' + (lockL && lockL.t) + ' s)',
  s2a.state === 'READY' && Math.abs(s2a.waiting.remaining_s - 0.01) < 1e-6 && s2b.state === 'ACTIVATION' && lockE && lockE.t === 30 && s2b.lockedAt === 30 && s2b.participantCount === 3 &&
  late.ok && late.state === 'ACTIVATION' && s2c.lockedAt === 47.5 && lockL.t === 47.5, { s2a: s2a.state, s2b: s2b.state, lockE: lockE, lockL: lockL });

/* 3. capacity: up to five accepted (FULL at five), the sixth refused; joining a locked match refused; duplicate classes and an all-same-class
      roster accepted; every fighter keeps its own fighterId and slot; the same fighterId twice is refused */
var r3 = createDuelRoster({ halfWidth: H }), j3 = ['p0', 'p1', 'p2', 'p3', 'p4'].map(function (id, k) { return r3.join(fighter(id, 'ATHLETE', -8 + k * 4, 0), k); });
var s3 = r3.snapshot(4.5), sixth = r3.join(fighter('p5', 'ATHLETE', 0, 3), 5), dupId = r3.join(fighter('p2', 'TITAN', 0, 1), 5), s3L = r3.snapshot(31), lateJ = r3.join(fighter('p6', 'BAGE', 0, 0), 31);
ok('3. capacity: five ATHLETEs (an all-same-class roster) are accepted with five distinct fighterIds and slots 0..4 (FULL); the sixth is refused FULL, a repeated fighterId ALREADY_IN, a join into the running match LOCKED; the five lock with five territories',
  j3.every(function (r) { return r.ok; }) && s3.full && s3.participantCount === 5 && s3.participants.map(function (p) { return p.slotId; }).join() === '0,1,2,3,4' && new Set(s3.participants.map(function (p) { return p.fighterId; })).size === 5 &&
  !sixth.ok && sixth.reason === 'FULL' && !dupId.ok && dupId.reason === 'ALREADY_IN' && s3L.state === 'ACTIVATION' && s3L.territories.n === 5 && new Set(Object.values(s3L.territories.byFighter)).size === 5 && !lateJ.ok && lateJ.reason === 'LOCKED', { s3: s3.participantCount, sixth: sixth, dupId: dupId, lateJ: lateJ });

/* 4. identity: classId never determines the participant — two ATHLETEs are two participants, two slots, two territories, one colour;
      participant order and territory come from the fighter, not the class; a leaving WAITING fighter frees their slot for the next */
var r4 = createDuelRoster({ halfWidth: H }); r4.join(fighter('g1', 'ATHLETE', -5, -5), 0); r4.join(fighter('g2', 'ATHLETE', 5, 5), 1); r4.join(fighter('q', 'VISIONARY', 0, 0), 2); r4.leave('q', 3); var rj = r4.join(fighter('w', 'BAGE', -5, 5), 4);
var s4 = r4.snapshot(31), P4 = s4.participants;
ok('4. identity: fighterId ≠ classId — two ATHLETEs keep two ids, two slots, two territories (' + JSON.stringify(s4.territories && s4.territories.byFighter) + ') and one class colour; a fighter who leaves the queue frees their slot (the next joiner takes slot ' + rj.slotId + ')',
  P4.length === 3 && P4[0].fighterId === 'g1' && P4[1].fighterId === 'g2' && P4[0].classId === P4[1].classId && P4[0].classColor === P4[1].classColor && P4[0].slotId !== P4[1].slotId && P4[0].territory !== P4[1].territory && rj.slotId === 2 && s4.territories.n === 3, P4);

/* 5. DORMANT and READY are neutral (live 0, no territory, no class colour reaches the floor), ACTIVATION shows only the participants'
      classes, ACTIVE_DUEL returns the court to neutral (split 0) with local fields, RESOLUTION stops tracking and drains, RESET is neutral;
      the five permanent identity gems stay in every state — checked on the live court's attributes and uniforms */
var parent = new THREE.Group(), cz = createCombatZones({ THREE: THREE, registry: REG, group: parent, night: true, duelAuthority: 'LOCAL', quality: { tier: function () { return 'HIGH'; } } }); cz.build();
var zA = combatZoneList(REG)[0], ca = Math.cos(zA.yaw_deg * Math.PI / 180), sa = Math.sin(zA.yaw_deg * Math.PI / 180); function W(lx, lz, y) { return { x: zA.x + lx * ca - lz * sa, y: (zA.y || 0) + (y || 0), z: zA.z + lx * sa + lz * ca }; }
var FL = parent.getObjectByName('COMBAT_ZONE_FLOORS'), GA = FL.geometry.attributes, U = FL.material.uniforms, gems0 = U.uMk.value.map(function (v) { return v.getHexString(); }).join();
function slots() { var o = []; for (var k = 0; k < 5; k++) { var a = GA['iC' + k]; o.push('#' + new THREE.Color(a.getX(0), a.getY(0), a.getZ(0)).getHexString()); } return o; }
function classCol(c) { return '#' + new THREE.Color(REG.crystal_families[FAM[c]].glow).getHexString(); }
var ROS = [{ fighterId: 'A1', classId: 'ATHLETE', worldPosition: W(-6, -6) }, { fighterId: 'A2', classId: 'ATHLETE', worldPosition: W(6, 6) }, { fighterId: 'L1', classId: 'LEAN', worldPosition: W(6, -6) }], states = {}, T0 = 1000;
cz.tick(0.016, T0); states.DORMANT = { p: cz.phase(zA.id), s: slots(), g: U.uMk.value.map(function (v) { return v.getHexString(); }).join() };
for (var tt = T0; tt <= T0 + 29.5; tt += 0.5) { cz.setOccupants(zA.id, ROS, 0.5); cz.tick(0.5, tt); } states.READY = { p: cz.phase(zA.id), s: slots(), g: U.uMk.value.map(function (v) { return v.getHexString(); }).join() };
cz.setOccupants(zA.id, ROS, 0.5); cz.tick(0.016, T0 + 30.5); states.ACTIVATION = { p: cz.phase(zA.id), s: slots(), g: U.uMk.value.map(function (v) { return v.getHexString(); }).join(), split: GA.iK.getY(0), tmpl: GA.iK2.getW(0) };
for (tt = T0 + 30.6; tt <= T0 + 30 + TIMING.activation_s + 0.5; tt += 0.1) { cz.setOccupants(zA.id, ROS, 0.1); cz.tick(0.1, tt); }
var moved = [{ fighterId: 'A1', classId: 'ATHLETE', worldPosition: W(-1.5, 2) }, ROS[1], ROS[2]]; for (var q = 0; q < 12; q++) { cz.setOccupants(zA.id, moved, 0.1); cz.tick(0.1, tt + q * 0.1); } tt += 1.2;
states.ACTIVE_DUEL = { p: cz.phase(zA.id), s: slots(), g: U.uMk.value.map(function (v) { return v.getHexString(); }).join(), split: GA.iK.getY(0) };
cz.resolve(zA.id); var frozenAt = cz.phase(zA.id).fighters.filter(function (f) { return f.fighterId === 'A1'; })[0].local.join(); cz.setOccupants(zA.id, [{ fighterId: 'A1', classId: 'ATHLETE', worldPosition: W(8, 8) }, ROS[1], ROS[2]], 0.1); cz.tick(0.1, tt + 0.3);
states.RESOLUTION = { p: cz.phase(zA.id), s: slots(), g: U.uMk.value.map(function (v) { return v.getHexString(); }).join() }; var frozenNow = states.RESOLUTION.p.fighters.filter(function (f) { return f.fighterId === 'A1'; })[0].local.join();
cz.tick(0.1, tt + TIMING.resolution_s + 0.4); states.RESET = { p: cz.phase(zA.id), s: slots(), g: U.uMk.value.map(function (v) { return v.getHexString(); }).join() };
cz.tick(0.1, tt + TIMING.resolution_s + TIMING.reset_s + 0.3); var back = cz.phase(zA.id);
var W5 = '#ffffff', actCols = states.ACTIVATION.s, act = states.ACTIVATION.p, duelF = states.ACTIVE_DUEL.p.fighters, fA1 = duelF.filter(function (f) { return f.fighterId === 'A1'; })[0];
var gemsEvery = Object.keys(states).every(function (k) { return states[k].g === gems0; }) && U.uMk.value.length === 5 && gems0.split(',').every(function (h, k) { return '#' + h === classCol(['ATHLETE', 'TITAN', 'LEAN', 'VISIONARY', 'BAGE'][k]); });
ok('5. states on the live court: DORMANT / READY neutral (every slot white, live 0, no territory); ACTIVATION = the participants\' classes only (' + actCols.join(' ') + ': gold, gold, crimson, then white); ACTIVE_DUEL neutral again (split 0) with local fields tracking their fighters; RESOLUTION stops tracking; RESET white; back to DORMANT; the five identity gems unchanged in every state',
  states.DORMANT.s.every(function (c) { return c === W5; }) && states.DORMANT.p.live === 0 && states.READY.p.phase === 'READY' && states.READY.s.every(function (c) { return c === W5; }) && states.READY.p.live === 0 && states.READY.p.territories === 0 && states.READY.p.wait > 0.9 &&
  act.phase === 'ACTIVATION' && act.territories === 3 && states.ACTIVATION.split === 1 && states.ACTIVATION.tmpl % 10 === 3 && actCols.slice(0, 3).sort().join() === [classCol('ATHLETE'), classCol('ATHLETE'), classCol('LEAN')].sort().join() && actCols.slice(3).every(function (c) { return c === W5; }) &&
  states.ACTIVE_DUEL.p.phase === 'ACTIVE_DUEL' && states.ACTIVE_DUEL.split === 0 && Math.abs(fA1.local[0] + 1.5) < 0.05 && Math.abs(fA1.local[1] - 2) < 0.05 && fA1.presence > 0.95 &&
  states.RESOLUTION.p.phase === 'RESOLUTION' && frozenAt === frozenNow && states.RESET.p.phase === 'RESET' && states.RESET.s.every(function (c) { return c === W5; }) && !states.RESET.p.classColourShown && back.phase === 'DORMANT' && gemsEvery,
  { act: actCols, fA1: fA1, frozen: [frozenAt, frozenNow], phases: Object.keys(states).map(function (k) { return k + ':' + states[k].p.phase; }), back: back.phase });
cz.dispose();

/* 6. local fields: an airborne fighter's field stays under their horizontal position (narrower, fainter, never below 35 %); same-class
      overlap stays that class's colour and reinforces modestly; different classes meet only through pearl — for all ten class pairs and
      3..5-field pile-ups, every blended colour (at every intensity the floor uses) is NEUTRAL or one of the PARTICIPANTS' own law families,
      never a third class or an off-law hue, and never brighter than 1.25 */
var g0 = fieldWeight(0, 0, { x: 0, z: 0, radius: 3.2 }), gAir = fieldWeight(0, 0, { x: 0, z: 0, radius: 3.2, lift: 2 }), gHigh = fieldWeight(0, 0, { x: 0, z: 0, radius: 3.2, lift: 50 }), gOff = fieldWeight(1.2, 0, { x: 0, z: 0, radius: 3.2, lift: 2 });
var sameBad = [], mixBad = [], maxI = 0, pairs = 0, checks = 0;
function lawOk(rgb, I, allowed) { var bad = null; [0.25, 0.55, 1, 1.7].forEach(function (k) { var v = classify(hexOf(displayRGB(rgb, I * k))); checks++; if (v.verdict === 'VIOLATION' || (v.verdict === 'LAW' && allowed.indexOf(v.family) < 0)) bad = v; }); return bad; }
CLASS_IDS.forEach(function (c) { var single = blendFields(0, 0, [{ x: 0, z: 0, classId: c, radius: 3.2 }]).intensity;
  for (var x = -3; x <= 3; x += 0.25) { var b = blendFields(x, 0.3, [{ x: -1.4, z: 0, classId: c, radius: 3.2 }, { x: 1.4, z: 0, classId: c, radius: 3.2 }]); if (b.intensity < 1e-3) continue; var bad = lawOk(b.rgb, b.intensity, [LAWFAM[c]]); if (bad || b.dominant !== c || b.conflict > 1e-9 || Math.abs(b.rgb[0] - ((CLASS_HEX[c] >> 16) & 255) / 255) > 1e-9 || b.intensity > 1.25) sameBad.push([c, x, b, bad]); }
  var mid = blendFields(0, 0, [{ x: -1, z: 0, classId: c, radius: 3.2 }, { x: 1, z: 0, classId: c, radius: 3.2 }]); if (!(mid.intensity > blendFields(0, 0, [{ x: -1, z: 0, classId: c, radius: 3.2 }]).intensity && mid.intensity <= 1.3 * single + 1e-9)) sameBad.push([c, 'reinforce', mid.intensity, single]); });
for (var i = 0; i < 5; i++) for (var j = i + 1; j < 5; j++) { pairs++; var A = CLASS_IDS[i], B = CLASS_IDS[j];
  for (var x2 = -3; x2 <= 3; x2 += 0.1) for (var ratio = 0.4; ratio <= 1.6; ratio += 0.3) { var bb = blendFields(x2, 0.2, [{ x: -1.3, z: 0, classId: A, radius: 3.2, presence: Math.min(1, ratio) }, { x: 1.3, z: 0, classId: B, radius: 3.2, presence: Math.min(1, 2 - ratio) }]); if (bb.intensity < 1e-3) continue; maxI = Math.max(maxI, bb.intensity); var bad2 = lawOk(bb.rgb, bb.intensity, [LAWFAM[A], LAWFAM[B]]); if (bad2) mixBad.push([A, B, +x2.toFixed(2), bad2]); } }
var rnd = lcg(77); for (var n = 3; n <= 5; n++) for (var trial = 0; trial < 60; trial++) { var pile = [], allow = []; for (var k = 0; k < n; k++) { var cc = CLASS_IDS[Math.floor(rnd() * 5)]; pile.push({ x: (rnd() - 0.5) * 3, z: (rnd() - 0.5) * 3, classId: cc, radius: 2 + rnd() * 3, lift: rnd() < 0.2 ? rnd() * 3 : 0 }); allow.push(LAWFAM[cc]); }
  for (var p = 0; p < 30; p++) { var bp = blendFields((rnd() - 0.5) * 6, (rnd() - 0.5) * 6, pile); if (bp.intensity < 1e-3) continue; maxI = Math.max(maxI, bp.intensity); var bad3 = lawOk(bp.rgb, bp.intensity, allow); if (bad3 || !finiteDeep(bp)) mixBad.push(['pile', n, bad3]); } }
ok('6. local fields: airborne fields stay centred (lift 2 m: ' + (gAir / g0).toFixed(2) + '×, 50 m: ' + (gHigh / g0).toFixed(2) + '× — floor 0.35), same-class overlap keeps its colour and reinforces ≤ 1.3×; ' + pairs + ' class pairs × positions × weight ratios and 180 random 3–5-field pile-ups (' + checks + ' colour checks): only NEUTRAL or the participants\' own families, intensity ≤ ' + maxI.toFixed(3),
  gAir < g0 && Math.abs(gHigh / g0 - 0.35) < 1e-9 && gOff > 0 && sameBad.length === 0 && mixBad.length === 0 && maxI <= 1.25 && classSimilarity('ATHLETE', 'ATHLETE') === 1, { sameBad: sameBad.slice(0, 3), mixBad: mixBad.slice(0, 5) });

/* 7. OD-29 in a locked match: a DISCONNECT pauses (PAUSE_AND_WAIT) with a 10 s window; a repeated notice keeps the first deadline;
      reconnecting in time resumes; the first expiry ends the match NO_CONTEST (no winner) exactly at the deadline; a voluntary EXIT concedes
      (two left → the other wins LAST_STANDING; three → the match goes on); walking off the court is OUTSIDE, coming back RETURNs; nobody
      present for 10 s → NO_CONTEST (ABANDONED); everyone leaving the WAITING queue → RESET → DORMANT; after a match the fighters still
      standing must step off and back on (REENTER) */
function locked3(ids) { var r = createDuelRoster({ halfWidth: H }); ids.forEach(function (x, k) { r.join(fighter(x[0], x[1], -6 + k * 6, 0), 0); }); r.snapshot(31); return r; }
var o1 = locked3([['a', 'ATHLETE'], ['b', 'TITAN'], ['c', 'LEAN']]); o1.leave('b', 40, 'DISCONNECT'); var again = o1.leave('b', 44, 'DISCONNECT'), sP = o1.snapshot(45); o1.join(fighter('b', 'TITAN', 0, 0), 48); var sR = o1.snapshot(48);
o1.leave('c', 60, 'DISCONNECT'); var sX = o1.snapshot(69.99), sN = o1.snapshot(70.01), ev1 = o1.events().map(function (e) { return e.type; });
var o2 = locked3([['a', 'ATHLETE'], ['b', 'ATHLETE']]); o2.leave('a', 40, 'EXIT'); var sW = o2.snapshot(40);
var o3 = locked3([['a', 'ATHLETE'], ['b', 'TITAN'], ['c', 'BAGE']]); o3.leave('a', 40, 'EXIT'); var sC = o3.snapshot(40);
var o4 = locked3([['a', 'ATHLETE'], ['b', 'TITAN']]); o4.sync([fighter('a', 'ATHLETE', 0, 0)], 40); var sO = o4.snapshot(40); o4.sync([fighter('a', 'ATHLETE', 0, 0), fighter('b', 'TITAN', 1, 1)], 42); var sB = o4.snapshot(42); o4.sync([], 50); var sA0 = o4.snapshot(59.9), sA = o4.snapshot(60.1);
var o5 = createDuelRoster({ halfWidth: H }); o5.join(fighter('a', 'ATHLETE', 0, 0), 0); o5.join(fighter('b', 'LEAN', 1, 0), 1); o5.leave('a', 5); o5.leave('b', 6); var sE = o5.snapshot(6), sE2 = o5.snapshot(6 + TIMING.reset_s + 0.01);
var o6 = locked3([['a', 'ATHLETE'], ['b', 'LEAN']]); o6.resolve(40, { outcome: 'WIN', winnerId: 'a' }); var tEnd = 40 + TIMING.resolution_s + TIMING.reset_s + 0.1; o6.sync([fighter('a', 'ATHLETE', 0, 0), fighter('b', 'LEAN', 1, 0)], tEnd); var sRe = o6.snapshot(tEnd), reJ = o6.join(fighter('a', 'ATHLETE', 0, 0), tEnd + 1); o6.sync([], tEnd + 2); o6.sync([fighter('a', 'ATHLETE', 0, 0)], tEnd + 3); var sRe2 = o6.snapshot(tEnd + 3);
ok('7. OD-29 + leaving: disconnect → PAUSE (deadline +' + DUEL_RULES.reconnect_window_s + ' s, a repeat notice keeps it), reconnect → RESUME; first expiry → NO_CONTEST at the deadline; EXIT concedes (2 → LAST_STANDING win, 3 → goes on); off the court = OUTSIDE → RETURN; nobody present 10 s → ABANDONED; the WAITING queue emptied → RESET → DORMANT; after a match: REENTER',
  sP.paused && sP.participants[1].status === 'RECONNECTING' && again.already && again.deadline === 50 && !sR.paused && sR.participants[1].status === 'LOCKED' && ev1.indexOf('PAUSE') >= 0 && ev1.indexOf('RESUME') >= 0 &&
  sX.state === 'ACTIVE_DUEL' && sN.state === 'RESOLUTION' && sN.result.outcome === 'NO_CONTEST' && sN.result.winnerId === null && sN.result.reason === 'DISCONNECT_EXPIRED' && sN.resolvedAt === 70 &&
  sW.state === 'RESOLUTION' && sW.result.outcome === 'WIN' && sW.result.winnerId === 'b' && sW.result.reason === 'LAST_STANDING' && sC.state === 'ACTIVE_DUEL' && sC.participants[0].status === 'CONCEDED' &&
  sO.participants[1].status === 'OUTSIDE' && !sO.participants[1].isPresent && sO.state === 'ACTIVE_DUEL' && sB.participants[1].status === 'LOCKED' && sA0.state === 'ACTIVE_DUEL' && sA.state === 'RESOLUTION' && sA.result.reason === 'ABANDONED' && sA.resolvedAt === 60 &&
  sE.state === 'RESET' && sE2.state === 'DORMANT' && sE2.participantCount === 0 && sRe.state === 'DORMANT' && !reJ.ok && reJ.reason === 'REENTER' && sRe2.state === 'READY' && sRe2.participantCount === 1,
  { sP: sP.paused, again: again, sX: sX.state, sN: sN.result, sW: sW.result, sC: sC.state, sO: sO.participants.map(function (p) { return p.status; }), sA: sA.result, sE: [sE.state, sE2.state], reJ: reJ, sRe2: sRe2.state });

/* 8. THE 246 COMPOSITIONS (combinations with repetition of the five classes, 2..5 fighters: 15 + 35 + 70 + 126): for every one — the roster
      forms and locks, the activation territories generate (exactly N, one per participant, the template for N, equal shares on the court),
      the participant count and the duplicate classes are preserved, only the five class colours appear, the arrangement reaches the best
      colour score any arrangement could, and neither the roster snapshot nor the live court's attributes carry a NaN */
var COMP = rosterCompositions(2, 5), byN = [2, 3, 4, 5].map(function (n) { return COMP.filter(function (c) { return c.length === n; }).length; }), compBad = [], sharesBad = [];
var SH = {}; [2, 3, 4, 5].forEach(function (n) { [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4].forEach(function (th) { if (n !== 2 && th) return; var S = territorySlots(n, 1, th), c = S.map(function () { return 0; }), N = 0; for (var x = -1 + 0.005; x < 1; x += 0.01) for (var z = -1 + 0.005; z < 1; z += 0.01) { var b = 0, bd = 1e9; S.forEach(function (p, k) { var d = (x - p[0]) * (x - p[0]) + (z - p[1]) * (z - p[1]); if (d < bd) { bd = d; b = k; } }); c[b]++; N++; } SH[n + ':' + th] = c.map(function (v) { return v / N; }); if (c.some(function (v) { return Math.abs(v / N - 1 / n) > 0.012; })) sharesBad.push([n, th, c.map(function (v) { return +(v / N).toFixed(4); })]); }); });
var p8 = new THREE.Group(), cz8 = createCombatZones({ THREE: THREE, registry: REG, group: p8, night: true, duelAuthority: 'LOCAL' }); cz8.build(); var G8 = p8.getObjectByName('COMBAT_ZONE_FLOORS').geometry.attributes, keys8 = Object.keys(G8).filter(function (k) { return /^i/.test(k); });
var colours5 = CLASS_IDS.map(function (c) { return '#' + ('000000' + CLASS_HEX[c].toString(16)).slice(-6); });
COMP.forEach(function (cl, ci) { var r = createDuelRoster({ zoneId: 'P', halfWidth: H }), rr = lcg(1000 + ci), okJ = true;
  cl.forEach(function (c, k) { var jr = r.join(fighter('f' + k, c, (rr() - 0.5) * 20, (rr() - 0.5) * 20), k * 0.7); okJ = okJ && jr.ok; });
  var s = r.snapshot(31), T = s.territories, terrs = T ? Object.keys(T.byFighter).map(function (id) { return T.byFighter[id]; }) : [], multi = s.participants.map(function (p) { return p.classId; }).sort().join();
  var best = T ? bestColourScore(T.order.map(function (id) { return s.participants.filter(function (p) { return p.fighterId === id; })[0].classId; }), T.theta) : -1, arr = arrangeTerritories(s.participants.map(function (p) { return { fighterId: p.fighterId, slotId: p.slotId, classId: p.classId, local: p.local }; }), H);
  var good = okJ && s.state === 'ACTIVATION' && T && T.n === cl.length && T.templateName === ['', '', 'HALVES', 'SECTORS', 'QUADRANTS', 'DICE_FIVE'][cl.length] && terrs.length === cl.length && new Set(terrs).size === cl.length && terrs.every(function (t) { return t >= 0 && t < cl.length; }) &&
    s.participantCount === cl.length && multi === cl.slice().sort().join() && s.participants.every(function (p) { return colours5.indexOf(p.classColor) >= 0 && p.classColor === colours5[CLASS_IDS.indexOf(p.classId)]; }) && Math.abs(arr.colourScore - best) < 1e-9 && JSON.stringify(arr.territoryOf) === JSON.stringify(T.byFighter) && finiteDeep(s);
  var tc = T ? T.order.map(function (id) { return hexRGB(CLASS_HEX[s.participants.filter(function (p) { return p.fighterId === id; })[0].classId]); }) : [], allowT = cl.map(function (c) { return LAWFAM[c]; }), terrBad = 0;
  if (T) for (var tx = -H + 0.35; tx < H; tx += 0.7) for (var tz = -H + 0.35; tz < H; tz += 0.7) { var tcol = territoryColourAt(tx, tz, T.n, H, T.theta, tc); [0.3, 0.7, 1, 1.5].forEach(function (k) { var v = classify(hexOf(displayRGB(tcol.rgb, k))); if (v.verdict === 'VIOLATION' || (v.verdict === 'LAW' && allowT.indexOf(v.family) < 0)) terrBad++; }); }
  good = good && terrBad === 0;
  var ph = cz8.begin(zA.id, cl.map(function (c, k) { return { fighterId: 'f' + k, classId: c, worldPosition: W((rr() - 0.5) * 20, (rr() - 0.5) * 20) }; }), { t: 5000 + ci }); cz8.tick(0.016, 5000 + ci + 0.3);
  var finiteAttrs = keys8.every(function (k) { var a = G8[k].array; for (var q = 0; q < a.length; q++) if (!isFinite(a[q])) return false; return true; }), coloured = [0, 1, 2, 3, 4].map(function (k) { var a = G8['iC' + k]; return '#' + new THREE.Color(a.getX(0), a.getY(0), a.getZ(0)).getHexString(); });
  var courtOk = ph && ph.territories === cl.length && finiteAttrs && coloured.slice(0, cl.length).sort().join() === cl.map(function (c) { return classCol(c); }).sort().join() && coloured.slice(cl.length).every(function (c) { return c === '#ffffff'; }) && finiteDeep(ph.fighters.map(function (f) { return [f.local, f.presence, f.influence]; }));
  if (!good || !courtOk) compBad.push({ cl: cl.join(','), good: good, courtOk: courtOk, T: T, best: best, arr: arr.colourScore }); });
cz8.dispose();
ok('8. all ' + COMP.length + ' compositions (' + byN.join(' + ') + ' for 2..5 fighters): each forms, locks and generates exactly N territories (equal shares: ' + Object.keys(SH).map(function (k) { return k.split(':')[0] + '→' + SH[k].map(function (v) { return v.toFixed(3); }).join('/'); }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ') + '), keeps its count and duplicate classes, shows only the five class colours (and, across every territory pixel and seam at four light levels, only the participants\' own families or neutral), reaches the best colour score, and neither the snapshot nor the court attributes carry a NaN',
  COMP.length === 246 && byN.join() === '15,35,70,126' && new Set(COMP.map(function (c) { return c.join(); })).size === 246 && compBad.length === 0 && sharesBad.length === 0 && Math.abs(THREE_AT[1] - (1.5 * Math.PI - 2 * Math.atan(2 / 3))) < 1e-12, { compBad: compBad.slice(0, 3), sharesBad: sharesBad });

/* 9. strategic subset: every JOIN ORDER (all N! permutations of slot order) of duplicate-heavy rosters gives an arrangement at the best
      colour score, deterministic (the same input twice → the same territories), duplicates never sharing a border where the geometry allows
      it (4 = diagonal quadrants; 5 = opposite corners, a lone class in the centre), and the territories never flicker while fighters move */
function permutations(a) { if (a.length <= 1) return [a.slice()]; var out = []; a.forEach(function (x, i) { permutations(a.slice(0, i).concat(a.slice(i + 1))).forEach(function (p) { out.push([x].concat(p)); }); }); return out; }
var SUB = [['ATHLETE', 'ATHLETE', 'LEAN', 'TITAN', 'BAGE'], ['ATHLETE', 'ATHLETE', 'LEAN', 'LEAN', 'VISIONARY'], ['TITAN', 'TITAN', 'TITAN', 'BAGE', 'BAGE'], ['VISIONARY', 'VISIONARY', 'BAGE', 'BAGE', 'BAGE'], ['ATHLETE', 'ATHLETE', 'ATHLETE', 'ATHLETE', 'ATHLETE'], ['LEAN', 'LEAN', 'LEAN', 'BAGE'], ['ATHLETE', 'ATHLETE', 'LEAN', 'LEAN'], ['TITAN', 'TITAN', 'VISIONARY'], ['ATHLETE', 'ATHLETE']], subBad = [], perms = 0;
SUB.forEach(function (cl) { var n = cl.length, A2 = territoryAdjacency(n, 0), best = bestColourScore(cl, 0);
  permutations(cl.map(function (c, k) { return k; })).forEach(function (order) { perms++; var parts = order.map(function (k, slot) { return { fighterId: 'f' + k, slotId: slot, classId: cl[k] }; }), a1 = arrangeTerritories(parts, H), a2 = arrangeTerritories(parts.slice().reverse(), H);
    var byT = []; parts.forEach(function (p) { byT[a1.territoryOf[p.fighterId]] = p.classId; });
    var dupTouch = 0; for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) if (byT[i] === byT[j] && A2[i][j] > 0) dupTouch++;
    var expectTouch = { 'ATHLETE,ATHLETE,LEAN,TITAN,BAGE': 0, 'ATHLETE,ATHLETE,LEAN,LEAN,VISIONARY': 0, 'ATHLETE,ATHLETE,LEAN,LEAN': 0 }[cl.join()];
    if (n > 2 && Math.abs(a1.colourScore - best) > 1e-9 || JSON.stringify(a1.territoryOf) !== JSON.stringify(a2.territoryOf) || (expectTouch !== undefined && dupTouch !== expectTouch) || (n === 5 && cl.join() === 'ATHLETE,ATHLETE,LEAN,TITAN,BAGE' && byT[4] === 'ATHLETE')) subBad.push({ cl: cl.join(), order: order, byT: byT, dupTouch: dupTouch, cs: a1.colourScore, best: best }); }); });
var r9 = createDuelRoster({ halfWidth: H }); ['ATHLETE', 'ATHLETE', 'LEAN', 'LEAN', 'VISIONARY'].forEach(function (c, k) { r9.join(fighter('m' + k, c, -8 + k * 4, 0), k); }); var t9 = JSON.stringify(r9.snapshot(30).territories.byFighter), flick = 0, rr9 = lcg(9);
for (var f9 = 0; f9 < 60; f9++) { ['ATHLETE', 'ATHLETE', 'LEAN', 'LEAN', 'VISIONARY'].forEach(function (c, k) { r9.update(fighter('m' + k, c, (rr9() - 0.5) * 22, (rr9() - 0.5) * 22), 30 + f9 * 0.05); }); if (JSON.stringify(r9.snapshot(30 + f9 * 0.05).territories.byFighter) !== t9) flick++; }
ok('9. strategic subset: ' + perms + ' join orders of ' + SUB.length + ' duplicate-heavy rosters all reach the best colour score, deterministically; duplicates never share a border where the geometry allows it (GOLD, GOLD, RED, BLUE, PINK → the golds in opposite corners, never the centre); the territories never flicker while fighters move (60 frames)',
  subBad.length === 0 && flick === 0, { subBad: subBad.slice(0, 4), flick: flick });

/* 10. seeded random event storms: 300 seeds × 80 events (joins with duplicate-heavy classes, leaves, disconnects, reconnects, syncs,
       resolves, time jumps) — the invariants always hold: ≤ 5 participants, unique ids and slots, a known state, no LOCK with < 2, every
       LOCK at the window's end or at a join after it, class colour = the class, RESOLUTION only after a LOCK, no NaN */
var stormBad = [], locks = 0, resolves = 0;
for (var seed = 1; seed <= 300; seed++) { var R = lcg(seed * 7919), r = createDuelRoster({ halfWidth: H }), t = 0, ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'], lastLock = null;
  for (var ev = 0; ev < 80; ev++) { t += R() < 0.3 ? R() * 12 : R() * 1.5; var u = R(), id = ids[Math.floor(R() * ids.length)], cls = R() < 0.6 ? 'ATHLETE' : CLASS_IDS[Math.floor(R() * 5)];
    if (u < 0.4) r.join(fighter(id, cls, (R() - 0.5) * 22, (R() - 0.5) * 22), t); else if (u < 0.55) r.leave(id, t, R() < 0.5 ? 'EXIT' : 'DISCONNECT'); else if (u < 0.75) r.sync(ids.filter(function () { return R() < 0.5; }).map(function (x) { return fighter(x, 'BAGE', (R() - 0.5) * 20, 0); }), t); else if (u < 0.8) r.resolve(t, { outcome: 'ENDED' }); else r.snapshot(t);
    var s = r.snapshot(t), P = s.participants;
    if (P.length > 5 || new Set(P.map(function (p) { return p.fighterId; })).size !== P.length || new Set(P.map(function (p) { return p.slotId; })).size !== P.length || PHASES.indexOf(s.state) < 0 || !finiteDeep(s) || P.some(function (p) { return p.classColor !== '#' + ('000000' + CLASS_HEX[p.classId].toString(16)).slice(-6); })) stormBad.push({ seed: seed, ev: ev, s: s.state, n: P.length }); }
  var evs = r.events(), waitStart = null, expiredAt = null;
  evs.forEach(function (e) { if (e.type === 'WAIT_START') { waitStart = e.t; expiredAt = null; } if (e.type === 'WAIT_EXPIRED') expiredAt = e.t; if (e.type === 'LOCK') { locks++; lastLock = e; if (e.roster.length < 2 || !(Math.abs(e.t - (waitStart + 30)) < 1e-6 || (expiredAt !== null && e.t >= expiredAt))) stormBad.push({ seed: seed, lock: e, waitStart: waitStart }); } if (e.type === 'RESOLVE') { resolves++; if (!lastLock) stormBad.push({ seed: seed, resolveWithoutLock: e }); } }); }
ok('10. 300 seeded event storms × 80 events: invariants hold every step (≤ 5 participants, unique ids / slots, known states, class colour = class, no NaN); ' + locks + ' locks, all with ≥ 2 fighters at the window\'s end or at a later join; ' + resolves + ' resolutions, all after a lock',
  stormBad.length === 0 && locks > 50 && resolves > 20, stormBad.slice(0, 4));

/* 11. the shader mirrors the pure maths (the same field, blend and cap constants), the court module takes its rules from the engine, and
       the spec + registry carry the contract */
var CS = src('lab/world/combatZones.js'), SPEC = fs.existsSync(path.join(HERE, '..', '25_HANDOFF', 'CONVERGENCE', 'world_pivot', 'DUEL_ZONE_SPEC.md')) ? fs.readFileSync(path.join(HERE, '..', '25_HANDOFF', 'CONVERGENCE', 'world_pivot', 'DUEL_ZONE_SPEC.md'), 'utf8') : '';
var mirror = ['max(0.35, 1.0 / (1.0 + max(lift, 0.0) * 0.3))', '(0.7 + 0.3 * lk) * (1.0 + 0.12 * s)', '(0.75 * length(r) + 0.25 * (abs(r.x) + abs(r.y)) * 0.70710678) / Rr', 'exp(-d * d * 1.8) * (1.0 - smoothstep(0.85, 1.35, d))', 'Wd * Wd * Wd * Wd / S4', 'clamp(2.0 * (1.0 - D), 0.0, 1.0)', 'min(1.25, maxW + 0.3 * (sumW - maxW))', '3.5363838 : 5.8883942', 'mix(Cd, vec3(0.96)', 'mix(cn, vec3(1.0), clamp(eS - 1.0, 0.0, 1.0) * 0.85)', 'col /= max(1.0, max(max(col.r, col.g), col.b))'].filter(function (k) { return CS.indexOf(k) < 0; });
ok('11. the floor shader mirrors duelRoster (field, white-seam blend, cap, whitened territory seams, hue-kept scaling, exact-third sectors); the court imports its rules from the engine; DUEL_ZONE_SPEC.md and registry combat_zones.roster carry the contract',
  mirror.length === 0 && /from '\.\/duelRoster\.js'/.test(CS) && /createDuelRoster\(/.test(CS) && SPEC.length > 2000 && /fighterId ≠ classId|fighterId != classId/.test(SPEC) && /246/.test(SPEC) && /OD-29/.test(SPEC) && REG.combat_zones.roster.engine === 'lab/world/duelRoster.js', { mirror: mirror, spec: SPEC.length });

console.log('RESULT world duel roster: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
