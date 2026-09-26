import { fileURLToPath } from 'node:url';
/* MAHWORLD :: POSE ANATOMY (forward kinematics on the delivered skeleton).
   The limits suite proves no channel leaves its range; this one proves the pose MEANS what it says once the numbers reach the
   real bones. It drives lab/RigAnimator.js, then runs the composed pose through the rest skeleton read out of the shipped GLB
   and measures where the hands, elbows and tips actually end up. That is what settled the side-convention split between the
   animator (authored for `_L` at +x) and the asset and authored clips (`_L` at −x): the sign checks all agreed with each
   other, the positions did not. Model space: the face looks along +z, `_L` bones sit at −x, y is up, metres.
   node 16_TESTS/gameplay_rig_pose_fk.test.mjs */
import fs from 'node:fs';
import { createRigAnimator } from '../26_LOCAL_AUTHORITY/lab/RigAnimator.js';
import * as AD from '../26_LOCAL_AUTHORITY/lab/animData.js';
import { restFromGlb, convention } from './lib/rest_from_glb.mjs';
var pass = 0, fail = 0;
function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }
var PROFILE = JSON.parse(fs.readFileSync(new URL('../26_LOCAL_AUTHORITY/lab/rig_profile.json', import.meta.url), 'utf8'));
var DEFAULTS = JSON.parse(fs.readFileSync(new URL('../26_LOCAL_AUTHORITY/lab/presentation_defaults.json', import.meta.url), 'utf8'));
var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }
var ASSET = arg('--asset', fileURLToPath(new URL('../26_LOCAL_AUTHORITY/lab/assets/athlete_m_preview/dev_0.11/Mah_Athlete_M_am08_v5.glb', import.meta.url)));   /* portable (the old pathname.replace(/^\//) only worked on Windows) */
var RIGREST = restFromGlb(ASSET);
var CONV = convention(RIGREST), OUT = CONV.left_x_sign;

/* three.js stand-ins (Euler XYZ → quaternion, matching three's own composition) */
function Euler() { this.x = 0; this.y = 0; this.z = 0; this.order = 'XYZ'; }
Euler.prototype.set = function (x, y, z, o) { this.x = x; this.y = y; this.z = z; this.order = o || 'XYZ'; return this; }; Euler.prototype.setFromQuaternion = function (q) { /* three.js XYZ extraction (matrix based) */ var x = q.x, y = q.y, z = q.z, w = q.w; var x2 = x + x, y2 = y + y, z2 = z + z; var xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2; var m11 = 1 - (yy + zz), m12 = xy - wz, m13 = xz + wy, m22 = 1 - (xx + zz), m23 = yz - wx, m32 = yz + wx, m33 = 1 - (xx + yy); this.y = Math.asin(Math.max(-1, Math.min(1, m13))); if (Math.abs(m13) < 0.9999999) { this.x = Math.atan2(-m23, m33); this.z = Math.atan2(-m12, m11); } else { this.x = Math.atan2(m32, m22); this.z = 0; } return this; };
function Quat() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; }
Quat.prototype.setFromEuler = function (e) { var c1 = Math.cos(e.x / 2), c2 = Math.cos(e.y / 2), c3 = Math.cos(e.z / 2), s1 = Math.sin(e.x / 2), s2 = Math.sin(e.y / 2), s3 = Math.sin(e.z / 2); this.x = s1 * c2 * c3 + c1 * s2 * s3; this.y = c1 * s2 * c3 - s1 * c2 * s3; this.z = c1 * c2 * s3 + s1 * s2 * c3; this.w = c1 * c2 * c3 - s1 * s2 * s3; return this; };
Quat.prototype.slerp = function (q, t) { this.x += (q.x - this.x) * t; this.y += (q.y - this.y) * t; this.z += (q.z - this.z) * t; this.w += (q.w - this.w) * t; return this; };
Quat.prototype.set = function (x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }; Quat.prototype.copy = function (q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }; Quat.prototype.invert = function () { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }; Quat.prototype.multiply = function (b) { var a = this; var r = qMul([a.x, a.y, a.z, a.w], [b.x, b.y, b.z, b.w]); this.x = r[0]; this.y = r[1]; this.z = r[2]; this.w = r[3]; return this; };
var THREE = { Euler: Euler, Quaternion: Quat };
function makeRig(seed) { var bones = {}; AD.BONES.forEach(function (k) { var p = RIGREST.bones[k] || [0, 0, 0]; bones[k] = { name: k, position: { x: p[0], y: p[1], z: p[2] }, quaternion: new Quat() }; }); return { bones: bones, seed: seed }; }
function makeAnim(seed, classId) { return createRigAnimator(THREE, makeRig(seed), { defaults: DEFAULTS, animData: AD, classId: classId || 'ATHLETE', seed: seed === undefined ? 0.4 : seed, profile: PROFILE }); }

/* ---- forward kinematics over the asset's own hierarchy (quaternion chain, exact) ---- */
function qFromEuler(e) { var c1 = Math.cos(e[0] / 2), c2 = Math.cos(e[1] / 2), c3 = Math.cos(e[2] / 2), s1 = Math.sin(e[0] / 2), s2 = Math.sin(e[1] / 2), s3 = Math.sin(e[2] / 2); return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3]; }
function qMul(a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; }
function qRot(q, v) {
  var x = q[0], y = q[1], z = q[2], w = q[3], vx = v[0], vy = v[1], vz = v[2];
  var tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}
function fk(pose) {
  var out = {}, rot = {};
  RIGREST.order.forEach(function (name) {
    var par = RIGREST.parent[name], off = RIGREST.bones[name] || [0, 0, 0], e = pose[name] || [0, 0, 0];
    var pPos = (par && out[par]) || [0, 0, 0], pRot = (par && rot[par]) || [0, 0, 0, 1];
    var moved = qRot(pRot, off);
    out[name] = [pPos[0] + moved[0], pPos[1] + moved[1], pPos[2] + moved[2]];
    rot[name] = qMul(pRot, qFromEuler(e));
  });
  return out;
}
var V = function (o) { var b = { speed01: 0, speed_mps: 0, backward: false, yaw: 0, moving: false, fly: false, dash: null, attack: null, guard: null, hitAgo: 99, ko: false, emote: null, form: 'FUSED', mahloco: 'IDLE', alive: true, host_t: 0 }; Object.keys(o || {}).forEach(function (k) { b[k] = o[k]; }); return b; };
function run(view, seconds, seed) { var A = makeAnim(seed); var n = Math.round((seconds || 1) / (1 / 60)); var last = null; for (var i = 0; i < n; i++) { A.animate(view, 1 / 60); last = A.pose(); } return { pose: last, api: A, p: fk(last) }; }

console.log('MAHWORLD pose anatomy (FK on ' + ASSET.split(/[\\/]/).pop() + ')');
console.log('convention read from the asset: _L at x=' + CONV.left_x.toFixed(3) + ' m, face at z=' + CONV.face_z.toFixed(3) + ' m\n');

/* ---- 1 the rest pose itself ---- */
var restFK = fk({});
ok('the two hands rest on opposite sides of the body', restFK.HAND_L[0] * restFK.HAND_R[0] < 0, { L: restFK.HAND_L[0].toFixed(3), R: restFK.HAND_R[0].toFixed(3) });
ok('the face features sit on the front of the head', RIGREST.world.BROW_L[2] > RIGREST.world.HEAD[2], { brow_z: RIGREST.world.BROW_L[2].toFixed(3), head_z: RIGREST.world.HEAD[2].toFixed(3) });

/* ---- 2 idle and travel ---- */
var idle = run(V({}), 3, 0.31);
ok('idle keeps each hand on its own side', Math.sign(idle.p.HAND_L[0]) === Math.sign(restFK.HAND_L[0]) && Math.sign(idle.p.HAND_R[0]) === Math.sign(restFK.HAND_R[0]), { L: idle.p.HAND_L[0].toFixed(3), R: idle.p.HAND_R[0].toFixed(3) });
ok('idle keeps both elbows outside the torso column', Math.abs(idle.p.FOREARM_L[0]) > 0.5 * Math.abs(restFK.FOREARM_L[0]) && Math.abs(idle.p.FOREARM_R[0]) > 0.5 * Math.abs(restFK.FOREARM_R[0]), { L: idle.p.FOREARM_L[0].toFixed(3), R: idle.p.FOREARM_R[0].toFixed(3), rest: restFK.FOREARM_L[0].toFixed(3) });
var trav = run(V({ moving: true, speed01: 0.9, speed_mps: 3.4 }), 2.5, 0.52);
var leanDeg = Math.atan2(trav.p.CHEST[2] - trav.p.PELVIS[2], trav.p.CHEST[1] - trav.p.PELVIS[1]) * 180 / Math.PI;
ok('travel leans the trunk FORWARD (toward the face), inside the profile band', leanDeg >= PROFILE.travel_posture.fused_lean_deg[0] - 1.5 && leanDeg <= PROFILE.travel_posture.fused_lean_deg[1] + 3, leanDeg.toFixed(1) + ' deg (profile ' + PROFILE.travel_posture.fused_lean_deg.join('-') + ')');
ok('travel does not fold the arms across the chest', Math.sign(trav.p.HAND_L[0]) === Math.sign(restFK.HAND_L[0]) && Math.sign(trav.p.HAND_R[0]) === Math.sign(restFK.HAND_R[0]), { L: trav.p.HAND_L[0].toFixed(3), R: trav.p.HAND_R[0].toFixed(3) });

/* ---- 3 guard ---- */
var grd = run(V({ guard: 'PHYSICAL' }), 1.2, 0.7);
ok('a physical guard puts both hands in FRONT of the chest', grd.p.HAND_L[2] > grd.p.CHEST[2] + 0.03 && grd.p.HAND_R[2] > grd.p.CHEST[2] + 0.03, { hand_z_L: grd.p.HAND_L[2].toFixed(3), hand_z_R: grd.p.HAND_R[2].toFixed(3), chest_z: grd.p.CHEST[2].toFixed(3) });
ok('a guard does not cross the wrists past each other', (grd.p.HAND_L[0] - grd.p.HAND_R[0]) * OUT > -0.02, { gap_m: ((grd.p.HAND_L[0] - grd.p.HAND_R[0]) * OUT).toFixed(3) });

/* ---- 4 attacks reach forward, from the body ---- */
[['PUSH', 'HORIZONTAL_PUSH'], ['UPRIGHT_ROW', 'UPRIGHT_ROW_PULSE'], ['PULL', 'ROW_PULL'], ['ROTATION', 'DIAGONAL_ROTATION']].forEach(function (pair) {
  var st = run(V({ attack: { state: 'CONCENTRIC', progress: 0.85, category: 'PHYSICAL', attack_id: pair[1], profile: { style: 'BALANCED' } } }), 0.7, 0.2);
  var handZ = Math.max(st.p.HAND_L[2], st.p.HAND_R[2]), reach = handZ - st.p.CHEST[2];
  if (pair[0] === 'PUSH') ok('PUSH drives a hand forward of the chest', reach > 0.12, { reach_m: reach.toFixed(3) });
  var eL = Math.hypot(st.p.FOREARM_L[0] - st.p.CHEST[0], st.p.FOREARM_L[2] - st.p.CHEST[2]), eR = Math.hypot(st.p.FOREARM_R[0] - st.p.CHEST[0], st.p.FOREARM_R[2] - st.p.CHEST[2]);   /* rig v5: horizontal distance from the trunk axis (world x alone is meaningless once the trunk is twisted) */
  ok(pair[0] + ' keeps both elbows out of the ribcage', eL > 0.09 && eR > 0.09, { elbow_L_from_chest_m: eL.toFixed(3), elbow_R_from_chest_m: eR.toFixed(3) });
});

/* ---- 5 the separated gait actually steps ---- */
var A = makeAnim(0.24), view = V({ moving: true, speed01: 0.8, speed_mps: 2.6, form: 'SPLIT' });
var fwd = { L: [], R: [] }, lift = { L: [], R: [] }, cross = 0;
for (var i = 0; i < 300; i++) {
  A.animate(view, 1 / 60); var P = fk(A.pose());
  fwd.L.push(P.TIP_L[2] - P.PELVIS[2]); fwd.R.push(P.TIP_R[2] - P.PELVIS[2]);
  lift.L.push(P.TIP_L[1]); lift.R.push(P.TIP_R[1]);
  if ((P.TIP_L[0] - P.TIP_R[0]) * OUT < PROFILE.clearance.min_leg_gap_m) cross++;
}
function span(a) { return Math.max.apply(null, a) - Math.min.apply(null, a); }
ok('each separated leg swings forward and back through a real stride', span(fwd.L) > 0.15 && span(fwd.R) > 0.15, { stride_L_m: span(fwd.L).toFixed(3), stride_R_m: span(fwd.R).toFixed(3) });
ok('the two legs are out of phase (one forward while the other is back)', (function () { var n = 0; for (var k = 150; k < 300; k++) if (fwd.L[k] * fwd.R[k] < 0) n++; return n > 90; })(), 'antiphase frames of the last 150');
ok('the tips lift off the ground during the swing', span(lift.L) > 0.02 && span(lift.R) > 0.02, { lift_L_m: span(lift.L).toFixed(3), lift_R_m: span(lift.R).toFixed(3) });
ok('the legs keep their clearance and never swap sides', cross === 0, cross + ' frames under ' + PROFILE.clearance.min_leg_gap_m + ' m');

/* ---- 6 authored emotes land where the clip says ---- */
function emote(id, secs) {
  var An = makeAnim(0.66);
  var n = Math.round((secs || 1.2) / (1 / 60)), best = null, bestHigh = -1e9;
  for (var k = 0; k < n; k++) { An.animate(V({ emote: id, emote_at: 5, host_t: 5 + k / 60 }), 1 / 60); var P = fk(An.pose()); var high = P.HAND_L[1] + P.HAND_R[1]; if (high > bestHigh) { bestHigh = high; best = P; } }
  return best;
}
var db = emote('DOUBLE_BICEPS', 2.0);
ok('DOUBLE_BICEPS holds the elbows wide, not crossed in front of the throat', Math.abs(db.FOREARM_L[0] - db.FOREARM_R[0]) > 0.35 && db.FOREARM_L[0] * db.FOREARM_R[0] < 0, { elbow_L_x: db.FOREARM_L[0].toFixed(3), elbow_R_x: db.FOREARM_R[0].toFixed(3) });
ok('DOUBLE_BICEPS lifts both hands to at least chest height', db.HAND_L[1] > db.CHEST[1] - 0.05 && db.HAND_R[1] > db.CHEST[1] - 0.05, { hand_y_L: db.HAND_L[1].toFixed(3), hand_y_R: db.HAND_R[1].toFixed(3), chest_y: db.CHEST[1].toFixed(3) });

/* ---- 7 OWNER DECISIONS (motion master B): X-gather, star, lateral glide, hover ---- */
function runPhase(ms, secs, extra) { var An = makeAnim(0.66); var last = null; var n = Math.round(secs / (1 / 60)); for (var k = 0; k < n; k++) { An.animate(V(Object.assign({ mahloco: ms, form: /UNFUSE/.test(ms) ? 'SPLIT' : 'FUSED' }, extra || {})), 1 / 60); last = An.pose(); } return { p: fk(last), api: An, pose: last }; }
function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
var gth = runPhase('UNFUSE_CHARGE', 0.9);
var headC = gth.p.HEAD, chestZ = gth.p.CHEST[2], neckY = gth.p.NECK[1], pelvisY = gth.p.PELVIS[1];
ok('X-GATHER: both forearms lie in front of the pectoral surface (0.175 m ahead of the CHEST bone), never inside it', gth.p.HAND_L[2] > chestZ + 0.19 && gth.p.HAND_R[2] > chestZ + 0.19 && gth.p.FOREARM_L[2] > chestZ + 0.10 && gth.p.FOREARM_R[2] > chestZ + 0.10, { hand_z_L: gth.p.HAND_L[2].toFixed(3), hand_z_R: gth.p.HAND_R[2].toFixed(3), chest_z: chestZ.toFixed(3) });
ok('X-GATHER: the forearms cross — each hand reaches the sternum line or past it, and the two overlap', gth.p.HAND_L[0] * Math.sign(restFK.HAND_L[0]) < 0.03 && gth.p.HAND_R[0] * Math.sign(restFK.HAND_R[0]) < 0.03 && Math.abs(gth.p.HAND_L[0] - gth.p.HAND_R[0]) < 0.12,   /* rig v5 (glenohumeral pivot 2.2 cm higher, humerus 18 % longer): each hand meets the sternum line within 3 cm; the 22 cm forearms still cross by length */ { hand_x_L: gth.p.HAND_L[0].toFixed(3), hand_x_R: gth.p.HAND_R[0].toFixed(3) });
ok('X-GATHER: hands sit between navel and chin, clear of the face', gth.p.HAND_L[1] < neckY && gth.p.HAND_R[1] < neckY && gth.p.HAND_L[1] > pelvisY && dist(gth.p.HAND_L, headC) > 0.16 && dist(gth.p.HAND_R, headC) > 0.16, { hand_y_L: gth.p.HAND_L[1].toFixed(3), neck_y: neckY.toFixed(3), to_head_L: dist(gth.p.HAND_L, headC).toFixed(3) });
ok('X-GATHER: one forearm sits just ahead of the other (a readable X, not a clap)', Math.abs(gth.p.HAND_L[1] - gth.p.HAND_R[1]) + Math.abs(gth.p.HAND_L[2] - gth.p.HAND_R[2]) > 0.02 && Math.abs(gth.p.HAND_L[2] - gth.p.HAND_R[2]) < 0.14, { depth_gap_m: Math.abs(gth.p.HAND_L[2] - gth.p.HAND_R[2]).toFixed(3) });
ok('X-GATHER: both knees come FORWARD and HIGH toward the navel', gth.p.SHIN_L[2] > gth.p.PELVIS[2] + 0.12 && gth.p.SHIN_R[2] > gth.p.PELVIS[2] + 0.12 && gth.p.SHIN_L[1] > gth.p.PELVIS[1] - 0.22 && gth.p.SHIN_R[1] > gth.p.PELVIS[1] - 0.22, { knee_z_L: (gth.p.SHIN_L[2] - gth.p.PELVIS[2]).toFixed(3), knee_y_L_vs_pelvis: (gth.p.SHIN_L[1] - gth.p.PELVIS[1]).toFixed(3) });
ok('X-GATHER: the shins fold under (tips behind and below the knees), knees do not cross', gth.p.TIP_L[2] < gth.p.SHIN_L[2] && gth.p.TIP_L[1] < gth.p.SHIN_L[1] && (gth.p.SHIN_L[0] - gth.p.SHIN_R[0]) * OUT > 0.03, { tip_z_vs_knee: (gth.p.TIP_L[2] - gth.p.SHIN_L[2]).toFixed(3), knee_gap: ((gth.p.SHIN_L[0] - gth.p.SHIN_R[0]) * OUT).toFixed(3) });
var st2 = runPhase('UNFUSE_BURST', 0.12);
ok('STAR: arms open wide with nearly straight elbows, legs spread', Math.abs(st2.p.HAND_L[0] - st2.p.HAND_R[0]) > 0.9 && st2.pose.FOREARM_L[0] > -0.5 && (st2.p.TIP_L[0] - st2.p.TIP_R[0]) * OUT > 0.25, { hand_span_m: Math.abs(st2.p.HAND_L[0] - st2.p.HAND_R[0]).toFixed(3), tip_span_m: ((st2.p.TIP_L[0] - st2.p.TIP_R[0]) * OUT).toFixed(3) });
var rec = runPhase('UNFUSE_RECOVER', 0.5);
ok('SETTLE: the star relaxes into a balanced separated stance (arms down, legs under the hips)', Math.abs(rec.p.HAND_L[0] - rec.p.HAND_R[0]) < 0.75 && Math.abs(rec.p.TIP_L[0] - rec.p.TIP_R[0]) < 0.35, { hand_span_m: Math.abs(rec.p.HAND_L[0] - rec.p.HAND_R[0]).toFixed(3) });
/* lateral glide: world-right travel → the chest yaws toward travel, the leading arm opens toward it */
function glide(sign) { var An = makeAnim(0.3); var last = null; for (var k = 0; k < 90; k++) { An.animate(V({ moving: true, speed01: 0.55, speed_mps: 2.4, lateral: sign, locked: true }), 1 / 60);   /* S07: the lateral glide is the LOCK-ON strafe posture; free movement turns the whole body into travel */ last = An.pose(); } return { p: fk(last), pose: last }; }
var gR = glide(1), gL = glide(-1);
ok('GLIDE: the chest turns slightly toward the direction of travel and mirrors for the other side', Math.sign(gR.pose.CHEST[1]) === -Math.sign(gL.pose.CHEST[1]) && Math.abs(gR.pose.CHEST[1]) > 0.12 && Math.abs(gR.pose.CHEST[1]) < 0.36, { chest_yaw_right: gR.pose.CHEST[1].toFixed(3), chest_yaw_left: gL.pose.CHEST[1].toFixed(3) });
ok('GLIDE: the pelvis follows with a smaller turn, the body banks a little', Math.abs(gR.pose.PELVIS[1]) > 0.05 && Math.abs(gR.pose.PELVIS[1]) < Math.abs(gR.pose.CHEST[1]) && Math.abs(gR.pose.PELVIS[2]) > 0.02, { pelvis_yaw: gR.pose.PELVIS[1].toFixed(3), pelvis_roll: gR.pose.PELVIS[2].toFixed(3) });
/* world +x is model −x on the 180°-turned body; the `_L` bones sit at left_x_sign, so the lead side for world-right travel is L when left_x_sign is −1 */
var leadSide = CONV.left_x_sign < 0 ? 'L' : 'R', trailSide = leadSide === 'L' ? 'R' : 'L';
var lead = gR.p['HAND_' + leadSide], trail = gR.p['HAND_' + trailSide];
var leadOpen = Math.abs(lead[0] - gR.p.CHEST[0]) - Math.abs(restFK['HAND_' + leadSide][0] - restFK.CHEST[0]);
var trailBack = (trail[2] - gR.p['UPPERARM_' + trailSide][2]) - (restFK['HAND_' + trailSide][2] - restFK['UPPERARM_' + trailSide][2]);   /* relative to its own shoulder, so the travel lean does not count */
ok('GLIDE: the leading arm opens gently toward travel while the trailing arm settles back (shoulder extended, hand no further forward than at rest)', leadOpen > 0.04 && gR.pose['UPPERARM_' + trailSide][0] > 0.15 && trailBack < 0.01, { lead: leadSide, lead_open_m: leadOpen.toFixed(3), trail_shoulder_ext_rad: gR.pose['UPPERARM_' + trailSide][0].toFixed(3), trail_hand_vs_rest_m: trailBack.toFixed(3) });
ok('GLIDE: it is never a dash — both hands stay low and loose, no fist guard', gR.p.HAND_L[1] < gR.p.CHEST[1] && gR.p.HAND_R[1] < gR.p.CHEST[1] && gR.pose.FINGERS_L[0] < 0.8, { hand_y: gR.p.HAND_L[1].toFixed(3), fingers: gR.pose.FINGERS_L[0].toFixed(3) });
/* hover: the separated tips stay above the ground through the whole walk */
var Ah = makeAnim(0.24), minTip = Infinity, liftAtRest = 0, liftFused = 0;
for (var q = 0; q < 240; q++) { Ah.animate(V({ moving: q > 60, speed01: q > 60 ? 0.8 : 0, speed_mps: q > 60 ? 2.6 : 0, form: 'SPLIT' }), 1 / 60); var Ph = fk(Ah.pose()); var lift = Ah.hover().lift_m; if (q === 55) liftAtRest = lift; var low = Math.min(Ph.TIP_L[1], Ph.TIP_R[1]) + lift; if (low < minTip) minTip = low; }
var Af = makeAnim(0.24); for (var q2 = 0; q2 < 60; q2++) { Af.animate(V({ form: 'FUSED' }), 1 / 60); } liftFused = Af.hover().lift_m;
ok('HOVER: separated form floats a leg-proportional clearance above the ground; fused form does not lift', liftAtRest > 0.03 && liftAtRest < 0.09 && liftFused < 0.005, { lift_split_m: liftAtRest.toFixed(3), lift_fused_m: liftFused.toFixed(3) });
ok('HOVER: neither tip ever reaches the ground during the separated walk (no plant, no strike)', minTip > 0.03, 'lowest tip + lift = ' + minTip.toFixed(3) + ' m');
console.log('\nRESULT pose anatomy: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
