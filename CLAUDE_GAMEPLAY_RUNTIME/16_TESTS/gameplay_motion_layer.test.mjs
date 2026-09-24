/* S10 — upper-body motion layer contract (mask, DOF ownership, invariants). Synthetic layer poses; donor-independent. node 16_TESTS/gameplay_motion_layer.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createRigAnimator } from '../26_LOCAL_AUTHORITY/lab/RigAnimator.js';
import * as AD from '../26_LOCAL_AUTHORITY/lab/animData.js';
import { restFromGlb } from './lib/rest_from_glb.mjs';
import { readGlb } from '../26_LOCAL_AUTHORITY/deploy/glb_read.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }
var ASSET = arg('--asset', path.join(HERE, '..', '26_LOCAL_AUTHORITY', 'lab', 'assets', 'athlete_m_preview', 'dev_0.12', 'Mah_Athlete_M_am08_v5.glb'));
var PROFILE = JSON.parse(fs.readFileSync(path.join(HERE, '..', '26_LOCAL_AUTHORITY', 'lab', 'rig_profile.json'), 'utf8'));
var DEFAULTS = JSON.parse(fs.readFileSync(path.join(HERE, '..', '26_LOCAL_AUTHORITY', 'lab', 'presentation_defaults.json'), 'utf8'));
var passed = 0, failed = 0; function ok(name, cond, info) { if (cond) { passed++; console.log('PASS ' + name); } else { failed++; console.log('FAIL ' + name + (info !== undefined ? ' — ' + JSON.stringify(info) : '')); } }
/* ---- minimal quaternion math (x,y,z,w) ---- */
function qMul(a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; }
function qFromEuler(x, y, z) { var c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2); return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3]; }
function qRot(q, v) { var x = v[0], y = v[1], z = v[2], qx = q[0], qy = q[1], qz = q[2], qw = q[3]; var ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z, iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z; return [ix * qw + iw * -qx + iy * -qz - iz * -qy, iy * qw + iw * -qy + iz * -qx - ix * -qz, iz * qw + iw * -qz + ix * -qy - iy * -qx]; }
function Euler() { this.x = 0; this.y = 0; this.z = 0; } Euler.prototype.set = function (x, y, z) { this.x = x; this.y = y; this.z = z; return this; }; Euler.prototype.setFromQuaternion = function (q) { /* three.js XYZ extraction (matrix based) */ var x = q.x, y = q.y, z = q.z, w = q.w; var x2 = x + x, y2 = y + y, z2 = z + z; var xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2; var m11 = 1 - (yy + zz), m12 = xy - wz, m13 = xz + wy, m22 = 1 - (xx + zz), m23 = yz - wx, m32 = yz + wx, m33 = 1 - (xx + yy); this.y = Math.asin(Math.max(-1, Math.min(1, m13))); if (Math.abs(m13) < 0.9999999) { this.x = Math.atan2(-m23, m33); this.z = Math.atan2(-m12, m11); } else { this.x = Math.atan2(m32, m22); this.z = 0; } return this; };
function Quat() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; } Quat.prototype.setFromEuler = function (e) { var q = qFromEuler(e.x, e.y, e.z); this.x = q[0]; this.y = q[1]; this.z = q[2]; this.w = q[3]; return this; }; Quat.prototype.slerp = function (q, t) { this.x += (q.x - this.x) * t; this.y += (q.y - this.y) * t; this.z += (q.z - this.z) * t; this.w += (q.w - this.w) * t; var l = Math.hypot(this.x, this.y, this.z, this.w) || 1; this.x /= l; this.y /= l; this.z /= l; this.w /= l; return this; };
Quat.prototype.set = function (x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }; Quat.prototype.copy = function (q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }; Quat.prototype.invert = function () { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }; Quat.prototype.multiply = function (b) { var a = this; var r = qMul([a.x, a.y, a.z, a.w], [b.x, b.y, b.z, b.w]); this.x = r[0]; this.y = r[1]; this.z = r[2]; this.w = r[3]; return this; };
var THREE = { Euler: Euler, Quaternion: Quat };
/* ---- asset ---- */
var G = readGlb(ASSET); var J = G.json; var REST = restFromGlb(ASSET); var scale = REST.scale;
var nodesUsed = J.skins[0].joints.map(function (ni) { return J.nodes[ni]; });
ok('1. every joint is translation-only (no scale / rotation / matrix): bone rotation cannot scale the limb', nodesUsed.every(function (n) { return !n.scale && !n.rotation && !n.matrix; }), nodesUsed.filter(function (n) { return n.scale || n.rotation || n.matrix; }).map(function (n) { return n.name; }));
/* ---- animator + FK ---- */
function makeRig() { var bones = {}; AD.BONES.forEach(function (k) { if (!REST.bones[k]) return; var p = REST.bones[k]; bones[k] = { name: k, position: { x: p[0], y: p[1], z: p[2] }, quaternion: new Quat() }; }); return { bones: bones, scale: scale, seed: 0.3 }; }
function fk(pose) { var out = {}, rot = {}; REST.order.forEach(function (name) { var par = REST.parent[name], off = REST.bones[name] || [0, 0, 0], e = pose[name] || [0, 0, 0]; var pPos = (par && out[par]) || [0, 0, 0], pRot = (par && rot[par]) || [0, 0, 0, 1]; var moved = qRot(pRot, off); out[name] = [pPos[0] + moved[0], pPos[1] + moved[1], pPos[2] + moved[2]]; rot[name] = qMul(pRot, qFromEuler(e[0], e[1], e[2])); }); return { pos: out, rot: rot }; }
var A = createRigAnimator(THREE, makeRig(), { defaults: DEFAULTS, animData: AD, classId: 'ATHLETE', seed: 0.3, profile: PROFILE });
var view = { speed01: 0, speed_mps: 0, moving: false, form: 'FUSED', yaw: 0, host_t: 0 };
/* ---- S10 upper-body motion layer contract (donor-independent mechanics; the pose here is synthetic and is NOT claimed as donor motion) ---- */
function settle(n) { for (var i = 0; i < (n || 90); i++) { view.host_t += 1 / 60; A.animate(view, 1 / 60); } return A.pose(); }
function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
A.setLayer(null); var base = settle(120); var fkBase = fk(base);
/* 1. weight 0 → identical to the base */
A.setLayer({ UPPERARM_L: [-1.2, 0, -0.4], CHEST: [0.2, 0, 0] }, 0); var w0 = settle(60);
ok('L1. a layer at weight 0 leaves the MAH pose untouched', Object.keys(base).every(function (k) { return !w0[k] || Math.abs(w0[k][0] - base[k][0]) < 0.03 && Math.abs(w0[k][2] - base[k][2]) < 0.03; }));
/* 2. lower-body / root channels are refused by the mask */
A.setLayer({ THIGH_L: [1.0, 0, 0], PELVIS: [0.5, 0, 0], SHIN_L: [0.8, 0, 0], UPPERARM_L: [-1.0, 0, 0] }, 1); var wl = settle(90);
ok('L2. lower-body / pelvis channels in the layer are ignored (MAH owns the lower body)', ['THIGH_L', 'PELVIS', 'SHIN_L'].every(function (k) { return !wl[k] || Math.abs(wl[k][0] - base[k][0]) < 0.06; }) && Math.abs(wl.UPPERARM_L[0] - (-1.0)) < 0.25, { thigh: wl.THIGH_L, pelvis: wl.PELVIS, ua: wl.UPPERARM_L });
/* 3. bone lengths invariant under the layer (rotation only) */
var fkL = fk(wl); ok('L3. bone lengths are invariant under the layer', ['UPPERARM_L|FOREARM_L', 'FOREARM_L|HAND_L', 'CHEST|NECK'].every(function (pr) { var p = pr.split('|'); return Math.abs(dist(fkL.pos[p[0]], fkL.pos[p[1]]) - dist(fkBase.pos[p[0]], fkBase.pos[p[1]])) < 1e-6; }));
/* 4. DOF ownership: with a donor clavicle the procedural clavicle rhythm fades out; without one it stays */
A.setLayer({ UPPERARM_L: [-0.05, 0, -2.0] }, 1); var noClav = settle(90);
A.setLayer({ UPPERARM_L: [-0.05, 0, -2.0], CLAV_L: [0, 0, 0] }, 1); var withClav = settle(90);
ok('L4. donor clavicle replaces the procedural clavicle rhythm (no stacking); scapular support stays when the donor has no scapula', Math.abs(noClav.CLAV_L[2]) > 0.15 && Math.abs(withClav.CLAV_L[2]) < 0.03 && Math.abs(withClav.SCAP_L[2]) > 0.25, { clav_procedural: noClav.CLAV_L, clav_donor: withClav.CLAV_L, scap: withClav.SCAP_L });
/* 5. clearing the layer returns to the MAH pose without a pop larger than the inertialization budget */
A.setLayer(null); var back = settle(2); var settled = settle(120);
ok('L5. layer exit blends (no rest-pose pop) and settles back to the MAH pose', Math.abs(back.UPPERARM_L[2] - withClav.UPPERARM_L[2]) < 0.9 && Math.abs(settled.UPPERARM_L[2] - base.UPPERARM_L[2]) < 0.05, { first: back.UPPERARM_L, settled: settled.UPPERARM_L, base: base.UPPERARM_L });
/* ---- donor clip player (baked Tripo cast_a_spell / hit_to_head on THIS rig) ---- */
var CAST = JSON.parse(fs.readFileSync(path.join(HERE, '..', '26_LOCAL_AUTHORITY', 'lab', 'assets', 'retarget', 'tripo_cast_a_spell_upper_v1.json'), 'utf8')); var HIT = JSON.parse(fs.readFileSync(path.join(HERE, '..', '26_LOCAL_AUTHORITY', 'lab', 'assets', 'retarget', 'tripo_hit_to_head_upper_v1.json'), 'utf8'));
A.setDonorClips({ CAST: CAST, HIT: HIT }, true); var base2 = settle(60);
var castView = function (state, p) { return { speed01: 0, speed_mps: 0, moving: false, form: 'FUSED', yaw: 0, host_t: view.host_t, attack: { attack_id: 'ATHLETE_VECTOR', state: state, category: 'SPECIAL_MAGIC', progress: p } }; };
var seq = [], bad = 0, lowerMoved = 0, lens2 = []; for (var i = 0; i <= 40; i++) { var pr = i / 40; var vv = castView('STARTUP', pr); view.host_t += 1 / 60; A.animate(vv, 1 / 60); var ps = A.pose(); seq.push(ps); Object.keys(ps).forEach(function (k) { ps[k].forEach(function (x) { if (!isFinite(x)) bad++; }); }); ['THIGH_L', 'THIGH_R', 'PELVIS', 'SHIN_L', 'TIP_L'].forEach(function (k) { if (ps[k] && base2[k] && Math.abs(ps[k][0] - base2[k][0]) > 0.15) lowerMoved++; }); var fkk = fk(ps); lens2.push(dist(fkk.pos.UPPERARM_R, fkk.pos.FOREARM_R)); }
for (var j = 0; j <= 40; j++) { view.host_t += 1 / 60; A.animate(castView('RECOVERY', j / 40), 1 / 60); seq.push(A.pose()); }
var moved = seq.some(function (ps) { return Math.abs(ps.UPPERARM_R[0] - base2.UPPERARM_R[0]) > 0.3 || Math.abs(ps.FOREARM_R[0] - base2.FOREARM_R[0]) > 0.3; });
ok('D1. donor CAST layer drives the arms during a SPECIAL cast (finite values, arms move)', bad === 0 && moved && A.donorActive() === 'CAST:ATHLETE_VECTOR', { bad: bad, moved: moved, active: A.donorActive() });
ok('D2. lower body / pelvis stay MAH-owned through the donor cast', lowerMoved === 0, { lowerMoved: lowerMoved });
ok('D3. bone lengths invariant through the donor cast', lens2.every(function (l) { return Math.abs(l - lens2[0]) < 1e-6; }));
var maxStep = 0, worst = null; for (var q2 = 1; q2 < seq.length; q2++) { ['UPPERARM_R', 'FOREARM_R', 'UPPERARM_L', 'FOREARM_L', 'CHEST'].forEach(function (k) { var a = qFromEuler(seq[q2 - 1][k][0], seq[q2 - 1][k][1], seq[q2 - 1][k][2]), b = qFromEuler(seq[q2][k][0], seq[q2][k][1], seq[q2][k][2]); var dq = qMul([-a[0], -a[1], -a[2], a[3]], b); var ang = 2 * Math.acos(Math.min(1, Math.abs(dq[3]))); if (ang > maxStep) { maxStep = ang; worst = k + '@' + q2; } }); }
if (process.env.DUMP) seq.forEach(function (ps, i) { console.log('seq', i, JSON.stringify(ps.UPPERARM_R.map(function (x) { return +x.toFixed(2); })), JSON.stringify(ps.SCAP_R.map(function (x) { return +x.toFixed(2); })), JSON.stringify(ps.FOREARM_R.map(function (x) { return +x.toFixed(2); }))); });
ok('D4. true pose continuity: no per-frame rotation step over 1.2 rad on the arm chain (quaternion angle; the donor release swings 38°/frame at 24 fps = 910°/s and the 0.81 s host startup replays 2.3 s of clip, ~1.1 clip frames per 60 fps frame)', maxStep < 1.2, { maxStep_rad: +maxStep.toFixed(3), worst: worst });
A.animate(view, 1 / 60); var after = settle(90); ok('D5. after the cast the donor layer is released and the pose returns to MAH idle', A.donorActive() === null && Math.abs(after.UPPERARM_R[0] - base2.UPPERARM_R[0]) < 0.1, { active: A.donorActive(), ua: after.UPPERARM_R, base: base2.UPPERARM_R });
var hv = function (ago) { return { speed01: 0, speed_mps: 0, moving: false, form: 'FUSED', yaw: 0, host_t: view.host_t, hitAgo: ago }; }; var hitPoses = [], activeMid = null; for (var h = 0; h < 40; h++) { view.host_t += 1 / 60; A.animate(hv(h / 60), 1 / 60); hitPoses.push(A.pose()); if (h === 10) activeMid = A.donorActive(); } A.animate(hv(0.9), 1 / 60);
ok('D6. donor HIT recoil plays on a hit and hands back by 0.6 s', hitPoses.some(function (ps) { return Math.abs(ps.CHEST[0] - base2.CHEST[0]) > 0.05 || Math.abs(ps.UPPERARM_L[0] - base2.UPPERARM_L[0]) > 0.2; }) && activeMid === 'HIT' && A.donorActive() === null, { activeMid: activeMid, after: A.donorActive() });
A.setDonorClips({}, false);
console.log('RESULT motion layer: ' + passed + ' passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
