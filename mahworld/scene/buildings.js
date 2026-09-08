/* MAHPLAZA :: THE THREE DESTINATIONS
   MAH GYM (left) — a training facility. MAH MATCH (centre, the anchor) — the
   fighting / sparring facility with a visible arena. MAH MARKET (right) — a
   low, welcoming world marketplace. Softer, simpler, engineered architecture:
   broad rounded masses, chamfered corners, restrained square-diamond motifs,
   a few faceted panel regions, recessed glass entrances that reveal enough
   interior to explain the function.

   Each facade is composed, not carved: a full body mass behind, an interior
   room in front of it (open toward the plaza), a glass line across the
   opening, and two piers + a lintel framing it at the front.

   v8 — WARM INSIDE, PUNGENT OUTSIDE. The floor is black platinum now and the direction is CONTRAST,
   which needs two temperatures and not one: every room, bay, shopfront and training floor these three
   buildings show the plaza is WARM interior light, and the only cold light on them is the district's
   single saturated accent, used large — a portal reveal, a signage band, a canopy soffit. The masses
   do not move; what changed is what comes out of them. One hue per destination, taken from
   ctx.districtAccent so the pools ground.js already laid on the floor are the colour of the light
   that made them:
     MAH GYM    CYAN     the open glazed frontage; its canopy soffit is the widest single accent
                         gesture in the plaza, and cyan is what a lit soffit reads as over warm glass
     MAH MATCH  BLUE     the anchor. Deep blue is the coldest, most architectural hue in the family,
                         which is what a 38 m mass wants; its small competitive RED stays as it was
     MAH MARKET MAGENTA  the social one, the furthest right and the warmest-lit inside, so the accent
                         that separates hardest from its own interiors carries its signage band */
import * as THREE from '../vendor/three/three.module.min.js';
import { softMass, signTexture, diamondOutline, chamferBox, windowGrid, fobMark, canvasTexture, apertureField} from './materials.js';

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

/* ================= v8 §02 — EVERY OUNCE OF LIGHT HAS A JOB =========================================
   An emissive material is a bright rectangle: it makes light in the image and none in the world, and
   faking that is the failure the direction is pointing at. So every emitter this file places is
   accompanied by at least two real answers —
     a WASH on the surface it is mounted to, carrying the emitter's own hue through a falloff map, so
       the light is bright at the source and gone within a couple of metres rather than a flat tint;
     a POOL on the black platinum floor beneath it (ground.js owns the floor and publishes
       ctx.lightPool, so the answer is laid on the surface that actually shows it);
     the ADJACENT GEOMETRY tinted toward it — a jamb, a soffit, a stair tread, a mullion, a sill;
     the MIRRORED COPY under the deck (ctx.reflect), which at roughness 0.055 is most of what a viewer
       actually sees of any bright thing in this world.
   THIS FILE ADDS NO THREE.Light. The assembly owns the light budget and already spends it here — an
   entrance point light per destination and one per interior room — so what was missing was never more
   sources, it was the world responding to the ones that exist. */
const _tintC = new THREE.Color();
function tint(geo, hex) {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  _tintC.set(hex);
  for (let i = 0; i < n; i++) { a[i * 3] = _tintC.r; a[i * 3 + 1] = _tintC.g; a[i * 3 + 2] = _tintC.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
/* A wash quad, positioned and oriented at the call site. `hwash` falls off across its HEIGHT (a band,
   a window ribbon, a sill line); `vwash` is the same quad turned a quarter turn so it falls off across
   its WIDTH, for the two jambs of a vertical reveal. Both take the emitter's hue on their vertices, so
   every wash in a building shares ONE material and ONE draw call however many hues it carries. */
function hwash(w, h, hex) { return tint(new THREE.PlaneGeometry(w, h), hex); }
function vwash(w, h, hex) { return tint(new THREE.PlaneGeometry(h, w).rotateZ(Math.PI / 2), hex); }
/* washes are quads, so they need UVs (the falloff map) and vertex colours (the hue) — neither of
   which mergeParts carries, and giving it either would silently change every merged mesh in this file
   that shares a roughness map. A second, narrower merge is the honest way to have both. */
function flat(geo) { const f = geo.index ? geo.toNonIndexed() : geo; if (f !== geo) geo.dispose(); return f; }
function mergeWash(list) {
  /* de-index FIRST and count after: a PlaneGeometry reports four vertices indexed and six unindexed,
     and sizing the buffers off the indexed count silently truncates the merge */
  const parts = list.map(flat);
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
  let o = 0;
  for (const f of parts) {
    const c = f.attributes.position.count;
    pos.set(f.attributes.position.array, o * 3);
    if (f.attributes.uv) uv.set(f.attributes.uv.array, o * 2);
    if (f.attributes.color) col.set(f.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + c) * 3);
    o += c; f.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
/* THE FALLOFF every wash is cut from: opaque along the emitter's line, gone at the far edge of the
   quad, with the last 14 % of the run faded so a band of light does not end on a hard edge. One
   32 x 64 canvas and one material for the whole district. */
function washKit(ctx) {
  if (ctx.facadeWash) return ctx.facadeWash;
  const tex = canvasTexture(32, 64, (c, w, h) => {
    const v = c.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(0.34, 'rgba(255,255,255,0.55)');
    v.addColorStop(0.5, 'rgba(255,255,255,1)');
    v.addColorStop(0.66, 'rgba(255,255,255,0.55)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = v; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-in';
    const u = c.createLinearGradient(0, 0, w, 0);
    u.addColorStop(0, 'rgba(0,0,0,0)'); u.addColorStop(0.14, 'rgba(0,0,0,1)');
    u.addColorStop(0.86, 'rgba(0,0,0,1)'); u.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = u; c.fillRect(0, 0, w, h);
  });
  const wall = new THREE.MeshBasicMaterial({ color: 0xffffff, map: tex, vertexColors: true, transparent: true, opacity: 0.52, depthWrite: false, toneMapped: true, fog: true });
  wall.name = 'facade-wash';
  /* THE ROOMS. Every lit bay in the district shares this one material and carries its own temperature
     and brightness on its vertices, so a curtain wall of forty rooms is one draw call and no two of
     them are the same value — which is what makes a facade read as occupied rather than as a light
     box. The material's own colour is the clock: it multiplies every baked room at once. */
  const room = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: true, fog: true });
  room.name = 'facade-rooms';
  const kit = { tex, wall, room, base: 0.52 };
  /* a wash is light landing on a surface, and a lit room is still lit at noon — just not against a
     black sky. Both fade with the day exactly as materials.js fades the interior whites. */
  ctx.timeHooks.push(s => {
    const d = s && typeof s.daylight === 'number' ? s.daylight : 0;
    wall.opacity = kit.base * (1 - d * 0.6);
    room.color.setScalar(1 - d * 0.35);
  });
  ctx.facadeWash = kit; return kit;
}
/* the answer bucket for one destination: the emitters it owns, the washes that prove them, and the
   warm fittings inside it. Each closes into ONE mesh, whatever the part count. */
function answers(ctx, id) {
  const key = (ctx.districtAccent && ctx.districtAccent[id]) || { gym: 'accentCyan', match: 'accentBlue', market: 'accentMagenta' }[id];
  const mat = ctx.M[key] || ctx.M.energy;
  return { id, key, mat, hue: mat.emissive ? mat.emissive.getHex() : 0x7fc6ff, glow: [], wash: [], warm: [] };
}
function closeAnswers(ctx, g, a) {
  const M = ctx.M;
  const em = merged(g, a.glow, a.mat, a.id + '-accent', false);
  if (em) ctx.reflect(em, 0.34);            /* one mirrored copy for every accent gesture on the facade */
  const wm = merged(g, a.warm, M.interior, a.id + '-warm-fittings', false);
  if (wm) ctx.reflect(wm, 0.22);
  if (a.wash.length) {
    const w = new THREE.Mesh(mergeWash(a.wash), washKit(ctx).wall);
    w.name = a.id + '-wash'; w.renderOrder = 4; g.add(w);
  }
}

/* Secondary massing + tertiary detail for a destination facade (brief §12–§14): wings, canopy, parapet, roof kit,
   upper window courses, entrance light housings, vents, seams. Everything merged per material; two InstancedMesh window grids. */
function dressFacade(ctx, g, o) {
  const { M } = ctx;
  const { W, H, D, openW, openH, E, floorY = 0, wings = true, canopy = true, roofKit = true, windowsUpper = true, seed = 1, ans = null } = o;
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
      part(trim, coping(wingW - 0.4, 0.2, 0.3, 0.05), sd * (W / 2 + wingW / 2 - 0.6), wingH - 0.1, -(E + 2.4) + 0.35);
      part(structural, coping(wingW * 0.55, 1.6, wingD * 0.5, 0.08), sd * (W / 2 + wingW / 2 - 0.6), wingH + 0.8, -(E + 2.4) - wingD * 0.35);
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
    part(trim, coping(rw + 0.4, 0.2, rd + 0.4, 0.06), 0, rh - 0.1, rz);
    part(structural, coping(rw * 0.5, 2.0, rd * 0.5, 0.14), 0, rh + 1.0, rz - rd * 0.14);
  }
  /* SECONDARY — entry canopy: a chamfered slab over the opening with a lit underside and two brackets */
  if (canopy) {
    const cw = openW + 2.4, cd = 3.2, cy = floorY + openH + 0.35;
    part(structural, coping(cw, 0.36, cd, 0.08), 0, cy, cd / 2 - 0.2);
    part(trim, chamferBox(cw + 0.1, 0.06, 0.12, 0.02), 0, cy - 0.21, cd - 0.26);
    const under = new THREE.Mesh(new THREE.PlaneGeometry(cw - 0.8, cd - 0.9), M.interior); under.rotation.x = Math.PI / 2; under.position.set(0, cy - 0.19, cd / 2 - 0.2); g.add(under);
    ctx.reflect(under, 0.26);
    /* the canopy's lit underside is the entrance's own light, so it lands on the two things directly
       beneath it: the head of the shopfront glazing behind, and the ground the visitor stands on */
    if (ans) {
      const face = hwash(cw - 0.4, 2.4, M.interiorSoft.color); face.translate(0, cy - 1.1, 0.5); ans.wash.push(face);
      /* the ground under a canopy is the APRON, whose slab top is 0.42 (ground.js) — a wash laid at
         the building's own floor level would be buried under the doorstep it is lighting */
      const drop = hwash(cw - 0.6, 4.8, M.interiorSoft.color).rotateX(-Math.PI / 2); drop.translate(0, 0.47, 5.6); ans.wash.push(drop);
      if (ctx.lightPool) { const p = world(g, 0, 0, cd + 3.4); ctx.lightPool({ x: p.x, y: 0.45, z: p.z, rx: cw + 6, rz: 10, rot: g.rotation.y, hue: M.interiorSoft.color, k: 0.3 }); }
    }
    [-1, 1].forEach(sd => part(structural, chamferBox(0.22, 1.4, 0.22, 0.03), sd * (cw / 2 - 0.5), cy + 0.85, 0.6, 0, 0.42));
    ctx.entranceLights.push(world(g, 0, cy - 0.6, cd * 0.6));
  }
  /* SECONDARY — parapet and roof kit: the silhouette stops being a blank slab */
  if (roofKit) {
    part(trim, coping(W - 0.6, 0.22, 0.34, 0.05), 0, H - 0.11, -0.05);
    part(trim, coping(0.34, 0.22, D - 0.6, 0.05), -W / 2 + 0.3, H - 0.11, -(E + D / 2));
    part(trim, coping(0.34, 0.22, D - 0.6, 0.05), W / 2 - 0.3, H - 0.11, -(E + D / 2));
    const R = ((seed * 9301 + 49297) % 233280) / 233280;
    part(structural, coping(W * 0.22, 1.2, D * 0.18, 0.08), -W * 0.26, H + 0.6, -(E + D * 0.45));
    part(structural, coping(W * 0.16, 2.0, D * 0.14, 0.08), W * (0.18 + R * 0.1), H + 1.0, -(E + D * 0.55));
    for (let i = 0; i < 6; i++) part(dark, new THREE.BoxGeometry(W * 0.14, 0.08, 0.06), W * (0.18 + R * 0.1), H + 0.35 + i * 0.28, -(E + D * 0.55) + D * 0.07);   /* louvred plant screen */
    part(trim, new THREE.CylinderGeometry(0.06, 0.09, 4.2, 6), W * 0.36, H + 2.1, -(E + D * 0.3));
    part(composite, coping(1.2, 0.9, 1.2, 0.06), -W * 0.05, H + 0.45, -(E + D * 0.7));
  }
  /* TERTIARY — THE UPPER OPENINGS (R167 §5).
     This used to be windowGrid(): cols x rows of identical 1.0 x 1.5 cells at a fixed 1.0/1.2
     spacing, on both piers of every dressed building in the world. It is the exact language R167
     retires — at street range the repetition is the loudest thing on the facade, and no amount of
     per-cell brightness variation hides a lattice.

     The pier now takes a COMPOSED APERTURE FIELD instead: a handful of large openings from the
     shared tapered-arch profile, placed with enforced solid wall between them and a hard ceiling on
     how much of the pier may be glass. Measured across five facade shapes and three seeds, it lands
     between 4.5% and 19.9% glazing with no facade ever putting three openings at one height — where
     the grid was a fixed lattice at far higher coverage.

     It is also CHEAPER: two instanced meshes carrying three or four apertures, against one carrying
     several dozen cells. Fewer instances, fewer triangles, one extra draw. */
  if (windowsUpper) {
    const pierH = Math.max(4, H - (floorY + openH) - 1.6);
    [-1, 1].forEach(sd => {
      /* a tall narrow pier wants the slit family; a squat one wants the panoramic. The building
         chooses from its own proportion rather than from a switch someone has to remember. */
      const families = pierH > pierW * 1.6 ? ['TAPERED'] : ['PANORAMIC', 'TAPERED'];
      const field = apertureField({
        W: pierW, H: pierH, families, seed: seed * 3 + sd, sillY: 1.4, depth: 0.42,
        glassMaterial: M.interiorSoft || M.panelLit, frameMaterial: M.structural
      });
      field.position.set(sd * (openW / 2 + pierW / 2), floorY + openH + 0.8 + pierH / 2, 0.34);
      g.add(field);
      if (ctx.apertureFields) ctx.apertureFields.push(field);
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

/* A square-diamond standing upright in the XY plane, as four bars on the edge midpoints of a square
   turned 45 degrees. It goes into a merge bucket rather than returning a Group of four meshes: the
   figure is one piece of built work, so it should cost one draw call and — this is the part that
   actually showed — cast ONE reflection. As a Group, ctx.reflect could only ever be handed a single
   bar of it, and three quarters of every diamond in this file went missing from the floor. */
function diamondBars(list, size, bar, depth, cx, cy, cz) {
  const half = size / 2;
  for (let i = 0; i < 4; i++) {
    const t = i * Math.PI / 2 + Math.PI / 4;                       /* the edge midpoints of the turned square */
    part(list, chamferBox(size, bar, depth, Math.min(0.05, bar / 3)), cx + Math.cos(t) * half, cy + Math.sin(t) * half, cz, 0, 0, t + Math.PI / 2);
  }
  return list;
}
/* v5 §07: NOTHING in MAHWORLD has an un-bevelled 90° corner. Every box in this module is chamfered —
   a hard edge is what makes a prototype read as a prototype, and a caught edge is what makes a
   surface read as manufactured. The chamfer scales with the part, so a 0.06 m bar still turns. */
function box(w, h, d, mat, x, y, z) {
  const c = Math.min(0.07, w / 4, h / 4, d / 4);
  const m = new THREE.Mesh(chamferBox(w, h, d, c), mat); m.position.set(x, y, z); return m;
}

/* ================= LAW 6 — THE SILHOUETTE IS ROUND, THE SURFACE IS CRYSTALLINE ======================
   clouds.js states the rule and this file is where it costs the most, because these three masses are
   the architecture closest to every camera. Three tools, and none of them SMOOTHS anything: each one
   trades a sharp arris for one or two more FACETS, which is the direction's own "big designed facets".

   1. THE COPING. chamferBox extrudes along Z, so its chamfer wraps the front and the back of a member
      and leaves the two arrises that run WITH the extrusion square. On a vertical member that is
      exactly right — the turn a viewer reads is the one facing the plaza. On a HORIZONTAL one it is
      the wrong way round: a parapet, a terrace deck, a cornice cap, a sill or a canopy is read
      against the sky and from an angle, so the arris that matters is the whole PLAN OUTLINE. The
      same box extruded VERTICALLY puts the chamfer there instead — every plan edge gains a 45° facet
      top and bottom — for the identical 28 triangles and the identical bounding box, so no derived
      height, seam or neighbour in this file moves by a millimetre. It is also the cheapest LAW 1
      insurance there is: it converts the outer strip of an up-facing plane, which reflects the
      near-black zenith, into a tilted one that reflects the lit horizon.

   2. THE TWO-COURSE CROWN. Four slabs at ONE tilt give a crown whose silhouette tangent is the same
      from the eaves to the cap: the roofline runs dead straight and stops on a hard edge, which is
      the cone's defect one storey tall. terrain.js's massif() header states the cure — "a cone's
      tangent is the same all the way to its point" — so the profile is built in TWO courses, the
      lower nearly upright so the mass is held OUT (not bubbled in), the upper leaning five times
      harder so the tangent TURNS toward the horizontal before the cap. The cap is then a small flat
      FACET running right round rather than an arris, which is the blunt-tip rule: a blunt tip holds
      a highlight and an edge aliases into a hairline.

   3. THE MITRE. Two members meeting at a right angle make one sharp arris; cutting the corner at 45°
      replaces it with a THIRD PLANE lit differently from both. That is more crystalline, not less —
      it is why a cut stone has corners at all. It is applied where a square corner is actually read:
      crown corners against the sky, sign surrounds, and the head of MAH MATCH's portal frame.

   NOT TOUCHED, deliberately: every square diamond. The keystone, the banner emblems, the beacon
   heads, the sign's reserved mark and MAH MATCH's diamond platform are the MAHFITT figure and keep
   their points (law 6's one exception). Nothing here raises a segment count toward a sphere. */

/* A COPING: chamferBox turned a quarter so its chamfer wraps the plan outline. Same 28 triangles,
   same bounding box, so it is a drop-in wherever the member is horizontal. */
function coping(w, h, d, c) { return chamferBox(w, d, h, c).rotateX(-Math.PI / 2); }

/* THE CROWN, in two courses with its four corners mitred. `o` is the ring the crown stands on:
   centreline half-extents ax / az about (0, zc), the vertical run yBase → yTop, and the blade
   thickness t. Returns how far the profile has leaned in by the top, so the caller can seat the cap
   band on the profile it actually built rather than on a guessed inset. */
const CROWN_SPLIT = 0.56, CROWN_LO = 0.11, CROWN_HI = 0.55;   /* the turn: 6° held, then 31° */
function crownRing(list, o) {
  const { ax, az, zc, yBase, yTop, t = 1.5 } = o;
  /* the mitre, scaled to the ring and hard-bounded: a corner cut wider than the ring's own half-side
     would leave the four blades with negative length, which chamferBox turns into a degenerate shape
     rather than an error. MAH GYM lands on the 1.7 m ceiling, the tower on 0.93 m of its 4.2 m side. */
  const k = Math.min(o.k != null ? o.k : 1.7, 0.22 * Math.min(ax, az), 0.4 * (Math.min(ax, az) + t / 2));
  const yMid = yBase + (yTop - yBase) * CROWN_SPLIT;
  let off = 0;
  for (const [y0, y1, th] of [[yBase, yMid, CROWN_LO], [yMid, yTop, CROWN_HI]]) {
    const span = y1 - y0, h = span / Math.cos(th), lean = (t / 2) / Math.cos(th);
    const mid = off + (span / 2) * Math.tan(th);        /* the profile's inward lean at this course's mid-height */
    const hx = ax + t / 2 - mid - lean, hz = az + t / 2 - mid - lean, yc = (y0 + y1) / 2;
    /* BOTH PAIRS OF BLADES TAKE THE CHAMFER ON THEIR LONG TOP ARRIS, which is the same orientation
       rule coping() is built on, applied to the members that carry the crown's own roofline. A blade
       is read along its length, so the edge that must turn is the one running WITH it. chamferBox
       bevels only the eight edges bounding the two ends of its extrusion, so the axis it is extruded
       along decides which four arrises stay square: extruded across the thickness (the front and back
       blades) the long top-outer arris turns; extruded along the length (which is how the side blades
       were written) it does NOT, and a 25–32 m square 90° edge is left at the very top of the crown —
       the one place this whole pass exists to blunt. The side blades are therefore built the same way
       round as the front and back and quarter-turned into place: identical 28 triangles, identical
       bounding box, and the four square arrises move to the 1.5 m blade ends, where the corner mitre
       covers them. */
    for (const sz of [-1, 1]) part(list, chamferBox(2 * hx + t - 2 * k, h, t, 0.06), 0, yc, zc + sz * hz, 0, -sz * th);
    for (const sx of [-1, 1]) part(list, chamferBox(2 * hz + t - 2 * k, h, t, 0.06).rotateY(Math.PI / 2), sx * hx, yc, zc, 0, 0, sx * th);
    /* THE FOUR MITRES. Tilted about X FIRST and yawed after, so each one leans along its own diagonal
       instead of along an axis — a corner facet that leaned north would read as a folded plate.
       The length and the inset are DERIVED, not chosen, and getting them wrong is how a chamfer turns
       into a spike: a facet k·√2 long, set back k/2 + t/(2√2) along the diagonal, has its outer face
       land exactly on the two shortened blade ends. Measured, a facet one thickness longer than that
       projected 0.53 m PAST the crown's own outer face at every corner — four diagonal fins sticking
       out of the thing being rounded, which is the defect and not the fix. */
    const cg = chamferBox(k * Math.SQRT2, h, t, 0.06).rotateX(-th);
    const inset = k / 2 + t / (2 * Math.SQRT2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      part(list, cg, sx * (hx + t / 2 - inset), yc, zc + sz * (hz + t / 2 - inset), Math.atan2(sx, sz));
    }
    cg.dispose();
    off += span * Math.tan(th);
  }
  return off;
}
/* the crown's blunt tip: a cap band running the whole ring, in coping form so the band itself turns
   at every plan edge. `deck` (optional) closes the middle — a crown ring left open is a hole. */
function crownCap(list, o, off, capH, capD, deck) {
  const { ax, az, zc, yTop, t = 1.5 } = o;
  const hx = ax + t / 2 - off - capD / 2, hz = az + t / 2 - off - capD / 2, y = yTop + capH / 2 - 0.02;
  for (const sz of [-1, 1]) part(list, coping(2 * hx + capD, capH, capD, capH * 0.28), 0, y, zc + sz * hz);
  for (const sx of [-1, 1]) part(list, coping(capD, capH, 2 * hz - capD, capH * 0.28), sx * hx, y, zc);
  if (deck) part(deck, coping(2 * hx - capD, capH * 0.7, 2 * hz - capD, capH * 0.18), 0, y - capH * 0.12, zc);
}
/* THE MITRED FRAME: four bars round an opening, each stopped `k` short of the corner, and a fifth
   bar across the corner at 45°. Built in the XY plane facing +Z, in the caller's own merge bucket,
   so a chamfered surround costs no draw call of its own. */
function mitreFrame(list, o) {
  const { x = 0, y = 0, z = 0, hw, hh, bar, depth, c = 0.045, k, head = true, cill = true } = o;
  const b2 = bar / 2, S2 = Math.SQRT2;
  const kk = Math.min(k, hh + b2 - 0.05, hw + b2 - 0.05);
  /* the members stop where the mitre starts, so the OUTER ENVELOPE (hw + bar/2, hh + bar/2) is
     unchanged and only its corner is cut — a frame that grew when it was chamfered would move every
     derived height around it. */
  if (head) part(list, chamferBox(2 * (hw + b2 - kk), bar, depth, c), x, y + hh, z);
  if (cill) part(list, chamferBox(2 * (hw + b2 - kk), bar, depth, c), x, y - hh, z);
  for (const sx of [-1, 1]) part(list, chamferBox(bar, 2 * (hh + b2 - kk), depth, c), x + sx * hw, y, z);
  /* the mitre bar itself: k·√2 long and set back k/2 + bar/(2√2) − bar/2 from the member centreline,
     which is the one pair of numbers that lands its outer face exactly on the two shortened ends.
     Longer, and the bar projects past the frame — a diagonal spike where a chamfer was wanted. */
  const inset = kk / 2 + bar / (2 * S2) - b2;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    if ((sy > 0 && !head) || (sy < 0 && !cill)) continue;
    part(list, chamferBox(kk * S2, bar, depth, c),
      x + sx * (hw - inset), y + sy * (hh - inset), z, 0, 0, -sx * sy * Math.PI / 4);
  }
  return kk;
}

/* ---- SILHOUETTE TREATMENTS (v5 §06 / §08): one per destination, so the three masses differ in
   PROFILE and not only in signage. Each merges per material; none adds a light. -------------- */

/* MAH GYM — BROAD. A long curved glazed canopy sweeping the whole frontage on slim chromium
   columns, with a brushed-platinum fascia and a glazed clerestory band above the opening. The
   read from the plaza is horizontal: a wide, open, well-lit training frontage. */
function broadCanopy(ctx, g, o) {
  const { M } = ctx;
  const { W, H, openH, floorY = 0, seed = 1, ans = null } = o;
  const struct = [], trim = [], dark = [];
  const cw = W + 5.2, depth = 4.6, cy = floorY + openH + 1.35, segs = 22;
  /* THE CANOPY'S PLAN PROFILE (law 6). Swept at ONE width the canopy is a 43 x 4.6 m rectangle, and a
     rectangle reaching 4.6 m out over the approach presents its two outer corners as points: from
     anywhere but dead ahead they are the sharpest thing on MAH GYM. The width now falls away over the
     last half of the reach on a convex curve — held full where the canopy is still against the
     building, turning as it reaches out — so the plan OUTLINE turns instead of stopping on a corner.
     It is still twenty-two straight segments: the SURFACE stays a run of flat facets and only the
     ENVELOPE they describe is round, which is the whole of the rule. Costs nothing: the same 22
     parts at slightly different widths. */
  const wOf = t => cw * (1 - 0.085 * Math.pow(Math.max(0, (t - 0.52) / 0.48), 1.7));
  /* the canopy shell: a shallow arc swept across the frontage, built from segment planes so it is a
     CURVE and not a folded plate. Glass over, brushed fascia under. */
  const shell = [], soffit = [];
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const zOf = t => depth * t, yOf = t => -1.35 * t * t;         /* the sweep falls as it reaches out */
    const zm = (zOf(t0) + zOf(t1)) / 2, ym = (yOf(t0) + yOf(t1)) / 2;
    const seg = Math.hypot(zOf(t1) - zOf(t0), yOf(t1) - yOf(t0));
    const tilt = Math.atan2(yOf(t1) - yOf(t0), zOf(t1) - zOf(t0));
    const sw = wOf((t0 + t1) / 2);
    shell.push([sw, 0.14, seg, 0, cy + ym, zm, -tilt]);
    soffit.push([sw - 0.5, 0.05, seg * 0.98, 0, cy + ym - 0.12, zm, -tilt]);
  }
  shell.forEach(([w, h, d, x, y, z, rx]) => part(struct, chamferBox(w, h, d, 0.04), x, y, z, 0, rx));
  /* THE SOFFIT IS THE GYM'S ONE BIG GESTURE (law 5). A canopy's underside faces the ground: a polished
     grade there mirrors the dark floor and the entrance goes black, so this plane was always going to
     be light rather than metal. v8 gives that light the district's hue and spends it at full size —
     43 m of frontage by 4.6 m of reach is the widest single piece of colour in the plaza, and a cold
     saturated soffit over a warm-lit training floor IS the contrast the direction is describing.
     Twenty-two segments, merged: a curve costs one draw call. */
  soffit.forEach(([w, h, d, x, y, z, rx]) => {
    const pl = flat(new THREE.PlaneGeometry(w, d));
    pl.rotateX(Math.PI / 2 + rx); pl.translate(x, y - 0.06, z);
    (ans ? ans.glow : struct).push(pl);
  });
  /* the leading edge: one mirror-grade nosing running the full width — the canopy's bright line. It
     takes the TIP width so it dies into the turned plan corner instead of overhanging it, and it is
     a coping so the bright line turns at both ends and along the back as well as the front. */
  part(trim, coping(wOf(1) + 0.3, 0.2, 0.34, 0.07), 0, cy - 1.42, depth + 0.06);
  /* HOW THE WORLD ANSWERS THE SOFFIT (law 2), in three places a viewer can actually see:
       the fascia   the vertical face under the nosing takes the soffit's colour, which is the line the
                    eye follows across the whole frontage;
       the plinth   the brushed deck below is horizontal and low-metalness, so it TAKES this light —
                    a pool of the soffit's hue lying along the base of the building;
       the floor    a wide, weak pool of the same hue on the black platinum out in front (ground.js
                    owns the floor and this is its published hook), plus the mirrored copy of the
                    soffit itself, which on a near-mirror is most of what the eye reads. */
  if (ans) {
    const fascia = hwash(wOf(1) + 0.3, 1.1, ans.hue); fascia.translate(0, cy - 1.62, depth + 0.26); ans.wash.push(fascia);
    const deck = hwash(W + 6.2, 2.2, ans.hue).rotateX(-Math.PI / 2); deck.translate(0, floorY + 0.47, depth + 0.9); ans.wash.push(deck);
    if (ctx.lightPool) { const p = world(g, 0, 0, depth + 2.6); ctx.lightPool({ x: p.x, y: 0.45, z: p.z, rx: W + 10, rz: 12, rot: g.rotation.y, hue: ans.hue, k: 0.3 }); }
  }
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
  /* the clerestory is the training hall seen from the plaza, so its light is WARM and it lands on the
     nine mullions crossing it and on the wall above and below — the spill is how a viewer knows the
     band is a window into a room rather than a painted stripe */
  if (ans) {
    const cle = hwash(W - 5.0, 3.6, M.interiorSoft.color); cle.translate(0, floorY + openH + 4.3, 0.62); ans.wash.push(cle);
    ctx.reflect(glow, 0.26);
  }
  /* a low brushed plinth running the full frontage: the broad base the mass sits on. A coping, so its
     deck turns at all four plan edges — the two ends included, which is where a 45 m plinth otherwise
     stops on a square block standing in the open. */
  part(dark, coping(W + 7, 0.44, 1.6, 0.12), 0, floorY + 0.22, depth + 1.1);
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
    /* THE TERRACE STACK IS MAH MARKET'S SILHOUETTE (law 6), so every member in it is a COPING: a
       terrace read against the sky is read along its whole PLAN outline, and chamferBox's default
       orientation leaves exactly that outline square — an 8 m arris along each deck's flank, three
       of them stacked, which is the sawtooth this destination was showing. Turned, each deck gains a
       0.34 m facet right round its top and bottom: the step still reads as a step, but the step now
       has a lit turn on it instead of a knife edge. Same triangles, same bounding box. */
    part(struct, coping(w, th, d, 0.34), 0, y + th / 2, zc);
    /* the terrace deck's front edge and its rail: posts every three metres plus a top bar */
    part(trim, coping(w + 0.5, 0.16, 0.42, 0.06), 0, y + th, zc + d / 2 + 0.1);
    const posts = Math.max(3, Math.round(w / 3));
    for (let k = 0; k <= posts; k++) part(trim, chamferBox(0.07, 0.95, 0.07, 0.02), -w / 2 + k * (w / posts), y + th + 0.48, zc + d / 2 + 0.08);
    part(trim, coping(w + 0.2, 0.07, 0.07, 0.02), 0, y + th + 0.95, zc + d / 2 + 0.08);
    /* a planted trough along the terrace face, and two service volumes set back */
    part(dark, coping(w * 0.72, 0.5, 0.7, 0.1), 0, y + th + 0.25, zc + d / 2 - 0.7);
    if (i < 2) for (const sd of [-1, 1]) part(dark, coping(w * 0.16, 1.1, d * 0.2, 0.14), sd * w * 0.3, y + th + 0.55, zc - d * 0.28);
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
  /* the shoulder: one wide banded transition so the tower GROWS out of the podium. Both members are
     copings — a shoulder and its band are read against the sky from 74 m away, so the arris that
     matters is the plan outline and not the front turn. */
  part(struct, coping(tw + 4.4, 1.5, td + 4.4, 0.4), 0, H + 0.75, zc);
  part(trim, coping(tw + 5.0, 0.18, td + 5.0, 0.07), 0, H + 1.5, zc);
  /* the shaft, tapering as it climbs — four stacked sections, each narrower than the one below */
  let y = H + 1.5, w = tw, d = td;
  for (let i = 0; i < 4; i++) {
    const sh = th / 4;
    part(struct, chamferBox(w, sh, d, 0.5), 0, y + sh / 2, zc);
    part(trim, coping(w + 0.24, 0.14, d + 0.24, 0.05), 0, y + sh, zc);   /* the setback band turns on all four sides */
    /* corner fins: vertical chamfered strips that draw the height and catch the moon on their turn */
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      part(dark, chamferBox(0.85, sh - 0.3, 0.85, 0.2), sx * (w / 2 - 0.2), y + sh / 2, zc + sz * (d / 2 - 0.2));
      part(trim, chamferBox(0.11, sh - 1.0, 0.11, 0.03), sx * (w / 2 + 0.16), y + sh / 2, zc + sz * (d / 2 + 0.16));
    }
    y += sh; w *= 0.9; d *= 0.9;
  }
  /* the lit slot: one recessed vertical channel up the plaza face, the tower's single light line */
  part(dark, chamferBox(1.5, th - 1.0, 0.5, 0.14), 0, H + 2 + (th - 1) / 2, zc + td / 2 + 0.2);
  const slot = new THREE.Mesh(chamferBox(0.7, th - 2.4, 0.16, 0.05), M.energy);
  slot.position.set(0, H + 2 + (th - 1) / 2, zc + td / 2 + 0.42); g.add(slot); ctx.reflect(slot, 0.3);
  /* THE CROWN, in two courses with its four corners mitred (law 6). It was four planes at one tilt
     meeting at four square corners and capped by a solid slab: the highest silhouette in the district
     ran dead straight to a hard arris and stopped, which is the cone's fault at 65 m. Now the profile
     turns — 6° held, then 31° — the plan is an octagon rather than a square, and the top ends on a
     flat cap FACET instead of an edge.
     The cap also stops being an 88 m² slab of mirror chromium lying face-up at the zenith, which
     under LAW 1 rendered black: it is a mirror RING, whose vertical and 45° faces genuinely see the
     horizon band, closed by a low-metalness DECK that can take diffuse light. That deck is the only
     new draw call in this file, and it buys back the tower's black hat. */
  const crownH = 3.4;
  const ring = { ax: w / 2 - 0.7, az: d / 2 - 0.7, zc, yBase: y, yTop: y + crownH, t: 1.5 };
  crownCap(trim, ring, crownRing(struct, ring), 0.2, 0.62, lit);
  /* the mast and its square-diamond head: MAH MATCH's beacon, the highest thing in the district */
  part(trim, new THREE.CylinderGeometry(0.13, 0.2, 7.0, 8), 0, y + crownH + 3.5, zc);
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(1.05, 0), M.energyLight);
  head.position.set(0, y + crownH + 7.6, zc); head.scale.set(1, 1.3, 0.34); g.add(head);
  (ctx.beacons = ctx.beacons || []).push({ position: world(g, 0, y + crownH + 7.6, zc), building: g.name });
  ctx.matchRoof = world(g, 0, y + crownH, zc);
  merged(g, struct, M.structural, 'match-tower', true);
  merged(g, trim, M.chromeMirror || M.trim, 'match-tower-catches', false);
  merged(g, dark, M.graphiteMetal || M.graphiteDark, 'match-tower-fins', true);
  /* LAW 1's horizontal partner: the crown deck is the one UP-FACING plane on this tower, so it wears
     the low-metalness platinum that takes diffuse light rather than a mirror that returns the zenith. */
  merged(g, lit, M.platinumLit || M.composite, 'match-tower-crown-deck', false);
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
    /* the chromium frame: mirror-grade bars with mounting depth, vertical and tilted faces only,
       which is where a mirror grade actually reaches the horizon band and reads */
    /* the frame sits BEHIND the wordmark plane: mounting depth must frame the letters, not bury them */
    /* v11 §06 — THE SURROUND IS MITRED, AND IT IS ONE MESH. The four bars butted into four square
       corners: at 15 m wide and six storeys up, those corners are the sharpest thing on the elevation
       and they are what the eye lands on first, because the sign is what it is looking for. Each bar
       now stops short and a fifth bar crosses the corner at 45°, which is how a real metal surround is
       mitred — it ADDS a facet turning at its own angle rather than removing one. The four bars were
       also four draw calls for one piece of trim; merged, the mitred surround costs THREE FEWER draw
       calls per sign than the square one did, which is what pays for the extra facets. */
    const fr = 0.16, fd = 0.26;
    const bars = [];
    mitreFrame(bars, { x, y, z: z - 0.17, hw: pw / 2 + fr / 2, hh: ph / 2 + fr / 2, bar: fr, depth: fd, c: 0.045, k: Math.min(0.62, ph * 0.16, pw * 0.16) });
    merged(parent, bars, M.chromeMirror || M.trim, 'sign-frame', false);
    /* THE LIT REVEAL, AND WHAT IT DOES (law 2 / law 3). It was a warm strip, and warm is interior
       light and nothing else — a sign is the one place the direction explicitly forbids it. It takes
       the district's accent now, which is also what makes the three signs read as three places from
       across the plaza. And it stops being a bright line that lights nothing: the wash above it is
       the same hue falling off over the panel, so the wordmark and the mark above it are read AGAINST
       a lit backing rather than floating on a dark one. The strip itself merges into the building's
       accent mesh, so the whole gesture still costs nothing. */
    const rv = chamferBox(pw * 0.94, 0.15, 0.1, 0.03);
    rv.translate(x, y - ph / 2 + 0.17, z - 0.05);
    if (spec.ans) spec.ans.glow.push(rv); else { const w = new THREE.Mesh(rv, M.interiorCool); parent.add(w); }
    if (spec.ans) {
      const up = hwash(pw, ph * 1.5, spec.ans.hue);
      up.translate(x, y - ph / 2 + 0.17, z - 0.14); spec.ans.wash.push(up);
    }
    /* THE CANONICAL MARK, in the slot signTexture already reserves for it — geometry, not a bitmap.
       materials.js:fobMark rebuilds it from the measured identity asset (a diamond flanked by two
       double chevrons). The size is derived, not eyeballed: the reserved slot is a square of half-side
       0.15h turned 45°, so its width is 0.424 of the sign's height and its centre sits 0.23 of that
       height above the sign's middle. Cut to that, the solid diamond lands exactly on the reserved
       outline — the placeholder becomes the mark's own rim — and the chevrons run out either side.
       Mirror-grade and standing proud, so it turns under the reveal wash instead of printing flat. */
    if (spec.mark) {
      const mk = new THREE.Mesh(fobMark(height * 0.424, 0.07), M.chromeMirror || M.trim);
      mk.position.set(x, y + height * 0.23, z + 0.05); mk.name = 'sign-mark'; parent.add(mk);
    }
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, height), mat);
  mesh.position.set(x, y, z);
  /* the wordmark draws AFTER the reveal's wash. Both are transparent and depth-write-off, and the
     wash sits 0.09 m behind the letters — without an explicit order three.js draws the sign first and
     then lays a half-opaque gradient over the glyphs, which is exactly the wrong way round. */
  mesh.renderOrder = 6;
  parent.add(mesh);
  if (spec.reflect !== false) ctx.reflect(mesh, 0.3);
  return mesh;
}

/* ---- THE PORTAL (v8 §05, law 5) -------------------------------------------------------------------
   The reference frames put their strongest colour in two places and nowhere else: a signage band, and
   the reveal of the way in. This is the second one, and it is deliberately ONE gesture at full size
   rather than a set of small ones — a brow across the whole head of the opening, a lining down both
   jambs of the reveal, and a lit threshold, all in the district's single hue.

   Everything it emits is answered. The brow throws a soffit wash down into the reveal and a wash up
   the lintel it is mounted to; each jamb lining washes the pier face it is cut into; the threshold
   lays a pool on the black platinum outside, in the same hue, from ground.js's own floor hook. The
   whole assembly merges into the building's accent mesh, so a portal costs no draw call of its own. */
function portal(ctx, g, o) {
  const { openW, openH, E, floorY = 0, brow = 0.62, z = -0.55, ans } = o;
  /* R167 §D — TIER 3 REPORTS ITSELF INTO THE SAME LADDER.
     The geometry below is unchanged and stays unchanged: these three openings are hand-sized to
     masses that are locked, and they already sit correctly above the tier 2 facility entrances.
     What was missing is that nobody could SEE the ladder — the local doors were measured in one
     file, the facility doors in another, and the landmarks nowhere at all, which is exactly the
     condition L42 warns about. One channel now carries all three tiers, so the monotonic test in
     tests/ can fail if a future pass makes a facility door out-scale a landmark threshold. */
  (ctx.doorTiers || (ctx.doorTiers = [])).push({ tier: 3, kind: 'LANDMARK', w: openW, h: openH, name: g.name || 'landmark' });
  /* THE BROW, mounted UNDER THE LINTEL and inside the reveal rather than on the wall above it. Two
     reasons, and both are architectural: the elevation above every one of these openings is already
     spoken for — a transfer band on MAH GYM, a platinum portal frame on MAH MATCH, a cornice order on
     MAH MARKET — and a light let into the head of a reveal is what actually makes the opening read as
     DEEP. Head-on from the plaza it is a bright line across the top of the way in; from anywhere else
     it is the thing lighting the tunnel. */
  const hy = floorY + openH - 0.18 - brow / 2;
  const head = chamferBox(openW - 0.5, brow, 0.26, 0.05); head.translate(0, hy, z); ans.glow.push(head);
  /* the soffit it is fixed to is the first thing it lights: a down-facing wash under the lintel,
     running the depth of the reveal and dying before the glass line */
  const sof = hwash(openW - 0.6, E * 0.95, ans.hue).rotateX(Math.PI / 2);
  sof.translate(0, floorY + openH - 0.1, -(E * 0.42)); ans.wash.push(sof);
  /* THE JAMB LININGS: the reveal is E metres deep, and lining it is what turns a hole in a wall into a
     portal. The bars face INTO the opening, so they light the tunnel rather than the plaza. */
  const jd = Math.max(1.2, E - 0.5), jh = openH - 0.5;
  for (const sd of [-1, 1]) {
    const bar = chamferBox(0.26, jh, jd, 0.05);
    bar.translate(sd * (openW / 2 - 0.13), floorY + openH / 2 - 0.1, -(E - 0.2) / 2);
    ans.glow.push(bar);
    /* the lining's own glow on the pier face it is cut into: the falloff runs across the DEPTH of the
       reveal, which is the direction light actually spreads from a full-height bar */
    const jw = vwash(jd + 0.6, jh * 0.9, ans.hue).rotateY(sd * -Math.PI / 2);
    jw.translate(sd * (openW / 2 - 0.02), floorY + openH / 2 - 0.1, -(E - 0.2) / 2); ans.wash.push(jw);
  }
  /* THE THRESHOLD: a lit doorstep at the front plane. It is the lowest emitter on the building and
     therefore the one the near-mirror floor answers hardest — which is why it is here at all. */
  if (o.threshold !== false) {
    const th = chamferBox(openW + 0.8, 0.12, 0.44, 0.04); th.translate(0, floorY + 0.09, 0.34); ans.glow.push(th);
    /* where a stair carries the approach the treads answer instead, one wash per tread, so the flat
       ground quad would only float over the second step */
    if (o.stepWash !== false) {
      const step = hwash(openW + 2.4, 2.6, ans.hue).rotateX(-Math.PI / 2);
      step.translate(0, floorY + 0.04, 1.5); ans.wash.push(step);
    }
    /* the pool lands out on the APRON, whose slab top is 0.42 (ground.js): a pool left at the floor's
       own default height would be laid underneath the doorstep it is meant to be lighting */
    if (ctx.lightPool) { const p = world(g, 0, 0, o.poolZ == null ? 5.0 : o.poolZ); ctx.lightPool({ x: p.x, y: 0.45, z: p.z, rx: openW + 10, rz: 11, rot: g.rotation.y, hue: ans.hue, k: 0.34 }); }
  }
}
/* ---- THE SIGNAGE BAND (v8 §05, law 5) -------------------------------------------------------------
   A band of light let into the elevation, in runs that die into the order rather than crossing in
   front of it — which is the difference between architecture and a strip stuck on a wall. Each run
   washes the wall it is cut into, above and below, and the district's floor pool (ground.js, laid at
   the same hue before this module ran) is the ground's half of the same answer. */
function signBand(ctx, g, o) {
  const { runs, y, h = 0.72, z, d = 0.22, ans } = o;
  runs.forEach(([x0, x1]) => {
    const len = x1 - x0, cx = (x0 + x1) / 2;
    const bar = chamferBox(len, h, d, 0.05); bar.translate(cx, y, z); ans.glow.push(bar);
    const w = hwash(len + 1.4, h * 6.5, ans.hue); w.translate(cx, y, z - 0.07); ans.wash.push(w);
  });
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
/* v8: the bays go WARM, they vary, and the light they make lands on something.
   Three changes, and the first two are the direction: the rooms behind the glass are warm off-white
   now (interiorCool survives for MAHGIC-lit interiors, which is MAH MATCH's arena and nothing else),
   and a ROW IS A STOREY — a floor is fully occupied, half empty or dark as a whole before its rooms
   vary inside it, which is what stops a curtain wall reading as a uniform grid of identical dots.
   The third is cost: every room in a field was its own mesh and every pane another, so one facade of
   eight bays over two floors cost thirty-two draw calls. They merge now — rooms into one
   vertex-coloured mesh, panes into one — which is what pays for everything else in this pass. */
function curtainWall(ctx, g, o) {
  const { M } = ctx;
  const { W, H, sillY = 0, topY, bays = 6, floors = 3, z = 0.5, seed = 1, lit = 0.72, cool = false, ans = null } = o;
  const frame = [], plates = [], rooms = [], panes = [];
  const wallW = W * 0.92, bayW = wallW / bays;
  const totalH = topY - sillY, floorH = totalH / floors;
  let s = (seed * 9301 + 49297) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  /* the interior: one unlit plane per bay per floor, at its own brightness. Unlit on purpose — an
     interior seen through glass is a light SOURCE, and shading it would put it back in shadow.
     The palette is read off materials.js rather than written here, so a room in this file can never
     drift away from a room in the city behind it. */
  const bright = (cool ? M.interiorCool : M.interior).color.clone();
  const pale = (cool ? M.interiorCool : M.interiorPale).color.clone();
  const spill = (cool ? M.interiorSoftCool : M.interiorSoft).color.clone();
  const dark = new THREE.Color(0x0d131e);   /* an unlit room is not black: it is a dark room behind glass */
  const roomC = new THREE.Color();
  for (let f = 0; f < floors; f++) {
    const fy = sillY + f * floorH;
    /* the storey's own occupancy, before any room in it varies */
    const empty = rnd() < 0.12, occ = empty ? 0.15 : 0.72 + rnd() * 0.5, level = 0.62 + rnd() * 0.38;
    for (let b = 0; b < bays; b++) {
      const bx = -wallW / 2 + bayW / 2 + b * bayW;
      const on = rnd() < lit * occ;
      const iw = bayW - 0.5, ih = floorH - 0.75;
      /* FAINT is the direction's word for a lit window: the median room lands near a third of full
         strength, a few run bright, and one bay in six is the paler deep-room white */
      const k = rnd();
      if (on) roomC.copy(k < 0.17 ? pale : bright).multiplyScalar(level * (0.26 + rnd() * rnd() * 0.9));
      else roomC.copy(dark).lerp(spill, 0.25 * rnd());
      const inner = new THREE.PlaneGeometry(iw, on ? ih : ih * 0.92);
      inner.translate(bx, fy + floorH * 0.52, z - 0.5);
      rooms.push(tint(inner, roomC));
      /* the glass in front of it, which is what makes the light read as being INSIDE something.
         mergeParts() concatenates raw attribute arrays, so a pane must be de-indexed before it joins
         the bucket or its four corners arrive without the triangles that use them. */
      const pane = new THREE.PlaneGeometry(iw + 0.3, ih + 0.4);
      pane.translate(bx, fy + floorH * 0.52, z - 0.06);
      panes.push(flat(pane));
      /* the vertical mullion between bays — a satin chromium face, which is where that grade pays */
      part(frame, chamferBox(0.2, floorH - 0.1, 0.34, 0.05), bx - bayW / 2, fy + floorH / 2, z);
    }
    /* the floor plate and its soffit: this is what gives a facade its STOREYS, and storeys are what
       give a building its scale against a resident standing in front of it */
    part(plates, chamferBox(wallW + 0.5, 0.34, 0.5, 0.08), 0, fy + 0.1, z + 0.06);
    part(frame, chamferBox(wallW + 0.7, 0.1, 0.16, 0.03), 0, fy + 0.3, z + 0.24);
    /* THE STOREY ANSWERS ITSELF (law 2). A lit floor plate throws light onto the metal immediately
       around it, so each storey gets two washes in its own interior white: one across the glazing
       line, which lands on the mullions between the bays, and one lying on the plate's own sill,
       which is the horizontal that would otherwise be the darkest thing on a metal facade. */
    if (ans && !empty) {
      const wa = hwash(wallW + 0.6, floorH * 0.86, spill);
      wa.translate(0, fy + floorH * 0.52, z + 0.3); ans.wash.push(wa);
      const si = hwash(wallW + 0.5, 0.62, spill).rotateX(-Math.PI / 2);
      si.translate(0, fy + 0.28, z + 0.22); ans.wash.push(si);
    }
  }
  part(frame, chamferBox(0.2, totalH, 0.34, 0.05), wallW / 2, sillY + totalH / 2, z);
  part(plates, chamferBox(wallW + 0.5, 0.4, 0.55, 0.09), 0, topY + 0.1, z + 0.06);
  const rm = new THREE.Mesh(mergeWash(rooms), washKit(ctx).room); rm.name = 'curtain-rooms'; g.add(rm);
  const pm = new THREE.Mesh(mergeParts(panes), M.crystalGlass || M.glass); pm.name = 'curtain-glass'; g.add(pm);
  merged(g, frame, M.chromeSatin || M.trimSatin, 'curtain-mullions', false);
  merged(g, plates, M.platinumLit || M.platinum, 'curtain-plates', true);
  /* the lit field is a real object in a near-mirror floor: one copy, dimmed, under the deck */
  ctx.reflect(rm, 0.3);
  return rm;
}

/* the composed facade: body + room + glass + piers + lintel */
function facade(ctx, parent, o) {
  const { M } = ctx;
  const { W, H, D, openW, openH, pierDepth: E, roomDepth: R, floorY = 0, radius = 1.4, glassMullions = 0, cool = false, ans = null } = o;
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
  /* THE ROOM IS LIT FROM WITHIN, AND WARM (v8). This is the one interior a viewer sees straight into
     from the plaza, so it is the whole reason the direction's warm/cold contrast reads at all: three
     ceiling coves in interior white, merged into one mesh. `cool` is MAH MATCH and only MAH MATCH —
     its hall is lit by the arena, and arena light is MAHGIC, not domestic. */
  const coves = [];
  for (let i = 1; i <= 3; i++) part(coves, chamferBox(rw * 0.7, 0.05, 0.25, 0.012), 0, rh - 0.05, -R * i / 4);
  merged(room, coves, cool ? M.interiorCool : M.interior, 'room-coves', false);
  /* a low luminous band across the back wall: the interior always reads from the plaza as lit architecture, not a screen */
  const backGlow = new THREE.Mesh(new THREE.PlaneGeometry(rw * 0.82, rh * 0.16), cool ? M.interiorSoftCool : M.interiorSoft); backGlow.position.set(0, rh * 0.36, -R + 0.25); room.add(backGlow);
  parent.add(room);
  /* AND THE ROOM'S LIGHT LEAVES IT (law 2). A lit interior behind glass throws light forward: onto the
     glass line itself, onto the floor of the room in front of the coves, and onto the reveal it is
     seen through. Without these the room is a bright picture hanging in a dark hole. */
  if (ans) {
    const spill = (cool ? M.interiorSoftCool : M.interiorSoft).color;
    const gw = hwash(openW + 0.6, openH * 0.95, spill); gw.translate(0, floorY + openH * 0.46, -E + 0.34); ans.wash.push(gw);
    const fl = hwash(rw * 0.86, R * 0.7, spill).rotateX(-Math.PI / 2); fl.translate(0, floorY + 0.05, -E - R * 0.4); ans.wash.push(fl);
  }
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
  /* platinum roof trims: the silhouette catches light without a neon outline. Copings, so the three
     runs turn at their ends as well as across their faces — and ONE mesh, because three bars of the
     same grade in the same plane were three draw calls for one line. */
  {
    const rt = [];
    part(rt, coping(pierW - 1.2, 0.16, 0.22, 0.04), -W / 2 + pierW / 2, H - 0.32, 0.36);
    part(rt, coping(pierW - 1.2, 0.16, 0.22, 0.04), W / 2 - pierW / 2, H - 0.32, 0.36);
    part(rt, coping(openW - 0.8, 0.16, 0.22, 0.04), 0, H - 0.32, 0.36);
    merged(parent, rt, M.platinum, 'facade-roof-trim', false);
  }
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
  /* THE CROWN (law 6). It was four planes at ONE tilt, and it did not close: measured, the two side
     planes started 4.2 m behind the front plane, so each front corner of the roofline was a gap with
     two square blade ends facing out of it. Three things change and none of them softens the surface.
       IT CLOSES.   the side planes now run the full depth, so the crown is a ring and the roofline is
                    continuous instead of showing its own ends.
       IT TURNS.    two courses instead of one — nearly upright first so the mass is held out, then
                    leaning three times harder — so the silhouette's tangent turns toward horizontal
                    before the cap, which is the difference between a crown and a cone (terrain.js's
                    massif() header derives the same exponent for a mountain).
       IT MITRES.   each of the four corners is cut by a fifth plane at 45°, so the crown's plan reads
                    as an octagon. That ADDS two facets per corner catching light at their own angle:
                    more crystalline than the square corner it replaces, not less.
     The cap band follows, in coping form, as a small FLAT facet running right round — a blunt tip
     holds a highlight where an arris only aliases. */
  const crownH = 1.9 + R * 0.6;
  const ring = { ax: W / 2 - 0.75, az: (E + D) / 2, zc: 0.4 - (E + D) / 2, yBase: H - 0.2, yTop: H + crownH - 0.2, t: 1.5 };
  if (wantCrown) {
    /* v12 LAW 1 — the crown cap band moves from `catches` to `crown`. The v11 crystalline pass put
       it in `catches`, which merges into M.trim, and materials.js has `m.trim = m.chromeMirror` at
       metalness 1.0. An adversarial verifier then measured +36.23 m2 of NEW FLAT UP-FACING face on
       that grade across the MAH GYM and MAH MATCH crowns, while the pass's own report stated in
       capitals that it had created none. It is the same defect this world has shipped three times.

       The verifier left it as a director's call on the grounds that moving it "loses the crown's
       bright mirror highlight line". That is the exact misconception LAW 1 exists to correct: on an
       UP-FACING face a mirror grade reflects the near-black zenith and renders BLACK, so there is
       no highlight there to lose. M.platinumLit (metalness 0.38) takes hemisphere and diffuse light
       and reads BRIGHTER on that face, not dimmer. The band is a coping — predominantly horizontal —
       so what its vertical flanks give up in mirror sparkle is far less than what its top recovers
       by no longer being black. One word, no cost, and the sibling call at 573 already routes its
       deck plate to a low-metalness bucket for the same reason. */
    crownCap(crown, ring, crownRing(crown, ring), 0.14, 0.5);
  } else {
    /* no crown: the mass ends in a low mirror-grade parapet so whatever the module above it builds —
       terraces, a tower — is what the silhouette actually shows. A coping, so the parapet turns at
       its ends and along its back as well as across its face. */
    part(catches, coping(W - 0.8, 0.22, 0.42, 0.06), 0, H - 0.11, 0.16);
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
    /* the mast was the one raw BoxGeometry left on a silhouette in this file — a 5 m square-cut post
       standing against the sky, which is precisely the un-bevelled 90° corner v5 §07 forbids. */
    part(deep, chamferBox(0.22, bh, 0.22, 0.05), bx, H + crownH + bh / 2 - 0.2, bz);
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

/* ---- THE PLATINUM ORDER (v7, brief §02 / §05 / §07–§08) ------------------------------------------
   Measured off the night establishing frame: sky 36, ARCHITECTURE 52, chromium plaza floor 95. The
   FLOOR was doing all of the platinum work and the elevations were not. The cause was a hole in the
   palette — the masses sit at luminance 49–58 and the whole platinum family at 183–232, with nothing
   in between — so an elevation could only ever be a navy mass wearing hairline highlights, which is
   precisely the black/navy dominance the brief is trying to leave. materials.js now carries the
   missing rung at 142 (platinumMid / platinumMidBrushed / platinumMidLit); this is the architecture
   that spends it.

   THE MASSES DO NOT GET LIGHTER. graphite, panel and structural are the dark the platinum is measured
   against, and lifting them would flatten the world rather than brighten it. What widens is the
   FRAMING carried on them — plinth, courses, piers, corner returns, cornice — until the platinum is a
   real proportion of each primary elevation (~25–40 %) instead of a hairline, with the dark crystal
   infill still reading as infill between it.

   TWO RULES HOLD EVERY PART BELOW.
     ORIENTATION DECIDES THE GRADE. platinumMid is metalness 0.94: it takes no diffuse light and is
     lit only by what it reflects, so it belongs on VERTICAL and TILTED faces, which see the
     environment's bright horizon band. Every face whose normal points up or down — a sill, a cap, a
     soffit — is covered in platinumMidLit instead, because a polished horizontal reflects the
     near-black night zenith and renders BLACK. This world already shipped that bug once across
     ~3,100 m² of surface; nothing here repeats it.
     THE PLATINUM SITS PROUD. Every member projects off the wall plane instead of being painted onto
     it, so the elevation has reveals, the framing casts across the infill it divides, and the same
     member turns the corner onto the flank — a clad mass, not a decorated front (§05).

   Three ORDERS, one per destination, so the platinum tells them apart the way their silhouettes
   already do (§50-3): MAH GYM is BANDED, MAH MARKET is PIERED, MAH MATCH is FRAMED. Cost is three
   merged meshes per building whatever the part count. */
function platinumOrder(ctx, g, o) {
  const { M } = ctx;
  const { W, H, openW, openH, floorY = 0, order } = o;
  const face = [], piers = [], caps = [];
  /* a COURSE — a horizontal platinum band on a vertical wall face. `z` is the plane it comes out TO,
     `d` how far it comes out, so a call site reads as how proud the member stands. Its own top and
     underside are horizontal, so a sill sits over the top and, where the underside is seen from the
     plaza, a soffit under it — both in the LIT grade, which is the whole point of that material. */
  const course = (cx, len, y0, y1, z, d, soffit) => {
    part(face, chamferBox(len, y1 - y0, d, 0.06), cx, (y0 + y1) / 2, z - d / 2);
    part(caps, coping(len + 0.18, 0.2, d + 0.18, 0.05), cx, y1 + 0.06, z - d / 2);
    if (soffit) part(caps, coping(len + 0.12, 0.16, d + 0.12, 0.04), cx, y0 - 0.04, z - d / 2);
  };
  /* a PIER — a vertical member, brushed because a brushed streak runs WITH the member it is cut for,
     and deep because depth is the entire point: a pier flush with the glazing cannot cast across the
     bays it divides, and an applied strip is what made the old framing read as paint. */
  const pier = (cx, w, y0, y1, z, d, cap) => {
    part(piers, chamferBox(w, y1 - y0, d, 0.07), cx, (y0 + y1) / 2, z - d / 2);
    if (cap) part(caps, coping(w + 0.22, 0.22, d + 0.2, 0.05), cx, y1 + 0.1, z - d / 2);
  };
  /* a RETURN — the same platinum carried around onto the flank. Without it a viewer walking past the
     corner sees the framing stop at the arris, and the whole elevation collapses back into paint.
     A return ends in the open at both ends, so both of its ends get the lit grade too. */
  /* THE REAL FLANK IS NOT W/2. softMass() extrudes roundedBoxShape with bevelSize 0.35, so a mass
     of width W has its actual side face at W/2 + 0.35. Every return below was originally placed at
     W/2 + 0.02 and rendered NOTHING — fourteen parts buried inside the pier they were meant to turn
     onto. Centring the bar on the true flank half-embeds it and leaves t/2 standing proud, which is
     what a return is. */
  const FLANK = W / 2 + 0.35;
  const ret = (x, y0, y1, zc, dz, t) => [-1, 1].forEach(sd => {
    part(piers, chamferBox(t, y1 - y0, dz, 0.06), sd * x, (y0 + y1) / 2, zc);
    part(caps, coping(t + 0.14, 0.18, dz + 0.14, 0.04), sd * x, y1 + 0.05, zc);
    part(caps, coping(t + 0.12, 0.16, dz + 0.12, 0.04), sd * x, y0 - 0.04, zc);
  });

  const pierW = (W - openW) / 2, pierX = openW / 2 + pierW / 2;
  if (order === 'banded') {
    /* MAH GYM — BANDED. Its silhouette is one long horizontal sweep, so its platinum reads horizontal
       too: a plinth, two floor courses across each pier, and under the canopy a deep TRANSFER BAND
       across the whole frontage — the beam the glazed sweep springs from, and the widest single piece
       of platinum on any of the three. It stops at 9.02 m because the canopy root is at 9.25 and the
       clerestory and crown own the elevation above it; a parapet here would only fight them. */
    const z = 0.66, d = 0.5, len = pierW - 0.4;
    [-1, 1].forEach(sd => {
      course(sd * pierX, len, floorY, floorY + 0.94, z, d, false);        /* the plinth's underside is the apron; nothing to soffit */
      course(sd * pierX, len, floorY + 1.98, floorY + 2.62, z, d, true);
      course(sd * pierX, len, floorY + 6.62, floorY + 7.36, z, d, true);  /* clear of the 6.4 m recessed seam, which stays a seam */
      /* the quoin: without it the courses read as four stripes painted on a navy pier rather than as
         one clad corner, and the mass loses its edge */
      pier(sd * (W / 2 - 0.85), 1.3, floorY, floorY + 9.0, z, d, true);
    });
    /* THE TRANSFER BAND STOPS EITHER SIDE OF THE SIGN. Run full-frontage it passed straight through
       the mounted sign assembly, whose recess spans y 8.21-14.99 and x +/-7.68. Splitting it is not a
       retreat: the sign now sits INTO the band's line, which is how a real transfer beam meets a
       panel let into it, and the market's upper course already does the same thing. */
    [-1, 1].forEach(sd => course(sd * 13.2, 10.4, floorY + 8.28, floorY + 9.02, z, d + 0.1, true));
    ret(FLANK, floorY + 3.4, floorY + 9.55, -1.9, 2.6, 0.42);   /* y kept inside the pier's flat flank, between its 3.2 m corner radii */
  } else if (order === 'piered') {
    /* MAH MARKET — PIERED. Its terraces already give it a horizontal roof line, so the wall takes the
       opposite emphasis: a civic order of four full-height mullion piers standing 1.15 m proud of the
       glazing, on a deep plinth, under a projecting cornice they die into. The piers are placed
       OUTBOARD of the entry canopy and clear of the wordmark, so the order frames the sign rather
       than colliding with it. */
    const s0 = 8.6, s1 = W / 2 - 0.1;
    [-1, 1].forEach(sd => {
      /* the plinth projects further than the piers, so the order stands ON something */
      course(sd * pierX, pierW - 0.4, floorY, floorY + 0.94, 1.3, 1.3, false);
      pier(sd * (openW / 2 + 2.6), 1.0, floorY + 0.94, floorY + 15.15, 1.15, 1.15, false);
      pier(sd * (W / 2 - 1.1), 1.0, floorY + 0.94, floorY + 15.15, 1.15, 1.15, false);
      /* the upper floor line, banded between the piers and set 0.15 m behind them so the course dies
         INTO the pier rather than crossing it. Two segments: the middle of that course is the wordmark. */
      course(sd * ((s0 + s1) / 2), s1 - s0, floorY + 10.95, floorY + 11.62, 1.0, 0.5, true);
    });
    /* the cornice starts at 15.15 and not at the roof line: the wordmark's chromium frame tops out at
       14.99, and a cornice soffit dropped onto it would eat the sign's mounting depth */
    course(0, W - 0.8, floorY + 15.15, floorY + 16.05, 1.3, 1.3, true);
    ret(FLANK, floorY + 2.6, floorY + 12.5, -1.5, 2.0, 0.42);
  } else {
    /* MAH MATCH — FRAMED. At 38 m a fine grid reads as texture rather than as structure, so the anchor
       takes a colossal order: a 4 m plinth rising out of the entrance stair, a 1.7 m BELT at the portal
       head where the two curtain walls spring, a 1.55 m attic capping the mass, two full-height corner
       returns carrying the platinum onto the flanks, and two TRANSOMS banding the glazed fields.
       The transoms are placed by derivation, not by eye. curtainWall centres each storey's lit interior
       at 0.52 of its floor height and gives it (floorH − 0.75) of height, which leaves exactly 0.75 m of
       SOLID wall above one interior and below the next. Both transom BODIES sit inside that gap — only
       their sill and soffit nosings lap the head and cill of the panes, which is what a sill does — so
       the podium gets banded without a lit bay being covered. The armour panels, the banners and the
       bays stay the infield inside the frame. */
    const x0 = openW / 2 + 1.6, x1 = W / 2 - 0.1, cx = (x0 + x1) / 2, len = x1 - x0;
    const tx0 = openW / 2 + 0.6, tcx = (tx0 + x1) / 2, tlen = x1 - tx0;
    const sill = floorY + openH + 1.6, fh = (H - 1.2 - sill) / 3;   /* the podium curtain wall, as its own module lays it out */
    [-1, 1].forEach(sd => {
      /* down to the plaza, not to floorY - 1.2: the stair only carries this plinth as far as x 12.3,
         so from there out to 21.9 its underside was hanging 0.6 m above the ground */
      course(sd * cx, len, floorY - 1.8, floorY + 2.8, 0.95, 0.95, true);
      course(sd * cx, len, floorY + 13.7, floorY + 15.4, 1.05, 0.58, true);
      for (let f = 0; f < 2; f++) course(sd * tcx, tlen, sill + (f + 1.02) * fh - 0.36, sill + (f + 1.02) * fh + 0.36, 1.05, 0.5, true);
      pier(sd * (W / 2 - 0.55), 1.1, floorY + 2.8, floorY + 34.8, 1.05, 0.42, false);
    });
    /* the attic runs to W − 0.2 rather than W − 1.2 so it caps the corner returns instead of leaving
       their tops open to a black zenith */
    /* dropped 0.75 m so the attic's cap clears the crystal crown's 37.66 front plane, and back to
       W - 1.2: it was widened to W - 0.2 to cap the corner returns, but ret() caps its own ends and
       the returns now stand at W/2 + 0.35, which no attic of width W reaches anyway. */
    course(0, W - 1.2, floorY + 34.05, floorY + 35.6, 1.05, 0.75, true);
    ret(FLANK, floorY + 1.8, floorY + 33.2, -2.2, 3.4, 0.5);
  }
  merged(g, face, M.platinumMid || M.platinum, 'platinum-courses', true);
  /* platinumMid, NOT platinumMidBrushed: mergeParts() carries only position and normal, so a
     brushed roughnessMap on this geometry samples a single texel forever — a silent constant, not
     a brush. The grade that actually differs without a UV is the plain one. */
  merged(g, piers, M.platinumMid || M.platinum, 'platinum-piers', true);
  merged(g, caps, M.platinumMidLit || M.platinumLit, 'platinum-sills', true);
}

export function buildBuildings(ctx) {
  const { M, scene } = ctx;
  ctx.signMaterials = ctx.signMaterials || [];
  ctx.residentSpots = ctx.residentSpots || [];
  ctx.entranceLights = ctx.entranceLights || [];
  ctx.actions = ctx.actions || [];        /* tap targets: { id, label, kind, mesh, at: world Vector3 } */
  ctx.windowGrids = ctx.windowGrids || []; /* InstancedMesh window courses; the assembly dims them by day */
  ctx.apertureFields = ctx.apertureFields || []; /* R167 composed aperture fields; dimmed the same way */
  ctx.colliders = ctx.colliders || [];
  const out = {};
  const action = (id, label, kind, mesh, at, extra) => { mesh.userData.action = id; ctx.actions.push(Object.assign({ id, label, kind, mesh, at }, extra)); return mesh; };

  /* ---------------- MAH GYM — training ---------------------------------- */
  {
    const g = new THREE.Group(); g.name = 'MAH GYM';
    const S = SITES.gym, { W, H, D, openW, openH, E, R } = S;
    g.position.set(S.x, 0, S.z); g.rotation.y = S.rotY; scene.add(g);
    /* MAH GYM COMMITS TO CYAN, and the commitment is one soffit, one portal and one sign reveal —
       three pieces, all large, no confetti (law 5). ground.js published the hue plan before this
       module ran, so the pool already lying on the floor out front is the colour of this building. */
    const A = answers(ctx, 'gym');
    const f = facade(ctx, g, { W, H, D, openW, openH, pierDepth: E, roomDepth: R, radius: S.radius, glassMullions: 3, ans: A });
    dressFacade(ctx, g, { W, H, D, openW, openH, E, seed: 1, canopy: false, wings: 'rear' });   /* the broad curved canopy replaces the slab canopy */
    crystallize(ctx, g, { W, H, D, openW, E, seed: 1 });
    broadCanopy(ctx, g, { W, H, openH, seed: 1, ans: A });
    portal(ctx, g, { openW, openH, E, ans: A });
    /* MAH GYM is the BRIGHT, OPEN, GLAZED one (§21): two lit storeys of curtain wall above the canopy,
       so the training inside is what the building shows the plaza */
    curtainWall(ctx, g, { W, H, sillY: openH + 1.4, topY: H - 0.6, bays: 7, floors: 2, z: 0.62, seed: 11, lit: 0.8, ans: A });
    platinumOrder(ctx, g, { W, H, openW, openH, order: 'banded' });   /* horizontal: the platinum reads the way the canopy does */
    ctx.entranceLights.push(world(g, 0, openH + 1.2, 4.6));
    action('gym', 'MAH GYM', 'destination', f.glass, world(g, 0, 0, 2), { view: 'gym-entrance', copy: 'Training facility. Preview navigation: the camera moves to the entrance. Training data stays in MAHFITT.' });
    /* upper window band across the piers: interior glow behind glass */
    const windowGlow = M.interiorSoft.clone(); windowGlow.opacity = 0.28; ctx.timeHooks.push(s => { windowGlow.opacity = 0.28 * (1 - s.daylight * 0.5); });
    [-1, 1].forEach(s => { const gl = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 2.4), M.crystalGlass || M.glass); gl.position.set(s * (W / 2 - 5.0), 10.5, 0.44); g.add(gl); const glow = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.2), windowGlow); glow.position.set(s * (W / 2 - 5.0), 10.5, 0.3); g.add(glow);
      /* a window the life module may put a training silhouette behind (brief §43) */
      const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y);
      (ctx.lifeAnchors ? ctx.lifeAnchors.windows : []).push({ id: 'gym-window-' + (s < 0 ? 'l' : 'r'), position: world(g, s * (W / 2 - 5.0), 9.8, -0.4), normal: n, size: [7.2, 2.2], building: 'gym' }); });
    /* one light seam on each outer pier: a single vertical line drawing the building's height. It is
       the district's cyan and not the world Theme now — this is MAH GYM's own facade, and one facade
       speaking with one voice is the whole of law 5. Both seams merge into the accent mesh. */
    [-1, 1].forEach(s => {
      const seam = chamferBox(0.1, H * 0.62, 0.08, 0.02); seam.translate(s * (W / 2 - 1.0), H * 0.42, 0.46); A.glow.push(seam);
      /* the seam's own glow on the pier: 1.6 m wide, falling off across that width, the height of the
         seam itself — vwash takes (falloff axis, length) in that order */
      const jw = vwash(1.6, H * 0.66, A.hue); jw.translate(s * (W / 2 - 1.0), H * 0.42, 0.4); A.wash.push(jw);
    });
    /* signage on the lintel */
    sign(ctx, g, { title: 'MAH GYM', sub: 'TRAIN HIGHER', mark: true, width: 13.5, y: 11.6, z: 0.84, ans: A });
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
    /* THE TRAINING FLOOR IS A WARM, INHABITED ROOM SEEN THROUGH GLASS. That is the contrast the whole
       pass turns on: a cyan soffit and a cyan portal, and behind them a room lit the colour of a room.
       One luminaire over each platform, merged into a single fitting mesh, and the light they make
       LANDS — a warm pool on each platform top, which is what tells a viewer the platform is under a
       light rather than beside one. Building-local coordinates, so it merges with the rest. */
    [[-4.5, -3.5], [0, -6.5], [4.5, -3.5]].forEach(([px, pz]) => {
      const lamp = chamferBox(3.4, 0.09, 0.36, 0.03); lamp.translate(px, 3.45, pz - E); A.warm.push(lamp);
      const pool = hwash(4.4, 4.4, M.interiorSoft.color).rotateX(-Math.PI / 2);
      pool.translate(px, 0.33, pz - E); A.wash.push(pool);
    });
    closeAnswers(ctx, g, A);
    out.gym = g;
    /* who is here: one training on a platform, one heading in */
    ctx.residentSpots.push(spot(g, 0, 0.3, -E - 6.5, 0, { id: 'gym-trainee', colour: 'blue', physique: 0.75, sex: 'm', pose: 'spar', seed: 11, note: 'training inside MAH GYM' }));

  }

  /* ---------------- MAH MATCH — the fighting facility --------------------- */
  {
    const g = new THREE.Group(); g.name = 'MAH MATCH';
    const S = SITES.match, { W, H, D, openW, openH, E, R, floorY } = S;
    g.position.set(S.x, 0, S.z); g.rotation.y = S.rotY; scene.add(g);
    /* MAH MATCH COMMITS TO DEEP BLUE — the coldest, most architectural hue in the accent family, which
       is what a 38 m mass wants, and the one ground.js already pooled on the floor in front of it. Its
       small competitive RED stays exactly as it was: a second hue used at a tenth of the size is an
       identity mark, not a rainbow. */
    const A = answers(ctx, 'match');
    const f = facade(ctx, g, { W, H, D, openW, openH, pierDepth: E, roomDepth: R, floorY, radius: S.radius, roomW: 38, cool: true, ans: A });   /* the hall is lit by the arena, and arena light is MAHGIC */
    dressFacade(ctx, g, { W, H, D, openW, openH, E, floorY, seed: 2, canopy: false, wings: 'rear' });   /* MAH MATCH keeps its own portal frame instead of a canopy */
    crystallize(ctx, g, { W, H, D, openW, E, floorY, seed: 2, beacon: false });
    verticalTower(ctx, g, { W, H, D, E, seed: 2 });
    /* MAH MATCH is the DOMINANT one: its podium carries three lit storeys either side of the portal,
       and they stop below the tower so the tower stays the silhouette (§20). The podium is offices and
       circulation, not the arena, so those bays are WARM — the cool interior is the hall alone. */
    [-1, 1].forEach(sd => {
      const pierW = (W - openW) / 2, off = sd * (openW / 2 + pierW / 2);
      const wall = { W: pierW * 0.92, H, sillY: floorY + openH + 1.6, topY: H - 1.2, bays: 3, floors: 3, z: 0.56, seed: 21 + sd, lit: 0.62 };
      const sub = new THREE.Group(); sub.position.x = off; g.add(sub);
      /* the field's washes are built about the sub-group's own origin, so they are carried onto the
         building's axis before they join its single wash mesh */
      const side = { wash: [] };
      curtainWall(ctx, sub, Object.assign(wall, { ans: side }));
      side.wash.forEach(w => A.wash.push(w.translate(off, 0, 0)));
    });
    platinumOrder(ctx, g, { W, H, openW, openH, floorY, order: 'framed' });   /* colossal: at 38 m only a big order reads as structure */
    /* LAW-010 — WHERE THE FUNCTION LINE WENT. The wordmark now carries the canonical facility lockup
       (NAME over TAGLINE, the one pairing identical across all three reference frames), so MAH MATCH's
       function line moves off the sign and into the panel a tap opens — information rather than
       signage. The facility still states what it is; it no longer states it twice, six storeys up. */
    const MATCH_FUNCTION = 'MATCHES · PRACTICE';
    action('match', 'MAH MATCH', 'destination', f.glass, world(g, 0, floorY, 2), { view: 'match-entrance', copy: 'Fighting facility — ' + MATCH_FUNCTION + '. Choose an action at the entrance.' });
    /* the strong central frame around the opening, with a square-diamond keystone. Frame and keystone
       merge: three boxes and four bars were seven draw calls for one piece of architecture. */
    const fT = 1.4, fD = 1.0, fz = 0.55;
    {
      const fr = [];
      /* MITRED AT THE HEAD (law 6). A 20.8 m portal frame that stopped in two square corners put the
         hardest right angle in the district directly above the way in. The head and the two jambs stop
         1.1 m short and a fifth member crosses each corner at 45°, so the frame turns. Those two
         members are also the only faces of this frame that a mirror grade at metalness 0.98 can
         actually use up there: they are TILTED, so they see the horizon band, where the head's own
         soffit and cap look at the black floor and the black zenith. The frame keeps its cill open —
         a jamb dies into the stair, it does not stand on a plinth. */
      /* hh and y are solved, not chosen, so the head still sits at floorY + openH + fT and the jambs
         still run down to floorY − fT/2: the frame's outer envelope is exactly what it was. */
      const pk = 1.1, phh = (openH + fT + pk) / 2;
      mitreFrame(fr, { y: floorY + openH + fT - phh, z: fz,
        hw: openW / 2 + fT / 2, hh: phh, bar: fT, depth: fD, c: 0.07, k: pk, cill: false });
      merged(g, fr, M.platinum, 'match-portal-frame', true);
      /* LAW 1, ON THE ONE HORIZONTAL THAT MATTERS HERE. M.platinum is metalness 0.98, so this frame is
         lit only by what it reflects: its vertical jambs and front face see the bright horizon band and
         read, but its 20.8 m SOFFIT faces down at a black floor and returns nothing. It is directly
         over the entrance and directly above the portal's brow, so the honest fix is also the true
         one — the brow's light is what lands on it. */
      const fsw = hwash(openW + fT * 2 - 0.5, fD * 0.85, A.hue).rotateX(Math.PI / 2);
      fsw.translate(0, floorY + openH + fT / 2 - 0.01, fz); A.wash.push(fsw);
      const km = merged(g, diamondBars([], 2.6, 0.22, 0.2, 0, floorY + openH + fT + 0.6, fz + 0.3), M.energyLight, 'match-keystone', false);
      if (km) ctx.reflect(km, 0.3);
    }
    /* THE SIGNAGE BAND (law 5). The single largest cold gesture on the anchor: a blue band let into
       the podium either side of the portal, at the same height as the portal's own brow, so the three
       lines read as ONE light line crossing 44 m of facade and stopping at the way in. It sits below
       the platinum belt course and behind its front plane, which is why it reads as let INTO the wall
       rather than stuck onto it — and the course's soffit is the first thing its wash lands on. */
    /* y is derived, not chosen: the band's top edge lands 0.07 under the belt course's soffit nosing at
       15.38, its bottom clears the armour panels, and its centre sits within 0.2 m of the portal brow
       inside the opening, so the three pieces read as one line crossing the podium. */
    signBand(ctx, g, { runs: [[10.6, 20.8], [-20.8, -10.6]], y: floorY + 13.2, h: 0.62, z: 0.72, ans: A });
    portal(ctx, g, { openW, openH, E, floorY, brow: 0.62, stepWash: false, poolZ: 13.2, ans: A });   /* the pool clears the 9.2 m stair below and lands on the apron */
    /* horizontal structural bands across the piers — ten boxes, one mesh */
    {
      const bands = [];
      [7.5, 13.5, 19.5, 25.5, 31.5].forEach(y => [-1, 1].forEach(s => part(bands, chamferBox((W - openW) / 2 - 1.2, 0.35, 0.3, 0.07), s * (openW / 2 + (W - openW) / 4 + 0.3), y, 0.5)));
      merged(g, bands, M.platinum, 'match-courses', true);
    }
    /* faceted armour-like panel regions on the piers, restrained — twelve panels, one mesh */
    {
      const armour = [];
      [-1, 1].forEach(s => { for (let i = 0; i < 6; i++) part(armour, chamferBox(3.0, 2.2, 0.28, 0.07), s * (openW / 2 + 5.2 + (i % 2) * 0.4), 10 + i * 4.2, 0.42, s * 0.06); });
      merged(g, armour, M.panel, 'match-armour', true);
    }
    /* the two banners: dark cloth with the red square-diamond, the competitive accent. Ten meshes
       became two, and the red now reflects as one object instead of one quarter of one. */
    {
      const cloth = [], emblem = [];
      [-1, 1].forEach(s => {
        part(cloth, chamferBox(1.8, 8.5, 0.06, 0.02), s * (openW / 2 + 3.2), floorY + 8.5, 0.62);
        diamondBars(emblem, 0.9, 0.09, 0.06, s * (openW / 2 + 3.2), floorY + 11.4, 0.7);
      });
      merged(g, cloth, M.graphiteDark, 'match-banners', false);
      const em = merged(g, emblem, M.matchRed, 'match-banner-marks', false);
      if (em) ctx.reflect(em, 0.3);
    }
    /* signage: the canonical facility lockup, NAME over TAGLINE (§09 / §11 of the brief) */
    sign(ctx, g, { title: 'MAH MATCH', sub: 'FIGHT HIGHER', mark: true, width: 16, y: floorY + openH + fT + 5.6, z: 0.8, ans: A });
    const entranceAction = (id, title, x, extra) => {
      const panel = box(5.6, 1.5, 0.12, M.graphiteDark, x, floorY + 2.75, -E + 0.42); g.add(panel);
      const edge = box(5.4, 0.03, 0.04, M.energySoft, x, floorY + 1.98, -E + 0.5); g.add(edge);
      const s = sign(ctx, g, { title, width: 5.2, y: floorY + 2.75, z: -E + 0.5, x, titleSize: 118, w: 2048, h: 320, reflect: false, mounted: false });
      action(id, title, 'match-action', panel, world(g, x, floorY, 2), extra); s.userData.action = id; ctx.actions[ctx.actions.length - 1].meshes = [panel, s]; ctx.actions[ctx.actions.length - 1].edge = edge;
      return panel;
    };
    entranceAction('find-opponent', 'FIND AN OPPONENT', -openW / 4, { copy: 'Opponent matching is not available in this preview. No live players are connected and none are simulated.' });
    entranceAction('practice-buddy', 'PRACTICE WITH A BUDDY', openW / 4, { copy: 'Local practice preview with two labelled fixtures — no other person is involved.' });
    /* ---- THE GRAND CIVIC STAIR (v8 §06) -----------------------------------------------------------
       The references show a much WIDER approach than a six-step run tucked between two cheeks: the
       flight is the piece of ground the hero camera looks straight up, so it has to carry the
       composition rather than get out of its way. What changes:

         WIDER    the flight is 36 m across at the top — wider than the entrance bay, wider than the
                  portal frame — and SPLAYS to the full 44 m width of the mass where it meets the
                  plaza, which is what makes an approach read as civic instead of as a doorstep. It
                  also carries the framed order's plinth: that member runs out to x 21.9 and the old
                  24.6 m stair left it hanging in the air from x 12.3 outward.
         SHALLOWER  eight risers of 0.225 m on a 1.15 m going. A monumental stair is a stair you can
                  walk up in conversation, and the tread depth is what says so at this distance.
         STILL INTEGRATED  the ramp is unchanged in principle and slightly wider, the handrails stay
                  on both sides of it and follow the splay at the outer edges, and the treads and
                  their inlaid seams merge into one mesh each — thirty-one meshes became four.
       And the portal answers onto it (law 2): the blue coming out of the opening lands on the top
       treads and is gone by the fourth one down, which is what a light 4 m above a stair does. */
    const steps = 8, rise = floorY / steps, run = 1.15, rampW = 5.4, rampLen = steps * run;
    const topW = openW + 18, botW = W;
    const stairW = i => botW - (botW - topW) * i / (steps - 1);
    const treads = [], seams = [], _tw = new THREE.Color();
    for (let i = 0; i < steps; i++) {
      const h = rise * (i + 1), total = stairW(i), sideW = (total - rampW) / 2, zc = (steps - i) * run - run / 2;
      /* THE NOSING (law 6). 0.05 m of chamfer on a 0.225 m riser across a 44 m civic flight is a
         hairline: at plaza distance it aliases and the eight treads read as eight knife edges stacked
         up the approach. 0.09 is the most a 0.225 riser will take (chamferBox clamps at h/2) and it is
         a nosing you can see catch — the same turn, spent where the eye actually lands. The chamfer
         also carries onto both vertical front corners of every tread, which is where the splayed
         outer edge of the flight is read from an angle. */
      [-1, 1].forEach(sd => {
        part(treads, chamferBox(sideW, h, run, 0.09), sd * (rampW / 2 + sideW / 2), h / 2, zc);
        part(seams, chamferBox(sideW - 0.12, 0.025, 0.06, 0.008), sd * (rampW / 2 + sideW / 2), h + 0.02, (steps - i) * run - 0.04);
      });
      /* the portal's light on the treads: full strength on the top step, gone by the fourth down */
      const k = Math.pow((i + 1) / steps, 3.2);
      if (k > 0.02) { const tw = hwash(total - 0.6, run * 1.6, _tw.set(A.hue).multiplyScalar(k)).rotateX(-Math.PI / 2); tw.translate(0, h + 0.03, zc); A.wash.push(tw); }
    }
    const rampAngle = Math.atan2(floorY, rampLen), rampHyp = Math.hypot(floorY, rampLen);
    const ramp = box(rampW, 0.24, rampHyp, M.graphiteLight, 0, floorY / 2 - 0.12, rampLen / 2); ramp.rotation.x = -rampAngle; ramp.receiveShadow = true; g.add(ramp);
    [-1, 1].forEach(sd => part(seams, chamferBox(0.06, 0.02, rampHyp - 0.2, 0.008), sd * (rampW / 2 - 0.1), floorY / 2 + 0.011, rampLen / 2, 0, -rampAngle));
    part(treads, chamferBox(rampW + 0.4, 0.06, 0.6, 0.02), 0, 0.03, rampLen + 0.3);   /* the landing lip at plaza level */
    merged(g, treads, M.graphiteLight, 'civic-stair', true);
    const sm = merged(g, seams, M.energySoft, 'stair-seams', false);
    if (sm) ctx.reflect(sm, 0.3);
    /* handrails either side of the ramp and along the splayed outer edges: posts + a top bar, a human-scale cue */
    { const rails = []; [-1, 1].forEach(sd => { for (let i = 0; i <= 4; i++) { const zz = rampLen - i * (rampLen / 4), yy = floorY * (1 - zz / rampLen); part(rails, chamferBox(0.06, 1.0, 0.06, 0.01), sd * (rampW / 2 + 0.16), yy + 0.5, zz); } const bar = chamferBox(0.06, 0.06, rampHyp, 0.01); part(rails, bar, sd * (rampW / 2 + 0.16), floorY / 2 + 1.0, rampLen / 2, 0, -rampAngle); for (let i = 0; i < steps; i += 2) part(rails, chamferBox(0.06, 1.0, 0.06, 0.01), sd * (stairW(i) / 2 - 0.34), rise * (i + 1) + 0.5, (steps - i) * run - run / 2); }); merged(g, rails, M.trimSatin, 'stair-rails', false); }
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
    closeAnswers(ctx, g, A);
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
    /* MAH MARKET COMMITS TO MAGENTA — and it is the destination that needs the coldest accent, because
       it is also the warmest building in the plaza: a canopy soffit, a shopfront and two lit storeys
       of interior white. The magenta is the only cold light on it, and it is what the warm is read
       against. */
    const A = answers(ctx, 'market');
    const f = facade(ctx, g, { W, H, D, openW, openH, pierDepth: E, roomDepth: R, radius: S.radius, glassMullions: 4, ans: A });
    dressFacade(ctx, g, { W, H, D, openW, openH, E, seed: 3, windowsUpper: false, roofKit: false, wings: 'rear', ans: A });   /* the civic market: wings and canopy, terraces instead of a roof kit */
    crystallize(ctx, g, { W, H, D, openW, E, seed: 3, beacon: false, crown: false });   /* the terraces ARE the roof line */
    terraces(ctx, g, { W, H, D, E, seed: 3 });
    /* MAH MARKET is the SOCIAL, CIVIC one (§22): wide glazing and a busy interior, the most occupied
       of the three, so it reads as a place people are in rather than a shopfront.
       v8: TWO FIELDS, NOT ONE. A single 33 m field ran straight behind the wordmark, whose mounted
       backing panel is opaque and 16 m wide — half of the market's glazing was built and then buried.
       The fields now flank the sign, which is also how the piered order wants them. */
    [-1, 1].forEach(sd => {
      const off = sd * 12.55, side = { wash: [] };
      const sub = new THREE.Group(); sub.position.x = off; g.add(sub);
      curtainWall(ctx, sub, { W: 8.5, H, sillY: openH + 1.2, topY: H - 0.8, bays: 3, floors: 2, z: 0.6, seed: 33 + sd, lit: 0.86, ans: side });
      side.wash.forEach(w => A.wash.push(w.translate(off, 0, 0)));
    });
    platinumOrder(ctx, g, { W, H, openW, openH, order: 'piered' });   /* vertical: a civic order against the market's horizontal terraces */
    action('market', 'MAH MARKET', 'destination', f.glass, world(g, 0, 0, 2), { view: 'market-entrance', copy: 'World marketplace. Preview navigation only: nothing is for sale here and no prices exist.' });
    /* THE SIGNAGE BAND (law 5): one continuous 34 m line of magenta carried under the cornice, across
       the tops of the four piers, above the glazing and clear of the wordmark's frame. It is the only
       thing on this facade a viewer reads before they read the name, which is what a signage band is
       for — and its wash lights the cornice soffit above it and the head of the glazing below. */
    signBand(ctx, g, { runs: [[-17, 17]], y: 14.75, h: 0.38, z: 1.28, d: 0.18, ans: A });
    /* the portal: 22 m wide, the widest opening in the plaza, with a deep brow and full jamb linings */
    portal(ctx, g, { openW, openH, E, brow: 0.8, ans: A });
    /* the continuous sill light under the glass — the welcome line, now in the district's own hue so
       the entrance, the band and the pool on the floor outside are all one piece of light */
    const sill = chamferBox(openW, 0.07, 0.1, 0.02); sill.translate(0, 0.07, -E + 0.3); A.glow.push(sill);
    /* a lit fascia band under the entry canopy: the market is the WELCOMING destination, and it reads as
       lit architecture from the plaza rather than a dark hole under a bright lip. It stays WARM — this
       is the light of the shop behind it reaching the street, and the market's warmth is its identity. */
    const fascia = new THREE.Mesh(new THREE.PlaneGeometry(openW + 1.6, 0.7), M.interiorSoft);
    fascia.position.set(0, openH + 0.75, 0.58); g.add(fascia); ctx.reflect(fascia, 0.24);
    const fw = hwash(openW + 4.0, 2.6, M.interiorSoft.color); fw.translate(0, openH + 0.6, 0.64); A.wash.push(fw);
    /* the canonical facility lockup: NAME over TAGLINE, the one pairing identical in all three
       reference frames. No product line, no nutrition claim, nothing invented. */
    sign(ctx, g, { title: 'MAH MARKET', sub: 'LIVE HIGHER', mark: true, width: 14.5, y: 11.4, z: 0.8, ans: A });
    /* interior: shelving zones with abstract merchandise, two display plinths */
    const room = g.children.find(c => c.isGroup && c.position.z === -E);
    const tints = [0x3f5a86, 0x7c8fb0, 0x2f7f8f, 0x8a7ab8, 0x5ea2c8];
    const goods = tints.map(t => new THREE.MeshStandardMaterial({ color: t, roughness: 0.4, metalness: 0.2, flatShading: true }));
    /* THE SHOPFRONT: four runs of shelving read through 22 m of glass. Every level is lit from under
       the shelf above it — which is how a real shopfront is lit, and the reason this room reads as
       INHABITED rather than as a lit box. Sixty small meshes became eight: shelves, uprights and the
       five goods families each merge, and the twelve light strips join the building's warm fittings. */
    const shelves = [], uprights = [], stock = tints.map(() => []);
    for (let r = 0; r < 4; r++) {
      const x = -7.5 + r * 5, z = -6;
      [0.9, 1.7, 2.5].forEach(y => {
        part(shelves, chamferBox(4, 0.06, 0.6, 0.015), x, y, z);
        const strip = chamferBox(3.7, 0.05, 0.14, 0.012); strip.translate(x, y - 0.1, z + 0.2 - E); A.warm.push(strip);
      });
      [-1.9, 1.9].forEach(dx => part(uprights, chamferBox(0.08, 2.7, 0.6, 0.02), x + dx, 1.35, z));
      for (let k = 0; k < 9; k++) { const y = [0.93, 1.73, 2.53][k % 3] + 0.17; part(stock[(k + r) % goods.length], chamferBox(0.45 + (k % 3) * 0.12, 0.3 + (k % 2) * 0.12, 0.35, 0.03), x - 1.4 + (k % 3) * 1.1 + (r % 2) * 0.3, y, z); }
      /* and the light lands: a warm wash down the face of each run, which is what a viewer outside
         actually sees of this room through the glass */
      const sw = hwash(4.6, 3.4, M.interiorSoft.color); sw.translate(x, 1.7, z + 0.42 - E); A.wash.push(sw);
    }
    merged(room, shelves, M.platinum, 'market-shelves', false);
    merged(room, uprights, M.graphiteDark, 'market-uprights', false);
    stock.forEach((list, i) => merged(room, list, goods[i], 'market-stock-' + i, false));
    [[-4, -2.2], [4, -2.2]].forEach(([x, z]) => { room.add(box(1.4, 1.0, 1.4, M.graphiteLight, x, 0.5, z)); const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), M.energySoft); crystal.position.set(x, 1.45, z); room.add(crystal); });
    closeAnswers(ctx, g, A);
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
