/* P7 (master §14.6) — PLACEMENT MASK PREVIEW (definition only: nothing is placed, no scene file is touched). Evaluates lab/assets/botany/placement_v1.json
   against the actual FIELD layout (rules _runtime_mapping.field_colliders_district_v1 + the district manifest) and reports the eligible area, the seeded
   candidate set (count / bounds / per-region), and the exclusions that removed candidates — the numbers the approval decision and the later migration need.
   node deploy/botany_placement_preview.mjs [--out file.json] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var LA = path.join(HERE, '..'); var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }
var P = JSON.parse(fs.readFileSync(path.join(LA, 'lab', 'assets', 'botany', 'placement_v1.json'), 'utf8'));
var R = JSON.parse(fs.readFileSync(path.join(LA, 'play', 'rules1723', 'rules_17_23.dev.json'), 'utf8')); var L = R._runtime_mapping.field_colliders_district_v1;
var MAN = JSON.parse(fs.readFileSync(path.join(LA, 'lab', 'assets', 'buildings', 'district_v1.json'), 'utf8'));
function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; var f = function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (var w = 0; w < 12; w++) f(); return f; }
function dSeg(px, pz, ax, az, bx, bz) { var vx = bx - ax, vz = bz - az; var t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz || 1))); return Math.hypot(px - (ax + vx * t), pz - (az + vz * t)); }
var solids = L.shapes.filter(function (s) { return !s.walkable && !s.rim && s.type !== 'RAMP'; }); var EX = P.exclusions;
var landmarks = MAN.buildings.filter(function (b) { return b.enabled !== false && b.envelope_m; });
function why(x, z) {
  var ok = P.eligible.some(function (e) { var d = Math.hypot(x - e.cx, z - e.cz); return d >= e.r_min && d <= e.r_max; }); if (!ok) return 'outside eligible';
  for (var i = 0; i < solids.length; i++) { var s = solids[i], m = EX.layout_solids_margin_m; if (s.type === 'BOX') { if (x >= s.x1 - m && x <= s.x2 + m && z >= s.z1 - m && z <= s.z2 + m) return 'solid:' + (s.id || s.district || 'box'); } else if (s.type === 'CYLINDER') { if (Math.hypot(x - s.x, z - s.z) <= s.r + m) return 'solid:' + (s.id || 'cyl'); } }
  for (var j = 0; j < landmarks.length; j++) { var e = landmarks[j].envelope_m, mm = EX.landmark_envelope_margin_m; if (x >= e.x1 - mm && x <= e.x2 + mm && z >= e.z1 - mm && z <= e.z2 + mm) return 'landmark:' + landmarks[j].id; }
  var pp = EX.plaza_pathways; for (var k = 0; k < pp.targets.length; k++) { var t = pp.targets[k], d0 = Math.hypot(t[0], t[1]); var ax = t[0] * pp.from_r / d0, az = t[1] * pp.from_r / d0; if (dSeg(x, z, ax, az, t[0], t[1]) <= pp.half_width_m) return 'pathway'; }
  var ss = EX.secondary_streets; for (var k2 = 0; k2 < ss.targets.length; k2++) { if (dSeg(x, z, ss.from[0], ss.from[1], ss.targets[k2][0], ss.targets[k2][1]) <= ss.half_width_m) return 'street'; }
  var dr = EX.district_routes; for (var k3 = 0; k3 < landmarks.length; k3++) { var lp = landmarks[k3].position; if (dSeg(x, z, dr.from[0], dr.from[1], lp[0], lp[2]) <= dr.half_width_m) return 'route:' + landmarks[k3].id; }
  for (var c = 0; c < EX.clearances.length; c++) { var cl = EX.clearances[c]; if (Math.hypot(x - cl.cx, z - cl.cz) <= cl.r) return 'clearance:' + cl.label; }
  for (var q = 0; q < EX.sightlines.length; q++) { var sl = EX.sightlines[q]; if (dSeg(x, z, sl.from[0], sl.from[1], sl.to[0], sl.to[1]) <= sl.half_width_m) return 'sightline'; }
  return null;
}
/* eligible area by sampling */
var step = 2, elig = 0, tot = 0, removed = {}; for (var x = -160; x <= 160; x += step) for (var z = -160; z <= 160; z += step) { tot++; var w = why(x, z); if (!w) elig++; else if (w !== 'outside eligible') removed[w.split(':')[0]] = (removed[w.split(':')[0]] || 0) + 1; }
var areaM2 = elig * step * step;
/* seeded cluster grammar */
var D = P.distribution; var rnd = rng(P.seed); var pts = []; var cell = D.cluster_cell_m; var clusters = 0, rejectedSpacing = 0, rejectedMask = 0;
var centres = []; for (var gx = -160; gx <= 160; gx += cell) for (var gz = -160; gz <= 160; gz += cell) { var cx0 = gx + (rnd() - 0.5) * cell * 0.8, cz0 = gz + (rnd() - 0.5) * cell * 0.8; var keep = rnd() <= (D.cell_acceptance || 0.6); if (why(cx0, cz0) || !keep) continue; centres.push({ x: cx0, z: cz0, d: Math.hypot(cx0, cz0) }); }   /* not every cell: curated sparseness; the cap keeps the clusters nearest the plaza (the player's route) and drops the farthest */
centres.sort(function (a, b) { return a.d - b.d; });
for (var ci = 0; ci < centres.length; ci++) { var cx = centres[ci].x, cz = centres[ci].z; if (pts.length >= D.hard_cap) break;
  var n = D.cluster_size[0] + Math.floor(rnd() * (D.cluster_size[1] - D.cluster_size[0] + 1)); var placed = 0; clusters++;
  for (var i2 = 0; i2 < n * 3 && placed < n; i2++) { var a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * D.cluster_radius_m; var px = cx + Math.cos(a) * r, pz = cz + Math.sin(a) * r; if (why(px, pz)) { rejectedMask++; continue; } if (pts.some(function (q) { return Math.hypot(q.x - px, q.z - pz) < D.min_spacing_m; })) { rejectedSpacing++; continue; } pts.push({ x: +px.toFixed(2), z: +pz.toFixed(2), variant: Math.floor(rnd() * 3), yaw_deg: Math.round(rnd() * 360), scale: +(D.scale_range[0] + rnd() * (D.scale_range[1] - D.scale_range[0])).toFixed(3), cluster: clusters }); placed++; } }
if (pts.length > D.hard_cap) pts = pts.slice(0, D.hard_cap); var dropped = centres.length - clusters;
var perRegion = { plaza_ring: pts.filter(function (p) { return Math.hypot(p.x, p.z) <= 54; }).length, district: pts.filter(function (p) { return Math.hypot(p.x, p.z) > 54; }).length };
var bounds = pts.reduce(function (b, p) { return { x1: Math.min(b.x1, p.x), z1: Math.min(b.z1, p.z), x2: Math.max(b.x2, p.x), z2: Math.max(b.z2, p.z) }; }, { x1: 1e9, z1: 1e9, x2: -1e9, z2: -1e9 });
var out = { version: P.version, status: P.status, layout: L.version, seed: P.seed, eligible_area_m2: areaM2, sampled_cells: tot, exclusion_hits_by_kind: removed, clusters: clusters, cluster_centres_eligible: centres.length, clusters_dropped_by_cap: dropped, candidates: pts.length, per_region: perRegion, density_per_100m2: +(100 * pts.length / areaM2).toFixed(3), bounds: bounds, rejected: { mask: rejectedMask, spacing: rejectedSpacing }, tris_estimate_no_lod: pts.length * 6700, instanced_draws_estimate: 9, candidates_list: pts };
var OUT = arg('--out', path.join(HERE, 'probe_out', 'botany', 'placement_preview.json')); fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ eligible_area_m2: areaM2, clusters: clusters, candidates: pts.length, per_region: perRegion, density_per_100m2: out.density_per_100m2, exclusion_hits: removed, bounds: bounds }));
