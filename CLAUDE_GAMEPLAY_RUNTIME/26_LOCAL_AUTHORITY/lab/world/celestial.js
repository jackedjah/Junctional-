/* MAHWORLD M5 OWNER CORRECTION :: CELESTIAL
   The Moon is the existing MAHWORLD_OVERSIZED_MOON derivative scene whose sidecar/registry lineage points to
   the bounded Moon source recorded in the world registry. Runtime never loads that 1.98 M-triangle source and never substitutes a
   procedural sphere for it. Both bodies keep a stable world direction while their sky-space origin follows the camera, so travel
   cannot make them approach. sky.js supplies one optical cloud state which attenuates disc, halo, rays and the real field key.
   World pivot PASS 1 (owner sky direction 2026-09-25): the Moon may stay visible in DAYLIGHT (registry moon.day_visible) as a very large,
   softly luminous lavender body (tint / emissive / day+night glow scales from the registry); it still drives the key light only at night.
   The Sun disc is over-bright and untonemapped so it reads as a light source, with a wide warm glow. */

export function celestialDirection(spec, kind) {
  spec = spec || {};
  var x, y, z;
  if (kind === 'sun') {
    var d = Array.isArray(spec.direction) && spec.direction.length === 3 ? spec.direction : [26, 19, 14];
    x = +d[0] || 0; y = +d[1] || 0; z = +d[2] || 0;
  } else {
    var yaw = isFinite(+spec.yaw_rad) ? +spec.yaw_rad : 0.35;
    var el = isFinite(+spec.elevation_rad) ? +spec.elevation_rad : 0.28;
    x = -Math.sin(yaw) * Math.cos(el); y = Math.sin(el); z = -Math.cos(yaw) * Math.cos(el);
  }
  var n = Math.hypot(x, y, z) || 1;
  return [x / n, y / n, z / n];
}

function smooth01(v) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }

/* Shared by the camera-facing celestial veil and the world cloud sheets.  The outline is
   a low, old-soft cloud bank: long shoulders, a calmer bottom shelf and uneven upper lobes.
   It remains one tiny fan (not a rectangular card), with the matching feather sampled by
   cloudEdgeAlpha; world/celestial callers provide the final horizontal aspect ratio. */
export function cloudShapeRadius(angle, seed) {
  var s = (seed >>> 0) || 1, p0 = (s % 997) / 997 * Math.PI * 2, p1 = ((s >>> 8) % 991) / 991 * Math.PI * 2, p2 = ((s >>> 16) % 983) / 983 * Math.PI * 2;
  var upper = Math.max(0, Math.sin(angle)); var lower = Math.max(0, -Math.sin(angle)); var lobe = 0.055 * Math.sin(angle * 4 + p0) + 0.035 * Math.sin(angle * 7 + p1) + 0.018 * Math.cos(angle * 11 + p2);
  return Math.max(0.76, Math.min(1.02, 0.9 + lobe * (0.55 + upper * 0.75) - lower * 0.055));
}

export function cloudEdgeAlpha(u, v, seed) {
  var x = (u - 0.5) * 2, y = (v - 0.5) * 2, radial = Math.hypot(x, y);
  if (radial < 1e-6) return 1;
  var boundary = cloudShapeRadius(Math.atan2(y, x), seed), feather = (radial - boundary * 0.68) / Math.max(1e-6, boundary * 0.3);
  return 1 - smooth01(feather);
}

export function createCloudGeometry(THREE, seed, segments) {
  segments = Math.max(18, Math.round(segments || 28)); var pos = [0, 0, 0], uv = [0.5, 0.5], idx = [], lo = 1, hi = 0;
  for (var i = 0; i <= segments; i++) { var a = i / segments * Math.PI * 2, rr = cloudShapeRadius(a, seed), r = rr * 0.5, x = Math.cos(a) * r, y = Math.sin(a) * r; pos.push(x, y, 0); uv.push(x + 0.5, y + 0.5); lo = Math.min(lo, rr); hi = Math.max(hi, rr); if (i < segments) idx.push(0, i + 1, i + 2); }
  var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); g.userData.cloudSilhouette = { kind: 'IRREGULAR_RADIAL_FAN', rectangular: false, feathered: true, segments: segments, radius_min: +lo.toFixed(4), radius_max: +hi.toFixed(4), seed: seed >>> 0 }; return g;
}

export function createCelestial(ctx) {
  var THREE = ctx.THREE; var log = ctx.log || function () { };
  var SPIN_RAD_S = 0.012;
  var SKY_RENDER_ORDER = -8;
  var FACET_BRIGHT = [0.86, 1.0];
  var bodies = []; var ownedTextures = []; var shared = { planeGeo: null, cloudGeo: null, cloudMask: null }; var built = false; var generation = 0; var night = !!ctx.night;
  var cloudStates = { sun: null, moon: null };

  function clamp01(v) { return Math.max(0, Math.min(1, isFinite(v) ? v : 1)); }
  function ownTexture(t) { if (t && ownedTextures.indexOf(t) < 0) ownedTextures.push(t); return t; }
  function apparentDiameter(dist, deg) { return 2 * dist * Math.tan(deg * Math.PI / 360); }
  function derivativeInfo(id) { var list = ctx.registry && ctx.registry.derivatives; if (!Array.isArray(list)) return null; for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i]; return null; }
  function sourceInfo(id) { var list = ctx.registry && ctx.registry.sources; if (!Array.isArray(list)) return null; for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i]; return null; }
  function runtimeInfo(id, lod) { var d = derivativeInfo(id); var f = d && d.files && (d.files[lod] || d.files.L0 || d.files.L1); return f ? { derivative: d, file: f, lod: d.files[lod] ? lod : (d.files.L0 === f ? 'L0' : 'L1'), source: sourceInfo(d.source) } : null; }
  function findMaps(gltf) { var out = { map: null, normalMap: null }; if (!gltf || !gltf.scene) return out; gltf.scene.traverse(function (o) { var ml = o.isMesh ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (var i = 0; i < ml.length; i++) { var m = ml[i]; if (!m) continue; if (!out.map && m.map) out.map = m.map; if (!out.normalMap && m.normalMap) out.normalMap = m.normalMap; } }); return out; }
  function disposeLoaded(gltf) { if (!gltf || !gltf.scene) return; if (ctx.disposeRoot) { ctx.disposeRoot(gltf.scene); return; } gltf.scene.traverse(function (o) { if (o.geometry) try { o.geometry.dispose(); } catch (e) { } var ml = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []); ml.forEach(function (m) { try { m.dispose(); } catch (e) { } }); }); }
  function prepTexture(t, colorData) { if (!t) return t; if (colorData && t.colorSpace !== undefined && !t.colorSpace) t.colorSpace = THREE.SRGBColorSpace; if (t.anisotropy < 4) t.anisotropy = 4; return t; }
  function radialTex(size, stops) {
    if (typeof document === 'undefined') return null;
    var c = document.createElement('canvas'); c.width = size; c.height = size; var g = c.getContext('2d'); g.clearRect(0, 0, size, size);
    var gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); }); g.fillStyle = gr; g.fillRect(0, 0, size, size);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return ownTexture(t);
  }
  function rayTex(size, tint) {
    if (typeof document === 'undefined') return null;
    var c = document.createElement('canvas'); c.width = size; c.height = size; var g = c.getContext('2d'); var cx = size / 2, cy = size / 2; g.clearRect(0, 0, size, size);
    g.save(); g.translate(cx, cy); for (var i = 0; i < 18; i++) { var a = i * Math.PI * 2 / 18 + (i % 3) * 0.037, inner = size * (0.08 + (i % 2) * 0.025), outer = size * (0.31 + (i % 5) * 0.018), half = 0.018 + (i % 4) * 0.004; var gr = g.createLinearGradient(inner, 0, outer, 0); gr.addColorStop(0, tint[0]); gr.addColorStop(0.55, tint[1]); gr.addColorStop(1, tint[2]); g.fillStyle = gr; g.beginPath(); g.moveTo(Math.cos(a - half) * inner, Math.sin(a - half) * inner); g.lineTo(Math.cos(a) * outer, Math.sin(a) * outer); g.lineTo(Math.cos(a + half) * inner, Math.sin(a + half) * inner); g.closePath(); g.fill(); } g.restore();
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return ownTexture(t);
  }
  function cloudTex(size, nightCloud) {
    if (typeof document === 'undefined') return null;
    var c = document.createElement('canvas'); c.width = size; c.height = Math.round(size * 0.42); var g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); var seed = nightCloud ? 0x4d4f4f4e : 0x53554e;
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    for (var i = 0; i < 14; i++) { var x = c.width * (0.05 + i / 13 * 0.9 + (rnd() - 0.5) * 0.025), y = c.height * (0.57 - (i % 3 === 1 ? 0.14 : 0) + (rnd() - 0.5) * 0.16), rx = c.width * (0.075 + rnd() * 0.055), ry = c.height * (0.22 + rnd() * 0.16); g.save(); g.translate(x, y); g.scale(1, ry / rx); var gr = g.createRadialGradient(-rx * 0.12, -rx * 0.18, rx * 0.04, 0, 0, rx); gr.addColorStop(0, nightCloud ? 'rgba(92,96,146,0.92)' : 'rgba(250,248,244,0.9)'); gr.addColorStop(0.55, nightCloud ? 'rgba(66,70,118,0.8)' : 'rgba(214,220,236,0.76)'); gr.addColorStop(0.82, nightCloud ? 'rgba(186,170,236,0.42)' : 'rgba(255,246,232,0.44)');   /* pivot: daylight veil matches the white cloud bodies */ gr.addColorStop(1, 'rgba(42,62,94,0)'); g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); }
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.24, 1.08); return ownTexture(t);
  }
  /* M8B: a soft, low-contrast diffuse veil (light scattered through a thin cloud in front of the Sun) — no lobed outline */
  function softVeilTex(size) {
    if (typeof document === 'undefined') return null;
    var c = document.createElement('canvas'); c.width = size; c.height = Math.round(size * 0.42); var g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
    [[0.5, 0.55, 0.46, 0.8], [0.3, 0.6, 0.26, 0.5], [0.7, 0.58, 0.28, 0.5]].forEach(function (b) { var x = c.width * b[0], y = c.height * b[1], rx = c.width * b[2]; g.save(); g.translate(x, y); g.scale(1, 0.62); var gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, 'rgba(252,251,248,' + b[3] + ')'); gr.addColorStop(0.5, 'rgba(240,243,250,' + (b[3] * 0.5) + ')'); gr.addColorStop(1, 'rgba(236,240,248,0)'); g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); });
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.24, 1.08); return ownTexture(t);
  }
  function cloudMaskTex(size, seed) {
    if (typeof document === 'undefined') return null;
    var c = document.createElement('canvas'); c.width = c.height = size; var g = c.getContext('2d'), im = g.createImageData(size, size), d = im.data;
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) { var a = Math.round(255 * cloudEdgeAlpha((x + 0.5) / size, (y + 0.5) / size, seed)), o = (y * size + x) * 4; d[o] = d[o + 1] = d[o + 2] = a; d[o + 3] = 255; }
    g.putImageData(im, 0, 0); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return ownTexture(t);
  }
  /* pivot: the Sun derivative texture, lifted toward white-gold so the over-bright disc reads as a light source (the surface stays the texture) */
  function whiteHot(tex) { try { var img = tex && tex.image; if (!img || typeof document === 'undefined' || !(img.width > 0)) return tex; var w = Math.min(512, img.width), h = Math.min(512, img.height); var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,244,214,0.62)'; g.fillRect(0, 0, w, h); var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = tex.flipY; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; ownTexture(tex); return t; } catch (e) { return tex; } }
  function facetColors(geo, seed) { var pos = geo.attributes.position; var n = pos.count; var col = new Float32Array(n * 3); var rnd = ctx.rnd ? ctx.rnd(seed) : Math.random; for (var f = 0; f < n; f += 3) { var b = FACET_BRIGHT[0] + rnd() * (FACET_BRIGHT[1] - FACET_BRIGHT[0]); for (var k = 0; k < 3; k++) { col[(f + k) * 3] = b; col[(f + k) * 3 + 1] = b; col[(f + k) * 3 + 2] = b; } } geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  function plane(name, diameter, tex, tint, opacity, order, blending, cloudSeed) {
    var shapedCloud = cloudSeed !== undefined, geo;
    if (shapedCloud) { if (!shared.cloudGeo) shared.cloudGeo = createCloudGeometry(THREE, cloudSeed, 42); if (!shared.cloudMask) shared.cloudMask = cloudMaskTex(128, cloudSeed); geo = shared.cloudGeo; }
    else { if (!shared.planeGeo) shared.planeGeo = new THREE.PlaneGeometry(1, 1); geo = shared.planeGeo; }
    var mat = new THREE.MeshBasicMaterial({ map: tex, alphaMap: shapedCloud ? shared.cloudMask : null, alphaTest: shapedCloud ? 0.012 : 0, color: tint, transparent: true, opacity: opacity, blending: blending === undefined ? THREE.NormalBlending : blending, depthTest: true, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide });
    var m = new THREE.Mesh(geo, mat); m.name = name; m.scale.set(diameter, shapedCloud ? diameter * 0.3 : diameter, 1); m.renderOrder = order; m.frustumCulled = false; m.userData.noMerge = true; if (shapedCloud) m.userData.cloudSilhouette = shared.cloudGeo.userData.cloudSilhouette; m.castShadow = false; m.receiveShadow = false; return m;
  }
  function attachSkyEffects(body, cfg) {
    var haloD = apparentDiameter(body.dist, cfg.halo_deg); body.halo_deg = cfg.halo_deg; body.halo_m = +haloD.toFixed(2);
    var h1 = plane(body.name + '_HALO', haloD, cfg.haloTex, cfg.haloTint, cfg.haloOpacity, SKY_RENDER_ORDER - 1, THREE.AdditiveBlending);
    var h2 = plane(body.name + '_HALO2', haloD * cfg.faintScale, cfg.haloTex, cfg.haloTint, cfg.faintOpacity, SKY_RENDER_ORDER - 2, THREE.AdditiveBlending);
    var rayD = apparentDiameter(body.dist, cfg.halo_deg * 1.75); var ray = plane(body.name + '_RAYS', rayD, cfg.rayTex, cfg.rayTint, cfg.rayOpacity, SKY_RENDER_ORDER - 3, THREE.AdditiveBlending);
    var veilD = apparentDiameter(body.dist, cfg.halo_deg * 1.35); var veil = plane(body.name + '_CLOUD_VEIL', veilD, cfg.cloudTex, 0xffffff, 0, SKY_RENDER_ORDER + 3, THREE.NormalBlending, 0xc10d5eed); if (cfg.cloudTexDay) body.veilTex = { day: cfg.cloudTexDay, night: cfg.cloudTex };   /* pivot: a body visible by day and night swaps its veil texture with the time of day */
    h1.userData.baseOpacity = cfg.haloOpacity; h2.userData.baseOpacity = cfg.faintOpacity; ray.userData.baseOpacity = cfg.rayOpacity; veil.userData.baseOpacity = cfg.cloudOpacity;
    body.halos = [h1, h2]; body.rays = [ray]; body.veil = veil; body.effects = [h1, h2, ray, veil];
    for (var i = 0; i < body.effects.length; i++) ctx.group.add(body.effects[i]);
  }
  function materialRecord(m) { if (!m.userData) m.userData = {}; if (!m.userData.mwCelestialBase) m.userData.mwCelestialBase = { color: m.color ? m.color.clone() : null, emissiveIntensity: m.emissiveIntensity || 0 }; return m.userData.mwCelestialBase; }
  function addProceduralBody(spec) {
    var diameter = apparentDiameter(spec.dist, spec.apparent_deg); var geo = new THREE.IcosahedronGeometry(1, 3); facetColors(geo, spec.seed);
    var mesh = new THREE.Mesh(geo, spec.material); mesh.name = spec.name; mesh.scale.setScalar(diameter / 2); mesh.renderOrder = SKY_RENDER_ORDER; mesh.frustumCulled = false; mesh.userData.noMerge = true; mesh.castShadow = false; mesh.receiveShadow = false; materialRecord(spec.material); ctx.group.add(mesh);
    var b = { kind: spec.kind, name: spec.name, root: mesh, spinRoot: mesh, dir: new THREE.Vector3(spec.dir[0], spec.dir[1], spec.dir[2]), dist: spec.dist, apparent_deg: spec.apparent_deg, diameter_m: +diameter.toFixed(2), materials: [spec.material], meshCount: 1, triangles: geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3, textured: !!spec.material.map, dayVisible: spec.dayVisible, provenance: spec.provenance || null, halos: [], rays: [], veil: null, effects: [], cloud: null };
    attachSkyEffects(b, spec.effects); bodies.push(b); return b;
  }
  function addDerivativeBody(spec, gltf, info) {
    var diameter = apparentDiameter(spec.dist, spec.apparent_deg); var root = gltf.scene; var box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3()), maxDim = Math.max(size.x, size.y, size.z) || 1;
    var holder = new THREE.Group(); holder.name = spec.name; holder.userData.noMerge = true; root.position.sub(centre); holder.add(root); holder.scale.setScalar(diameter / maxDim); ctx.group.add(holder);
    var materials = [], meshCount = 0, triangles = 0, textured = false;
    root.traverse(function (o) { if (!o.isMesh) return; meshCount++; o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; o.renderOrder = SKY_RENDER_ORDER; var ml = Array.isArray(o.material) ? o.material : [o.material]; var cloned = ml.map(function (m) { var q = m.clone(); q.fog = false; q.depthTest = true; q.depthWrite = true; q.side = THREE.DoubleSide; if (q.map) { ownTexture(prepTexture(q.map, true)); textured = true; } if (q.normalMap) ownTexture(prepTexture(q.normalMap, false)); if (q.roughnessMap) ownTexture(q.roughnessMap); if (q.metalnessMap) ownTexture(q.metalnessMap); if (q.aoMap) ownTexture(q.aoMap); if (q.roughness !== undefined) q.roughness = Math.max(0.58, q.roughness); if (q.metalness !== undefined) q.metalness = Math.min(0.08, q.metalness); if (spec.tint && q.color) q.color.multiply(new THREE.Color(spec.tint)).multiplyScalar(0.8); if (q.emissive) q.emissive.set(spec.emissive || 0x7189ad); if (q.map && q.emissiveMap !== undefined) q.emissiveMap = spec.emissive ? null : q.map;   /* pivot: a uniform lavender glow keeps the traced surface as soft relief instead of a busy faceted ball */ if (q.emissiveIntensity !== undefined) q.emissiveIntensity = spec.emissive ? 1.0 : 0.42; materialRecord(q); materials.push(q); return q; }); o.material = Array.isArray(o.material) ? cloned : cloned[0]; var g = o.geometry; if (g) triangles += g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0); });
    if (spec.emissive) {   /* pivot: a soft lavender limb glow (fresnel shell, additive) so the Moon reads luminous and celestial */
      var shellGeo = new THREE.SphereGeometry(maxDim * 0.5 * 1.05, 48, 32); var shellMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, fog: false, toneMapped: false, uniforms: { uCol: { value: new THREE.Color(spec.glowColor || 0xcdb6ff) }, uK: { value: 0.85 } },
        vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uCol; uniform float uK; varying vec3 vN; varying vec3 vV; void main() { float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0); float g = pow(f, 2.2) * 0.9 + 0.12; gl_FragColor = vec4(uCol * g * uK, 1.0); }' });
      var shell = new THREE.Mesh(shellGeo, shellMat); shellMat.userData.limb = true; shell.name = spec.name + '_LIMB_GLOW'; shell.renderOrder = SKY_RENDER_ORDER + 1; shell.frustumCulled = false; shell.userData.noMerge = true; holder.add(shell); ownTexture(shellGeo); ownTexture(shellMat); }
    var b = { kind: spec.kind, name: spec.name, alwaysVisible: !!spec.alwaysVisible, glow: spec.glow || null, limb: (typeof shellMat !== 'undefined' && shellMat) ? shellMat : null, root: holder, spinRoot: root, dir: new THREE.Vector3(spec.dir[0], spec.dir[1], spec.dir[2]), dist: spec.dist, apparent_deg: spec.apparent_deg, diameter_m: +diameter.toFixed(2), materials: materials, meshCount: meshCount, triangles: Math.round(triangles), textured: textured, dayVisible: spec.dayVisible, provenance: { mode: 'REGISTRY_TRACED_DERIVATIVE', derivative_id: info.derivative.id, lod: info.lod, runtime: info.file.runtime, runtime_sha256: info.file.sha256, source_id: info.derivative.source, source_path: info.source && info.source.path || null, source_sha256: info.source && info.source.sha256 || null }, sourceBounds: { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z], max_dim: +maxDim.toFixed(5) }, halos: [], rays: [], veil: null, effects: [], cloud: null };
    attachSkyEffects(b, spec.effects); bodies.push(b); return b;
  }
  function place(body, c) {
    body.root.position.set(c.x + body.dir.x * body.dist, c.y + body.dir.y * body.dist, c.z + body.dir.z * body.dist);
    var R = body.diameter_m * 0.5;
    for (var i = 0; i < body.halos.length; i++) body.halos[i].position.set(c.x + body.dir.x * (body.dist + R * (1.08 + i * 0.02)), c.y + body.dir.y * (body.dist + R * (1.08 + i * 0.02)), c.z + body.dir.z * (body.dist + R * (1.08 + i * 0.02)));
    for (i = 0; i < body.rays.length; i++) body.rays[i].position.set(c.x + body.dir.x * (body.dist + R * 1.12), c.y + body.dir.y * (body.dist + R * 1.12), c.z + body.dir.z * (body.dist + R * 1.12));
    if (body.veil) body.veil.position.set(c.x + body.dir.x * (body.dist - R * 1.25), c.y + body.dir.y * (body.dist - R * 1.25), c.z + body.dir.z * (body.dist - R * 1.25));
    for (i = 0; i < body.effects.length; i++) body.effects[i].lookAt(c.x, c.y, c.z);
  }
  function applyOptics(body, state) {
    state = state || { transmission: 1, disc: 1, halo: 1, rays: 1, coverage: 0, tau: 0, phase_u: 0, phase_v: 0 }; body.cloud = state;
    var disc = clamp01(state.disc === undefined ? state.transmission : state.disc), halo = clamp01(state.halo === undefined ? state.transmission : state.halo), rays = clamp01(state.rays === undefined ? state.transmission : state.rays), cover = clamp01(state.coverage === undefined ? 1 - state.transmission : state.coverage);
    var dayMoon = body.kind === 'moon' && !night;   /* M8B: by day the Moon is seen THROUGH the lit atmosphere — paler, a little translucent, a softer limb; at night it is opaque and radiant */
    if (body.limb) body.limb.uniforms.uK.value = dayMoon ? 0.42 : 1.05;
    for (var i = 0; i < body.materials.length; i++) { var m = body.materials[i], base = materialRecord(m); if (body.kind === 'moon') { var wantT = dayMoon; if (m.transparent !== wantT) { m.transparent = wantT; m.needsUpdate = true; } m.opacity = dayMoon ? 0.74 : 1; } if (m.color && base.color) m.color.copy(base.color).multiplyScalar((0.48 + 0.52 * disc) * (dayMoon ? 0.82 : 1)); if (m.emissiveIntensity !== undefined) m.emissiveIntensity = base.emissiveIntensity * (0.32 + 0.68 * disc) * (body.glow ? (night ? body.glow.night : body.glow.day) : 1); }
    for (i = 0; i < body.halos.length; i++) body.halos[i].material.opacity = body.halos[i].userData.baseOpacity * halo;
    for (i = 0; i < body.rays.length; i++) body.rays[i].material.opacity = body.rays[i].userData.baseOpacity * rays;
    if (body.veil) { body.veil.material.opacity = body.veil.userData.baseOpacity * cover; if (body.veil.material.map) { body.veil.material.map.offset.x = state.phase_u || 0; body.veil.material.map.offset.y = state.phase_v || 0; } }
    if (body.root.visible && ctx.applyCelestialLight) { var p = body.keyPayload || (body.keyPayload = { kind: body.kind, night: !body.dayVisible, direction: [0, 0, 0], transmission: 1, key_transmission: 1, coverage: 0, tau: 0 }); p.direction[0] = body.dir.x; p.direction[1] = body.dir.y; p.direction[2] = body.dir.z; p.transmission = clamp01(state.transmission); p.key_transmission = clamp01(state.key === undefined ? state.transmission : state.key); p.coverage = cover; p.tau = isFinite(state.tau) ? +state.tau : 0; ctx.applyCelestialLight(p); }
  }
  function applyVisibility() { for (var i = 0; i < bodies.length; i++) { var b = bodies[i]; var v = b.alwaysVisible ? true : (b.dayVisible ? !night : night); if (b.veil && b.veilTex) { var vt = night ? b.veilTex.night : b.veilTex.day; if (vt && b.veil.material.map !== vt) { b.veil.material.map = vt; b.veil.material.needsUpdate = true; } } b.root.visible = v; for (var k = 0; k < b.effects.length; k++) b.effects[k].visible = v; if (v) applyOptics(b, cloudStates[b.kind]); } }
  function setCloudState(states) { states = states || {}; if (states.sun) cloudStates.sun = states.sun; if (states.moon) cloudStates.moon = states.moon; for (var i = 0; i < bodies.length; i++) applyOptics(bodies[i], cloudStates[bodies[i].kind]); }

  function build() {
    if (built) return Promise.resolve(); built = true; var buildGeneration = ++generation;
    var C = ctx.registry && ctx.registry.celestial; if (!C) { log('celestial: registry.celestial missing — nothing built'); return Promise.resolve(); }
    var S = C.sun || null, Mn = C.moon || null; if (!S) log('celestial: registry.celestial.sun missing — sun skipped'); if (!Mn) throw new Error('celestial: registry.celestial.moon missing');
    var sunInfo = S && runtimeInfo(S.derivative, S.lod || 'L1'); var moonInfo = runtimeInfo(Mn.derivative, Mn.lod || 'L0');
    if (!moonInfo || !moonInfo.file || !moonInfo.file.runtime) throw new Error('celestial: traced Moon derivative missing from registry (' + Mn.derivative + ' ' + (Mn.lod || 'L0') + ')');
    var sunJob = sunInfo ? ctx.loadGlb(sunInfo.file.runtime).then(function (gltf) { return { gltf: gltf, maps: findMaps(gltf) }; }).catch(function (e) { log('celestial: sun texture load failed (' + (e && e.message || e) + ') — untextured sun'); return { gltf: null, maps: { map: null, normalMap: null } }; }) : Promise.resolve({ gltf: null, maps: { map: null, normalMap: null } });
    var moonJob = ctx.loadGlb(moonInfo.file.runtime);
    return Promise.all([sunJob, moonJob]).then(function (loaded) {
      if (!built || buildGeneration !== generation) { disposeLoaded(loaded[0] && loaded[0].gltf); disposeLoaded(loaded[1]); return; }
      if (S) {
        var sd = celestialDirection(S, 'sun'), sunMap = ownTexture(prepTexture(whiteHot(loaded[0] && loaded[0].maps && loaded[0].maps.map), true)); var sunMat = new THREE.MeshBasicMaterial({ map: sunMap || null, color: new THREE.Color(3.1, 2.65, 2.05), toneMapped: false, fog: false, vertexColors: true });   /* over-bright + untonemapped: the disc reads as the light source, the texture survives in its darker cells */
        addProceduralBody({ kind: 'sun', name: 'JOBB_SUN', dir: sd, dist: +S.distance_m || 900, apparent_deg: +S.apparent_deg || 6.5, material: sunMat, seed: 7, dayVisible: true, provenance: sunInfo ? { mode: 'DERIVATIVE_TEXTURE_PROCEDURAL_GEOMETRY', derivative_id: sunInfo.derivative.id, lod: sunInfo.lod, runtime: sunInfo.file.runtime } : null, effects: { halo_deg: +S.halo_deg || 14, haloTex: radialTex(256, [[0, 'rgba(255,246,222,0.9)'], [0.22, 'rgba(255,240,206,0.62)'], [0.5, 'rgba(255,226,180,0.2)'], [1, 'rgba(255,214,160,0)']]), haloTint: 0xfff1d2, haloOpacity: 0.62, faintScale: 2.5, faintOpacity: 0.2, rayTex: rayTex(256, ['rgba(255,246,218,0.34)', 'rgba(255,225,170,0.1)', 'rgba(255,220,160,0)']), rayTint: 0xffedca, rayOpacity: 0.05, cloudTex: softVeilTex(512), cloudOpacity: 0.55 } });   /* M8B sky realism: the lobed cloud card read as a doodled corona around the Sun and the 18 hard rays as a cartoon — a soft diffuse veil and a barely-there ray breath; the real cloud bodies already occlude the disc in depth */
      }
      var md = celestialDirection(Mn, 'moon');
      var lav = !!Mn.day_visible;   /* world pivot: the lavender daylight Moon */
      addDerivativeBody({ kind: 'moon', name: 'JOBB_MOON', dir: md, dist: +Mn.distance_m || 900, apparent_deg: +Mn.apparent_deg || 6.2, dayVisible: false, alwaysVisible: lav, tint: Mn.tint || null, emissive: Mn.emissive || null, glow: lav ? { day: isFinite(+Mn.emissive_day) ? +Mn.emissive_day : 0.95, night: isFinite(+Mn.emissive_night) ? +Mn.emissive_night : 0.72 } : null, effects: { halo_deg: +Mn.halo_deg || 12, haloTex: lav ? radialTex(256, [[0, 'rgba(236,222,255,0.72)'], [0.26, 'rgba(206,182,255,0.42)'], [0.55, 'rgba(226,168,236,0.16)'], [1, 'rgba(170,120,220,0)']]) : radialTex(256, [[0, 'rgba(190,210,255,0.7)'], [0.3, 'rgba(150,180,255,0.36)'], [0.55, 'rgba(120,160,255,0.14)'], [1, 'rgba(70,100,210,0)']]), haloTint: lav ? 0xe9dcff : 0xdbe6ff, haloOpacity: lav ? 0.46 : 0.5, faintScale: lav ? 2.3 : 1.8, faintOpacity: lav ? 0.16 : 0.14, rayTex: rayTex(256, lav ? ['rgba(228,210,255,0.22)', 'rgba(196,160,240,0.08)', 'rgba(160,120,220,0)'] : ['rgba(184,205,255,0.3)', 'rgba(113,145,230,0.1)', 'rgba(80,110,210,0)']), rayTint: lav ? 0xd8c4ff : 0xaec8ff, rayOpacity: lav ? 0.08 : 0.13, cloudTexDay: lav ? cloudTex(512, false) : null, cloudTex: cloudTex(512, true), cloudOpacity: 0.94 } }, loaded[1], moonInfo);
      applyVisibility(); var c = ctx.cameraPos(); for (var i = 0; i < bodies.length; i++) place(bodies[i], c);
      log('celestial: ' + bodies.map(function (b) { return b.name + ' ' + b.apparent_deg + '° = ' + b.diameter_m + ' m @ ' + b.dist + ' m' + (b.kind === 'moon' ? ' [' + b.provenance.lod + ' traced GLB, ' + b.triangles + ' tris]' : ''); }).join(', '));
    });
  }
  function tick(dt) { if (!bodies.length) return; if (!(dt > 0)) dt = 0.016; else if (dt > 0.1) dt = 0.1; var c = ctx.cameraPos(); for (var i = 0; i < bodies.length; i++) { var b = bodies[i]; if (!b.root.visible) continue; place(b, c); var r = b.spinRoot.rotation.y + SPIN_RAD_S * dt; if (r > Math.PI * 2) r -= Math.PI * 2; b.spinRoot.rotation.y = r; } }
  function setNight(n) { night = !!n; applyVisibility(); if (bodies.length) { var c = ctx.cameraPos(); for (var i = 0; i < bodies.length; i++) if (bodies[i].root.visible) place(bodies[i], c); } }
  function debug() { var d = { night: night, camera_relative_origin: true, world_direction_stable: true, effects_face_camera: true, cloud_cards: 'OLD_SOFT_FEATHERED', draw_calls_visible: 0 }; for (var i = 0; i < bodies.length; i++) { var b = bodies[i], key = b.kind; d[key] = { always_visible: !!b.alwaysVisible, apparent_deg: b.apparent_deg, diameter_m: b.diameter_m, distance_m: b.dist, halo_deg: b.halo_deg, halo_m: b.halo_m, textured: b.textured, visible: b.root.visible, direction: [+b.dir.x.toFixed(4), +b.dir.y.toFixed(4), +b.dir.z.toFixed(4)], geometry: b.kind === 'moon' ? 'TRACED_DERIVATIVE_GLB' : 'PROCEDURAL_SUN', triangles: b.triangles, meshes: b.meshCount, provenance: b.provenance, source_bounds: b.sourceBounds || null, veil_shape: b.veil && b.veil.userData.cloudSilhouette || null, cloud: b.cloud ? { tau: +(+b.cloud.tau || 0).toFixed(3), coverage: +(+b.cloud.coverage || 0).toFixed(3), transmission: +(+b.cloud.transmission || 1).toFixed(3), disc: +(+b.cloud.disc || 1).toFixed(3), halo: +(+b.cloud.halo || 1).toFixed(3), rays: +(+b.cloud.rays || 1).toFixed(3), key: +(+b.cloud.key || 1).toFixed(3) } : null }; if (b.root.visible) d.draw_calls_visible += b.meshCount + b.effects.length; } return d; }
  function dispose() { generation++; built = false; for (var i = 0; i < bodies.length; i++) { var b = bodies[i]; if (b.root.parent) b.root.parent.remove(b.root); b.root.traverse(function (o) { if (o.isMesh && o.geometry && o.geometry !== shared.planeGeo && o.geometry !== shared.cloudGeo) { try { o.geometry.dispose(); } catch (e) { } } }); for (var m = 0; m < b.materials.length; m++) try { b.materials[m].dispose(); } catch (e) { } for (var k = 0; k < b.effects.length; k++) { var e = b.effects[k]; if (e.parent) e.parent.remove(e); try { e.material.dispose(); } catch (x) { } } } ownedTextures.forEach(function (t) { try { t.dispose(); } catch (e) { } }); ownedTextures.length = 0; shared.cloudMask = null; if (shared.planeGeo) { shared.planeGeo.dispose(); shared.planeGeo = null; } if (shared.cloudGeo) { shared.cloudGeo.dispose(); shared.cloudGeo = null; } bodies.length = 0; }
  return { build: build, tick: tick, setNight: setNight, setCloudState: setCloudState, debug: debug, dispose: dispose };
}
