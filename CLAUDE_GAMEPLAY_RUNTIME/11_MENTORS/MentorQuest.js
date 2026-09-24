/* MAHWORLD GAMEPLAY RUNTIME :: MENTOR QUEST FOUNDATION (placeholder mentors / training contracts; no NPC characters)
   Quest types: TRAINING_CONTRACT · DISCIPLINE_TEST · SYSTEM_TUTORIAL · ACTIVITY_INTRO · COMBAT_TRAINING. Rewards are HOOKS
   (XP · STAT_PROGRESS · UNLOCK · ACTIVITY_ACCESS) routed through the progression boundary; economy not finalised.
   Lifecycle: OFFERED → ACCEPTED → IN_PROGRESS → COMPLETED / ABANDONED. Mentors are MENTOR_01..12 placeholder slots (OD-12). */
export var QUEST_TYPES = ['TRAINING_CONTRACT', 'DISCIPLINE_TEST', 'SYSTEM_TUTORIAL', 'ACTIVITY_INTRO', 'COMBAT_TRAINING'];
export var REWARD_HOOKS = ['XP', 'STAT_PROGRESS', 'UNLOCK', 'ACTIVITY_ACCESS'];
export function placeholderMentors(cfg) { var r = cfg.mentorCountRange(); var out = []; for (var i = 1; i <= r.max; i++) out.push({ mentor_id: 'MENTOR_' + (i < 10 ? '0' + i : i), discipline_slot: 'DISCIPLINE_SLOT_' + i, status: i <= r.min ? 'PLACEHOLDER_REQUIRED_MIN' : 'PLACEHOLDER_OPTIONAL (OD-12)', character: null }); return out; }

export function createMentorQuest(cfg, bus, def) {
  if (QUEST_TYPES.indexOf(def.type) < 0) throw new Error('bad quest type ' + def.type); if (def.story_fetch) throw new Error('mentor quests are never story fetch quests');
  var S = { id: def.quest_id, mentor: def.mentor_id, type: def.type, state: 'OFFERED', objectives: def.objectives.map(function (o) { return { id: o, done: false }; }), rewards: def.rewards || {}, ts: {} };
  function emit(n, p) { bus.emit(n, Object.assign({ quest: S.id, mentor: S.mentor, type: S.type }, p || {})); }
  return {
    id: S.id, type: S.type, state: function () { return S.state; }, snapshot: function () { return { quest_id: S.id, mentor_id: S.mentor, type: S.type, state: S.state, objectives: S.objectives.map(function (o) { return Object.assign({}, o); }), rewards: S.rewards, nature: 'TRAINING_CONTRACT_NOT_STORY_FETCH' }; },
    accept: function (profile) { if (S.state !== 'OFFERED') return { ok: false, reason: 'NOT_OFFERED' }; S.state = 'ACCEPTED'; if (profile) profile.mentor_progress.accepted.push(S.id); emit('MENTOR_QUEST_ACCEPTED'); S.state = 'IN_PROGRESS'; return { ok: true }; },
    complete: function (objectiveId) { if (S.state !== 'IN_PROGRESS') return { ok: false, reason: 'NOT_IN_PROGRESS' }; var o = S.objectives.filter(function (x) { return x.id === objectiveId; })[0]; if (!o) return { ok: false, reason: 'UNKNOWN_OBJECTIVE' }; o.done = true; emit('MENTOR_OBJECTIVE_DONE', { objective: objectiveId, remaining: S.objectives.filter(function (x) { return !x.done; }).length }); return { ok: true, remaining: S.objectives.filter(function (x) { return !x.done; }).length }; },
    abandon: function () { if (S.state !== 'IN_PROGRESS') return { ok: false }; S.state = 'ABANDONED'; emit('MENTOR_QUEST_ABANDONED'); return { ok: true }; },
    /* rewards go through the progression boundary; nothing here mutates stats directly */
    finish: function (profile, progression) {
      if (S.state !== 'IN_PROGRESS') return { ok: false, reason: 'NOT_IN_PROGRESS' }; if (S.objectives.some(function (o) { return !o.done; })) return { ok: false, reason: 'OBJECTIVES_REMAINING' };
      S.state = 'COMPLETED'; if (profile) profile.mentor_progress.completed.push(S.id); var granted = [];
      Object.keys(S.rewards).forEach(function (k) { if (REWARD_HOOKS.indexOf(k) < 0) throw new Error('unknown reward hook ' + k); var v = S.rewards[k]; if (k === 'XP' && progression) granted.push(progression.xpReward(profile, cfg.resolve(v), 'MENTOR_QUEST', S.id)); else if (k === 'STAT_PROGRESS' && progression) granted.push(progression.statProgress(profile, v, 1, 'MENTOR_QUEST')); else granted.push({ hook: k, value: v, applied: 'RECORDED' }); });
      emit('MENTOR_QUEST_COMPLETED', { granted: granted }); return { ok: true, granted: granted };
    }
  };
}
export var DEV_INTRO_QUEST = { quest_id: 'MQ_INTRO_TRANSFORM_DUEL', mentor_id: 'MENTOR_01', type: 'SYSTEM_TUTORIAL', objectives: ['ARRIVE_FUSED', 'UNFUSE_AND_CROSS', 'COMPLETE_SPARRING_DUEL'], rewards: { XP: 'mentor.intro_xp_bonus', UNLOCK: 'DUEL_CHALLENGE' }, story_fetch: false, classification: 'DEVELOPMENT_REFERENCE' };
