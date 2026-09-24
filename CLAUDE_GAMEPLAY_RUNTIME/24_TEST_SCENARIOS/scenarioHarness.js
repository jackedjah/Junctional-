/* MAHWORLD GAMEPLAY RUNTIME :: SCENARIO HARNESS (headless; deterministic; no GPU, no DOM, no Blender)
   Composes the Phase 2 world with every Phase 4 system exactly the way the sandbox does, then exposes one `tick`. Player position is a
   logical point (teleport / walk helper) because the headless runtime has no kinematic controller — scenarios test logic, not physics.
   Input handlers wired here are the SAME contract the sandbox wires: the router dispatches authoritative actions, handlers call systems. */
import { bootstrapHeadless } from '../00_CORE/bootstrap.js';
import { createProfileStore, createMemoryStorage } from '../18_PERSISTENCE/PlayerProfileStore.js';
import { createInputRouter } from '../19_INPUT/InputRouter.js';
import { createFlightControls } from '../19_INPUT/FlightControls.js';
import { createInteractionSystem, createDoorTransition, standardHandlers } from '../20_INTERACTIONS/InteractionSystem.js';
import { createWorldRegistry } from '../21_WORLD_SCHEMA/WorldRegistry.js';
import { createDuelBot } from '../22_DEBUG_BOT/DuelBot.js';
import { createSessionRecorder } from '../23_REPLAY/SessionRecorder.js';
import { createAttackExecution } from '../05_ECCENTRIC/EccentricRuntime.js';
import { createDuelSession } from '../07_DUEL/DuelSession.js';
import { createSpectatorSystem } from '../08_SPECTATOR/SpectatorSystem.js';
import { createClimbingHooks, createActivitySession } from '../09_ACTIVITIES/ActivitySession.js';
import { createMentorQuest, DEV_INTRO_QUEST } from '../11_MENTORS/MentorQuest.js';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

var ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function loadWorldData() { return JSON.parse(fs.readFileSync(path.join(ROOT, '21_WORLD_SCHEMA/data/worlds.dev.json'), 'utf8')); }

export async function createScenarioWorld(opts) {
  var o = opts || {}; var world = await bootstrapHeadless({ classId: o.classId || 'ATHLETE', sex: o.sex || 'F' }); var cfg = world.cfg, bus = world.bus;
  var worlds = createWorldRegistry(loadWorldData()); var worldId = o.worldId || 'WORLD_DEV_01'; var spawn = worlds.defaultSpawn(worldId);
  var storage = o.storage || createMemoryStorage(); var store = createProfileStore(cfg, storage, bus);
  var player = { id: world.profile.character_id, position: { x: spawn.position.x, y: 0, z: spawn.position.z }, form: 'FUSED', level: 1, altitude_m: 0, in_combat: false, unlocks: [], mentor_completed: [] };
  var interactions = createInteractionSystem(world); var door = createDoorTransition(world); var climb = createClimbingHooks(bus, { locomotion: world.loco }); var flightControls = createFlightControls(world, {});
  var D = { duel: null, spectators: null, bot: null, mentorQuest: null, activity: null, attackExec: null, seed: o.seed === undefined ? 7 : o.seed };
  function duelSession() { return D.duel; }
  function startDuel() { if (D.duel && D.duel.inCombat()) return { ok: false, reason: 'ALREADY_IN_DUEL' }; bus.emit('SETUP_ACTION', { kind: 'START_DUEL', args: { seed: D.seed } }); D.duel = createDuelSession(cfg, bus, { fighter_a: player.id, fighter_b: 'SPARRING_BOT' }); D.spectators = createSpectatorSystem(cfg, bus, { duel: D.duel, policies: world.policies }); D.duel.challenge(); D.duel.accept(); var r = D.duel.lock(); if (!r.ok) return r; world.flight.setContext({ combat: true }); D.bot = createDuelBot(world, { seed: D.seed, position: { x: player.position.x, y: 0, z: player.position.z - 3 }, createAttackExecution: createAttackExecution, applyDamage: function (target, amount, meta) { return D.duel.applyDamage(target, amount, meta); } }); bus.emit('DUEL_BOT_SPAWNED', { seed: D.seed }); return { ok: true, session: D.duel.id }; }
  function endDuel() { if (!D.duel) return { ok: false }; if (D.duel.inCombat()) D.duel.cancel('left'); if (/RESULT|POST_FIGHT/.test(D.duel.state())) D.duel.close(); world.flight.setContext({ combat: false }); return { ok: true }; }
  var handlers = standardHandlers(world, { door: door, climb: climb, flight: flightControls,
    mentor: function (pt) { if (D.mentorQuest) return { ok: false, reason: 'ALREADY_ACCEPTED' }; D.mentorQuest = createMentorQuest(cfg, bus, DEV_INTRO_QUEST); var r = D.mentorQuest.accept(world.profile); if (world.loco.form() === 'FUSED') D.mentorQuest.complete('ARRIVE_FUSED'); return Object.assign({ session: 'MENTOR', quest: D.mentorQuest.id }, r); },
    duel: function () { return Object.assign({ session: 'DUEL' }, startDuel()); },
    activity: function (pt) { D.activity = createActivitySession(cfg, bus, { activity_id: pt.interaction_id + '_SESSION', type: pt.activity_type || 'OUTDOOR_WORKOUT', location_id: pt.interaction_id }); return Object.assign({ session: 'ACTIVITY' }, D.activity.join({ id: player.id, present_at: pt.interaction_id, form: world.loco.form() })); } });
  worlds.interactionPoints(worldId).forEach(function (pt) { pt.session_handler = handlers[pt.type]; interactions.register(pt); });
  var xpGranted = false; var duelResolvedHook = null;
  /* authoritative action handlers (same contract as the sandbox) */
  world.input.on('TRANSFORM', function () { return world.loco.form() === 'FUSED' ? world.loco.transformToSplit() : world.loco.transformToFused(); });
  world.input.on('SELECT_MOVEMENT_PATTERN', function (ev) { return world.kit.selectPattern(ev.pattern_id); });
  world.input.on('INTERACT', function () { return interactions.interact(playerView()); });
  world.input.on('ENTER_FLIGHT', function () { return flightControls.enterFlight(); }); world.input.on('EXIT_FLIGHT', function () { return flightControls.exitFlight(); });
  world.input.on('JUMP_ASCEND', function () { return flightControls.ascend(); }); world.input.on('DESCEND', function () { return flightControls.descend(); });
  world.input.on('MOVE', function (ev) { var moving = (ev.forward || 0) !== 0 || (ev.strafe || 0) !== 0; return world.loco.move(moving ? (ev.run ? 'RUN' : 'MOVE') : 'STOP'); });
  function fire(hint) { var r = world.kit.resolve(hint, world.loco.form(), { combat: !!(D.duel && D.duel.inCombat()) }); if (!r.ok) { bus.emit('ATTACK_INPUT_REFUSED', r); return r; } if (D.attackExec && !/COMPLETE|REFUSED|INTERRUPTED/.test(D.attackExec.state().state)) return { ok: false, reason: 'ATTACK_IN_PROGRESS' }; D.attackExec = createAttackExecution(cfg, bus, { attack: r.attack, attacker: player.id, target: 'SPARRING_BOT', resource: world.resource, applyDamage: function (target, amount, meta) { var a = D.bot ? D.bot.incoming(amount, meta) : amount; return D.duel ? D.duel.applyDamage(target, a, meta) : { applied: 0, reason: 'NO_DUEL' }; } }); var s = D.attackExec.start(); if (s.ok) world.kit.startCooldown(r.attack); return s; }
  ['UP', 'DOWN', 'LEFT', 'RIGHT'].forEach(function (dir) { world.input.on('ATTACK_DIRECTION_' + dir, function () { return fire(dir); }); }); world.input.on('ATTACK_PRIMARY', function () { return fire('TAP'); }); world.input.on('ATTACK_SECONDARY', function () { return fire('HOLD'); });
  world.input.on('EMOTE', function () { return { ok: true, note: 'emote registry hook (no clip)' }; }); world.input.on('LOOK', function () { return { ok: true }; }); world.input.on('MENU', function () { return { ok: true, menu: 'DEBUG_MENU_PLACEHOLDER' }; });
  function checkpointExtra() { var s = D.duel ? D.duel.snapshot() : null; return { duel: D.duel ? D.duel.state() : null, health: s ? Object.keys(s.health).map(function (k) { return k + ':' + s.health[k]; }).join(' ') : null, bot: D.bot ? D.bot.state().state : null, bot_decisions: D.bot ? D.bot.state().decisions : 0, door: door.state().state, pos_x: +player.position.x.toFixed(3), pos_z: +player.position.z.toFixed(3) }; }
  var router = createInputRouter(world, {}); var recorder = createSessionRecorder(world, { seed: D.seed, checkpointExtra: checkpointExtra });
  function playerView() { player.form = world.loco.form(); player.level = world.profile.level; player.altitude_m = world.flight.state().altitude_m; player.in_combat = !!(D.duel && D.duel.inCombat()); player.mentor_completed = world.profile.mentor_progress.completed.slice(); return player; }
  var H = {
    world: world, cfg: cfg, bus: bus, worlds: worlds, worldId: worldId, store: store, storage: storage, player: player, interactions: interactions, door: door, climb: climb, flightControls: flightControls, router: router, recorder: recorder, startDuel: startDuel, endDuel: endDuel, duel: duelSession, spectators: function () { return D.spectators; }, bot: function () { return D.bot; }, mentorQuest: function () { return D.mentorQuest; }, activity: function () { return D.activity; }, attackExec: function () { return D.attackExec; }, seed: D.seed,
    moveTo: function (x, z) { bus.emit('SETUP_ACTION', { kind: 'TELEPORT', args: { x: x, z: z } }); player.position.x = x; player.position.z = z; return H; }, checkpointExtra: checkpointExtra, moveToPoi: function (poiId) { var p = worlds.poi(worldId, poiId); if (!p) throw new Error('unknown poi ' + poiId); return H.moveTo(p.position.x, p.position.z); },
    onDuelResolved: function (fn) { duelResolvedHook = fn; },
    tick: function (dt) {
      world.tick(dt, { form: world.loco.form(), speed_mps: 0, flying: world.flight.state().state !== 'GROUNDED' }); door.tick(dt); flightControls.tick(); if (D.attackExec) D.attackExec.tick(dt); if (D.activity) D.activity.tick(dt);
      if (D.duel) { D.duel.tick(dt); if (D.bot) { var snap = D.duel.snapshot(); D.bot.tick(dt, playerView(), D.duel.state(), snap.health['SPARRING_BOT']); } var st = D.duel.state(); if ((st === 'POST_FIGHT' || st === 'RESULT') && !xpGranted) { xpGranted = true; world.progression.duelReward(world.profile, D.duel.snapshot().winner === player.id); if (duelResolvedHook) duelResolvedHook(D.duel.snapshot()); } if (st === 'CLOSED' || st === 'CANCELLED') xpGranted = false; }
      interactions.tick(playerView()); recorder.tick(dt);
    },
    run: function (seconds) { var n = Math.round(seconds / 0.02); for (var i = 0; i < n; i++) H.tick(0.02); return H; },
    runUntil: function (pred, maxSeconds) { var t = 0; while (t < (maxSeconds || 30)) { H.tick(0.02); t += 0.02; if (pred()) return true; } return false; }
  };
  return H;
}

/* Phase 4.1: isolated-simulation factory for IsolatedReplay — a fresh harness world (same composition, same seed); setup actions are re-issued by kind */
export async function createHarnessSimulation(record) {
  var H = await createScenarioWorld({ seed: record.seed === null ? undefined : record.seed });
  return { world: H.world, harness: H, tick: H.tick, checkpointExtra: H.checkpointExtra, setup: function (s) { if (s.kind === 'START_DUEL') return H.startDuel(); if (s.kind === 'TELEPORT') return H.moveTo(s.args.x, s.args.z); return { ok: false, reason: 'UNKNOWN_SETUP_KIND ' + s.kind }; }, destroy: function () { H.endDuel(); } };
}
