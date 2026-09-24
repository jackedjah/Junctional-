/* MAHWORLD JOB B :: FOREST — the instanced tree family (registry artifact FOREST_TREE_FAMILY → derivative MAHWORLD_FOREST_TREE_PRIMARY).
   Placement is NOT decided here: ctx.forestPlacement comes from worldLayout.forestLayout (the same seeded scatter the host's collider
   generator uses), so every trunk drawn here has exactly one CYLINDER collider on the host side. This module only draws:
     · source-faithful L0 (near, 14.8k tris) and L1 (far, 7.4k tris) InstancedMesh bands, partitioned by authored forest zone so normal
       frustum culling can reject groves behind the camera. Both tiers use the SAME shader, texture set and per-instance class colour.
     · one static InstancedMesh of low sapphire octahedra (≤ 1 per tree) so the forest floor reads under the platinum ground
   Matrices / colours are allocated once at build; tick() rewrites only the zone chunk whose membership changed.
   Day is the default; setNight raises a faint class-coloured emissive on the shared tree material (crystal leaves at night).
   Materials: the derivative's own PBR material (cloned once, both LODs share it → one texture set), ctx.M.sapphire for the underbrush.
   TREE LOCK (owner redirect 2026-09-19): the trunk + main boughs are clean platinum / heat-grey METAL and crystal appears only at the
   extremities, in the REGION's crystal family — done in the tree material's shader (radial distance from the trunk axis + height →
   metal ↔ crystal blend; per-instance colour = the zone's family from registry.tree_lock.zone_family), never a mesh edit. M5 OP12 removes
   the former runtime render-target impostor: it double-shaded a neutral bake with a different material, produced the black→colour pop,
   and synchronously compiled/rendered/mipmapped at startup. Variants (tall / broad / lean) are per-instance matrix tweaks from the seed. */
import { groundYAt } from './worldLayout.js';
export function selectForestLod(distanceSq, current, nearM, hysteresisM) {
  var n = Math.max(0, nearM || 0), h = Math.max(0, hysteresisM || 0), leave = n + h;
  return distanceSq < (current === 0 ? leave * leave : n * n) ? 0 : 1;
}
export function createForest(ctx) {
  var THREE = ctx.THREE; var G = ctx.group; var reg = ctx.registry || {}; var P = ctx.forestPlacement || []; var N = P.length; var log = ctx.log || function () { };
  var fam = null, lod = { near_m: 45 }, variation = { scale: [0.85, 1.35], height_m: [9, 15], tint: ['#dfe8f2'] };
  var mUnder = null, chunks = [], counts = [0, 0], skipped = null;
  var mats = null, cols = null, lodOf = null, chunkOf = null, px = null, pz = null; var treeMat = null, underGeo = null;
  var srcH = 1, minY = 0, hw = 0.35; var baseH = 0, hMin = 9, hMax = 15; var LOCK = reg.tree_lock || null; var FAMS = reg.crystal_families || {}; var lockU = null; var near = 45, acc = 0.4, night = !!ctx.night; var NIGHT_EMISSIVE = 0.35, HYST_NEAR = 4, PERIOD = 0.4;
  var triByLod = [0, 0], sourceFar = 'L1', transitions = 0, rewrites = 0, timing = { build_ms: 0, assemble_ms: 0, first_classify_ms: 0, first_rewrite_ms: 0, last_classify_ms: 0, max_classify_ms: 0, last_rewrite_ms: 0, max_rewrite_ms: 0, runtime_bake_ms: 0 };
  var _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _c = new THREE.Color();
  var rndOf = ctx.rnd || function (seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  function firstMesh(gltf) { var m = null; if (gltf && gltf.scene) gltf.scene.traverse(function (o) { if (!m && o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position) m = o; }); return m; }
  function now() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }
  function tierNear() { var T = null; try { T = ctx.quality && ctx.quality.get ? ctx.quality.get() : null; } catch (e) { T = null; } var cap = T && T.lod_far_m > 0 ? T.lod_far_m : Infinity; near = Math.min(lod.near_m, cap); }
  function heightFor(scale) { var h = baseH * (scale || 1); return h < hMin ? hMin : h > hMax ? hMax : h; }
  function newBand(geo, mat, name, capacity) { var m = new THREE.InstancedMesh(geo, mat, capacity); m.name = name; m.count = 0; m.visible = false; m.frustumCulled = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage); return m; }
  /* Band membership by camera distance with hysteresis. The far tier is the authored L1 derivative, not a material-changing proxy. */
  function classify(cx, cy, cz) {
    var t0 = now(); tierNear(); var cy2 = cy * cy; var changed = false;
    for (var i = 0; i < N; i++) { var dx = px[i] - cx, dz = pz[i] - cz; var d2 = dx * dx + dz * dz + cy2; var cur = lodOf[i]; var lv = selectForestLod(d2, cur, near, HYST_NEAR); if (lv !== cur) { lodOf[i] = lv; chunks[chunkOf[i]].dirty = true; transitions++; changed = true; } }
    var ms = now() - t0; timing.last_classify_ms = +ms.toFixed(3); timing.max_classify_ms = Math.max(timing.max_classify_ms, timing.last_classify_ms); if (!timing.first_classify_ms) timing.first_classify_ms = timing.last_classify_ms;
    return changed;
  }
  function rewrite(force) {   /* compact only dirty zone chunks; every slot gets the same matrix + class colour on both source tiers */
    var t0 = now(); for (var c = 0; c < chunks.length; c++) { var ch = chunks[c]; if (!force && !ch.dirty) continue; var local = [0, 0];
      for (var j = 0; j < ch.members.length; j++) { var i = ch.members[j], b = lodOf[i], m = ch.bands[b], slot = local[b]++; m.setMatrixAt(slot, mats[i]); m.setColorAt(slot, cols[i]); }
      for (var b = 0; b < 2; b++) { var band = ch.bands[b]; band.count = local[b]; band.visible = local[b] > 0; band.instanceMatrix.needsUpdate = true; band.instanceColor.needsUpdate = true; if (band.visible) band.computeBoundingSphere(); }
      ch.counts = local; ch.dirty = false;
    }
    counts[0] = 0; counts[1] = 0; chunks.forEach(function (ch) { counts[0] += ch.counts[0]; counts[1] += ch.counts[1]; }); rewrites++;
    var ms = now() - t0; timing.last_rewrite_ms = +ms.toFixed(3); timing.max_rewrite_ms = Math.max(timing.max_rewrite_ms, timing.last_rewrite_ms); if (!timing.first_rewrite_ms) timing.first_rewrite_ms = timing.last_rewrite_ms;
  }
  function assemble(m0, m1) {
    var ta = now(); var src = m0 || m1; if (!src) throw new Error('forest: no tree mesh in the derivative GLBs'); if (!m0) log('forest: L0 missing — L1 stands in for the near band'); if (!m1) { log('forest: L1 missing — L0 stands in for the far band'); sourceFar = 'L0_FALLBACK'; }
    var g0 = (m0 || m1).geometry, g1 = (m1 || m0).geometry; var srcMat = Array.isArray(src.material) ? src.material[0] : src.material;
    if (!g0.boundingBox) g0.computeBoundingBox(); if (!g0.boundingSphere) g0.computeBoundingSphere(); if (!g1.boundingSphere) g1.computeBoundingSphere();
    triByLod[0] = g0.index ? g0.index.count / 3 : g0.attributes.position.count / 3; triByLod[1] = g1.index ? g1.index.count / 3 : g1.attributes.position.count / 3;
    var bb = g0.boundingBox; minY = bb.min.y; srcH = Math.max(1e-3, bb.max.y - bb.min.y); hw = Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x), Math.abs(bb.min.z), Math.abs(bb.max.z)) || 0.35;
    treeMat = srcMat && srcMat.isMaterial ? srcMat.clone() : new THREE.MeshStandardMaterial({ color: 0xcfd8e2, roughness: 0.5, metalness: 0 }); treeMat.name = 'MAHWORLD_FOREST_TREE';
    /* crown sway: a slow wind on the upper part of every instance (model-space offset before the instance matrix; the base never moves) */
    var T = LOCK && LOCK.trunk || {}, CR = LOCK && LOCK.crystal || {}; lockU = { uTrunk: { value: new THREE.Color(T.color || '#c7ced6') }, uHeat: { value: new THREE.Color(T.heat_grey || '#6e7680') }, uStart: { value: CR.extremity_start !== undefined ? CR.extremity_start : 0.55 }, uFull: { value: CR.extremity_full !== undefined ? CR.extremity_full : 0.85 }, uRough: { value: new THREE.Vector2(T.roughness !== undefined ? T.roughness : 0.38, CR.roughness !== undefined ? CR.roughness : 0.16) }, uMetal: { value: new THREE.Vector2(T.metalness !== undefined ? T.metalness : 0.92, CR.metalness !== undefined ? CR.metalness : 0.55) }, uGlow: { value: 0 }, uHw: { value: hw }, uMinY: { value: minY }, uH: { value: srcH } };
    var lockVert = '#include <begin_vertex>\n{ float rad = length(position.xz) / uHw; float hf = clamp((position.y - uMinY) / uH, 0.0, 1.0); vExt = max(rad, hf * 0.92); vHf = hf; }';
    var lockFrag = '#include <color_fragment>\n{ float k = smoothstep(uStart, uFull, vExt); float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));\n#ifdef USE_COLOR\n lum = dot(diffuseColor.rgb / max(vColor.rgb, vec3(0.05)), vec3(0.3, 0.59, 0.11)); vec3 fam = vColor.rgb;\n#else\n vec3 fam = vec3(1.0);\n#endif\n vec3 trunk = mix(uHeat, uTrunk, smoothstep(0.0, 0.45, vHf)) * (0.42 + 0.62 * lum); vec3 crystal = fam * (0.45 + 0.9 * lum); diffuseColor.rgb = mix(trunk, crystal, k); vLockK = k; vLockFam = fam * lum; }';
    treeMat.onBeforeCompile = function (sh) { sh.uniforms.uSwayT = { value: 0 }; Object.keys(lockU).forEach(function (k) { sh.uniforms[k] = lockU[k]; }); treeMat.userData.shader = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uSwayT; uniform float uHw; uniform float uMinY; uniform float uH; varying float vExt; varying float vHf;').replace('#include <begin_vertex>', lockVert + '\n#ifdef USE_INSTANCING\n{ float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.53; float k = clamp(position.y / 0.98, 0.0, 1.0); k *= k; float s1 = sin(uSwayT * 0.9 + ph) * 0.6 + sin(uSwayT * 1.7 + ph * 1.3) * 0.4; transformed.x += s1 * k * 0.018; transformed.z += cos(uSwayT * 0.7 + ph * 0.8) * k * 0.012; }\n#endif');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTrunk; uniform vec3 uHeat; uniform float uStart; uniform float uFull; uniform vec2 uRough; uniform vec2 uMetal; uniform float uGlow; varying float vExt; varying float vHf; float vLockK; vec3 vLockFam;').replace('#include <color_fragment>', lockFrag).replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n roughnessFactor = mix(uRough.x, uRough.y, vLockK); metalnessFactor = mix(uMetal.x, uMetal.y, vLockK);').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance = vLockFam * uGlow * vLockK;'); };
    treeMat.customProgramCacheKey = function () { return 'mahworld_forest_lock'; };
    if (treeMat.emissive) { treeMat.emissive.setHex(0xffffff); treeMat.emissiveIntensity = 1; treeMat.emissiveMap = null; }   /* the night glow = the crystal extremities in their family colour (uGlow), never the trunk */
    mats = new Array(N); cols = new Array(N); lodOf = new Int8Array(N); chunkOf = new Int16Array(N); px = new Float32Array(N); pz = new Float32Array(N);
    for (var i = 0; i < N; i++) { var t = P[i]; var s = heightFor(t.scale) / srcH; px[i] = t.x; pz[i] = t.z; lodOf[i] = -1;
      var vr = rndOf((0x7A11 + i * 40503) >>> 0)(); var sy = s, sxz = s, lean = 0; if (LOCK && LOCK.variants) { if (vr < 0.3) sy = s * 1.12; else if (vr < 0.55) sxz = s * 1.1; else if (vr < 0.75) lean = 4 * Math.PI / 180; }   /* TREE LOCK variants: tall / broad / lean */
      _p.set(t.x, groundYAt(reg, t.x, t.z) - minY * sy, t.z); _e.set(lean, +t.yaw || 0, 0, 'YXZ');   /* trees stand on the terraces */ _q.setFromEuler(_e); _s.set(sxz, sy, sxz); mats[i] = new THREE.Matrix4().compose(_p, _q, _s);
      var col = new THREE.Color(0xffffff); if (t.tint) { try { col.set(t.tint); } catch (e) { } } if (LOCK && LOCK.zone_family) { var famId = LOCK.zone_family[t.zone] || 'platinum'; var fc = FAMS[famId] && FAMS[famId].color ? new THREE.Color(FAMS[famId].color) : new THREE.Color(0xdfe6ee); var lum = 0.75 + 0.35 * (0.3 * col.r + 0.59 * col.g + 0.11 * col.b); col.copy(fc).multiplyScalar(lum); } cols[i] = col; }
    /* One pair per authored forest zone: this keeps each InstancedMesh bound local enough for real frustum culling while retaining
       one shared material/program. Seven small chunks are a bounded draw-call trade for not drawing every far tree in every view. */
    var byZone = {}; for (i = 0; i < N; i++) { var zone = P[i].zone || 'UNZONED'; (byZone[zone] = byZone[zone] || []).push(i); }
    Object.keys(byZone).sort().forEach(function (zone) { var members = byZone[zone], safe = String(zone).replace(/[^A-Za-z0-9_]/g, '_'); var a = newBand(g0, treeMat, 'MAHWORLD_FOREST_' + safe + '_L0', members.length), b = newBand(g1, treeMat, 'MAHWORLD_FOREST_' + safe + '_L1', members.length); a.castShadow = true; b.castShadow = false; a.receiveShadow = b.receiveShadow = true; a.userData.forestZone = b.userData.forestZone = zone; G.add(a); G.add(b); var ci = chunks.length; members.forEach(function (ix) { chunkOf[ix] = ci; }); chunks.push({ zone: zone, members: members, bands: [a, b], counts: [0, 0], dirty: true }); });
    /* underbrush: one low flat sapphire octahedron near every trunk (seeded from the placement index; sunk so only the shallow upper pyramid shows) */
    underGeo = new THREE.OctahedronGeometry(1, 0); var underMat = ctx.M && ctx.M.sapphire ? ctx.M.sapphire : new THREE.MeshStandardMaterial({ color: 0x1c2a46, roughness: 0.4, metalness: 0.7 });
    mUnder = new THREE.InstancedMesh(underGeo, underMat, N); mUnder.name = 'MAHWORLD_FOREST_UNDERBRUSH'; mUnder.receiveShadow = true;
    for (i = 0; i < N; i++) { var q = P[i]; var r = rndOf((0x5EED + i * 2654435761) >>> 0); var a = r() * Math.PI * 2, d = 1.4 + r() * 1.6, rad = (0.9 + r() * 0.9) * (q.scale || 1), h = 0.22 + r() * 0.2;
      _p.set(q.x + Math.cos(a) * d, groundYAt(reg, q.x, q.z) + 0.05, q.z + Math.sin(a) * d); _e.set(0, r() * Math.PI, 0); _q.setFromEuler(_e); _s.set(rad, h, rad * (0.7 + r() * 0.5)); mUnder.setMatrixAt(i, new THREE.Matrix4().compose(_p, _q, _s)); mUnder.setColorAt(i, _c.setScalar(0.75 + r() * 0.5)); }
    mUnder.instanceMatrix.needsUpdate = true; if (mUnder.instanceColor) mUnder.instanceColor.needsUpdate = true; mUnder.computeBoundingSphere(); G.add(mUnder);
    var c = ctx.cameraPos ? ctx.cameraPos() : null; classify(c ? c.x : 0, c ? (c.y || 0) : 0, c ? c.z : 0); rewrite(true); setNight(night); timing.assemble_ms = +(now() - ta).toFixed(1);
    log('forest: ' + N + ' trees (L0 ' + counts[0] + ' / source-faithful ' + sourceFar + ' ' + counts[1] + '), ' + chunks.length + ' cullable zone chunks, height ' + heightFor(variation.scale[0]).toFixed(1) + '–' + heightFor(variation.scale[1]).toFixed(1) + ' m, switch ' + near + ' m; runtime impostor removed');
  }
  function build() {
    var tb = now();
    if (!N) { skipped = 'no forest placements'; log('forest: ' + skipped); return; }
    fam = (reg.artifacts || []).filter(function (a) { return a && a.id === 'FOREST_TREE_FAMILY'; })[0]; if (!fam) { skipped = 'registry artifact FOREST_TREE_FAMILY missing'; log('forest: ' + skipped); return; }
    var deriv = (reg.derivatives || []).filter(function (d) { return d && d.id === fam.derivative; })[0]; var files = deriv && deriv.files; if (!files || !files.L0 || !files.L0.runtime) { skipped = 'derivative ' + fam.derivative + ' has no L0 file'; log('forest: ' + skipped); return; }
    if (fam.lod) { if (fam.lod.near_m > 0) lod.near_m = fam.lod.near_m; } else log('forest: lod block missing — default 45 m source-tier switch');
    if (fam.variation) { if (fam.variation.scale && fam.variation.scale.length === 2) variation.scale = fam.variation.scale; if (fam.variation.height_m && fam.variation.height_m.length === 2) variation.height_m = fam.variation.height_m; else log('forest: variation.height_m missing — default 9–15 m'); }
    hMin = variation.height_m[0]; hMax = variation.height_m[1]; baseH = (hMin + hMax) / (variation.scale[0] + variation.scale[1]);   /* the mid scale lands on the mid height; ends clamp into height_m */
    if (!ctx.loadGlb) { skipped = 'ctx.loadGlb missing'; log('forest: ' + skipped); return; }
    var p0 = ctx.loadGlb(files.L0.runtime).catch(function (e) { log('forest: L0 load failed ' + (e && e.message || e)); return null; });
    var p1 = files.L1 && files.L1.runtime ? ctx.loadGlb(files.L1.runtime).catch(function (e) { log('forest: L1 load failed ' + (e && e.message || e)); return null; }) : Promise.resolve(null);
    return Promise.all([p0, p1]).then(function (r) { assemble(firstMesh(r[0]), firstMesh(r[1])); timing.build_ms = +(now() - tb).toFixed(1); });
  }
  var swayT = 0;
  function tick(dt) { if (!mats) return; var W = ctx.wind; swayT += (dt || 0) * (W && W.speed > 0 && W.now ? 0.55 + 0.45 * (W.now / W.speed) : 1);   /* the crown sway follows the ONE world wind (gusts quicken it) */ var shd = treeMat && treeMat.userData.shader; if (shd) shd.uniforms.uSwayT.value = swayT; acc += dt || 0; if (acc < PERIOD) return; acc = 0; var c = ctx.cameraPos ? ctx.cameraPos() : null; if (!c) return; if (classify(c.x, c.y || 0, c.z)) rewrite(); }
  function setNight(n) { night = !!n; var g = LOCK && LOCK.crystal && LOCK.crystal.night_glow !== undefined ? LOCK.crystal.night_glow : NIGHT_EMISSIVE; if (lockU) lockU.uGlow.value = night ? g : 0; }
  function dispose() { chunks.forEach(function (ch) { ch.bands.forEach(function (m) { G.remove(m); m.dispose(); }); }); if (mUnder) { G.remove(mUnder); mUnder.dispose(); } if (treeMat) treeMat.dispose(); if (underGeo) underGeo.dispose(); chunks = []; mUnder = null; mats = cols = lodOf = chunkOf = px = pz = null; counts[0] = counts[1] = 0; }   /* the derivative geometries stay: they belong to ctx.loadGlb's cache */
  function debug() {
    var dc = (mUnder ? 1 : 0); chunks.forEach(function (ch) { dc += (ch.counts[0] ? 1 : 0) + (ch.counts[1] ? 1 : 0); }); var seen = {}, familySamples = [];
    if (mats) for (var i = 0; i < N; i++) { var family = LOCK && LOCK.zone_family ? LOCK.zone_family[P[i].zone] : 'platinum'; if (!seen[family]) { seen[family] = true; familySamples.push({ index: i, id: P[i].id, zone: P[i].zone, family: family, x: P[i].x, z: P[i].z, tier: lodOf[i] === 0 ? 'L0' : sourceFar, color: '#' + cols[i].getHexString() }); } }
    return { tree_lock: !!LOCK, zone_family: LOCK ? LOCK.zone_family : null, trees: mats ? N : 0, lod_counts: { L0: counts[0], L1: counts[1], IMPOSTOR: 0 }, source_tiers: { near: 'L0', far: sourceFar }, same_material_all_tiers: true, runtime_impostor: false, impostor: false, runtime_bake_ms: 0, draw_calls: dc, zone_chunks: chunks.map(function (ch) { return { zone: ch.zone, trees: ch.members.length, L0: ch.counts[0], L1: ch.counts[1] }; }), lod_m: { near: near, mid: null }, hysteresis_m: HYST_NEAR, triangles_per_tree: { L0: triByLod[0], L1: triByLod[1] }, rendered_tree_triangles: Math.round(counts[0] * triByLod[0] + counts[1] * triByLod[1]), family_samples: familySamples, lifecycle: { transitions: transitions, rewrites: rewrites, timing_ms: Object.assign({}, timing), resources: { materials: treeMat ? 1 : 0, geometries: mats ? 2 : 0, render_targets: 0 } }, height_m: mats ? [+heightFor(variation.scale[0]).toFixed(2), +heightFor(variation.scale[1]).toFixed(2)] : null, underbrush: mUnder ? N : 0, night: night, skipped: skipped };
  }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug };
}
