/* HALO repair/play focused gate — carrier occupancy, one-owner floor contract,
   one-bot rally scoring and five-serve target practice. */
import fs from 'node:fs';
import { loadHeadlessData, composeHeadless } from '../00_CORE/bootstrap.js';
import { createDuelHost, hostIdentity } from '../26_LOCAL_AUTHORITY/DuelHost.js';
import { createMemoryStore } from '../26_LOCAL_AUTHORITY/DurableStore.js';
import { makeEnvelope } from '../26_LOCAL_AUTHORITY/Protocol.js';
import { HALO_LAYOUT, HALO_PLAY_LAYOUT } from '../26_LOCAL_AUTHORITY/play/haloLayout.js';

var pass = 0, fail = 0;
function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + ' — ' + JSON.stringify(detail)); } }
var data = await loadHeadlessData(), DT = data.cfg.dev('local_authority.tick_dt_s'), store = createMemoryStore(), opened = store.open({ identity: hostIdentity(data) });
var h = createDuelHost({ data: data, composeHeadless: composeHeadless, store: store, opened: opened }); h.dev.createAccount('A', { classId: 'ATHLETE', sex: 'M' });
var token = h.dev.tokens().A, c = h.connect({ client_id: 'halo-repair-play', account_id: 'A', token: token }), seq = 0;
function send(action, payload) { return h.submit(makeEnvelope({ session_id: c.session_id, client_id: 'halo-repair-play' }, ++seq, action, payload || {})); }
function run(seconds) { for (var i = 0; i < Math.round(seconds / DT); i++) h.tick(DT); }
function snap() { return h.snapshot(c.session_id).play; }
function place(x, z) { return h.dev.play('PLACE', { account_id: 'A', x: x, z: z }); }

send('ENTER_ROOM', { room: 'FIELD' }); run(0.2); place(HALO_LAYOUT.ground_dock.x, HALO_LAYOUT.ground_dock.z); run(0.1); send('EQUIP_MANIFEST', { kind: 'BARBELL', count: 1 }); run(1.8); var barbell = snap().equipment.manifested.filter(function (x) { return x.kind === 'BARBELL'; })[0]; var barbellPickup = barbell ? send('EQUIP_PICKUP', { id: barbell.id }) : null; run(0.1);
var beforeRide = snap(), up = send('TRANSIT', { id: 'ELEVATOR_UP' }), boarding = snap(); run(1.2); var occupiedA = snap(); run(8.8); var occupiedB = snap(); run(10.2); var upper = snap();
ok('1 boarding is explicit before occupied travel', up.accepted && boarding.transit.phase === 'BOARDING' && boarding.transit.boarding_s === 1 && occupiedA.transit.phase === 'OCCUPIED_TRAVEL', { up: up, boarding: boarding.transit, occupied: occupiedA.transit });
ok('2 carrier and rider share the exact moving host pose', occupiedA.transit.relative_drift_m === 0 && occupiedB.transit.relative_drift_m === 0 && ['x', 'y', 'z'].every(function (k) { return occupiedB.transit.carrier_pose[k] === occupiedB.transit.rider_pose[k]; }) && occupiedB.transit.clearance.side_m > 1 && occupiedB.transit.clearance.head_m > 1, occupiedB.transit);
ok('3 arrival still activates only at the upper dock', upper.spatial_domain === 'HALO' && upper.flight.ground === 240 && !upper.transit, { domain: upper.spatial_domain, flight: upper.flight });

var citySource = fs.readFileSync(new URL('../26_LOCAL_AUTHORITY/lab/cityScene.js', import.meta.url), 'utf8');
ok('4 HALO floor declares one opaque visible top and no full-area transparent overlay', /HALO_DECK_SINGLE_TOP/.test(citySource) && /full_area_opaque_owners:\s*1/.test(citySource) && /transparent_full_area_overlays:\s*0/.test(citySource) && /CylinderGeometry\(PR, PR \* 0\.92, 3\.2, 128, 1, true\)/.test(citySource), 'single-top/static-source contract');

place(HALO_PLAY_LAYOUT.entry.x, HALO_PLAY_LAYOUT.entry.z); run(0.1); var offered = snap(), resource0 = offered.combat_mahgic.current, flight0 = offered.flight_mahgic.current, xp0 = offered.character.xp, start = send('HALO_SPORT_START', { mode: 'VOLLEY' }); run(0.1); var live = snap();
ok('5 playable court is offered and starts a real one-bot first-to-seven activity', offered.prompts.some(function (p) { return p.intent === 'HALO_PLAY'; }) && start.accepted && live.sport.active && live.sport.mode === 'VOLLEY' && live.sport.score.first_to === 7 && live.npcs.some(function (n) { return n.id === 'NPC_HALO_VOLLEY_BOT'; }), { prompt: offered.prompts, start: start, sport: live.sport });
var blockedFlight = send('FLIGHT', { op: 'ENTER' }), blockedCombat = send('ATTACK', { hint: 'TAP' });
ok('6 activity contains flight/combat without changing their global authority', !blockedFlight.accepted && blockedFlight.reason === 'HALO_SPORT_ACTIVE' && !blockedCombat.accepted && blockedCombat.reason === 'HALO_SPORT_ACTIVE', { flight: blockedFlight, combat: blockedCombat });

var volleyContacts = 0, sawOut = false, sawNet = false, seenRallies = [];
for (var rally = 0; rally < 7; rally++) { var hv = send('HALO_SPORT_HIT', { style: rally === 1 ? 'DRIVE' : 'LOFT', lane: rally === 0 ? 3.2 : 0 }); if (hv.accepted) { volleyContacts++; seenRallies.push(hv.rally_id); } var afterPoint = null; for (var wait = 0; wait < 32; wait++) { run(0.1); afterPoint = snap(); if (afterPoint.sport && (afterPoint.sport.phase === 'POINT' || afterPoint.sport.phase === 'RESULT')) break; } if (afterPoint.sport && afterPoint.sport.point && afterPoint.sport.point.why === 'OUT') sawOut = true; if (afterPoint.sport && afterPoint.sport.point && afterPoint.sport.point.why === 'COURT_FLOOR' && afterPoint.sport.point.landing.x < HALO_PLAY_LAYOUT.center.x) sawNet = true; if (afterPoint.sport && afterPoint.sport.phase === 'POINT') run(1.0); }
var volleyResult = snap();
ok('7 accepted hit/rally ids, real contacts and in/out/net cases advance to result once', volleyContacts === 7 && new Set(seenRallies).size === 7 && sawOut && sawNet && volleyResult.sport.phase === 'RESULT' && volleyResult.sport.score.bot === 7 && volleyResult.sport.contact_seq >= 8 && volleyResult.sport.last_contact && volleyResult.sport.last_contact.rally_id === volleyResult.sport.rally_id, { contacts: volleyContacts, rallies: seenRallies, sawOut: sawOut, sawNet: sawNet, sport: volleyResult.sport });
var replay = send('HALO_SPORT_REPLAY'); run(0.1); var replayed = snap(), leaveVolley = send('HALO_SPORT_LEAVE'); run(0.1);
ok('8 result supports replay and safe exit', replay.accepted && replayed.sport.phase === 'SERVE_READY' && replayed.sport.score.player === 0 && replayed.sport.score.bot === 0 && leaveVolley.accepted && !snap().sport && Math.hypot(snap().position.x - (HALO_PLAY_LAYOUT.entry.x - 0.8), snap().position.z - HALO_PLAY_LAYOUT.entry.z) < 0.01, { replay: replay, leave: leaveVolley, after: snap().position });

place(HALO_PLAY_LAYOUT.entry.x, HALO_PLAY_LAYOUT.entry.z); run(0.1); var practiceStart = send('HALO_SPORT_START', { mode: 'PRACTICE' }); run(0.1); var practiceContacts = 0; for (var serve = 0; serve < 5; serve++) { var hs = send('HALO_SPORT_HIT', { style: serve % 2 ? 'DRIVE' : 'LOFT', zone: ['LEFT', 'CENTER', 'RIGHT'][serve % 3] }); if (hs.accepted) practiceContacts++; run(1.3); if (snap().sport && snap().sport.phase === 'POINT') run(1.0); }
var practiceResult = snap();
ok('9 five real serves resolve against the authored targets', practiceStart.accepted && practiceContacts === 5 && practiceResult.sport.phase === 'RESULT' && practiceResult.sport.practice.attempts === 5 && practiceResult.sport.practice.hits >= 3 && practiceResult.sport.result === 'PRACTICE_COMPLETE', { contacts: practiceContacts, sport: practiceResult.sport });
var leavePractice = send('HALO_SPORT_LEAVE'); run(0.1); var afterAll = snap();
ok('10 sport leaves damage, costs, ownership and progression untouched', leavePractice.accepted && afterAll.combat_mahgic.current === resource0 && afterAll.flight_mahgic.current === flight0 && afterAll.character.xp === xp0 && afterAll.spatial_domain === 'HALO' && afterAll.flight.ground === 240, { before: { combat: resource0, flight: flight0, xp: xp0 }, after: { combat: afterAll.combat_mahgic.current, flight: afterAll.flight_mahgic.current, xp: afterAll.character.xp, domain: afterAll.spatial_domain } });

/* Selected bounded mainland tranche route: the actual Titan-lake node breaks
   through combat authority and its real drops restore the non-regenerating
   combat pool. This is not a decorative bush assertion. */
place(HALO_LAYOUT.upper_dock.x, HALO_LAYOUT.upper_dock.z); run(0.1); var down = send('TRANSIT', { id: 'ELEVATOR_DOWN' }); run(20.2); place(15.4, 55); run(0.2); send('MOVE', { forward: 0, strafe: 0, yaw: Math.PI / 2 }); run(0.1);
var I = h.dev.play_internals(), actor = I.actorOf('A'), rf = I.rulesField(), fighter = rf.combatant('A'), cs = fighter.pool.state(); fighter.pool.spend(cs.current - 80, 'MAP_REFILL_FIXTURE'); var eqBefore = JSON.parse(JSON.stringify(I.equipment().summary())), combatBefore = fighter.pool.state().current, lockNode = send('LOCK_TARGET', { aim_id: 'NODE_RB_NEXUS_INTRO' }), bushCasts = [];
for (var hit = 0; hit < 4 && I.equipment().summary().stats.nodes_broken === eqBefore.stats.nodes_broken; hit++) { fighter.cooldowns = {}; send('RULES_SELECT', { category: 'PHYSICAL', slot: 0 }); bushCasts.push(send('RULES_CAST', { skill_id: 'PA_PUSH' })); run(2.2); }
place(17, 55); run(0.8); var eqAfter = I.equipment().summary(), mapAfter = snap();
ok('11 Nexus newcomer resource patch is attackable and real drops refill the mainland combat pool', down.accepted && barbellPickup && barbellPickup.accepted && mapAfter.spatial_domain === 'WORLD' && lockNode.accepted && bushCasts.filter(function (x) { return x.accepted; }).length >= 2 && eqAfter.stats.nodes_broken === eqBefore.stats.nodes_broken + 1 && eqAfter.stats.refills_picked > eqBefore.stats.refills_picked && mapAfter.combat_mahgic.current > combatBefore && mapAfter.equipment.held && mapAfter.equipment.held.kind === 'BARBELL', { down: down, barbell_pickup: barbellPickup, lock: lockNode, casts: bushCasts, combatant: rf.combatant('A') && { pos: rf.combatant('A').actor.pos, altitude: rf.combatant('A').actor.fl && rf.combatant('A').actor.fl.altitude, facing: rf.combatant('A').actor.facing }, relevant_log: h.dev.log().filter(function (e) { return /^R1723_(MISS|DAMAGE)/.test(e.kind) || e.kind === 'RESOURCE_NODE_BROKEN' || e.kind === 'REFILL_PICKED'; }).slice(-16), before: { combat: combatBefore, equipment: eqBefore }, after: { combat: mapAfter.combat_mahgic.current, equipment: eqAfter, held: mapAfter.equipment.held, domain: mapAfter.spatial_domain } });

console.log('RESULT HALO repair/play: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
