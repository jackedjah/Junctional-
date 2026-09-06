/* MAHWORLD :: MAHNIMALS — the world's small fauna
   ============================================================================================

   R2 §6 and the director's own addition: the rainforest and the lake are populated, and what
   populates them is NOT an animal with a MAHWORLD paint job. A MAHNIMAL is the square diamond
   living a smaller life — the same brand figure that crowns the monument and rides every FOBEAM
   packet, given a body, a gait and somewhere to be.

   ---- THE GENOME, AT ANIMAL SCALE (§3) --------------------------------------------------------
   Every MAHNIMAL is assembled from the same four things the architecture is:

     · a SQUARE DIAMOND core — the octahedron, kept sharp, §06's one exemption from blunting. It is
       the animal's body, not a decoration attached to one.
     · PLATINUM GROWTH BANDS — the equator rings that read as carapace segments at this size and as
       structural bands at building size. Same part, same material, different scale.
     · DARK CRYSTALLINE TISSUE — the low-value mass between the bands, which is what stops a
       MAHNIMAL reading as a floating gem: a creature needs shadow in it.
     · a MAHGIC VEIN — one small emissive line, themed, which is the only thing that moves in
       value. §11's discipline applies here too: subtle and deterministic, never a blinking light.

   No eyes, no legs, no wings modelled as such. The species law that governs MAHBEINGS — one
   continuous form, no legs — governs their fauna as well, because a world whose people are a
   continuous taper and whose animals have four little feet is two worlds.

   ---- THE THREE FAMILIES ----------------------------------------------------------------------
     DRIFTER   (air)    a diamond with a slow vertical bob and a long lazy orbit. Rainforest canopy.
     GRAZER    (land)   a heavier, wider diamond that hugs the surface and moves in slow arcs.
     SWIMMER   (water)  a flattened diamond that runs a shallow sine just under the surface, so a
                        black lake gets movement in it without anything breaking the mirror.

   ---- WHY IT IS ONE INSTANCED MESH PER FAMILY -------------------------------------------------
   §19 asks for instancing and pooled effects, and a world with three biomes cannot afford a draw
   call per creature. Each family is ONE InstancedMesh; a herd of forty costs one draw. The per-frame
   work is a matrix compose per animal — no geometry rebuild, no allocation.

   ---- DETERMINISM ------------------------------------------------------------------------------
   Every phase, radius and speed comes from the index through irrational multipliers, never from
   Math.random, so a capture reproduces exactly and two renders can be diffed. Same rule as
   musicline.js and for the same reason.

   createMahnimals(ctx, spec) -> { group, stats, update(t), setTheme, setQuality, dispose }
   spec = { family, count, centre:[x,y,z], radius, yLow, yHigh, scale, seed } */

import * as THREE from '../vendor/three/three.module.min.js';

const TAU = Math.PI * 2;

export const MAHNIMAL = Object.freeze({
  /* body proportions per family, as half-extents of the octahedron core at scale 1 */
  drifter: { w: 0.42, h: 0.62, d: 0.42, bands: 2, speed: 0.075, bob: 0.55, roll: 0.30 },
  grazer:  { w: 0.66, h: 0.34, d: 0.52, bands: 3, speed: 0.045, bob: 0.10, roll: 0.10 },
  swimmer: { w: 0.58, h: 0.22, d: 0.86, bands: 2, speed: 0.105, bob: 0.16, roll: 0.42 }
});

/* deterministic per-index scatter — golden angle and a second irrational, so no two animals share a
   phase and the herd never marches in step (the same trick musicline.js uses on its bars) */
const gold = i => (i * 2.3999632) % TAU;
const frac = i => (i * 0.6180339887) % 1;
const frac2 = i => (i * 0.7548776662) % 1;

export function createMahnimals(ctx, spec = {}) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const fam = MAHNIMAL[spec.family] ? spec.family : 'drifter';
  const F = MAHNIMAL[fam];
  const N = Math.max(0, Math.min(240, Math.round(spec.count || 0)));
  const C = spec.centre || [0, 0, 0];
  const RAD = spec.radius || 60;
  const yLow = spec.yLow != null ? spec.yLow : 0;
  const yHigh = spec.yHigh != null ? spec.yHigh : yLow;
  const SC = spec.scale || 1;
  const seed = spec.seed || 0;

  const group = new THREE.Group();
  group.name = 'mahnimals-' + fam;
  const stats = { family: fam, count: N, draws: 0, triangles: 0 };
  const owned = { geometries: [], materials: [] };
  if (!N) return parked(group, stats);

  /* ---- the body: core + bands + vein, each its own instanced mesh so the three materials of the
     genome stay separate and a retheme reaches the vein without touching the platinum ------------ */
  const coreGeo = new THREE.OctahedronGeometry(1, 0);          /* THE SQUARE DIAMOND, brand figure */
  coreGeo.scale(F.w, F.h, F.d);
  owned.geometries.push(coreGeo);

  /* the growth bands: thin rings on the equator. A torus would be smooth and this world is faceted,
     so it is a low-segment ring — the band reads as a cut platinum hoop, not as a rubber O. */
  const bandGeo = new THREE.TorusGeometry(1, 0.085, 3, 10);
  bandGeo.rotateX(Math.PI / 2);
  owned.geometries.push(bandGeo);

  /* THE VEIN RUNS THE BODY'S LONGEST AXIS, which is not always the vertical one. Authored for the
     DRIFTER — tall, so the vein was `F.h * 0.94` and the other two axes were thin — it became a
     sliver on the SWIMMER, whose body is flat (h 0.22) and long (d 0.86). On a pitch-black lake the
     vein is the only part of a dark animal that reads at all, so a swimmer with a vertical vein is
     an invisible swimmer: 30 of them rendered as nothing on the water. Scaled on the dominant axis,
     the swimmer gets a bright line down its length — which is also the right read, because a wake
     runs the way the animal is going. */
  const veinGeo = new THREE.OctahedronGeometry(1, 0);
  const thin = 0.30, longAxis = Math.max(F.w, F.h, F.d);
  veinGeo.scale(
    F.w === longAxis ? F.w * 0.94 : F.w * thin,
    F.h === longAxis ? F.h * 0.94 : F.h * thin,
    F.d === longAxis ? F.d * 0.94 : F.d * thin
  );
  owned.geometries.push(veinGeo);

  const dark = (M.graphiteDark || M.graphite || new THREE.MeshStandardMaterial({ color: 0x1f2a3c })).clone();
  dark.name = 'mahnimal-tissue'; owned.materials.push(dark);
  const plat = (M.platinumLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0xb6c4d6 })).clone();
  plat.name = 'mahnimal-band'; owned.materials.push(plat);
  const vein = new THREE.MeshBasicMaterial({
    /* a caller on a black surface can ask for more — the lake does, because its water returns
       nothing and the vein is the whole signal there */
    color: new THREE.Color(theme.energyLight), transparent: true,
    opacity: Number.isFinite(spec.veinOpacity) ? spec.veinOpacity : 0.62,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  vein.name = 'mahnimal-vein'; owned.materials.push(vein);

  const BANDS = F.bands;
  const core = new THREE.InstancedMesh(coreGeo, dark, N);
  const bands = new THREE.InstancedMesh(bandGeo, plat, N * BANDS);
  const veins = new THREE.InstancedMesh(veinGeo, vein, N);
  for (const m of [core, bands, veins]) {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;                 /* the herd roams; its bounds are the whole habitat */
    group.add(m);
  }
  core.name = 'mahnimal-' + fam + '-core';
  bands.name = 'mahnimal-' + fam + '-bands';
  veins.name = 'mahnimal-' + fam + '-veins';
  veins.renderOrder = 5;

  /* ---- per-animal orbit, resolved once ------------------------------------------------------- */
  const A = new Array(N);
  for (let i = 0; i < N; i++) {
    const k = i + seed;
    const rr = RAD * (0.24 + 0.76 * Math.sqrt(frac(k)));      /* sqrt keeps the herd evenly spread */
    A[i] = {
      r: rr,
      phase: gold(k),
      rate: F.speed * (0.62 + 0.76 * frac2(k)) * (frac(k * 3) > 0.5 ? 1 : -1),   /* both directions */
      y: yLow + (yHigh - yLow) * frac2(k * 5),
      bob: F.bob * (0.7 + 0.6 * frac(k * 7)),
      bobRate: 0.5 + 0.9 * frac2(k * 11),
      s: SC * (0.72 + 0.56 * frac(k * 13))
    };
  }

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3();

  function write(t) {
    for (let i = 0; i < N; i++) {
      const a = A[i];
      const ang = a.phase + t * a.rate;
      const x = C[0] + Math.cos(ang) * a.r;
      const z = C[2] + Math.sin(ang) * a.r;
      const y = C[1] + a.y + Math.sin(t * a.bobRate + a.phase) * a.bob;
      /* the animal faces the way it is travelling, and banks into the turn — one line of character
         that costs nothing and is the difference between a creature and a prop on a turntable */
      _e.set(0, -ang + (a.rate > 0 ? -Math.PI / 2 : Math.PI / 2), Math.sin(t * a.bobRate + a.phase) * F.roll);
      _q.setFromEuler(_e);
      _p.set(x, y, z); _s.set(a.s, a.s, a.s);
      _m.compose(_p, _q, _s);
      core.setMatrixAt(i, _m);
      veins.setMatrixAt(i, _m);
      for (let b = 0; b < BANDS; b++) {
        const f = BANDS === 1 ? 0 : (b / (BANDS - 1) - 0.5);
        const rad = F.w * (1 - Math.abs(f) * 1.35);           /* the octahedron narrows off-equator */
        _p.set(x, y + f * F.h * a.s * 1.15, z);
        _s.set(a.s * rad, a.s * rad, a.s * rad);
        _m.compose(_p, _q, _s);
        bands.setMatrixAt(i * BANDS + b, _m);
      }
    }
    core.instanceMatrix.needsUpdate = true;
    bands.instanceMatrix.needsUpdate = true;
    veins.instanceMatrix.needsUpdate = true;
  }
  write(0);                                   /* a still, deterministic first frame */

  stats.draws = 3;
  stats.triangles = N * (8 + BANDS * 60 + 8);
  let paused = false;

  return {
    group, stats,
    update(t) { if (!paused) write(t); },
    setTheme(th) { if (th && th.energyLight != null) vein.color.setHex(th.energyLight); },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      /* §19: at the low tier the herd holds a still frame and the bands go. The animals stay —
         removing them empties the habitat, which is a worse trade than a frozen one. */
      paused = !!low;
      bands.visible = !low;
      veins.visible = !low;
    },
    dispose() {
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

function parked(group, stats) {
  return { group, stats, update() {}, setTheme() {}, setQuality() {}, dispose() { if (group.parent) group.parent.remove(group); } };
}

export default { createMahnimals, MAHNIMAL };
