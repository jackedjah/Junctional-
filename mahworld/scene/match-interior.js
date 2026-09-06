/* MAHPLAZA :: MAH MATCH INTERIOR (v4)

   The engineered combat hall behind the MAH MATCH glass. Everything here is
   room-local: the floor is y = 0, the entrance glass is just in front of z = 0,
   the hall runs to z = -roomD. The facade already built the flat floor / wall /
   ceiling slabs; this module layers the hall on top of them:

     platform   square-diamond fighting platform (rubber top, polished edge band,
                lower apron ring, inset energy boundary + the single red inner line,
                corner pylons with light heads)
     perimeter  rubber field, service lane, barrier rails on the spectator sides
     seating    three chamfered tiers per side with step lights and a front handrail
     overhead   lighting truss with four luminaires, coffered ceiling, light strips
     display    a structural frame above the far side holding the boundary graphic
                (geometry only: no scores, no names, no text)
     entrance   two recessed display frames flanking the door that HOST the
                FIND AN OPPONENT / PRACTICE WITH A BUDDY panels (actionMounts)
     training   two bays at the back with rubber pads, padded striking posts and
                an equipment recess in each side wall
     walls      protection band, panel courses, pilasters, one light seam per side
     threshold  an inner portal frame just inside the glass

   Materials come from ctx.M only. Static geometry is merged into one mesh per
   (material, shadow flags); repeats are instanced. Nothing allocates per frame. */
import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, windowGrid, canvasTexture } from './materials.js';

const HALF = Math.PI / 2, D45 = Math.PI / 4;
const CAST = 1, RECV = 2;

/* ---- matrices ------------------------------------------------------------- */
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1);
function at(x, y, z, ry = 0, rx = 0, rz = 0) { _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); return new THREE.Matrix4().compose(_p, _q, _s); }
function mul(a, b) { return new THREE.Matrix4().multiplyMatrices(a, b); }

/* ---- merge helper: many small parts → one BufferGeometry per (material, flags) --- */
class Merger {
  constructor() { this.buckets = new Map(); this.geos = new Map(); }
  box(w, h, d) { return this._geo('b' + w + ',' + h + ',' + d, () => new THREE.BoxGeometry(w, h, d)); }
  cbox(w, h, d, c = 0.04) { return this._geo('c' + w + ',' + h + ',' + d + ',' + c, () => chamferBox(w, h, d, c)); }
  /* A COPING — the same chamfered box extruded VERTICALLY (buildings.js carries the identical helper
     and the identical reason, law 6). chamferBox wraps its chamfer round the FRONT and BACK of a
     member and leaves the two arrises that run with the extrusion square, which is right for anything
     read face-on and wrong for anything read against the ceiling or from above: a cap, a deck, a
     light head. Turned, the chamfer wraps the whole PLAN outline instead, for the same 28 triangles
     and the same bounding box, so nothing already dimensioned off these members moves. */
  cop(w, h, d, c = 0.04) { return this._geo('p' + w + ',' + h + ',' + d + ',' + c, () => chamferBox(w, d, h, c).rotateX(-HALF)); }
  _geo(key, make) { let g = this.geos.get(key); if (!g) { g = make(); this.geos.set(key, g); } return g; }
  add(mat, geo, matrix, flags = 0) {
    const key = mat.uuid + ':' + flags;
    let b = this.buckets.get(key); if (!b) { b = { mat, flags, parts: [] }; this.buckets.set(key, b); }
    b.parts.push([geo, matrix]);
  }
  /* a bar of length `len` along x (or z when alongZ), chamfered on its long faces */
  bar(mat, len, h, w, x, y, z, alongZ = false, c = 0.02, flags = 0) { this.add(mat, this.cbox(len, h, w, c), at(x, y, z, alongZ ? HALF : 0), flags); }
  flush(parent) {
    const meshes = [];
    this.buckets.forEach(b => {
      const m = new THREE.Mesh(mergeParts(b.parts), b.mat);
      m.castShadow = !!(b.flags & CAST); m.receiveShadow = !!(b.flags & RECV);
      m.matrixAutoUpdate = false; m.name = 'merged:' + (b.mat.name || b.mat.uuid.slice(0, 6));
      parent.add(m); meshes.push(m);
    });
    this.geos.forEach(g => g.dispose()); this.geos.clear(); this.buckets.clear();
    return meshes;
  }
}
function mergeParts(parts) {
  const items = []; let count = 0;
  for (const [geo, m] of parts) { const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m); items.push(g); count += g.attributes.position.count; }
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let o = 0;
  for (const g of items) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += n; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

/* A square-diamond ring of outer side `size` and width `w` in the XZ plane, centred (cx, cz) at height y.
   Four thin bars: the pair on the ±x edges runs the full side, the other pair fits between them,
   so no two bars overlap (no coplanar fighting at the corners). */
function ring(B, mat, size, w, thick, y, cx, cz, flags = 0) {
  const hi = size / 2 - w / 2, D = at(cx, y, cz, D45);
  for (let i = 0; i < 4; i++) {
    const a = i * HALF, len = i % 2 === 0 ? size : size - 2 * w;
    B.add(mat, B.box(len, thick, w), mul(D, at(Math.cos(a) * hi, 0, Math.sin(a) * hi, HALF - a)), flags);
  }
}

/* THE MITRE (law 6, and the same construction buildings.js uses on the sign surrounds and on MAH
   MATCH's portal frame). Four bars butted round an opening make four square corners; stopping each
   bar `k` short and running a fifth across the corner at 45° replaces that arris with a THIRD PLANE
   lit differently from both — more crystalline, not less, which is the distinction §06 is drawing.
   The length k·√2 and the set-back k/2 + bar/(2√2) − bar/2 are the one pair that lands the mitre's
   outer face exactly on the two shortened ends: longer, and the bar projects past the frame as a
   diagonal spike, which is the defect rather than the fix. The outer envelope (hw + bar/2,
   hh + bar/2) is unchanged, so nothing dimensioned off the frame moves. */
function mitreFrame(B, mat, o, flags = 0) {
  const { x = 0, y = 0, z = 0, hw, hh, bar, depth, c = 0.04, k, cill = true } = o;
  const b2 = bar / 2, kk = Math.min(k, hh + b2 - 0.05, hw + b2 - 0.05);
  B.add(mat, B.cbox(2 * (hw + b2 - kk), bar, depth, c), at(x, y + hh, z), flags);
  if (cill) B.add(mat, B.cbox(2 * (hw + b2 - kk), bar, depth, c), at(x, y - hh, z), flags);
  for (const sx of [-1, 1]) B.add(mat, B.cbox(bar, 2 * (hh + b2 - kk), depth, c), at(x + sx * hw, y, z), flags);
  const inset = kk / 2 + bar / (2 * Math.SQRT2) - b2;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    if (sy < 0 && !cill) continue;
    B.add(mat, B.cbox(kk * Math.SQRT2, bar, depth, c), at(x + sx * (hw - inset), y + sy * (hh - inset), z, 0, 0, -sx * sy * D45), flags);
  }
}

/* the display graphic: the arena boundary as a square-diamond outline on a horizontal datum. No text. */
function drawDisplay(c, w, h) {
  c.fillStyle = '#0a0f17'; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(160,190,230,0.14)'; c.lineWidth = 2; c.strokeRect(14, 14, w - 28, h - 28);
  c.strokeStyle = 'rgba(223,241,255,0.55)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(60, h / 2); c.lineTo(w - 60, h / 2); c.stroke();
  [60, w - 60].forEach(x => { c.beginPath(); c.moveTo(x, h / 2 - 14); c.lineTo(x, h / 2 + 14); c.stroke(); });
  const s = h * 0.32;
  c.save(); c.translate(w / 2, h / 2); c.rotate(Math.PI / 4);
  c.fillStyle = '#0a0f17'; c.fillRect(-s - 6, -s - 6, 2 * s + 12, 2 * s + 12);
  c.lineWidth = 5; c.strokeStyle = 'rgba(232,242,255,0.95)'; c.strokeRect(-s, -s, 2 * s, 2 * s);
  c.lineWidth = 2; c.strokeStyle = 'rgba(232,242,255,0.5)'; c.strokeRect(-s * 0.7, -s * 0.7, 1.4 * s, 1.4 * s);
  c.restore();
}

export function buildMatchInterior(ctx, room, dims) {
  const M = ctx.M;
  const { roomW = 38, roomD = 22, roomH = 15.2, openW = 18 } = dims || {};
  const group = new THREE.Group(); group.name = 'match-interior'; room.add(group);
  const B = new Merger();
  const ownMaterials = [], ownTextures = [];

  /* ---- 1. the fighting platform ----------------------------------------- */
  const PX = 0, PZ = -10, PLAT = 12.0, APRON = 12.8;
  const DIA = at(PX, 0, PZ, D45);
  /* rubber field around the arena zone, and the service lane ring (lighter) around the apron */
  B.add(M.arena, B.box(19.6, 0.016, 17.2), at(PX, 0.008, PZ), RECV);
  ring(B, M.graphiteLight, APRON + 1.2, 0.6, 0.012, 0.022, PX, PZ, RECV);
  /* lower apron ring step (four chamfered bars) */
  { const w = (APRON - PLAT) / 2 + 0.02, hi = APRON / 2 - w / 2;
    for (let i = 0; i < 4; i++) { const a = i * HALF, len = i % 2 === 0 ? APRON : APRON - 2 * w; B.add(M.composite, B.cbox(len, 0.35, w, 0.05), mul(DIA, at(Math.cos(a) * hi, 0.175, Math.sin(a) * hi, HALF - a)), RECV); } }
  /* body, polished edge band (four bars), rubber top exactly at y = 0.8 */
  B.add(M.structural, B.cbox(PLAT, 0.64, PLAT, 0.05), mul(DIA, at(0, 0.32, 0)), RECV);
  { const w = 0.3, hi = PLAT / 2 - w / 2;
    for (let i = 0; i < 4; i++) { const a = i * HALF, len = i % 2 === 0 ? PLAT : PLAT - 2 * w; B.add(M.trim, B.cbox(len, 0.14, w, 0.035), mul(DIA, at(Math.cos(a) * hi, 0.71, Math.sin(a) * hi, HALF - a))); } }
  B.add(M.arena, B.box(PLAT - 0.5, 0.12, PLAT - 0.5), mul(DIA, at(0, 0.74, 0)), RECV);
  /* the inset energy boundary (own clone of energyLight so it can breathe; kept in sync with M each frame)
     and the single red MAH MATCH accent as a thinner inner line */
  const boundMat = M.energyLight.clone(); boundMat.name = 'match-boundary'; ownMaterials.push(boundMat);
  ring(B, boundMat, PLAT - 1.1, 0.07, 0.012, 0.806, PX, PZ);
  ring(B, M.matchRed, PLAT - 1.9, 0.035, 0.012, 0.806, PX, PZ);
  /* pooled light on the mat from the luminaires above: one soft additive plane */
  const poolTex = canvasTexture(256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(0.5, 'rgba(255,255,255,0.32)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  ownTextures.push(poolTex);
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: 0xcfe0ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }); ownMaterials.push(poolMat);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), poolMat); pool.rotation.x = -HALF; pool.position.set(PX, 0.815, PZ); pool.name = 'arena-light-pool'; group.add(pool);
  /* corner pylons at the four diamond tips: plinth, structural pylon, trim cap, light head, inner light slot */
  for (let i = 0; i < 4; i++) {
    const a = i * HALF, r = 8.75, x = PX + Math.cos(a) * r, z = PZ + Math.sin(a) * r;
    B.add(M.composite, B.cbox(0.9, 0.35, 0.9, 0.05), at(x, 0.175, z), RECV);
    B.add(M.structural, B.cbox(0.5, 3.6, 0.5, 0.04), at(x, 0.35 + 1.8, z), CAST | RECV);
    /* the pylon's cap and its light head are the two things in this hall read from BELOW, against a
       lit truss, so both turn on their plan outline (law 6). The head was a raw box: a 34 cm cube of
       emissive with eight square corners at each of the diamond's four tips, which is four little
       spikes of light where the platform's own points already carry the figure. Blunted, it holds a
       highlight on a facet instead of aliasing on an edge — and it is the same emitter, not a new one:
       the mat pool, the boundary ring and the truss below it already answer it. */
    B.add(M.trim, B.cop(0.62, 0.06, 0.62, 0.02), at(x, 3.98, z));
    B.add(M.energyLight, B.cop(0.34, 0.22, 0.34, 0.05), at(x, 4.12, z));
    B.add(M.energyLight, B.box(0.05, 2.2, 0.05), at(x - Math.cos(a) * 0.265, 2.3, z - Math.sin(a) * 0.265));
  }

  /* ---- 2. perimeter rails and seating tiers --------------------------------- */
  const posts = [];
  const post = (x, y0, h, z) => posts.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y0 + h / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)));
  const spectatorSpots = [];
  [-1, 1].forEach(s => {
    /* barrier rail between the lane and the stands: posts every 2 m, top bar, lower bar */
    const rx = s * 9.45;
    for (let z = -16.5; z <= -3.5 + 1e-6; z += 2) post(rx, 0, 1.05, z);
    B.bar(M.trimSatin, 13.3, 0.06, 0.1, rx, 1.08, PZ, true);
    B.bar(M.trimSatin, 13.3, 0.05, 0.06, rx, 0.55, PZ, true, 0.015);
    /* three chamfered tiers with a step light along each front edge */
    for (let t = 0; t < 3; t++) {
      const cx = s * (10.7 + t * 1.6), h = 0.4 + t * 0.4;
      B.bar(M.curb, 12.0, h, 1.6, cx, h / 2, PZ, true, 0.05, CAST | RECV);
      B.add(M.energySoft, B.box(0.05, 0.02, 11.6), at(cx - s * 0.74, h + 0.012, PZ));
    }
    /* handrail at the front of the first tier */
    const hx = s * 10.02;
    for (let z = -16; z <= -4 + 1e-6; z += 3) post(hx, 0.4, 0.95, z);
    B.bar(M.trimSatin, 12.3, 0.06, 0.09, hx, 1.38, PZ, true);
    /* four spectator spots on the second tier, facing the platform */
    [-13, -7].forEach(z => spectatorSpots.push({ position: new THREE.Vector3(s * 12.3, 0.8, z), facing: s < 0 ? HALF : -HALF }));
  });
  const postGeo = chamferBox(0.08, 1.0, 0.08, 0.012);
  const postMesh = new THREE.InstancedMesh(postGeo, M.trimSatin, posts.length);
  posts.forEach((m, i) => postMesh.setMatrixAt(i, m)); postMesh.instanceMatrix.needsUpdate = true; postMesh.name = 'rail-posts'; group.add(postMesh);

  /* ---- 3. overhead: truss, luminaires, coffers, light strips --------------- */
  const TH = 7, TOP = 9.8, BOT = 9.25, CS = 0.14, MID = (TOP + BOT) / 2, WEB = TOP - BOT;
  [-1, 1].forEach(s => {
    [TOP, BOT].forEach(y => { B.bar(M.structural, 2 * TH + CS, CS, CS, PX + s * TH, y, PZ, true, 0.02, CAST); B.bar(M.structural, 2 * TH + CS, CS, CS, PX, y, PZ + s * TH, false, 0.02, CAST); });
    for (let k = 1; k < 8; k++) {
      const u = -TH + k * 1.75;
      B.add(M.structural, B.box(0.07, WEB, 0.07), at(PX + s * TH, MID, PZ + u), CAST);
      B.add(M.structural, B.box(0.07, WEB, 0.07), at(PX + u, MID, PZ + s * TH), CAST);
    }
    for (let k = 0; k < 8; k++) {
      const u = -TH + k * 1.75 + 0.875, dir = k % 2 ? -1 : 1, len = Math.hypot(1.75, WEB), ang = Math.atan2(WEB, 1.75) * dir;
      B.add(M.structural, B.box(0.05, 0.05, len), at(PX + s * TH, MID, PZ + u, 0, ang, 0), CAST);
      B.add(M.structural, B.box(len, 0.05, 0.05), at(PX + u, MID, PZ + s * TH, 0, 0, ang), CAST);
    }
    /* cross beams carrying the luminaires */
    B.bar(M.structural, 2 * TH, 0.12, 0.12, PX, BOT, PZ + s * 5.5, false, 0.02, CAST);
    [-1, 1].forEach(k => {
      const x = PX + k * 5.2, z = PZ + s * 5.5;
      B.add(M.structural, B.cbox(1.6, 0.26, 1.6, 0.04), at(x, BOT - 0.06 - 0.13, z), CAST);
      B.add(M.panelLit, B.box(1.36, 0.03, 1.36), at(x, BOT - 0.06 - 0.26 - 0.015, z));
    });
  });
  /* corner posts of the truss and its hangers to the ceiling */
  [[-TH, -TH], [TH, -TH], [-TH, TH], [TH, TH]].forEach(([dx, dz]) => {
    B.add(M.structural, B.box(CS, WEB + CS, CS), at(PX + dx, MID, PZ + dz), CAST);
    B.add(M.structural, B.box(0.1, roomH - (TOP + CS / 2), 0.1), at(PX + dx, (roomH + TOP + CS / 2) / 2, PZ + dz), CAST);
  });
  [[0, -TH], [0, TH], [-TH, 0], [TH, 0]].forEach(([dx, dz]) => B.add(M.structural, B.box(0.1, roomH - (TOP + CS / 2), 0.1), at(PX + dx, (roomH + TOP + CS / 2) / 2, PZ + dz), CAST));
  /* coffered ceiling: 4 × 3 bays of beams (instanced unit boxes; x-runners 2 cm deeper so crossings never share a face) */
  const beamGeo = new THREE.BoxGeometry(1, 1, 1), beams = [];
  const beam = (len, x, z, alongX, depth) => beams.push(new THREE.Matrix4().compose(new THREE.Vector3(x, roomH - depth / 2, z), new THREE.Quaternion(), new THREE.Vector3(alongX ? len : 0.32, depth, alongX ? 0.32 : len)));
  [-0.32, -roomD / 3, -2 * roomD / 3, -roomD + 0.3].forEach(z => beam(roomW - 0.4, 0, z, true, 0.52));
  [-roomW / 2 + 0.3, -roomW / 4, 0, roomW / 4, roomW / 2 - 0.3].forEach(x => beam(roomD - 0.4, x, -roomD / 2, false, 0.5));
  const beamMesh = new THREE.InstancedMesh(beamGeo, M.composite, beams.length);
  beams.forEach((m, i) => beamMesh.setMatrixAt(i, m)); beamMesh.instanceMatrix.needsUpdate = true; beamMesh.name = 'coffer-beams'; group.add(beamMesh);
  /* two long light strips under the inner z-runners */
  [-roomW / 4, roomW / 4].forEach(x => B.add(M.interior, B.box(0.14, 0.04, roomD - 1.2), at(x, roomH - 0.52, -roomD / 2)));

  /* ---- 4. the display frame above the far side ----------------------------- */
  const DF = { y: 7.2, z: -17.1, w: 10.0, h: 2.4 };
  B.add(M.structural, B.cbox(DF.w, 0.18, 0.3, 0.03), at(PX, DF.y + DF.h / 2 - 0.09, DF.z), CAST);
  B.add(M.structural, B.cbox(DF.w, 0.18, 0.3, 0.03), at(PX, DF.y - DF.h / 2 + 0.09, DF.z), CAST);
  [-1, 1].forEach(s => B.add(M.structural, B.cbox(0.18, DF.h - 0.36, 0.3, 0.03), at(PX + s * (DF.w / 2 - 0.09), DF.y, DF.z), CAST));
  B.add(M.graphiteDark, B.box(DF.w - 0.3, DF.h - 0.3, 0.08), at(PX, DF.y, DF.z - 0.06));
  { const top = DF.y + DF.h / 2, bot = BOT - 0.07; [-4.2, 4.2].forEach(x => B.add(M.structural, B.box(0.1, bot - top, 0.1), at(PX + x, (top + bot) / 2, PZ - TH), CAST)); }
  const dispTex = canvasTexture(960, 200, drawDisplay); ownTextures.push(dispTex);
  const dispMat = new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: true }); ownMaterials.push(dispMat);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(DF.w - 0.4, DF.h - 0.4), dispMat); disp.position.set(PX, DF.y, DF.z - 0.01); disp.name = 'arena-display'; group.add(disp);

  /* ---- 5. entrance action mounts: recessed display frames on pylons -------- */
  const actionMounts = {};
  [['findOpponent', -1], ['practiceBuddy', 1]].forEach(([id, s]) => {
    const cx = s * (openW / 4 + 1.0), cy = 2.75, fz = -1.22, fw = 6.8, fh = 2.4, bar = 0.22, fd = 0.4;
    /* MITRED (law 6). These two frames stand at eye level three metres inside the entrance glass —
       the closest architecture to the camera anywhere in MAH MATCH — and they had four square
       corners each. Cutting them costs one extra bar per corner and no draw call: the whole frame
       is already one merge bucket. */
    mitreFrame(B, M.structural, { x: cx, y: cy, z: fz, hw: fw / 2 - bar / 2, hh: fh / 2 - bar / 2, bar, depth: fd, c: 0.04, k: 0.34 }, CAST);
    const ow = fw - 2 * bar, oh = fh - 2 * bar;
    B.add(M.composite, B.box(ow, oh, 0.05), at(cx, cy, fz - fd / 2 + 0.08));                  /* recess back, face at z ≈ -1.315 */
    const bz = fz + fd / 2 - 0.03;                                                             /* slim polished bezel at the mouth */
    B.add(M.trim, B.box(ow, 0.05, 0.05), at(cx, cy + oh / 2 - 0.025, bz));
    B.add(M.trim, B.box(ow, 0.05, 0.05), at(cx, cy - oh / 2 + 0.025, bz));
    [-1, 1].forEach(k => B.add(M.trim, B.box(0.05, oh - 0.1, 0.05), at(cx + k * (ow / 2 - 0.025), cy, bz)));
    [-2.4, 2.4].forEach(dx => { B.add(M.structural, B.cbox(0.26, 1.6, 0.26, 0.03), at(cx + dx, 0.8, fz), CAST); B.add(M.trimSatin, B.cbox(0.5, 0.05, 0.5, 0.015), at(cx + dx, 0.025, fz)); });
    B.add(M.energySoft, B.box(ow - 0.4, 0.03, 0.04), at(cx, cy - fh / 2 - 0.02, fz + 0.1));
    actionMounts[id] = { position: new THREE.Vector3(cx, cy, fz), normal: new THREE.Vector3(0, 0, 1), width: 6.0, height: 1.8 };
  });

  /* ---- 6. training bays ------------------------------------------------------ */
  const practice = { a: new THREE.Vector3(-8.1, 0.25, -19), b: new THREE.Vector3(-5.9, 0.25, -19), centre: new THREE.Vector3(-7, 0.25, -19), facingA: HALF, facingB: -HALF };
  [-1, 1].forEach(s => {
    const cx = s * 7, cz = -19, PD = at(cx, 0, cz, D45);
    B.add(M.arena, B.cbox(4.8, 0.25, 4.8, 0.04), mul(PD, at(0, 0.125, 0)), RECV);
    ring(B, M.energyLight, 4.4, 0.04, 0.012, 0.256, cx, cz);
    [-1.5, 1.5].forEach(dx => {
      B.add(M.composite, B.cbox(0.35, 2.0, 0.35, 0.04), at(cx + dx, 1.25, cz - 1.5), CAST);
      B.add(M.arena, B.cbox(0.52, 0.9, 0.52, 0.08), at(cx + dx, 1.85, cz - 1.5));
    });
    /* equipment recess in the side wall: a deep surround with a rack of abstract bars */
    const wx = s * (roomW / 2 - 0.1), d = -s;
    B.bar(M.structural, 3.4, 0.16, 0.5, wx + d * 0.25, 3.62, cz, true, 0.03);
    B.bar(M.structural, 3.4, 0.16, 0.5, wx + d * 0.25, 1.38, cz, true, 0.03);
    [-1, 1].forEach(k => B.add(M.structural, B.cbox(0.5, 2.08, 0.16, 0.03), at(wx + d * 0.25, 2.5, cz + k * 1.62)));
    B.add(M.graphiteDark, B.box(0.04, 2.1, 3.1), at(wx + d * 0.13, 2.5, cz));
    for (let k = 0; k < 5; k++) B.add(M.trimSatin, B.box(0.05, 0.05, 2.9), at(wx + d * 0.32, 1.55 + k * 0.45, cz));
    [-1.25, 1.25].forEach(dz => B.add(M.trimSatin, B.box(0.06, 2.2, 0.06), at(wx + d * 0.32, 2.5, cz + dz)));
    for (let j = 0; j < 6; j++) B.add(M.trimSatin, B.box(0.08, 0.5, 0.08), at(wx + d * 0.37, 2.72 + (j % 2) * 0.45, cz - 1.2 + j * 0.48));
  });
  if (ctx.lifeAnchors && ctx.lifeAnchors.pads) {
    /* the right bay is free for ambient life; the left one belongs to the practice preview */
    room.updateWorldMatrix(true, false);
    ctx.lifeAnchors.pads.push({ id: 'match-training-right', position: room.localToWorld(new THREE.Vector3(7, 0.25, -19)), facing: Math.PI, kind: 'training', tier: 'near' });
  }

  /* ---- 7. walls: protection band, panel courses, pilasters, light seams ----- */
  const wallX = roomW / 2 - 0.1, backZ = -roomD + 0.1;
  const grids = [];
  const courses = (opts, x, y, z, ry, seed) => {
    const g = windowGrid(Object.assign({ depth: 0.1, onFraction: 0, material: M.structural, dimTint: 0xffffff, seed }, opts));
    g.position.set(x, y, z); g.rotation.y = ry; g.name = 'wall-courses';
    let st = seed * 7919 + 17; const col = new THREE.Color();
    for (let i = 0; i < g.count; i++) { st = (st * 1664525 + 1013904223) >>> 0; col.setScalar(0.74 + (st / 4294967296) * 0.26); g.setColorAt(i, col); }
    if (g.instanceColor) g.instanceColor.needsUpdate = true;
    group.add(g); grids.push(g); return g;
  };
  const rowsH = 4 * 2.9 + 3 * 0.45, coursesY = 1.5 + rowsH / 2;
  [-1, 1].forEach(s => {
    const x = s * wallX, d = -s;
    B.bar(M.composite, roomD - 0.5, 1.2, 0.16, x + d * 0.08, 0.6, -roomD / 2, true, 0.04);
    B.add(M.energySoft, B.box(0.03, 0.04, roomD - 1.6), at(x + d * 0.14, 1.22, -roomD / 2));
    [-roomD / 3, -2 * roomD / 3].forEach(z => B.add(M.structural, B.cbox(0.3, roomH - 1.2, 0.36, 0.03), at(x + d * 0.15, 1.2 + (roomH - 1.2) / 2, z)));
    courses({ cols: 10, rows: 4, cellW: 1.9, cellH: 2.9, gapX: 0.25, gapY: 0.45 }, x + d * 0.05, coursesY, -roomD / 2, s < 0 ? HALF : -HALF, 3 + s);
  });
  B.bar(M.composite, roomW - 0.5, 1.2, 0.16, 0, 0.6, backZ + 0.08, false, 0.04);
  [-roomW / 4, roomW / 4].forEach(x => B.add(M.structural, B.cbox(0.36, roomH - 1.2, 0.3, 0.03), at(x, 1.2 + (roomH - 1.2) / 2, backZ + 0.15)));
  courses({ cols: 16, rows: 4, cellW: 2.1, cellH: 2.9, gapX: 0.25, gapY: 0.45 }, 0, coursesY, backZ + 0.05, 0, 9);

  /* ---- 8. threshold: inner portal frame just inside the glass --------------- */
  /* MITRED at the head (law 6), and written out rather than passed through mitreFrame because the
     jamb and the head are deliberately different sections (0.5 and 0.6) and the frame stands on the
     floor rather than on a cill. The outer corner stays exactly where it was, at (8.8, 14.1): the
     jamb stops at 13.2, the head at x 7.9, and a 0.9 m mitre closes the corner between them. */
  const TK = 0.9, TX = 8.8, TY = 14.1, TB = 0.6, TI = TB / (2 * Math.SQRT2);
  const TJ = TY - TK;                                     /* the jamb runs from the floor to where the mitre starts */
  [-1, 1].forEach(s => B.add(M.structural, B.cbox(0.5, TJ, 0.5, 0.05), at(s * 8.55, TJ / 2, -0.6), CAST));
  B.add(M.structural, B.cbox(2 * (TX - TK), TB, 0.5, 0.05), at(0, TY - TB / 2, -0.6), CAST);
  [-1, 1].forEach(s => B.add(M.structural, B.cbox(TK * Math.SQRT2, TB, 0.5, 0.05),
    at(s * (TX - TK / 2 - TI), TY - TK / 2 - TI, -0.6, 0, 0, -s * D45), CAST));
  B.add(M.interior, B.box(16.4, 0.03, 0.2), at(0, 13.485, -0.6));
  B.add(M.trimSatin, B.box(17.0, 0.02, 0.5), at(0, 0.01, -0.55));

  /* ---- bake ------------------------------------------------------------------ */
  const merged = B.flush(group);

  /* ---- runtime -------------------------------------------------------------- */
  let dayK = 1;
  function setTime(state) {
    const d = state && typeof state.daylight === 'number' ? state.daylight : 0;
    dayK = 1 - d * 0.5;
    dispMat.color.setScalar(dayK);
    poolMat.opacity = 0.16 * dayK;
  }
  function setTheme() { boundMat.emissive.copy(M.energyLight.emissive); }
  function update(t) {
    /* the boundary breathes slowly (0.08 Hz, ±12 %) and follows the shared energy material's colour and time-of-day strength */
    boundMat.emissive.copy(M.energyLight.emissive);
    boundMat.emissiveIntensity = M.energyLight.emissiveIntensity * (0.88 + 0.12 * Math.sin(t * Math.PI * 2 * 0.08));
  }
  function dispose() {
    room.remove(group);
    group.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    ownMaterials.forEach(m => m.dispose()); ownTextures.forEach(t => t.dispose());
    grids.forEach(g => { if (g.material !== M.structural) g.material.dispose(); });
  }
  setTime(ctx.clock && typeof ctx.clock.state === 'function' ? ctx.clock.state() : null);

  return {
    group,
    arenaLight: new THREE.Vector3(0, 5, -10),
    actionMounts,
    spectatorSpots,
    sparSpots: [{ position: new THREE.Vector3(-2.3, 0.8, -10), facing: HALF }, { position: new THREE.Vector3(2.3, 0.8, -10), facing: -HALF }],
    practice,
    setTime, setTheme, update, dispose,
    stats: { merged: merged.length, instanced: 2 + grids.length }
  };
}
