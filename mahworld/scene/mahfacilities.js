/* MAHWORLD :: MAH VITAL · MAH FORGE · MAH MODE — the three facilities, and the reason they are one file
   ============================================================================================

   R3-08 asks for three buildings and R3-11 says where they go: around MAH MATCH, with silhouette
   separation and circulation, not jammed together. R3-03 then sets the hard part —

       "At gameplay camera distance, clearly distinguish MAH VITAL vs MAH FORGE vs MAH MODE.
        Use roughness, transmission, silhouette, scale, edge response, motion, local lighting and
        spacing BEFORE hue shifts."

   Three small premium buildings in one palette, standing within 80 m of each other, is precisely the
   case where a colour-coded solution is tempting and forbidden. They are in one file because the
   only way to guarantee they read apart is to author them against each other — the differences below
   are chosen as a SET, and splitting them across three files is how they would drift into looking
   the same.

   ---- HOW THEY SEPARATE, in the order R3-03 prefers -------------------------------------------

     SILHOUETTE   VITAL is a small upright JEWEL — narrow, tall for its footprint, a faceted crown.
                  FORGE is a broad low BLOCK — wide, heavy, horizontally banded, no crown.
                  MODE is a COLONNADE — a light canopy on a row of pods, mostly void.
     SCALE        16 m / 22 m / 20 m wide against 11 m / 15 m / 12 m tall. FORGE is the only one
                  wider than it is deep by a large margin; MODE is the only one you can see through.
     ROUGHNESS    VITAL polished (clinical). FORGE matte and worked. MODE mirror-bright.
     MOTION       VITAL breathes slowly (a pulse rate). FORGE strikes on a slow beat (a hammer, not
                  a pulse). MODE drifts (a turntable). Three different rhythms, none synchronised —
                  R3-12 forbids synchronised global motion, and this is where it would show first.
     EMISSION     VITAL a steady core. FORGE a sharp seam that flares on the strike. MODE cool edge
                  light on the display plates only.
     RECESS       VITAL has alcoves. FORGE has bays cut INTO the mass. MODE has no recesses at all
                  because it has no mass to recess into.

   Every one of those is available at 60 m in a dark frame. None of them is a hue.

   ---- WHAT IS DELIBERATELY NOT HERE ------------------------------------------------------------
   No economy. R3-08 says "use temporary durations and costs, but do not hard-lock final economy
   values yet", so MAH VITAL publishes its buff CATEGORIES as data and nothing else. No prices, no
   durations, no stat magnitudes — inventing those would be inventing product specification.

   buildMahFacilities(ctx) -> the standard module contract. */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, signTexture } from './materials.js';

const TAU = Math.PI * 2;

/* R3-11: around MAH MATCH (buildings.js SITES.match — x 0, z −74, W 44, D 30, approach from z −48).
   The approach corridor is left clear: nothing here stands between the plaza and the match doors. */
export const FACILITIES = Object.freeze({
  vital: { x: -38, z: -62, ry: Math.PI * 0.62, W: 16, D: 13, H: 11 },
  forge: { x: 40, z: -76, ry: -Math.PI * 0.44, W: 22, D: 18, H: 15 },
  mode: { x: -30, z: -98, ry: Math.PI * 0.18, W: 20, D: 14, H: 12 }
});

/* R3-08: data-driven categories, economy deliberately unlocked. */
export const VITAL_BUFFS = Object.freeze([
  'Strength', 'Defense', 'Speed', 'MAHGIC Capacity', 'MAHGIC Recovery',
  'Stamina', 'Regeneration', 'Flight Stability', 'Combat Focus'
]);

const gold = i => (i * 2.3999632) % TAU;
const frac = i => (i * 0.6180339887) % 1;
const frac2 = i => (i * 0.7548776662) % 1;

export function buildMahFacilities(ctx) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'mah-facilities';
  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { built: [], buffs: VITAL_BUFFS.slice(), draws: 0, triangles: 0, separation: {} };

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3();
  const at = (x, y, z, ry, sx, sy, sz) => {
    _p.set(x, y, z); _e.set(0, ry || 0, 0); _q.setFromEuler(_e);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(_p, _q, _s).clone();
  };

  /* ---- three material buckets, and the ROUGHNESS split is a separation channel, not a detail --- */
  function grade(base, rough, name) {
    const m = (base || new THREE.MeshStandardMaterial({ color: 0xb6c4d6 })).clone();
    m.vertexColors = true;
    if (rough != null) m.roughness = rough;
    m.name = name; owned.materials.push(m);
    return m;
  }
  const polished = grade(M.platinumLit || M.platinum, 0.14, 'vital-polished');   /* clinical */
  const worked = grade(M.platinumMidLit || M.platinum, 0.52, 'forge-worked');    /* matte, struck */
  const mirror = grade(M.platinumLit || M.platinum, 0.06, 'mode-mirror');        /* showroom */
  const darkM = grade(M.graphiteMetal || M.graphite, null, 'facility-dark');

  const B = { polished: [], worked: [], mirror: [], dark: [] };
  const put = (b, geo, matrix, value) => B[b].push({ geo, matrix, value });

  function merge(list) {
    let n = 0;
    for (const it of list) { const g = it.geo; n += g.index ? g.index.count : g.attributes.position.count; }
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

  /* three emissive materials, because R3-03 makes EMISSION BEHAVIOUR a separation channel and one
     shared material cannot behave three ways */
  const emit = (opacity, name) => {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(theme.energyLight), transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: true
    });
    m.name = name; owned.materials.push(m); return m;
  };
  const vitalCore = emit(0.52, 'vital-core');
  const forgeSeam = emit(0.34, 'forge-seam');
  const modeEdge = emit(0.30, 'mode-edge');

  const signs = [];
  function signage(title, sub, x, y, z, ry, w) {
    const tex = signTexture({ title, sub, mark: true });
    owned.textures.push(tex);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, fog: true, toneMapped: true });
    mat.name = 'sign-' + title.toLowerCase().replace(/\s+/g, '-'); owned.materials.push(mat);
    if (ctx && ctx.signMaterials) ctx.signMaterials.push(mat);
    const mesh = new THREE.Mesh(own(new THREE.PlaneGeometry(w, w * (768 / 2048))), mat);
    mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.name = mat.name;
    group.add(mesh); signs.push(mat);
  }

  function siteWorks(F, id) {
    /* every facility stands on its own apron, so it is placed rather than dropped, and the apron is
       §07's black floor — the world law does not stop at a building's edge */
    put('dark', chamferBox(F.W + 8, 0.5, F.D + 8, 0.6), at(F.x, 0.25, F.z, F.ry), 0.30);
    put('polished', chamferBox(F.W + 8.5, 0.22, F.D + 8.5, 0.1), at(F.x, 0.45, F.z, F.ry), 0.86);
    if (ctx && typeof ctx.lightPool === 'function') {
      try { ctx.lightPool({ x: F.x, z: F.z, rx: F.W * 0.9, rz: F.D * 0.9, k: 0.30, hue: theme.energy }); } catch (e) {}
    }
    if (ctx && ctx.colliders) {
      const proxy = new THREE.Mesh(own(new THREE.BoxGeometry(F.W, F.H, F.D)),
        new THREE.MeshBasicMaterial({ visible: false }));
      proxy.position.set(F.x, F.H / 2, F.z); proxy.rotation.y = F.ry; proxy.visible = false;
      proxy.name = id + '-collider'; owned.materials.push(proxy.material);
      group.add(proxy); ctx.colliders.push(proxy);
    }
  }

  /* ============================================================================================
     MAH VITAL — the JEWEL. Small, upright, polished, with a crown and a steady core.
     ============================================================================================ */
  const vitalPods = [];
  {
    const F = FACILITIES.vital, y0 = 0.5;
    siteWorks(F, 'vital');
    /* the body: a narrow faceted prism in three courses that STEP IN, so the silhouette tapers to a
       crown. FORGE deliberately does the opposite — this is the silhouette channel of R3-03. */
    let y = y0;
    [[1.00, 0.34, 0.62], [0.86, 0.40, 0.80], [0.66, 0.26, 1.00]].forEach(([w, hf, val], ci) => {
      const h = F.H * hf;
      put('polished', chamferBox(F.W * w, h, F.D * w, 0.55), at(F.x, y + h / 2, F.z, F.ry + ci * 0.10), val);
      put('polished', chamferBox(F.W * w * 1.05, 0.16, F.D * w * 1.05, 0.06), at(F.x, y + h, F.z, F.ry), 1.0);
      y += h;
    });
    /* THE SQUARE-DIAMOND MEDICAL CORE, carried in a slot cut through the upper body. It is the one
       thing that emits here, it is steady, and it is what "jewel-like medical precision" means. */
    const coreGeo = own(new THREE.OctahedronGeometry(1, 0));
    const core = new THREE.Mesh(coreGeo, vitalCore);
    core.position.set(F.x, y0 + F.H * 0.70, F.z);
    core.scale.set(1.9, 2.6, 1.9); core.name = 'vital-core'; core.renderOrder = 4;
    group.add(core);
    put('dark', chamferBox(F.W * 0.34, F.H * 0.30, F.D * 0.96, 0.12), at(F.x, y0 + F.H * 0.70, F.z, F.ry), 0.10);
    /* THE CROWN — a small faceted cap, and VITAL is the only one of the three that has one */
    const cr = own(new THREE.OctahedronGeometry(1, 0));
    put('polished', cr, at(F.x, y + 1.6, F.z, F.ry + 0.5, 2.6, 2.0, 2.6), 1.0);

    /* TREATMENT / RECHARGE STATIONS — three alcoves along the front, each a real recess with a pad.
       R3-08 asks for them visibly; a medical building whose function is invisible is a shed. */
    const fwd = [Math.sin(F.ry), Math.cos(F.ry)];
    for (let k = 0; k < 3; k++) {
      const off = (k - 1) * (F.W * 0.30);
      const px = F.x + fwd[0] * (F.D * 0.5 + 1.1) + Math.cos(F.ry) * off;
      const pz = F.z + fwd[1] * (F.D * 0.5 + 1.1) - Math.sin(F.ry) * off;
      put('dark', chamferBox(F.W * 0.24, 3.4, 1.8, 0.16), at(px, y0 + 2.0, pz, F.ry), 0.14);
      put('polished', chamferBox(F.W * 0.30, 0.36, 2.2, 0.1), at(px, y0 + 0.2, pz, F.ry), 0.92);
      vitalPods.push({ x: px, y: y0 + 1.1, z: pz, ry: F.ry, phase: gold(k * 7) });
    }
    signage('MAH VITAL', 'RECOVERY + BUFFS',
      F.x + fwd[0] * (F.D * 0.5 + 0.2), y0 + F.H * 0.52, F.z + fwd[1] * (F.D * 0.5 + 0.2), F.ry, F.W * 0.62);
    stats.built.push('vital');
    stats.separation.vital = { silhouette: 'upright jewel, stepping in to a crown', roughness: 0.14, motion: 'steady breath' };
  }

  /* ============================================================================================
     MAH FORGE — the BLOCK. Broad, low, matte, banded, with bays cut into the mass and a strike.
     ============================================================================================ */
  let forgeCore = null;
  {
    const F = FACILITIES.forge, y0 = 0.5;
    siteWorks(F, 'forge');
    /* the body: courses that step OUT, not in — the mass gets heavier as it rises, which is the
       exact inverse of VITAL and reads instantly even in silhouette */
    let y = y0;
    [[0.82, 0.30, 0.50], [0.94, 0.40, 0.68], [1.00, 0.30, 0.86]].forEach(([w, hf, val], ci) => {
      const h = F.H * hf;
      put('worked', chamferBox(F.W * w, h, F.D * w, 0.30), at(F.x, y + h / 2, F.z, F.ry), val);
      /* ARMOUR PLATES: overlapping courses on the two flanks, which is the "faceted armour-like
         shell" R3-08 asks for and is a texture channel VITAL and MODE do not have */
      for (const side of [-1, 1]) {
        for (let pl = 0; pl < 3; pl++) {
          const pw = F.D * w * (0.80 - 0.14 * pl);
          put('worked', chamferBox(0.5, h * 0.26, pw, 0.12),
            at(F.x + Math.cos(F.ry) * side * F.W * w * 0.50,
               y + h * (0.20 + 0.30 * pl),
               F.z - Math.sin(F.ry) * side * F.W * w * 0.50, F.ry), 0.34 + 0.22 * pl);
        }
      }
      y += h;
    });
    /* UPGRADE BAYS — two recesses cut INTO the front mass, each with a lit rail. A bay is a hole in
       a building; an alcove (VITAL) is a niche on one. R3-03's recess-depth channel. */
    const fwd = [Math.sin(F.ry), Math.cos(F.ry)];
    for (const side of [-1, 1]) {
      const bx = F.x + fwd[0] * (F.D * 0.5 - 0.6) + Math.cos(F.ry) * side * F.W * 0.26;
      const bz = F.z + fwd[1] * (F.D * 0.5 - 0.6) - Math.sin(F.ry) * side * F.W * 0.26;
      put('dark', chamferBox(F.W * 0.30, F.H * 0.44, 3.4, 0.14), at(bx, y0 + F.H * 0.30, bz, F.ry), 0.08);
      put('worked', chamferBox(F.W * 0.36, 0.34, 3.6, 0.1), at(bx, y0 + F.H * 0.52, bz, F.ry), 1.0);
      put('worked', chamferBox(F.W * 0.36, 0.34, 3.6, 0.1), at(bx, y0 + 0.2, bz, F.ry), 0.9);
    }
    /* THE FORGE CORE — a large square diamond, low in the mass, and the ONE thing here that flares.
       R3-12 forbids constant full-object pulsing; a strike is a discrete event on a slow beat. */
    const core = new THREE.Mesh(own(new THREE.OctahedronGeometry(1, 0)), forgeSeam);
    core.position.set(F.x, y0 + F.H * 0.34, F.z - fwd[1] * F.D * 0.12);
    core.scale.set(3.4, 2.6, 3.4); core.name = 'forge-core'; core.renderOrder = 4;
    group.add(core); forgeCore = core;
    /* ENERGY RAILS along the flanks, feeding it */
    for (const side of [-1, 1]) {
      put('worked', chamferBox(0.4, 0.4, F.D * 0.9, 0.12),
        at(F.x + Math.cos(F.ry) * side * F.W * 0.52, y0 + F.H * 0.34, F.z - Math.sin(F.ry) * side * F.W * 0.52, F.ry), 1.0);
    }
    signage('MAH FORGE', 'ARMOR + MAHGIC + ABILITIES',
      F.x + fwd[0] * (F.D * 0.5 + 0.2), y0 + F.H * 0.76, F.z + fwd[1] * (F.D * 0.5 + 0.2), F.ry, F.W * 0.58);
    stats.built.push('forge');
    stats.separation.forge = { silhouette: 'broad block, stepping out, no crown', roughness: 0.52, motion: 'slow strike' };
  }

  /* ============================================================================================
     MAH MODE — the COLONNADE. Mostly void: a light canopy on a row of fitting pods.
     ============================================================================================ */
  const modePods = [];
  {
    const F = FACILITIES.mode, y0 = 0.5;
    siteWorks(F, 'mode');
    /* NO BODY. That is the point — the third silhouette is the one you can see through, and it is
       the only separation that survives at any distance, in any light, from any angle. */
    const N = 5;
    for (let k = 0; k < N; k++) {
      const off = (k - (N - 1) / 2) * (F.W / N);
      const px = F.x + Math.cos(F.ry) * off, pz = F.z - Math.sin(F.ry) * off;
      const ph = F.H * (0.62 + 0.16 * frac(k * 7));
      /* a FITTING POD: a rounded prism, dark inside, with a mirror plate behind it */
      put('mirror', chamferBox(2.6, ph, 2.6, 0.75), at(px, y0 + ph / 2, pz, F.ry + k * 0.12), 0.86);
      put('dark', chamferBox(1.9, ph * 0.80, 1.9, 0.5), at(px, y0 + ph * 0.46, pz, F.ry + k * 0.12), 0.12);
      /* the HOLOGRAPHIC MIRROR — a tall thin plate, the layered reflective display surface */
      put('mirror', chamferBox(3.2, ph * 1.10, 0.3, 0.1),
        at(px - Math.sin(F.ry) * 2.6, y0 + ph * 0.58, pz - Math.cos(F.ry) * 2.6, F.ry), 1.0);
      modePods.push({ x: px, y: y0 + ph + 1.0, z: pz, ry: F.ry, phase: gold(k * 11), h: ph });
      /* CANONICAL MAHBEING MANNEQUINS ONLY. residents.js is the species authority and it stays that
         way — this asks for a figure at a spot, it does not model one, and it never sets a colour
         another resident already owns. */
      if (ctx && ctx.residentSpots) {
        /* THE SHAPE IS FLAT AND THE FACING FIELD IS CALLED `facing`. buildings.js's spot() helper
           returns { x, y, z, facing, ...extra } and mahplaza spreads it straight onto the resident
           spec — a nested { spec: {...} } with `ry` would have been accepted, ignored, and produced
           five invisible mannequins with nothing to say it had failed. */
        ctx.residentSpots.push({
          x: px, y: y0 + 0.2, z: pz + 0.1, facing: F.ry + Math.PI,
          id: 'mode-mannequin-' + k, colour: 'platinum', physique: 0.35 + 0.3 * frac2(k * 5),
          sex: k % 2 ? 'f' : 'm', pose: 'stand', seed: 300 + k, lod: 'near',
          note: 'MAH MODE display mannequin'
        });
      }
    }
    /* THE CANOPY — a thin light plate over the row, so the colonnade is a building and not a fence */
    put('mirror', chamferBox(F.W + 3.0, 0.5, F.D * 0.7, 0.2), at(F.x, y0 + F.H, F.z, F.ry), 0.94);
    put('polished', chamferBox(F.W + 3.4, 0.16, F.D * 0.7 + 0.4, 0.06), at(F.x, y0 + F.H + 0.32, F.z, F.ry), 1.0);
    signage('MAH MODE', 'APPEARANCE + STYLING',
      F.x + Math.sin(F.ry) * (F.D * 0.36), y0 + F.H + 1.6, F.z + Math.cos(F.ry) * (F.D * 0.36), F.ry, F.W * 0.60);
    stats.built.push('mode');
    stats.separation.mode = { silhouette: 'open colonnade, see-through', roughness: 0.06, motion: 'slow drift' };
  }

  /* ---- emit ---------------------------------------------------------------------------------- */
  const MATS = { polished, worked, mirror, dark: darkM };
  for (const k of Object.keys(B)) {
    if (!B[k].length) continue;
    const mesh = new THREE.Mesh(own(merge(B[k])), MATS[k]);
    mesh.name = 'facility-' + k; group.add(mesh);
    stats.triangles += mesh.geometry.attributes.position.count / 3;
    stats.draws++;
  }
  for (const k of Object.keys(B)) for (const it of B[k]) {
    if (it.geo && it.geo.dispose && owned.geometries.indexOf(it.geo) < 0) it.geo.dispose();
  }

  /* the pad glows: VITAL's recharge pads and MODE's edge light, one instanced quad family each */
  const padGeo = own(new THREE.PlaneGeometry(1, 1)); padGeo.rotateX(-Math.PI / 2);
  const pads = new THREE.InstancedMesh(padGeo, vitalCore, Math.max(1, vitalPods.length));
  pads.name = 'vital-pads'; pads.frustumCulled = false; pads.renderOrder = 3;
  pads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(pads);
  const edgeGeo = own(new THREE.PlaneGeometry(1, 1));
  const edges = new THREE.InstancedMesh(edgeGeo, modeEdge, Math.max(1, modePods.length));
  edges.name = 'mode-edges'; edges.frustumCulled = false; edges.renderOrder = 3;
  edges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(edges);
  stats.draws += 4;

  const _mm = new THREE.Matrix4(), _pp = new THREE.Vector3(), _qq = new THREE.Quaternion(),
    _ee = new THREE.Euler(), _ss = new THREE.Vector3();
  let quiet = false;

  function write(t) {
    /* THREE RHYTHMS, AND NONE OF THEM SHARE A PERIOD. R3-12's ban on synchronised global motion is
       most visible exactly here — three buildings 80 m apart breathing together would read as one
       system with three heads. */
    /* VITAL: a steady breath, ~14 per minute, which is a resting rate and reads as clinical calm */
    const vb = 1 + 0.09 * Math.sin(t * 1.47);
    for (let i = 0; i < vitalPods.length; i++) {
      const P = vitalPods[i], s = 2.6 * (1 + 0.10 * Math.sin(t * 1.47 + P.phase));
      _pp.set(P.x, P.y - 0.9, P.z); _ee.set(0, P.ry, 0); _qq.setFromEuler(_ee); _ss.set(s, 1, s * 0.8);
      pads.setMatrixAt(i, _mm.compose(_pp, _qq, _ss));
    }
    pads.instanceMatrix.needsUpdate = true;
    vitalCore.opacity = 0.40 + 0.16 * (vb - 1) * 10;

    /* FORGE: a STRIKE. Mostly quiet, then a short flare — a hammer beat on ~3.1 s, which is prime
       against VITAL's 4.27 s breath so the two never fall into step. */
    const beat = (t / 3.1) % 1;
    const strike = Math.exp(-beat * 9) * 0.9;
    forgeSeam.opacity = 0.16 + 0.62 * strike;
    if (forgeCore) { const s = 1 + 0.10 * strike; forgeCore.scale.set(3.4 * s, 2.6 * s, 3.4 * s); }

    /* MODE: a slow DRIFT, no pulse at all — the display plates turn, like a turntable */
    for (let i = 0; i < modePods.length; i++) {
      const P = modePods[i];
      _pp.set(P.x, P.y, P.z);
      _ee.set(0, P.ry + t * 0.12 + P.phase, 0); _qq.setFromEuler(_ee);
      _ss.set(3.0, 0.5, 1);
      edges.setMatrixAt(i, _mm.compose(_pp, _qq, _ss));
    }
    edges.instanceMatrix.needsUpdate = true;
  }
  write(0);

  return {
    group, stats,
    update(t) { if (!quiet) write(t); },
    setTime(s) {
      const night = 1 - (s && s.daylight != null ? s.daylight : 0);
      modeEdge.opacity = 0.10 + 0.28 * night;
      signs.forEach(m => { m.opacity = 0.5 + 0.42 * night; });
    },
    setTheme(th) {
      if (!th || th.energyLight == null) return;
      vitalCore.color.setHex(th.energyLight);
      forgeSeam.color.setHex(th.energyLight);
      modeEdge.color.setHex(th.energyLight);
    },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      quiet = !!low; pads.visible = !low; edges.visible = !low;
    },
    dispose() {
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      owned.textures.forEach(tx => tx.dispose && tx.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

export default { buildMahFacilities, FACILITIES, VITAL_BUFFS };
