/* MAHPLAZA :: CITY — the MAHWORLD district behind and beside the plaza (v4)

   Three depth layers so every exterior view has midground, background and
   distant background instead of stopping behind the three destinations:

   1. MIDGROUND (90–220 m): dark steel residential / facility blocks in THREE
      massings (stepped / slotted / podium), each wearing a platinum structural
      frame — base course, piers, spandrel courses, sill, parapet and coping —
      over recessed window grids or lit curtain wall (windowGrid), with
      roof plant, masts and parapet rails; three short bridges between blocks and
      ONE long walkway crossing behind MAH MATCH (deck y 34, z −122, x −75..75)
      with a thin rail light line, under-deck lights and a slow rail pod.
   2. BACKGROUND (220–670 m): crystalline towers — seven faceted archetypes as
      seven InstancedMeshes, each with one or two thin energy strips: the four v4
      forms (tapered obelisk, hexagonal crystal, stepped twin prism, blade) plus
      three v5 MEGATALLS at 214–392 m (stepped shaft + spire, notched twin blade,
      crystalline pinnacle), set at overlapping radii for height parallax.
   3. DISTANT (520–850 m): flat dark silhouettes under the fog — tall slabs, a
      colossal tapered form, a suspended ring on pylons, a high platform.

   Laws honoured: materials from ctx.M only (+ MeshBasic for windows / lights /
   spill / far silhouettes), no additive glow, nothing flashes, deterministic
   (seeded), no per-frame allocation, everything merged or instanced. Windows
   dim by day; energy strips and rail lights follow the world Theme and dim ×0.3
   by day. Never inside |x| < 46 && z > −92, never at z > 70 within |x| < 60.

   v8 — WARM ROOMS, COLD SIGNS. Two changes, and they are the same change seen
   twice. (1) The district's windows were one cool white, so every lit room
   agreed with every lit sign and fifteen blocks read as one blue mass; the
   rooms are WARM now, per face, with a MAHGIC-lit minority left cool — that
   difference is what a skyline's life actually is. (2) Six blocks and two
   megatalls carry ONE saturated accent gesture each, assigned BY DISTRICT
   (left violet, centre blue, right cyan) so the eye reads regions rather than
   per-building noise. Every emitter added here is built as three pieces — the
   source, the dark reveal it sits in, and a short-falloff WASH in its own hue
   on the surface it is mounted to — because an emissive rectangle that lights
   nothing is the failure this pass exists to remove.

   Life anchors pushed: ctx.lifeAnchors.paths (walkway + 3 bridges, kind
   'bridge') and ctx.lifeAnchors.pads (5 rooftop pads, tier 'far'). */
import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, windowGrid, canvasTexture, ACCENT } from './materials.js';

const SEED = 4417;
const PW = 1.4;                       /* pilaster width */
const FLOOR = 3.4;                    /* residential floor pitch */
const WIN = { cellW: 1.5, cellH: 1.35, gapX: 0.95, gapY: FLOOR - 1.35 };
const WHITE = 0xdde8ff;               /* the cool MAHGIC white: masts, beacons, rail pods — never a room */

/* ---- v8 §01 THE WINDOW IS A ROOM ---------------------------------------------------------------
   "Most of the windows of the buildings should have yellow or an off-white lighting FAINTLY coming
   out of it." The district's windows were one cool 0xdde8ff, which meant every lit room agreed
   exactly with every lit sign, and fifteen blocks collapsed into a single blue mass however much
   platinum went onto their frames. A room is warm because there are PEOPLE in it; a sign is cold
   because it is MAHGIC. That one difference is what a night skyline's life actually consists of.

   These are materials.js's own interior family, kept here as the literals the window grids tint
   their instances with: windowGrid multiplies MATERIAL colour by INSTANCE colour, so the shared
   material stays a neutral dimmer and the HUE is chosen per face. Faint is deliberate — the grid's
   own per-cell spread (0.22–1.17 of the tint) lands most cells well under half strength. */
const WARM = {
  interior: 0xffeccd,        /* the standard lit room — warm off-white, and the district's majority */
  interiorPale: 0xfff6e4,    /* a deep room read through a large pane: paler, because more of it is air */
  interiorSoft: 0xf2d9a8     /* the SPILL — what that room throws onto its own sill, reveal and spandrel */
};
const COOL = { lit: 0xd7e8ff, spill: 0x8fb4e6 };        /* a MAHGIC-lit room: a training floor, a plant deck */
const DARKROOM = { warm: 0x262229, cool: 0x24324a };    /* an unlit flat: near-black glass, never a hole in the wall */
/* Five faces in six are DOMESTIC; the sixth is MAHGIC-lit and stays cool. The choice is per FACE and
   never per building, because a tower whose every elevation is lit identically reads as one lamp
   rather than as three hundred separate households — and `on` varies the lit fraction so some
   elevations are half empty while others are nearly full. Deterministic, from the face's own seed. */
function faceLight(seed) {
  const k = (Math.imul(seed | 0, 2654435761) >>> 0) % 12;
  if (k < 2) return { tint: COOL.lit, dim: DARKROOM.cool, spill: COOL.spill, cool: true, on: 0.74 };
  if (k < 5) return { tint: WARM.interiorPale, dim: DARKROOM.warm, spill: WARM.interiorSoft, cool: false, on: 0.88 };
  return { tint: WARM.interior, dim: DARKROOM.warm, spill: WARM.interiorSoft, cool: false, on: 0.55 + (k % 4) * 0.13 };
}
/* ---- v7 §02 THE PLATINUM FRAME — the dimensions that decide how much of an elevation is metal.
   Measured at night the district read: sky 36, ARCHITECTURE 52, chromium plaza floor 95. The floor was
   doing all of the platinum work because the blocks were a navy mass wearing a hairline trim. The masses
   are NOT lightened — they are the dark the platinum is measured against, and lifting them would flatten
   the world. What widens is the FRAME. These numbers put roughly a third of a primary elevation into the
   platinumMid grade (base + piers + courses + parapet), which is a framed building; at 100 % it would be
   as wrong as at 0 %. Every band is kept TALLER THAN IT IS DEEP so the face the camera sees is the
   vertical one — a high-metalness metal takes no diffuse light, so orientation, not hue, decides value. */
const FR = { base: 1.9, course: 0.72, courseD: 0.32, pier: 0.8, pierD: 0.34, sill: 0.22, sillD: 0.6, cope: 0.26, band: 1.1 };

/* ---- midground blocks: hand-composed so they overlap the gaps between the three destinations
   from the arrival cameras (see the establishing view) — x, z, footprint w × d, total height h,
   setback fraction sb, which side face also gets windows, rooftop pad kind --------------------- */
const BLOCKS = [
  { id: 'L1', x: -104, z: -46,  w: 22, d: 18, h: 34, sb: 0.25, side: 1 },
  { id: 'L2', x: -150, z: -96,  w: 30, d: 24, h: 62, sb: 0.30, side: 1 },
  { id: 'L3', x: -62,  z: -150, w: 26, d: 22, h: 56, sb: 0.28, side: 0, pad: 'training', elevator: true },
  { id: 'L4', x: -112, z: -148, w: 18, d: 16, h: 46, sb: 0,    side: 1, pad: 'levitate', rot: 0 },
  { id: 'C1', x: -26,  z: -186, w: 30, d: 24, h: 54, sb: 0.30, side: 0 },   /* off the centre sightline: the portrait hero must see sky above MAH MATCH */
  { id: 'C2', x: -38,  z: -196, w: 24, d: 22, h: 70, sb: 0.25, side: 0 },
  { id: 'C3', x: 44,   z: -190, w: 28, d: 22, h: 64, sb: 0.30, side: 0 },
  { id: 'R1', x: 106,  z: -50,  w: 20, d: 18, h: 30, sb: 0,    side: -1 },
  { id: 'R2', x: 116,  z: -112, w: 28, d: 24, h: 50, sb: 0.30, side: -1, pad: 'training' },
  { id: 'R3', x: 74,   z: -164, w: 24, d: 20, h: 52, sb: 0.28, side: 0, pad: 'levitate' },
  { id: 'R4', x: 84,   z: -126, w: 18, d: 16, h: 42, sb: 0,    side: -1, pad: 'training', rot: 0 },
  { id: 'F1', x: -108, z: -22,  w: 22, d: 18, h: 26, sb: 0,    side: 1 },
  { id: 'F2', x: 114,  z: -10,  w: 20, d: 16, h: 22, sb: 0,    side: -1 },
  { id: 'L5', x: -150, z: -72,  w: 24, d: 20, h: 40, sb: 0.25, side: 1 },
  { id: 'R5', x: 150,  z: -80,  w: 22, d: 20, h: 36, sb: 0.25, side: -1 }
];
/* ---- v7 §50-7 THREE BLOCK MASSINGS -------------------------------------------------------------
   Gate §50-7 stood PARTIAL from v6 for one reason: fifteen blocks were ONE geometry recipe at fifteen
   scales — the same core mass, the same four pilasters, one crown, one window module. Scale is not
   variety; a bigger copy of a thing is still that thing. There are three MASSINGS now, and they differ
   in MASS, not in size or colour:

     stepped  the v6 form kept: a core with one setback shaft above it, two crowns
     slotted  a slab cut front-to-back by an off-centre slot, a broad low wing beside a slender full-
              height blade, so the crown is a NOTCH against the sky instead of another flat top
     podium   a wide low podium carrying a platinum terrace deck, with a slender shaft set back on it

   A block's massing comes from its IDENTITY, never from its size, so shape and scale stay two
   independent variables — exactly the separation FAMILY_OF already keeps between a tower's shape and
   its material. Hand-checked against the arrival frame so no two neighbouring blocks share a massing,
   and so the three podiums (which are the only massing that grows its footprint) stand clear of the
   blocks beside them. */
const MASSING = {
  L1: 'slotted', L2: 'slotted', L3: 'stepped', L4: 'podium', C1: 'stepped',
  C2: 'slotted', C3: 'stepped', R1: 'podium',  R2: 'stepped', R3: 'podium',
  R4: 'slotted', F1: 'stepped', F2: 'slotted', L5: 'stepped', R5: 'slotted'
};
const MASSING_OF = id => MASSING[id] || 'stepped';
/* ---- v8 §02 PUNGENT DISTRICT COLOUR ------------------------------------------------------------
   The direction is saturated primary and secondary colour on the buildings, contrasted against the
   black platinum floor. The failure mode is obvious and worth naming: five hues sprinkled over
   fifteen blocks reads as an arcade, not a civilisation. So colour is a property of a DISTRICT, not
   of a building — the left blocks are violet, the centre is blue, the right is cyan — and only SIX
   of the fifteen carry a gesture at all. Each of those six carries exactly ONE, and it is large: a
   full signage band, a crown, or a full-height seam. Everything else stays dark mass and platinum
   frame, because a contrast needs something to be measured against.
   Hand-checked against the three cut valleys: L1 155.9°, L2 147.5°, C2 100.9°, C3 77.0°, R2 44.0°,
   R5 28.0° — every one of them clear of 52–72°, 108–124° and 128–142°, so no gesture draws the eye
   into a hole the composition is deliberately keeping open. */
const ACCENT_DISTRICT = { L: 'violet', F: 'violet', C: 'blue', R: 'cyan' };
const GESTURE = { L1: 'seam', L2: 'band', C2: 'crown', C3: 'band', R2: 'crown', R5: 'band' };
/* the two megatalls that wear a full-height seam, keyed by their own bearing|radius row in TOWERS.
   Landmarks, so they take their district's hue: 88° is the centre's tallest, 46° is the right's. */
const TOWER_SEAM = { '88|665': 'blue', '46|505': 'cyan' };
/* bridges between blocks (world endpoints sit just inside the block faces) and the main walkway */
/* the walkway sits BEHIND MAH MATCH's new site (z −66, body back to −123), so it still crosses the
   frame without passing through the building */
const WALKWAY = { id: 'city-walkway', ax: -75.5, az: -150, bx: 75.5, bz: -150, y: 40, width: 4.2, pylons: [-52, 52] };
const BRIDGES = [
  { id: 'city-bridge-l2-l4', ax: -93.5, az: -124,   bx: -105.5, bz: -124,   y: 36, width: 3.2 },
  { id: 'city-bridge-r3-r4', ax: 64.7,  az: -141.6, bx: 76,     bz: -131,   y: 30, width: 3.2 },
  { id: 'city-bridge-r4-r2', ax: 92.5,  az: -124,   bx: 107.5,  bz: -124,   y: 30, width: 3.2 }
];
/* background towers: bearing a° (x = r cos a, z = −r sin a), radius r, height, width, archetype, strips */
/* ---- v6 §09 / §11 THE THREE VALLEYS ------------------------------------------------------------
   The v5 skyline formed one continuous wall: the widest hole anywhere in the arrival frame was 3.4°,
   and the PORTRAIT arrival frame — the hero composition — had ZERO open sky to the horizon. Towers and
   slabs standing in three chosen bearing ranges have been removed so the eye can see THROUGH the city
   to the mountains behind it. The valleys, in this table's polar convention (the arrival camera looks
   along bearing ~90°, the frame spans roughly 50°–130°):

     RIGHT VALLEY   52°– 72°   framed by the towers at 44° and 75°
     CENTRE VALLEY 108°–124°   the widest, directly left of MAH MATCH's tower
     LEFT VALLEY   128°–142°   framed by the towers at 120° and 145°

   Nothing was moved into the valleys to compensate. Open sky IS the feature. */
const TOWERS = [
  [104, 300, 128, 22, 'A', 2], [100, 340, 150, 24, 'A', 2],
  [75, 300, 62, 15, 'C', 1],
  [81, 450, 160, 26, 'A', 2], [103, 470, 158, 24, 'B', 1],
  [145, 400, 90, 19, 'B', 1], [120, 400, 136, 21, 'A', 2],
  [44, 330, 112, 21, 'A', 2], [36, 450, 96, 20, 'B', 1],
  [18, 300, 70, 18, 'C', 1], [8, 380, 90, 20, 'B', 1], [160, 320, 80, 18, 'A', 1], [172, 400, 100, 22, 'D', 1], [150, 480, 118, 22, 'A', 1], [25, 480, 124, 24, 'A', 2],
  /* ---- v5 §09 MEGATALL: the skyline needs a top the eye can climb to. These are 2–3× the tallest
     v4 tower, set at four different radii so they overlap each other and the towers in front of them —
     height parallax, not a flat cut-out row. Three new crowns (stepped + spire, notched twin blade,
     crystalline pinnacle) so no two megatalls end the same way. --------------------------------- */
  /* MEGATALLS are LANDMARKS, not a wall: a few dominant towers read better than fifty competing ones
     (§24). Eight remain, all clear of the three valleys, at four radii so they overlap in depth. */
  [96, 470, 340, 34, 'E', 2], [46, 505, 312, 32, 'E', 2],
  [82, 380, 214, 26, 'G', 1], [30, 420, 236, 27, 'G', 1],
  [12, 560, 258, 28, 'E', 1], [156, 455, 226, 27, 'G', 1],
  [88, 665, 392, 40, 'E', 2], [100, 780, 300, 33, 'F', 1]
];
/* distant slabs: bearing, radius, width, height, depth, rotation */
/* distant slabs: bearing, radius, width, height, depth, rotation. The 62°, 112° and 140° slabs were
   the ones closing the three valleys and are gone; the rest keep the far layer populated. */
const SLABS = [
  [30, 700, 60, 210, 30, 0.3], [40, 820, 70, 260, 34, -0.2], [78, 830, 54, 230, 28, 0.1],
  [95, 640, 40, 150, 24, -0.4], [15, 620, 56, 220, 28, 0.4], [166, 690, 48, 190, 26, 0.25]
];

/* ---- small deterministic helpers ------------------------------------------------------------ */
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function smooth(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function polar(a, r) { const t = a * Math.PI / 180; return [r * Math.cos(t), -r * Math.sin(t)]; }
/* concatenate geometries (non-indexed) into one static BufferGeometry; disposes the inputs.
   v8: a vertex COLOUR is carried when any part has one, which is what lets all three district accent
   hues share ONE wash mesh instead of costing a draw call each — the wash material is white and the
   hue rides on the vertices. Parts without a colour default to white, so nothing else changes. */
function mergeGeos(list) {
  const parts = []; let count = 0, tinted = false;
  for (const g of list) { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); if (n.attributes.color) tinted = true; parts.push(n); count += n.attributes.position.count; if (n !== g) g.dispose(); }
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  const col = tinted ? new Float32Array(count * 3) : null;
  let o = 0;
  for (const n of parts) {
    const c = n.attributes.position.count;
    pos.set(n.attributes.position.array, o * 3); nor.set(n.attributes.normal.array, o * 3);
    if (n.attributes.uv) uv.set(n.attributes.uv.array, o * 2);
    if (col) { if (n.attributes.color) col.set(n.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + c) * 3); }
    o += c; n.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
/* paint one geometry's vertices so it can share a merged mesh with other hues */
const _tint = new THREE.Color();
function paint(geo, hex) {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  _tint.setHex(hex);
  for (let i = 0; i < n; i++) { a[i * 3] = _tint.r; a[i * 3 + 1] = _tint.g; a[i * 3 + 2] = _tint.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
/* ---- v8 §03 THE WASH — how a light in this file proves it is a light -----------------------------
   An emissive material makes a bright rectangle and illuminates nothing, which is the exact defect
   the direction is calling out. A wash is the answer: an unlit plane carrying the emitter's own hue
   and a FALLOFF MAP, laid on the surface the emitter is mounted to. The map is bright along the
   emitter's line and gone at the edges of the quad, so a two-metre-tall wash is light that dies in
   two metres — believable falloff, not a uniform tint over a whole facade.
   `hwash` falls off across its HEIGHT (a band, a window ribbon, a sill line); `vwash` is the same
   quad rotated a quarter turn so it falls off across its WIDTH, for a vertical seam's two jambs. */
const hwash = (w, h) => new THREE.PlaneGeometry(w, h);
const vwash = (w, h) => new THREE.PlaneGeometry(h, w).rotateZ(Math.PI / 2);
const soffitWash = (w, d) => new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2);    /* faces DOWN: under a course, a coping */
const sillWash = (w, d) => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);     /* faces UP: onto a sill, a deck, a plinth */
/* flat facets: non-indexed + per-face normals */
function faceted(g) { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); if (n !== g) g.dispose(); return n; }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
function matrixOf(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, parent = null) {
  _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz); _m.compose(_p, _q, _s);
  if (parent) _m.premultiply(parent);
  return _m;
}
/* place a fresh geometry: local translate / yaw / scale, then an optional parent matrix */
function xform(geo, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, parent = null) { geo.applyMatrix4(matrixOf(x, y, z, ry, sx, sy, sz, parent)); return geo; }

export function buildCity(ctx) {
  const M = ctx.M || {};
  const theme = ctx.theme || M.theme || { energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 };
  const mat = (k, fb) => M[k] || M[fb] || M.graphite || new THREE.MeshStandardMaterial({ color: 0x1b2433 });
  const structuralM = mat('structural', 'graphite'), compositeM = mat('composite', 'graphiteDark'), panelM = mat('panel', 'graphite'), trimM = mat('trimSatin', 'trim');
  /* THE MISSING RUNG, spent on the district (see materials.js). platinumMid sits at luminance 142,
     between the block masses (49–58) and the bright platinum family (183–232) — a grade broad enough to
     CARRY an elevation rather than outline it. Its two partners are not decoration: platinumMidBrushed
     puts a directional streak on the piers, which are the tallest single pieces of metal on a facade,
     and platinumMidLit is the LOW-metalness partner every up-facing piece of the frame must use. A
     metal at 0.94 metalness is lit only by what it reflects, and a horizontal face reflects the night
     zenith, which is black — the sill and the coping would vanish in the exact grade that makes the
     piers read. This world has shipped that bug once already. */
  const platMidM = mat('platinumMid', 'platinum'), platPierM = mat('platinumMidBrushed', 'platinumMid'), platCapM = mat('platinumMidLit', 'platinumLit');
  const anchors = ctx.lifeAnchors || (ctx.lifeAnchors = { paths: [], pads: [], doors: [], windows: [] });
  anchors.paths = anchors.paths || []; anchors.pads = anchors.pads || [];

  const group = new THREE.Group(); group.name = 'city';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };

  /* own materials: windows (instance colour × material colour), theme energy lines, cool-white lights, far silhouettes */
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true, fog: true }); winMat.name = 'city-windows';
  const stripMat = new THREE.MeshBasicMaterial({ color: theme.energy, toneMapped: true, fog: true }); stripMat.name = 'city-energy';
  const whiteMat = new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: true, fog: true }); whiteMat.name = 'city-lights';
  /* v6 §07 / §08 / §25 / §44 — THE BACKGROUND MATERIAL FAMILIES.
     In v5, twenty-six of thirty-nine towers wore one of two materials, and all twelve distant
     silhouettes were a single flat 0x0a1322. Material is the only depth cue a silhouette has left, so
     the whole background flattened into one cut-out plane. These four families give the skyline
     separation the way a real one gets it — not by painting buildings different colours, but by
     building them out of different METALS AND GLASS that answer the same moonlight differently.
     Colour comes from material response, never from flat paint (§08). */
  const towerFamilies = {
    /* bright platinum + blue glass: the landmarks, and the closest band, so they read first */
    platinum: new THREE.MeshStandardMaterial({ color: 0x9aabc4, roughness: 0.28, metalness: 0.94, envMapIntensity: 2.0 }),
    /* dark crystalline glass + silver ribs: reads almost black on a turned-away plane, bright where it catches */
    glass: new THREE.MeshStandardMaterial({ color: 0x25406b, roughness: 0.1, metalness: 0.55, envMapIntensity: 2.4, flatShading: true }),
    /* soft graphite: the quiet mass that lets the other two read */
    graphite: new THREE.MeshStandardMaterial({ color: 0x3a4863, roughness: 0.56, metalness: 0.82, envMapIntensity: 1.35 }),
    /* a restrained violet-grey reflective zone: one district's material identity, never a rainbow */
    violet: new THREE.MeshStandardMaterial({ color: 0x554e7c, roughness: 0.34, metalness: 0.76, envMapIntensity: 1.7 })
  };
  Object.keys(towerFamilies).forEach(k => { towerFamilies[k].name = 'city-tower-' + k; owned.materials.push(towerFamilies[k]); });
  /* the distant layer gets THREE depth values instead of one, so 600 m and 830 m are not the same
     paper cut-out. Unlit basic materials: at that range the fog does the rest. */
  const farMats = [
    new THREE.MeshBasicMaterial({ color: 0x22304a, fog: true }),
    new THREE.MeshBasicMaterial({ color: 0x18243a, fog: true }),
    new THREE.MeshBasicMaterial({ color: 0x111b2c, fog: true })
  ];
  farMats.forEach((m, i) => { m.name = 'city-distant-' + i; owned.materials.push(m); });
  const groundMat = new THREE.MeshBasicMaterial({ color: 0x141d2c, fog: true }); groundMat.name = 'city-ground';
  owned.materials.push(winMat, stripMat, whiteMat, groundMat);

  /* static geometry buckets, merged per material at the end */
  /* the platinum frame gets THREE buckets, not three meshes per block: every block's framing merges
     into the same three geometries, so widening the framing across fifteen blocks costs three draw
     calls in total rather than forty-five */
  const B = { structural: [], composite: [], trim: [], strips: [], whites: [], platMid: [], platPier: [], platLit: [], far: [], far0: [], far1: [], far2: [] };
  const kitBoxes = [], kitMasts = [];        /* instanced roof kit matrices */
  const stats = { blocks: 0, bridges: 0, towers: 0, giants: 0, windows: 0, windowGrids: 0, pads: 0, paths: 0, drawCalls: 0, triangles: 0 };
  let elevator = null, pod = null;

  /* ---------------------------------------------------------------- 1. midground blocks */
  const unitKit = own(chamferBox(1, 1, 1, 0.05));
  const kitBox = (parent, x, y, z, ry, sx, sy, sz) => kitBoxes.push(matrixOf(x, y + sy / 2, z, ry, sx, sy, sz, parent).clone());
  const kitMast = (parent, x, y, z, r, h) => kitMasts.push(matrixOf(x, y + h / 2, z, 0, r * 2, h, r * 2, parent).clone());
  const elevGeo = own(new THREE.BoxGeometry(1.0, 0.9, 0.35));

  /* ---- v6b GLASS BLOCKS ------------------------------------------------------------------------
     The reference's midground is not dark masses punched with small windows — it is lit curtain wall.
     A third of the district's blocks are GLASS blocks now: instead of a windowGrid of individual
     cells they carry a full-height glazed face with lit floor plates behind it, which is what makes a
     night city read as inhabited rather than as a silhouette with holes in it. The MASS stays dark;
     only the glazing is bright, so the value hierarchy the platinum depends on survives. */
  const glassFaceMat = new THREE.MeshBasicMaterial({ color: 0xc8dcff, toneMapped: true, fog: true });
  glassFaceMat.name = 'city-curtain'; owned.materials.push(glassFaceMat);
  const glazedIds = { L2: 1, C3: 1, R2: 1, L5: 1, F2: 1, R5: 1 };

  /* ONE MODULE PER FACE. The glazing and the platinum frame are now cut from the SAME grid, because a
     pier may only stand in a gap BETWEEN cells and a spandrel course may only sit in a gap between
     rows. Derive the two separately and the frame reads as paint laid over the glass instead of
     structure built around it — the same tell that gives a hairline trim away. Punched-window and
     curtain-wall blocks differ only in this module, so both get the same frame treatment. */
  function winModule(faceW, faceH, glazed) {
    if (glazed) {
      const cols = Math.max(3, Math.floor((faceW - 2 * PW) / 4.2)), rows = Math.max(3, Math.floor(faceH / 7));
      return { cols, rows, cellW: (faceW - 2 * PW - 2.2) / cols - 0.5, cellH: (faceH - 5) / rows - 1.1, gapX: 0.5, gapY: 1.1,
        y0: 3.2, depth: 0.14, onFraction: 0.82, tint: 0xd8e8ff, dimTint: 0x35507a, material: glassFaceMat, name: 'city-curtain' };
    }
    /* fewer lit cells and a wider brightness spread: a night city has dark apartments too (brief §08) */
    return { cols: Math.floor((faceW - 2 * PW - 1.6 + WIN.gapX) / (WIN.cellW + WIN.gapX)),
      rows: Math.floor((faceH - 4.6 + WIN.gapY) / (WIN.cellH + WIN.gapY)),
      cellW: WIN.cellW, cellH: WIN.cellH, gapX: WIN.gapX, gapY: WIN.gapY,
      y0: 3.0, depth: 0.1, onFraction: 0.4, tint: WIN.tint, dimTint: WIN.dimTint, material: winMat, name: 'city-windows' };
  }
  function glaze(parent, mod, seed, place) {
    if (mod.cols < 2 || mod.rows < 2) return 0;
    const grid = windowGrid({ cols: mod.cols, rows: mod.rows, cellW: mod.cellW, cellH: mod.cellH, gapX: mod.gapX, gapY: mod.gapY,
      depth: mod.depth, onFraction: mod.onFraction, seed, material: mod.material, tint: mod.tint, dimTint: mod.dimTint });
    own(grid.geometry);
    place(grid, mod.y0 + grid.userData.windows.totalH / 2);
    grid.name = mod.name; parent.add(grid);
    stats.windows += mod.cols * mod.rows; stats.windowGrids++;
    return mod.cols * mod.rows;
  }

  /* ---- v7 §02 / §03 / §07 THE FRAME ON AN ELEVATION ---------------------------------------------
     A block used to be a navy mass with a hairline of composite on it, so its whole elevation answered
     the environment at one value and the plaza floor out-read the architecture two to one. The frame
     below is what a real building has and this one did not: a base course at the pavement, a PIER on
     every second bay joint running the full height of the glazing, a spandrel COURSE in every second
     row gap, a SILL at the foot of the glass, and a parapet band with its coping. The infill panels
     between them stay dark crystal — that contrast is the point; platinum everywhere would be as flat
     as navy everywhere.
     Orientation decides the grade, not taste. Piers and courses are kept taller than they are deep so
     the face presented to the camera is vertical, and a vertical metal reflects the bright horizon
     band. The sill and the coping are the two pieces whose read is their TOP face, so they take
     platinumMidLit, the low-metalness partner that still answers a black zenith. */
  function frameFace(bm, f, mod) {
    const inner = f.w - 2 * PW - 0.4;
    if (inner < 2.2) return;
    const fm = matrixOf(f.ox, f.yBase, f.oz, f.ry, 1, 1, 1, bm).clone();
    const F = (geo, lx, ly, lz) => xform(geo, lx, ly, lz, 0, 1, 1, 1, fm);
    const pitch = mod.cellH + mod.gapY, totalW = mod.cols * mod.cellW + (mod.cols - 1) * mod.gapX;
    /* the sill answers the same test the glazing does, because a sill with no glass over it is not a
       sill — it is a band left stranded a storey up a blank wall */
    if (mod.cols >= 2 && mod.rows >= 2) B.platLit.push(F(chamferBox(inner, FR.sill, FR.sillD, 0.06), 0, mod.y0 - FR.sill / 2, FR.sillD / 2));
    /* a course marks a FLOOR line, so its pitch follows the module rather than a fixed number: a
       punched-window module already has one row per storey and takes a course every second row, while
       a curtain module's row IS a two-storey floor plate and takes one at each */
    const ch = Math.min(FR.course, mod.gapY - 0.3), step = mod.gapY > 1.6 ? 2 : 1;
    for (let r = 1; r + 1 < mod.rows; r += step)
      B.platMid.push(F(chamferBox(inner, ch, FR.courseD, 0.06), 0, mod.y0 + r * pitch + mod.cellH + mod.gapY / 2, FR.courseD / 2));
    /* the pier is the largest single piece of metal on the elevation, so it carries the brushed grade:
       a directional streak up a 30 m column is the material response the colour is not allowed to be */
    const pw = Math.min(FR.pier, mod.gapX - 0.1), ph = f.top - f.foot;
    if (pw > 0.28 && ph > 6) for (let c = 2; c < mod.cols; c += 2)
      B.platPier.push(F(chamferBox(pw, ph, FR.pierD, 0.05), -totalW / 2 + c * (mod.cellW + mod.gapX) - mod.gapX / 2, f.foot + ph / 2, FR.pierD / 2));
  }
  /* the two pieces of frame that belong to a MASS rather than to one of its faces. Dimensions are the
     band's own outer footprint, so a wing can be framed without its parapet swallowing the slot beside it.
     The base course is a PLINTH: its height follows the mass it carries, because a fixed 1.9 m course
     reads as a plinth on a 60 m tower and as a skirt on a 22 m one. */
  const baseCourse = (P, cx, cz, bw, bd, bh) => B.platMid.push(P(chamferBox(bw, bh, bd, 0.14), cx, bh / 2, cz));
  const parapet = (P, cx, cz, bw, bd, top, band) => {
    B.platMid.push(P(chamferBox(bw, band, bd, 0.18), cx, top - band / 2, cz));
    B.platLit.push(P(chamferBox(bw + 0.3, FR.cope, bd + 0.3, 0.09), cx, top + FR.cope / 2, cz));   /* the coping faces the sky */
  };

  BLOCKS.forEach((spec, i) => {
    const R = rng(SEED + i * 131);
    const { x, z, w, d, h } = spec;
    const rot = spec.rot != null ? spec.rot : 0.55 * Math.atan2(-x, -z) + (R() - 0.5) * 0.12;
    const massing = MASSING_OF(spec.id), glazed = !!glazedIds[spec.id];
    const g = new THREE.Group(); g.name = 'city-block-' + spec.id; g.position.set(x, 0, z); g.rotation.y = rot; g.updateMatrix(); group.add(g);
    const bm = g.matrix;
    const P = (geo, lx, ly, lz, lry = 0, sx = 1, sy = 1, sz = 1) => xform(geo, lx, ly, lz, lry, sx, sy, sz, bm);
    /* every massing answers the same four questions, so the frame, the glazing, the roof kit, the pad
       and the elevator below are written once and never per family:
         faces  the elevations that get the platinum frame (and glazing where the block shows one)
         roof   the deck the parapet rails ring — a terrace on a podium, the low wing on a slot
         top    the highest roof: plant, mast and beacon
         pad    where the life module may land */
    const faces = [], baseH = Math.max(1.1, Math.min(FR.base, h * 0.055));
    let roofY = h, roofW = w, roofD = d, roofX = 0, roofZ = 0;
    let topY = h, topW = w, topD = d, topX = 0, topZ = 0;
    let padY = h, padX = 0, padZ = 0;

    if (massing === 'slotted') {
      /* SLOTTED: one slab cut front-to-back by an OFF-CENTRE slot. The wide wing carries the glazing,
         the narrow blade runs past it to full height, and the link between them stops two thirds up —
         so this block ends in a notch and a shoulder where a stepped block ends in a crown. The slot
         is only a slot if its edges are metal; a deep reveal with dark returns is just a black gap. */
      const slotW = Math.max(2.4, w * 0.13), rem = w - slotW, wA = rem * 0.62, wB = rem * 0.38;
      const xA = -w / 2 + wA / 2, xB = w / 2 - wB / 2, xS = -w / 2 + wA + slotW / 2;
      const hA = Math.round(h * 0.84), hB = h, hL = Math.round(h * 0.6), slotD = Math.min(6.5, d * 0.34);
      /* a wing is narrower than a whole block, so its edge piers are narrower too — a full-width
         pilaster on a 10 m wing would put a fifth of the elevation into metal on width alone */
      const wp = Math.min(PW, Math.max(0.9, wA * 0.1));
      B.structural.push(P(chamferBox(wA, hA, d, 0.45), xA, hA / 2, 0));
      B.structural.push(P(chamferBox(wB, hB, d, 0.4), xB, hB / 2, 0));
      B.structural.push(P(chamferBox(slotW + 0.8, hL, d - slotD, 0.3), xS, hL / 2, -slotD / 2));
      for (const sz of [-1, 1]) {
        B.platMid.push(P(chamferBox(wp, hA + 0.5, wp, 0.12), -w / 2 + wp / 2 - 0.42, (hA + 0.5) / 2, sz * (d / 2 - wp / 2 + 0.42)));
        B.platMid.push(P(chamferBox(wp, hB + 0.5, wp, 0.12), w / 2 - wp / 2 + 0.42, (hB + 0.5) / 2, sz * (d / 2 - wp / 2 + 0.42)));
      }
      B.platMid.push(P(chamferBox(wp * 0.85, hA + 0.4, wp * 0.85, 0.1), xS - slotW / 2 - wp * 0.42, (hA + 0.4) / 2, d / 2 - wp * 0.42 + 0.3));
      B.platMid.push(P(chamferBox(wp * 0.85, hB + 0.4, wp * 0.85, 0.1), xS + slotW / 2 + wp * 0.42, (hB + 0.4) / 2, d / 2 - wp * 0.42 + 0.3));
      baseCourse(P, 0, 0, w + 0.6, d + 0.6, baseH);
      parapet(P, xA, 0, wA + 0.3, d + 0.7, hA, FR.band);
      parapet(P, xB, 0, wB + 0.3, d + 0.7, hB, 1.0);
      faces.push({ ox: xA, yBase: 0, oz: d / 2, ry: 0, w: wA, h: hA, top: hA - FR.band, foot: baseH, seed: 100 + i, glaze: true });
      faces.push({ ox: xB, yBase: 0, oz: d / 2, ry: 0, w: wB, h: hB, top: hB - 1.0, foot: baseH, seed: 400 + i, glaze: true });   /* the blade takes glass only where it is wide enough to hold a module */
      if (spec.side) { const sh = spec.side > 0 ? hB : hA; faces.push({ ox: spec.side * (w / 2), yBase: 0, oz: 0, ry: spec.side * Math.PI / 2, w: d, h: sh, top: sh - 1.0, foot: baseH, seed: 200 + i, glaze: true }); }
      roofY = hA; roofW = wA; roofX = xA;
      topY = hB; topW = wB; topX = xB;
      padY = hA; padX = xA;
    } else if (massing === 'podium') {
      /* PODIUM + SHAFT: a wide low base with a terrace on it and a slender tower set back above. The
         terrace deck is the reason this massing exists in a platinum brief — it is a large HORIZONTAL
         plane at eye level, which is precisely the surface a high-metalness grade turns black on. It
         takes platinumMidLit and reads as the brightest thing on the block. */
      const ph = Math.max(6.5, Math.round(h * 0.26)), pw = w + 6, pd = d + 5;
      const sw = w * 0.72, sd = d * 0.74, sh = h - ph, sz0 = -d * 0.06;
      B.structural.push(P(chamferBox(pw, ph, pd, 0.5), 0, ph / 2, 0));
      B.structural.push(P(chamferBox(sw, sh, sd, 0.45), 0, ph + sh / 2, sz0));
      baseCourse(P, 0, 0, pw + 0.6, pd + 0.6, baseH);
      B.platMid.push(P(chamferBox(pw + 0.5, 0.9, pd + 0.5, 0.16), 0, ph - 0.45, 0));           /* the podium fascia */
      B.platLit.push(P(chamferBox(pw + 1.1, 0.3, pd + 1.1, 0.1), 0, ph + 0.15, 0));            /* THE TERRACE DECK */
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.platMid.push(P(chamferBox(PW * 0.9, sh + 0.4, PW * 0.9, 0.1), sx * (sw / 2 - PW * 0.45 + 0.34), ph + (sh + 0.4) / 2, sz0 + sz * (sd / 2 - PW * 0.45 + 0.34)));
      parapet(P, 0, sz0, sw + 0.6, sd + 0.6, h, 1.0);
      /* a face that starts on a deck has no plinth under it, so its piers run from just above the deck */
      faces.push({ ox: 0, yBase: ph, oz: sz0 + sd / 2, ry: 0, w: sw, h: sh, top: sh - 1.0, foot: 0.3, seed: 100 + i, glaze: true });
      if (spec.side) faces.push({ ox: spec.side * (sw / 2), yBase: ph, oz: sz0, ry: spec.side * Math.PI / 2, w: sd, h: sh, top: sh - 1.0, foot: 0.3, seed: 200 + i, glaze: true });
      /* the podium's own elevation is the widest wall this district puts at eye level — it gets the
         frame and the glass too, or the shaft above it stands on a blank plinth */
      faces.push({ ox: 0, yBase: 0, oz: pd / 2, ry: 0, w: pw, h: ph, top: ph - 0.9, foot: baseH, seed: 400 + i, glaze: true });
      roofY = ph + 0.3; roofW = pw; roofD = pd;
      topY = h; topW = sw; topD = sd; topZ = sz0;
      padY = ph + 0.3; padZ = Math.min(sz0 + sd / 2 + 3.1, pd / 2 - 3.0);
    } else {
      /* STEPPED: the v6 form, kept — a core mass with one setback shaft above it. What changed is the
         frame it wears: the four corner pilasters are platinum now instead of composite, and the base
         course, the piers and the courses put a structural grid on the elevation the mass used to lack. */
      const coreH = spec.sb ? Math.round(h * (1 - spec.sb)) : h;
      B.structural.push(P(chamferBox(w, coreH, d, 0.45), 0, coreH / 2, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.platMid.push(P(chamferBox(PW, coreH + 0.5, PW, 0.12), sx * (w / 2 - PW / 2 + 0.42), (coreH + 0.5) / 2, sz * (d / 2 - PW / 2 + 0.42)));
      baseCourse(P, 0, 0, w + 0.6, d + 0.6, baseH);
      parapet(P, 0, 0, w + 0.7, d + 0.7, coreH, FR.band);
      faces.push({ ox: 0, yBase: 0, oz: d / 2, ry: 0, w, h: coreH, top: coreH - FR.band, foot: baseH, seed: 100 + i, glaze: true });
      if (spec.side) faces.push({ ox: spec.side * (w / 2), yBase: 0, oz: 0, ry: spec.side * Math.PI / 2, w: d, h: coreH, top: coreH - FR.band, foot: baseH, seed: 200 + i, glaze: true });
      roofY = coreH; topY = coreH;
      padY = spec.sb ? coreH : h;
      if (spec.sb) {
        const sw = w * 0.6, sd = d * 0.58, sh = h - coreH, sz0 = -d * 0.14, sx0 = (R() - 0.5) * (w - sw) * 0.5;
        B.structural.push(P(chamferBox(sw, sh, sd, 0.4), sx0, coreH + sh / 2, sz0));
        parapet(P, sx0, sz0, sw + 0.5, sd + 0.5, h, 0.9);
        for (const sx of [-1, 1]) B.platMid.push(P(chamferBox(PW * 0.8, sh + 0.3, PW * 0.8, 0.1), sx0 + sx * (sw / 2 - PW * 0.4 + 0.3), coreH + (sh + 0.3) / 2, sz0 + sd / 2 - PW * 0.4 + 0.3));
        faces.push({ ox: sx0, yBase: coreH, oz: sz0 + sd / 2, ry: 0, w: sw, h: sh, top: sh - 0.9, foot: 0.3, seed: 300 + i, glaze: true });
        topY = h; topW = sw; topD = sd; topX = sx0; topZ = sz0;
        padZ = d / 2 - 3.2;
      }
    }
    /* the frame and the glazing, cut from one module per face; the frame goes on faces the block turns
       to the camera even where there is no glass behind it, so a blank flank is still a framed wall */
    faces.forEach(f => {
      const mod = winModule(f.w, f.h, glazed);
      frameFace(bm, f, mod);
      if (f.glaze) glaze(g, mod, f.seed, (grid, cy) => { grid.position.set(f.ox + 0.06 * Math.sin(f.ry), f.yBase + cy, f.oz + 0.06 * Math.cos(f.ry)); grid.rotation.y = f.ry; });
    });
    /* parapet rails on the block's own deck (front and both sides) */
    kitBox(bm, roofX, roofY, roofZ + roofD / 2 - 0.12, 0, roofW - 0.6, 0.9, 0.12);
    kitBox(bm, roofX - (roofW / 2 - 0.12), roofY, roofZ, 0, 0.12, 0.9, roofD - 0.6);
    kitBox(bm, roofX + (roofW / 2 - 0.12), roofY, roofZ, 0, 0.12, 0.9, roofD - 0.6);
    /* roof plant on the top roof (kept to the back half where a pad shares the roof), one mast on most */
    const shared = spec.pad && padY > topY - 1;
    const n = 2 + Math.floor(R() * 2);
    for (let k = 0; k < n; k++) {
      const bw = 2 + R() * 2.5, bh = 1.2 + R() * 1.8, bd = 2 + R() * 1.5;
      const bx = topX + (R() - 0.5) * Math.max(0, topW - bw - 2.4);
      const bz = shared ? topZ - topD / 4 - R() * Math.max(0, topD / 4 - bd / 2 - 0.6) : topZ + (R() - 0.5) * Math.max(0, topD - bd - 2.4);
      kitBox(bm, bx, topY, bz, 0, bw, bh, bd);
    }
    if (R() < 0.7) {
      const mh = 5 + R() * 6, mx = topX + (R() < 0.5 ? -1 : 1) * (topW / 2 - 1.5), mz = topZ - topD / 2 + 1.5;
      kitMast(bm, mx, topY, mz, 0.22, mh);
      if (i % 3 === 0) B.whites.push(P(new THREE.BoxGeometry(0.5, 0.5, 0.5), mx, topY + mh + 0.25, mz));
    }
    /* rooftop pad for the life module: a low platform with a square-diamond outline in energy */
    if (spec.pad) {
      B.composite.push(P(chamferBox(5.5, 0.3, 5.5, 0.08), padX, padY + 0.15, padZ));
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, hs = 1.9; B.strips.push(P(new THREE.BoxGeometry(2.7, 0.06, 0.28), padX + Math.cos(a) * hs, padY + 0.33, padZ + Math.sin(a) * hs, Math.atan2(-Math.cos(a), -Math.sin(a)))); }
      const position = new THREE.Vector3(padX, padY + 0.3, padZ).applyMatrix4(bm);
      anchors.pads.push({ id: 'city-pad-' + spec.id, position, facing: Math.atan2(-position.x, -position.z), kind: spec.pad, tier: 'far' });
      stats.pads++;
    }
    /* the elevator: a slim track on the front face and one cool-white car that changes floor every few seconds */
    if (spec.elevator) {
      const f0 = faces[0], ex = f0.ox - f0.w / 2 + PW + 1.6, th = f0.h - 3, base = f0.yBase + 3.2;
      B.composite.push(P(chamferBox(0.7, th, 0.3, 0.05), ex, f0.yBase + th / 2 + 1.5, f0.oz + 0.22));
      const car = new THREE.Mesh(elevGeo, whiteMat); car.name = 'city-elevator'; car.position.set(ex, base, f0.oz + 0.4); g.add(car);
      elevator = { mesh: car, floors: Math.max(2, Math.floor((f0.h - 6.5) / FLOOR)), base, floor: 0, dir: 1, from: base, to: base, t0: 0, t1: 0, next: -1, R: rng(SEED + 9001) };
    }
    stats.blocks++;
  });

  /* ---------------------------------------------------------------- bridges and the walkway */
  function span(spec, main) {
    const dx = spec.bx - spec.ax, dz = spec.bz - spec.az, L = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx), W = spec.width;
    const bm = new THREE.Matrix4().compose(new THREE.Vector3((spec.ax + spec.bx) / 2, spec.y, (spec.az + spec.bz) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    const P = (geo, lx, ly, lz, lry = 0) => xform(geo, lx, ly, lz, lry, 1, 1, 1, bm);
    B.structural.push(P(chamferBox(L, 0.5, W, 0.1), 0, 0.05, 0));                    /* deck: top at y + 0.3 */
    B.structural.push(P(chamferBox(L, 1.5, W * 0.6, 0.18), 0, -0.95, 0));            /* girder under the deck */
    for (const s of [-1, 1]) {
      B.trim.push(P(chamferBox(L, 1.05, 0.1, 0.03), 0, 0.82, s * (W / 2 - 0.08)));   /* handrails */
      B.strips.push(P(new THREE.BoxGeometry(L, 0.16, 0.12), 0, 1.4, s * (W / 2 - 0.08)));   /* the thin rail light line */
    }
    /* under-deck lights along the girder's front edge, none where a pylon stands */
    for (let u = -L / 2 + 3; u < L / 2 - 2; u += 6) { if (main && spec.pylons.some(px => Math.abs(px - u) < 1.6)) continue; B.strips.push(P(new THREE.BoxGeometry(0.5, 0.3, 0.5), u, -1.45, W * 0.3 + 0.3)); }
    if (main) {
      /* twin slim pylons either side of the girder with a cross-beam under it; the rail pod hangs below */
      for (const px of spec.pylons) {
        for (const s of [-1, 1]) B.structural.push(P(chamferBox(1.2, spec.y - 1.9, 1.0), px, -(spec.y - 1.9) / 2 - 1.9 + (spec.y - 1.9) / 2 + 0.05 - (spec.y - 1.9) / 2 + (spec.y - 1.9) / 2 - 0.05 + 0.05 - spec.y + (spec.y - 1.9) / 2 + 1.9 - 0.05, s * 2.1));
        B.structural.push(P(chamferBox(1.4, 0.6, 5.4, 0.1), px, -1.95, 0));
        B.whites.push(P(new THREE.BoxGeometry(0.4, 0.4, 0.4), px, -2.45, 2.9));
      }
      pod = { mesh: new THREE.Mesh(own(new THREE.BoxGeometry(3.0, 1.0, 0.9)), whiteMat), y: -3.0, travel: (L - 6) / 6, dwell: 3, half: L / 2 - 3, frame: bm };
      pod.mesh.name = 'city-rail-pod'; pod.mesh.matrixAutoUpdate = false; group.add(pod.mesh);
    }
    /* life path along the deck (world space) */
    const pts = [], nPts = Math.max(2, Math.round(L / 30) + 1);
    for (let k = 0; k < nPts; k++) { const u = -L / 2 + 0.5 + (L - 1) * (k / (nPts - 1)); pts.push(new THREE.Vector3(u, 0.3, 0).applyMatrix4(bm)); }
    anchors.paths.push({ id: spec.id, points: pts, kind: 'bridge' });
    stats.paths++; stats.bridges++;
  }
  span(WALKWAY, true);
  BRIDGES.forEach(b => span(b, false));

  /* ---------------------------------------------------------------- 2. background towers */
  const arch = {
    A: faceted(mergeGeos([new THREE.CylinderGeometry(0.60, 0.72, 1, 4, 1).translate(0, 0.5, 0), new THREE.CylinderGeometry(0.03, 0.60, 0.15, 4, 1).translate(0, 1.075, 0)])),
    B: faceted(mergeGeos([new THREE.CylinderGeometry(0.50, 0.56, 1, 6, 1).translate(0, 0.5, 0), new THREE.CylinderGeometry(0.10, 0.50, 0.12, 6, 1).translate(0, 1.06, 0)])),
    C: faceted(mergeGeos([new THREE.CylinderGeometry(0.70, 0.72, 0.62, 4, 1).translate(0, 0.31, 0), new THREE.CylinderGeometry(0.46, 0.50, 1, 4, 1).translate(0.12, 0.5, 0.1), new THREE.CylinderGeometry(0.04, 0.46, 0.12, 4, 1).translate(0.12, 1.06, 0.1)])),
    D: (() => { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0.5, 0.84); s.lineTo(0.12, 1); s.lineTo(-0.5, 0.9); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 1 }); g.translate(0, 0, -0.18); return faceted(g); })(),
    /* MEGATALL E — the stepped supertall: a long tapering shaft, two setbacks, then a slender spire.
       The classic "how tall is that" silhouette; the spire is what makes the height legible. */
    E: faceted(mergeGeos([
      new THREE.CylinderGeometry(0.40, 0.62, 0.78, 4, 1).translate(0, 0.39, 0),
      new THREE.CylinderGeometry(0.30, 0.40, 0.13, 4, 1).translate(0, 0.845, 0),
      new THREE.CylinderGeometry(0.19, 0.30, 0.09, 4, 1).translate(0, 0.955, 0),
      new THREE.CylinderGeometry(0.03, 0.13, 0.19, 4, 1).translate(0, 1.095, 0)
    ])),
    /* MEGATALL F — the notched twin blade: two slabs of different height sharing a core, so the crown
       is a NOTCH against the sky rather than a point. Reads at any distance, from any bearing. */
    F: faceted(mergeGeos([
      new THREE.BoxGeometry(0.86, 1.0, 0.30).translate(-0.20, 0.5, 0),
      new THREE.BoxGeometry(0.72, 0.83, 0.30).translate(0.38, 0.415, 0),
      new THREE.BoxGeometry(0.30, 0.62, 0.26).translate(0.09, 0.31, 0),
      new THREE.CylinderGeometry(0.02, 0.05, 0.16, 4, 1).translate(-0.20, 1.08, 0)
    ])),
    /* MEGATALL G — the crystalline pinnacle: an eight-sided shaft narrowing to a faceted point, the
       purest expression of the world's diamond language at architectural scale. */
    G: faceted(mergeGeos([
      new THREE.CylinderGeometry(0.34, 0.56, 0.72, 8, 1).translate(0, 0.36, 0),
      new THREE.CylinderGeometry(0.22, 0.34, 0.18, 8, 1).translate(0, 0.81, 0),
      new THREE.CylinderGeometry(0.001, 0.22, 0.22, 8, 1).translate(0, 1.01, 0)
    ]))
  };
  Object.values(arch).forEach(own);
  /* Every tower is assigned a MATERIAL FAMILY independently of its archetype, so a shape and a surface
     are two separate variables and the skyline reads as a mixed city rather than a sorted one. The
     assignment is deterministic and hand-checked against the TOWERS table so no two adjacent bearings
     share a family. Instancing still costs one draw call per (archetype × family) pair actually used. */
  const FAMILY_OF = (a, r, type) => {
    if (type === 'E' || type === 'G') return r > 520 ? 'glass' : 'platinum';   /* megatalls are landmarks: they read first */
    if (type === 'F') return 'graphite';
    const k = (Math.round(a) * 7 + Math.round(r / 10) * 3) % 10;
    return k < 3 ? 'platinum' : k < 6 ? 'glass' : k < 8 ? 'graphite' : 'violet';
  };
  const byArch = {};                       /* 'ARCH|family' -> matrices */
  const archKey = (type, fam) => type + '|' + fam;
  const boxStrips = [], hexStrips = [];
  const Rt = rng(SEED + 77);
  TOWERS.forEach(([a, r, h, w, type, strips]) => {
    const [x, z] = polar(a, r), ry = Rt() * Math.PI * 2;
    const key = archKey(type, FAMILY_OF(a, r, type));
    (byArch[key] || (byArch[key] = [])).push(matrixOf(x, 0, z, ry, w, h, w).clone());
    for (let k = 0; k < strips; k++) {
      const f = strips === 1 ? 0.55 + Rt() * 0.25 : 0.35 + k * 0.3 + Rt() * 0.12, y = f * h;
      if (type === 'A') { const rr = 0.72 + (0.60 - 0.72) * f, side = rr * Math.SQRT2 * w * 1.02; boxStrips.push(matrixOf(x, y, z, ry + Math.PI / 4, side, 1.1, side).clone()); }
      else if (type === 'C') { const rr = 0.50 + (0.46 - 0.50) * f, side = rr * Math.SQRT2 * w * 1.02, ox = 0.12 * w, oz = 0.1 * w; boxStrips.push(matrixOf(x + ox * Math.cos(ry) + oz * Math.sin(ry), y, z - ox * Math.sin(ry) + oz * Math.cos(ry), ry + Math.PI / 4, side, 1.1, side).clone()); }
      else if (type === 'D') boxStrips.push(matrixOf(x, y, z, ry, w * 1.02, 1.1, 0.36 * w * 1.04).clone());
      else if (type === 'E') { const rr = 0.62 + (0.40 - 0.62) * Math.min(1, f / 0.78), side = rr * Math.SQRT2 * w * 1.02; boxStrips.push(matrixOf(x, y, z, ry + Math.PI / 4, side, 1.6, side).clone()); }
      else if (type === 'F') boxStrips.push(matrixOf(x - 0.20 * w * Math.cos(ry), y, z + 0.20 * w * Math.sin(ry), ry, 0.88 * w, 1.6, 0.32 * w).clone());
      else if (type === 'G') { const rr = 0.56 + (0.34 - 0.56) * Math.min(1, f / 0.72); hexStrips.push(matrixOf(x, y, z, ry, rr * w * 1.03, 1.6, rr * w * 1.03).clone()); }
      else { const rr = 0.56 + (0.50 - 0.56) * f; hexStrips.push(matrixOf(x, y, z, ry, rr * w * 1.03, 1.1, rr * w * 1.03).clone()); }
    }
    stats.towers++;
  });
  const instanced = (geo, material, mats, name) => { if (!mats.length) return null; const im = new THREE.InstancedMesh(geo, material, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.name = name; group.add(im); return im; };
  Object.keys(byArch).forEach(k => { const [type, fam] = k.split('|'); instanced(arch[type], towerFamilies[fam], byArch[k], 'city-towers-' + type + '-' + fam); });
  instanced(own(new THREE.BoxGeometry(1, 1, 1)), stripMat, boxStrips, 'city-tower-strips');
  instanced(own(faceted(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true))), stripMat, hexStrips, 'city-tower-strips-hex');

  /* ---------------------------------------------------------------- 3. distant silhouettes */
  const distant = new THREE.Group(); distant.name = 'city-distant'; group.add(distant);
  {
    /* v6 §44: the distant layer is sorted into THREE depth bands by radius and drawn in three values.
       A form at 620 m and a form at 830 m used to be the same 0x0a1322, which is why the far layer read
       as one paper cut-out; giving them different values restores aerial perspective before the fog
       even acts. Each band is one merged mesh, so this costs two extra draw calls in total.
       Distant forms are also CHAMFERED now: eight un-bevelled black rectangles on the horizon was
       exactly the repeated-box read the brief objects to. */
    const band = r => (r < 660 ? B.far0 : r < 760 ? B.far1 : B.far2);
    let [x, z] = polar(50, 720); band(720).push(xform(new THREE.CylinderGeometry(50, 90, 330, 4, 1), x, 165, z, 0.4));   /* the colossal tapered form */
    [x, z] = polar(70, 680);                                                                                             /* the suspended ring on two pylons */
    band(680).push(xform(new THREE.TorusGeometry(115, 7, 6, 44).rotateX(1.25), x, 210, z, 0.1));
    band(680).push(xform(chamferBox(10, 200, 10, 1.6), x - 64, 100, z + 6)); band(680).push(xform(chamferBox(10, 200, 10, 1.6), x + 66, 100, z - 6));
    [x, z] = polar(128, 640); band(640).push(xform(chamferBox(90, 320, 34, 4), x, 160, z, 0.5));                          /* a tall slab above the ridge line */
    [x, z] = polar(100, 780);                                                                                            /* a high platform on slim pylons */
    band(780).push(xform(chamferBox(210, 14, 70, 2.4), x, 232, z, 0.15));
    [-80, 0, 80].forEach(o => band(780).push(xform(chamferBox(8, 232, 8, 1.2), x + o * Math.cos(0.15), 116, z - o * Math.sin(0.15))));
    SLABS.forEach(([a, r, w, h, d, ry]) => { const [sx, sz] = polar(a, r); band(r).push(xform(chamferBox(w, h, d, Math.min(4, w / 6)), sx, h / 2, sz, ry)); });
    stats.giants = 4 + SLABS.length;
    [B.far0, B.far1, B.far2].forEach((F, i) => {
      if (!F.length) return;
      const far = new THREE.Mesh(own(mergeGeos(F)), farMats[i]); far.name = 'city-distant-forms-' + i; far.frustumCulled = false; distant.add(far);
    });
  }
  /* The district ground: an annulus from the plaza slab's edge out to the horizon. It stops at 620 m
     now rather than 900 — beyond that the terrain module owns the world, and the city's ground plane
     must not paint over the natural land or the mountains standing behind it (§10, §41). */
  const ground = new THREE.Mesh(own(new THREE.RingGeometry(126, 620, 72, 1)), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.08; ground.name = 'city-ground'; ground.frustumCulled = false; group.add(ground);

  /* ---------------------------------------------------------------- merges and instances */
  const merged = (list, material, name, shadow) => { if (!list.length) return null; const m = new THREE.Mesh(own(mergeGeos(list)), material); m.name = name; if (shadow) m.castShadow = true; group.add(m); return m; };
  merged(B.structural, structuralM, 'city-structure', true);      /* block bodies, setbacks, decks, pylons — the only shadow casters */
  merged(B.composite, compositeM, 'city-composite', false);
  /* the whole district's platinum frame in three meshes: fifteen blocks' worth of base courses,
     spandrel courses, pilasters, reveals and parapet bands (vertical), their piers (vertical, brushed)
     and their sills, copings and terrace decks (horizontal, low metalness) */
  merged(B.platMid, platMidM, 'city-frame', false);
  merged(B.platPier, platPierM, 'city-frame-piers', false);
  merged(B.platLit, platCapM, 'city-frame-caps', false);
  merged(B.trim, trimM, 'city-rails', false);
  merged(B.strips, stripMat, 'city-energy-lines', false);
  merged(B.whites, whiteMat, 'city-static-lights', false);
  instanced(unitKit, compositeM, kitBoxes, 'city-roof-kit');
  instanced(own(new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1)), trimM, kitMasts, 'city-masts');

  /* ---------------------------------------------------------------- time, theme, motion */
  const themeCol = new THREE.Color(theme.energy), whiteCol = new THREE.Color(WHITE);
  let last = { daylight: 0 };
  function setTime(s) {
    last = s || last; const d = Math.max(0, Math.min(1, last.daylight || 0));
    /* the district reads as a lit city but never outshines the three destinations in front of it:
       windows sit at ~60 % of full at night and 18 % by day (brief §08 window variety, §45 hierarchy) */
    winMat.color.setScalar(0.18 + 0.44 * (1 - d));
    glassFaceMat.color.setHex(0xc8dcff).multiplyScalar(0.3 + 0.62 * (1 - d));   /* the glazed blocks read as lit interiors at night, glass by day */
    stripMat.color.copy(themeCol).multiplyScalar(1 - 0.7 * d);     /* strips / rail lights: day × 0.3 */
    whiteMat.color.copy(whiteCol).multiplyScalar(0.35 + 0.65 * (1 - d));
    return last;
  }
  function setTheme(t) { if (t && t.energy != null) themeCol.setHex(t.energy); setTime(last); return t; }
  /* piecewise-eased traverse: constant speed with short ramps at both ends */
  function ramp(k) { const a = 0.12; return k < a ? k * k / (2 * a * (1 - a)) : k > 1 - a ? 1 - (1 - k) * (1 - k) / (2 * a * (1 - a)) : (k - a / 2) / (1 - a); }
  const podLocal = new THREE.Matrix4();
  function update(t) {
    if (pod) {
      const cycle = 2 * (pod.travel + pod.dwell), ph = t % cycle;
      let u;
      if (ph < pod.travel) u = ramp(ph / pod.travel);
      else if (ph < pod.travel + pod.dwell) u = 1;
      else if (ph < 2 * pod.travel + pod.dwell) u = 1 - ramp((ph - pod.travel - pod.dwell) / pod.travel);
      else u = 0;
      podLocal.makeTranslation(-pod.half + 2 * pod.half * u, pod.y, 0);
      pod.mesh.matrix.multiplyMatrices(pod.frame, podLocal); pod.mesh.matrixWorldNeedsUpdate = true;
    }
    if (elevator) {
      const e = elevator;
      if (e.next < 0) { e.next = t + 2.0; e.mesh.position.y = e.base; }
      else if (t < e.t1) e.mesh.position.y = e.from + (e.to - e.from) * smooth((t - e.t0) / (e.t1 - e.t0));
      else if (t >= e.next) {
        let f = e.floor + e.dir * (1 + Math.floor(e.R() * 3));
        if (f >= e.floors) { f = e.floors; e.dir = -1; } else if (f <= 0) { f = 0; e.dir = 1; }
        e.from = e.mesh.position.y; e.to = e.base + f * FLOOR; e.floor = f; e.t0 = t;
        e.t1 = t + Math.max(0.8, Math.abs(e.to - e.from) / 2.4); e.next = e.t1 + 2.5 + e.R() * 3;
      }
    }
  }
  function setQuality(q) { distant.visible = !q || q.farLayers !== false; return distant.visible; }
  function dispose() {
    if (group.parent) group.parent.remove(group);
    owned.geometries.forEach(g => g.dispose()); owned.geometries.length = 0;
    owned.materials.forEach(m => m.dispose()); owned.materials.length = 0;
  }

  /* cost bookkeeping (what the establishing view can at most draw from this module) */
  group.traverse(o => { if (o.isMesh && o.geometry) { const g = o.geometry, n = g.index ? g.index.count : g.attributes.position.count; stats.triangles += Math.round(n / 3) * (o.isInstancedMesh ? o.count : 1); stats.drawCalls++; } });
  stats.materials = ['tower families: platinum / glass / graphite / violet', 'structural', 'composite', 'trimSatin', 'block frame: platinumMid / platinumMidBrushed (vertical) + platinumMidLit (horizontal)', 'MeshBasic: windows / energy lines / lights / 3 distant bands / ground'];
  stats.massings = BLOCKS.reduce((o, s) => { const k = MASSING_OF(s.id); o[k] = (o[k] || 0) + 1; return o; }, {});
  stats.towerFamilies = Object.keys(byArch).reduce((o, k) => { const f = k.split('|')[1]; o[f] = (o[f] || 0) + byArch[k].length; return o; }, {});
  stats.valleys = ['52-72 deg right', '108-124 deg centre', '128-142 deg left'];
  setTime(ctx.clock && typeof ctx.clock.state === 'function' ? ctx.clock.state() : last);
  update(0);
  return { group, setTime, setTheme, update, dispose, stats, setQuality, anchors: { paths: anchors.paths.filter(p => /^city-/.test(p.id)), pads: anchors.pads.filter(p => /^city-/.test(p.id)) } };
}
