/* MAHWORLD WORLD PIVOT · PASS 6 :: CONTACT AO — ground-contact occlusion so trees, landmarks, civic buildings and class houses sit IN the
   world instead of being pasted onto a bright floor (the daylight key shadow only reaches 24 m on HIGH and is off on MED / LOW).
   One InstancedMesh of flat decals: each instance is a rounded-rectangle signed-distance falloff computed in the fragment shader in METRES
   (so a 48 m gym and a 1 m pillar get the same physically sized soft contact band, never a stretched blob texture). Sources:
     · every forest tree (ctx.forestPlacement) — a broad soft canopy occlusion scaled by the tree;
     · the plaza civic shapes of the host layout (buildings, pillars, barriers, planters, pods) — tight contact bands;
     · the landmark envelopes (temple / gym / tower / market) — a wide base darkening, inset so it hugs the real footprint;
     · the class-house supports / spires / gate pillars and the match hall footprint from the registry.
   Presentation only: no collider, no walkable change, decals lie 5.5 cm above the local ground (under meadow / props, over the floor and
   the region tint). Fades out with distance (the fog carries far contact); night keeps 70 %. Phone budget: one draw call, 4 floats +
   1 matrix per instance, no per-frame CPU work.
   M20 (owner 2026-09-27, lighting: "contact shadows … stronger depth … improve local contrast WITHOUT crushing blacks"): the band is now
   TWO-SCALE — a tight contact core where the object meets the ground (a few centimetres to ~0.4 m, like real ambient occlusion in the
   corner of a wall and a floor) over the old broad soft falloff — and every source also throws a soft DIRECTIONAL CAST: the footprint
   swept away from the key light (the registry Sun by day, the Moon at night; one uniform, so the cast always agrees with the shading and
   the HIGH-tier shadow map), tapered for spires, fading and widening (penumbra) with distance, capped per source and cut where the ground
   changes level or meets water (checked at build time, so a cast never hangs over a terrace edge or a canal). The decal now MULTIPLIES the
   floor (the paving pattern and hue stay, the shade is slightly cooler than the lit floor) instead of blending toward a flat blue-black.
   Still one draw call; LOW keeps the old item set with no cast (never heavier). */
import { groundYAt } from './worldLayout.js';

var VERT = [
  'attribute vec4 aBox;',            /* x: half-width (m) · y: half-depth (m) · z: falloff (m) · w: strength */
  'attribute float aRound;',         /* corner radius (m): = half-size for circles */
  'attribute vec4 aCast;',           /* x: height (m) · y: Sun cast cap (m, 0 = none) · z: taper at the far end · w: cast strength */
  'attribute float aCapN;',          /* the Moon cast cap (m): measured along the Moon, so a night cast never hangs over an edge either */
  'uniform vec3 uSun; uniform float uCastLen; uniform float uMoon;',
  'varying vec2 vP; varying vec4 vBox; varying float vRound; varying float vDist; varying vec2 vSh; varying vec2 vCast;',
  'void main() {',
  '  vBox = aBox; vRound = aRound; vec2 ext = aBox.xy + aBox.z;',
  '  float cap = mix(aCast.y, aCapN, uMoon); vec2 sh = -uSun.xz / max(uSun.y, 0.18) * aCast.x * uCastLen; float sl = length(sh); if (sl > cap) sh *= cap / max(sl, 1e-4);',   /* the footprint swept away from the key, capped per source */
  '  vSh = sh; vCast = aCast.zw; vec2 pad = vec2(0.25 + 0.1 * length(sh));',
  '  vec2 lo = min(-ext, sh - aBox.xy - pad), hi = max(ext, sh + aBox.xy + pad);',
  '  vP = vec2(mix(lo.x, hi.x, uv.x), mix(hi.y, lo.y, uv.y));',                  /* the quad covers the contact band and the cast (same winding as the plane) */
  '  vec4 wp = modelMatrix * vec4(instanceMatrix[3].xyz + vec3(vP.x, 0.0, vP.y), 1.0); vDist = length(cameraPosition - wp.xyz);',
  '  gl_Position = projectionMatrix * viewMatrix * wp;',
  '}'].join('\n');
var FRAG = [
  'uniform vec3 uTint; uniform vec3 uCastTint; uniform float uK; uniform float uCastK; uniform float uNear; uniform float uFar;',
  'varying vec2 vP; varying vec4 vBox; varying float vRound; varying float vDist; varying vec2 vSh; varying vec2 vCast;',
  'float sdRB(vec2 p, vec2 b, float r) { r = min(r, min(b.x, b.y)); vec2 q = abs(p) - (b - r); return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }',   /* rounded-box SDF (m) */
  'void main() {',
  '  float d = sdRB(vP, vBox.xy, vRound); float t = clamp(d / max(vBox.z, 0.01), 0.0, 1.0);',
  '  float core = exp(-max(d, 0.0) / clamp(vBox.z * 0.1, 0.05, 0.35));',                                   /* the contact core: dark right at the join */
  '  float a = vBox.w * min(1.0, (1.0 - t) * (1.0 - t) * 0.62 + core * 0.62);',
  '  float c = 0.0; float L2 = dot(vSh, vSh); if (L2 > 0.01 && vCast.y > 0.0) {',
  '    float s = clamp(dot(vP, vSh) / L2, 0.0, 1.0); float pen = 0.08 + 0.07 * s * sqrt(L2);',              /* nearest swept copy; the penumbra widens with distance */
  '    float dc = sdRB(vP - vSh * s, vBox.xy * mix(1.0, vCast.x, s), vRound);',
  '    c = vCast.y * (1.0 - smoothstep(-pen * 0.35, pen, dc)) * (1.0 - s * s * (3.0 - 2.0 * s) * 0.85) * uCastK; }',
  '  float f = 1.0 - smoothstep(uNear, uFar, vDist); a *= uK * f; c *= f; if (a + c < 0.003) discard;',
  '  gl_FragColor = vec4(mix(vec3(1.0), uTint, a) * mix(vec3(1.0), uCastTint, c), 1.0);',                   /* multiplied into the floor */
  '}'].join('\n');

/* the key direction the rig uses (fieldScene): registry Sun by day, the registry Moon (yaw / elevation) at night */
function keyDir(reg, night) { var d; if (night) { var M = reg.celestial && reg.celestial.moon || {}; var yaw = isFinite(+M.yaw_rad) ? +M.yaw_rad : 0.35, el = isFinite(+M.elevation_rad) ? +M.elevation_rad : 0.28; d = [-Math.sin(yaw) * Math.cos(el), Math.sin(el), -Math.cos(yaw) * Math.cos(el)]; } else d = (reg.celestial && reg.celestial.sun && reg.celestial.sun.direction) || [26, 19, 14]; var n = Math.hypot(d[0], d[1], d[2]) || 1; return [d[0] / n, d[1] / n, d[2] / n]; }

export function createContactAO(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }; var reg = null; var group = null, mesh = null, mat = null, geo = null, night = !!ctx.night;
  var info = { trees: 0, civic: 0, landmarks: 0, houses: 0, instances: 0, draw_calls: 0, cast: 0, cast_cut: 0 };
  var tier = ctx.quality && ctx.quality.tier ? ctx.quality.tier() : 'HIGH', LOW = tier === 'LOW';   /* LOW keeps the plain band (no cast: same decal sizes, never heavier) */
  var DIR = { day: [0, 1, 0], night: [0, 1, 0] };
  var CAST = { day: 1.0, night: 0.3 }, AO = { day: 1.2, night: 0.85 };   /* moonlight casts, faintly */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function build() {
    reg = ctx.registry || {}; var items = []; DIR.day = keyDir(reg, false); DIR.night = keyDir(reg, true);
    var wet = ((reg.water && reg.water.rivers) || []).map(function (r) { return [r.x1 - 1, r.z1 - 1, r.x2 + 1, r.z2 + 1]; });
    function level(x, z, y0) { if (Math.abs(groundYAt(reg, x, z) - y0) > 0.12) return false; for (var i = 0; i < wet.length; i++) { var w = wet[i]; if (x > w[0] && x < w[2] && z > w[1] && z < w[3]) return false; } return true; }
    /* the longest cast (≤ cap) whose centre line and both flanks stay on this source's own level ground and off the water */
    function castCap(it, H, cap, dir) { var vx = -dir[0] / Math.max(dir[1], 0.18), vz = -dir[2] / Math.max(dir[1], 0.18), full = Math.min(cap, H * Math.hypot(vx, vz)); if (!(full > 0.3)) return 0; var ux = vx / Math.hypot(vx, vz), uz = vz / Math.hypot(vx, vz), px = -uz, pz = ux, w = Math.min(Math.abs(px) * it.hx + Math.abs(pz) * it.hz, 12) * 0.8, y0 = it.y - 0.055;
      for (var s = 0.5; s <= full + it.fall * 0.5; s += 0.75) { var bx = it.x + ux * (s + Math.abs(ux) * it.hx + Math.abs(uz) * it.hz), bz = it.z + uz * (s + Math.abs(ux) * it.hx + Math.abs(uz) * it.hz); if (!level(bx, bz, y0) || !level(bx + px * w, bz + pz * w, y0) || !level(bx - px * w, bz - pz * w, y0)) { info.cast_cut++; return Math.max(0, s - 1.0); } } return full; }
    function push(x, z, hx, hz, fall, k, round, cast) { if (!(hx > 0) || !(hz > 0)) return null; var it = { x: x, z: z, hx: hx, hz: hz, fall: fall, k: k, r: Math.min(round || 0, hx, hz), y: groundYAt(reg, x, z) + 0.055, H: 0, cap: 0, capN: 0, taper: 1, kc: 0 };
      if (cast && !LOW) { it.H = cast.h; it.taper = cast.taper === undefined ? 1 : cast.taper; it.kc = cast.k; it.cap = Math.min(castCap(it, cast.h, cast.cap, DIR.day), cast.cap); it.capN = Math.min(castCap(it, cast.h, cast.cap, DIR.night), cast.cap); if (it.cap > 0) info.cast++; }
      items.push(it); return it; }
    /* trees: broad, soft canopy occlusion; the canopy's cast falls a crown-height away (tapered so it reads as a soft crown, not a slab) */
    (ctx.forestPlacement || []).forEach(function (T) { var s = +T.scale || 1; push(T.x, T.z, 1.15 * s, 1.15 * s, 3.6 * s, 0.3, 1.15 * s, { h: 4.2 * s, cap: 7 * s, taper: 1.9, k: 0.45 }); info.trees++; });
    var trees = ctx.forestPlacement || [];
    function nearTree(x, z) { for (var i = 0; i < trees.length; i++) { var dx = trees[i].x - x, dz = trees[i].z - z; if (dx * dx + dz * dz < 1.2) return true; } return false; }
    /* plaza civic shapes from the host layout (grounded, solid, not walls / ramps / walkable decks / rims) */
    ((ctx.layout && ctx.layout.shapes) || []).forEach(function (s) { if ((s.y0 || 0) > 0.2 || s.walkable || s.rim || s.type === 'RAMP' || /^WALL_/.test(s.id || '') || !(s.h >= 0.6)) return;
      var fall = clamp(s.h * 0.22, 0.6, 2.6), k = s.h < 1.5 ? 0.28 : 0.4, cast = { h: Math.min(s.h, 40), cap: s.h < 1.5 ? 1.6 : (s.h > 30 ? 16 : 11), taper: s.type === 'CYLINDER' ? 0.8 : 0.92, k: s.h < 1.5 ? 0.5 : 0.8 };
      /* M20 (owner 2026-09-27, plaza furniture: "reduce smooth primitive shells"): the field's light columns — a CYLINDER ≥ 4.2 m tall and
         ≥ 0.4 m in radius that is not a building / pod / landmark / world shape, the gate fieldScene draws them by — are dressed by cityScene
         as civic light masts (LIGHT_MAST there): a 0.46 m stone seat plinth on the footprint (r + 2 cm) and a slim ≈ 0.24 m mast up to the
         lantern. The decal follows what is drawn: a tight band and a short cast for the plinth, and a slim, lighter cast for the mast and its
         lantern that starts under the plinth (its own band is hidden there). The old drum's full-size cast (≈ 1.2 m wide, 4–5 m long) read
         beside a slim post as the shadow of an invisible column. LOW (no casts) keeps one plinth band per column: never heavier. */
      if (s.type === 'CYLINDER' && !s.building && !s.pod && !s.landmark && !s.world && s.h >= 4.2 && s.r >= 0.4) { var pr = s.r + 0.02;
        push(s.x, s.z, pr, pr, 0.6, 0.28, pr, { h: 0.46, cap: 1.2, taper: 1, k: 0.5 }); if (!LOW) push(s.x, s.z, 0.12, 0.12, 0.3, 0.2, 0.12, { h: Math.min(s.h, 40), cap: 11, taper: 1, k: 0.42 }); info.civic++; info.masts = (info.masts || 0) + 1; return; }
      if (s.type === 'CYLINDER') { push(s.x, s.z, s.r, s.r, fall, k, s.r, cast); info.civic++; }
      else if (s.type === 'BOX') { var hx = (s.x2 - s.x1) / 2, hz = (s.z2 - s.z1) / 2; push((s.x1 + s.x2) / 2, (s.z1 + s.z2) / 2, hx, hz, fall, k, s.rounded ? Math.min(hx, hz) * 0.9 : 0.25, cast); info.civic++; } });
    /* landmark envelopes: inset so the band hugs the real footprint, a wide base darkening; the cast tapers (spired silhouettes) */
    ((ctx.layout && ctx.layout.landmarks) || []).forEach(function (l) { var e = l.envelope; if (!e || e.x1 === undefined) return; var hx = (e.x2 - e.x1) / 2 * 0.86, hz = (e.z2 - e.z1) / 2 * 0.86; push((e.x1 + e.x2) / 2, (e.z1 + e.z2) / 2, hx, hz, clamp((e.height || 20) * 0.12, 2.2, 5), 0.42, Math.min(hx, hz) * 0.35, { h: e.height || 20, cap: 16, taper: 0.45, k: 0.7 }); info.landmarks++; });
    /* class houses / gate pillars / match hall from the registry */
    var A = reg.architecture || {}; var TER = {}; ((reg.terraces && reg.terraces.list) || []).forEach(function (t) { TER[t.id] = t; });
    (A.class_houses || []).forEach(function (H) {
      if (H.supports) for (var k = 0; k < H.supports; k++) { var a = Math.PI / 4 + k * Math.PI / 2, r0 = (H.support_r || 0.55) * 1.4; push(H.x + Math.cos(a) * (H.ring_r || 7), H.z + Math.sin(a) * (H.ring_r || 7), r0, r0, 1.6, 0.4, r0, { h: 6, cap: 5, taper: 1, k: 0.4 }); info.houses++; }
      if (H.platform && H.supports) { var P = H.platform; push((P.x1 + P.x2) / 2, (P.z1 + P.z2) / 2, (P.x2 - P.x1) / 2 * 0.8, (P.z2 - P.z1) / 2 * 0.8, 4.5, 0.2, 2); }   /* the canopy's soft sky occlusion under the raised platform */
      (H.spires || []).forEach(function (sp) { push(H.x + sp.dx, H.z + sp.dz, sp.r, sp.r, 2.2, 0.42, sp.r, { h: sp.h || 12, cap: 10, taper: 0.35, k: 0.42 }); info.houses++; });
      (H.pillars || []).forEach(function (q) { push(q.x, q.z, 3.6, 3.6, 2.4, 0.36, 3.6, { h: 8, cap: 7, taper: 0.7, k: 0.4 }); info.houses++; }); });
    (reg.artifacts || []).forEach(function (a) { if (a.id === 'MATCH_HALL' && a.position && a.footprint && a.footprint.w) { var fw = a.footprint.w / 2, fd = (a.footprint.d || a.footprint.w) / 2; push(a.position[0], a.position[2], fw, fd, 3, 0.42, 0.5, { h: a.footprint.h || 22, cap: 14, taper: 0.9, k: 0.8 }); info.landmarks++; } });
    /* M8B TRANSITIONS: every street light and wayfinder foot, and the sanctuary monoliths, sit in a small contact band too */
    (ctx.fixturePlacement || []).forEach(function (F) { if (F && isFinite(F.x) && isFinite(F.z)) { push(F.x, F.z, 0.3, 0.3, 1.3, 0.36, 0.3, { h: 2.2, cap: 2.4, taper: 0.6, k: 0.3 }); info.fixtures = (info.fixtures || 0) + 1; } });
    ((reg.regions && reg.regions.list) || []).forEach(function (R) { (R.monoliths || []).forEach(function (m) { var r0 = 0.9 + (m.h || 6) * 0.08; push(m.x, m.z, r0, r0, 1.9, 0.4, r0, { h: m.h || 6, cap: 9, taper: 0.3, k: 0.4 }); info.monoliths = (info.monoliths || 0) + 1; }); });
    items = items.filter(function (it) { return !(it.hx === it.hz && it.hx < 1 && nearTree(it.x, it.z) && it.k > 0.3); });
    if (!items.length) { log('contactAO: nothing to ground'); return; }
    group = new THREE.Group(); group.name = 'WORLD_CONTACT_AO'; group.userData.noMerge = true; ctx.group.add(group);
    geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    var aBox = new Float32Array(items.length * 4), aRound = new Float32Array(items.length), aCast = new Float32Array(items.length * 4), aCapN = new Float32Array(items.length);
    mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,   /* dst × src: the floor keeps its pattern and hue under the shade */
      uniforms: { uTint: { value: new THREE.Vector3(0.1, 0.11, 0.14) }, uCastTint: { value: new THREE.Vector3(0.4, 0.43, 0.5) }, uK: { value: night ? AO.night : AO.day }, uCastK: { value: night ? CAST.night : CAST.day }, uSun: { value: new THREE.Vector3().fromArray(night ? DIR.night : DIR.day) }, uCastLen: { value: 1 }, uMoon: { value: night ? 1 : 0 }, uNear: { value: 110 }, uFar: { value: 300 } } });
    mesh = new THREE.InstancedMesh(geo, mat, items.length); mesh.name = 'WORLD_CONTACT_AO'; mesh.userData.noMerge = true; mesh.frustumCulled = false; mesh.renderOrder = 1;
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
    items.forEach(function (it, i) { v.set(it.x, it.y, it.z); m4.compose(v, q, sc); mesh.setMatrixAt(i, m4); aBox[i * 4] = it.hx; aBox[i * 4 + 1] = it.hz; aBox[i * 4 + 2] = it.fall; aBox[i * 4 + 3] = it.k; aRound[i] = it.r; aCast[i * 4] = it.H; aCast[i * 4 + 1] = it.cap; aCast[i * 4 + 2] = it.taper; aCast[i * 4 + 3] = it.cap > 0 || it.capN > 0 ? it.kc : 0; aCapN[i] = it.capN; });
    geo.setAttribute('aBox', new THREE.InstancedBufferAttribute(aBox, 4)); geo.setAttribute('aRound', new THREE.InstancedBufferAttribute(aRound, 1)); geo.setAttribute('aCast', new THREE.InstancedBufferAttribute(aCast, 4)); geo.setAttribute('aCapN', new THREE.InstancedBufferAttribute(aCapN, 1)); mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh); info.instances = items.length; info.draw_calls = 1;
    log('contactAO: ' + info.instances + ' contact decals (trees ' + info.trees + ', civic ' + info.civic + ', landmarks ' + info.landmarks + ', class houses ' + info.houses + ', directional casts ' + info.cast + '), 1 draw call');
  }
  function setNight(n) { night = !!n; if (mat) { mat.uniforms.uK.value = night ? AO.night : AO.day; mat.uniforms.uCastK.value = night ? CAST.night : CAST.day; mat.uniforms.uSun.value.fromArray(night ? DIR.night : DIR.day); mat.uniforms.uMoon.value = night ? 1 : 0; } }
  function dispose() { if (group && group.parent) group.parent.remove(group); if (geo) geo.dispose(); if (mat) mat.dispose(); group = mesh = geo = mat = null; }
  function debug() { return Object.assign({ policy: 'SDF_ROUNDED_BOX_METRES', cast: 'SWEPT_FOOTPRINT_KEY_DIRECTION', blend: 'MULTIPLY', tier: tier, presentation_only: true }, info); }
  return { build: build, setNight: setNight, dispose: dispose, debug: debug };
}
