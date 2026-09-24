/* M5 owner-playtest correction gates that were not covered by the older M3/M5 suites.
   Pure topology + authority checks; visual/motion proof is produced separately by browser probes. */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { buildRoadNetwork } from '../26_LOCAL_AUTHORITY/lab/world/roadNetwork.js';
import { createColliders } from '../26_LOCAL_AUTHORITY/play/rules1723/Colliders.js';
import { loadHeadlessData, composeHeadless } from '../00_CORE/bootstrap.js';
import { createDuelHost } from '../26_LOCAL_AUTHORITY/DuelHost.js'; import { makeEnvelope } from '../26_LOCAL_AUTHORITY/Protocol.js';

var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var REG = JSON.parse(fs.readFileSync(path.join(LA, 'lab', 'assets', 'world', 'world_registry_v1.json'), 'utf8'));
var RULES = JSON.parse(fs.readFileSync(path.join(LA, 'play', 'rules1723', 'rules_17_23.dev.json'), 'utf8'));
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail))); } }

var roads = [
  { id: 'GOLD_X', tier: 'CAUSEWAY', family: 'gold', frameW: 20, coreW: 18.4, points: [[-24, 0], [24, 0]] },
  { id: 'BLUE_X', tier: 'REGIONAL', family: 'blue', frameW: 8, coreW: 7, points: [[0, -24], [0, 24]] },
  { id: 'GOLD_Y', tier: 'REGIONAL', family: 'gold', frameW: 8, coreW: 7, points: [[-18, -18], [0, 0], [18, 18]] },
  { id: 'PURPLE_T', tier: 'TRAIL', family: 'purple', frameW: 3, coreW: 1.32, points: [[14, -14], [14, 0]] },
  { id: 'DUPLICATE_LOWER_PRIORITY', tier: 'TRAIL', family: 'red', frameW: 3, coreW: 1.32, points: [[-24, 0], [24, 0]] }
];
var net = buildRoadNetwork(roads, [{ id: 'FORECOURT', kind: 'FORECOURT', x: 24, z: 0, radius: 9 }]);
var pieceKeys = net.pieces.map(function (p) { var a = p.a.join(','), b = p.b.join(','); return a < b ? a + '|' + b : b + '|' + a; });
var centre = net.nodes.filter(function (n) { return n.x === 0 && n.z === 0; })[0], tnode = net.nodes.filter(function (n) { return n.x === 14 && n.z === 0; })[0], fc = net.nodes.filter(function (n) { return n.x === 24 && n.z === 0; })[0];
ok('G01 topology splits same/different-colour X/Y/T crossings once and assigns one deterministic owner', !!centre && centre.owner.id === 'GOLD_X' && !!tnode && tnode.styles.length >= 2 && net.stats.crossings_split >= 3, net.stats);
ok('G01 coincident authored road pieces are removed instead of stacked coplanarly', new Set(pieceKeys).size === pieceKeys.length && net.stats.duplicate_pieces_prevented > 0, { stats: net.stats, pieces: pieceKeys.length });
ok('G01 named forecourt is one explicit owned junction and preserves at least its authored boundary radius', !!fc && fc.explicit && fc.kind === 'FORECOURT' && fc.frameRadius >= 9, fc);

var C = createColliders(RULES._runtime_mapping.field_colliders_district_v1);
var vision = REG.regions.list.filter(function (r) { return r.id === 'VISIONARY_SANCTUARY'; })[0].monoliths.filter(function (m) { return m.x === -120 && m.z === 0; })[0];
var rad = vision.h * 0.18, sat = { x: vision.x + rad * 1.6, z: vision.z + rad * 0.4 };
var normal = C.resolveMove({ x: sat.x, z: sat.z - 4 }, 0, 8, 0), full = C.resolveMove({ x: sat.x, z: sat.z - 18 }, 0, 36, 0);
ok('G02 visible mountain satellite blocks normal and maximum-speed swept movement without tunnelling', normal.blocked && full.blocked && /SAT_A/.test((normal.hit && normal.hit.id) || '') && /SAT_A/.test((full.hit && full.hit.id) || ''), { normal: normal, full: full, sat: sat });
var passMove = C.resolveMove({ x: 150, z: 38 }, 0, 50, 0);
ok('G02 local proxies preserve the real Titan Moon Pass centre/ramps', !passMove.blocked && Math.abs(passMove.x - 150) < 1e-6 && passMove.z > 87, passMove);

var intro = REG.resource_patches.list.filter(function (p) { return p.id === 'RB_NEXUS_INTRO'; })[0];
ok('G09 newcomer patch is explicit, mapped, off-road, and all five sanctuary resource lists remain populated', !!intro && intro.intro && REG.map.resources.some(function (p) { return p.id === intro.id && p.intro; }) && REG.sanctuary_contracts.list.every(function (s) { return s.resources && s.resources.length; }), { intro: intro, resources: REG.map.resources && REG.map.resources.length });

var data = await loadHeadlessData(), H = createDuelHost({ data: data, composeHeadless: composeHeadless }); H.dev.createAccount('A', { classId: 'ATHLETE', sex: 'M' });
var con = H.connect({ client_id: 'm5c', account_id: 'A', token: H.dev.tokens().A }), seq = 0;
function send(a, p) { return H.submit(makeEnvelope({ session_id: con.session_id, client_id: 'm5c' }, ++seq, a, p || {})); }
function tick(n) { for (var i = 0; i < n; i++) H.tick(data.cfg.dev('local_authority.tick_dt_s')); }
send('ENTER_ROOM', { room: 'FIELD' }); tick(4); var pi = H.dev.play_internals(), rf = pi.rulesField(), actor = rf.combatant('A').actor, eqm = pi.equipment(), eq = eqm.eqOf(actor);
var st = rf.combatant('A').pool.state(); rf.combatant('A').pool.spend(st.current, 'M5_ZERO_FIXTURE');
var physical = H.snapshot(con.session_id).play.rules.skills.PHYSICAL;
var zeroSkill = physical.filter(function (s) { return s && s.cost === 0 && s.availability === 'READY'; })[0], nodeId = 'NODE_' + intro.id, node = rf.combatant(nodeId); actor.pos.x = intro.x; actor.pos.z = intro.z + 3.4; actor.facing = 0;
var nodeHp0 = node.hp, zlog = H.dev.log().length, zeroSelect = send('RULES_SELECT', { category: 'PHYSICAL', slot: zeroSkill ? zeroSkill.loadout_slot : 0 }), zeroLock = send('LOCK_TARGET', { aim_id: nodeId }), zeroCast = send('RULES_CAST', zeroSkill ? { skill_id: zeroSkill.id } : {}); tick(Math.ceil(1.2 / data.cfg.dev('local_authority.tick_dt_s')));
var zeroAfter = H.snapshot(con.session_id).play.rules, zeroDamage = H.dev.log().slice(zlog).filter(function (e) { return e.kind === 'R1723_DAMAGE' && e.by === 'A' && e.on === nodeId; });
var paidSelect = send('RULES_SELECT', { category: 'PHYSICAL_MAGIC', slot: 0 }), paidSkill = H.snapshot(con.session_id).play.rules.skills.PHYSICAL_MAGIC[0], paidCast = send('RULES_CAST', paidSkill ? { skill_id: paidSkill.id } : {});
ok('G09 zero combat MAHGIC normal slot contract selects, locks, casts and damages the visible bush while a paid action remains locked', !!zeroSkill && zeroSelect.accepted && zeroSelect.fires === false && zeroLock.accepted && zeroCast.accepted && zeroCast.reserved === 0 && zeroDamage.length === 1 && rf.combatant(nodeId).hp < nodeHp0 && zeroAfter.me.combat_energy.current === 0 && rf.combatant('A').pool.state().lockout && paidSelect.accepted && paidSkill && paidSkill.cost > 0 && paidSkill.availability === 'LOW_ENERGY' && !paidCast.accepted && paidCast.reason === 'INSUFFICIENT_COMBAT_ENERGY', { physical: physical.map(function (s) { return [s.id, s.cost, s.availability]; }), select: zeroSelect, lock: zeroLock, cast: zeroCast, damage: zeroDamage, node_hp: [nodeHp0, rf.combatant(nodeId).hp], pool: rf.combatant('A').pool.state(), paid: { select: paidSelect, skill: paidSkill && [paidSkill.id, paidSkill.cost, paidSkill.availability], cast: paidCast } });
rf.combatant('A').pool.refund(9999); eq.refills = 998; var pos = H.snapshot(con.session_id).play.position; eqm.spawnRefill(pos.x, pos.z, 0.45, 'BUSH', 'NODE_M5_CAP_FIXTURE'); eqm.spawnRefill(pos.x, pos.z, 0.45, 'BUSH', 'NODE_M5_CAP_FIXTURE'); tick(2);
var final = H.snapshot(con.session_id).play, overflowLog = H.dev.log().filter(function (e) { return e.kind === 'REFILL_OVERFLOW_HELD'; });
var lifetimeTicks = Math.ceil((data.cfg.dev('equipment').refill.lifetime_s + 2) / data.cfg.dev('local_authority.tick_dt_s')); tick(lifetimeTicks); var afterLifetime = H.snapshot(con.session_id).play;
ok('G09 full+999 overflow keeps the extra bush pickup beyond ordinary lifetime, journals why it remains, and never exceeds inventory cap', final.equipment.refills === 999 && final.collectibles.length === 1 && final.collectibles[0].kind === 'MAHGIC_REFILL' && final.collectibles[0].overflow_held && afterLifetime.equipment.refills === 999 && afterLifetime.collectibles.length === 1 && afterLifetime.collectibles[0].id === final.collectibles[0].id && afterLifetime.collectibles[0].age_s > data.cfg.dev('equipment').refill.lifetime_s && overflowLog.length === 1, { inventory: afterLifetime.equipment.refills, initial: final.collectibles, after_lifetime: afterLifetime.collectibles, log: overflowLog });

var terrainSrc = fs.readFileSync(path.join(LA, 'lab', 'world', 'terrain.js'), 'utf8'), gearSrc = fs.readFileSync(path.join(LA, 'lab', 'world', 'gear.js'), 'utf8'), menuSrc = fs.readFileSync(path.join(LA, 'lab', 'gameMenu.js'), 'utf8');
ok('G01/G09 shipped client uses opaque owned road cores, one patch proxy, denser subdivided bushes, restrained hint and map legend', /mahworld_path_core_owned/.test(terrainSrc) && !/transparent: true, opacity: 0\.85, polygonOffset/.test(terrainSrc) && /OctahedronGeometry\(1, 1\)/.test(gearSrc) && /SHARDS_PER_PATCH = 64/.test(gearSrc) && /MAHGIC CRYSTALS/.test(gearSrc) && /◇ MAHGIC crystals/.test(menuSrc));

console.log('RESULT M5 owner corrections tranche 1: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
