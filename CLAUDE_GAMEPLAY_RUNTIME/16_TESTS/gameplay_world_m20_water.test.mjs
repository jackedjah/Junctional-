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
  order: F.indexOf('swSky.r = min(swSky.r, swSky.g)') > F.indexOf('uLandH > 0.0') && F.indexOf('swSky.r = min(swSky.r, swSky.g)') < F.indexOf('outgoingLight = mix(totalDiffuse') };
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
  sea: /skyWater\(THREE, seaMat, ctx, \{ shore: \{ rect: \[/.test(CST), basin: /skyWater\(THREE, lakeM, ctx, \{ refl: 0\.9, body: 0\.6, land: 0\.3 \}\)/.test(VF), noDraw: !/new THREE\.(Mesh|Points|InstancedMesh|BufferGeometry)/.test(sw) };
ok('5. canals + ripple window (ridge skyline), sea (shore field), Veil basin (skyline) all mirror the sky; the patch adds no draw', Object.keys(wired).every(function (k) { return wired[k]; }), wired);

/* 6. COLOUR LAW: emulate the shader's sky mix for the REAL day and night palettes of atmosphere.js over a sweep of reflected directions
      (horizon → zenith, toward / away from the Sun, the ridge skyline) and classify the result: BLUE or neutral only, never purple / pink */
var REGA = JSON.parse(fs.readFileSync(path.join(LA, 'lab/assets/world/world_registry_v1.json'), 'utf8')).sky.atmosphere || {};   /* the registry palette (sky.atmosphere) overrides the module defaults (atmosphere.js P()) */
function pal(name) { var m = ATM.match(new RegExp('var ' + name + ' = \\{([^}]*)\\}')); var o = {}; m[1].replace(/(\w+): '(#[0-9a-f]{6})'/g, function (_, k, v) { o[k] = v; }); return Object.assign(o, REGA[name.toLowerCase()] || {}); }
var bad = [], n6 = 0;
['DAY', 'NIGHT'].forEach(function (tod) { var P = pal(tod), Z = new THREE.Color(P.zenith), Hh = new THREE.Color(P.horizon), Hz = new THREE.Color(P.haze), T = new THREE.Color(P.sunTint);
  for (var hp = 0; hp <= 1.0001; hp += 0.05) for (var sun = 0; sun <= 1.0001; sun += 0.25) for (var land = 0; land <= 1; land++) {
    var c = Hh.clone().lerp(Z, Math.pow(hp, 0.55)); c.lerp(Hz, Math.exp(-hp * 10) * 0.55); c.add(T.clone().multiplyScalar(Math.pow(sun, 24) * 0.22)); if (land) c = Hh.clone().multiplyScalar(0.42);
    c.r = Math.min(c.r, c.g); var hx = c.getHex(), v = classify(hx); n6++; if (v.verdict === 'VIOLATION' || (v.verdict === 'LAW' && v.family !== 'BLUE')) bad.push({ tod: tod, hp: +hp.toFixed(2), sun: sun, land: land, hex: '#' + c.getHexString(), v: v }); } });
ok('6. the mirrored sky stays BLUE or neutral in ' + n6 + ' day / night samples (night haze ' + pal('NIGHT').haze + ', Moon tint ' + pal('NIGHT').sunTint + ' would read purple unguarded)', n6 > 400 && bad.length === 0, bad.slice(0, 6));

/* 7. the Veil curtain falls: its streak field runs in √y (v ∝ √drop), so features at the lip are ~2.5× shorter than at the base */
var acc = /float ya = sqrt\(max\(y, 0\.0\) \+ 0\.015\) \* 2\.0;/.test(VF) && /vfN\(vec2\(xs \* 20\.0, ya \* 3\.1 - t \* 1\.7\)\)/.test(VF) && /vfN\(vec2\(xs \* 9\.0, ya \* 9\.0 - t \* 1\.3\)\)/.test(VF);
function dya(y) { return 1 / Math.sqrt(y + 0.015); } var stretch = dya(0.05) / dya(0.95);
ok('7. free fall: the curtain streak field accelerates (feature length ratio base / lip ' + stretch.toFixed(2) + ')', acc && stretch > 2.5 && stretch < 5, { acc: acc, stretch: stretch });

console.log('RESULT world m20 water: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
