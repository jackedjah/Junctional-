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
     5  structures      distant faceted forms, barely lit, for parallax
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
  ConeGeometry, MeshStandardMaterial, EdgesGeometry, CanvasTexture, DoubleSide
} from '../vendor/three/three.module.min.js';

export var GRID = {
  size: 110,           /* large: the wide in-app FOVs see much further */
  divisions: 60,       /* ~1.83 unit cells */
  /* Near edge at z=+1. The closest any mode's camera gets is about z=7.4
     (portrait), and a near edge at +7 left only 0.4 units of clearance — one
     preset tweak away from pushing grid lines behind the near plane again,
     which silently deletes every converging line. */
  centerZ: -54,        /* spans z = +1 .. -109 */
  y: 0.02,
  opacity: 0.30
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

/* Soft, irregular mist. Overlapping radial blobs at random-but-fixed offsets,
   blurred by their own falloff — enough structure to read as cloud rather than
   as a gradient, and cheap enough to generate at mount. Alpha carries the
   shape; the material supplies the colour. */
function cloudTexture() {
  var c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  var g = c.getContext('2d');
  g.clearRect(0, 0, 512, 128);
  /* Deterministic: the world must look identical on every mount, and a
     screenshot comparison is worthless if the sky is re-rolled each time. */
  var seed = 20240904;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

  /* DISCRETE MASSES WITH REAL GAPS BETWEEN THEM.

     The first version scattered blobs evenly across the full width, which gave
     a continuous sheet — and a continuous sheet spanning the frame is a filter
     over the lens, not weather in the world. It measured as one too: rows that
     should have carried only the grid's converging lines became lit right
     across, and the floor stopped reading as perspective.

     So the blobs are now clustered into a few formations with genuinely empty
     sky between them. The gaps are the point. They let the world show through,
     they give the drift something to reveal and hide, and they are what makes
     this read as cloud rather than as haze. */
  var clusters = [40, 150, 268, 400];
  clusters.forEach(function (cx) {
    var n = 4 + Math.floor(rnd() * 3);
    for (var i = 0; i < n; i++) {
      var x = cx + (rnd() - 0.5) * 96;
      var y = 40 + rnd() * 54;
      var r = 30 + rnd() * 52;
      var a = 0.16 + rnd() * 0.30;
      var grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
      grd.addColorStop(0.5, 'rgba(255,255,255,' + (a * 0.38).toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });

  /* Fade hard at every edge so a band never shows its own seam, horizontally
     as well as vertically — a band that runs to the frame edge reads as a
     backdrop, one that thins out reads as a formation passing through. */
  g.globalCompositeOperation = 'destination-out';
  var fade = g.createLinearGradient(0, 0, 0, 128);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.26, 'rgba(0,0,0,0)');
  fade.addColorStop(0.74, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fade;
  g.fillRect(0, 0, 512, 128);
  var hfade = g.createLinearGradient(0, 0, 512, 0);
  hfade.addColorStop(0, 'rgba(0,0,0,1)');
  hfade.addColorStop(0.12, 'rgba(0,0,0,0)');
  hfade.addColorStop(0.88, 'rgba(0,0,0,0)');
  hfade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = hfade;
  g.fillRect(0, 0, 512, 128);
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
     as the shadow it catches. */
  var ground = new Mesh(
    new PlaneGeometry(9, 9),
    new ShadowMaterial({ opacity: settings.shadows ? 0.5 : 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = !!settings.shadows;
  ground.material.depthWrite = false;   /* it must never occlude the grid */
  ground.name = 'ground';
  group.add(ground);
  owned.push(ground.geometry, ground.material);

  /* ---- 1. floor grid --------------------------------------------------- */
  var half = GRID.size / 2, step = GRID.size / GRID.divisions;
  var pts = [];
  for (var i = 0; i <= GRID.divisions; i++) {
    var o = -half + i * step;
    pts.push(-half, 0, o, half, 0, o);      /* lateral */
    pts.push(o, 0, -half, o, 0, half);      /* receding */
  }
  var gridGeo = new BufferGeometry();
  gridGeo.setAttribute('position', new Float32BufferAttribute(pts, 3));
  var gridMat = new LineBasicMaterial({
    color: cyan, transparent: true, opacity: GRID.opacity,
    depthWrite: false, fog: true, blending: AdditiveBlending
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
    map: glowTex, color: cyan, transparent: true, opacity: 0.5,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false
  });
  var disc = new Mesh(new PlaneGeometry(4.2, 4.2), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.012;
  glowGroup.add(disc);
  owned.push(disc.geometry, discMat, glowTex);

  var starMat = new MeshBasicMaterial({
    map: glowTex, color: new Color(0xcdf5ff), transparent: true, opacity: 0.5,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false
  });
  var starQuads = [];
  [[5.2, 0.13], [0.13, 3.0]].forEach(function (s) {
    var q = new Mesh(new PlaneGeometry(s[0], s[1]), starMat);
    q.rotation.x = -Math.PI / 2;
    q.position.y = 0.014;
    glowGroup.add(q);
    starQuads.push(q);
    owned.push(q.geometry);
  });
  owned.push(starMat);

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
  var laserCore = new Mesh(new PlaneGeometry(0.34, 0.34), laserCoreMat);
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
    map: streakTex, color: new Color(0x6fdcff), transparent: true, opacity: 0.34,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: true
  });
  var streak = new Mesh(new PlaneGeometry(0.85, 7.0), streakMat);
  streak.rotation.x = -Math.PI / 2;
  /* The ramp's opaque end is at v=0, which after the -90 degrees about X lands
     at the far edge; pushing the quad forward by half its length puts that end
     under him and lets the tail run toward the viewer. */
  streak.position.set(0, 0.016, 3.5);
  glowGroup.add(streak);
  owned.push(streak.geometry, streakMat, streakTex);

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
    map: horizonTex, color: cyan, transparent: true, opacity: 0.85,
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

  /* ---- 4b. atmosphere: cloud and mist bands ---------------------------- */
  /* "Clouds and shit", read as intended: not fluffy cartoon clouds, but the
     suspended haze that gives a dark world scale and mystery.

     Built as a handful of very large, very faint quads carrying a soft blobby
     texture, hung at different depths and drifting sideways at different rates.
     Parallax between the layers is what sells them as volume — a single layer
     reads as a painted backdrop no matter how good the texture is, and three
     layers moving at different speeds reads as air.

     Deliberately NOT additive. Additive haze glows, and glowing clouds in the
     upper frame would compete with him directly; these are dark mist that
     OCCLUDES, so they deepen the world instead of lighting it. They are fogged
     with everything else, and their opacity is the lowest of any layer here. */
  var cloudTex = cloudTexture();
  var cloudMat = new MeshBasicMaterial({
    /* MUCH darker and fainter than the first attempt, and the reason is the
       same trap the horizon glow fell into: a layer that covers the whole frame
       width does not have to be bright to become a veil. At 0.30 these bands
       lifted 140 rows of the frame from "partially lit" to "lit right across",
       which is the structural signature of a wash over the world rather than
       weather in it — the floor grid's converging lines stopped being
       separable. The brief asks for subtle cloud presence and specifically
       warns against making it obvious; this is that, at the level where it
       reads as depth and not as a filter over the lens. */
    map: cloudTex, color: new Color(0x0a1018), transparent: true, opacity: 0.11,
    depthWrite: false, toneMapped: false, side: DoubleSide, fog: true
  });
  var clouds = new Group();
  clouds.name = 'atmosphere';
  var cloudBands = [];
  [
    /* Every band's LOWER EDGE must stay above the floor. The first version
       centred them at y 3.2-7.5 with heights up to 22, so each band's bottom
       reached several units BELOW the ground plane and hung dark mist straight
       over the grid — measured, the number of rows carrying converging content
       collapsed and the floor stopped reading as perspective at all. Haze in
       front of the floor is not atmosphere, it is a veil. These sit entirely in
       the sky, which is where the reference's cloud is. */
    /* Two bands, both far back and well above the horizon line.

       A third, nearer band at z=-26 was hanging in the same screen region as
       the upper grid and the horizon, so it veiled precisely the part of the
       frame where the floor's perspective is read. Distant sky is where cloud
       belongs in this composition anyway: it adds scale behind him without ever
       coming between the camera and his world. */
    { z: -62, y: 20.0, w: 118, h: 13, speed: 0.050, o: 1.00 },
    { z: -46, y: 15.0, w: 88, h: 9, speed: -0.080, o: 0.66 }
  ].forEach(function (b, i) {
    var m = cloudMat.clone();
    m.opacity = cloudMat.opacity * b.o;
    var q = new Mesh(new PlaneGeometry(b.w, b.h), m);
    q.position.set(0, b.y, b.z);
    q.renderOrder = -5 + i;
    clouds.add(q);
    cloudBands.push({ mesh: q, speed: b.speed, span: b.w * 0.25, base: 0 });
    owned.push(q.geometry, m);
  });
  group.add(clouds);
  owned.push(cloudTex);

  /* ---- 5. distant structures ------------------------------------------- */
  /* Faceted forms far out, edge-lit in the character's own geometric language
     so the world looks built of the same material he is. Kept very dim: they
     exist for parallax and scale, not to be looked at. */
  var structures = new Group();
  structures.name = 'structures';
  var structMat = new MeshStandardMaterial({
    color: new Color(0x0b1620), roughness: 0.75, metalness: 0.3, flatShading: true, fog: true
  });
  var structEdge = new LineBasicMaterial({
    color: cyan, transparent: true, opacity: 0.22,
    depthWrite: false, blending: AdditiveBlending, fog: true
  });
  owned.push(structMat, structEdge);

  /* x, z, radius, height — pushed well back and spread wide so they read as
     a skyline rather than as props flanking a stage. */
  /* Deliberately small, low and far. An earlier set stood 26 units tall at
     z=-40 and read as a black hole punched through the floor: being opaque,
     they occlude the receding grid, and anything large enough to do that stops
     being atmosphere and becomes an obstacle. Kept under the horizon line and
     back beyond the fog's reach, they now read as a skyline. */
  [[-30, -62, 6.0, 7.5], [34, -70, 7.0, 9.0], [-52, -78, 8.0, 10.5], [56, -84, 7.5, 9.5],
   [-14, -90, 9.0, 12.0], [24, -96, 8.5, 11.0], [-70, -99, 9.5, 12.5]]
    .forEach(function (s) {
      var geo = new ConeGeometry(s[2], s[3], 4, 1);
      var m = new Mesh(geo, structMat);
      m.position.set(s[0], s[3] / 2, s[1]);
      m.rotation.y = Math.PI / 4;
      structures.add(m);
      var eg = new EdgesGeometry(geo, 20);
      var el = new LineSegments(eg, structEdge);
      el.position.copy(m.position);
      el.rotation.copy(m.rotation);
      structures.add(el);
      owned.push(geo, eg);
    });
  group.add(structures);

  /* ---- 5b. light pillars ----------------------------------------------- */
  /* The vertical beams standing in Reference A's landscape. They do more than
     decorate: they are the only strictly vertical elements in a world built of
     horizontals, so they give the eye a scale rule against the pyramids and
     stop the far distance reading as flat. Bright at the floor and dissolving
     upward, fogged with everything else, and crossed in pairs so they keep
     their width when the subject is dragged and the view shifts. */
  var pillarTex = rampTexture();
  var pillarMat = new MeshBasicMaterial({
    map: pillarTex, color: new Color(0x5fd4ff), transparent: true, opacity: 0.42,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false,
    side: DoubleSide, fog: true
  });
  var pillars = new Group();
  pillars.name = 'light-pillars';
  [
    /* Brought nearer and spread wider. At z -44..-72 every pillar sat beyond
       where the fog has already taken the world, so none of them reached the
       frame in any mode — they existed and were invisible, which is the worst
       of both. These are inside the fade, at azimuths that put at least one in
       shot at every composition. */
    { x: -19, z: -30, h: 16, w: 0.17, o: 1.0 },
    { x: -34, z: -46, h: 26, w: 0.24, o: 0.8 },
    { x: 15, z: -34, h: 19, w: 0.19, o: 1.0 },
    { x: 30, z: -52, h: 29, w: 0.26, o: 0.7 },
    { x: 4, z: -60, h: 24, w: 0.22, o: 0.5 }
  ].forEach(function (b) {
    var m = pillarMat.clone();
    m.opacity = pillarMat.opacity * b.o;
    [0, Math.PI / 2].forEach(function (rot) {
      var q = new Mesh(new PlaneGeometry(b.w, b.h), m);
      q.position.set(b.x, b.h / 2, b.z);
      q.rotation.y = rot;
      pillars.add(q);
      owned.push(q.geometry);
    });
    owned.push(m);
  });
  group.add(pillars);
  owned.push(pillarTex);

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

  /* Baselines, so a mode weight of 1.0 restores exactly what was authored. */
  var BASE = {
    grid: gridMat.opacity, nodes: nodeMat.opacity, structures: structEdge.opacity,
    motes: moteMat.opacity, disc: discMat.opacity, star: starMat.opacity,
    horizon: horizonMat.opacity
  };

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
    var g = breathe * glowPulse;
    discMat.opacity = BASE.disc * g;
    starMat.opacity = BASE.star * g;
    horizonMat.opacity = BASE.horizon * (0.94 + 0.06 * Math.sin(time * 0.5));

    /* Each band drifts at its own rate and wraps, so the parallax between them
       never settles into a repeating pattern the eye can lock onto. */
    cloudBands.forEach(function (b) {
      b.base += dt * b.speed;
      if (b.base > b.span) b.base -= b.span * 2;
      if (b.base < -b.span) b.base += b.span * 2;
      b.mesh.position.x = b.base;
    });
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

  function applyMode(w) {
    if (!w) return;
    /* Sit the glow just short of where the fog finishes, so the floor dissolves
       INTO it rather than stopping short of it. */
    if (w.fogFar) setHorizon(-(w.fogFar * 0.70));
    gridMat.opacity = BASE.grid * (w.grid == null ? 1 : w.grid);
    nodeMat.opacity = BASE.nodes * (w.nodes == null ? 1 : w.nodes);
    structEdge.opacity = BASE.structures * (w.structures == null ? 1 : w.structures);
    structures.visible = (w.structures == null ? 1 : w.structures) > 0.05;
    moteMat.opacity = BASE.motes * (w.motes == null ? 1 : w.motes);
    BASE.disc = 0.5 * (w.glow == null ? 1 : w.glow);
    BASE.star = 0.5 * (w.glow == null ? 1 : w.glow);
    /* Atmosphere follows the same per-mode weighting as everything else: a
       tight portrait wants less sky than a wide showcase does. */
    var ha = w.haze == null ? 1 : w.haze;
    /* Pillars and stars follow the structures weight — they are the same
       "distant world" tier, and a mode that wants a quiet background should
       lose all of it together rather than in pieces. */
    var st = w.structures == null ? 1 : w.structures;
    pillars.visible = st > 0.05;
    stars.visible = st > 0.05;
    starMat.opacity = 0.55 * st;
    clouds.visible = ha > 0.03;
    cloudBands.forEach(function (b, i) {
      b.mesh.material.opacity = 0.11 * [1.00, 0.66][i] * ha;
    });
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
    pillars: pillars, stars: stars,
    setOpacity: function (v) { gridMat.opacity = Math.max(0, Math.min(1, Number(v))); },
    dispose: dispose
  };
}
