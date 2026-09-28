/* MAHWORLD M21 reference add-on 01 :: GUIDE PILLARS — one compact paired-artifact encounter site (owner brief R01: the way
   light changes on cylindrical structures, not a copy of the video). Two modest pillared forms on the NEXUS south perimeter bed at
   (0,-70): platinum drums with a soft travelling luminous band + a slow pearl-bridged five-class phase cycle, graphite collars, stone
   plinths, gold finials (NEXUS family). The body stays a readable crafted artifact with the glow off and by day; at night the bands
   read. Cross-hue travel happens in GLSL only through a white/pearl bridge with brightest-channel normalisation and a cap (the sigil /
   cycle5 precedent) — every hex literal in this file sits inside the colour-law windows or neutral, so the audit stays green. No NPC
   framework, no powers, no quests: the encounter anchor is a disabled reservation in the registry. Motion is calm (16 s loop, no
   strobe) and frozen out on LOW (plain shared platinum, no uniforms). */
var LOOP_S = 16, BANDS = 2, SITE_X = 0, SITE_Z = -70, PILLAR_DX = 1.75, DRUM_H = 4.2, DRUM_Y0 = 0.3;
var CLASS_HEX = [0xe6c36a, 0x4a7cff, 0xc8324a, 0x7a5bb0, 0xc0709f];   /* ATHLETE gold, TITAN blue, LEAN crimson, VISIONARY violet, BAGE pink — all inside the audit windows */
function ledChunk() { return [
  'uniform float uT; uniform float uGain; uniform float uOn; varying float vLedH; varying float vLedX;',
  'vec3 ledClass(float i) {',
  '  float k = mod(i, 5.0);',
  '  vec3 c0 = vec3(0.902, 0.765, 0.416), c1 = vec3(0.290, 0.486, 1.0), c2 = vec3(0.784, 0.196, 0.290), c3 = vec3(0.478, 0.357, 0.690), c4 = vec3(0.753, 0.439, 0.624);',
  '  vec3 c = k < 0.5 ? c0 : (k < 1.5 ? c1 : (k < 2.5 ? c2 : (k < 3.5 ? c3 : c4))); return c; }',
  'vec3 ledCycle(float u) { float f = fract(u) * 5.0, i0 = floor(f), fr = fract(f);',
  '  vec3 a = ledClass(i0), b = ledClass(i0 + 1.0), pearl = vec3(0.957, 0.965, 1.0);',
  '  vec3 c = mix(a, pearl, smoothstep(0.68, 1.0, fr)); c = mix(c, b, smoothstep(0.0, 0.32, fr));',
  '  float m = max(max(c.r, c.g), max(c.b, 1e-3)); return min(c / m, vec3(1.0)) * 0.62; }',   /* capped well under the ACES shoulder: the hue must survive, never clip to white */
  'float ledBands(float h, float u, float xoff) { float b = 0.0;',
  '  for (int k = 0; k < 2; k++) { float p = fract(h - u + xoff + float(k) * 0.5); float d = (p - 0.5) * 4.2; b += exp(-d * d); }',
  /* deep floor between bands: the dark drum must survive between the travelling stripes (R01 dark-body rule) */
  '  return smoothstep(0.55, 0.95, min(b, 1.0)); }'].join('\n'); }
export function createLedArtifacts(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }; var group = null, own = [], clock = 0, night = !!ctx.night, uT = { value: 0 }, uGain = { value: night ? 1.0 : 0.55 }, uOn = { value: 1 };
  function tier() { return ctx.quality && ctx.quality.tier ? ctx.quality.tier() : 'HIGH'; }
  function arts() { return (ctx.registry && ctx.registry.artifacts || []).filter(function (a) { return a && (a.id === 'GUIDE_PILLAR_W' || a.id === 'GUIDE_PILLAR_E'); }); }
  function build() {
    var list = arts(); if (list.length < 2) { log('ledArtifacts: registry pair missing'); return; }
    var LOW = tier() === 'LOW', SEG = LOW ? 10 : (tier() === 'MED' ? 16 : 24);
    group = new THREE.Group(); group.name = 'MAHWORLD_GUIDE_PILLARS'; (ctx.group || ctx.scene).add(group);
    var stone = new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 0.85, metalness: 0.08 }); own.push(stone);
    var graphite = new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.55, metalness: 0.75 }); own.push(graphite);
    var chrome = new THREE.MeshStandardMaterial({ color: 0xb5b7bb, roughness: 0.3, metalness: 0.9, envMapIntensity: 0.6 }); own.push(chrome);
    var gold = new THREE.MeshStandardMaterial({ color: 0xe6c36a, emissive: 0xffc34d, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.85 }); own.push(gold);
    var drum = new THREE.MeshStandardMaterial({ color: 0x565b63, roughness: 0.5, metalness: 0.7, envMapIntensity: 0.5 }); own.push(drum);   /* R01 dark-body rule: a mid graphite-platinum drum (neutral) so the travelling bands read by contrast instead of clipping the whole body to white */
    if (!LOW) { drum.onBeforeCompile = function (sh) { sh.uniforms.uT = uT; sh.uniforms.uGain = uGain; sh.uniforms.uOn = uOn;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vLedH; varying float vLedX;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLedH = clamp((position.y + 2.1) / 4.2, 0.0, 1.0); vLedX = (modelMatrix * vec4(position, 1.0)).x;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + ledChunk()).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float lu = uT / 16.0; float xo = step(0.0, vLedX) * 0.5; float band = ledBands(vLedH, lu, xo); vec3 lc = ledCycle(lu + xo * 0.2); totalEmissiveRadiance += lc * (band * uGain * uOn); }'); };
      drum.customProgramCacheKey = function () { return 'mahworld-guide-pillars-led'; }; }
    else uOn.value = 0;
    function mesh(g, m, x, y, z) { var o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = false; o.receiveShadow = true; o.userData.noMerge = true; group.add(o); return o; }
    list.forEach(function (a) { var x = a.position[0], z = a.position[2];
      var plinth = new THREE.CylinderGeometry(0.66, 0.72, 0.3, SEG); own.push(plinth); mesh(plinth, stone, x, 0.15, z);
      var dg = new THREE.CylinderGeometry(0.42, 0.55, DRUM_H, SEG, 6); own.push(dg); mesh(dg, drum, x, DRUM_Y0 + DRUM_H / 2, z);
      [1.5, 3.3].forEach(function (cy, i) { var cg = new THREE.CylinderGeometry(i ? 0.47 : 0.5, i ? 0.5 : 0.53, 0.1, SEG); own.push(cg); mesh(cg, graphite, x, cy, z); });
      var cap = new THREE.SphereGeometry(0.42, SEG, Math.max(6, SEG / 2), 0, Math.PI * 2, 0, Math.PI / 2); own.push(cap); mesh(cap, chrome, x, DRUM_Y0 + DRUM_H, z);
      var fin = new THREE.OctahedronGeometry(0.14); own.push(fin); mesh(fin, gold, x, DRUM_Y0 + DRUM_H + 0.5, z); });
    var shG = new THREE.CircleGeometry(1.15, 20); shG.rotateX(-Math.PI / 2); own.push(shG);
    var shM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, uniforms: { uN: { value: night ? 1 : 0 } }, vertexShader: 'varying vec2 vU; void main() { vU = position.xz / 1.15; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform float uN; varying vec2 vU; void main() { float d = length(vU); gl_FragColor = vec4(0.0, 0.0, 0.0, (1.0 - smoothstep(0.3, 1.0, d)) * mix(0.42, 0.3, uN)); }' }); own.push(shM);
    list.forEach(function (a) { var s = new THREE.Mesh(shG, shM); s.position.set(a.position[0], 0.02, a.position[2]); s.renderOrder = 2; s.userData.nonInteractable = true; s.userData.noMerge = true; group.add(s); });
    shM.userData = shM.userData || {}; shM.userData.setNight = function (n) { shM.uniforms.uN.value = n ? 1 : 0; };
    log('ledArtifacts: GUIDE_PILLARS pair at (' + SITE_X + ',' + SITE_Z + '), tier ' + tier());
  }
  function tick(dt, t) { clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0); uT.value = clock; }
  function setNight(n) { night = !!n; uGain.value = night ? 1.0 : 0.55; }
  function dispose() { if (group && group.parent) group.parent.remove(group); own.forEach(function (o) { o.dispose(); }); own = []; group = null; }
  function debug() { return { site: [SITE_X, SITE_Z], loop_s: LOOP_S, bands: BANDS, night: night, tier: tier(), draws: group ? group.children.length : 0 }; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug };
}
