/* M19 (owner 2026-09-27): the Veil highland's weakness was "the SPACE BETWEEN THE BUILDINGS", and the Veil Falls is to be a hero landmark whose
   aura is "a restrained spectral field … not a literal rainbow sticker; stronger high up and in the mist, fainter near eye level". This test
   builds the real module headless (HIGH and LOW) and checks what the renders cannot prove on their own:
   the meadow faces UP (it was wound down and back-face culled — the eye fell through to the rock and the sea), every flush part sits on the
   meadow as drawn, the district stays beyond the host's reach, water never runs uphill and the flume pours over the crest, the new ground,
   paving and planting obey the colour law (the lawn reads neither purple nor TITAN blue), the falls' spectrum is off eye level with no full
   ring, and the draw budget / LOW tier hold.  node 16_TESTS/gameplay_world_veil_district.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { createVeilFalls } from '../26_LOCAL_AUTHORITY/lab/world/veilFalls.js';
import { classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function J(p) { return JSON.parse(fs.readFileSync(path.join(LA, p), 'utf8')); } function src(p) { return fs.readFileSync(path.join(LA, p), 'utf8'); }
var REG = J('lab/assets/world/world_registry_v1.json'), HL = REG.macro.highland, VW = REG.macro.waterfalls.filter(function (w) { return w.style === 'VEIL'; })[0], SEA = REG.coast.sea_y, VF = src('lab/world/veilFalls.js');
var warn = console.warn; console.warn = function () { };   /* three's toNonIndexed notices from the older cliff-crystal build */
function build(tier) { var g = new THREE.Group(), A = [], F = [], m = createVeilFalls({ THREE: THREE, registry: REG, group: g, quality: { tier: function () { return tier; } }, auraRequests: A, auraForms: F, log: function () { } }); m.build(); g.updateMatrixWorld(true);
  var by = {}; g.traverse(function (o) { if (o.isMesh || o.isPoints) by[o.name] = o; }); return { g: g, A: A, F: F, info: m.debug(), by: by, m: m }; }
var H = build('HIGH'), L = build('LOW'); console.warn = warn;
var G = H.by.VEIL_HIGHLAND_GROUND, PVM = H.by.VEIL_PAVING, gi = G.geometry.index.array, gpA = G.geometry.attributes.position, top = G.geometry.groups[0];

/* 1. the meadow faces up: every triangle of the meadow top (material group 0) has an upward face normal, so it is drawn from above */
var down = 0, n1 = 0, va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
for (var i = top.start; i < top.start + top.count; i += 3) { va.fromBufferAttribute(gpA, gi[i]); vb.fromBufferAttribute(gpA, gi[i + 1]); vc.fromBufferAttribute(gpA, gi[i + 2]); vb.sub(va); vc.sub(va); var ny = vb.z * vc.x - vb.x * vc.z; n1++; if (!(ny > 0)) down++; }
ok('1. the Veil meadow top is wound UP (' + n1 + ' triangles, ' + down + ' facing down) — it was back-face culled from above since M12', n1 > 10000 && down === 0, { n1: n1, down: down });

/* 2. flush parts sit on the meadow AS DRAWN: rays straight down hit the meadow's own front faces under the paving; walks, beds and aprons ride
      0–12 cm over it (the footbridge and the steps near the lip / the doors are raised on purpose and excluded) */
var rc = new THREE.Raycaster(), dn = new THREE.Vector3(0, -1, 0), P = PVM.geometry.attributes.position, AP = PVM.geometry.attributes.aPav, lip = VW.source, bad2 = [], n2 = 0, miss = 0;
for (i = 0; i < P.count; i += 3) { var x = P.getX(i), y = P.getY(i), z = P.getZ(i); if (AP.getY(i) > 1.5 || Math.hypot(x - lip.x, z - lip.z) < 26) continue;
  rc.set(new THREE.Vector3(x, 400, z), dn); var hit = rc.intersectObject(G, false).filter(function (h) { return h.face && h.face.materialIndex === 0; })[0]; n2++; if (!hit) { miss++; bad2.push(['no meadow', +x.toFixed(1), +z.toFixed(1)]); continue; } var lift = y - hit.point.y; if (lift < -0.005 || lift > 0.12) bad2.push([+x.toFixed(1), +z.toFixed(1), +lift.toFixed(3)]); }
ok('2. paving and beds sit 0–12 cm over the meadow as drawn (' + n2 + ' sampled, ' + miss + ' over no meadow, ' + bad2.length + ' off)', n2 > 300 && miss === 0 && bad2.length <= n2 * 0.01, { bad: bad2.slice(0, 12), miss: miss });

/* 3. host safety: the district (ground, paving, grass, villas, lamps, hedges) lies wholly beyond the host's ±300 m reach; the curtain and the
      front veil stop above 3.4 m; the plunge / outflow foam is a flush decal on the sea; nothing here is a collider */
function minCheb(o) { var p = o.geometry.attributes.position, v = new THREE.Vector3(), m = 1e9, mat = new THREE.Matrix4(), cnt = o.isInstancedMesh ? o.count : 1;
  for (var k = 0; k < cnt; k++) { if (o.isInstancedMesh) o.getMatrixAt(k, mat); for (var j = 0; j < p.count; j += (o.isInstancedMesh ? p.count : 1)) { v.fromBufferAttribute(p, j); if (o.isInstancedMesh) v.applyMatrix4(mat); v.applyMatrix4(o.matrixWorld); m = Math.min(m, Math.max(Math.abs(v.x), Math.abs(v.z))); } } return m; }
var far3 = {}; ['VEIL_HIGHLAND_GROUND', 'VEIL_PAVING', 'VEIL_CRYSTAL_GRASS', 'VEIL_GROVE_CANOPY', 'VEIL_VILLAS', 'VEIL_VILLA_ROOFS', 'VEIL_VILLA_GLASS', 'VEIL_HIGHLAND_LAKE', 'VEIL_SPIRE'].forEach(function (nm) { if (H.by[nm]) far3[nm] = +minCheb(H.by[nm]).toFixed(1); });
var lowY = function (o) { var p = o.geometry.attributes.position, m = 1e9; for (var j = 0; j < p.count; j++) m = Math.min(m, p.getY(j)); return m; }, curtY = lowY(H.by.VEIL_FALLS_CURTAIN), frontY = lowY(H.by.VEIL_FALLS_FRONT), foam = H.by.VEIL_FALLS_FOAM;
ok('3. the district stays beyond the host reach (nearest part ' + Math.min.apply(null, Object.values(far3)) + ' m), the curtain / front veil stop at ' + curtY.toFixed(1) + ' / ' + frontY.toFixed(1) + ' m, the foam rides ' + (foam.position.y - SEA).toFixed(2) + ' m on the sea',
  Object.keys(far3).length >= 9 && Object.values(far3).every(function (d) { return d > 304; }) && curtY >= 3.4 && frontY >= 3.4 && foam.position.y - SEA <= 0.05 && HL.reachable === false && !/VEIL|highland/i.test(src('lab/world/worldLayout.js')), { far3: far3, curtY: curtY, frontY: frontY });

/* 4. water logic: every rill falls from its spring to the basin and never runs uphill; the flume is a wet stone bed (no still mirror plane)
      and its water is the curtain's own flowing sheet, run down the flume and over the crest INTO the fall (the brink rows) */
var R4 = H.info.rills || [], CU = H.by.VEIL_FALLS_CURTAIN.geometry, uvY = CU.attributes.uv, cp = CU.attributes.position, brink = 0, brinkHi = 1e9, minV = 1e9, brinkD = 0;
for (i = 0; i < uvY.count; i++) { var v4 = uvY.getY(i); minV = Math.min(minV, v4); if (v4 < -0.05 && cp.getY(i) >= HL.top_y_m && Math.hypot(cp.getX(i) - lip.x, cp.getZ(i) - lip.z) > 8) { brink++; brinkHi = Math.min(brinkHi, cp.getY(i)); brinkD = Math.max(brinkD, Math.hypot(cp.getX(i) - lip.x, cp.getZ(i) - lip.z)); } }   /* the rows that lie up on the flume (at the side tiers they fold back onto the lip) */
ok('4. water never runs uphill (' + R4.length + ' rill(s): ' + R4.map(function (r) { return r.fall_m + ' m fall'; }).join(', ') + ') and the flume runs over a stone bed and pours over the crest (' + brink + ' flowing brink vertices up the flume, reaching ' + brinkD.toFixed(0) + ' m back from the lip, lowest ' + brinkHi.toFixed(2) + ' m)',
  R4.length >= 1 && R4.every(function (r) { return r.uphill_m === 0 && r.fall_m > 0.2; }) && brink >= 5 && brinkD >= 18 && brinkHi >= HL.top_y_m && minV <= -0.09 && /flumeBed = new THREE\.PlaneGeometry\(LIPW \* 0\.8 \+ 0\.1, 21\.1\)/.test(VF) && !/chG/.test(VF), { R4: R4, brink: brink, brinkHi: brinkHi, minV: minV });

/* 5. colour law on everything M19 adds: paving / bed / stone vertex colours, the lawn, the crystal grass and the hedges — no violation; and the
      lawn itself reads neutral (mean saturation low, not blue-led, not purple-led) */
var seen = {}, viol = [], cc = new THREE.Color();
function chk(hex, where) { if (seen[hex + where]) return; seen[hex + where] = 1; var c = classify(hex); if (c.verdict === 'VIOLATION') viol.push([where, '#' + hex.toString(16), c]); }
var PC = PVM.geometry.attributes.color; for (i = 0; i < PC.count; i += 3) chk(cc.setRGB(PC.getX(i), PC.getY(i), PC.getZ(i), THREE.LinearSRGBColorSpace).getHex(), 'paving');
var GC = G.geometry.attributes.color, sr = 0, sg = 0, sb = 0, nl = 0; for (i = 0; i < top.count; i += 3) { var vi = gi[top.start + i]; cc.setRGB(GC.getX(vi), GC.getY(vi), GC.getZ(vi), THREE.LinearSRGBColorSpace); chk(cc.getHex(), 'lawn'); sr += cc.r; sg += cc.g; sb += cc.b; nl++; }
['VEIL_CRYSTAL_GRASS', 'VEIL_GROVE_CANOPY'].forEach(function (nm) { var o = H.by[nm]; for (var k = 0; k < o.count; k++) { o.getColorAt(k, cc); chk(cc.getHex(), nm); } });
var mean = classify(cc.setRGB(sr / nl, sg / nl, sb / nl).getHex());
ok('5. M19 ground, paving and planting obey the colour law (' + Object.keys(seen).length + ' colours, ' + viol.length + ' violations); the lawn reads neutral (mean ' + JSON.stringify(mean) + ')', viol.length === 0 && mean.verdict === 'NEUTRAL' && mean.s < 0.08, { viol: viol.slice(0, 8), mean: mean });

/* 6. the falls' spectrum: no full prismatic ring (a vivid ring that is not an upper arc); every spectral item stands high (≥ 60 m); near eye
      level the aura is only soft white (spectral ≤ 0.4, intensity ≤ 0.2); the mist carries the spectrum as it rises and fades by the eye */
var A6 = H.A, ring6 = A6.filter(function (a) { return a.ring > 0 && !a.arc && (a.spectral || 0) > 1; }), low6 = A6.filter(function (a) { return a.y < 20 && ((a.spectral || 0) > 0.4 || (a.intensity || 0.5) > 0.2); }), spec6 = A6.filter(function (a) { return (a.spectral || 0) >= 0.9; });
ok('6. the Veil aura is a restrained spectral field: no full ring (' + ring6.length + '), spectral items all high (lowest ' + Math.min.apply(null, spec6.map(function (a) { return Math.round(a.y); })) + ' m), eye level soft white only (' + low6.length + ' over), spectrum in the rising mist',
  ring6.length === 0 && low6.length === 0 && spec6.length >= 3 && spec6.every(function (a) { return a.y >= 60; }) && /smoothstep\(0\.3, 0\.85, vH\)/.test(VF) && /vA \*= smoothstep\(10\.0, 55\.0, -mv\.z\)/.test(VF) && !/spectral: 2\.0/.test(VF), { ring6: ring6, low6: low6 });

/* 7. the circulation exists and is lit: the lane, the quay, both flanks, both rim promenades, both lane links, the belvedere spur, a door path
      and a landing with steps for every home, a garden gate onto the walks; bollards on the walks; no crystal grass on the paving */
var I7 = H.info.m19, names = I7.paths, doors = names.filter(function (n) { return n === 'door'; }).length, onPave = 0, n7 = 0, mat7 = new THREE.Matrix4(), pv = new THREE.Vector3(), GR = H.by.VEIL_CRYSTAL_GRASS;
for (i = 0; i < GR.count; i += 9) { GR.getMatrixAt(i, mat7); pv.setFromMatrixPosition(mat7); rc.set(new THREE.Vector3(pv.x, pv.y + 3, pv.z), dn); n7++; if (rc.intersectObject(PVM, false).some(function (h) { return h.point.y > pv.y - 0.05 && h.face.normal.y > 0.5; })) onPave++; }
ok('7. the district is walkable in the renders: ' + names.length + ' paved routes (' + I7.paths_m + ' m), ' + doors + ' door paths + ' + I7.steps + ' steps, ' + I7.gates + ' gates, ' + I7.bollards + ' bollards, ' + I7.hedges + ' hedge crystals, ' + I7.grass + ' grass blades (' + onPave + ' of ' + n7 + ' sampled on paving)',
  ['lane', 'quay', 'flank-1', 'flank1', 'rim-1', 'rim1', 'link-1', 'link1', 'belvedere'].every(function (n) { return names.indexOf(n) >= 0; }) && doors === H.info.homes && I7.steps === 2 * H.info.homes && I7.gates >= 1 && I7.bollards >= 40 && onPave <= n7 * 0.01 && I7.grass > 1000, { names: names, onPave: onPave });

/* 8. budget: M19 adds exactly three draws on HIGH (VEIL_PAVING, VEIL_CRYSTAL_GRASS, VEIL_FALLS_FRONT) and one on LOW (the paving); LOW keeps the
      coarse meadow and drops the grass and the front veil (M20 adds one draw on every tier: VEIL_FALLS_PLUNGE, the flush plunge line) */
var hi = Object.keys(H.by), lo = Object.keys(L.by), newHi = ['VEIL_PAVING', 'VEIL_CRYSTAL_GRASS', 'VEIL_FALLS_FRONT'];
ok('8. draws: HIGH ' + hi.length + ' (M19: ' + newHi.filter(function (n) { return hi.indexOf(n) >= 0; }).join(', ') + '), LOW ' + lo.length + ' (no grass, no front veil); meadow triangles HIGH ' + (G.geometry.groups[0].count / 3) + ' vs LOW ' + (L.by.VEIL_HIGHLAND_GROUND.geometry.groups[0].count / 3),
  newHi.every(function (n) { return hi.indexOf(n) >= 0; }) && hi.length === 17 && hi.indexOf('VEIL_FALLS_PLUNGE') >= 0 && lo.indexOf('VEIL_FALLS_PLUNGE') >= 0 && lo.indexOf('VEIL_PAVING') >= 0 && lo.indexOf('VEIL_CRYSTAL_GRASS') < 0 && lo.indexOf('VEIL_FALLS_FRONT') < 0 && lo.length < hi.length && L.by.VEIL_HIGHLAND_GROUND.geometry.groups[0].count < G.geometry.groups[0].count, { hi: hi, lo: lo });

[H, L].forEach(function (B) { B.m.dispose(); });
console.log('RESULT world veil district: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
