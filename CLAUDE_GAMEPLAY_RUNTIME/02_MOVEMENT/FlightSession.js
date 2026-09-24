/* MAHWORLD GAMEPLAY RUNTIME :: FLIGHT SESSION (headless; no physics)
   Travel flight uses the form's ceiling; combat overrides it with the combat cap (canon: two ceilings). Energy drains through the
   resource (rate = dev tuning, OD-14). Altitude is validated, an over-cap request produces FORCED_DESCENT, depletion falls back to
   LANDING / hover. States: GROUNDED · HOVER · ASCENDING · FLYING · FORCED_DESCENT · LANDING.

       var fl = createFlightSession(cfg, bus, { resource, capabilities }); fl.setContext({combat:true}); fl.requestAltitude('FUSED', 10); fl.tick(dt) */
export function createFlightSession(cfg, bus, deps) {
  var res = deps.resource, cap = deps.capabilities; var S = { state: 'GROUNDED', altitude: 0, target: 0, form: 'FUSED', combat: false, duration: 0, hoverFallback: false };
  function emit(n, p) { bus.emit(n, Object.assign({ flight_state: S.state, altitude_m: S.altitude }, p || {})); }
  function ceiling() { return cap.getFlightCeiling(S.form, { combat: S.combat }); }
  function go(state, why) { if (S.state !== state) { S.state = state; emit('FLIGHT_STATE', { why: why }); } }
  return {
    state: function () { return { state: S.state, altitude_m: S.altitude, target_m: S.target, ceiling_m: ceiling(), mode: S.combat ? 'COMBAT' : 'TRAVEL', form: S.form, duration_s: S.duration }; },
    setForm: function (f) { S.form = f; if (S.altitude > ceiling()) { S.target = ceiling(); go('FORCED_DESCENT', 'form ceiling'); } },
    setContext: function (ctx) { S.combat = !!(ctx && ctx.combat); if (S.altitude > ceiling()) { S.target = ceiling(); go('FORCED_DESCENT', S.combat ? 'combat cap' : 'travel ceiling'); } emit('FLIGHT_CONTEXT', { mode: S.combat ? 'COMBAT' : 'TRAVEL', ceiling_m: ceiling() }); },
    validateAltitude: function (m) { var c = ceiling(); return { ok: m <= c, ceiling_m: c, mode: S.combat ? 'COMBAT' : 'TRAVEL', clamped_m: Math.min(m, c) }; },
    requestAltitude: function (form, m) {
      if (form) S.form = form; var v = this.validateAltitude(m); S.target = v.clamped_m;
      if (!v.ok) emit('FLIGHT_ALTITUDE_CLAMPED', { requested_m: m, ceiling_m: v.ceiling_m });
      if (S.target > S.altitude) { if (!res.canAfford('flight_drain_per_s')) { go('HOVER', 'insufficient energy'); S.hoverFallback = true; return { ok: false, reason: 'INSUFFICIENT_ENERGY', state: S.state }; } go('ASCENDING', 'request'); }
      else if (S.target < S.altitude) go(S.target === 0 ? 'LANDING' : 'FORCED_DESCENT', 'request');
      return { ok: true, target_m: S.target, clamped: !v.ok, state: S.state };
    },
    tick: function (dt) {
      var rate = 4 * dt;   /* headless placeholder climb/descend rate, metres per tick-second; no physics */
      if (S.state === 'ASCENDING' || S.state === 'FLYING' || S.state === 'HOVER' && S.altitude > 0) {
        var d = res.drain('flight_drain_per_s', dt, 'FLIGHT'); S.duration += dt;
        if (!d.ok) { S.target = 0; go('LANDING', 'energy depleted'); emit('FLIGHT_ENERGY_DEPLETED'); }
      }
      if (S.state === 'ASCENDING') { S.altitude = Math.min(S.target, S.altitude + rate); if (S.altitude >= S.target) go('FLYING', 'target reached'); }
      else if (S.state === 'FORCED_DESCENT' || S.state === 'LANDING') { S.altitude = Math.max(S.target, S.altitude - rate); if (S.altitude <= S.target) go(S.altitude === 0 ? 'GROUNDED' : 'FLYING', 'descent done'); }
      if (S.altitude > ceiling()) { S.target = ceiling(); go('FORCED_DESCENT', 'above ceiling'); }
    },
    land: function () { S.target = 0; go('LANDING', 'land'); }
  };
}
