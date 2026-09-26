/* MAHWORLD WORLD PIVOT · PASS 1 :: CLOUD BODIES (owner sky direction 2026-09-25: bright fantasy daylight, long layered billowing clouds,
   warm/light upper exposure, cooler underside, luminous edges toward the Sun, strong depth layering — never blobs, circles or flat sheets).
   Each registry cloud is a CLUSTER of camera-facing puffs: a flattened base row gives the cloud a calm shelf, a taller crown row gives the
   billowing top. One instanced draw per layer; the puffs are lit in the shader, not by scene lights.
   M8D CLOUD REALISM (owner 2026-09-26: the clouds read as cotton balls — same-size round crisp puffs just above the rooftops):
     · SHAPES: one procedural atlas of four noise-eroded puff shapes (cauliflower cumulus · soft billow · flat base · wisp) replaces the
       single radial-lobe puff, so silhouettes break up and edges go soft where real clouds are thin;
     · LIGHT: the whole BODY is lit from the key's side (a per-cloud centre, not per puff), each puff self-shadows by marching its own
       density toward the light (two taps on HIGH, one on MED, none on LOW), bases are flat and darker, thin edges scatter a silver lining
       that strengthens when the camera looks toward the light;
     · DEPTH: aerial perspective by distance and a horizon fade by view elevation (distant bases dissolve into the horizon haze);
     · SCALE: skewed size distributions (many small, few large) and a camera-relative ring of TOWERING cumulus behind the far massifs
       (towerCluster) that keeps clear of the Sun and Moon sectors.
   Puffs are re-sorted back-to-front a few times per second (instances are drawn in buffer order), so nearer bodies always cover farther ones.
   Tiers scale the puff count (HIGH 1 · MED 0.7 · LOW 0.45). Presentation only; the shared optics in sky.js are unchanged. */

var VERT = [
  'attribute vec4 aPuff;',              /* x: height inside the cloud 0..1 · y: atlas shape (integer part 0..3) + seed (fraction) · z: alpha · w: flatten (base puffs) */
  'attribute vec2 aCloud;',             /* x: cloud base world y · y: cloud vertical extent (m) */
  'attribute vec4 aCentre;',            /* xyz: the cloud body's centre (world) · w: its radius (m) — the whole body is lit from the key's side */
  'uniform vec3 uLightWorld;',
  'varying vec2 vUv; varying vec2 vCell; varying vec4 vPuff; varying float vDist; varying float vH; varying vec3 vRel; varying vec2 vLs; varying float vElev; varying float vFwd; varying float vBelow; varying float vShell; varying float vFade;',
  'void main() {',
  '  float seed = fract(aPuff.y), shape = floor(aPuff.y + 0.001); bool flip = seed > 0.5;',
  '  vUv = vec2(flip ? 1.0 - uv.x : uv.x, uv.y); vPuff = vec4(aPuff.x, seed, aPuff.z, aPuff.w);',
  '  vCell = vec2(mod(shape, 2.0) * 0.5, (1.0 - floor(shape * 0.5)) * 0.5);',   /* 2 × 2 atlas cell (canvas rows are flipped into uv) */
  '  vec3 centre = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
  '  float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz);',
  '  vec3 toCam = normalize(cameraPosition - centre);',
  '  float below = smoothstep(0.2, 0.7, -toCam.y); vBelow = below; float isPlate = step(1.5, aPuff.w), isBase = step(0.5, aPuff.w) * (1.0 - isPlate); sy *= 1.0 + below * (0.6 + 0.9 * min(aPuff.w, 1.0));',
  '  float under = smoothstep(0.03, 0.35, -toCam.y); vFade = mix(mix(1.0, 1.0 - 0.85 * under, isBase), under, isPlate);',   /* M9: the plate appears as the base puffs fade, once the body is overhead */   /* seen from below, puffs spread vertically so the underside closes into one flat grey surface (thin stacked puffs read as slices) */
  '  vec3 viewUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);',
  '  vec3 camUp = normalize(mix(vec3(0.0, 1.0, 0.0), viewUp, smoothstep(0.35, 0.85, abs(toCam.y))));',   /* upright near the horizon (flat base, crown up); camera-facing when looked at steeply from below/above so puffs never foreshorten into stacked discs */
  '  vec3 camRight = normalize(cross(camUp, toCam)); camUp = normalize(cross(toCam, camRight));',
  '  float rot = (1.0 - step(0.25, aPuff.w)) * (fract(seed * 7.13) - 0.5) * 0.9, cr = cos(rot), sr = sin(rot); vec2 q = vec2(position.x * sx, position.y * sy);',
  '  vec3 tX = camRight * cr + camUp * sr, tY = camUp * cr - camRight * sr;',   /* M10: crown puffs turn up to ±26° in their own plane, so the four atlas shapes never stand in the same pose */
  '  vec3 world = centre + tX * q.x + tY * q.y;',
  '  if (isPlate > 0.5) { world = centre + mat3(instanceMatrix) * vec3(position.x, 0.0, position.y); vBelow = 1.0; }',   /* the base plate lies flat in the body's own frame */
  '  vH = clamp((world.y - aCloud.x) / max(aCloud.y, 1.0), 0.0, 1.0);',   /* shade by height inside the WHOLE cloud: no per-puff banding */
  '  vRel = ((centre - aCentre.xyz) + (world - centre) * 0.35 * (1.0 - below)) / max(aCentre.w, 1.0);',   /* body-side light is taken at the PUFF centre (plus a little in-puff gradient seen side-on): per-fragment it painted the same gradient on every puff, which stacked into plates seen from below */
  '  vec3 Lw = normalize(uLightWorld); vLs = vec2(dot(Lw, tX) * (flip ? -1.0 : 1.0), dot(Lw, tY)) * (1.0 - 0.85 * below);',   /* the key projected into this puff's texture plane: the self-shadow march direction */
  '  vec3 vd = world - cameraPosition; float vl = max(length(vd), 1.0); vElev = vd.y / vl; vFwd = max(dot(vd / vl, Lw), 0.0);',
  '  vDist = length(cameraPosition - centre);',
  '  vec3 dO = (centre - aCentre.xyz) / vec3(max(aCentre.w, 1.0), max(aCloud.y * 0.5, 1.0), max(aCentre.w, 1.0)); vShell = length(dO - toCam * dot(dO, toCam));',   /* M9: the puff's place in the body's SILHOUETTE (ellipsoid-normalised, projected across the view): 0 = covered core, ~1 = the visible outline */
  '  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);',
  '}'].join('\n');

var FRAG = [
  'uniform sampler2D uMap; uniform vec3 uTop, uShade, uRim, uHaze, uLightWorld; uniform float uOpacity, uRimK, uHazeNear, uHazeFar, uHazeMax, uBaseDark, uShadowK, uTime; uniform vec2 uHor;',
  'varying vec2 vUv; varying vec2 vCell; varying vec4 vPuff; varying float vDist; varying float vH; varying vec3 vRel; varying vec2 vLs; varying float vElev; varying float vFwd; varying float vBelow; varying float vShell; varying float vFade;',
  'vec4 cellTex(vec2 u) { return texture2D(uMap, vCell + clamp(u, 0.006, 0.994) * 0.5); }',
  'void main() {',
  '  vec2 u = vUv; u.x += 0.01 * sin(vPuff.y * 40.0 + uTime * 0.04);',   /* a slow boil */
  '  float shell = smoothstep(0.3, 0.85, vShell);',   /* M9 (owner: clouds still read as stacked pancakes): a puff INSIDE the body must not draw its own outline */
  '  vec4 tex = cellTex(u); float dens = tex.a; float a = dens * vPuff.z * uOpacity * mix(1.0, smoothstep(0.0, 0.85, dens), vBelow) * mix(smoothstep(0.0, 0.6, dens), 1.0, shell * (1.0 - vBelow * 0.7)) * vFade; if (a < 0.004) discard;',   /* interior puffs fade in softly and merge; shell puffs keep the crisp cauliflower silhouette */
  '  float occl = 0.0;',
  '#if CLOUD_TAPS > 0',
  '  occl = cellTex(u + vLs * 0.06).r * 0.55;',   /* thickness between this point and the key, inside the puff */
  '#if CLOUD_TAPS > 1',
  '  occl += cellTex(u + vLs * 0.16).r * 0.45;',
  '#else',
  '  occl *= 1.6;',
  '#endif',
  '#endif',
  '  vec3 Lw = normalize(uLightWorld); float side = dot(normalize(vRel + vec3(0.0, 0.2, 0.0)), Lw);',   /* which side of the whole BODY faces the key */
  '  float sunK = clamp(0.5 + 0.5 * side, 0.0, 1.0); sunK = sunK * sunK * (3.0 - 2.0 * sunK); float h = smoothstep(0.0, 0.9, vH);',
  '  float lit = sunK * (1.0 - uShadowK * clamp(occl * mix(0.3, 1.0, shell), 0.0, 1.0)) * (0.6 + 0.4 * h) + 0.2 * h;',   /* the in-puff self-shadow belongs to the body surface; inside the body it painted one gradient per puff */
  '  float baseK = 1.0 - smoothstep(0.0, 0.3, vH);',   /* flat, darker bases */
  '  lit = mix(lit, 0.22 + 0.18 * (1.0 - clamp(tex.r, 0.0, 1.0)) + 0.12 * sunK, vBelow); baseK = mix(baseK, 0.7, vBelow);',   /* seen from below, the whole underside shares one tone (lighter where thin): stacked puffs at different heights otherwise outline each other as discs */
  '  vec3 col = mix(uShade, uTop, clamp(lit, 0.0, 1.0)) * (1.0 - uBaseDark * baseK * (1.0 - 0.5 * sunK)) * (0.95 + 0.1 * tex.r * shell);',
  '  vec3 bodyCol = mix(uShade, uTop, clamp(0.35 + 0.35 * sunK + 0.2 * h, 0.0, 1.0)) * (1.0 - uBaseDark * baseK * 0.6);',
  '  col = mix(col, bodyCol, (1.0 - smoothstep(0.1, 0.65, dens)) * 0.65 * (1.0 - 0.6 * shell));',   /* M10: a lobe's thin rim takes the body's mean tone, so a shaded lobe in front of a lit one no longer draws a crisp disc (the outer silhouette keeps its edge) */
  '  float edge = 1.0 - smoothstep(0.06, 0.55, dens);',   /* thin parts scatter the key forward: a silver lining, strongest toward the light */
  '  col += uRim * uRimK * edge * shell * (0.1 + 1.6 * pow(vFwd, 5.0)) * (0.35 + 0.65 * sunK) * (1.0 - 0.7 * vBelow);',   /* the silver lining rims the BODY silhouette, not every puff */
  '  float fogK = smoothstep(uHazeNear, uHazeFar, vDist) * uHazeMax; float horK = 1.0 - smoothstep(uHor.x, uHor.y, vElev);',   /* aerial perspective + the horizon haze swallowing distant bases */
  '  col = mix(col, uHaze, clamp(fogK + horK * 0.55, 0.0, 0.92)); a *= (1.0 - horK * 0.6) * (1.0 - fogK * 0.3);',
  '  gl_FragColor = vec4(col, a);',
  '  #include <colorspace_fragment>',
  '}'].join('\n');

/* One shared procedural puff ATLAS (2 × 2 cells, alpha = coverage, red = thickness): 0 cauliflower cumulus · 1 soft billow · 2 flat base ·
   3 wisp. Built once, shared by every cloud layer (reference-counted), deterministic. */
var ATLAS = {};
function h2(x, y, s) { var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn(x, y, s) { var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); var a = h2(ix, iy, s), b = h2(ix + 1, iy, s), c = h2(ix, iy + 1, s), d = h2(ix + 1, iy + 1, s); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
function fbm(x, y, s) { var v = 0, a = 0.5, f = 1, t = 0; for (var o = 0; o < 5; o++) { v += a * vn(x * f, y * f, s + o * 17); t += a; a *= 0.5; f *= 2.03; } return v / t; }
var SHAPES = [   /* blobs: [x, y, radius, weight] in the cell's -1..1 space · cut: flat-bottom height (only the BASE shape is cut: stacked crown puffs with flat bottoms read as horizontal slices) · warp / erode / billow: outline turbulence · soft: rim width */
  { blobs: [[0, -0.3, 0.5, 1], [-0.42, -0.32, 0.34, 0.9], [0.44, -0.34, 0.32, 0.85], [-0.25, -0.02, 0.34, 0.8], [0.24, 0.02, 0.36, 0.85], [0, 0.26, 0.3, 0.75], [0.5, -0.08, 0.24, 0.55], [-0.55, -0.1, 0.22, 0.5], [-0.1, 0.46, 0.18, 0.45], [0.28, 0.36, 0.2, 0.5]], cut: -1.2, warp: 0.2, erode: 0.36, billow: 0.55, soft: 0.12, freq: 4.6 },
  { blobs: [[0, -0.12, 0.6, 1], [-0.4, 0, 0.38, 0.8], [0.38, 0.04, 0.36, 0.8], [0.02, 0.32, 0.32, 0.7], [-0.22, -0.38, 0.38, 0.55]], cut: -1.2, warp: 0.16, erode: 0.32, billow: 0.4, soft: 0.2, freq: 3.6 },
  { blobs: [[0, -0.18, 0.6, 1], [-0.55, -0.2, 0.36, 0.85], [0.56, -0.18, 0.36, 0.85], [-0.25, -0.05, 0.36, 0.7], [0.28, -0.04, 0.34, 0.7]], cut: -0.5, warp: 0.18, erode: 0.4, billow: 0.25, soft: 0.2, freq: 3.8, sy: 1.5 },
  { blobs: [[0, 0, 0.55, 0.8], [-0.45, 0.06, 0.36, 0.6], [0.46, -0.05, 0.34, 0.6], [0.2, 0.12, 0.3, 0.4]], cut: -0.95, warp: 0.5, erode: 0.9, billow: 0, soft: 0.42, freq: 2.6, sy: 1.3 }
];
/* density = a SMOOTH SUM of gaussian blobs (lobes merge into one mass instead of reading as separate balls), domain-warped and eroded by
   fBm, with billow noise raising cauliflower bumps on the upper rim. Alpha = coverage (soft rim); red = thickness with internal relief —
   the shader's self-shadow marches this, so the lit side and the deep side separate inside every puff. */
function puffAtlas(THREE, cell) {
  var key = 'c' + cell; if (ATLAS[key]) { ATLAS[key].refs++; return ATLAS[key].tex; }
  var N = cell * 2, c = document.createElement('canvas'); c.width = c.height = N; var g = c.getContext('2d'), im = g.createImageData(N, N), px = im.data;
  for (var v = 0; v < 4; v++) { var S = SHAPES[v], ox = (v % 2) * cell, oy = Math.floor(v / 2) * cell, sy = S.sy || 1;
    for (var y = 0; y < cell; y++) for (var x = 0; x < cell; x++) {
      var u = (x + 0.5) / cell * 2 - 1, w = 1 - (y + 0.5) / cell * 2;
      var uw = u + (fbm(u * 1.6 + 3.1 * v, w * 1.6, 311 + v) - 0.5) * S.warp, ww = w + (fbm(u * 1.6 + 5.7, w * 1.6 + 9.2 * v, 733 + v) - 0.5) * S.warp;
      var D = 0; for (var l = 0; l < S.blobs.length; l++) { var B = S.blobs[l], dx = (uw - B[0]) / B[2], dy = (ww - B[1]) * sy / B[2]; D += B[3] * Math.exp(-(dx * dx + dy * dy) * 1.7); }
      var n = fbm(u * S.freq + v * 7.3, w * S.freq, 91 + v), nb = 1 - Math.abs(2 * fbm(u * S.freq * 1.7 + 1.3, w * S.freq * 1.7 - 2.1 * v, 57 + v) - 1);
      var top = Math.max(0, Math.min(1, (ww + 0.2) / 0.7)), dd = D - 0.5 + (n - 0.5) * S.erode * (1 - 0.5 * top) + (nb - 0.62) * S.billow * top;
      dd *= Math.max(0, Math.min(1, (ww - S.cut) / 0.16));                                     /* flatter bottom */
      var border = Math.max(0, Math.min(1, (1 - Math.max(Math.abs(u), Math.abs(w))) / 0.06));  /* zero alpha at the cell border (no mip bleed) */
      var al = Math.max(0, Math.min(1, dd / S.soft)); al = al * al * (3 - 2 * al) * border; var th = Math.max(0, Math.min(1, (D - 0.35) / 0.9 + (nb - 0.6) * 0.45 + (n - 0.5) * 0.2));
      var o = ((oy + y) * N + ox + x) * 4; px[o] = Math.round(255 * th); px[o + 1] = Math.round(255 * n); px[o + 2] = 255; px[o + 3] = Math.round(255 * al); } }
  g.putImageData(im, 0, 0); var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.premultiplyAlpha = false;
  ATLAS[key] = { tex: t, refs: 1 }; return t;
}
function releaseAtlas(tex) { for (var k in ATLAS) if (ATLAS[k].tex === tex && --ATLAS[k].refs <= 0) { tex.dispose(); delete ATLAS[k]; } }

/* Deterministic cluster layout for one cloud of footprint length L (metres). Returns puffs relative to the cloud origin.
   M10 (owner: close-range clouds still read as a chain of equal round balls): a real cumulus is a flat base shelf with a few CONVECTIVE
   CELLS rising out of it — one dominant, the others lower, each a mound of billows that shrink as they climb, set in DEPTH (not one row),
   with small ragged FRINGE puffs on the flanks. Sizes now vary inside a body (core billows three to four times the fringe), so the outline
   breaks into turrets, shoulders and gaps instead of a string of beads. Puff count stays about the same (tier-scaled as before). */
export function cloudCluster(L, rnd, crown) {
  var k = crown === undefined ? 1 : crown, puffs = [], nb = Math.max(5, Math.min(13, Math.round(L / 15))), baseTop = -1e9;
  for (var i = 0; i < nb; i++) { var u = nb === 1 ? 0.5 : i / (nb - 1), prof = Math.pow(Math.sin(Math.PI * (0.08 + u * 0.84)), 0.75), rad = L * (0.075 + 0.06 * prof) * (0.8 + rnd() * 0.4);
    var B = { x: (u - 0.5) * L * 0.88 + (rnd() - 0.5) * L * 0.04, y: rad * 0.28, z: (rnd() - 0.5) * L * 0.26, w: rad * 2.4, h: rad * 1.15, height: 0.1, flat: 1 }; puffs.push(B); baseTop = Math.max(baseTop, B.y); }   /* base shelf, in depth */
  var nc = L < 90 ? 1 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 2.2), cx = [], dom = Math.floor(rnd() * nc);
  for (var c = 0; c < nc; c++) cx.push(((c + 0.5) / nc - 0.5) * L * 0.72 + (rnd() - 0.5) * L * 0.16);
  for (var c2 = 0; c2 < nc; c2++) { var st = c2 === dom ? 1 : 0.4 + rnd() * 0.45, cw = L * (0.12 + 0.1 * st), ch = L * (0.16 + 0.34 * st) * k, cz = (rnd() - 0.5) * L * 0.14, lean = (rnd() - 0.5) * cw * 0.5, lv = st > 0.8 ? 3 : 2;
    for (var j = 0; j < lv; j++) { var t = (j + 0.5) / lv, per = j === 0 ? 2 : 1 + (rnd() < 0.5 * (1 - t) ? 1 : 0);
      for (var q = 0; q < per; q++) { var r = cw * (1.0 - 0.45 * t) * (0.75 + rnd() * 0.45), off = per === 1 ? (rnd() - 0.5) * cw * 0.4 : (q - 0.5) * cw * (0.9 + rnd() * 0.3);
        puffs.push({ x: cx[c2] + off + lean * t, y: baseTop + r * 0.35 + ch * t * 0.8, z: cz + (rnd() - 0.5) * cw * 0.9, w: r * 2.1, h: r * 2.0, height: 0.4 + 0.55 * t * st, flat: 0 }); } }
    var cr = cw * (0.42 + rnd() * 0.2); puffs.push({ x: cx[c2] + lean + (rnd() - 0.5) * cw * 0.3, y: baseTop + ch * 0.86 + cr * 0.3, z: cz + (rnd() - 0.5) * cw * 0.4, w: cr * 2.1, h: cr * 2.0, height: st > 0.8 ? 1 : 0.75, flat: 0 }); }   /* the cell's cauliflower cap */
  var nf = 1 + Math.floor(rnd() * 2.5);
  for (var f = 0; f < nf; f++) { var sg = f % 2 ? 1 : -1, fr = L * (0.035 + rnd() * 0.03); puffs.push({ x: sg * L * (0.3 + rnd() * 0.16), y: baseTop + fr * (0.6 + rnd() * 1.4), z: (rnd() - 0.5) * L * 0.22, w: fr * 2.2, h: fr * 1.8, height: 0.4, flat: 0 }); }   /* ragged fringe on the flanks */
  return puffs;
}

function legacyCluster(L, rnd, crown) {   /* the M9 layout, kept ONLY to draw from the shared sky stream exactly as before (see createCloudBodies) */
  var n = Math.max(5, Math.min(16, Math.round(L / 13))), puffs = [], k = crown === undefined ? 1 : crown;
  for (var i = 0; i < n; i++) { var u = n === 1 ? 0.5 : i / (n - 1), prof = Math.pow(Math.sin(Math.PI * (0.08 + u * 0.84)), 0.75); var rad = L * (0.09 + 0.07 * prof) * (0.85 + rnd() * 0.3);
    puffs.push({ x: (u - 0.5) * L * 0.86 + (rnd() - 0.5) * L * 0.04, y: rad * 0.28, z: (rnd() - 0.5) * L * 0.16, w: rad * 2.3, h: rad * 1.25, height: 0.1, flat: 1 });   /* base shelf */
    if (prof > 0.35) puffs.push({ x: (u - 0.5) * L * 0.8 + (rnd() - 0.5) * L * 0.06, y: rad * (0.75 + prof * 0.9 * k), z: (rnd() - 0.5) * L * 0.14, w: rad * 2.1, h: rad * 2.1, height: 0.55 + prof * 0.45, flat: 0 });   /* billowing crown */
    if (prof > 0.72 && rnd() < 0.7 * k) { var cr = rad * (0.55 + rnd() * 0.25); puffs.push({ x: (u - 0.5) * L * 0.78 + (rnd() - 0.5) * L * 0.08, y: rad * (1.35 + prof * 1.05 * k), z: (rnd() - 0.5) * L * 0.1, w: cr * 2.1, h: cr * 2.05, height: 1, flat: 0 }); } }   /* irregular cauliflower caps */
  return puffs;
}

/* M8D: a TOWERING cumulus (congestus) of base width W and height H: a flat base shelf, a rising column of billows that narrows upward and
   leans a little with wind shear, cauliflower caps and one or two ragged wisps on the flanks. Every puff names its atlas shape (v). */
export function towerCluster(W, H, rnd) {
  var puffs = [], nb = 4 + Math.floor(rnd() * 3);
  for (var i = 0; i < nb; i++) { var u = i / (nb - 1), bw = W * (0.34 + rnd() * 0.12); puffs.push({ x: (u - 0.5) * W * 0.72 + (rnd() - 0.5) * W * 0.06, y: H * 0.05, z: (rnd() - 0.5) * W * 0.1, w: bw, h: bw * 0.34, height: 0.04, flat: 1, v: 2 }); }
  var lean = (rnd() - 0.5) * W * 0.22, levels = 5 + Math.floor(rnd() * 3);
  for (var l = 0; l < levels; l++) { var t = (l + 0.5) / levels, wl = W * (0.66 - 0.36 * t) * (0.9 + rnd() * 0.2), per = t < 0.5 ? 3 : (t < 0.8 ? 2 : 1);
    for (var k = 0; k < per; k++) { var off = per === 1 ? 0 : (k / (per - 1) - 0.5) * wl * 0.62, r = wl * (per === 1 ? 0.62 : 0.48) * (0.85 + rnd() * 0.3);
      puffs.push({ x: lean * t + off + (rnd() - 0.5) * wl * 0.12, y: H * (0.1 + 0.72 * t) + r * 0.15, z: (rnd() - 0.5) * W * 0.12, w: r * 2.0, h: r * 1.9, height: 0.1 + 0.8 * t, flat: 0, v: rnd() < 0.6 ? 0 : 1 }); } }
  var caps = 2 + Math.floor(rnd() * 3), topW = W * 0.3;
  for (var c = 0; c < caps; c++) { var cr = topW * (0.35 + rnd() * 0.25); puffs.push({ x: lean + (rnd() - 0.5) * topW, y: H * (0.86 + rnd() * 0.08) - cr * 0.2, z: (rnd() - 0.5) * W * 0.06, w: cr * 2.1, h: cr * 2.0, height: 1, flat: 0, v: 0 }); }
  var wisps = 1 + Math.floor(rnd() * 2);
  for (var s = 0; s < wisps; s++) { var sg = rnd() < 0.5 ? -1 : 1, wr = W * (0.16 + rnd() * 0.1); puffs.push({ x: sg * W * (0.42 + rnd() * 0.12), y: H * (0.2 + rnd() * 0.3), z: (rnd() - 0.5) * W * 0.1, w: wr * 2.6, h: wr * 1.1, height: 0.3, flat: 0.5, v: 3 }); }
  return puffs;
}

function pickShape(P, style, r) { return P.flat ? (style === 'STRATUS' && r() < 0.15 ? 3 : 2) : (P.height >= 1 ? 0 : (style === 'STRATUS' ? (r() < 0.7 ? 1 : 3) : (r() < 0.55 ? 0 : 1))); }   /* atlas shape per puff */
function privateRnd(x, z, k) { var s = (Math.imul(Math.round(x * 64) | 0, 73856093) ^ Math.imul(Math.round(z * 64) | 0, 19349663) ^ Math.imul(k | 0, 83492791)) >>> 0 || 1; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function angleGap(a, b) { var d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; }

export function createCloudBodies(ctx, L, opts) {
  var THREE = ctx.THREE; var tierScale = opts.tierScale || 1; var rnd = opts.rnd || Math.random; var own = [];
  var clouds = [], puffs = [], style = L.style || 'CUMULUS', tower = style === 'TOWER';
  var count = Math.max(4, Math.round((L.count || 20) * (opts.countScale || 1))), avoid = opts.avoid || [], avoidR = (L.avoid_deg || 0) * Math.PI / 180;
  for (var k = 0; k < count; k++) { var s0 = L.size_m ? L.size_m[0] : 60, s1 = L.size_m ? L.size_m[1] : 140, len = s0 + Math.pow(rnd(), L.size_pow || 1) * (s1 - s0);   /* M8D: skewed — many small, a few large */
    var x0 = (rnd() - 0.5) * opts.spread, z0 = opts.originZ + (rnd() - 0.5) * opts.spread, ang0 = 0, rr = 0;
    if (L.ring_m) { ang0 = rnd() * Math.PI * 2; for (var tries = 0; tries < 24 && avoid.some(function (az) { return angleGap(ang0, az) < avoidR; }); tries++) ang0 = rnd() * Math.PI * 2;   /* M8D: towers keep clear of the Sun / Moon sectors */
      rr = L.ring_m[0] + rnd() * (L.ring_m[1] - L.ring_m[0]); x0 = Math.cos(ang0) * rr; z0 = opts.originZ + Math.sin(ang0) * rr; }   /* M8B: horizon banks sit on a ring around the world */
    var cl = { x: x0, z: z0, x0: x0, z0: z0, ang0: ang0, rr: rr, y: (L.alt_m || 150) + (rnd() - 0.5) * 24, yaw: rnd() * Math.PI, drift: 0.7 + rnd() * 0.6, len: len, puffs: [] };
    /* M10: the cell layout draws from a PRIVATE positional stream; the shared sky stream is advanced exactly as the M9 layout drew from it
       (legacyCluster + its per-puff seed / shape draws), so every body keeps its accepted place, size, height, yaw and drift and the other
       layers are untouched — only each body's inner form changes. */
    var pr = tower ? rnd : privateRnd(x0, z0, k + 1), crownK = L.crown === undefined ? 1 : L.crown;
    if (!tower) { var legacy = legacyCluster(len, rnd, crownK), keepL = Math.max(4, Math.round(legacy.length * tierScale)); for (var lp = 0; lp < legacy.length; lp++) { if (lp % Math.max(1, Math.round(legacy.length / keepL)) !== 0 && legacy.length > keepL) continue; rnd(); pickShape(legacy[lp], style, rnd); } }
    var raw = tower ? towerCluster(len, L.tower_h_m ? L.tower_h_m[0] + rnd() * (L.tower_h_m[1] - L.tower_h_m[0]) : len * 0.8, rnd) : cloudCluster(len, pr, crownK); var keep = Math.max(4, Math.round(raw.length * tierScale));
    if (tower) cl.yaw = ang0 + Math.PI / 2;   /* a tower's long axis runs along the ring: seen broadside from the world */
    cl.extent = Math.max.apply(Math, raw.map(function (P) { return P.y + P.h * 0.5; })) + len * 0.02; cl.rad = Math.max(len * 0.5, cl.extent * 0.55);
    if (L.max_top_m && cl.y + cl.extent > L.max_top_m) cl.y = L.max_top_m - cl.extent;   /* keeps every body below the HALO deck (240 m): no cloud ever pokes up through the upper-realm floor */
    for (var p = 0; p < raw.length; p++) { if (p % Math.max(1, Math.round(raw.length / keep)) !== 0 && raw.length > keep) continue; var P = raw[p]; P.cloud = cl; P.seed = pr();
      if (P.v === undefined) P.v = pickShape(P, style, pr);
      cl.puffs.push(P); puffs.push(P); }
    /* M9 BASE PLATE (owner: clouds read as stacked pancakes / cards from below): ONE horizontal soft card per body at its base, the body's
       footprint, aligned with its yaw. Seen from below it takes over from the base puffs (a row of upright base puffs seen end-on stacked
       into a tower of ellipses), so the underside reads as one flat, darker surface; from the side it is edge-on and invisible. */
    var bx0 = 1e9, bx1 = -1e9, bz = 0, by = 1e9; cl.puffs.forEach(function (Q) { bx0 = Math.min(bx0, Q.x - Q.w * 0.42); bx1 = Math.max(bx1, Q.x + Q.w * 0.42); bz = Math.max(bz, Math.abs(Q.z) + Q.w * 0.3); if (Q.flat) by = Math.min(by, Q.y - Q.h * 0.3); });
    if (by < 1e8) { var PL = { x: (bx0 + bx1) / 2, y: by, z: 0, w: (bx1 - bx0), h: bz * 2, height: 0, flat: 2, v: 1, plate: true, cloud: cl, seed: Math.abs(Math.sin(cl.x0 * 12.9898 + cl.z0 * 78.233) * 43758.5453) % 1 };   /* a positional hash: the plate never draws from the shared sky stream (the composition stays put) */ cl.puffs.push(PL); puffs.push(PL); }
    clouds.push(cl); }
  var geo = new THREE.PlaneGeometry(1, 1); own.push(geo); var aPuff = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 4), 4); aPuff.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aPuff', aPuff); var aCloud = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 2), 2); aCloud.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aCloud', aCloud);
  var aCentre = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 4), 4); aCentre.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aCentre', aCentre);
  var taps = opts.taps === undefined ? 2 : opts.taps, tex = puffAtlas(THREE, opts.cell || 256);
  var mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true, fog: false, side: THREE.DoubleSide, toneMapped: true, defines: { CLOUD_TAPS: taps },
    uniforms: { uMap: { value: tex }, uTop: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uRim: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uLightWorld: { value: new THREE.Vector3(0, 1, 0) }, uOpacity: { value: 1 }, uRimK: { value: 0.6 },
      uHazeNear: { value: 260 }, uHazeFar: { value: 1250 }, uHazeMax: { value: 0.7 }, uHor: { value: new THREE.Vector2(0.0, 0.16) }, uBaseDark: { value: 0.18 }, uShadowK: { value: 0.55 }, uTime: { value: 0 } } });
  own.push(mat);
  var mesh = new THREE.InstancedMesh(geo, mat, puffs.length); mesh.name = 'SKY_' + L.id; mesh.frustumCulled = false; mesh.userData.noMerge = true; mesh.renderOrder = opts.renderOrder || 4; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.userData.cloudSilhouette = { kind: tower ? 'LIT_TOWER_CLUSTER' : 'LIT_PUFF_CLUSTER', rectangular: false, feathered: true, clouds: clouds.length, puffs: puffs.length, tier_scale: tierScale, shapes: 'ATLAS_4_NOISE_ERODED', self_shadow_taps: taps, style: style };
  var _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _qp = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0); var order = puffs.map(function (p, i) { return i; }); var sortClock = 1e9;
  function write(camPos) {  /* recompute world puff positions from the drifting cloud origins; with camPos also re-sort back-to-front */
    for (var i = 0; i < puffs.length; i++) { var P = puffs[i], c = P.cloud, cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); P.wx = c.x + P.x * cs - P.z * sn; P.wy = c.y + P.y; P.wz = c.z + P.x * sn + P.z * cs; P.d2 = camPos ? (P.wx - camPos.x) * (P.wx - camPos.x) + (P.wy - camPos.y) * (P.wy - camPos.y) + (P.wz - camPos.z) * (P.wz - camPos.z) : 0; }
    if (camPos) order.sort(function (a, b) { return puffs[b].d2 - puffs[a].d2; });   /* back-to-front */
    for (var j = 0; j < order.length; j++) { var Q = puffs[order[j]]; _p.set(Q.wx, Q.wy, Q.wz); if (Q.plate) { _qp.setFromAxisAngle(_up, -Q.cloud.yaw); _s.set(Q.w, 1, Q.h); _m.compose(_p, _qp, _s); } else { _s.set(Q.w, Q.h, 1); _m.compose(_p, _q, _s); } mesh.setMatrixAt(j, _m); aPuff.setXYZW(j, Q.height, Q.v + Q.seed * 0.998, 0.5 + 0.34 * (1 - Q.flat * 0.25), Q.flat); aCloud.setXY(j, Q.cloud.y - Q.cloud.len * 0.02, Q.cloud.extent); aCentre.setXYZW(j, Q.cloud.x, Q.cloud.y + Q.cloud.extent * 0.45, Q.cloud.z, Q.cloud.rad); }
    mesh.instanceMatrix.needsUpdate = true; aPuff.needsUpdate = true; aCloud.needsUpdate = true; aCentre.needsUpdate = true; }
  write(null);
  function setLook(look) { var U = mat.uniforms; U.uTop.value.set(look.top); U.uShade.value.set(look.shade); U.uRim.value.set(look.rim); U.uHaze.value.set(look.haze); U.uOpacity.value = look.opacity; U.uRimK.value = look.rimK;
    U.uHazeNear.value = look.hazeNear !== undefined ? look.hazeNear : 260; U.uHazeFar.value = look.hazeFar !== undefined ? look.hazeFar : 1250; U.uHazeMax.value = look.hazeMax !== undefined ? look.hazeMax : 0.7;
    U.uHor.value.set(look.hor ? look.hor[0] : 0.0, look.hor ? look.hor[1] : 0.16); U.uBaseDark.value = look.baseDark !== undefined ? look.baseDark : 0.18; U.uShadowK.value = look.shadowK !== undefined ? look.shadowK : 0.55; }
  /* camPos: {x,y,z} (ctx.cameraPos()) for the back-to-front sort · lightDir: the world direction of the active key (Sun by day, Moon by night) */
  function tick(dt, t, camPos, lightDir) { mat.uniforms.uTime.value = t || 0; if (lightDir) mat.uniforms.uLightWorld.value.set(lightDir[0], lightDir[1], lightDir[2]).normalize();
    sortClock += dt || 0; var sortNow = sortClock > 0.25 && camPos; write(sortNow ? camPos : null); if (sortNow) sortClock = 0; }
  function dispose() { if (mesh.parent) mesh.parent.remove(mesh); own.forEach(function (o) { try { o.dispose(); } catch (e) { } }); own = []; releaseAtlas(tex); }
  return { mesh: mesh, mat: mat, clouds: clouds, puffs: puffs, setLook: setLook, tick: tick, write: write, dispose: dispose };
}
