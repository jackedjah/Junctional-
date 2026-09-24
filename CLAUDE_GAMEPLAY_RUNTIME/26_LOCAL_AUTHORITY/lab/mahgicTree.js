/* MAHWORLD :: MAHGIC TREE FAMILY (master §14 — the P7 botanical prototype; node/JS only, no Blender, no Tripo)
   One authored, rooted, hip-height, multi-level branching tree: planting bed → root lobes → short tapered trunk → primary limbs → secondary
   branches → twigs, with lenticular crystalline leaves attached to the terminal branches and RESTRAINED integrated energy (emissive veins that
   brighten toward the tips + a few luminous gem nodes), all of it a physical silhouette with the energy off. Every branch is a tapered tube
   along a quadratic curve; every junction is closed with a sphere of the parent's radius (clean rounded junctions, no seams); every branch end
   is capped. The hierarchy depth is AUTHORED (4 levels, counts bounded), never recursive-unbounded. Three seeded variants share three materials,
   so a cluster costs 9 instanced draw calls whatever its size. Gentle sway and a slow pulse run in the shared shaders (per-instance phase from
   the instance position: no synchronized clone motion, no per-frame random jitter, no per-leaf logic). Decorative: no collider, no interaction,
   no eco-effects (U16). SCALE (master §14.3): the reference body is dev_0.14 ATHLETE_M_V9 in its neutral grounded pose — the PELVIS joint sits
   0.765 m and the femoral-head (THIGH) joint 0.835 m above the body's lowest point (fused, grounded: hoverLift = 0); the normal specimen's crown
   top is authored at 0.80 m with ±0.06 m authored variation, i.e. inside the hip band. */
import { TREE_SPEC } from './assets/botany/tree_spec.js';
export { TREE_SPEC };

function makeRng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; var f = function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (var w = 0; w < 12; w++) f();   /* warm-up: a small seed's first draws are all near 0 */ return f; }

/* ---- triangle-soup accumulator: position / normal / color / aGlow (one per material per variant; no uv, no index) ---- */
function Soup() { this.p = []; this.n = []; this.c = []; this.g = []; this.tris = 0; }
Soup.prototype.tri = function (a, b, c, na, nb, nc, col, glow) { var p = this.p, n = this.n, cc = this.c, g = this.g; p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); n.push(na[0], na[1], na[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2]); for (var i = 0; i < 3; i++) { cc.push(col[0], col[1], col[2]); g.push(glow); } this.tris++; };
Soup.prototype.flatTri = function (a, b, c, col, glow) { var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; var l = Math.hypot(nx, ny, nz) || 1; var nn = [nx / l, ny / l, nz / l]; this.tri(a, b, c, nn, nn, nn, col, glow); };
Soup.prototype.geometry = function (THREE) { var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); geo.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.g, 1)); geo.computeBoundingBox(); geo.computeBoundingSphere(); return geo; };

function v3(x, y, z) { return [x, y, z]; } function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; } function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; } function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; } function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; } function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; } function len(a) { return Math.hypot(a[0], a[1], a[2]); } function norm(a) { var l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function bez(p0, p1, p2, t) { var u = 1 - t; return add(add(mul(p0, u * u), mul(p1, 2 * u * t)), mul(p2, t * t)); }
function bezTan(p0, p1, p2, t) { return norm(add(mul(sub(p1, p0), 2 * (1 - t)), mul(sub(p2, p1), 2 * t))); }
/* rotate v about unit axis k by angle a (Rodrigues) */
function rot(v, k, a) { var c = Math.cos(a), s = Math.sin(a); return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))); }
function perp(t) { var ref = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; return norm(cross(ref, t)); }

/* tapered tube along the quadratic curve p0→p2 (control p1); radius r0→r1; smooth ring normals; parallel-transported frame */
function tube(soup, p0, p1, p2, r0, r1, segs, radial, colFn, glow0, glow1) {
  var rings = []; var n = null;
  for (var i = 0; i <= segs; i++) { var t = i / segs; var c = bez(p0, p1, p2, t), tg = bezTan(p0, p1, p2, t); if (!n) n = perp(tg); else { n = norm(sub(n, mul(tg, dot(n, tg)))); } var b = cross(tg, n); var r = r0 + (r1 - r0) * t; var ring = []; for (var k = 0; k < radial; k++) { var a = k / radial * Math.PI * 2; var nn = add(mul(n, Math.cos(a)), mul(b, Math.sin(a))); ring.push({ p: add(c, mul(nn, r)), n: nn, t: t }); } rings.push(ring); }
  for (var i2 = 0; i2 < segs; i2++) { var A = rings[i2], B = rings[i2 + 1]; var cA = colFn(A[0].t), cB = colFn(B[0].t), gA = glow0 + (glow1 - glow0) * A[0].t, gB = glow0 + (glow1 - glow0) * B[0].t; for (var k2 = 0; k2 < radial; k2++) { var k3 = (k2 + 1) % radial; var a0 = A[k2], a1 = A[k3], b0 = B[k2], b1 = B[k3]; soup.tri(a0.p, b1.p, b0.p, a0.n, b1.n, b0.n, cA, gA); soup.tri(a0.p, a1.p, b1.p, a0.n, a1.n, b1.n, cB, gB);   /* CCW seen from outside: (a0, b1, b0) — t × (t × n) = −n, so the naive (a0, b0, b1) order faces inward */ } }
  return rings;
}
function sphere(soup, c, r, col, glow, ws, hs, shadeFn) { ws = ws || 8; hs = hs || 6; var pts = []; for (var j = 0; j <= hs; j++) { var ph = j / hs * Math.PI; var row = []; for (var i = 0; i <= ws; i++) { var th = i / ws * Math.PI * 2; var nn = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)]; row.push({ p: add(c, mul(nn, r)), n: nn }); } pts.push(row); }
  for (var j2 = 0; j2 < hs; j2++) for (var i2 = 0; i2 < ws; i2++) { var a = pts[j2][i2], b = pts[j2][i2 + 1], d = pts[j2 + 1][i2], e = pts[j2 + 1][i2 + 1]; var cc = shadeFn ? shadeFn(a.n, col) : col; if (j2 > 0) soup.tri(a.p, b.p, d.p, a.n, b.n, d.n, cc, glow); if (j2 < hs - 1) soup.tri(b.p, e.p, d.p, b.n, e.n, d.n, cc, glow); } }
/* an authored lenticular leaf: 10-point outline, a raised midrib on both faces (closed, two-sided solid — no DoubleSide material); local: base at the
   origin, tip at +Z (length L), width along X, thickness along Y; placed by a frame (origin, forward, up) */
function leaf(soup, o, fwd, up, L, W, th, colFront, colBack, glow) { var side = norm(cross(up, fwd)); up = norm(cross(fwd, side));
  var outline = [[0, 0], [0.34, 0.16], [0.5, 0.40], [0.44, 0.66], [0.24, 0.87], [0, 1], [-0.24, 0.87], [-0.44, 0.66], [-0.5, 0.40], [-0.34, 0.16]];
  var P = function (x, y, z) { return add(add(add(o, mul(side, x * W)), mul(up, y)), mul(fwd, z * L)); };
  var cf = P(0, th, 0.46), cb = P(0, -th, 0.46);
  for (var i = 0; i < outline.length; i++) { var a = outline[i], b = outline[(i + 1) % outline.length]; var pa = P(a[0], 0, a[1]), pb = P(b[0], 0, b[1]); soup.flatTri(cf, pb, pa, colFront, glow); soup.flatTri(cb, pa, pb, colBack, glow); } }
function gem(soup, c, r, col, glow, yaw) { var h = r * 1.7; var ax = [Math.cos(yaw) * r, 0, Math.sin(yaw) * r], az = [-Math.sin(yaw) * r, 0, Math.cos(yaw) * r]; var top = add(c, [0, h, 0]), bot = add(c, [0, -h, 0]); var ring = [add(c, ax), add(c, az), sub(c, ax), sub(c, az)]; for (var i = 0; i < 4; i++) { var a = ring[i], b = ring[(i + 1) % 4]; soup.flatTri(top, b, a, col, glow); soup.flatTri(bot, a, b, col, glow); } }

/* ---- one seeded specimen → three soups (branches / leaves / gems) + stats. All lengths in metres, y up, base at the origin. ---- */
export function buildTreeVariant(THREE, spec, seed, opts) {
  var rnd = makeRng(seed); var S = spec || TREE_SPEC; var H = S.crown_top_m + (rnd() - 0.5) * 2 * S.crown_variation_m; var FAR = !!(opts && opts.far); var LF = S.lod_far || {}; var RS = FAR ? (LF.radial_scale || 0.6) : 1;   /* far LOD: same seed sequence up to the twigs so the silhouette matches; fewer radial segments; twigs / mid leaves / gems dropped */
  var br = new Soup(), lf = new Soup(), gm = new Soup(); var stats = { seed: seed, crown_top_m: 0, primaries: 0, secondaries: 0, twigs: 0, leaves: 0, gems: 0, roots: 0, junctions: 0, levels: 4 };
  var WHITE = [1, 1, 1]; var shade = function (k) { return [k, k, k]; };
  /* planting bed (dark mineral substrate) — a low bevelled disc the roots grip; the bed belongs to the ground, not a floating gem base */
  var bedR = S.bed_radius_m, bedH = 0.018; var bedCol = shade(0.24), bedTop = shade(0.3); var NB = 14;
  for (var i = 0; i < NB; i++) { var a0 = i / NB * Math.PI * 2, a1 = (i + 1) / NB * Math.PI * 2; var o0 = [Math.cos(a0) * bedR, 0.001, Math.sin(a0) * bedR], o1 = [Math.cos(a1) * bedR, 0.001, Math.sin(a1) * bedR]; var t0 = [Math.cos(a0) * bedR * 0.8, bedH, Math.sin(a0) * bedR * 0.8], t1 = [Math.cos(a1) * bedR * 0.8, bedH, Math.sin(a1) * bedR * 0.8]; br.flatTri(o0, t0, t1, bedCol, 0); br.flatTri(o0, t1, o1, bedCol, 0); br.flatTri([0, bedH, 0], t1, t0, bedTop, 0.03); }   /* bed wall / top: (o0, t0, t1) = up × (up + dθ·e_θ) → outward; top = r1 × r0 → +y */
  /* trunk: short, substantial, tapered, a gentle lean (no rod) */
  var lean = rnd() * Math.PI * 2; var trunkH = H * S.trunk_fraction; var leanM = trunkH * 0.12; var tTop = [Math.cos(lean) * leanM, trunkH, Math.sin(lean) * leanM]; var tCtl = [Math.cos(lean) * leanM * 0.2, trunkH * 0.55, Math.sin(lean) * leanM * 0.2];
  var trunkR0 = S.trunk_radius_m, trunkR1 = trunkR0 * 0.62; var trunkCol = function (t) { return shade(0.46 + 0.54 * Math.min(1, t * 1.5)); };   /* dark recess at the base, platinum above */
  tube(br, [0, 0.005, 0], tCtl, tTop, trunkR0, trunkR1, 7, Math.max(5, Math.round(10 * RS)), trunkCol, 0.04, 0.16);
  /* root lobes: tapered, arching from the trunk foot over the bed and into it (a visible, refined footing) */
  var nRoots = 5; for (var r = 0; r < nRoots; r++) { var ra = r / nRoots * Math.PI * 2 + (rnd() - 0.5) * 0.5; var rl = bedR * (0.72 + rnd() * 0.3); var rEnd = [Math.cos(ra) * rl, trunkR0 * 0.16 + 0.002, Math.sin(ra) * rl]; var rCtl = [Math.cos(ra) * rl * 0.45, 0.05 + rnd() * 0.02, Math.sin(ra) * rl * 0.45]; tube(br, [Math.cos(ra) * trunkR0 * 0.45, 0.02, Math.sin(ra) * trunkR0 * 0.45], rCtl, rEnd, trunkR0 * 0.5, trunkR0 * 0.16, 5, 7, function (t) { return shade(0.6 + 0.2 * t); }, 0.04, 0.02); sphere(br, rEnd, trunkR0 * 0.16, shade(0.7), 0.02, 6, 4); stats.roots++; }
  /* crown junction: the trunk top is closed by a sphere the limbs grow out of */
  sphere(br, tTop, trunkR1 * 1.0, shade(0.92), 0.16, 10, 7, function (n, c) { return n[1] < 0 ? shade(0.55) : c; }); stats.junctions++;
  var terminals = [];   /* {p, tg, r, level} — every branch end that receives leaves / gems */
  function branch(level, o, dir, L, r0, r1, glow0, glow1, upBias) {
    var ctl = add(add(o, mul(dir, L * 0.5)), mul([0, 1, 0], L * upBias)); var end = add(add(o, mul(dir, L)), mul([0, 1, 0], L * upBias * 1.15));
    var rings = tube(br, o, ctl, end, r0, r1, level === 1 ? 6 : level === 2 ? 5 : 4, Math.max(4, Math.round((level === 1 ? 9 : level === 2 ? 7 : 6) * RS)), function (t) { return shade(0.86 + 0.14 * t); }, glow0, glow1);
    sphere(br, end, r1, shade(1), glow1, 6, 4);   /* rounded end cap */
    return { o: o, ctl: ctl, end: end, r0: r0, r1: r1, rings: rings, dir: dir, L: L, at: function (t) { return bez(o, ctl, end, t); }, tan: function (t) { return bezTan(o, ctl, end, t); }, rad: function (t) { return r0 + (r1 - r0) * t; } };
  }
  /* primary limbs: from believable junctions staggered along the upper trunk, spread in azimuth, curving upward */
  var nPri = S.primaries_min + Math.floor(rnd() * (S.primaries_max - S.primaries_min + 1)); var priList = []; var azBase = rnd() * Math.PI * 2;
  for (var p = 0; p < nPri; p++) { var az = azBase + p / nPri * Math.PI * 2 + (rnd() - 0.5) * 0.7; var el = S.primary_elevation_rad[0] + rnd() * (S.primary_elevation_rad[1] - S.primary_elevation_rad[0]); var tOn = p === 0 ? 1 : 0.7 + 0.3 * rnd(); var oP = tOn >= 0.999 ? tTop : bez([0, 0.005, 0], tCtl, tTop, tOn); var dir = norm([Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)]); var Lp = (H - trunkH) * (S.primary_length_fraction[0] + rnd() * (S.primary_length_fraction[1] - S.primary_length_fraction[0])); var rP = trunkR1 * (0.7 + rnd() * 0.08);
    if (tOn < 0.999) { sphere(br, oP, (trunkR0 + (trunkR1 - trunkR0) * tOn) * 1.0, shade(0.9), 0.14, 8, 6, function (n, c) { return n[1] < -0.2 ? shade(0.55) : c; }); stats.junctions++; }
    var B = branch(1, oP, dir, Lp, rP, rP * 0.5, 0.16, 0.4, 0.22); priList.push(B); stats.primaries++;
    /* secondary branches: 2–3 per limb at staggered stations, turning away from the parent in azimuth and lifting */
    var nSec = 2 + (rnd() < 0.55 ? 1 : 0); var stations = [0.52, 0.78, 1.0].slice(0, nSec); if (nSec === 2) stations = [0.58, 1.0];
    stations.forEach(function (ts, si) { var oS = ts >= 0.999 ? B.end : B.at(ts); var tg = B.tan(ts); var sideSign = (si % 2 === 0 ? 1 : -1) * (rnd() < 0.5 ? 1 : -1); var dS = rot(tg, [0, 1, 0], sideSign * (0.5 + rnd() * 0.4)); dS = norm(add(dS, [0, 0.15 + rnd() * 0.15, 0])); var Ls = Lp * (S.secondary_length_fraction[0] + rnd() * (S.secondary_length_fraction[1] - S.secondary_length_fraction[0])); var rS = B.rad(ts) * 0.66;
      if (ts < 0.999) { sphere(br, oS, B.rad(ts) * 1.0, shade(0.92), 0.3, 7, 5, function (n, c) { return n[1] < -0.3 ? shade(0.58) : c; }); stats.junctions++; }
      var C = branch(2, oS, dS, Ls, rS, rS * 0.5, 0.4, 0.72, 0.18); stats.secondaries++;
      /* twigs: 1–2 per secondary — the leafy terminals */
      var nTw = 1 + (rnd() < 0.35 ? 1 : 0); var tst = nTw === 2 ? [0.62, 1.0] : [1.0];
      tst.forEach(function (tt, ti) { var oT = tt >= 0.999 ? C.end : C.at(tt); var tgT = C.tan(tt); var dT = rot(tgT, [0, 1, 0], (ti === 0 ? -1 : 1) * (0.5 + rnd() * 0.5)); dT = norm(add(dT, [0, 0.35, 0])); var Lt = Ls * (S.twig_length_fraction[0] + rnd() * (S.twig_length_fraction[1] - S.twig_length_fraction[0])); var rT = C.rad(tt) * 0.62;
        if (FAR && LF.twigs === false) return;   /* far LOD: the twig level is dropped (its random draws above are still consumed so the seed sequence matches the near variant) */
        if (tt < 0.999) { sphere(br, oT, C.rad(tt) * 1.0, shade(0.94), 0.6, 6, 4); stats.junctions++; }
        var D = branch(3, oT, dT, Lt, rT, Math.max(0.0032, rT * 0.5), 0.72, 1.0, 0.16); stats.twigs++; terminals.push({ p: D.end, tg: D.tan(1), r: D.r1, level: 3, mid: D.at(0.55), midTg: D.tan(0.55) }); });
      terminals.push({ p: C.end, tg: C.tan(1), r: C.r1, level: 2, mid: C.at(0.8), midTg: C.tan(0.8), secondaryEnd: true }); [0.42, 0.66].forEach(function (tm, mi) { terminals.push({ p: C.at(tm), tg: rot(C.tan(tm), [0, 1, 0], (mi === 0 ? 1 : -1) * 1.1), r: C.rad(tm), level: 1, alongBranch: true }); }); });
  }
  /* leaves: clustered, layered, attached to the terminal branches; a coherent outward/upward growth direction, front / back faces differ */
  var leafFront = [1, 1, 1], leafBack = [0.68, 0.74, 0.8]; var Lleaf = S.leaf_length_m, Wleaf = S.leaf_width_m; var leafOrigins = [];   /* every leaf's attachment point (tests prove attachment against the branch soup) */
  terminals.forEach(function (T) { var n = T.level === 3 ? 4 : T.alongBranch ? (rnd() < 0.75 ? 1 : 0) : 3; if (FAR) { if (T.alongBranch && LF.mid_leaves === false) n = 0; else n = Math.round(n * (LF.terminal_leaf_fraction === undefined ? 0.5 : LF.terminal_leaf_fraction)); } var up0 = norm(sub([0, 1, 0], mul(T.tg, dot([0, 1, 0], T.tg)))); if (len(up0) < 1e-3) up0 = perp(T.tg);
    for (var k = 0; k < n; k++) { var spread = n === 1 ? (rnd() - 0.5) * 0.4 : (k - (n - 1) / 2) * (1.15 / (n - 1)) * 0.95 + (rnd() - 0.5) * 0.18;   /* a fan ±55° about the branch direction: leaves point outward along the growth, not up like petals */ var fwd = rot(T.tg, up0, spread); var tilt = (k % 2 === 0 ? 0.22 : -0.06) + (rnd() - 0.5) * 0.12; fwd = norm(add(fwd, mul(up0, tilt))); var up = norm(sub(up0, mul(fwd, dot(up0, fwd)))); var o = add(T.p, mul(T.tg, -T.r * 0.6)); var sc = 0.86 + rnd() * 0.3; leaf(lf, o, fwd, up, Lleaf * sc, Wleaf * sc, 0.0055 * sc, leafFront, leafBack, 0.6); leafOrigins.push(o); stats.leaves++; }
    if (T.mid && rnd() < 0.45) { var upM = perp(T.midTg); var fwdM = norm(add(rot(T.midTg, upM, (rnd() < 0.5 ? 1 : -1) * 0.9), [0, 0.3, 0])); var upM2 = norm(sub([0, 1, 0], mul(fwdM, fwdM[1]))); leaf(lf, T.mid, fwdM, upM2, Lleaf * 0.9, Wleaf * 0.9, 0.005, leafFront, leafBack, 0.5); leafOrigins.push(T.mid); stats.leaves++; } });
  /* gems: a few luminous nodes — at some twig tips and on the crown junction (restrained: not every tip) */
  terminals.forEach(function (T) { if (T.level === 3 && rnd() < S.gem_tip_fraction) { if (FAR && LF.gems === false) return; gem(gm, add(T.p, mul(T.tg, T.r * 0.8)), S.gem_radius_m, [1, 1, 1], 1, rnd() * Math.PI); stats.gems++; } });
  if (!(FAR && LF.gems === false)) { gem(gm, add(tTop, [0, trunkR1 * 1.03 + S.gem_radius_m * 1.2, 0]), S.gem_radius_m * 1.25, [1, 1, 1], 0.8, rnd() * Math.PI); stats.gems++; }
  /* exact fit: the authored crown target is met by one uniform correction of the built specimen (recorded), so the hip-band claim is measured, not assumed */
  var topY = 0; [br, lf, gm].forEach(function (sp) { for (var i = 1; i < sp.p.length; i += 3) if (sp.p[i] > topY) topY = sp.p[i]; }); var fit = H / topY; [br, lf, gm].forEach(function (sp) { for (var i = 0; i < sp.p.length; i++) sp.p[i] *= fit; }); leafOrigins = leafOrigins.map(function (o) { return mul(o, fit); }); stats.fit_scale = +fit.toFixed(4); stats.authored_crown_m = +H.toFixed(4);
  var out = { branches: br.geometry(THREE), leaves: lf.geometry(THREE), gems: gm.geometry(THREE) };
  var box = out.branches.boundingBox.clone().union(out.leaves.boundingBox).union(out.gems.boundingBox); stats.crown_top_m = +box.max.y.toFixed(4); stats.width_m = +Math.max(box.max.x - box.min.x, box.max.z - box.min.z).toFixed(3); stats.base_min_y = +box.min.y.toFixed(4);
  stats.tris = { branches: br.tris, leaves: lf.tris, gems: gm.tris, total: br.tris + lf.tris + gm.tris }; stats.lod = FAR ? 'far' : 'near'; out.stats = stats; out.box = box; out.leafOrigins = leafOrigins; return out;
}

/* ---- the family: shared materials + shader life, instanced placement, energy toggle, read-outs ---- */
export function createMahgicTreeFamily(THREE, opts) {
  opts = opts || {}; var S = opts.spec || TREE_SPEC; var DAY = !opts.night; var group = new THREE.Group(); group.name = 'MAHGIC_TREES'; group.userData.noMerge = true;
  var U = { uTime: { value: 0 }, uEnergy: { value: 1 }, uSway: { value: S.sway_amplitude_m }, uFlutter: { value: S.leaf_flutter_m }, uHeight: { value: S.crown_top_m }, uSwayDir: { value: new THREE.Vector2(0.78, 0.62) } };
  var variants = []; for (var v = 0; v < S.variant_seeds.length; v++) variants.push(buildTreeVariant(THREE, S, S.variant_seeds[v]));
  function hook(mat, kind) {   /* sway (height-weighted, per-instance phase) for everything; veins (aGlow) only on the branches; a slow restrained pulse everywhere */
    mat.onBeforeCompile = function (shader) { Object.keys(U).forEach(function (k) { shader.uniforms[k] = U[k]; });
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime, uSway, uFlutter, uHeight, uEnergy; uniform vec2 uSwayDir; varying float vPulse;' + (kind === 'branch' ? '\nattribute float aGlow; varying float vGlow;' : ''))
        .replace('#include <begin_vertex>', ['vec3 transformed = vec3( position );', '#ifdef USE_ALPHAHASH', '\tvPosition = vec3( position );', '#endif',
          '#ifdef USE_INSTANCING', 'float mwPh = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831853;', '#else', 'float mwPh = 0.0;', '#endif',
          'float mwH = clamp(transformed.y / uHeight, 0.0, 1.0); mwH *= mwH;', 'float mwS = sin(uTime * 0.9 + mwPh) * 0.62 + sin(uTime * 1.63 + mwPh * 1.31) * 0.38;', 'transformed.xz += uSwayDir * (uSway * mwH * mwS);',
          kind === 'leaf' ? 'transformed.y += uFlutter * mwH * sin(uTime * 2.3 + mwPh + transformed.x * 40.0);' : '',
          'vPulse = mix(1.0, 0.78 + 0.22 * sin(uTime * 0.7 + mwPh), 1.0) * uEnergy;', kind === 'branch' ? 'vGlow = aGlow;' : ''].join('\n'));
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vPulse;' + (kind === 'branch' ? ' varying float vGlow;' : ''))
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vPulse' + (kind === 'branch' ? ' * vGlow' : '') + ';'); };
    mat.customProgramCacheKey = function () { return 'mahgic_tree_' + kind + '_v1'; }; return mat; }
  var M = {
    branch: hook(new THREE.MeshStandardMaterial({ color: S.branch_color, metalness: 0.86, roughness: 0.36, vertexColors: true, emissive: S.energy_color, emissiveIntensity: DAY ? S.energy_day : S.energy_night, envMapIntensity: 1 }), 'branch'),
    leaf: hook(new THREE.MeshStandardMaterial({ color: S.leaf_color, metalness: 0.42, roughness: 0.26, vertexColors: true, emissive: S.energy_color, emissiveIntensity: DAY ? S.energy_day * 0.45 : S.energy_night * 0.5, flatShading: true, envMapIntensity: 1 }), 'leaf'),
    gem: hook(new THREE.MeshStandardMaterial({ color: S.gem_color, metalness: 0.55, roughness: 0.14, vertexColors: true, emissive: S.energy_color, emissiveIntensity: DAY ? S.energy_day * 1.6 : S.energy_night * 1.3, flatShading: true, envMapIntensity: 1 }), 'gem')
  };
  var meshes = []; var placed = []; var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
  var api = {
    group: group, variants: variants, materials: M, uniforms: U, spec: S,
    /* place instances from a registry list [{id, variant, x, z, y, yaw_deg, scale}] — idempotent: a second call with the same list replaces, never accumulates (U14) */
    place: function (list) { api.clearInstances(); placed = (list || []).map(function (e) { return { id: e.id, variant: Math.max(0, Math.min(variants.length - 1, e.variant | 0)), x: +e.x || 0, y: +e.y || 0, z: +e.z || 0, yaw: (+e.yaw_deg || 0) * Math.PI / 180, scale: +e.scale || 1, role: e.role || '' }; });
      variants.forEach(function (V, vi) { var mine = placed.filter(function (e) { return e.variant === vi; }); if (!mine.length) return; ['branches', 'leaves', 'gems'].forEach(function (part) { var mat = part === 'branches' ? M.branch : part === 'leaves' ? M.leaf : M.gem; var im = new THREE.InstancedMesh(V[part], mat, mine.length); im.name = 'MAHGIC_TREE_' + vi + '_' + part; im.castShadow = part !== 'gems'; im.receiveShadow = false; im.userData.noMerge = true; im.userData.botany = { variant: vi, part: part };
        mine.forEach(function (e, k) { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), e.yaw); pos.set(e.x, e.y, e.z); scl.setScalar(e.scale); m4.compose(pos, q, scl); im.setMatrixAt(k, m4); }); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); group.add(im); meshes.push(im); }); }); return api.info(); },
    clearInstances: function () { meshes.forEach(function (im) { group.remove(im); im.dispose(); }); meshes = []; placed = []; },
    setEnergy: function (on) { U.uEnergy.value = on === false ? 0 : 1; }, energy: function () { return U.uEnergy.value > 0; },
    tick: function (dt, t) { U.uTime.value = t; },
    /* read-out: what is placed (identity / count / bounds), the geometry budget, the draw calls, the scale record */
    info: function () { var inst = placed.map(function (e) { var V = variants[e.variant]; var top = V.box.max.y * e.scale; var rad = Math.max(V.box.max.x, -V.box.min.x, V.box.max.z, -V.box.min.z) * e.scale; return { id: e.id, variant: e.variant, role: e.role, x: e.x, y: e.y, z: e.z, yaw_deg: +(e.yaw * 180 / Math.PI).toFixed(1), scale: e.scale, crown_top_m: +top.toFixed(3), radius_m: +rad.toFixed(3) }; });
      var tris = placed.reduce(function (s, e) { return s + variants[e.variant].stats.tris.total; }, 0); var byPart = { branches: 0, leaves: 0, gems: 0 }; placed.forEach(function (e) { var t = variants[e.variant].stats.tris; byPart.branches += t.branches; byPart.leaves += t.leaves; byPart.gems += t.gems; });
      return { family: 'MAHGIC_TREE', spec_version: S.version, instances: inst.length, list: inst, draw_calls: meshes.length, tris_placed: tris, tris_placed_by_part: byPart, shadow_casting_tris: byPart.branches + byPart.leaves, visible: group.visible, energy: U.uEnergy.value > 0, variants: variants.map(function (V) { return V.stats; }), scale_reference: S.scale_reference }; },
    dispose: function () { api.clearInstances(); variants.forEach(function (V) { V.branches.dispose(); V.leaves.dispose(); V.gems.dispose(); }); Object.keys(M).forEach(function (k) { M[k].dispose(); }); }
  };
  return api;
}
