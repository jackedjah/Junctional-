/* M17 §18–19 (owner 2026-09-27): the duel court's class-energy vocabulary carried — sparingly — into MAHWORLD's shared hardscape:
   five-class junction rosettes where roads of different classes meet (or on shared ground), one district gem at a single-class junction,
   small recessed gems along the causeway / regional road edges (the district's class leads, the others acknowledged; shared ground runs
   the five-class sequence), a five-class centreline on the bridges, eight class gems round each sanctuary forecourt. Embedded light, not
   rainbow roads: flush, tiny next to the paving, one draw. And: junctions where different classes meet are NEUTRAL in the road seams
   (terrain.js used to average their colours — gold + pink gave peach).  node 16_TESTS/gameplay_world_hardscape_inlays.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { hardscapeLayout, createHardscapeInlays, sharedAt, FAMILY_CLASS, INLAY } from '../26_LOCAL_AUTHORITY/lab/world/hardscapeInlays.js';
import { CLASS_IDS, CLASS_HEX, PEARL_HEX } from '../26_LOCAL_AUTHORITY/lab/world/duelRoster.js';
import { groundYAt } from '../26_LOCAL_AUTHORITY/lab/world/worldLayout.js';
import { classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function J(p) { return JSON.parse(fs.readFileSync(path.join(LA, p), 'utf8')); } function src(p) { return fs.readFileSync(path.join(LA, p), 'utf8'); }
var REG = J('lab/assets/world/world_registry_v1.json'), L = hardscapeLayout(REG), I = L.inlays, PW = REG.paths, W = { CAUSEWAY: PW.causeway_w || 20, REGIONAL: PW.regional_w || 8, TRAIL: PW.trail_w || 3 };
function dSeg(x, z, a, b) { var dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }

/* 1. flush and on the hardscape: every inlay sits ≤ 5 cm above its ground (bridge gems on the 0.35 m deck tops), edge insets inside their
      road's frame, rosettes and district gems on a junction, forecourt gems inside their forecourt, bridge gems on a deck */
var bad1 = [];
I.forEach(function (o) { var base = o.deck ? 0.35 : groundYAt(REG, o.x, o.z), lift = o.y - base; if (!(lift >= 0 && lift <= 0.05) || ![o.x, o.y, o.z, o.size].every(isFinite)) bad1.push(['lift', o]);
  if (o.road) { var P = PW.list.filter(function (p) { return p.id === o.road; })[0], d = 1e9; for (var i = 1; i < P.pts.length; i++) d = Math.min(d, dSeg(o.x, o.z, P.pts[i - 1], P.pts[i])); if (d > W[P.tier] / 2 - 0.2) bad1.push(['edge', o.road, d]); }
  if (o.bridge) { var Lk = PW.links.filter(function (l) { return l.id === o.bridge; })[0].deck; if (!(o.x >= Lk.x1 && o.x <= Lk.x2 && o.z >= Lk.z1 && o.z <= Lk.z2)) bad1.push(['bridge', o]); } });
var kinds = {}; I.forEach(function (o) { var k = o.kind + (o.road ? ':edge' : o.bridge ? ':bridge' : ''); kinds[k] = (kinds[k] || 0) + 1; });
ok('1. flush on the hardscape: ' + I.length + ' inlays (' + Object.keys(kinds).map(function (k) { return k + ' ' + kinds[k]; }).join(', ') + ') — every one ≤ 5 cm above its ground or bridge deck, edge insets inside their road frame, bridge gems on the decks',
  I.length > 150 && bad1.length === 0 && kinds['GEM:edge'] > 100 && kinds['GEM:bridge'] >= 3 * 5 && kinds.RING >= 5 && kinds.ROSETTE_GEM === kinds.RING * 5 && kinds.NODE > 5, bad1.slice(0, 4));

/* 2. colour law and balance: only the five class colours or pearl; every class present and none over a third of all inlays; each shared
      rosette carries all five; every junction where roads of different classes meet has a rosette; a district node is its roads' class;
      inside a district the edge insets are led by that class (≥ 60 %) while every fifth acknowledges another; shared edge insets run all
      five */
var cnt = {}; I.forEach(function (o) { var k = o.classId || 'PEARL'; cnt[k] = (cnt[k] || 0) + 1; });
var lawOk = CLASS_IDS.every(function (c) { return classify(CLASS_HEX[c]).verdict === 'LAW'; }) && classify(PEARL_HEX).verdict === 'NEUTRAL' && I.every(function (o) { return o.classId === null ? o.kind === 'RING' : CLASS_IDS.indexOf(o.classId) >= 0; });
var nonPearl = I.filter(function (o) { return o.classId; }).length, balanced = CLASS_IDS.every(function (c) { return cnt[c] > 0 && cnt[c] / nonPearl < 1 / 3; });
var byNode = {}; I.forEach(function (o) { if (o.node) (byNode[o.node] = byNode[o.node] || []).push(o); });
var rosOk = Object.keys(byNode).every(function (k) { var g = byNode[k].filter(function (o) { return o.kind === 'ROSETTE_GEM'; }); return !g.length || (g.length === 5 && new Set(g.map(function (o) { return o.classId; })).size === 5); }) && L.mixed_junctions.length > 0 && L.mixed_junctions.every(function (k) { return (byNode[k] || []).some(function (o) { return o.kind === 'RING'; }); });
var nodeOk = L.network.nodes.filter(function (n) { return !n.bendOnly; }).every(function (n) { var fams = {}; (n.styles || []).forEach(function (s) { fams[s.family] = 1; }); var F = Object.keys(fams), g = (byNode[n.key] || []).filter(function (o) { return o.kind === 'NODE'; }); return !g.length || (F.length === 1 && g[0].classId === FAMILY_CLASS[F[0]]); });
var lead = {}; I.filter(function (o) { return o.road && !o.shared; }).forEach(function (o) { var P = PW.list.filter(function (p) { return p.id === o.road; })[0], own = FAMILY_CLASS[P.family]; if (!own) return; var e = lead[o.road] = lead[o.road] || { own: 0, all: 0 }; e.all++; if (o.classId === own) e.own++; });
var leadOk = Object.keys(lead).every(function (k) { return lead[k].all < 3 || lead[k].own / lead[k].all >= 0.6; }), sharedEdge = I.filter(function (o) { return o.road && o.shared; }), sharedFive = new Set(sharedEdge.map(function (o) { return o.classId; })).size === 5;
ok('2. colour law + balance: only the five class colours (' + CLASS_IDS.map(function (c) { return c + ' ' + cnt[c]; }).join(', ') + ') and pearl hairlines; no class over a third; every rosette carries all five; all ' + L.mixed_junctions.length + ' junctions where different classes meet carry one; district nodes = their roads\' class; district edges led by their class (≥ 60 %); shared edges run all five',
  lawOk && balanced && rosOk && nodeOk && leadOk && sharedFive && sharedEdge.length > 10, { cnt: cnt, lead: lead, sharedEdge: sharedEdge.length });

/* 3. restraint: the inlays light a tiny fraction of the road surface (neutral paving stays dominant) and fade out beyond ~140 m */
var roadArea = 0; PW.list.forEach(function (P) { for (var i = 1; i < P.pts.length; i++) roadArea += Math.hypot(P.pts[i][0] - P.pts[i - 1][0], P.pts[i][1] - P.pts[i - 1][1]) * (W[P.tier] || 3); });
var gemArea = I.reduce(function (a, o) { return a + (o.kind === 'RING' ? 2 * Math.PI * o.size * 0.02 : 2 * Math.pow(o.size * 0.707, 2)); }, 0);
ok('3. restraint: the inlays cover ' + (100 * gemArea / roadArea).toFixed(3) + ' % of the road surface (' + gemArea.toFixed(1) + ' m² of ' + Math.round(roadArea) + ' m²), edge insets every ' + INLAY.edge_step_m + ' m alternating sides, trails left plain, faded out by ' + INLAY.fade_m[1] + ' m',
  gemArea / roadArea < 0.005 && INLAY.edge_step_m >= 8 && !I.some(function (o) { var P = o.road && PW.list.filter(function (p) { return p.id === o.road; })[0]; return P && P.tier === 'TRAIL'; }) && INLAY.fade_m[1] <= 160, { gemArea: gemArea, roadArea: roadArea });

/* 4. the live module: one instanced draw, pure light (no depth write), non-interactable, hot light scaled never clipped, brighter at night;
      phones (LOW) keep half the edge insets; mounted after the terrain in the world order; the mixed-class junction seams are neutral */
var g = new THREE.Group(), hs = createHardscapeInlays({ THREE: THREE, registry: REG, group: g, night: true, quality: { tier: function () { return 'HIGH'; } } }); hs.build();
var gl = new THREE.Group(), hl = createHardscapeInlays({ THREE: THREE, registry: REG, group: gl, night: false, quality: { tier: function () { return 'LOW'; } } }); hl.build();
var meshes = []; g.traverse(function (o) { if (o.isMesh) meshes.push(o); }); var M = meshes[0], HS = src('lab/world/hardscapeInlays.js'), WB = src('lab/world/worldB.js'), TR = src('lab/world/terrain.js');
ok('4. live module: one draw (' + (M && M.geometry.instanceCount) + ' inlays; LOW ' + hl.debug().inlays + '), flush pure light, non-interactable, hot light scaled not clipped; mounted after the terrain; junctions where different classes meet are neutral in the road seams',
  meshes.length === 1 && M.name === 'HARDSCAPE_CLASS_INLAYS' && M.userData.nonInteractable && M.material.depthWrite === false && M.geometry.instanceCount === I.length && hs.debug().draw_calls === 1 && hl.debug().inlays < I.length &&
  /col \/= max\(1\.0, max\(max\(col\.r, col\.g\), col\.b\)\)/.test(HS) && !/colliders\.push|walkable/.test(HS) && /\['terrain', createTerrain\][^\]]*\]*, \['hardscape', createHardscapeInlays\]/.test(WB) &&
  /N\.mixedFamilies = true/.test(TR) && /Object\.keys\(mixF\)\.length > 1/.test(TR), { meshes: meshes.length, worldB: /hardscape/.test(WB), terrain: /mixedFamilies/.test(TR) });
hs.dispose(); hl.dispose();

console.log('RESULT world hardscape inlays: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
