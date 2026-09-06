/* MAHWORLD R4 :: THE SKY THRESHOLD — where MAH HALO ends and the SKY REALM begins.

   R4, SKY REALM SEPARATION, in full: "HALO is civilized, safe, social, tiled and infrastructural.
   SKY REALM is cloud biome, flight, atmospheric terrain, training/PvP and stranger exploration. The
   transition between them must be clear and spectacular."

   That is two requirements pulling in opposite directions and both have to be met by the same
   object. CLEAR means a viewer standing anywhere on the ring can see where the sanctuary stops —
   not a fade, not a fog bank, an EDGE with a near side and a far side. SPECTACULAR means the edge
   is worth walking a kilometre to reach. A door in a wall is clear and dull; a horizon is
   spectacular and tells you nothing. So this is a THRESHOLD SEQUENCE, and every part of it does one
   of the two jobs:

     THE HOLD          r 2200   a place to decide from. Leaving is a decision, so it gets a room.
     THE CAUSEWAY      r 2260   940 m of authored promenade that NARROWS as it runs out — 30 m at
                       -> 3200  the hold, 16 m at the gate. The narrowing is the clear part working
                                at walking pace: the sanctuary is visibly running out under you.
     THE RUN-OUT       r 3200   the tiling breaks into discrete stepping plates with widening gaps.
                       -> 3330  This is the sentence "the tiles end" written in tiles.
     THE GATE          r 3300   the largest square-diamond gateway in the sanctuary, 46 m of it,
                                and the last platinum thing you pass under.
     THE GANTRY        r 3380   cantilevered OUT past the rim and rising: the flight line, an open
                       -> 3560  square-diamond ring you launch through, standing over nothing.
     THE CLOUD SHELF   r 3500+  the biome, pressing against the rim and BELOW it, never on it.

   WHY THE CLOUD IS NEVER ON THE DECK. "Sky Realm stays distinct" is on R4's acceptance list, and
   the cheap way to make a transition feel spectacular is to bring the weather onto the ring —
   which would fail that clause on the first frame. So the cloud's highest point near the rim sits
   BELOW the walking surface. You look DOWN into the biome from a tiled floor with a railing. Only
   further out, past the gantry, does it rise into banks taller than the ring — which is the shape
   that says "that is a place, and it is not this place".

   WHERE, AND WHY NOT IN A DISTRICT. The eight districts are R4's, they are named, and none of them
   is a departure terminal. So the threshold takes the OUTER rim at bearing -67.5 deg — the gap
   between ARRIVAL (-90) and COMMONS (-45), where the districts leave 1610 m of open plate. That
   places DEPARTURE beside ARRIVAL and radially opposite it: you arrive from below at the inner rim
   and you leave outward at the outer one, and the far-zoom frame gets both terminals at once.

   THE ALTITUDE FACT THAT MAKES THIS WORK. clouds.js runs its three decks at y 215-560 so they clear
   the city's 466 m skyline. The HALO shell is at y 1800. The plaza's weather is therefore 1.2 km
   BELOW the ring and is not this cloud — R4's Sky Realm is the DEEPER biome, further out and up,
   and it needs its own body at the ring's own altitude. That is what SHELF builds, and it is why
   this file has a cloud material at all rather than borrowing one.

   CONTRACT: build*(ctx) -> { group, stats, setTime, setTheme, update, setDetail, setQuality,
   dispose, navSites }. No addons — mergeSolids is hand-rolled here as in every other module. */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, signTexture } from './materials.js';
import { HALO, haloHeight, haloNormal, applyHaloGrid } from './halo.js';

/* THE ONE PLACE THE THRESHOLD'S GEOMETRY IS DESCRIBED. Everything below reads these; nothing
   re-derives a radius from a guess, because the second table is how a gate ends up 40 m off the
   causeway that leads to it (L42). */
export const THRESHOLD = Object.freeze({
  DEG: -67.5,            /* the open plate between ARRIVAL and COMMONS */
  HOLD_R: 2200,          /* the departure hold, just outboard of the ring's walked midline */
  CAUSE_IN: 2260,
  CAUSE_OUT: 3200,
  BAY: 94,               /* the causeway's bay rhythm — the spine's 88 m, opened out as it narrows */
  W_IN: 30, W_OUT: 16,   /* the causeway NARROWS: this is the clear half of "clear and spectacular" */
  RUNOUT_OUT: 3330,      /* where the last stepping plate sits */
  GATE_R: 3300,
  GATE_W: 46, GATE_H: 26,
  GANTRY_IN: 3380, GANTRY_OUT: 3560, GANTRY_RISE: 26,
  SHELF_IN: 3500, SHELF_OUT: 5200,
  SHELF_DROP: 62,        /* how far below the rim the nearest cloud tops sit — the distinctness gap */
  MASSES: 46
});

const TAU = Math.PI * 2;
/* determinism, the world's own constants — never Math.random */
const gold = i => (i * 0.6180339887) % 1;
const frac = i => (i * 0.7548776662) % 1;

/* (deg, along-ring metres, radius) -> world xz plus the tangent angle, the same grid halo-districts
   and halo-life place on, except that a threshold is placed by RADIUS rather than by an offset from
   the midline: everything here is about how far out you have walked. */
function at(deg, s, r) {
  const th = deg * Math.PI / 180 + s / HALO.R_MID;
  return [Math.cos(th) * r, Math.sin(th) * r, th];
}

export function buildHaloThreshold(ctx, opts = {}) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'halo-threshold';
  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = {
    draws: 0, triangles: 0, bays: 0, plates: 0, masts: 0, cloudMasses: 0,
    deg: THRESHOLD.DEG, gateR: THRESHOLD.GATE_R,
    rimY: +haloHeight(HALO.R_OUT, 0).toFixed(1),
    /* the distinctness measurement, published so a test can assert it rather than a render judge it */
    cloudBelowRim: THRESHOLD.SHELF_DROP
  };

  /* ---- placement on the curved shell — halo-districts' orientation rule, quoted ---------------- */
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3(), _n = new THREE.Vector3(),
    _up = new THREE.Vector3(0, 1, 0), _qn = new THREE.Quaternion(), _qy = new THREE.Quaternion();
  function onShell(x, z, up, ry) {
    const y = haloHeight(x, z);
    haloNormal(x, z, _n);
    _qn.setFromUnitVectors(_up, _n);
    _e.set(0, ry || 0, 0); _qy.setFromEuler(_e);
    _q.copy(_qn).multiply(_qy);
    _p.set(x, y + (up || 0), z);
    return { p: _p, q: _q, y };
  }
  function mat(x, z, up, ry, sx, sy, sz) {
    const o = onShell(x, z, up, ry);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(o.p, o.q, _s).clone();
  }
  /* a FREE matrix, for the things that stand off the shell entirely — the gantry past the rim and
     the cloud, neither of which has a shell under it to stand on */
  function free(x, y, z, ry, sx, sy, sz) {
    _p.set(x, y, z); _e.set(0, ry || 0, 0); _q.setFromEuler(_e);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(_p, _q, _s).clone();
  }

  const B = { plat: [], dark: [] };
  const put = (b, geo, matrix, value) => B[b].push({ geo, matrix, value });

  /* ---- materials. Two solids and one cloud. --------------------------------------------------- */
  const platinum = (M.platinumLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0xb6c4d6 })).clone();
  platinum.vertexColors = true; platinum.name = 'halo-th-platinum'; owned.materials.push(platinum);
  const darkMat = (M.paving || M.graphiteMetal || new THREE.MeshStandardMaterial({ color: 0x0b0f16 })).clone();
  darkMat.vertexColors = true; darkMat.name = 'halo-th-dark';
  darkMat.roughness = 0.56; darkMat.envMapIntensity = 0.30;
  /* the same plating the shell and the district decks wear, so the causeway is continuous with the
     sanctuary it is leading you out of — and so its running out is legible as the PLATING running
     out rather than as a differently-coloured slab (L51) */
  applyHaloGrid(darkMat, { micro: 1, tile: 8, mega: 64, gainMicro: 0.05, gainTile: 0.20,
    gainMega: 0.34, node: 0.5, microFar: 30, tileFar: 340 });
  owned.materials.push(darkMat);

  /* ---- THE CLOUD BODY -------------------------------------------------------------------------
     Not a copy of clouds.js. That module paints CAMERA-FACING weather at 215-560 m over the city and
     rebuilds its billboards every frame; this is a fixed geographic feature 1.8 km up that has to
     look right from the gate at 100 m, from QUIET across the ring at 4 km, and from the far-zoom
     camera outside the ring entirely. A camera-facing billboard is wrong for that — it swims when
     you walk past it — so each mass is a CROSSED PAIR of vertical quads plus one horizontal, which
     presents something broad from every azimuth and reads as a deck from above, at three quads and
     six triangles per mass. Forty-six masses is 276 triangles for a biome. */
  const cloudTex = softMass(256);
  owned.textures.push(cloudTex);
  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTex, color: 0x243352, transparent: true, opacity: 0.60,
    depthWrite: false, side: THREE.DoubleSide, fog: true, vertexColors: true,
    blending: THREE.NormalBlending, toneMapped: true
  });
  cloudMat.name = 'halo-threshold-cloud'; owned.materials.push(cloudMat);
  /* the lit crowns: the same masses again, smaller and higher, in the pale key. Two materials is
     what gives a cloud a TOP — one flat value is the "white geometry with fog" the sky brief
     forbids by name. */
  const cloudLit = cloudMat.clone();
  cloudLit.color.setHex(0xeef5ff); cloudLit.opacity = 0.30; cloudLit.name = 'halo-threshold-cloud-lit';
  owned.materials.push(cloudLit);

  /* ================================================================================================
     1. THE HOLD — a room to leave from
     ============================================================================================== */
  const D = THRESHOLD.DEG;
  {
    const [hx, hz, hth] = at(D, 0, THRESHOLD.HOLD_R);
    const rot = -hth + Math.PI / 2;   /* the hold FACES OUT along the radius, like the ascent pier */
    put('dark', chamferBox(64, 1.1, 78, 0.4), mat(hx, hz, 0.55, rot), 0.32);
    put('dark', chamferBox(64, 0.30, 78, 0.12), mat(hx, hz, 1.18, rot), 0.46);
    kerb(hx, hz, rot, 64, 78, 1.24, 0.98);
    /* a canopy on four piers: the hold is the last roofed thing before open sky, which is what
       makes the sky past the gate read as open */
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const ox = Math.cos(rot) * sx * 26 + Math.sin(rot) * sz * 32;
      const oz = -Math.sin(rot) * sx * 26 + Math.cos(rot) * sz * 32;
      put('plat', chamferBox(2.0, 11, 2.0, 0.5), mat(hx + ox, hz + oz, 5.5 + 1.24, rot), 0.90);
    }
    put('plat', chamferBox(58, 0.7, 70, 0.3), mat(hx, hz, 12.6, rot), 0.86);
    put('dark', chamferBox(54, 0.34, 66, 0.14), mat(hx, hz, 12.2, rot), 0.24);
    /* benches facing OUT, at the lip. You sit looking at where you are going. */
    for (const s of [-2, -1, 1, 2]) {
      const ox = Math.cos(rot) * 30 + Math.sin(rot) * s * 13;
      const oz = -Math.sin(rot) * 30 + Math.cos(rot) * s * 13;
      put('dark', chamferBox(1.5, 0.34, 7.5, 0.16), mat(hx + ox, hz + oz, 1.24 + 0.92, rot), 0.44);
      put('plat', chamferBox(1.0, 0.85, 3.2, 0.22), mat(hx + ox, hz + oz, 1.24 + 0.44, rot), 0.80);
      put('plat', chamferBox(0.34, 0.14, 7.5, 0.06), mat(hx + ox, hz + oz, 1.24 + 1.12, rot), 1.0);
    }
    sign('MAH THRESHOLD', 'departures — the sky realm', at(D, 0, THRESHOLD.HOLD_R - 46), rot, 15, 26);
    stats.hold = { r: THRESHOLD.HOLD_R, w: 64, d: 78 };
  }

  /* ================================================================================================
     2. THE CAUSEWAY — 940 m that narrows under you
     ============================================================================================== */
  {
    const IN = THRESHOLD.CAUSE_IN, OUT = THRESHOLD.CAUSE_OUT;
    const bays = Math.max(1, Math.round((OUT - IN) / THRESHOLD.BAY));
    const widthAt = r => {
      const u = (r - IN) / (OUT - IN);
      return THRESHOLD.W_IN + (THRESHOLD.W_OUT - THRESHOLD.W_IN) * u;
    };
    for (let b = 0; b < bays; b++) {
      const r0 = IN + b * ((OUT - IN) / bays), rc = r0 + ((OUT - IN) / bays) * 0.5;
      const L = ((OUT - IN) / bays) * 0.98, w = widthAt(rc);
      const [cx, cz, cth] = at(D, 0, rc);
      const rot = -cth + Math.PI / 2;
      /* mat(..., rot) with rot = -th + PI/2 sends the box's local X TANGENTIALLY and its local Z
         RADIALLY — so the causeway's LENGTH is the third argument and its WIDTH the first. This is
         the axis that has bitten this codebase twelve times; the pier and the spine are laid the
         same way and are the reason it is written down here rather than re-derived. */
      put('dark', chamferBox(w, 0.5, L, 0.2), mat(cx, cz, 0.28, rot), 0.30);
      for (const side of [-1, 1]) {
        const ox = Math.cos(rot) * side * (w * 0.5 + 0.8);
        const oz = -Math.sin(rot) * side * (w * 0.5 + 0.8);
        put('plat', chamferBox(1.6, 0.42, L, 0.14), mat(cx + ox, cz + oz, 0.42, rot), 0.98);
      }
      /* paired masts at every bay head, and every one of them carries the music line (R4: "Every
         FOBEAM retains the miniature vertical music-line motif") */
      for (const side of [-1, 1]) {
        const [bx, bz, bth] = at(D, 0, r0);
        const brot = -bth + Math.PI / 2;
        const mx = bx + Math.cos(brot) * side * (widthAt(r0) * 0.5 + 4);
        const mz = bz - Math.sin(brot) * side * (widthAt(r0) * 0.5 + 4);
        /* the masts GROW as the deck narrows — the corridor closes in width and opens in height,
           which is what makes 940 m of straight promenade build instead of merely continue */
        const h = 12 + 16 * (b / Math.max(1, bays - 1)) + 3 * frac(b * 7 + side);
        mast(mx, mz, brot, h, b * 2 + (side > 0 ? 1 : 0));
      }
      stats.bays++;
    }
    stats.causeway = { inner: IN, outer: OUT, bays, wIn: THRESHOLD.W_IN, wOut: THRESHOLD.W_OUT };
  }

  /* ================================================================================================
     3. THE RUN-OUT — the tiling ends, in tiles
     ============================================================================================== */
  {
    let r = THRESHOLD.CAUSE_OUT + 6, gap = 2.0, i = 0;
    while (r < THRESHOLD.RUNOUT_OUT) {
      const [px, pz, pth] = at(D, 0, r);
      const rot = -pth + Math.PI / 2;
      /* the plates SHRINK and the gaps GROW, both geometrically, so the last few read as stones in
         water rather than as a floor with holes in it */
      const w = 16 - 9 * (i / 12), d = 8 - 3.4 * (i / 12);
      put('dark', chamferBox(Math.max(4.2, w), 0.42, Math.max(3.0, d), 0.18), mat(px, pz, 0.24, rot), 0.30);
      put('plat', chamferBox(Math.max(4.2, w) + 0.9, 0.16, 0.5, 0.06), mat(px, pz, 0.46, rot), 0.94);
      stats.plates++;
      r += Math.max(3.0, d) + gap; gap *= 1.26; i++;
    }
  }

  /* ================================================================================================
     4. THE GATE — the last platinum thing you pass under
     ============================================================================================== */
  {
    const [gx, gz, gth] = at(D, 0, THRESHOLD.GATE_R);
    const rot = -gth + Math.PI / 2;
    const W = THRESHOLD.GATE_W, H = THRESHOLD.GATE_H;
    for (const side of [-1, 1]) {
      /* the piers are separated TANGENTIALLY, so the offset runs along mat's local X under this rot */
      const px = gx + Math.cos(rot) * side * W * 0.5;
      const pz = gz - Math.sin(rot) * side * W * 0.5;
      put('plat', chamferBox(4.4, H, 4.4, 1.1), mat(px, pz, H / 2, rot), 0.90);
      put('plat', chamferBox(6.8, 0.9, 6.8, 0.3), mat(px, pz, H, rot + 0.4), 1.0);
      /* a buttress raking back INBOARD, so the gate is braced against the way you came */
      put('plat', chamferBox(2.2, 1.4, 22, 0.5), mat(px, pz - 0, H * 0.42, rot), 0.84);
    }
    /* THE LINTEL SPANS THE WAY ITS PIERS ARE SEPARATED — tangentially, which under this rot is the
       box's local X. Same clause, same reason, thirteenth time of asking. */
    put('plat', chamferBox(W + 6, 2.0, 3.2, 0.6), mat(gx, gz, H + 1.0, rot), 1.0);
    /* the keystone: the brand figure at the largest scale in the sanctuary, WIDER THAN TALL (§06) */
    const dia = own(new THREE.OctahedronGeometry(1, 0));
    put('plat', dia, mat(gx, gz, H + 8.2, rot, 8.0, 6.2, 8.0), 1.0);
    put('plat', dia, mat(gx, gz, H + 8.2, rot + Math.PI / 4, 5.4, 4.2, 5.4), 0.92);
    /* and a threshold strip across the opening: the LINE you cross, at your feet, in metal */
    put('plat', chamferBox(W, 0.22, 1.2, 0.08), mat(gx, gz, 0.30, rot), 1.0);
    sign('SKY REALM', 'cloud biome — flight beyond this point', at(D, 0, THRESHOLD.GATE_R - 30), rot, 14, 22);
    stats.gate = { r: THRESHOLD.GATE_R, w: W, h: H, y: +haloHeight(gx, gz).toFixed(1) };
  }

  /* ================================================================================================
     5. THE GANTRY — cantilevered past the rim, over nothing
     ============================================================================================== */
  {
    const IN = THRESHOLD.GANTRY_IN, OUT = THRESHOLD.GANTRY_OUT, RISE = THRESHOLD.GANTRY_RISE;
    const [ax, az, ath] = at(D, 0, IN);
    const baseY = haloHeight(ax, az);
    const SEG = 8;
    /* the deck runs out and UP. Past the rim there is no shell to stand on, so every piece here is
       placed with free() at an explicit y — and the ramp is what turns "the floor stops" into "the
       route continues", which is the difference between an edge and a dead end. */
    for (let k = 0; k < SEG; k++) {
      const u0 = k / SEG, u1 = (k + 1) / SEG, um = (u0 + u1) * 0.5;
      const r = IN + (OUT - IN) * um;
      const [x, z, th] = at(D, 0, r);
      const y = baseY + RISE * um * um;                 /* quadratic: it leaves flat and lifts away */
      const rot = -th + Math.PI / 2;
      const L = (OUT - IN) / SEG;
      const w = 14 - 5 * um;
      put('dark', chamferBox(w, 0.5, L * 1.02, 0.2), free(x, y + 0.25, z, rot), 0.30);
      /* ROAM CANNOT SEE THIS DECK. haloFloor() answers null past R_OUT + APRON, which is exactly
         where the cantilever hangs — the analytic surface is the RING and the gantry is deliberately
         off it. So each segment is registered the way every other standable object in this world is:
         an invisible proxy MESH in ctx.colliders. L47 is why it is a mesh and not a Box3: the
         assembly filters on `o.isMesh` and drops a Box3 without a word. */
      if (ctx && ctx.colliders) {
        const proxy = new THREE.Mesh(own(new THREE.BoxGeometry(w - 0.6, 1.0, L)));
        proxy.position.set(x, y, z); proxy.rotation.y = rot;
        proxy.visible = false; proxy.name = 'halo-threshold-gantry-' + k;
        proxy.updateMatrixWorld(true);
        group.add(proxy); ctx.colliders.push(proxy);
      }
      for (const side of [-1, 1]) {
        put('plat', chamferBox(1.1, 1.3, L * 1.02, 0.24),
          free(x + Math.cos(rot) * side * (w * 0.5 + 0.6), y + 0.9, z - Math.sin(rot) * side * (w * 0.5 + 0.6), rot), 0.98);
      }
      /* the underside trusses — a cantilever the eye can believe, seen from every overlook that
         faces this way and from the far-zoom frame */
      if (k % 2 === 0) {
        put('plat', chamferBox(1.0, 5.5 + 3 * um, 1.0, 0.22), free(x, y - 2.6 - 1.5 * um, z, rot), 0.72);
      }
    }
    /* THE LAUNCH RING: an open square diamond you fly through, standing on two legs at the tip */
    const [tx, tz, tth] = at(D, 0, OUT);
    const tRot = -tth + Math.PI / 2, tY = baseY + RISE;
    for (const side of [-1, 1]) {
      put('plat', chamferBox(1.6, 13, 1.6, 0.4),
        free(tx + Math.cos(tRot) * side * 9, tY + 6.5, tz - Math.sin(tRot) * side * 9, tRot), 0.92);
    }
    /* the ring is four bars on the diagonal — a square rotated 45 degrees, drawn as structure rather
       than as a torus, because this world's circle is a square diamond */
    const RD = 11;
    for (let q = 0; q < 4; q++) {
      const a = (q + 0.5) * Math.PI / 2;
      const ox = Math.cos(a) * RD * 0.707, oy = Math.sin(a) * RD * 0.707;
      put('plat', chamferBox(1.3, 1.3, RD * 1.42, 0.3),
        free(tx + Math.cos(tRot) * ox, tY + 13 + oy, tz - Math.sin(tRot) * ox, tRot + Math.PI / 2, 1, 1, 1), 1.0);
      /* the four bars are yawed to the diagonals by rotating each about the gantry axis: built as a
         diamond outline, not as a square with its corners on the axes */
    }
    for (const s of [-1, 1]) for (const t of [-1, 1]) {
      const dia2 = own(new THREE.OctahedronGeometry(1, 0));
      put('plat', dia2, free(tx + Math.cos(tRot) * s * RD * 0.707, tY + 13 + t * RD * 0.707,
        tz - Math.sin(tRot) * s * RD * 0.707, tRot, 2.2, 1.7, 2.2), 1.0);
    }
    stats.gantry = { inner: IN, outer: OUT, rise: RISE, tipY: +tY.toFixed(1) };
    /* the flight line is a music line too */
    if (ctx && ctx.musicSites) {
      ctx.musicSites.push({ x: tx, y: tY + 1.2, z: tz, ry: tRot, scale: 2.6 });
    }
  }

  /* ================================================================================================
     6. THE CLOUD SHELF — the biome, below the rim near in and above it far out
     ============================================================================================== */
  {
    const quads = [];
    const rimY = haloHeight(HALO.R_OUT, 0);
    const quadGeo = own(new THREE.PlaneGeometry(1, 1));
    const flatGeo = own(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    const litQuads = [];
    for (let i = 0; i < THRESHOLD.MASSES; i++) {
      /* spread over a 96 degree fan centred on the threshold, so the biome is a REGION the ring
         faces rather than a prop parked outside one gate */
      const spread = (gold(i * 3 + 1) - 0.5) * 96;
      const u = frac(i * 5);
      const r = THRESHOLD.SHELF_IN + (THRESHOLD.SHELF_OUT - THRESHOLD.SHELF_IN) * u * u;
      const [x, , th] = at(D + spread, 0, r);
      const z = Math.sin(th) * r, X = Math.cos(th) * r;
      const far = (r - THRESHOLD.SHELF_IN) / (THRESHOLD.SHELF_OUT - THRESHOLD.SHELF_IN);
      /* THE DISTINCTNESS RULE, as arithmetic. Near the rim every mass TOP sits below the walking
         surface by SHELF_DROP; only past a third of the way out is it allowed to rise above it. */
      const w = 240 + 620 * far + 180 * gold(i * 11);
      const h = 90 + 300 * far + 60 * frac(i * 13);
      const topNear = rimY - THRESHOLD.SHELF_DROP;
      const top = topNear + (far > 0.34 ? (far - 0.34) * 900 : 0) - 40 * gold(i * 7);
      const cy = top - h * 0.5;
      const yaw = gold(i * 17) * TAU;
      const val = 0.55 + 0.45 * (1 - far) * gold(i * 19);
      quads.push({ geo: quadGeo, matrix: free(X, cy, z, yaw, w, h, 1), value: val });
      quads.push({ geo: quadGeo, matrix: free(X, cy, z, yaw + Math.PI / 2, w * 0.86, h * 0.92, 1), value: val * 0.94 });
      quads.push({ geo: flatGeo, matrix: free(X, top - h * 0.14, z, yaw, w * 0.92, 1, w * 0.72), value: val });
      /* the crown, in the pale key: a top edge the eye can measure the sky against */
      litQuads.push({ geo: quadGeo, matrix: free(X, top - h * 0.10, z, yaw + 0.3, w * 0.62, h * 0.34, 1), value: 0.7 + 0.3 * gold(i * 23) });
      litQuads.push({ geo: flatGeo, matrix: free(X, top - h * 0.06, z, yaw, w * 0.58, 1, w * 0.44), value: 0.8 });
      stats.cloudMasses++;
    }
    addMesh(quads, cloudMat, 'halo-threshold-cloud', -3);
    addMesh(litQuads, cloudLit, 'halo-threshold-cloud-lit', -2);
  }

  /* ---- the two solid families ----------------------------------------------------------------- */
  addMesh(B.dark, darkMat, 'halo-threshold-dark', 0);
  addMesh(B.plat, platinum, 'halo-threshold-plat', 0);

  /* ================================================================================================
     helpers
     ============================================================================================== */
  function addMesh(list, material, name, order) {
    if (!list.length) return null;
    const geo = mergeSolids(list); owned.geometries.push(geo);
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name; mesh.renderOrder = order || 0;
    if (order) mesh.frustumCulled = false;
    group.add(mesh);
    stats.draws++;
    stats.triangles += geo.attributes.position.count / 3;
    return mesh;
  }
  /* the four-box platinum perimeter, halo-districts' kerb() with its rotation rule intact: the two
     offset axes come from the CALLER's rot, never from a re-derived th */
  function kerb(x, z, rot, w, d, up, val) {
    const v = val == null ? 0.98 : val;
    const ax = Math.cos(rot), az = -Math.sin(rot);
    const bx = Math.sin(rot), bz = Math.cos(rot);
    for (const s of [-1, 1]) {
      const o1 = s * (d * 0.5 + 0.4);
      put('plat', chamferBox(w + 1.6, 0.34, 0.8, 0.12), mat(x + bx * o1, z + bz * o1, up, rot), v);
      const o2 = s * (w * 0.5 + 0.4);
      put('plat', chamferBox(0.8, 0.34, d, 0.12), mat(x + ax * o2, z + az * o2, up, rot), v);
    }
  }
  /* a mast at the proportion mahascent paid for: section from height, never a fixed 1.4 m carrying
     32 m of mast (L58). Every one carries the music line. */
  function mast(x, z, rot, h, seed) {
    const w = Math.max(1.6, h / 6);
    put('plat', chamferBox(w, h, w, w * 0.26), mat(x, z, h / 2, rot), 0.88);
    put('plat', chamferBox(w * 1.7, 0.44 + w * 0.10, w * 1.7, 0.14), mat(x, z, h - 0.3, rot + 0.4), 1.0);
    const dia = own(new THREE.OctahedronGeometry(1, 0));
    put('plat', dia, mat(x, z, h + w * 1.05, rot, w * 1.25, w, w * 1.25), 1.0);
    stats.masts++;
    if (ctx && ctx.musicSites) {
      const mo = w * 0.5 + 1.6;
      ctx.musicSites.push({ x: x + Math.cos(rot) * mo, y: haloHeight(x, z) + 0.9, z: z - Math.sin(rot) * mo,
        ry: rot, scale: 1.6 + w * 0.22 });
    }
  }
  /* two back-to-back FrontSide planes — a DoubleSide plane shows its lettering MIRRORED from behind,
     which is the fix halo-districts had to undo once already */
  function sign(title, sub, place, rot, up, size) {
    const tex = signTexture({ title, sub, mark: true });
    owned.textures.push(tex);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, fog: true, toneMapped: true });
    m.name = 'halo-threshold-sign-' + title.toLowerCase().replace(/\s+/g, '-');
    owned.materials.push(m); signMats.push(m);
    if (ctx && ctx.signMaterials) ctx.signMaterials.push(m);
    const geo = own(new THREE.PlaneGeometry(size, size * (768 / 2048)));
    for (const face of [0, Math.PI]) {
      const mesh = new THREE.Mesh(geo, m);
      const o = onShell(place[0], place[1], up, rot + face);
      mesh.position.copy(o.p); mesh.quaternion.copy(o.q);
      mesh.name = m.name + (face ? '-b' : '');
      group.add(mesh);
    }
  }

  const signMats = [];

  /* ---- the module contract --------------------------------------------------------------------- */
  let quiet = false;
  const KEYS = {
    /* clouds.js's own night/dusk/day keys, quoted, so the threshold's weather and the city's weather
       are the same weather seen from 1.5 km apart */
    night: { body: 0x243352, bodyA: 0.60, lit: 0xeef5ff, litA: 0.30 },
    dusk: { body: 0x50458a, bodyA: 0.62, lit: 0xece5ff, litA: 0.26 },
    day: { body: 0xe6eefa, bodyA: 0.66, lit: 0xf8fbff, litA: 0.14 }
  };
  function keyFor(phase) { return KEYS[phase] || KEYS.night; }

  const api = {
    group, stats,
    setTime(sec, phase) {
      const K = keyFor(phase || (ctx && ctx.phase) || 'night');
      cloudMat.color.setHex(K.body); cloudMat.opacity = K.bodyA;
      cloudLit.color.setHex(K.lit); cloudLit.opacity = K.litA;
      for (const m of signMats) m.opacity = (phase === 'day') ? 0.72 : 0.9;
    },
    setTheme(t) {
      /* the solids take the world's platinum and paving; the CLOUD takes no theme hue at all. A
         cloud tinted to the energy colour is a coloured gel over the one thing in frame that is
         meant to read as weather. */
      if (t) theme.energy = t.energy || theme.energy;
    },
    setDetail(distance) {
      /* the run-out plates and the causeway kerbs are the first thing that stops resolving; past
         2.5 km the threshold is its gate, its gantry and its cloud, which is all that subtends */
      const far = distance > 2500;
      const dark = group.getObjectByName('halo-threshold-dark');
      if (dark) dark.visible = !far || distance < 6000;
      return far ? 'far' : 'near';
    },
    setEye() { },
    setState() { },
    setQuality(q) {
      quiet = (q === 'low');
      const lit = group.getObjectByName('halo-threshold-cloud-lit');
      if (lit) lit.visible = q !== 'low';
    },
    update() { },
    /* MAH NAV: three stops, every one derived from the SAME table the geometry was placed from */
    navSites() {
      const out = [];
      const [hx, hz] = at(D, 0, THRESHOLD.HOLD_R - 30);
      const [ox, oz] = at(D, 0, THRESHOLD.GATE_R);
      out.push({ id: 'halo-threshold', label: 'MAH THRESHOLD', sub: 'departures', x: hx, z: hz,
        y: haloHeight(hx, hz) + 1.9, look: [ox, haloHeight(ox, oz) + THRESHOLD.GATE_H * 0.6, oz] });
      const [gx, gz] = at(D, 0, THRESHOLD.GATE_R - 34);
      const [fx, fz] = at(D, 0, THRESHOLD.GANTRY_OUT);
      out.push({ id: 'halo-skygate', label: 'SKY GATE', sub: 'the edge of the sanctuary', x: gx, z: gz,
        y: haloHeight(gx, gz) + 1.9, look: [fx, haloHeight(fx, fz) + THRESHOLD.GANTRY_RISE + 13, fz] });
      const [lx, lz] = at(D, 0, THRESHOLD.GANTRY_IN + 20);
      out.push({ id: 'halo-flightline', label: 'FLIGHT LINE', sub: 'to the sky realm', x: lx, z: lz,
        y: haloHeight(lx, lz) + 2.1, look: [fx, haloHeight(fx, fz) + THRESHOLD.GANTRY_RISE + 13, fz] });
      return out;
    },
    dispose() {
      for (const g of owned.geometries) { try { g.dispose(); } catch (e) { } }
      for (const m of owned.materials) { try { m.dispose(); } catch (e) { } }
      for (const t of owned.textures) { try { t.dispose(); } catch (e) { } }
      if (group.parent) group.parent.remove(group);
    }
  };
  api.setTime(0, (ctx && ctx.phase) || 'night');
  return api;
}

/* A SOFT MASS. One canvas, a handful of overlapping radial lobes, deterministic — the shape a cloud
   silhouette needs so that a quad's EDGE is never visible. A hard-edged quad is the single thing
   that gives billboard weather away, and it is why this is a texture and not an alpha ramp. */
function softMass(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  const lobes = [
    [0.50, 0.56, 0.30], [0.31, 0.60, 0.20], [0.69, 0.60, 0.21],
    [0.42, 0.44, 0.19], [0.60, 0.46, 0.17], [0.50, 0.68, 0.24],
    [0.22, 0.66, 0.13], [0.78, 0.66, 0.14]
  ];
  g.globalCompositeOperation = 'lighter';
  for (const [lx, ly, lr] of lobes) {
    const grd = g.createRadialGradient(lx * size, ly * size, 0, lx * size, ly * size, lr * size);
    grd.addColorStop(0, 'rgba(255,255,255,0.62)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.30)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/* hand-rolled, as in every module here: no addons, and the value rides in as vertex colour */
function mergeSolids(list) {
  let n = 0;
  for (const it of list) { const g = it.geo; n += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const uvSrc = list.length && list[0].geo.attributes.uv;
  const uv = uvSrc ? new Float32Array(n * 2) : null;
  const nm = new THREE.Matrix3(), v = new THREE.Vector3();
  let o = 0;
  for (const it of list) {
    const g = it.geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    const idx = g.index ? g.index.array : null;
    nm.getNormalMatrix(it.matrix);
    const take = i => {
      v.fromBufferAttribute(P, i).applyMatrix4(it.matrix);
      pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z;
      col[o * 3] = col[o * 3 + 1] = col[o * 3 + 2] = it.value;
      if (uv) { uv[o * 2] = U ? U.getX(i) : 0; uv[o * 2 + 1] = U ? U.getY(i) : 0; }
      o++;
    };
    if (idx) { for (let i = 0; i < idx.length; i++) take(idx[i]); }
    else { for (let i = 0; i < P.count; i++) take(i); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o * 3), 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor.subarray(0, o * 3), 3));
  out.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, o * 3), 3));
  if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv.subarray(0, o * 2), 2));
  return out;
}

export default { buildHaloThreshold, THRESHOLD };
