/* MAHWORLD :: THE OUTER RING — R3-01's dead-zone closure, and the map that decides where it applies
   ============================================================================================

   R3-01 does not say "add objects to the empty parts". It says something much more specific, and
   the specificity is the whole design:

       Every large empty traversable area must be classified as
         A deliberately open gameplay space · B protected vista corridor · C water/nature reserve ·
         D combat/training arena · E flight/ascent/descent corridor · F under-authored dead zone,
       and ONLY category F gets filled.

       "Empty space must feel intentional. Dense space must feel authored.
        Neither may feel procedurally random."

   MAHWORLD's actual radial structure, measured rather than assumed:

       r    0 –  43   the plaza deck                     dense, authored, finished
       r   43 – 130   the civic district (city.js)       dense, authored, finished
       r  130 – 560   THE RING                           almost entirely empty ground
       r  620 – ...   terrain.js's massif ring
       r      700     Lake City (62 deg) and Rainforest City (127 deg)

   The 430 m of ring is the dead zone, and it is what makes every far-zoom frame read as a small
   dense city marooned in a bowl. But it is NOT uniformly category F, and filling it uniformly would
   destroy four things the world already owns:

     · the two PASS CORRIDORS at 44–80 and 108–146. terrain.js cut those through the massif ring so
       the peer cities can be seen and flown to; travel.js routes through them. They are class B AND
       class E at once, and an outpost in one is an obstacle in a flight path and a blot in a vista.
     · the BASIN at bearing 62, r 330 — terrain.js's reserved water. Class C.
     · the airspace over the three ASCENT lines. Class E.
     · MAH MATCH's approach, which R3-11 wants kept clear for support buildings, not filled with
       street furniture. Class D/A.

   So the ZONES table below IS the density map R3-01's gate 2 asks for. It is a table rather than a
   debug overlay on purpose: an overlay tells one person once, a table is read by the build every
   time and can be asserted in a law test.

   ---- HOW CATEGORY F IS FILLED -----------------------------------------------------------------
   With PLACES, not with props. Scattering benches over 430 m of ground would produce exactly the
   "procedurally random" reading R3-01 forbids — and at the distance most of this ring is seen from,
   a bench is one pixel. What reads at 200–500 m is a COMPOSITION with a lit edge and a silhouette.

   So each F zone gets a small number of OUTPOSTS, widely spaced, with real empty ground between
   them, and every outpost is built from the same six MAHWORLD-specific parts in varying combination:

       TERRACE      a low chamfered civic platform with a step course — the thing you stand on
       LANTERN      a mast carrying a square diamond — the lit edge that makes it read at distance
       BASIN        a shallow black mirror pool — §07's floor law as a landscape element
       GROWTH       a cluster of half-buried crystal, the rainforest's ground family at civic scale
       PYLON        a wayfinding blade, thin and tall, which gives the composition a vertical
       DOCK         a raised pad with a collar — where transport arrives, so the place has a reason

   Nothing here is a new visual language. Every part already exists somewhere in this world, which is
   what stops the ring reading as a different project bolted onto the edge of this one.

   buildOuterRing(ctx) -> the standard module contract. */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox } from './materials.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const polar = (aDeg, r) => [r * Math.cos(aDeg * DEG), -r * Math.sin(aDeg * DEG)];

/* ================================================================================================
   THE DENSITY MAP (R3-01 gate 2). Bearings use terrain.js's convention, which is the one the two
   peer cities and the PASSES table already use — L42's lesson, applied before it can bite again.
   ================================================================================================ */
export const ZONES = Object.freeze([
  /* ---- PRESERVED, and each one for a reason that already exists in another file ---------------- */
  { id: 'pass-lake', from: 40, to: 84, rIn: 130, rOut: 620, cls: 'B',
    why: 'terrain.js PASSES: the sight line and flight route to Lake City' },
  { id: 'basin', from: 46, to: 78, rIn: 200, rOut: 460, cls: 'C',
    why: 'terrain.js BASIN at bearing 62, r 330 — reserved water' },
  { id: 'pass-forest', from: 104, to: 150, rIn: 130, rOut: 620, cls: 'B',
    why: 'terrain.js PASSES: the sight line and flight route to Rainforest City' },
  { id: 'match-approach', from: 246, to: 292, rIn: 130, rOut: 300, cls: 'D',
    why: 'R3-11 keeps MAH MATCH\'s approach for authored support structures, not street furniture' },
  { id: 'ascent-airspace', from: 0, to: 360, rIn: 0, rOut: 130, cls: 'E',
    why: 'the civic core and the three ascent lines; owned by city.js and fobeam.js' },

  /* ---- CATEGORY F: under-authored, and the only class this module builds in -------------------- */
  { id: 'ring-ne', from: 356, to: 40, rIn: 150, rOut: 540, cls: 'F', outposts: 4 },
  { id: 'ring-e', from: 84, to: 104, rIn: 150, rOut: 540, cls: 'F', outposts: 2 },
  { id: 'ring-s', from: 150, to: 246, rIn: 150, rOut: 540, cls: 'F', outposts: 6 },
  { id: 'ring-w', from: 292, to: 356, rIn: 150, rOut: 540, cls: 'F', outposts: 4 }
]);

const gold = i => (i * 2.3999632) % TAU;
const frac = i => (i * 0.6180339887) % 1;
const frac2 = i => (i * 0.7548776662) % 1;
/* an arc that may wrap through 0 */
const arcSpan = Z => (Z.to - Z.from + 360) % 360;
const inArc = (a, Z) => ((a - Z.from + 360) % 360) <= arcSpan(Z);

export function buildOuterRing(ctx) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'outer-ring';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { zones: {}, outposts: 0, parts: {}, draws: 0, triangles: 0, preserved: [], filled: [] };
  for (const Z of ZONES) {
    stats.zones[Z.id] = { cls: Z.cls, from: Z.from, to: Z.to, rIn: Z.rIn, rOut: Z.rOut };
    (Z.cls === 'F' ? stats.filled : stats.preserved).push(Z.id);
  }

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3();
  const at = (x, y, z, ry, sx, sy, sz) => {
    _p.set(x, y, z); _e.set(0, ry || 0, 0); _q.setFromEuler(_e);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(_p, _q, _s).clone();
  };

  /* three merge buckets, and the split is LAW 1 + §07 rather than convenience:
       plat   the platinum that catches the horizon — rims, masts, collars, blades
       deck   the near-black walking and water surfaces (§07 is a world law, and this is world)
       glow   the additive MAHGIC, which is sparse by R3-02 and never wallpaper */
  const B = { plat: [], deck: [] };
  const put = (b, geo, matrix, value) => { B[b].push({ geo, matrix, value }); };

  function merge(list) {
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

  const platinum = (M.platinumLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0xb6c4d6 })).clone();
  platinum.vertexColors = true; platinum.name = 'ring-platinum'; owned.materials.push(platinum);
  const deckMat = (M.paving || M.graphite || new THREE.MeshStandardMaterial({ color: 0x0b0f16 })).clone();
  deckMat.vertexColors = true; deckMat.name = 'ring-deck'; owned.materials.push(deckMat);
  const diamondMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energyLight), transparent: true, opacity: 0.62,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  diamondMat.name = 'ring-lantern'; owned.materials.push(diamondMat);

  const lanterns = [];    /* placement for the instanced square diamonds that crown the lanterns */

  /* ---- THE SIX PARTS -------------------------------------------------------------------------- */
  const P = {
    /* the thing you stand on. Two courses, the upper one inset, so it has a step and a shadow line. */
    terrace(x, z, ry, R) {
      put('plat', chamferBox(R * 2.2, 0.9, R * 1.7, 0.30), at(x, 0.45, z, ry), 0.62);
      put('deck', chamferBox(R * 1.95, 0.7, R * 1.45, 0.22), at(x, 1.15, z, ry), 0.40);
      for (const side of [-1, 1]) {   /* a platinum kerb on the two long edges: the lit line */
        put('plat', chamferBox(R * 2.0, 0.34, 0.5, 0.12),
          at(x + Math.cos(ry + Math.PI / 2) * side * R * 0.78, 1.62,
             z - Math.sin(ry + Math.PI / 2) * side * R * 0.78, ry), 1.0);
      }
      stats.parts.terrace = (stats.parts.terrace || 0) + 1;
    },
    /* the lit edge that makes an outpost read at 400 m: a mast and a square diamond */
    lantern(x, z, ry, h, i) {
      put('plat', chamferBox(1.1, h, 1.1, 0.28), at(x, h / 2, z, ry), 0.88);
      put('plat', chamferBox(1.9, 0.4, 1.9, 0.14), at(x, h - 0.3, z, ry + 0.4), 1.0);
      lanterns.push({ x, y: h + 1.5, z, ry, s: 1.5 + 0.7 * frac(i), phase: gold(i) });
      stats.parts.lantern = (stats.parts.lantern || 0) + 1;
    },
    /* §07 as landscape: a shallow black mirror, which is also R3-01's "reflective basin" */
    basin(x, z, ry, R) {
      put('plat', chamferBox(R * 2.3, 0.55, R * 2.0, 0.35), at(x, 0.28, z, ry), 0.72);
      put('deck', chamferBox(R * 2.0, 0.22, R * 1.7, 0.10), at(x, 0.50, z, ry), 0.18);
      stats.parts.basin = (stats.parts.basin || 0) + 1;
    },
    /* the ground family the rainforest already owns, at civic scale and half-buried (L38) */
    growth(x, z, seed, n) {
      for (let k = 0; k < n; k++) {
        const a = gold(seed + k), rr = 2.5 + 5.5 * frac(seed + k * 3);
        const s = 1.2 + 2.6 * frac2(seed + k * 5), tall = s * (0.45 + 0.5 * frac(seed + k * 7));
        const g = own(new THREE.OctahedronGeometry(1, 0));
        put('deck', g, at(x + Math.cos(a) * rr, 0.12 - tall * 0.40, z + Math.sin(a) * rr,
          gold(seed + k * 11), s, tall, s * 0.86), 0.52);
      }
      stats.parts.growth = (stats.parts.growth || 0) + n;
    },
    /* a wayfinding blade: thin in plan, wide in elevation, so it is a sign and not a post */
    pylon(x, z, ry, h) {
      put('plat', chamferBox(3.4, h, 0.7, 0.22), at(x, h / 2, z, ry), 0.94);
      put('deck', chamferBox(2.9, h * 0.62, 0.34, 0.10), at(x, h * 0.54, z, ry), 0.22);
      put('plat', chamferBox(4.2, 0.5, 1.5, 0.18), at(x, 0.25, z, ry), 0.66);
      stats.parts.pylon = (stats.parts.pylon || 0) + 1;
    },
    /* where transport arrives, so the place has a reason to be a place */
    dock(x, z, ry, R) {
      put('plat', own(new THREE.CylinderGeometry(R, R * 0.86, 1.4, 8, 1)), at(x, 0.7, z, ry), 0.58);
      put('deck', own(new THREE.CylinderGeometry(R * 0.82, R * 0.82, 0.3, 8, 1)), at(x, 1.5, z, ry), 0.34);
      for (let c = 0; c < 4; c++) {
        const a = c * TAU / 4 + ry;
        put('plat', chamferBox(0.7, 2.6, 0.7, 0.2), at(x + Math.cos(a) * R * 0.9, 2.7, z + Math.sin(a) * R * 0.9, a), 1.0);
      }
      stats.parts.dock = (stats.parts.dock || 0) + 1;
    }
  };

  /* ---- PLACE THE OUTPOSTS ---------------------------------------------------------------------
     Deterministic, and spaced by CONSTRUCTION rather than by rejection sampling: each F zone divides
     its own arc into as many slots as it has outposts and places one per slot, jittered inside it.
     That guarantees the spacing R3-01 asks for — real empty ground between places — without a
     retry loop that could fail differently on a different build. */
  let n = 0;
  for (const Z of ZONES) {
    if (Z.cls !== 'F') continue;
    const span = arcSpan(Z), slots = Z.outposts || 0;
    for (let k = 0; k < slots; k++) {
      const seed = n * 37 + 11;
      const a = Z.from + span * ((k + 0.22 + 0.56 * frac(seed)) / slots);
      const r = Z.rIn + (Z.rOut - Z.rIn) * (0.18 + 0.68 * frac2(seed * 3));
      const [x, z] = polar(a, r);
      const ry = (a + 90) * DEG + (frac(seed * 5) - 0.5) * 0.8;   /* roughly facing the plaza */
      const kind = Math.floor(frac(seed * 7) * 3);

      /* three compositions, so the ring has variety without a fourth vocabulary. Each one is a
         PLACE: something to stand on, something lit, something living, something vertical. */
      if (kind === 0) {                       /* a TERRACE outpost — the civic one */
        P.terrace(x, z, ry, 7 + 4 * frac(seed * 11));
        P.lantern(x + Math.cos(ry) * 9, z - Math.sin(ry) * 9, ry, 9 + 5 * frac(seed * 13), n * 3);
        P.lantern(x - Math.cos(ry) * 9, z + Math.sin(ry) * 9, ry, 8 + 5 * frac(seed * 17), n * 3 + 1);
        P.growth(x + Math.sin(ry) * 14, z + Math.cos(ry) * 14, seed * 19, 5);
        P.pylon(x + Math.sin(ry) * -12, z + Math.cos(ry) * -12, ry, 14 + 7 * frac(seed * 23));
      } else if (kind === 1) {                /* a BASIN outpost — the water/nature one */
        P.basin(x, z, ry, 9 + 5 * frac(seed * 11));
        P.lantern(x + Math.cos(ry) * 13, z - Math.sin(ry) * 13, ry, 11 + 6 * frac(seed * 13), n * 3);
        P.growth(x + Math.sin(ry) * 16, z + Math.cos(ry) * 16, seed * 19, 7);
        P.growth(x - Math.sin(ry) * 15, z - Math.cos(ry) * 15, seed * 29, 4);
      } else {                                /* a DOCK outpost — the transport one */
        P.dock(x, z, ry, 6 + 3 * frac(seed * 11));
        P.terrace(x + Math.sin(ry) * 16, z + Math.cos(ry) * 16, ry, 5.5 + 2.5 * frac(seed * 31));
        P.lantern(x + Math.cos(ry) * 11, z - Math.sin(ry) * 11, ry, 13 + 6 * frac(seed * 13), n * 3);
        P.pylon(x - Math.cos(ry) * 10, z + Math.sin(ry) * 10, ry + 0.6, 12 + 6 * frac(seed * 23));
        P.growth(x - Math.sin(ry) * 13, z - Math.cos(ry) * 13, seed * 19, 4);
      }
      /* LAW 2: every emitter is answered. Two lanterns and a lit kerb on a black plain need a pool
         under them or the outpost floats at night. */
      if (ctx && typeof ctx.lightPool === 'function') {
        try { ctx.lightPool({ x, z, rx: 26, rz: 26, k: 0.24, hue: theme.energy }); } catch (e) {}
      }
      stats.outposts++; n++;
    }
  }

  if (B.plat.length) {
    const m = new THREE.Mesh(own(merge(B.plat)), platinum);
    m.name = 'ring-platinum'; group.add(m);
    stats.triangles += m.geometry.attributes.position.count / 3;
  }
  if (B.deck.length) {
    const m = new THREE.Mesh(own(merge(B.deck)), deckMat);
    m.name = 'ring-deck'; group.add(m);
    stats.triangles += m.geometry.attributes.position.count / 3;
  }
  for (const it of B.plat.concat(B.deck)) if (it.geo && it.geo.dispose && owned.geometries.indexOf(it.geo) < 0) it.geo.dispose();

  /* the lantern diamonds: ONE instanced mesh, and they breathe rather than blink (R3-12) */
  const lampGeo = own(new THREE.OctahedronGeometry(1, 0));
  const lamps = new THREE.InstancedMesh(lampGeo, diamondMat, Math.max(1, lanterns.length));
  lamps.name = 'ring-lanterns'; lamps.frustumCulled = false; lamps.renderOrder = 4;
  lamps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(lamps);

  stats.draws = 3;

  const _mm = new THREE.Matrix4(), _pp = new THREE.Vector3(), _qq = new THREE.Quaternion(),
    _ee = new THREE.Euler(), _ss = new THREE.Vector3();
  function writeLamps(t) {
    for (let i = 0; i < lanterns.length; i++) {
      const L = lanterns[i];
      /* R3-12: a slow breath and a slow turn. Not a pulse, not a blink, and no two in step. */
      const b = 1 + 0.10 * Math.sin(t * 0.45 + L.phase);
      _pp.set(L.x, L.y + 0.25 * Math.sin(t * 0.30 + L.phase), L.z);
      _ee.set(0, L.ry + t * 0.09 + L.phase, 0); _qq.setFromEuler(_ee);
      _ss.set(L.s * b, L.s * 1.4 * b, L.s * b);
      lamps.setMatrixAt(i, _mm.compose(_pp, _qq, _ss));
    }
    lamps.instanceMatrix.needsUpdate = true;
  }
  writeLamps(0);

  let quiet = false;
  return {
    group, stats,
    update(t) { if (!quiet) writeLamps(t); },
    setTime(s) {
      const night = 1 - (s && s.daylight != null ? s.daylight : 0);
      diamondMat.opacity = 0.20 + 0.50 * night;
    },
    setTheme(th) { if (th && th.energyLight != null) diamondMat.color.setHex(th.energyLight); },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      quiet = !!low;
      lamps.count = low ? Math.round(lanterns.length * 0.5) : lanterns.length;
    },
    dispose() {
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

export default { buildOuterRing, ZONES };
