/* MAHTROPOLIS :: ARRIVAL PLAZA  (world scene v1 — development only)

   ONE small reference-matched arrival area: the wet plaza in front of the
   MAHWORLD gate. Built with the permitted renderer only (Three.js 0.185.1,
   the same vendored ES module the Mr. Mah glass box uses, copied verbatim
   into mahworld/vendor/three/). No addons, no textures from disk, no models,
   no post-processing: every surface is procedural so the scene has no asset
   pipeline and no build step.

   References followed (packet 04_VISUAL_REFERENCES + the MAHWORLD concept
   deck): nocturnal cobalt atmosphere, wet reflective ground, controlled
   emissive architecture, layered urban depth, restrained haze; the gate as a
   dark monolith with the diamond emblem, the wordmark and an arched portal
   with a luminous rim; wide steps; flanking curved towers with light bands;
   sweeping light ribbons and a large moon; small figures for scale.

   What is real here: a running WebGL scene, three authored camera views, a
   real camera move, drag-to-look and pinch-to-move. What is NOT here: any
   game system, any player, any network — this is the first visible place,
   not a world. Mr. Mah does not appear; his renderer is separate. */
import * as THREE from '../../vendor/three/three.module.min.js';

const PALETTE = {
  sky: 0x071630,
  fog: 0x102d5c,
  ground: 0x0a1424,
  slab: 0x0c1526,
  tower: 0x15233c,
  distant: 0x0b162a,
  ice: 0xdff1ff,        /* emissive white with a cold cast */
  energy: 0x7fc6ff,     /* MAHWORLD cyan-blue energy */
  deep: 0x1c4a8f,
  figure: 0x04070d
};

const VIEWS = {
  /* eye positions in metres; the gate face is at z ≈ -26.9, the plaza runs toward +z */
  arrival:   { pos: [0.6, 1.7, 24.0],  look: [0, 9.5, -30],  fov: 58 },
  ascent:    { pos: [-6.5, 1.35, -6.0], look: [0, 11.5, -30], fov: 62 },
  threshold: { pos: [0.4, 3.4, -15.0], look: [0, 6.8, -30],  fov: 60 }
};
const TOUR = ['arrival', 'ascent', 'threshold'];

function reducedMotion() {
  try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

/* ---- procedural textures --------------------------------------------- */
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function glowTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(200,232,255,0.55)');
    r.addColorStop(0.6, 'rgba(120,180,255,0.12)'); r.addColorStop(1, 'rgba(60,110,200,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
}
function textTexture(text, { size = 180, weight = 700, spacing = 0.12, w = 2048, h = 512, color = '#eaf5ff' } = {}) {
  return canvasTexture(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = `${weight} ${size}px "Space Grotesk", "Helvetica Neue", Arial, sans-serif`;
    /* manual letter-spacing so the wordmark reads as the concept's wide set */
    const gap = size * spacing; let total = 0;
    for (const ch of text) total += g.measureText(ch).width + gap;
    let x = (w - (total - gap)) / 2;
    for (const ch of text) { g.fillText(ch, x, h / 2); x += g.measureText(ch).width + gap; }
  });
}
function windowsTexture(seed) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  return canvasTexture(128, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h - 8; y += 14) for (let x = 6; x < w - 6; x += 12) {
      const r = rnd(); if (r < 0.72) continue;
      g.fillStyle = r > 0.96 ? 'rgba(190,230,255,0.95)' : r > 0.9 ? 'rgba(140,190,255,0.7)' : 'rgba(90,140,220,0.45)';
      g.fillRect(x, y, 5, 8);
    }
  });
}
function moonTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    const cx = w / 2, cy = h / 2, R = w / 2 - 2;
    const base = g.createRadialGradient(cx - 40, cy - 50, 20, cx, cy, R);
    base.addColorStop(0, '#d9e3f2'); base.addColorStop(0.7, '#9fb0cc'); base.addColorStop(1, '#5c6f92');
    g.fillStyle = base; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.18; g.fillStyle = '#3e5273';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(cx, cy - 170 + i * 42, R * (0.9 - i * 0.03), 12 + (i % 3) * 5, 0, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 0.22; g.fillStyle = '#25364f';
    [[cx - 90, cy + 40, 46], [cx + 70, cy - 30, 30], [cx + 20, cy + 120, 22], [cx - 140, cy - 90, 18]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
    g.globalAlpha = 0.16; g.fillStyle = '#e8f0ff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 150px "Space Grotesk", "Helvetica Neue", Arial, sans-serif'; g.fillText('FOB', cx + 10, cy + 20);
    g.globalAlpha = 1;
    /* terminator: darken the lower-left limb */
    const t = g.createRadialGradient(cx + 60, cy - 60, R * 0.55, cx, cy, R);
    t.addColorStop(0, 'rgba(6,10,20,0)'); t.addColorStop(1, 'rgba(6,10,20,0.75)');
    g.fillStyle = t; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  });
}
function archWindowTexture() {
  return canvasTexture(512, 1024, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0a1a3f'); sky.addColorStop(0.55, '#123a7a'); sky.addColorStop(1, '#061024');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const neb = g.createRadialGradient(w * 0.55, h * 0.42, 10, w * 0.55, h * 0.42, w * 0.7);
    neb.addColorStop(0, 'rgba(150,200,255,0.55)'); neb.addColorStop(0.5, 'rgba(70,120,220,0.25)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = neb; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(232,240,255,0.95)'; g.beginPath(); g.arc(w * 0.5, h * 0.4, w * 0.19, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(160,185,215,0.5)'; g.beginPath(); g.arc(w * 0.44, h * 0.38, w * 0.06, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(230,240,255,${0.25 + Math.random() * 0.6})`; const x = Math.random() * w, y = Math.random() * h * 0.75; g.fillRect(x, y, 2, 2); }
    /* the far city inside the portal */
    g.fillStyle = 'rgba(8,16,34,0.95)';
    for (let x = 0; x < w; x += 22) { const hh = 90 + Math.random() * 160; g.fillRect(x, h - hh, 18, hh); }
    g.fillStyle = 'rgba(150,200,255,0.5)';
    for (let i = 0; i < 120; i++) g.fillRect(Math.random() * w, h - 200 + Math.random() * 190, 2, 3);
  });
}

/* ---- geometry helpers -------------------------------------------------- */
function roundedSlab(w, h, r, depth) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h - r); s.quadraticCurveTo(-w / 2, h, -w / 2 + r, h);
  s.lineTo(w / 2 - r, h); s.quadraticCurveTo(w / 2, h, w / 2, h - r); s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2 });
  g.translate(0, 0, -depth);
  return g;
}
function archCurve(width, height, z) {
  /* a tall arch: straight sides, semicircular top */
  const r = width / 2, pts = [];
  pts.push(new THREE.Vector3(-r, 0, z));
  pts.push(new THREE.Vector3(-r, height - r, z));
  for (let i = 0; i <= 24; i++) { const a = Math.PI - (i / 24) * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * r, height - r + Math.sin(a) * r, z)); }
  pts.push(new THREE.Vector3(r, 0, z));
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0);
}
function archShape(width, height) {
  const r = width / 2, s = new THREE.Shape();
  s.moveTo(-r, 0); s.lineTo(-r, height - r); s.absarc(0, height - r, r, Math.PI, 0, true); s.lineTo(r, 0); s.lineTo(-r, 0);
  return s;
}
/* ShapeGeometry writes UVs in shape units (one metre = one texture repeat);
   the portal window wants the whole picture once, so normalise to 0..1. */
function normaliseUVs(geometry) {
  geometry.computeBoundingBox();
  const b = geometry.boundingBox, pos = geometry.attributes.position, uv = geometry.attributes.uv;
  const w = b.max.x - b.min.x || 1, h = b.max.y - b.min.y || 1;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - b.min.x) / w, (pos.getY(i) - b.min.y) / h);
  uv.needsUpdate = true;
  return geometry;
}
function diamond(size, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.rotation.z = Math.PI / 4;
  return m;
}

export function createPlaza(canvas, options = {}) {
  const opts = Object.assign({ pixelRatioCap: 2, hud: null }, options);
  const state = { view: 'arrival', yaw: 0, pitch: 0, dolly: 0, touring: false, frames: 0, ms: 0, reduced: reducedMotion() };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.pixelRatioCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 18, 115);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 600);

  const glowTex = glowTexture();
  /* Wet-plaza reflections: mirrored copies of the emissive elements under the
     floor. Copies are built AFTER the whole graph is placed, from each mesh's
     WORLD matrix, so a child of a positioned group mirrors where it really is. */
  const reflections = new THREE.Group();
  reflections.scale.y = -1;
  scene.add(reflections);
  const mirrorQueue = [];
  function mirror(mesh, dim = 0.55) { mirrorQueue.push([mesh, dim]); return mesh; }
  function buildReflections() {
    scene.updateMatrixWorld(true);
    mirrorQueue.forEach(([mesh, dim]) => {
      const c = new THREE.Mesh(mesh.geometry, mesh.material.clone());
      const m = c.material;
      if (m.emissiveIntensity != null) m.emissiveIntensity *= dim;
      if (m.transparent && m.opacity != null) m.opacity *= dim;
      if (m.color && !m.emissive) m.color.multiplyScalar(dim);
      m.side = THREE.DoubleSide;           /* the y-flip reverses winding */
      c.matrixAutoUpdate = false;
      c.matrix.copy(mesh.matrixWorld);
      reflections.add(c);
    });
    mirrorQueue.length = 0;
  }
  function sprite(x, y, z, scale, opacity, color = 0xbfe0ff) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    s.position.set(x, y, z); s.scale.set(scale, scale, 1);
    scene.add(s);
    return s;
  }
  const emissive = (color, intensity, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: 0x0a0f18, emissive: color, emissiveIntensity: intensity, roughness: 0.6, metalness: 0 }, extra));

  /* ---- lights ---------------------------------------------------------- */
  scene.add(new THREE.HemisphereLight(0x2f68b8, 0x04060c, 0.85));
  const back = new THREE.DirectionalLight(0x9cc3ff, 0.55); back.position.set(-12, 40, -80); scene.add(back);
  const key = new THREE.DirectionalLight(0x6f9fe0, 0.28); key.position.set(30, 30, 40); scene.add(key);
  const archLight = new THREE.PointLight(0x86c8ff, 60, 60, 2); archLight.position.set(0, 4.5, -25.5); scene.add(archLight);
  const inlayLight = new THREE.PointLight(0x8fd0ff, 18, 22, 2); inlayLight.position.set(0, 2.2, 8); scene.add(inlayLight);
  const towerLightL = new THREE.PointLight(0x5f9ee6, 14, 40, 2); towerLightL.position.set(-16, 10, -10); scene.add(towerLightL);
  const towerLightR = towerLightL.clone(); towerLightR.position.x = 16; scene.add(towerLightR);

  /* ---- ground: the wet plaza --------------------------------------------- */
  const floorMat = new THREE.MeshPhongMaterial({ color: PALETTE.ground, specular: 0x7fb0ff, shininess: 90, transparent: true, opacity: 0.82 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = 2; scene.add(floor);
  const under = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0x02040a, fog: false }));
  under.rotation.x = -Math.PI / 2; under.position.y = -70; scene.add(under);
  /* paving seams */
  const seams = canvasTexture(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(160,200,255,0.35)'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { const p = i * (w / 8); g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); } });
  seams.wrapS = seams.wrapT = THREE.RepeatWrapping; seams.repeat.set(7, 7);
  const seamPlane = new THREE.Mesh(new THREE.PlaneGeometry(112, 112), new THREE.MeshBasicMaterial({ map: seams, transparent: true, opacity: 0.16, depthWrite: false }));
  seamPlane.rotation.x = -Math.PI / 2; seamPlane.position.y = 0.012; seamPlane.renderOrder = 3; scene.add(seamPlane);
  /* the axis: a long luminous hairline down the centre toward the gate */
  const axis = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 46), emissive(PALETTE.energy, 1.4));
  axis.rotation.x = -Math.PI / 2; axis.position.set(0, 0.02, 4); scene.add(axis);
  /* the inlaid emblem */
  const inlayMat = emissive(PALETTE.ice, 2.2);
  const inlay = new THREE.Group();
  [[0, 2.6], [-3.2, 1.2], [3.2, 1.2]].forEach(([x, s]) => { const d = diamond(s, inlayMat); d.rotation.x = -Math.PI / 2; d.rotation.z = Math.PI / 4; d.position.set(x, 0.03, 0); inlay.add(d); });
  inlay.position.set(0, 0, 8); scene.add(inlay);
  sprite(0, 0.4, 8, 9, 0.35);

  /* ---- the gate --------------------------------------------------------- */
  const slabMat = new THREE.MeshStandardMaterial({ color: PALETTE.slab, roughness: 0.42, metalness: 0.35 });
  const slab = new THREE.Mesh(roundedSlab(20, 27, 2.2, 3.2), slabMat);
  slab.position.set(0, 1.75, -27.0);   /* shape plane at z = -27.0; the 0.12 bevel brings the real front face to -26.88 */
  scene.add(slab);
  const gateZ = -27.0 + 0.12 + 0.03;     /* everything on the gate face floats just proud of the bevelled front */
  /* emblem row */
  const emblemMat = emissive(PALETTE.ice, 2.6);
  const emblem = new THREE.Group();
  [[0, 2.4], [-2.9, 1.05], [2.9, 1.05]].forEach(([x, s]) => { const d = diamond(s, emblemMat); d.position.set(x, 0, 0); emblem.add(d); mirror(d); });
  emblem.position.set(0, 24.2, gateZ); scene.add(emblem);
  sprite(0, 24.2, gateZ + 0.3, 10, 0.4);
  /* wordmark + tagline */
  const word = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: textTexture('MAHWORLD', { size: 200, weight: 800, spacing: 0.1 }), transparent: true, depthWrite: false }));
  word.position.set(0, 20.6, gateZ); scene.add(word); mirror(word, 0.5);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.1), new THREE.MeshBasicMaterial({ map: textTexture('MOVE  ·  MUSIC  ·  GROW  ·  TOGETHER', { size: 62, weight: 500, spacing: 0.32, color: '#bcd6f5' }), transparent: true, depthWrite: false, opacity: 0.9 }));
  tag.position.set(0, 18.35, gateZ); scene.add(tag);
  const tagRule = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 0.03), emissive(PALETTE.energy, 1.2)); tagRule.position.set(0, 17.55, gateZ); scene.add(tagRule);
  /* the portal: recessed window + double luminous rim */
  const ARCH_W = 6.6, ARCH_H = 12.2;
  const windowMesh = new THREE.Mesh(normaliseUVs(new THREE.ShapeGeometry(archShape(ARCH_W, ARCH_H))), new THREE.MeshBasicMaterial({ map: archWindowTexture(), fog: false }));
  windowMesh.position.set(0, 1.75, gateZ + 0.005); scene.add(windowMesh); mirror(windowMesh, 0.6);
  const rimMat = new THREE.MeshBasicMaterial({ color: PALETTE.ice, fog: false });
  const rimOuter = new THREE.Mesh(new THREE.TubeGeometry(archCurve(ARCH_W + 0.9, ARCH_H + 0.45, 0), 96, 0.075, 8, false), rimMat);
  const rimInner = new THREE.Mesh(new THREE.TubeGeometry(archCurve(ARCH_W + 0.25, ARCH_H + 0.12, 0), 96, 0.045, 8, false), rimMat);
  [rimOuter, rimInner].forEach(r => { r.position.set(0, 1.75, gateZ + 0.12); scene.add(r); mirror(r, 0.6); });
  const rimGlow = new THREE.Mesh(new THREE.TubeGeometry(archCurve(ARCH_W + 0.9, ARCH_H + 0.45, 0), 64, 0.5, 8, false), new THREE.MeshBasicMaterial({ color: PALETTE.energy, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  rimGlow.position.set(0, 1.75, gateZ + 0.12); scene.add(rimGlow);
  sprite(0, 7.0, gateZ + 0.6, 13, 0.2, 0x8fc8ff);

  /* ---- plinth and steps ------------------------------------------------- */
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x0d1626, roughness: 0.5, metalness: 0.25 });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(30, 1.75, 8), stepMat);
  plinth.position.set(0, 0.875, -25); scene.add(plinth);
  const stripMat = emissive(PALETTE.energy, 1.6);
  for (let i = 0; i < 5; i++) {
    const h = 1.75 - (i + 1) * 0.35, depth = 1.6, z = -21 + i * depth + depth / 2;
    const step = new THREE.Mesh(new THREE.BoxGeometry(30 + i * 1.2, h, depth), stepMat);
    step.position.set(0, h / 2, z); scene.add(step);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(30 + i * 1.2, 0.025, 0.06), stripMat);
    strip.position.set(0, h + 0.012, z + depth / 2 - 0.03); scene.add(strip); mirror(strip, 0.5);
  }
  const plinthStrip = new THREE.Mesh(new THREE.BoxGeometry(30, 0.025, 0.06), stripMat);
  plinthStrip.position.set(0, 1.762, -21.03); scene.add(plinthStrip);

  /* ---- flanking towers ---------------------------------------------------- */
  const towerMat = new THREE.MeshStandardMaterial({ color: PALETTE.tower, roughness: 0.38, metalness: 0.4 });
  const bandMat = emissive(PALETTE.ice, 1.9);
  function tower(x, z, radius, height, thetaStart, thetaLen, bands) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, height, 48, 1, false, thetaStart, thetaLen), towerMat);
    body.position.set(x, height / 2, z); scene.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.98, radius, 0.6, 48, 1, false, thetaStart, thetaLen), towerMat);
    cap.position.set(x, height + 0.3, z); scene.add(cap);
    bands.forEach(y => {
      /* a band is a thin open cylinder cut with the SAME angles as the body, so it can never drift off the face */
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.08, radius + 0.08, 0.5, 48, 1, true, thetaStart, thetaLen), bandMat);
      ring.position.set(x, y, z); scene.add(ring); mirror(ring, 0.5);
    });
  }
  tower(-26, -16, 10, 42, Math.PI * 0.05, Math.PI * 0.95, [7, 14, 21, 28, 35]);
  tower(26, -16, 10, 38, Math.PI * 1.0, Math.PI * 0.95, [6, 13, 20, 27]);
  /* low foreground modules, like the concept's stacked hangars */
  tower(-21, 6, 6, 9, Math.PI * 0.1, Math.PI * 0.9, [4.5]);
  tower(21, 6, 6, 11, Math.PI * 1.0, Math.PI * 0.9, [5.5]);
  /* module edge lights: a bright rule along the top of each low module */
  [[-21, 9.05, 6, -1], [21, 11.05, 6, 1]].forEach(([x, y, z]) => {
    const rule = new THREE.Mesh(new THREE.BoxGeometry(7, 0.05, 0.05), bandMat); rule.position.set(x, y, z + 6); scene.add(rule); mirror(rule, 0.45);
  });

  /* ---- distant skyline ------------------------------------------------- */
  const winTexA = windowsTexture(7), winTexB = windowsTexture(29);
  for (let i = 0; i < 26; i++) {
    const w = 6 + (i * 7) % 11, d = 6 + (i % 3) * 4;
    const x = -95 + i * 7.6 + ((i * 5) % 7) - 3, z = -70 - ((i * 11) % 5) * 9;
    if (Math.abs(x) < 14) continue;   /* keep the axis behind the gate clear */
    /* the gate must stay the tallest thing in the centre band, and the moon must clear the skyline */
    let h = 22 + ((i * 13) % 9) * 5 + (i % 4) * 6;
    if (Math.abs(x) < 44) h = Math.min(h, 22 + (i % 3) * 3);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: PALETTE.distant, roughness: 0.7, metalness: 0.1, emissive: 0x9fd0ff, emissiveMap: i % 2 ? winTexA : winTexB, emissiveIntensity: 0.38 }));
    b.position.set(x, h / 2, z - 14); scene.add(b);
  }
  /* horizon haze: the luminous urban depth behind everything */
  const hazeMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0x3a7fd8, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(360, 80), hazeMat); haze.position.set(0, 14, -132); scene.add(haze);

  /* ---- sky: moon, ribbons, stars ---------------------------------------- */
  const moon = new THREE.Mesh(new THREE.CircleGeometry(15, 64), new THREE.MeshBasicMaterial({ map: moonTexture(), fog: false, transparent: true }));
  moon.position.set(30, 60, -145); scene.add(moon);
  sprite(30, 60, -146, 64, 0.22, 0x9fc0ff);
  function ribbon(points, radius, opacity) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
    const core = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, radius, 8, false), new THREE.MeshBasicMaterial({ color: PALETTE.ice, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, radius * 4.5, 8, false), new THREE.MeshBasicMaterial({ color: PALETTE.energy, transparent: true, opacity: opacity * 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    scene.add(core, glow);
    return { core, glow };
  }
  const ribbons = [
    ribbon([[-120, 14, -150], [-60, 48, -130], [-10, 70, -110], [40, 58, -95], [90, 26, -80], [130, 8, -70]], 0.9, 0.85),
    ribbon([[-90, 62, -95], [-30, 84, -85], [30, 78, -70], [75, 50, -55], [110, 20, -40]], 0.65, 0.6)
  ];
  const starGeo = new THREE.BufferGeometry(); const starPos = [];
  for (let i = 0; i < 420; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 0.9 + 0.08, r = 400; starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r - 120); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfe3ff, size: 1.1, sizeAttenuation: true, transparent: true, opacity: 0.8, fog: false })));

  /* ---- figures for scale and one hovering vehicle ------------------------- */
  const figMat = new THREE.MeshLambertMaterial({ color: PALETTE.figure });
  const figGeo = new THREE.CapsuleGeometry(0.27, 1.15, 4, 10);
  [[-4.5, 0, 13], [3.8, 0, 15.5], [-1.6, 0, 3], [6.5, 0, -2], [-9, 0, -4], [2.2, 1.05, -17.5], [-3.4, 0.7, -16]].forEach(([x, y, z]) => {
    const f = new THREE.Mesh(figGeo, figMat); f.position.set(x, y + 0.85, z); f.rotation.y = Math.random() * Math.PI; scene.add(f);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.set(x, y + 0.015, z); scene.add(shadow);
  });
  const vehicle = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 1.7), new THREE.MeshStandardMaterial({ color: 0x0b1424, roughness: 0.35, metalness: 0.6 })); vehicle.add(hull);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.05, 0.05), emissive(PALETTE.energy, 2.0)); strip.position.set(0, -0.44, 0.86); vehicle.add(strip);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 1.2), emissive(0xffd9c0, 1.2)); tail.position.set(-1.72, 0, 0); vehicle.add(tail);
  vehicle.position.set(-13, 6.5, -6); vehicle.rotation.y = -0.35; scene.add(vehicle);

  /* ---- rain ------------------------------------------------------------- */
  const RAIN = 1400, rainPos = new Float32Array(RAIN * 3);
  for (let i = 0; i < RAIN; i++) { rainPos[i * 3] = (Math.random() - 0.5) * 70; rainPos[i * 3 + 1] = Math.random() * 30; rainPos[i * 3 + 2] = (Math.random() - 0.5) * 70; }
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x9cc6ff, size: 0.075, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(rain);

  buildReflections();

  /* ---- camera control ---------------------------------------------------- */
  const cur = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 58 };
  const from = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 58 };
  let anim = null;   /* { t0, dur, to, resolve } */
  function applyView(name) { const v = VIEWS[name]; cur.pos.set(...v.pos); cur.look.set(...v.look); cur.fov = v.fov; }
  applyView('arrival');
  const tmpDir = new THREE.Vector3(), tmpRight = new THREE.Vector3(), tmpTarget = new THREE.Vector3();
  function placeCamera() {
    tmpDir.subVectors(cur.look, cur.pos).normalize();
    const yaw = state.yaw, pitch = state.pitch;
    /* yaw around Y, pitch around the camera's right axis */
    tmpDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    tmpRight.crossVectors(tmpDir, new THREE.Vector3(0, 1, 0)).normalize();
    tmpDir.applyAxisAngle(tmpRight, pitch).normalize();
    camera.position.copy(cur.pos).addScaledVector(tmpDir, state.dolly);
    if (camera.position.y < 0.6) camera.position.y = 0.6;
    tmpTarget.copy(camera.position).addScaledVector(tmpDir, 40);
    camera.lookAt(tmpTarget);
    camera.fov = cur.fov + (state.fovBias || 0);
    camera.updateProjectionMatrix();
  }
  function setView(name, { instant = false, duration = 2600 } = {}) {
    if (!VIEWS[name]) return Promise.resolve(false);
    state.view = name; state.yaw = 0; state.pitch = 0; state.dolly = 0;
    if (instant || state.reduced) { applyView(name); anim = null; requestRender(); return Promise.resolve(true); }
    from.pos.copy(cur.pos); from.look.copy(cur.look); from.fov = cur.fov;
    return new Promise(resolve => { anim = { t0: performance.now(), dur: duration, to: VIEWS[name], resolve }; requestRender(); });
  }
  async function tour({ hold = 900, leg = 3600 } = {}) {
    if (state.touring) return false;
    state.touring = true;
    try {
      await setView(TOUR[0], { instant: true });
      await sleep(hold);
      for (let i = 1; i < TOUR.length; i++) { await setView(TOUR[i], { duration: leg }); await sleep(hold); }
    } finally { state.touring = false; }
    return true;
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* pointer: drag to look, wheel / pinch to move along the view axis */
  let drag = null, pinch = null;
  const el = canvas;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => { if (state.touring) return; el.setPointerCapture(e.pointerId); drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: state.yaw, pitch: state.pitch }; });
  el.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = (e.clientX - drag.x) / el.clientWidth, dy = (e.clientY - drag.y) / el.clientHeight;
    state.yaw = THREE.MathUtils.clamp(drag.yaw - dx * 1.6, -0.75, 0.75);
    state.pitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.9, -0.35, 0.35);
    requestRender();
  });
  const endDrag = e => { if (drag && e.pointerId === drag.id) drag = null; };
  el.addEventListener('pointerup', endDrag); el.addEventListener('pointercancel', endDrag);
  el.addEventListener('wheel', e => { e.preventDefault(); state.dolly = THREE.MathUtils.clamp(state.dolly + (e.deltaY < 0 ? 0.8 : -0.8), -6, 10); requestRender(); }, { passive: false });
  el.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = { d: dist(e.touches), dolly: state.dolly }; }, { passive: true });
  el.addEventListener('touchmove', e => { if (pinch && e.touches.length === 2) { state.dolly = THREE.MathUtils.clamp(pinch.dolly + (dist(e.touches) - pinch.d) / 30, -6, 10); requestRender(); } }, { passive: true });
  el.addEventListener('touchend', () => { pinch = null; });
  function dist(t) { const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); }

  /* ---- resize, render loop, visibility ----------------------------------- */
  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* portrait phones need more vertical field to hold the gate */
    state.fovBias = camera.aspect < 0.8 ? 14 : camera.aspect < 1.1 ? 6 : 0;
    placeCamera();
  }
  window.addEventListener('resize', () => { resize(); requestRender(); });
  resize();

  let needs = true, raf = 0, last = performance.now(), hidden = false;
  function requestRender() { needs = true; if (!raf) raf = requestAnimationFrame(frame); }
  function animateWorld(dt, t) {
    if (state.reduced) return;
    const p = rain.geometry.attributes.position.array;
    for (let i = 0; i < RAIN; i++) { p[i * 3 + 1] -= dt * 14; if (p[i * 3 + 1] < 0) { p[i * 3 + 1] = 30; p[i * 3] = camera.position.x + (Math.random() - 0.5) * 70; p[i * 3 + 2] = camera.position.z + (Math.random() - 0.5) * 70; } }
    rain.geometry.attributes.position.needsUpdate = true;
    ribbons[0].core.material.opacity = 0.75 + Math.sin(t * 0.0007) * 0.12;
    ribbons[1].core.material.opacity = 0.55 + Math.sin(t * 0.0009 + 1.3) * 0.1;
    vehicle.position.x = -13 + Math.sin(t * 0.00025) * 9; vehicle.position.y = 6.5 + Math.sin(t * 0.0011) * 0.35;
    archLight.intensity = 60 + Math.sin(t * 0.002) * 6;
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (anim) {
      const k = Math.min(1, (now - anim.t0) / anim.dur), e = ease(k);
      cur.pos.lerpVectors(from.pos, new THREE.Vector3(...anim.to.pos), e);
      cur.look.lerpVectors(from.look, new THREE.Vector3(...anim.to.look), e);
      cur.fov = from.fov + (anim.to.fov - from.fov) * e;
      if (k >= 1) { const r = anim.resolve; anim = null; r(true); }
    }
    animateWorld(dt, now);
    placeCamera();
    const t0 = performance.now();
    renderer.render(scene, camera);
    state.ms = state.ms * 0.9 + (performance.now() - t0) * 0.1;
    state.frames++;
    needs = false;
    if (opts.hud) opts.hud(state);
    const keepGoing = !hidden && (anim || !state.reduced);
    if (keepGoing) raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (!hidden) requestRender(); });
  requestRender();

  const ready = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => new Promise(r => requestAnimationFrame(() => r(true))));

  return {
    version: 'plaza-v1',
    views: Object.keys(VIEWS),
    setView, tour, ready, state, camera, scene, renderer,
    renderOnce() { requestRender(); },
    dispose() { cancelAnimationFrame(raf); renderer.dispose(); }
  };
}
