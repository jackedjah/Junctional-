/* MAHWORLD :: FAR WORLD (convergence PASS 2b — sky / far-background scale illusion, owner addendum 2026-09-17)
   Three readable depth layers around the playable district, in the MAHWORLD language (platinum, crystal, diamond-family prisms, cool sky):
     · MID  (230–330 m from the plaza, the empty southern / lateral sectors only): a few elevated crystal walkway arcs between low platforms and
            mid-distance prism towers — lit, fogged naturally, real geometry (MeshStandard, flat shading).
     · FAR  (620–860 m): a ring of crystalline massifs and a few world-scale spires (up to 260 m) — unlit silhouettes with baked facet tones,
            colours MIXED toward the horizon haze by distance (atmospheric perspective authored per vertex, fog OFF: the structure stays readable).
     · HAZE (250–890 m): a flat platinum-haze plain so the district ground never ends at a hard edge below the massifs.
   Everything is merged (3 draw calls), static, no colliders (far outside the 600 m room), inside the 900 m camera far plane.
   Nothing here copies a reference asset; no near-field clutter is added. createFarWorld(THREE, { night, seed }) -> THREE.Group */
export function createFarWorld(THREE, opts) {
  var o = opts || {}; var NIGHT = !!o.night; var seed = o.seed || 91; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var group = new THREE.Group(); group.name = 'MAHWORLD_FAR_WORLD'; group.userData.noMerge = true;   /* already merged: the static-world merger leaves it alone */
  var haze = new THREE.Color(NIGHT ? 0x2a4363 : 0x8fb0d0), plat = new THREE.Color(NIGHT ? 0x3b4c66 : 0x5f7893), crystal = new THREE.Color(NIGHT ? 0x4a6390 : 0x7fa0c2);   /* owner B7 §8 / §10 F (2026-09-20): a DEPTH HIERARCHY — darker steel / sapphire bases, mixed toward the atmosphere's horizon haze by distance AND by height (thicker air low), so the massifs step back in blue-grey silhouettes instead of flat white cutouts */
  var sunDir = new THREE.Vector3(26, 34, 14).normalize();
  /* WORLD PIVOT PASS 2b: BOTH palettes are baked (index 0 = day, 1 = night) and the vertex colours are swapped live by group.userData.setNight —
     the in-game time toggle never rebuilds the field, and these unlit, fog-free silhouettes kept their daylight caps glowing in a night sky. */
  var PAL = [{ haze: 0x8fb0d0, pHaze: 0xc3d8f2, rockLit: 0xd8cfc2, rockShade: 0x5c6380, cap: 0xf4f6fb, base: 0x4a5068, midPlat: 0x9fb0c2, midCrystal: 0xb4cde6, ringIn: 0x2a3341, ringOut: 0xb9c8d6 },
             { haze: 0x2a4363, pHaze: 0x252a55, rockLit: 0x4f4c7c, rockShade: 0x1b1d3a, cap: 0x77739f, base: 0x141629, midPlat: 0x55657e, midCrystal: 0x5d7aa6, ringIn: 0x141a24, ringOut: 0x1e2c42 }];
  function pair(k) { return [new THREE.Color(PAL[0][k]), new THREE.Color(PAL[1][k])]; } function pmap(p2, fn) { return [fn(p2[0].clone(), 0), fn(p2[1].clone(), 1)]; }
  var hazeP = pair('haze');
  /* ---------- helpers: merge cone / prism pieces into one geometry with vertex colours ---------- */
  function pushGeo(acc, geo, matrix, colorP, facet, hazeTop) { geo = geo.toNonIndexed(); geo.applyMatrix4(matrix); geo.computeVertexNormals(); var p = geo.attributes.position, n = geo.attributes.normal; var tmpC = new THREE.Color(); for (var i = 0; i < p.count; i++) { var tone = 1; if (facet) { var lam = n.getX(i) * sunDir.x + n.getY(i) * sunDir.y + n.getZ(i) * sunDir.z; tone = 0.8 + 0.18 * Math.max(0, lam) + (n.getY(i) > 0.8 ? 0.04 : 0); }   /* never brighter than the horizon sky: a far massif is a SILHOUETTE in blue-grey */ var hy = hazeTop ? Math.max(0, Math.min(1, p.getY(i) / hazeTop)) : 1; for (var s2 = 0; s2 < 2; s2++) { var c = tmpC.copy(colorP[s2]); if (hazeTop) c.lerp(hazeP[s2], 0.42 * (1 - hy)); (s2 ? acc.colN : acc.colD).push(c.r * tone, c.g * tone, c.b * tone); }   /* aerial perspective by height: the base of a massif sits in thicker air than its peak */ acc.pos.push(p.getX(i), p.getY(i), p.getZ(i)); if (acc.nrm) acc.nrm.push(n.getX(i), n.getY(i), n.getZ(i)); } }
  function finish(acc, material) { var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3)); var cD = new Float32Array(acc.colD), cN = new Float32Array(acc.colN); g.setAttribute('color', new THREE.Float32BufferAttribute(NIGHT ? cN.slice() : cD.slice(), 3)); g.userData.colDay = cD; g.userData.colNight = cN; if (acc.nrm) g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.nrm, 3)); g.computeBoundingSphere(); var m = new THREE.Mesh(g, material); m.frustumCulled = false; m.matrixAutoUpdate = false; return m; }
  var M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), T = new THREE.Vector3(); var Y = new THREE.Vector3(0, 1, 0);
  function place(x, y, z, ry, sx, sy, sz) { Q.setFromAxisAngle(Y, ry); S.set(sx, sy, sz); T.set(x, y, z); return M4.compose(T, Q, S); }
  /* ---------- FAR: rocky massifs + world-scale spires. WORLD PIVOT PASS 2 (owner 2026-09-25: premium world, no flat paper mountains):
     every peak is a noise-displaced cone (12 × 6) with BAKED facet light from the registry Sun direction — warm light-stone on lit faces,
     cool lavender-grey in shadow, pale crystal-white caps on the high upward faces — then aerial perspective toward the daylight horizon
     haze by distance and by height (thicker air low). Neutral rock only (colour law); still unlit, fog-free and ONE merged draw call. */
  var far = { pos: [], colD: [], colN: [] }; var N = 40;
  var pSun = new THREE.Vector3(26, 19, 14).normalize(); var pHaze = pair('pHaze');
  var rockLit = pair('rockLit'), rockShade = pair('rockShade'), capCol = pair('cap'), baseCol = pair('base');
  function hsh(n) { var v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
  function vnoise(x, y, z) { var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
    function h(a, b, c) { return hsh(a * 1.0 + b * 57.0 + c * 113.0); } function lx(a, b, t) { return a + (b - a) * t; }
    return lx(lx(lx(h(ix, iy, iz), h(ix + 1, iy, iz), fx), lx(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), fx), fy), lx(lx(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), fx), lx(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), fx), fy), fz); }
  function fbm(x, y, z) { return vnoise(x, y, z) * 0.55 + vnoise(x * 2.07, y * 2.07, z * 2.07) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.15; }
  function smooth01(v) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }
  function rockPeak(cx, cz, r, h, ry, squash, mix, sd) {
    var g = new THREE.ConeGeometry(r, h, 12, 6, true); g.translate(0, h / 2, 0); var P = g.attributes.position, apexShift = (hsh(sd) - 0.5) * r * 0.5;
    for (var i = 0; i < P.count; i++) { var x = P.getX(i), y = P.getY(i), z = P.getZ(i), t = y / h, rad = Math.hypot(x, z);
      if (rad > 1e-4) { var n = fbm(x * 0.045 + sd, y * 0.05, z * 0.045 - sd); var k = 1 + (n - 0.5) * 0.9 * (1 - t * 0.5); x *= k; z *= k; y += (fbm(x * 0.03, y * 0.03 + sd, z * 0.03) - 0.5) * h * 0.08 * (1 - t); }
      x += apexShift * t * t; P.setXYZ(i, x, Math.max(0, y), z); }
    g = g.toNonIndexed(); g.applyMatrix4(place(cx, -6, cz, ry, 1, 1, squash)); g.computeVertexNormals(); var p = g.attributes.position, nm = g.attributes.normal, c = new THREE.Color();
    for (var v = 0; v < p.count; v++) { var lam = nm.getX(v) * pSun.x + nm.getY(v) * pSun.y + nm.getZ(v) * pSun.z; var yy = p.getY(v) + 6, tt = yy / h;
      for (var s2 = 0; s2 < 2; s2++) { c.copy(rockShade[s2]).lerp(rockLit[s2], smooth01(lam * 0.9 + 0.35)); c.lerp(baseCol[s2], (1 - smooth01(tt * 2.2)) * 0.35);
        if (tt > 0.62 && nm.getY(v) > 0.28) c.lerp(capCol[s2], smooth01((tt - 0.62) / 0.2) * smooth01((nm.getY(v) - 0.28) / 0.3) * (0.55 + 0.45 * Math.max(0, lam)));
        c.lerp(pHaze[s2], Math.min(0.86, mix + (1 - smooth01(tt)) * 0.18)); (s2 ? far.colN : far.colD).push(c.r, c.g, c.b); }
      far.pos.push(p.getX(v), p.getY(v), p.getZ(v)); }
    g.dispose(); }
  for (var k = 0; k < N; k++) { var ang = k / N * Math.PI * 2 + (rnd() - 0.5) * 0.12; var dist = 620 + rnd() * 240; var mix = 0.18 + 0.36 * (dist - 620) / 240;   /* farther = closer to the haze colour; forms stay readable, never fogged out */
    var cx = Math.cos(ang) * dist, cz = Math.sin(ang) * dist; var pieces = 3 + Math.floor(rnd() * 4); var main = 110 + rnd() * 150;
    for (var j = 0; j < pieces; j++) { var h = j === 0 ? main : main * (0.35 + rnd() * 0.45); var r = h * (0.42 + rnd() * 0.22); var ox = (rnd() - 0.5) * 120, oz = (rnd() - 0.5) * 120; rockPeak(cx + ox, cz + oz, r, h, rnd() * 3, 0.78 + rnd() * 0.5, mix, k * 13 + j * 3.7); }
    if (k % 7 === 3) { var sh = 190 + rnd() * 70; pushGeo(far, new THREE.ConeGeometry(14 + rnd() * 8, sh, 6), place(cx, sh / 2 - 6, cz, rnd() * 3, 1, 1, 1), pmap(capCol, function (c, i) { return c.lerp(pHaze[i], 0.35 + mix * 0.5); }), true);   /* a world-scale spire: a platinum monument on the horizon */ pushGeo(far, new THREE.OctahedronGeometry(18, 0), place(cx, sh - 2, cz, rnd() * 3, 1, 1.9, 1), pmap(capCol, function (c, i) { return c.lerp(pHaze[i], mix * 0.6); }), true); }
  }
  var farMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false }); var farMesh = finish(far, farMat); farMesh.name = 'FAR_MASSIFS'; farMesh.renderOrder = -5; group.add(farMesh);
  /* ---------- MID: elevated crystal walkway arcs + prism towers in the empty sectors (lit, fogged naturally) ---------- */
  var mid = { pos: [], colD: [], colN: [], nrm: [] }; var sectors = [Math.PI * 0.62, Math.PI * 0.85, Math.PI * 1.05, Math.PI * 1.28, Math.PI * 1.5, Math.PI * 1.72];   /* bearings (atan2 x,z): the north half holds the temple / market / gym / tower — mid forms stay south, east and west */
  var midPlat = pair('midPlat'), midCrystal = pair('midCrystal');   /* B7 §10 F: the mid forms a step darker than the far ring — three readable depth steps */
  sectors.forEach(function (b, i) { var dist = 230 + rnd() * 100; var cx = Math.sin(b) * dist, cz = Math.cos(b) * dist;
    var hT = 55 + rnd() * 55, towerR = 10 + rnd() * 6; pushGeo(mid, new THREE.CylinderGeometry(towerR * 0.34, towerR, hT, 9, 2), place(cx, hT / 2, cz, rnd() * 3, 1, 1, 1), midPlat, true);   /* a shouldered prism tower, not a single cheap spike */
    pushGeo(mid, new THREE.OctahedronGeometry(7, 0), place(cx, hT + 4, cz, rnd() * 3, 1, 1.8, 1), midCrystal, true);   /* its crystal crown */
    if (i % 2 === 0) { /* one continuous distant arch with two grounded piers; the old chain of boxes read as a broken half-bridge */ var b2 = sectors[(i + 1) % sectors.length]; var d2 = 230 + rnd() * 100; var ex = Math.sin(b2) * d2, ez = Math.cos(b2) * d2; var curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(cx, 22, cz), new THREE.Vector3((cx + ex) * 0.5, 50, (cz + ez) * 0.5), new THREE.Vector3(ex, 22, ez)); pushGeo(mid, new THREE.TubeGeometry(curve, 28, 2.5, 7, false), new THREE.Matrix4(), pmap(midPlat, function (c) { return c.multiplyScalar(0.9); }), true); [0.18, 0.82].forEach(function (u) { var pp = curve.getPoint(u), ph = Math.max(8, pp.y); pushGeo(mid, new THREE.CylinderGeometry(1.7, 3.0, ph, 8), place(pp.x, ph * 0.5, pp.z, 0, 1, 1, 1), pmap(midPlat, function (c) { return c.multiplyScalar(0.82); }), true); }); }
  });
  var midMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.5, metalness: 0.55 }); var midMesh = finish(mid, midMat); midMesh.name = 'MID_WALKWAYS'; group.add(midMesh);
  /* ---------- HAZE plain: the ground fades into a platinum haze beyond the district instead of ending at an edge ---------- */
  var ring = new THREE.RingGeometry(250, 890, 48, 1); ring.rotateX(-Math.PI / 2); var rc = []; var rp = ring.attributes.position; var inner = pair('ringIn'), outer = pmap(hazeP, function (c, i) { return c.lerp(new THREE.Color(PAL[i].ringOut), 0.5); }), rcN = [];
  for (var v = 0; v < rp.count; v++) { var rr = Math.hypot(rp.getX(v), rp.getZ(v)); var t = Math.max(0, Math.min(1, (rr - 300) / 590)); var c = inner[0].clone().lerp(outer[0], Math.pow(t, 0.6)), cn = inner[1].clone().lerp(outer[1], Math.pow(t, 0.6)); rc.push(c.r, c.g, c.b); rcN.push(cn.r, cn.g, cn.b); }
  ring.userData.colDay = new Float32Array(rc); ring.userData.colNight = new Float32Array(rcN); ring.setAttribute('color', new THREE.Float32BufferAttribute(NIGHT ? ring.userData.colNight.slice() : ring.userData.colDay.slice(), 3)); var hazeMesh = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false })); hazeMesh.position.y = -0.02;   /* just under the district floor (y −0.005) so the floor edge at 300 m shows no seam */ hazeMesh.name = 'HAZE_PLAIN'; hazeMesh.renderOrder = -6; hazeMesh.frustumCulled = false; group.add(hazeMesh);
  group.userData.night = NIGHT; group.userData.setNight = function (n) { n = !!n; if (n === group.userData.night) return; group.userData.night = n; [farMesh, midMesh, hazeMesh].forEach(function (m) { var gd = m.geometry, a = gd.attributes.color; if (!gd.userData.colDay) return; a.array.set(n ? gd.userData.colNight : gd.userData.colDay); a.needsUpdate = true; }); };
  group.userData.info = { far_pieces: far.pos.length / 3, mid_pieces: mid.pos.length / 3, draw_calls: 3, far_ring_m: [620, 860], mid_ring_m: [230, 330], spires: Math.floor(N / 7) };
  return group;
}
