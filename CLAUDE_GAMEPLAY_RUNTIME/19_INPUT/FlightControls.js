/* MAHWORLD GAMEPLAY RUNTIME :: FLIGHT CONTROL CONTRACT — flight stays an obvious dedicated action.
   ENTER_FLIGHT · EXIT_FLIGHT · ASCEND · DESCEND · FORWARD · BACKWARD · STRAFE, all routed to the EXISTING flight session / movement rules
   (form travel ceilings, combat override, energy drain, forced descent, hover fallback). Nothing here rewrites those rules.

       var fc = createFlightControls(world, { movement }); fc.enterFlight(); fc.ascend(); fc.move('FORWARD'); fc.exitFlight(); fc.state() */
export function createFlightControls(world, deps) {
  var mv = deps.movement; var cap = world.capabilities, fl = world.flight, loco = world.loco; var S = { inFlight: false, lastMove: null };
  function ceiling() { return cap.getFlightCeiling(loco.form(), { combat: fl.state().mode === 'COMBAT' }); }   /* combat context is owned by the flight session (set by the duel / combat lock) */
  return {
    enterFlight: function () { if (S.inFlight) return { ok: false, reason: 'ALREADY_IN_FLIGHT' }; var r = fl.requestAltitude(loco.form(), ceiling()); if (!r.ok) return Object.assign({ ok: false }, r); S.inFlight = true; world.bus.emit('FLIGHT_ENTER', { form: loco.form(), ceiling_m: ceiling(), mode: fl.state().mode }); return { ok: true, ceiling_m: ceiling(), mode: fl.state().mode }; },
    exitFlight: function () { if (!S.inFlight) return { ok: false, reason: 'NOT_IN_FLIGHT' }; fl.land(); S.inFlight = false; world.bus.emit('FLIGHT_EXIT', { form: loco.form() }); return { ok: true }; },
    ascend: function () { var r = fl.requestAltitude(loco.form(), ceiling()); if (r.ok) S.inFlight = true; return r; },
    descend: function () { return fl.requestAltitude(loco.form(), 0); },
    move: function (dir, run) { var v = { FORWARD: { forward: 1, strafe: 0 }, BACKWARD: { forward: -1, strafe: 0 }, STRAFE_LEFT: { forward: 0, strafe: -1 }, STRAFE_RIGHT: { forward: 0, strafe: 1 }, STOP: { forward: 0, strafe: 0 } }[dir]; if (!v) return { ok: false, reason: 'BAD_DIRECTION' }; S.lastMove = dir; if (mv) mv.setInput(Object.assign({ run: !!run }, v)); return { ok: true, direction: dir }; },
    tick: function () { var st = fl.state(); if (S.inFlight && st.state === 'GROUNDED') { S.inFlight = false; world.bus.emit('FLIGHT_EXIT', { form: loco.form(), why: 'grounded (energy / descent)' }); } },
    state: function () { var st = fl.state(); return { in_flight: S.inFlight, altitude_m: st.altitude_m, ceiling_m: st.ceiling_m, mode: st.mode, flight_state: st.state, form: loco.form(), energy: world.resource.state().current, last_move: S.lastMove }; }
  };
}
