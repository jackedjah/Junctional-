/* M20 PLAZA FURNITURE (owner priority 10 "remaining ugly areas": "reduce smooth primitive shells", SOFTENED PRECISION): the plaza's four big
   white faceted light pylons (host colliders PILLAR_NW / NE / SW / SE) are re-dressed by lab/cityScene.js as civic light masts. The renders
   show the look; this test holds what they cannot: the adoption still recognises exactly the columns the field builder draws (and nothing
   else), the host law for every vertex of every tier (below 3.4 m within the collider radius + 5 cm), the phone budget (LOW never heavier
   than the columns it replaces), the colour law of the lit element and a contact shadow that follows the mast, not the old column.  node 16_TESTS/gameplay_world_m20_plaza_furniture.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
import { adoptLightColumns, lightMastParts, LIGHT_MAST, adoptRampEdges, rampNosings } from '../26_LOCAL_AUTHORITY/lab/cityScene.js';
import { taperShaft, orb, energyTip } from '../26_LOCAL_AUTHORITY/lab/world/formKit.js';
import { createContactAO } from '../26_LOCAL_AUTHORITY/lab/world/contactAO.js';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function src(rel) { return fs.readFileSync(path.join(LA, rel), 'utf8'); }
var FS = src('lab/fieldScene.js'), CITY = src('lab/cityScene.js'), RULES = JSON.parse(src('play/rules1723/rules_17_23.dev.json'));
var LAYOUT = RULES._runtime_mapping.field_colliders_district_v1.shapes, COLS = LAYOUT.filter(function (s) { return s.type === 'CYLINDER' && !s.building && !s.landmark && !s.pod && !s.world && s.h >= 4.2 && s.r >= 0.4; });

/* 1. the field builder still draws its light column the way the adoption recognises it: a 0.9 m drum r + 0.03 / r + 0.05 centred at
      0.45 m, a transparent lantern lathe, the energy tip at h − 2 cm, every piece at the column's x / z (a change there must fail HERE) */
var sig = { gate: /if \(s\.h >= 4\.2 && s\.r >= 0\.4\) \{ var dh = 0\.9,/.test(FS), drum: /new THREE\.CylinderGeometry\(s\.r \+ 0\.03, s\.r \+ 0\.05, dh, 24\), furnStone\); drum\.position\.set\(s\.x, dh \/ 2, s\.z\)/.test(FS),
  lantern: /new THREE\.LatheGeometry\(bulb, [^;]*\), lanternGlass\); lant\.position\.set\(s\.x, lh0, s\.z\)/.test(FS) && /var lanternGlass = new THREE\.MeshStandardMaterial\(\{[^}]*transparent: true/.test(FS),
  tip: /tip\.position\.set\(s\.x, s\.h - 0\.02, s\.z\)/.test(FS), wired: /try \{ buildLightMasts\(\); \} catch \(e\)/.test(CITY) && /city\.dress\(size\);[\s\S]{0,2500}mergeStatic\(group, 120\)/.test(FS) };
ok('1. the field light column still carries the adoption signature (drum, lantern, tip) and dress() adopts it before the static merge', sig.gate && sig.drum && sig.lantern && sig.tip && sig.wired, sig);

/* 2. adoption on a replica of the field build: exactly the four PILLAR columns are found (r, h from the collider), exactly their pieces go,
      a barrier, a plain bollard cylinder, a named mesh and an instanced mesh standing at a column's x / z all stay */
var g = new THREE.Group(), keep = [], std = new THREE.MeshStandardMaterial(), glass = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.35 });
COLS.forEach(function (s) { var dh = 0.9, lh0 = Math.max(3.6, s.h - 1.45), lh1 = s.h - 0.55; function add(geo, mat, y) { var m = new THREE.Mesh(geo, mat); m.position.set(s.x, y, s.z); g.add(m); return m; }
  add(new THREE.CylinderGeometry(s.r + 0.03, s.r + 0.05, dh, 24), std, dh / 2); add(new THREE.CylinderGeometry(s.r * 0.7, s.r * 0.9, 2, 16), std, dh); add(new THREE.SphereGeometry(s.r), std, dh);
  add(new THREE.LatheGeometry([new THREE.Vector2(s.r, 0), new THREE.Vector2(s.r + 0.09, 0.5)], 24), glass, lh0); add(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 12), std, (lh0 + lh1) / 2);
  add(new THREE.CylinderGeometry(s.r + 0.14, s.r + 0.14, 0.12, 24), std, lh0 - 0.06); add(new THREE.CylinderGeometry(s.r + 0.14, s.r + 0.14, 0.12, 24), std, lh1 + 0.06); add(new THREE.LatheGeometry([new THREE.Vector2(s.r, 0), new THREE.Vector2(0.1, 0.4)], 24), std, lh1 + 0.12); add(new THREE.ConeGeometry(0.2, 0.9), std, s.h - 0.02);
  var named = add(new THREE.BoxGeometry(0.1, 0.1, 0.1), std, 1); named.name = 'KEEP_NAMED'; keep.push(named); var inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), std, 1); inst.position.set(s.x, 0, s.z); g.add(inst); keep.push(inst); });
var bar = new THREE.Mesh(new THREE.BoxGeometry(5, 1.3, 0.8), std); bar.position.set(6.5, 0.65, -6); g.add(bar); keep.push(bar); var boll = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.9, 24), std); boll.position.set(20, 0.45, 20); g.add(boll); keep.push(boll);   /* a drum-like cylinder with no lantern is not a column */
var n0 = g.children.length, got = adoptLightColumns(g), s2 = { found: got.length, want: COLS.length, removed: n0 - g.children.length, kept: keep.every(function (o) { return o.parent === g; }), shapes: got.map(function (c) { return [c.x, c.z, +c.r.toFixed(3), c.h, c.removed]; }) };
ok('2. adoption finds exactly the ' + COLS.length + ' PILLAR columns (r, h from the drum and the tip), removes their 9 pieces each and nothing else ' + JSON.stringify(s2.shapes), COLS.length === 4 && got.length === COLS.length && s2.removed === 9 * COLS.length && s2.kept && got.every(function (c) { return COLS.some(function (s) { return Math.abs(s.x - c.x) < 1e-9 && Math.abs(s.z - c.z) < 1e-9 && Math.abs(s.r - c.r) < 1e-9 && Math.abs(s.h - c.h) < 1e-9 && c.removed === 9; }); }), s2);

/* 3. host law on the real geometry, every tier, every PILLAR: below 3.4 m every vertex within the collider radius + 5 cm, nothing under
      the paving; the luminaire (wider than the mast) starts above 3.4 m; the plinth is the footprint (r + 2 cm) */
var s3 = {}, s4 = {};
['HIGH', 'MED', 'LOW'].forEach(function (T) { var worst = 0, low = 0, top = 0, tris = 0, lumFrom = 99;
  COLS.forEach(function (s) { var P = lightMastParts(THREE, { x: s.x, z: s.z, r: s.r, h: s.h }, T);
    ['stone', 'dark', 'metal', 'lit'].forEach(function (k) { P[k].forEach(function (geo) { var pos = geo.attributes.position; tris += (geo.index ? geo.index.count : pos.count) / 3;
      for (var i = 0; i < pos.count; i++) { var y = pos.getY(i), rr = Math.hypot(pos.getX(i) - s.x, pos.getZ(i) - s.z); low = Math.min(low, y); top = Math.max(top, y); if (y < 3.4) worst = Math.max(worst, rr - s.r); if (rr > 0.2 && y > 1) lumFrom = Math.min(lumFrom, y); } }); }); });
  s3[T] = { proud_below_3_4: +worst.toFixed(4), lowest: +low.toFixed(4), top: +top.toFixed(3), luminaire_from: +lumFrom.toFixed(3) }; s4[T] = Math.round(tris / COLS.length); });
ok('3. every mast vertex below 3.4 m stays within its collider radius + 5 cm, none below the paving, the wide head starts above 3.4 m ' + JSON.stringify(s3), ['HIGH', 'MED', 'LOW'].every(function (T) { return s3[T].proud_below_3_4 <= 0.05 + 1e-9 && s3[T].lowest >= -1e-6 && s3[T].luminaire_from >= 3.4; }) && LIGHT_MAST.plinth_out <= 0.05, s3);

/* 4. phone budget: the four masts are 4 draws on every tier (one merged mesh per material; the columns they replace cost 12 exclusive draws:
      the faceted shaft, the glass bulb and the spike are each a material of their own), and on LOW the four masts (one merged, jointly culled
      draw) weigh no more than two of the LOW columns they replace — rebuilt here with the field builder's own calls (drum, shaft, knee, bulb,
      core, bands, capital, tip) */
function tris(list) { return list.reduce(function (n, geo) { return n + (geo.index ? geo.index.count : geo.attributes.position.count) / 3; }, 0); }
function oldColumn(s, FT1) { var dh = 0.9, lh0 = Math.max(3.6, s.h - 1.45), lh1 = s.h - 0.55, LH = lh1 - lh0, CH1 = s.h - lh1 - 0.12, V = function (q, k) { return new THREE.Vector2(q[0], q[1] * k); };
  var bulb = [[s.r + 0.02, 0], [s.r + 0.07, 0.25], [s.r + 0.09, 0.55], [s.r + 0.05, 0.85], [s.r * 0.8, 1]].map(function (q) { return V(q, LH); }), bell = [[0.0001, 0], [s.r + 0.2, 0], [s.r + 0.16, 0.3], [s.r * 0.95, 0.62], [s.r * 0.6, 0.9], [s.r * 0.35, 1]].map(function (q) { return V(q, CH1); });
  return [new THREE.CylinderGeometry(s.r + 0.03, s.r + 0.05, dh, 24), taperShaft(THREE, s.r * 0.92, s.r * 0.7, lh0 - dh, FT1, { flare: 1, belly: 0.03 }), orb(THREE, s.r * 0.97, FT1), new THREE.LatheGeometry(bulb, FT1 === 'LOW' ? 12 : 24), new THREE.CylinderGeometry(s.r * 0.42, s.r * 0.58, lh1 - lh0 - 0.1, 12),
    new THREE.CylinderGeometry(s.r + 0.14, s.r + 0.14, 0.12, 24), new THREE.CylinderGeometry(s.r + 0.14, s.r + 0.14, 0.12, 24), new THREE.LatheGeometry(bell, FT1 === 'LOW' ? 12 : 24), energyTip(THREE, s.r * 0.36, 0.9, 0xdfe8ff, FT1)]; }
var oldT = {}; ['HIGH', 'MED', 'LOW'].forEach(function (T) { oldT[T] = Math.round(tris(oldColumn(COLS[0], T))); });
var same = /, bulb = \[\[s\.r \+ 0\.02, 0\], \[s\.r \+ 0\.07, 0\.25\], \[s\.r \+ 0\.09, 0\.55\], \[s\.r \+ 0\.05, 0\.85\], \[s\.r \* 0\.8, 1\]\]/.test(FS) && /energyTip\(THREE, s\.r \* 0\.36, 0\.9, 0xdfe8ff, FT1\)/.test(FS) && /orb\(THREE, s\.r \* 0\.97, FT1\)/.test(FS);
var draws = (CITY.match(/\[P\.stone, stoneM, 'CITY_LIGHT_MAST_PLINTHS'\], \[P\.dark, anthM, 'CITY_LIGHT_MAST_SHAFTS'\], \[P\.metal, M\.chrome, 'CITY_PLAZA_FURNITURE_METAL'\], \[P\.lit, litM, 'CITY_LIGHT_MAST_DIFFUSERS'\]/) || []).length && /mm\.userData\.noMerge = true; mm\.receiveShadow = true; if \(T\[1\] === litM\)/.test(CITY);
ok('4. 4 merged draws for all masts; triangles per mast (new / old column) HIGH ' + s4.HIGH + ' / ' + oldT.HIGH + ', MED ' + s4.MED + ' / ' + oldT.MED + ', LOW ' + s4.LOW + ' / ' + oldT.LOW + ' (LOW: the four masts are one jointly culled draw, so 4 LOW masts ≤ 2 LOW columns — never heavier in a view that showed two; MED ≤ 3000, HIGH ≤ 4800)', !!draws && same && 4 * s4.LOW <= 2 * oldT.LOW && s4.MED <= 3000 && s4.HIGH <= 4800, { mast: s4, column: oldT, same: same });

/* 5. colour law + time of day: the diffuser is the one lit element, equal-channel neutral white, dim by day and lit at night live (dayNight
      hook), and each mast's night pool rides in the existing bollard pool draw */
var lit = /var litM = new THREE\.MeshStandardMaterial\(\{ color: 0x([0-9a-f]{6}), emissive: 0x([0-9a-f]{6}), emissiveIntensity: DAY \? ([0-9.]+) : ([0-9.]+),/.exec(CITY), c5 = lit ? [classify('#' + lit[1]).verdict, classify('#' + lit[2]).verdict] : null;
var live = /mm\.userData\.dayNight = function \(n\) \{ litM\.emissiveIntensity = n \? ([0-9.]+) : ([0-9.]+); \}/.exec(CITY), pools = /ENT_POOLS\.push\(L\.pool, \{ x: L\.pool\.x, z: L\.pool\.z, s: [0-9.]+ \}\)/.test(CITY) && /var pools = new THREE\.InstancedMesh\(bG, bM, Math\.max\(1, np \+ ENT_POOLS\.length\)\)/.test(CITY);
ok('5. the diffuser is neutral white (' + JSON.stringify(c5) + '), dim by day / lit at night and live with the time of day, night pools in the bollard pool draw', !!lit && c5[0] === 'NEUTRAL' && c5[1] === 'NEUTRAL' && +lit[3] < 0.5 && +lit[4] >= 1 && !!live && live[1] === lit[4] && live[2] === lit[3] && pools, { lit: lit && lit.slice(1), live: live && live.slice(1), pools: pools });

/* 6. the plaza ramps (V32: a glowing trim bar floated at eye height across the hub): the field builder still lays its bar at the ramp's top
      height over the whole length; the adoption (run on the field builder's own ramp code, below) removes exactly that bar per ramp and the
      nosings that replace it lie ON the walking surface (≤ 5 cm proud, never below it, inside the footprint) with outward-facing triangles */
var barSig = /var edge = new THREE\.Mesh\(new THREE\.BoxGeometry\(risingX \? w2 : 0\.05, 0\.04, risingX \? 0\.05 : d2\), trim\); edge\.position\.set\(\(x1 \+ x2\) \/ 2, hi \+ 0\.03, risingX \? z1 : \(z1 \+ z2\) \/ 2\)/.test(FS) && /var idx = \[0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7\]/.test(FS);
var RAMPS = LAYOUT.filter(function (s) { return s.type === 'RAMP' && !s.world; }), g6 = new THREE.Group(), s6 = { ramps: RAMPS.length, bars: 0, strips: 0, out: 0, above: 0, below: 0, winding: 0, tris: 0 };
RAMPS.forEach(function (s) { var w2 = s.x2 - s.x1, d2 = s.z2 - s.z1, hi = Math.max(s.h0, s.h1), geo = new THREE.BufferGeometry(), risingX = s.axis === 'x', x1 = s.x1, x2 = s.x2, z1 = s.z1, z2 = s.z2, hA = s.h0, hB = s.h1;
  var v = risingX ? [x1, hA, z1, x2, hB, z1, x2, hB, z2, x1, hA, z2, x1, 0, z1, x2, 0, z1, x2, 0, z2, x1, 0, z2] : [x1, hA, z1, x2, hA, z1, x2, hB, z2, x1, hB, z2, x1, 0, z1, x2, 0, z1, x2, 0, z2, x1, 0, z2];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setIndex([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]); geo.computeVertexNormals(); g6.add(new THREE.Mesh(geo, std));
  var edge = new THREE.Mesh(new THREE.BoxGeometry(risingX ? w2 : 0.05, 0.04, risingX ? 0.05 : d2), std); edge.position.set((x1 + x2) / 2, hi + 0.03, risingX ? z1 : (z1 + z2) / 2); g6.add(edge); });
var n6 = g6.children.length, R6 = adoptRampEdges(g6); s6.bars = n6 - g6.children.length;
R6.forEach(function (R, k) { var s = RAMPS[k], hAt = function (x, z) { return s.axis === 'x' ? s.h0 + (s.h1 - s.h0) * (x - s.x1) / (s.x2 - s.x1) : s.h0 + (s.h1 - s.h0) * (z - s.z1) / (s.z2 - s.z1); };
  rampNosings(THREE, R).forEach(function (geo) { s6.strips++; var p = geo.attributes.position, nr = geo.attributes.normal, ix = geo.index.array;
    for (var i = 0; i < p.count; i++) { var x = p.getX(i), z = p.getZ(i), dy = p.getY(i) - hAt(Math.min(s.x2, Math.max(s.x1, x)), Math.min(s.z2, Math.max(s.z1, z))); s6.out = Math.max(s6.out, s.x1 - x, x - s.x2, s.z1 - z, z - s.z2); s6.above = Math.max(s6.above, dy); s6.below = Math.min(s6.below, dy); }
    for (var t = 0; t < ix.length; t += 3) { var A = new THREE.Vector3().fromBufferAttribute(p, ix[t]), B = new THREE.Vector3().fromBufferAttribute(p, ix[t + 1]), Cc = new THREE.Vector3().fromBufferAttribute(p, ix[t + 2]); s6.tris++; if (new THREE.Vector3().crossVectors(B.sub(A), Cc.sub(A)).normalize().dot(new THREE.Vector3().fromBufferAttribute(nr, ix[t])) > 0.5) s6.winding++; } }); });
ok('6. each plaza ramp loses its floating bar and gets nosings on the walking surface ' + JSON.stringify(s6), barSig && RAMPS.length === 2 && R6.length === 2 && s6.bars === 2 && s6.strips === 6 && s6.out <= 1e-6 && s6.above <= 0.05 && s6.below >= -1e-4 && s6.winding === s6.tris && /ramps = adoptRampEdges\(group\)/.test(CITY), s6);

/* 7. the contact decal follows the mast (review of 883984f: contactAO still grounded each PILLAR as the old r 0.6 m x 5 m column, a cast
      about 1.2 m wide trailing 4-5 m from a 0.24 m mast, the shadow of an invisible column). contactAO, replayed on the real registry and
      layout: each column gets a plinth band on its footprint (r + plinth_out) that casts from plinth_h only and, on MED / HIGH, one slim
      mast cast (half-width <= 0.15 m) from the column's full height; nothing at a column is wider than the mast and casts from above the
      plinth; LOW (no casts) keeps one decal per column (never heavier) */
var REG = JSON.parse(src('lab/assets/world/world_registry_v1.json')), s7 = {};
['HIGH', 'MED', 'LOW'].forEach(function (T) { var grp = new THREE.Group(), cao = createContactAO({ THREE: THREE, group: grp, registry: REG, layout: { shapes: LAYOUT.filter(function (s) { return !s.world; }) }, quality: { tier: function () { return T; } } }), mesh = null; cao.build(); grp.traverse(function (o) { if (o.isInstancedMesh) mesh = o; });
  var A = mesh && mesh.geometry.attributes, m4 = new THREE.Matrix4(), v = new THREE.Vector3(), r = { masts: cao.debug().masts, cols: COLS.map(function () { return []; }) };
  if (mesh) for (var i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m4); v.setFromMatrixPosition(m4); COLS.forEach(function (s, k) { if (Math.abs(v.x - s.x) < 1e-6 && Math.abs(v.z - s.z) < 1e-6) r.cols[k].push({ half: +A.aBox.getX(i).toFixed(3), from_h: +A.aCast.getX(i).toFixed(2), cast_k: +A.aCast.getW(i).toFixed(2) }); }); }
  r.ok = r.masts === COLS.length && r.cols.every(function (D, k) { var s = COLS[k], plinth = D.filter(function (d) { return Math.abs(d.half - (s.r + LIGHT_MAST.plinth_out)) < 1e-3; }), slim = D.filter(function (d) { return d.half <= 0.15; });
    return plinth.length === 1 && (T === 'LOW' ? D.length === 1 && plinth[0].cast_k === 0 : D.length === 2 && plinth[0].from_h === LIGHT_MAST.plinth_h && slim.length === 1 && slim[0].from_h === s.h && slim[0].cast_k > 0 && slim[0].cast_k <= 0.5) && D.every(function (d) { return d.half <= 0.15 || d.from_h <= LIGHT_MAST.plinth_h + 1e-6; }); });
  s7[T] = r; });
ok('7. the contact decal at each column is the plinth (r + ' + LIGHT_MAST.plinth_out + ', cast from ' + LIGHT_MAST.plinth_h + ' m) plus one slim mast cast (MED / HIGH), no full-width column cast ' + JSON.stringify(s7.HIGH.cols[0]), s7.HIGH.ok && s7.MED.ok && s7.LOW.ok, s7);

console.log('RESULT world m20 plaza furniture: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
