/* MAHPLAZA :: FOBEAMS — the district's coherent energy routes, and its ASCENT NETWORK (v8)

   v8 REINTERPRETS THIS WHOLE MODULE. The FOBEAMs were never decoration: a vertical FOBEAM line
   rising out of the city is the TRACK AN ASCENT VEHICLE RIDES, all the way up to the upper realm.
   "The vehicles are square diamonds that connect to a single vertical line that goes straight up
   into the sky, like the fobeams — these are essentially what those appeared to be in the sky,
   taking you up all the way." So the horizontal network below carries DATA and the three vertical
   lines added in v8 carry PEOPLE, which is why they are thicker, brighter and far rarer. The pods
   that ride them are lofted from the SAME square-diamond outline and the SAME ring stack as the
   upper realm's pods in ascent.js — they are one craft seen from the two ends of one line.

   The canonical MAHFITT FOBEAM is a RAIL with a single SQUARE DIAMOND that
   travels along it, carrying a small travelling light; the FOBLOW is the same
   clock read as a low, broad edge flow. This module is that motif built in
   world space, replacing the two decorative arcs sky.js draws:

     RAIL          a thin additive tube along a CatmullRom curve (r 0.23),
                   vertex-faded at both ends so a route arrives rather than stops.
     OUTER FIELD   a second, much wider tube (r 1.85) at very low opacity —
                   the air the rail energises. Soft; never a laser hose.
     PACKETS       square diamonds (an octahedron flattened in its own plane =
                   a square rotated 45°, the reserved mark) travelling one way,
                   pooled in ONE InstancedMesh, rolled to face the camera while
                   their long axis follows the path.
     LIGHT         each packet carries one elongated additive ellipse, a second
                   InstancedMesh — the 3-D echo of the app's travelling light.
     RECEIVERS     every origin and destination is a real piece of architecture:
                   a plaza-edge relay mast, the MAH MATCH roof node, a walkway
                   pylon hub, three tower crowns. Each brightens for ~0.4 s when
                   a packet lands. No new lights (§37).
     FOBLOWS       three broad, faint, slow ribbons that follow the district's
                   surfaces — local and flowing, no packets, far fainter.

   Routes are deliberate infrastructure, not decoration: the plaza's west mast
   feeds MAH MATCH's roof node, which relays to the city walkway hub, which
   sends on to a tower crown; the east mast runs its own line to a second crown;
   and one trunk crosses the district behind the midground blocks. Nothing runs
   over the open plaza below y = 60, everything is occluded by architecture
   (depthTest on, depthWrite off, §21), and no two routes share a speed, a phase
   or a direction.

   Laws honoured: three.module.min only, procedural, no textures from disk, no
   yellow / amber / orange (colour comes from the world Theme's energy pair), no
   per-frame allocation, no geometry rebuilt in update, ~10 draw calls. */
import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, canvasTexture } from './materials.js';

/* ---- the receivers: where a route can begin or end ---------------------------------------
   p     = the transfer point (the beacon head)
   base  = where the receiver is rooted (plaza ground, MAH MATCH's roof at y 24,
           the walkway deck at y 34, a tower crown)                                          */
const NODES = {
  'relay-west':  { p: [-72, 34, -46],  base: [-72, 0, -46],      kind: 'mast',  note: 'plaza-edge relay mast, west of the vehicle corridor' },
  'relay-east':  { p: [76, 31, -50],   base: [76, 0, -50],       kind: 'mast',  note: 'plaza-edge relay mast, east of the vehicle corridor' },
  'match-roof':  { p: [0, 72.0, -78],  base: [0, 65, -78],       kind: 'node',  note: 'MAH MATCH tower crown node' },
  'walkway-hub': { p: [-52, 47.5, -150], base: [-52, 40, -150],  kind: 'node',  note: 'city walkway hub, over the west pylon' },
  'crown-nw':    { p: [-72.6, 131, -291], base: [-72.6, 125, -291], kind: 'crown', note: 'background tower crown, north-west' },
  'crown-w':     { p: [-111.4, 77, -262], base: [-111.4, 71.5, -262], kind: 'crown', note: 'background tower crown, west' },
  'crown-e':     { p: [118, 111, -265], base: [118, 105.5, -265], kind: 'crown', note: 'background tower crown, east' }
};

/* ---- the routes ---------------------------------------------------------------------------
   Each is one-way with its own speed, packet count, gauge (trunk lines carry larger
   carriers, which is also what keeps a 300 m route readable) and phase.                      */
const ROUTES = [
  { id: 'plaza-west-feed', tier: 'near', from: 'relay-west', to: 'match-roof', speed: 15.5, count: 7, gauge: 0.46, gain: 1.00, phase: 0.00,
    via: [[-64, 50, -30], [-46, 66, -30], [-20, 76, -56]] },
  /* leaves the tower crown in the open, dips behind MAH MATCH's mass, climbs back out to the walkway */
  { id: 'match-relay', tier: 'near', from: 'match-roof', to: 'walkway-hub', speed: 20.5, count: 6, gauge: 0.48, gain: 0.95, phase: 0.37,
    via: [[-12, 66, -100], [-30, 56, -122], [-44, 50, -140]] },
  { id: 'plaza-east-line', tier: 'mid', from: 'relay-east', to: 'crown-e', speed: 13.0, count: 9, gauge: 0.62, gain: 0.88, phase: 0.61,
    via: [[86, 60, -92], [96, 86, -150], [110, 104, -206]] },
  { id: 'walkway-uplink', tier: 'mid', from: 'walkway-hub', to: 'crown-nw', speed: 23.5, count: 9, gauge: 0.6, gain: 0.9, phase: 0.18,
    via: [[-58, 74, -178], [-64, 98, -214], [-70, 118, -252]] },
  /* the trunk: crown to crown across the district, passing behind the midground blocks */
  { id: 'district-trunk', tier: 'mid', from: 'crown-w', to: 'crown-e', speed: 18.0, count: 12, gauge: 0.78, gain: 0.8, phase: 0.79,
    via: [[-64, 78, -234], [0, 74, -224], [64, 84, -234]] }
];

/* ---- FOBLOWS: broad, faint, slow flows that follow the district's surfaces ---------------- */
const FLOWS = [
  { width: 26, opacity: 0.062, drift: 0.031, pts: [[-64, 12, 66], [-80, 26, 12], [-90, 44, -58], [-92, 56, -126], [-86, 50, -198]] },
  { width: 20, opacity: 0.055, drift: 0.023, pts: [[60, 12, 66], [76, 24, 10], [90, 38, -56], [98, 46, -124], [104, 42, -186]] },
  { width: 34, opacity: 0.048, drift: 0.017, pts: [[-150, 58, -150], [-70, 70, -186], [20, 74, -200], [110, 64, -176], [170, 50, -140]] }
];

/* ================= THE ASCENT NETWORK (v8) =====================================================

   THREE lines, and no more. A vertical ascent line is the brightest vertical thing in this city and
   the only one that leaves it, so scarcity is what makes it read as an event rather than as traffic;
   a fourth would also have had to stand somewhere the black platinum floor could not answer it.

   WHERE THEY STAND, and why exactly here. Every base sits INSIDE ground.js's FIELD_RADIUS (43 m) so
   its light lands on the hero floor and gets a reflection, OUTSIDE PLAZA_RADIUS (27 m) so it never
   crowds the monument at (0, 7) or the approach, and clear of all three aprons in buildings.js's
   SITES — each apron is (W + 8) x 16 m about its site's own forward, which is what pushed the west
   pad out to x −30 (the gym apron's corner reaches x ≈ −33 at z ≈ −14) and the east pad in to x 32.
   All three read inside the establishing camera's frame at (0.6, 3, 42) looking down −Z: 26°, 28°
   and 9° off axis.

   The pads are turned 45°, which is not a style choice: ground.js lays the floor as a 9 m diamond
   lattice rotated 45°, so a square-diamond pad on that bearing sits IN the joint grid instead of
   across it, and its coping lines up with the cell edges it stands on.

   No two lines share a height, and that is what desynchronises them: the travel texture repeats a
   fixed number of times over each line's own height, so a 604 m line runs its bands 55 m apart at
   16.4 m/s and a 468 m line runs them 43 m apart at 12.8 m/s off the SAME shared texture and the
   same single draw call. The file's rule that no two routes share a speed or a phase still holds.  */
const ASCENTS = [
  /* WEST — the near line. Between the plaza field's west edge and MAH GYM's apron; the closest of the
     three to the camera, so it is the one whose pod reads at real size and whose floor flare is big. */
  { id: 'ascent-west',  x: -30, z: -22, h: 520, pod: 1.00, phase: 0.7665 },
  /* EAST — between the field's east edge and MAH MARKET's apron, and the shortest of the three. */
  { id: 'ascent-east',  x:  32, z: -18, h: 468, pod: 0.92, phase: 0.3000 },
  /* NORTH — on the field's far edge in front of MAH MATCH's west flank, so the tallest line has the
     district's tallest dark mass behind it to be read against. */
  { id: 'ascent-north', x: -13, z: -37, h: 604, pod: 1.06, phase: 0.6120 }
];
/* ground.js FLOOR_TOP: the laid deck is 0.17 above the raw ground plane and everything that stands
   on the plaza stands on the DECK. A pad sunk to y = 0 would show a 17 cm gap along its whole rim. */
const DECK_Y = 0.17;
const PAD_TOP = DECK_Y + 0.88;     /* the coping: three receding courses above the deck */
const BEAM_Y = PAD_TOP + 0.05;     /* the aperture the line leaves from */
const DOCK_Y = BEAM_Y + 4.90;      /* the pod's belt at rest: its emitter face clears the aperture by ~3 m */

/* THE SCHEDULE. One deterministic cycle per line, driven from absolute t, so a capture at t = 0 is
   the same frame every time. Phases were chosen for that frame: WEST is 30% into its burst (the pod
   ~24 m up and still legibly a pod), EAST is docked, NORTH is deep into its build-up. A pod is
   visible for 74% of its cycle but a LAUNCH occupies 2.2% of it, so across three lines a departure
   happens about every 36 s and never two at once — rare, which is the note. */
const CYCLE = 108;
const U_ARRIVE = 0.040, U_DOCK = 0.070, U_PREP = 0.520, U_READY = 0.744, U_FIRE = 0.760, U_GONE = 0.782, U_COLD = 0.880;
/* "Explosive" here is a burst of POWER, never a fireball and never debris: the pod is intact the
   whole way, leaves under 2.4 s of extreme acceleration, and comes back next cycle on the same line. */
const CLIMB = 640, CLIMB_POW = 2.9;   /* metres covered inside the burst, and its acceleration curve */
const DROP = 700, DROP_POW = 2.4;     /* arrival is the same energy in reverse, decelerating into the pad */

/* THE POD. The superellipse |x|^p + |z|^p = 1 is a hard square diamond at p = 1; p = 1.32 keeps the
   four points and the four flat flanks and takes the raw corner off, which is the only shape law 6
   exempts and even then only chamfered. Sixteen samples put a vertex exactly on each corner
   (0, 4, 8, 12) and each flank centre (2, 6, 10, 14) so the glazing can be placed by index. */
const POD_N = 16, POD_P = 1.32;
/* Broad at the belt and taller above it than below, so the pod is a square diamond in ELEVATION as
   well as in plan and sits ON its light instead of balancing on a point. */
const POD_RINGS = [
  { y: -0.420, s: 0.240 },   /* the emitter face — horizontal, and the reason the shell is low-metal */
  { y: -0.382, s: 0.420 },
  { y: -0.300, s: 0.660 },
  { y: -0.170, s: 0.870 },
  { y: -0.050, s: 0.985 },
  { y:  0.000, s: 1.000 },   /* THE BELT: the widest line, and the mirror catch */
  { y:  0.085, s: 0.975 },
  { y:  0.240, s: 0.860 },
  { y:  0.400, s: 0.655 },
  { y:  0.520, s: 0.400 },
  { y:  0.580, s: 0.220 }    /* the crown */
];
const POD_W = 2.6, POD_H = 4.2;              /* 5.2 m across the belt: large enough to be a vehicle, small enough to be in a plaza */
const POD_BOTTOM = POD_RINGS[0].y * POD_H;   /* −1.76 m: the emitter face sits below the pod's origin */
const GLASS_BANDS = [6, 7, 8], GLASS_SEGS = [1, 2, 5, 6, 9, 10, 13, 14];
const SEAM_N = 48;                           /* the seam outline is finer than the hull's so one segment is a 0.34 m seam, not a facet */
const BAND_REPEAT = 11;                      /* travel bands per line, in the line's own height */
const BAND_RATE = 0.30;                      /* texture v per second — upward, and the only motion cue the eye needs */

const SEG = 128;            /* cached samples per route (arc-length spaced) */
/* v5 §10: MANY more FOBEAMs, each far THINNER and SMALLER than v4's five fat arcs. One beam is now a
   hairline; what carries the composition is the DENSITY of them and the fact that no two are in phase.
   Tessellation falls with distance so 40 routes cost less than v4's five did.
     near  over and around the plaza — the ones a viewer can follow packet by packet
     mid   across the district, between crowns and hubs
     far   the distant energy field: hundreds of metres out, sub-pixel-thin, no outer field  */
const TIER = {
  near: { railR: 0.085, fieldR: 0.72, ts: 84, rs: 5, fts: 34, frs: 5, rail: 0.62, field: 0.085, packet: 1.0 },
  mid:  { railR: 0.115, fieldR: 0.95, ts: 66, rs: 5, fts: 28, frs: 5, rail: 0.5,  field: 0.062, packet: 0.72 },
  far:  { railR: 0.46,  fieldR: 0,    ts: 20, rs: 4, fts: 0,  frs: 0, rail: 0.17, field: 0, packet: 0.34 }
};
/* THE DISTANT MAHGIC FIELD (§11): far routes are generated along a band arcing across the sky, denser
   toward its middle, so together they read as one luminous river of energy — the Milky Way of a world
   whose infrastructure IS light — rather than as thirty separate drawn lines. */
const FAR_ROUTES = 30;

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function smoothstep(e0, e1, x) { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* concatenate geometries into one static BufferGeometry, keeping only the named attributes */
function mergeGeos(list, attrs) {
  const parts = []; let count = 0;
  for (const g of list) { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); parts.push(n); count += n.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  for (const name of attrs) {
    const size = name === 'uv' ? 2 : 3, arr = new Float32Array(count * size);
    let o = 0;
    for (const n of parts) { const a = n.attributes[name], c = n.attributes.position.count; if (a) arr.set(a.array.subarray(0, c * size), o * size); o += c; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  parts.forEach(n => n.dispose());
  return out;
}

/* a soft radial glow — the travelling light and the arrival brightening share it */
function glowTexture() {
  return canvasTexture(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(226,240,255,0.72)');
    g.addColorStop(0.55, 'rgba(150,196,255,0.18)'); g.addColorStop(1, 'rgba(90,150,235,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  });
}

/* THE TRAVEL TEXTURE. Four soft bands, each sheared by exactly one tile width over one band spacing:
   wrapped round a cylinder whose u goes once about the axis, a shear of exactly one tile is a
   continuous HELIX — band b at the tile's right edge lands on band b+1 at its left, and band 3 at the
   bottom lands on band 0 at the top, so neither seam can show however far the offset is scrolled.
   Scrolling this ONE texture is what makes a static bar read as motion UP; nothing else moves. */
function beamBandTexture() {
  const BANDS = 4;
  const t = canvasTexture(64, 256, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    const pitch = h / BANDS;
    c.lineCap = 'butt';
    for (let b = 0; b < BANDS; b++) {
      const base = b * pitch;
      /* the band's profile is drawn as 25 strokes under a gaussian, so it is a soft swell of light
         rather than a hard stripe — a hard stripe on a 500 m beam reads as a ladder */
      for (let s = -12; s <= 12; s++) {
        const a = Math.exp(-(s * s) / 22) * 0.85;
        c.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
        c.lineWidth = 2.4;
        for (let k = -1; k <= 1; k++) {
          c.beginPath();
          c.moveTo(k * w, base + s * 1.7);
          c.lineTo((k + 1) * w, base + s * 1.7 + pitch);
          c.stroke();
        }
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* The unit square-diamond outline in XZ, as a flat array so nothing downstream allocates. */
function sqOutline(n, p) {
  const o = new Float32Array(n * 2), e = 2 / p;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    o[i * 2] = Math.sign(ca) * Math.pow(Math.abs(ca), e);
    o[i * 2 + 1] = Math.sign(sa) * Math.pow(Math.abs(sa), e);
  }
  return o;
}
/* Loft an outline through a stack of rings. For an outline running anticlockwise in XZ and rings
   running upward, (a, c, b) / (a, d, c) is the winding whose face normal points radially OUTWARD.
   `only` keeps a subset of cells, which is how the glazing and the corner seams are cut from the
   same section the hull is lofted from and therefore always land exactly on it. */
function loftHull(outline, rings, opts) {
  const o = opts || {}, n = outline.length / 2, m = rings.length;
  const grow = o.grow || 0, only = o.only || null, sx = o.sx == null ? 1 : o.sx, sy = o.sy == null ? 1 : o.sy;
  const pos = [], idx = [];
  for (let r = 0; r < m; r++) {
    const R = rings[r], s = R.s + grow;
    for (let i = 0; i < n; i++) pos.push(outline[i * 2] * s * sx, R.y * sy, outline[i * 2 + 1] * s * sx);
  }
  for (let b = 0; b < m - 1; b++) for (let i = 0; i < n; i++) {
    if (only && !only(b, i)) continue;
    const a = b * n + i, bb = b * n + ((i + 1) % n), c = (b + 1) * n + ((i + 1) % n), d = (b + 1) * n + i;
    idx.push(a, c, bb, a, d, c);
  }
  if (o.capBottom) { const ci = pos.length / 3; pos.push(0, rings[0].y * sy, 0); for (let i = 0; i < n; i++) idx.push(ci, i, (i + 1) % n); }
  if (o.capTop) { const top = (m - 1) * n, ci = pos.length / 3; pos.push(0, rings[m - 1].y * sy, 0); for (let i = 0; i < n; i++) idx.push(ci, top + ((i + 1) % n), top + i); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/* A vertical column ONE UNIT TALL, from y = 0 to y = 1, with its brightness baked into vertex colour
   so ONE instance matrix can stretch it to any height without stretching the fade — which is what
   lets three lines of three different heights be one InstancedMesh and one draw call. uv.v runs 0 at
   the base to 1 at the top, so the travel texture scrolls along it. `prof` is [v, radius] pairs. */
function column(prof, sides, fn) {
  const n = prof.length, verts = n * (sides + 1);
  const pos = new Float32Array(verts * 3), uv = new Float32Array(verts * 2), col = new Float32Array(verts * 3);
  const idx = [];
  for (let r = 0; r < n; r++) {
    const v = prof[r][0], rad = prof[r][1], c = fn(v);
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2, k = r * (sides + 1) + i;
      pos[k * 3] = Math.cos(a) * rad; pos[k * 3 + 1] = v; pos[k * 3 + 2] = Math.sin(a) * rad;
      uv[k * 2] = i / sides; uv[k * 2 + 1] = v;
      col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = c;
    }
  }
  for (let r = 0; r < n - 1; r++) for (let i = 0; i < sides; i++) {
    const a = r * (sides + 1) + i, b = a + 1, c = (r + 1) * (sides + 1) + i + 1, d = (r + 1) * (sides + 1) + i;
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  /* the instance matrix stretches this to 600 m; a bounding sphere computed from the unit form would
     cull the line the moment its base left frame, so the meshes that use it are frustumCulled = false */
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 8);
  return g;
}
/* a sampled radius/brightness profile — a column is only as good as its falloff, and both are curves */
function profile(rings, radius) {
  const p = [];
  for (let i = 0; i < rings; i++) { const v = i / (rings - 1); p.push([v, radius(v)]); }
  return p;
}
/* a flat quad in the XZ plane, unit square, +Y normal: pools, streaks and spills all lie on a surface */
function lyingQuad() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]), 2));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.8);
  return g;
}

export function buildFobeams(ctx) {
  const scene = ctx.scene, M = ctx.M || {};
  const theme = ctx.theme || M.theme || { energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 };
  const group = new THREE.Group(); group.name = 'fobeams';
  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const R = rng(90210);

  /* ---- retire the legacy sky beams -------------------------------------------------------
     Preferred: the assembly hands us the sky module as ctx.sky and we hide its `beams` and
     `flows`. Fallback (no assembly change needed): find the group named 'sky' and hide only
     its additive tube meshes and its double-sided additive ribbons — exactly the old FOBEAM /
     FOBLOW set. Everything hidden is remembered and restored in dispose(). */
  const retired = [];
  (function retireLegacy() {
    const hide = o => { if (o && o.visible !== false) { o.visible = false; retired.push(o); } };
    const sky = ctx.sky;
    if (sky && (sky.beams || sky.flows)) {
      (sky.beams || []).forEach(b => { hide(b.core); hide(b.glow); });
      (sky.flows || []).forEach(hide);
      return;
    }
    const g = scene && scene.getObjectByName && scene.getObjectByName('sky');
    if (!g) return;
    g.children.forEach(o => {
      if (!o.isMesh || !o.material || o.material.blending !== THREE.AdditiveBlending) return;
      const type = o.geometry && o.geometry.type;
      if (type === 'TubeGeometry') hide(o);                                   /* the two arcs: core + glow */
      else if (type === 'BufferGeometry' && o.material.side === THREE.DoubleSide) hide(o);   /* the three ribbons */
    });
  })();

  /* ---- materials (all mine; nothing shared is mutated) ----------------------------------- */
  const railMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const fieldMat = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const packetMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const glowTex = glowTexture(); owned.textures.push(glowTex);
  const lightMat = new THREE.MeshBasicMaterial({ map: glowTex, color: theme.energy, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const arriveMat = new THREE.MeshBasicMaterial({ map: glowTex, color: theme.energyLight, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const flowMat = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
  railMat.name = 'fobeam-rail'; fieldMat.name = 'fobeam-field'; packetMat.name = 'fobeam-packet';
  lightMat.name = 'fobeam-light'; arriveMat.name = 'fobeam-arrival'; flowMat.name = 'foblow';
  owned.materials.push(railMat, fieldMat, packetMat, lightMat, arriveMat, flowMat);
  const structuralMat = M.trimSatin || M.trim || M.platinum || new THREE.MeshStandardMaterial({ color: 0x8593a8, roughness: 0.36, metalness: 0.9 });
  const headMat = M.energyLight || new THREE.MeshStandardMaterial({ color: 0x0a0f18, emissive: theme.energyLight, emissiveIntensity: 1.7, roughness: 0.5, metalness: 0 });
  if (!M.trimSatin && !M.trim && !M.platinum) owned.materials.push(structuralMat);
  if (!M.energyLight) owned.materials.push(headMat);

  /* ---- routes: curves, cached samples, rail + field geometry ------------------------------ */
  const routes = [];
  const railParts = [], fieldParts = [];
  const nodeIndex = {}, nodeList = [];
  Object.keys(NODES).forEach((k, i) => { nodeIndex[k] = i; nodeList.push(Object.assign({ id: k, flash: 0 }, NODES[k])); });

  /* ---- the distant MAHGIC field: FAR_ROUTES generated along one band across the sky --------
     Bearing runs the width of the visible sky; the band's height is a smooth arc peaking behind the
     district, so density is highest where the eye already is. Each route is short relative to its
     radius, carries several tiny packets, and has its own speed, phase and direction. Deterministic. */
  const FR = rng(31337);
  const band = (u, jitter) => {
    const bearing = (-24 + 228 * u) * Math.PI / 180;
    const r = 380 + FR() * 330;
    const y = 78 + 232 * Math.sin(Math.PI * u) + (jitter ? (FR() - 0.5) * 96 : 0);
    return [Math.cos(bearing) * r, y, -Math.sin(bearing) * r];
  };
  const farRoutes = [];
  for (let i = 0; i < FAR_ROUTES; i++) {
    const u0 = (i + FR() * 0.7) / FAR_ROUTES, u1 = Math.min(1, u0 + 0.03 + FR() * 0.09);
    const a = band(u0, true), b = band(u1, true);
    /* the mid point is pushed off the chord by a signed amount that is sometimes almost nothing: a third
       of the field runs nearly straight, so the sky is not thirty matching arches */
    const bow = (FR() - 0.42) * 130;
    const mid = [(a[0] + b[0]) / 2 * (0.9 + FR() * 0.2), (a[1] + b[1]) / 2 + bow, (a[2] + b[2]) / 2 * (0.9 + FR() * 0.2)];
    farRoutes.push({
      id: 'mahgic-field-' + i, tier: 'far', p0: a, p1: b, via: [mid],
      speed: 34 + FR() * 46, count: 3 + Math.floor(FR() * 4), gauge: 1.2 + FR() * 1.5,
      gain: 0.2 + FR() * FR() * 0.62, phase: FR(), reverse: FR() < 0.5
    });
  }
  const ALL = ROUTES.concat(farRoutes);

  ALL.forEach((spec, ri) => {
    const T = TIER[spec.tier || 'mid'];
    const a = spec.p0 ? { p: spec.p0 } : NODES[spec.from], b = spec.p1 ? { p: spec.p1 } : NODES[spec.to];
    const pts = [new THREE.Vector3(...a.p)].concat(spec.via.map(v => new THREE.Vector3(...v)), [new THREE.Vector3(...b.p)]);
    if (spec.reverse) pts.reverse();
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    /* cache the path ONCE: arc-length spaced points and their tangents. update() only interpolates. */
    const sample = curve.getSpacedPoints(SEG);
    const px = new Float32Array((SEG + 1) * 3), tx = new Float32Array((SEG + 1) * 3);
    for (let i = 0; i <= SEG; i++) { px[i * 3] = sample[i].x; px[i * 3 + 1] = sample[i].y; px[i * 3 + 2] = sample[i].z; }
    for (let i = 0; i <= SEG; i++) {
      const i0 = Math.max(0, i - 1) * 3, i1 = Math.min(SEG, i + 1) * 3;
      let dx = px[i1] - px[i0], dy = px[i1 + 1] - px[i0 + 1], dz = px[i1 + 2] - px[i0 + 2];
      const l = Math.hypot(dx, dy, dz) || 1; tx[i * 3] = dx / l; tx[i * 3 + 1] = dy / l; tx[i * 3 + 2] = dz / l;
    }
    const len = curve.getLength();
    routes.push({ id: spec.id, tier: spec.tier || 'mid', curve, px, tx, len, speed: spec.speed, gauge: spec.gauge, gain: spec.gain, pgain: T.packet, from: nodeIndex[spec.from], to: nodeIndex[spec.to], count: spec.count, phase: spec.phase });

    /* RAIL — a hairline, bright, faded at both ends by vertex colour */
    const rail = new THREE.TubeGeometry(curve, T.ts, T.railR, T.rs, false);
    const railK = T.rail / TIER.near.rail;   /* the far tier is dimmer as well as thinner */
    paintTube(rail, T.ts, T.rs, u => railK * spec.gain * (0.80 + 0.20 * Math.sin(Math.PI * u)) * smoothstep(0, 0.05, u) * smoothstep(0, 0.05, 1 - u));
    railParts.push(rail);
    /* OUTER FIELD — soft, swelling in the middle of the run; the far tier carries none */
    if (T.fieldR > 0) {
      const field = new THREE.TubeGeometry(curve, T.fts, T.fieldR, T.frs, false);
      const fieldK = T.field / TIER.near.field;
      paintTube(field, T.fts, T.frs, u => fieldK * spec.gain * (0.45 + 0.55 * Math.sin(Math.PI * u)) * smoothstep(0, 0.12, u) * smoothstep(0, 0.12, 1 - u));
      fieldParts.push(field);
    }
  });
  function paintTube(geo, ts, rs, fn) {
    const n = geo.attributes.position.count, col = new Float32Array(n * 3), stride = rs + 1;
    for (let v = 0; v < n; v++) { const c = fn(Math.floor(v / stride) / ts); col[v * 3] = c; col[v * 3 + 1] = c; col[v * 3 + 2] = c; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const railGeo = own(mergeGeos(railParts, ['position', 'color']));
  const fieldGeo = own(mergeGeos(fieldParts, ['position', 'color']));
  const railMesh = new THREE.Mesh(railGeo, railMat); railMesh.renderOrder = 6; railMesh.frustumCulled = false; group.add(railMesh);
  const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat); fieldMesh.renderOrder = 5; fieldMesh.frustumCulled = false; group.add(fieldMesh);

  /* ---- packets: ONE instanced square diamond for every route ------------------------------ */
  const packets = [];
  routes.forEach((r, ri) => {
    for (let i = 0; i < r.count; i++) {
      /* the jitter is a full slot wide, so packets on one route are never evenly spaced and the world
         never falls into a marching rhythm — asynchrony is the point (§10) */
      const jitter = (R() - 0.5) * 0.9 / r.count;
      packets.push({
        r: ri,
        s: ((i / r.count + r.phase + jitter) % 1 + 1) % 1 * r.len,
        speed: r.speed * (0.82 + R() * 0.4),           /* no two packets share a speed, even on one route */
        size: (0.5 + R() * 0.6) * r.gauge,
        gain: (0.72 + R() * 0.34) * r.pgain,   /* a distant packet is a spark, not a lamp */
        b: 0
      });
    }
  });
  const N = packets.length;
  const diamondGeo = own(new THREE.OctahedronGeometry(1, 0));      /* square rotated 45° in its own plane, thin in Z */
  const packetMesh = new THREE.InstancedMesh(diamondGeo, packetMat, N);
  packetMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  packetMesh.renderOrder = 7; packetMesh.frustumCulled = false; group.add(packetMesh);
  const lightGeo = own(new THREE.PlaneGeometry(1, 1));
  const lightMesh = new THREE.InstancedMesh(lightGeo, lightMat, N);
  lightMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  lightMesh.renderOrder = 8; lightMesh.frustumCulled = false; group.add(lightMesh);
  const grey = new THREE.Color(1, 1, 1);
  for (let i = 0; i < N; i++) { packetMesh.setColorAt(i, grey); lightMesh.setColorAt(i, grey); }

  /* ---- receivers: mast / roof node / crown, plus the arrival brightening ------------------- */
  const structParts = [];
  const headGeo = own(new THREE.OctahedronGeometry(1, 0));
  const headMesh = new THREE.InstancedMesh(headGeo, headMat, nodeList.length);
  const arriveGeo = own(new THREE.PlaneGeometry(1, 1));
  const arriveMesh = new THREE.InstancedMesh(arriveGeo, arriveMat, nodeList.length);
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _pv = new THREE.Vector3(), _sv = new THREE.Vector3();
  nodeList.forEach((n, i) => {
    const [bx, by, bz] = n.base, top = n.p[1], h = Math.max(1.2, top - by);
    /* a slim tapered shaft, one or two collars, and a chamfered square-diamond housing at the head */
    const shaft = new THREE.CylinderGeometry(0.2, n.kind === 'mast' ? 0.5 : 0.34, h, 6, 1, false);
    shaft.translate(bx, by + h / 2, bz); structParts.push(shaft);
    if (n.kind !== 'mast') { const plinth = chamferBox(2.1, 0.5, 2.1, 0.1); plinth.translate(bx, by + 0.25, bz); structParts.push(plinth); }
    const collarY = [by + h * 0.52].concat(n.kind === 'mast' ? [by + h * 0.86] : []);
    collarY.forEach(y => { const c = chamferBox(1.05, 0.16, 1.05, 0.05); c.translate(bx, y, bz); structParts.push(c); });
    const housing = chamferBox(1.55, 1.55, 0.34, 0.14); housing.rotateZ(Math.PI / 4); housing.translate(bx, top, bz); structParts.push(housing);
    /* the beacon diamond and its arrival glow, both face the plaza */
    _e.set(0, 0, 0); _q.setFromEuler(_e);
    _m4.compose(_pv.set(n.p[0], n.p[1], n.p[2]), _q, _sv.set(0.62, 0.62, 0.2));
    headMesh.setMatrixAt(i, _m4);
    _m4.compose(_pv.set(n.p[0], n.p[1], n.p[2] + 0.35), _q, _sv.set(5.2, 5.2, 1));
    arriveMesh.setMatrixAt(i, _m4);
    arriveMesh.setColorAt(i, grey);
  });
  headMesh.instanceMatrix.needsUpdate = true; arriveMesh.instanceMatrix.needsUpdate = true;
  headMesh.renderOrder = 4; arriveMesh.renderOrder = 8; arriveMesh.frustumCulled = false;
  const structGeo = own(mergeGeos(structParts, ['position', 'normal']));
  const structMesh = new THREE.Mesh(structGeo, structuralMat); structMesh.name = 'fobeam-receivers';
  group.add(structMesh, headMesh, arriveMesh);

  /* ---- FOBLOWS: broad faint ribbons that follow the district's surfaces -------------------- */
  const flowMeshes = [];
  FLOWS.forEach((f, fi) => {
    const curve = new THREE.CatmullRomCurve3(f.pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
    const n = 60, pos = new Float32Array((n + 1) * 2 * 3), col = new Float32Array((n + 1) * 2 * 3), idx = [];
    const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), pt = new THREE.Vector3(), tan = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const t = i / n; curve.getPointAt(t, pt); curve.getTangentAt(t, tan);
      side.crossVectors(tan, up).normalize();
      const w = f.width * (0.32 + 0.68 * Math.sin(Math.PI * t)) * 0.5;
      const c = smoothstep(0, 0.16, t) * smoothstep(0, 0.16, 1 - t) * (0.6 + 0.4 * Math.sin(Math.PI * t));
      pos.set([pt.x + side.x * w, pt.y + side.y * w, pt.z + side.z * w, pt.x - side.x * w, pt.y - side.y * w, pt.z - side.z * w], i * 6);
      col.set([c, c, c, c * 0.72, c * 0.72, c * 0.72], i * 6);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = own(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    const mat = flowMat.clone(); mat.opacity = f.opacity; owned.materials.push(mat);
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 3; mesh.userData.base = f.opacity; mesh.userData.drift = f.drift; mesh.userData.phase = fi * 2.1;
    group.add(mesh); flowMeshes.push(mesh);
  });

  /* ================= THE ASCENT NETWORK ====================================================
     Three vertical lines, their pads, and the square-diamond pods that ride them.

     LAW 2 — WHAT ANSWERS EACH LINE. A 500 m column of light standing on a near-mirror floor is the
     brightest vertical thing in this city, and an emissive tube on its own would light nothing at
     all. Every line is answered FIVE ways, and none of them is a THREE.Light: this assembly already
     spends its light budget on the entrances and the interiors, the plaza floor is metalness 0.98
     and takes no diffuse light from a lamp anyway, and a point light that cannot be seen to do work
     is exactly the floating light the direction is complaining about. So:
       1  A POOL on the black platinum, through ground.js's own ctx.lightPool, so it is laid by the
          instrument that owns the floor and dims with the time of day and follows a retheme.
       2  A SPECULAR STREAK, re-aimed at the camera every frame. On a floor at roughness 0.055 the
          reflection of a vertical light is a long streak running from its base TOWARD the viewer,
          and it lengthens as the view gets more grazing — which is the "legible second copy" the
          references show, and it is right from any camera in the world, not just the hero one.
       3  A MIRRORED COPY of the pad coping and of the emitter plate under the deck (ctx.reflect).
       4  ADJACENT GEOMETRY TINTED: the four mast blades each carry an inward reveal whose vertex
          brightness is 1/(1 + d²/k) in the distance from the beam axis and falls with height at the
          rate a LINE source falls (slowly — a line is not a point, and faking a point's falloff on
          a 500 m beam is what makes these read as decals).
       5  A SPILL on the surface it is mounted to: a gradient lying on the pad coping itself.
     All five surge together when a pod launches, and are back to rest within ~11 s.

     THE COST DISCIPLINE. Fourteen meshes for the whole network, every one instanced or merged: the
     three lines are three InstancedMeshes of three, because a unit-tall column with its fade baked
     into vertex colour can be stretched to any height by an instance matrix without stretching the
     fade — which is also how one shared travel texture gives three lines three different band
     spacings and three different climb speeds.                                                    */
  const ascentGroup = new THREE.Group(); ascentGroup.name = 'ascent-network'; group.add(ascentGroup);
  /* one record for the whole network: the per-line state update() walks, the meshes it writes into,
     and the materials setTime()/setTheme() own. Nothing here is rebuilt or reallocated after build. */
  const ascent = { lines: [], meshes: null, mats: null, base: null, tex: null };
  {
    const padMat = M.graphiteDark || M.graphite || structuralMat;
    /* LAW 1. The coping, the sills and the pad soffits are HORIZONTAL: at metalness ≥ 0.9 they would
       be lit only by the near-black zenith and render black. platinumMidLit is the same platinum read
       at metalness 0.40, which takes the hemisphere. The mast blades and the buttresses are vertical
       and canted, they see the bright horizon band, and they keep the mirror-grade platinumMid. */
    const copeMat = M.platinumMidLit || M.platinumLit || M.platinum || structuralMat;
    const mastMat = M.platinumMid || M.platinumBrushed || M.platinum || structuralMat;
    const podShellMat = M.platinumLit || M.platinum || structuralMat;      /* the crown cap and the emitter face point straight up and down */
    const podBeltMat = M.trimSatin || M.trim || M.chromeSatin || mastMat;  /* the belt is a vertical band: mirror grade is legal there and nowhere else on the pod */
    const podGlassMat = M.crystalGlass || M.glass || M.panel || copeMat;

    const bandTex = beamBandTexture(); owned.textures.push(bandTex);
    bandTex.repeat.set(1, BAND_REPEAT);
    const beamCoreMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, vertexColors: true, transparent: true, opacity: 0.60, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
    const beamBandMat = new THREE.MeshBasicMaterial({ map: bandTex, color: theme.energy, vertexColors: true, transparent: true, opacity: 0.46, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
    const beamSheathMat = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, transparent: true, opacity: 0.115, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
    const revealMat = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, transparent: true, opacity: 0.50, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
    const emitterMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
    const padGlowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: theme.energy, transparent: true, opacity: 0.52, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
    const podSeamMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
    const podFieldMat = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
    beamCoreMat.name = 'ascent-core'; beamBandMat.name = 'ascent-travel'; beamSheathMat.name = 'ascent-sheath';
    revealMat.name = 'ascent-reveal'; emitterMat.name = 'ascent-emitter'; padGlowMat.name = 'ascent-pad-glow';
    podSeamMat.name = 'ascent-pod-seam'; podFieldMat.name = 'ascent-pod-field';
    owned.materials.push(beamCoreMat, beamBandMat, beamSheathMat, revealMat, emitterMat, padGlowMat, podSeamMat, podFieldMat);

    /* ---- the three columns ------------------------------------------------------------------
       CORE    a hot, thin, slightly tapering line — the track itself
       TRAVEL  a wider sleeve carrying the helical band texture, so the eye reads MOTION UP
       SHEATH  a flared skirt at the pad that narrows and then WIDENS with altitude: the air the
               line energises, and the reason the top dissolves into the sky instead of stopping.
       Every fade reaches exactly zero at v = 1, so no line has an end — it recedes. */
    const coreGeo = own(column(profile(18, v => 0.30 * Math.pow(1 - v, 0.28) + 0.055), 10,
      v => 1.42 * Math.pow(1 - v, 1.55)));
    const bandGeo = own(column(profile(22, v => 0.60 * Math.pow(1 - v, 0.30) + 0.10), 12,
      v => 0.95 * Math.pow(1 - v, 1.95)));
    const sheathGeo = own(column(profile(22, v => 1.05 + 5.4 * Math.pow(v, 0.85) + 4.2 * Math.exp(-v * 46)), 10,
      v => Math.pow(1 - v, 2.6) + 0.95 * Math.exp(-v * 34)));
    const N_ASC = ASCENTS.length;
    const coreMesh = new THREE.InstancedMesh(coreGeo, beamCoreMat, N_ASC);
    const bandMesh = new THREE.InstancedMesh(bandGeo, beamBandMat, N_ASC);
    const sheathMesh = new THREE.InstancedMesh(sheathGeo, beamSheathMat, N_ASC);
    coreMesh.renderOrder = 6; bandMesh.renderOrder = 5; sheathMesh.renderOrder = 4;
    [coreMesh, bandMesh, sheathMesh].forEach(m => { m.frustumCulled = false; ascentGroup.add(m); });

    /* ---- the pads: real architecture, not a decal on the floor -------------------------------
       Three receding chamfered courses, a low mirror-grade coping, four canted mast blades and four
       buttresses at the diamond's points. Turned 45° so the pad sits IN ground.js's diamond lattice. */
    const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _be = new THREE.Euler(), _bp = new THREE.Vector3(), _bs = new THREE.Vector3(1, 1, 1);
    const padParts = [], copeParts = [], mastParts = [], emitParts = [];
    function put(list, geo, x, y, z, rx, ry, rz) {
      _be.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _bq.setFromEuler(_be); _bp.set(x, y, z); _bm.compose(_bp, _bq, _bs);
      const g = geo.clone(); g.applyMatrix4(_bm); list.push(g); return g;
    }
    const D45 = Math.PI / 4;
    const courseA = chamferBox(8.4, 0.30, 8.4, 0.14), courseB = chamferBox(6.6, 0.36, 6.6, 0.12);
    const copeGeo = chamferBox(5.4, 0.22, 5.4, 0.07);
    const bladeGeo = chamferBox(1.5, 5.2, 0.42, 0.12), buttGeo = chamferBox(0.9, 1.5, 1.9, 0.10);
    const plateGeo = chamferBox(3.0, 0.12, 3.0, 0.05), barGeo = chamferBox(0.16, 0.07, 2.3, 0.02);
    ASCENTS.forEach(A => {
      put(padParts, courseA, A.x, DECK_Y + 0.15, A.z, 0, D45, 0);
      put(padParts, courseB, A.x, DECK_Y + 0.48, A.z, 0, D45, 0);
      put(copeParts, copeGeo, A.x, PAD_TOP - 0.11, A.z, 0, D45, 0);
      for (let i = 0; i < 4; i++) {
        /* blades stand on the diagonals of the turned pad and lean 10° INWARD, so their inner faces
           are tilted toward the line and catch it — a vertical mirror grade doing the job it can do */
        const a = D45 + i * Math.PI / 2, ry = Math.PI / 2 - a;
        put(mastParts, bladeGeo, A.x + Math.cos(a) * 2.55, PAD_TOP + 2.55, A.z + Math.sin(a) * 2.55, -0.17, ry, 0);
        const b = i * Math.PI / 2;
        put(mastParts, buttGeo, A.x + Math.cos(b) * 3.15, PAD_TOP - 0.22, A.z + Math.sin(b) * 3.15, 0.22, Math.PI / 2 - b, 0);
      }
      /* the emitter: a square-diamond plate the line leaves from, inside a square-diamond outline of
         four bars — the reserved mark at pad scale, the same figure the whole world is built on */
      put(emitParts, plateGeo, A.x, PAD_TOP + 0.07, A.z, 0, D45, 0);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; put(emitParts, barGeo, A.x + Math.cos(a) * 1.55, PAD_TOP + 0.04, A.z + Math.sin(a) * 1.55, 0, Math.PI / 2 - a + D45, 0); }
    });
    [courseA, courseB, copeGeo, bladeGeo, buttGeo, plateGeo, barGeo].forEach(g => g.dispose());
    const padMesh = new THREE.Mesh(own(mergeGeos(padParts, ['position', 'normal'])), padMat);
    const copeMesh = new THREE.Mesh(own(mergeGeos(copeParts, ['position', 'normal'])), copeMat);
    const mastMesh = new THREE.Mesh(own(mergeGeos(mastParts, ['position', 'normal'])), mastMat);
    const emitMesh = new THREE.Mesh(own(mergeGeos(emitParts, ['position', 'normal'])), emitterMat);
    padMesh.name = 'ascent-pads'; copeMesh.name = 'ascent-copings'; mastMesh.name = 'ascent-masts'; emitMesh.name = 'ascent-emitters';
    padMesh.receiveShadow = copeMesh.receiveShadow = true; mastMesh.castShadow = mastMesh.receiveShadow = true;
    emitMesh.renderOrder = 6;
    ascentGroup.add(padMesh, copeMesh, mastMesh, emitMesh);
    if (typeof ctx.reflect === 'function') { ctx.reflect(copeMesh, 0.3); ctx.reflect(emitMesh, 0.42); }

    /* ---- the reveal: adjacent geometry tinted toward the emitter -----------------------------
       One plane laid on each blade's inner face, built ONCE around a local axis and instanced per
       pad. Its vertex brightness is the real falloff of a LINE source: 1/(1 + d²/k) across the gap
       to the axis, and only a slow decay with height, because a 500 m line does not fall off the way
       a lamp does. That difference is the whole reason this reads as light and not as a painted
       gradient — and the same curve is what makes it die out about four metres from the beam. */
    const revealParts = [];
    let revealMesh = null;
    for (let i = 0; i < 4; i++) {
      const a = D45 + i * Math.PI / 2, ry = Math.PI / 2 - a;
      const pl = new THREE.PlaneGeometry(1.32, 4.9, 2, 6);
      _be.set(-0.17, ry, 0, 'YXZ'); _bq.setFromEuler(_be);
      /* the blade's inner face is at radius 2.34 (centre 2.55, half-depth 0.21); the reveal sits
         0.04 m PROUD of it, toward the line, so it can never z-fight with the metal it lies on */
      _bp.set(Math.cos(a) * 2.30, 2.55, Math.sin(a) * 2.30);
      _bm.compose(_bp, _bq, _bs); pl.applyMatrix4(_bm);
      revealParts.push(pl);
    }
    {
      const geo = own(mergeGeos(revealParts, ['position']));
      const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3);
      for (let v = 0; v < n; v++) {
        const d = Math.hypot(p.getX(v), p.getZ(v)), y = Math.max(0, p.getY(v) - 0.05);
        const k = (1 / (1 + d * d / 5.2)) * (0.34 + 0.66 * Math.exp(-y / 3.6));
        col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = k;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      revealMesh = new THREE.InstancedMesh(geo, revealMat, N_ASC);
      revealMesh.renderOrder = 5; revealMesh.frustumCulled = false; revealMesh.name = 'ascent-reveals';
      ascentGroup.add(revealMesh);
    }

    /* ---- the floor answer: a spill on the coping, a pool and a camera-aimed streak ------------ */
    const glowGeo = own(lyingQuad());
    const floorMesh = new THREE.InstancedMesh(glowGeo, padGlowMat, N_ASC * 3);
    floorMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    floorMesh.renderOrder = 5; floorMesh.frustumCulled = false; floorMesh.name = 'ascent-floor-light';
    ascentGroup.add(floorMesh);
    /* and the pool laid by the floor's own instrument, which is what makes it dim with the day and
       follow a retheme without this module knowing anything about either */
    if (typeof ctx.lightPool === 'function') ASCENTS.forEach(A => ctx.lightPool({ x: A.x, z: A.z, rx: 26, rz: 26, k: 0.34 }));

    /* ---- the pod ------------------------------------------------------------------------------
       Five parts, five InstancedMeshes of three — one draw call per part however many pods fly, and
       per-pod (and per-part) brightness through instanceColor for free, which is what the departure
       build-up needs and what four separate pod Groups could never have given without four material
       clones each. The shell is LOW-metalness near-white platinum on purpose: its crown cap and its
       emitter face point straight up and straight down, and a mirror grade there would reflect the
       near-black zenith and render a black lid on a white pod. */
    const outline = sqOutline(POD_N, POD_P), seamOutline = sqOutline(SEAM_N, POD_P);
    const hullGeo = own(loftHull(outline, POD_RINGS, { sx: POD_W, sy: POD_H, capTop: true, capBottom: true }));
    const beltGeo = own(loftHull(outline, POD_RINGS, { sx: POD_W, sy: POD_H, grow: 0.018, only: b => b === 4 || b === 5 }));
    const glassGeo = own(loftHull(outline, POD_RINGS, { sx: POD_W, sy: POD_H, grow: 0.008, only: (b, i) => GLASS_BANDS.indexOf(b) >= 0 && GLASS_SEGS.indexOf(i) >= 0 }));
    /* the eight corner seams: one segment of a 48-sample outline is a 0.34 m seam sitting exactly on
       the hull it was lofted from, running keel to crown up all four corners of the diamond */
    const seamGeo = own(loftHull(seamOutline, POD_RINGS, { sx: POD_W, sy: POD_H, grow: 0.020, only: (b, i) => b >= 1 && b <= 8 && (i % (SEAM_N / 4) === 0) }));
    {
      const p = seamGeo.attributes.position, n = p.count, col = new Float32Array(n * 3);
      for (let v = 0; v < n; v++) {
        /* brightest at the belt, softer toward the keel and the crown: the seam is a light in the
           hull's widest joint, not a wireframe drawn round the whole thing */
        const y = p.getY(v) / POD_H, k = 0.42 + 0.58 * Math.exp(-(y * y) / 0.075);
        col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = k;
      }
      seamGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    /* the underside field: the square-diamond column of energy the pod stands on where it meets the
       line. It is the pod's contact with the track and it spools up long before anything moves. */
    const fieldGeo = own(column(profile(7, v => 1.0 - 0.72 * Math.pow(v, 0.75)), 8, v => 1.25 * Math.pow(1 - v, 1.5)));
    const shellMesh = new THREE.InstancedMesh(hullGeo, podShellMat, N_ASC);
    const beltMesh = new THREE.InstancedMesh(beltGeo, podBeltMat, N_ASC);
    const glassMesh = new THREE.InstancedMesh(glassGeo, podGlassMat, N_ASC);
    const seamMesh = new THREE.InstancedMesh(seamGeo, podSeamMat, N_ASC);
    const fieldMesh2 = new THREE.InstancedMesh(fieldGeo, podFieldMat, N_ASC);
    shellMesh.castShadow = true;
    seamMesh.renderOrder = 7; fieldMesh2.renderOrder = 6; glassMesh.renderOrder = 3;
    [shellMesh, beltMesh, glassMesh, seamMesh, fieldMesh2].forEach(m => {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; ascentGroup.add(m);
    });
    shellMesh.name = 'ascent-pod-shell'; beltMesh.name = 'ascent-pod-belt'; glassMesh.name = 'ascent-pod-glass';
    seamMesh.name = 'ascent-pod-seams'; fieldMesh2.name = 'ascent-pod-field';

    /* ---- per-line state, allocated ONCE ------------------------------------------------------ */
    ASCENTS.forEach(A => ascent.lines.push({ id: A.id, x: A.x, z: A.z, h: A.h, pod: A.pod, phase: A.phase,
      charge: 0, burst: 0, podOn: 0, podY: DOCK_Y, field: 3.2 }));
    ascent.meshes = { core: coreMesh, band: bandMesh, sheath: sheathMesh, floor: floorMesh, reveal: revealMesh,
      shell: shellMesh, belt: beltMesh, glass: glassMesh, seam: seamMesh, field: fieldMesh2 };
    ascent.tex = bandTex;
    ascent.mats = { core: beamCoreMat, band: beamBandMat, sheath: beamSheathMat, reveal: revealMat, emitter: emitterMat, floor: padGlowMat, seam: podSeamMat, field: podFieldMat };
    ascent.base = { core: 0.60, band: 0.46, sheath: 0.115, reveal: 0.50, emitter: 0.88, floor: 0.52, seam: 0.85, field: 0.72 };

    /* the columns never move, so their matrices are written ONCE here; only their COLOUR is animated */
    const _im = new THREE.Matrix4(), _ip = new THREE.Vector3(), _iq = new THREE.Quaternion(), _is = new THREE.Vector3();
    ascent.lines.forEach((L, i) => {
      _iq.identity();
      _ip.set(L.x, BEAM_Y, L.z); _is.set(1, L.h, 1); _im.compose(_ip, _iq, _is);
      coreMesh.setMatrixAt(i, _im); bandMesh.setMatrixAt(i, _im); sheathMesh.setMatrixAt(i, _im);
      _ip.set(L.x, PAD_TOP, L.z); _is.set(1, 1, 1); _im.compose(_ip, _iq, _is); revealMesh.setMatrixAt(i, _im);
    });
    coreMesh.instanceMatrix.needsUpdate = bandMesh.instanceMatrix.needsUpdate = sheathMesh.instanceMatrix.needsUpdate = true;
    revealMesh.instanceMatrix.needsUpdate = true;
    [coreMesh, bandMesh, sheathMesh, revealMesh, floorMesh, shellMesh, beltMesh, glassMesh, seamMesh, fieldMesh2]
      .forEach(m => { for (let i = 0; i < m.count; i++) m.setColorAt(i, grey); m.instanceColor.needsUpdate = true; });
  }

  if (scene && !group.parent) scene.add(group);

  /* ---- animation ------------------------------------------------------------------------- */
  let dim = 1;                       /* time-of-day multiplier: 1 at night, 0.3 by day */
  let lastT = -1, driven = false, selfT = 0;
  const base = { rail: 0.5, field: 0.1, packet: 0.9, light: 0.5, arrive: 0.6 };
  const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _view = new THREE.Vector3();
  const _nrm = new THREE.Vector3(), _bin = new THREE.Vector3(), _mat = new THREE.Matrix4(), _camPos = new THREE.Vector3(0.6, 3, 42);
  const state = { pos: new Float32Array(N * 3), tan: new Float32Array(N * 3) };

  function sampleAt(r, s, outP, outT) {
    const u = clamp01(s / r.len) * SEG, i0 = Math.min(SEG - 1, Math.floor(u)), f = u - i0, a = i0 * 3, b = a + 3;
    outP.set(r.px[a] + (r.px[b] - r.px[a]) * f, r.px[a + 1] + (r.px[b + 1] - r.px[a + 1]) * f, r.px[a + 2] + (r.px[b + 2] - r.px[a + 2]) * f);
    outT.set(r.tx[a] + (r.tx[b] - r.tx[a]) * f, r.tx[a + 1] + (r.tx[b + 1] - r.tx[a + 1]) * f, r.tx[a + 2] + (r.tx[b + 2] - r.tx[a + 2]) * f).normalize();
  }

  /* advance the packets and the receivers; no allocation, no geometry touched */
  function step(t, dt) {
    if (t === lastT) return;                 /* the module is safe to drive twice in one frame */
    lastT = t;
    dt = dt > 0 ? Math.min(dt, 0.1) : 0.016;
    for (let i = 0; i < N; i++) {
      const pk = packets[i], r = routes[pk.r];
      pk.s += pk.speed * dt;
      if (pk.s >= r.len) {                   /* transfer: the destination brightens, the origin sends again */
        pk.s -= r.len;
        if (r.to != null && nodeList[r.to]) nodeList[r.to].flash = 1;
        if (r.from != null && nodeList[r.from]) nodeList[r.from].flash = Math.max(nodeList[r.from].flash, 0.55);
      }
      sampleAt(r, pk.s, _p, _t);
      state.pos[i * 3] = _p.x; state.pos[i * 3 + 1] = _p.y; state.pos[i * 3 + 2] = _p.z;
      state.tan[i * 3] = _t.x; state.tan[i * 3 + 1] = _t.y; state.tan[i * 3 + 2] = _t.z;
      /* enter → travel → transfer: brightness rises through the middle and fades at both ends */
      const u = pk.s / r.len;
      pk.b = pk.gain * (0.5 + 0.5 * Math.sin(Math.PI * u)) * smoothstep(0, 0.09, u) * smoothstep(0, 0.09, 1 - u);
      packetMesh.instanceColor.setXYZ(i, pk.b, pk.b, pk.b);
      const lb = pk.b * 0.85;
      lightMesh.instanceColor.setXYZ(i, lb, lb, lb);
    }
    packetMesh.instanceColor.needsUpdate = true; lightMesh.instanceColor.needsUpdate = true;
    /* receivers: a brief local brightening (~0.4 s), never an explosion */
    let any = false;
    for (let i = 0; i < nodeList.length; i++) {
      const n = nodeList[i];
      if (n.flash > 0) { n.flash = Math.max(0, n.flash - dt / 0.42); any = true; }
      const v = n.flash * n.flash * 0.9 + 0.06;
      arriveMesh.instanceColor.setXYZ(i, v, v, v);
    }
    if (any || arriveMesh.instanceColor.version === 0) arriveMesh.instanceColor.needsUpdate = true;
    /* the flows breathe, very slowly and out of phase with each other */
    for (let i = 0; i < flowMeshes.length; i++) {
      const m = flowMeshes[i];
      m.material.opacity = m.userData.base * dim * (0.82 + 0.18 * Math.sin(t * m.userData.drift + m.userData.phase));
    }
  }

  /* orient every packet: the long axis follows the path, the roll is billboarded so the
     diamond never reads as an edge-on sliver. Done at render time, where the camera is known. */
  function orient(camera) {
    if (camera && camera.isCamera) _camPos.setFromMatrixPosition(camera.matrixWorld);
    for (let i = 0; i < N; i++) {
      const pk = packets[i], a = i * 3;
      _p.set(state.pos[a], state.pos[a + 1], state.pos[a + 2]);
      _t.set(state.tan[a], state.tan[a + 1], state.tan[a + 2]);
      _view.subVectors(_p, _camPos).normalize();
      const d = _view.dot(_t);
      _nrm.copy(_view).addScaledVector(_t, -d);
      if (_nrm.lengthSq() < 1e-5) { _nrm.set(0, 1, 0).addScaledVector(_t, -_t.y); if (_nrm.lengthSq() < 1e-5) _nrm.set(0, 0, 1); }
      _nrm.normalize().negate();                       /* the diamond's plane faces the camera */
      _bin.crossVectors(_nrm, _t).normalize();
      const s = pk.size;
      _mat.set(
        _t.x * s * 1.18, _bin.x * s, _nrm.x * s * 0.26, _p.x,
        _t.y * s * 1.18, _bin.y * s, _nrm.y * s * 0.26, _p.y,
        _t.z * s * 1.18, _bin.z * s, _nrm.z * s * 0.26, _p.z,
        0, 0, 0, 1
      );
      packetMesh.setMatrixAt(i, _mat);
      const L = s * 5.4, W = s * 2.3;                  /* the travelling light: an elongated ellipse on the path */
      _mat.set(
        _t.x * L, _bin.x * W, _nrm.x, _p.x,
        _t.y * L, _bin.y * W, _nrm.y, _p.y,
        _t.z * L, _bin.z * W, _nrm.z, _p.z,
        0, 0, 0, 1
      );
      lightMesh.setMatrixAt(i, _mat);
    }
    packetMesh.instanceMatrix.needsUpdate = true; lightMesh.instanceMatrix.needsUpdate = true;
  }
  /* if the assembly never calls update(), the motion still runs — but only while frames are
     actually drawn, so a reduced-motion session stays still */
  packetMesh.onBeforeRender = function (renderer, sc, camera) {
    if (!driven) { const now = performance.now() / 1000; const d = selfT ? now - selfT : 0.016; selfT = now; step(now, d); }
    orient(camera);
  };

  /* ---- contract surface ------------------------------------------------------------------ */
  function setTime(clockState) {
    const day = clockState && typeof clockState.daylight === 'number' ? clamp01(clockState.daylight) : 0;
    dim = 1 - 0.7 * day;                               /* full at night, ×0.3 by day */
    railMat.opacity = base.rail * dim;
    fieldMat.opacity = base.field * dim;
    packetMat.opacity = base.packet * dim;
    lightMat.opacity = base.light * dim;
    arriveMat.opacity = base.arrive * dim;
    flowMeshes.forEach(m => { m.material.opacity = m.userData.base * dim; });
    return dim;
  }
  function setTheme(t) {
    if (!t) return t;
    /* the world Theme owns beam colour — and only beam colour; it never reaches a resident */
    railMat.color.setHex(t.energyLight); packetMat.color.setHex(t.energyLight); arriveMat.color.setHex(t.energyLight);
    fieldMat.color.setHex(t.energy); lightMat.color.setHex(t.energy);
    flowMeshes.forEach(m => m.material.color.setHex(t.energy));
    return t;
  }
  function update(t, dt) { driven = true; step(t, dt); }

  function dispose() {
    retired.forEach(o => { o.visible = true; }); retired.length = 0;
    const i = (ctx.timeHooks || []).indexOf(timeHook); if (i > -1) ctx.timeHooks.splice(i, 1);
    packetMesh.onBeforeRender = function () {};
    if (group.parent) group.parent.remove(group);
    packetMesh.dispose(); lightMesh.dispose(); headMesh.dispose(); arriveMesh.dispose();
    owned.geometries.forEach(g => g.dispose());
    owned.materials.forEach(m => m.dispose());
    owned.textures.forEach(t => t.dispose());
  }

  /* time is the one thing the world may change without knowing about us */
  const timeHook = s => setTime(s);
  if (ctx.timeHooks && ctx.timeHooks.push) ctx.timeHooks.push(timeHook);
  try { setTime(ctx.clock && ctx.clock.state ? ctx.clock.state() : { daylight: 0 }); } catch (e) { setTime({ daylight: 0 }); }
  setTheme(theme);
  step(0, 0.016); orient(null);

  const tierCount = t => routes.filter(r => r.tier === t).length;
  const stats = {
    routes: routes.filter(r => r.from != null).map(r => ({ id: r.id, tier: r.tier, from: nodeList[r.from].id, to: nodeList[r.to].id, length: Math.round(r.len), speed: r.speed, packets: r.count })),
    tiers: { near: tierCount('near'), mid: tierCount('mid'), far: tierCount('far') },
    routeCount: routes.length,
    packets: N,
    receivers: nodeList.length,
    flows: flowMeshes.length,
    drawCalls: 2 + 2 + 3 + flowMeshes.length,          /* rail, field | packets, lights | receivers ×3 | flows */
    triangles: routes.reduce((n, r) => { const T = TIER[r.tier]; return n + T.ts * T.rs * 2 + T.fts * T.frs * 2; }, 0) + N * 10 + nodeList.length * 90 + flowMeshes.length * 120,
    legacyHidden: retired.length
  };
  return { group, setTime, setTheme, update, dispose, stats, routes: stats.routes };
}
