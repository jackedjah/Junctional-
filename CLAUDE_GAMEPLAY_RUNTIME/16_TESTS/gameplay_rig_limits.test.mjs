/* MAHWORLD :: rig joint limits, body clearance, posture and gait continuity — plain-node checks (development, 2026-09-15).
   Drives lab/RigAnimator.js through EVERY state it can be in (idle, fused travel at several speeds, backward, turning, flight, all four
   dashes, every attack pattern at startup and at release, both guards, hit, KO, every authored emote, and every UNFUSE_ / REFUSE_ phase)
   and asserts after every single frame that the composed pose violates no limit in lab/rig_profile.json. This is the regression that stops
   the −2.3 rad elbow (132° of flexion, the "arms folding into the torso" defect) coming back through any layer.
   node 16_TESTS/gameplay_rig_limits.test.mjs   (from CLAUDE_GAMEPLAY_RUNTIME) */
import fs from 'node:fs';
import { createRigAnimator } from '../26_LOCAL_AUTHORITY/lab/RigAnimator.js';
import * as AD from '../26_LOCAL_AUTHORITY/lab/animData.js';
var pass = 0, fail = 0; function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }
var PROFILE = JSON.parse(fs.readFileSync(new URL('../26_LOCAL_AUTHORITY/lab/rig_profile.json', import.meta.url), 'utf8'));
var DEFAULTS = JSON.parse(fs.readFileSync(new URL('../26_LOCAL_AUTHORITY/lab/presentation_defaults.json', import.meta.url), 'utf8'));
var LIM = PROFILE.limits_rad, DEG = Math.PI / 180, EPS = 1e-6;

/* ---- minimal three.js stand-ins: the animator only needs Euler, Quaternion and bone.quaternion.slerp ---- */
function Euler() { this.x = 0; this.y = 0; this.z = 0; this.order = 'XYZ'; }
Euler.prototype.set = function (x, y, z, o) { this.x = x; this.y = y; this.z = z; this.order = o || 'XYZ'; return this; }; Euler.prototype.setFromQuaternion = function (q) { /* three.js XYZ extraction (matrix based) */ var x = q.x, y = q.y, z = q.z, w = q.w; var x2 = x + x, y2 = y + y, z2 = z + z; var xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2; var m11 = 1 - (yy + zz), m12 = xy - wz, m13 = xz + wy, m22 = 1 - (xx + zz), m23 = yz - wx, m32 = yz + wx, m33 = 1 - (xx + yy); this.y = Math.asin(Math.max(-1, Math.min(1, m13))); if (Math.abs(m13) < 0.9999999) { this.x = Math.atan2(-m23, m33); this.z = Math.atan2(-m12, m11); } else { this.x = Math.atan2(m32, m22); this.z = 0; } return this; };
function Quat() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; }
Quat.prototype.setFromEuler = function (e) { var c1 = Math.cos(e.x / 2), c2 = Math.cos(e.y / 2), c3 = Math.cos(e.z / 2), s1 = Math.sin(e.x / 2), s2 = Math.sin(e.y / 2), s3 = Math.sin(e.z / 2); this.x = s1 * c2 * c3 + c1 * s2 * s3; this.y = c1 * s2 * c3 - s1 * c2 * s3; this.z = c1 * c2 * s3 + s1 * s2 * c3; this.w = c1 * c2 * c3 - s1 * s2 * s3; return this; };
Quat.prototype.slerp = function (q, t) { this.x += (q.x - this.x) * t; this.y += (q.y - this.y) * t; this.z += (q.z - this.z) * t; this.w += (q.w - this.w) * t; return this; };
function qMul(a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; }
Quat.prototype.set = function (x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }; Quat.prototype.copy = function (q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }; Quat.prototype.invert = function () { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }; Quat.prototype.multiply = function (b) { var a = this; var r = qMul([a.x, a.y, a.z, a.w], [b.x, b.y, b.z, b.w]); this.x = r[0]; this.y = r[1]; this.z = r[2]; this.w = r[3]; return this; };
var THREE = { Euler: Euler, Quaternion: Quat };

/* ---- the rest skeleton comes from the DELIVERED asset, not from numbers typed here ----
   The previous fixture put every `_L` bone at +x. The shipped rig puts them at −x (the runtime turns the whole body 180°
   about Y, which relocates the character but mirrors nothing), so poses tuned against that fixture abducted the wrong way.
   Reading the rest pose from the GLB means the convention can only be wrong in the asset, where the bind test would catch it. */
import { restFromGlb, convention } from './lib/rest_from_glb.mjs';
var ASSET = new URL('../26_LOCAL_AUTHORITY/lab/assets/athlete_m_preview/dev_0.11/Mah_Athlete_M_am08_v5.glb', import.meta.url);
var RESTRIG = restFromGlb(ASSET.pathname.replace(/^\//, '').replace(/%20/g, ' '));
var CONV = convention(RESTRIG); var REST = RESTRIG.bones;
/* Side-dependent expectations are derived from the asset, never assumed. OUT is the sign that ABDUCTS the left arm (moves it
   away from the body): a bone below its joint swings toward +x on a positive z rotation, so a left arm sitting at −x opens on
   −z. Everything below multiplies by OUT instead of hard-coding a sign. */
var OUT = CONV.left_x_sign;
function makeRig(seed) { var bones = {}; AD.BONES.forEach(function (k) { var p = REST[k] || [0, 0, 0]; bones[k] = { name: k, position: { x: p[0], y: p[1], z: p[2] }, quaternion: new Quat() }; }); return { bones: bones, scale: 1, seed: seed === undefined ? 0.37 : seed, profile: PROFILE }; }
function makeAnim(seed, classId) { return createRigAnimator(THREE, makeRig(seed), { defaults: DEFAULTS, animData: AD, classId: classId || 'ATHLETE', seed: seed, profile: PROFILE }); }

/* ---- limit checking against the PROFILE (not against the animator's own copy) ---- */
function violations(pose, label, over) {
  var bad = [];
  Object.keys(pose).forEach(function (k) {
    var base = k.replace(/_(L|R)$/, ''); var v = pose[k];
    ['x', 'y', 'z'].forEach(function (ax, i) {
      if (!Number.isFinite(v[i])) { bad.push(label + ' ' + k + '.' + ax + ' = ' + v[i]); return; }
      var r = (over && over[base + '_' + ax]) || LIM[base + '_' + ax]; if (!r) return;
      if (v[i] < r[0] - EPS || v[i] > r[1] + EPS) bad.push(label + ' ' + k + '.' + ax + ' = ' + v[i].toFixed(3) + ' outside [' + r[0] + ', ' + r[1] + ']');
    });
  });
  return bad;
}
/* trunk-to-thigh INSIDE angle: the trunk bends away from the pelvis by SPINE+CHEST, the (fused) lower body by TAIL1 / the thigh by THIGH_x; the pelvis is common to both, so its own lean cancels */
function trunkToThighDeg(pose, lowerKey) { var trunk = pose.SPINE[0] + pose.CHEST[0] + (pose.LUMBAR ? pose.LUMBAR[0] : 0) + (pose.SPINE2 ? pose.SPINE2[0] : 0); var lower = pose[lowerKey][0]; return 180 - (trunk - lower) / DEG; }   /* rig v5: the trunk is four segments */
/* feet in pelvis space: the legs must never cross */
function footX(pose, side) { var hip = RESTRIG.world['THIGH_' + side][0]; var t = pose['THIGH_' + side], s = pose['SHIN_' + side]; var lt = 0.42, ls = 0.40; return hip + Math.sin(t[2]) * lt + Math.sin(t[2] + s[2]) * ls; }

var runs = 0, frames = 0, allBad = [];
function drive(label, steps, seed) {
  var A = makeAnim(seed); var out = { events: [], poses: [], api: A }; runs++;
  steps.forEach(function (stp) { var n = Math.max(1, Math.round(stp.s / (1 / 60)));
    for (var i = 0; i < n; i++) { A.animate(stp.v, 1 / 60); frames++; var p = A.pose(); var g = A.gait(); if (g.events.length) out.events = out.events.concat(g.events);
      var bad = violations(p, label + ' @' + (stp.label || '')); if (bad.length) allBad = allBad.concat(bad.slice(0, 3));
      if (stp.collect) out.poses.push({ label: stp.label, pose: p, gait: g }); } });
  return out;
}
var V = function (o) { var b = { speed01: 0, speed_mps: 0, backward: false, yaw: 0, moving: false, fly: false, dash: null, attack: null, guard: null, hitAgo: 99, ko: false, emote: null, form: 'FUSED', mahloco: 'IDLE', altitude: 0 }; Object.keys(o || {}).forEach(function (k) { b[k] = o[k]; }); return b; };

/* ───────── 1 the contract the animator exposes ───────── */
var A0 = makeAnim(); A0.animate(V({}), 1 / 60);
var lim = A0.limits();
ok('api.limits() states the INSIDE-angle convention', /INSIDE_ANGLE/.test(lim.convention) && /180/.test(lim.convention), lim.convention);
ok('api.limits() carries a resolved range for every bone in the contract', AD.BONES.every(function (b) { return !!lim.table[b]; }), AD.BONES.filter(function (b) { return !lim.table[b]; }));
ok('api.limits() resolves L/R bones from their base key (FOREARM_L → FOREARM_x)', lim.table.FOREARM_L.x[0] === LIM.FOREARM_x[0] && lim.table.FOREARM_R.x[1] === LIM.FOREARM_x[1] && lim.table.SHIN_L.x[1] === LIM.SHIN_x[1] && lim.table.THIGH_R.x[0] === LIM.THIGH_x[0]);
var SEGREF = (function () { function d(a, b) { var p = RESTRIG.world[a], q = RESTRIG.world[b]; return Math.sqrt(Math.pow(p[0] - q[0], 2) + Math.pow(p[1] - q[1], 2) + Math.pow(p[2] - q[2], 2)); } return { thigh: d('THIGH_L', 'SHIN_L'), shin: d('SHIN_L', 'TIP_L'), upperarm: d('UPPERARM_L', 'FOREARM_L'), forearm: d('FOREARM_L', 'HAND_L') }; })();
ok('segment lengths are MEASURED from the rig rest pose, not assumed', ['thigh', 'shin', 'upperarm', 'forearm'].every(function (k) { return Math.abs(lim.segments_m[k] - SEGREF[k]) < 1e-6; }), { animator: lim.segments_m, asset: SEGREF });
/* animation time must equal wall-clock time whatever the frame rate: one slow frame has to cover the same ground as the
   many fast frames it replaces, or the character plays in slow motion on a loaded machine (that is exactly what the 0.1 s
   delta clamp in play.js used to do). */
var TA = makeAnim(0.3), TB = makeAnim(0.3), vWalk = V({ moving: true, speed01: 0.7, speed_mps: 2.4, form: 'SPLIT' });
for (var ti = 0; ti < 30; ti++) TA.animate(vWalk, 1 / 30);          /* 1.0 s at 30 fps */
for (var tj = 0; tj < 4; tj++) TB.animate(vWalk, 0.25);             /* 1.0 s at 4 fps */
var gA = TA.gait(), gB = TB.gait();
var poseA = TA.pose(), poseB = TB.pose();
var poseDrift = Math.max.apply(null, AD.BONES.map(function (b) { return Math.max(Math.abs(poseA[b][0] - poseB[b][0]), Math.abs(poseA[b][1] - poseB[b][1]), Math.abs(poseA[b][2] - poseB[b][2])); }));
ok('animation time tracks wall clock at any frame rate (a 4 fps frame covers the same ground as 30 fps)', Math.abs(gA.phase - gB.phase) < 0.05 && poseDrift < 0.25, { fast_phase: +gA.phase.toFixed(3), slow_phase: +gB.phase.toFixed(3), worst_bone_drift_rad: +poseDrift.toFixed(3) });
var TC = makeAnim(0.3); TC.animate(vWalk, 9.0);                      /* a stalled tab must not integrate a 9 s jump */
ok('a stalled frame is still bounded (no 9 s integration jump)', TC.gait().phase < 2 * Math.PI * 3, TC.gait().phase.toFixed(2));
ok('api.pose() returns an [x,y,z] triple for every bone', AD.BONES.every(function (b) { var v = A0.pose()[b]; return Array.isArray(v) && v.length === 3 && v.every(Number.isFinite); }));
ok('the existing API is unchanged (gait / beams / face / form / emoteState / alive)', ['gait', 'beams', 'face', 'form', 'emoteState', 'alive', 'seam', 'propulsion', 'animate'].every(function (k) { return typeof A0[k] === 'function'; }));
/* a second animator, fed a profile with a deliberately tighter elbow, must obey THAT profile — the limits are data, not hard-coded */
var tight = JSON.parse(JSON.stringify(PROFILE)); tight.limits_rad.FOREARM_x = [-0.40, 0.05];
var AT = createRigAnimator(THREE, makeRig(0.5), { defaults: DEFAULTS, animData: AD, classId: 'ATHLETE', profile: tight });
for (var i = 0; i < 90; i++) AT.animate(V({ guard: 'PHYSICAL' }), 1 / 60);
ok('the limit table is data-driven: a tighter profile tightens the pose', AT.pose().FOREARM_L[0] >= -0.40 - EPS && AT.pose().FOREARM_R[0] >= -0.40 - EPS, AT.pose().FOREARM_L);

/* ───────── 2 idle, locomotion, flight, turns ───────── */
var idle = drive('idle', [{ s: 20, v: V({}), label: 'idle', collect: true }]);
ok('20 s of idle stays inside every limit', violations(idle.poses[idle.poses.length - 1].pose, 'idle').length === 0);
var idlePoses = idle.poses.map(function (p) { return p.pose; });
function spread(key, ax) { var a = idlePoses.map(function (p) { return p[key][ax]; }); return Math.max.apply(null, a) - Math.min.apply(null, a); }
ok('the idle is alive, not frozen (the ribcage and head keep moving)', spread('CHEST', 0) > 0.008 && spread('HEAD', 0) + spread('HEAD', 1) > 0.02, { chest: spread('CHEST', 0).toFixed(4), head: (spread('HEAD', 0) + spread('HEAD', 1)).toFixed(4) });
ok('the idle is RELAXED (no braced arms: the resting elbow stays near straight)', idlePoses.every(function (p) { return p.FOREARM_L[0] > -0.45 && p.FOREARM_R[0] > -0.45; }), Math.min.apply(null, idlePoses.map(function (p) { return p.FOREARM_L[0]; })).toFixed(3));

var travel = drive('fused travel', [
  { s: 2, v: V({ speed01: 0.25, speed_mps: 1.4, moving: true }), label: 'walk', collect: true },
  { s: 2, v: V({ speed01: 0.6, speed_mps: 3.3, moving: true }), label: 'jog', collect: true },
  { s: 2, v: V({ speed01: 1.0, speed_mps: 5.5, moving: true }), label: 'sprint', collect: true },
  { s: 1.5, v: V({ speed01: 0.7, speed_mps: 3.8, backward: true, moving: true }), label: 'backward', collect: true },
  { s: 1, v: V({ speed01: 0, speed_mps: 0 }), label: 'stop', collect: true }]);
ok('fused travel at every speed, backward and braking stays inside every limit', violations(travel.poses[travel.poses.length - 1].pose, 'travel').length === 0);
var tp = {}; travel.poses.forEach(function (p) { (tp[p.label] = tp[p.label] || []).push(p.pose); });
function leanDeg(p) { return (p.PELVIS[0] + p.SPINE[0] + p.CHEST[0]) / DEG; }
var sprintLast = tp.sprint[tp.sprint.length - 1], walkLast = tp.walk[tp.walk.length - 1];
ok('travel lean is a WHOLE-BODY incline distributed pelvis → spine → chest → lower body', sprintLast.PELVIS[0] > sprintLast.SPINE[0] && sprintLast.SPINE[0] > sprintLast.CHEST[0] && sprintLast.TAIL1[0] > 0, { pelvis: sprintLast.PELVIS[0].toFixed(3), spine: sprintLast.SPINE[0].toFixed(3), chest: sprintLast.CHEST[0].toFixed(3), tail1: sprintLast.TAIL1[0].toFixed(3) });
ok('the lean follows travel_posture.lean_distribution (PELVIS 0.45 / SPINE 0.3 / CHEST 0.15 / TAIL1 0.1)', Math.abs(sprintLast.PELVIS[0] / (sprintLast.PELVIS[0] + sprintLast.TAIL1[0]) - 0.45 / 0.55) < 0.12, (sprintLast.PELVIS[0] / sprintLast.TAIL1[0]).toFixed(2) + ' vs 4.5');
ok('the lean magnitude stays in the 5–12° band (never a waist hinge)', tp.sprint.every(function (p) { return leanDeg(p) < 13.5; }) && leanDeg(sprintLast) > 3 && leanDeg(walkLast) < leanDeg(sprintLast), { walk: leanDeg(walkLast).toFixed(1), sprint: leanDeg(sprintLast).toFixed(1) });
var t2tBad = []; ['walk', 'jog', 'sprint'].forEach(function (k) { tp[k].forEach(function (p) { var a = trunkToThighDeg(p, 'TAIL1'); if (a < PROFILE.limits_inside_deg.trunk_to_thigh_travel.min || a > PROFILE.limits_inside_deg.trunk_to_thigh_travel.max) t2tBad.push(k + ' ' + a.toFixed(1) + '°'); }); });
ok('trunk-to-thigh stays 170–180° through all of fused travel (the body inclines, the waist does not fold)', t2tBad.length === 0, t2tBad.slice(0, 4));
var trailMax = Math.max.apply(null, tp.sprint.map(function (p) { return Math.max(p.UPPERARM_L[0], p.UPPERARM_R[0]); }));
ok('the trailing shoulder is only 10–15° (arms are not dragged behind the back)', trailMax > 8 * DEG && trailMax < 17 * DEG, (trailMax / DEG).toFixed(1) + '°');

var turning = []; for (var yw = 0, k2 = 0; k2 < 240; k2++) { yw += 0.035; turning.push(yw); }
var AT2 = makeAnim(0.61); var turnPoses = [];
turning.forEach(function (y) { AT2.animate(V({ speed01: 0.7, speed_mps: 3.9, moving: true, yaw: y }), 1 / 60); frames++; turnPoses.push(AT2.pose()); var b = violations(AT2.pose(), 'turn'); if (b.length) allBad = allBad.concat(b.slice(0, 3)); });
var tl = turnPoses[turnPoses.length - 1];
ok('a sustained turn stays inside every limit', violations(tl, 'turn').length === 0);
ok('the turn is shared chest / pelvis / lower body with the head leading (anticipation and follow-through)', Math.abs(tl.CHEST[1] + (tl.SPINE2 ? tl.SPINE2[1] : 0)) > Math.abs(tl.PELVIS[1]) && Math.abs(tl.PELVIS[1]) > Math.abs(tl.TAIL1[1]) && Math.abs(tl.HEAD[1]) > 0.01, { head: tl.HEAD[1].toFixed(3), chest: (tl.CHEST[1] + (tl.SPINE2 ? tl.SPINE2[1] : 0)).toFixed(3), pelvis: tl.PELVIS[1].toFixed(3), tail1: tl.TAIL1[1].toFixed(3) });

var flight = drive('flight', [
  { s: 1.5, v: V({ fly: true, speed01: 0.3, speed_mps: 2.4, altitude: 3, vz: 0.6 }), label: 'climb', collect: true },
  { s: 1.5, v: V({ fly: true, speed01: 1, speed_mps: 8.5, altitude: 6, yaw: 0.4 }), label: 'cruise', collect: true },
  { s: 1.5, v: V({ fly: true, speed01: 0.4, speed_mps: 2.0, altitude: 2, vz: -0.6 }), label: 'descend', collect: true },
  { s: 1.5, v: V({ fly: true, speed01: 1, speed_mps: 8.5, altitude: 6, form: 'SPLIT' }), label: 'split flight', collect: true }]);
ok('flight (climb, cruise, descend, separated) stays inside every limit', violations(flight.poses[flight.poses.length - 1].pose, 'flight').length === 0);
var cr = flight.poses.filter(function (p) { return p.label === 'cruise'; }).pop().pose;
ok('flight uses the same distributed whole-body incline, 8–18° (it REPLACES the travel lean, never stacks on it)', leanDeg(cr) > 6 && leanDeg(cr) < 19 && cr.PELVIS[0] > cr.SPINE[0] && cr.SPINE[0] > cr.CHEST[0], leanDeg(cr).toFixed(1) + '°');

/* ───────── 3 separated gait: fitted to the real segments, even L/R support across stop / start / reverse / turn / dash ───────── */
var G = makeAnim(0.24); var gEvents = [], gPoses = [], crossBad = [], kneeBad = [];
function gaitStep(v, secs) { var n = Math.round(secs * 60); for (var i = 0; i < n; i++) { G.animate(v, 1 / 60); frames++; var p = G.pose(); gPoses.push(p); var g = G.gait(); gEvents = gEvents.concat(g.events);
  var b = violations(p, 'gait'); if (b.length) allBad = allBad.concat(b.slice(0, 3));
  if ((footX(p, 'L') - footX(p, 'R')) * OUT < PROFILE.clearance.min_leg_gap_m) crossBad.push(((footX(p, 'L') - footX(p, 'R')) * OUT).toFixed(3));
  if (p.SHIN_L[0] < LIM.SHIN_x[0] - EPS || p.SHIN_R[0] < LIM.SHIN_x[0] - EPS) kneeBad.push('hyperextended knee'); } }
var SP = function (o) { o = o || {}; o.form = 'SPLIT'; return V(o); };
gaitStep(SP({ speed01: 0.3, speed_mps: 1.6, moving: true }), 3);              /* start walking */
gaitStep(SP({ speed01: 0.9, speed_mps: 4.9, moving: true }), 3);              /* accelerate */
gaitStep(SP({ speed01: 0, speed_mps: 0 }), 1.2);                              /* stop */
gaitStep(SP({ speed01: 0.6, speed_mps: 3.2, moving: true }), 2.5);            /* start again */
gaitStep(SP({ speed01: 0.6, speed_mps: 3.2, moving: true, backward: true }), 2.5);   /* reverse */
for (var yy = 0, n3 = 0; n3 < 150; n3++) { yy += 0.03; gaitStep(SP({ speed01: 0.6, speed_mps: 3.2, moving: true, yaw: yy }), 1 / 60); }   /* turn while walking */
gaitStep(SP({ speed01: 1, speed_mps: 5.5, moving: true, yaw: yy, dash: { dir: 'FORWARD' } }), 0.5);   /* dash */
gaitStep(SP({ speed01: 0.7, speed_mps: 3.8, moving: true, yaw: yy }), 2.5);   /* recover */
gaitStep(SP({ speed01: 0, speed_mps: 0, yaw: yy }), 1.2);                     /* stop again */
ok('the separated gait never violates a limit across start / stop / reverse / turn / dash', allBad.filter(function (s) { return /^gait/.test(s); }).length === 0, allBad.filter(function (s) { return /^gait/.test(s); }).slice(0, 4));
ok('the gait produces support events at all', gEvents.length >= 12, gEvents.length);
var alt = []; for (var e1 = 1; e1 < gEvents.length; e1++) if (gEvents[e1].side === gEvents[e1 - 1].side) alt.push(e1 + ':' + gEvents[e1].side);
ok('support events alternate L/R EVENLY across stop / start / reverse / turn / dash (no repeated side)', alt.length === 0, alt.slice(0, 5));
var nL = gEvents.filter(function (e) { return e.side === 'L'; }).length, nR = gEvents.length - nL;
ok('left and right take an equal share of the supports', Math.abs(nL - nR) <= 1, { L: nL, R: nR });
ok('the knees never cross and never hyperextend', crossBad.length === 0 && kneeBad.length === 0, { crossed: crossBad.slice(0, 3), knees: kneeBad.length });
var strideMax = Math.max.apply(null, gPoses.map(function (p) { return Math.abs(p.THIGH_L[0]); }));
var LEG_M = SEGREF.thigh + SEGREF.shin;
var reach = Math.sin(strideMax) * LEG_M;
ok('stride is FITTED to the measured leg (half-step ≤ the leg can reach)', reach <= LEG_M * 0.93 + 1e-6 && reach > 0.15, { half_step_m: reach.toFixed(3), leg_m: LEG_M.toFixed(3) });
var kneeMax = Math.max.apply(null, gPoses.map(function (p) { return p.SHIN_L[0]; }));
ok('the knee flex happens at SHIN_* and peaks in mid-swing', kneeMax > 0.3 && kneeMax <= LIM.SHIN_x[1] + EPS, kneeMax.toFixed(3));
var airG = makeAnim(0.9); var beforeAir = null, afterAir = null, airEvents = [];
for (var q1 = 0; q1 < 120; q1++) { airG.animate(SP({ speed01: 0.7, speed_mps: 3.8, moving: true }), 1 / 60); airG.gait(); frames++; }
beforeAir = airG.gait().phase;
for (var q2 = 0; q2 < 60; q2++) { airG.animate(SP({ speed01: 0.7, speed_mps: 3.8, moving: true, altitude: 4, fly: true }), 1 / 60); airEvents = airEvents.concat(airG.gait().events); frames++; }
afterAir = airG.gait().phase;
ok('the gait phase freezes in the air and emits no phantom support', Math.abs(afterAir - beforeAir) < 1e-6 && airEvents.length === 0, { before: beforeAir.toFixed(4), after: afterAir.toFixed(4), events: airEvents.length });

/* ───────── 4 dashes, attacks, guards, hit, KO ───────── */
['FORWARD', 'BACK', 'LEFT', 'RIGHT'].forEach(function (dir) {
  var d = drive('dash ' + dir, [{ s: 0.5, v: V({ speed01: 1, speed_mps: 5.5, moving: true, dash: { dir: dir } }), label: dir, collect: true }], 0.4);
  ok('dash ' + dir + ' stays inside every limit', violations(d.poses[d.poses.length - 1].pose, 'dash').length === 0, violations(d.poses[d.poses.length - 1].pose, 'dash').slice(0, 3));
});
var dF = drive('dash lead', [{ s: 0.4, v: V({ speed01: 1, speed_mps: 5.5, moving: true, dash: { dir: 'FORWARD' } }), label: 'fwd', collect: true }], 0.4).poses.pop().pose;
ok('the dash lead arm still READS as a lead (a committed but legal elbow)', dF.FOREARM_R[0] < -0.8 && dF.FOREARM_R[0] >= LIM.FOREARM_x[0] - EPS && dF.UPPERARM_R[0] < -0.8, { elbow: dF.FOREARM_R[0].toFixed(3), shoulder: dF.UPPERARM_R[0].toFixed(3) });

var PATTERNS = ['HORIZONTAL_PUSH', 'HORIZONTAL_PULL', 'UPRIGHT_ROW', 'HIP_HINGE', 'SQUAT_DRIVE', 'ROTATION_DIAGONAL', 'GROUND_PULSE', 'SPECIAL_BEAM'];
var atkBad = [], atkPose = {};
PATTERNS.forEach(function (id) {
  [{ st: 'CONCENTRIC_STARTUP', cat: 'PHYSICAL' }, { st: 'RECOVERY', cat: 'PHYSICAL' }, { st: 'CONCENTRIC_STARTUP', cat: 'SPECIAL_MAGIC' }, { st: 'RECOVERY', cat: 'SPECIAL_MAGIC' }].forEach(function (ph) {
    ['HEAVY', 'QUICK', 'FLOW', 'PRECISE'].forEach(function (style) {
      var A = makeAnim(0.13); var last = null, peakPose = null, peakAt = ph.st === 'RECOVERY' ? 0.4 : 0.95, lastP = 0;   /* the pose READS at the peak of the beat: ≈0.95 through the wind-up, ≈0.40 through the release (by progress 1 the layer has already faded out) */
      for (var p = 0; p <= 1.0001; p += 1 / 30) { A.animate(V({ attack: { state: ph.st, progress: p, category: ph.cat, attack_id: id, profile: { style: style } } }), 1 / 60); frames++; last = A.pose(); lastP = p; if (Math.abs(p - peakAt) <= 1 / 60) peakPose = last; var b = violations(last, 'attack ' + id + ' ' + ph.st + ' ' + style); if (b.length) atkBad = atkBad.concat(b.slice(0, 2)); }
      if (style === 'HEAVY') atkPose[id + '|' + ph.st + '|' + ph.cat] = peakPose || last;
    }); }); runs++; });
ok('every attack pattern, at startup and release, in every style, stays inside every limit', atkBad.length === 0, atkBad.slice(0, 5));
var pullRel = atkPose['HORIZONTAL_PULL|RECOVERY|PHYSICAL'], rowRel = atkPose['UPRIGHT_ROW|RECOVERY|PHYSICAL'];
ok('the re-authored PULL still reads as a row (girdle retracts, elbows draw back, legal elbow)', pullRel.FOREARM_L[0] < -0.5 && pullRel.FOREARM_L[0] >= LIM.FOREARM_x[0] - EPS && pullRel.CLAV_L[1] * OUT > 0.05 && pullRel.UPPERARM_L[0] > 0, { elbow: pullRel.FOREARM_L[0].toFixed(3), clav_retraction_y: (pullRel.CLAV_L[1] * OUT).toFixed(3), clav_elevation_z: pullRel.CLAV_L[2].toFixed(3) });
ok('the re-authored UPRIGHT_ROW still lifts the elbows above the hands', rowRel.UPPERARM_L[2] * OUT > 0.5 && rowRel.FOREARM_L[0] < -0.5 && rowRel.FOREARM_L[0] >= LIM.FOREARM_x[0] - EPS, { abduct: (rowRel.UPPERARM_L[2] * OUT).toFixed(3), elbow: rowRel.FOREARM_L[0].toFixed(3) });

['PHYSICAL', 'MAGICAL'].forEach(function (gd) {
  var g = drive('guard ' + gd, [{ s: 1.5, v: V({ guard: gd }), label: gd, collect: true }], 0.77);
  var p = g.poses.pop().pose;
  ok('the ' + gd + ' guard stays inside every limit', violations(p, 'guard').length === 0, violations(p, 'guard').slice(0, 3));
  if (gd === 'PHYSICAL') ok('the re-authored deep guard still protects (forearms up, elbow at the 105° floor, not through it)', p.FOREARM_L[0] < -1.0 && p.FOREARM_L[0] >= LIM.FOREARM_x[0] - EPS && p.UPPERARM_L[0] < -0.5, { elbow: p.FOREARM_L[0].toFixed(3), shoulder: p.UPPERARM_L[0].toFixed(3) });
});
var hit = drive('hit', [{ s: 0.1, v: V({ hitAgo: 99 }) }, { s: 0.5, v: V({ hitAgo: 0.02, hitDir: 0.8 }), label: 'hit', collect: true }, { s: 0.5, v: V({ hitAgo: 0.3, hitDir: -2.1 }), label: 'hit2', collect: true }], 0.55);
ok('the hit reaction stays inside every limit', violations(hit.poses.pop().pose, 'hit').length === 0);
var ko = drive('ko', [{ s: 2, v: V({ ko: true, outcome: 'LOSS' }), label: 'ko', collect: true }], 0.31);
ok('the KO pose stays inside every limit', violations(ko.poses.pop().pose, 'ko').length === 0, violations(ko.poses.pop().pose, 'ko').slice(0, 3));

/* ───────── 5 every authored emote, in both forms, both partner roles ───────── */
var emBad = [], emRan = 0;
AD.EMOTE_ORDER.forEach(function (id) {
  ['FUSED', 'SPLIT'].forEach(function (form) {
    ['A', 'B'].forEach(function (role) {
      var def = AD.EMOTES[id]; if (role === 'B' && !(def && def.roles && def.roles.B)) return;
      var A = makeAnim(0.47); emRan++; runs++;
      var dur = AD.emoteDuration(def, 2) + 1.5;
      for (var t = 0; t < dur; t += 1 / 60) { A.animate(V({ emote: id, emote_at: 100, paired: { id: id, role: role, t0: null }, form: form, host_t: 100 + t }), 1 / 60); frames++; var ad = A.armDebug ? A.armDebug() : null; var epOn = ad && ad.endpoint && (ad.endpoint.L || ad.endpoint.R); var ovT = Object.assign({}, def && def.allowance && PROFILE.pose_overrides[def.allowance] ? PROFILE.pose_overrides[def.allowance].limits_rad : {}, epOn && PROFILE.pose_overrides.emote_endpoint ? PROFILE.pose_overrides.emote_endpoint.limits_rad : {}); var b = violations(A.pose(), 'emote ' + id + ' ' + form + ' ' + role, Object.keys(ovT).length ? ovT : null); if (b.length) emBad = emBad.concat(b.slice(0, 2)); }   /* S13: an arm solved to an explicit endpoint runs under the named emote_endpoint allowance (rig_profile pose_overrides) for those frames only */
    }); }); });
ok('all ' + AD.EMOTE_ORDER.length + ' authored emotes (' + emRan + ' form/role runs) stay inside every limit', emBad.length === 0, emBad.slice(0, 6));
var AE = makeAnim(0.47); for (var t2 = 0; t2 < 1.2; t2 += 1 / 60) { AE.animate(V({ emote: 'WAVE', emote_at: 5, host_t: 5 + t2 }), 1 / 60); frames++; }
ok('an emote still plays (it is refitted to the limits, not frozen out)', Math.abs(AE.pose().UPPERARM_R[2]) > 0.3 || Math.abs(AE.pose().FOREARM_R[0]) > 0.3, AE.pose().UPPERARM_R);
/* an emote must not be able to bypass what locomotion obeys */
var AM = makeAnim(0.47), mixBad = [];
for (var t3 = 0; t3 < 3; t3 += 1 / 60) { AM.animate(V({ emote: 'MAH_GROOVE', emote_at: 2, host_t: 2 + t3, speed01: 0.8, speed_mps: 4.4, moving: true, form: 'SPLIT', guard: t3 > 1.5 ? 'PHYSICAL' : null }), 1 / 60); frames++; var b3 = violations(AM.pose(), 'emote+travel+guard'); if (b3.length) mixBad = mixBad.concat(b3.slice(0, 2)); }
ok('an emote stacked on travel AND a guard still cannot escape the limits', mixBad.length === 0, mixBad.slice(0, 4));

/* ───────── 6 transformation: every UNFUSE_* / REFUSE_* phase, gather → release → settle ───────── */
var TF = ['UNFUSE_ENTER', 'UNFUSE_CURL', 'UNFUSE_CHARGE', 'UNFUSE_BURST', 'UNFUSE_STAR', 'UNFUSE_RECOVER', 'REFUSE_ENTER', 'REFUSE_KNEES_UP', 'REFUSE_ALIGN', 'REFUSE_SNAP', 'REFUSE_RECOVER'];
var tfBad = [], tfLast = {}, AF = makeAnim(0.66);
TF.forEach(function (ms) { for (var t4 = 0; t4 < 0.9; t4 += 1 / 60) { AF.animate(V({ mahloco: ms, form: /UNFUSE/.test(ms) ? 'SPLIT' : 'FUSED' }), 1 / 60); frames++; var b4 = violations(AF.pose(), 'transform ' + ms, PROFILE.pose_overrides && PROFILE.pose_overrides.transformation ? PROFILE.pose_overrides.transformation.limits_rad : null); if (b4.length) tfBad = tfBad.concat(b4.slice(0, 2)); } tfLast[ms] = AF.pose(); runs++; });
ok('every UNFUSE_* and REFUSE_* phase stays inside the transformation allowance (pose_overrides.transformation) and the shared table elsewhere', tfBad.length === 0, tfBad.slice(0, 6));
var TFO = PROFILE.pose_overrides.transformation.limits_rad;
ok('the transformation allowance is a NAMED override, not a widening of the shared table', LIM.FOREARM_x[0] >= -1.31 - EPS && TFO.FOREARM_x[0] < LIM.FOREARM_x[0] && TFO.THIGH_x[0] < LIM.THIGH_x[0] && TFO.SHIN_x[1] > LIM.SHIN_x[1], { shared_elbow: LIM.FOREARM_x, transformation_elbow: TFO.FOREARM_x });
var EPO = PROFILE.pose_overrides.emote_endpoint && PROFILE.pose_overrides.emote_endpoint.limits_rad; ok('the emote endpoint allowance is a NAMED override for the arm chain only (no lower-body / trunk keys), and the shared elbow cap is unchanged', !!EPO && Object.keys(EPO).every(function (k) { return /^(UPPERARM|FOREARM)_[xyz]$/.test(k); }) && LIM.FOREARM_x[0] >= -1.31 - EPS && EPO.FOREARM_x[0] < LIM.FOREARM_x[0], EPO);
/* OWNER DECISION 4: the gather brings BOTH knees high toward the belly button (hip flexion = negative THIGH x on this rig, ≥ 90°),
   folds the shins under (deep positive SHIN x), tucks the pelvis and rounds the spine, and crosses the forearms in an X across the chest
   (deep elbow, shoulders flexed forward and adducted). The old tuck extended the hips BACKWARD (positive THIGH x) — that is the fold the owner rejected. */
var G = tfLast.UNFUSE_CHARGE;
ok('the GATHER brings both knees forward and high (hip flexion ≥ 90°), not back', G.THIGH_L[0] < -1.5 && G.THIGH_R[0] < -1.5, { thigh_L: G.THIGH_L[0].toFixed(3), thigh_R: G.THIGH_R[0].toFixed(3) });
ok('the GATHER folds the shins under the thighs (knee ≥ 100°)', G.SHIN_L[0] > 1.75 && G.SHIN_R[0] > 1.75, { shin_L: G.SHIN_L[0].toFixed(3) });
ok('the GATHER tucks the pelvis UNDER (posterior tilt) and rounds the spine, restrained — no forward dive', G.PELVIS[0] < -0.05 && G.PELVIS[0] > -0.4 && (G.SPINE[0] + (G.LUMBAR ? G.LUMBAR[0] : 0)) > 0.2 && (G.SPINE[0] + (G.LUMBAR ? G.LUMBAR[0] : 0)) < 0.6 && (G.PELVIS[0] + G.SPINE[0] + (G.LUMBAR ? G.LUMBAR[0] : 0) + G.CHEST[0] + (G.SPINE2 ? G.SPINE2[0] : 0)) < 0.45, { pelvis: G.PELVIS[0].toFixed(3), spine: G.SPINE[0].toFixed(3) });
ok('the GATHER crosses the forearms: shoulders flexed forward and rotated inward so the forearms lie across the chest, elbows bent, one forearm ahead of the other', G.FOREARM_L[0] < -1.05 && G.FOREARM_R[0] < -1.0 && (G.UPPERARM_L[0] + (G.SCAP_L ? G.SCAP_L[0] : 0)) < -0.7 && (G.UPPERARM_R[0] + (G.SCAP_R ? G.SCAP_R[0] : 0)) < -0.7 && Math.abs(G.UPPERARM_L[1]) > 1.3 && Math.abs(G.UPPERARM_R[1]) > 1.3 && Math.abs(G.UPPERARM_L[0] - G.UPPERARM_R[0]) > 0.06,   /* rig v5: humerothoracic total = humerus + scapula */ { elbow_L: G.FOREARM_L[0].toFixed(3), shoulder_flex_L: G.UPPERARM_L[0].toFixed(3), humeral_rotation_L: G.UPPERARM_L[1].toFixed(3) });
ok('the GATHER keeps the hands off the face (wrists relaxed, no extra neck flexion)', Math.abs(G.HAND_L[0]) < 0.4 && G.NECK[0] < 0.3 && G.HEAD[0] < 0.3, { hand: G.HAND_L[0].toFixed(3), neck: G.NECK[0].toFixed(3) });
ok('the RELEASE is the quickest beat and opens into a star (wide arms, elbows nearly straight, legs spread)', PROFILE.transformation_beats.release < PROFILE.transformation_beats.gather && PROFILE.transformation_beats.release < PROFILE.transformation_beats.settle && Math.abs(tfLast.UNFUSE_BURST.UPPERARM_L[2]) > 1.0 && tfLast.UNFUSE_BURST.FOREARM_L[0] > -0.5 && Math.abs(tfLast.UNFUSE_BURST.THIGH_L[2]) > 0.2, { burst_arm: tfLast.UNFUSE_BURST.UPPERARM_L[2].toFixed(3), burst_elbow: tfLast.UNFUSE_BURST.FOREARM_L[0].toFixed(3), leg_spread: tfLast.UNFUSE_BURST.THIGH_L[2].toFixed(3) });
ok('gather → release → settle are DIFFERENT shapes (compact, then open, then poised)', (tfLast.UNFUSE_CHARGE.SPINE[0] + (tfLast.UNFUSE_CHARGE.LUMBAR ? tfLast.UNFUSE_CHARGE.LUMBAR[0] : 0)) > 0.2 && tfLast.UNFUSE_STAR.SPINE[0] < 0 && Math.abs(tfLast.UNFUSE_STAR.UPPERARM_L[2] + (tfLast.UNFUSE_STAR.SCAP_L ? tfLast.UNFUSE_STAR.SCAP_L[2] : 0)) > 0.9 && Math.abs(tfLast.UNFUSE_RECOVER.UPPERARM_L[2]) < 0.6, { curl_spine: tfLast.UNFUSE_CURL.SPINE[0].toFixed(3), star_arm: tfLast.UNFUSE_STAR.UPPERARM_L[2].toFixed(3), recover_arm: tfLast.UNFUSE_RECOVER.UPPERARM_L[2].toFixed(3) });
ok('REFUSE lifts the knees forward into the same gather and settles fused', tfLast.REFUSE_KNEES_UP.THIGH_L[0] < -0.8 && tfLast.REFUSE_RECOVER.THIGH_L[0] > -0.5 && AF.form().packed === 1, { knees: tfLast.REFUSE_KNEES_UP.THIGH_L[0].toFixed(3), settled: tfLast.REFUSE_RECOVER.THIGH_L[0].toFixed(3) });
ok('the transformation beats come from the profile (gather 0.3 / release 0.4 / settle 0.3 of the host duration)', Math.abs(PROFILE.transformation_beats.gather + PROFILE.transformation_beats.release + PROFILE.transformation_beats.settle - 1) < 1e-9);

/* ───────── 7 body clearance and the soft approach ───────── */
var clearBad = [], maxFix = 0;
function armPoints(p, side) {
  var sh = lim.shoulders_m[side]; var sc = p['SCAP_' + side] || [0, 0, 0]; var ua = { x: p['UPPERARM_' + side][0] + sc[0], y: p['UPPERARM_' + side][1], z: p['UPPERARM_' + side][2] + sc[2] }, fa = { x: p['FOREARM_' + side][0], y: p['FOREARM_' + side][1], z: p['FOREARM_' + side][2] };
  function rot(v, e) { var cx = Math.cos(e.x), sx = Math.sin(e.x), cy = Math.cos(e.y), sy = Math.sin(e.y), cz = Math.cos(e.z), sz = Math.sin(e.z); var x1 = v.x * cz - v.y * sz, y1 = v.x * sz + v.y * cz, z1 = v.z; var x2 = x1 * cy + z1 * sy, z2 = -x1 * sy + z1 * cy; return { x: x2, y: y1 * cx - z2 * sx, z: y1 * sx + z2 * cx }; }
  var el = rot({ x: 0, y: -lim.segments_m.upperarm, z: 0 }, ua); var elbow = { x: sh.x + el.x, y: sh.y + el.y, z: sh.z + el.z };
  var fw = rot(rot({ x: 0, y: -lim.segments_m.forearm, z: 0 }, fa), ua);
  return { elbow: elbow, hand: { x: elbow.x + fw.x, y: elbow.y + fw.y, z: elbow.z + fw.z } };
}
/* depth INTO a coarse posing volume (0 = clear). The relaxed hanging arm already overlaps these coarse volumes on any real body, so the
   meaningful rule — and the one the animator enforces — is that no pose may drive the elbow or the hand DEEPER in than the rest arm sits. */
function depthIn(pt, vol, pad) { var dx = (pt.x - vol.cx) / (vol.rx + pad), dy = (pt.y - vol.cy) / (vol.ry + pad), dz = (pt.z - vol.cz) / (vol.rz + pad); var d = dx * dx + dy * dy + dz * dz; return d < 1 ? 1 - d : 0; }
function elbowDepth(pt) { return Math.max(depthIn(pt, PROFILE.clearance.ribcage, PROFILE.clearance.min_elbow_to_ribs_m), depthIn(pt, PROFILE.clearance.pelvis, PROFILE.clearance.min_elbow_to_ribs_m)); }
function handDepth(pt) { return Math.max(depthIn(pt, PROFILE.clearance.ribcage, PROFILE.clearance.min_hand_to_chest_m), depthIn(pt, PROFILE.clearance.pelvis, PROFILE.clearance.min_hand_to_chest_m)); }
var REST_ARM = { L: armPoints({ UPPERARM_L: [0, 0, 0], FOREARM_L: [0, 0, 0] }, 'L'), R: armPoints({ UPPERARM_R: [0, 0, 0], FOREARM_R: [0, 0, 0] }, 'R') };
var REST_DEPTH = { L: { e: elbowDepth(REST_ARM.L.elbow), h: handDepth(REST_ARM.L.hand) }, R: { e: elbowDepth(REST_ARM.R.elbow), h: handDepth(REST_ARM.R.hand) } };
ok('the animator measures clearance from the same relaxed-rest reference', Math.abs(lim.clearance_rest_depth.L.e - REST_DEPTH.L.e) < 1e-9 && Math.abs(lim.clearance_rest_depth.R.h - REST_DEPTH.R.h) < 1e-9, { animator: lim.clearance_rest_depth.L, test: REST_DEPTH.L });
/* state 4 (UNFUSE_CURL) is the owner's crossed-forearm gather: the forearms lie ON the chest by decision, so the coarse ribcage ellipsoid (which the hanging hand already overlaps) is allowed 13 cm there instead of 2 cm — the FK pose test checks that pose against the real skeleton */
var CLEAR_STATES = [V({ guard: 'PHYSICAL' }), V({ guard: 'MAGICAL' }), V({ attack: { state: 'RECOVERY', progress: 0.3, category: 'PHYSICAL', attack_id: 'HORIZONTAL_PULL', profile: { style: 'HEAVY' } } }), V({ attack: { state: 'CONCENTRIC_STARTUP', progress: 0.9, category: 'PHYSICAL', attack_id: 'UPRIGHT_ROW', profile: { style: 'HEAVY' } } }), V({ mahloco: 'UNFUSE_CURL' }), V({ dash: { dir: 'LEFT' }, speed01: 1, speed_mps: 5.5 }), V({ emote: 'DOUBLE_BICEPS', emote_at: 3, host_t: 3 })];
CLEAR_STATES.forEach(function (v, idx) { var A = makeAnim(0.19 + idx * 0.05); runs++;
  for (var t5 = 0; t5 < 1.2; t5 += 1 / 60) { v.host_t = 3 + t5; A.animate(v, 1 / 60); frames++; var p = A.pose();
    ['L', 'R'].forEach(function (side) { var pts = armPoints(p, side);
      if (elbowDepth(pts.elbow) > REST_DEPTH[side].e + 0.02) clearBad.push('state ' + idx + ' elbow_' + side + ' driven into the ribs (' + elbowDepth(pts.elbow).toFixed(3) + ' vs rest ' + REST_DEPTH[side].e.toFixed(3) + ')');
      if (handDepth(pts.hand) > REST_DEPTH[side].h + (idx === 4 ? 0.13 : 0.02)) clearBad.push('state ' + idx + ' hand_' + side + ' driven into the chest (' + handDepth(pts.hand).toFixed(3) + ' vs rest ' + REST_DEPTH[side].h.toFixed(3) + ')'); }); maxFix = Math.max(maxFix, A.alive().clearance_fixes); } });
ok('elbows stay outside the ribcage and hands off the chest in every close pose', clearBad.length === 0, clearBad.slice(0, 5));
ok('the clearance pass is bounded to ≤ 2 correction steps per arm per frame', maxFix <= 4, maxFix);
/* soft approach: driving hard into a limit must ease in, not snap between two values */
var SA = makeAnim(0.33); var elb = [];
for (var t6 = 0; t6 < 1.2; t6 += 1 / 60) { SA.animate(V({ guard: 'PHYSICAL', attack: { state: 'RECOVERY', progress: 0.25, category: 'PHYSICAL', attack_id: 'HORIZONTAL_PULL', profile: { style: 'HEAVY' } } }), 1 / 60); frames++; elb.push(SA.pose().FOREARM_L[0]); }
var jumps = 0; for (var j = 1; j < elb.length; j++) if (Math.abs(elb[j] - elb[j - 1]) > 0.25) jumps++;
ok('a pose driven past a limit eases in (soft approach), it does not snap', jumps === 0 && Math.min.apply(null, elb) >= LIM.FOREARM_x[0] - EPS && Math.min.apply(null, elb) < LIM.FOREARM_x[0] + 0.12, { snaps: jumps, deepest: Math.min.apply(null, elb).toFixed(3) });
ok('the deepest elbow anywhere is the 105° inside limit — 1.31 rad of flexion, never the old 2.3', LIM.FOREARM_x[0] === -1.31 && Math.abs((180 - PROFILE.limits_inside_deg.elbow.min) * DEG + LIM.FOREARM_x[0]) < 0.01);

/* ───────── 8 the whole sweep ───────── */
ok('NOT ONE limit violation in ' + frames + ' composed frames across ' + runs + ' state runs', allBad.length === 0 && atkBad.length === 0 && emBad.length === 0 && tfBad.length === 0 && mixBad.length === 0, allBad.slice(0, 8));
console.log('\n' + frames + ' composed frames · ' + runs + ' state runs · ' + gEvents.length + ' gait support events');
console.log('RESULT rig limits: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
