/* M15b (owner 2026-09-27 correction; five classes on one court, owner follow-up): duel courts are large, ground-integrated square-diamond courts — dormant world infrastructure with
   ZERO class colour while inactive (white / cool white-blue / pale ice only), no walls / cage / raised arena / spectator structure. Size is
   validated from the rules (four fighters' largest area effects must fit without stacking). Six states: DORMANT → READY (neutral) →
   ACTIVATION (class territories, up to four fighters) → ACTIVE_DUEL (neutral court, local class presence fields) → RESOLUTION → RESET.
   ONE court is placed until the owner verifies the footprint and the dormant look.  node 16_TESTS/gameplay_world_combat_zones.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { createCombatZones, combatZoneList, combatZoneCircles, duelPhase, insideZone, CLASS_FAMILY, TIMING, SIZING, PALETTE, PHASES, CLASS_PHASES, MAX_FIGHTERS, territorySlots, assignSlots, splitAngle, FIVE_DIAMOND, IDENTITY_ORDER } from '../26_LOCAL_AUTHORITY/lab/world/combatZones.js';
import { groundYAt } from '../26_LOCAL_AUTHORITY/lab/world/worldLayout.js';
import { classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function J(p) { return JSON.parse(fs.readFileSync(path.join(LA, p), 'utf8')); } function src(p) { return fs.readFileSync(path.join(LA, p), 'utf8'); }
var REG = J('lab/assets/world/world_registry_v1.json'), CZ = REG.combat_zones, Z = combatZoneList(REG), RULES = J('play/rules1723/rules_17_23.dev.json');

/* 1. size, derived from the rules: the largest area effect in the skill catalogue (radius in melee units × melee_unit_m). All FIVE classes
      can meet on one court, and the tightest square holding five such areas without stacking is the dice-five pattern, R·(2 + 2√2)
      (four fighters: 2 × 2 = 4R); the court's playable width covers that, and the owner's 18 m floor */
var MU = RULES._runtime_mapping.melee_unit_m, maxR = 0; (RULES.skills || []).forEach(function (s) { var e = s.effect || {}; if (isFinite(e.radius_melee_units)) maxR = Math.max(maxR, e.radius_melee_units); });
var R1 = maxR * MU, pack4 = 4 * R1, pack5 = R1 * (2 + 2 * Math.SQRT2), fams = Object.keys(REG.crystal_families).filter(function (k) { return k[0] !== '_'; });
ok('1. size from the rules: the largest area effect is ' + maxR + ' units × ' + MU + ' m = ' + R1 + ' m radius → five fighters (one per class) pack into ' + pack5.toFixed(1) + ' m (four: ' + pack4 + ' m); the court gives ' + CZ.playable_m + ' m playable (≥ that, ≥ the owner\'s 18 m, ≤ 36 m) + a ' + CZ.border_m + ' m border; ground-only square-diamond, no spectators; the five classes map onto the crystal families',
  MAX_FIGHTERS === 5 && CZ.sizing.max_fighters === 5 && CZ.playable_m >= pack5 && CZ.playable_m >= 18 && CZ.playable_m <= 36 && SIZING.playable_m === CZ.playable_m && SIZING.max_aoe_radius_m === R1 && CZ.sizing.four_fighter_packing_m === pack4 && Math.abs(CZ.sizing.five_fighter_packing_m - pack5) < 0.01 && CZ.border_m > 0.5 && CZ.border_m <= 2 &&
  CZ.ground_only === true && CZ.spectators === false && CZ.shape === 'SQUARE_DIAMOND' && Z.every(function (z) { return z.playable_m === CZ.playable_m && Math.abs(z.size_m - (CZ.playable_m + 2 * CZ.border_m)) < 1e-9 && /^CZ_/.test(z.id); }) &&
  ['ATHLETE', 'TITAN', 'LEAN', 'VISIONARY', 'BAGE'].every(function (c) { return CZ.class_family[c] === CLASS_FAMILY[c] && fams.indexOf(CLASS_FAMILY[c]) >= 0; }), { playable: CZ.playable_m, pack5: pack5, maxR: maxR });

/* 2. placement: ONE court until the owner verifies it (the M15 sites wait in pending_sites); it is clear of every collider (field base +
      district + world; the HALO deck at 240 m and walkable tops excepted), off every path ribbon / spur / forecourt, off water, on flat
      ground at its registered height, and clear of the official match court */
var L = RULES._runtime_mapping.field_colliders_district_v1;
var shapes = [].concat(L.shapes || [], J('play/rules1723/world_v1_colliders.json').shapes, J('play/rules1723/district_v1_colliders.json').shapes).filter(function (s) { return !/^WALL_/.test(s.id || '') && !((s.y0 || 0) >= 2) && !/(_TOP|_RAMP(_[NSEW])?|_BED|_SHORE(_[NSEW])?)$/.test(s.id || ''); });
function dShape(x, z, s) { if (s.type === 'CYLINDER') return Math.hypot(x - s.x, z - s.z) - (s.r || 0.5); if (s.x1 !== undefined) { var dx = Math.max(s.x1 - x, 0, x - s.x2), dz = Math.max(s.z1 - z, 0, z - s.z2); return (dx || dz) ? Math.hypot(dx, dz) : -1; } return 1e9; }
function dSeg(x, z, a, b) { var dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
var PW = REG.paths, Wd = { CAUSEWAY: PW.causeway_w || 20, REGIONAL: PW.regional_w || 8, TRAIL: PW.trail_w || 3 }, segs = [], fcs = [];
PW.list.forEach(function (P) { var pts = P.pts || [], w = P.width_m || Wd[P.tier] || 6; for (var i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i], w / 2]); if (P.forecourt) { fcs.push(P.forecourt); [P.spur, P.spur2].forEach(function (S) { if (S && S.to) segs.push([[P.forecourt.x, P.forecourt.z], S.to, (PW.spur_w || 6) / 2]); }); } });
var place = Z.map(function (z) { var R = z.size_m * 0.7072, clear = Math.min.apply(Math, shapes.map(function (s) { return dShape(z.x, z.z, s); })) - R, pathGap = Math.min.apply(Math, segs.map(function (S) { return dSeg(z.x, z.z, S[0], S[1]) - S[2]; })) - R, fcGap = Math.min.apply(Math, fcs.map(function (F) { return Math.hypot(z.x - F.x, z.z - F.z) - (F.r || 12); })) - R;
  var water = (REG.water.rivers || []).some(function (w) { var dx = Math.max(w.x1 - z.x, 0, z.x - w.x2), dz = Math.max(w.z1 - z.z, 0, z.z - w.z2); return Math.hypot(dx, dz) < R + (w.shore_w || 0); });
  var y0 = groundYAt(REG, z.x, z.z), flat = true; for (var k = 0; k < 32; k++) { var a = k / 32 * Math.PI * 2; [R * 0.5, R + 0.5].forEach(function (rr) { if (Math.abs(groundYAt(REG, z.x + Math.cos(a) * rr, z.z + Math.sin(a) * rr) - y0) > 0.02) flat = false; }); }
  return { id: z.id, clear: +clear.toFixed(2), pathGap: +pathGap.toFixed(2), fcGap: +fcGap.toFixed(2), water: water, flat: flat, yOk: Math.abs(y0 - (z.y || 0)) < 0.02, court: Math.hypot(z.x - 128, z.z - 50) - R - 30 }; });
ok('2. placement: exactly one court (' + Z.map(function (z) { return z.id; }).join() + ') until the footprint is verified, the M15 sites parked in pending_sites; clear of every collider by ≥ 2 m, off every path / spur (≥ 1 m) and forecourt, off water, flat at its registered height, clear of the match court',
  Z.length === 1 && Z[0].id === 'CZ_ELEVATOR_GROVE' && (CZ.pending_sites || []).length >= 5 && place.every(function (p) { return p.clear >= 2 && p.pathGap >= 1 && p.fcGap >= 1 && !p.water && p.flat && p.yOk && p.court > 0; }), place);

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

/* 4. the live module in a bare scene: dormant and READY write no class colour at all (every fighter slot WHITE); a FIVE-fighter duel, one of
      each class, listed in scrambled order, runs through its API: every fighter lands in the territory nearest them (the dice-five: four
      corners + the central diamond) with its class colour — ATHLETE gold, TITAN blue, LEAN crimson, BAGE pink, VISIONARY purple — then
      local presence fields that follow their fighters, an airborne fighter, a fighter who leaves fades out; RESOLUTION → RESET → READY →
      DORMANT, with phase events in order */
var parent = new THREE.Group(), cz = createCombatZones({ THREE: THREE, registry: REG, group: parent, night: true, quality: { tier: function () { return 'HIGH'; } } }); cz.build();
var zA = Z[0], c = Math.cos(zA.yaw_deg * Math.PI / 180), s = Math.sin(zA.yaw_deg * Math.PI / 180); function W(lx, lz, y) { return { x: zA.x + lx * c - lz * s, y: (zA.y || 0) + (y || 0), z: zA.z + lx * s + lz * c }; }
var floor = parent.getObjectByName('COMBAT_ZONE_FLOORS'), GA = floor.geometry.attributes;
function slotRGB() { var out = []; for (var k = 0; k < MAX_FIGHTERS; k++) { var a = GA['iC' + k]; out.push([a.getX(0), a.getY(0), a.getZ(0)]); } return out; }
function allWhite() { return slotRGB().every(function (v) { return v[0] === 1 && v[1] === 1 && v[2] === 1; }); }
function fam(f) { return new THREE.Color(REG.crystal_families[f].glow); } function same(v, col) { return Math.abs(v[0] - col.r) < 1e-6 && Math.abs(v[1] - col.g) < 1e-6 && Math.abs(v[2] - col.b) < 1e-6; }
var events = []; cz.onPhase(function (e) { events.push(e.phase); });
cz.tick(0.016, 100); var d0 = cz.phase(zA.id), d0White = allWhite() && GA.iK.getW(0) === 0;
var F = [{ fighterId: 'v', classId: 'VISIONARY', worldPosition: W(0.5, -0.5), teamId: 'C' }, { fighterId: 'l', classId: 'LEAN', worldPosition: W(8.5, 9) }, { fighterId: 'a', classId: 'ATHLETE', worldPosition: W(-9, -8.5), teamId: 'A', localInfluenceRadius: 3.5 },
  { fighterId: 'b', classId: 'BAGE', worldPosition: W(-9, 9) }, { fighterId: 't', classId: 'TITAN', worldPosition: W(9, -9), verticalState: 'AIRBORNE', airborneHeight: 1.6 }];
cz.setOccupants(zA.id, F.slice(0, 2), 1); cz.tick(0.016, 101); var r0 = cz.phase(zA.id), rWhite = allWhite() && GA.iK.getW(0) === 0 && GA.iK2.getX(0) > 0;
var b0 = cz.begin(zA.id, F, { t: 102 }); cz.tick(0.016, 102.5); var act = cz.phase(zA.id), rgbAct = slotRGB();
var terrOk = GA.iK2.getW(0) % 10 === 5 && act.territories === 5 && act.fighters.map(function (f) { return f.classId + '@' + f.territory; }).join() === 'ATHLETE@0,TITAN@1,LEAN@2,BAGE@3,VISIONARY@4';
var colOk = same(rgbAct[0], fam('gold')) && same(rgbAct[1], fam('blue')) && same(rgbAct[2], fam('red')) && same(rgbAct[3], fam('pink')) && same(rgbAct[4], fam('purple')) && GA.iK.getY(0) === 1;
cz.tick(0.016, 102 + TIMING.activation_s + 0.5); cz.update(zA.id, [{ fighterId: 'a', worldPosition: W(-2, 3) }], 1); var duel = cz.phase(zA.id), fa = duel.fighters[0], ft = duel.fighters[1];
var out = W(30, 0); cz.update(zA.id, [{ fighterId: 'l', worldPosition: out }], 1); var left = cz.phase(zA.id);
cz.resolve(zA.id); cz.tick(0.016, 102 + TIMING.activation_s + 1.0); var res = cz.phase(zA.id);
cz.tick(0.016, 102 + TIMING.activation_s + 0.5 + TIMING.resolution_s + 0.4); var rst = cz.phase(zA.id), rstWhite = allWhite();
cz.tick(0.016, 102 + TIMING.activation_s + 0.5 + TIMING.resolution_s + TIMING.reset_s + 0.2); var after = cz.phase(zA.id);
cz.setOccupants(zA.id, [], 1); for (var q = 0; q < 40; q++) cz.tick(0.05, 110 + q * 0.05); var end = cz.phase(zA.id), endWhite = allWhite();
ok('4. live module: DORMANT and READY write no class colour (every slot white, live 0); a five-fighter duel, one per class in scrambled order: each lands in its nearest dice-five territory (ATHLETE gold, TITAN blue, LEAN crimson, BAGE pink at the corners, VISIONARY purple in the central diamond); ACTIVE_DUEL presence follows its fighter, the airborne fighter reports AIRBORNE, a fighter who leaves fades out; RESOLUTION → RESET (white again) → READY → DORMANT; events in order',
  d0.phase === 'DORMANT' && !d0.classColourShown && d0White && r0.phase === 'READY' && !r0.classColourShown && rWhite && b0.phase === 'ACTIVATION' && act.phase === 'ACTIVATION' && act.classColourShown && terrOk && colOk && act.fighters.length === 5 &&
  duel.phase === 'ACTIVE_DUEL' && fa.classId === 'ATHLETE' && Math.abs(fa.local[0] + 2) < 0.01 && Math.abs(fa.local[1] - 3) < 0.01 && fa.presence === 1 && fa.teamId === 'A' && fa.influence === 3.5 && fa.territory === 0 && ft.verticalState === 'AIRBORNE' && ft.airborne &&
  left.fighters[2].classId === 'LEAN' && left.fighters[2].presence === 0 && res.phase === 'RESOLUTION' && rst.phase === 'RESET' && !rst.classColourShown && rstWhite && after.phase === 'READY' && end.phase === 'DORMANT' && endWhite &&
  events.join('>') === 'READY>ACTIVATION>ACTIVE_DUEL>RESOLUTION>RESET>READY>DORMANT', { d0: d0.phase, r0: r0.phase, act: act, terr: terrOk, col: colOk, duel: duel.fighters.map(function (f) { return f.classId + '@' + f.territory; }), left: left.fighters[2], events: events, rgbAct: rgbAct });

/* 5. host safety and the dormant look: one flush inlay draw (2.5 cm, no depth write), NO vertical shell / wall / cage / spectator mesh,
      nothing interactable, no collider; shards and meadow cover keep out of the footprint; the neutral palette is white or pale ice
      (colour law: NEUTRAL, or the BLUE window at low saturation — never a class colour's saturation) */
var CS = src('lab/world/combatZones.js'), FLOOR_VARY = (/'varying vec4 vLD;[^']*'/.exec(CS) || [''])[0], TERR = src('lab/world/terrain.js'), MEAD = src('lab/world/meadow.js'), meshes = []; parent.traverse(function (o) { if (o.isMesh) meshes.push(o.name); });
var pal = Object.keys(PALETTE).map(function (k) { var h = PALETTE[k], v = classify(h), r = ((h >> 16) & 255) / 255, g = ((h >> 8) & 255) / 255, b = (h & 255) / 255, chroma = Math.max(r, g, b) - Math.min(r, g, b); return { k: k, verdict: v.verdict, family: v.family, chroma: +chroma.toFixed(2) }; });   /* chroma, not saturation: a dark night tone is allowed its hue, never a class colour's strength */
var nAttr = (CS.match(/attribute vec4 i[A-Z][A-Za-z0-9]*;/g) || []).length + 1, nVary = (FLOOR_VARY.match(/varying vec4 v[A-Za-z0-9]+;/g) || []).length;
ok('5. host safety: one flush inlay (iZ.y + 0.025, no depth write) within the phone shader budget (' + nAttr + ' vertex attributes of WebGL2\'s guaranteed 16, ' + nVary + ' varyings of 15, per-court data flat), no shell / wall mesh (meshes: ' + meshes.join() + '), non-interactable, no collider or spectator structure; shards / meadow excluded from the footprint; the neutral palette is white / pale ice',
  nAttr <= 13 && nVary <= 12 && /flat varying vec4 vF0/.test(CS) && /iZ\.y \+ 0\.025/.test(CS) && /transparent: true, depthWrite: false, depthTest: true, blending: THREE\.CustomBlending/.test(CS) && meshes.length === 1 && meshes[0] === 'COMBAT_ZONE_FLOORS' && !/SHELL|shellGeometry/.test(CS) && floor.userData.nonInteractable &&
  !/colliders\.push|walls\.push|solids|spectator_r|tiers\.push/.test(CS) && /combatZoneCircles\(reg, 1\.5\)/.test(TERR) && /combatZoneCircles\(reg, 1\.5\)/.test(MEAD) &&
  pal.every(function (p) { return (p.verdict === 'NEUTRAL' || p.family === 'BLUE') && p.chroma <= 0.32; }) && Z.every(function (z) { return insideZone(z, z.x, z.z) && !insideZone(z, z.x + z.size_m, z.z); }) && combatZoneCircles(REG).length === Z.length && combatZoneCircles(REG, 0)[0].r > 20, { meshes: meshes, pal: pal });

/* 6. future-ready hooks: the fighter contract (fighterId, classId, classColor, worldPosition, isParticipant, teamId, localInfluenceRadius,
      verticalState, airborneHeight) and the M15 shape both work; worldB.combatZones() exposes the API; the host adapter reads the
      snapshot's duel / match state; a new class can bring its own colour; the dev preview stages any phase with scale references */
var WB = src('lab/world/worldB.js'); cz.setClassColor('NEWCLASS', 0x8f6ad8);
var legacy = cz.begin(zA.id, { id: 'a', cls: 'VISIONARY', x: W(-3, 0).x, z: W(-3, 0).z }, { id: 'b', cls: 'TITAN', x: W(3, 0).x, z: W(3, 0).z }), lg = legacy && legacy.fighters;
var np = cz.update(zA.id, [{ fighterId: 'x', classId: 'BAGE', worldPosition: W(0, 5), isParticipant: false }], 1), npF = np.fighters.filter(function (f) { return f.fighterId === 'x'; })[0], npWhite = slotRGB()[2].every(function (v) { return v === 1; });
ok('6. hooks: the fighter contract and the M15 { id, cls, x, z } shape both work; API setOccupants / begin / update / resolve / phase / onPhase / zoneAt via worldB.combatZones(); the host adapter reads snap.duel.state / rules.match.state, me.position, rules.me.class, the opponent; setClassColor extends the class map; ?duelDemo stages any of the six phases, ?scaleRefs places full-size references',
  ['fighterId', 'classId', 'classColor', 'worldPosition', 'isParticipant', 'teamId', 'localInfluenceRadius', 'verticalState', 'airborneHeight'].every(function (k) { return CS.indexOf('f.' + k) >= 0; }) && lg && lg.length === 2 && lg[0].classId === 'VISIONARY' && Math.abs(lg[0].local[0] + 3) < 0.01 && np.territories === 2 && npF && npF.isParticipant === false && npF.territory === null && npWhite &&
  ['setOccupants', 'begin', 'update', 'resolve', 'phase', 'onPhase', 'zoneAt'].every(function (k) { return typeof cz[k] === 'function'; }) && /combatZones: function \(\) \{ return mods\.combatZones && mods\.combatZones\.begin/.test(WB) && /\['combatZones', createCombatZones\], \['aura', createAura\]/.test(WB) &&
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
