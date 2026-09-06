/* MAHWORLD :: UPPER REALM — THE ASCENT VEHICLES, THEIR LAUNCH AND THEIR ARRIVAL

   These pods are the ONLY normal way into this realm, so they carry more of the brief's drama than
   anything else that moves here. A resident does not walk up to the sky; a square-diamond pod stands
   on a pad, its seams light one after another, the cloud under it flinches, and then it is gone
   straight up at a speed nothing else in MAHWORLD approaches (§08, §10, §50).

   WHAT THIS MODULE OWNS
     1  THE POD          one hull, built once, instanced across every pad: a broad square-diamond in
                         BOTH plan and elevation, near-white platinum, a mirror belt catch, faceted
                         diamond glazing over the upper hull, eight corner seams that carry the
                         Theme's energy, a square-diamond MAHGIC field under the base, and the
                         canonical mark small on one flank.
     2  THE SEQUENCE     PREPARING → READY → LAUNCH → AFTER, plus arrival from below and the §37
                         downward departure, driven from ONE deterministic schedule.
     3  THE EFFECTS      flash, pressure ring, plume column, cloud channel, pad wash and distant
                         traffic streaks — every one a fixed preallocated slot, reused every cycle.
     4  THE CLOUD        it calls ctx.disturb() at ignition, at blast, while spooling and on arrival.
                         It never draws cloud itself; the terrain module owns that (§31).

   WHAT "EXPLODE WHEN READY TO GO" MEANS HERE (§10). It is a LAUNCH BURST OF POWER, not a
   destruction event. There is no fireball, no debris and no damage: one brief high-energy flash, a
   pressure expansion ring running out across the cloud, a vertical plume, and then extreme vertical
   acceleration out of frame. The pod is intact the whole way. Downward departure is the same energy
   in reverse — the glow builds identically and the pod drops through a cloud opening just as fast.

   THE TWO CONTRACT LAWS
     · NOTHING ASSUMES y = 0. Every pad top comes from ctx.pads (the structures module's real pads)
       or, when that is absent, from ctx.cloudTopAt()/deckHeight() plus a nominal pad deck; the pad
       wash disc samples the rolling cloud surface per vertex and zeroes itself over anything that is
       not deckSolid().
     · NO ATMOSPHERIC COLOUR IS INVENTED HERE. The pad wash and the vapour channel take their colour
       from layout.fillFor() at the pad's OWN bearing, so a launch on the sunset flank throws warm
       light onto warm cloud and the same launch on the cold side throws violet (§41, §48). Only the
       ENERGY — seams, field, plume, flash, ring, streak — is the world Theme's, and setTheme touches
       nothing else.

   WHY IT IS INSTANCED AND NOT FOUR GROUPS. Four pods each carrying six meshes is 24 draw calls and
   24 materials before a single effect exists, and per-pod brightness would then need per-pod material
   clones. One InstancedMesh per PART instead gives per-pod (and, for the seams, per-seam) modulation
   through instanceColor for free, at one draw call per part however many pods are in the air.

   THE METAL LAW. The hull's crown cap and its emitter face point straight up and straight down, so
   the shell is a LOW-metalness near-white platinum that takes diffuse light: a metalness-1.0 cap here
   would reflect the dim zenith and render as a black lid on a white pod in a white world. The mirror
   grade is used only where it is legal — the belt band, the thruster collar, the crown collar and the
   flank mark, all vertical or tilted faces that reflect the bright horizon.

   COST. Thirteen meshes, all instanced or pooled; measured in stats, well inside the §45/§46 budget.
   update() allocates nothing: every matrix, quaternion, vector and colour it touches is module-level
   scratch, and every effect writes into a slot that already exists. */

import * as THREE from '../vendor/three/three.module.min.js';
import * as layout from './sky-layout.js';
import { canvasTexture, fobMark, chamferBox } from './materials.js';

const TAU = Math.PI * 2;
const smooth = layout.smoothstep;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

/* module-level scratch — update() must allocate nothing (§45) */
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
const _c = new THREE.Color(), _c2 = new THREE.Color();
const _one = new THREE.Vector3(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0);
const _fwd = new THREE.Vector3(0, 0, 1);

/* Read a contract hex the way layout.atmosphere() reads its own stops. sky-terrain.js carries the
   same note: atmosphere() writes with Color.setRGB(), which does NOT decode sRGB in r185, so decoding
   fillFor()'s hex here would make this module's light sit darker than the sky it belongs to. */
function rawHex(h, out) { return out.setRGB(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255); }

/* ============================================================== THE POD, AS PROPORTION AND SCHEDULE */

/* THE SQUARE-DIAMOND, as a superellipse. |x|^p + |z|^p = 1 with p = 1 is a hard diamond with its
   four points on the axes; p = 1.32 keeps the points and the four flat flanks between them but takes
   the raw 90-degree corner off, which is the "softly rounded / chamfered corners" the brief asks for
   and the discipline this whole world is held to. Sixteen samples put a vertex exactly on each of the
   four corners (0, 4, 8, 12) and exactly on each of the four flank centres (2, 6, 10, 14), which is
   what lets the seams, the glazing and the mark be placed by index rather than by search. */
const OUTLINE_N = 16, OUTLINE_P = 1.32;

/* THE HULL SECTION. Broad at the belt and taller above it than below: a square-diamond read in
   elevation as well as in plan, with the widest line low so the pod sits on its light rather than
   balancing on a point. Local y runs −0.42 … +0.58, so the section is exactly one unit tall. */
const RINGS = [
  { y: -0.420, s: 0.240 },   /* the emitter face — horizontal, and the reason the shell is low-metal */
  { y: -0.382, s: 0.420 },
  { y: -0.300, s: 0.660 },
  { y: -0.170, s: 0.870 },
  { y: -0.050, s: 0.985 },
  { y:  0.000, s: 1.000 },   /* THE BELT: the widest line and the mirror catch */
  { y:  0.085, s: 0.975 },
  { y:  0.240, s: 0.860 },
  { y:  0.400, s: 0.655 },
  { y:  0.520, s: 0.400 },
  { y:  0.580, s: 0.220 }    /* the crown */
];
const BELT_RING = 5, CROWN_RING = 9;
const POD_W = 4.5;           /* half-width at the belt: a 9 m square-diamond, a LARGE transport pod */
const POD_H = 7.2;           /* metres for one unit of section height */
const POD_BOTTOM = RINGS[0].y * POD_H;              /* −3.02 m: the emitter face, below the origin */
const HOVER = 0.42;          /* the pod never quite touches: it stands on its own field (§08) */

/* The glazing wraps the upper hull on all four flanks: bands 6, 7 and 8 of the section, two segments
   either side of each flank centre. It is built as a separate shell 0.6% proud of the hull rather
   than as a hole in it, so there is always platinum behind the glass and never a view through the
   pod — a canopy sitting on its frame, which is also how a real one is made. */
const GLASS_BANDS = [6, 7, 8];
const GLASS_SEGS = [1, 2, 5, 6, 9, 10, 13, 14];

/* THE SCHEDULE (§09). One deterministic cycle per pad, four pads phase-offset, so at any instant the
   arrival area shows roughly one arriving, one docked, one preparing and one leaving — evidence of
   traffic without the sky becoming a firework display. A launch happens somewhere every ~28 s. */
const CYCLE = 112;
const U_ARRIVE = 0.090, U_DOCK = 0.180, U_PREP = 0.440, U_READY = 0.680, U_LAUNCH = 0.740, U_OUT = 0.760, U_AFTER = 0.900;

/* The four pads and their phase at t = 0. These are chosen so that a capture taken at t = 0 shows
   each pad in the state layout.SITES already names it — padA arriving, padB docked, padC preparing,
   padD launching — rather than whatever the modulo happened to land on. */
const PADS = [
  { name: 'padA', offset: 0.135, up: true },    /* mid-ARRIVING at t = 0 */
  { name: 'padB', offset: 0.310, up: false },   /* DOCKED — departs downward, §37 */
  { name: 'padC', offset: 0.560, up: false },   /* PREPARING — departs downward */
  { name: 'padD', offset: 0.750, up: true }     /* LAUNCHING upward at t = 0 */
];

/* The cloud responses this module asks the terrain module for, as phase thresholds crossed once per
   cycle: the arrival punching through the deck, the touchdown, four spool-up presses that make the
   cloud visibly react before anything happens (§10 PREPARING), and the two-stage ignition blast. */
const EVENT_U = [0.1550, 0.1790, 0.6000, 0.6550, 0.7000, 0.7250, 0.7420, 0.7520];
const EVENT_R = [40, 26, 16, 18, 20, 22, 48, 78];
const EVENT_S = [0.80, 0.50, 0.20, 0.24, 0.28, 0.32, 1.00, 0.70];

/* Distant traffic (§09): a vertical light streak far out, derived purely from t so a capture is
   reproducible without any spawn state at all. LIFE < PERIOD*2, so at most two are ever alight. */
const STREAK_PERIOD = 7.5, STREAK_LIFE = 5.2, STREAK_SLOTS = 3;

/* ================================================================================ small geometry */

/* The unit square-diamond outline in XZ. Returned as a flat array so nothing downstream allocates. */
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

/* Loft an outline through a stack of rings. Winding is derived, not guessed: for an outline running
   anticlockwise in XZ and rings running upward, (a, c, b) / (a, d, c) is the pair whose normal points
   radially OUTWARD — see the note in the smoke test, which checks it on the built mesh. */
function loft(outline, rings, opts) {
  const o = opts || {};
  const n = outline.length / 2, m = rings.length;
  const sx = o.sx == null ? 1 : o.sx, sy = o.sy == null ? 1 : o.sy;
  const skip = o.skip || null;                       /* (band, seg) => true to omit a cell */
  const only = o.only || null;                       /* (band, seg) => true to keep only these */
  const grow = o.grow == null ? 0 : o.grow;          /* radial offset in outline units */
  const capB = !!o.capBottom, capT = !!o.capTop;
  const pos = [], idx = [];
  for (let r = 0; r < m; r++) {
    const R = rings[r], s = R.s + grow;
    for (let i = 0; i < n; i++) pos.push(outline[i * 2] * s * sx, R.y * sy, outline[i * 2 + 1] * s * sx);
  }
  for (let b = 0; b < m - 1; b++) for (let i = 0; i < n; i++) {
    if (skip && skip(b, i)) continue;
    if (only && !only(b, i)) continue;
    const a = b * n + i, bb = b * n + ((i + 1) % n), c = (b + 1) * n + ((i + 1) % n), d = (b + 1) * n + i;
    idx.push(a, c, bb, a, d, c);
  }
  if (capB) {
    const ci = pos.length / 3; pos.push(0, rings[0].y * sy, 0);
    for (let i = 0; i < n; i++) idx.push(ci, i, (i + 1) % n);           /* fan facing −Y */
  }
  if (capT) {
    const top = (m - 1) * n, ci = pos.length / 3; pos.push(0, rings[m - 1].y * sy, 0);
    for (let i = 0; i < n; i++) idx.push(ci, top + ((i + 1) % n), top + i);   /* fan facing +Y */
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* A vertical additive column: an open square-diamond cone one unit tall, bright at y = 0 and fading
   to nothing at y = 1, baked into vertex colour so a single instance matrix can stretch it to any
   length without the fade stretching with it in the wrong direction. Shared by the plume and the
   cloud channel — same form, different material and scale. */
function columnGeometry(n, r0, r1, rings) {
  const o = diamondOutline(n, 1.5);
  const pos = new Float32Array(n * rings * 3), col = new Float32Array(n * rings * 4);
  const idx = [];
  for (let r = 0; r < rings; r++) {
    const f = r / (rings - 1);
    const rad = r0 + (r1 - r0) * f;
    const a = (1 - f) * (1 - f) * (r === 0 ? 0.85 : 1);      /* softened right at the muzzle */
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
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  g.setIndex(idx);
  return g;
}

/* The pressure expansion ring: a flat band of unit outer radius that RISES very slightly outward, so
   an 80 m ring running across a cloud floor that rolls does not saw through it. Alpha 0 at the inner
   rim, 1 in the band, 0 at the outer rim, so it reads as a shock front and not as a disc. */
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
  return g;
}

function quadGeometry(w, h, anchorBottom) {
  const y0 = anchorBottom ? 0 : -h / 2, y1 = anchorBottom ? h : h / 2;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -w / 2, y0, 0, w / 2, y0, 0, w / 2, y1, 0, -w / 2, y1, 0
  ]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/* =============================================================================== the module */

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
  let themeCol = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 };

  /* ------------------------------------------------------------------------------- the pads */
  /* THE PADS ARE THE STRUCTURES MODULE'S, not ours. ctx.pads is read defensively because it is built
     by a sibling and may be an array or a map, may name its entries id/name/pad, and may give the
     standing surface as top/deckY/y or inside a position. When it is absent entirely the layout's own
     SITES are the fallback and the pad deck is assumed to be a low platform over the real cloud
     surface — never over y = 0 (contract law 1). */
  const FALLBACK_PAD_DECK = 2.6;
  function readPad(name, index) {
    const raw = ctx && ctx.pads;
    let e = null;
    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i++) { const p = raw[i]; if (p && (p.name === name || p.id === name || p.pad === name)) { e = p; break; } }
      if (!e && raw[index]) e = raw[index];
    } else if (raw && typeof raw === 'object') {
      e = raw[name] || null;
    }
    const site = layout.siteAt(name);
    let x = site.x, z = site.z, top = cloudTopAt(site.x, site.z) + FALLBACK_PAD_DECK, real = false;
    if (e) {
      const p = e.position || e;
      const ex = Number(p.x), ez = Number(p.z);
      if (Number.isFinite(ex) && Number.isFinite(ez)) { x = ex; z = ez; real = true; }
      const et = [e.top, e.deckY, e.deckHeight, e.surfaceY, p.y].find(v => Number.isFinite(Number(v)));
      if (et != null) { top = Number(et); real = true; }
      else { top = cloudTopAt(x, z) + FALLBACK_PAD_DECK; }
    }
    return { x, z, top, real };
  }

  const staging = layout.siteAt('staging');
  const pods = [];
  for (let i = 0; i < PADS.length; i++) {
    const cfg = PADS[i];
    const p = readPad(cfg.name, i);
    const R = layout.rng('ascent:' + cfg.name);
    /* The pod is turned so that the flank carrying the mark faces the staging apron — the place the
       player actually stands. bearing = φ − yaw for a flank at local bearing φ (see dir()). */
    const toStaging = layout.bearingOf(staging.x - p.x, staging.z - p.z);
    pods.push({
      cfg, name: cfg.name, x: p.x, z: p.z, top: p.top, realPad: p.real,
      bearing: layout.bearingOf(p.x, p.z),
      yaw: Math.PI / 4 - toStaging + (R() - 0.5) * 0.10,   /* a few degrees of scatter so four pods are not one object copied */
      solid: layout.deckSolid(p.x, p.z),
      lastU: -1, bob: R() * TAU,
      /* per-frame outputs, written in update(), never reallocated */
      state: 'empty', u: 0, y: 0, visible: false, glow: 0, field: 0, wash: 0, seam: new Float32Array(8),
      fill: new THREE.Color(1, 1, 1)
    });
  }

  /* ------------------------------------------------------------------------- pod geometry */
  const OUT = diamondOutline(OUTLINE_N, OUTLINE_P);

  /* THE SHELL. One merged hull in metres — the belt scale and the section height are baked in, so a
     pod's instance matrix carries position and yaw only and the seam bars built below can live in the
     same space without a non-uniform scale distorting them. */
  const shellGeo = own.g(loft(OUT, RINGS, { sx: POD_W, sy: POD_H, capBottom: true, capTop: true }));
  shellGeo.name = 'ascent-pod-shell';

  /* THE NEAR-WHITE PLATINUM SHELL — the pod's dominant material, and the one thing in this module
     that is not taken from M. The world's platinum grades are architectural values read against a
     night city; up here the pod has to sit BRIGHTER than an ocean of lit cloud or it reads as a dark
     object on white, which is the opposite of what §50 asks for. Metalness stays low because the
     crown cap and the emitter face are horizontal — see the metal law in the header. */
  const shellMat = own.m(new THREE.MeshStandardMaterial({ color: 0xdde5f1, roughness: 0.19, metalness: 0.44, envMapIntensity: 1.75 }));
  shellMat.name = 'ascent-pod-shell';
  const shellMesh = new THREE.InstancedMesh(shellGeo, shellMat, PADS.length);
  shellMesh.name = 'ascent-pod-shell';
  shellMesh.castShadow = true;
  group.add(shellMesh);

  /* THE CATCHES. Mirror chromium, and legally so: the belt band, the thruster collar and the crown
     collar are all vertical or tilted, so each reflects the bright horizon rather than the zenith. */
  const catchGeo = own.g(mergeGeo([
    loft(OUT, [{ y: -0.030, s: 1.010 }, { y: 0.000, s: 1.024 }, { y: 0.030, s: 1.010 }], { sx: POD_W, sy: POD_H }),
    loft(OUT, [{ y: -0.398, s: 0.455 }, { y: -0.368, s: 0.600 }], { sx: POD_W, sy: POD_H }),
    loft(OUT, [{ y: 0.508, s: 0.408 }, { y: 0.536, s: 0.330 }], { sx: POD_W, sy: POD_H })
  ]));
  catchGeo.name = 'ascent-pod-catch';
  const catchMat = M.chromeMirror || own.m(new THREE.MeshStandardMaterial({ color: 0xdfe9f7, roughness: 0.03, metalness: 1, envMapIntensity: 2.7 }));
  const catchMesh = new THREE.InstancedMesh(catchGeo, catchMat, PADS.length);
  catchMesh.name = 'ascent-pod-catch';
  group.add(catchMesh);

  /* THE GLAZING. The upper hull's own facets, lifted 0.6% proud and flat-shaded, so each of the
     twenty-four panes catches a different piece of sky — faceted diamond glazing that is part of the
     form rather than a window pasted on it. The tint is a cool mid value, not the city's night glass:
     over a near-white shell in a bright realm that reads as a glazed canopy with an interior behind
     it, where the city's 0x2b3f60 would have punched four dark holes in a white pod. */
  const glassBand = new Set(GLASS_BANDS), glassSeg = new Set(GLASS_SEGS);
  const glassGeo = own.g(mergeGeo([
    loft(OUT, RINGS, { sx: POD_W, sy: POD_H, grow: 0.006, only: (b, i) => glassBand.has(b) && glassSeg.has(i) }),
    loft(OUT, [RINGS[CROWN_RING], RINGS[10]], { sx: POD_W, sy: POD_H, grow: 0.006, capTop: true })
  ]));
  glassGeo.name = 'ascent-pod-glass';
  const glassMat = own.m(new THREE.MeshPhysicalMaterial({
    color: 0x5b7fb8, roughness: 0.05, metalness: 0.12, transparent: true, opacity: 0.66,
    side: THREE.DoubleSide, flatShading: true, envMapIntensity: 2.4
  }));
  glassMat.name = 'ascent-pod-glass';
  const glassMesh = new THREE.InstancedMesh(glassGeo, glassMat, PADS.length);
  glassMesh.name = 'ascent-pod-glass';
  group.add(glassMesh);

  group.add(shellMesh);
  return { group };
}

function mergeGeo(list) { return list[0]; }
