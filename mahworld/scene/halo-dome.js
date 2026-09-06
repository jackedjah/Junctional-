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
import { chamferBox } from './materials.js';
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
  PORTAL_DEG: -67.5,                          /* MAH THRESHOLD's bearing — the way out */
  PORTAL_HALF: 0.055,                         /* radians of half-width: a 378 m opening at 3434 */
  ROUTES: Object.freeze([22.5, 112.5, 202.5, 292.5])   /* four authored climbing routes */
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
  const platinum = (M.platinumLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0xb6c4d6 })).clone();
  platinum.vertexColors = true; platinum.name = 'dome-platinum'; owned.materials.push(platinum);
  const darkMat = (M.graphiteMetal || M.paving || new THREE.MeshStandardMaterial({ color: 0x0b0f16 })).clone();
  darkMat.vertexColors = true; darkMat.name = 'dome-dark';
  darkMat.roughness = 0.28; darkMat.envMapIntensity = 0.9;
  owned.materials.push(darkMat);
  /* THE SHELL. Opacity 0.16 is the whole argument of R5 §5 in one number: enough to read as a
     surface when the light rakes across it, far too little to take the sky away. DoubleSide because
     it is seen from inside for most of the world's life, and depthWrite false so the sanctuary
     behind it is never occluded by a pane. */
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x9fc4ea, metalness: 0.06, roughness: 0.04, transparent: true, opacity: 0.16,
    envMapIntensity: 1.25, side: THREE.DoubleSide, depthWrite: false, vertexColors: true
  });
  shellMat.name = 'dome-shell'; owned.materials.push(shellMat);
  /* the MAHGIC seams — selective, never a lattice of light (R4's own correction: over-bright beams
     that latticed the sky were a named defect and this is the same geometry at four times the size) */
  const seamMat = new THREE.MeshBasicMaterial({
    color: theme.energyLight || 0xdff1ff, transparent: true, opacity: 0.34,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: true
  });
  seamMat.name = 'dome-mahgic-seam'; owned.materials.push(seamMat);
  const SB = [];
  const putSeam = (geo, matrix, value) => SB.push({ geo, matrix, value });

  /* ================================================================================================
     1. THE SHELL — one low-poly crystalline surface, built by hand because there are no addons
     ============================================================================================== */
  {
    /* the SHELL is tessellated finer than the ribs are spaced — the glass has to be smooth and
       the structure has to be sparse, and tying them to one number made the second impossible. */
    const MER = DOME.MERIDIANS * 3, SEG = DOME.SEGS;
    const pos = [], nor = [], col = [];
    const pushV = (a, r, v) => {
      const y = domeY(r), x = Math.cos(a) * r, z = Math.sin(a) * r;
      /* the shell normal: the ellipsoid's gradient, so the glass shades as a dome and not as a fan
         of flat panels. dy/dr is the slope; the normal is (-dy/dr * radial + up), normalised. */
      const m = domeSlope(r);
      _n.set(-m * Math.cos(a), 1, -m * Math.sin(a)).normalize();
      pos.push(x, y, z); nor.push(_n.x, _n.y, _n.z); col.push(v, v, v);
    };
    for (let i = 0; i < MER; i++) {
      const a0 = (i / MER) * TAU, a1 = ((i + 1) / MER) * TAU;
      if (inPortal(a0) || inPortal(a1)) continue;          /* the way out stays open */
      for (let s = 0; s < SEG; s++) {
        const r0 = RADII[s], r1 = RADII[s + 1];
        /* value falls toward the apex: a dome read from below is brightest where it is steepest and
           catching the horizon, and palest overhead is exactly the "lit lid" L57 warned about */
        const v0 = 0.62 - 0.42 * (s / SEG), v1 = 0.62 - 0.42 * ((s + 1) / SEG);
        pushV(a0, r0, v0); pushV(a1, r0, v0); pushV(a1, r1, v1);
        pushV(a0, r0, v0); pushV(a1, r1, v1); pushV(a0, r1, v1);
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
    const RMER = MER * 3;   /* the rings follow the SHELL's tessellation, not the ribs' spacing */
    for (let k = 1; k < DOME.RINGS; k++) {
      const r = DOME.R * Math.cos((k / DOME.RINGS) * Math.PI / 2);
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
      const baseA = DOME.ROUTES[ri] * Math.PI / 180;
      /* a route does not run straight up: it drifts in bearing as it climbs, which is what makes it
         a ROUTE and not a ladder. The drift is deterministic and different per route. */
      const drift = (ri % 2 ? 1 : -1) * (0.10 + 0.05 * gold(ri * 7));
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
             seam, two lines 6 m apart is a thing with a width, and a width is what says "for you". */
          for (const side of [-1, 1]) {
            const off = side * 3.2;
            const A = [prev[0] - Math.sin(a) * off, prev[1], prev[2] + Math.cos(a) * off];
            const Bp = [q[0] - Math.sin(a) * off, q[1], q[2] + Math.cos(a) * off];
            along(A, Bp, 1.5, 2.4, 0.98, 'plat');
          }
          /* the recessed floor of the channel, in dark crystal */
          along(prev, q, 5.4, 0.7, 0.24, 'dark');
        }
        /* HANDHOLD CLUSTERS: three or four diamonds staggered across the channel, every step.
           Instanced, so 1,400 of them are one draw. */
        const n = 3 + (s % 2);
        for (let h = 0; h < n; h++) {
          const lat = ((h / (n - 1)) - 0.5) * 5.2 + (frac(ri * 13 + s * 5 + h) - 0.5) * 1.1;
          const dr = (frac(s * 7 + h * 3) - 0.5) * 9;
          const rr = r + dr;
          const aa = a + lat / Math.max(1, rr);
          const m = domeSlope(rr);
          _n.set(-m * Math.cos(aa), 1, -m * Math.sin(aa)).normalize();
          _qq.setFromUnitVectors(_up, _n);
          _p.set(Math.cos(aa) * rr, domeY(rr) + 0.9, Math.sin(aa) * rr);
          _s.set(1, 1, 1);
          inst.push(_m.compose(_p, _qq, _s).clone());
          stats.holds++;
        }
        /* RESTING SHELVES at long intervals — R5 asks for them, and a 2 km climb without one is a
           route nobody believes. A shelf is a real platform: dark deck, platinum lip. */
        if (s > 0 && s % 11 === 0) {
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
      seamMat.opacity = 0.12 + 0.26 * night;
      /* by day the shell has the sky behind it and needs less of its own value; at night it is the
         only thing between the sanctuary and the stars and has to read as a surface */
      shellMat.opacity = 0.10 + 0.08 * night;
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
      return DOME.ROUTES.map((deg, i) => {
        const a = deg * Math.PI / 180;
        return { id: 'dome-route-' + i, deg, startR: DOME.R,
          start: [Math.cos(a) * DOME.R, DOME.SPRING_Y, Math.sin(a) * DOME.R],
          topR: DOME.R * Math.cos(0.86 * Math.PI / 2) };
      });
    },
    navSites() {
      /* the foot of route 0, on the ring's outer apron, looking up the dome */
      const a = DOME.ROUTES[0] * Math.PI / 180;
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
