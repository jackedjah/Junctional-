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
   instance keeps only its own shape (the others collapse outside the clip volume). LOW tier: fewer ring segments, no edge shimmer. */

export var FORM = { RING: 0, CUBE: 1, HEX: 2, DIAMOND: 3 };

var VERT = [
  'attribute vec3 aE; attribute float aShape;',
  'attribute vec4 iPos; attribute vec4 iAxis; attribute vec4 iK; attribute vec3 iTint; attribute vec3 iScl;',   /* iPos: centre + size (m) · iAxis: tilt axis + spin (rad/s) · iK: shape, phase, intensity, ground y · iScl: shape scale (a ring's y = its line sharpness) */
  'uniform float uTime;',
  'varying vec3 vE; varying vec3 vN; varying vec3 vV; varying vec3 vTint; varying float vA; varying float vShape; varying float vPh;',
  'mat3 rotAxis(vec3 a, float g) { a = normalize(a); float s = sin(g), c = cos(g), o = 1.0 - c;',
  '  return mat3(o * a.x * a.x + c, o * a.x * a.y + a.z * s, o * a.z * a.x - a.y * s, o * a.x * a.y - a.z * s, o * a.y * a.y + c, o * a.y * a.z + a.x * s, o * a.z * a.x + a.y * s, o * a.y * a.z - a.x * s, o * a.z * a.z + c); }',
  'void main() { vShape = iK.x; vPh = iK.y; vTint = iTint; vE = aE; vA = 0.0; vN = vec3(0.0, 1.0, 0.0); vV = vec3(0.0, 0.0, 1.0);',
  '  if (abs(aShape - iK.x) > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }',   /* not this instance's shape: outside the clip volume */
  '  float t = uTime; mat3 R = rotAxis(iAxis.xyz, t * iAxis.w + iK.y * 6.2831853); if (aShape < 0.5) vE.z = iScl.y;',   /* a ring carries its line sharpness */
  '  vec3 scl = aShape < 0.5 ? vec3(iScl.x, 1.0, iScl.z) : iScl;',
  '  float breath = 1.0 + 0.035 * sin(t * 0.37 + iK.y * 11.0);',
  '  vec3 c = iPos.xyz + vec3(0.0, sin(t * 0.21 + iK.y * 9.0) * iPos.w * 0.06, 0.0);',   /* a slow bob */
  '  vec3 wp = c + R * (position * scl) * iPos.w * breath;',
  '  vN = R * normalize(normal / scl); vV = cameraPosition - wp;',
  '  float lift = c.y - iK.w - iPos.w * 0.5;',   /* the form's lowest point above its ground */
  '  float hK = smoothstep(3.4, 16.0, lift) * mix(0.75, 1.0, smoothstep(24.0, 140.0, lift));',   /* faint near the ground, clean when suspended high */
  '  float d = length(vV), nK = smoothstep(6.0, 30.0, d) * (1.0 - smoothstep(1100.0, 1350.0, d));',   /* faint near the viewer */
  '  float cyc = 0.5 + 0.5 * smoothstep(-0.6, 0.6, sin(t * 0.083 + iK.y * 17.0));',   /* a long fade in / out */
  '  vA = iK.z * hK * nK * cyc;',
  '  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }'
].join('\n');

var FRAG = [
  'uniform float uTime; uniform float uGlobal; uniform float uEdge;',
  'varying vec3 vE; varying vec3 vN; varying vec3 vV; varying vec3 vTint; varying float vA; varying float vShape; varying float vPh;',
  'void main() { if (vA < 0.002) discard; vec3 N = normalize(vN), V = normalize(vV); float fres = pow(1.0 - abs(dot(N, V)), 2.2), t = uTime; vec3 col;',
  '  if (vShape < 0.5) { float sharp = max(vE.z, 1.0), band = exp(-vE.x * vE.x * sharp);',   /* the soft ring: a light line across its band */
  '    float run = 0.72 + 0.28 * sin(vE.y * 6.2831853 * 3.0 - t * 0.5 + vPh * 5.0) * uEdge;',
  '    col = mix(vTint, vec3(1.0), 0.3 + 0.2 * run) * band * run * (0.6 + 0.4 * fres); }',
  '  else { float m = min(min(vE.x, vE.y), vE.z), w = fwidth(m);',
  '    float line = 1.0 - smoothstep(w * 0.6, w * 2.2 + 0.012, m), glow = exp(-m * 16.0) * 0.3;',   /* fine edge lines + a soft glow off them */
  '    float run = 0.65 + 0.35 * sin((vE.x * 1.7 - vE.y + vE.z * 0.6) * 9.0 - t * 0.8 + vPh * 7.0) * uEdge;',   /* a shimmer running along the edges */
  '    vec3 ec = mix(vTint, vec3(1.0), 0.4 + 0.2 * sin(t * 0.35 + vPh * 3.0));',
  '    col = ec * (line * 1.05 + glow) * run + vTint * (fres * 0.3 + 0.025); }',   /* the faces nearly clear: only the facing-ratio sheen */
  '  gl_FragColor = vec4(col * vA * uGlobal, 1.0); }'
].join('\n');

/* The shared vertex buffer: RING (annulus, radius 0.5, band ±0.06) · CUBE (1 m) · HEX prism (r 0.55, h 1) · DIAMOND (hex bipyramid).
   aE: barycentric edge coordinates (an internal edge — a quad diagonal, a cap-fan spoke — is held at 1 so it never draws); for the ring
   aE = (across-band −1..1, along 0..1, 1). */
function formGeometry(THREE, tier) {
  var P = [], Nn = [], E = [], S = [], V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  function tri(a, b, c, shape, keep) { var n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize(), ctr = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
    if (n.dot(ctr) < 0) { var tmp = b; b = c; c = tmp; n.negate(); keep = [keep[0], keep[2], keep[1]]; }   /* outward */
    var e = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; for (var k = 0; k < 3; k++) if (!keep[k]) { e[0][k] = 1; e[1][k] = 1; e[2][k] = 1; }
    [a, b, c].forEach(function (p, i) { P.push(p.x, p.y, p.z); Nn.push(n.x, n.y, n.z); E.push(e[i][0], e[i][1], e[i][2]); S.push(shape); }); }
  function quad(a, b, c, d, shape) { tri(a, b, c, shape, [true, false, true]); tri(a, c, d, shape, [true, true, false]); }   /* the a–c diagonal is internal */
  /* RING */
  var RS = tier === 'LOW' ? 40 : 64, r0 = 0.44, r1 = 0.56;
  for (var i = 0; i < RS; i++) { var a0 = i / RS * Math.PI * 2, a1 = (i + 1) / RS * Math.PI * 2, u0 = i / RS, u1 = (i + 1) / RS;
    var p = [[Math.cos(a0) * r0, Math.sin(a0) * r0, -1, u0], [Math.cos(a0) * r1, Math.sin(a0) * r1, 1, u0], [Math.cos(a1) * r1, Math.sin(a1) * r1, 1, u1], [Math.cos(a1) * r0, Math.sin(a1) * r0, -1, u1]];
    [[0, 1, 2], [0, 2, 3]].forEach(function (T) { T.forEach(function (k) { P.push(p[k][0], 0, p[k][1]); Nn.push(0, 1, 0); E.push(p[k][2], p[k][3], 1); S.push(0); }); }); }
  /* CUBE */
  var h = 0.5, C = [V(-h, -h, -h), V(h, -h, -h), V(h, h, -h), V(-h, h, -h), V(-h, -h, h), V(h, -h, h), V(h, h, h), V(-h, h, h)];
  [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]].forEach(function (f) { quad(C[f[0]], C[f[1]], C[f[2]], C[f[3]], 1); });
  /* HEX prism */
  var hr = 0.55, top = [], bot = []; for (var j = 0; j < 6; j++) { var an = j / 6 * Math.PI * 2; top.push(V(Math.cos(an) * hr, 0.5, Math.sin(an) * hr)); bot.push(V(Math.cos(an) * hr, -0.5, Math.sin(an) * hr)); }
  for (j = 0; j < 6; j++) { var jn = (j + 1) % 6; quad(bot[j], bot[jn], top[jn], top[j], 2); tri(V(0, 0.5, 0), top[j], top[jn], 2, [true, false, false]); tri(V(0, -0.5, 0), bot[jn], bot[j], 2, [true, false, false]); }   /* cap fans: only the rim edge draws */
  /* DIAMOND: a hexagonal bipyramid, long below like a cut gem */
  var gir = []; for (j = 0; j < 6; j++) { var ag = j / 6 * Math.PI * 2 + Math.PI / 6; gir.push(V(Math.cos(ag) * 0.5, 0.12, Math.sin(ag) * 0.5)); }
  for (j = 0; j < 6; j++) { var jm = (j + 1) % 6; tri(V(0, 0.55, 0), gir[j], gir[jm], 3, [true, true, true]); tri(V(0, -0.85, 0), gir[jm], gir[j], 3, [true, true, true]); }
  var g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute('aE', new THREE.Float32BufferAttribute(E, 3)); g.setAttribute('aShape', new THREE.Float32BufferAttribute(S, 1));
  return g;
}

/* items: [{ x, y, z, size (m), shape ('RING' | 'CUBE' | 'HEX' | 'DIAMOND' or FORM.*), tint (hex), intensity (~0.2–1), ground (y of the ground
   below, default 0), axis ([x, y, z] tilt / spin axis), spin (rad/s), scale ([sx, sy, sz]; a ring's sy = line sharpness), phase }]
   opts: isNight, tier, name, day / night (global levels). Returns { mesh, uniforms, count, setNight(n), tick(t), dispose() }. */
export function createAuraForms(THREE, items, opts) {
  opts = opts || {}; var n = items.length; if (!n) return null;
  var g = formGeometry(THREE, opts.tier), col = new THREE.Color();
  var IP = new Float32Array(n * 4), IA = new Float32Array(n * 4), IK = new Float32Array(n * 4), IT = new Float32Array(n * 3), IS = new Float32Array(n * 3);
  items.forEach(function (it, i) { var sh = typeof it.shape === 'string' ? FORM[it.shape] : it.shape; if (sh === undefined) sh = FORM.RING; var ax = it.axis || [0.2, 1, 0.1], sc = it.scale || [1, sh === FORM.RING ? 6 : 1, 1];
    IP[i * 4] = it.x; IP[i * 4 + 1] = it.y; IP[i * 4 + 2] = it.z; IP[i * 4 + 3] = it.size || 6;
    IA[i * 4] = ax[0]; IA[i * 4 + 1] = ax[1]; IA[i * 4 + 2] = ax[2]; IA[i * 4 + 3] = it.spin === undefined ? 0.06 : it.spin;
    IK[i * 4] = sh; IK[i * 4 + 1] = it.phase === undefined ? (i * 0.618) % 1 : it.phase; IK[i * 4 + 2] = it.intensity === undefined ? 0.5 : it.intensity; IK[i * 4 + 3] = it.ground || 0;
    col.set(it.tint === undefined ? 0xf4f6ff : it.tint); IT[i * 3] = col.r; IT[i * 3 + 1] = col.g; IT[i * 3 + 2] = col.b; IS[i * 3] = sc[0]; IS[i * 3 + 1] = sc[1]; IS[i * 3 + 2] = sc[2]; });
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
