/* M19 mountains (owner 2026-09-27: "mountains still not real enough … preserve gameplay collision … visual shells / safe non-collision
   geometry where needed"). The pass re-cut the ridge shell (ridgeSculpt strip mode: bedding shelves, spurs and couloirs), gave the rock one
   regional geology (dip / fold / faults shared by shader and geometry), alpine snow, scree, varnish, height-thinned haze, and softened the
   far massifs. This test pins what must never regress: the in-reach ribbon is untouched, the strip subdivision is watertight, the geology
   options are opt-in (the Veil cliffs / coast islands compile the shader they had), the bedding surface is the same in JS and GLSL, and the
   tier budgets (LOW never heavier). M19 review fix: the LOW ridge / far-ring SHADERS are pinned as well (no heavier than M18 in noise-hash
   equivalents, no trig), the snow can no longer paint thin lines (no shelf-lip band, no bump-normal snow), the varnish has no bed-boundary
   term (the brick / window grid), and the fault blocks close round the ring.   node 16_TESTS/gameplay_world_m19_mountains.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { ridgeStations, ridgeFaceSegment } from '../26_LOCAL_AUTHORITY/lab/world/ridgeLayout.js';
import { ridgeWarpField, sculptRidge, ridgeRowPlan, bedY, RIDGE_DIP, REACH_IN, REACH_FLOOR } from '../26_LOCAL_AUTHORITY/lab/world/ridgeSculpt.js';
import { applyGeology } from '../26_LOCAL_AUTHORITY/lab/world/surfaceDetail.js';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function src(rel) { return fs.readFileSync(path.join(LA, rel), 'utf8'); }
var R = JSON.parse(src('lab/assets/world/world_registry_v1.json')), MAC = src('lab/world/macro.js'), FARW = src('lab/farWorld.js');
function mn(x, z) { return Math.max(Math.abs(x), Math.abs(z)); }
globalThis.document = globalThis.document || { createElement: function () { return { width: 0, height: 0, getContext: function () { return { createRadialGradient: function () { return { addColorStop: function () { } }; }, fillRect: function () { }, clearRect: function () { }, fillStyle: '' }; } }; } };

/* 1. strip mode on the authored ribbon (the host-safety test's four triangles per station span, tagged with their row edges): every warp
      call that starts inside REACH_IN returns the point unchanged, nothing moved lands inside REACH_FLOOR, triangles wholly inside REACH_IN come
      out bit-identical, and the subdivided ribbon is watertight (open edges only on the base line, on straight in-reach edges or at the
      south fade ends). */
var s1 = { calls: 0, movedInside: 0, landedInside: 0, identical: true, tris: 0, openBad: 0, open: 0 };
(R.macro.mountains || []).forEach(function (Rg, ri) { var st = ridgeStations(Rg, ri), pos = [], col = [], tags = [], ends = [], N = Rg.segments || 160, plan = ridgeRowPlan(Rg, 'HIGH');
  for (var k = 0; k < N; k++) { var F = ridgeFaceSegment(st, k); if (F.a.h < 2 && F.b.h < 2) continue;
    var Fp = ridgeFaceSegment(st, (k + N - 1) % N), Fn = ridgeFaceSegment(st, (k + 1) % N); if (Fp.a.h < 2 && Fp.b.h < 2) ends.push(Math.atan2(F.a.x, F.a.z)); if (Fn.a.h < 2 && Fn.b.h < 2) ends.push(Math.atan2(F.b.x, F.b.z));
    [[F.innerA, F.crestB, F.crestA], [F.innerA, F.innerB, F.crestB], [F.outerA, F.crestA, F.crestB], [F.outerA, F.crestB, F.outerB]].forEach(function (T) { T.forEach(function (p) { pos.push(p.x, p.y, p.z); col.push(1, 1, 1); }); });
    tags.push([1, plan.inner[0] + plan.inner[1]], [0, plan.inner[0] + plan.inner[1]], [1, plan.outer[0] + plan.outer[1]], [2, plan.outer[0] + plan.outer[1]]); }
  var fld = ridgeWarpField(Rg, st, ri, []), spy = { warp: function (x, y, z) { var w = fld.warp(x, y, z); s1.calls++; var moved = Math.abs(w[0] - x) + Math.abs(w[1] - y) + Math.abs(w[2] - z) > 0; if (moved && mn(x, z) < REACH_IN) s1.movedInside++; if (moved && mn(w[0], w[2]) < REACH_FLOOR) s1.landedInside++; return w; } };
  var out = sculptRidge(pos, col, spy, 4, tags, plan.cols); s1.tris += out.tris;
  var seen = new Set(); for (var q = 0; q < out.pos.length; q += 9) seen.add(out.pos.slice(q, q + 9).join(','));
  for (var t = 0; t < pos.length; t += 9) if ([0, 3, 6].every(function (o) { return mn(pos[t + o], pos[t + o + 2]) < REACH_IN; }) && !seen.has(pos.slice(t, t + 9).join(','))) s1.identical = false;
  var edges = new Map(), key = function (i) { return out.pos[i].toFixed(4) + ',' + out.pos[i + 1].toFixed(4) + ',' + out.pos[i + 2].toFixed(4); };
  for (var e = 0; e < out.pos.length; e += 9) for (var v = 0; v < 3; v++) { var a = key(e + v * 3), b = key(e + ((v + 1) % 3) * 3), kk = a < b ? a + '|' + b : b + '|' + a; edges.set(kk, (edges.get(kk) || 0) + 1); }
  edges.forEach(function (c, kk) { if (c !== 1) return; s1.open++; var P = kk.split('|').map(function (s) { return s.split(',').map(Number); });
    var ok1 = P.every(function (p) { return Math.abs(p[1] + 4) < 1e-3; }) || P.every(function (p) { return mn(p[0], p[2]) < REACH_IN + 1e-3; }) || P.every(function (p) { var b0 = Math.atan2(p[0], p[2]); return ends.some(function (e2) { return Math.abs(Math.atan2(Math.sin(b0 - e2), Math.cos(b0 - e2))) < 2e-5; }); });
    if (!ok1) s1.openBad++; }); });
ok('1. strip-mode sculpt: nothing inside ' + REACH_IN + ' m moves, nothing lands inside ' + REACH_FLOOR + ' m, in-reach triangles bit-identical, watertight (' + s1.tris + ' tris, ' + s1.calls + ' warps)', s1.calls > 10000 && s1.movedInside === 0 && s1.landedInside === 0 && s1.identical && s1.openBad === 0, s1);

/* 2. the REAL build (macro.js in Node, every tier): watertight the same way, and the tier budgets — LOW ridges no heavier than M18 (2 712
      tris), MED within 15 % of M18 (21 456), the far massif ring cheaper on LOW than M18 (24 408) and unchanged on MED / HIGH.
      M20 (owner 2026-09-27, distant world: "fewer crude shapes … the final world can have FEWER elements"): the six world-scale spires (a
      6-sided cone under an octahedron, 20 tris each) are removed — the review read their first replacement (rock horns) as grey stumps — so
      the far ring is the M19 ring minus 120 tris on every tier (HIGH 85 128 → 85 008, MED 44 280 → 44 160, LOW 16 680 → 16 560): pinned
      exactly, the massifs themselves unchanged. */
var { createMacro } = await import('../26_LOCAL_AUTHORITY/lab/world/macro.js'); var { createFarWorld } = await import('../26_LOCAL_AUTHORITY/lab/farWorld.js');
var s2 = {}, watertight = true;
['HIGH', 'MED', 'LOW'].forEach(function (T) { var g = new THREE.Group(); var M = createMacro({ THREE: THREE, group: g, registry: R, quality: { tier: function () { return T; } }, log: function () { } }); M.build(); var ridge = 0;
  g.traverse(function (o) { if (!/^MACRO_RIDGE_/.test(o.name)) return; var p = o.geometry.attributes.position; ridge += p.count / 3; var ri = /MID$/.test(o.name) ? 1 : 0, Rg = R.macro.mountains[ri], st = ridgeStations(Rg, ri), N = Rg.segments, ends = [];
    for (var k = 0; k < N; k++) { var F = ridgeFaceSegment(st, k); if (F.a.h < 2 && F.b.h < 2) continue; var Fp = ridgeFaceSegment(st, (k + N - 1) % N), Fn = ridgeFaceSegment(st, (k + 1) % N); if (Fp.a.h < 2 && Fp.b.h < 2) ends.push(Math.atan2(F.a.x, F.a.z)); if (Fn.a.h < 2 && Fn.b.h < 2) ends.push(Math.atan2(F.b.x, F.b.z)); }
    var edges = new Map(), key = function (i) { return p.getX(i).toFixed(4) + ',' + p.getY(i).toFixed(4) + ',' + p.getZ(i).toFixed(4); };
    for (var t = 0; t < p.count; t += 3) for (var v = 0; v < 3; v++) { var a = key(t + v), b = key(t + (v + 1) % 3), kk = a < b ? a + '|' + b : b + '|' + a; edges.set(kk, (edges.get(kk) || 0) + 1); }
    edges.forEach(function (c, kk) { if (c !== 1) return; var P = kk.split('|').map(function (s) { return s.split(',').map(Number); });
      var fine = P.every(function (q) { return Math.abs(q[1] + 4) < 1e-3; }) || P.every(function (q) { return mn(q[0], q[2]) < REACH_IN + 1e-3; }) || P.every(function (q) { var b0 = Math.atan2(q[0], q[2]); return ends.some(function (e2) { return Math.abs(Math.atan2(Math.sin(b0 - e2), Math.cos(b0 - e2))) < 2e-5; }); });
      if (!fine) watertight = false; }); });
  var fw = createFarWorld(THREE, { tier: T }), far = 0; fw.traverse(function (o) { if (o.name === 'FAR_MASSIFS') far = o.geometry.attributes.position.count / 3; });
  s2[T] = { ridge: ridge, far: far, draws: fw.userData.info.draw_calls, macro_draws: M.debug().draw_calls }; });
ok('2. real ridges watertight on every tier; LOW ridges ' + s2.LOW.ridge + ' ≤ 2712 and far ring ' + s2.LOW.far + ' < 24408; MED ridges ' + s2.MED.ridge + ' ≤ 24674; far ring = the M19 massifs without the six spires on every tier (' + [s2.HIGH.far, s2.MED.far, s2.LOW.far].join(' / ') + '); draw calls unchanged', watertight && s2.LOW.ridge <= 2712 && s2.LOW.far < 24408 && s2.MED.ridge <= 24674 && s2.LOW.far === 16560 && s2.MED.far === 44160 && s2.HIGH.far === 85008 && s2.HIGH.draws === 3 && s2.HIGH.macro_draws === 10 && s2.MED.macro_draws === 10 && s2.LOW.macro_draws === 7, s2);   /* macro draws: 2 ridges + 1 fall × 3 + 1 feed flume + 3 mist (not LOW) + 1 beam set (M20: the NORTH sheet retired — its spring pool stays, uncounted as before; the TITAN fall gained its deck feed) */

/* 3. the geology options are OPT-IN: the Veil mesa cliffs ({ strata: 2.2 }) and the coast islands compile no M19 token; the ridge spec that
      macro.js passes carries every one of them (dip + faults, lithology, couloir streaks, alpine snow, scree, varnish, height-thinned haze, the moonlit-snow uniform the time switch drives). */
function compiled(mat) { var sh = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader, uniforms: {} }; mat.onBeforeCompile(sh, null); return sh.fragmentShader; }
var TOK = ['gSy', 'gLy', 'gCou', 'gTal', 'float aNy', 'float aP', 'gVar', 'fogFactor *= mix', 'uGeoNightSnow'];
var veil = compiled(applyGeology(THREE, new THREE.MeshStandardMaterial(), { strata: 2.2, tier: 'HIGH' })), coast = compiled(applyGeology(THREE, new THREE.MeshStandardMaterial(), { strata: 1.6, ledge: 0.3, macro: 0.14, relief: [3.5, 12], tier: 'HIGH' }));
var ridgeF = compiled(applyGeology(THREE, new THREE.MeshStandardMaterial(), { snowY: 90, strata: 2.6, tier: 'HIGH', relief: [8, 24], reliefPolar: [0, 0, 360], polarUV: true, relief3: [18, 80], cavity: 0.3, varnish: 0.7, talus: [-3, 9], dip: RIDGE_DIP, alpine: 1, aerial: [14, 190, 0.42], nightSnow: { value: 0 } }));
var leak = TOK.filter(function (t) { return veil.indexOf(t) >= 0 || coast.indexOf(t) >= 0; }), missing = TOK.filter(function (t) { return ridgeF.indexOf(t) < 0; });
var wired = /dip: RIDGE_DIP, alpine: 1, aerial: \[[^\]]*\], nightSnow: mat\.userData\.nightSnow = /.test(MAC) && /userData\.nightSnow\.value = n \? NIGHT_SNOW : 0/.test(MAC) && /import \{ RIDGE_DIP, ridgeRowPlan \} from '\.\/ridgeSculpt\.js'/.test(MAC) && /sculptRidge\(pos, col, ridgeWarpField\(R, stations, idx, keep\), [^;]*, tags, RP\.cols\)/.test(MAC) && /applyGeology\(THREE, farMat, \{ lit: false[^}]*dip: o\.tier === 'LOW' \? null : RIDGE_DIP, soft: o\.tier === 'LOW' \? 0 : /.test(FARW) && /relief3: tier\(\) === 'HIGH' \? \[/.test(MAC);
ok('3. M19 geology options are opt-in (no token in the Veil / coast shaders) and fully wired on the ridges and the far ring', !leak.length && !missing.length && wired, { leak: leak, missing: missing, wired: wired });

/* 4. ONE bedding surface: the shader's gSy (dip + fold + fault blocks) and ridgeSculpt.bedY are the same function — a JS transcription of
      the compiled GLSL (its own 4-decimal constants, GLSL mod) agrees with bedY to 2 cm over the ring, and the fault blocks CLOSE: a whole
      number per ring, so the beds meet across the ±π bearing (the first cut left a hard ~16 m step due south). */
var f4 = function (v) { return (Math.round(v * 10000) / 10000).toFixed(4); }, D4 = RIDGE_DIP, TAU4 = Math.PI * 2;
function gmod(a, b) { return a - b * Math.floor(a / b); }
function glslBed(x, y, z) { var s = y + x * +f4(D4[0]) + z * +f4(D4[1]) + +f4(D4[2]) * Math.sin(x * 0.0093 + z * 0.0061) * Math.cos(z * 0.0071 - x * 0.0023), fu = Math.atan2(x, z) * +f4(D4[3] / TAU4) + +f4(D4[3] / 2), fi = Math.floor(fu), t = Math.max(0, Math.min(1, (fu - fi) / +f4(D4[5]))); t = t * t * (3 - 2 * t); return s + (Math.sin(gmod(fi - 1, +f4(D4[3])) * 2.399 + 0.7) * (1 - t) + Math.sin(gmod(fi, +f4(D4[3])) * 2.399 + 0.7) * t) * +f4(D4[4]); }
var maxD = 0; for (var i4 = 0; i4 < 4000; i4++) { var a4 = i4 / 4000 * Math.PI * 2, r4 = 300 + (i4 % 7) * 40, x4 = Math.sin(a4) * r4, z4 = Math.cos(a4) * r4, y4 = (i4 % 13) * 17; maxD = Math.max(maxD, Math.abs(bedY(x4, y4, z4) - glslBed(x4, y4, z4))); }
var consts = ridgeF.indexOf('vSdW.x * ' + f4(D4[0]) + ' + vSdW.z * ' + f4(D4[1])) >= 0 && ridgeF.indexOf('atan(vSdW.x, vSdW.z) * ' + f4(D4[3] / TAU4) + ' + ' + f4(D4[3] / 2)) >= 0 && ridgeF.indexOf('mod(gFi - 1.0, ' + f4(D4[3]) + ')') >= 0 && ridgeF.indexOf('smoothstep(0.0, ' + f4(D4[5]) + ', gFu - gFi)) * ' + f4(D4[4]) + '; }') >= 0;
var wrapD = 0; [360, 520, 700].forEach(function (r) { for (var yy = 0; yy < 200; yy += 25) { var e = 1e-7; wrapD = Math.max(wrapD, Math.abs(bedY(Math.sin(Math.PI - e) * r, yy, Math.cos(Math.PI - e) * r) - bedY(Math.sin(-Math.PI + e) * r, yy, Math.cos(-Math.PI + e) * r))); } });
var whole = Number.isInteger(D4[3]) && D4[5] > 0.1;   /* whole blocks, and a throw ramp the ridge mesh can carry (the 5 m step sheared the shelves into blades) */
ok('4. one bedding surface: shader constants match RIDGE_DIP, bedY equals the GLSL transcription (max Δ ' + maxD.toExponential(2) + ' m), faults close round the ring (Δ at ±π ' + wrapD.toExponential(2) + ' m)', consts && maxD < 0.02 && wrapD < 1e-3 && whole, { consts: consts, maxD: maxD, wrapD: wrapD, whole: whole });

/* 5. TIER LAW for the shaders (brief rule 4: LOW never heavier). The ridge shader macro.js compiles on LOW costs no more noise-hash
      equivalents than M18's LOW ridge (76: two relief fbm, the warp, macro tone and snow line) and carries no trig at all (no fault atan /
      sin, no polar relief); the far-ring LOW shader is the M18 one exactly (no M19 token); MED no heavier than HIGH. */
function frag(spec, std) { var m = std ? new THREE.MeshStandardMaterial() : new THREE.MeshBasicMaterial(); applyGeology(THREE, m, spec); var fs = compiled(m); return fs.slice(fs.indexOf('void main')); }
function cost(fs) { function n(k) { return fs.split(k).length - 1; } return { hashEq: n('sdHash(') + 4 * n('geoN(') + 12 * n('geoFbm(') + 18 * n('geoVor('), trig: n('atan(') + n('sin(') + n('cos(') }; }
function ridgeSpec(T, H, RD) { var lo = T === 'LOW'; return { snowY: H * 0.6, strata: 2.6, tier: T, relief: lo ? null : [8, 24], reliefPolar: [0, 0, RD], polarUV: !lo, relief3: T === 'HIGH' ? [18, 80] : null, cavity: lo ? 0 : 0.3, varnish: lo ? 0 : 0.7, talus: lo ? null : [-3, 9], dip: RIDGE_DIP, alpine: 1, aerial: [14, 190, 0.42], nightSnow: { value: 0 } }; }
var macroLine = (MAC.match(/applyGeology\(THREE, mat, \{ snowY[^;]*\}\);/) || [''])[0], specSame = macroLine.indexOf("relief: geoLow ? null : [8, 24]") >= 0 && macroLine.indexOf("polarUV: !geoLow, relief3: tier() === 'HIGH' ? [18, 80] : null, cavity: geoLow ? 0 : 0.3, varnish: geoLow ? 0 : 0.7, talus: geoLow ? null : [-3, 9], dip: RIDGE_DIP, alpine: 1") >= 0;
var c5 = {}; ['LOW', 'MED', 'HIGH'].forEach(function (T) { c5[T] = cost(frag(ridgeSpec(T, 150, 360), true)); });
var farBase = { lit: false, strata: 19, joint: 26, ledge: 0.14, fracture: 0.25, cleft: 0.9, macro: 0.16, grain: 0, bump: 0, lod: [500, 2500] };
var farLow = frag(Object.assign({}, farBase, { tier: 'LOW', dip: null, soft: 0 }), false), farLowClean = ['gSy', 'gLy', 'gFu', 'soft'].every(function (t) { return farLow.indexOf(t) < 0; }) && farLow === frag(Object.assign({}, farBase, { tier: 'LOW' }), false);
ok('5. tier law: LOW ridge shader ' + c5.LOW.hashEq + ' ≤ 76 noise-hash eq. with ' + c5.LOW.trig + ' trig calls (MED ' + c5.MED.hashEq + ', HIGH ' + c5.HIGH.hashEq + '); far-ring LOW shader = M18', specSame && c5.LOW.hashEq <= 76 && c5.LOW.trig === 0 && c5.MED.hashEq <= c5.HIGH.hashEq && farLowClean, { specSame: specSame, cost: c5, farLowClean: farLowClean });

/* 6. no painted lines: the alpine snow reads the SMOOTH shell normal (vNormal → world) with crisp anti-aliased patch edges — no shelf-lip
      band (the 1.4 m white line), no relief-bumped normal (the claw-like slivers on near-vertical faces), no low ledge band; the varnish
      streaks carry no major-bed index or bed-restarting envelope (the brick / window grid); the relief3 couloirs are value only (no bruises);
      the moonlit snow is an equal-channel grey. */
var snowLine = ridgeF.slice(ridgeF.indexOf('float gAlt'), ridgeF.indexOf('diffuseColor.rgb *= mix(gTone'));
var varLine = (ridgeF.match(/float gVar = [^\n]*/) || [''])[0], coulLine = (ridgeF.match(/float gCou = [^\n]*/) || [''])[0];
var s6 = { smooth: snowLine.indexOf('max(normalize(vNormal * mat3(viewMatrix)).y, 0.0)') >= 0,   /* M20 round-2 review: the smooth normal's slope, SIGNED (the unsigned one laid snow on down-facing crag undersides) */ noBump: snowLine.indexOf('geoBump') < 0, noShelf: snowLine.indexOf('gTop') < 0 && snowLine.indexOf('aShelf') < 0 && snowLine.indexOf('aLo') < 0, aa: snowLine.indexOf('fwidth(aE)') >= 0 && snowLine.indexOf('fwidth(aM)') >= 0,
  varnish: !!varLine && varLine.indexOf('gBM') < 0 && varLine.indexOf('gFM') < 0 && varLine.indexOf('gDist') >= 0, couloirValueOnly: !!coulLine && ridgeF.indexOf('gRelief += gRel3') < 0, moon: ridgeF.indexOf('totalEmissiveRadiance += vec3(0.68) * gSnow') >= 0 };
ok('6. no painted lines: smooth-normal, anti-aliased snow patches without shelf band / bumped normal; varnish without bed-boundary terms; couloirs value only; equal-channel moonlit snow', Object.keys(s6).every(function (k) { return s6[k]; }), s6);

/* 7. (M19 review, coverage gap) the REAL build on every tier keeps the in-reach COLLISION face bit-identical: every inner-face triangle of the
      authored ribbon (macro.js's six per station span: base → shelf row → upper row → crest) that lies wholly inside REACH_IN is present in
      the ridge mesh with exactly its authored float32 corners — the strip / crest / fault warps never touch the face the host collides with. */
var s7 = { checked: 0, missing: 0, tiers: {} };
['HIGH', 'MED', 'LOW'].forEach(function (T) { var g = new THREE.Group(); var M = createMacro({ THREE: THREE, group: g, registry: R, quality: { tier: function () { return T; } }, log: function () { } }); M.build(); var have = new Set(), fr = Math.fround;
  g.traverse(function (o) { if (!/^MACRO_RIDGE_/.test(o.name)) return; var p = o.geometry.attributes.position.array; for (var q = 0; q < p.length; q += 9) have.add(Array.prototype.slice.call(p, q, q + 9).join(',')); });
  var chk = 0, miss = 0; (R.macro.mountains || []).forEach(function (Rg, ri) { var st = ridgeStations(Rg, ri);
    for (var k = 0; k < (Rg.segments || 160); k++) { var F = ridgeFaceSegment(st, k); if (F.a.h < 2 && F.b.h < 2) continue; var inA = F.innerA, inB = F.innerB, cA = F.crestA, cB = F.crestB;
      var siA = { x: inA.x * 0.54 + cA.x * 0.46, y: inA.y * 0.54 + cA.y * 0.46, z: inA.z * 0.54 + cA.z * 0.46 }, siB = { x: inB.x * 0.54 + cB.x * 0.46, y: inB.y * 0.54 + cB.y * 0.46, z: inB.z * 0.54 + cB.z * 0.46 };
      var uiA = { x: inA.x * 0.24 + cA.x * 0.76, y: inA.y * 0.24 + cA.y * 0.76, z: inA.z * 0.24 + cA.z * 0.76 }, uiB = { x: inB.x * 0.24 + cB.x * 0.76, y: inB.y * 0.24 + cB.y * 0.76, z: inB.z * 0.24 + cB.z * 0.76 };
      [[inA, siB, siA], [inA, inB, siB], [siA, uiB, uiA], [siA, siB, uiB], [uiA, cB, cA], [uiA, uiB, cB]].forEach(function (Tr) { if (!Tr.every(function (v) { return mn(v.x, v.z) < REACH_IN; })) return; chk++;
        var key = function (L) { return L.map(function (v) { return [fr(v.x), fr(v.y), fr(v.z)].join(','); }).join(','); }; if (!have.has(key(Tr)) && !have.has(key([Tr[0], Tr[2], Tr[1]]))) miss++; }); } });   /* the authored corners, exactly — in the authored order or re-wound (M19: macro.js re-winds the inside-out ribbon; positions untouched) */
  s7.tiers[T] = { checked: chk, missing: miss }; s7.checked += chk; s7.missing += miss; });
ok('7. real build, every tier: the in-reach inner (collision) face is bit-identical — ' + s7.checked + ' authored triangles checked, ' + s7.missing + ' missing', s7.checked > 30 && s7.missing === 0, s7);

/* 8. (M19 lead) the ribbon faces OUT of the rock: it was wound inside-out since M6 (98 % of triangles faced down), so from inside the ring the
      collision face was back-face culled and the eye saw the outer face from behind, lit from below. On every tier ≥ 95 % of the ridge
      triangles now face up, and the lit normal agrees with the winding on every triangle. */
var s8 = {};
['HIGH', 'MED', 'LOW'].forEach(function (T) { var g = new THREE.Group(); var M = createMacro({ THREE: THREE, group: g, registry: R, quality: { tier: function () { return T; } }, log: function () { } }); M.build(); var up = 0, n = 0, dis = 0;
  g.traverse(function (o) { if (!/^MACRO_RIDGE_/.test(o.name)) return; var p = o.geometry.attributes.position.array, N = o.geometry.attributes.normal.array;
    for (var q = 0; q < p.length; q += 9) { var ax = p[q + 3] - p[q], ay = p[q + 4] - p[q + 1], az = p[q + 5] - p[q + 2], bx = p[q + 6] - p[q], by = p[q + 7] - p[q + 1], bz = p[q + 8] - p[q + 2], nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; n++; if (ny > 0) up++; if (nx * N[q] + ny * N[q + 1] + nz * N[q + 2] <= 0) dis++; } });
  s8[T] = { tris: n, up: +(up / Math.max(1, n)).toFixed(3), normal_disagree: dis }; });
ok('8. the ridge ribbon faces out of the rock on every tier (share facing up: ' + ['HIGH', 'MED', 'LOW'].map(function (T) { return T + ' ' + s8[T].up; }).join(', ') + '; lit normal against winding: ' + ['HIGH', 'MED', 'LOW'].map(function (T) { return s8[T].normal_disagree; }).join(' / ') + ')', ['HIGH', 'MED', 'LOW'].every(function (T) { return s8[T].tris > 1000 && s8[T].up >= 0.95 && s8[T].normal_disagree === 0; }), s8);

/* 9. M20 review fix — HOST SAFETY (hard rule 4) on the reachable islets: they share the island tree mesh (ISLAND_TREES), whose first M20 canopy
      clump hung a side mass to local y 1.05 (a 3.12 m canopy on ISLET_LUMEN). The REAL coast build on every tier: every canopy vertex of every
      tree on a reachable islet clears 3.4 m + 1 m margin over the island ground under it (raycast down onto ISLAND_LAND / ISLAND_SHORES). */
var { createCoast } = await import('../26_LOCAL_AUTHORITY/lab/world/coast.js'); var s9 = {}, isl9 = (R.coast.islands || []).filter(function (I) { return I.reachable; });
['HIGH', 'MED', 'LOW'].forEach(function (T) { var g = new THREE.Group(), C = createCoast({ THREE: THREE, group: g, scene: g, registry: R, quality: { tier: function () { return T; } }, log: function () { } }); C.build(); g.updateMatrixWorld(true);
  var trees = g.getObjectByName('ISLAND_TREES'), ground = ['ISLAND_LAND', 'ISLAND_SHORES'].map(function (n) { return g.getObjectByName(n); }), P = trees.geometry.attributes.position, m4 = new THREE.Matrix4(), v = new THREE.Vector3(), rc = new THREE.Raycaster(), dn = new THREE.Vector3(0, -1, 0), n = 0, minC = 1e9;
  for (var i = 0; i < trees.count; i++) { trees.getMatrixAt(i, m4); var px = m4.elements[12], pz = m4.elements[14]; if (!isl9.some(function (I) { return Math.hypot((px - I.x) / I.rx, (pz - I.z) / I.rz) < 1.3; })) continue; n++;
    for (var k = 0; k < P.count; k++) { v.fromBufferAttribute(P, k); if (v.y < 1.2) continue; v.applyMatrix4(m4); rc.set(new THREE.Vector3(v.x, 300, v.z), dn); var h = rc.intersectObjects(ground, false); minC = Math.min(minC, v.y - (h.length ? h[0].point.y : -0.3)); } }   /* local y < 1.2: the trunk (inside the canopy's footprint, as in M9) */
  s9[T] = { islet_trees: n, min_canopy_clearance_m: +minC.toFixed(2), land: g.getObjectByName('ISLAND_LAND').material }; });
ok('9. reachable-islet trees clear 3.4 m + 1 m on every tier (' + ['HIGH', 'MED', 'LOW'].map(function (T) { return T + ' ' + s9[T].islet_trees + ' trees, min ' + s9[T].min_canopy_clearance_m + ' m'; }).join('; ') + ')', ['HIGH', 'MED', 'LOW'].every(function (T) { return s9[T].islet_trees >= isl9.length && s9[T].min_canopy_clearance_m >= 4.4; }), ['HIGH', 'MED', 'LOW'].map(function (T) { return [T, s9[T].islet_trees, s9[T].min_canopy_clearance_m]; }));

/* 11. M20 lead fix — HOST SAFETY (hard rule 4, wave-2 re-review): the rock-island profile / groves / clusters only on islands whose ellipse lies
      wholly OUTSIDE the ±300 m reach square (a flight landing inside the square stands on the host's y 0): ISLE_SW, whose corner crosses into the
      square, keeps its M9 heights — on every tier the island land inside the square stays under 3.6 m (the M9 mound's own 3.5 m) and its
      village does not rise (houses under 10 m, as at dcaed60). */
var { ridgeReachBounds } = await import('../26_LOCAL_AUTHORITY/lab/world/ridgeLayout.js'); var RB11 = ridgeReachBounds(R), s11 = {};
var cross11 = (R.coast.islands || []).filter(function (I) { return !I.reachable && !(I.x - I.rx > RB11.x2 || I.x + I.rx < RB11.x1 || I.z - I.rz > RB11.z2 || I.z + I.rz < RB11.z1); });
['HIGH', 'MED', 'LOW'].forEach(function (T) { var g = new THREE.Group(), C = createCoast({ THREE: THREE, group: g, scene: g, registry: R, quality: { tier: function () { return T; } }, log: function () { } }); C.build(); g.updateMatrixWorld(true);
  var land = g.getObjectByName('ISLAND_LAND'), towns = g.getObjectByName('ISLAND_TOWNS'), rc = new THREE.Raycaster(), dn = new THREE.Vector3(0, -1, 0), maxL = -1e9, maxT = -1e9, n = 0, D = C.debug();
  cross11.forEach(function (I) { for (var x = Math.max(I.x - I.rx, RB11.x1); x <= Math.min(I.x + I.rx, RB11.x2); x += 2) for (var z = Math.max(I.z - I.rz, RB11.z1); z <= Math.min(I.z + I.rz, RB11.z2); z += 2) {
    rc.set(new THREE.Vector3(x, 400, z), dn); var h = rc.intersectObject(land, false)[0]; if (h) { n++; maxL = Math.max(maxL, h.point.y); } if (towns) { var t = rc.intersectObject(towns, false)[0]; if (t) maxT = Math.max(maxT, t.point.y); } } });
  s11[T] = { m20: cross11.map(function (I) { return I.id + ':' + D.m20_islands[I.id]; }), samples: n, max_land_m: +maxL.toFixed(2), max_town_m: +maxT.toFixed(2) }; });
ok('11. islands crossing the reach square keep the M9 profile (' + cross11.map(function (I) { return I.id; }).join(', ') + '): max land inside the square ' + ['HIGH', 'MED', 'LOW'].map(function (T) { return T + ' ' + s11[T].max_land_m + ' m'; }).join(' / ') + ', village ' + s11.HIGH.max_town_m + ' m',
  cross11.length >= 1 && ['HIGH', 'MED', 'LOW'].every(function (T) { return s11[T].m20.every(function (e) { return /:false$/.test(e); }) && s11[T].samples > 50 && s11[T].max_land_m <= 3.6 && s11[T].max_town_m < 10; }), s11);

/* 10. M20 review fix — continuous rock coordinates and the tier law with the REAL M20 specs: the islands (HIGH / MED) map their rock on the
      ground plane (the along-face axis switched x ↔ z per triangle on their gentle crowns: a quilt of light / dark triangles), the far ring
      (MED / HIGH) on the ring bearing, the facet tilt rides Frisvad's frame (no cross(up, n), which flipped on level rock); LOW compiles no
      M20 token on the ridges, the far ring or the islands; the real NEAR-ridge shader costs MED ≤ HIGH (noise-hash equivalents, a facet
      lookup = 23), and the spray-wet zone is on the NEAR ridge only, never on LOW. */
function cost10(fs) { function n(k) { return fs.split(k).length - 1; } return n('sdHash(') + 4 * n('geoN(') + 12 * n('geoFbm(') + 18 * n('geoVor(') + 23 * n('geoFacet('); }
var s10 = {}, M20T = ['geoFacet', 'gWet', 'gRiv', 'gUV = vSdW.xz', 'gFq'];
['HIGH', 'MED', 'LOW'].forEach(function (T) { var g = new THREE.Group(); var M = createMacro({ THREE: THREE, group: g, registry: R, quality: { tier: function () { return T; } }, log: function () { } }); M.build();
  var near = compiled(g.getObjectByName('MACRO_RIDGE_RIDGE_NEAR').material), mid = compiled(g.getObjectByName('MACRO_RIDGE_RIDGE_MID').material), fw = createFarWorld(THREE, { tier: T }), far = null; fw.traverse(function (o) { if (o.name === 'FAR_MASSIFS') far = compiled(o.material); });
  var isl = compiled(s9[T].land), main = function (fs) { return fs.slice(fs.indexOf('void main')); };
  s10[T] = { nearCost: cost10(main(near)), wetNear: near.indexOf('float gWet') >= 0, wetMid: mid.indexOf('float gWet') >= 0, islandGround: isl.indexOf('gUV = vSdW.xz;') >= 0, farPolar: far.indexOf('gUV = vec2(atan(vSdW.x - 0.0000, vSdW.z - 0.0000) * 740.0000') >= 0, frisvad: near.indexOf('cross(vec3(0.0, 1.0, 0.0), gWn)') < 0 && (T === 'LOW' || near.indexOf('1.0 / max(1.0 + gWn.y, 0.001)') >= 0),
    lowClean: T !== 'LOW' || [near, mid, far, isl].every(function (fs) { return M20T.every(function (t) { return main(fs).indexOf(t) < 0; }); }) }; });
var ok10 = s10.HIGH.islandGround && s10.MED.islandGround && !s10.LOW.islandGround && s10.HIGH.farPolar && s10.MED.farPolar && !s10.LOW.farPolar && s10.HIGH.frisvad && s10.MED.frisvad && s10.LOW.lowClean && s10.MED.nearCost <= s10.HIGH.nearCost && s10.HIGH.wetNear && s10.MED.wetNear && !s10.LOW.wetNear && !s10.HIGH.wetMid;
ok('10. continuous rock coordinates (islands on the ground plane, far ring on the bearing, Frisvad facet frame), LOW free of M20 terms, NEAR ridge MED ' + s10.MED.nearCost + ' ≤ HIGH ' + s10.HIGH.nearCost + ' (LOW ' + s10.LOW.nearCost + ')', ok10, s10);

/* 12. M20 round 2 — the RIDGE CRAGS (lab/world/ridgeCrags.js: a crest cap and nose ribs, non-collision rock that changes the NEAR ridge's outline
       where the collision face may not move) are host-safe on the REAL build: HIGH / MED one mesh on the NEAR ridge's own material (one draw, no
       new program), LOW none (tier law); every vertex inside REACH_IN + 4 (max(|x|, |z|) < 316 m) at least CRAG_MIN_Y up (the module sets 6 m;
       this check holds it ≥ 4.4 m: the walking rule 3.4 m + 1 m — the flight volume above the reach square is check 15); over a pass (within its half-width) nothing under its floor + 3.4 m + 2 m (the routes); nothing over the Veil falls face (the
       curtain's stations ± 3) or inside a keep circle × 2.2 + 30 m (the lead's falls); and the collision face under them stays bit-identical
       (check 7 runs the same build). */
var { createRidgeCrags, CRAG_MIN_Y } = await import('../26_LOCAL_AUTHORITY/lab/world/ridgeCrags.js'); var { ridgeKeep } = await import('../26_LOCAL_AUTHORITY/lab/world/macro.js');
var s12 = {}, RN12 = R.macro.mountains[0], st12 = ridgeStations(RN12, 0), keep12 = ridgeKeep(R.macro, RN12, st12), VW12 = (R.macro.waterfalls || []).filter(function (w) { return w.style === 'VEIL'; })[0], TAU12 = Math.PI * 2;
var vb12 = VW12 && VW12.curtain ? [st12[VW12.curtain.from - 3].b, st12[VW12.curtain.to + 3].b] : null;
['HIGH', 'MED', 'LOW'].forEach(function (T) { var g = new THREE.Group(), ctx = { THREE: THREE, group: g, registry: R, quality: { tier: function () { return T; } }, log: function () { } }; createMacro(ctx).build(); var C = createRidgeCrags(ctx); C.build();
  var m = g.getObjectByName('RIDGE_CRAGS_RIDGE_NEAR'), rd = g.getObjectByName('MACRO_RIDGE_RIDGE_NEAR'), o = { mesh: !!m, sameMat: !!m && m.material === rd.material, draws: C.debug().draw_calls, verts: 0, minYIn: 1e9, inPass: 0, inVeil: 0, inKeep: 0 };
  if (m) { var p = m.geometry.attributes.position; o.verts = p.count; for (var i = 0; i < p.count; i++) { var x = p.getX(i), y = p.getY(i), z = p.getZ(i), b = Math.atan2(x, z);
    if (mn(x, z) < REACH_IN + 4) o.minYIn = Math.min(o.minYIn, y);
    if ((RN12.passes || []).some(function (P) { var d = Math.abs(((b - P.bearing_rad) % TAU12 + TAU12 * 1.5) % TAU12 - Math.PI); return d < P.half_width_rad && y < P.floor_m + 3.4 + 2; })) o.inPass++;
    var bb = (b + TAU12) % TAU12; if (vb12 && bb >= vb12[0] && bb <= vb12[1]) o.inVeil++;
    if (keep12.some(function (K) { return Math.hypot(x - K.x, z - K.z) < K.r * 2.2 + 30; })) o.inKeep++; } }
  s12[T] = o; });
ok('12. ridge crags host-safe: HIGH ' + s12.HIGH.verts + ' / MED ' + s12.MED.verts + ' vertices on the ridge material (1 draw each), LOW none; min height inside the reach square ' + s12.HIGH.minYIn.toFixed(1) + ' / ' + s12.MED.minYIn.toFixed(1) + ' m (≥ ' + CRAG_MIN_Y + '); none low over a pass, over the Veil curtain or in a keep circle',
  CRAG_MIN_Y >= 4.4 && ['HIGH', 'MED'].every(function (T) { var o = s12[T]; return o.mesh && o.sameMat && o.draws === 1 && o.verts > 1000 && o.minYIn >= CRAG_MIN_Y && o.inPass === 0 && o.inVeil === 0 && o.inKeep === 0; }) && !s12.LOW.mesh && s12.LOW.draws === 0 && !!vb12, s12);

/* 13. M20 round 2 — close-range rock (review: rectangular panels with hard straight edges on the V27 / CL1 faces, pasted-on sheen, smooth plaster
       with blurry blotches on CL2 / CL3): the NEAR / MID ridges read the ROCK DETAIL map (uGeoDet, a 256² tileable texture generated on the CPU —
       no asset, no network — mip-mapped, repeating) on HIGH / MED and not on LOW; the hashed grain is gone from their shader; the HIGH-only second
       fracture-plane order (the ≈ 10 × 6 m rectangular panels) is gone; and the MED NEAR-ridge fragment is back at or under the M19 MED ridge
       (check 5's figure: round 1 had raised it ≈ 31 %), with MED still no heavier than HIGH. */
var s13 = {};
['HIGH', 'MED', 'LOW'].forEach(function (T) { var g = new THREE.Group(); createMacro({ THREE: THREE, group: g, registry: R, quality: { tier: function () { return T; } }, log: function () { } }).build();
  var mats = ['MACRO_RIDGE_RIDGE_NEAR', 'MACRO_RIDGE_RIDGE_MID'].map(function (n) { return g.getObjectByName(n).material; }), fsN = null, tex = null;
  s13[T] = mats.map(function (mt) { var sh = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader, uniforms: {} }; mt.onBeforeCompile(sh, null); if (!fsN) fsN = sh.fragmentShader; if (sh.uniforms.uGeoDet) tex = sh.uniforms.uGeoDet.value;
    var main = sh.fragmentShader.slice(sh.fragmentShader.indexOf('void main')); return { det: main.indexOf('texture2D(uGeoDet') >= 0, grain: main.indexOf('geoN(gUV * 1.1)') >= 0, facets: main.split('geoFacet(').length - 1 }; });
  s13[T + '_cost'] = cost10(fsN.slice(fsN.indexOf('void main'))); s13[T + '_tex'] = tex ? { w: tex.image.width, h: tex.image.height, mip: tex.generateMipmaps, rep: tex.wrapS === THREE.RepeatWrapping && tex.wrapT === THREE.RepeatWrapping, data: tex.isDataTexture } : null; });
var ok13 = ['HIGH', 'MED'].every(function (T) { return s13[T].every(function (r) { return r.det && !r.grain; }) && s13[T + '_tex'] && s13[T + '_tex'].w === 256 && s13[T + '_tex'].mip && s13[T + '_tex'].rep && s13[T + '_tex'].data; }) && s13.LOW.every(function (r) { return !r.det; }) && !s13.LOW_tex
  && s13.HIGH.every(function (r) { return r.facets === 1; }) && s13.MED_cost <= c5.MED.hashEq && s13.MED_cost <= s13.HIGH_cost;
ok('13. close-range rock: the detail map on the ridges (HIGH / MED, not LOW), no hashed grain, one fracture-plane order on HIGH (the rectangular panels gone), NEAR ridge MED ' + s13.MED_cost + ' ≤ the M19 MED ridge ' + c5.MED.hashEq + ' (HIGH ' + s13.HIGH_cost + ')', ok13, s13);

/* 14. M20 round 2 — the island trees and relief (review: "in V11 the distant island reads as a flat dark slab with small dark-maroon clumps …
       the reachable-islet canopies (LU) are primitive blobs"): on HIGH / MED the reachable islets keep their own close-range tree mesh
       (ISLAND_TREES: exactly the islet trees, check 9's clearance) and every other island's trees are the light grove mesh (ISLAND_GROVES); LOW keeps
       the M9 single mesh; every crown colour — the instance colour and the tip colour at its brightest channel — sits inside its class family's
       hue window (colour law); and whatever the M20 knolls / outcrops raise stays outside the reach square (island land inside it ≤ 3.6 m, the M9
       mound, away from the reachable islets — walkable ground themselves). */
function hue14(c) { var mx = Math.max(c.r, c.g, c.b), mnn = Math.min(c.r, c.g, c.b), d = mx - mnn; if (d < 1e-6) return null; var h = mx === c.r ? ((c.g - c.b) / d) % 6 : mx === c.g ? (c.b - c.r) / d + 2 : (c.r - c.g) / d + 4; return (h * 60 + 360) % 360; }
var WIN14 = { red: [[345, 360], [0, 12]], gold: [[36, 56]], blue: [[200, 245]], purple: [[246, 292]], pink: [[293, 344]] }, s14 = {};
['HIGH', 'MED', 'LOW'].forEach(function (T) { var g = new THREE.Group(), C = createCoast({ THREE: THREE, group: g, scene: g, registry: R, quality: { tier: function () { return T; } }, log: function () { } }); C.build(); g.updateMatrixWorld(true);
  var near = g.getObjectByName('ISLAND_TREES'), far = g.getObjectByName('ISLAND_GROVES'), m4 = new THREE.Matrix4(), c = new THREE.Color(), o = { near: near ? near.count : 0, far: far ? far.count : 0, isletTrees: 0, offHue: 0, landIn: -1e9 };
  [near, far].forEach(function (M, mi) { if (!M) return; for (var i = 0; i < M.count; i++) { M.getMatrixAt(i, m4); var px = m4.elements[12], pz = m4.elements[14], IS = (R.coast.islands || []).filter(function (I) { return Math.hypot((px - I.x) / I.rx, (pz - I.z) / I.rz) < 1.3; }), I = IS[0];   /* ISLE_NE and ISLE_CROWN overlap: a tree may belong to either */
    if (I && I.reachable && mi === 0) o.isletTrees++; if (!I || !M.instanceColor) continue; M.getColorAt(i, c); var mxc = Math.max(c.r, c.g, c.b), tip = new THREE.Color(c.r / mxc, c.g / mxc, c.b / mxc);
    [c.clone(), tip].forEach(function (cc) { var h = hue14(cc.convertLinearToSRGB());   /* the hue as displayed (the instance colours are linear) */ if (h === null || !IS.some(function (J) { return (WIN14[J.family] || []).some(function (w) { return h >= w[0] && h <= w[1]; }); })) o.offHue++; }); } });
  var lp = g.getObjectByName('ISLAND_LAND').geometry.attributes.position, isl14 = (R.coast.islands || []).filter(function (I) { return I.reachable; });
  for (var v = 0; v < lp.count; v++) { var lx = lp.getX(v), lz = lp.getZ(v); if (mn(lx, lz) < RB11.half && !isl14.some(function (I) { return Math.hypot((lx - I.x) / I.rx, (lz - I.z) / I.rz) < 1.5; })) o.landIn = Math.max(o.landIn, lp.getY(v)); }   /* the reachable islets are walkable ground themselves (their M9 mound) */
  s14[T] = o; });
var nIslet14 = (R.coast.islands || []).filter(function (I) { return I.reachable; }).reduce(function (a, I) { return a + (I.trees || 0); }, 0), nAll14 = (R.coast.islands || []).reduce(function (a, I) { return a + (I.trees || 0); }, 0);
ok('14. island trees: HIGH / MED ' + s14.HIGH.near + ' islet trees (close-range mesh) + ' + s14.HIGH.far + ' grove trees, LOW one M9 mesh (' + s14.LOW.near + '); crowns inside their class hue windows (off: ' + ['HIGH', 'MED', 'LOW'].map(function (T) { return s14[T].offHue; }).join(' / ') + '); island land inside the reach square ≤ ' + Math.max(s14.HIGH.landIn, s14.MED.landIn).toFixed(2) + ' m',
  ['HIGH', 'MED'].every(function (T) { return s14[T].near === nIslet14 && s14[T].isletTrees === nIslet14 && s14[T].far === nAll14 - nIslet14; }) && s14.LOW.near === nAll14 && s14.LOW.far === 0 && ['HIGH', 'MED', 'LOW'].every(function (T) { return s14[T].offHue === 0 && s14[T].landIn <= 3.6; }), s14);

/* 15. M20 round-2 review (BLOCKING: landed players stood inside crest caps, flyers passed through towers) — the crags and the FLIGHT volume.
       The host lets a FUSED player fly to 50 m over the walkable ground (MovementCapabilities travel ceiling; gameplay_runtime pins 50) and land
       on any collider top on the way (PlayMode.flightTick F01: held at solid.h + 0.05, a completed landing — a ridge-face box top is a perch).
       On the REAL HIGH / MED build: (a) every crag triangle, clipped exactly to the host's reach square (ridgeReachBounds ± half + the 0.4 m
       body), lies at or above the local walkable ground (world_v1_colliders walkable boxes / ramps whose footprint + body touches it) + 50 m +
       1.7 m body + 3.4 m; (b) a player perched on a RIDGE_NEAR face-collider top (5 × 5 samples per box, inside the square, perch ≤ ground + 50 m,
       no box directly above — the review's probe) has no crag rock within 3.4 m straight up; (c) every crag shoulder (a section's first / last
       point, the ones laid on the face) lies within 0.3 m of the real ribbon surface (review: rib shoulders up to 8 m off the face, a dark seam
       under the cap) — measured on the strips the build lays (ridgeCragStrips with the build's own ribbonSnap). */
var { ridgeCragStrips, ribbonSnap, CRAG_FLY_Y } = await import('../26_LOCAL_AUTHORITY/lab/world/ridgeCrags.js'); var { ridgeColliders } = await import('../26_LOCAL_AUTHORITY/lab/world/ridgeLayout.js'); var { createColliders } = await import('../26_LOCAL_AUTHORITY/play/rules1723/Colliders.js');
var CJ15 = JSON.parse(src('play/rules1723/world_v1_colliders.json')), COL15 = createColliders(CJ15), FLY15 = 50, BODY15 = 1.7, CLR15 = 3.4, Q15 = RB11.half + 0.4, s15 = { fly_y: CRAG_FLY_Y };
try { var MD15 = JSON.parse(fs.readFileSync(path.join(LA, '..', '..', 'CLAUDE_GAMEPLAY_FOUNDATION', '02_MOVEMENT', 'PLAYER_MOVEMENT_DEFAULTS.json'), 'utf8')); FLY15 = Math.max(FLY15, MD15.flight.fused_travel_max_altitude_m, MD15.flight.split_travel_max_altitude_m.max); s15.ceiling_from = 'defaults'; } catch (e) { s15.ceiling_from = 'gameplay_runtime (50 m)'; }
try { var DT15 = JSON.parse(fs.readFileSync(path.join(LA, '..', '00_CORE', 'dev_tuning.dev.json'), 'utf8')), FC15 = DT15.local_authority.play.rooms.FIELD.flight_ceiling_m; if (FC15 > FLY15) { FLY15 = FC15; s15.ceiling_from = 'FIELD room flight_ceiling_m (PlayMode: max(canon, room) outdoors)'; } } catch (e) { s15.ceiling_from += ' — FIELD room ceiling unreadable'; }   /* lead fix (re-review): the open FIELD room flies to 100 m, not the 50 m canon */
var WALK15 = CJ15.shapes.filter(function (sh) { return sh.walkable || sh.type === 'RAMP'; }).map(function (sh) { return { x1: sh.x1 - 0.4, x2: sh.x2 + 0.4, z1: sh.z1 - 0.4, z2: sh.z2 + 0.4, h: sh.type === 'RAMP' ? Math.max(sh.h0, sh.h1) : sh.h }; });
function ground15(x0, x1, z0, z1) { var gg = 0; WALK15.forEach(function (w) { if (w.x2 >= x0 && w.x1 <= x1 && w.z2 >= z0 && w.z1 <= z1) gg = Math.max(gg, w.h); }); return gg; }
function clip15(poly, q) { [['x', 1], ['x', -1], ['z', 1], ['z', -1]].forEach(function (E) { var o = [], k = E[0], sg = E[1]; for (var i = 0; i < poly.length; i++) { var P = poly[i], Q = poly[(i + 1) % poly.length], dp = sg * P[k] - q, dq = sg * Q[k] - q; if (dp <= 0) o.push(P); if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) { var t = dp / (dp - dq); o.push({ x: P.x + (Q.x - P.x) * t, y: P.y + (Q.y - P.y) * t, z: P.z + (Q.z - P.z) * t }); } } poly = o; }); return poly; }
var near15 = ridgeColliders(R).filter(function (c) { return c.ridge_id === 'RIDGE_NEAR'; }), RN15 = R.macro.mountains[0], st15 = ridgeStations(RN15, 0), keep15 = ridgeKeep(R.macro, RN15, st15), VW15 = (R.macro.waterfalls || []).filter(function (w) { return w.style === 'VEIL' && w.curtain; })[0];
['HIGH', 'MED'].forEach(function (T) { var g = new THREE.Group(), ctx = { THREE: THREE, group: g, registry: R, quality: { tier: function () { return T; } }, log: function () { } }; createMacro(ctx).build(); createRidgeCrags(ctx).build();
  var m = g.getObjectByName('RIDGE_CRAGS_RIDGE_NEAR'), rd = g.getObjectByName('MACRO_RIDGE_RIDGE_NEAR'), o = { tris: 0, inSquare: 0, flyBad: 0, minClear: 1e9, perches: 0, perchBad: 0, minAbove: 1e9, shoulders: 0, offFace: 0, maxOff: 0 }; if (!m) { s15[T] = o; return; }
  var p = m.geometry.attributes.position, HC = new Map(), CS = 8, TRI = [];
  for (var i = 0; i < p.count; i += 3) { var A = { x: p.getX(i), y: p.getY(i), z: p.getZ(i) }, B = { x: p.getX(i + 1), y: p.getY(i + 1), z: p.getZ(i + 1) }, C = { x: p.getX(i + 2), y: p.getY(i + 2), z: p.getZ(i + 2) }; o.tris++; TRI.push([A, B, C]);
    var poly = clip15([A, B, C], Q15); if (poly.length) { o.inSquare++; var x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y0 = 1e9; poly.forEach(function (P) { x0 = Math.min(x0, P.x); x1 = Math.max(x1, P.x); z0 = Math.min(z0, P.z); z1 = Math.max(z1, P.z); y0 = Math.min(y0, P.y); });
      var clr = y0 - (ground15(x0, x1, z0, z1) + FLY15 + BODY15 + CLR15); o.minClear = Math.min(o.minClear, clr); if (clr < 0) o.flyBad++; }
    for (var cx = Math.floor(Math.min(A.x, B.x, C.x) / CS); cx <= Math.floor(Math.max(A.x, B.x, C.x) / CS); cx++) for (var cz = Math.floor(Math.min(A.z, B.z, C.z) / CS); cz <= Math.floor(Math.max(A.z, B.z, C.z) / CS); cz++) { var kk = cx + ',' + cz; if (!HC.has(kk)) HC.set(kk, []); HC.get(kk).push(TRI.length - 1); } }
  function rockAbove(x, z, y) { var L = HC.get(Math.floor(x / CS) + ',' + Math.floor(z / CS)) || [], best = 1e9; L.forEach(function (ti) { var T3 = TRI[ti], A = T3[0], B = T3[1], C = T3[2], d = (B.z - C.z) * (A.x - C.x) + (C.x - B.x) * (A.z - C.z); if (Math.abs(d) < 1e-9) return; var l1 = ((B.z - C.z) * (x - C.x) + (C.x - B.x) * (z - C.z)) / d, l2 = ((C.z - A.z) * (x - C.x) + (A.x - C.x) * (z - C.z)) / d, l3 = 1 - l1 - l2; if (l1 < -1e-7 || l2 < -1e-7 || l3 < -1e-7) return; var yy = l1 * A.y + l2 * B.y + l3 * C.y; if (yy >= y && yy - y < best) best = yy - y; }); return best; }   /* the lowest crag surface straight above (x, y, z) */
  near15.forEach(function (sb) { for (var a = 0; a <= 4; a++) for (var b = 0; b <= 4; b++) { var x = sb.x1 + (sb.x2 - sb.x1) * a / 4, z = sb.z1 + (sb.z2 - sb.z1) * b / 4, alt = sb.h + 0.05; if (mn(x, z) > RB11.half || alt > COL15.groundHeight(x, z) + FLY15 || COL15.solidAt(x, z, alt + 0.02) || !COL15.solidAt(x, z, alt - 0.1)) continue; o.perches++; var up = rockAbove(x, z, alt); o.minAbove = Math.min(o.minAbove, up); if (up < CLR15) o.perchBad++; } });
  var gg = rd.geometry.index ? rd.geometry.toNonIndexed() : rd.geometry, RP = gg.attributes.position, HR = new Map(), tri = new THREE.Triangle(), q = new THREE.Vector3(), cp = new THREE.Vector3();
  for (var t = 0; t < RP.count; t += 3) { var ys = Math.max(RP.getY(t), RP.getY(t + 1), RP.getY(t + 2)); if (ys < 2) continue; var xs = [RP.getX(t), RP.getX(t + 1), RP.getX(t + 2)], zs = [RP.getZ(t), RP.getZ(t + 1), RP.getZ(t + 2)]; for (var ix = Math.floor(Math.min.apply(null, xs) / 12); ix <= Math.floor(Math.max.apply(null, xs) / 12); ix++) for (var iz = Math.floor(Math.min.apply(null, zs) / 12); iz <= Math.floor(Math.max.apply(null, zs) / 12); iz++) { var k2 = ix + ',' + iz; if (!HR.has(k2)) HR.set(k2, []); HR.get(k2).push(t); } }
  function faceDist(P) { var best = 1e9, i0 = Math.floor(P.x / 12), j0 = Math.floor(P.z / 12); q.set(P.x, P.y, P.z); for (var i = i0 - 1; i <= i0 + 1; i++) for (var j = j0 - 1; j <= j0 + 1; j++) (HR.get(i + ',' + j) || []).forEach(function (t) { tri.a.fromBufferAttribute(RP, t); tri.b.fromBufferAttribute(RP, t + 1); tri.c.fromBufferAttribute(RP, t + 2); tri.closestPointToPoint(q, cp); best = Math.min(best, cp.distanceTo(q)); }); return best; }
  ridgeCragStrips(RN15, 0, st15, keep15, T, VW15 ? [VW15.curtain.from, VW15.curtain.to] : null, RB11.half, ribbonSnap(rd.geometry)).forEach(function (S) { S.sections.forEach(function (sec) { [sec[0], sec[sec.length - 1]].forEach(function (P) { var d = faceDist(P); o.shoulders++; o.maxOff = Math.max(o.maxOff, d); if (d > 0.3) o.offFace++; }); }); });
  o.minClear = +o.minClear.toFixed(2); o.minAbove = o.minAbove > 1e8 ? 'none' : +o.minAbove.toFixed(2); o.maxOff = +o.maxOff.toFixed(3); s15[T] = o; });
ok('15. crags clear of the FLIGHT volume: in the reach square every crag triangle ≥ ground + ' + FLY15 + ' m ceiling + 1.7 m body + 3.4 m (HIGH ' + s15.HIGH.inSquare + ' / MED ' + s15.MED.inSquare + ' triangles, min clearance ' + s15.HIGH.minClear + ' / ' + s15.MED.minClear + ' m); ' + s15.HIGH.perches + ' ridge-collider perches, none with rock within 3.4 m above; ' + s15.HIGH.shoulders + ' / ' + s15.MED.shoulders + ' shoulders on the real face (max ' + s15.HIGH.maxOff + ' / ' + s15.MED.maxOff + ' m)',
  CRAG_FLY_Y >= FLY15 + 0.5 + BODY15 + CLR15 - 1e-9 && ['HIGH', 'MED'].every(function (T) { var o = s15[T]; return o.tris > 1000 && o.inSquare > 200 && o.flyBad === 0 && o.minClear >= 0 && o.perches > 10000 && o.perchBad === 0 && o.shoulders > 500 && o.offFace === 0; }), s15);

console.log('RESULT world M19 mountains: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
