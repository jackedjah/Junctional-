/* M20 (owner 2026-09-27): "water … transparent depth, foam, reflections … make the current one much more convincing". The canals, the sea and
   the Veil basin now shade as WATER (water.js skyWater): a dark dielectric body under the sky it mirrors (Fresnel), calm and wind-roughened
   patches, a jagged dark skyline where the ridges ring a basin, translucent shallows toward every shore on the sea; and the Veil curtain
   falls with free-fall acceleration. This test checks what the renders cannot prove on their own: the patch chains onto the existing water
   hooks (never replaces them), binds the atmosphere dome's own uniforms by reference (night follows), is wired to every water body, costs no
   draw, and — the colour law — the mirrored sky stays BLUE / neutral for every reflected direction by day and by night (the night dome's
   violet haze and the lavender Moon tint once turned the water purple).  node 16_TESTS/gameplay_world_m20_water.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { skyWater } from '../26_LOCAL_AUTHORITY/lab/world/water.js';
import { classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function src(p) { return fs.readFileSync(path.join(LA, p), 'utf8'); }
var WAT = src('lab/world/water.js'), CST = src('lab/world/coast.js'), VF = src('lab/world/veilFalls.js'), ATM = src('lab/world/atmosphere.js');
function fakeShader() { return { uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader }; }

/* 1. it CHAINS: the material's earlier hook still runs first, its cache key is kept as a prefix, and a second call is a no-op */
var m1 = new THREE.MeshStandardMaterial(), ran = [];
m1.onBeforeCompile = function (sh) { ran.push('prev'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n// PREV'); }; m1.customProgramCacheKey = function () { return 'prevkey'; };
skyWater(THREE, m1, null, {}); var obc1 = m1.onBeforeCompile; skyWater(THREE, m1, null, {}); var s1 = fakeShader(); m1.onBeforeCompile(s1, null);
ok('1. skyWater chains onto the existing water hook (earlier patch ran, key "' + m1.customProgramCacheKey() + '"), and is idempotent',
  ran.length === 1 && s1.fragmentShader.indexOf('// PREV') >= 0 && m1.customProgramCacheKey() === 'prevkey|mahworld-skywater' && m1.onBeforeCompile === obc1, { ran: ran, key: m1.customProgramCacheKey() });

/* 2. every splice lands (a missed include would silently leave the old look): varyings, dielectric body, calm / rough normal, the sky mix
      replacing the environment-map specular while the Sun's own glints stay, and the three.js output still written once */
var F = s1.fragmentShader, V = s1.vertexShader;
var parts = { vary: /vSwW = \(modelMatrix \* vec4\(transformed, 1\.0\)\)\.xyz;/.test(V), metal: F.indexOf('metalnessFactor *= 0.08;') >= 0, calm: F.indexOf('swUp') >= 0,
  mix: /outgoingLight = mix\(totalDiffuse \* mix\(uBodyK, 1\.0, swSh \* 0\.8\), swSky \* uReflK, clamp\(swF, 0\.0, 1\.0\)\) \+ reflectedLight\.directSpecular \* uGlintK \+ totalEmissiveRadiance;/.test(F),
  fres: F.indexOf('float swF = 0.02 + 0.98 * pow(1.0 - clamp(dot(normal, swV), 0.0, 1.0), 5.0);') >= 0, out: F.split('#include <opaque_fragment>').length === 2,
  order: F.indexOf('swSky.r = min(swSky.r, swSky.g * 0.85)') > F.indexOf('uLandH > 0.0') && F.indexOf('swSky.r = min(swSky.r, swSky.g * 0.85)') < F.indexOf('outgoingLight = mix(totalDiffuse') };
ok('2. all splices land: world varying, dielectric metalness, calm / rough patches, Fresnel, body + mirrored sky + Sun glints, output kept once, blue guard after the skyline',
  Object.keys(parts).every(function (k) { return parts[k]; }), parts);

/* 3. the mirrored sky IS the atmosphere dome's: its uniforms are bound by reference (setNight mutates them in place, so the water follows) */
var AU = { uZenith: { value: new THREE.Color(1, 0, 0) }, uHorizon: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunTint: { value: new THREE.Color() } };
var m3 = new THREE.MeshStandardMaterial(); skyWater(THREE, m3, { mods: { atmosphere: { uniforms: function () { return AU; } } } }, { land: 0.3 }); var s3 = fakeShader(); m3.onBeforeCompile(s3, null);
var CX = { mods: {} }, m3b = new THREE.MeshStandardMaterial(); skyWater(THREE, m3b, CX, {}); var s3b = fakeShader(); m3b.onBeforeCompile(s3b, null); var early = s3b.uniforms.uSkyH.value.getHexString(); CX.mods.atmosphere = { uniforms: function () { return AU; } }; AU.uHorizon.value.setHex(0x2a2c5e);
ok('3. the mirrored sky resolves to the dome\'s LIVE uniforms at every upload (compiled before the atmosphere exists it falls back, then follows it; setNight mutates in place), live-tunable swU, ridge skyline 0.3',
  s3.uniforms.uSkyZ.value === AU.uZenith.value && s3.uniforms.uSkyH.value === AU.uHorizon.value && s3.uniforms.uSkyHz.value === AU.uHaze.value && s3.uniforms.uSkySun.value === AU.uSun.value && s3.uniforms.uSkyTint.value === AU.uSunTint.value
  && early === 'a4c3e3' && s3b.uniforms.uSkyH.value === AU.uHorizon.value && s3b.uniforms.uSkyH.value.getHexString() === '2a2c5e' && s3.uniforms.uLandH === m3.userData.swU.uLandH && m3.userData.swU.uLandH.value === 0.3 && /uniforms: function \(\) \{ return mat \? mat\.uniforms : null; \}/.test(ATM),
  { early: early, late: s3b.uniforms.uSkyH.value.getHexString() });

/* 4. the sea variant carries the shore field: mainland rounded rectangle + up to six island ellipses, translucent shallows toward them */
var m4 = new THREE.MeshStandardMaterial(); skyWater(THREE, m4, null, { shore: { rect: [-10, -20, 10, 20], r: 4, islands: [[100, 0, 20, 10]] } }); var s4 = fakeShader(); m4.onBeforeCompile(s4, null);
ok('4. sea: shore distance field (rect + 6 island slots), shallows clear toward the waterline, own cache key',
  s4.uniforms.uShI && s4.uniforms.uShI.value.length === 6 && s4.uniforms.uShR.value.z === 10 && s4.fragmentShader.indexOf('swSh = 1.0 - smoothstep(3.0, 55.0, swShore(vSwW.xz));') >= 0 && /\|mahworld-skywater-shore$/.test(m4.customProgramCacheKey()), m4.customProgramCacheKey().slice(-60));

/* 5. wired to every water body, with no new mesh (value / normal / alpha only) */
var sw = WAT.slice(WAT.indexOf('export function skyWater'), WAT.indexOf('export function createWater'));
var wired = { canal: /skyWater\(THREE, waterMat, ctx, \{ land: 0\.34 \}\)/.test(WAT), near: /if \(nearW2\) skyWater\(THREE, nearW2\.material, ctx, \{ land: 0\.34 \}\)/.test(WAT),
  sea: /skyWater\(THREE, seaMat, ctx, \{ shore: \{ rect: \[/.test(CST), basin: /skyWater\(THREE, lakeM, ctx, \{ refl: 0\.9, body: 0\.\d+, land: 0\.3 \}\)/.test(VF), noDraw: !/new THREE\.(Mesh|Points|InstancedMesh|BufferGeometry)/.test(sw) };
ok('5. canals + ripple window (ridge skyline), sea (shore field), Veil basin (skyline) all mirror the sky; the patch adds no draw', Object.keys(wired).every(function (k) { return wired[k]; }), wired);

/* 6. COLOUR LAW: emulate the shader's sky mix for the REAL day and night palettes of atmosphere.js over a sweep of reflected directions
      (horizon → zenith, toward / away from the Sun, the ridge skyline) and classify the result: BLUE or neutral only, never purple / pink */
var REGA = JSON.parse(fs.readFileSync(path.join(LA, 'lab/assets/world/world_registry_v1.json'), 'utf8')).sky.atmosphere || {};   /* the registry palette (sky.atmosphere) overrides the module defaults (atmosphere.js P()) */
function pal(name) { var m = ATM.match(new RegExp('var ' + name + ' = \\{([^}]*)\\}')); var o = {}; m[1].replace(/(\w+): '(#[0-9a-f]{6})'/g, function (_, k, v) { o[k] = v; }); return Object.assign(o, REGA[name.toLowerCase()] || {}); }
var bad = [], n6 = 0;
['DAY', 'NIGHT'].forEach(function (tod) { var P = pal(tod), Z = new THREE.Color(P.zenith), Hh = new THREE.Color(P.horizon), Hz = new THREE.Color(P.haze), T = new THREE.Color(P.sunTint);
  for (var hp = 0; hp <= 1.0001; hp += 0.05) for (var sun = 0; sun <= 1.0001; sun += 0.25) for (var land = 0; land <= 1; land++) {
    var c = Hh.clone().lerp(Z, Math.pow(hp, 0.55)); c.lerp(Hz, Math.exp(-hp * 10) * 0.55); c.add(T.clone().multiplyScalar(Math.pow(sun, 24) * 0.22)); if (land) c = Hh.clone().multiplyScalar(0.42);
    c.r = Math.min(c.r, c.g * 0.85); var hx = c.getHex(), v = classify(hx); n6++; if (v.verdict === 'VIOLATION' || (v.verdict === 'LAW' && v.family !== 'BLUE')) bad.push({ tod: tod, hp: +hp.toFixed(2), sun: sun, land: land, hex: '#' + c.getHexString(), v: v }); } });
ok('6. the mirrored sky stays BLUE or neutral in ' + n6 + ' day / night samples (night haze ' + pal('NIGHT').haze + ', Moon tint ' + pal('NIGHT').sunTint + ' would read purple unguarded)', n6 > 400 && bad.length === 0, bad.slice(0, 6));

/* 7. the Veil curtain falls: its streak field runs in √y (v ∝ √drop), so features at the lip are ~2.5× shorter than at the base */
var acc = /float ya = sqrt\(max\(y, 0\.0\) \+ 0\.015\) \* 2\.0;/.test(VF) && /vfN\(vec2\(xs \* 20\.0, ya \* 3\.1 - t \* 1\.7\)\)/.test(VF) && /vfN\(vec2\(xs \* 9\.0, ya \* 9\.0 - t \* 1\.3\)\)/.test(VF);
function dya(y) { return 1 / Math.sqrt(y + 0.015); } var stretch = dya(0.05) / dya(0.95);
ok('7. free fall: the curtain streak field accelerates (feature length ratio base / lip ' + stretch.toFixed(2) + ')', acc && stretch > 2.5 && stretch < 5, { acc: acc, stretch: stretch });

/* 8. THE FILM (owner: "waterfall-to-water transition"): below the curtain's 3.6 m foot the water continues down the rock to the sea as a film
      made of the ridge's own triangles, 3 cm proud. Built for real (macro ridge + Veil) on HIGH / MED: every film triangle's centre and
      corners below 3.4 m sit within 5 cm of the ridge along that triangle's normal (the host's ≤ 5 cm rule); the curtain itself still stops
      at 3.6 m; LOW has no film (no draw added there). */
globalThis.document = globalThis.document || { createElement: function () { return { width: 0, height: 0, getContext: function () { return { createRadialGradient: function () { return { addColorStop: function () { } }; }, fillRect: function () { }, fillStyle: '' }; } }; } };
var { createMacro } = await import('../26_LOCAL_AUTHORITY/lab/world/macro.js'); var { createVeilFalls } = await import('../26_LOCAL_AUTHORITY/lab/world/veilFalls.js');
var REGW = JSON.parse(fs.readFileSync(path.join(LA, 'lab/assets/world/world_registry_v1.json'), 'utf8')), res8 = {}, warn8 = console.warn; console.warn = function () { };
for (var T8 of ['HIGH', 'MED', 'LOW']) { var g8 = new THREE.Group(), c8 = { THREE: THREE, registry: REGW, group: g8, quality: { tier: function () { return T8; } }, auraRequests: [], auraForms: [], log: function () { }, mods: {} };
  var mc8 = createMacro(c8); await mc8.build(); var vf8 = createVeilFalls(c8); vf8.build(); g8.updateMatrixWorld(true);
  var film8 = g8.getObjectByName('VEIL_FALLS_FILM'), cur8 = g8.getObjectByName('VEIL_FALLS_CURTAIN'), rn8 = g8.getObjectByName('MACRO_RIDGE_RIDGE_NEAR'), r8 = { film: !!film8, tris: 0, worst: 0, over: 0, curtainMinY: 1e9 };
  var cp8 = cur8.geometry.attributes.position; for (var q8 = 0; q8 < cp8.count; q8++) r8.curtainMinY = Math.min(r8.curtainMinY, cp8.getY(q8));
  if (film8) { rn8.material.side = THREE.DoubleSide; var fp8 = film8.geometry.attributes.position, rc8 = new THREE.Raycaster(), A8 = new THREE.Vector3(), B8 = new THREE.Vector3(), C8 = new THREE.Vector3(), n8 = new THREE.Vector3(), e8 = new THREE.Vector3(), f8 = new THREE.Vector3();
    for (var t8 = 0; t8 < fp8.count; t8 += 3) { A8.fromBufferAttribute(fp8, t8); B8.fromBufferAttribute(fp8, t8 + 1); C8.fromBufferAttribute(fp8, t8 + 2); r8.tris++; n8.crossVectors(e8.subVectors(B8, A8), f8.subVectors(C8, A8)).normalize();
      var M8 = A8.clone().add(B8).add(C8).multiplyScalar(1 / 3); [M8, M8.clone().lerp(A8, 0.8), M8.clone().lerp(B8, 0.8), M8.clone().lerp(C8, 0.8)].forEach(function (P8) {   /* the centre and 80 % toward each corner (a ray aimed exactly at a rock vertex can slip between its triangles) */ if (P8.y >= 3.4) return; var best = 1e9; [n8.clone(), n8.clone().negate()].forEach(function (d8) { rc8.set(P8.clone().addScaledVector(d8, -0.001), d8); rc8.far = 0.5; var h8 = rc8.intersectObject(rn8, false)[0]; if (h8) best = Math.min(best, h8.distance); }); r8.worst = Math.max(r8.worst, best); if (best > 0.05) r8.over++; }); } }
  res8[T8] = r8; vf8.dispose(); }
console.warn = warn8;
ok('8. the fall reaches the sea as a flush film on the rock: HIGH ' + res8.HIGH.tris + ' / MED ' + res8.MED.tris + ' triangles, worst ' + (res8.HIGH.worst * 100).toFixed(1) + ' / ' + (res8.MED.worst * 100).toFixed(1) + ' cm off the ridge below 3.4 m; the curtain still stops at ' + res8.HIGH.curtainMinY.toFixed(1) + ' m; LOW has none',
  res8.HIGH.film && res8.MED.film && !res8.LOW.film && res8.HIGH.tris > 40 && res8.HIGH.over === 0 && res8.MED.over === 0 && res8.HIGH.worst <= 0.05 && res8.MED.worst <= 0.05 && res8.HIGH.curtainMinY >= 3.4 && /film\.name = 'VEIL_FALLS_FILM'/.test(VF), res8);

/* 9. M20 strands + plunge line: the fall leaves the crest only at its notches, each from a level lip under its own crest (no water on a
      slope); the curtain spans the bays (it no longer folds back on itself); the plunge line is a flush band on the sea under the strands */
var g9 = new THREE.Group(), c9 = { THREE: THREE, registry: REGW, group: g9, quality: { tier: function () { return 'HIGH'; } }, auraRequests: [], auraForms: [], log: function () { }, mods: {} }, w9 = console.warn; console.warn = function () { };
var vf9 = createVeilFalls(c9); vf9.build(); g9.updateMatrixWorld(true); console.warn = w9; var I9 = vf9.debug(), ST9 = I9.strands || [], pl9 = g9.getObjectByName('VEIL_FALLS_PLUNGE'), cu9 = g9.getObjectByName('VEIL_FALLS_CURTAIN');
var MR9 = REGW.macro.mountains.filter(function (m) { return m.id === 'RIDGE_NEAR'; })[0], rl9 = await import('../26_LOCAL_AUTHORITY/lab/world/ridgeLayout.js'), st9 = rl9.ridgeStations(MR9, REGW.macro.mountains.indexOf(MR9));
var lipOk = ST9.every(function (S) { return S.lip_y <= rl9.ridgeFaceSegment(st9, S.station).crestA.y; }), SEA9 = REGW.coast.sea_y, plY = [1e9, -1e9], pp9 = pl9 ? pl9.geometry.attributes.position : null;
if (pp9) for (var q9 = 0; q9 < pp9.count; q9++) { plY[0] = Math.min(plY[0], pp9.getY(q9)); plY[1] = Math.max(plY[1], pp9.getY(q9)); }
var cp9 = cu9.geometry.attributes.position, cv9 = cu9.geometry.attributes.uv, NC9 = 0; for (q9 = 1; q9 < cp9.count; q9++) if (cv9.getY(q9) !== cv9.getY(0)) { NC9 = q9 - 1; break; }
var worstTurn = 0, lastRow = cp9.count / (NC9 + 1) - 1; for (var r9 = lastRow - 20; r9 <= lastRow; r9++) for (q9 = 1; q9 < NC9; q9++) { var k9 = r9 * (NC9 + 1) + q9, ax9 = cp9.getX(k9) - cp9.getX(k9 - 1), az9 = cp9.getZ(k9) - cp9.getZ(k9 - 1), bx9 = cp9.getX(k9 + 1) - cp9.getX(k9), bz9 = cp9.getZ(k9 + 1) - cp9.getZ(k9);
  var tn9 = Math.abs(Math.atan2(ax9 * bz9 - az9 * bx9, ax9 * bx9 + az9 * bz9)) * 180 / Math.PI; worstTurn = Math.max(worstTurn, tn9); }
ok('9. the fall pours from ' + ST9.length + ' notches (' + ST9.map(function (S) { return S.station + ' @ ' + S.lip_y + ' m'; }).join(', ') + '), each lip under its crest; the lower curtain never folds back (sharpest turn ' + worstTurn.toFixed(0) + '°); the plunge line lies flush on the sea (' + (plY[0] - SEA9).toFixed(2) + '–' + (plY[1] - SEA9).toFixed(2) + ' m)',
  ST9.length >= 2 && ST9.some(function (S) { return S.station === REGW.macro.waterfalls.filter(function (w) { return w.style === 'VEIL'; })[0].station; }) && lipOk && worstTurn < 90 && pl9 && plY[0] >= SEA9 && plY[1] - SEA9 <= 0.05 && /vfStrand/.test(VF), { ST9: ST9, worstTurn: worstTurn, plY: plY });
vf9.dispose();

/* 10. THE SMALL FALLS (M20): the TITAN fall hung in the air 3.4 m in front of its ledge, half past the deck corner, a flat plane landing on the
   dry shore strip; the NORTH sheet stood in the open floor of the north pass (46 m of water under no rock). Now the TITAN fall leaves the
   ledge deck's own south lip level, on the free-fall parabola, into the lake's OPEN water, fed by a flush flume on the deck (2 cm, inside the
   walkable footprint) from the monolith inlay, with churned foam on the water (≤ 5 cm); the NORTH sheet is retired (registry entry kept for
   the ridge keep circle; its spring pool stays). */
var REG10 = JSON.parse(src('lab/assets/world/world_registry_v1.json')), TF10 = REG10.macro.waterfalls.filter(function (w) { return w.id === 'TITAN_FALL'; })[0], NF10 = REG10.macro.waterfalls.filter(function (w) { return w.id === 'NORTH_FALL'; })[0];
var LG10 = REG10.architecture.class_houses.filter(function (h) { return h.id === 'TITAN_LEDGE'; })[0].platform, LK10 = REG10.water.rivers.concat(REG10.water.ponds || []).filter(function (w) { return w.id === 'TITAN_LAKE'; })[0] || (REG10.water.lakes || []).filter(function (w) { return w.id === 'TITAN_LAKE'; })[0];
var { createMacro: cM10 } = await import('../26_LOCAL_AUTHORITY/lab/world/macro.js'), g10 = new THREE.Group(), M10 = cM10({ THREE: THREE, group: g10, registry: REG10, quality: { tier: function () { return 'HIGH'; } }, log: function () { } }); M10.build();
var sh10 = g10.getObjectByName('MACRO_FALL_TITAN_FALL'), fd10 = g10.getObjectByName('MACRO_FALL_FEED_TITAN_FALL'), P10 = sh10 && sh10.geometry.attributes.position, s10 = {};
if (P10) { var n10 = P10.count, top10 = [], bot10 = []; for (var i10 = 0; i10 < 7; i10++) { top10.push([P10.getX(i10), P10.getY(i10), P10.getZ(i10)]); bot10.push([P10.getX(n10 - 7 + i10), P10.getY(n10 - 7 + i10), P10.getZ(n10 - 7 + i10)]); }
  s10.lipOnDeck = top10.every(function (q) { return Math.abs(q[1] - LG10.h) < 1e-6 && Math.abs(q[2] - LG10.z1) < 1e-6 && q[0] > LG10.x1 && q[0] < LG10.x2; });
  s10.landsInOpenWater = bot10.every(function (q) { return Math.abs(q[1] - TF10.receiver.y) < 1e-6 && q[0] > LK10.x1 + 0.5 && q[0] < LK10.x2 && q[2] < LK10.z2 - (LK10.shore_w || 0) + 2.5 && q[2] > LK10.z1; });
  var mono = true, prevY = Infinity; for (var r10 = 0; r10 * 7 < n10; r10++) { var y10 = P10.getY(r10 * 7); if (y10 > prevY + 1e-9) mono = false; prevY = y10; } s10.fallsMonotone = mono; }
var FP10 = fd10 && fd10.geometry.attributes.position; if (FP10) { var inFoot = true, flush = true; for (var j10 = 0; j10 < FP10.count; j10++) { var x = FP10.getX(j10), y = FP10.getY(j10), z = FP10.getZ(j10); if (!(x >= LG10.x1 && x <= LG10.x2 && z >= LG10.z1 - 1e-6 && z <= LG10.z2)) inFoot = false; if (!(y - LG10.h >= 0 && y - LG10.h <= 0.05)) flush = false; } s10.feedInFootprint = inFoot; s10.feedFlush = flush; }
var foam10 = null; g10.traverse(function (o) { if (o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uR && Math.abs(o.position.x - TF10.receiver.x) < 1e-6) foam10 = o; });
s10.foamOnWater = !!foam10 && foam10.position.y - TF10.receiver.y > 0 && foam10.position.y - TF10.receiver.y <= 0.05;
s10.northRetired = !!NF10 && !!NF10.retired && !g10.getObjectByName('MACRO_FALL_NORTH_FALL') && NF10.scenic_only === true && M10.debug().waterfalls.every(function (w) { return w.id !== 'NORTH_FALL'; });
ok('10. the small falls: TITAN leaves the ledge deck lip level (y ' + LG10.h + ', z ' + LG10.z1 + ') on a falling arc into the lake\'s open water, fed by a flush flume inside the deck footprint, foam ≤ 5 cm on the water; the NORTH sheet retired', s10.lipOnDeck && s10.landsInOpenWater && s10.fallsMonotone && s10.feedInFootprint && s10.feedFlush && s10.foamOnWater && s10.northRetired, s10);
M10.dispose();

/* 11. the strands' lip whitening is a band of world HEIGHT, and the flume runs at that height: unconfined it whitened the whole flume into a
   blown-out field (camera FK, found at the M20 self-review). It is confined to the falling water and the last metres of the flume. */
ok('11. the strand lip whitening stays off the flume (falling water + the last metres before the brink only)', /aer = max\(aer, stL \* 0\.85 \* smoothstep\(-0\.03, 0\.0, y\)\)/.test(VF) && !/aer = max\(aer, stL \* 0\.85\);/.test(VF));

console.log('RESULT world m20 water: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
