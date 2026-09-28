/* MAHWORLD M20 :: AMBIENT MAGIC ECOLOGY (owner 2026-09-27, priority 7: "magic dust / magical micro-fauna / ambient arcane geometry …
   subtle, airy, elegant, softly alive, non-interactable, naturally integrated, linked to our aura language — NOT random VFX spam").
   Three restrained kinds of life, each only where magic plausibly gathers — never a loop, a burst or a spinning sticker:
     · MOTES — a thin drift of light motes in the air of the class groves (the crown layer and above it) and over the Veil's lanes,
       carried on the registry's one wind (sky.wind). Each mote lives one slow pass: it fades in, drifts ~10 m with the air, fades out.
       Dust in the light: NEUTRAL, lit by the key light (the Sun by day, the Moon by night) with forward scattering — it glints when the
       viewer looks toward the light and all but vanishes looking away; dimmer by day than by night.
     · CRYSTAL POLLEN — fine grains shed from the crystal tips of a few trees in each grove, sinking down-wind in the grove's own class
       colour and fading out long before head height (the fade ends at the floor law below; no grain reaches the ground).
     · LIGHT-MOTHS — at night only (off by day), a handful of tiny moth-lights wander round the crystal crowns of the groves and the Veil's
       garden beds: a near-white core in a halo of the plant's class colour, a short soft trail, a slow looping flight.
   Not added: an arcane figure (the aura language's soft rings in aura.js / auraForms.js already carry the "ambient geometry", and aura.js
   now drops the dotted rings round the crown gems), spray glints at the falls (the lead's rising mist already lives there, and the landing
   line is inside the host's reach over the ridge's collision proxies).
   Colour law: motes are equal-channel white light; pollen and moth halos are a class colour (the grove's registry family; the Veil's five
   classes in equal measure; LEAN is the deep class crimson — the pale crystal red reads pink); never an RGB blend of two classes.
   HOST SAFETY: pure light (additive, no depth write, no collider, flagged non-interactable). Inside the host's reach (the ±304 m square,
   residents.REACH_MIN_M) every point's FLOOR is the highest ground under its whole drift footprint — the terrain, every host shape it
   crosses (tree trunks, terraces, monoliths, platforms: the collider generators' own functions) and the ridge's inner face — + 3.4 m and a
   margin; the shader clamps the point to it and fades it out before it gets there. A footprint over a structure, a duel court or a class
   house is left out. Beyond the reach (the Veil highland) the floor is just above the ground. ambientPlan() reports every floor,
   ambientSafe() the clearances.
   COST: ONE THREE.Points draw for every kind and site; all motion is computed in the vertex shader from one time uniform (no per-frame
   upload, no allocation, no triangles). HIGH 464 points, MED 193 (half the motes and pollen, two-point moth trails), LOW: nothing is
   built (0 draws, 0 points). */
import { ridgeStations } from './ridgeLayout.js'; import { regionColliders, terraceColliders, architectureColliders, artifactColliders } from './worldLayout.js';

export var AMBIENT_REACH_M = 304;   /* residents.REACH_MIN_M / ridgeSculpt REACH_FLOOR: the host never reaches past it */
export var AMBIENT_CLEAR_M = 3.4;   /* owner host law: art the host can reach stays ≥ 3.4 m above the ground it hangs over */
var FLOOR_MARGIN_M = 0.4;
export var AMBIENT_KIND = { MOTE: 0, POLLEN: 1, MOTH: 2, FRAGMENT: 3 };
/* the class light colours (display space): the crystal light end of each class, LEAN as the deep class crimson (the pale 0xff6f82 reads pink
   on the night floor — the aura.js review trap), and one equal-channel white for the neutral light */
export var AMBIENT_TINT = { gold: 0xffd88a, blue: 0x8fb4ff, red: 0xd42c3a, purple: 0xb99cff, pink: 0xffa6d4, white: 0xf0f0f0 };

function rnd(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/* THE FOOTPRINT: the ground a point's motion sweeps, as a capsule (the same amplitudes as the vertex shader): a mote travels ±r down-wind
   with a ±0.3 r meander, pollen 0…r down-wind (±0.35 m sway), a moth loops within √2·r of its anchor (independent ±r in x and z). `down` is how far below its anchor it
   can go. wd = the wind's unit direction [x, z]. */
/* M20 lead review: a moth's loop moves x and z with independent ±r amplitudes, so it reaches √2·r diagonally (the footprint said r); each bench
   / overlook hosts at most one moth (picked with replacement, four looped within 2.5 m of one bench — a swarm) */
export function ambientFootprint(p, wd) { var k = p.k, r = p.r || 0, h = p.h || 0, w = wd || [0, 1], m0 = k === 0 || k === 3, a = m0 ? -r : 0, b = k === 2 ? 0 : r;   /* a FRAGMENT drifts like a mote */
  return { ax: p.x + w[0] * a, az: p.z + w[1] * a, bx: p.x + w[0] * b, bz: p.z + w[1] * b, rad: (m0 ? 0.3 * r : k === 1 ? 0.35 : r * 1.415) + 0.05, down: m0 ? h * 0.625 : k === 1 ? h : h * 0.5 + 0.07 }; }
function capsuleSamples(F) { var out = []; for (var i = 0; i <= 8; i++) { var t = i / 8; out.push([F.ax + (F.bx - F.ax) * t, F.az + (F.bz - F.az) * t]); } return out; }
function capsuleReach(F) { return Math.min(Math.max(Math.abs(F.ax), Math.abs(F.az)), Math.max(Math.abs(F.bx), Math.abs(F.bz))) - F.rad; }
/* the highest ground under the capsule: the terrain sampled along and across it, every host shape it touches (BOX / RAMP tops, CYLINDER
   tops — tree trunks, monoliths, pillars; shape.h is the absolute top as the collider generators write it) and the ridge's inner face */
var HIT_PAD_M = 0.3;   /* a shape within this of the footprint counts as under it (the collider build rounds radii to the centimetre) */
function footprintGround(F, G, shapes, ridge) { var S = capsuleSamples(F), m = -Infinity, st = -Infinity, dx = F.bx - F.ax, dz = F.bz - F.az, l = Math.hypot(dx, dz), nx = l > 1e-6 ? -dz / l : 1, nz = l > 1e-6 ? dx / l : 0;
  S.forEach(function (q) { [-1, -0.5, 0, 0.5, 1].forEach(function (o) { m = Math.max(m, G(q[0] + nx * F.rad * o, q[1] + nz * F.rad * o)); }); if (l < 1e-6) for (var j = 0; j < 8; j++) { var an = j / 8 * Math.PI * 2; m = Math.max(m, G(q[0] + Math.cos(an) * F.rad, q[1] + Math.sin(an) * F.rad)); } });
  (shapes || []).forEach(function (s) { var top = s.type === 'RAMP' ? Math.max(+s.h0 || 0, +s.h1 || 0) : +s.h || 0, hit = false;
    for (var i = 0; i < S.length && !hit; i++) { var x = S[i][0], z = S[i][1]; if (s.type === 'CYLINDER') hit = Math.hypot(x - s.x, z - s.z) < (s.r || 0) + F.rad + HIT_PAD_M; else hit = Math.hypot(Math.max(s.x1 - x, 0, x - s.x2), Math.max(s.z1 - z, 0, z - s.z2)) < F.rad + HIT_PAD_M; }
    if (hit) st = Math.max(st, top); });
  if (ridge) S.forEach(function (q) { st = Math.max(st, ridge(q[0], q[1], F.rad)); });
  return { terrain: m, shapes: st, top: Math.max(m, st) }; }
/* the ridge's inner face as ground: the face rises linearly from its inner base (y −4 at radius dist − w) to the crest (h at dist) between
   its seeded stations — the same stations and rows the collision proxies are cut from (ridgeLayout; the inner rows are never displaced).
   The proxies are axis-aligned boxes round diagonal slices, so a box reaches up to RIDGE_PAD_M inside its slice: the face height is read
   RIDGE_PAD_M (+ the footprint radius) further out than the point (the highest proxy top that can stand over it). ridgeFaceTop(reg)(x, z, rad) → y (−Infinity inside). */
var RIDGE_PAD_M = 16;
export function ridgeFaceTop(reg) { var rings = (((reg && reg.macro && reg.macro.mountains) || [])).map(function (R, i) { return ridgeStations(R, i).map(function (s) { var d = Math.hypot(s.x, s.z); return { rin: d - s.w, w: s.w, h: s.h }; }); });
  return function (x, z, rad) { var b = Math.atan2(x, z); if (b < 0) b += Math.PI * 2; var rr = Math.hypot(x, z) + RIDGE_PAD_M + (rad || 0), m = -Infinity;
    rings.forEach(function (st) { var N = st.length - 1, i = Math.min(N - 1, Math.floor(b / (Math.PI * 2) * N)), rin = Infinity, w = Infinity, h = -Infinity;
      for (var k = -1; k <= 2; k++) { var S = st[((i + k) % N + N) % N]; rin = Math.min(rin, S.rin); w = Math.min(w, S.w); h = Math.max(h, S.h); }   /* the seeded radius jitter (±30 m) kinks the face between stations: the nearest four stations' innermost base, narrowest width, highest crest */
      if (rr > rin) m = Math.max(m, -4 + Math.min(1, (rr - rin) / w) * (h + 4)); }); return m; }; }
/* the host shapes the plan respects in the reach — the SAME generators the collider build uses (worldLayout), and the tree trunks from the
   forest placement with the family's collision radius / height (worldLayout.forestColliders) */
export function ambientHostShapes(reg, trees) { var fam = ((reg && reg.artifacts) || []).filter(function (a) { return a.id === 'FOREST_TREE_FAMILY'; })[0], r0 = fam && fam.collision ? fam.collision.r_m : 0.55, h0 = fam && fam.collision ? fam.collision.h_m : 4, out = [];
  (trees || []).forEach(function (t) { out.push({ type: 'CYLINDER', x: t.x, z: t.z, r: r0 * (t.scale || 1), h: h0 * (t.scale || 1) }); });
  [regionColliders, terraceColliders, architectureColliders, artifactColliders].forEach(function (f) { try { out = out.concat(f(reg) || []); } catch (e) { } }); return out.filter(function (s) { return !s.water; }); }
var STRUCTURE_M = 6.5;   /* a shape standing more than this over the terrain under a footprint is a structure (monolith, platform, hall): keep away, never hoist over it */

/* THE PLAN (pure data, deterministic): src = { reg, trees (worldLayout.forestLayout placements), ground (x, z) → y, shapes (host shapes to
   respect in the reach, default ambientHostShapes), avoid ([{ x, z, r }]: duel courts, class houses), veil (veilFalls anchors() or null) }.
   Returns { pts: [{ k, x, y, z, ph, sa, sb, r, h, cyc, floor, ground, size, trail, tint, site, reach }], sites: [...], wind: [x, z] }. */
export function ambientPlan(src, tier) {
  tier = String(tier || 'HIGH').toUpperCase(); var out = { pts: [], sites: [], tier: tier }; if (tier === 'LOW' || !src || !src.reg) return out;
  var reg = src.reg, HI = tier !== 'MED', r = rnd(0x20260927), G = src.ground || function () { return 0; }, pts = out.pts, shapes = src.shapes || ambientHostShapes(reg, src.trees);
  var wind = (reg.sky && reg.sky.wind) || {}, wa = (isFinite(+wind.dir_deg) ? +wind.dir_deg : 28) * Math.PI / 180, WD = [Math.sin(wa), Math.cos(wa)]; out.wind = WD;   /* sky.js: the registry wind travels (sin, cos) of dir_deg */
  var avoid = (src.avoid || []).slice(), RF = src.ridge === false ? null : ridgeFaceTop(reg);   /* in the reach, the ridge's inner face (its collision surface) is ground too */
  function blocked(F) { var S = capsuleSamples(F); for (var j = 0; j < S.length; j++) for (var i = 0; i < avoid.length; i++) if (Math.hypot(S[j][0] - avoid[i].x, S[j][1] - avoid[i].z) < avoid[i].r + F.rad) return true; return false; }
  /* place a point: in the reach its FLOOR is the highest ground or host shape under the whole footprint + 3.4 m + a margin (a structure
     under it drops the point); its anchor is lifted so the motion never meets the floor (pollen sinks INTO the fade band above it) */
  function put(p, site, gOverride) { var F = ambientFootprint(p, WD), reach = capsuleReach(F) <= AMBIENT_REACH_M, gm;
    if (reach) { if (blocked(F)) return false; var FG = footprintGround(F, G, shapes, RF); if (FG.shapes - FG.terrain > STRUCTURE_M) return false; gm = FG.top; }
    else gm = gOverride !== undefined ? gOverride : footprintGround(F, G, null, null).top;
    var fl = gm + (reach ? AMBIENT_CLEAR_M + FLOOR_MARGIN_M : 0.5);
    p.y = Math.max(p.y, fl + F.down + (p.k === 1 ? -p.h + 1.6 : 0.15)); p.floor = +fl.toFixed(3); p.ground = +gm.toFixed(3); p.reach = reach; p.site = site;
    if (p.ph === undefined) p.ph = r(); if (p.sa === undefined) p.sa = r(); if (p.sb === undefined) p.sb = r(); if (p.trail === undefined) p.trail = 0; pts.push(p); return true; }
  function moth(m, site, tl, gOverride) { if (!put(Object.assign(m, { trail: 0 }), site, gOverride)) return false; var M0 = pts[pts.length - 1]; for (var q = 1; q < tl; q++) pts.push(Object.assign({}, M0, { trail: q })); return true; }   /* the trail points replay the head's path a moment behind */
  var T = AMBIENT_TINT, ZF = (reg.tree_lock && reg.tree_lock.zone_family) || {}, TL = HI ? 4 : 2;
  function mote(x, y, z) { return { k: 0, x: x, y: y, z: z, r: 4 + r() * 3, h: 1.4 + r() * 1.4, cyc: 48 + r() * 36, size: 0.3 + r() * 0.12, tint: T.white }; }
  function frag(x, y, z, tint, shape) { return { k: 3, x: x, y: y, z: z, r: 3 + r() * 3, h: 1.2 + r() * 1.2, cyc: 70 + r() * 50, size: 0.6 + r() * 0.45, tint: tint, trail: shape }; }   /* M20 AURA FRAGMENTS (owner: 'tiny crystalline motes … small rhombuses, cubes, circular / soft aura forms … not pickups'): shape 0 rhombus, 1 cube, 2 soft ring — aTr carries the shape */
  function fcl(cx, cy, cz, tints, n, site, gOv) { var ph = r(), cyc = 70 + r() * 50, cr = 3 + r() * 3, ch = 1.2 + r() * 1.2, got = 0;   /* M20 lead review: one lone shape in the sky read as a pickup — fragments drift as a loose little constellation (one lead shape, smaller shards round it) sharing one slow path, each with its own meander and turn */
    for (var q = 0; q < n; q++) { var a = r() * 6.2832, d = q ? 0.8 + r() * 1.8 : 0, p = frag(cx + Math.cos(a) * d, cy + (q ? (r() - 0.5) * 2.4 : 0), cz + Math.sin(a) * d, tints[q % tints.length], Math.floor(r() * 2.999));
      p.size = q ? 0.3 + r() * 0.35 : 0.6 + r() * 0.3; p.ph = ph; p.cyc = cyc; p.r = cr; p.h = ch; if (put(p, site, gOv)) got++; } return got; }
  /* 1. THE CLASS GROVES (in the reach): motes in the open air of the grove — over the canopy against the sky, and in the gaps and clearings
     between the crowns (inside a crown they would only be hidden by its leaves) — pollen off a few crystal tips, moths round the outside of
     a few crowns at night */
  var trees = src.trees || [], byZone = {}; trees.forEach(function (t) { (byZone[t.zone] = byZone[t.zone] || []).push(t); });
  (reg.zones || []).filter(function (z) { return z.kind === 'FOREST'; }).forEach(function (Z) {
    var list = byZone[Z.id] || []; if (!list.length) return; var fam = ZF[Z.id] || (Z.family !== 'forest' ? Z.family : 'white'), tint = T[fam] || T.white, rc = Z.rect || {}, area = Math.max(1, (rc.x2 - rc.x1) * (rc.z2 - rc.z1));
    var S = { site: Z.id, family: fam, motes: 0, pollen: 0, moths: 0 }, i, tries, t, g, a, q;
    function tree() { return list[Math.floor(r() * list.length)]; }
    function th(t) { return Math.max(9, Math.min(15, 10.9 * (+t.scale || 1))); }   /* the forest's crown height law (forest.heightFor, architecture's canopy anchors) */
    var nm = Math.round(Math.max(10, Math.min(34, area / 150)) * (HI ? 1 : 0.5));
    for (i = 0, tries = 0; i < nm && tries < nm * 4; tries++) { var over = r() < 0.55; t = tree(); var mx = over ? t.x + (r() - 0.5) * 8 : rc.x1 + r() * (rc.x2 - rc.x1), mz = over ? t.z + (r() - 0.5) * 8 : rc.z1 + r() * (rc.z2 - rc.z1); g = G(mx, mz);
      if (put(mote(mx, g + (over ? th(t) + 1 + r() * 6 : 4.5 + r() * 5), mz), Z.id)) { i++; S.motes++; } }   /* over the canopy, or anywhere in the grove's air (the floor law lifts a mote over a trunk) */
    var np = Math.min(HI ? 8 : 4, Math.max(2, Math.ceil(list.length / 4))), ng = HI ? 4 : 3;
    for (i = 0, tries = 0; i < np && tries < np * 4; tries++) { t = tree(); g = G(t.x, t.z); var h0 = th(t), placed = 0;
      for (q = 0; q < ng; q++) { a = r() * 6.2832; if (put({ k: 1, x: t.x + Math.cos(a) * 1.8, y: g + h0 * (0.86 + r() * 0.12), z: t.z + Math.sin(a) * 1.8, r: 3 + r() * 3, h: 2.2 + r() * 1.6, cyc: 17 + r() * 12, size: 0.17 + r() * 0.05, tint: tint }, Z.id)) { placed++; S.pollen++; } }
      if (placed) i++; }
    var nmo = Math.max(3, Math.min(8, Math.round(list.length / 4)));
    for (i = 0, tries = 0; i < nmo && tries < nmo * 4; tries++) { t = tree(); g = G(t.x, t.z); a = r() * 6.2832;
      var mr = 4.6 + r() * 1.6;   /* just outside the crown's rim */
      if (moth({ k: 2, x: t.x + Math.cos(a) * mr, y: g + th(t) * (0.45 + r() * 0.25), z: t.z + Math.sin(a) * mr, r: 1.4 + r() * 1.0, h: 1.0 + r() * 0.8, cyc: 0.8 + r() * 0.5, size: 1.0, tint: tint, ph: 0 }, Z.id, TL)) { i++; S.moths++; } }
    var nf = Math.max(1, Math.round(Math.max(2, Math.min(4, area / 1000)) * (HI ? 1 : 0.5))), got; S.fragments = 0;
    for (i = 0, tries = 0; i < nf && tries < nf * 4; tries++) { t = tree(); var fx = t.x + (r() - 0.5) * 12, fz = t.z + (r() - 0.5) * 12; g = G(fx, fz);
      got = fcl(fx, g + th(t) + 3 + r() * 6, fz, [tint], 3, Z.id); if (got) { i++; S.fragments += got; } }   /* the grove's own class light, over its crowns */
    out.sites.push(S); });
  /* 1b. THE SHARED CIVIC PLAZA (the Nexus, in the reach): a few pearl fragments with GOLD, CRIMSON, PINK and the odd BLUE among them high in
     the plaza air (owner 2026-09-28: gold / crimson / pink memorable, blue not dominant; purple stays VISIONARY's — none here) */
  var NX = ((reg.regions && reg.regions.list) || []).filter(function (R) { return R.id === 'NEXUS'; })[0], NS = NX && NX.shape && NX.shape.kind === 'CIRCLE' ? NX.shape : null;
  if (NS) { var S3 = { site: 'NEXUS', family: 'shared', fragments: 0 }, pl = [[T.gold, T.gold, T.white], [T.pink, T.white, T.pink], [T.red, T.red, T.white], [T.gold, T.white], [T.pink, T.pink, T.white], [T.red, T.white], [T.blue, T.white]], nfp = HI ? 7 : 4, jj, tr2, gn;
    for (jj = 0, tr2 = 0; jj < nfp && tr2 < nfp * 5; tr2++) { var fa = r() * 6.2832, fr = NS.r * (0.2 + 0.75 * Math.sqrt(r())), px = NS.x + Math.cos(fa) * fr, pz = NS.z + Math.sin(fa) * fr;
      gn = fcl(px, G(px, pz) + 8 + r() * 10, pz, pl[jj % pl.length], HI ? 4 : 3, 'NEXUS'); if (gn) { jj++; S3.fragments += gn; } }
    out.sites.push(S3); }
  /* 2. THE VEIL HIGHLAND (beyond the reach): motes over the lanes; moths in the gardens round the benches and over the lane beds at night —
     the five classes in turn (the highland is every class's) */
  var V = src.veil; if (V && V.paths && V.paths.length) { var S2 = { site: 'VEIL', family: 'five', motes: 0, moths: 0 }, lanes = [], j, L, u, lx, lz, ly, cls = [T.gold, T.blue, T.red, T.purple, T.pink], ci = 0;
    V.paths.forEach(function (Pa) { (Pa.pts || []).forEach(function (p, k) { if (k > 0) lanes.push({ p: p, q: Pa.pts[k - 1], hw: Pa.hw || 1.2 }); }); });
    var nvm = HI ? 40 : 20, nvo = HI ? 14 : 7, nvb = HI ? 12 : 6, benches = (V.benches || []).concat(V.looks || []);
    for (j = 0; j < nvm && lanes.length; j++) { L = lanes[Math.floor(r() * lanes.length)]; u = r(); lx = L.q.x + (L.p.x - L.q.x) * u; lz = L.q.z + (L.p.z - L.q.z) * u; ly = L.q.y + (L.p.y - L.q.y) * u;
      if (put(mote(lx + (r() - 0.5) * 8, ly + 3.2 + r() * 5, lz + (r() - 0.5) * 8), 'VEIL', ly)) S2.motes++; }
    for (j = 0; j < nvo && lanes.length; j++) { L = lanes[Math.floor(r() * lanes.length)]; u = r(); var dx = L.p.x - L.q.x, dz = L.p.z - L.q.z, dl = Math.hypot(dx, dz) || 1, sd = r() < 0.5 ? -1 : 1, off = L.hw + 1.2 + r() * 1.2;
      lx = L.q.x + dx * u - dz / dl * off * sd; lz = L.q.z + dz * u + dx / dl * off * sd; ly = L.q.y + (L.p.y - L.q.y) * u;
      if (moth({ k: 2, x: lx, y: ly + 1.8 + r() * 1.2, z: lz, r: 1.2 + r() * 0.9, h: 0.7 + r() * 0.5, cyc: 0.8 + r() * 0.5, size: 0.9, tint: cls[ci % 5], ph: 0 }, 'VEIL', TL, ly)) { S2.moths++; ci++; } }
    var vf2 = [T.gold, T.pink, T.red, T.white, T.blue]; S2.fragments = 0; for (j = 0; j < (HI ? 5 : 3) && lanes.length; j++) { L = lanes[Math.floor(r() * lanes.length)]; u = r(); lx = L.q.x + (L.p.x - L.q.x) * u; lz = L.q.z + (L.p.z - L.q.z) * u; ly = L.q.y + (L.p.y - L.q.y) * u;
      S2.fragments += fcl(lx + (r() - 0.5) * 10, ly + 4 + r() * 6, lz + (r() - 0.5) * 10, [vf2[j % 5], vf2[j % 5], T.white], 3, 'VEIL', ly); }
    for (j = 0; j < nvb && benches.length; j++) { var B = benches.splice(Math.floor(r() * benches.length), 1)[0], ba = r() * 6.2832, bd = 2 + r() * 2.5;
      if (moth({ k: 2, x: B.x + Math.cos(ba) * bd, y: B.y + 1.8 + r() * 1.2, z: B.z + Math.sin(ba) * bd, r: 1.2 + r() * 1.0, h: 0.7 + r() * 0.5, cyc: 0.8 + r() * 0.5, size: 0.9, tint: cls[ci % 5], ph: 0 }, 'VEIL', TL, B.y)) { S2.moths++; ci++; } }
    out.sites.push(S2); }
  return out;
}

/* the clearance report the host-safety check reads: for each point inside the reach, its floor (the shader clamps it there) above the
   highest ground under its footprint — must be ≥ 3.4 m. `ground` / `shapes` may be stricter than the plan's (e.g. every host collider). */
export function ambientSafe(pts, wd, ground, shapes) { return pts.filter(function (p) { return p.reach; }).map(function (p) { var F = ambientFootprint(p, wd), g = ground ? footprintGround(F, ground, shapes).top : p.ground; return { k: p.k, site: p.site, x: +p.x.toFixed(1), z: +p.z.toFixed(1), clear_m: +(p.floor - g).toFixed(2), lowest_anchor_m: +(p.y - F.down - g).toFixed(2) }; }); }

var VERT = [
  'attribute vec4 aK; attribute vec4 aD; attribute vec4 aC; attribute float aTr;',   /* aK: kind, phase, seed a, seed b · aD: drift / orbit radius (m), vertical range (m), cycle (s) or moth pace, FLOOR (y) · aC: display tint + size (m) · aTr: moth trail index */
  'uniform float uTime; uniform float uNight; uniform float uVH; uniform vec2 uWind; uniform vec3 uKey; uniform vec3 uDayL; uniform vec3 uNightL;',
  'varying vec3 vC; varying float vA; varying float vMoth; varying float vPs; varying float vFrag; varying float vShape; varying float vRot; varying float vOp;',
  'void main() { float k = floor(aK.x + 0.5), ph = aK.y, sa = aK.z * 6.2832, sb = aK.w * 6.2832, t = uTime, env = 1.0, glint = 1.0, u;',
  '  vec3 p = position, wd = vec3(uWind.x, 0.0, uWind.y), sd = vec3(-uWind.y, 0.0, uWind.x);',
  '  if (k < 0.5) { u = fract(ph + t / aD.z); p += wd * ((u - 0.5) * 2.0 * aD.x) + sd * (sin(t * 0.11 + sa) * aD.x * 0.3); p.y += aD.y * (0.5 * sin(t * 0.083 + sb) + 0.125 * (2.0 * u - 1.0));',   /* MOTE: one slow pass down-wind, a lazy meander */
  '    env = smoothstep(0.0, 0.22, u) * (1.0 - smoothstep(0.78, 1.0, u)); }',
  '  else if (k < 1.5) { u = fract(ph + t / aD.z); p += wd * (u * aD.x) + sd * (sin(t * 0.37 + sa) * 0.35); p.y -= aD.y * u;',   /* POLLEN: shed at a crystal tip, sinking down-wind */
  '    env = smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.55, 1.0, u)); glint = 0.55 + 0.45 * sin(t * 1.7 + sa * 7.0); }',   /* a grain turning in the light */
  '  else if (k > 2.5) { u = fract(ph + t / aD.z); p += wd * ((u - 0.5) * 2.0 * aD.x) + sd * (sin(t * 0.07 + sa) * aD.x * 0.3); p.y += aD.y * 0.5 * sin(t * 0.061 + sb);',   /* FRAGMENT: a slower mote that turns */
  '    env = smoothstep(0.0, 0.18, u) * (1.0 - smoothstep(0.82, 1.0, u)); glint = 0.85 + 0.15 * sin(t * 0.9 + sa * 5.0); }',
  '  else { float tt = (t - aTr * 0.2) * aD.z;',   /* MOTH: a slow looping wander round its plant; the trail points replay the path a moment behind */
  '    p += vec3(aD.x * (0.72 * sin(tt * 0.29 + sa) + 0.28 * sin(tt * 0.77 + sb)), aD.y * 0.5 * sin(tt * 0.21 + sb * 1.4) + 0.06 * sin(tt * 8.0 + sa * 3.0), aD.x * (0.72 * cos(tt * 0.25 + sb) + 0.28 * sin(tt * 0.69 + sa)));',
  '    env = pow(max(0.0, 1.0 - aTr * 0.26), 2.0); glint = 0.82 + 0.18 * sin(t * 1.3 + sa * 3.0); }',
  '  env *= smoothstep(aD.w, aD.w + 0.9, p.y); p.y = max(p.y, aD.w);',   /* HOST LAW: never below the floor — faded out before it, held at it */
  '  vec4 mv = viewMatrix * vec4(p, 1.0); float d = length(mv.xyz), far = k > 1.5 ? (k > 2.5 ? 140.0 : 180.0) : 110.0;',
  '  env *= smoothstep(1.5, 6.0, d) * (1.0 - smoothstep(far * 0.5, far, d));',   /* faint toward the camera (never in anyone\'s face), gone with distance */
  '  float sc = pow(max(dot((p - cameraPosition) / max(d, 1e-3), uKey), 0.0), 7.0);',   /* forward scattering: the air glints toward the key light */
  '  vec3 lv3 = mix(uDayL, uNightL, uNight); float lv = k < 0.5 ? lv3.x : (k < 1.5 ? lv3.y : (k > 2.5 ? mix(0.95, 1.1, uNight) : lv3.z));',
  '  float lit = k > 2.5 ? mix(1.15, 1.0, uNight) + mix(1.4, 0.5, uNight) * sc : (k > 1.5 ? 1.0 : mix(0.22, 0.55, uNight) + mix(2.8, 1.0, uNight) * sc);',   /* a fragment carries a little of its own aura light, so it reads faintly by day too */   /* motes / pollen are lit by the key; a moth makes its own light */
  '  float px = aC.a * projectionMatrix[1][1] * 0.5 * uVH / max(-mv.z, 0.1), ps = k > 2.5 ? clamp(px, 5.0, 20.0) : (k > 1.5 ? clamp(px, 5.0, 28.0) : clamp(px, 1.6, 8.0));',
  '  vA = env * glint * lv * lit * (k > 1.5 ? min(1.0, px / ps) : min(1.0, px * px / (ps * ps))); vC = aC.rgb; vMoth = (k > 1.5 && k < 2.5) ? 1.0 : 0.0; vFrag = k > 2.5 ? 1.0 : 0.0; vShape = aTr; vRot = t * (0.18 + 0.12 * aK.z) + sa; vOp = k > 2.5 ? env * min(1.0, px / ps) : 0.0;',   /* dust held at its minimum size keeps its energy; a far moth stays a point of light */
  '  if (vA < 0.004 || mv.z > -0.1) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }',
  '  vPs = ps; gl_PointSize = ps; gl_Position = projectionMatrix * mv; }'
].join('\n');
var FRAG = [
  'uniform float uNight; varying vec3 vC; varying float vA; varying float vMoth; varying float vPs; varying float vFrag; varying float vShape; varying float vRot; varying float vOp;',
  'void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float r2 = dot(q, q); if (r2 > 1.0) discard;',
  '  if (vFrag > 0.5) { float cs = cos(vRot), sn = sin(vRot); vec2 w = vec2(cs * q.x - sn * q.y, sn * q.x + cs * q.y); float m, f, e;',   /* an AURA FRAGMENT: a small crystalline shape of the aura language, turning slowly, softly edged — m its cover, f the facet light, e the lit edge */
  '    if (vShape < 0.5) { float d = abs(w.x) * 1.55 + abs(w.y); m = 1.0 - smoothstep(0.74, 0.9, d); f = w.x + 0.35 * w.y < 0.0 ? 1.0 : 0.55; e = smoothstep(0.58, 0.8, d) * m; }',   /* rhombus: a lit and a shaded facet, a bright rim */
  '    else if (vShape < 1.5) { float hx = max(abs(w.x) * 0.866 + abs(w.y) * 0.5, abs(w.y)); m = 1.0 - smoothstep(0.62, 0.74, hx); f = w.y > abs(w.x) * 0.577 ? 1.0 : (w.x < 0.0 ? 0.66 : 0.42); e = smoothstep(0.5, 0.66, hx) * m; }',   /* cube: a lit top face over two shaded sides */
  '    else { float rr = length(w); m = 0.7 * exp(-pow((rr - 0.5) / 0.22, 2.0)) + 0.2 * exp(-rr * rr * 4.0); f = 1.0; e = 0.5 * exp(-pow((rr - 0.5) / 0.17, 2.0)); }',   /* soft aura ring — M20 lead self-review: the crisp thin ring read as an 'O' icon (a pickup marker) at full size (V06); a wide soft halo with a faint fill reads as an aura form */
  '    float al = m * vOp * mix(0.62, 0.3, uNight);',   /* M20 (lead review 2026-09-28: pure light vanished against the bright storm-calm sky): the body covers a little of what lies behind it, so the class colour reads by day; by night the light edge carries it */
  '    vec3 body = vC * f * mix(0.95, 0.3, uNight), glow = vC / max(max(vC.r, vC.g), max(vC.b, 1e-3)) * (e * mix(0.55, 0.95, uNight) + f * mix(0.12, 0.34, uNight)) * vA;',   /* by night a fragment glows softly from within — the class tint at full brightness, never eased toward white (crimson + white reads pink) */
  '    gl_FragColor = vec4(body * al + glow, al); return; }',
  '  float core = exp(-r2 * mix(7.0, 18.0, smoothstep(6.0, 20.0, vPs))), a = mix(exp(-r2 * 5.0), core + 0.26 * exp(-r2 * 3.5), vMoth) * (1.0 - r2);',   /* a soft point of light; a moth: a bright core in a wide faint halo (a far moth's core fills more of its small sprite: a point of light, not a smudge) */
  '  vec3 c = mix(vC, mix(vec3(1.0), vC, 0.3), vMoth * core);',   /* the moth core burns near-white, its halo keeps the class colour */
  '  gl_FragColor = vec4(c * a * vA, 0.0); }'
].join('\n');

/* The runtime: reads the other modules' published data (the forest placement, the Veil's anchors) and draws the plan. opts: ground (x, z) → y,
   avoid, key (night) → the key light direction, shapes () → host shapes (default ambientHostShapes). */
export function createAmbientMagic(ctx, opts) {
  opts = opts || {}; var THREE = ctx.THREE, log = ctx.log || function () { }, night = !!ctx.night, pts = null, mesh = null, geo = null, mat = null, U = null, plan = null, info = { points: 0, draws: 0 };
  function tier() { try { return ctx.quality && ctx.quality.tier ? String(ctx.quality.tier()).toUpperCase() : 'HIGH'; } catch (e) { return 'HIGH'; } }
  function build() { var tq = tier(); info.tier = tq; if (tq === 'LOW') { log('ambient magic: LOW tier — not built (0 draws)'); return; }
    var reg = ctx.registry || {}, vf = ctx.mods && ctx.mods.veilFalls, veil = null; try { veil = vf && vf.anchors ? vf.anchors() : null; } catch (e) { veil = null; }
    plan = ambientPlan({ reg: reg, trees: ctx.forestPlacement || [], ground: opts.ground || function () { return 0; }, shapes: opts.shapes ? opts.shapes() : ambientHostShapes(reg, ctx.forestPlacement || []), veil: veil, avoid: opts.avoid || [] }, tq); pts = plan.pts; var n = pts.length; info.points = n; info.sites = plan.sites; if (!n) return;
    var P = new Float32Array(n * 3), K = new Float32Array(n * 4), D = new Float32Array(n * 4), C = new Float32Array(n * 4), TR = new Float32Array(n);
    pts.forEach(function (p, i) { P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z; K[i * 4] = p.k; K[i * 4 + 1] = p.ph; K[i * 4 + 2] = p.sa; K[i * 4 + 3] = p.sb; D[i * 4] = p.r; D[i * 4 + 1] = p.h; D[i * 4 + 2] = p.cyc; D[i * 4 + 3] = p.floor;
      C[i * 4] = (p.tint >> 16 & 255) / 255; C[i * 4 + 1] = (p.tint >> 8 & 255) / 255; C[i * 4 + 2] = (p.tint & 255) / 255; C[i * 4 + 3] = p.size; TR[i] = p.trail; });   /* display-space tint: this raw shader writes gl_FragColor unconverted (auraForms M19) */
    geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('aK', new THREE.Float32BufferAttribute(K, 4)); geo.setAttribute('aD', new THREE.Float32BufferAttribute(D, 4)); geo.setAttribute('aC', new THREE.Float32BufferAttribute(C, 4)); geo.setAttribute('aTr', new THREE.Float32BufferAttribute(TR, 1));
    var key = opts.key || function () { return [0.7, 0.5, 0.4]; };
    U = { uTime: { value: 0 }, uNight: { value: night ? 1 : 0 }, uVH: { value: 720 }, uWind: { value: new THREE.Vector2(plan.wind[0], plan.wind[1]) }, uKey: { value: new THREE.Vector3().fromArray(key(night)).normalize() },
      uDayL: { value: new THREE.Vector3(0.25, 0.35, 0.0) }, uNightL: { value: new THREE.Vector3(1.35, 1.1, 1.0) } };   /* per kind (mote, pollen, moth): dimmer by day than by night; moths only at night */
    mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U, transparent: true, depthWrite: false, depthTest: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, toneMapped: false });   /* premultiplied: motes / pollen / moths write alpha 0 (pure added light, exactly the old additive draw); a fragment's body writes its cover */
    mesh = new THREE.Points(geo, mat); mesh.name = 'WORLD_AMBIENT_MAGIC'; mesh.frustumCulled = false; mesh.renderOrder = 12.5; mesh.userData.noMerge = true; mesh.userData.nonInteractable = true;
    var vs = new THREE.Vector2(); mesh.onBeforeRender = function (renderer) { renderer.getDrawingBufferSize(vs); U.uVH.value = vs.y; };   /* the point scale follows the real buffer (phones render at 1–2x DPR) */
    ctx.group.add(mesh); info.draws = 1;
    log('ambient magic: ' + n + ' points in one draw (' + plan.sites.map(function (s) { return s.site; }).join(', ') + ')'); }
  function tick(dt, t) { if (U) U.uTime.value = t || 0; }
  function setNight(n) { night = !!n; if (U) { U.uNight.value = night ? 1 : 0; if (opts.key) U.uKey.value.fromArray(opts.key(night)).normalize(); } }
  function dispose() { if (mesh && mesh.parent) mesh.parent.remove(mesh); if (geo) geo.dispose(); if (mat) mat.dispose(); mesh = geo = mat = U = null; pts = null; info.points = 0; info.draws = 0; }
  function debug() { var by = [0, 0, 0, 0], lo = Infinity; (pts || []).forEach(function (p) { by[p.k]++; }); ambientSafe(pts || [], plan && plan.wind).forEach(function (c) { lo = Math.min(lo, c.clear_m); });
    return { tier: info.tier, draws: info.draws, points: info.points, motes: by[0], pollen: by[1], moth_points: by[2], fragments: by[3], sites: info.sites || [], min_clear_in_reach_m: isFinite(lo) ? lo : null }; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug, plan: function () { return plan; } };
}
