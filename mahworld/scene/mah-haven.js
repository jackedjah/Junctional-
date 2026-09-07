/* MAHWORLD R5 :: MAH HAVEN — the peaceful waterfront, and the groundwork for a food region.

   R5 §10: "MAH HAVEN is the peaceful waterfront / rural-support region associated with the existing
   Lake City direction. Do not overbuild it during this pass. Lay the groundwork and topology."

   §12: "peaceful, rural-leaning, slower-paced, community-oriented, food-oriented, nature-integrated,
   lower-rise than MAH City, less technologically dense without abandoning MAHWORLD's visual genome."

   ---- THE REFERENCE IS A COMPOSITION, NOT A PLACE -----------------------------------------------
   The supplied waterfront photograph is a sequence and that sequence is the entire brief for §11:

       a NARROW paved approach, flower beds pressing in on both sides
       -> a short flight of steps DOWN
       -> a rail at the bottom, which is where the frame opens
       -> a promenade running left-right across your path
       -> a low shore edge
       -> WATER, wide and flat, with a light path straight down it
       -> a low serrated mountain horizon

   The feeling is not the water. It is the CONTRAST: you are held in a corridor two metres wide, and
   then the world is thirty kilometres wide. R5 says it plainly — "a narrower arrival path that opens
   toward the water" — and everything in this file's entrance sequence exists to build that one
   moment. What is NOT taken: the signage, the business identity, the real architecture, the people,
   the exact planting. Those are named in the manifest and they stay out.

   ---- WHERE, AND HOW THE SITE WAS FOUND -------------------------------------------------------
   Two placements failed before this one and both failed the same way: a district built inside a
   mountain. The first sat at local bearing 232 on LAKE CITY's lake and photographed a black lake;
   the second moved to 118 for the light and a raycast down the reveal axis found `terrain-range-near`
   FOUR METRES in front of the camera. terrain.js's own header records this exact failure — "The
   first placement attempt put its camera inside a mountain flank, which is how this was found" —
   so the third attempt stopped guessing and swept.

   THE SWEEP KILLED THE LAKE OUTRIGHT. Sixty bearings around LAKE CITY's shore, each sampling a
   5 x 5 grid of this district's own footprint: EVERY ONE returned rock, with 95 to 435 m of relief.
   That water sits at r 700, ringed by the near range, and Lake City works there only because it cut
   terraces into the flank. There is no shore to stand on.

   So MAH HAVEN stands on the world's OTHER water — terrain.js's BASIN, an ellipse 210 x 130 at
   bearing 62, r 330, water at y -1.4. The same sweep over its perimeter found a run of bearings
   with ZERO relief and ZERO rock, and one of them is remarkable:

       ellipse parameter 66 deg     relief 0.0 m     rock 0/25     ground 25/25
       view axis 3 degrees off the world's fixed sun bearing of 243.4

   Three degrees. The sun comes almost straight down the water at you, which is the reference
   photograph, and it is flat buildable ground. That is not a taste decision and it was not
   available to reasoning — only to measurement.

   The basin also sits BETWEEN MAH CITY and LAKE CITY inside terrain.js's pass, so the district is
   on the Lake City direction R5 asks for, and looking across its water you have the city you came
   from — which is how "an immediate contrast from dense MAH City" gets built rather than asserted.

   ---- THIS PASS IS FOOTPRINTS -----------------------------------------------------------------
   R5 §13 lists exactly what to establish and §15 draws a hard line: "Do not prematurely introduce
   ordinary Earth livestock without explicit design approval. For now create the spatial/agricultural
   infrastructure and resource logic, not a barn full of real cows/chickens." So there are growing
   frames, water channels, service pads and covered rows here, and there is not one animal. The
   street-food district is a set of kiosk pads and a communal seating deck, not a decorated stall.

   buildMahHaven(ctx, opts) -> the standard module contract, plus zones() and navSites(). */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, signTexture } from './materials.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const gold = i => (i * 0.6180339887) % 1;
const frac = i => (i * 0.7548776662) % 1;
/* terrain.js's own polar helper, quoted — the world's bearing convention lives there */
const polar = (aDeg, r) => [r * Math.cos(aDeg * DEG), -r * Math.sin(aDeg * DEG)];

export const HAVEN = Object.freeze({
  /* THE SHORE BEARING IS THE ELLIPSE PARAMETER ON terrain.js's BASIN, and it was measured, not
     chosen. See the header: a 60-bearing sweep of both bodies of water in the world, sampling this
     district's own 5 x 5 footprint at each, is what produced it. 66 is the one bearing that is both
     flat buildable ground (relief 0.0 m, rock 0 of 25 samples) and front-lit — its outward view
     axis lands 3 degrees off MAHWORLD's fixed sun bearing of 243.4, so the light comes down the
     water at you exactly as it does in the reference. */
  SHORE_DEG: 66,
  /* how far the district reaches back from the waterline, and how wide along the shore */
  DEPTH: 300,
  HALF_W: 260,
  GROUND_Y: 0,           /* terrain.js's raw ground plane, the same one the lake lip rises to */
  WATER_Y: -1.4,         /* lakecity.js's WATER_Y — overridden from its export when available */
  /* the entrance sequence, measured BACK from the waterline along the axis */
  APPROACH_LEN: 96,      /* the narrow corridor */
  APPROACH_W: 7.4,       /* two people wide, and that is the whole trick */
  STEPS: 5,
  PROMENADE_W: 22
});

export function buildMahHaven(ctx, opts = {}) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'mah-haven';
  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = {
    draws: 0, triangles: 0, zones: [], beds: 0, kiosks: 0, rows: 0, seats: 0, docks: 0, growers: 0,
    shorelineM: 0, waterY: HAVEN.WATER_Y
  };

  /* ---- THE WATER, read from the module that cut it ------------------------------------------ */
  const W = opts.water || null;                     /* { centre:[x,z], rx, rz, y } — terrain's BASIN */
  const LC = W && W.centre ? W.centre : polar(62, 330);
  const RX = (W && W.rx) || 210, RZ = (W && W.rz) || 130;
  const waterY = (W && typeof W.y === 'number') ? W.y : HAVEN.WATER_Y;
  stats.waterY = waterY;

  /* THE SHORE POINT AND THE OUTWARD NORMAL, and the normal is NOT the radius.
     An ellipse's outward normal is its gradient, (px/rx^2, pz/rz^2) normalised — on a 210 x 130
     ellipse the radial direction and the true normal differ by up to 17 degrees, so a district laid
     along the radius would sit visibly skewed to its own waterline, with the entrance corridor
     meeting the shore at an angle nobody would build. */
  const aS = HAVEN.SHORE_DEG * DEG;
  const px = RX * Math.cos(aS), pz = RZ * Math.sin(aS);
  let gx = px / (RX * RX), gz = pz / (RZ * RZ);
  const gl = Math.hypot(gx, gz) || 1; gx /= gl; gz /= gl;
  const nx = gx, nz = gz;                            /* unit vector from the water outward */
  const rS = Math.hypot(px, pz);
  const SHORE = [LC[0] + px, LC[1] + pz];
  /* the AXIS runs from the shore INLAND (away from the water). Everything in the entrance sequence
     is placed as a distance back along it, so the sequence cannot come apart. */
  const ax = nx, az = nz;                           /* inland is +axis */
  const tx = -nz, tz = nx;                          /* along the shore */
  const site = (back, lat) => [SHORE[0] + ax * back + tx * lat, SHORE[1] + az * back + tz * lat];
  stats.site = { deg: HAVEN.SHORE_DEG, shore: [+SHORE[0].toFixed(1), +SHORE[1].toFixed(1)],
    waterCentre: [+LC[0].toFixed(1), +LC[1].toFixed(1)], shoreR: +rS.toFixed(1),
    rx: RX, rz: RZ, normal: [+nx.toFixed(3), +nz.toFixed(3)] };

  /* the yaw that turns a box's local +X along the SHORE and its +Z inland. Written once, because
     the axis convention is this project's most productive source of defects. */
  const ROT = Math.atan2(-ax, az) + Math.PI / 2;

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3();
  function mat(x, y, z, ry, sx, sy, sz) {
    _p.set(x, y, z); _e.set(0, ry == null ? 0 : ry, 0); _q.setFromEuler(_e);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(_p, _q, _s).clone();
  }
  /* place by (back-from-shore, along-shore): the only coordinate system this district uses */
  function put3(bucket, geo, back, lat, y, value, spin) {
    const [x, z] = site(back, lat);
    put(bucket, geo, mat(x, y, z, ROT + (spin || 0)), value);
  }

  const B = { plat: [], dark: [], stone: [], green: [] };
  const put = (b, geo, matrix, value) => B[b].push({ geo, matrix, value });
  /* DECLARED HERE, WITH THE OTHER STATE, NOT NEXT TO sign(). Written beside the function that
     fills it — below the build that calls it — a `const` is in the temporal dead zone, the first
     sign() throws a ReferenceError, the assembly's guarded catch turns it into one console line,
     and the ENTIRE DISTRICT silently does not exist. This is the second time in two modules; the
     rule is now: every array a builder closes over is declared with the buckets. */
  const signMats = [];

  /* ---- materials. R5 §17: "softer materials, more natural surface variation, less dense emission,
     platinum/diamond used as refined infrastructure rather than constant visual dominance." ---- */
  const platinum = (M.platinumLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0xb6c4d6 })).clone();
  platinum.vertexColors = true; platinum.name = 'haven-platinum'; owned.materials.push(platinum);
  const darkMat = (M.paving || M.graphiteMetal || new THREE.MeshStandardMaterial({ color: 0x0b0f16 })).clone();
  darkMat.vertexColors = true; darkMat.name = 'haven-dark';
  darkMat.roughness = 0.62; darkMat.envMapIntensity = 0.24;
  owned.materials.push(darkMat);
  /* THE STONE. This is the material separation R5 §17 asks for, and it is the one place in
     MAHWORLD where a walking surface is allowed NOT to be a near-black mirror: a rural promenade
     paved like MAH PULSE would read as an airport apron. Warm-neutral, genuinely rough, almost no
     environment term — the surface reads by its own value rather than by what it reflects, which
     is what "softer materials, more natural surface variation" has to mean in PBR terms. */
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x6b6a63, roughness: 0.88, metalness: 0.04, envMapIntensity: 0.30, vertexColors: true
  });
  stoneMat.name = 'haven-stone'; owned.materials.push(stoneMat);
  /* the planting: MAHWORLD's crystalline organisms, not Earth flowers. Two values so a bed has
     depth rather than being one painted mass. */
  /* AND IT IS NOT NEON. 0x2f6f52 at emissive 0.28 photographed as saturated jade against grey
     stone — MAHWORLD's organisms glow, but a RURAL district whose planting out-saturates its
     architecture is a theme park. Desaturated toward the world's cool neutral, with the emissive
     kept for night, where it is the thing that says these are living crystal and not shrubs. */
  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x3f5f4e, roughness: 0.74, metalness: 0.08, envMapIntensity: 0.38,
    emissive: 0x0b1f18, emissiveIntensity: 0.22, vertexColors: true
  });
  greenMat.name = 'haven-growth'; owned.materials.push(greenMat);

  /* ================================================================================================
     1. THE ENTRANCE SEQUENCE — the one moment this district is for
     ============================================================================================== */
  {
    const A = HAVEN.APPROACH_LEN, W = HAVEN.APPROACH_W;
    /* THE CORRIDOR. 7.4 m wide over 96 m, with beds pressing in to 4.6 m of clear walking width.
       Narrow is the whole mechanism: the reveal is worth nothing if you were already in the open. */
    for (let i = 0; i < 12; i++) {
      const back = A - (i + 0.5) * (A / 12);
      put3('stone', chamferBox(W, 0.34, A / 12 - 0.5, 0.1), back, 0, 0.20 + 0.05 * frac(i * 3), 0.62);
      /* the beds, both sides, alternating depth so the corridor breathes rather than being a chute */
      for (const side of [-1, 1]) {
        const d = 2.6 + 1.5 * frac(i * 7 + (side > 0 ? 1 : 0));
        put3('stone', chamferBox(d, 0.85, A / 12 - 0.8, 0.18), back, side * (W * 0.5 + d * 0.5), 0.42, 0.30);
        put3('plat', chamferBox(d + 0.3, 0.16, A / 12 - 0.8, 0.06), back, side * (W * 0.5 + d * 0.5), 0.92, 0.98);
        /* WHAT GROWS IN IT, and the scale is the whole difference between a bed and a camp.
           The first cut put THREE organisms per bed at up to 2.6 m across, and they photographed as
           green tents standing in a planter — an object that big is a tree, and a tree every four
           metres down a 96 m corridor is an avenue, not a flower bed. Nine per bed at 0.35-0.85 m
           reads as PLANTING: the eye takes the mass, not the individuals, which is what a bed is.
           They are still square diamonds and still wider than tall (§06) — the same organism the
           rest of the world grows, at the size a border plant actually is. */
        for (let g = 0; g < 9; g++) {
          const o = new THREE.OctahedronGeometry(1, 0);
          const sc = 0.35 + 0.5 * frac(i * 11 + g * 5 + (side > 0 ? 3 : 0));
          o.scale(sc * 1.35, sc * 0.8, sc * 1.35);
          put3('green', own(o), back + ((g % 3) - 1) * (A / 40),
            side * (W * 0.5 + d * 0.5) + (frac(g * 13 + i) - 0.5) * d * 0.72,
            0.95 + sc * 0.4, 0.42 + 0.5 * gold(i * 3 + g), gold(i + g * 3) * TAU);
        }
        stats.beds++;
      }
    }
    /* THE STEPS DOWN. Five treads, and they matter: descending is what makes the horizon rise. */
    for (let s = 0; s < HAVEN.STEPS; s++) {
      const back = 4 + s * 2.4;
      put3('stone', chamferBox(W + 5, 0.42, 2.4, 0.08), back, 0, 0.34 - s * 0.085, 0.26);
      put3('plat', chamferBox(W + 5.4, 0.09, 0.34, 0.03), back - 1.2, 0, 0.55 - s * 0.085, 1.0);
    }
    /* THE RAIL. Where the corridor lets go of you. Low — 1.05 m — so it never crosses the horizon
       from a standing eye, which is the one thing that would undo the reveal. */
    for (const side of [-1, 1]) {
      put3('plat', chamferBox(0.22, 1.05, 0.22, 0.06), 3, side * (W * 0.5 + 2.2), 0.52, 0.96);
    }
    put3('plat', chamferBox(W + 4.6, 0.16, 0.22, 0.05), 3, 0, 1.02, 1.0);
    /* THE PROMENADE, crossing the axis. In the reference it is a road; here it is the district's
       primary path, and it is what carries you left and right into the rest of MAH HAVEN. */
    for (let i = -9; i <= 9; i++) {
      put3('stone', chamferBox(28, 0.36, HAVEN.PROMENADE_W, 0.1), -6, i * 28, 0.10, 0.22 + 0.06 * frac(i * 5));
    }
    /* THE SHORE EDGE: a low seawall, and it is LOW. A parapet you cannot see over is a wall. */
    for (let i = -10; i <= 10; i++) {
      put3('stone', chamferBox(26, 1.5, 3.0, 0.3), -19, i * 26, -0.45, 0.30);
      put3('plat', chamferBox(26, 0.18, 3.3, 0.07), -19, i * 26, 0.36, 0.92);
      stats.shorelineM += 26;
    }
    /* and the water's own margin — a shingle apron running down to the waterline, so the land does
       not simply stop at a line */
    for (let i = -10; i <= 10; i++) {
      put3('stone', chamferBox(26, 0.5, 12, 0.4), -27, i * 26, -0.95 + (waterY + 1.4) * 0.5, 0.16);
    }
  }

  /* ================================================================================================
     2. THE SCENIC OVERLOOK — R5 §13, and the frame the district will be photographed from
     ============================================================================================== */
  {
    const back = -12, lat = 96;
    put3('stone', chamferBox(34, 1.6, 26, 0.5), back, lat, 0.6, 0.26);
    put3('plat', chamferBox(35.6, 0.2, 27.6, 0.07), back, lat, 1.48, 0.96);
    for (const s of [-1, 1]) {
      put3('plat', chamferBox(0.24, 1.05, 26, 0.06), back, lat + s * 13, 1.9, 1.0);
      put3('plat', chamferBox(34, 1.05, 0.24, 0.06), back + s * 12.6, lat, 1.9, 1.0);
    }
    /* three benches facing the water — you sit looking OUT, which is the only correct orientation
       for a bench in a place whose entire purpose is a view */
    for (let i = -1; i <= 1; i++) {
      put3('stone', chamferBox(6.4, 0.34, 1.4, 0.14), back + 6, lat + i * 10, 2.1, 0.34);
      put3('stone', chamferBox(2.6, 0.7, 1.0, 0.2), back + 6, lat + i * 10, 1.75, 0.28);
      stats.seats++;
    }
    sign('MAH HAVEN', 'waterfront — food, growing, rest', 62, 96, 6.2, 15);
    stats.zones.push({ id: 'overlook', back, lat, w: 34, d: 26 });
  }

  /* ================================================================================================
     3. THE STREET-FOOD FOOTPRINT — R5 §14, reserved and not decorated
     ============================================================================================== */
  {
    const back = 26, lat = -110;
    /* the deck the district's kiosks will stand on, with its bays marked out in platinum */
    put3('stone', chamferBox(96, 0.5, 54, 0.3), back, lat, 0.25, 0.24);
    put3('plat', chamferBox(97.4, 0.14, 55.4, 0.06), back, lat, 0.54, 0.94);
    /* eight KIOSK PADS. A pad, not a stall: R5 says reserve the footprint and do not build the
       decorated stall yet, so what exists is the rounded-square platform each will stand on and
       the service spine behind it. */
    for (let i = 0; i < 8; i++) {
      const px = back + (i < 4 ? 16 : -16), py = lat + ((i % 4) - 1.5) * 22;
      put3('dark', chamferBox(9.5, 1.0, 7.5, 1.6), px, py, 0.95, 0.26);
      put3('plat', chamferBox(10.2, 0.16, 8.2, 0.06), px, py, 1.52, 0.98);
      stats.kiosks++;
    }
    /* the communal seating between the two rows — open-air, long tables, water in view */
    for (let i = 0; i < 5; i++) {
      const py = lat + (i - 2) * 11;
      put3('stone', chamferBox(2.2, 0.28, 8.6, 0.1), back, py, 1.28, 0.32);
      for (const s of [-1, 1]) {
        put3('stone', chamferBox(0.9, 0.24, 8.6, 0.08), back + s * 2.4, py, 0.92, 0.28);
        stats.seats++;
      }
    }
    sign('STREET FOOD', 'open air — local kitchens', 26, -110 - 34, 5.4, 12);
    stats.zones.push({ id: 'street-food', back, lat, w: 96, d: 54, kiosks: 8 });
  }

  /* ================================================================================================
     4. THE MINI-FARM — R5 §15, infrastructure only. NO LIVESTOCK.
     ============================================================================================== */
  {
    const back = 150, lat = 60;
    /* THE GROWING ROWS. Raised beds under low frames — the spatial and agricultural infrastructure
       R5 asks for, with the production categories (eggs, dairy analogs, protein produce) left
       unbuilt on purpose: "not a barn full of real cows/chickens", and no animal appears here. */
    for (let r = 0; r < 7; r++) {
      const py = lat + (r - 3) * 26;
      put3('stone', chamferBox(120, 0.8, 15, 0.25), back, py, 0.4, 0.22);
      put3('plat', chamferBox(121, 0.14, 16, 0.05), back, py, 0.87, 0.9);
      /* a low frame over every other row: the covered growing structure, still just a frame */
      if (r % 2 === 0) {
        for (let k = -3; k <= 3; k++) {
          put3('plat', chamferBox(0.5, 4.2, 0.5, 0.12), back + k * 18, py - 6.4, 2.9, 0.9);
          put3('plat', chamferBox(0.5, 4.2, 0.5, 0.12), back + k * 18, py + 6.4, 2.9, 0.9);
        }
        put3('plat', chamferBox(120, 0.34, 0.5, 0.08), back, py - 6.4, 5.1, 1.0);
        put3('plat', chamferBox(120, 0.34, 0.5, 0.08), back, py + 6.4, 5.1, 1.0);
        stats.growers++;
      }
      /* what is growing: low crystalline organisms in rows, deliberately regular — a farm reads as
         a farm because its planting is ORDERED, which is also what separates it from the reserve */
      for (let c = 0; c < 14; c++) {
        const o = new THREE.OctahedronGeometry(1, 0);
        const sc = 0.55 + 0.3 * frac(r * 13 + c * 7);
        o.scale(sc * 1.6, sc * 0.9, sc * 1.6);
        put3('green', own(o), back + (c - 6.5) * 8.6, py, 1.25, 0.55 + 0.4 * gold(r * 5 + c), 0);
      }
      stats.rows++;
    }
    /* the WATER CHANNEL feeding them, off the lake — a rural district's real infrastructure */
    put3('dark', chamferBox(3.2, 0.6, 210, 0.2), back - 66, lat, 0.2, 0.20);
    put3('plat', chamferBox(0.5, 0.5, 210, 0.12), back - 66 - 1.9, lat, 0.5, 0.9);
    put3('plat', chamferBox(0.5, 0.5, 210, 0.12), back - 66 + 1.9, lat, 0.5, 0.9);
    /* two SERVICE / STORAGE pads at the head of the rows */
    for (const s of [-1, 1]) {
      put3('dark', chamferBox(26, 4.5, 18, 1.4), back + 74, lat + s * 46, 2.25, 0.24);
      put3('plat', chamferBox(27.4, 0.4, 19.4, 0.14), back + 74, lat + s * 46, 4.7, 0.96);
    }
    sign('MAH GROW', 'natural food — rows, water, store', 150 - 78, 60, 5.0, 12);
    stats.zones.push({ id: 'mini-farm', back, lat, w: 120, d: 190, rows: 7 });
  }

  /* ================================================================================================
     5. COMMUNITY MARKET + LOW SERVICE ZONES — footprints, as R5 §13 asks
     ============================================================================================== */
  {
    /* the market hall's footprint: a plinth and a colonnade, no roof yet */
    const back = 62, lat = 150;
    put3('stone', chamferBox(58, 0.9, 40, 0.4), back, lat, 0.45, 0.26);
    put3('plat', chamferBox(59.4, 0.18, 41.4, 0.06), back, lat, 0.99, 0.96);
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
      put3('plat', chamferBox(1.5, 7.0, 1.5, 0.36), back + (i - 2.5) * 10.4, lat + s * 18, 4.4, 0.94);
    }
    put3('plat', chamferBox(58, 0.7, 1.8, 0.2), back, lat - 18, 8.2, 1.0);
    put3('plat', chamferBox(58, 0.7, 1.8, 0.2), back, lat + 18, 8.2, 1.0);
    sign('MAH MARKET', 'community food', 62 - 32, 150, 5.6, 12);
    stats.zones.push({ id: 'market', back, lat, w: 58, d: 40 });

    /* LOW HOUSING / SERVICE: nine footprints, none over 9 m, set back from the water. R5 §12 —
       "lower-rise than MAH City" — is a rule about SILHOUETTE, so what is reserved here is a
       height limit as much as a plan. */
    for (let i = 0; i < 9; i++) {
      const b = 96 + (i % 3) * 44, l = -190 + Math.floor(i / 3) * 40 + (frac(i * 7) - 0.5) * 12;
      const h = 5.5 + 3.0 * frac(i * 11);
      put3('dark', chamferBox(22, h, 17, 1.2), b, l, h * 0.5, 0.24);
      put3('plat', chamferBox(23.4, 0.4, 18.4, 0.12), b, l, h + 0.2, 0.94);
      put3('stone', chamferBox(30, 0.4, 25, 0.15), b, l, 0.2, 0.22);
    }
    stats.zones.push({ id: 'housing', count: 9, maxHeight: 8.5 });
  }

  /* ================================================================================================
     6. DOCKS AND FUTURE FOB TRANSPORT — reserved points on the water
     ============================================================================================== */
  {
    for (let d = 0; d < 3; d++) {
      const lat = -60 + d * 70;
      /* a dock runs OUT over the water, so its back coordinate goes negative */
      put3('stone', chamferBox(6.5, 1.0, 46, 0.25), -50, lat, -0.35, 0.28);
      put3('plat', chamferBox(7.4, 0.16, 47, 0.06), -50, lat, 0.22, 0.94);
      for (let k = 0; k < 5; k++) {
        put3('dark', chamferBox(1.1, 3.2, 1.1, 0.26), -50 + (k - 2) * 10, lat - 3.6, -1.6, 0.26);
        put3('dark', chamferBox(1.1, 3.2, 1.1, 0.26), -50 + (k - 2) * 10, lat + 3.6, -1.6, 0.26);
      }
      /* the FOB transport point at the head: a pad and a square-diamond marker, wired later */
      put3('plat', chamferBox(9, 0.5, 9, 0.2), -70, lat, 0.5, 1.0);
      const dia = own(new THREE.OctahedronGeometry(1, 0));
      dia.scale(2.4, 1.7, 2.4);
      put3('plat', dia, -70, lat, 4.2, 1.0, 0);
      stats.docks++;
    }
    stats.zones.push({ id: 'docks', count: 3 });
  }

  /* ================================================================================================
     7. THE VEGETATION RESERVE — the part that stays unbuilt, and is authored as unbuilt
     ============================================================================================== */
  {
    /* R3's density law applies here too: an empty area is intentional movement, view, future event,
       quiet space, arrival buffer — or an unbuilt defect. This one is a RESERVE, and what makes it
       read as reserve rather than as defect is that its planting is IRREGULAR where the farm's is
       ordered. Same organisms, opposite grammar. */
    for (let i = 0; i < 120; i++) {
      const b = 20 + 250 * frac(i * 3), l = (gold(i * 5) - 0.5) * 480;
      /* keep it out of the built zones: everything above sits within |lat| < 210 and back < 240 */
      if (Math.abs(l) < 200 && b < 230) continue;
      /* two tiers, so the reserve has a canopy and an understorey rather than one blob size —
         a wood reads as a wood because its scales are nested, and a field of identical 6 m
         octahedra reads as scenery props however carefully they are scattered */
      const big = frac(i * 17) > 0.72;
      const o = new THREE.OctahedronGeometry(1, 0);
      const sc = big ? (2.4 + 2.2 * frac(i * 11)) : (0.6 + 1.1 * frac(i * 11));
      o.scale(sc * 1.55, sc * (big ? 1.15 : 0.85), sc * 1.55);
      put3('green', own(o), b, l, 0.7 + sc * (big ? 0.9 : 0.55), 0.35 + 0.45 * gold(i), gold(i * 7) * TAU);
      /* a stem under the canopy tier, so the big ones stand rather than rest on the ground */
      if (big) put3('dark', chamferBox(sc * 0.5, sc * 1.5, sc * 0.5, sc * 0.12), b, l, sc * 0.75, 0.20);
    }
  }

  /* ---- signage ---------------------------------------------------------------------------------- */
  function sign(title, sub, back, lat, up, size) {
    const tex = signTexture({ title, sub, mark: true });
    owned.textures.push(tex);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.86, fog: true, toneMapped: true });
    m.name = 'haven-sign-' + title.toLowerCase().replace(/\s+/g, '-');
    owned.materials.push(m); signMats.push(m);
    if (ctx && ctx.signMaterials) ctx.signMaterials.push(m);
    const geo = own(new THREE.PlaneGeometry(size, size * (768 / 2048)));
    const [x, z] = site(back, lat);
    /* two back-to-back FrontSide planes — a DoubleSide plane shows its lettering MIRRORED, which is
       a fix this project has already had to make once */
    for (const face of [0, Math.PI]) {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, up, z);
      mesh.rotation.y = ROT + face;
      mesh.name = m.name + (face ? '-b' : '');
      group.add(mesh);
    }
    /* and a post to carry it, because a sign in the air is a decal */
    put3('plat', chamferBox(0.7, up, 0.7, 0.18), back, lat, up * 0.5, 0.9);
  }

  /* ---- merge -------------------------------------------------------------------------------- */
  const MATS = { plat: platinum, dark: darkMat, stone: stoneMat, green: greenMat };
  for (const k of Object.keys(B)) {
    if (!B[k].length) continue;
    const mesh = new THREE.Mesh(own(mergeSolids(B[k])), MATS[k]);
    mesh.name = 'haven-' + k; mesh.frustumCulled = false;
    group.add(mesh); stats.draws++;
    stats.triangles += mesh.geometry.attributes.position.count / 3;
  }
  for (const k of Object.keys(B)) for (const it of B[k]) {
    if (it.geo && it.geo.dispose && owned.geometries.indexOf(it.geo) < 0) it.geo.dispose();
  }

  /* ---- the module contract --------------------------------------------------------------------- */
  return {
    group, stats, HAVEN,
    setTime(s) {
      /* R5 §17: "warmer low-angle lighting where appropriate... less dense emission". The stone
         warms as the sun drops and the growth's own glow only appears once the light goes — a
         rural district that emits at noon is a tech park. */
      const day = (s && s.daylight != null) ? s.daylight : 0;
      greenMat.emissiveIntensity = 0.34 - 0.26 * day;
      stoneMat.color.setHex(day > 0.55 ? 0x7a776c : 0x5f5e58);
      for (const m of signMats) m.opacity = 0.72 + 0.14 * (1 - day);
    },
    setTheme(t) { if (t && t.energy) theme.energy = t.energy; },
    setDetail() { },
    setState() { },
    setQuality() { },
    update() { },
    zones() { return stats.zones.slice(); },
    navSites() {
      /* you arrive at the HEAD of the corridor, looking down it at the water — the reveal is the
         destination, so the camera is placed where the reveal happens rather than at a centroid */
      const [x, z] = site(HAVEN.APPROACH_LEN - 6, 0);
      const [lx, lz] = site(-260, 0);
      return [{ id: 'mah-haven', label: 'MAH HAVEN', sub: 'the waterfront',
        x, z, y: 1.9, look: [lx, 2, lz] }];
    },
    dispose() {
      for (const g of owned.geometries) { try { g.dispose(); } catch (e) { } }
      for (const m of owned.materials) { try { m.dispose(); } catch (e) { } }
      for (const t of owned.textures) { try { t.dispose(); } catch (e) { } }
      if (group.parent) group.parent.remove(group);
    }
  };
}

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

export default { buildMahHaven, HAVEN };
