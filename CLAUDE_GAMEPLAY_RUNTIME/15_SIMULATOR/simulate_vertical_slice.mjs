/* MAHWORLD GAMEPLAY RUNTIME :: HEADLESS VERTICAL-SLICE SIMULATOR (CLI, no graphics)
   node 15_SIMULATOR/simulate_vertical_slice.mjs [--class ATHLETE] [--sex F] [--policy A|B|C] [--log out.json]
   Walks: CREATE PROFILE → SPAWN → FUSED MOVE → UNFUSE → SPLIT MOVE → ACCEPT MENTOR CONTRACT → START DUEL → SELECT PATTERN →
   EXECUTE UPRIGHT ROW → MAIN DAMAGE → ECCENTRIC TICKS → END DUEL → XP REWARD → REFUSE → FUSED TRAVEL, printing every state transition. */
import fs from 'node:fs'; import path from 'node:path';
import { bootstrapHeadless } from '../00_CORE/bootstrap.js';
import { createAttackExecution } from '../05_ECCENTRIC/EccentricRuntime.js';
import { createDuelSession } from '../07_DUEL/DuelSession.js';
import { createSpectatorSystem } from '../08_SPECTATOR/SpectatorSystem.js';
import { createMentorQuest, DEV_INTRO_QUEST } from '../11_MENTORS/MentorQuest.js';

var args = process.argv.slice(2); function arg(n, d) { var i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; }
var W = await bootstrapHeadless({ classId: arg('class', 'ATHLETE'), sex: arg('sex', 'F') }); var cfg = W.cfg, bus = W.bus;
var step = 0; var seen = W.bus.events().length;
function say(title) { console.log('\n== ' + (++step) + '. ' + title); }
function flush() { var ev = bus.events().slice(seen); seen = bus.events().length; ev.forEach(function (e) { if (/^MAHLOCO_(STATE_ENTER|DL_|SPLIT_COMPLETE|FUSE_COMPLETE)|^(ATTACK_|DUEL_|PATTERN_|TRANSFORM_|XP_|LEVEL_|MENTOR_|RESOURCE_DEPLETED|FLIGHT_STATE|CALL_NEXT|SPECTATOR_|IDLE_FLOURISH_TRIGGER|STAT_)/.test(e.name)) console.log('   [' + e.t.toFixed(2) + 's] ' + e.name + ' ' + JSON.stringify(e.payload).slice(0, 150)); }); }
function run(seconds, sample) { var n = Math.round(seconds / 0.05); for (var i = 0; i < n; i++) W.tick(0.05, sample); }

say('CREATE ' + W.profile.class_id + ' PROFILE (development prototype class; readiness ' + W.profile.visual.readiness + ', eye system ' + W.profile.visual.eye_system + ')');
console.log('   character ' + W.profile.character_id + ' · patterns ' + W.profile.movement_pattern_loadout.patterns.join('/') + ' (' + W.profile.movement_pattern_loadout.status + ') · iris ' + W.profile.visual.iris_color + ' · flourish ' + W.profile.idle_personality.flourish_id + ' every ' + W.profile.idle_personality.interval_s + 's');
say('SPAWN — fused hover idle; resource ' + JSON.stringify(W.resource.state())); run(cfg.idleFlourishIntervalS() + 0.1, { form: 'FUSED', speed_mps: 0 }); W.flourish.tick(0, { idle: true }); for (var i = 0; i < Math.round(cfg.idleFlourishIntervalS() / 0.5) + 1; i++) W.flourish.tick(0.5, { idle: true }); flush();
say('FUSED MOVE — glide within ' + JSON.stringify(W.capabilities.getMovementSpeedRange('FUSED').mph) + ' mph; travel flight ceiling ' + W.capabilities.getFlightCeiling('FUSED') + ' m');
W.loco.move('GLIDE'); var v = W.capabilities.getMovementSpeedRange('FUSED'); W.flight.requestAltitude('FUSED', 20); run(1.0, { form: 'FUSED', speed_mps: v.max, flying: true }); console.log('   flight ' + JSON.stringify(W.flight.state())); W.flight.land(); run(1.0, { form: 'FUSED', speed_mps: v.max }); W.loco.move('STOP'); flush();
say('UNFUSE — mahloco authoritative (asymmetric chain)'); var r = W.loco.transformToSplit(); console.log('   request -> ' + JSON.stringify(r)); run(2.0, { form: 'SPLIT', speed_mps: 0 }); console.log('   form now ' + W.loco.form() + ' state ' + W.loco.snapshot().state); flush();
say('SPLIT MOVE — walk within ' + JSON.stringify(W.capabilities.getMovementSpeedRange('SPLIT').mph) + ' mph; backpedal x' + cfg.backwardMultiplier() + '; climb ' + JSON.stringify(W.capabilities.canClimb('SPLIT')));
W.loco.move('MOVE'); var s = W.capabilities.getMovementSpeedRange('SPLIT'); run(1.0, { form: 'SPLIT', speed_mps: s.min }); W.loco.move('STOP'); run(0.6, { form: 'SPLIT', speed_mps: 0 }); flush();
say('ACCEPT MENTOR CONTRACT — ' + DEV_INTRO_QUEST.quest_id + ' (' + DEV_INTRO_QUEST.type + ', placeholder mentor)'); var quest = createMentorQuest(cfg, bus, DEV_INTRO_QUEST); quest.accept(W.profile); quest.complete('ARRIVE_FUSED'); quest.complete('UNFUSE_AND_CROSS'); flush();
say('START DUEL — locked 1v1 vs scripted sparring partner; combat flight cap ' + cfg.combatFlightCapFt() + ' ft = ' + cfg.combatFlightCapM().toFixed(2) + ' m');
var duel = createDuelSession(cfg, bus, { fighter_a: W.profile.character_id, fighter_b: 'SPARRING_BOT' }); var spec = createSpectatorSystem(cfg, bus, { duel: duel, policies: W.policies }); if (arg('policy')) W.policies.select('CALL_NEXT_POLICY', arg('policy'));
duel.challenge(); duel.accept(); duel.lock(); W.flight.setContext({ combat: true }); spec.join('SPECTATOR_1'); spec.join('SPECTATOR_2'); spec.callNext('SPECTATOR_2'); spec.callNext('SPECTATOR_1'); console.log('   combat flight ceiling now ' + W.flight.state().ceiling_m.toFixed(2) + ' m (was travel ' + W.capabilities.getFlightCeiling('SPLIT') + ' m)'); flush();
say('SELECT MOVEMENT PATTERN — VERTICAL_PULL through the input abstraction (touch: tap_pattern_button)'); W.input.on('SELECT_MOVEMENT_PATTERN', function (ev) { return W.kit.selectPattern(ev.pattern_id); }); W.input.fromDevice('TOUCH', 'tap_pattern_button', { pattern_id: 'VERTICAL_PULL' }); flush();
say('EXECUTE UPRIGHT ROW — ATHLETE_BILATERAL_UPRIGHT_ROW_MANIFESTATION (DEVELOPMENT_REFERENCE fixture) via ATTACK_SECONDARY (touch: hold)');
var resolved = null; W.input.on('ATTACK_SECONDARY', function (ev) { resolved = W.kit.resolve('HOLD', W.loco.form(), { airborne: false }); return resolved; }); W.input.fromDevice('TOUCH', 'hold');
console.log('   resolve -> ' + (resolved.ok ? resolved.attack.attack_id : JSON.stringify(resolved)));
var exec = createAttackExecution(cfg, bus, { attack: resolved.attack, attacker: W.profile.character_id, target: 'SPARRING_BOT', resource: W.resource, applyDamage: function (t, amount, meta) { return duel.applyDamage(t, amount, meta); } });
console.log('   eccentric plan ' + JSON.stringify(exec.plan)); exec.start(); W.kit.startCooldown(resolved.attack);
say('MAIN DAMAGE'); while (exec.state().state === 'CONCENTRIC' || exec.state().state === 'PEAK_TRANSITION') { exec.tick(0.05); W.tick(0.05, { form: W.loco.form(), speed_mps: 0 }); } flush();
say('ECCENTRIC TICKS — descending continuation, darker, lower progressive damage'); while (exec.state().state === 'ECCENTRIC') { exec.tick(0.05); W.tick(0.05, { form: W.loco.form(), speed_mps: 0 }); } flush(); console.log('   dealt ' + JSON.stringify(exec.state().dealt) + ' (eccentric tail below main: ' + (exec.state().dealt.eccentric < exec.state().dealt.main) + ')');
say('END DUEL — finish the sparring partner with basic attacks, resolve, offer Call Next');
W.kit.selectPattern('HORIZONTAL_PUSH'); var guard = 0; while (duel.state() === 'ACTIVE' && guard++ < 60) { var rr = W.kit.resolve('UP', W.loco.form()); if (rr.ok) { var ex = createAttackExecution(cfg, bus, { attack: rr.attack, attacker: W.profile.character_id, target: 'SPARRING_BOT', resource: W.resource, applyDamage: function (t, a, m) { return duel.applyDamage(t, a, m); } }); ex.start(); W.kit.startCooldown(rr.attack); while (ex.state().state !== 'COMPLETE') { ex.tick(0.05); W.tick(0.05, { form: W.loco.form(), speed_mps: 0 }); duel.tick(0.05); } } else { W.tick(0.05, { form: W.loco.form(), speed_mps: 0 }); duel.tick(0.05); } }
for (var k = 0; k < 60; k++) { duel.tick(0.05); W.tick(0.05, { form: W.loco.form(), speed_mps: 0 }); } var off = spec.offerNext(); var dec = spec.decline(); console.log('   duel ' + JSON.stringify(duel.snapshot().health) + ' winner ' + duel.snapshot().winner + ' · call-next offer ' + JSON.stringify(off) + ' · decline under policy ' + dec.policy + ' (' + dec.classification + ', ' + dec.open_decision + ') -> ' + JSON.stringify({ next_offer: dec.next_offer, matched: dec.matched, defender: dec.defender })); duel.close(); W.flight.setContext({ combat: false }); flush();
say('XP REWARD — permanent progression event (separate from temporary buffs)'); W.progression.duelReward(W.profile, duel.snapshot().winner === W.profile.character_id); quest.complete('COMPLETE_SPARRING_DUEL'); quest.finish(W.profile, W.progression); console.log('   profile level ' + W.profile.level + ' xp ' + W.profile.xp + ' mentors completed ' + JSON.stringify(W.profile.mentor_progress.completed)); flush();
say('REFUSE — cheap magnetic chain (mahloco)'); run(1.0, { form: 'SPLIT', speed_mps: 0 }); var rf = W.loco.transformToFused(); console.log('   request -> ' + JSON.stringify(rf)); run(1.5, { form: 'FUSED', speed_mps: 0 }); console.log('   form now ' + W.loco.form() + ' state ' + W.loco.snapshot().state); flush();
say('FUSED TRAVEL — dash then glide; travel flight ceiling restored to ' + W.capabilities.getFlightCeiling('FUSED') + ' m'); W.loco.move('DASH'); run(0.5, { form: 'FUSED', speed_mps: v.max }); W.loco.move('GLIDE'); run(1.0, { form: 'FUSED', speed_mps: v.max }); flush();
console.log('\n== TELEMETRY ' + JSON.stringify(W.telemetry.report()));
console.log('== POLICIES ' + JSON.stringify(W.policies.describe()));
var out = arg('log', null); if (out) { W.telemetry.writeLocal(fs, path.resolve(out)); console.log('== telemetry log written ' + out); }
console.log('\nHEADLESS VERTICAL SLICE: ' + (W.loco.form() === 'FUSED' && duel.state() === 'CLOSED' && W.profile.xp >= 0 && exec.state().state === 'COMPLETE' ? 'COMPLETE' : 'INCOMPLETE'));
