/* MAHWORLD GAMEPLAY RUNTIME :: ATTACK EXECUTION + ECCENTRIC DAMAGE RUNTIME (mandatory canon, headless, no VFX)
   Executes an attack definition through its phases and emits the canon events:
     ATTACK_CONCENTRIC_BEGIN → ATTACK_MAIN_IMPACT → [PEAK] → ATTACK_ECCENTRIC_BEGIN → ATTACK_ECCENTRIC_TICK × n → ATTACK_ECCENTRIC_END → ATTACK_COMPLETE
   Eccentric fields (CONCENTRIC_MAIN_DAMAGE, ECCENTRIC_TICK_DAMAGE, ECCENTRIC_DURATION, ECCENTRIC_AOE, ECCENTRIC_DIRECTION_VISUAL,
   ECCENTRIC_COLOR_SHIFT) are resolved from keys at execution time — never hard-coded. The eccentric tail total must be below the main
   damage (canon); the runtime refuses a definition whose configured tail would exceed the main (OD-18 ratio stays configurable).
   Traceability: gameplay brief §13–15 / canon §8 / ECCENTRIC_DAMAGE_SYSTEM.md.

       var exec = createAttackExecution(cfg, bus, { attack, attacker, target, resource, applyDamage });
       exec.start(); exec.tick(dt); exec.state() */
export function eccentricPlan(cfg, attack) {
  var dp = attack.damage_profile || {}; if (!dp.eccentric_tick_key) return null;
  var main = cfg.resolve(dp.main_key); var tick = cfg.resolve(dp.eccentric_tick_key); var dur = cfg.resolve(dp.eccentric_duration_key); var interval = cfg.resolve(dp.eccentric_tick_interval_key || 'eccentric.tick_interval_s');
  var duration = typeof dur === 'number' ? dur : (dur.min + dur.max) / 2;   /* canon range 2–3 s: midpoint until the owner sets a value; still a config-derived number */
  var ticks = Math.floor(duration / interval + 1e-9); var tail = ticks * tick; var mp = attack.manifestation_profile || {};
  return { CONCENTRIC_MAIN_DAMAGE: main, ECCENTRIC_TICK_DAMAGE: tick, ECCENTRIC_DURATION: duration, ECCENTRIC_TICK_INTERVAL: interval, ECCENTRIC_TICKS: ticks, ECCENTRIC_TAIL_TOTAL: tail,
    ECCENTRIC_AOE: { kind: mp.kind || 'NONE', radius_m: mp.aoe_radius_key ? cfg.resolve(mp.aoe_radius_key) : 0 }, ECCENTRIC_DIRECTION_VISUAL: mp.eccentric_direction_visual || 'REVERSED', ECCENTRIC_COLOR_SHIFT: mp.eccentric_color_shift || 'DARKER', tail_below_main: tail < main };
}

export function createAttackExecution(cfg, bus, deps) {
  var a = deps.attack; var res = deps.resource || null; var apply = deps.applyDamage || function () { return { applied: 0 }; };
  var plan = eccentricPlan(cfg, a); if (plan && !plan.tail_below_main) throw new Error(a.attack_id + ': configured eccentric tail (' + plan.ECCENTRIC_TAIL_TOTAL + ') is not below the main damage (' + plan.CONCENTRIC_MAIN_DAMAGE + ') — canon violation, fix dev tuning');
  var phases = a.phases.map(function (p) { var d = p.duration_key ? cfg.resolve(p.duration_key) : 0; return { phase: p.phase, duration: typeof d === 'number' ? d : (plan ? plan.ECCENTRIC_DURATION : (d.min + d.max) / 2), damage_key: p.damage_key, direction: p.direction_vector, color_shift: p.color_shift || null }; });
  var S = { state: 'READY', idx: -1, t: 0, phaseT: 0, ticksDone: 0, nextTick: 0, dealt: { main: 0, eccentric: 0 }, events: 0 };
  function emit(n, p) { S.events++; bus.emit(n, Object.assign({ attack_id: a.attack_id, attacker: deps.attacker, target: deps.target, phase: S.idx >= 0 && S.idx < phases.length ? phases[S.idx].phase : null }, p || {})); }
  function enter(i) {
    S.idx = i; S.phaseT = 0; if (i >= phases.length) { S.state = 'COMPLETE'; emit('ATTACK_COMPLETE', { dealt: S.dealt, plan: plan }); return; }
    var ph = phases[i]; S.state = ph.phase;
    if (ph.phase === 'CONCENTRIC') emit('ATTACK_CONCENTRIC_BEGIN', { direction: ph.direction, duration_s: ph.duration });
    else if (ph.phase === 'PEAK_TRANSITION') emit('ATTACK_PEAK', { duration_s: ph.duration });
    else if (ph.phase === 'ECCENTRIC') { S.nextTick = plan.ECCENTRIC_TICK_INTERVAL; S.ticksDone = 0; emit('ATTACK_ECCENTRIC_BEGIN', { direction: ph.direction, color_shift: plan.ECCENTRIC_COLOR_SHIFT, direction_visual: plan.ECCENTRIC_DIRECTION_VISUAL, aoe: plan.ECCENTRIC_AOE, duration_s: plan.ECCENTRIC_DURATION, tick_damage: plan.ECCENTRIC_TICK_DAMAGE }); }
  }
  return {
    attack: a, plan: plan,
    state: function () { return { state: S.state, phase_index: S.idx, phase_t: S.phaseT, ticks_done: S.ticksDone, dealt: Object.assign({}, S.dealt) }; },
    start: function () {
      if (S.state !== 'READY') return { ok: false, reason: 'ALREADY_STARTED' };
      if (a.resource_cost_key) { var r = res ? res.spend(a.resource_cost_key, a.attack_id) : { ok: false, reason: 'NO_RESOURCE' }; if (!r.ok) { S.state = 'REFUSED'; emit('ATTACK_REFUSED', { reason: r.reason }); return { ok: false, reason: r.reason }; } }
      enter(0); return { ok: true };
    },
    interrupt: function (why) { if (S.state === 'COMPLETE' || S.state === 'REFUSED' || S.state === 'READY') return false; var wasEcc = S.state === 'ECCENTRIC'; if (wasEcc) emit('ATTACK_ECCENTRIC_END', { early: true, ticks: S.ticksDone, why: why }); S.state = 'INTERRUPTED'; emit('ATTACK_INTERRUPTED', { why: why }); return true; },
    tick: function (dt) {
      if (['READY', 'COMPLETE', 'REFUSED', 'INTERRUPTED'].indexOf(S.state) >= 0) return S.state;
      S.t += dt; S.phaseT += dt; var ph = phases[S.idx];
      if (ph.phase === 'CONCENTRIC' && S.phaseT >= ph.duration) { var main = cfg.resolve(ph.damage_key); var r = apply(deps.target, main, { kind: 'MAIN', attack_id: a.attack_id }); S.dealt.main += r.applied === undefined ? main : r.applied; emit('ATTACK_MAIN_IMPACT', { damage: main, applied: S.dealt.main, range_type: a.range_type }); enter(S.idx + 1); return S.state; }
      if (ph.phase === 'PEAK_TRANSITION' && S.phaseT >= ph.duration) { enter(S.idx + 1); return S.state; }
      if (ph.phase === 'ECCENTRIC') {
        while (S.ticksDone < plan.ECCENTRIC_TICKS && S.phaseT + 1e-9 >= S.nextTick) { var d = plan.ECCENTRIC_TICK_DAMAGE; var rr = apply(deps.target, d, { kind: 'ECCENTRIC_TICK', attack_id: a.attack_id, aoe: plan.ECCENTRIC_AOE }); S.dealt.eccentric += rr.applied === undefined ? d : rr.applied; S.ticksDone++; S.nextTick += plan.ECCENTRIC_TICK_INTERVAL; emit('ATTACK_ECCENTRIC_TICK', { tick: S.ticksDone, damage: d, total_eccentric: S.dealt.eccentric, direction_visual: plan.ECCENTRIC_DIRECTION_VISUAL, color_shift: plan.ECCENTRIC_COLOR_SHIFT }); }
        if (S.phaseT >= plan.ECCENTRIC_DURATION) { emit('ATTACK_ECCENTRIC_END', { early: false, ticks: S.ticksDone, total_eccentric: S.dealt.eccentric, below_main: S.dealt.eccentric < S.dealt.main }); enter(S.idx + 1); }
      }
      return S.state;
    }
  };
}
