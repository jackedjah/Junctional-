/* MR.MAH 3D :: ENVIRONMENT
   Mr.Mah's world.

   The brief for this pass was that the scene read as a place he inhabits
   rather than a backdrop he is pasted onto. That is built here out of DEPTH
   LAYERS, each doing one job, none of them competing with him:

     0  void            the near-black ground of everything
     1  floor grid      luminous, receding, the primary depth cue
     2  grid nodes      energy points at intersections, sparse
     3  contact glow    the pool of light he stands in — his light, not the
                        world's, and it moves and breathes with him
     4  horizon band    a thin luminous line where the floor dissolves; this is
                        what makes the world feel like it CONTINUES rather than
                        stopping at the edge of the grid
     4b corner clouds   restrained, dark, upper corners only (R94)
     4c horizon mist    luminous, gappy, at the mountain bases, with the wet
                        floor giving it back (R94)
     5  the range       three depth layers of faceted gunmetal massifs, near
                        black rock ridges, summit beacons — terrain.js (R94)
     6  motes           slow drifting light, the only other moving thing
     7  haze            linear fog binding it all together

   The discipline to protect: the world is QUIET. Mr.Mah is the only bright,
   detailed thing in frame. Every value below is deliberately low. If this file
   ever starts competing with him, it is wrong.

   Each layer takes a per-mode weight (see composition.js) so a chat stage can
   dim the structures without rebuilding the scene.

   One hard geometric constraint: the grid must lie ENTIRELY IN FRONT OF THE
   CAMERA. Line segments straddling the near plane were measured being dropped
   by the rasteriser, which removed every converging line and left the floor as
   flat horizontal bands. The grid is sized and pushed forward accordingly, and
   it is now large enough to survive the wide-FOV in-app modes too. */

import {
  Mesh, PlaneGeometry, ShadowMaterial, Color, Group,
  BufferGeometry, Float32BufferAttribute, LineSegments, LineBasicMaterial,
  Points, PointsMaterial, MeshBasicMaterial, AdditiveBlending,
  CanvasTexture, DoubleSide
} from '../vendor/three/three.module.min.js';
import { createTerrain } from './terrain.js';

export var GRID = {
  size: 110,           /* large: the wide in-app FOVs see much further */
  divisions: 60,       /* ~1.83 unit cells */
  /* Near edge at z=+1. The closest any mode's camera gets is about z=7.4
     (portrait), and a near edge at +7 left only 0.4 units of clearance — one
     preset tweak away from pushing grid lines behind the near plane again,
     which silently deletes every converging line. */
  centerZ: -54,        /* spans z = +1 .. -109 */
  y: 0.02,
  /* R92: 0.30 -> 0.17. The brief asks for a grid that does not compete with
     him, and with the body now sapphire rather than black the floor was the
     brightest large area in the frame. */
  opacity: 0.21
};

/* The world's own horizon. Beyond this the grid has fully faded. */
/* The horizon glow must sit where the world VISUALLY ends, which is where the
   fog finishes — not at the grid's geometric edge. Parked far behind the fade
   it floated in empty space and contributed nothing; `setHorizon` moves it to
   track each mode's fog.

   Its HEIGHT matters as much as its position. At 30 units tall it subtended
   about 73% of the frame from the far distance it sits at, and — being
   additive — laid a faint wash over nine tenths of every pixel in the scene.
   Measured, that turned 400 of 456 rows into fully-lit rows: not a horizon at
   all, a veil over the whole world. A horizon glow has to hug the line where
   the floor ends. */
export var HORIZON = { z: -70, height: 5 };

function radialTexture(size, hardness) {
  var c = document.createElement('canvas');
  c.width = c.height = size;
  var g = c.getContext('2d');
  var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(hardness || 0.25, 'rgba(190,240,255,0.55)');
  grad.addColorStop(1, 'rgba(120,220,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  var t = new CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/* One cloud formation for a corner of the sky. Overlapping radial blobs at
   fixed offsets, densest toward the OUTER (left) edge and thinning toward the
   centre of the frame, faded to nothing at every edge so the quad never shows
   its seam. Alpha carries the shape; the material supplies the colour. The
   right-hand cloud is this texture mirrored. Deterministic: the world must
   look identical on every mount, or a screenshot comparison is worthless. */
function cloudCornerTexture() {
  var c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  var g = c.getContext('2d');
  g.clearRect(0, 0, 256, 128);
  var seed = 20240904;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  /* An IRREGULAR outline, deliberately. Blobs scattered evenly under straight
     edge fades made a soft rounded rectangle, and in the chat frame — where
     the camera's aim put both formations near the upper centre — two rounded
     rectangles is exactly what they read as. The blobs now follow a wandering
     chain from the outer edge inward, thinning as they go, and the whole thing
     is cut by a soft ellipse, so the outline is a lumpy tapering mass with no
     straight edge anywhere. */
  var cx = 46, cy = 66;
  for (var i = 0; i < 18; i++) {
    var r = 30 - i * 0.9 + rnd() * 14;
    var a = (0.34 - i * 0.012) + rnd() * 0.22;
    var grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grd.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
    grd.addColorStop(0.5, 'rgba(255,255,255,' + (a * 0.42).toFixed(3) + ')');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    cx += 8 + rnd() * 9;
    cy += (rnd() - 0.5) * 26;
    cy = Math.max(30, Math.min(96, cy));
  }
  /* A few lighter tufts along the upper edge, where a cloud catches what
     light there is. */
  for (var j = 0; j < 5; j++) {
    var tx = 30 + rnd() * 140, ty = 28 + rnd() * 26, tr = 9 + rnd() * 12;
    var tg = g.createRadialGradient(tx, ty, 0, tx, ty, tr);
    tg.addColorStop(0, 'rgba(255,255,255,0.28)');
    tg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = tg;
    g.fillRect(tx - tr, ty - tr, tr * 2, tr * 2);
  }
  g.globalCompositeOperation = 'destination-out';
  /* Soft elliptical cut, centred toward the outer edge. */
  g.save();
  g.translate(104, 64);
  g.scale(1.0, 0.5);
  var ell = g.createRadialGradient(0, 0, 0, 0, 0, 132);
  ell.addColorStop(0, 'rgba(0,0,0,0)');
  ell.addColorStop(0.55, 'rgba(0,0,0,0)');
  ell.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = ell;
  g.fillRect(-140, -140, 280, 280);
  g.restore();
  var hfade = g.createLinearGradient(0, 0, 256, 0);
  hfade.addColorStop(0, 'rgba(0,0,0,1)');
  hfade.addColorStop(0.10, 'rgba(0,0,0,0)');
  hfade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = hfade;
  g.fillRect(0, 0, 256, 128);
  g.globalCompositeOperation = 'source-over';
  var t = new CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/* The horizon mist: a strip whose alpha lives in its LOWER half — dense tufts
   with gaps between them, over a thin base band — and fades to nothing well
   before the top. Built so a quad standing on the floor puts all of its light
   just above the horizon line and none of it across the sky. */
function mistTexture() {
  var c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  var g = c.getContext('2d');
  g.clearRect(0, 0, 512, 96);
  var seed = 90411;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  /* Base band: brightest at the floor, gone by 40% of the height. */
  var base = g.createLinearGradient(0, 96, 0, 58);
  base.addColorStop(0, 'rgba(255,255,255,0.42)');
  base.addColorStop(0.5, 'rgba(255,255,255,0.16)');
  base.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 96);
  /* Tufts, clustered, with real gaps. */
  var clusters = [50, 160, 250, 340, 450];
  clusters.forEach(function (cx) {
    var n = 3 + Math.floor(rnd() * 3);
    for (var i = 0; i < n; i++) {
      var x = cx + (rnd() - 0.5) * 70;
      var y = 62 + rnd() * 30;
      var r = 18 + rnd() * 26;
      var a = 0.18 + rnd() * 0.30;
      var grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
      grd.addColorStop(0.5, 'rgba(255,255,255,' + (a * 0.35).toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
  g.globalCompositeOperation = 'destination-out';
  var top = g.createLinearGradient(0, 0, 0, 96);
  top.addColorStop(0, 'rgba(0,0,0,1)');
  top.addColorStop(0.42, 'rgba(0,0,0,1)');
  top.addColorStop(0.62, 'rgba(0,0,0,0)');
  top.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, 512, 96);
  var hfade = g.createLinearGradient(0, 0, 512, 0);
  hfade.addColorStop(0, 'rgba(0,0,0,1)');
  hfade.addColorStop(0.10, 'rgba(0,0,0,0)');
  hfade.addColorStop(0.90, 'rgba(0,0,0,0)');
  hfade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = hfade;
  g.fillRect(0, 0, 512, 96);
  g.globalCompositeOperation = 'source-over';
  var t = new CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/* A one-dimensional ramp: opaque at v=0, gone at v=1. Used for the light
   pillars (bright at the floor, dissolving upward) and for the wet-floor
   streaks (bright at the source, dissolving away from it). One tiny texture
   serves both because both are the same falloff seen along different axes. */
function rampTexture() {
  var c = document.createElement('canvas');
  c.width = 4; c.height = 128;
  var g = c.getContext('2d');
  var grad = g.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0.00, 'rgba(255,255,255,1)');
  grad.addColorStop(0.10, 'rgba(255,255,255,0.62)');
  grad.addColorStop(0.34, 'rgba(255,255,255,0.24)');
  grad.addColorStop(0.68, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1.00, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  var t = new CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/* A horizontal band, bright at its base and fading upward — the glow sitting
   on the world's far edge. Drawn as a texture rather than geometry so it costs
   one transparent quad. */
function horizonTexture() {
  var c = document.createElement('canvas');
  c.width = 8; c.height = 128;
  var g = c.getContext('2d');
  var grad = g.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0.00, 'rgba(120,225,255,0.55)');
  grad.addColorStop(0.06, 'rgba(80,200,240,0.30)');
  grad.addColorStop(0.22, 'rgba(45,140,185,0.12)');
  grad.addColorStop(0.55, 'rgba(20,70,100,0.04)');
  grad.addColorStop(1.00, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, 128);
  var t = new CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

export function createEnvironment(options) {
  var opts = options || {};
  var settings = opts.settings || { shadows: true };
  var parent = opts.parent;
  var tier = opts.tier || 'medium';
  var owned = [];
  var group = new Group();
  group.name = 'mrmah-environment';

  var cyan = new Color(0x35d6ff);

  /* ---- 0. ground: catches his shadow, never lit itself ----------------- */
  /* Small, and only under him. It exists solely to catch his contact shadow.
     At floor-size it stretched far outside the key light's shadow camera
     (which covers only about +/-3 units around the character), and everything
     beyond that frustum sampled as fully shadowed — painting a hard dark band
     straight across the middle of the world. A catcher only needs to be as big
     as the shadow it catches.

     R94 — A POOL, NOT A PROJECTION. At 9 x 9 the catcher took the key light's
     whole cast of him: a long dark blob running across the floor to his right,
     which neither luminous reference has. Their floor returns a REFLECTION, and
     the only darkening is a small contact pool under the tip. So the catcher is
     now a 2.8-unit plane, offset a little toward where the key throws the tip's
     shadow, with a radial fade shaded into the ShadowMaterial itself so the
     pool has no edge: whatever falls inside it is a soft pool, whatever would
     have fallen outside it does not exist. */
  var groundMat = new ShadowMaterial({ opacity: settings.shadows ? 0.5 : 0 });
  groundMat.onBeforeCompile = function (shader) {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPool;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPool = position.xy;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPool;')
      .replace(
        /gl_FragColor\s*=\s*vec4\(\s*color,\s*opacity\s*\*\s*\(\s*1\.0\s*-\s*getShadowMask\(\)\s*\)\s*\);/,
        'float poolFade = 1.0 - smoothstep(0.40, 1.0, length(vPool));\n' +
        '\tgl_FragColor = vec4( color, opacity * poolFade * ( 1.0 - getShadowMask() ) );');
  };
  /* 2.0 units: at his depth in the showcase frame that is about half the frame
     width for the plane and a third for the visible pool. 2.8 measured as three
     quarters of the width — a plate, not a pool. */
  var ground = new Mesh(new PlaneGeometry(2.0, 2.0), groundMat);
  ground.rotation.x = -Math.PI / 2;
  /* The key stands at (-4.2, 7.4, 6.2), so the tip's shadow lands a little to
     +x and -z of it; the pool is centred on where the shadow actually falls. */
  ground.position.set(0.22, 0, -0.30);
  ground.receiveShadow = !!settings.shadows;
  ground.material.depthWrite = false;   /* it must never occlude the grid */
  ground.name = 'ground';
  group.add(ground);
  owned.push(ground.geometry, ground.material);

  /* ---- 1. floor grid --------------------------------------------------- */
  /* R94 — THE LINES PICK UP HIS LIGHT. In both luminous references the grid is
     dim everywhere except around the hover point, where the lines brighten as
     if reflecting the flare above them. That is done here with vertex colours
     rather than a second material: every line is cut into cells, and each
     vertex carries a gain that falls off with distance from the origin (he
     hovers at the origin; drag rotates him, it does not move him). The
     material opacity stays at GRID.opacity — the brightening is local, and the
     far grid is exactly as dim as before. One draw call, as before; the grid's
     Z extent, near edge and cell size are unchanged. */
  var half = GRID.size / 2, step = GRID.size / GRID.divisions;
  var pts = [], gcol = [];
  var HOVER_GAIN = 1.9, HOVER_RADIUS = 3.6;
  function gridGain(x, z) {
    var d2 = (x * x + z * z) / (HOVER_RADIUS * HOVER_RADIUS);
    return 1 + HOVER_GAIN * Math.exp(-d2);
  }
  function seg(x0, z0, x1, z1) {
    var g0 = gridGain(x0, z0 + GRID.centerZ), g1 = gridGain(x1, z1 + GRID.centerZ);
    pts.push(x0, 0, z0, x1, 0, z1);
    gcol.push(g0, g0, g0, g1, g1, g1);
  }
  for (var i = 0; i <= GRID.divisions; i++) {
    var o = -half + i * step;
    for (var c = 0; c < GRID.divisions; c++) {
      var p0 = -half + c * step, p1 = p0 + step;
      seg(p0, o, p1, o);                    /* lateral, cell by cell */
      seg(o, p0, o, p1);                    /* receding, cell by cell */
    }
  }
  var gridGeo = new BufferGeometry();
  gridGeo.setAttribute('position', new Float32BufferAttribute(pts, 3));
  gridGeo.setAttribute('color', new Float32BufferAttribute(gcol, 3));
  var gridMat = new LineBasicMaterial({
    color: new Color(0x2f8fae), transparent: true, opacity: GRID.opacity,
    depthWrite: false, fog: true, blending: AdditiveBlending, vertexColors: true
  });
  var grid = new LineSegments(gridGeo, gridMat);
  grid.position.set(0, GRID.y, GRID.centerZ);
  grid.name = 'grid';
  group.add(grid);
  owned.push(gridGeo, gridMat);

  /* ---- 2. grid nodes --------------------------------------------------- */
  /* Only near intersections, and only every third, so the floor reads as
     sparse energy points rather than a dotted texture. */
  var nodePts = [];
  for (var a = 0; a <= GRID.divisions; a += 3) {
    for (var b = 0; b <= GRID.divisions; b += 3) {
      var x = -half + a * step, z = -half + b * step;
      if (Math.abs(x) > half * 0.62 || z > half * 0.42 || z < -half * 0.75) continue;
      nodePts.push(x, 0, z);
    }
  }
  var nodeGeo = new BufferGeometry();
  nodeGeo.setAttribute('position', new Float32BufferAttribute(nodePts, 3));
  var nodeTex = radialTexture(tier === 'low' ? 32 : 64, 0.18);
  var nodeMat = new PointsMaterial({
    color: cyan, size: 0.7, map: nodeTex, transparent: true,
    opacity: 0.7, depthWrite: false, blending: AdditiveBlending,
    sizeAttenuation: true, fog: true, toneMapped: false
  });
  var nodes = new Points(nodeGeo, nodeMat);
  nodes.position.set(0, GRID.y + 0.01, GRID.centerZ);
  nodes.name = 'grid-nodes';
  group.add(nodes);
  owned.push(nodeGeo, nodeMat, nodeTex);

  /* ---- 3. contact glow — HIS light ------------------------------------- */
  /* The pool of light he hovers over, plus the crossed starburst the reference
     shows at the contact point. This group follows him, so when he is dragged
     the world's light follows rather than staying behind — which is most of
     what sells him as being IN the scene rather than composited over it. */
  var glowGroup = new Group();
  glowGroup.name = 'floor-glow';
  var glowTex = radialTexture(128, 0.10);
  var discMat = new MeshBasicMaterial({
    map: glowTex, color: cyan, transparent: true, opacity: 0.46,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false
  });
  /* R94: 4.2 -> 1.9. The references' hover point is a COMPACT cross flare with
     a short reflected column, not a wide disc of light on the floor. */
  var disc = new Mesh(new PlaneGeometry(1.9, 1.9), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.012;
  glowGroup.add(disc);
  owned.push(disc.geometry, discMat, glowTex);

  /* ---- R91: THE PRESENCE FIELD ------------------------------------------

     The brief's problem is that he is a dark object on a dark ground and the
     two share too much value, so he reads as a silhouette rather than as
     something occupying space. The obvious answer — an outline glow — is the
     wrong one: it draws a line around him, which flattens a solid into a
     sticker, and it is what the edge tiers already spent several passes
     learning not to do.

     A presence field works the other way round. It is a soft body of light
     standing BEHIND him in the air, brightest around his own emissions, with
     no edge of its own anywhere. He separates because the ground immediately
     behind him is lifted, not because he is traced. Read in a still frame it is
     barely there; read in motion it is what makes the space around him feel
     charged rather than empty.

     Three vertical cards rather than one, at three depths and three sizes:

       torso   large, dimmest, well behind him — the general lift
       chest   mid, centred on the emblem — the emblem's light in the air
       head    small, tightest, brightest — around the eyes and smile

     They live in glowGroup, so they track him when he is dragged. They face the
     camera's general direction rather than billboarding per frame: every mode's
     azimuth is within 28 degrees of front, and a soft radial gradient at these
     opacities is indistinguishable across that range for the cost of nothing.

     Their lower edges stop well above the floor. A field that reached the
     ground would sit over the rows where the grid's convergence is read, which
     is the constraint that governs every transparent layer in this scene. */
  /* R94 — REDUCED TO A WASH. Measured at the harness's frame the largest card
     was 80% of the frame's width at his depth and lit 57% of every row he
     stands in; three stacked radial cards read as a blue blob standing behind
     him, i.e. exactly the shape a presence field must not have. One tall,
     narrow, very faint card remains: a lift of the ground behind him that has
     no edge to find. The outline halo the references show is being built on
     the character itself, not here. */
  var auraTex = radialTexture(128, 0.52);
  var auraCards = [];
  [
    { w: 2.1, h: 4.8, y: 1.85, z: -0.5, o: 0.055 }
  ].forEach(function (a, i) {
    var m = new MeshBasicMaterial({
      map: auraTex, color: cyan, transparent: true, opacity: a.o,
      blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false
    });
    var q = new Mesh(new PlaneGeometry(a.w, a.h), m);
    q.position.set(0, a.y, a.z);
    q.renderOrder = -1;
    glowGroup.add(q);
    auraCards.push({ mesh: q, base: a.o, phase: i * 1.9 });
    owned.push(q.geometry, m);
  });
  owned.push(auraTex);

  /* R94: this was `starMat`, the same name the sky stars' PointsMaterial takes
     further down in the same function scope — so the flare was never the one
     being animated and the sky stars breathed with his hover instead. */
  var flareMat = new MeshBasicMaterial({
    map: glowTex, color: new Color(0xcdf5ff), transparent: true, opacity: 0.55,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false
  });
  var starQuads = [];
  /* R94: a compact cross — a short horizontal flare and a shorter arm running
     toward the camera, which with the column below reads as the reflection. */
  [[2.6, 0.09], [0.09, 1.7]].forEach(function (s) {
    var q = new Mesh(new PlaneGeometry(s[0], s[1]), flareMat);
    q.rotation.x = -Math.PI / 2;
    q.position.y = 0.014;
    glowGroup.add(q);
    starQuads.push(q);
    owned.push(q.geometry);
  });
  owned.push(flareMat);

  /* ---- 3b. the levitation emitter ------------------------------------- */
  /* A narrow, sharp line of energy between his lower point and the floor.

     The brief wants it understood as a stabiliser, not a rocket: tiny, sharp,
     centred, and quiet enough that it never competes with him. So it is two
     crossed quads rather than a cone — a cone reads as a beam or a flame, and
     at this width a cone's silhouette is mush. Crossing two thin quads keeps
     the line one pixel-ish wide from any angle the interaction can reach, which
     is what makes it read as a line of energy instead of a shape.

     It lives inside glowGroup, so it tracks him when he is dragged, and its
     height is driven from his actual hover offset each frame — the beam is the
     visible connection between the tip and the floor, so it has to lengthen as
     he rises or the illusion breaks immediately. */
  var laserGroup = new Group();
  laserGroup.name = 'hover-laser';
  var laserMat = new MeshBasicMaterial({
    map: glowTex, color: new Color(0xa9ecff), transparent: true, opacity: 0.58,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false,
    side: DoubleSide, fog: false
  });
  var laserQuads = [];
  [0, Math.PI / 2].forEach(function (rot) {
    var q = new Mesh(new PlaneGeometry(0.028, 1), laserMat);
    q.rotation.y = rot;
    laserGroup.add(q);
    laserQuads.push(q);
    owned.push(q.geometry);
  });
  /* A very small hot core right where it meets the floor, so the beam has a
     root rather than fading out into the grid. */
  var laserCoreMat = new MeshBasicMaterial({
    map: glowTex, color: new Color(0xffffff), transparent: true, opacity: 0.5,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false
  });
  var laserCore = new Mesh(new PlaneGeometry(0.26, 0.26), laserCoreMat);
  laserCore.rotation.x = -Math.PI / 2;
  laserCore.position.y = 0.02;
  laserGroup.add(laserCore);
  owned.push(laserCore.geometry, laserCoreMat, laserMat);
  glowGroup.add(laserGroup);

  /* THE WET-FLOOR STREAK.

     Reference A's floor is not a mirror — it is a wet, semi-reflective surface,
     and what it actually returns is a vertical SMEAR of light beneath each
     bright thing rather than a sharp inverted copy. That distinction matters
     enormously here: a true planar reflection needs a second render pass of the
     whole scene, which on a mobile budget is the single most expensive thing we
     could add, and it would buy an effect the reference does not even show.

     A stretched additive quad lying on the floor, brightest at his contact
     point and dissolving away toward the camera, reproduces the look for one
     draw call. It sits in glowGroup, so it tracks him when he is dragged. */
  var streakTex = rampTexture();
  var streakMat = new MeshBasicMaterial({
    map: streakTex, color: new Color(0x7fe2ff), transparent: true, opacity: 0.62,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: true
  });
  /* R90: longer and wider, but only to here.

     Reference A's most identifiable floor feature is the bright column running
     from the character toward the camera — it is what makes the floor read as
     wet rather than as a grid on black, and at 0.85 x 7.0 this was a thin line
     rather than a reflection. It went to 1.5 x 11.0 first, and DEPTH-01 caught
     it immediately: the rows carrying converging content fell from 216 to 197.

     A bright plane lying ON the floor is a veil in exactly the sense that check
     exists to catch — it is only surprising because every previous instance was
     vertical. 1.05 x 8.4 is the largest size that leaves the grid's perspective
     intact (201 rows), and the rest of the brightness is bought with opacity,
     which costs no area. */
  /* R94: narrower and brighter — a reflected COLUMN, the mirror of the beam
     above the tip, not a wash. 0.55 wide costs the convergence rows nothing. */
  var streak = new Mesh(new PlaneGeometry(0.55, 7.0), streakMat);
  streak.rotation.x = -Math.PI / 2;
  /* The ramp's opaque end is at v=0, which after the -90 degrees about X lands
     at the far edge; pushing the quad forward by half its length puts that end
     under him and lets the tail run toward the viewer. */
  streak.position.set(0, 0.016, 3.5);
  glowGroup.add(streak);
  owned.push(streak.geometry, streakMat, streakTex);

  /* A broad, very faint sheen on the floor around the contact point — the
     "restrained reflective floor response". It is not a reflection: it is the
     wet-look bloom a polished surface gives back around a bright object, which
     is what Reference A's floor actually shows near his feet. Wider and far
     weaker than the streak, so it reads as the floor having a finish rather
     than as a second light source. */
  var sheenMat = new MeshBasicMaterial({
    map: glowTex, color: new Color(0x2f6f92), transparent: true, opacity: 0.08,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: true
  });
  var sheen = new Mesh(new PlaneGeometry(3.0, 3.0), sheenMat);
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.y = 0.008;
  glowGroup.add(sheen);
  owned.push(sheen.geometry, sheenMat);

  /* Default length until the character reports its real hover height. */
  var laserHeight = 0.16;
  function setLaser(height) {
    laserHeight = Math.max(0.02, Number(height) || 0.02);
    laserQuads.forEach(function (q) {
      q.scale.y = laserHeight;
      q.position.y = laserHeight / 2;
    });
  }
  setLaser(laserHeight);

  group.add(glowGroup);

  /* ---- 4. horizon band ------------------------------------------------- */
  /* Where the floor dissolves. Without it the grid simply stops and the world
     reads as a rug on a black page; with it the space continues past the last
     visible line. Faces the camera, sits at the far edge, unlit and additive. */
  var horizonTex = horizonTexture();
  var horizonMat = new MeshBasicMaterial({
    map: horizonTex, color: cyan, transparent: true, opacity: 0.88,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false,
    side: DoubleSide,
    /* fog MUST be on. Unfogged, this quad sat behind the distance at which the
       grid has already faded to nothing, and punched through as a lit wall
       with a dead black gap in front of it — a hard band straight across the
       world. Fogged, and placed inside the fade rather than beyond it, it
       instead emerges out of the haze, which is what a horizon does. */
    fog: true
  });
  var horizon = new Mesh(new PlaneGeometry(GRID.size * 1.6, HORIZON.height), horizonMat);
  horizon.position.set(0, HORIZON.height / 2 - 0.8, HORIZON.z);
  horizon.name = 'horizon';
  group.add(horizon);
  owned.push(horizon.geometry, horizonMat, horizonTex);

  /* ---- 4b. atmosphere: restrained corner clouds ------------------------- */
  /* R94 — INTO THE FRAME, INTO THE CORNERS, AND OUT OF THE FOG.

     The three drifting bands this replaces were correctly built and were
     never seen, for two compounding reasons that are worth stating plainly:
     they hung at y 11-18.5 and z -22..-38, which is above the showcase frame
     top for the two far bands, and at 70-90% fog for all three. Worse, the
     nearest one WAS in frame at the top — faint, dark, and full-width — and
     measured as a veil: the top 15% of the harness frame was lit right across
     (rows 0.00-0.15: 68 full rows out of 456) by a cloud nobody could see,
     because getImageData counts a 2% alpha pixel as lit. Hiding it turned
     those rows back to sky.

     Both luminous references keep their cloud to the UPPER CORNERS, dark
     blue-grey, low contrast, with a clear sky between. So: two formations,
     one per corner, each spanning about a third of the frame width so no row
     can be lit right across by cloud; fog off with the distance tint authored
     into the colour; and their lower edges above the character's apex
     (frame 0.14) so the rows he stands in are never widened by cloud. Placed
     against the measured frame: at z=-42 the frame's half-width is ~11.5 and
     one unit of height is 0.035 of the frame. */
  var cloudTex = cloudCornerTexture();
  /* Restraint, measured: both references' upper corners are 100% under 32
     luma (means 8 and 12). The cloud is a smudge a little lighter than the
     sky, not a shape — colour and opacity here put its densest core near 28. */
  var cloudMat = new MeshBasicMaterial({
    map: cloudTex, color: new Color(0x4a5d78), transparent: true, opacity: 0.50,
    depthWrite: false, toneMapped: false, side: DoubleSide, fog: false
  });
  var clouds = new Group();
  clouds.name = 'atmosphere';
  var cloudBands = [];
  /* The texture's alpha lives in the middle half of the quad's height, so a
     quad centred at y 16.4 with h 6.4 puts its visible mass at y 14.8-18.0 —
     frame rows 0.12 down to 0.01 at z=-42 — above his apex at 0.15. */
  [
    { x: -11.6, y: 16.4, z: -42, w: 14.5, h: 6.4, speed: 0.035, o: 1.00, flip: false },
    { x: 11.9, y: 17.0, z: -43, w: 15.0, h: 6.0, speed: -0.028, o: 0.86, flip: true }
  ].forEach(function (b, i) {
    var m = cloudMat.clone();
    m.opacity = cloudMat.opacity * b.o;
    var q = new Mesh(new PlaneGeometry(b.w, b.h), m);
    q.position.set(b.x, b.y, b.z);
    if (b.flip) q.scale.x = -1;
    q.renderOrder = -5 + i;
    clouds.add(q);
    cloudBands.push({ mesh: q, speed: b.speed, span: 0.9, base: 0, x: b.x,
      baseOpacity: m.opacity });
    owned.push(q.geometry, m);
  });
  group.add(clouds);
  owned.push(cloudTex, cloudMat);

  /* ---- 4c. horizon mist bank -------------------------------------------- */
  /* The luminous mist lying along the mountain bases in both references. An
     earlier pass hung a single full-width band here and it failed twice over
     — as a solid wall past fog.far, then as a veil over the convergence rows
     inside the fade. The two things that make this version work are the ones
     that version lacked:

       - it is fog:false, at z=-33, in FRONT of the mid mountains and behind
         the near rock ridges, with its brightness authored rather than
         computed, so it is exactly as luminous as intended at any fog setting;
       - it is a row of separate, gappy formations from a texture whose alpha
         is concentrated in its LOWER half, its lower edge at world y 0.1, so
         on screen it sits above the horizon line (frame ~0.65) and reaches up
         to about 0.56 at its highest tufts. Those rows are already the
         horizon: the far grid, the ridges and the horizon glow fill them.

     The near rock ridges occlude its foot in places, which is what puts the
     mist BEHIND the rocks rather than painted over them. */
  var mistTex = mistTexture();
  /* Luminous, measured: reference B's rows 0.62-0.68 average 71 luma and A's
     41; at 0.30 this band measured 20. */
  var mistMat = new MeshBasicMaterial({
    map: mistTex, color: new Color(0xc2dcf2), transparent: true, opacity: 0.95,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false,
    side: DoubleSide, fog: false
  });
  var mist = new Group();
  mist.name = 'horizon-mist';
  var mistQuads = [];
  /* Two rows. The rear row stands at the mountain bases, tall enough that its
     tufts show OVER the rock ridges; the front row lies at the ridges' feet,
     lower and thinner, so the rocks sit IN the mist rather than in front of a
     backdrop of it — which is how both references place them. Round 2 had the
     rear row alone and the ridges hid almost all of it. */
  [
    { x: -21, z: -33, w: 16, h: 3.4, y: 0.1, o: 0.85, flip: true },
    { x: -6.5, z: -33.5, w: 15, h: 3.4, y: 0.1, o: 1.0, flip: false },
    { x: 7.5, z: -33, w: 15, h: 3.3, y: 0.1, o: 0.95, flip: true },
    { x: 22, z: -33.5, w: 16, h: 3.5, y: 0.1, o: 0.8, flip: false },
    { x: -13, z: -19.5, w: 12, h: 1.5, y: 0.04, o: 0.55, flip: false },
    { x: -1, z: -20, w: 11, h: 1.4, y: 0.04, o: 0.60, flip: true },
    { x: 11, z: -19.5, w: 12, h: 1.5, y: 0.04, o: 0.55, flip: false }
  ].forEach(function (b) {
    var m = mistMat.clone();
    m.opacity = mistMat.opacity * b.o;
    var q = new Mesh(new PlaneGeometry(b.w, b.h), m);
    q.position.set(b.x, b.y + b.h / 2, b.z);
    if (b.flip) q.scale.x = -1;
    mist.add(q);
    mistQuads.push({ mesh: q, baseOpacity: m.opacity, x: b.x });
    owned.push(q.geometry, m);
  });
  /* The wet floor gives the mist back. Reference B's floor is brightest right
     at the horizon, under the mist, and fades toward the camera; this is one
     ramp quad lying on the floor from the mist's foot forward, bright at the
     far end. It lies entirely on rows the far grid already fills (frame
     0.62-0.66), so it costs the convergence rows nothing — measured, not
     assumed: DEPTH-01 counts rows, and these were full before it existed. */
  var floorSheenMat = new MeshBasicMaterial({
    map: mistTex, color: new Color(0x6f98ba), transparent: true, opacity: 0.30,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false
  });
  var floorSheen = new Mesh(new PlaneGeometry(60, 9), floorSheenMat);
  floorSheen.rotation.x = -Math.PI / 2;
  floorSheen.rotation.z = Math.PI;      /* the texture's dense edge at the far end */
  floorSheen.position.set(0, 0.006, -23.5);
  floorSheen.name = 'floor-sheen';
  mist.add(floorSheen);
  owned.push(floorSheen.geometry, floorSheenMat);
  group.add(mist);
  owned.push(mistTex, mistMat);

  /* ---- 5. the mountain range -------------------------------------------- */
  /* R94: see terrain.js. Three depth layers of faceted gunmetal massifs with
     their shade baked into vertex colours, summit beacons, sparkle specks and
     the near black rock ridges — three draws for the range, one for the
     sparkles, one for the beams, one for their summit caps, one (above low)
     for the beams' floor streaks. It replaces twelve fogged cones with twelve
     edge outlines that cost twenty-four draws and rendered as two black
     triangles, and five light pillars that were never in frame. */
  var terrain = createTerrain({
    tier: tier, settings: settings, ramp: rampTexture(), radial: radialTexture(32, 0.15)
  });
  var structures = terrain.group;
  var beacons = terrain.beacons;
  group.add(structures);
  group.add(beacons);
  owned.push(terrain);

  /* ---- 5c. stars -------------------------------------------------------- */
  /* Sparse, dim, and high. They cost one draw call and they are what tells the
     eye the dark above the horizon is SKY rather than an empty backdrop — the
     cheapest depth cue in the whole scene. */
  var starCount = tier === 'low' ? 40 : 90;
  var starPos = [];
  var sseed = 7771;
  function srnd() { sseed = (sseed * 1103515245 + 12345) & 0x7fffffff; return sseed / 0x7fffffff; }
  for (var si = 0; si < starCount; si++) {
    starPos.push((srnd() - 0.5) * 150, 9 + srnd() * 34, -40 - srnd() * 45);
  }
  var starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new Float32BufferAttribute(starPos, 3));
  var starMat = new PointsMaterial({
    color: new Color(0xbfe8ff), size: 0.16, sizeAttenuation: true,
    transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false,
    blending: AdditiveBlending, fog: false
  });
  var stars = new Points(starGeo, starMat);
  stars.name = 'stars';
  group.add(stars);
  owned.push(starGeo, starMat);

  /* ---- 6. motes -------------------------------------------------------- */
  var moteCount = tier === 'low' ? 60 : tier === 'medium' ? 120 : 190;
  var motePts = [], moteSeed = [];
  for (var m2 = 0; m2 < moteCount; m2++) {
    motePts.push((Math.random() - 0.5) * 46, Math.random() * 13, -Math.random() * 60 + 6);
    moteSeed.push(Math.random() * Math.PI * 2);
  }
  var moteGeo = new BufferGeometry();
  moteGeo.setAttribute('position', new Float32BufferAttribute(motePts, 3));
  var moteTex = radialTexture(32, 0.2);
  var moteMat = new PointsMaterial({
    color: cyan, size: 0.13, map: moteTex, transparent: true, opacity: 0.45,
    depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true,
    fog: true, toneMapped: false
  });
  var motes = new Points(moteGeo, moteMat);
  motes.name = 'motes';
  group.add(motes);
  owned.push(moteGeo, moteMat, moteTex);

  if (parent) parent.add(group);

  /* Baselines, so a mode weight of 1.0 restores exactly what was authored.
     R94: captured ONCE, from the materials, and never reassigned. The previous
     applyMode wrote `BASE.disc = 0.5 * glow` — a literal copy of the disc's
     opacity, which then silently diverged from it — and the flare, the sky
     stars and the beams each had a second writer. Now every animated or
     weighted value is authored value x mode weight x breath, with the weights
     held separately in W. */
  var BASE = {
    grid: gridMat.opacity, nodes: nodeMat.opacity, motes: moteMat.opacity,
    disc: discMat.opacity, flare: flareMat.opacity, star: starMat.opacity,
    horizon: horizonMat.opacity, streak: streakMat.opacity
  };
  var W = { grid: 1, nodes: 1, motes: 1, glow: 1, structures: 1, haze: 1, detail: 1 };

  var time = 0;
  var glowPulse = 1;

  function update(dt, o) {
    var conf = o || {};
    if (conf.reducedMotion) return;
    time += dt;

    var arr = moteGeo.attributes.position.array;
    for (var i = 0; i < moteCount; i++) {
      arr[i * 3 + 1] += dt * 0.09;
      arr[i * 3] += Math.sin(time * 0.3 + moteSeed[i]) * dt * 0.05;
      if (arr[i * 3 + 1] > 13.5) arr[i * 3 + 1] = 0;
    }
    moteGeo.attributes.position.needsUpdate = true;

    /* The floor light breathes with his hover, and brightens with his state —
       the world responding to him rather than sitting inert behind him. */
    var breathe = 0.9 + 0.1 * Math.sin(time * 1.4);
    var g = breathe * glowPulse * W.glow;
    discMat.opacity = BASE.disc * g;
    flareMat.opacity = BASE.flare * g;
    streakMat.opacity = BASE.streak * (0.85 + 0.15 * breathe) * W.glow;
    horizonMat.opacity = BASE.horizon * (0.94 + 0.06 * Math.sin(time * 0.5));

    /* The field breathes with him rather than sitting at a constant value — a
       static glow reads as a lens artifact, one that moves reads as something
       the character is doing. */
    auraCards.forEach(function (a) {
      a.mesh.material.opacity = a.base * glowPulse *
        (0.82 + 0.18 * Math.sin(time * 0.44 + a.phase));
    });

    /* The corner clouds drift a little and come back — never far enough to
       leave their corner and cross the centre of the frame. */
    cloudBands.forEach(function (b) {
      b.base += dt * b.speed;
      if (b.base > b.span) b.base -= b.span * 2;
      if (b.base < -b.span) b.base += b.span * 2;
      b.mesh.position.x = b.x + b.base;
    });
    /* The mist barely moves: a slow, low-amplitude sway is what mist does. */
    mistQuads.forEach(function (m, i) {
      m.mesh.position.x = m.x + Math.sin(time * 0.05 + i * 1.7) * 0.5;
    });

    terrain.update(dt);
  }

  /* Called by the scene each frame with the character's live world position,
     so the pool of light is always under him — including mid-drag. */
  function followCharacter(x, z, glow) {
    glowGroup.position.set(x || 0, 0, z || 0);
    if (glow != null) glowPulse = glow;
  }

  /* Per-mode emphasis. See composition.js MODES[*].world. */
  function setHorizon(z) {
    horizon.position.z = z;
  }

  function applyFine() {
    /* The fine particles are weighted by mode AND by on-screen size; one
       writer for each so the two cannot race. */
    var k = W.detail;
    moteMat.opacity = BASE.motes * W.motes * (0.35 + 0.65 * k);
    starMat.opacity = BASE.star * W.structures * (0.45 + 0.55 * k);
    nodeMat.opacity = BASE.nodes * W.nodes * (0.5 + 0.5 * k);
    terrain.setDetail(k);
  }

  function applyMode(w) {
    if (!w) return;
    /* Sit the glow just short of where the fog finishes, so the floor dissolves
       INTO it rather than stopping short of it. */
    if (w.fogFar) setHorizon(-(w.fogFar * 0.70));
    W.grid = w.grid == null ? 1 : w.grid;
    W.nodes = w.nodes == null ? 1 : w.nodes;
    W.motes = w.motes == null ? 1 : w.motes;
    W.glow = w.glow == null ? 1 : w.glow;
    W.structures = w.structures == null ? 1 : w.structures;
    /* Atmosphere follows the same per-mode weighting as everything else: a
       tight portrait wants less sky than a wide showcase does. */
    W.haze = w.haze == null ? 1 : w.haze;

    gridMat.opacity = BASE.grid * W.grid;
    /* The range, its beacons, its sparkles and the sky stars follow the
       structures weight — they are the same "distant world" tier, and a mode
       that wants a quiet background should lose all of it together rather than
       in pieces. terrain.applyWeight reads its own authored baselines. */
    terrain.applyWeight(W.structures);
    stars.visible = W.structures > 0.05;
    /* The presence field follows the glow weight, so a mode that wants a quiet
       character gets a quiet field with him. */
    auraCards.forEach(function (a) { a.mesh.visible = W.glow > 0.05; });
    discMat.opacity = BASE.disc * W.glow;
    flareMat.opacity = BASE.flare * W.glow;
    streakMat.opacity = BASE.streak * W.glow;

    clouds.visible = W.haze > 0.03;
    mist.visible = W.haze > 0.03;
    /* Each band's authored opacity is captured at build time and this scales
       it, so there is one writer and one place to edit — the duplicated
       literal that once lived here (`0.40 * [weights][i]`) silently discarded
       every edit to the cloud material before the first frame. */
    cloudBands.forEach(function (b) { b.mesh.material.opacity = b.baseOpacity * W.haze; });
    mistQuads.forEach(function (m) { m.mesh.material.opacity = m.baseOpacity * W.haze; });
    applyFine();
  }

  function dispose() {
    owned.forEach(function (o) { if (o && o.dispose) o.dispose(); });
    if (group.parent) group.parent.remove(group);
  }

  return {
    group: group, ground: ground, grid: grid, nodes: nodes,
    glow: glowGroup, structures: structures, motes: motes, horizon: horizon,
    update: update, followCharacter: followCharacter, applyMode: applyMode,
    setHorizon: setHorizon, setLaser: setLaser, clouds: clouds,
    /* `pillars` is kept as the name of the world's vertical light elements —
       the summit beacons — so the harness's isolation lists keep working. */
    pillars: beacons, beacons: beacons, stars: stars, mist: mist,
    terrain: terrain,
    /* Scale-aware world detail. At chat and protocol size the fine particles
       are sub-pixel noise competing with the character for the little contrast
       the frame has; the large layers — grid, horizon, mist, structures — are
       what still read, so only the small stuff is pulled back. */
    setDetail: function (t) {
      W.detail = Math.max(0, Math.min(1, Number(t) || 0));
      applyFine();
    },
    setOpacity: function (v) { gridMat.opacity = Math.max(0, Math.min(1, Number(v))); },
    dispose: dispose
  };
}
