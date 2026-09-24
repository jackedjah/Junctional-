/* MAHWORLD GAMEPLAY RUNTIME :: DETERMINISTIC TEST SCENARIOS (Phase 4)
   Each scenario builds a fresh harness world, drives it through the input router / interaction system, and returns checks.
   SCENARIO_01 spawn → fused travel → door · 02 fused → split → walk → climb interaction · 03 mentor → duel → eccentric special → reward ·
   04 travel flight → combat engagement → combat ceiling clamp · 05 spectator → Call Next → post-fight queue · 06 save → reload → verify ·
   07 invalid / stale save → migration.   node 24_TEST_SCENARIOS/run_scenarios.mjs */
import { createScenarioWorld } from './scenarioHarness.js';
import { validateProfile, PROFILE_SCHEMA_VERSION } from '../18_PERSISTENCE/PlayerProfileStore.js';

function checker() { var checks = []; return { ok: function (id, cond, detail) { checks.push({ id: id, ok: !!cond, detail: cond ? undefined : detail }); return !!cond; }, checks: checks, result: function (evidence) { return { ok: checks.every(function (c) { return c.ok; }), checks: checks, evidence: evidence || {} }; } }; }
function names(bus) { return bus.names(); }

export var SCENARIOS = [
  { id: 'SCENARIO_01', title: 'spawn → fused travel → door', run: async function () {
    var H = await createScenarioWorld({ seed: 1 }); var C = checker(); var spawn = H.worlds.defaultSpawn(H.worldId);
    C.ok('spawned at the world default spawn, FUSED', H.player.position.x === spawn.position.x && H.player.position.z === spawn.position.z && H.world.loco.form() === 'FUSED');
    H.router.intent('MOVE', 'forward', 'down'); H.run(1.5); C.ok('fused travel: mahloco leaves idle under MOVE (' + H.world.loco.snapshot().state + ')', /FUSED_(GLIDE|MOVE|DASH|ACCEL)/.test(H.world.loco.snapshot().state) || H.world.loco.snapshot().state !== 'FUSED_IDLE');
    H.router.intent('MOVE', 'forward', 'up'); H.run(0.5);
    H.moveToPoi('POI_DOOR_GYM_01'); H.run(0.1); var pr = H.interactions.prompt();
    C.ok('door prompt available in range (device-neutral, glyph slot CONFIRM)', pr && pr.type === 'DOOR' && pr.eligible && pr.glyph_slot === 'CONFIRM' && /ENTER/.test(pr.label));
    var r = H.router.intent('INTERACT', null, 'down'); var res = r.results && r.results[0];
    C.ok('INTERACT confirms the door → TRANSITION with placeholder interior + loading strategy', res && res.ok && H.door.state().state === 'TRANSITION' && res.interior.interior_id === 'INTERIOR_GYM_01_PLACEHOLDER');
    H.run(1.0); C.ok('door contract reaches ENTERED (APPROACH → AVAILABLE → CONFIRMED → TRANSITION → ENTERED)', H.door.state().state === 'ENTERED' && H.door.state().log.join('>') === 'APPROACH>AVAILABLE>CONFIRMED>TRANSITION>ENTERED');
    C.ok('events: INTERACTION_AVAILABLE, INTERACTION_CONFIRMED, DOOR_TRANSITION_BEGIN, BUILDING_ENTERED', ['INTERACTION_AVAILABLE', 'INTERACTION_CONFIRMED', 'DOOR_TRANSITION_BEGIN', 'BUILDING_ENTERED'].every(function (n) { return H.bus.count(n) >= 1; }));
    return C.result({ door: H.door.state(), mahloco: H.world.loco.snapshot().state }); } },
  { id: 'SCENARIO_02', title: 'fused → split → walk → climb interaction', run: async function () {
    var H = await createScenarioWorld({ seed: 2 }); var C = checker();
    H.moveToPoi('POI_WALL_01'); H.run(0.1); var p0 = H.interactions.prompt(); C.ok('climb prompt visible but NOT eligible while FUSED (REQUIRES_SPLIT)', p0 && p0.type === 'CLIMB' && !p0.eligible && p0.blocked_by.indexOf('REQUIRES_SPLIT') >= 0);
    var refused = H.router.intent('INTERACT', null, 'down').results[0]; C.ok('INTERACT refused while ineligible', refused && !refused.ok && refused.reason === 'NOT_ELIGIBLE' && H.bus.count('INTERACTION_REFUSED') === 1);
    H.run(0.5); /* mahloco MIN_DWELL: a transform request at t=0 is honestly refused */ H.router.intent('TRANSFORM', null, 'down'); var split = H.runUntil(function () { return H.world.loco.form() === 'SPLIT' && !H.world.loco.transforming(); }, 20); C.ok('TRANSFORM intent → mahloco UNFUSE completes → SPLIT', split);
    H.router.intent('MOVE', 'forward', 'down'); H.run(1.0); C.ok('split walk under MOVE (' + H.world.loco.snapshot().state + ')', /SPLIT/.test(H.world.loco.snapshot().state)); H.router.intent('MOVE', 'forward', 'up'); H.run(0.3);
    var p1 = H.interactions.prompt(); C.ok('climb prompt now eligible in SPLIT', p1 && p1.type === 'CLIMB' && p1.eligible);
    var r = H.router.intent('INTERACT', null, 'down').results[0]; C.ok('INTERACT → climbing hooks CLIMB_ENTER on the wall surface', r && r.ok && r.session === 'CLIMB' && H.bus.count('CLIMB_ENTER') === 1);
    H.climb.handContact('L'); H.climb.tipAttach('R'); var a = H.climb.ascend(1.2); H.climb.tipPulse('R', 0.5); var rel = H.climb.release();
    C.ok('hand contact + lower-tip attach → ascend → release (no feet)', a.ok && rel.ok && rel.height === 1.2 && H.bus.count('LOWER_TIP_ATTACH') === 1 && H.bus.count('TIP_PROPULSION') === 1);
    return C.result({ form: H.world.loco.form(), climb: H.climb.log().slice(-4) }); } },
  { id: 'SCENARIO_03', title: 'mentor → duel → eccentric special → reward', run: async function () {
    var H = await createScenarioWorld({ seed: 3 }); var C = checker(); var xp0 = H.world.profile.xp;
    H.moveToPoi('POI_MENTOR_01'); H.run(0.1); var r = H.router.intent('INTERACT', null, 'down').results[0]; C.ok('mentor interaction → DEV_INTRO_QUEST accepted, ARRIVE_FUSED done', r && r.ok && H.mentorQuest() && H.mentorQuest().state() === 'IN_PROGRESS' && H.mentorQuest().snapshot().objectives[0].done);
    H.run(0.5); H.router.intent('TRANSFORM', null, 'down'); H.runUntil(function () { return H.world.loco.form() === 'SPLIT' && !H.world.loco.transforming(); }, 20); H.mentorQuest().complete('UNFUSE_AND_CROSS');
    H.onDuelResolved(function (snap) { if (H.mentorQuest().state() === 'IN_PROGRESS') { H.mentorQuest().complete('COMPLETE_SPARRING_DUEL'); H.mentorQuest().finish(H.world.profile, H.world.progression); } });
    H.moveToPoi('POI_ARENA_01'); H.run(0.1); var d = H.router.intent('INTERACT', null, 'down').results[0]; C.ok('duel arena interaction → duel ACTIVE vs seeded bot', d && d.ok && H.duel().state() === 'ACTIVE' && H.bot() && H.bot().seed === 3);
    H.router.intent('MOVEMENT_PATTERN_SELECTION', 2, 'down'); C.ok('pattern slot 2 → VERTICAL_PULL selected through the router', H.world.kit.selected() === 'VERTICAL_PULL');
    var s = H.router.intent('ATTACK_SECONDARY', null, 'down').results[0]; C.ok('ATTACK_SECONDARY (HOLD) → upright-row eccentric special starts (resource spent)', s && s.ok && H.attackExec().attack.attack_id === 'ATHLETE_BILATERAL_UPRIGHT_ROW_MANIFESTATION' && H.world.resource.state().current < H.world.resource.state().max);
    H.runUntil(function () { return H.attackExec().state().state === 'COMPLETE'; }, 10); var ev = names(H.bus);
    C.ok('eccentric event chain: CONCENTRIC_BEGIN → MAIN_IMPACT → PEAK → ECCENTRIC_BEGIN → ECCENTRIC_TICK… → ECCENTRIC_END → COMPLETE', ['ATTACK_CONCENTRIC_BEGIN', 'ATTACK_MAIN_IMPACT', 'ATTACK_PEAK', 'ATTACK_ECCENTRIC_BEGIN', 'ATTACK_ECCENTRIC_TICK', 'ATTACK_ECCENTRIC_END', 'ATTACK_COMPLETE'].every(function (n) { return ev.indexOf(n) >= 0; }));
    var dealt = H.attackExec().state().dealt; C.ok('eccentric tail total below main damage (canon)', dealt.eccentric > 0 && dealt.eccentric < dealt.main);
    /* finish the bot with basics until KO (bounded) */
    var t = 0; while (H.duel().state() === 'ACTIVE' && t < 60) { if (!H.attackExec() || /COMPLETE|REFUSED|INTERRUPTED/.test(H.attackExec().state().state)) H.router.intent('ATTACK_DIRECTION', 'DOWN', 'down'); H.run(0.1); t += 0.1; }
    H.runUntil(function () { return /POST_FIGHT|RESULT/.test(H.duel().state()); }, 5);
    var snap = H.duel().snapshot(); C.ok('bot KO → DUEL_RESULT, winner is the player', snap.result === 'KO' && snap.winner === H.player.id && H.bus.count('DUEL_RESULT') === 1);
    C.ok('bot took decisions deterministically and reported incoming damage (defend possible)', H.bot().decisions().length > 0 && H.bus.count('BOT_INCOMING') > 0);
    C.ok('rewards: duel win XP + mentor quest completed with intro XP through progression', H.world.profile.xp + (H.world.profile.level - 1) * H.cfg.dev('progression.xp_per_level_placeholder') - xp0 === H.cfg.dev('progression.duel_win_xp') + H.cfg.dev('mentor.intro_xp_bonus') && H.mentorQuest().state() === 'COMPLETED' && H.bus.count('XP_REWARD') === 2);
    return C.result({ decisions: H.bot().decisions(), xp: H.world.profile.xp, level: H.world.profile.level, dealt: dealt }); } },
  { id: 'SCENARIO_04', title: 'travel flight → combat engagement → combat ceiling clamp', run: async function () {
    var H = await createScenarioWorld({ seed: 4 }); var C = checker(); var cap = H.cfg.combatFlightCapM();
    var e = H.router.intent('FLIGHT', null, 'down').results[0]; C.ok('FLIGHT intent → ENTER_FLIGHT with the FUSED travel ceiling (50 m)', e && e.ok && e.ceiling_m === H.cfg.travelFlightCeilingM('FUSED') && H.flightControls.state().in_flight);
    H.runUntil(function () { return H.world.flight.state().altitude_m >= cap * 3; }, 20); var alt = H.world.flight.state().altitude_m; C.ok('travel flight climbs well above the combat cap', alt > cap * 2 && H.world.flight.state().mode === 'TRAVEL');
    var drainedInFlight = H.world.resource.state().current < H.world.resource.state().max;   /* sampled while flight is still draining: regen (10/s since S07) refills the pool during the forced descent, so a later sample measures regen, not the drain */
    H.flightControls.move('FORWARD'); C.ok('FORWARD / BACKWARD / STRAFE are accepted flight moves', H.flightControls.move('BACKWARD').ok && H.flightControls.move('STRAFE_LEFT').ok && !H.flightControls.move('SIDEWAYS').ok);
    var d = H.startDuel(); C.ok('combat engagement → flight context COMBAT', d.ok && H.world.flight.state().mode === 'COMBAT');
    H.runUntil(function () { return H.world.flight.state().altitude_m <= cap + 1e-6; }, 30); var st = H.world.flight.state(); C.ok('altitude forced down to the combat cap (' + cap.toFixed(3) + ' m) — FORCED_DESCENT, never above cap', st.altitude_m <= cap + 1e-6 && H.bus.count('FLIGHT_STATE') > 0 && names(H.bus).indexOf('FLIGHT_CONTEXT') >= 0);
    var up = H.flightControls.ascend(); var raw = H.world.flight.requestAltitude('FUSED', H.cfg.travelFlightCeilingM('FUSED')); C.ok('ASCEND during combat never requests above the cap; a raw over-request to the session is clamped + FLIGHT_ALTITUDE_CLAMPED', up.ok && up.target_m === cap && !up.clamped && raw.clamped === true && raw.target_m === cap && H.bus.count('FLIGHT_ALTITUDE_CLAMPED') >= 1);
    C.ok('energy drained by flight (resource below max while flying)', drainedInFlight);
    H.endDuel(); var x = H.flightControls.exitFlight(); H.runUntil(function () { return H.world.flight.state().state === 'GROUNDED'; }, 30); C.ok('EXIT_FLIGHT lands; travel context restored', x.ok && H.world.flight.state().state === 'GROUNDED' && H.world.flight.state().mode === 'TRAVEL' && !H.flightControls.state().in_flight);
    return C.result({ peak_altitude_m: alt, final: H.flightControls.state() }); } },
  { id: 'SCENARIO_05', title: 'spectator → Call Next → post-fight queue', run: async function () {
    var H = await createScenarioWorld({ seed: 5 }); var C = checker(); H.startDuel(); var sp = H.spectators();
    var j1 = sp.join('SPEC_01'), j2 = sp.join('SPEC_02'); C.ok('two spectators join the active duel; fighters cannot spectate', j1.ok && j2.ok && !sp.join(H.player.id).ok && sp.count() === 2);
    var cn = sp.callNext('SPEC_02'); var cn2 = sp.callNext('SPEC_01'); C.ok('Call Next queue orders by request (SPEC_02 first)', cn.ok && cn2.ok && sp.nextChallenger() === 'SPEC_02' && !sp.offerNext().ok);
    H.duel().concede(H.player.id); H.runUntil(function () { return /POST_FIGHT/.test(H.duel().state()); }, 5); C.ok('player concedes → POST_FIGHT after grace, XP loss granted', H.duel().state() === 'POST_FIGHT' && H.bus.count('XP_REWARD') === 1);
    var offer = sp.offerNext(); C.ok('post-fight: next challenger offered to the winner (bot)', offer.ok && offer.winner === 'SPARRING_BOT' && offer.challenger === 'SPEC_02');
    var acc = sp.accept(); C.ok('accept → next fighters (winner vs challenger), challenger leaves spectators with movement authority restored', acc.ok && acc.next_fighters.b === 'SPEC_02' && sp.count() === 1 && sp.hasMovementAuthority('SPEC_02'));
    var offer2 = sp.offerNext(); var dec = sp.decline('A'); C.ok('decline goes through the selected EXPERIMENTAL policy (' + dec.policy + ') → OD-02, never silently resolved', offer2.ok && dec.ok && dec.open_decision === 'OD-02' && /EXPERIMENTAL/.test(dec.classification));
    return C.result({ queue: sp.stats(), policy: dec.policy }); } },
  { id: 'SCENARIO_06', title: 'save → reload → verify progression', run: async function () {
    var H = await createScenarioWorld({ seed: 6 }); var C = checker(); var store = H.store;
    var p = store.newProfile({ player_id: 'DEV_PLAYER', classId: 'ATHLETE', sex: 'F', last_world: H.worldId, last_spawn: 'SPAWN_MAIN' }); C.ok('NEW DEVELOPMENT PROFILE valid, schema ' + PROFILE_SCHEMA_VERSION, validateProfile(p).length === 0 && p.schema_version === PROFILE_SCHEMA_VERSION && p.level === 1);
    H.world.progression.xpReward(H.world.profile, 130, 'TEST', 'S06'); H.world.progression.statProgress(H.world.profile, 'STRENGTH', 3, 'TEST'); H.world.profile.mentor_progress.completed.push('MQ_INTRO_TRANSFORM_DUEL');
    H.world.buffs.apply({ buff_id: 'BAGE_TEST', source: 'BAGE_PLACEHOLDER', target: H.world.profile.character_id, stat_modifiers: { STRENGTH: 5 }, duration_key: 'buff.bage_placeholder_duration_s', stacking_policy: 'REFRESH' });
    C.ok('gameplay progressed: level 2, xp 30, STRENGTH 3 (+5 temporary buff active)', H.world.profile.level === 2 && H.world.profile.xp === 30 && H.world.profile.stats.STRENGTH === 3 && H.world.buffs.effectiveStat(H.world.profile, 'STRENGTH').temporary === 5);
    var snap = store.fromGameplay(p, H.world.profile, { last_world: H.worldId, last_spawn: 'SPAWN_MAIN', unlocks: ['DUEL_CHALLENGE'] }); var sv = store.save(snap, H.bus.time());
    C.ok('SAVE ok; persisted permanent_stats hold the base value only (no temporary buff)', sv.ok && snap.permanent_stats.STRENGTH === 3 && !('temporary_buffs' in snap) && JSON.stringify(snap).indexOf('BAGE_TEST') < 0);
    var H2 = await createScenarioWorld({ seed: 6, storage: H.storage }); var ld = H2.store.load('DEV_PLAYER'); C.ok('LOAD in a fresh world: valid, not migrated', ld.ok && ld.migrated.length === 0 && validateProfile(ld.profile).length === 0);
    H2.store.applyToGameplay(ld.profile, H2.world.profile); C.ok('progression restored: level 2 / xp 30 / STRENGTH 3 / mentor completed / unlocks / last_world', H2.world.profile.level === 2 && H2.world.profile.xp === 30 && H2.world.profile.stats.STRENGTH === 3 && H2.world.profile.mentor_progress.completed[0] === 'MQ_INTRO_TRANSFORM_DUEL' && ld.profile.unlocks[0] === 'DUEL_CHALLENGE' && ld.profile.last_world === 'WORLD_DEV_01');
    C.ok('temporary buff did NOT survive reload', H2.world.buffs.effectiveStat(H2.world.profile, 'STRENGTH').temporary === 0);
    var rs = H2.store.resetDevelopment('DEV_PLAYER'); C.ok('RESET DEVELOPMENT PROFILE removes the save', rs.ok && H2.store.load('DEV_PLAYER').reason === 'NOT_FOUND');
    return C.result({ saved: snap, events: ['PROFILE_CREATED', 'PROFILE_SAVED', 'PROFILE_LOADED', 'PROFILE_RESET'].map(function (n) { return n + ':' + (H.bus.count(n) + H2.bus.count(n)); }) }); } },
  { id: 'SCENARIO_07', title: 'invalid / stale save → migration', run: async function () {
    var H = await createScenarioWorld({ seed: 7 }); var C = checker(); var store = H.store; var prefix = H.cfg.dev('persistence.storage_key_prefix');
    H.storage.setItem(prefix + 'OLD', JSON.stringify({ schema_version: '0.9.0', id: 'OLD', class: 'ATHLETE', sex: 'M', level: 3, xp: 12, stats: { STRENGTH: 2 }, mentors: ['MQ_INTRO_TRANSFORM_DUEL'] }));
    var ld = store.load('OLD'); C.ok('stale 0.9.0 save migrates to ' + PROFILE_SCHEMA_VERSION + ' (fields renamed, defaults added, migrated_from recorded)', ld.ok && ld.migrated.join(',') === '1.0.0' && ld.profile.selected_character_class === 'ATHLETE' && ld.profile.selected_sex === 'M' && ld.profile.permanent_stats.STRENGTH === 2 && ld.profile.mentor_progress.completed[0] === 'MQ_INTRO_TRANSFORM_DUEL' && ld.profile.migrated_from === '0.9.0' && Array.isArray(ld.profile.unlocks) && H.bus.count('PROFILE_MIGRATED') === 1);
    C.ok('migrated profile validates', validateProfile(ld.profile).length === 0);
    H.storage.setItem(prefix + 'FUTURE', JSON.stringify({ schema_version: '9.9.9', player_id: 'FUTURE' })); var f = store.load('FUTURE'); C.ok('unknown / newer schema refused (UNKNOWN_SCHEMA_VERSION), never guessed', !f.ok && f.reason === 'UNKNOWN_SCHEMA_VERSION');
    H.storage.setItem(prefix + 'BROKEN', '{not json'); var b = store.load('BROKEN'); C.ok('corrupt save refused (CORRUPT)', !b.ok && b.reason === 'CORRUPT');
    var bad = store.newProfile({ player_id: 'BAD', classId: 'ATHLETE', sex: 'F' }); bad.selected_character_class = 'WIZARD'; bad.level = 0; bad.temporary_buffs = [1]; var sv = store.save(bad); C.ok('invalid profile refused on SAVE with explicit errors (class, level, temporary buffs)', !sv.ok && sv.errors.length === 3 && sv.errors.some(function (e) { return /temporary buffs/.test(e); }));
    C.ok('storage untouched by the refused save', store.load('BAD').reason === 'NOT_FOUND');
    return C.result({ migrated: ld.profile, refusals: [f.reason, b.reason, sv.errors] }); } }
];
export async function runScenario(id) { var s = SCENARIOS.filter(function (x) { return x.id === id; })[0]; if (!s) throw new Error('unknown scenario ' + id); var r = await s.run(); return Object.assign({ id: s.id, title: s.title }, r); }
export async function runAll() { var out = []; for (var i = 0; i < SCENARIOS.length; i++) out.push(await runScenario(SCENARIOS[i].id)); return out; }
