/* MAHWORLD PLAYABLE SAMPLE :: CLASS ENERGY SIGNATURE (presentation only; never simulates, never damages, never costs a resource)
   THREE DISTINCT effects, all taking the class colour from the caller (rig_profile.json class_palette — ATHLETE is GOLD):

   A  TIP / SHIN MATERIAL LIGHT — an emissive gradient on the CHARACTER'S OWN material, rooted at each lower tip and fading upward over
      the lower ~45 % of the metallic shin. Injected with onBeforeCompile (chained after any existing hook, e.g. the blink uniform) so the
      metal albedo, normal detail and specular stay intact underneath: it only ADDS to totalEmissiveRadiance. No hard cutoff (squared
      falloff + smoothstep radial gate), no whole-leg white glow, no transparency.
   B  PROPULSION BEAM — a fine tapered bright core plus a restrained crossed-billboard envelope (never a fat cylinder and never the squat
      block the old build showed when the tip hovered a few centimetres above the floor: width is now tied to length, so a short beam is a
      thin sliver and the ground flare carries the read). One sustained, slightly stronger beam in FUSED; two weaker beams in SPLIT with a
      localized pulse per real gait support event. Orientation follows the posed tip's propulsion direction (`dirs`). Ground glint, ripple
      and speed streak appear ONLY on the real nearby surface the adapter measured (groundY / groundL / groundR); with altitude they fade
      into a short bounded exhaust trail — never a shaft to the distant floor. `blend` crossfades ONE origin into TWO through separation.
   C  FINGERTIP CLASS TRAIL — a faint class-coloured comet at each fingertip during fused forward travel, in ONE Points draw call for both
      hands, proportional to speed, stopping gracefully when travel stops and fading out to fully invisible beyond 25 m (world units are
      metres here: rig_profile.scale.world_units_per_metre = 1).

   Pooled: every mesh is created once per mounted id; update() allocates nothing. Numbers come from presentation_defaults.json → beams and
   rig_profile.json → shin_light / fingertip_trail, passed in by the adapter as cfg. */
export function createBeamFx(THREE, scene, cfg) {
  var C = Object.assign({
    fused_idle: 1.0, fused_travel: 1.25, fused_brace: 1.5, split_baseline: 0.3, split_step_peak: [0.5, 0.65], split_swing_residual: 0.12,
    core_radius_m: 0.012, halo_radius_m: 0.05, ground_glint_m: 0.22, altitude_fade_m: [1.5, 6.0], airborne_trail_m: 0.6, airborne_stream_m: 1.6, airborne_stream_max_m: 5.0, pulse_s: 0.22,
    surface_contact_m: [0.4, 1.2],   /* the flare, ripple and speed streak exist only while a REAL surface is this close under the tip; altitude_fade_m still shapes the beam itself */
    tip_light_fade_m: 0.16, tip_light_radius_m: 0.17, tip_light_strength: 1.15,
    trail_points: 14, trail_length_s: 0.18, trail_min_speed_mps: 1.2, trail_visible_max_m: 25, trail_fade_start_m: 18, trail_size_m: 0.062, trail_alpha: 0.8,
    daylight: true
  }, cfg || {});
  var camera = C.camera || null; var camPos = null;   /* either a camera (cfg.camera / setCamera) or a per-frame world position (update().cameraPos) drives the 25 m trail cut-off */
  var ents = {}; var tmpV = new THREE.Vector3(); var tmpV2 = new THREE.Vector3(); var tmpV3 = new THREE.Vector3(); var tmpQ = new THREE.Quaternion();
  var DOWN = new THREE.Vector3(0, -1, 0);
  /* ---------------- shared textures (one each, disposed with the module) ---------------- */
  function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t; }
  /* beam envelope: bright at the anchor, fading down its length and softly at the edges; a faint filament ripple keeps it alive */
  function beamTexture() { return canvasTex(64, 128, function (g, w, h) { var img = g.createImageData(w, h); var d = img.data; for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var u = (x + 0.5) / w, v = 1 - (y + 0.5) / h; var radial = Math.pow(Math.max(0, 1 - Math.abs(u - 0.5) * 2), 1.15); var along = Math.pow(v, 0.55) * (0.55 + 0.45 * Math.sin(v * 9.0 + Math.sin(u * 5.0) * 1.3) * 0.5 + 0.225); var a = Math.max(0, Math.min(1, radial * along)); var i = (y * w + x) * 4; d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = Math.round(a * 235); } g.putImageData(img, 0, 0); }); }
  function glintTexture() { return canvasTex(128, 128, function (g, w, h) { g.clearRect(0, 0, w, h); var cx = 64, cy = 64; var grad = g.createRadialGradient(cx, cy, 0, cx, cy, 64); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.18, 'rgba(255,255,255,0.55)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.08)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grad; g.beginPath(); g.moveTo(cx, 2); g.quadraticCurveTo(cx + 8, cy - 8, 126, cy); g.quadraticCurveTo(cx + 8, cy + 8, cx, 126); g.quadraticCurveTo(cx - 8, cy + 8, 2, cy); g.quadraticCurveTo(cx - 8, cy - 8, cx, 2); g.closePath(); g.fill(); g.globalAlpha = 0.5; g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.moveTo(cx, 26); g.quadraticCurveTo(cx + 3, cy - 3, 102, cy); g.quadraticCurveTo(cx + 3, cy + 3, cx, 102); g.quadraticCurveTo(cx - 3, cy + 3, 26, cy); g.quadraticCurveTo(cx - 3, cy - 3, cx, 26); g.closePath(); g.fill(); }); }
  function streakTexture() { return canvasTex(128, 32, function (g, w, h) { var grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grad; g.fillRect(0, 0, w, h); var v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, w, h); }); }
  function dotTexture() { return canvasTex(64, 64, function (g, w, h) { var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.45)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grad; g.fillRect(0, 0, w, h); }); }
  /* the core runs bright at the anchor and dissolves at its far end, so a high-flight exhaust ends in air instead of being cut off square */
  function coreTexture() { return canvasTex(4, 128, function (g, w, h) { var img = g.createImageData(w, h); var d = img.data; for (var y = 0; y < h; y++) { var v = 1 - (y + 0.5) / h; var a = Math.pow(Math.min(1, v * 1.12), 0.8) * (0.86 + 0.14 * Math.sin(v * 17.0)); var hot = Math.max(0, Math.min(1, (v - 0.55) / 0.35));   /* white only at the root; the rest of the shaft carries the class colour */
      for (var x = 0; x < w; x++) { var i = (y * w + x) * 4; d[i] = 255; d[i + 1] = Math.round(216 + 39 * hot); d[i + 2] = Math.round(150 + 105 * hot); d[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255); } } g.putImageData(img, 0, 0); }); }
  var TEX = { beam: beamTexture(), core: coreTexture(), glint: glintTexture(), streak: streakTexture(), dot: dotTexture() };
  /* ---------------- shared geometry ---------------- */
  function crossedQuads() { var g = new THREE.BufferGeometry(); var p = [-1, 0, 0, 1, 0, 0, 1, -1, 0, -1, -1, 0, 0, 0, -1, 0, 0, 1, 0, -1, 1, 0, -1, -1]; var uv = [0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0]; g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]); return g; }
  var GEO = { core: new THREE.CylinderGeometry(1, 0.28, 1, 10, 1, true), env: crossedQuads(), plane: new THREE.PlaneGeometry(1, 1), ring: new THREE.RingGeometry(0.82, 1.0, 32) };
  GEO.core.translate(0, -0.5, 0);   /* y in [-1, 0]: the beam hangs DOWN from its anchor and tapers as it goes */
  /* forceSinglePass: a double-sided TRANSPARENT material is drawn twice by default (back faces, then front). Additive blending is
     order-independent, so the second pass buys nothing and doubles the draw calls of every beam mesh. */
  function mat(opts) { return new THREE.MeshBasicMaterial(Object.assign({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false }, opts)); }
  function makeBeam(color) {
    var g = new THREE.Group();
    var core = new THREE.Mesh(GEO.core, mat({ color: 0xffffff, opacity: 0.95, map: TEX.core, alphaMap: TEX.core }));
    var env = new THREE.Mesh(GEO.env, mat({ color: color, opacity: 0.5, map: TEX.beam, alphaMap: TEX.beam }));
    g.add(core); g.add(env); scene.add(g);
    var glint = new THREE.Mesh(GEO.plane, mat({ color: color, opacity: 0.8, map: TEX.glint })); glint.rotation.x = -Math.PI / 2;
    var ripple = new THREE.Mesh(GEO.ring, mat({ color: color, opacity: 0.3 })); ripple.rotation.x = -Math.PI / 2;
    var streak = new THREE.Mesh(GEO.plane, mat({ color: color, opacity: 0.35, map: TEX.streak })); streak.rotation.x = -Math.PI / 2;
    scene.add(glint); scene.add(ripple); scene.add(streak); g.visible = glint.visible = ripple.visible = streak.visible = false; [g, glint, ripple, streak].forEach(function (o) { o.userData.vfx = true; });   /* tagged so a 'VFX off' capture can hide every beam object */
    return { group: g, core: core, env: env, glint: glint, ripple: ripple, streak: streak, pulse: 0, level: 0, shimmerT: Math.random() * 10, rippleT: 0, pos: new THREE.Vector3(), len: 0, color: new THREE.Color(color) };
  }
  function setBeamColor(b, hex) { b.color.setHex(hex); b.env.material.color.copy(b.color); b.glint.material.color.copy(b.color); b.ripple.material.color.copy(b.color); b.streak.material.color.copy(b.color); b.core.material.color.copy(b.color).lerp(new THREE.Color(0xffffff), 0.42); }   /* the core keeps a tint of the class colour so it still reads against a bright daytime sky instead of washing out to white */
  function hideBeam(b) { b.group.visible = false; b.glint.visible = false; b.ripple.visible = false; b.streak.visible = false; b.len = 0; }
  /* place one beam along its propulsion direction; ground response only where the adapter measured a real surface */
  function placeBeam(b, anchor, dir, weight, groundY, vel, dt) {
    if (!anchor || weight <= 0.001) { hideBeam(b); b.level = 0; return; }
    var d = dir && dir.lengthSq() > 0.01 ? tmpV3.copy(dir).normalize() : tmpV3.copy(DOWN);
    var tilt = Math.max(0.12, Math.min(1, (-d.y - 0.15) / 0.55)); weight *= tilt;   /* a tip swung back toward horizontal (long stride) throttles its exhaust: propulsion belongs to the supporting tip */
    b.level += (weight - b.level) * Math.min(1, dt * 14); var w = b.level; b.shimmerT += dt;
    var shimmer = 0.95 + 0.05 * Math.sin(b.shimmerT * 1.7) + 0.02 * Math.sin(b.shimmerT * 5.3);
    var alt = groundY === null || groundY === undefined ? Infinity : Math.max(0, anchor.y - groundY);
    var f0 = C.altitude_fade_m[0], f1 = C.altitude_fade_m[1];
    var ground = alt <= f0 ? 1 : (alt >= f1 ? 0 : 1 - (alt - f0) / (f1 - f0));
    var s0 = C.surface_contact_m[0], s1 = C.surface_contact_m[1];
    var surf = alt <= s0 ? 1 : (alt >= s1 ? 0 : 1 - (alt - s0) / (s1 - s0));   /* separate, much tighter gate: at 4 m up there is no surface to interact with, however long the exhaust is */
    var down = Math.max(0.25, -d.y);   /* a tilted tip needs a longer beam to still reach its contact point */
    var len = alt <= f0 ? Math.min(0.22 + alt * (0.25 + 1.05 * tilt), Math.max(0.03, alt / down)) : Math.min(C.airborne_stream_max_m || 5.0, (C.airborne_stream_m || 1.6) + 0.55 * (alt - f0)) * (0.9 + 0.1 * Math.sin(b.shimmerT * 2.9));   /* HIGH FLIGHT (brief §25): a long downward energy stream that fades in the air (the beam texture fades toward its end) — it never pretends to strike distant terrain: glint / ripple / streak are gated by `surf` below */
    b.group.visible = true; b.group.position.copy(anchor); b.pos.copy(anchor); b.len = len;
    tmpQ.setFromUnitVectors(DOWN, d); b.group.quaternion.copy(tmpQ);
    var bright = Math.min(1, 0.35 + 0.65 * w) * shimmer;
    /* width follows length: a 5 cm hover beam is a thin sliver, never the old squat block */
    var coreR = Math.min(C.core_radius_m, len * 0.16) * (0.9 + 0.1 * Math.min(1.5, w));
    var envR = Math.min(C.halo_radius_m, len * 0.5) * (0.85 + 0.15 * Math.min(1.5, w));
    b.core.scale.set(coreR, len, coreR); b.core.material.opacity = (0.5 + 0.38 * bright) * (0.25 + 0.75 * tilt);   /* the core is a filament, not a floodlight: it must not blow out to pure white in daylight */
    b.env.scale.set(envR, len, envR); b.env.material.opacity = (0.26 + 0.5 * bright * Math.min(1, w)) * (0.25 + 0.75 * tilt);
    if (surf > 0.01) {
      var gs = C.ground_glint_m * (0.7 + 0.5 * Math.min(1.4, w)) * (0.6 + 0.4 * surf);
      b.glint.visible = true; b.glint.position.set(anchor.x + d.x * alt, groundY + 0.012, anchor.z + d.z * alt); b.glint.scale.set(gs, gs, 1); b.glint.material.opacity = 0.85 * bright * surf; b.glint.rotation.z += dt * 0.6;
      b.rippleT += dt * 1.3; var rp = b.rippleT % 1; var rs = gs * (0.55 + 0.75 * rp);   /* restrained: a small breath of displaced air, not a flat selection ring */
      b.ripple.visible = true; b.ripple.position.set(b.glint.position.x, groundY + 0.008, b.glint.position.z); b.ripple.scale.set(rs, rs, 1); b.ripple.material.opacity = 0.15 * (1 - rp) * (1 - rp) * bright * surf;
      var sp = vel ? Math.hypot(vel.x, vel.z) : 0;
      if (sp > 0.4) { b.streak.visible = true; var sl = Math.min(1.4, 0.25 + sp * 0.18); b.streak.position.set(b.glint.position.x - (vel.x / sp) * sl * 0.5, groundY + 0.01, b.glint.position.z - (vel.z / sp) * sl * 0.5); b.streak.scale.set(sl, gs * 0.45, 1); b.streak.rotation.set(-Math.PI / 2, 0, -Math.atan2(vel.z, vel.x)); b.streak.material.opacity = 0.4 * Math.min(1, (sp - 0.4) / 3) * bright * surf; } else b.streak.visible = false;
    } else { b.glint.visible = false; b.ripple.visible = false; b.streak.visible = false; }
  }
  /* ---------------- C · fingertip trails: one Points cloud per character, both hands ---------------- */
  function makeTrail(color) {
    var n = C.trail_points, cap = 48;
    var pos = new Float32Array(n * 2 * 3); var col = new Float32Array(n * 2 * 4);   /* itemSize 4: the class colour stays the class colour and only the ALPHA fades along the trail */
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 4));
    /* normal blending, not additive: an additive gold trail saturates to white against the new daytime sky and loses the class identity */
    var m = new THREE.PointsMaterial({ size: C.trail_size_m, map: TEX.dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.NormalBlending, sizeAttenuation: true, toneMapped: false, opacity: 1 });
    var p = new THREE.Points(g, m); p.frustumCulled = false; p.visible = false; scene.add(p);
    return { points: p, geo: g, mat: m, n: n, cap: cap, buf: { L: new Float32Array(cap * 3), R: new Float32Array(cap * 3) }, head: { L: -1, R: -1 }, cnt: { L: 0, R: 0 }, arc: new Float32Array(cap), emit: 0, color: new THREE.Color(color) };
  }
  function pushSample(t, s, f) { var h = (t.head[s] + 1) % t.cap; t.head[s] = h; var b = t.buf[s]; b[h * 3] = f.x; b[h * 3 + 1] = f.y; b[h * 3 + 2] = f.z; if (t.cnt[s] < t.cap) t.cnt[s]++; }   /* ring buffer: no per-frame allocation */
  function updateTrail(t, fingers, speed, fused, anchorForDist, dt) {
    var want = fused && fingers && speed >= C.trail_min_speed_mps ? Math.min(1, (speed - C.trail_min_speed_mps) / 2.5) : 0;
    t.emit += (want - t.emit) * Math.min(1, dt * (want > t.emit ? 9 : 5));   /* graceful start and stop: no ribbon snapping on or lingering while stationary */
    var eye = camera ? camera.position : camPos;
    var dist = eye && anchorForDist ? eye.distanceTo(anchorForDist) : 0;
    var distFade = !eye ? 1 : (dist >= C.trail_visible_max_m ? 0 : (dist <= C.trail_fade_start_m ? 1 : 1 - (dist - C.trail_fade_start_m) / Math.max(0.001, C.trail_visible_max_m - C.trail_fade_start_m)));
    if (t.emit < 0.01 || distFade <= 0.001 || !fingers) { t.points.visible = false; if (t.emit < 0.01) { t.cnt.L = t.cnt.R = 0; t.head.L = t.head.R = -1; } return; }
    var keepWant = Math.max(2, Math.min(t.cap, Math.round(C.trail_length_s / Math.max(0.008, dt))));   /* the trail spans trail_length_s of real travel whatever the frame rate */
    var pos = t.geo.attributes.position.array, col = t.geo.attributes.color.array; var any = false;
    for (var si = 0; si < 2; si++) {
      var s = si === 0 ? 'L' : 'R'; var f = fingers[s]; if (f) pushSample(t, s, f);
      var base3 = si * t.n * 3, base4 = si * t.n * 4, cnt = Math.min(t.cnt[s], keepWant);
      if (cnt < 2) { for (var z = 0; z < t.n; z++) col[base4 + z * 4 + 3] = 0; continue; }
      var b = t.buf[s], cap = t.cap, head = t.head[s], total = 0; t.arc[0] = 0;
      for (var j = 1; j < cnt; j++) { var i0 = ((head - j + 1) % cap + cap) % cap, i1 = ((head - j) % cap + cap) % cap; total += Math.hypot(b[i1 * 3] - b[i0 * 3], b[i1 * 3 + 1] - b[i0 * 3 + 1], b[i1 * 3 + 2] - b[i0 * 3 + 2]); t.arc[j] = total; }
      var seg = 1;
      for (var k = 0; k < t.n; k++) {   /* resample the path by ARC LENGTH so the trail is a continuous ribbon instead of a dashed row of frame samples */
        var target = total * (k / (t.n - 1)); while (seg < cnt - 1 && t.arc[seg] < target) seg++;
        var a0 = t.arc[seg - 1], a1 = t.arc[seg], u = a1 > a0 ? (target - a0) / (a1 - a0) : 0;
        var ia = ((head - (seg - 1)) % cap + cap) % cap, ib = ((head - seg) % cap + cap) % cap, o3 = base3 + k * 3, o4 = base4 + k * 4;
        pos[o3] = b[ia * 3] + (b[ib * 3] - b[ia * 3]) * u; pos[o3 + 1] = b[ia * 3 + 1] + (b[ib * 3 + 1] - b[ia * 3 + 1]) * u; pos[o3 + 2] = b[ia * 3 + 2] + (b[ib * 3 + 2] - b[ia * 3 + 2]) * u;
        col[o4] = t.color.r; col[o4 + 1] = t.color.g; col[o4 + 2] = t.color.b;
        col[o4 + 3] = Math.pow(1 - k / (t.n - 1), 1.5) * t.emit * distFade * C.trail_alpha; any = true;
      }
    }
    t.geo.attributes.position.needsUpdate = true; t.geo.attributes.color.needsUpdate = true; t.points.visible = any;
  }
  /* ---------------- A · tip / shin material light (injected into the character's own material) ---------------- */
  var claimed = {};   /* material.uuid -> owning id, so two characters of the same class never share one set of tip uniforms */
  function injectTipLight(m) {
    if (m.userData.mwTip) return m.userData.mwTip;
    var u = { uTipColor: { value: new THREE.Color(0xffc34d) }, uTipA: { value: new THREE.Vector3(0, -999, 0) }, uTipB: { value: new THREE.Vector3(0, -999, 0) }, uTipW: { value: new THREE.Vector4(0, 0, C.tip_light_fade_m, C.tip_light_radius_m) } };
    m.userData.mwTip = u; var prev = m.onBeforeCompile;   /* chain: the blink uniform already hooks this material */
    m.onBeforeCompile = function (shader, renderer) {
      if (prev) { try { prev.call(m, shader, renderer); } catch (e) { /* the earlier hook owns its own errors */ } }
      shader.uniforms.uTipColor = u.uTipColor; shader.uniforms.uTipA = u.uTipA; shader.uniforms.uTipB = u.uTipB; shader.uniforms.uTipW = u.uTipW;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMwWorld;').replace('#include <skinning_vertex>', '#include <skinning_vertex>\n  vMwWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMwWorld;\nuniform vec3 uTipColor;\nuniform vec3 uTipA;\nuniform vec3 uTipB;\nuniform vec4 uTipW;\nfloat mwTipTerm(vec3 tip, float w, float fade, float rad){ if(w<=0.001) return 0.0; vec3 d = vMwWorld - tip; float up = clamp(1.0 - max(d.y, 0.0)/max(fade,0.001), 0.0, 1.0); float below = smoothstep(-0.14, -0.01, d.y); float radial = smoothstep(1.0, 0.25, length(d.xz)/max(rad,0.001)); return w * up*up * radial * below; }')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  float mwTip = max( mwTipTerm(uTipA, uTipW.x, uTipW.z, uTipW.w), mwTipTerm(uTipB, uTipW.y, uTipW.z, uTipW.w) );\n  totalEmissiveRadiance += uTipColor * mwTip;');
    };
    m.needsUpdate = true; return u;
  }
  function setTipUniforms(e, aPos, bPos, aW, bW, colorHex, fade) {
    var u = e.tipU; if (!u) return;
    u.uTipColor.value.setHex(colorHex === undefined ? e.color : colorHex);
    if (aPos) u.uTipA.value.copy(aPos); else u.uTipA.value.set(0, -999, 0);
    if (bPos) u.uTipB.value.copy(bPos); else u.uTipB.value.set(0, -999, 0);
    u.uTipW.value.set(aW * C.tip_light_strength, bW * C.tip_light_strength, fade || C.tip_light_fade_m, C.tip_light_radius_m);
  }
  var api = {
    contract: 'BEAM_FX_DEV_0.2 (A shin gradient on the character material · B tapered tip beams on the posed propulsion direction · C fingertip class trails; presentation weights, never energy, force or damage)',
    setCamera: function (cam) { camera = cam; },
    /* the adapter calls this with the character's material(s); assign the RETURNED material back to the mesh (a clone is handed back when
       another character already owns that material instance, e.g. two figures from the same GLB) */
    attachMaterial: function (id, material) {
      if (!material) return { material: material, cloned: false };
      var e = ents[id] || api.mount(id, {}); var m = material, cloned = false;
      if (claimed[m.uuid] && claimed[m.uuid] !== id) { m = material.clone(); m.userData = Object.assign({}, material.userData); delete m.userData.mwTip; if (material.userData.uBlink) m.userData.uBlink = { value: material.userData.uBlink.value }; cloned = true; }
      claimed[m.uuid] = id; e.tipU = injectTipLight(m); e.tipMats = e.tipMats || []; if (e.tipMats.indexOf(m) < 0) e.tipMats.push(m);
      setTipUniforms(e, null, null, 0, 0, e.color, C.tip_light_fade_m);
      return { material: m, cloned: cloned };
    },
    mount: function (id, opts) { if (ents[id]) return ents[id]; var color = opts && opts.color !== undefined ? opts.color : 0xffc34d; var e = { fused: makeBeam(color), L: makeBeam(color), R: makeBeam(color), trail: makeTrail(color), seam: new THREE.Mesh(GEO.ring, mat({ color: color, opacity: 0 })), color: color, tipU: null, tipMats: [], lastIn: null }; e.seam.rotation.x = -Math.PI / 2; e.seam.visible = false; scene.add(e.seam); ents[id] = e; return e; },
    setColor: function (id, hex) { var e = ents[id]; if (!e) return; e.color = hex; setBeamColor(e.fused, hex); setBeamColor(e.L, hex); setBeamColor(e.R, hex); e.trail.color.setHex(hex); e.seam.material.color.setHex(hex); if (e.tipU) e.tipU.uTipColor.value.setHex(hex); },
    pulse: function (id, side, strength) { var e = ents[id]; if (!e) return; var b = side === 'L' ? e.L : (side === 'R' ? e.R : e.fused); b.pulse = Math.max(b.pulse, strength === undefined ? C.split_step_peak[1] : strength); },
    /* v: { form, blend, anchors{fused,L,R}, dirs{fused,L,R}, intensity{fused,L,R}, fingers{L,R}, shinLength, cameraPos,
           seam, seamAnchor, groundY, groundL, groundR, altitude_m, velocity{x,z}, airborne, brace } — all optional but anchors */
    update: function (id, v, dt) {
      var e = ents[id]; if (!e || !v) return; e.lastIn = v; dt = Math.min(0.1, dt || 0.016);
      var vel = v.velocity || null; var brace = v.brace || 0; var sp = vel ? Math.hypot(vel.x, vel.z) : 0; var travel = Math.min(1, sp / 5);
      var it = v.intensity || {}; var blend = v.blend === undefined ? (v.form === 'SPLIT' ? 1 : 0) : Math.max(0, Math.min(1, v.blend));
      var A = v.anchors || {}; var D = v.dirs || {};
      var fusedW = (it.fused === undefined ? 1 : it.fused) * (C.fused_idle + (C.fused_travel - C.fused_idle) * travel) * (1 + (C.fused_brace - 1) * brace);
      var lw = (it.L === undefined ? C.split_baseline : it.L), rw = (it.R === undefined ? C.split_baseline : it.R);
      e.L.pulse = Math.max(0, e.L.pulse - dt / C.pulse_s * C.split_step_peak[1]); e.R.pulse = Math.max(0, e.R.pulse - dt / C.pulse_s * C.split_step_peak[1]); e.fused.pulse = Math.max(0, e.fused.pulse - dt / C.pulse_s);
      lw += e.L.pulse; rw += e.R.pulse; fusedW += e.fused.pulse;
      var gY = v.groundY === undefined ? null : v.groundY; var gL = v.groundL === undefined ? gY : v.groundL; var gR = v.groundR === undefined ? gY : v.groundR;
      var fA = A.fused || null, lA = A.L || null, rA = A.R || null;
      if (blend <= 0.001) { placeBeam(e.fused, fA, D.fused, fusedW, gY, vel, dt); hideBeam(e.L); hideBeam(e.R); }
      else if (blend >= 0.999) { hideBeam(e.fused); placeBeam(e.L, lA || fA, D.L, lw, gL, vel, dt); placeBeam(e.R, rA || fA, D.R, rw, gR, vel, dt); }
      else { var src = fA || lA;
        if (src && lA) { tmpV.copy(src).lerp(lA, blend); placeBeam(e.L, tmpV, D.L || D.fused, lw * blend + fusedW * 0.5 * (1 - blend), gL, vel, dt); } else hideBeam(e.L);
        if (src && rA) { tmpV2.copy(src).lerp(rA, blend); placeBeam(e.R, tmpV2, D.R || D.fused, rw * blend + fusedW * 0.5 * (1 - blend), gR, vel, dt); } else hideBeam(e.R);
        placeBeam(e.fused, fA, D.fused, fusedW * Math.pow(1 - blend, 3), gY, vel, dt); }   /* the single source yields quickly so the pair reads as one beam SPLITTING, not three beams at once */
      /* A · tip light follows the same crossfade so the shins glow from one source in fused form and two after separation */
      var fade = v.shinLength ? v.shinLength * 0.45 : C.tip_light_fade_m;
      var fusedLevel = Math.min(1.2, e.fused.level), lLevel = Math.min(1.2, e.L.level), rLevel = Math.min(1.2, e.R.level);
      if (blend <= 0.001) setTipUniforms(e, fA, null, 0.55 * fusedLevel, 0, e.color, fade);
      else setTipUniforms(e, e.L.group.visible ? e.L.pos : lA, e.R.group.visible ? e.R.pos : rA, 0.55 * lLevel, 0.55 * rLevel, e.color, fade);
      /* C · fingertip trail: fused forward travel only */
      if (v.cameraPos && !camera) { camPos = camPos || new THREE.Vector3(); camPos.copy(v.cameraPos); }
      updateTrail(e.trail, v.fingers || null, blend <= 0.5 && !v.airborne ? sp : 0, blend <= 0.5, fA || lA, dt);
      var seam = v.seam || 0; if (seam > 0.01 && v.seamAnchor) { e.seam.visible = true; e.seam.position.copy(v.seamAnchor); e.seam.scale.setScalar(0.12 + 0.16 * seam); e.seam.material.opacity = 0.34 * seam;   /* daylight: the separation ring is a hint, not a white hoop */ e.seam.rotation.z += dt * 2; } else e.seam.visible = false;
    },
    remove: function (id) { var e = ents[id]; if (!e) return; [e.fused, e.L, e.R].forEach(function (b) { scene.remove(b.group); scene.remove(b.glint); scene.remove(b.ripple); scene.remove(b.streak); [b.core, b.env, b.glint, b.ripple, b.streak].forEach(function (m) { m.material.dispose(); }); }); scene.remove(e.trail.points); e.trail.geo.dispose(); e.trail.mat.dispose(); scene.remove(e.seam); e.seam.material.dispose(); (e.tipMats || []).forEach(function (m) { if (claimed[m.uuid] === id) delete claimed[m.uuid]; }); delete ents[id]; },
    ids: function () { return Object.keys(ents); },
    debug: function (id) { var e = ents[id]; if (!e) return null; var b = function (x) { return { visible: x.group.visible, level: +x.level.toFixed(3), pulse: +x.pulse.toFixed(3), pos: { x: +x.pos.x.toFixed(3), y: +x.pos.y.toFixed(3), z: +x.pos.z.toFixed(3) }, len: +x.len.toFixed(3), core_r: +x.core.scale.x.toFixed(4), env_r: +x.env.scale.x.toFixed(4), env_alpha: +x.env.material.opacity.toFixed(3), glint: x.glint.visible, glint_size: +x.glint.scale.x.toFixed(3), streak: x.streak.visible }; }; return { fused: b(e.fused), L: b(e.L), R: b(e.R), trail: { visible: e.trail.points.visible, emit: +e.trail.emit.toFixed(3), points: e.trail.n * 2 }, tip_light: e.tipU ? { a: +e.tipU.uTipW.value.x.toFixed(3), b: +e.tipU.uTipW.value.y.toFixed(3), fade_m: +e.tipU.uTipW.value.z.toFixed(3), radius_m: +e.tipU.uTipW.value.w.toFixed(3), materials: (e.tipMats || []).length } : null, seam: e.seam.visible ? +e.seam.material.opacity.toFixed(3) : 0, color: '#' + new THREE.Color(e.color).getHexString() }; },
    dispose: function () { Object.keys(ents).forEach(api.remove); Object.keys(TEX).forEach(function (k) { TEX[k].dispose(); }); Object.keys(GEO).forEach(function (k) { GEO[k].dispose(); }); }
  };
  return api;
}
