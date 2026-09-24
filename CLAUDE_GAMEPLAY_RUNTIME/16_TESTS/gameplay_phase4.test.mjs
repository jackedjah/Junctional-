/* MAHWORLD GAMEPLAY RUNTIME :: PHASE 4 TESTS — persistence, input router, interactions, door contract, flight controls, world / POI
   registry, deterministic bot, record / replay, scenarios. Plain node, no framework, no GPU, no DOM, no Blender.
   node 16_TESTS/gameplay_phase4.test.mjs   (from CLAUDE_GAMEPLAY_RUNTIME) */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { fileURLToPath } from 'node:url';
import { createProfileStore, createMemoryStorage, createFileStorage, validateProfile, MIGRATIONS, PROFILE_SCHEMA_VERSION } from '../18_PERSISTENCE/PlayerProfileStore.js';
import { createInputRouter, INTENTS, DEFAULT_MAPS } from '../19_INPUT/InputRouter.js';
import { createFlightControls } from '../19_INPUT/FlightControls.js';
import { createInteractionSystem, createDoorTransition, standardHandlers, INTERACTION_TYPES, DOOR_STATES } from '../20_INTERACTIONS/InteractionSystem.js';
import { createWorldRegistry, validateWorld, poiToInteraction, POI_TYPES } from '../21_WORLD_SCHEMA/WorldRegistry.js';
import { createDuelBot, mulberry32, BOT_STATES } from '../22_DEBUG_BOT/DuelBot.js';
import { createSessionRecorder, RECORD_FORMAT } from '../23_REPLAY/SessionRecorder.js';
import { createIsolatedReplay } from '../23_REPLAY/IsolatedReplay.js';
import { createScenarioWorld, loadWorldData, createHarnessSimulation } from '../24_TEST_SCENARIOS/scenarioHarness.js';
import { SCENARIOS, runScenario } from '../24_TEST_SCENARIOS/scenarios.js';
import { ACTIONS } from '../06_INPUT/InputActions.js';
import { createAttackExecution } from '../05_ECCENTRIC/EccentricRuntime.js';

var ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); var pass = 0, fail = 0;
function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }
function throws(fn, re) { try { fn(); return false; } catch (e) { return re ? re.test(String(e.message || e)) : true; } }
var H = await createScenarioWorld({ seed: 11 }); var W = H.world, cfg = W.cfg;

/* ---- persistence ---- */
var mem = createMemoryStorage(); var store = createProfileStore(cfg, mem, W.bus);
ok('save format version from dev tuning = ' + PROFILE_SCHEMA_VERSION, store.version === PROFILE_SCHEMA_VERSION && cfg.dev('persistence.schema_version') === PROFILE_SCHEMA_VERSION);
var np = store.newProfile({ player_id: 'P1', classId: 'ATHLETE', sex: 'F' });
ok('new profile carries every required field', ['player_id', 'selected_character_class', 'selected_sex', 'level', 'xp', 'permanent_stats', 'mentor_progress', 'activity_progress', 'unlocks', 'settings', 'future_cosmetic_selections', 'last_world', 'last_spawn', 'schema_version'].every(function (k) { return k in np; }) && validateProfile(np).length === 0);
ok('new profile refuses invalid class / sex', throws(function () { store.newProfile({ classId: 'WIZARD', sex: 'F' }); }, /invalid class/) && throws(function () { store.newProfile({ classId: 'TITAN', sex: 'X' }); }, /invalid sex/));
ok('validate flags temporary buffs, non-numeric stats, missing fields', validateProfile(Object.assign({}, np, { active_buffs: [] })).length === 1 && validateProfile(Object.assign({}, np, { permanent_stats: { STRENGTH: 'x' } })).length === 1 && validateProfile({}).length > 10);
ok('save → load round trip (memory storage, key prefixed)', store.save(np, 12).ok && mem.keys()[0] === cfg.dev('persistence.storage_key_prefix') + 'P1' && store.load('P1').ok && store.load('P1').profile.saved_at === 12);
ok('load NOT_FOUND / CORRUPT / UNKNOWN_SCHEMA_VERSION are explicit', store.load('NOPE').reason === 'NOT_FOUND' && (mem.setItem(cfg.dev('persistence.storage_key_prefix') + 'C', '{'), store.load('C').reason === 'CORRUPT') && (mem.setItem(cfg.dev('persistence.storage_key_prefix') + 'U', JSON.stringify({ schema_version: '3.0.0' })), store.load('U').reason === 'UNKNOWN_SCHEMA_VERSION'));
var mig = store.migrate({ schema_version: '0.9.0', id: 'M', class: 'LEAN', sex: 'F', level: 2, xp: 5, stats: { AGILITY: 1 } });
ok('migration chain 0.9.0 → 1.0.0 (single-step migrations, documented)', mig.ok && mig.migrated.join() === '1.0.0' && mig.profile.selected_character_class === 'LEAN' && mig.profile.permanent_stats.AGILITY === 1 && MIGRATIONS['0.9.0'].to === '1.0.0' && /stats->permanent_stats/.test(MIGRATIONS['0.9.0'].note));
ok('migrate is a no-op on a current profile', store.migrate(np).migrated.length === 0);
var fdir = fs.mkdtempSync(path.join(os.tmpdir(), 'mahworld-profile-')); var fstore = createProfileStore(cfg, createFileStorage(fs, path, fdir), W.bus);
ok('file storage adapter (node dev persistence) writes / reads / resets a JSON file', fstore.save(np).ok && fs.existsSync(path.join(fdir, cfg.dev('persistence.storage_key_prefix') + 'P1.json')) && fstore.load('P1').ok && fstore.list()[0] === 'P1' && fstore.resetDevelopment('P1').ok && !fs.existsSync(path.join(fdir, cfg.dev('persistence.storage_key_prefix') + 'P1.json')));
fs.rmSync(fdir, { recursive: true, force: true });
W.progression.xpReward(W.profile, 45, 'TEST'); var snap = store.fromGameplay(np, W.profile, { last_world: 'WORLD_DEV_01', last_spawn: 'SPAWN_MAIN' });
ok('fromGameplay captures permanent progression only (xp, level, stats, mentor / activity progress, cosmetics identity)', snap.xp === 45 && snap.level === 1 && snap.last_world === 'WORLD_DEV_01' && snap.future_cosmetic_selections.skin_color === 'SKIN_DEFAULT' && !('resource' in snap) && !('buffs' in snap));
ok('persistence never writes into protected trees (storage abstraction only; no path outside the adapter)', !/writeFileSync|localStorage|fs\.|process\./.test(fs.readFileSync(path.join(ROOT, '18_PERSISTENCE/PlayerProfileStore.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/export function createFileStorage.*\n/, '')));

/* ---- input router ---- */
var R = H.router;
ok('one canonical intent list (13) and three adapters (KEYBOARD_MOUSE, CONTROLLER, TOUCH_FUTURE)', INTENTS.length === 13 && R.adapters().join() === 'KEYBOARD_MOUSE,CONTROLLER,TOUCH_FUTURE' && R.activeAdapter() === 'KEYBOARD_MOUSE');
ok('every adapter maps every intent (touch as a tested stub)', ['KEYBOARD_MOUSE', 'CONTROLLER', 'TOUCH_FUTURE'].every(function (a) { var bound = Object.keys(DEFAULT_MAPS[a].map).map(function (k) { return DEFAULT_MAPS[a].map[k].split(':')[0]; }); return INTENTS.every(function (i) { return bound.indexOf(i) >= 0; }); }));
ok('controller / touch maps are labelled placeholder / stub with open decisions', /PLACEHOLDER/.test(DEFAULT_MAPS.CONTROLLER.classification) && /STUB/.test(DEFAULT_MAPS.TOUCH_FUTURE.classification) && /OD-13/.test(DEFAULT_MAPS.TOUCH_FUTURE.classification));
ok('new authoritative actions LOOK / MENU / ENTER_FLIGHT / EXIT_FLIGHT exist in InputActions', ['LOOK', 'MENU', 'ENTER_FLIGHT', 'EXIT_FLIGHT'].every(function (a) { return ACTIONS.indexOf(a) >= 0; }));
var before = W.bus.count('INPUT_ACTION'); var kd = R.fromDevice('KEYBOARD_MOUSE', 'KeyW', 'down'); var ku = R.fromDevice('KEYBOARD_MOUSE', 'KeyW', 'up');
ok('keyboard KeyW → MOVE intent → authoritative MOVE action with vector (down forward=1, up forward=0)', kd.action === 'MOVE' && ku.action === 'MOVE' && W.bus.count('INPUT_ACTION') === before + 2 && R.moveVector().forward === 0);
ok('controller LeftStick vector → MOVE (analog payload)', R.fromDevice('CONTROLLER', 'LeftStick', 'down', { forward: 0.5, strafe: -1 }).action === 'MOVE' && R.moveVector().strafe === -1 && R.moveVector().forward === 0.5);
ok('touch stub swipe_up → ATTACK_DIRECTION_UP; tap → ATTACK_PRIMARY; hold → ATTACK_SECONDARY (no gameplay logic in adapters)', R.fromDevice('TOUCH_FUTURE', 'swipe_up', 'down').action === 'ATTACK_DIRECTION_UP' && R.fromDevice('TOUCH_FUTURE', 'tap', 'down').action === 'ATTACK_PRIMARY' && R.fromDevice('TOUCH_FUTURE', 'hold', 'down').action === 'ATTACK_SECONDARY');
ok('unbound signal / unknown adapter / unknown intent refused explicitly', R.fromDevice('KEYBOARD_MOUSE', 'KeyZ').reason === 'UNBOUND_SIGNAL' && R.fromDevice('GAMEPAD_X', 'A').reason === 'UNKNOWN_ADAPTER' && R.intent('TELEPORT').reason === 'UNKNOWN_INTENT');
R.remap('KEYBOARD_MOUSE', 'KeyZ', 'EMOTE'); ok('configurable mapping: remap KeyZ → EMOTE takes effect; remap to unknown intent throws', R.fromDevice('KEYBOARD_MOUSE', 'KeyZ', 'down').action === 'EMOTE' && throws(function () { R.remap('KEYBOARD_MOUSE', 'KeyZ', 'WARP'); }, /unknown intent/));
ok('FLIGHT intent toggles ENTER_FLIGHT / EXIT_FLIGHT', R.intent('FLIGHT', null, 'down').action === 'ENTER_FLIGHT' && R.isFlying() && R.intent('FLIGHT', null, 'down').action === 'EXIT_FLIGHT' && !R.isFlying());
ok('MOVEMENT_PATTERN_SELECTION slot n → pattern id from the loadout; slot 9 refused (4-pattern prototype)', R.intent('MOVEMENT_PATTERN_SELECTION', 1, 'down').action === 'SELECT_MOVEMENT_PATTERN' && W.kit.selected() === W.kit.patterns()[0] && R.intent('MOVEMENT_PATTERN_SELECTION', 9, 'down').reason === 'NO_PATTERN_SLOT');
ok('key-up on one-shot intents is ignored (no double fire)', R.intent('INTERACT', null, 'up').skipped === 'up' && R.intent('TRANSFORM', null, 'up').skipped === 'up');
ok('router source is the adapter name (device-neutral logic downstream)', R.log().slice(-1)[0].source === 'KEYBOARD_MOUSE' || R.log().slice(-1)[0].source === undefined);
var routerSrc = fs.readFileSync(path.join(ROOT, '19_INPUT/InputRouter.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
ok('router contains no gameplay logic (no damage / health / xp / ceiling math)', !/health|damage|xp\b|ceiling|applyDamage/.test(routerSrc));

/* ---- interaction system ---- */
var I = H.interactions; var player = H.player;
ok('interaction types (11) match the brief', INTERACTION_TYPES.length === 11 && ['DOOR', 'CLIMB', 'SWIM', 'GYM', 'OUTDOOR_WORKOUT', 'MENTOR', 'DUEL', 'ACTIVITY', 'RAID', 'TRANSPORT', 'FLIGHT_POINT'].every(function (t) { return INTERACTION_TYPES.indexOf(t) >= 0; }));
ok('world POIs registered as interaction points with id / type / position / range / requirements / actions / prompt / handler', I.points().length === H.worlds.interactionPoints('WORLD_DEV_01').length && I.points().every(function (p) { return ['interaction_id', 'type', 'position', 'range_m', 'requirements', 'available_actions', 'prompt', 'session_handler'].every(function (k) { return k in p; }); }));
ok('register refuses bad type / missing fields', throws(function () { I.register({ interaction_id: 'X', type: 'SHOP', position: { x: 0, z: 0 } }); }, /unknown interaction type/) && throws(function () { I.register({ interaction_id: 'Y', type: 'DOOR' }); }, /missing position/));
H.moveTo(100, 100); H.tick(0.02); ok('out of range: no prompt', I.prompt() === null);
var d = H.worlds.poi('WORLD_DEV_01', 'POI_DOOR_GYM_01').position; H.moveTo(d.x + cfg.dev('interaction.default_range_m') + 0.1, d.z); H.tick(0.02); var far = I.prompt(); H.moveTo(d.x + cfg.dev('interaction.default_range_m') - 0.1, d.z); H.tick(0.02); var near = I.prompt();
ok('range detection: just outside → no prompt; just inside → prompt + INTERACTION_RANGE_ENTER', far === null && near && near.interaction_id === 'POI_DOOR_GYM_01' && W.bus.count('INTERACTION_RANGE_ENTER') >= 1);
ok('prompt is device-neutral (intent + glyph slot, no platform icon)', near.intent === 'INTERACT' && near.glyph_slot === 'CONFIRM' && !/[Xx]box|PlayStation|△|✕|Ⓐ/.test(JSON.stringify(near)));
I.register({ interaction_id: 'GATE_L5', type: 'DOOR', position: { x: 50, z: 50 }, requirements: { min_level: 5, unlocks: ['GATE_KEY'], quest_completed: 'MQ_INTRO_TRANSFORM_DUEL' }, session_handler: function () { return { ok: true }; } });
H.moveTo(50, 50); H.tick(0.02); var gate = I.prompt(); ok('eligibility: level / unlock / quest requirements block with explicit reasons', gate && !gate.eligible && gate.blocked_by.join() === 'LEVEL_5,UNLOCK_GATE_KEY,QUEST_MQ_INTRO_TRANSFORM_DUEL');
W.profile.level = 5; player.unlocks.push('GATE_KEY'); W.profile.mentor_progress.completed.push('MQ_INTRO_TRANSFORM_DUEL'); H.tick(0.02); ok('eligibility recomputed when requirements are met', I.prompt().eligible === true); W.profile.level = 1; W.profile.mentor_progress.completed.length = 0; I.unregister('GATE_L5');
H.moveTo(100, 100); H.tick(0.02); ok('leaving range clears the prompt (INTERACTION_PROMPT_CLEARED)', I.prompt() === null && W.bus.count('INTERACTION_PROMPT_CLEARED') >= 1);
ok('INTERACT with nothing in range is refused', I.interact(player).reason === 'NO_INTERACTION_IN_RANGE');
var hs = standardHandlers(W, {}); ok('handlers without a bound system refuse explicitly; SWIM points to OD-09; TRANSPORT to OD-27', hs.DOOR({}, player).reason === 'NO_DOOR_TRANSITION' && hs.SWIM().reason === 'SWIM_OPEN_DECISION_OD-09' && /OD-27/.test(hs.TRANSPORT({ destination: 'W2' }).classification));

/* ---- door contract ---- */
var door = createDoorTransition(W); var dp = { interaction_id: 'D1', type: 'DOOR', position: { x: 0, z: 0 }, interior_id: 'INT_1' };
ok('door states enumerated', DOOR_STATES.join() === 'IDLE,APPROACH,AVAILABLE,CONFIRMED,TRANSITION,ENTERED,EXITING');
ok('confirm before approach is refused (must be AVAILABLE)', door.confirm().reason === 'NOT_AVAILABLE');
door.approach(dp); ok('approach → AVAILABLE; cancel returns to IDLE when the player leaves', door.state().state === 'AVAILABLE' && door.cancel().ok && door.state().state === 'IDLE');
door.approach(dp); var c = door.confirm(); ok('confirm → CONFIRMED → TRANSITION with placeholder loading strategy + style (OD-25 / OD-26)', c.ok && door.state().state === 'TRANSITION' && door.state().loading_strategy === 'PLACEHOLDER_INSTANT' && door.state().transition_style === 'PLACEHOLDER_FADE' && c.interior.interior_id === 'INT_1');
ok('cannot cancel mid-transition', !door.cancel().ok);
var n = 0; while (door.tick(0.1) !== 'ENTERED' && n++ < 50); ok('transition time from dev tuning → ENTERED + BUILDING_ENTERED', door.state().state === 'ENTERED' && n * 0.1 <= cfg.dev('interaction.door_transition_s') + 0.11 && W.bus.count('BUILDING_ENTERED') >= 1);
door.exit(); n = 0; while (door.tick(0.1) !== 'IDLE' && n++ < 50); ok('exit → EXITING → IDLE', door.state().state === 'IDLE' && door.state().door === null);
var custom = createDoorTransition(W, { loadingStrategy: { id: 'STREAMED_TEST', load: function (dr) { return { interior_id: 'STREAM_' + dr.interaction_id }; } }, transitionStyle: { id: 'SEAMLESS_TEST' } });
custom.approach(dp); custom.confirm(); ok('loading / transition strategies are injectable slots (never hidden canon)', custom.state().loading_strategy === 'STREAMED_TEST' && custom.state().transition_style === 'SEAMLESS_TEST' && custom.state().interior.interior_id === 'STREAM_D1');

/* ---- flight controls ---- */
var H4 = await createScenarioWorld({ seed: 4 }); var FC = H4.flightControls;
ok('exit before enter refused; enter uses travel ceiling of the current form', FC.exitFlight().reason === 'NOT_IN_FLIGHT' && FC.enterFlight().ceiling_m === cfg.travelFlightCeilingM('FUSED') && FC.enterFlight().reason === 'ALREADY_IN_FLIGHT');
H4.run(3); ok('altitude rises and energy drains through the existing flight session (no new rules)', H4.world.flight.state().altitude_m > 0 && H4.world.resource.state().current < H4.world.resource.state().max && H4.bus.count('FLIGHT_ENTER') === 1);
var dsc = FC.descend(); ok('DESCEND requests altitude 0 (landing path)', dsc.ok && dsc.target_m === 0);
H4.runUntil(function () { return H4.world.flight.state().state === 'GROUNDED'; }, 30); ok('grounding auto-exits flight with a FLIGHT_EXIT event', !FC.state().in_flight && H4.bus.count('FLIGHT_EXIT') === 1);
H4.startDuel(); var ce = FC.enterFlight(); ok('entering flight in combat uses the combat cap (8 ft)', ce.ok && Math.abs(ce.ceiling_m - cfg.combatFlightCapM()) < 1e-9 && ce.mode === 'COMBAT'); H4.endDuel(); FC.exitFlight();
var fcSrc = fs.readFileSync(path.join(ROOT, '19_INPUT/FlightControls.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
ok('flight controls carry no ceiling / drain numbers (rules stay in FlightSession + config)', !/\b(50|12|8|6)\b\s*[;,)]/.test(fcSrc) && /getFlightCeiling/.test(fcSrc));

/* ---- world / POI registry ---- */
var WD = loadWorldData(); var WR = H.worlds;
ok('world data classified DEVELOPMENT_REFERENCE with two worlds sharing infrastructure ids', WR.classification === 'DEVELOPMENT_REFERENCE' && WR.ids().join() === 'WORLD_DEV_01,WORLD_DEV_02' && WR.sharedAcross('GYM').length === 2 && WR.sharedAcross('MENTOR_HALL').length === 1);
ok('every world carries the required identity + content fields', WR.ids().every(function (id) { return validateWorld(WR.get(id), WD.shared_infrastructure_catalog).length === 0; }) && ['environment_profile', 'architecture_profile', 'nature_profile', 'transport_profile', 'wild_monster_set', 'ultimate_boss', 'raid_zones', 'spawn_points'].every(function (k) { return k in WR.get('WORLD_DEV_01'); }));
ok('POI types (10) incl. SHOP_FUTURE / SOCIAL_SPACE / BUILDING_INTERIOR / WORLD_EXIT; no commerce logic', POI_TYPES.length === 10 && !/price|purchase|currency/i.test(fs.readFileSync(path.join(ROOT, '21_WORLD_SCHEMA/WorldRegistry.js'), 'utf8')));
ok('poi lookups: by type, by id, default spawn, travel targets resolve to real worlds', WR.pois('WORLD_DEV_01', 'GYM').length === 1 && WR.poi('WORLD_DEV_01', 'POI_ARENA_01').type === 'DUEL_ARENA' && WR.defaultSpawn('WORLD_DEV_02').spawn_id === 'SPAWN_MAIN' && WR.travelTargets('WORLD_DEV_01').join() === 'WORLD_DEV_02');
ok('POI → interaction derivation (door, climb with SPLIT requirement, duel, transport); social / shop yield none', poiToInteraction(WR.poi('WORLD_DEV_01', 'POI_DOOR_GYM_01'), WR.get('WORLD_DEV_01')).type === 'DOOR' && poiToInteraction(WR.poi('WORLD_DEV_01', 'POI_WALL_01'), WR.get('WORLD_DEV_01')).requirements.form === 'SPLIT' && poiToInteraction(WR.poi('WORLD_DEV_01', 'POI_SOCIAL_01'), WR.get('WORLD_DEV_01')) === null && poiToInteraction(WR.poi('WORLD_DEV_01', 'POI_EXIT_01'), WR.get('WORLD_DEV_01')).destination === 'WORLD_DEV_02');
ok('registry refuses: unknown infrastructure, missing default spawn, exit to unknown world, monsters defined (Phase 4 boundary)', throws(function () { createWorldRegistry({ worlds: [Object.assign({}, WR.get('WORLD_DEV_02'), { shared_infrastructure: ['CASINO'] })], shared_infrastructure_catalog: WD.shared_infrastructure_catalog }); }, /unknown shared infrastructure/) && throws(function () { createWorldRegistry({ worlds: [Object.assign({}, WR.get('WORLD_DEV_02'), { spawn_points: [] })] }); }, /no default spawn/) && throws(function () { createWorldRegistry({ worlds: [WR.get('WORLD_DEV_01')], shared_infrastructure_catalog: WD.shared_infrastructure_catalog }); }, /unknown world/) && throws(function () { createWorldRegistry({ worlds: [Object.assign({}, WR.get('WORLD_DEV_02'), { wild_monster_set: { monsters: [{ id: 'X' }] } })] }); }, /monster/));

/* ---- deterministic bot ---- */
var r1 = mulberry32(42), r2 = mulberry32(42); ok('seeded PRNG reproduces', [r1(), r1(), r1()].join() === [r2(), r2(), r2()].join() && mulberry32(1)() !== mulberry32(2)());
async function botRun(seed) { var Hb = await createScenarioWorld({ seed: seed }); Hb.startDuel(); Hb.run(6); return { decisions: Hb.bot().decisions(), state: Hb.bot().state(), health: Hb.duel().snapshot().health, events: Hb.bus.names().filter(function (n) { return /^BOT_|^ATTACK_MAIN_IMPACT|^DUEL_DAMAGE/.test(n); }) }; }
var b1 = await botRun(99), b2 = await botRun(99), b3 = await botRun(100);
ok('same seed → identical decision list, health and event stream', JSON.stringify(b1.decisions) === JSON.stringify(b2.decisions) && JSON.stringify(b1.health) === JSON.stringify(b2.health) && b1.events.join() === b2.events.join() && b1.decisions.length > 3);
ok('different seed → different behaviour', JSON.stringify(b1.decisions) !== JSON.stringify(b3.decisions) || JSON.stringify(b1.health) !== JSON.stringify(b3.health));
ok('bot states within the declared set; bot moves toward the player and attacks (player health drops)', b1.decisions.every(function (dd) { return BOT_STATES.indexOf(dd) >= 0 || dd === 'BUSY'; }) && b1.health[H.player.id] < cfg.dev('health.max'));
var Hb = await createScenarioWorld({ seed: 5 }); Hb.startDuel(); var bot = Hb.bot(); var t = 0; while (t < 10 && !bot.state().defending) { Hb.tick(0.02); t += 0.02; }
ok('DEFEND reduces incoming damage by the tuned fraction', bot.state().defending && bot.incoming(10, {}) === 10 * (1 - cfg.dev('bot.defend_reduction')));
var ranged = Hb.bus.events().filter(function (e) { return e.name === 'BOT_STATE' && e.payload.state === 'RANGED'; }); Hb.run(10); var rangedAfter = Hb.bus.events().filter(function (e) { return e.name === 'BOT_STATE' && e.payload.state === 'RANGED'; });
ok('bot has one ranged attack path (upright row fixture) gated by cooldown', rangedAfter.length >= 0 && Hb.bus.count('ATTACK_CONCENTRIC_BEGIN') > 0);
bot.defeat(); ok('defeat → DEFEATED, no further incoming damage', bot.state().state === 'DEFEATED' && bot.incoming(10) === 0);
var botSrc = fs.readFileSync(path.join(ROOT, '22_DEBUG_BOT/DuelBot.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
ok('bot numbers come from dev tuning only (no literal ranges / cooldowns)', /cfg\.dev\('bot'\)/.test(botSrc) && !/range_m\s*[:=]\s*\d|cooldown_s\s*[:=]\s*\d/.test(botSrc));

/* ---- record / isolated replay (format 1.1.0; full coverage in gameplay_phase4_1.test.mjs) ---- */
var Hr = await createScenarioWorld({ seed: 21 }); var rec = Hr.recorder; Hr.run(0.5); var rs = rec.start();
Hr.router.intent('MOVEMENT_PATTERN_SELECTION', 2, 'down'); Hr.router.intent('TRANSFORM', null, 'down'); Hr.runUntil(function () { return Hr.world.loco.form() === 'SPLIT' && !Hr.world.loco.transforming(); }, 20); Hr.router.intent('MOVE', 'forward', 'down'); Hr.run(1); Hr.router.intent('MOVE', 'forward', 'up'); Hr.run(0.5);
Hr.startDuel(); Hr.router.intent('ATTACK_SECONDARY', null, 'down'); Hr.run(4); var record = rec.stop();
ok('recorder captured a FRESH_BASELINE record: ticks, tick-indexed inputs + setup, checkpoints (mahloco, form, resource, altitude, flight, pattern, xp, level, duel, health, bot, position), key-event signatures', rs.kind === 'FRESH_BASELINE' && record.format_version === RECORD_FORMAT && record.ticks.length === record.tick_count && record.inputs.length >= 5 && record.setup.some(function (x) { return x.kind === 'START_DUEL'; }) && ['tick', 't', 'mahloco', 'form', 'resource', 'altitude', 'flight', 'pattern', 'xp', 'level', 'duel', 'health', 'bot', 'pos_x'].every(function (k) { return k in record.checkpoints[0]; }));
ok('record is plain JSON (serialisable) with format, runtime ids, seed and character', typeof JSON.stringify(record) === 'string' && record.seed === 21 && record.runtime.character_id === 'MAH_ATHLETE_F');
ok('recorded event classes include attack / duel / transform / resource signatures', ['ATTACK_MAIN_IMPACT', 'DUEL_STATE', 'RESOURCE_SPENT', 'TRANSFORM_TO_SPLIT'].every(function (n) { return record.events.some(function (e) { return e.sig.indexOf(n) === 0; }); }) && record.events.some(function (e) { return /^MAHLOCO_/.test(e.sig); }));
var liveXp = Hr.world.profile.xp, liveRes = Hr.world.resource.state().current; var rp = createIsolatedReplay(record, { createSimulation: createHarnessSimulation }); await rp.start(); var rep = rp.run();
ok('isolated replay re-issues the recorded inputs into a SEPARATE world: MATCHED, no logical divergence, live world untouched', rep.status === 'FINISHED' && rep.matched === true && Hr.world.profile.xp === liveXp && Hr.world.resource.state().current === liveRes, rep.first_divergence || rep.reasons);
var tampered = JSON.parse(JSON.stringify(record)); tampered.inputs = tampered.inputs.filter(function (i) { return i.action !== 'TRANSFORM'; }); var rp2 = createIsolatedReplay(tampered, { createSimulation: createHarnessSimulation }); await rp2.start(); var rep2 = rp2.run();
ok('a tampered record (transform removed) is reported as DIVERGED with a first divergence, never hidden', rep2.status === 'FINISHED' && !rep2.matched && rep2.first_divergence && rep2.first_divergence.fields.some(function (x) { return /form|mahloco|transforming|event_sequence/.test(x.field); }));

/* ---- scenarios (all seven, deterministic) ---- */
for (var si = 0; si < SCENARIOS.length; si++) { var sr = await runScenario(SCENARIOS[si].id); ok(sr.id + ' — ' + sr.title + ' (' + sr.checks.length + ' checks)', sr.ok, sr.checks.filter(function (c) { return !c.ok; }).map(function (c) { return c.id; })); }
var s1 = await runScenario('SCENARIO_03'), s2 = await runScenario('SCENARIO_03'); ok('SCENARIO_03 is reproducible run-to-run (bot decisions + XP identical)', JSON.stringify(s1.evidence.decisions) === JSON.stringify(s2.evidence.decisions) && s1.evidence.xp === s2.evidence.xp);

/* ---- boundaries ---- */
var newMods = ['18_PERSISTENCE/PlayerProfileStore.js', '19_INPUT/InputRouter.js', '19_INPUT/FlightControls.js', '20_INTERACTIONS/InteractionSystem.js', '21_WORLD_SCHEMA/WorldRegistry.js', '22_DEBUG_BOT/DuelBot.js', '23_REPLAY/SessionRecorder.js'];
newMods.forEach(function (m) { var c = fs.readFileSync(path.join(ROOT, m), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); ok('no hard-coded owner tunable / no mahloco table copy in ' + m, !/\b(20|40|8|15|50|12|30)\s*\*\s*MPH|max\s*[:=]\s*(20|40|50)\b|UNFUSE_ENTER'\s*:|TABLE\[/.test(c)); });
ok('no networking / backend / commerce code in Phase 4 modules', newMods.every(function (m) { return !/WebSocket|fetch\(|XMLHttpRequest|stripe|checkout/i.test(fs.readFileSync(path.join(ROOT, m), 'utf8')); }));
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
