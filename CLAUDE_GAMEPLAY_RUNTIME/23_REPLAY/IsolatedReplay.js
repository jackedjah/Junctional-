/* MAHWORLD GAMEPLAY RUNTIME :: ISOLATED REPLAY (Phase 4.1)
   Replays a SessionRecorder record (format 1.1.0) inside a SEPARATE simulation built by the caller from the SAME runtime composition
   (`createSimulation(record)` → { world, tick(dt), setup(s), applyInput?(inp), checkpointExtra?, destroy() }). The live world is never
   touched: no live input handler runs, no live MAHGIC is spent, no live XP / stats / saves change. Damage and rewards computed here are
   SIMULATED and stay inside the simulation, which is destroyed on finish / stop.

   Reproducible start = FRESH_BASELINE only (recording began before any gameplay activity since boot; idle time is re-run at a fixed step).
   Any other start state, format, runtime identity or unsupported setup action is REJECTED with explicit reasons — never silently
   substituted. Timing = the recorded per-tick dt list; ordered setup actions + inputs are re-issued at their recorded tick indices.
   Comparison = recorded checkpoints (mahloco state, form, resource, flight, pattern, xp, level + caller extras such as duel / health /
   bot / position) and the ordered key-event signatures; the FIRST divergence is reported with tick, simulation time, responsible action
   and expected-vs-actual fields. */
import { createSessionRecorder, runtimeIds, RECORD_FORMAT, compareCheckpoint } from './SessionRecorder.js';

export function validateRecord(record, ids) {
  var r = [];
  if (!record || typeof record !== 'object') return { ok: false, reasons: ['NOT_A_RECORD'] };
  if (record.format_version !== RECORD_FORMAT) r.push('FORMAT_VERSION ' + record.format_version + ' != ' + RECORD_FORMAT);
  if (!record.start) r.push('NO_START_STATE'); else if (record.start.kind !== 'FRESH_BASELINE') r.push('START_STATE_UNSUPPORTED: ' + record.start.kind + (record.start.reason ? ' — ' + record.start.reason : ''));
  if (!Array.isArray(record.ticks) || !record.ticks.length) r.push('NO_TICKS');
  (record.setup || []).forEach(function (s) { if (s.unsupported) r.push('UNSUPPORTED_SETUP at tick ' + s.tick + ': ' + s.kind + ' ' + (s.args && s.args.name || '') + ' (not reproducible in isolation)'); });
  if (ids && record.runtime) Object.keys(ids).forEach(function (k) { if (record.runtime[k] !== ids[k]) r.push('RUNTIME_MISMATCH ' + k + ': recorded ' + JSON.stringify(record.runtime[k]) + ' != ' + JSON.stringify(ids[k])); });
  if (ids && !record.runtime) r.push('NO_RUNTIME_IDS');
  return { ok: !r.length, reasons: r };
}

export function createIsolatedReplay(record, deps) {
  var d = deps || {}; if (typeof d.createSimulation !== 'function') throw new Error('createIsolatedReplay needs createSimulation');
  var N = record && Array.isArray(record.ticks) ? record.ticks.length : 0; var actionsAt = {}, cpAt = {};
  /* one ordered action list per tick (inputs + independent setup, by recorded seq); nested setup is skipped — the replayed input reproduces it */
  (record && record.inputs || []).forEach(function (i) { (actionsAt[i.tick] = actionsAt[i.tick] || []).push({ kind: 'INPUT', seq: i.seq || 0, input: i }); }); (record && record.setup || []).forEach(function (s) { if (!s.nested) (actionsAt[s.tick] = actionsAt[s.tick] || []).push({ kind: 'SETUP', seq: s.seq || 0, setup: s }); }); Object.keys(actionsAt).forEach(function (k) { actionsAt[k].sort(function (a, b) { return a.seq - b.seq; }); }); (record && record.checkpoints || []).forEach(function (c) { cpAt[c.tick] = c; });
  var S = { status: 'IDLE', k: 0, sim: null, rec: null, first: null, eventDiv: null, result: null, simulated: null, tOf: [] };
  var acc = 0; for (var i = 0; i < N; i++) { acc += record.ticks[i]; S.tOf[i + 1] = +acc.toFixed(4); } S.tOf[0] = 0;
  function responsible(tick) { var best = null; (record.setup || []).concat(record.inputs || []).forEach(function (a) { if (a.tick <= tick && (!best || a.tick >= best.tick)) best = a; }); return best ? { tick: best.tick, t: S.tOf[best.tick], kind: best.action ? 'INPUT' : 'SETUP', action: best.action || (best.kind + (best.args && best.args.name ? ' ' + best.args.name : '')) } : null; }
  function reject(reasons) { S.status = 'REJECTED'; S.result = { ok: false, status: 'REJECTED', matched: false, reasons: reasons }; if (S.sim) { try { S.sim.destroy(); } catch (e) { /* cleanup never throws upward */ } S.sim = null; } return S.result; }
  function finish() {
    var out = S.rec.stop(); var exp = (record.events || []).map(function (e) { return e.sig; }), got = (out.events || []).map(function (e) { return e.sig; }); var idx = -1;
    for (var j = 0; j < Math.max(exp.length, got.length); j++) { if (exp[j] !== got[j]) { idx = j; break; } }
    if (idx >= 0) { var er = (record.events || [])[idx], ea = (out.events || [])[idx]; S.eventDiv = { index: idx, tick: er ? er.tick : (ea ? ea.tick : null), t: S.tOf[er ? er.tick : (ea ? ea.tick : 0)], expected: exp[idx] || null, actual: got[idx] || null, responsible: responsible(er ? er.tick : (ea ? ea.tick : 0)) }; }
    var last = out.checkpoints[out.checkpoints.length - 1] || null; S.simulated = { label: 'SIMULATED — not applied to the live session', final_checkpoint: last, xp: S.sim.world.profile.xp, level: S.sim.world.profile.level, resource: S.sim.world.resource.state().current };
    var matched = !S.first && !S.eventDiv; S.status = 'FINISHED';
    var fd = S.first || (S.eventDiv ? { tick: S.eventDiv.tick, t: S.eventDiv.t, fields: [{ field: 'event_sequence[' + S.eventDiv.index + ']', expected: S.eventDiv.expected, actual: S.eventDiv.actual }], responsible: S.eventDiv.responsible } : null);
    S.result = { ok: true, status: 'FINISHED', matched: matched, verdict: matched ? 'MATCHED' : 'DIVERGED', ticks: N, duration_s: S.tOf[N], first_divergence: fd, checkpoint_divergence: S.first, event_divergence: S.eventDiv, recorded_events: exp.length, replayed_events: got.length, simulated: S.simulated, replayed_record: out };
    try { S.sim.destroy(); } catch (e) { /* cleanup never throws upward */ } S.sim = null; S.rec = null; return S.result;
  }
  var api = {
    status: function () { return S.status; }, progress: function () { return { tick: S.k, total: N, t: S.tOf[S.k] || 0 }; }, result: function () { return S.result; },
    start: async function () {
      if (S.status !== 'IDLE') return { ok: false, status: S.status, reasons: ['ALREADY_STARTED'] };
      var v = validateRecord(record); if (!v.ok) return reject(v.reasons); S.status = 'PREPARING';
      try { S.sim = await d.createSimulation(record); } catch (e) { return reject(['SIMULATION_FAILED: ' + (e && e.message || e)]); }
      var v2 = validateRecord(record, runtimeIds(S.sim.world)); if (!v2.ok) return reject(v2.reasons);
      S.rec = createSessionRecorder(S.sim.world, { seed: record.seed, checkpointEvery: record.checkpoint_every, checkpointExtra: S.sim.checkpointExtra || null });
      /* idle warm-up: the recording began after `elapsed_s` of activity-free time; re-run it at a fixed step (documented approximation of the live frame dts) */
      var warm = record.start.elapsed_s || 0, wdt = record.warmup_dt || 0.02, guard = 0; while (S.sim.world.bus.time() < warm - 1e-9 && guard++ < 2000000) { var step = Math.min(wdt, warm - S.sim.world.bus.time()); S.sim.tick(step); }
      var st = S.rec.start(); if (st.kind !== 'FRESH_BASELINE') return reject(['SIMULATION_NOT_BASELINE: ' + st.reason]);
      S.status = 'RUNNING'; return { ok: true, status: 'RUNNING' };
    },
    step: function (n) {
      if (S.status !== 'RUNNING') return S.status; var count = n === undefined ? 1 : n;
      for (var i = 0; i < count && S.k < N; i++) {
        var k = S.k; (actionsAt[k] || []).forEach(function (a) { if (a.kind === 'SETUP') S.sim.setup(a.setup); else if (S.sim.applyInput) S.sim.applyInput(a.input); else S.sim.world.input.dispatch(a.input.action, Object.assign({}, a.input.payload), 'REPLAY'); });
        var dt = record.ticks[k]; S.sim.tick(dt); S.rec.tick(dt); S.k++;
        var exp = cpAt[S.k]; if (exp && !S.first) { var got = S.rec.lastCheckpoint(); if (got && got.tick === S.k) { var diffs = compareCheckpoint(exp, got); if (diffs.length) S.first = { tick: S.k, t: S.tOf[S.k], fields: diffs, responsible: responsible(S.k) }; } }
      }
      if (S.k >= N && S.status === 'RUNNING') finish(); return S.status;
    },
    run: function () { var guard = 0; while (S.status === 'RUNNING' && guard++ < 10000000) api.step(1000); return S.result; },
    stop: function () { if (S.status === 'RUNNING' || S.status === 'PREPARING') { if (S.rec) S.rec.stop(); if (S.sim) { try { S.sim.destroy(); } catch (e) { /* cleanup never throws upward */ } } S.sim = null; S.rec = null; S.status = 'STOPPED'; S.result = { ok: false, status: 'STOPPED', matched: false, stopped_at_tick: S.k, t: S.tOf[S.k] || 0 }; } return S.result; },
    describe: function () { var r = S.result; if (!r) return S.status === 'RUNNING' ? 'ISOLATED REPLAY running · tick ' + S.k + '/' + N + ' · t ' + (S.tOf[S.k] || 0).toFixed(2) + ' s' : 'ISOLATED REPLAY ' + S.status; if (r.status === 'REJECTED') return 'ISOLATED REPLAY REJECTED — ' + r.reasons.join('; '); if (r.status === 'STOPPED') return 'ISOLATED REPLAY STOPPED at tick ' + r.stopped_at_tick + ' (simulation destroyed)'; if (r.matched) return 'REPLAY FINISHED · MATCHED · ' + r.ticks + ' ticks / ' + r.duration_s.toFixed(2) + ' s · SIMULATED xp ' + r.simulated.xp + ' level ' + r.simulated.level; var f = r.first_divergence; return 'REPLAY FINISHED · DIVERGED at t ' + (f.t || 0).toFixed(2) + ' s (tick ' + f.tick + ')' + (f.responsible ? ' after ' + f.responsible.kind + ' ' + f.responsible.action + ' @ t ' + (f.responsible.t || 0).toFixed(2) : '') + ' · ' + f.fields.map(function (x) { return x.field + ': expected ' + JSON.stringify(x.expected) + ' vs actual ' + JSON.stringify(x.actual); }).join(' · '); }
  };
  return api;
}
