/* MAHWORLD :: SAMPLE CITY DRESSING (presentation only; every solid it draws is one authoritative collider from the field layout)
   Building language: rounded / softened blocks, chromium + platinum, controlled glass bands, curved entrances, diamond accents, cool
   blue-white light — never a box with a pointed roof. Ground: premium chromium with restrained reflections and diamond inlays. Vegetation:
   laser-plant stalks with square-diamond leaves. All materials are shared and geometry is instanced or merged where it repeats, so a phone
   pays for a handful of draw calls per building. Lighting is a TEMPLATE meant to generalise to future character packages: one cool key,
   one hemisphere, an environment map for specular, emissive trims for local light (no per-lamp point lights). */
export function createCityScene(THREE, group, helpers) {
  var roundedBox = helpers.roundedBox, canvasTex = helpers.canvasTex; var DAY = helpers.night === false;
  var M = {
    /* JOB B palette (owner 2026-09-19 §4): PLATINUM facades (a mid-light cool grey with a restrained sky sheen — never white), CHROMIUM domes / trims, GRAPHITE recesses */
    platinum: new THREE.MeshStandardMaterial({ color: 0xaab4bf, roughness: 0.38, metalness: 0.9, envMapIntensity: 0.55 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xa4aeb9, roughness: 0.24, metalness: 0.98, envMapIntensity: 0.7 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1d2229, roughness: 0.5, metalness: 0.75 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x7fd2ff, roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.6, emissive: 0x0f5f8a, emissiveIntensity: (DAY ? 0.42 : 0.8) }),   /* owner B7 §7: the civic glass band carries the district's CYAN energy (material-integrated, not a rod) */
    trim: new THREE.MeshStandardMaterial({ color: 0xaee8ff, emissive: 0x3fc8ff, emissiveIntensity: (DAY ? 0.95 : 1.7), roughness: 0.3, metalness: 0.2 }),   /* B7 §7: the tier ledges / portholes read as recessed cyan energy seams */
    trimWarm: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfeeff, emissiveIntensity: (DAY ? 0.54 : 1.2), roughness: 0.3, metalness: 0.1 }),
    diamond: new THREE.MeshStandardMaterial({ color: 0xcff4ff, roughness: 0.05, metalness: 0.6, emissive: 0x4fd0ff, emissiveIntensity: (DAY ? 0.5 : 0.9), flatShading: true }),   /* B7 §7: the roof diamond is a cyan crystal, not a white cap */
    doorway: new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.9, metalness: 0.1, emissive: 0x0e4a7a, emissiveIntensity: (DAY ? 0.6 : 1.0) }),   /* B7 §7: entrance illumination — the doorway recess glows cyan */
    leaf: new THREE.MeshStandardMaterial({ color: 0x9ff2ff, emissive: 0x3fd8ff, emissiveIntensity: (DAY ? 0.495 : 1.1), roughness: 0.3, metalness: 0.3, flatShading: true, side: THREE.DoubleSide }),
    stalk: new THREE.MeshStandardMaterial({ color: 0xdff6ff, emissive: 0x8fe8ff, emissiveIntensity: (DAY ? 0.405 : 0.9), roughness: 0.4, metalness: 0.2 }),
    puddle: new THREE.MeshStandardMaterial({ color: 0x1a2432, roughness: 0.02, metalness: 1.0, transparent: true, opacity: 0.85 })
  };
  function nameSprite(text) { var tex = canvasTex(512, 96, function (g, w, h) { g.clearRect(0, 0, w, h); g.font = '600 46px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#6fc3ff'; g.shadowBlur = 18; g.fillStyle = '#dff3ff'; g.fillText(text.toUpperCase(), w / 2, h / 2); }); var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false })); sp.scale.set(7.5, 1.4, 1); return sp; }
  function tier(cx, cz, w, d, y0, h, r, mat) { var m = new THREE.Mesh(roundedBox(w, h, d, r), mat); m.position.set(cx, y0, cz); return m; }   /* roundedBox is extruded from y0 upward (see fieldScene.roundedBox) */
  function band(cx, cz, w, d, y, h, r) { var b = new THREE.Mesh(roundedBox(w + 0.12, h, d + 0.12, r), M.glass); b.position.set(cx, y, cz); return b; }
  function strip(cx, cz, w, d, y, r, mat) { var s = new THREE.Mesh(roundedBox(w + 0.2, 0.08, d + 0.2, r), mat || M.trim); s.position.set(cx, y, cz); return s; }
  function diamond(x, y, z, s) { var o = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), M.diamond); o.position.set(x, y, z); o.scale.set(1, 1.6, 1); return o; }
  function entrance(bx, bz, e) {   /* e: {side:'+x'|'-x'|'+z'|'-z', x, z, width, height}: a curved recessed opening on that face, a light arch, a landing strip */
    var g = new THREE.Group(); var horiz = e.side === '+z' || e.side === '-z'; var sx = e.side === '+x' ? 1 : e.side === '-x' ? -1 : 0; var sz = e.side === '+z' ? 1 : e.side === '-z' ? -1 : 0;
    var depth = 0.9; var door = new THREE.Mesh(roundedBox(horiz ? e.width : depth, e.height, horiz ? depth : e.width, Math.min(e.width, e.height) * 0.42), M.doorway); door.position.set(e.x + sx * (depth / 2 - 0.35), 0, e.z + sz * (depth / 2 - 0.35)); g.add(door);
    var arch = new THREE.Mesh(new THREE.TorusGeometry(e.width * 0.52, 0.09, 8, 32, Math.PI), M.trim); arch.position.set(e.x + sx * 0.3, e.height * 0.62, e.z + sz * 0.3); if (!horiz) arch.rotation.y = Math.PI / 2; g.add(arch);
    /* door: two platinum leaves set into the recess with a vertical light seam, a lit lintel above, concentric landing rings on the ground */
    var leafW = e.width * 0.44, leafH = e.height * 0.86; [-1, 1].forEach(function (sg) { var leaf = new THREE.Mesh(roundedBox(horiz ? leafW : 0.12, leafH, horiz ? 0.12 : leafW, 0.14), M.platinum); leaf.position.set(e.x + (horiz ? sg * (leafW / 2 + 0.05) : sx * 0.12), 0.04, e.z + (horiz ? sz * 0.12 : sg * (leafW / 2 + 0.05))); g.add(leaf); });
    var seam = new THREE.Mesh(roundedBox(horiz ? 0.06 : 0.16, leafH * 0.9, horiz ? 0.16 : 0.06, 0.02), M.trim); seam.position.set(e.x + sx * 0.14, 0.08, e.z + sz * 0.14); g.add(seam);
    var lintel = new THREE.Mesh(roundedBox(horiz ? e.width * 1.15 : 0.3, 0.16, horiz ? 0.3 : e.width * 1.15, 0.05), M.trimWarm); lintel.position.set(e.x + sx * 0.45, e.height * 0.98, e.z + sz * 0.45); g.add(lintel);
    [1.2, 2.1].forEach(function (rr, i) { var ring = new THREE.Mesh(new THREE.RingGeometry(rr - 0.05, rr, 40), i ? M.trim : M.trimWarm); ring.rotation.x = -Math.PI / 2; ring.position.set(e.x + sx * 2.4, 0.03, e.z + sz * 2.4); g.add(ring); });
    var mat = new THREE.Mesh(new THREE.PlaneGeometry(horiz ? e.width * 1.1 : 4.5, horiz ? 4.5 : e.width * 1.1), M.trimWarm); mat.rotation.x = -Math.PI / 2; mat.position.set(e.x + sx * 2.4, 0.02, e.z + sz * 2.4); mat.material = M.trimWarm.clone(); mat.material.transparent = true; mat.material.opacity = 0.22; g.add(mat);
    return g;
  }
  var api = {
    /* one authored building from its collider (BOX or CYLINDER) + `building` block */
    building: function (s) {
      var B = s.building; var g = new THREE.Group(); g.name = s.id; var cx, cz, w, d;
      if (s.type === 'CYLINDER') { cx = s.x; cz = s.z; w = d = s.r * 2; } else { cx = (s.x1 + s.x2) / 2; cz = (s.z1 + s.z2) / 2; w = s.x2 - s.x1; d = s.z2 - s.z1; }
      var tiers = Math.max(1, B.tiers || 1); var hEach = s.h / tiers; var y = 0;
      if (B.dome) {
        var base = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r * 1.04, s.h * 0.55, 48), M.platinum); base.position.set(cx, s.h * 0.275, cz); g.add(base);
        var dome = new THREE.Mesh(new THREE.SphereGeometry(s.r * 0.98, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.chrome); dome.scale.y = (s.h * 0.45) / (s.r * 0.98); dome.position.set(cx, s.h * 0.55, cz); g.add(dome);
        var ring1 = new THREE.Mesh(new THREE.TorusGeometry(s.r * 1.0, 0.1, 8, 64), M.trim); ring1.rotation.x = Math.PI / 2; ring1.position.set(cx, s.h * 0.55, cz); g.add(ring1);
        var gband = new THREE.Mesh(new THREE.CylinderGeometry(s.r * 1.02, s.r * 1.02, s.h * 0.12, 48, 1, true), M.glass); gband.position.set(cx, s.h * 0.30, cz); g.add(gband);
        g.add(diamond(cx, s.h + 1.1, cz, 0.9));
      } else {
        for (var i = 0; i < tiers; i++) { var k = 1 - i * 0.09; var tw = w * k, td = d * k; var r = Math.min(tw, td) * 0.24; g.add(tier(cx, cz, tw, td, y, hEach, r, i % 2 ? M.chrome : M.platinum)); g.add(band(cx, cz, tw, td, y + hEach * (B.glass_band || 0.45) - 0.35, 0.7, r)); g.add(strip(cx, cz, tw, td, y + hEach - 0.12, r)); y += hEach; }
        var cap = new THREE.Mesh(roundedBox(w * (1 - tiers * 0.09) * 0.7, 0.5, d * (1 - tiers * 0.09) * 0.7, Math.min(w, d) * 0.2), M.chrome); cap.position.set(cx, y, cz); g.add(cap);
        g.add(diamond(cx, y + 1.4, cz, 0.7));
      }
      /* MOTION PRECISION PASS I — façade depth: vertical chrome fins along each tier's long faces (instanced), a recessed dark window strip
         behind the glass band, a light ledge at every tier base, round portholes on the upper tiers — authored, restrained, coherent */
      if (!B.dome) { var finCount = 0; var faces = []; var yy = 0; for (var t2 = 0; t2 < tiers; t2++) { var kk = 1 - t2 * 0.09; faces.push({ y: yy, h: hEach, w: w * kk, d: d * kk }); yy += hEach; }
        var finsPer = faces.reduce(function (a, f) { return a + 2 * (Math.floor(f.w / 1.6) + Math.floor(f.d / 1.6)); }, 0); var fins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 1, 0.34), M.chrome, Math.max(1, finsPer)); var fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), fv = new THREE.Vector3(), fs = new THREE.Vector3();
        faces.forEach(function (f) { var fh = f.h * 0.78; var nx = Math.floor(f.w / 1.6), nz = Math.floor(f.d / 1.6);
          for (var i2 = 0; i2 < nx; i2++) { var px = cx - f.w / 2 + (i2 + 0.5) * (f.w / nx); [-1, 1].forEach(function (sg) { fq.identity(); fm.compose(fv.set(px, f.y + f.h * 0.5, cz + sg * (f.d / 2 + 0.08)), fq, fs.set(1, fh, 1)); if (finCount < fins.count) fins.setMatrixAt(finCount++, fm); }); }
          for (var j2 = 0; j2 < nz; j2++) { var pz = cz - f.d / 2 + (j2 + 0.5) * (f.d / nz); [-1, 1].forEach(function (sg) { fq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); fm.compose(fv.set(cx + sg * (f.w / 2 + 0.08), f.y + f.h * 0.5, pz), fq, fs.set(1, fh, 1)); if (finCount < fins.count) fins.setMatrixAt(finCount++, fm); }); }
          var ledge = new THREE.Mesh(roundedBox(f.w + 0.5, 0.06, f.d + 0.5, Math.min(f.w, f.d) * 0.24), M.trimWarm); ledge.position.set(cx, f.y + 0.02, cz); g.add(ledge);
          var inset = new THREE.Mesh(roundedBox(f.w + 0.02, 0.9, f.d + 0.02, Math.min(f.w, f.d) * 0.24), M.dark); inset.position.set(cx, f.y + f.h * (B.glass_band || 0.45) - 0.45, cz); g.add(inset); });
        fins.instanceMatrix.needsUpdate = true; if (helpers.fins !== false) g.add(fins);
        if (tiers >= 2) { var top = faces[faces.length - 1]; for (var pi2 = 0; pi2 < 3; pi2++) { [-1, 1].forEach(function (sg) { var ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 24), M.trim); ring.position.set(cx - top.w * 0.3 + pi2 * top.w * 0.3, top.y + top.h * 0.62, cz + sg * (top.d / 2 + 0.1)); g.add(ring); var disc = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), M.glass); disc.position.copy(ring.position); if (sg < 0) disc.rotation.y = Math.PI; g.add(disc); }); } } }
      if (B.entrance) g.add(entrance(cx, cz, B.entrance));
      var label = nameSprite(B.name || s.id); label.position.set(B.entrance ? B.entrance.x : cx, (B.entrance ? B.entrance.height : 4) + 1.6, B.entrance ? B.entrance.z : cz); g.add(label);
      group.add(g); return g;
    },
    /* ground and dressing: chrome floor with diamond inlays, puddle accents, laser plants; nothing blocks movement */
    dress: function (size) {
      var seed = 9; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      /* diamond inlays: thin flat octahedra in a ring around the plaza */
      var inlay = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.1, metalness: 0.9, emissive: 0x3a86c8, emissiveIntensity: 0.35, flatShading: true }), 24); var mtx = new THREE.Matrix4(); var q = new THREE.Quaternion(); var sc = new THREE.Vector3(1, 0.06, 1);
      for (var i = 0; i < 24; i++) { var a = i / 24 * Math.PI * 2; var rr = 11.5 + (i % 2) * 1.2; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a); mtx.compose(new THREE.Vector3(Math.cos(a) * rr, 0.03, Math.sin(a) * rr), q, sc); inlay.setMatrixAt(i, mtx); } inlay.instanceMatrix.needsUpdate = true; group.add(inlay);
      /* JOB B PLAZA CLEANUP (owner directive 2026-09-19 §5 — registry zone PLAZA_CLEAR): the central plaza keeps its lanes, forecourts and landing
         clearance; the decorative puddles and laser-plant clusters move out of the axis lanes / forecourts to the plaza's south perimeter beds (r ≈ 44–50 m,
         away from the tree elevator (30, 40) and the pods (−30, 26)). Landmarks, pathways, pylons and the emblem stay. Nothing here blocks movement. */
      /* puddles: three flat mirror accents at the south forecourt corners (out of every lane) */
      [[-31, -31, 2.0], [31, -31, 1.8], [-45, -20, 1.5]].forEach(function (p) { var pd = new THREE.Mesh(new THREE.CircleGeometry(p[2], 24), M.puddle); pd.rotation.x = -Math.PI / 2; pd.position.set(p[0], 0.015, p[1]); pd.scale.x = 1.35; group.add(pd); });
      /* laser plants: instanced stalks + square-diamond leaves in clusters near the buildings' flanks */
      var spots = [[-40, -38], [40, -38], [-47, -9], [47, -9], [-14, -48], [14, -48], [-28, -46], [28, -46], [-48, 8], [48, 8], [-44, -26], [44, -26]];   /* perimeter planting beds (south half + flanks), was: 12 clusters inside r 27 m of the plaza centre */
      var stalks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.05, 1, 5), M.stalk, spots.length * 5); var leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.42, 0.42), M.leaf, spots.length * 5 * 3); var n1 = 0, n2 = 0; var v = new THREE.Vector3();
      spots.forEach(function (sp) { for (var k = 0; k < 5; k++) { var x = sp[0] + (rnd() - 0.5) * 2.2, z = sp[1] + (rnd() - 0.5) * 2.2; var h = 1.1 + rnd() * 1.5; var tilt = (rnd() - 0.5) * 0.35; q.setFromEuler(new THREE.Euler(tilt, rnd() * 6.28, (rnd() - 0.5) * 0.35)); mtx.compose(v.set(x, h / 2, z), q, new THREE.Vector3(1, h, 1)); stalks.setMatrixAt(n1++, mtx);
        for (var l = 0; l < 3; l++) { var ly = h * (0.45 + l * 0.22); q.setFromEuler(new THREE.Euler(0.2, rnd() * 6.28, Math.PI / 4)); mtx.compose(v.set(x + (rnd() - 0.5) * 0.3, ly, z + (rnd() - 0.5) * 0.3), q, new THREE.Vector3(1 - l * 0.2, 1 - l * 0.2, 1)); leaves.setMatrixAt(n2++, mtx); } } });
      stalks.instanceMatrix.needsUpdate = true; leaves.instanceMatrix.needsUpdate = true; group.add(stalks); group.add(leaves);
      /* MOTION PRECISION PASS I — readable pathways: low light strips from the plaza ring to each entrance, lit kerbs, light pylons at
         intervals (instanced), and the MAHWORLD emblem over the plaza centre. Presentation only: nothing here blocks movement. */
      var entrances = [[-17, 0, -1, 0], [0, -19.5, 0, -1], [18, 0, 1, 0], [1, 20, 0, 1]];   /* x, z, dir x, dir z */
      var pylons = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 1, 8), M.chrome, 56); var rings = new THREE.InstancedMesh(new THREE.TorusGeometry(0.22, 0.035, 6, 20), M.trim, 56); var np = 0; var pm = new THREE.Matrix4(), pq = new THREE.Quaternion(), pv = new THREE.Vector3(), ps = new THREE.Vector3();
      entrances.forEach(function (en) { var ex = en[0], ez = en[1], dx = en[2], dz = en[3]; var start = 12.5, len = Math.hypot(ex, ez) - start - 2.6; if (len < 2) return; var cxp = ex - dx * (start + len / 2 + 2.6) * 0 + (-dx) * (len / 2 + 2.6) , czp = ez + (-dz) * (len / 2 + 2.6);
        var path = new THREE.Mesh(new THREE.PlaneGeometry(dx ? len : 2.4, dx ? 2.4 : len), M.trimWarm.clone()); path.material.transparent = true; path.material.opacity = 0.10; path.rotation.x = -Math.PI / 2; path.position.set(cxp, 0.012, czp); group.add(path);
        [-1, 1].forEach(function (sg) { var kerb = new THREE.Mesh(new THREE.PlaneGeometry(dx ? len : 0.08, dx ? 0.08 : len), M.trim); kerb.rotation.x = -Math.PI / 2; kerb.position.set(cxp + (dx ? 0 : sg * 1.3), 0.02, czp + (dx ? sg * 1.3 : 0)); group.add(kerb); });
        for (var k2 = 0; k2 < 4; k2++) { var t3 = (k2 + 0.5) / 4; var px = cxp + (dx ? (t3 - 0.5) * len : 0), pz = czp + (dx ? 0 : (t3 - 0.5) * len); [-1, 1].forEach(function (sg) { if (np >= 56) return; var qx = px + (dx ? 0 : sg * 2.7), qz = pz + (dx ? sg * 2.7 : 0); pq.identity(); pm.compose(pv.set(qx, 0.55, qz), pq, ps.set(1, 1.1, 1)); pylons.setMatrixAt(np, pm); pq.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); pm.compose(pv.set(qx, 1.15, qz), pq, ps.set(1, 1, 1)); rings.setMatrixAt(np, pm); np++;   /* bollard lights at the kerb edge: short, off the walking line */ }); } });
      /* secondary streets (S09 §32): plaza -> tree elevator (NE) and plaza -> residential pods (NW): lit kerbs + bollards on the diagonal */
      [[30, 40, 21], [-30, 30, 19]].forEach(function (dst) { var ang = Math.atan2(dst[1], dst[0]); var L2 = Math.hypot(dst[0], dst[1]) - dst[2] - 4; var mid = 13 + L2 / 2; var cxp = Math.cos(ang) * mid, czp = Math.sin(ang) * mid; var path = new THREE.Mesh(new THREE.PlaneGeometry(L2, 2.6), M.trimWarm.clone()); path.material.transparent = true; path.material.opacity = 0.09; path.rotation.x = -Math.PI / 2; path.rotation.z = -ang; path.position.set(cxp, 0.012, czp); group.add(path); for (var k3 = 0; k3 < 5; k3++) { var t4 = 13 + (k3 + 0.5) / 5 * L2; [-1, 1].forEach(function (sg) { if (np >= 32) return; var qx = Math.cos(ang) * t4 - Math.sin(ang) * sg * 2.4, qz = Math.sin(ang) * t4 + Math.cos(ang) * sg * 2.4; pq.identity(); pm.compose(pv.set(qx, 0.55, qz), pq, ps.set(1, 1.1, 1)); pylons.setMatrixAt(np, pm); pq.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); pm.compose(pv.set(qx, 1.15, qz), pq, ps.set(1, 1, 1)); rings.setMatrixAt(np, pm); np++; }); } });
      pylons.count = np; rings.count = np; pylons.instanceMatrix.needsUpdate = true; rings.instanceMatrix.needsUpdate = true; group.add(pylons); group.add(rings);
      var emblem = new THREE.Group(); var oct = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), M.diamond); oct.scale.set(1, 1.7, 1); emblem.add(oct); var halo = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.05, 8, 48), M.trim); halo.rotation.x = Math.PI / 2; emblem.add(halo); emblem.position.set(0, 9.5, 0); emblem.name = 'MAH_EMBLEM'; group.add(emblem); var lbl = nameSprite('MAHWORLD PLAZA'); lbl.position.set(0, 12.2, 0); group.add(lbl); api.emblem = emblem;
      /* The old 26-cone ridge was the actual owner of the enormous blue planar shard in the M7 owner view: on the district build its
         34–94 m seven-sided cones were merged before the registry macro/far-world layers loaded.  Keep the bounded fallback for the small
         standalone field, but do not stack it behind the full world where macro.js + farWorld.js already own the unreachable horizon. */
      var ridge = new THREE.MeshStandardMaterial({ color: DAY ? 0x6f8196 : 0x9aa6b4, roughness: DAY ? 0.85 : 0.55, metalness: DAY ? 0.35 : 0.75, flatShading: true }); var mg = new THREE.Group(); mg.name = 'MAHWORLD_LEGACY_HORIZON_RIDGE';
      var ringR = (helpers && helpers.horizonRadius) || 150; if (ringR <= 200) { for (var m = 0; m < 26; m++) { var ang = m / 26 * Math.PI * 2 + rnd() * 0.15; var dist = ringR + rnd() * 60; var hh = 22 + rnd() * 40; var cone = new THREE.Mesh(new THREE.ConeGeometry(18 + rnd() * 22, hh, 12), ridge); cone.position.set(Math.cos(ang) * dist, hh / 2 - 6, Math.sin(ang) * dist); cone.rotation.y = rnd() * 3; cone.scale.set(1, 0.7, 1.35); mg.add(cone); } group.add(mg); api.legacyRidge = 'SMALL_FIELD_FALLBACK'; } else api.legacyRidge = 'SUPPRESSED_FULL_WORLD';
    },
    /* M7 REFERENCE LOCK — one compact NEXUS / ASCENT / HALO landmark.  The owner image establishes a broad silver tree, glazed centre and
       curving structural routes; the unseen dome is completed at the bounded runtime scale recorded in the handoff (base r 6.2, deck 24 m,
       realm r 8.5, apex 32.2 m).  Host colliders and TRANSIT still own support and travel. */
    treeElevator: function (s, shapes) { var g = new THREE.Group(); g.name = 'TREE_ELEVATOR'; g.userData.noMerge = true; var L = s.landmark; var H = s.h, PH = L.platform_h || 24, PR = L.platform_r || 8.5, DR = Math.min(PR - 0.3, 8.2);
      var glassCore = M.glass.clone(); glassCore.color.setHex(0x8adfff); glassCore.opacity = 0.42; glassCore.depthWrite = false; glassCore.emissiveIntensity = DAY ? 0.35 : 0.72;
      var darkGlass = M.doorway.clone(); darkGlass.transparent = true; darkGlass.opacity = 0.76;
      function tube(points, radius, mat, tubular, radial) { var curve = new THREE.CatmullRomCurve3(points); var mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubular || 24, radius, radial || 10, false), mat); g.add(mesh); return mesh; }
      /* compact circular civic root and recessed west-facing boarding bay */
      var root = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.6, 0.7, 64), darkGlass); root.position.set(s.x, 0.35, s.z); g.add(root); var rootRim = new THREE.Mesh(new THREE.TorusGeometry(6.15, 0.12, 10, 64), M.trimWarm); rootRim.rotation.x = Math.PI / 2; rootRim.position.set(s.x, 0.72, s.z); g.add(rootRim);
      var entry = new THREE.Mesh(new THREE.CapsuleGeometry(1.25, 1.5, 8, 24), darkGlass); entry.position.set(s.x - 3.0, 1.75, s.z); entry.rotation.z = Math.PI / 2; g.add(entry);
      var pad = new THREE.Mesh(new THREE.RingGeometry(1.65, 2.25, 48), M.trim.clone()); pad.material.transparent = true; pad.material.opacity = 0.38; pad.rotation.x = -Math.PI / 2; pad.position.set(s.x - 3.5, 0.75, s.z); g.add(pad);
      /* smooth engineered trunk: a flared continuous lathe rather than the previous narrow straight cylinder */
      var profile = [[3.9, 0.7], [3.15, 1.5], [2.25, 4.2], [1.95, 10.5], [1.75, 17.5], [1.5, PH - 3.3], [2.25, PH - 0.7]].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      var trunk = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), M.platinum); trunk.position.set(s.x, 0, s.z); trunk.geometry.computeVertexNormals(); g.add(trunk);
      var core = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 1.05, PH - 1.4, 32), glassCore); core.position.set(s.x, (PH + 0.7) / 2, s.z); g.add(core);
      var recess = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, PH - 3.0, 32, 1, true, Math.PI * 0.72, Math.PI * 0.56), darkGlass); recess.position.set(s.x, (PH + 1.4) / 2, s.z); recess.rotation.y = Math.PI * 0.86; g.add(recess);
      /* three legible circulation/energy motifs: straight, gentle spiral, and outward curve */
      for (var c = 0; c < 2; c++) { var aa = c * Math.PI; tube([new THREE.Vector3(s.x + Math.cos(aa) * 2.35, 1.0, s.z + Math.sin(aa) * 2.35), new THREE.Vector3(s.x + Math.cos(aa) * 1.9, PH * 0.5, s.z + Math.sin(aa) * 1.9), new THREE.Vector3(s.x + Math.cos(aa) * 2.15, PH - 0.8, s.z + Math.sin(aa) * 2.15)], 0.09, M.trim, 28, 8); }
      var spiralPts = []; for (var sp = 0; sp <= 44; sp++) { var st = sp / 44, sa = st * Math.PI * 3.25 + 0.7, sr = 2.75 - st * 0.45; spiralPts.push(new THREE.Vector3(s.x + Math.cos(sa) * sr, 1.2 + st * (PH - 2.5), s.z + Math.sin(sa) * sr)); } tube(spiralPts, 0.12, M.trim, 64, 8);
      /* strong curved branches flare from the trunk and physically dock at the realm collar */
      var nB = Math.max(6, L.branches || 6); for (var b = 0; b < nB; b++) { var ang = b / nB * Math.PI * 2 + 0.28, ca = Math.cos(ang), sa2 = Math.sin(ang), side = b % 2 ? 1 : -1; var pts = [new THREE.Vector3(s.x + ca * 1.35, PH * 0.47 + (b % 2) * 1.2, s.z + sa2 * 1.35), new THREE.Vector3(s.x + ca * 3.1 - sa2 * side * 0.55, PH * 0.67, s.z + sa2 * 3.1 + ca * side * 0.55), new THREE.Vector3(s.x + ca * (PR - 1.0), PH - 0.55, s.z + sa2 * (PR - 1.0))]; tube(pts, b < 3 ? 0.48 : 0.36, b % 2 ? M.chrome : M.platinum, 24, 12); var joint = new THREE.Mesh(new THREE.SphereGeometry(b < 3 ? 0.6 : 0.48, 18, 12), M.chrome); joint.position.copy(pts[2]); g.add(joint); }
      /* upper walkable HALO: dark underside, platinum promenade, docking collar, safe perimeter and clear dome */
      var under = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR * 0.82, 0.85, 64), darkGlass); under.position.set(s.x, PH - 0.43, s.z); g.add(under);
      var plat = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, 0.34, 64), M.platinum); plat.position.set(s.x, PH - 0.17, s.z); g.add(plat);
      var promenade = new THREE.Mesh(new THREE.RingGeometry(3.05, PR - 0.75, 64), M.chrome); promenade.rotation.x = -Math.PI / 2; promenade.position.set(s.x, PH + 0.025, s.z); g.add(promenade);
      var collar = new THREE.Mesh(new THREE.TorusGeometry(PR - 0.38, 0.18, 12, 64), M.trim); collar.rotation.x = Math.PI / 2; collar.position.set(s.x, PH + 0.12, s.z); g.add(collar);
      var rail = new THREE.Mesh(new THREE.TorusGeometry(PR - 0.48, 0.065, 8, 64), M.chrome); rail.rotation.x = Math.PI / 2; rail.position.set(s.x, PH + 1.12, s.z); g.add(rail);
      for (var p2 = 0; p2 < 20; p2++) { var pa = p2 / 20 * Math.PI * 2; var post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.05, 8), M.chrome); post.position.set(s.x + Math.cos(pa) * (PR - 0.48), PH + 0.58, s.z + Math.sin(pa) * (PR - 0.48)); g.add(post); }
      var dome = new THREE.Mesh(new THREE.SphereGeometry(DR, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), glassCore); dome.position.set(s.x, PH, s.z); dome.renderOrder = 4; g.add(dome);
      for (var rb = 0; rb < 8; rb++) { var ra = rb / 8 * Math.PI * 2; tube([new THREE.Vector3(s.x + Math.cos(ra) * (DR - 0.08), PH + 0.08, s.z + Math.sin(ra) * (DR - 0.08)), new THREE.Vector3(s.x + Math.cos(ra) * DR * 0.62, PH + DR * 0.68, s.z + Math.sin(ra) * DR * 0.62), new THREE.Vector3(s.x, PH + DR, s.z)], 0.075, M.chrome, 20, 8); }
      var zenith = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 1), M.diamond); zenith.scale.y = 1.35; zenith.position.set(s.x, PH + DR + 0.2, s.z); g.add(zenith);
      /* restrained rest/overlook furniture and one existing-guide focus node */
      for (var bn = 0; bn < 3; bn++) { var ba = -0.7 + bn * 0.7; var bench = new THREE.Mesh(roundedBox(1.8, 0.38, 0.55, 0.18), M.platinum); bench.position.set(s.x + Math.cos(ba) * 5.4, PH + 0.22, s.z + Math.sin(ba) * 5.4); bench.rotation.y = -ba + Math.PI / 2; g.add(bench); }
      var focus = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 1), M.diamond); focus.position.set(s.x - 5.6, PH + 1.35, s.z + 5.4); g.add(focus); var focusHalo = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.055, 8, 40), M.trim); focusHalo.rotation.x = Math.PI / 2; focusHalo.position.set(s.x - 5.6, PH + 0.72, s.z + 5.4); g.add(focusHalo);   /* the guide focus sits on the reachable outer promenade, outside the trunk's r=6.2 collider */
      /* one stable upright carrier; its visual state follows the host TRANSIT snapshot in fieldScene.tick */
      var cabin = new THREE.Group(); cabin.name = 'MAH_ASCENT_CABIN'; var shell = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.35, 8, 20), M.chrome); shell.position.y = 1.15; cabin.add(shell); var cg = new THREE.Mesh(new THREE.CapsuleGeometry(0.57, 1.1, 8, 20), glassCore); cg.position.y = 1.15; cabin.add(cg); var cr = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.08, 8, 32), M.trim); cr.rotation.x = Math.PI / 2; cr.position.y = 0.24; cabin.add(cr); cabin.position.set(s.x - s.r - 0.95, 0.72, s.z); g.add(cabin);
      var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, PH - 0.4, 8), M.trim); shaft.position.set(cabin.position.x - 0.82, PH / 2, s.z); g.add(shaft);
      var label = nameSprite('MAH NEXUS · ASCENT · HALO'); label.position.set(s.x, PH + DR + 2.1, s.z); g.add(label);
      g.userData.cabin = cabin; g.userData.cabinGlass = cg.material; g.userData.platformH = PH; g.userData.baseY = 0.72; g.userData.treeAscentEnvelope = { base_radius_m: 6.2, trunk_height_m: H, deck_height_m: PH, realm_radius_m: PR, dome_apex_m: +(PH + DR).toFixed(2), boarding_x: cabin.position.x, boarding_z: s.z };
      group.add(g); return g; },
    /* residential pod: a rounded platinum shell with a luminous seam and a soft door light */
    pod: function (s) { var g = new THREE.Group(); var body = new THREE.Mesh(new THREE.SphereGeometry(s.r, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), M.platinum); body.scale.y = s.h / s.r * 0.75; body.position.set(s.x, 0, s.z); g.add(body); var seam = new THREE.Mesh(new THREE.TorusGeometry(s.r * 0.98, 0.05, 8, 40), M.trim); seam.rotation.x = Math.PI / 2; seam.position.set(s.x, s.h * 0.45, s.z); g.add(seam); var door = new THREE.Mesh(roundedBox(1.1, 2.0, 0.3, 0.4), M.doorway); door.position.set(s.x, 0, s.z + s.r - 0.1); g.add(door); var dm = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), M.trimWarm.clone()); dm.material.transparent = true; dm.material.opacity = 0.16; dm.rotation.x = -Math.PI / 2; dm.position.set(s.x, 0.02, s.z + s.r + 1.0); g.add(dm); group.add(g); return g; },
    materials: M
  };
  return api;
}
