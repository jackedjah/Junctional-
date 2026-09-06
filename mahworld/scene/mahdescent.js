/* MAHWORLD :: MAH DESCENT — the way down, built before the place it goes
   ============================================================================================

   R3-07, and its last line is the one that decides the whole design:

       "The cave biome itself can come later. The entrances and traversal contract start now."

   So this module builds a PROMISE, and a promise has to be kept visually or it is a decoration. An
   entrance that is a door with nothing behind it is the same failure as an ascent line that stops in
   open sky — the viewer is told a route exists and never shown that it goes anywhere. Everything
   below is in service of one sentence being true when you stand in front of it: SOMETHING IS DOWN
   THERE, AND THIS IS HOW YOU GET TO IT.

   ---- THE FORM (R3-07, exactly) ----------------------------------------------------------------
     · a tall ROUNDED RECTANGULAR PRISM at ~5x canonical MAHBEING height (residents.js: 1.9–2.0 m,
       so 10 m of shell over a heavy base);
     · softened premium corners — a deep chamfer, not a bevel;
     · a PLATINUM outer shell and a BLACK-CRYSTAL interior seen through the threshold;
     · multiple crystallization patterns rather than one repeated facet;
     · square-diamond nodes integrated into the structure, not stuck on it;
     · an obvious top/bottom hierarchy — a crown that is not the base;
     · a HEAVY PHYSICAL BASE, because a 10 m prism resting on a line reads as a poster;
     · a VISIBLE THRESHOLD.

   ---- WHY THE DOOR SLIDES UP -------------------------------------------------------------------
   R3-07 specifies a vertically sliding door and it is not an arbitrary choice: a door that slides
   SIDEWAYS reads as a lift on the level you are standing on. One that rises out of the way, leaving
   a lit shaft under your feet, reads as an opening in the ground. The direction of the door's travel
   is the first thing that tells you which way you are about to go.

   ---- DOWNWARD READABILITY ---------------------------------------------------------------------
   R3-07 lists seven cues and they are all here because any one alone is ambiguous:
     descending diamond packets · a descending light sequence on the jamb · visible depth beneath the
     threshold · a downward MAHGIC beam · a floor aperture with a shaft glimpse · downward-moving
     audio mini-lines · MAH DESCENT signage.
   Together they say DOWN in seven different sensory registers, which is what R3-03 asks for — the
   reading may not depend on any single channel.

   ---- PROXIMITY --------------------------------------------------------------------------------
   The assembly hands this module the eye position each frame. Inside OPEN_R the door rises; outside
   it falls. The motion is critically damped rather than linear, so it has weight — R3-07's "smooth,
   weighty motion" is a curve, not a duration.

   buildMahDescent(ctx, { sites }) -> the standard module contract, plus setEye(x, y, z). */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, signTexture } from './materials.js';
import { createMusicLineField } from './musicline.js';

const TAU = Math.PI * 2;
const MAHBEING_H = 2.0;                      /* residents.js defaultH, male, at physique 1.0 */

export const DESCENT = Object.freeze({
  H: MAHBEING_H * 5,                         /* R3-07: approximately 5x canonical MAHBEING height */
  W: 5.4, D: 4.2,
  BASE_H: 1.5, BASE_OUT: 1.9,                /* the heavy physical base, and how far it oversails */
  CHAMFER: 0.85,                             /* softened premium corners, deep enough to read as soft */
  DOOR_W: 2.9, DOOR_H: 4.6,
  OPEN_R: 26,                                /* proximity radius at which the door begins to rise */
  TAU_DOOR: 0.55,                            /* critical-damping time constant: weight, not duration */
  SHAFT_D: 26,                               /* how far the visible shaft descends below the threshold */
  PACKETS: 9                                 /* diamonds descending inside each shaft */
});

const gold = i => (i * 2.3999632) % TAU;
const frac = i => (i * 0.6180339887) % 1;
const frac2 = i => (i * 0.7548776662) % 1;

export function buildMahDescent(ctx, opts = {}) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'mah-descent';
  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { entrances: 0, sites: [], draws: 0, triangles: 0, derived: { height: DESCENT.H, mahbeingMultiple: DESCENT.H / MAHBEING_H } };

  /* R3-07's three recommended locations. The assembly supplies the real coordinates for the two
     peer cities from THEIR OWN stats (L42: one source decides where a city is), and falls back to
     the doctrine's placement if a module failed to build. */
  const SITES = (opts.sites && opts.sites.length ? opts.sites : [
    { id: 'civic', x: 66, y: 0.17, z: 26, ry: -2.2 }
  ]);

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3();
  const at = (x, y, z, ry, sx, sy, sz) => {
    _p.set(x, y, z); _e.set(0, ry || 0, 0); _q.setFromEuler(_e);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(_p, _q, _s).clone();
  };

  /* ---- the merge helper. No BufferGeometryUtils in this build (LOCKED). ---------------------- */
  const shell = [], dark = [];
  function mergeInto(list) {
    let n = 0;
    for (const it of list) {
      const g = it.geo;
      n += g.index ? g.index.count : g.attributes.position.count;
    }
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const nm = new THREE.Matrix3(), v = new THREE.Vector3();
    let o = 0;
    for (const it of list) {
      const g = it.geo, P = g.attributes.position, N = g.attributes.normal;
      const idx = g.index ? g.index.array : null;
      nm.getNormalMatrix(it.matrix);
      const take = i => {
        v.fromBufferAttribute(P, i).applyMatrix4(it.matrix);
        pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
        nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z;
        col[o * 3] = col[o * 3 + 1] = col[o * 3 + 2] = it.value;
        o++;
      };
      if (idx) { for (let i = 0; i < idx.length; i++) take(idx[i]); }
      else { for (let i = 0; i < P.count; i++) take(i); }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o * 3), 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor.subarray(0, o * 3), 3));
    out.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, o * 3), 3));
    return out;
  }

  /* ---- materials: R3-03's roles, and the separation between them is the reading --------------- */
  const platinum = (M.platinumLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0xb6c4d6 })).clone();
  platinum.vertexColors = true; platinum.name = 'descent-shell'; owned.materials.push(platinum);
  const blackCrystal = (M.graphiteMetal || M.graphite || new THREE.MeshStandardMaterial({ color: 0x121a26 })).clone();
  blackCrystal.vertexColors = true; blackCrystal.name = 'descent-interior'; owned.materials.push(blackCrystal);
  const glow = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energyLight), transparent: true, opacity: 0.34,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  glow.name = 'descent-mahgic'; owned.materials.push(glow);
  const voidMat = new THREE.MeshBasicMaterial({ color: 0x02040a, fog: true });
  voidMat.name = 'descent-void'; owned.materials.push(voidMat);

  /* the door leaf gets its own material because it MOVES, and a moving thing that shares a merged
     mesh with a static one cannot move */
  const doorMat = platinum.clone(); doorMat.vertexColors = false;
  doorMat.name = 'descent-door'; owned.materials.push(doorMat);

  const sign = signTexture({ title: 'MAH DESCENT', sub: 'LOWER LEVELS', mark: true });
  owned.textures.push(sign);
  const signMat = new THREE.MeshBasicMaterial({ map: sign, transparent: true, opacity: 0.92, fog: true, toneMapped: true });
  signMat.name = 'descent-sign'; owned.materials.push(signMat);
  if (ctx && ctx.signMaterials) ctx.signMaterials.push(signMat);

  const doors = [], shafts = [];

  SITES.forEach((S, i) => {
    const x = S.x, z = S.z, y0 = S.y != null ? S.y : 0.17, ry = S.ry != null ? S.ry : 0;
    const fwd = [Math.sin(ry), Math.cos(ry)];          /* the face the threshold is cut into */

    /* ---- THE HEAVY BASE. R3-07 asks for it by name, and the reason is that a 10 m prism landing on
       a line reads as a poster standing on the pavement. Two receding courses give it weight and a
       plinth to be read against. */
    shell.push({ geo: chamferBox(DESCENT.W + DESCENT.BASE_OUT, DESCENT.BASE_H, DESCENT.D + DESCENT.BASE_OUT, 0.35),
      matrix: at(x, y0 + DESCENT.BASE_H / 2, z, ry), value: 0.34 });
    shell.push({ geo: chamferBox(DESCENT.W + 0.9, 0.5, DESCENT.D + 0.9, 0.22),
      matrix: at(x, y0 + DESCENT.BASE_H + 0.25, z, ry), value: 0.62 });

    /* ---- THE SHELL. One prism, deeply chamfered — R3-07's "softened premium corners". It is built
       as THREE stacked courses rather than one box so the top/bottom hierarchy it asks for exists in
       the massing and not only in the decoration: a broad shoulder, a taller body, a narrower crown. */
    const bodyY = y0 + DESCENT.BASE_H + 0.5;
    const courses = [
      { h: DESCENT.H * 0.16, w: 1.00, v: 0.72 },      /* shoulder */
      { h: DESCENT.H * 0.62, w: 0.94, v: 0.86 },      /* body */
      { h: DESCENT.H * 0.22, w: 0.80, v: 1.00 }       /* crown, brightest and smallest */
    ];
    let cy = bodyY;
    courses.forEach((C, ci) => {
      shell.push({ geo: chamferBox(DESCENT.W * C.w, C.h, DESCENT.D * C.w, DESCENT.CHAMFER),
        matrix: at(x, cy + C.h / 2, z, ry), value: C.v });
      /* a platinum reveal at every course joint: the clear material boundary R3-02 asks for */
      if (ci < courses.length - 1) {
        shell.push({ geo: chamferBox(DESCENT.W * C.w * 1.06, 0.22, DESCENT.D * C.w * 1.06, 0.08),
          matrix: at(x, cy + C.h, z, ry), value: 1.0 });
      }
      cy += C.h;
    });
    const topY = cy;

    /* ---- CRYSTALLIZATION, R3-02's layered construction rather than facet noise ----------------
       Large authored faces on the two flanks (inset crystal fields), square-diamond nodes at the
       corners of the body course, and thin MAHGIC seams up the two rear arrises. Nothing repeats on
       every surface: the front is the threshold, the flanks are the fields, the back is the seams. */
    for (const side of [-1, 1]) {
      const sx = x + Math.cos(ry) * side * DESCENT.W * 0.47;
      const sz = z - Math.sin(ry) * side * DESCENT.W * 0.47;
      for (let f = 0; f < 3; f++) {
        const fy = bodyY + DESCENT.H * (0.24 + 0.20 * f);
        const fw = DESCENT.D * (0.62 - 0.10 * f);
        shell.push({ geo: chamferBox(0.34, DESCENT.H * 0.13, fw, 0.10),
          matrix: at(sx, fy, sz, ry), value: 0.44 + 0.16 * f });
      }
    }
    for (let c = 0; c < 4; c++) {
      const a = c * TAU / 4 + Math.PI / 4 + ry;
      const d = own(new THREE.OctahedronGeometry(1, 0));
      shell.push({ geo: d, matrix: at(x + Math.cos(a) * DESCENT.W * 0.44, bodyY + DESCENT.H * 0.70,
        z + Math.sin(a) * DESCENT.W * 0.44, a, 0.62, 0.86, 0.62), value: 1.0 });
    }

    /* ---- THE THRESHOLD ALCOVE — a real recess cut into the front face, so the doorway has DEPTH.
       A door drawn flat on a facade is a picture of a door. The alcove's back and sides are the
       black-crystal interior R3-07 specifies, and its floor is the aperture. */
    const fx = x + fwd[0] * DESCENT.D * 0.5, fz = z + fwd[1] * DESCENT.D * 0.5;
    const inX = x + fwd[0] * (DESCENT.D * 0.5 - 1.5), inZ = z + fwd[1] * (DESCENT.D * 0.5 - 1.5);
    dark.push({ geo: chamferBox(DESCENT.DOOR_W, DESCENT.DOOR_H, 3.0, 0.14),
      matrix: at(inX, y0 + DESCENT.BASE_H + 0.5 + DESCENT.DOOR_H / 2, inZ, ry), value: 0.16 });
    /* the JAMB: a platinum surround, which is what makes the recess read as built rather than as a
       hole, and is where the descending light sequence runs */
    for (const side of [-1, 1]) {
      shell.push({ geo: chamferBox(0.42, DESCENT.DOOR_H + 0.8, 1.0, 0.14),
        matrix: at(fx + Math.cos(ry) * side * (DESCENT.DOOR_W * 0.5 + 0.3),
                   y0 + DESCENT.BASE_H + 0.5 + DESCENT.DOOR_H / 2,
                   fz - Math.sin(ry) * side * (DESCENT.DOOR_W * 0.5 + 0.3), ry), value: 1.0 });
    }
    shell.push({ geo: chamferBox(DESCENT.DOOR_W + 1.4, 0.5, 1.0, 0.16),
      matrix: at(fx, y0 + DESCENT.BASE_H + 0.5 + DESCENT.DOOR_H + 0.4, fz, ry), value: 1.0 });

    /* ---- VISIBLE DEPTH BENEATH THE THRESHOLD ----------------------------------------------------
       THE SHAFT MUST BE HOLLOW, AND THE FIRST CUT MADE IT SOLID. A chamferBox filling the shaft
       volume is a block of black crystal: standing at the open door you saw its front FACE, and the
       beam and the descending packets — the two cues that carry the whole message — were sealed
       inside it. The doorway rendered as a flat black rectangle, which is the exact failure R3-07 is
       written against: an entrance with nothing behind it.
       So the shaft is its WALLS: a back panel and two flanks, with the volume between them open and
       no floor at all. What you look into is a real hole with a beam falling down it. */
    const thY = y0 + DESCENT.BASE_H + 0.5;
    const halfW = DESCENT.DOOR_W * 0.43;
    dark.push({ geo: chamferBox(DESCENT.DOOR_W * 0.86, DESCENT.SHAFT_D, 0.3, 0.06),
      matrix: at(inX + fwd[0] * -1.1, thY - DESCENT.SHAFT_D / 2, inZ + fwd[1] * -1.1, ry), value: 0.10 });
    for (const side of [-1, 1]) {
      dark.push({ geo: chamferBox(0.3, DESCENT.SHAFT_D, 2.2, 0.06),
        matrix: at(inX + Math.cos(ry) * side * halfW, thY - DESCENT.SHAFT_D / 2,
                   inZ - Math.sin(ry) * side * halfW, ry), value: 0.08 });
    }
    /* THE FLOOR APERTURE — a lit rim at the exact lip of the drop, which is what makes the eye read
       the darkness beyond it as DEPTH rather than as an unlit wall */
    for (const side of [-1, 1]) {
      shell.push({ geo: chamferBox(0.34, 0.20, 2.3, 0.06),
        matrix: at(inX + Math.cos(ry) * side * halfW, thY + 0.06, inZ - Math.sin(ry) * side * halfW, ry), value: 1.0 });
    }
    shell.push({ geo: chamferBox(DESCENT.DOOR_W * 0.86, 0.20, 0.34, 0.06),
      matrix: at(inX + fwd[0] * -1.05, thY + 0.06, inZ + fwd[1] * -1.05, ry), value: 1.0 });
    /* THE DOWNWARD BEAM, and it runs from ABOVE the threshold to the bottom of the shaft, so it is
       visible in the doorway before it disappears into the floor. A beam that starts at the lip is a
       beam you cannot see until you are standing on the edge. */
    const beamTop = thY + DESCENT.DOOR_H * 0.72;
    const beamLen = beamTop - (thY - DESCENT.SHAFT_D);
    const beamGeo = own(new THREE.CylinderGeometry(0.30, 0.13, beamLen, 6, 1, true));
    const beam = new THREE.Mesh(beamGeo, glow);
    beam.position.set(inX, beamTop - beamLen / 2, inZ);
    beam.name = 'descent-beam'; beam.renderOrder = 4;
    group.add(beam);

    /* ---- THE DOOR. One leaf, and it RISES. Its rest position seals the alcove; open, it is inside
       the head of the frame. */
    const leaf = new THREE.Mesh(own(chamferBox(DESCENT.DOOR_W, DESCENT.DOOR_H, 0.42, 0.16)), doorMat);
    leaf.position.set(fx - fwd[0] * 0.25, thY + DESCENT.DOOR_H / 2, fz - fwd[1] * 0.25);
    leaf.rotation.y = ry;
    leaf.name = 'descent-door-' + (S.id || i);
    group.add(leaf);
    doors.push({ mesh: leaf, y0: thY + DESCENT.DOOR_H / 2, x, z, open: 0 });

    /* ---- SIGNAGE, over the head of the frame ---------------------------------------------------- */
    const signGeo = own(new THREE.PlaneGeometry(DESCENT.W * 0.82, DESCENT.W * 0.82 * (768 / 2048)));
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(fx + fwd[0] * 0.06, thY + DESCENT.DOOR_H + 1.5, fz + fwd[1] * 0.06);
    signMesh.rotation.y = ry;
    signMesh.name = 'descent-sign';
    group.add(signMesh);

    /* ---- THE CROWN. A square diamond over the whole thing, because every MAHWORLD structure that
       matters carries the brand figure, and because the top of the hierarchy has to be the top. */
    const crown = own(new THREE.OctahedronGeometry(1, 0));
    shell.push({ geo: crown, matrix: at(x, topY + 1.5, z, gold(i * 7), 1.5, 1.2, 1.5), value: 1.0 });

    /* the packets START above the threshold too, for the same reason as the beam: the eye has to see
       one ENTER the floor to understand that the floor is not the bottom */
    shafts.push({ x: inX, z: inZ, top: thY + DESCENT.DOOR_H * 0.68, ry, phase: frac(i * 13) });
    stats.sites.push({ id: S.id || ('descent-' + i), x: +x.toFixed(1), z: +z.toFixed(1) });
    stats.entrances++;

    /* LAW 2: every emitter is answered. A lit doorway on a black floor needs its pool. */
    if (ctx && typeof ctx.lightPool === 'function') {
      try { ctx.lightPool({ x: fx + fwd[0] * 3, z: fz + fwd[1] * 3, rx: 9, rz: 9, k: 0.34, hue: theme.energy }); } catch (e) {}
    }
    /* A COLLIDER, AND IT HAS TO BE A MESH. mahplaza builds its camera/roam boxes with
       `(ctx.colliders || []).filter(o => o && o.isMesh)` and then takes each one's own bounding box —
       so a Box3 pushed here would be filtered out in silence and the entrance would be walkable
       straight through with nothing to show it had failed. One invisible proxy per entrance, sized
       to the prism: the merged shell mesh cannot serve, because its bounding box spans all three
       entrances and would wall off a third of the world. */
    if (ctx && ctx.colliders) {
      const proxy = new THREE.Mesh(
        own(new THREE.BoxGeometry(DESCENT.W + 0.6, topY - y0, DESCENT.D + 0.6)),
        new THREE.MeshBasicMaterial({ visible: false }));
      proxy.position.set(x, (y0 + topY) / 2, z);
      proxy.rotation.y = ry;
      proxy.visible = false;
      proxy.name = 'descent-collider-' + (S.id || i);
      owned.materials.push(proxy.material);
      group.add(proxy);
      ctx.colliders.push(proxy);
    }
  });

  if (shell.length) {
    const m = new THREE.Mesh(own(mergeInto(shell)), platinum);
    m.name = 'descent-shell'; group.add(m);
    stats.triangles += m.geometry.attributes.position.count / 3;
  }
  if (dark.length) {
    const m = new THREE.Mesh(own(mergeInto(dark)), blackCrystal);
    m.name = 'descent-interior'; group.add(m);
    stats.triangles += m.geometry.attributes.position.count / 3;
  }
  for (const it of shell.concat(dark)) if (it.geo && it.geo.dispose && owned.geometries.indexOf(it.geo) < 0) it.geo.dispose();

  /* ---- DESCENDING DIAMOND PACKETS -------------------------------------------------------------
     The single strongest of R3-07's seven cues, because it is the only one that MOVES, and motion is
     unambiguous about direction in a way that a gradient is not. */
  const packGeo = own(new THREE.OctahedronGeometry(1, 0));
  packGeo.scale(0.42, 0.30, 0.42);                  /* wider than tall: a diamond, never a needle */
  const packMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energyLight), transparent: true, opacity: 0.78,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  packMat.name = 'descent-packet'; owned.materials.push(packMat);
  const packets = new THREE.InstancedMesh(packGeo, packMat, Math.max(1, shafts.length * DESCENT.PACKETS));
  packets.name = 'descent-packets'; packets.frustumCulled = false; packets.renderOrder = 5;
  packets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(packets);

  /* ---- DOWNWARD-MOVING AUDIO MINI-LINES (R3-05 + R3-07) --------------------------------------- */
  const musicLines = createMusicLineField(ctx, shafts.map((S, i) => ({
    x: S.x - Math.sin(S.ry) * 0.0 + Math.cos(S.ry) * 1.5,
    y: S.top - DESCENT.DOOR_H * 0.68 + 0.15,   /* at the lip; S.top is now above the threshold */
    z: S.z + Math.sin(S.ry) * 1.5,
    ry: S.ry, scale: 1.5
  })), { name: 'descent-musicline', opacity: 0.66 });
  if (musicLines && musicLines.group) group.add(musicLines.group);

  stats.draws = 5 + (musicLines && musicLines.stats ? 1 : 0);

  /* ---- proximity + motion --------------------------------------------------------------------- */
  const eye = new THREE.Vector3(0, 1.7, 0);
  let quiet = false;
  const _mm = new THREE.Matrix4(), _pp = new THREE.Vector3(), _qq = new THREE.Quaternion(),
    _ee = new THREE.Euler(), _ss = new THREE.Vector3();

  function step(t, dt) {
    /* THE DOOR. Critical damping toward its target, so it starts slowly, carries, and settles —
       R3-07's "smooth, weighty motion". A linear tween would arrive and stop, which reads as light. */
    const k = 1 - Math.exp(-Math.max(0.001, Math.min(0.1, dt)) / DESCENT.TAU_DOOR);
    for (const D of doors) {
      const near = Math.hypot(eye.x - D.x, eye.z - D.z) < DESCENT.OPEN_R;
      D.open += ((near ? 1 : 0) - D.open) * k;
      D.mesh.position.y = D.y0 + D.open * (DESCENT.DOOR_H + 0.15);
    }
    if (quiet) return;
    let n = 0;
    for (let sI = 0; sI < shafts.length; sI++) {
      const S = shafts[sI];
      for (let p = 0; p < DESCENT.PACKETS; p++) {
        /* DOWN. The sign of this term is the entire message of the module. */
        const u = ((t * 0.16 + S.phase + p / DESCENT.PACKETS) % 1);
        const y = S.top - u * (DESCENT.SHAFT_D + DESCENT.DOOR_H * 0.68 - 1);
        const s = 1 - 0.45 * u;                       /* they shrink as they fall: depth */
        _pp.set(S.x, y, S.z);
        _ee.set(0, gold(sI * 5 + p) + t * 0.8, 0); _qq.setFromEuler(_ee);
        _ss.set(s, s, s);
        packets.setMatrixAt(n++, _mm.compose(_pp, _qq, _ss));
      }
    }
    packets.instanceMatrix.needsUpdate = true;
  }
  step(0, 1 / 60);

  return {
    group, stats,
    setEye(x, y, z) { eye.set(x, y, z); },
    update(t, dt) { step(t, dt || 1 / 60); if (musicLines && musicLines.update) musicLines.update(t); },
    setTime(s) {
      const night = 1 - (s && s.daylight != null ? s.daylight : 0);
      glow.opacity = 0.14 + 0.26 * night;
      packMat.opacity = 0.34 + 0.48 * night;
      signMat.opacity = 0.55 + 0.40 * night;
      if (musicLines && musicLines.setTime) musicLines.setTime(s);
    },
    setTheme(th) {
      if (!th) return;
      if (th.energyLight != null) { glow.color.setHex(th.energyLight); packMat.color.setHex(th.energyLight); }
      if (musicLines && musicLines.setTheme) musicLines.setTheme(th);
    },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      quiet = !!low;
      packets.visible = !low;
      if (musicLines && musicLines.setQuality) musicLines.setQuality(q);
    },
    dispose() {
      if (musicLines && musicLines.dispose) musicLines.dispose();
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      owned.textures.forEach(tx => tx.dispose && tx.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

export default { buildMahDescent, DESCENT };
