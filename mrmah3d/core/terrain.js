/* MR.MAH 3D :: TERRAIN
   The mountain range behind Mr.Mah — built for R94 from the two luminous
   references (reference/mrmah-refC-luminous-a.png, -b.png).

   What the references actually show, cropped and looked at rather than
   remembered: multi-plane faceted GUNMETAL pyramids and ridges — steel
   grey-blue, LIT, not black cut-outs — with sparkle specks on their lit
   slopes; several depth layers with the far ones dimmer and lower-contrast;
   thin vertical beacons rising from some summits; and low, near-black jagged
   rock ridges in front of the mountain bases.

   HOW IT IS BUILT, and why each choice:

   - Every face's shade is BAKED IN JS into vertex colours from one fixed high
     side-light, and the mesh is drawn with MeshBasicMaterial + vertexColors.
     No scene lighting, no environment lookup, no fog: a mountain costs the
     same as a coloured triangle, which is what a mobile budget wants, and it
     is immune to the trap that killed every previous attempt at this range —
     a fogged object beyond FOG.far is a solid wall of fog colour, and one
     inside the fade is 90% fog colour at these distances. Atmospheric depth
     is therefore authored per layer (a tint toward the mist colour), not
     computed per frame.

   - A whole depth layer is ONE geometry and ONE draw call. Twelve cones plus
     twelve edge outlines used to cost twenty-four draws for two black
     triangles in frame; the entire range here is three draws.

   - Flat faceting comes from non-indexed triangles with one colour per face,
     plus a per-face tone jitter so no two facets of a slope read the same —
     that jitter is what makes it read as rough steel rather than as a low-poly
     asset.

   - Per-vertex jitter on every ring (radius, angle, height) and alternating
     quad diagonals guarantee no two massifs are alike from one table.

   The range is placed against the MEASURED showcase frame (harness aspect
   0.818): the ground at z=-45 lands at 0.636 of the frame height, one unit
   of height there is 0.033 of the frame, the frame's half-width there is
   12.3 units; at z=-80 the figures are 0.621, 0.020 and 20.5. Peaks are kept
   with black sky between them down to about a quarter of their height, so the
   rows where their summits stand stay PARTIAL for DEPTH-01 — a continuous
   range at that height would turn the rows above the horizon into full rows
   and the floor would stop reading as perspective. The flank massifs at
   |x| > 18 exist for the wide in-app fields of view and are outside the
   showcase frame. */

import {
  BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, Points,
  PointsMaterial, Color, Group, Vector3, AdditiveBlending, DoubleSide, FrontSide
} from '../vendor/three/three.module.min.js';

/* One fixed light for the whole range. High, from the left and slightly the
   viewer's side, which is where the scene's key light stands, so the world is
   lit consistently with him. The half vector against a front-on view gives
   the few faces near the mirror direction a bright steel catch. */
/* R94 round 2: from BEHIND-left and high, not front-left. Measured against
   the references' mountain band the first light fronted every camera-facing
   plane and the range came out bimodal — black gaps and pale planes, with
   nothing above 128 luma — where the references are a mid-dark mass (41% of
   pixels in 32-64) with lit left slopes, a bright summit ridge and a 1-2%
   tail of catches. A light from behind leaves the faces toward the camera on
   their ambient floor and lights the slopes that turn away, which is what a
   summit-lit pyramid looks like. */
/* Round 3: dead behind was too far — the whole range fell to its ambient
   floor (85% under 32 luma). From the upper left, a shade behind the picture
   plane: the camera-facing planes then straddle n.L = 0, so with the angular
   jitter every side breaks into alternating lit and dark vertical facets,
   which is the striation the references show, and the average of a face
   lands in the mid-dark band rather than at either end. */
var LIGHT = new Vector3(-0.74, 0.60, -0.12).normalize();
var VIEW = new Vector3(0.0, 0.12, 1.0).normalize();
var HALF = LIGHT.clone().add(VIEW).normalize();

function prng(seed) {
  var s = (seed >>> 0) || 1;
  return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/* Colours are AUTHORED in display sRGB (what the reference pixels measure)
   and converted once to linear for the vertex buffer; the materials are
   toneMapped:false so what is authored is what lands in the frame. */
function srgb(r, g, b) {
  return new Color(r / 255, g / 255, b / 255).convertSRGBToLinear();
}

/* The colour distant things converge on. Not the fog colour (near-black
   ink) — the reference's far mountains go LIGHTER and flatter, toward the
   luminous mist at their bases, which is what aerial perspective does over a
   lit haze. */
var ATMOS = srgb(54, 68, 88);

/* What lights the rock ridges from behind: the mist. Their upward faces take
   a sheen of it, which is the bright edge the references show along every
   ridge top, and the reason the rocks read as sitting IN the mist. */
var MIST_RIM = srgb(120, 145, 172);

/* Tone classes, one per depth layer. `base` is the material's albedo, `amb`
   the unlit floor, `kd` the diffuse gain, `spec` the steel catch colour and
   `ks` its strength, `jitter` the per-face tone spread, `depth` the mix
   toward ATMOS. Values chosen against reference B's mountain pixels: lit
   faces around (118,130,148), shadow faces around (26,30,38), the far layer
   compressed toward (60,72,90). */
var TONES = {
  ridge: { base: srgb(36, 40, 50), amb: 0.26, kd: 0.55, spec: srgb(170, 185, 205), ks: 0.80, shine: 36, jitter: 0.50, depth: 0.0, rim: 0.30 },
  mid:   { base: srgb(132, 146, 166), amb: 0.42, kd: 0.86, spec: srgb(228, 238, 250), ks: 0.62, shine: 28, jitter: 0.62, depth: 0.08, rim: 0.0 },
  far:   { base: srgb(108, 122, 142), amb: 0.40, kd: 0.60, spec: srgb(190, 205, 225), ks: 0.26, shine: 22, jitter: 0.40, depth: 0.40, rim: 0.0 }
};

/* Per-layer irregularity: angular, radial and vertical jitter of the ring
   vertices. The rock ridges take a lot of it — they are jagged rubble, not
   hills — and the mountains take enough to break each side into narrow
   vertical facets of different tone, which is the striated look the references
   have. */
var JITTER = {
  ridge: { ang: 0.60, rad: 0.70, y: 0.70 },
  mid:   { ang: 0.30, rad: 0.30, y: 0.16 },
  far:   { ang: 0.26, rad: 0.28, y: 0.14 }
};

/* Massif table: x, z, height, base radius, sides, z-elongation, seed.
   `beacon` marks a summit that carries a beam. */
var LAYERS = {
  /* Rubble, not hills: many small overlapping peaks with heavy jitter make a
     jagged skyline; a few large ones made smooth dark humps. */
  ridge: {
    tone: 'ridge', rings: 2, profile: 0.8, sparkle: 90, sparkleColor: srgb(185, 200, 220),
    massifs: [
      { x: -9.4, z: -24, h: 1.30, r: 2.2, sides: 9, elong: 0.45, seed: 11 },
      { x: -7.0, z: -26, h: 0.85, r: 1.7, sides: 8, elong: 0.5, seed: 41 },
      { x: -4.6, z: -27.5, h: 1.05, r: 1.9, sides: 9, elong: 0.45, seed: 12 },
      { x: -2.0, z: -26, h: 0.70, r: 1.5, sides: 8, elong: 0.5, seed: 42 },
      { x: 0.8, z: -28, h: 0.95, r: 1.8, sides: 9, elong: 0.45, seed: 43 },
      { x: 3.2, z: -25, h: 1.20, r: 2.0, sides: 9, elong: 0.45, seed: 13 },
      { x: 5.6, z: -27, h: 0.80, r: 1.6, sides: 8, elong: 0.5, seed: 44 },
      { x: 8.3, z: -28, h: 1.45, r: 2.3, sides: 9, elong: 0.45, seed: 14 },
      { x: 11.0, z: -25, h: 1.00, r: 1.9, sides: 8, elong: 0.5, seed: 45 },
      { x: -12.4, z: -23, h: 1.55, r: 2.4, sides: 9, elong: 0.45, seed: 15 },
      { x: -15.6, z: -26, h: 1.10, r: 2.1, sides: 8, elong: 0.5, seed: 46 },
      { x: 13.8, z: -22, h: 1.35, r: 2.3, sides: 9, elong: 0.45, seed: 16 },
      { x: 16.8, z: -25, h: 1.65, r: 2.5, sides: 9, elong: 0.45, seed: 47 },
      { x: -19.5, z: -29, h: 1.8, r: 2.8, sides: 9, elong: 0.45, seed: 17 },
      { x: 20.5, z: -30, h: 1.9, r: 2.9, sides: 9, elong: 0.45, seed: 18 },
      { x: -24.0, z: -26, h: 1.5, r: 2.6, sides: 8, elong: 0.5, seed: 48 },
      { x: 24.5, z: -27, h: 1.6, r: 2.7, sides: 8, elong: 0.5, seed: 49 }
    ]
  },
  mid: {
    tone: 'mid', rings: 6, profile: 1.04, sparkle: 700, sparkleColor: srgb(222, 236, 252),
    massifs: [
      { x: -9.8, z: -44, h: 6.2, r: 6.0, sides: 12, elong: 0.8, seed: 21, beacon: true },
      { x: 10.4, z: -47, h: 5.4, r: 5.4, sides: 13, elong: 0.85, seed: 22, beacon: true },
      { x: -3.2, z: -50, h: 2.9, r: 3.2, sides: 10, elong: 0.9, seed: 23 },
      { x: 4.6, z: -49, h: 2.4, r: 2.8, sides: 10, elong: 0.9, seed: 24 },
      { x: -22.0, z: -46, h: 7.5, r: 7.0, sides: 12, elong: 0.8, seed: 25, beacon: true },
      { x: 21.0, z: -44, h: 6.0, r: 6.5, sides: 12, elong: 0.8, seed: 26 },
      { x: -31.0, z: -50, h: 5.0, r: 6.0, sides: 11, elong: 0.85, seed: 27 },
      { x: 31.5, z: -48, h: 5.6, r: 6.5, sides: 12, elong: 0.85, seed: 28, beacon: true }
    ]
  },
  far: {
    tone: 'far', rings: 4, profile: 1.0, sparkle: 180, sparkleColor: srgb(180, 198, 220),
    massifs: [
      /* Carries a beam so a narrow phone frame — half-width ~8 units at the
         mid range, which puts the flanking beacons just outside — still sees
         one rising near the centre. */
      { x: -6.0, z: -78, h: 6.4, r: 6.8, sides: 10, elong: 0.9, seed: 31, beacon: true },
      { x: 7.0, z: -84, h: 7.4, r: 7.6, sides: 11, elong: 0.9, seed: 32, beacon: true },
      { x: -18.0, z: -72, h: 5.6, r: 6.8, sides: 10, elong: 0.9, seed: 33 },
      { x: 19.0, z: -80, h: 6.0, r: 7.2, sides: 10, elong: 0.9, seed: 34 },
      { x: 0.0, z: -90, h: 4.6, r: 5.8, sides: 9, elong: 0.9, seed: 35 },
      { x: -31.0, z: -82, h: 7.6, r: 8.8, sides: 11, elong: 0.9, seed: 36 },
      { x: 33.0, z: -86, h: 8.4, r: 8.8, sides: 11, elong: 0.9, seed: 37 },
      { x: -44.0, z: -88, h: 7.0, r: 8.0, sides: 10, elong: 0.9, seed: 38 },
      { x: 46.0, z: -84, h: 7.5, r: 8.0, sides: 10, elong: 0.9, seed: 39 }
    ]
  }
};

/* Build one massif into the layer's flat arrays. Returns its summit. */
function buildMassif(spec, layer, tone, acc) {
  var rnd = prng(spec.seed * 7919 + 17);
  var n = spec.sides, rings = layer.rings;
  var elong = spec.elong || 1;
  var J = JITTER[layer.tone];
  var rot = rnd() * Math.PI * 2;
  var ringPts = [];
  for (var k = 0; k <= rings; k++) {
    var t = k / (rings + 1);
    var y = k === 0 ? -0.35 : spec.h * Math.pow(t, layer.profile || 1);
    var rad = spec.r * (1 - t);
    var ring = [];
    for (var i = 0; i < n; i++) {
      var a = rot + (i / n) * Math.PI * 2 + (rnd() - 0.5) * (k === 0 ? 0.10 : J.ang) * (Math.PI * 2 / n) * 2.4;
      var rr = rad * (1 + (rnd() - 0.5) * (k === 0 ? 0.16 : J.rad));
      var yy = y + (k === 0 ? 0 : (rnd() - 0.5) * spec.h * J.y);
      ring.push(new Vector3(spec.x + Math.cos(a) * rr, yy, spec.z + Math.sin(a) * rr * elong));
    }
    ringPts.push(ring);
  }
  var apex = new Vector3(
    spec.x + (rnd() - 0.5) * spec.r * 0.14, spec.h,
    spec.z + (rnd() - 0.5) * spec.r * 0.14 * elong);
  var axis = new Vector3(spec.x, 0, spec.z);

  var ab = new Vector3(), ac = new Vector3(), nrm = new Vector3(), cen = new Vector3(), outv = new Vector3();
  function face(p0, p1, p2) {
    ab.subVectors(p1, p0); ac.subVectors(p2, p0);
    nrm.crossVectors(ab, ac);
    var area = nrm.length() * 0.5;
    if (area < 1e-6) return;
    nrm.multiplyScalar(1 / (area * 2));
    cen.addVectors(p0, p1).add(p2).multiplyScalar(1 / 3);
    /* Wind every face outward, and check it — a culled face and a black face
       look identical on this stage. */
    outv.subVectors(cen, axis); outv.y = Math.max(0.15, outv.y * 0.15);
    if (nrm.dot(outv) < 0) { var tmp = p1; p1 = p2; p2 = tmp; nrm.negate(); }

    var ndl = nrm.dot(LIGHT);
    var diff = Math.max(0, ndl);
    var sky = 0.5 + 0.5 * nrm.y;
    var spec = Math.pow(Math.max(0, nrm.dot(HALF)), tone.shine);
    var jit = 1 + (rnd() - 0.5) * tone.jitter;
    /* The ambient floor is directional too: a face turned away from the light
       sits lower than one square to it, so the shadow side of a pyramid is
       darker than its front and the front is darker than its lit slope. */
    var away = Math.max(0, Math.min(1, (ndl + 0.55) / 0.75));
    var lit = tone.amb * (0.4 + 0.6 * sky) * (0.45 + 0.55 * away) + tone.kd * diff;
    var up = Math.pow(Math.max(0, nrm.y), 2.2) * tone.rim;
    var r = tone.base.r * lit * jit + tone.spec.r * spec * tone.ks + MIST_RIM.r * up;
    var g = tone.base.g * lit * jit + tone.spec.g * spec * tone.ks + MIST_RIM.g * up;
    var b = tone.base.b * lit * jit + tone.spec.b * spec * tone.ks + MIST_RIM.b * up;
    r += (ATMOS.r - r) * tone.depth; g += (ATMOS.g - g) * tone.depth; b += (ATMOS.b - b) * tone.depth;

    acc.pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    acc.col.push(r, g, b, r, g, b, r, g, b);
    acc.tris++;

    /* Sparkle specks live on the lit slopes only, sitting a hair off the
       surface so they never z-fight with it. */
    /* Specks favour the lit slopes but are not confined to them — the
       references' front faces carry sparkle too, catching light the face as a
       whole does not. */
    if ((diff > 0.20 || rnd() < 0.40) && acc.sparkleBudget > 0 && area > 0.3) {
      var want = Math.min(acc.sparkleBudget, 1 + Math.floor(rnd() * 3.5 * Math.min(1, area / 4)));
      for (var s = 0; s < want; s++) {
        var u = rnd(), v = rnd();
        if (u + v > 1) { u = 1 - u; v = 1 - v; }
        var w = 1 - u - v;
        var px = p0.x * w + p1.x * u + p2.x * v + nrm.x * 0.06;
        var py = p0.y * w + p1.y * u + p2.y * v + nrm.y * 0.06;
        var pz = p0.z * w + p1.z * u + p2.z * v + nrm.z * 0.06;
        if (py < 0.05) continue;
        var bright = 0.45 + rnd() * 0.55;
        acc.spk.push(px, py, pz);
        acc.spkCol.push(layer.sparkleColor.r * bright, layer.sparkleColor.g * bright, layer.sparkleColor.b * bright);
        acc.sparkleBudget--;
      }
    }
  }

  for (var k2 = 0; k2 < rings; k2++) {
    var A = ringPts[k2], B = ringPts[k2 + 1];
    for (var i2 = 0; i2 < n; i2++) {
      var a0 = A[i2], a1 = A[(i2 + 1) % n], b0 = B[i2], b1 = B[(i2 + 1) % n];
      if (rnd() < 0.5) { face(a0, a1, b1); face(a0, b1, b0); }
      else { face(a0, a1, b0); face(a1, b1, b0); }
    }
  }
  var T = ringPts[rings];
  for (var i3 = 0; i3 < n; i3++) face(T[i3], T[(i3 + 1) % n], apex);

  return { x: apex.x, y: apex.y, z: apex.z, h: spec.h, frontZ: spec.z + spec.r * elong, beacon: !!spec.beacon };
}

function buildLayer(name, layer) {
  var tone = TONES[layer.tone];
  var acc = { pos: [], col: [], spk: [], spkCol: [], tris: 0, sparkleBudget: layer.sparkle };
  var summits = layer.massifs.map(function (m) { return buildMassif(m, layer, tone, acc); });
  var geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(acc.pos, 3));
  geo.setAttribute('color', new Float32BufferAttribute(acc.col, 3));
  var mat = new MeshBasicMaterial({
    vertexColors: true, fog: false, toneMapped: false, side: FrontSide
  });
  var mesh = new Mesh(geo, mat);
  mesh.name = 'terrain-' + name;
  mesh.matrixAutoUpdate = false;
  mesh.frustumCulled = false;   /* a layer spans the world; culling it would blink it out at the frame edge */
  var spkGeo = new BufferGeometry();
  spkGeo.setAttribute('position', new Float32BufferAttribute(acc.spk, 3));
  spkGeo.setAttribute('color', new Float32BufferAttribute(acc.spkCol, 3));
  return { mesh: mesh, geo: geo, mat: mat, spkGeo: spkGeo, summits: summits, tris: acc.tris, sparkles: acc.spk.length / 3 };
}

/* ---------------------------------------------------------------------------
   Summit beacons: thin vertical additive beams rising from a few peaks,
   brightest at the summit and dissolving over ~2.8x the peak's height. All of
   them share one geometry and one material — one draw call. Two crossed quads
   each so they keep their width from the in-app azimuths. fog:false, because a
   fogged additive quad at z=-45 adds ink, i.e. nothing: that is exactly why the
   previous peakBeams were built, placed correctly and never seen. */
function buildBeacons(summits, ramp) {
  var pos = [], uv = [];
  function quad(cx, cy, cz, w, h, axis) {
    /* v=0 at the bottom (the ramp's opaque end), v=1 at the top. */
    var hx = axis === 0 ? w / 2 : 0, hz = axis === 0 ? 0 : w / 2;
    var y0 = cy, y1 = cy + h;
    var p = [
      [cx - hx, y0, cz - hz], [cx + hx, y0, cz + hz], [cx + hx, y1, cz + hz],
      [cx - hx, y0, cz - hz], [cx + hx, y1, cz + hz], [cx - hx, y1, cz - hz]
    ];
    var t = [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]];
    for (var i = 0; i < 6; i++) { pos.push(p[i][0], p[i][1], p[i][2]); uv.push(t[i][0], t[i][1]); }
  }
  summits.forEach(function (s) {
    /* Measured on the references: a beam runs about 0.6-1.0x its peak's
       height above the summit before it has faded. 2.8x ran every beam out of
       the top of the frame as a fence of lines. */
    var w = s.far ? 0.16 : 0.22;
    var h = s.h * 1.25;
    quad(s.x, s.y - 0.25, s.z, w, h, 0);
    quad(s.x, s.y - 0.25, s.z, w, h, 1);
  });
  var geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  var mat = new MeshBasicMaterial({
    map: ramp, color: srgb(196, 232, 255), transparent: true, opacity: 0.82,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false,
    side: DoubleSide, fog: false
  });
  var mesh = new Mesh(geo, mat);
  mesh.name = 'beacon-beams';
  mesh.frustumCulled = false;
  return { mesh: mesh, geo: geo, mat: mat };
}

/* The floor's answer to the beacons: a short streak lying on the floor in
   front of each beacon's mountain, running toward the camera and dissolving —
   the wet floor giving back the beam above it. Narrow, so it adds converging
   content rather than a veil; it lands on rows that are already the horizon. */
function buildBeaconReflections(summits, ramp) {
  var pos = [], uv = [];
  summits.forEach(function (s) {
    /* On the NEAR floor, in front of the rock ridges (z -22..-30): a streak at
       the mountain's own foot is behind opaque rock and never seen. Reference A
       shows them exactly here, on the open floor below the range. */
    var w = 0.26, len = 7.0;
    var z0 = -19.5, z1 = z0 + len;
    var p = [
      [s.x - w / 2, 0.02, z0], [s.x + w / 2, 0.02, z0], [s.x + w / 2, 0.02, z1],
      [s.x - w / 2, 0.02, z0], [s.x + w / 2, 0.02, z1], [s.x - w / 2, 0.02, z1]
    ];
    var t = [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]];
    for (var i = 0; i < 6; i++) { pos.push(p[i][0], p[i][1], p[i][2]); uv.push(t[i][0], t[i][1]); }
  });
  var geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  var mat = new MeshBasicMaterial({
    map: ramp, color: srgb(120, 190, 232), transparent: true, opacity: 0.34,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false,
    side: DoubleSide, fog: false
  });
  var mesh = new Mesh(geo, mat);
  mesh.name = 'beacon-reflections';
  mesh.frustumCulled = false;
  return { mesh: mesh, geo: geo, mat: mat };
}

/* ---------------------------------------------------------------------------
   createTerrain({ tier, settings, ramp, radial })

     group      the three depth layers + sparkles      (export as 'structures')
     beacons    beams, summit caps, floor reflections  (export as 'pillars')
     setDetail(k)   scales the sparkle specks with on-screen size
     applyWeight(st) per-mode structures weight, from AUTHORED baselines
     update(dt)     beacon breathing
     dispose()      releases every geometry, material and texture it made */
export function createTerrain(options) {
  var opts = options || {};
  var tier = opts.tier || 'medium';
  var settings = opts.settings || {};
  var owned = [];
  var group = new Group();
  group.name = 'structures';

  var layers = {};
  var summits = [];
  var stats = { tris: 0, sparkles: 0 };
  var spkPos = [], spkCol = [];
  ['far', 'mid', 'ridge'].forEach(function (name) {
    var L = buildLayer(name, LAYERS[name]);
    layers[name] = L;
    group.add(L.mesh);
    owned.push(L.geo, L.mat);
    stats.tris += L.tris;
    stats.sparkles += L.sparkles;
    var p = L.spkGeo.attributes.position.array, c = L.spkGeo.attributes.color.array;
    for (var i = 0; i < p.length; i++) { spkPos.push(p[i]); spkCol.push(c[i]); }
    L.spkGeo.dispose();
    L.summits.forEach(function (s) { if (s.beacon) { s.far = name === 'far'; summits.push(s); } });
  });

  /* Sparkles: one Points for the whole range. Sub-pixel on a phone at chat
     size, so setDetail pulls them back rather than letting them fizz. The low
     tier simply gets fewer of them. */
  var keep = tier === 'low' ? 0.5 : 1;
  var spkGeo = new BufferGeometry();
  var n = Math.floor((spkPos.length / 3) * keep);
  spkGeo.setAttribute('position', new Float32BufferAttribute(spkPos.slice(0, n * 3), 3));
  spkGeo.setAttribute('color', new Float32BufferAttribute(spkCol.slice(0, n * 3), 3));
  /* Size is in world units under sizeAttenuation: at the mid range's 52 units
     a 0.13 speck resolved to 1.7 px on a 1400-px frame and was invisible.
     0.34 is a 4-5 px speck there, and sub-pixel on a low-tier phone, which is
     what setDetail is for. */
  var spkMat = new PointsMaterial({
    size: 0.30, sizeAttenuation: true, vertexColors: true, map: opts.radial || null,
    transparent: true, opacity: 1.0, depthWrite: false, blending: AdditiveBlending,
    fog: false, toneMapped: false
  });
  var sparkles = new Points(spkGeo, spkMat);
  sparkles.name = 'terrain-sparkles';
  sparkles.frustumCulled = false;
  group.add(sparkles);
  owned.push(spkGeo, spkMat);

  /* Beacons. */
  var beacons = new Group();
  beacons.name = 'beacons';
  var beams = buildBeacons(summits, opts.ramp);
  beacons.add(beams.mesh);
  owned.push(beams.geo, beams.mat);

  /* A hot cap at each summit: the point the beam is brightest at. */
  var capGeo = new BufferGeometry();
  var capPos = [];
  summits.forEach(function (s) { capPos.push(s.x, s.y + 0.05, s.z); });
  capGeo.setAttribute('position', new Float32BufferAttribute(capPos, 3));
  var capMat = new PointsMaterial({
    color: srgb(225, 242, 255), size: 1.1, sizeAttenuation: true, map: opts.radial || null,
    transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending,
    fog: false, toneMapped: false
  });
  var caps = new Points(capGeo, capMat);
  caps.name = 'beacon-caps';
  caps.frustumCulled = false;
  beacons.add(caps);
  owned.push(capGeo, capMat);

  var refl = null;
  if (settings.worldReflections) {
    refl = buildBeaconReflections(summits, opts.ramp);
    beacons.add(refl.mesh);
    owned.push(refl.geo, refl.mat);
  }

  /* Authored baselines, captured once, so a weight of 1 restores exactly what
     was built and no literal is ever duplicated into applyWeight. */
  var BASE = {
    beam: beams.mat.opacity, cap: capMat.opacity, refl: refl ? refl.mat.opacity : 0,
    sparkle: spkMat.opacity
  };
  var weight = 1, detail = 1, time = 0;

  function applyWeight(st) {
    weight = Math.max(0, Math.min(1, st == null ? 1 : st));
    group.visible = weight > 0.05;
    beacons.visible = weight > 0.05;
    /* A quiet mode dims the range rather than losing it: the material colour is
       a multiplier over the baked vertex colours, so this scales the whole layer
       without touching what was authored. */
    var dim = 0.45 + 0.55 * weight;
    Object.keys(layers).forEach(function (k) { layers[k].mat.color.setScalar(dim); });
    beams.mat.opacity = BASE.beam * weight;
    capMat.opacity = BASE.cap * weight;
    if (refl) refl.mat.opacity = BASE.refl * weight;
    spkMat.opacity = BASE.sparkle * weight * (0.3 + 0.7 * detail);
  }

  function setDetail(k) {
    detail = Math.max(0, Math.min(1, Number(k) || 0));
    spkMat.opacity = BASE.sparkle * weight * (0.3 + 0.7 * detail);
  }

  function update(dt) {
    time += dt;
    /* A slow breath on the beams — a static beam reads as a painted line, one
       that breathes reads as emitted. Small enough never to flicker. */
    beams.mat.opacity = BASE.beam * weight * (0.93 + 0.07 * Math.sin(time * 0.7));
  }

  function dispose() {
    owned.forEach(function (o) { if (o && o.dispose) o.dispose(); });
    if (group.parent) group.parent.remove(group);
    if (beacons.parent) beacons.parent.remove(beacons);
  }

  return {
    group: group, beacons: beacons, sparkles: sparkles, summits: summits,
    layers: layers, stats: stats,
    applyWeight: applyWeight, setDetail: setDetail, update: update, dispose: dispose
  };
}

export var __internals = { LAYERS: LAYERS, TONES: TONES, LIGHT: LIGHT, buildLayer: buildLayer };
