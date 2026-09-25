/* MAHWORLD M8 · MATERIAL REALISM :: SURFACE DETAIL — structural surface logic for the platinum world, with no textures.
   The world's hard surfaces were single flat values (one colour / roughness / metalness per material), so every facade, floor and support
   read as a smooth placeholder shell. surfaceDetail() patches an existing MeshStandardMaterial with a WORLD-SPACE procedural layer:
     HARDSCAPE  floors: staggered paving slabs, recessed grout seams (darker, matte), per-slab tone / roughness, aggregate grain, wear breakup;
     PANELS     facades / supports: a box-projected panel grid (inset seams with a chamfer in the normal), per-panel tone / roughness, optional
                trim bands on the vertical faces, macro breakup;
     BRUSHED    poles / rails / chrome: directional streak roughness along the long axis, faint tone breakup — metal that is not a mirror;
     STONE      graphite plinths / roof plant: grain + faint bedding, matte.
   World space means the pattern survives the static merge (MERGED_* meshes), instancing and any UV layout, and costs no texture memory.
   Seams are antialiased with fwidth and fade with distance (no shimmer); the LOW tier keeps only the per-panel / per-slab tone and
   roughness (no chamfer normal, no grain). Colour: neutral only — the pattern modulates value / roughness / metalness, never hue. */

var HELPERS = [
  'varying vec3 vSdW; varying vec3 vSdN;',
  'float sdHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
  'float sdNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(sdHash(i), sdHash(i + vec2(1.0, 0.0)), f.x), mix(sdHash(i + vec2(0.0, 1.0)), sdHash(i + vec2(1.0, 1.0)), f.x), f.y); }'
].join('\n');

var PATCHED = typeof WeakSet !== 'undefined' ? new WeakSet() : null;   /* patched materials (a clone copies userData but not the patch, so it may be patched on its own) */
function f(v) { v = +v; return (Math.round(v * 10000) / 10000).toFixed(4); }

/* spec: { kind, cell: [u, v] m, seam: m, seamDark, bevel, toneVar, roughVar, macro, grain, band: [every m, height m], bandTone, stagger, lod: [near, far] m, tier } */
export function surfaceDetail(THREE, mat, spec) {
  if (!mat || !mat.isMeshStandardMaterial || (PATCHED ? PATCHED.has(mat) : mat.userData.surfaceDetail)) return mat;
  var S = Object.assign({ kind: 'PANELS', cell: [1.8, 1.2], seam: 0.03, seamDark: 0.6, bevel: 0.35, toneVar: 0.06, roughVar: 0.22, macro: 0.05, grain: 0.05, band: null, bandTone: 0.82, stagger: 0, lod: [30, 140], tier: 'HIGH', metalSeam: 0.5, seamless: false }, spec || {});
  var LOW = S.tier === 'LOW'; var K = S.kind;
  var body = [
    '#include <color_fragment>',
    'vec3 sdAn = abs(normalize(vSdN)); vec2 sdUV; vec3 sdTU, sdTV; bool sdFloor = sdAn.y > sdAn.x && sdAn.y > sdAn.z;',
    'if (sdFloor) { sdUV = vSdW.xz; sdTU = vec3(1.0, 0.0, 0.0); sdTV = vec3(0.0, 0.0, 1.0); } else if (sdAn.x > sdAn.z) { sdUV = vec2(vSdW.z, vSdW.y); sdTU = vec3(0.0, 0.0, 1.0); sdTV = vec3(0.0, 1.0, 0.0); } else { sdUV = vec2(vSdW.x, vSdW.y); sdTU = vec3(1.0, 0.0, 0.0); sdTV = vec3(0.0, 1.0, 0.0); }',
    'float sdDist = length(cameraPosition - vSdW); float sdNear = 1.0 - smoothstep(' + f(S.lod[0]) + ', ' + f(S.lod[1]) + ', sdDist);',
    'vec2 sdCell = vec2(' + f(S.cell[0]) + ', ' + f(S.cell[1]) + '); if (sdFloor && ' + (K === 'PANELS' ? 'true' : 'false') + ') sdCell = vec2(sdCell.x);',
    'vec2 sdG = sdUV / sdCell; float sdRow = floor(sdG.y); sdG.x += ' + f(S.stagger) + ' * mod(sdRow, 2.0);',
    'vec2 sdId = floor(sdG), sdF = fract(sdG); vec2 sdE = min(sdF, 1.0 - sdF) * sdCell; float sdD = min(sdE.x, sdE.y);',
    'float sdAA = max(fwidth(sdD), 1e-4) * 1.25; float sdSeam = (1.0 - smoothstep(' + f(S.seam * 0.5) + ', ' + f(S.seam * 0.5) + ' + sdAA, sdD)) * sdNear;',
    'float sdH1 = sdHash(sdId + 17.0), sdH2 = sdHash(sdId * 1.7 + 3.1);',
    'float sdTone = 1.0 + (sdH1 - 0.5) * ' + f(S.toneVar) + ';',
    'float sdRough = 1.0 + (sdH2 - 0.5) * ' + f(S.roughVar) + ';'
  ];
  if (S.seamless) body.push('sdSeam = 0.0; sdTone = 1.0; sdRough = 1.0;');   /* poured / continuous surfaces: grain + macro only, no piece grid */
  if (K === 'BRUSHED') body = body.concat([   /* streaks along the long (vertical or U) axis; no panel seams */
    'float sdStreak = sdNoise(vec2(sdUV.x * 38.0, sdUV.y * 0.6)) * 0.6 + sdNoise(vec2(sdUV.x * 91.0, sdUV.y * 1.3)) * 0.4;',
    'sdSeam = 0.0; sdTone = 1.0 + (sdStreak - 0.5) * ' + f(S.toneVar) + '; sdRough = 1.0 + (sdStreak - 0.5) * ' + f(S.roughVar) + ' * (0.4 + 0.6 * sdNear);'
  ]);
  if (!LOW && S.macro > 0) body.push('float sdMacro = sdNoise(vSdW.xz * 0.045 + vSdW.y * 0.03) - 0.5; sdTone *= 1.0 + sdMacro * ' + f(S.macro * 2) + '; sdRough *= 1.0 + sdMacro * ' + f(S.macro * 3) + ';');
  if (!LOW && S.grain > 0) body.push('float sdGrain = sdNoise(sdUV * 7.3) * 0.6 + sdNoise(sdUV * 23.0) * 0.4 - 0.5; sdTone *= 1.0 + sdGrain * ' + f(S.grain) + ' * sdNear; sdRough *= 1.0 + sdGrain * ' + f(S.grain * 2.2) + ' * sdNear;');
  if (S.band) body.push('if (!sdFloor) { float sdBy = mod(vSdW.y, ' + f(S.band[0]) + '); float sdBand = smoothstep(' + f(S.band[0] - S.band[1]) + ' - sdAA, ' + f(S.band[0] - S.band[1]) + ', sdBy); sdTone *= mix(1.0, ' + f(S.bandTone) + ', sdBand); sdRough *= mix(1.0, 0.72, sdBand); }');
  body.push('diffuseColor.rgb *= sdTone * mix(1.0, ' + f(S.seamDark) + ', sdSeam);');
  var rough = ['#include <roughnessmap_fragment>', 'roughnessFactor = clamp(mix(roughnessFactor * sdRough, max(roughnessFactor, 0.86), sdSeam), 0.04, 1.0);'];
  var metal = ['#include <metalnessmap_fragment>', 'metalnessFactor *= 1.0 - ' + f(S.metalSeam) + ' * sdSeam;'];
  var nrm = ['#include <normal_fragment_maps>'];
  if (!LOW && S.bevel > 0 && K !== 'BRUSHED' && !S.seamless) nrm.push(   /* chamfer: inside the bevel width the normal tilts toward the nearest seam, so each panel / slab reads as a separate, slightly inset piece */
    '{ float sdBW = ' + f(Math.max(S.seam * 2.5, 0.05)) + '; float sdK = ' + f(S.bevel) + ' * (1.0 - smoothstep(0.0, sdBW, sdD)) * sdNear; vec3 sdDir = sdE.x < sdE.y ? sdTU * (sdF.x < 0.5 ? -1.0 : 1.0) : sdTV * (sdF.y < 0.5 ? -1.0 : 1.0);',
    '  normal = normalize(normal + sdK * normalize((viewMatrix * vec4(sdDir, 0.0)).xyz)); }');
  var prevOBC = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey;
  var key = 'mahworld-sd-' + K + '-' + [S.cell[0], S.cell[1], S.seam, S.seamDark, S.bevel, S.toneVar, S.roughVar, S.macro, S.grain, S.band ? S.band.join('x') : 0, S.bandTone, S.stagger, S.lod.join('x'), LOW ? 'L' : 'H', S.metalSeam, S.seamless ? 'S' : 'G'].join('_');
  mat.onBeforeCompile = function (sh, r) { if (prevOBC) prevOBC.call(this, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSdW; varying vec3 vSdN;').replace('#include <project_vertex>', ['#include <project_vertex>',
      '{ vec4 sdP = vec4(transformed, 1.0); vec3 sdN0 = objectNormal;',
      '#ifdef USE_BATCHING', '  sdP = batchingMatrix * sdP; sdN0 = mat3(batchingMatrix) * sdN0;', '#endif',
      '#ifdef USE_INSTANCING', '  sdP = instanceMatrix * sdP; sdN0 = mat3(instanceMatrix) * sdN0;', '#endif',
      '  vSdW = (modelMatrix * sdP).xyz; vSdN = normalize(mat3(modelMatrix) * sdN0); }'].join('\n'));
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + HELPERS).replace('#include <color_fragment>', body.join('\n'))
      .replace('#include <roughnessmap_fragment>', rough.join('\n')).replace('#include <metalnessmap_fragment>', metal.join('\n')).replace('#include <normal_fragment_maps>', nrm.join('\n')); };
  mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|' + key; };
  mat.userData.surfaceDetail = { kind: K, key: key }; if (PATCHED) PATCHED.add(mat); mat.needsUpdate = true;
  return mat;
}

/* the material families of the world, tuned once here so every module speaks the same surface language */
export var SURFACE = {
  PLAZA: { kind: 'HARDSCAPE', cell: [2.4, 1.2], seam: 0.035, seamDark: 0.7, bevel: 0.28, toneVar: 0.09, roughVar: 0.26, macro: 0.05, grain: 0.07, stagger: 0.5, lod: [26, 110], metalSeam: 0.6 },
  DISTRICT: { kind: 'HARDSCAPE', cell: [3.2, 1.6], seam: 0.045, seamDark: 0.66, bevel: 0.22, toneVar: 0.08, roughVar: 0.24, macro: 0.06, grain: 0.06, stagger: 0.5, lod: [30, 130], metalSeam: 0.6 },
  DECK: { kind: 'HARDSCAPE', cell: [3.0, 3.0], seam: 0.03, seamDark: 0.72, bevel: 0.18, toneVar: 0.05, roughVar: 0.2, macro: 0.035, grain: 0.05, stagger: 0, lod: [24, 100], metalSeam: 0.5 },
  FACADE: { kind: 'PANELS', cell: [1.8, 1.2], seam: 0.028, seamDark: 0.62, bevel: 0.32, toneVar: 0.07, roughVar: 0.3, macro: 0.04, grain: 0.035, band: [3.6, 0.22], bandTone: 0.78, lod: [30, 140], metalSeam: 0.5 },
  STRUCTURE: { kind: 'PANELS', cell: [1.2, 2.4], seam: 0.022, seamDark: 0.66, bevel: 0.26, toneVar: 0.05, roughVar: 0.24, macro: 0.035, grain: 0.03, lod: [24, 120], metalSeam: 0.45 },
  BRUSHED: { kind: 'BRUSHED', toneVar: 0.05, roughVar: 0.55, macro: 0.03, grain: 0, lod: [12, 60] },
  TOWER: { kind: 'PANELS', cell: [3.2, 7.2], seam: 0.04, seamDark: 0.6, bevel: 0.3, toneVar: 0.05, roughVar: 0.26, macro: 0.04, grain: 0.03, band: [3.6, 0.16], bandTone: 0.84, lod: [40, 220], metalSeam: 0.5 },
  CONCRETE: { kind: 'HARDSCAPE', cell: [4, 4], seamless: true, toneVar: 0, roughVar: 0, macro: 0.07, grain: 0.08, lod: [30, 120] },
  PAVER: { kind: 'HARDSCAPE', cell: [4.0, 2.0], seam: 0.03, seamDark: 0.76, bevel: 0.2, toneVar: 0.06, roughVar: 0.2, macro: 0.06, grain: 0.08, stagger: 0.5, lod: [30, 120], metalSeam: 0.5 },
  KERB: { kind: 'PANELS', cell: [1.0, 1.0], seam: 0.02, seamDark: 0.62, bevel: 0.3, toneVar: 0.06, roughVar: 0.22, macro: 0.03, grain: 0.04, lod: [24, 100], metalSeam: 0.5 },
  STONE: { kind: 'PANELS', cell: [0.9, 0.45], seam: 0.012, seamDark: 0.8, bevel: 0.12, toneVar: 0.08, roughVar: 0.2, macro: 0.06, grain: 0.1, stagger: 0.5, lod: [16, 70], metalSeam: 0.3 }
};

/* apply a named family with the current tier (a missing / failing tier probe means HIGH) */
export function applySurface(THREE, mat, family, tier) { var S = SURFACE[family]; if (!S) return mat; return surfaceDetail(THREE, mat, Object.assign({}, S, { tier: tier || 'HIGH' })); }
