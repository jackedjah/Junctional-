/* MAHWORLD :: BROADCAST — the rear-city holographic authority monitor
   ============================================================================================

   MASTER WORLD CLOSURE §8 calls this "A MAJOR new landmark": a city-scale holographic address
   system in the under-authored region behind the main buildings, carrying Mr. Mah speaking. Not a
   television bolted to a wall, not a floating HUD, and not an ordinary rectangular LED billboard.

   ---- THE ENVELOPE IS MEASURED, NOT CHOSEN ---------------------------------------------------
   The brief defines it in terms of the world rather than in metres: "Let B be the measured width
   of one principal facility frontage. Start with a projected image approximately 2.5B wide and
   about 2.2:1 width-to-height." buildings.js SITES gives MAH MATCH W = 44, H = 38, so:

       B      = 44 m      (MAH MATCH frontage, the principal facility)
       image  = 110 m wide  (2.5B, inside the 2B-3B envelope the brief allows)
              = 50 m tall   (110 / 2.2)
       bottom = 26 m      ("above ordinary resident traffic and street fixtures, roughly half the
                            height of a nearby principal facade" — MATCH H/2 = 19, raised to 26 so
                            the crown clearly overtops the surrounding low/medium frontage)

   ---- SITING ----------------------------------------------------------------------------------
   Bearing 168 degrees, radius 185 m, in the REAR hemisphere (+z). That region was measured empty
   by the 180-degree spin proof before v10 gave it mountains, which is exactly the "currently
   under-authored" area §8 names. Checked against the two large FOBLOCKs already standing there:
   128 m clear of the ARCHITECTURAL hub at (-58, 96) and 266 m from the MEGA at (-215, 262), and at
   185 m it stands on city.js's own ground annulus (126-620 m) rather than on invented topography.

   It faces the plaza — that is the real sightline from the main city — but with a deliberate 9
   degree yaw off axis. §8: "Its role is visible from this district, not permanently camera-facing"
   and "The screen does not rotate to face every camera." The offset is what makes the establishing
   view reveal a slim projected volume down its side instead of a flat billboard.

   ---- WHAT MAKES IT A PROJECTION AND NOT A BLACK TV --------------------------------------------
   §8 asks for separated layers, and they are separate objects here:
     1. a real world-space BASE — a cross-core platinum podium standing on the ground (§3's
        cruciform logic: central core plus four integrated wings);
     2. PAIRED STRUCTURAL EMITTERS, two and not four, each capped with a rounded FOBLOCK-derived
        projector module from the genome — the brief explicitly warns against "four enormous white
        poles that compete with the presenter";
     3. a restrained BEAM FAN from each emitter head to the near corners of the image, so the light
        path is physically explained;
     4. a narrow platinum FRAME with SQUARE-DIAMOND corner nodes (the brand figure, which keeps its
        points by law);
     5. the luminous IMAGE FIELD itself, a wide softened rectangle with clipped corners;
     6. the canonical PRESENTER standing inside that field;
     7. sparse DEPTH CUES behind the presenter.

   The field is deliberately NOT uniformly transparent. §8: "The image field may reveal some
   background, but the face and chest need enough local opacity/contrast to read. Do not make the
   whole panel equally transparent." So the field is low-opacity and the presenter is markedly more
   opaque, which is also what makes the face survive the scale.

   ---- THE PRESENTER IS NOT SCULPTED HERE ------------------------------------------------------
   residents.js is the species authority in code, so the presenter is built by calling
   createResident() and rescaled — never modelled fresh. §8's "PRESENTER OWNERSHIP" forbids forking
   the clay sculpt or manufacturing a realistic human official, and the canonical species sheet is
   explicit that the lower body is a SINGLE CONTINUOUS TEARDROP WITH NO LEGS. Building through the
   authority makes both true by construction rather than by care.

   The figure is scaled so the WHOLE body fits inside the field (about 46 m in a 50 m field) rather
   than cropping at the waist. That keeps the one-point species visible, which §8 asks for where the
   lower body shows, and still leaves the head about 8.7 m tall — roughly 2.7 degrees at the plaza,
   comfortably legible.

   ---- WHAT THIS MODULE DELIBERATELY DOES NOT DO -----------------------------------------------
   NO AUDIO. §8's VOICE AND CAPTIONS section requires that playback start "only through the existing
   app's approved interaction/audio policy" and that there be "No second music player". This project
   also has a standing constraint that MAH PLAYER remains the sole music owner. So this module is
   SILENT: it builds the caption surface and the mute affordance's visual state, and it never
   creates an AudioContext, never autoplays, and never touches master volume. Wiring it to approved
   audio is a separate, deliberate act by whoever owns that policy.

   NO INVENTED COPY. §22 and the pack's §10 forbid inventing text. The caption system is built and
   driven from `opts.captions`, which DEFAULTS TO EMPTY. The mechanism ships; the words are the
   director's to supply. Nothing here writes a slogan, a name or a sentence into the world.

   PLAYBACK STATES are deterministic and local: idle, starting, speaking, paused, ending,
   unavailable, driven from update(t) on a fixed cycle with no wall-clock dependency, so a capture
   at a recorded playback time reproduces exactly (§8 DETERMINISTIC REVIEW).

   ---- LAWS -------------------------------------------------------------------------------------
   LAW 1: the podium deck, the emitter caps and the apron are all UP-FACING and therefore wear a
   LOW-metalness grade. Mirror grades appear only on vertical flanks.
   LAW 2: the image field is the largest emitter in the rear city, so it is answered — an apron
   glow plate beneath it and a lit podium deck, both keyed to the same intensity the field runs at.
   AERIAL PERSPECTIVE: at 185 m the structure recedes (see RECEDE), because this world has shipped
   the inverse three times.

   No addons; three r185 core only; procedural; deterministic. */

import * as THREE from '../vendor/three/three.module.min.js';
import { foblockParts } from './foblock.js';

const DEG = Math.PI / 180;

/* ---- THE MEASURED ENVELOPE (see header) ---------------------------------------------------- */
const B = 44;                          /* MAH MATCH frontage width, buildings.js SITES.match.W */
const IMG_W = 2.5 * B;                 /* 110 m */
const IMG_H = IMG_W / 2.2;             /* 50 m */
const IMG_BOTTOM = 26;
const SITE = { deg: 168, r: 185, yaw: 9 * DEG };

/* Distance recession, the same law city.js and fobstations.js use. */
const RECEDE = { env: 0.58, tint: 0x5d7099, mix: 0.5 };

const at = (deg, r) => { const b = deg * DEG; return [Math.sin(b) * r, -Math.cos(b) * r]; };

/* ---------------------------------------------------------------- merge (no addons) */
function mergeGeos(list) {
  const flat = [];
  for (const g0 of list) {
    const g = g0.getIndex() ? g0.toNonIndexed() : g0;
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    flat.push(g);
  }
  let n = 0;
  for (const g of flat) n += g.getAttribute('position').count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of flat) {
    const p = g.getAttribute('position'), q = g.getAttribute('normal');
    pos.set(p.array.subarray(0, p.count * 3), o * 3);
    nor.set(q.array.subarray(0, q.count * 3), o * 3);
    o += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}
const xform = (g, x, y, z, ry, rx) => {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, 0)),
    new THREE.Vector3(1, 1, 1));
  return (g.getIndex() ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
};

/* A wide rectangle with CLIPPED corners — §8's "gently softened wide rectangular image field with
   clipped/beveled or subtly rounded corners". An octagonal plan in elevation: the corner cut is what
   stops it reading as a television, and it costs six triangles. */
function clippedField(w, h, cut) {
  const hw = w / 2, hh = h / 2, c = Math.min(cut, hw * 0.5, hh * 0.5);
  const pts = [
    [-hw + c, -hh], [hw - c, -hh], [hw, -hh + c], [hw, hh - c],
    [hw - c, hh], [-hw + c, hh], [-hw, hh - c], [-hw, -hh + c]
  ];
  const pos = [], uv = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const tri = [pts[0], pts[i], pts[i + 1]];
    for (const [x, y] of tri) { pos.push(x, y, 0); uv.push(x / w + 0.5, y / h + 0.5); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.computeVertexNormals();
  return g;
}

/* The projection field's own texture: a soft falloff toward the edges plus fine low-contrast scan
   structure. §8: "A soft field falloff, fine low-contrast scan structure ... Avoid hard flashing, a
   constant glitch effect, rapid full-screen scan bars or noise that masks the person speaking." The
   scan lines here sit at about 6% contrast — present when looked for, invisible as noise. */
function fieldTexture(canvasTexture) {
  return canvasTexture(512, 256, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.62);
    g.addColorStop(0, 'rgba(255,255,255,0.92)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.58)');
    g.addColorStop(0.86, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'multiply';
    for (let y = 0; y < h; y += 3) {
      c.fillStyle = 'rgba(210,225,245,' + (y % 6 === 0 ? 0.94 : 1) + ')';
      c.fillRect(0, y, w, 1);
    }
  });
}

/* ---------------------------------------------------------------- build */

export function buildBroadcast(ctx, opts = {}) {
  const { M, scene } = ctx;
  const CT = ctx.canvasTexture || opts.canvasTexture;
  const group = new THREE.Group(); group.name = 'broadcast';
  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { presenter: false, draws: 0, triangles: 0, states: [], envelope: {} };

  const [SX, SZ] = at(SITE.deg, SITE.r);
  /* face the plaza, then yaw deliberately off axis so a side is always visible (§8) */
  const RY = -SITE.deg * DEG + SITE.yaw;
  const nrm = new THREE.Vector3(Math.sin(RY), 0, Math.cos(RY));   /* the screen's viewing normal */

  stats.envelope = { B, imageW: +IMG_W.toFixed(1), imageH: +IMG_H.toFixed(1), bottom: IMG_BOTTOM, x: +SX.toFixed(1), z: +SZ.toFixed(1) };

  /* recede a shared grade for this distance */
  const far = (base, key) => {
    if (!base) return base;
    const m = base.clone();
    m.envMapIntensity = (base.envMapIntensity !== undefined ? base.envMapIntensity : 1) * RECEDE.env;
    if (m.color) m.color.lerp(new THREE.Color(RECEDE.tint), RECEDE.mix);
    m.name = 'broadcast-' + key;
    owned.materials.push(m);
    return m;
  };
  const MAT = {
    shell: far(M.chromeSatin || M.platinum, 'shell'),
    deck: far(M.platinumMidLit || M.platinumLit, 'deck'),     /* LAW 1: every up-facing plane */
    dark: far(M.graphiteDark || M.graphite, 'dark'),
    rim: far(M.trim || M.platinum, 'rim'),
    node: M.energyLight || M.energy
  };

  /* ---- 1. THE BASE: a cross-core platinum podium (§3 cruciform, §8 "deliberate base") -------- */
  const podium = [], deck = [];
  {
    const coreW = 56, coreD = 26, h = 12, wingL = 22, wingW = 13;
    /* central core */
    podium.push(xform(new THREE.BoxGeometry(coreW, h, coreD), SX, h / 2, SZ, RY));
    /* four integrated wings — the cross. Rounded ends via a cylinder cap on each. */
    for (const [dx, dz, rot] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]]) {
      const lx = dx ? wingL : wingW, lz = dz ? wingL : wingW;
      const ox = dx * (coreW / 2 + (dx ? wingL / 2 : 0)) * 0.86;
      const oz = dz * (coreD / 2 + (dz ? wingL / 2 : 0)) * 0.86;
      const wx = SX + ox * Math.cos(RY) + oz * Math.sin(RY);
      const wz = SZ - ox * Math.sin(RY) + oz * Math.cos(RY);
      podium.push(xform(new THREE.BoxGeometry(lx, h * 0.72, lz), wx, h * 0.36, wz, RY + rot));
    }
    /* the deck: a separate up-facing plate in a LOW-metalness grade (LAW 1) */
    deck.push(xform(new THREE.BoxGeometry(coreW + 2, 0.9, coreD + 2), SX, h + 0.45, SZ, RY));
  }

  /* ---- 2. PAIRED EMITTERS — two, not four (§8) ----------------------------------------------- */
  const masts = [], heads = { shell: [], cap: [], dark: [], rim: [], ring: [], diamond: [], energy: [] };
  const EM_X = IMG_W * 0.54, EM_H = IMG_BOTTOM - 2.5;
  const emitterTop = [];
  for (const sd of [-1, 1]) {
    const ex = SX + sd * EM_X * Math.cos(RY), ez = SZ - sd * EM_X * Math.sin(RY);
    masts.push(xform(new THREE.CylinderGeometry(1.5, 2.6, EM_H, 12, 1), ex, EM_H / 2, ez, 0));
    /* a rounded FOBLOCK-derived projector module caps each mast — the genome, not a new species */
    const p = foblockParts({ tier: 'architectural', diamond: true, energy: false });
    for (const k of Object.keys(heads)) for (const g of p[k]) heads[k].push(xform(g, ex, EM_H, ez, RY));
    emitterTop.push(new THREE.Vector3(ex, EM_H + 12, ez));
  }

  /* ---- 3. THE IMAGE FIELD, its frame and its corner nodes ------------------------------------ */
  const cy = IMG_BOTTOM + IMG_H / 2;
  const fieldGeo = own(clippedField(IMG_W, IMG_H, 6.5));
  const fieldTex = CT ? fieldTexture(CT) : null;
  if (fieldTex) owned.textures.push(fieldTex);
  const fieldMat = new THREE.MeshBasicMaterial({
    map: fieldTex || null,
    color: (M.energy && M.energy.color) ? M.energy.color.clone() : new THREE.Color(0x7fc6ff),
    transparent: true, opacity: 0.30, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, fog: true
  });
  fieldMat.name = 'broadcast-field'; owned.materials.push(fieldMat);
  const field = new THREE.Mesh(fieldGeo, fieldMat);
  field.position.set(SX, cy, SZ); field.rotation.y = RY;
  field.renderOrder = 4; field.name = 'broadcast-field';
  group.add(field);

  /* narrow frame: four slim bars just outside the field, in platinum */
  const frame = [];
  {
    const t = 0.9, hw = IMG_W / 2 + t, hh = IMG_H / 2 + t;
    frame.push(xform(new THREE.BoxGeometry(IMG_W + 2 * t, t, t * 1.6), SX, cy + hh, SZ, RY));
    frame.push(xform(new THREE.BoxGeometry(IMG_W + 2 * t, t, t * 1.6), SX, cy - hh, SZ, RY));
    for (const sd of [-1, 1]) {
      const fx = SX + sd * hw * Math.cos(RY), fz = SZ - sd * hw * Math.sin(RY);
      frame.push(xform(new THREE.BoxGeometry(t, IMG_H, t * 1.6), fx, cy, fz, RY));
    }
  }
  /* SQUARE-DIAMOND corner nodes — the brand figure, keeping its points by law */
  const nodes = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const nx = SX + sx * (IMG_W / 2) * Math.cos(RY), nz = SZ - sx * (IMG_W / 2) * Math.sin(RY);
    nodes.push(xform(new THREE.OctahedronGeometry(2.6, 0), nx, cy + sy * IMG_H / 2, nz, RY));  /* square-diamond node */
  }

  /* ---- 4. THE BEAM FAN — the light path, physically explained (§8) --------------------------- */
  const fans = [];
  {
    const corner = (sx, sy) => new THREE.Vector3(
      SX + sx * (IMG_W / 2) * Math.cos(RY), cy + sy * IMG_H / 2, SZ - sx * (IMG_W / 2) * Math.sin(RY));
    for (let i = 0; i < 2; i++) {
      const o = emitterTop[i], sx = i ? 1 : -1;
      for (const sy of [-1, 1]) {
        const c = corner(sx, sy);
        const mid = o.clone().lerp(c, 0.5);
        const len = o.distanceTo(c);
        const g = new THREE.PlaneGeometry(len, 1.4);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), c.clone().sub(o).normalize());
        const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1));
        fans.push(g.applyMatrix4(m));
      }
    }
  }
  const fanMat = new THREE.MeshBasicMaterial({
    color: (M.energy && M.energy.color) ? M.energy.color.clone() : new THREE.Color(0x7fc6ff),
    transparent: true, opacity: 0.085, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, fog: true
  });
  fanMat.name = 'broadcast-fan'; owned.materials.push(fanMat);
  const fanMesh = new THREE.Mesh(own(mergeGeos(fans)), fanMat);
  fanMesh.renderOrder = 3; fanMesh.name = 'broadcast-beam-fan'; group.add(fanMesh);

  /* ---- 5. THE PRESENTER — built by the species authority, never sculpted here ----------------- */
  let presenter = null, presenterMats = [];
  const R = opts.residents || ctx.residentsModule || null;
  if (R && typeof R.createResident === 'function') {
    try {
      const fig = R.createResident({ colour: 'platinum', tier: 'near', role: 'presenter' });
      if (fig) {
        /* scale so the WHOLE body sits inside the field: species stays visible, head stays legible */
        const box = new THREE.Box3().setFromObject(fig);
        const nat = Math.max(0.001, box.max.y - box.min.y);
        const s = (IMG_H * 0.92) / nat;
        fig.scale.setScalar(s);
        fig.position.set(SX - nrm.x * 1.4, IMG_BOTTOM + IMG_H * 0.04, SZ - nrm.z * 1.4);
        fig.rotation.y = RY;
        /* THE HOLOGRAPHIC GRADE. §8: the field may reveal background, but the face and chest need
           local opacity or the presenter dissolves. The figure therefore runs markedly MORE opaque
           than the 0.30 field, and additively so it reads as light rather than as painted glass. */
        fig.traverse(o => {
          if (!o.isMesh || !o.material) return;
          const src = Array.isArray(o.material) ? o.material : [o.material];
          const out = src.map(mm => {
            /* CARRY THE VERTEX COLOURS. residents.js paints the dark facial chamber, the two eyes
               and the energy accents as PER-VERTEX colour on a material whose own `color` is plain
               WHITE — so cloning only `color` gave every part of the body the same white and the
               presenter rendered as a flat cutout with no face. Third module to hit this (see the
               learning record L17: the monument's LAW 1 splitter and the same assumption here).
               With the flag carried, the chamber adds almost nothing under additive blending and
               therefore stays dark, which is exactly what a projected face should do, and the light
               accents add brightly against it. */
            const h = new THREE.MeshBasicMaterial({
              color: mm.color ? mm.color.clone() : new THREE.Color(0xcfe4ff),
              vertexColors: !!mm.vertexColors,
              transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending,
              depthWrite: false, side: THREE.DoubleSide, fog: true
            });
            h.name = 'broadcast-presenter';
            owned.materials.push(h); presenterMats.push(h);
            return h;
          });
          o.material = out.length === 1 ? out[0] : out;
          o.renderOrder = 5;
          o.castShadow = false; o.receiveShadow = false;
        });
        fig.name = 'broadcast-presenter';
        group.add(fig);
        presenter = fig;
        stats.presenter = true;
      }
    } catch (e) { stats.presenterError = String(e && e.message).slice(0, 120); }
  }

  /* ---- 6. DEPTH CUES — sparse, behind the presenter ------------------------------------------ */
  const cueMat = new THREE.MeshBasicMaterial({
    color: (M.energyDeep && M.energyDeep.color) ? M.energyDeep.color.clone() : new THREE.Color(0x2a63c9),
    transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  cueMat.name = 'broadcast-cue'; owned.materials.push(cueMat);
  {
    const cues = [];
    for (let i = 0; i < 3; i++) {
      const w = IMG_W * (0.42 - i * 0.09), h = 0.9;
      const y = cy - IMG_H * (0.30 - i * 0.16);
      cues.push(xform(new THREE.PlaneGeometry(w, h), SX + nrm.x * 0.7, y, SZ + nrm.z * 0.7, RY));
    }
    const m = new THREE.Mesh(own(mergeGeos(cues)), cueMat);
    m.renderOrder = 4; m.name = 'broadcast-depth-cues'; group.add(m);
  }

  /* ---- 7. THE APRON — a district, not an empty lot (§8) -------------------------------------- */
  /* LAW 2: the field is the largest emitter in the rear city, so the ground beneath it answers.
     ground.js's ctx.lightPool only serves the plaza deck (r <= 43), and this stands at 185 m, so
     the response is built here: a wide apron plate plus a glow plate keyed to the field. */
  const apron = [], seating = [];
  {
    const aw = IMG_W * 1.5, ad = 74;
    apron.push(xform(new THREE.BoxGeometry(aw, 0.7, ad), SX + nrm.x * 26, 0.35, SZ + nrm.z * 26, RY));
    /* edge seating: rounded blocks along the promenade's two long sides */
    for (const sd of [-1, 1]) for (let i = -2; i <= 2; i++) {
      const ox = i * 19, oz = sd * (ad / 2 - 5);
      const bx = SX + nrm.x * 26 + ox * Math.cos(RY) + oz * Math.sin(RY);
      const bz = SZ + nrm.z * 26 - ox * Math.sin(RY) + oz * Math.cos(RY);
      seating.push(xform(new THREE.BoxGeometry(7, 1.1, 2.2), bx, 1.25, bz, RY));
    }
  }
  const glowMat = new THREE.MeshBasicMaterial({
    color: (M.energy && M.energy.color) ? M.energy.color.clone() : new THREE.Color(0x7fc6ff),
    transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  glowMat.name = 'broadcast-apron-glow'; owned.materials.push(glowMat);
  {
    const g = new THREE.PlaneGeometry(IMG_W * 1.35, 62).rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(own(xform(g, SX + nrm.x * 24, 0.78, SZ + nrm.z * 24, RY)), glowMat);
    m.renderOrder = 5; m.name = 'broadcast-apron-glow'; group.add(m);
  }

  /* ---- assemble the solid buckets ------------------------------------------------------------ */
  const solid = [
    ['broadcast-podium', podium, MAT.shell], ['broadcast-podium-deck', deck, MAT.deck],
    ['broadcast-masts', masts, MAT.shell], ['broadcast-frame', frame, MAT.rim],
    ['broadcast-nodes', nodes, MAT.node],
    ['broadcast-apron', apron, MAT.deck], ['broadcast-seating', seating, MAT.deck]
  ];
  for (const [name, list, mat] of solid) {
    if (!list.length) continue;
    const m = new THREE.Mesh(own(mergeGeos(list)), mat);
    m.name = name; m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  }
  for (const k of Object.keys(heads)) {
    if (!heads[k].length) continue;
    const mat = k === 'cap' ? MAT.deck : k === 'dark' ? MAT.dark : k === 'diamond' || k === 'energy' ? MAT.node : MAT.shell;
    const m = new THREE.Mesh(own(mergeGeos(heads[k])), mat);
    m.name = 'broadcast-emitter-' + k; m.castShadow = true;
    group.add(m);
  }

  /* ---- 8. PLAYBACK STATE MACHINE — deterministic, local, silent ------------------------------ */
  /* §8 MINIMUM COMPLETE PLAYBACK: idle, starting, speaking, paused, ending, unavailable. Driven
     from update(t) on a fixed cycle so a capture at a recorded playback time reproduces exactly
     (DETERMINISTIC REVIEW). "Speaking" here is restrained motion and field intensity — it is NOT a
     promise of live AI, live events or a cloud service, and this module makes no sound at all. */
  const CYCLE = [
    { name: 'idle', t: 6, field: 0.16, figure: 0.34 },
    { name: 'starting', t: 2.2, field: 0.26, figure: 0.55 },
    { name: 'speaking', t: 22, field: 0.32, figure: 0.78 },
    { name: 'paused', t: 3, field: 0.22, figure: 0.52 },
    { name: 'ending', t: 2.4, field: 0.18, figure: 0.36 }
  ];
  const PERIOD = CYCLE.reduce((a, s) => a + s.t, 0);
  stats.states = CYCLE.map(s => s.name).concat(['unavailable']);
  let forced = null, muted = false, night = 1;

  const st = { name: 'idle', field: 0.16, figure: 0.34, k: 0 };
  function phaseAt(tt) {
    if (forced === 'unavailable') { st.name = 'unavailable'; st.field = 0.05; st.figure = 0; st.k = 0; return st; }
    let u = ((tt % PERIOD) + PERIOD) % PERIOD;
    for (const s of CYCLE) {
      if (u < s.t) { st.name = s.name; st.field = s.field; st.figure = s.figure; st.k = u / s.t; return st; }
      u -= s.t;
    }
    return st;
  }

  scene.add(group);
  group.traverse(o => {
    if (!o.isMesh) return;
    stats.draws++;
    const g = o.geometry, idx = g.getIndex();
    stats.triangles += idx ? idx.count / 3 : g.getAttribute('position').count / 3;
  });

  /* ---- the contract -------------------------------------------------------------------------- */
  return {
    group, stats,
    /* captions are a MECHANISM here and nothing more — opts.captions defaults to empty because
       §22 forbids invented copy. Supply lines and this will show them; supply none and it shows
       none, which is the correct default for a world whose words are not yet written. */
    captions: (opts.captions || []).slice(),
    setBroadcastState(name) { forced = name === 'unavailable' ? 'unavailable' : null; },
    setMuted(v) { muted = !!v; },           /* visual state only — this module never plays audio */
    get muted() { return muted; },
    setTime(clockState) {
      night = 1 - (clockState && typeof clockState.daylight === 'number' ? clockState.daylight : 0);
    },
    setTheme(theme) {
      if (!theme) return;
      const e = new THREE.Color(theme.energy);
      fieldMat.color.copy(e); fanMat.color.copy(e); glowMat.color.copy(e);
    },
    update(t) {
      const s = phaseAt(t);
      const lift = 0.55 + 0.45 * night;
      fieldMat.opacity = s.field * lift;
      fanMat.opacity = 0.085 * (0.4 + 0.6 * (s.field / 0.32)) * lift;
      glowMat.opacity = 0.13 * (s.field / 0.32) * lift;
      cueMat.opacity = 0.10 * (s.figure / 0.78);
      for (let i = 0; i < presenterMats.length; i++) presenterMats[i].opacity = s.figure;
      /* restrained speaking motion: a small torso sway, no allocation, and nothing that reads as
         a glitch. §8 forbids hard flashing and noise that masks the person speaking. */
      if (presenter) {
        const amp = s.name === 'speaking' ? 1 : s.name === 'starting' ? 0.4 : 0.12;
        presenter.rotation.y = RY + Math.sin(t * 0.55) * 0.035 * amp;
        presenter.position.y = IMG_BOTTOM + IMG_H * 0.04 + Math.sin(t * 0.9) * 0.20 * amp;
      }
    },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      group.traverse(o => { if (o.isMesh && /beam-fan|depth-cues|apron-glow/.test(o.name)) o.visible = !low; });
    },
    dispose() {
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      owned.textures.forEach(t => t.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

export default { buildBroadcast };
