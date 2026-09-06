/* MAHWORLD :: RAINFOREST CITY — the third destination, organised BY living organisms
   ============================================================================================

   R2 §6, and the lock that governs everything below it:

       DO NOT RECOLOUR IT GREEN.

   That is not a note about taste, it is the whole design problem. The easy rainforest is a green
   palette swap with some trunks in it, and §7 forbids exactly that — a biome differentiated by
   colour is not a biome, it is a filter. So this city keeps MAHWORLD's platinum, dark crystal,
   square diamond and MAHGIC unchanged, and earns its identity from STRUCTURE and BEHAVIOUR instead:
   what grows here, how it is organised, and the fact that it moves.

   ---- WHAT AN ORGANISM IS HERE (§6) ------------------------------------------------------------
   Not a tree with technology stuck on it. §18 names that failure explicitly — "rainforest organisms
   read as ordinary plants with tech stickers" — and the way past it is that the plant and the
   machine are the SAME OBJECT, grown from one set of parts:

     · a ROOT SPREAD that actually reaches the ground and splays — an organism roots into a surface
       (§13), it does not stand on it like furniture;
     · a TRUNK of stacked dark-crystalline segments, each one narrower and turned slightly, so the
       silhouette spirals rather than tapering like a cone (§06);
     · PLATINUM GROWTH BANDS at every segment joint — the same band that rings a MAHNIMAL and belts
       a FOBLOCK, at tree scale. This is the part that makes the family read;
     · a CANOPY of square-diamond NODES on splayed arms, kept sharp, because the brand figure is the
       leaf here;
     · a MAHGIC VEIN running the full height, from root to crown, which is the organism's circulation
       and the only thing that carries theme colour;
     · a FOB INTERFACE — a real collar at working height where the city plugs into the organism,
       because §6 asks for embedded FOB interfaces and §13 asks that things dock somewhere.

   ---- IT BREATHES ------------------------------------------------------------------------------
   §6 asks for "subtle breathing/orienting/pulsing behaviour". The canopy arms rise and fall on a
   slow per-organism phase and the vein brightens with them, so the forest is never still — and it
   is DETERMINISTIC, off the index, so a capture reproduces. §11's discipline applies: this is a
   breath, not a blink.

   ---- THE RAIN IS NOT RAIN (director) ----------------------------------------------------------
   "Very thin and detailed shards of diamond droplets with sparkling aura, NOT REGULAR RAIN."

   So there are no streaks and no drops. Each fall is a THIN SQUARE-DIAMOND SHARD — the brand figure
   again, elongated on its vertical axis and scaled to a few centimetres — tumbling as it descends,
   with a soft additive aura instanced alongside it so the fall sparkles rather than smears. The
   shards fall on a deterministic loop and recycle at the canopy line; nothing is spawned per frame
   and nothing is random.

   ---- THE SILHOUETTE IS THE IDENTITY (§7, §8) --------------------------------------------------
   Three destinations now have to be told apart at world scale, so the reading has to be structural:

       MAHPLAZA      a comb of slab towers on a flat black deck — HORIZONTAL rhythm, hard edges.
       LAKE CITY     one tall spire over a mirror plane — a single VERTICAL event, everything else low.
       RAINFOREST    a MASSED CANOPY at a common height with no single peak — a soft, broken, even
                     ceiling on many stems, which is the opposite reading to both.

   That difference survives fog and LOD, which is the test §8 actually sets.

   ---- WHERE IT STANDS --------------------------------------------------------------------------
   Bearing 127, radius 700 — the second corridor in terrain.js's PASSES table, opened the same way
   Lake City's was and for the same reason. It sits across the plaza from the lake so the far-zoom
   frame has a destination on either flank, and it uses the same ring radius so the two are peers
   rather than one being obviously the runt.

   buildRainforest(ctx) -> the standard module contract. */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox } from './materials.js';
import { createMusicLineField } from './musicline.js';
import { createMahnimals } from './mahnimals.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const polar = (aDeg, r) => [r * Math.cos(aDeg * DEG), -r * Math.sin(aDeg * DEG)];

const SITE = { bearing: 127, r: 700 };
const GROUND_Y = 0;

/* AERIAL PERSPECTIVE at 700 m (L05) — the same ladder Lake City uses, so the two peer cities sit at
   the same value and neither reads as nearer than it is. */
const RECEDE = { env: 0.62, tint: 0x4b6089, mix: 0.34 };

/* THE CANOPY IS A CEILING, NOT A SKYLINE. Heights are held in a narrow band on purpose: the identity
   is an even massed ceiling, and one organism twice the height of its neighbours would turn the
   whole city into "a spire again" and collide with Lake City's reading. */
const ORGANISM = { count: 26, hMin: 118, hMax: 168, segMin: 6, segMax: 9, baseR: 8.6, spread: 268, twist: 13 * DEG };
/* THE CANOPY IS LAYERED, NOT A TABLE. The first cut put every arm of an organism at ONE height and
   the stand rendered as a row of parasols — a flat ceiling with a hard line under it. A real canopy
   is TIERS: a wide low skirt, a mid layer, a small high crown, each shorter and higher than the one
   below. `drop` leans each arm DOWN from its collar so the layer hangs rather than sticking out,
   which is the difference between a branch and a bracket. */
const ARMS = {
  min: 4, max: 6,
  tiers: [
    { at: 0.74, len: 0.50, rise: -0.10, drop: 0.30, node: 1.00 },   /* low skirt, widest, hangs */
    { at: 0.88, len: 0.37, rise: 0.02, drop: 0.20, node: 0.80 },
    { at: 1.00, len: 0.22, rise: 0.13, drop: 0.06, node: 0.62 }     /* high crown, small, lifts */
  ]
};
const RAIN = { count: 620, r: 250, top: 190, bottom: 2, shard: 0.30, fall: 26 };

/* ------------------------------------------------------------- LAW 1 buckets (same as lakecity) */
const LEVEL = 0.5;
/* TWO ROLES, AND THE DIFFERENCE MATTERS. The first cut had one: every up-facing face went to the
   black paving grade. That satisfied LAW 1 and destroyed the design — the PLATINUM GROWTH BANDS,
   which this file's own header calls "the part that makes the family read", were up-facing and came
   out BLACK, so every organism rendered as a dark post with dark belts. The floor is black because
   §07 says the floor is black; a band is not a floor. */
function newBuckets() {
  const b = {};
  for (const k of ['steep', 'band', 'down', 'floor']) b[k] = { pos: [], nor: [], col: [], area: 0, up: 0, down: 0, level: 0, maxNy: 0 };
  return b;
}
const ROLE = {
  organism: { steep: 'steep', up: 'band', down: 'down' },   /* up-facing organism = PLATINUM band */
  floor:    { steep: 'floor', up: 'floor', down: 'floor' }  /* §07: the floor is near-black */
};
function pushTri(B, role, a, b, c, colr) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  if (len < 1e-9) return;
  nx /= len; ny /= len; nz /= len;
  const r = ROLE[role] || ROLE.organism;
  const t = B[ny > LEVEL ? r.up : ny < -LEVEL ? r.down : r.steep];
  t.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  t.nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  const cc = colr == null ? 1 : colr;
  for (let i = 0; i < 3; i++) t.col.push(cc, cc, cc);
  const ar = len * 0.5;
  t.area += ar;
  if (Math.abs(ny) > 0.985) t.level += ar;
  if (Math.abs(ny) > t.maxNy) t.maxNy = Math.abs(ny);
  if (ny > LEVEL) t.up += ar; else if (ny < -LEVEL) t.down += ar;
}
function bake(B, role, geo, m, colr) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.getAttribute('position');
  const v = new THREE.Vector3(), a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
  for (let i = 0; i < p.count; i += 3) {
    v.fromBufferAttribute(p, i).applyMatrix4(m); a[0] = v.x; a[1] = v.y; a[2] = v.z;
    v.fromBufferAttribute(p, i + 1).applyMatrix4(m); b[0] = v.x; b[1] = v.y; b[2] = v.z;
    v.fromBufferAttribute(p, i + 2).applyMatrix4(m); c[0] = v.x; c[1] = v.y; c[2] = v.z;
    pushTri(B, role, a, b, c, colr);
  }
  if (g !== geo) g.dispose();
}
function finish(t) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(t.pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(t.nor), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(t.col), 3));
  return g;
}

const gold = i => (i * 2.3999632) % TAU;
const frac = i => (i * 0.6180339887) % 1;
const frac2 = i => (i * 0.7548776662) % 1;

export function buildRainforest(ctx) {
  const { M, scene } = ctx;
  const theme = ctx.theme || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'rainforest-city';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { site: {}, organisms: 0, canopyArms: 0, rain: 0, mahnimals: {}, draws: 0, triangles: 0, law1: {}, derived: {}, skipped: [] };

  const [SX, SZ] = polar(SITE.bearing, SITE.r);
  group.position.set(SX, 0, SZ);
  stats.site = { bearing: SITE.bearing, r: SITE.r, x: +SX.toFixed(1), z: +SZ.toFixed(1) };

  const far = (base, key, mix) => {
    if (!base) return base;
    const m = base.clone();
    m.envMapIntensity = (base.envMapIntensity !== undefined ? base.envMapIntensity : 1) * RECEDE.env;
    if (m.color) m.color.lerp(new THREE.Color(RECEDE.tint), mix == null ? RECEDE.mix : mix);
    m.vertexColors = true;
    m.name = 'forest-' + key;
    owned.materials.push(m);
    return m;
  };
  /* §07 again: the ground a viewer would stand on is near-black. The forest floor is M.paving at a
     reduced recede, exactly as Lake City's terraces are — the black floor is a WORLD law (L27). */
  const GRADE = {
    steep: far(M.graphiteMetal || M.graphite, 'tissue'),        /* dark crystalline trunk tissue */
    band: far(M.platinumLit || M.platinumMidLit, 'band'),       /* LAW 1 partner AND the growth band */
    down: far(M.platinumMidLit || M.platinumLit, 'under'),
    floor: far(M.paving || M.platinumMidLit, 'floor', 0.10)     /* §07: near-black, metalness 0.40 */
  };

  const B = newBuckets();
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3();
  const at = (x, y, z, ry, sx, sy, sz) => {
    _p.set(x, y, z); _e.set(0, ry || 0, 0); _q.setFromEuler(_e);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(_p, _q, _s);
  };

  /* ---- 1. THE ORGANISMS ---------------------------------------------------------------------- */
  /* Everything about one organism comes from its index, so the forest is reproducible and no two
     stems share a phase. The canopy nodes and the vein are kept OUT of the merge because they are
     what animates; the trunk and roots are static and merge into the shared grade buckets. */
  const canopyNodes = [];      /* placement data for the instanced canopy — the part that breathes */
  const veinMats = [];

  for (let i = 0; i < ORGANISM.count; i++) {
    /* placement: a sunflower spiral so the stand is even without a grid and without randomness */
    const rr = ORGANISM.spread * Math.sqrt(frac(i * 3 + 1));
    const ang = gold(i);
    const ox = Math.cos(ang) * rr, oz = Math.sin(ang) * rr;
    const h = ORGANISM.hMin + (ORGANISM.hMax - ORGANISM.hMin) * frac2(i * 5 + 2);
    const segs = Math.round(ORGANISM.segMin + (ORGANISM.segMax - ORGANISM.segMin) * frac(i * 7 + 3));
    const baseR = ORGANISM.baseR * (0.78 + 0.5 * frac2(i * 11 + 5));

    /* THE ROOT SPREAD — six splayed buttresses that reach the ground. §13: an organism roots into a
       surface. Each is a chamfered box leaned outward from the stem foot, so the trunk arrives at
       the floor as a spread rather than as a cut cylinder. */
    for (let k = 0; k < 6; k++) {
      const a = gold(i * 13 + k) + k * TAU / 6;
      const rl = baseR * 2.1;
      const g = chamferBox(baseR * 0.52, h * 0.085, rl, 0.5);
      const m4 = at(ox + Math.cos(a) * rl * 0.42, GROUND_Y + h * 0.030, oz + Math.sin(a) * rl * 0.42, -a);
      m4.multiply(new THREE.Matrix4().makeRotationX(0.30));
      bake(B, 'organism', g, m4, 0.56);
      g.dispose();
    }

    /* THE TRUNK — stacked segments, each narrower and TURNED, so the silhouette spirals. A plain
       taper would be the cone §06 forbids; the turn is what gives it an edge to catch light on. */
    let y = GROUND_Y, prevR = baseR;
    for (let sgi = 0; sgi < segs; sgi++) {
      const t = sgi / (segs - 1 || 1);
      const sh = h / segs * (1.18 - 0.36 * t);
      /* a STRONGER taper than the first cut's 0.62: at 0.62 the segments barely narrowed and the
         trunk read as a square post with belts on it. 0.80 gives a stem that visibly thins toward
         the canopy, which is what makes it read as grown rather than assembled. */
      const r = baseR * (1 - 0.80 * Math.pow(t, 0.74));
      const g = chamferBox(r * 2, sh, r * 2, Math.min(1.6, r * 0.26));
      bake(B, 'organism', g, at(ox, y + sh / 2, oz, ORGANISM.twist * sgi + gold(i)), 0.60 + 0.14 * t);
      g.dispose();
      /* PLATINUM GROWTH BAND at the joint — the part that makes the family read. Up-facing by
         construction, so it lands in the low-metalness bucket and LAW 1 holds without a special case. */
      const bg = chamferBox(r * 2.38, 1.5, r * 2.38, 0.45);
      bake(B, 'organism', bg, at(ox, y + sh, oz, ORGANISM.twist * sgi + gold(i) + ORGANISM.twist * 0.5), 1.0);
      bg.dispose();
      y += sh; prevR = r;
    }
    stats.derived['h' + i] = undefined;      /* not reported per organism; see canopyY below */

    /* THE FOB INTERFACE — a real collar at working height. §6 asks for embedded FOB interfaces and
       §13 asks that things dock somewhere; this is where the city plugs into the organism. */
    {
      const cy = GROUND_Y + h * 0.20;
      const cg = chamferBox(baseR * 1.9, 3.4, baseR * 1.9, 0.7);
      bake(B, 'organism', cg, at(ox, cy, oz, gold(i) + 0.4), 0.9);
      cg.dispose();
    }

    /* THE CANOPY — square-diamond nodes on splayed, DROOPING arms, in THREE TIERS. The nodes are
       collected here and emitted as ONE instanced mesh after the loop: the first cut gave every node
       its own Mesh so it could breathe, which cost 193 draw calls for the stand alone and is exactly
       what §19 asks instancing to prevent. An InstancedMesh breathes just as well — the breath is a
       matrix, not a scene node. */
    for (let ti = 0; ti < ARMS.tiers.length; ti++) {
      const T = ARMS.tiers[ti];
      const arms = Math.round(ARMS.min + (ARMS.max - ARMS.min) * frac2(i * 17 + 7 + ti));
      const armL = h * T.len;
      const collarY = GROUND_Y + h * T.at;
      for (let k = 0; k < arms; k++) {
        const a = gold(i * 19 + k * 3 + ti * 97) + k * TAU / arms;
        const nx = ox + Math.cos(a) * armL, nz = oz + Math.sin(a) * armL;
        const ny = collarY + armL * T.rise - armL * T.drop;
        const sc = (3.0 + 2.4 * frac(i * 23 + k + ti)) * T.node;
        canopyNodes.push({
          x: nx, y0: ny, z: nz, s: sc,
          phase: gold(i * 29 + k + ti * 13),
          rate: 0.16 + 0.15 * frac2(i * 31 + k),
          lift: (1.8 + 2.2 * frac(i * 37 + k)) * T.node,
          /* VALUE VARIES. Uniform pure-white nodes read as cut-out shapes pasted on; a canopy has
             lit leaves and shaded ones. The high crown catches most, the low skirt least. */
          tint: 0.42 + 0.58 * (0.35 + 0.65 * frac2(i * 41 + k)) * (0.62 + 0.38 * T.at),
          /* every node hangs at its own angle. Identical orientation is what made the first cut read
             as a sheet of stickers rather than as leaves. */
          tiltX: (frac(i * 43 + k) - 0.5) * 0.9,
          tiltZ: (frac2(i * 47 + k) - 0.5) * 0.9
        });
        stats.canopyArms++;
        /* THE ARM, drooping to its node so nothing floats (§13, §14) */
        const midY = (collarY + ny) / 2;
        /* THE ARM ARCS. Two straight spars still read as a television aerial — the stand looked
           like a plantation of telegraph poles with cross-arms. A branch leaves its collar rising,
           flattens, then falls away to its node, so the arm is built as FOUR short segments along a
           quadratic from the collar to the node, each thinner than the last. Four is the fewest that
           reads as a curve at this range, and it buys the whole difference between scaffolding and
           growth for four boxes an arm. */
        const SEGS = 4;
        const ctlx = ox + Math.cos(a) * armL * 0.42, ctlz = oz + Math.sin(a) * armL * 0.42;
        const ctly = collarY + armL * 0.16;               /* the control point: the arm rises first */
        const bez = u => {
          const v = 1 - u;
          return [v * v * ox + 2 * v * u * ctlx + u * u * nx,
                  v * v * collarY + 2 * v * u * ctly + u * u * ny,
                  v * v * oz + 2 * v * u * ctlz + u * u * nz];
        };
        for (let sgm = 0; sgm < SEGS; sgm++) {
          const p0 = bez(sgm / SEGS), p1 = bez((sgm + 1) / SEGS);
          const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
          const segL = Math.hypot(dx, dy, dz);
          if (segL < 0.05) continue;
          const w = 1.25 * T.node * (1 - 0.62 * (sgm / SEGS));
          const g2 = chamferBox(w, w, segL, Math.min(0.28, w * 0.3));
          const mm = at((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2, -a);
          mm.multiply(new THREE.Matrix4().makeRotationX(Math.atan2(-dy, Math.hypot(dx, dz))));
          bake(B, 'organism', g2, mm, 0.70 + 0.20 * (sgm / SEGS));
          g2.dispose();
        }
      }
      /* the COLLAR the tier springs from — a band, so a tier is visibly attached to the stem */
      const cr = baseR * (1 - 0.80 * Math.pow(T.at, 0.74)) * 1.5;
      const cg = chamferBox(cr * 2, 2.2, cr * 2, 0.5);
      bake(B, 'organism', cg, at(ox, collarY, oz, gold(i) + ti * 0.7), 0.98);
      cg.dispose();
    }

    /* THE MAHGIC VEIN — root to crown, the organism's circulation, and the only theme colour on it */
    {
      const vm = new THREE.MeshBasicMaterial({
        color: new THREE.Color(theme.energy), transparent: true, opacity: 0.30,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: true
      });
      vm.name = 'forest-vein'; owned.materials.push(vm); veinMats.push(vm);
      const vg = own(new THREE.CylinderGeometry(baseR * 0.16, baseR * 0.07, h, 5, 1, true));
      const v = new THREE.Mesh(vg, vm);
      v.position.set(ox, GROUND_Y + h / 2, oz);
      v.name = 'forest-vein'; v.renderOrder = 5;
      group.add(v);
    }
    stats.organisms++;
  }
  /* ---- 1b. THE CANOPY, AS ONE INSTANCED MESH -------------------------------------------------
     Every node in the stand, one draw. instanceColor carries the per-node value so a canopy has lit
     leaves and shaded ones without a second material. */
  let canopyMesh = null;
  {
    const N = canopyNodes.length;
    const nodeGeo = own(new THREE.OctahedronGeometry(1, 0));       /* THE SQUARE DIAMOND, kept sharp */
    nodeGeo.scale(1, 1.5, 0.72);   /* not a flat lozenge: real depth, so each node catches differently */
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94, fog: true });
    nodeMat.name = 'forest-canopy-node'; owned.materials.push(nodeMat);
    canopyMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, N);
    canopyMesh.name = 'forest-canopy';
    canopyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    canopyMesh.frustumCulled = false;
    const base = new THREE.Color(theme.energyLight || 0xdff1ff);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const n = canopyNodes[i];
      c.copy(base).multiplyScalar(n.tint);
      canopyMesh.setColorAt(i, c);
    }
    if (canopyMesh.instanceColor) canopyMesh.instanceColor.needsUpdate = true;
    group.add(canopyMesh);
  }
  {
    const lo = ARMS.tiers[0], hi = ARMS.tiers[ARMS.tiers.length - 1];
    stats.derived.canopyY = +(GROUND_Y + ORGANISM.hMin * lo.at).toFixed(1);
    stats.derived.canopyTop = +(GROUND_Y + ORGANISM.hMax * hi.at + ORGANISM.hMax * hi.len * hi.rise).toFixed(1);
    stats.derived.canopyNodes = canopyNodes.length;
  }

  /* ---- 2. THE FOREST FLOOR — near-black, §07 -------------------------------------------------- */
  {
    const SEG = 64, R = ORGANISM.spread + 60;
    for (let i = 0; i < SEG; i++) {
      const a0 = i / SEG * TAU, a1 = (i + 1) / SEG * TAU;
      const p = (a, r) => [Math.cos(a) * r, GROUND_Y + 0.12, Math.sin(a) * r];
      pushTri(B, 'floor', [0, GROUND_Y + 0.12, 0], p(a1, R), p(a0, R), 0.5);
    }
  }

  /* ---- 3. EMIT THE GRADES, AND MEASURE LAW 1 -------------------------------------------------- */
  for (const k of Object.keys(B)) {
    const t = B[k];
    if (!t.pos.length) continue;
    const mesh = new THREE.Mesh(own(finish(t)), GRADE[k]);
    mesh.name = 'forest-' + k;
    group.add(mesh);
    stats.law1[k] = {
      metalness: GRADE[k].metalness, m2: +t.area.toFixed(1),
      upFacing_m2: +t.up.toFixed(1), downFacing_m2: +t.down.toFixed(1),
      withinTenDeg: +t.level.toFixed(1), maxNy: +t.maxNy.toFixed(3), tris: t.pos.length / 9
    };
  }

  /* ---- 4. THE RAIN THAT IS NOT RAIN ----------------------------------------------------------
     Thin square-diamond shards with a sparkling aura. Two instanced meshes: the shard itself, and a
     soft additive twin scaled up around it which is the aura. Both are driven by one loop; nothing
     is spawned and nothing is random, so a capture reproduces exactly. */
  let rainCore = null, rainAura = null, rainA = null;
  {
    const N = RAIN.count;
    const sg = new THREE.OctahedronGeometry(1, 0);
    sg.scale(RAIN.shard * 0.22, RAIN.shard * 2.6, RAIN.shard * 0.22);   /* THIN, and detailed */
    own(sg);
    const ag = new THREE.OctahedronGeometry(1, 0);
    ag.scale(RAIN.shard * 0.9, RAIN.shard * 3.4, RAIN.shard * 0.9);
    own(ag);
    const sm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdff1ff), transparent: true, opacity: 0.9, depthWrite: false, fog: true });
    sm.name = 'forest-rain'; owned.materials.push(sm);
    const am = new THREE.MeshBasicMaterial({
      color: new THREE.Color(theme.energyLight), transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: true
    });
    am.name = 'forest-rain-aura'; owned.materials.push(am); veinMats.push(am);
    rainCore = new THREE.InstancedMesh(sg, sm, N);
    rainAura = new THREE.InstancedMesh(ag, am, N);
    for (const m of [rainCore, rainAura]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; group.add(m); }
    rainCore.name = 'forest-rain'; rainAura.name = 'forest-rain-aura';
    rainCore.renderOrder = 6; rainAura.renderOrder = 6;
    rainA = new Array(N);
    for (let i = 0; i < N; i++) {
      const rr = RAIN.r * Math.sqrt(frac(i * 3 + 1));
      const a = gold(i);
      rainA[i] = {
        x: Math.cos(a) * rr, z: Math.sin(a) * rr,
        t0: frac2(i * 5 + 1), spin: gold(i * 7), spinRate: 1.1 + 2.3 * frac(i * 11),
        speed: RAIN.fall * (0.72 + 0.6 * frac2(i * 13)), s: 0.7 + 0.8 * frac(i * 17)
      };
    }
    stats.rain = N;
  }

  /* ---- 5. §10 — the music-line motif at this city's FOBEAM endpoints -------------------------- */
  const mlSites = [];
  for (let i = 0; i < ORGANISM.count; i += 4) {
    const rr = ORGANISM.spread * Math.sqrt(frac(i * 3 + 1));
    const ang = gold(i);
    const h = ORGANISM.hMin + (ORGANISM.hMax - ORGANISM.hMin) * frac2(i * 5 + 2);
    mlSites.push({ x: Math.cos(ang) * rr, y: GROUND_Y + h * 0.20 + 2.6, z: Math.sin(ang) * rr, ry: Math.atan2(-SX, -SZ), scale: 7.5 });
  }
  const musicLines = createMusicLineField(ctx, mlSites, { name: 'forest-musicline', opacity: 0.72 });
  group.add(musicLines.group);
  stats.musicLines = musicLines.stats;

  /* ---- 6. MAHNIMALS — the forest is inhabited ------------------------------------------------- */
  const fauna = [
    createMahnimals(ctx, { family: 'drifter', count: 44, centre: [0, stats.derived.canopyY - 26, 0], radius: 210, yLow: -18, yHigh: 26, scale: 2.6, seed: 11 }),
    createMahnimals(ctx, { family: 'grazer', count: 26, centre: [0, GROUND_Y + 3.2, 0], radius: 240, yLow: 0, yHigh: 2.4, scale: 2.1, seed: 29 })
  ];
  for (const f of fauna) { group.add(f.group); }
  stats.mahnimals = { drifters: fauna[0].stats.count, grazers: fauna[1].stats.count };

  /* ---- 7. LAW 2 — the emitters are answered --------------------------------------------------- */
  const key = new THREE.PointLight(theme.energy, 90, 300, 2);
  key.name = 'forest-key';
  key.position.set(0, stats.derived.canopyY - 10, 0);
  group.add(key);

  scene.add(group);
  group.updateMatrixWorld(true);
  group.traverse(o => {
    if (!o.isMesh) return;
    stats.draws++;
    const g = o.geometry, idx = g.getIndex();
    const n = idx ? idx.count / 3 : g.getAttribute('position').count / 3;
    stats.triangles += o.isInstancedMesh ? n * o.count : n;
  });
  {
    const box = new THREE.Box3().setFromObject(group);
    stats.derived.height = +(box.max.y - GROUND_Y).toFixed(1);
    stats.derived.span = +(box.max.x - box.min.x).toFixed(1);
  }

  let night = 1;
  return {
    group, stats, musicLines,
    setTime(clockState) {
      const d = clockState && typeof clockState.daylight === 'number' ? clockState.daylight : 0;
      night = 1 - d;
      key.intensity = 90 * (0.28 + 0.72 * night);
      for (const m of veinMats) m.opacity = m.name === 'forest-rain-aura' ? 0.16 * (0.4 + 0.6 * night) : 0.30 * (0.34 + 0.66 * night);
    },
    setTheme(th) {
      const t = th && th.energy ? th : theme;
      key.color.setHex(t.energy);
      for (const m of veinMats) m.color.setHex(m.name === 'forest-rain-aura' ? t.energyLight : t.energy);
      musicLines.setTheme(t);
      fauna.forEach(f => f.setTheme(t));
    },
    update(t) {
      /* THE FOREST BREATHES (§6). Canopy nodes rise and fall on their own slow phase — a breath,
         never a blink, and deterministic so a capture reproduces. */
      if (canopyMesh) {
        for (let i = 0; i < canopyNodes.length; i++) {
          const c = canopyNodes[i];
          _p.set(c.x, c.y0 + Math.sin(t * c.rate + c.phase) * c.lift, c.z);
          _e.set(c.tiltX, c.phase, c.tiltZ + Math.sin(t * c.rate * 0.7 + c.phase) * 0.10);
          _q.setFromEuler(_e);
          _s.set(c.s, c.s, c.s);
          _m.compose(_p, _q, _s);
          canopyMesh.setMatrixAt(i, _m);
        }
        canopyMesh.instanceMatrix.needsUpdate = true;
      }
      /* THE SHARDS FALL, tumbling as they go and recycling at the canopy line */
      if (rainCore) {
        const span = RAIN.top - RAIN.bottom;
        for (let i = 0; i < rainA.length; i++) {
          const a = rainA[i];
          const u = ((a.t0 + t * a.speed / span) % 1 + 1) % 1;
          const y = RAIN.top - u * span;
          _e.set(0.42, a.spin + t * a.spinRate, 0.22);
          _q.setFromEuler(_e);
          _p.set(a.x, y, a.z); _s.set(a.s, a.s, a.s);
          _m.compose(_p, _q, _s);
          rainCore.setMatrixAt(i, _m);
          rainAura.setMatrixAt(i, _m);
        }
        rainCore.instanceMatrix.needsUpdate = true;
        rainAura.instanceMatrix.needsUpdate = true;
      }
      musicLines.update(t);
      fauna.forEach(f => f.update(t));
    },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      musicLines.setQuality(q);
      fauna.forEach(f => f.setQuality(q));
      if (rainAura) rainAura.visible = !low;              /* the aura is the first thing to go */
      if (rainCore) rainCore.count = low ? Math.round(RAIN.count * 0.35) : RAIN.count;
    },
    dispose() {
      musicLines.dispose();
      fauna.forEach(f => f.dispose());
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

export default { buildRainforest };
