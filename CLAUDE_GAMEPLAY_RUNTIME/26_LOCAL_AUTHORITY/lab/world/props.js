/* MAHWORLD JOB B :: PROPS — registry artifacts that ship as a derivative GLB and stand at a FIELD position (today: the
   PROJECTOR_GYM_BEACON beside the gym approach), plus the room-prop helper the interior builder calls for the artifacts that carry a
   `room` (GYM_BARBELL_PLATFORM, GYM_DUMBBELL_BENCH_W / _E → createRoomProps(ctx, roomId, roomGroup)). Every prop: derivative L0 near,
   L1 beyond lod.far_m through THREE.LOD (the renderer updates it — no tick, no per-frame work here), scaled so target_height_m (or
   target_length_m = the longest side, laid along x) is met, bottom-centre on the registry position, yaw_deg around +y, receives the sun
   shadow but never casts (phone tier), keeps the derivative's PBR (metalness 0 / roughness 0.5 as exported) with envMapIntensity 0.5.
   The projector's display carries a cyan hologram emissive (0.35 day / 0.9 night, switched by setNight without a rebuild) and stands on
   a thin graphite ground pad. Colliders come from worldLayout.artifactColliders (BOX_FROM_BOUNDS) — nothing here registers a shape.
   Presentation only: no player, camera, HUD, combat or host state. Draw calls at rest: 1 per placed prop (one LOD level visible) + 1 pad. */

var ENV_INTENSITY = 0.5;                                   /* the derivative PBR stays as exported; only the environment reflection is tamed */
var PAD_T = 0.02, PAD_MARGIN_M = 0.35, PAD_SEGMENTS = 48;  /* graphite ground disc under the projector */
var HOLO = { color: 0x3fb8ff, day: 0.35, night: 0.9, weightByAlbedo: true };   /* weightByAlbedo: the glow follows the base-colour texture (bright display glows, graphite body does not) — the derivative is one primitive, so this is the only way to keep the glow "on the display"; false = uniform emissive over the whole mesh */
var DISPLAY_RE = /display|screen|holo|panel/i;             /* if a future re-export splits the display into its own mesh, only that mesh gets the hologram */
var LOD_HYSTERESIS = 0.05;

function findDerivative(ctx, id) { var list = ctx.registry && ctx.registry.derivatives || []; for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i]; return null; }
function fileOf(deriv, level) { var f = deriv && deriv.files && level ? deriv.files[level] : null; return f && f.runtime ? String(f.runtime) : null; }
function anisoOf(ctx) { try { var r = ctx.renderer; return Math.max(1, Math.min(8, r && r.capabilities && r.capabilities.getMaxAnisotropy ? r.capabilities.getMaxAnisotropy() : 8)); } catch (e) { return 1; } }
function round2(v) { return Math.round(v * 100) / 100; }
function boxToRec(b) { return { min: [round2(b.min.x), round2(b.min.y), round2(b.min.z)], max: [round2(b.max.x), round2(b.max.y), round2(b.max.z)] }; }

/* one cloned material per (source material, variant): the cached gltf.scene stays untouched and both dumbbells share a single clone */
function materialFor(ctx, state, src, variant) {
  var key = src.uuid + '|' + variant; if (state.matCache[key]) return state.matCache[key];
  var m = src.clone(); m.envMapIntensity = ENV_INTENSITY; var an = anisoOf(ctx);
  if (m.map && m.map.anisotropy < an) m.map.anisotropy = an; if (m.normalMap && m.normalMap.anisotropy < an) m.normalMap.anisotropy = an;
  if (variant === 'holo') { m.emissive = new ctx.THREE.Color(HOLO.color); m.emissiveIntensity = ctx.night ? HOLO.night : HOLO.day; if (HOLO.weightByAlbedo && m.map && !m.emissiveMap) m.emissiveMap = m.map; state.holo.push(m); }
  m.userData.propVariant = variant; m.needsUpdate = true; state.matCache[key] = m; state.materials.push(m); return m;
}

/* clone one LOD level of a derivative, apply shadows + materials, and measure it (identity transform, so the box is the model's own bounds) */
function prepareLevel(ctx, gltf, art, state) {
  var THREE = ctx.THREE; var obj = gltf.scene.clone(true); var meshes = [], display = []; var holoProp = art.id === 'PROJECTOR_GYM_BEACON';
  obj.traverse(function (o) { if (o.isMesh) { meshes.push(o); if (DISPLAY_RE.test(o.name || '')) display.push(o); } });
  var holoSet = holoProp ? (display.length ? display : meshes) : [];
  meshes.forEach(function (o) { o.castShadow = false; o.receiveShadow = true; o.frustumCulled = true; var variant = holoSet.indexOf(o) >= 0 ? 'holo' : 'std';
    if (Array.isArray(o.material)) o.material = o.material.map(function (m) { return materialFor(ctx, state, m, variant); }); else if (o.material) o.material = materialFor(ctx, state, o.material, variant); });
  obj.updateMatrixWorld(true); var box = new THREE.Box3().setFromObject(obj); return { obj: obj, box: box, meshes: meshes.length };
}
function scaleFor(art, size) {
  if (art.target_height_m > 0 && size.y > 1e-6) return art.target_height_m / size.y;
  var longest = Math.max(size.x, size.y, size.z); if (art.target_length_m > 0 && longest > 1e-6) return art.target_length_m / longest;
  return 1;
}

/* place ONE artifact under `parent`: THREE.LOD (L0 at 0, L1 at lod.far_m) at the registry position / yaw, each level scaled and lifted so the
   bottom-centre of the L0 bounds sits exactly on the position (+ `lift`, the pad thickness when the prop stands on a pad) */
function placeArtifact(ctx, art, parent, state, lift) {
  var THREE = ctx.THREE; var id = art && art.id || '?';
  if (!art || !Array.isArray(art.position) || art.position.length < 3) { ctx.log('props ' + id + ': no position — skipped'); return Promise.resolve(null); }
  var deriv = findDerivative(ctx, art.derivative); if (!deriv) { ctx.log('props ' + id + ': derivative "' + art.derivative + '" not in registry — skipped'); return Promise.resolve(null); }
  var lodCfg = art.lod || {}; var nearFile = fileOf(deriv, lodCfg.near || 'L0') || fileOf(deriv, 'L0'); var farFile = fileOf(deriv, lodCfg.far || 'L1');
  var farM = lodCfg.far_m > 0 ? lodCfg.far_m : ((ctx.quality && ctx.quality.get && ctx.quality.get().lod_far_m) || 60);
  if (!nearFile) { ctx.log('props ' + id + ': derivative ' + deriv.id + ' has no near file — skipped'); return Promise.resolve(null); }
  var nearP = ctx.loadGlb(nearFile);
  var farP = farFile && farFile !== nearFile ? ctx.loadGlb(farFile).catch(function (e) { ctx.log('props ' + id + ': far LOD failed (' + (e && e.message || e) + ') — L0 only'); return null; }) : Promise.resolve(null);
  return Promise.all([nearP, farP]).then(function (r) {
    var near = prepareLevel(ctx, r[0], art, state); var size = near.box.getSize(new THREE.Vector3()); var c = near.box.getCenter(new THREE.Vector3()); var s = scaleFor(art, size);
    var alignYaw = (art.target_length_m > 0 && size.z > size.x) ? Math.PI / 2 : 0;   /* length props lie along x before yaw_deg is applied */
    var lod = new THREE.LOD(); lod.name = 'PROP_' + id; lod.autoUpdate = true; lod.userData.artifact = id; lod.userData.noMerge = true;
    lod.position.set(art.position[0], art.position[1] + (lift || 0), art.position[2]); lod.rotation.y = (art.yaw_deg || 0) * Math.PI / 180;
    function fit(level) { level.obj.scale.setScalar(s); level.obj.position.set(-c.x * s, -near.box.min.y * s, -c.z * s); if (!alignYaw) return level.obj; var g = new THREE.Group(); g.rotation.y = alignYaw; g.add(level.obj); return g; }
    lod.addLevel(fit(near), 0, LOD_HYSTERESIS);
    if (r[1]) { var far = prepareLevel(ctx, r[1], art, state); lod.addLevel(fit(far), farM, LOD_HYSTERESIS); }   /* the far level uses the near bounds so both levels stand on the same point */
    parent.add(lod); lod.updateMatrixWorld(true); var wb = new THREE.Box3().setFromObject(lod.levels[0].object);
    var rec = { id: id, derivative: deriv.id, scale: +s.toFixed(4), footprint_m: [round2(size.x * s), round2(size.z * s)], height_m: round2(size.y * s), yaw_deg: art.yaw_deg || 0, levels: lod.levels.map(function (l) { return l.distance; }), meshes: near.meshes, bounds: boxToRec(wb) };
    if (art.room) rec.room = art.room;
    state.lods.push(lod); state.records.push(rec); return rec;
  }).catch(function (e) { ctx.log('props ' + id + ': FAILED ' + (e && e.message || e)); return null; });
}
function newState() { return { lods: [], pads: [], records: [], holo: [], materials: [], matCache: {} }; }
function applyNight(state, night) { var v = night ? HOLO.night : HOLO.day; for (var i = 0; i < state.holo.length; i++) state.holo[i].emissiveIntensity = v; }
function disposeState(state) {
  state.lods.forEach(function (l) { if (l.parent) l.parent.remove(l); }); state.pads.forEach(function (p) { if (p.parent) p.parent.remove(p); if (p.geometry) p.geometry.dispose(); });
  state.materials.forEach(function (m) { try { m.dispose(); } catch (e) { } });   /* clones only — geometries and textures belong to the shared gltf cache */
  state.lods.length = 0; state.pads.length = 0; state.records.length = 0; state.holo.length = 0; state.materials.length = 0; state.matCache = {};
}

/* FIELD props: artifacts with a derivative and a position that are NOT room-bound (rooms are the interior builder's, through createRoomProps) */
export function createProps(ctx) {
  var THREE = ctx.THREE; var state = newState();
  function fieldArtifacts() { return (ctx.registry && ctx.registry.artifacts || []).filter(function (a) { return a && a.derivative && Array.isArray(a.position) && !a.room; }); }
  function addPad(rec, art) {
    var r = Math.max(rec.footprint_m[0], rec.footprint_m[1]) / 2 + PAD_MARGIN_M; var geo = new THREE.CylinderGeometry(r, r, PAD_T, PAD_SEGMENTS);
    var pad = new THREE.Mesh(geo, ctx.M.graphite); pad.name = 'PROP_PAD_' + art.id; pad.position.set(art.position[0], art.position[1] + PAD_T / 2, art.position[2]); pad.castShadow = false; pad.receiveShadow = true; pad.userData.noMerge = true;
    ctx.group.add(pad); state.pads.push(pad); rec.pad_r_m = round2(r);
  }
  return {
    build: function () {
      if (!ctx.registry) { ctx.log('props: no registry — nothing placed'); return Promise.resolve(); }
      var list = fieldArtifacts(); if (!list.length) ctx.log('props: no field artifacts with a derivative + position');
      return Promise.all(list.map(function (art) { var pad = art.id === 'PROJECTOR_GYM_BEACON'; return placeArtifact(ctx, art, ctx.group, state, pad ? PAD_T : 0).then(function (rec) { if (rec && pad) addPad(rec, art); return rec; }); }))
        .then(function (recs) { var ok = recs.filter(Boolean); ctx.log('props: ' + ok.length + ' placed (' + ok.map(function (r) { return r.id; }).join(', ') + ')'); });
    },
    setNight: function (n) { applyNight(state, !!n); },
    dispose: function () { disposeState(state); },
    debug: function () { return { placed: state.records.slice(), pads: state.pads.length, draw_calls_at_rest: state.lods.length + state.pads.length, hologram_materials: state.holo.length, night: !!ctx.night }; },
    roomProps: function (roomId, roomGroup) { return createRoomProps(ctx, roomId, roomGroup); }
  };
}

/* ROOM props: called by the interior builder with the room's group — places the artifacts whose `room === roomId` (room-local metres:
   GYM_BARBELL_PLATFORM at [0, 0.25, -7] with its 2.2 m longest side along x, GYM_DUMBBELL_BENCH_W / _E at 0.55 m with their yaw).
   Resolves to a handle { placed, setNight(n), dispose(), debug() }; the caller owns roomGroup's lifetime. */
export function createRoomProps(ctx, roomId, roomGroup) {
  var state = newState(); var handle = { placed: state.records, setNight: function (n) { applyNight(state, !!n); }, dispose: function () { disposeState(state); }, debug: function () { return { room: roomId, placed: state.records.slice(), draw_calls_at_rest: state.lods.length }; } };
  if (!ctx || !ctx.registry || !roomGroup) { if (ctx && ctx.log) ctx.log('props room ' + roomId + ': ' + (!roomGroup ? 'no room group' : 'no registry') + ' — nothing placed'); return Promise.resolve(handle); }
  var list = (ctx.registry.artifacts || []).filter(function (a) { return a && a.derivative && a.room === roomId && Array.isArray(a.position); });
  if (!list.length) { ctx.log('props room ' + roomId + ': no room artifacts'); return Promise.resolve(handle); }
  return Promise.all(list.map(function (art) { return placeArtifact(ctx, art, roomGroup, state, 0); })).then(function (recs) { ctx.log('props room ' + roomId + ': ' + recs.filter(Boolean).length + ' placed'); return handle; });
}
