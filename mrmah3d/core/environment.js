/* MR.MAH 3D :: ENVIRONMENT
   The reference world: a near-black void, a perspective grid with glowing
   intersections, sparse dark geometric structures in depth, a controlled floor
   glow beneath Mr.Mah, and a few drifting motes.

   The discipline the reference sets, and the one thing to protect here: the
   world is quiet. Mr.Mah is the only bright, detailed thing in frame.
   Everything below is deliberately dim, sparse and low-contrast so that it
   reads as depth rather than as decoration. If this file ever starts competing
   with the character, it is wrong.

   The grid is sized and pushed forward so it lies ENTIRELY IN FRONT OF THE
   CAMERA. Line segments straddling the near plane were measured being dropped
   by the rasteriser, which removed every converging line and left the floor
   reading as flat horizontal bands. */

import {
  Mesh, PlaneGeometry, ShadowMaterial, Color, Group,
  BufferGeometry, Float32BufferAttribute, LineSegments, LineBasicMaterial,
  Points, PointsMaterial, MeshBasicMaterial, AdditiveBlending, DoubleSide,
  ConeGeometry, MeshStandardMaterial, EdgesGeometry, CanvasTexture
} from '../vendor/three/three.module.min.js';

export var GRID = {
  size: 46,
  divisions: 30,       /* ~1.53 unit cells */
  /* The canonical camera sits at z = +7.81. At centerZ -14 the grid's near
     edge landed at z = +9 — BEHIND the camera — so every receding line
     straddled the near plane and was dropped, leaving the floor as flat
     horizontal bands with no perspective at all. At -20 the near edge is at
     z = +3, comfortably in front, and still below the bottom of frame. */
  centerZ: -20,        /* spans z = +3 .. -43 */
  y: 0.02,
  opacity: 0.34
};

/* A soft round sprite, generated rather than loaded: no texture file to ship,
   and it scales to whatever the tier allows. */
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

export function createEnvironment(options) {
  var opts = options || {};
  var palette = opts.palette;
  var settings = opts.settings || { shadows: true };
  var parent = opts.parent;
  var tier = opts.tier || 'medium';
  var owned = [];
  var group = new Group();
  group.name = 'mrmah-environment';

  var cyan = new Color(0x35d6ff);

  /* ---- ground: catches the character's shadow, never lit itself -------- */
  var ground = new Mesh(
    new PlaneGeometry(GRID.size + 30, GRID.size + 30),
    new ShadowMaterial({ opacity: settings.shadows ? 0.5 : 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = !!settings.shadows;
  ground.material.depthWrite = false;   /* it must never occlude the grid */
  ground.name = 'ground';
  group.add(ground);
  owned.push(ground.geometry, ground.material);

  /* ---- grid lines ------------------------------------------------------ */
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

  /* ---- glowing intersections ------------------------------------------ */
  /* The reference's floor reads as energy points, not just ruled lines. Only
     every other intersection is lit, and only within the near half of the
     grid, so the effect stays sparse and the far floor still fades out. */
  var nodePts = [];
  for (var a = 0; a <= GRID.divisions; a += 2) {
    for (var b = 0; b <= GRID.divisions; b += 2) {
      var x = -half + a * step, z = -half + b * step;
      if (Math.abs(x) > half * 0.8 || z > half * 0.55) continue;
      nodePts.push(x, 0, z);
    }
  }
  var nodeGeo = new BufferGeometry();
  nodeGeo.setAttribute('position', new Float32BufferAttribute(nodePts, 3));
  var nodeTex = radialTexture(tier === 'low' ? 32 : 64, 0.18);
  var nodeMat = new PointsMaterial({
    color: cyan, size: 0.42, map: nodeTex, transparent: true,
    opacity: 0.85, depthWrite: false, blending: AdditiveBlending,
    sizeAttenuation: true, fog: true, toneMapped: false
  });
  var nodes = new Points(nodeGeo, nodeMat);
  nodes.position.set(0, GRID.y + 0.01, GRID.centerZ);
  nodes.name = 'grid-nodes';
  group.add(nodes);
  owned.push(nodeGeo, nodeMat, nodeTex);

  /* ---- floor glow beneath the character -------------------------------- */
  /* The bright contact starburst the reference shows under the torso tip.
     Two crossed additive quads plus a soft disc: cheaper and more controllable
     than a bloom pass, and it sits exactly where the point does. */
  var glowGroup = new Group();
  glowGroup.name = 'floor-glow';
  var glowTex = radialTexture(128, 0.10);
  var discMat = new MeshBasicMaterial({
    map: glowTex, color: cyan, transparent: true, opacity: 0.55,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false
  });
  var disc = new Mesh(new PlaneGeometry(2.6, 2.6), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.012;
  glowGroup.add(disc);
  owned.push(disc.geometry, discMat, glowTex);

  var starMat = new MeshBasicMaterial({
    map: glowTex, color: new Color(0xbdf2ff), transparent: true, opacity: 0.5,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false
  });
  [[3.4, 0.10], [0.10, 2.2]].forEach(function (s) {
    var q = new Mesh(new PlaneGeometry(s[0], s[1]), starMat);
    q.rotation.x = -Math.PI / 2;
    q.position.y = 0.014;
    glowGroup.add(q);
    owned.push(q.geometry);
  });
  owned.push(starMat);
  group.add(glowGroup);

  /* ---- background structures ------------------------------------------ */
  /* Flanking dark pyramids, well back and well dim. Faceted and edge-lit like
     the character so the world shares his geometric language, but at a
     fraction of the brightness so they never pull focus. */
  var structures = new Group();
  structures.name = 'structures';
  var structMat = new MeshStandardMaterial({
    color: new Color(0x101d28), roughness: 0.7, metalness: 0.25, flatShading: true
  });
  var structEdge = new LineBasicMaterial({
    color: cyan, transparent: true, opacity: 0.26,
    depthWrite: false, blending: AdditiveBlending, fog: true
  });
  owned.push(structMat, structEdge);

  [[-9.5, -13, 4.2, 6.0], [10.5, -16, 5.0, 7.4], [-15, -24, 6.2, 9.0], [16, -27, 5.6, 8.2]]
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

  /* ---- drifting motes -------------------------------------------------- */
  var moteCount = tier === 'low' ? 40 : tier === 'medium' ? 80 : 130;
  var motePts = [], moteSeed = [];
  for (var m2 = 0; m2 < moteCount; m2++) {
    var mx = (Math.random() - 0.5) * 26;
    var my = Math.random() * 9;
    var mz = -Math.random() * 26 + 5;
    motePts.push(mx, my, mz);
    moteSeed.push(Math.random() * Math.PI * 2);
  }
  var moteGeo = new BufferGeometry();
  moteGeo.setAttribute('position', new Float32BufferAttribute(motePts, 3));
  var moteTex = radialTexture(32, 0.2);
  var moteMat = new PointsMaterial({
    color: cyan, size: 0.10, map: moteTex, transparent: true, opacity: 0.5,
    depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true,
    fog: true, toneMapped: false
  });
  var motes = new Points(moteGeo, moteMat);
  motes.name = 'motes';
  group.add(motes);
  owned.push(moteGeo, moteMat, moteTex);

  if (parent) parent.add(group);

  var baseY = motePts.filter(function (_, i) { return i % 3 === 1; });
  var time = 0;

  function update(dt, opts2) {
    var o = opts2 || {};
    if (o.reducedMotion) return;
    time += dt;
    /* Motes drift upward slowly and wrap. The only moving thing in the world,
       and deliberately almost imperceptible. */
    var arr = moteGeo.attributes.position.array;
    for (var i = 0; i < moteCount; i++) {
      arr[i * 3 + 1] += dt * 0.085;
      arr[i * 3] += Math.sin(time * 0.3 + moteSeed[i]) * dt * 0.05;
      if (arr[i * 3 + 1] > 9.5) arr[i * 3 + 1] = 0;
    }
    moteGeo.attributes.position.needsUpdate = true;
    /* The floor glow breathes with the character's hover. */
    var pulse = 0.9 + 0.1 * Math.sin(time * 1.5);
    discMat.opacity = 0.55 * pulse;
    starMat.opacity = 0.5 * pulse;
  }

  function setGlowPosition(x, z) {
    glowGroup.position.set(x || 0, 0, z || 0);
  }

  function dispose() {
    owned.forEach(function (o) { if (o && o.dispose) o.dispose(); });
    if (group.parent) group.parent.remove(group);
  }

  return {
    group: group, ground: ground, grid: grid, nodes: nodes,
    glow: glowGroup, structures: structures, motes: motes,
    update: update, setGlowPosition: setGlowPosition,
    setOpacity: function (v) { gridMat.opacity = Math.max(0, Math.min(1, Number(v))); },
    dispose: dispose
  };
}
