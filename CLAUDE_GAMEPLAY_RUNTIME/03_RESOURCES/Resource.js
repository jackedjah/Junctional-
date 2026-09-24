/* MAHWORLD GAMEPLAY RUNTIME :: ABSTRACT RESOURCE (MAHGIC / energy)
   Phase 1 canon interface: CURRENT · MAX · COST · REGEN · LOCKOUT · DEPLETED. Names, max, regen and costs are NOT decided
   (OD-06 / OD-14): everything comes from cfg.dev('resource.*') (EXPERIMENTAL) so nothing here is hidden canon. Consumers: flight
   (drain per second), special attacks, transformations (mahloco owns the transformation cost values), future utility actions.

       var res = createResource(cfg, bus, { id: 'MAHGIC' });
       res.spend('special_cost') -> { ok, reason }   res.drain('flight_drain_per_s', dt)   res.tick(dt)   res.state() */
export function createResource(cfg, bus, options) {
  var o = options || {}; var T = cfg.dev('resource'); var id = o.id || T.id;
  /* optional per-instance overrides (rules 17–23 class pools, 2026-09-14): same primitives, same single spend path; the dev block stays the default */
  var MAX = o.max !== undefined ? o.max : T.max * (T.capacity_scale || 1),   /* owner B8 §9: the dev pool (the FLIGHT pool) scales its capacity through resource.capacity_scale */ REGEN = o.regen_rate_per_s !== undefined ? o.regen_rate_per_s : T.regen_rate_per_s, DELAY = o.regen_delay_s !== undefined ? o.regen_delay_s : T.regen_delay_s;
  var S = { current: o.start === undefined ? MAX : o.start, max: MAX, regenRate: REGEN, regenDelay: DELAY, sinceSpend: 1e9, lockoutUntil: -1, t: 0, depleted: false, spent: 0, depletions: 0 };
  function emit(n, p) { if (bus) bus.emit(n, Object.assign({ resource: id }, p || {})); }
  function costOf(key) { if (typeof key === 'number') return key; var v = T[key]; if (typeof v !== 'number') throw new Error('resource cost key not numeric: ' + key); return v; }
  function setCurrent(v) { S.current = Math.max(0, Math.min(S.max, v)); if (S.current === 0 && !S.depleted) { S.depleted = true; S.depletions++; S.lockoutUntil = S.t + T.lockout_s_on_depletion; emit('RESOURCE_DEPLETED', { lockout_s: T.lockout_s_on_depletion }); } }
  return {
    id: id, classification: 'EXPERIMENTAL_TUNING',
    state: function () { return { id: id, current: S.current, max: S.max, regen: S.regenRate, lockout: S.t < S.lockoutUntil, depleted: S.depleted, lockout_until: S.lockoutUntil }; },
    canAfford: function (costKey) { return !(S.t < S.lockoutUntil) && S.current >= costOf(costKey); },
    spend: function (costKey, purpose) {
      var c = costOf(costKey); if (S.t < S.lockoutUntil) return { ok: false, reason: 'LOCKOUT', remaining: S.lockoutUntil - S.t };
      if (S.current < c) return { ok: false, reason: 'INSUFFICIENT', needed: c, current: S.current };
      setCurrent(S.current - c); S.spent += c; S.sinceSpend = 0; emit('RESOURCE_SPENT', { cost: c, purpose: purpose || costKey, current: S.current }); return { ok: true, cost: c, current: S.current };
    },
    drain: function (rateKey, dt, purpose) { var r = costOf(rateKey) * dt; if (S.current <= 0) return { ok: false, reason: 'DEPLETED' }; setCurrent(S.current - r); S.spent += r; S.sinceSpend = 0; return { ok: S.current > 0, drained: r, current: S.current }; },
    refund: function (amount) { setCurrent(S.current + amount); },
    tick: function (dt) { S.t += dt; S.sinceSpend += dt; if (S.t >= S.lockoutUntil && S.sinceSpend >= S.regenDelay && S.current < S.max) { setCurrent(S.current + S.regenRate * dt); if (S.current > 0 && S.depleted) { S.depleted = false; emit('RESOURCE_RECOVERED', { current: S.current }); } } },
    stats: function () { return { spent: S.spent, depletions: S.depletions }; }
  };
}
