/* MAHPLAZA :: THE THREE DESTINATIONS
   MAH GYM (left) — a training facility. MAH MATCH (centre, the anchor) — the
   fighting / sparring facility with a visible arena. MAH MARKET (right) — a
   low, welcoming world marketplace. Softer, simpler, engineered architecture:
   broad rounded masses, chamfered corners, restrained square-diamond motifs,
   a few faceted panel regions, recessed glass entrances that reveal enough
   interior to explain the function. Blue-white light only; the single red
   accent belongs to MAH MATCH's competitive identity.

   Each facade is composed, not carved: a full body mass behind, an interior
   room in front of it (open toward the plaza), a glass line across the
   opening, and two piers + a lintel framing it at the front. */
import * as THREE from '../vendor/three/three.module.min.js';
import { softMass, signTexture, diamondOutline, chamferBox, windowGrid } from './materials.js';

/* ---- THE SITE PLAN (v5 §06) ---------------------------------------------------------------------
   The three destinations used to stand shoulder to shoulder on one line, which read as a wall of
   boxes. They are now at three DIFFERENT DEPTHS, at three different scales, with three silhouettes
   a viewer can tell apart from the arrival camera without reading a sign:

     MAH GYM     nearest, left    — BROAD and low, a long curved glazed canopy over the frontage
     MAH MARKET  midground, right — CIVIC and terraced, receding roof terraces with rails
     MAH MATCH   furthest, centre — DOMINANT and vertical, a tower rising far above both

   Ground aprons, plaza routes and the life network all read this table, so the site plan is one
   fact in one place. Distance from the marker is deliberate — near, mid, far — but v5's separation was
   DEPTH ONLY: measured from the arrival camera the three facilities overlapped in bearing, and their
   side wings physically collided (gym wing 0.40 m from MAH MATCH's apron; MAH MATCH's apron overlapping
   the market's wing). v6 pushes them apart LATERALLY as well and grows their secondary mass backward
   instead of sideways, so each facility has its own territory and the ground between them is free for
   courtyards, planting and paths (§05). */
export const SITES = Object.freeze({
  gym:    { x: -58, z: -10, rotY: 0.62,  W: 38, H: 13, D: 24, openW: 18, openH: 8,  E: 4,   R: 12, radius: 3.2, floorY: 0,   approach: [-36, -4] },
  market: { x: 62,  z: -34, rotY: -0.62, W: 36, H: 15, D: 24, openW: 22, openH: 7,  E: 2.5, R: 12, radius: 4.0, floorY: 0,   approach: [38, -20] },
  match:  { x: 0,   z: -74, rotY: 0,     W: 44, H: 38, D: 30, openW: 18, openH: 14, E: 5,   R: 22, radius: 2.6, floorY: 1.8, approach: [0, -48] }
});

/* ---- v4: merge many small parts into ONE mesh per material (draw-call discipline, brief §52) ---- */
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
function part(list, geo, x, y, z, ry = 0, rx = 0, rz = 0) {
  _p.set(x, y, z); _q.setFromEuler(new THREE.Euler(rx, ry, rz)); _m4.compose(_p, _q, _s);
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(_m4); list.push(g);
  return list;
}
function mergeParts(list) {
  let n = 0; for (const g of list) n += g.getAttribute('position').count;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3); let o = 0;
  for (const g of list) { pos.set(g.getAttribute('position').array, o * 3); if (g.getAttribute('normal')) nrm.set(g.getAttribute('normal').array, o * 3); o += g.getAttribute('position').count; g.dispose(); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return out;
}
function merged(parent, list, mat, name, shadow) { if (!list.length) return null; const m = new THREE.Mesh(mergeParts(list), mat); m.name = name || 'merged'; if (shadow) { m.castShadow = true; m.receiveShadow = true; } parent.add(m); return m; }

/* Secondary massing + tertiary detail for a destination facade (brief §12–§14): wings, canopy, parapet, roof kit,
   upper window courses, entrance light housings, vents, seams. Everything merged per material; two InstancedMesh window grids. */
function dressFacade(ctx, g, o) {
  const { M } = ctx;
  const { W, H, D, openW, openH, E, floorY = 0, wings = true, canopy = true, roofKit = true, windowsUpper = true, seed = 1 } = o;
  const structural = [], trim = [], dark = [], composite = [], lit = [];
  const pierW = (W - openW) / 2;
  /* SECONDARY MASS — v6 §05.
     The v4/v5 side WINGS grew each destination by 68 % of its own width, and that is what made the
     three facilities collide: measured, MAH GYM's right wing stood 0.40 m from MAH MATCH's apron and
     MAH MATCH's apron OVERLAPPED MAH MARKET's left wing outright. A facility that touches its
     neighbour has no territory of its own, so the secondary mass now grows BACKWARD instead of
     sideways — a set-back rear volume with its own window course and roof step, which reads as depth
     from the plaza and leaves the lateral gaps open for courtyards, planting and paths.
     `wings: true` is still honoured for any caller that wants the old behaviour. */
  if (wings === true) {
    const wingW = W * 0.34, wingH = H * 0.58, wingD = D * 0.7;
    [-1, 1].forEach(sd => {
      const wing = new THREE.Mesh(softMass(wingW, wingH, wingD, 1.0), M.structural); wing.position.set(sd * (W / 2 + wingW / 2 - 0.6), 0, -(E + 2.4)); wing.castShadow = true; wing.receiveShadow = true; g.add(wing); ctx.colliders.push(wing);
      const grid = windowGrid({ cols: 5, rows: Math.max(2, Math.round(wingH / 4)), cellW: 1.1, cellH: 1.7, gapX: 0.7, gapY: 1.1, depth: 0.1, onFraction: 0.35, seed: seed + sd + 5 });
      grid.position.set(sd * (W / 2 + wingW / 2 - 0.6), wingH * 0.52, -(E + 2.4) + 0.42); g.add(grid);
      ctx.windowGrids.push(grid);
      /* a parapet trim and one setback step on the wing roof */
      part(trim, chamferBox(wingW - 0.4, 0.2, 0.3, 0.05), sd * (W / 2 + wingW / 2 - 0.6), wingH - 0.1, -(E + 2.4) + 0.35);
      part(structural, chamferBox(wingW * 0.55, 1.6, wingD * 0.5, 0.08), sd * (W / 2 + wingW / 2 - 0.6), wingH + 0.8, -(E + 2.4) - wingD * 0.35);
    });
  } else if (wings === 'rear') {
    const rw = W * 0.72, rh = H * 0.66, rd = D * 0.55, rz = -(E + D + rd * 0.42);
    const rear = new THREE.Mesh(softMass(rw, rh, rd, 1.6), M.structural);
    rear.position.set(0, 0, rz); rear.castShadow = true; rear.receiveShadow = true; g.add(rear); ctx.colliders.push(rear);
    /* the rear volume's own courses, on its two flanks where they are seen obliquely from the plaza */
    [-1, 1].forEach(sd => {
      const grid = windowGrid({ cols: 4, rows: Math.max(2, Math.round(rh / 4.4)), cellW: 1.1, cellH: 1.7, gapX: 0.8, gapY: 1.2, depth: 0.1, onFraction: 0.3, seed: seed + sd + 5 });
      grid.position.set(sd * (rw / 2 + 0.06), rh * 0.5, rz); grid.rotation.y = sd * Math.PI / 2; g.add(grid);
      ctx.windowGrids.push(grid);
    });
    part(trim, chamferBox(rw + 0.4, 0.2, rd + 0.4, 0.06), 0, rh - 0.1, rz);
    part(structural, chamferBox(rw * 0.5, 2.0, rd * 0.5, 0.14), 0, rh + 1.0, rz - rd * 0.14);
  }
  /* SECONDARY — entry canopy: a chamfered slab over the opening with a lit underside and two brackets */
  if (canopy) {
    const cw = openW + 2.4, cd = 3.2, cy = floorY + openH + 0.35;
    part(structural, chamferBox(cw, 0.36, cd, 0.08), 0, cy, cd / 2 - 0.2);
    part(trim, chamferBox(cw + 0.1, 0.06, 0.12, 0.02), 0, cy - 0.21, cd - 0.26);
    const under = new THREE.Mesh(new THREE.PlaneGeometry(cw - 0.8, cd - 0.9), M.interior); under.rotation.x = Math.PI / 2; under.position.set(0, cy - 0.19, cd / 2 - 0.2); g.add(under);
    ctx.timeHooks.push(s => { under.visible = true; });
    [-1, 1].forEach(sd => part(structural, chamferBox(0.22, 1.4, 0.22, 0.03), sd * (cw / 2 - 0.5), cy + 0.85, 0.6, 0, 0.42));
    ctx.entranceLights.push(world(g, 0, cy - 0.6, cd * 0.6));
  }
  /* SECONDARY — parapet and roof kit: the silhouette stops being a blank slab */
  if (roofKit) {
    part(trim, chamferBox(W - 0.6, 0.22, 0.34, 0.05), 0, H - 0.11, -0.05);
    part(trim, chamferBox(0.34, 0.22, D - 0.6, 0.05), -W / 2 + 0.3, H - 0.11, -(E + D / 2));
    part(trim, chamferBox(0.34, 0.22, D - 0.6, 0.05), W / 2 - 0.3, H - 0.11, -(E + D / 2));
    const R = ((seed * 9301 + 49297) % 233280) / 233280;
    part(structural, chamferBox(W * 0.22, 1.2, D * 0.18, 0.08), -W * 0.26, H + 0.6, -(E + D * 0.45));
    part(structural, chamferBox(W * 0.16, 2.0, D * 0.14, 0.08), W * (0.18 + R * 0.1), H + 1.0, -(E + D * 0.55));
    for (let i = 0; i < 6; i++) part(dark, new THREE.BoxGeometry(W * 0.14, 0.08, 0.06), W * (0.18 + R * 0.1), H + 0.35 + i * 0.28, -(E + D * 0.55) + D * 0.07);   /* louvred plant screen */
    part(trim, new THREE.CylinderGeometry(0.06, 0.09, 4.2, 6), W * 0.36, H + 2.1, -(E + D * 0.3));
    part(composite, chamferBox(1.2, 0.9, 1.2, 0.06), -W * 0.05, H + 0.45, -(E + D * 0.7));
  }
  /* TERTIARY — upper window courses on both piers (dark recesses, a few lit), vents, light housings, seams */
  if (windowsUpper) {
    const rows = Math.max(1, Math.round((H - floorY - openH - 2.2) / 3.2));
    [-1, 1].forEach(sd => {
      const grid = windowGrid({ cols: Math.max(2, Math.round(pierW / 2.6)), rows, cellW: 1.0, cellH: 1.5, gapX: 1.0, gapY: 1.2, depth: 0.12, onFraction: 0.22, seed: seed * 3 + sd, tint: 0xcfdcf2, dimTint: 0x1b2535 });
      grid.position.set(sd * (openW / 2 + pierW / 2), floorY + openH + 1.2 + rows * 1.35 + 0.4, 0.4); g.add(grid); ctx.windowGrids.push(grid);
    });
  }
  /* vents: two slot groups low on each pier; entrance light housings; a sign mount bar */
  [-1, 1].forEach(sd => {
    for (let i = 0; i < 4; i++) part(dark, new THREE.BoxGeometry(1.6, 0.08, 0.08), sd * (openW / 2 + pierW * 0.55), floorY + 1.0 + i * 0.22, 0.42);
    part(structural, chamferBox(0.5, 0.9, 0.36, 0.05), sd * (openW / 2 + 0.9), floorY + openH * 0.62, 0.45);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.7), M.panelLit); face.position.set(sd * (openW / 2 + 0.9), floorY + openH * 0.62, 0.64); g.add(face);
  });
  part(trim, chamferBox(openW * 0.8, 0.1, 0.16, 0.03), 0, floorY + openH + (H - floorY - openH) * 0.72 + 0.1, 0.5);
  /* horizontal seams across the piers: recessed dark lines (scale cue) */
  for (let y = floorY + 3.2; y < H - 1.5; y += 3.2) [-1, 1].forEach(sd => part(dark, new THREE.BoxGeometry(pierW - 1.6, 0.05, 0.04), sd * (openW / 2 + pierW / 2), y, 0.43));
  merged(g, structural, M.structural, 'dress-structural', true);
  merged(g, trim, M.trim, 'dress-trim', false);
  merged(g, dark, M.graphiteDark, 'dress-dark', false);
  merged(g, composite, M.composite, 'dress-composite', true);
}

/* a square-diamond frame standing upright in the XY plane */
function diamondFrame(size, bar, mat, depth = 0.12) {
  const grp = new THREE.Group(); const half = size / 2;
  const geo = new THREE.BoxGeometry(size, bar, depth);
  for (let i = 0; i < 4; i++) { const seg = new THREE.Mesh(geo, mat); const a = i * Math.PI / 2; seg.position.set(Math.cos(a) * half, Math.sin(a) * half, 0); seg.rotation.z = a + Math.PI / 2; grp.add(seg); }
  grp.rotation.z = Math.PI / 4;
  return grp;
}
/* v5 §07: NOTHING in MAHWORLD has an un-bevelled 90° corner. Every box in this module is chamfered —
   a hard edge is what makes a prototype read as a prototype, and a caught edge is what makes a
   surface read as manufactured. The chamfer scales with the part, so a 0.06 m bar still turns. */
function box(w, h, d, mat, x, y, z) {
  const c = Math.min(0.07, w / 4, h / 4, d / 4);
  const m = new THREE.Mesh(chamferBox(w, h, d, c), mat); m.position.set(x, y, z); return m;
}

/* ---- SILHOUETTE TREATMENTS (v5 §06 / §08): one per destination, so the three masses differ in
   PROFILE and not only in signage. Each merges per material; none adds a light. -------------- */

/* MAH GYM — BROAD. A long curved glazed canopy sweeping the whole frontage on slim chromium
   columns, with a brushed-platinum fascia and a glazed clerestory band above the opening. The
   read from the plaza is horizontal: a wide, open, well-lit training frontage. */
function broadCanopy(ctx, g, o) {
  const { M } = ctx;
  const { W, H, openH, floorY = 0, seed = 1 } = o;
  const struct = [], trim = [], dark = [];
  const cw = W + 5.2, depth = 4.6, cy = floorY + openH + 1.35, segs = 22;
  /* the canopy shell: a shallow arc swept across the frontage, built from segment planes so it is a
     CURVE and not a folded plate. Glass over, brushed fascia under. */
  const shell = [], soffit = [];
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const zOf = t => depth * t, yOf = t => -1.35 * t * t;         /* the sweep falls as it reaches out */
    const zm = (zOf(t0) + zOf(t1)) / 2, ym = (yOf(t0) + yOf(t1)) / 2;
    const seg = Math.hypot(zOf(t1) - zOf(t0), yOf(t1) - yOf(t0));
    const tilt = Math.atan2(yOf(t1) - yOf(t0), zOf(t1) - zOf(t0));
    shell.push([cw, 0.14, seg, 0, cy + ym, zm, -tilt]);
    soffit.push([cw - 0.5, 0.05, seg * 0.98, 0, cy + ym - 0.12, zm, -tilt]);
  }
  shell.forEach(([w, h, d, x, y, z, rx]) => part(struct, chamferBox(w, h, d, 0.04), x, y, z, 0, rx));
  /* the SOFFIT is lit, not plated. A canopy's underside faces the ground: a polished grade there mirrors
     the dark floor and the entrance goes black. A luminous soffit is what makes an entrance premium. */
  soffit.forEach(([w, h, d, x, y, z, rx]) => {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.interiorSoft);
    pl.position.set(x, y - 0.06, z); pl.rotation.x = Math.PI / 2 + rx; g.add(pl);
  });
  /* the leading edge: one mirror-grade nosing running the full width — the canopy's bright line */
  part(trim, chamferBox(cw + 0.3, 0.2, 0.34, 0.07), 0, cy - 1.42, depth + 0.06);
  /* slim chromium columns carrying it, and their footings */
  for (let i = -3; i <= 3; i++) {
    if (!i) continue;
    const cx = i * (cw / 7.4);
    part(struct, new THREE.CylinderGeometry(0.11, 0.15, cy - 1.4 - floorY, 10), cx, floorY + (cy - 1.4 - floorY) / 2, depth - 0.5);
    part(trim, chamferBox(0.5, 0.09, 0.5, 0.03), cx, floorY + 0.06, depth - 0.5, Math.PI / 4);
  }
  /* a clerestory band above the opening: the gym is GLAZED, and light comes out of it */
  const band = new THREE.Mesh(new THREE.PlaneGeometry(W - 5.5, 2.4), M.crystalGlass || M.glass);
  band.position.set(0, floorY + openH + 4.3, 0.52); g.add(band);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(W - 6.0, 2.1), M.interiorSoft);
  glow.position.set(0, floorY + openH + 4.3, 0.42); g.add(glow);
  for (let i = -4; i <= 4; i++) part(trim, chamferBox(0.1, 2.5, 0.14, 0.03), i * ((W - 5.5) / 9), floorY + openH + 4.3, 0.56);
  /* a low brushed plinth running the full frontage: the broad base the mass sits on */
  part(dark, chamferBox(W + 7, 0.44, 1.6, 0.12), 0, floorY + 0.22, depth + 1.1);
  merged(g, struct, M.platinumLitBrushed || M.platinumBrushed, 'gym-canopy', true);   /* a canopy top faces the sky: only a LOW-metalness grade reads there (v6) */
  merged(g, trim, M.chromeMirror || M.trim, 'gym-canopy-catches', false);
  merged(g, dark, M.platinumBrushedH || M.structural, 'gym-plinth', true);
}

/* MAH MARKET — CIVIC. Three receding roof terraces with rails and planted edges, each smaller than
   the last, so the mass steps back instead of stopping at a parapet. The read is public and low. */
function terraces(ctx, g, o) {
  const { M } = ctx;
  const { W, H, D, E, seed = 3 } = o;
  const struct = [], trim = [], dark = [];
  /* the first terrace sits just behind the front parapet, not deep in the roof: a terrace you cannot see
     from the plaza is not a silhouette. Each one then steps BACK and IN from the one below. */
  let w = W - 2.2, d = D * 0.34, y = H, zc = -(E + D * 0.12);
  for (let i = 0; i < 3; i++) {
    const th = 2.6 - i * 0.35;
    part(struct, chamferBox(w, th, d, 0.34), 0, y + th / 2, zc);
    /* the terrace deck's front edge and its rail: posts every three metres plus a top bar */
    part(trim, chamferBox(w + 0.5, 0.16, 0.42, 0.06), 0, y + th, zc + d / 2 + 0.1);
    const posts = Math.max(3, Math.round(w / 3));
    for (let k = 0; k <= posts; k++) part(trim, chamferBox(0.07, 0.95, 0.07, 0.02), -w / 2 + k * (w / posts), y + th + 0.48, zc + d / 2 + 0.08);
    part(trim, chamferBox(w + 0.2, 0.07, 0.07, 0.02), 0, y + th + 0.95, zc + d / 2 + 0.08);
    /* a planted trough along the terrace face, and two service volumes set back */
    part(dark, chamferBox(w * 0.72, 0.5, 0.7, 0.1), 0, y + th + 0.25, zc + d / 2 - 0.7);
    if (i < 2) for (const sd of [-1, 1]) part(dark, chamferBox(w * 0.16, 1.1, d * 0.2, 0.14), sd * w * 0.3, y + th + 0.55, zc - d * 0.28);
    y += th; w *= 0.78; zc -= d * 0.62; d *= 0.92;
  }
  /* a light mast on the top terrace: the civic marker of the roof line */
  part(trim, new THREE.CylinderGeometry(0.07, 0.1, 4.6, 8), w * 0.2, y + 2.3, zc);
  merged(g, struct, M.platinumLitBrushed || M.structural, 'market-terraces', true);   /* horizontal terrace decks: low-metalness platinum */
  merged(g, trim, M.chromeSatin || M.trimSatin, 'market-terrace-rails', false);
  merged(g, dark, M.graphiteDark, 'market-terrace-plant', true);
}

/* MAH MATCH — DOMINANT. A tower rising far above both neighbours: a tapered vertical shaft with
   chamfered corner fins, a banded shoulder where it leaves the podium, a recessed lit slot up its
   whole height, and a crown. This is what makes MAH MATCH read as the anchor from anywhere. */
function verticalTower(ctx, g, o) {
  const { M } = ctx;
  const { W, H, D, E, seed = 2 } = o;
  const struct = [], trim = [], dark = [], lit = [];
  const th = 22, tw = W * 0.46, td = D * 0.5, zc = -(E + D * 0.42);
  /* the shoulder: one wide banded transition so the tower GROWS out of the podium */
  part(struct, chamferBox(tw + 4.4, 1.5, td + 4.4, 0.4), 0, H + 0.75, zc);
  part(trim, chamferBox(tw + 5.0, 0.18, td + 5.0, 0.07), 0, H + 1.5, zc);
  /* the shaft, tapering as it climbs — four stacked sections, each narrower than the one below */
  let y = H + 1.5, w = tw, d = td;
  for (let i = 0; i < 4; i++) {
    const sh = th / 4;
    part(struct, chamferBox(w, sh, d, 0.5), 0, y + sh / 2, zc);
    part(trim, chamferBox(w + 0.24, 0.14, d + 0.24, 0.05), 0, y + sh, zc);
    /* corner fins: vertical chamfered strips that draw the height and catch the moon on their turn */
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      part(dark, chamferBox(0.85, sh - 0.3, 0.85, 0.2), sx * (w / 2 - 0.2), y + sh / 2, zc + sz * (d / 2 - 0.2));
      part(trim, chamferBox(0.11, sh - 1.0, 0.11, 0.03), sx * (w / 2 + 0.16), y + sh / 2, zc + sz * (d / 2 + 0.16));
    }
    y += sh; w *= 0.9; d *= 0.9;
  }
  /* the lit slot: one recessed vertical channel up the plaza face, the tower's single light line */
  part(dark, chamferBox(1.5, th - 1.0, 0.5, 0.14), 0, H + 2 + (th - 1) / 2, zc + td / 2 + 0.2);
  lit.push(0);
  const slot = new THREE.Mesh(chamferBox(0.7, th - 2.4, 0.16, 0.05), M.energy);
  slot.position.set(0, H + 2 + (th - 1) / 2, zc + td / 2 + 0.42); g.add(slot); ctx.reflect(slot, 0.3);
  /* the crown: four angled planes closing the shaft, and a mirror cap band where they meet the sky */
  const crownH = 3.4;
  for (const [sx, sz] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
    const len = sx ? d - 0.6 : w - 0.6;
    part(struct, chamferBox(sx ? 1.5 : len, crownH, sx ? len : 1.5, 0.08),
      sx * (w / 2 - 0.7), y + crownH / 2, zc + sz * (d / 2 - 0.7), 0, sz ? sz * -0.3 : 0, sx ? sx * 0.3 : 0);
  }
  part(trim, chamferBox(w - 2.0, 0.2, d - 2.0, 0.06), 0, y + crownH - 0.2, zc);
  /* the mast and its square-diamond head: MAH MATCH's beacon, the highest thing in the district */
  part(trim, new THREE.CylinderGeometry(0.13, 0.2, 7.0, 8), 0, y + crownH + 3.5, zc);
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(1.05, 0), M.energyLight);
  head.position.set(0, y + crownH + 7.6, zc); head.scale.set(1, 1.3, 0.34); g.add(head);
  (ctx.beacons = ctx.beacons || []).push({ position: world(g, 0, y + crownH + 7.6, zc), building: g.name });
  ctx.matchRoof = world(g, 0, y + crownH, zc);
  merged(g, struct, M.structural, 'match-tower', true);
  merged(g, trim, M.chromeMirror || M.trim, 'match-tower-catches', false);
  merged(g, dark, M.graphiteMetal || M.graphiteDark, 'match-tower-fins', true);
}

/* v6 §18 — SIGNAGE MOUNTED IN ARCHITECTURE, not a bitmap laid on a wall.
   A MAH name in the world is a piece of built work: a faceted backing panel recessed into the facade,
   a mirror-grade chromium frame around it with real mounting depth, a lit reveal along its lower edge
   so the letters are washed from below the way an inset sign actually is, and only then the wordmark
   itself, standing proud of the panel rather than painted onto it. `mounted: false` keeps the plain
   plane for the small entrance-action labels, which are display panels rather than facility names. */
function sign(ctx, parent, spec) {
  const tex = signTexture(spec);
  const mat = ctx.M.signage.clone(); mat.map = tex;
  ctx.signMaterials.push(mat);
  const height = spec.width * (spec.h || 768) / (spec.w || 2048);
  const x = spec.x || 0, y = spec.y, z = spec.z;
  if (spec.mounted !== false) {
    const M = ctx.M;
    const pw = spec.width * 1.1, ph = height * 1.26;
    /* the recess the panel sits in, then the faceted backing panel itself */
    const reveal = new THREE.Mesh(chamferBox(pw + 0.5, ph + 0.4, 0.34, 0.07), M.graphiteDark);
    reveal.position.set(x, y, z - 0.44); parent.add(reveal);
    const backing = new THREE.Mesh(chamferBox(pw, ph, 0.26, 0.09), M.panel);
    backing.position.set(x, y, z - 0.3); parent.add(backing);
    /* the chromium frame: four mirror-grade bars with mounting depth, vertical and tilted faces only,
       which is where a mirror grade actually reaches the horizon band and reads */
    /* the frame sits BEHIND the wordmark plane: mounting depth must frame the letters, not bury them */
    const fr = 0.16, fd = 0.26;
    [[0, ph / 2 + fr / 2, pw + fr * 2, fr], [0, -ph / 2 - fr / 2, pw + fr * 2, fr],
     [-pw / 2 - fr / 2, 0, fr, ph], [pw / 2 + fr / 2, 0, fr, ph]].forEach(([bx, by, bw, bh]) => {
      const bar = new THREE.Mesh(chamferBox(bw, bh, fd, 0.045), M.chromeMirror || M.trim);
      bar.position.set(x + bx, y + by, z - 0.17); parent.add(bar);
    });
    /* the lit reveal: a thin unlit strip along the lower edge, washing the letters from below */
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(pw * 0.9, 0.09), M.interior);
    wash.position.set(x, y - ph / 2 + 0.16, z - 0.05); parent.add(wash);
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, height), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  if (spec.reflect !== false) ctx.reflect(mesh, 0.3);
  return mesh;
}

/* ================= THE CURTAIN WALL (v6b) ==========================================================
   The single largest difference between MAHWORLD and the reference is not colour — it is that in the
   reference the buildings are DARK FRAMES FULL OF BRIGHT GLASS. They are lanterns: multi-storey
   curtain walls with lit floor plates visible behind them and people moving inside. MAHWORLD's
   buildings were dark masses punched with small windows, which is why the world read as heavy however
   much platinum went onto its trim.

   This builds that read WITHOUT lightening a single mass — which matters, because the mass is the
   value floor everything bright is measured against. A dark frame stays dark; the glazing between its
   mullions becomes the light source. Each bay is:

     an unlit INTERIOR PLANE at the back, in cool white, varying per floor so the building has
     occupancy rather than one flat glow;
     a FLOOR PLATE and a soffit above it, so the eye reads storeys and gets the building's scale;
     the GLASS itself in front, which reflects the sky and the district over the light behind it;
     MULLIONS and a spandrel band, in satin chromium, vertical faces where that grade pays.

   Cost: two merged meshes plus one instanced glass bay per facade, whatever the storey count. */
function curtainWall(ctx, g, o) {
  const { M } = ctx;
  const { W, H, sillY = 0, topY, bays = 6, floors = 3, z = 0.5, seed = 1, lit = 0.72 } = o;
  const frame = [], plates = [];
  const wallW = W * 0.92, bayW = wallW / bays;
  const totalH = topY - sillY, floorH = totalH / floors;
  let s = (seed * 9301 + 49297) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  /* the interior: one unlit plane per bay per floor, at its own brightness. Unlit on purpose — an
     interior seen through glass is a light SOURCE, and shading it would put it back in shadow. */
  const litMat = M.interior;
  const dimMat = M.interiorSoft;
  const glassBay = [];
  for (let f = 0; f < floors; f++) {
    const fy = sillY + f * floorH;
    for (let b = 0; b < bays; b++) {
      const bx = -wallW / 2 + bayW / 2 + b * bayW;
      const on = rnd() < lit;
      const iw = bayW - 0.5, ih = floorH - 0.75;
      const inner = new THREE.Mesh(new THREE.PlaneGeometry(iw, ih), on ? litMat : dimMat);
      inner.position.set(bx, fy + floorH * 0.52, z - 0.5);
      if (on) inner.scale.setScalar(1); else inner.scale.set(1, 0.92, 1);
      g.add(inner);
      /* the glass in front of it, which is what makes the light read as being INSIDE something */
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(iw + 0.3, ih + 0.4), M.crystalGlass || M.glass);
      pane.position.set(bx, fy + floorH * 0.52, z - 0.06); g.add(pane);
      glassBay.push(pane);
      /* the vertical mullion between bays — a satin chromium face, which is where that grade pays */
      part(frame, chamferBox(0.2, floorH - 0.1, 0.34, 0.05), bx - bayW / 2, fy + floorH / 2, z);
    }
    /* the floor plate and its soffit: this is what gives a facade its STOREYS, and storeys are what
       give a building its scale against a resident standing in front of it */
    part(plates, chamferBox(wallW + 0.5, 0.34, 0.5, 0.08), 0, fy + 0.1, z + 0.06);
    part(frame, chamferBox(wallW + 0.7, 0.1, 0.16, 0.03), 0, fy + 0.3, z + 0.24);
  }
  part(frame, chamferBox(0.2, totalH, 0.34, 0.05), wallW / 2, sillY + totalH / 2, z);
  part(plates, chamferBox(wallW + 0.5, 0.4, 0.55, 0.09), 0, topY + 0.1, z + 0.06);
  merged(g, frame, M.chromeSatin || M.trimSatin, 'curtain-mullions', false);
  merged(g, plates, M.platinumLit || M.platinum, 'curtain-plates', true);
  return glassBay;
}

/* the composed facade: body + room + glass + piers + lintel */
function facade(ctx, parent, o) {
  const { M } = ctx;
  const { W, H, D, openW, openH, pierDepth: E, roomDepth: R, floorY = 0, radius = 1.4, glassMullions = 0 } = o;
  const body = new THREE.Mesh(softMass(W, H, D, radius), M.graphite); body.position.z = -(E + R); body.castShadow = true; body.receiveShadow = true; parent.add(body);
  (ctx.colliders = ctx.colliders || []).push(body);
  /* room: floor, ceiling, back wall, side walls, light strips */
  const room = new THREE.Group(); room.position.set(0, floorY, -E);
  const rw = o.roomW || openW + 6, rh = o.roomH || openH + 1.2;
  room.add(box(rw, 0.2, R, M.graphiteLight, 0, -0.1, -R / 2));
  room.add(box(rw, 0.2, R, M.graphiteDark, 0, rh + 0.1, -R / 2));
  room.add(box(rw, rh, 0.2, M.graphiteLight, 0, rh / 2, -R + 0.1));
  room.add(box(0.2, rh, R, M.graphiteDark, -rw / 2, rh / 2, -R / 2));
  room.add(box(0.2, rh, R, M.graphiteDark, rw / 2, rh / 2, -R / 2));
  for (let i = 1; i <= 3; i++) room.add(box(rw * 0.7, 0.05, 0.25, M.interior, 0, rh - 0.05, -R * i / 4));
  /* a low luminous band across the back wall: the interior always reads from the plaza as lit architecture, not a screen */
  const backGlow = new THREE.Mesh(new THREE.PlaneGeometry(rw * 0.82, rh * 0.16), M.interiorSoft); backGlow.position.set(0, rh * 0.36, -R + 0.25); room.add(backGlow);
  parent.add(room);
  /* glass line across the opening, with optional mullions */
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(openW, openH), M.glass); glass.position.set(0, floorY + openH / 2, -E + 0.15); glass.name = 'entrance-glass'; parent.add(glass);
  for (let i = 1; i <= glassMullions; i++) parent.add(box(0.12, openH, 0.12, M.platinum, -openW / 2 + i * openW / (glassMullions + 1), floorY + openH / 2, -E + 0.15));
  /* one bounded light inside the room so the interior reads through the glass */
  ctx.roomLights = ctx.roomLights || [];
  parent.updateMatrixWorld(true);
  ctx.roomLights.push(parent.localToWorld(new THREE.Vector3(0, floorY + rh * 0.5, -E - R * 0.45)));
  /* piers and lintel at the front */
  const pierW = (W - openW) / 2;
  const pl = new THREE.Mesh(softMass(pierW, H, E + 0.4, Math.min(radius, pierW / 3)), M.graphite); pl.position.set(-W / 2 + pierW / 2, 0, 0); parent.add(pl);
  const pr = pl.clone(); pr.position.x = W / 2 - pierW / 2; parent.add(pr);
  const lintelH = H - openH - floorY;
  const lintel = new THREE.Mesh(softMass(openW + 0.6, lintelH, E + 0.4, Math.min(radius, lintelH / 3)), M.graphite); lintel.position.set(0, floorY + openH, 0); parent.add(lintel);
  pl.castShadow = pr.castShadow = lintel.castShadow = true; ctx.colliders.push(pl, pr);
  /* platinum roof trims: the silhouette catches light without a neon outline */
  parent.add(box(pierW - 1.2, 0.16, 0.22, M.platinum, -W / 2 + pierW / 2, H - 0.32, 0.36));
  parent.add(box(pierW - 1.2, 0.16, 0.22, M.platinum, W / 2 - pierW / 2, H - 0.32, 0.36));
  parent.add(box(openW - 0.8, 0.16, 0.22, M.platinum, 0, H - 0.32, 0.36));
  /* a faceted crystalline panel region on the lintel: controlled, not everywhere */
  const panels = new THREE.Group();
  const cols = Math.max(3, Math.round(openW / 3.2));
  for (let i = 0; i < cols; i++) { const pw = openW / cols - 0.25; const p = box(pw, lintelH * 0.34, 0.22, M.panel, -openW / 2 + pw / 2 + i * (openW / cols) + 0.12, floorY + openH + lintelH * 0.22, 0.34 + (i % 2) * 0.06); p.rotation.y = (i % 2 ? 1 : -1) * 0.05; panels.add(p); }
  parent.add(panels);
  return { body, room, glass, pl, pr, lintel, rw, rh };
}

/* CRYSTALLIZATION (brief §06–§09, §12): the MAHFITT crystal language applied to ARCHITECTURE —
   a faceted tapered crown, angled inset crystal panels, chamfered corner turns that catch the moon,
   and one diamond roof beacon. The building stays a building; crystal is its surface language. */
function crystallize(ctx, g, o) {
  const { M } = ctx;
  const { W, H, D, openW, E, floorY = 0, seed = 1, beacon = true, crown: wantCrown = true } = o;
  const crystal = [], catches = [], deep = [], crown = [];
  const pierW = (W - openW) / 2;
  const R = ((seed * 2654435761) % 1000) / 1000;
  /* CROWN: a tapered faceted cap — four angled planes stepping in toward the roof line, flat shaded so
     each plane takes its own value under the moon; the silhouette turns instead of stopping flat */
  const crownH = 1.9 + R * 0.6, inset = 1.5;
  if (wantCrown) for (const [sx, sz, w, d] of [[0, 1, W - 1.2, 0], [0, -1, W - 1.2, 0], [-1, 0, 0, D - 1.2], [1, 0, 0, D - 1.2]]) {
    const len = sx ? d : w;
    const geo = chamferBox(sx ? 1.5 : len, crownH, sx ? len : 1.5, 0.06);
    const px = sx * (W / 2 - 0.75), pz = sz ? (sz > 0 ? 0.4 : -(E + D) + 0.4) : -(E + D / 2);
    part(crown, geo, px, H + crownH / 2 - 0.2, pz, 0, sz ? sz * -0.22 : 0, sx ? sx * 0.22 : 0);
  }
  /* the crown's bright turn: a thin platinum cap band that only exists where the planes meet the sky */
  if (wantCrown) {
    part(catches, chamferBox(W - 2.4, 0.14, 0.5, 0.04), 0, H + crownH - 0.25, 0.2);
    part(catches, chamferBox(0.5, 0.14, D - 2.4, 0.04), -W / 2 + 1.1, H + crownH - 0.25, -(E + D / 2));
    part(catches, chamferBox(0.5, 0.14, D - 2.4, 0.04), W / 2 - 1.1, H + crownH - 0.25, -(E + D / 2));
  } else {
    /* no crown: the mass ends in a low mirror-grade parapet so whatever the module above it builds —
       terraces, a tower — is what the silhouette actually shows */
    part(catches, chamferBox(W - 0.8, 0.22, 0.42, 0.06), 0, H - 0.11, 0.16);
  }
  /* ANGLED INSET CRYSTAL PANELS: shallow rotated facets recessed into each pier, in two courses.
     Their angle is what reads — each catches a different amount of moon and city glow. */
  const rows = Math.max(2, Math.round((H - floorY - 6) / 5.5));
  for (let sd = -1; sd <= 1; sd += 2) for (let i = 0; i < rows; i++) {
    const y = floorY + 4.4 + i * 5.0, tilt = ((i + (sd > 0 ? 1 : 0)) % 2 ? 1 : -1) * 0.05;
    if (y > H - crownH - 1.6) continue;
    const x = sd * (openW / 2 + pierW / 2), w = pierW * 0.66;
    /* a recessed reveal, then the crystal face set INTO it with a shallow tilt: the facet is a change of
       plane in the wall, not a slab stuck on top of it */
    part(deep, chamferBox(w + 0.5, 3.0, 0.3, 0.04), x, y, 0.28);
    part(crystal, chamferBox(w, 2.6, 0.26, 0.05), x, y, 0.3, tilt * 0.4, 0, tilt);
    part(catches, chamferBox(w, 0.06, 0.1, 0.015), x, y + 1.31, 0.42, tilt * 0.4, 0, tilt);
  }
  /* CORNER TURNS: chamfered vertical strips on the four front corners — the geometric turn of the mass,
     with a platinum edge that draws the building's height */
  for (const sd of [-1, 1]) {
    part(deep, chamferBox(0.9, H - 0.6, 0.9, 0.16), sd * (W / 2 - 0.35), (H - 0.6) / 2, 0.12);
    part(catches, chamferBox(0.12, H - 2.4, 0.12, 0.03), sd * (W / 2 - 0.02), (H - 2.4) / 2 + 0.4, 0.5);
  }
  /* DIAMOND ROOF BEACON: a slim mast and one square diamond — a FOBEAM endpoint's architectural logic */
  if (beacon) {
    const bx = (R < 0.5 ? -1 : 1) * (W * 0.3), bz = -(E + D * 0.25), bh = 3.4 + R * 2.2;
    part(deep, new THREE.BoxGeometry(0.22, bh, 0.22), bx, H + crownH + bh / 2 - 0.2, bz);
    const dia = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), M.energyLight);
    const w = world(g, bx, H + crownH + bh + 0.3, bz);
    dia.position.set(bx, H + crownH + bh + 0.3, bz); dia.scale.set(1, 1.25, 0.35); g.add(dia);
    ctx.reflect(dia, 0.3);
    (ctx.beacons = ctx.beacons || []).push({ position: w, building: g.name });
  }
  /* the crown is BRUSHED PLATINUM: its planes face up and out into a dark night sky, so a polished grade
     would mirror that darkness and the building would end in a black hat. Brushed catches the hemisphere. */
  merged(g, crown, M.platinumLit || M.composite, 'crystal-crown', true);
  merged(g, crystal, M.composite, 'crystal-panels', true);
  merged(g, catches, M.trim, 'crystal-catches', false);
  merged(g, deep, M.structural, 'crystal-structure', true);
}

export function buildBuildings(ctx) {
  const { M, scene } = ctx;
  ctx.signMaterials = ctx.signMaterials || [];
  ctx.residentSpots = ctx.residentSpots || [];
  ctx.entranceLights = ctx.entranceLights || [];
  ctx.actions = ctx.actions || [];        /* tap targets: { id, label, kind, mesh, at: world Vector3 } */
  ctx.windowGrids = ctx.windowGrids || []; /* InstancedMesh window courses; the assembly dims them by day */
  ctx.colliders = ctx.colliders || [];
  const out = {};
  const action = (id, label, kind, mesh, at, extra) => { mesh.userData.action = id; ctx.actions.push(Object.assign({ id, label, kind, mesh, at }, extra)); return mesh; };

  /* ---------------- MAH GYM — training ---------------------------------- */
  {
    const g = new THREE.Group(); g.name = 'MAH GYM';
    const S = SITES.gym, { W, H, D, openW, openH, E, R } = S;
    g.position.set(S.x, 0, S.z); g.rotation.y = S.rotY; scene.add(g);
    const f = facade(ctx, g, { W, H, D, openW, openH, pierDepth: E, roomDepth: R, radius: S.radius, glassMullions: 3 });
    dressFacade(ctx, g, { W, H, D, openW, openH, E, seed: 1, canopy: false, wings: 'rear' });   /* the broad curved canopy replaces the slab canopy */
    crystallize(ctx, g, { W, H, D, openW, E, seed: 1 });
    broadCanopy(ctx, g, { W, H, openH, seed: 1 });
    /* MAH GYM is the BRIGHT, OPEN, GLAZED one (§21): two lit storeys of curtain wall above the canopy,
       so the training inside is what the building shows the plaza */
    curtainWall(ctx, g, { W, H, sillY: openH + 1.4, topY: H - 0.6, bays: 7, floors: 2, z: 0.62, seed: 11, lit: 0.8 });
    ctx.entranceLights.push(world(g, 0, openH + 1.2, 4.6));
    action('gym', 'MAH GYM', 'destination', f.glass, world(g, 0, 0, 2), { view: 'gym-entrance', copy: 'Training facility. Preview navigation: the camera moves to the entrance. Training data stays in MAHFITT.' });
    /* upper window band across the piers: interior glow behind glass */
    const windowGlow = M.interiorSoft.clone(); windowGlow.opacity = 0.28; ctx.timeHooks.push(s => { windowGlow.opacity = 0.28 * (1 - s.daylight * 0.5); });
    [-1, 1].forEach(s => { const gl = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 2.4), M.crystalGlass || M.glass); gl.position.set(s * (W / 2 - 5.0), 10.5, 0.44); g.add(gl); const glow = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.2), windowGlow); glow.position.set(s * (W / 2 - 5.0), 10.5, 0.3); g.add(glow);
      /* a window the life module may put a training silhouette behind (brief §43) */
      const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y);
      (ctx.lifeAnchors ? ctx.lifeAnchors.windows : []).push({ id: 'gym-window-' + (s < 0 ? 'l' : 'r'), position: world(g, s * (W / 2 - 5.0), 9.8, -0.4), normal: n, size: [7.2, 2.2], building: 'gym' }); });
    /* one light seam on each outer pier: a single vertical energy line, not an outline */
    [-1, 1].forEach(s => { const seam = box(0.08, H * 0.62, 0.06, M.energy, s * (W / 2 - 1.0), H * 0.42, 0.46); g.add(seam); ctx.reflect(seam, 0.35); });
    /* signage on the lintel */
    sign(ctx, g, { title: 'MAH GYM', sub: 'TRAIN HIGHER', mark: true, width: 13.5, y: 11.6, z: 0.84 });
    /* interior: platforms, racks, a cable frame — readable, not a machine warehouse */
    const room = g.children.find(c => c.isGroup && c.position.z === -E);
    const plat = (x, z) => { const p = box(3.2, 0.3, 3.2, M.graphiteLight, x, 0.15, z); room.add(p); return p; };
    plat(-4.5, -3.5); plat(0, -6.5); plat(4.5, -3.5);
    const rack = (x, z) => { [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]].forEach(([dx, dz]) => room.add(box(0.1, 2.4, 0.1, M.platinum, x + dx, 1.5, z + dz))); room.add(box(2.0, 0.08, 0.08, M.platinum, x, 2.1, z - 0.5)); room.add(box(2.0, 0.08, 0.08, M.platinum, x, 1.2, z + 0.5)); };
    rack(-4.5, -3.5); rack(4.5, -3.5);
    /* cable frame */
    [[-2.2, -9.5], [2.2, -9.5]].forEach(([x, z]) => room.add(box(0.12, 3.4, 0.12, M.platinum, x, 2.0, z)));
    room.add(box(4.6, 0.1, 0.1, M.platinum, 0, 3.6, -9.5));
    /* free weights: a few low faceted blocks */
    for (let i = 0; i < 4; i++) room.add(box(0.6, 0.35, 0.35, M.panel, -6 + i * 0.9, 0.47, -1.2));
    out.gym = g;
    /* who is here: one training on a platform, one heading in */
    ctx.residentSpots.push(spot(g, 0, 0.3, -E - 6.5, 0, { id: 'gym-trainee', colour: 'blue', physique: 0.75, sex: 'm', pose: 'spar', seed: 11, note: 'training inside MAH GYM' }));

  }

  /* ---------------- MAH MATCH — the fighting facility --------------------- */
  {
    const g = new THREE.Group(); g.name = 'MAH MATCH';
    const S = SITES.match, { W, H, D, openW, openH, E, R, floorY } = S;
    g.position.set(S.x, 0, S.z); g.rotation.y = S.rotY; scene.add(g);
    const f = facade(ctx, g, { W, H, D, openW, openH, pierDepth: E, roomDepth: R, floorY, radius: S.radius, roomW: 38 });
    dressFacade(ctx, g, { W, H, D, openW, openH, E, floorY, seed: 2, canopy: false, wings: 'rear' });   /* MAH MATCH keeps its own portal frame instead of a canopy */
    crystallize(ctx, g, { W, H, D, openW, E, floorY, seed: 2, beacon: false });
    verticalTower(ctx, g, { W, H, D, E, seed: 2 });
    /* MAH MATCH is the DOMINANT one: its podium carries three lit storeys either side of the portal,
       and they stop below the tower so the tower stays the silhouette (§20) */
    [-1, 1].forEach(sd => {
      const pierW = (W - openW) / 2;
      const wall = { W: pierW * 0.92, H, sillY: floorY + openH + 1.6, topY: H - 1.2, bays: 3, floors: 3, z: 0.56, seed: 21 + sd, lit: 0.62 };
      const sub = new THREE.Group(); sub.position.x = sd * (openW / 2 + pierW / 2); g.add(sub);
      curtainWall(ctx, sub, wall);
    });
    action('match', 'MAH MATCH', 'destination', f.glass, world(g, 0, floorY, 2), { view: 'match-entrance', copy: 'Fighting facility: matches and practice. Choose an action at the entrance.' });
    /* the strong central frame around the opening, with a square-diamond keystone */
    const fT = 1.4, fD = 1.0, fz = 0.55;
    const frameMat = M.platinum;
    g.add(box(fT, openH + fT * 2, fD, frameMat, -openW / 2 - fT / 2, floorY + openH / 2 + fT / 2, fz));
    g.add(box(fT, openH + fT * 2, fD, frameMat, openW / 2 + fT / 2, floorY + openH / 2 + fT / 2, fz));
    g.add(box(openW + fT * 2, fT, fD, frameMat, 0, floorY + openH + fT / 2 + fT / 2, fz));
    const key = diamondFrame(2.6, 0.22, M.energyLight, 0.2); key.position.set(0, floorY + openH + fT + 0.6, fz + 0.3); g.add(key);
    ctx.reflect(key.children[0], 0.3);
    /* horizontal structural bands across the piers */
    [7.5, 13.5, 19.5, 25.5, 31.5].forEach(y => [-1, 1].forEach(s => { const b = box((W - openW) / 2 - 1.2, 0.35, 0.3, M.platinum, s * (openW / 2 + (W - openW) / 4 + 0.3), y, 0.5); g.add(b); }));
    /* faceted armour-like panel regions on the piers, restrained */
    [-1, 1].forEach(s => { for (let i = 0; i < 6; i++) { const p = box(3.0, 2.2, 0.28, M.panel, s * (openW / 2 + 5.2 + (i % 2) * 0.4), 10 + i * 4.2, 0.42); p.rotation.y = s * 0.06; g.add(p); } });
    /* the two banners: dark cloth with the red square-diamond, the competitive accent */
    [-1, 1].forEach(s => { const cloth = box(1.8, 8.5, 0.06, M.graphiteDark, s * (openW / 2 + 3.2), floorY + 8.5, 0.62); g.add(cloth); const em = diamondFrame(0.9, 0.09, M.matchRed, 0.06); em.position.set(s * (openW / 2 + 3.2), floorY + 11.4, 0.7); g.add(em); });
    /* signage: the name with its truthful sub-line; the TWO entrance actions below (§09 / §11 of the brief) */
    sign(ctx, g, { title: 'MAH MATCH', sub: 'MATCHES · PRACTICE', mark: true, width: 16, y: floorY + openH + fT + 5.6, z: 0.8 });
    const entranceAction = (id, title, x, extra) => {
      const panel = box(5.6, 1.5, 0.12, M.graphiteDark, x, floorY + 2.75, -E + 0.42); g.add(panel);
      const edge = box(5.4, 0.03, 0.04, M.energySoft, x, floorY + 1.98, -E + 0.5); g.add(edge);
      const s = sign(ctx, g, { title, width: 5.2, y: floorY + 2.75, z: -E + 0.5, x, titleSize: 118, w: 2048, h: 320, reflect: false, mounted: false });
      action(id, title, 'match-action', panel, world(g, x, floorY, 2), extra); s.userData.action = id; ctx.actions[ctx.actions.length - 1].meshes = [panel, s]; ctx.actions[ctx.actions.length - 1].edge = edge;
      return panel;
    };
    entranceAction('find-opponent', 'FIND AN OPPONENT', -openW / 4, { copy: 'Opponent matching is not available in this preview. No live players are connected and none are simulated.' });
    entranceAction('practice-buddy', 'PRACTICE WITH A BUDDY', openW / 4, { copy: 'Local practice preview with two labelled fixtures — no other person is involved.' });
    /* wide shallow entrance stairs up to the recessed floor, split around a CENTRAL RAMP
       so hovering residents have continuous access (no one climbs) */
    const steps = 6, rise = floorY / steps, run = 1.4, rampW = 4.8, rampLen = steps * run;
    for (let i = 0; i < steps; i++) {
      const h = rise * (i + 1), total = openW + 6 + (steps - i) * 0.6, sideW = (total - rampW) / 2, zc = (steps - i) * run - run / 2;
      [-1, 1].forEach(sd => { g.add(box(sideW, h, run, M.graphiteLight, sd * (rampW / 2 + sideW / 2), h / 2, zc)); g.add(box(sideW, 0.02, 0.05, M.energySoft, sd * (rampW / 2 + sideW / 2), h + 0.011, (steps - i) * run - 0.03)); });
    }
    const rampAngle = Math.atan2(floorY, rampLen), rampHyp = Math.hypot(floorY, rampLen);
    const ramp = box(rampW, 0.24, rampHyp, M.graphiteLight, 0, floorY / 2 - 0.12, rampLen / 2); ramp.rotation.x = -rampAngle; ramp.receiveShadow = true; g.add(ramp);
    [-1, 1].forEach(sd => { const edge = box(0.06, 0.02, rampHyp - 0.2, M.energySoft, sd * (rampW / 2 - 0.1), floorY / 2 + 0.011, rampLen / 2); edge.rotation.x = -rampAngle; g.add(edge); });
    g.add(box(rampW + 0.4, 0.06, 0.6, M.graphiteLight, 0, 0.03, rampLen + 0.3));   /* the landing lip at plaza level */
    /* handrails either side of the ramp and at the outer ends of the stairs: posts + a top bar, a human-scale cue */
    { const rails = []; [-1, 1].forEach(sd => { for (let i = 0; i <= 4; i++) { const zz = rampLen - i * (rampLen / 4), yy = floorY * (1 - zz / rampLen); part(rails, chamferBox(0.06, 1.0, 0.06, 0.01), sd * (rampW / 2 + 0.16), yy + 0.5, zz); } const bar = chamferBox(0.06, 0.06, rampHyp, 0.01); part(rails, bar, sd * (rampW / 2 + 0.16), floorY / 2 + 1.0, rampLen / 2, 0, -rampAngle); const ow = (openW + 6 + steps * 0.6) / 2; for (let i = 0; i <= 3; i++) part(rails, chamferBox(0.06, 1.0, 0.06, 0.01), sd * ow, 0.5 + i * (floorY / 3), rampLen - i * (rampLen / 3)); }); merged(g, rails, M.trimSatin, 'stair-rails', false); }
    /* interior: the square-diamond fighting platform, energy boundary, spectator tiers, practice zones.
       v3 inline version, kept inside `legacy-interior`; the assembly swaps it for match-interior.js when that module exists */
    const hall = g.children.find(c => c.isGroup && c.position.z === -E);
    const room = new THREE.Group(); room.name = 'legacy-interior'; hall.add(room);
    ctx.matchHall = { group: g, room: hall, legacy: room, dims: { roomW: f.rw, roomD: R, roomH: f.rh, openW, E, floorY } };
    const arena = box(12, 0.8, 12, M.graphiteDark, 0, 0.4, -10); arena.rotation.y = Math.PI / 4; room.add(arena);
    const bound = diamondOutline(12.6, 0.3, M.energyLight, 0.04); bound.position.set(0, 0.82, -10); room.add(bound);
    const boundRed = diamondOutline(11.0, 0.08, M.matchRed, 0.03); boundRed.position.set(0, 0.82, -10); room.add(boundRed);
    /* the boundary rises as four corner posts of energy — readable from the plaza, never a cage */
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; room.add(box(0.14, 3.2, 0.14, M.energyLight, Math.cos(a) * 8.9, 2.4, -10 + Math.sin(a) * 8.9)); }
    /* a soft pool of light on and around the platform */
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), M.energySoft); glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.06, -10); room.add(glow);
    const glowTop = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 8.5), M.energySoft); glowTop.rotation.x = -Math.PI / 2; glowTop.rotation.z = Math.PI / 4; glowTop.position.set(0, 0.86, -10); room.add(glowTop);
    /* spectator tiers along both sides */
    [-1, 1].forEach(s => { for (let t = 0; t < 3; t++) { room.add(box(1.6, 0.4 + t * 0.4, 12, M.graphiteLight, s * (10.2 + t * 1.6), (0.4 + t * 0.4) / 2, -10)); room.add(box(0.05, 0.02, 12, M.energySoft, s * (10.2 + t * 1.6) - s * 0.78, 0.41 + t * 0.4, -10)); } });
    /* two practice zones at the back of the hall (practice, not matches) */
    [-1, 1].forEach(s => { const pz = box(5, 0.25, 5, M.graphiteDark, s * 7, 0.125, -19); pz.rotation.y = Math.PI / 4; room.add(pz); const pb = diamondOutline(5.3, 0.06, M.energySoft, 0.02); pb.position.set(s * 7, 0.27, -19); room.add(pb); });
    out.match = g;
    /* where the local practice preview happens: the left practice zone, two marks 2.2 m apart, facing each other across x */
    ctx.practice = { centre: world(g, -7, floorY + 0.25, -E - 19), a: world(g, -8.1, floorY + 0.25, -E - 19), b: world(g, -5.9, floorY + 0.25, -E - 19), facingA: Math.PI / 2, facingB: -Math.PI / 2 };
    /* people explain the function: two facing each other on the platform, one observing, one waiting at FIND AN OPPONENT */
    ctx.residentSpots.push(spot(g, -2.3, floorY + 0.8, -E - 10, Math.PI / 2, { id: 'match-a', colour: 'green', physique: 0.8, sex: 'm', pose: 'spar', seed: 21, note: 'sparring on the MAH MATCH platform' }));
    ctx.residentSpots.push(spot(g, 2.3, floorY + 0.8, -E - 10, -Math.PI / 2, { id: 'match-b', colour: 'red', physique: 0.7, sex: 'f', pose: 'spar', seed: 22, note: 'sparring on the MAH MATCH platform' }));
    ctx.residentSpots.push(spot(g, -10.2, floorY + 0.4, -E - 6, Math.PI / 2, { id: 'match-observer', colour: 'purple', physique: 0.4, sex: 'f', pose: 'observe', seed: 23, note: 'observing from the tier' }));
    ctx.residentSpots.push(spot(g, -4.5, floorY, -E - 2.2, Math.PI, { id: 'match-waiting', colour: 'teal', physique: 0.3, sex: 'm', pose: 'stand', seed: 24, note: 'waiting at FIND AN OPPONENT (a fixture, not a queue)' }));
    ctx.entranceLights.push(world(g, 0, floorY + 8.5, 14));
    ctx.arenaLight = world(g, 0, floorY + 5, -E - 10);
  }

  /* ---------------- MAH MARKET — world commerce -------------------------- */
  {
    const g = new THREE.Group(); g.name = 'MAH MARKET';
    const S = SITES.market, { W, H, D, openW, openH, E, R } = S;
    g.position.set(S.x, 0, S.z); g.rotation.y = S.rotY; scene.add(g);
    const f = facade(ctx, g, { W, H, D, openW, openH, pierDepth: E, roomDepth: R, radius: S.radius, glassMullions: 4 });
    dressFacade(ctx, g, { W, H, D, openW, openH, E, seed: 3, windowsUpper: false, roofKit: false, wings: 'rear' });   /* the civic market: wings and canopy, terraces instead of a roof kit */
    crystallize(ctx, g, { W, H, D, openW, E, seed: 3, beacon: false, crown: false });   /* the terraces ARE the roof line */
    terraces(ctx, g, { W, H, D, E, seed: 3 });
    /* MAH MARKET is the SOCIAL, CIVIC one (§22): wide glazing and a busy interior, the most occupied
       of the three, so it reads as a place people are in rather than a shopfront */
    curtainWall(ctx, g, { W, H, sillY: openH + 1.2, topY: H - 0.8, bays: 8, floors: 2, z: 0.6, seed: 33, lit: 0.86 });
    action('market', 'MAH MARKET', 'destination', f.glass, world(g, 0, 0, 2), { view: 'market-entrance', copy: 'World marketplace. Preview navigation only: nothing is for sale here and no prices exist.' });
    /* a soft continuous sill light under the glass — the welcome line */
    const sill = box(openW, 0.05, 0.08, M.energyLight, 0, 0.06, -E + 0.3); g.add(sill); ctx.reflect(sill, 0.3);
    /* a lit fascia band under the entry canopy: the market is the WELCOMING destination, and it reads as
       lit architecture from the plaza rather than a dark hole under a bright lip */
    const fascia = new THREE.Mesh(new THREE.PlaneGeometry(openW + 1.6, 0.7), M.interiorSoft);
    fascia.position.set(0, openH + 0.75, 0.58); g.add(fascia);
    /* name only: the concept's sub-line ("… NUTRITION …") is not verified and is omitted */
    sign(ctx, g, { title: 'MAH MARKET', mark: true, width: 14.5, y: 11.4, z: 0.8 });
    /* interior: shelving zones with abstract merchandise, two display plinths */
    const room = g.children.find(c => c.isGroup && c.position.z === -E);
    const tints = [0x3f5a86, 0x7c8fb0, 0x2f7f8f, 0x8a7ab8, 0x5ea2c8];
    const goods = tints.map(t => new THREE.MeshStandardMaterial({ color: t, roughness: 0.4, metalness: 0.2, flatShading: true }));
    for (let r = 0; r < 4; r++) {
      const x = -7.5 + r * 5, z = -6;
      [0.9, 1.7, 2.5].forEach(y => room.add(box(4, 0.06, 0.6, M.platinum, x, y, z)));
      [-1.9, 1.9].forEach(dx => room.add(box(0.08, 2.7, 0.6, M.graphiteDark, x + dx, 1.35, z)));
      for (let k = 0; k < 9; k++) { const y = [0.93, 1.73, 2.53][k % 3] + 0.17; room.add(box(0.45 + (k % 3) * 0.12, 0.3 + (k % 2) * 0.12, 0.35, goods[(k + r) % goods.length], x - 1.4 + (k % 3) * 1.1 + (r % 2) * 0.3, y, z)); }
    }
    [[-4, -2.2], [4, -2.2]].forEach(([x, z]) => { room.add(box(1.4, 1.0, 1.4, M.graphiteLight, x, 0.5, z)); const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), M.energySoft); crystal.position.set(x, 1.45, z); room.add(crystal); });
    out.market = g;
    ctx.residentSpots.push(spot(g, 2.5, 0, -E - 3.6, Math.PI, { id: 'market-visitor', colour: 'violet', physique: 0.5, sex: 'f', pose: 'observe', seed: 31, note: 'examining MAH MARKET' }));
    ctx.entranceLights.push(world(g, 0, 6.5, 11));
  }

  return out;
}

/* helpers: a resident spot / a light position expressed in world space */
function world(group, x, y, z) { group.updateMatrixWorld(true); return group.localToWorld(new THREE.Vector3(x, y, z)); }
function spot(group, x, y, z, facingLocal, extra) {
  const p = world(group, x, y, z);
  return Object.assign({ x: p.x, y: p.y, z: p.z, facing: facingLocal + group.rotation.y }, extra);
}
