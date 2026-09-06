/* MAHWORLD :: MAHBEASTS — the family framework, and the Monkey Dogs
   ============================================================================================

   R3-10 sets one quality bar and it is unusual enough to be worth quoting exactly:

       "jewelry-store creature object — customised, precious, crafted, gift-worthy, but dangerous."

   That is not "make a nice monster". It says the reference is a CASE IN A JEWELLER'S WINDOW: a
   thing whose every plate was cut to sit in a setting, whose joints wear metal because metal is what
   holds stones, and whose value reads before its threat does. Everything below is built to that, and
   the two prohibitions under it are the guard rails — NO realistic fur, NO literal ordinary dog or
   monkey copy. A Monkey Dog is not a dog. It is a piece of jewellery that hunts.

   ---- THE FAMILY FRAMEWORK ---------------------------------------------------------------------
   R3-10 asks for a system, not a creature, so the genome is data and the builder is generic:

       consistent base-body genome · normal enemies visibly the same species · a narrow level band ·
       ONE boss at the next tier · the boss related but clearly more elaborate · readable
       weak/attack regions · animation, hit reaction, defeat behaviour · performance-safe LOD.

   FAMILIES below carries every family the doctrine names. Only the Monkey Dogs are built at full
   quality; the rest are provisional entries with their bands recorded, because R3-10 says to build
   the family SYSTEM and Monkey Dog quality first and names the others as provisional.

   ---- WHY THE BEASTS HAVE LIMBS AND THE PEOPLE DO NOT -------------------------------------------
   residents.js's species law is absolute: a MAHBEING is one continuous taper and has no legs. A
   MAHBEAST is a different ORDER, and the difference is the point — R3-03 demands that enemy and
   resident read apart at gameplay distance, and "one has limbs and one does not" is the strongest
   silhouette separation available in this world. It costs nothing at any distance and it cannot be
   confused in any light.

   ---- THE ARCHITECTURE, AND WHY IT IS PART-MAJOR ------------------------------------------------
   A pack of six plus a boss is 21 creatures across three territories. Built creature-major — a Group
   per beast with a head, a body and four limbs — that is ~150 draw calls for the population, which
   §19 and R3-13 both forbid. Built PART-MAJOR it is six: one InstancedMesh per part TYPE across the
   whole population, each instance carrying its own matrix. That buys full articulation for free —
   a limb is an instance, and an instance has a transform — where a merged-per-creature mesh would
   have bought a static prop. The choice is the difference between a monster and a statue of one.

   buildMahBeasts(ctx, { territories }) -> the standard module contract. */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox } from './materials.js';

const TAU = Math.PI * 2;

/* ================================================================================================
   THE FAMILIES. Level bands exactly as R3-10 gives them: normals span about three levels, the boss
   is the next level above the band. Names besides Monkey Dog are provisional and marked so.
   ================================================================================================ */
export const FAMILIES = Object.freeze({
  monkeydog: {
    id: 'monkeydog', label: 'Monkey Dogs', normal: [5, 7], boss: 8, provisional: false,
    /* the genome. Every number here is a proportion of the body length, so a boss is the same
       creature at a different size and cannot drift into being a different species. */
    genome: {
      len: 2.30, hipH: 1.05, leanF: 0.18,      /* body length, hip height, forward lean */
      chest: 0.46, waist: 0.30,                /* the mass falls back from the shoulders */
      foreLen: 1.02, hindLen: 0.78,            /* THE MONKEY READ: fore-limbs longer than hind */
      foreR: 0.10, hindR: 0.12,
      headLen: 0.62, headH: 0.36, jaw: 0.26,   /* THE DOG READ: length in the jaw, not the cranium */
      plates: 8, nodes: 4, claws: 3,
      eyeR: 0.055, crest: 0.20
    }
  },
  shardback: { id: 'shardback', label: 'Shardbacks', normal: [9, 11], boss: 12, provisional: true },
  prismmite: { id: 'prismmite', label: 'Prism Mites', normal: [13, 15], boss: 16, provisional: true },
  rootcrawler: { id: 'rootcrawler', label: 'Root Crawlers', normal: [17, 19], boss: 20, provisional: true },
  lakespecter: { id: 'lakespecter', label: 'Lake Specters', normal: [21, 23], boss: 24, provisional: true },
  cavebrute: { id: 'cavebrute', label: 'Cave Brutes', normal: [25, 27], boss: 28, provisional: true }
});

export const BEASTS = Object.freeze({
  PACK: 6,               /* normals per territory */
  BOSS_SCALE: 1.62,      /* the boss is the same creature, larger — never a different silhouette */
  PROWL_R: 13,           /* how far a normal wanders from its territory anchor */
  LOD_FAR: 240           /* beyond this the limbs stop articulating (R3-13's animation tier) */
});

const gold = i => (i * 2.3999632) % TAU;
const frac = i => (i * 0.6180339887) % 1;
const frac2 = i => (i * 0.7548776662) % 1;

export function buildMahBeasts(ctx, opts = {}) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'mahbeasts';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { families: {}, territories: [], normals: 0, bosses: 0, draws: 0, triangles: 0 };
  for (const k of Object.keys(FAMILIES)) {
    const F = FAMILIES[k];
    stats.families[k] = { label: F.label, normal: F.normal, boss: F.boss, provisional: !!F.provisional, built: false };
  }

  /* R3-10: "Do not randomly spawn enemies in premium civic pedestrian zones unless intentionally
     combat-enabled." The assembly supplies territories; each one is a place the doctrine names —
     forest zones, lake edges, cave entrances, outer districts — and never the plaza. */
  const TERR = opts.territories && opts.territories.length ? opts.territories : [];
  if (!TERR.length) return parked(group, stats);

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3();

  /* ---- MATERIALS — R3-10's jewellery palette, four roles that must not collapse into one ------ */
  const core = (M.graphiteMetal || M.graphite || new THREE.MeshStandardMaterial({ color: 0x0f1622 })).clone();
  core.roughness = 0.22; core.name = 'beast-core'; owned.materials.push(core);
  /* the PLATES are the gemstone: smoother than the core and a step lighter, so a plate reads as SET
     INTO the body rather than as part of it — R3-02's clear material boundary, at creature scale */
  const plate = (M.platinumMidLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0x8fa2ba })).clone();
  plate.roughness = 0.10; plate.name = 'beast-plate'; owned.materials.push(plate);
  /* the JEWELRY: platinum at the joints, because metal is what holds stones */
  const jewel = (M.platinumLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0xc6d2e2 })).clone();
  jewel.roughness = 0.06; jewel.name = 'beast-jewelry'; owned.materials.push(jewel);
  const vein = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energyLight), transparent: true, opacity: 0.62,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  vein.name = 'beast-vein'; owned.materials.push(vein);
  /* THE EYES ARE GEMSTONES AND THEY ARE THE ONE WARM-ADJACENT THING PERMITTED. They stay on the
     theme's own energy so a retheme reaches them; a red eye would be a colour this world does not
     have, and LAW-001 would fail the build for it. */
  const eyeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energy), transparent: true, opacity: 0.92,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  eyeMat.name = 'beast-eye'; owned.materials.push(eyeMat);

  /* ---- PART GEOMETRY. One geometry per part type, authored at unit body length, scaled per
     instance. A cut gemstone is an octahedron with its poles flattened — the same square-diamond
     family the whole world is made of, which is what keeps a beast inside this brand. ------------ */
  const G = FAMILIES.monkeydog.genome;

  const bodyGeo = own(new THREE.OctahedronGeometry(1, 0));
  bodyGeo.scale(G.chest * 0.5, G.chest * 0.44, G.len * 0.5);

  const headGeo = own(new THREE.OctahedronGeometry(1, 0));
  headGeo.scale(G.headH * 0.5, G.headH * 0.46, G.headLen * 0.5);
  const jawGeo = own(chamferBox(G.headH * 0.62, G.jaw * 0.34, G.jaw, G.jaw * 0.16));
  /* the CREST: a low blade on the skull, and the boss's is the same blade taller — R3-10 wants the
     boss "related but clearly more elaborate", and a crest is the cheapest legible tier marker */
  const crestGeo = own(new THREE.OctahedronGeometry(1, 0));
  crestGeo.scale(0.045, G.crest * 0.5, G.crest * 0.9);

  const limbGeo = own(chamferBox(1, 1, 1, 0.22));       /* scaled per segment per instance */
  const clawGeo = own(new THREE.OctahedronGeometry(1, 0));
  clawGeo.scale(0.035, 0.035, 0.11);                    /* a premium claw: a cut shard, not a hook */
  const plateGeo = own(new THREE.OctahedronGeometry(1, 0));
  /* FLAT, because a stone in a setting lies down — and BIG, because it is the part that has to read.
     The first cut scaled to 0.5 of a chest half-width, which on a 2.3 m creature is a 24 cm plate:
     present in the geometry, invisible in the frame, and the whole "jewelry-store" bar sat on it.
     R3-10's body core is DARK by instruction, so the core cannot carry the read; the gemstone must. */
  plateGeo.scale(0.95, 0.16, 0.95);
  const ringGeo = own(new THREE.TorusGeometry(1, 0.16, 3, 8));
  ringGeo.rotateX(Math.PI / 2);
  const nodeGeo = own(new THREE.OctahedronGeometry(1, 0));
  const eyeGeo = own(new THREE.OctahedronGeometry(1, 0));
  const veinGeo = own(chamferBox(1, 1, 1, 0.2));

  /* ---- THE POPULATION -------------------------------------------------------------------------- */
  const beasts = [];
  TERR.forEach((T, ti) => {
    const fam = FAMILIES[T.family] || FAMILIES.monkeydog;
    stats.families[fam.id].built = true;
    const anchor = { x: T.x, z: T.z, r: T.r != null ? T.r : BEASTS.PROWL_R };
    stats.territories.push({ id: T.id, family: fam.id, x: +T.x.toFixed(1), z: +T.z.toFixed(1),
      normals: BEASTS.PACK, boss: fam.boss, band: fam.normal });
    for (let k = 0; k < BEASTS.PACK + 1; k++) {
      const boss = k === BEASTS.PACK;
      const seed = ti * 97 + k * 13 + 5;
      const a = gold(seed), rr = anchor.r * (boss ? 0.0 : 0.35 + 0.65 * frac(seed * 3));
      beasts.push({
        boss, fam: fam.id, seed,
        /* R3-10: normals span the band, the boss is the level above it */
        level: boss ? fam.boss : fam.normal[0] + Math.round((fam.normal[1] - fam.normal[0]) * frac2(seed * 5)),
        x: anchor.x + Math.cos(a) * rr, z: anchor.z + Math.sin(a) * rr,
        s: (boss ? BEASTS.BOSS_SCALE : 0.90 + 0.20 * frac(seed * 7)),
        orbit: anchor, rr, phase: gold(seed * 11),
        rate: (boss ? 0.035 : 0.055 + 0.045 * frac2(seed * 13)) * (frac(seed * 17) > 0.5 ? 1 : -1),
        gait: 1.4 + 0.7 * frac(seed * 19)
      });
      if (boss) stats.bosses++; else stats.normals++;
    }
    /* LAW 2: EVERY EMITTER IS ANSWERED, and it applies to a territory as much as to a lamp. The
       pack carries MAHGIC veins and gemstone eyes and stands on open unlit ground, so the first
       render of it came back as seven black shapes with a few white flecks — the jewellery was
       there and had nothing to be seen against. A pool under the territory is also the thing that
       tells a viewer at distance that SOMETHING IS HERE, which is what a territory is for. */
    if (ctx && typeof ctx.lightPool === 'function') {
      try { ctx.lightPool({ x: anchor.x, z: anchor.z, rx: anchor.r * 2.2, rz: anchor.r * 2.2, k: 0.26, hue: theme.energy }); } catch (e) {}
    }
  });
  const N = beasts.length;

  /* ---- INSTANCED MESHES, ONE PER PART TYPE ---------------------------------------------------- */
  const mk = (geo, mat, count, name, order) => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
    m.name = name; m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (order != null) m.renderOrder = order;
    group.add(m); stats.draws++;
    return m;
  };
  const LIMBS = 4, SEGS = 2;
  const iBody = mk(bodyGeo, core, N, 'beast-body');
  const iHead = mk(headGeo, core, N, 'beast-head');
  const iJaw = mk(jawGeo, plate, N, 'beast-jaw');
  const iCrest = mk(crestGeo, jewel, N, 'beast-crest');
  const iLimb = mk(limbGeo, core, N * LIMBS * SEGS, 'beast-limbs');
  const iClaw = mk(clawGeo, jewel, N * LIMBS * G.claws, 'beast-claws');
  const iPlate = mk(plateGeo, plate, N * G.plates, 'beast-plates');
  const iRing = mk(ringGeo, jewel, N * LIMBS * 2, 'beast-joint-jewelry');
  const iNode = mk(nodeGeo, jewel, N * G.nodes, 'beast-nodes');
  const iEye = mk(eyeGeo, eyeMat, N * 2, 'beast-eyes', 6);
  const iVein = mk(veinGeo, vein, N, 'beast-veins', 5);

  /* per-instance colour so a pack is individuals rather than a stamp; the boss reads brightest */
  const col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const b = beasts[i];
    col.setScalar(b.boss ? 1.0 : 0.72 + 0.24 * frac(b.seed * 23));
    iBody.setColorAt(i, col); iHead.setColorAt(i, col);
    for (let p = 0; p < G.plates; p++) {
      /* a cut stone catches: the range runs high and the boss's runs higher, so the plates read as
         SET INTO the dark body rather than as a slightly paler part of it */
      col.setScalar((b.boss ? 1.15 : 0.86) + 0.30 * frac2(b.seed * 29 + p));
      iPlate.setColorAt(i * G.plates + p, col);
    }
  }
  for (const m of [iBody, iHead, iPlate]) if (m.instanceColor) m.instanceColor.needsUpdate = true;

  /* ---- THE POSE ------------------------------------------------------------------------------
     One function writes every part of every beast from its state, so a hit reaction or a defeat is
     a change to the state and never a second code path. R3-10 asks for those behaviours; the hooks
     are `hit` and `down` on each beast and the pose already reads them. */
  const _mm = new THREE.Matrix4(), _pp = new THREE.Vector3(), _qq = new THREE.Quaternion(),
    /* YXZ, NOT THE DEFAULT XYZ. Every part here is posed as "turn to face, then pitch nose-down":
       with XYZ the pitch is applied about the WORLD x axis before the yaw, so a beast facing north
       pitches correctly and the same beast facing east ROLLS onto its side instead. The bug is
       invisible in any single test pose and obvious in a pack, because a prowl orbit walks every
       creature through all four quadrants. YXZ applies the yaw first, so the pitch is about the
       body's own transverse axis wherever it happens to be pointing. */
    _ee = new THREE.Euler(0, 0, 0, 'YXZ'), _ss = new THREE.Vector3();
  const set = (mesh, idx, x, y, z, rx, ry, rz, sx, sy, sz) => {
    _pp.set(x, y, z); _ee.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _qq.setFromEuler(_ee);
    _ss.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    mesh.setMatrixAt(idx, _mm.compose(_pp, _qq, _ss));
  };
  let articulate = true;

  function pose(t) {
    for (let i = 0; i < N; i++) {
      const b = beasts[i];
      const S = b.s;
      /* PROWL: a slow orbit of the territory anchor, and the beast faces the way it is going. The
         boss barely moves — it holds the ground, which is what a boss does. */
      const ang = b.phase + t * b.rate;
      const px = b.orbit.x + Math.cos(ang) * b.rr;
      const pz = b.orbit.z + Math.sin(ang) * b.rr;
      const face = -ang + (b.rate > 0 ? -Math.PI / 2 : Math.PI / 2);
      /* the DOWN state drops the body and kills the gait — R3-10's defeat behaviour, as a pose */
      const down = b.down ? 1 : 0;
      /* the HIT state is a short recoil that decays; the assembly sets b.hit = 1 and it falls off */
      if (b.hit > 0) b.hit = Math.max(0, b.hit - 0.02);
      const recoil = (b.hit || 0) * 0.22;
      const gait = articulate && !down ? Math.sin(t * b.gait + b.phase) : 0;
      const bob = articulate && !down ? 0.026 * S * Math.sin(t * b.gait * 2 + b.phase) : 0;

      const hip = (G.hipH * S) * (1 - 0.72 * down) + bob;
      const lean = G.leanF + 0.26 * down + recoil;
      const cx = Math.sin(face), cz = Math.cos(face);   /* the beast's own forward axis */

      /* BODY — tilted forward, the mass falling back from the shoulders */
      set(iBody, i, px, hip, pz, lean, face, 0, S, S, S);
      /* the SPINE VEIN, one thin bright line along the back: the only part that moves in value */
      set(iVein, i, px - cx * 0.05 * S, hip + G.chest * 0.30 * S, pz - cz * 0.05 * S,
        lean, face, 0, 0.028 * S, 0.028 * S, G.len * 0.62 * S);

      /* HEAD — forward and down, which is a hunting carriage. Length in the jaw, not the cranium. */
      const hx = px + cx * G.len * 0.52 * S, hz = pz + cz * G.len * 0.52 * S;
      const hy = hip + G.chest * 0.16 * S - 0.06 * S * down;
      const hPitch = lean + 0.10 + 0.05 * gait;
      set(iHead, i, hx, hy, hz, hPitch, face, 0, S, S, S);
      set(iJaw, i, hx + cx * G.headLen * 0.30 * S, hy - G.headH * 0.26 * S, hz + cz * G.headLen * 0.30 * S,
        hPitch + 0.12, face, 0, S, S, S);
      set(iCrest, i, hx - cx * G.headLen * 0.18 * S, hy + G.headH * 0.36 * S, hz - cz * G.headLen * 0.18 * S,
        hPitch, face, 0, S * (b.boss ? 2.1 : 1), S * (b.boss ? 2.3 : 1), S * (b.boss ? 1.7 : 1));
      /* GEMSTONE EYES — small, bright, and set INTO the head rather than stuck on its surface */
      for (let e = 0; e < 2; e++) {
        const side = e ? 1 : -1;
        set(iEye, i * 2 + e,
          hx + cx * G.headLen * 0.22 * S + Math.cos(face) * side * G.headH * 0.24 * S,
          hy + G.headH * 0.10 * S,
          hz + cz * G.headLen * 0.22 * S - Math.sin(face) * side * G.headH * 0.24 * S,
          0, face, 0, G.eyeR * S, G.eyeR * S * 1.5, G.eyeR * S);
      }

      /* PLATES — overlapping down the spine, each one flatter and smaller than the last, like a
         graduated set. This is the single most "jewellery-store" part of the creature. */
      for (let p = 0; p < G.plates; p++) {
        const u = p / (G.plates - 1);
        const pw = G.chest * (1.06 - 0.44 * u) * S;
        set(iPlate, i * G.plates + p,
          px + cx * (0.42 - u * 0.92) * G.len * 0.5 * S,
          hip + G.chest * (0.34 - 0.06 * u) * S,
          pz + cz * (0.42 - u * 0.92) * G.len * 0.5 * S,
          lean - 0.10, face, 0, pw, pw * 1.4, pw * 0.72);
      }
      /* SQUARE-DIAMOND NODES at the shoulders and hips — the brand figure, load-bearing */
      for (let nd = 0; nd < G.nodes; nd++) {
        const fwd = nd < 2 ? 1 : -1, side = (nd % 2) ? 1 : -1;
        set(iNode, i * G.nodes + nd,
          px + cx * fwd * G.len * 0.26 * S + Math.cos(face) * side * G.chest * 0.46 * S,
          hip + G.chest * 0.16 * S,
          pz + cz * fwd * G.len * 0.26 * S - Math.sin(face) * side * G.chest * 0.46 * S,
          0, face + gold(nd), 0, 0.075 * S, 0.10 * S, 0.075 * S);
      }

      /* LIMBS — four, two segments each, and the FORE pair is longer. That single proportion is
         what makes it read as knuckle-walking rather than as a big cat, and it is the whole of the
         "monkey" in Monkey Dog. Diagonal pairs swing together, which is how a quadruped moves. */
      for (let L = 0; L < LIMBS; L++) {
        const fore = L < 2, side = (L % 2) ? 1 : -1;
        const len = (fore ? G.foreLen : G.hindLen) * S;
        const rad = (fore ? G.foreR : G.hindR) * S;
        const ax = px + cx * (fore ? 1 : -1) * G.len * 0.30 * S + Math.cos(face) * side * G.chest * 0.40 * S;
        const az = pz + cz * (fore ? 1 : -1) * G.len * 0.30 * S - Math.sin(face) * side * G.chest * 0.40 * S;
        const ay = hip + G.chest * 0.06 * S;
        const swing = gait * (fore === (side > 0) ? 1 : -1) * 0.34 * (1 - down);
        for (let sg = 0; sg < SEGS; sg++) {
          const segL = len * (sg === 0 ? 0.54 : 0.46);
          const top = ay - len * (sg === 0 ? 0 : 0.54);
          const bend = sg === 0 ? swing : -swing * 0.6 + 0.18;
          set(iLimb, (i * LIMBS + L) * SEGS + sg,
            ax + cx * Math.sin(bend) * segL * 0.5, top - Math.cos(bend) * segL * 0.5,
            az + cz * Math.sin(bend) * segL * 0.5,
            bend, face, 0, rad * 2 * (sg ? 0.82 : 1), segL, rad * 2 * (sg ? 0.82 : 1));
          /* PLATINUM AT THE JOINT. Metal is what holds stones — this is the detail that makes the
             creature read as made rather than grown, and it is R3-10's "joint jewelry" literally. */
          set(iRing, (i * LIMBS + L) * 2 + sg,
            ax + cx * Math.sin(bend) * segL, top - Math.cos(bend) * segL,
            az + cz * Math.sin(bend) * segL, bend, face, 0, rad * 1.5, rad * 1.5, rad * 1.5);
        }
        /* CLAWS — three cut shards at the foot, splayed. Premium form: a shard, never a hook. */
        const fy = ay - len * (1 - 0.10 * Math.abs(swing));
        const fxx = ax + cx * Math.sin(swing) * len * 0.55, fzz = az + cz * Math.sin(swing) * len * 0.55;
        for (let c = 0; c < G.claws; c++) {
          const spread = (c - 1) * 0.30;
          set(iClaw, (i * LIMBS + L) * G.claws + c,
            fxx + Math.cos(face + spread) * rad * 1.5, fy + rad * 0.4,
            fzz - Math.sin(face + spread) * rad * 1.5,
            0.5, face + spread, 0, S, S, S);
        }
      }
    }
    for (const m of [iBody, iHead, iJaw, iCrest, iLimb, iClaw, iPlate, iRing, iNode, iEye, iVein]) {
      m.instanceMatrix.needsUpdate = true;
    }
  }
  pose(0);
  for (const m of [iBody, iHead, iJaw, iCrest, iLimb, iClaw, iPlate, iRing, iNode, iEye, iVein]) {
    stats.triangles += (m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3) * m.count;
  }

  let quiet = false;
  return {
    group, stats,
    /* the gameplay surface R3-10 asks for, as state rather than as animation code */
    beastAt: i => beasts[i] || null,
    hit(i) { const b = beasts[i]; if (b) b.hit = 1; return !!b; },
    defeat(i) { const b = beasts[i]; if (b) b.down = true; return !!b; },
    revive(i) { const b = beasts[i]; if (b) { b.down = false; b.hit = 0; } return !!b; },
    update(t) { if (!quiet) pose(t); },
    /* R3-13's animation tier: past LOD_FAR the pack holds its pose. The beasts stay — an empty
       territory is a worse trade than a still one, exactly as the mahnimals argue. */
    setDetail(dist) { articulate = dist < BEASTS.LOD_FAR; return articulate; },
    setTime(s) {
      const night = 1 - (s && s.daylight != null ? s.daylight : 0);
      vein.opacity = 0.24 + 0.44 * night;
      eyeMat.opacity = 0.55 + 0.40 * night;
    },
    setTheme(th) {
      if (!th) return;
      if (th.energyLight != null) vein.color.setHex(th.energyLight);
      if (th.energy != null) eyeMat.color.setHex(th.energy);
    },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      quiet = !!low;
      /* the jewellery is the first thing to go at the low tier and the body is the last: a pack you
         can still see is worth more than a perfect one you cannot afford */
      iClaw.visible = !low; iRing.visible = !low; iNode.visible = !low; iCrest.visible = !low;
    },
    dispose() {
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

function parked(group, stats) {
  return {
    group, stats, beastAt: () => null, hit: () => false, defeat: () => false, revive: () => false,
    update() {}, setDetail() { return false; }, setTime() {}, setTheme() {}, setQuality() {},
    dispose() { if (group.parent) group.parent.remove(group); }
  };
}

export default { buildMahBeasts, FAMILIES, BEASTS };
