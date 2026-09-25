/* M8 MATERIAL REALISM (owner 2026-09-25): every major hard-surface family is a deliberate material — world-space structural surface logic
   (lab/world/surfaceDetail.js) on floors, facades, structure, metal and stone; daylight trims read by contrast, metals are satin / brushed,
   never sky mirrors; the pattern modulates value / roughness / metalness only (the five-class colour law is untouched).
   Runs the real patch against the vendored three.js standard shader source.  node 16_TESTS/gameplay_world_material_realism.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { surfaceDetail, applySurface, SURFACE } from '../26_LOCAL_AUTHORITY/lab/world/surfaceDetail.js';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function src(rel) { return fs.readFileSync(path.join(LA, rel), 'utf8'); }
function compiled(mat) { var sh = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader, uniforms: {} }; mat.onBeforeCompile(sh, null); return sh; }

/* 1. every injection anchor exists in this three.js build: world varyings, pattern, roughness, metalness and the chamfer normal */
var hs = compiled(applySurface(THREE, new THREE.MeshStandardMaterial(), 'PLAZA', 'HIGH')), fa = compiled(applySurface(THREE, new THREE.MeshStandardMaterial(), 'FACADE', 'HIGH'));
var anchors = { vary: /vSdW = \(modelMatrix \* sdP\)\.xyz/.test(hs.vertexShader), inst: /#ifdef USE_INSTANCING\n  sdP = instanceMatrix \* sdP/.test(hs.vertexShader), seam: /float sdSeam = /.test(hs.fragmentShader), tone: /diffuseColor\.rgb \*= sdTone/.test(hs.fragmentShader), rough: /roughnessFactor = clamp\(mix\(roughnessFactor \* sdRough/.test(hs.fragmentShader), metal: /metalnessFactor \*= 1\.0 - /.test(hs.fragmentShader), bevel: /normal = normalize\(normal \+ sdK/.test(hs.fragmentShader), band: /float sdBand = /.test(fa.fragmentShader), stagger: /sdG\.x \+= 0\.5000 \* mod\(sdRow, 2\.0\)/.test(hs.fragmentShader) };
ok('1. the surface patch lands on every anchor of the vendored standard shader (world varyings incl. instancing, seams, tone, roughness, metalness, chamfer, storey bands, running bond)', Object.keys(anchors).every(function (k) { return anchors[k]; }), anchors);

/* 2. tiers + families: LOW drops the chamfer / grain / macro but keeps per-piece tone and roughness; BRUSHED has no seams; keys are distinct */
var lo = compiled(applySurface(THREE, new THREE.MeshStandardMaterial(), 'PLAZA', 'LOW')), br = compiled(applySurface(THREE, new THREE.MeshStandardMaterial(), 'BRUSHED', 'HIGH'));
var keys = Object.keys(SURFACE).map(function (F) { return applySurface(THREE, new THREE.MeshStandardMaterial(), F, 'HIGH').customProgramCacheKey(); }).concat([applySurface(THREE, new THREE.MeshStandardMaterial(), 'PLAZA', 'LOW').customProgramCacheKey()]);
ok('2. LOW keeps tone / roughness only (no chamfer, grain or macro); BRUSHED streaks without seams; every family × tier compiles to its own program key', !/sdK/.test(lo.fragmentShader) && !/sdGrain/.test(lo.fragmentShader) && !/sdMacro/.test(lo.fragmentShader) && /sdTone/.test(lo.fragmentShader) && /sdRough/.test(lo.fragmentShader) && /sdStreak/.test(br.fragmentShader) && /sdSeam = 0\.0/.test(br.fragmentShader) && new Set(keys).size === keys.length, { keys: keys.length, unique: new Set(keys).size });

/* 3. chaining: an existing onBeforeCompile (ripples, rock, crystal emissive patches) still runs, the key keeps its prefix, double application is a no-op */
var m3 = new THREE.MeshStandardMaterial(); var ran = false; m3.onBeforeCompile = function (sh) { ran = true; sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n// prior-patch'); }; m3.customProgramCacheKey = function () { return 'prior'; };
applySurface(THREE, m3, 'FACADE', 'HIGH'); var k1 = m3.customProgramCacheKey(); applySurface(THREE, m3, 'STONE', 'HIGH'); var s3 = compiled(m3);
ok('3. the patch chains after an existing shader patch, keeps its cache-key prefix, and a second application is ignored', ran && /prior-patch/.test(s3.fragmentShader) && /sdSeam/.test(s3.fragmentShader) && k1.indexOf('prior|') === 0 && m3.customProgramCacheKey() === k1 && m3.userData.surfaceDetail.kind === 'PANELS', { ran: ran, key: k1 });

/* 4. the application map: plaza + district floors, civic facades / structure / chrome / stone, the HALO deck, shared world families, class houses */
var FS = src('lab/fieldScene.js'), CS = src('lab/cityScene.js'), WB = src('lab/world/worldB.js'), AR = src('lab/world/architecture.js'), TR = src('lab/world/terrain.js');
var map = { plaza: /applySurface\(THREE, floor\.material, 'PLAZA'/.test(FS), district: /applySurface\(THREE, dFloor\.material, 'DISTRICT'/.test(FS), proxies: /applySurface\(THREE, chrome, 'BRUSHED'/.test(FS) && /applySurface\(THREE, platinum, 'STRUCTURE'/.test(FS), facade: /applySurface\(THREE, M\.platinum, 'FACADE'/.test(CS), civic: /applySurface\(THREE, M\.chrome, 'BRUSHED'/.test(CS) && /applySurface\(THREE, M\.stone, 'STONE'/.test(CS), deck: /applySurface\(THREE, mat, 'DECK'/.test(CS), world: /applySurface\(THREE, M\.platinum, 'STRUCTURE', tier\)/.test(WB) && /applySurface\(THREE, M\.chrome, 'BRUSHED', tier\)/.test(WB), houses: /applySurface\(THREE, platMat, 'STRUCTURE'/.test(AR) && /applySurface\(THREE, stoneMat, 'STONE'/.test(AR), trunk: /applySurface\(THREE, trunkMat, 'TOWER'/.test(CS), roads: /applySurface\(THREE, frameMat, 'KERB'/.test(TR) && /applySurface\(THREE, coreMat, 'PAVER'/.test(TR) && /mahworld_path_core_owned/.test(TR) };
ok('4. every major hard-surface family carries its surface logic (floors, facades, structure, chrome, stone, HALO deck + trunk, shared world families, class houses, road kerbs + causeway cores)', Object.keys(map).every(function (k) { return map[k]; }), map);

/* 5. daylight value policy + colour law: trims ≤ 0.5 emissive by day, no sky-mirror metals by day, the pattern never changes hue */
var trimDay = /trim: new THREE\.MeshStandardMaterial\(\{ color: 0xe6ecf6, emissive: 0xdfe8ff, emissiveIntensity: \(DAY \? ([0-9.]+)/.exec(CS), fsTrim = /trim\.emissiveIntensity = ([0-9.]+); \}/.exec(FS);
var chromeDay = /chrome: new THREE\.MeshStandardMaterial\(\{ color: 0xa4aeb9, roughness: \(DAY \? ([0-9.]+)/.exec(CS), wPlat = /platinum: std\(\{ color: 0x([0-9a-f]{6}), roughness: ([0-9.]+)/.exec(WB), wChrome = /chrome: std\(\{ color: 0x[0-9a-f]{6}, roughness: ([0-9.]+)/.exec(WB);
var SD = src('lab/world/surfaceDetail.js'), hueFree = !/vec3\(\s*0?\.\d+\s*,\s*0?\.\d+\s*,\s*0?\.\d+\s*\)\s*\*\s*diffuse|diffuseColor\.rgb\s*=\s*vec3|mix\(diffuseColor\.rgb/.test(SD) && (SD.match(/diffuseColor\.rgb \*=/g) || []).length === 1;
ok('5. daylight trims glow ≤ 0.5, civic and world metals are satin / brushed (roughness ≥ 0.3, platinum no longer near-white), and the pattern only scales value', trimDay && +trimDay[1] <= 0.5 && fsTrim && +fsTrim[1] <= 0.5 && chromeDay && +chromeDay[1] >= 0.3 && wPlat && parseInt(wPlat[1], 16) < 0xd0d0d0 && +wPlat[2] >= 0.3 && wChrome && +wChrome[1] >= 0.3 && hueFree, { trimDay: trimDay && trimDay[1], fsTrim: fsTrim && fsTrim[1], chromeDay: chromeDay && chromeDay[1], worldPlatinum: wPlat && wPlat.slice(1), worldChrome: wChrome && wChrome[1], hueFree: hueFree });

console.log('RESULT world material realism: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
