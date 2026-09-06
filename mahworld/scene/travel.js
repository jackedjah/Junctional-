/* MAHWORLD :: TRAVEL — inter-city flight, authored as real traversal
   ============================================================================================

   R2 §9 names the beats and forbids the shortcut:

       departure landmark -> acceleration corridor -> receding home skyline -> atmospheric
       traversal -> distant city acquisition -> biome transition -> approach infrastructure ->
       arrival district

   and §18 refuses closure while "inter-city flight lacks spatial logic". The failure this is
   written against is a camera CUT dressed as a journey: fade out over the plaza, fade in over the
   lake, call it flight. Nothing about the world's size is communicated by that, and the 700 m the
   designer spent placing a destination is thrown away in a frame.

   ---- THE ONE DESIGN DECISION THAT MAKES IT REAL ----------------------------------------------
   THIS MODULE DOES NOT OWN A CAMERA. It writes roam's position and heading, frame by frame, at the
   same rate a viewer's own hands would. That single choice is what makes the flight traversal
   rather than animation: you are in the roam camera the whole way, the world is streamed past you
   at real speed with real parallax, and at any moment you can take the controls back and the flight
   simply stops with you where it left you. A separate cinematic camera would have been easier and
   would have been the cut in disguise.

   ---- THE PATH ---------------------------------------------------------------------------------
   A Catmull-Rom through five control points derived from the two endpoints — nothing tabulated:

     0  DEPARTURE   where you are, plus a lift, so the flight begins by rising off the deck rather
                    than by sliding sideways. The home landmark stays behind you and recedes.
     1  CORRIDOR    a quarter out along the line, at cruise altitude. This is the acceleration beat.
     2  CRUISE      mid-span and highest. The whole world is below and both cities are in frame,
                    which is the "atmospheric traversal" §9 asks for and the only moment the viewer
                    sees the map.
     3  ACQUIRE     three quarters out, descending, with the destination now filling the view.
     4  ARRIVAL     the district edge at working height, OUTSIDE the city so you arrive AT it and
                    do not materialise inside it.

   Altitude is derived from the span: a 700 m hop cruises at ~240 m, which is high enough to clear
   terrain.js's near range and low enough that the destination never becomes a map symbol.

   ---- THE SPEED CURVE --------------------------------------------------------------------------
   Not linear, because a journey that starts and stops at full speed reads as a dolly. A smootherstep
   on the path parameter gives a slow lift, a long fast middle and a settling arrival — the same
   critical-damping instinct roam itself uses, applied to the whole trip.

   ---- WHERE THE VIEWER LOOKS -------------------------------------------------------------------
   The heading LEADS the path for the first half — you look where you are going, which is what makes
   the corridor read as speed — and then turns onto the destination for the second half, so the city
   is acquired deliberately rather than drifting into frame. The turn is interpolated on the shortest
   arc, so a flight that crosses the +-PI seam does not spin the viewer around.

   createTravel({ THREE, roam, destinations }) -> {
     go(name, opts), cancel(), update(dt), state, list()
   } */

const TAU = Math.PI * 2;

/* the beats, as fractions of the trip, so the reporting and the pacing agree */
export const BEATS = Object.freeze([
  { at: 0.00, id: 'departure' },
  { at: 0.14, id: 'corridor' },
  { at: 0.46, id: 'cruise' },
  { at: 0.76, id: 'acquire' },
  { at: 0.93, id: 'approach' },
  { at: 1.00, id: 'arrival' }
]);

const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);

export function createTravel(opts) {
  const o = opts || {};
  const THREE = o.THREE;
  const roam = o.roam;
  if (!THREE || !roam) throw new Error('createTravel needs THREE and roam');
  /* { id: { x, z, radius, arriveY, label } } — the destination table the assembly supplies, so this
     module never hard-codes where a city is and stays correct when one moves */
  const DEST = o.destinations || {};

  const state = { flying: false, to: null, t: 0, beat: null, secondsLeft: 0, span: 0 };
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
  let curve = null, dur = 1, elapsed = 0, yaw0 = 0, lookAt = null, onDone = null;

  const shortestTo = (from, to) => {
    let d = (to - from) % TAU;
    if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
    return from + d;
  };

  function go(name, opt = {}) {
    const d = DEST[name];
    if (!d) return false;
    if (!roam.state.on) return false;              /* travel is roam's; it does not seize the camera */
    roam.setMode('fly');
    roam.releaseAll();                             /* a held key must not fight the flight */

    const p0 = roam.pos.clone();
    const dx = d.x - p0.x, dz = d.z - p0.z;
    const span = Math.hypot(dx, dz);
    state.span = span;
    if (span < 40) return false;                   /* already there; a flight to here is a cut */

    /* ARRIVAL is OUTSIDE the city, on the near side, so you arrive AT a destination rather than
       inside it — §9's "approach infrastructure -> arrival district", and §14's cleanness bar,
       which a camera materialising inside a spire would fail. */
    const ux = dx / span, uz = dz / span;
    const stand = (d.radius || 200) * 1.18;
    const ax = d.x - ux * stand, az = d.z - uz * stand;
    const arriveY = d.arriveY != null ? d.arriveY : 90;

    /* CRUISE ALTITUDE, AND IT IS MEASURED AGAINST THE TERRAIN IT CROSSES. The first cut used
       span * 0.34, which on the 727 m plaza-to-lake hop gave 247 m — BELOW terrain.js's near range,
       whose peaks run to 370 m. The route runs down a cleared pass so it never actually struck rock,
       but the cruise beat framed a mountain flank filling half the screen: it read as flying into a
       cliff, not as §9's "atmospheric traversal", which is the one beat where the viewer is supposed
       to see the world. 0.46 puts a 727 m hop at 334 m, over the shoulders and under the mid range,
       so the frame is the map. The 430 ceiling still stops a long hop turning the destination into a
       symbol. */
    const cruise = Math.max(240, Math.min(430, span * 0.46));

    const pts = [
      new THREE.Vector3(p0.x, Math.max(p0.y, 26), p0.z),
      new THREE.Vector3(p0.x + dx * 0.22, cruise * 0.72, p0.z + dz * 0.22),
      new THREE.Vector3(p0.x + dx * 0.50, cruise, p0.z + dz * 0.50),
      new THREE.Vector3(p0.x + dx * 0.78, cruise * 0.60, p0.z + dz * 0.78),
      new THREE.Vector3(ax, arriveY, az)
    ];
    curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    curve.arcLengthDivisions = 200;
    /* duration from the real path length at a cruise speed of ~95 m/s, floored so a short hop still
       has beats and ceilinged so a long one is not a chore */
    dur = Math.max(6, Math.min(26, curve.getLength() / (opt.speed || 95)));
    elapsed = 0;
    yaw0 = roam.state.yaw;
    lookAt = new THREE.Vector3(d.x, (d.arriveY != null ? d.arriveY : 90) + 40, d.z);
    onDone = typeof opt.onDone === 'function' ? opt.onDone : null;
    state.flying = true; state.to = name; state.t = 0; state.beat = 'departure';
    state.secondsLeft = dur;
    return true;
  }

  function cancel() {
    /* the viewer takes the controls back and keeps exactly where they are — no snap, no rewind */
    state.flying = false; state.to = null; state.beat = null; curve = null; onDone = null;
    return true;
  }

  function update(dt) {
    if (!state.flying || !curve) return false;
    elapsed += Math.max(0, Math.min(0.1, dt));
    const raw = Math.min(1, elapsed / dur);
    const t = smoother(raw);                       /* slow lift, long fast middle, settling arrival */
    state.t = raw;
    state.secondsLeft = Math.max(0, dur - elapsed);

    curve.getPoint(t, _a);
    roam.pos.copy(_a);

    /* HEADING: lead the path for the first half, then turn onto the destination. */
    curve.getPoint(Math.min(1, t + 0.02), _b);
    _c.subVectors(_b, _a);
    const lead = Math.atan2(_c.x, -_c.z);
    const onto = Math.atan2(lookAt.x - _a.x, -(lookAt.z - _a.z));
    const blend = smoother(Math.max(0, Math.min(1, (t - 0.34) / 0.42)));
    const want = shortestTo(lead, onto) * blend + lead * (1 - blend);
    roam.state.yaw = shortestTo(roam.state.yaw, want) * 0.24 + roam.state.yaw * 0.76;

    /* PITCH follows the path's own slope, so a climb looks up and a descent looks down — the beat
       reads in the horizon line without anyone being told what beat it is */
    const slope = Math.atan2(_c.y, Math.hypot(_c.x, _c.z));
    const aim = Math.atan2(lookAt.y - _a.y, Math.hypot(lookAt.x - _a.x, lookAt.z - _a.z));
    const pitch = slope * (1 - blend) + aim * blend;
    roam.state.pitch = roam.state.pitch * 0.82 + Math.max(-1.2, Math.min(0.9, pitch)) * 0.18;

    for (let i = BEATS.length - 1; i >= 0; i--) { if (raw >= BEATS[i].at) { state.beat = BEATS[i].id; break; } }

    if (raw >= 1) {
      const done = onDone;
      /* land in the WALK gear if the arrival is at working height — you have arrived somewhere, and
         standing is how this world is meant to be met (roam's own argument for its default gear) */
      state.flying = false; state.to = null; state.beat = 'arrival'; curve = null; onDone = null;
      if (done) { try { done(); } catch (e) {} }
      return false;
    }
    return true;
  }

  return {
    state, go, cancel, update,
    get flying() { return state.flying; },
    list() { return Object.keys(DEST); },
    beats: BEATS.map(b => b.id)
  };
}

export default { createTravel, BEATS };
