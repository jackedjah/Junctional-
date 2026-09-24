/* MAHWORLD GAMEPLAY RUNTIME :: RAID PARTY FOUNDATION (headless)
   Party creation / join / leave / leader / size (max = cfg.raidPartyMax(), CANON_TUNABLE) / difficulty request / encounter seed /
   monster + boss scaling HOOKS. The scaling formula is OPEN_DECISION OD-08: getDifficultyInputs() exposes party_size, average_level and
   optional future metrics; RAID_SCALING_POLICY strategies are EXPERIMENTAL and pluggable. No monsters, no bosses, no maps. */
export var RAID_SCALING_POLICIES = {
  LINEAR_DEV: { id: 'LINEAR_DEV', classification: 'EXPERIMENTAL_POLICY', open_decision: 'OD-08', describe: 'placeholder: multipliers grow linearly with party size; shape only, values not tuned', scale: function (inputs) { var n = inputs.party_size; return { spawn_rate_mult: 1 + 0.25 * (n - 1), monster_strength_mult: 1 + 0.2 * (n - 1), extra_mechanics: n >= 3 ? ['ADDITIONAL_PRESSURE_PLACEHOLDER'] : [], boss_phase_unlock: n >= 3 } ; } },
  STEPPED_DEV: { id: 'STEPPED_DEV', classification: 'EXPERIMENTAL_POLICY', open_decision: 'OD-08', describe: 'placeholder: step table by party size', scale: function (inputs) { var t = { 1: [1, 1], 2: [1.3, 1.2], 3: [1.7, 1.5], 4: [2.2, 1.8] }[Math.min(4, inputs.party_size)]; return { spawn_rate_mult: t[0], monster_strength_mult: t[1], extra_mechanics: inputs.party_size >= 4 ? ['ADDITIONAL_PRESSURE_PLACEHOLDER'] : [], boss_phase_unlock: inputs.party_size >= 3 }; } }
};
var ids = 0;
export function createRaidParty(cfg, bus, deps) {
  var policies = deps.policies; Object.keys(RAID_SCALING_POLICIES).forEach(function (k) { policies.register('RAID_SCALING_POLICY', k, RAID_SCALING_POLICIES[k], 'OD-08'); });
  var max = cfg.raidPartyMax(); var S = { id: 'RAID_' + (++ids), world: deps.world_id, leader: deps.leader.id, members: [deps.leader], state: 'FORMING', difficulty_request: 'NORMAL', seed: deps.seed || null };
  function emit(n, p) { bus.emit(n, Object.assign({ party: S.id }, p || {})); }
  emit('RAID_PARTY_CREATED', { leader: S.leader, max: max });
  return {
    id: S.id, max: max, state: function () { return S.state; }, leader: function () { return S.leader; }, size: function () { return S.members.length; }, members: function () { return S.members.map(function (m) { return m.id; }); },
    join: function (m) { if (S.state !== 'FORMING') return { ok: false, reason: 'NOT_FORMING' }; if (S.members.some(function (x) { return x.id === m.id; })) return { ok: false, reason: 'ALREADY_MEMBER' }; if (S.members.length >= max) { emit('RAID_JOIN_REFUSED', { player: m.id, reason: 'PARTY_FULL', max: max }); return { ok: false, reason: 'PARTY_FULL', max: max }; } S.members.push(m); emit('RAID_JOINED', { player: m.id, size: S.members.length }); return { ok: true, size: S.members.length }; },
    leave: function (id) { var i = S.members.findIndex(function (x) { return x.id === id; }); if (i < 0) return { ok: false, reason: 'NOT_MEMBER' }; S.members.splice(i, 1); if (S.leader === id) S.leader = S.members.length ? S.members[0].id : null; emit('RAID_LEFT', { player: id, leader: S.leader }); if (!S.members.length) S.state = 'DISBANDED'; return { ok: true, leader: S.leader }; },
    requestDifficulty: function (level) { S.difficulty_request = level; emit('RAID_DIFFICULTY_REQUESTED', { level: level }); return { ok: true }; },
    setSeed: function (seed) { S.seed = seed; },
    getDifficultyInputs: function () { var lv = S.members.map(function (m) { return m.level || 1; }); return { party_size: S.members.length, average_level: lv.reduce(function (a, b) { return a + b; }, 0) / lv.length, difficulty_request: S.difficulty_request, encounter_seed: S.seed, future_metrics: { measured_dps: null, clear_time_history: null } }; },
    monsterScalingHook: function () { var pol = policies.get('RAID_SCALING_POLICY'); var out = pol.strategy.scale(this.getDifficultyInputs()); return Object.assign({ policy: pol.id, classification: pol.classification, open_decision: pol.open_decision }, out); },
    bossScalingHook: function () { var m = this.monsterScalingHook(); return { policy: m.policy, classification: m.classification, open_decision: m.open_decision, boss_strength_mult: m.monster_strength_mult, boss_phase_unlock: m.boss_phase_unlock, ultimate_boss: 'PER_WORLD_PLACEHOLDER' }; },
    start: function () { if (S.state !== 'FORMING' || !S.members.length) return { ok: false }; S.state = 'ACTIVE'; emit('RAID_STARTED', { inputs: this.getDifficultyInputs(), scaling: this.monsterScalingHook() }); return { ok: true }; },
    resolve: function (outcome) { S.state = 'RESOLVED'; emit('RAID_RESOLVED', { outcome: outcome }); }
  };
}
