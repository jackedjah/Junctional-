/* MAHWORLD :: LAKE CITY — the second destination, organised BY water
   ============================================================================================

   R2 §5. Not a district of the civic city and not an island theme-park: a physically separate
   destination with real travel distance, its own topology and a silhouette you could not mistake
   for MAHPLAZA's at any range.

   ---- WHERE IT STANDS, AND WHY THERE -----------------------------------------------------------
   Bearing 62, centre radius 560 m. Every part of that is measured against what already exists:

     · BEARING 62 is not a free choice — it is where terrain.js already reserved the water. Its
       BASIN sits at bearing 62, r 330, with half-extents 210 x 130, i.e. its far shore reaches
       r ~= 460 along that line. Lake City's own water begins at ~430, so the two READ AS ONE
       SYSTEM rather than as two puddles: you can follow the water out from the plaza's valley to
       the city that grew on it. §13, realness through cause — water occupies terrain, and a second
       body of water that ignored the first would be scenery.

     · RADIUS 700 IS INSIDE A MOUNTAIN PASS, and that took a measurement to get right. The first
       attempt put the city at 560, reasoning that it would sit clear between the district (whose
       furthest blocks are ~330) and the near range at 700. Rendering it put the approach camera
       inside a mountain flank: traversing the built scene showed the near range's merged mesh
       spanning x -1111..1281, i.e. its peaks reach INWARD to about r 535, leaving only 205 m of
       clear annulus — not room for a destination. So terrain.js now opens a real PASS at bearings
       47-77 (its own PASS constant) by pushing every peak out of that wedge, and the city stands in
       it at the range's own radius. A lake in a mountain pass is more credible than a lake on a
       plain, and the mid range at 1050 m still closes the horizon behind it — which is where §8's
       "hero silhouette against a ridge" actually comes from.

     · 700 m is also real travel. At roam's boost speed of 70 m/s that is ten seconds of flight with
       the home skyline receding behind you — §9's traversal, not a camera cut.

   ---- THE SILHOUETTE IS THE IDENTITY (§7, §8) --------------------------------------------------
   §7 forbids differentiating cities by recolouring them, and §3 requires the palette to be shared,
   so the difference has to be STRUCTURAL. The civic city is slab towers on a flat deck: broad
   rectangles, even spacing, a horizontal skyline. Lake City is the opposite reading:

       ONE tall central spire standing IN the water, ringed by a descending spiral of terraces
       and a colonnade of thin masts, with everything else kept low and horizontal.

   So from 560 m the civic city reads as a comb and Lake City reads as a single vertical event over
   a horizontal plane. That distinction survives fog, LOD and a 200 m altitude change, which is the
   test §8 actually sets.

   ---- WATER SHAPES THE TOPOLOGY, NOT THE DECOR -------------------------------------------------
   §5 says water must shape the city. So the build order here is: cut the lake FIRST as an irregular
   plan, then place every piece of architecture from the water's own geometry —

     · TERRACES step DOWN to the waterline on the near shore, each tread a measured 2.4 m drop, so
       the shore is a stair and not a wall;
     · the CAUSEWAY and the two BRIDGES span between terrace heads across the narrowest crossings,
       because that is where a bridge is cheap to build and therefore where one would be;
     · DOCKS sit at the ends of the causeway, in the water, from the FOBLOCK genome (§5 forbids
       ordinary boats and this module builds none — it builds the places craft arrive);
     · the SPIRE stands on the deepest point, which is what a landmark does.

   Nothing here is placed on a bearing table. Every position is derived from the lake polygon, and
   the module reports the derivation in stats so a later pass can check it rather than trust it.

   ---- LAW 1, AT 560 METRES ---------------------------------------------------------------------
   A metal takes no diffuse light: at metalness >= ~0.9 a surface is lit only by scene.environment,
   whose zenith is near-black, so every UP-FACING face in a mirror grade renders black. Shipped five
   times in this project. Every horizontal plane here — terrace treads, bridge decks, dock tables,
   the spire's setbacks — takes a LOW-metalness partner, and the module MEASURES the split by true
   triangle normal and reports the m² in stats.law1 rather than asserting it.

   And L05, aerial perspective: distance buys VALUE, not darkness. At 560 m this city must sit
   BETWEEN the near city and the 700 m mountains in value, so RECEDE lifts its base colours toward
   the horizon key and drops envMapIntensity. Shipped inverted three times; measured here.

   buildLakeCity(ctx) -> the standard module contract { group, stats, setTime, setTheme, update,
   setQuality, dispose }. */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox } from './materials.js';
import { foblockParts } from './foblock.js';
import { createMusicLineField } from './musicline.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;

/* SITE. Bearing convention is the world's: dir(b) = (sin b, 0, -cos b) — but terrain.js's BASIN
   uses its own polar() with cos/-sin, so the site is resolved through the SAME helper terrain.js
   uses, or the lake would land 28 degrees off the water it is supposed to continue. */
const polar = (aDeg, r) => [r * Math.cos(aDeg * DEG), -r * Math.sin(aDeg * DEG)];
const SITE = { bearing: 62, r: 700 };   /* the centre of terrain.js's PASS ring, not a free choice */
const WATER_Y = -1.4;                  /* terrain.js BASIN.y exactly: one water level, one system */
const SHORE_Y = 0;                     /* the raw ground plane the land ring sits on */

/* THE LAKE PLAN. An irregular closed polygon in local (x,z), NOT a disc — a disc reads as a pond
   and gives no narrow crossings for a bridge to want to exist at. Radii are sampled at 14 bearings
   and interpolated; the two pinches at index 4 and 10 are where the bridges go, and they are
   deliberately opposite each other so the causeway can run straight through the middle. */
const LAKE_R = [232, 258, 274, 246, 176, 205, 243, 268, 251, 219, 168, 198, 236, 249];

/* AERIAL PERSPECTIVE at 560 m (L05). Verified against terrain.js's near range base 0x0d1526 /
   ridge 0x3a4d76: this city must sit ABOVE the civic district and BELOW that ridge in value. */
const RECEDE = { env: 0.62, tint: 0x4b6089, mix: 0.34 };

/* TERRACES. Four shelves stepping down to the water on the near (plaza-facing) shore. `t` is the
   fraction of the lake radius the shelf head sits at; the drop is a measured 2.4 m per tread so a
   MAHBEING at 1.9 m reads the stair as climbable rather than as a cliff. */
const TERRACE = { steps: 4, drop: 2.4, tread: 13.0, from: 1.14, arcFrom: -46 * DEG, arcTo: 78 * DEG };

/* THE SPIRE — the identity. Height is set against the backdrop, not picked: terrain.js's near range
   runs 210-370 m at r 700, so a 292 m spire at 560 m reads as a vertical event standing clear of a
   ridge line without out-topping it, which is what keeps the mountains reading as mountains. */
const SPIRE = { h: 292, baseR: 26, tiers: 9, twist: 7.5 * DEG };

/* the colonnade of thin masts around the spire: low, many, and all the same, so the eye reads them
   as a ring and the spire as the singular thing standing in it */
const COLONNADE = { count: 14, r: 62, h: 54, w: 3.4 };

/* ---------------------------------------------------------------- normal-split buckets (LAW 1) */
const LEVEL = 0.5;                     /* |ny| <= 0.5 is "within 30 deg of vertical" — monument.js's
                                          threshold, for the same optical reason */
function newBuckets() {
  const b = {};
  for (const k of ['steep', 'up', 'down', 'stone', 'tread']) {
    b[k] = { pos: [], nor: [], col: [], area: 0, up: 0, down: 0, level: 0, maxNy: 0 };
  }
  return b;
}
const ROLE = {
  metal: { steep: 'steep', up: 'up', down: 'down' },
  mass: { steep: 'stone', up: 'tread', down: 'tread' }
};
function pushTri(B, role, a, b, c, colr) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  if (len < 1e-9) return;
  nx /= len; ny /= len; nz /= len;
  const r = ROLE[role] || ROLE.mass;
  const t = B[ny > LEVEL ? r.up : ny < -LEVEL ? r.down : r.steep];
  t.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  t.nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  const cc = colr || 1;
  for (let i = 0; i < 3; i++) t.col.push(cc, cc, cc);
  const area = len * 0.5;
  t.area += area;
  if (Math.abs(ny) > 0.985) t.level += area;
  if (Math.abs(ny) > t.maxNy) t.maxNy = Math.abs(ny);
  if (ny > LEVEL) t.up += area; else if (ny < -LEVEL) t.down += area;
}
/* read an existing geometry out through the splitter under a matrix */
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

/* the lake radius at an angle, by interpolating the plan table */
function lakeR(a) {
  const n = LAKE_R.length;
  const f = ((a % TAU) + TAU) % TAU / TAU * n;
  const i = Math.floor(f), k = f - i;
  const s = k * k * (3 - 2 * k);                 /* smoothstep: a lake has no corners */
  return LAKE_R[i % n] * (1 - s) + LAKE_R[(i + 1) % n] * s;
}

export function buildLakeCity(ctx) {
  const { M, scene } = ctx;
  const theme = ctx.theme || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'lake-city';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { site: {}, lake: {}, terraces: 0, bridges: 0, docks: 0, colonnade: 0, draws: 0, triangles: 0, law1: {}, derived: {}, skipped: [] };

  const [SX, SZ] = polar(SITE.bearing, SITE.r);
  group.position.set(SX, 0, SZ);
  stats.site = { bearing: SITE.bearing, r: SITE.r, x: +SX.toFixed(1), z: +SZ.toFixed(1) };

  /* recede a shared grade for 560 m (L05) */
  const far = (base, key, mix) => {
    if (!base) return base;
    const m = base.clone();
    m.envMapIntensity = (base.envMapIntensity !== undefined ? base.envMapIntensity : 1) * RECEDE.env;
    if (m.color) m.color.lerp(new THREE.Color(RECEDE.tint), mix == null ? RECEDE.mix : mix);
    m.vertexColors = true;
    m.name = 'lake-' + key;
    owned.materials.push(m);
    return m;
  };
  /* THE FLOOR IS PITCH BLACK, AND IT IS THE SAME FLOOR AS THE PLAZA'S. Director lock §07: the
     walking surface of MAHWORLD is near-black and reflective, everywhere, not only on the civic
     deck. M.paving is the grade that lesson produced (L03 — near-black albedo, metalness kept
     deliberately LOW at 0.40 so LAW 1 still holds and an up-facing face takes diffuse light rather
     than returning the near-black zenith). So every horizontal plane in this city — terrace treads,
     bridge decks, dock aprons, spire setbacks — takes it.

     AND IT KEEPS ITS BLACK AT 700 m. The distance recede lerps toward the horizon key by 0.34, which
     is right for a mass that must sit correctly in aerial perspective (L05) and WRONG for a floor
     that is supposed to be black: it would arrive as mid blue. The floors take a much smaller mix,
     and their value comes from the REFLECTION instead — which is exactly the plaza's own recipe
     (L02: crush the surface term, then ADD the reflection). The vertical grades keep the full
     recede, because those are the masses aerial perspective is actually about. */
  const GRADE = {
    steep: far(M.platinumMid || M.platinum, 'steep'),
    up: far(M.paving || M.platinumMidLit, 'up', 0.10),       /* LAW 1 partner AND the black floor */
    down: far(M.platinumLit || M.platinumMidLit, 'down'),
    stone: far(M.graphiteMetal || M.graphite, 'stone'),
    tread: far(M.paving || M.graphiteLight, 'tread', 0.10)
  };

  const B = newBuckets();
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
  const place = (x, y, z, ry, sx, sy, sz) => {
    _p.set(x, y, z); _e.set(0, ry || 0, 0); _q.setFromEuler(_e);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(_p, _q, _s);
  };

  /* ---- 1. THE LAKE ------------------------------------------------------------------------- */
  /* Cut first, because everything else is placed from it. A triangle fan over the plan polygon at
     WATER_Y, plus a shore lip that rises to SHORE_Y so the water meets ground instead of ending in
     a seam — §14 forbids dead edges and a water plane floating over a gap is exactly that. */
  const SEG = 96;
  {
    const pos = [], nor = [];
    for (let i = 0; i < SEG; i++) {
      const a0 = i / SEG * TAU, a1 = (i + 1) / SEG * TAU;
      const r0 = lakeR(a0), r1 = lakeR(a1);
      const x0 = Math.cos(a0) * r0, z0 = Math.sin(a0) * r0;
      const x1 = Math.cos(a1) * r1, z1 = Math.sin(a1) * r1;
      pos.push(0, WATER_Y, 0, x1, WATER_Y, z1, x0, WATER_Y, z0);
      for (let k = 0; k < 3; k++) nor.push(0, 1, 0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
    own(g);
    /* THE WATER HAS TO MAKE ITS OWN VALUE, AND THAT TOOK A CHANGE OF METHOD.
       The first cut was color 0x0a1526 / roughness 0.055 / metalness 0.34 — a physically sensible
       still-water grade. It rendered INVISIBLE: from above, the lake was exactly the value of the
       ground around it and the spire appeared to stand on nothing. The reason is LAW 1 in its milder
       form. A horizontal surface reflects the ZENITH, and this sky's zenith is near-black, so a dark
       low-roughness horizontal plane at night has nothing to return. The plaza deck escapes this only
       because mahplaza.js runs a real planar-mirror pass over it; a lake 700 m out gets no such pass
       and never will, because a second full scene render for one surface is not a trade worth making.

       AN EARLIER PASS ANSWERED THIS BY LIFTING THE WATER'S VALUE — an emissive in the horizon key,
       a raised base colour, a broad additive sheen. That was wrong twice over. It was wrong on the
       evidence, because the lake was not dark, it was BEHIND A MOUNTAIN and could not have been
       judged from those frames at all (L26). And it was wrong on the direction: §07 says the floor
       of this world is near-black and reflective, and a glowing lake is the opposite of a black
       mirror. The lift is gone.

       What makes a black surface read is not its own value, it is what it RETURNS. So the water is
       pitch black — albedo 0x04070c, roughness 0.045 — and the reading comes entirely from the
       inverted city built below it (see THE REFLECTION, further down). Crush the surface, add the
       reflection: exactly the operator L02 cost three passes to find for the plaza deck. */
    const water = new THREE.MeshStandardMaterial({
      color: 0x04070c, roughness: 0.045, metalness: 0.30,
      envMapIntensity: 1.5 * RECEDE.env
    });
    water.name = 'lake-water'; owned.materials.push(water);
    const mesh = new THREE.Mesh(g, water);
    mesh.name = 'lake-water'; mesh.receiveShadow = true;
    group.add(mesh);
    /* THE SHEEN SHEET IS DELIBERATELY NOT HERE. An earlier pass laid a broad additive disc over the
       water, brightest at the centre, to give the lake "a gradient instead of a flat fill". On a
       black mirror that is precisely the wrong instrument: it fills the surface with its own light
       and destroys the only thing a black mirror has to offer, which is that dark reflected content
       adds NOTHING and the stone stays black while a lit window adds a streak. Removed rather than
       dimmed — §14, remove before adding. */
    /* THE SHORELINE, the brightest thing on the water. Where a lake meets land there is always a
       line — §13, realness through cause — and it is what tells the eye where the water ENDS, which
       is the reading the first cut had no way to give. */
    {
      const pos = [], col = [];
      for (let i = 0; i < SEG; i++) {
        const a0 = i / SEG * TAU, a1 = (i + 1) / SEG * TAU;
        const r0 = lakeR(a0), r1 = lakeR(a1);
        const p = (a, r, y, w) => { pos.push(Math.cos(a) * r, y, Math.sin(a) * r); col.push(1, 1, 1, w); };
        p(a0, r0 - 3.4, WATER_Y + 0.10, 0); p(a1, r1 - 3.4, WATER_Y + 0.10, 0); p(a1, r1, WATER_Y + 0.12, 0.9);
        p(a0, r0 - 3.4, WATER_Y + 0.10, 0); p(a1, r1, WATER_Y + 0.12, 0.9); p(a0, r0, WATER_Y + 0.12, 0.9);
      }
      const rg = new THREE.BufferGeometry();
      rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
      rg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 4));
      own(rg);
      const rm = new THREE.MeshBasicMaterial({
        color: new THREE.Color(theme.energyLight), vertexColors: true, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true
      });
      rm.name = 'lake-shoreline'; owned.materials.push(rm);
      const rim = new THREE.Mesh(rg, rm);
      rim.name = 'lake-shoreline'; rim.renderOrder = 3;
      group.add(rim);
    }
    let area = 0;
    for (let i = 0; i < SEG; i++) {
      const a0 = i / SEG * TAU, a1 = (i + 1) / SEG * TAU;
      area += 0.5 * lakeR(a0) * lakeR(a1) * Math.sin(a1 - a0);
    }
    stats.lake = { segments: SEG, rMin: Math.min(...LAKE_R), rMax: Math.max(...LAKE_R), area_m2: Math.round(area), y: WATER_Y };
  }
  /* the shore lip: a skirt from the waterline out and up to the ground plane */
  for (let i = 0; i < SEG; i++) {
    const a0 = i / SEG * TAU, a1 = (i + 1) / SEG * TAU;
    const r0 = lakeR(a0), r1 = lakeR(a1), o0 = r0 + 9, o1 = r1 + 9;
    const p = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    pushTri(B, 'mass', p(a0, r0, WATER_Y), p(a1, r1, WATER_Y), p(a1, o1, SHORE_Y), 0.82);
    pushTri(B, 'mass', p(a0, r0, WATER_Y), p(a1, o1, SHORE_Y), p(a0, o0, SHORE_Y), 0.82);
  }

  /* ---- 2. THE TERRACES — the shore is a stair (§5) ------------------------------------------ */
  /* Placed from the lake polygon, not from a table: each shelf head sits at a fraction of the LOCAL
     lake radius, so the stair follows the water's own irregular plan and the treads vary in width
     exactly as the shoreline does. That is what makes it read as cut for this lake. */
  {
    const A0 = TERRACE.arcFrom, A1 = TERRACE.arcTo, N = 60;
    for (let s = 0; s < TERRACE.steps; s++) {
      const yTop = SHORE_Y - s * TERRACE.drop, yBot = yTop - TERRACE.drop;
      const fOut = TERRACE.from - s * (TERRACE.tread / 232);
      const fIn = TERRACE.from - (s + 1) * (TERRACE.tread / 232);
      for (let i = 0; i < N; i++) {
        const a0 = A0 + (A1 - A0) * (i / N), a1 = A0 + (A1 - A0) * ((i + 1) / N);
        const R0o = lakeR(a0) * fOut, R1o = lakeR(a1) * fOut;
        const R0i = lakeR(a0) * fIn, R1i = lakeR(a1) * fIn;
        const p = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
        /* the TREAD: up-facing, so it takes the low-metalness partner by measured normal */
        pushTri(B, 'metal', p(a0, R0o, yTop), p(a1, R1o, yTop), p(a1, R1i, yTop), 0.94);
        pushTri(B, 'metal', p(a0, R0o, yTop), p(a1, R1i, yTop), p(a0, R0i, yTop), 0.94);
        /* the RISER: vertical, so it takes the mirror grade and returns the lit horizon */
        pushTri(B, 'metal', p(a0, R0i, yTop), p(a1, R1i, yTop), p(a1, R1i, yBot), 0.7);
        pushTri(B, 'metal', p(a0, R0i, yTop), p(a1, R1i, yBot), p(a0, R0i, yBot), 0.7);
      }
      stats.terraces++;
    }
  }

  /* ---- 3. THE SPIRE — the silhouette (§7, §8) ------------------------------------------------ */
  /* Nine setbacks over 292 m, each rotated by a fixed twist, standing on the lake's deepest point
     (its centre). Every setback TABLE is up-facing and therefore low-metalness (LAW 1); every shaft
     face is vertical and takes the mirror. The twist is what stops it reading as a stack of boxes —
     the silhouette gains an edge every tier instead of one hard vertical line. */
  {
    let y = WATER_Y;
    for (let i = 0; i < SPIRE.tiers; i++) {
      const t = i / (SPIRE.tiers - 1);
      const h = SPIRE.h / SPIRE.tiers * (1.28 - 0.52 * t);
      const r = SPIRE.baseR * (1 - 0.86 * Math.pow(t, 0.78));
      const g = chamferBox(r * 2, h, r * 2, Math.min(2.6, r * 0.22));
      bake(B, 'metal', g, place(0, y + h / 2, 0, i * SPIRE.twist), 0.86 + 0.1 * t);
      g.dispose();
      /* the setback SHELF at each joint: a wider low-metalness table, which is both the LAW 1
         partner and the thing that makes a tier read as a floor rather than a step in a taper */
      if (i < SPIRE.tiers - 1) {
        const sg = chamferBox(r * 2.32, 1.5, r * 2.32, 0.5);
        bake(B, 'metal', sg, place(0, y + h + 0.75, 0, i * SPIRE.twist + SPIRE.twist * 0.5), 1.0);
        sg.dispose();
      }
      y += h;
    }
    stats.derived.spireTop = +y.toFixed(1);
    /* the crown: the brand figure, kept sharp (§06's one exemption) */
    const crown = new THREE.Mesh(own(new THREE.OctahedronGeometry(1, 0)), M.energyLight || M.energy);
    crown.name = 'lake-spire-crown';
    crown.scale.set(7.2, 12.4, 7.2); crown.position.set(0, y + 12.4, 0);
    group.add(crown);
    if (ctx.reflect) { try { ctx.reflect(crown, 0.5); } catch (e) {} }
  }

  /* ---- 4. THE COLONNADE — the ring that makes the spire singular ---------------------------- */
  {
    for (let i = 0; i < COLONNADE.count; i++) {
      const a = i / COLONNADE.count * TAU;
      const x = Math.cos(a) * COLONNADE.r, z = Math.sin(a) * COLONNADE.r;
      const g = chamferBox(COLONNADE.w, COLONNADE.h, COLONNADE.w, 0.5);
      bake(B, 'metal', g, place(x, WATER_Y + COLONNADE.h / 2, z, -a), 0.78);
      g.dispose();
      /* a blunt cap, ending on a FACET — §06 forbids a needle */
      const c = chamferBox(COLONNADE.w * 1.5, 1.8, COLONNADE.w * 1.5, 0.42);
      bake(B, 'metal', c, place(x, WATER_Y + COLONNADE.h + 0.9, z, -a), 1.0);
      c.dispose();
      stats.colonnade++;
    }
  }

  /* ---- 5. THE CAUSEWAY AND BRIDGES — placed at the lake's narrowest crossings (§13) ---------- */
  /* The plan's two pinches are at table index 4 and 10, deliberately opposite. A crossing is
     CHEAPEST there, so that is where one would exist; the module measures the two spans it built
     and reports them, so the claim is checkable. */
  {
    const pinch = [4, 10].map(i => i / LAKE_R.length * TAU);
    const deckY = SHORE_Y + 5.6, w = 11.5;
    for (let k = 0; k < pinch.length; k++) {
      const a = pinch[k], r = lakeR(a);
      const span = r * 1.9;
      const ca = Math.cos(a), sa = Math.sin(a);
      /* the DECK: a long low box, its table up-facing and therefore low-metalness */
      const dg = chamferBox(span, 1.9, w, 0.55);
      bake(B, 'metal', dg, place(ca * r * 0.05, deckY, sa * r * 0.05, -a + Math.PI / 2), 0.96);
      dg.dispose();
      /* PIERS that actually hold it up — §13: supports hold weight. Four per span, standing on the
         lake bed, each rising from below the waterline so it reads as founded and not floating. */
      for (let i = 0; i < 4; i++) {
        const t = -0.36 + i * 0.24;
        const px = ca * span * t, pz = sa * span * t;
        const pg = chamferBox(3.6, (deckY - WATER_Y) + 7.0, 4.4, 0.6);
        bake(B, 'mass', pg, place(px, WATER_Y - 3.5 + ((deckY - WATER_Y) + 7.0) / 2, pz, -a + Math.PI / 2), 0.62);
        pg.dispose();
      }
      /* the parapet, both sides: vertical, mirror grade, and what gives a bridge its line at 560 m */
      for (const s of [-1, 1]) {
        const rg = chamferBox(span, 1.15, 0.7, 0.22);
        bake(B, 'metal', rg, place(ca * r * 0.05 - sa * s * (w / 2 - 0.4), deckY + 1.5, sa * r * 0.05 + ca * s * (w / 2 - 0.4), -a + Math.PI / 2), 1.0);
        rg.dispose();
      }
      stats.bridges++;
      stats.derived['span' + k] = +span.toFixed(1);
    }
  }

  /* ---- 6. THE DOCKS — FOB genome, never a boat (§5) ------------------------------------------ */
  /* §5 prohibits ordinary boats. This module builds none: it builds the PLACES craft arrive, from
     foblock.js's genome, so a dock is visibly the same family as a plaza station and a SKYBLOCK
     carrier. Four of them, at the ends of the two bridge spans, standing in the water. */
  {
    const proto = foblockParts({ tier: 'architectural', diamond: false, energy: true });
    const keys = Object.keys(proto);
    const pinch = [4, 10].map(i => i / LAKE_R.length * TAU);
    for (const a of pinch) {
      const r = lakeR(a);
      for (const s of [-1, 1]) {
        const dx = Math.cos(a) * r * 0.86 * s, dz = Math.sin(a) * r * 0.86 * s;
        /* the apron it stands on — a dock docks somewhere (§13) */
        const ap = chamferBox(30, 2.2, 22, 0.8);
        bake(B, 'metal', ap, place(dx, WATER_Y + 1.1, dz, -a), 0.9);
        ap.dispose();
        for (const k of keys) for (const g of proto[k]) {
          bake(B, k === 'cap' ? 'metal' : 'metal', g, place(dx, WATER_Y + 2.2, dz, -a + Math.PI / 2), k === 'dark' ? 0.5 : 0.88);
        }
        stats.docks++;
      }
    }
    for (const k of keys) for (const g of proto[k]) g.dispose();
  }

  /* ---- 7. EMIT THE GRADES, AND MEASURE LAW 1 ------------------------------------------------- */
  for (const k of Object.keys(B)) {
    const t = B[k];
    if (!t.pos.length) continue;
    const mesh = new THREE.Mesh(own(finish(t)), GRADE[k]);
    mesh.name = 'lake-' + k;
    mesh.castShadow = false;            /* 560 m out: outside every shadow cascade, and free */
    mesh.receiveShadow = false;
    group.add(mesh);
    stats.law1[k] = {
      metalness: GRADE[k].metalness,
      m2: +t.area.toFixed(1),
      upFacing_m2: +t.up.toFixed(1),
      downFacing_m2: +t.down.toFixed(1),
      withinTenDeg: +t.level.toFixed(1),
      maxNy: +t.maxNy.toFixed(3),
      tris: t.pos.length / 9
    };
  }

  /* ---- 7b. THE REFLECTION — what a black mirror is FOR --------------------------------------
     §07's floor law and L02's operator, applied to a lake. A pitch-black surface has no value of
     its own; everything it reads by is what it RETURNS. So the city is built a second time, inverted
     about the water plane, and ADDED on top of the black — never mixed into it.

     ADDITIVE IS THE WHOLE POINT AND IT IS NOT A STYLE CHOICE. `mix(surface, reflection, w)` REPLACES
     the surface, so a lake reflecting a lit spire at luminance 90 IS a lake at luminance 90 and the
     water stops being black — which is exactly how the plaza deck was got wrong for three passes
     before the operator was identified as the cause. Under ADD, a dark reflected mass contributes
     nothing and the water stays pitch black; a lit setback, a dock's energy strip or the crown
     diamond contributes a streak. The lake is then black WITH the city in it, which is the reading
     asked for.

     Cost: one extra draw per grade plus the crown, sharing the SAME geometry buffers as the
     originals — a mirrored copy is a second draw, never a second mesh's worth of memory.

     KNOWN LIMIT, stated rather than hidden: the copies are clipped by nothing but their own low
     alpha, so a piece of city that overhangs the shoreline reflects faintly onto the ground beyond
     it as well as onto the water. At 700 m and 0.16 alpha that is below the noise of the frame, and
     the honest fix is a stencil or a real planar pass — neither of which is worth a second full
     scene render for one surface at this distance. */
  {
    const refl = new THREE.Group();
    refl.name = 'lake-reflection';
    refl.scale.set(1, -1, 1);
    refl.position.y = 2 * WATER_Y;          /* mirror about the waterline, not about y = 0 */
    refl.renderOrder = 4;
    group.add(refl);
    const mirrorOf = (src, alpha) => {
      const m = new THREE.MeshBasicMaterial({
        color: src.material.color ? src.material.color.clone() : new THREE.Color(0x8fb0d8),
        vertexColors: !!src.material.vertexColors,
        transparent: true, opacity: alpha,
        blending: THREE.AdditiveBlending, depthWrite: false,
        side: THREE.DoubleSide,             /* the y-flip reverses winding; without this it vanishes */
        fog: true
      });
      m.name = src.material.name + '-reflected';
      owned.materials.push(m);
      const c = new THREE.Mesh(src.geometry, m);   /* geometry SHARED, not cloned */
      c.name = src.name + '-reflected';
      c.renderOrder = 4;
      c.frustumCulled = false;              /* its bounds are the original's, which are above water */
      refl.add(c);
      return c;
    };
    let n = 0;
    for (const nm of ['lake-steep', 'lake-up', 'lake-down', 'lake-stone', 'lake-tread']) {
      const src = group.getObjectByName(nm);
      /* the vertical grades carry the lit faces, so they earn most of the reflection; the black
         floors return almost nothing, which is correct — a black floor reflected in black water is
         still black */
      if (src) { mirrorOf(src, nm === 'lake-steep' ? 0.20 : 0.09); n++; }
    }
    const crown = group.getObjectByName('lake-spire-crown');
    if (crown) { mirrorOf(crown, 0.55); n++; }     /* the brand figure is the brightest streak */
    stats.reflected = n;
  }

  /* ---- 8. §10 — THE MUSIC-LINE MOTIF AT THIS CITY'S ENDPOINTS -------------------------------- */
  /* Every FOBEAM family carries the motif. Lake City's endpoints are its four docks and the spire
     crown, so those are where it goes — from the same shared infrastructure, at a scale measured
     for 560 m rather than for a hand (L23). */
  const mlSites = [];
  {
    const pinch = [4, 10].map(i => i / LAKE_R.length * TAU);
    for (const a of pinch) {
      const r = lakeR(a);
      for (const s of [-1, 1]) {
        mlSites.push({ x: Math.cos(a) * r * 0.86 * s, y: WATER_Y + 3.4, z: Math.sin(a) * r * 0.86 * s, ry: -a, scale: 7.0 });
      }
    }
    mlSites.push({ x: 0, y: (stats.derived.spireTop || 290) - 26, z: 0, ry: Math.atan2(-SX, -SZ), scale: 16 });
  }
  const musicLines = createMusicLineField(ctx, mlSites, { name: 'lake-musicline', opacity: 0.7 });
  group.add(musicLines.group);
  stats.musicLines = musicLines.stats;

  /* ---- 9. LAW 2 — the emitters are answered ------------------------------------------------- */
  const key = new THREE.PointLight(theme.energy, 120, 260, 2);
  key.name = 'lake-key';
  key.position.set(0, (stats.derived.spireTop || 290) + 8, 0);
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
    stats.derived.height = +(box.max.y - WATER_Y).toFixed(1);
    stats.derived.span = +(box.max.x - box.min.x).toFixed(1);
    stats.derived.distanceFromPlaza = +Math.hypot(SX, SZ).toFixed(1);
  }

  let night = 1;
  return {
    group, stats, musicLines,
    setTime(clockState) {
      const d = clockState && typeof clockState.daylight === 'number' ? clockState.daylight : 0;
      night = 1 - d;
      key.intensity = 120 * (0.28 + 0.72 * night);
    },
    setTheme(th) {
      const t = th && th.energy ? th : theme;
      key.color.setHex(t.energy);
      musicLines.setTheme(t);
    },
    update(t) { musicLines.update(t); },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      musicLines.setQuality(q);
      const crown = group.getObjectByName('lake-spire-crown');
      if (crown) crown.visible = !low;
    },
    dispose() {
      musicLines.dispose();
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

export default { buildLakeCity };
