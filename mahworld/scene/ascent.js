/* MAHWORLD :: UPPER REALM — THE ASCENT VEHICLES, THEIR LAUNCH AND THEIR ARRIVAL

   These pods are the ONLY normal way into this realm, so they carry more of the brief's drama than
   anything else that moves here. A resident does not walk up to the sky: a square-diamond pod stands
   on a pad, its seams light one after another, the cloud under it flinches, and then it is gone
   straight up at a speed nothing else in MAHWORLD approaches (§08, §10, §50).

   WHAT THIS MODULE OWNS
     1  THE POD        one hull, built once, instanced across every pad — a broad square-diamond in
                       BOTH plan and elevation, near-white platinum, a mirror belt catch, faceted
                       diamond glazing over the upper hull, eight corner seams carrying the Theme's
                       energy, a square-diamond MAHGIC field under the base, and the canonical mark
                       small on two flanks.
     2  THE SEQUENCE   PREPARING → READY → LAUNCH → AFTER, plus arrival from below and the §37
                       downward departure, all from ONE deterministic schedule.
     3  THE EFFECTS    flash, pressure ring, plume column, cloud channel, pad wash and distant
                       traffic streaks. Every one is a fixed preallocated slot reused every cycle;
                       nothing is allocated per launch and nothing is allocated per frame.
     4  THE CLOUD      it calls ctx.disturb() on ignition, on the blast, while spooling and on
                       arrival. It never draws cloud itself — the terrain module owns that (§31).

   WHAT "EXPLODE WHEN READY TO GO" MEANS HERE (§10). It is a LAUNCH BURST OF POWER, not a destruction
   event. There is no fireball, no debris, no damage: one brief high-energy flash, a pressure
   expansion ring running out across the cloud, a vertical plume, and then extreme vertical
   acceleration out of frame. The pod is intact the whole way and comes back next cycle. Downward
   departure is the same energy in reverse — the glow builds identically and the pod drops through a
   cloud opening just as fast (§37).

   THE TWO CONTRACT LAWS, and how this file keeps them
     · NOTHING ASSUMES y = 0. Every pad top comes from ctx.pads (the structures module's real pads)
       or, when that is absent, from ctx.cloudTopAt()/deckHeight() plus a nominal pad deck. The pad
       wash disc samples the rolling cloud surface per vertex and zeroes its own alpha over anything
       that is not deckSolid(); the far traffic streaks are declared FLOATING and say so.
     · NO ATMOSPHERIC COLOUR IS INVENTED HERE. The pad wash and the vapour channel take their colour
       from layout.fillFor() at the pad's OWN bearing, so a launch on the sunset flank throws warm
       light onto warm cloud and the identical launch on the cold side throws violet (§41, §48). Only
       the ENERGY — seams, field, plume, flash, ring, streak — belongs to the world Theme, and
       setTheme() touches nothing else: not the shell, not the glazing, not the vapour.

   WHY IT IS INSTANCED AND NOT FOUR GROUPS. Four pods each carrying six meshes is 24 draw calls and
   24 materials before a single effect exists, and per-pod brightness would then need per-pod material
   clones. One InstancedMesh per PART instead gives per-pod — and, for the seams, per-SEAM —
   modulation through instanceColor for free, at one draw call per part however many pods are flying.

   THE METAL LAW. The hull's crown cap and its emitter face point straight up and straight down, so
   the shell is a LOW-metalness near-white platinum that takes diffuse light. A metalness-1.0 cap up
   here would reflect the dim zenith and render as a black lid on a white pod in a white world. The
   mirror grade is used only where it is legal: the belt band, the thruster collar, the crown collar
   and the flank mark, all vertical or tilted faces that reflect the bright horizon.

   COST. Thirteen meshes, every one instanced or pooled; MEASURED in stats, well inside the §45/§46
   budget of 120 draw calls and 90k triangles. */

import * as THREE from '../vendor/three/three.module.min.js';
import * as layout from './sky-layout.js';
import { canvasTexture, fobMark, chamferBox } from './materials.js';

const TAU = Math.PI * 2;
const smooth = layout.smoothstep;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

/* module-level scratch — update() must allocate nothing (§45) */
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
const _c = new THREE.Color();
const _fwd = new THREE.Vector3(0, 0, 1);
const _axisY = new THREE.Vector3(0, 1, 0);
const _one = new THREE.Vector3(1, 1, 1);

/* Read a contract hex the way layout.atmosphere() reads its own stops. sky-terrain.js carries the
   same note and for the same reason: atmosphere() writes with Color.setRGB(), which does NOT decode
   sRGB in r185, so decoding fillFor()'s hex here would make this module's light sit visibly darker
   and more saturated than the sky it belongs to. One convention, one sky. */
function rawHex(h, out) { return out.setRGB(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255); }

/* ============================================================= THE POD, AS PROPORTION AND SCHEDULE */

/* THE SQUARE-DIAMOND, as a superellipse. |x|^p + |z|^p = 1 at p = 1 is a hard diamond with its four
   points on the axes; p = 1.32 keeps the points and the four flat flanks between them but takes the
   raw corner off — the "softly rounded / chamfered corners" §50 asks for, and the discipline the
   whole world is held to. Sixteen samples put a vertex exactly on each of the four corners
   (0, 4, 8, 12) and exactly on each of the four flank centres (2, 6, 10, 14), which is what lets the
   seams, the glazing and the mark be placed by index instead of by search. */
const OUTLINE_N = 16, OUTLINE_P = 1.32;
/* the outline's radius at a flank centre, i.e. 2^(0.5 − 1/p) — needed to sit the mark on the surface */
const FLANK_R = Math.pow(2, 0.5 - 1 / OUTLINE_P);

/* THE HULL SECTION. Broad at the belt and taller above it than below, so the pod reads as a
   square-diamond in elevation as well as in plan, with its widest line low — it sits ON its light
   rather than balancing on a point. Local y runs −0.42 … +0.58: exactly one unit of section. */
const RINGS = [
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
const BELT_RING = 5, CROWN_RING = 9, TOP_RING = 10;
const POD_W = 4.5;                       /* half-width at the belt: a 9 m square-diamond — LARGE */
const POD_H = 7.2;                       /* metres per unit of section height */
const POD_BOTTOM = RINGS[0].y * POD_H;   /* −3.02 m: the emitter face sits below the origin */
const HOVER = 0.42;                      /* the pod never quite touches — it stands on its field */

/* The glazing wraps the upper hull on all four flanks: section bands 6, 7 and 8, two segments either
   side of each flank centre, plus the crown. It is built as a shell 0.6% PROUD of the hull rather
   than as a hole in it, so there is always platinum behind the glass and never a view straight
   through the pod — a canopy sitting on its frame, which is also how a real one is made. */
const GLASS_BANDS = [6, 7, 8];
const GLASS_SEGS = [1, 2, 5, 6, 9, 10, 13, 14];

/* THE SCHEDULE (§09). One deterministic cycle per pad; four pads phase-offset, so at any instant the
   arrival area shows roughly one arriving, one docked, one preparing and one leaving — evidence that
   many vehicles use this place, without the sky becoming a firework display. With four pads on a
   112 s cycle a launch happens somewhere about every 28 seconds: rhythmic, not constant. */
const CYCLE = 112;
const U_ARRIVE = 0.090, U_DOCK = 0.180, U_PREP = 0.440, U_READY = 0.680, U_LAUNCH = 0.740, U_OUT = 0.760, U_AFTER = 0.900;
const LAUNCH_T = (U_OUT - U_LAUNCH) * CYCLE;       /* 2.24 s of visible burst */
const LAUNCH_S = 760;                              /* metres covered inside that burst */
const LAUNCH_POW = 2.9;
const LAUNCH_V = LAUNCH_POW * LAUNCH_S / LAUNCH_T; /* ~984 m/s as it leaves frame */
const ARRIVE_DEPTH = 900;                          /* it comes up from the world below, hard (§08) */

/* The four pads and their phase at t = 0, chosen so a capture taken at t = 0 shows each pad in the
   state layout.SITES already names it — padA arriving, padB docked, padC preparing, padD launching —
   rather than in whatever state the modulo happened to land on. Two pads leave upward and two drop
   downward, so a player standing on the apron sees both departures without waiting a whole cycle. */
const PADS = [
  { name: 'padA', offset: 0.135, up: true },    /* mid-ARRIVING at t = 0 */
  { name: 'padB', offset: 0.310, up: false },   /* DOCKED — departs downward (§37) */
  { name: 'padC', offset: 0.560, up: false },   /* PREPARING — departs downward */
  /* 0.7424 is 12% into the 2.24 s burst: at t = 0 padD is on the flash beat itself — the pod still
     essentially on the pad, the ring 28 m out and the beam 153 m long — rather than 95 m up and
     already a dot, which is where the obvious 0.750 put it. A capture is a still frame; this is the
     frame §10 describes. */
  { name: 'padD', offset: 0.7424, up: true }    /* LAUNCHING upward at t = 0 */
];

/* The cloud responses this module asks the terrain module for, as phase thresholds crossed once per
   cycle: the arrival punching up through the deck, the touchdown, four spool-up presses that make
   the cloud visibly react BEFORE anything happens (§10 PREPARING), and the two-stage ignition. */
const EVENT_U = [0.1550, 0.1790, 0.6000, 0.6550, 0.7000, 0.7250, 0.7420, 0.7520];
const EVENT_R = [40, 26, 16, 18, 20, 22, 48, 78];
const EVENT_S = [0.80, 0.50, 0.20, 0.24, 0.28, 0.32, 1.00, 0.70];

/* Distant traffic (§09): a vertical light streak far out, derived PURELY from t so a capture is
   reproducible with no spawn state at all. One every 26 s, alight for 5.5 s — about a fifth of the
   time there is one somewhere, which is "occasional" and not a firework display. */
const STREAK_PERIOD = 26, STREAK_LIFE = 5.5, STREAK_SLOTS = 3;

/* ================================================================================ small geometry */

/* The unit square-diamond outline in XZ, as a flat array so nothing downstream allocates. */
function diamondOutline(n, p) {
  const o = new Float32Array(n * 2);
  const e = 2 / p;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const ca = Math.cos(a), sa = Math.sin(a);
    o[i * 2] = Math.sign(ca) * Math.pow(Math.abs(ca), e);
    o[i * 2 + 1] = Math.sign(sa) * Math.pow(Math.abs(sa), e);
  }
  return o;
}

/* Loft an outline through a stack of rings. The winding is derived rather than guessed: for an
   outline running anticlockwise in XZ and rings running upward, (a, c, b) / (a, d, c) is the pair
   whose face normal points radially OUTWARD, and the smoke test checks that on the built mesh. */
function loft(outline, rings, opts) {
  const o = opts || {};
  const n = outline.length / 2, m = rings.length;
  const sx = o.sx == null ? 1 : o.sx, sy = o.sy == null ? 1 : o.sy;
  const only = o.only || null;                       /* (band, seg) => keep only these cells */
  const grow = o.grow == null ? 0 : o.grow;          /* radial offset, in outline units */
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
  if (o.capBottom) {
    const ci = pos.length / 3; pos.push(0, rings[0].y * sy, 0);
    for (let i = 0; i < n; i++) idx.push(ci, i, (i + 1) % n);                    /* fan facing −Y */
  }
  if (o.capTop) {
    const top = (m - 1) * n, ci = pos.length / 3; pos.push(0, rings[m - 1].y * sy, 0);
    for (let i = 0; i < n; i++) idx.push(ci, top + ((i + 1) % n), top + i);       /* fan facing +Y */
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* Minimal position+normal merge. BufferGeometryUtils is an addon and this world vendors nothing but
   three's core, so concatenating a handful of indexed geometries by hand is the whole job. */
function mergeGeo(list) {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, vo * 3);
    nrm.set(g.attributes.normal.array, vo * 3);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += g.attributes.position.count; io += gi.length;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

/* A vertical column: an open square-diamond cone ONE UNIT TALL, bright at y = 0 and fading to
   nothing at y = 1, with the fade baked into vertex colour so one instance matrix can stretch it to
   any length without stretching the fade. Shared by the propulsion field, the launch plume and the
   vapour channel — the same form at three scales, which is also why they read as one system. */
function columnGeometry(n, r0, r1, rings, capMuzzle) {
  const o = diamondOutline(n, 1.5);
  const verts = n * rings + (capMuzzle ? 1 : 0);
  const pos = new Float32Array(verts * 3), col = new Float32Array(verts * 4);
  const idx = [];
  for (let r = 0; r < rings; r++) {
    const f = r / (rings - 1);
    const rad = r0 + (r1 - r0) * f;
    const a = (1 - f) * (1 - f);
    for (let i = 0; i < n; i++) {
      const v = (r * n + i) * 3, cv = (r * n + i) * 4;
      pos[v] = o[i * 2] * rad; pos[v + 1] = f; pos[v + 2] = o[i * 2 + 1] * rad;
      col[cv] = col[cv + 1] = col[cv + 2] = 1; col[cv + 3] = a;
    }
  }
  for (let r = 0; r < rings - 1; r++) for (let i = 0; i < n; i++) {
    const a = r * n + i, b = r * n + ((i + 1) % n), c = (r + 1) * n + ((i + 1) % n), d = (r + 1) * n + i;
    idx.push(a, c, b, a, d, c);
  }
  if (capMuzzle) {
    const ci = n * rings;
    col[ci * 4] = col[ci * 4 + 1] = col[ci * 4 + 2] = 1; col[ci * 4 + 3] = 1;
    for (let i = 0; i < n; i++) idx.push(ci, i, (i + 1) % n);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), Math.max(1.5, r1 * 2));
  return g;
}

/* The pressure expansion ring: a band of unit outer radius that RISES slightly as it goes out, so an
   80 m ring running across a cloud floor that rolls does not saw through it. Alpha 0 at the inner
   rim, 1 through the band, 0 at the outer rim, so it reads as a shock front and not as a disc. */
function ringGeometry(segs) {
  const R = [0.55, 0.80, 1.0], A = [0, 1, 0], LIFT = [0, 0.045, 0.11];
  const pos = new Float32Array(segs * 3 * 3), col = new Float32Array(segs * 3 * 4);
  const idx = [];
  for (let r = 0; r < 3; r++) for (let i = 0; i < segs; i++) {
    const a = (i / segs) * TAU, v = (r * segs + i) * 3, cv = (r * segs + i) * 4;
    pos[v] = Math.cos(a) * R[r]; pos[v + 1] = LIFT[r]; pos[v + 2] = Math.sin(a) * R[r];
    col[cv] = col[cv + 1] = col[cv + 2] = 1; col[cv + 3] = A[r];
  }
  for (let r = 0; r < 2; r++) for (let i = 0; i < segs; i++) {
    const a = r * segs + i, b = r * segs + ((i + 1) % segs);
    const c = (r + 1) * segs + ((i + 1) % segs), d = (r + 1) * segs + i;
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.2);
  return g;
}

function quadGeometry(anchorBottom) {
  const y0 = anchorBottom ? 0 : -0.5, y1 = anchorBottom ? 1 : 0.5;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, y0, 0, 0.5, y0, 0, 0.5, y1, 0, -0.5, y1, 0]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.2);
  return g;
}

/* deterministic hash for the distant traffic, so streak n is the same streak in every capture */
function hash01(n, salt) {
  let s = (Math.imul(n | 0, 2654435761) + Math.imul(salt | 0, 40503)) >>> 0;
  s ^= s >>> 15; s = Math.imul(s, 2246822507) >>> 0; s ^= s >>> 13;
  return (s >>> 0) / 4294967296;
}

/* ==================================================================================== the module */

export function buildAscent(ctx) {
  const M = (ctx && ctx.M) || {};
  const scene = ctx && ctx.scene;
  const group = new THREE.Group(); group.name = 'ascent';

  const geometries = [], materials = [], textures = [];
  const own = { g: g => { geometries.push(g); return g; }, m: m => { materials.push(m); return m; }, t: t => { textures.push(t); return t; } };

  let tier = typeof ctx?.quality === 'string' ? ctx.quality : (ctx?.quality?.name || 'high');
  if (!layout.QUALITY[tier]) tier = 'high';

  const cloudTopAt = (ctx && typeof ctx.cloudTopAt === 'function') ? ctx.cloudTopAt : layout.deckHeight;
  const disturb = (ctx && typeof ctx.disturb === 'function') ? ctx.disturb : null;
  let theme = (ctx && ctx.theme) || { name: 'canonical', energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 };

  let band = 'dusk', daylight = 0.25;
  let energyK = 1;                    /* how hard the energy reads in this band */
  let beamK = 1, mistK = 1;           /* quality scalars taken from layout.QUALITY */

  /* ------------------------------------------------------------------------------------- pads */
  /* THE PADS ARE THE STRUCTURES MODULE'S, not this one's. ctx.pads is read defensively because it is
     built by a sibling: it may be an array or a map, may name entries id/name/pad, and may give the
     standing surface as top/deckY/deckHeight/surfaceY or inside a position. When it is absent the
     layout's own SITES are the fallback and the pad deck is assumed to be a low platform over the
     REAL cloud surface — never over y = 0 (contract law 1). */
  const FALLBACK_PAD_DECK = 2.6;
  function readPad(name, index) {
    const raw = ctx && ctx.pads;
    let e = null;
    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i++) { const p = raw[i]; if (p && (p.name === name || p.id === name || p.pad === name)) { e = p; break; } }
      if (!e && raw[index]) e = raw[index];
    } else if (raw && typeof raw === 'object') e = raw[name] || null;

    const site = layout.siteAt(name);
    let x = site.x, z = site.z, top = null, real = false;
    if (e) {
      const p = e.position || e;
      const ex = Number(p.x), ez = Number(p.z);
      if (Number.isFinite(ex) && Number.isFinite(ez)) { x = ex; z = ez; real = true; }
      const cand = [e.top, e.deckY, e.deckHeight, e.surfaceY, p.y];
      for (let i = 0; i < cand.length; i++) { const v = Number(cand[i]); if (Number.isFinite(v)) { top = v; real = true; break; } }
    }
    if (top == null) top = cloudTopAt(x, z) + FALLBACK_PAD_DECK;
    return { x, z, top, real };
  }

  const staging = layout.siteAt('staging');
  const pods = [];
  for (let i = 0; i < PADS.length; i++) {
    const cfg = PADS[i];
    const p = readPad(cfg.name, i);
    const R = layout.rng('ascent:' + cfg.name);
    /* Turned so the flank carrying the mark faces the staging apron, which is where the player
       actually stands. For a flank at pod-local bearing φ, world bearing = φ − yaw (see dir()). */
    const toStaging = layout.bearingOf(staging.x - p.x, staging.z - p.z);
    const pod = {
      index: i, cfg, name: cfg.name, x: p.x, z: p.z, top: p.top, realPad: p.real, up: cfg.up,
      bearing: layout.bearingOf(p.x, p.z),
      yaw: Math.PI / 4 - toStaging + (R() - 0.5) * 0.10,   /* a little scatter: four pods, not one copied */
      solid: layout.deckSolid(p.x, p.z),
      quat: new THREE.Quaternion(),
      bob: R() * TAU, lastU: -1,
      /* per-frame outputs, written in place — update() never allocates */
      state: 'empty', u: 0, y: 0, dy: 0, visible: false,
      glow: 0, field: 0, wash: 0, seam: new Float32Array(8),
      flashI: 0, flashS: 14, flashY: 0,
      ring0R: 1, ring0A: 0, ring1R: 1, ring1A: 0,
      plumeY: 0, plumeL: 0, plumeI: 0, plumeDown: true,
      chanL: 0, chanI: 0,
      fill: new THREE.Color(1, 1, 1)
    };
    pod.quat.setFromAxisAngle(_axisY, pod.yaw);
    pods.push(pod);
  }
  const N = pods.length;

  /* ------------------------------------------------------------------------------ pod geometry */
  const OUT = diamondOutline(OUTLINE_N, OUTLINE_P);

  /* THE SHELL. One hull, in METRES: the belt half-width and the section height are baked in, so a
     pod's instance matrix carries position and yaw only, and the seam bars below can be built in the
     same space without a non-uniform scale distorting their cross-section. */
  const shellGeo = own.g(loft(OUT, RINGS, { sx: POD_W, sy: POD_H, capBottom: true, capTop: true }));
  shellGeo.computeBoundingSphere();

  /* THE NEAR-WHITE PLATINUM SHELL — the pod's dominant material (§50), and the one surface in this
     module not taken straight from M. The world's platinum grades are architectural values authored
     against a night city; up here the pod must sit BRIGHTER than an ocean of lit cloud or it reads as
     a dark object on white, which is the exact opposite of what the brief asks. Metalness stays low
     because the crown cap and the emitter face are horizontal — see the metal law in the header. */
  const shellMat = own.m(new THREE.MeshStandardMaterial({ color: 0xdde5f1, roughness: 0.19, metalness: 0.44, envMapIntensity: 1.75 }));
  shellMat.name = 'ascent-pod-shell';
  const shellMesh = new THREE.InstancedMesh(shellGeo, shellMat, N);
  shellMesh.name = 'ascent-pod-shell';
  shellMesh.castShadow = true;
  shellMesh.frustumCulled = false;
  group.add(shellMesh);

  /* THE CATCHES. Mirror chromium, and legally so: the belt band, the thruster collar and the crown
     collar are all vertical or tilted faces, which reflect the bright horizon rather than the zenith.
     Shared from M so the pod belongs to the same civilisation as everything it lands on. */
  const catchGeo = own.g(mergeGeo([
    loft(OUT, [{ y: -0.030, s: 1.010 }, { y: 0.000, s: 1.024 }, { y: 0.030, s: 1.010 }], { sx: POD_W, sy: POD_H }),
    loft(OUT, [{ y: -0.398, s: 0.455 }, { y: -0.368, s: 0.600 }], { sx: POD_W, sy: POD_H }),
    loft(OUT, [{ y: 0.508, s: 0.408 }, { y: 0.536, s: 0.330 }], { sx: POD_W, sy: POD_H })
  ]));
  const catchMat = M.chromeMirror || own.m(new THREE.MeshStandardMaterial({ color: 0xdfe9f7, roughness: 0.03, metalness: 1, envMapIntensity: 2.7 }));
  const catchMesh = new THREE.InstancedMesh(catchGeo, catchMat, N);
  catchMesh.name = 'ascent-pod-catch';
  catchMesh.frustumCulled = false;
  group.add(catchMesh);

  /* THE GLAZING — the upper hull's own facets, lifted proud and FLAT-SHADED, so each of the
     twenty-six panes catches a different piece of sky. That is what makes it faceted diamond glazing
     rather than a window pasted onto a curve. The tint is a cool MID value, deliberately not the
     city's night glass: over a near-white shell in a bright realm 0x2b3f60 would have punched four
     dark holes in a white pod, while this reads as glass with a cabin behind it. */
  const glassBand = new Set(GLASS_BANDS), glassSeg = new Set(GLASS_SEGS);
  const glassGeo = own.g(mergeGeo([
    loft(OUT, RINGS, { sx: POD_W, sy: POD_H, grow: 0.006, only: (b, i) => glassBand.has(b) && glassSeg.has(i) }),
    loft(OUT, [RINGS[CROWN_RING], RINGS[TOP_RING]], { sx: POD_W, sy: POD_H, grow: 0.006, capTop: true })
  ]));
  const glassMat = own.m(new THREE.MeshPhysicalMaterial({
    color: 0x5d7a9e, roughness: 0.05, metalness: 0.14, transparent: true, opacity: 0.7,
    side: THREE.DoubleSide, flatShading: true, envMapIntensity: 2.4
  }));
  glassMat.name = 'ascent-pod-glass';
  const glassMesh = new THREE.InstancedMesh(glassGeo, glassMat, N);
  glassMesh.name = 'ascent-pod-glass';
  glassMesh.frustumCulled = false;
  group.add(glassMesh);

  /* THE SEAMS (§10 PREPARING). Eight bars along the diamond's four corner edges — four below the
     belt, four above — so "the diamond seams illuminate one after another" is a ring of light
     CLIMBING the pod rather than a strip fading up. Each is its own instance, so each has its own
     brightness through instanceColor, at one draw call for all eight on all four pods. */
  const SEAMS = 8;
  const seamLocal = [];
  {
    const grow = 0.014;
    for (let k = 0; k < SEAMS; k++) {
      const corner = (k % 4) * 4;                       /* outline indices 0, 4, 8, 12 = the points */
      const rA = k < 4 ? 1 : BELT_RING, rB = k < 4 ? BELT_RING : CROWN_RING;
      const ax = OUT[corner * 2], az = OUT[corner * 2 + 1];
      _v.set(ax * (RINGS[rA].s + grow) * POD_W, RINGS[rA].y * POD_H, az * (RINGS[rA].s + grow) * POD_W);
      _v2.set(ax * (RINGS[rB].s + grow) * POD_W, RINGS[rB].y * POD_H, az * (RINGS[rB].s + grow) * POD_W);
      _v3.subVectors(_v2, _v);
      const len = _v3.length();
      _v3.multiplyScalar(1 / len);
      const q = new THREE.Quaternion().setFromUnitVectors(_fwd, _v3);
      const mid = new THREE.Vector3().addVectors(_v, _v2).multiplyScalar(0.5);
      const mtx = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, len));
      seamLocal.push(mtx);
    }
  }
  /* every box in this world is chamfered — a seam bar included */
  const seamGeo = own.g(chamferBox(0.17, 0.11, 1, 0.030));
  const seamGlowGeo = own.g(chamferBox(0.40, 0.30, 1, 0.075));
  const seamMat = own.m(new THREE.MeshBasicMaterial({ color: theme.energyLight, toneMapped: true }));
  seamMat.name = 'ascent-seam';
  const seamGlowMat = own.m(new THREE.MeshBasicMaterial({ color: theme.energy, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  seamGlowMat.name = 'ascent-seam-glow';
  const seamMesh = new THREE.InstancedMesh(seamGeo, seamMat, N * SEAMS);
  seamMesh.name = 'ascent-seam'; seamMesh.frustumCulled = false;
  const seamGlowMesh = new THREE.InstancedMesh(seamGlowGeo, seamGlowMat, N * SEAMS);
  seamGlowMesh.name = 'ascent-seam-glow'; seamGlowMesh.frustumCulled = false; seamGlowMesh.renderOrder = 11;
  group.add(seamMesh, seamGlowMesh);

  /* THE CANONICAL MARK (§08), on two opposite flanks, small and restrained: the diamond is 0.42 m on
     a flank six metres across, so the whole mark spans 1.29 m — a plate on a vehicle, not livery.
     Satin chromium, because a flank is a vertical face and the mirror family is legal there, and
     because the mark should be METAL that catches the sky rather than another light source. */
  const MARK_PHI = [Math.PI / 4, -Math.PI * 0.75];
  const markLocal = [];
  {
    const myU = -0.130;                              /* on the broad flank, just below the belt */
    const f = (myU - RINGS[3].y) / (RINGS[4].y - RINGS[3].y);
    const s = RINGS[3].s + (RINGS[4].s - RINGS[3].s) * f;
    const rad = s * FLANK_R * POD_W + 0.06;
    for (let i = 0; i < MARK_PHI.length; i++) {
      const phi = MARK_PHI[i];
      const q = new THREE.Quaternion().setFromAxisAngle(_axisY, Math.PI - phi);
      const at = new THREE.Vector3(Math.sin(phi) * rad, myU * POD_H, -Math.cos(phi) * rad);
      markLocal.push(new THREE.Matrix4().compose(at, q, new THREE.Vector3(1, 1, 1)));
    }
  }
  const markGeo = own.g(fobMark(0.42, 0.05));
  markGeo.computeBoundingSphere();
  const markMat = M.chromeSatin || own.m(new THREE.MeshStandardMaterial({ color: 0xbecddf, roughness: 0.17, metalness: 1, envMapIntensity: 2.1 }));
  const markMesh = new THREE.InstancedMesh(markGeo, markMat, N * MARK_PHI.length);
  markMesh.name = 'ascent-mark'; markMesh.frustumCulled = false;
  group.add(markMesh);

  /* ------------------------------------------------------------------------------- the effects */
  /* THE UNDERSIDE FIELD (§08, §50). A square-diamond of MAHGIC under the emitter face — the same
     outline as the hull, so the pod's light is the pod's own shape. It is the one thing alight on a
     docked pod, and it is what the pod visibly stands on. */
  const fieldGeo = own.g(columnGeometry(OUTLINE_N, 1.05, 2.35, 4, true));
  const fieldMat = own.m(new THREE.MeshBasicMaterial({
    color: theme.energy, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
  }));
  fieldMat.name = 'ascent-field';
  const fieldMesh = new THREE.InstancedMesh(fieldGeo, fieldMat, N);
  fieldMesh.name = 'ascent-field'; fieldMesh.frustumCulled = false; fieldMesh.renderOrder = 12;
  group.add(fieldMesh);

  /* THE PLUME and THE CHANNEL share one geometry: the launch beam is energy and the channel is the
     hole it tore in the cloud, and they are the same column at two scales. That is deliberate — the
     vapour then reads as displaced BY the beam rather than as a second unrelated effect. */
  const columnGeo = own.g(columnGeometry(OUTLINE_N, 1.0, 2.4, 5, false));
  const plumeMat = own.m(new THREE.MeshBasicMaterial({
    color: theme.energyLight, vertexColors: true, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
  }));
  plumeMat.name = 'ascent-plume';
  const plumeMesh = new THREE.InstancedMesh(columnGeo, plumeMat, N);
  plumeMesh.name = 'ascent-plume'; plumeMesh.frustumCulled = false; plumeMesh.renderOrder = 13;
  /* THE VAPOUR CHANNEL IS NOT ENERGY — it is cloud, so it is coloured from fillFor() at the pad's own
     bearing and the world Theme never touches it (§31, §48). Normal transparency, not additive:
     displaced vapour occludes, it does not glow. */
  const channelMat = own.m(new THREE.MeshBasicMaterial({
    color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.55,
    depthWrite: false, side: THREE.DoubleSide, fog: false
  }));
  channelMat.name = 'ascent-channel';
  const channelMesh = new THREE.InstancedMesh(columnGeo, channelMat, N);
  channelMesh.name = 'ascent-channel'; channelMesh.frustumCulled = false; channelMesh.renderOrder = 10;
  group.add(channelMesh, plumeMesh);

  /* THE FLASH — one brief high-energy billboard at ignition, and a small one at touchdown. */
  const glowTex = own.t(canvasTexture(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.22, 'rgba(255,255,255,0.72)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.18)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  }));
  const flashGeo = own.g(quadGeometry(false));
  const flashMat = own.m(new THREE.MeshBasicMaterial({
    map: glowTex, color: theme.energyLight, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  }));
  flashMat.name = 'ascent-flash';
  const flashMesh = new THREE.InstancedMesh(flashGeo, flashMat, N);
  flashMesh.name = 'ascent-flash'; flashMesh.frustumCulled = false; flashMesh.renderOrder = 15;
  group.add(flashMesh);

  /* THE PRESSURE RINGS. Two slots per pad: the launch expansion front, and a secondary that carries
     the READY pressure build — a ring CONTRACTING onto the pad, which is what gathering pressure
     looks like from outside — and then the launch's slower second wave. */
  const RINGS_PER_PAD = 2;
  const ringGeo = own.g(ringGeometry(36));
  const ringMat = own.m(new THREE.MeshBasicMaterial({
    color: theme.energy, vertexColors: true, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
  }));
  ringMat.name = 'ascent-ring';
  const ringMesh = new THREE.InstancedMesh(ringGeo, ringMat, N * RINGS_PER_PAD);
  ringMesh.name = 'ascent-ring'; ringMesh.frustumCulled = false; ringMesh.renderOrder = 14;
  group.add(ringMesh);

  /* THE PAD WASH (§31). Not a decal: a disc whose every vertex is sampled from the REAL cloud
     surface, so the light a pod throws onto the cloud follows the deck as it rolls, and whose alpha
     is zeroed wherever the floor is not solid. Its colour is fillFor() at the pad's bearing mixed
     toward the Theme's energy — the sky's own light, brightened by the pod's. */
  const WASH_SEG = 20, WASH_RING = 2, WASH_V = 1 + WASH_SEG * WASH_RING, WASH_R = 30;
  const washPos = new Float32Array(N * WASH_V * 3);
  const washCol = new Float32Array(N * WASH_V * 4);
  const washA = new Float32Array(N * WASH_V);           /* the resting radial profile */
  let washGeo = null, washMesh = null;
  {
    const idx = [];
    for (let p = 0; p < N; p++) {
      const pod = pods[p], o = p * WASH_V;
      washPos[o * 3] = pod.x; washPos[o * 3 + 1] = cloudTopAt(pod.x, pod.z) + 0.55; washPos[o * 3 + 2] = pod.z;
      washA[o] = layout.deckSolid(pod.x, pod.z) ? 1 : 0;
      for (let r = 1; r <= WASH_RING; r++) for (let i = 0; i < WASH_SEG; i++) {
        const f = r / WASH_RING, a = (i / WASH_SEG) * TAU;
        const x = pod.x + Math.cos(a) * WASH_R * f, z = pod.z + Math.sin(a) * WASH_R * f;
        const v = o + 1 + (r - 1) * WASH_SEG + i;
        washPos[v * 3] = x; washPos[v * 3 + 1] = cloudTopAt(x, z) + 0.55; washPos[v * 3 + 2] = z;
        washA[v] = layout.deckSolid(x, z) ? Math.pow(1 - f, 1.8) * (r === WASH_RING ? 0 : 1) : 0;
      }
      const at = (r, i) => o + 1 + (r - 1) * WASH_SEG + (i % WASH_SEG);
      for (let i = 0; i < WASH_SEG; i++) idx.push(o, at(1, i + 1), at(1, i));
      for (let r = 1; r < WASH_RING; r++) for (let i = 0; i < WASH_SEG; i++) {
        idx.push(at(r, i), at(r + 1, i + 1), at(r, i + 1), at(r, i), at(r + 1, i), at(r + 1, i + 1));
      }
    }
    washGeo = own.g(new THREE.BufferGeometry());
    washGeo.setAttribute('position', new THREE.BufferAttribute(washPos, 3));
    washGeo.setAttribute('color', new THREE.BufferAttribute(washCol, 4).setUsage(THREE.DynamicDrawUsage));
    washGeo.setIndex(idx);
    washGeo.computeBoundingSphere();
    const mat = own.m(new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, fog: false
    }));
    mat.name = 'ascent-pad-wash';
    washMesh = new THREE.Mesh(washGeo, mat);
    washMesh.name = 'ascent-pad-wash'; washMesh.renderOrder = 9; washMesh.frustumCulled = false;
    group.add(washMesh);
  }

  /* DISTANT TRAFFIC (§09). A vertical light streak kilometres away — the proof that this arrival area
     is not the only one and that the realm has traffic beyond the frame. It is EXPLICITLY FLOATING:
     it starts well above the cloud sea and never claims to stand on it, which is how contract law 1
     is satisfied out past the deck where there is no floor to ask about. */
  const streakTex = own.t(canvasTexture(16, 128, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.30, 'rgba(255,255,255,0.85)');
    grd.addColorStop(0.72, 'rgba(255,255,255,0.30)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 16, 128);
  }));
  const streakGeo = own.g(quadGeometry(true));
  const streakMat = own.m(new THREE.MeshBasicMaterial({
    map: streakTex, color: theme.energyLight, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  }));
  streakMat.name = 'ascent-streak';
  const streakMesh = new THREE.InstancedMesh(streakGeo, streakMat, STREAK_SLOTS);
  streakMesh.name = 'ascent-streak'; streakMesh.frustumCulled = false; streakMesh.renderOrder = 8;
  group.add(streakMesh);

  /* every instanceColor buffer must exist before the first draw, or three hands the shader zeros */
  _c.setRGB(1, 1, 1);
  for (let i = 0; i < N; i++) { shellMesh.setColorAt(i, _c); fieldMesh.setColorAt(i, _c); plumeMesh.setColorAt(i, _c); channelMesh.setColorAt(i, _c); flashMesh.setColorAt(i, _c); }
  for (let i = 0; i < N * SEAMS; i++) { seamMesh.setColorAt(i, _c); seamGlowMesh.setColorAt(i, _c); }
  for (let i = 0; i < N * RINGS_PER_PAD; i++) ringMesh.setColorAt(i, _c);
  for (let i = 0; i < STREAK_SLOTS; i++) streakMesh.setColorAt(i, _c);
  /* a mesh a tier has switched off stays off; `visible` is only ever the per-frame "is anything in
     this pool alive" gate, so the two never fight each other */
  group.traverse(o => { if (o.isMesh) o.userData.enabled = true; });

  /* ------------------------------------------------------------------------ the queue contract */
  /* The ASCENT QUEUE pylon shows the real thing (§09), so this array is the live truth about the
     pads. It is built once and MUTATED in place; nothing here allocates per frame. */
  const queue = pods.map(p => ({ pad: p.name, state: 'empty', eta: 0, dir: p.up ? 'up' : 'down', progress: 0 }));

  /* ------------------------------------------------------------------------------- the schedule */
  function padPhase(pod, t) { let u = (pod.cfg.offset + t / CYCLE) % 1; if (u < 0) u += 1; return u; }
  function stateOf(u) {
    if (u < U_ARRIVE) return 'empty';
    if (u < U_DOCK) return 'arriving';
    if (u < U_PREP) return 'docked';
    if (u < U_READY) return 'preparing';
    if (u < U_LAUNCH) return 'ready';
    if (u < U_OUT) return 'launch';
    if (u < U_AFTER) return 'outbound';
    return 'after';
  }
  /* did the phase cross th since the last frame, wrap included? */
  function crossed(last, now, th) {
    if (last < 0) return false;
    if (now >= last) return last < th && now >= th;
    return last < th || th <= now;                      /* the cycle wrapped through 1 → 0 */
  }

  /* THE SEQUENCE ITSELF (§10). Everything a pad looks like at phase u, written into the pod object.
     Read this as the storyboard: it is the only place the launch is described. */
  function evaluate(pod, t) {
    const u = padPhase(pod, t);
    const st = stateOf(u);
    pod.u = u; pod.state = st;
    const dirS = pod.up ? 1 : -1;

    let dy = 0, visible = true, glow = 0, field = 0, wash = 0.04;
    let flashI = 0, flashS = 14, flashY = 0;
    let r0R = 1, r0A = 0, r1R = 1, r1A = 0;
    let plumeL = 0, plumeI = 0, plumeDown = true, plumeY = 0;
    /* THE CHANNEL RISES, ALWAYS. It is the DISPLACED VAPOUR, not the hole: whichever way a pod goes
       through the floor the cloud it shoves aside is thrown up, and that is the part a person standing
       on the deck can see. A downward channel would be drawn under an opaque cloud floor and read as
       nothing at all; the depression itself is the terrain module's disturb() bowl, not this. */
    let chanL = 0, chanI = 0;
    const idle = 0.13;                       /* an unlit seam is still a cool line, never black */
    for (let k = 0; k < 8; k++) pod.seam[k] = idle;

    if (st === 'empty' || st === 'after') {
      visible = false;
      if (st === 'after') {
        /* AFTER (§10). The plume has decayed and the cloud is reforming — the terrain module's own
           disturbance does the reforming; all this owes it is light that fades rather than snaps. */
        const af = (u - U_AFTER) / (1 - U_AFTER);
        wash = 0.16 * (1 - af);
        chanI = 0.20 * (1 - af) * (1 - af); chanL = 140;
      }
    } else if (st === 'arriving') {
      /* IT COMES FROM THE WORLD BELOW, hard: 900 m in ten seconds, decelerating the whole way, so it
         punches up through the cloud floor and settles rather than descending onto the pad. */
      const a = (u - U_ARRIVE) / (U_DOCK - U_ARRIVE);
      dy = -ARRIVE_DEPTH * Math.pow(1 - a, 3);
      glow = 0.20;
      field = 0.34 + 0.90 * (1 - a) * (1 - a);           /* retro braking: brightest when fastest */
      wash = 0.10 + 0.55 * smooth((a - 0.55) / 0.45);
      for (let k = 0; k < 8; k++) pod.seam[k] = 0.50 + 0.12 * Math.sin(t * 6 + k);
      /* the braking plume hangs off the POD, not the pad, because that is where the thrust is */
      plumeDown = true; plumeY = dy; plumeL = 84 * (1 - a * 0.7); plumeI = 0.62 * (1 - a) + 0.10;
      /* the channel is the hole it came up through, opening as it nears the surface */
      chanL = 190; chanI = 0.55 * smooth((a - 0.42) / 0.30) * (1 - smooth((a - 0.86) / 0.14));
      const td = 1 - Math.abs(a - 0.955) / 0.045;        /* touchdown flash */
      if (td > 0) { flashI = 0.42 * td; flashS = 16; }
      if (a > 0.90) { const k = (a - 0.90) / 0.10; r0R = 5 + 48 * smooth(k); r0A = 0.75 * smooth(k / 0.25) * (1 - k); }
    } else if (st === 'docked') {
      /* DOCKED: alive but quiet — the field idling and the seams at rest. */
      dy = Math.sin(t * 0.55 + pod.bob) * 0.16;
      glow = 0.04; field = 0.17; wash = 0.07;
    } else if (st === 'preparing') {
      /* PREPARING (§10). The shell brightens, the seams illuminate ONE AFTER ANOTHER from the base
         corners up over the belt to the crown, the field spools up, and from 60% of the way in the
         cloud under the pad starts to react — the EVENT_U thresholds do that part. */
      const p = (u - U_PREP) / (U_READY - U_PREP);
      dy = Math.sin(t * 0.55 + pod.bob) * 0.16 * (1 - p);
      glow = 0.04 + 0.22 * smooth(p);
      field = 0.18 + 0.48 * smooth(p);
      wash = 0.07 + 0.22 * smooth(p);
      for (let k = 0; k < 8; k++) {
        const lit = smooth((p - (0.08 + k * 0.088)) / 0.085);
        pod.seam[k] = idle + (0.92 - idle) * lit;
      }
    } else if (st === 'ready') {
      /* READY (§10). Pressure visibly builds: everything pulses together and a ring CONTRACTS onto
         the pad instead of running out of it, which is what gathering pressure looks like. */
      const r = (u - U_READY) / (U_LAUNCH - U_READY);
      const pulse = 0.86 + 0.14 * Math.sin(t * 15 + pod.bob);
      glow = (0.26 + 0.29 * r) * pulse;
      field = (0.66 + 0.34 * r) * pulse;
      wash = (0.29 + 0.34 * r) * pulse;
      for (let k = 0; k < 8; k++) pod.seam[k] = (0.92 + 0.08 * r) * pulse;
      r1R = 36 - 24 * smooth(r); r1A = (0.10 + 0.34 * r) * pulse;
    } else if (st === 'launch') {
      /* LAUNCH (§10). One brief flash, a pressure expansion ring, a vertical plume, and then extreme
         acceleration. NOTHING IS DESTROYED: the pod is intact and simply gone. */
      const lt = (u - U_LAUNCH) / (U_OUT - U_LAUNCH);
      dy = dirS * LAUNCH_S * Math.pow(lt, LAUNCH_POW);
      glow = 0.55 * (1 - smooth(lt * 0.8));
      field = 2.0 * (1 - lt * 0.55);
      for (let k = 0; k < 8; k++) pod.seam[k] = 1;
      /* ONE flash: up in 0.13 s, gone in 0.6 s. Anything longer reads as fire, which §10 forbids. */
      flashI = (lt < 0.06 ? smooth(lt / 0.06) : Math.pow(Math.max(0, 1 - (lt - 0.06) / 0.26), 2.2)) * 1.35;
      flashS = 17 + 46 * lt; flashY = dirS * 3;
      r0R = 6 + 96 * (1 - (1 - lt) * (1 - lt));
      r0A = smooth(lt / 0.05) * Math.pow(1 - lt, 1.8);
      const lt2 = clamp01((lt - 0.18) / 0.82);
      r1R = 6 + 134 * (1 - (1 - lt2) * (1 - lt2));
      r1A = smooth(lt2 / 0.06) * Math.pow(1 - lt2, 2) * 0.55;
      /* the beam is anchored at the PAD and grows along the launch axis — the column the pod tore
         through the air — while the pod's own field cone travels with the pod */
      plumeDown = !pod.up; plumeY = 0;
      plumeL = 270 * (1 - Math.pow(1 - clamp01(lt / 0.35), 2));
      plumeI = smooth(lt / 0.04) * (lt < 0.35 ? 1 : Math.pow(1 - (lt - 0.35) / 0.65, 1.6));
      chanL = 60 + 130 * smooth(lt / 0.5);
      chanI = smooth((lt - 0.04) / 0.14) * 0.85;
      wash = 0.45 + 1.15 * flashI + 0.35 * (1 - lt);
    } else { /* outbound */
      const ot = (u - U_OUT) / (U_AFTER - U_OUT);
      dy = dirS * (LAUNCH_S + LAUNCH_V * ot * ((U_AFTER - U_OUT) * CYCLE));
      if (Math.abs(dy) > 1600) visible = false;          /* out of frame, and out of the draw call */
      glow = 0.5; field = 1.4;
      for (let k = 0; k < 8; k++) pod.seam[k] = 1;
      const decay = clamp01(1 - ot / 0.22);
      plumeDown = !pod.up; plumeY = 0; plumeL = 270; plumeI = 0.34 * decay * decay;
      chanL = 190; chanI = 0.85 * clamp01(1 - ot / 0.62);
      wash = 0.30 * decay + 0.06;
      r1R = 140 + 60 * ot; r1A = 0.16 * decay;
    }

    pod.dy = dy;
    pod.y = pod.top + HOVER - POD_BOTTOM + dy;
    pod.visible = visible;
    pod.glow = glow; pod.field = field; pod.wash = wash;
    pod.flashI = flashI; pod.flashS = flashS; pod.flashY = flashY;
    pod.ring0R = r0R; pod.ring0A = r0A; pod.ring1R = r1R; pod.ring1A = r1A;
    pod.plumeL = plumeL; pod.plumeI = plumeI * beamK; pod.plumeDown = plumeDown; pod.plumeY = plumeY;
    pod.chanL = chanL; pod.chanI = chanI * mistK;

    /* THE CLOUD (§31). One disturb() per threshold per cycle, edge-detected so a variable frame rate
       or a headless advance() never double-fires and never misses one. Guarded, because the terrain
       module is optional and this must still run without it. */
    if (disturb && pod.solid) {
      for (let e = 0; e < EVENT_U.length; e++) {
        if (crossed(pod.lastU, u, EVENT_U[e])) disturb(pod.x, pod.z, EVENT_R[e], EVENT_S[e]);
      }
    }
    pod.lastU = u;

    /* the queue the pylon shows */
    const q = queue[pod.index];
    q.state = st;
    q.progress = u;
    let du = U_LAUNCH - u; if (du < 0) du += 1;
    q.eta = (st === 'launch' || st === 'outbound') ? 0 : Math.round(du * CYCLE * 10) / 10;
  }

  /* ------------------------------------------------------------------------------ time and theme */
  const energyCol = new THREE.Color(theme.energy);

  function setTime(state) {
    const s = state || {};
    const b = (layout.ATMO[s.band]) ? s.band : (typeof s.sunElevation === 'number'
      ? (s.sunElevation < -0.12 ? 'night' : s.sunElevation > 0.32 ? 'day' : 'dusk') : 'dusk');
    band = b;
    daylight = typeof s.daylight === 'number' ? s.daylight : daylight;
    /* Energy reads against the sky it is seen in: a launch plume at noon over a white cloud floor
       needs less than the same plume at night, or it becomes a white hole in the frame (§14). */
    energyK = 1 - 0.42 * daylight;
    seamGlowMat.opacity = 0.5 * energyK;
    fieldMat.opacity = 0.85 * energyK;
    plumeMat.opacity = 0.9 * energyK;
    streakMat.opacity = 0.8 * energyK;
    /* THE PAD'S OWN LIGHT COMES FROM THE SKY, NOT FROM A CONSTANT. Each pad caches fillFor() at its
       own bearing so its wash and its vapour channel belong to the direction it stands in. */
    for (let i = 0; i < N; i++) rawHex(layout.fillFor(pods[i].bearing, band), pods[i].fill);
    return band;
  }

  /* THE WORLD THEME OWNS ENERGY AND NOTHING ELSE. The shell, the glazing, the mirror catches, the
     mark and the vapour channel are not the viewing player's colour and never follow it. */
  function setTheme(t) {
    if (!t || !t.energy) return theme;
    theme = t;
    energyCol.setHex(t.energy);
    seamMat.color.setHex(t.energyLight);
    seamGlowMat.color.setHex(t.energy);
    fieldMat.color.setHex(t.energy);
    plumeMat.color.setHex(t.energyLight);
    flashMat.color.setHex(t.energyLight);
    ringMat.color.setHex(t.energy);
    streakMat.color.setHex(t.energyLight);
    return theme;
  }

  /* ------------------------------------------------------------------------------------ quality */
  function setQuality(q) {
    const name = typeof q === 'string' ? q : (q && q.name) || 'high';
    tier = layout.QUALITY[name] ? name : 'high';
    const K = layout.QUALITY[tier];
    beamK = K.beams; mistK = K.mist;
    /* What a tier removes here is OVERDRAW, never the vehicles: the pods are the reason the realm
       exists and they stay at every tier. The seam bloom, the vapour channel and the far traffic are
       the three transparent layers that cost fill rate, so they are what degrade (§45). */
    seamGlowMesh.userData.enabled = tier !== 'low';
    channelMesh.userData.enabled = K.mist > 0.05;
    streakMesh.userData.enabled = tier === 'high';
    if (stats) measure();
    return tier;
  }

  /* -------------------------------------------------------------------------------------- motion */
  function update(t, dt, camera) {
    const time = Number.isFinite(t) ? t : 0;
    const chanOn = channelMesh.userData.enabled !== false;
    const glowOn = seamGlowMesh.userData.enabled !== false;
    const streakOn = streakMesh.userData.enabled !== false;
    let live = 0, seamN = 0, markN = 0, fieldN = 0, plumeN = 0, chanN = 0, flashN = 0, ringN = 0;

    for (let i = 0; i < N; i++) {
      const pod = pods[i];
      evaluate(pod, time);

      /* ---- the pod itself */
      if (pod.visible) {
        _v.set(pod.x, pod.y, pod.z);
        _m.compose(_v, pod.quat, _one);
        shellMesh.setMatrixAt(live, _m);
        catchMesh.setMatrixAt(live, _m);
        glassMesh.setMatrixAt(live, _m);
        /* the shell BRIGHTENS rather than being repainted: instanceColor scales what the metal
           returns, capped at 1.55 so a preparing pod glows without becoming a white silhouette */
        const g = 1 + Math.min(0.55, pod.glow);
        _c.setRGB(g, g, g);
        shellMesh.setColorAt(live, _c);

        for (let k = 0; k < 8; k++) {
          _m2.multiplyMatrices(_m, seamLocal[k]);
          seamMesh.setMatrixAt(seamN, _m2);
          if (glowOn) seamGlowMesh.setMatrixAt(seamN, _m2);
          const s = pod.seam[k] * energyK;
          _c.setRGB(s, s, s); seamMesh.setColorAt(seamN, _c);
          if (glowOn) { const gg = Math.max(0, pod.seam[k] - 0.18) * 1.25 * energyK; _c.setRGB(gg, gg, gg); seamGlowMesh.setColorAt(seamN, _c); }
          seamN++;
        }
        for (let k = 0; k < markLocal.length; k++) {
          _m2.multiplyMatrices(_m, markLocal[k]);
          markMesh.setMatrixAt(markN++, _m2);
        }
        /* the field hangs under the emitter face and travels with the pod */
        if (pod.field > 0.01) {
          _v.set(pod.x, pod.y + POD_BOTTOM + 0.05, pod.z);
          _v2.set(1, -(3.0 + 2.6 * Math.min(1.6, pod.field)), 1);
          _m2.compose(_v, pod.quat, _v2);
          fieldMesh.setMatrixAt(fieldN, _m2);
          const f = Math.min(1.9, pod.field) * energyK;
          _c.setRGB(f, f, f); fieldMesh.setColorAt(fieldN, _c);
          fieldN++;
        }
        live++;
      }

      /* ---- the plume: at the pad for a launch, under the pod for an arrival */
      if (pod.plumeI > 0.004 && pod.plumeL > 1) {
        _v.set(pod.x, pod.top + HOVER + pod.plumeY, pod.z);
        _v2.set(2.2, pod.plumeDown ? -pod.plumeL : pod.plumeL, 2.2);
        _m2.compose(_v, pod.quat, _v2);
        plumeMesh.setMatrixAt(plumeN, _m2);
        const p = Math.min(1.7, pod.plumeI);
        _c.setRGB(p, p, p); plumeMesh.setColorAt(plumeN, _c);
        plumeN++;
      }
      /* ---- the vapour channel: cloud, so its colour is the sky's at this bearing */
      if (chanOn && pod.chanI > 0.004 && pod.chanL > 1) {
        _v.set(pod.x, pod.top + 1.2, pod.z);
        _v2.set(5.2, pod.chanL, 5.2);                  /* always upward — see THE CHANNEL RISES */
        _m2.compose(_v, pod.quat, _v2);
        channelMesh.setMatrixAt(chanN, _m2);
        const k = Math.min(1.2, pod.chanI);
        _c.copy(pod.fill).multiplyScalar(1.16 * k);
        channelMesh.setColorAt(chanN, _c);
        chanN++;
      }
      /* ---- the flash, square to the camera */
      if (pod.flashI > 0.004) {
        _v.set(pod.x, pod.top + HOVER + pod.flashY + 1.2, pod.z);
        _v2.set(pod.flashS, pod.flashS, pod.flashS);
        if (camera) _q.copy(camera.quaternion); else _q.identity();
        _m2.compose(_v, _q, _v2);
        flashMesh.setMatrixAt(flashN, _m2);
        const f = Math.min(2.2, pod.flashI) * energyK;
        _c.setRGB(f, f, f); flashMesh.setColorAt(flashN, _c);
        flashN++;
      }
      /* ---- the pressure rings, lying just over the pad's own cloud */
      for (let r = 0; r < RINGS_PER_PAD; r++) {
        const a = r === 0 ? pod.ring0A : pod.ring1A, rad = r === 0 ? pod.ring0R : pod.ring1R;
        if (a <= 0.004) continue;
        _v.set(pod.x, pod.top - 1.6, pod.z);
        _v2.set(rad, rad, rad);
        _q.identity();
        _m2.compose(_v, _q, _v2);
        ringMesh.setMatrixAt(ringN, _m2);
        const k = Math.min(1.5, a) * energyK;
        _c.setRGB(k, k, k); ringMesh.setColorAt(ringN, _c);
        ringN++;
      }

      /* ---- the pad wash: the pod's light on the cloud, in the sky's own colour (§31, §48) */
      const o = i * WASH_V;
      const w = Math.min(1.6, pod.wash);
      _c.copy(pod.fill).lerp(energyCol, 0.42).multiplyScalar(0.85 + 0.9 * w);
      for (let v = 0; v < WASH_V; v++) {
        const cv = (o + v) * 4;
        washCol[cv] = _c.r; washCol[cv + 1] = _c.g; washCol[cv + 2] = _c.b;
        washCol[cv + 3] = washA[o + v] * w;
      }
    }

    /* ---- distant traffic, derived purely from t: no spawn state, no allocation, reproducible */
    let streakN = 0;
    if (streakOn) {
      const n0 = Math.floor(time / STREAK_PERIOD);
      for (let s = 0; s < STREAK_SLOTS; s++) {
        const n = n0 - s;
        if (n < 0) continue;
        const age = time - n * STREAK_PERIOD;
        if (age < 0 || age > STREAK_LIFE) continue;
        const f = age / STREAK_LIFE;
        const bear = hash01(n, 1) * TAU - Math.PI;
        const rr = 950 + hash01(n, 2) * 2050;
        /* dir() MUST be given an `out`: without one it returns a fresh {x,y,z} literal, and a streak
           alight for five seconds would then allocate one object every frame (§45) */
        layout.dir(bear, _v3);
        const x = _v3.x * rr, z = _v3.z * rr;
        /* explicitly FLOATING: it starts well above the cloud sea and climbs out of frame */
        const y0 = 70 + hash01(n, 3) * 90 + 900 * f * f;
        const len = 220 + hash01(n, 4) * 260;
        _v.set(x, y0, z);
        if (camera) _q.setFromAxisAngle(_axisY, Math.atan2(camera.position.x - x, camera.position.z - z));
        else _q.identity();
        _v2.set(14 + hash01(n, 5) * 10, len, 1);
        _m2.compose(_v, _q, _v2);
        streakMesh.setMatrixAt(streakN, _m2);
        const k = (f < 0.12 ? f / 0.12 : Math.pow(1 - (f - 0.12) / 0.88, 1.4)) * energyK;
        _c.setRGB(k, k, k); streakMesh.setColorAt(streakN, _c);
        streakN++;
      }
    }

    shellMesh.count = live; catchMesh.count = live; glassMesh.count = live;
    seamMesh.count = seamN; seamGlowMesh.count = glowOn ? seamN : 0;
    markMesh.count = markN; fieldMesh.count = fieldN;
    plumeMesh.count = plumeN; channelMesh.count = chanOn ? chanN : 0;
    flashMesh.count = flashN; ringMesh.count = ringN; streakMesh.count = streakN;
    /* a pool with nothing alive costs nothing: `visible` false is the only way to keep three from
       issuing a zero-instance draw call for it */
    shellMesh.visible = catchMesh.visible = glassMesh.visible = live > 0;
    seamMesh.visible = seamN > 0;
    seamGlowMesh.visible = glowOn && seamN > 0;
    markMesh.visible = markN > 0;
    fieldMesh.visible = fieldN > 0;
    plumeMesh.visible = plumeN > 0;
    channelMesh.visible = chanOn && chanN > 0;
    flashMesh.visible = flashN > 0;
    ringMesh.visible = ringN > 0;
    streakMesh.visible = streakN > 0;

    if (live) { shellMesh.instanceMatrix.needsUpdate = true; catchMesh.instanceMatrix.needsUpdate = true; glassMesh.instanceMatrix.needsUpdate = true; shellMesh.instanceColor.needsUpdate = true; }
    if (seamN) { seamMesh.instanceMatrix.needsUpdate = true; seamMesh.instanceColor.needsUpdate = true; }
    if (seamN && glowOn) { seamGlowMesh.instanceMatrix.needsUpdate = true; seamGlowMesh.instanceColor.needsUpdate = true; }
    if (markN) markMesh.instanceMatrix.needsUpdate = true;
    if (fieldN) { fieldMesh.instanceMatrix.needsUpdate = true; fieldMesh.instanceColor.needsUpdate = true; }
    if (plumeN) { plumeMesh.instanceMatrix.needsUpdate = true; plumeMesh.instanceColor.needsUpdate = true; }
    if (chanN) { channelMesh.instanceMatrix.needsUpdate = true; channelMesh.instanceColor.needsUpdate = true; }
    if (flashN) { flashMesh.instanceMatrix.needsUpdate = true; flashMesh.instanceColor.needsUpdate = true; }
    if (ringN) { ringMesh.instanceMatrix.needsUpdate = true; ringMesh.instanceColor.needsUpdate = true; }
    if (streakN) { streakMesh.instanceMatrix.needsUpdate = true; streakMesh.instanceColor.needsUpdate = true; }
    washGeo.attributes.color.needsUpdate = true;
  }

  /* --------------------------------------------------------------------------------- accounting */
  const stats = {
    module: 'ascent',
    tier,
    pods: N, seamsPerPod: SEAMS, cycleSeconds: CYCLE,
    launchBurstSeconds: LAUNCH_T, launchPeakSpeed: Math.round(LAUNCH_V),
    arrivalDepth: ARRIVE_DEPTH,
    podWidth: POD_W * 2, podHeight: POD_H,
    padsFromStructures: pods.filter(p => p.realPad).length,
    drawCalls: 0, triangles: 0, drawCallsPeak: 0, trianglesPeak: 0,
    get band() { return band; },
    get theme() { return theme.name; }
  };
  /* MEASURED, not estimated (§45, §46): what the module submits right now, and what it would submit
     with every pod flying and every effect alight at once — the honest ceiling. */
  function measure() {
    stats.drawCalls = 0; stats.triangles = 0; stats.drawCallsPeak = 0; stats.trianglesPeak = 0;
    stats.tier = tier;
    group.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry;
      const tri = Math.round((g.index ? g.index.count : g.attributes.position.count) / 3);
      const cap = o.isInstancedMesh ? (o.instanceMatrix ? o.instanceMatrix.count : 0) : 1;
      const now = o.isInstancedMesh ? o.count : 1;
      if (o.userData.enabled !== false) { stats.drawCallsPeak++; stats.trianglesPeak += tri * cap; }
      if (o.visible && now > 0) { stats.drawCalls++; stats.triangles += tri * now; }
    });
    return stats;
  }

  function dispose() {
    if (group.parent) group.parent.remove(group);
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    textures.forEach(t => t.dispose());
    geometries.length = 0; materials.length = 0; textures.length = 0;
  }

  if (scene && !group.parent) scene.add(group);

  /* ------------------------------------------------------------------------------------- finish */
  setTime((ctx && ctx.clock && ctx.clock.state) ? ctx.clock.state() : { band: 'dusk', daylight: 0.25, sunElevation: 0.055 });
  setQuality(tier);
  /* the first evaluate() must not fire a whole cycle of disturbances just because lastU was unset —
     crossed() returning false while lastU < 0 is exactly what primes it */
  update(0, 0, ctx && ctx.camera);
  measure();

  return {
    group, setTime, setTheme, update, setQuality, dispose, stats,
    /* the extra surface the rest of the realm needs */
    queue,                       /* [{ pad, state, eta, dir, progress }] — the pylon shows the truth */
    pods,                        /* live pad state, for anything that wants to look at a pod */
    cycleSeconds: CYCLE,
    /* where a pod actually stands, so the structures and life modules can agree with it */
    padAt(name) { for (let i = 0; i < N; i++) if (pods[i].name === name) return { x: pods[i].x, y: pods[i].top, z: pods[i].z }; return null; }
  };
}
