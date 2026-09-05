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
import { softMass, signTexture, GLYPHS, diamondOutline, NEUTRALS } from './materials.js';

/* a square-diamond frame standing upright in the XY plane */
function diamondFrame(size, bar, mat, depth = 0.12) {
  const grp = new THREE.Group(); const half = size / 2;
  const geo = new THREE.BoxGeometry(size, bar, depth);
  for (let i = 0; i < 4; i++) { const seg = new THREE.Mesh(geo, mat); const a = i * Math.PI / 2; seg.position.set(Math.cos(a) * half, Math.sin(a) * half, 0); seg.rotation.z = a + Math.PI / 2; grp.add(seg); }
  grp.rotation.z = Math.PI / 4;
  return grp;
}
function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }

function sign(ctx, parent, spec) {
  const tex = signTexture(spec);
  const mat = ctx.M.signage.clone(); mat.map = tex;
  ctx.signMaterials.push(mat);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, spec.width * (spec.h || 768) / (spec.w || 2048)), mat);
  mesh.position.set(spec.x || 0, spec.y, spec.z);
  parent.add(mesh);
  if (spec.reflect !== false) ctx.reflect(mesh, 0.3);
  return mesh;
}

/* the composed facade: body + room + glass + piers + lintel */
function facade(ctx, parent, o) {
  const { M } = ctx;
  const { W, H, D, openW, openH, pierDepth: E, roomDepth: R, floorY = 0, radius = 1.4, glassMullions = 0 } = o;
  const body = new THREE.Mesh(softMass(W, H, D, radius), M.graphite); body.position.z = -(E + R); parent.add(body);
  /* room: floor, ceiling, back wall, side walls, light strips */
  const room = new THREE.Group(); room.position.set(0, floorY, -E);
  const rw = openW + 6, rh = openH + 1.2;
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
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(openW, openH), M.glass); glass.position.set(0, floorY + openH / 2, -E + 0.15); parent.add(glass);
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
  /* platinum roof trims: the silhouette catches light without a neon outline */
  parent.add(box(pierW - 1.2, 0.16, 0.22, M.platinum, -W / 2 + pierW / 2, H - 0.32, 0.36));
  parent.add(box(pierW - 1.2, 0.16, 0.22, M.platinum, W / 2 - pierW / 2, H - 0.32, 0.36));
  parent.add(box(openW - 0.8, 0.16, 0.22, M.platinum, 0, H - 0.32, 0.36));
  /* a faceted crystalline panel region on the lintel: controlled, not everywhere */
  const panels = new THREE.Group();
  const cols = Math.max(3, Math.round(openW / 3.2));
  for (let i = 0; i < cols; i++) { const pw = openW / cols - 0.25; const p = box(pw, lintelH * 0.34, 0.22, M.panel, -openW / 2 + pw / 2 + i * (openW / cols) + 0.12, floorY + openH + lintelH * 0.22, 0.34 + (i % 2) * 0.06); p.rotation.y = (i % 2 ? 1 : -1) * 0.05; panels.add(p); }
  parent.add(panels);
  return { body, room, glass, pl, pr, lintel };
}

export function buildBuildings(ctx) {
  const { M, scene } = ctx;
  ctx.signMaterials = ctx.signMaterials || [];
  ctx.residentSpots = ctx.residentSpots || [];
  ctx.entranceLights = ctx.entranceLights || [];
  const out = {};

  /* ---------------- MAH GYM — training ---------------------------------- */
  {
    const g = new THREE.Group(); g.name = 'MAH GYM';
    const W = 30, H = 16, openW = 14, openH = 8, E = 4, R = 12;
    g.position.set(-36, 0, -30); g.rotation.y = 0.32; scene.add(g);
    facade(ctx, g, { W, H, D: 26, openW, openH, pierDepth: E, roomDepth: R, radius: 1.6, glassMullions: 2 });
    /* upper window band across the piers: interior glow behind glass */
    const windowGlow = M.interiorSoft.clone(); windowGlow.opacity = 0.28; ctx.timeHooks.push(s => { windowGlow.opacity = 0.28 * (1 - s.daylight * 0.5); });
    [-1, 1].forEach(s => { const gl = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 2.2), M.glass); gl.position.set(s * (W / 2 - 4.2), 11.6, 0.44); g.add(gl); const glow = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 2.0), windowGlow); glow.position.set(s * (W / 2 - 4.2), 11.6, 0.3); g.add(glow); });
    /* one light seam on each outer pier: a single vertical energy line, not an outline */
    [-1, 1].forEach(s => { const seam = box(0.08, H * 0.62, 0.06, M.energy, s * (W / 2 - 1.0), H * 0.42, 0.46); g.add(seam); ctx.reflect(seam, 0.35); });
    /* signage on the lintel */
    sign(ctx, g, { title: 'MAH GYM', sub: 'TRAIN HIGHER', glyph: GLYPHS.dumbbell, width: 12.5, y: 12.1, z: 0.62 });
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
    ctx.residentSpots.push(spot(g, 0, 0.3, -E - 6.5, 0, { colour: 'blue', physique: 0.75, sex: 'm', pose: 'spar', seed: 11, note: 'training inside MAH GYM' }));
    ctx.entranceLights.push(world(g, 0, 7.5, 11));
  }

  /* ---------------- MAH MATCH — the fighting facility --------------------- */
  {
    const g = new THREE.Group(); g.name = 'MAH MATCH';
    const W = 44, H = 24, openW = 18, openH = 14, E = 5, R = 22, floorY = 1.8;
    g.position.set(0, 0, -48); scene.add(g);
    facade(ctx, g, { W, H, D: 34, openW, openH, pierDepth: E, roomDepth: R, floorY, radius: 1.8 });
    /* the strong central frame around the opening, with a square-diamond keystone */
    const fT = 1.4, fD = 1.0, fz = 0.55;
    const frameMat = M.platinum;
    g.add(box(fT, openH + fT * 2, fD, frameMat, -openW / 2 - fT / 2, floorY + openH / 2 + fT / 2, fz));
    g.add(box(fT, openH + fT * 2, fD, frameMat, openW / 2 + fT / 2, floorY + openH / 2 + fT / 2, fz));
    g.add(box(openW + fT * 2, fT, fD, frameMat, 0, floorY + openH + fT / 2 + fT / 2, fz));
    const key = diamondFrame(2.6, 0.22, M.energyLight, 0.2); key.position.set(0, floorY + openH + fT + 0.6, fz + 0.3); g.add(key);
    ctx.reflect(key.children[0], 0.3);
    /* horizontal structural bands across the piers */
    [7.5, 13.5, 19.5].forEach(y => [-1, 1].forEach(s => { const b = box((W - openW) / 2 - 1.2, 0.35, 0.3, M.platinum, s * (openW / 2 + (W - openW) / 4 + 0.3), y, 0.5); g.add(b); }));
    /* faceted armour-like panel regions on the piers, restrained */
    [-1, 1].forEach(s => { for (let i = 0; i < 3; i++) { const p = box(3.0, 2.2, 0.28, M.panel, s * (openW / 2 + 5.2 + (i % 2) * 0.4), 10 + i * 3, 0.42); p.rotation.y = s * 0.06; g.add(p); } });
    /* the two banners: dark cloth with the red square-diamond, the competitive accent */
    [-1, 1].forEach(s => { const cloth = box(1.8, 8.5, 0.06, M.graphiteDark, s * (openW / 2 + 3.2), floorY + 8.5, 0.62); g.add(cloth); const em = diamondFrame(0.9, 0.09, M.matchRed, 0.06); em.position.set(s * (openW / 2 + 3.2), floorY + 11.4, 0.7); g.add(em); });
    /* signage: the name, primary; wayfinding stays at the entrance */
    sign(ctx, g, { title: 'MAH MATCH', glyph: GLYPHS.fist, width: 15, y: floorY + openH + fT + 4.9, z: 0.62 });
    const way = (title, x) => sign(ctx, g, { title, width: 2.6, y: floorY + 2.6, z: -E + 0.5, x, titleSize: 120, w: 2048, h: 320, reflect: false });
    way('FIND AN OPPONENT', -openW / 2 + 1.6); way('BUDDY PRACTICE', 0); way('SOLO PRACTICE', openW / 2 - 1.6);
    /* wide shallow entrance stairs up to the recessed floor */
    const steps = 6, rise = floorY / steps, run = 1.4;
    for (let i = 0; i < steps; i++) { const h = rise * (i + 1); g.add(box(openW + 6 + (steps - i) * 0.6, h, run, M.graphiteLight, 0, h / 2, (steps - i) * run - run / 2)); const strip = box(openW + 6 + (steps - i) * 0.6, 0.02, 0.05, M.energySoft, 0, h + 0.011, (steps - i) * run - 0.03); g.add(strip); }
    /* interior: the square-diamond fighting platform, energy boundary, spectator tiers, practice zones */
    const room = g.children.find(c => c.isGroup && c.position.z === -E);
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
    /* practice zones at the back: buddy (left) and solo (right) */
    [-1, 1].forEach(s => { const pz = box(5, 0.25, 5, M.graphiteDark, s * 7, 0.125, -19); pz.rotation.y = Math.PI / 4; room.add(pz); const pb = diamondOutline(5.3, 0.06, M.energySoft, 0.02); pb.position.set(s * 7, 0.27, -19); room.add(pb); });
    out.match = g;
    /* people explain the function: two facing each other on the platform, one observing, one waiting at opponent entry */
    ctx.residentSpots.push(spot(g, -2.3, floorY + 0.8, -E - 10, Math.PI / 2, { colour: 'green', physique: 0.8, sex: 'm', pose: 'spar', seed: 21, note: 'sparring on the MAH MATCH platform' }));
    ctx.residentSpots.push(spot(g, 2.3, floorY + 0.8, -E - 10, -Math.PI / 2, { colour: 'red', physique: 0.7, sex: 'f', pose: 'spar', seed: 22, note: 'sparring on the MAH MATCH platform' }));
    ctx.residentSpots.push(spot(g, -10.2, floorY + 0.4, -E - 6, Math.PI / 2, { colour: 'purple', physique: 0.4, sex: 'f', pose: 'observe', seed: 23, note: 'observing from the tier' }));
    ctx.residentSpots.push(spot(g, -6.5, floorY, -E - 2.5, 0, { colour: 'teal', physique: 0.55, sex: 'm', pose: 'stand', seed: 24, note: 'waiting near FIND AN OPPONENT' }));
    ctx.entranceLights.push(world(g, 0, floorY + 8.5, 14));
    ctx.arenaLight = world(g, 0, floorY + 5, -E - 10);
  }

  /* ---------------- MAH MARKET — world commerce -------------------------- */
  {
    const g = new THREE.Group(); g.name = 'MAH MARKET';
    const W = 32, H = 12, openW = 20, openH = 7, E = 2.5, R = 12;
    g.position.set(36, 0, -30); g.rotation.y = -0.32; scene.add(g);
    facade(ctx, g, { W, H, D: 22, openW, openH, pierDepth: E, roomDepth: R, radius: 3.0, glassMullions: 3 });
    /* a soft continuous sill light under the glass — the welcome line */
    const sill = box(openW, 0.05, 0.08, M.energyLight, 0, 0.06, -E + 0.3); g.add(sill); ctx.reflect(sill, 0.3);
    sign(ctx, g, { title: 'MAH MARKET', sub: 'GEAR · STYLE · NUTRITION · MORE', glyph: GLYPHS.cart, width: 13.5, y: 9.15, z: 0.62 });
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
    ctx.residentSpots.push(spot(g, 2.5, 0, -E - 3.6, Math.PI, { colour: 'violet', physique: 0.5, sex: 'f', pose: 'observe', seed: 31, note: 'examining MAH MARKET' }));
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
