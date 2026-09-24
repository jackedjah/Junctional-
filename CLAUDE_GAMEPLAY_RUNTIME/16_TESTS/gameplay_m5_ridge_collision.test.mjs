/* M5 owner OP10 — the macro ridge is one shared visible/collision layout.  Pure Node checks cover deterministic topology, bounded proxies,
   explicit pass gaps, normal/max-speed + low-frame swept movement, finite-height flight contact, projectile impact and the real field camera
   boom API.  node 16_TESTS/gameplay_m5_ridge_collision.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { ridgeColliders, ridgeFaceSegment, ridgeInnerTriangles, ridgeReachBounds, ridgeStations, ridgeTriangleSection } from '../26_LOCAL_AUTHORITY/lab/world/ridgeLayout.js';
import { worldColliders } from '../26_LOCAL_AUTHORITY/lab/world/worldLayout.js';
import { createColliders } from '../26_LOCAL_AUTHORITY/play/rules1723/Colliders.js';
import { createFieldScene } from '../26_LOCAL_AUTHORITY/lab/fieldScene.js';

var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var REG = JSON.parse(fs.readFileSync(path.join(LA, 'lab', 'assets', 'world', 'world_registry_v1.json'), 'utf8'));
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail))); } }
var layout = ridgeColliders(REG), layout2 = ridgeColliders(REG), B = ridgeReachBounds(REG), mountains = REG.macro.mountains;
var stationSets = mountains.map(function (R, i) { return ridgeStations(R, i); });
var C = createColliders({ version: 'RIDGE_TEST', body_radius_m: 0.4, body_height_m: 1.7, shapes: layout });

var watertight = true, closure = [];
stationSets.forEach(function (stations, ri) {
  var N = mountains[ri].segments, firstStation = stations[0], terminalStation = stations[N];
  for (var i = 0; i < N - 1; i++) { var a = ridgeFaceSegment(stations, i), b = ridgeFaceSegment(stations, i + 1); if (Math.hypot(a.innerB.x - b.innerA.x, a.innerB.z - b.innerA.z) > 1e-8 || Math.hypot(a.outerB.x - b.outerA.x, a.outerB.z - b.outerA.z) > 1e-8 || Math.hypot(a.crestB.x - b.crestA.x, a.crestB.z - b.crestA.z) > 1e-8) watertight = false; }
  var firstFace = ridgeFaceSegment(stations, 0), lastFace = ridgeFaceSegment(stations, N - 1);
  var stationGap = Math.hypot(firstStation.x - terminalStation.x, firstStation.z - terminalStation.z), innerGap = Math.hypot(firstFace.innerA.x - lastFace.innerB.x, firstFace.innerA.z - lastFace.innerB.z), outerGap = Math.hypot(firstFace.outerA.x - lastFace.outerB.x, firstFace.outerA.z - lastFace.outerB.z), crestGap = Math.hypot(firstFace.crestA.x - lastFace.crestB.x, firstFace.crestA.z - lastFace.crestB.z);
  var exactProfile = terminalStation.b === Math.PI * 2 && terminalStation.x === firstStation.x && terminalStation.z === firstStation.z && terminalStation.h === firstStation.h && terminalStation.w === firstStation.w;
  closure.push({ ridge: mountains[ri].id, station_gap: stationGap, inner_gap: innerGap, outer_gap: outerGap, crest_gap: crestGap, exact_profile: exactProfile });
  if (!exactProfile || stationGap > 1e-10 || innerGap > 1e-10 || outerGap > 1e-10 || crestGap > 1e-10 || firstFace.crestA.y !== lastFace.crestB.y) watertight = false;
});
var macroSrc = fs.readFileSync(path.join(LA, 'lab', 'world', 'macro.js'), 'utf8');
ok('R01 renderer and authority share one deterministic seeded ridge layout with an exact N→0 closure', layout.length > 0 && JSON.stringify(layout) === JSON.stringify(layout2) && watertight && closure.every(function (c) { return c.exact_profile; }) && /import \{ ridgeStations, ridgeFaceSegment \} from '.\/ridgeLayout\.js'/.test(macroSrc) && /var stations = ridgeStations\(R, idx\)/.test(macroSrc), { shapes: layout.length, watertight: watertight, closure: closure });

/* Exhaustively reconstruct both actual triangles used by macro.js.  For every occupied proxy, sample the lower edge, three interiors and
   upper edge across both piece edges + centre.  Every visible sample must be inside the finite BOX and query as colliding at its real height.
   The adaptive sweep cap bounds how much invisible radial depth a vertical cell can acquire. */
var faceSamples = 0, faceMisses = [], queryMisses = [];
var local = layout.every(function (s) {
  if (s.type !== 'BOX' || !s.ridge || s.world !== 'JOBB' || !isFinite(s.y0) || !isFinite(s.h) || s.y0 < 0 || s.h <= s.y0) return false;
  if (!isFinite(s.face_y0_m) || !isFinite(s.face_y1_m) || !isFinite(s.face_sweep_m) || s.face_y1_m <= s.face_y0_m || s.face_y1_m - s.face_y0_m > 6.001 || s.face_sweep_m > 2.501) return false;
  if (s.x2 - s.x1 > 11.41 || s.z2 - s.z1 > 11.41 || Math.abs((s.h - s.face_y1_m) - 0.25) > 0.002) return false;
  if (s.x2 < B.x1 - 8 || s.x1 > B.x2 + 8 || s.z2 < B.z1 - 8 || s.z1 > B.z2 + 8) return false;
  var ri = mountains.findIndex(function (R) { return R.id === s.ridge_id; }), F = ridgeFaceSegment(stationSets[ri], s.ridge_segment), T = ridgeInnerTriangles(F)[s.ridge_triangle];
  var t0 = s.ridge_piece / s.ridge_pieces, t1 = (s.ridge_piece + 1) / s.ridge_pieces, valid = true;
  [0, 0.25, 0.5, 0.75, 1].forEach(function (yf) {
    var y = s.face_y0_m + (s.face_y1_m - s.face_y0_m) * yf, section = ridgeTriangleSection(T, y);
    if (!section) { valid = false; faceMisses.push({ id: s.id, y: y, why: 'no rendered section' }); return; }
    [t0, (t0 + t1) * 0.5, t1].forEach(function (t) {
      var p = { x: section[0].x + (section[1].x - section[0].x) * t, z: section[0].z + (section[1].z - section[0].z) * t }; faceSamples++;
      var inside = p.x >= s.x1 - 0.002 && p.x <= s.x2 + 0.002 && p.z >= s.z1 - 0.002 && p.z <= s.z2 + 0.002 && y >= s.y0 - 0.002 && y < s.h - 0.2;
      if (!inside) { valid = false; if (faceMisses.length < 12) faceMisses.push({ id: s.id, y: y, t: t, p: p, box: [s.x1, s.z1, s.x2, s.z2, s.y0, s.h] }); }
      var hit = C.blockedAt(p.x, p.z, y); if (!hit || !hit.ridge) { valid = false; if (queryMisses.length < 12) queryMisses.push({ id: s.id, y: y, t: t, p: p }); }
    });
  });
  return valid;
});

/* The authored north pass intentionally removes normal collision at the 2π seam.  Exercise closure independently with a pure registry copy
   whose passes/routes are removed: both segment N-1 and segment 0 must cover the same radial edge, and the real collision API must hit it. */
var seamReg = JSON.parse(JSON.stringify(REG));
(seamReg.macro.mountains || []).forEach(function (R) { R.passes = []; });
if (seamReg.paths) seamReg.paths.list = [];
if (seamReg.field) seamReg.field.routes = [];
var seamLayout = ridgeColliders(seamReg, { bounds: { x1: -35, z1: 150, x2: 35, z2: 600 }, query_pad_m: 0 }), seamC = createColliders({ version: 'RIDGE_SEAM_TEST', body_radius_m: 0.4, body_height_m: 1.7, shapes: seamLayout }), seamEvidence = [], seamClosed = true;
seamReg.macro.mountains.forEach(function (R, ri) {
  var stations = ridgeStations(R, ri), N = R.segments, F = ridgeFaceSegment(stations, 0), side0 = seamLayout.filter(function (s) { return s.ridge_id === R.id && s.ridge_segment === 0; }), sideN = seamLayout.filter(function (s) { return s.ridge_id === R.id && s.ridge_segment === N - 1; }), rows = [];
  [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
    var y = F.innerA.y + (F.crestA.y - F.innerA.y) * f; if (y < 0) y = 0;
    var u = (y - F.innerA.y) / (F.crestA.y - F.innerA.y), p = { x: F.innerA.x + (F.crestA.x - F.innerA.x) * u, z: F.innerA.z + (F.crestA.z - F.innerA.z) * u };
    function covers(s) { return s.face_y0_m <= y + 0.002 && s.face_y1_m >= y - 0.002 && p.x >= s.x1 - 0.002 && p.x <= s.x2 + 0.002 && p.z >= s.z1 - 0.002 && p.z <= s.z2 + 0.002; }
    var left = sideN.some(covers), right = side0.some(covers), hit = seamC.blockedAt(p.x, p.z, y); rows.push({ y: +y.toFixed(3), last: left, first: right, hit: hit && hit.id });
    if (!left || !right || !hit || !hit.ridge) seamClosed = false;
  });
  seamEvidence.push({ ridge: R.id, last_shapes: sideN.length, first_shapes: side0.length, samples: rows });
});
ok('R02 every occupied band edge/interior has near-aligned collision and the N→0 collider seam closes exactly', local && seamClosed && faceMisses.length === 0 && queryMisses.length === 0 && layout.every(function (s) { return s.collision_proxy === 'VISIBLE_RIDGE_INNER_FACE'; }), { bounds: B, count: layout.length, samples: faceSamples, seam: seamEvidence, misses: faceMisses, query_misses: queryMisses, max_sweep: Math.max.apply(null, layout.map(function (s) { return s.face_sweep_m; })), max_w: Math.max.apply(null, layout.map(function (s) { return +(s.x2 - s.x1).toFixed(3); })), max_d: Math.max.apply(null, layout.map(function (s) { return +(s.z2 - s.z1).toFixed(3); })) });

var gaps = []; mountains.forEach(function (R) { (R.passes || []).forEach(function (P) { [-0.5, 0, 0.5].forEach(function (f) { [0, 27, 70].forEach(function (alt) { var b = P.bearing_rad + P.half_width_rad * f, x0 = Math.sin(b) * 190, z0 = Math.cos(b) * 190, dx = Math.sin(b) * 260, dz = Math.cos(b) * 260, mv = C.resolveMove({ x: x0, z: z0 }, dx, dz, alt); if (mv.blocked) gaps.push({ ridge: R.id, pass: P.id, offset: f, altitude: alt, hit: mv.hit && mv.hit.id }); }); }); }); });
var routeHits = []; ((REG.paths && REG.paths.list) || []).forEach(function (P) { for (var si = 0; si < P.pts.length - 1; si++) { var a = P.pts[si], b = P.pts[si + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.5)); for (var sj = 0; sj <= n; sj++) { var t = sj / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, hit = C.blockedAt(x, z, 0); if (hit) { routeHits.push({ route: P.id, segment: si, x: +x.toFixed(2), z: +z.toFixed(2), hit: hit.id }); break; } } } });
ok('R03 all declared ridge passes and every rendered road centre retain a body-width traversable gap (including one low-frame full-delta pass sweep)', gaps.length === 0 && routeHits.length === 0, { passes: gaps, routes: routeHits });

function centre(s) { return { x: (s.x1 + s.x2) * 0.5, z: (s.z1 + s.z2) * 0.5 }; }
function radialCross(s, distance, altitude) { var p = centre(s), r = Math.hypot(p.x, p.z), ux = p.x / r, uz = p.z / r; return { start: { x: p.x - ux * distance * 0.5, z: p.z - uz * distance * 0.5 }, delta: { x: ux * distance, z: uz * distance }, result: C.resolveMove({ x: p.x - ux * distance * 0.5, z: p.z - uz * distance * 0.5 }, ux * distance, uz * distance, altitude), p: p, ux: ux, uz: uz }; }
var groundShape = layout.find(function (s) { var p = centre(s); return s.ridge_id === 'RIDGE_NEAR' && s.y0 === 0 && Math.hypot(p.x, p.z) < 295 && s.ridge_segment > 18 && s.ridge_segment < 40; }) || layout.find(function (s) { return s.y0 === 0; });
var normal = radialCross(groundShape, 8, 0), hitch = radialCross(groundShape, 120, 0);
ok('R04 normal and maximum-speed/low-frame swept movement stop on the visible ridge without tunnelling', normal.result.blocked && hitch.result.blocked && normal.result.hit && normal.result.hit.ridge && hitch.result.hit && hitch.result.hit.ridge, { shape: groundShape.id, normal: normal.result, hitch: hitch.result });

var flightShape = layout.find(function (s) { var p = centre(s); return s.ridge_id === 'RIDGE_NEAR' && s.y0 >= 18 && Math.hypot(p.x, p.z) < 295; }), flightAlt = (flightShape.y0 + flightShape.h) * 0.5, flight = radialCross(flightShape, 60, flightAlt);
ok('R05 finite height bands stop/slide a flying body at the visible face and clear above the actual ridge', flight.result.blocked && C.blockedAt(centre(flightShape).x, centre(flightShape).z, flightAlt) && !C.blockedAt(centre(flightShape).x, centre(flightShape).z, 250), { shape: flightShape, result: flight.result });

var gp = centre(groundShape), gr = Math.hypot(gp.x, gp.z), gux = gp.x / gr, guz = gp.z / gr;
var shot = C.projectileImpact({ x: gp.x - gux * 20, z: gp.z - guz * 20 }, { x: gp.x + gux * 20, z: gp.z + guz * 20 }, 1.5);
var fp = centre(flightShape), fr = Math.hypot(fp.x, fp.z), fux = fp.x / fr, fuz = fp.z / fr;
var airShot = C.projectileImpact({ x: fp.x - fux * 20, z: fp.z - fuz * 20 }, { x: fp.x + fux * 20, z: fp.z + fuz * 20 }, flightAlt);
ok('R06 ground and airborne projectile sweeps query the same finite ridge proxies', !!shot && /^RIDGE_/.test(shot.shape) && !!airShot && /^RIDGE_/.test(airShot.shape), { ground: shot, air: airShot });

/* Exercise the actual presentation API, not a copied point-in-box helper.  BOX is already a supported fieldScene shape, so no new shape hook
   or fieldScene edit is required: worldColliders feeds these same proxies into its existing zone groups. */
var sceneApi = createFieldScene(THREE, new THREE.Scene(), { world: false }); sceneApi.probeSolids([groundShape]);
var yaw = Math.atan2(gux, guz), target = { x: gp.x - gux * 6, y: 1.5, z: gp.z - guz * 6 };
var cameraBlock = sceneApi.blockingShape(gp.x, 1.5, gp.z, 0.3), cameraDistance = sceneApi.cameraDistance(target, yaw, 0, 14, 0.3); sceneApi.clear();
ok('R07 the real camera boom query sees the shared BOX proxy and shortens before the ridge', cameraBlock && cameraBlock.id === groundShape.id && cameraDistance < 14 && cameraDistance > 0.5, { blocker: cameraBlock, distance: cameraDistance });

var generated = worldColliders(REG, []), generatedRidge = generated.filter(function (s) { return s.ridge; });
var WC = createColliders({ version: 'WORLD_RIDGE_TEST', body_radius_m: 0.4, body_height_m: 1.7, shapes: generated });
ok('R08 worldLayout publishes the exact ridge set into bounded authority broad-phase zones', JSON.stringify(generatedRidge) === JSON.stringify(layout) && WC.worldShapeCount() === generated.length && WC.worldGroups().some(function (g) { return /^W:RIDGE_NEAR_FACE_/.test(g.id); }), { ridge: generatedRidge.length, world: generated.length, groups: WC.worldGroups().filter(function (g) { return /RIDGE/.test(g.id); }).length });

console.log('RESULT M5 ridge structural collision: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
