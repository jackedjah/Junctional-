/* MAHWORLD M12 :: THE VEIL FALLS + THE VEIL HIGHLAND (owner pivot 2026-09-26: waterfall + elevated land, magical natural grandeur).
   WHERE: the west cove of the NEAR ridge at station 110 (bearing ≈ 4.32 rad, south-west of the VISIONARY highland terrace). Stations 109 and
   111 stand ~45 m forward as buttresses, so the recessed face at 110 is a natural amphitheatre — the fall is framed from the highland, the
   overlook and the plaza, and clears both mid-layer towers.
   THE FALLS (owner reference pass: a wide white curtain split into strands by dark rock ribs, a white wall of spray at the base, a full
   prismatic ring round it): one broad curtain over the crest from station 106 to 114 — the notch at 110 carries the tallest strand
   (146.7 m), the buttress noses at 109 / 111 / 113 are the rock ribs between strands, the lip steps down with the crest to the side tiers.
   Aerated streak water in the shader, a dark wet-rock sheet behind, a long foam field on the sea, a rising spray wall along the base,
   violet crystal growth on the flanking cliffs (never green), and the aura language: the glory ring and its faint outer ring, a soft
   iridescent cap over the lip, the veil glow and the base spray bloom.
   THE HIGHLAND: a hanging mesa behind the crest at the lip height — a calm silver-lavender meadow with the source lake that feeds the lip, crystal
   groves, five quiet villas facing the view, lantern paths, a flight landing pad and the Veil spire (visible above the lower crests to the
   north). It reads as land you could go to.
   HOST SAFETY: nothing here is a collider or walkable surface. The curtain stops 3.6 m above the sea (a solid below 3.4 m would need to be flush);
   below that there is only a 3 cm foam decal on the sea and additive light. The curtain rides 2 m in front of the face along its normal (allowed above 3.4 m); the cliff crystals keep their feet above 3.4 m.
   The highland lies 370–500 m out, beyond the host's ±300 m reach — ENTERING it needs new colliders + host validation, so it waits on the
   runtime bridge (registry `reachable: false`).
   The ridge sculpt keeps the face under the curtain as authored (keep_line + veilCurtainKeep; host-safety 17). Draws: curtain 1, wet rock 1, foam 1, mist 1 (not LOW), cliff crystals 1 (not LOW), highland ground 1,
   lake 1, trunks 1, canopies 1, villas 3, spire 1, lanterns 1, pad 1 — all behind the west ridge, frustum-culled as a group. */
import { ridgeStations, ridgeFaceSegment, ridgeFacePoint } from './ridgeLayout.js';
import { SPECTRAL, CLASS_TINT } from './aura.js'; import { applyGeology } from './surfaceDetail.js';

var NOISE = [
  'float vfH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
  'float vfN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(vfH(i), vfH(i + vec2(1.0, 0.0)), f.x), mix(vfH(i + vec2(0.0, 1.0)), vfH(i + vec2(1.0, 1.0)), f.x), f.y); }',
  'vec3 vfSpec(float t) { t = fract(t); vec3 v = vec3(0.706, 0.549, 1.0), i = vec3(0.498, 0.816, 1.0), w = vec3(0.957, 0.965, 1.0), g = vec3(1.0, 0.847, 0.541), p = vec3(1.0, 0.604, 0.824);',
  '  if (t < 0.2) return mix(v, i, t / 0.2); if (t < 0.4) return mix(i, w, (t - 0.2) / 0.2); if (t < 0.6) return mix(w, g, (t - 0.4) / 0.2); if (t < 0.8) return mix(g, p, (t - 0.6) / 0.2); return mix(p, v, (t - 0.8) / 0.2); }'
].join('\n');

/* THE VEIL WATER (M12), shared with the older falls (macro.js): aerated streak water flowing down the sheet, horsetail strands, lip / base
   aeration and a faint spectral sheen; darker at night. uv.x runs across the sheet, uv.y from the lip (0) to the base (1) — flipV for a
   PlaneGeometry (1 at the top); sx scales the across-sheet frequencies to the sheet's width (1 = the 24–58 m Veil ribbon). ribs: the
   geometry carries aRib (0..1, a buttress nose under the water): there, and in broad noise bands, the curtain thins to strands so the
   dark wet rock shows between them, as in the owner's reference; the lower third merges into one white wall of spray. */
export function veilWaterMaterial(THREE, opts) { opts = opts || {};
  var U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uNight: { value: opts.night ? 1 : 0 }, uSX: { value: opts.sx || 1 }, uFlip: { value: opts.flipV ? 1 : 0 } }]);
  return new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true, defines: opts.ribs ? { VEIL_RIBS: 1 } : {},
    vertexShader: '#include <common>\n#include <fog_pars_vertex>\nvarying vec2 vUv;\n#ifdef VEIL_RIBS\nattribute float aRib; varying float vRib;\n#endif\nvoid main() { vUv = uv;\n#ifdef VEIL_RIBS\n vRib = aRib;\n#endif\n vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: ['#include <common>', '#include <fog_pars_fragment>', 'uniform float uTime; uniform float uNight; uniform float uSX; uniform float uFlip; varying vec2 vUv;', '#ifdef VEIL_RIBS', 'varying float vRib;', '#endif', NOISE,
        'void main() { float x = vUv.x, y = mix(vUv.y, 1.0 - vUv.y, uFlip), t = uTime, xs = x * uSX;',
        '  float n1 = vfN(vec2(xs * 20.0, y * 5.5 - t * 1.7)), n2 = vfN(vec2(xs * 57.0 + 3.1, y * 11.0 - t * 2.6)), n3 = vfN(vec2(xs * 7.0 - 1.3, y * 2.2 - t * 0.9));',
        '  float streak = smoothstep(0.32, 0.92, n1 * 0.55 + n2 * 0.3 + n3 * 0.15);',
        '  float rag = vfN(vec2(xs * 9.0, y * 16.0 - t * 1.3)); float side = min(x, 1.0 - x); float edge = smoothstep(0.0, 0.2 + 0.12 * rag, side);',
        '  float aer = (1.0 - smoothstep(0.0, 0.1, y)) + smoothstep(0.72, 1.0, y) * 0.9;',
        '  float strand = smoothstep(0.22, 0.72, vfN(vec2(xs * 6.5 + 11.0, y * 0.8 - t * 0.04)) * 0.75 + vfN(vec2(xs * 15.0 - 4.0, y * 1.6)) * 0.25);',   /* a horsetail veil: uneven strands, not one flat sheet */
        '  vec3 body = mix(vec3(0.74, 0.84, 0.96), vec3(0.985, 0.99, 1.0), clamp(streak * 0.8 + aer * 0.6 + strand * 0.2, 0.0, 1.0));',
        '  vec3 sp = vfSpec(y * 1.5 + x * 0.7 - t * 0.02); body += sp * (0.06 + 0.1 * aer + 0.08 * (1.0 - edge));',   /* light interference in the veil */
        '  body *= mix(1.0, 0.4, uNight); body += sp * 0.07 * uNight;',
        '  float a = edge * mix(0.35, 1.0, strand) * (0.58 + 0.4 * streak + 0.25 * aer);',
        '#ifdef VEIL_RIBS',
        '  float br = vfN(vec2(xs * 1.7 + 5.0, y * 0.45 - t * 0.012)), merge = 1.0 - smoothstep(0.48, 0.8, y);',
        '  float thin = clamp(vRib * 0.95 + (1.0 - smoothstep(0.22, 0.55, br)) * 0.7, 0.0, 1.0) * merge;',
        '  a *= 1.0 - 0.9 * thin; a = max(a, smoothstep(0.62, 0.95, y) * 0.9 * edge);',
        '  a *= 1.0 - 0.8 * smoothstep(0.88, 1.0, y) * (0.6 + 0.4 * rag);',   /* the last rows dissolve into the spray: no hard hem above the sea (LOW has no mist) */
        '#endif',
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
  var bufV = new THREE.Vector2(); var flMat = null, waterU = null, foamU = null, mistU = null, lampMat = null, glassMat = null, canopyMat = null, spireMat = null, padMat = null;
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
    var CU = W.curtain || { from: si - 1, to: si + 1 }, LINES = curtainLines(st, CU.from, CU.to), NS = LINES.length - 1, CPS = 6, NC = NS * CPS, NR = 46;
    var LIPW = W.lip_w_m || 24, OFF = 2.0, LIPD = 0.6, yTop = crC.y - LIPD, yBot = 3.6;
    function onLine(inner, crest, y) { return ridgeFacePoint(inner, crest, Math.min(y, crest.y)); }
    function faceOn(L, u, y) { var n = L.length - 1, i = Math.min(n - 1, Math.max(0, Math.floor(u))), f = u - i, a = onLine(L[i].inner, L[i].crest, y), b = onLine(L[i + 1].inner, L[i + 1].crest, y); return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f }; }
    var c0 = faceOn(LINES, 0, yBot), c1 = faceOn(LINES, NS, yBot), cm = faceOn(LINES, NS / 2, yBot), sideK = ((c1.x - c0.x) * -cm.z - (c1.z - c0.z) * -cm.x) > 0 ? 1 : -1, CH = Math.hypot(c1.x - c0.x, c1.z - c0.z);   /* which side of the station order faces the field; the base chord */
    function normalOn(L, u, y) { var n = L.length - 1, a = faceOn(L, Math.max(0, u - 0.08), y), b = faceOn(L, Math.min(n, u + 0.08), y), tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1; return { x: -tz / l * sideK, z: tx / l * sideK }; }
    function lipAt(u) { var i = Math.min(NS - 1, Math.floor(u)), f = u - i; return LINES[i].crest.y + (LINES[i + 1].crest.y - LINES[i].crest.y) * f - LIPD; }
    var nose = LINES.map(function (Ln, i) { if (i === 0 || i === NS) return 0; var r = function (q) { return Math.hypot(LINES[q].crest.x, LINES[q].crest.z); }; return Math.max(0, Math.min(1, ((r(i - 1) + r(i + 1)) / 2 - r(i)) / 25)); });   /* a buttress nose juts toward the field between two notches */
    function ribAt(u) { var k = Math.round(u); return (nose[k] || 0) * (1 - Math.min(1, Math.max(0, (Math.abs(u - k) - 0.1) / 0.28))); }
    function curtain(off, rib) { var pos = [], uv = [], rb = [], idx = [], i, j;
      for (j = 0; j <= NR; j++) { var t = j / NR;
        for (i = 0; i <= NC; i++) { var u = i / CPS, top = lipAt(u), y = top + (yBot - top) * t, p = faceOn(LINES, u, y), n = normalOn(LINES, u, y);
          pos.push(p.x + n.x * off, y, p.z + n.z * off); uv.push(i / NC, t); if (rib) rb.push(ribAt(u)); } }
      for (j = 0; j < NR; j++) for (i = 0; i < NC; i++) { var a = j * (NC + 1) + i, b = a + NC + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
      var g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if (rib) g.setAttribute('aRib', new THREE.Float32BufferAttribute(rb, 1)); g.setIndex(idx); g.computeBoundingSphere(); return g; }
    var fallMat = keep(veilWaterMaterial(THREE, { night: night, sx: NS * 0.8, ribs: true })); waterU = fallMat.uniforms;
    var fall = new THREE.Mesh(curtain(OFF, true), fallMat); fall.name = 'VEIL_FALLS_CURTAIN'; fall.renderOrder = 6; group.add(fall);
    /* the wet rock behind the water: a darker, glistening sheet on the face, so the white strands read against dark rock and the ribs between them read wet */
    var wetU = fogUniforms({ uNight: { value: night ? 1 : 0 } }); var wetMat = keep(new THREE.ShaderMaterial({ uniforms: wetU, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
      vertexShader: '#include <common>\n#include <fog_pars_vertex>\nvarying vec2 vUv;\nvoid main() { vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
      fragmentShader: ['#include <common>', '#include <fog_pars_fragment>', 'uniform float uNight; varying vec2 vUv;', NOISE, 'void main() { float side = min(vUv.x, 1.0 - vUv.x); float a = smoothstep(0.0, 0.06, side) * (0.5 + 0.2 * vfN(vUv * vec2(9.0, 30.0))) * (1.0 - smoothstep(0.86, 1.0, vUv.y));', '  gl_FragColor = vec4(vec3(0.11, 0.13, 0.19) * mix(1.0, 0.6, uNight), a * 0.8);', '#include <fog_fragment>', '}'].join('\n') }));
    var wet = new THREE.Mesh(curtain(0.8, false), wetMat); wet.name = 'VEIL_FALLS_WET_ROCK'; wet.renderOrder = 5; group.add(wet); info.wet_rock = true;
    var baseX = 0, baseZ = 0, BP = []; for (var q = 0; q <= NS * 4; q++) { var up = q / 4, pb = faceOn(LINES, up, yBot), nb = normalOn(LINES, up, yBot); BP.push({ x: pb.x, z: pb.z, nx: nb.x, nz: nb.z }); baseX += pb.x / (NS * 4 + 1); baseZ += pb.z / (NS * 4 + 1); }
    baseX -= ox * 10; baseZ -= oz * 10;   /* the plunge centre: the base polyline's centroid, stood off toward the field */
    info.fall = { lip_y: +yTop.toFixed(2), bottom_y: yBot, stations: [LINES[0].k, LINES[NS].k], columns: NC, rows: NR, chord_m: +CH.toFixed(1), offset_m: OFF, ribs: nose.map(function (v) { return +v.toFixed(2); }) };

    /* ---------- 2. the plunge: one long foam field on the sea (flush 3 cm) + a white wall of rising spray along the whole base ---------- */
    var foamG = keep(new THREE.CircleGeometry(1, 48)); foamG.rotateX(-Math.PI / 2); foamU = fogUniforms({ uTime: { value: 0 }, uNight: { value: night ? 1 : 0 } });
    var foamMat = keep(new THREE.ShaderMaterial({ uniforms: foamU, transparent: true, depthWrite: false, fog: true,
      vertexShader: '#include <common>\n#include <fog_pars_vertex>\nvarying vec2 vP;\nvoid main() { vP = position.xz; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
      fragmentShader: ['#include <common>', '#include <fog_pars_fragment>', 'uniform float uTime; uniform float uNight; varying vec2 vP;', NOISE,
        'void main() { float r = length(vP); float n = vfN(vP * 9.0 + vec2(uTime * 0.4, -uTime * 0.7)) * 0.6 + vfN(vP * 23.0 - vec2(uTime * 0.9, uTime * 0.3)) * 0.4;',
        '  float fo = (1.0 - smoothstep(0.25, 1.0, r)) * smoothstep(0.35, 0.75, n + (1.0 - r) * 0.35);', 'vec3 c = vec3(0.95, 0.97, 1.0) * mix(1.0, 0.45, uNight);',
        '  gl_FragColor = vec4(c, fo * 0.85);', '#include <fog_fragment>', '}'].join('\n') }));
    var foam = new THREE.Mesh(foamG, foamMat); foam.scale.set(CH * 0.62, 1, 36); foam.rotation.y = Math.atan2(ox, oz); foam.position.set(baseX, SEA + 0.03, baseZ); foam.name = 'VEIL_FALLS_FOAM'; foam.renderOrder = 5; group.add(foam);
    info.foam_y_above_sea = 0.03;
    if (!LOW) { var NB = T === 'MED' ? 230 : 420, NT2 = 0,   /* no mid-height tier on the broad curtain: its puffs read as glowing orbs */
        NM = NB + NT2, mp = new Float32Array(NM * 3), ms = new Float32Array(NM), mr = new Float32Array(NM), r0 = rnd(0x7E11), midY = yTop * 0.46 + yBot * 0.54;
      for (var m = 0; m < NM; m++) { var tier2 = m >= NB, uu = r0() * NS, bq = BP[Math.min(BP.length - 1, Math.round(uu * 4))];
        if (!tier2) { var d0 = OFF + 3 + r0() * 16; mp[m * 3] = bq.x + bq.nx * d0 + (r0() - 0.5) * 8; mp[m * 3 + 1] = 0.5; mp[m * 3 + 2] = bq.z + bq.nz * d0 + (r0() - 0.5) * 8; mr[m] = 34 + r0() * 40; }
        else { uu = NS * (0.2 + 0.6 * r0()); var mc = faceOn(LINES, uu, midY), mn = normalOn(LINES, uu, midY); mp[m * 3] = mc.x + mn.x * (OFF + 2); mp[m * 3 + 1] = midY - 4 + r0() * 8; mp[m * 3 + 2] = mc.z + mn.z * (OFF + 2); mr[m] = 10 + r0() * 8; } ms[m] = r0(); }
      var mg = keep(new THREE.BufferGeometry()); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3)); mg.setAttribute('aSeed', new THREE.BufferAttribute(ms, 1)); mg.setAttribute('aRise', new THREE.BufferAttribute(mr, 1)); mg.boundingSphere = new THREE.Sphere(new THREE.Vector3(baseX, 60, baseZ), CH * 0.6 + 140);
      mistU = { uTime: { value: 0 }, uNight: { value: night ? 1 : 0 }, uScale: { value: 700 }, uOut: { value: new THREE.Vector2(-ox, -oz) } };
      var mistMat = keep(new THREE.ShaderMaterial({ uniforms: mistU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: 'attribute float aSeed; attribute float aRise; uniform float uTime; uniform float uScale; uniform vec2 uOut; varying float vA;\nvoid main() { float ph = fract(aSeed + uTime * (0.03 + aSeed * 0.02)); vec3 p = position; p.y += ph * aRise; p.xz += uOut * ph * aRise * 0.35; p.x += sin(uTime * 0.3 + aSeed * 40.0) * 4.0 * ph; p.z += cos(uTime * 0.23 + aSeed * 31.0) * 3.0 * ph;\n  vA = sin(ph * 3.14159) * (0.55 + 0.45 * aSeed); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = uScale * (8.0 + 18.0 * ph) / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform float uNight; varying float vA;\nvoid main() { float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard; float s = pow(1.0 - r, 1.8); gl_FragColor = vec4(vec3(0.93, 0.96, 1.0) * s * vA * mix(0.085, 0.1, uNight), 1.0); }' }));
      var mist = new THREE.Points(mg, mistMat); mist.name = 'VEIL_FALLS_MIST'; mist.renderOrder = 7; group.add(mist); info.mist = NM; }

    /* ---------- 2b. crystal growth on the cliffs (the reference's lush cliffs, in the VISIONARY palette — violet, silver, a little ice; never
       green): patches of small clumps clinging to the flanks either side of the curtain. Every clump sits ≥ 3.4 m up, on
       rock the sculpt keeps still; visual only, no collider. One instanced draw; not on LOW. ---------- */
    if (!LOW) { var FLL = curtainLines(st, CU.from - 2, CU.from), FLR = curtainLines(st, CU.to, CU.to + 2), fr = rnd(0xF011A), NF = T === 'MED' ? 90 : 150, FP = [];
      /* patches, not scatter: a dozen growth patches on the two flanks, each a tight group of small clumps hugging the rock */
      for (var pi = 0; pi < (T === 'MED' ? 9 : 14); pi++) { var PL = pi % 2 ? FLR : FLL, pu = pi % 2 ? 0.2 + fr() * 1.7 : fr() * 1.7, pk = Math.min(PL.length - 2, Math.floor(pu)), ptop = PL[pk].crest.y + (PL[pk + 1].crest.y - PL[pk].crest.y) * (pu - pk) - 3, py = 12 + (ptop - 16) * Math.pow(fr(), 0.6);
        for (var ci = 0; ci < NF / (T === 'MED' ? 9 : 14) && FP.length < NF; ci++) { var u2 = Math.max(0, Math.min(PL.length - 1.001, pu + (fr() - 0.5) * 0.35)), s2 = 1.3 + fr() * 1.9, y2 = Math.max(4 + s2 * 0.7, Math.min(ptop, py + (fr() - 0.5) * 22));
          var fp = faceOn(PL, u2, y2), fn = normalOn(PL, u2, y2); FP.push({ x: fp.x + fn.x * 0.35, y: y2, z: fp.z + fn.z * 0.35, nx: fn.x, nz: fn.z, s: s2, c: fr() }); } }
      var fg2 = [[0.45, 1.3, 0.45, 0, 1.0, 0, 0], [0.3, 0.85, 0.3, 0.55, 0.6, 0.1, -0.45], [0.26, 0.7, 0.26, -0.5, 0.5, -0.15, 0.5]].map(function (P) { var g = new THREE.OctahedronGeometry(1, 0); g.scale(P[0], P[1], P[2]); g.rotateZ(P[6]); g.translate(P[3], P[4], P[5]); return g.toNonIndexed(); });
      var fpos = []; fg2.forEach(function (g) { fpos.push.apply(fpos, Array.from(g.attributes.position.array)); g.dispose(); });
      var fgeo = keep(new THREE.BufferGeometry()); fgeo.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3)); fgeo.computeVertexNormals();
      flMat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.22, metalness: 0.4, flatShading: true, emissive: 0x241a3e, emissiveIntensity: night ? 1.0 : 0.2, envMapIntensity: 0.8 }));
      var fI = new THREE.InstancedMesh(fgeo, flMat, Math.max(1, FP.length)), fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), fup = new THREE.Vector3(0, 1, 0), fax = new THREE.Vector3(), fcol = new THREE.Color(), FPAL = [0x6b55b0, 0x7d62c4, 0x9a78e0, 0x5e4a9a, 0x8a86a8, 0xb48cff, 0x7d62c4];
      FP.forEach(function (F, k) { fax.set(F.nx * 0.9, 1, F.nz * 0.9).normalize(); fq.setFromUnitVectors(fup, fax); fq.multiply(new THREE.Quaternion().setFromAxisAngle(fup, F.c * 6.283));
        fm.compose(new THREE.Vector3(F.x, F.y, F.z), fq, new THREE.Vector3(F.s, F.s, F.s)); fI.setMatrixAt(k, fm); fI.setColorAt(k, fcol.setHex(FPAL[Math.floor(F.c * FPAL.length) % FPAL.length])); });
      fI.count = FP.length; fI.name = 'VEIL_CLIFF_CRYSTALS'; fI.computeBoundingSphere(); group.add(fI); info.cliff_crystals = FP.length; info.cliff_min_y = FP.reduce(function (m, F) { return Math.min(m, F.y - F.s * 0.35); }, 1e9); }

    /* ---------- 3. the highland mesa ---------- */
    var CB = HL.center_bearing, CD = HL.center_dist_m, CX = Math.sin(CB) * CD, CZ = Math.cos(CB) * CD, er = [Math.sin(CB), Math.cos(CB)], et = [Math.cos(CB), -Math.sin(CB)];
    var TOP = HL.top_y_m, AR = HL.radial_m, AT = HL.tangential_m, RING = 12, SEG = 72, rn = rnd(0x51C3);
    var lip = { x: crC.x, z: crC.z }, lakeC = { x: lip.x + ox * 20, z: lip.z + oz * 20 };   /* the source lake just behind the lip */
    function roll(x, z) { var h = 1.4 * Math.sin(x * 0.047 + 1.3) * Math.cos(z * 0.041 - 0.7) + 0.7 * Math.sin((x + z) * 0.11); var dl = Math.hypot(x - lakeC.x, z - lakeC.z); return h * Math.min(1, Math.max(0, (dl - 16) / 22)); }
    function rimR(th) { var e = Math.hypot(Math.cos(th) / AR, Math.sin(th) / AT); return (1 / e) * (1 + 0.09 * Math.sin(th * 3 + 0.7) + 0.05 * Math.sin(th * 7 + 2.1)); }
    var gp = [], gc = [], gi = [], col = new THREE.Color(), meadowA = new THREE.Color(0xa29eb2), meadowB = new THREE.Color(0x87839a), meadowC = new THREE.Color(0xbdb9ca), rockA = new THREE.Color(0x3b4154), rockB = new THREE.Color(0x6f6b75);
    function vtx(x, y, z, c) { gp.push(x, y, z); gc.push(c.r, c.g, c.b); return gp.length / 3 - 1; }
    var cIdx = vtx(CX, TOP + roll(CX, CZ), CZ, meadowA), rings = [];
    for (var k = 1; k <= RING; k++) { var fk = k / RING, row = []; for (var s2 = 0; s2 < SEG; s2++) { var th = s2 / SEG * Math.PI * 2, rr = rimR(th) * fk, lx = Math.cos(th) * rr, lz = Math.sin(th) * rr;
        var x = CX + er[0] * lx + et[0] * lz, z = CZ + er[1] * lx + et[1] * lz, yy = TOP + roll(x, z) - (fk > 0.86 ? (fk - 0.86) * 12 : 0);
        var nz = 0.5 + 0.5 * Math.sin(x * 0.09 + z * 0.13) * Math.sin(x * 0.031 - z * 0.057); col.copy(meadowA).lerp(nz > 0.6 ? meadowC : meadowB, Math.abs(nz - 0.5) * 1.6); if (fk > 0.9) col.lerp(rockB, (fk - 0.9) * 6);
        row.push(vtx(x, yy, z, col)); } rings.push(row); }
    for (s2 = 0; s2 < SEG; s2++) gi.push(cIdx, rings[0][(s2 + 1) % SEG], rings[0][s2]);
    for (k = 0; k < RING - 1; k++) for (s2 = 0; s2 < SEG; s2++) { var a0 = rings[k][s2], a1 = rings[k][(s2 + 1) % SEG], b0 = rings[k + 1][s2], b1 = rings[k + 1][(s2 + 1) % SEG]; gi.push(a0, a1, b0, a1, b1, b0); }
    var topCount = gi.length, prev = rings[RING - 1], drops = [[10, 5], [34, 12], [78, 22], [118, 30]];   /* the mesa's cliff skirt: drop / outward flare */
    drops.forEach(function (D, di) { var row = []; for (var s3 = 0; s3 < SEG; s3++) { var q = prev[s3], px = gp[q * 3], py = gp[q * 3 + 1], pz = gp[q * 3 + 2], dx = px - CX, dz = pz - CZ, dl = Math.hypot(dx, dz) || 1;
        var jag = (rn() - 0.5) * 3 + Math.sin(s3 * 1.7 + di) * 2.2, ny = TOP - D[0] + (rn() - 0.5) * 4; col.copy(rockA).lerp(rockB, 0.55 - di * 0.12 + (rn() - 0.5) * 0.2);
        var toField = Math.max(0, -(dx / dl * er[0] + dz / dl * er[1])), fl = D[1] * (1 - toField * 1.6) + jag * (1 - toField);   /* the field-facing side tucks back into the ridge body instead of flaring in front of the face and the fall */
        row.push(vtx(CX + dx / dl * (Math.hypot(dx, dz) + fl), ny, CZ + dz / dl * (Math.hypot(dx, dz) + fl), col)); }
      for (s3 = 0; s3 < SEG; s3++) { var p0 = prev[s3], p1 = prev[(s3 + 1) % SEG], q0 = row[s3], q1 = row[(s3 + 1) % SEG]; gi.push(p0, q0, p1, p1, q0, q1); } prev = row; });
    var hg = keep(new THREE.BufferGeometry()); hg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); hg.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); hg.setIndex(gi); hg.computeVertexNormals();
    hg.addGroup(0, topCount, 0); hg.addGroup(topCount, gi.length - topCount, 1);   /* the meadow top and the rock skirt: one mesh, two material groups */
    var hm = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.05, envMapIntensity: 0.3 })), rockM = keep(new THREE.MeshStandardMaterial({ color: 0x5a6172, roughness: 0.88, metalness: 0.04, flatShading: true, envMapIntensity: 0.2 }));
    applyGeology(THREE, rockM, { strata: 2.2, tier: T });   /* the ridges' own rock language on the mesa cliffs */
    var ground = new THREE.Mesh(hg, [hm, rockM]); ground.name = 'VEIL_HIGHLAND_GROUND'; ground.receiveShadow = true; group.add(ground);

    /* the source lake + the channel to the lip (flush water on the meadow) */
    var lakeG = keep(new THREE.CircleGeometry(1, 40)); lakeG.rotateX(-Math.PI / 2); var lakeM = keep(new THREE.MeshStandardMaterial({ color: 0x34506e, roughness: 0.06, metalness: 0.75, envMapIntensity: 0.8, transparent: true, opacity: 0.94 }));
    lakeG.scale(12, 1, 8); lakeG.rotateY(Math.atan2(ox, oz)); lakeG.translate(lakeC.x + ox * 6, TOP + 0.25, lakeC.z + oz * 6);
    var chG = new THREE.PlaneGeometry(LIPW * 0.8, 22); chG.rotateX(-Math.PI / 2); chG.rotateY(Math.atan2(ox, oz)); chG.translate(lip.x + ox * 9, TOP + 0.2, lip.z + oz * 9);
    var lwG = keep(new THREE.BufferGeometry()), lw1 = lakeG.index ? lakeG.toNonIndexed() : lakeG, lw2 = chG.toNonIndexed(); chG.dispose(); lwG.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(lw1.attributes.position.array).concat(Array.from(lw2.attributes.position.array)), 3)); lwG.computeVertexNormals();
    var lake = new THREE.Mesh(lwG, lakeM); lake.name = 'VEIL_HIGHLAND_LAKE'; group.add(lake);   /* the lake and its channel to the lip: one draw */

    /* placement helper: meadow points away from the lake, the lip and each other */
    var taken = [{ x: lakeC.x + ox * 6, z: lakeC.z + oz * 6, r: 20 }, { x: lip.x, z: lip.z, r: 14 }];
    function spot(minR, clear, rngf) { for (var tries = 0; tries < 200; tries++) { var th2 = rngf() * Math.PI * 2, f2 = Math.sqrt(rngf()) * 0.8, rr2 = rimR(th2) * f2, lx2 = Math.cos(th2) * rr2, lz2 = Math.sin(th2) * rr2;
        var x2 = CX + er[0] * lx2 + et[0] * lz2, z2 = CZ + er[1] * lx2 + et[1] * lz2; if (Math.hypot(x2, z2) < minR) continue; var ok = true; for (var q2 = 0; q2 < taken.length; q2++) if (Math.hypot(x2 - taken[q2].x, z2 - taken[q2].z) < taken[q2].r + clear) { ok = false; break; } if (!ok) continue; taken.push({ x: x2, z: z2, r: clear }); return { x: x2, z: z2, y: TOP + roll(x2, z2) }; } return null; }

    /* villas: a glass ground floor, a cantilevered platinum upper volume, a thin graphite roof and plinth — facing the view */
    var bodyP = [], darkP = [], glassP = [], face = Math.atan2(-ox, -oz), rv = rnd(0xA11A);
    function boxAt(list, w, h, d, x, y, z, yaw) { var bg = new THREE.BoxGeometry(w, h, d); bg.rotateY(yaw); bg.translate(x, y, z); list.push(bg); }
    for (var v = 0; v < (HL.villas || 5); v++) { var sp = spot(372, 16, rv); if (!sp) continue; var yaw = face + (rv() - 0.5) * 0.5, c = Math.cos(yaw), s = Math.sin(yaw), shift = 2.2;
      boxAt(darkP, 16, 0.8, 11, sp.x, sp.y + 0.4, sp.z, yaw); boxAt(glassP, 12, 3.6, 8, sp.x, sp.y + 0.8 + 1.8, sp.z, yaw);
      boxAt(bodyP, 13, 3.2, 8.5, sp.x + s * shift, sp.y + 0.8 + 3.4 + 1.6, sp.z + c * shift, yaw); boxAt(glassP, 13.2, 1.1, 8.7, sp.x + s * shift, sp.y + 0.8 + 3.4 + 1.7, sp.z + c * shift, yaw);
      boxAt(bodyP, 15.5, 0.35, 11, sp.x + s * shift * 1.3, sp.y + 0.8 + 6.6 + 0.18, sp.z + c * shift * 1.3, yaw); boxAt(darkP, 15.7, 0.12, 11.2, sp.x + s * shift * 1.3, sp.y + 0.8 + 6.6 - 0.02, sp.z + c * shift * 1.3, yaw); boxAt(bodyP, 1.2, 6.6, 1.2, sp.x - s * 5.2 - c * 4.8, sp.y + 0.8 + 3.3, sp.z - c * 5.2 + s * 4.8, yaw); }
    /* the BELVEDERE: a cantilevered glass viewing deck at the lip beside the falls (dark soffit + platinum frame + lit glass) — seen from the
       highland below as a small lit silhouette at the top of the water: the cue that people go up there */
    (function () { var tx = -oz, tz = ox, bx = lip.x + tx * (LIPW * 0.5 + 9) - ox * 2, bz = lip.z + tz * (LIPW * 0.5 + 9) - oz * 2, by = TOP + 0.2, yawB = Math.atan2(-ox, -oz);
      boxAt(darkP, 11, 0.6, 9, bx - ox * 1.5, by - 0.3, bz - oz * 1.5, yawB); boxAt(bodyP, 11.2, 0.25, 9.2, bx - ox * 1.5, by + 0.1, bz - oz * 1.5, yawB);
      boxAt(glassP, 10.6, 1.1, 0.12, bx - ox * 5.9, by + 0.8, bz - oz * 5.9, yawB); boxAt(glassP, 8.4, 3.2, 6.2, bx + ox * 1.2, by + 1.9, bz + oz * 1.2, yawB); boxAt(bodyP, 9.4, 0.3, 7.4, bx + ox * 1.0, by + 3.65, bz + oz * 1.0, yawB);
      info.belvedere = { x: +bx.toFixed(1), z: +bz.toFixed(1), y: by }; })();
    function merged(list, mat, name) { if (!list.length) return null; var parts = list.map(function (q) { return q.index ? q.toNonIndexed() : q; }), n = 0; parts.forEach(function (q) { n += q.attributes.position.count; });
      var P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), o = 0; parts.forEach(function (q) { P.set(q.attributes.position.array, o * 3); Nn.set(q.attributes.normal.array, o * 3); o += q.attributes.position.count; q.dispose(); });
      var g2 = keep(new THREE.BufferGeometry()); g2.setAttribute('position', new THREE.BufferAttribute(P, 3)); g2.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); var me = new THREE.Mesh(g2, mat); me.name = name; group.add(me); return me; }
    info.villas = glassP.length / 2;

    /* crystal groves: a platinum trunk and three crystal canopy facets per tree, VISIONARY-led with the other spectral stops */
    var NT = LOW ? 20 : 48, rt = rnd(0x7EE5), trunks = [], canopy = [], pal = [CLASS_TINT.purple, CLASS_TINT.purple, SPECTRAL.violet, SPECTRAL.violet, 0xd9dcef, 0xd9dcef, SPECTRAL.ice];
    for (var tI = 0; tI < NT; tI++) { var ts = spot(365, 4.5, rt); if (!ts) continue; var th3 = 5 + rt() * 4; trunks.push({ x: ts.x, y: ts.y, z: ts.z, h: th3 }); var ck = pal[Math.floor(rt() * pal.length)];
      for (var cI = 0; cI < 3; cI++) canopy.push({ x: ts.x + (rt() - 0.5) * 2.0, y: ts.y + th3 + cI * 1.2 - 0.6, z: ts.z + (rt() - 0.5) * 2.0, s: 2.1 - cI * 0.45 + rt() * 0.5, yaw: rt() * 3, c: ck }); }
    trunks.forEach(function (T2) { var tg = new THREE.CylinderGeometry(0.28, 0.55, T2.h, 6); tg.translate(T2.x, T2.y + T2.h / 2, T2.z); bodyP.push(tg); });   /* trunks join the villa platinum draw */
    var m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3(), e4 = new THREE.Euler();
    var cnG = keep(new THREE.OctahedronGeometry(1, 0)); cnG.scale(1, 1.35, 1); canopyMat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18, metalness: 0.45, flatShading: true, emissive: 0xffffff, emissiveIntensity: night ? 0.35 : 0.08 }));
    canopyMat.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance *= vColor.rgb;\n#endif'); }; canopyMat.customProgramCacheKey = function () { return 'veil_canopy'; };
    var cnI = new THREE.InstancedMesh(cnG, canopyMat, Math.max(1, canopy.length)), cc = new THREE.Color();
    canopy.forEach(function (Cn, ci) { e4.set(0, Cn.yaw, 0); cnI.setMatrixAt(ci, m4.compose(v4.set(Cn.x, Cn.y, Cn.z), q4.setFromEuler(e4), s4.set(Cn.s, Cn.s, Cn.s))); cnI.setColorAt(ci, cc.set(Cn.c)); }); cnI.count = canopy.length; cnI.name = 'VEIL_GROVE_CANOPY'; group.add(cnI); info.trees = trunks.length;

    /* the Veil spire: a tall VISIONARY crystal on a platinum plinth, placed on the north part of the mesa so it shows above the lower crests */
    var SB = HL.spire_bearing, SD = HL.spire_dist_m, sx = Math.sin(SB) * SD, sz = Math.cos(SB) * SD, sy = TOP + roll(sx, sz), SH = HL.spire_h_m || 48; taken.push({ x: sx, z: sz, r: 10 });
    spireMat = keep(new THREE.MeshStandardMaterial({ color: 0xcfc2f2, roughness: 0.08, metalness: 0.4, flatShading: true, emissive: 0x9a78e0, emissiveIntensity: night ? 0.9 : 0.22, transparent: true, opacity: 0.94 }));
    var plinth = new THREE.CylinderGeometry(5.5, 6.5, 2.2, 8); plinth.translate(sx, sy + 1.1, sz); bodyP.push(plinth);   /* the plinth joins the platinum draw */
    var spParts = [], spG = new THREE.OctahedronGeometry(1, 0); spG.scale(3.2, SH / 2, 3.2); spG.rotateY(0.4); spG.translate(sx, sy + 2.2 + SH / 2, sz); spParts.push(spG);
    [[7, 0.45, 1.3], [-6, 0.32, 2.4], [2, 0.62, 3.9]].forEach(function (S2) { var sg = new THREE.OctahedronGeometry(1, 0); sg.scale(1.1, 5 * S2[1] + 3, 1.1); sg.rotateZ(S2[0] * 0.02); sg.translate(sx + Math.cos(S2[2]) * S2[0], sy + 2.2 + SH * S2[1], sz + Math.sin(S2[2]) * S2[0]); spParts.push(sg); });
    var spM = merged(spParts, spireMat, 'VEIL_SPIRE');   /* the spire and its three satellite shards: one draw */
    info.spire = { x: +sx.toFixed(1), z: +sz.toFixed(1), top_y: +(sy + 2.2 + SH).toFixed(1) };

    /* the flight landing pad (reachable only once the bridge brings the highland into the host) */
    var pad = spot(380, 14, rnd(0xBAD)); if (pad) { var pg = new THREE.RingGeometry(8.4, 9.4, 48); pg.rotateX(-Math.PI / 2); pg.translate(pad.x, pad.y + 0.12, pad.z); glassP.push(pg); var pd = new THREE.CircleGeometry(8.4, 32); pd.rotateX(-Math.PI / 2); pd.translate(pad.x, pad.y + 0.08, pad.z); darkP.push(pd); info.pad = { x: +pad.x.toFixed(1), z: +pad.z.toFixed(1) }; }   /* the pad: a lit ring (glass draw) on a graphite disc (roof draw) */
    merged(bodyP, keep(new THREE.MeshStandardMaterial({ color: 0xd9dde4, roughness: 0.38, metalness: 0.35, envMapIntensity: 0.6 })), 'VEIL_VILLAS');
    merged(darkP, keep(new THREE.MeshStandardMaterial({ color: 0x2e333d, roughness: 0.55, metalness: 0.4 })), 'VEIL_VILLA_ROOFS');
    glassMat = keep(new THREE.MeshStandardMaterial({ color: 0x3b4252, roughness: 0.08, metalness: 0.7, emissive: 0xfff1dc, emissiveIntensity: night ? 0.9 : 0.06, envMapIntensity: 1.0, side: THREE.DoubleSide })); merged(glassP, glassMat, 'VEIL_VILLA_GLASS');

    /* lantern paths: soft neutral lamps in loops through the meadow (additive points, strong at night) */
    var lp = [], rl = rnd(0x1A7E); for (var lI = 0; lI < 90; lI++) { var th4 = lI / 90 * Math.PI * 2 * 2, f4 = lI < 45 ? 0.45 : 0.72, rr4 = rimR(th4) * (f4 + (rl() - 0.5) * 0.04), lx4 = Math.cos(th4) * rr4, lz4 = Math.sin(th4) * rr4; var x4 = CX + er[0] * lx4 + et[0] * lz4, z4 = CZ + er[1] * lx4 + et[1] * lz4; if (Math.hypot(x4 - (lakeC.x + ox * 6), z4 - (lakeC.z + oz * 6)) < 17) continue; lp.push(x4, TOP + roll(x4, z4) + 1.3, z4); }
    var lg = keep(new THREE.BufferGeometry()); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lampMat = keep(new THREE.PointsMaterial({ color: 0xfff1dc, size: 1.6, sizeAttenuation: true, transparent: true, opacity: night ? 0.95 : 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
    var lamps = new THREE.Points(lg, lampMat); lamps.name = 'VEIL_HIGHLAND_LANTERNS'; group.add(lamps); info.lanterns = lp.length / 3;

    /* ---------- 4. the aura language (one shared field, built by aura.js) ---------- */
    var A = ctx.auraRequests; if (A) { var HT = yTop - yBot, cMid = faceOn(LINES, NS / 2, yBot + HT * 0.5), gy = yBot + HT * 0.5, GR = Math.max(CH * 0.66, HT * 0.64);
      A.push({ x: cMid.x - ox * 8, y: gy, z: cMid.z - oz * 8, size: CH * 0.55, aspect: Math.max(1, HT / (CH * 0.95)), ring: 0, tint: 0x8c84c8, spectral: 0.55, intensity: 0.18, pull: 20, phase: 0.3 });   /* the veil glow hugging the curtain (fringes, no circle) */
      A.push({ x: baseX - ox * 6, y: 14, z: baseZ - oz * 6, size: CH * 0.8, aspect: 0.42, ring: 0, tint: 0xeef4ff, spectral: 0.35, intensity: 0.22, pull: 14, nightK: 1.25 });   /* the base spray bloom */
      /* THE GLORY (the owner's reference): a full prismatic ring framing the whole falls, and a faint second ring outside it. The colour
         runs across the band (ice → white → gold → pink, pearl-soft; no green or orange — colour law); its foot sinks into the spray and
         the sea. Sunlit spray makes it, so it is a day phenomenon: a trace at night. */
      A.push({ x: baseX, y: gy, z: baseZ, size: GR / 0.8, aspect: 1, ring: 0.8, ringW: 0.024, breakup: 0.15, tint: 0x000000, spectral: 2.0, intensity: 0.95, pull: 30, phase: 0.4, nightK: 0.2 });
      A.push({ x: baseX, y: gy, z: baseZ, size: GR * 1.3 / 0.9, aspect: 1, ring: 0.9, ringW: 0.013, breakup: 0.3, tint: 0x000000, spectral: 1.7, intensity: 0.42, pull: 30, phase: 2.6, nightK: 0.1 });
      /* the iridescent cap: soft pastel arcs in the air over the lip, as in the reference's lit cloud crown (day only) */
      A.push({ x: baseX + ox * 20, y: yTop + 52, z: baseZ + oz * 20, size: CH * 0.62, aspect: 1, ring: 0.8, ringW: 0.1, arc: 1, breakup: 0.5, tint: 0x000000, spectral: 1.6, intensity: 0.5, pull: 10, phase: 3.3, nightK: 0 });
      A.push({ x: baseX + ox * 30, y: yTop + 76, z: baseZ + oz * 30, size: CH * 0.8, aspect: 1, ring: 0.78, ringW: 0.07, arc: 1, breakup: 0.6, tint: 0x000000, spectral: 1.5, intensity: 0.35, pull: 10, phase: 4.1, nightK: 0 });
      A.push({ x: lip.x - ox * 3, y: yTop + 2, z: lip.z - oz * 3, size: 18, aspect: 0.8, ring: 0, tint: SPECTRAL.gold, spectral: 0.45, intensity: 0.28, pull: 6 });          /* the lip glow */
      A.push({ x: sx, y: sy + 2.2 + SH * 0.55, z: sz, size: 18, aspect: 3.2, ring: 0, tint: CLASS_TINT.purple, spectral: 0.6, intensity: 0.34, pull: 6 });               /* the Veil spire column */
      A.push({ x: sx, y: sy + 2.2 + SH, z: sz, size: 12, aspect: 1, ring: 0.65, ringW: 0.08, breakup: 0.85, tint: SPECTRAL.ice, spectral: 0.6, intensity: 0.45, pull: 4, phase: 2.2 }); }
    ctx.veilFalls = { lip: { x: lip.x, y: yTop, z: lip.z }, base: { x: baseX, z: baseZ }, highland: { x: CX, z: CZ, top_y: TOP }, reachable: false };
    log('veilFalls: curtain stations ' + LINES[0].k + '–' + LINES[NS].k + ' (' + NR + '×' + NC + ', chord ' + CH.toFixed(0) + ' m), lip ' + yTop.toFixed(1) + ' m → ' + yBot + ' m, highland top ' + TOP + ' m, villas ' + info.villas + ', trees ' + info.trees + ', lanterns ' + info.lanterns + ' (not reachable until the runtime bridge)');
  }
  function tick(dt, t) { clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0); if (waterU) waterU.uTime.value = clock; if (foamU) foamU.uTime.value = clock; if (mistU) { mistU.uTime.value = clock; if (ctx.renderer && ctx.renderer.getDrawingBufferSize) { ctx.renderer.getDrawingBufferSize(bufV); if (bufV.y > 0) mistU.uScale.value = 700 * bufV.y / 720; } } }   /* the mist's point size follows the drawing buffer (700 was tuned at 720 px): a smaller frame no longer blows the plume out to white, a DPR-3 phone no longer shrinks it */
  function setNight(n) { night = !!n; if (waterU) waterU.uNight.value = night ? 1 : 0; if (foamU) foamU.uNight.value = night ? 1 : 0; if (mistU) mistU.uNight.value = night ? 1 : 0;
    if (glassMat) glassMat.emissiveIntensity = night ? 0.9 : 0.06; if (canopyMat) canopyMat.emissiveIntensity = night ? 0.35 : 0.08; if (spireMat) spireMat.emissiveIntensity = night ? 0.9 : 0.22; if (lampMat) lampMat.opacity = night ? 0.95 : 0.25; if (flMat) flMat.emissiveIntensity = night ? 1.0 : 0.2; }
  function dispose() { if (group && group.parent) group.parent.remove(group); own.forEach(function (o) { try { o.dispose(); } catch (e) { } }); own = []; group = null; }
  function debug() { return info; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug };
}
