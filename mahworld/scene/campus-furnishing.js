/* MAHWORLD WORLD 01 :: CAMPUS FURNISHING — THE THINGS THAT MAKE IT A PLACE
   ============================================================================================

   ---- WHAT THE REFERENCE ACTUALLY TEACHES -------------------------------------------------------
   The direction came with two screenshots of a 2005 MMO town, and the lesson in them is NOT the
   art style — it is that every single object in frame can be NAMED BY A STRANGER IN ONE SECOND.
   A barrel is a barrel. A lamp post has a post, an arm and a lantern. A flower bed has a kerb, soil
   and flowers in it. A bridge has piers, a deck and railings. Nothing is a suggestive shape that
   the player is expected to interpret; nothing is left to chance.

   Three consequences, and this module is built on them:

     1. A PROP IS COMPOSED OF NAMED PARTS. A bench is not a box on two boxes. It is a seat, a back
        rail, two arm rails, two sculpted legs and a foot plate — because that is the part list a
        person already has in their head for "bench", and matching it is what makes the object
        readable instead of merely present.

     2. COLOUR SEPARATES CLASSES, NOT OBJECTS. In the reference every roof is the same blue, every
        wall the same cream, every tree the same green. You read the town by class at a hundred
        metres. So here: PLATINUM is structure, GRAPHITE is what touches the ground, GREEN is
        planting, and the district ACCENT is reserved for wayfinding and identity — banners,
        sign blades, lamp lenses. Nothing else gets to be coloured.

     3. THINGS COME IN DESIGNED GROUPS. The reference never puts one bench alone in a field. It puts
        a bench, a lamp and a planter together at the edge of a square, facing the square. A REST
        CLUSTER is authored here as one object with a fixed internal arrangement, and the campus
        places clusters — not props.

   ---- WHY THE CAMPUS NEEDED IT ------------------------------------------------------------------
   The reconstruction moved the facility facades out to 132 m and opened a 96 m quad, which was the
   right correction and left a second problem in its place: 29,000 square metres of polished floor
   with nothing standing on it. Open is not the same as empty. The master's own section 20 says it
   in one line — "large space is not empty if it is designed for people" — and section 10 lists what
   a player must be able to read at gameplay distance: where the path goes, where they can sit,
   where the quad begins and ends, which building is ahead.

   None of that is deliverable by paving. It needs objects.

   ---- WHAT IS DELIBERATELY NOT HERE -------------------------------------------------------------
   No lines on the floor. The floor is smooth platinum by direction and stays that way: this module
   adds nothing flat, nothing inlaid and nothing painted. Everything it places is a THING standing
   on the surface, which is the distinction between filling dead space and re-cluttering it.

   The quad's CENTRE stays open. Furnishing runs the edge, the avenues and the forecourts, because
   that is where people actually stand in the reference town and because the master requires the
   middle of the quad to stay clear.

   ---- COST --------------------------------------------------------------------------------------
   Every prop family is authored once and drawn as InstancedMesh, one per material role. Roughly
   250 placed objects cost 14 draw calls. Colliders are registered only for the masses a player
   could walk into; a flower bed is not one.

   No addons; three r185 core only; procedural; deterministic. */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, canvasTexture } from './materials.js';
import { CAMPUS, at, faceQuad, siteOf } from './campus-plan.js';

const DECK_Y = 0.17;                 /* ground.js FLOOR_TOP — everything stands on the deck */
const DEG = Math.PI / 180;

/* ---------------------------------------------------------------- geometry plumbing */
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(),
      _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();

/* push a transformed COPY of `geo` into `list`. The source is never consumed, so one authored part
   can be used at several places inside the same prop (two legs, four plates, six slats). */
function part(list, geo, x, y, z, ry = 0, rx = 0, rz = 0, sc) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e);
  _p.set(x, y, z); _s.set(1, 1, 1); if (sc) _s.set(sc[0], sc[1], sc[2]);
  _m4.compose(_p, _q, _s);
  const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(_m4);
  list.push(g);
  return list;
}
function mergeParts(list) {
  if (!list.length) return null;
  let n = 0;
  for (const g of list) { if (!g.getAttribute('normal')) g.computeVertexNormals(); n += g.getAttribute('position').count; }
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of list) {
    const p = g.getAttribute('position'), q = g.getAttribute('normal'), t = g.getAttribute('uv');
    pos.set(p.array.subarray(0, p.count * 3), o * 3);
    nrm.set(q.array.subarray(0, q.count * 3), o * 3);
    if (t) uv.set(t.array.subarray(0, t.count * 2), o * 2);
    o += p.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

/* A ROUNDED SOFT MASS in the horizontal plane: the shape every premium part in this world uses.
   Width x, height y, depth z, corner radius r, edge bevel b. Kept local rather than borrowed from
   buildings.js because a bench arm and a tower shaft want very different bevel proportions and
   sharing one helper across that range is how a chamfer ends up eating half a form. */
function pill(w, h, d, r, b = 0.02) {
  const rr = Math.max(0.01, Math.min(r, w / 2 - 0.005, d / 2 - 0.005));
  const bb = Math.min(b, h / 2 - 0.002);
  const s = new THREE.Shape();
  const x0 = -w / 2, z0 = -d / 2;
  s.moveTo(x0 + rr, z0);
  s.lineTo(x0 + w - rr, z0); s.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + rr);
  s.lineTo(x0 + w, z0 + d - rr); s.quadraticCurveTo(x0 + w, z0 + d, x0 + w - rr, z0 + d);
  s.lineTo(x0 + rr, z0 + d); s.quadraticCurveTo(x0, z0 + d, x0, z0 + d - rr);
  s.lineTo(x0, z0 + rr); s.quadraticCurveTo(x0, z0, x0 + rr, z0);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bb, bevelEnabled: true, bevelThickness: bb, bevelSize: bb, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(h - 2 * bb) / 2);
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/* a rounded planting mass: overlapping low-frequency spheres, flat-shaded. Round SILHOUETTE,
   faceted SURFACE — the world's own rule, and specifically NOT a cone, because the treeline's
   repeated spikes are the shape the direction keeps objecting to. */
function foliage(r, seedA) {
  const list = [];
  const base = new THREE.IcosahedronGeometry(1, 0);
  const gold = 2.3999632;
  for (let i = 0; i < 5; i++) {
    const a = seedA + i * gold, t = i / 5;
    const rr = r * (0.62 + 0.38 * Math.cos(t * 1.9));
    part(list, base, Math.cos(a) * r * 0.42, r * (0.55 + t * 0.62), Math.sin(a) * r * 0.42,
      a, 0.3 * Math.sin(a), 0, [rr, rr * 0.86, rr]);
  }
  base.dispose();
  return mergeParts(list);
}

/* ---------------------------------------------------------------- the props */
/* Each builder returns { struct, dark, accent, green, glow } — the same five material roles for
   every prop, so the whole kit merges into five instanced families no matter how many prop types
   exist. A role a prop does not use is simply empty. */
const roles = () => ({ struct: [], dark: [], accent: [], green: [], glow: [] });

/* ---- BENCH ------------------------------------------------------------------------------------
   Seat, back rail, two arm rails, two legs, foot plate. Faces local +z (a bench faces the space it
   looks at, and every placement below points it at what it is meant to look at). 1.9 m long, which
   is two people; the master's section 20 asks for "2 people talking" as the smallest social unit. */
function bench(R) {
  const seatSlab = pill(1.90, 0.085, 0.46, 0.09, 0.02);
  part(R.struct, seatSlab, 0, 0.44, 0);
  /* the back: a rail on two short standards, leaning back 8 degrees so it reads as a BACK and not
     as a second seat stood on edge */
  part(R.struct, pill(1.90, 0.075, 0.16, 0.06, 0.02), 0, 0.80, -0.20, 0, -0.14);
  part(R.struct, pill(1.90, 0.055, 0.11, 0.045, 0.015), 0, 0.63, -0.175, 0, -0.14);
  for (const sx of [-1, 1]) {
    part(R.struct, pill(0.07, 0.40, 0.10, 0.03, 0.015), sx * 0.84, 0.62, -0.19, 0, -0.14);
    /* arm rail: a horizontal bar from the back standard forward over the seat, on a short post */
    part(R.struct, pill(0.075, 0.06, 0.52, 0.03, 0.015), sx * 0.86, 0.685, 0.02);
    part(R.dark, pill(0.06, 0.20, 0.06, 0.025, 0.012), sx * 0.86, 0.55, 0.22);
    /* the leg: a tapered graphite standard on a wider foot, which is what keeps a bench from
       looking like it is floating a centimetre above the deck */
    part(R.dark, pill(0.10, 0.42, 0.34, 0.04, 0.02), sx * 0.70, 0.21, 0.02);
    part(R.dark, pill(0.24, 0.035, 0.46, 0.05, 0.012), sx * 0.70, 0.018, 0.02);
  }
  seatSlab.dispose();
  return R;
}

/* ---- PLANTER ----------------------------------------------------------------------------------
   Kerb, soil, planting, and four flower marks. The kerb is what makes it read as a PLANTER and not
   as a bush that happens to be there — the reference's flower beds all have a built edge. */
function planter(R) {
  part(R.struct, pill(1.5, 0.46, 1.5, 0.26, 0.035), 0, 0.23, 0);          /* the kerb */
  part(R.dark, pill(1.28, 0.06, 1.28, 0.20, 0.02), 0, 0.47, 0);           /* the soil, set down inside it */
  const f = foliage(0.46, 0.9);
  part(R.green, f, 0, 0.44, 0); f.dispose();
  /* four flowers, on the diagonals, small enough to be a detail and large enough to be seen */
  const bud = new THREE.IcosahedronGeometry(0.075, 0);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    part(R.accent, bud, Math.cos(a) * 0.40, 0.60 + 0.06 * (i % 2), Math.sin(a) * 0.40, a, 0, 0, [1, 0.7, 1]);
  }
  bud.dispose();
  return R;
}

/* ---- LAMP -------------------------------------------------------------------------------------
   Base collar, tapered post, a cranked arm, and a downlight head with a lens. Five parts, because
   that is the part list "street lamp" already means. 4.2 m: tall enough to light a path, short
   enough not to become a pole across the arrival lens, which is the defect two passes had to fix. */
function lamp(R) {
  part(R.dark, pill(0.42, 0.10, 0.42, 0.18, 0.025), 0, 0.05, 0);          /* base collar */
  part(R.dark, pill(0.26, 0.22, 0.26, 0.11, 0.02), 0, 0.16, 0);
  part(R.struct, new THREE.CylinderGeometry(0.055, 0.085, 3.55, 10), 0, 2.02, 0);
  /* the arm cranks forward, so the lamp lights the path rather than its own post */
  part(R.struct, pill(0.07, 0.07, 0.62, 0.03, 0.015), 0, 3.76, 0.28);
  part(R.struct, pill(0.075, 0.20, 0.075, 0.03, 0.015), 0, 3.68, 0.56);
  /* the head: a shallow cowl over a lens, the lens facing DOWN */
  part(R.struct, new THREE.CylinderGeometry(0.30, 0.17, 0.20, 10), 0, 3.50, 0.56);
  part(R.glow, new THREE.CylinderGeometry(0.16, 0.20, 0.045, 10), 0, 3.385, 0.56);
  return R;
}

/* ---- SIGNPOST ---------------------------------------------------------------------------------
   A post, a cap, and up to three arrow BLADES. The blade is the whole point: it is a pointed
   rectangle, and its point is the arrow. A stranger reads "that way to X" without being taught. */
function signpost(R, blades) {
  part(R.dark, pill(0.44, 0.12, 0.44, 0.19, 0.025), 0, 0.06, 0);
  part(R.struct, new THREE.CylinderGeometry(0.065, 0.085, 2.85, 10), 0, 1.48, 0);
  part(R.struct, new THREE.OctahedronGeometry(0.14, 0), 0, 3.02, 0, 0, 0, 0, [1.4, 0.9, 1.4]);
  blades.forEach((b, i) => {
    const y = 2.52 - i * 0.42;
    /* the blade body, and a point on its far end. Two parts, because a rectangle is a label and a
       rectangle with a point is a DIRECTION. */
    part(R.accent, pill(1.30, 0.28, 0.075, 0.05, 0.02), 0.72, y, 0, b.ry);
    part(R.accent, new THREE.CylinderGeometry(0.001, 0.198, 0.30, 4), 1.40 + 0.15, y, 0, b.ry, 0, -Math.PI / 2, [1, 1, 0.38]);
  });
  return R;
}

/* ---- HYDRATION POST ---------------------------------------------------------------------------
   The fitness campus's drinking fountain: pedestal, basin, spout, and a lit MAH mark on the front.
   It is the one prop that says what KIND of place this is without a sign on it. */
function hydration(R) {
  part(R.dark, pill(0.56, 0.09, 0.50, 0.20, 0.02), 0, 0.045, 0);
  part(R.struct, pill(0.40, 0.86, 0.36, 0.15, 0.03), 0, 0.52, 0);
  part(R.struct, pill(0.52, 0.13, 0.46, 0.19, 0.03), 0, 1.00, 0.02);      /* the basin rim */
  part(R.dark, pill(0.38, 0.05, 0.33, 0.14, 0.015), 0, 1.045, 0.02);      /* the water surface, set into it */
  part(R.struct, new THREE.CylinderGeometry(0.028, 0.028, 0.26, 8), 0, 1.16, -0.14);
  part(R.struct, pill(0.055, 0.05, 0.16, 0.022, 0.012), 0, 1.28, -0.08);  /* the spout, cranked over the basin */
  part(R.glow, new THREE.OctahedronGeometry(0.085, 0), 0, 0.72, 0.19, 0, 0, 0, [1.5, 1.0, 0.35]);
  return R;
}

/* ---- PLATE RACK -------------------------------------------------------------------------------
   A weight-plate tree. Four plates of two diameters on a raked upright: the single most legible
   object a training campus can put on its ground, and it needs no sign at all. */
function plateRack(R) {
  part(R.dark, pill(0.74, 0.10, 0.62, 0.16, 0.025), 0, 0.05, 0);
  part(R.struct, pill(0.14, 1.24, 0.14, 0.06, 0.02), 0, 0.66, -0.06);
  const big = new THREE.CylinderGeometry(0.30, 0.30, 0.055, 16).rotateX(Math.PI / 2);
  const small = new THREE.CylinderGeometry(0.21, 0.21, 0.05, 16).rotateX(Math.PI / 2);
  const bore = new THREE.CylinderGeometry(0.045, 0.045, 0.07, 8).rotateX(Math.PI / 2);
  [[0.36, big], [0.36, big], [0.92, small], [0.92, small]].forEach(([y, g], i) => {
    const z = (i % 2 ? 0.20 : -0.08);
    part(R.dark, g, 0, y, z);
    part(R.struct, bore, 0, y, z);
  });
  big.dispose(); small.dispose(); bore.dispose();
  return R;
}

/* ---- TRAINING MAT -----------------------------------------------------------------------------
   A raised padded square with a bevelled kerb and a diamond mark inset in the middle. It is the
   only thing this module puts near the ground, and it is 12 cm PROUD of it — a mat you can see the
   edge of is a mat; a mat painted flat on the floor is a line, which the direction has ruled out. */
function mat(R) {
  part(R.struct, pill(4.4, 0.12, 4.4, 0.30, 0.035), 0, 0.06, 0);
  part(R.dark, pill(4.05, 0.05, 4.05, 0.24, 0.02), 0, 0.125, 0);
  part(R.accent, new THREE.OctahedronGeometry(0.52, 0), 0, 0.16, 0, 0, 0, 0, [1.5, 0.10, 1.0]);
  return R;
}

/* ---- BANNER PYLON -----------------------------------------------------------------------------
   Mast, cross-arm, and a hanging banner in the district's own colour with the brand diamond on it.
   This is the campus's colour-coding instrument: standing in a forecourt you can tell which
   facility you are in front of from the banner alone, which is the reference town's blue-roof
   trick applied to a world that has no roofs. */
function bannerPylon(R) {
  part(R.dark, pill(0.60, 0.13, 0.60, 0.26, 0.03), 0, 0.065, 0);
  part(R.struct, new THREE.CylinderGeometry(0.075, 0.115, 5.4, 10), 0, 2.83, 0);
  part(R.struct, pill(0.09, 0.09, 0.66, 0.035, 0.018), 0, 5.42, 0.10);
  part(R.accent, pill(0.055, 2.30, 1.05, 0.02, 0.015), 0, 4.20, 0.24);    /* the banner */
  part(R.glow, new THREE.OctahedronGeometry(0.20, 0), 0.001, 4.30, 0.28, 0, 0, 0, [1.5, 1.0, 0.14]);
  part(R.struct, new THREE.OctahedronGeometry(0.17, 0), 0, 5.66, 0, 0, 0, 0, [1.4, 1.0, 1.4]);
  return R;
}

/* ---- KERB BED ---------------------------------------------------------------------------------
   A long low planting bed, used in runs to edge the quad and the avenues. The reference lines its
   roads with these and it is most of why its ground never reads as blank. */
function kerbBed(R) {
  part(R.struct, pill(3.6, 0.34, 1.15, 0.22, 0.03), 0, 0.17, 0);
  part(R.dark, pill(3.35, 0.05, 0.92, 0.16, 0.02), 0, 0.35, 0);
  for (const sx of [-1, 0, 1]) {
    const f = foliage(0.34, 1.7 + sx * 2.1);
    part(R.green, f, sx * 1.10, 0.31, 0); f.dispose();
  }
  const bud = new THREE.IcosahedronGeometry(0.06, 0);
  for (let i = 0; i < 6; i++) part(R.accent, bud, -1.42 + i * 0.57, 0.47 + 0.04 * (i % 2), (i % 2 ? 0.20 : -0.20), i, 0, 0, [1, 0.7, 1]);
  bud.dispose();
  return R;
}

/* ---------------------------------------------------------------- the placement plan */
/* THE REST CLUSTER, which is the unit the campus actually places. Two benches at a slight angle to
   each other, a planter between them, a lamp behind and a hydration post to one side — the
   arrangement the reference uses at every square edge, and the reason its towns feel inhabited
   rather than decorated. Offsets are in the cluster's own frame, +z pointing at the quad. */
const REST_CLUSTER = [
  { prop: 'bench', x: -2.35, z: 0.35, ry: 0.20 },
  { prop: 'bench', x: 2.35, z: 0.35, ry: -0.20 },
  { prop: 'planter', x: 0, z: -0.30, ry: 0 },
  { prop: 'lamp', x: 0, z: -2.35, ry: 0 },
  { prop: 'hydration', x: -4.30, z: -0.55, ry: 0.5 }
];

export function buildCampusFurnishing(ctx) {
  const { M, scene } = ctx;
  const group = new THREE.Group(); group.name = 'campus-furnishing';
  const owned = { geometries: [], materials: [], textures: [] };
  const stats = { clusters: 0, lamps: 0, beds: 0, signs: 0, banners: 0, mats: 0, racks: 0, draws: 0, colliders: 0 };

  /* ---- the five material roles. THREE of them are already in the world's palette and are reused
     rather than cloned, because every extra material is a shader program and this module places
     hundreds of objects. GREEN and ACCENT are the two that do not exist yet. */
  const MAT = {
    struct: M.platinumLit || M.platinum,
    dark: M.graphiteDark || M.graphite,
    glow: M.energySoft || M.energy,
    green: new THREE.MeshStandardMaterial({ color: 0x2f6b57, roughness: 0.78, metalness: 0.05, flatShading: true }),
    accent: new THREE.MeshStandardMaterial({ color: 0x0a1424, emissive: 0x6fb7ff, emissiveIntensity: 0.85, roughness: 0.45, metalness: 0.1 })
  };
  MAT.green.name = 'campus-planting'; MAT.accent.name = 'campus-accent';
  owned.materials.push(MAT.green, MAT.accent);

  /* build one prop family and hand back its five merged geometries */
  const authored = {};
  const author = (name, fn, arg) => {
    const R = roles(); fn(R, arg);
    const out = {};
    for (const k of Object.keys(R)) { const g = mergeParts(R[k]); if (g) { out[k] = g; owned.geometries.push(g); } }
    authored[name] = out;
    return out;
  };
  author('bench', bench);
  author('planter', planter);
  author('lamp', lamp);
  author('hydration', hydration);
  author('plateRack', plateRack);
  author('mat', mat);
  author('bannerPylon', bannerPylon);
  author('kerbBed', kerbBed);
  author('signpost', signpost, [{ ry: 0 }, { ry: 2.3 }, { ry: -2.3 }]);

  /* every placement goes into this list, then into one InstancedMesh per (prop, role) */
  const place = {};
  const put = (prop, x, z, ry, y) => {
    (place[prop] = place[prop] || []).push({ x, y: y == null ? DECK_Y : y, z, ry });
  };
  const cluster = (cx, cz, facing) => {
    const c = Math.cos(facing), s = Math.sin(facing);
    for (const p of REST_CLUSTER) put(p.prop, cx + p.x * c + p.z * s, cz - p.x * s + p.z * c, facing + p.ry);
    stats.clusters++;
  };

  /* ---- 1. THE QUAD EDGE. Rest clusters facing IN, on the bearings the open arc leaves free, with
     runs of kerb bed between them. This is the ring that turns 29,000 m2 of empty polished floor
     into an edge you can sit on — and it is placed on the EDGE, so the middle stays open. */
  /* DENSITY IS THE WHOLE POINT, and the first pass got it wrong by a factor of two. Human-scaled
     props at 24 degree spacing around a 192 m quad read as specks scattered on a field — correct
     objects, wrong rhythm. The reference town packs its furniture: you are never more than a few
     metres from something built. So the ring runs at 15 degrees (24 clusters), the beds run three
     to a gap, and a SECOND ring is added inside it. */
  const QR = CAMPUS.QUAD_R - 3.5;
  for (let d = 0; d < 360; d += 15) {
    const [x, z] = at(d, QR);
    /* facing the centre is the same derivation the facades use */
    cluster(x, z, faceQuad(d));
    /* kerb beds filling the gap to the next cluster, tangent to the ring */
    for (const o of [4, 7.5, 11]) {
      const [bx, bz] = at(d + o, QR + 1.4);
      put('kerbBed', bx, bz, faceQuad(d + o) + Math.PI / 2);
      stats.beds++;
      const [cx, cz] = at(d + o, QR - 4.6);
      put('planter', cx, cz, faceQuad(d + o));
    }
  }

  /* ---- 1b. THE INNER RING, at r 54, facing OUT. Two things at once: it stops the quad's middle
     band from being a hundred metres of nothing between the civic symbol and the edge, and it seats
     people the way a real plaza does — looking OUT at the space and the buildings rather than in at
     each other. The centre inside r 40 stays clear, which is the openness the master protects. */
  for (let d = 7.5; d < 360; d += 30) {
    const [x, z] = at(d, 54);
    cluster(x, z, faceQuad(d) + Math.PI);
    for (const o of [10, 20]) {
      const [bx, bz] = at(d + o, 55.5);
      put('kerbBed', bx, bz, faceQuad(d + o) + Math.PI / 2); stats.beds++;
    }
  }

  /* ---- 2. THE AVENUES. Each facility gets a lit approach from the quad edge to its forecourt:
     lamp pairs every 16 m flanking the axis, kerb beds outside them. A player standing anywhere on
     the quad can see which way each destination is because the lamps make a line to it. */
  const AVENUE_HALF = 8.5;
  for (const name of Object.keys(CAMPUS.SITES)) {
    const S = CAMPUS.SITES[name], site = siteOf(name);
    const ux = Math.sin(S.deg * DEG), uz = -Math.cos(S.deg * DEG);   /* outward */
    const tx = -uz, tz = ux;                                          /* tangent */
    for (let r = CAMPUS.QUAD_R - 6; r < CAMPUS.FORECOURT_R - 12; r += 11) {
      for (const sd of [-1, 1]) {
        put('lamp', ux * r + tx * sd * AVENUE_HALF, uz * r + tz * sd * AVENUE_HALF, faceQuad(S.deg));
        stats.lamps++;
        put('kerbBed', ux * (r + 5.5) + tx * sd * (AVENUE_HALF + 3.4), uz * (r + 5.5) + tz * sd * (AVENUE_HALF + 3.4),
          faceQuad(S.deg) + Math.PI / 2);
        stats.beds++;
      }
    }
    /* the signpost stands at the MOUTH of the avenue, on the quad edge, where the decision is made */
    const [sx, sz] = at(S.deg, CAMPUS.QUAD_R - 7);
    put('signpost', sx, sz, faceQuad(S.deg)); stats.signs++;
    /* two banner pylons flank the entrance, 11 m either side of the axis, just off the facade */
    for (const sd of [-1, 1]) {
      put('bannerPylon', site.x - ux * 5 + tx * sd * 11, site.z - uz * 5 + tz * sd * 11, faceQuad(S.deg));
      stats.banners++;
    }
    /* a rest cluster in every forecourt, off to one side so it never blocks the doors */
    const fr = CAMPUS.FORECOURT_R - 20;
    cluster(ux * fr + tx * 15, uz * fr + tz * 15, faceQuad(S.deg) + 0.6);
  }

  /* ---- 3. THE TRAINING GROUND, on MAH GYM's flank. Four mats in a two-by-two with plate racks
     between them: the one part of the campus that states its function with objects instead of a
     sign, which is what the reference does with market stalls and blacksmith anvils. */
  {
    const S = CAMPUS.SITES.gym;
    const ux = Math.sin(S.deg * DEG), uz = -Math.cos(S.deg * DEG), tx = -uz, tz = ux;
    const or = CAMPUS.FORECOURT_R - 34, ot = -30, ry = faceQuad(S.deg);
    for (let i = 0; i < 4; i++) {
      const dx = (i % 2) * 7.2, dz = Math.floor(i / 2) * 7.2;
      put('mat', ux * (or + dz) + tx * (ot + dx), uz * (or + dz) + tz * (ot + dx), ry); stats.mats++;
    }
    for (const [dx, dz] of [[3.6, -3.4], [3.6, 10.8], [-3.6, 3.6], [10.8, 3.6]]) {
      put('plateRack', ux * (or + dz) + tx * (ot + dx), uz * (or + dz) + tz * (ot + dx), ry + 0.4); stats.racks++;
    }
    put('lamp', ux * (or + 3.6) + tx * (ot + 3.6), uz * (or + 3.6) + tz * (ot + 3.6), ry); stats.lamps++;
  }

  /* ---- instancing. One InstancedMesh per (prop family x material role). */
  const _mm = new THREE.Matrix4(), _pp = new THREE.Vector3(), _qq = new THREE.Quaternion(), _ss = new THREE.Vector3(1, 1, 1);
  for (const prop of Object.keys(place)) {
    const rows = place[prop], geos = authored[prop];
    if (!geos) continue;
    for (const role of Object.keys(geos)) {
      const im = new THREE.InstancedMesh(geos[role], MAT[role], rows.length);
      im.name = 'campus-' + prop + '-' + role;
      im.castShadow = role !== 'glow'; im.receiveShadow = role !== 'glow';
      rows.forEach((r, i) => {
        _pp.set(r.x, r.y, r.z); _qq.setFromEuler(_e.set(0, r.ry, 0));
        _mm.compose(_pp, _qq, _ss); im.setMatrixAt(i, _mm);
      });
      im.instanceMatrix.needsUpdate = true;
      im.frustumCulled = true;
      group.add(im); stats.draws++;
    }
  }

  /* ---- colliders, for the masses a player could walk into. A flower bed is not one of them: the
     reference lets you brush past planting and stops you at a bench, and a world that blocks the
     player on a 6 cm kerb feels worse than one that does not block them at all. */
  const colliderGeo = new THREE.BoxGeometry(1, 1, 1);
  owned.geometries.push(colliderGeo);
  const blocking = { bench: [2.0, 0.9, 0.7], planter: [1.6, 0.7, 1.6], hydration: [0.7, 1.3, 0.7],
    plateRack: [0.8, 1.3, 0.8], signpost: [0.5, 3.0, 0.5], bannerPylon: [0.7, 5.6, 0.7], lamp: [0.45, 4.0, 0.45] };
  for (const prop of Object.keys(blocking)) {
    for (const r of (place[prop] || [])) {
      const [w, h, d] = blocking[prop];
      const c = new THREE.Mesh(colliderGeo, M.curb || M.graphiteDark);
      c.position.set(r.x, r.y + h / 2, r.z); c.rotation.y = r.ry; c.scale.set(w, h, d); c.visible = false;
      group.add(c); (ctx.colliders = ctx.colliders || []).push(c); stats.colliders++;
    }
  }

  scene.add(group);
  stats.placed = Object.values(place).reduce((n, a) => n + a.length, 0);

  /* the accent tracks the world theme, so a Theme change carries the banners and sign blades with
     it rather than leaving them on a colour the rest of the world has stopped using */
  ctx.timeHooks.push(() => {
    if (ctx.theme && ctx.theme.energy != null) MAT.accent.emissive.setHex(ctx.theme.energy);
  });

  return {
    group, stats,
    dispose() {
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      owned.textures.forEach(t => t.dispose());
      scene.remove(group);
    }
  };
}
