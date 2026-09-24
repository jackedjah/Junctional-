import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createRigAnimator } from '../../26_LOCAL_AUTHORITY/lab/RigAnimator.js';
import * as AD from '../../26_LOCAL_AUTHORITY/lab/animData.js';
import { restFromGlb } from '../../16_TESTS/lib/rest_from_glb.mjs';
import { readGlb } from '../../26_LOCAL_AUTHORITY/deploy/glb_read.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }
var ASSET = arg('--asset', path.join(HERE, '..', '..', '26_LOCAL_AUTHORITY', 'lab', 'assets', 'athlete_m_preview', arg('--ver', 'dev_0.11'), 'Mah_Athlete_M_am08_v5.glb'));
var PROFILE = JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', '26_LOCAL_AUTHORITY', 'lab', 'rig_profile.json'), 'utf8'));
var DEFAULTS = JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', '26_LOCAL_AUTHORITY', 'lab', 'presentation_defaults.json'), 'utf8'));
var passed = 0, failed = 0; function ok(name, cond, info) { if (cond) { passed++; console.log('PASS ' + name); } else { failed++; console.log('FAIL ' + name + (info !== undefined ? ' — ' + JSON.stringify(info) : '')); } }
/* ---- minimal quaternion math (x,y,z,w) ---- */
function qMul(a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; }
function qFromEuler(x, y, z) { var c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2); return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3]; }
function qRot(q, v) { var x = v[0], y = v[1], z = v[2], qx = q[0], qy = q[1], qz = q[2], qw = q[3]; var ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z, iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z; return [ix * qw + iw * -qx + iy * -qz - iz * -qy, iy * qw + iw * -qy + iz * -qx - ix * -qz, iz * qw + iw * -qz + ix * -qy - iy * -qx]; }
function Euler() { this.x = 0; this.y = 0; this.z = 0; } Euler.prototype.set = function (x, y, z) { this.x = x; this.y = y; this.z = z; return this; }; Euler.prototype.setFromQuaternion = function (q) { var x = q.x, y = q.y, z = q.z, w = q.w; var sinr = 2 * (w * x + y * z), cosr = 1 - 2 * (x * x + y * y); this.x = Math.atan2(sinr, cosr); var sinp = 2 * (w * y - z * x); this.y = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp); var siny = 2 * (w * z + x * y), cosy = 1 - 2 * (y * y + z * z); this.z = Math.atan2(siny, cosy); return this; };
function Quat() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; } Quat.prototype.setFromEuler = function (e) { var q = qFromEuler(e.x, e.y, e.z); this.x = q[0]; this.y = q[1]; this.z = q[2]; this.w = q[3]; return this; }; Quat.prototype.slerp = function (q, t) { this.x += (q.x - this.x) * t; this.y += (q.y - this.y) * t; this.z += (q.z - this.z) * t; this.w += (q.w - this.w) * t; var l = Math.hypot(this.x, this.y, this.z, this.w) || 1; this.x /= l; this.y /= l; this.z /= l; this.w /= l; return this; };
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
var LADDER = [0, 30, 60, 90, 120, 150, 170]; var runs = [];
LADDER.forEach(function (deg) { A.setOverride({ UPPERARM_L: [-0.05, 0, -deg * Math.PI / 180], FOREARM_L: [-0.1, 0, 0] }); for (var i = 0; i < 60; i++) { view.host_t += 1 / 60; A.animate(view, 1 / 60); } var p = A.pose(); var f = fk(p); runs.push({ deg: deg, pose: p, fk: f }); });
A.setOverride(null);
var mesh = J.meshes[0], pr = mesh.primitives[0]; var P = G.acc(pr.attributes.POSITION).data, JI = G.acc(pr.attributes.JOINTS_0).data, WT = G.acc(pr.attributes.WEIGHTS_0).data; var N = P.length / 3; var IDX = G.acc(pr.indices).data;
var jointNames = J.skins[0].joints.map(function (ni) { return J.nodes[ni].name; }); var restWorld = REST.world;
function skin(f, i) { var out = [0, 0, 0]; var v = [P[i * 3] * scale, P[i * 3 + 1] * scale, P[i * 3 + 2] * scale]; for (var k = 0; k < 4; k++) { var w = WT[i * 4 + k]; if (w <= 0) continue; var name = jointNames[JI[i * 4 + k]]; var rw = restWorld[name], pw = f.pos[name], q = f.rot[name]; if (!rw || !pw) continue; var local = [v[0] - rw[0], v[1] - rw[1], v[2] - rw[2]]; var r = qRot(q, local); out[0] += w * (pw[0] + r[0]); out[1] += w * (pw[1] + r[1]); out[2] += w * (pw[2] + r[2]); } return out; }
var DEG = parseInt(arg('--deg', '150'), 10); var run = runs.filter(function (r) { return r.deg === DEG; })[0]; var f = run.fk; var rest = runs[0].fk;
var S = [], R = []; for (var i = 0; i < N; i++) { S.push(skin(f, i)); R.push(skin(rest, i)); }
function el(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
var tris = []; for (var t = 0; t < IDX.length; t += 3) { var a = IDX[t], b = IDX[t + 1], c = IDX[t + 2]; if (P[a * 3] > 0 && P[b * 3] > 0 && P[c * 3] > 0) continue; var r0 = Math.max(el(R[a], R[b]), el(R[b], R[c]), el(R[c], R[a])); var s0 = Math.max(el(S[a], S[b]), el(S[b], S[c]), el(S[c], S[a])); tris.push({ i: [a, b, c], ratio: s0 / (r0 || 1e-6), restLen: r0, posedLen: s0 }); }
tris.sort(function (x, y) { return y.ratio - x.ratio; });
console.log('deg', DEG, 'left-side tris', tris.length, 'ratio>2.5:', tris.filter(function (x) { return x.ratio > 2.5; }).length, 'ratio>4:', tris.filter(function (x) { return x.ratio > 4; }).length);
var gh = restWorld.UPPERARM_L, elb = restWorld.FOREARM_L; var ax = [elb[0] - gh[0], elb[1] - gh[1], elb[2] - gh[2]]; var L = Math.hypot(ax[0], ax[1], ax[2]); ax = ax.map(function (c) { return c / L; });
function wdesc(i) { var o = []; for (var k = 0; k < 4; k++) if (WT[i * 4 + k] > 0.02) o.push(jointNames[JI[i * 4 + k]].replace('_L', '') + ':' + WT[i * 4 + k].toFixed(2)); var v = [P[i * 3] * scale, P[i * 3 + 1] * scale, P[i * 3 + 2] * scale]; var d = [v[0] - gh[0], v[1] - gh[1], v[2] - gh[2]]; var tt = (d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2]) / L; var along = tt * L; var rad = Math.sqrt(Math.max(0, d[0] * d[0] + d[1] * d[1] + d[2] * d[2] - along * along)); return { t: +tt.toFixed(2), rad: +rad.toFixed(3), medial: Math.abs(v[0]) < Math.abs(gh[0]), y_rel: +(v[1] - gh[1]).toFixed(3), z_rel: +(v[2] - gh[2]).toFixed(3), w: o.join(' ') }; }
tris.slice(0, 12).forEach(function (t) { console.log('ratio', t.ratio.toFixed(1), 'rest', (t.restLen * 100).toFixed(1) + 'cm', '->', (t.posedLen * 100).toFixed(1) + 'cm'); t.i.forEach(function (i) { console.log('   v' + i, JSON.stringify(wdesc(i))); }); });
