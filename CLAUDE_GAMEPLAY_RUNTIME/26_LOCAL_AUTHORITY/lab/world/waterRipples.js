/* MAHWORLD JOB B :: RESPONSIVE WATER (owner interjection 2026-09-19 — environment + guide scale delta, §4–§6, §9)
   The canal must not be a flat decorative plane: contact makes ripples that expand, overlap and die out (impact → expansion → damping →
   calm), normals and specular follow the moving surface, and the effect is readable from the third-person camera on a phone.
   ARCHITECTURE (the simplest robust one for our runtime — GPU, bounded, no per-frame allocations):
     · NEAR window: a square height-field simulation (ping-pong render targets, the classic 2-D wave stencil `h' = 2h − h_prev + c²∇²h`
       with damping) that follows the player (origin snapped to texels; the previous field is re-sampled with the window shift so ripples
       persist while the player moves). Impulses are gaussian splats added in the same pass (≤ 8 per step, pooled, overflow queued).
       A subdivided plane inside the window is displaced by the height texture in the vertex shader and shades with a normal derived
       from the height gradient (plus the procedural small-wave normal map); the far surface discards its fragments under the window.
     · MID / FAR: the existing single-quad surface with the drifting tileable normal map (cheap animated water).
     · TIERS: HIGH 256² / 48 m / 96² grid · MED 192² / 40 m / 64² · LOW 128² / 32 m / 48². Sim steps are fixed at 60 Hz (≤ 3 per frame).
   EVENT SOURCES: the player (wading impulses from speed while the feet are below the surface, a strong splat on landing), forest creatures
   in the water, the guides (a faint touch when they dip), and `impulse(x, z, strength, radius)` for anything later (projectiles / attacks
   are JOB A's — the hook only). A CPU ring model of the last impulses gives `heightAt(x, z)` for floating objects (waterObjects.js).
   Presentation only: no host state, no colliders, nothing outside ctx.group. */
export function createRipples(ctx, o) {
  var THREE = ctx.THREE, log = ctx.log || function () { }; var R = ctx.renderer; var opts = o || {};
  var rivers = opts.rivers || []; var surfaceY = rivers.length ? rivers[0].surface_y : 0; var far = opts.farMaterial || null;
  var tierName = (function () { try { var t = ctx.quality && ctx.quality.get ? ctx.quality.get() : null; return t && t.name ? String(t.name).toUpperCase() : (t && t.lod_far_m && t.lod_far_m < 200 ? 'LOW' : 'HIGH'); } catch (e) { return 'HIGH'; } })();
  var TIER = { HIGH: { n: 256, size: 48, seg: 96 }, MED: { n: 192, size: 40, seg: 64 }, LOW: { n: 128, size: 32, seg: 48 } }[tierName] || { n: 256, size: 48, seg: 96 };
  var N = TIER.n, SIZE = TIER.size, TEXEL = SIZE / N, MAX_IMP = 8, STEP = 1 / 60, MAX_STEPS = 3, C2 = 0.09, DAMP = 0.99, AMP = 0.07, NORMAL_K = 3.2, RING_C = 0.35 * TEXEL * 60 * Math.sqrt(C2 / 0.09) * 1.0;
  var enabled = !!(R && R.capabilities && R.capabilities.isWebGL2); var supported = enabled;
  var rts = [], cur = 0, simScene = null, simCam = null, simMat = null, quad = null, near = null, nearMat = null, group = null, built = false;
  var origin = new THREE.Vector2(0, 0), originPrev = new THREE.Vector2(0, 0), shift = new THREE.Vector2(0, 0), shift2 = new THREE.Vector2(0, 0), rtOrigin = [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()], acc = 0, clock = 0, steps = 0, stepsTotal = 0;
  var pending = [], impU = [], impCount = 0, recent = [], recentCap = 24, recentI = 0, stats = { impulses: 0, dropped: 0, steps: 0, active: false, in_water: false };
  for (var i = 0; i < MAX_IMP; i++) impU.push(new THREE.Vector4(0, 0, 0, 0));
  for (var k = 0; k < recentCap; k++) recent.push({ x: 0, z: 0, t0: -1e9, a: 0, r: 1 });
  var TMP = new THREE.Vector3(); var lastPlayer = { x: 0, z: 0, y: 0, t: -1, landed: -1, wade: 0 }; var creatureLast = {};
  var sea = null;   /* JOB B redirect 2026-09-19: the SEA as a second ripple body — { test(x, z), surface_y } registered by coast.js (fish breaches, flight landings and wading on the beach ring all ripple the sea too) */
  function inWater(x, z) { for (var i = 0; i < rivers.length; i++) { var r = rivers[i]; if (x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2) return r; } if (sea && sea.test(x, z)) return sea; return null; }
  function setSea(test, surface_y, mat) { sea = { test: test, surface_y: surface_y, sea: true, x1: -1e9, x2: 1e9, z1: -1e9, z2: 1e9 }; if (mat && enabled) holeMaterial(mat); }
  var holeMaterial = function () { };
  function snap(v) { return Math.round(v / TEXEL) * TEXEL; }

  var SIM_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  var SIM_FRAG = 'precision highp float; varying vec2 vUv; uniform sampler2D tH1; uniform sampler2D tH2; uniform vec2 uShift1; uniform vec2 uShift2; uniform float uTexel; uniform float uC2; uniform float uDamp; uniform vec4 uImp[' + MAX_IMP + ']; uniform int uImpN; uniform float uSize;\n' +
    'void main(){ vec2 uv = vUv + uShift1; vec2 uv2 = vUv + uShift2; float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(0.0, 0.08, vUv.y) * smoothstep(0.0, 0.08, 1.0 - vUv.x) * smoothstep(0.0, 0.08, 1.0 - vUv.y);\n' +
    ' float h1 = texture2D(tH1, uv).r; float h2 = texture2D(tH2, uv2).r; float l = texture2D(tH1, uv + vec2(-uTexel, 0.0)).r + texture2D(tH1, uv + vec2(uTexel, 0.0)).r + texture2D(tH1, uv + vec2(0.0, -uTexel)).r + texture2D(tH1, uv + vec2(0.0, uTexel)).r;\n' +
    ' float h = (2.0 * h1 - h2 + uC2 * (l - 4.0 * h1)) * uDamp;\n' +
    ' for (int i = 0; i < ' + MAX_IMP + '; i++) { if (i >= uImpN) break; vec2 d = (vUv - uImp[i].xy) * uSize; float r = max(0.05, uImp[i].z); float g = exp(-dot(d, d) / (r * r)); h -= uImp[i].w * g * (1.0 - 0.55 * smoothstep(0.35, 1.0, length(d) / r)); }\n' +
    ' h *= edge; gl_FragColor = vec4(h, 0.0, 0.0, 1.0); }';

  function makeRT() { var type = THREE.HalfFloatType; var rt = new THREE.WebGLRenderTarget(N, N, { type: type, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false }); rt.texture.wrapS = rt.texture.wrapT = THREE.ClampToEdgeWrapping; return rt; }
  function clearRT(rt) { var prev = R.getRenderTarget(); R.setRenderTarget(rt); R.setClearColor(0x000000, 1); R.clear(true, false, false); R.setRenderTarget(prev); }

  function build() {
    if (built) return; built = true;
    if (!rivers.length) { log('ripples: no rivers — inert'); enabled = false; return; }
    if (!enabled) { log('ripples: WebGL2 render targets unavailable — far water only'); return; }
    try {
      group = new THREE.Group(); group.name = 'MAHWORLD_WATER_NEAR'; group.userData.noMerge = true; ctx.group.add(group);
      rts = [makeRT(), makeRT(), makeRT()]; rts.forEach(clearRT);
      simScene = new THREE.Scene(); simCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      simMat = new THREE.ShaderMaterial({ vertexShader: SIM_VERT, fragmentShader: SIM_FRAG, uniforms: { tH1: { value: null }, tH2: { value: null }, uShift1: { value: shift }, uShift2: { value: shift2 }, uTexel: { value: 1 / N }, uC2: { value: C2 }, uDamp: { value: DAMP }, uImp: { value: impU }, uImpN: { value: 0 }, uSize: { value: SIZE } }, depthTest: false, depthWrite: false });
      quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMat); quad.frustumCulled = false; simScene.add(quad);
      /* the near surface: a subdivided plane displaced by the height field; material = the far water material's look + height / normal injection */
      var g = new THREE.PlaneGeometry(SIZE, SIZE, TIER.seg, TIER.seg); g.rotateX(-Math.PI / 2);
      nearMat = far ? far.clone() : new THREE.MeshStandardMaterial({ color: 0x1f4f7a, roughness: 0.12, metalness: 0.55, transparent: true, opacity: 0.86 });
      nearMat.onBeforeCompile = function (sh) {
        sh.uniforms.uHeight = { value: rts[cur].texture }; sh.uniforms.uOrigin = { value: origin }; sh.uniforms.uSize = { value: SIZE }; sh.uniforms.uAmp = { value: AMP }; sh.uniforms.uTexelUV = { value: 1 / N }; sh.uniforms.uNormalK = { value: NORMAL_K }; sh.uniforms.uTile = { value: opts.tileM || 7 }; nearMat.userData.shader = sh;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform sampler2D uHeight; uniform vec2 uOrigin; uniform float uSize; uniform float uAmp; uniform float uTile; varying vec2 vHuv;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz; vHuv = (wp0.xz - uOrigin) / uSize + 0.5; float hh = texture2D(uHeight, vHuv).r; transformed.y += hh * uAmp; }')
          .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_NORMALMAP\n{ vec3 wpu = (modelMatrix * vec4(position, 1.0)).xyz; vNormalMapUv = (normalMapTransform * vec3(wpu.xz / uTile, 1.0)).xy; }\n#endif');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uHeight; uniform float uTexelUV; uniform float uNormalK; uniform float uAmp; varying vec2 vHuv;')
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ float hl = texture2D(uHeight, vHuv - vec2(uTexelUV, 0.0)).r, hr = texture2D(uHeight, vHuv + vec2(uTexelUV, 0.0)).r, hd = texture2D(uHeight, vHuv - vec2(0.0, uTexelUV)).r, hu = texture2D(uHeight, vHuv + vec2(0.0, uTexelUV)).r; vec3 wn = vec3(-(hr - hl) * uNormalK, 0.0, -(hu - hd) * uNormalK); normal = normalize(normal + mat3(viewMatrix) * wn); }');
      };
      nearMat.customProgramCacheKey = function () { return 'mahworld_water_near'; };
      near = new THREE.Mesh(g, nearMat); near.name = 'WATER_NEAR'; near.frustumCulled = false; near.renderOrder = 2; near.receiveShadow = false; near.position.set(0, surfaceY + 0.004, 0); group.add(near);
      /* the far surface discards under the window (no double surface, no z-fight) */
      holeMaterial = function (far) { far.onBeforeCompile = function (sh) { sh.uniforms.uOrigin = { value: origin }; sh.uniforms.uHalf = { value: SIZE / 2 - TEXEL }; far.userData.shader = sh;
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;').replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vWxz = (modelMatrix * vec4(position, 1.0)).xz; }');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec2 uOrigin; uniform float uHalf; varying vec2 vWxz;').replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n{ vec2 dd = abs(vWxz - uOrigin); if (dd.x < uHalf && dd.y < uHalf) discard; }'); };
        far.customProgramCacheKey = function () { return 'mahworld_water_far_hole'; }; far.needsUpdate = true; };
      if (far) holeMaterial(far);
      var p0 = ctx.playerPos(); origin.set(snap(p0.x), snap(p0.z)); originPrev.copy(origin); rtOrigin.forEach(function (v) { v.copy(origin); }); near.position.x = origin.x; near.position.z = origin.y;
      stats.active = true; log('ripples: NEAR window ' + SIZE + ' m / ' + N + '² / ' + TIER.seg + '² grid (' + tierName + '), 60 Hz stencil c² ' + C2 + ' damp ' + DAMP);
    } catch (e) { enabled = false; stats.error = String(e && e.message || e); log('ripples: build failed (' + stats.error + ') — far water only'); }
  }

  /* ---- impulses (pooled: the queue is drained ≤ MAX_IMP per sim step) ---- */
  function impulse(x, z, strength, radius) { if (!enabled) return false; if (!inWater(x, z)) return false; if (pending.length >= 64) { stats.dropped++; return false; } pending.push({ x: x, z: z, a: Math.max(0.005, Math.min(1.2, strength || 0.2)), r: Math.max(0.15, Math.min(6, radius || 0.6)) }); stats.impulses++;
    var rc = recent[recentI]; rc.x = x; rc.z = z; rc.t0 = clock; rc.a = Math.max(0.005, Math.min(1.2, strength || 0.2)); rc.r = Math.max(0.15, Math.min(6, radius || 0.6)); recentI = (recentI + 1) % recentCap; return true; }
  /* the CPU ring model (floating objects read this; an approximation of the field, cheap) */
  function heightAt(x, z) { var h = 0; for (var i = 0; i < recentCap; i++) { var rc = recent[i]; var age = clock - rc.t0; if (age < 0 || age > 6) continue; var d = Math.hypot(x - rc.x, z - rc.z); var front = RING_C * age; var w = 0.45 + 0.25 * age; var env = Math.exp(-age * 0.9) * rc.a * AMP; var ring = Math.exp(-((d - front) * (d - front)) / (2 * w * w)) * Math.cos((d - front) * 3.2); h += env * ring * (d < front + 2 * w ? 1 : 0); } h += 0.012 * Math.sin(clock * 1.7 + x * 0.6) + 0.008 * Math.sin(clock * 1.1 + z * 0.9); return h; }

  /* ---- event sources: the player, the creatures, the guides ---- */
  function sources(dt) {
    var p = ctx.snapshot(); var pp = ctx.playerPos(); var now = clock;
    var riv = inWater(pp.x, pp.z); var sy = riv && riv.surface_y !== undefined ? riv.surface_y : surfaceY; var alt = p && p.flight ? p.flight.altitude : pp.y; var below = riv && alt < sy + 0.05; stats.in_water = !!below;
    if (p && p.flight) { if (lastPlayer.landed >= 0 && p.flight.landed_count > lastPlayer.landed && riv && alt < sy + 0.3) impulse(pp.x, pp.z, 0.6, 1.4); lastPlayer.landed = p.flight.landed_count; }
    if (below) { var spd = p && typeof p.speed_mps === 'number' ? p.speed_mps : Math.hypot(pp.x - lastPlayer.x, pp.z - lastPlayer.z) / Math.max(1e-3, dt); lastPlayer.wade += dt; var every = spd > 0.3 ? Math.max(0.08, 0.32 / (1 + spd * 0.5)) : 0.9; if (lastPlayer.wade >= every) { lastPlayer.wade = 0; impulse(pp.x, pp.z, spd > 0.3 ? 0.04 + 0.03 * Math.min(6, spd) : 0.015, spd > 0.3 ? 0.45 + 0.06 * Math.min(6, spd) : 0.35); } } else lastPlayer.wade = 0.5;
    lastPlayer.x = pp.x; lastPlayer.z = pp.z; lastPlayer.y = alt;
    if (p && p.creatures) for (var i = 0; i < p.creatures.length; i++) { var c = p.creatures[i]; if (!c || !c.position) continue; if (!inWater(c.position.x, c.position.z)) continue; var st = creatureLast[c.id] || (creatureLast[c.id] = { t: 0 }); st.t += dt; var sp = c.speed_mps || 0; if (st.t > (sp > 0.3 ? 0.22 : 1.2)) { st.t = 0; impulse(c.position.x, c.position.z, sp > 0.3 ? 0.05 + 0.04 * Math.min(5, sp) : 0.02, 0.4); } }
  }

  function step() {
    /* window follow (snapped to texels) + shift of the previous field */
    var pp = ctx.playerPos(); var ox = snap(pp.x), oz = snap(pp.z); if (Math.abs(ox - origin.x) > SIZE * 0.5 || Math.abs(oz - origin.y) > SIZE * 0.5) { rts.forEach(clearRT); rtOrigin.forEach(function (v) { v.set(ox, oz); }); }   /* a jump (teleport / room change) resets the field */
    origin.set(ox, oz); near.position.x = ox; near.position.z = oz; var o1 = rtOrigin[cur], o2 = rtOrigin[(cur + 2) % 3]; shift.set((ox - o1.x) / SIZE, (oz - o1.y) / SIZE); shift2.set((ox - o2.x) / SIZE, (oz - o2.y) / SIZE); rtOrigin[(cur + 1) % 3].set(ox, oz);   /* each field remembers the window origin it was written with; the previous two are re-sampled with their own shift */
    var n = 0; while (n < MAX_IMP && pending.length) { var im = pending.shift(); impU[n].set((im.x - ox) / SIZE + 0.5, (im.z - oz) / SIZE + 0.5, im.r, im.a); n++; }
    var h1 = rts[cur], h2 = rts[(cur + 2) % 3], out = rts[(cur + 1) % 3];
    simMat.uniforms.tH1.value = h1.texture; simMat.uniforms.tH2.value = h2.texture; simMat.uniforms.uImpN.value = n;
    var prev = R.getRenderTarget(); var xr = R.xr ? R.xr.enabled : false; if (R.xr) R.xr.enabled = false; var ac = R.autoClear; R.autoClear = false; R.setRenderTarget(out); R.render(simScene, simCam); R.setRenderTarget(prev); R.autoClear = ac; if (R.xr) R.xr.enabled = xr;
    cur = (cur + 1) % 3; var sh = nearMat.userData.shader; if (sh) sh.uniforms.uHeight.value = rts[cur].texture; steps++; stepsTotal++;
  }
  function tick(dt, t) {
    clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0); if (!enabled || !near) return;
    var dd = Math.min(0.1, Math.max(0, dt || 0)); sources(dd);
    /* budget: simulate only when the player is within reach of the water (the field keeps its state when paused) */
    var pp = ctx.playerPos(); var nearWater = false; var bodyY = surfaceY; for (var i = 0; i < rivers.length; i++) { var r = rivers[i]; if (pp.x > r.x1 - SIZE && pp.x < r.x2 + SIZE && pp.z > r.z1 - SIZE && pp.z < r.z2 + SIZE) nearWater = true; }
    if (!nearWater && sea && sea.test(pp.x, pp.z)) { nearWater = true; bodyY = sea.surface_y; } near.position.y = bodyY + 0.004;
    near.visible = nearWater; if (!nearWater) { acc = 0; stats.active = false; return; } stats.active = true;
    acc += dd; steps = 0; while (acc >= STEP && steps < MAX_STEPS) { acc -= STEP; step(); } if (acc > STEP * 4) acc = 0; stats.steps = stepsTotal;
  }
  function setNight(n) { if (nearMat && far) { nearMat.color.copy(far.color); nearMat.roughness = far.roughness; nearMat.envMapIntensity = far.envMapIntensity; nearMat.opacity = far.opacity; } }
  function dispose() { rts.forEach(function (rt) { rt.dispose(); }); rts = []; if (near) { if (near.parent) near.parent.remove(near); near.geometry.dispose(); } if (nearMat) nearMat.dispose(); if (quad) quad.geometry.dispose(); if (simMat) simMat.dispose(); if (group && group.parent) group.parent.remove(group); near = null; group = null; }
  function debug() { return { supported: supported, enabled: enabled, tier: tierName, n: N, size_m: SIZE, grid: TIER.seg, texel_m: +TEXEL.toFixed(3), c2: C2, damp: DAMP, amp_m: AMP, ring_speed_mps: +RING_C.toFixed(2), impulses: stats.impulses, dropped: stats.dropped, steps: stats.steps, active: stats.active, in_water: stats.in_water, pending: pending.length, origin: [origin.x, origin.y], error: stats.error || null }; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug, impulse: impulse, heightAt: heightAt, inWater: inWater, setSea: setSea, surfaceY: function () { return surfaceY; } };
}
