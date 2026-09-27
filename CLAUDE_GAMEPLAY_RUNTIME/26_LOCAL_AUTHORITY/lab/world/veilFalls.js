/* MAHWORLD M12 :: THE VEIL FALLS + THE VEIL HIGHLAND (owner pivot 2026-09-26: waterfall + elevated land, magical natural grandeur).
   WHERE: the west cove of the NEAR ridge at station 110 (bearing ≈ 4.32 rad, south-west of the VISIONARY highland terrace). Stations 109 and
   111 stand ~45 m forward as buttresses, so the recessed face at 110 is a natural amphitheatre — the fall is framed from the highland, the
   overlook and the plaza, and clears both mid-layer towers.
   THE FALLS (owner reference pass: a wide white curtain split into strands by dark rock ribs, a white wall of spray at the base, a full
   prismatic ring round it): one broad curtain over the crest from station 106 to 114 — the notch at 110 carries the tallest strand
   (146.7 m), the buttress noses at 109 / 111 / 113 are the rock ribs between strands, the lip steps down with the crest to the side tiers.
   Aerated streak water in the shader, a dark wet-rock sheet behind, a long foam field on the sea, a rising spray wall along the base,
   violet crystal growth on the flanking cliffs (never green), and the aura language: a soft iridescent cap over the lip, the veil glow and
   the base spray bloom (M19: the full glory ring is retired — the spectrum lives in the rising mist and a soft field over the upper curtain).
   THE HIGHLAND: a hanging mesa behind the crest at the lip height — a calm silver-lavender meadow with the source lake that feeds the lip, crystal
   groves, five quiet villas facing the view, lantern paths, a flight landing pad and the Veil spire (visible above the lower crests to the
   north). It reads as land you could go to.
   HOST SAFETY: nothing here is a collider or walkable surface. The curtain stops 3.6 m above the sea (a solid below 3.4 m would need to be flush);
   below that there is only a 3 cm foam decal on the sea and additive light. The curtain hangs at least 2 m clear of the face (M20: eased toward the span across the fin tips as it falls — allowed above 3.4 m); the cliff crystals keep their feet above 3.4 m.
   The highland lies 370–500 m out, beyond the host's ±300 m reach — ENTERING it needs new colliders + host validation, so it waits on the
   runtime bridge (registry `reachable: false`).
   The ridge sculpt keeps the face under the curtain as authored (keep_line + veilCurtainKeep; host-safety 17). Draws: curtain 1, wet rock 1, foam 1, mist 1 (not LOW), cliff crystals 1 (not LOW), highland ground 1,
   lake 1, trunks 1, canopies 1, villas 3, spire 1, lanterns 1, pad 1 — all behind the west ridge, frustum-culled as a group. M19 adds the front
   veil (not LOW), the paving and the crystal grass (not LOW): +3 on HIGH / MED, +1 on LOW (16_TESTS/gameplay_world_veil_district). */
import { ridgeStations, ridgeFaceSegment, ridgeFacePoint } from './ridgeLayout.js';
import { SPECTRAL, CLASS_TINT, CRYSTAL_TINT } from './aura.js'; import { applyGeology, applyCrystal } from './surfaceDetail.js'; import { softCrystalGeometry } from './auraForms.js'; import { mergeGeometries } from '../../vendor/three/BufferGeometryUtils.js'; import { softBox } from './formKit.js'; import { skyWater } from './water.js';

var NOISE = [
  'float vfH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
  'float vfN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(vfH(i), vfH(i + vec2(1.0, 0.0)), f.x), mix(vfH(i + vec2(0.0, 1.0)), vfH(i + vec2(1.0, 1.0)), f.x), f.y); }',
  'vec3 vfSpec(float t) { t = fract(t); vec3 v = vec3(0.706, 0.549, 1.0), i = vec3(0.498, 0.816, 1.0), w = vec3(0.957, 0.965, 1.0), g = vec3(1.0, 0.847, 0.541), p = vec3(1.0, 0.604, 0.824);',
  '  if (t < 0.2) return mix(v, i, t / 0.2); if (t < 0.4) return mix(i, w, (t - 0.2) / 0.2); if (t < 0.6) return mix(w, g, (t - 0.4) / 0.2); if (t < 0.8) return mix(g, p, (t - 0.6) / 0.2); return mix(p, v, (t - 0.8) / 0.2); }'
].join('\n');
/* M20 STRANDS: the fall pours only from the real notches in the crest, each from its own LEVEL lip, spreading as it drops — see createVeilFalls.
   uStr[k] = (centre x across the sheet, lip y, half-width at the lip, half-width at the base) in sheet x units; z <= 0 = unused. */
var STRAND = ['uniform vec4 uStr[4]; uniform float uStrBase; varying float vWy;',
  'float vfStrand(float x, float wy, float t, float widen, float lift, out float lipK) { float m = 0.0; lipK = 0.0;',
  '  for (int k = 0; k < 4; k++) { vec4 S = uStr[k]; if (S.z <= 0.0) continue;',
  '    float drop = max(S.y - wy, 0.0), fall = clamp(drop / max(S.y - uStrBase, 1.0), 0.0, 1.0), hw = mix(S.z, S.w, sqrt(fall)) * widen;',   /* a horsetail: quick to spread below the lip, then slower */
  '    float d = abs(x - S.x) + (vfN(vec2(x * 70.0 + float(k) * 7.0, wy * 0.07 - t * 0.3)) - 0.5) * (0.3 * hw + 0.004);',   /* ragged, moving edges */
  '    float sm = (1.0 - smoothstep(hw * 0.7, hw, d)) * smoothstep(S.y + 0.6 + lift, S.y - 1.4 + lift, wy);',
  '    m = max(m, sm); lipK = max(lipK, sm * (1.0 - smoothstep(0.0, 18.0, drop))); }',
  '  return m; }'].join('\n');

/* THE VEIL WATER (M12), shared with the older falls (macro.js): aerated streak water flowing down the sheet, horsetail strands, lip / base
   aeration and a faint spectral sheen; darker at night. uv.x runs across the sheet, uv.y from the lip (0) to the base (1) — flipV for a
   PlaneGeometry (1 at the top); sx scales the across-sheet frequencies to the sheet's width (1 = the 24–58 m Veil ribbon). ribs: the
   geometry carries aRib (0..1, a buttress nose under the water): there, and in broad noise bands, the curtain thins to strands so the
   dark wet rock shows between them, as in the owner's reference; the lower third merges into one white wall of spray. */
export function veilWaterMaterial(THREE, opts) { opts = opts || {};
  var U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uNight: { value: opts.night ? 1 : 0 }, uSX: { value: opts.sx || 1 }, uFlip: { value: opts.flipV ? 1 : 0 }, uSeed: { value: opts.seed || 0 }, uFilm: { value: 0 } }]);
  if (opts.strands) { U.uStr = { value: opts.strands }; U.uStrBase = { value: opts.strandBase || 0 }; }   /* uFilm: the curtain continues as a flush film down the rock to the sea (M20) */
  return new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true, defines: Object.assign({}, opts.ribs ? { VEIL_RIBS: 1 } : {}, opts.front ? { VEIL_FRONT: 1 } : {}, opts.strands ? { VEIL_STRANDS: 1 } : {}),
    vertexShader: '#include <common>\n#include <fog_pars_vertex>\nvarying vec2 vUv;\n#ifdef VEIL_RIBS\nattribute float aRib; varying float vRib;\n#endif\n#ifdef VEIL_STRANDS\nvarying float vWy;\n#endif\nvoid main() { vUv = uv;\n#ifdef VEIL_RIBS\n vRib = aRib;\n#endif\n#ifdef VEIL_STRANDS\n vWy = (modelMatrix * vec4(position, 1.0)).y;\n#endif\n vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: ['#include <common>', '#include <fog_pars_fragment>', 'uniform float uTime; uniform float uNight; uniform float uSX; uniform float uFlip; uniform float uSeed; uniform float uFilm; varying vec2 vUv;', '#ifdef VEIL_RIBS', 'varying float vRib;', '#endif', NOISE, '#ifdef VEIL_STRANDS', STRAND, '#endif',
        'void main() { float x = vUv.x, y = mix(vUv.y, 1.0 - vUv.y, uFlip), t = uTime, xs = x * uSX + uSeed;',
        '  float ya = sqrt(max(y, 0.0) + 0.015) * 2.0;',   /* M20 FREE FALL: the water accelerates (v ∝ √drop), so the streak field runs in √y — short clumps at the lip stretching into long streaks below, not one constant-speed texture scroll */
        '  float n1 = vfN(vec2(xs * 20.0, ya * 3.1 - t * 1.7)), n2 = vfN(vec2(xs * 57.0 + 3.1, ya * 6.2 - t * 2.6)), n3 = vfN(vec2(xs * 7.0 - 1.3, ya * 1.25 - t * 0.9));',
        '  float streak = smoothstep(0.32, 0.92, n1 * 0.55 + n2 * 0.3 + n3 * 0.15);',
        '  float rag = vfN(vec2(xs * 9.0, ya * 9.0 - t * 1.3)); float side = min(x, 1.0 - x); float edge = smoothstep(0.0, 0.2 + 0.12 * rag, side);',
        '  float aer = (1.0 - smoothstep(0.0, 0.1, y)) * smoothstep(-0.02, -0.001, y) + smoothstep(0.72, 1.0, y) * 0.9;',   /* M19: up the flume (y < 0; 0.1 ≈ 20 m) the water runs clear and streaked, whitening only in the last ~4 m before the brink */
        '#ifdef VEIL_RIBS', '  aer += vRib * 0.35 * smoothstep(0.04, 0.3, y);', '#endif',
        '#ifdef VEIL_STRANDS', '  float stL, stM = vfStrand(x, vWy, t, 1.0, 0.0, stL); if (y < 0.0) stM = 1.0; aer = max(aer, stL * 0.85);', '#endif',   /* each strand whitens where it tips over its own lip */   /* M19: white water where the fall breaks over a rock rib */
        '  float strand = smoothstep(0.22, 0.72, vfN(vec2(xs * 6.5 + 11.0, y * 0.8 - t * 0.04)) * 0.75 + vfN(vec2(xs * 15.0 - 4.0, y * 1.6)) * 0.25);',   /* a horsetail veil: uneven strands, not one flat sheet */
        '  vec3 body = mix(vec3(0.72, 0.77, 0.85), vec3(0.985, 0.99, 1.0), clamp(streak * 0.95 + aer * 0.6 + strand * 0.2, 0.0, 1.0));',   /* M19: thin water shows the dark rock through it — more contrast between sheet and streak (M20: a paler body, less blue glass) */
        '  float bil = vfN(vec2(xs * 3.0, y * 6.0 - t * 0.35)) * 0.6 + vfN(vec2(xs * 8.0 + 2.0, y * 15.0 - t * 0.8)) * 0.4; body *= mix(1.0, 0.78 + 0.3 * bil, smoothstep(0.55, 0.8, y));',   /* M19 turbulence: shadowed billows in the spray wall (volume, not a flat white) */
        '  if (y < 0.0) { float yf = y * 200.0, fl = vfN(vec2(xs * 26.0, yf * 0.18 - t * 2.4)) * 0.6 + vfN(vec2(xs * 61.0, yf * 0.45 - t * 3.6)) * 0.4; streak = smoothstep(0.45, 0.85, fl); body = mix(vec3(0.4, 0.5, 0.62), vec3(0.97, 0.98, 1.0), clamp(streak * 0.85 + aer * 0.9, 0.0, 1.0)); }',   /* M19 the flume: shallow fast water — long streaks racing to the brink, whitening as it tips over */
        '  float clump = vfN(vec2(xs * 7.0 + 3.0, ya * 1.6 - t * 0.95)) * 0.6 + vfN(vec2(xs * 19.0, ya * 3.4 - t * 1.6)) * 0.4, ck = smoothstep(0.42, 0.78, clump) * smoothstep(0.02, 0.2, y); body = mix(body * (0.9 + 0.1 * clump), vec3(0.97, 0.98, 1.0), ck * 0.55);',   /* M20 HORSETAIL CLUMPS: big packets of aerated white falling (in free-fall time) through the sheet — water, not frosted glass */
        '  vec3 sp = vfSpec(y * 1.5 + x * 0.7 - t * 0.02); body += sp * (0.06 + 0.1 * aer + 0.08 * (1.0 - edge));',   /* light interference in the veil */
        '  body *= mix(1.0, 0.4, uNight); body += sp * 0.07 * uNight;',
        '  float a = edge * mix(0.62, 1.0, strand) * (0.6 + 0.4 * streak + 0.25 * aer); if (y < 0.0) a = edge * (0.66 + 0.3 * streak + 0.3 * aer);',
        '#ifdef VEIL_RIBS',
        '  float br = vfN(vec2(xs * 1.7 + 5.0, y * 0.45 - t * 0.012)), merge = 1.0 - smoothstep(0.48, 0.8, y);',
        '  float thin = clamp(vRib * 0.95 + (1.0 - smoothstep(0.22, 0.55, br)) * 0.7, 0.0, 1.0) * merge;',
        '  a *= 1.0 - 0.9 * thin; a = max(a, smoothstep(0.62, 0.95, y) * 0.9 * edge);',
        '  a *= 1.0 - 0.8 * smoothstep(0.88, 1.0, y) * (0.6 + 0.4 * rag) * (1.0 - 0.55 * uFilm);',   /* with the film below, the fall runs on down the rock instead of hanging a hem (review: a full stop of the fade made the lower third an opaque white wall; it keeps ~half its fade) */   /* the last rows dissolve into the spray: no hard hem above the sea (LOW has no mist) */
        '#endif',
        '#ifdef VEIL_FRONT',   /* M19 the front veil: separate flow bands of varying thickness with ragged edges, bowing out from the main sheet, gone before the spray */
        '  float fb = vfN(vec2(xs * 2.1 + 17.0, y * 0.35 - t * 0.02)) + 0.14 * vfN(vec2(xs * 23.0, y * 7.0 - t * 2.2));',
        '  a *= smoothstep(0.52, 0.68, fb) * smoothstep(0.015, 0.14, y) * (1.0 - smoothstep(0.7, 0.96, y)) * 0.8;',
        '#endif',
        '  if (y > 1.0) { float yf2 = clamp((y - 1.0) / 0.08, 0.0, 1.0), f1 = vfN(vec2(xs * 34.0, yf2 * 1.4 - t * 2.2)) * 0.6 + vfN(vec2(xs * 90.0 + 5.0, yf2 * 3.0 - t * 3.6)) * 0.4, wh = smoothstep(0.32, 0.78, f1);',   /* M20 THE FILM: white water cascading down the last metres of rock into the sea — flush on the rock (host-safe) */
        '    body = mix(vec3(0.76, 0.8, 0.86), vec3(0.97, 0.98, 1.0), clamp(0.6 + 0.3 * wh + 0.3 * smoothstep(0.55, 1.0, yf2), 0.0, 1.0)) * mix(1.0, 0.42, uNight); a = edge * (0.58 + 0.26 * wh) * (1.0 + 0.1 * smoothstep(0.6, 1.0, yf2)); }   /* long vertical runs (not foil blotches), whitening into foam where it meets the sea */',
        '#ifdef VEIL_STRANDS', '  a = max(a, ck * 0.9 * edge * step(0.0, y)); a *= stM;', '#endif',
        '  gl_FragColor = vec4(body, clamp(a, 0.0, 0.96));', '#include <fog_fragment>', '}'].join('\n') }); }

/* THE CURTAIN (owner reference pass): the station lines (inner foot → crest) the curtain pours over, and the keep circles that hold the ridge
   sculpt still under it (macro.js feeds them to ridgeWarpField). The circles run up every station line and between neighbours, two
   stations past each edge (the crystal flanks), and only where the sculpt could reach — so the curtain rides the exact authored rock at
   every tier, and in-reach triangles stay bit-identical (host-safety 9). */
function curtainLines(stations, from, to) { var L = []; for (var k = Math.max(1, from); k <= Math.min(stations.length - 2, to); k++) { var sg = ridgeFaceSegment(stations, k); L.push({ k: k, inner: sg.innerA, crest: sg.crestA }); } return L; }
export function veilCurtainKeep(stations, W) { var CU = W && W.curtain; if (!CU) return [];
  var L = curtainLines(stations, CU.from - 2, CU.to + 2), out = [];
  function add(x, z) { if (Math.max(Math.abs(x), Math.abs(z)) >= 280) out.push({ x: +x.toFixed(2), z: +z.toFixed(2), r: 16 }); }
  for (var i = 0; i < L.length; i++) for (var s = 0; s <= 5; s++) { var f = s / 5, a = L[i], ax = a.inner.x + (a.crest.x - a.inner.x) * f, az = a.inner.z + (a.crest.z - a.inner.z) * f; add(ax, az);
    if (i + 1 < L.length) { var b = L[i + 1]; add((ax + b.inner.x + (b.crest.x - b.inner.x) * f) / 2, (az + b.inner.z + (b.crest.z - b.inner.z) * f) / 2); } }
  return out; }

export function createVeilFalls(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }; var group = null, own = [], night = !!ctx.night, clock = 0, info = {};
  var bufV = new THREE.Vector2(); var ANCH = null, crysGlow = null, plU = null, spU = null; var flMat = null, waterU = null, foamU = null, mistU = null, lampMat = null, glassMat = null, canopyMat = null, spireMat = null, padMat = null, litNightU = null, frontU = null, wetTU = null, bladeMat = null, lakeU = null;
  function tier() { try { return ctx.quality && ctx.quality.tier ? String(ctx.quality.tier()).toUpperCase() : 'HIGH'; } catch (e) { return 'HIGH'; } }
  function rnd(seed) { return ctx.rnd ? ctx.rnd(seed) : (function (s) { return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })(seed >>> 0); }
  function keep(o) { own.push(o); return o; }
  function fogUniforms(extra) { return THREE.UniformsUtils.merge([THREE.UniformsLib.fog, extra]); }

  function build() {
    var reg = ctx.registry || {}, M = reg.macro || {}; var W = (M.waterfalls || []).filter(function (w) { return w.style === 'VEIL'; })[0], HL = M.highland;
    if (!W || !HL) { log('veilFalls: registry.macro VEIL waterfall / highland missing — nothing built'); return; }
    var R = (M.mountains || []).filter(function (m) { return m.id === W.source_id; })[0]; if (!R) return;
    var st = ridgeStations(R, (M.mountains || []).indexOf(R)), si = W.station, segC = ridgeFaceSegment(st, si);
    var inC = segC.innerA, crC = segC.crestA;   /* the notch station: the tallest strand, the lip the highland sits behind */
    var rad = Math.hypot(crC.x, crC.z), ox = crC.x / rad, oz = crC.z / rad, SEA = reg.coast && reg.coast.sea_y !== undefined ? reg.coast.sea_y : -0.3;
    group = new THREE.Group(); group.name = 'VEIL_FALLS_HIGHLAND'; group.userData.noMerge = true; ctx.group.add(group); var T = tier(), LOW = T === 'LOW';

    /* ---------- 1. the fall: a broad multi-strand curtain (the owner's reference image: a wide white curtain split into strands by dark rock
       ribs, merging into one white wall of spray at the base). It pours over the crest from station curtain.from to curtain.to: the notch at
       `station` carries the tallest strand, the buttress noses between the notches become the rock ribs, and the lip steps down with the
       crest to the lower side tiers. The face under it is held unsculpted (veilCurtainKeep), so the water rides the rock at every tier. ---------- */
    var CU = W.curtain || { from: si - 1, to: si + 1 }, LINES = curtainLines(st, CU.from, CU.to), NS = LINES.length - 1, CPS = 12, NC = NS * CPS, NR = 46;
    var LIPW = W.lip_w_m || 24, OFF = 2.0, LIPD = 0.6, yTop = crC.y - LIPD, yBot = 3.6;
    function onLine(inner, crest, y) { return ridgeFacePoint(inner, crest, Math.min(y, crest.y)); }
    function faceOn(L, u, y) { var n = L.length - 1, i = Math.min(n - 1, Math.max(0, Math.floor(u))), f = u - i, a = onLine(L[i].inner, L[i].crest, y), b = onLine(L[i + 1].inner, L[i + 1].crest, y); return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f }; }
    var c0 = faceOn(LINES, 0, yBot), c1 = faceOn(LINES, NS, yBot), cm = faceOn(LINES, NS / 2, yBot), sideK = ((c1.x - c0.x) * -cm.z - (c1.z - c0.z) * -cm.x) > 0 ? 1 : -1, CH = Math.hypot(c1.x - c0.x, c1.z - c0.z);   /* which side of the station order faces the field; the base chord */
    function normalOn(L, u, y) { var n = L.length - 1, a = faceOn(L, Math.max(0, u - 0.08), y), b = faceOn(L, Math.min(n, u + 0.08), y), tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1; return { x: -tz / l * sideK, z: tx / l * sideK }; }
    function lipAt(u) { var i = Math.min(NS - 1, Math.floor(u)), f = u - i; return LINES[i].crest.y + (LINES[i + 1].crest.y - LINES[i].crest.y) * f - LIPD; }
    var nose = LINES.map(function (Ln, i) { if (i === 0 || i === NS) return 0; var r = function (q) { return Math.hypot(LINES[q].crest.x, LINES[q].crest.z); }; return Math.max(0, Math.min(1, ((r(i - 1) + r(i + 1)) / 2 - r(i)) / 25)); });   /* a buttress nose juts toward the field between two notches */
    function ribAt(u) { var k = Math.round(u); return (nose[k] || 0) * (1 - Math.min(1, Math.max(0, (Math.abs(u - k) - 0.1) / 0.28))); }
    var brA = faceOn(LINES, NS / 2 - 0.6, yTop), brB = faceOn(LINES, NS / 2 + 0.6, yTop), brS = ((brB.x - brA.x) * oz - (brB.z - brA.z) * ox) >= 0 ? 1 : -1;   /* which way the station order runs along the lip tangent (oz, -ox) */
    /* M20 THE FILM (owner: "waterfall-to-water transition"): the curtain hangs 2 m off the face down to 3.6 m, where host safety stops anything
       standing proud (the base is inside the reach square) — so the fall used to end in a hard hem over 3.6 m of bare rock. Below 3.4 m the
       water now continues as a FILM made of the ridge rock's OWN triangles under the curtain (a local subset of MACRO_RIDGE_RIDGE_NEAR),
       clipped at 3.8 m and lifted 3 cm along each triangle's normal — flush everywhere by construction (the ≤ 5 cm rule), folds and notches
       included (a grid draped across them bridged the air). One draw, the curtain's material. No ridge (LOW / no macro) → no film, as before. */
    var filmTri = null; if (!LOW) (function () { var RN = ctx.group && ctx.group.getObjectByName ? ctx.group.getObjectByName('MACRO_RIDGE_RIDGE_NEAR') : null; if (!RN) return; RN.updateMatrixWorld(true);
      var P0 = RN.geometry.attributes.position, I0 = RN.geometry.index, n0 = I0 ? I0.count : P0.count, lo = { x: 1e9, z: 1e9 }, hi = { x: -1e9, z: -1e9 }, va = new THREE.Vector3(), out = [];
      LINES.forEach(function (Ln) { [Ln.inner, Ln.crest].forEach(function (q) { lo.x = Math.min(lo.x, q.x); lo.z = Math.min(lo.z, q.z); hi.x = Math.max(hi.x, q.x); hi.z = Math.max(hi.z, q.z); }); });
      for (var k = 0; k < n0; k += 3) { var tri = [], y0 = 1e9, y1 = -1e9, cx = 0, cz = 0; for (var e = 0; e < 3; e++) { va.fromBufferAttribute(P0, I0 ? I0.getX(k + e) : k + e).applyMatrix4(RN.matrixWorld); tri.push(va.x, va.y, va.z); y0 = Math.min(y0, va.y); y1 = Math.max(y1, va.y); cx += va.x / 3; cz += va.z / 3; }
        if (y1 < SEA - 2 || y0 > yBot + 4 || cx < lo.x - 25 || cx > hi.x + 25 || cz < lo.z - 25 || cz > hi.z + 25) continue; out.push.apply(out, tri); }
      if (out.length) { var fg = keep(new THREE.BufferGeometry()); fg.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); filmTri = new THREE.Mesh(fg, keep(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))); filmTri.updateMatrixWorld(true); } })();
    /* M20 THE CURTAIN IN PLAN (owner: waterfall realism first; review: the fall read as tall folded glass fins). Under the curtain the face is
       a zigzag of knife-thin buttress fins and ~45 m deep bays, and the curtain rode 2 m off every facet of it: from the field a row of flat
       sheets seen edge-on, folding back on itself (180° hairpins) at every bay back. Each row is now drawn in plan: the offset face with the
       hairpins pushed out to a clean clearance and lightly smoothed, then — as the water falls clear of the lip — eased 70 % of the way toward
       the span across the fin tips (the field-side hull of the face, 1.4 × the offset out). Inside each bay that is a blend between a point
       in the bay and a point on its mouth, so it never enters the rock. The lip rows (and the flume's brink rows) still leave the crest where
       it is; ~40 m down the fall hangs as one broad sheet bowing gently into each bay, facing the field. The wet-rock sheet keeps to the face. */
    /* M20 STRANDS (review: the curtain's top followed the crest from 80 m at the ends up to 147 m at the notch and back — a triangle of water
       poured over a mountain slope, the "glass fin" silhouette). Water leaves a crest only at its notches, over a LEVEL lip: the bay backs
       (the crest stations set deepest into the ridge — 107, 110, 112). 110 carries the flume from the highland lake: the broad main fall,
       24 m at the lip spreading to span the bay mouth below; the two side notches pour narrower horsetails from 5 m under their crests. The
       dark wet rock and the fin crests show between them — the reference's strands split by rock ribs, without water on a slope. */
    var STR = [], rC = function (k) { return Math.hypot(LINES[k].crest.x, LINES[k].crest.z); }, crY = function (u) { var i = Math.min(NS - 1, Math.max(0, Math.floor(u))), f = u - i; return LINES[i].crest.y + (LINES[i + 1].crest.y - LINES[i].crest.y) * f; };
    for (var sk = 1; sk < NS && STR.length < 4; sk++) if (rC(sk) > rC(sk - 1) && rC(sk) > rC(sk + 1)) { var smain = Math.abs(sk - NS / 2) < 0.5, slip = LINES[sk].crest.y + (smain ? 1 : -5), sd = 0.6;   /* the main lip is the curtain's own top edge (the level cut sits above it) */
      if (!smain) { sd = 0.12; while (sd < 0.5 && crY(sk - sd - 0.02) >= slip + 0.5 && crY(sk + sd + 0.02) >= slip + 0.5) sd += 0.02; }
      STR.push(new THREE.Vector4(sk / NS, slip, sd / NS, (smain ? 1.25 : 0.8) / NS)); }
    while (STR.length < 4) STR.push(new THREE.Vector4(0, 0, 0, 0));
    info.strands = STR.filter(function (v) { return v.z > 0; }).map(function (v) { return { station: LINES[Math.round(v.x * NS)].k, lip_y: +Math.min(v.y, lipAt(v.x * NS)).toFixed(1), lip_w_m: +(v.z * 2 * CH).toFixed(1), base_w_m: +(v.w * 2 * CH).toFixed(1) }; });
    var SPANW = 0.7, SPANT = 0.3, rowCache = {};
    function rowPath(t) { var key = t.toFixed(5), off = OFF; if (rowCache[key]) return rowCache[key];
      var S2 = CPS, M2 = NS * S2, FV = [], SN = [], P = [], Sm = [], k, i;
      for (k = 0; k <= NS; k++) FV.push(faceOn(LINES, k, lipAt(k) + (yBot - lipAt(k)) * t));
      for (k = 0; k < NS; k++) { var sx = FV[k + 1].x - FV[k].x, sz = FV[k + 1].z - FV[k].z, sl = Math.hypot(sx, sz) || 1; SN.push({ x: -sz / sl * sideK, z: sx / sl * sideK }); }
      function project(p, d) { for (var rp = 0; rp < 3; rp++) for (var s = 0; s < NS; s++) { var a = FV[s], b = FV[s + 1], ex = b.x - a.x, ez = b.z - a.z, tau = ((p.x - a.x) * ex + (p.z - a.z) * ez) / (ex * ex + ez * ez || 1), inner = tau > 0 && tau < 1; tau = Math.max(0, Math.min(1, tau));
          var cx = a.x + ex * tau, cz = a.z + ez * tau, dx = p.x - cx, dz = p.z - cz, dd = Math.hypot(dx, dz), side = dx * SN[s].x + dz * SN[s].z;
          if (inner) { if (side < d && side > -3 * d) { p.x += SN[s].x * (d - side); p.z += SN[s].z * (d - side); } } else if (dd < d && dd > 1e-6 && side > -0.5 * d) { p.x = cx + dx / dd * d; p.z = cz + dz / dd * d; } } }
      for (i = 0; i <= M2; i++) { var u = i / S2, y = lipAt(u) + (yBot - lipAt(u)) * t, f = faceOn(LINES, u, y), n = normalOn(LINES, u, y); P.push({ x: f.x + n.x * off, z: f.z + n.z * off }); }
      P.forEach(function (p) { project(p, off); });
      for (i = 0; i <= M2; i++) { var h = Math.min(5, i, M2 - i), wx = 0, wz = 0, ws = 0; for (k = -h; k <= h; k++) { var w = Math.exp(-k * k / 4.5); wx += P[i + k].x * w; wz += P[i + k].z * w; ws += w; } Sm.push({ x: wx / ws, z: wz / ws }); }
      Sm.forEach(function (p) { project(p, off); });
      if (t > 0) { var A0 = FV[0], ax = FV[NS].x - A0.x, az = FV[NS].z - A0.z, al = Math.hypot(ax, az) || 1, e = { x: ax / al, z: az / al }, fz = { x: -e.z, z: e.x }, nm = SN[Math.floor(NS / 2)];
        if (fz.x * nm.x + fz.z * nm.z < 0) { fz.x = -fz.x; fz.z = -fz.z; }
        var H = [], srt = FV.map(function (p, q) { return { k: q, a: (p.x - A0.x) * e.x + (p.z - A0.z) * e.z, b: (p.x - A0.x) * fz.x + (p.z - A0.z) * fz.z }; }).sort(function (p, q) { return p.a - q.a; });
        srt.forEach(function (p) { while (H.length >= 2) { var o = H[H.length - 2], q = H[H.length - 1]; if ((q.a - o.a) * (p.b - o.b) - (q.b - o.b) * (p.a - o.a) >= 0) H.pop(); else break; } H.push(p); });   /* the field-side hull: the fin tips the span rests on */
        var hk = H.map(function (p) { return p.k; }).sort(function (p, q) { return p - q; }), wt = Math.min(1, t / SPANT), ww = SPANW * wt * wt * (3 - 2 * wt), q0 = 0, FR = [];
        for (i = 0; i <= M2; i++) { var uu = i / S2; while (q0 < hk.length - 2 && hk[q0 + 1] <= uu) q0++; var k0 = hk[q0], k1 = hk[q0 + 1], fr = (uu - k0) / (k1 - k0), p0 = FV[k0], p1 = FV[k1], cx2 = p1.x - p0.x, cz2 = p1.z - p0.z, cl = Math.hypot(cx2, cz2) || 1;
          var tcx = cx2 / cl, tcz = cz2 / cl, ncx = -tcz * sideK, ncz = tcx * sideK, am = (Sm[i].x - p0.x) * tcx + (Sm[i].z - p0.z) * tcz, bm = (Sm[i].x - p0.x) * ncx + (Sm[i].z - p0.z) * ncz;
          FR.push({ x: p0.x, z: p0.z, tx: tcx, tz: tcz, nx: ncx, nz: ncz, a: am + (fr * cl - am) * ww / SPANW, b: bm + (off * 1.4 - bm) * ww }); }
        for (i = 0; i <= M2; i++) { var hb = Math.min(4, i, M2 - i), sb = 0, sw = 0; for (k = -hb; k <= hb; k++) { var wb = Math.exp(-k * k / 6); sb += FR[i + k].b * wb; sw += wb; } var F2 = FR[i], bb = F2.b + (sb / sw - F2.b) * ww / SPANW;   /* and the depth eases smoothly round each fin tip */
          Sm[i] = { x: F2.x + F2.tx * F2.a + F2.nx * bb, z: F2.z + F2.tz * F2.a + F2.nz * bb }; } }   /* in the chord's frame: along the chord the columns settle evenly (no sliding down the fin walls into spikes), across it the sheet keeps 30 % of the bay's depth */
      rowCache[key] = Sm; return Sm; }
    function curtain(off, rib, opt) { opt = opt || {}; var pos = [], uv = [], rb = [], idx = [], i, j, J0 = opt.brink ? -4 : 0, rows = NR - J0 + 1, BRK = [20, 12, 6, 2.2], BRV = [-0.1, -0.065, -0.035, -0.012];   /* M19: opt.brink — four rows run the flume's water down its length and over the crest at the notch (the high terrain pours INTO the fall); opt.bow(t) — extra offset down the drop */
      for (j = J0; j <= NR; j++) { var t = Math.max(0, j / NR), o2 = off + (opt.bow ? opt.bow(t) : 0), RP = opt.span ? rowPath(t) : null;
        for (i = 0; i <= NC; i++) { var u = i / CPS, top = lipAt(u), y = top + (yBot - top) * t, px, pz, vv = t;
          if (RP) { var ia = Math.max(0, i - 1), ib = Math.min(NC, i + 1), tx = RP[ib].x - RP[ia].x, tz = RP[ib].z - RP[ia].z, tl = Math.hypot(tx, tz) || 1; px = RP[i].x - tz / tl * sideK * (o2 - OFF); pz = RP[i].z + tx / tl * sideK * (o2 - OFF); }   /* the front veil: off the curtain's own path */
          else { var p = faceOn(LINES, u, y), n = normalOn(LINES, u, y); px = p.x + n.x * o2; pz = p.z + n.z * o2; }
          if (j < 0) { var bw = Math.min(1, Math.max(0, (0.95 - Math.abs(u - NS / 2)) / 0.35)), D = BRK[j + 4], lat = brS * Math.max(-1, Math.min(1, (u - NS / 2) / 0.6)) * (LIPW * 0.4 - 0.05); bw = bw * bw * (3 - 2 * bw); px += (crC.x + ox * D + oz * lat - px) * bw; pz += (crC.z + oz * D - ox * lat - pz) * bw; y += (HL.top_y_m + (j === -1 ? 0.18 : 0.26) - y) * bw; vv = BRV[j + 4]; }   /* M20: the flume rows lie on the channel's own frame (lip + axis·D + tangent·lat) — they used to be pushed back along each station's face normal, fanning the cove's normals into a few 30 m spikes that smeared the flow noise into flat grey blotches */
          pos.push(px, y, pz); uv.push(i / NC, vv); if (rib) rb.push(ribAt(u)); } }
      for (j = 0; j < rows - 1; j++) for (i = 0; i < NC; i++) { var a = j * (NC + 1) + i, b = a + NC + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
      var g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if (rib) g.setAttribute('aRib', new THREE.Float32BufferAttribute(rb, 1)); g.setIndex(idx); g.computeBoundingSphere(); return g; }
    var fallMat = keep(veilWaterMaterial(THREE, { night: night, sx: NS * 0.8, ribs: true, strands: STR, strandBase: yBot })); waterU = fallMat.uniforms;
    var fall = new THREE.Mesh(curtain(OFF, true, { brink: true, span: true }), fallMat); fall.name = 'VEIL_FALLS_CURTAIN'; fall.renderOrder = 6; group.add(fall);
    if (filmTri) (function () { var FP = filmTri.geometry.attributes.position, BPL = [], YC = 3.8, fp = [], fu = [], A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3(), cen = new THREE.Vector3(), nf = 0;
      for (var q = 0; q <= NS * 8; q++) { var fq = faceOn(LINES, q / 8, yBot), nq = normalOn(LINES, q / 8, yBot); BPL.push({ x: fq.x, z: fq.z, nx: nq.x, nz: nq.z }); }
      function nearQ(x, z) { var qb2 = 0, d2 = 1e9; for (var q2 = 0; q2 < BPL.length; q2++) { var dd2 = Math.hypot(x - BPL[q2].x, z - BPL[q2].z); if (dd2 < d2) { d2 = dd2; qb2 = q2; } } return { q: qb2, d: d2 }; }
      function vtx(P) { fp.push(P.x + nn.x * 0.03, P.y + nn.y * 0.03, P.z + nn.z * 0.03); fu.push(nearQ(P.x, P.z).q / (BPL.length - 1), 1 + 0.08 * Math.max(0, Math.min(1, (YC - P.y) / (YC - SEA)))); }   /* u per vertex: the streaks run continuously across the rock facets */
      function lerpY(P, Q, y) { var f = (y - P.y) / (Q.y - P.y); return new THREE.Vector3(P.x + (Q.x - P.x) * f, y, P.z + (Q.z - P.z) * f); }
      for (var k = 0; k < FP.count; k += 3) { A.fromBufferAttribute(FP, k); B.fromBufferAttribute(FP, k + 1); C.fromBufferAttribute(FP, k + 2); if (Math.min(A.y, B.y, C.y) > YC || Math.max(A.y, B.y, C.y) < SEA - 1) continue;
        cen.copy(A).add(B).add(C).multiplyScalar(1 / 3); var nq0 = nearQ(cen.x, cen.z), qb = nq0.q; if (nq0.d > 5) continue;
        nn.crossVectors(e1.subVectors(B, A), e2.subVectors(C, A)).normalize(); var out = nn.x * BPL[qb].nx + nn.z * BPL[qb].nz; if (out < 0) { nn.negate(); out = -out; var sw = B.clone(); B.copy(C); C.copy(sw); } if (out < 0.2 && nn.y < 0.5) continue;   /* rock facing the field (or a ledge top): water runs over it */
        var T = [A.clone(), B.clone(), C.clone()], up = T.filter(function (P) { return P.y > YC; }).length, tris = [];
        if (up === 0) tris.push(T); else { var r = 0; while (!(T[r].y > YC && T[(r + 1) % 3].y <= YC) && r < 3) r++;   /* clip at YC: keep the part below */
          if (up === 1) { var a2 = T[(r + 1) % 3], b2 = T[(r + 2) % 3], P1 = lerpY(T[r], a2, YC), P2 = lerpY(b2, T[r], YC); tris.push([P1, a2, b2], [P1, b2, P2]); }
          else { var lo2 = T.filter(function (P) { return P.y <= YC; })[0], li = T.indexOf(lo2), pa = T[(li + 2) % 3], pb = T[(li + 1) % 3]; tris.push([lo2, lerpY(lo2, pb, YC), lerpY(lo2, pa, YC)]); } }
        tris.forEach(function (tt) { tt.forEach(function (P) { vtx(P); }); nf++; }); }
      if (!nf) return; var fg2 = keep(new THREE.BufferGeometry()); fg2.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg2.setAttribute('uv', new THREE.Float32BufferAttribute(fu, 2)); fg2.setAttribute('aRib', new THREE.Float32BufferAttribute(new Float32Array(fp.length / 3), 1)); fg2.computeBoundingSphere();
      var film = new THREE.Mesh(fg2, fallMat); film.name = 'VEIL_FALLS_FILM'; film.renderOrder = 5.9; group.add(film); fallMat.uniforms.uFilm.value = 1; info.fall_film = { triangles: nf, lift_m: 0.03, top_m: YC }; })();
    /* M19 MULTIPLE FLOW BANDS (owner: "multiple flow bands, varying thickness, broken edges … depth"): a second, broken veil in front of the
       main sheet — bands of water that shot further off the lip, bowing up to ~3.6 m out and rejoining before the spray; its own noise seed,
       so it never repeats the sheet behind it. One draw, not on LOW; bottom at the same 3.6 m as the curtain. */
    if (!LOW) { var frontMat = keep(veilWaterMaterial(THREE, { night: night, sx: NS * 0.8, front: true, seed: 7.3, strands: STR, strandBase: yBot })); frontU = frontMat.uniforms;
      var front = new THREE.Mesh(curtain(OFF + 0.3, false, { span: true, bow: function (t) { return 3.6 * Math.sin(Math.PI * Math.min(1, t * 1.1)); } }), frontMat); front.name = 'VEIL_FALLS_FRONT'; front.renderOrder = 6.5; group.add(front); info.front_veil = true; }
    /* the wet rock behind the water: a darker, glistening sheet on the face, so the white strands read against dark rock and the ribs between them read wet */
    var wetU = fogUniforms({ uNight: { value: night ? 1 : 0 }, uTime: { value: 0 } }); wetU.uStr = { value: STR }; wetU.uStrBase = { value: yBot }; wetTU = wetU; var wetMat = keep(new THREE.ShaderMaterial({ uniforms: wetU, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
      vertexShader: '#include <common>\n#include <fog_pars_vertex>\nvarying vec2 vUv; varying float vWy;\nvoid main() { vUv = uv; vWy = (modelMatrix * vec4(position, 1.0)).y; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
      fragmentShader: ['#include <common>', '#include <fog_pars_fragment>', 'uniform float uNight; uniform float uTime; varying vec2 vUv;', NOISE, STRAND, 'void main() { float side = min(vUv.x, 1.0 - vUv.x), stL; float a = smoothstep(0.0, 0.06, side) * (0.5 + 0.2 * vfN(vUv * vec2(9.0, 30.0))) * (1.0 - smoothstep(0.86, 1.0, vUv.y)) * vfStrand(vUv.x, vWy, uTime, 1.25, 3.0, stL);',   /* M20: the rock is wet only round the strands (and a little above their lips) */
        '  float gl = pow(vfN(vec2(vUv.x * 160.0, vUv.y * 22.0 - uTime * 0.9)), 7.0) * 0.9 + pow(vfN(vec2(vUv.x * 70.0 + 3.0, vUv.y * 9.0 - uTime * 0.5)), 9.0) * 0.6;',   /* M19: trickles glinting down the wet rock (reflected light) */
        '  gl_FragColor = vec4((vec3(0.11, 0.13, 0.19) + vec3(0.55, 0.6, 0.68) * gl * (1.0 - 0.5 * uNight)) * mix(1.0, 0.6, uNight), a * 0.8 + gl * 0.15);', '#include <fog_fragment>', '}'].join('\n') }));
    var wet = new THREE.Mesh(curtain(0.8, false), wetMat); wet.name = 'VEIL_FALLS_WET_ROCK'; wet.renderOrder = 5; group.add(wet); info.wet_rock = true;
    var baseX = 0, baseZ = 0, BP = []; for (var q = 0; q <= NS * 4; q++) { var up = q / 4, pb = faceOn(LINES, up, yBot), nb = normalOn(LINES, up, yBot); BP.push({ x: pb.x, z: pb.z, nx: nb.x, nz: nb.z }); baseX += pb.x / (NS * 4 + 1); baseZ += pb.z / (NS * 4 + 1); }
    baseX -= ox * 10; baseZ -= oz * 10;   /* the plunge centre: the base polyline's centroid, stood off toward the field */
    info.fall = { lip_y: +yTop.toFixed(2), bottom_y: yBot, stations: [LINES[0].k, LINES[NS].k], columns: NC, rows: NR, chord_m: +CH.toFixed(1), offset_m: OFF, ribs: nose.map(function (v) { return +v.toFixed(2); }) };

    /* ---------- 2. the plunge: one long foam field on the sea (flush 3 cm) + a white wall of rising spray along the whole base ---------- */
    var foamG = keep(new THREE.PlaneGeometry(2, 4.2, 1, 1)); foamG.rotateX(-Math.PI / 2); foamG.translate(0, 0, -1.1);   /* M19: the plunge disc plus the outflow toward the lower world (-z → the field) */ foamU = fogUniforms({ uTime: { value: 0 }, uNight: { value: night ? 1 : 0 } });
    var foamMat = keep(new THREE.ShaderMaterial({ uniforms: foamU, transparent: true, depthWrite: false, fog: true,
      vertexShader: '#include <common>\n#include <fog_pars_vertex>\nvarying vec2 vP;\nvoid main() { vP = position.xz; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
      fragmentShader: ['#include <common>', '#include <fog_pars_fragment>', 'uniform float uTime; uniform float uNight; varying vec2 vP;', NOISE,
        'void main() { float r = length(vP); float n = vfN(vP * 9.0 + vec2(uTime * 0.4, -uTime * 0.7)) * 0.6 + vfN(vP * 23.0 - vec2(uTime * 0.9, uTime * 0.3)) * 0.4;',
        '  float fo = (1.0 - smoothstep(0.25, 1.0, r)) * smoothstep(0.35, 0.75, n + (1.0 - r) * 0.35);',
        '  float rg = 0.5 + 0.5 * sin((r * 7.0 - uTime * 0.55) * 6.2832); fo = max(fo, (1.0 - smoothstep(0.55, 1.25, r)) * smoothstep(0.55, 0.95, rg * (0.6 + 0.4 * n)) * 0.55);',   /* M19 THE PLUNGE: rings of foam pushed out from the impact */
        '  float al = max(0.0, -vP.y - 0.4), wd = 0.5 + al * 0.22, lat = abs(vP.x) / wd;',   /* M19 THE CONTINUATION: streaks of foam carried out toward the lower world, spreading and thinning */
        '  float st = vfN(vec2(vP.x * 11.0 / (1.0 + al * 0.4), al * 2.4 - uTime * 0.22)) * 0.7 + vfN(vec2(vP.x * 29.0, al * 6.0 - uTime * 0.4)) * 0.3;',
        '  fo = max(fo, smoothstep(0.58, 0.82, st) * (1.0 - smoothstep(0.55, 1.0, lat)) * (1.0 - smoothstep(0.6, 2.6, al)) * step(0.0, -vP.y - 0.4) * 0.75);',
        'vec3 c = vec3(0.95, 0.97, 1.0) * mix(1.0, 0.45, uNight);',
        '  gl_FragColor = vec4(c, fo * 0.85);', '#include <fog_fragment>', '}'].join('\n') }));
    var foam = new THREE.Mesh(foamG, foamMat); foam.scale.set(CH * 0.62, 1, 36); foam.rotation.y = Math.atan2(ox, oz); foam.position.set(baseX, SEA + 0.03, baseZ); foam.name = 'VEIL_FALLS_FOAM'; foam.renderOrder = 5; group.add(foam);
    info.foam_y_above_sea = 0.03;
    /* M20 THE PLUNGE LINE (owner: "waterfall-to-water transition"; review: the strands ended in a hem over a calm blue sea). Where each strand
       meets the sea, a band of churning white water along its landing line — from 2 m under the hem out 16 m toward the field, a dense boil
       at the impact breaking into lace and streaks as it spreads, only under the strands (their own mask at base width). Flush on the sea
       (3 cm — the foam's own rule), one draw; the older foam field stays as the wide outflow. */
    (function () { var RB = rowPath(1), NW = 8, pw = [], pu = [], pi = [], i, j, L = 0; for (i = 1; i <= NC; i++) L += Math.hypot(RB[i].x - RB[i - 1].x, RB[i].z - RB[i - 1].z);
      for (i = 0; i <= NC; i++) { var ia = Math.max(0, i - 4), ib = Math.min(NC, i + 4), tx = RB[ib].x - RB[ia].x, tz = RB[ib].z - RB[ia].z, tl = Math.hypot(tx, tz) || 1, nx = -tz / tl * sideK, nz = tx / tl * sideK;   /* a wide tangent: no fans at the fin tips */
        for (j = 0; j <= NW; j++) { var dd = -2 + 18 * j / NW; pw.push(RB[i].x + nx * dd, SEA + 0.03, RB[i].z + nz * dd); pu.push(i / NC, j / NW); } }
      for (i = 0; i < NC; i++) for (j = 0; j < NW; j++) { var a0 = i * (NW + 1) + j, b0 = a0 + NW + 1; pi.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
      var wg = keep(new THREE.BufferGeometry()); wg.setAttribute('position', new THREE.Float32BufferAttribute(pw, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(pu, 2)); wg.setIndex(pi); wg.computeBoundingSphere();
      plU = fogUniforms({ uTime: { value: 0 }, uNight: { value: night ? 1 : 0 }, uLen: { value: L } }); plU.uStr = { value: STR }; plU.uStrBase = { value: yBot };
      var plMat = keep(new THREE.ShaderMaterial({ uniforms: plU, transparent: true, depthWrite: false, fog: true,
        vertexShader: '#include <common>\n#include <fog_pars_vertex>\nvarying vec2 vUv; varying float vWy;\nvoid main() { vUv = uv; vWy = 0.0; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
        fragmentShader: ['#include <common>', '#include <fog_pars_fragment>', 'uniform float uTime; uniform float uNight; uniform float uLen; varying vec2 vUv;', NOISE, STRAND,
          'void main() { float stL, m = vfStrand(vUv.x, uStrBase - 1.0, uTime, 1.3, 0.0, stL), d = vUv.y * 18.0 - 2.0, xm = vUv.x * uLen;',
          '  float n1 = vfN(vec2(xm * 0.32, d * 0.45 - uTime * 0.8)), n2 = vfN(vec2(xm * 1.05 + 7.0, d * 1.2 - uTime * 1.6)), n3 = vfN(vec2(xm * 2.6 - 3.0, d * 2.4 - uTime * 2.3));',
          '  float boil = (1.0 - smoothstep(0.5, 6.5, d)) * (0.72 + 0.28 * n3), lace = smoothstep(0.46, 0.8, n1 * 0.55 + n2 * 0.3 + n3 * 0.15) * (1.0 - smoothstep(3.0, 16.0, d));',
          '  float fo = max(boil, lace * 0.8) * m * smoothstep(-2.0, -0.6, d);',
          '  gl_FragColor = vec4(vec3(0.95, 0.97, 1.0) * (0.9 + 0.1 * n2) * mix(1.0, 0.45, uNight), fo * 0.9);', '#include <fog_fragment>', '}'].join('\n') }));
      var pl = new THREE.Mesh(wg, plMat); pl.name = 'VEIL_FALLS_PLUNGE'; pl.renderOrder = 5.5; group.add(pl); info.plunge_line = { length_m: +L.toFixed(1), band_m: [-2, 16], y_above_sea: 0.03 }; })();
    /* M20 THE SPRAY WALL (owner reference: "a white wall of spray at the base"; review: the strands met the sea with no spray at all — the M19
       puffs read as glowing orbs and were retired). A soft billowing sheet of spray standing off each strand's landing line: it fades in
       from 3.6 m (nothing new below 3.4 m within the host's reach), thickest ~8–16 m up, thinning into the air by ~42 m, leaning out toward
       the field as it rises; alpha-blended grey-white billows with shadowed cores (a volume, not a glow), faded near the eye so a close
       camera never sees a white screen. Strand mask at base width, one draw, not LOW. */
    if (!LOW) (function () { var RB = rowPath(1), NV = 10, pw = [], pu = [], pi = [], i, j, L = 0, Y0 = Math.max(yBot, 3.6), Y1 = 42; for (i = 1; i <= NC; i++) L += Math.hypot(RB[i].x - RB[i - 1].x, RB[i].z - RB[i - 1].z);
      for (i = 0; i <= NC; i++) { var ia = Math.max(0, i - 4), ib = Math.min(NC, i + 4), tx = RB[ib].x - RB[ia].x, tz = RB[ib].z - RB[ia].z, tl = Math.hypot(tx, tz) || 1, nx = -tz / tl * sideK, nz = tx / tl * sideK;
        for (j = 0; j <= NV; j++) { var fy = j / NV, yy = Y0 + (Y1 - Y0) * fy, dd = 3 + 9 * Math.pow(fy, 1.3); pw.push(RB[i].x + nx * dd, yy, RB[i].z + nz * dd); pu.push(i / NC, fy); } }
      for (i = 0; i < NC; i++) for (j = 0; j < NV; j++) { var a0 = i * (NV + 1) + j, b0 = a0 + NV + 1; pi.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
      var sg = keep(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.Float32BufferAttribute(pw, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(pu, 2)); sg.setIndex(pi); sg.computeBoundingSphere();
      spU = fogUniforms({ uTime: { value: 0 }, uNight: { value: night ? 1 : 0 }, uLen: { value: L } }); spU.uStr = { value: STR }; spU.uStrBase = { value: yBot };
      var spMat = keep(new THREE.ShaderMaterial({ uniforms: spU, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
        vertexShader: '#include <common>\n#include <fog_pars_vertex>\nvarying vec2 vUv; varying float vWy; varying float vEye;\nvoid main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vWy = wp.y; vEye = length(cameraPosition - wp.xyz); vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
        fragmentShader: ['#include <common>', '#include <fog_pars_fragment>', 'uniform float uTime; uniform float uNight; uniform float uLen; varying vec2 vUv; varying float vEye;', NOISE, STRAND,
          'void main() { float stL, m = vfStrand(vUv.x, uStrBase - 1.0, uTime, 1.35, 0.0, stL), xm = vUv.x * uLen, h = vUv.y;',
          '  float b1 = vfN(vec2(xm * 0.09, vWy * 0.07 - uTime * 0.22)), b2 = vfN(vec2(xm * 0.23 + 5.0, vWy * 0.16 - uTime * 0.41)), b3 = vfN(vec2(xm * 0.6 - 2.0, vWy * 0.4 - uTime * 0.7));',
          '  float bil = b1 * 0.55 + b2 * 0.3 + b3 * 0.15, prof = smoothstep(0.0, 0.14, h) * (1.0 - smoothstep(0.3, 1.0, h));',
          '  float a = m * prof * smoothstep(0.22, 0.62, bil + 0.18 * (1.0 - h)) * 0.75 * smoothstep(6.0, 30.0, vEye);',
          '  vec3 c = mix(vec3(0.74, 0.77, 0.82), vec3(0.97, 0.98, 1.0), smoothstep(0.35, 0.8, b2 * 0.6 + b3 * 0.4)) * mix(1.0, 0.42, uNight);',   /* shadowed cores, lit rims */
          '  gl_FragColor = vec4(c, a);', '#include <fog_fragment>', '}'].join('\n') }));
      var sp = new THREE.Mesh(sg, spMat); sp.name = 'VEIL_FALLS_SPRAY'; sp.renderOrder = 6.8; group.add(sp); info.spray_wall = { from_y: Y0, to_y: Y1, stand_off_m: [3, 12] }; })();
    if (!LOW) { var NB = T === 'MED' ? 230 : 420, NT2 = 0,   /* no mid-height tier on the broad curtain: its puffs read as glowing orbs */
        NM = NB + NT2, mp = new Float32Array(NM * 3), ms = new Float32Array(NM), mr = new Float32Array(NM), r0 = rnd(0x7E11), midY = yTop * 0.46 + yBot * 0.54;
      for (var m = 0; m < NM; m++) { var tier2 = m >= NB, uu = r0() * NS, bq = BP[Math.min(BP.length - 1, Math.round(uu * 4))];
        if (!tier2) { var d0 = OFF + 3 + r0() * 16; mp[m * 3] = bq.x + bq.nx * d0 + (r0() - 0.5) * 8; mp[m * 3 + 1] = 0.5; mp[m * 3 + 2] = bq.z + bq.nz * d0 + (r0() - 0.5) * 8; mr[m] = 34 + r0() * 40; }
        else { uu = NS * (0.2 + 0.6 * r0()); var mc = faceOn(LINES, uu, midY), mn = normalOn(LINES, uu, midY); mp[m * 3] = mc.x + mn.x * (OFF + 2); mp[m * 3 + 1] = midY - 4 + r0() * 8; mp[m * 3 + 2] = mc.z + mn.z * (OFF + 2); mr[m] = 10 + r0() * 8; } ms[m] = r0(); }
      var mg = keep(new THREE.BufferGeometry()); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3)); mg.setAttribute('aSeed', new THREE.BufferAttribute(ms, 1)); mg.setAttribute('aRise', new THREE.BufferAttribute(mr, 1)); mg.boundingSphere = new THREE.Sphere(new THREE.Vector3(baseX, 60, baseZ), CH * 0.6 + 140);
      mistU = { uTime: { value: 0 }, uNight: { value: night ? 1 : 0 }, uScale: { value: 700 }, uOut: { value: new THREE.Vector2(-ox, -oz) } };
      var mistMat = keep(new THREE.ShaderMaterial({ uniforms: mistU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: 'attribute float aSeed; attribute float aRise; uniform float uTime; uniform float uScale; uniform vec2 uOut; varying float vA; varying float vH; varying float vS;\nvoid main() { float ph = fract(aSeed + uTime * (0.03 + aSeed * 0.02)); vec3 p = position; p.y += ph * aRise; p.xz += uOut * ph * aRise * 0.35; p.x += sin(uTime * 0.3 + aSeed * 40.0) * 4.0 * ph; p.z += cos(uTime * 0.23 + aSeed * 31.0) * 3.0 * ph;\n  vA = sin(ph * 3.14159) * (0.55 + 0.45 * aSeed); vH = ph; vS = aSeed; vec4 mv = modelViewMatrix * vec4(p, 1.0); vA *= smoothstep(10.0, 55.0, -mv.z); gl_PointSize = min(uScale * (8.0 + 18.0 * ph) / max(1.0, -mv.z), uScale * 0.5); gl_Position = projectionMatrix * mv; }',
        fragmentShader: ['uniform float uNight; varying float vA; varying float vH; varying float vS;',
          'vec3 mSpec(float t) { t = fract(t) * 7.0; vec3 v = vec3(0.706, 0.549, 1.0), i = vec3(0.498, 0.816, 1.0), w = vec3(0.957, 0.965, 1.0), g = vec3(1.0, 0.847, 0.541), p = vec3(1.0, 0.604, 0.824), c = vec3(1.0, 0.44, 0.51);',
          '  if (t < 1.0) return mix(v, i, t); if (t < 2.0) return mix(i, w, t - 1.0); if (t < 3.0) return mix(w, g, t - 2.0); if (t < 4.0) return mix(g, w, t - 3.0); if (t < 5.0) return mix(w, p, t - 4.0); if (t < 6.0) return mix(p, c, t - 5.0); return mix(c, v, t - 6.0); }',   /* the aura's five-class prism: violet, ice blue, pale gold, pink, a little crimson — through white, never green or orange */
          'void main() { float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard; float s = pow(1.0 - r, 1.8);',
          '  vec3 c = mix(vec3(0.93, 0.96, 1.0), mSpec(vS * 0.8 + vH * 0.9), smoothstep(0.3, 0.85, vH) * 0.5 * (1.0 - 0.7 * uNight));',   /* M19: the spectrum lives in the rising mist — white spray low, prismatic as it climbs */
          '  gl_FragColor = vec4(c * s * vA * mix(0.085, 0.1, uNight), 1.0); }'].join('\n') }));   /* M19: points fade within ~10–55 m of the eye and never grow past half the frame scale — the plume no longer blows a close view out to white */
      var mist = new THREE.Points(mg, mistMat); mist.name = 'VEIL_FALLS_MIST'; mist.renderOrder = 7; group.add(mist); info.mist = NM; }

    /* M20 VEIL CRYSTALS, SOFTENED (owner 2026-09-27: "remove sharp objects and edges, even with the diamonds … more of a transition into the
       magic power look"; reinforcement: bias away from old-game trees / plants and chunky primitive forms): every Veil crystal was a raw
       flat-shaded octahedron — diamonds on sticks in the groves, floating diamonds in the gardens, octahedral grass, spiky cliff clumps, a
       48 m octahedron spire. They now share the world's soft crystal language (auraForms.softCrystalGeometry + the soft crystal shader, as
       the sky gems / monoliths / shards after wave 1): gems with rounded edges, short girdles and blunted points; ground columns rooted
       with contact darkening; the class tint in the body and the glow (USE_COLOR — the old USE_INSTANCING_COLOR tint never ran in the
       fragment, so every Veil crystal glowed plain white); fewer cliff clumps. */
    var SQ = LOW ? 'LOW' : T; crysGlow = { value: night ? 0.5 : 0.35 };
    function softMat(o) { var m = keep(new THREE.MeshStandardMaterial(Object.assign({ color: 0xbababa, roughness: 0.12, metalness: 0.18, emissive: 0xffffff, emissiveIntensity: night ? 0.3 : 0.08, transparent: true, opacity: 0.92, envMapIntensity: 0.9 }, o || {})));   /* a lighter equal-channel body (review: 0x909090 read as saturated candy at garden range) */
      m.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance *= vColor.rgb;\n#endif'); };
      m.customProgramCacheKey = function () { return 'veil_soft_crystal_m20'; };
      applyCrystal(THREE, m, { tier: SQ, soft: true, glow: crysGlow, facet: 0.45, depth: 0.32, rim: 0.3, tipFade: 0.35, rimFade: 0.2, fadeNear: [10, 26], facetGlow: 0.6, facetLight: 0.5 }); return m; }
    function gemG() { return softCrystalGeometry(THREE, { sides: 6, samples: SQ === 'HIGH' ? 3 : 2, round: 0.1, bevel: LOW ? 0 : 0.03, profile: [[-0.5, 0], [-0.44, 0.05], [0.02, 0.4], [0.1, 0.4], [0.44, 0.05], [0.5, 0]] }); }   /* unit gem: height 1, section radius 0.4 */
    function colG(o) { return softCrystalGeometry(THREE, Object.assign({ sides: 6, samples: SQ === 'HIGH' ? 2 : 1, bevel: LOW ? 0 : 0.03, ground: true, contact: 0.12, profile: [[-0.1, 0.9], [0.1, 0.95], [0.62, 0.8], [0.88, 0.22], [1.0, 0]] }, o || {})); }   /* unit ground column: rooted at y 0, blunted tip at 1 */
    /* ---------- 2b. crystal growth on the cliffs (the reference's lush cliffs, in the VISIONARY palette — violet, silver, a little ice; never
       green): patches of small clumps clinging to the flanks either side of the curtain. Every clump sits ≥ 3.4 m up, on
       rock the sculpt keeps still; visual only, no collider. One instanced draw; not on LOW. ---------- */
    if (!LOW) { var FLL = curtainLines(st, CU.from - 2, CU.from), FLR = curtainLines(st, CU.to, CU.to + 2), fr = rnd(0xF011A), NF = T === 'MED' ? 36 : 60, FP = [];   /* M20: fewer, intentional clumps (was 150 / 90) */
      /* patches, not scatter: a dozen growth patches on the two flanks, each a tight group of small clumps hugging the rock */
      for (var pi = 0; pi < (T === 'MED' ? 5 : 8); pi++) { var PL = pi % 2 ? FLR : FLL, pu = pi % 2 ? 0.2 + fr() * 1.7 : fr() * 1.7, pk = Math.min(PL.length - 2, Math.floor(pu)), ptop = PL[pk].crest.y + (PL[pk + 1].crest.y - PL[pk].crest.y) * (pu - pk) - 3, py = 12 + (ptop - 16) * Math.pow(fr(), 0.6);
        for (var ci = 0; ci < NF / (T === 'MED' ? 5 : 8) && FP.length < NF; ci++) { var u2 = Math.max(0, Math.min(PL.length - 1.001, pu + (fr() - 0.5) * 0.35)), s2 = 1.3 + fr() * 1.9, y2 = Math.max(4 + s2 * 0.7, Math.min(ptop, py + (fr() - 0.5) * 22));
          var fp = faceOn(PL, u2, y2), fn = normalOn(PL, u2, y2); FP.push({ x: fp.x + fn.x * 0.35, y: y2, z: fp.z + fn.z * 0.35, nx: fn.x, nz: fn.z, s: s2, c: fr() }); } }
      var fg2 = [[0.45, 1.9, 0.45, 0, 0, 0, 0], [0.3, 1.25, 0.3, 0.42, 0, 0.1, -0.45], [0.26, 1.0, 0.26, -0.4, 0, -0.12, 0.5]].map(function (P) { var g = colG(); g.scale(P[0], P[1], P[2]); g.rotateZ(P[6]); g.translate(P[3], P[4], P[5]); return g; });   /* a rooted hero column and two leaning companions */
      var fgeo = keep(mergeGeometries(fg2, false)); fg2.forEach(function (g) { g.dispose(); });
      flMat = softMat({ emissiveIntensity: night ? 0.45 : 0.14 });
      var fI = new THREE.InstancedMesh(fgeo, flMat, Math.max(1, FP.length)), fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), fup = new THREE.Vector3(0, 1, 0), fax = new THREE.Vector3(), fcol = new THREE.Color(), FPAL = [0x6b55b0, 0x7d62c4, 0x9a78e0, 0x5e4a9a, 0x8a86a8, 0xb48cff, 0x7d62c4];
      FP.forEach(function (F, k) { fax.set(F.nx * 0.9, 1, F.nz * 0.9).normalize(); fq.setFromUnitVectors(fup, fax); fq.multiply(new THREE.Quaternion().setFromAxisAngle(fup, F.c * 6.283));
        fm.compose(new THREE.Vector3(F.x, F.y, F.z), fq, new THREE.Vector3(F.s, F.s, F.s)); fI.setMatrixAt(k, fm); fI.setColorAt(k, fcol.setHex(FPAL[Math.floor(F.c * FPAL.length) % FPAL.length])); });
      fI.count = FP.length; fI.name = 'VEIL_CLIFF_CRYSTALS'; fI.computeBoundingSphere(); group.add(fI); info.cliff_crystals = FP.length; info.cliff_min_y = FP.reduce(function (m, F) { return Math.min(m, F.y - F.s * 0.35); }, 1e9); }

    /* ---------- 3. the highland mesa ---------- */
    var CB = HL.center_bearing, CD = HL.center_dist_m, CX = Math.sin(CB) * CD, CZ = Math.cos(CB) * CD, er = [Math.sin(CB), Math.cos(CB)], et = [Math.cos(CB), -Math.sin(CB)];
    var TOP = HL.top_y_m, AR = HL.radial_m, AT = HL.tangential_m, RING = LOW ? 12 : (T === 'MED' ? 28 : 36), SEG = LOW ? 72 : (T === 'MED' ? 150 : 200), rn = rnd(0x51C3);   /* M19: a finer meadow on HIGH / MED (was 22 × 120) so the flush paving, rills and garden walls meet the ground it actually draws */
    var lip = { x: crC.x, z: crC.z }, lakeC = { x: lip.x + ox * 20, z: lip.z + oz * 20 };   /* the source lake just behind the lip */
    function roll0(x, z) { var h = 1.4 * Math.sin(x * 0.047 + 1.3) * Math.cos(z * 0.041 - 0.7) + 0.7 * Math.sin((x + z) * 0.11); var dl = Math.hypot(x - lakeC.x, z - lakeC.z); return h * Math.min(1, Math.max(0, (dl - 16) / 22)); }
    function rimR(th) { var e = Math.hypot(Math.cos(th) / AR, Math.sin(th) / AT); return (1 / e) * (1 + 0.09 * Math.sin(th * 3 + 0.7) + 0.05 * Math.sin(th * 7 + 2.1)); }
    /* M15c: the residential crescent is laid out BEFORE the meadow is built, so flat pads sit under every home and garden, the civic
       plaza and the overlooks (the meadow's gentle roll varies by up to ~2.6 m across a 30 m plaza) */
    var PADS = [];
    function roll(x, z) { var h = roll0(x, z); for (var i = 0; i < PADS.length; i++) { var P = PADS[i], d = Math.hypot(x - P.x, z - P.z), E = P.e || 7; if (d < P.r + E) { var w = d <= P.r ? 1 : 1 - (d - P.r) / E; w = w * w * (3 - 2 * w); h += (P.h - h) * w; } } return h; }
    function L2W(lx, lz) { return { x: CX + er[0] * lx + et[0] * lz, z: CZ + er[1] * lx + et[1] * lz }; }
    function laneX(lz) { return 3 + lz * lz / 420; }   /* the crescent: concave toward the lake and the lip */
    /* M19: H.ds — the side of a home its door (and the side path) is on: toward the district's middle. The M15c rule (lz > 0 → -1) assumed an
       unmirrored frame; L2W is a mirror, so every door had faced the crescent's ends, and the last one opened onto the mesa's edge. */
    var RES = (function () { var rl = rnd(0xA11B), face0 = Math.atan2(-ox, -oz), busy = [{ x: lakeC.x + ox * 6, z: lakeC.z + oz * 6, r: 20 }, { x: lip.x, z: lip.z, r: 14 }, { x: Math.sin(HL.spire_bearing) * HL.spire_dist_m, z: Math.cos(HL.spire_bearing) * HL.spire_dist_m, r: 12 }];
      function free(p, r) { if (Math.hypot(p.x, p.z) < 372) return false; for (var q = 0; q < busy.length; q++) if (Math.hypot(p.x - busy[q].x, p.z - busy[q].z) < busy[q].r + r) return false; return true; }
      var civ = L2W(laneX(0) + 2, 0); busy.push({ x: civ.x, z: civ.z, r: 16 }); PADS.push({ x: civ.x, z: civ.z, r: 16.5, h: roll0(civ.x, civ.z) });
      /* two rows either side of the lane, each slot at least 20 m from the next, clear of the lake, the spire and the civic plaza (front
         row toward the lake and the view; the back row looks over it) */
      var homes = []; [[-52, -1], [-32, -1], [50, -1], [-56, 1], [-34, 1], [34, 1], [56, 1]].forEach(function (S) { var hz = S[0], sd = S[1], hx = laneX(hz) + sd * 11.5;
        if (Math.hypot((hx + sd * 9) / AR, hz / AT) > 0.9) return; var P = L2W(hx, hz); if (!free(P, 10)) return;
        var yaw = face0 + (rl() - 0.5) * 0.22, h0 = roll0(P.x, P.z), gx = P.x + Math.sin(yaw) * 7.8, gz = P.z + Math.cos(yaw) * 7.8;
        homes.push({ x: P.x, z: P.z, lz: hz, yaw: yaw, W: 12 + rl() * 2.5, ds: (et[0] * Math.cos(yaw) - et[1] * Math.sin(yaw)) * hz > 0 ? -1 : 1 }); busy.push({ x: P.x, z: P.z, r: 10 }); PADS.push({ x: P.x, z: P.z, r: 11, h: h0 }, { x: gx, z: gz, r: 7, h: h0, e: 4 }); });   /* the home and its garden share one level (M19: the garden terrace falls away over 4 m below its retaining wall, not 7) */
      var looks = []; [-1, 1].forEach(function (sd) { var lz = sd * 56, lx = -Math.sqrt(Math.max(0, 0.86 * 0.86 - (lz / AT) * (lz / AT))) * AR, P = L2W(lx, lz); if (!free(P, 8)) return; var Q = L2W(lx - 10, lz);
        looks.push({ x: P.x, z: P.z, yaw: Math.atan2(Q.x - P.x, Q.z - P.z) }); busy.push({ x: P.x, z: P.z, r: 10 }); PADS.push({ x: P.x, z: P.z, r: 4, h: roll0(P.x, P.z) }); });
      return { civ: civ, homes: homes, looks: looks, face: face0 }; })();
    /* M19 THE WATER PLAN (owner 2026-09-27: "water runoff / wetness logic, drainage where appropriate, transition toward the waterfall"):
       the source lake already stood 0.25 m over the meadow, so it becomes what that is — a raised stone BASIN; the channel to the lip becomes
       a stone FLUME between wet banks that pours over the lip; two stone RILLS carry the district's runoff from springs beside the lane down
       into the basin, each starting where the meadow stands higher than the water. Wetness follows the water: a damp margin round the
       basin, wet banks along the flume and the rills, spray-wet ground at the lip. */
    var LK = { x: lakeC.x + ox * 6, z: lakeC.z + oz * 6 }, tgx = oz, tgz = -ox;   /* the basin's centre; its 24 m axis runs along the tangent (oz, -ox), its 16 m axis along o */
    function lakeE(x, z) { var dx = x - LK.x, dz = z - LK.z; return Math.hypot((dx * ox + dz * oz) / 8, (dx * tgx + dz * tgz) / 12); }   /* 1 on the water's edge */
    function chanD(x, z) { var dx = x - lip.x, dz = z - lip.z, a = dx * ox + dz * oz, b = Math.abs(dx * tgx + dz * tgz); return Math.max(a < -2 ? -2 - a : (a > 20 ? a - 20 : 0), b - LIPW * 0.4); }   /* metres outside the flume */
    var RILLS = []; [-1, 1].forEach(function (sd) { var best = null; [19, 22, 25, 28].forEach(function (az) { var S = L2W(laneX(sd * az) - 4.6, sd * az), h = roll0(S.x, S.z); if (!best || h > best.h) best = { S: S, h: h, lz: sd * az }; });
      if (!best || best.h < 0.3) return; var S = best.S, e = lakeE(S.x, S.z), E = { x: LK.x + (S.x - LK.x) / e * 1.04, z: LK.z + (S.z - LK.z) / e * 1.04 }, mx = (S.x + E.x) / 2 + (E.z - S.z) * 0.16 * sd, mz = (S.z + E.z) / 2 - (E.x - S.x) * 0.16 * sd, pts = [];
      for (var i = 0; i <= 24; i++) { var t = i / 24, u = 1 - t; pts.push({ x: u * u * S.x + 2 * u * t * mx + t * t * E.x, z: u * u * S.z + 2 * u * t * mz + t * t * E.z }); } RILLS.push({ pts: pts, spring: S, h: best.h, lz: best.lz }); });
    function segD(x, z, P) { var b = 1e9; for (var i = 1; i < P.length; i++) { var ax = P[i - 1].x, az = P[i - 1].z, dx = P[i].x - ax, dz = P[i].z - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); b = Math.min(b, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return b; }
    function wetK(x, z) { var w = Math.max(0, 1 - Math.max(0, (lakeE(x, z) - 1) * 9 - 0.8) / 2.4) * 0.7; w = Math.max(w, Math.max(0, 1 - Math.max(0, chanD(x, z)) / 3)); w = Math.max(w, Math.max(0, 1 - Math.max(0, Math.hypot(x - lip.x, z - lip.z) - 12) / 9) * 0.85);
      for (var r = 0; r < RILLS.length; r++) w = Math.max(w, Math.max(0, 1 - Math.max(0, segD(x, z, RILLS[r].pts) - 0.7) / 1.6) * 0.6); return Math.min(1, w); }
    function gardenK(x, z) { var g = 0; for (var i = 0; i < PADS.length; i++) { var P = PADS[i]; if (P.r < 5) continue; var d = Math.hypot(x - P.x, z - P.z) - P.r - 1.5; g = Math.max(g, d <= 0 ? 1 : Math.max(0, 1 - d / 4)); } return g; }   /* the tended lawn round the homes and the civic plaza */
    var gp = [], gc = [], gi = [], gw = [], col = new THREE.Color(), meadowA = new THREE.Color(0x7b7674), meadowB = new THREE.Color(0x676261), meadowC = new THREE.Color(0x847d86), lawnA = new THREE.Color(0x837e7b), rockA = new THREE.Color(0x3b4154), rockB = new THREE.Color(0x6f6b75);   /* M19: a silver-greige lawn (was lavender-grey, and a cool grey read periwinkle under the sky light — the land must read neither purple nor TITAN blue): a faint mauve only in the bloom drifts, lighter and even where it is tended */
    function vtx(x, y, z, c, w) { gp.push(x, y, z); gc.push(c.r, c.g, c.b); gw.push(w || 0); return gp.length / 3 - 1; }
    var cIdx = vtx(CX, TOP + roll(CX, CZ), CZ, meadowA), rings = [];
    for (var k = 1; k <= RING; k++) { var fk = k / RING, row = []; for (var s2 = 0; s2 < SEG; s2++) { var th = s2 / SEG * Math.PI * 2, rr = rimR(th) * fk, lx = Math.cos(th) * rr, lz = Math.sin(th) * rr;
        var x = CX + er[0] * lx + et[0] * lz, z = CZ + er[1] * lx + et[1] * lz, yy = TOP + roll(x, z) - (fk > 0.86 ? (fk - 0.86) * 12 : 0);
        var nz = 0.5 + 0.5 * Math.sin(x * 0.09 + z * 0.13) * Math.sin(x * 0.031 - z * 0.057); col.copy(meadowA).lerp(nz > 0.6 ? meadowC : meadowB, Math.abs(nz - 0.5) * 1.6); var gk = gardenK(x, z); if (gk > 0) col.lerp(lawnA, gk * 0.75); if (fk > 0.9) col.lerp(rockB, (fk - 0.9) * 6);
        row.push(vtx(x, yy, z, col, fk > 0.92 ? 0 : wetK(x, z))); } rings.push(row); }
    /* M19 (found in the M19 aerial audit): L2W is a mirror frame (det -1), so the meadow's old winding faced DOWN and the whole meadow top was
       back-face culled — from above and at eye level the eye fell through to the ridge rock and the sea (strip() already righted its ribbons).
       The same triangles, wound up. */
    for (s2 = 0; s2 < SEG; s2++) gi.push(cIdx, rings[0][s2], rings[0][(s2 + 1) % SEG]);
    for (k = 0; k < RING - 1; k++) for (s2 = 0; s2 < SEG; s2++) { var a0 = rings[k][s2], a1 = rings[k][(s2 + 1) % SEG], b0 = rings[k + 1][s2], b1 = rings[k + 1][(s2 + 1) % SEG]; gi.push(a0, b0, a1, a1, b0, b1); }
    var topCount = gi.length, prev = rings[RING - 1], drops = [[10, 5], [34, 12], [78, 22], [118, 30]];   /* the mesa's cliff skirt: drop / outward flare */
    drops.forEach(function (D, di) { var row = []; for (var s3 = 0; s3 < SEG; s3++) { var q = prev[s3], px = gp[q * 3], py = gp[q * 3 + 1], pz = gp[q * 3 + 2], dx = px - CX, dz = pz - CZ, dl = Math.hypot(dx, dz) || 1;
        var thS = s3 / SEG * Math.PI * 2, jag = Math.sin(thS * 17 + di * 1.3) * 1.6 + Math.sin(thS * 41 - di) * 0.9 + (rn() - 0.5) * 0.8, ny = TOP - D[0] + Math.sin(thS * 13 + di * 2) * 1.4 + (rn() - 0.5) * 1.2;   /* M19: the break-away follows the angle (was a random step per segment — a saw-tooth fringe from above once the finer meadow doubled the segments) */ col.copy(rockA).lerp(rockB, 0.55 - di * 0.12 + (rn() - 0.5) * 0.2);
        var toField = Math.max(0, -(dx / dl * er[0] + dz / dl * er[1])), fl = D[1] * (1 - toField * 1.6) + jag * (1 - toField);   /* the field-facing side tucks back into the ridge body instead of flaring in front of the face and the fall */
        row.push(vtx(CX + dx / dl * (Math.hypot(dx, dz) + fl), ny, CZ + dz / dl * (Math.hypot(dx, dz) + fl), col)); }
      for (s3 = 0; s3 < SEG; s3++) { var p0 = prev[s3], p1 = prev[(s3 + 1) % SEG], q0 = row[s3], q1 = row[(s3 + 1) % SEG]; gi.push(p0, q0, p1, p1, q0, q1); } prev = row; });
    var hg = keep(new THREE.BufferGeometry()); hg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); hg.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); hg.setAttribute('aWet', new THREE.Float32BufferAttribute(gw, 1)); hg.setAttribute('aLit', new THREE.Float32BufferAttribute(new Float32Array(gw.length), 1)); hg.setIndex(gi); hg.computeVertexNormals();
    hg.addGroup(0, topCount, 0); hg.addGroup(topCount, gi.length - topCount, 1);   /* the meadow top and the rock skirt: one mesh, two material groups */
    var hm = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.05, envMapIntensity: 0.3 })), rockM = keep(new THREE.MeshStandardMaterial({ color: 0x5a6172, roughness: 0.88, metalness: 0.04, flatShading: true, envMapIntensity: 0.2 }));
    applyGeology(THREE, rockM, { strata: 2.2, tier: T });   /* the ridges' own rock language on the mesa cliffs */
    /* M19 THE LAWN (owner: "ground material, grass … lifeless flat ground" is out): the meadow top gets a crystal-lawn surface in world space —
       drifts at 3–9 m, blade grain and a combed streak up close, sparse crystal glints, the tended evenness of the gardens (vertex tone), wet
       ground darker and glossier (aWet, from the water plan) and the bollards' light pools at night (aLit, baked once below). Value /
       roughness only; LOW keeps the tone terms without the relief. */
    litNightU = { value: night ? 1 : 0 };
    hm.onBeforeCompile = function (sh) { sh.uniforms.uLitN = litNightU;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aWet; attribute float aLit; varying float vWet; varying float vLit; varying vec3 vLw;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWet = aWet; vLit = aLit; vLw = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uLitN; varying float vWet; varying float vLit; varying vec3 vLw;\n' + NOISE)
        .replace('#include <color_fragment>', ['#include <color_fragment>', 'vec2 lp = vLw.xz; float lnear = 1.0 - smoothstep(16.0, 95.0, length(cameraPosition - vLw));',
          'float lm = vfN(lp * 0.12) * 0.6 + vfN(lp * 0.41 + 7.0) * 0.4;', 'float lg = vfN(lp * 2.4) * 0.45 + vfN(lp * 7.3 + 3.0) * 0.3 + vfN(vec2(lp.x * 21.0 + lp.y * 6.0, lp.y * 21.0 - lp.x * 6.0)) * 0.25;',
          'float lsp = step(0.988, vfH(floor(lp * 6.0))) * lnear * (1.0 - vWet); float lwR = 1.0 + (lg - 0.5) * 0.35 * lnear;',
          'diffuseColor.rgb *= (0.8 + 0.4 * lm) * (1.0 + (lg - 0.5) * 0.34 * lnear); diffuseColor.rgb *= mix(1.0, 0.56, vWet); lwR *= mix(1.0, 0.3, vWet);',
          'diffuseColor.rgb += vec3(0.30, 0.31, 0.34) * lsp; lwR *= 1.0 - 0.75 * lsp;'].join('\n'))
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * lwR, 0.06, 1.0);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.93, 0.84) * vLit * 0.6 * uLitN * diffuseColor.rgb;')
        .replace('#include <normal_fragment_maps>', LOW ? '#include <normal_fragment_maps>' : '#include <normal_fragment_maps>\n{ float lh = lg * 0.035 * lnear; vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition); vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx); float det = dot(dpx, r1); vec3 grad = sign(det) * (dFdx(lh) * r1 + dFdy(lh) * r2); normal = normalize(abs(det) * normal - grad); }'); };
    hm.customProgramCacheKey = function () { return 'veil_lawn_m19' + (LOW ? 'L' : 'H'); };
    var ground = new THREE.Mesh(hg, [hm, rockM]); ground.name = 'VEIL_HIGHLAND_GROUND'; ground.receiveShadow = true; group.add(ground);
    /* M19: the height of the meadow as DRAWN (its triangles, not the smooth roll) — every flush part below sits on this, so nothing sinks into
       a coarse cell or floats over it (the pad ramps bend faster than a cell) */
    function gY(x, z) { var dx = x - CX, dz = z - CZ, lx = er[0] * dx + er[1] * dz, lz = et[0] * dx + et[1] * dz, th = Math.atan2(lz, lx); if (th < 0) th += Math.PI * 2;
      var sf = th / (Math.PI * 2) * SEG, s0 = Math.floor(sf) % SEG, s1 = (s0 + 1) % SEG, fs = sf - Math.floor(sf), rr = rimR(s0 / SEG * Math.PI * 2) * (1 - fs) + rimR(s1 / SEG * Math.PI * 2) * fs, kk = Math.hypot(lx, lz) / rr * RING;
      function Y(i) { return gp[i * 3 + 1]; }
      if (kk >= RING) return Y(rings[RING - 1][s0]) * (1 - fs) + Y(rings[RING - 1][s1]) * fs;
      if (kk < 1) { var c = Y(cIdx); return c + kk * (Y(rings[0][s0]) * (1 - fs) + Y(rings[0][s1]) * fs - c); }
      var k0 = Math.floor(kk), f2 = kk - k0, A0 = rings[k0 - 1], B0 = rings[k0], a0 = Y(A0[s0]), a1 = Y(A0[s1]), b0 = Y(B0[s0]), b1 = Y(B0[s1]);
      return fs + f2 <= 1 ? a0 + fs * (a1 - a0) + f2 * (b0 - a0) : b1 + (1 - fs) * (b0 - b1) + (1 - f2) * (a1 - b1); }

    /* the source lake + the channel to the lip (flush water on the meadow) */
    var lakeG = keep(new THREE.CircleGeometry(1, 40)); lakeG.rotateX(-Math.PI / 2); var lakeM = keep(new THREE.MeshStandardMaterial({ color: 0x3e4b5d, roughness: 0.05, metalness: 0.72, envMapIntensity: 0.9, transparent: true, opacity: 0.94 }));
    /* M19 water realism: the basin was a flat navy disc from above (a hole in the district). A steel tone, and slow wind ripples in world space —
       two drifting noise layers bend the normal, so the sky breaks up in the water; the rill's water runs (its ripples ride the flow speed) */
    lakeU = { uTime: { value: 0 } }; lakeM.onBeforeCompile = function (sh) { sh.uniforms.uTime = lakeU.uTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLkW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLkW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; varying vec3 vLkW;\n' + NOISE).replace('#include <normal_fragment_maps>', ['#include <normal_fragment_maps>',
        '{ vec2 q = vLkW.xz; float e = 0.35, t = uTime; float h0 = vfN(q * 0.9 + vec2(t * 0.21, t * 0.13)) * 0.6 + vfN(q * 2.3 - vec2(t * 0.34, -t * 0.27)) * 0.4;',
        '  float hx = vfN((q + vec2(e, 0.0)) * 0.9 + vec2(t * 0.21, t * 0.13)) * 0.6 + vfN((q + vec2(e, 0.0)) * 2.3 - vec2(t * 0.34, -t * 0.27)) * 0.4, hz = vfN((q + vec2(0.0, e)) * 0.9 + vec2(t * 0.21, t * 0.13)) * 0.6 + vfN((q + vec2(0.0, e)) * 2.3 - vec2(t * 0.34, -t * 0.27)) * 0.4;',
        '  float fade = 1.0 - smoothstep(40.0, 160.0, length(cameraPosition - vLkW)); vec3 wn = normalize(vec3(-(hx - h0) / e * 0.15 * fade, 1.0, -(hz - h0) / e * 0.15 * fade)); normal = normalize(mix(normal, (viewMatrix * vec4(wn, 0.0)).xyz, 0.85)); }'].join('\n')); };
    lakeM.customProgramCacheKey = function () { return 'veil_lake_m19'; }; skyWater(THREE, lakeM, ctx, { refl: 0.9, body: 0.6, land: 0.3 });   /* M20: the basin mirrors the sky like the sea and the canals */
    lakeG.scale(12, 1, 8); lakeG.rotateY(Math.atan2(ox, oz)); lakeG.translate(lakeC.x + ox * 6, TOP + 0.25, lakeC.z + oz * 6);
    /* M19: the channel to the lip is no longer a still mirror plane — its bed is wet dark stone (the paving draw, M19 block) and the water running
       down it is the curtain's own flowing sheet (the curtain's brink rows): shallow fast water over stone, whitening at the brink */
    var lwG = keep(new THREE.BufferGeometry()), lw1 = lakeG.index ? lakeG.toNonIndexed() : lakeG; lwG.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(lw1.attributes.position.array), 3)); lwG.computeVertexNormals();
    var lake = new THREE.Mesh(lwG, lakeM); lake.name = 'VEIL_HIGHLAND_LAKE'; group.add(lake);   /* the basin (M19: with its rills and springs): one draw */

    /* placement helper: meadow points away from the lake, the lip and each other */
    var taken = [{ x: lakeC.x + ox * 6, z: lakeC.z + oz * 6, r: 20 }, { x: lip.x, z: lip.z, r: 14 }];
    function spot(minR, clear, rngf) { for (var tries = 0; tries < 200; tries++) { var th2 = rngf() * Math.PI * 2, f2 = Math.sqrt(rngf()) * 0.8, rr2 = rimR(th2) * f2, lx2 = Math.cos(th2) * rr2, lz2 = Math.sin(th2) * rr2;
        var x2 = CX + er[0] * lx2 + et[0] * lz2, z2 = CZ + er[1] * lx2 + et[1] * lz2; if (Math.hypot(x2, z2) < minR) continue; var ok = true; for (var q2 = 0; q2 < taken.length; q2++) if (Math.hypot(x2 - taken[q2].x, z2 - taken[q2].z) < taken[q2].r + clear) { ok = false; break; } if (!ok) continue; taken.push({ x: x2, z: z2, r: clear }); return { x: x2, z: z2, y: TOP + roll(x2, z2) }; } return null; }

    /* M15c THE RESIDENTIAL CRESCENT (owner 2026-09-27 world-language reference, principles only — human-scale futurism, softened
       precision, calm hierarchy, livability; no game asset or data): the highland's houses become a quiet street. A pale lane curves
       across the mesa behind the source lake; homes stand along it in two staggered rows, every one facing the view. A home is a glass
       ground floor with rounded ends, a white upper volume cantilevered toward the view with a lit ribbon window, and a lens-shaped
       canopy roof on slender columns; a low curved garden wall holds crystal shrubs in the class colours in front of it. At the lane's
       middle a round civic pavilion under a broad canopy faces the lake and the lip — the calm focal point under the spire. Two
       crescent overlooks sit on the field-facing rim either side of the falls, their rails lit at night. Visual only, beyond the host's
       reach like the rest of the highland; everything joins the existing villa draws (the shrubs join the grove canopy instances). */
    var bodyP = [], darkP = [], glassP = [], spireParts = [], shrubs = [], laneLamps = [], gardens = [], sidePaths = [], benchAt = [], face = RES.face;
    var VT = tier() === 'LOW' ? 'LOW' : 'MED'; function boxAt(list, w, h, d, x, y, z, yaw) { var bg = softBox(THREE, w, h, d, Math.min(0.6, Math.min(w, h, d) * 0.24), VT); bg.rotateY(yaw); bg.translate(x, y, z); list.push(bg); }   /* M14 (design DNA, seen from afar): every villa / belvedere volume is filleted — no raw box edge on the highland skyline */
    var SEGR = VT === 'LOW' ? 12 : 20, rv = rnd(0xA11A);
    function W3(lx, lz) { var p = L2W(lx, lz); p.y = TOP + roll(p.x, p.z); return p; }
    function pillAt(list, w, h, d, x, y, z, yaw) { var r = d / 2, core = Math.max(0.05, w - d), b = new THREE.BoxGeometry(core, h, d), e1 = new THREE.CylinderGeometry(r, r, h, SEGR), e2 = e1.clone(); e1.translate(core / 2, 0, 0); e2.translate(-core / 2, 0, 0); [b, e1, e2].forEach(function (g) { g.rotateY(yaw); g.translate(x, y, z); list.push(g); }); }   /* a stadium-plan volume: straight sides, round ends */
    function lensAt(list, rx, rz, hT, hB, x, y, z, yaw) { var e = 0.4 / Math.min(rx, rz), t = 0.2, pts = [], i, u;   /* a lens canopy: a shallow dome over a shallower soffit, meeting in a soft rounded rim (~0.4 m) — never a knife edge */
      for (i = 0; i <= 6; i++) { u = i / 6; pts.push(new THREE.Vector2(u * (1 - e), -t - (hB - t) * (1 - u * u))); }
      for (i = 1; i < 8; i++) { var a = -Math.PI / 2 + i / 8 * Math.PI; pts.push(new THREE.Vector2(1 - e + e * Math.cos(a), t * Math.sin(a))); }
      for (i = 6; i >= 0; i--) { u = i / 6; pts.push(new THREE.Vector2(u * (1 - e), t + (hT - t) * (1 - u * u))); }
      var g = new THREE.LatheGeometry(pts, SEGR + 8); g.scale(rx, 1, rz); g.rotateY(yaw); g.translate(x, y, z); list.push(g); }
    function arcAt(list, R, tube, A, x, y, z, yaw) { var g = new THREE.TorusGeometry(R, tube, 5, Math.max(8, Math.round(A * 9)), A); g.rotateX(-Math.PI / 2); g.rotateY(-Math.PI / 2 - A / 2 + yaw); g.translate(x, y, z); list.push(g); }   /* a flat arc centred on the yaw's forward (sin yaw, cos yaw) */
    function colAt(list, h, x, y, z) { var g = new THREE.CylinderGeometry(0.16, 0.24, h, 8); g.translate(x, y + h / 2, z); list.push(g); }
    function strip(list, a, b, w, lift) { var n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2.5)), dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, px = -dz / l * w / 2, pz = dx / l * w / 2, P = [], I = [];
      for (var i = 0; i <= n; i++) { var f = i / n, x = a.x + dx * f, z = a.z + dz * f; P.push(x - px, gY(x - px, z - pz) + lift, z - pz, x + px, gY(x + px, z + pz) + lift, z + pz); if (i) { var k = i * 2 - 2; I.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); if (g.attributes.normal.getY(0) < 0) { I.reverse(); g.setIndex(I); g.computeVertexNormals(); } list.push(g); }   /* a flush ribbon that follows the meadow */
    function fwd(yaw, k) { return [Math.sin(yaw) * k, Math.cos(yaw) * k]; } function side(yaw, k) { return [Math.cos(yaw) * k, -Math.sin(yaw) * k]; }
    var SHRUB = [CLASS_TINT.purple, CRYSTAL_TINT.gold, CRYSTAL_TINT.pink, CRYSTAL_TINT.red, CRYSTAL_TINT.blue, 0xd9dcef];   /* M16: gardens of all five classes + pearl white (was purple / violet / pink-led) */
    /* the lane: a pale 3.4 m ribbon on the meadow, lanterns along both edges */
    for (var li = 0, lz = -62; lz < 62; lz += 4, li++) {   /* M19: the lane itself is laid in the paving draw (below); this loop keeps its lamps */
      if (li % 2 === 0) { var dl = (laneX(lz + 0.5) - laneX(lz - 0.5)), nl = Math.hypot(1, dl); [-1, 1].forEach(function (sd) { var P = W3(laneX(lz) + sd * 2.4 / nl, lz - sd * 2.4 * dl / nl); laneLamps.push(P.x, P.y + 1.2, P.z); }); } }
    /* the civic pavilion: a round glass hall under a broad lens canopy on a white round plaza, at the lane's middle, facing the lake */
    var civ = RES.civ; civ.y = TOP + roll(civ.x, civ.z); taken.push({ x: civ.x, z: civ.z, r: 16 });
    (function () { var pl = new THREE.CylinderGeometry(15, 15.4, 0.5, SEGR * 2); pl.translate(civ.x, civ.y + 0.02, civ.z); bodyP.push(pl);
      var hall = new THREE.CylinderGeometry(7, 7, 4.4, SEGR * 2, 1, true); hall.translate(civ.x, civ.y + 0.25 + 2.2, civ.z); glassP.push(hall);
      var ring = new THREE.TorusGeometry(7.1, 0.28, 6, SEGR * 2); ring.rotateX(Math.PI / 2); ring.translate(civ.x, civ.y + 4.75, civ.z); bodyP.push(ring);
      for (var cI = 0; cI < 8; cI++) { var a = cI / 8 * Math.PI * 2 + 0.2; colAt(bodyP, 6.3, civ.x + Math.cos(a) * 10.5, civ.y + 0.25, civ.z + Math.sin(a) * 10.5); }
      lensAt(bodyP, 13, 13, 1.6, 0.55, civ.x, civ.y + 6.8, civ.z, face);
      var fin = gemG(); fin.scale(2.25, 5.2, 2.25); fin.translate(civ.x, civ.y + 6.8 + 1.6 + 2.2, civ.z); spireParts.push(fin);   /* a small VISIONARY crystal crowns it (the spire's draw) */
      [-1, 1].forEach(function (sd) { var s2 = side(face, 16.5 * sd); shrubs.push({ x: civ.x + s2[0], y: civ.y + 1.0, z: civ.z + s2[1], s: 0.95, yaw: sd, c: sd < 0 ? CRYSTAL_TINT.gold : CRYSTAL_TINT.blue }); }); })();   /* M16: the civic pavilion is shared — gold and blue either side, its crown crystal keeps the district's VISIONARY violet */
    /* the homes */
    RES.homes.forEach(function (H) { var yaw = H.yaw, f1 = fwd(yaw, 1), W0 = H.W, D0 = 7.2, cant = 1.8, y0 = TOP + roll(H.x, H.z);
      pillAt(darkP, W0 + 2.6, 0.9, D0 + 3.2, H.x, y0 + 0.2, H.z, yaw);                                                   /* the graphite plinth */
      pillAt(glassP, W0 - 1.5, 3.3, D0 - 1.0, H.x, y0 + 0.65 + 1.65, H.z, yaw);                                           /* the glass ground floor */
      pillAt(bodyP, W0, 3.0, D0, H.x + f1[0] * cant, y0 + 0.65 + 3.3 + 1.5, H.z + f1[1] * cant, yaw);                     /* the white upper volume, cantilevered toward the view */
      pillAt(glassP, W0 + 0.12, 0.95, D0 + 0.12, H.x + f1[0] * cant, y0 + 0.65 + 3.3 + 1.7, H.z + f1[1] * cant, yaw);     /* its lit ribbon window */
      var cy = y0 + 0.65 + 6.3 + 0.9; lensAt(bodyP, (W0 + 5) / 2, (D0 + 5) / 2, 0.95, 0.32, H.x + f1[0] * cant, cy, H.z + f1[1] * cant, yaw);   /* the lens canopy roof */
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (q) { var s1 = side(yaw, q[0] * (W0 / 2 + 1.3)), f2 = fwd(yaw, cant + q[1] * (D0 / 2 + 1.3)); colAt(bodyP, cy - y0 - 0.3, H.x + s1[0] + f2[0], y0 + 0.3, H.z + s1[1] + f2[1]); });
      var g0 = fwd(yaw, 7.8); gardens.push({ x: H.x + g0[0], z: H.z + g0[1], y: y0, yaw: yaw, H: H });                   /* the curved garden wall (M19: built in stone below, as the terrace's retaining edge) */
      for (var sI = 0; sI < 6; sI++) { var a = (rv() - 0.5) * 2.0, rr = 1.2 + rv() * 3.6, gx = H.x + g0[0] + Math.sin(yaw + a) * rr, gz = H.z + g0[1] + Math.cos(yaw + a) * rr, s = 0.42 + rv() * 0.4;
        shrubs.push({ x: gx, y: TOP + roll(gx, gz) + s * 1.1, z: gz, s: s, yaw: rv() * 3, c: SHRUB[Math.floor(rv() * SHRUB.length)] }); }
      var sl = side(yaw, (W0 / 2 + 1.0) * H.ds), door = { x: H.x + sl[0], z: H.z + sl[1] }, ln = W3(laneX(H.lz), H.lz); sidePaths.push({ a: ln, b: door, H: H });   /* a path from the lane round the side of the house (M19: paved below) */
      taken.push({ x: H.x, z: H.z, r: 11 }); });
    /* M18 HUMAN SCALE (owner 2026-09-27: "waterfall + elevated suburban district", Xenosaga-inspired human-scale futurism, character-world
       coherence): the things a person reads a home by — a lit entrance door under a small canopy where the side path arrives, a glass
       balcony on the cantilevered view side, a front terrace with a table and two chairs inside the garden wall; benches along the lantern
       lane; a ring of benches round the civic pavilion. All of it joins the existing villa draws (platinum / graphite / lit glass). */
    function slab(list, w, h, d, x, y, z, yaw) { var g = new THREE.BoxGeometry(w, h, d); g.rotateY(yaw); g.translate(x, y, z); list.push(g); }   /* small parts: a plain box (a filleted one would only add triangles at this size) */
    function bench(x, z, yaw, dy) { var y = TOP + roll(x, z) + (dy || 0), b = fwd(yaw, -0.22); slab(bodyP, 1.9, 0.1, 0.5, x, y + 0.46, z, yaw); slab(bodyP, 1.9, 0.42, 0.08, x + b[0], y + 0.78, z + b[1], yaw); [-0.75, 0.75].forEach(function (o) { var s3 = side(yaw, o); slab(darkP, 0.12, 0.42, 0.44, x + s3[0], y + 0.21, z + s3[1], yaw); }); }   /* a seat, a low back, two graphite legs */
    var human = { doors: 0, balconies: 0, terraces: 0, benches: 0 };
    RES.homes.forEach(function (H) { var yaw = H.yaw, W0 = H.W, D0 = 7.2, cant = 1.8, y0 = TOP + roll(H.x, H.z), sd = H.ds, so = side(yaw, sd);
      /* the entrance: a lit glass door at the side end of the glass ground floor, a platinum frame, a small lens canopy over it */
      var dr = side(yaw, sd * ((W0 - 1.5) / 2 + 0.06)), dx = H.x + dr[0], dz = H.z + dr[1];
      slab(glassP, 0.1, 2.3, 1.15, dx, y0 + 0.65 + 1.15, dz, yaw); [-0.66, 0.66].forEach(function (o) { var f3 = fwd(yaw, o); slab(bodyP, 0.16, 2.5, 0.12, dx + f3[0], y0 + 0.65 + 1.25, dz + f3[1], yaw); });
      lensAt(bodyP, 1.3, 1.5, 0.28, 0.12, dx + so[0] * 0.9, y0 + 0.65 + 2.75, dz + so[1] * 0.9, yaw); human.doors++; if (!human.door_at) human.door_at = [+dx.toFixed(1), +y0.toFixed(1), +dz.toFixed(1), +so[0].toFixed(3), +so[1].toFixed(3)];
      /* the balcony: a slab and a glass balustrade with a platinum top rail along the view side of the cantilevered upper floor */
      var yb = y0 + 0.65 + 3.3, fb = fwd(yaw, cant + D0 / 2 + 0.65), fr = fwd(yaw, cant + D0 / 2 + 1.28);
      slab(bodyP, W0 - 1.2, 0.18, 1.4, H.x + fb[0], yb - 0.05, H.z + fb[1], yaw); slab(bodyP, W0 - 1.1, 0.07, 0.1, H.x + fr[0], yb + 1.03, H.z + fr[1], yaw); slab(bodyP, W0 - 1.1, 0.04, 0.05, H.x + fr[0], yb + 0.55, H.z + fr[1], yaw);   /* a light railing, not a wall: top rail, mid rail … */
      for (var rp = 0, nrp = Math.round((W0 - 1.2) / 0.85); rp <= nrp; rp++) { var rs = side(yaw, -(W0 - 1.2) / 2 + rp * (W0 - 1.2) / nrp); slab(darkP, 0.045, 0.98, 0.045, H.x + fr[0] + rs[0], yb + 0.52, H.z + fr[1] + rs[1], yaw); }   /* … and slim graphite posts every ~0.85 m */
      human.balconies++;
      /* the front terrace inside the garden wall: a round stone disc, a round table, two chairs facing the view */
      var ft = fwd(yaw, 6.3), tx0 = H.x + ft[0], tz0 = H.z + ft[1], ty = TOP + roll(tx0, tz0), tg = new THREE.CylinderGeometry(2.3, 2.4, 0.14, SEGR); tg.translate(tx0, ty + 0.03, tz0); bodyP.push(tg);
      if (VT !== 'LOW') { var tb = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 14); tb.translate(tx0, ty + 0.74, tz0); bodyP.push(tb); var tl = new THREE.CylinderGeometry(0.05, 0.07, 0.7, 6); tl.translate(tx0, ty + 0.39, tz0); darkP.push(tl);
        [-1, 1].forEach(function (k) { var cs = side(yaw, k * 0.95), cb = fwd(yaw, -0.25), cx = tx0 + cs[0], cz = tz0 + cs[1]; slab(bodyP, 0.5, 0.08, 0.5, cx, ty + 0.46, cz, yaw); slab(bodyP, 0.5, 0.45, 0.07, cx + cb[0], ty + 0.72, cz + cb[1], yaw); slab(darkP, 0.4, 0.42, 0.4, cx, ty + 0.21, cz, yaw); }); }
      human.terraces++; });
    /* benches along the lantern lane, alternating sides, clear of the home paths and the pavilion */
    for (var bl = -54, bk = 0; bl <= 54; bl += 13, bk++) { var bs = bk % 2 ? 1 : -1, dlb = laneX(bl + 0.5) - laneX(bl - 0.5), nlb = Math.hypot(1, dlb), BP = L2W(laneX(bl) + bs * 3.3 / nlb, bl - bs * 3.3 * dlb / nlb);
      if (Math.hypot(BP.x - civ.x, BP.z - civ.z) < 18 || RES.homes.some(function (H) { return Math.abs(H.lz - bl) < 5; })) continue;
      var lp2 = L2W(laneX(bl), bl); bench(BP.x, BP.z, Math.atan2(lp2.x - BP.x, lp2.z - BP.z)); human.benches++; benchAt.push({ x: BP.x, z: BP.z, lz: bl }); }
    /* the civic pavilion's ring of benches between the columns and the plaza edge, facing in */
    for (var pb = 0; pb < 8; pb++) { var pa = pb / 8 * Math.PI * 2 + 0.2 + Math.PI / 8, px2 = civ.x + Math.cos(pa) * 12.9, pz2 = civ.z + Math.sin(pa) * 12.9; bench(px2, pz2, Math.atan2(civ.x - px2, civ.z - pz2), civ.y + 0.27 - (TOP + roll(px2, pz2))); human.benches++; }   /* on the pavilion's raised plaza disc */
    info.human_scale = human;
    info.homes = RES.homes.length; info.home_slots = RES.homes.map(function (H) { return H.lz; }); info.home_at = RES.homes.map(function (H) { return [+H.x.toFixed(1), +(TOP + roll(H.x, H.z)).toFixed(1), +H.z.toFixed(1), +H.yaw.toFixed(3)]; }); info.civic_at = [+civ.x.toFixed(1), +civ.y.toFixed(1), +civ.z.toFixed(1)]; info.face = +face.toFixed(3);   /* dev: where the district stands (evidence cameras) */
    /* the overlooks: two crescent terraces on the field-facing rim either side of the falls (clear of the arcades), rails lit at night */
    RES.looks.forEach(function (O) { var y = TOP + roll(O.x, O.z), deck = new THREE.CylinderGeometry(8.5, 8.8, 0.45, SEGR * 2, 1, false, -0.95, 1.9); deck.rotateY(O.yaw); deck.translate(O.x, y + 0.12, O.z); bodyP.push(deck);
      arcAt(glassP, 8.3, 0.07, 1.9, O.x, y + 1.15, O.z, O.yaw); arcAt(bodyP, 8.3, 0.11, 1.9, O.x, y + 0.55, O.z, O.yaw);   /* a lit rail over a white kerb */
      shrubs.push({ x: O.x, y: y + 0.95, z: O.z, s: 0.8, yaw: 0.4, c: SPECTRAL.pink }); taken.push({ x: O.x, z: O.z, r: 10 }); });
    info.overlooks = RES.looks.length;
    /* M15 ARCADES (owner reference renders: "a terraced waterfall civilization" — lit arcades along the cliffs): on each side of the lip, set
       6 m back on the plateau, four filleted piers-and-arches bays carry a deck; warm light fills each opening at night (the villa glass),
       so from the plaza the top of the falls reads as a lived-in, lit edge. Beyond the host reach like the rest of the highland. */
    (function () { var tx = -oz, tz = ox, yawA = Math.atan2(-tz, tx), BW = 5.5, NB = 4, PH = 5.0, AR2 = BW / 2 - 0.45, S0 = LIPW * 0.5 + 10;
      [-1, 1].forEach(function (sd) { var at = function (o, back) { var x = lip.x + tx * o + ox * back, z = lip.z + tz * o + oz * back; return { x: x, z: z, y: TOP + roll(x, z) }; };
        for (var b = 0; b <= NB; b++) { var P = at(sd * (S0 + b * BW), 6); boxAt(bodyP, 0.9, PH, 0.9, P.x, P.y + PH / 2, P.z, yawA);
          if (b < NB) { var Q = at(sd * (S0 + b * BW + BW / 2), 6), arc = new THREE.TorusGeometry(AR2, 0.24, 6, 14, Math.PI); arc.rotateY(yawA); arc.translate(Q.x, Q.y + PH - AR2 - 0.3, Q.z); bodyP.push(arc);
            var F2 = at(sd * (S0 + b * BW + BW / 2), 6.45); boxAt(glassP, BW - 1.2, PH - 1.3, 0.12, F2.x, F2.y + 0.2 + (PH - 1.3) / 2, F2.z, yawA); } }
        var D = at(sd * (S0 + NB * BW / 2), 6); boxAt(bodyP, NB * BW + 1.4, 0.55, 2.2, D.x, D.y + PH + 0.3, D.z, yawA); });
      info.arcades = 2 * NB; })();
    /* the BELVEDERE: a cantilevered glass viewing deck at the lip beside the falls (dark soffit + platinum frame + lit glass) — seen from the
       highland below as a small lit silhouette at the top of the water: the cue that people go up there */
    (function () { var tx = -oz, tz = ox, bx = lip.x + tx * (LIPW * 0.5 + 9) - ox * 2, bz = lip.z + tz * (LIPW * 0.5 + 9) - oz * 2, by = TOP + 0.2, yawB = Math.atan2(-ox, -oz);
      boxAt(darkP, 11, 0.6, 9, bx - ox * 1.5, by - 0.3, bz - oz * 1.5, yawB); boxAt(bodyP, 11.2, 0.25, 9.2, bx - ox * 1.5, by + 0.1, bz - oz * 1.5, yawB);
      boxAt(glassP, 10.6, 1.1, 0.12, bx - ox * 5.9, by + 0.8, bz - oz * 5.9, yawB); boxAt(glassP, 8.4, 3.2, 6.2, bx + ox * 1.2, by + 1.9, bz + oz * 1.2, yawB); boxAt(bodyP, 9.4, 0.3, 7.4, bx + ox * 1.0, by + 3.65, bz + oz * 1.0, yawB);
      info.belvedere = { x: +bx.toFixed(1), z: +bz.toFixed(1), y: by }; })();
    /* the flight landing pad (reachable only once the bridge brings the highland into the host; M19: placed before the walks and groves claim the meadow) */
    var pad = spot(380, 14, rnd(0xBAD)); if (pad) { var pg = new THREE.RingGeometry(8.4, 9.4, 48); pg.rotateX(-Math.PI / 2); pg.translate(pad.x, pad.y + 0.12, pad.z); glassP.push(pg); var pd = new THREE.CircleGeometry(8.4, 32); pd.rotateX(-Math.PI / 2); pd.translate(pad.x, pad.y + 0.08, pad.z); darkP.push(pd); info.pad = { x: +pad.x.toFixed(1), z: +pad.z.toFixed(1) }; }   /* the pad: a lit ring (glass draw) on a graphite disc (roof draw) */
    /* ---------- M19 THE SPACE BETWEEN THE BUILDINGS (owner 2026-09-27: the district's weakness is "the SPACE BETWEEN THE BUILDINGS" — ground
       material, pedestrian routes, landscaped borders, grass, crystalline gardens, small elevation changes, home-to-path thresholds, retaining
       edges, drainage, quiet lighting, planted areas, scenic overlooks, transitions into rock and toward the waterfall; Xenosaga Episode II
       principles — human-scale futurism, clean soft architecture, planting woven into technology, calm, readable circulation — in MAHWORLD's
       own language, nothing copied). ONE new draw, VEIL_PAVING: vertex-coloured stone with a pattern in its own UV space — kerbed slab
       courses that follow each path's curve, planting beds of dark crystal grit behind a pale edging, honed coping blocks — wet and
       night-lit per vertex. Everything else joins existing draws: bollards → the villa graphite + lit glass, hedges → the grove canopy
       instances, rill and spring water → the basin draw, boulders → the mesa rock group.
       THE CIRCULATION: the lane is the spine; the civic plaza opens onto a paved quay at the basin; lakeside walks run round both flanks of
       the basin and along the flume banks to a footbridge at the lip; a rim promenade leaves each flank behind the arcades and ends at an
       overlook, which also links back to the lane's end; a spur reaches the belvedere; front-row gardens open through gates in their
       retaining walls onto the walks; every door gets a paved landing and two stone steps up to its plinth; spur paths reach the springs.
       Visual only — beyond the host's reach like the rest of the highland. ---------- */
    var PV = { p: [], uv: [], c: [], a: [], i: [] }, pvc = new THREE.Color(), PATHS = [], WT = [], LAMP19 = [], h19 = { paths_m: 0, beds_m: 0, walls_m: 0, bollards: 0, boulders: 0, rills: RILLS.length, hedges: 0, steps: 0, gates: 0 };
    function toLocal(p) { var dx = p.x - CX, dz = p.z - CZ; return { x: er[0] * dx + er[1] * dz, z: et[0] * dx + et[1] * dz }; }   /* world → mesa frame (L2W's inverse) */
    function pvV(x, y, z, u, v, hex, hw, kind, wt) { PV.p.push(x, y, z); PV.uv.push(u, v); pvc.setHex(hex); PV.c.push(pvc.r, pvc.g, pvc.b); PV.a.push(hw, kind, wt || 0, 0); return PV.p.length / 3 - 1; }
    function sheet(A, B, UA, UB, want, hex, hw, kind, WA, WB) { var base = PV.p.length / 3, n = A.length; if (n < 2) return;   /* a strip between two edge polylines, wound to face `want` */
      for (var i = 0; i < n; i++) { pvV(A[i][0], A[i][1], A[i][2], UA[i][0], UA[i][1], hex, hw, kind, WA ? WA[i] : 0); pvV(B[i][0], B[i][1], B[i][2], UB[i][0], UB[i][1], hex, hw, kind, WB ? WB[i] : 0); }
      var m = Math.min(n - 2, Math.floor(n / 2)), e1 = [A[m + 1][0] - A[m][0], A[m + 1][1] - A[m][1], A[m + 1][2] - A[m][2]], e2 = [B[m][0] - A[m][0], B[m][1] - A[m][1], B[m][2] - A[m][2]];
      var flip = (e1[1] * e2[2] - e1[2] * e2[1]) * want[0] + (e1[2] * e2[0] - e1[0] * e2[2]) * want[1] + (e1[0] * e2[1] - e1[1] * e2[0]) * want[2] < 0;
      for (i = 0; i < n - 1; i++) { var a0 = base + i * 2, b0 = a0 + 1, a1 = a0 + 2, b1 = a0 + 3; if (!flip) PV.i.push(a0, a1, b0, a1, b1, b0); else PV.i.push(a0, b0, a1, a1, b0, b1); } }
    function resample(P, step) { var out = [{ x: P[0].x, z: P[0].z }], acc = 0; for (var i = 1; i < P.length; i++) { var ax = P[i - 1].x, az = P[i - 1].z, dx = P[i].x - ax, dz = P[i].z - az, l = Math.hypot(dx, dz); if (l < 1e-6) continue; var t = step - acc; while (t <= l) { out.push({ x: ax + dx * t / l, z: az + dz * t / l }); t += step; } acc = l - (t - step); }
      var last = P[P.length - 1], lo = out[out.length - 1]; if (Math.hypot(last.x - lo.x, last.z - lo.z) > step * 0.3) out.push({ x: last.x, z: last.z }); else if (out.length > 1) { lo.x = last.x; lo.z = last.z; } return out; }
    function smooth(P, n) { var out = []; for (var i = 0; i < P.length - 1; i++) { var p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)]; for (var j = 0; j < n; j++) { var t = j / n, t2 = t * t, t3 = t2 * t;   /* Catmull-Rom through the waypoints */
        out.push({ x: 0.5 * (2 * p1.x + (p2.x - p0.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3), z: 0.5 * (2 * p1.z + (p2.z - p0.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (3 * p1.z - p0.z - 3 * p2.z + p3.z) * t3) }); } } out.push(P[P.length - 1]); return out; }
    function nrm(S, i) { var a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)], tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1; return { x: -tz / l, z: tx / l }; }
    function ribbon(P, hw, lift, kind, hex, opt) { opt = opt || {}; var S = opt.raw ? P : resample(P, opt.step || 1.0), A = [], B = [], UA = [], UB = [], WA = [], WB = [], L = 0;
      for (var i = 0; i < S.length; i++) { if (i) L += Math.hypot(S[i].x - S[i - 1].x, S[i].z - S[i - 1].z); var n = nrm(S, i), cx = S[i].x + n.x * (opt.off || 0), cz = S[i].z + n.z * (opt.off || 0), ax = cx - n.x * hw, az = cz - n.z * hw, bx = cx + n.x * hw, bz = cz + n.z * hw;
        A.push([ax, opt.y ? opt.y(ax, az, i) : gY(ax, az) + lift, az]); B.push([bx, opt.y ? opt.y(bx, bz, i) : gY(bx, bz) + lift, bz]); UA.push([-hw, L]); UB.push([hw, L]); WA.push(wetK(ax, az)); WB.push(wetK(bx, bz)); }
      sheet(A, B, UA, UB, [0, 1, 0], hex, hw, kind, WA, WB); return { S: S, len: L }; }
    function wallRun(S, hw, top, bot, hex) { var n = S.length; if (n < 2) return; var L = 0, TA = [], TB = [], UA = [], UB = [], BA = [], BB = [], FA = [], FB = [], WW = [], m = Math.floor(n / 2), nm = nrm(S, m);   /* a stone course: cap + both faces + end caps */
      for (var i = 0; i < n; i++) { if (i) L += Math.hypot(S[i].x - S[i - 1].x, S[i].z - S[i - 1].z); var q = nrm(S, i), ax = S[i].x - q.x * hw, az = S[i].z - q.z * hw, bx = S[i].x + q.x * hw, bz = S[i].z + q.z * hw, yt = top(i, S[i].x, S[i].z), yb = bot(i, S[i].x, S[i].z);
        TA.push([ax, yt, az]); TB.push([bx, yt, bz]); UA.push([-hw, L]); UB.push([hw, L]); BA.push([ax, yb, az]); BB.push([bx, yb, bz]); FA.push([yb - yt, L]); FB.push([0, L]); WW.push(wetK(S[i].x, S[i].z)); }
      sheet(TA, TB, UA, UB, [0, 1, 0], hex, hw, 2, WW, WW); sheet(BA, TA, FA, FB, [-nm.x, 0, -nm.z], hex, hw, 2, WW, WW); sheet(BB, TB, FA, FB, [nm.x, 0, nm.z], hex, hw, 2, WW, WW);
      [[0, -1], [n - 1, 1]].forEach(function (E) { var q = nrm(S, E[0]), tx = q.z * E[1], tz = -q.x * E[1], k = E[0]; sheet([BA[k], TA[k]], [BB[k], TB[k]], [[0, 0], [0, 0.4]], [[0.3, 0], [0.3, 0.4]], [tx, 0, tz], hex, hw, 2, [WW[k], WW[k]], [WW[k], WW[k]]); });
      h19.walls_m += L; }
    function addGeo(g, hex, kind) { var q = g.index ? g.toNonIndexed() : g, P = q.attributes.position, U = q.attributes.uv, base = PV.p.length / 3; for (var i = 0; i < P.count; i++) pvV(P.getX(i), P.getY(i), P.getZ(i), U ? U.getX(i) * 1.3 : 0, U ? U.getY(i) * 1.3 : 0, hex, 0.5, kind, wetK(P.getX(i), P.getZ(i)));
      for (i = 0; i < P.count; i++) PV.i.push(base + i); if (q !== g) q.dispose(); g.dispose(); }
    function pathD(x, z, skipLane) { var b = 1e9; PATHS.forEach(function (Pa) { if (skipLane && Pa.lane) return; b = Math.min(b, segD(x, z, Pa.S) - Pa.hw); }); return b; }   /* metres beyond the nearest paved edge */
    function path(P, hw, hex, opt) { opt = opt || {}; var r = ribbon(P, hw, 0.05 + 0.004 * (PATHS.length % 5), 0, hex || 0xd1cfca, opt);   /* each path a few mm off the next, so a junction never z-fights */ PATHS.push({ S: r.S, hw: hw, lane: !!opt.lane, lamps: opt.lamps !== false && !opt.lane, name: opt.name || '' }); h19.paths_m += r.len;
      for (var i = 0; i < r.S.length; i += 3) taken.push({ x: r.S[i].x, z: r.S[i].z, r: hw + 0.4 }); return r; }
    function LP(a, b) { return { x: lip.x + ox * a + tgx * b, z: lip.z + oz * a + tgz * b }; }   /* lip frame: a inward along o, b along the lip */
    function lipAB(p) { var dx = p.x - lip.x, dz = p.z - lip.z; return { a: dx * ox + dz * oz, b: dx * tgx + dz * tgz }; }
    function EL(phi, d) { var c = Math.cos(phi), sn = Math.sin(phi); return { x: LK.x + ox * (8 + d) * c + tgx * (12 + d) * sn, z: LK.z + oz * (8 + d) * c + tgz * (12 + d) * sn }; }   /* round the basin, d m off the water (phi 0 faces the pavilion) */
    function laneC(lz) { return L2W(laneX(lz), lz); }
    function laneN(lz) { var a = laneC(lz - 0.5), b = laneC(lz + 0.5), tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1; return { x: -tz / l, z: tx / l }; }
    function sideOf(p, lz) { var c = laneC(lz), n = laneN(lz); return (p.x - c.x) * n.x + (p.z - c.z) * n.z >= 0 ? 1 : -1; }
    var STONE = 0xc9c6c0, WALK = 0xd1cfca, BED = 0x48464f, rq = rnd(0xB0A7);

    /* THE SPINE: the lane, paved (kerbed slab courses, 3.4 m) */
    var lanePts = []; for (var lzz = -62; lzz <= 62; lzz += 2) lanePts.push(laneC(lzz)); path(lanePts, 1.7, 0xd8d6d1, { lane: true, name: 'lane' });
    /* THE QUAY: the civic plaza opens onto a paved waterfront along the basin's pavilion side; lakeside walks run on round both flanks */
    var quay = []; for (var qf = -0.62; qf <= 0.621; qf += 0.04) quay.push(EL(qf, 3.24)); path(quay, 2.8, 0xd8d6d1, { name: 'quay', lamps: false });
    (function () { var R0 = 15.0, yP = civ.y + 0.274, prevR = null; for (var rr6 = 0.001; rr6 <= R0 + 1e-6; rr6 += (rr6 < 0.01 ? 1 : 1.25)) { var ring6 = [], U6 = []; for (var sa6 = 0; sa6 <= 64; sa6++) { var a6 = sa6 / 64 * Math.PI * 2, dx6 = Math.sin(a6) * Math.min(rr6, R0), dz6 = Math.cos(a6) * Math.min(rr6, R0); ring6.push([civ.x + dx6, yP, civ.z + dz6]); U6.push([dx6, dz6]); }
        if (prevR) sheet(prevR.p, ring6, prevR.u, U6, [0, 1, 0], 0xdcdad5, R0, 3); prevR = { p: ring6, u: U6 }; } })();   /* the civic plaza disc paved in rings (it was a plain white disc — the most sterile surface in the district) */
    info.quay_gap_m = +Math.min.apply(null, quay.map(function (Q) { return Math.hypot(Q.x - civ.x, Q.z - civ.z); })).toFixed(1);
    var flankEnd = {}; [-1, 1].forEach(function (sg) { var W1 = []; for (var fphi = 0.5; fphi <= 2.02; fphi += 0.06) W1.push(EL(sg * fphi, 1.64)); var e = lipAB(W1[W1.length - 1]);
      W1 = W1.concat(smooth([LP(e.a - 2.5, sg * 11.9), LP(14, sg * 11.7), LP(6.6, sg * 11.7)], 4)); path(W1, 1.2, WALK, { name: 'flank' + sg }); flankEnd[sg] = W1; });
    /* THE FOOTBRIDGE over the flume at the lip: a paved deck on a stone slab, rails with slim graphite posts; ramps down to both walks */
    var BRA = 6, BRH = LIPW * 0.4 + 1.0, deckY = TOP + 0.72;
    function brY(bb) { var t = Math.max(0, Math.min(1, (Math.abs(bb) - BRH) / 3.2)); return deckY * (1 - t) + (TOP + 0.06) * t; }
    var brS = []; for (var bb = -(BRH + 3.2); bb <= BRH + 3.201; bb += 0.8) brS.push(LP(BRA, bb));
    ribbon(brS, 1.1, 0, 0, 0xd8d6d1, { raw: true, y: function (x, z) { var b2 = lipAB({ x: x, z: z }).b; return Math.max(gY(x, z) + 0.055, brY(b2)); } });
    wallRun(brS, 1.14, function (i, x, z) { return Math.max(gY(x, z) + 0.035, brY(lipAB({ x: x, z: z }).b) - 0.02); }, function (i, x, z) { return Math.min(gY(x, z) - 0.2, brY(lipAB({ x: x, z: z }).b) - 0.34); }, STONE);
    [-1, 1].forEach(function (sg) { var yawR = Math.atan2(tgx, tgz), c0 = LP(BRA + sg * 1.05, 0); slab(bodyP, 0.07, 0.06, 2 * BRH, c0.x, deckY + 1.0, c0.z, yawR); slab(bodyP, 0.04, 0.04, 2 * BRH, c0.x, deckY + 0.55, c0.z, yawR);
      for (var rp2 = -BRH; rp2 <= BRH + 0.01; rp2 += 1.2) { var pp = LP(BRA + sg * 1.05, rp2); slab(darkP, 0.05, 1.0, 0.05, pp.x, deckY + 0.5, pp.z, yawR); } });
    [-1, 1].forEach(function (sg) { var e = LP(BRA, sg * (BRH + 0.2)); LAMP19.push(e.x + ox * 1.25, deckY + 1.08, e.z + oz * 1.25, e.x - ox * 1.25, deckY + 1.08, e.z - oz * 1.25); });
    info.footbridge = { a: BRA, half_m: +BRH.toFixed(1), deck_y: +deckY.toFixed(2) };
    /* THE RIM PROMENADE: from each flank, behind the arcades, to the overlook on that side; the overlooks link back to the lane's ends */
    RES.looks.forEach(function (O) { var ab = lipAB(O), sg = ab.b >= 0 ? 1 : -1, F = flankEnd[sg]; if (!F) return;
      path(smooth([LP(14.5, sg * 11.7), LP(11.5, sg * 19), LP(12.5, sg * 31), LP(12.5 + (ab.a - 12.5) * 0.45, sg * (31 + (Math.abs(ab.b) - 31) * 0.55)), O], 6), 1.2, WALK, { name: 'rim' + sg });
      var oL = toLocal(O), lzE = oL.z >= 0 ? 62 : -62, sz2 = lzE > 0 ? 1 : -1; path(smooth([laneC(lzE), L2W(0, sz2 * 67), L2W(-18, sz2 * 64), O], 6), 1.1, WALK, { name: 'link' + sz2 });
      [-0.45, 0.45].forEach(function (da) { var bx2 = O.x + Math.sin(O.yaw + da) * 4.6, bz2 = O.z + Math.cos(O.yaw + da) * 4.6; bench(bx2, bz2, O.yaw, TOP + roll(O.x, O.z) + 0.345 - (TOP + roll(bx2, bz2))); human.benches++; }); });   /* two benches on each overlook deck, facing the view */
    /* the belvedere spur */
    (function () { var tx = -oz, tz = ox, sgB = (tx * tgx + tz * tgz) >= 0 ? 1 : -1; path(smooth([LP(14.5, sgB * 11.7), LP(11, sgB * 15.3), LP(3.4, sgB * 15.9)], 5), 1.0, WALK, { name: 'belvedere' }); })();
    /* the spire: a spur from the lane to its plinth, if the way is clear of the homes */
    (function () { var spx = Math.sin(HL.spire_bearing) * HL.spire_dist_m, spz = Math.cos(HL.spire_bearing) * HL.spire_dist_m, sL = toLocal({ x: spx, z: spz }), lzS = Math.max(-60, Math.min(60, sL.z)), A = laneC(lzS), dx = spx - A.x, dz = spz - A.z, dl2 = Math.hypot(dx, dz) || 1, B = { x: spx - dx / dl2 * 7.2, z: spz - dz / dl2 * 7.2 };
      if (dl2 < 9 || RES.homes.some(function (H) { return segD(H.x, H.z, [A, B]) < 12; })) return; path([A, B], 1.0, WALK, { name: 'spire' }); info.spire_path = +dl2.toFixed(1); })();
    /* the springs: a round stone basin beside the lane, a short spur to it, the rill down to the basin (below) */
    RILLS.forEach(function (Rl) { var S0 = Rl.pts[0], S1 = Rl.pts[2], dx = S1.x - S0.x, dz = S1.z - S0.z, dl3 = Math.hypot(dx, dz) || 1; Rl.dir = { x: dx / dl3, z: dz / dl3 }; Rl.c = { x: S0.x - Rl.dir.x * 0.9, z: S0.z - Rl.dir.z * 0.9 };
      var A = laneC(Rl.lz), cx = Rl.c.x - A.x, cz = Rl.c.z - A.z, cl = Math.hypot(cx, cz) || 1; path([A, { x: Rl.c.x - cx / cl * 1.45, z: Rl.c.z - cz / cl * 1.45 }], 0.8, WALK, { name: 'spring', lamps: false }); });
    /* DOOR THRESHOLDS: a landing where the side path arrives and two stone steps up to the graphite plinth; the path itself paved */
    sidePaths.forEach(function (SP) { var H = SP.H, sgn = H.ds, ends = (H.W + 2.6) / 2, y0 = TOP + roll(H.x, H.z), so = side(H.yaw, sgn);
      [[0.18, 0.44], [0.53, 0.23]].forEach(function (St) { var cx = H.x + so[0] * (ends + St[0]), cz = H.z + so[1] * (ends + St[0]), gb = gY(cx, cz) - 0.15, g = new THREE.BoxGeometry(0.35, y0 + St[1] - gb, 1.9); g.rotateY(H.yaw); g.translate(cx, (y0 + St[1] + gb) / 2, cz); addGeo(g, STONE, 2); h19.steps++; });
      var foot = { x: H.x + so[0] * (ends + 0.72), z: H.z + so[1] * (ends + 0.72) }; path([SP.a, foot], 1.0, WALK, { name: 'door', lamps: false }); });
    /* THE BASIN: a honed stone coping round the water (open where the flume leaves and where the rills spill in); the flume's banks */
    var cop = []; for (var cf = 0; cf <= Math.PI * 2 + 1e-6; cf += 0.035) cop.push(EL(cf, 0.22));
    var copRuns = [], cr0 = []; cop.forEach(function (C) { var open = chanD(C.x, C.z) < 0.6 || RILLS.some(function (Rl) { var E = Rl.pts[Rl.pts.length - 1]; return Math.hypot(C.x - E.x, C.z - E.z) < 0.75; }); if (open) { if (cr0.length > 1) copRuns.push(cr0); cr0 = []; } else cr0.push(C); }); if (cr0.length > 1) copRuns.push(cr0);
    copRuns.forEach(function (Rn) { wallRun(Rn, 0.22, function () { return TOP + 0.36; }, function (i, x, z) { return gY(x, z) - 0.25; }, STONE); });
    [-1, 1].forEach(function (sg) { var bk = []; for (var ba = 0; ba <= 19.01; ba += 0.8) bk.push(LP(ba, sg * (LIPW * 0.4 + 0.22))); wallRun(bk, 0.22, function (i, x, z) { return Math.max(TOP + 0.4, gY(x, z) + 0.12); }, function (i, x, z) { return Math.min(TOP - 0.1, gY(x, z) - 0.3); }, 0xb4b2b0); });
    var flumeBed = new THREE.PlaneGeometry(LIPW * 0.8 + 0.1, 21.1), fbc = LP(9.95, 0); flumeBed.rotateX(-Math.PI / 2); flumeBed.rotateY(Math.atan2(ox, oz)); flumeBed.translate(fbc.x, TOP + 0.12, fbc.z); darkP.push(flumeBed);   /* the flume's bed: dark graphite stone under the running water (the curtain's brink rows) — in the villa graphite draw, not the paving, whose depth offset would lift it through the water sheet at a grazing view */
    /* THE RILLS: stone channels, water stepping down to the basin (never uphill: each sample may only fall, and never below the meadow);
       where a walk crosses, the rill runs under it in a culvert */
    function waterQuad(A0, B0, A1, B1) { WT.push(A0[0], A0[1], A0[2], B0[0], B0[1], B0[2], A1[0], A1[1], A1[2], B0[0], B0[1], B0[2], B1[0], B1[1], B1[2], A1[0], A1[1], A1[2]); }
    RILLS.forEach(function (Rl) { var S = resample(Rl.pts, 0.8), n = S.length, wy = [], prevY = 1e9, endY = TOP + 0.3, drop = 0;
      for (var i = 0; i < n; i++) { var g = gY(S[i].x, S[i].z); var y = Math.max(g + 0.06, Math.min(prevY, g + 0.14)); if (y > prevY + 1e-6) drop = Math.max(drop, y - prevY); prevY = y; wy.push(y); }
      for (i = n - 1; i >= 0 && wy[i] < endY; i--) wy[i] = endY; Rl.uphill_m = +drop.toFixed(3); Rl.fall_m = +(wy[0] - wy[n - 1]).toFixed(2);
      var under = S.map(function (P) { return pathD(P.x, P.z) < 0.25; }), runs = [], cur = [];
      for (i = 0; i < n; i++) { if (under[i]) { if (cur.length > 1) runs.push(cur); cur = []; } else cur.push(i); } if (cur.length > 1) runs.push(cur);
      runs.forEach(function (Ix) { var Sr = Ix.map(function (k) { return S[k]; }); [-1, 1].forEach(function (sg) { var Off = Sr.map(function (P, k) { var q = nrm(Sr, k); return { x: P.x + q.x * sg * 0.47, z: P.z + q.z * sg * 0.47 }; });
          wallRun(Off, 0.12, function (k) { return wy[Ix[k]] + 0.08; }, function (k, x, z) { return gY(x, z) - 0.2; }, STONE); });
        for (var k = 0; k < Sr.length - 1; k++) { var q0 = nrm(Sr, k), q1 = nrm(Sr, k + 1), y0 = wy[Ix[k]] - 0.01, y1 = wy[Ix[k + 1]] - 0.01;
          waterQuad([Sr[k].x - q0.x * 0.36, y0, Sr[k].z - q0.z * 0.36], [Sr[k].x + q0.x * 0.36, y0, Sr[k].z + q0.z * 0.36], [Sr[k + 1].x - q1.x * 0.36, y1, Sr[k + 1].z - q1.z * 0.36], [Sr[k + 1].x + q1.x * 0.36, y1, Sr[k + 1].z + q1.z * 0.36]); } });
      /* the spring: a round stone basin (open toward the rill) with its water and a pale ice crystal rising from it */
      var ring = [], rr3 = []; for (var ra = 0; ra <= Math.PI * 2 + 1e-6; ra += Math.PI / 14) { var P = { x: Rl.c.x + Math.sin(ra) * 1.05, z: Rl.c.z + Math.cos(ra) * 1.05 }; if ((P.x - Rl.c.x) * Rl.dir.x + (P.z - Rl.c.z) * Rl.dir.z > 0.8) { if (rr3.length > 1) ring.push(rr3); rr3 = []; } else rr3.push(P); } if (rr3.length > 1) ring.push(rr3);
      if (ring.length > 1 && Math.hypot(ring[0][0].x - ring[ring.length - 1][ring[ring.length - 1].length - 1].x, ring[0][0].z - ring[ring.length - 1][ring[ring.length - 1].length - 1].z) < 0.5) ring = [ring[ring.length - 1].concat(ring[0])].concat(ring.slice(1, -1));
      ring.forEach(function (Rn) { wallRun(Rn, 0.15, function () { return wy[0] + 0.14; }, function (k, x, z) { return gY(x, z) - 0.2; }, STONE); });
      for (var sa = 0; sa < 16; sa++) { var a1 = sa / 16 * Math.PI * 2, a2 = (sa + 1) / 16 * Math.PI * 2, wy0 = wy[0] + 0.01; WT.push(Rl.c.x, wy0, Rl.c.z, Rl.c.x + Math.sin(a1) * 0.92, wy0, Rl.c.z + Math.cos(a1) * 0.92, Rl.c.x + Math.sin(a2) * 0.92, wy0, Rl.c.z + Math.cos(a2) * 0.92); }
      shrubs.push({ x: Rl.c.x, y: wy[0] + 0.42, z: Rl.c.z, s: 0.3, yaw: 0.3, c: SPECTRAL.ice }); });
    info.rills = RILLS.map(function (Rl) { return { spring_lz: Rl.lz, meadow_over_top_m: +Rl.h.toFixed(2), fall_m: Rl.fall_m, uphill_m: Rl.uphill_m }; });
    /* GARDEN TERRACES: the garden wall becomes a stone retaining edge — its top a level course over the terrace, its foot following the
       lawn as it falls away (the garden pads now ramp over 4 m); front-row gardens open through a gate onto the nearest walk; a
       back-row garden stops its wall at the lane, which passes its open front */
    gardens.forEach(function (G) { var front = toLocal(G.H).x < laneX(G.H.lz), arc = [], runs = [], cur = [];
      for (var ga = -1.15; ga <= 1.1501; ga += 0.1) { var P = { x: G.x + Math.sin(G.yaw + ga) * 6.2, z: G.z + Math.cos(G.yaw + ga) * 6.2 }, gate = front && Math.abs(ga) < 0.12, onLane = pathD(P.x, P.z) < 0.45;
        if (gate || onLane) { if (cur.length > 1) runs.push(cur); cur = []; } else cur.push(P); } if (cur.length > 1) runs.push(cur);
      runs.forEach(function (Rn) { wallRun(Rn, 0.18, function (k, x, z) { return Math.max(G.y, gY(x, z)) + 0.46; }, function (k, x, z) { return Math.min(G.y, gY(x, z)) - 0.3; }, STONE); });
      if (!front) return; var gt = { x: G.x + Math.sin(G.yaw) * 6.2, z: G.z + Math.cos(G.yaw) * 6.2 }, best = null; PATHS.forEach(function (Pa) { if (Pa.lane || /door|spring/.test(Pa.name)) return; Pa.S.forEach(function (Q) { var d = Math.hypot(Q.x - gt.x, Q.z - gt.z); if (!best || d < best.d) best = { d: d, q: Q }; }); });
      if (!best || best.d > 34) return; var out = { x: G.x + Math.sin(G.yaw) * 7.4, z: G.z + Math.cos(G.yaw) * 7.4 }; path(smooth([{ x: G.x + Math.sin(G.yaw) * 5.6, z: G.z + Math.cos(G.yaw) * 5.6 }, out, { x: (out.x + best.q.x) / 2, z: (out.z + best.q.z) / 2 }, best.q], 5), 0.85, WALK, { name: 'gate' }); h19.gates++; });
    /* LANDSCAPED BORDERS: planting beds either side of the lane (dark crystal grit behind a pale edging) with low crystal hedges — pearl
       with an accent of one class per run — broken for door paths, bench bays, the spring spurs and the civic plaza; the lane's lamps
       stand in them */
    var ACC = [CRYSTAL_TINT.gold, CRYSTAL_TINT.blue, CRYSTAL_TINT.red, CLASS_TINT.purple, CRYSTAL_TINT.pink], runN = 0;
    [-1, 1].forEach(function (sg) { var run = [], lzs = [];
      function flush() { if (lzs.length >= 3) { var pts = lzs.map(laneC); ribbon(pts, 0.55, 0.05, 1, BED, { off: sg * 2.3 }); h19.beds_m += lzs.length - 1; var acc = ACC[runN++ % ACC.length];
          for (var hz = lzs[0] + 0.3; hz <= lzs[lzs.length - 1] - 0.3; hz += 0.5) { var k = Math.round((hz - lzs[0]) / 0.5), c = laneC(hz), n = laneN(hz), off = sg * (2.3 + (k % 2 ? 0.2 : -0.2) + (rq() - 0.5) * 0.1), x = c.x + n.x * off, z = c.z + n.z * off, s0 = 0.2 + rq() * 0.16;
            shrubs.push({ x: x, y: gY(x, z) + s0 * 1.0, z: z, s: s0, yaw: rq() * 3, c: k % 5 === 2 ? acc : (k % 3 ? 0xd9dcef : 0xb9bdd0) }); h19.hedges++; }
          lzs.forEach(function (lz2) { var c = laneC(lz2), n = laneN(lz2); taken.push({ x: c.x + n.x * sg * 2.3, z: c.z + n.z * sg * 2.3, r: 0.9 }); }); } lzs = []; }
      for (var lz2 = -60; lz2 <= 60; lz2 += 1) { var skip = Math.abs(lz2) < 18 || sidePaths.some(function (SP) { return Math.abs(lz2 - SP.H.lz) < 2.4 && sideOf(SP.b, SP.H.lz) === sg; }) || benchAt.some(function (B) { return Math.abs(lz2 - B.lz) < 1.7 && sideOf(B, B.lz) === sg; }) || RILLS.some(function (Rl) { return Math.abs(lz2 - Rl.lz) < 1.8 && sideOf(Rl.c, Rl.lz) === sg; }) || PATHS.some(function (Pa) { return /spire/.test(Pa.name) && segD(laneC(lz2).x + laneN(lz2).x * sg * 2.3, laneC(lz2).z + laneN(lz2).z * sg * 2.3, Pa.S) < Pa.hw + 0.6; });
        if (skip) flush(); else lzs.push(lz2); } flush(); });
    shrubs = shrubs.filter(function (Sh) { return pathD(Sh.x, Sh.z) > 0.25 || RES.looks.some(function (O) { return Math.hypot(Sh.x - O.x, Sh.z - O.z) < 1.5; }); });   /* no crystal stands on a paved way (the overlook centrepieces stay on their decks) */
    /* QUIET LIGHT: the lane's lamps get their posts (a slim graphite bollard with a lit glass head), and bollards line the walks every ~8 m,
       alternating sides — light where people walk instead of the old free-floating loop lanterns */
    function bollard(x, z) { var y = gY(x, z), pg2 = new THREE.CylinderGeometry(0.055, 0.075, 0.95, 8); pg2.translate(x, y + 0.47, z); darkP.push(pg2); var hd = new THREE.CylinderGeometry(0.1, 0.09, 0.16, 10); hd.translate(x, y + 1.03, z); glassP.push(hd); LAMP19.push(x, y + 1.06, z); h19.bollards++; }
    for (var ll = 0; ll < laneLamps.length; ll += 3) { var lx5 = laneLamps[ll], lz5 = laneLamps[ll + 2]; if (Math.hypot(lx5 - civ.x, lz5 - civ.z) < 16) continue; bollard(lx5, lz5); } laneLamps = [];
    PATHS.forEach(function (Pa) { if (!Pa.lamps) return; for (var i = 4, k = 0; i < Pa.S.length - 2; i += 8, k++) { var q = nrm(Pa.S, i), o2 = (k % 2 ? 1 : -1) * (Pa.hw + 0.35), x = Pa.S[i].x + q.x * o2, z = Pa.S[i].z + q.z * o2; if (pathD(x, z) < 0.15 || chanD(x, z) < 0.6 || lakeE(x, z) < 1.1) continue; bollard(x, z); } });
    /* TRANSITIONS INTO ROCK: outcrops where the lawn meets the mesa's rim (clusters of weathered boulders half-sunk in the turf) and a few
       wet stones at the lip beside the flume mouth. They join the mesa's rock group (its geology material); no new draw. */
    var BLD = [], rb2 = rnd(0x0B01D);
    function boulder(x, z, sc, wetB) { var g = new THREE.IcosahedronGeometry(1, LOW ? 0 : 1), P = g.attributes.position, sx2 = sc * (0.9 + rb2() * 0.5), sy2 = sc * (0.45 + rb2() * 0.3), sz2 = sc * (0.8 + rb2() * 0.5), yw = rb2() * 6.283, cyw = Math.cos(yw), syw = Math.sin(yw), ph = rb2() * 10;
      for (var i = 0; i < P.count; i++) { var vx = P.getX(i), vy = P.getY(i), vz = P.getZ(i), k2 = 0.78 + 0.22 * Math.sin(vx * 2.1 + ph) * Math.cos(vz * 1.7 - ph) + 0.12 * Math.sin(vy * 3.3 + ph * 1.3); if (vy > 0.55) k2 *= 0.9; vx *= sx2 * k2; vy *= sy2 * k2; vz *= sz2 * k2; P.setXYZ(i, x + vx * cyw + vz * syw, 0, z - vx * syw + vz * cyw); P.setY(i, vy); }
      var yb2 = 1e9; for (i = 0; i < P.count; i++) yb2 = Math.min(yb2, gY(P.getX(i), P.getZ(i))); for (i = 0; i < P.count; i++) P.setY(i, P.getY(i) + yb2 + sy2 * 0.35);
      BLD.push(g); taken.push({ x: x, z: z, r: sc * 1.2 }); h19.boulders++; }
    (function () { var ov = RES.looks, bel = info.belvedere; for (var bt = 0; bt < Math.PI * 2; bt += 0.075) { var n1 = Math.sin(bt * 5.3 + 1.1) * 0.6 + Math.sin(bt * 11.7 - 0.4) * 0.4; if (n1 < 0.25) continue;
        var fk2 = 0.86 + rb2() * 0.07, rr5 = rimR(bt) * fk2, P = L2W(Math.cos(bt) * rr5, Math.sin(bt) * rr5), ab = lipAB(P);
        if (chanD(P.x, P.z) < 8 || Math.hypot(P.x - lip.x, P.z - lip.z) < 16 || ov.some(function (O) { return Math.hypot(P.x - O.x, P.z - O.z) < 12; }) || (ab.a > -1 && ab.a < 11 && Math.abs(ab.b) > 16 && Math.abs(ab.b) < 50) || (bel && Math.hypot(P.x - bel.x, P.z - bel.z) < 12)) continue;
        if (pathD(P.x, P.z) < 2.5 || taken.some(function (Tk) { return Math.hypot(P.x - Tk.x, P.z - Tk.z) < Tk.r + 1.5; })) continue;
        var nb2 = 1 + Math.floor(rb2() * (LOW ? 2 : 3)), s5 = 0.9 + n1 * 1.6; boulder(P.x, P.z, s5, false); for (var bi = 1; bi < nb2; bi++) { var ang = rb2() * 6.283, dd = s5 * (1.1 + rb2() * 0.6); boulder(P.x + Math.cos(ang) * dd, P.z + Math.sin(ang) * dd, s5 * (0.35 + rb2() * 0.35), false); } }
      [-1, 1].forEach(function (sg) { [[0.6, 10.9, 0.75], [2.2, 12.4, 0.55], [-0.8, 13.6, 0.9]].forEach(function (Bq) { var P = LP(Bq[0], sg * Bq[1]); if (pathD(P.x, P.z) > 0.6) boulder(P.x, P.z, Bq[2], true); }); }); })();
    if (BLD.length) { var gBase = gp.length / 3; BLD.forEach(function (g) { var q = g.index ? g.toNonIndexed() : g, P = q.attributes.position; for (var i = 0; i < P.count; i++) vtx(P.getX(i), P.getY(i), P.getZ(i), rockB, 0); for (i = 0; i < P.count; i++) gi.push(gBase + i); gBase += P.count; if (q !== g) q.dispose(); g.dispose(); }); }
    /* CRYSTAL GRASS (owner: "grass" — never green): tufts of fine crystal blades — silver, ice and a faint lilac, with a rare pale class-coloured
       'flower' — clustered in drifts, thickest along the walk margins and in the gardens, never on paving, beds, water, floors or terraces.
       Instanced with the grove canopy's crystal material (one draw; not on LOW). */
    var BLADES = []; if (!LOW) { var GW = 120, GH = 190, grid = new Float32Array(GW * GH).fill(99);
      PATHS.forEach(function (Pa) { Pa.S.forEach(function (Q) { var ql = toLocal(Q), R = Pa.hw + 2.2; for (var gx = Math.floor(ql.x + 60 - R); gx <= Math.ceil(ql.x + 60 + R); gx++) for (var gz = Math.floor(ql.z + 95 - R); gz <= Math.ceil(ql.z + 95 + R); gz++) { if (gx < 0 || gz < 0 || gx >= GW || gz >= GH) continue; var d = Math.hypot(gx + 0.5 - 60 - ql.x, gz + 0.5 - 95 - ql.z) - Pa.hw - (Pa.lane ? 1.3 : 0), o3 = gz * GW + gx; if (d < grid[o3]) grid[o3] = d; } }); });
      var gridD = function (p) { var ql = toLocal(p), gx = Math.floor(ql.x + 60), gz = Math.floor(ql.z + 95); return gx < 0 || gz < 0 || gx >= GW || gz >= GH ? 99 : grid[gz * GW + gx]; };   /* metres past the nearest paved edge (the lane's beds count as paved), 1 m cells */
      var NBL = T === 'MED' ? 2400 : 5000, tries = 0, BLC = [0xc3c7d4, 0xb4b8c6, 0xcbd6e8, 0xb9b1d3, 0x9a9eab], FLW = [CRYSTAL_TINT.gold, CRYSTAL_TINT.blue, CRYSTAL_TINT.red, CLASS_TINT.purple, CRYSTAL_TINT.pink];
      while (BLADES.length < NBL && tries++ < NBL * 14) { var blx = (rq() * 2 - 1) * AR, blz = (rq() * 2 - 1) * AT; if (Math.hypot(blx / AR, blz / AT) > 0.84) continue; var P = L2W(blx, blz), gd = gridD(P);
        if (gd < 0.15 || lakeE(P.x, P.z) < 1.1 || chanD(P.x, P.z) < 0.9 || Math.hypot(P.x - civ.x, P.z - civ.z) < 15.8 || Math.hypot(P.x - lip.x, P.z - lip.z) < 6) continue;
        if (RES.homes.some(function (H) { return Math.hypot(P.x - H.x, P.z - H.z) < 7.5; }) || RES.looks.some(function (O) { return Math.hypot(P.x - O.x, P.z - O.z) < 9; }) || RILLS.some(function (Rl) { return segD(P.x, P.z, Rl.pts) < 0.75 || Math.hypot(P.x - Rl.c.x, P.z - Rl.c.z) < 1.4; })) continue;
        var cn = 0.5 + 0.5 * Math.sin(P.x * 0.23 + P.z * 0.11) * Math.sin(P.x * 0.07 - P.z * 0.19), edge = gd < 1.6 ? 0.55 : 0, gdn = gardens.some(function (G) { return Math.hypot(P.x - G.x, P.z - G.z) < 6 && Math.hypot(P.x - G.x + Math.sin(G.yaw) * 1.5, P.z - G.z + Math.cos(G.yaw) * 1.5) > 2.6; }) ? 0.35 : 0;
        if (rq() > Math.min(0.95, Math.max(0, (cn - 0.35) * 2.2) + edge + gdn)) continue;
        for (var tb = 0, tuft = 1 + Math.floor(rq() * 3); tb < tuft && BLADES.length < NBL; tb++) { var bx3 = P.x + (rq() - 0.5) * 0.35, bz3 = P.z + (rq() - 0.5) * 0.35, flw = rq() < 0.035;
          BLADES.push({ x: bx3, y: gY(bx3, bz3) - 0.02, z: bz3, w: flw ? 0.06 : 0.025 + rq() * 0.03, h: flw ? 0.1 : 0.05 + rq() * 0.11, yaw: rq() * 6.28, lean: (rq() - 0.5) * 0.5, c: flw ? FLW[Math.floor(rq() * 5)] : BLC[Math.floor(rq() * BLC.length)] }); } } }
    h19.grass = BLADES.length;
    /* NIGHT LIGHT POOLS: each lamp's warm pool baked once into the paving and the lawn (emissive at night only) */
    function litAt(x, z) { var L = 0; for (var i = 0; i < LAMP19.length; i += 3) { var d = Math.hypot(x - LAMP19[i], z - LAMP19[i + 2]); if (d < 4.2) { var f3 = 1 - d / 4.2; L += f3 * f3; } } return Math.min(1, L); }
    for (var pv = 0; pv < PV.p.length / 3; pv++) PV.a[pv * 4 + 3] = litAt(PV.p[pv * 3], PV.p[pv * 3 + 2]);
    var gLit = new Float32Array(gp.length / 3), topV = 1 + RING * SEG; for (var gv = 0; gv < topV; gv++) gLit[gv] = litAt(gp[gv * 3], gp[gv * 3 + 2]);
    /* M20: no lawn through the paving (review: a hard dark patch on the HL1 path) — the paths are ribbons laid over the drawn meadow, and where
       a meadow vertex bulges inside a paving triangle (the pad ramps bend between the ribbon's points) the lawn showed through, up to 13 cm.
       The hidden meadow vertex under every near-level paving triangle now sinks 1.5 cm below the paving there (at most 20 cm; the paving
       itself never moves, so it stays 0–12 cm over the meadow at its edges). */
    (function () { var CS = 4, cell = {}, key, q, P = PV.p, I = PV.i, sunk = 0, worst = 0; for (q = 0; q < gp.length; q += 3) { key = Math.floor(gp[q] / CS) + ',' + Math.floor(gp[q + 2] / CS); (cell[key] = cell[key] || []).push(q); }
      for (var t = 0; t < I.length; t += 3) { var ia = I[t] * 3, ib = I[t + 1] * 3, ic = I[t + 2] * 3, ax = P[ia], ay = P[ia + 1], az = P[ia + 2], ux = P[ib] - ax, uy = P[ib + 1] - ay, uz = P[ib + 2] - az, vx = P[ic] - ax, vy = P[ic + 1] - ay, vz = P[ic + 2] - az;
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz), det = ux * vz - uz * vx; if (nl < 1e-9 || Math.abs(ny) / nl < 0.8 || Math.abs(det) < 1e-9) continue;
        var x0 = Math.floor(Math.min(ax, ax + ux, ax + vx) / CS), x1 = Math.floor(Math.max(ax, ax + ux, ax + vx) / CS), z0 = Math.floor(Math.min(az, az + uz, az + vz) / CS), z1 = Math.floor(Math.max(az, az + uz, az + vz) / CS);
        for (var cx = x0; cx <= x1; cx++) for (var cz = z0; cz <= z1; cz++) { var L = cell[cx + ',' + cz]; if (!L) continue;
          for (var m = 0; m < L.length; m++) { var g0 = L[m], px = gp[g0] - ax, pz = gp[g0 + 2] - az, s1 = (px * vz - pz * vx) / det, r1 = (ux * pz - uz * px) / det; if (s1 < 0.002 || r1 < 0.002 || s1 + r1 > 0.998) continue;
            var d = gp[g0 + 1] + 0.015 - (ay + s1 * uy + r1 * vy); if (d > 0) { d = Math.min(d, 0.2); gp[g0 + 1] -= d; sunk++; worst = Math.max(worst, d); } } } }
      h19.lawn_sunk = { vertices: sunk, worst_m: +worst.toFixed(3) }; })();
    hg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); hg.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); hg.setAttribute('aWet', new THREE.Float32BufferAttribute(gw, 1)); hg.setAttribute('aLit', new THREE.BufferAttribute(gLit, 1));
    hg.setIndex(gi); hg.clearGroups(); hg.addGroup(0, topCount, 0); hg.addGroup(topCount, gi.length - topCount, 1); hg.computeVertexNormals(); hg.computeBoundingSphere();
    if (WT.length) { var lwP = Array.from(lwG.attributes.position.array).concat(WT); lwG.setAttribute('position', new THREE.Float32BufferAttribute(lwP, 3)); lwG.computeVertexNormals(); lwG.computeBoundingSphere(); }
    var pvM = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.03, envMapIntensity: 0.45, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    pvM.onBeforeCompile = function (sh) { sh.uniforms.uLitN = litNightU;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aPav; varying vec4 vPav; varying vec2 vPuv; varying vec3 vPw;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPav = aPav; vPuv = uv; vPw = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uLitN; varying vec4 vPav; varying vec2 vPuv; varying vec3 vPw;\n' + NOISE)
        .replace('#include <color_fragment>', ['#include <color_fragment>',
          'float pvK = vPav.y, pvHW = vPav.x; vec2 pq = vPuv; float pvNear = 1.0 - smoothstep(22.0, 110.0, length(cameraPosition - vPw)); float pvTone = 1.0, pvR = 1.0, pvSeam = 0.0, pvD = 1.0, pvW = 0.03;',
          'float pvG = vfN(vPw.xz * 5.3 + vPw.y) * 0.6 + vfN(vPw.xz * 17.0 + 3.0) * 0.4;',
          'if (pvK < 0.5) { float ax = abs(pq.x), kb = pvHW - 0.2, kerb = step(kb, ax), inner = max(0.2, 2.0 * kb), nc = max(1.0, floor(inner / 0.95 + 0.5)), cw = inner / nc, cx = clamp((pq.x + kb) / cw, 0.0, nc - 0.001), ci = floor(cx);',   /* PAVING: a kerb course each side, staggered slab courses between */
          '  float sl = 0.85 + 0.2 * mod(ci, 2.0), sy = pq.y / sl + 0.5 * mod(ci, 2.0) + 0.29 * ci; vec2 sid = vec2(ci, floor(sy));',
          '  float dS = min(min(fract(cx), 1.0 - fract(cx)) * cw, min(fract(sy), 1.0 - fract(sy)) * sl); float ky = pq.y / 1.4, dK = min(min(fract(ky), 1.0 - fract(ky)) * 1.4, abs(ax - kb));',
          '  pvD = mix(min(dS, abs(ax - kb)), dK, kerb); float h1 = vfH(sid + 7.3 + kerb * (31.0 + floor(ky))); pvTone = (1.0 + (h1 - 0.5) * 0.1) * mix(1.0, 0.6, kerb); pvR = (1.0 + (vfH(sid * 1.7 + kerb * 5.0) - 0.5) * 0.28) * mix(1.0, 0.78, kerb); }',
          'else if (pvK < 1.5) { float edge = step(pvHW - 0.09, abs(pq.x)); float grit = step(0.93, vfH(floor(vPw.xz * 9.0))) * pvNear; pvTone = mix((0.78 + 0.44 * pvG) * (1.0 + grit * 1.7), 2.5, edge); pvR = mix(1.3 - grit * 0.75, 0.95, edge); pvD = abs(abs(pq.x) - (pvHW - 0.09)); pvW = 0.015; }',   /* BED */
          'else if (pvK > 2.5) { float rr = length(pq), ri = floor(rr / 1.6), fr = fract(rr / 1.6), nn = max(6.0, floor(6.2831853 * (ri + 0.5) * 1.6 / 2.2)), aa = (atan(pq.y, pq.x) + 3.14159265) / 6.2831853 * nn, fa = fract(aa), kerb = step(pvHW - 0.45, rr);',   /* RINGS: concentric courses with radial joints, a darker kerb ring at the edge (the civic plaza) */
          '  pvD = min(min(fr, 1.0 - fr) * 1.6, min(fa, 1.0 - fa) * 6.2831853 * max(rr, 0.3) / nn); pvTone = (1.0 + (vfH(vec2(ri, floor(aa))) - 0.5) * 0.08) * mix(1.0, 0.72, kerb); pvR = 1.0 + (vfH(vec2(floor(aa), ri) * 1.3) - 0.5) * 0.25; }',
          'else { float by = pq.y / 1.3; pvD = min(fract(by), 1.0 - fract(by)) * 1.3; pvTone = 1.0 + (vfH(vec2(floor(by), 3.0 + pvHW * 7.0 + floor(vPw.y))) - 0.5) * 0.12; pvW = 0.02; }',   /* STONE: coping blocks */
          'float pvAA = max(fwidth(pvD), 1e-4) * 1.2; pvSeam = (1.0 - smoothstep(pvW * 0.5, pvW * 0.5 + pvAA, pvD)) * pvNear * clamp(pvW / pvAA, 0.0, 1.0);',
          'pvTone *= 1.0 + (pvG - 0.5) * 0.09 * pvNear; diffuseColor.rgb *= pvTone * mix(1.0, 0.55, pvSeam); diffuseColor.rgb *= mix(1.0, 0.58, vPav.z); pvR *= mix(1.0, 0.28, vPav.z);'].join('\n'))
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(mix(roughnessFactor * pvR, 0.92, pvSeam), 0.05, 1.0);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.93, 0.84) * vPav.w * 0.7 * uLitN * diffuseColor.rgb;'); };
    pvM.customProgramCacheKey = function () { return 'veil_paving_m19'; };
    var pvGeo = keep(new THREE.BufferGeometry()); pvGeo.setAttribute('position', new THREE.Float32BufferAttribute(PV.p, 3)); pvGeo.setAttribute('uv', new THREE.Float32BufferAttribute(PV.uv, 2)); pvGeo.setAttribute('color', new THREE.Float32BufferAttribute(PV.c, 3)); pvGeo.setAttribute('aPav', new THREE.Float32BufferAttribute(PV.a, 4)); pvGeo.setIndex(PV.i); pvGeo.computeVertexNormals(); pvGeo.computeBoundingSphere();
    var paving = new THREE.Mesh(pvGeo, pvM); paving.name = 'VEIL_PAVING'; paving.receiveShadow = true; group.add(paving);
    h19.paths_m = Math.round(h19.paths_m); h19.walls_m = Math.round(h19.walls_m); h19.paving_tris = PV.i.length / 3; h19.paths = PATHS.map(function (Pa) { return Pa.name; }); info.m19 = h19;
    /* M20: the district's lived-in ANCHORS for the resident population (residents.js): where people walk (the paved paths as drawn), whose
       door they stand at, where they sit, where they stop to watch the falls. World metres, y on the meadow as drawn; data only. */
    ANCH = { paths: PATHS.map(function (Pa) { var pts = []; for (var q = 0; q < Pa.S.length; q++) { var nq = nrm(Pa.S, q), qx = Pa.S[q].x, qz = Pa.S[q].z; pts.push({ x: qx, y: (gY(qx - nq.x * Pa.hw, qz - nq.z * Pa.hw) + gY(qx + nq.x * Pa.hw, qz + nq.z * Pa.hw)) / 2 + 0.05, z: qz }); } return { name: Pa.name, hw: Pa.hw, lane: Pa.lane, pts: pts }; }),   /* y: the paving as drawn — its flat cross-section between the two edges, ~5 cm on the meadow */
      doors: sidePaths.map(function (Sp) { return { x: Sp.b.x, y: gY(Sp.b.x, Sp.b.z) + 0.05, z: Sp.b.z, lx: Sp.a.x, lz: Sp.a.z, yaw: Sp.H.yaw }; }),
      benches: benchAt.map(function (B) { var c = laneC(B.lz); return { x: B.x, y: gY(B.x, B.z), z: B.z, yaw: Math.atan2(c.x - B.x, c.z - B.z) }; }),
      civic: { x: civ.x, y: gY(civ.x, civ.z), z: civ.z, r: 16, disc: 15, top: civ.y + 0.27, hall: 7.0, cols: 10.5, benchR: 12.9, a0: 0.2 },   /* the raised plaza disc, the glass hall, the column ring and the bench ring (x = cos a, z = sin a) */ belvedere: info.belvedere ? { x: info.belvedere.x, y: gY(info.belvedere.x, info.belvedere.z), z: info.belvedere.z } : null,
      bridge: (function () { var c = LP(BRA, 0); return { x: c.x, y: deckY, z: c.z, tx: tgx, tz: tgz, look: Math.atan2(-ox, -oz), half: BRH }; })(),
      homes: RES.homes.map(function (H) { return { x: H.x, z: H.z, yaw: H.yaw, hw: (H.W + 2.6) / 2, hd: (7.2 + 3.2) / 2, top: TOP + roll(H.x, H.z) + 0.65 }; }),   /* each home's graphite plinth (side axis cos / -sin, forward sin / cos): its door stands on it */
      looks: RES.looks.map(function (O) { return { x: O.x, y: TOP + roll(O.x, O.z) + 0.345, z: O.z, yaw: O.yaw }; }),   /* y: the crescent deck's top */ lake: { x: LK.x, z: LK.z }, lip: { x: lip.x, z: lip.z } };
    function merged(list, mat, name) { if (!list.length) return null; var parts = list.map(function (q) { return q.index ? q.toNonIndexed() : q; }), n = 0; parts.forEach(function (q) { n += q.attributes.position.count; });
      var hasC = parts.some(function (q) { return !!q.attributes.aCrys; }), P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), Cr = hasC ? new Float32Array(n * 3) : null, o = 0; parts.forEach(function (q) { P.set(q.attributes.position.array, o * 3); Nn.set(q.attributes.normal.array, o * 3); if (Cr && q.attributes.aCrys) Cr.set(q.attributes.aCrys.array, o * 3); o += q.attributes.position.count; q.dispose(); });
      var g2 = keep(new THREE.BufferGeometry()); g2.setAttribute('position', new THREE.BufferAttribute(P, 3)); g2.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); if (Cr) g2.setAttribute('aCrys', new THREE.BufferAttribute(Cr, 3)); var me = new THREE.Mesh(g2, mat); me.name = name; group.add(me); return me; }
    info.villas = info.homes;   /* the M15c homes replace the M12 villas */

    /* crystal groves: a platinum trunk and three crystal canopy facets per tree, VISIONARY-led with the other spectral stops */
    var NT = LOW ? 20 : 48, rt = rnd(0x7EE5), trunks = [], canopy = [], pal = [CLASS_TINT.purple, SPECTRAL.violet, CRYSTAL_TINT.gold, CRYSTAL_TINT.pink, CRYSTAL_TINT.red, CRYSTAL_TINT.blue, 0xd9dcef, 0xd9dcef];   /* M16: VISIONARY-led, but the highland is a shared civilization — every class in the groves (was purple ×4 + ice) */
    for (var tI = 0; tI < NT; tI++) { var ts = spot(365, 4.5, rt); if (!ts) continue; var th3 = 5 + rt() * 4; trunks.push({ x: ts.x, y: ts.y, z: ts.z, h: th3 }); var ck = pal[Math.floor(rt() * pal.length)];
      for (var cI = 0; cI < 3; cI++) canopy.push({ x: ts.x + (rt() - 0.5) * 2.0, y: ts.y + th3 + cI * 1.2 - 0.6, z: ts.z + (rt() - 0.5) * 2.0, s: 2.1 - cI * 0.45 + rt() * 0.5, yaw: rt() * 3, c: ck }); }
    shrubs.forEach(function (S) { canopy.push(S); }); info.garden_shrubs = shrubs.length;   /* M15c: the garden shrubs share the grove's instanced canopy draw */
    trunks.forEach(function (T2) { var tg = new THREE.CylinderGeometry(0.28, 0.55, T2.h, 6); tg.translate(T2.x, T2.y + T2.h / 2, T2.z); bodyP.push(tg); });   /* trunks join the villa platinum draw */
    var m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3(), e4 = new THREE.Euler();
    var cnG = keep(gemG()); cnG.scale(2.5, 2.7, 2.5); canopyMat = softMat({ emissiveIntensity: night ? 0.3 : 0.07 });   /* M20: soft gems (same bounds as the old octahedra: radius 1, height 2.7) */
    var cnI = new THREE.InstancedMesh(cnG, canopyMat, Math.max(1, canopy.length)), cc = new THREE.Color();
    canopy.forEach(function (Cn, ci) { e4.set(0, Cn.yaw, 0); cnI.setMatrixAt(ci, m4.compose(v4.set(Cn.x, Cn.y, Cn.z), q4.setFromEuler(e4), s4.set(Cn.s, Cn.s, Cn.s))); cnI.setColorAt(ci, cc.set(Cn.c)); }); cnI.count = canopy.length; cnI.name = 'VEIL_GROVE_CANOPY'; group.add(cnI); info.trees = trunks.length;
    if (BLADES.length) { var blG = keep(colG({ sides: 5, samples: 1, bevel: 0, squash: 0.55, contact: 0.15 })); blG.scale(1, 2.0, 1); bladeMat = softMat({ emissiveIntensity: night ? 0.1 : 0.04 });   /* M20: small rooted soft columns (were octahedra); the canopy's soft program, a dimmer glow (a field of glowing blades read as stars on the ground) */
      var blI = new THREE.InstancedMesh(blG, bladeMat, BLADES.length), eb = new THREE.Euler();   /* M19: the crystal grass (planned in the M19 block above) */
      BLADES.forEach(function (Bd, bi) { eb.set(Bd.lean, Bd.yaw, Bd.lean * 0.6); blI.setMatrixAt(bi, m4.compose(v4.set(Bd.x, Bd.y, Bd.z), q4.setFromEuler(eb), s4.set(Bd.w, Bd.h, Bd.w))); blI.setColorAt(bi, cc.set(Bd.c)); }); blI.count = BLADES.length; blI.name = 'VEIL_CRYSTAL_GRASS'; blI.computeBoundingSphere(); group.add(blI); }

    /* the Veil spire: a tall VISIONARY crystal on a platinum plinth, placed on the north part of the mesa so it shows above the lower crests */
    var SB = HL.spire_bearing, SD = HL.spire_dist_m, sx = Math.sin(SB) * SD, sz = Math.cos(SB) * SD, sy = TOP + roll(sx, sz), SH = HL.spire_h_m || 48; taken.push({ x: sx, z: sz, r: 10 });
    spireMat = softMat({ color: 0xd2c8f2, roughness: 0.08, metalness: 0.3, emissive: 0x9a78e0, emissiveIntensity: night ? 0.8 : 0.16, opacity: 0.9 });   /* M20: the soft crystal language (VISIONARY lavender body, class-coloured glow) */
    var plinth = new THREE.CylinderGeometry(5.5, 6.5, 2.2, 8); plinth.translate(sx, sy + 1.1, sz); bodyP.push(plinth);   /* the plinth joins the platinum draw */
    var spParts = spireParts, spG = colG({ samples: SQ === 'HIGH' ? 3 : 2, profile: [[0, 0.62], [0.05, 0.7], [0.45, 1.0], [0.8, 0.62], [0.95, 0.16], [1.0, 0]] }); spG.scale(2.3, SH, 2.3);   /* a slender spindle (review: the 3.2 m-wide column read as a heavy purple pillar) */ spG.rotateY(0.4); spG.translate(sx, sy + 2.2, sz); spParts.push(spG);   /* M20: a rooted crystal column with a blunted point (was a 48 m octahedron) */
    [[7, 0.45, 1.3], [-6, 0.32, 2.4], [2, 0.62, 3.9]].forEach(function (S2) { var sg = gemG(); sg.scale(2.75, 2 * (5 * S2[1] + 3), 2.75); sg.rotateZ(S2[0] * 0.02); sg.translate(sx + Math.cos(S2[2]) * S2[0], sy + 2.2 + SH * S2[1], sz + Math.sin(S2[2]) * S2[0]); spParts.push(sg); });
    var spM = merged(spParts, spireMat, 'VEIL_SPIRE');   /* the spire and its three satellite shards: one draw */
    info.spire = { x: +sx.toFixed(1), z: +sz.toFixed(1), top_y: +(sy + 2.2 + SH).toFixed(1) };

    merged(bodyP, keep(new THREE.MeshStandardMaterial({ color: 0xd9dde4, roughness: 0.38, metalness: 0.35, envMapIntensity: 0.6 })), 'VEIL_VILLAS');
    merged(darkP, keep(new THREE.MeshStandardMaterial({ color: 0x2e333d, roughness: 0.55, metalness: 0.4 })), 'VEIL_VILLA_ROOFS');
    glassMat = keep(new THREE.MeshStandardMaterial({ color: 0x3b4252, roughness: 0.08, metalness: 0.7, emissive: 0xfff1dc, emissiveIntensity: night ? 0.9 : 0.06, envMapIntensity: 1.0, side: THREE.DoubleSide }));
    /* M20 ROOMS BEHIND THE GLASS (review: at night every villa, the civic hall and the doors glowed as one flat cream sheet — a blank screen).
       The vertical glass now reads as glazing onto rooms: a mullion / transom grid in world space (1.7 m bays, 2.9 m storeys) that frames it by
       day, and at night a room per bay — most lit, each its own warmth, the rest dim rather than black — the light pooling mid-bay under the
       ceiling, soft furniture shadow along the lower third. Level glass (the landing-pad ring, rail tops) keeps its plain glow. Shader only, no draw. */
    glassMat.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGw; varying vec3 vGn;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGw = (modelMatrix * vec4(transformed, 1.0)).xyz; vGn = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vGw; varying vec3 vGn;')
        .replace('#include <color_fragment>', ['#include <color_fragment>',
          'vec3 gn = normalize(vGn); float gV = 1.0 - smoothstep(0.55, 0.8, abs(gn.y)); vec3 gq = vGw / vec3(1.7, 2.9, 1.7), gc = floor(gq), gf = fract(gq);',
          'float gmz = (1.0 - smoothstep(0.0, 0.035, min(gf.z, 1.0 - gf.z))) * abs(gn.x), gmx = (1.0 - smoothstep(0.0, 0.035, min(gf.x, 1.0 - gf.x))) * abs(gn.z), gtr = 1.0 - smoothstep(0.0, 0.03, min(gf.y, 1.0 - gf.y));',
          'float gMull = clamp(max(max(gmz, gmx), gtr), 0.0, 1.0) * gV; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.64, 0.68), gMull * 0.7);',
          'float gH = fract(sin(dot(gc, vec3(12.9898, 78.233, 37.719))) * 43758.5453), gLit = smoothstep(0.36, 0.46, gH), gWarm = 0.5 + 0.5 * fract(gH * 7.13), gX = mix(gf.x, gf.z, abs(gn.x));',
          'float gFurn = smoothstep(0.4, 0.5, fract(gH * 3.7 + gX * 1.4)) * (1.0 - smoothstep(0.16, 0.3, gf.y));',
          'float gRoom = mix(0.45, 1.0, smoothstep(0.1, 0.9, gf.y)) * (1.0 - 0.35 * gFurn) * (0.72 + 0.28 * sin(3.14159 * gX)), gCard = mix(0.2, 1.0, gLit) * gWarm * gRoom;'].join('\n'))
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= mix(1.0, gCard * (1.0 - 0.92 * gMull), gV);'); };
    glassMat.customProgramCacheKey = function () { return 'veil_glass_rooms_m20'; };
    merged(glassP, glassMat, 'VEIL_VILLA_GLASS');

    /* lantern light: soft neutral glows over the bollard heads (additive points, strong at night) */
    var lp = LAMP19.slice();   /* M19: the old loop lanterns floated free over the lawn (no path under them); the bollards on the walks and the lane carry the light now */
    lp = lp.concat(laneLamps); var lg = keep(new THREE.BufferGeometry()); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); var LS = 32, ld = new Uint8Array(LS * LS * 4); for (var li2 = 0; li2 < LS * LS; li2++) { var qx = (li2 % LS + 0.5) / LS * 2 - 1, qy = (Math.floor(li2 / LS) + 0.5) / LS * 2 - 1, qr = Math.min(1, Math.hypot(qx, qy)), qv = Math.round(255 * Math.pow(1 - qr, 1.6)); ld[li2 * 4] = ld[li2 * 4 + 1] = ld[li2 * 4 + 2] = qv; ld[li2 * 4 + 3] = qv; }
    var lampTex = keep(new THREE.DataTexture(ld, LS, LS, THREE.RGBAFormat)); lampTex.needsUpdate = true;   /* M15c: a round soft lantern glow (the bare point sprite drew hard white squares up close) */
    lampMat = keep(new THREE.PointsMaterial({ color: 0xfff1dc, map: lampTex, size: 2.2, sizeAttenuation: true, transparent: true, opacity: night ? 0.95 : 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
    var lamps = new THREE.Points(lg, lampMat); lamps.name = 'VEIL_HIGHLAND_LANTERNS'; group.add(lamps); info.lanterns = lp.length / 3;

    /* ---------- 4. the aura language (one shared field, built by aura.js) ---------- */
    var A = ctx.auraRequests; if (A) { var HT = yTop - yBot, cMid = faceOn(LINES, NS / 2, yBot + HT * 0.5), gy = yBot + HT * 0.5, GR = Math.max(CH * 0.66, HT * 0.64);
      if (ctx.auraForms) { var F = ctx.auraForms;   /* M14 DIMENSIONAL AURA: over the falls' crest, high above the highland, a pair of tilted soft rings turning against each other and a hexagonal frame above them — magic in the air, far from anyone's reach */
        F.push({ x: cMid.x - ox * 16, y: yTop + CH * 0.75, z: cMid.z - oz * 16, size: CH * 1.1, shape: 'RING', scale: [1, 14, 1], tint: CRYSTAL_TINT.gold, intensity: 0.55, ground: yTop, axis: [ox, 0.5, oz], spin: 0.03, phase: 0.2 });
        F.push({ x: cMid.x - ox * 16, y: yTop + CH * 0.75, z: cMid.z - oz * 16, size: CH * 0.86, shape: 'RING', scale: [1, 12, 1], tint: 0xff9ad2, intensity: 0.45, ground: yTop, axis: [-oz, 0.4, ox], spin: -0.024, phase: 0.55 });
        [[-26, 0.95, -18, 5.5, 0xb99cff], [-8, 1.6, 22, 4.2, 0xff6f82], [14, 1.15, -30, 3.6, 0xffa6d4]].forEach(function (k) { var tx = -oz, tz = ox; F.push({ x: cMid.x + ox * k[0] + tx * k[2], y: yTop + CH * k[1], z: cMid.z + oz * k[0] + tz * k[2], size: k[3], tint: k[4], ground: yTop, shape: 'CRYSTAL' }); });   /* M15: great diamonds hanging in the air over the falls (the owner's reference); M16: VISIONARY purple, LEAN crimson, BAGE pink (was violet, pink, violet) */
        F.push({ x: cMid.x - ox * 10, y: yTop + CH * 1.35, z: cMid.z - oz * 10, size: CH * 0.42, shape: 'HEX', scale: [1, 0.4, 1], tint: CRYSTAL_TINT.blue, intensity: 0.5, ground: yTop, axis: [0.2, 1, 0.3], spin: 0.04, phase: 0.8 }); }
      A.push({ x: cMid.x - ox * 8, y: gy, z: cMid.z - oz * 8, size: CH * 0.55, aspect: Math.max(1, HT / (CH * 0.95)), ring: 0, tint: 0x98a3c4, spectral: 0.55, intensity: 0.12, pull: 20, phase: 0.3 });   /* the veil glow hugging the curtain (fringes, no circle; M19: pale steel, was a lavender default) */
      A.push({ x: baseX - ox * 6, y: 14, z: baseZ - oz * 6, size: CH * 0.8, aspect: 0.42, ring: 0, tint: 0xeef4ff, spectral: 0.35, intensity: 0.16, pull: 14, nightK: 1.25 });   /* the base spray bloom (M19: softer at eye level) */
      /* M19 (owner 2026-09-27: "a restrained spectral field — violet, blue, pale gold, pink, subtle crimson; not a literal rainbow sticker;
         stronger high up and in the mist, fainter near eye level"): the M12 GLORY — a full prismatic ring framing the whole falls, and its
         faint outer ring — is retired. The spectrum lives in the water and the air instead: the rising mist takes it on as it climbs (mist
         shader), a soft field of prismatic fringes hangs over the upper curtain and over the lip, and the cap arcs high above stay, softer.
         Nothing spectral sits at eye level. */
      A.push({ x: cMid.x - ox * 12, y: yBot + HT * 0.74, z: cMid.z - oz * 12, size: CH * 0.5, aspect: 1.25, ring: 0, tint: 0x000000, spectral: 1.0, intensity: 1.1, pull: 24, phase: 0.9, nightK: 0.35 });
      A.push({ x: lip.x - ox * 16, y: yTop + 14, z: lip.z - oz * 16, size: CH * 0.36, aspect: 0.7, ring: 0, tint: 0x000000, spectral: 1.0, intensity: 0.9, pull: 16, phase: 2.2, nightK: 0.3 });
      /* the iridescent cap: soft pastel arcs in the air over the lip, as in the reference's lit cloud crown (day only) */
      A.push({ x: baseX + ox * 20, y: yTop + 52, z: baseZ + oz * 20, size: CH * 0.62, aspect: 1, ring: 0.8, ringW: 0.1, arc: 1, breakup: 0.6, tint: 0x000000, spectral: 1.2, intensity: 0.32, pull: 10, phase: 3.3, nightK: 0 });
      A.push({ x: baseX + ox * 30, y: yTop + 76, z: baseZ + oz * 30, size: CH * 0.8, aspect: 1, ring: 0.78, ringW: 0.07, arc: 1, breakup: 0.7, tint: 0x000000, spectral: 1.1, intensity: 0.2, pull: 10, phase: 4.1, nightK: 0 });
      A.push({ x: lip.x - ox * 3, y: yTop + 2, z: lip.z - oz * 3, size: 18, aspect: 0.8, ring: 0, tint: SPECTRAL.gold, spectral: 0.45, intensity: 0.28, pull: 6 });          /* the lip glow */
      A.push({ x: sx, y: sy + 2.2 + SH * 0.55, z: sz, size: 18, aspect: 3.2, ring: 0, tint: CLASS_TINT.purple, spectral: 0.6, intensity: 0.34, pull: 6 });               /* the Veil spire column */
      A.push({ x: sx, y: sy + 2.2 + SH, z: sz, size: 12, aspect: 1, ring: 0.65, ringW: 0.08, breakup: 0.85, tint: SPECTRAL.ice, spectral: 0.6, intensity: 0.45, pull: 4, phase: 2.2 }); }
    ctx.veilFalls = { lip: { x: lip.x, y: yTop, z: lip.z }, base: { x: baseX, z: baseZ }, highland: { x: CX, z: CZ, top_y: TOP }, reachable: false };
    log('veilFalls: curtain stations ' + LINES[0].k + '–' + LINES[NS].k + ' (' + NR + '×' + NC + ', chord ' + CH.toFixed(0) + ' m), lip ' + yTop.toFixed(1) + ' m → ' + yBot + ' m, highland top ' + TOP + ' m, homes ' + info.homes + ' + civic pavilion, overlooks ' + info.overlooks + ', garden shrubs ' + info.garden_shrubs + ', trees ' + info.trees + ', lanterns ' + info.lanterns + ' (not reachable until the runtime bridge)');
  }
  function tick(dt, t) { clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0); if (waterU) waterU.uTime.value = clock; if (frontU) frontU.uTime.value = clock; if (wetTU) wetTU.uTime.value = clock; if (lakeU) lakeU.uTime.value = clock; if (foamU) foamU.uTime.value = clock; if (plU) plU.uTime.value = clock; if (spU) spU.uTime.value = clock; if (mistU) { mistU.uTime.value = clock; if (ctx.renderer && ctx.renderer.getDrawingBufferSize) { ctx.renderer.getDrawingBufferSize(bufV); if (bufV.y > 0) mistU.uScale.value = 700 * bufV.y / 720; } } }   /* the mist's point size follows the drawing buffer (700 was tuned at 720 px): a smaller frame no longer blows the plume out to white, a DPR-3 phone no longer shrinks it */
  function setNight(n) { night = !!n; if (litNightU) litNightU.value = night ? 1 : 0; if (waterU) waterU.uNight.value = night ? 1 : 0; if (frontU) frontU.uNight.value = night ? 1 : 0; if (wetTU) wetTU.uNight.value = night ? 1 : 0; if (foamU) foamU.uNight.value = night ? 1 : 0; if (plU) plU.uNight.value = night ? 1 : 0; if (spU) spU.uNight.value = night ? 1 : 0; if (mistU) mistU.uNight.value = night ? 1 : 0;
    if (glassMat) glassMat.emissiveIntensity = night ? 0.9 : 0.06; if (canopyMat) canopyMat.emissiveIntensity = night ? 0.3 : 0.07; if (bladeMat) bladeMat.emissiveIntensity = night ? 0.1 : 0.04; if (spireMat) spireMat.emissiveIntensity = night ? 0.8 : 0.16; if (lampMat) lampMat.opacity = night ? 0.95 : 0.25; if (flMat) flMat.emissiveIntensity = night ? 0.45 : 0.14; if (crysGlow) crysGlow.value = night ? 0.5 : 0.35; }
  function dispose() { if (group && group.parent) group.parent.remove(group); own.forEach(function (o) { try { o.dispose(); } catch (e) { } }); own = []; group = null; }
  function debug() { return info; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug, anchors: function () { return ANCH; } };
}
