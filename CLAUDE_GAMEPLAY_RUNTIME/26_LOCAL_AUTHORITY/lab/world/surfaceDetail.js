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
  GLAZING: { kind: 'PANELS', cell: [1.5, 1.2], seam: 0.07, seamDark: 0.32, bevel: 0, toneVar: 0.05, roughVar: 0.35, macro: 0.03, grain: 0, band: [3.6, 0.34], bandTone: 0.5, lod: [40, 180], metalSeam: 0 },   /* M8B: curtain wall — mullions / transoms, a spandrel per storey, per-pane reflection variation */
  SAND: { kind: 'HARDSCAPE', cell: [4, 4], seamless: true, toneVar: 0, roughVar: 0, macro: 0.08, grain: 0.1, lod: [20, 90] },   /* M8B: dry-sand grain + drift breakup on the shore band */
  STONE: { kind: 'PANELS', cell: [0.9, 0.45], seam: 0.012, seamDark: 0.8, bevel: 0.12, toneVar: 0.08, roughVar: 0.2, macro: 0.06, grain: 0.1, stagger: 0.5, lod: [16, 70], metalSeam: 0.3 }
};

/* apply a named family with the current tier (a missing / failing tier probe means HIGH) */
export function applySurface(THREE, mat, family, tier) { var S = SURFACE[family]; if (!S) return mat; return surfaceDetail(THREE, mat, Object.assign({}, S, { tier: tier || 'HIGH' })); }

/* ---------------------------------------------------------------------------------------------------------------------------------------
   M8B SURFACE LANGUAGE — ZONED PAVING. One shader for the plaza + district ground that picks a pattern family per world zone:
     0 RUNNING BOND (civic default 3.2 × 1.6) · 1 RINGS (plaza hub: concentric courses with radial joints ~2.6 m apart) · 2 HEX (TITAN)
     3 DIAMOND (ATHLETE: the square-diamond grid) · 4 TRIANGLE (VISIONARY) · 5 PLANKS (LEAN, and the coast boardwalk) · 6 SQUARE (MATCH)
     7 MOSAIC (BAGE) · 8 FINE RINGS (the HALO trunk base, so the tree-elevator landmark flows into the ground)
   Where two families meet there is a 0.7 m THRESHOLD BAND (a solid kerb course with a joint on each side) — the pattern never just stops.
   Forest / garden zones (feathered 10 m) and the ecology-leaning districts get SOFT PATCHES: seams fade under world noise and the value
   drops slightly, so tiling gives way to weathered, soil-softened ground instead of a hard edge. Zones live in uniform arrays filled from
   the registry after it loads (the pattern starts as the civic default). Value / roughness only — never hue. */
var ZONED_FUNCS = [
  'uniform vec4 uZR[16]; uniform float uZRT[16]; uniform float uZRS[16]; uniform vec4 uZC[6]; uniform float uZCS[6]; uniform vec4 uZS[8]; uniform float uZDefSoft;',
  'void pBond(vec2 p, vec2 cell, float stag, out float d, out vec2 id, out vec2 cc) { vec2 g = p / cell; float row = floor(g.y); float sh = stag * mod(row, 2.0); g.x += sh; vec2 i = floor(g), f = fract(g); vec2 e = min(f, 1.0 - f) * cell; d = min(e.x, e.y); id = i; cc = vec2(i.x + 0.5 - sh, i.y + 0.5) * cell; }',
  'void pRings(vec2 q, float w, float jl, out float d, out vec2 id, out vec2 cc) { float r = length(q); float ri = floor(r / w), fr = fract(r / w); float n = max(3.0, floor(6.2831853 * (ri + 0.5) * w / jl)); float a = (atan(q.y, q.x) + 3.14159265) / 6.2831853 * n; float ai = floor(a), fa = fract(a); d = min(min(fr, 1.0 - fr) * w, min(fa, 1.0 - fa) * 6.2831853 * max(r, 0.2) / n); id = vec2(ri, ai); float ac = (ai + 0.5) / n * 6.2831853 - 3.14159265; cc = vec2(cos(ac), sin(ac)) * (ri + 0.5) * w; }',
  'void pHex(vec2 p, float s, out float d, out vec2 id, out vec2 cc) { vec2 r = vec2(1.0, 1.7320508), h = r * 0.5; vec2 P = p / s; vec2 a = mod(P, r) - h, b = mod(P - h, r) - h; vec2 gv = dot(a, a) < dot(b, b) ? a : b; vec2 c = P - gv; vec2 ag = abs(gv); float hd = max(dot(ag, vec2(0.5, 0.8660254)), ag.x); d = (0.5 - hd) * s; id = vec2(floor(c.x * 2.0 + 0.5), floor(c.y / 0.8660254 + 0.5)); cc = c * s; }',
  'void pDiamond(vec2 p, float s, out float d, out vec2 id, out vec2 cc) { vec2 q = vec2(p.x + p.y, p.y - p.x) * 0.70710678; vec2 cq; pBond(q, vec2(s), 0.0, d, id, cq); cc = vec2(cq.x - cq.y, cq.x + cq.y) * 0.70710678; }',
  'void pTri(vec2 p, float s, out float d, out vec2 id, out vec2 cc) { float hg = s * 0.8660254; vec2 q = vec2(p.x / s - p.y / (2.0 * hg), p.y / hg); vec2 i = floor(q), f = fract(q); float up = step(1.0, f.x + f.y); vec3 e = up < 0.5 ? vec3(f.x, f.y, 1.0 - f.x - f.y) : vec3(1.0 - f.x, 1.0 - f.y, f.x + f.y - 1.0); d = min(min(e.x, e.y), e.z) * hg; id = vec2(i.x * 2.0 + up, i.y); vec2 cq = i + (up < 0.5 ? vec2(0.3333333) : vec2(0.6666667)); cc = vec2((cq.x + cq.y * 0.5) * s, cq.y * hg); }'
].join('\n');

export var PAVING_TYPES = { BOND: 0, RINGS: 1, HEX: 2, DIAMOND: 3, TRI: 4, PLANKS: 5, SQUARE: 6, MOSAIC: 7, FINE_RINGS: 8 };
var CLASS_PAVING = { ATHLETE: ['DIAMOND', 0.1], TITAN: ['HEX', 0.15], LEAN: ['PLANKS', 0.35], VISIONARY: ['TRI', 0.5], BAGE: ['MOSAIC', 0.2] };

/* the zone state: plain arrays the shader uniforms point at (filled in place, so a late registry updates every patched material) */
export function createPavingZones(THREE) {
  var Z = { rects: [], rtype: [], rsoft: [], circles: [], csoft: [], soft: [], defSoft: { value: 0.18 }, info: { rects: 0, circles: 0, soft: 0 } };
  for (var i = 0; i < 16; i++) { Z.rects.push(new THREE.Vector4(1, 1, 0, 0)); Z.rtype.push(0); Z.rsoft.push(0); }
  for (i = 0; i < 6; i++) { Z.circles.push(new THREE.Vector4(0, 0, 0, 0)); Z.csoft.push(0); }
  for (i = 0; i < 8; i++) Z.soft.push(new THREE.Vector4(1, 1, 0, 0));
  Z.setFromRegistry = function (reg, opts) { opts = opts || {}; var ri = 0, ci = 0, si = 0;
    ((reg && reg.regions && reg.regions.list) || []).forEach(function (R) { var sh = R.shape || {}; if (sh.kind !== 'RECTS') return; var t = R.id === 'LUMINOUS_COAST' ? ['PLANKS', 0.25] : (R.class && CLASS_PAVING[R.class]) || (R.family === 'platinum' ? ['SQUARE', 0] : null); if (!t) return;
      (sh.rects || []).forEach(function (r) { if (ri >= 16) return; Z.rects[ri].set(r.x1, r.z1, r.x2, r.z2); Z.rtype[ri] = PAVING_TYPES[t[0]]; Z.rsoft[ri] = t[1]; ri++; }); });
    var plazaR = (reg && reg.field && reg.field.plaza_radius_m) || 56; Z.circles[ci].set(0, 0, plazaR, PAVING_TYPES.RINGS); Z.csoft[ci] = 0; ci++;
    if (opts.halo) { Z.circles[ci].set(opts.halo.x, opts.halo.z, opts.halo.r || 18, PAVING_TYPES.FINE_RINGS); Z.csoft[ci] = 0; ci++; }
    ((reg && reg.zones) || []).forEach(function (z) { var r = z.rect || z; if (si >= 8 || z.kind !== 'FOREST' || r.x1 === undefined) return; Z.soft[si].set(r.x1, r.z1, r.x2, r.z2); si++; });
    Z.info = { rects: ri, circles: ci, soft: si }; return Z; };
  return Z;
}

export function zonedPaving(THREE, mat, Z, spec) {
  if (!mat || !mat.isMeshStandardMaterial || (PATCHED ? PATCHED.has(mat) : mat.userData.surfaceDetail)) return mat;
  var S = Object.assign({ seam: 0.035, seamDark: 0.7, bevel: 0.26, toneVar: 0.08, roughVar: 0.24, macro: 0.05, grain: 0.06, lod: [28, 120], band: 0.7, tier: 'HIGH' }, spec || {}); var LOW = S.tier === 'LOW';
  var body = ['#include <color_fragment>',
    'vec2 zp = vSdW.xz; float sdDist = length(cameraPosition - vSdW); float sdNear = 1.0 - smoothstep(' + f(S.lod[0]) + ', ' + f(S.lod[1]) + ', sdDist);',
    'float zType = 0.0, zEdge = 1e5, zSoftBase = uZDefSoft; vec2 zC = vec2(0.0);',
    'for (int i = 0; i < 16; i++) { vec4 R = uZR[i]; if (zp.x > R.x && zp.x < R.z && zp.y > R.y && zp.y < R.w) { zType = uZRT[i]; zSoftBase = uZRS[i]; zEdge = min(min(zp.x - R.x, R.z - zp.x), min(zp.y - R.y, R.w - zp.y)); } }',
    'for (int i = 0; i < 6; i++) { vec4 C = uZC[i]; float cr = length(zp - C.xy); if (C.z > 0.0 && cr < C.z) { zType = C.w; zSoftBase = uZCS[i]; zEdge = C.z - cr; zC = C.xy; } }',
    'float sdD; vec2 sdId, sdCC;',
    'if (zType < 0.5) pBond(zp, vec2(3.2, 1.6), 0.5, sdD, sdId, sdCC);',
    'else if (zType < 1.5) { pRings(zp - zC, 1.8, 2.6, sdD, sdId, sdCC); sdCC += zC; }',
    'else if (zType < 2.5) pHex(zp, 1.6, sdD, sdId, sdCC);',
    'else if (zType < 3.5) pDiamond(zp, 2.0, sdD, sdId, sdCC);',
    'else if (zType < 4.5) pTri(zp, 2.6, sdD, sdId, sdCC);',
    'else if (zType < 5.5) pBond(zp, vec2(3.6, 0.6), 0.5, sdD, sdId, sdCC);',
    'else if (zType < 6.5) pBond(zp, vec2(2.4, 2.4), 0.0, sdD, sdId, sdCC);',
    'else if (zType < 7.5) pBond(zp, vec2(0.9, 0.9), 0.5, sdD, sdId, sdCC);',
    'else { pRings(zp - zC, 1.2, 1.8, sdD, sdId, sdCC); sdCC += zC; }',
    'float zBand = 0.0; if (zEdge < ' + f(S.band) + ') { zBand = 1.0; sdD = min(zEdge, ' + f(S.band) + ' - zEdge); sdId = vec2(-7.0, zType); sdCC = zp; }',   /* the threshold course where two families meet */
    'float sdAA = max(fwidth(sdD), 1e-4) * 1.25; float sdSeam = (1.0 - smoothstep(' + f(S.seam * 0.5) + ', ' + f(S.seam * 0.5) + ' + sdAA, sdD)) * sdNear;',
    'float sdH1 = sdHash(sdId + 17.0 + zType * 3.1), sdH2 = sdHash(sdId * 1.7 + 3.1 + zType);',
    'float sdTone = (1.0 + (sdH1 - 0.5) * ' + f(S.toneVar) + ') * mix(1.0, 0.9, zBand); float sdRough = (1.0 + (sdH2 - 0.5) * ' + f(S.roughVar) + ') * mix(1.0, 1.15, zBand);',
    'float zPatch = 0.0;'];
  if (!LOW) body.push(
    'float zSoftRect = 0.0; for (int i = 0; i < 8; i++) { vec4 Sr = uZS[i]; if (Sr.z > Sr.x) { float se = min(min(zp.x - Sr.x, Sr.z - zp.x), min(zp.y - Sr.y, Sr.w - zp.y)); zSoftRect = max(zSoftRect, smoothstep(0.0, 10.0, se)); } }',
    'float zSoft = max(zSoftBase, zSoftRect * 0.85); float zN = sdNoise(zp * 0.07) * 0.7 + sdNoise(zp * 0.23) * 0.3; zPatch = zSoft * smoothstep(0.42, 0.7, zN) * (1.0 - zBand);',
    'sdSeam *= 1.0 - 0.9 * zPatch; sdTone *= 1.0 - 0.08 * zPatch; sdRough *= 1.0 + 0.25 * zPatch;',
    'float sdMacro = sdNoise(zp * 0.045) - 0.5; sdTone *= 1.0 + sdMacro * ' + f(S.macro * 2) + '; sdRough *= 1.0 + sdMacro * ' + f(S.macro * 3) + ';',
    'float sdGrain = sdNoise(zp * 7.3) * 0.6 + sdNoise(zp * 23.0) * 0.4 - 0.5; sdTone *= 1.0 + sdGrain * ' + f(S.grain) + ' * sdNear; sdRough *= 1.0 + sdGrain * ' + f(S.grain * 2.2) + ' * sdNear;');
  body.push('diffuseColor.rgb *= sdTone * mix(1.0, ' + f(S.seamDark) + ', sdSeam);');
  var rough = ['#include <roughnessmap_fragment>', 'roughnessFactor = clamp(mix(roughnessFactor * sdRough, max(roughnessFactor, 0.86), sdSeam), 0.04, 1.0);'];
  var metal = ['#include <metalnessmap_fragment>', 'metalnessFactor *= 1.0 - 0.6 * sdSeam;'];
  var nrm = ['#include <normal_fragment_maps>'];
  if (!LOW && S.bevel > 0) nrm.push('{ vec2 bd = zp - sdCC; float bl = length(bd); if (bl > 1e-4) { float sdK = ' + f(S.bevel) + ' * (1.0 - smoothstep(0.0, ' + f(Math.max(S.seam * 2.5, 0.06)) + ', sdD)) * sdNear * (1.0 - zPatch) * (1.0 - 0.6 * zBand); normal = normalize(normal + sdK * normalize((viewMatrix * vec4(bd.x / bl, 0.0, bd.y / bl, 0.0)).xyz)); } }');
  var prevOBC = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey; var key = 'mahworld-zoned-' + [S.seam, S.seamDark, S.bevel, S.toneVar, S.roughVar, S.macro, S.grain, S.lod.join('x'), S.band, LOW ? 'L' : 'H'].join('_');
  mat.onBeforeCompile = function (sh, r) { if (prevOBC) prevOBC.call(this, sh, r);
    sh.uniforms.uZR = { value: Z.rects }; sh.uniforms.uZRT = { value: Z.rtype }; sh.uniforms.uZRS = { value: Z.rsoft }; sh.uniforms.uZC = { value: Z.circles }; sh.uniforms.uZCS = { value: Z.csoft }; sh.uniforms.uZS = { value: Z.soft }; sh.uniforms.uZDefSoft = Z.defSoft;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSdW; varying vec3 vSdN;').replace('#include <project_vertex>', ['#include <project_vertex>',
      '{ vec4 sdP = vec4(transformed, 1.0); vec3 sdN0 = objectNormal;', '#ifdef USE_INSTANCING', '  sdP = instanceMatrix * sdP; sdN0 = mat3(instanceMatrix) * sdN0;', '#endif', '  vSdW = (modelMatrix * sdP).xyz; vSdN = normalize(mat3(modelMatrix) * sdN0); }'].join('\n'));
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + HELPERS + '\n' + ZONED_FUNCS).replace('#include <color_fragment>', body.join('\n'))
      .replace('#include <roughnessmap_fragment>', rough.join('\n')).replace('#include <metalnessmap_fragment>', metal.join('\n')).replace('#include <normal_fragment_maps>', nrm.join('\n')); };
  mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|' + key; };
  mat.userData.surfaceDetail = { kind: 'ZONED', key: key }; if (PATCHED) PATCHED.add(mat); mat.needsUpdate = true;
  return mat;
}
