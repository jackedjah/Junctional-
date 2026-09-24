/* MAHWORLD GAMEPLAY RUNTIME :: IDLE FLOURISH DATA + SCHEDULER, UNIVERSAL EMOTE REGISTRY (no clips)
   Class idle flourishes are data / event contracts exactly as the owner described (canon §7); the interval comes from the canonical
   config (idle.flourish_interval_seconds), the max duration from dev tuning (OD-17). Flourishes are class-bound and mutually exclusive
   with locomotion; emotes are universal (any class / sex / physique), social-allowed, combat-allowed per engagement rules (OD-17). */
export var IDLE_FLOURISHES = {
  TITAN: { flourish_id: 'IDLE_TITAN_MOST_MUSCULAR', beats: [{ action: 'MOST_MUSCULAR', gaze: 'PHYSIQUE' }, { action: 'HEAD_NOD', gaze: 'PHYSIQUE' }] },
  BAGE: { flourish_id: 'IDLE_BAGE_QUAD_FLEX', beats: [{ action: 'QUAD_FLEX', gaze: 'QUAD' }, { action: 'BICEP_FLEX', gaze: 'BICEP' }, { action: 'DUST_HANDS', gaze: null }] },
  LEAN: { flourish_id: 'IDLE_LEAN_SIDE_TRICEPS', beats: [{ action: 'SIDE_TRICEPS', gaze: null }, { action: 'ABS_QUAD_INSPECTION', gaze: 'ABS_QUAD' }, { action: 'QUAD_FLEX', gaze: 'QUAD' }] },
  VISIONARY: { flourish_id: 'IDLE_VISIONARY_LAT_SPREAD', beats: [{ action: 'LAT_SPREAD', gaze: null }, { action: 'CROSS_BODY_LAT_TOUCHES', gaze: 'LATS', detail: 'right hand to left lat, then left hand to right lat' }] },
  ATHLETE: { flourish_id: 'IDLE_ATHLETE_SIDE_CHEST', beats: [{ action: 'SIDE_CHEST', gaze: 'CHEST' }, { action: 'UPPER_ARM_STRETCH', gaze: null }] }
};
export function createIdleFlourishScheduler(cfg, bus, deps) {
  var cls = deps.classId; var data = IDLE_FLOURISHES[cls]; if (!data) throw new Error('no flourish data for ' + cls);
  var interval = cfg.idleFlourishIntervalS(); var maxDur = cfg.dev('idle.flourish_max_duration_s'); var S = { idleT: 0, playing: false, playT: 0, count: 0, suppressed: 0 };
  return {
    data: Object.assign({ class: cls, interval_s: interval, max_duration_s: maxDur, mutually_exclusive_with_locomotion: true, tasteful_brief: true, hover_idle: true, fingertip_aura: 'SUBTLE' }, data),
    tick: function (dt, ctx) {
      var idle = ctx && ctx.idle && !(ctx.moving) && !(ctx.combat) && !(ctx.transforming);
      if (!idle) { if (S.playing) { S.playing = false; bus.emit('IDLE_FLOURISH_INTERRUPTED', { class: cls }); } S.idleT = 0; return null; }
      S.idleT += dt;
      if (S.playing) { S.playT += dt; if (S.playT >= maxDur) { S.playing = false; bus.emit('IDLE_FLOURISH_END', { class: cls, flourish_id: data.flourish_id }); } return null; }
      if (S.idleT >= interval) { S.idleT = 0; S.playing = true; S.playT = 0; S.count++; var ev = { class: cls, flourish_id: data.flourish_id, beats: data.beats, interval_s: interval, max_duration_s: maxDur, clip: 'NOT_AUTHORED_YET' }; bus.emit('IDLE_FLOURISH_TRIGGER', ev); return ev; }
      return null;
    },
    count: function () { return S.count; }, playing: function () { return S.playing; }
  };
}

export function createEmoteRegistry(bus) {
  var emotes = {}; var cooldownUntil = {}; var t = 0;
  return {
    register: function (e) { ['emote_id', 'animation_id', 'combat_allowed', 'social_allowed', 'interruptible', 'cooldown_key'].forEach(function (k) { if (!(k in e)) throw new Error('emote missing ' + k); }); emotes[e.emote_id] = Object.assign({ universal: true, class_locked: false, catalogue_status: 'SCAFFOLD_NOT_FINAL' }, e); return this; },
    list: function () { return Object.keys(emotes); },
    canPlay: function (id, ctx, cfg) { var e = emotes[id]; if (!e) return { ok: false, reason: 'UNKNOWN_EMOTE' }; if (ctx && ctx.combat && !e.combat_allowed) return { ok: false, reason: 'NOT_ALLOWED_IN_COMBAT (OD-17)' }; if (ctx && ctx.social === false && !e.social_allowed) return { ok: false, reason: 'NOT_SOCIAL' }; if ((cooldownUntil[id] || -1) > t) return { ok: false, reason: 'COOLDOWN' }; return { ok: true, interruptible: e.interruptible, animation_id: e.animation_id }; },
    play: function (id, ctx, cfg) { var c = this.canPlay(id, ctx, cfg); if (!c.ok) return c; var e = emotes[id]; cooldownUntil[id] = t + (cfg ? cfg.resolve(e.cooldown_key) : 0); bus.emit('EMOTE_PLAY', { emote: id, animation_id: e.animation_id, universal: true }); return { ok: true }; },
    tick: function (dt) { t += dt; }
  };
}
