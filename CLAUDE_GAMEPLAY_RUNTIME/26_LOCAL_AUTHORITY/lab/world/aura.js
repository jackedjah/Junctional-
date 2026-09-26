/* MAHWORLD M12 :: SPECTRAL AURA (owner pivot 2026-09-26: "aura / magic energy language").
   One restrained, prismatic energy language for the whole world: a soft bloom in the owner's class tint, crossed by a thin spectral
   interference ring and faint concentric fringes that drift slowly — violet → ice blue → white → gold → pink. It sits AROUND powerful
   things (landmarks, energy architecture, crystal crowns, the Veil Falls mist, selected sky moments), never as a colour wash over the map.
   Colour law: every stop is a class-family colour (violet = VISIONARY purple, ice blue = the TITAN blue family's light end, gold = ATHLETE,
   pink = BAGE) or neutral white; the gradient passes through white between ice blue and gold, so no blend reaches green or teal.
   Cost: every aura in a field is one instanced, camera-facing quad in ONE draw call (additive, no depth write, depth-tested so a building
   hides the part of its own aura behind its silhouette — the light reads as emanating from around it). Day is restrained, night stronger.
   LOW tier keeps the bloom and drops the fringes. */

export var SPECTRAL = { violet: 0xb48cff, ice: 0x7fd0ff, white: 0xf4f6ff, gold: 0xffd88a, pink: 0xff9ad2 };
export var CLASS_TINT = { gold: 0xe6c36a, blue: 0x5a8cf0, purple: 0x9a78e0, pink: 0xf08ab8, red: 0xd4344a, white: 0xf4f6ff };

var VERT = [
  'attribute vec3 aP; attribute vec4 aS; attribute vec3 aC; attribute vec4 aK; attribute vec3 aX;',
  'varying vec2 vUv; varying vec3 vC; varying vec4 vK; varying vec4 vS; varying vec3 vX;',
  'void main() { vUv = position.xy; vC = aC; vK = aK; vS = aS; vX = aX;',
  '  vec4 mv = viewMatrix * vec4(aP, 1.0);',
  '  float s = aS.x; mv.xy += position.xy * vec2(s, s * aS.y);',   /* camera-facing quad; aS.y stretches it vertically (columns, falls) */
  '  mv.z += aS.w;',                                                 /* pull toward the camera (m) so a halo is not cut by its own emitter */
  '  gl_Position = projectionMatrix * mv; }'
].join('\n');

var FRAG = [
  'uniform float uTime; uniform float uGlobal; uniform float uFringe; uniform float uNight;',
  'varying vec2 vUv; varying vec3 vC; varying vec4 vK; varying vec4 vS; varying vec3 vX;',
  'float auH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
  'float auN(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(auH(vec2(i, 1.7)), auH(vec2(i + 1.0, 1.7)), f); }',
  'vec3 spectral(float t) { t = fract(t);',   /* violet → ice → white → gold → pink → violet */
  '  vec3 v = vec3(0.706, 0.549, 1.0), i = vec3(0.498, 0.816, 1.0), w = vec3(0.957, 0.965, 1.0), g = vec3(1.0, 0.847, 0.541), p = vec3(1.0, 0.604, 0.824);',
  '  if (t < 0.2) return mix(v, i, t / 0.2); if (t < 0.4) return mix(i, w, (t - 0.2) / 0.2); if (t < 0.6) return mix(w, g, (t - 0.4) / 0.2);',
  '  if (t < 0.8) return mix(g, p, (t - 0.6) / 0.2); return mix(p, v, (t - 0.8) / 0.2); }',
  'void main() { float r = length(vUv); if (r > 1.0) discard;',
  '  float ang = atan(vUv.y, vUv.x), ph = vK.z, t = uTime;',
  '  float bloom = pow(1.0 - r, 2.4) * (0.85 + 0.15 * sin(t * 0.7 + ph));',   /* soft core, a slow breath */
  '  float ringR = vS.z, ringW = max(0.02, vK.w);',
  '  float rr = (r - ringR) / ringW; float band = exp(-rr * rr * 1.4) * step(0.001, ringR);',
  '  float arc = vX.x > 0.5 ? smoothstep(-0.05, 0.45, vUv.y / max(r, 1e-3)) : 1.0;',   /* 1 = an upper arc only (a mist-bow), never a full UI circle */
  '  float brk = mix(1.0, smoothstep(0.25, 0.85, auN(ang * 2.6 + ph * 3.0 + t * 0.04) * 0.7 + auN(ang * 7.0 - t * 0.07) * 0.3), vX.y);',   /* the ring breaks into soft arcs */
  '  float shimmer = 0.78 + 0.22 * sin(ang * 5.0 + t * 0.45 + ph) * sin(ang * 3.0 - t * 0.31 + ph * 1.7);',
  '  vec3 sp = mix(spectral(rr * 0.22 + 0.5 + 0.04 * sin(t * 0.2 + ph)), vec3(1.0), 0.3);',   /* spectral, but pearl-soft */
  '  vec3 col = vC * bloom + sp * band * vK.y * shimmer * arc * brk;',
  '  col += spectral(r * 2.6 - t * 0.035 + ph) * bloom * 0.22 * vK.y * uFringe;',   /* faint interference fringes inside the bloom */
  '  float edge = 1.0 - smoothstep(0.86, 1.0, r);',
  '  gl_FragColor = vec4(col * vK.x * uGlobal * mix(1.0, vX.z, uNight) * edge, 1.0); }'
].join('\n');

/* items: [{ x, y, z, size (m, quad half-extent), aspect (vertical stretch, 1 = round), ring (0..1 ring radius as a fraction of the quad; 0 =
   no ring), ringW (ring half-width as a fraction), tint (hex, the bloom colour), spectral (0..1 ring / fringe strength), intensity (day
   brightness, ~0.2–1), pull (m toward the camera), phase }]. Returns { mesh, uniforms, setNight(n), tick(t), count }. */
/* extra per item: arc (1 = upper arc only), breakup (0..1, the ring dissolves into soft arcs; default 0.75), nightK (night brightness factor; default 1) */
export function createAuraField(THREE, items, opts) {
  opts = opts || {}; var n = items.length; if (!n) return null;
  var base = new THREE.PlaneGeometry(2, 2); var g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.instanceCount = n;
  var P = new Float32Array(n * 3), S = new Float32Array(n * 4), C = new Float32Array(n * 3), K = new Float32Array(n * 4), X = new Float32Array(n * 3), col = new THREE.Color();
  items.forEach(function (it, i) { P[i * 3] = it.x; P[i * 3 + 1] = it.y; P[i * 3 + 2] = it.z;
    S[i * 4] = it.size || 10; S[i * 4 + 1] = it.aspect || 1; S[i * 4 + 2] = it.ring === undefined ? 0.62 : it.ring; S[i * 4 + 3] = it.pull || 0;
    col.set(it.tint === undefined ? SPECTRAL.white : it.tint); C[i * 3] = col.r; C[i * 3 + 1] = col.g; C[i * 3 + 2] = col.b;
    K[i * 4] = it.intensity === undefined ? 0.5 : it.intensity; K[i * 4 + 1] = it.spectral === undefined ? 0.6 : it.spectral; K[i * 4 + 2] = it.phase === undefined ? i * 1.37 : it.phase; K[i * 4 + 3] = it.ringW === undefined ? 0.06 : it.ringW; X[i * 3] = it.arc ? 1 : 0; X[i * 3 + 1] = it.breakup === undefined ? 0.75 : it.breakup; X[i * 3 + 2] = it.nightK === undefined ? 1 : it.nightK; });
  g.setAttribute('aP', new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute('aS', new THREE.InstancedBufferAttribute(S, 4)); g.setAttribute('aC', new THREE.InstancedBufferAttribute(C, 3)); g.setAttribute('aK', new THREE.InstancedBufferAttribute(K, 4)); g.setAttribute('aX', new THREE.InstancedBufferAttribute(X, 3));
  var day = opts.day === undefined ? 0.55 : opts.day, nightK = opts.night === undefined ? 1.0 : opts.night;
  var uniforms = { uTime: { value: 0 }, uGlobal: { value: opts.isNight ? nightK : day }, uFringe: { value: opts.tier === 'LOW' ? 0 : 1 }, uNight: { value: opts.isNight ? 1 : 0 } };
  var mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, toneMapped: false });
  var mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = opts.renderOrder === undefined ? 12 : opts.renderOrder; mesh.name = opts.name || 'SPECTRAL_AURA'; mesh.userData.noMerge = true;
  base.dispose();
  return { mesh: mesh, uniforms: uniforms, count: n, positions: g.attributes.aP,
    setNight: function (nn) { uniforms.uGlobal.value = nn ? nightK : day; uniforms.uNight.value = nn ? 1 : 0; },
    tick: function (t) { uniforms.uTime.value = t || 0; },
    dispose: function () { g.dispose(); mat.dispose(); } };
}

/* A world module: other modules push aura requests into ctx.auraRequests during their build; this module (built after them) turns every
   request into one field. Requests may carry a `follow` function returning [x, y, z] (re-read each tick, e.g. a sky phenomenon). */
export function createAura(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }; var field = null, night = !!ctx.night, followers = [];
  function tier() { try { return ctx.quality && ctx.quality.tier ? String(ctx.quality.tier()).toUpperCase() : 'HIGH'; } catch (e) { return 'HIGH'; } }
  function build() { var req = ctx.auraRequests || []; if (!req.length) { log('aura: no requests'); return; }
    field = createAuraField(THREE, req, { isNight: night, tier: tier(), name: 'WORLD_SPECTRAL_AURA' }); if (!field) return; ctx.group.add(field.mesh);
    req.forEach(function (r, i) { if (typeof r.follow === 'function') followers.push({ i: i, fn: r.follow, fade: r.fade || null, base: r.intensity === undefined ? 0.5 : r.intensity }); });
    log('aura: ' + req.length + ' spectral auras in one draw (' + followers.length + ' following)'); }
  function tick(dt, t) { if (!field) return; field.tick(t); if (!followers.length) return; var P = field.positions, K = field.mesh.geometry.attributes.aK;
    for (var i = 0; i < followers.length; i++) { var F = followers[i], p = F.fn(t); if (p) { P.setXYZ(F.i, p[0], p[1], p[2]); } if (F.fade) K.setX(F.i, F.base * F.fade(t)); }
    P.needsUpdate = true; K.needsUpdate = true; }
  function setNight(n) { night = !!n; if (field) field.setNight(night); }
  function dispose() { if (field) { if (field.mesh.parent) field.mesh.parent.remove(field.mesh); field.dispose(); field = null; } }
  function debug() { return { count: field ? field.count : 0, following: followers.length }; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug };
}
