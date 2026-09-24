/* MAHWORLD GAMEPLAY RUNTIME :: PHASE 4.1 TESTS — isolated replay + reproducible recording (headless, no GPU / DOM / Blender)
   node 16_TESTS/gameplay_phase4_1.test.mjs   (from CLAUDE_GAMEPLAY_RUNTIME) */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createScenarioWorld, createHarnessSimulation } from '../24_TEST_SCENARIOS/scenarioHarness.js';
import { createSessionRecorder, RECORD_FORMAT, runtimeIds, BASELINE } from '../23_REPLAY/SessionRecorder.js';
import { createIsolatedReplay, validateRecord } from '../23_REPLAY/IsolatedReplay.js';

var ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); var pass = 0, fail = 0;
function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }
function untilForm(H, f) { return H.runUntil(function () { return H.world.loco.form() === f && !H.world.loco.transforming(); }, 20); }
async function replayOf(record) { var r = createIsolatedReplay(record, { createSimulation: createHarnessSimulation }); await r.start(); if (r.status() === 'RUNNING') r.run(); return r; }
function snapLive(H) { var s = H.duel() ? H.duel().snapshot().health : null; return { xp: H.world.profile.xp, level: H.world.profile.level, stats: JSON.stringify(H.world.profile.stats || {}), resource: H.world.resource.state().current, form: H.world.loco.form(), mahloco: H.world.loco.snapshot().state, pos: JSON.stringify(H.player.position), saves: H.storage.keys().join(','), mentor: JSON.stringify(H.world.profile.mentor_progress), health: JSON.stringify(s) }; }

/* ---- 1. record a supported session (recording starts at the fresh baseline, before any activity) ---- */
var H = await createScenarioWorld({ seed: 21 }); var rec = H.recorder;
ok('recorder is pristine at boot; format ' + RECORD_FORMAT, rec.pristine() && rec.format === RECORD_FORMAT);
H.run(0.6); var st = rec.start(); ok('recording started as FRESH_BASELINE after idle time only (elapsed recorded)', st.ok && st.kind === 'FRESH_BASELINE');
H.router.intent('MOVEMENT_PATTERN_SELECTION', 2, 'down'); H.router.intent('TRANSFORM', null, 'down'); untilForm(H, 'SPLIT'); H.router.intent('MOVE', 'forward', 'down'); H.run(1); H.router.intent('MOVE', 'forward', 'up'); H.run(0.4);
H.moveToPoi('POI_ARENA_01'); H.run(0.1); H.router.intent('INTERACT', null, 'down'); H.router.intent('ATTACK_SECONDARY', null, 'down'); H.run(3.5); H.router.intent('ATTACK_DIRECTION', 'DOWN', 'down'); H.run(1.5);
var record = rec.stop(); var live0 = snapLive(H); var liveBotDecisions = H.bot().state().decisions;
ok('record carries format / runtime ids / start / seed / ticks / inputs / setup / checkpoints / events', record.format_version === RECORD_FORMAT && record.runtime.character_id === 'MAH_ATHLETE_F' && record.runtime.tuning_version === H.cfg.raw.dev.tuning_version && record.start.kind === 'FRESH_BASELINE' && record.seed === 21 && record.ticks.length === record.tick_count && record.inputs.length >= 6 && record.setup.some(function (s) { return s.kind === 'TELEPORT'; }) && record.setup.some(function (s) { return s.kind === 'START_DUEL'; }) && record.checkpoints.length > 5 && record.events.some(function (e) { return /^ATTACK_ECCENTRIC_TICK/.test(e.sig); }));
ok('record is plain JSON; events carry signatures for comparison only (no damage application data)', typeof JSON.stringify(record) === 'string' && record.events.every(function (e) { return typeof e.sig === 'string' && !('payload' in e); }));
ok('live session had real effects (special spent MAHGIC, bot took damage)', live0.resource < H.world.resource.state().max && H.bus.count('ATTACK_MAIN_IMPACT') >= 2);

/* ---- 2. isolated replay matches, twice, and leaves the live world untouched ---- */
var r1 = await replayOf(record); var res1 = r1.result();
ok('isolated replay FINISHED · MATCHED (checkpoints + key-event sequence)', res1.status === 'FINISHED' && res1.matched === true && res1.recorded_events === res1.replayed_events && res1.first_divergence === null, res1.first_divergence || res1.reasons);
var r2 = await replayOf(record); var res2 = r2.result();
ok('the same record replays a second time with the same verdict and identical simulated outcome', res2.matched === true && JSON.stringify(res2.simulated.final_checkpoint) === JSON.stringify(res1.simulated.final_checkpoint));
ok('simulated results are labelled and stay inside the simulation', /SIMULATED/.test(res1.simulated.label) && typeof res1.simulated.resource === 'number' && res1.simulated.final_checkpoint.duel === 'ACTIVE');
ok('live session unchanged by two replays (xp, level, stats, MAHGIC, form, mahloco, position, mentor progress, health, saves)', JSON.stringify(snapLive(H)) === JSON.stringify(live0));
ok('live duel still ACTIVE and the live bot took no extra decisions during the replays', H.duel().state() === 'ACTIVE' && H.bot().state().decisions === liveBotDecisions);
ok('eccentric ticks replayed exactly once (recorded count == replayed count, no skip, no duplicate)', record.events.filter(function (e) { return /^ATTACK_ECCENTRIC_TICK/.test(e.sig); }).length === res1.replayed_record.events.filter(function (e) { return /^ATTACK_ECCENTRIC_TICK/.test(e.sig); }).length && record.events.filter(function (e) { return /^ATTACK_ECCENTRIC_TICK/.test(e.sig); }).length > 0);
ok('seeded bot behaviour reproduced (BOT_STATE sequence identical)', record.events.filter(function (e) { return /^BOT_STATE/.test(e.sig); }).map(function (e) { return e.sig; }).join('>') === res1.replayed_record.events.filter(function (e) { return /^BOT_STATE/.test(e.sig); }).map(function (e) { return e.sig; }).join('>'));
ok('replay grants no persistent rewards: no PROFILE_SAVED / XP on the live bus beyond the live session, live storage empty', H.storage.keys().length === 0 && H.bus.count('PROFILE_SAVED') === 0);

/* ---- 3. replay after the live world changed ---- */
H.router.intent('TRANSFORM', null, 'down'); untilForm(H, 'FUSED'); H.world.progression.xpReward(H.world.profile, 77, 'LIVE_ONLY'); var live1 = snapLive(H);
var r3 = await replayOf(record); ok('replay still MATCHES after the live world moved on (fused again, +77 xp) and the live world keeps its new state', r3.result().matched === true && JSON.stringify(snapLive(H)) === JSON.stringify(live1) && H.world.profile.xp === live1.xp);

/* ---- 4. guards preserved: MIN_DWELL is honoured, not bypassed ---- */
var Hd = await createScenarioWorld({ seed: 3 }); Hd.recorder.start(); var early = Hd.router.intent('TRANSFORM', null, 'down').results[0]; Hd.run(0.6); var later = Hd.router.intent('TRANSFORM', null, 'down').results[0]; untilForm(Hd, 'SPLIT'); var recD = Hd.recorder.stop();
ok('a transform at t=0 is refused with MIN_DWELL in the live world and the refusal is recorded', early && early.accepted === false && early.reason === 'MIN_DWELL' && later && later.accepted === true && recD.events.some(function (e) { return /TRANSFORM_TO_SPLIT_REFUSED/.test(e.sig); }));
var rD = await replayOf(recD); ok('isolated replay reproduces the MIN_DWELL refusal and the later accepted transform (guard not bypassed)', rD.result().matched === true && rD.result().replayed_record.events.some(function (e) { return /TRANSFORM_TO_SPLIT_REFUSED/.test(e.sig); }));

/* ---- 5. unsupported / incompatible recordings are rejected clearly ---- */
var Hu = await createScenarioWorld({ seed: 5 }); Hu.run(0.6); Hu.router.intent('TRANSFORM', null, 'down'); untilForm(Hu, 'SPLIT'); var su = Hu.recorder.start(); Hu.run(0.5); var recU = Hu.recorder.stop();
ok('recording that starts after activity is marked UNSUPPORTED_LIVE_STATE with the reason (never silently a fresh character)', su.kind === 'UNSUPPORTED_LIVE_STATE' && /activity before recording start \(INPUT_ACTION/.test(su.reason) && recU.start.kind === 'UNSUPPORTED_LIVE_STATE');
var rU = await replayOf(recU); ok('isolated replay REJECTS the unsupported start state', rU.status() === 'REJECTED' && rU.result().reasons.some(function (x) { return /START_STATE_UNSUPPORTED/.test(x); }));
var bad = JSON.parse(JSON.stringify(record)); bad.format_version = '1.0.0'; var rF = await replayOf(bad); ok('wrong format version rejected', rF.status() === 'REJECTED' && /FORMAT_VERSION/.test(rF.result().reasons[0]));
var bad2 = JSON.parse(JSON.stringify(record)); bad2.runtime.character_id = 'MAH_TITAN_M'; bad2.runtime.tuning_version = '9.9.9'; var rR = await replayOf(bad2); ok('runtime / config identity mismatch rejected with both fields named', rR.status() === 'REJECTED' && rR.result().reasons.some(function (x) { return /RUNTIME_MISMATCH character_id/.test(x); }) && rR.result().reasons.some(function (x) { return /RUNTIME_MISMATCH tuning_version/.test(x); }));
var bad3 = JSON.parse(JSON.stringify(record)); bad3.setup.push({ tick: 0, kind: 'ACT', args: { name: 'load' }, unsupported: true }); var rS = await replayOf(bad3); ok('unsupported setup action (load) rejected', rS.status() === 'REJECTED' && /UNSUPPORTED_SETUP/.test(rS.result().reasons[0]));
ok('validateRecord on garbage', !validateRecord(null).ok && !validateRecord({}).ok && validateRecord(record, runtimeIds(H.world)).ok);

/* ---- 6. deliberate divergence reports the first meaningful difference ---- */
var tam = JSON.parse(JSON.stringify(record)); tam.inputs = tam.inputs.filter(function (i) { return i.action !== 'TRANSFORM'; }); var rT = await replayOf(tam); var resT = rT.result();
ok('tampered record (TRANSFORM removed) → DIVERGED with tick, time, responsible action and expected-vs-actual fields', resT.status === 'FINISHED' && resT.matched === false && resT.first_divergence && typeof resT.first_divergence.tick === 'number' && resT.first_divergence.fields.length > 0 && resT.first_divergence.responsible && /DIVERGED/.test(rT.describe()), resT.first_divergence);
ok('first divergence is the missing transform (form / mahloco / transforming or the transform event), not a later effect', resT.first_divergence.fields.some(function (f) { return /form|mahloco|transforming|event_sequence/.test(f.field); }) && resT.first_divergence.t <= record.checkpoints.filter(function (c) { return c.form === 'SPLIT'; })[0].t + 1e-6);

/* ---- 7. repeated start / stop leaves no duplicate subscriptions, timers or handlers ---- */
var probeCount = 0; H.world.input.on('EMOTE', function () { probeCount++; return { ok: true }; });
for (var i = 0; i < 5; i++) { var rs = createIsolatedReplay(record, { createSimulation: createHarnessSimulation }); await rs.start(); rs.step(25); rs.stop(); ok('cycle ' + (i + 1) + ': stopped mid-run, simulation destroyed, status STOPPED', rs.status() === 'STOPPED' && rs.result().stopped_at_tick === 25); }
H.world.input.dispatch('EMOTE', {}, 'TEST'); ok('live input handlers ran exactly once after 5 replay cycles (no duplicate subscriptions on the live world)', probeCount === 1);
var before = H.bus.events().length; H.bus.emit('PROBE_EVENT', {}); ok('live bus receives one event per emit (replay never hooks the live bus)', H.bus.events().length === before + 1);
ok('no timers in the replay modules (stepped by the caller, never wall clock)', !/setTimeout|setInterval|Date\.now|performance\.now/.test(fs.readFileSync(path.join(ROOT, '23_REPLAY/IsolatedReplay.js'), 'utf8') + fs.readFileSync(path.join(ROOT, '23_REPLAY/SessionRecorder.js'), 'utf8')));
ok('replay warm-up and baseline are explicit (BASELINE exported; elapsed_s recorded; warmup_dt recorded)', BASELINE.mahloco === 'FUSED_IDLE' && record.start.elapsed_s > 0.5 && record.warmup_dt === 0.02);
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
