/* MAHPLAZA :: FOBEAMS — the district's coherent energy routes (v4)

   The canonical MAHFITT FOBEAM is a RAIL with a single SQUARE DIAMOND that
   travels along it, carrying a small travelling light; the FOBLOW is the same
   clock read as a low, broad edge flow. This module is that motif built in
   world space, replacing the two decorative arcs sky.js draws:

     RAIL          a thin additive tube along a CatmullRom curve (r 0.23),
                   vertex-faded at both ends so a route arrives rather than stops.
     OUTER FIELD   a second, much wider tube (r 1.85) at very low opacity —
                   the air the rail energises. Soft; never a laser hose.
     PACKETS       square diamonds (an octahedron flattened in its own plane =
                   a square rotated 45°, the reserved mark) travelling one way,
                   pooled in ONE InstancedMesh, rolled to face the camera while
                   their long axis follows the path.
     LIGHT         each packet carries one elongated additive ellipse, a second
                   InstancedMesh — the 3-D echo of the app's travelling light.
     RECEIVERS     every origin and destination is a real piece of architecture:
                   a plaza-edge relay mast, the MAH MATCH roof node, a walkway
                   pylon hub, three tower crowns. Each brightens for ~0.4 s when
                   a packet lands. No new lights (§37).
     FOBLOWS       three broad, faint, slow ribbons that follow the district's
                   surfaces — local and flowing, no packets, far fainter.

   Routes are deliberate infrastructure, not decoration: the plaza's west mast
   feeds MAH MATCH's roof node, which relays to the city walkway hub, which
   sends on to a tower crown; the east mast runs its own line to a second crown;
   and one trunk crosses the district behind the midground blocks. Nothing runs
   over the open plaza below y = 60, everything is occluded by architecture
   (depthTest on, depthWrite off, §21), and no two routes share a speed, a phase
   or a direction.

   Laws honoured: three.module.min only, procedural, no textures from disk, no
   yellow / amber / orange (colour comes from the world Theme's energy pair), no
   per-frame allocation, no geometry rebuilt in update, ~10 draw calls. */
import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, canvasTexture } from './materials.js';

/* ---- the receivers: where a route can begin or end ---------------------------------------
   p     = the transfer point (the beacon head)
   base  = where the receiver is rooted (plaza ground, MAH MATCH's roof at y 24,
           the walkway deck at y 34, a tower crown)                                          */
const NODES = {
  'relay-west':  { p: [-72, 34, -46],  base: [-72, 0, -46],      kind: 'mast',  note: 'plaza-edge relay mast, west of the vehicle corridor' },
  'relay-east':  { p: [76, 31, -50],   base: [76, 0, -50],       kind: 'mast',  note: 'plaza-edge relay mast, east of the vehicle corridor' },
  'match-roof':  { p: [0, 72.0, -78],  base: [0, 65, -78],       kind: 'node',  note: 'MAH MATCH tower crown node' },
  'walkway-hub': { p: [-52, 47.5, -150], base: [-52, 40, -150],  kind: 'node',  note: 'city walkway hub, over the west pylon' },
  'crown-nw':    { p: [-72.6, 131, -291], base: [-72.6, 125, -291], kind: 'crown', note: 'background tower crown, north-west' },
  'crown-w':     { p: [-111.4, 77, -262], base: [-111.4, 71.5, -262], kind: 'crown', note: 'background tower crown, west' },
  'crown-e':     { p: [118, 111, -265], base: [118, 105.5, -265], kind: 'crown', note: 'background tower crown, east' }
};

/* ---- the routes ---------------------------------------------------------------------------
   Each is one-way with its own speed, packet count, gauge (trunk lines carry larger
   carriers, which is also what keeps a 300 m route readable) and phase.                      */
const ROUTES = [
  { id: 'plaza-west-feed', tier: 'near', from: 'relay-west', to: 'match-roof', speed: 15.5, count: 7, gauge: 0.46, gain: 1.00, phase: 0.00,
    via: [[-64, 50, -30], [-46, 66, -30], [-20, 76, -56]] },
  /* leaves the tower crown in the open, dips behind MAH MATCH's mass, climbs back out to the walkway */
  { id: 'match-relay', tier: 'near', from: 'match-roof', to: 'walkway-hub', speed: 20.5, count: 6, gauge: 0.48, gain: 0.95, phase: 0.37,
    via: [[-12, 66, -100], [-30, 56, -122], [-44, 50, -140]] },
  { id: 'plaza-east-line', tier: 'mid', from: 'relay-east', to: 'crown-e', speed: 13.0, count: 9, gauge: 0.62, gain: 0.88, phase: 0.61,
    via: [[86, 60, -92], [96, 86, -150], [110, 104, -206]] },
  { id: 'walkway-uplink', tier: 'mid', from: 'walkway-hub', to: 'crown-nw', speed: 23.5, count: 9, gauge: 0.6, gain: 0.9, phase: 0.18,
    via: [[-58, 74, -178], [-64, 98, -214], [-70, 118, -252]] },
  /* the trunk: crown to crown across the district, passing behind the midground blocks */
  { id: 'district-trunk', tier: 'mid', from: 'crown-w', to: 'crown-e', speed: 18.0, count: 12, gauge: 0.78, gain: 0.8, phase: 0.79,
    via: [[-64, 78, -234], [0, 74, -224], [64, 84, -234]] }
];

/* ---- FOBLOWS: broad, faint, slow flows that follow the district's surfaces ---------------- */
const FLOWS = [
  { width: 26, opacity: 0.062, drift: 0.031, pts: [[-64, 12, 66], [-80, 26, 12], [-90, 44, -58], [-92, 56, -126], [-86, 50, -198]] },
  { width: 20, opacity: 0.055, drift: 0.023, pts: [[60, 12, 66], [76, 24, 10], [90, 38, -56], [98, 46, -124], [104, 42, -186]] },
  { width: 34, opacity: 0.048, drift: 0.017, pts: [[-150, 58, -150], [-70, 70, -186], [20, 74, -200], [110, 64, -176], [170, 50, -140]] }
];

const SEG = 128;            /* cached samples per route (arc-length spaced) */
/* v5 §10: MANY more FOBEAMs, each far THINNER and SMALLER than v4's five fat arcs. One beam is now a
   hairline; what carries the composition is the DENSITY of them and the fact that no two are in phase.
   Tessellation falls with distance so 40 routes cost less than v4's five did.
     near  over and around the plaza — the ones a viewer can follow packet by packet
     mid   across the district, between crowns and hubs
     far   the distant energy field: hundreds of metres out, sub-pixel-thin, no outer field  */
const TIER = {
  near: { railR: 0.085, fieldR: 0.72, ts: 84, rs: 5, fts: 34, frs: 5, rail: 0.62, field: 0.085, packet: 1.0 },
  mid:  { railR: 0.115, fieldR: 0.95, ts: 66, rs: 5, fts: 28, frs: 5, rail: 0.5,  field: 0.062, packet: 0.72 },
  far:  { railR: 0.46,  fieldR: 0,    ts: 20, rs: 4, fts: 0,  frs: 0, rail: 0.17, field: 0, packet: 0.34 }
};
/* THE DISTANT MAHGIC FIELD (§11): far routes are generated along a band arcing across the sky, denser
   toward its middle, so together they read as one luminous river of energy — the Milky Way of a world
   whose infrastructure IS light — rather than as thirty separate drawn lines. */
const FAR_ROUTES = 30;

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function smoothstep(e0, e1, x) { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* concatenate geometries into one static BufferGeometry, keeping only the named attributes */
function mergeGeos(list, attrs) {
  const parts = []; let count = 0;
  for (const g of list) { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); parts.push(n); count += n.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  for (const name of attrs) {
    const size = name === 'uv' ? 2 : 3, arr = new Float32Array(count * size);
    let o = 0;
    for (const n of parts) { const a = n.attributes[name], c = n.attributes.position.count; if (a) arr.set(a.array.subarray(0, c * size), o * size); o += c; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  parts.forEach(n => n.dispose());
  return out;
}

/* a soft radial glow — the travelling light and the arrival brightening share it */
function glowTexture() {
  return canvasTexture(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(226,240,255,0.72)');
    g.addColorStop(0.55, 'rgba(150,196,255,0.18)'); g.addColorStop(1, 'rgba(90,150,235,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  });
}

export function buildFobeams(ctx) {
  const scene = ctx.scene, M = ctx.M || {};
  const theme = ctx.theme || M.theme || { energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 };
  const group = new THREE.Group(); group.name = 'fobeams';
  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const R = rng(90210);

  /* ---- retire the legacy sky beams -------------------------------------------------------
     Preferred: the assembly hands us the sky module as ctx.sky and we hide its `beams` and
     `flows`. Fallback (no assembly change needed): find the group named 'sky' and hide only
     its additive tube meshes and its double-sided additive ribbons — exactly the old FOBEAM /
     FOBLOW set. Everything hidden is remembered and restored in dispose(). */
  const retired = [];
  (function retireLegacy() {
    const hide = o => { if (o && o.visible !== false) { o.visible = false; retired.push(o); } };
    const sky = ctx.sky;
    if (sky && (sky.beams || sky.flows)) {
      (sky.beams || []).forEach(b => { hide(b.core); hide(b.glow); });
      (sky.flows || []).forEach(hide);
      return;
    }
    const g = scene && scene.getObjectByName && scene.getObjectByName('sky');
    if (!g) return;
    g.children.forEach(o => {
      if (!o.isMesh || !o.material || o.material.blending !== THREE.AdditiveBlending) return;
      const type = o.geometry && o.geometry.type;
      if (type === 'TubeGeometry') hide(o);                                   /* the two arcs: core + glow */
      else if (type === 'BufferGeometry' && o.material.side === THREE.DoubleSide) hide(o);   /* the three ribbons */
    });
  })();

  /* ---- materials (all mine; nothing shared is mutated) ----------------------------------- */
  const railMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const fieldMat = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const packetMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const glowTex = glowTexture(); owned.textures.push(glowTex);
  const lightMat = new THREE.MeshBasicMaterial({ map: glowTex, color: theme.energy, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const arriveMat = new THREE.MeshBasicMaterial({ map: glowTex, color: theme.energyLight, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const flowMat = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
  railMat.name = 'fobeam-rail'; fieldMat.name = 'fobeam-field'; packetMat.name = 'fobeam-packet';
  lightMat.name = 'fobeam-light'; arriveMat.name = 'fobeam-arrival'; flowMat.name = 'foblow';
  owned.materials.push(railMat, fieldMat, packetMat, lightMat, arriveMat, flowMat);
  const structuralMat = M.trimSatin || M.trim || M.platinum || new THREE.MeshStandardMaterial({ color: 0x8593a8, roughness: 0.36, metalness: 0.9 });
  const headMat = M.energyLight || new THREE.MeshStandardMaterial({ color: 0x0a0f18, emissive: theme.energyLight, emissiveIntensity: 1.7, roughness: 0.5, metalness: 0 });
  if (!M.trimSatin && !M.trim && !M.platinum) owned.materials.push(structuralMat);
  if (!M.energyLight) owned.materials.push(headMat);

  /* ---- routes: curves, cached samples, rail + field geometry ------------------------------ */
  const routes = [];
  const railParts = [], fieldParts = [];
  const nodeIndex = {}, nodeList = [];
  Object.keys(NODES).forEach((k, i) => { nodeIndex[k] = i; nodeList.push(Object.assign({ id: k, flash: 0 }, NODES[k])); });

  /* ---- the distant MAHGIC field: FAR_ROUTES generated along one band across the sky --------
     Bearing runs the width of the visible sky; the band's height is a smooth arc peaking behind the
     district, so density is highest where the eye already is. Each route is short relative to its
     radius, carries several tiny packets, and has its own speed, phase and direction. Deterministic. */
  const FR = rng(31337);
  const band = (u, jitter) => {
    const bearing = (-24 + 228 * u) * Math.PI / 180;
    const r = 380 + FR() * 330;
    const y = 78 + 232 * Math.sin(Math.PI * u) + (jitter ? (FR() - 0.5) * 96 : 0);
    return [Math.cos(bearing) * r, y, -Math.sin(bearing) * r];
  };
  const farRoutes = [];
  for (let i = 0; i < FAR_ROUTES; i++) {
    const u0 = (i + FR() * 0.7) / FAR_ROUTES, u1 = Math.min(1, u0 + 0.03 + FR() * 0.09);
    const a = band(u0, true), b = band(u1, true);
    /* the mid point is pushed off the chord by a signed amount that is sometimes almost nothing: a third
       of the field runs nearly straight, so the sky is not thirty matching arches */
    const bow = (FR() - 0.42) * 130;
    const mid = [(a[0] + b[0]) / 2 * (0.9 + FR() * 0.2), (a[1] + b[1]) / 2 + bow, (a[2] + b[2]) / 2 * (0.9 + FR() * 0.2)];
    farRoutes.push({
      id: 'mahgic-field-' + i, tier: 'far', p0: a, p1: b, via: [mid],
      speed: 34 + FR() * 46, count: 3 + Math.floor(FR() * 4), gauge: 1.2 + FR() * 1.5,
      gain: 0.2 + FR() * FR() * 0.62, phase: FR(), reverse: FR() < 0.5
    });
  }
  const ALL = ROUTES.concat(farRoutes);

  ALL.forEach((spec, ri) => {
    const T = TIER[spec.tier || 'mid'];
    const a = spec.p0 ? { p: spec.p0 } : NODES[spec.from], b = spec.p1 ? { p: spec.p1 } : NODES[spec.to];
    const pts = [new THREE.Vector3(...a.p)].concat(spec.via.map(v => new THREE.Vector3(...v)), [new THREE.Vector3(...b.p)]);
    if (spec.reverse) pts.reverse();
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    /* cache the path ONCE: arc-length spaced points and their tangents. update() only interpolates. */
    const sample = curve.getSpacedPoints(SEG);
    const px = new Float32Array((SEG + 1) * 3), tx = new Float32Array((SEG + 1) * 3);
    for (let i = 0; i <= SEG; i++) { px[i * 3] = sample[i].x; px[i * 3 + 1] = sample[i].y; px[i * 3 + 2] = sample[i].z; }
    for (let i = 0; i <= SEG; i++) {
      const i0 = Math.max(0, i - 1) * 3, i1 = Math.min(SEG, i + 1) * 3;
      let dx = px[i1] - px[i0], dy = px[i1 + 1] - px[i0 + 1], dz = px[i1 + 2] - px[i0 + 2];
      const l = Math.hypot(dx, dy, dz) || 1; tx[i * 3] = dx / l; tx[i * 3 + 1] = dy / l; tx[i * 3 + 2] = dz / l;
    }
    const len = curve.getLength();
    routes.push({ id: spec.id, tier: spec.tier || 'mid', curve, px, tx, len, speed: spec.speed, gauge: spec.gauge, gain: spec.gain, pgain: T.packet, from: nodeIndex[spec.from], to: nodeIndex[spec.to], count: spec.count, phase: spec.phase });

    /* RAIL — a hairline, bright, faded at both ends by vertex colour */
    const rail = new THREE.TubeGeometry(curve, T.ts, T.railR, T.rs, false);
    const railK = T.rail / TIER.near.rail;   /* the far tier is dimmer as well as thinner */
    paintTube(rail, T.ts, T.rs, u => railK * spec.gain * (0.80 + 0.20 * Math.sin(Math.PI * u)) * smoothstep(0, 0.05, u) * smoothstep(0, 0.05, 1 - u));
    railParts.push(rail);
    /* OUTER FIELD — soft, swelling in the middle of the run; the far tier carries none */
    if (T.fieldR > 0) {
      const field = new THREE.TubeGeometry(curve, T.fts, T.fieldR, T.frs, false);
      const fieldK = T.field / TIER.near.field;
      paintTube(field, T.fts, T.frs, u => fieldK * spec.gain * (0.45 + 0.55 * Math.sin(Math.PI * u)) * smoothstep(0, 0.12, u) * smoothstep(0, 0.12, 1 - u));
      fieldParts.push(field);
    }
  });
  function paintTube(geo, ts, rs, fn) {
    const n = geo.attributes.position.count, col = new Float32Array(n * 3), stride = rs + 1;
    for (let v = 0; v < n; v++) { const c = fn(Math.floor(v / stride) / ts); col[v * 3] = c; col[v * 3 + 1] = c; col[v * 3 + 2] = c; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const railGeo = own(mergeGeos(railParts, ['position', 'color']));
  const fieldGeo = own(mergeGeos(fieldParts, ['position', 'color']));
  const railMesh = new THREE.Mesh(railGeo, railMat); railMesh.renderOrder = 6; railMesh.frustumCulled = false; group.add(railMesh);
  const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat); fieldMesh.renderOrder = 5; fieldMesh.frustumCulled = false; group.add(fieldMesh);

  /* ---- packets: ONE instanced square diamond for every route ------------------------------ */
  const packets = [];
  routes.forEach((r, ri) => {
    for (let i = 0; i < r.count; i++) {
      /* the jitter is a full slot wide, so packets on one route are never evenly spaced and the world
         never falls into a marching rhythm — asynchrony is the point (§10) */
      const jitter = (R() - 0.5) * 0.9 / r.count;
      packets.push({
        r: ri,
        s: ((i / r.count + r.phase + jitter) % 1 + 1) % 1 * r.len,
        speed: r.speed * (0.82 + R() * 0.4),           /* no two packets share a speed, even on one route */
        size: (0.5 + R() * 0.6) * r.gauge,
        gain: (0.72 + R() * 0.34) * r.pgain,   /* a distant packet is a spark, not a lamp */
        b: 0
      });
    }
  });
  const N = packets.length;
  const diamondGeo = own(new THREE.OctahedronGeometry(1, 0));      /* square rotated 45° in its own plane, thin in Z */
  const packetMesh = new THREE.InstancedMesh(diamondGeo, packetMat, N);
  packetMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  packetMesh.renderOrder = 7; packetMesh.frustumCulled = false; group.add(packetMesh);
  const lightGeo = own(new THREE.PlaneGeometry(1, 1));
  const lightMesh = new THREE.InstancedMesh(lightGeo, lightMat, N);
  lightMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  lightMesh.renderOrder = 8; lightMesh.frustumCulled = false; group.add(lightMesh);
  const grey = new THREE.Color(1, 1, 1);
  for (let i = 0; i < N; i++) { packetMesh.setColorAt(i, grey); lightMesh.setColorAt(i, grey); }

  /* ---- receivers: mast / roof node / crown, plus the arrival brightening ------------------- */
  const structParts = [];
  const headGeo = own(new THREE.OctahedronGeometry(1, 0));
  const headMesh = new THREE.InstancedMesh(headGeo, headMat, nodeList.length);
  const arriveGeo = own(new THREE.PlaneGeometry(1, 1));
  const arriveMesh = new THREE.InstancedMesh(arriveGeo, arriveMat, nodeList.length);
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _pv = new THREE.Vector3(), _sv = new THREE.Vector3();
  nodeList.forEach((n, i) => {
    const [bx, by, bz] = n.base, top = n.p[1], h = Math.max(1.2, top - by);
    /* a slim tapered shaft, one or two collars, and a chamfered square-diamond housing at the head */
    const shaft = new THREE.CylinderGeometry(0.2, n.kind === 'mast' ? 0.5 : 0.34, h, 6, 1, false);
    shaft.translate(bx, by + h / 2, bz); structParts.push(shaft);
    if (n.kind !== 'mast') { const plinth = chamferBox(2.1, 0.5, 2.1, 0.1); plinth.translate(bx, by + 0.25, bz); structParts.push(plinth); }
    const collarY = [by + h * 0.52].concat(n.kind === 'mast' ? [by + h * 0.86] : []);
    collarY.forEach(y => { const c = chamferBox(1.05, 0.16, 1.05, 0.05); c.translate(bx, y, bz); structParts.push(c); });
    const housing = chamferBox(1.55, 1.55, 0.34, 0.14); housing.rotateZ(Math.PI / 4); housing.translate(bx, top, bz); structParts.push(housing);
    /* the beacon diamond and its arrival glow, both face the plaza */
    _e.set(0, 0, 0); _q.setFromEuler(_e);
    _m4.compose(_pv.set(n.p[0], n.p[1], n.p[2]), _q, _sv.set(0.62, 0.62, 0.2));
    headMesh.setMatrixAt(i, _m4);
    _m4.compose(_pv.set(n.p[0], n.p[1], n.p[2] + 0.35), _q, _sv.set(5.2, 5.2, 1));
    arriveMesh.setMatrixAt(i, _m4);
    arriveMesh.setColorAt(i, grey);
  });
  headMesh.instanceMatrix.needsUpdate = true; arriveMesh.instanceMatrix.needsUpdate = true;
  headMesh.renderOrder = 4; arriveMesh.renderOrder = 8; arriveMesh.frustumCulled = false;
  const structGeo = own(mergeGeos(structParts, ['position', 'normal']));
  const structMesh = new THREE.Mesh(structGeo, structuralMat); structMesh.name = 'fobeam-receivers';
  group.add(structMesh, headMesh, arriveMesh);

  /* ---- FOBLOWS: broad faint ribbons that follow the district's surfaces -------------------- */
  const flowMeshes = [];
  FLOWS.forEach((f, fi) => {
    const curve = new THREE.CatmullRomCurve3(f.pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
    const n = 60, pos = new Float32Array((n + 1) * 2 * 3), col = new Float32Array((n + 1) * 2 * 3), idx = [];
    const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), pt = new THREE.Vector3(), tan = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const t = i / n; curve.getPointAt(t, pt); curve.getTangentAt(t, tan);
      side.crossVectors(tan, up).normalize();
      const w = f.width * (0.32 + 0.68 * Math.sin(Math.PI * t)) * 0.5;
      const c = smoothstep(0, 0.16, t) * smoothstep(0, 0.16, 1 - t) * (0.6 + 0.4 * Math.sin(Math.PI * t));
      pos.set([pt.x + side.x * w, pt.y + side.y * w, pt.z + side.z * w, pt.x - side.x * w, pt.y - side.y * w, pt.z - side.z * w], i * 6);
      col.set([c, c, c, c * 0.72, c * 0.72, c * 0.72], i * 6);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = own(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    const mat = flowMat.clone(); mat.opacity = f.opacity; owned.materials.push(mat);
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 3; mesh.userData.base = f.opacity; mesh.userData.drift = f.drift; mesh.userData.phase = fi * 2.1;
    group.add(mesh); flowMeshes.push(mesh);
  });

  if (scene && !group.parent) scene.add(group);

  /* ---- animation ------------------------------------------------------------------------- */
  let dim = 1;                       /* time-of-day multiplier: 1 at night, 0.3 by day */
  let lastT = -1, driven = false, selfT = 0;
  const base = { rail: 0.5, field: 0.1, packet: 0.9, light: 0.5, arrive: 0.6 };
  const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _view = new THREE.Vector3();
  const _nrm = new THREE.Vector3(), _bin = new THREE.Vector3(), _mat = new THREE.Matrix4(), _camPos = new THREE.Vector3(0.6, 3, 42);
  const state = { pos: new Float32Array(N * 3), tan: new Float32Array(N * 3) };

  function sampleAt(r, s, outP, outT) {
    const u = clamp01(s / r.len) * SEG, i0 = Math.min(SEG - 1, Math.floor(u)), f = u - i0, a = i0 * 3, b = a + 3;
    outP.set(r.px[a] + (r.px[b] - r.px[a]) * f, r.px[a + 1] + (r.px[b + 1] - r.px[a + 1]) * f, r.px[a + 2] + (r.px[b + 2] - r.px[a + 2]) * f);
    outT.set(r.tx[a] + (r.tx[b] - r.tx[a]) * f, r.tx[a + 1] + (r.tx[b + 1] - r.tx[a + 1]) * f, r.tx[a + 2] + (r.tx[b + 2] - r.tx[a + 2]) * f).normalize();
  }

  /* advance the packets and the receivers; no allocation, no geometry touched */
  function step(t, dt) {
    if (t === lastT) return;                 /* the module is safe to drive twice in one frame */
    lastT = t;
    dt = dt > 0 ? Math.min(dt, 0.1) : 0.016;
    for (let i = 0; i < N; i++) {
      const pk = packets[i], r = routes[pk.r];
      pk.s += pk.speed * dt;
      if (pk.s >= r.len) {                   /* transfer: the destination brightens, the origin sends again */
        pk.s -= r.len;
        if (r.to != null && nodeList[r.to]) nodeList[r.to].flash = 1;
        if (r.from != null && nodeList[r.from]) nodeList[r.from].flash = Math.max(nodeList[r.from].flash, 0.55);
      }
      sampleAt(r, pk.s, _p, _t);
      state.pos[i * 3] = _p.x; state.pos[i * 3 + 1] = _p.y; state.pos[i * 3 + 2] = _p.z;
      state.tan[i * 3] = _t.x; state.tan[i * 3 + 1] = _t.y; state.tan[i * 3 + 2] = _t.z;
      /* enter → travel → transfer: brightness rises through the middle and fades at both ends */
      const u = pk.s / r.len;
      pk.b = pk.gain * (0.5 + 0.5 * Math.sin(Math.PI * u)) * smoothstep(0, 0.09, u) * smoothstep(0, 0.09, 1 - u);
      packetMesh.instanceColor.setXYZ(i, pk.b, pk.b, pk.b);
      const lb = pk.b * 0.85;
      lightMesh.instanceColor.setXYZ(i, lb, lb, lb);
    }
    packetMesh.instanceColor.needsUpdate = true; lightMesh.instanceColor.needsUpdate = true;
    /* receivers: a brief local brightening (~0.4 s), never an explosion */
    let any = false;
    for (let i = 0; i < nodeList.length; i++) {
      const n = nodeList[i];
      if (n.flash > 0) { n.flash = Math.max(0, n.flash - dt / 0.42); any = true; }
      const v = n.flash * n.flash * 0.9 + 0.06;
      arriveMesh.instanceColor.setXYZ(i, v, v, v);
    }
    if (any || arriveMesh.instanceColor.version === 0) arriveMesh.instanceColor.needsUpdate = true;
    /* the flows breathe, very slowly and out of phase with each other */
    for (let i = 0; i < flowMeshes.length; i++) {
      const m = flowMeshes[i];
      m.material.opacity = m.userData.base * dim * (0.82 + 0.18 * Math.sin(t * m.userData.drift + m.userData.phase));
    }
  }

  /* orient every packet: the long axis follows the path, the roll is billboarded so the
     diamond never reads as an edge-on sliver. Done at render time, where the camera is known. */
  function orient(camera) {
    if (camera && camera.isCamera) _camPos.setFromMatrixPosition(camera.matrixWorld);
    for (let i = 0; i < N; i++) {
      const pk = packets[i], a = i * 3;
      _p.set(state.pos[a], state.pos[a + 1], state.pos[a + 2]);
      _t.set(state.tan[a], state.tan[a + 1], state.tan[a + 2]);
      _view.subVectors(_p, _camPos).normalize();
      const d = _view.dot(_t);
      _nrm.copy(_view).addScaledVector(_t, -d);
      if (_nrm.lengthSq() < 1e-5) { _nrm.set(0, 1, 0).addScaledVector(_t, -_t.y); if (_nrm.lengthSq() < 1e-5) _nrm.set(0, 0, 1); }
      _nrm.normalize().negate();                       /* the diamond's plane faces the camera */
      _bin.crossVectors(_nrm, _t).normalize();
      const s = pk.size;
      _mat.set(
        _t.x * s * 1.18, _bin.x * s, _nrm.x * s * 0.26, _p.x,
        _t.y * s * 1.18, _bin.y * s, _nrm.y * s * 0.26, _p.y,
        _t.z * s * 1.18, _bin.z * s, _nrm.z * s * 0.26, _p.z,
        0, 0, 0, 1
      );
      packetMesh.setMatrixAt(i, _mat);
      const L = s * 5.4, W = s * 2.3;                  /* the travelling light: an elongated ellipse on the path */
      _mat.set(
        _t.x * L, _bin.x * W, _nrm.x, _p.x,
        _t.y * L, _bin.y * W, _nrm.y, _p.y,
        _t.z * L, _bin.z * W, _nrm.z, _p.z,
        0, 0, 0, 1
      );
      lightMesh.setMatrixAt(i, _mat);
    }
    packetMesh.instanceMatrix.needsUpdate = true; lightMesh.instanceMatrix.needsUpdate = true;
  }
  /* if the assembly never calls update(), the motion still runs — but only while frames are
     actually drawn, so a reduced-motion session stays still */
  packetMesh.onBeforeRender = function (renderer, sc, camera) {
    if (!driven) { const now = performance.now() / 1000; const d = selfT ? now - selfT : 0.016; selfT = now; step(now, d); }
    orient(camera);
  };

  /* ---- contract surface ------------------------------------------------------------------ */
  function setTime(clockState) {
    const day = clockState && typeof clockState.daylight === 'number' ? clamp01(clockState.daylight) : 0;
    dim = 1 - 0.7 * day;                               /* full at night, ×0.3 by day */
    railMat.opacity = base.rail * dim;
    fieldMat.opacity = base.field * dim;
    packetMat.opacity = base.packet * dim;
    lightMat.opacity = base.light * dim;
    arriveMat.opacity = base.arrive * dim;
    flowMeshes.forEach(m => { m.material.opacity = m.userData.base * dim; });
    return dim;
  }
  function setTheme(t) {
    if (!t) return t;
    /* the world Theme owns beam colour — and only beam colour; it never reaches a resident */
    railMat.color.setHex(t.energyLight); packetMat.color.setHex(t.energyLight); arriveMat.color.setHex(t.energyLight);
    fieldMat.color.setHex(t.energy); lightMat.color.setHex(t.energy);
    flowMeshes.forEach(m => m.material.color.setHex(t.energy));
    return t;
  }
  function update(t, dt) { driven = true; step(t, dt); }

  function dispose() {
    retired.forEach(o => { o.visible = true; }); retired.length = 0;
    const i = (ctx.timeHooks || []).indexOf(timeHook); if (i > -1) ctx.timeHooks.splice(i, 1);
    packetMesh.onBeforeRender = function () {};
    if (group.parent) group.parent.remove(group);
    packetMesh.dispose(); lightMesh.dispose(); headMesh.dispose(); arriveMesh.dispose();
    owned.geometries.forEach(g => g.dispose());
    owned.materials.forEach(m => m.dispose());
    owned.textures.forEach(t => t.dispose());
  }

  /* time is the one thing the world may change without knowing about us */
  const timeHook = s => setTime(s);
  if (ctx.timeHooks && ctx.timeHooks.push) ctx.timeHooks.push(timeHook);
  try { setTime(ctx.clock && ctx.clock.state ? ctx.clock.state() : { daylight: 0 }); } catch (e) { setTime({ daylight: 0 }); }
  setTheme(theme);
  step(0, 0.016); orient(null);

  const tierCount = t => routes.filter(r => r.tier === t).length;
  const stats = {
    routes: routes.filter(r => r.from != null).map(r => ({ id: r.id, tier: r.tier, from: nodeList[r.from].id, to: nodeList[r.to].id, length: Math.round(r.len), speed: r.speed, packets: r.count })),
    tiers: { near: tierCount('near'), mid: tierCount('mid'), far: tierCount('far') },
    routeCount: routes.length,
    packets: N,
    receivers: nodeList.length,
    flows: flowMeshes.length,
    drawCalls: 2 + 2 + 3 + flowMeshes.length,          /* rail, field | packets, lights | receivers ×3 | flows */
    triangles: routes.reduce((n, r) => { const T = TIER[r.tier]; return n + T.ts * T.rs * 2 + T.fts * T.frs * 2; }, 0) + N * 10 + nodeList.length * 90 + flowMeshes.length * 120,
    legacyHidden: retired.length
  };
  return { group, setTime, setTheme, update, dispose, stats, routes: stats.routes };
}
