/* MAHWORLD :: MUSICLINE — the universal FOBEAM music-line motif
   ============================================================================================

   R2 §10, the UNIVERSAL MUSIC-LINE LAW: every FOBEAM family carries a refined miniature VERTICAL
   music-line/bar visualisation at or near its physical emitter, receiver or travelling packet. It
   is a canonical world motif, not an effect — the same seven-bar figure at every scale, so a viewer
   who learns it on a plaza mast recognises it on a rainforest emitter and on a lake dock.

   §11 says build it ONCE as reusable infrastructure. This is that once. Nothing else in the world
   is allowed to hand-roll a bar graph.

   ---- THE GEOMETRY CONTRACT IS FIXED, AND THAT IS THE POINT -----------------------------------
   §10 requires that this accept normalized Apple Music / audio features later WITHOUT CHANGING ITS
   GEOMETRY CONTRACT. So the contract is stated here and frozen:

       a field is N_SITES x BARS instanced quads. Bar b of site s has a FIXED footprint, a FIXED
       base position and a FIXED maximum height. The ONLY thing that ever varies is a scalar
       level in [0,1] per bar, written into one Float32Array.

   Everything downstream — idle animation, audio, LOD, state transitions — is a function that fills
   that array. When real audio arrives it fills the same array from normalized band energy and not
   one vertex moves that would not have moved anyway. There is no second code path to write, no
   geometry to rebuild and no contract to renegotiate; that is the whole reason it is shaped this
   way rather than as a per-site mesh with its own update.

   ---- THE FIVE STATES (§11) --------------------------------------------------------------------
     IDLE          the default before any audio exists. Subtle and DETERMINISTIC: each bar is a slow
                   sine of its own fixed phase, so two runs of the same capture are identical and a
                   render can be diffed. Bounded to IDLE_LO..IDLE_HI, which is deliberately a narrow
                   band — §11 forbids strobing, and a motif that jumps is a distraction at 40 m.
     ACTIVE_AUDIO  levels come from setLevels(). The idle generator is not consulted at all.
     QUIET         all bars settle to QUIET_LEVEL — a low flat line that still reads as present
                   equipment rather than as a dead prop. This is what a muted world looks like.
     TRANSITION    entered automatically on every state change and left automatically when the
                   crossfade completes; it is not something a caller sets. The blend is on the
                   LEVELS, so a state change can never pop.
     DISTANT_LOD   the field stops animating and holds one deterministic still frame. §12: far
                   beams simplify. The mesh stays visible because the motif is part of the
                   silhouette of an endpoint, and removing it would make far endpoints read as bare
                   posts; it simply stops costing anything per frame.

   ---- COST -------------------------------------------------------------------------------------
   ONE InstancedMesh per field, so a whole family of endpoints is ONE draw call. The per-frame work
   is a matrix scale per instance and one instanceMatrix upload; there is no geometry rebuild and no
   allocation. A field parks itself entirely when its state is DISTANT_LOD or when nothing changed.

   ---- WHAT THIS MODULE MAY NOT DO --------------------------------------------------------------
   No audio. No AudioContext, no analyser, no playback. MAH PLAYER remains the only music owner in
   MAHFITT and this module never reaches for a second one — it consumes numbers a caller supplies
   and has no opinion about where they came from. `setLevels` is the entire audio surface.

   createMusicLineField(ctx, sites, opts) -> {
     group, mesh, stats,
     update(t),  setState(name),  setLevels(arr),  setTheme(theme),  setQuality(q),  dispose()
   }
   `sites` is [{ x, y, z, ry, scale }] — a position, a facing and a size multiplier per endpoint. */

import * as THREE from '../vendor/three/three.module.min.js';

/* THE MOTIF. Seven bars, because it is enough to read as a spectrum and few enough to stay a MARK
   rather than a UI — §11 forbids a giant equaliser. The nominal figure is 1 m wide and 1 m tall at
   scale 1, so a site's `scale` is its height in metres and every other dimension follows. */
export const MUSICLINE = Object.freeze({
  BARS: 7,
  BAR_W: 0.085,          /* bar width as a fraction of the figure's width */
  GAP: 0.062,            /* gap between bars, same units */
  MIN_H: 0.10,           /* a bar never collapses to nothing: zero height is a hole, not a low note */
  IDLE_LO: 0.16, IDLE_HI: 0.52,
  QUIET_LEVEL: 0.13,
  FADE: 0.45,            /* seconds to cross-fade between states */
  IDLE_RATE: 0.55        /* radians per second on the slowest bar; §11 wants subtle, not busy */
});

const STATES = ['idle', 'active_audio', 'quiet', 'distant_lod'];

/* Deterministic per-bar phase and rate. NOT Math.random — a capture must reproduce exactly (the
   pack's own determinism rule), and irrational-ish multipliers keep the seven bars from ever
   marching in step, which is what makes an idle figure read as alive instead of as a wave. */
const phaseOf = i => (i * 2.3999632) % (Math.PI * 2);          /* golden angle, radians */
const rateOf = i => MUSICLINE.IDLE_RATE * (0.72 + 0.31 * ((i * 0.6180339887) % 1));

export function createMusicLineField(ctx, sites, opts = {}) {
  const o = opts || {};
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const list = (sites || []).filter(s => s && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.z));
  const N = list.length, B = MUSICLINE.BARS, COUNT = N * B;

  const group = new THREE.Group();
  group.name = o.name || 'musicline';
  const stats = { sites: N, bars: B, instances: COUNT, draws: 0, triangles: 0, state: 'idle' };
  if (!COUNT) return parked(group, stats);

  /* ONE unit quad, scaled per instance. A quad and not a box: the motif is read face-on from the
     plaza and from the air, it is additive so it has no shaded sides to lose, and a box would
     triple the triangle count of something that is 6 cm wide. */
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.translate(0, 0.5, 0);            /* pivot at the FOOT, so scale.y grows upward like a bar */

  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energyLight || 0xdff1ff),
    transparent: true, opacity: o.opacity != null ? o.opacity : 0.82,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    fog: true, toneMapped: true
  });
  mat.name = 'musicline';

  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.name = (o.name || 'musicline') + '-bars';
  mesh.frustumCulled = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.renderOrder = o.renderOrder != null ? o.renderOrder : 6;
  group.add(mesh);

  /* per-instance fixed placement, resolved once */
  const span = (B - 1) * MUSICLINE.GAP;
  const base = new Array(COUNT);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const _p = new THREE.Vector3(), _s = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const st = list[i], sc = Number.isFinite(st.scale) ? st.scale : 1, ry = Number.isFinite(st.ry) ? st.ry : 0;
    _e.set(0, ry, 0); _q.setFromEuler(_e);
    for (let b = 0; b < B; b++) {
      const off = (b * MUSICLINE.GAP - span / 2) * sc;
      base[i * B + b] = {
        /* the row runs along the site's own local X, so a site facing the plaza shows its face */
        x: st.x + Math.cos(ry) * off, y: st.y, z: st.z - Math.sin(ry) * off,
        q: _q.clone(), w: MUSICLINE.BAR_W * sc, h: sc,
        phase: phaseOf(b + i * 3), rate: rateOf(b + i * 2)
      };
    }
  }

  /* THE ONE ARRAY EVERYTHING WRITES INTO (see the contract note in the header) */
  const level = new Float32Array(COUNT);
  const from = new Float32Array(COUNT);
  const target = new Float32Array(COUNT);
  level.fill(MUSICLINE.IDLE_LO); from.set(level); target.set(level);

  let state = 'idle', prevState = 'idle', fade = 1, dirty = true, lastT = 0;
  let audio = null;                       /* Float32Array of normalized band energy, or null */

  const idleAt = (i, t) => {
    const b = base[i];
    const s = 0.5 + 0.5 * Math.sin(t * b.rate + b.phase);
    return MUSICLINE.IDLE_LO + (MUSICLINE.IDLE_HI - MUSICLINE.IDLE_LO) * s;
  };

  function fillTarget(t) {
    if (state === 'quiet') { target.fill(MUSICLINE.QUIET_LEVEL); return; }
    if (state === 'active_audio' && audio && audio.length) {
      /* map the supplied bands across the seven bars; a caller may hand any band count and this
         resamples, so the geometry contract never depends on the analyser's resolution */
      for (let i = 0; i < COUNT; i++) {
        const b = i % B;
        const k = Math.min(audio.length - 1, Math.floor(b * audio.length / B));
        const v = audio[k];
        target[i] = Math.max(MUSICLINE.MIN_H, Math.min(1, Number.isFinite(v) ? v : 0));
      }
      return;
    }
    for (let i = 0; i < COUNT; i++) target[i] = idleAt(i, t);
  }

  function write() {
    for (let i = 0; i < COUNT; i++) {
      const b = base[i];
      const h = Math.max(MUSICLINE.MIN_H, level[i]) * b.h;
      _p.set(b.x, b.y, b.z); _s.set(b.w, h, b.w);
      _m.compose(_p, b.q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  /* first frame: a still, deterministic figure, so a scene that never calls update still reads */
  fillTarget(0); level.set(target); write();

  const api = {
    group, mesh, stats,
    get state() { return state; },
    setState(name) {
      const next = STATES.indexOf(name) > -1 ? name : 'idle';
      if (next === state) return state;
      prevState = state; state = next; stats.state = next;
      from.set(level); fade = 0; dirty = true;       /* TRANSITION is entered here, implicitly */
      return state;
    },
    /* THE ENTIRE AUDIO SURFACE. Hand it normalized [0,1] band energy of any length and the field
       switches to ACTIVE_AUDIO; hand it null to fall back to the idle generator. No AudioContext
       is created here and none ever will be — MAH PLAYER owns music in MAHFITT. */
    setLevels(arr) {
      if (!arr || !arr.length) { audio = null; if (state === 'active_audio') api.setState('idle'); return; }
      audio = arr; dirty = true;
      if (state !== 'active_audio') api.setState('active_audio');
    },
    setTheme(th) { if (th && th.energyLight != null) mat.color.setHex(th.energyLight); },
    setQuality(q) {
      const name = q && (q.name || q);
      /* §12/§19: the far tier holds one still frame rather than animating. The mesh stays visible —
         the motif is part of an endpoint's silhouette and removing it makes a node read as a bare
         post — it simply stops costing anything per frame. */
      if (name === 'low') api.setState('distant_lod');
      else if (state === 'distant_lod') api.setState('idle');
    },
    update(t) {
      if (state === 'distant_lod' && fade >= 1) return false;
      const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
      if (fade < 1) { fade = Math.min(1, fade + dt / MUSICLINE.FADE); dirty = true; }
      else if (state === 'quiet' || state === 'distant_lod') { if (!dirty) return false; }
      fillTarget(t);
      if (fade < 1) {
        const k = fade * fade * (3 - 2 * fade);                  /* smoothstep, so no velocity pop */
        for (let i = 0; i < COUNT; i++) level[i] = from[i] + (target[i] - from[i]) * k;
      } else {
        level.set(target);
      }
      write();
      dirty = false;
      return true;
    },
    dispose() { geo.dispose(); mat.dispose(); if (group.parent) group.parent.remove(group); }
  };

  stats.draws = 1;
  stats.triangles = COUNT * 2;
  return api;
}

/* an empty field still answers the whole contract, so a caller with no sites needs no branch */
function parked(group, stats) {
  return {
    group, mesh: null, stats,
    get state() { return 'idle'; },
    setState() { return 'idle'; }, setLevels() {}, setTheme() {}, setQuality() {},
    update() { return false; }, dispose() { if (group.parent) group.parent.remove(group); }
  };
}

export default { createMusicLineField, MUSICLINE };
