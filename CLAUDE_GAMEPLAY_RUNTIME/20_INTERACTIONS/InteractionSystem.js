/* MAHWORLD GAMEPLAY RUNTIME :: CONTEXT INTERACTION SYSTEM + DOOR / BUILDING ENTRY CONTRACT
   Interaction points: { interaction_id, type, position, range_m, requirements, available_actions, prompt, session_handler }.
   Types: DOOR · CLIMB · SWIM · GYM · OUTDOOR_WORKOUT · MENTOR · DUEL · ACTIVITY · RAID · TRANSPORT · FLIGHT_POINT.
   Entering range → INTERACTION_AVAILABLE with a device-neutral prompt ({ label, intent: 'INTERACT', glyph_slot: 'CONFIRM' } — a
   controller-shape glyph is a presentation concern for later, no platform icons here). Requirements are data (form, min_level, unlocks,
   quest_state). INTERACT (from the router) confirms the nearest eligible point and calls its session_handler.
   Door contract: APPROACH → AVAILABLE → CONFIRMED → TRANSITION (loading strategy placeholder, OD-25) → ENTERED → (EXIT). Interior style OD-26. */
export var INTERACTION_TYPES = ['DOOR', 'CLIMB', 'SWIM', 'GYM', 'OUTDOOR_WORKOUT', 'MENTOR', 'DUEL', 'ACTIVITY', 'RAID', 'TRANSPORT', 'FLIGHT_POINT'];
export var DOOR_STATES = ['IDLE', 'APPROACH', 'AVAILABLE', 'CONFIRMED', 'TRANSITION', 'ENTERED', 'EXITING'];

export function createInteractionSystem(world, deps) {
  var d = deps || {}; var cfg = world.cfg; var points = {}; var S = { inRange: {}, nearest: null, prompt: null, lastSession: null };
  function dist(a, b) { var dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }
  function eligible(pt, player) {
    var r = pt.requirements || {}; var why = [];
    if (r.form && r.form !== 'ANY' && player.form !== r.form) why.push('REQUIRES_' + r.form);
    if (r.min_level && (player.level || 1) < r.min_level) why.push('LEVEL_' + r.min_level);
    (r.unlocks || []).forEach(function (u) { if ((player.unlocks || []).indexOf(u) < 0) why.push('UNLOCK_' + u); });
    if (r.quest_completed && (player.mentor_completed || []).indexOf(r.quest_completed) < 0) why.push('QUEST_' + r.quest_completed);
    if (r.not_in_combat && player.in_combat) why.push('IN_COMBAT');
    if (r.grounded && player.altitude_m > 0.05) why.push('MUST_BE_GROUNDED');
    return { ok: !why.length, why: why };
  }
  return {
    types: INTERACTION_TYPES.slice(),
    register: function (pt) { ['interaction_id', 'type', 'position'].forEach(function (k) { if (!(k in pt)) throw new Error('interaction point missing ' + k); }); if (INTERACTION_TYPES.indexOf(pt.type) < 0) throw new Error('unknown interaction type ' + pt.type); points[pt.interaction_id] = Object.assign({ range_m: cfg.dev('interaction.default_range_m'), requirements: {}, available_actions: ['INTERACT'], prompt: pt.type + ' — ' + pt.interaction_id, session_handler: null }, pt); return points[pt.interaction_id]; },
    unregister: function (id) { delete points[id]; delete S.inRange[id]; },
    points: function () { return Object.keys(points).map(function (k) { return points[k]; }); }, get: function (id) { return points[id] || null; },
    /* per tick: range detection + prompt */
    tick: function (player) {
      var best = null;
      Object.keys(points).forEach(function (id) { var pt = points[id]; var inr = dist(player.position, pt.position) <= pt.range_m; if (inr && !S.inRange[id]) { S.inRange[id] = true; world.bus.emit('INTERACTION_RANGE_ENTER', { interaction_id: id, type: pt.type }); } else if (!inr && S.inRange[id]) { delete S.inRange[id]; world.bus.emit('INTERACTION_RANGE_EXIT', { interaction_id: id, type: pt.type }); } if (inr) { var e = eligible(pt, player); var cand = { point: pt, eligible: e, distance: dist(player.position, pt.position) }; if (!best || cand.distance < best.distance) best = cand; } });
      var prevId = S.nearest ? S.nearest.point.interaction_id : null; S.nearest = best;
      S.prompt = best ? { interaction_id: best.point.interaction_id, type: best.point.type, label: best.point.prompt, intent: 'INTERACT', glyph_slot: 'CONFIRM', eligible: best.eligible.ok, blocked_by: best.eligible.why, available_actions: best.point.available_actions.slice() } : null;
      if (best && best.point.interaction_id !== prevId) world.bus.emit('INTERACTION_AVAILABLE', S.prompt); if (!best && prevId) world.bus.emit('INTERACTION_PROMPT_CLEARED', { interaction_id: prevId });
      return S.prompt;
    },
    prompt: function () { return S.prompt; },
    /* INTERACT: confirm the nearest eligible point; the session handler owns what happens next (door transition, climb hooks, duel, …) */
    interact: function (player, ctx) { var n = S.nearest; if (!n) return { ok: false, reason: 'NO_INTERACTION_IN_RANGE' }; if (!n.eligible.ok) { world.bus.emit('INTERACTION_REFUSED', { interaction_id: n.point.interaction_id, why: n.eligible.why }); return { ok: false, reason: 'NOT_ELIGIBLE', why: n.eligible.why, interaction_id: n.point.interaction_id }; } world.bus.emit('INTERACTION_CONFIRMED', { interaction_id: n.point.interaction_id, type: n.point.type }); var res = n.point.session_handler ? n.point.session_handler(n.point, player, ctx || {}) : { ok: true, session: null, note: 'no session handler' }; S.lastSession = { interaction_id: n.point.interaction_id, result: res }; return Object.assign({ ok: true, interaction_id: n.point.interaction_id, type: n.point.type }, res); },
    lastSession: function () { return S.lastSession; }, eligible: eligible
  };
}

export function createDoorTransition(world, deps) {
  var d = deps || {}; var cfg = world.cfg; var S = { state: 'IDLE', door: null, t: 0, interior: null, log: [] };
  var loading = d.loadingStrategy || { id: 'PLACEHOLDER_INSTANT', classification: 'OPEN_DECISION OD-25 (loading / streaming architecture)', load: function (door) { return { interior_id: door.interior_id || (door.interaction_id + '_INTERIOR'), loaded: 'PLACEHOLDER' }; } };
  var style = d.transitionStyle || { id: 'PLACEHOLDER_FADE', classification: 'OPEN_DECISION OD-26 (interior transition style)' };
  function go(s, why) { S.state = s; S.log.push(s); world.bus.emit('DOOR_STATE', { door: S.door ? S.door.interaction_id : null, state: s, why: why || null }); }
  return {
    states: DOOR_STATES.slice(), state: function () { return { state: S.state, door: S.door ? S.door.interaction_id : null, interior: S.interior, loading_strategy: loading.id, transition_style: style.id, log: S.log.slice() }; },
    approach: function (door) { S.door = door; go('APPROACH', 'in range'); go('AVAILABLE', 'prompt shown'); return { ok: true }; },
    confirm: function () { if (S.state !== 'AVAILABLE') return { ok: false, reason: 'NOT_AVAILABLE', state: S.state }; go('CONFIRMED', 'player confirmed'); S.t = 0; go('TRANSITION', style.id); S.interior = loading.load(S.door); world.bus.emit('DOOR_TRANSITION_BEGIN', { door: S.door.interaction_id, interior: S.interior, loading_strategy: loading.id, transition_style: style.id }); return { ok: true, interior: S.interior }; },
    tick: function (dt) { if (S.state === 'TRANSITION') { S.t += dt; if (S.t >= cfg.dev('interaction.door_transition_s')) { go('ENTERED', 'interior ready'); world.bus.emit('BUILDING_ENTERED', { door: S.door.interaction_id, interior: S.interior }); } } if (S.state === 'EXITING') { S.t += dt; if (S.t >= cfg.dev('interaction.door_transition_s')) { go('IDLE', 'back outside'); S.door = null; S.interior = null; } } return S.state; },
    exit: function () { if (S.state !== 'ENTERED') return { ok: false, reason: 'NOT_INSIDE' }; S.t = 0; go('EXITING', 'leave interior'); return { ok: true }; },
    cancel: function () { if (S.state === 'AVAILABLE' || S.state === 'APPROACH') { go('IDLE', 'left range'); S.door = null; return { ok: true }; } return { ok: false, reason: 'CANNOT_CANCEL_IN_' + S.state }; }
  };
}

/* standard session handlers for the runtime systems (data points bind to these by type). Each dependency may be a function
   (pt, player, ctx) → result, or an object exposing the named method (sandbox objects: mentor.accept, duelZone.enter, …). */
function call(dep, method, pt, player, ctx, missing) { if (!dep) return { ok: false, reason: missing }; if (typeof dep === 'function') return dep(pt, player, ctx); if (typeof dep[method] !== 'function') return { ok: false, reason: missing }; return dep[method](pt, player, ctx); }
export function standardHandlers(world, deps) {
  var d = deps || {};
  return {
    DOOR: function (pt, player, ctx) { var door = d.door; if (!door) return { ok: false, reason: 'NO_DOOR_TRANSITION' }; if (door.state().state !== 'AVAILABLE') door.approach(pt); return door.confirm(); },
    CLIMB: function (pt, player, ctx) { var climb = d.climb; if (!climb) return { ok: false, reason: 'NO_CLIMB_HOOKS' }; var r = climb.enter(pt.interaction_id); return Object.assign({ session: 'CLIMB' }, r); },
    MENTOR: function (pt, player, ctx) { return call(d.mentor, 'accept', pt, player, ctx, 'NO_MENTOR_HANDLER'); },
    DUEL: function (pt, player, ctx) { return call(d.duel, 'enter', pt, player, ctx, 'NO_DUEL_HANDLER'); },
    ACTIVITY: function (pt, player, ctx) { return call(d.activity, 'join', pt, player, ctx, 'NO_ACTIVITY_HANDLER'); },
    GYM: function (pt, player, ctx) { return call(d.activity, 'join', Object.assign({}, pt, { activity_type: 'GYM_WORKOUT' }), player, ctx, 'NO_ACTIVITY_HANDLER'); },
    OUTDOOR_WORKOUT: function (pt, player, ctx) { return call(d.activity, 'join', Object.assign({}, pt, { activity_type: 'OUTDOOR_WORKOUT' }), player, ctx, 'NO_ACTIVITY_HANDLER'); },
    SWIM: function (pt, player, ctx) { return { ok: false, reason: 'SWIM_OPEN_DECISION_OD-09', session: null }; },
    RAID: function (pt, player, ctx) { return call(d.raid, 'form', pt, player, ctx, 'NO_RAID_HANDLER'); },
    TRANSPORT: function (pt, player, ctx) { return { ok: true, session: 'TRANSPORT_PLACEHOLDER', destination: pt.destination || null, classification: 'OPEN_DECISION OD-27 (world travel UX)' }; },
    FLIGHT_POINT: function (pt, player, ctx) { return d.flight ? d.flight.enterFlight() : { ok: false, reason: 'NO_FLIGHT_CONTROLS' }; }
  };
}
