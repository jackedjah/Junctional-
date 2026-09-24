/* MAHWORLD GAMEPLAY RUNTIME :: CONFIG
   The one place gameplay code obtains numbers. Canonical tunables come from CLAUDE_GAMEPLAY_FOUNDATION/02_MOVEMENT/PLAYER_MOVEMENT_DEFAULTS.json
   (CANON_TUNABLE, human numbers); development placeholders for OPEN_DECISION values come from 00_CORE/dev_tuning.dev.json (EXPERIMENTAL).
   Unit conversions are exposed once here (mph -> m/s, ft -> m); nothing else converts.

       var cfg = loadGameplayConfigSync(fs, path);            // node
       var cfg = createGameplayConfig(defaultsObj, devObj);   // browser / tests (already-parsed objects)
       cfg.canon('fused.forward_speed_mph.max') -> 40          cfg.dev('attack.upright_row.main') -> 24 (EXPERIMENTAL)
       cfg.speedRangeMps('FUSED') -> {min, max}                cfg.combatFlightCapM() */

export var MPH_TO_MPS = 0.44704, FT_TO_M = 0.3048;
export var CANON_DEFAULTS_REL = '../CLAUDE_GAMEPLAY_FOUNDATION/02_MOVEMENT/PLAYER_MOVEMENT_DEFAULTS.json';

function get(o, k) { return k.split('.').reduce(function (a, b) { return a === undefined || a === null ? undefined : a[b]; }, o); }

export function createGameplayConfig(defaults, dev) {
  if (!defaults || defaults.classification !== 'CANON_TUNABLE') throw new Error('gameplay config: PLAYER_MOVEMENT_DEFAULTS.json (CANON_TUNABLE) required');
  if (!dev || dev.classification !== 'EXPERIMENTAL') throw new Error('gameplay config: dev_tuning.dev.json (EXPERIMENTAL) required');
  var api = {
    canonVersion: defaults.config_version, devVersion: dev.tuning_version,
    canon: function (key) { var v = get(defaults, key); if (v === undefined) throw new Error('canon tunable missing: ' + key); if (v && typeof v === 'object' && 'value' in v && v.value === null) return { undecided: true, rule: v.rule }; return v; },
    dev: function (key) { var v = get(dev, key); if (v === undefined) throw new Error('dev tuning missing: ' + key); return v; },
    /* resolves either a canon key ('eccentric.default_duration_seconds') or a dev key ('attack.upright_row.main'); canon first */
    resolve: function (key) { var v = get(defaults, key); if (v !== undefined) return v; v = get(dev, key); if (v !== undefined) return v; throw new Error('tunable missing: ' + key); },
    mphToMps: function (mph) { return mph * MPH_TO_MPS; }, ftToM: function (ft) { return ft * FT_TO_M; },
    speedRangeMph: function (form) { var r = defaults[form === 'FUSED' ? 'fused' : 'split'].forward_speed_mph; return { min: r.min, max: r.max }; },
    speedRangeMps: function (form, direction) { var r = api.speedRangeMph(form); var m = direction === 'BACKWARD' ? defaults.backward_speed_multiplier : 1; return { min: r.min * MPH_TO_MPS * m, max: r.max * MPH_TO_MPS * m }; },
    backwardMultiplier: function () { return defaults.backward_speed_multiplier; },
    travelFlightCeilingM: function (form) { return form === 'FUSED' ? defaults.flight.fused_travel_max_altitude_m : defaults.flight.split_travel_max_altitude_m.max; },
    travelFlightCeilingRangeM: function (form) { return form === 'FUSED' ? { min: defaults.flight.fused_travel_max_altitude_m, max: defaults.flight.fused_travel_max_altitude_m } : { min: defaults.flight.split_travel_max_altitude_m.min, max: defaults.flight.split_travel_max_altitude_m.max }; },
    combatFlightCapM: function () { return defaults.flight.combat_max_height_ft * FT_TO_M; },
    combatFlightCapFt: function () { return defaults.flight.combat_max_height_ft; },
    idleFlourishIntervalS: function () { return defaults.idle.flourish_interval_seconds; },
    eccentricDurationRangeS: function () { return { min: defaults.eccentric.default_duration_seconds.min, max: defaults.eccentric.default_duration_seconds.max }; },
    spectatorMax: function () { return defaults.duel.spectator_default_max; },
    raidPartyMax: function () { return defaults.raid.party_default_max; },
    mentorCountRange: function () { return { min: defaults.mentors.default_count.min, max: defaults.mentors.default_count.max }; },
    movementPatternSlotRange: function () { return { min: defaults.combat.movement_pattern_slots.min, max: defaults.combat.movement_pattern_slots.max }; },
    policyDefault: function (name) { var p = dev.policies[name]; if (p === undefined) throw new Error('policy default missing: ' + name); return { name: name, value: p, classification: 'EXPERIMENTAL' }; },
    raw: { defaults: defaults, dev: dev }
  };
  return api;
}

/* node loading lives in config.node.js (loadGameplayConfigSync, foundationPaths) so this module stays browser-safe */
