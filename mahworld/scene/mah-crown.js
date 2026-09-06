/* MAHWORLD R5 :: MAH CROWN — the sanctuary's ultra-tall central landmark.

   R5 locks it: "MAH CROWN is the primary ultra-tall sanctuary skyscraper/vertical landmark...
   EXTREMELY TALL. Preserve the emotional height/vertical dominance of the supplied blue-tower
   reference. Do not shrink it into a decorative tower."

   ---- THE PROBLEM R5 HANDS THIS FILE, AND ITS ONE HONEST ANSWER ---------------------------------
   MAH CROWN belongs at "the visual and navigational center of MAH HALO". MAH HALO is a RING, and
   the centre of a ring is a HOLE — 666 m of open air with MAHPLAZA 1841 m below it. R4 chose that
   hole deliberately and said why: a disc at this altitude puts a ceiling over MAHWORLD'S NIGHT SKY
   and erases the moon, the galaxy band and the star field from every ground camera in the world.

   So the tower cannot stand on the ring (there is no centre to stand on) and it must not fill the
   hole (that is the thing the hole exists to prevent). It is CARRIED ACROSS IT.

   EIGHT SPARS reach in from the inner rim to a hub 120 m across, and eight STAYS run from a collar
   at y 2360 back down to each spar's midspan — so the load path is legible from below and the
   structure reads as engineered rather than as a tower that happens to float. The plinth occupies
   r < 120 of a 666 m hole: 3.2% of its area. Look up from MAHPLAZA and you still see sky, the moon
   and the stars — with a 1.8 km tower rising through the eye of the halo, which is a better view
   than an empty hole and costs R4's clause nothing.

   ---- THE HEIGHT IS THE POINT, SO IT IS DERIVED AND NOT CHOSEN ---------------------------------
       inner rim deck            y 1841.6   (haloHeight at R_IN - APRON)
       plinth top                y 1901.6   60 m
       shaft top                 y 3380     five segments, 180 m across down to 96
       crown top                 y 3560     stepped diamond plates
       mast tip                  y 3620
       -> 1778 m above its own base, 3620 m above MAHPLAZA

   For scale inside this world: city.js's tallest ghost shaft is 900 m and its megatalls top out at
   392 m. MAH CROWN is more than four times the tallest thing MAHWORLD had. It is also the reason
   R5 §8 says the dome apex must clear it — the dome springs at the outer rim and closes at 3900,
   leaving 280 m over the mast.

   ---- WHAT THE REFERENCE CONTRIBUTES, AND WHAT IT DOES NOT -------------------------------------
   The supplied night tower gives FOUR things and no more: extreme verticality with the top lost in
   cloud, a narrow/tall proportion, a repeated luminous LINE rhythm (horizontal banding on one face,
   vertical dashes on the other), and rare warm interior glimpses against an otherwise cold facade.
   R5 forbids the rest by name — no real geometry, no signage, no city identity, no proprietary
   facade pattern — and MAHWORLD's own genome supplies what replaces it: platinum ribs, dark
   crystal depth, crystalline glass, square-diamond nodes and MAHGIC vertical channels.

   ---- THE SLENDERNESS IS DELIBERATE AND IT IS STILL BOUNDED -------------------------------------
   1778 m over a 180 m base is 9.9:1. §06 and L58 forbid NEEDLES, and the number that lesson was
   written about is 23:1 — a mast so thin it aliases to a crawling hairline. A supertall at 10:1 is
   the proportion the reference actually has, it is what real supertalls are, and it holds a
   silhouette at every distance in this world. Thinner than that would fail §06; thicker would fail
   R5's "do not shrink it into a decorative tower".

   buildMahCrown(ctx, opts) -> the standard module contract, plus setDetail(distance), navSites()
   and heightAt/contains so roam can stand on the plinth. */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox } from './materials.js';
import { HALO, haloHeight } from './halo.js';

const TAU = Math.PI * 2;
const gold = i => (i * 0.6180339887) % 1;
const frac = i => (i * 0.7548776662) % 1;

/* ================================================================================================
   THE ONE PLACE MAH CROWN'S GEOMETRY IS DESCRIBED. Every other file that needs a number about the
   tower reads it from here — the dome has to clear it, the law suite has to assert its height, and
   two tables describing one tower is how a dome ends up 40 m through a spire (L42).
   ================================================================================================ */
export const CROWN = Object.freeze({
  X: 0, Z: 0,
  /* the deck the structure is founded on: the inner rim's own height, so the spars are level */
  BASE_Y: HALO.Y + Math.pow(HALO.R_IN - HALO.APRON - HALO.R_MID, 2) / (2 * HALO.R_DISH),
  HUB_R: 120,            /* the plinth's half-width — 3.2% of the hole's area, so the sky survives */
  PLINTH_H: 60,
  SPARS: 8,
  STAY_Y: 2360,          /* where the stays leave the shaft */
  /* the shaft: five segments, each a square-diamond prism, tapering */
  SEG_Y: Object.freeze([1901.6, 2270, 2620, 2930, 3180, 3380]),
  SEG_W: Object.freeze([180, 162, 143, 124, 108, 96]),
  CROWN_TOP: 3560,
  MAST_TOP: 3620,
  BAND: 26               /* the facade's luminous band pitch in metres — the reference's rhythm */
});

export function crownHeight() { return CROWN.MAST_TOP - CROWN.BASE_Y; }
/* is this point on the plinth deck? roam needs an analytic answer, like the halo's own */
export function onCrown(x, z) {
  return Math.max(Math.abs(x - CROWN.X), Math.abs(z - CROWN.Z)) <= CROWN.HUB_R;
}
export function crownFloor(x, z) {
  return onCrown(x, z) ? CROWN.BASE_Y + CROWN.PLINTH_H : null;
}

export function buildMahCrown(ctx, opts = {}) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'mah-crown';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = {
    draws: 0, triangles: 0, spars: 0, stays: 0, segments: 0, bands: 0, nodes: 0,
    baseY: +CROWN.BASE_Y.toFixed(1), plinthTop: +(CROWN.BASE_Y + CROWN.PLINTH_H).toFixed(1),
    mastTop: CROWN.MAST_TOP, height: +crownHeight().toFixed(1),
    /* published so the dome can clear it and a test can assert it, rather than either guessing */
    slenderness: +(crownHeight() / CROWN.SEG_W[0]).toFixed(2)
  };

  /* ---- placement. The tower is at the world axis, so nothing here rides the shell normal: the
     halo's 3.4 deg tilt is a property of its DECK, and a 1.8 km tower leaning 3.4 degrees would be
     a mistake nobody could unsee. Everything is world-vertical, placed by an explicit y. ---- */
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3();
  function at(x, y, z, ry, sx, sy, sz) {
    _p.set(x, y, z); _e.set(0, ry == null ? 0 : ry, 0); _q.setFromEuler(_e);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(_p, _q, _s).clone();
  }
  /* a matrix with a PITCH, for the stays and spars that rake. mat-with-yaw cannot express a rake,
     and this project has now shipped three separate "raked" members that were horizontal bars. */
  const _v = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _qq = new THREE.Quaternion();
  function along(ax, ay, az, bx, by, bz, w, d, value, bucket) {
    _v.set(bx - ax, by - ay, bz - az);
    const len = _v.length(); _v.normalize();
    _qq.setFromUnitVectors(_up, _v);          /* the box's local +Y runs along the member */
    _p.set((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
    _s.set(1, 1, 1);
    put(bucket || 'plat', chamferBox(w, len, d, Math.min(w, d) * 0.22),
      _m.compose(_p, _qq, _s).clone(), value);
    return len;
  }

  const B = { plat: [], dark: [], glass: [] };
  const put = (b, geo, matrix, value) => B[b].push({ geo, matrix, value });

  /* ---- materials. Three, and the separation is R5 §17: "cold premium platinum/crystal
     verticality, sharp but controlled specular rhythm, dark depth, clear crystalline hierarchy,
     selective luminous bands." ---------------------------------------------------------------- */
  const platinum = (M.platinumLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0xb6c4d6 })).clone();
  platinum.vertexColors = true; platinum.name = 'crown-platinum'; owned.materials.push(platinum);
  const darkMat = (M.graphiteMetal || M.paving || new THREE.MeshStandardMaterial({ color: 0x0b0f16 })).clone();
  darkMat.vertexColors = true; darkMat.name = 'crown-dark';
  /* THE TOWER'S OWN GRADE. §07's ladder runs hero r0.045 across 43 m, district r0.56 across 150 m,
     shell r0.78 across 2700 m — all WALKING surfaces, read at grazing incidence. A facade is read
     at NORMAL incidence from hundreds of metres, where a low roughness is a legible crystal and not
     a mirror streak, so the tower sits back down the ladder at 0.30 with a strong environment
     term. This is the one surface in the sanctuary that is meant to catch the sky. */
  darkMat.roughness = 0.30; darkMat.envMapIntensity = 0.85;
  owned.materials.push(darkMat);
  /* the crystalline glass: R5 asks for "alternating clear / smoked / reflective crystalline bands"
     and "rare hero windows/interior glimpses" */
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x121c2c, metalness: 0.10, roughness: 0.05, transparent: true, opacity: 0.42,
    envMapIntensity: 1.5, vertexColors: true, side: THREE.DoubleSide, depthWrite: false
  });
  glassMat.name = 'crown-glass'; owned.materials.push(glassMat);
  /* the MAHGIC vertical channels — the reference's luminous line rhythm, and the ONLY emissive
     thing on the tower. Unlit and additive so it reads as light in the crystal rather than as a
     painted stripe, which is what the laser references contribute (R4) and R5 inherits. */
  const lineMat = new THREE.MeshBasicMaterial({
    color: theme.energyLight || 0xdff1ff, transparent: true, opacity: 0.66,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: true
  });
  lineMat.name = 'crown-mahgic-line'; owned.materials.push(lineMat);

  const LB = [];   /* the luminous band bucket, merged separately so it can be dimmed as one */
  const putLine = (geo, matrix, value) => LB.push({ geo, matrix, value });

  /* the square-diamond PLAN. A prism whose cross-section is a square standing on its corner: four
     radial segments, which is the same four residents.js lathes a head over and the same figure the
     whole world is built from. CylinderGeometry(1,1,1,4) puts its vertices on the axes, which IS
     the diamond — no rotation needed, and the flats face the four diagonals. */
  function diamondPrism(w, h) {
    const g = new THREE.CylinderGeometry(1, 1, 1, 4, 1);
    g.scale(w * 0.5, h, w * 0.5);
    return own(g);
  }
  /* a tapered one, for the shaft segments */
  function diamondTaper(wBot, wTop, h) {
    const g = new THREE.CylinderGeometry(wTop * 0.5, wBot * 0.5, h, 4, 1);
    return own(g);
  }

  /* ================================================================================================
     1. THE SPARS AND STAYS — how a tower stands over a hole
     ============================================================================================== */
  {
    const rimR = HALO.R_IN - HALO.APRON;              /* 666 — where the shell's inner edge is */
    const rimY = haloHeight(rimR, 0);
    for (let i = 0; i < CROWN.SPARS; i++) {
      const a = (i / CROWN.SPARS) * TAU + Math.PI / CROWN.SPARS;
      const ca = Math.cos(a), sa = Math.sin(a);
      /* THE SPAR: rim to hub, a deep box because 546 m of span is not a bar. 14 m deep at 546 m is
         39:1, which for a truss carrying only its own deck is the right order — and it is DEEP
         enough to read as structure from the plaza 1841 m below, which is the view that matters. */
      const x0 = ca * (rimR - 4), z0 = sa * (rimR - 4);
      const x1 = ca * (CROWN.HUB_R - 8), z1 = sa * (CROWN.HUB_R - 8);
      const len = Math.hypot(x1 - x0, z1 - z0);
      put('dark', chamferBox(len, 13, 22, 3.2), at((x0 + x1) * 0.5, rimY - 6, (z0 + z1) * 0.5, -a), 0.26);
      /* the walking deck on top of it: near-black, kerbed in platinum — §07, unchanged at altitude */
      put('dark', chamferBox(len, 1.2, 17, 0.5), at((x0 + x1) * 0.5, rimY + 0.6, (z0 + z1) * 0.5, -a), 0.30);
      for (const side of [-1, 1]) {
        put('plat', chamferBox(len, 1.5, 1.3, 0.3),
          at((x0 + x1) * 0.5 - sa * side * 9, rimY + 1.4, (z0 + z1) * 0.5 + ca * side * 9, -a), 0.98);
      }
      /* THE STAY: from a collar high on the shaft down to the spar's midspan, so the load path is
         visible. This is the member that makes the whole thing read as engineered. */
      const mx = (x0 + x1) * 0.5, mz = (z0 + z1) * 0.5;
      along(ca * 52, CROWN.STAY_Y, sa * 52, mx, rimY + 2, mz, 4.4, 4.4, 0.92, 'plat');
      /* and a shorter back-stay to the rim end, which is where the span is longest */
      along(ca * 44, CROWN.STAY_Y - 340, sa * 44, x0 + ca * 40, rimY + 2, z0 + sa * 40, 3.0, 3.0, 0.86, 'plat');
      stats.spars++; stats.stays += 2;

      /* a square-diamond node where each spar meets the rim — the brand figure at the joint */
      const nd = own(new THREE.OctahedronGeometry(1, 0));
      put('plat', nd, at(x0, rimY + 4.6, z0, a, 9, 6.4, 9), 1.0);
      stats.nodes++;
    }
    /* THE HUB PLINTH: the tower's foot, and the one piece of walkable floor at the sanctuary's
       centre. Square-diamond in plan like everything above it. */
    put('dark', diamondPrism(CROWN.HUB_R * 2, CROWN.PLINTH_H),
      at(0, CROWN.BASE_Y + CROWN.PLINTH_H * 0.5, 0, 0), 0.24);
    put('dark', diamondPrism(CROWN.HUB_R * 2 + 14, 3.0),
      at(0, CROWN.BASE_Y + CROWN.PLINTH_H - 1.5, 0, 0), 0.30);
    /* the plinth's edge in platinum — verticals and edges, never the floor (§07) */
    put('plat', diamondPrism(CROWN.HUB_R * 2 + 16, 1.8),
      at(0, CROWN.BASE_Y + CROWN.PLINTH_H + 0.9, 0, 0), 1.0);
    /* eight buttresses flaring off the plinth, so the shaft grows out of a base instead of
       balancing on one — the reference's towers all widen at the bottom and it is why they stand */
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a);
      along(ca * 74, CROWN.BASE_Y + 4, sa * 74, ca * 26, CROWN.BASE_Y + CROWN.PLINTH_H + 96, sa * 26,
        7, 7, 0.88, 'plat');
    }
  }

  /* ================================================================================================
     2. THE SHAFT — five tapering square-diamond segments, and the reference's line rhythm
     ============================================================================================== */
  {
    for (let k = 0; k < CROWN.SEG_Y.length - 1; k++) {
      const y0 = CROWN.SEG_Y[k], y1 = CROWN.SEG_Y[k + 1];
      const w0 = CROWN.SEG_W[k], w1 = CROWN.SEG_W[k + 1];
      const h = y1 - y0;
      /* the segment's dark crystal core */
      put('dark', diamondTaper(w0, w1, h), at(0, (y0 + y1) * 0.5, 0, 0), 0.22 + 0.03 * k);
      /* FOUR CORNER RIBS running the segment's full height. The reference's verticality is carried
         by continuous lines, not by stacked boxes: a rib that runs 350 m unbroken is what makes the
         eye travel. They sit on the diamond's VERTICES, which are the four world axes. */
      for (let q = 0; q < 4; q++) {
        const a = q * Math.PI / 2;
        const r0 = w0 * 0.5, r1 = w1 * 0.5;
        along(Math.cos(a) * r0, y0, Math.sin(a) * r0, Math.cos(a) * r1, y1, Math.sin(a) * r1,
          5.5 - 0.5 * k, 5.5 - 0.5 * k, 0.94, 'plat');
      }
      /* a SETBACK COLLAR at each junction — the horizontal that lets the eye measure the climb */
      put('plat', diamondPrism(w1 + 13, 4.6), at(0, y1, 0, Math.PI / 4), 1.0);
      put('dark', diamondPrism(w1 + 7, 2.0), at(0, y1 + 3.6, 0, 0), 0.34);

      /* THE LUMINOUS BANDS. This is the reference's single strongest quality — a repeated line
         rhythm that COMPRESSES with perspective and is the only reason a photograph of a tower
         reads as tall. The pitch is constant in metres (26 m), so the compression is real
         perspective rather than an authored trick, and the bands stop being resolvable long before
         they alias because they fade with the segment's own LOD. */
      const n = Math.floor(h / CROWN.BAND);
      for (let b = 1; b < n; b++) {
        const t = b / n, y = y0 + h * t, w = w0 + (w1 - w0) * t;
        /* the band is a thin diamond ring, inset just proud of the core */
        putLine(diamondPrism(w + 1.2, 0.55), at(0, y, 0, 0), 0.55 + 0.45 * frac(k * 7 + b));
        stats.bands++;
      }
      /* and a SMOKED GLASS face on two of the four flats, alternating by segment — R5's "alternating
         clear / smoked / reflective crystalline bands", at the scale of a whole elevation */
      for (let q = 0; q < 4; q++) {
        if ((q + k) % 2) continue;
        const a = q * Math.PI / 2 + Math.PI / 4;      /* the FLATS are on the diagonals */
        const rm = (w0 + w1) * 0.25 * 0.94;
        put('glass', chamferBox(0.8, h * 0.94, (w0 + w1) * 0.5 * 0.62, 0.2),
          at(Math.cos(a) * rm, (y0 + y1) * 0.5, Math.sin(a) * rm, -a), 0.44);
      }
      stats.segments++;
    }
  }

  /* ================================================================================================
     3. THE CROWN — stepped diamond plates and a mast, and the silhouette is the whole job
     ============================================================================================== */
  {
    const y0 = CROWN.SEG_Y[CROWN.SEG_Y.length - 1], wTop = CROWN.SEG_W[CROWN.SEG_W.length - 1];
    const steps = 6, span = CROWN.CROWN_TOP - y0;
    for (let s = 0; s < steps; s++) {
      const t = s / steps, y = y0 + span * t;
      /* each plate is WIDER THAN TALL and each is narrower than the last: a crown, not a spike.
         §06's square-diamond rule holds at 3.5 km up exactly as it does at eye level. */
      const w = wTop * (1.22 - 0.62 * t);
      put('plat', diamondPrism(w, 5.2), at(0, y, 0, (s % 2) * Math.PI / 4), 1.0);
      put('dark', diamondPrism(w * 0.88, span / steps - 6), at(0, y + span / steps * 0.5, 0, 0), 0.28);
      putLine(diamondPrism(w * 0.9, 0.7), at(0, y + 3.4, 0, 0), 0.9);
      stats.bands++;
    }
    /* the apex node: the largest square diamond in MAHWORLD, and the thing the dome has to clear */
    const cap = own(new THREE.OctahedronGeometry(1, 0));
    put('plat', cap, at(0, CROWN.CROWN_TOP + 14, 0, 0, 34, 24, 34), 1.0);
    stats.nodes++;
    /* the mast. It is allowed to be slender BECAUSE it is a mast and not a tower — but it still
       takes a section from its height rather than a literal (L58): 60 m over h/6 is 10 m. */
    const mh = CROWN.MAST_TOP - (CROWN.CROWN_TOP + 14);
    const mw = Math.max(6, mh / 6);
    put('plat', diamondPrism(mw, mh), at(0, CROWN.CROWN_TOP + 14 + mh * 0.5, 0, Math.PI / 4), 1.0);
    putLine(diamondPrism(mw * 0.55, mh * 0.92), at(0, CROWN.CROWN_TOP + 14 + mh * 0.5, 0, Math.PI / 4), 1.0);
  }

  /* ---- merge -------------------------------------------------------------------------------- */
  const MATS = { plat: platinum, dark: darkMat, glass: glassMat };
  for (const k of Object.keys(B)) {
    if (!B[k].length) continue;
    const mesh = new THREE.Mesh(own(mergeSolids(B[k])), MATS[k]);
    mesh.name = 'crown-' + k; mesh.frustumCulled = false;
    if (k === 'glass') mesh.renderOrder = 3;
    group.add(mesh); stats.draws++;
    stats.triangles += mesh.geometry.attributes.position.count / 3;
  }
  let bandMesh = null;
  if (LB.length) {
    bandMesh = new THREE.Mesh(own(mergeSolids(LB)), lineMat);
    bandMesh.name = 'crown-bands'; bandMesh.frustumCulled = false; bandMesh.renderOrder = 4;
    group.add(bandMesh); stats.draws++;
    stats.triangles += bandMesh.geometry.attributes.position.count / 3;
  }
  for (const k of Object.keys(B)) for (const it of B[k]) {
    if (it.geo && it.geo.dispose && owned.geometries.indexOf(it.geo) < 0) it.geo.dispose();
  }

  /* the plinth deck registered for roam, the way every standable object in this world is (L47: a
     MESH, because the assembly's collider filter is `o.isMesh` and drops a Box3 without a word) */
  if (ctx && ctx.colliders) {
    const proxy = new THREE.Mesh(own(new THREE.BoxGeometry(CROWN.HUB_R * 1.4, 2.0, CROWN.HUB_R * 1.4)));
    proxy.position.set(0, CROWN.BASE_Y + CROWN.PLINTH_H - 1.0, 0);
    proxy.visible = false; proxy.name = 'crown-plinth-floor';
    proxy.updateMatrixWorld(true);
    group.add(proxy); ctx.colliders.push(proxy);
  }

  /* ---- the module contract -------------------------------------------------------------------- */
  let quiet = false;
  return {
    group, stats, CROWN,
    setTime(s) {
      /* by day the crystal reads on reflection; at night the MAHGIC lines are what say alive */
      const night = 1 - (s && s.daylight != null ? s.daylight : 0);
      lineMat.opacity = 0.22 + 0.52 * night;
      darkMat.envMapIntensity = 0.62 + 0.30 * night;
    },
    setTheme(t) {
      if (t && t.energyLight) lineMat.color.setHex(t.energyLight);
      if (t && t.energy) theme.energy = t.energy;
    },
    setDetail(dist) {
      /* R5 §19: hierarchical LOD, "simplified crown silhouette LOD". The BANDS are the first thing
         to go — a 0.55 m ring at 4 km is well under a pixel and is exactly the geometry that
         crawls — and the glass goes with them. The silhouette never goes: it is the landmark. */
      if (bandMesh) bandMesh.visible = dist < 5200;
      const g = group.getObjectByName('crown-glass');
      if (g) g.visible = dist < 6500;
      return dist < 5200 ? 'near' : 'far';
    },
    setState() { },
    setQuality(q) {
      quiet = (q === 'low' || (q && q.name === 'low'));
      if (bandMesh) bandMesh.visible = !quiet;
    },
    update() { },
    navSites() {
      /* you arrive on the plinth, at its edge, looking UP the shaft — arriving inside a tower is
         the one failure a teleport must never have (travel.js makes the same choice at city scale) */
      const y = CROWN.BASE_Y + CROWN.PLINTH_H + 1.9;
      return [{ id: 'mah-crown', label: 'MAH CROWN', sub: 'the sanctuary tower',
        x: 0, z: CROWN.HUB_R - 22, y, look: [0, CROWN.SEG_Y[3], 0] }];
    },
    dispose() {
      for (const g of owned.geometries) { try { g.dispose(); } catch (e) { } }
      for (const m of owned.materials) { try { m.dispose(); } catch (e) { } }
      if (group.parent) group.parent.remove(group);
    }
  };
}

/* hand-rolled, as in every module here: no addons, and the value rides in as vertex colour */
function mergeSolids(list) {
  let n = 0;
  for (const it of list) { const g = it.geo; n += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const nm = new THREE.Matrix3(), v = new THREE.Vector3();
  let o = 0;
  for (const it of list) {
    const g = it.geo, P = g.attributes.position, N = g.attributes.normal;
    const idx = g.index ? g.index.array : null;
    nm.getNormalMatrix(it.matrix);
    const take = i => {
      v.fromBufferAttribute(P, i).applyMatrix4(it.matrix);
      pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z;
      col[o * 3] = col[o * 3 + 1] = col[o * 3 + 2] = it.value;
      o++;
    };
    if (idx) { for (let i = 0; i < idx.length; i++) take(idx[i]); }
    else { for (let i = 0; i < P.count; i++) take(i); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o * 3), 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor.subarray(0, o * 3), 3));
  out.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, o * 3), 3));
  return out;
}

export default { buildMahCrown, CROWN, crownHeight, onCrown, crownFloor };
