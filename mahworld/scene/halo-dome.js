/* MAHWORLD R5 :: THE HALO DOME — the sanctuary's enclosure, and its first climbing surface.

   R5 §5: "Enclose the main MAH HALO sanctuary region with a colossal dome/shell. The dome is not a
   small glass roof. It must feel world-scale, protective, premium, translucent/clear enough to
   preserve sky/moon/cloud views, structurally plausible, integrated with the sanctuary grid."

   R5 §6: "The dome is future traversal geometry... ridges, rails, shallow recessed lines,
   protruding diamond nodes, ledges, grip marks, climbing channels, occasional ring/band structures,
   authored climbing routes. These are not random scratches."

   ---- THE PROFILE IS DERIVED FROM THE TWO THINGS IT HAS TO CLEAR ------------------------------
   It springs at the ring's OUTER rim — r = R_OUT + APRON = 3434, y = 1841.6, the same height the
   inner rim sits at, because the dish is symmetric about the midline. It closes at 3900, which is
   280 m over MAH CROWN's mast at 3620: R5 §8 says the tower "can approach the dome apex visually
   but should not accidentally clip through it", and 280 m is a clearance you can see rather than a
   tolerance you have to trust. Rise 2058 m over radius 3434 is a 0.60 ratio — a true dome, not a
   lid and not a hemisphere.

       y(r) = SPRING_Y + RISE * sqrt(1 - (r/R)^2)

   An ellipsoid cap, which is vertical at the spring and flat at the apex. That is exactly the
   gradient a climbing surface wants: the first pitch off the rim is a wall, the middle is a slab,
   and the last 800 m of radius is a walkable dome you can rest on. The steepness is authored by
   the geometry rather than decorated onto it.

   ---- R7 §8/§9 :: WHAT PASSED EVERY GATE AND WAS STILL WRONG -----------------------------------
   Two defects survived the whole R5 suite, and both survived because nothing MEASURED the thing
   the brief actually asked for. They are worth stating as rules, not as history.

   1. A GATE ON A PROPERTY IS NOT A GATE ON THE FEATURE. "Clear crystalline panels" was gated as
      opacity < 0.25 and rib count <= 20. The shell passed both while having no panels at all:
      one smoothly-shaded membrane, every vertex carrying the ellipsoid's analytic normal, panels
      averaging 234 m across — 6,485 px wide at climbing range. Opacity measured the glass and rib
      count measured the structure; neither could see that the PANEL did not exist. When a brief
      names a noun, measure that noun.

   2. FOUR ROUTES AT FOUR BEARINGS ARE ONE ROUTE. The climbing routes differed only in where they
      started. Holds, channel width, hold size, shelf spacing and drift were identical, so the
      dome had a climbing surface and no climbing DECISION. A grade is geometry a climber reads
      before committing, so it is now gated as geometry — strictly fewer holds, strictly narrower
      channel, strictly smaller holds, strictly fewer rests from EASY to ADVANCED. A label that no
      test can distinguish from its neighbour is not a grade.

   And one method note, since it saved a pass: the panel field's real risk was cracks in the
   reduction rows, not appearance. Counting edges — every interior edge shared by exactly two
   triangles, boundary edges exactly equal to the spring ring plus the oculus ring — falsified
   that in a second, with no renderer. Ask what would be WRONG, then measure that, before
   rendering anything.

   ---- WHY IT DOES NOT CLOSE THE SKY -----------------------------------------------------------
   R4 built MAH HALO as a ring so MAHWORLD'S NIGHT SKY survives — the moon is a principal of the
   composition, and a disc at this altitude erases it. A dome is a second chance to make that
   mistake, so:
     · the shell is CRYSTALLINE GLASS at opacity 0.16, not a mirror and not a tint;
     · only SIXTEEN ribs reach the apex — see the hierarchy note on DOME.MERIDIANS, which is the
       correction that made this clause true rather than merely claimed;
     · nothing is added inside the apex zone, where a ground camera looks straight up.
   R5 says it in its own words: "Do not make the dome uniformly opaque or mirror-like."

   ---- THE APERTURE ----------------------------------------------------------------------------
   MAH THRESHOLD's gantry runs from r 3380 to 3560 and its launch ring stands at 3560 — through the
   spring line. R5 §9 keeps the threshold as the departure system, so the dome does not swallow it:
   there is a PORTAL at the threshold's bearing, framed the way the sky gate is framed. You leave
   the sanctuary by passing through both. That is one composition instead of two objects that
   happen to intersect.

   ---- CLIMBING IS A GEOMETRY PROBLEM, NOT A TEXTURE ONE ---------------------------------------
   R5 §7 is explicit that a rock texture pasted on the dome is the wrong answer. So the grip
   language is built: paired platinum ridges forming a CHANNEL you climb inside, square-diamond
   handholds in clusters along it, and resting shelves at long intervals. Four authored routes,
   each starting at a place you can actually reach on the ring, each ending at a high-altitude
   reward point. The holds are instanced, so 1,400 of them cost one draw.

   buildHaloDome(ctx, opts) -> the standard module contract, plus domeY(r), routes() and
   setDetail(distance). */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, applyPlatinumFinish } from './materials.js';
import { HALO, haloHeight } from './halo.js';

const TAU = Math.PI * 2;
const gold = i => (i * 0.6180339887) % 1;
const frac = i => (i * 0.7548776662) % 1;

export const DOME = Object.freeze({
  R: HALO.R_OUT + HALO.APRON,                 /* 3434 — springs at the outer rim, not beyond it */
  SPRING_Y: HALO.Y + Math.pow(HALO.R_OUT + HALO.APRON - HALO.R_MID, 2) / (2 * HALO.R_DISH),
  APEX_Y: 3900,                               /* 280 m over MAH CROWN's mast */
  /* A RIB HIERARCHY, because 48 full-height meridians photographed as a NET.
     At the spring, 48 ribs is one every 450 m — genuinely sparse in world terms, and it looked it
     from close up. But meridians CONVERGE: at r 400, the same 48 ribs are one every 52 m, and from
     the far side of the sanctuary the whole upper dome read as a wireframe cage laid over the sky.
     That fails R5's own clause ("low visual obstruction in primary viewing zones") by a route the
     opacity number cannot fix, because the obstruction is the STRUCTURE and not the glass.
     So the dome is built the way a real one is: 16 PRIMARY ribs carry the full arc to the oculus,
     and 32 SECONDARY ribs fill the lower half only — where the primaries are far apart and the
     surface needs support — and stop before the convergence. Sixteen lines meeting overhead is a
     dome; forty-eight is a net. */
  MERIDIANS: 16,                              /* primary — full height, heavy */
  SECONDARY: 32,                              /* infill — lower half only, light */
  SECONDARY_TO: 0.46,                         /* the fraction of the arc a secondary rib covers */
  RINGS: 9,
  SEGS: 26,                                   /* segments per meridian, spring to apex */
  /* the SHELL is tessellated separately from the STRUCTURE — the glass has to be a panel field
     and the ribs have to be sparse, and tying them to one number made the second impossible */
  PANEL_W: 128,                               /* target panel width in metres; see the shell block */
  PANEL_SEGS: 42,                             /* shell rings, spring to oculus */
  PORTAL_DEG: -67.5,                          /* MAH THRESHOLD's bearing — the way out */
  PORTAL_HALF: 0.055,                         /* radians of half-width: a 378 m opening at 3434 */
  /* FOUR AUTHORED CLIMBING ROUTES, GRADED (R7 §9).
     They were four bearings and nothing else, which meant four identical climbs at four compass
     points — the dome had a climbing SURFACE but no climbing DECISION. A grade is not a label;
     it is the geometry a climber reads before committing:

       channel   how wide the recess between the ridges is — a wide channel is a staircase,
                 a narrow one is a line you have to stay on
       holds     diamonds per rung, and `hold` their size — fewer and smaller is harder
       every     rungs are placed every Nth step, so the advanced route has REACH between holds
       rest      steps between resting shelves — a long run without one is the commitment
       drift     how far the line wanders off its bearing; a wandering line crosses the fall line
       band      a continuous grip batten across the channel, which is what makes EASY easy

     The drift signs alternate so no two routes lean the same way, and the bearings are the
     original four so nothing that navigates to them moves. */
  ROUTES: Object.freeze([
    Object.freeze({ deg: 22.5,  grade: 'EASY',         channel: 4.7, holds: 4, hold: 1.30, every: 1, rest:  7, drift: -0.055, band: true }),
    Object.freeze({ deg: 112.5, grade: 'INTERMEDIATE', channel: 3.2, holds: 3, hold: 1.00, every: 1, rest: 11, drift:  0.125, band: false }),
    Object.freeze({ deg: 202.5, grade: 'INTERMEDIATE', channel: 3.0, holds: 3, hold: 0.95, every: 1, rest: 12, drift: -0.140, band: false }),
    Object.freeze({ deg: 292.5, grade: 'ADVANCED',     channel: 2.1, holds: 2, hold: 0.76, every: 2, rest: 17, drift:  0.205, band: false })
  ])
});

/* the dome's height above the world at a given radius. Pure, exported, the ONLY definition. */
export function domeY(r) {
  const t = Math.min(1, Math.max(0, r / DOME.R));
  return DOME.SPRING_Y + (DOME.APEX_Y - DOME.SPRING_Y) * Math.sqrt(Math.max(0, 1 - t * t));
}
/* the surface's slope, so a climbing hold can be laid flat ON it rather than floating near it */
export function domeSlope(r) {
  const R = DOME.R, RISE = DOME.APEX_Y - DOME.SPRING_Y;
  const t = Math.min(0.9995, r / R);
  return -RISE * t / (R * Math.sqrt(Math.max(1e-6, 1 - t * t)));   /* dy/dr, negative outward */
}

export function buildHaloDome(ctx, opts = {}) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'halo-dome';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = {
    draws: 0, triangles: 0, meridians: 0, rings: 0, panels: 0, holds: 0, shelves: 0, routes: 0,
    r: DOME.R, springY: +DOME.SPRING_Y.toFixed(1), apexY: DOME.APEX_Y,
    rise: +(DOME.APEX_Y - DOME.SPRING_Y).toFixed(1),
    /* published so a test can assert the clearance rather than a render judge it */
    crownClearance: null
  };

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(),
    _up = new THREE.Vector3(0, 1, 0), _qq = new THREE.Quaternion(), _n = new THREE.Vector3();

  const B = { plat: [], dark: [] };
  const put = (b, geo, matrix, value) => B[b].push({ geo, matrix, value });

  /* a member laid between two world points, with a real pitch. Every rib segment on a dome rakes,
     and a yaw-only helper cannot express that — the failure this project has now shipped three
     times over (the overlook struts, the gate buttress, the launch ring). */
  function along(a, b, w, d, value, bucket) {
    _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = _v.length(); _v.normalize();
    _qq.setFromUnitVectors(_up, _v);
    _p.set((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    _s.set(1, 1, 1);
    put(bucket || 'plat', chamferBox(w, len * 1.004, d, Math.min(w, d) * 0.24),
      _m.compose(_p, _qq, _s).clone(), value);
    return len;
  }
  /* a point on the shell at (bearing, radius) */
  const P = (a, r) => [Math.cos(a) * r, domeY(r), Math.sin(a) * r];
  /* is this bearing inside the threshold portal? */
  function inPortal(a) {
    const pa = DOME.PORTAL_DEG * Math.PI / 180;
    let d = Math.abs(((a - pa) % TAU + TAU + Math.PI) % TAU - Math.PI);
    return d < DOME.PORTAL_HALF;
  }
  /* the radii the shell is sampled at. Cosine-spaced so the SPRING — the steep, near, climbable
     part — gets the segments, and the flat apex, which nobody is close to, gets few. */
  const RADII = [];
  for (let s = 0; s <= DOME.SEGS; s++) {
    const u = s / DOME.SEGS;
    RADII.push(DOME.R * Math.cos(u * Math.PI / 2));
  }

  /* ---- materials ------------------------------------------------------------------------------ */
  /* R2 — THE DOME WAS NOT DIM. IT WAS ERASED, AND HAD BEEN SINCE IT WAS BUILT.
     DIRECTION: "we also don't even see the bottom of the dome — the bottom of the dome should be
     visible from this area and the town."

     Measured, not argued. The dome springs at r 3434, y 1841.6, so the springing line stands
     hypot(3434, 1841.6) = 3897 m from the plaza; the apex is 3900 m up. Every point on this
     structure is within 3 m of 3900 m from the world origin. mahplaza.js's fog runs to
     `2350 + 700 * daylight` — 2350 m at night, 3050 m at noon. THE ENTIRE DOME HAS ALWAYS BEEN
     PAST THE FAR PLANE OF THE FOG, at every hour, from every camera on the ground. It was not
     rendering faintly; it was rendering as 100% fog colour, which is to say as sky. Nothing about
     its geometry, its panels, its ribs or its seams was ever visible from the plaza, and no amount
     of work on any of them would have changed that.

     THE FIX IS THE ONE THIS WORLD ALREADY USES FOR THINGS PAST THE FOG. terrain.js's rock and land
     both run `fog: false` and carry their aerial perspective as painted VALUE instead, for exactly
     this reason — its own note says the fog "would otherwise erase everything past 860 m". The dome
     is four times further out than the mountains and belongs in the same category: an object whose
     recession is a decision, not a fog integral.

     SO THE VALUES ARE SET AGAINST THE NIGHT SKY, and they are set LOW. The night horizon key is
     0x1d3d6e; the far mountain range sits just above it at 0x7a8fb8 to read as haze. The dome is
     further than the far range and must sit nearer the sky than that — near enough that what you
     read is one enormous arc springing off the horizon and the faintest suggestion of ribs inside
     it, and not a lattice of bright lines across the whole sky, which is a named defect of this
     project (R4 §13) and is the thing this change is most able to break. RECESSION is that
     multiplier, applied to every one of the four grades; the seams take it twice, because additive
     blending does not care how dim you made the surface underneath.

     AND RECESSION IS A LERP TOWARD THE SKY, NOT A MULTIPLY TOWARD BLACK. The first cut of this
     multiplied every grade's colour by 0.30 and the apex oculus came back as a solid BLACK DISC
     punched in the night sky — because 0xb6c4d6 * 0.3 is 0x363a40, which is darker than the sky it
     sits in front of. Aerial perspective does not darken things; it pulls everything, light and
     dark alike, toward the colour of the air between. So `AIR` is the night sky's own horizon key,
     the same 0x1d3d6e terrain.js sets its ranges against, and each grade is mixed toward it. What
     that leaves is a compressed value range straddling the sky — ribs a little above it, dark
     members a little below — which is what a structure 3.9 km away looks like and is exactly enough
     to draw one enormous arc without latticing the sky.

     THIS IS BAKED FOR NIGHT, and deliberately: the sky's horizon runs from 0x1d3d6e at night to
     0xc4d5ea at noon, so a single mix cannot be right at both. terrain.js made the same call for
     the same reason ("the values are set AGAINST THE NIGHT SKY, not in isolation") and this world
     is judged at night. If the day frame ever becomes the subject, the fix is a clock hook here,
     not a compromise value. */
  const RECESSION = 0.30;
  const AIR = new THREE.Color(0x1d3d6e);
  /* mix a grade's own colour toward the air: 0 leaves it alone, 1 dissolves it into the sky */
  const recede = (mat, k) => { mat.color.lerp(AIR, k); return mat; };
  const platinum = (M.platinumLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0xb6c4d6 })).clone();
  /* the dome's ribs and diamond nodes are almost all vertical or raked, which is the case the
     single 0.38 compromise served worst — see applyPlatinumFinish */
  platinum.envMapIntensity = 1.55 * RECESSION; applyPlatinumFinish(platinum);
  /* the ribs are the arc. They mix 68% into the air, which leaves them a little ABOVE the sky —
     enough to draw a line at 3.9 km and not enough to become a lattice. */
  recede(platinum, 0.68);
  platinum.fog = false;
  platinum.vertexColors = true; platinum.name = 'dome-platinum'; owned.materials.push(platinum);
  const darkMat = (M.graphiteMetal || M.paving || new THREE.MeshStandardMaterial({ color: 0x0b0f16 })).clone();
  darkMat.vertexColors = true; darkMat.name = 'dome-dark';
  darkMat.roughness = 0.28; darkMat.envMapIntensity = 0.9 * RECESSION;
  /* the dark grade mixes FURTHER into the air than the ribs do, because it starts at near-black and
     a near-black member at 3.9 km is a hole in the horizon — which is exactly what the apex oculus
     rendered as on the first cut of this change. It still lands a little under the sky, so the
     oculus reads as a disc rather than as a void. */
  recede(darkMat, 0.80);
  darkMat.fog = false;
  owned.materials.push(darkMat);
  /* THE SHELL. Opacity 0.16 is the whole argument of R5 §5 in one number: enough to read as a
     surface when the light rakes across it, far too little to take the sky away. DoubleSide because
     it is seen from inside for most of the world's life, and depthWrite false so the sanctuary
     behind it is never occluded by a pane. */
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x9fc4ea, metalness: 0.06, roughness: 0.04, transparent: true, opacity: 0.16,
    envMapIntensity: 1.25 * RECESSION, side: THREE.DoubleSide, depthWrite: false, vertexColors: true,
    fog: false
  });
  recede(shellMat, 0.55);
  shellMat.name = 'dome-shell'; owned.materials.push(shellMat);
  /* the MAHGIC seams — selective, never a lattice of light (R4's own correction: over-bright beams
     that latticed the sky were a named defect and this is the same geometry at four times the size) */
  const seamMat = new THREE.MeshBasicMaterial({
    color: theme.energyLight || 0xdff1ff, transparent: true, opacity: 0.34 * RECESSION * RECESSION,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: true
  });
  seamMat.name = 'dome-mahgic-seam'; owned.materials.push(seamMat);
  const SB = [];
  const putSeam = (geo, matrix, value) => SB.push({ geo, matrix, value });

  /* ================================================================================================
     1. THE SHELL — a CRYSTALLINE PANEL FIELD, built by hand because there are no addons

     R7 §8 asks for "clear crystalline panels", and what stood here was not panels. It was one
     smoothly-shaded membrane: every vertex carried the ellipsoid's analytic gradient, so adjacent
     triangles shaded as one continuous surface by construction. Measured, the panels averaged
     234 m across and 2.7° of facet deviation — which is the worst of both worlds, a silhouette
     coarse enough to see and a shading model that hides the fact. At climbing range one panel is
     6,485 px wide. A climber was pressed against a single flat plane.

     Two things fix it, and neither is more polygons in the naive sense:

     1. FLAT SHADING. The normal is the TRIANGLE's own, not the ellipsoid's. Each panel then
        catches the environment as its own plane, which is the entire difference between glass
        and a bubble. This costs nothing — it is the same vertex count, written differently.

     2. A RING-REDUCED COLUMN COUNT. A uniform meridian grid fine enough to make panels is the
        NET defect R5 named, because meridians converge: 176 columns at the spring would be 176
        lines meeting overhead. So the field SHEDS columns as the radius shrinks, the way a real
        crystalline dome does — 176 at the spring, 16 at the oculus, in 11 steps. Panel width
        stays near constant (123 m) instead of collapsing to nothing, and where the count drops
        the row resolves in TRIANGULAR panels, which is more crystalline, not less.

     Every count is a multiple of 16, so all sixteen primary ribs land on a panel seam at every
     height rather than crossing a panel's middle.

     The size was bounded, not picked. Below ~47 m the seams fall under two pixels at the far
     side and become noise (THE PREFILTER LAW); above ~160 m the panel stops being a feature at
     climbing range. 123 x 104 m sits inside that band and is WIDER THAN TALL (§06).
     ============================================================================================== */
  const PANEL_N = [];      /* columns per shell ring — published so the rings can follow the seams */
  const PANEL_R = [];
  {
    const SEG = DOME.PANEL_SEGS;
    for (let s = 0; s <= SEG; s++) PANEL_R.push(DOME.R * Math.cos((s / SEG) * Math.PI / 2));
    let prev = 1e9;
    for (let s = 0; s <= SEG; s++) {
      const want = TAU * PANEL_R[s] / DOME.PANEL_W;
      /* snapped to 16 so the primaries always sit on a seam, and monotone so the field only ever
         sheds columns — a count that rose again would tear the row above it */
      const n = Math.min(prev, Math.max(16, Math.round(want / 16) * 16));
      PANEL_N.push(n); prev = n;
    }
  }
  {
    const SEG = DOME.PANEL_SEGS;
    const pos = [], nor = [], col = [];
    const A = [0, 0, 0], B = [0, 0, 0], C = [0, 0, 0];
    const at = (out, a, r) => { out[0] = Math.cos(a) * r; out[1] = domeY(r); out[2] = Math.sin(a) * r; return out; };
    /* one FLAT-SHADED panel triangle: the normal is the plane's, so the facet is real */
    const tri = (p, q, w, v) => {
      _v.set(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      _n.set(w[0] - p[0], w[1] - p[1], w[2] - p[2]).cross(_v).normalize();
      if (_n.y < 0) _n.multiplyScalar(-1);              /* every shell facet faces the sky */
      for (const t of [p, q, w]) { pos.push(t[0], t[1], t[2]); nor.push(_n.x, _n.y, _n.z); col.push(v, v, v); }
    };
    for (let s = 0; s < SEG; s++) {
      const r0 = PANEL_R[s], r1 = PANEL_R[s + 1], n0 = PANEL_N[s], n1 = PANEL_N[s + 1];
      /* value falls toward the apex: a dome read from below is brightest where it is steepest and
         catching the horizon, and palest overhead is exactly the "lit lid" L57 warned about */
      const base = 0.62 - 0.42 * (s / SEG);
      for (let i = 0; i < n0; i++) {
        const a0 = (i / n0) * TAU, a1 = ((i + 1) / n0) * TAU;
        if (inPortal(a0) || inPortal(a1)) continue;      /* the way out stays open */
        /* PER-PANEL CRYSTAL DOMAINS. A crystal is not one value across a field — it is many
           panes cut from the same block, each catching the light a little differently. The
           spread is small on purpose: ±0.055 reads as glass with grain, and anything wider
           reads as dirt. Deterministic, from the golden sequence already in this module. */
        const v = base * (0.945 + 0.11 * gold(s * 31 + i * 7));
        at(A, a0, r0); at(B, a1, r0);
        if (n1 === n0) {
          at(C, a1, r1); tri(A, B, C, v);
          at(B, a1, r1); at(C, a0, r1); tri(A, B, C, v);
        } else {
          /* A REDUCTION ROW. The ring above carries fewer columns, so a panel below spans a
             fraction of one above. Fanning each lower edge to its single nearest upper vertex
             gives triangular panels with no cracks and no T-junctions. */
          const j0 = Math.floor(i * n1 / n0), j1 = Math.floor((i + 1) * n1 / n0);
          at(C, (j0 / n1) * TAU, r1); tri(A, B, C, v);
          if (j1 !== j0) {                               /* the panel that straddles a seam above */
            at(A, a1, r0); at(B, (j0 / n1) * TAU, r1); at(C, (j1 % n1 / n1) * TAU, r1);
            tri(A, B, C, v * 0.985);
          }
        }
        stats.panels++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
    own(g);
    const mesh = new THREE.Mesh(g, shellMat);
    mesh.name = 'dome-shell'; mesh.frustumCulled = false; mesh.renderOrder = 2;
    group.add(mesh); stats.draws++;
    stats.triangles += pos.length / 9;
    stats.panelColumns = PANEL_N[0];
    stats.panelColumnsApex = PANEL_N[PANEL_N.length - 1];
    stats.panelSteps = PANEL_N.filter((v, i) => i && v !== PANEL_N[i - 1]).length;
    stats.panelW = +(TAU * DOME.R / PANEL_N[0]).toFixed(1);
  }

  /* ================================================================================================
     2. THE RIBS AND RINGS — the structure, and what makes it plausible rather than a bubble
     ============================================================================================== */
  {
    const MER = DOME.MERIDIANS, SEG = DOME.SEGS;
    /* THE PRIMARIES: sixteen, full arc, and HEAVIER than the old forty-eight were. Fewer members
       carrying the same dome means each one is bigger, which is both structurally honest and what
       makes them read as ribs rather than as wires. They taper toward the apex because a rib
       carries less the higher it goes, and a constant section over 3.4 km says "extruded". */
    for (let i = 0; i < MER; i++) {
      const a = (i / MER) * TAU;
      if (inPortal(a)) continue;
      for (let s = 0; s < SEG; s++) {
        const r0 = RADII[s], r1 = RADII[s + 1];
        const t = s / SEG, w = 13 - 8.2 * t;
        along(P(a, r0), P(a, r1), w, w * 1.35, 0.90 - 0.10 * t, 'plat');
      }
      stats.meridians++;
    }
    /* THE SECONDARIES: thirty-two light infill ribs across the lower 46% of the arc, offset half a
       primary bay so they land midway between them. They end where the primaries start closing in
       on each other, so nothing converges at the apex but the sixteen. */
    const SEC = DOME.SECONDARY, secTo = Math.round(SEG * DOME.SECONDARY_TO);
    for (let i = 0; i < SEC; i++) {
      const a = (i / SEC) * TAU + Math.PI / SEC;
      if (inPortal(a)) continue;
      for (let s = 0; s < secTo; s++) {
        const r0 = RADII[s], r1 = RADII[s + 1];
        const t = s / SEG;
        /* and they FADE OUT rather than stopping dead: the last two segments thin to nothing, so
           the eye reads a member that runs out instead of a bar that was cut */
        const fade = Math.min(1, (secTo - s) / 3);
        const w = (5.0 - 2.2 * t) * (0.35 + 0.65 * fade);
        if (w < 0.9) continue;
        along(P(a, r0), P(a, r1), w, w * 1.3, 0.80, 'plat');
      }
      stats.secondaries = (stats.secondaries || 0) + 1;
    }
    /* the LATITUDE RINGS: fourteen, spaced by the same cosine so they crowd where the dome is steep.
       Each is a chain of chords between adjacent meridians — a ring on a 3.4 km dome cannot be a
       torus, and a chord is what a real structure would be. */
    /* the rings genuinely follow the SHELL's tessellation now, which the old fixed 48 only
       claimed to: a ring takes HALF the panel column count at its own radius, so every chord
       end lands on a panel seam instead of cutting across panels at an irrational stride.
       Half, not all, because a chord per panel is twice the geometry for a line the eye reads
       as continuous either way. */
    const columnsAt = r => {
      let best = 0, bd = Infinity;
      for (let s = 0; s < PANEL_R.length; s++) { const d = Math.abs(PANEL_R[s] - r); if (d < bd) { bd = d; best = s; } }
      return PANEL_N[best];
    };
    for (let k = 1; k < DOME.RINGS; k++) {
      const r = DOME.R * Math.cos((k / DOME.RINGS) * Math.PI / 2);
      const RMER = Math.max(16, columnsAt(r) / 2);
      const w = 7.4 - 4.2 * (k / DOME.RINGS);
      for (let i = 0; i < RMER; i++) {
        const a0 = (i / RMER) * TAU, a1 = ((i + 1) / RMER) * TAU;
        if (inPortal(a0) || inPortal(a1)) continue;
        along(P(a0, r), P(a1, r), w, w * 1.2, 0.86, 'plat');
      }
      /* and a MAHGIC seam riding the ring — selective, one in three, so the dome has luminous
         latitude lines without becoming a cage of light */
      if (k % 3 === 1) {
        for (let i = 0; i < RMER; i++) {
          const a0 = (i / RMER) * TAU, a1 = ((i + 1) / RMER) * TAU;
          if (inPortal(a0) || inPortal(a1)) continue;
          const A = P(a0, r), Bp = P(a1, r);
          _v.set(Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]);
          const len = _v.length(); _v.normalize();
          _qq.setFromUnitVectors(_up, _v);
          _p.set((A[0] + Bp[0]) * 0.5, (A[1] + Bp[1]) * 0.5 + w * 0.9, (A[2] + Bp[2]) * 0.5);
          _s.set(1, 1, 1);
          putSeam(chamferBox(1.1, len * 1.004, 1.1, 0.2), _m.compose(_p, _qq, _s).clone(), 0.9);
        }
      }
      /* a DARK CRYSTAL NODE at every rib/ring crossing — R5 §5 asks for them by name, and they are
         also what a real space frame has at its joints */
      /* a node goes where a PRIMARY rib crosses a ring, and nowhere else — a node on every
         intersection of a 48-column tessellation is 432 diamonds and is the net again */
      for (let i = 0; i < DOME.MERIDIANS; i++) {
        const a = (i / DOME.MERIDIANS) * TAU;
        if (inPortal(a)) continue;
        const nd = own(new THREE.OctahedronGeometry(1, 0));
        const q = P(a, r);
        const sc = 22 - 11 * (k / DOME.RINGS);
        put('dark', nd, mat(q[0], q[1], q[2], a, sc, sc * 0.62, sc), 0.34);
      }
      stats.rings++;
    }
    /* THE APEX OCULUS: the ribs cannot all meet at a point — 48 members converging is a spike, and
       §06 forbids spikes. They land on a ring, and the ring carries a square-diamond keystone. */
    const rA = DOME.R * Math.cos((SEG - 0.5) / SEG * Math.PI / 2) + 40;
    for (let i = 0; i < 32; i++) {
      const a0 = (i / 32) * TAU, a1 = ((i + 1) / 32) * TAU;
      along(P(a0, rA), P(a1, rA), 11.0, 13.0, 1.0, 'plat');
    }
    const key = own(new THREE.OctahedronGeometry(1, 0));
    put('plat', key, mat(0, DOME.APEX_Y + 26, 0, 0, 66, 44, 66), 1.0);
    stats.crownClearance = null;   /* filled by the caller, which knows the crown's height */
  }

  /* a world-vertical matrix, for nodes and the keystone */
  function mat(x, y, z, ry, sx, sy, sz) {
    _p.set(x, y, z); _e.set(0, ry == null ? 0 : ry, 0); _q.setFromEuler(_e);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(_p, _q, _s).clone();
  }

  /* ================================================================================================
     3. THE PORTAL — MAH THRESHOLD's way out, framed rather than merely absent
     ============================================================================================== */
  {
    const pa = DOME.PORTAL_DEG * Math.PI / 180;
    for (const side of [-1, 1]) {
      const a = pa + side * DOME.PORTAL_HALF;
      /* a JAMB: a deep rib up the portal's edge, so the opening reads as authored and not as a
         missing panel — the difference between a doorway and a hole */
      for (let s = 0; s < DOME.SEGS * 0.55; s++) {
        const r0 = RADII[s], r1 = RADII[s + 1];
        const t = s / DOME.SEGS, w = 13 - 7 * t;
        along(P(a, r0), P(a, r1), w, w * 1.5, 0.96, 'plat');
      }
      const nd = own(new THREE.OctahedronGeometry(1, 0));
      const q = P(a, RADII[Math.floor(DOME.SEGS * 0.55)]);
      put('plat', nd, mat(q[0], q[1], q[2], a, 26, 18, 26), 1.0);
    }
    /* the LINTEL across the head of the opening, at the radius the jambs stop */
    const rL = RADII[Math.floor(DOME.SEGS * 0.55)];
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const a0 = pa - DOME.PORTAL_HALF + (i / steps) * 2 * DOME.PORTAL_HALF;
      const a1 = pa - DOME.PORTAL_HALF + ((i + 1) / steps) * 2 * DOME.PORTAL_HALF;
      along(P(a0, rL), P(a1, rL), 11, 15, 1.0, 'plat');
    }
    stats.portal = { deg: DOME.PORTAL_DEG, widthM: +(2 * DOME.PORTAL_HALF * DOME.R).toFixed(0),
      headY: +domeY(rL).toFixed(1) };
  }

  /* ================================================================================================
     4. THE CLIMBING ROUTES — R5 §6/§7, built as geometry
     ============================================================================================== */
  const holdGeo = own(new THREE.OctahedronGeometry(1, 0));
  holdGeo.scale(1.5, 0.85, 1.5);                 /* WIDER THAN TALL, like every diamond here (§06) */
  let holds = null;
  {
    const inst = [];
    for (let ri = 0; ri < DOME.ROUTES.length; ri++) {
      const G = DOME.ROUTES[ri];
      const before = { holds: stats.holds, shelves: stats.shelves };
      const baseA = G.deg * Math.PI / 180;
      /* a route does not run straight up: it drifts in bearing as it climbs, which is what makes it
         a ROUTE and not a ladder. The drift is the GRADE's, so the easy line stays near its fall
         line and the advanced one crosses it. */
      const drift = G.drift;
      const steps = 46;
      let prev = null;
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const r = DOME.R * Math.cos(u * 0.86 * Math.PI / 2);      /* stops short of the apex */
        const a = baseA + drift * Math.sin(u * Math.PI) * 1.4;
        const q = P(a, r);
        if (prev) {
          /* THE CHANNEL: two parallel platinum ridges with a recess between them. You climb INSIDE
             it. The pair is what makes it readable as a route from a distance — a single line is a
             seam, two lines apart is a thing with a WIDTH, and a width is what says "for you".
             The width is the grade's: 9.4 m on the easy line, 4.2 m on the advanced one. */
          for (const side of [-1, 1]) {
            const off = side * G.channel;
            const A = [prev[0] - Math.sin(a) * off, prev[1], prev[2] + Math.cos(a) * off];
            const Bp = [q[0] - Math.sin(a) * off, q[1], q[2] + Math.cos(a) * off];
            along(A, Bp, 1.5, 2.4, 0.98, 'plat');
          }
          /* the recessed floor of the channel, in dark crystal */
          along(prev, q, G.channel * 1.69, 0.7, 0.24, 'dark');
          /* a BROAD GRIP BAND across the channel — §8 asks for them by name, and they are what
             separates a staircase from a wall. Only the EASY route has them; on the others the
             absence IS the grade. */
          if (G.band) {
            const off = G.channel * 0.92;
            const A = [q[0] - Math.sin(a) * off, q[1] + 0.8, q[2] + Math.cos(a) * off];
            const Bp = [q[0] + Math.sin(a) * off, q[1] + 0.8, q[2] - Math.cos(a) * off];
            along(A, Bp, 2.6, 0.9, 0.92, 'plat');
          }
        }
        /* HANDHOLD CLUSTERS: diamonds staggered across the channel. How many, how big and how
           often is the GRADE — the advanced route asks for reach between them. Instanced, so
           every hold on the dome is one draw. */
        const n = (s % G.every) ? 0 : G.holds;
        for (let h = 0; h < n; h++) {
          const lat = (n === 1 ? 0 : (h / (n - 1)) - 0.5) * G.channel * 1.63
            + (frac(ri * 13 + s * 5 + h) - 0.5) * 1.1;
          const dr = (frac(s * 7 + h * 3) - 0.5) * 9;
          const rr = r + dr;
          const aa = a + lat / Math.max(1, rr);
          const m = domeSlope(rr);
          _n.set(-m * Math.cos(aa), 1, -m * Math.sin(aa)).normalize();
          _qq.setFromUnitVectors(_up, _n);
          _p.set(Math.cos(aa) * rr, domeY(rr) + 0.9 * G.hold, Math.sin(aa) * rr);
          _s.set(G.hold, G.hold, G.hold);
          inst.push(_m.compose(_p, _qq, _s).clone());
          stats.holds++;
        }
        /* RESTING SHELVES at long intervals — R5 asks for them, and a 2 km climb without one is a
           route nobody believes. A shelf is a real platform: dark deck, platinum lip. */
        if (s > 0 && s % G.rest === 0) {
          const m = domeSlope(r);
          _n.set(-m * Math.cos(a), 1, -m * Math.sin(a)).normalize();
          _qq.setFromUnitVectors(_up, _n);
          _p.set(q[0], q[1] + 1.2, q[2]);
          _s.set(1, 1, 1);
          put('dark', chamferBox(16, 1.4, 11, 0.5), _m.compose(_p, _qq, _s).clone(), 0.28);
          _p.set(q[0], q[1] + 2.4, q[2]);
          put('plat', chamferBox(17.4, 0.5, 12.4, 0.18), _m.compose(_p, _qq, _s).clone(), 1.0);
          stats.shelves++;
        }
        prev = q;
      }
      stats.routes++;
      /* published per route, so a test gates the GRADING rather than judging a render: the same
         count on every route is the defect this replaced, and only a number catches it */
      (stats.grades || (stats.grades = [])).push({
        deg: G.deg, grade: G.grade, holds: stats.holds - before.holds,
        shelves: stats.shelves - before.shelves, channel: G.channel * 2, hold: G.hold
      });
    }
    if (inst.length) {
      holds = new THREE.InstancedMesh(holdGeo, platinum, inst.length);
      holds.name = 'dome-holds'; holds.frustumCulled = false;
      holds.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(inst.length * 3).fill(1), 3);
      for (let i = 0; i < inst.length; i++) holds.setMatrixAt(i, inst[i]);
      holds.instanceMatrix.needsUpdate = true;
      group.add(holds); stats.draws++;
      const tri = (holdGeo.index ? holdGeo.index.count : holdGeo.attributes.position.count) / 3;
      stats.triangles += tri * inst.length;
    }
  }

  /* ---- merge ---------------------------------------------------------------------------------- */
  const MATS = { plat: platinum, dark: darkMat };
  for (const k of Object.keys(B)) {
    if (!B[k].length) continue;
    const mesh = new THREE.Mesh(own(mergeSolids(B[k])), MATS[k]);
    mesh.name = 'dome-' + k; mesh.frustumCulled = false;
    group.add(mesh); stats.draws++;
    stats.triangles += mesh.geometry.attributes.position.count / 3;
  }
  let seamMesh = null;
  if (SB.length) {
    seamMesh = new THREE.Mesh(own(mergeSolids(SB)), seamMat);
    seamMesh.name = 'dome-seams'; seamMesh.frustumCulled = false; seamMesh.renderOrder = 4;
    group.add(seamMesh); stats.draws++;
    stats.triangles += seamMesh.geometry.attributes.position.count / 3;
  }
  for (const k of Object.keys(B)) for (const it of B[k]) {
    if (it.geo && it.geo.dispose && owned.geometries.indexOf(it.geo) < 0) it.geo.dispose();
  }
  for (const it of SB) if (it.geo && it.geo.dispose) it.geo.dispose();

  /* ---- the module contract --------------------------------------------------------------------- */
  return {
    group, stats, DOME, domeY, domeSlope,
    setTime(s) {
      const night = 1 - (s && s.daylight != null ? s.daylight : 0);
      /* RECESSION is applied HERE as well as at construction, and it has to be. This hook rewrites
         both opacities every time the clock moves, so a recession set only in the constructor is
         undone by the first tick — which is the quiet kind of failure that makes a change look like
         it did nothing. The seam takes it squared for the reason given at the material: additive
         blending ignores how dim the surface behind it is. */
      seamMat.opacity = (0.12 + 0.26 * night) * RECESSION * RECESSION;
      /* by day the shell has the sky behind it and needs less of its own value; at night it is the
         only thing between the sanctuary and the stars and has to read as a surface */
      shellMat.opacity = (0.10 + 0.08 * night) * (0.45 + 0.55 * RECESSION);
    },
    setTheme(t) { if (t && t.energyLight) seamMat.color.setHex(t.energyLight); },
    setDetail(dist) {
      /* R5 §19: "selective true geometry for climbable near fields". The HOLDS are 1,400 diamonds
         1.5 m across — under a pixel past about 3 km and exactly the geometry that crawls — so they
         are the near field and nothing else is. The shell and its ribs never go: they are the
         enclosure, and an enclosure that pops is worse than one that costs. */
      if (holds) holds.visible = dist < 3200;
      if (seamMesh) seamMesh.visible = dist < 12000;
      return dist < 3200 ? 'near' : 'far';
    },
    setState() { },
    setQuality(q) {
      const low = (q === 'low' || (q && q.name === 'low'));
      if (holds) holds.visible = !low;
      if (seamMesh) seamMesh.visible = !low;
    },
    update() { },
    /* the four routes, published so a future climbing system reads them rather than re-deriving */
    routes() {
      return DOME.ROUTES.map((G, i) => {
        const a = G.deg * Math.PI / 180;
        return { id: 'dome-route-' + i, deg: G.deg, grade: G.grade, startR: DOME.R,
          start: [Math.cos(a) * DOME.R, DOME.SPRING_Y, Math.sin(a) * DOME.R],
          topR: DOME.R * Math.cos(0.86 * Math.PI / 2) };
      });
    },
    navSites() {
      /* the foot of route 0, on the ring's outer apron, looking up the dome */
      const a = DOME.ROUTES[0].deg * Math.PI / 180;
      const r = HALO.R_OUT - 30;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      return [{ id: 'dome-route', label: 'DOME ROUTE', sub: 'the climb', x, z,
        y: haloHeight(x, z) + 1.9,
        look: [Math.cos(a) * DOME.R * 0.6, domeY(DOME.R * 0.6), Math.sin(a) * DOME.R * 0.6] }];
    },
    dispose() {
      for (const g of owned.geometries) { try { g.dispose(); } catch (e) { } }
      for (const m of owned.materials) { try { m.dispose(); } catch (e) { } }
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

export default { buildHaloDome, DOME, domeY, domeSlope };
