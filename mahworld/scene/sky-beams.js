/* MAHWORLD :: UPPER REALM — THE FOBEAM NETWORK, SEEN FROM INSIDE IT (§19, §20)

   Down in MAHPLAZA the FOBEAMs are infrastructure you look UP at. Up here the player is standing in
   the middle of the same network, and the job of this module is therefore NOT to draw more beams. It
   is to give the sky DEPTH. An open sky only reads as vast if the light in it is demonstrably at
   several different distances, so the beams are built as FOUR LAYERS that differ in altitude, scale,
   brightness, speed and behaviour — and nothing else in this module matters as much as that they stay
   visibly different from one another.

     BELOW         the city's own network, hundreds of metres under the cloud floor, glimpsed only
                   through the holes in it (layout.VOIDS) and past the sunset cliff. Faint, slow to
                   read, and OCCLUDED by the cloud — which is exactly why a glimpse of it through a
                   hole is worth more than a whole sky of beams.
     PLAYER LEVEL  six architectural connections between the realm's own structures. These are the
                   ONLY beams with real presence: a bright rail, a soft outer field, packets you can
                   follow one at a time. They are also the only layer quality never culls, because
                   they are the visible proof that the concourse, the pylons, the relay and the
                   suspended towers are one piece of infrastructure rather than six props.
     ABOVE         thin high-atmosphere routes crossing overhead at 500–1500 m. Long, fast, sparse.
     FAR           the MAHGIC field near the horizon: many hairline routes carrying tiny packets,
                   dense enough to read as one luminous network rather than as drawn lines.

   THE SCALE RULE THAT MAKES THE LAYERS WORK. Every layer's rail radius is chosen so that AT ITS OWN
   DISTANCE it lands at roughly a hairline on screen — one to six pixels at 1080p / 56 degrees, where
   the projection factor is 1080 / (2·tan 28°) ≈ 1015 px per (metre / metre-of-distance):
     player 0.42 m radius at ~100 m →  8.5 px      above  1.5 m at ~1500 m →  2.0 px
     below  0.90 m radius at ~780 m →  2.3 px      far    3.4 m at ~4800 m →  1.4 px
   A far beam drawn at a near beam's radius is the single fastest way to destroy the sense of
   distance, because the eye reads apparent width as distance before it reads anything else.

   DENSITY FOLLOWS THE CONTRACT, NOT MY TASTE. The far field's bearing distribution is drawn from
   layout.sectorMix(bearing, 'stars') — the same directional weighting the sky's own star field uses
   (1.00 on the cold side, 0.10 in the sunset cone). So the network is densest on the cold side (§20)
   and all but absent across the sunset, which is the realm's breathing room (§01, §15), and both
   facts come from the sector plan rather than from a number typed here.

   AND COLOUR OBEYS THE ATMOSPHERE. Beam colour itself is ENERGY and belongs to the world Theme
   (setTheme repaints it, and only it). But a beam five kilometres away is seen THROUGH five
   kilometres of this realm's air, so every distant layer's vertex colour is multiplied by a
   normalised tint sampled from layout.atmosphere() at that vertex's own bearing — via a 48-bucket
   lookup, rebuilt only when the band actually moves. Turning toward the sunset therefore warms the
   distant network and turning to the cold side cools it, continuously, from the one sky function
   (§41, §42, §48). The player-level layer is barely tinted at all: it is close, and it should read as
   MAHGIC rather than as haze.

   Read as a sibling of fobeam.js: it already solved rails, outer fields, square-diamond packets,
   travelling lights, arrival brightening and pooling for the lower world, and this is deliberately
   the same network at a different altitude. It is not imported — its nodes are city addresses.

   COST. One merged rail mesh per layer, one field mesh, one InstancedMesh of packets and one of
   travelling lights per layer, one arrival-glow mesh: 14 draw calls, ~19k triangles at high, and
   update() allocates nothing. */

import * as THREE from '../vendor/three/three.module.min.js';
import * as layout from './sky-layout.js';
import { canvasTexture } from './materials.js';

const { QUALITY, VOIDS, DECK, SECTORS } = layout;
const TAU = Math.PI * 2;

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
function smoothstep(e0, e1, x) { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); }

/* COLOUR SPACE, and it is not a nicety — the same trap sky-structures.js and sky-terrain.js document.
   layout.atmosphere() writes its stops with Color.setRGB(), which in three r185 does NOT decode sRGB,
   while fillFor()/atmosphere() hand back a packed hex. Reading that hex with setHex() WOULD decode it,
   and the beams' haze tint would sit visibly darker and more saturated than the sky they hang in. One
   convention, one sky: read the hex raw, exactly the way atmosphere() reads its own stops. */
function rawHex(h, out) { return out.setRGB(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255); }

/* ------------------------------------------------------------------ the four layers
   ts/rs are the tube's tessellation. They fall hard with distance because a 5 km route subtends a
   pixel: spending 74 segments on it buys nothing but triangles (§45, §46).
     rail/packet   brightness multipliers, so the layers separate in VALUE and not only in size
     tint          how much of the layer's colour comes from the atmosphere rather than the Theme
     elev          the elevation atmosphere() is sampled at for this layer's tint lookup
     haze          [near, far] metres over which a layer fades to nothing, replacing scene fog:
                   three.js fog mixes toward the FOG COLOUR, and mixing an ADDITIVE beam toward a
                   bright sky colour makes distance brighten the sky instead of hiding the beam. So
                   every distant layer bakes its own haze into vertex brightness and runs fog: false.
                   Only the player layer, which is near and moves with the camera, uses real fog. */
const LAYERS = {
  below: {
    railR: 0.90, ts: 26, rs: 4, fieldR: 0,
    rail: 0.30, packet: 0.42, pSize: [4.5, 9.0], speed: [34, 92], packets: [3, 6],
    tint: 0.72, elev: -0.38, haze: [520, 2600], fog: false, dayFade: 0.72, order: 4
  },
  player: {
    railR: 0.42, ts: 74, rs: 5, fieldR: 2.20, fts: 30, frs: 5,
    rail: 0.72, field: 0.10, packet: 1.00, pSize: [0.70, 1.60], speed: [15, 34], packets: [5, 10],
    tint: 0.12, elev: 0.04, haze: null, fog: true, dayFade: 0.42, order: 7
  },
  above: {
    railR: 1.50, ts: 30, rs: 4, fieldR: 0,
    rail: 0.34, packet: 0.50, pSize: [7, 14], speed: [62, 165], packets: [2, 5],
    tint: 0.46, elev: 0.52, haze: [1400, 6200], fog: false, dayFade: 0.74, order: 5
  },
  far: {
    railR: 3.40, ts: 16, rs: 3, fieldR: 0,
    rail: 0.20, packet: 0.30, pSize: [22, 46], speed: [95, 265], packets: [2, 5],
    tint: 0.80, elev: 0.06, haze: [2900, 9400], fog: false, dayFade: 0.76, order: 3
  }
};
/* Base route counts at 'high'; QUALITY[tier].beams scales all but the player layer. The BELOW layer
   is not listed because its count is not a taste decision: it is two or three routes per aperture in
   layout.VOIDS plus four beyond the sunset cliff, so it follows the contract's holes. */
const COUNT = { above: 16, far: 54 };
const TINT_BUCKETS = 48;

/* a soft radial glow — the travelling light and the arrival brightening share it, as in fobeam.js */
function glowTexture() {
  return canvasTexture(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(226,240,255,0.72)');
    g.addColorStop(0.55, 'rgba(150,196,255,0.18)'); g.addColorStop(1, 'rgba(90,150,235,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  });
}

/* concatenate tube geometries into ONE static non-indexed BufferGeometry. Non-indexed on purpose:
   setDrawRange() on a non-indexed buffer counts VERTICES, which is what lets setQuality() drop whole
   routes off the end of a merged mesh without rebuilding a single buffer. */
function mergeGeos(list) {
  const parts = []; let count = 0;
  for (const g of list) { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); parts.push(n); count += n.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  let o = 0;
  for (const n of parts) {
    const c = n.attributes.position.count;
    pos.set(n.attributes.position.array.subarray(0, c * 3), o * 3);
    if (n.attributes.color) col.set(n.attributes.color.array.subarray(0, c * 3), o * 3);
    o += c;
  }
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  parts.forEach(n => n.dispose());
  return out;
}

export function buildSkyBeams(ctx) {
  const scene = ctx && ctx.scene;
  const M = (ctx && ctx.M) || {};
  const theme0 = (ctx && ctx.theme) || M.theme || { energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 };
  const group = new THREE.Group(); group.name = 'sky-beams';

  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };

  let tier = typeof ctx?.quality === 'string' ? ctx.quality : (ctx?.quality && ctx.quality.name) || 'high';
  if (!QUALITY[tier]) tier = 'high';

  /* THE CLOUD FLOOR (contract law 1). ctx.cloudTopAt is the surface the terrain module actually
     draws; deckHeight() is the contract's own answer and the correct fallback. Every player-level
     node in this file takes its height from it — a beam that terminates at a nominal y would leave
     the structure it is supposed to be plugged into. */
  const ground = (ctx && typeof ctx.cloudTopAt === 'function') ? ctx.cloudTopAt : layout.deckHeight;

  const R = layout.rng('sky-beams-v1');
  const rr = (a, b) => a + (b - a) * R();
  const px = (bearing, r) => { const d = layout.dir(bearing); return { x: d.x * r, z: d.z * r }; };

  /* ================================================================ 1. THE PLAYER-LEVEL NODES
     A node is a TERMINAL on a structure sky-structures.js actually built, so its height is derived
     the way that module derives it — the highest cloud under the footprint plus the structure's own
     stack — rather than guessed. sky-structures is not passed to this module (the assembly hands over
     only cloudTopAt, pads and disturb), so the two derivations are kept deliberately identical and
     commented on both sides. A metre of disagreement on a 0.3 m rail is invisible; ten is a beam
     ending in mid air next to its own mast. */
  function bandMax(cx, cz, r, rings, spokes) {
    let mx = ground(cx, cz);
    for (let k = 1; k <= rings; k++) {
      const rad = r * k / rings;
      for (let a = 0; a < spokes; a++) {
        const th = a / spokes * TAU;
        const h = ground(cx + Math.cos(th) * rad, cz + Math.sin(th) * rad);
        if (h > mx) mx = h;
      }
    }
    return mx;
  }
  function nodeAt(site, dy, footR, rings, spokes) {
    const p = layout.siteAt(site);
    if (p.floating) return { id: site, x: p.x, y: p.y + dy, z: p.z, flash: 0 };
    const base = footR ? bandMax(p.x, p.z, footR, rings || 3, spokes || 12) : ground(p.x, p.z);
    return { id: site, x: p.x, y: base + dy, z: p.z, flash: 0 };
  }
  /* A terminal's arrival glow is sized for a roughly CONSTANT ANGULAR size from the arrival apron —
     6 m at the concourse, 19 m at the far suspended tower — because a fixed 9 m card is a blob on the
     queue pylon forty metres away and invisible on a relay half a kilometre out. */
  const arriveSize = n => 5.0 + 0.012 * Math.sqrt(n.x * n.x + n.z * n.z + n.y * n.y);
  const NODES = [
    /* concourse: terrace at gMax + 1.6 over a 44x30 footprint (half-diagonal 26.6), three masses
       stepping to +29 above it — the roof terminal sits a metre clear of the top mass */
    nodeAt('concourse', 1.6 + 30.0, 26.6, 3, 16),
    /* queue pylon head: ground + 6.0 in sky-structures; the terminal caps it */
    nodeAt('queuePylon', 6.4, 0),
    /* the centre launch pylon is the tall one (H = 42) and stands exactly on the site */
    nodeAt('launchPylons', 2.4 + 42 + 0.9, 0),
    /* MAHGIC relay: BASE = gMax(r 6, 2 rings, 8 spokes) + 3.2, crystal head at BASE + 51 */
    nodeAt('relayTower', 3.2 + 51.0, 6.0, 2, 8),
    /* cloud stabiliser: FR = gMax(r 8.5) + 9.0, emitter finial at FR + 7.5 */
    nodeAt('stabiliser', 9.0 + 8.0, 8.5, 2, 8),
    /* the two suspended towers are DECLARED floating: their y is absolute and deckSolid() does not
       apply (contract law 1's second clause). Top octahedron at y + 28·S, S = 1.0 and 1.32. */
    nodeAt('suspendedA', 28.0, 0),
    nodeAt('suspendedB', 28.0 * 1.32, 0)
  ];
  const NI = {}; NODES.forEach((n, i) => { NI[n.id] = i; n.size = arriveSize(n); });

  /* ============================================================== 2. ROUTE SPECIFICATIONS
     A spec is endpoints + via points + behaviour. Geometry comes later, once the specs of a layer
     have been sorted, so that setQuality() can drop a PREFIX-uniform random subset (see below). */
  const specs = { below: [], player: [], above: [], far: [] };

  /* ---- PLAYER LEVEL: six connections, and they are the realm's own wiring -----------------------
     Two rules shaped the routing. Nothing crosses the sunset cone, because sector A is the realm's
     breathing room and a beam through it would be the one bright line in the one frame that must
     stay empty (§01, §15). And every span is lifted clear of the cloud it crosses: the via heights
     below are recomputed against the real deck at build, because a chord between two 40 m masts 400 m
     apart sinks straight through a 128 m cloud bank in between. */
  const PLAYER = [
    { id: 'ascent-queue', from: 'concourse', to: 'queuePylon', gauge: 0.9, gain: 1.00, lift: 14,
      via: [{ b: 3.05, r: 82, dy: 20 }] },
    { id: 'ascent-training', from: 'concourse', to: 'launchPylons', gauge: 1.15, gain: 0.94, lift: 40,
      via: [{ b: 2.42, r: 300, dy: 78 }, { b: 1.86, r: 372, dy: 62 }] },
    /* the trunk. It is routed the LONG way round the back of the realm rather than straight, which
       would take it over the arrival apron and through the sunset sightline. */
    { id: 'realm-trunk', from: 'launchPylons', to: 'relayTower', gauge: 1.35, gain: 0.88, lift: 60,
      via: [{ b: 2.20, r: 640, dy: 150 }, { b: 2.90, r: 700, dy: 170 }, { b: -2.55, r: 620, dy: 130 }] },
    { id: 'relay-stabiliser', from: 'relayTower', to: 'stabiliser', gauge: 0.85, gain: 0.90, lift: 26,
      via: [{ b: -1.98, r: 470, dy: 44 }] },
    /* the two beams a resident learning to fly is actually aiming along: relay out to the suspended
       towers, which hang in open air at 210 m and 330 m */
    { id: 'relay-suspendedA', from: 'relayTower', to: 'suspendedA', gauge: 1.05, gain: 0.86, lift: 0,
      via: [{ b: -1.76, r: 700, y: 235 }] },
    { id: 'suspended-chain', from: 'suspendedA', to: 'suspendedB', gauge: 0.95, gain: 0.80, lift: 0,
      via: [{ b: -1.62, r: 1030, y: 300 }] }
  ];
  PLAYER.forEach((s, i) => {
    const a = NODES[NI[s.from]], b = NODES[NI[s.to]];
    const pts = [[a.x, a.y, a.z]];
    s.via.forEach(v => {
      const p = px(v.b, v.r);
      /* an explicit y is an absolute altitude (the floating half of the network); a dy is a
         clearance ABOVE whatever cloud happens to be under the via point */
      const y = v.y != null ? v.y : ground(p.x, p.z) + v.dy;
      pts.push([p.x, y, p.z]);
    });
    pts.push([b.x, b.y, b.z]);
    /* THE CLEARANCE SWEEP. Sample the polyline against the real deck and push any point that would
       pass within `lift` metres of the cloud back up. This is the difference between a beam that
       arcs over a 128 m bank and one that disappears into it for 200 m. */
    if (s.lift > 0) {
      for (let i2 = 1; i2 < pts.length - 1; i2++) {
        const g = ground(pts[i2][0], pts[i2][2]);
        if (pts[i2][1] < g + s.lift) pts[i2][1] = g + s.lift;
      }
    }
    specs.player.push({
      id: s.id, layer: 'player', pts, from: NI[s.from], to: NI[s.to], rank: i / PLAYER.length,
      speed: rr(LAYERS.player.speed[0], LAYERS.player.speed[1]), gauge: s.gauge, gain: s.gain,
      count: Math.round(rr(LAYERS.player.packets[0], LAYERS.player.packets[1])), phase: R()
    });
  });

  /* ---- BELOW: the city's network, seen through the holes in the floor ---------------------------
     Placement is driven by the APERTURES, not by the sectors: a route the player can never see is
     pure cost. Two or three run under each of the four VOIDS, and four more lie beyond the sunset
     cliff where sector A's deck simply stops (§05, §38). Depth runs from −180 m to −700 m against a
     void floor the contract puts at −900, so the network reads as layered rather than as one plane
     of light, and the cloud OCCLUDES all of it — which is what makes a glimpse worth having. */
  VOIDS.forEach((v, vi) => {
    const c = px(v.bearing, v.r);
    const n = vi % 2 === 0 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      /* a long route crossing under the hole on its own heading, so what shows through the aperture
         is a SEGMENT of something much larger */
      const head = R() * Math.PI;
      /* Depth is R()² biased SHALLOW. A hole 120 m across seen from 300 m away at eye height is a
         narrow cone: a route at −650 m only shows from directly above it, while one at −220 m shows
         from most of the deck. So the majority sit shallow and a few go deep, which is what makes
         the glimpse read as a NETWORK at several depths rather than as one plane of light. */
      const len = rr(420, 1150), y = -(180 + R() * R() * 520);
      const ox = (R() - 0.5) * v.radius * 1.1, oz = (R() - 0.5) * v.radius * 1.1;
      const ux = Math.cos(head), uz = Math.sin(head);
      const a = [c.x + ox - ux * len / 2, y, c.z + oz - uz * len / 2];
      const b = [c.x + ox + ux * len / 2, y + rr(-60, 60), c.z + oz + uz * len / 2];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + rr(-40, 70), (a[2] + b[2]) / 2];
      specs.below.push(belowSpec('void' + vi + '-' + i, a, mid, b));
    }
  });
  for (let i = 0; i < 4; i++) {
    /* beyond the cliff: routes that read as horizontal city lines far below the overlook, spread
       across the sunset cone's own half-width so they sit inside the view from the edge */
    const b0 = DECK.cliffBearing + (R() - 0.5) * DECK.cliffHalf * 1.7;
    const r0 = rr(360, 1050), y = -rr(150, 560);
    const span = rr(0.25, 0.75);
    const p0 = px(b0 - span / 2, r0), p1 = px(b0 + span / 2, r0 * rr(0.86, 1.2));
    const pm = px(b0, (r0 + r0) / 2 * rr(0.9, 1.15));
    specs.below.push(belowSpec('cliff-' + i, [p0.x, y, p0.z], [pm.x, y + rr(-30, 55), pm.z], [p1.x, y + rr(-50, 50), p1.z]));
  }
  function belowSpec(id, a, mid, b) {
    const C = LAYERS.below;
    return {
      id, layer: 'below', pts: [a, mid, b], from: -1, to: -1, rank: R(),
      speed: rr(C.speed[0], C.speed[1]), gauge: rr(0.7, 1.4), gain: rr(0.35, 1.0),
      count: Math.round(rr(C.packets[0], C.packets[1])), phase: R(), reverse: R() < 0.5
    };
  }

  /* ---- ABOVE: high-atmosphere routes crossing overhead ------------------------------------------
     Long chords rather than arcs around the player: what sells "there is more world above this one"
     is a line that enters the frame at one edge and leaves at the other. They sit at 500–1500 m,
     which is above every cloud tower in the contract except the two anvils. */
  for (let i = 0; i < COUNT.above; i++) {
    const b0 = (i / COUNT.above + R() * 0.4) * TAU - Math.PI;
    /* the crossing bearing is roughly opposite, jittered, so the set reads as a net and not a fan */
    const b1 = b0 + Math.PI + (R() - 0.5) * 1.9;
    const r0 = rr(700, 2600), r1 = rr(700, 2600);
    const y0 = rr(520, 1500), y1 = rr(520, 1500);
    const p0 = px(b0, r0), p1 = px(b1, r1);
    /* a sag or a bow at midspan; a third of them run nearly straight, so the sky is not a set of
       matching arches (the same correction fobeam.js records for its own distant field) */
    const bow = (R() - 0.42) * 420;
    const mid = [(p0.x + p1.x) / 2 * rr(0.85, 1.15), (y0 + y1) / 2 + bow, (p0.z + p1.z) / 2 * rr(0.85, 1.15)];
    const C = LAYERS.above;
    specs.above.push({
      id: 'high-' + i, layer: 'above', pts: [[p0.x, y0, p0.z], mid, [p1.x, y1, p1.z]], from: -1, to: -1, rank: R(),
      speed: rr(C.speed[0], C.speed[1]), gauge: rr(0.6, 1.5), gain: rr(0.3, 1.0),
      count: Math.round(rr(C.packets[0], C.packets[1])), phase: R(), reverse: R() < 0.5
    });
  }

  /* ---- FAR: the MAHGIC field near the horizon ----------------------------------------------------
     Bearings are drawn so the field's DENSITY IS EXACTLY PROPORTIONAL to the contract's own
     directional weighting, layout.sectorMix(bearing, 'stars') — 1.00 on the cold side, 0.35 over
     arrival, 0.22 over the training flats, 0.10 across the sunset. That keeps the network densest
     where the brief asks (§20) and nearly absent from the realm's breathing room (§01, §15) without
     a second table of numbers here that could drift out of step with the sector plan.

     It is done by inverse-CDF sampling and not by "draw three candidates and keep the densest",
     which is what the first pass did: MEASURED, that max-filter collapsed the whole field onto
     sector D and left sectors A and C with 0.3 % and 0 % of the routes — a hard edge where the
     contract asks for a gradient. Stratifying u over [0,1) also guarantees the 54 routes are spread
     rather than clumped by luck.

     Altitude is R()² biased so most routes hug the horizon and only a few climb. */
  const CDF_N = 192, cdf = new Float32Array(CDF_N + 1);
  for (let i = 0; i < CDF_N; i++) cdf[i + 1] = cdf[i] + layout.sectorMix(((i + 0.5) / CDF_N) * TAU - Math.PI, 'stars');
  for (let i = 0; i <= CDF_N; i++) cdf[i] /= cdf[CDF_N];
  function starBearing(u) {
    let lo = 0, hi = CDF_N - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid + 1] < u) lo = mid + 1; else hi = mid; }
    const seg = cdf[lo + 1] - cdf[lo] || 1;
    return ((lo + clamp01((u - cdf[lo]) / seg)) / CDF_N) * TAU - Math.PI;
  }
  for (let i = 0; i < COUNT.far; i++) {
    const b0 = starBearing((i + R()) / COUNT.far);
    const span = rr(0.06, 0.30);
    const rA = rr(2400, 7500), rB = rA * rr(0.68, 1.34);
    const yA = 60 + R() * R() * 760, yB = 60 + R() * R() * 760;
    const pA = px(b0 - span * rr(0.3, 0.7), rA), pB = px(b0 + span * rr(0.3, 0.7), rB);
    const bow = (R() - 0.45) * 260;
    const mid = [(pA.x + pB.x) / 2 * rr(0.92, 1.1), (yA + yB) / 2 + bow, (pA.z + pB.z) / 2 * rr(0.92, 1.1)];
    const C = LAYERS.far;
    specs.far.push({
      id: 'field-' + i, layer: 'far', pts: [[pA.x, yA, pA.z], mid, [pB.x, yB, pB.z]], from: -1, to: -1,
      /* the rank is INDEPENDENT of bearing and altitude, which is the property setQuality() needs:
         sorting by it makes any prefix of the layer a uniformly random subset of the whole, so
         dropping half the routes thins the field evenly instead of deleting one side of the sky */
      rank: R(),
      speed: rr(C.speed[0], C.speed[1]), gauge: rr(0.55, 1.5), gain: 0.18 + R() * R() * 0.9,
      count: Math.round(rr(C.packets[0], C.packets[1])), phase: R(), reverse: R() < 0.5
    });
  }
  specs.below.sort((a, b) => a.rank - b.rank);
  specs.above.sort((a, b) => a.rank - b.rank);
  specs.far.sort((a, b) => a.rank - b.rank);

  /* ================================================================ 3. MATERIALS
     Beam colour is ENERGY and belongs to the world Theme — setTheme() repaints these and nothing
     else in the realm. The rails are per-layer so each can answer time of day at its own rate; the
     packets and lights share one material each and carry their brightness per instance. */
  function mk(name, colour, opacity, fog, order) {
    const m = new THREE.MeshBasicMaterial({
      color: colour, vertexColors: true, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog
    });
    m.name = name; owned.materials.push(m); return m;
  }
  const railMats = {
    below: mk('skybeam-rail-below', theme0.energy, LAYERS.below.rail, false, 4),
    player: mk('skybeam-rail-player', theme0.energyLight, LAYERS.player.rail, true, 7),
    above: mk('skybeam-rail-above', theme0.energy, LAYERS.above.rail, false, 5),
    far: mk('skybeam-rail-far', theme0.energy, LAYERS.far.rail, false, 3)
  };
  const fieldMat = mk('skybeam-field', theme0.energy, LAYERS.player.field, true, 6);
  const glowTex = glowTexture(); owned.textures.push(glowTex);
  const packetMat = new THREE.MeshBasicMaterial({ color: theme0.energyLight, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: false });
  const lightMat = new THREE.MeshBasicMaterial({ map: glowTex, color: theme0.energy, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: false });
  const arriveMat = new THREE.MeshBasicMaterial({ map: glowTex, color: theme0.energyLight, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: false });
  packetMat.name = 'skybeam-packet'; lightMat.name = 'skybeam-light'; arriveMat.name = 'skybeam-arrival';
  owned.materials.push(packetMat, lightMat, arriveMat);

  /* ================================================================ 4. GEOMETRY
     One merged rail mesh per layer. Brightness is baked into vertex colour (fade at both ends so a
     route ARRIVES rather than stops, a swell through the middle, the layer's own gain, and the
     distance haze); the atmospheric tint is applied on top of it in repaintTint(). */
  const SAMPLES = { player: 128, below: 64, above: 64, far: 48 };
  const layerRecs = [];

  function paintTube(geo, ts, rs, fn) {
    const n = geo.attributes.position.count, col = new Float32Array(n * 3), stride = rs + 1;
    for (let v = 0; v < n; v++) { const c = fn(Math.floor(v / stride) / ts); col[v * 3] = c; col[v * 3 + 1] = c; col[v * 3 + 2] = c; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }

  for (const name of ['far', 'below', 'above', 'player']) {
    const C = LAYERS[name], list = specs[name];
    const rec = {
      name, cfg: C, routes: [], packets: [], vertEnd: new Uint32Array(list.length),
      packetEnd: new Uint32Array(list.length), fixed: name === 'player',
      activeRoutes: list.length, activePackets: 0
    };
    const railParts = [], fieldParts = [];
    let verts = 0, pk = 0;

    list.forEach((spec) => {
      const pts = spec.pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
      if (spec.reverse) pts.reverse();
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
      /* cache the path ONCE — arc-length spaced points and their tangents. update() interpolates and
         nothing else; no curve is evaluated in a frame (§45). */
      const SEG = SAMPLES[name];
      const sample = curve.getSpacedPoints(SEG);
      const pxA = new Float32Array((SEG + 1) * 3), txA = new Float32Array((SEG + 1) * 3);
      for (let i = 0; i <= SEG; i++) { pxA[i * 3] = sample[i].x; pxA[i * 3 + 1] = sample[i].y; pxA[i * 3 + 2] = sample[i].z; }
      for (let i = 0; i <= SEG; i++) {
        const i0 = Math.max(0, i - 1) * 3, i1 = Math.min(SEG, i + 1) * 3;
        const dx = pxA[i1] - pxA[i0], dy = pxA[i1 + 1] - pxA[i0 + 1], dz = pxA[i1 + 2] - pxA[i0 + 2];
        const l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        txA[i * 3] = dx / l; txA[i * 3 + 1] = dy / l; txA[i * 3 + 2] = dz / l;
      }
      const route = {
        id: spec.id, layer: name, seg: SEG, px: pxA, tx: txA, len: curve.getLength(),
        speed: spec.speed, gauge: spec.gauge, gain: spec.gain, from: spec.from, to: spec.to, count: spec.count
      };
      rec.routes.push(route);

      /* The painted value is RELATIVE — the route's own gain and its end fades, peaking near 1. The
         LAYER's level lives in the material opacity and nowhere else. (The first pass multiplied
         C.rail in here as well as into the material and every distant beam came out at 4 % of the
         intended value; measured at 0.014 on the far layer, then fixed.) A route ARRIVES rather than
         stops, which is what the two smoothsteps buy. */
      const rail = new THREE.TubeGeometry(curve, C.ts, C.railR, C.rs, false);
      paintTube(rail, C.ts, C.rs, u => spec.gain * (0.80 + 0.20 * Math.sin(Math.PI * u)) * smoothstep(0, 0.05, u) * smoothstep(0, 0.05, 1 - u));
      railParts.push(rail);
      verts += C.ts * C.rs * 6;                     /* non-indexed vertices this tube contributes */
      rec.vertEnd[rec.routes.length - 1] = verts;

      if (C.fieldR > 0) {
        const field = new THREE.TubeGeometry(curve, C.fts, C.fieldR, C.frs, false);
        paintTube(field, C.fts, C.frs, u => spec.gain * (0.45 + 0.55 * Math.sin(Math.PI * u)) * smoothstep(0, 0.12, u) * smoothstep(0, 0.12, 1 - u));
        fieldParts.push(field);
      }

      /* packets: never evenly spaced. The jitter is a full slot wide, so a route never falls into a
         marching rhythm and no two packets anywhere share a speed — asynchrony is the point (§20). */
      const ri = rec.routes.length - 1;
      for (let i = 0; i < spec.count; i++) {
        const jitter = (R() - 0.5) * 0.92 / spec.count;
        rec.packets.push({
          r: ri,
          s: (((i / spec.count + spec.phase + jitter) % 1) + 1) % 1 * route.len,
          speed: spec.speed * (0.80 + R() * 0.45),
          size: rr(C.pSize[0], C.pSize[1]) * spec.gauge,
          gain: (0.70 + R() * 0.36) * C.packet * spec.gain,
          b: 0
        });
        pk++;
      }
      rec.packetEnd[rec.routes.length - 1] = pk;
    });

    /* ---- the merged rail, its haze and its tint lookup ---- */
    const railGeo = own(mergeGeos(railParts));
    const n = railGeo.attributes.position.count;
    const pos = railGeo.attributes.position.array, col = railGeo.attributes.color.array;
    rec.base = new Float32Array(n);
    rec.bucket = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      let b = col[i * 3];
      if (C.haze) {
        /* distance is measured from the WORLD ORIGIN rather than the camera: the player's cameras all
           stand within ~300 m of it, and at the kilometre scale this layer lives at, that error is
           smaller than the width of the beam. It also means the haze can be BAKED, which is the whole
           reason this layer can run with fog disabled. */
        const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
        const d = Math.sqrt(x * x + y * y + z * z);
        b *= 1 - smoothstep(C.haze[0], C.haze[1], d);
      }
      rec.base[i] = b;
      rec.bucket[i] = Math.min(TINT_BUCKETS - 1, Math.floor(((Math.atan2(pos[i * 3], -pos[i * 3 + 2]) / TAU) + 0.5) * TINT_BUCKETS));
    }
    const railMesh = new THREE.Mesh(railGeo, railMats[name]);
    railMesh.name = 'sky-beams-rail-' + name;
    railMesh.renderOrder = C.order; railMesh.frustumCulled = false;
    group.add(railMesh);
    rec.railGeo = railGeo; rec.railMesh = railMesh;

    if (fieldParts.length) {
      const fieldGeo = own(mergeGeos(fieldParts));
      const fm = new THREE.Mesh(fieldGeo, fieldMat);
      fm.name = 'sky-beams-field'; fm.renderOrder = C.order - 1; fm.frustumCulled = false;
      group.add(fm);
      rec.fieldMesh = fm;
    }

    /* ---- packets and their travelling lights, one InstancedMesh each per layer ----
       Per layer rather than one for the whole module, so setQuality() can cut a layer's instance
       count to a prefix that exactly matches the routes it just dropped. */
    const N = rec.packets.length;
    rec.diamondGeo = own(new THREE.OctahedronGeometry(1, 0));    /* a square rotated 45° in its own plane: the reserved mark */
    const pm = new THREE.InstancedMesh(rec.diamondGeo, packetMat, Math.max(1, N));
    pm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    pm.name = 'sky-beams-packets-' + name; pm.renderOrder = C.order + 10; pm.frustumCulled = false;
    rec.lightGeo = own(new THREE.PlaneGeometry(1, 1));
    const lm = new THREE.InstancedMesh(rec.lightGeo, lightMat, Math.max(1, N));
    lm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    lm.name = 'sky-beams-lights-' + name; lm.renderOrder = C.order + 11; lm.frustumCulled = false;
    group.add(pm, lm);
    rec.packetMesh = pm; rec.lightMesh = lm; rec.activePackets = N;
    const white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < N; i++) { pm.setColorAt(i, white); lm.setColorAt(i, white); }
    rec.state = { pos: new Float32Array(N * 3), tan: new Float32Array(N * 3) };
    layerRecs.push(rec);
  }
  const playerRec = layerRecs.find(r => r.name === 'player');

  /* ================================================================ 5. ARRIVAL BRIGHTENING
     Every player-level route ends at a real structure, and a transfer should be VISIBLE: the node
     brightens for about 0.4 s when a packet lands. Deliberately only a glow and no new geometry —
     sky-structures already puts a lit head on the relay, an energy finial on each pylon and a lit
     crown on the queue pylon, and stacking a second solid beacon on top of those would double the
     one thing the realm is careful about. No new lights either (§37). */
  const arriveGeo = own(new THREE.PlaneGeometry(1, 1));
  const arriveMesh = new THREE.InstancedMesh(arriveGeo, arriveMat, NODES.length);
  arriveMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  arriveMesh.name = 'sky-beams-arrivals'; arriveMesh.renderOrder = 19; arriveMesh.frustumCulled = false;
  group.add(arriveMesh);
  {
    const w = new THREE.Color(1, 1, 1);
    for (let i = 0; i < NODES.length; i++) arriveMesh.setColorAt(i, w);
  }

  if (scene && !group.parent) scene.add(group);

  /* ================================================================ 6. FRAME — zero allocation */
  const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _view = new THREE.Vector3();
  const _nrm = new THREE.Vector3(), _bin = new THREE.Vector3(), _mat = new THREE.Matrix4();
  const _cam = new THREE.Vector3(0, 40, 0), _up = new THREE.Vector3(0, 1, 0), _side = new THREE.Vector3();
  const _c = new THREE.Color();
  let lastT = -1;

  function sampleAt(r, s, outP, outT) {
    const SEG = r.seg;
    const u = clamp01(s / r.len) * SEG, i0 = Math.min(SEG - 1, Math.floor(u)), f = u - i0, a = i0 * 3, b = a + 3;
    outP.set(r.px[a] + (r.px[b] - r.px[a]) * f, r.px[a + 1] + (r.px[b + 1] - r.px[a + 1]) * f, r.px[a + 2] + (r.px[b + 2] - r.px[a + 2]) * f);
    outT.set(r.tx[a] + (r.tx[b] - r.tx[a]) * f, r.tx[a + 1] + (r.tx[b + 1] - r.tx[a + 1]) * f, r.tx[a + 2] + (r.tx[b + 2] - r.tx[a + 2]) * f).normalize();
  }

  function step(t, dt) {
    if (t === lastT) return;
    lastT = t;
    dt = dt > 0 ? Math.min(dt, 0.1) : 0.016;
    for (let li = 0; li < layerRecs.length; li++) {
      const rec = layerRecs[li], N = rec.activePackets;
      if (!N) continue;
      const pmC = rec.packetMesh.instanceColor, lmC = rec.lightMesh.instanceColor;
      for (let i = 0; i < N; i++) {
        const pk = rec.packets[i], r = rec.routes[pk.r];
        pk.s += pk.speed * dt;
        if (pk.s >= r.len) {
          pk.s -= r.len;
          /* a transfer: the destination brightens hard, the origin acknowledges. Only the player
             layer has real terminals; the distant layers simply wrap. */
          if (r.to >= 0) NODES[r.to].flash = 1;
          if (r.from >= 0) NODES[r.from].flash = Math.max(NODES[r.from].flash, 0.5);
        }
        sampleAt(r, pk.s, _p, _t);
        const a = i * 3;
        rec.state.pos[a] = _p.x; rec.state.pos[a + 1] = _p.y; rec.state.pos[a + 2] = _p.z;
        rec.state.tan[a] = _t.x; rec.state.tan[a + 1] = _t.y; rec.state.tan[a + 2] = _t.z;
        /* enter → travel → transfer: brightness rises through the middle and fades at both ends, so
           a packet arrives and departs instead of blinking into existence */
        const u = pk.s / r.len;
        pk.b = pk.gain * dim * (0.5 + 0.5 * Math.sin(Math.PI * u)) * smoothstep(0, 0.09, u) * smoothstep(0, 0.09, 1 - u);
        pmC.setXYZ(i, pk.b, pk.b, pk.b);
        const lb = pk.b * 0.8;
        lmC.setXYZ(i, lb, lb, lb);
      }
      pmC.needsUpdate = true; lmC.needsUpdate = true;
    }
    /* the terminals decay over ~0.42 s — a local brightening, never an explosion */
    const ac = arriveMesh.instanceColor;
    for (let i = 0; i < NODES.length; i++) {
      const n = NODES[i];
      if (n.flash > 0) n.flash = Math.max(0, n.flash - dt / 0.42);
      const v = (n.flash * n.flash * 0.95 + 0.05) * dim;
      ac.setXYZ(i, v, v, v);
    }
    ac.needsUpdate = true;
  }

  /* Orient every packet: the long axis follows the path and the roll is billboarded, so a diamond
     never reads as an edge-on sliver. Done where the camera is known, exactly as fobeam.js does. */
  function orient(camera) {
    const cam = camera || (ctx && ctx.camera);
    if (cam && cam.isCamera) _cam.setFromMatrixPosition(cam.matrixWorld);
    for (let li = 0; li < layerRecs.length; li++) {
      const rec = layerRecs[li], N = rec.activePackets;
      if (!N) continue;
      for (let i = 0; i < N; i++) {
        const pk = rec.packets[i], a = i * 3;
        _p.set(rec.state.pos[a], rec.state.pos[a + 1], rec.state.pos[a + 2]);
        _t.set(rec.state.tan[a], rec.state.tan[a + 1], rec.state.tan[a + 2]);
        _view.subVectors(_p, _cam).normalize();
        const d = _view.dot(_t);
        _nrm.copy(_view).addScaledVector(_t, -d);
        if (_nrm.lengthSq() < 1e-5) { _nrm.set(0, 1, 0).addScaledVector(_t, -_t.y); if (_nrm.lengthSq() < 1e-5) _nrm.set(0, 0, 1); }
        _nrm.normalize().negate();
        _bin.crossVectors(_nrm, _t).normalize();
        const s = pk.size;
        _mat.set(
          _t.x * s * 1.18, _bin.x * s, _nrm.x * s * 0.26, _p.x,
          _t.y * s * 1.18, _bin.y * s, _nrm.y * s * 0.26, _p.y,
          _t.z * s * 1.18, _bin.z * s, _nrm.z * s * 0.26, _p.z,
          0, 0, 0, 1
        );
        rec.packetMesh.setMatrixAt(i, _mat);
        const Lc = s * 5.2, W = s * 2.2;      /* the travelling light: an elongated ellipse ON the path */
        _mat.set(
          _t.x * Lc, _bin.x * W, _nrm.x, _p.x,
          _t.y * Lc, _bin.y * W, _nrm.y, _p.y,
          _t.z * Lc, _bin.z * W, _nrm.z, _p.z,
          0, 0, 0, 1
        );
        rec.lightMesh.setMatrixAt(i, _mat);
      }
      rec.packetMesh.instanceMatrix.needsUpdate = true;
      rec.lightMesh.instanceMatrix.needsUpdate = true;
    }
    /* the arrival cards face the camera; they are seven quads and the cost is noise */
    for (let i = 0; i < NODES.length; i++) {
      const n = NODES[i];
      _p.set(n.x, n.y, n.z);
      _view.subVectors(_cam, _p).normalize();
      _side.crossVectors(_up, _view);
      if (_side.lengthSq() < 1e-6) _side.set(1, 0, 0); else _side.normalize();
      _nrm.crossVectors(_view, _side).normalize();
      const s = n.size;
      _mat.set(
        _side.x * s, _nrm.x * s, _view.x, n.x,
        _side.y * s, _nrm.y * s, _view.y, n.y,
        _side.z * s, _nrm.z * s, _view.z, n.z,
        0, 0, 0, 1
      );
      arriveMesh.setMatrixAt(i, _mat);
    }
    arriveMesh.instanceMatrix.needsUpdate = true;
  }

  /* ================================================================ 7. TIME, THEME, QUALITY */
  let dim = 1, band = null, bandKey = '';

  /* The atmospheric tint. atmosphere() is asked for 48 bearings per tinted layer, not for 56 000
     vertices, and the result is applied through the per-vertex bucket recorded at build. The tint is
     NORMALISED (its brightest channel becomes 1) so it only ever shifts a beam's HUE toward the sky
     it hangs in — it must not darken the network, which is energy and has its own value. */
  const lut = new Float32Array(TINT_BUCKETS * 3);
  function repaintTint() {
    if (!band) return;
    for (const rec of layerRecs) {
      const C = rec.cfg;
      if (C.tint <= 0.001) continue;
      for (let b = 0; b < TINT_BUCKETS; b++) {
        const bearing = ((b + 0.5) / TINT_BUCKETS - 0.5) * TAU;
        layout.atmosphere(bearing, C.elev, band, _c);
        const mx = Math.max(_c.r, _c.g, _c.b) || 1;
        lut[b * 3] = 1 + (_c.r / mx - 1) * C.tint;
        lut[b * 3 + 1] = 1 + (_c.g / mx - 1) * C.tint;
        lut[b * 3 + 2] = 1 + (_c.b / mx - 1) * C.tint;
      }
      const col = rec.railGeo.attributes.color.array, base = rec.base, bk = rec.bucket, n = base.length;
      for (let i = 0; i < n; i++) {
        const v = base[i], o = bk[i] * 3;
        col[i * 3] = v * lut[o]; col[i * 3 + 1] = v * lut[o + 1]; col[i * 3 + 2] = v * lut[o + 2];
      }
      rec.railGeo.attributes.color.needsUpdate = true;
    }
  }

  function setTime(clockState, bandIn) {
    const cs = clockState || {};
    band = bandIn || layout.atmoBand(cs);
    const day = typeof cs.daylight === 'number' ? clamp01(cs.daylight) : 0.25;
    /* A layer's day fade is its own: the player-level wiring must stay legible in full daylight
       because it is architecture, while the distant field is a night and twilight phenomenon and
       washing it out by day is correct rather than a loss. */
    for (const rec of layerRecs) {
      const C = rec.cfg;
      railMats[rec.name].opacity = C.rail * (1 - C.dayFade * day);
      if (rec.name === 'player') fieldMat.opacity = C.field * (1 - C.dayFade * day);
    }
    dim = 1 - 0.42 * day;                 /* packets and terminals stay present by day; they are the motion */
    packetMat.opacity = 0.92 * (1 - 0.30 * day);
    lightMat.opacity = 0.5 * (1 - 0.45 * day);
    arriveMat.opacity = 0.55 * (1 - 0.40 * day);
    /* the tint repaint touches ~56 000 vertices, so it runs only when the sky has actually moved */
    const key = (band.a || band) + '>' + (band.b || band) + ':' + Math.round((band.t || 0) * 24);
    if (key !== bandKey) { bandKey = key; repaintTint(); }
    return cs;
  }

  function setTheme(t) {
    if (!t || !t.energy) return t;
    /* ENERGY ONLY. Nothing about the sky, the cloud, the stars or the peaks is touched here — the
       beams are the one thing in this module the world Theme owns, and it owns all of it. */
    railMats.player.color.setHex(t.energyLight);
    railMats.below.color.setHex(t.energy);
    railMats.above.color.setHex(t.energy);
    railMats.far.color.setHex(t.energy);
    fieldMat.color.setHex(t.energy);
    packetMat.color.setHex(t.energyLight);
    lightMat.color.setHex(t.energy);
    arriveMat.color.setHex(t.energyLight);
    return t;
  }

  /* Density scales with layout.QUALITY[tier].beams — by DRAW RANGE and INSTANCE COUNT, never by
     rebuilding a buffer, so switching tier mid-session costs nothing. The player layer is exempt: it
     is the realm's own wiring and losing it at 'low' would disconnect the architecture. */
  function setQuality(t) {
    if (QUALITY[t]) tier = t;
    const k = QUALITY[tier].beams;
    for (const rec of layerRecs) {
      const total = rec.routes.length;
      const n = rec.fixed ? total : Math.max(1, Math.round(total * k));
      rec.activeRoutes = n;
      rec.railGeo.setDrawRange(0, rec.vertEnd[n - 1]);
      rec.activePackets = rec.packetEnd[n - 1];
      rec.packetMesh.count = Math.max(1, rec.activePackets);
      rec.lightMesh.count = Math.max(1, rec.activePackets);
    }
    measure();
    return tier;
  }

  function update(t, dt, camera) { step(t, dt); orient(camera); }

  function dispose() {
    if (group.parent) group.parent.remove(group);
    for (const rec of layerRecs) { rec.packetMesh.dispose(); rec.lightMesh.dispose(); }
    arriveMesh.dispose();
    owned.geometries.forEach(g => g.dispose());
    owned.materials.forEach(m => m.dispose());
    owned.textures.forEach(x => x.dispose());
    group.clear();
  }

  /* ================================================================ 8. MEASURED cost (§45, §46) */
  const stats = {
    module: 'sky-beams',
    get tier() { return tier; },
    drawCalls: 0, triangles: 0, trianglesPeak: 0,
    layers: {}, nodes: NODES.length,
    routes: 0, packets: 0,
    get bandKey() { return bandKey; }
  };
  function measure() {
    stats.drawCalls = 0; stats.triangles = 0; stats.trianglesPeak = 0;
    stats.routes = 0; stats.packets = 0;
    group.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry;
      const full = g.index ? g.index.count : g.attributes.position.count;
      /* the drawn range, not the resident buffer: setQuality() culls by draw range and a cost report
         that ignores it would be reporting a build rather than a frame */
      const dr = g.drawRange, ranged = (dr && isFinite(dr.count)) ? Math.min(dr.count, full) : full;
      const inst = o.isInstancedMesh ? o.count : 1;
      const peak = o.isInstancedMesh ? full * o.instanceMatrix.count : full;
      if (o.visible) { stats.drawCalls++; stats.triangles += Math.round(ranged * inst / 3); }
      stats.trianglesPeak += Math.round(peak / 3);
    });
    for (const rec of layerRecs) {
      stats.layers[rec.name] = {
        routes: rec.routes.length, active: rec.activeRoutes,
        packets: rec.packets.length, activePackets: rec.activePackets,
        railRadius: rec.cfg.railR, tint: rec.cfg.tint
      };
      stats.routes += rec.activeRoutes;
      stats.packets += rec.activePackets;
    }
    return stats;
  }

  /* ---- finish ---- */
  setTheme(theme0);
  setTime((ctx && ctx.clock && ctx.clock.state) ? ctx.clock.state() : { band: 'dusk', daylight: 0.25, sunElevation: 0.055 });
  setQuality(tier);
  step(0, 0.016); orient(ctx && ctx.camera);
  measure();

  return {
    group, setTime, setTheme, update, setQuality, dispose, stats,
    /* the player-level terminals, so a future module can plug into the same network */
    nodes: NODES.map(n => ({ id: n.id, x: n.x, y: n.y, z: n.z })),
    measure
  };
}

export default buildSkyBeams;
