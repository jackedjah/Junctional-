/* MAHWORLD :: MAH ASCENT — the upper half of the line, and the place it actually goes
   ============================================================================================

   R3-06 names the failure and it is visible in every wide render of this world:

       "The current vertical beams/elevators must not stop visually in the lower atmosphere."

   fobeam.js builds three ascent lines — west 520 m, east 468 m, north 604 m — with real pads, real
   pods and real travel. They are correct and they are unfinished: each one rises out of the district
   and then simply STOPS in open sky. clouds.js hangs its decks at 215–285, 305–400 and 440–560, so
   two of the three lines do not even clear the weather, and none of them arrives anywhere. A viewer
   on the plaza is told a line goes up. They are never told UP TO WHAT, which is the difference
   between infrastructure and a light.

   R3-06 asks for the whole chain: ground entry -> vehicle -> continuous guide -> progression through
   tower height -> continuation into cloud -> VISIBLE CLOUD-PENETRATION DESTINATION -> connection to
   the actual Sky Realm arrival district. fobeam.js owns the first four. This module owns the last
   three, and nothing else — it does not touch fobeam's tuned network, it continues it.

   ---- THE THREE THINGS IT BUILDS ---------------------------------------------------------------

     1. THE CONTINUATION. Each line extends from its own top to a shared SKY THRESHOLD, in the same
        beam language, so the join is invisible and the line reads as ONE line the whole way. The
        three keep their different lower heights and converge on one upper deck altitude, which is
        what makes them read as three routes to one place rather than three unrelated beams.

     2. THE CLOUD PENETRATION. At the top of clouds.js's high deck the line passes through an
        APERTURE — a platinum collar of blades with a bright disc at its throat. This is the beat
        R3-06 calls "visible cloud-penetration destination": from the ground you see the line enter
        the weather and you see the weather give way to it. A beam that simply fades into a cloud
        communicates nothing; a beam that visibly pierces a built thing communicates a route.

     3. THE ARRIVAL DISTRICT. Above the last cloud, at roam's own ceiling, a deck per line — an
        octagonal platform with a rim, masts, a square-diamond aperture the line arrives through, and
        a MAHGIC ring — and LIGHT BRIDGES between the three, so what you see from the plaza is one
        district in the sky with three ways up to it, not three disconnected pads.

   ---- WHY THE ALTITUDES ARE WHAT THEY ARE ------------------------------------------------------
   THRESHOLD 566 is one metre over the top of clouds.js's high deck (yMax 560): the aperture has to
   be ABOVE the weather or it is inside it and reads as nothing. DECK_Y 700 is roam.js's CEIL, which
   makes this the one piece of sky architecture a viewer can actually fly up to and stand under — and
   R3-06's "from the ground it must be obvious THIS GOES TO THE SKY WORLD" is only true if going
   there is possible. The 134 m between them is the last visible leg, deliberately clear of cloud, so
   the arrival reads against open sky from the plaza.

   ---- R3-05 ------------------------------------------------------------------------------------
   Every FOBEAM family carries the miniature vertical music-line motif. These beams have a physical
   emitter (fobeam's pad) and now a physical receiver (the deck), so the mini-line goes at the
   RECEIVER end, which is the end that did not have one.

   buildMahAscent(ctx) -> the standard module contract. */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox } from './materials.js';
import { ASCENTS } from './fobeam.js';
import { createMusicLineField } from './musicline.js';

const TAU = Math.PI * 2;

export const ASCENT = Object.freeze({
  THRESHOLD: 566,      /* 1 m over clouds.js LAYOUT.high.yMax — the aperture must clear the weather */
  DECK_Y: 700,         /* roam.js ROAM.CEIL: the arrival is reachable, not just visible */
  DECK_R: 34,          /* the platform's outer radius */
  RIM_H: 2.6,
  MAST_H: 26,
  COLLAR_R: 13,        /* the cloud aperture's collar */
  BLADES: 8,
  PACKETS: 14          /* diamonds travelling up each line's upper leg */
});

/* deterministic per-index scatter, same irrationals every other module uses */
const gold = i => (i * 2.3999632) % TAU;
const frac = i => (i * 0.6180339887) % 1;
const frac2 = i => (i * 0.7548776662) % 1;

export function buildMahAscent(ctx) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'mah-ascent';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { lines: 0, decks: 0, bridges: 0, apertures: 0, draws: 0, triangles: 0, tops: {}, derived: {} };

  /* ---- merge helper. No BufferGeometryUtils in this build (LOCKED): every module hand-rolls it. */
  const solid = [];                    /* {geo, matrix, value} for the lit platinum/graphite mass */
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3();
  const at = (x, y, z, ry, sx, sy, sz) => {
    _p.set(x, y, z); _e.set(0, ry || 0, 0); _q.setFromEuler(_e);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(_p, _q, _s).clone();
  };
  const push = (geo, matrix, value) => { solid.push({ geo, matrix, value }); };

  function mergeSolid(list) {
    let n = 0;
    for (const it of list) n += it.geo.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const nm = new THREE.Matrix3(), v = new THREE.Vector3();
    let o = 0;
    for (const it of list) {
      const g = it.geo, P = g.attributes.position, N = g.attributes.normal;
      const idx = g.index ? g.index.array : null;
      nm.getNormalMatrix(it.matrix);
      const cnt = P.count;
      /* expand indexed geometry into a flat list: the merge is non-indexed so the flat facets of
         §06 survive, which is the same choice terrain.js and rainforest.js make */
      const take = i => {
        v.fromBufferAttribute(P, i).applyMatrix4(it.matrix);
        pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
        nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z;
        col[o * 3] = col[o * 3 + 1] = col[o * 3 + 2] = it.value;
        o++;
      };
      if (idx) { for (let i = 0; i < idx.length; i++) take(idx[i]); }
      else { for (let i = 0; i < cnt; i++) take(i); }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o * 3), 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor.subarray(0, o * 3), 3));
    out.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, o * 3), 3));
    return out;
  }

  /* ---- materials ------------------------------------------------------------------------------
     LAW 1 is not negotiable up here either: the deck's walking surface is the black floor (§07),
     its rim and masts are the platinum that catches the horizon, and the beam is emissive. */
  const platinum = (M.platinumLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0xb6c4d6 })).clone();
  platinum.vertexColors = true; platinum.name = 'ascent-platinum'; owned.materials.push(platinum);
  const floor = (M.paving || M.graphite || new THREE.MeshStandardMaterial({ color: 0x0b0f16 })).clone();
  floor.vertexColors = true; floor.name = 'ascent-deck-floor'; owned.materials.push(floor);
  const beamMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energyLight), transparent: true, opacity: 0.30,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  beamMat.name = 'ascent-upper-core'; owned.materials.push(beamMat);
  const sheathMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energy), transparent: true, opacity: 0.10,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true, side: THREE.BackSide
  });
  sheathMat.name = 'ascent-upper-sheath'; owned.materials.push(sheathMat);
  const packetMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energyLight), transparent: true, opacity: 0.70,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  packetMat.name = 'ascent-packet'; owned.materials.push(packetMat);

  const floorSolid = [];               /* the deck tops go in their own bucket: §07 keeps them black */

  /* ============================================================================================
     1. THE CONTINUATION + 2. THE CLOUD PENETRATION
     ============================================================================================ */
  const beams = [];
  const _rank = new THREE.Color();
  const upperGeo = own(new THREE.CylinderGeometry(1, 1, 1, 7, 1, true));
  const upperCore = new THREE.InstancedMesh(upperGeo, beamMat, ASCENTS.length);
  const upperSheath = new THREE.InstancedMesh(upperGeo, sheathMat, ASCENTS.length);
  upperCore.name = 'ascent-upper-core'; upperSheath.name = 'ascent-upper-sheath';
  upperCore.renderOrder = 4; upperSheath.renderOrder = 3;
  for (const m of [upperCore, upperSheath]) { m.frustumCulled = false; group.add(m); }

  ASCENTS.forEach((A, i) => {
    const from = A.h, to = ASCENT.DECK_Y;
    const mid = (from + to) / 2, len = to - from;
    stats.tops[A.id] = { was: from, now: to };
    /* the core keeps fobeam's line radius so the join is invisible; the sheath is the soft halo */
    upperCore.setMatrixAt(i, at(A.x, mid, A.z, 0, 0.62 * A.pod, len, 0.62 * A.pod));
    upperSheath.setMatrixAt(i, at(A.x, mid, A.z, 0, 1.85 * A.pod, len, 1.85 * A.pod));
    /* the same rank fobeam.js gives the ground half. These upper columns never change brightness, so
       one write at build is the whole animation — and without it the hierarchy would be correct from
       the plaza and then flatten out the moment you stood on the deck the lines arrive at. */
    upperCore.setColorAt(i, _rank.setScalar(A.w));
    upperSheath.setColorAt(i, _rank.setScalar(A.w));
    beams.push({ x: A.x, z: A.z, from, to, phase: A.phase, pod: A.pod });
    stats.lines++;

    /* THE APERTURE — a platinum collar of blades at the top of the weather, with a throat disc.
       The blades lean OUTWARD and downward like a funnel the line has punched through, so the form
       says "this was made to let something pass", which a plain ring does not. */
    const ay = ASCENT.THRESHOLD;
    for (let b = 0; b < ASCENT.BLADES; b++) {
      const a = gold(i * 17 + b) + b * TAU / ASCENT.BLADES;
      const bl = ASCENT.COLLAR_R * (0.72 + 0.36 * frac(i * 7 + b));
      const g = chamferBox(2.2, 1.1, bl, 0.35);
      const mm = at(A.x + Math.cos(a) * bl * 0.56, ay - 1.6, A.z + Math.sin(a) * bl * 0.56, -a);
      mm.multiply(new THREE.Matrix4().makeRotationX(-0.34));   /* the funnel leans down and out */
      push(g, mm, 0.92);
    }
    /* the throat: a low chamfered drum the line runs through, dark inside, platinum outside */
    push(chamferBox(ASCENT.COLLAR_R * 0.78, 3.0, ASCENT.COLLAR_R * 0.78, 1.1),
      at(A.x, ay, A.z, gold(i * 3)), 0.80);
    stats.apertures++;

    /* ==========================================================================================
       3. THE ARRIVAL DECK
       ========================================================================================== */
    const dy = ASCENT.DECK_Y, R = ASCENT.DECK_R * (0.86 + 0.20 * frac2(i * 5));
    /* the platform: an octagonal prism, so its silhouette is a cut plate and not a disc (§06) */
    const plate = own(new THREE.CylinderGeometry(R, R * 0.88, 3.2, 8, 1));
    push(plate, at(A.x, dy - 1.6, A.z, gold(i * 11)), 0.34);
    /* the WALKING SURFACE is its own bucket — §07, the black floor is a world law and it does not
       stop being one 700 m up */
    const top = own(new THREE.CylinderGeometry(R * 0.94, R * 0.94, 0.4, 8, 1));
    floorSolid.push({ geo: top, matrix: at(A.x, dy + 0.2, A.z, gold(i * 11)), value: 0.52 });
    /* the RIM — platinum, the thing that catches the horizon and makes the deck read from 700 m
       below as a lit edge rather than as a dark blot */
    for (let s = 0; s < 8; s++) {
      const a = s * TAU / 8 + gold(i * 11);
      const w = 2 * R * Math.tan(Math.PI / 8) * 0.97;
      const g = chamferBox(w, ASCENT.RIM_H, 1.7, 0.45);
      push(g, at(A.x + Math.cos(a) * R * 0.99, dy + ASCENT.RIM_H * 0.5, A.z + Math.sin(a) * R * 0.99, -a + Math.PI / 2), 1.0);
    }
    /* MASTS — THREE, not four, and they are PIERS rather than poles. The first cut put four 2 m
       masts up to 34 m tall on each deck: a 17:1 slenderness that aliases to a hairline, twelve of
       them across three decks reading as a picket fence, and an octahedron finial small enough that
       it came back as a pin head — §06's cone failure arriving at yet another scale. A mast at 5:1
       is a structure; three of them leave sky between and give the deck a silhouette with gaps in
       it, which is what makes a district read as a district and not as a comb. */
    for (let mst = 0; mst < 3; mst++) {
      const a = mst * TAU / 3 + gold(i * 13) + 0.4;
      const mx = A.x + Math.cos(a) * R * 0.70, mz = A.z + Math.sin(a) * R * 0.70;
      const mh = ASCENT.MAST_H * (0.55 + 0.80 * frac(i * 19 + mst));   /* a real height spread */
      push(chamferBox(3.6, mh, 3.6, 0.9), at(mx, dy + mh / 2, mz, a), 0.90);
      /* a collar where the mast meets its head, so the head is carried rather than balanced */
      push(chamferBox(5.0, 1.2, 5.0, 0.4), at(mx, dy + mh - 0.6, mz, a + 0.4), 1.0);
      /* THE SQUARE DIAMOND, and it has to be WIDER THAN TALL or it is a spike wearing the brand's
         name. The figure that crowns the monument is a diamond; a needle is not that figure. */
      /* AND IT HAS TO CLEAR THE COLLAR. At +2.8 with a half-height of 3.2 the diamond's lower half
         sat inside the collar it stands on, so nine of them read as pyramid caps on a colonnade —
         the brand figure present in the geometry and absent from the picture. A square diamond is
         only a square diamond when BOTH pyramids are visible. */
      const d = own(new THREE.OctahedronGeometry(1, 0));
      push(d, at(mx, dy + mh + 4.1, mz, a, 4.0, 3.2, 4.0), 1.0);
      /* a slim neck between collar and diamond, so the figure is carried rather than levitating */
      push(chamferBox(1.1, 1.6, 1.1, 0.3), at(mx, dy + mh + 0.9, mz, a), 0.86);
    }
    /* the ARRIVAL APERTURE the line comes up through: a raised square-diamond collar at the centre */
    for (let c = 0; c < 4; c++) {
      const a = c * TAU / 4 + gold(i * 23);
      push(chamferBox(1.5, 5.2, 4.4, 0.5), at(A.x + Math.cos(a) * 5.0, dy + 2.6, A.z + Math.sin(a) * 5.0, -a), 0.96);
    }
    stats.decks++;
  });
  upperCore.instanceColor.needsUpdate = upperSheath.instanceColor.needsUpdate = true;

  /* ============================================================================================
     THE LIGHT BRIDGES — what makes three pads one district
     ============================================================================================
     The three lines stand 20–65 m apart on the plaza, so their decks do too. Left alone they read as
     three separate objects that happen to be at the same height. A span between each pair — a thin
     platinum deck with a rail — turns them into one arrival district with circulation, which is what
     R3-06 means by "connection to the actual Sky Realm arrival district" and what R3-01 means by a
     dead zone being fixed with circulation rather than with objects. */
  for (let a = 0; a < ASCENTS.length; a++) {
    for (let b = a + 1; b < ASCENTS.length; b++) {
      const A = ASCENTS[a], B = ASCENTS[b];
      const dx = B.x - A.x, dz = B.z - A.z, span = Math.hypot(dx, dz);
      if (span < 8) continue;
      const ry = Math.atan2(dx, dz);
      const cx = (A.x + B.x) / 2, cz = (A.z + B.z) / 2;
      push(chamferBox(5.0, 0.7, span, 0.25), at(cx, ASCENT.DECK_Y + 0.4, cz, ry), 0.30);
      for (const side of [-1, 1]) {
        push(chamferBox(0.5, 1.5, span, 0.18),
          at(cx + Math.cos(ry) * side * 2.5, ASCENT.DECK_Y + 1.3, cz - Math.sin(ry) * side * 2.5, ry), 1.0);
      }
      stats.bridges++;
    }
  }

  /* ---- emit the merged solids ---------------------------------------------------------------- */
  if (solid.length) {
    const mesh = new THREE.Mesh(own(mergeSolid(solid)), platinum);
    mesh.name = 'ascent-structure'; group.add(mesh);
    stats.triangles += mesh.geometry.attributes.position.count / 3;
  }
  if (floorSolid.length) {
    const mesh = new THREE.Mesh(own(mergeSolid(floorSolid)), floor);
    mesh.name = 'ascent-deck-floors'; group.add(mesh);
    stats.triangles += mesh.geometry.attributes.position.count / 3;
  }
  for (const it of solid) if (it.geo && it.geo.dispose && owned.geometries.indexOf(it.geo) < 0) it.geo.dispose();

  /* ---- ASCENDING PACKETS ----------------------------------------------------------------------
     Square diamonds travelling UP the upper leg, so the line is visibly carrying something to the
     deck rather than merely being lit. R3-12: motion that is life, not a pulse on everything. */
  const packGeo = own(new THREE.OctahedronGeometry(1, 0));
  packGeo.scale(0.9, 1.7, 0.9);
  const packets = new THREE.InstancedMesh(packGeo, packetMat, beams.length * ASCENT.PACKETS);
  packets.name = 'ascent-packets'; packets.frustumCulled = false; packets.renderOrder = 5;
  packets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(packets);

  /* ---- R3-05: THE MINI MUSIC LINE AT THE RECEIVER END -----------------------------------------
     fobeam's pads are the emitters and they carry the motif already. The deck is the receiver, and
     the receiver end is the one that did not have one. Sized against the deck, not against a hand. */
  const musicLines = createMusicLineField(ctx, ASCENTS.map((A, i) => ({
    x: A.x + Math.cos(gold(i * 29) + 1.1) * ASCENT.DECK_R * 0.62,
    y: ASCENT.DECK_Y + 1.1,
    z: A.z + Math.sin(gold(i * 29) + 1.1) * ASCENT.DECK_R * 0.62,
    ry: gold(i * 29) + 1.1 + Math.PI,
    /* L23: "miniature" is relative to what it sits on. A 7-bar motif authored at hand scale is
       invisible on a 34 m deck seen from 700 m below. */
    scale: 5.4
  })), { name: 'ascent-musicline' });
  if (musicLines && musicLines.group) group.add(musicLines.group);

  /* LAW 2: every emitter is answered. Three decks of lit platinum 700 m up need the world to know
     they are there, and a pool under each one is what makes the district read from the plaza. */
  if (ctx && typeof ctx.lightPool === 'function') {
    ASCENTS.forEach(A => {
      try { ctx.lightPool({ x: A.x, z: A.z, rx: ASCENT.DECK_R * 1.4, rz: ASCENT.DECK_R * 1.4, k: 0.30, hue: theme.energy }); } catch (e) {}
    });
  }

  stats.draws = 4 + (musicLines && musicLines.stats ? musicLines.stats.draws || 1 : 0);
  stats.derived = { threshold: ASCENT.THRESHOLD, deckY: ASCENT.DECK_Y, lowestLineTop: Math.min(...ASCENTS.map(a => a.h)) };
  /* R4 — WHERE THE DECKS ARE, published once. halo-districts.js rakes its dock beams from these to
     HALO ARRIVAL, and L42's lesson is that when two files each know where a thing is, one of them is
     eventually wrong. This is the file that placed them, so this is the file that says where. */
  stats.sites = ASCENTS.map((A, i) => ({
    id: A.id != null ? A.id : 'ascent-' + i,
    x: A.x, y: ASCENT.DECK_Y, z: A.z, r: ASCENT.DECK_R * (0.86 + 0.20 * frac2(i * 5))
  }));

  let quiet = false;
  const _mm = new THREE.Matrix4(), _pp = new THREE.Vector3(), _qq = new THREE.Quaternion(),
    _ee = new THREE.Euler(), _ss = new THREE.Vector3();

  function writePackets(t) {
    let n = 0;
    for (let bI = 0; bI < beams.length; bI++) {
      const B = beams[bI];
      const span = B.to - B.from;
      for (let k = 0; k < ASCENT.PACKETS; k++) {
        /* each packet runs its own loop, offset by index, so the line never shows a marching rank */
        const u = ((t * (0.055 + 0.030 * frac(bI * 7 + k)) + B.phase + k / ASCENT.PACKETS) % 1);
        const y = B.from + u * span;
        /* they shrink as they climb: the eye reads that as distance and the line as long */
        const s = (1.9 - 0.9 * u) * B.pod;
        _pp.set(B.x, y, B.z);
        _ee.set(0, gold(bI * 11 + k) + t * 0.6, 0); _qq.setFromEuler(_ee);
        _ss.set(s, s * 1.4, s);
        packets.setMatrixAt(n++, _mm.compose(_pp, _qq, _ss));
      }
    }
    packets.instanceMatrix.needsUpdate = true;
  }
  writePackets(0);

  return {
    group, stats,
    update(t) { if (!quiet) writePackets(t); if (musicLines && musicLines.update) musicLines.update(t); },
    setTime(s) {
      /* the beam belongs to the night: by day the sky out-values it and a bright line reads as haze */
      const night = 1 - (s && s.daylight != null ? s.daylight : 0);
      beamMat.opacity = 0.12 + 0.26 * night;
      sheathMat.opacity = 0.04 + 0.09 * night;
      packetMat.opacity = 0.30 + 0.46 * night;
      if (musicLines && musicLines.setTime) musicLines.setTime(s);
    },
    setTheme(th) {
      if (!th) return;
      if (th.energyLight != null) { beamMat.color.setHex(th.energyLight); packetMat.color.setHex(th.energyLight); }
      if (th.energy != null) sheathMat.color.setHex(th.energy);
      if (musicLines && musicLines.setTheme) musicLines.setTheme(th);
    },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      quiet = !!low;
      upperSheath.visible = !low;
      packets.count = low ? Math.round(beams.length * ASCENT.PACKETS * 0.4) : beams.length * ASCENT.PACKETS;
      if (musicLines && musicLines.setQuality) musicLines.setQuality(q);
    },
    dispose() {
      if (musicLines && musicLines.dispose) musicLines.dispose();
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

export default { buildMahAscent, ASCENT };
