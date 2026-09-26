/* World pivot (2026-09-25) host-safety contract: every visual pivot addition stays presentation-only. The host owns walkable ground, the
   generated colliders and the HALO radial limit, and its own tests need the runtime bridge — so the pivot keeps its art where the host never
   reads it: on the exact collision surfaces, inside collider footprints, above head height, or beyond the host limits.
   node 16_TESTS/gameplay_world_pivot_host_safety.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { HALO_LAYOUT } from '../26_LOCAL_AUTHORITY/play/haloLayout.js';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { createFacadeKit, addCivicBuilding } from '../26_LOCAL_AUTHORITY/lab/world/facadeKit.js';
import { ridgeStations, ridgeFaceSegment, ridgeReachBounds } from '../26_LOCAL_AUTHORITY/lab/world/ridgeLayout.js';
import { ridgeWarpField, sculptRidge, REACH_IN, REACH_FLOOR } from '../26_LOCAL_AUTHORITY/lab/world/ridgeSculpt.js';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function src(rel) { return fs.readFileSync(path.join(LA, rel), 'utf8'); }
var MACRO = src('lab/world/macro.js'), CITY = src('lab/cityScene.js'), ARCH = src('lab/world/architecture.js'), BODIES = src('lab/world/cloudBodies.js');
var R = JSON.parse(src('lab/assets/world/world_registry_v1.json'));

/* 1. owner OP10: the ridge INNER face is the shared visible/collision surface (VISIBLE_RIDGE_INNER_FACE proxies from ridgeLayout). Its rows
      are linear between the inner base and the crest and are never displaced; the rock displacement may only push OUTER rows into the body. */
var innerLerp = /var siA = \{ x: inA\.x \* 0\.54 \+ crestA\.x \* 0\.46/.test(MACRO) && /var uiA = \{ x: inA\.x \* 0\.24 \+ crestA\.x \* 0\.76/.test(MACRO);
var innerDisplaced = /\b(si|ui)[AB]\s*=\s*dsp\(/.test(MACRO);
var outerInward = (MACRO.match(/\b(so|uo)[AB]\s*=\s*dsp\(\s*(so|uo)[AB]\s*,\s*-(ox|a\.x \/ rA|b2\.x \/ rB)\s*,\s*-(oz|a\.z \/ rA|b2\.z \/ rB)/g) || []).length === 4;   /* M10: each station's own radial (still into the body) */
ok('1. the ridge inner (collision) face rows stay on the proxy plane; only the outer rows are displaced, and only into the body', innerLerp && !innerDisplaced && outerInward, { innerLerp: innerLerp, innerDisplaced: innerDisplaced, outerInward: outerInward });

/* 2. HALO: the rim colonnade stands beyond the host playable radius and under the dome shell; the celestial rings are decorative, high above
      the deck; the deck keeps its single opaque owner. */
var rc = /var RC = HALO_LAYOUT\.playable_radius_m \+ ([0-9.]+)/.exec(CITY), off = rc ? +rc[1] : 0, RC = HALO_LAYOUT.playable_radius_m + off;
var ringsY = /rg\.position\.set\(s\.x, PH \+ ([0-9.]+), s\.z\)/.exec(CITY);
ok('2. HALO colonnade beyond the playable radius and inside the shell; celestial rings ≥ 60 m above the deck; single opaque deck owner kept', off > 0.5 && RC < HALO_LAYOUT.shell_radius_m && ringsY && +ringsY[1] >= 60 && /HALO_DECK_SINGLE_TOP/.test(CITY) && /full_area_opaque_owners: 1/.test(CITY) && /transparent_full_area_overlays: 0/.test(CITY), { playable: HALO_LAYOUT.playable_radius_m, colonnade_r: RC, shell: HALO_LAYOUT.shell_radius_m, rings_above_deck: ringsY && +ringsY[1] });

/* 2b. M10 HALO rim garden + garden light: the plinth / bed / planting start beyond the host's reach (playable radius + body radius) and end
       inside the shell; the garden emitter rings are flush (≤ 5 cm); the beams and pools are additive light (no depth write), not solids. */
var rg = /var RI = HALO_LAYOUT\.playable_radius_m \+ HALO_LAYOUT\.body_radius_m \+ ([0-9.]+), RO = DR - ([0-9.]+)/.exec(CITY), RIm = rg ? HALO_LAYOUT.playable_radius_m + HALO_LAYOUT.body_radius_m + +rg[1] : 0, ROm = rg ? HALO_LAYOUT.shell_radius_m - +rg[2] : 0;
var em = /rings2\.setMatrixAt\(gI, m5\.compose\(v5\.set\(gx, PH \+ ([0-9.]+), gz\)/.exec(CITY), emTop = em ? +em[1] + 0.035 : 1;
var lightOnly = /var bM = new THREE\.MeshBasicMaterial\(\{ map: bt, transparent: true, opacity: DAY \? [0-9.]+ : [0-9.]+, depthWrite: false, blending: THREE\.AdditiveBlending/.test(CITY) && /var pM = new THREE\.MeshBasicMaterial\(\{ map: pt, transparent: true, opacity: DAY \? [0-9.]+ : [0-9.]+, depthWrite: false, blending: THREE\.AdditiveBlending/.test(CITY);
ok('2b. M10 HALO rim garden lies beyond the host reach and inside the shell; garden emitters flush (≤ 5 cm); garden beams / pools are additive light', !!rg && RIm > HALO_LAYOUT.playable_radius_m + HALO_LAYOUT.body_radius_m && ROm < HALO_LAYOUT.shell_radius_m && ROm > RIm && emTop <= 0.05 && lightOnly, { rim: [RIm, ROm], reach: HALO_LAYOUT.playable_radius_m + HALO_LAYOUT.body_radius_m, shell: HALO_LAYOUT.shell_radius_m, emitter_top_m: emTop, light_only: lightOnly });

/* 2c. M11 engineered shell: every girder, ring beam, collar, shoe, mullion, light channel and node plate lies outside the sphere a flying
       player's body can reach (shell radius − margin, plus 0.1 m): the builder clamps every box to SH_MAXIN of depth inside the glass. */
var shIn = /var SH_MAXIN = DR - \(HALO_LAYOUT\.shell_radius_m - HALO_LAYOUT\.shell_margin_m \+ ([0-9.]+)\)/.exec(CITY), clampIn = /if \(i1 > SH_MAXIN\) i1 = SH_MAXIN;/.test(CITY);
var plateIn = /PLATES\.push\(\{ p: P\(az, el, ([0-9.]+)\)/.exec(CITY), plateMax = plateIn ? +plateIn[1] + 0.02 : 9;
var SHR = HALO_LAYOUT.shell_radius_m, reachR = SHR - HALO_LAYOUT.shell_margin_m, depthLimit = shIn ? SHR - (reachR + +shIn[1]) : 0;
ok('2c. M11 HALO shell structure stays outside the flight-reach sphere (every box clamped to the depth limit; node plates within it)', !!shIn && +shIn[1] >= 0.05 && clampIn && depthLimit > 0 && plateMax <= depthLimit, { depth_limit_m: +depthLimit.toFixed(3), reach_sphere_m: reachR, innermost_surface_m: +(SHR - depthLimit).toFixed(3), node_plate_inset_m: plateMax });

/* 3. no low / mid cloud body can rise through the HALO deck (the upper realm floor at the arrival height) */
var deckY = HALO_LAYOUT.arrival_height_m; var bodies = (R.sky.layers || []).filter(function (L) { return L.kind === 'CLOUD' && L.alt_m < deckY; });
ok('3. every cloud layer based below the HALO deck is capped under it (max_top_m) and the cluster builder enforces the cap', bodies.length > 0 && bodies.every(function (L) { return L.max_top_m > L.alt_m && L.max_top_m < deckY; }) && /if \(L\.max_top_m && cl\.y \+ cl\.extent > L\.max_top_m\) cl\.y = L\.max_top_m - cl\.extent;/.test(BODIES), bodies.map(function (L) { return [L.id, L.alt_m, L.max_top_m]; }));

/* 4. class-house dressing: the free-standing suspended pieces clear head height above the house ground (3.4 m) */
var houses = R.architecture.class_houses, terr = {}; ((R.terraces && R.terraces.list) || []).forEach(function (t) { terr[t.id] = t.h; });
var vis = houses.filter(function (H) { return H.supports && H.platform; })[0];
var coreClear = vis ? vis.platform.h - 1.05 - 2 * 1.9 : -1;   /* soffit − gap − the core's full height (octahedron scaled 1.9) */
var collarClear = /col\.translate\(sx, base \+ ([0-9.]+), sz\)/.exec(ARCH);
ok('4. the suspended amethyst core and the support collars clear 3.4 m above the class-house ground; the dressing is one guarded function', !!vis && coreClear >= 3.4 && collarClear && +collarClear[1] >= 3.4 && /function premiumHouse\(H, base, famId, glow\)/.test(ARCH), { house: vis && vis.id, core_lowest_above_ground_m: +coreClear.toFixed(2), collar_y: collarClear && +collarClear[1] });

/* 5. contact AO (PASS 6) is presentation only: flat decals a few cm above the local ground, no collider / walkable output, one draw call;
      the far silhouettes swap their baked night palette live (the in-game time toggle never rebuilds the field) */
var CAO = src('lab/world/contactAO.js'), WB = src('lab/world/worldB.js'), FAR = src('lab/farWorld.js'), FS = src('lab/fieldScene.js');
var lift = /y: groundYAt\(reg, x, z\) \+ ([0-9.]+)/.exec(CAO);
ok('5. contact AO decals sit ≤ 6 cm above the local ground with no collider output and one draw; the far world swaps day/night palettes live', lift && +lift[1] > 0 && +lift[1] <= 0.06 && !/collider|walkable\s*:/i.test(CAO.replace(/\/\*[\s\S]*?\*\//g, '')) && /info\.draw_calls = 1/.test(CAO) && /\['contactAO', createContactAO\]/.test(WB) && /group\.userData\.setNight = function/.test(FAR) && /fw\.userData\.setNight\(NIGHT\)/.test(FS), { lift_m: lift && +lift[1] });

/* 6. presentation integrity: the field owns ONE light rig. Every Directional / Hemisphere light is constructed inside buildLights() (which
      clears the previous rig first); a legacy `if (false) {…} else {…}` block used to stack a second daylight rig after it on every build. */
var b0 = FS.indexOf('function buildLights('), b1 = FS.indexOf('function setNight(', b0), inside = b0 >= 0 && b1 > b0 ? FS.slice(b0, b1) : '', outside = b0 >= 0 && b1 > b0 ? FS.slice(0, b0) + FS.slice(b1) : FS;
var rigIn = (inside.match(/new THREE\.(Directional|Hemisphere)Light\(/g) || []).length, rigOut = (outside.replace(/es\.add\(new THREE\.HemisphereLight\([^)]*\)\)/g, '').match(/new THREE\.(Directional|Hemisphere)Light\(/g) || []).length;   /* the offscreen room-environment PMREM scene (es) keeps its own light */
ok('6. the field builds exactly one light rig: every directional / hemisphere light lives in buildLights() (none outside it)', rigIn >= 4 && rigOut === 0 && /lights\.length = 0/.test(inside), { in_buildLights: rigIn, outside: rigOut });

/* 7. M8C construction language (cityScene premiumDress): every piece that stands proud of the collider face is ≥ 3.4 m above the ground —
      ground-tier piers start on the first-floor cornice (3.6 m), upper-tier piers on a tier ledge ≥ 3.4 m, the eave fascias, the louvred
      service bay and the entrance transom / canopy rods are gated on ≥ 3.4 m; facade fins stand on the straight runs only (never floating
      off the rounded corners). Checked against every authored building. */
var RULES = JSON.parse(src('play/rules1723/rules_17_23.dev.json')), blds = []; (function walk(o) { if (!o || typeof o !== 'object') return; if (o.building && !o.building.dome) blds.push(o); for (var k in o) walk(o[k]); })(RULES);
var minUpper = Math.min.apply(null, blds.map(function (b) { var t = Math.max(1, b.building.tiers || 1); return t > 1 ? b.h / t : 99; })), minDoor = Math.min.apply(null, blds.filter(function (b) { return b.building.entrance; }).map(function (b) { return b.building.entrance.height; }));
var cons = { piers: /pb = t3 \? y3 \+ 0\.08 : 3\.6/.test(CITY), eave: /if \(y3 \+ hEach - 0\.4 >= 3\.4\) chromeParts\.push/.test(CITY), louvre: /ly >= 3\.4 && ly \+ LH < yT \+ hEach - 0\.5/.test(CITY),
  transom: /cY = en\.height \+ 0\.35/.test(CITY) && /ty = cY \+ 0\.42/.test(CITY) && /cY \+ 0\.2, en\.z/.test(CITY) && minDoor + 0.35 + 0.2 >= 3.4, upperTiers: minUpper >= 3.4,
  noUniformFins: !/new THREE\.InstancedMesh\(new THREE\.BoxGeometry\(0\.16, 1, 0\.34\)/.test(CITY), noCorniceRings: !/chromeParts\.push\(rb\(tw \+ 0\.34, 0\.12/.test(CITY), cityUsesRule: /addCivicBuilding\(kit, THREE, s\)/.test(CITY) };
/* M8E facade kit: build exactly what the city builds for every authored civic building and audit every placed piece */
var seenB = {}, civ = []; (function walk(o) { if (!o || typeof o !== 'object') return; if (o.building && o.id && !seenB[o.id]) { seenB[o.id] = 1; civ.push(o); } for (var k in o) walk(o[k]); })(RULES);
var KIT = createFacadeKit(THREE, {}); civ.forEach(function (b) { addCivicBuilding(KIT, THREE, b); }); KIT.build(new THREE.Group()); var KA = KIT.audit(), KI = KIT.info();
cons.kitBelowHead = KA.ok && KA.pieces > 400; cons.kitDraws = KI.draw_calls === 4;
/* the class-house spires take the same kit (architecture.js): slots + a flush door, audited from the house's own terrace floor */
var HK = createFacadeKit(THREE, {}); ((R.architecture && R.architecture.class_houses) || []).forEach(function (H, hi) { var Tz = H.terrace ? ((R.terraces && R.terraces.list) || []).filter(function (t) { return t.id === H.terrace; })[0] : null, base = Tz ? Tz.h : 0;
  (H.spires || []).forEach(function (sp, si) { var x = H.x + sp.dx, z = H.z + sp.dz; if (sp.h >= 14) HK.addSpire({ id: H.id + '_S' + si, x: x, z: z, base: base, h: sp.h, r: sp.r, rTop: sp.r * 0.32, sides: 8, seed: 0x5E1 + hi * 97 + si, door: si === 0 ? Math.atan2(-x, -z) : undefined }); }); });
HK.build(new THREE.Group()); var HA = HK.audit(); cons.houseKit = HA.ok && HA.pieces > 20 && /FK\.addSpire\(\{ id: H\.id \+ '_S' \+ si, x: x, z: z, base: base, h: sp\.h, r: sp\.r, rTop: sp\.r \* 0\.32, sides: 8/.test(src('lab/world/architecture.js'));
ok('7. M8C / M8E construction (piers, eave fascias, louvres, transom, canopy rods, and every facade-kit window, frame, pier, slab edge, service door, storefront and light) stays ≥ 3.4 m above the ground or within 5 cm of the existing wall; the uniform fins and all-around cornice rings are gone', Object.keys(cons).every(function (k) { return cons[k]; }), Object.assign({ buildings: blds.length, civic: civ.length, min_upper_tier_base_m: minUpper, min_door_h_m: minDoor, kit_audit: KA, kit: KI, house_kit_audit: HA, house_kit: HK.info() }, cons));

/* 8. M8D towering cumulus: the camera-relative tower ring is based above the HALO deck height and, from ANY camera position inside the
      field walls (+120 m margin), its nearest possible body stays farther from the HALO centre than the HALO shell — no tower can ever
      reach the upper realm; the layer is a non-occluding bank outside the celestial optics. */
var TWR = (R.sky.layers || []).filter(function (L) { return L.follow; }), FW = R.field && R.field.walls;
var farCam = FW ? Math.max.apply(null, [[FW.x1, FW.z1], [FW.x1, FW.z2], [FW.x2, FW.z1], [FW.x2, FW.z2]].map(function (c) { return Math.hypot(c[0] - HALO_LAYOUT.center.x, c[1] - HALO_LAYOUT.center.z); })) + 120 : Infinity;
var towerSafe = TWR.length > 0 && TWR.every(function (L) { return L.bank && !L.occludes && L.alt_m >= HALO_LAYOUT.arrival_height_m && L.ring_m[0] - L.size_m[1] / 2 - farCam > HALO_LAYOUT.shell_radius_m; });
ok('8. the camera-relative towering-cumulus ring stays above the deck height and always farther from the HALO than its shell, from anywhere in the field', towerSafe, TWR.map(function (L) { return { id: L.id, alt_m: L.alt_m, nearest_to_halo_m: L.ring_m[0] - L.size_m[1] / 2 - farCam, shell_m: HALO_LAYOUT.shell_radius_m }; }));

/* 10. M10 public-space edge logic is flush: the entrance aprons, slot drains and grating bars stand ≤ 2 cm, the canal-bank coping 1.2 cm —
       nothing a player steps over or onto (host rule: ≤ 5 cm proud below 3.4 m). */
var WATER = src('lab/world/water.js'), hs = []; var reSlab = /slab\([^;]*?, ([0-9.]+), THRESH\.(stone|drain|edge)\)/g, mm2; while ((mm2 = reSlab.exec(CITY))) hs.push(+mm2[1]);
var copes = (WATER.match(/coping\.push\(flat\([^;]*?GROUND_Y \+ ([0-9.]+)\)\)/g) || []).map(function (t) { return +/GROUND_Y \+ ([0-9.]+)/.exec(t)[1]; });
ok('10. M10 entrance aprons / slot drains / grating and the canal-bank coping are flush (≤ 5 cm)', hs.length >= 4 && hs.every(function (h) { return h <= 0.05; }) && copes.length >= 2 && copes.every(function (h) { return h <= 0.05; }), { thresholds: hs, coping: copes });

/* 9. M10 ridge sculpt: the silhouette / shelf / gully warp lives beyond the reach square only. Sampled over the real ribbon triangles (all
      level-4 subdivision points) and 150 k random points: nothing whose original position is inside REACH_IN moves, nothing warped lands
      inside REACH_FLOOR, and REACH_FLOOR clears the FIELD reach square; triangles wholly inside REACH_IN come out bit-identical. */
var RB = ridgeReachBounds(R), sc9 = { moved_inside: 0, landed_inside: 0, min_landed: 1e9, identical: true, tris: 0 };
(R.macro.mountains || []).forEach(function (Rg, ri) { var st = ridgeStations(Rg, ri), pos = [], col = [], keep = []; (R.macro.waterfalls || []).forEach(function (W) { if (W.source_id === Rg.id) keep.push({ x: W.source.x, z: W.source.z, r: 28 }); });
  for (var k = 0; k < (Rg.segments || 160); k++) { var F = ridgeFaceSegment(st, k); if (F.a.h < 2 && F.b.h < 2) continue; [[F.innerA, F.crestB, F.crestA], [F.innerA, F.innerB, F.crestB], [F.outerA, F.crestA, F.crestB], [F.outerA, F.crestB, F.outerB]].forEach(function (T) { T.forEach(function (p) { pos.push(p.x, p.y, p.z); col.push(1, 1, 1); }); }); }
  var fld = ridgeWarpField(Rg, st, ri, keep), out = sculptRidge(pos, col, fld, 4), mn = function (x, z) { return Math.max(Math.abs(x), Math.abs(z)); }; sc9.tris += out.tris;
  for (var t = 0; t < pos.length; t += 9) { var ins = [0, 3, 6].every(function (o) { return mn(pos[t + o], pos[t + o + 2]) < REACH_IN; }); if (!ins) continue;
    var hit = false; for (var q = 0; q + 8 < out.pos.length && !hit; q += 9) if (out.pos[q] === pos[t] && out.pos[q + 1] === pos[t + 1] && out.pos[q + 2] === pos[t + 2] && out.pos[q + 3] === pos[t + 3] && out.pos[q + 6] === pos[t + 6]) hit = true; if (!hit) sc9.identical = false; }
  var seed = 7 + ri; function rr() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  for (var i = 0; i < 75000; i++) { var x = (rr() - 0.5) * 1500, z = (rr() - 0.5) * 1500, y = rr() * 260 - 4, w = fld.warp(x, y, z), d = Math.abs(w[0] - x) + Math.abs(w[1] - y) + Math.abs(w[2] - z);
    if (d > 1e-9) { if (mn(x, z) < REACH_IN) sc9.moved_inside++; var m = mn(w[0], w[2]); sc9.min_landed = Math.min(sc9.min_landed, m); if (m < REACH_FLOOR) sc9.landed_inside++; } } });
var sculptWired = /import \{ ridgeWarpField, sculptRidge \} from '\.\/ridgeSculpt\.js'/.test(MACRO) && /sculptRidge\(pos, col, ridgeWarpField\(R, stations, idx, keep\)/.test(MACRO);
ok('9. M10 ridge sculpt stays beyond reach: nothing inside ' + REACH_IN + ' m moves, nothing warped lands inside ' + REACH_FLOOR + ' m (reach square ±' + RB.half + ' m), in-reach triangles are bit-identical', sculptWired && RB.half < REACH_FLOOR && sc9.moved_inside === 0 && sc9.landed_inside === 0 && sc9.identical, sc9);

console.log('RESULT world pivot host safety: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
