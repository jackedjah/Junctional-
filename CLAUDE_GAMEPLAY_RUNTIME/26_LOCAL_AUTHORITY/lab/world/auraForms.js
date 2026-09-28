/* MAHWORLD M14 :: DIMENSIONAL AURA FORMS (owner 2026-09-27: "The aura should NOT always be circular … circular, soft rings, cube-like
   forms, hexagon-like 3D forms, diamond-like forms … clearly NON-INTERACTABLE … not cluttered … softer / fainter when closer to people or
   near the ground, stronger / cleaner when suspended farther in space … should not just 'sit there' … more presence, more energy texture,
   more atmosphere, more dimensionality … fade behavior").
   Ghost LIGHT VOLUMES beside the flat spectral auras (aura.js): a tilted soft RING, a CUBE, a HEX prism and a DIAMOND (hexagonal
   bipyramid). Each is drawn as light, not matter: its faces almost clear, its silhouette glowing by facing ratio, its edges burning as fine
   lines with a slow shimmer running along them, and all of its edges visible through it (double-sided, additive) so it reads as a volume.
   Every form turns slowly on its own tilted axis, bobs, breathes and fades in and out on a long cycle, so none just sits there.
   FADE: near the ground and near the viewer a form goes faint (it is never in anyone's face); high and far it is clean and strong.
   Colour law: the instance tint is a class colour (or pearl white); the shimmer runs between the tint and white — no new hue.
   Host safety: pure light (additive, no depth write), no collider, no interaction; placements keep every form's lowest point at least
   3.4 m above its ground or outside the host reach (callers choose; formsSafe() below reports the clearance).
   Cost: ONE instanced draw for every form in a field — the four shapes share one small vertex buffer (≈ 0.3 k vertices) and each
   instance keeps only its own shape (the others collapse outside the clip volume). LOW tier: fewer ring segments, no edge shimmer.
   M19 (owner 2026-09-27: "Continue the ambient aura-shape system: rings, cubes, diamonds, hexagonal / polyhedral forms, other tasteful 3D
   magical figures. Rules: clearly non-interactable; sparse; stronger / firmer higher in space; faint near ground / humans; visually
   integrated; no random pickup appearance. Use class-color balance rather than defaulting to purple."):
     · two more figures in the same buffer — an OCTA (the regular octahedron: the MAH MATCH diamond sigil in three dimensions) and an
       ICOSA (the icosahedron). (A star tetrahedron was tried first and dropped: turning, it keeps reading as a six-pointed star, a symbol
       the world should not hang in its sky.)
     · the height law is steeper: a form is faint to 26 m of lift and only reaches full line weight, glow and a faint glass face ~120 m+
       up ("firmer higher"); it also stays faint within 40 m of the viewer;
     · the class tint is kept as a class colour: it is normalised by its brightest channel and eased toward equal-channel white only a
       little (the old 40–60 % white mix turned LEAN crimson pink and TITAN blue lavender against the night sky);
     · a black tint (0x000000) means CYCLE: the form turns slowly through all five classes, holding each and passing through white between
       them (never an RGB blend of two far hues) — for places that belong to every class (MAH MATCH).
   LOW: the new figures are not in the LOW buffer (a LOW OCTA draws as a DIAMOND, an ICOSA as a HEX) and the ring has 32 segments (was 40),
   so LOW does less vertex work per form than before.
   M20 (owner 2026-09-27: "remove … redundant aura … visually noisy effects"; "Try to remove sharp objects and edges, even with the diamonds.
   There should be more of a transition into the magic power look"): the forms stop reading as UI stickers — a ring is a wider, softer band
   that breaks into two or three drifting arcs (never a closed circle), a polyhedral frame's edges are soft glow bands whose corners dissolve
   into light (no sharp vertex, no crisp wire line). Which forms are drawn at all is curated in aura.js. The floating crystals are rebuilt as
   SOFT CRYSTALS (softCrystalGeometry below + the crystal shader's soft path in surfaceDetail.applyCrystal): a six-sided gem with rounded
   vertical edges, bevelled shoulders and blunted tips, facet tone + refraction-like inner light + a class-coloured rim, and tips that thin
   out into the class glow instead of ending in a razor point. */

import { applyCrystal } from './surfaceDetail.js';

export var FORM = { RING: 0, CUBE: 1, HEX: 2, DIAMOND: 3, OCTA: 4, ICOSA: 5 };

var VERT = [
  'attribute vec3 aE; attribute float aShape;',
  'attribute vec4 iPos; attribute vec4 iAxis; attribute vec4 iK; attribute vec3 iTint; attribute vec3 iScl;',   /* iPos: centre + size (m) · iAxis: tilt axis + spin (rad/s) · iK: shape, phase, intensity, ground y · iScl: shape scale (a ring's y = its line sharpness) */
  'uniform float uTime;',
  'varying vec3 vE; varying vec3 vN; varying vec3 vV; varying vec3 vTint; varying float vA; varying float vShape; varying float vPh; varying float vFirm;',
  'mat3 rotAxis(vec3 a, float g) { a = normalize(a); float s = sin(g), c = cos(g), o = 1.0 - c;',
  '  return mat3(o * a.x * a.x + c, o * a.x * a.y + a.z * s, o * a.z * a.x - a.y * s, o * a.x * a.y - a.z * s, o * a.y * a.y + c, o * a.y * a.z + a.x * s, o * a.z * a.x + a.y * s, o * a.y * a.z - a.x * s, o * a.z * a.z + c); }',
  'vec3 cls(float k) { if (k < 0.5) return vec3(1.0, 0.848, 0.461); if (k < 1.5) return vec3(0.375, 0.583, 1.0); if (k < 2.5) return vec3(1.0, 0.245, 0.349); if (k < 3.5) return vec3(0.662, 0.491, 1.0); return vec3(1.0, 0.575, 0.767); }',   /* the five class hexes (e6c36a 5a8cf0 d4344a 8f6ad8 f08ab8) at full brightness, in display space like the tints */
  'vec3 cycle5(float x) { x = mod(x, 5.0); float k = floor(x), f = x - k; vec3 a = cls(k), b = cls(mod(k + 1.0, 5.0));',   /* hold a class, ease to white, rise into the next class: two far hues never average */
  '  return f < 0.7 ? a : (f < 0.85 ? mix(a, vec3(1.0), (f - 0.7) / 0.15) : mix(vec3(1.0), b, (f - 0.85) / 0.15)); }',
  'void main() { vShape = iK.x; vPh = iK.y; vTint = iTint.r + iTint.g + iTint.b < 0.004 ? cycle5(uTime * 0.045 + iK.y * 5.0) : iTint; vE = aE; vA = 0.0; vFirm = 0.0; vN = vec3(0.0, 1.0, 0.0); vV = vec3(0.0, 0.0, 1.0);',
  '  if (abs(aShape - iK.x) > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }',   /* not this instance's shape: outside the clip volume */
  '  float t = uTime; mat3 R = rotAxis(iAxis.xyz, t * iAxis.w + iK.y * 6.2831853); if (aShape < 0.5) vE.z = iScl.y;',   /* a ring carries its line sharpness */
  '  vec3 scl = aShape < 0.5 ? vec3(iScl.x, 1.0, iScl.z) : iScl;',
  '  float breath = 1.0 + 0.035 * sin(t * 0.37 + iK.y * 11.0);',
  '  vec3 c = iPos.xyz + vec3(0.0, sin(t * 0.21 + iK.y * 9.0) * iPos.w * 0.06, 0.0);',   /* a slow bob */
  '  vec3 wp = c + R * (position * scl) * iPos.w * breath;',
  '  vN = R * normalize(normal / scl); vV = cameraPosition - wp;',
  '  float lift = c.y - iK.w - iPos.w * 0.5;',   /* the form's lowest point above its ground */
  '  float hK = smoothstep(4.0, 26.0, lift) * mix(0.6, 1.1, smoothstep(22.0, 160.0, lift)); vFirm = smoothstep(18.0, 120.0, lift);',   /* M19: faint to 26 m of lift, firm (line weight, glow, a faint glass face) only high in space */
  '  float d = length(vV), nK = smoothstep(8.0, 40.0, d) * (1.0 - smoothstep(1100.0, 1350.0, d));',   /* faint near the viewer */
  '  float cyc = 0.5 + 0.5 * smoothstep(-0.6, 0.6, sin(t * 0.083 + iK.y * 17.0));',   /* a long fade in / out */
  '  vA = iK.z * hK * nK * cyc;',
  '  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }'
].join('\n');

var FRAG = [
  'uniform float uTime; uniform float uGlobal; uniform float uEdge;',
  'varying vec3 vE; varying vec3 vN; varying vec3 vV; varying vec3 vTint; varying float vA; varying float vShape; varying float vPh; varying float vFirm;',
  'void main() { if (vA < 0.002) discard; vec3 N = normalize(vN), V = normalize(vV); float fres = pow(1.0 - abs(dot(N, V)), 2.2), t = uTime; vec3 col;',
  '  vec3 tn = vTint / max(max(vTint.r, vTint.g), max(vTint.b, 1e-3));',   /* M19: the class tint at full brightness (scaled by its brightest channel, never clipped) */
  '  if (vShape < 0.5) { float sharp = max(vE.z, 1.0) * 0.45, band = exp(-vE.x * vE.x * sharp);',   /* the soft ring: a light band across its width (M20: ~1.5x wider and softer — a haze, not a drawn line) */
  '    float run = 0.72 + 0.28 * sin(vE.y * 6.2831853 * 3.0 - t * 0.5 + vPh * 5.0) * uEdge;',
  '    float arcs = smoothstep(0.18, 0.72, 0.5 + 0.5 * sin(vE.y * 6.2831853 * 2.0 + vPh * 9.0 + t * 0.05) * sin(vE.y * 6.2831853 * 3.0 - vPh * 4.0 - t * 0.03));',   /* M20: the ring dissolves into two or three drifting arcs — never a closed UI circle */
  '    col = mix(tn, vec3(1.0), 0.1 + 0.12 * run) * band * run * arcs * (0.6 + 0.4 * fres) * (0.85 + 0.3 * vFirm); }',   /* M19: a little white in the line core, the class colour kept (was a 40–60 % white wash) */
  '  else { float m = min(min(vE.x, vE.y), vE.z), mx = max(max(vE.x, vE.y), vE.z), md = vE.x + vE.y + vE.z - m - mx, w = fwidth(m);',
  '    float line = (1.0 - smoothstep(w * 0.5, w * 3.0 + 0.035, m)) * 0.55, glow = exp(-m * 7.0) * 0.34;',   /* M20: soft energy edges (a wide glow, a faint core) — was a crisp 1–2 px wire line */
  '    float corner = smoothstep(0.03, 0.24, md);',   /* M20: every vertex dissolves — the frame has no sharp point, its edges fade into light toward the corners */
  '    float run = 0.65 + 0.35 * sin((vE.x * 1.7 - vE.y + vE.z * 0.6) * 9.0 - t * 0.8 + vPh * 7.0) * uEdge;',   /* a shimmer running along the edges */
  '    vec3 ec = mix(tn, vec3(1.0), 0.14 + 0.1 * sin(t * 0.35 + vPh * 3.0));',
  '    col = ec * (line * (0.9 + 0.35 * vFirm) + glow * (0.8 + 0.5 * vFirm)) * run * corner + tn * (fres * (0.22 + 0.2 * vFirm) + 0.012 + 0.045 * vFirm); }',   /* the faces nearly clear: a facing-ratio sheen, a faint glass body only when high */
  '  gl_FragColor = vec4(col * vA * uGlobal, 1.0); }'
].join('\n');

/* The shared vertex buffer: RING (annulus, radius 0.5, band ±0.06) · CUBE (1 m) · HEX prism (r 0.55, h 1) · DIAMOND (hex bipyramid) ·
   M19: OCTA (regular octahedron, r 0.6) · ICOSA (icosahedron, r 0.55) — both left out of the LOW buffer.
   aE: barycentric edge coordinates (an internal edge — a quad diagonal, a cap-fan spoke — is held at 1 so it never draws); for the ring
   aE = (across-band −1..1, along 0..1, 1). */
function formGeometry(THREE, tier, need) {
  need = need || { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };   /* M20: only the shapes a field actually uses go into its buffer (a rings-only field carries no polyhedra: less vertex work per instance) */
  var P = [], Nn = [], E = [], S = [], V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  function tri(a, b, c, shape, keep) { var n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize(), ctr = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
    if (n.dot(ctr) < 0) { var tmp = b; b = c; c = tmp; n.negate(); keep = [keep[0], keep[2], keep[1]]; }   /* outward */
    var e = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; for (var k = 0; k < 3; k++) if (!keep[k]) { e[0][k] = 1; e[1][k] = 1; e[2][k] = 1; }
    [a, b, c].forEach(function (p, i) { P.push(p.x, p.y, p.z); Nn.push(n.x, n.y, n.z); E.push(e[i][0], e[i][1], e[i][2]); S.push(shape); }); }
  function quad(a, b, c, d, shape) { tri(a, b, c, shape, [true, false, true]); tri(a, c, d, shape, [true, true, false]); }   /* the a–c diagonal is internal */
  /* RING */
  var RS = tier === 'LOW' ? 32 : 64, r0 = 0.44, r1 = 0.56;   /* M19: LOW 32 (was 40) — pays for nothing new, LOW gets lighter */
  for (var i = 0; i < RS; i++) { var a0 = i / RS * Math.PI * 2, a1 = (i + 1) / RS * Math.PI * 2, u0 = i / RS, u1 = (i + 1) / RS;
    var p = [[Math.cos(a0) * r0, Math.sin(a0) * r0, -1, u0], [Math.cos(a0) * r1, Math.sin(a0) * r1, 1, u0], [Math.cos(a1) * r1, Math.sin(a1) * r1, 1, u1], [Math.cos(a1) * r0, Math.sin(a1) * r0, -1, u1]];
    [[0, 1, 2], [0, 2, 3]].forEach(function (T) { T.forEach(function (k) { P.push(p[k][0], 0, p[k][1]); Nn.push(0, 1, 0); E.push(p[k][2], p[k][3], 1); S.push(0); }); }); }
  /* CUBE */
  if (need[1]) { var h = 0.5, C = [V(-h, -h, -h), V(h, -h, -h), V(h, h, -h), V(-h, h, -h), V(-h, -h, h), V(h, -h, h), V(h, h, h), V(-h, h, h)];
  [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]].forEach(function (f) { quad(C[f[0]], C[f[1]], C[f[2]], C[f[3]], 1); }); }
  /* HEX prism */
  if (need[2]) { var hr = 0.55, top = [], bot = []; for (var j = 0; j < 6; j++) { var an = j / 6 * Math.PI * 2; top.push(V(Math.cos(an) * hr, 0.5, Math.sin(an) * hr)); bot.push(V(Math.cos(an) * hr, -0.5, Math.sin(an) * hr)); }
  for (j = 0; j < 6; j++) { var jn = (j + 1) % 6; quad(bot[j], bot[jn], top[jn], top[j], 2); tri(V(0, 0.5, 0), top[j], top[jn], 2, [true, false, false]); tri(V(0, -0.5, 0), bot[jn], bot[j], 2, [true, false, false]); } }   /* cap fans: only the rim edge draws */
  /* DIAMOND: a hexagonal bipyramid, long below like a cut gem */
  if (need[3]) { var gir = []; for (j = 0; j < 6; j++) { var ag = j / 6 * Math.PI * 2 + Math.PI / 6; gir.push(V(Math.cos(ag) * 0.5, 0.12, Math.sin(ag) * 0.5)); }
  for (j = 0; j < 6; j++) { var jm = (j + 1) % 6; tri(V(0, 0.55, 0), gir[j], gir[jm], 3, [true, true, true]); tri(V(0, -0.85, 0), gir[jm], gir[j], 3, [true, true, true]); } }
  if (tier !== 'LOW' && (need[4] || need[5])) {   /* M19: OCTA — the regular octahedron (every face edge draws) */
    var O = [V(0.6, 0, 0), V(0, 0, 0.6), V(-0.6, 0, 0), V(0, 0, -0.6)]; for (j = 0; j < 4; j++) { tri(V(0, 0.6, 0), O[j], O[(j + 1) % 4], 4, [true, true, true]); tri(V(0, -0.6, 0), O[(j + 1) % 4], O[j], 4, [true, true, true]); }
    var ico = new THREE.IcosahedronGeometry(0.55, 0), ip = ico.attributes.position; for (j = 0; j < ip.count; j += 3) tri(V(ip.getX(j), ip.getY(j), ip.getZ(j)), V(ip.getX(j + 1), ip.getY(j + 1), ip.getZ(j + 1)), V(ip.getX(j + 2), ip.getY(j + 2), ip.getZ(j + 2)), 5, [true, true, true]); ico.dispose(); }   /* ICOSA: the icosahedron */
  var g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute('aE', new THREE.Float32BufferAttribute(E, 3)); g.setAttribute('aShape', new THREE.Float32BufferAttribute(S, 1));
  return g;
}

/* items: [{ x, y, z, size (m), shape ('RING' | 'CUBE' | 'HEX' | 'DIAMOND' or FORM.*), tint (hex), intensity (~0.2–1), ground (y of the ground
   below, default 0), axis ([x, y, z] tilt / spin axis), spin (rad/s), scale ([sx, sy, sz]; a ring's sy = line sharpness), phase }]
   opts: isNight, tier, name, day / night (global levels). Returns { mesh, uniforms, count, setNight(n), tick(t), dispose() }. */
export function createAuraForms(THREE, items, opts) {
  opts = opts || {}; var n = items.length; if (!n) return null;
  var need = {}; items.forEach(function (it) { var sh = typeof it.shape === 'string' ? FORM[it.shape] : it.shape; if (sh === undefined) sh = FORM.RING; if (opts.tier === 'LOW' && sh >= FORM.OCTA) sh = sh === FORM.OCTA ? FORM.DIAMOND : FORM.HEX; need[sh] = 1; });
  var g = formGeometry(THREE, opts.tier, need), col = new THREE.Color();
  var IP = new Float32Array(n * 4), IA = new Float32Array(n * 4), IK = new Float32Array(n * 4), IT = new Float32Array(n * 3), IS = new Float32Array(n * 3);
  items.forEach(function (it, i) { var sh = typeof it.shape === 'string' ? FORM[it.shape] : it.shape; if (sh === undefined) sh = FORM.RING; if (opts.tier === 'LOW' && sh >= FORM.OCTA) sh = sh === FORM.OCTA ? FORM.DIAMOND : FORM.HEX; var ax = it.axis || [0.2, 1, 0.1], sc = it.scale || [1, sh === FORM.RING ? 6 : 1, 1];
    IP[i * 4] = it.x; IP[i * 4 + 1] = it.y; IP[i * 4 + 2] = it.z; IP[i * 4 + 3] = it.size || 6;
    IA[i * 4] = ax[0]; IA[i * 4 + 1] = ax[1]; IA[i * 4 + 2] = ax[2]; IA[i * 4 + 3] = it.spin === undefined ? 0.06 : it.spin;
    IK[i * 4] = sh; IK[i * 4 + 1] = it.phase === undefined ? (i * 0.618) % 1 : it.phase; IK[i * 4 + 2] = it.intensity === undefined ? 0.5 : it.intensity; IK[i * 4 + 3] = it.ground || 0;
    col.setHex(it.tint === undefined ? 0xf4f6ff : it.tint); col.convertLinearToSRGB(); IT[i * 3] = col.r; IT[i * 3 + 1] = col.g; IT[i * 3 + 2] = col.b;   /* M19: display-space tint — this raw shader writes gl_FragColor unconverted, so a linear tint drifted darker and warmer (pale gold showed at hue 35°, orange) */ IS[i * 3] = sc[0]; IS[i * 3 + 1] = sc[1]; IS[i * 3 + 2] = sc[2]; });
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(IP, 4)); g.setAttribute('iAxis', new THREE.InstancedBufferAttribute(IA, 4)); g.setAttribute('iK', new THREE.InstancedBufferAttribute(IK, 4)); g.setAttribute('iTint', new THREE.InstancedBufferAttribute(IT, 3)); g.setAttribute('iScl', new THREE.InstancedBufferAttribute(IS, 3)); g.instanceCount = n;
  var day = opts.day === undefined ? 0.5 : opts.day, nightK = opts.night === undefined ? 1.0 : opts.night;
  var uniforms = { uTime: { value: 0 }, uGlobal: { value: opts.isNight ? nightK : day }, uEdge: { value: opts.tier === 'LOW' ? 0 : 1 } };
  var mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  var mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 13; mesh.name = opts.name || 'AURA_FORMS'; mesh.userData.noMerge = true; mesh.userData.nonInteractable = true;
  return { mesh: mesh, uniforms: uniforms, count: n,
    setNight: function (nn) { uniforms.uGlobal.value = nn ? nightK : day; },
    tick: function (t) { uniforms.uTime.value = t || 0; },
    dispose: function () { g.dispose(); mat.dispose(); } };
}

/* the clearance report the host-safety test reads: each form's lowest possible point (its bounding radius below the bob centre) above its ground */
export function formsSafe(items) { return items.map(function (it) { var s = it.size || 6, sc = it.scale || [1, 1, 1], sh = typeof it.shape === 'string' ? FORM[it.shape] : it.shape, k = sh === FORM.RING ? 0.56 * Math.max(sc[0], sc[2]) : 0.9 * Math.max(sc[0], sc[1], sc[2]), r = s * k * 1.035 + s * 0.06;   /* any orientation, the breath and the bob */
  return { shape: it.shape, lowest_m: +((it.y - r) - (it.ground || 0)).toFixed(2) }; }); }

/* M15 FLOATING CRYSTALS (owner 2026-09-27 reference renders: great faceted violet diamonds hanging in the air over the city, the falls and
   the highland). Solid-looking but clearly scenery: 2–7 m tall, always high (their lowest point ≥ 12 m above the ground below, most far
   higher), slowly turning, bobbing and breathing light — never near a hand, never a pickup. One instanced draw; each pairs with a soft
   aura bloom (added by aura.js). items: [{ x, y, z, size (m, height), tint (hex, a class family), ground }] */
export function createFloatingCrystals(THREE, items, opts) {
  opts = opts || {}; var n = items.length; if (!n) return null; var LOWQ = opts.tier === 'LOW';
  /* M20 SOFT CRYSTAL (was a flat-shaded razor octahedron on a dark violet body — every class crystal read purple-grey): a six-sided gem with
     rounded vertical edges, bevelled shoulders and blunted points (long below like a cut gem), the class colour as its body, and the soft
     crystal shader (facet tone, inner light, class rim, tips burning into the class glow).
     M20 review fix (2026-09-27: the first soft gem — a near-round section (corner radius 0.22) on a squat lozenge whose points faded out —
     read as a pale pebble / egg at the 50–110 m these gems are seen from; "Not MUSHY"): a TALL, SLENDER bipyramid again (height 1, section
     circumradius 0.26 — the old razor octahedron was 0.31 wide on the same height), a narrow corner radius (0.08: the edges catch a line of
     light instead of turning the section round) and a short girdle, so the outline stays a crisp pointed gem at any range; the points keep
     their full body at mid / far range and only thin into light within ~30 m (applyCrystal fadeNear), and the facets carry the glow too
     (facetGlow), so a night gem is a cut stone, not a flat white shape. The body is an EQUAL-CHANNEL grey (0x909090: the old 0x8e9096 was
     blue-biased, B / R ≈ 1.13 in linear — it pushed every class hue toward violet). HIGH: rounded edges (three samples a corner), MED / LOW:
     chamfers (two) — every tier keeps flat facets (one sample a corner shaded the section as a cone). */
  var geo = softCrystalGeometry(THREE, { sides: 6, samples: LOWQ || opts.tier === 'MED' ? 2 : 3, round: 0.08, bevel: LOWQ ? 0 : 0.025, profile: [[-0.5, 0], [-0.465, 0.02], [0.05, 0.26], [0.12, 0.26], [0.465, 0.02], [0.5, 0]] });
  var glow = { value: opts.isNight ? 0.5 : 0.35 };
  var mat = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.14, metalness: 0.22, emissive: 0xffffff, emissiveIntensity: opts.isNight ? 0.3 : 0.16, transparent: true, opacity: 0.96, envMapIntensity: 0.9 });
  var U = { uTime: { value: 0 } };
  mat.onBeforeCompile = function (sh) { sh.uniforms.uTime = U.uTime; var turn = '{ float ph = float(gl_InstanceID) * 1.618; float a = uTime * (0.16 + 0.05 * fract(ph)) + ph * 6.0; float c = cos(a), s = sin(a); ';
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + turn + 'objectNormal.xz = mat2(c, -s, s, c) * objectNormal.xz; }')   /* M20: the normal turns with the gem (it was rotated after the normal was already transformed — invisible while flat shaded) */
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + turn + 'transformed.xz = mat2(c, -s, s, c) * transformed.xz; transformed.y += sin(uTime * 0.45 + ph * 3.0) * 0.08; }');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance *= vColor.rgb;\n#endif\n totalEmissiveRadiance *= 0.85 + 0.15 * sin(uTime * 0.8);');   /* a slow breath; the soft crystal shader adds the core, rim and tip light. M20 review fix: USE_INSTANCING_COLOR is a VERTEX-only define in three r185 (the fragment sees USE_COLOR), so this tint never ran — every gem glowed plain WHITE since M15 (the grey / pink / salmon cast on the class gems); the glow now takes the gem's class tint */ };
  mat.customProgramCacheKey = function () { return 'mahworld_floating_crystal_m20'; };
  applyCrystal(THREE, mat, { tier: opts.tier || 'HIGH', soft: true, glow: glow, facet: 0.8, depth: 0.6, rim: 0.42, refract: 0.3, tipFade: 0.35, rimFade: 0.2, fadeNear: [14, 32], facetGlow: 1.0, facetLight: 0.8 });   /* M20 wave 7 FLORA (owner 2026-09-28: crystals "sculpted and premium"; the audit's close frame of a sky gem: a flat, matte khaki lozenge — every facet one tone, the grey sky mirrored evenly on all of them): the cut reads — a wider facet-to-facet tone range, a deeper face-on body, a stronger inner light band that slides with the view, and the sky reflection carried by the facets too (the turned ones catch the sky, the face-on ones look into the body; facetLight, as the Veil crystals). Same geometry, same tint, same draw. */
  var mesh = new THREE.InstancedMesh(geo, mat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  items.forEach(function (it, i) { v.set(it.x, it.y, it.z); s.setScalar(it.size || 4); q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), ((i * 0.37) % 1 - 0.5) * 0.25); m4.compose(v, q, s); mesh.setMatrixAt(i, m4); col.set(it.tint === undefined ? 0xf0f0f0 : it.tint); mesh.setColorAt(i, col); });   /* M20 CLASS IDENTITY (owner 2026-09-28: "PURPLE remains VISIONARY — not generic magic"): an untinted crystal is equal-channel pearl (the default was VISIONARY's amethyst) */
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); mesh.frustumCulled = true; mesh.name = opts.name || 'FLOATING_CRYSTALS'; mesh.userData.noMerge = true; mesh.userData.nonInteractable = true; mesh.castShadow = false; mesh.receiveShadow = false;
  return { mesh: mesh, count: n, uniforms: U, tris: (geo.index ? geo.index.count / 3 : 0) * n, setNight: function (nt) { mat.emissiveIntensity = nt ? 0.3 : 0.16; glow.value = nt ? 0.5 : 0.35; }, tick: function (t) { U.uTime.value = t || 0; }, dispose: function () { geo.dispose(); mat.dispose(); } };
}

/* M20 SOFT CRYSTAL GEOMETRY — the one crystal silhouette shared by the floating gems, the region monoliths, the ground shards and the meadow
   blades (owner 2026-09-27: "remove sharp objects and edges, even with the diamonds … softened precision: not MUSHY, not RAZOR-SHARP").
   A lathe of a ROUNDED POLYGON (sides, corner radius `round` of the circumradius, `samples` per corner: 3 = a rounded edge, 2 = a chamfer,
   1 = plain corners with smooth normals) swept along a PROFILE polyline [[y, s], …] (s = the cross-section scale); every inner profile
   joint becomes a narrow bevel band (two rows `bevel` apart, each carrying its own segment's slope), so faces stay flat and only the edges
   and shoulders round off. An end point with s = 0 closes that end with a blunted apex. Normals are analytic (flat faces flat, bevels
   curved); `squash` scales z. aCrys = (tip: 1 − s / s_max — 0 in the body, 1 at a point; edge: 1 on a rounded vertical edge, 0.5 on a
   shoulder bevel; base: 1 at / below y = 0 fading over `contact`, only for `ground` crystals) drives the soft crystal shader. The circumradius
   of the rounded section never exceeds 1, so a crystal scaled to a collider radius stays inside it. */
export function softCrystalGeometry(THREE, o) {
  o = o || {}; var N = Math.max(3, o.sides || 6), K = Math.max(1, o.samples === undefined ? 3 : o.samples), rho = K > 1 ? (o.round === undefined ? 0.18 : o.round) : 0, sq = o.squash || 1, bev = o.bevel === undefined ? 0.06 : o.bevel, poly = o.profile, half = Math.PI / N, dC = (Math.cos(half) - rho) / Math.cos(half), cs = [], rows = [], sMax = 0, i, j, k;
  for (i = 0; i < N; i++) { var c = i / N * Math.PI * 2 + (o.twist || 0); for (k = 0; k < K; k++) { var th = K === 1 ? c : c - half + 2 * half * k / (K - 1), px = K === 1 ? Math.cos(c) : dC * Math.cos(c) + rho * Math.cos(th), pz = K === 1 ? Math.sin(c) : dC * Math.sin(c) + rho * Math.sin(th);
    cs.push({ x: px, z: pz, nx: Math.cos(th), nz: Math.sin(th), h: px * Math.cos(th) + pz * Math.sin(th), e: K >= 3 ? 1 - Math.abs(2 * k / (K - 1) - 1) : 0 }); } }
  function slope(a, b) { var dy = b[0] - a[0]; return Math.abs(dy) < 1e-6 ? 0 : (b[1] - a[1]) / dy; }
  function along(a, b, dist) { var L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = Math.min(0.45, dist / L); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  poly.forEach(function (p) { sMax = Math.max(sMax, p[1]); });
  for (j = 0; j < poly.length; j++) { var P = poly[j]; if (j === 0 || j === poly.length - 1) { if (P[1] > 1e-4) rows.push({ y: P[0], s: P[1], sl: j === 0 ? slope(P, poly[1]) : slope(poly[j - 1], P), e: 0 }); continue; }
    if (bev <= 0) { rows.push({ y: P[0], s: P[1], sl: (slope(poly[j - 1], P) + slope(P, poly[j + 1])) / 2, e: 0.5 }); continue; }   /* bevel 0 (small / LOW crystals): one row, a smooth joint */
    var A = along(P, poly[j - 1], bev), B = along(P, poly[j + 1], bev); rows.push({ y: A[0], s: A[1], sl: slope(poly[j - 1], P), e: 0.5 }); rows.push({ y: B[0], s: B[1], sl: slope(P, poly[j + 1]), e: 0.5 }); }
  var pos = [], nrm = [], cry = [], idx = [], C = cs.length, ctc = o.contact || 0.12;
  function baseK(y) { if (!o.ground) return 0; var u = Math.max(0, Math.min(1, y / ctc)); return 1 - u * u * (3 - 2 * u); }
  rows.forEach(function (R) { cs.forEach(function (p) { var ny = -R.sl * p.h, nx = p.nx, nz = p.nz / sq, l = Math.hypot(nx, ny, nz) || 1; pos.push(p.x * R.s, R.y, p.z * R.s * sq); nrm.push(nx / l, ny / l, nz / l); cry.push(1 - R.s / sMax, Math.max(p.e, R.e), baseK(R.y)); }); });
  for (j = 0; j < rows.length - 1; j++) for (i = 0; i < C; i++) { var a0 = j * C + i, a1 = j * C + (i + 1) % C, b0 = a0 + C, b1 = a1 + C; idx.push(a0, b0, a1, a1, b0, b1); }
  [[0, -1], [poly.length - 1, 1]].forEach(function (E) { var P = poly[E[0]]; if (P[1] > 1e-4) return; var ap = pos.length / 3, r0 = E[1] > 0 ? (rows.length - 1) * C : 0; pos.push(0, P[0], 0); nrm.push(0, E[1], 0); cry.push(1, 0, baseK(P[0])); for (i = 0; i < C; i++) { var q0 = r0 + i, q1 = r0 + (i + 1) % C; if (E[1] > 0) idx.push(q0, ap, q1); else idx.push(q0, q1, ap); } });
  /* outward winding: the lathe runs counter-clockwise seen from +y, so (a0, b0, a1) faces out; check one face against its vertex normal and flip every triangle if the convention ever changes */
  var t0 = idx[0] * 3, t1 = idx[1] * 3, t2 = idx[2] * 3, ux = pos[t1] - pos[t0], uy = pos[t1 + 1] - pos[t0 + 1], uz = pos[t1 + 2] - pos[t0 + 2], vx = pos[t2] - pos[t0], vy = pos[t2 + 1] - pos[t0 + 1], vz = pos[t2 + 2] - pos[t0 + 2];
  if ((uy * vz - uz * vy) * nrm[t0] + (uz * vx - ux * vz) * nrm[t0 + 1] + (ux * vy - uy * vx) * nrm[t0 + 2] < 0) for (i = 0; i < idx.length; i += 3) { var sw = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = sw; }
  var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('aCrys', new THREE.Float32BufferAttribute(cry, 3)); g.setIndex(idx); g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}
/* the clearance report for a floating crystal: its lowest point (spin, bob) above its ground */
export function crystalLowest(it) { var s = it.size || 4; return +((it.y - s * 0.5 - s * 0.08) - (it.ground || 0)).toFixed(2); }
