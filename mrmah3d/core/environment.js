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
  }

  function dispose() {
    owned.forEach(function (o) { if (o && o.dispose) o.dispose(); });
    if (group.parent) group.parent.remove(group);
  }

  return {
    group: group, ground: ground, grid: grid, nodes: nodes,
    glow: glowGroup, structures: structures, motes: motes, horizon: horizon,
    update: update, followCharacter: followCharacter, applyMode: applyMode,
    setHorizon: setHorizon,
    setOpacity: function (v) { gridMat.opacity = Math.max(0, Math.min(1, Number(v))); },
    dispose: dispose
  };
}
