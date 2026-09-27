/* MAHWORLD M20 :: RESIDENTS — a small ambient population, VISUAL ONLY (owner 2026-09-27, "HUMAN LIFE / NPC PASS": "a SMALL, intelligent
   ambient population where the host/runtime allows … residents walking, standing near entrances, small social groups, plazas, highland
   homes … Population should answer: Why is this person here? … Do not add combat NPC behavior. If real NPC host integration is
   bridge-blocked: prepare the spawn/behavior system and use clearly marked visual proofs, but do not claim live gameplay integration.")
   · WHERE: only where the host can never reach. These figures have no collider, so they live in the Veil highland (every anchor > 304 m
     from the plaza on the reach square, host-safety 16): the lantern lane, the home doors, the civic plaza, the quay, the footbridge at
     the lip, the overlooks and the rim walks — the anchors veilFalls.js publishes (anchors()). Nothing stands in the playable city.
   · WHY: every resident carries a role and a reason (residentPlan): walking home along the lane, calling on a neighbour, standing at their
     own door, meeting on the civic plaza, watching the falls from the footbridge, taking the view at an overlook, an evening walk on the
     rim. Fewer people at night, gathered where there is light.
   · HOW: the plan is pure data and the pose a pure function of time (residentState), so it is deterministic, testable and a host could
     drive real NPC actors from the same plan later. One instanced draw of a stylised figure (thighs, shins, arms swung in the vertex
     shader by gait and phase; seated / talking poses), one draw of soft contact shadows. Neutral clothing with a restrained class
     accent. HIGH 25, MED 12, LOW none. */
import { mergeGeometries } from '../../vendor/three/BufferGeometryUtils.js';

function rnd(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export var REACH_MIN_M = 304;   /* ridgeSculpt REACH_FLOOR: the host never reaches past it */
/* clothing (neutral support + deep navy), the class accents (a scarf / collar band, muted), skin and hair tones — skin kept under the colour
   law's neutral saturation floor (0.28): a range of real complexions, read at street distance, never an orange accent */
var TOPS = [0x2b2e36, 0x3a3f4a, 0xd9d6cf, 0x8d8a84, 0x1f2a44, 0x4a4d55, 0xe8e6e1, 0x5b5f68], LEGS = [0x23262d, 0x3b3e45, 0x6e6c68, 0x1c2233, 0xbfbcb5];
var ACCENTS = [0xc9a23a, 0x3f6fb8, 0xa83a4a, 0x7a5bb0, 0xc0709f];   /* ATHLETE gold, TITAN blue, LEAN crimson, VISIONARY violet, BAGE pink — muted */
var SKIN = [0xd4c0b4, 0xbca494, 0x9c8474, 0x7a6558, 0x564740], HAIR = [0x1c1a1a, 0x3a2e28, 0x6b5a4c, 0xb9b3aa, 0x2a2626];

/* the plan: anchors → residents. Each: { id, role, why, pose: 'walk' | 'stand' | 'talk' | 'sit', route (walk) or at + yaw, speed, phase, night, style } */
export function residentPlan(A, tier) {
  if (!A || tier === 'LOW') return [];
  var r = rnd(20260927), out = [], HI = tier !== 'MED';
  function style() { return { top: TOPS[Math.floor(r() * TOPS.length)], leg: LEGS[Math.floor(r() * LEGS.length)], accent: ACCENTS[Math.floor(r() * ACCENTS.length)], skin: SKIN[Math.floor(r() * SKIN.length)], hair: HAIR[Math.floor(r() * HAIR.length)], coat: r() < 0.4, h: 0.94 + r() * 0.12 }; }
  function add(o) { o.id = out.length; o.style = style(); if (o.phase === undefined) o.phase = r() * 6.2832; out.push(o); return o; }
  function path(name) { return A.paths.filter(function (P) { return P.name === name; }); }
  function inPlinth(p, pad) { return (A.homes || []).some(function (H) { var dx = p.x - H.x, dz = p.z - H.z, sd = dx * Math.cos(H.yaw) - dz * Math.sin(H.yaw), fd = dx * Math.sin(H.yaw) + dz * Math.cos(H.yaw); return Math.abs(sd) < H.hw + pad && Math.abs(fd) < H.hd + pad; }); }
  function toPlinth(P) { for (var i = 1; i < P.length; i++) if (inPlinth(P[i], 0.45)) return P.slice(0, i); return P; }   /* the door stands on the home's plinth: stop on the path at its foot */
  function short(P, m) { var out = P.slice(), rest = m; while (out.length > 2) { var a = out[out.length - 2], b = out[out.length - 1], l = Math.hypot(b.x - a.x, b.z - a.z); if (l > rest) { var f = (l - rest) / l; out[out.length - 1] = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f }; return out; } rest -= l; out.pop(); } return out; }   /* stop at the foot of the entry steps (the porch deck stands ~0.6 m over the last 4–5 m of the side path) */
  function doorPath(D) { var best = null, bd = 1e9; path('door').forEach(function (P) { [0, P.pts.length - 1].forEach(function (e) { var q = P.pts[e], d = Math.hypot(q.x - D.x, q.z - D.z); if (d < bd) { bd = d; best = e ? P.pts.slice() : P.pts.slice().reverse(); } }); }); return best && bd < 4 ? best : [{ x: D.lx, y: D.y, z: D.lz }, { x: D.x, y: D.y, z: D.z }]; }   /* the paved side path as drawn, lane → door */
  function stop(p, yaw, d) { return { x: p.x + Math.sin(yaw) * d, y: p.y, z: p.z + Math.cos(yaw) * d }; }
  var C = A.civic, lane = path('lane')[0];
  function onDisc(p) { return C && Math.hypot(p.x - C.x, p.z - C.z) <= C.disc; }
  function lift(p) { return onDisc(p) ? { x: p.x, y: C.top, z: p.z } : p; }   /* on the pavilion's raised disc */
  function round(pts) { if (!C) return pts; var RR = 8.8, out = [], i = 0; function dC(p) { return Math.hypot(p.x - C.x, p.z - C.z); } function aC(p) { return Math.atan2(p.z - C.z, p.x - C.x); }
    while (i < pts.length) { if (dC(pts[i]) >= RR) { out.push(lift(pts[i])); i++; continue; } var j = i; while (j < pts.length && dC(pts[j]) < RR) j++;
      var a0 = aC(pts[i]), da = aC(pts[j - 1]) - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; var n = Math.max(2, Math.ceil(Math.abs(da) * RR / 0.8));
      for (var k = 0; k <= n; k++) { var a = a0 + da * k / n; out.push({ x: C.x + Math.cos(a) * RR, y: C.top, z: C.z + Math.sin(a) * RR }); } i = j; }
    return out; }   /* round the glass hall on a smooth arc, inside the columns */
  function ring(k, rr) { var a = C.a0 + Math.PI / 8 + k * Math.PI / 4; return { x: C.x + Math.cos(a) * rr, y: C.top, z: C.z + Math.sin(a) * rr, a: a }; }   /* between two columns, in line with a bench */
  if (lane) lane = { pts: round(lane.pts) };
  if (lane) { var nL = HI ? 5 : 3; for (var i = 0; i < nL; i++) add({ role: 'commuter', why: 'walking home along the lantern lane', pose: 'walk', route: lane.pts, side: (i % 2 ? 1 : -1) * 0.55, speed: 1.15 + r() * 0.35, offset: i / nL, pause: 3 + r() * 4, night: i < 3 }); }
  A.doors.forEach(function (D, k) {   /* the homes: someone at their own door, or a neighbour calling (walks the side path lane ↔ door) */
    if (k % 3 === 0) { var dp = toPlinth(doorPath(D)), e = dp[dp.length - 1]; add({ role: 'resident', why: 'standing at their own front door', pose: 'stand', at: { x: e.x, y: e.y, z: e.z }, yaw: Math.atan2(D.lx - e.x, D.lz - e.z), night: true }); }
    else if (HI && k % 3 === 1) add({ role: 'visitor', why: 'calling on a neighbour', pose: 'walk', route: round(toPlinth(doorPath(D))), side: 0, speed: 1.0 + r() * 0.2, offset: r(), pause: 6 + r() * 6, night: false }); });
  if (C) { var gk = Math.floor(r() * 8), G0 = ring(gk, 8.9);   /* the civic plaza: a small group under the canopy + a pair meeting, on the walk between the hall and the columns */
    for (var g = 0; g < (HI ? 3 : 2); g++) { var a2 = G0.a + g * 2.094 + 0.5, sx = G0.x + Math.cos(a2) * 0.72, sz = G0.z + Math.sin(a2) * 0.72; add({ role: 'group', why: 'a small group talking outside the civic pavilion', pose: g === 0 ? 'talk' : 'stand', at: { x: sx, y: C.top, z: sz }, yaw: Math.atan2(G0.x - sx, G0.z - sz), night: true }); }
    if (HI) { var P0 = ring((gk + 3) % 8, 8.9), pa = P0.a + Math.PI / 2;
      [-1, 1].forEach(function (s) { var q = { x: P0.x + Math.cos(pa) * 0.55 * s, y: C.top, z: P0.z + Math.sin(pa) * 0.55 * s }; add({ role: 'pair', why: 'two neighbours meeting on the civic plaza', pose: s < 0 ? 'talk' : 'stand', at: q, yaw: Math.atan2(P0.x - q.x, P0.z - q.z), night: false }); });
      var Bc = ring((gk + 5) % 8, C.benchR - 0.2); add({ role: 'sitter', why: 'resting on a bench under the pavilion canopy', pose: 'sit', at: { x: Bc.x, y: C.top, z: Bc.z }, yaw: Math.atan2(C.x - Bc.x, C.z - Bc.z), night: true }); } }
  if (A.bridge) { var B = A.bridge, nb = HI ? 2 : 1; for (var b = 0; b < nb; b++) { var lat = (b ? 1.6 : -2.4), q2 = { x: B.x + B.tx * lat + Math.sin(B.look) * 0.55, y: B.y, z: B.z + B.tz * lat + Math.cos(B.look) * 0.55 };   /* at the downstream rail, looking over the lip */
    add({ role: 'watcher', why: 'watching the falls from the footbridge at the lip', pose: 'stand', at: q2, yaw: B.look, night: b === 0 }); } }
  A.looks.forEach(function (O, k) { if (!HI && k) return; add({ role: 'watcher', why: 'taking the view over the lower world from the overlook', pose: 'stand', at: stop(O, O.yaw, 2.5), yaw: O.yaw, night: k === 0 }); });
  var benches = A.benches.slice(0, HI ? 2 : 1); benches.forEach(function (Bn) { add({ role: 'sitter', why: 'resting on a lane bench', pose: 'sit', at: stop(Bn, Bn.yaw, -0.18), yaw: Bn.yaw, night: false }); });
  ['rim1', 'rim-1', 'quay'].forEach(function (nm, k) { if (!HI && k) return; var P = path(nm)[0]; if (P) P = { pts: round(P.pts) }; if (P) add({ role: 'walker', why: nm === 'quay' ? 'a stroll along the quay by the basin' : 'an evening walk along the rim promenade', pose: 'walk', route: P.pts, side: 0.3, speed: 0.95 + r() * 0.25, offset: r(), pause: 5 + r() * 5, night: nm === 'quay' }); });
  return out;
}

/* the pose at time t (s): position, yaw, gait 0..1 (walking), stride phase. Walkers go end to end and back, pausing at each end. */
function routeLen(R) { var L = [0]; for (var i = 1; i < R.length; i++) L.push(L[i - 1] + Math.hypot(R[i].x - R[i - 1].x, R[i].z - R[i - 1].z)); return L; }
export function residentState(res, t) {
  if (res.pose !== 'walk') return { x: res.at.x, y: res.at.y, z: res.at.z, yaw: res.yaw, gait: 0, phase: res.phase + t * 0.9 };
  var R = res.route, L = res._L || (res._L = routeLen(R)), len = L[L.length - 1], walkT = len / res.speed, cyc = 2 * (walkT + res.pause), u = ((t / cyc + res.offset) % 1 + 1) % 1, tt = u * cyc, s, dir, gait;
  if (tt < walkT) { s = tt * res.speed; dir = 1; gait = 1; } else if (tt < walkT + res.pause) { s = len; dir = 1; gait = 0; } else if (tt < 2 * walkT + res.pause) { s = len - (tt - walkT - res.pause) * res.speed; dir = -1; gait = 1; } else { s = 0; dir = -1; gait = 0; }
  function at(q) { q = Math.max(0, Math.min(len, q)); var i = 1; while (i < L.length - 1 && L[i] < q) i++; var a = R[i - 1], b = R[i], f = Math.max(0, Math.min(1, (q - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]))); return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f }; }
  var c = at(s), fw = at(s + 1.2), bk = at(s - 1.2), tx = fw.x - bk.x, tz = fw.z - bk.z, tl = Math.hypot(tx, tz) || 1;   /* heading over ±1.2 m: no snap at a corner */
  var sw = dir, turn = 0; if (gait === 0) { var pu = Math.max(0, Math.min(1, tt < walkT + res.pause ? (tt - walkT) / res.pause : (tt - 2 * walkT - res.pause) / res.pause)), ease = pu * pu * (3 - 2 * pu); sw = (tt < walkT + res.pause ? 1 : -1) * Math.cos(Math.PI * ease); turn = Math.PI * ease; }   /* during the pause at an end they turn round and step across to the other side */
  var nx = tz / tl, nz = -tx / tl, sd = (res.side || 0) * sw;   /* keep to one side of the path, like people do */
  return { x: c.x + nx * sd, y: c.y, z: c.z + nz * sd, yaw: Math.atan2(tx * dir, tz * dir) + turn, gait: gait, phase: res.phase + s * 3.2 };   /* stride phase follows the distance walked: feet do not skate */
}

/* the figure: a stylised adult ~1.72 m (scaled per resident), facing +z. aPart: 0 body / head, 1 L thigh, 2 R thigh, 3 L shin, 4 R shin,
   5 L arm, 6 R arm, 7 coat skirt. aMat: 0 top, 1 legs, 2 skin, 3 shoes, 4 hair, 5 accent. */
function figureGeometry(THREE, seg) {
  var parts = [];
  function push(g, part, mat) { var n = g.attributes.position.count, P = new Float32Array(n), M = new Float32Array(n); P.fill(part); M.fill(mat); g.setAttribute('aPart', new THREE.BufferAttribute(P, 1)); g.setAttribute('aMat', new THREE.BufferAttribute(M, 1)); if (g.index) g = g.toNonIndexed(); g.deleteAttribute('uv'); parts.push(g); }
  var tor = new THREE.LatheGeometry([[0.001, 0.9], [0.15, 0.9], [0.14, 1.04], [0.165, 1.26], [0.19, 1.4], [0.12, 1.46], [0.055, 1.48], [0.001, 1.5]].map(function (p) { return new THREE.Vector2(p[0], p[1]); }), seg); tor.scale(1, 1, 0.64); push(tor, 0, 0);
  var sc = new THREE.CylinderGeometry(0.178, 0.188, 0.07, seg, 1, true); sc.scale(1, 1, 0.66); sc.translate(0, 1.37, 0); push(sc, 0, 5);   /* the scarf / collar band: the class accent */
  var neck = new THREE.CylinderGeometry(0.048, 0.052, 0.1, 8); neck.translate(0, 1.5, 0); push(neck, 0, 2);
  var head = new THREE.SphereGeometry(0.1, seg, Math.max(6, seg - 2)); head.scale(0.92, 1.08, 1); head.translate(0, 1.6, 0.005); push(head, 0, 2);
  var hair = new THREE.SphereGeometry(0.106, seg, 6, 0, Math.PI * 2, 0, Math.PI * 0.52); hair.scale(0.93, 1.08, 1.02); hair.translate(0, 1.61, -0.008); push(hair, 0, 4);
  [-1, 1].forEach(function (s) { var L = s < 0 ? 1 : 2;
    var th = new THREE.CylinderGeometry(0.074, 0.06, 0.44, 8); th.translate(s * 0.086, 0.7, 0); push(th, L, 1);
    var sh = new THREE.CylinderGeometry(0.056, 0.044, 0.42, 8); sh.translate(s * 0.086, 0.27, 0); push(sh, L + 2, 1);
    var ft = new THREE.BoxGeometry(0.085, 0.06, 0.24); ft.translate(s * 0.086, 0.035, 0.05); push(ft, L + 2, 3);
    var ar = new THREE.CylinderGeometry(0.05, 0.038, 0.6, 8); ar.translate(s * 0.215, 1.1, 0); push(ar, s < 0 ? 5 : 6, 0);
    var hd = new THREE.SphereGeometry(0.043, 8, 6); hd.translate(s * 0.215, 0.78, 0.01); push(hd, s < 0 ? 5 : 6, 2); });
  var coat = new THREE.CylinderGeometry(0.17, 0.215, 0.44, seg, 1, true); coat.scale(1, 1, 0.7); coat.translate(0, 0.72, 0); push(coat, 7, 0);
  var g = mergeGeometries(parts, false); parts.forEach(function (p) { p.dispose(); }); return g;
}

export function createResidents(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }; var group = null, own = [], plan = [], mesh = null, shade = null, uT = { value: 0 }, night = !!ctx.night, info = { residents: 0 }, M4 = null, Q = null, V = null, S1 = null, UP = null;
  function tier() { return ctx.quality && ctx.quality.tier ? ctx.quality.tier() : 'HIGH'; }
  function build() {
    var vf = ctx.mods && ctx.mods.veilFalls, A = vf && vf.anchors ? vf.anchors() : null; plan = residentPlan(A, tier()); info.tier = tier(); info.residents = plan.length;
    info.roles = {}; plan.forEach(function (p) { info.roles[p.role] = (info.roles[p.role] || 0) + 1; }); if (!plan.length) { log('residents: none (' + (A ? 'tier ' + tier() : 'no Veil anchors') + ')'); return; }
    group = new THREE.Group(); group.name = 'MAHWORLD_RESIDENTS'; (ctx.group || ctx.scene).add(group); M4 = new THREE.Matrix4(); Q = new THREE.Quaternion(); V = new THREE.Vector3(); S1 = new THREE.Vector3(1, 1, 1); UP = new THREE.Vector3(0, 1, 0);
    var geo = figureGeometry(THREE, tier() === 'MED' ? 10 : 14); own.push(geo); var N = plan.length;
    var aTop = new Float32Array(N * 3), aLeg = new Float32Array(N * 3), aSkin = new Float32Array(N * 3), aHair = new Float32Array(N * 3), aAcc = new Float32Array(N * 3), aAnim = new Float32Array(N * 4), c = new THREE.Color();
    plan.forEach(function (p, i) { var S = p.style; c.setHex(S.top).toArray(aTop, i * 3); c.setHex(S.leg).toArray(aLeg, i * 3); c.setHex(S.skin).toArray(aSkin, i * 3); c.setHex(S.hair).toArray(aHair, i * 3); c.setHex(S.accent).toArray(aAcc, i * 3);
      aAnim[i * 4] = p.phase; aAnim[i * 4 + 1] = 0; aAnim[i * 4 + 2] = ({ walk: 0, stand: 1, talk: 2, sit: 3 })[p.pose]; aAnim[i * 4 + 3] = S.coat ? 1 : 0; });
    [['aTop', aTop, 3], ['aLeg', aLeg, 3], ['aSkin', aSkin, 3], ['aHair', aHair, 3], ['aAcc', aAcc, 3], ['aAnim', aAnim, 4]].forEach(function (d) { var at = new THREE.InstancedBufferAttribute(d[1], d[2]); if (d[0] === 'aAnim') at.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(d[0], at); });
    var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.0 }); own.push(mat);
    mat.onBeforeCompile = function (sh) { sh.uniforms.uRT = uT;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', ['#include <common>', 'attribute float aPart; attribute float aMat; attribute vec3 aTop; attribute vec3 aLeg; attribute vec3 aSkin; attribute vec3 aHair; attribute vec3 aAcc; attribute vec4 aAnim; uniform float uRT; varying vec3 vRCol;',
        'mat3 rX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }'].join('\n'))
        .replace('#include <beginnormal_vertex>', ['#include <beginnormal_vertex>',
          'float rPh = aAnim.x, rG = aAnim.y, rPose = aAnim.z, rSw = sin(rPh), rCw = cos(rPh), side = (aPart == 1.0 || aPart == 3.0 || aPart == 5.0) ? 1.0 : -1.0;',
          'float hipA = rSw * 0.46 * rG * side, kneeA = max(0.0, -rSw * side) * 0.75 * rG + 0.06, armA = -rSw * 0.38 * rG * side;',   /* walk: legs swing, the trailing knee bends, arms swing against the legs */
          'float idle = sin(uRT * 0.7 + rPh) * 0.03;',
          'if (rPose == 1.0) { armA = idle * side + 0.04; }',   /* standing: a little breathing sway */
          'if (rPose == 2.0) { armA = (aPart == 6.0) ? -0.55 - 0.25 * (0.5 + 0.5 * sin(uRT * 1.3 + rPh)) : idle * side + 0.04; }',   /* talking: one hand moves as they speak */
          'if (rPose == 3.0) { hipA = -1.5; kneeA = 1.5; armA = -0.5; }',   /* seated: thighs level, shins down, hands on the lap */
          'vec3 rHip = vec3(sign(position.x) * 0.086, 0.92, 0.0), rKnee = vec3(sign(position.x) * 0.086, 0.49, 0.0), rSh = vec3(sign(position.x) * 0.215, 1.4, 0.0);',
          'mat3 rM = mat3(1.0); vec3 rP = position;',
          'if (aPart == 1.0 || aPart == 2.0) { rM = rX(hipA); rP = rM * (position - rHip) + rHip; }',
          'else if (aPart == 3.0 || aPart == 4.0) { mat3 k = rX(kneeA); vec3 q = k * (position - rKnee) + rKnee; rM = rX(hipA) * k; rP = rX(hipA) * (q - rHip) + rHip; }',
          'else if (aPart == 5.0 || aPart == 6.0) { rM = rX(armA); rP = rM * (position - rSh) + rSh; }',
          'else if (aPart == 7.0) { rP = aAnim.w > 0.5 ? position : vec3(0.0, 0.9, 0.0); if (rPose == 3.0) rP = vec3(0.0, 0.9, 0.0); }',   /* the coat skirt only on coat wearers (and folded away when seated) */
          'if (rPose == 3.0) rP.y -= 0.44;',
          'rP.y += abs(rCw) * 0.028 * rG;',   /* the walking bob */
          'objectNormal = rM * objectNormal;',
          'vRCol = aMat < 0.5 ? aTop : (aMat < 1.5 ? aLeg : (aMat < 2.5 ? aSkin : (aMat < 3.5 ? vec3(0.05) : (aMat < 4.5 ? aHair : aAcc))));'].join('\n'))
        .replace('#include <begin_vertex>', 'vec3 transformed = rP;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRCol;').replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vRCol;'); };
    mat.customProgramCacheKey = function () { return 'mahworld-residents-m20'; };
    mesh = new THREE.InstancedMesh(geo, mat, N); mesh.name = 'MAHWORLD_RESIDENTS'; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.castShadow = false; mesh.receiveShadow = true; mesh.userData.nonInteractable = true; mesh.userData.noMerge = true;
    var shG = new THREE.PlaneGeometry(1, 1); shG.rotateX(-Math.PI / 2); own.push(shG);
    var shM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, uniforms: { uN: { value: night ? 1 : 0 } },
      vertexShader: 'varying vec2 vU; void main() { vU = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uN; varying vec2 vU; void main() { float d = length(vU); gl_FragColor = vec4(0.0, 0.0, 0.0, (1.0 - smoothstep(0.25, 1.0, d)) * mix(0.42, 0.3, uN)); }' }); own.push(shM);   /* contact shadow: the figure stands ON the paving */
    shade = new THREE.InstancedMesh(shG, shM, N); shade.name = 'MAHWORLD_RESIDENTS_CONTACT'; shade.instanceMatrix.setUsage(THREE.DynamicDrawUsage); shade.renderOrder = 2; shade.userData.nonInteractable = true; shade.userData.noMerge = true;
    group.add(mesh); group.add(shade);
    var bx = new THREE.Box3(); plan.forEach(function (p) { (p.route || [p.at]).forEach(function (q) { bx.expandByPoint(V.set(q.x, q.y, q.z)); }); }); var bs = new THREE.Sphere(); bx.getBoundingSphere(bs); bs.radius += 3; mesh.boundingSphere = bs; shade.boundingSphere = bs.clone();   /* walkers move: bound the whole district */
    var minC = 1e9; plan.forEach(function (p) { (p.route || [p.at]).forEach(function (q) { minC = Math.min(minC, Math.max(Math.abs(q.x), Math.abs(q.z))); }); }); info.min_reach_m = +minC.toFixed(1);
    info.draws = 2; info.visual_only = true; info.host_integration = 'none (bridge-blocked): visual proof only';
    update(0); log('residents: ' + N + ' (' + Object.keys(info.roles).map(function (k) { return k + ' ' + info.roles[k]; }).join(', ') + '), nearest ' + info.min_reach_m + ' m on the reach square');
  }
  function update(t) {
    if (!mesh) return; var an = mesh.geometry.attributes.aAnim;
    for (var i = 0; i < plan.length; i++) { var p = plan[i], s = residentState(p, t), here = !night || p.night, k = here ? p.style.h : 0;
      Q.setFromAxisAngle(UP, s.yaw); M4.compose(V.set(s.x, s.y + 0.02, s.z), Q, S1.set(k, k, k)); mesh.setMatrixAt(i, M4);
      M4.compose(V.set(s.x, s.y + 0.03, s.z), Q, S1.set(here ? 0.9 : 0, 1, here ? (p.pose === 'sit' ? 1.3 : 0.9) : 0)); shade.setMatrixAt(i, M4);
      an.array[i * 4] = s.phase; an.array[i * 4 + 1] = s.gait; }
    an.needsUpdate = true; mesh.instanceMatrix.needsUpdate = true; shade.instanceMatrix.needsUpdate = true; uT.value = t;
  }
  var clock = 0;
  function tick(dt, t) { clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0); update(clock); }
  function setNight(n) { night = !!n; if (shade) shade.material.uniforms.uN.value = night ? 1 : 0; update(clock); }
  function dispose() { if (group && group.parent) group.parent.remove(group); own.forEach(function (o) { o.dispose(); }); own = []; if (mesh) mesh.dispose(); if (shade) shade.dispose(); mesh = shade = group = null; }
  function debug() { return info; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug, plan: function () { return plan; } };
}
