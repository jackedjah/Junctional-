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
globalThis.document = globalThis.document || { createElement: function () { return { width: 0, height: 0, getContext: function () { return { createRadialGradient: function () { return { addColorStop: function () { } }; }, fillRect: function () { }, fillStyle: '' }; } }; } };

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
      tris), MED within 15 % of M18 (21 456), the far massif ring cheaper on LOW than M18 (24 408) and unchanged on MED / HIGH. */
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
ok('2. real ridges watertight on every tier; LOW ridges ' + s2.LOW.ridge + ' ≤ 2712 and far ring ' + s2.LOW.far + ' < 24408; MED ridges ' + s2.MED.ridge + ' ≤ 24674; far ring MED / HIGH unchanged; draw calls unchanged', watertight && s2.LOW.ridge <= 2712 && s2.LOW.far < 24408 && s2.MED.ridge <= 24674 && s2.MED.far === 44280 && s2.HIGH.far === 85128 && s2.HIGH.draws === 3 && s2.HIGH.macro_draws === 15 && s2.MED.macro_draws === 15 && s2.LOW.macro_draws === 9, s2);   /* M18 macro draws: 2 ridges + 2 falls × 3 + 6 mist (not LOW) + 1 beam set */

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
var s6 = { smooth: snowLine.indexOf('abs(normalize(vNormal * mat3(viewMatrix)).y)') >= 0, noBump: snowLine.indexOf('geoBump') < 0, noShelf: snowLine.indexOf('gTop') < 0 && snowLine.indexOf('aShelf') < 0 && snowLine.indexOf('aLo') < 0, aa: snowLine.indexOf('fwidth(aE)') >= 0 && snowLine.indexOf('fwidth(aM)') >= 0,
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
        if (!have.has(Tr.map(function (v) { return [fr(v.x), fr(v.y), fr(v.z)].join(','); }).join(','))) miss++; }); } });
  s7.tiers[T] = { checked: chk, missing: miss }; s7.checked += chk; s7.missing += miss; });
ok('7. real build, every tier: the in-reach inner (collision) face is bit-identical — ' + s7.checked + ' authored triangles checked, ' + s7.missing + ' missing', s7.checked > 30 && s7.missing === 0, s7);

console.log('RESULT world M19 mountains: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
