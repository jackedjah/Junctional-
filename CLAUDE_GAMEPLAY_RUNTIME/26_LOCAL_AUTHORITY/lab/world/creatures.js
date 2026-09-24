/* MAHWORLD JOB B :: CREATURES — the CLIENT presentation of the Dogkie creatures the host publishes in the snapshot as
   p.creatures = [{ id, species:'DOGKIE', position:{x,z}, y, facing, state, speed_mps, hp, max, ko, attack_t, hit_ago_s, active }].
   Presentation only: the host owns spawning, AI, HP and every rule — this file draws what it says and writes no host state.
   One derivative GLB (registry.derivatives DOGKIE_FOREST_CREATURE L0 — skinned, 55 joints, NO clips) is loaded once through ctx.loadGlb;
   every published creature is a SkeletonUtils.clone scaled so its rest height = registry.creatures.DOGKIE.height_m (1.25 m), kept in a
   map id → figure, removed when its id disappears. There are no animation clips, so the motion set is procedural on the skeleton: the bone
   names are classified ONCE at load (head / neck / jaw, spine chain, tail chain, four legs by name + rest position — left / right by the
   side token or lateral sign, front / back by where the paw stands along the hips→head axis) and every pose is a small rotation about the
   creature's own lateral / vertical / forward axes, pre-expressed in each bone's parent frame (rest-pose conjugation) so the rig's arbitrary
   local bone axes never matter. The Tripo rig is a biped skeleton auto-fitted to a quadruped (its "arms" are the front legs, its forward is
   +z, it has no jaw and no tail bone, and its hind knee is zero-length) — all of that is detected, logged and handled, never assumed.
   States → IDLE breathing + slow head sway · ROAM / CHASE trot (diagonal pairs, ±0.35 rad hip swing, knee fold on the swing leg, 2× body
   bob, tail sway; CHASE lower + wider) · TURN eased yaw (10/s, 720°/s cap) with a head lead · ATTACK lunge / bite over attack_t (load →
   thrust: neck / head forward, front legs reach, jaw open) · HIT recoil decaying over 0.3 s · KO sag to the ground, legs folded, 35 %
   opacity · RESPAWN scale-in over 0.6 s · DORMANT (active false) frozen neutral idle with no bone work, and beyond 90 m from the camera the
   figure is not updated at all. Position / facing render ~120 ms behind the estimated host clock by linear interpolation between snapshot
   samples (the scheme PresentationAdapter uses: host_t + filtered wall offset, 6 m teleport / RESPAWN resets the buffer) — no pops.
   Tag: a tiny world sprite 'DOGKIE · LV 1' (one shared canvas texture) + a thin cyan hp fill, shown only while hp < max (hidden on KO so
   the body fade reads clean). Nothing from the HUD is reused. setNight switches a faint albedo-weighted crystalline self-light (no rebuild).
   Draw calls: 1 per visible creature (one skinned primitive, one material) + 2 sprites per damaged visible creature; no per-frame allocation. */
import { clone as skeletonClone } from '../../vendor/three/SkeletonUtils.js';

var SPECIES = 'DOGKIE', DERIVATIVE_FALLBACK = 'DOGKIE_FOREST_CREATURE', HEIGHT_FALLBACK_M = 1.25;
var LAG_S = 0.12, TELEPORT_M = 6, SAMPLES = 10, CLOCK_FILTER = 0.15;   /* presentation lag + sample buffer (same shape as PresentationAdapter's) */
var DORMANT_SKIP_M = 90, VIS_M = 240; var LOD_M = [24, 60];   /* skinned LOD: L0 (18.6 k tris) inside 24 m, L1 (6.5 k) to 60 m, L2 (2.6 k) beyond — the L1 / L2 derivatives carry the identical skeleton, so every LOD mesh binds to the ONE cloned skeleton the poses drive */                                 /* budget: dormant figures beyond 90 m are not updated; nothing draws beyond VIS_M */
var STRIDE_M = 0.9, GAIT_HZ_MIN = 0.8, GAIT_HZ_MAX = 3.2, HIP_SWING = 0.35, KNEE_FLEX = 0.55, CHASE_GAIN = 0.2, MOVING_MPS = 0.25; var HOVER_M = 0.07, LIFT_M = 0.28;   /* B8 §4: the glide hover and the attack lift (metres) */
var TURN_RATE = 10, TURN_CAP_DPS = 720, HEAD_LEAD = 0.5, HEAD_LEAD_MAX = 0.4;
var HIT_S = 0.3, KO_OPACITY = 0.35, KO_RATE = 3, KO_SAG_M = 0.28, RESPAWN_S = 0.6, BLEND_RATE = 8, ATTACK_RATE = 16;
var ENV_INTENSITY = 0.5, CAST_SHADOW = false;                          /* the derivative PBR stays as exported (phone tier: receives, never casts) */
var GLOW = { color: 0x3fb8ff, day: 0.0, night: 0.2 };                  /* faint crystalline self-light at night, weighted by the albedo map; switched by setNight */
import { createEntityStatus } from './entityStatus.js'; import { groundYAt } from './worldLayout.js';
var TAG = { lift_m: 0.2, tint: '#4fd8ff', name: 'DOGKIE' };   /* owner B7 §3: the shared overhead status (NAME · LV · HP) replaces the damaged-only label sprite; a Dogkie always shows its level / health while active nearby */
var STATUS_LEVEL_FALLBACK = 5;
var DEG = Math.PI / 180, TWO_PI = Math.PI * 2;
var RE = {  /* bone-name heuristics (VRM / Tripo J_Bip_*, mixamo, Blender and generic tokens) */
  head: /head/i, notHead: /eye|jaw|hair|ear|top|_end$/i, neck: /neck/i, jaw: /jaw|mouth/i, hips: /hips|pelvis/i, spine: /spine|chest|torso/i, tail: /tail/i,
  top: /upper_?arm|upper_?leg|thigh|femur|humerus/i, mid: /lower_?arm|lower_?leg|forearm|shin|calf|knee|elbow|radius|tibia/i, end: /hand|foot|paw|wrist|ankle/i,
  digit: /thumb|index|middle|ring|little|pinky|finger|toe/i, left: /left|(^|[_.\-\s])l([_.\-\s]|$)/i, right: /right|(^|[_.\-\s])r([_.\-\s]|$)/i
};
var LEG_KEYS = ['FL', 'FR', 'BL', 'BR'];   /* trot: diagonal pairs (FL + BR) and (FR + BL) */

function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth(u) { u = clamp01(u); return u * u * (3 - 2 * u); }
function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
function nowS() { return (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) / 1000; }
function hostTime(p) { var v = p.host_t; if (typeof v !== 'number' || !isFinite(v)) v = p.t; return typeof v === 'number' && isFinite(v) ? v : null; }
function hashSeed(id) { var s = 2166136261, str = String(id); for (var i = 0; i < str.length; i++) { s ^= str.charCodeAt(i); s = Math.imul(s, 16777619) >>> 0; } return (s % 1000) / 1000 * TWO_PI; }
function lunge(a) { if (a < 0.28) return 0; if (a < 0.5) return smooth((a - 0.28) / 0.22); if (a < 0.7) return 1; return 1 - smooth((a - 0.7) / 0.3); }   /* thrust profile over attack_t */
function windup(a) { return a < 0.34 ? Math.sin(Math.PI * a / 0.34) : 0; }                                                                         /* load bump before the thrust */
function findDerivative(reg, id) { var list = reg && reg.derivatives || []; for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i]; return null; }

/* ---------- skeleton classification (once, on the cached source scene; read-only) ---------- */
function classifySkeleton(THREE, root, log) {
  var bones = []; root.updateMatrixWorld(true); root.traverse(function (o) { if (o.isBone) bones.push(o); });
  var pos = bones.map(function (b) { return b.getWorldPosition(new THREE.Vector3()); });
  var box = new THREE.Box3().setFromObject(root); var size = box.getSize(new THREE.Vector3()); var height = size.y > 1e-6 ? size.y : 1;
  var idx = function (b) { return bones.indexOf(b); }; var P = function (b) { return pos[idx(b)]; };
  var depth = function (b) { var d = 0; while (b.parent && b.parent.isBone) { b = b.parent; d++; } return d; }; var byDepth = function (a, b) { return depth(a) - depth(b); };
  var find = function (re, excl) { for (var i = 0; i < bones.length; i++) if (re.test(bones[i].name) && !(excl && excl.test(bones[i].name))) return bones[i]; return null; };
  var all = function (re, excl) { return bones.filter(function (b) { return re.test(b.name) && !(excl && excl.test(b.name)); }).sort(byDepth); };
  var boneKids = function (b) { return b.children.filter(function (c) { return c.isBone; }); };
  var desc = function (b, re, excl) { var q = boneKids(b); while (q.length) { var c = q.shift(); if (re.test(c.name) && !(excl && excl.test(c.name))) return c; q = q.concat(boneKids(c)); } return null; };
  var missing = [], notes = [];
  var hips = find(RE.hips); if (!hips) { for (var i = 0; i < bones.length; i++) if (boneKids(bones[i]).length >= 2) { hips = bones[i]; notes.push('hips by branching (' + hips.name + ')'); break; } }
  if (!hips) hips = bones[0] || null; var rootBone = hips && hips.parent && hips.parent.isBone ? hips.parent : null;
  var head = find(RE.head, RE.notHead); if (!head) { var hy = -1; bones.forEach(function (b) { if (!RE.top.test(b.name) && !RE.mid.test(b.name) && !RE.end.test(b.name) && !RE.digit.test(b.name) && P(b).y > hy) { hy = P(b).y; head = b; } }); if (head) notes.push('head = highest bone (' + head.name + ')'); }
  var neck = find(RE.neck), jaw = find(RE.jaw); var spine = all(RE.spine, RE.hips), tail = all(RE.tail);
  if (!head) missing.push('head'); if (!neck) missing.push('neck'); if (!jaw) missing.push('jaw'); if (!spine.length) missing.push('spine'); if (!tail.length) missing.push('tail');
  /* creature frame in model space: forward = hips → head (snapped to the dominant axis: a head x-offset must not skew the whole body), lateral = up × forward */
  var up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(0, 0, -1);
  if (head && hips) { var v = P(head).clone().sub(P(hips)); v.y = 0; if (v.length() > 0.02 * height) fwd.copy(v); }
  if (Math.abs(fwd.x) > Math.abs(fwd.z)) fwd.set(fwd.x < 0 ? -1 : 1, 0, 0); else fwd.set(0, 0, fwd.z > 0 ? 1 : -1);
  var lat = new THREE.Vector3().crossVectors(up, fwd).normalize(); var fix = Math.atan2(fwd.x, -fwd.z);   /* inner yaw that turns the model's forward onto the client's −Z */
  /* limbs: by name (top → mid → end), else by paw chains hanging off the torso */
  var limbs = []; var method = 'names';
  all(RE.top, RE.digit).forEach(function (top) { var mid = desc(top, RE.mid, RE.digit) || boneKids(top)[0] || null; if (!mid) return; var end = desc(mid, RE.end, RE.digit) || boneKids(mid)[0] || mid; limbs.push({ top: top, mid: mid, end: end }); });
  if (limbs.length < 4) {
    var torso = [hips, rootBone, head, neck, jaw].concat(spine, tail).filter(Boolean); var chains = {};
    bones.forEach(function (leaf) { if (boneKids(leaf).length || P(leaf).y > 0.35 * height) return; var ch = [leaf], b = leaf; while (b.parent && b.parent.isBone && torso.indexOf(b.parent) < 0) { b = b.parent; ch.push(b); } if (!b.parent || !b.parent.isBone || ch.length < 2) return; var k = idx(ch[ch.length - 1]); if (!chains[k] || chains[k].length < ch.length) chains[k] = ch; });
    Object.keys(chains).forEach(function (k) { var ch = chains[k]; var top = ch[ch.length - 1]; if (limbs.some(function (l) { return l.top === top; })) return; limbs.push({ top: top, mid: ch[Math.floor((ch.length - 1) / 2)], end: ch[0] }); });
    method = 'names+chains'; notes.push('limb chains from paw leaves (' + limbs.length + ')');
  }
  /* front / back: rank the paws along the forward axis (top half = front); side: name token, else lateral sign */
  var proj = limbs.map(function (l) { return P(l.end).x * fwd.x + P(l.end).z * fwd.z; }); var order = limbs.map(function (_, i) { return i; }).sort(function (a, b) { return proj[b] - proj[a]; });
  var frontCount = Math.floor(limbs.length / 2); var legs = {}, dup = [];
  order.forEach(function (li, rank) { var l = limbs[li]; var e = P(l.end); var side = RE.left.test(l.top.name) ? 'L' : RE.right.test(l.top.name) ? 'R' : ((e.x * lat.x + e.z * lat.z) > 0 ? 'L' : 'R'); var key = (rank < frontCount ? 'F' : 'B') + side; if (legs[key]) { dup.push(key + ':' + l.top.name); return; } legs[key] = l; });
  LEG_KEYS.forEach(function (k) { if (!legs[k]) missing.push('leg ' + k); });
  /* per-bone spec: rest quaternion + the creature axes expressed in the parent's rest frame (conjugation) so a delta about them is a plain premultiply */
  var tq = new THREE.Quaternion();
  function mk(b) { if (!b) return null; if (b.parent) b.parent.getWorldQuaternion(tq); else tq.identity(); tq.invert(); return { idx: idx(b), name: b.name, rest: b.quaternion.clone(), axP: lat.clone().applyQuaternion(tq).normalize(), axY: up.clone().applyQuaternion(tq).normalize(), axR: fwd.clone().applyQuaternion(tq).normalize() }; }
  var legList = LEG_KEYS.map(function (k) { var l = legs[k]; if (!l) return null; var drop = P(l.top).y - P(l.mid).y; var flexBone = drop >= 0.05 * height ? l.mid : l.end; if (flexBone !== l.mid) notes.push(k + ' knee degenerate (' + drop.toFixed(3) + ' m) → fold at ' + l.end.name); return { key: k, top: mk(l.top), mid: mk(l.mid), end: mk(l.end), flex: mk(flexBone) }; });
  var report = { method: method, total_bones: bones.length, root: rootBone ? rootBone.name : null, hips: hips ? hips.name : null, head: head ? head.name : null, neck: neck ? neck.name : null, jaw: jaw ? jaw.name : null, spine: spine.map(function (b) { return b.name; }), tail: tail.map(function (b) { return b.name; }),
    legs: {}, forward_model: (fwd.x ? (fwd.x > 0 ? '+x' : '-x') : (fwd.z > 0 ? '+z' : '-z')), forward_fix_deg: Math.round(fix / DEG), rest_height_m: +height.toFixed(3), missing: missing, duplicates: dup, notes: notes };
  legList.forEach(function (L) { if (L) report.legs[L.key] = L.top.name + ' / ' + L.flex.name + ' / ' + L.end.name; });
  if (log) log('creatures ' + SPECIES + ' skeleton (' + method + ', ' + bones.length + ' bones): head=' + report.head + ' neck=' + report.neck + ' jaw=' + (report.jaw || 'none') + ' spine=[' + report.spine.join(',') + '] tail=' + (report.tail.length ? '[' + report.tail.join(',') + ']' : 'none') + ' ' + LEG_KEYS.map(function (k) { return k + '=' + (report.legs[k] || 'MISSING'); }).join(' ') + ' forward=' + report.forward_model + ' (fix ' + report.forward_fix_deg + '°)' + (notes.length ? ' | ' + notes.join('; ') : '') + (dup.length ? ' | dup ' + dup.join(',') : ''));
  return { bones: bones, height: height, box: box, fix: fix, hips: mk(hips), head: mk(head), neck: mk(neck), jaw: mk(jaw), spine: spine.map(mk), tail: tail.map(mk), legs: legList, report: report };
}

/* ---------- module ---------- */
export function createCreatures(ctx) {
  var THREE = ctx.THREE; var lodSrc = [];   /* [{ level, geometry, material }] for L1 / L2 */ var src = null, skel = null, scale = 1, heightM = HEIGHT_FALLBACK_M, loaded = false, loadError = null, derivId = null;
  var LOOK = null;   /* registry artifact DOGKIE_SPECIES.look (body tint / aura) */
  var figs = [], byId = {}; var gen = 0; var lockedId = null; var territoryInfo = null; var lastP = null, lastHT = null, curHT = 0, clockOff = null; var warned = false; var visibleCount = 0, tagCount = 0;
  var STATUS = createEntityStatus(THREE, { width_m: 1.1 }); var statusLevel = STATUS_LEVEL_FALLBACK; var CONTACT = { mesh: null, max: 0, m4: null, v: null, q: null, s: null, n: 0 };   /* B8 §4: the laser-contact points beneath the pointed limb tips */
  var QA = new THREE.Quaternion(), QB = new THREE.Quaternion(); var S = { x: 0, y: 0, z: 0, f: 0 };   /* per-frame scratch (no allocation in tick) */
  var POSE = { bodyY: 0, bodyZ: 0, pitch: 0, roll: 0, headNod: 0, headTurn: 0, headRoll: 0, neckNod: 0, jawOpen: 0, spineBend: 0, tailSwing: 0, tailLift: 0, leg: [{ swing: 0, flex: 0 }, { swing: 0, flex: 0 }, { swing: 0, flex: 0 }, { swing: 0, flex: 0 }] };
  function zeroPose(P) { P.bodyY = P.bodyZ = P.pitch = P.roll = P.headNod = P.headTurn = P.headRoll = P.neckNod = P.jawOpen = P.spineBend = P.tailSwing = P.tailLift = 0; for (var i = 0; i < 4; i++) { P.leg[i].swing = 0; P.leg[i].flex = 0; } }

  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
  function anisoOf() { try { var r = ctx.renderer; return Math.max(1, Math.min(8, r && r.capabilities && r.capabilities.getMaxAnisotropy ? r.capabilities.getMaxAnisotropy() : 8)); } catch (e) { return 1; } }

  function makeBuf() { var s = []; for (var i = 0; i < SAMPLES; i++) s.push({ t: 0, x: 0, y: 0, z: 0, f: 0 }); return { s: s, n: 0 }; }
  function pushSample(b, ht, x, y, z, f) { var s = b.s; if (b.n === s.length) { for (var i = 1; i < s.length; i++) { var a = s[i - 1], q = s[i]; a.t = q.t; a.x = q.x; a.y = q.y; a.z = q.z; a.f = q.f; } b.n--; } var o = s[b.n++]; o.t = ht; o.x = x; o.y = y; o.z = z; o.f = f; }
  function sampleAt(b, rt, out) {
    var s = b.s, n = b.n; if (!n) return false; var A, B;
    if (n === 1 || rt >= s[n - 1].t) { A = s[n - 1]; out.x = A.x; out.y = A.y; out.z = A.z; out.f = A.f; return true; }
    if (rt <= s[0].t) { A = s[0]; out.x = A.x; out.y = A.y; out.z = A.z; out.f = A.f; return true; }
    for (var i = n - 2; i >= 0; i--) { if (rt >= s[i].t) { A = s[i]; B = s[i + 1]; var u = (rt - A.t) / Math.max(1e-6, B.t - A.t); out.x = A.x + (B.x - A.x) * u; out.y = A.y + (B.y - A.y) * u; out.z = A.z + (B.z - A.z) * u; out.f = A.f + wrapAngle(B.f - A.f) * u; return true; } }
    A = s[0]; out.x = A.x; out.y = A.y; out.z = A.z; out.f = A.f; return true;
  }

  function makeFigure(c) {
    var id = c.id; var model = skeletonClone(src.scene); var bones = [], mats = [];
    function cloneMat(m) { var k = m.clone(); k.envMapIntensity = ENV_INTENSITY;   /* M6 owner correction: preserve the derivative's authored albedo/material identity.  The former body-tint shader replaced the GLB palette with a synthetic cobalt ramp; class identity now stays in the aura/contact effects instead. */ if (k.map) { k.emissiveMap = k.map; k.emissive = new THREE.Color(LOOK && LOOK.aura ? LOOK.aura : GLOW.color); } k.emissiveIntensity = ctx.night ? GLOW.night * 0.72 : GLOW.day * 0.65; k.needsUpdate = true; mats.push(k); return k; }
    model.traverse(function (o) { if (o.isBone) bones.push(o); if (o.isMesh) { o.castShadow = CAST_SHADOW; o.receiveShadow = true; o.frustumCulled = true; if (Array.isArray(o.material)) o.material = o.material.map(cloneMat); else if (o.material) o.material = cloneMat(o.material); } });
    if (bones.length !== skel.bones.length) ctx.log('creatures ' + id + ': clone has ' + bones.length + ' bones, source ' + skel.bones.length + ' — poses may misalign');
    var lodMeshes = []; var sk0 = null; model.traverse(function (o) { if (o.isSkinnedMesh && !sk0) sk0 = o; });
    if (sk0) { lodMeshes.push(sk0); for (var li = 0; li < lodSrc.length; li++) { var L = lodSrc[li]; var sm = new THREE.SkinnedMesh(L.geometry, cloneMat(L.material)); sm.bindMode = sk0.bindMode; sm.bind(sk0.skeleton, sk0.bindMatrix); sm.position.copy(sk0.position); sm.quaternion.copy(sk0.quaternion); sm.scale.copy(sk0.scale); sm.castShadow = CAST_SHADOW; sm.receiveShadow = true; sm.frustumCulled = true; sm.visible = false; sm.name = sk0.name + '_L' + L.level; sk0.parent.add(sm); lodMeshes.push(sm); } }
    var cx = (skel.box.min.x + skel.box.max.x) / 2, cz = (skel.box.min.z + skel.box.max.z) / 2; model.position.set(-cx, -skel.box.min.y, -cz);   /* footprint centre on the origin, feet on y = 0 (model space) */
    var pivot = new THREE.Group(); pivot.rotation.y = skel.fix; pivot.scale.setScalar(scale); pivot.add(model);
    var body = new THREE.Group(); body.add(pivot); var figure = new THREE.Group(); figure.name = SPECIES + '_' + id; figure.userData.noMerge = true; figure.userData.creature = id; figure.add(body);
    var status = STATUS.make({ name: c.name || TAG.name, level: Number.isFinite(c.level) ? c.level : statusLevel, hp: num(c.hp, 1), max: num(c.max, 1), tint: TAG.tint, hostile: true }); if (status) { status.sprite.position.y = heightM + TAG.lift_m; status.sprite.visible = false; figure.add(status.sprite); }
    ctx.group.add(figure);
    var fig = { id: id, figure: figure, body: body, bones: bones, mats: mats, lodMeshes: lodMeshes, lodLevel: 0, status: status, gen: gen, buf: makeBuf(), seed: hashSeed(id), phase: 0, gaitW: 0, chaseW: 0, attK: 0, attWind: 0, ko01: 0, hitSide: 1, lastHitAgo: 99, spawnT: -1, frozen: false, snap: true, wasRespawn: false, spd: 0, opacity: 1, active: true, state: 'IDLE' };
    figs.push(fig); byId[id] = fig; return fig;
  }
  function removeFigure(fig) { if (fig.status) { STATUS.dispose(fig.status); fig.status = null; } if (fig.figure.parent) fig.figure.parent.remove(fig.figure); fig.figure.traverse(function (o) { if (o.isSkinnedMesh && o.skeleton && o.skeleton.dispose) o.skeleton.dispose(); }); for (var i = 0; i < fig.mats.length; i++) { try { fig.mats[i].dispose(); } catch (e) { } } delete byId[fig.id]; }
  function removeStale() { for (var i = figs.length - 1; i >= 0; i--) if (figs[i].gen !== gen) { removeFigure(figs[i]); figs.splice(i, 1); } }
  function removeAll() { for (var i = figs.length - 1; i >= 0; i--) removeFigure(figs[i]); figs.length = 0; if (warmFigure) { try { removeFigure(warmFigure); } catch (e) { } warmFigure = null; } }
  var warmFigure = null;
  function setOpacity(fig, op) { for (var i = 0; i < fig.mats.length; i++) { var m = fig.mats[i]; m.opacity = op; m.transparent = op < 0.999; } fig.opacity = op; }
  function setBone(fig, spec, pitch, yaw, roll) { if (!spec) return; var b = fig.bones[spec.idx]; if (!b) return; QA.setFromAxisAngle(spec.axP, pitch); if (yaw) { QB.setFromAxisAngle(spec.axY, yaw); QA.multiply(QB); } if (roll) { QB.setFromAxisAngle(spec.axR, roll); QA.multiply(QB); } b.quaternion.multiplyQuaternions(QA, spec.rest); }
  /* body frame = client frame (forward −Z): pitch > 0 = nose down, roll > 0 = tilt left; bone deltas: pitch > 0 = nose down / limb backward, yaw > 0 = turn left */
  function applyPose(fig, P) {
    fig.body.position.set(0, P.bodyY, -P.bodyZ); fig.body.rotation.set(-P.pitch, 0, P.roll);
    setBone(fig, skel.head, P.headNod, P.headTurn, P.headRoll); setBone(fig, skel.neck, P.neckNod, P.headTurn * 0.4, 0); setBone(fig, skel.jaw, P.jawOpen, 0, 0);
    var n = skel.spine.length, i; for (i = 0; i < n; i++) setBone(fig, skel.spine[i], P.spineBend / n, 0, 0);
    n = skel.tail.length; for (i = 0; i < n; i++) setBone(fig, skel.tail[i], P.tailLift / n, P.tailSwing / n, 0);
    for (i = 0; i < 4; i++) { var L = skel.legs[i]; if (!L) continue; setBone(fig, L.top, -P.leg[i].swing, 0, 0); setBone(fig, L.flex, P.leg[i].flex, 0, 0); }
  }

  function updateFigure(fig, c, isNew, dt, t, cam, rt) {
    var x = num(c.position.x, 0), z = num(c.position.z, 0), y = num(c.y, 0), f = num(c.facing, 0); var st = c.state || 'IDLE'; var active = c.active !== false; var ko = !!c.ko; var respawn = st === 'RESPAWN';
    fig.active = active; fig.state = st;
    if (isNew) { var b = fig.buf; var last = b.n ? b.s[b.n - 1] : null; if (last && (Math.abs(last.x - x) + Math.abs(last.z - z) > TELEPORT_M || (respawn && !fig.wasRespawn))) { b.n = 0; last = null; fig.snap = true; } if (!last || curHT > last.t + 1e-6) pushSample(b, curHT, x, y, z, f); fig.wasRespawn = respawn; }
    var F = fig.figure; var dx = F.position.x - cam.x, dy0 = F.position.y - cam.y, dz = F.position.z - cam.z; var d2 = dx * dx + dy0 * dy0 + dz * dz;
    F.visible = d2 < VIS_M * VIS_M;
    if (fig.lodMeshes.length > 1) { var lvl = d2 < LOD_M[0] * LOD_M[0] ? 0 : (d2 < LOD_M[1] * LOD_M[1] ? 1 : 2); if (lvl >= fig.lodMeshes.length) lvl = fig.lodMeshes.length - 1; if (lvl !== fig.lodLevel) { for (var lm = 0; lm < fig.lodMeshes.length; lm++) fig.lodMeshes[lm].visible = lm === lvl; fig.lodLevel = lvl; } }
    if (!active) { if (!fig.frozen) { zeroPose(POSE); applyPose(fig, POSE); fig.frozen = true; fig.gaitW = fig.attK = fig.attWind = 0; if (fig.status) fig.status.sprite.visible = false; if (fig.opacity !== 1) setOpacity(fig, 1); F.scale.setScalar(1); fig.spawnT = -1; } if (d2 > DORMANT_SKIP_M * DORMANT_SKIP_M) { F.position.set(x, y, z); F.rotation.y = -f; fig.snap = true; return; } }
    else fig.frozen = false;
    /* displayed transform: LAG_S behind the host clock between the bracketing samples; a snap (first frame / teleport / respawn) lands without a slide */
    var px = x, py = y, pz = z, pf = f; if (sampleAt(fig.buf, rt, S)) { px = S.x; py = S.y; pz = S.z; pf = S.f; }
    if (fig.snap) { F.position.set(px, py, pz); F.rotation.y = -pf; fig.spd = 0; fig.snap = false; } else { var dsp = dt > 0 ? Math.sqrt((px - F.position.x) * (px - F.position.x) + (pz - F.position.z) * (pz - F.position.z)) / dt : 0; fig.spd += (dsp - fig.spd) * Math.min(1, dt * 10); F.position.set(px, py, pz); }
    var target = -pf, cy = F.rotation.y, dyaw = wrapAngle(target - cy); var step = dyaw * Math.min(1, dt * TURN_RATE), cap = TURN_CAP_DPS * DEG * dt; if (step > cap) step = cap; else if (step < -cap) step = -cap; F.rotation.y = cy + step;   /* TURN */
    if (!active) return;   /* frozen idle inside 90 m: only the transform tracks */
    /* RESPAWN scale-in */
    if (respawn && fig.spawnT < 0) { fig.spawnT = t; fig.ko01 = 0; } else if (!respawn && fig.spawnT >= 0 && t - fig.spawnT > RESPAWN_S) fig.spawnT = -1;
    var grow = fig.spawnT >= 0 ? smooth((t - fig.spawnT) / RESPAWN_S) : 1; F.scale.setScalar(Math.max(0.01, grow));
    /* blend weights (eased so state edges never pop) */
    var hostSpd = num(c.speed_mps, 0); var moving = st === 'ROAM' || st === 'CHASE' || fig.spd > MOVING_MPS; var k;
    k = Math.min(1, dt * BLEND_RATE); fig.gaitW += ((moving && !ko ? 1 : 0) - fig.gaitW) * k; fig.chaseW += ((st === 'CHASE' ? 1 : 0) - fig.chaseW) * k;
    fig.ko01 += ((ko ? 1 : 0) - fig.ko01) * Math.min(1, dt * KO_RATE);
    var a = clamp01(num(c.attack_t, 0)); k = Math.min(1, dt * ATTACK_RATE); fig.attK += ((st === 'ATTACK' ? lunge(a) : 0) - fig.attK) * k; fig.attWind += ((st === 'ATTACK' ? windup(a) : 0) - fig.attWind) * k;
    var hitAgo = num(c.hit_ago_s, 99); if (hitAgo < fig.lastHitAgo - 1e-3 && hitAgo < HIT_S) fig.hitSide = -fig.hitSide; fig.lastHitAgo = hitAgo; var h = hitAgo < HIT_S ? (1 - hitAgo / HIT_S) : 0; h *= h;
    var spdEff = Math.max(fig.spd, moving ? hostSpd * 0.6 : 0); var hz = Math.max(GAIT_HZ_MIN, Math.min(GAIT_HZ_MAX, spdEff / STRIDE_M)); fig.phase += TWO_PI * hz * dt * fig.gaitW; if (fig.phase > TWO_PI) fig.phase -= TWO_PI;
    /* compose */
    var P = POSE; zeroPose(P); var live = 1 - fig.ko01, i;
    var idle = (1 - fig.gaitW) * live; var breath = Math.sin(TWO_PI * 0.33 * t + fig.seed);
    P.bodyY += 0.006 * breath * idle; P.spineBend += 0.025 * breath * idle; P.headTurn += 0.14 * Math.sin(0.55 * t + fig.seed * 2.1) * idle; P.headNod += 0.05 * Math.sin(0.43 * t + fig.seed * 1.3) * idle; P.tailSwing += 0.25 * Math.sin(1.1 * t + fig.seed) * idle; P.tailLift += 0.1 * idle;
    /* owner B8 §4 LOCOMOTION: the Dogkie is NOT a walking animal. The fused front and hind limb units hold their pointed tips together and the body
       GLIDES surface-adjacent (the MAHWORLD motion family in a dark creature form): a low hover with a slow compression / extension breath in
       the spine and units, a faint pitch into acceleration, no stepping cycle; the laser-contact points sit beneath the pointed tips (contact
       instances below). A brief controlled LIFT happens only through the attack wind-up / pounce (below), never constant free flight. */
    var g = fig.gaitW * live, ph = fig.phase, s0 = Math.sin(ph);
    var comp = 0.5 - 0.5 * Math.cos(ph);   /* the glide breath: compress → extend at the travel cadence */
    P.leg[0].flex += 0.10 * comp * g; P.leg[1].flex += 0.10 * comp * g; P.leg[2].flex += 0.14 * (1 - comp) * g; P.leg[3].flex += 0.14 * (1 - comp) * g;   /* the two units compress alternately (front / hind), never swing */
    P.bodyY += (HOVER_M + 0.03 * comp) * g; P.pitch += (0.05 * fig.chaseW + 0.02 * s0) * g; P.roll += 0.02 * s0 * g; P.spineBend += 0.06 * (comp - 0.5) * g; P.headNod += (0.08 * fig.chaseW - 0.03 * comp) * g; P.tailSwing += 0.22 * s0 * g; P.tailLift += 0.25 * g;
    fig.hover = HOVER_M * g;
    var w = fig.attWind * live, lu = fig.attK * live;   /* ATTACK: load (back, head up, front legs crouch) → thrust (lunge forward, neck / head drive, front legs reach, jaw open, hind push) */
    P.bodyZ += -0.06 * w + 0.16 * lu; P.pitch += -0.08 * w + 0.12 * lu; P.bodyY += LIFT_M * (0.55 * w + lu);   /* B8 §4: the brief controlled LIFT for the pounce (wind-up rises a little, the strike lifts fully), the aura intensifies with it */ fig.hover = Math.max(fig.hover || 0, LIFT_M * (0.55 * w + lu)); P.spineBend += -0.1 * w + 0.28 * lu; P.neckNod += -0.1 * w + 0.22 * lu; P.headNod += -0.2 * w + 0.1 * lu; P.jawOpen += 0.5 * lu; P.tailLift += 0.15 * w;   /* the spine leans into the bite: a neck pitch alone barely carries the head forward */
    P.leg[0].swing += -0.15 * w + 0.6 * lu; P.leg[1].swing += -0.15 * w + 0.6 * lu; P.leg[0].flex += 0.3 * w + 0.15 * lu; P.leg[1].flex += 0.3 * w + 0.15 * lu; P.leg[2].swing += -0.3 * lu; P.leg[3].swing += -0.3 * lu; P.leg[2].flex += 0.2 * w; P.leg[3].flex += 0.2 * w;
    var hh = h * live;   /* HIT recoil */
    P.bodyZ -= 0.08 * hh; P.pitch -= 0.12 * hh; P.headNod -= 0.3 * hh; P.headTurn += 0.25 * hh * fig.hitSide; P.roll += 0.1 * hh * fig.hitSide;
    var lead = dyaw * HEAD_LEAD; if (lead > HEAD_LEAD_MAX) lead = HEAD_LEAD_MAX; else if (lead < -HEAD_LEAD_MAX) lead = -HEAD_LEAD_MAX; P.headTurn += lead * live;   /* the head leads a turn */
    var q = fig.ko01;   /* KO sag: body to the ground, legs tucked UNDER it (front: upper leg forward + forearm folded back so the paw lands by the chest; hind: leg drawn forward under the belly, toes tucked), head down, slumped to one side */
    P.bodyY -= KO_SAG_M * q; P.pitch += 0.05 * q; P.roll += 0.25 * q; P.headNod += 0.4 * q; P.headRoll += 0.2 * q; P.jawOpen += 0.15 * q; P.tailLift -= 0.3 * q;
    P.leg[0].swing += 0.5 * q; P.leg[1].swing += 0.5 * q; P.leg[0].flex += 1.2 * q; P.leg[1].flex += 1.2 * q; P.leg[2].swing += 1.2 * q; P.leg[3].swing += 1.2 * q; P.leg[2].flex += 0.6 * q; P.leg[3].flex += 0.6 * q;
    applyPose(fig, P);
    var koAgo = ko && typeof c.ko_ago_s === 'number' ? c.ko_ago_s : null; var dq = koAgo === null ? 0 : clamp01(koAgo / 2.4);   /* owner next-pass 2026-09-20 §20: creature defeat = crystal dissolution — the KO sag fades to nothing and shrinks over the host's dissolve window, then the record disappears */
    var op = (1 - (1 - KO_OPACITY) * q) * (1 - dq); if (Math.abs(op - fig.opacity) > 1e-3) setOpacity(fig, op); if (dq > 0) F.scale.setScalar(Math.max(0.05, grow * (1 - 0.45 * dq)));
    /* the species aura (§19): restrained at rest (the night glow), stronger through the wind-up and the strike, a white flash when struck */ var auraT = (ctx.night ? GLOW.night : 0.04) + 0.55 * Math.max(fig.attWind, fig.attK) * live + 0.9 * h; fig.aura = (fig.aura || 0) + (auraT - (fig.aura || 0)) * Math.min(1, dt * 6); for (var am = 0; am < fig.mats.length; am++) { var amat = fig.mats[am]; amat.emissiveIntensity = fig.aura; if (h > 0.5) amat.emissive.set(0xffffff); else if (fig.attWind + fig.attK > 0.4) amat.emissive.set(c.aura_attack || (LOOK && LOOK.aura_attack) || 0x9fe4ff); else amat.emissive.set(c.aura || (LOOK && LOOK.aura) || GLOW.color); }
    /* overhead status (owner B7 §3): NAME · LV · HP for every active figure in view — not only while damaged; fades with distance, hides through the KO dissolve, LOCKED when the player's lock is on it */
    if (fig.status) { var mx = num(c.max, 0), hp = num(c.hp, mx); var dS = Math.sqrt(d2); var showS = active && F.visible && !(ko && dq > 0.35); STATUS.update(fig.status, { name: c.name || TAG.name, level: Number.isFinite(c.level) ? c.level : statusLevel, hp: hp, max: mx, ko: ko, locked: lockedId === c.id }, showS ? dS : 1e9); if (fig.status.sprite.visible) { fig.status.sprite.position.y = (heightM + TAG.lift_m) / Math.max(0.05, F.scale.x); tagCount++; } }
    if (F.visible) visibleCount++;
    /* laser contact beneath the two limb units: brighter and wider as the body lifts (glide → pounce), hidden while KO'd / dormant */
    if (CONTACT.mesh && active && F.visible && !ko && CONTACT.n + 2 <= CONTACT.max) { var hov = fig.hover || 0; var cs = 0.34 + 0.9 * hov; var cyaw = F.rotation.y; var gyc = F.position.y + 0.02; for (var ci = 0; ci < 2; ci++) { var oz = ci === 0 ? 0.36 : -0.34; CONTACT.v.set(F.position.x - Math.sin(cyaw) * oz, gyc, F.position.z - Math.cos(cyaw) * oz); CONTACT.q.identity(); CONTACT.s.set(cs, 1, cs * 0.8); CONTACT.m4.compose(CONTACT.v, CONTACT.q, CONTACT.s); CONTACT.mesh.setMatrixAt(CONTACT.n++, CONTACT.m4); } }
  }

  return {
    statusOf: function (id) { var f = byId[id]; if (!f || !f.status) return null; var st = f.status; return { id: id, name: st.name, level: st.level, hp: st.hp, max: st.max, locked: st.locked, ko: st.ko, visible: !!st.sprite.visible, opacity: st.mat.opacity, position: { x: f.figure.position.x, y: f.figure.position.y, z: f.figure.position.z }, head_y: f.figure.position.y + heightM }; },   /* B7 §3 probe / HUD accessor */
    pickRoots: function () { var out = []; for (var i = 0; i < figs.length; i++) if (figs[i].active && figs[i].figure && figs[i].figure.visible && !figs[i].figure.userData.warmFigure) out.push({ id: figs[i].id, root: figs[i].figure }); return out; },   /* tap-to-lock: the Dogkie figures are pickable like class bodies (STABILITY 2026-09-20) */
    build: function () {
      var reg = ctx.registry; if (!reg) { ctx.log('creatures: no registry — nothing to show'); return Promise.resolve(); }
      var cre = reg.creatures && reg.creatures[SPECIES]; if (!cre) ctx.log('creatures: registry.creatures.' + SPECIES + ' missing — using fallbacks');
      heightM = num(cre && cre.height_m, HEIGHT_FALLBACK_M); derivId = (cre && cre.derivative) || DERIVATIVE_FALLBACK; var artD = (reg.artifacts || []).filter(function (a) { return a && a.id === 'DOGKIE_SPECIES'; })[0]; LOOK = artD && artD.look ? artD.look : null; if (artD && artD.scale && artD.scale.height_m > 0) heightM = artD.scale.height_m;
      var deriv = findDerivative(reg, derivId); var file = deriv && deriv.files && deriv.files.L0 && deriv.files.L0.runtime;
      if (!file) { loadError = 'derivative ' + derivId + ' has no L0 runtime file'; ctx.log('creatures: ' + loadError + ' — module inert'); return Promise.resolve(); }
      var spLv = reg.ecology && reg.ecology.species && reg.ecology.species[SPECIES]; if (spLv && Number.isFinite(spLv.level)) statusLevel = spLv.level;   /* B7 §4: the species level is registry data (size-driven, ecology.levels), the host view carries it per creature; never a number in the animation */
      /* owner B8 §4 PACK TERRITORY cues: at every pack centre a ring of deep-sapphire crystal traces (small leaning shards) and a faint ground trace disc — the forest announces Dogkie presence before combat. One merged crystal mesh + one merged trace mesh. */
      try { var packs = (cre && cre.pack_territories) || []; if (packs.length) { var pos = [], col = [], tpos = [], tcol = []; var pushOct = function (x, y, z, sx, sy, sz, yaw, lean, c) { var og = new THREE.OctahedronGeometry(1, 0); og.scale(sx, sy, sz); og.rotateZ(lean); og.rotateY(yaw); og.translate(x, y, z); var pa = og.attributes.position; for (var q = 0; q < pa.count; q++) { pos.push(pa.getX(q), pa.getY(q), pa.getZ(q)); var b = 0.7 + 0.5 * ((q * 13) % 7) / 7; col.push(c[0] * b, c[1] * b, c[2] * b); } };
        packs.forEach(function (Pk, pi) { var r1 = (function (seed) { var st = seed >>> 0 || 1; return function () { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; }; })(0xD06 + pi * 97); var nSh = 7 + Math.floor(r1() * 3); for (var si = 0; si < nSh; si++) { var a = si / nSh * Math.PI * 2 + r1() * 0.6; var rr = Pk.r * (0.9 + r1() * 0.5); var x = Pk.x + Math.cos(a) * rr, z = Pk.z + Math.sin(a) * rr; var y = groundYAt(reg, x, z); var h = 0.5 + r1() * 0.9; pushOct(x, y + h * 0.42, z, 0.16 + r1() * 0.12, h * 0.5, 0.12 + r1() * 0.1, r1() * Math.PI, (r1() - 0.5) * 0.7, [0.09, 0.2, 0.62]); if (r1() < 0.5) pushOct(x + (r1() - 0.5) * 1.2, y + 0.16, z + (r1() - 0.5) * 1.2, 0.1, 0.2, 0.08, r1() * Math.PI, (r1() - 0.5) * 1.1, [0.05, 0.1, 0.36]); }
          var ty = groundYAt(reg, Pk.x, Pk.z) + 0.035; var segs = 22; for (var ti = 0; ti < segs; ti++) { var a0 = ti / segs * Math.PI * 2, a1 = (ti + 1) / segs * Math.PI * 2; var R0 = Pk.r * 0.35, R1 = Pk.r * 1.15; var pts = [[Pk.x + Math.cos(a0) * R0, Pk.z + Math.sin(a0) * R0], [Pk.x + Math.cos(a0) * R1, Pk.z + Math.sin(a0) * R1], [Pk.x + Math.cos(a1) * R1, Pk.z + Math.sin(a1) * R1], [Pk.x + Math.cos(a1) * R0, Pk.z + Math.sin(a1) * R0]]; [[0, 1, 2], [0, 2, 3]].forEach(function (tri) { tri.forEach(function (vi) { tpos.push(pts[vi][0], ty, pts[vi][1]); var inner = vi === 0 || vi === 3; tcol.push(0.16, 0.34, 0.95, inner ? 0.0 : 0.16); }); }); } });
        var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); sg.computeVertexNormals(); var smat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.5, flatShading: true, emissive: 0x1a3cff, emissiveIntensity: ctx.night ? 0.35 : 0.08 }); var sm = new THREE.Mesh(sg, smat); sm.name = 'DOGKIE_TERRITORY_CRYSTAL'; sm.userData.noMerge = true; sm.frustumCulled = true; ctx.group.add(sm);
        var tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tpos, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(tcol, 4)); var tmat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); var tm = new THREE.Mesh(tg, tmat); tm.name = 'DOGKIE_TERRITORY_TRACE'; tm.userData.noMerge = true; ctx.group.add(tm); territoryInfo = { packs: packs.length, shards: pos.length / 18, draw_calls: 2 }; ctx.log('creatures: ' + packs.length + ' pack territories marked (deep-blue traces)'); } } catch (e) { ctx.log('creatures: territory cues failed ' + (e && e.message || e)); }
      try { var cm = Math.max(8, 2 * (num(cre && cre.max_active, 46))); var cg = new THREE.PlaneGeometry(1, 1); cg.rotateX(-Math.PI / 2); var cc = document.createElement('canvas'); cc.width = cc.height = 64; var cg2 = cc.getContext('2d'); var gr = cg2.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(210,235,255,1)'); gr.addColorStop(0.18, 'rgba(120,180,255,0.9)'); gr.addColorStop(0.45, 'rgba(60,110,255,0.35)'); gr.addColorStop(1, 'rgba(40,80,255,0)'); cg2.fillStyle = gr; cg2.fillRect(0, 0, 64, 64); var ct = new THREE.CanvasTexture(cc); ct.colorSpace = THREE.SRGBColorSpace; var cmat = new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); var cim = new THREE.InstancedMesh(cg, cmat, cm); cim.name = 'DOGKIE_CONTACTS'; cim.frustumCulled = false; cim.userData.noMerge = true; cim.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cim.count = 0; ctx.group.add(cim); CONTACT.mesh = cim; CONTACT.max = cm; CONTACT.m4 = new THREE.Matrix4(); CONTACT.v = new THREE.Vector3(); CONTACT.q = new THREE.Quaternion(); CONTACT.s = new THREE.Vector3(); } catch (e) { ctx.log('creatures: contact discs failed ' + (e && e.message || e)); }
      return ctx.loadGlb(file).then(function (gltf) {
        src = gltf; var an = anisoOf(); gltf.scene.traverse(function (o) { if (o.isMesh && o.material && !Array.isArray(o.material)) { var m = o.material; if (m.map && m.map.anisotropy < an) m.map.anisotropy = an; if (m.normalMap && m.normalMap.anisotropy < an) m.normalMap.anisotropy = an; } });   /* shared textures: sampling only */
        skel = classifySkeleton(THREE, gltf.scene, ctx.log); scale = heightM / skel.height; loaded = true;
        ['L1', 'L2'].forEach(function (lv, li) { var f2 = deriv.files && deriv.files[lv] && deriv.files[lv].runtime; if (!f2) return; ctx.loadGlb(f2).then(function (g2) { var sm2 = null; g2.scene.traverse(function (o) { if (o.isSkinnedMesh && !sm2) sm2 = o; }); if (!sm2) { ctx.log('creatures: ' + lv + ' has no skinned mesh — ignored'); return; } var an2 = anisoOf(); var m2 = sm2.material; if (m2 && m2.map && m2.map.anisotropy < an2) m2.map.anisotropy = an2; lodSrc.push({ level: li + 1, geometry: sm2.geometry, material: m2 }); lodSrc.sort(function (a, b) { return a.level - b.level; }); ctx.log('creatures: ' + derivId + ' ' + lv + ' ready (' + (sm2.geometry.index ? sm2.geometry.index.count / 3 : 0) + ' tris) — applies to figures created from now on'); }).catch(function (e) { ctx.log('creatures: ' + lv + ' load failed (' + (e && e.message || e) + ')'); }); });
        ctx.log('creatures: ' + derivId + ' L0 ready (rest height ' + skel.height.toFixed(3) + ' m → ' + heightM + ' m, scale ' + scale.toFixed(3) + ', ' + skel.bones.length + ' bones, ' + (cre && cre.spawn_points ? cre.spawn_points.length : 0) + ' registry spawn points; figures follow p.creatures)');
        try { var warmFig = makeFigure({ id: '__WARM_DOGKIE', position: { x: 0, z: 0 }, facing: 0, state: 'IDLE', hp: 1, max: 1 }); warmFig.figure.visible = false; warmFig.figure.position.set(0, -50, 0); warmFig.figure.userData.warmFigure = true; warmFigure = warmFig; ctx.log('creatures: warm figure mounted (hidden) for the shader warm-up'); } catch (e) { ctx.log('creatures: warm figure failed ' + (e && e.message || e)); }   /* STABILITY 2026-09-20 */
      }).catch(function (e) { loadError = String(e && e.message || e); ctx.log('creatures: ' + derivId + ' load FAILED (' + loadError + ') — module inert'); });
    },
    tick: function (dt, t) {
      if (!loaded) return; var p = ctx.snapshot(); if (!p) return; var list = p.creatures;
      if (!list || !list.length) { if (!warned && !p.creatures) { warned = true; ctx.log('creatures: host publishes no p.creatures yet (WAITING_FOR_HOST)'); } if (figs.length) removeAll(); visibleCount = tagCount = 0; return; }
      dt = Math.min(0.1, Math.max(0, num(dt, 0))); var wall = nowS(); var ht = hostTime(p); var isNew = p !== lastP || (ht !== null && ht !== lastHT);
      if (isNew) { lastP = p; var HT = ht === null ? wall : ht; var o = HT - wall; if (lastHT !== null && HT < lastHT - 1e-6) { for (var r = 0; r < figs.length; r++) { figs[r].buf.n = 0; figs[r].snap = true; } clockOff = o; } else clockOff = clockOff === null ? o : clockOff + (o - clockOff) * CLOCK_FILTER; lastHT = HT; curHT = HT; }
      var rt = wall + (clockOff === null ? 0 : clockOff) - LAG_S; var cam = ctx.cameraPos(); gen++; visibleCount = 0; tagCount = 0; CONTACT.n = 0; lockedId = (p.rules && p.rules.me && p.rules.me.lock) ? p.rules.me.lock.target : null;
      for (var i = 0; i < list.length; i++) { var c = list[i]; if (!c || c.id === undefined || c.id === null || !c.position) continue; if (c.species && c.species !== SPECIES) continue; var fig = byId[c.id] || makeFigure(c); fig.gen = gen; updateFigure(fig, c, isNew, dt, t, cam, rt); }
      removeStale(); if (CONTACT.mesh) { CONTACT.mesh.count = CONTACT.n; if (CONTACT.n) CONTACT.mesh.instanceMatrix.needsUpdate = true; }
    },
    setNight: function (n) { /* the per-frame aura reads ctx.night */ },
    dispose: function () { removeAll(); },
    debug: function () {
      var act = 0, states = {}, motion = []; for (var i = 0; i < figs.length; i++) { if (figs[i].active) act++; states[figs[i].state] = (states[figs[i].state] || 0) + 1; motion.push({ id: figs[i].id, state: figs[i].state, hover_m: +(figs[i].hover || 0).toFixed(3), gait_weight: +(figs[i].gaitW || 0).toFixed(3), attack_weight: +Math.max(figs[i].attK || 0, figs[i].attWind || 0).toFixed(3) }); }
      return { count: figs.length, active: act, lod_levels: 1 + lodSrc.length, lod_m: LOD_M, lod_now: figs.map(function (f) { return f.lodLevel; }), classified_bones: skel ? skel.report : null, loaded: loaded, load_error: loadError, derivative: derivId, height_m: heightM, scale: +scale.toFixed(4), states: states, draw_calls_visible: visibleCount + tagCount + (CONTACT.n ? 1 : 0), tags: STATUS.count(), status_level: statusLevel, contacts: CONTACT.n, territories: territoryInfo, locomotion: 'GLIDE (no stepping cycle; hover ' + HOVER_M + ' m, attack lift ' + LIFT_M + ' m)', motion_contract: { mode: 'SURFACE_GLIDE', step_cycle: false, surface_hover_m: HOVER_M, attack_lift_m: LIFT_M, attack_only_lift: true, fused_units: true }, motion: motion, lag_s: LAG_S, host_clock: lastHT !== null, night: !!ctx.night };
    }
  };
}
