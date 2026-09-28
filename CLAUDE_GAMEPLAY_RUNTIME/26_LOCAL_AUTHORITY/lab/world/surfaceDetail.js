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

/* M20 (owner 2026-09-27, materials: "normal / detail information … micro surface breakup … edge response"): a derivative bump for the
   families' micro relief (orange-peel on lacquered panels, a honed grain on stone / cladding / kerbs, a fine aggregate on pavers). Screen
   derivatives of a SMOOTH world-space field only (no per-pixel hash: that sparkles), faded out by 22 m, never on LOW. */
var SD_MICRO = 'vec3 sdMicroBump(vec3 sp, vec3 sn, float h) { vec3 sx = dFdx(sp), sy = dFdy(sp); vec3 r1 = cross(sy, sn), r2 = cross(sn, sx); float det = dot(sx, r1); vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2); return normalize(abs(det) * sn - grad); }';

var PATCHED = typeof WeakSet !== 'undefined' ? new WeakSet() : null;   /* patched materials (a clone copies userData but not the patch, so it may be patched on its own) */
function f(v) { v = +v; return (Math.round(v * 10000) / 10000).toFixed(4); }

/* spec: { kind, cell: [u, v] m, seam: m, seamDark, bevel, toneVar, roughVar, macro, grain, band: [every m, height m], bandTone, stagger, lod: [near, far] m, tier,
   foot: [height m, depth] (M20: contact darkening at the foot of vertical faces), micro: [frequency /m, relief m] (M20: micro normal relief) } */
export function surfaceDetail(THREE, mat, spec) {
  if (!mat || !mat.isMeshStandardMaterial || (PATCHED ? PATCHED.has(mat) : mat.userData.surfaceDetail)) return mat;
  var S = Object.assign({ kind: 'PANELS', cell: [1.8, 1.2], seam: 0.03, seamDark: 0.6, bevel: 0.35, toneVar: 0.06, roughVar: 0.22, macro: 0.05, grain: 0.05, band: null, bandTone: 0.82, stagger: 0, lod: [30, 140], tier: 'HIGH', metalSeam: 0.5, seamless: false, foot: null, micro: null, glass: 0 }, spec || {});
  var LOW = S.tier === 'LOW'; var K = S.kind;
  var body = [
    '#include <color_fragment>',
    'vec3 sdAn = abs(normalize(vSdN)); vec2 sdUV; vec3 sdTU, sdTV; bool sdFloor = sdAn.y > sdAn.x && sdAn.y > sdAn.z;',
    'if (sdFloor) { sdUV = vSdW.xz; sdTU = vec3(1.0, 0.0, 0.0); sdTV = vec3(0.0, 0.0, 1.0); } else if (sdAn.x > sdAn.z) { sdUV = vec2(vSdW.z, vSdW.y); sdTU = vec3(0.0, 0.0, 1.0); sdTV = vec3(0.0, 1.0, 0.0); } else { sdUV = vec2(vSdW.x, vSdW.y); sdTU = vec3(1.0, 0.0, 0.0); sdTV = vec3(0.0, 1.0, 0.0); }',
    'float sdDist = length(cameraPosition - vSdW); float sdNear = 1.0 - smoothstep(' + f(S.lod[0]) + ', ' + f(S.lod[1]) + ', sdDist);',
    'vec2 sdCell = vec2(' + f(S.cell[0]) + ', ' + f(S.cell[1]) + '); if (sdFloor && ' + (K === 'PANELS' ? 'true' : 'false') + ') sdCell = vec2(sdCell.x);',
    'vec2 sdG = sdUV / sdCell; float sdRow = floor(sdG.y); sdG.x += ' + f(S.stagger) + ' * mod(sdRow, 2.0);',
    'vec2 sdId = floor(sdG), sdF = fract(sdG); vec2 sdE = min(sdF, 1.0 - sdF) * sdCell; float sdD = min(sdE.x, sdE.y);',
    'float sdAA = max(fwidth(sdD), 1e-4) * 1.25; float sdSeam = (1.0 - smoothstep(' + f(S.seam * 0.5) + ', ' + f(S.seam * 0.5) + ' + sdAA, sdD)) * sdNear * clamp(' + f(S.seam) + ' / sdAA, 0.0, 1.0);',   /* M11: a seam finer than the pixel footprint fades to its coverage instead of aliasing at grazing view */
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
  if (!LOW && S.foot) body.push('if (!sdFloor) { float sdFt = (1.0 - smoothstep(0.0, ' + f(S.foot[0]) + ', vSdW.y)) * step(-0.35, vSdW.y); sdTone *= 1.0 - ' + f(S.foot[1]) + ' * sdFt * sdFt; }');   /* M20: the lowest metre or two of a wall sees less sky and more floor — a soft contact darkening at the foot (ground level, world y ≈ 0: the plaza and district floor) */
  if (!LOW && S.glass > 0) body.push('float sdFr = pow(1.0 - clamp(abs(dot(normalize(vSdN), normalize(cameraPosition - vSdW))), 0.0, 1.0), 3.0); sdTone *= mix(' + f(1 - S.glass * 0.25) + ', 1.0, sdFr);');   /* M20 glass depth: head-on the pane reads into the (darker) interior, at a grazing angle it turns to sky reflection */
  if (S.band) body.push('if (!sdFloor) { float sdBy = mod(vSdW.y, ' + f(S.band[0]) + '); float sdBand = smoothstep(' + f(S.band[0] - S.band[1]) + ' - sdAA, ' + f(S.band[0] - S.band[1]) + ', sdBy); sdTone *= mix(1.0, ' + f(S.bandTone) + ', sdBand); sdRough *= mix(1.0, 0.72, sdBand); }');
  body.push('diffuseColor.rgb *= sdTone * mix(1.0, ' + f(S.seamDark) + ', sdSeam);');
  var rough = ['#include <roughnessmap_fragment>', 'roughnessFactor = clamp(mix(roughnessFactor * sdRough, max(roughnessFactor, 0.86), sdSeam), 0.04, 1.0);'];
  var metal = ['#include <metalnessmap_fragment>', 'metalnessFactor *= 1.0 - ' + f(S.metalSeam) + ' * sdSeam;'];
  if (!LOW && S.glass > 0) metal.push('metalnessFactor *= mix(' + f(1 - S.glass) + ', 1.0, sdFr);');   /* a metal-tinted pane mirrors the sky equally at every angle (a flat pale sheet): its reflection now follows the Fresnel of real glass */
  var coat = ['#include <lights_physical_fragment>', '#ifdef USE_CLEARCOAT', 'material.clearcoat *= 1.0 - 0.9 * sdSeam; material.clearcoatRoughness = clamp(material.clearcoatRoughness * mix(1.0, sdRough, 0.85) + 0.3 * sdSeam, 0.0525, 1.0);', '#endif'];   /* M20: the lacquer layer follows the piece: no clear coat down in the seams (they read as real grooves, not painted lines), the coat's gloss varies with each panel's roughness */
  var nrm = ['#include <normal_fragment_maps>'];
  if (!LOW && S.micro) nrm.push('{ float sdMk = 1.0 - smoothstep(6.0, 22.0, sdDist); if (sdMk > 0.01) { float sdMh = (sdNoise(sdUV * ' + f(S.micro[0]) + ') + 0.5 * sdNoise(sdUV * ' + f(S.micro[0] * 2.13) + ' + 7.1)) * ' + f(S.micro[1]) + ' * sdMk; normal = sdMicroBump(-vViewPosition, normal, sdMh); } }');
  if (!LOW && S.bevel > 0 && K !== 'BRUSHED' && !S.seamless) nrm.push(   /* chamfer: inside the bevel width the normal tilts toward the nearest seam, so each panel / slab reads as a separate, slightly inset piece */
    '{ float sdBW = ' + f(Math.max(S.seam * 2.5, 0.05)) + '; float sdK = ' + f(S.bevel) + ' * (1.0 - smoothstep(0.0, sdBW, sdD)) * sdNear * clamp(sdBW / sdAA, 0.0, 1.0); vec3 sdDir = sdE.x < sdE.y ? sdTU * (sdF.x < 0.5 ? -1.0 : 1.0) : sdTV * (sdF.y < 0.5 ? -1.0 : 1.0);',
    '  normal = normalize(normal + sdK * normalize((viewMatrix * vec4(sdDir, 0.0)).xyz)); }');
  var prevOBC = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey;
  var key = 'mahworld-sd-' + K + '-' + [S.cell[0], S.cell[1], S.seam, S.seamDark, S.bevel, S.toneVar, S.roughVar, S.macro, S.grain, S.band ? S.band.join('x') : 0, S.bandTone, S.stagger, S.lod.join('x'), LOW ? 'L' : 'H', S.metalSeam, S.seamless ? 'S' : 'G', S.foot ? S.foot.join('x') : 0, S.micro ? S.micro.join('x') : 0, S.glass, 'c1'].join('_');
  mat.onBeforeCompile = function (sh, r) { if (prevOBC) prevOBC.call(this, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSdW; varying vec3 vSdN;').replace('#include <project_vertex>', ['#include <project_vertex>',
      '{ vec4 sdP = vec4(transformed, 1.0); vec3 sdN0 = objectNormal;',
      '#ifdef USE_BATCHING', '  sdP = batchingMatrix * sdP; sdN0 = mat3(batchingMatrix) * sdN0;', '#endif',
      '#ifdef USE_INSTANCING', '  sdP = instanceMatrix * sdP; sdN0 = mat3(instanceMatrix) * sdN0;', '#endif',
      '  vSdW = (modelMatrix * sdP).xyz; vSdN = normalize(mat3(modelMatrix) * sdN0); }'].join('\n'));
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + HELPERS + '\n' + SD_MICRO).replace('#include <color_fragment>', body.join('\n'))
      .replace('#include <roughnessmap_fragment>', rough.join('\n')).replace('#include <metalnessmap_fragment>', metal.join('\n')).replace('#include <normal_fragment_maps>', nrm.join('\n')).replace('#include <lights_physical_fragment>', coat.join('\n')); };
  mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|' + key; };
  mat.userData.surfaceDetail = { kind: K, key: key }; if (PATCHED) PATCHED.add(mat); mat.needsUpdate = true;
  return mat;
}

/* the material families of the world, tuned once here so every module speaks the same surface language. M20: walls / supports / stone gain a
   foot (contact darkening where they meet the floor) and cladding, stone, panels and paving a micro relief (normal detail near the camera) */
export var SURFACE = {
  PLAZA: { kind: 'HARDSCAPE', cell: [2.4, 1.2], seam: 0.035, seamDark: 0.7, bevel: 0.28, toneVar: 0.09, roughVar: 0.26, macro: 0.05, grain: 0.07, stagger: 0.5, lod: [26, 110], metalSeam: 0.6, micro: [2.4, 0.008] },
  DISTRICT: { kind: 'HARDSCAPE', cell: [3.2, 1.6], seam: 0.045, seamDark: 0.66, bevel: 0.22, toneVar: 0.08, roughVar: 0.24, macro: 0.06, grain: 0.06, stagger: 0.5, lod: [30, 130], metalSeam: 0.6, micro: [2.4, 0.008] },
  DECK: { kind: 'HARDSCAPE', cell: [3.0, 3.0], seam: 0.03, seamDark: 0.72, bevel: 0.18, toneVar: 0.05, roughVar: 0.2, macro: 0.035, grain: 0.05, stagger: 0, lod: [24, 100], metalSeam: 0.5 },
  FACADE: { kind: 'PANELS', cell: [1.8, 1.2], seam: 0.028, seamDark: 0.62, bevel: 0.32, toneVar: 0.07, roughVar: 0.3, macro: 0.04, grain: 0.035, band: [3.6, 0.22], bandTone: 0.78, lod: [30, 140], metalSeam: 0.5, foot: [2.2, 0.2], micro: [1.6, 0.006] },
  STRUCTURE: { kind: 'PANELS', cell: [1.2, 2.4], seam: 0.022, seamDark: 0.66, bevel: 0.26, toneVar: 0.05, roughVar: 0.24, macro: 0.035, grain: 0.03, lod: [24, 120], metalSeam: 0.45, foot: [1.8, 0.2], micro: [1.6, 0.006] },
  BRUSHED: { kind: 'BRUSHED', toneVar: 0.05, roughVar: 0.55, macro: 0.03, grain: 0, lod: [12, 60], foot: [1.4, 0.16] },
  TOWER: { kind: 'PANELS', cell: [3.2, 7.2], seam: 0.04, seamDark: 0.6, bevel: 0.3, toneVar: 0.05, roughVar: 0.26, macro: 0.04, grain: 0.03, band: [3.6, 0.16], bandTone: 0.84, lod: [40, 220], metalSeam: 0.5, foot: [3.0, 0.2], micro: [1.2, 0.007] },
  CONCRETE: { kind: 'HARDSCAPE', cell: [4, 4], seamless: true, toneVar: 0, roughVar: 0, macro: 0.07, grain: 0.08, lod: [30, 120], foot: [1.6, 0.18], micro: [3.0, 0.01] },
  PAVER: { kind: 'HARDSCAPE', cell: [4.0, 2.0], seamless: true, toneVar: 0, roughVar: 0, macro: 0.05, grain: 0, lod: [30, 120] },   /* M20: the road cores lay their stone in ROAD space (terrain.js): the world-grid 4 × 2 m pavers ran diagonally across the 45° causeways — macro only here (the road shader carries its own anti-aliased grain and joint chamfer: this family's 23 /m grain and derivative micro relief beat into dot patterns at 4–20 m) */
  KERB: { kind: 'PANELS', cell: [1.0, 1.0], seamless: true, toneVar: 0, roughVar: 0, macro: 0.03, grain: 0, lod: [24, 100], foot: [0.5, 0.15], micro: [3.5, 0.008] },   /* M20: kerb stones cut along the road in terrain.js (the world grid cut them askew on diagonal roads) */
  GLAZING: { kind: 'PANELS', cell: [1.5, 1.2], seam: 0.07, seamDark: 0.32, bevel: 0, toneVar: 0.05, roughVar: 0.35, macro: 0.03, grain: 0, band: [3.6, 0.34], bandTone: 0.5, lod: [40, 180], metalSeam: 0, foot: [1.2, 0.12], glass: 0.6 },   /* M8B: curtain wall — mullions / transoms, a spandrel per storey, per-pane reflection variation */
  SAND: { kind: 'HARDSCAPE', cell: [4, 4], seamless: true, toneVar: 0, roughVar: 0, macro: 0.08, grain: 0.1, lod: [20, 90] },   /* M8B: dry-sand grain + drift breakup on the shore band */
  FACADE_PLAIN: { kind: 'PANELS', cell: [1.8, 1.2], seam: 0.024, seamDark: 0.66, bevel: 0.3, toneVar: 0.08, roughVar: 0.3, macro: 0.05, grain: 0.035, lod: [30, 140], metalSeam: 0.5, foot: [2.2, 0.2], micro: [1.6, 0.006] },   /* M8E: platinum skin between real windows (the storey band now comes from the slab edges) */
  COMPOSITE: { kind: 'PANELS', cell: [3.0, 1.2], seam: 0.018, seamDark: 0.7, bevel: 0.22, toneVar: 0.06, roughVar: 0.18, macro: 0.04, grain: 0.025, stagger: 0.5, lod: [30, 140], metalSeam: 0.3, foot: [2.2, 0.2], micro: [1.4, 0.007] },   /* M8E: neutral architectural composite rainscreen, staggered long panels */
  CLADDING: { kind: 'PANELS', cell: [2.4, 1.2], seam: 0.02, seamDark: 0.6, bevel: 0.25, toneVar: 0.1, roughVar: 0.22, macro: 0.06, grain: 0.08, stagger: 0.5, lod: [30, 140], metalSeam: 0.3, foot: [1.8, 0.22], micro: [3.2, 0.012] },   /* M8E: honed stone cladding for heavy bases */
  MONOLITH: { kind: 'PANELS', cell: [2.5, 3.6], seam: 0.016, seamDark: 0.35, bevel: 0.14, toneVar: 0.3, roughVar: 0.95, macro: 0.05, grain: 0.02, lod: [30, 160], metalSeam: 0.2, foot: [2.4, 0.18], micro: [1.2, 0.007] },   /* M9: large-format satin black cladding (MAH MATCH): 2.5 m panels on its light-line rhythm, 3.6 m courses */
  STONE: { kind: 'PANELS', cell: [0.9, 0.45], seam: 0.012, seamDark: 0.8, bevel: 0.12, toneVar: 0.08, roughVar: 0.2, macro: 0.06, grain: 0.1, stagger: 0.5, lod: [16, 70], metalSeam: 0.3, foot: [1.2, 0.2], micro: [4.0, 0.012] }
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
  'uniform vec4 uZR[16]; uniform float uZRT[16]; uniform float uZRS[16]; uniform vec4 uZC[6]; uniform float uZCS[6]; uniform vec4 uZS[8]; uniform float uZDefSoft; uniform sampler2D uZWear; uniform vec4 uZWearB;',
  'float zNz(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); vec2 a = mod(i, 256.0), b = mod(i + vec2(1.0, 0.0), 256.0), c = mod(i + vec2(0.0, 1.0), 256.0), d = mod(i + 1.0, 256.0); return mix(mix(sdHash(a), sdHash(b), f.x), mix(sdHash(c), sdHash(d), f.x), f.y); }',   /* M20: value noise on a 256-cell periodic lattice — sdHash of a raw world lattice index (thousands of cells at 20–70 /m) runs out of float precision and beats into a line / dot moire */
  'void pBond(vec2 p, vec2 cell, float stag, out float d, out vec2 id, out vec2 cc) { vec2 g = p / cell; float row = floor(g.y); float sh = stag * mod(row, 2.0); g.x += sh; vec2 i = floor(g), f = fract(g); vec2 e = min(f, 1.0 - f) * cell; d = min(e.x, e.y); id = i; cc = vec2(i.x + 0.5 - sh, i.y + 0.5) * cell; }',
  'void pRings(vec2 q, float w, float jl, out float d, out vec2 id, out vec2 cc) { float r = length(q); float ri = floor(r / w), fr = fract(r / w); float n = max(3.0, floor(6.2831853 * (ri + 0.5) * w / jl)); float a = (atan(q.y, q.x) + 3.14159265) / 6.2831853 * n; float ai = floor(a), fa = fract(a); d = min(min(fr, 1.0 - fr) * w, min(fa, 1.0 - fa) * 6.2831853 * max(r, 0.2) / n); id = vec2(ri, ai); float ac = (ai + 0.5) / n * 6.2831853 - 3.14159265; cc = vec2(cos(ac), sin(ac)) * (ri + 0.5) * w; }',
  'void pHex(vec2 p, float s, out float d, out vec2 id, out vec2 cc) { vec2 r = vec2(1.0, 1.7320508), h = r * 0.5; vec2 P = p / s; vec2 a = mod(P, r) - h, b = mod(P - h, r) - h; vec2 gv = dot(a, a) < dot(b, b) ? a : b; vec2 c = P - gv; vec2 ag = abs(gv); float hd = max(dot(ag, vec2(0.5, 0.8660254)), ag.x); d = (0.5 - hd) * s; id = vec2(floor(c.x * 2.0 + 0.5), floor(c.y / 0.8660254 + 0.5)); cc = c * s; }',
  'void pDiamond(vec2 p, float s, out float d, out vec2 id, out vec2 cc) { vec2 q = vec2(p.x + p.y, p.y - p.x) * 0.70710678; vec2 cq; pBond(q, vec2(s), 0.0, d, id, cq); cc = vec2(cq.x - cq.y, cq.x + cq.y) * 0.70710678; }',
  'void pTri(vec2 p, float s, out float d, out vec2 id, out vec2 cc) { float hg = s * 0.8660254; vec2 q = vec2(p.x / s - p.y / (2.0 * hg), p.y / hg); vec2 i = floor(q), f = fract(q); float up = step(1.0, f.x + f.y); vec3 e = up < 0.5 ? vec3(f.x, f.y, 1.0 - f.x - f.y) : vec3(1.0 - f.x, 1.0 - f.y, f.x + f.y - 1.0); d = min(min(e.x, e.y), e.z) * hg; id = vec2(i.x * 2.0 + up, i.y); vec2 cq = i + (up < 0.5 ? vec2(0.3333333) : vec2(0.6666667)); cc = vec2((cq.x + cq.y * 0.5) * s, cq.y * hg); }'
].join('\n');

/* M14 LIVED-IN GROUND (owner 2026-09-27: "floors / grass more real, humanistic, lived-in … believable transitions, material richness").
   One soft WEAR field baked once from the registry's paths: the centre band of every causeway / regional road / trail, the forecourt spurs
   to each door (worn hardest) and the desire lines the causeways draw across the plaza to its centre. The ground paving and the path cores
   sample it: foot-polished where people walk (smoother, a touch lighter, joints packed with grit), grimier joints in the untrodden margins.
   A 512² single-channel texture (≈ 1.3 m texels), built by rasterising each segment only inside its own bounds; shared, never re-built.
   M20 (owner 2026-09-27, surface polish: "material realism, humanized transitions, lived-in variation"; the lead's review: vast featureless,
   uniform, clean-render floors): the field is RGBA now and covers the whole mainland (the coast outline, not only the paths' bounds), so the
   ground can read MACRO zones over tens of metres. R = WEAR (unchanged: the road cores still read .r), G = DAMP — the ground within ~9 m
   of a canal bank or a pond stays damp (darker, a sheen, joints filled), A = the SEA EDGE — the last ~15 m of paving before the beach takes
   wind-blown sand in its joints and a salt-dull finish, B = the KERB HALO — the 1.8 m of district paving
   just outside every road frame / forecourt collects grit and run-off from the kerb (a soft gutter band, darker joints). Still one 512²
   texture (1 MB on MED / HIGH: +768 KB over the old R8 field), built once.
   M20 review (LOW must never get heavier): the LOW shaders read the wear only (the LOW road core its .r, the LOW zoned paving not at all), so
   LOW builds the old single-channel R8 field over the old path bounds (256 KB, as before) — one slot per format, keyed by the registry. */
var WEAR = {};
export function wearField(THREE, reg, tier) {
  var lean = tier === 'LOW', slot = lean ? 'R8' : 'RGBA', NC = lean ? 1 : 4; if (WEAR[slot] && WEAR[slot].reg === reg) return WEAR[slot];
  var PW = (reg && reg.paths) || {}, L = PW.list || [], segs = [], W = { CAUSEWAY: PW.causeway_w || 20, REGIONAL: PW.regional_w || 8, TRAIL: PW.trail_w || 3 }, K = { CAUSEWAY: 0.75, REGIONAL: 0.65, TRAIL: 0.5 }, discs = [];
  L.forEach(function (P) { var pts = P.pts || [], w = P.width_m || W[P.tier] || 6, k = K[P.tier] || 0.5; for (var i = 1; i < pts.length; i++) segs.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w, k, w]);
    if (P.forecourt) { discs.push([P.forecourt.x, P.forecourt.z, P.forecourt.r || PW.forecourt_r || 12]); [P.spur, P.spur2].forEach(function (S) { if (S && S.to) segs.push([P.forecourt.x, P.forecourt.z, S.to[0], S.to[1], (PW.spur_w || 6) * 1.2, 1.0, PW.spur_w || 6]); }); } });
  var x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; segs.forEach(function (s) { x0 = Math.min(x0, s[0], s[2]); x1 = Math.max(x1, s[0], s[2]); z0 = Math.min(z0, s[1], s[3]); z1 = Math.max(z1, s[1], s[3]); });
  if (!segs.length) { x0 = z0 = -1; x1 = z1 = 1; } x0 -= 24; z0 -= 24; x1 += 24; z1 += 24;
  var CO = !lean && reg && reg.coast && reg.coast.outline; if (CO) { x0 = Math.min(x0, CO.x1 - 4); z0 = Math.min(z0, CO.z1 - 4); x1 = Math.max(x1, CO.x2 + 4); z1 = Math.max(z1, CO.z2 + 4); }
  var N = 512, data = new Uint8Array(N * N * NC), sx = (x1 - x0) / N, sz = (z1 - z0) / N;
  function put(o, ch, v) { if (ch >= NC) return; var c = Math.round(Math.max(0, Math.min(1, v)) * 255); if (c > data[o * NC + ch]) data[o * NC + ch] = c; }
  function box(xa, za, xb, zb, fn) { var i0 = Math.max(0, Math.floor((xa - x0) / sx)), i1 = Math.min(N - 1, Math.ceil((xb - x0) / sx)), j0 = Math.max(0, Math.floor((za - z0) / sz)), j1 = Math.min(N - 1, Math.ceil((zb - z0) / sz)); for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) fn(j * N + i, x0 + (i + 0.5) * sx, z0 + (j + 0.5) * sz); }
  function ease(u) { return u <= 0 ? 1 : (u >= 1 ? 0 : 1 - u * u * (3 - 2 * u)); }
  segs.forEach(function (s) { var ax = s[0], az = s[1], bx = s[2], bz = s[3], w = s[4], k = s[5], fw = s[6] * 0.5, reach = Math.max(w * 0.5 + 1, fw + 2.2), dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    box(Math.min(ax, bx) - reach, Math.min(az, bz) - reach, Math.max(ax, bx) + reach, Math.max(az, bz) + reach, function (o, px, pz) { var t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2)), ex = px - ax - dx * t, ez = pz - az - dz * t, dd = Math.sqrt(ex * ex + ez * ez);
      put(o, 0, ease((dd - w * 0.12) / (w * 0.36)) * k);   /* full wear in the centre 24 % of the width, easing out to 96 % */
      if (!lean && dd > fw - 0.6) put(o, 2, ease((dd - fw) / 1.8) * (dd < fw ? (dd - fw + 0.6) / 0.6 : 1)); }); });   /* the kerb halo: just outside the frame */
  if (!lean) discs.forEach(function (D) { box(D[0] - D[2] - 2.2, D[1] - D[2] - 2.2, D[0] + D[2] + 2.2, D[1] + D[2] + 2.2, function (o, px, pz) { var dd = Math.hypot(px - D[0], pz - D[1]); if (dd > D[2] - 0.6) put(o, 2, ease((dd - D[2]) / 1.8) * (dd < D[2] ? (dd - D[2] + 0.6) / 0.6 : 1)); }); });
  /* the sea edge (the coast outline: the district floor is cut to this rounded rectangle) and the damp round every canal / pond rectangle */
  var DW = 9;
  if (CO) { var cr = CO.corner_r || 0, hx = (CO.x2 - CO.x1) / 2, hz = (CO.z2 - CO.z1) / 2, cx = (CO.x1 + CO.x2) / 2, cz = (CO.z1 + CO.z2) / 2;
    box(x0, z0, x1, z1, function (o, px, pz) { var qx = Math.abs(px - cx) - hx + cr, qz = Math.abs(pz - cz) - hz + cr, sd = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - cr; if (sd > -18) put(o, 3, ease((-sd - 0.5) / 15)); }); }   /* A = the SEA EDGE: the last ~15 m of paving before the beach (wind-blown sand, a salt-dull finish) */
  if (!lean) ((reg && reg.water && reg.water.rivers) || []).forEach(function (R) { box(R.x1 - DW - 1, R.z1 - DW - 1, R.x2 + DW + 1, R.z2 + DW + 1, function (o, px, pz) { var qx = Math.max(R.x1 - px, 0, px - R.x2), qz = Math.max(R.z1 - pz, 0, pz - R.z2), sd = Math.hypot(qx, qz); put(o, 1, ease((sd - 0.5) / (DW * 0.8)) * 0.85); }); });
  var tex = new THREE.DataTexture(data, N, N, lean ? THREE.RedFormat : THREE.RGBAFormat, THREE.UnsignedByteType); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
  WEAR[slot] = { reg: reg, tex: tex, bounds: new THREE.Vector4(x0, z0, 1 / (x1 - x0), 1 / (z1 - z0)), segs: segs.length, channels: lean ? 'R wear (LOW)' : 'R wear · G damp · B kerb halo · A sea edge', bytes: data.byteLength }; return WEAR[slot];
}

/* M20 PLANTED BEDS (surface polish: "humanized transitions … grass: maintained vs wild zones, tufts at edges"; the audit's grove frames: the
   paving broke up tile by tile into a pixel-square loam — a ruin, not a planted grove). A grove's ground is now a DESIGNED BED: its edge runs
   3.2 m inside the FOREST zone rectangle, swinging ±1.4 m in long easy curves, and it is laid in bands the eye reads as someone's care — a
   stone EDGE COURSE (0.3 m), a raked gravel MARGIN (0.7–1.4 m, maintained), then the grove's soil (wild deeper in). One analytic function,
   mirrored in GLSL (zonedPaving) and here (the meadow and the region shards keep to the bed). Returns metres inside the bed edge (< 0 on the
   paving side) and the along-edge coordinate. */
export var BED = { inset_m: 3.2, swing_m: 1.4, course_m: 0.3, margin_m: [0.7, 1.4] };
export function bedEdge(zones, x, z) { var best = -1e9, along = x; for (var i = 0; i < zones.length; i++) { var r = zones[i], cx = (r.x1 + r.x2) / 2, cz = (r.z1 + r.z2) / 2, qx = Math.abs(x - cx) - (r.x2 - r.x1) / 2, qz = Math.abs(z - cz) - (r.z2 - r.z1) / 2, sdo = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0); if (-sdo > best) { best = -sdo; along = qx > qz ? z : x; } }
  var wob = BED.swing_m * 0.5 * (Math.sin(x * 0.21 + 1.7 * Math.sin(z * 0.093)) + Math.sin(z * 0.17 + 1.3 * Math.sin(x * 0.081))); return { d: best - BED.inset_m - wob, along: along, inside: best }; }

export var PAVING_TYPES = { BOND: 0, RINGS: 1, HEX: 2, DIAMOND: 3, TRI: 4, PLANKS: 5, SQUARE: 6, MOSAIC: 7, FINE_RINGS: 8 };
var CLASS_PAVING = { ATHLETE: ['DIAMOND', 0.1], TITAN: ['HEX', 0.15], LEAN: ['PLANKS', 0.35], VISIONARY: ['TRI', 0.5], BAGE: ['MOSAIC', 0.2] };

/* the zone state: plain arrays the shader uniforms point at (filled in place, so a late registry updates every patched material) */
export function createPavingZones(THREE) {
  var Z = { rects: [], rtype: [], rsoft: [], circles: [], csoft: [], soft: [], defSoft: { value: 0.18 }, wearU: { value: null }, wearB: { value: new THREE.Vector4(0, 0, 0, 0) }, info: { rects: 0, circles: 0, soft: 0 } };
  for (var i = 0; i < 16; i++) { Z.rects.push(new THREE.Vector4(1, 1, 0, 0)); Z.rtype.push(0); Z.rsoft.push(0); }
  for (i = 0; i < 6; i++) { Z.circles.push(new THREE.Vector4(0, 0, 0, 0)); Z.csoft.push(0); }
  for (i = 0; i < 8; i++) Z.soft.push(new THREE.Vector4(1, 1, 0, 0));
  Z.setFromRegistry = function (reg, opts) { opts = opts || {}; var ri = 0, ci = 0, si = 0;
    ((reg && reg.regions && reg.regions.list) || []).forEach(function (R) { var sh = R.shape || {}; if (sh.kind !== 'RECTS') return; var t = R.id === 'LUMINOUS_COAST' ? ['PLANKS', 0.25] : (R.class && CLASS_PAVING[R.class]) || (R.family === 'platinum' ? ['SQUARE', 0] : null); if (!t) return;
      (sh.rects || []).forEach(function (r) { if (ri >= 16) return; Z.rects[ri].set(r.x1, r.z1, r.x2, r.z2); Z.rtype[ri] = PAVING_TYPES[t[0]]; Z.rsoft[ri] = t[1]; ri++; }); });
    var plazaR = (reg && reg.field && reg.field.plaza_radius_m) || 56; Z.circles[ci].set(0, 0, plazaR, PAVING_TYPES.RINGS); Z.csoft[ci] = 0; ci++;
    if (opts.halo) { Z.circles[ci].set(opts.halo.x, opts.halo.z, opts.halo.r || 18, PAVING_TYPES.FINE_RINGS); Z.csoft[ci] = 0; ci++; }
    ((reg && reg.zones) || []).forEach(function (z) { var r = z.rect || z; if (si >= 8 || z.kind !== 'FOREST' || r.x1 === undefined) return; Z.soft[si].set(r.x1, r.z1, r.x2, r.z2); si++; });
    Z.reg = reg; if (opts.tier) Z.tier = opts.tier; var wear = Z.tier ? Z.bindWear() : 0;   /* M14: the lived-in wear field (M20 review: in the format of the tier — bound as soon as a patched material names its tier) */
    Z.info = { rects: ri, circles: ci, soft: si, wear_segments: wear }; return Z; };
  Z.bindWear = function () { try { var WF = wearField(THREE, Z.reg, Z.tier); Z.wearU.value = WF.tex; Z.wearB.value.copy(WF.bounds); if (Z.info) Z.info.wear_segments = WF.segs; return WF.segs; } catch (e) { return 0; } };
  return Z;
}

/* M20 SURFACE POLISH (owner 2026-09-27: "material realism, humanized transitions, lived-in variation"; reinforcement: "premium, believable,
   people actually exist here — bias away from empty or too-clean civic space"; the lead's review: V25 / TS1 / V03 / V13 / V32 floors read as
   uniform clean-render paving, the grove ground as a pixel-square sheet, every transition a hard line). The ground reads at three scales:
     MACRO  stone LOTS — the slabs are grouped (by their own centres, so the change always runs along a joint) into ~7 m lots of a slightly
            different quarry batch; a broad 70 m value drift; the ground field's DAMP round canals / ponds (darker, a sheen, fuller joints),
            its SEA EDGE (sand in the joints, a salt-dull finish, a little drift) and its KERB HALO (the gutter band just outside every road);
     MESO   finer joints (2.2 cm, were 3.5), the plaza's concentric courses broken every fourth ring by a band of small dark SETTS, and the
            grove's PLANTED BED (bedEdge above): stone edge course → raked gravel margin (maintained) → soil with pebbles (wild deeper in);
     MICRO  a figure in each slab (the stone's own cloudiness), a fine aggregate speckle that fades before it can shimmer, and on HIGH a
            honed micro relief near the eye. The per-slab tilt / roughness scatter now fades by 30 m (from the air it printed the MATCH
            district as a checkerboard). The authored floor canvases' thin decorative lines (pale arcs, blue route strokes, the brushed
            streaks) are read through a blurred, mostly neutral sample: their broad value gradient stays, the lines no longer float on the
            stone as translucent bands. Value / roughness only — never hue. LOW keeps its old shader (pattern + per-slab tone, the old fwidth
   seam coverage; the finer joints; the canvas read is blurred — the same one fetch, its LOD bias an operand of it — and neutral, paid for by
   the per-slab roughness scatter reusing the tone hash: one hash fewer than a330208); MED drops the pebbles, the second speckle octave, the
   drift and the noise on damp / kerb halo. */
export function zonedPaving(THREE, mat, Z, spec) {
  if (!mat || !mat.isMeshStandardMaterial || (PATCHED ? PATCHED.has(mat) : mat.userData.surfaceDetail)) return mat;
  var S = Object.assign({ seam: 0.022, seamDark: 0.6, bevel: 0.26, toneVar: 0.14, roughVar: 0.16, macro: 0.05, grain: 0.06, lod: [28, 120], band: 0.7, tier: 'HIGH' }, spec || {}); var LOW = S.tier === 'LOW', HIGH = !LOW && S.tier !== 'MED';
  if (Z && Z.bindWear && Z.tier !== S.tier) { Z.tier = S.tier; if (Z.reg !== undefined) Z.bindWear(); }   /* the zones' wear field takes this tier's format (LOW: R8) */
  var body = ['#include <color_fragment>',
    'vec2 zp = vSdW.xz; float sdDist = length(cameraPosition - vSdW); float sdNear = 1.0 - smoothstep(' + f(S.lod[0]) + ', ' + f(S.lod[1]) + ', sdDist);' + (LOW ? '' : ' float zFp = sdDist * length(dFdx(normalize(vViewPosition))) / sqrt(max(abs(cameraPosition.y - vSdW.y) / max(sdDist, 1e-3), 0.06));'),   /* M20: the pixel footprint (m) — distance × the pixel's angle (the view ray's own derivative: smooth, resolution-aware) ÷ √(grazing cosine), between the across- and along-view footprints; the coverage / fade factors use it (fwidth-based amplitude factors change per 2 x 2 quad and stitched joints and grain into dots). Not on LOW (the review: LOW keeps the old fwidth coverage, no heavier) */
    'float zType = 0.0, zEdge = 1e5, zSoftBase = uZDefSoft; vec2 zC = vec2(0.0);',
    'for (int i = 0; i < 16; i++) { vec4 R = uZR[i]; if (zp.x > R.x && zp.x < R.z && zp.y > R.y && zp.y < R.w) { zType = uZRT[i]; zSoftBase = uZRS[i]; zEdge = min(min(zp.x - R.x, R.z - zp.x), min(zp.y - R.y, R.w - zp.y)); } }',
    'for (int i = 0; i < 6; i++) { vec4 C = uZC[i]; float cr = length(zp - C.xy); if (C.z > 0.0 && cr < C.z) { zType = C.w; zSoftBase = uZCS[i]; zEdge = C.z - cr; zC = C.xy; } }',
    'float sdD; vec2 sdId, sdCC; float zSett = 0.0, zCourse = 0.0, zNatK = 0.0, zBed = -1e4, zAlong = 0.0, zSe = -1e4, zMg = 0.0;',
    'if (zType < 0.5) pBond(zp, vec2(3.2, 1.6), 0.5, sdD, sdId, sdCC);',
    'else if (zType < 1.5) { pRings(zp - zC, 1.8, 2.6, sdD, sdId, sdCC); sdCC += zC;' + (LOW ? '' : ' float zRq = length(zp - zC); if (zRq > 5.2 && mod(floor(zRq / 1.8), 4.0) > 2.5) { pRings(zp - zC, 0.45, 0.6, sdD, sdId, sdCC); sdCC += zC; sdId += vec2(311.0, 17.0); zSett = 1.0; }') + ' }',   /* M20: every fourth plaza course is a band of small dark setts (not on LOW: no heavier there) */
    'else if (zType < 2.5) pHex(zp, 1.6, sdD, sdId, sdCC);',
    'else if (zType < 3.5) pDiamond(zp, 2.0, sdD, sdId, sdCC);',
    'else if (zType < 4.5) pTri(zp, 2.6, sdD, sdId, sdCC);',
    'else if (zType < 5.5) pBond(zp, vec2(3.6, 0.6), 0.5, sdD, sdId, sdCC);',
    'else if (zType < 6.5) pBond(zp, vec2(2.4, 2.4), 0.0, sdD, sdId, sdCC);',
    'else if (zType < 7.5) pBond(zp, vec2(0.9, 0.9), 0.5, sdD, sdId, sdCC);',
    'else { pRings(zp - zC, 1.2, 1.8, sdD, sdId, sdCC); sdCC += zC; }'];
  if (!LOW) body.push(   /* M20 PLANTED BED (mirrors bedEdge): metres inside the grove's bed edge, and the stone edge course along it */
    'for (int i = 0; i < 8; i++) { vec4 Sr = uZS[i]; if (Sr.z > Sr.x) { vec2 zq = abs(zp - (Sr.xy + Sr.zw) * 0.5) - (Sr.zw - Sr.xy) * 0.5; float se = -(length(max(zq, 0.0)) + min(max(zq.x, zq.y), 0.0)); if (se > zSe) { zSe = se; zAlong = zq.x > zq.y ? zp.y : zp.x; } } }',
    'zBed = zSe - ' + f(BED.inset_m) + ' - ' + f(BED.swing_m * 0.5) + ' * (sin(zp.x * 0.21 + 1.7 * sin(zp.y * 0.093)) + sin(zp.y * 0.17 + 1.3 * sin(zp.x * 0.081)));',
    'if (zBed > 0.0) { if (zBed < ' + f(BED.course_m) + ') { zCourse = 1.0; float zCa = zAlong / 0.5; float zCf = fract(zCa); sdD = min(min(zBed, ' + f(BED.course_m) + ' - zBed), min(zCf, 1.0 - zCf) * 0.5 + clamp(sdDist * 0.1667 - 1.0, 0.0, 1.0) * 0.3); sdId = vec2(floor(zCa), -41.0); sdCC = zp; } else { zNatK = 1.0; sdD = 1e3; } }');
  body.push(
    'float zBand = 0.0; if (zEdge < ' + f(S.band) + ') {' + (LOW ? '' : ' if (zCourse + zNatK < 0.5) {') + ' zBand = 1.0; sdD = min(zEdge, ' + f(S.band) + ' - zEdge); sdId = vec2(-7.0, zType); sdCC = zp; }' + (LOW ? '' : ' }'),   /* the threshold course where two families meet */
    'float sdAA = max(fwidth(sdD), 1e-4) * 1.25; float sdSeam = (1.0 - smoothstep(' + f(S.seam * 0.5) + ', ' + f(S.seam * 0.5) + ' + sdAA, sdD)) * sdNear * clamp(' + f(S.seam) + (LOW ? ' / sdAA' : ' / (zFp * 1.25)') + ', 0.0, 1.0);',   /* M11: a seam finer than the pixel footprint fades to its coverage instead of aliasing at grazing view (LOW: the old fwidth coverage) */
    'float sdH1 = sdHash(sdId + 17.0 + zType * 3.1), sdH2 = ' + (LOW ? 'fract(sdH1 * 13.7 + 0.31);' : 'sdHash(sdId * 1.7 + 3.1 + zType);'),   /* LOW: the roughness scatter reuses the tone hash (one hash, not two — it pays for the canvas read below: LOW no heavier than before) */
    LOW ? 'float sdTone = (1.0 + (sdH1 - 0.5) * ' + f(S.toneVar) + ') * mix(1.0, 0.9, zBand); float sdRough = (1.0 + (sdH2 - 0.5) * ' + f(S.roughVar) + ') * mix(1.0, 1.15, zBand);'
      : 'float zCv = zCourse * clamp(sdDist * 0.125 - 0.75, 0.0, 1.0); float sdTone = (1.0 + (sdH1 - 0.5) * ' + f(S.toneVar) + ' * (1.0 + zSett + zCourse) * (1.0 - zCv)) * mix(1.0, 0.9, zBand) * mix(1.0, 0.84, zSett) * mix(1.0, 0.72, zCourse); float sdRough = (1.0 + (sdH2 - 0.5) * ' + f(S.roughVar) + ') * mix(1.0, 1.15, zBand) * mix(1.0, 1.12, max(zSett, zCourse));',   /* the bed's edge course: its stone-to-stone tone fades by 14 m and its cross joints by 12 m (a 1–2 px course carries no stone-scale detail at range; the review's dashed line itself was the relief step, see nrm); the review fixes fade on linear ramps (a clamp, not a smoothstep: MED no heavier than it needs to be) */
    'float zPatch = 0.0, zWear = 0.0, zGH = 0.0, zPeb = 0.0;');
  if (!LOW) body.push('sdTone *= 1.0 + (sdHash(floor(sdCC / 7.0) + 91.7) - 0.5) * 0.09 * (1.0 - zNatK); sdRough = mix(1.0, sdRough, 1.0 - smoothstep(8.0, 30.0, sdDist));');   /* M20 stone lots (the change runs along the joints); the per-slab roughness scatter only near the eye (at range it printed a checkerboard of sky reflections) */
  if (!LOW) body.push(
    'float zSoftRect = smoothstep(0.0, 10.0, zSe);',
    'float zSoft = max(zSoftBase, zSoftRect * 0.85); float zN = sdNoise(zp * 0.07) * 0.7 + sdNoise(zp * 0.23) * 0.3; zPatch = zSoft * smoothstep(0.42, 0.7, zN) * (1.0 - zBand) * (1.0 - zCourse);',
    'sdSeam *= 1.0 - 0.6 * zPatch; sdTone *= 1.0 - 0.05 * zPatch; sdRough *= 1.0 + 0.2 * zPatch;',
    'vec4 zF = texture2D(uZWear, (zp - uZWearB.xy) * uZWearB.zw); float zFwm = zFp;',   /* screen derivatives taken here, in uniform control flow */   /* the ground field: R wear · G damp · B kerb halo · A sea edge */
    /* M8C → M20 NATURAL GROUND: inside the planted bed the ground is grown — a raked gravel MARGIN along the edge course (maintained), then the
       grove's soil: humus drift, pebbles (HIGH), a darker, rougher floor deeper in (wild). The region tint colours it; matte in absolute
       terms (roughness ≥ 0.6 on the gravel, 0.72 on the soil, day or night — see rough below: relative to the night floor it glinted). */
    'float zNat0 = zSoftRect * 1.05; float zWild = smoothstep(0.03, 0.3, zNat0) * smoothstep(1.5, 9.0, zBed);',
    'if (zNatK > 0.5) { float zMw = ' + f(BED.margin_m[0]) + ' + ' + f(BED.margin_m[1] - BED.margin_m[0]) + ' * sdNoise(vec2(zAlong * 0.09, 3.7)); zMg = 1.0 - smoothstep(-0.12, 0.2, zBed - ' + f(BED.course_m) + ' - zMw + (zNz(zp * 2.3) - 0.5) * 0.5);',
    '  zGH = geoFbm(zp * 0.35) * 0.7 + geoN(zp * 1.9) * 0.3;' + (HIGH ? ' vec2 zPi = floor(zp * 3.4), zPf = fract(zp * 3.4); float zPd = 8.0, zPh = 0.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); float d = length(g + vec2(sdHash(mod(zPi + g, 256.0)), sdHash(mod(zPi + g, 256.0) + 31.7)) - zPf); if (d < zPd) { zPd = d; zPh = sdHash(mod(zPi + g, 256.0) + 7.7); } } float zPr = 0.09 + 0.2 * zPh * zPh; zPeb = (1.0 - smoothstep(zPr - zFwm * 3.4, zPr + zFwm * 3.4, zPd)) * step(0.7 - 0.2 * zWild - 0.45 * (sdNoise(zp * 0.6 + 1.7) - 0.5), zPh) * (1.0 - zMg) * clamp(1.6 - zFwm * 40.0, 0.0, 1.0);' : ' float zPh = 0.0;'),   /* the pebbles go (tone, the smoother finish, the bump) once the footprint passes ~2.5 cm — about 8 m at eye level: beyond it their smoother finish still caught the grazing sky as pale dots (the review's 8–15 m dots) */
    '  float zGrav = 0.5 + (zNz(zp * 31.0) - 0.5) * 0.6 * clamp(1.714 - zFwm * 88.57, 0.0, 1.0)' + (HIGH ? ' + (zNz(zp * 73.0) - 0.5) * 0.4 * clamp(1.714 - zFwm * 208.6, 0.0, 1.0)' : '') + '; float zRake = 0.5 + 0.5 * sin((zBed - ' + f(BED.course_m) + ') * 62.8318) * (1.0 - smoothstep(0.15, 0.45, zFwm * 10.0));',   /* the gravel's two octaves and the raked lines along the edge (10 cm) each fade out before they near the pixel (the review: the unfaded 31 / 73 per m octaves aliased at range); MED keeps the 31 /m octave only (the 73 /m one is gone within ~2 m of a phone's eye — it pays for MED's share of the review's fades) */
    '  float zSoil = (0.4 + 0.26 * zGH) * (0.84 + 0.32 * sdNoise(zp * 0.15 + 6.1)) * mix(1.0, 0.82, zWild) * (1.0 + zPeb * (0.35 + 0.3 * zPh));',   /* drier and damper patches of soil; pebbles of mixed size, in drifts (faded out with the footprint above) */
    '  float zLit = smoothstep(0.52, 0.8, sdNoise(zp * 0.38 + 11.0)) * (1.0 - zMg); zSoil *= 1.0 + ' + (HIGH ? '0.32 * zLit * mix(0.36, smoothstep(0.58, 0.7, zNz(zp * vec2(13.0, 8.0) + 2.0)), 1.0 - smoothstep(0.12, 0.3, zFwm * 13.0))' : '0.115 * zLit') + ';',   /* drifts of fallen leaf litter: faint flecks near the eye, a lighter patch at range (the review: at 8–15 m the flecks read as white dots — softer and gone sooner) */
    '  sdTone = mix(zSoil, (1.3 + 0.24 * zGrav) * (0.94 + 0.06 * zRake), zMg); sdRough = mix(1.35 + 0.1 * zWild, 1.18, zMg) * (1.0 - 0.35 * zPeb); sdSeam = 0.0; }',
    'else if (zBed > -0.9) { float zSp = (1.0 + zBed / 0.9) * (1.0 - zCourse); sdSeam = min(1.0, sdSeam * (1.0 + 0.8 * zSp)); sdTone *= (1.0 - 0.05 * zSp) * (1.0 + 0.35 * smoothstep(0.8, 0.9, zNz(zp * 17.0)) * zSp * zSp); }',   /* the paving beside the bed: a little soil in the joints, a few gravel stones kicked out */
    'zWear = zF.r * (0.55 + 0.45 * sdNoise(zp * 0.13)) * (1.0 - zNatK);',   /* M14 LIVED-IN: foot-polished where people walk, joints packed with grit */
    'sdRough *= 1.0 - 0.36 * zWear; sdTone *= 1.0 + 0.05 * zWear; sdSeam *= 1.0 - 0.5 * zWear;',
    'float zDamp = zF.g * ' + (HIGH ? '(0.55 + 0.45 * sdNoise(zp * 0.19 + 2.3))' : '0.78') + ' * (1.0 - zNatK * 0.5); sdTone *= 1.0 - 0.14 * zDamp; sdRough *= 1.0 - 0.45 * zDamp; sdSeam = min(1.0, sdSeam * (1.0 + 0.5 * zDamp));',
    'float zKerb = zF.b * ' + (HIGH ? '(0.5 + 0.5 * sdNoise(zp * 0.7 + 5.1))' : '0.75') + ' * (1.0 - zNatK); sdTone *= 1.0 - 0.06 * zKerb; sdRough *= 1.0 + 0.1 * zKerb; sdSeam = min(1.0, sdSeam * (1.0 + 0.6 * zKerb));',
    'float zSea = zF.a * (1.0 - zNatK); float zDrift = ' + (HIGH ? 'smoothstep(0.45, 0.8, sdNoise(zp * vec2(0.25, 0.7) + 9.1)) * zSea * zSea' : '0.0') + '; sdSeam *= 1.0 - 0.75 * zSea; sdTone *= (1.0 + 0.16 * zDrift) * (1.0 + 0.05 * zSea + 0.08 * smoothstep(0.75, 1.0, zSea)); sdRough *= 1.0 + 0.2 * zSea;',   /* sand fills the joints toward the sea; drifts lie on the stone (HIGH) */
    'float sdMacro = sdNoise(zp * 0.045) - 0.5; sdTone *= 1.0 + sdMacro * ' + f(S.macro * 2) + ' + (sdNoise(zp * 0.013 + 4.1) - 0.5) * 0.1; sdRough *= 1.0 + sdMacro * ' + f(S.macro * 3) + ';',
    'float sdGrain = (zNz(zp * 7.3) - 0.5) * 0.6 * (1.0 - smoothstep(0.25, 0.6, zFwm * 7.3)) + (zNz(zp * 23.0) - 0.5) * 0.4 * (1.0 - smoothstep(0.25, 0.6, zFwm * 23.0)); sdTone *= 1.0 + sdGrain * ' + f(S.grain) + ' * sdNear; sdRough *= 1.0 + sdGrain * ' + f(S.grain * 2.2) + ' * sdNear;',
    'if (zNatK < 0.5) { float zFig = sdNoise((zp - sdCC) * 0.9 + sdH1 * 17.0) - 0.5; float zSk1 = 1.0 - smoothstep(0.25, 0.6, zFwm * 18.0)' + (HIGH ? ', zSk2 = 1.0 - smoothstep(0.25, 0.6, zFwm * 45.0)' : '') + ';',   /* each octave gone before it nears the pixel (no moire) */
    'sdTone *= (1.0 + zFig * 0.14 * sdNear * (1.0 - zNatK)) * (1.0 + ((zNz(zp * 18.0) - 0.5) * 0.1 * zSk1' + (HIGH ? ' + (zNz(zp * 45.0 + 3.3) - 0.5) * 0.09 * zSk2' : '') + ')); }');   /* paving only (the soil has its own grain) */   /* the stone's figure; a fine aggregate that fades before it can shimmer */
  body.push('diffuseColor.rgb *= sdTone * mix(1.0, ' + f(S.seamDark) + ', sdSeam);' + (LOW ? '' : ' float zSeamRM = sdSeam * (1.0 - zSett * clamp(sdDist * 0.1 - 0.5, 0.0, 0.85));'));   /* M20 review: the sett band's joints keep their darker fill at range but lose their rough, less metallic finish from 5 to 13.5 m (to 15 %) — on the night mirror floor (metalness 0.9, roughness 0.3) that finish lit every joint as a pale line and the band as a busy lattice; by day (roughness 0.7, metalness 0.12) the band reads by its fill, as before */
  var mapFrag = ['#ifdef USE_MAP', '  vec4 sdMapC = texture2D(map, vMapUv, 5.0); float sdMapL = dot(sdMapC.rgb, vec3(0.2126, 0.7152, 0.0722));', '  diffuseColor *= vec4(mix(vec3(sdMapL), sdMapC.rgb, 0.35), 1.0);', '#endif'];   /* M20: the canvas floor's broad value, not its thin decorative lines (value-led: 35 % of its tint) */
  var rough = ['#include <roughnessmap_fragment>', 'roughnessFactor = clamp(mix(roughnessFactor * sdRough, max(roughnessFactor, 0.86), ' + (LOW ? 'sdSeam' : 'zSeamRM') + '), 0.04, 1.0);' + (LOW ? '' : ' roughnessFactor = mix(roughnessFactor, max(roughnessFactor, mix(0.72, 0.6, zMg) - 0.1 * zPeb), zNatK);')];   /* M20 review: the planted bed has an ABSOLUTE roughness floor (soil 0.72, gravel 0.6, pebbles a touch smoother — its daylight values): relative to the night floor's 0.26 it fell to ~0.35 and glinted in the moon's lobe */
  var metal = ['#include <metalnessmap_fragment>', 'metalnessFactor *= 1.0 - 0.6 * ' + (LOW ? 'sdSeam' : 'zSeamRM') + ';' + (LOW ? '' : ' metalnessFactor = mix(metalnessFactor, 0.02, max(zNatK, zCourse * 0.7));')];
  var nrm = ['#include <normal_fragment_maps>'];
  if (!LOW) nrm.push('normal = geoBump(-vViewPosition, normal, (zGH * 0.12 * clamp(1.6 - zFp * 20.0, 0.0, 1.0) * clamp((zBed - ' + f(BED.course_m) + ') * 3.3333, 0.0, 1.0) + zPeb * 0.025 * clamp(1.667 - zFp * 83.33, 0.0, 1.0)) * sdNear);',   /* zGH / zPeb are 0 off the soil: the bump stays in uniform control flow; each fades with the pixel footprint (the review: per 2 x 2 quad their derivative glinted as blocky white specks at night), and the ground relief eases in over the first 0.3 m of the gravel — it started as a 6 cm step at the edge course, whose screen derivative tilted every 2 x 2 quad on that line: the review's "dashed dark line" along the bed */
    '{ float sdN2 = 1.0 - smoothstep(8.0, 30.0, sdDist); vec3 sdTl = vec3(sdH1 - 0.5, 0.0, sdH2 - 0.5) * 0.03 * sdN2 * (1.0 - zNatK) * (1.0 - zBand) * (1.0 - zCourse) * (1.0 - 0.6 * zWear); normal = normalize(normal + (viewMatrix * vec4(sdTl, 0.0)).xyz); }');   /* M14: every slab laid a hair off true, as real stone is, so the sky breaks slab by slab in its reflection (M20: near the eye only) */
  if (HIGH) nrm.push('{ float zMb = 0.0; if (sdDist < 14.0 && zNatK < 0.5) zMb = zNz(zp * 9.0) * 0.0008 * (1.0 - smoothstep(6.0, 14.0, sdDist)); normal = geoBump(-vViewPosition, normal, zMb); }');   /* HIGH: a hair of honed relief — the night floor is a mirror, a stronger relief rippled it */   /* M20 honed micro relief near the eye */
  if (!LOW && S.bevel > 0) nrm.push('{ vec2 bd = zp - sdCC; float bl = length(bd); if (bl > 1e-4) { float sdK = ' + f(S.bevel) + ' * (1.0 - smoothstep(0.0, ' + f(Math.max(S.seam * 2.5, 0.05)) + ', sdD)) * sdNear * clamp(' + f(Math.max(S.seam * 2.5, 0.05)) + ' / (zFp * 1.25), 0.0, 1.0) * (1.0 - zPatch) * (1.0 - 0.6 * zBand) * (1.0 - zNatK) * (1.0 - zSett * clamp(sdDist * 0.2 - 0.6, 0.0, 1.0)); normal = normalize(normal + sdK * normalize((viewMatrix * vec4(bd.x / bl, 0.0, bd.y / bl, 0.0)).xyz)); } }');
  var prevOBC = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey; var key = 'mahworld-zoned-m20-' + [S.seam, S.seamDark, S.bevel, S.toneVar, S.roughVar, S.macro, S.grain, S.lod.join('x'), S.band, LOW ? 'L' : (HIGH ? 'H' : 'M')].join('_');
  mat.onBeforeCompile = function (sh, r) { if (prevOBC) prevOBC.call(this, sh, r);
    sh.uniforms.uZWear = Z.wearU; sh.uniforms.uZWearB = Z.wearB; sh.uniforms.uZR = { value: Z.rects }; sh.uniforms.uZRT = { value: Z.rtype }; sh.uniforms.uZRS = { value: Z.rsoft }; sh.uniforms.uZC = { value: Z.circles }; sh.uniforms.uZCS = { value: Z.csoft }; sh.uniforms.uZS = { value: Z.soft }; sh.uniforms.uZDefSoft = Z.defSoft;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSdW; varying vec3 vSdN;').replace('#include <project_vertex>', ['#include <project_vertex>',
      '{ vec4 sdP = vec4(transformed, 1.0); vec3 sdN0 = objectNormal;', '#ifdef USE_INSTANCING', '  sdP = instanceMatrix * sdP; sdN0 = mat3(instanceMatrix) * sdN0;', '#endif', '  vSdW = (modelMatrix * sdP).xyz; vSdN = normalize(mat3(modelMatrix) * sdN0); }'].join('\n'));
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + HELPERS + '\n' + GEO_FUNCS + '\n' + ZONED_FUNCS).replace('#include <map_fragment>', mapFrag.join('\n')).replace('#include <color_fragment>', body.join('\n'))
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
/* M20 fracture planes (applyGeology facets): the nearest two cells of a jittered grid; xy = the plane tilt (−0.5..0.5), eased to the mean of
   the two planes across the joint (a rolled crease, no razor edge); z = the distance to the joint (cell units); w = the plane's own
   tone; m (out) = a hash shared by both sides of the joint (which joints open as cracks). M20 review fix (the planes read as soft, blotchy
   camouflage patches: the tilt blended over a fifth of every cell): the roll is a narrow BEVEL now — 7 % of a cell (≈ 2 m on a 30 m ridge
   plane), never under two pixels (fwidth) so it cannot alias — flat planes that meet in a rounded edge: softened precision, not mush. */
var GEO_FACET = 'vec4 geoFacet(vec2 p, out float m) { vec2 i = floor(p), f = fract(p), c1 = i, c2 = i; float d1 = 8.0, d2 = 8.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), c = i + g; float d = length(g + vec2(sdHash(c), sdHash(c + 31.7)) - f); if (d < d1) { d2 = d1; c2 = c1; d1 = d; c1 = c; } else if (d < d2) { d2 = d; c2 = c; } }' +
  ' vec2 t1 = vec2(sdHash(c1 + 7.1), sdHash(c1 + 13.3)) - 0.5, t2 = vec2(sdHash(c2 + 7.1), sdHash(c2 + 13.3)) - 0.5; float e = d2 - d1; m = sdHash(c1 + c2 + 0.37); return vec4(mix((t1 + t2) * 0.5, t1, smoothstep(0.0, max(0.07, fwidth(e) * 2.0), e)), e, sdHash(c1 + 3.9)); }';

/* M20 ROCK DETAIL (applyGeology spec.detail; owner 2026-09-27: "normal / detail information … macro + micro breakup"; review of the M20
   mountains round 1: with the grain out of the bump the close cliffs (CL2 / CL3) read as smooth plaster with blurry blotches). One tileable
   256² detail map, generated once on the CPU (no asset, no network): R = height, G / B = its slope along u / v, A = the crack / cavity mask —
   chipped rock at two orders (Voronoi chips ≈ 1.3 m and ≈ 0.5 m on a 9 m tile, each chip a tilted plane, some chip edges opened as cracks)
   over a fine two-octave roughness. Sampled twice at unrelated scales and angles, mip-mapped: the hardware filter fades it with distance
   and at grazing angles, so it never sparkles (the hashed grain in the derivative bump did), and two texture reads cost less than one of the
   noise lookups it replaces on a phone. */
var GEO_DET = null;
function geoDetailTexture(THREE) { if (GEO_DET) return GEO_DET; var S = 256, H = new Float32Array(S * S), CV = new Float32Array(S * S), d = new Uint8Array(S * S * 4), CH = [0, 0];
  function hh(i, j, Pu, Pv, sd) { i = ((i % Pu) + Pu) % Pu; j = ((j % Pv) + Pv) % Pv; var h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(sd, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vn(u, v, P, sd) { var i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j; fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv); var a = hh(i, j, P, P, sd), b = hh(i + 1, j, P, P, sd), c = hh(i, j + 1, P, P, sd), e = hh(i + 1, j + 1, P, P, sd); return a + (b - a) * fu + (c - a) * fv + (a - b - c + e) * fu * fv; }
  function chips(u, v, Pu, Pv, sd, slope) { var i = Math.floor(u), j = Math.floor(v), d1 = 81, d2 = 81, ai = 0, aj = 0, ax = 0, ay = 0, bi = 0, bj = 0;   /* periodic Voronoi (Pu × Pv cells a tile): the nearest two block centres */
    for (var y = -1; y <= 1; y++) for (var x = -1; x <= 1; x++) { var ci = i + x, cj = j + y, px = ci + 0.1 + 0.8 * hh(ci, cj, Pu, Pv, sd), py = cj + 0.1 + 0.8 * hh(ci, cj, Pu, Pv, sd + 7), dd = (px - u) * (px - u) + (py - v) * (py - v); if (dd < d1) { d2 = d1; bi = ai; bj = aj; d1 = dd; ai = ci; aj = cj; ax = px; ay = py; } else if (dd < d2) { d2 = dd; bi = ci; bj = cj; } }
    var e = Math.sqrt(d2) - Math.sqrt(d1), wd = 0.03 + 0.07 * hh(ai + bi, aj + bj, Pu, Pv, sd + 13), open = hh(ai + bi, aj + bj, Pu, Pv, sd + 11) > 0.7 ? 1 : 0;   /* three joints in ten open as cracks (varied width): broken crack lines, never a closed web */
    CH[0] = (hh(ai, aj, Pu, Pv, sd + 9) - 0.5) * 0.16 + (hh(ai, aj, Pu, Pv, sd + 3) - 0.5) * slope * (u - ax) + (hh(ai, aj, Pu, Pv, sd + 5) - 0.5) * slope * (v - ay); CH[1] = open * (1 - Math.min(1, e / wd)); }
  for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) { var u = x / S, v = y / S, wu = u + (vn(u * 5, v * 5, 5, 51) - 0.5) * 0.09, wv = v + (vn(u * 5, v * 5, 5, 53) - 0.5) * 0.09;   /* the joints wander (a warped lattice: no straight cell edges) */
    chips(wu * 5, wv * 3, 5, 3, 17, 0.6); var bh = CH[0], bc = CH[1], rg = 0, am = 0.5, f = 6;   /* blocks ≈ 1.8 × 3 m on the 9 m tile, each a tilted plane */
    for (var o = 0; o < 4; o++) { var n = 1 - Math.abs(2 * vn(u * f, v * f, f, 61 + o) - 1); rg += am * n * n; am *= 0.5; f *= 2; }   /* a ridged roughness down to the texel: weathered, pitted faces, not plaster */
    H[y * S + x] = 0.45 + bh * 0.5 + (rg - 0.33) * 0.42 - bc * 0.16; CV[y * S + x] = bc; }
  for (var y2 = 0; y2 < S; y2++) for (var x2 = 0; x2 < S; x2++) { var q = (y2 * S + x2) * 4, h = H[y2 * S + x2], du = (H[y2 * S + (x2 + 1) % S] - H[y2 * S + (x2 + S - 1) % S]) * S / 2, dv = (H[((y2 + 1) % S) * S + x2] - H[((y2 + S - 1) % S) * S + x2]) * S / 2;   /* slopes per tile */
    d[q] = Math.max(0, Math.min(255, Math.round(h * 255))); d[q + 1] = Math.max(0, Math.min(255, Math.round(128 + du * 4))); d[q + 2] = Math.max(0, Math.min(255, Math.round(128 + dv * 4))); d[q + 3] = Math.round(CV[y2 * S + x2] * 255); }
  var t = new THREE.DataTexture(d, S, S, THREE.RGBAFormat, THREE.UnsignedByteType); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; t.name = 'GEO_ROCK_DETAIL';
  GEO_DET = t; return t; }

export function applyGeology(THREE, mat, spec) {
  if (!mat || (PATCHED ? PATCHED.has(mat) : (mat.userData && mat.userData.surfaceDetail))) return mat;
  var S = Object.assign({ snowY: 1e5, strata: 2.6, major: 0, ledge: 0.32, joint: 4.5, fracture: 1, cleft: 1, macro: 0.16, grain: 0.07, bump: 1, lit: true, tier: 'HIGH', lod: [60, 900], bumpLod: [40, 260], relief: null }, spec || {});
  var LOW = S.tier === 'LOW', lit = S.lit && !!mat.isMeshStandardMaterial, MAJ = S.major || S.strata * 3.2;
  /* M19 (owner 2026-09-27: "mountains still not real enough — geological continuity, erosion, ledges, strata, broken rock shelves, more
     convincing rock material response, atmospheric depth without hiding them behind fog"). OPT-IN keys, so every other caller (the Veil
     mesa cliffs, the coast islands) compiles exactly the shader it had:
       dip: [dx, dz, fold m]   REGIONAL BEDDING — the beds tilt the same way across the whole range and fold gently (one analytic function of
                               world position, mirrored by ridgeSculpt's shelves), so strata run continuously from face to face;
                               dip[3..5] = fault blocks per ring (a whole number), throw m, ramp (fraction of a block);
       polarUV: true           joints / fractures / clefts take the ring bearing as their along-face axis (continuous across every facet);
       alpine: k               SNOW THAT BEHAVES — it lies on the flatter ground of the SMOOTH surface (the ledge tops and benches of the
                               sculpted shell, the high shoulders) in broken patches tens of metres across; the steep rock between stays
                               dark (the graphite / snow contrast is what reads as a mountain from far away);
       talus: [y0, y1]         the foot of every face breaks down into a paler, finer scree apron (the erosion product of the cliff above);
       cavity: k               relief recesses (gullies, clefts) darker and buttress ribs lighter as VALUE, so faces read in shadow too;
       varnish: k              dark, slightly glossy water / varnish streaks running down the faces (the rock's material response);
       relief3: [amp m, w m]   couloir streaks 40–90 m apart as value (their form is the sculpted shell's; amp is unused since the review fix);
       soft: k                 distant rock: the thin bedding / lip / joint lines fade by k, the bed zoning stays;
       nightSnow: { value }    a shared uniform: the snow's faint cool night glow (the owner module sets it on its time switch);
       aerial: [y0, y1, k]     HEIGHT-THINNED HAZE: the scene fog keeps its distance falloff but thins with altitude (× k at y1), so the
                               bases sit in the valley haze and the upper faces keep their form — depth without a white-out. */
  /* M19 review fix — TIER LAW: LOW must never get heavier than M18. On LOW the ridges take the plain M18 snow line (no alpine term), a
     LINEAR dip only (two multiply-adds: no fold / fault trig, no lithology), no relief orders, varnish, scree or cavity; macro.js passes no
     relief on LOW, so the LOW ridge shader is the M18 one minus its two relief fbm (≈ 76 → 52 noise-hash equivalents). The plain snow line
     drops its ledge-lip bonus for the alpine callers (on LOW it drew the same thin white dashes along the bed lips). */
  var AL = LOW ? 0 : (S.alpine || 0), SY = S.dip ? 'gSy' : 'vSdW.y', TAU = Math.PI * 2;
  /* M20 (owner 2026-09-27: "remove the low-poly look … erosion, strata, ledges, clefts"; reinforcement: "bias away from overuse of hard planar
     cliff logic … toward softer and more believable edge transitions, more natural breakup, more convincing material response"). Two more
     OPT-IN keys (the Veil mesa cliffs keep the shader they had), never on LOW (tier law):
       facets: [w m, h m, tilt, fade m]  FRACTURE PLANES — the face is broken into rock planes at varied angles: a domain-warped cellular field on
                               the face (cells w × h, stepping on the bedding) gives every plane its own tilt of the shading normal (± tilt) and
                               tone, the planes meet in SOFT creases (the two tilts blend over the last fifth of a cell: softened precision,
                               never a razor edge) and a few of the joints between them read as dark cracks (footprint-AA). A flat collision
                               face reads as a fractured wall that catches the Sun plane by plane — shading only, no vertex moves. HIGH adds a
                               second, finer order (≈ w / 3) near the eye. Unlit callers (the far ring) take the planes as value from facetSun.
       grainBump: k            the 0.3–1 m grain's share of the bump (default 0.35): on a big sunlit face the derivative bump of that grain
                               printed a per-pixel checker sparkle (V27 / the close cliffs) — the ridges keep it as value and a trace of relief;
       bend: m                 BENT, BROKEN STRATA — the beds swell and kink along the face (± m / 2) and the thin bedding lines and ledge lips run
                               in broken lengths, so strata never draw ruled lines across a face; the 8 m bed zoning is calmer.
     M20 review fix (2026-09-27): the along-face axis gUV picks x or z PER TRIANGLE from the derivative face normal, so on gentle ground (the
     island crowns: no polarUV) every triangle took a different coordinate and the fracture planes printed the mesh as a quilt of light / dark
     triangles. One more OPT-IN key:
       groundUV: true          GROUND-PLANE COORDINATES for low relief (the islands: every slope under ≈ 30°): gUV = world xz — continuous over
                               the whole surface, no per-triangle switch — the fracture cells lie on the ground plane, the joints turn with
                               every bed (a pavement of blocks, not stripes along one world axis), and cracks / clefts / relief read 2-D there.
     The facet tilt now rides a continuous frame (Frisvad's basis about +Y, singular only for a normal pointing straight down), so near-level
     rock (ledge tops, summits, crowns) no longer flips its frame. MED (a phone tier; the review counted ≈ +17 noise lookups on a shader the
     M19 review had trimmed): the facet cells skip their domain warp, the bed swell is one octave with no kink octave, the snow outcrops one
     lookup, no rivulets — and the far ring / islands take facets and bend on HIGH only (their callers). */
  /* M20 round 2 (review of round 1: "the fracture cells print rectangular panels with hard straight edges (V27); sunlit CL1 shows pale angular
     patches, short ruled ledge dashes and a pasted-on vertical sheen strip; with the grain out of the bump CL2 / CL3 read as smooth plaster with
     blurry blotches"; "the NEAR-ridge fragment cost on MED rose ≈ 31 % for little visible gain"). One more OPT-IN key, never on LOW:
       detail: [tile m, second tile m, slope gain, tone, crack dark, fade m]   the ROCK DETAIL map (geoDetailTexture) read twice at unrelated scales /
                               angles: chipped blocks, broken crack lines and a ridged, pitted roughness as value AND as a surface-gradient normal,
                               mip-filtered (no sparkle, fades with distance: value by `fade`, relief by 1.4 × `fade`). It replaces the hashed grain,
                               and near the eye it takes over from the ruled elements: the thin bedding lines and joints fade in only past 35–110 m,
                               the ledge lips / undercuts go ragged with the chips, the fall-line relief and the clefts ease off their bump inside
                               ≈ 170 m (their sunlit flanks were the vertical sheen strips) and the clefts wander with the bed warp. With it, the
                               HIGH second fracture-plane order (≈ 10 × 6 m cells: the rectangular panels) is gone and the big planes' edges go
                               ragged at chip scale; the varnish keeps most of its roughness and breaks along its length.
                               MED (a phone tier) with the map drops the master-fracture Voronoi, the second cleft octave and one fbm octave of the
                               macro tone and the snow line: ≈ 186 → 136 noise-hash equivalents + 2 texture reads, under the M19 MED ridge (142). */
  var DET = LOW || !S.detail ? null : S.detail, DMED = !!DET && S.tier === 'MED';   /* M20 detail map: [tile m, second tile m, slope gain, tone, crack dark, fade m] (see geoDetailTexture) */
  var BEND = LOW ? 0 : (S.bend || 0), FC = LOW ? null : (S.facets || null), FMED = S.tier === 'MED', GUV = !LOW && !!S.groundUV, VY = GUV ? 'gUV.y' : 'vSdW.y';
  /* v2 (M8C iteration 2): the first cut read as a crazed-glaze web (an isotropic Voronoi everywhere) with dotted "stitching" where thin ledge
     lips went through the derivative bump. Rock now reads in three orders, each only where it can resolve: MAJOR BEDS (≈ 8 m: value zoning
     and ledges — a lit lip above a ledge boundary, a shadowed undercut below it), MINOR BEDS (the bedding lines) with JOINTS that stop at the
     bedding planes and step from bed to bed (blocky jointing), and sparse long near-vertical MASTER FRACTURES. Only smooth fields (ledges,
     clefts, grain) enter the bump; the thin lines are value / roughness. */
  var body = ['#include <color_fragment>',
    'vec3 gAn = abs(normalize(cross(dFdx(vSdW), dFdy(vSdW)))); vec2 gUV = gAn.x > gAn.z ? vec2(vSdW.z, vSdW.y) : vec2(vSdW.x, vSdW.y);',   /* the face plane (from derivatives: works on flat-shaded and normal-less geometry): along-face horizontal × height */
    S.polarUV && S.reliefPolar ? 'gUV = vec2(atan(vSdW.x - ' + f(S.reliefPolar[0]) + ', vSdW.z - ' + f(S.reliefPolar[1]) + ') * ' + f(S.reliefPolar[2]) + ', vSdW.y);' : '',   /* M19: ring-continuous along-face axis */
    GUV ? 'gUV = vSdW.xz;' : '',   /* M20 review fix: groundUV (low relief) — continuous everywhere */
    S.dip ? 'float gSy = vSdW.y + vSdW.x * ' + f(S.dip[0]) + ' + vSdW.z * ' + f(S.dip[1]) + (LOW ? ';' : ' + ' + f(S.dip[2] || 0) + ' * sin(vSdW.x * 0.0093 + vSdW.z * 0.0061) * cos(vSdW.z * 0.0071 - vSdW.x * 0.0023);' + (S.dip[3] ? ' { float gFu = atan(vSdW.x, vSdW.z) * ' + f(S.dip[3] / TAU) + ' + ' + f(S.dip[3] / 2) + '; float gFi = floor(gFu); gSy += mix(sin(mod(gFi - 1.0, ' + f(S.dip[3]) + ') * 2.399 + 0.7), sin(mod(gFi, ' + f(S.dip[3]) + ') * 2.399 + 0.7), smoothstep(0.0, ' + f(S.dip[5] || 0.2) + ', gFu - gFi)) * ' + f(S.dip[4] || 0) + '; }' : '')) : '',   /* M19 regional dip + fold + FAULT BLOCKS (a whole number of blocks round the ring, the throw ramped over dip[5] of a block; ridgeSculpt.bedY mirrors it exactly); LOW: the linear dip only */
    'float gDist = length(cameraPosition - vSdW); float gNear = 1.0 - smoothstep(' + f(S.lod[0]) + ', ' + f(S.lod[1]) + ', gDist);',
    DET ? (lit ? '#ifdef FLAT_SHADED\nfloat gDny = gAn.y;\n#else\nfloat gDny = abs(normalize(vNormal * mat3(viewMatrix)).y);\n#endif\n' : 'float gDny = gAn.y;\n') + 'vec2 gDu = ' + (GUV ? 'gUV' : 'vec2(gUV.x, gUV.y + (length(vSdW.xz) - ' + f(S.reliefPolar ? S.reliefPolar[2] : 0) + ') * smoothstep(0.72, 0.95, gDny))') + ';' : '',   /* on the flat tops only, the v axis turns from height to the radial run (the map would streak along the ring there); on the faces v is the height itself (a slope-weighted blend sheared the map into fibrous streaks, V27) */
    DET ? 'vec4 gD1 = texture2D(uGeoDet, gDu / ' + f(DET[0]) + ' + vec2(0.37, 0.11)), gD2 = texture2D(uGeoDet, mat2(0.8, 0.6, -0.6, 0.8) * gDu / ' + f(DET[1]) + ' + vec2(0.71, 0.29)); float gDk = 1.0 - smoothstep(' + f(DET[5] * 0.4) + ', ' + f(DET[5]) + ', gDist);' : '',   /* two reads at unrelated scales and angles (the tile never lines up) */
    DET ? 'float gDh = (gD1.r - 0.45) + (gD2.r - 0.45) * 0.7, gDc = gD1.a * 0.6 + gD2.a * 0.4, gRag = (gD1.r - 0.45) * 1.6 * gDk;' : '',   /* chip faces a touch paler / darker, the open cracks dark */
    DET ? 'vec2 gDs = ((gD1.gb - 0.5) * ' + f(63.75 / DET[0]) + ' + mat2(0.8, -0.6, 0.6, 0.8) * (gD2.gb - 0.5) * ' + f(63.75 * 0.7 / DET[1]) + ') * ' + f(DET[2]) + ' * (1.0 - smoothstep(' + f(DET[5] * 0.6) + ', ' + f(DET[5] * 1.4) + ', gDist));' : '',   /* the detail's slope per metre (the second read's gradient turned back to the face axes) */
    'float gWarp = geoFbm(vSdW.xz * 0.012) * ' + (S.dip ? '3.0' : '7.0') + ' + geoFbm(vec2(gUV.x * 0.03, vSdW.y * 0.01)) * 2.0;',
    BEND ? 'gWarp += (' + (FMED ? 'geoN' : 'geoFbm') + '(vec2(gUV.x * 0.0085, ' + SY + ' * 0.0032)) - 0.5) * ' + f(BEND) + (FMED ? '' : ' + (geoN(vec2(gUV.x * 0.043, ' + SY + ' * 0.021)) - 0.5) * ' + f(BEND * 0.5)) + ';' : '',   /* M20 bend: the beds undulate along the face (≈ 120 m swells, ≈ 25 m kinks) — never a ruled line */
    'float gYM = (' + SY + ' + gWarp) / ' + f(MAJ) + '; float gBM = floor(gYM), gFM = fract(gYM); float gHM = sdHash(vec2(gBM, 7.3)); float gPx = max(fwidth(gYM) * ' + f(MAJ) + ', 1e-3);',   /* metres per pixel up the face */
    'float gTop = (1.0 - gFM) * ' + f(MAJ) + ', gBot = gFM * ' + f(MAJ) + '; float gLk = clamp(0.9 / gPx, 0.0, 1.0);',
    'float gLip = step(' + f(1 - S.ledge) + ', gHM) * (1.0 - smoothstep(0.0, 0.9, gBot' + (DET ? ' + gRag' : '') + ')) * gLk;',   /* this bed juts out over a ledge boundary at its base: a rounded, lit lip */
    'float gUnder = step(' + f(1 - S.ledge) + ', sdHash(vec2(gBM + 1.0, 7.3))) * (1.0 - smoothstep(0.0, ' + (DET ? '2.6, gTop - gRag' : '1.8, gTop') + ')) * gLk;',   /* ... and the bed below it sits in the undercut shadow */
    'float gYm = (' + SY + ' + gWarp) / ' + f(S.strata) + '; float gBm = floor(gYm), gFm = fract(gYm); float gHm = sdHash(vec2(gBm, 2.9));',
    'float gFw = fwidth(gYm); float gBedW = max(0.035, gFw * 1.5); float gBed = (1.0 - smoothstep(0.0, gBedW, min(gFm, 1.0 - gFm))) * clamp(0.035 / gBedW, 0.0, 1.0)' + (DET ? ' * smoothstep(35.0, 110.0, gDist)' : '') + ';',   /* footprint AA: a bedding line thinner than a pixel fades instead of aliasing */
    BEND ? 'gBed *= smoothstep(0.4, 0.78, geoN(vec2(gUV.x * 0.031, gBm * 0.73))) * (0.35 + 0.65 * sdHash(vec2(gBm, 6.1))); { float gLb = smoothstep(0.36, 0.66, geoN(vec2(gUV.x * 0.032, gBM * 1.31 + 5.0))); gLip *= gLb; gUnder *= gLb; }' : '',   /* M20: bedding lines run in broken lengths of ≈ 20–40 m and the ledge lips / undercuts come and go along the face — broken shelves, not stacked plates. Review fix (CL3 / F2: the lit faces still carried ruled lines): fewer lines, each bed its own strength, the lips in 10–25 m pieces */
    'float gRw = max(0.15, gPx * 1.5); float gH = gLip * smoothstep(0.0, gRw, gBot) * 0.55 - gUnder * smoothstep(0.0, gRw, gTop) * 0.7;',   /* the height meets 0 at the ledge boundary (a hard step there made the derivative bump sparkle in dotted lines) */
    'float gTone = 1.0 + (gHM - 0.5) * 0.26 + (gHm - 0.5) * 0.08 - gBed * 0.2 + gLip * 0.12 - gUnder * 0.36;',
    S.soft ? 'gTone = mix(gTone, 1.0 + (gHM - 0.5) * 0.26 + (gHm - 0.5) * 0.08, ' + f(S.soft) + ');' : '',   /* M19 soft: distant rock keeps its bed zoning but drops the thin bedding / lip lines (they aliased into stacked-paper stripes) */
    BEND ? 'gTone *= 1.0 - (gHM - 0.5) * 0.1;' : '',   /* M20: the 8 m bed zoning a third calmer (it banded every face in regular light / dark plates) */
    S.dip && !LOW ? '{ float gLy = (gSy + gWarp) / ' + f(MAJ * 3) + ', gLi = floor(gLy), gLf = fract(gLy); float gL0 = sdHash(vec2(gLi, 5.1)), gL1 = sdHash(vec2(gLi + 1.0, 5.1)); gTone *= 1.0 + (mix(gL0, gL1, smoothstep(0.82, 1.0, gLf)) - 0.5) * 0.3; }' : '',   /* M19 LITHOLOGY: every ~25 m package of beds its own shade (paler limestone / darker shale), dipping and faulted with the beds, so the strata read continuously from a distance */
    'float gRough = 1.0 + (sdHash(vec2(gBm, 2.1)) - 0.5) * 0.2 - gLip * 0.08;',
    DET ? 'gTone *= (1.0 + gDh * ' + f(DET[3]) + ' * gDk) * (1.0 - gDc * ' + f(DET[4]) + ' * gDk); gRough *= 1.0 + gDc * 0.12;' : ''];   /* M20 detail: chip faces a touch paler / darker, the open cracks dark and rough */
  if (!LOW) body.push(
    (GUV ? 'float gJa = sdHash(vec2(gBm, 4.7)) * 3.1416, gJu = dot(gUV, vec2(cos(gJa), sin(gJa)));' : '') + 'float gJx = (' + (GUV ? 'gJu' : 'gUV.x') + ' + (geoN(vec2(' + (GUV ? 'gJu' : 'gUV.x') + ' * 0.15, gBm * 1.7)) - 0.5) * 2.2) / ' + f(S.joint) + ' + sdHash(vec2(gBm, 1.3)) * 7.0; float gJd = min(fract(gJx), 1.0 - fract(gJx)) * ' + f(S.joint) + ';',
    'float gJw = max(0.05, fwidth(gJd) * 1.5); float gJoint = (1.0 - smoothstep(0.0, gJw, gJd)) * clamp(0.05 / gJw, 0.0, 1.0) * step(0.35, sdHash(vec2(floor(gJx), gBm + 0.5)))' + (DET ? ' * smoothstep(35.0, 110.0, gDist)' : '') + ';',   /* joints end at the bedding planes and step bed to bed */
    DMED ? 'float gCrack = 0.0;' : 'vec2 gV = geoVor(vec2(gUV.x * 0.05, ' + VY + (GUV ? ' * 0.05' : ' * 0.009') + ') + gWarp * 0.01); float gCd = gV.y - gV.x; float gCw = max(0.05, fwidth(gCd) * 1.5); float gCrack = (1.0 - smoothstep(0.0, gCw, gCd)) * clamp(0.05 / gCw, 0.0, 1.0) * smoothstep(0.42, 0.62, geoN(vec2(gUV.x * 0.021, ' + VY + (GUV ? ' * 0.021' : ' * 0.006') + ') + 5.3)) * ' + f(S.fracture) + ';',   /* sparse master fractures: long, near-vertical */   /* M20 round 2: MED with the detail map — its cracks carry the close range */
    'float gCl = geoN(vec2(' + (DET && !GUV ? '(gUV.x + gWarp * 4.0)' : 'gUV.x') + ' * 0.028, ' + (GUV ? 'gUV.y * 0.028 + 3.7' : '3.7') + ')) * 0.7 + ' + (DMED ? '0.15' : 'geoN(vec2(gUV.x * 0.07, ' + VY + (GUV ? ' * 0.07' : ' * 0.004') + ')) * 0.3') + '; float gCleft = pow(smoothstep(0.55, 0.95, gCl), 2.0) * ' + f(S.cleft) + ';',
    DET ? 'float gGrain = 0.0;' : 'float gGrain = (geoN(gUV * 1.1) * 0.6 + geoN(gUV * 3.3) * 0.4 - 0.5) * gNear;',   /* M20: the detail map replaces the hashed grain (value and bump) where it is on */
    'gH += -gCleft * 1.6' + (DET ? ' * (0.3 + 0.7 * smoothstep(40.0, 170.0, gDist))' : '') + ' + gGrain * ' + f(S.grainBump === undefined ? 0.35 : S.grainBump) + '; gTone *= (1.0 - gJoint * ' + (S.soft ? f(0.34 * (1 - S.soft)) : '0.34') + ') * (1.0 - gCrack * ' + (S.soft ? f(0.38 * (1 - S.soft)) : '0.38') + ') * (1.0 - gCleft * 0.42) * (1.0 + gGrain * ' + f(S.grain * 2) + '); gRough *= 1.0 + gJoint * 0.12 + gCrack * 0.12 + gCleft * 0.08 + gGrain * 0.1;');
  body.push('float gMacro = ' + (DMED ? 'geoN' : 'geoFbm') + '(vSdW.xz * 0.004 + vec2(vSdW.y * 0.002)) - 0.5; gTone *= 1.0 + gMacro * ' + f(S.macro * 2) + ';');
  if (FC) body.push('vec2 gFq = ' + (GUV ? 'gUV / vec2(' + f(FC[0]) + ', ' + f(FC[0] * 0.8) + ')' : 'vec2(gUV.x / ' + f(FC[0]) + ', (' + SY + ' + gWarp) / ' + f(FC[1]) + ')') + ';' + (FMED ? '' : ' gFq += vec2(geoN(gFq * 0.57 + 4.1), geoN(gFq * 0.57 - 2.3)) * 0.36 - 0.18;') + (DET ? ' gFq += vec2(gD2.r - 0.45, gD1.r - 0.45) * 0.24;' : ''),   /* the cells wander a little (review fix: ±0.4 of a cell rounded every plane into a blob; ±0.18 keeps near-straight fracture edges); MED: no warp */
    'float gFj; vec4 gFa = geoFacet(gFq, gFj); float gFk = 1.0 - smoothstep(' + f(FC[3] * 0.55) + ', ' + f(FC[3]) + ', gDist); vec2 gFt = gFa.xy * ' + f(FC[2] * 2) + ' * gFk;',
    FMED || !lit || DET ? '' : 'float gFj2; vec4 gFb = geoFacet(gFq * vec2(3.1, 3.4) + 17.3, gFj2); gFt += gFb.xy * ' + f(FC[2] * 0.5) + ' * (1.0 - smoothstep(90.0, 320.0, gDist));',   /* HIGH: a finer order of planes near the eye */
    'float gFcw = max(' + f(0.45 / FC[0]) + ', fwidth(gFa.z) * 1.5); float gFcr = (1.0 - smoothstep(0.0, gFcw, gFa.z)) * clamp(' + f(0.45 / FC[0]) + ' / gFcw, 0.0, 1.0) * step(0.8, gFj) * gFk;',   /* a fifth of the joints open as dark cracks (≈ 0.5 m, faded below a pixel; more of them read as a crazed web) */
    'gTone *= (1.0 + (gFa.w - 0.5) * 0.12 * gFk + gFt.y * 0.05) * (1.0 - 0.4 * gFcr); gRough *= 1.0 + gFcr * 0.1;',   /* each plane its own tone; planes turned to the sky a touch paler (review fix: ±12 % tone and a +16 % sky term read as milky patches — the light on the tilted plane carries it now) */
    lit ? '' : 'gTone *= 1.0 + (gFt.y * 0.7 + gFt.x * ' + f(0.35 * Math.sign((S.facetSun || [1])[0]) || 0.35) + ') * 0.55;');   /* unlit (baked) rock: the plane tilt as value — planes turned up and toward the Sun's side paler (the per-triangle derivative normal would print the mesh's triangles again) */
  /* M9 MACRO RELIEF (spec.relief = [amplitude m, width m]): the rock MASS — fall-line gullies and buttress ribs 10–40 m across, stretched down
     the slope and ridged, entering the bump at mountain distances (they are what a large face shows from the plaza). With smooth-shaded
     geometry this replaces the hard low-poly facet edges with continuous, believable relief; the gullies also carry a darker value. */
  var RU = S.reliefPolar ? 'atan(vSdW.x - ' + f(S.reliefPolar[0]) + ', vSdW.z - ' + f(S.reliefPolar[1]) + ') * ' + f(S.reliefPolar[2]) : 'gUV.x';   /* polar bearing (ring features): continuous across faces — the per-face projection jumps at every edge; the ±π wrap sits due south (the open sea, no ridge) */
  if (S.relief) body.push('vec2 gRp = vec2((' + RU + ') / ' + f(S.relief[1]) + ', ' + VY + ' / ' + f(S.relief[1] * (GUV ? 1 : 2.6)) + ') + vec2(gWarp * 0.02, 0.0); float gRn = geoFbm(gRp); float gRr = 1.0 - abs(2.0 * geoFbm(gRp * vec2(1.7, 0.8) + 3.1) - 1.0);',
    'float gRelief = (gRn * 0.55 + gRr * 0.45 - 0.5) * ' + f(S.relief[0]) + '; gTone *= 1.0 + (gRn - 0.5) * 0.34 + (gRr - 0.5) * 0.12;');
  else body.push('float gRelief = 0.0;');
  /* M19 second relief order: COULOIR STREAKS (40–90 m apart) — a ridged fbm stretched down the fall line; gCou is the couloir channel (0..1).
     M19 review fix: VALUE only now — as a bump (± relief3[0] m through the derivative normal) plus a blotch fbm it printed dark 80 m bruises on
     the summit faces; the couloirs' real form is in the sculpted shell (ridgeSculpt's spurs and couloirs). One fbm instead of three. */
  if (S.relief3) body.push('vec2 gRq = vec2((' + RU + ') / ' + f(S.relief3[1]) + ', ' + SY + ' / ' + f(S.relief3[1] * 3.4) + ') + vec2(gWarp * 0.01, 0.0); float gSp = 1.0 - abs(2.0 * geoFbm(gRq + 11.3) - 1.0); float gCou = smoothstep(0.8, 0.97, gSp); gTone *= 1.0 - 0.14 * gCou;');   /* a ridged fbm sits near 1 only along thin lines: those are the couloir channels */
  if (S.cavity && S.relief) body.push('float gCav = clamp(-gRelief / ' + f(S.relief[0]) + ' * 2.4, 0.0, 1.0), gRib = clamp(gRelief / ' + f(S.relief[0]) + ' * 2.4, 0.0, 1.0); gTone *= (1.0 - ' + f(S.cavity) + ' * gCav) * (1.0 + ' + f(S.cavity * 0.45) + ' * gRib);');
  /* M19 review fix (F4: a brick / window grid on the summit face): the streak noise took the major-bed index and an envelope that restarted
     at every 8.3 m bed, so each bed boundary cut a horizontal line through 2.4 m columns — a facade at 400–600 m. Streaks now run unbroken
     down the face (≈ 200 m tall cells, 3–4 m wide, wandering with the bed warp) and fade out by 650 m, where they could only alias. */
  if (S.varnish && !LOW) body.push('float gVar = smoothstep(0.62, 0.86, geoN(vec2(gUV.x * 0.13 + gWarp * 0.05, ' + SY + ' * 0.0045))) * (1.0 - smoothstep(220.0, 650.0, gDist)) * ' + f(S.varnish) + ';' + (DET ? ' gVar *= clamp(0.35 + 1.3 * (gD2.r - 0.3), 0.0, 1.0);' : '') + ' gTone *= 1.0 - 0.26 * gVar; gRough *= 1.0 - ' + (DET ? '0.12' : '0.3') + ' * gVar;');   /* M20 round 2 (CL1: a pasted-on vertical sheen strip): with the detail map the streak breaks up along its length and keeps most of its roughness */   /* dark, a little glossy */
  var MED = S.tier === 'MED';   /* M19 review fix: MED (a phone tier) takes a one-octave scree apron — its fbm edge and fine grain cost ≈ 13 noise-hash equivalents */
  if (S.talus) body.push('float gTal = 1.0 - smoothstep(' + f(S.talus[0]) + ', ' + f(S.talus[1]) + ', vSdW.y + (' + (MED ? 'geoN' : 'geoFbm') + '(vec2(gUV.x * 0.05, 1.7)) - 0.5) * ' + f((S.talus[1] - S.talus[0]) * 1.1) + ');',
    (MED ? 'float gScree = geoN(gUV * 2.3) * 0.8 + 0.1;' : 'float gScree = geoN(gUV * 2.3) * 0.5 + geoN(gUV * 6.1) * 0.3 + step(0.9, sdHash(floor(gUV * 1.7))) * 0.25 * (1.0 - smoothstep(35.0, 120.0, gDist));') + ' gTone = mix(gTone, 1.08 + (gScree - 0.5) * 0.3, gTal); gRough = mix(gRough, 1.12, gTal); gH *= 1.0 - gTal; gRelief *= 1.0 - 0.7 * gTal;');   /* the apron loses its beds and joints: loose, paler, matte */
  /* M19 review fix (the alpine snow rendered as scratch marks: a 1.4 m shelf-lip band became a 1–2 px white line at mid range, and snow keyed
     to the relief-BUMPED normal left thin claw-like slivers on near-vertical faces, the in-reach collision face included). Snow now reads the
     SMOOTH shell normal (the creased vertex normal, not the per-facet or bumped one), so it only lies where the sculpted surface itself turns
     flatter — benches, shoulders, the crowns above the snowline — and a low-frequency patch field (≈ 33 × 25 m, ragged at ≈ 12 m) biased
     into the gullies and couloirs and off the ribs breaks it into patches tens of metres across, with crisp anti-aliased edges; no term is
     narrower than several pixels. The low 'ledge' snow band is gone (away from the form it read as pasted-on blobs), and so is the
     bump-normal sky light (it printed dark bruise blotches). */
  if (S.snowY < 1e4 && AL) body.push('float gUp = gAn.y; float gAlt = smoothstep(' + f(S.snowY - 18) + ', ' + f(S.snowY + 14) + ', vSdW.y + (' + (DMED ? 'geoN' : 'geoFbm') + '(vSdW.xz * 0.02) - 0.5) * 36.0);',
    lit ? '#ifdef FLAT_SHADED\nfloat aNy = gAn.y;\n#else\nfloat aNy = max(normalize(vNormal * mat3(viewMatrix)).y, 0.0);\n#endif' : 'float aNy = gAn.y;',   /* the world-space SMOOTH normal's slope (view → world: the transpose of the view rotation). M20 round-2 review: SIGNED — the unsigned slope laid snow on the down-facing undersides of the crest caps and ledges (pale quads that read as windows in the rock at CL1); the ribbon's normals face out since M19, none of the NEAR ridge's under −0.5 */
    'float aP = geoN(vec2(gUV.x * 0.03, ' + SY + ' * 0.04)) * 0.7 + geoN(vec2(gUV.x * 0.085, ' + SY + ' * 0.1) + 3.7) * 0.3;' + (S.cavity && S.relief ? ' aP += gCav * 0.3 - gRib * 0.4;' : '') + (S.relief3 ? ' aP += gCou * 0.25;' : ''),   /* snow fills the gullies and couloirs, the ribs stand clear */
    'float aE = aNy + (aP - 0.5) * 0.3 - 0.68 + 0.14 * gAlt, aM = aP + 0.22 * gAlt - 0.46; float gSnow = smoothstep(-1.0, 1.0, aE / max(fwidth(aE), 0.012)) * smoothstep(-1.0, 1.0, aM / max(fwidth(aM), 0.012)) * gAlt * (0.74 + 0.26 * smoothstep(0.25, 0.75, aP));' + (S.talus ? ' gSnow *= 1.0 - gTal;' : ''));   /* crisp, anti-aliased edges (a pixel wide at most): patches, not smudges; thinner cover where the patch field is weak, so the bedding shows through and a snowfield is never one flat sheet */
  else if (S.snowY < 1e4) body.push('float gUp = gAn.y; float gSnow = smoothstep(0.55, 0.8, gUp' + (S.alpine ? '' : ' + gLip * 0.25') + ') * smoothstep(' + f(S.snowY - 18) + ', ' + f(S.snowY + 14) + ', vSdW.y + (geoFbm(vSdW.xz * 0.02) - 0.5) * 36.0);');
  else body.push('float gSnow = 0.0;');
  /* M20 SPRAY-WET ROCK (spec.wet = [u0, u1, full m, reach m, fall m]; needs polarUV: u0..u1 = the curtain's span along the ring in gUV.x
     metres): the rock behind and beside a big fall is soaked by its spray — darker, glossy and streaked by rivulets, fully wet across the
     curtain and `full` m past its edges, fading out by `reach` m, a little less high up; no snow there. The white water then reads against
     dark wet stone instead of a pale dry plane (the Veil cove, FW1 / PP / PC).
     M20 review fix (PP / PC means moved only −1…−7 %: the old zone measured from the fall's centre line, and the pale planes sit at the
     curtain's EDGES, 55–70 m off it, where the 28 → 80 m fade left a third of the effect; and a −50 % albedo under a −55 % roughness gave
     back in sky reflection what it took in diffuse): the zone now spans the curtain itself, the albedo drops up to 62 %, the roughness only
     30 % (a satin wet sheen, not a mirror), and on HIGH RIVULETS run down the fall line (≈ 1–2 m wide, 50 m long, wandering with the beds:
     darker, glossier, a shallow groove in the bump). */
  var WET = !LOW && S.wet && S.polarUV ? S.wet : null; if (WET) body.push('float gWr = max(0.0, max(' + f(Math.min(WET[0], WET[1])) + ' - gUV.x, gUV.x - ' + f(Math.max(WET[0], WET[1])) + '));',   /* metres along the ring past the curtain's edge (0 behind it) */
    'float gWet = (1.0 - smoothstep(' + f(WET[2]) + ', ' + f(WET[3]) + ', gWr)) * (0.6 + 0.4 * (1.0 - smoothstep(6.0, ' + f(WET[4]) + ', vSdW.y))) * (0.72 + 0.28 * geoN(vec2(gUV.x * 0.35, vSdW.y * 0.018)));',
    FMED ? 'float gRiv = 0.0;' : 'float gRiv = smoothstep(0.5, 0.82, geoN(vec2(gUV.x * 0.42 + gWarp * 0.06, vSdW.y * 0.02))) * gWet * gNear; gH -= gRiv * 0.18;',
    'gTone *= (1.0 - 0.62 * gWet) * (1.0 - 0.22 * gRiv); gRough *= (1.0 - 0.3 * gWet) * (1.0 - 0.25 * gRiv);');
  if (S.snowY < 1e4 && AL && FC) body.push('gSnow *= (1.0 - 0.7 * smoothstep(0.62, 0.82, geoN(vec2(gUV.x * 0.085, ' + SY + ' * 0.11) + 9.1)))' + (FMED ? ';' : ' * (0.84 + 0.16 * geoN(vSdW.xz * 0.05 + 3.3));'));   /* M20: rock breaks through the snowfields in ≈ 10 m outcrops and the cover thins and thickens (seen from above a shelf of snow read as one white paper cut-out) */
  if (WET) body.push('gSnow *= 1.0 - gWet;');
  body.push('diffuseColor.rgb *= mix(gTone, 1.0, gSnow * 0.9);', 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 0.97) * diffuse, gSnow * 0.88);');
  var frag = function (fs) {
    fs = fs.replace('#include <common>', '#include <common>\n' + HELPERS + '\n' + GEO_FUNCS + (FC ? '\n' + GEO_FACET : '')).replace('#include <color_fragment>', body.join('\n'));
    if (lit) { fs = fs.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(mix(roughnessFactor * gRough, 0.55, gSnow), 0.3, 1.0);');
      if (!LOW && S.bump > 0) fs = fs.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = geoBump(-vViewPosition, normal, gH * ' + f(S.bump) + ' * (1.0 - smoothstep(' + f(S.bumpLod[0]) + ', ' + f(S.bumpLod[1]) + ', gDist)) + gRelief * (1.0 - smoothstep(700.0, 1500.0, gDist))' + (DET ? ' * (0.3 + 0.7 * smoothstep(40.0, 170.0, gDist))' : '') + ');');   /* M20 round 2: with the detail map the 24 m fall-line relief eases off near the eye (CL1: its sunlit ribs read as pasted-on vertical sheen strips at 50 m) */
      if (FC) fs = fs.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ vec3 gWn = normalize(normal * mat3(viewMatrix)); float gWa = 1.0 / max(1.0 + gWn.y, 0.001), gWc = -gWn.x * gWn.z * gWa; vec3 gWt = vec3(1.0 - gWn.x * gWn.x * gWa, -gWn.x, gWc), gWb = vec3(gWc, -gWn.z, 1.0 - gWn.z * gWn.z * gWa); normal = normalize(mat3(viewMatrix) * normalize(gWn + gWt * gFt.x + gWb * gFt.y)); }'); }   /* M20 fracture planes: the plane tilt in a world frame round the normal, back to view space. Review fix: Frisvad's basis about +Y — continuous for every normal but straight down (cross(up, n) flipped on level rock) */
    if (DET && lit) fs = fs.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ vec3 gWn = normalize(normal * mat3(viewMatrix)); vec3 gTu = ' + (GUV ? 'vec3(1.0, 0.0, 0.0)' : 'normalize(vec3(vSdW.z, 0.0, -vSdW.x) + 1e-5)') + ', gTv = ' + (GUV ? 'vec3(0.0, 0.0, 1.0)' : 'vec3(0.0, 1.0, 0.0) + gDny * normalize(vec3(vSdW.x, 0.0, vSdW.z) + 1e-5)') + '; vec3 gG = gDs.x * gTu + gDs.y * gTv; gG -= gWn * dot(gWn, gG); normal = normalize(mat3(viewMatrix) * normalize(gWn - gG)); }');   /* M20 detail: the chip slopes tilt the normal (surface-gradient bump in world space, from the map's own slopes: smooth under magnification, no screen-derivative blocks) */
    if (DET) fs = fs.replace('#include <common>', '#include <common>\nuniform sampler2D uGeoDet;');
    if (S.nightSnow && S.snowY < 1e4 && lit) fs = fs.replace('#include <common>', '#include <common>\nuniform float uGeoNightSnow;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.68) * gSnow * uGeoNightSnow;');   /* M19 moonlit snow: at night the snow patches keep a faint glow, so the range reads by its snow as real mountains do under the Moon (an equal-channel grey: the Moon light carries the tint) */
    if (S.aerial) fs = fs.replace('#include <fog_fragment>', ['#ifdef USE_FOG', '#ifdef FOG_EXP2', '  float fogFactor = 1.0 - exp(- fogDensity * fogDensity * vFogDepth * vFogDepth);', '#else', '  float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);', '#endif',
      '  fogFactor *= mix(1.0, ' + f(S.aerial[2]) + ', smoothstep(' + f(S.aerial[0]) + ', ' + f(S.aerial[1]) + ', vSdW.y));', '  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);', '#endif'].join('\n'));   /* M19 height-thinned haze */
    return fs; };
  var prevOBC = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey; var key = 'mahworld-geo-' + [S.snowY < 1e4 ? Math.round(S.snowY) : 'x', S.strata, S.ledge, S.fracture, S.cleft, S.macro, S.grain, S.bump, lit ? 'L' : 'U', LOW ? 'lo' : 'hi', S.lod.join('x'), S.bumpLod.join('x'), MAJ, S.joint, S.relief ? 'r' + S.relief.join('x') + (S.reliefPolar ? 'p' + S.reliefPolar.join('x') : '') : 'r0', 'v2b'].join('_') + (S.dip || S.polarUV || AL || S.talus || S.cavity || S.varnish || S.relief3 || S.aerial || S.soft || S.nightSnow ? '_m19_' + JSON.stringify([S.dip, S.polarUV, AL, S.talus, S.cavity, S.varnish, S.relief3, S.aerial, S.soft, !!S.nightSnow, 'b']) : '') + (FC || BEND || WET || GUV || S.grainBump !== undefined ? '_m20_' + JSON.stringify([FC, BEND, FMED, S.facetSun || 0, S.grainBump, WET, GUV, 'r2']) : '') + (DET ? '_det_' + JSON.stringify(DET) : '');
  mat.onBeforeCompile = function (sh, r) { if (prevOBC) prevOBC.call(this, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSdW; varying vec3 vSdN;').replace('#include <project_vertex>', ['#include <project_vertex>',
      '{ vec4 sdP = vec4(transformed, 1.0);', '#ifdef USE_INSTANCING', '  sdP = instanceMatrix * sdP;', '#endif', '  vSdW = (modelMatrix * sdP).xyz; vSdN = vec3(0.0, 1.0, 0.0); }'].join('\n'));
    if (S.nightSnow) sh.uniforms.uGeoNightSnow = S.nightSnow; if (DET) sh.uniforms.uGeoDet = { value: geoDetailTexture(THREE) }; sh.fragmentShader = frag(sh.fragmentShader); };
  mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|' + key; };
  mat.userData.surfaceDetail = { kind: 'GEOLOGY', key: key }; if (PATCHED) PATCHED.add(mat); mat.needsUpdate = true;
  return mat;
}

/* M8C · CRYSTAL — the MAHWORLD crystal family (class shards, crowns, roof diamonds). A cut stone is not one flat value: each facet sits at
   its own angle to the light and the eye, the body looks deep face-on and bright at grazing (Fresnel), and faint internal fracture planes
   catch light inside it. Per-facet tone / roughness from the facet's world orientation (derivatives: flat-shaded and merged geometry work),
   a face-on depth darkening with a bright grazing rim, and sparse inclusion planes. Value / roughness only — the class hue is untouched.
   M20 (owner 2026-09-27: "Each crystal should feel intentional. Improve: refraction illusion, facet differentiation, edge highlights, embedded
   lighting, grounding … Try to remove sharp objects and edges, even with the diamonds. There should be more of a transition into the magic
   power look"): every crystal gains a REFRACTION ILLUSION — a view-dependent inner light band from the view ray bent through the facet
   (it slides across the stone as the eye moves, strongest face-on) — on HIGH / MED. spec.soft (geometry from auraForms.softCrystalGeometry,
   carrying aCrys = tip / edge / base) adds the SOFT CRYSTAL: an EMBEDDED core light in the class colour (brightest looking into the thick
   body), a class-coloured FRESNEL EDGE HIGHLIGHT easing to white only at the grazing rim, glowing rounded edges, TIPS that thin into the
   class glow (alpha falls, emission rises — no razor point) and a silhouette that softens at grazing, plus CONTACT DARKENING where a ground
   crystal enters the ground (aCrys.base). The class colour is scaled by its brightest channel (never clipped, never averaged with another
   hue); spec.glow = { value } scales the light (callers raise it at night).
   M20 review fix (2026-09-27: the floating gems' points and grazing outline faded so far that at 50–110 m a gem read as a pale pebble —
   "Not MUSHY"): the fade is tunable per crystal — spec.tipFade (how far a point thins, default 0.72), spec.rimFade (the grazing outline,
   default 0.5) and spec.fadeNear = [d0, d1] (m: the fade acts in full within d0 of the eye and not at all beyond d1, so a crystal keeps its
   whole outline at mid / far range and only dissolves into light close up); spec.facetGlow (0..1, default 0) lets the facet tone carry the
   emission as well, so a glowing crystal keeps its cut at night instead of a flat bright shape; spec.facetLight (0..1, default 0) does the same
   for the sky reflection (the face-on facets look into the dark body, the turned ones catch the sky). Defaults leave every other crystal as it was. */
export function applyCrystal(THREE, mat, spec) {
  if (!mat || !mat.isMeshStandardMaterial || (PATCHED ? PATCHED.has(mat) : (mat.userData && mat.userData.surfaceDetail))) return mat;
  var S = Object.assign({ facet: 0.34, depth: 0.3, rim: 0.4, veins: 0.12, refract: 0.18, tier: 'HIGH', soft: false, tipFade: 0.72, rimFade: 0.5, fadeNear: null, facetGlow: 0, facetLight: 0 }, spec || {}); var LOW = S.tier === 'LOW', SOFT = !!S.soft, GLOW = S.glow || { value: 1 };
  var body = ['#include <color_fragment>',
    'vec3 cN = normalize(cross(dFdx(vSdW), dFdy(vSdW))); vec3 cV = normalize(cameraPosition - vSdW); float cFr = pow(1.0 - clamp(abs(dot(cN, cV)), 0.0, 1.0), 3.0);',
    'float cF = sdHash(floor(cN.xz * 5.0 + cN.y * 3.0) + 0.37);',   /* facet id from its orientation: every cut plane keeps its own value */
    'float cTone = (1.0 + (cF - 0.5) * ' + f(S.facet) + ') * (1.0 - ' + f(S.depth) + ' * (1.0 - cFr)) + cFr * ' + f(S.rim) + ';'];
  if (!LOW && S.veins > 0) body.push('float cVp = dot(vSdW, normalize(vec3(0.62, 1.0, 0.41))) * 1.7; float cVw = max(fwidth(cVp), 1e-3) * 1.5; float cVd = 0.5 - abs(fract(cVp) - 0.5); float cVein = (1.0 - smoothstep(0.0, cVw + 0.02, cVd)) * clamp(0.05 / (cVw + 0.03), 0.0, 1.0) * step(0.62, sdHash(vec2(floor(cVp + 0.5), 4.1))); cTone *= 1.0 + cVein * ' + f(S.veins) + ';');
  if (!LOW && S.refract > 0) body.push('vec3 cRd = refract(-cV, cN, 0.66); float cIn = 0.5 + 0.5 * sin(dot(cRd, vec3(2.3, 5.1, 1.7)) * 2.6 + dot(vSdW, vec3(0.21, 0.09, 0.15)) + cF * 3.0); cTone *= 1.0 + (cIn - 0.5) * ' + f(S.refract * 2.0) + ' * (1.0 - cFr);');   /* M20 refraction illusion: an inner light band that slides with the view */
  if (SOFT) body.push('cTone *= mix(1.0, 0.3, vCrys.z);');   /* contact darkening where a ground crystal enters the ground (a scalar, folded into the tone) */
  body.push('diffuseColor.rgb *= cTone;');
  if (SOFT) body.push('#ifdef FLAT_SHADED', 'float cSf = 1.0 - abs(dot(cN, cV));', '#else', 'float cSf = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));', '#endif',
    'cSoftFam = diffuseColor.rgb / max(max(diffuseColor.r, diffuseColor.g), max(diffuseColor.b, 1e-3));',   /* the class hue at full brightness (scaled by its brightest channel) */
    'cSoftFr = cSf * cSf; cSoftTip = smoothstep(0.5, 1.0, vCrys.x); cSoftEdge = vCrys.y; cSoftBase = vCrys.z; cSoftCore = (1.0 - cSf) * (1.0 - cSf) * (1.0 - cSoftTip) * (0.75 + 0.25 * cIn0());');
  var rough = '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * (0.55 + 0.9 * cF), 0.03, 0.45);';
  var soft = ['#include <aomap_fragment>',
    '{ vec3 cE = cSoftFam * (cSoftCore * 0.25 + cSoftTip * 0.9 + cSoftEdge * 0.35) + mix(cSoftFam, vec3(1.0), 0.05 + 0.2 * cSoftFr) * cSoftFr * 0.4;',   /* embedded core light · tips burning into glow · lit edges · the class rim easing to white only at grazing */
    '  totalEmissiveRadiance += cE * uCrysGlow * (1.0 - 0.85 * cSoftBase);',
    S.facetGlow > 0 ? '  totalEmissiveRadiance *= mix(1.0, clamp(cTone, 0.35, 1.6), ' + f(S.facetGlow) + ');' : '',   /* M20 review: the facets carry the glow (a cut stone at night, not a flat bright shape) */
    S.facetLight > 0 ? '  reflectedLight.indirectSpecular *= mix(1.0, clamp(cTone, 0.35, 1.6), ' + f(S.facetLight) + ');' : '',   /* M20 review: … and the sky reflection (a smooth metal-glass prism mirrored one even horizon on every face) */
    '  float cNearK = ' + (S.fadeNear ? '1.0 - smoothstep(' + f(S.fadeNear[0]) + ', ' + f(S.fadeNear[1]) + ', length(vViewPosition))' : '1.0') + ';',   /* M20 review: the fade may act only close to the eye */
    '  diffuseColor.a *= (1.0 - cSoftTip * ' + f(S.tipFade) + ' * cNearK) * (1.0 - smoothstep(0.6, 1.0, sqrt(cSoftFr)) * ' + f(S.rimFade) + ' * cNearK); }'].join('\n');   /* the point thins to light, the silhouette softens at grazing */
  var prevOBC = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey; var key = 'mahworld-crystal-' + [S.facet, S.depth, S.rim, S.veins, LOW ? 'lo' : 'hi', 'r' + S.refract, SOFT ? 'soft' : 'cut', 'f' + S.tipFade + '-' + S.rimFade + '-' + (S.fadeNear ? S.fadeNear.join('-') : 'all') + '-' + S.facetGlow + '-' + S.facetLight].join('_');
  mat.onBeforeCompile = function (sh, r) { if (prevOBC) prevOBC.call(this, sh, r); if (SOFT) sh.uniforms.uCrysGlow = GLOW;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSdW;' + (SOFT ? ' attribute vec3 aCrys; varying vec3 vCrys;' : '')).replace('#include <project_vertex>', ['#include <project_vertex>',
      '{ vec4 sdP = vec4(transformed, 1.0);', '#ifdef USE_INSTANCING', '  sdP = instanceMatrix * sdP;', '#endif', '  vSdW = (modelMatrix * sdP).xyz; }' + (SOFT ? ' vCrys = aCrys;' : '')].join('\n'));
    var pars = '#include <common>\nvarying vec3 vSdW;\n' + HELPERS.split('\n').slice(1).join('\n') + (SOFT ? '\nvarying vec3 vCrys; uniform float uCrysGlow; vec3 cSoftFam; float cSoftFr, cSoftTip, cSoftEdge, cSoftBase, cSoftCore;' : '');
    var b = body.join('\n').replace('cIn0()', !LOW && S.refract > 0 ? 'cIn' : '0.5');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', pars).replace('#include <color_fragment>', b).replace('#include <roughnessmap_fragment>', rough); if (SOFT) sh.fragmentShader = sh.fragmentShader.replace('#include <aomap_fragment>', soft); };
  mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|' + key; };
  mat.userData.surfaceDetail = { kind: 'CRYSTAL', key: key, soft: SOFT }; if (PATCHED) PATCHED.add(mat); mat.needsUpdate = true;
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
    if (s.kind === 'DRAIN') return '{ float d = ' + d + '; float k = (1.0 - smoothstep(' + w + ', ' + w + ' + rdAAr, d)) * clamp(2.0 * ' + w + ' / rdAAr, 0.0, 1.0); float bq = rdTh * ' + f(s.r) + ' * 9.0; float bar = mix(step(0.5, fract(bq)), 0.5, clamp(fwidth(bq) * 2.0 - 0.5, 0.0, 1.0)); rdDrain = max(rdDrain, k); rdBar = max(rdBar, k * bar); }';
    if (s.kind === 'STEP') return '{ float d = rdR - ' + f(s.r) + '; float lit = (1.0 - smoothstep(0.0, ' + w + ' + rdAAr, -d)) * step(d, 0.0) * clamp(' + w + ' / rdAAr, 0.0, 1.0); float sh = (1.0 - smoothstep(0.0, ' + w + ' * 2.0 + rdAAr, d)) * step(0.0, d) * clamp(2.0 * ' + w + ' / rdAAr, 0.0, 1.0); rdStepLit = max(rdStepLit, lit); rdStepSh = max(rdStepSh, sh); }';
    return '{ float d = ' + d + '; rdInlay = max(rdInlay, (1.0 - smoothstep(' + w + ', ' + w + ' + rdAAr, d)) * clamp(2.0 * ' + w + ' / rdAAr, 0.0, 1.0)); }'; }).join('\n');   /* M11: every seam keeps its average value once it is finer than a pixel (coverage = width / footprint) instead of aliasing into streaks at grazing view */
  var body = [
    '#include <color_fragment>',
    'vec2 rdP = vSdW.xz - vec2(' + f(o.cx) + ', ' + f(o.cz) + '); float rdR = length(rdP); float rdTh = atan(rdP.y, rdP.x) / 6.2831853 + 0.5;',
    'float rdNear = 1.0 - smoothstep(' + f(lod[0]) + ', ' + f(lod[1]) + ', length(cameraPosition - vSdW)); float rdAAr = max(fwidth(rdR), 1e-4) * 1.25;',
    'float rdZ0 = 0.0, rdZ1 = 1e6, rdRW = 3.0, rdArc = 3.0, rdSt = 0.0, rdJW = 0.02, rdZi = 99.0; vec4 rdFam = vec4(1.0, 1.0, 1.0, 0.0);',
    zoneCode,
    'float rdRR = (rdR - rdZ0) / rdRW; float rdRing = floor(rdRR); float rdFr = fract(rdRR); float rdRc = rdZ0 + (rdRing + 0.5) * rdRW;',
    'float rdN = max(6.0, floor(6.2831853 * rdRc / rdArc + 0.5)); float rdA = rdTh * rdN + rdSt * mod(rdRing, 2.0); float rdSeg = floor(rdA); float rdFa = fract(rdA);',
    'float rdDR = min(rdFr, 1.0 - rdFr) * rdRW; float rdDA = min(rdFa, 1.0 - rdFa) * 6.2831853 * rdRc / rdN; float rdD = min(rdDR, rdDA);',
    'float rdAA = max(fwidth(rdD), 1e-4) * 1.25; float rdJ = (1.0 - smoothstep(rdJW * 0.5, rdJW * 0.5 + rdAA, rdD)) * rdNear * clamp(rdJW / rdAA, 0.0, 1.0);',   /* M11: a joint finer than the pixel footprint fades to its coverage — the far deck no longer aliases into white / dark streaks */
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
  if (!LOW) nrm.push('{ float bw = max(rdJW * 2.5, 0.05); float k = 0.22 * (1.0 - smoothstep(0.0, bw, rdD)) * rdNear * clamp(bw / rdAA, 0.0, 1.0); vec2 rad = rdP / max(rdR, 1e-3); vec2 tan2 = vec2(-rad.y, rad.x);',
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
