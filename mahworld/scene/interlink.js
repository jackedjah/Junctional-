/* MAHWORLD :: INTERLINK — the two routes that make three places one world
   ============================================================================================

   The R2 §5 / R3 gate-21 far-zoom lock asks for "multiple believable destinations" in one frame, and
   BELIEVABLE is the word doing the work. Three cities that happen to be in shot are three cities.
   Three cities with traffic between them are a world. L49 fixed why the peer cities could not be
   SEEN from up there; this is why they should read as connected once they can be.

   ---- WHY THIS IS TWO ARCS AND NOT A NETWORK ---------------------------------------------------
   v10 §13 is a scar this file is written around: "FOBEAM lines over-bright, arcs lattice the sky."
   The fix then was fewer, thinner, dimmer. So there are exactly TWO routes here — plaza to Lake
   City, plaza to Rainforest City — and no ring route between the peers, because a triangle would
   put a line across the middle of every wide frame in the world. The plaza is the hub; that is a
   composition decision as much as a transport one.

   ---- THE APEX IS MEASURED, NOT CHOSEN ---------------------------------------------------------
   terrain.js's NEAR massif range stands at r 700 with peaks to hMax 370. A route that arcs to 300 m
   passes THROUGH a mountain on most bearings; one that arcs to 430 clears the tallest of them by
   60 m and is still well under clouds.js's high deck at 440-560, so it reads against open sky
   rather than disappearing into weather. Both numbers come from those files, not from taste — this
   is the same class of collision as L42 and L49 and it is checked before it can happen rather than
   after it shows up in a render.

   ---- R3-05 ------------------------------------------------------------------------------------
   "For every beam: identify physical emitter, identify physical receiver, place a small refined set
   of vertical audio bars near one or both endpoints." A route has both ends by definition: the
   plaza is the emitter and the city is the receiver, and each gets a mini music line at a scale set
   by what it sits on.

   buildInterlink(ctx, { routes }) -> the standard module contract. */

import * as THREE from '../vendor/three/three.module.min.js';
import { createMusicLineField } from './musicline.js';

const TAU = Math.PI * 2;

export const LINK = Object.freeze({
  APEX: 430,            /* clears terrain.js near hMax 370 by 60, under clouds.js high yMin 440 */
  LIFT: 46,             /* where a route leaves the plaza deck */
  R_CORE: 0.9,          /* thin. v10 §13: the failure mode of this world's beams is over-presence */
  R_SHEATH: 3.4,
  PACKETS: 16,
  SEGMENTS: 96
});

const gold = i => (i * 2.3999632) % TAU;
const frac = i => (i * 0.6180339887) % 1;

export function buildInterlink(ctx, opts = {}) {
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'interlink';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { routes: [], draws: 0, triangles: 0, apex: LINK.APEX, derived: {} };

  const ROUTES = opts.routes || [];
  if (!ROUTES.length) return parked(group, stats);

  const core = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energyLight), transparent: true, opacity: 0.26,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  core.name = 'interlink-core'; owned.materials.push(core);
  const sheath = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energy), transparent: true, opacity: 0.055,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true, side: THREE.BackSide
  });
  sheath.name = 'interlink-sheath'; owned.materials.push(sheath);
  const packMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energyLight), transparent: true, opacity: 0.66,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  packMat.name = 'interlink-packet'; owned.materials.push(packMat);

  const curves = [];
  const ends = [];
  ROUTES.forEach((R, i) => {
    const span = Math.hypot(R.x, R.z);
    if (span < 120) return;
    const ux = R.x / span, uz = R.z / span;
    /* stop SHORT of the city, at its own radius, so the route arrives at a destination rather than
       burying itself in one — the same decision travel.js makes about where a flight ends */
    const ax = R.x - ux * (R.radius || 200) * 0.92, az = R.z - uz * (R.radius || 200) * 0.92;
    const pts = [
      new THREE.Vector3(ux * 34, LINK.LIFT, uz * 34),
      new THREE.Vector3(ux * span * 0.26, LINK.APEX * 0.80, uz * span * 0.26),
      new THREE.Vector3(ux * span * 0.52, LINK.APEX, uz * span * 0.52),
      new THREE.Vector3(ux * span * 0.78, LINK.APEX * 0.74, uz * span * 0.78),
      new THREE.Vector3(ax, R.arriveY != null ? R.arriveY : 110, az)
    ];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    curves.push({ curve, phase: frac(i * 7 + 3), rate: 0.030 + 0.014 * frac(i * 11) });
    const tube = own(new THREE.TubeGeometry(curve, LINK.SEGMENTS, LINK.R_CORE, 5, false));
    const halo = own(new THREE.TubeGeometry(curve, Math.round(LINK.SEGMENTS * 0.5), LINK.R_SHEATH, 4, false));
    const mCore = new THREE.Mesh(tube, core); mCore.name = 'interlink-core-' + R.id;
    const mHalo = new THREE.Mesh(halo, sheath); mHalo.name = 'interlink-sheath-' + R.id;
    mCore.renderOrder = 4; mHalo.renderOrder = 3;
    mCore.frustumCulled = false; mHalo.frustumCulled = false;
    group.add(mHalo); group.add(mCore);
    stats.draws += 2;
    stats.triangles += tube.index.count / 3 + halo.index.count / 3;
    ends.push({ x: ux * 34, y: LINK.LIFT, z: uz * 34, ry: Math.atan2(ux, uz), scale: 1.6 });
    ends.push({ x: ax, y: (R.arriveY != null ? R.arriveY : 110), z: az, ry: Math.atan2(-ux, -uz), scale: 4.2 });
    stats.routes.push({ id: R.id, span: +span.toFixed(1), apex: LINK.APEX,
      arrive: [+ax.toFixed(1), +az.toFixed(1)] });
  });

  /* ONE instanced packet family across both routes — a diamond travelling a route is the only thing
     that says the route is USED, and used is the difference between infrastructure and a drawn line */
  const packGeo = own(new THREE.OctahedronGeometry(1, 0));
  packGeo.scale(2.6, 3.8, 2.6);
  const packets = new THREE.InstancedMesh(packGeo, packMat, Math.max(1, curves.length * LINK.PACKETS));
  packets.name = 'interlink-packets'; packets.frustumCulled = false; packets.renderOrder = 5;
  packets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(packets); stats.draws++;

  /* R3-05: the motif at both ends of every beam. The plaza end is small because it stands on a deck
     a person walks; the city end is large because it hangs 110 m up over a city (L23). */
  const musicLines = createMusicLineField(ctx, ends, { name: 'interlink-musicline', opacity: 0.7 });
  if (musicLines && musicLines.group) { group.add(musicLines.group); stats.draws++; }

  const _mm = new THREE.Matrix4(), _pp = new THREE.Vector3(), _qq = new THREE.Quaternion(),
    _ee = new THREE.Euler(), _ss = new THREE.Vector3();
  let quiet = false;
  function write(t) {
    let n = 0;
    for (let c = 0; c < curves.length; c++) {
      const C = curves[c];
      for (let k = 0; k < LINK.PACKETS; k++) {
        const u = (t * C.rate + C.phase + k / LINK.PACKETS) % 1;
        C.curve.getPoint(u, _pp);
        /* a packet at the apex is 430 m up and 500 m away; one near an endpoint is close. Scaling
           with the arc keeps both legible without the far one becoming a star. */
        const s = 0.7 + 0.6 * Math.abs(u - 0.5) * 2;
        _ee.set(0, gold(c * 13 + k) + t * 0.7, 0); _qq.setFromEuler(_ee);
        _ss.set(s, s, s);
        packets.setMatrixAt(n++, _mm.compose(_pp, _qq, _ss));
      }
    }
    packets.instanceMatrix.needsUpdate = true;
  }
  write(0);

  return {
    group, stats,
    update(t) { if (!quiet) write(t); if (musicLines && musicLines.update) musicLines.update(t); },
    setTime(s) {
      /* v10 §13 again: by day these must nearly vanish. A bright arc over a daylit world is the
         lattice the brief objected to; at night it is the thing that connects three places. */
      const night = 1 - (s && s.daylight != null ? s.daylight : 0);
      core.opacity = 0.06 + 0.22 * night;
      sheath.opacity = 0.012 + 0.048 * night;
      packMat.opacity = 0.18 + 0.50 * night;
      if (musicLines && musicLines.setTime) musicLines.setTime(s);
    },
    setTheme(th) {
      if (!th) return;
      if (th.energyLight != null) { core.color.setHex(th.energyLight); packMat.color.setHex(th.energyLight); }
      if (th.energy != null) sheath.color.setHex(th.energy);
      if (musicLines && musicLines.setTheme) musicLines.setTheme(th);
    },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      quiet = !!low;
      group.traverse(o => { if (o.name && /sheath/.test(o.name)) o.visible = !low; });
      packets.count = low ? Math.round(curves.length * LINK.PACKETS * 0.4) : curves.length * LINK.PACKETS;
      if (musicLines && musicLines.setQuality) musicLines.setQuality(q);
    },
    dispose() {
      if (musicLines && musicLines.dispose) musicLines.dispose();
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

function parked(group, stats) {
  return { group, stats, update() {}, setTime() {}, setTheme() {}, setQuality() {},
    dispose() { if (group.parent) group.parent.remove(group); } };
}

export default { buildInterlink, LINK };
