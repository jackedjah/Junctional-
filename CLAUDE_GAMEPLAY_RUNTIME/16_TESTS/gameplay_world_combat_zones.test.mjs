/* M15b → M17 (owner 2026-09-27: duel courts; five classes; "PIVOTAL DUEL RULE — 2 TO 5 PLAYERS"): duel courts are large, ground-integrated
   square-diamond courts — dormant world infrastructure with ZERO class ownership colour while inactive (white / cool white-blue / pale
   ice, plus five tiny permanent class gems), no walls / cage / raised arena / spectator structure. Size is validated from the rules
   (M17: 24 m — lock-on, dash, strike, area and five-fighter spacing). The match comes from the roster engine (duelRoster.js; its own
   property tests are gameplay_world_duel_roster): DORMANT → READY (the 30 s WAITING window, neutral) → ACTIVATION (one territory per
   participant) → ACTIVE_DUEL (neutral court, local class fields) → RESOLUTION → RESET → DORMANT.
   ONE court is placed until the owner verifies the footprint and the dormant look.  node 16_TESTS/gameplay_world_combat_zones.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { createCombatZones, combatZoneList, combatZoneCircles, duelPhase, insideZone, CLASS_FAMILY, TIMING, SIZING, PALETTE, PHASES, CLASS_PHASES, MAX_FIGHTERS, territorySlots, assignSlots, splitAngle, FIVE_DIAMOND, IDENTITY_ORDER } from '../26_LOCAL_AUTHORITY/lab/world/combatZones.js';
import { arrangeTerritories, bestColourScore } from '../26_LOCAL_AUTHORITY/lab/world/duelRoster.js';
import { groundYAt } from '../26_LOCAL_AUTHORITY/lab/world/worldLayout.js';
import { classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function J(p) { return JSON.parse(fs.readFileSync(path.join(LA, p), 'utf8')); } function src(p) { return fs.readFileSync(path.join(LA, p), 'utf8'); }
var REG = J('lab/assets/world/world_registry_v1.json'), CZ = REG.combat_zones, Z = combatZoneList(REG), RULES = J('play/rules1723/rules_17_23.dev.json'), DT = JSON.parse(fs.readFileSync(path.join(HERE, '..', '00_CORE', 'dev_tuning.dev.json'), 'utf8'));

/* 1. size (M17), validated from the rules — the owner's target is 18–24 m, combat usability first: lock-on holds a target to 34 m and the
      court's diagonal stays inside it (nobody on the court drops lock); the longest dash plus a body fits from the centre; five fighters'
      dice-five starts sit beyond the longest strike (+ hit radius + body), the largest area effect (+ body) and a dash plus two bodies; the
      host's 1v1 duel boundary is the same 12 m radius; PvP flight is off. All five classes map onto the crystal families. */
var MU = RULES._runtime_mapping.melee_unit_m, maxR = 0, maxStrike = 0; (RULES.skills || []).forEach(function (s) { var e = s.effect || {}; if (isFinite(e.radius_melee_units)) maxR = Math.max(maxR, e.radius_melee_units); if (e.type === 'BODY_STRIKE' && isFinite(e.range_melee_units)) maxStrike = Math.max(maxStrike, e.range_melee_units); });
var R1 = maxR * MU, reach = maxStrike * MU + RULES._runtime_mapping.hit_radius_m, body = RULES._runtime_mapping.field_colliders.body_radius_m, lockHold = RULES._runtime_mapping.lock.max_m, hostR = DT.duel.boundary_radius_m;
var dash = Math.max.apply(Math, Object.keys(DT.local_authority.play.dash.profiles).map(function (k) { return DT.local_authority.play.dash.profiles[k].distance_m; })), PLm = CZ.playable_m, hh1 = PLm / 2, spacing = hh1 * Math.sqrt(0.8), fams = Object.keys(REG.crystal_families).filter(function (k) { return k[0] !== '_'; });
ok('1. size from the rules: ' + PLm + ' m playable (owner target 18–24 m) — diagonal ' + (PLm * Math.SQRT2).toFixed(1) + ' m ≤ lock-on hold ' + lockHold + ' m; half-width ' + hh1 + ' m ≥ longest dash ' + dash + ' m + body ' + body + ' m; dice-five starts ' + spacing.toFixed(2) + ' m apart > strike ' + reach.toFixed(3) + ' m + body, > area ' + R1 + ' m + body, > dash + two bodies; = the host duel boundary (r ' + hostR + ' m); PvP flight off; + ' + CZ.border_m + ' m border; ground-only square-diamond, no spectators; 2..5 fighters',
  PLm >= 18 && PLm <= 24 && PLm * Math.SQRT2 <= lockHold && hh1 >= dash + body && spacing > reach + body && spacing > R1 + body && spacing > dash + 2 * body && PLm === 2 * hostR && RULES.teams.pvp_flight === false &&
  SIZING.playable_m === PLm && CZ.sizing.max_fighters === 5 && CZ.sizing.min_fighters === 2 && MAX_FIGHTERS === 5 && Math.abs(CZ.sizing.dice_five_spacing_m - spacing) < 0.01 && Math.abs(CZ.sizing.max_strike_reach_m - reach) < 1e-9 && CZ.sizing.max_dash_m === dash && CZ.sizing.lock_on_hold_m === lockHold && CZ.sizing.max_aoe_radius_m === R1 && SIZING.max_aoe_radius_m === R1 &&
  CZ.ground_only === true && CZ.spectators === false && CZ.shape === 'SQUARE_DIAMOND' && Z.every(function (z) { return z.playable_m === CZ.playable_m && Math.abs(z.size_m - (CZ.playable_m + 2 * CZ.border_m)) < 1e-9 && /^CZ_/.test(z.id); }) &&
  CZ.roster && CZ.roster.min_fighters === 2 && CZ.roster.max_fighters === 5 && CZ.roster.wait_s === 30 && CZ.roster.duplicate_classes === true &&
  ['ATHLETE', 'TITAN', 'LEAN', 'VISIONARY', 'BAGE'].every(function (c) { return CZ.class_family[c] === CLASS_FAMILY[c] && fams.indexOf(CLASS_FAMILY[c]) >= 0; }), { playable: PLm, spacing: spacing, reach: reach, dash: dash, lockHold: lockHold, hostR: hostR });

/* 2. placement (M17 modest set, owner 2026-09-27: "place a modest set throughout underused open-world spaces" after the canonical court):
      2..5 courts, each clear of every collider (field base + district + world; the HALO deck at 240 m and walkable tops excepted) by ≥ 4 m
      beyond its circumradius (approach and exit space), off every path ribbon / spur and forecourt, off water, flat at its registered
      height, clear of the official match court; spread out — no two within 90 m, and a pair closer than 120 m screened by a building at
      eye height (no direct sightline) */
var L = RULES._runtime_mapping.field_colliders_district_v1;
var shapes = [].concat(L.shapes || [], J('play/rules1723/world_v1_colliders.json').shapes, J('play/rules1723/district_v1_colliders.json').shapes).filter(function (s) { return !/^WALL_/.test(s.id || '') && !((s.y0 || 0) >= 2) && !/(_TOP|_RAMP(_[NSEW])?|_BED|_SHORE(_[NSEW])?)$/.test(s.id || ''); });
function dShape(x, z, s) { if (s.type === 'CYLINDER') return Math.hypot(x - s.x, z - s.z) - (s.r || 0.5); if (s.x1 !== undefined) { var dx = Math.max(s.x1 - x, 0, x - s.x2), dz = Math.max(s.z1 - z, 0, z - s.z2); return (dx || dz) ? Math.hypot(dx, dz) : -1; } return 1e9; }
function dSeg(x, z, a, b) { var dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
var PW = REG.paths, Wd = { CAUSEWAY: PW.causeway_w || 20, REGIONAL: PW.regional_w || 8, TRAIL: PW.trail_w || 3 }, segs = [], fcs = [];
PW.list.forEach(function (P) { var pts = P.pts || [], w = P.width_m || Wd[P.tier] || 6; for (var i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i], w / 2]); if (P.forecourt) { fcs.push(P.forecourt); [P.spur, P.spur2].forEach(function (S) { if (S && S.to) segs.push([[P.forecourt.x, P.forecourt.z], S.to, (PW.spur_w || 6) / 2]); }); } });
var place = Z.map(function (z) { var R = z.size_m * 0.7072, clear = Math.min.apply(Math, shapes.map(function (s) { return dShape(z.x, z.z, s); })) - R, pathGap = Math.min.apply(Math, segs.map(function (S) { return dSeg(z.x, z.z, S[0], S[1]) - S[2]; })) - R, fcGap = Math.min.apply(Math, fcs.map(function (F) { return Math.hypot(z.x - F.x, z.z - F.z) - (F.r || 12); })) - R;
  var water = (REG.water.rivers || []).some(function (w) { var dx = Math.max(w.x1 - z.x, 0, z.x - w.x2), dz = Math.max(w.z1 - z.z, 0, z.z - w.z2); return Math.hypot(dx, dz) < R + (w.shore_w || 0); });
  var y0 = groundYAt(REG, z.x, z.z), flat = true; for (var k = 0; k < 32; k++) { var a = k / 32 * Math.PI * 2; [R * 0.5, R + 0.5].forEach(function (rr) { if (Math.abs(groundYAt(REG, z.x + Math.cos(a) * rr, z.z + Math.sin(a) * rr) - y0) > 0.02) flat = false; }); }
  return { id: z.id, x: z.x, z: z.z, clear: +clear.toFixed(2), pathGap: +pathGap.toFixed(2), fcGap: +fcGap.toFixed(2), water: water, flat: flat, yOk: Math.abs(y0 - (z.y || 0)) < 0.02, court: Math.hypot(z.x - 128, z.z - 50) - R - 30 }; });
var eyeBlockers = [].concat(J('play/rules1723/world_v1_colliders.json').shapes, J('play/rules1723/district_v1_colliders.json').shapes, L.shapes || []).filter(function (s) { return (s.x1 !== undefined || s.type === 'CYLINDER') && s.type !== 'RAMP' && !s.walkable && (s.y0 || 0) <= 1.7 && (s.h || 0) >= 1.7 && /^BLD_|_HALL|_DOME|_SPIRE|_TOWER|_GYM|_TEMPLE|_MARKET/.test(s.id || ''); });
function screened(a, b) { for (var q = 0; q < eyeBlockers.length; q++) { var S = eyeBlockers[q]; for (var t = 0.02; t < 0.98; t += 0.004) { var x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (S.type === 'CYLINDER' ? Math.hypot(x - S.x, z - S.z) <= S.r : (x >= S.x1 && x <= S.x2 && z >= S.z1 && z <= S.z2)) return S.id; } } return null; }
var pairs = []; for (var pa = 0; pa < Z.length; pa++) for (var pb = pa + 1; pb < Z.length; pb++) { var dd = Math.hypot(Z[pa].x - Z[pb].x, Z[pa].z - Z[pb].z); pairs.push({ a: Z[pa].id, b: Z[pb].id, d: +dd.toFixed(1), screen: screened(Z[pa], Z[pb]) }); }
ok('2. placement: a modest set of ' + Z.length + ' courts (' + Z.map(function (z) { return z.id; }).join(', ') + ') — each clear of every collider by ≥ 4 m beyond its circumradius, off every path / spur and forecourt, off water, flat at its registered height, clear of the match court; pairs ' + pairs.map(function (p) { return p.a.replace('CZ_', '') + '–' + p.b.replace('CZ_', '') + ' ' + p.d + ' m' + (p.screen ? ' (screened by ' + p.screen + ')' : ''); }).join(', '),
  Z.length >= 2 && Z.length <= 5 && Z.some(function (z) { return z.id === 'CZ_ELEVATOR_GROVE'; }) && CZ.placement && /modest/.test(CZ.placement.rule) && place.every(function (p) { return p.clear >= 4 && p.pathGap >= 1 && p.fcGap >= 1 && !p.water && p.flat && p.yOk && p.court > 0; }) &&
  pairs.every(function (p) { return p.d >= 90 && (p.d >= 120 || p.screen); }), { place: place, pairs: pairs });

/* 3. the phase machine: the six states, and live (class colour) is exactly 0 in DORMANT, READY and RESET */
var T0 = 10, P = { dorm: duelPhase(5, {}), ready: duelPhase(5, { occupied: true }), act0: duelPhase(T0 + 0.5, { tStart: T0 }), act1: duelPhase(T0 + (TIMING.split_hold_s + TIMING.activation_s) / 2, { tStart: T0 }), duel: duelPhase(T0 + TIMING.activation_s + 0.1, { tStart: T0 }),
  res: duelPhase(40.7, { tStart: T0, tResolve: 40 }), reset: duelPhase(40 + TIMING.resolution_s + 0.4, { tStart: T0, tResolve: 40 }), back: duelPhase(40 + TIMING.resolution_s + TIMING.reset_s + 0.01, { tStart: T0, tResolve: 40 }), backR: duelPhase(40 + TIMING.resolution_s + TIMING.reset_s + 0.01, { tStart: T0, tResolve: 40, occupied: true }) };
ok('3. phase machine: DORMANT (live 0) → READY (occupied, live 0) → ACTIVATION (full split, then easing out) → ACTIVE_DUEL (split 0, live 1) → RESOLUTION (draining) → RESET (live 0, sweeping) → DORMANT (or READY if occupied)',
  P.dorm.phase === 'DORMANT' && P.dorm.live === 0 && P.ready.phase === 'READY' && P.ready.live === 0 && P.ready.ready === 1 && P.act0.phase === 'ACTIVATION' && P.act0.split === 1 && P.act1.split > 0 && P.act1.split < 1 && P.duel.phase === 'ACTIVE_DUEL' && P.duel.split === 0 && P.duel.live === 1 &&
  P.res.phase === 'RESOLUTION' && P.res.live > 0 && P.res.live < 1 && P.reset.phase === 'RESET' && P.reset.live === 0 && P.reset.reset > 0 && P.reset.reset < 1 && P.back.phase === 'DORMANT' && P.backR.phase === 'READY' &&
  PHASES.join() === 'DORMANT,READY,ACTIVATION,ACTIVE_DUEL,RESOLUTION,RESET' && CLASS_PHASES.join() === 'ACTIVATION,ACTIVE_DUEL,RESOLUTION', P);

/* 3b. the territory template: the court's own symmetry gives every fighter an equal share — five = four corner territories + a central
       diamond (exact fifths), four = quadrants, two = halves on a symmetry line; fighters take the territory nearest them */
function shares(n, th) { var h = CZ.playable_m / 2, S = territorySlots(n, h, th), c = S.map(function () { return 0; }), N = 0; for (var x = -h + 0.1; x < h; x += 0.2) for (var z = -h + 0.1; z < h; z += 0.2) { var b = 0, bd = 1e18; S.forEach(function (p, k) { var d = (x - p[0]) * (x - p[0]) + (z - p[1]) * (z - p[1]); if (d < bd) { bd = d; b = k; } }); c[b]++; N++; } return c.map(function (v) { return v / N; }); }
var sh5 = shares(5), sh4 = shares(4), sh2 = shares(2, Math.PI / 4), h5 = CZ.playable_m / 2, perm5 = assignSlots([[0, 0], [-9, -9], [9, 9], [9, -9], [-9, 9]], territorySlots(5, h5));
ok('3b. territory template: five fighters split the court into four corner territories + a central diamond (|x|+|z| ≤ h·√0.4), each one fifth (' + sh5.map(function (v) { return v.toFixed(3); }).join(' / ') + '); four = quadrants; two = halves on the court symmetry line nearest the fighters; the least-travel assignment puts the centre fighter in the diamond',
  sh5.every(function (v) { return Math.abs(v - 0.2) < 0.006; }) && sh4.every(function (v) { return Math.abs(v - 0.25) < 0.006; }) && sh2.every(function (v) { return Math.abs(v - 0.5) < 0.01; }) && Math.abs(FIVE_DIAMOND - Math.sqrt(0.4)) < 1e-12 &&
  perm5.join() === '4,0,2,1,3' && Math.abs(splitAngle([-6, -5], [6, 6]) - Math.PI / 4) < 1e-9 && Math.abs(splitAngle([-6, 0.5], [6, 0]) - 0) < 1e-9 && Math.abs(splitAngle([6, 6], [-6, -5]) - Math.PI / 4) < 1e-9, { sh5: sh5, sh4: sh4, sh2: sh2, perm5: perm5 });

/* 4. the live module in a bare scene: DORMANT and READY (the WAITING window) write no class colour at all (every fighter slot WHITE); the
      host starts a FIVE-fighter match, one of each class listed in scrambled order: the territories are the roster engine's deterministic
      arrangement (dice-five, colour-contrast first), each slot k carries territory k's participant in its class colour; ACTIVE_DUEL
      presence follows its fighter, the airborne fighter reports AIRBORNE, a fighter who leaves the court fades out; RESOLUTION → RESET
      (white again) → DORMANT (REENTER: nobody still standing there is pulled into another match); events in order */
var parent = new THREE.Group(), cz = createCombatZones({ THREE: THREE, registry: REG, group: parent, night: true, quality: { tier: function () { return 'HIGH'; } } }); cz.build();
var zA = Z[0], c = Math.cos(zA.yaw_deg * Math.PI / 180), s = Math.sin(zA.yaw_deg * Math.PI / 180); function W(lx, lz, y) { return { x: zA.x + lx * c - lz * s, y: (zA.y || 0) + (y || 0), z: zA.z + lx * s + lz * c }; }
var floor = parent.getObjectByName('COMBAT_ZONE_FLOORS'), GA = floor.geometry.attributes;
function slotRGB() { var out = []; for (var k = 0; k < MAX_FIGHTERS; k++) { var a = GA['iC' + k]; out.push([a.getX(0), a.getY(0), a.getZ(0)]); } return out; }
function allWhite() { return slotRGB().every(function (v) { return v[0] === 1 && v[1] === 1 && v[2] === 1; }); }
function fam(f) { return new THREE.Color(REG.crystal_families[f].glow); } function same(v, col) { return Math.abs(v[0] - col.r) < 1e-6 && Math.abs(v[1] - col.g) < 1e-6 && Math.abs(v[2] - col.b) < 1e-6; }
var events = []; cz.onPhase(function (e) { events.push(e.phase); });
cz.tick(0.016, 100); var d0 = cz.phase(zA.id), d0White = allWhite() && GA.iK.getW(0) === 0;
var F = [{ fighterId: 'v', classId: 'VISIONARY', worldPosition: W(0.5, -0.5), teamId: 'C' }, { fighterId: 'l', classId: 'LEAN', worldPosition: W(6.5, 7) }, { fighterId: 'a', classId: 'ATHLETE', worldPosition: W(-7, -6.5), teamId: 'A', localInfluenceRadius: 3.5 },
  { fighterId: 'b', classId: 'BAGE', worldPosition: W(-7, 7) }, { fighterId: 't', classId: 'TITAN', worldPosition: W(7, -7), verticalState: 'AIRBORNE', airborneHeight: 1.6 }];
cz.setOccupants(zA.id, F.slice(0, 2), 1); cz.tick(0.016, 101); var r0 = cz.phase(zA.id), rWhite = allWhite() && GA.iK.getW(0) === 0 && GA.iK2.getX(0) > 0 && r0.wait > 0 && r0.wait < 1;
var b0 = cz.begin(zA.id, F, { t: 102 }); cz.tick(0.016, 102.5); var act = cz.phase(zA.id), rgbAct = slotRGB();
var want = arrangeTerritories(act.roster.participants.map(function (p) { return { fighterId: p.fighterId, slotId: p.slotId, classId: p.classId, local: p.local }; }), zA.playable_m / 2);
var famOf = { ATHLETE: 'gold', TITAN: 'blue', LEAN: 'red', VISIONARY: 'purple', BAGE: 'pink' };
var terrOk = GA.iK2.getW(0) % 10 === 5 && act.territories === 5 && act.template === 'DICE_FIVE' && act.fighters.every(function (f, k) { return f.territory === k && want.territoryOf[f.fighterId] === k; }) && Math.abs(want.colourScore - bestColourScore(act.fighters.map(function (f) { return f.classId; }))) < 1e-9;
var colOk = act.fighters.every(function (f, k) { return same(rgbAct[k], fam(famOf[f.classId])); }) && GA.iK.getY(0) === 1;
cz.tick(0.016, 102 + TIMING.activation_s + 0.5); cz.update(zA.id, [{ fighterId: 'a', worldPosition: W(-2, 3) }], 1); var duel = cz.phase(zA.id), byId = function (p, id) { return p.fighters.filter(function (f) { return f.fighterId === id; })[0]; }, fa = byId(duel, 'a'), ft = byId(duel, 't');
var out = W(30, 0); cz.update(zA.id, [{ fighterId: 'l', worldPosition: out }], 1); var left = cz.phase(zA.id);
cz.resolve(zA.id); cz.tick(0.016, 102 + TIMING.activation_s + 1.0); var res = cz.phase(zA.id);
cz.tick(0.016, 102 + TIMING.activation_s + 0.5 + TIMING.resolution_s + 0.4); var rst = cz.phase(zA.id), rstWhite = allWhite();
cz.tick(0.016, 102 + TIMING.activation_s + 0.5 + TIMING.resolution_s + TIMING.reset_s + 0.2); var after = cz.phase(zA.id);
cz.setOccupants(zA.id, F.slice(0, 2), 1); var still = cz.phase(zA.id);   /* still standing after the match: REENTER — no new window until they step off */
cz.setOccupants(zA.id, [], 1); for (var q = 0; q < 40; q++) cz.tick(0.05, 110 + q * 0.05); var end = cz.phase(zA.id), endWhite = allWhite();
ok('4. live module: DORMANT and READY (the waiting window) write no class colour (every slot white, live 0); a five-fighter match, one per class in scrambled order, takes the roster engine\'s deterministic dice-five arrangement (' + act.fighters.map(function (f) { return f.classId + '@' + f.territory; }).join(' ') + ') with each slot in its fighter\'s class colour; ACTIVE_DUEL presence follows its fighter, the airborne fighter reports AIRBORNE, a fighter who leaves fades out; RESOLUTION → RESET (white again) → DORMANT (REENTER); events in order',
  d0.phase === 'DORMANT' && !d0.classColourShown && d0White && r0.phase === 'READY' && !r0.classColourShown && rWhite && b0.phase === 'ACTIVATION' && act.phase === 'ACTIVATION' && act.classColourShown && terrOk && colOk && act.fighters.length === 5 &&
  duel.phase === 'ACTIVE_DUEL' && fa.classId === 'ATHLETE' && Math.abs(fa.local[0] + 2) < 0.01 && Math.abs(fa.local[1] - 3) < 0.01 && fa.presence === 1 && fa.teamId === 'A' && fa.influence === 3.5 && ft.verticalState === 'AIRBORNE' && ft.airborne &&
  byId(left, 'l').presence === 0 && res.phase === 'RESOLUTION' && rst.phase === 'RESET' && !rst.classColourShown && rstWhite && after.phase === 'DORMANT' && still.phase === 'DORMANT' && end.phase === 'DORMANT' && endWhite &&
  events.join('>') === 'READY>ACTIVATION>ACTIVE_DUEL>RESOLUTION>RESET>DORMANT', { d0: d0.phase, r0: r0.phase, wait: r0.wait, terr: terrOk, col: colOk, act: act.fighters.map(function (f) { return f.classId + '@' + f.territory; }), still: still.phase, events: events, rgbAct: rgbAct });

/* 5. host safety and the dormant look: one flush inlay draw (2.5 cm, no depth write), NO vertical shell / wall / cage / spectator mesh,
      nothing interactable, no collider; shards and meadow cover keep out of the footprint; the neutral palette is white or pale ice
      (colour law: NEUTRAL, or the BLUE window at low saturation — never a class colour's saturation) */
var CS = src('lab/world/combatZones.js'), FLOOR_VARY = (/'varying vec4 vLD;[^']*'/.exec(CS) || [''])[0], TERR = src('lab/world/terrain.js'), MEAD = src('lab/world/meadow.js'), meshes = []; parent.traverse(function (o) { if (o.isMesh) meshes.push(o.name); });
var pal = Object.keys(PALETTE).map(function (k) { var h = PALETTE[k], v = classify(h), r = ((h >> 16) & 255) / 255, g = ((h >> 8) & 255) / 255, b = (h & 255) / 255, chroma = Math.max(r, g, b) - Math.min(r, g, b); return { k: k, verdict: v.verdict, family: v.family, chroma: +chroma.toFixed(2) }; });   /* chroma, not saturation: a dark night tone is allowed its hue, never a class colour's strength */
var nAttr = (CS.match(/attribute vec4 i[A-Z][A-Za-z0-9]*;/g) || []).length + 1, nVary = (FLOOR_VARY.match(/varying vec4 v[A-Za-z0-9]+;/g) || []).length;
ok('5. host safety: one flush inlay (iZ.y + 0.025, no depth write) within the phone shader budget (' + nAttr + ' vertex attributes of WebGL2\'s guaranteed 16, ' + nVary + ' varyings of 15, per-court data flat), no shell / wall mesh (meshes: ' + meshes.join() + '), non-interactable, no collider or spectator structure; shards / meadow excluded from the footprint; the neutral palette is white / pale ice',
  nAttr <= 13 && nVary <= 12 && /flat varying vec4 vF0/.test(CS) && /iZ\.y \+ 0\.025/.test(CS) && /transparent: true, depthWrite: false, depthTest: true, blending: THREE\.CustomBlending/.test(CS) && meshes.length === 1 && meshes[0] === 'COMBAT_ZONE_FLOORS' && !/SHELL|shellGeometry/.test(CS) && floor.userData.nonInteractable &&
  !/colliders\.push|walls\.push|solids|spectator_r|tiers\.push/.test(CS) && /combatZoneCircles\(reg, 1\.5\)/.test(TERR) && /combatZoneCircles\(reg, 1\.5\)/.test(MEAD) &&
  pal.every(function (p) { return (p.verdict === 'NEUTRAL' || p.family === 'BLUE') && p.chroma <= 0.32; }) && Z.every(function (z) { return insideZone(z, z.x, z.z) && !insideZone(z, z.x + z.size_m, z.z); }) && combatZoneCircles(REG).length === Z.length && combatZoneCircles(REG, 0)[0].r > Z[0].size_m * 0.7, { meshes: meshes, pal: pal });

/* 6. future-ready hooks: the fighter contract (fighterId, classId, classColor, worldPosition, isParticipant, teamId, localInfluenceRadius,
      verticalState, airborneHeight) and the M15 shape both work; worldB.combatZones() exposes the API; the host adapter reads the
      snapshot's duel / match state; a new class can bring its own colour; the dev preview stages any phase with scale references */
var WB = src('lab/world/worldB.js'), RS = src('lab/world/duelRoster.js'); cz.setClassColor('NEWCLASS', 0x8f6ad8);
var legacy = cz.begin(zA.id, { id: 'a', cls: 'VISIONARY', x: W(-3, 0).x, z: W(-3, 0).z }, { id: 'b', cls: 'TITAN', x: W(3, 0).x, z: W(3, 0).z }), lg = legacy && legacy.fighters;
var np = cz.update(zA.id, [{ fighterId: 'x', classId: 'BAGE', worldPosition: W(0, 5), isParticipant: false }], 1), npF = np.fighters.filter(function (f) { return f.fighterId === 'x'; })[0], npWhite = slotRGB()[2].every(function (v) { return v === 1; });
ok('6. hooks: the fighter contract (classColor is derived from the class, never the slot) and the M15 { id, cls, x, z } shape both work; API setOccupants / begin / update / resolve / phase / onPhase / zoneAt via worldB.combatZones(); the host adapter reads snap.duel.state / rules.match.state, me.position, rules.me.class, the opponent; setClassColor extends the class map; ?duelDemo stages any of the six phases, ?scaleRefs places full-size references',
  ['fighterId', 'classId', 'worldPosition', 'isParticipant', 'teamId', 'localInfluenceRadius', 'verticalState', 'airborneHeight', 'airborneState'].every(function (k) { return (CS + RS).indexOf('f.' + k) >= 0; }) && lg && lg[0].classColor === '#b99cff' && lg[1].classColor === '#5c8cff' && lg && lg.length === 2 && lg[0].classId === 'VISIONARY' && Math.abs(lg[0].local[0] + 3) < 0.01 && np.territories === 2 && npF && npF.isParticipant === false && npF.territory === null && npWhite &&
  ['setOccupants', 'begin', 'update', 'resolve', 'join', 'leave', 'roster', 'snapshot', 'phase', 'onPhase', 'zoneAt'].every(function (k) { return typeof cz[k] === 'function'; }) && /combatZones: function \(\) \{ return mods\.combatZones && mods\.combatZones\.begin/.test(WB) && /\['combatZones', createCombatZones\], \['aura', createAura\]/.test(WB) &&
  /s\.duel && s\.duel\.state\) \|\| \(R\.match && R\.match\.state\)/.test(CS) && /R\.me && R\.me\.class/.test(CS) && cz.classColor('NEWCLASS') === '#8f6ad8' && /duelDemo=/.test(CS) && /scaleRefs=/.test(CS) && cz.zoneAt(zA.x, zA.z) === zA.id && cz.zoneAt(zA.x + 40, zA.z) === null && cz.debug().draw_calls === 1, null);
cz.dispose();

/* 7. M16 (owner 2026-09-27): the court carries the WORLD identity of all five classes — five tiny permanent gems in a centre rosette (gold,
      blue, crimson, violet, pink), fed from their own uniforms, never from a fighter slot, so they cannot become ownership colour — while
      the COMBAT colour comes only from the actual participants: a two-fighter duel (ATHLETE vs LEAN) splits the court into gold and crimson
      halves on a symmetry line, lights only those two fighters' fields and footprints, and every unused slot stays white */
var p2 = new THREE.Group(), c2 = createCombatZones({ THREE: THREE, registry: REG, group: p2, night: true, quality: { tier: function () { return 'HIGH'; } } }); c2.build();
var U = p2.getObjectByName('COMBAT_ZONE_FLOORS').material.uniforms, G2 = p2.getObjectByName('COMBAT_ZONE_FLOORS').geometry.attributes;
var famOf = { ATHLETE: 'gold', TITAN: 'blue', LEAN: 'red', VISIONARY: 'purple', BAGE: 'pink' };
var gemsOk = IDENTITY_ORDER.join() === 'ATHLETE,TITAN,LEAN,VISIONARY,BAGE' && U.uMk && U.uMk.value.length === 5 && IDENTITY_ORDER.every(function (c, k) { return U.uMk.value[k].getHexString() === new THREE.Color(REG.crystal_families[famOf[c]].glow).getHexString(); }) && U.uMarkK.value > 0 && U.uMarkK.value <= 1;
var gemSize = /czLine\(gd - ([0-9.]+), 0\.016\)/.exec(CS), rosR = /vec2\(cos\(a\), sin\(a\)\) \* ([0-9.]+);/.exec(CS), gemR = gemSize ? +gemSize[1] / 0.70710678 : 1, gemArea = 5 * 2 * gemR * gemR, courtArea = CZ.playable_m * CZ.playable_m;
c2.tick(0.016, 50); var dormWhite = [0, 1, 2, 3, 4].every(function (k) { var a = G2['iC' + k]; return a.getX(0) === 1 && a.getY(0) === 1 && a.getZ(0) === 1; });
c2.begin(zA.id, [{ fighterId: 'ath', classId: 'ATHLETE', worldPosition: W(-7.5, -7.5) }, { fighterId: 'lea', classId: 'LEAN', worldPosition: W(7.5, 7.5) }], { t: 50 }); c2.tick(0.016, 50.4); var p2p = c2.phase(zA.id);
var gold2 = new THREE.Color(REG.crystal_families.gold.glow), red2 = new THREE.Color(REG.crystal_families.red.glow), s0 = [G2.iC0.getX(0), G2.iC0.getY(0), G2.iC0.getZ(0)], s1 = [G2.iC1.getX(0), G2.iC1.getY(0), G2.iC1.getZ(0)];
var twoOk = p2p.territories === 2 && G2.iK2.getW(0) === 2 + 10 * 1 && Math.abs(s0[0] - gold2.r) < 1e-6 && Math.abs(s1[1] - red2.g) < 1e-6 && [2, 3, 4].every(function (k) { var a = G2['iC' + k]; return a.getX(0) === 1 && a.getY(0) === 1 && a.getZ(0) === 1; }) && p2p.fighters.map(function (f) { return f.classId; }).join() === 'ATHLETE,LEAN';
ok('7. two layers: five permanent class gems (' + IDENTITY_ORDER.join(' / ') + ') ring the centre at ' + (rosR ? rosR[1] : '?') + ' m from their own uniforms — tiny (' + (100 * gemArea / courtArea).toFixed(3) + ' % of the court) — while combat colour is only the participants\': ATHLETE vs LEAN = gold / crimson halves on the diagonal symmetry line, the other three slots white; dormant slots white',
  gemsOk && gemR <= 0.35 && gemArea / courtArea < 0.002 && rosR && +rosR[1] < 3 && dormWhite && twoOk && /footC \* live \* \(1\.0 - split\)/.test(CS), { gemsOk: gemsOk, gemR: gemR, twoOk: twoOk, iK2w: G2.iK2.getW(0), s0: s0, s1: s1, p2p: p2p.fighters.map(function (f) { return f.classId + '@' + f.territory; }) });
c2.dispose();

console.log('RESULT world combat zones: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
