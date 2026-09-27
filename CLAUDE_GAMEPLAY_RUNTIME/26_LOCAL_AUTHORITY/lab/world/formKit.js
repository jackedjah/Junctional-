/* MAHWORLD :: FORM KIT — the character roster's design DNA for the procedural world (owner "design-language correction", 2026-09-26).
   The roster (ATHLETE / VISIONARY S2 reviews) reads as: lacquered class-colour plates with a deep clear-coat highlight over dark graphite,
   plates split by recessed seams that follow the form's flow, polished ORB joints at every articulation, limbs that TAPER to a white-hot
   energy TIP, and no raw hard edge anywhere — every shape is rolled, filleted or tapered. These helpers give the world that vocabulary so a
   bollard, a mast, a slab or a spire is built the way the characters are.
   Pure geometry / material factories: no scene access; every geometry is centred like its three.js primitive so it can replace one in place.
   Tier: pass 'LOW' to get cheaper segments and MeshStandard instead of the clear-coat MeshPhysical. */

/* A filleted box: w × h × d with every edge rolled at radius r (vertical corners rounded in plan, top and bottom edges bevelled round).
   Centred at the origin like BoxGeometry(w, h, d). */
export function softBox(THREE, w, h, d, r, tier) {
  var R = Math.max(0.005, Math.min(r, w / 2 - 0.001, d / 2 - 0.001, h / 2 - 0.001)), b = Math.min(R, h / 4), LOW = tier === 'LOW';
  var iw = w / 2 - b, id = d / 2 - b, ir = Math.max(0.0005, R - b), s = new THREE.Shape();
  s.moveTo(-iw + ir, -id); s.lineTo(iw - ir, -id); s.quadraticCurveTo(iw, -id, iw, -id + ir); s.lineTo(iw, id - ir); s.quadraticCurveTo(iw, id, iw - ir, id);
  s.lineTo(-iw + ir, id); s.quadraticCurveTo(-iw, id, -iw, id - ir); s.lineTo(-iw, -id + ir); s.quadraticCurveTo(-iw, -id, -iw + ir, -id);
  var g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, h - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: LOW ? 1 : 3, curveSegments: LOW ? 2 : 4 });
  g.rotateX(-Math.PI / 2); g.translate(0, -(h - 2 * b) / 2, 0); g.computeVertexNormals(); return g;
}

/* A tapered shaft (lathe): a rolled foot, a gently swelling body that narrows from rBot to rTop, a rolled shoulder. Base at y = 0. */
export function taperShaft(THREE, rBot, rTop, h, tier, opts) {
  opts = opts || {}; var LOW = tier === 'LOW', MED = tier === 'MED', pts = [], N = opts.rows || (LOW ? 8 : (MED ? 10 : 16)), flare = opts.flare === undefined ? 1.18 : opts.flare, foot = flare > 1 ? Math.min(h * 0.08, rBot * 1.2) : 0, belly = opts.belly === undefined ? 0.06 : opts.belly;   /* flare ≤ 1: no foot (the shaft sits on something else); widest point = max(rBot·flare, rBot·(1 + belly)) */
  pts.push(new THREE.Vector2(0.0001, 0)); if (foot > 0) { pts.push(new THREE.Vector2(rBot * flare, 0)); pts.push(new THREE.Vector2(rBot * (1 + (flare - 1) * 0.66), foot * 0.45)); } pts.push(new THREE.Vector2(rBot, foot));
  for (var i = 1; i <= N; i++) { var t = i / N, r = rBot + (rTop - rBot) * Math.pow(t, 0.85) + Math.sin(t * Math.PI) * belly * rBot; pts.push(new THREE.Vector2(Math.max(0.001, r), foot + (h - foot) * t)); }
  pts.push(new THREE.Vector2(0.0001, h + rTop * 0.35));
  var g = new THREE.LatheGeometry(pts, opts.radial ? (LOW ? Math.min(opts.radial, 8) : opts.radial) : (LOW ? 8 : (MED ? 12 : 16))); g.computeVertexNormals(); return g;
}

/* A polished orb joint (the roster's knee / shoulder spheres). Centred at the origin. */
export function orb(THREE, r, tier, seg) { var n = seg || (tier === 'LOW' ? 10 : (tier === 'MED' ? 12 : 18)); return new THREE.SphereGeometry(r, n, Math.max(4, Math.round(n * 0.66))); }   /* seg: an explicit budget for instanced / repeated joints */

/* A white-hot ENERGY TIP (the roster's tapered feet): a concave taper from radius r at its root to a point h above, vertex-coloured from
   the class colour at the root through a hot core to white at the point. Base at y = 0. Pair with tipMaterial(). */
export function energyTip(THREE, r, h, hex, tier) {
  var LOW = tier === 'LOW', pts = [], N = LOW ? 6 : (tier === 'MED' ? 8 : 12);
  for (var i = 0; i <= N; i++) { var t = i / N, rr = r * Math.pow(1 - t, 1.7) * (1 + 0.12 * Math.sin(t * Math.PI)); pts.push(new THREE.Vector2(Math.max(0.0005, rr), h * t)); }
  var g = new THREE.LatheGeometry(pts, LOW ? 8 : (tier === 'MED' ? 10 : 14)), n = g.attributes.position.count, c = new Float32Array(n * 3), base = new THREE.Color(hex), white = new THREE.Color(0xffffff), tmp = new THREE.Color();
  for (var k = 0; k < n; k++) { var y = g.attributes.position.getY(k) / h, w = Math.pow(Math.max(0, Math.min(1, y)), 0.7); tmp.copy(base).lerp(white, w); var gl = 0.9 + 1.4 * w; c[k * 3] = tmp.r * gl; c[k * 3 + 1] = tmp.g * gl; c[k * 3 + 2] = tmp.b * gl; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
/* the tip's glow: unlit vertex colour, not tone-mapped, so the point burns white and the root keeps its class colour */
export function tipMaterial(THREE) { return new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.95, depthWrite: true }); }

/* Character-native surfaces. lacquer: a class-colour (or platinum) plate with a deep clear-coat highlight, like the roster's armour.
   graphite: the dark satin ground the plates sit on and the recessed seams between them. satin: honed neutral stone / metal. */
export function lacquer(THREE, hex, tier, opts) {
  opts = opts || {};
  if (tier === 'LOW') return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.24, metalness: opts.metalness === undefined ? 0.55 : opts.metalness, envMapIntensity: 1.0 });
  return new THREE.MeshPhysicalMaterial({ color: hex, roughness: opts.roughness === undefined ? 0.32 : opts.roughness, metalness: opts.metalness === undefined ? 0.5 : opts.metalness, clearcoat: 1.0, clearcoatRoughness: 0.07, envMapIntensity: 1.05 });
}
export function graphite(THREE) { return new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.5, metalness: 0.55, envMapIntensity: 0.7 }); }
export function satin(THREE, hex, tier) {
  if (tier === 'LOW') return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.42, metalness: 0.2 });
  return new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.46, metalness: 0.18, clearcoat: 0.35, clearcoatRoughness: 0.28, envMapIntensity: 0.8 });
}

/* Give an existing MeshStandardMaterial the roster's lacquer layer: the same colour / roughness / metalness under a clear coat (cc strength,
   ccr its roughness). Returns a MeshPhysicalMaterial copy, or the material itself on LOW (no clear-coat cost on phones' lowest tier).
   Call it BEFORE surface shaders are attached (onBeforeCompile is not copied). */
export function toLacquer(THREE, m, cc, ccr, tier) {
  if (!m || tier === 'LOW' || m.isMeshPhysicalMaterial) return m;
  var p = new THREE.MeshPhysicalMaterial(); THREE.MeshStandardMaterial.prototype.copy.call(p, m); p.defines = { STANDARD: '', PHYSICAL: '' };
  p.clearcoat = cc; p.clearcoatRoughness = ccr; p.name = m.name; m.dispose(); return p;
}

/* A tapered LIGHT PLUME material (the owner's "soft aura drift, tapered light trails — no harsh beams"): for an open, tapered, instanced
   column with uv.y rising 0 → 1. White at the root, the instance colour higher up, a soft silhouette (the rim fades by facing ratio), soft
   bands drifting slowly upward and a slow breath. Additive; drive uniforms.uTime and uniforms.uOp. */
export function plumeMaterial(THREE, op) {
  return new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uOp: { value: op === undefined ? 0.5 : op } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; varying vec3 vCol; varying float vFace;\nvoid main() { vUv = uv; vCol = vec3(1.0);\n#ifdef USE_INSTANCING_COLOR\n vCol = instanceColor;\n#endif\n mat4 mm = modelMatrix;\n#ifdef USE_INSTANCING\n mm = modelMatrix * instanceMatrix;\n#endif\n vec4 wp = mm * vec4(position, 1.0); vec3 wn = normalize(mat3(mm) * normal); vFace = abs(dot(wn, normalize(cameraPosition - wp.xyz))); gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: 'uniform float uTime; uniform float uOp; varying vec2 vUv; varying vec3 vCol; varying float vFace;\nvoid main() { float up = vUv.y, soft = pow(vFace, 1.7), fade = (1.0 - smoothstep(0.5, 1.0, up)) * smoothstep(0.0, 0.05, up);\n float drift = 0.72 + 0.28 * sin((up * 5.0 - uTime * 0.12) * 6.2831853), breath = 0.86 + 0.14 * sin(uTime * 0.55);\n vec3 c = mix(vCol, vec3(1.0), 0.45 * (1.0 - smoothstep(0.0, 0.45, up)));\n gl_FragColor = vec4(c * soft * fade * drift * breath * uOp, 1.0); }' });
}
