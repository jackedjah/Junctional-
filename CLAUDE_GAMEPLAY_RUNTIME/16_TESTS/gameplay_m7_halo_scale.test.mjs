/* M7 HALO scale/access addendum — focused authority check only.
   node 16_TESTS/gameplay_m7_halo_scale.test.mjs */
import { loadHeadlessData, composeHeadless } from '../00_CORE/bootstrap.js';
import { createDuelHost } from '../26_LOCAL_AUTHORITY/DuelHost.js';
import { makeEnvelope } from '../26_LOCAL_AUTHORITY/Protocol.js';
import { HALO_LAYOUT } from '../26_LOCAL_AUTHORITY/play/haloLayout.js';

var pass = 0, fail = 0;
function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + (detail === undefined ? '' : ' — ' + JSON.stringify(detail))); } }
var data = await loadHeadlessData(), DT = data.cfg.dev('local_authority.tick_dt_s');
var h = createDuelHost({ data: data, composeHeadless: composeHeadless });
h.dev.createAccount('A', { classId: 'ATHLETE', sex: 'M' });
var c = h.connect({ client_id: 'halo-scale', account_id: 'A', token: h.dev.tokens().A }), seq = 0;
function send(action, payload) { return h.submit(makeEnvelope({ session_id: c.session_id, client_id: 'halo-scale' }, ++seq, action, payload || {})); }
function run(seconds) { for (var i = 0; i < Math.round(seconds / DT); i++) h.tick(DT); }
function snap() { return h.snapshot(c.session_id).play; }
function place(x, z) { return h.dev.play('PLACE', { account_id: 'A', x: x, z: z }); }

send('ENTER_ROOM', { room: 'FIELD' }); run(0.2);
ok('1 exact one-time dimensions', HALO_LAYOUT.arrival_height_m === 240 && HALO_LAYOUT.shell_radius_m === 147.6 && HALO_LAYOUT.shell_diameter_m === 295.2 && HALO_LAYOUT.apex_height_m === 387.6 && HALO_LAYOUT.scale.arrival_height === 10 && HALO_LAYOUT.scale.dome_linear === 18, HALO_LAYOUT);
place(100, 40); run(0.1); ok('2 world ground beneath the oversized upper deck remains mainland ground', snap().spatial_domain === 'WORLD' && snap().flight.ground === 0, { domain: snap().spatial_domain, ground: snap().flight.ground });
place(HALO_LAYOUT.ground_dock.x, HALO_LAYOUT.ground_dock.z); run(0.1);
var before = snap(), upPrompt = before.prompts.some(function (p) { return p.id === 'ELEVATOR_UP'; }), downPromptBelow = before.prompts.some(function (p) { return p.id === 'ELEVATOR_DOWN'; }), pool0 = before.flight_mahgic.current;
var up = send('TRANSIT', { id: 'ELEVATOR_UP' }); var justStarted = snap(); run(10); var middle = snap(); run(10.2); var upper = snap();
ok('3 reachable single cabin starts a 20 s authority timeline instead of teleporting', up.accepted && up.travel_s === 20 && justStarted.spatial_domain === 'TRANSIT' && justStarted.transit && justStarted.flight.ground === 0 && middle.spatial_domain === 'TRANSIT' && middle.flight.ground > 100 && middle.flight.ground < 140, { prompt: upPrompt, down_below: downPromptBelow, up: up, start: { domain: justStarted.spatial_domain, ground: justStarted.flight.ground }, middle: { domain: middle.spatial_domain, ground: middle.flight.ground, transit: middle.transit } });
ok('4 docking activates HALO only at 240 m with zero flight-MAHGIC drain', upPrompt && !downPromptBelow && upper.spatial_domain === 'HALO' && upper.flight.ground === 240 && upper.flight.altitude === 240 && !upper.transit && upper.flight_mahgic.current === pool0, { domain: upper.spatial_domain, flight: upper.flight, pool0: pool0, pool1: upper.flight_mahgic.current });
place(HALO_LAYOUT.guide.x, HALO_LAYOUT.guide.z); run(0.1); var atGuide = snap(), talk = send('NPC_TALK', { npc: 'NPC_HALO_GUIDE' });
ok('5 upper realm streams its guide and supports its interaction', atGuide.npcs.some(function (n) { return n.id === 'NPC_HALO_GUIDE'; }) && atGuide.prompts.some(function (p) { return p.npc === 'NPC_HALO_GUIDE'; }) && talk.accepted, { npcs: atGuide.npcs.map(function (n) { return n.id; }), prompts: atGuide.prompts, talk: talk });
var navOutside = send('NAV', { dest_x: HALO_LAYOUT.center.x + 200, dest_z: HALO_LAYOUT.center.z });
ok('6 navigation cannot target through the dome shell', !navOutside.accepted && navOutside.reason === 'TARGET_BLOCKED', navOutside);
place(HALO_LAYOUT.center.x, HALO_LAYOUT.center.z); run(0.1); var enterFlight = send('FLIGHT', { op: 'ENTER' }), ascend = send('FLIGHT', { op: 'ASCEND' }); run(30); var high = snap();
send('MOVE', { forward: 1, strafe: 0, run: true, fast: true, yaw: Math.PI / 2 }); run(8); send('MOVE', { forward: 0, strafe: 0, yaw: Math.PI / 2 }); run(0.1); var shell = snap();
ok('7 interior flight and direct movement remain inside the curved shell', enterFlight.accepted && ascend.accepted && high.flight.altitude <= high.halo.ceiling_m + 0.01 && shell.halo.radial_distance_m <= shell.halo.radial_limit_m + 0.01 && shell.flight.altitude <= shell.halo.ceiling_m + 0.01, { high: { altitude: high.flight.altitude, ceiling: high.halo.ceiling_m }, shell: shell.halo });
var sealedPickup = send('EQUIP_PICKUP', { id: 'anything' }), sealedLock = send('LOCK_TARGET', { aim_id: 'FIELD_DUMMY' });
ok('8 mainland items and ground combat targets cannot leak into HALO', !sealedPickup.accepted && sealedPickup.reason === 'HALO_SEALED_WORLD_ITEM' && !sealedLock.accepted && sealedLock.reason === 'HALO_SEALED_TARGET' && snap().nodes.length === 0 && snap().wildlife.length === 0, { pickup: sealedPickup, lock: sealedLock });
send('FLIGHT', { op: 'EXIT' }); run(30); place(HALO_LAYOUT.upper_dock.x, HALO_LAYOUT.upper_dock.z); run(0.1); var downReady = snap(), down = send('TRANSIT', { id: 'ELEVATOR_DOWN' }); run(20.2); var lower = snap();
ok('9 only the upper dock exposes return; the same 20 s cabin returns to WORLD', downReady.prompts.some(function (p) { return p.id === 'ELEVATOR_DOWN'; }) && !downReady.prompts.some(function (p) { return p.id === 'ELEVATOR_UP'; }) && down.accepted && down.travel_s === 20 && lower.spatial_domain === 'WORLD' && lower.flight.ground === 0 && !lower.transit, { prompts: downReady.prompts, down: down, lower: { domain: lower.spatial_domain, ground: lower.flight.ground } });
var pool1 = lower.flight_mahgic.current; var up2 = send('TRANSIT', { id: 'ELEVATOR_UP' }); run(20.2); var upper2 = snap(); place(HALO_LAYOUT.upper_dock.x, HALO_LAYOUT.upper_dock.z); var down2 = send('TRANSIT', { id: 'ELEVATOR_DOWN' }); run(20.2); var lower2 = snap();
ok('10 repeated round trip is idempotent and transit itself drains no additional pool', up2.accepted && down2.accepted && upper2.spatial_domain === 'HALO' && lower2.spatial_domain === 'WORLD' && lower2.flight.ground === 0 && lower2.flight_mahgic.current === pool1, { up2: up2.accepted, down2: down2.accepted, pool1: pool1, pool2: lower2.flight_mahgic.current });

console.log('RESULT M7 HALO scale/access: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
