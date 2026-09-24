/* MAHWORLD GAMEPLAY RUNTIME :: SESSION RECORDER (format 1.1.0, Phase 4.1)
   Records a reproducible session: runtime / config identifiers · start state (FRESH_BASELINE or UNSUPPORTED_LIVE_STATE, decided by an
   activity tracker that watches the bus from the recorder's creation, i.e. from boot) · seed · the exact per-tick dt list (simulation
   timing, never wall clock) · ordered inputs and SETUP_ACTION events at their tick index · checkpoints (mahloco state, form, resource,
   flight, pattern, xp, level + caller extras) · key-event SIGNATURES for comparison only (never re-applied). Export = plain JSON.
   Replay lives in IsolatedReplay.js and runs in a separate simulation; nothing here mutates gameplay. */
export var RECORD_FORMAT = '1.1.0';
export var BASELINE = { mahloco: 'FUSED_IDLE', form: 'FUSED', transforming: false, resource_full: true, xp: 0, level: 1, pattern: null, flight: 'GROUNDED', altitude: 0 };
var ACTIVITY = /^(INPUT_ACTION|SETUP_ACTION|TRANSFORM_TO_|DUEL_STATE|ATTACK_|XP_REWARD|STAT_PROGRESS|LEVEL_PROGRESS|FLIGHT_STATE|INTERACTION_CONFIRMED|PROFILE_LOADED|RESOURCE_SPENT|PATTERN_SELECTED|BUFF_APPLIED)/;
var KEY_EVENTS = /^(MAHLOCO_STATE_ENTER|TRANSFORM_TO_|ATTACK_|DUEL_STATE|DUEL_DAMAGE|DUEL_RESULT|FLIGHT_STATE|FLIGHT_ALTITUDE_CLAMPED|INTERACTION_CONFIRMED|INTERACTION_REFUSED|DOOR_STATE|BUILDING_ENTERED|XP_REWARD|LEVEL_PROGRESS|RESOURCE_SPENT|RESOURCE_DEPLETED|PATTERN_SELECTED|BOT_STATE|BOT_INCOMING|CLIMB_ENTER|CLIMB_RELEASE)/;
var SIG_KEYS = ['state', 'to', 'amount', 'damage', 'applied', 'health', 'attack_id', 'pattern_id', 'reason', 'tick', 'why'];
function sig(e) { var p = e.payload || {}; return e.name + '|' + SIG_KEYS.filter(function (k) { return k in p && (typeof p[k] !== 'object' || p[k] === null); }).map(function (k) { return k + '=' + (typeof p[k] === 'number' ? +p[k].toFixed(3) : p[k]); }).join(','); }
function strip(p) { var c = Object.assign({}, p); delete c.action; delete c.source; delete c.direction; return c; }
export function runtimeIds(world) { var cfg = world.cfg; return { character_id: world.profile.character_id, class_id: world.profile.class_id, sex: world.profile.sex, tuning_version: cfg.raw.dev.tuning_version || null, defaults_classification: cfg.raw.defaults.classification || null, patterns: world.kit.patterns().join(','), record_format: RECORD_FORMAT }; }
export function compareCheckpoint(exp, got) { var diffs = []; Object.keys(exp).forEach(function (k) { if (k === 't') return; var a = exp[k], b = got[k]; var same = (typeof a === 'number' && typeof b === 'number') ? Math.abs(a - b) <= 1e-6 : JSON.stringify(a) === JSON.stringify(b); if (!same) diffs.push({ field: k, expected: a, actual: b }); }); return diffs; }

export function createSessionRecorder(world, deps) {
  var d = deps || {}; var every = d.checkpointEvery || 10; var extra = d.checkpointExtra || null;
  var S = { on: false, k: 0, t: 0, rec: null, dirty: false, first: null, last: null, depth: 0, seq: 0 };
  function snapshot() { var s = world.loco.snapshot(); var r = world.resource.state(); var fl = world.flight.state(); var base = { tick: S.k, t: +S.t.toFixed(4), mahloco: s.state, form: world.loco.form(), transforming: !!s.transforming, resource: +r.current.toFixed(3), resource_full: r.current >= r.max - 1e-9, altitude: +fl.altitude_m.toFixed(3), flight: fl.state, pattern: world.kit.selected(), xp: world.profile.xp, level: world.profile.level }; if (extra) Object.assign(base, extra()); return base; }
  /* activity tracker from creation: the first gameplay activity since boot decides whether a later recording start is a FRESH_BASELINE */
  var unhook = world.bus.on(function (e) {
    if (!S.first && ACTIVITY.test(e.name) && !S.on) S.first = { name: e.name, t: e.t };
    if (e.name === 'INPUT_ACTION') S.depth++; else if (e.name === 'INPUT_ACTION_DONE') S.depth = Math.max(0, S.depth - 1);
    if (!S.on) return;
    /* seq preserves the exact emission order inside a tick; a SETUP_ACTION emitted while an input handler runs is `nested` (reproduced by replaying the input, never re-issued) */
    if (e.name === 'INPUT_ACTION') { S.rec.inputs.push({ tick: S.k, seq: S.seq++, action: e.payload.action, payload: strip(e.payload) }); S.dirty = true; }
    else if (e.name === 'SETUP_ACTION') { S.rec.setup.push({ tick: S.k, seq: S.seq++, kind: e.payload.kind, args: Object.assign({}, e.payload.args || {}), unsupported: !!e.payload.unsupported, nested: S.depth > 0 }); S.dirty = true; }
    else if (KEY_EVENTS.test(e.name)) S.rec.events.push({ tick: S.k, name: e.name, sig: sig(e) });
  });
  function checkpoint() { S.last = snapshot(); S.rec.checkpoints.push(S.last); }
  var api = {
    format: RECORD_FORMAT, recording: function () { return S.on; }, pristine: function () { return !S.first; }, firstActivity: function () { return S.first; },
    start: function () {
      if (S.on) return { ok: false, reason: 'ALREADY_RECORDING' };
      var snap = snapshot(); var diffs = []; Object.keys(BASELINE).forEach(function (k) { var a = BASELINE[k], b = snap[k]; if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push({ field: k, baseline: a, actual: b }); });
      var kind = (!S.first && !diffs.length) ? 'FRESH_BASELINE' : 'UNSUPPORTED_LIVE_STATE';
      var reason = kind === 'FRESH_BASELINE' ? null : (S.first ? 'gameplay activity before recording start (' + S.first.name + ' at t ' + (+S.first.t).toFixed(2) + ' s); live state cannot be restored in isolation' : 'start snapshot differs from the fresh baseline: ' + diffs.map(function (x) { return x.field; }).join(', '));
      S.on = true; S.k = 0; S.t = 0; S.dirty = false; S.seq = 0;
      S.rec = { format_version: RECORD_FORMAT, runtime: runtimeIds(world), seed: d.seed === undefined ? null : d.seed, start: { kind: kind, reason: reason, elapsed_s: +world.bus.time().toFixed(4), snapshot: snap, baseline_diffs: diffs }, warmup_dt: 0.02, checkpoint_every: every, ticks: [], inputs: [], setup: [], checkpoints: [], events: [], duration_s: 0, tick_count: 0 };
      world.bus.emit('RECORDING_STARTED', { kind: kind }); return { ok: true, kind: kind, reason: reason };
    },
    tick: function (dt) { if (!S.on) return; S.rec.ticks.push(dt); S.k++; S.t += dt; if (S.dirty || S.k % every === 0) checkpoint(); S.dirty = false; },
    lastCheckpoint: function () { return S.last; },
    stop: function () { if (!S.on) return null; if (!S.last || S.last.tick !== S.k) checkpoint(); S.rec.duration_s = +S.t.toFixed(4); S.rec.tick_count = S.k; S.on = false; world.bus.emit('RECORDING_STOPPED', { inputs: S.rec.inputs.length, setup: S.rec.setup.length, events: S.rec.events.length, checkpoints: S.rec.checkpoints.length, ticks: S.k }); var out = api.export(); S.last = null; return out; },
    export: function () { return S.rec ? JSON.parse(JSON.stringify(S.rec)) : null; },
    counts: function () { return S.rec ? { inputs: S.rec.inputs.length, setup: S.rec.setup.length, events: S.rec.events.length, checkpoints: S.rec.checkpoints.length, ticks: S.k } : null; },
    destroy: function () { if (S.on) api.stop(); unhook(); }
  }; return api;
}
