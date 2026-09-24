/* MAHWORLD JOB B :: CREATURE COMBAT DATA (owner next-pass 2026-09-20 §18) — the ONE place every wild species reads its balance from:
   registry.ecology.species[<SPECIES>].combat (hits_to_kill, hits_to_kill_player, aggression, aggro radius / cap, leash, cooldown, speeds,
   attack motion, aura, crit rule, respawn + jitter, active population, drop placeholder, pet eligibility). Numbers are expressed against the
   STANDARD BASELINE PLAYER ATTACK (rules damage.baseline_player_attack): at spawn the rules field turns them into an absolute HP and a
   per-creature damage multiplier — no damage number lives inside a behaviour or an animation. Wild combatants are team WILD with a
   `wild` block; the rules field's WILD context makes a player ↔ wild exchange real combat in FREE ROAM (town NPCs stay harmless). */
var DEFAULTS = { hits_to_kill: 5, hits_to_kill_player: 9, aggression: 'HOSTILE', aggro_radius_m: 16, aggro_cap: 3, leash_m: 28, attack_cooldown_s: 1.6, windup_s: 0.5, respawn_s: 45, respawn_jitter_s: 15, active_population: 12, aura: '#3fb8ff', aura_attack: '#9fe4ff' };

export function speciesCombat(registry, species) {
  var sp = registry && registry.ecology && registry.ecology.species && registry.ecology.species[species]; var c = sp && sp.combat || {};
  var out = {}; Object.keys(DEFAULTS).forEach(function (k) { out[k] = c[k] !== undefined ? c[k] : DEFAULTS[k]; }); out.speed_mps = c.speed_mps || {}; out.attack_motion = c.attack_motion || null; out.pet = c.pet || null; out.hover_y_m = c.hover_y_m; out.swirl_radius_m = c.swirl_radius_m; out.sweep_s = c.sweep_s; out.sweep_radius_m = c.sweep_radius_m; out.aggro_min_player_altitude_m = c.aggro_min_player_altitude_m; out.species = species; out.level = sp && Number.isFinite(sp.level) ? sp.level : 1;   /* owner B7 §4: the size-driven species level (registry ecology.levels; level_override wins) — display / progression data, never a damage input */ out.source = c && Object.keys(c).length ? 'registry' : 'defaults'; return out;
}
/* the per-creature balance the rules field spawns with: HP from hits_to_kill, a damage multiplier from hits_to_kill_player (null = never damages) */
export function balanceFor(rf, classId, combat, strikeSkillId) {
  var LIVE = rf.rules ? rf.rules() : null; var prof = LIVE && LIVE.class_profiles ? LIVE.class_profiles[classId] : null;
  var base = rf.baselineHit ? rf.baselineHit(prof) : null; var hp = base ? +(base.applied * combat.hits_to_kill).toFixed(1) : null;
  var mult = 1; if (combat.hits_to_kill_player && rf.strikeVsBaseline && prof) { var sv = rf.strikeVsBaseline(prof, strikeSkillId); if (sv && sv.applied > 0) mult = +((sv.player_max / combat.hits_to_kill_player) / sv.applied).toFixed(4); } else if (!combat.hits_to_kill_player) mult = 0;
  return { hp_abs: hp, damage_mult: mult, baseline_hit: base ? base.applied : null, baseline_skill: base ? base.skill : null };
}
/* spawn a wild combatant through the ONE rules field (team WILD, the wild block the damage batch and the client read) */
export function spawnWild(rf, id, classId, pos, combat, opts) {
  var o = opts || {}; var strike = o.strike_skill || 'PA_PUSH'; var bal = balanceFor(rf, classId, combat, strike);
  var c = rf.spawnSynthetic(id, classId, 'WILD', pos, { facing: o.facing || 0, passive: true, respawn_s: null, hp_abs: bal.hp_abs !== null ? bal.hp_abs : undefined, altitude: o.altitude || 0, wild: { species: combat.species, level: combat.level || 1, damage_mult: bal.damage_mult, aura: combat.aura, aura_attack: combat.aura_attack, strike: strike, hits_to_kill: combat.hits_to_kill, hits_to_kill_player: combat.hits_to_kill_player } });
  c.balance = bal; return c;
}
export function jitter(hash01) { return function (seed, k, salt) { return hash01(seed, k, salt); }; }
