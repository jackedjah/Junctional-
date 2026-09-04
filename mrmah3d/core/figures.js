/* MR.MAH 3D :: FIGURES  (R95 world)
   The small distant variant figures of reference/mrmah-refD-guardian-a.png
   and -d.png: a handful of low-detail silhouettes on the near ridge, each a
   different body outcome — out of shape, overweight, extremely thin, obese,
   differently proportioned, a couple close to Mr.Mah's own shape — with a
   diamond head that varies a little (wider, taller, one rounder) and two
   small lit eyes. They are world elements: dim, partly in the mist, no edge
   lines, no halo. Suggestive, never the focus.

   HOW THEY ARE BUILT, and why:

   - Every figure is assembled from forge.js — `loft` for the torso taper and
     the head, `segment` for the limbs — and then STRIPPED: only positions
     survive, every face's shade is baked into a vertex colour from one fixed
     light exactly as terrain.js does, and the lot is merged into ONE geometry
     drawn with MeshBasicMaterial + vertexColors. All the bodies are one draw;
     all the eyes are a second (one Points). Two draws, and a triangle budget
     of 1,600 for the whole cast, which is what "cheap" means here.
   - No scene lighting, no environment lookup, no fog: fog at z -25..-33 is
     most of the way to fog colour, so the atmosphere is authored as a tint
     toward the mist instead, and the feet dissolve into it through vertex
     alpha (the same `fadeFoot` trick the rock ridges use).
   - Faces are wound outward and CHECKED, because a culled face and a black
     face look identical on this stage.
   - They stand at z -17.6..-21.8: at the near edge of the front mist row
     (z -20) with the rock ridges (z -22..-30) and the rear mist bank (z -33)
     behind them, so they read as silhouettes against the mist rather than
     shapes seen through it. Their feet dissolve into the row's base band.

   PLACEMENT is measured, not assumed. The in-app cameras stand to his right
   and swing the world's left side BEHIND him — at chat, world x = -9 at
   z -26 lands inside his torso and x = -13..-17 behind his hanging arm — so
   the cast lives on the right of the frame (x 2.2..5.5, clear of him in
   every mode) with two figures at x -3.6 and -4.8, which sit left of his
   hanging hand in showcase and website and below his raised elbow in chat and
   protocol. The far left, where a real crowd would also stand, is behind his
   arm at chat scale and stays empty. */

import {
  BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, Points,
  PointsMaterial, Group, Color, Vector3, AdditiveBlending, FrontSide
} from '../vendor/three/three.module.min.js';
import { loft, segment } from './character/forge.js';

/* Colours are authored as the value that LANDS in the frame: the renderer
   writes linear values with no tone mapping (renderer.js, R95), so a vertex
   colour of 0.25 is 64 on screen. */
function land(r, g, b) { return new Color(r / 255, g / 255, b / 255); }

/* One fixed light for the cast, upper-left and a shade behind the picture
   plane, matching the range's. The faces toward the camera sit on their
   ambient floor; the slopes that turn away are lit — a silhouette with a lit
   edge, which is how the references' figures read. */
var LIGHT = new Vector3(-0.62, 0.56, -0.30).normalize();
var VIEW = new Vector3(0.0, 0.14, 1.0).normalize();

/* Dark steel, a blue silhouette lift, and the mist they stand in.

   Round 1 had base (58,66,82) with an 18% mist tint and measured a figure at
   mean 72 with NOTHING under 32 — a pale cut-out lighter than the mist behind
   it. The references' figures are darker than the mist, read as silhouettes
   with a blue edge, so the base is half that and the rim does the drawing. */
var TONE = {
  base: land(30, 35, 46), amb: 0.55, kd: 0.36, jitter: 0.30,
  rim: land(96, 170, 230), rimK: 0.42,
  mist: land(124, 148, 176), depth: 0.10,
  footFade: 0.24            /* of the figure's height: alpha 0 at the floor */
};

/* Mr.Mah is 3.0 units tall. Each figure is `s` of that. */
var HIS_HEIGHT = 3.0;

/* Body presets, in fractions of the figure's own height. `torso` is a ring
   table for the loft (y, w, d, optional zc), hips-to-neck for legged bodies
   and tip-to-neck for the two that share his taper. Limb radii likewise. */
var BODIES = {
  athletic: {
    torso: [
      { y: 0.47, w: 0.105, d: 0.078 }, { y: 0.58, w: 0.092, d: 0.072 },
      { y: 0.70, w: 0.130, d: 0.088 }, { y: 0.80, w: 0.150, d: 0.086 }, { y: 0.84, w: 0.050, d: 0.045 }
    ],
    legs: true, hip: 0.062, legR: [0.050, 0.034], arm: [0.036, 0.026], hand: [0.21, 0.42], shoulder: 0.15
  },
  /* His own shape: no legs, a taper to a point. */
  taper: {
    torso: [
      { y: 0.00, w: 0.010, d: 0.008 }, { y: 0.22, w: 0.055, d: 0.045 }, { y: 0.44, w: 0.095, d: 0.072 },
      { y: 0.60, w: 0.110, d: 0.080 }, { y: 0.71, w: 0.138, d: 0.090 }, { y: 0.80, w: 0.152, d: 0.086 }, { y: 0.84, w: 0.050, d: 0.045 }
    ],
    legs: false, arm: [0.036, 0.026], hand: [0.21, 0.40], shoulder: 0.152
  },
  heavy: {
    torso: [
      { y: 0.44, w: 0.160, d: 0.120 }, { y: 0.56, w: 0.172, d: 0.138 },
      { y: 0.70, w: 0.160, d: 0.118 }, { y: 0.80, w: 0.168, d: 0.100 }, { y: 0.84, w: 0.060, d: 0.052 }
    ],
    legs: true, hip: 0.085, legR: [0.066, 0.042], arm: [0.046, 0.032], hand: [0.25, 0.44], shoulder: 0.165
  },
  obese: {
    torso: [
      { y: 0.40, w: 0.190, d: 0.150 }, { y: 0.52, w: 0.215, d: 0.180 },
      { y: 0.66, w: 0.195, d: 0.150 }, { y: 0.78, w: 0.170, d: 0.110 }, { y: 0.83, w: 0.070, d: 0.060 }
    ],
    legs: true, hip: 0.095, legR: [0.074, 0.046], arm: [0.050, 0.034], hand: [0.28, 0.44], shoulder: 0.17
  },
  thin: {
    torso: [
      { y: 0.48, w: 0.072, d: 0.055 }, { y: 0.60, w: 0.060, d: 0.050 },
      { y: 0.72, w: 0.084, d: 0.062 }, { y: 0.81, w: 0.098, d: 0.062 }, { y: 0.85, w: 0.036, d: 0.032 }
    ],
    legs: true, hip: 0.040, legR: [0.032, 0.022], arm: [0.022, 0.016], hand: [0.15, 0.44], shoulder: 0.098
  },
  /* Out of shape: soft middle, shoulders forward and a little low. */
  soft: {
    torso: [
      { y: 0.46, w: 0.130, d: 0.100 }, { y: 0.57, w: 0.140, d: 0.118 },
      { y: 0.69, w: 0.126, d: 0.098 }, { y: 0.77, w: 0.138, d: 0.090, zc: 0.02 }, { y: 0.81, w: 0.050, d: 0.045, zc: 0.03 }
    ],
    legs: true, hip: 0.070, legR: [0.054, 0.036], arm: [0.038, 0.028], hand: [0.22, 0.44], shoulder: 0.138, neck: 0.81
  },
  /* Differently proportioned: long torso, short legs, broad shoulders. */
  stocky: {
    torso: [
      { y: 0.36, w: 0.135, d: 0.100 }, { y: 0.50, w: 0.125, d: 0.095 },
      { y: 0.66, w: 0.150, d: 0.100 }, { y: 0.79, w: 0.178, d: 0.096 }, { y: 0.83, w: 0.055, d: 0.048 }
    ],
    legs: true, hip: 0.075, legR: [0.060, 0.040], arm: [0.042, 0.030], hand: [0.26, 0.40], shoulder: 0.178
  }
};

/* Head presets: half-width, half-height, half-depth as fractions of the
   figure's height, and the ring count. 4 sides is the diamond; `round` is
   eight-sided with two extra rings, a faceted ball. */
var HEADS = {
  diamond: { hw: 0.105, hh: 0.095, hd: 0.075, sides: 4 },
  wide:    { hw: 0.135, hh: 0.082, hd: 0.075, sides: 4 },
  tall:    { hw: 0.088, hh: 0.118, hd: 0.070, sides: 4 },
  round:   { hw: 0.098, hh: 0.098, hd: 0.090, sides: 8, rings: 2 }
};

/* THE CAST. x/z in world units, s the height as a fraction of his, yaw in
   radians (they do not all face the camera). Measured against every mode's
   camera — see the module note. */
/* Round 2 moved the whole cast forward, from z -24..-33 to z -17.6..-21.8.
   At the first depth they stood BEHIND the front mist row (z -20), and a
   215-luma veil at 0.3-0.45 alpha lifted every figure to a mean of 68 with
   no pixel under 32 — a pale cut-out, whatever its own tone. The references
   put their figures at the mist's near edge with the bank BEHIND them, which
   is where these now stand, scaled down for the nearer depth. */
var CAST = [
  { x: 1.8, z: -18.8, s: 0.50, yaw: 0.25, body: 'athletic', head: 'diamond' },
  { x: 3.2, z: -17.6, s: 0.44, yaw: -0.35, body: 'heavy', head: 'wide' },
  { x: 4.5, z: -19.2, s: 0.40, yaw: 0.40, body: 'thin', head: 'tall' },
  { x: 1.1, z: -20.4, s: 0.34, yaw: 0.05, body: 'taper', head: 'diamond' },
  { x: 5.3, z: -21.0, s: 0.36, yaw: -0.2, body: 'stocky', head: 'wide' },
  { x: 2.9, z: -23.5, s: 0.32, yaw: 0.10, body: 'athletic', head: 'diamond' },
  /* The two on his left. Measured to the frame: in showcase the obese one
     clears his hanging hand (0.29 across) by 0.015 and in protocol the soft
     one clears his taper's edge (0.39) by 0.04. A third figure further left
     (x -5) landed ON that edge in protocol and had no clear position in
     every mode, so the cast is seven and one, not six and two. */
  { x: -2.6, z: -18.0, s: 0.46, yaw: 0.45, body: 'obese', head: 'round' },
  { x: -3.7, z: -20.6, s: 0.42, yaw: -0.25, body: 'soft', head: 'diamond' }
];

function prng(seed) {
  var s = (seed >>> 0) || 1;
  return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/* Take a forge geometry's positions, place them in the world (yaw about the
   figure's own axis, then translate), wind every face outward from `centre`
   and CHECK it, shade it, and append to the flat arrays. */
function bake(geometry, place, centre, h, acc, rnd) {
  var p = geometry.attributes.position.array;
  var cosY = Math.cos(place.yaw), sinY = Math.sin(place.yaw);
  function world(i) {
    var x = p[i], y = p[i + 1], z = p[i + 2];
    return new Vector3(x * cosY + z * sinY + place.x, y, -x * sinY + z * cosY + place.z);
  }
  var cw = new Vector3(centre.x * cosY + centre.z * sinY + place.x, centre.y, -centre.x * sinY + centre.z * cosY + place.z);
  var ab = new Vector3(), ac = new Vector3(), n = new Vector3(), cen = new Vector3(), outv = new Vector3();
  for (var i = 0; i < p.length; i += 9) {
    var p0 = world(i), p1 = world(i + 3), p2 = world(i + 6);
    ab.subVectors(p1, p0); ac.subVectors(p2, p0);
    n.crossVectors(ab, ac);
    var len = n.length();
    if (len < 1e-9) continue;
    n.multiplyScalar(1 / len);
    cen.addVectors(p0, p1).add(p2).multiplyScalar(1 / 3);
    outv.subVectors(cen, cw);
    if (n.dot(outv) < 0) { var t = p1; p1 = p2; p2 = t; n.negate(); }

    var ndl = n.dot(LIGHT);
    var diff = Math.max(0, ndl);
    var sky = 0.5 + 0.5 * n.y;
    var away = Math.max(0, Math.min(1, (ndl + 0.55) / 0.75));
    var lit = TONE.amb * (0.4 + 0.6 * sky) * (0.60 + 0.40 * away) + TONE.kd * diff;
    var jit = 1 + (rnd() - 0.5) * TONE.jitter;
    /* The silhouette lift: faces that graze the view direction take a little
       blue, which is the rim the references' figures carry against the mist. */
    var rim = Math.pow(1 - Math.max(0, n.dot(VIEW)), 3) * TONE.rimK;
    var r = TONE.base.r * lit * jit + TONE.rim.r * rim;
    var g = TONE.base.g * lit * jit + TONE.rim.g * rim;
    var b = TONE.base.b * lit * jit + TONE.rim.b * rim;
    r += (TONE.mist.r - r) * TONE.depth; g += (TONE.mist.g - g) * TONE.depth; b += (TONE.mist.b - b) * TONE.depth;

    var fade = TONE.footFade * h;
    var al = function (y) { return y >= fade ? 1 : Math.pow(Math.max(0, y) / fade, 0.8); };
    acc.pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    acc.col.push(r, g, b, al(p0.y), r, g, b, al(p1.y), r, g, b, al(p2.y));
    acc.tris++;
  }
  geometry.dispose();
}

function buildFigure(spec, acc, eyes) {
  var h = HIS_HEIGHT * spec.s;
  var body = BODIES[spec.body], head = HEADS[spec.head];
  var rnd = prng(spec.x * 977 + spec.z * 131 + 7);
  var place = { x: spec.x, z: spec.z, yaw: spec.yaw };
  var neckY = (body.neck || 0.84) * h;

  /* Torso: a loft of the body's ring table, lightly faceted so the flat
     shading breaks across it. 7 sides: one plane per side reads at this size. */
  var rings = body.torso.map(function (s) {
    return { y: s.y * h, w: s.w * h, d: s.d * h, facet: 0.03, crystal: 0.025, zc: (s.zc || 0) * h };
  });
  var torso = loft(rings, 7, { phase: Math.PI / 2 });
  var midY = (rings[0].y + rings[rings.length - 1].y) / 2;
  bake(torso.geometry, place, new Vector3(0, midY, 0), h, acc, rnd);

  /* Head: a diamond (4 sides, point-equator-point) or a faceted ball. */
  var hy = neckY + head.hh * h * 0.9;
  var headRings;
  if (head.rings) {
    headRings = [
      { y: hy - head.hh * h, w: 0.004, d: 0.004 },
      { y: hy - head.hh * h * 0.5, w: head.hw * h * 0.82, d: head.hd * h * 0.82 },
      { y: hy, w: head.hw * h, d: head.hd * h },
      { y: hy + head.hh * h * 0.5, w: head.hw * h * 0.82, d: head.hd * h * 0.82 },
      { y: hy + head.hh * h, w: 0.004, d: 0.004 }
    ];
  } else {
    headRings = [
      { y: hy - head.hh * h, w: 0.004, d: 0.004 },
      { y: hy, w: head.hw * h, d: head.hd * h },
      { y: hy + head.hh * h, w: 0.004, d: 0.004 }
    ];
  }
  var headGeo = loft(headRings, head.sides, { phase: 0, capTop: false, capBottom: false });
  bake(headGeo.geometry, place, new Vector3(0, hy, 0), h, acc, rnd);

  /* Eyes: two lit points on the front of the head, in world space. Held a
     fifth of the head's depth clear of its front point: at 0.92 of it they
     sat on the diamond's own surface and the depth test ate them. */
  var ex = head.hw * h * 0.26, ez = head.hd * h * 1.2, ey = hy + head.hh * h * 0.08;
  [-ex, ex].forEach(function (x) {
    var wx = x * Math.cos(place.yaw) + ez * Math.sin(place.yaw) + place.x;
    var wz = -x * Math.sin(place.yaw) + ez * Math.cos(place.yaw) + place.z;
    eyes.push(wx, ey, wz);
  });

  /* Arms: shoulder to hand, two steps, four sides. The hand hangs a little
     out from the hip, the way an idle figure's does. */
  var sh = body.shoulder * h, ay = 0.79 * h;
  [-1, 1].forEach(function (side) {
    var a = [side * sh * 0.92, ay, 0.0];
    var b = [side * body.hand[0] * h, body.hand[1] * h, 0.06 * h];
    var arm = segment(a, b, body.arm[0] * h, body.arm[1] * h, 4, { steps: 2, crystal: 0.02 });
    bake(arm, place, new Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), h, acc, rnd);
  });

  /* Legs, for the bodies that have them: hip to floor, one step. Their feet
     are alpha 0 (footFade), so they dissolve into the mist rather than
     standing on a line. */
  if (body.legs) {
    var hipY = body.torso[0].y * h;
    [-1, 1].forEach(function (side) {
      var a = [side * body.hip * h, hipY, 0.0];
      var b = [side * body.hip * h * 1.15, 0.0, 0.02 * h];
      var leg = segment(a, b, body.legR[0] * h, body.legR[1] * h, 4, { steps: 1, crystal: 0.015 });
      bake(leg, place, new Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), h, acc, rnd);
    });
  }
  return { x: spec.x, z: spec.z, h: h, top: hy + head.hh * h, halfWidth: Math.max(body.shoulder, body.hand[0]) * h };
}

/* createFigures({ radial })
     group        the cast (export as 'figures')
     applyWeight(w)  per-mode structures weight, from AUTHORED baselines
     setDetail(k)    scale hint: the eyes are sub-pixel at app scale
     dispose()       releases everything it made */
export function createFigures(options) {
  var opts = options || {};
  var owned = [];
  var group = new Group();
  group.name = 'figures';

  var acc = { pos: [], col: [], tris: 0 };
  var eyePos = [];
  var placed = CAST.map(function (f) { return buildFigure(f, acc, eyePos); });

  var geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(acc.pos, 3));
  geo.setAttribute('color', new Float32BufferAttribute(acc.col, 4));
  /* Vertex alpha (a four-component colour) for the dissolving feet; depthWrite
     stays on so a figure occludes the mist and the rocks behind it. */
  var mat = new MeshBasicMaterial({
    vertexColors: true, fog: false, toneMapped: false, side: FrontSide,
    transparent: true, depthWrite: true
  });
  var bodies = new Mesh(geo, mat);
  bodies.name = 'figure-bodies';
  bodies.frustumCulled = false;
  group.add(bodies);
  owned.push(geo, mat);

  var eyeGeo = new BufferGeometry();
  eyeGeo.setAttribute('position', new Float32BufferAttribute(eyePos, 3));
  /* World-unit size under attenuation: 0.06 units at 35 units' distance is a
     4-px dot on a 1400-px frame, and sub-pixel at chat size — which is what
     setDetail is for. */
  var eyeMat = new PointsMaterial({
    color: new Color(0x7af0ff), size: 0.09, sizeAttenuation: true, map: opts.radial || null,
    transparent: true, opacity: 0.95, depthWrite: false, blending: AdditiveBlending,
    fog: false, toneMapped: false
  });
  var eyes = new Points(eyeGeo, eyeMat);
  eyes.name = 'figure-eyes';
  eyes.frustumCulled = false;
  group.add(eyes);
  owned.push(eyeGeo, eyeMat);

  var BASE = { eyes: eyeMat.opacity };
  var weight = 1, detail = 1;

  function write() {
    /* A quiet mode dims the cast rather than losing it: the material colour is
       a multiplier over the baked vertex colours. Gone below a structures
       weight of 0.35 (portrait 0.3) — at that emphasis they are clutter. */
    group.visible = weight > 0.35;
    mat.color.setScalar(0.45 + 0.55 * weight);
    eyeMat.opacity = BASE.eyes * weight * (0.4 + 0.6 * detail);
  }
  function applyWeight(w) {
    weight = Math.max(0, Math.min(1, w == null ? 1 : w));
    write();
  }
  function setDetail(k) {
    detail = Math.max(0, Math.min(1, Number(k) || 0));
    write();
  }
  function dispose() {
    owned.forEach(function (o) { if (o && o.dispose) o.dispose(); });
    if (group.parent) group.parent.remove(group);
  }

  return {
    group: group, bodies: bodies, eyes: eyes, cast: placed,
    stats: { tris: acc.tris, count: CAST.length, draws: 2 },
    applyWeight: applyWeight, setDetail: setDetail, dispose: dispose
  };
}

export var __internals = { CAST: CAST, BODIES: BODIES, HEADS: HEADS, TONE: TONE };
