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
  FACADE_PLAIN: { kind: 'PANELS', cell: [1.8, 1.2], seam: 0.024, seamDark: 0.66, bevel: 0.3, toneVar: 0.08, roughVar: 0.3, macro: 0.05, grain: 0.035, lod: [30, 140], metalSeam: 0.5 },   /* M8E: platinum skin between real windows (the storey band now comes from the slab edges) */
  COMPOSITE: { kind: 'PANELS', cell: [3.0, 1.2], seam: 0.018, seamDark: 0.7, bevel: 0.22, toneVar: 0.06, roughVar: 0.18, macro: 0.04, grain: 0.025, stagger: 0.5, lod: [30, 140], metalSeam: 0.3 },   /* M8E: neutral architectural composite rainscreen, staggered long panels */
  CLADDING: { kind: 'PANELS', cell: [2.4, 1.2], seam: 0.02, seamDark: 0.6, bevel: 0.25, toneVar: 0.1, roughVar: 0.22, macro: 0.06, grain: 0.08, stagger: 0.5, lod: [30, 140], metalSeam: 0.3 },   /* M8E: honed stone cladding for heavy bases */
  MONOLITH: { kind: 'PANELS', cell: [2.5, 3.6], seam: 0.016, seamDark: 0.35, bevel: 0.14, toneVar: 0.3, roughVar: 0.95, macro: 0.05, grain: 0.02, lod: [30, 160], metalSeam: 0.2 },   /* M9: large-format satin black cladding (MAH MATCH): 2.5 m panels on its light-line rhythm, 3.6 m courses */
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
    /* M8C NATURAL GROUND: inside forest / garden zones and the ecology-leaning districts the paving DISSOLVES — tiles drop out one by one
       along a noisy boundary (a sunken gap edge where each one is missing) until the ground is grown: dark loam with clods, pebbles and a
       sparse crystal grit (the region tint colours it), fully matte, lit through its own bump. Hardscape stays constructed; nature stays grown. */
    'float zNat0 = zSoftRect * 1.05 + (zSoftBase - 0.2) * 0.6 * step(0.3, zSoftBase); float zNat = clamp(zNat0 + (geoFbm(zp * 0.045) - 0.5) * 0.9 * smoothstep(0.03, 0.3, zNat0), 0.0, 1.0) * (1.0 - zBand);',   /* the noise only shapes the edge of a natural zone: plain hardscape never loses slabs */
    'float zGone = step(sdH2, zNat * 1.2 - 0.12); float zNatK = max(zGone, smoothstep(0.82, 0.97, zNat));',
    'float zGH = geoFbm(zp * 0.42) * 0.6 + geoN(zp * 2.6) * 0.3 + step(0.93, sdHash(floor(zp * 2.2))) * 0.35; float zGrit = step(0.994, sdHash(floor(zp * 7.0) + 3.3)) * zNatK;',
    'float zGap = zGone * (1.0 - smoothstep(0.0, 0.12, sdD)) * (1.0 - smoothstep(0.82, 0.97, zNat));',   /* the broken edge of the paving around a missing tile */
    'sdSeam = mix(sdSeam, 0.0, zNatK); sdTone = mix(sdTone, (0.46 + 0.2 * zGH) * (1.0 + zGrit * 1.4), zNatK) * (1.0 - zGap * 0.45); sdRough = mix(sdRough, 1.35 * (1.0 - zGrit * 0.6), zNatK);',
    'float sdMacro = sdNoise(zp * 0.045) - 0.5; sdTone *= 1.0 + sdMacro * ' + f(S.macro * 2) + '; sdRough *= 1.0 + sdMacro * ' + f(S.macro * 3) + ';',
    'float sdGrain = sdNoise(zp * 7.3) * 0.6 + sdNoise(zp * 23.0) * 0.4 - 0.5; sdTone *= 1.0 + sdGrain * ' + f(S.grain) + ' * sdNear; sdRough *= 1.0 + sdGrain * ' + f(S.grain * 2.2) + ' * sdNear;');
  body.push('diffuseColor.rgb *= sdTone * mix(1.0, ' + f(S.seamDark) + ', sdSeam);');
  var rough = ['#include <roughnessmap_fragment>', 'roughnessFactor = clamp(mix(roughnessFactor * sdRough, max(roughnessFactor, 0.86), sdSeam), 0.04, 1.0);'];
  var metal = ['#include <metalnessmap_fragment>', 'metalnessFactor *= 1.0 - 0.6 * sdSeam;' + (LOW ? '' : ' metalnessFactor = mix(metalnessFactor, 0.02, zNatK);')];
  var nrm = ['#include <normal_fragment_maps>'];
  if (!LOW) nrm.push('if (zNatK > 0.01) normal = normalize(mix(normal, geoBump(-vViewPosition, normal, (zGH * 0.5 - zGap * 0.2) * sdNear), zNatK));');
  if (!LOW && S.bevel > 0) nrm.push('{ vec2 bd = zp - sdCC; float bl = length(bd); if (bl > 1e-4) { float sdK = ' + f(S.bevel) + ' * (1.0 - smoothstep(0.0, ' + f(Math.max(S.seam * 2.5, 0.06)) + ', sdD)) * sdNear * (1.0 - zPatch) * (1.0 - 0.6 * zBand) * (1.0 - zNatK); normal = normalize(normal + sdK * normalize((viewMatrix * vec4(bd.x / bl, 0.0, bd.y / bl, 0.0)).xyz)); } }');
  var prevOBC = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey; var key = 'mahworld-zoned-m8c-' + [S.seam, S.seamDark, S.bevel, S.toneVar, S.roughVar, S.macro, S.grain, S.lod.join('x'), S.band, LOW ? 'L' : 'H'].join('_');
  mat.onBeforeCompile = function (sh, r) { if (prevOBC) prevOBC.call(this, sh, r);
    sh.uniforms.uZR = { value: Z.rects }; sh.uniforms.uZRT = { value: Z.rtype }; sh.uniforms.uZRS = { value: Z.rsoft }; sh.uniforms.uZC = { value: Z.circles }; sh.uniforms.uZCS = { value: Z.csoft }; sh.uniforms.uZS = { value: Z.soft }; sh.uniforms.uZDefSoft = Z.defSoft;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSdW; varying vec3 vSdN;').replace('#include <project_vertex>', ['#include <project_vertex>',
      '{ vec4 sdP = vec4(transformed, 1.0); vec3 sdN0 = objectNormal;', '#ifdef USE_INSTANCING', '  sdP = instanceMatrix * sdP; sdN0 = mat3(instanceMatrix) * sdN0;', '#endif', '  vSdW = (modelMatrix * sdP).xyz; vSdN = normalize(mat3(modelMatrix) * sdN0); }'].join('\n'));
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + HELPERS + '\n' + GEO_FUNCS + '\n' + ZONED_FUNCS).replace('#include <color_fragment>', body.join('\n'))
      .replace('#include <roughnessmap_fragment>', rough.join('\n')).replace('#include <metalnessmap_fragment>', metal.join('\n')).replace('#include <normal_fragment_maps>', nrm.join('\n')); };
  mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|' + key; };
  mat.userData.surfaceDetail = { kind: 'ZONED', key: key }; if (PATCHED) PATCHED.add(mat); mat.needsUpdate = true;
  return mat;
}

/* ---------------------------------------------------------------------------------------------------------------------------------------
   M8C GEOLOGY — the reusable rock material pipeline (ridges, cliffs, far massifs, rocky terrain). World-space, shader-only, so the
   collision surface never moves (the ridge inner face IS the owner OP10 collision plane). One height field drives both value and light:
     STRATA    irregular sedimentary bands (warped, variable thickness) with thin dark bedding lines and per-band tone / roughness;
     LEDGES    some band boundaries become ledges: a lit lip above, a shadowed undercut below;
     FRACTURES vertical joint network (Voronoi on the face plane, stretched vertically) — dark, rough, pinched into the surface;
     CLEFTS    deep vertical gullies at the 30–60 m scale — the shadowed recesses that break a big face into buttresses;
     MACRO / MICRO tonal variation at ~250 m and grain at 0.3–1 m;
   lighting: the combined height is turned into a bumped normal through screen-space derivatives (no tangents, no textures), so every
   ledge, joint and cleft catches the Sun; unlit variants (the far massifs) take the same field as value only. Value / roughness only. */
var GEO_FUNCS = [
  'float geoN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(sdHash(i), sdHash(i + vec2(1.0, 0.0)), f.x), mix(sdHash(i + vec2(0.0, 1.0)), sdHash(i + vec2(1.0, 1.0)), f.x), f.y); }',
  'float geoFbm(vec2 p) { return geoN(p) * 0.55 + geoN(p * 2.07 + 13.1) * 0.3 + geoN(p * 4.3 - 7.7) * 0.15; }',
  'vec2 geoVor(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 o = vec2(sdHash(i + g), sdHash(i + g + 31.7)); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } return vec2(d1, d2); }',
  'vec3 geoBump(vec3 sp, vec3 sn, float h) { vec3 sx = dFdx(sp), sy = dFdy(sp); vec3 r1 = cross(sy, sn), r2 = cross(sn, sx); float det = dot(sx, r1); vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2); return normalize(abs(det) * sn - grad); }'
].join('\n');

export function applyGeology(THREE, mat, spec) {
  if (!mat || (PATCHED ? PATCHED.has(mat) : (mat.userData && mat.userData.surfaceDetail))) return mat;
  var S = Object.assign({ snowY: 1e5, strata: 2.6, major: 0, ledge: 0.32, joint: 4.5, fracture: 1, cleft: 1, macro: 0.16, grain: 0.07, bump: 1, lit: true, tier: 'HIGH', lod: [60, 900], bumpLod: [40, 260], relief: null }, spec || {});
  var LOW = S.tier === 'LOW', lit = S.lit && !!mat.isMeshStandardMaterial, MAJ = S.major || S.strata * 3.2;
  /* v2 (M8C iteration 2): the first cut read as a crazed-glaze web (an isotropic Voronoi everywhere) with dotted "stitching" where thin ledge
     lips went through the derivative bump. Rock now reads in three orders, each only where it can resolve: MAJOR BEDS (≈ 8 m: value zoning
     and ledges — a lit lip above a ledge boundary, a shadowed undercut below it), MINOR BEDS (the bedding lines) with JOINTS that stop at the
     bedding planes and step from bed to bed (blocky jointing), and sparse long near-vertical MASTER FRACTURES. Only smooth fields (ledges,
     clefts, grain) enter the bump; the thin lines are value / roughness. */
  var body = ['#include <color_fragment>',
    'vec3 gAn = abs(normalize(cross(dFdx(vSdW), dFdy(vSdW)))); vec2 gUV = gAn.x > gAn.z ? vec2(vSdW.z, vSdW.y) : vec2(vSdW.x, vSdW.y);',   /* the face plane (from derivatives: works on flat-shaded and normal-less geometry): along-face horizontal × height */
    'float gDist = length(cameraPosition - vSdW); float gNear = 1.0 - smoothstep(' + f(S.lod[0]) + ', ' + f(S.lod[1]) + ', gDist);',
    'float gWarp = geoFbm(vSdW.xz * 0.012) * 7.0 + geoFbm(vec2(gUV.x * 0.03, vSdW.y * 0.01)) * 2.0;',
    'float gYM = (vSdW.y + gWarp) / ' + f(MAJ) + '; float gBM = floor(gYM), gFM = fract(gYM); float gHM = sdHash(vec2(gBM, 7.3)); float gPx = max(fwidth(gYM) * ' + f(MAJ) + ', 1e-3);',   /* metres per pixel up the face */
    'float gTop = (1.0 - gFM) * ' + f(MAJ) + ', gBot = gFM * ' + f(MAJ) + '; float gLk = clamp(0.9 / gPx, 0.0, 1.0);',
    'float gLip = step(' + f(1 - S.ledge) + ', gHM) * (1.0 - smoothstep(0.0, 0.9, gBot)) * gLk;',   /* this bed juts out over a ledge boundary at its base: a rounded, lit lip */
    'float gUnder = step(' + f(1 - S.ledge) + ', sdHash(vec2(gBM + 1.0, 7.3))) * (1.0 - smoothstep(0.0, 1.8, gTop)) * gLk;',   /* ... and the bed below it sits in the undercut shadow */
    'float gYm = (vSdW.y + gWarp) / ' + f(S.strata) + '; float gBm = floor(gYm), gFm = fract(gYm); float gHm = sdHash(vec2(gBm, 2.9));',
    'float gFw = fwidth(gYm); float gBedW = max(0.035, gFw * 1.5); float gBed = (1.0 - smoothstep(0.0, gBedW, min(gFm, 1.0 - gFm))) * clamp(0.035 / gBedW, 0.0, 1.0);',   /* footprint AA: a bedding line thinner than a pixel fades instead of aliasing */
    'float gRw = max(0.15, gPx * 1.5); float gH = gLip * smoothstep(0.0, gRw, gBot) * 0.55 - gUnder * smoothstep(0.0, gRw, gTop) * 0.7;',   /* the height meets 0 at the ledge boundary (a hard step there made the derivative bump sparkle in dotted lines) */
    'float gTone = 1.0 + (gHM - 0.5) * 0.26 + (gHm - 0.5) * 0.08 - gBed * 0.2 + gLip * 0.12 - gUnder * 0.36;',
    'float gRough = 1.0 + (sdHash(vec2(gBm, 2.1)) - 0.5) * 0.2 - gLip * 0.08;'];
  if (!LOW) body.push(
    'float gJx = (gUV.x + (geoN(vec2(gUV.x * 0.15, gBm * 1.7)) - 0.5) * 2.2) / ' + f(S.joint) + ' + sdHash(vec2(gBm, 1.3)) * 7.0; float gJd = min(fract(gJx), 1.0 - fract(gJx)) * ' + f(S.joint) + ';',
    'float gJw = max(0.05, fwidth(gJd) * 1.5); float gJoint = (1.0 - smoothstep(0.0, gJw, gJd)) * clamp(0.05 / gJw, 0.0, 1.0) * step(0.35, sdHash(vec2(floor(gJx), gBm + 0.5)));',   /* joints end at the bedding planes and step bed to bed */
    'vec2 gV = geoVor(vec2(gUV.x * 0.05, vSdW.y * 0.009) + gWarp * 0.01); float gCd = gV.y - gV.x; float gCw = max(0.05, fwidth(gCd) * 1.5); float gCrack = (1.0 - smoothstep(0.0, gCw, gCd)) * clamp(0.05 / gCw, 0.0, 1.0) * smoothstep(0.42, 0.62, geoN(vec2(gUV.x * 0.021, vSdW.y * 0.006) + 5.3)) * ' + f(S.fracture) + ';',   /* sparse master fractures: long, near-vertical */
    'float gCl = geoN(vec2(gUV.x * 0.028, 3.7)) * 0.7 + geoN(vec2(gUV.x * 0.07, vSdW.y * 0.004)) * 0.3; float gCleft = pow(smoothstep(0.55, 0.95, gCl), 2.0) * ' + f(S.cleft) + ';',
    'float gGrain = (geoN(gUV * 1.1) * 0.6 + geoN(gUV * 3.3) * 0.4 - 0.5) * gNear;',
    'gH += -gCleft * 1.6 + gGrain * 0.35; gTone *= (1.0 - gJoint * 0.34) * (1.0 - gCrack * 0.38) * (1.0 - gCleft * 0.42) * (1.0 + gGrain * ' + f(S.grain * 2) + '); gRough *= 1.0 + gJoint * 0.12 + gCrack * 0.12 + gCleft * 0.08 + gGrain * 0.1;');
  body.push('float gMacro = geoFbm(vSdW.xz * 0.004 + vec2(vSdW.y * 0.002)) - 0.5; gTone *= 1.0 + gMacro * ' + f(S.macro * 2) + ';');
  /* M9 MACRO RELIEF (spec.relief = [amplitude m, width m]): the rock MASS — fall-line gullies and buttress ribs 10–40 m across, stretched down
     the slope and ridged, entering the bump at mountain distances (they are what a large face shows from the plaza). With smooth-shaded
     geometry this replaces the hard low-poly facet edges with continuous, believable relief; the gullies also carry a darker value. */
  var RU = S.reliefPolar ? 'atan(vSdW.x - ' + f(S.reliefPolar[0]) + ', vSdW.z - ' + f(S.reliefPolar[1]) + ') * ' + f(S.reliefPolar[2]) : 'gUV.x';   /* polar bearing (ring features): continuous across faces — the per-face projection jumps at every edge; the ±π wrap sits due south (the open sea, no ridge) */
  if (S.relief) body.push('vec2 gRp = vec2((' + RU + ') / ' + f(S.relief[1]) + ', vSdW.y / ' + f(S.relief[1] * 2.6) + ') + vec2(gWarp * 0.02, 0.0); float gRn = geoFbm(gRp); float gRr = 1.0 - abs(2.0 * geoFbm(gRp * vec2(1.7, 0.8) + 3.1) - 1.0);',
    'float gRelief = (gRn * 0.55 + gRr * 0.45 - 0.5) * ' + f(S.relief[0]) + '; gTone *= 1.0 + (gRn - 0.5) * 0.34 + (gRr - 0.5) * 0.12;');
  else body.push('float gRelief = 0.0;');
  if (S.snowY < 1e4) body.push('float gUp = gAn.y; float gSnow = smoothstep(0.55, 0.8, gUp + gLip * 0.25) * smoothstep(' + f(S.snowY - 18) + ', ' + f(S.snowY + 14) + ', vSdW.y + (geoFbm(vSdW.xz * 0.02) - 0.5) * 36.0);');
  else body.push('float gSnow = 0.0;');
  body.push('diffuseColor.rgb *= mix(gTone, 1.0, gSnow * 0.9);', 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 0.97) * diffuse, gSnow * 0.88);');
  var frag = function (fs) {
    fs = fs.replace('#include <common>', '#include <common>\n' + HELPERS + '\n' + GEO_FUNCS).replace('#include <color_fragment>', body.join('\n'));
    if (lit) { fs = fs.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(mix(roughnessFactor * gRough, 0.55, gSnow), 0.3, 1.0);');
      if (!LOW && S.bump > 0) fs = fs.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = geoBump(-vViewPosition, normal, gH * ' + f(S.bump) + ' * (1.0 - smoothstep(' + f(S.bumpLod[0]) + ', ' + f(S.bumpLod[1]) + ', gDist)) + gRelief * (1.0 - smoothstep(700.0, 1500.0, gDist)));'); }
    return fs; };
  var prevOBC = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey; var key = 'mahworld-geo-' + [S.snowY < 1e4 ? Math.round(S.snowY) : 'x', S.strata, S.ledge, S.fracture, S.cleft, S.macro, S.grain, S.bump, lit ? 'L' : 'U', LOW ? 'lo' : 'hi', S.lod.join('x'), S.bumpLod.join('x'), MAJ, S.joint, S.relief ? 'r' + S.relief.join('x') + (S.reliefPolar ? 'p' + S.reliefPolar.join('x') : '') : 'r0', 'v2b'].join('_');
  mat.onBeforeCompile = function (sh, r) { if (prevOBC) prevOBC.call(this, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSdW; varying vec3 vSdN;').replace('#include <project_vertex>', ['#include <project_vertex>',
      '{ vec4 sdP = vec4(transformed, 1.0);', '#ifdef USE_INSTANCING', '  sdP = instanceMatrix * sdP;', '#endif', '  vSdW = (modelMatrix * sdP).xyz; vSdN = vec3(0.0, 1.0, 0.0); }'].join('\n'));
    sh.fragmentShader = frag(sh.fragmentShader); };
  mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|' + key; };
  mat.userData.surfaceDetail = { kind: 'GEOLOGY', key: key }; if (PATCHED) PATCHED.add(mat); mat.needsUpdate = true;
  return mat;
}

/* M8C · CRYSTAL — the MAHWORLD crystal family (class shards, crowns, roof diamonds). A cut stone is not one flat value: each facet sits at
   its own angle to the light and the eye, the body looks deep face-on and bright at grazing (Fresnel), and faint internal fracture planes
   catch light inside it. Per-facet tone / roughness from the facet's world orientation (derivatives: flat-shaded and merged geometry work),
   a face-on depth darkening with a bright grazing rim, and sparse inclusion planes. Value / roughness only — the class hue is untouched. */
export function applyCrystal(THREE, mat, spec) {
  if (!mat || !mat.isMeshStandardMaterial || (PATCHED ? PATCHED.has(mat) : (mat.userData && mat.userData.surfaceDetail))) return mat;
  var S = Object.assign({ facet: 0.34, depth: 0.3, rim: 0.4, veins: 0.12, tier: 'HIGH' }, spec || {}); var LOW = S.tier === 'LOW';
  var body = ['#include <color_fragment>',
    'vec3 cN = normalize(cross(dFdx(vSdW), dFdy(vSdW))); vec3 cV = normalize(cameraPosition - vSdW); float cFr = pow(1.0 - clamp(abs(dot(cN, cV)), 0.0, 1.0), 3.0);',
    'float cF = sdHash(floor(cN.xz * 5.0 + cN.y * 3.0) + 0.37);',   /* facet id from its orientation: every cut plane keeps its own value */
    'float cTone = (1.0 + (cF - 0.5) * ' + f(S.facet) + ') * (1.0 - ' + f(S.depth) + ' * (1.0 - cFr)) + cFr * ' + f(S.rim) + ';'];
  if (!LOW && S.veins > 0) body.push('float cVp = dot(vSdW, normalize(vec3(0.62, 1.0, 0.41))) * 1.7; float cVw = max(fwidth(cVp), 1e-3) * 1.5; float cVd = 0.5 - abs(fract(cVp) - 0.5); float cVein = (1.0 - smoothstep(0.0, cVw + 0.02, cVd)) * clamp(0.05 / (cVw + 0.03), 0.0, 1.0) * step(0.62, sdHash(vec2(floor(cVp + 0.5), 4.1))); cTone *= 1.0 + cVein * ' + f(S.veins) + ';');
  body.push('diffuseColor.rgb *= cTone;');
  var rough = '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * (0.55 + 0.9 * cF), 0.03, 0.45);';
  var prevOBC = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey; var key = 'mahworld-crystal-' + [S.facet, S.depth, S.rim, S.veins, LOW ? 'lo' : 'hi'].join('_');
  mat.onBeforeCompile = function (sh, r) { if (prevOBC) prevOBC.call(this, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSdW;').replace('#include <project_vertex>', ['#include <project_vertex>',
      '{ vec4 sdP = vec4(transformed, 1.0);', '#ifdef USE_INSTANCING', '  sdP = instanceMatrix * sdP;', '#endif', '  vSdW = (modelMatrix * sdP).xyz; }'].join('\n'));
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vSdW;\n' + HELPERS.split('\n').slice(1).join('\n')).replace('#include <color_fragment>', body.join('\n')).replace('#include <roughnessmap_fragment>', rough); };
  mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|' + key; };
  mat.userData.surfaceDetail = { kind: 'CRYSTAL', key: key }; if (PATCHED) PATCHED.add(mat); mat.needsUpdate = true;
  return mat;
}

/* M11 RADIAL DECK (owner: the HALO floor must stop reading as one giant smooth disc — radial planning, ring construction, multiple surface
   families, inset panels, ring seams, structural joints, drainage seams). A circular floor is laid out in polar coordinates about its
   centre: concentric ZONES, each its own surface FAMILY (tone, roughness, metalness, grain) and its own paving — rings of a set width cut
   into panels of a set arc length (odd rings staggered). Every panel carries a hashed tone / roughness offset (reflections vary panel to
   panel); joints are recessed (darker, rougher, a chamfer that tilts the normal toward the joint). Zone boundaries get a brushed-metal
   INLAY seam; chosen boundaries a SLOT DRAIN (dark slot, grating bars); chosen boundaries a fake STEP (a lit arris on the inner edge and a
   shadow line on the outer) so the plan reads as layered platforms while the walkable surface stays exactly flat. Shader only: no
   geometry, no draw, no texture. zones: [{ r0, r1, ring, arc, stagger, tone, rough, metal, grain, joint }], seams: [{ r, kind:
   'INLAY'|'DRAIN'|'STEP', w }]. Tier LOW keeps the panels and seams but drops the chamfer normals and grain. */
export function applyRadialDeck(THREE, mat, o) {
  if (!mat || !mat.isMeshStandardMaterial || mat.userData.radialDeck) return mat;
  var LOW = o.tier === 'LOW', Z = o.zones || [], SE = o.seams || [], lod = o.lod || [40, 170];
  var zoneCode = Z.map(function (z, i) { return (i ? 'else ' : '') + 'if (rdR < ' + f(z.r1) + ') { rdZ0 = ' + f(z.r0) + '; rdZ1 = ' + f(z.r1) + '; rdRW = ' + f(z.ring) + '; rdArc = ' + f(z.arc) + '; rdSt = ' + f(z.stagger || 0) + '; rdFam = vec4(' + f(z.tone) + ', ' + f(z.rough) + ', ' + f(z.metal) + ', ' + f(z.grain || 0) + '); rdJW = ' + f(z.joint || 0.02) + '; rdZi = ' + f(i) + '; }'; }).join('\n');
  var seamCode = SE.map(function (s) { var d = 'abs(rdR - ' + f(s.r) + ')', w = f((s.w || 0.1) * 0.5);
    if (s.kind === 'DRAIN') return '{ float d = ' + d + '; float k = 1.0 - smoothstep(' + w + ', ' + w + ' + rdAAr, d); float bar = step(0.5, fract(rdTh * ' + f(s.r) + ' * 9.0)); rdDrain = max(rdDrain, k); rdBar = max(rdBar, k * bar); }';
    if (s.kind === 'STEP') return '{ float d = rdR - ' + f(s.r) + '; float lit = (1.0 - smoothstep(0.0, ' + w + ' + rdAAr, -d)) * step(d, 0.0); float sh = (1.0 - smoothstep(0.0, ' + w + ' * 2.0 + rdAAr, d)) * step(0.0, d); rdStepLit = max(rdStepLit, lit); rdStepSh = max(rdStepSh, sh); }';
    return '{ float d = ' + d + '; rdInlay = max(rdInlay, 1.0 - smoothstep(' + w + ', ' + w + ' + rdAAr, d)); }'; }).join('\n');
  var body = [
    '#include <color_fragment>',
    'vec2 rdP = vSdW.xz - vec2(' + f(o.cx) + ', ' + f(o.cz) + '); float rdR = length(rdP); float rdTh = atan(rdP.y, rdP.x) / 6.2831853 + 0.5;',
    'float rdNear = 1.0 - smoothstep(' + f(lod[0]) + ', ' + f(lod[1]) + ', length(cameraPosition - vSdW)); float rdAAr = max(fwidth(rdR), 1e-4) * 1.25;',
    'float rdZ0 = 0.0, rdZ1 = 1e6, rdRW = 3.0, rdArc = 3.0, rdSt = 0.0, rdJW = 0.02, rdZi = 99.0; vec4 rdFam = vec4(1.0, 1.0, 1.0, 0.0);',
    zoneCode,
    'float rdRR = (rdR - rdZ0) / rdRW; float rdRing = floor(rdRR); float rdFr = fract(rdRR); float rdRc = rdZ0 + (rdRing + 0.5) * rdRW;',
    'float rdN = max(6.0, floor(6.2831853 * rdRc / rdArc + 0.5)); float rdA = rdTh * rdN + rdSt * mod(rdRing, 2.0); float rdSeg = floor(rdA); float rdFa = fract(rdA);',
    'float rdDR = min(rdFr, 1.0 - rdFr) * rdRW; float rdDA = min(rdFa, 1.0 - rdFa) * 6.2831853 * rdRc / rdN; float rdD = min(rdDR, rdDA);',
    'float rdAA = max(fwidth(rdD), 1e-4) * 1.25; float rdJ = (1.0 - smoothstep(rdJW * 0.5, rdJW * 0.5 + rdAA, rdD)) * rdNear;',
    'vec2 rdId = vec2(rdRing + rdZi * 37.0, rdSeg); float rdH1 = sdHash(rdId + 11.0), rdH2 = sdHash(rdId * 1.37 + 5.3);',
    'float rdTone = rdFam.x * (1.0 + (rdH1 - 0.5) * 0.11) * (mod(rdRing, 4.0) > 2.5 ? 0.92 : 1.0), rdRough = rdFam.y * (1.0 + (rdH2 - 0.5) * 0.32);',   /* every fourth ring a darker accent course */
    LOW ? '' : 'float rdGr = (sdNoise(vSdW.xz * 6.1) * 0.6 + sdNoise(vSdW.xz * 19.0) * 0.4 - 0.5) * rdFam.w * rdNear; rdTone *= 1.0 + rdGr; rdRough *= 1.0 + rdGr * 1.8;',
    'float rdInlay = 0.0, rdDrain = 0.0, rdBar = 0.0, rdStepLit = 0.0, rdStepSh = 0.0;',
    seamCode,
    'rdInlay *= rdNear * 0.85 + 0.15; rdDrain *= rdNear * 0.8 + 0.2; rdBar *= rdNear;',
    'diffuseColor.rgb *= rdTone * mix(1.0, 0.62, rdJ) * mix(1.0, 0.72, rdStepSh) * (1.0 + 0.16 * rdStepLit);',
    'diffuseColor.rgb *= (1.0 + 0.22 * rdInlay) * mix(1.0, mix(0.1, 0.55, rdBar), rdDrain);'   /* value only (colour law): the inlay reads as metal through its metalness, the drain as a dark slot with lit grating bars */
  ];
  var rough = ['#include <roughnessmap_fragment>', 'roughnessFactor = clamp(mix(mix(roughnessFactor * rdRough, 0.9, rdJ), 0.3, rdInlay), 0.05, 1.0); roughnessFactor = mix(roughnessFactor, 0.85, rdDrain * (1.0 - rdBar));'];
  var metal = ['#include <metalnessmap_fragment>', 'metalnessFactor = mix(mix(metalnessFactor * (rdFam.z / max(' + f(o.baseMetal || 0.2) + ', 0.01)), 0.0, rdJ * 0.6), 0.85, max(rdInlay, rdBar));'];
  var nrm = ['#include <normal_fragment_maps>'];
  if (!LOW) nrm.push('{ float bw = max(rdJW * 2.5, 0.05); float k = 0.22 * (1.0 - smoothstep(0.0, bw, rdD)) * rdNear; vec2 rad = rdP / max(rdR, 1e-3); vec2 tan2 = vec2(-rad.y, rad.x);',
    '  vec2 dir2 = rdDR < rdDA ? rad * (rdFr < 0.5 ? -1.0 : 1.0) : tan2 * (rdFa < 0.5 ? -1.0 : 1.0); normal = normalize(normal + k * normalize((viewMatrix * vec4(dir2.x, 0.0, dir2.y, 0.0)).xyz));',
    '  float sk = 0.5 * (rdStepLit - rdStepSh) * rdNear; normal = normalize(normal + sk * normalize((viewMatrix * vec4(-rad.x, 0.0, -rad.y, 0.0)).xyz)); }');
  var prevOBC = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey, key = 'mahworld-radial-deck-' + (LOW ? 'L' : 'H') + '-' + JSON.stringify([o.cx, o.cz, Z, SE, lod]).length;
  mat.onBeforeCompile = function (sh, r) { if (prevOBC) prevOBC.call(this, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSdW; varying vec3 vSdN;').replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 sdP = vec4(transformed, 1.0); vSdW = (modelMatrix * sdP).xyz; vSdN = normalize(mat3(modelMatrix) * objectNormal); }');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + HELPERS).replace('#include <color_fragment>', body.join('\n'))
      .replace('#include <roughnessmap_fragment>', rough.join('\n')).replace('#include <metalnessmap_fragment>', metal.join('\n')).replace('#include <normal_fragment_maps>', nrm.join('\n')); };
  mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|' + key; };
  mat.userData.radialDeck = { zones: Z.length, seams: SE.length, tier: LOW ? 'LOW' : 'HIGH' }; mat.needsUpdate = true; return mat;
}
