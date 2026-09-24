/* MAHWORLD GAMEPLAY RUNTIME :: PLAYTEST TELEMETRY (local / headless; no analytics service)
   Subscribes to the event log and keeps the early-playtest counters: time_in_fused, time_in_split, transform_count,
   transform_cancel_count, average_fused_speed, average_split_speed, flight_duration, energy_depletion_count,
   movement_pattern_switch_count, attack_count, eccentric_attack_count, duel_duration, spectator_count, call_next_requests,
   activity_join_count. Speeds are fed by the movement layer (headless: the sampled command speed, m/s). Output = plain JSON log. */
export function createTelemetry(bus, deps) {
  var loco = deps && deps.locomotion; var T = { time_in_fused: 0, time_in_split: 0, transform_count: 0, transform_cancel_count: 0, fused_speed_samples: [], split_speed_samples: [], flight_duration: 0, energy_depletion_count: 0, movement_pattern_switch_count: 0, attack_count: 0, eccentric_attack_count: 0, duel_duration: 0, spectator_count: 0, call_next_requests: 0, activity_join_count: 0 };
  var lastPattern = null; var log = [];
  bus.on(function (e) {
    log.push({ t: e.t, name: e.name });
    switch (e.name) {
      case 'TRANSFORM_TO_SPLIT_ACCEPTED': case 'TRANSFORM_TO_FUSED_ACCEPTED': T.transform_count++; break;
      case 'TRANSFORM_CANCELLED': T.transform_cancel_count++; break;
      case 'RESOURCE_DEPLETED': T.energy_depletion_count++; break;
      case 'PATTERN_SELECTED': if (lastPattern && lastPattern !== e.payload.pattern_id) T.movement_pattern_switch_count++; lastPattern = e.payload.pattern_id; break;
      case 'ATTACK_CONCENTRIC_BEGIN': T.attack_count++; break;
      case 'ATTACK_ECCENTRIC_BEGIN': T.eccentric_attack_count++; break;
      case 'DUEL_RESULT': T.duel_duration += e.payload.duration_s || 0; break;
      case 'SPECTATOR_JOINED': T.spectator_count++; break;
      case 'CALL_NEXT_REQUESTED': T.call_next_requests++; break;
      case 'ACTIVITY_JOINED': T.activity_join_count++; break;
    }
  });
  function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; }
  return {
    tick: function (dt, sample) { var form = loco ? loco.form() : (sample && sample.form); if (form === 'FUSED') { T.time_in_fused += dt; if (sample && typeof sample.speed_mps === 'number') T.fused_speed_samples.push(sample.speed_mps); } else if (form === 'SPLIT') { T.time_in_split += dt; if (sample && typeof sample.speed_mps === 'number') T.split_speed_samples.push(sample.speed_mps); } if (sample && sample.flying) T.flight_duration += dt; },
    report: function () { return { time_in_fused: T.time_in_fused, time_in_split: T.time_in_split, transform_count: T.transform_count, transform_cancel_count: T.transform_cancel_count, average_fused_speed: avg(T.fused_speed_samples), average_split_speed: avg(T.split_speed_samples), flight_duration: T.flight_duration, energy_depletion_count: T.energy_depletion_count, movement_pattern_switch_count: T.movement_pattern_switch_count, attack_count: T.attack_count, eccentric_attack_count: T.eccentric_attack_count, duel_duration: T.duel_duration, spectator_count: T.spectator_count, call_next_requests: T.call_next_requests, activity_join_count: T.activity_join_count }; },
    log: function () { return log.slice(); },
    writeLocal: function (fs, path) { fs.writeFileSync(path, JSON.stringify({ report: this.report(), events: log }, null, 1)); return path; }
  };
}
