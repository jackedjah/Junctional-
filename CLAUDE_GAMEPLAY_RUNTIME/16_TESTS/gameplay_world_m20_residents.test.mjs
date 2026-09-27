/* M20 (owner 2026-09-27, HUMAN LIFE / NPC PASS): "a SMALL, intelligent ambient population where the host/runtime allows … Population should
   answer: Why is this person here? … Do not add combat NPC behavior … do not claim live gameplay integration." residents.js is VISUAL ONLY:
   the figures have no collider, so they may only stand where the host can never reach. This test builds the real Veil district and the
   population headless (HIGH / MED / LOW) and checks: every resident has a role and a reason, and no combat behaviour exists; every spot and
   every metre of every route lies beyond the host's reach (> 304 m on the reach square); feet stay on the drawn ground; walkers keep a human
   pace, go both ways and pause; fewer people at night; clothing and accents obey the colour law; the draw budget (2 on HIGH / MED, none
   on LOW).  node 16_TESTS/gameplay_world_m20_residents.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { createVeilFalls } from '../26_LOCAL_AUTHORITY/lab/world/veilFalls.js';
import { createResidents, residentPlan, residentState, REACH_MIN_M } from '../26_LOCAL_AUTHORITY/lab/world/residents.js';
import { REACH_FLOOR } from '../26_LOCAL_AUTHORITY/lab/world/ridgeSculpt.js';
import { classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
var REG = JSON.parse(fs.readFileSync(path.join(LA, 'lab/assets/world/world_registry_v1.json'), 'utf8')), SRC = fs.readFileSync(path.join(LA, 'lab/world/residents.js'), 'utf8'), WB = fs.readFileSync(path.join(LA, 'lab/world/worldB.js'), 'utf8');
var warn = console.warn; console.warn = function () { };
function build(tier) { var g = new THREE.Group(), ctx = { THREE: THREE, registry: REG, group: g, quality: { tier: function () { return tier; } }, auraRequests: [], auraForms: [], log: function () { }, mods: {} };
  var vf = createVeilFalls(ctx); vf.build(); ctx.mods.veilFalls = vf; var rs = createResidents(ctx); rs.build(); rs.tick(0.016, 40); g.updateMatrixWorld(true);
  var by = {}; g.traverse(function (o) { if (o.isMesh || o.isPoints) by[o.name] = o; }); return { g: g, vf: vf, rs: rs, by: by, plan: rs.plan(), info: rs.debug() }; }
var H = build('HIGH'), M = build('MED'), L = build('LOW'); console.warn = warn;

/* 1. why is this person here: every resident has a role and a reason; no combat behaviour anywhere */
var noWhy = H.plan.filter(function (p) { return !p.role || !p.why || p.why.length < 12; }), roles = Object.keys(H.info.roles || {});
var combat = /\b(attack|aggro|target|damage|hp|weapon|combat|hostile|enemy)\b/i;
ok('1. every resident answers "why here" (' + roles.join(', ') + '); no combat behaviour in the plan or the module', H.plan.length > 0 && noWhy.length === 0 && roles.length >= 6 && !combat.test(SRC.replace(/Do not add combat NPC behavior/g, '').replace(/No combat/gi, '')) && H.plan.every(function (p) { return !Object.keys(p).some(function (k) { return combat.test(k); }); }), { noWhy: noWhy.length, roles: roles });

/* 2. host safety: every standing spot and every sampled metre of every route (with the kerb-side offset) is beyond the reach floor */
var worst = 1e9, bad2 = [];
[H, M].forEach(function (B) { B.plan.forEach(function (p) { for (var t = 0; t < 400; t += 1.7) { var s = residentState(p, t), c = Math.max(Math.abs(s.x), Math.abs(s.z)); worst = Math.min(worst, c); if (!(c > REACH_FLOOR)) bad2.push({ id: p.id, role: p.role, t: t, c: c }); } }); });
ok('2. no resident is ever within the host reach (nearest ' + worst.toFixed(1) + ' m on the reach square, floor ' + REACH_FLOOR + ' m) — visual only, no collider, VEIL district only', REACH_MIN_M === REACH_FLOOR && bad2.length === 0 && worst > REACH_FLOOR + 20 && H.info.visual_only === true && /bridge-blocked/.test(H.info.host_integration), bad2.slice(0, 5));

/* 3. feet on the drawn ground: rays down through each resident (standing, and walkers along their routes) hit the meadow / paving / deck
      within 12 cm of the feet (seated residents: on a bench, their feet still reach the ground) */
var rc = new THREE.Raycaster(), dn = new THREE.Vector3(0, -1, 0), grounds = [H.by.VEIL_HIGHLAND_GROUND, H.by.VEIL_PAVING, H.by.VEIL_VILLAS, H.by.VEIL_VILLA_ROOFS].filter(Boolean), off3 = [], n3 = 0;
H.plan.forEach(function (p) { for (var t = 0; t < 200; t += p.pose === 'walk' ? 7.3 : 1000) { var s = residentState(p, t); rc.set(new THREE.Vector3(s.x, s.y + 3, s.z), dn); var hs = rc.intersectObjects(grounds, false), h = hs[0]; n3++; if (!h) { off3.push({ id: p.id, role: p.role, miss: true }); continue; }
    if (p.pose === 'sit') { var seat = h.point.y - s.y, gd = hs.filter(function (q) { return Math.abs(q.point.y - s.y - 0.02) <= 0.12; }).length; if (!(seat > 0.3 && seat < 1.05 && gd)) off3.push({ id: p.id, role: p.role, seat: +seat.toFixed(2), ground: gd }); continue; }   /* seated: a seat (or its back) above the hips, the ground under the feet */
    var under = hs.filter(function (q) { return q.point.y <= s.y + 1.2; })[0];   /* canopies / eaves overhead are not the ground */
    if (!under) { off3.push({ id: p.id, role: p.role, t: t, nothing: true }); continue; } var d = s.y + 0.02 - under.point.y; if (Math.abs(d) > 0.12) off3.push({ id: p.id, role: p.role, t: t, d: +d.toFixed(3), on: under.object.name }); } });
ok('3. feet on the ground as drawn (' + n3 + ' samples; ' + off3.length + ' off by > 12 cm)', n3 > 60 && off3.length <= Math.floor(n3 * 0.05), off3.slice(0, 8));

/* 4. behaviour: deterministic; walkers keep a human pace (0.9–1.6 m/s), go both ways along their route and pause at the ends */
var W = H.plan.filter(function (p) { return p.pose === 'walk'; }), det = JSON.stringify(residentState(W[0], 37.5)) === JSON.stringify(residentState(W[0], 37.5)), beh = W.map(function (p) {
  var yaws = {}, paused = false, fast = 0; var prev = residentState(p, 0); for (var t = 0.5; t < 600; t += 0.5) { var s = residentState(p, t); if (s.gait === 0) paused = true; yaws[Math.sign(Math.cos(s.yaw - prev.yaw)) || 1] = 1; var v = Math.hypot(s.x - prev.x, s.z - prev.z) / 0.5; if (v > 1.9 && s.gait > 0) fast++; prev = s; } return { id: p.id, speed: p.speed, paused: paused, fast: fast }; });
ok('4. behaviour is deterministic; ' + W.length + ' walkers at 0.9–1.6 m/s pause at their route ends and never teleport', det && W.length >= 5 && beh.every(function (b) { return b.speed >= 0.9 && b.speed <= 1.6 && b.paused && b.fast === 0; }), beh.filter(function (b) { return !(b.speed >= 0.9 && b.speed <= 1.6 && b.paused && b.fast === 0); }));

/* 5. night: fewer people, and those out are where there is light (doors, the civic plaza, the footbridge, the lane, the quay) */
var nightOut = H.plan.filter(function (p) { return p.night; }), litRoles = { resident: 1, group: 1, watcher: 1, commuter: 1, walker: 1, sitter: 1 };
ok('5. night: ' + nightOut.length + ' of ' + H.plan.length + ' residents are out, all at lit places', nightOut.length >= 6 && nightOut.length <= H.plan.length * 0.7 && nightOut.every(function (p) { return litRoles[p.role]; }), nightOut.map(function (p) { return p.role; }));

/* 6. colour law: clothing neutral (or TITAN navy), accents one of the five class families; skin / hair are human neutrals (low saturation) */
var badC = [];
H.plan.forEach(function (p) { var S = p.style; [['top', S.top], ['leg', S.leg]].forEach(function (k) { var v = classify(k[1]); if (!(v.verdict === 'NEUTRAL' || (v.verdict === 'LAW' && v.family === 'BLUE'))) badC.push({ id: p.id, part: k[0], hex: k[1].toString(16), v: v }); });
  var va = classify(S.accent); if (!(va.verdict === 'LAW')) badC.push({ id: p.id, part: 'accent', hex: S.accent.toString(16), v: va });
  [['skin', S.skin, 0], ['hair', S.hair, 0]].forEach(function (k) { var v = classify(k[1]); if (v.verdict !== 'NEUTRAL' && v.s > k[2]) badC.push({ id: p.id, part: k[0], hex: k[1].toString(16), v: v }); }); });
var accFam = {}; H.plan.forEach(function (p) { var v = classify(p.style.accent); accFam[v.family] = 1; });
ok('7. colour law: clothing neutral / navy, class accents only (' + Object.keys(accFam).join(', ') + '), skin and hair under the neutral floor (the colour-law scan stays clean)', badC.length === 0, badC.slice(0, 6));

/* 8. budget + wiring: 2 draws on HIGH / MED (figures + contact shadows), none on LOW; one figure < 2 000 triangles; built after the Veil
      district (it reads its anchors) */
var fig = H.by.MAHWORLD_RESIDENTS, tri = fig ? fig.geometry.attributes.position.count / 3 : 0, draws = function (B) { return ['MAHWORLD_RESIDENTS', 'MAHWORLD_RESIDENTS_CONTACT'].filter(function (n) { return B.by[n]; }).length; };
ok('8. draws HIGH ' + draws(H) + ' / MED ' + draws(M) + ' / LOW ' + draws(L) + ' (residents ' + H.plan.length + ' / ' + M.plan.length + ' / ' + L.plan.length + '), ' + tri + ' triangles per figure; wired after veilFalls',
  draws(H) === 2 && draws(M) === 2 && draws(L) === 0 && H.plan.length === 25 && M.plan.length === 12 && L.plan.length === 0 && tri > 200 && tri < 2000 && fig.isInstancedMesh && WB.indexOf("['veilFalls', createVeilFalls], ['residents', createResidents]") >= 0 && residentPlan(null, 'HIGH').length === 0);

[H, M, L].forEach(function (B) { B.rs.dispose(); B.vf.dispose(); });
console.log('RESULT world m20 residents: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
