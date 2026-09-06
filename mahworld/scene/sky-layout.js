/* MAHWORLD :: UPPER REALM — THE SPATIAL AND ATMOSPHERIC CONTRACT.

   This module builds nothing. It is the single agreement every other upper-realm module reads so
   that four directional sectors read as ONE biome under ONE sky rather than as four maps stitched
   together (§42, §48). If two modules ever disagree about where the cloud floor is, what colour the
   sky is at a bearing, or which sector a thing stands in, the bug is here and nowhere else.

   WHAT IT OWNS
     - the bearing convention and the four sectors, with SMOOTH blending between them
     - atmosphere(bearing, elevation, band) — the one directional sky function
     - deckHeight(x, z) / deckSolid(x, z) — the cloud floor as terrain
     - SITES — the named world positions every builder must use
     - the shared seeded RNG, so two modules asked for "cloud 7" get the same cloud

   BEARING CONVENTION. Measured from the −Z axis, positive turning toward +X, matching the lower
   world's cameras (which look down −Z). So bearing 0 is dead ahead on arrival, +PI/2 is the
   player's right, −PI/2 the left, PI directly behind.

     dir(bearing) = ( sin b, 0, −cos b )
     bearingOf(x, z) = atan2(x, −z)

   THE SECTOR PLAN (§02). The player ARRIVES facing the sunset with the ascent infrastructure at
   their back, which is the whole drama of the place: you step out of a pod and the first thing in
   front of you is an ocean of cloud with the sun going down into it. Turning around is how you
   discover the rest (§53).

     A  SUNSET / OPEN HORIZON      bearing 0        the warm ocean, almost no architecture
     B  ASCENT / ARRIVAL           bearing PI       pads, concourse, staging — behind you
     C  TRAINING / PVP EXPANSE     bearing +1.75    the open right-hand flats
     D  HIGH-CLOUD / CRYSTALLINE   bearing −1.75    cool, vertical, strange — the left backside

   The half-spans deliberately overlap and total more than 2PI, because a sector is a centre of
   gravity for lighting and content, not a fence. sectorWeights() returns a normalised blend. */

const TAU = Math.PI * 2;
export const HALF_PI = Math.PI / 2;

/* ------------------------------------------------------------------ bearings */
export function dir(bearing, out) {
  const x = Math.sin(bearing), z = -Math.cos(bearing);
  if (out) { out.set(x, 0, z); return out; }
  return { x, y: 0, z };
}
export function bearingOf(x, z) { return Math.atan2(x, -z); }
/* shortest signed angle from a to b, in (−PI, PI] */
export function angleDelta(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d <= -Math.PI) d += TAU; return d; }

/* ------------------------------------------------------------------- sectors */
export const SECTORS = Object.freeze([
  Object.freeze({
    id: 'A', name: 'sunset', bearing: 0, half: 1.15,
    /* how this sector is lit and what may stand in it */
    warm: 1.00, open: 1.00, architecture: 0.05, cloudDensity: 0.55, cloudVertical: 0.15, stars: 0.10,
    note: 'the warm cloud ocean and the low sun; scenic breathing room, almost nothing built'
  }),
  Object.freeze({
    id: 'B', name: 'arrival', bearing: Math.PI, half: 0.80,
    warm: 0.42, open: 0.35, architecture: 1.00, cloudDensity: 0.80, cloudVertical: 0.35, stars: 0.35,
    note: 'ascent pads, concourse, observation, staging — the only dense architecture in the realm'
  }),
  Object.freeze({
    id: 'C', name: 'training', bearing: 1.75, half: 0.85,
    warm: 0.62, open: 0.92, architecture: 0.30, cloudDensity: 0.62, cloudVertical: 0.22, stars: 0.22,
    note: 'the open flats: sparring, flight lanes, target work; large distances, few obstacles'
  }),
  Object.freeze({
    id: 'D', name: 'highcloud', bearing: -1.75, half: 0.85,
    warm: 0.06, open: 0.45, architecture: 0.35, cloudDensity: 1.00, cloudVertical: 1.00, stars: 1.00,
    note: 'cool violet backside: cloud towers, canyons, suspended structures, upper atmosphere'
  })
]);
export const SECTOR_OF = Object.freeze(SECTORS.reduce((o, s) => { o[s.id] = s; return o; }, {}));

/* Smooth membership of every sector at a bearing, normalised to sum 1. A raised-cosine falloff over
   1.55x the half-span, so neighbours always overlap and nothing is ever assigned to "no sector" —
   this is what makes the lighting change continuously as the player turns (§41, §48). */
const _w = [0, 0, 0, 0];
export function sectorWeights(bearing, out) {
  const w = out || _w;
  let sum = 0;
  for (let i = 0; i < SECTORS.length; i++) {
    const s = SECTORS[i];
    const d = Math.abs(angleDelta(s.bearing, bearing)) / (s.half * 1.55);
    const v = d >= 1 ? 0 : 0.5 + 0.5 * Math.cos(d * Math.PI);
    w[i] = v; sum += v;
  }
  if (sum < 1e-6) { for (let i = 0; i < 4; i++) w[i] = 0.25; return w; }
  for (let i = 0; i < 4; i++) w[i] /= sum;
  return w;
}
/* the blended value of one sector property at a bearing — the way every module should ask
   "how warm / how open / how vertical is it over there" */
export function sectorMix(bearing, key) {
  const w = sectorWeights(bearing);
  let v = 0;
  for (let i = 0; i < SECTORS.length; i++) v += w[i] * SECTORS[i][key];
  return v;
}
export function dominantSector(bearing) {
  const w = sectorWeights(bearing);
  let best = 0;
  for (let i = 1; i < 4; i++) if (w[i] > w[best]) best = i;
  return SECTORS[best];
}

/* ----------------------------------------------------------------------- sun */
/* The sun sits low in sector A and, at the realm's signature hour, just above the cloud line.
   sunElevationFor() lets the page drive dawn/day/dusk/night from the shared world clock while the
   AZIMUTH stays pinned to sector A — the sunset direction is a fact about this place, not a time. */
export const SUN_BEARING = 0;
export const SUN_ELEV = Object.freeze({ night: -0.22, dawn: 0.045, day: 0.62, dusk: 0.055 });
export function sunDirection(band, out) {
  const e = SUN_ELEV[band] != null ? SUN_ELEV[band] : SUN_ELEV.dusk;
  const d = dir(SUN_BEARING);
  const c = Math.cos(e), s = Math.sin(e);
  if (out) { out.set(d.x * c, s, d.z * c).normalize(); return out; }
  return { x: d.x * c, y: s, z: d.z * c };
}

/* --------------------------------------------------------------- atmosphere */
/* ONE directional sky. Not four backgrounds (§42). Every colour in the realm's dome, fog, fill light
   and cloud tint comes through here, so "facing the sun is warm, 90 deg round is rose, facing away
   is violet" (§41) is a structural property of the world rather than something painted by hand.

   Each band gives three stops per sector — the horizon, the mid sky and the zenith — plus the fill
   colour a builder should use for ambient bounce in that direction. A sector's stops are its
   IDENTITY; the blend between them is what the player sees while turning. */
export const ATMO = Object.freeze({
  dusk: Object.freeze({
    A: { horizon: 0xffb27a, mid: 0xe08aa4, zenith: 0x6d6bb0, fill: 0xffc59a },
    B: { horizon: 0xc79ac2, mid: 0x8d7ec2, zenith: 0x4f56a0, fill: 0xcbb6dd },
    C: { horizon: 0xe9a894, mid: 0xa887bd, zenith: 0x5a5faa, fill: 0xe3b4b0 },
    D: { horizon: 0x8f7ec0, mid: 0x5b5aa8, zenith: 0x2f3277, fill: 0x9fa8dd },
    sun: 0xfff0da, sunI: 2.35, hemiI: 1.15, exposure: 1.02, stars: 0.30, void: 0x4a3f74
  }),
  day: Object.freeze({
    A: { horizon: 0xeaf3ff, mid: 0x9dc2ee, zenith: 0x4d84cf, fill: 0xf2f7ff },
    B: { horizon: 0xdbe8fa, mid: 0x93b7e6, zenith: 0x4576c2, fill: 0xe7eefb },
    C: { horizon: 0xe4eefc, mid: 0x99bdea, zenith: 0x487dc9, fill: 0xecf2fd },
    D: { horizon: 0xc9d9f2, mid: 0x7fa4dc, zenith: 0x335eae, fill: 0xd6e2f6 },
    sun: 0xfffdf6, sunI: 3.30, hemiI: 0.90, exposure: 0.98, stars: 0.00, void: 0x6f86b4
  }),
  night: Object.freeze({
    A: { horizon: 0x35507f, mid: 0x1d2c53, zenith: 0x0b1230, fill: 0x4a6699 },
    B: { horizon: 0x2b4272, mid: 0x18244a, zenith: 0x090f2a, fill: 0x3f5a8e },
    C: { horizon: 0x2f4676, mid: 0x1a274d, zenith: 0x0a1029, fill: 0x43608f },
    D: { horizon: 0x24356a, mid: 0x131c42, zenith: 0x060a22, fill: 0x354e86 },
    sun: 0xcfe0ff, sunI: 1.30, hemiI: 1.30, exposure: 1.05, stars: 1.00, void: 0x101838
  }),
  dawn: Object.freeze({
    A: { horizon: 0xffc9a6, mid: 0xd8a2b8, zenith: 0x666cb4, fill: 0xffd8bb },
    B: { horizon: 0xc2a6cf, mid: 0x8c85c6, zenith: 0x4b58a4, fill: 0xcabfe0 },
    C: { horizon: 0xe6b8ae, mid: 0xa593c4, zenith: 0x5663ae, fill: 0xdec2c2 },
    D: { horizon: 0x8e8ac6, mid: 0x5a63ac, zenith: 0x2d367c, fill: 0x9fb0e0 },
    sun: 0xffeede, sunI: 2.10, hemiI: 1.10, exposure: 1.02, stars: 0.35, void: 0x4c4a7e
  })
});

/* Blend the four sector stops at a bearing, then blend horizon → mid → zenith by elevation.
   `out` should be a THREE.Color; passing one avoids allocating in a vertex loop. */
export function atmosphere(bearing, elevation, band, out) {
  const K = ATMO[band] || ATMO.dusk;
  const w = sectorWeights(bearing);
  let hr = 0, hg = 0, hb = 0, mr = 0, mg = 0, mb = 0, zr = 0, zg = 0, zb = 0;
  for (let i = 0; i < SECTORS.length; i++) {
    const k = K[SECTORS[i].id], f = w[i];
    hr += ((k.horizon >> 16) & 255) * f; hg += ((k.horizon >> 8) & 255) * f; hb += (k.horizon & 255) * f;
    mr += ((k.mid >> 16) & 255) * f; mg += ((k.mid >> 8) & 255) * f; mb += (k.mid & 255) * f;
    zr += ((k.zenith >> 16) & 255) * f; zg += ((k.zenith >> 8) & 255) * f; zb += (k.zenith & 255) * f;
  }
  /* elevation −1..1; the horizon band is tight and the zenith owns the top half, which is how a real
     sky is distributed — most of the colour drama lives in the first 25 degrees */
  const e = elevation < -1 ? -1 : elevation > 1 ? 1 : elevation;
  let r, g, b;
  if (e <= 0.22) { const t = smooth((e + 0.12) / 0.34); r = lerp(hr, mr, t); g = lerp(hg, mg, t); b = lerp(hb, mb, t); }
  else { const t = smooth((e - 0.22) / 0.62); r = lerp(mr, zr, t); g = lerp(mg, zg, t); b = lerp(mb, zb, t); }
  if (out && out.setRGB) { out.setRGB(r / 255, g / 255, b / 255); return out; }
  return ((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)) >>> 0;
}
/* the ambient/bounce colour a builder should use for things standing in a given direction */
export function fillFor(bearing, band) {
  const K = ATMO[band] || ATMO.dusk, w = sectorWeights(bearing);
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < SECTORS.length; i++) {
    const c = K[SECTORS[i].id].fill, f = w[i];
    r += ((c >> 16) & 255) * f; g += ((c >> 8) & 255) * f; b += (c & 255) * f;
  }
  return ((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)) >>> 0;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(v) { const t = v < 0 ? 0 : v > 1 ? 1 : v; return t * t * (3 - 2 * t); }
export { smooth as smoothstep };

/* ------------------------------------------------------- the cloud floor */
/* THE CLOUD IS THE TERRAIN (§03). deckHeight() is this realm's ground height function: it is what
   structures sit on, what residents walk on, and what the cloud-surface mesh is built from. Every
   module MUST use it rather than assuming y = 0, or the world will float apart.

   The scale is deliberately enormous (§33): the walkable/holdable deck runs to about 1.1 km, the
   cloud sea continues to 9 km, and a training platform 600 m away is a real journey. */
export const DECK = Object.freeze({
  y: 0,                 /* nominal deck top at the arrival plateau */
  radius: 1150,         /* beyond this the deck breaks into detached banks and open air */
  seaRadius: 9000,      /* the cloud ocean's far edge, where it meets the horizon */
  domeRadius: 9600,
  cliffBearing: 0,      /* sector A: the deck ENDS in a cliff over the void, which is the view */
  cliffHalf: 0.62,
  cliffRadius: 300,     /* how far out the sunset-facing edge sits */
  voidFloor: -900       /* how far down a gap reads before atmosphere closes it */
});

/* Named features. Each is a smooth, cheap, deterministic displacement; they sum. Kept as data so a
   builder can also DRAW them (a ridge wants a cloud bank on it, a valley wants mist in it). */
export const FEATURES = Object.freeze([
  /* the arrival plateau: the one genuinely flat, stable, obviously-safe piece of ground (§06) */
  { kind: 'plateau', bearing: Math.PI, r: 95, radius: 165, h: 7.0, falloff: 70 },
  /* ridges give the realm boundaries and scale without walling it in (§05) */
  { kind: 'ridge', bearing: 2.35, r: 250, len: 420, wide: 90, h: 26, rot: 0.7 },
  { kind: 'ridge', bearing: -2.30, r: 300, len: 520, wide: 110, h: 34, rot: -0.5 },
  { kind: 'ridge', bearing: -1.20, r: 480, len: 600, wide: 130, h: 44, rot: 0.25 },
  { kind: 'ridge', bearing: 1.05, r: 520, len: 480, wide: 120, h: 30, rot: -0.3 },
  /* valleys: soft low ground that reads as depth and holds mist (§05) */
  { kind: 'valley', bearing: 1.75, r: 330, radius: 210, h: -14, falloff: 150 },
  { kind: 'valley', bearing: -0.55, r: 260, radius: 150, h: -10, falloff: 110 },
  { kind: 'valley', bearing: 2.75, r: 380, radius: 180, h: -12, falloff: 130 },
  /* a long swell running across the training flats, so "flat" is never actually flat */
  { kind: 'ridge', bearing: 1.55, r: 700, len: 900, wide: 240, h: 18, rot: 1.1 }
]);

/* Open voids in the deck — where the cloud simply is not, and the player can see a very long way
   down (§05, §38). Kept few and large: a hole you can see across is atmosphere, a hole you trip
   into is a bug. */
export const VOIDS = Object.freeze([
  { bearing: 0.42, r: 430, radius: 120 },
  { bearing: -0.85, r: 620, radius: 165 },
  { bearing: 2.15, r: 560, radius: 135 },
  { bearing: -2.60, r: 700, radius: 190 }
]);

function px(bearing, r) { const d = dir(bearing); return { x: d.x * r, z: d.z * r }; }

/* The cloud floor's height at a world point. Sum of the named features over a slow global swell.
   Pure, allocation-free and cheap enough to call per vertex at build time and per agent per frame. */
export function deckHeight(x, z) {
  /* the slow swell: the whole deck breathes, so nothing reads as a flat plane */
  let h = Math.sin(x * 0.0021) * Math.cos(z * 0.0018) * 5.5 + Math.sin((x + z) * 0.0037) * 2.4;
  for (let i = 0; i < FEATURES.length; i++) {
    const f = FEATURES[i], c = px(f.bearing, f.r);
    if (f.kind === 'plateau') {
      const d = Math.hypot(x - c.x, z - c.z);
      h += f.h * (1 - smooth((d - f.radius) / f.falloff));
    } else if (f.kind === 'valley') {
      const d = Math.hypot(x - c.x, z - c.z);
      h += f.h * (1 - smooth((d - f.radius) / f.falloff));
    } else if (f.kind === 'ridge') {
      /* distance to a finite line segment through c, rotated by f.rot off the bearing's normal */
      const a = f.bearing + HALF_PI + f.rot;
      const ux = Math.sin(a), uz = -Math.cos(a);
      let t = (x - c.x) * ux + (z - c.z) * uz;
      const half = f.len / 2; if (t > half) t = half; else if (t < -half) t = -half;
      const dx = x - (c.x + ux * t), dz = z - (c.z + uz * t);
      const d = Math.hypot(dx, dz);
      h += f.h * (1 - smooth(d / f.wide)) * (1 - smooth((Math.abs(t) - half * 0.62) / (half * 0.5)));
    }
  }
  /* the deck falls away past its radius rather than ending at a wall */
  const rr = Math.hypot(x, z);
  h -= 240 * smooth((rr - DECK.radius) / 520);
  return h;
}

/* Is there cloud floor here at all? False over a void and past the sunset cliff, so a builder never
   stands a platform, a resident or a bench on nothing. */
export function deckSolid(x, z) {
  const rr = Math.hypot(x, z);
  if (rr > DECK.radius) return false;
  for (let i = 0; i < VOIDS.length; i++) {
    const v = VOIDS[i], c = px(v.bearing, v.r);
    if (Math.hypot(x - c.x, z - c.z) < v.radius) return false;
  }
  /* the sunset cliff: sector A stops early, and what lies past it is sky (§05 CLOUD CLIFFS) */
  const b = bearingOf(x, z);
  if (Math.abs(angleDelta(DECK.cliffBearing, b)) < DECK.cliffHalf && rr > DECK.cliffRadius) return false;
  return true;
}

/* How close a point is to an edge (a void rim or the cliff), 0 at the edge and 1 well inside.
   Builders use it to keep structures off rims and to fade the deck's own surface into air. */
export function deckEdge(x, z) {
  const rr = Math.hypot(x, z);
  let m = (DECK.radius - rr) / 180;
  for (let i = 0; i < VOIDS.length; i++) {
    const v = VOIDS[i], c = px(v.bearing, v.r);
    m = Math.min(m, (Math.hypot(x - c.x, z - c.z) - v.radius) / 90);
  }
  const b = bearingOf(x, z);
  if (Math.abs(angleDelta(DECK.cliffBearing, b)) < DECK.cliffHalf) m = Math.min(m, (DECK.cliffRadius - rr) / 120);
  return m < 0 ? 0 : m > 1 ? 1 : m;
}

/* --------------------------------------------------------------------- sites */
/* Every built thing in the realm stands at one of these. Positions are given as bearing + radius so
   they read as places in the sector plan; xz() resolves them and deckHeight() gives the y.
   ARCHITECTURE IS SPARSE (§11, §32): this list is short on purpose, and it is the whole of it. */
export const SITES = Object.freeze({
  /* ---- sector B: arrival ---- */
  concourse:    { bearing: Math.PI * 0.96, r: 118, sector: 'B', note: 'MAH ASCENT concourse: the one real building' },
  padA:         { bearing: 2.72, r: 74, sector: 'B', note: 'ascent pad — arriving' },
  padB:         { bearing: 3.14, r: 66, sector: 'B', note: 'ascent pad — docked' },
  padC:         { bearing: -2.72, r: 74, sector: 'B', note: 'ascent pad — preparing' },
  padD:         { bearing: -2.30, r: 96, sector: 'B', note: 'ascent pad — departing' },
  staging:      { bearing: Math.PI, r: 34, sector: 'B', note: 'the safe no-combat staging apron the pods open onto' },
  queuePylon:   { bearing: 2.98, r: 44, sector: 'B', note: 'ASCENT QUEUE pylon' },
  /* ---- sector A: sunset ---- */
  overlook:     { bearing: 0.06, r: 232, sector: 'A', note: 'sunset observation deck, on the ridge at the cliff' },
  restDeck:     { bearing: -0.34, r: 205, sector: 'A', note: 'quiet sitting overlook, off the main axis' },
  cliffMarker:  { bearing: 0.30, r: 268, sector: 'A', note: 'edge marker where the deck ends' },
  /* ---- sector C: training ---- */
  ringNear:     { bearing: 1.42, r: 265, sector: 'C', note: 'sparring ring — the readable one, near the flats edge' },
  ringMid:      { bearing: 1.86, r: 430, sector: 'C', note: 'sparring ring — mid flats' },
  ringFar:      { bearing: 2.40, r: 690, sector: 'C', note: 'sparring ring — far, small in frame, sells distance' },
  gateLane:     { bearing: 1.62, r: 350, sector: 'C', note: 'flight-gate lane origin; gates run outward from here' },
  targetField:  { bearing: 2.30, r: 300, sector: 'C', note: 'impact / target diamonds' },
  launchPylons: { bearing: 1.20, r: 380, sector: 'C', note: 'vertical launch pylons for flight practice' },
  /* ---- sector D: high cloud ---- */
  relayTower:   { bearing: -1.55, r: 520, sector: 'D', note: 'MAHGIC relay — the one lit structure on the cold side' },
  /* `floating` sites hang in open air rather than standing on the deck: their y is absolute, taken
     from `y` here, and deckSolid() does not apply to them. They are the far silhouettes that give
     the cold side its depth, and a resident learning to fly is aiming at them. */
  suspendedA:   { bearing: -1.95, r: 880, y: 210, floating: true, sector: 'D', note: 'suspended training tower, far' },
  suspendedB:   { bearing: -1.32, r: 1180, y: 330, floating: true, sector: 'D', note: 'suspended training tower, further' },
  stabiliser:   { bearing: -2.35, r: 400, sector: 'D', note: 'cloud stabilisation tower at the deck edge' }
});
export function xz(site) { const s = typeof site === 'string' ? SITES[site] : site; const d = dir(s.bearing); return { x: d.x * s.r, z: d.z * s.r }; }
/* The full position of a site. A grounded site sits on the actual cloud floor; a `floating` one
   hangs at its own absolute y, which is why deckSolid() is not consulted for it. */
export function siteAt(site) {
  const s = typeof site === 'string' ? SITES[site] : site;
  const p = xz(s);
  return { x: p.x, y: s.floating ? s.y : deckHeight(p.x, p.z), z: p.z, floating: !!s.floating };
}

/* ------------------------------------------------------- detached formations */
/* Cloud islands, towers and canyons — the things that are NOT the deck. Given here so the cloud
   module builds them and the life/structure modules can land on them and fly between them. */
export const ISLANDS = Object.freeze([
  { bearing: 1.30, r: 470, y: 62, rx: 46, rz: 34, note: 'first stepping island off the training flats' },
  { bearing: 1.72, r: 610, y: 96, rx: 58, rz: 40 },
  { bearing: 2.08, r: 780, y: 140, rx: 72, rz: 52 },
  { bearing: 0.72, r: 540, y: 74, rx: 40, rz: 30, note: 'lone island in the sunset gap; a silhouette' },
  { bearing: -1.05, r: 700, y: 118, rx: 66, rz: 48 },
  { bearing: -1.68, r: 940, y: 186, rx: 88, rz: 62 },
  { bearing: -2.15, r: 620, y: 92, rx: 54, rz: 40 }
]);
/* Vertical cloud architecture on the cold side (§17). Heights are enormous on purpose. */
export const TOWERS = Object.freeze([
  { bearing: -1.10, r: 1500, w: 380, h: 780, kind: 'tower' },
  { bearing: -1.62, r: 1850, w: 520, h: 1080, kind: 'tower' },
  { bearing: -2.05, r: 1400, w: 340, h: 620, kind: 'tower' },
  { bearing: -2.55, r: 2100, w: 620, h: 900, kind: 'shelf' },
  { bearing: -0.78, r: 2400, w: 700, h: 1250, kind: 'anvil' },
  { bearing: -1.90, r: 3000, w: 900, h: 1500, kind: 'anvil' },
  { bearing: 2.55, r: 2200, w: 480, h: 700, kind: 'shelf' },
  { bearing: 2.95, r: 2700, w: 640, h: 980, kind: 'tower' }
]);
/* Mountains from the world below piercing the deck (§16). Sparse, and only in the far distance —
   they are proof that this realm is above the same planet, not scenery for its own sake. */
export const PEAKS = Object.freeze([
  { bearing: -0.30, r: 5200, h: 1150, w: 620 },
  { bearing: -0.13, r: 6100, h: 1420, w: 780 },
  { bearing: 0.19, r: 4700, h: 900, w: 520 },
  { bearing: 0.44, r: 6600, h: 1280, w: 860 },
  { bearing: -0.62, r: 7200, h: 1050, w: 700 }
]);

/* -------------------------------------------------------------------- random */
/* One seeded generator shape for the whole realm, so "cloud 7" is the same cloud in every module. */
export function rng(seed) {
  let s = (typeof seed === 'string' ? [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) : (seed >>> 0)) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/* ------------------------------------------------------------------ branding */
/* The signage this realm is allowed to carry (§35, §36). Kept SHORT deliberately: the brief's own
   words are "do not turn the cloud realm into a UI billboard field".
   Every string here is either the user's own copy from the brief or a functional wayfinding label.
   Marketing lines that appear only in the concept art are NOT here — inventing or laundering slogans
   is out of scope, and the one canonical sub-line that does exist is carried separately. */
export const SIGNAGE = Object.freeze({
  realm: 'UPPER REALM',
  ascent: 'MAH ASCENT',
  queue: 'ASCENT QUEUE',
  actions: Object.freeze(['TRAIN', 'SPAR', 'FLY', 'RETURN']),
  /* canonical: this is the sub-line of images/mahfitt-mark-gold.png itself, measured from the asset */
  canonicalSub: 'MUSIC AND HOLISTIC FITNESS TRACKER'
});

/* ---------------------------------------------------------------- quality */
/* Shared tiers so the cloud, structure, beam and life modules degrade together rather than each
   inventing its own idea of "low" (§45). */
export const QUALITY = Object.freeze({
  high: { cloudSegments: 96, cloudRings: 26, seaSegments: 128, towers: 8, islands: 7, peaks: 5, residents: 14, beams: 1.0, mist: 1.0 },
  medium: { cloudSegments: 72, cloudRings: 20, seaSegments: 96, towers: 6, islands: 5, peaks: 4, residents: 9, beams: 0.7, mist: 0.6 },
  low: { cloudSegments: 48, cloudRings: 14, seaSegments: 64, towers: 4, islands: 3, peaks: 3, residents: 5, beams: 0.45, mist: 0.3 }
});
