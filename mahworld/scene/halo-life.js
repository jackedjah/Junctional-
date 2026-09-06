/* MAHWORLD :: MAH HALO — the social life on the ring (R4 implementation order, item 16)
   ============================================================================================

   R4's DENSITY LAW is the reason this file exists, and it is blunt about the stakes: "Because HALO
   may occupy roughly half of ordinary gameplay it cannot be a sparse tech demo." Its CURVATURE
   PROOF ends on the same note — the last required view is "district-to-district view feels
   INHABITED". Every render of this pass has failed that line. Eight districts were built, furnished,
   plated and lit, and the whole 6800 m ring contained exactly ONE MAHBEING: the FORUM speaker.

   ---- WHY THIS IS NOT ctx.residentSpots -------------------------------------------------------
   The obvious move is to push fifty spots into ctx.residentSpots and let residents.js build them.
   That is what the plaza does, and at plaza scale it is right. Here it is wrong twice over:

     · residents.populate() makes a FULL canonical MAHBEING per spot with no distance tier, and they
       are permanent scene children. Fifty of them is fifty fully-detailed figures always resident,
       which R4's PERFORMANCE clause forbids by name ("pooled props, animation tiers, hierarchical
       LOD") and which §19's draw budget cannot absorb.
     · a crowd is not a cast. The plaza's residents are NAMED fixtures with ids, poses and notes,
       each one placed for a reason. A sanctuary's social life is a population.

   So this is part-major (L48): one InstancedMesh per PART TYPE across the whole population. Five
   parts and a shadow is SIX DRAWS for the entire inhabited ring, and because a limb is an instance
   and an instance has a transform, they can still move.

   ---- THE SPECIES IS NOT INVENTED HERE --------------------------------------------------------
   residents.js is the authority and this file is its far-tier echo, not a second species. From it:
   a hovering figure about 2.0 m tall (1.9 female), a TEARDROP lower body rather than legs, a
   torso that narrows to a waist, a SQUARE-DIAMOND HEAD SLAB about 0.19 x 0.215 x 0.2 at scale, two
   arms, and a shadow whose firmness tracks hover height. The palette entries are residents.js's own
   PALETTES values, quoted, so a HALO crowd and a plaza resident are the same people.

   R4: "avatar colors remain independent" — every figure carries its own instanceColor drawn from
   that palette by a deterministic irrational, never a global tint. Nothing here writes a colour to
   all of them.

   buildHaloLife(ctx, { nodes }) -> the standard module contract, plus setDetail(distance). */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox } from './materials.js';
import { HALO, haloHeight, haloNormal } from './halo.js';

const TAU = Math.PI * 2;
const gold = i => (i * 2.3999632) % TAU;
const frac = i => (i * 0.6180339887) % 1;
const frac2 = i => (i * 0.7548776662) % 1;

/* residents.js PALETTES, quoted rather than re-invented — same people, one tier further away. The
   two neutrals are last so the deterministic pick lands on them about as often as on a hue, which
   is what keeps a crowd from reading as a paint chart. */
const TINTS = [0x2f6fe6, 0x9b3fd6, 0x2bb5b8, 0x3fb56a, 0x7c5cf0, 0xc6d2e0, 0xaebbcb];

export const LIFE = Object.freeze({
  H: 2.0,              /* residents.js defaultH, male, physique 1.0 */
  HOVER: 0.16,         /* the species floats; the shadow below is how you know */
  LOD_NEAR: 220,       /* inside this the population is posed per frame */
  LOD_FAR: 1400        /* beyond this it is hidden entirely — see setDetail */
});

/* ================================================================================================
   THE SOCIAL NODES. A node is a PLACE PEOPLE ARE, not a scatter — R4's density law distinguishes
   "high-density social nodes" from "huge calm movement fields" and both are authored. Each entry is
   [district degrees, along-ring metres, across-ring metres, count, kind], and the kind decides the
   grouping: a RING faces inward at a centre, a ROW faces one way, a PAIR turns to each other.
   ================================================================================================ */
const NODES = [
  /* ARRIVAL — people who have just stepped off the pier and are orienting */
  [-90, -40, -20, 3, 'cluster'], [-90, 60, -26, 2, 'pair'], [-90, 0, 44, 2, 'rail'],
  /* COMMONS — R4's intentional emptiness, so the few here are widely spaced pairs */
  [-45, -170, 10, 2, 'pair'], [-45, 40, -30, 2, 'pair'], [-45, 200, 40, 3, 'cluster'],
  /* PULSE — the dance floor. The largest gathering on the ring, facing the rig. */
  [0, 0, 0, 9, 'crowd'], [0, -110, 38, 3, 'row'], [0, 110, 38, 3, 'row'],
  /* TABLE — served at the kiosks and seated under the canopy */
  [45, -100, -44, 2, 'row'], [45, -20, -44, 2, 'row'], [45, 60, -44, 2, 'row'],
  [45, 0, 18, 4, 'cluster'],
  /* PLAY — two of the three arenas in use, with spectators on the tier */
  [90, -108, 0, 4, 'ring'], [90, 108, 0, 3, 'ring'], [90, 0, 48, 3, 'row'],
  /* QUIET — low stimulation is a design constraint, so this is the sparsest district on the ring */
  [135, -150, 20, 1, 'single'], [135, 60, -30, 2, 'pair'],
  /* FORUM — the amphitheatre, seated on the tiers facing the speaker platform */
  [180, -40, 34, 4, 'row'], [180, 30, 56, 4, 'row'], [180, -10, 78, 3, 'row'],
  /* STAGE — the crowd field in front of the proscenium */
  [-135, 0, -6, 8, 'crowd'], [-135, -120, 40, 3, 'row'], [-135, 120, 40, 3, 'row']
];

/* the concourse spine is a MOVEMENT field, so the people on it are spread along its length rather
   than gathered — R4's "medium connectors" between the high-density nodes */
const SPINE = [900, 1080, 1260, 1440, 1620, 1800];

function ringPoint(deg, s, t) {
  const th = deg * Math.PI / 180 + s / HALO.R_MID;
  const r = HALO.R_MID + t;
  return [Math.cos(th) * r, Math.sin(th) * r, th];
}

export function buildHaloLife(ctx, opts = {}) {
  const M = (ctx && ctx.M) || {};
  const group = new THREE.Group(); group.name = 'halo-life';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { figures: 0, nodes: 0, draws: 0, triangles: 0, byDistrict: {} };

  /* ---- WHERE EVERY FIGURE STANDS, resolved once ----------------------------------------------- */
  const people = [];
  for (let n = 0; n < NODES.length; n++) {
    const [deg, s, t, count, kind] = NODES[n];
    const [cx, cz, cth] = ringPoint(deg, s, t);
    stats.nodes++;
    for (let i = 0; i < count; i++) {
      let dx = 0, dz = 0, face = 0;
      const a = gold(n * 7 + i * 3);
      if (kind === 'pair') {
        /* two people turned toward each other, 1.6 m apart — the smallest social unit there is */
        const side = i ? 1 : -1;
        dx = Math.cos(a) * 0.8 * side; dz = Math.sin(a) * 0.8 * side;
        face = Math.atan2(-dx, -dz);
      } else if (kind === 'cluster') {
        /* a conversation circle: everyone faces the middle */
        const b = (i / count) * TAU + a;
        dx = Math.cos(b) * (1.5 + 0.5 * frac(n + i)); dz = Math.sin(b) * (1.5 + 0.5 * frac(n + i));
        face = Math.atan2(-dx, -dz);
      } else if (kind === 'ring') {
        /* spectators around an arena edge, facing in */
        const b = (i / count) * TAU * 0.6 + a;
        dx = Math.cos(b) * 24; dz = Math.sin(b) * 24;
        face = Math.atan2(-dx, -dz);
      } else if (kind === 'crowd') {
        /* a gathering facing one way — the dance floor, the stage. Deliberately irregular: a grid
           of people is a chessboard, and the golden angle is what this world uses for scatter. */
        const rr = 3.5 + 9 * Math.sqrt(frac(n * 11 + i * 5));
        dx = Math.cos(gold(i * 5 + n)) * rr; dz = Math.sin(gold(i * 5 + n)) * rr;
        face = -cth + Math.PI + (frac2(n + i) - 0.5) * 0.5;
      } else if (kind === 'row') {
        /* seated or standing along a line, all facing the same way with a little variance */
        dx = (i - (count - 1) / 2) * 3.2; dz = (frac(n * 3 + i) - 0.5) * 1.2;
        face = -cth + (frac2(n * 5 + i) - 0.5) * 0.4;
      } else if (kind === 'rail') {
        /* at an overlook rail, looking DOWN and out — the one pose that points at the world below */
        dx = (i - (count - 1) / 2) * 2.4; dz = 0;
        face = -cth + Math.PI;
      } else {
        face = -cth + a;
      }
      /* the offsets are in the district's own (along, across) frame, so rotate them into world */
      const ct = Math.cos(cth), st2 = Math.sin(cth);
      const x = cx + (-st2 * dx) + (ct * dz);
      const z = cz + (ct * dx) + (st2 * dz);
      people.push({ x, z, face, deg, kind, seed: n * 13 + i });
      stats.byDistrict[deg] = (stats.byDistrict[deg] || 0) + 1;
    }
  }
  /* the spine's walkers, spread along a movement corridor rather than gathered at a node */
  for (let i = 0; i < SPINE.length; i++) {
    const r = SPINE[i], th = -Math.PI / 2;
    const lat = (frac(i * 7) - 0.5) * 16;
    const x = Math.cos(th) * r - Math.sin(th) * lat;
    const z = Math.sin(th) * r + Math.cos(th) * lat;
    people.push({ x, z, face: (frac2(i * 3) > 0.5 ? 0 : Math.PI), deg: -90, kind: 'walk', seed: 900 + i });
  }
  stats.figures = people.length;

  /* ---- MATERIALS. The species is a lit crystal body, so it takes the world's crystal grade and
     carries its own colour per instance. Nothing here writes a colour to the whole population. --- */
  const body = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.38, metalness: 0.22, envMapIntensity: 1.05,
    emissive: 0x0a1220, emissiveIntensity: 0.5
  });
  body.name = 'halo-life-body'; owned.materials.push(body);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.16, metalness: 0.30, envMapIntensity: 1.4,
    emissive: 0x101c30, emissiveIntensity: 0.7
  });
  headMat.name = 'halo-life-head'; owned.materials.push(headMat);
  const shadeMat = new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.30, depthWrite: false, fog: true
  });
  shadeMat.name = 'halo-life-shadow'; owned.materials.push(shadeMat);

  /* ---- THE PARTS. residents.js's far tier, rebuilt as five instanceable primitives. ------------ */
  const S = LIFE.H / 2;                       /* residents.js's own scale convention: s = height / 2 */
  /* the TEARDROP lower body — a lathe from the far-tier drop profile, so the silhouette is the
     species' and not a cone (§06 forbids cones, and this is the shape that keeps it from being one) */
  const dropPts = [];
  for (const [v, w] of [[0.00, 0.02], [0.14, 0.19], [0.34, 0.30], [0.58, 0.33], [0.80, 0.28], [1.00, 0.20]]) {
    dropPts.push(new THREE.Vector2(w * S * 1.06, v * S * 1.02));
  }
  const dropGeo = own(new THREE.LatheGeometry(dropPts, 10));
  /* the TORSO — a rounded mass that narrows to a waist where it meets the drop */
  const torsoGeo = own(new THREE.SphereGeometry(1, 10, 7));
  torsoGeo.scale(0.30 * S, 0.34 * S, 0.24 * S);
  /* the HEAD — the square-diamond SLAB, residents.js's headW/headH/headD at scale */
  const headGeo = own(chamferBox(0.19 * S * 2, 0.215 * S * 2, 0.20 * S * 2, 0.035 * S));
  /* an ARM — a tapered bar; two instances per figure */
  const armGeo = own(chamferBox(0.075 * S * 2, 0.40 * S * 2, 0.085 * S * 2, 0.028 * S));
  /* the SHADOW — the species hovers, and the shadow is how a viewer reads that */
  const shadeGeo = own(new THREE.CircleGeometry(0.34 * S, 12).rotateX(-Math.PI / 2));

  const N = people.length;
  const mk = (geo, mat, count, name) => {
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.name = name; m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    group.add(m); stats.draws++;
    const tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    stats.triangles += tris * count;
    return m;
  };
  const iDrop = mk(dropGeo, body, N, 'halo-life-drop');
  const iTorso = mk(torsoGeo, body, N, 'halo-life-torso');
  const iHead = mk(headGeo, headMat, N, 'halo-life-head');
  const iArm = mk(armGeo, body, N * 2, 'halo-life-arm');
  const iShade = mk(shadeGeo, shadeMat, N, 'halo-life-shadow');

  /* ---- POSES. Not a rig: three angles per figure, chosen by what the node is for. -------------- */
  const POSE = {
    stand:    { lean: 0.00, armFwd: 0.14, armOut: 0.10, bob: 0.010 },
    converse: { lean: 0.06, armFwd: 0.42, armOut: 0.16, bob: 0.014 },
    dance:    { lean: 0.10, armFwd: 0.85, armOut: 0.55, bob: 0.075 },
    seated:   { lean: 0.14, armFwd: 0.55, armOut: 0.08, bob: 0.006 },
    lean:     { lean: 0.22, armFwd: 0.30, armOut: 0.20, bob: 0.008 },
    walk:     { lean: 0.09, armFwd: 0.26, armOut: 0.12, bob: 0.022 }
  };
  const poseFor = k => k === 'crowd' ? POSE.dance : k === 'row' ? POSE.seated
    : k === 'rail' ? POSE.lean : k === 'walk' ? POSE.walk
    : k === 'single' ? POSE.stand : POSE.converse;

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3(), _n = new THREE.Vector3(),
    _up = new THREE.Vector3(0, 1, 0), _qn = new THREE.Quaternion(), _qy = new THREE.Quaternion(),
    _col = new THREE.Color();

  /* every figure keeps its own colour for the life of the world (R4: independent avatar colours) */
  for (let i = 0; i < N; i++) {
    const P = people[i];
    _col.setHex(TINTS[Math.floor(frac(P.seed * 3 + 1) * TINTS.length) % TINTS.length]);
    iDrop.setColorAt(i, _col); iTorso.setColorAt(i, _col);
    iArm.setColorAt(i * 2, _col); iArm.setColorAt(i * 2 + 1, _col);
    /* the head slab is the species' bright note — residents.js's `light` value, not the base */
    _col.lerp(new THREE.Color(0xdfeaff), 0.55);
    iHead.setColorAt(i, _col);
    _col.setRGB(1, 1, 1); iShade.setColorAt(i, _col);
  }
  [iDrop, iTorso, iHead, iArm, iShade].forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });

  /* ---- WRITE. Everything stands along the SHELL NORMAL, like everything else on the ring. ------ */
  let posed = true;
  function write(t) {
    for (let i = 0; i < N; i++) {
      const P = people[i], pose = poseFor(P.kind);
      const y0 = haloHeight(P.x, P.z);
      haloNormal(P.x, P.z, _n); _qn.setFromUnitVectors(_up, _n);
      _e.set(0, P.face, 0); _qy.setFromEuler(_e);
      _q.copy(_qn).multiply(_qy);
      /* the hover bob — a slow breath, never a bounce (R3-12 and R4 both forbid strobing) */
      const ph = gold(P.seed) + t * (0.42 + 0.18 * frac(P.seed));
      const bob = posed ? Math.sin(ph) * pose.bob : 0;
      const hov = LIFE.HOVER + bob;
      const sway = posed ? Math.sin(ph * 0.7) * pose.lean * 0.18 : 0;

      /* drop, torso, head — stacked up the figure's own axis */
      _p.set(P.x, y0 + hov, P.z); _s.set(1, 1, 1);
      iDrop.setMatrixAt(i, _m.compose(_p, _q, _s));
      _p.set(P.x, y0 + hov + 1.06 * S, P.z);
      iTorso.setMatrixAt(i, _m.compose(_p, _q, _s));
      _p.set(P.x, y0 + hov + 1.62 * S, P.z);
      _e.set(sway * 0.5, P.face, 0); _qy.setFromEuler(_e);
      _q.copy(_qn).multiply(_qy);
      iHead.setMatrixAt(i, _m.compose(_p, _q, _s));

      /* two arms, swung by the pose. An arm is an instance and an instance has a transform (L48). */
      for (let a = 0; a < 2; a++) {
        const side = a ? 1 : -1;
        const swing = posed ? Math.sin(ph + (a ? Math.PI : 0)) * pose.armFwd : pose.armFwd * 0.4;
        _e.set(swing * 0.6, P.face, side * (pose.armOut + Math.abs(swing) * 0.18));
        _qy.setFromEuler(_e); _q.copy(_qn).multiply(_qy);
        const ox = Math.cos(P.face) * side * 0.30 * S, oz = -Math.sin(P.face) * side * 0.30 * S;
        _p.set(P.x + ox, y0 + hov + 1.02 * S, P.z + oz);
        iArm.setMatrixAt(i * 2 + a, _m.compose(_p, _q, _s));
      }

      /* the shadow: firmer when the figure is low, fainter when it rides high (residents.js's rule) */
      _e.set(0, 0, 0); _qy.setFromEuler(_e); _q.copy(_qn).multiply(_qy);
      const k = 1 - Math.min(1, hov / 0.34);
      _p.set(P.x, y0 + 0.05, P.z); _s.set(0.8 + 0.3 * k, 1, 0.8 + 0.3 * k);
      iShade.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    iDrop.instanceMatrix.needsUpdate = true; iTorso.instanceMatrix.needsUpdate = true;
    iHead.instanceMatrix.needsUpdate = true; iArm.instanceMatrix.needsUpdate = true;
    iShade.instanceMatrix.needsUpdate = true;
  }
  write(0);

  const all = [iDrop, iTorso, iHead, iArm, iShade];
  let quiet = false, visible = true;

  return {
    group, stats, people: people.map(p => ({ x: p.x, z: p.z, district: p.deg, kind: p.kind })),
    /* R3-13's animation tier, and a visibility tier above it: a population 1400 m away is a smudge
       and one 4 km away is nothing, so beyond LOD_FAR the whole family stops drawing. The ring is
       6800 m across — without this the crowd is paid for from every camera in the world. */
    setDetail(dist) {
      posed = dist < LIFE.LOD_NEAR;
      const vis = dist < LIFE.LOD_FAR;
      if (vis !== visible) { visible = vis; all.forEach(m => { m.visible = vis; }); }
      return posed;
    },
    update(t) { if (!quiet && visible && posed) write(t); },
    setTime(s) {
      /* by day the crystal body reads on reflection; at night its own emissive is what says alive */
      const night = 1 - (s && s.daylight != null ? s.daylight : 0);
      body.emissiveIntensity = 0.18 + 0.55 * night;
      headMat.emissiveIntensity = 0.24 + 0.70 * night;
      shadeMat.opacity = 0.34 - 0.12 * night;
    },
    setTheme() { /* deliberately empty: R4 keeps avatar colours INDEPENDENT of the world theme */ },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      quiet = !!low;
      iShade.visible = !low;
      iArm.count = low ? 0 : N * 2;
    },
    dispose() {
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

export default { buildHaloLife, LIFE, NODES };
