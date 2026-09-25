/* MAHWORLD JOB B :: GUIDES — the optional flying Mr / Mrs Mah companions (registry artifacts GUIDE_MR_MAH / GUIDE_MRS_MAH → derivatives
   MR_MAH_GUIDE (static, one mesh) / MRS_MAH_GUIDE (skinned, 78 joints, no clips), level L0 only). build() loads nothing: the first
   setGuide('MR' | 'MRS') fetches that derivative through ctx.loadGlb, clones it (SkeletonUtils.clone for the skinned one, scene.clone(true)
   for the static one — the cached gltf.scene is never modified), scales it so its height = the artifact's scale.height_m (0.45 m, capped at
   2 × the 0.25 m player head), centres it on its own pivot and parks it under ctx.group. Behaviour is ROOT-LEVEL ONLY — the sources carry no
   clips, so no limb or facial motion is faked: the guide follows the player at a behind-left shoulder anchor (1.4 m, 0.7 rad off the back
   axis, 1.55 m up) through a critically damped smooth (rate 4/s), hovers with a 0.06 m / 1.1 Hz bob, banks slightly into its travel
   direction and always faces the player. Scenery: no collision, no damage, no target lock, no host state; the anchor is pushed out of the
   camera's clearance radius so it never sits in the lens, and it stays behind the player's shoulder line, off the forward attack axis.
   MOTION LANGUAGE (owner redirect 2026-09-19 §G, registry.guide_motion): controlled hover = two slow blended frequencies (never a jitter);
   drift + correction = a slow lateral wander of the anchor that the critically damped follow eases back; banking from travel velocity AND
   lateral acceleration; a SETTLE when the player idles (rises a little, looks around instead of staring); the lead when the player runs.
   setNight switches a small cyan Fresnel rim (emissiveIntensity 0.15 day → 0.4 night) on the cloned PBR material without a rebuild.
   exposeSkeleton() hands the skinned root to a future rig upgrade. Draw calls: 1 while a guide is shown, 0 otherwise. */
import { clone as skeletonClone } from '../../vendor/three/SkeletonUtils.js';

var IDS = { MR: 'GUIDE_MR_MAH', MRS: 'GUIDE_MRS_MAH' };                          /* short id → registry artifact id */
var FALLBACK_DERIV = { MR: 'MR_MAH_GUIDE', MRS: 'MRS_MAH_GUIDE' };               /* used only when the artifact record is missing */
var LABELS = { MR: 'Mr. Mah', MRS: 'Mrs. Mah' };
var HEIGHT_DEFAULT_M = 0.75, HEIGHT_CAP_M = 1.3;                                  /* owner interjection 2026-09-19: screen-presence target (≈ 3× the reference fairy); the registry sets the value, this caps it below a full humanoid */
var FOLLOW = { lateral_m: 0.78, trail_m: 0.38, up_m: 1.42, rate: 7, lead_s: 0.18, snap_beyond_m: 12, cam_clear_m: 1.6, floor_above_feet_m: 0.35, dist_m: 1.5, angle_rad: 1.2 };   /* owner next-pass 2026-09-20 §3: PLAYER-RELATIVE formation — immediately beside the LEFT shoulder (≈ 0.6–1.0 shoulder-widths lateral), a small trailing offset, shoulder / head level; dist_m / angle_rad are the pre-pass numbers kept for reference */
var ORIENT = { yaw_rate: 6, look_events_s: 0 };   /* orientation = the PLAYER'S HEADING (damped), never a constant lookAt(player); looks toward the player only while settled (idle look-around) or on explicit guide events */
var CBRAKE = { min_decel_mps2: 5, rad: 0.18, settle_s: 0.35 };   /* the companion version of the player's braking / settle language */
var HOVER = { amp_m: 0.05, hz: 0.9, amp2_m: 0.02, hz2: 0.37 };
var CAST = { rise_m: 0.42, pitch_rad: 0.22, bob_hz: 2.6, glow_m: 0.9, dispense_s: 0.9 };   /* owner B8 §10: the GUIDE CAST — root-level only (the asset has no clips): she rises, faces the manifest point, dips into a rhythmic cast bob, a fairy-blue square-diamond glow blooms at her front; a short lift pulse when she dispenses refills */
var DRIFT = { amp_m: 0.28, period_s: 6.5, correct_rate: 1.6 }; var SETTLE = { after_s: 2.5, rise_m: 0.12, look_hz: 0.11, look_rad: 0.55 }; var ACCEL_BANK = 0.05;
var BANK = { rad_per_mps: 0.12, max_rad: 0.3, yaw_rate: 8 };                      /* lean into travel; the facing yaw eases at yaw_rate/s */
var RIM = { color: 0xd9e2ff, day: 0.15, night: 0.4, power: 2.5 };                 /* cyan Fresnel rim (civic accent) — a rim, not a glow ball */
var MODEL_FRONT_YAW = 0;                                                          /* both derivatives face +z in model space (foot / face vertex distribution) → yaw = atan2(dx, dz) + this */
var ENV_INTENSITY = 0.5;                                                          /* same taming as the props: the derivative PBR stays as exported */
var MAX_DT = 0.1;

function findById(list, id) { list = list || []; for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i]; return null; }
function anisoOf(ctx) { try { var r = ctx.renderer; return Math.max(1, Math.min(8, r && r.capabilities && r.capabilities.getMaxAnisotropy ? r.capabilities.getMaxAnisotropy() : 8)); } catch (e) { return 1; } }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function wrapPi(a) { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; }
function round2(v) { return Math.round(v * 100) / 100; }
function normalizeId(id) { if (id === null || id === undefined || id === '' || id === false) return null; var s = String(id).toUpperCase().replace(/^GUIDE_/, '').replace(/_MAH$/, '').replace(/\./g, '').trim(); return IDS[s] ? s : (s === 'NONE' || s === 'OFF' ? null : s); }

/* critically damped smooth toward `target` (closed-form SmoothDamp, omega = rate); pos + vel are updated in place, no allocation */
function smoothDamp(pos, vel, target, omega, dt) {
  var x = omega * dt; var ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  var cx = pos.x - target.x, cy = pos.y - target.y, cz = pos.z - target.z;
  var tx = (vel.x + omega * cx) * dt, ty = (vel.y + omega * cy) * dt, tz = (vel.z + omega * cz) * dt;
  vel.x = (vel.x - omega * tx) * ex; vel.y = (vel.y - omega * ty) * ex; vel.z = (vel.z - omega * tz) * ex;
  pos.x = target.x + (cx + tx) * ex; pos.y = target.y + (cy + ty) * ex; pos.z = target.z + (cz + tz) * ex;
}

/* the model's own bounds from the GEOMETRY boxes (bind pose) — Box3.setFromObject on a SkinnedMesh goes through the skeleton's bone matrices,
   which are zero until the renderer's first skeleton.update(), so it would report a collapsed box for MRS */
function measure(THREE, obj) {
  var box = new THREE.Box3(); var tmp = new THREE.Box3(); obj.updateMatrixWorld(true);
  obj.traverse(function (o) { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); if (o.geometry.boundingBox) { tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(tmp); } } });
  return box;
}

export function createGuides(ctx) {
  var THREE = ctx.THREE; var log = ctx.log || function () { };
  var state = { built: false, shown: true, current: null, wanted: null, loaded: {}, loading: {}, materials: [], arts: {}, night: !!ctx.night, rimInjected: null,
    snapNext: true, ownT: 0, yaw: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), target: new THREE.Vector3(), idleT: 0, settleW: 0, lastVr: 0, accBank: 0, motionSrc: 'defaults', castW: 0, dispT: -99, lastDisp: null, casts: 0 };
  /* registry.guide_motion overrides the tuning (one source of truth for the species language) */
  (function () { var GM = ctx.registry && ctx.registry.guide_motion; if (!GM) return; var take = function (dst, src) { if (!src) return; Object.keys(dst).forEach(function (k) { if (typeof src[k] === 'number') dst[k] = src[k]; }); }; take(HOVER, GM.hover); take(DRIFT, GM.drift); take(SETTLE, GM.settle); take(FOLLOW, GM.follow); take(ORIENT, GM.orient || {}); take(CBRAKE, GM.companion_brake || {}); if (GM.bank) { if (typeof GM.bank.rad_per_mps === 'number') BANK.rad_per_mps = GM.bank.rad_per_mps; if (typeof GM.bank.max_rad === 'number') BANK.max_rad = GM.bank.max_rad; if (typeof GM.bank.accel_rad_per_mps2 === 'number') ACCEL_BANK = GM.bank.accel_rad_per_mps2; } state.motionSrc = 'registry.guide_motion'; })();

  function artOf(id) { return state.arts[id] || null; }
  function heightFor(id) { var a = artOf(id); var h = a && a.scale && a.scale.height_m > 0 ? +a.scale.height_m : HEIGHT_DEFAULT_M; return Math.min(h, HEIGHT_CAP_M); }
  function runtimeFor(id) {
    var a = artOf(id); var derivId = a && a.derivative ? a.derivative : FALLBACK_DERIV[id]; var deriv = findById(ctx.registry && ctx.registry.derivatives, derivId);
    if (!deriv) { log('guides ' + id + ': derivative "' + derivId + '" not in registry — skipped'); return null; }
    var f = deriv.files && deriv.files.L0; if (!f || !f.runtime) { log('guides ' + id + ': derivative ' + derivId + ' has no L0 file — skipped'); return null; }
    return { file: String(f.runtime), derivId: derivId, triangles: f.triangles || 0 };
  }

  /* the cyan rim: emissive × Fresnel, injected after the emissive chunk (r0.185 meshphysical: `normal` and `vViewPosition` are live there);
     if a future three build renames the chunk the material falls back to a plain uniform emissive at the same intensities */
  function rimShader(shader) {
    var tag = '#include <emissivemap_fragment>';
    if (shader.fragmentShader.indexOf(tag) < 0) { if (state.rimInjected !== false) { state.rimInjected = false; log('guides: emissive chunk not found — rim falls back to a uniform emissive'); } return; }
    shader.fragmentShader = shader.fragmentShader.replace(tag, tag + '\n\t{ float mahRim = 1.0 - saturate( dot( normalize( normal ), normalize( vViewPosition ) ) ); totalEmissiveRadiance *= pow( mahRim, ' + RIM.power.toFixed(2) + ' ); }');
    state.rimInjected = true;
  }
  function materialFor(src, id) {
    var m = src.clone(); m.name = 'MAHWORLD_GUIDE_' + id; m.envMapIntensity = ENV_INTENSITY; var an = anisoOf(ctx);
    if (m.map && m.map.anisotropy < an) m.map.anisotropy = an; if (m.normalMap && m.normalMap.anisotropy < an) m.normalMap.anisotropy = an;
    m.emissive = new THREE.Color(RIM.color); m.emissiveMap = null; m.emissiveIntensity = state.night ? RIM.night : RIM.day;
    m.onBeforeCompile = rimShader; m.customProgramCacheKey = function () { return 'mahworld_guide_rim_' + RIM.power; };
    m.needsUpdate = true; state.materials.push(m); return m;
  }

  /* clone → materials → measure → scale to height → centre on the pivot → root under ctx.group (hidden until show) */
  function prepare(id, gltf) {
    var skinned = false; gltf.scene.traverse(function (o) { if (o.isSkinnedMesh) skinned = true; });
    var model = skinned ? skeletonClone(gltf.scene) : gltf.scene.clone(true); model.name = 'GUIDE_' + id + '_MODEL';
    var meshes = [], skinnedMeshes = [];
    model.traverse(function (o) { if (o.isMesh) { meshes.push(o); if (o.isSkinnedMesh) skinnedMeshes.push(o); o.castShadow = false; o.receiveShadow = false; o.frustumCulled = true;
      if (Array.isArray(o.material)) o.material = o.material.map(function (m) { return materialFor(m, id); }); else if (o.material) o.material = materialFor(o.material, id); } });
    var box = measure(THREE, model); var size = box.isEmpty() ? new THREE.Vector3(0.44, 0.98, 0.2) : box.getSize(new THREE.Vector3()); if (box.isEmpty()) { box.min.set(-0.22, 0, -0.1); box.max.set(0.22, 0.98, 0.1); log('guides ' + id + ': empty bounds — assumed 0.98 m source height'); }
    var h = heightFor(id); var s = size.y > 1e-6 ? h / size.y : 1;
    var pivot = new THREE.Group(); pivot.name = 'GUIDE_' + id + '_PIVOT'; pivot.scale.setScalar(s); pivot.position.set(-(box.min.x + size.x / 2) * s, -(box.min.y + size.y / 2) * s, -(box.min.z + size.z / 2) * s); pivot.add(model);
    var root = new THREE.Group(); root.name = 'GUIDE_' + id; root.userData.noMerge = true; root.userData.guide = id; root.visible = false; root.add(pivot); ctx.group.add(root);
    if (skinnedMeshes.length) { var sm = skinnedMeshes[0]; model.userData.guideRig = { id: id, skinnedMesh: sm, skeleton: sm.skeleton || null, bones: sm.skeleton ? sm.skeleton.bones.length : 0, clips: (gltf.animations || []).length }; }
    var glow = null; try { var gc = document.createElement('canvas'); gc.width = gc.height = 96; var gg = gc.getContext('2d'); var gr = gg.createRadialGradient(48, 48, 2, 48, 48, 46); gr.addColorStop(0, 'rgba(235,252,255,0.95)'); gr.addColorStop(0.35, 'rgba(127,228,255,0.5)'); gr.addColorStop(1, 'rgba(60,160,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 96, 96); gg.strokeStyle = 'rgba(210,246,255,0.9)'; gg.lineWidth = 2.5; gg.beginPath(); gg.moveTo(48, 8); gg.lineTo(88, 48); gg.lineTo(48, 88); gg.lineTo(8, 48); gg.closePath(); gg.stroke(); var gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace; glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(CAST.glow_m, CAST.glow_m, 1); glow.position.set(0, h * 0.55, h * 0.45); glow.visible = false; glow.userData.vfx = true; root.add(glow); } catch (e) { glow = null; }
    return { id: id, root: root, pivot: pivot, model: model, meshes: meshes, skinned: skinnedMeshes, scale: s, height_m: h, source_height_m: size.y, glow: glow };
  }

  function hideAll() { Object.keys(state.loaded).forEach(function (k) { state.loaded[k].root.visible = false; }); }
  function show(id) { hideAll(); state.current = id; var inst = state.loaded[id]; inst.root.visible = state.shown; state.snapNext = true; }

  function build() {
    if (state.built) return; state.built = true;
    var arts = ctx.registry && ctx.registry.artifacts || [];
    Object.keys(IDS).forEach(function (k) { var a = findById(arts, IDS[k]); state.arts[k] = a; if (!a) log('guides: registry artifact ' + IDS[k] + ' missing → derivative ' + FALLBACK_DERIV[k] + ' / ' + HEIGHT_DEFAULT_M + ' m assumed'); else if (!(a.scale && a.scale.height_m > 0)) log('guides: ' + IDS[k] + ' has no scale.height_m → ' + HEIGHT_DEFAULT_M + ' m assumed'); });
    log('guides ready (lazy: MR ' + heightFor('MR') + ' m, MRS ' + heightFor('MRS') + ' m; nothing loaded until setGuide)');
  }

  /* select the companion ('MR' | 'MRS' | null); resolves with the guide root (or null) once it is on stage */
  function setGuide(id) {
    id = normalizeId(id);
    if (id === null) { hideAll(); state.current = null; state.wanted = null; return Promise.resolve(null); }
    if (!IDS[id]) { log('guides: unknown guide "' + id + '" (MR | MRS | null)'); return Promise.resolve(null); }
    state.wanted = id;
    if (state.loaded[id]) { show(id); return Promise.resolve(state.loaded[id].root); }
    if (state.loading[id]) return state.loading[id];
    var src = runtimeFor(id); if (!src) { if (state.wanted === id) state.wanted = null; return Promise.resolve(null); }
    var p = ctx.loadGlb(src.file).then(function (gltf) {
      var inst = prepare(id, gltf); state.loaded[id] = inst; delete state.loading[id];
      log('guides ' + id + ' loaded: ' + src.derivId + ' (' + (inst.skinned.length ? 'skinned, ' + inst.model.userData.guideRig.bones + ' bones, no clips' : 'static') + ', ' + inst.meshes.length + ' mesh, ' + src.triangles + ' tris, ' + round2(inst.source_height_m) + ' m → ' + inst.height_m + ' m)');
      if (state.wanted === id) show(id); return inst.root;
    }, function (e) { delete state.loading[id]; if (state.wanted === id) state.wanted = null; log('guides ' + id + ' load FAILED: ' + (e && e.message || e)); return null; });
    state.loading[id] = p; return p;
  }
  function setVisible(v) { state.shown = !!v; var inst = state.current && state.loaded[state.current]; if (inst) { inst.root.visible = state.shown; if (state.shown) state.snapNext = true; } }
  function visible() { return state.shown; }
  function current() { return state.current; }
  function onStage() { var inst = state.current && state.loaded[state.current]; return !!(inst && state.shown && inst.root.visible); }

  /* root-level follow: anchor behind-left of the heading → camera clearance → critically damped smooth → floor → face the player → bank + bob */
  function tick(dt, t) {
    var inst = state.current && state.loaded[state.current]; if (!inst || !state.shown) return;
    dt = dt > 0 ? Math.min(dt, MAX_DT) : 0; state.ownT += dt; var time = (typeof t === 'number' && isFinite(t)) ? t : state.ownT;
    var p = ctx.playerPos(); if (!p) return; var h = +ctx.playerHeading() || 0;
    var snapE = ctx.snapshot ? ctx.snapshot() : null; var eqv = snapE && snapE.equipment; var castT = eqv && eqv.casting ? 1 : 0; if (castT && state.castW < 0.05) state.casts++; state.castW += (castT - state.castW) * Math.min(1, dt * (castT ? 7 : 3)); if (eqv && eqv.dispensed_at && eqv.dispensed_at !== state.lastDisp) { state.lastDisp = eqv.dispensed_at; state.dispT = time; } var dispW = time - state.dispT < CAST.dispense_s ? Math.sin(Math.PI * (time - state.dispT) / CAST.dispense_s) : 0;
    /* the player's own travel velocity (smoothed) leads the anchor so the guide runs WITH the player instead of trailing into the camera */
    var pv = state.pv || (state.pv = { x: 0, z: 0, lx: p.x, lz: p.z }); if (dt > 0) { var ix = (p.x - pv.lx) / dt, iz = (p.z - pv.lz) / dt; if (Math.abs(ix) < 40 && Math.abs(iz) < 40) { pv.x += (ix - pv.x) * Math.min(1, dt * 8); pv.z += (iz - pv.z) * Math.min(1, dt * 8); } pv.lx = p.x; pv.lz = p.z; }
    var pspd = Math.hypot(pv.x, pv.z); if (pspd < 0.2) state.idleT += dt; else state.idleT = 0; var settleT = state.idleT > SETTLE.after_s ? 1 : 0; state.settleW += (settleT - state.settleW) * Math.min(1, dt * 1.2);   /* SETTLE: eased in after the player idles, eased out on the first step */
    var drift = DRIFT.amp_m * Math.sin(time * 2 * Math.PI / DRIFT.period_s) * (0.4 + 0.6 * state.settleW);   /* DRIFT: a slow lateral wander of the anchor (fuller while settled), the damped follow is the correction */
    var tg = state.target; var fx = Math.sin(h), fz = -Math.cos(h);   /* the player's forward (client frame: yaw 0 faces −Z) */ var rx = Math.cos(h), rz = Math.sin(h);   /* the player's right = forward × up */
    var lat = -(FOLLOW.lateral_m + Math.max(0, (heightFor(state.current) - 0.75)) * 0.4);   /* on the LEFT shoulder; a taller guide sits a little further out so it never clips */
    tg.set(p.x + rx * (lat + drift) - fx * FOLLOW.trail_m + pv.x * FOLLOW.lead_s, p.y + FOLLOW.up_m + SETTLE.rise_m * state.settleW + CAST.rise_m * state.castW + 0.25 * dispW, p.z + rz * (lat + drift) - fz * FOLLOW.trail_m + pv.z * FOLLOW.lead_s);   /* B8: the cast lifts her; a dispense gives a short lift pulse */
    var c = ctx.cameraPos ? ctx.cameraPos() : null;
    if (c) { var dx = tg.x - c.x, dy = tg.y - c.y, dz = tg.z - c.z; var d2 = dx * dx + dy * dy + dz * dz; var clear = FOLLOW.cam_clear_m;
      if (d2 < clear * clear) { var dh = Math.sqrt(dx * dx + dz * dz); if (dh < 1e-4) { dx = -Math.sin(h); dz = Math.cos(h); dh = 1; } var push = clear - Math.sqrt(d2); tg.x += dx / dh * push; tg.z += dz / dh * push; } }
    var pos = state.pos, vel = state.vel;
    if (state.snapNext || pos.distanceToSquared(tg) > FOLLOW.snap_beyond_m * FOLLOW.snap_beyond_m) { pos.copy(tg); vel.set(0, 0, 0); state.snapNext = false; state.yaw = Math.atan2(p.x - pos.x, p.z - pos.z) + MODEL_FRONT_YAW; }
    else smoothDamp(pos, vel, tg, FOLLOW.rate * (1 + 0.03 * Math.min(30, pspd)), dt);   /* the spring stiffens with the player's speed (flight): the formation holds at cruise instead of trailing */
    var floor = p.y + FOLLOW.floor_above_feet_m; if (pos.y < floor) { pos.y = floor; if (vel.y < 0) vel.y = 0; }
    /* ORIENTATION: the player's heading (travel direction while moving) — smooth damped, a tiny lag in turns; settled: a slow look-around that glances toward the player */ var travelYaw = pspd > 0.6 ? Math.atan2(pv.x, pv.z) : (Math.PI - h);   /* the model faces +z at yaw 0, the player's client yaw 0 faces −Z */ var toPlayer = Math.atan2(p.x - pos.x, p.z - pos.z); var lookMix = state.settleW * (0.5 + 0.5 * Math.sin(time * 2 * Math.PI * SETTLE.look_hz)); var yawT = travelYaw + MODEL_FRONT_YAW + wrapPi(toPlayer - travelYaw) * lookMix * 0.6 + SETTLE.look_rad * state.settleW * Math.sin(time * 2 * Math.PI * SETTLE.look_hz * 0.7); if (state.castW > 0.02) { var mfx = p.x + fx * 0.95, mfz = p.z + fz * 0.95; var castYaw = Math.atan2(mfx - pos.x, mfz - pos.z) + MODEL_FRONT_YAW; yawT = yawT + wrapPi(castYaw - yawT) * state.castW; }   /* casting: she faces the manifest point in front of the player */ state.yaw += wrapPi(yawT - state.yaw) * Math.min(1, ORIENT.yaw_rate * dt);
    /* COMPANION BRAKE: when the player decelerates hard, a small forward absorb that settles (the species version of the flight brake) */ var pAcc = dt > 0 ? (pspd - (state.lastPspd === undefined ? pspd : state.lastPspd)) / dt : 0; state.lastPspd = pspd; if (pAcc < -CBRAKE.min_decel_mps2 && state.cbT === undefined) state.cbT = 0; if (state.cbT !== undefined) { state.cbT += dt; var cbu = state.cbT / CBRAKE.settle_s; state.cbrake = cbu < 0.3 ? cbu / 0.3 : Math.max(0, 1 - (cbu - 0.3) / 0.7); if (cbu >= 1) { state.cbT = undefined; state.cbrake = 0; } } else state.cbrake = 0;
    var sy = Math.sin(state.yaw), cy = Math.cos(state.yaw); var vf = vel.x * sy + vel.z * cy, vr = vel.x * cy - vel.z * sy;   /* travel speed along the guide's own front / right */
    var accLat = dt > 0 ? (vr - state.lastVr) / dt : 0; state.lastVr = vr; if (Math.abs(accLat) > 60) accLat = 0; state.accBank += (clamp(-accLat * ACCEL_BANK, -BANK.max_rad, BANK.max_rad) - state.accBank) * Math.min(1, dt * 5);   /* BANK: lateral acceleration leans her into the correction (eased, no jitter) */
    var pitch = clamp(vf * BANK.rad_per_mps + (state.cbrake || 0) * CBRAKE.rad, -BANK.max_rad - 0.2, BANK.max_rad + 0.2), roll = clamp(-vr * BANK.rad_per_mps + state.accBank, -BANK.max_rad, BANK.max_rad);
    var hover = HOVER.amp_m * Math.sin(time * HOVER.hz * Math.PI * 2) + HOVER.amp2_m * Math.sin(time * HOVER.hz2 * Math.PI * 2 + 1.3);   /* HOVER: two blended slow frequencies = a controlled float, never a jitter */
    var castBob = state.castW * (0.5 + 0.5 * Math.sin(time * CAST.bob_hz * Math.PI * 2)); pitch += CAST.pitch_rad * castBob;   /* the cast: a rhythmic forward dip at the cast cadence */ var root = inst.root; root.position.set(pos.x, pos.y + hover, pos.z); root.rotation.set(pitch, state.yaw, roll, 'YXZ'); if (inst.glow) { var gw = Math.max(state.castW, dispW); inst.glow.visible = gw > 0.02; inst.glow.material.opacity = 0.85 * gw; var gs = CAST.glow_m * (0.7 + 0.45 * castBob + 0.3 * dispW); inst.glow.scale.set(gs, gs, 1); inst.glow.material.rotation = time * 1.6; }
  }

  function setNight(n) { state.night = !!n; var v = state.night ? RIM.night : RIM.day; for (var i = 0; i < state.materials.length; i++) state.materials[i].emissiveIntensity = v; }

  /* rig hook: the skinned root (the cloned Armature with its SkinnedMesh + Skeleton; userData.guideRig holds the refs) — null for the static
     Mr. Mah or while nothing skinned is loaded. Presentation only: no clips exist today, nothing here plays one. */
  function exposeSkeleton(id) { id = normalizeId(id === undefined ? state.current : id); var inst = id && state.loaded[id]; if (!inst || !inst.skinned.length) return null; return inst.model; }

  function dispose() { Object.keys(state.loaded).forEach(function (k) { var inst = state.loaded[k]; if (inst.root.parent) inst.root.parent.remove(inst.root); }); state.materials.forEach(function (m) { try { m.dispose(); } catch (e) { } }); state.materials.length = 0; state.loaded = {}; state.loading = {}; state.current = null; state.wanted = null; }
  function options() { return Object.keys(IDS).map(function (k) { return { id: k, label: LABELS[k], artifact: IDS[k], height_m: heightFor(k), loaded: !!state.loaded[k] }; }); }
  function debug() {
    var inst = state.current && state.loaded[state.current];
    return { current: state.current, visible: state.shown, on_stage: onStage(), height_m: state.current ? heightFor(state.current) : heightFor('MR'), wanted: state.wanted, loaded: Object.keys(state.loaded), loading: Object.keys(state.loading),
      skinned: inst ? inst.skinned.length > 0 : null, scale: inst ? round2(inst.scale) : null, night: state.night, rim: state.rimInjected, draw_calls: inst && inst.root.visible ? inst.meshes.length : 0,
      pos: inst ? [round2(state.pos.x), round2(state.pos.y), round2(state.pos.z)] : null, yaw_deg: inst ? Math.round(state.yaw * 180 / Math.PI) : null, follow: FOLLOW, orient: ORIENT, companion_brake: CBRAKE, hover: HOVER, drift: DRIFT, settle: SETTLE, bank: BANK, formation: inst ? { lateral_m: round2(Math.hypot(state.pos.x - ctx.playerPos().x, state.pos.z - ctx.playerPos().z)), yaw_vs_player_deg: Math.round(wrapPi(state.yaw - MODEL_FRONT_YAW - (Math.PI - (+ctx.playerHeading() || 0))) * 180 / Math.PI) } : null, accel_bank: ACCEL_BANK, settled: round2(state.settleW), idle_s: round2(state.idleT), motion_source: state.motionSrc, cast: { weight: round2(state.castW), casts_seen: state.casts, tuning: CAST } };
  }

  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug, setGuide: setGuide, setVisible: setVisible, visible: visible, current: current, onStage: onStage, exposeSkeleton: exposeSkeleton, options: options };
}
