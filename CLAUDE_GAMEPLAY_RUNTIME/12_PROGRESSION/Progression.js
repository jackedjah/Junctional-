/* MAHWORLD GAMEPLAY RUNTIME :: PROGRESSION BOUNDARIES (PERMANENT) + TEMPORARY BUFFS (never progression)
   Events: WORKOUT_SYNC_EVENT → XP_REWARD → STAT_PROGRESS → LEVEL_PROGRESS. These are the ONLY paths that mutate a profile's long-term
   level / xp / stats. Temporary buffs (Bage placeholder) live in a separate structure with duration, stacking policy and expiration;
   they modify EFFECTIVE stats through a query and never touch the profile. No health data; workout sync is an abstract event. */
export function createProgression(cfg, bus) {
  var perLevel = cfg.dev('progression.xp_per_level_placeholder');
  function emit(n, p) { bus.emit(n, p); }
  var api = {
    xpReward: function (profile, amount, source, ref) { profile.xp += amount; var ev = { event: 'XP_REWARD', kind: 'PERMANENT', character: profile.character_id, amount: amount, source: source, ref: ref || null, xp: profile.xp }; emit('XP_REWARD', ev); api.checkLevel(profile); return ev; },
    statProgress: function (profile, stat, amount, source) { profile.stats = profile.stats || {}; profile.stats[stat] = (profile.stats[stat] || 0) + amount; var ev = { event: 'STAT_PROGRESS', kind: 'PERMANENT', character: profile.character_id, stat: stat, amount: amount, source: source, value: profile.stats[stat] }; emit('STAT_PROGRESS', ev); return ev; },
    checkLevel: function (profile) { var before = profile.level; while (profile.xp >= profile.level * perLevel) { profile.xp -= profile.level * perLevel; profile.level++; } if (profile.level !== before) emit('LEVEL_PROGRESS', { event: 'LEVEL_PROGRESS', kind: 'PERMANENT', character: profile.character_id, from: before, to: profile.level }); return profile.level; },
    workoutSync: function (profile, sync) {
      /* sync = { units, discipline, source_id } — abstract, no personal health data; more consequential than a temporary buff by design (weight rule) */
      if (!sync || typeof sync.units !== 'number' || sync.health_data) throw new Error('WORKOUT_SYNC_EVENT must be an abstract unit count without health data');
      var ev = { event: 'WORKOUT_SYNC_EVENT', kind: 'PERMANENT', character: profile.character_id, units: sync.units, discipline: sync.discipline || null, health_data: false }; emit('WORKOUT_SYNC_EVENT', ev);
      var xp = api.xpReward(profile, sync.units * cfg.dev('progression.workout_sync_xp_per_unit'), 'WORKOUT_SYNC', sync.source_id); var st = sync.discipline ? api.statProgress(profile, sync.discipline, sync.units, 'WORKOUT_SYNC') : null; return { sync: ev, xp: xp, stat: st };
    },
    duelReward: function (profile, won) { return api.xpReward(profile, cfg.dev(won ? 'progression.duel_win_xp' : 'progression.duel_loss_xp'), 'DUEL', won ? 'WIN' : 'LOSS'); }
  };
  return api;
}

export var STACKING = ['REFRESH', 'STACK', 'IGNORE'];
export function createBuffSystem(cfg, bus) {
  var active = []; var t = 0;
  return {
    apply: function (buff) {
      ['buff_id', 'source', 'target', 'stat_modifiers', 'duration_key', 'stacking_policy'].forEach(function (k) { if (!(k in buff)) throw new Error('buff missing ' + k); }); if (STACKING.indexOf(buff.stacking_policy) < 0) throw new Error('bad stacking policy');
      var dur = cfg.resolve(buff.duration_key); var existing = active.filter(function (b) { return b.buff_id === buff.buff_id && b.target === buff.target; })[0];
      if (existing) { if (buff.stacking_policy === 'IGNORE') return { ok: false, reason: 'ALREADY_ACTIVE' }; if (buff.stacking_policy === 'REFRESH') { existing.expires_at = t + dur; bus.emit('BUFF_REFRESHED', { buff: buff.buff_id, target: buff.target }); return { ok: true, refreshed: true }; } }
      var inst = Object.assign({}, buff, { kind: 'TEMPORARY', applied_at: t, expires_at: t + dur }); active.push(inst); bus.emit('BUFF_APPLIED', { buff: buff.buff_id, source: buff.source, target: buff.target, expires_at: inst.expires_at, kind: 'TEMPORARY' }); return { ok: true, expires_at: inst.expires_at };
    },
    tick: function (dt) { t += dt; var expired = active.filter(function (b) { return b.expires_at <= t; }); active = active.filter(function (b) { return b.expires_at > t; }); expired.forEach(function (b) { bus.emit('BUFF_EXPIRED', { buff: b.buff_id, target: b.target }); }); return expired.length; },
    activeFor: function (target) { return active.filter(function (b) { return b.target === target; }).map(function (b) { return Object.assign({}, b); }); },
    /* effective stat = permanent progression value + temporary modifiers; the profile itself is never written here */
    effectiveStat: function (profile, stat) { var base = (profile.stats && profile.stats[stat]) || 0; var mod = 0; active.forEach(function (b) { if (b.target === profile.character_id && b.stat_modifiers[stat]) mod += b.stat_modifiers[stat]; }); return { stat: stat, base: base, temporary: mod, effective: base + mod }; },
    time: function () { return t; }
  };
}
