/* MAHWORLD :: RIG MEASUREMENT (reusable method — lab/rig_profile.json step 1 and 2)
   Cross-section landmark finding for any humanoid class mesh. NO per-character constants live here: every landmark is a
   measured feature of the mesh (a bulge peak, the narrowest section BETWEEN two bulges, a section centre), so a new body
   reuses the method without inheriting another body's proportions.
   Axes: glTF, Y up, character standing with feet at min Y. Heights are fractions of total height H.
   The same method was cross-checked in Blender (lab/assets/rig_solve_blender.py) on the exported rig: identical elbow /
   wrist / knee heights, which is why Blender is not needed to build an asset. */

/* Mean radius of a horizontal section about its own centroid, in `bands` slices between lo and hi (fractions of H).
   (A median centre/radius was tried and rejected: on the dense fused lower body it tracks one leg half and moves the knee
   5 cm into the calf, disagreeing with the independent Blender measurement of the same mesh.) Sparse thin limbs make a single
   band unreliable, so joints are only accepted when the narrowing survives a half-band shift — see stableExtrema. */
export function profile(pts, lo, hi, bands) {
  var rows = [];
  for (var b = 0; b < bands; b++) {
    var a = lo + (hi - lo) * b / bands, c = lo + (hi - lo) * (b + 1) / bands, sel = [];
    for (var i = 0; i < pts.length; i++) { var p = pts[i]; if (p.h >= a && p.h < c) sel.push(p); }
    if (sel.length < 5) { rows.push({ h: 0.5 * (a + c), r: null, n: sel.length }); continue; }
    var cx = 0, cz = 0; for (var k = 0; k < sel.length; k++) { cx += sel[k].x; cz += sel[k].z; } cx /= sel.length; cz /= sel.length;
    var r = 0; for (var k2 = 0; k2 < sel.length; k2++) { var dx = sel[k2].x - cx, dz = sel[k2].z - cz; r += Math.sqrt(dx * dx + dz * dz); }
    rows.push({ h: 0.5 * (a + c), r: r / sel.length, n: sel.length, cx: cx, cz: cz });
  }
  return rows;
}
/* A narrowing is only a joint if it is still there when the bands are shifted by half a band. Returns the minima of the
   primary profile that are confirmed by the shifted one, each carrying the vertex support behind it. */
export function stableExtrema(pts, lo, hi, bands, dir) {
  var bw = (hi - lo) / bands;
  var a = smooth(profile(pts, lo, hi, bands)), b = smooth(profile(pts, lo + 0.5 * bw, hi + 0.5 * bw, bands));
  var ea = localExtrema(a, dir), eb = localExtrema(b, dir);
  var stable = ea.filter(function (r) { return eb.some(function (q) { return Math.abs(q.h - r.h) <= 0.85 * bw; }); });
  return { rows: a, all: ea, stable: stable, band_width: bw, shifted: eb };
}
export function peak(rows, lo, hi) { var best = null; rows.forEach(function (r) { if (r.r !== null && r.h >= lo && r.h <= hi && (!best || r.r > best.r)) best = r; }); return best; }
export function valley(rows, lo, hi) { var best = null; rows.forEach(function (r) { if (r.r !== null && r.h >= lo && r.h <= hi && (!best || r.r < best.r)) best = r; }); return best; }
/* the joint is the narrowest section BETWEEN two bulges — never a fixed fraction of the limb, never the surface */
export function between(rows, a, b, margin) {
  if (!a || !b) return null; var m = margin === undefined ? 0.012 : margin;
  var lo = Math.min(a.h, b.h) + m, hi = Math.max(a.h, b.h) - m; if (hi <= lo) { lo = Math.min(a.h, b.h); hi = Math.max(a.h, b.h); }
  return valley(rows, lo, hi);
}
/* 3-tap smoothing so single-band mesh noise cannot invent a joint */
export function smooth(rows) {
  return rows.map(function (r, i) {
    if (r.r === null) return r;
    var a = rows[i - 1] && rows[i - 1].r !== null ? rows[i - 1].r : r.r, b = rows[i + 1] && rows[i + 1].r !== null ? rows[i + 1].r : r.r;
    return { h: r.h, r: 0.25 * a + 0.5 * r.r + 0.25 * b, n: r.n, cx: r.cx, cz: r.cz, raw: r.r };
  });
}
/* local maxima (dir 1) or minima (dir -1) of the smoothed profile */
export function localExtrema(rows, dir) {
  var out = [];
  for (var i = 1; i < rows.length - 1; i++) {
    var p = rows[i - 1], c = rows[i], n = rows[i + 1];
    if (p.r === null || c.r === null || n.r === null) continue;
    if (dir > 0 ? (c.r >= p.r && c.r >= n.r && (c.r > p.r || c.r > n.r)) : (c.r <= p.r && c.r <= n.r && (c.r < p.r || c.r < n.r))) out.push(c);
  }
  return out;
}
export function pickNear(list, target, tol) {
  var best = null, bd = Infinity;
  list.forEach(function (r) { var d = Math.abs(r.h - target); if (d < bd && d <= tol) { bd = d; best = r; } });
  return best;
}
/* centre of the section at height h (average of the section extremes, not of the vertices: a dense side must not pull the axis) */
export function sectionCentre(pts, h, half) {
  var hw = half === undefined ? 0.018 : half, sel = [];
  for (var pass = 0; pass < 3 && !sel.length; pass++) { var w = hw * (1 + pass * 1.5); sel = pts.filter(function (p) { return Math.abs(p.h - h) <= w; }); }
  if (!sel.length) return null;
  var xs = sel.map(function (p) { return p.x; }), zs = sel.map(function (p) { return p.z; }), ys = sel.map(function (p) { return p.y; });
  return { x: 0.5 * (Math.min.apply(null, xs) + Math.max.apply(null, xs)), y: ys.reduce(function (s, v) { return s + v; }, 0) / ys.length, z: 0.5 * (Math.min.apply(null, zs) + Math.max.apply(null, zs)) };
}

/* arm / torso separation in |x|, measured from the vertex-density profile of the waist–chest band.
   An empty-bin gap only exists when the arms hang clear of the body (the Athlete); on the Titan, Bage and Lean bodies the
   arms touch, so the separation is the density MINIMUM walked inward from the arm mass — the first local minimum below a
   quarter of the arm peak. Returns the threshold in source units plus the evidence used. */
export function measureArmThreshold(pts, shoulderHW, lo, hi) {
  var BW = 0.005 * (shoulderHW / 0.163) || 0.005, band = pts.filter(function (p) { return p.h >= (lo || 0.42) && p.h < (hi || 0.60); });
  var nb = Math.max(20, Math.ceil(shoulderHW * 1.3 / BW)), bins = new Array(nb).fill(0);
  band.forEach(function (p) { var k = Math.floor(Math.abs(p.x) / BW); if (k < nb) bins[k]++; });
  var sm = bins.map(function (_, i) { return ((bins[i - 1] || 0) + bins[i] + (bins[i + 1] || 0)) / 3; });
  var pk = 0, pki = nb - 1; for (var i = Math.floor(0.55 * shoulderHW / BW); i < nb; i++) { if (sm[i] > pk) { pk = sm[i]; pki = i; } }
  var thr = 0.25 * pk, j = pki, found = -1;
  while (j > 2) {
    if (sm[j] < thr) { if (sm[j - 1] >= sm[j]) { found = j; break; } }
    j--;
  }
  if (found < 0) found = Math.max(3, Math.round(0.62 * shoulderHW / BW));
  return { armT: (found + 0.5) * BW, arm_peak_x: (pki + 0.5) * BW, arm_peak_density: pk, min_density: sm[found], bin_width: BW };
}

/* ---- full body landmark pass ---------------------------------------------------------------------------------
   pts: [{x,y,z,h}] of the whole body · armT: measured arm/torso |x| separation · opts.bands tunes resolution only */
export function measureBody(pts, armT, opts) {
  opts = opts || {}; var out = { arms: {}, legs: {} };
  var shSel0 = pts.filter(function (p) { return p.h >= 0.74 && p.h <= 0.86; });
  var shHW = shSel0.length ? Math.max.apply(null, shSel0.map(function (p) { return Math.abs(p.x); })) : 0.16;
  if (!armT) { var at = measureArmThreshold(pts, shHW); armT = at.armT; out.arm_threshold_evidence = at; }
  out.arm_threshold_x = armT;
  var torsoPts = pts.filter(function (p) { return Math.abs(p.x) < armT; });
  /* shoulder band: widest slice of the torso column between 0.74 and 0.86 */
  var shRows = profile(torsoPts, 0.70, 0.90, 20), shPeak = peak(shRows, 0.74, 0.86);
  out.shoulder_h = shPeak ? shPeak.h : 0.78;
  var shSel = pts.filter(function (p) { return p.h >= 0.74 && p.h <= 0.86; });
  out.shoulder_half_width = shSel.length ? Math.max.apply(null, shSel.map(function (p) { return Math.abs(p.x); })) : armT;
  var chestSel = torsoPts.filter(function (p) { return p.h >= 0.62 && p.h <= 0.72; }).map(function (p) { return Math.abs(p.x); }).sort(function (a, b) { return a - b; });
  out.chest_half_width = chestSel.length ? chestSel[Math.floor(0.55 * (chestSel.length - 1))] : armT * 0.8;
  /* neck: narrowest section of the head/torso column */
  var nRows = profile(torsoPts.filter(function (p) { return Math.abs(p.x) < out.chest_half_width * 1.2; }), 0.78, 0.94, 16);
  var nV = valley(nRows, 0.82, 0.90); out.neck_h = nV ? nV.h : 0.87; out.neck_radius = nV ? nV.r : null;
  var headSel = pts.filter(function (p) { return p.h >= 0.90 && p.h <= 0.97; });
  out.head_half_width = headSel.length ? Math.max.apply(null, headSel.map(function (p) { return Math.abs(p.x); })) : out.chest_half_width;

  /* arms: a hanging arm's radius profile rises monotonically toward the shoulder, so a joint is a LOCAL narrowing, not the
     global minimum of a window. Find the local extrema, then disambiguate with the arm's own proportions (elbow ≈ 0.36 and
     wrist ≈ 0.66 of shoulder→fingertip): the measured extremum nearest the expected station wins, and the station itself is
     only used when the profile shows no narrowing there at all. Both are reported, so a fit can be audited per character. */
  ['L', 'R'].forEach(function (S) {
    var sgn = S === 'L' ? -1 : 1;
    var ap = pts.filter(function (p) { return p.x * sgn > armT && p.h >= 0.20 && p.h <= out.shoulder_h + 0.06; });
    if (ap.length < 60) { out.arms[S] = null; return; }
    var lowest = Math.min.apply(null, ap.map(function (p) { return p.h; }));
    var rows = profile(ap, lowest, out.shoulder_h + 0.05, Math.max(18, opts.armBands || 30));
    var top = out.shoulder_h + 0.05, span = top - lowest;
    var stMin = stableExtrema(ap, lowest, top, Math.max(18, opts.armBands || 30), -1);
    var stMax = stableExtrema(ap, lowest, top, Math.max(18, opts.armBands || 30), 1);
    var sm = stMin.rows, maxima = stMax.stable, minima = stMin.stable;
    var valid = sm.filter(function (r) { return r.r !== null; });
    var topRow = valid[valid.length - 1];
    /* shoulder joint: inside the humeral head, one arm-radius below the top of the arm mass — never the deltoid surface */
    var HU = opts.H || 1;
    var armDerived = topRow ? topRow.h - 0.9 * topRow.r / HU : null;
    /* the arm column is only captured up to the shoulder when the arms hang clear; when they touch the body the |x| test
       truncates them, so the arm-derived height is only trusted while the arm mass actually reaches above the shoulder
       girdle, and it is always held inside a band around the measured girdle (widest torso slice). */
    var girdle = out.shoulder_h, trust = topRow && (topRow.h - girdle) > 0.02;
    var shoulderJoint = trust ? Math.max(girdle - 0.02, Math.min(girdle + 0.015, armDerived)) : girdle;
    var delt = pickNear(maxima, shoulderJoint, 0.10 * span) || peak(sm, top - 0.25 * span, top);
    var armLen = shoulderJoint - lowest;
    var elbowPred = shoulderJoint - 0.36 * armLen, wristPred = shoulderJoint - 0.66 * armLen;
    var elbow = pickNear(minima, elbowPred, 0.14 * armLen), wrist = pickNear(minima, wristPred, 0.14 * armLen);
    var fore = elbow && wrist ? peak(sm, wrist.h + 0.01, elbow.h - 0.005) : null;
    var hand = wrist ? peak(sm, lowest, wrist.h - 0.01) : null;
    out.arms[S] = {
      lowest_h: lowest, arm_top_h: topRow ? topRow.h : top, arm_top_r: topRow ? topRow.r : null,
      shoulder_joint_h: shoulderJoint, shoulder_source: trust ? 'arm_mass_top_minus_radius' : 'shoulder_girdle_band', shoulder_arm_derived_h: armDerived, deltoid_h: delt ? delt.h : shoulderJoint, deltoid_r: delt ? delt.r : null,
      elbow_h: elbow ? elbow.h : elbowPred, elbow_r: elbow ? elbow.r : null, elbow_source: elbow ? 'measured_narrowing' : 'proportional_station',
      wrist_h: wrist ? wrist.h : wristPred, wrist_r: wrist ? wrist.r : null, wrist_source: wrist ? 'measured_narrowing' : 'proportional_station',
      elbow_station_h: elbowPred, wrist_station_h: wristPred,
      stable_minima_h: minima.map(function (r) { return +r.h.toFixed(4); }), unstable_minima_h: stMin.all.filter(function (r) { return minima.indexOf(r) < 0; }).map(function (r) { return +r.h.toFixed(4); }),
      elbow_support_verts: elbow ? elbow.n : null, wrist_support_verts: wrist ? wrist.n : null,
      forearm_bulge_h: fore ? fore.h : null, hand_bulge_h: hand ? hand.h : null, rows: sm, pts: ap
    };
  });
  /* legs / fused lower body: hip origin → knee valley between the hip mass and the calf bulge → tip */
  var lowSel = pts.filter(function (p) { return Math.abs(p.x) < armT && p.h < (opts.crotch || 0.40) + 0.02; });
  if (lowSel.length > 60) {
    var lowest2 = Math.min.apply(null, lowSel.map(function (p) { return p.h; })), topL = (opts.crotch || 0.40);
    var rowsL = profile(lowSel, lowest2, topL + 0.01, Math.max(16, opts.legBands || 24));
    var hipPk = peak(rowsL, topL - 0.07, topL + 0.01);
    var calf = peak(rowsL, lowest2 + 0.06 * (topL - lowest2), topL - 0.35 * (topL - lowest2));
    var knee = between(rowsL, hipPk, calf);
    out.legs = { hip_h: topL, knee_h: knee ? knee.h : null, knee_r: knee ? knee.r : null, calf_bulge_h: calf ? calf.h : null, tip_h: lowest2, rows: rowsL };
  }
  return out;
}

/* symmetrise heights across sides (a body authored symmetric must animate symmetric; centres stay per side) */
export function symmetriseArms(m) {
  var a = m.arms.L, b = m.arms.R; if (!a || !b) return m;
  ['shoulder_joint_h', 'deltoid_h', 'elbow_h', 'forearm_bulge_h', 'wrist_h', 'hand_bulge_h', 'arm_top_h'].forEach(function (k) {
    if (a[k] !== null && b[k] !== null) { var v = 0.5 * (a[k] + b[k]); a[k] = v; b[k] = v; }
  });
  return m;
}
