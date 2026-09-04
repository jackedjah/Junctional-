/* MR.MAH 3D :: STATES
   The behaviour layer.

   Page logic asks for a STATE; this decides what the body does. Nothing here
   knows that AI Chat or MAH Protocol exist, and nothing here reaches out to a
   page — a surface calls `setState('thinking')` and that is the entire
   coupling. That keeps one canonical character able to serve every surface
   without either page owning a piece of him.

   States are intentionally declarative: each is a small set of targets, and
   the runtime eases toward whatever the current state asks for. Adding
   'celebrating' later means adding a row, not writing another animation
   system. */

export var STATES = {
  /* the resting reference pose */
  idle:        { glow: 1.00, bob: 1.00, sway: 1.00, headTilt: 0.00, armLift: 0.00, pulse: 0.00, blinkRate: 1.00, smile: 1.00 },
  /* attentive, leaning in slightly, calmer motion */
  listening:   { glow: 1.06, bob: 0.70, sway: 0.55, headTilt: 0.10, armLift: 0.04, pulse: 0.00, blinkRate: 1.40, smile: 1.00 },
  /* working: brighter, slower bob, a visible periodic pulse */
  thinking:    { glow: 1.14, bob: 0.55, sway: 0.35, headTilt: -0.12, armLift: 0.02, pulse: 1.00, blinkRate: 0.55, smile: 0.55 },
  /* presenting an answer: raised hand emphasised, lively */
  explaining:  { glow: 1.10, bob: 1.15, sway: 1.35, headTilt: 0.05, armLift: 0.16, pulse: 0.22, blinkRate: 1.00, smile: 1.00 },
  /* success: brightest, buoyant */
  success:     { glow: 1.30, bob: 1.60, sway: 1.10, headTilt: 0.14, armLift: 0.30, pulse: 0.35, blinkRate: 1.20, smile: 1.30 },
  /* concern: dimmer, lower, head down, smile flattened */
  concerned:   { glow: 0.80, bob: 0.55, sway: 0.45, headTilt: -0.20, armLift: -0.06, pulse: 0.00, blinkRate: 1.80, smile: 0.25 },
  /* momentary reactions — the runtime returns to the previous state */
  tapped:      { glow: 1.40, bob: 1.30, sway: 0.80, headTilt: 0.08, armLift: 0.12, pulse: 0.60, blinkRate: 2.20, smile: 1.25, transient: 0.7 },
  dragging:    { glow: 1.12, bob: 0.20, sway: 0.00, headTilt: 0.00, armLift: 0.05, pulse: 0.10, blinkRate: 1.00, smile: 1.05 }
};

export var STATE_NAMES = Object.keys(STATES);

export function createStateMachine(options) {
  var opts = options || {};
  var current = 'idle';
  var previous = 'idle';
  var transientLeft = 0;

  /* Live values, eased toward the target each frame so a state change is a
     transition rather than a snap. */
  var live = {};
  Object.keys(STATES.idle).forEach(function (k) {
    if (k !== 'transient') live[k] = STATES.idle[k];
  });

  function targetsFor(name) { return STATES[name] || STATES.idle; }

  function set(name) {
    if (!STATES[name] || name === current) return current;
    var spec = STATES[name];
    if (spec.transient) {
      /* Don't stack transients — a second tap restarts the same reaction
         rather than nesting and losing the state to return to. */
      if (!STATES[current].transient) previous = current;
      transientLeft = spec.transient;
    } else {
      previous = current;
      transientLeft = 0;
    }
    current = name;
    if (opts.onChange) opts.onChange(current, previous);
    return current;
  }

  function update(dt) {
    if (transientLeft > 0) {
      transientLeft -= dt;
      if (transientLeft <= 0) { transientLeft = 0; set(previous); }
    }
    var t = targetsFor(current);
    /* Critically-damped-ish approach. Frame-rate independent so a 30fps
       device eases at the same speed a 60fps one does. */
    var k = 1 - Math.exp(-dt * 6.5);
    Object.keys(live).forEach(function (key) {
      var want = t[key] == null ? STATES.idle[key] : t[key];
      live[key] += (want - live[key]) * k;
    });
    return live;
  }

  return {
    set: set,
    update: update,
    values: live,
    get: function () { return current; },
    previous: function () { return previous; },
    names: STATE_NAMES
  };
}
