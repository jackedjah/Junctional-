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
   1 matrix per instance, no per-frame CPU work. */
import { groundYAt } from './worldLayout.js';

var VERT = [
  'attribute vec4 aBox;',            /* x: half-width (m) · y: half-depth (m) · z: falloff (m) · w: strength */
  'attribute float aRound;',         /* corner radius (m): = half-size for circles */
  'varying vec2 vP; varying vec4 vBox; varying float vRound; varying float vDist;',
  'void main() {',
  '  vBox = aBox; vRound = aRound; vec2 ext = aBox.xy + aBox.z;',
  '  vP = (uv - 0.5) * 2.0 * ext;',                                           /* local metres from the footprint centre */
  '  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vDist = length(cameraPosition - wp.xyz);',
  '  gl_Position = projectionMatrix * viewMatrix * wp;',
  '}'].join('\n');
var FRAG = [
  'uniform vec3 uTint; uniform float uK; uniform float uNear; uniform float uFar;',
  'varying vec2 vP; varying vec4 vBox; varying float vRound; varying float vDist;',
  'void main() {',
  '  vec2 q = abs(vP) - (vBox.xy - vRound); float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - vRound;',   /* rounded-box SDF (m) */
  '  float t = clamp(d / max(vBox.z, 0.01), 0.0, 1.0); float a = vBox.w * (1.0 - t) * (1.0 - t);',
  '  a *= uK * (1.0 - smoothstep(uNear, uFar, vDist)); if (a < 0.003) discard;',
  '  gl_FragColor = vec4(uTint, a);',
  '}'].join('\n');

export function createContactAO(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }; var reg = null; var group = null, mesh = null, mat = null, geo = null, night = !!ctx.night;
  var info = { trees: 0, civic: 0, landmarks: 0, houses: 0, instances: 0, draw_calls: 0 };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function build() {
    reg = ctx.registry || {}; var items = [];
    function push(x, z, hx, hz, fall, k, round) { if (!(hx > 0) || !(hz > 0)) return; items.push({ x: x, z: z, hx: hx, hz: hz, fall: fall, k: k, r: Math.min(round || 0, hx, hz), y: groundYAt(reg, x, z) + 0.055 }); }
    /* trees: broad, soft canopy occlusion */
    (ctx.forestPlacement || []).forEach(function (T) { var s = +T.scale || 1; push(T.x, T.z, 1.15 * s, 1.15 * s, 3.6 * s, 0.3, 1.15 * s); info.trees++; });
    var trees = ctx.forestPlacement || [];
    function nearTree(x, z) { for (var i = 0; i < trees.length; i++) { var dx = trees[i].x - x, dz = trees[i].z - z; if (dx * dx + dz * dz < 1.2) return true; } return false; }
    /* plaza civic shapes from the host layout (grounded, solid, not walls / ramps / walkable decks / rims) */
    ((ctx.layout && ctx.layout.shapes) || []).forEach(function (s) { if ((s.y0 || 0) > 0.2 || s.walkable || s.rim || s.type === 'RAMP' || /^WALL_/.test(s.id || '') || !(s.h >= 0.6)) return;
      var fall = clamp(s.h * 0.22, 0.6, 2.6), k = s.h < 1.5 ? 0.28 : 0.4;
      if (s.type === 'CYLINDER') { push(s.x, s.z, s.r, s.r, fall, k, s.r); info.civic++; }
      else if (s.type === 'BOX') { var hx = (s.x2 - s.x1) / 2, hz = (s.z2 - s.z1) / 2; push((s.x1 + s.x2) / 2, (s.z1 + s.z2) / 2, hx, hz, fall, k, s.rounded ? Math.min(hx, hz) * 0.9 : 0.25); info.civic++; } });
    /* landmark envelopes: inset so the band hugs the real footprint, a wide base darkening */
    ((ctx.layout && ctx.layout.landmarks) || []).forEach(function (l) { var e = l.envelope; if (!e || e.x1 === undefined) return; var hx = (e.x2 - e.x1) / 2 * 0.86, hz = (e.z2 - e.z1) / 2 * 0.86; push((e.x1 + e.x2) / 2, (e.z1 + e.z2) / 2, hx, hz, clamp((e.height || 20) * 0.12, 2.2, 5), 0.42, Math.min(hx, hz) * 0.35); info.landmarks++; });
    /* class houses / gate pillars / match hall from the registry */
    var A = reg.architecture || {}; var TER = {}; ((reg.terraces && reg.terraces.list) || []).forEach(function (t) { TER[t.id] = t; });
    (A.class_houses || []).forEach(function (H) {
      if (H.supports) for (var k = 0; k < H.supports; k++) { var a = Math.PI / 4 + k * Math.PI / 2, r0 = (H.support_r || 0.55) * 1.4; push(H.x + Math.cos(a) * (H.ring_r || 7), H.z + Math.sin(a) * (H.ring_r || 7), r0, r0, 1.6, 0.4, r0); info.houses++; }
      if (H.platform && H.supports) { var P = H.platform; push((P.x1 + P.x2) / 2, (P.z1 + P.z2) / 2, (P.x2 - P.x1) / 2 * 0.8, (P.z2 - P.z1) / 2 * 0.8, 4.5, 0.2, 2); }   /* the canopy's soft sky occlusion under the raised platform */
      (H.spires || []).forEach(function (sp) { push(H.x + sp.dx, H.z + sp.dz, sp.r, sp.r, 2.2, 0.42, sp.r); info.houses++; });
      (H.pillars || []).forEach(function (q) { push(q.x, q.z, 3.6, 3.6, 2.4, 0.36, 3.6); info.houses++; }); });
    (reg.artifacts || []).forEach(function (a) { if (a.id === 'MATCH_HALL' && a.position && a.footprint && a.footprint.w) { var fw = a.footprint.w / 2, fd = (a.footprint.d || a.footprint.w) / 2; push(a.position[0], a.position[2], fw, fd, 3, 0.42, 0.5); info.landmarks++; } });
    items = items.filter(function (it) { return !(it.hx === it.hz && it.hx < 1 && nearTree(it.x, it.z) && it.k > 0.3); });
    if (!items.length) { log('contactAO: nothing to ground'); return; }
    group = new THREE.Group(); group.name = 'WORLD_CONTACT_AO'; group.userData.noMerge = true; ctx.group.add(group);
    geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    var aBox = new Float32Array(items.length * 4), aRound = new Float32Array(items.length);
    mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
      uniforms: { uTint: { value: new THREE.Color(0x0a0e18) }, uK: { value: night ? 0.7 : 1 }, uNear: { value: 110 }, uFar: { value: 300 } } });
    mesh = new THREE.InstancedMesh(geo, mat, items.length); mesh.name = 'WORLD_CONTACT_AO'; mesh.userData.noMerge = true; mesh.frustumCulled = false; mesh.renderOrder = 1;
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    items.forEach(function (it, i) { v.set(it.x, it.y, it.z); sc.set(2 * (it.hx + it.fall), 1, 2 * (it.hz + it.fall)); m4.compose(v, q, sc); mesh.setMatrixAt(i, m4); aBox[i * 4] = it.hx; aBox[i * 4 + 1] = it.hz; aBox[i * 4 + 2] = it.fall; aBox[i * 4 + 3] = it.k; aRound[i] = it.r; });
    geo.setAttribute('aBox', new THREE.InstancedBufferAttribute(aBox, 4)); geo.setAttribute('aRound', new THREE.InstancedBufferAttribute(aRound, 1)); mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh); info.instances = items.length; info.draw_calls = 1;
    log('contactAO: ' + info.instances + ' contact decals (trees ' + info.trees + ', civic ' + info.civic + ', landmarks ' + info.landmarks + ', class houses ' + info.houses + '), 1 draw call');
  }
  function setNight(n) { night = !!n; if (mat) mat.uniforms.uK.value = night ? 0.7 : 1; }
  function dispose() { if (group && group.parent) group.parent.remove(group); if (geo) geo.dispose(); if (mat) mat.dispose(); group = mesh = geo = mat = null; }
  function debug() { return Object.assign({ policy: 'SDF_ROUNDED_BOX_METRES', presentation_only: true }, info); }
  return { build: build, setNight: setNight, dispose: dispose, debug: debug };
}
