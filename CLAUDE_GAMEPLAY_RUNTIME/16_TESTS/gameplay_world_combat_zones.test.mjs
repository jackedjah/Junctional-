/* M15 (owner 2026-09-27): embedded duel / combat zones — ground only, square-diamond, 9–14 m across, scattered (not stacked, not in rows,
   not on paths / buildings / water), DORMANT white-blue → ACTIVATION class split by side → ACTIVE cool base with class colour local to each
   fighter → RELEASE; class-aware, future-ready API; pure light (no collider, no spectator structure).  node 16_TESTS/gameplay_world_combat_zones.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { createCombatZones, combatZoneList, combatZoneCircles, duelPhase, insideZone, zoneLocal, CLASS_FAMILY, TIMING } from '../26_LOCAL_AUTHORITY/lab/world/combatZones.js';
import { groundYAt } from '../26_LOCAL_AUTHORITY/lab/world/worldLayout.js';
import { classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function J(p) { return JSON.parse(fs.readFileSync(path.join(LA, p), 'utf8')); } function src(p) { return fs.readFileSync(path.join(LA, p), 'utf8'); }
var REG = J('lab/assets/world/world_registry_v1.json'), CZ = REG.combat_zones, Z = combatZoneList(REG);

/* 1. the registry contract */
var fams = Object.keys(REG.crystal_families).filter(function (k) { return k[0] !== '_'; });
ok('1. registry: ' + Z.length + ' ground-only square-diamond zones, 9–14 m across, no spectators, the five classes mapped onto the crystal families', Z.length >= 5 && CZ.ground_only === true && CZ.spectators === false && CZ.shape === 'SQUARE_DIAMOND' && Z.every(function (z) { return z.size_m >= 9 && z.size_m <= 14 && /^CZ_/.test(z.id); }) && ['ATHLETE', 'TITAN', 'LEAN', 'VISIONARY', 'BAGE'].every(function (c) { return CZ.class_family[c] === CLASS_FAMILY[c] && fams.indexOf(CLASS_FAMILY[c]) >= 0; }) && new Set(Z.map(function (z) { return z.id; })).size === Z.length, Z.map(function (z) { return z.id; }));

/* 2. placement: clear of every collider (field base + district + world; the HALO deck at 240 m and walkable tops excepted), off every path
      ribbon / spur / forecourt, off water, on flat ground at the registered height, far apart and never three in a row */
var L = J('play/rules1723/rules_17_23.dev.json')._runtime_mapping.field_colliders_district_v1;
var shapes = [].concat(L.shapes || [], J('play/rules1723/world_v1_colliders.json').shapes, J('play/rules1723/district_v1_colliders.json').shapes).filter(function (s) { return !/^WALL_/.test(s.id || '') && !((s.y0 || 0) >= 2) && !/(_TOP|_RAMP(_[NSEW])?|_BED|_SHORE(_[NSEW])?)$/.test(s.id || ''); });
function dShape(x, z, s) { if (s.type === 'CYLINDER') return Math.hypot(x - s.x, z - s.z) - (s.r || 0.5); if (s.x1 !== undefined) { var dx = Math.max(s.x1 - x, 0, x - s.x2), dz = Math.max(s.z1 - z, 0, z - s.z2); return (dx || dz) ? Math.hypot(dx, dz) : -1; } return 1e9; }
function dSeg(x, z, a, b) { var dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
var PW = REG.paths, Wd = { CAUSEWAY: PW.causeway_w || 20, REGIONAL: PW.regional_w || 8, TRAIL: PW.trail_w || 3 }, segs = [], fcs = [];
PW.list.forEach(function (P) { var pts = P.pts || [], w = P.width_m || Wd[P.tier] || 6; for (var i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i], w / 2]); if (P.forecourt) { fcs.push(P.forecourt); [P.spur, P.spur2].forEach(function (S) { if (S && S.to) segs.push([[P.forecourt.x, P.forecourt.z], S.to, (PW.spur_w || 6) / 2]); }); } });
var place = Z.map(function (z) { var R = z.size_m * 0.7072, clear = Math.min.apply(Math, shapes.map(function (s) { return dShape(z.x, z.z, s); })) - R, pathGap = Math.min.apply(Math, segs.map(function (S) { return dSeg(z.x, z.z, S[0], S[1]) - S[2]; })) - R, fcGap = Math.min.apply(Math, fcs.map(function (F) { return Math.hypot(z.x - F.x, z.z - F.z) - (F.r || 12); })) - R;
  var water = (REG.water.rivers || []).some(function (w) { var dx = Math.max(w.x1 - z.x, 0, z.x - w.x2), dz = Math.max(w.z1 - z.z, 0, z.z - w.z2); return Math.hypot(dx, dz) < R + (w.shore_w || 0); });
  var y0 = groundYAt(REG, z.x, z.z), flat = true; for (var k = 0; k < 24; k++) { var a = k / 24 * Math.PI * 2; [R * 0.5, R + 0.5].forEach(function (rr) { if (Math.abs(groundYAt(REG, z.x + Math.cos(a) * rr, z.z + Math.sin(a) * rr) - y0) > 0.02) flat = false; }); }
  return { id: z.id, clear: +clear.toFixed(2), pathGap: +pathGap.toFixed(2), fcGap: +fcGap.toFixed(2), water: water, flat: flat, yOk: Math.abs(y0 - (z.y || 0)) < 0.02 }; });
var minPair = 1e9, rows = 0; for (var i = 0; i < Z.length; i++) for (var j = i + 1; j < Z.length; j++) { minPair = Math.min(minPair, Math.hypot(Z[i].x - Z[j].x, Z[i].z - Z[j].z));
  for (var k = j + 1; k < Z.length; k++) { var ax = Z[j].x - Z[i].x, az = Z[j].z - Z[i].z, bx = Z[k].x - Z[i].x, bz = Z[k].z - Z[i].z, area = Math.abs(ax * bz - az * bx) / 2, longest = Math.max(Math.hypot(ax, az), Math.hypot(bx, bz), Math.hypot(Z[k].x - Z[j].x, Z[k].z - Z[j].z)); if (longest <= 200 && area / (longest * longest) < 0.05) rows++; } }   /* a row is three near-collinear zones within 200 m (close enough to read as a row from one place) */
ok('2. placement: every zone clear of every collider by ≥ 2 m, off every path / spur (≥ 1 m) and forecourt, off water, on flat ground at its registered height; zones ≥ 70 m apart (min ' + minPair.toFixed(0) + ' m) and no three in a row within 200 m', place.every(function (p) { return p.clear >= 2 && p.pathGap >= 1 && p.fcGap >= 1 && !p.water && p.flat && p.yOk; }) && minPair >= 70 && rows === 0, { place: place, rows: rows });

/* 3. the phase machine */
var P0 = duelPhase(10, null, null), P1 = duelPhase(10.5, 10, null), P2 = duelPhase(10 + (TIMING.split_hold_s + TIMING.activation_s) / 2, 10, null), P3 = duelPhase(10 + TIMING.activation_s + 0.1, 10, null), P4 = duelPhase(40.7, 10, 40), P5 = duelPhase(40 + TIMING.release_s + 0.01, 10, 40);
ok('3. phase machine: DORMANT (no colour) → ACTIVATION (full split, then easing out) → ACTIVE (split 0, live) → RELEASE (draining) → DORMANT', P0.phase === 'DORMANT' && P0.live === 0 && P1.phase === 'ACTIVATION' && P1.split === 1 && P2.phase === 'ACTIVATION' && P2.split > 0 && P2.split < 1 && P3.phase === 'ACTIVE' && P3.split === 0 && P3.live === 1 && P4.phase === 'RELEASE' && P4.live > 0 && P4.live < 1 && P5.phase === 'DORMANT', { P0: P0, P1: P1, P2: P2, P3: P3, P4: P4, P5: P5 });

/* 4. the live module: build in a bare scene, run a duel through its API (class-aware colours, per-fighter local footprints, the split
      axis follows the fighters, presence fades with leaving the zone, phase events) */
var parent = new THREE.Group(), cz = createCombatZones({ THREE: THREE, registry: REG, group: parent, night: true, quality: { tier: function () { return 'HIGH'; } } }); cz.build();
var zA = Z[0], c = Math.cos(zA.yaw_deg * Math.PI / 180), s = Math.sin(zA.yaw_deg * Math.PI / 180); function W(lx, lz) { return [zA.x + lx * c - lz * s, zA.z + lx * s + lz * c]; }
var events = []; cz.onPhase(function (e) { events.push(e.phase); });
cz.tick(0.016, 100); var a0 = W(-3, 0), b0 = W(3, 0); var ph1 = cz.begin(zA.id, { id: 'p1', cls: 'ATHLETE', x: a0[0], z: a0[1] }, { id: 'p2', cls: 'LEAN', x: b0[0], z: b0[1] });
var floor = parent.getObjectByName('COMBAT_ZONE_FLOORS'), shell = parent.getObjectByName('COMBAT_ZONE_SHELLS'), iK = floor.geometry.attributes.iK, iCA = floor.geometry.attributes.iCA, iCB = floor.geometry.attributes.iCB, iAx = floor.geometry.attributes.iAx;
var splitAt = iK.getY(zA.index !== undefined ? zA.index : 0); var gold = new THREE.Color(REG.crystal_families.gold.glow), red = new THREE.Color(REG.crystal_families.red.glow);
var colOk = Math.abs(iCA.getX(0) - gold.r) < 1e-6 && Math.abs(iCB.getX(0) - red.r) < 1e-6 && cz.classColor('ATHLETE') === '#' + gold.getHexString() && cz.classColor('LEAN') === '#' + red.getHexString();
cz.tick(0.016, 100.5); var mid = cz.phase(zA.id); cz.tick(0.016, 104); var a1 = W(-1, 2.5), b1 = W(4, -2); cz.update(zA.id, [{ id: 'p1', x: a1[0], z: a1[1], y: 1.2 }, { id: 'p2', x: b1[0], z: b1[1] }], 1); var act = cz.phase(zA.id);
var out = W(20, 0); cz.update(zA.id, [{ id: 'p2', x: out[0], z: out[1] }], 1); var left = cz.phase(zA.id); cz.end(zA.id); cz.tick(0.016, 104.5); var rel = cz.phase(zA.id); cz.tick(0.016, 104 + TIMING.release_s + 0.2); var dorm = cz.phase(zA.id);
var liveAttr = iK.getW(0), others = Z.slice(1).every(function (z, i) { return cz.phase(z.id).phase === 'DORMANT'; });
ok('4. the API runs a duel: begin (ATHLETE gold on A\'s side, LEAN crimson on B\'s, split axis A←B) → ACTIVE with each fighter\'s local position / height / presence → a fighter who leaves fades out → end → RELEASE → DORMANT; phase events fire in order; other zones stay dormant', ph1.phase === 'ACTIVATION' && splitAt === 1 && iAx.getX(0) < -0.99 && colOk && mid.phase === 'ACTIVATION' && act.phase === 'ACTIVE' && Math.abs(act.fighters[0].local[0] + 1) < 0.01 && Math.abs(act.fighters[0].local[1] - 2.5) < 0.01 && act.fighters[1].presence === 1 && left.fighters[1].presence === 0 && rel.phase === 'RELEASE' && dorm.phase === 'DORMANT' && events.join('>') === 'ACTIVATION>ACTIVE>RELEASE>DORMANT' && others, { ph1: ph1, act: act, left: left, rel: rel.phase, dorm: dorm.phase, events: events, splitAt: splitAt, axis: [iAx.getX(0), iAx.getY(0)] });

/* 5. host safety: pure light, ground only, nothing interactable, no spectator structure; the floor sits 2.5 cm above the ground; shards and
      meadow cover keep out of the footprint; the dormant palette is the icy / white family (colour law) */
var CS = src('lab/world/combatZones.js'), TERR = src('lab/world/terrain.js'), MEAD = src('lab/world/meadow.js');
var vecs = [/ice = vec3\(([0-9.]+), ([0-9.]+), ([0-9.]+)\)/.exec(CS), /vec3 base = vec3\(([0-9.]+), ([0-9.]+), ([0-9.]+)\)/.exec(CS)].map(function (m) { return m ? classify((Math.round(+m[1] * 255) << 16) | (Math.round(+m[2] * 255) << 8) | Math.round(+m[3] * 255)) : null; });
ok('5. host safety: the floor is a 2.5 cm inlay (no depth write), the shell is additive light (no depth write), both non-interactable, no collider or spectator structure; shards / meadow excluded from every footprint; the dormant ice palette is TITAN-blue family or neutral', /iZ\.y \+ 0\.025/.test(CS) && /blending: THREE\.AdditiveBlending, side: THREE\.DoubleSide, toneMapped: false \}\); own\.push\(smt\)/.test(CS) && /transparent: true, depthWrite: false, depthTest: true, blending: THREE\.CustomBlending/.test(CS) && floor.userData.nonInteractable && shell.userData.nonInteractable && !/colliders\.push|walls\.push|solids|spectator_r|tiers\.push/.test(CS) && /combatZoneCircles\(reg, 1\.5\)/.test(TERR) && /combatZoneCircles\(reg, 1\.5\)/.test(MEAD) && vecs.every(function (v) { return v && (v.verdict === 'NEUTRAL' || v.family === 'BLUE'); }) && Z.every(function (z) { return insideZone(z, z.x, z.z) && !insideZone(z, z.x + z.size_m, z.z); }) && combatZoneCircles(REG).length === Z.length, { vecs: vecs });

/* 6. future-ready hooks: the world exposes the API (worldB.combatZones()), the host adapter reads the snapshot's duel / match state, a new
      class can bring its own colour, and the dev preview can stage any phase */
var WB = src('lab/world/worldB.js'); cz.setClassColor('NEWCLASS', 0x8f6ad8);
ok('6. hooks: worldB.combatZones() exposes begin / update / end / phase / onPhase / zoneAt; the host adapter reads snap.duel.state / rules.match.state, me.position, rules.me.class, the opponent; setClassColor extends the class map; ?duelDemo stages any phase', /combatZones: function \(\) \{ return mods\.combatZones && mods\.combatZones\.begin/.test(WB) && /\['combatZones', createCombatZones\], \['aura', createAura\]/.test(WB) && /s\.duel && s\.duel\.state\) \|\| \(R\.match && R\.match\.state\)/.test(CS) && /R\.me && R\.me\.class/.test(CS) && cz.classColor('NEWCLASS') === '#8f6ad8' && /duelDemo=/.test(CS) && typeof cz.zoneAt === 'function' && cz.zoneAt(zA.x, zA.z) === zA.id && cz.zoneAt(zA.x + 40, zA.z) === null, null);
cz.dispose();

console.log('RESULT world combat zones: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
