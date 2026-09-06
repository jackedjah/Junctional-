/* MAHWORLD :: ROAM — the viewer moves the camera
   ============================================================================================

   Until now MAHWORLD has been a set of composed photographs. VIEWS holds nine anchors; drag turns
   the look direction inside +-1.1 rad of the anchor's own axis, and `dolly` slides up to 40 m along
   whatever you are looking at. That is a tripod with a rail, and it has one property that makes it
   feel like a photograph rather than a place: the dolly is measured FROM THE ANCHOR, so the moment
   you turn, your position re-projects and you slide back. You cannot walk somewhere and look around
   from where you arrived.

   This module is the other thing. It owns a camera POSITION that persists across turns, and it
   hands the viewer the two gears the world actually needs.

   ---- WHY TWO GEARS, AND WHY WALKING IS THE DEFAULT --------------------------------------------
   MAHWORLD's scale is its whole argument. The monument is 43.9 m to the diamond's apex, MAH MATCH
   is a 38 m mass, the megatalls run past 400 m. None of that is legible from a free-flying camera,
   because a flying camera has no reference height — everything is just "some size" at "some
   distance". A viewer standing at 1.70 m on a black mirror deck, looking up at two 27 m figures,
   gets the scale in one second and keeps it.

   But the world's best content is not at eye level. The sky roads are at 54-298 m, the monument's
   light column runs to 200 m, the FOBEAM ascent lines to 604 m. A walker can never see any of it
   properly. So flight exists, deliberately, as a SECOND gear you shift into — not as the default
   that quietly throws away the scale the ground gear buys.

   ---- WHAT IS ACTUALLY UNDERFOOT (measured, not assumed) --------------------------------------
   ground.js: FLOOR_TOP = 0.17 is the deck, FIELD_RADIUS = 43 is the satin field that carries it out
   to the aprons. Outside that there is a ground plane at y = 0 and no height field at all —
   terrain.js's ranges start at 700 m and its land ring is LAND_INNER 600 to LAND_OUTER 2600, all of
   it scenic. So the walkable surface is genuinely two flat values, and a per-frame downward raycast
   against a 450-mesh scene would be paying a real cost to rediscover a constant. The walker uses
   the constant, and climbs onto the low furniture through the collider set instead (below).

   ---- COLLISION: WHY THE EXISTING RESOLVER CANNOT BE REUSED -----------------------------------
   mahplaza.js's dolly camera resolves a collision by stepping FORWARD ALONG THE VIEW until it is
   outside the box, and then writing that displacement back into `state.dolly`. For a rail camera
   that is fine: forward is the only axis it has. For a walker it is exactly wrong — walking into
   the side of MAH GYM would shove you INTO the building, because forward is where the building is.
   And input state being rewritten by collision means the viewer's own controls fight them.

   This resolves per axis instead: apply the X displacement, push out of anything it entered along X
   ONLY, then do the same for Z. Sliding along a wall then falls out of the arithmetic for free —
   the blocked axis is cancelled and the free one survives — with no dot products and no allocation.
   The walker is a circle of radius BODY_R against the boxes' XZ rectangles.

   ---- WHAT THE COLLIDER SET DOES AND DOES NOT COVER (stated, not glossed) ---------------------
   54 boxes, and only four modules push any: ground.js (10 — the v6b centrepiece and 9 floor
   shards), plaza-dressing.js (31 — masts, benches, shelters, blades, plinths), buildings.js (12 —
   the three destinations' real masses) and monument.js (1). Everything else in the world is
   WALK-THROUGH, and the list is worth writing down because it is long: city.js registers nothing,
   so all 15 midground blocks and 23 background towers are air; fobeam.js registers nothing, so its
   three ascent launch pads are air; terrain.js registers nothing, so the mountains and the water
   basin are air; match-interior.js registers nothing; residents.js puts a dozen figures on the deck
   that a walker passes straight through.

   That is not this module's bug to fix by inventing geometry it cannot see, and it will not pretend
   otherwise. What it does instead is BOUND the walker to the region the collider set actually
   describes — WALK_R, a little past the plaza field — so the ground gear stays honest, and put
   everything beyond it in the flight gear where clipping through a distant tower is the expected
   behaviour of a free camera rather than a broken floor. The bound is a design decision made from a
   measurement, and when city.js gains colliders it should be raised.

   ---- THE CONTRACT ----------------------------------------------------------------------------
   createRoam({ THREE, boxes, onChange }) -> {
     state,                    live, readable: { on, mode, x, y, z, yaw, pitch, speed }
     setEnabled(on, seed),     seed = { pos:Vector3, dir:Vector3 } so entering roam never jumps
     setMode('walk'|'fly'),
     look(dYaw, dPitch),       radians, from a drag
     setStick(x, y),           -1..1, from a touch stick or a keyboard
     setVertical(v),           -1..1, fly only
     setSprint(on),
     key(event, down),         returns true if it consumed the key
     step(dt),                 integrate; returns true if anything moved
     applyTo(camera),          write position + orientation
     dispose()
   }
   It creates no scene objects, adds nothing to the graph, and allocates nothing per frame. */

const DEG = Math.PI / 180;

/* Every number here is measured or argued, none are taste.
     EYE          1.70 m — a standing MAHBEING's eye on a 2.0 m frame is 1.60-1.75; this is the
                  height residents.js's own figures look from, so the viewer is one of them.
     DECK_Y/R     ground.js FLOOR_TOP and FIELD_RADIUS exactly. DECK_R is padded by APRON because
                  the satin field's own edge is soft and stepping off it should not be a cliff.
     WALK/RUN     4.2 m/s is a brisk walk; 11.0 is a run. The plaza is 86 m across, so a walk
                  crosses it in 20 s and a run in 8 — fast enough not to be tedious, slow enough
                  that the 27 m monument still grows as you approach it.
     FLY/BOOST    22 / 70 m/s. At 70 the 560 m world radius is 8 s away, which is the right order
                  for getting to a sky road at 298 m without a loading screen.
     TAU_*        velocity time constants: the camera has weight (the assembly's own brief §37).
                  0.14 s on the ground reads as a body; 0.40 s in the air reads as a craft.
     BODY_R       0.45 m. The narrowest gap the walker must fit is between two bench colliders on
                  the approach; 0.45 clears them and still stops a shoulder passing through a mast.
     STEP_UP      0.62 m. Benches top out at 0.97 and the planted plinths at 0.77 — both are
                  climbable from the deck at 0.17; the 6.77 m lamp masts and the 37.5 m monument
                  box are not, and become walls. One constant separates furniture from architecture.
     WALK_R       95 m, and it is measured rather than picked: city.js registers no colliders, and
                  its NEAREST midground block is F1 at (-108, -22), r = 110. 95 keeps a 13 m margin,
                  so a walker can never reach a mass it would walk straight through — while still
                  covering every composed camera in VIEWS (the establishing eye is 84 m out), which
                  matters because entering roam from a view outside this bound would otherwise yank
                  the viewer sideways on the first frame. The first cut used 52 and did exactly that.
     WORLD_R      1000 m. It was 560 while the plaza was the only destination; R2 §5 put LAKE CITY
                  at r 700 in terrain.js's mountain pass, and a bound that stops short of a
                  destination is a bound that makes the world smaller than it is. 1000 clears the
                  city's far shore (700 + 274) with margin and still stops well inside the near
                  range, so a flyer never crosses a mountain and never reaches the land ring's inner
                  edge at LAND_INNER 600 in a direction where that ring is the only thing left.
     CEIL         700 m — above the highest sky road (298.5) and the monument's column top (200),
                  below the point where the world is only sky. */
export const ROAM = Object.freeze({
  EYE: 1.70, DECK_Y: 0.17, DECK_R: 43, APRON: 3.0,
  WALK: 4.2, RUN: 11.0, FLY: 22.0, BOOST: 70.0,
  TAU_GROUND: 0.14, TAU_AIR: 0.40,
  BODY_R: 0.45, STEP_UP: 0.62,
  WALK_R: 95, WORLD_R: 1000, FLOOR: 0.90, CEIL: 700,
  PITCH_MAX: 82 * DEG,
  LOOK_DRAG: 2.6,          /* radians per full screen width of drag */
  KEY_LOOK: 1.9            /* radians per second on the arrow keys */
});

/* the keys roam claims. mahplaza.js's own keydown handler owns W/A/S/D and the arrows for the rail
   camera and Escape for select/practice; roam takes the movement keys ONLY while it is enabled, and
   never takes Escape, so the existing exits keep working exactly as they did. */
const MOVE_KEYS = {
  w: [0, 1], W: [0, 1], ArrowUp: [0, 1],
  s: [0, -1], S: [0, -1], ArrowDown: [0, -1],
  a: [-1, 0], A: [-1, 0], ArrowLeft: [-1, 0],
  d: [1, 0], D: [1, 0], ArrowRight: [1, 0]
};

export function createRoam(opts) {
  const o = opts || {};
  const THREE = o.THREE;
  if (!THREE) throw new Error('createRoam needs THREE');
  const onChange = typeof o.onChange === 'function' ? o.onChange : () => {};
  /* the world-space Box3 list the assembly already builds from ctx.colliders. Held by reference, so
     a module that disposes and re-registers is picked up without rebuilding this controller. */
  let boxes = o.boxes || [];

  const state = { on: false, mode: 'walk', x: 0, y: ROAM.DECK_Y + ROAM.EYE, z: 24, yaw: 0, pitch: 0, speed: 0 };
  const pos = new THREE.Vector3(0, ROAM.DECK_Y + ROAM.EYE, 24);
  const vel = new THREE.Vector3();
  const stick = { x: 0, y: 0 };          /* -1..1 strafe / forward */
  const held = new Set();
  let vertical = 0, sprint = false, dirty = true;

  /* scratch — allocated once, per the module contract's no-allocation-per-frame rule */
  const _dir = new THREE.Vector3(), _right = new THREE.Vector3(), _want = new THREE.Vector3(),
    _look = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

  /* ---- the surface underfoot ----------------------------------------------------------------- */
  /* The base is the two measured constants. On top of that, any collider whose TABLE is within one
     step of the current foot becomes the floor — which is what turns benches and planted plinths
     into things you climb onto rather than things you bump into, using the same list that stops you
     walking through a lamp mast. No new geometry, no raycast. */
  const baseY = (x, z) => (Math.hypot(x, z) <= ROAM.DECK_R + ROAM.APRON ? ROAM.DECK_Y : 0);
  function floorAt(x, z, footY) {
    let y = baseY(x, z);
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.max.y > footY + ROAM.STEP_UP || b.max.y <= y) continue;      /* a wall, or lower than we stand */
      if (x < b.min.x - ROAM.BODY_R || x > b.max.x + ROAM.BODY_R) continue;
      if (z < b.min.z - ROAM.BODY_R || z > b.max.z + ROAM.BODY_R) continue;
      y = b.max.y;
    }
    return y;
  }

  /* ---- collide and slide, one axis at a time --------------------------------------------------
     `axis` is 0 for X and 2 for Z. A box counts only if it is a WALL at this foot height (its table
     is more than one step up) and if our vertical span actually overlaps it — so you can walk under
     a bridge deck, and the monument's 37.5 m box does not stop you when you are flying over it. */
  function resolveAxis(axis, footY) {
    const eyeY = pos.y, headY = eyeY + 0.15;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.max.y <= footY + ROAM.STEP_UP) continue;                     /* steppable, not a wall */
      if (b.max.y < footY || b.min.y > headY) continue;                  /* not in our vertical span */
      const cx = Math.max(b.min.x, Math.min(pos.x, b.max.x));
      const cz = Math.max(b.min.z, Math.min(pos.z, b.max.z));
      const dx = pos.x - cx, dz = pos.z - cz;
      if (dx * dx + dz * dz >= ROAM.BODY_R * ROAM.BODY_R) continue;
      /* inside. Push straight back out along the axis we just moved on, to the nearer face. */
      if (axis === 0) {
        const toMin = b.min.x - ROAM.BODY_R, toMax = b.max.x + ROAM.BODY_R;
        pos.x = (Math.abs(pos.x - toMin) <= Math.abs(pos.x - toMax)) ? toMin : toMax;
        vel.x = 0;
      } else {
        const toMin = b.min.z - ROAM.BODY_R, toMax = b.max.z + ROAM.BODY_R;
        pos.z = (Math.abs(pos.z - toMin) <= Math.abs(pos.z - toMax)) ? toMin : toMax;
        vel.z = 0;
      }
    }
  }

  /* ---- integrate ------------------------------------------------------------------------------ */
  function step(dt) {
    if (!state.on) return false;
    if (!(dt > 0)) dt = 0;
    if (dt > 0.1) dt = 0.1;                 /* a backgrounded tab must not teleport the viewer */

    /* keyboard folds into the same stick the touch control writes, so there is ONE input path */
    let kx = 0, ky = 0;
    for (const k of held) { const m = MOVE_KEYS[k]; if (m) { kx += m[0]; ky += m[1]; } }
    let sx = stick.x + kx, sy = stick.y + ky;
    const mag = Math.hypot(sx, sy);
    if (mag > 1) { sx /= mag; sy /= mag; }

    const fly = state.mode === 'fly';
    const top = fly ? (sprint ? ROAM.BOOST : ROAM.FLY) : (sprint ? ROAM.RUN : ROAM.WALK);
    const tau = fly ? ROAM.TAU_AIR : ROAM.TAU_GROUND;

    /* heading basis. In WALK the forward axis is flattened, so looking at your feet does not drive
       you into the floor; in FLY it is the true view ray, which is what makes a free camera feel
       like one — you go where you point. */
    const cy = Math.cos(state.yaw), sy2 = Math.sin(state.yaw), cp = Math.cos(state.pitch);
    _dir.set(sy2 * (fly ? cp : 1), fly ? Math.sin(state.pitch) : 0, -cy * (fly ? cp : 1));
    if (_dir.lengthSq() < 1e-9) _dir.set(0, 0, -1); else _dir.normalize();
    _right.set(cy, 0, sy2);                 /* always level: a rolled strafe is a bug, not a feature */

    _want.set(0, 0, 0).addScaledVector(_dir, sy).addScaledVector(_right, sx);
    if (fly && vertical) _want.y += vertical;
    if (_want.lengthSq() > 1) _want.normalize();
    _want.multiplyScalar(top);

    /* critical damping toward the wanted velocity — the assembly's §37 "the camera has weight" */
    const k = 1 - Math.exp(-dt / tau);
    vel.x += (_want.x - vel.x) * k;
    vel.y += ((fly ? _want.y : 0) - vel.y) * k;
    vel.z += (_want.z - vel.z) * k;

    /* THE EARLY-OUT MUST ALSO KNOW ABOUT THE FALL. Velocity and input are not the only reasons the
       camera is still moving: a walker handed an eye above the surface (entering roam from a 3.4 m
       composed view, or stepping off a bench) is settling downward with vel.y pinned at 0, so an
       early-out keyed on velocity alone stopped the descent after ONE frame and left the viewer
       hovering. Measured: the eye stuck at 2.73 m instead of reaching 1.87 m. */
    const settling = state.mode === 'walk'
      && Math.abs(pos.y - (floorAt(pos.x, pos.z, pos.y - ROAM.EYE) + ROAM.EYE)) > 0.005;
    const moved = vel.lengthSq() > 1e-6;
    if (!moved && !dirty && !settling) { state.speed = 0; return false; }

    const footY = pos.y - ROAM.EYE;
    /* X then Z, each resolved on its own axis: this is what makes a wall slide instead of a stop */
    pos.x += vel.x * dt; if (!fly) resolveAxis(0, footY);
    pos.z += vel.z * dt; if (!fly) resolveAxis(2, footY);

    if (fly) {
      pos.y += vel.y * dt;
      if (pos.y < ROAM.FLOOR) { pos.y = ROAM.FLOOR; vel.y = 0; }
      if (pos.y > ROAM.CEIL) { pos.y = ROAM.CEIL; vel.y = 0; }
      const r = Math.hypot(pos.x, pos.z);
      if (r > ROAM.WORLD_R) { const s = ROAM.WORLD_R / r; pos.x *= s; pos.z *= s; vel.x = vel.z = 0; }
    } else {
      /* the ground gear stops where the collider set stops describing the world (see the header).
         Only the OUTWARD component of the velocity is killed, never the whole vector: zeroing both
         axes pins the walker to the boundary circle and they cannot walk back in, which is what the
         first cut did and what made the bound feel like a bug instead of an edge. */
      const r = Math.hypot(pos.x, pos.z);
      if (r > ROAM.WALK_R) {
        const s = ROAM.WALK_R / r;
        pos.x *= s; pos.z *= s;
        const nx = pos.x / ROAM.WALK_R, nz = pos.z / ROAM.WALK_R, out = vel.x * nx + vel.z * nz;
        if (out > 0) { vel.x -= out * nx; vel.z -= out * nz; }
      }
      /* re-read the surface AFTER moving, then rise or fall onto it. The fall is damped so stepping
         off a bench is a step down rather than a snap; the rise is immediate so a kerb never trips. */
      const g = floorAt(pos.x, pos.z, pos.y - ROAM.EYE) + ROAM.EYE;
      pos.y = g > pos.y ? g : pos.y + (g - pos.y) * (1 - Math.exp(-dt / 0.10));
      vel.y = 0;
    }

    state.x = pos.x; state.y = pos.y; state.z = pos.z;
    state.speed = Math.hypot(vel.x, vel.y, vel.z);
    dirty = false;
    onChange(state);
    return true;
  }

  /* ---- write the camera ------------------------------------------------------------------------
     Orientation goes through lookAt for one reason: it is what placeCamera() already does, so the
     mirror pass, the pick ray and the fog all see a camera built the same way whichever mode is on.
     camera.up stays (0,1,0), which the planar mirror assumes. */
  function applyTo(camera) {
    const cp = Math.cos(state.pitch);
    _look.set(pos.x + Math.sin(state.yaw) * cp, pos.y + Math.sin(state.pitch), pos.z - Math.cos(state.yaw) * cp);
    camera.position.copy(pos);
    camera.lookAt(_look);
  }

  return {
    state,
    get pos() { return pos; },
    setBoxes(b) { boxes = b || []; },
    setEnabled(on, seed) {
      on = !!on;
      if (on === state.on) return state.on;
      state.on = on;
      vel.set(0, 0, 0); stick.x = stick.y = 0; vertical = 0; sprint = false; held.clear();
      if (on) {
        /* seed from wherever the camera already is, so entering roam is a handover and not a cut */
        if (seed && seed.pos) pos.copy(seed.pos);
        if (seed && seed.dir) {
          const d = seed.dir;
          state.yaw = Math.atan2(d.x, -d.z);
          state.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
        }
        state.pitch = Math.max(-ROAM.PITCH_MAX, Math.min(ROAM.PITCH_MAX, state.pitch));
        /* land on the surface rather than in it, if we were handed an eye below one */
        if (state.mode === 'walk') pos.y = Math.max(pos.y, floorAt(pos.x, pos.z, pos.y - ROAM.EYE) + ROAM.EYE);
        state.x = pos.x; state.y = pos.y; state.z = pos.z;
      }
      dirty = true; onChange(state);
      return state.on;
    },
    setMode(m) {
      const next = m === 'fly' ? 'fly' : 'walk';
      if (next === state.mode) return state.mode;
      state.mode = next; vel.set(0, 0, 0); vertical = 0; dirty = true;
      if (next === 'walk') pos.y = floorAt(pos.x, pos.z, pos.y - ROAM.EYE) + ROAM.EYE;
      onChange(state);
      return state.mode;
    },
    look(dYaw, dPitch) {
      state.yaw += dYaw || 0;
      /* keep yaw in (-PI, PI] so the reported number stays readable; the camera itself does not care */
      if (state.yaw > Math.PI) state.yaw -= 2 * Math.PI; else if (state.yaw < -Math.PI) state.yaw += 2 * Math.PI;
      state.pitch = Math.max(-ROAM.PITCH_MAX, Math.min(ROAM.PITCH_MAX, state.pitch + (dPitch || 0)));
      dirty = true;
    },
    setStick(x, y) { stick.x = Math.max(-1, Math.min(1, x || 0)); stick.y = Math.max(-1, Math.min(1, y || 0)); dirty = true; },
    setVertical(v) { vertical = Math.max(-1, Math.min(1, v || 0)); dirty = true; },
    setSprint(on) { sprint = !!on; dirty = true; },
    /* returns true when roam consumed the key, so the assembly's own handler can bail out */
    key(k, down) {
      if (!state.on) return false;
      if (MOVE_KEYS[k]) { if (down) held.add(k); else held.delete(k); dirty = true; return true; }
      if (k === 'Shift') { sprint = !!down; return true; }
      if (state.mode === 'fly' && (k === ' ' || k === 'e' || k === 'E')) { vertical = down ? 1 : 0; dirty = true; return true; }
      if (state.mode === 'fly' && (k === 'q' || k === 'Q')) { vertical = down ? -1 : 0; dirty = true; return true; }
      return false;
    },
    /* a key held when the window loses focus never sends its keyup, and the viewer comes back to a
       camera walking into a wall on its own. Every blur calls this. */
    releaseAll() { held.clear(); stick.x = stick.y = 0; vertical = 0; sprint = false; vel.set(0, 0, 0); dirty = true; },
    step, applyTo,
    dispose() { held.clear(); boxes = []; state.on = false; }
  };
}

export default { createRoam, ROAM };
