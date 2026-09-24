/* MAHWORLD GAMEPLAY RUNTIME :: PLAYER GAMEPLAY PROFILE
   Assembled from the existing character-creator selection (Phase 3/4.5 creator runtime: class, sex, model id, iris/class colour,
   readiness) + the data-driven class loadout + the canonical movement config. Cosmetics are carried for identity only and are
   NEVER read by combat (combat_profile has no cosmetic field). Athlete is the DEVELOPMENT prototype class, not permanent canon.

       var profile = assembleGameplayProfile(cfg, { selection, registryEntry, loadouts, identity });   // identity optional (creator ClassIdentityConfig) */
var CLASSES = ['TITAN', 'ATHLETE', 'LEAN', 'BAGE', 'VISIONARY'];

export function assembleGameplayProfile(cfg, deps) {
  var sel = deps.selection || {}; var entry = deps.registryEntry || null; var loadouts = deps.loadouts; var identity = deps.identity || null;
  var cls = String(sel.class || (entry && entry.class) || '').toUpperCase(); var sex = String(sel.sex || (entry && entry.sex) || '').toUpperCase();
  if (CLASSES.indexOf(cls) < 0) throw new Error('gameplay profile: invalid class ' + cls); if (sex !== 'F' && sex !== 'M') throw new Error('gameplay profile: invalid sex ' + sex);
  var id = 'MAH_' + cls + '_' + sex; if (entry && entry.id !== id) throw new Error('gameplay profile: registry entry ' + entry.id + ' != selection ' + id);
  var lo = loadouts.loadouts[cls]; if (!lo) throw new Error('gameplay profile: no loadout entry for ' + cls);
  var irisColor = identity ? identity.irisColor(cls) : (entry ? entry.irisColor : null);
  return {
    character_id: id, class_id: cls, sex: sex, level: 1, xp: 0,
    visual: { model_id: id, visual_master_sha256: entry ? entry.visualMasterSha256 : null, readiness: entry ? entry.runtimeReadyStatus : 'UNKNOWN', eye_system: entry ? entry.eyeSystem : 'UNKNOWN', class_color: irisColor, iris_color: irisColor },
    movement_profile: { defaults_ref: 'CLAUDE_GAMEPLAY_FOUNDATION/02_MOVEMENT/PLAYER_MOVEMENT_DEFAULTS.json', config_version: cfg.canonVersion, forms: ['FUSED', 'SPLIT'], fused_speed_mph: cfg.speedRangeMph('FUSED'), split_speed_mph: cfg.speedRangeMph('SPLIT'), backward_multiplier: cfg.backwardMultiplier(), travel_flight_ceiling_m: { FUSED: cfg.travelFlightCeilingM('FUSED'), SPLIT: cfg.travelFlightCeilingM('SPLIT') }, combat_flight_cap_m: cfg.combatFlightCapM() },
    combat_profile: { class_id: cls, health_max_key: 'health.max', tiers: ['BASIC', 'SKILL', 'SPECIAL', 'BUFF_UTILITY'], targeting_policy: 'POLICY:TARGETING_POLICY', loadout_status: lo.status, classification: loadouts.classification },
    movement_pattern_loadout: { patterns: lo.patterns.slice(), status: lo.status, classification: loadouts.classification, source: 'CLASS_MOVEMENT_PATTERN_MATRIX.md (PROVISIONAL)' },
    resource_profile: { resource_id: cfg.dev('resource.id'), tuning: 'dev_tuning.dev.json (EXPERIMENTAL, OD-06)' },
    fused_split_capabilities: { FUSED: { travel: true, hover: true, glide: true, dash: true, flight: 'HIGH', lower_body_attacks: 'LIMITED' }, SPLIT: { gait: true, precise: true, climb: true, flight: 'LOW', lower_body_attacks: 'BROAD', combat_maneuver: true } },
    idle_personality: { flourish_id: lo.idle_flourish_id, interval_s: cfg.idleFlourishIntervalS() },
    mentor_progress: { accepted: [], completed: [] }, activity_progress: { joined: [], completed: [] },
    cosmetics: { skin_color: sel.skin_color || 'SKIN_DEFAULT', face_type: sel.face_type || 'FACE_DEFAULT', hair_style: sel.hair_style || 'HAIR_NONE', note: 'identity only; never read by combat' },
    development_note: cls === 'ATHLETE' ? 'ATHLETE is the DEVELOPMENT prototype class; not declared the permanent first-playable class (OD-19)' : null
  };
}
export function combatInputsOf(profile) { /* the only view combat is allowed to read: no cosmetics */ return { character_id: profile.character_id, class_id: profile.class_id, level: profile.level, patterns: profile.movement_pattern_loadout.patterns.slice(), combat: profile.combat_profile, capabilities: profile.fused_split_capabilities }; }
