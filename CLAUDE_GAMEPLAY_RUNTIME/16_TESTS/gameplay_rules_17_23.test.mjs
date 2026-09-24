/* MAHWORLD :: RULES 17–23 (owner packet 2026-09-14, ruleset MW_DEV_2026_09_14_R17_23_V0_1) — focused real-runtime suite.

   In-process host (memory store), fake deadline clock for the OD-29 team extension, one sqlite crash / replay check. Plain node.

   node 16_TESTS/gameplay_rules_17_23.test.mjs   (from CLAUDE_GAMEPLAY_RUNTIME) */

import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';

import { loadHeadlessData, composeHeadless } from '../00_CORE/bootstrap.js';

import { createDuelHost, hostIdentity } from '../26_LOCAL_AUTHORITY/DuelHost.js';

import { createSqliteStore, loadSqlite } from '../26_LOCAL_AUTHORITY/DurableStore.js';

import { makeEnvelope } from '../26_LOCAL_AUTHORITY/Protocol.js';

import { loadRuleset, profileOf, composeDamage, scaledStartup, scaledRecovery, unitsToM } from '../26_LOCAL_AUTHORITY/play/rules1723/RulesMath.js';



var pass = 0, fail = 0; function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }

var data = await loadHeadlessData(); var cfg = data.cfg; var DT = cfg.dev('local_authority.tick_dt_s'); var R = loadRuleset(); var P = R.class_profiles; var CLASSES = ['ATHLETE', 'TITAN', 'BAGE', 'VISIONARY', 'LEAN']; var DISTRICT_SHAPES = R._runtime_mapping.field_colliders_district_v1.shapes.filter(function (s) { return !!s.district; }).length;

function newHost(o) { o = o || {}; var h = createDuelHost({ data: data, composeHeadless: composeHeadless, store: o.store, opened: o.opened, clock: o.clock }); (o.accounts || ['PLAYER_A', 'PLAYER_B']).forEach(function (id) { h.dev.createAccount(id, { classId: 'ATHLETE', sex: id === 'PLAYER_B' ? 'M' : 'F' }); }); return h; }

function sess(h, account) { var c = h.connect({ client_id: 'c-' + account, account_id: account, token: h.dev.tokens()[account] }); if (!c.ok) throw new Error('connect ' + account + ' ' + c.reason); var seq = 0; return { sid: c.session_id, account: account, send: function (a, p) { return h.submit(makeEnvelope({ session_id: c.session_id, client_id: 'c-' + account }, ++seq, a, p || {})); }, snap: function () { return h.snapshot(c.session_id); }, play: function () { return h.snapshot(c.session_id).play; }, rules: function () { return h.snapshot(c.session_id).play.rules; } }; }

function run(h, seconds) { var n = Math.round(seconds / DT); for (var i = 0; i < n; i++) h.tick(DT); }

function logs(h, re) { return h.dev.log().filter(function (e) { return re.test(e.kind); }); }

function field(h, s, cls) { s.send('ENTER_ROOM', { room: 'FIELD' }); s.send('FIELD_PRACTICE', { on: true }); if (cls) s.send('RULES_CLASS', { class: cls }); }   /* explicit practice battle: damage on the dummy / ally is enabled (free roam is harmless) */

function faceDummy(h, s, distM) { var d = s.rules().others.filter(function (o) { return o.id === 'FIELD_DUMMY'; })[0]; var goal = { x: d.position.x, z: d.position.z + (distM === undefined ? 2.0 : distM) }; for (var i = 0; i < 400; i++) { var p = s.play().position; var dx = goal.x - p.x, dz = goal.z - p.z; var dd = Math.hypot(dx, dz); if (dd < 0.35) break; s.send('MOVE', { forward: +(-dz / dd).toFixed(3), strafe: +(dx / dd).toFixed(3), fast: true, yaw: +Math.atan2(dx, -dz).toFixed(3) }); h.tick(DT); } s.send('MOVE', { forward: 0, strafe: 0, yaw: +Math.atan2(d.position.x - s.play().position.x, -(d.position.z - s.play().position.z)).toFixed(3) }); run(h, 0.6); }

function dummy(s) { return s.rules().others.filter(function (o) { return o.id === 'FIELD_DUMMY'; })[0]; }

function castAndWait(h, s, p, seconds) { var r = s.send('RULES_CAST', p || {}); run(h, seconds === undefined ? 2.0 : seconds); return r; }

function lastDamage(h) { return logs(h, /^R1723_DAMAGE$/).slice(-1)[0]; }

/* 4/2/2 loadout (2026-09-15): only two special-magic skills are equipped at a time — equip the wanted one into slot 1 when needed (outside rounds), then arm it */

function selSM(s, id) { var L = s.rules().me.loadout.SPECIAL_MAGIC; var i = L.equipped.indexOf(id); if (i < 0) { i = 1; var eq = s.send('RULES_LOADOUT', { category: 'SPECIAL_MAGIC', slot: i, skill_id: id }); if (!eq.accepted) throw new Error('equip ' + id + ': ' + eq.reason); L = s.rules().me.loadout.SPECIAL_MAGIC; } var listIndex = L.equipped.slice(0, i).filter(function (x) { return !!x; }).length; return s.send('RULES_SELECT', { category: 'SPECIAL_MAGIC', slot: listIndex }); }



/* 1. five profiles, orderings, ratios, durability, Titan catalogue, same M/F, one-time factors */

ok('five canonical classes resolve to existing ids; aliases map to BAGE / LEAN, no sixth class', CLASSES.every(function (c) { return P[c]; }) && Object.keys(P).length === 5 && R._runtime_mapping.class_aliases['BALANCE MAGE'] === 'BAGE' && R._runtime_mapping.class_aliases.LIEN === 'LEAN');

ok('leaders: Athlete PHYSICAL, Titan PHYSICAL_MAGIC, BAGE SPECIAL_MAGIC', CLASSES.every(function (c) { return c === 'ATHLETE' || P.ATHLETE.potency_index.PHYSICAL > P[c].potency_index.PHYSICAL; }) && CLASSES.every(function (c) { return c === 'TITAN' || P.TITAN.potency_index.PHYSICAL_MAGIC > P[c].potency_index.PHYSICAL_MAGIC; }) && CLASSES.every(function (c) { return c === 'BAGE' || P.BAGE.potency_index.SPECIAL_MAGIC > P[c].potency_index.SPECIAL_MAGIC; }));

ok('Visionary = 65 % of Athlete in both strike categories; Lean physical 55 % and magic 80 % of the ATHLETE reference (flagged reading)', Math.abs(P.VISIONARY.potency_index.PHYSICAL / P.ATHLETE.potency_index.PHYSICAL - 0.65) < 1e-9 && Math.abs(P.VISIONARY.potency_index.PHYSICAL_MAGIC / P.ATHLETE.potency_index.PHYSICAL_MAGIC - 0.65) < 1e-9 && Math.abs(P.LEAN.potency_index.PHYSICAL / 100 - 0.55) < 1e-9 && Math.abs(P.LEAN.potency_index.PHYSICAL_MAGIC / P.ATHLETE.potency_index.PHYSICAL_MAGIC - 0.8) < 1e-9 && Math.abs(P.LEAN.potency_index.SPECIAL_MAGIC / P.ATHLETE.potency_index.SPECIAL_MAGIC - 0.8) < 1e-9);

ok('BAGE has the greatest baseline effective HP on both channels; Titan the strongest physical armor; Lean fastest travel / shortest phases', ['physical_damage_reduction', 'magical_damage_reduction'].every(function (k) { var b = P.BAGE.max_health / (1 - P.BAGE[k]); return CLASSES.every(function (c) { return c === 'BAGE' || b > P[c].max_health / (1 - P[c][k]); }); }) && CLASSES.every(function (c) { return c === 'TITAN' || P.TITAN.physical_damage_reduction > P[c].physical_damage_reduction; }) && CLASSES.every(function (c) { return c === 'LEAN' || (P.LEAN.movement_speed_multiplier > P[c].movement_speed_multiplier && P.LEAN.startup_duration_multiplier < P[c].startup_duration_multiplier); }));

var H1 = newHost(); var A = sess(H1, 'PLAYER_A'); field(H1, A);

ok('the field opens with the rules engine: ATHLETE profile, three categories, four PA chips, 2 PM + 2 special-magic equipped (4/2/2 loadout; Athlete special pool of 6; owner B8 §23: the two VERIFIED specials — Overhead Extension Release + Chest Fly Clap — are the player defaults, the unassigned drafts stay in the pool; owner B8 §9: maxima ×2 = HP 2000 / MAHGIC 200 / FLIGHT 200), two pools', (function () { var r = A.rules(); return r.me.class === 'ATHLETE' && r.me.hp === P.ATHLETE.max_health && r.me.hp === 2000 && r.skills.PHYSICAL.length === 4 && r.skills.PHYSICAL_MAGIC.length === 2 && r.skills.SPECIAL_MAGIC.length === 2 && r.me.loadout.SPECIAL_MAGIC.pool.length === 6 && r.skills.SPECIAL_MAGIC[0].id === 'ATHLETE_OVERHEAD_RELEASE' && r.skills.SPECIAL_MAGIC[1].id === 'ATHLETE_CHEST_FLY_CLAP' && r.skills.PHYSICAL[0].id === 'PA_PUSH' && r.skills.PHYSICAL[0].pattern === 'HORIZONTAL_PUSH' && r.me.combat_energy.max === 200 && A.play().flight_mahgic.max === 200; })(), A.rules().skills);

ok('Titan is the only class with a majority-infused strike catalogue (6 PM variants vs 4 PA); its PUSH PM chip is the Titan variant and Ground Pulse (HINGE variant) is eligible in the 4/2/2 pool', (function () { var infused = {}; CLASSES.forEach(function (c) { var st = R.skills.filter(function (s) { return s.strike_family && s.classes.indexOf(c) >= 0; }); infused[c] = st.filter(function (s) { return s.category === 'PHYSICAL_MAGIC'; }).length / st.length; }); A.send('RULES_CLASS', { class: 'TITAN' }); var r = A.rules(); var okT = r.skills.PHYSICAL_MAGIC[0].id === 'TITAN_SHOULDER' && r.me.loadout.PHYSICAL_MAGIC.pool.some(function (p) { return p.skill_id === 'TITAN_GROUND_PULSE' && p.eligible; }) && r.skills.PHYSICAL.every(function (s) { return s.category === 'PHYSICAL' && s.cost === 0; }); return infused.TITAN > 0.5 && CLASSES.every(function (c) { return c === 'TITAN' || infused[c] <= 0.5; }) && okT; })());

ok('same class mechanics for M / F presentations (profile identical for PLAYER_A F and PLAYER_B M)', (function () { var B = sess(H1, 'PLAYER_B'); field(H1, B, 'TITAN'); var a = A.rules().me.profile, b = B.rules().me.profile; B.send('ENTER_ROOM', { room: 'TRAINING' }); return JSON.stringify(a) === JSON.stringify(b); })());

ok('phase scaling: startup clamped 0.12–3 s, recovery floor 0.10 s, Lean shortest, Last Pulse has no recovery; cooldowns are not scaled', (function () { var lp = R._skills_by_id.BAGE_LAST_PULSE, pa = R._skills_by_id.PA_PUSH; return scaledStartup(R, lp, P.BAGE) === 2.625 && scaledRecovery(R, lp, P.BAGE) === 0 && scaledStartup(R, pa, P.LEAN) < scaledStartup(R, pa, P.ATHLETE) && scaledStartup(R, pa, P.LEAN) >= 0.12 && scaledRecovery(R, pa, P.LEAN) >= 0.1 && A.rules().skills.PHYSICAL[0].cooldown_s === pa.cooldown_seconds; })());

ok('damage factors applied once: potency → 60/40 split → guard per component → resistance per component (mixed 100 from a potency-100 attacker: 46 behind physical guard, 64 behind magical guard, before armor)', (function () { var pm = R._skills_by_id.PM_PUSH; var a = composeDamage(R, { skill: pm, raw: 100, attacker_profile: P.TITAN, target_profile: null, guard: 'PHYSICAL' }); var b = composeDamage(R, { skill: pm, raw: 100, attacker_profile: P.TITAN, target_profile: null, guard: 'MAGICAL' }); var c = composeDamage(R, { skill: pm, raw: 100, attacker_profile: P.TITAN, target_profile: P.TITAN, guard: 'PHYSICAL' }); return Math.abs(a.after_guard - 46) < 1e-9 && Math.abs(b.after_guard - 64) < 1e-9 && Math.abs(c.applied - (6 * 0.75 + 40 * 0.86)) < 1e-9; })());

A.send('RULES_CLASS', { class: 'ATHLETE' });



/* 2. guards in the field: mixed incoming, dissipation, applied DoT not blocked, category never switched by range */

faceDummy(H1, A, 2.0); var e0 = A.rules().me.combat_energy.current;

ok('PHYSICAL body strike costs no magic and lands real damage on the dummy (potency 100 raw 100 → 84 after the dummy\'s 16 % physical armor)', (function () { var r = castAndWait(H1, A, {}, 1.5); var d = lastDamage(H1); return r.accepted && r.reserved === 0 && d && d.skill === 'PA_PUSH' && Math.abs(d.applied - 84) < 0.01 && A.rules().me.combat_energy.current >= e0 - 0.01; })(), lastDamage(H1));

A.send('RULES_SELECT', { category: 'PHYSICAL_MAGIC', slot: 0 }); var eBefore = A.rules().me.combat_energy.current; var pmr = castAndWait(H1, A, {}, 2.2); var dPM = lastDamage(H1);

ok('PHYSICAL_MAGIC reserves 8 combat energy at start, commits at release (cooldown from commit) and splits 60/40', pmr.accepted && pmr.reserved === 8 && eBefore - 8 >= A.rules().me.combat_energy.current - 10 && dPM.skill === 'PM_PUSH' && Math.abs(dPM.components.physical - 125 * 0.7 * 0.6) < 1e-6 && Math.abs(dPM.components.magical - 125 * 0.7 * 0.4) < 1e-6, dPM);

A.send('GUARD', { kind: 'PHYSICAL' }); A.send('FIELD_INCOMING', { kind: 'MIXED' }); run(H1, 2.2); var dm = lastDamage(H1); A.send('GUARD', { kind: 'NONE' });

ok('incoming mixed hit behind PHYSICAL guard: physical component ×0.1, magical passes, then armor once (expected ' + (125 * 0.7 * (0.6 * 0.1 * 0.84 + 0.4 * 0.85)).toFixed(3) + ')', dm && dm.on === 'PLAYER_A' && dm.guard === 'PHYSICAL' && Math.abs(dm.applied - 125 * 0.7 * (0.6 * 0.1 * 0.84 + 0.4 * 0.85)) < 0.01, dm);

run(H1, 1.5); A.send('GUARD', { kind: 'MAGICAL' }); A.send('FIELD_INCOMING', { kind: 'MIXED' }); run(H1, 2.2); var dm2 = lastDamage(H1); A.send('GUARD', { kind: 'NONE' });

ok('the same mixed hit behind MAGICAL guard: magical ×0.1, physical passes (expected ' + (125 * 0.7 * (0.6 * 0.84 + 0.4 * 0.1 * 0.85)).toFixed(3) + ') — never reduced twice', dm2 && dm2.guard === 'MAGICAL' && Math.abs(dm2.applied - 125 * 0.7 * (0.6 * 0.84 + 0.4 * 0.1 * 0.85)) < 0.01, dm2);

run(H1, 1.5); A.send('GUARD', { kind: 'MAGICAL' }); var hpBefore = A.rules().me.hp; A.send('FIELD_INCOMING', { kind: 'MAGIC' }); run(H1, 4); A.send('GUARD', { kind: 'NONE' });

ok('an eligible pure-magic projectile is DISSIPATED by a frontal magical guard (no damage, no status)', logs(H1, /R1723_DISSIPATED/).length === 1 && A.rules().me.hp === hpBefore, logs(H1, /R1723_DISSIPATED/));

run(H1, 3); A.send('GUARD', { kind: 'PHYSICAL' }); hpBefore = A.rules().me.hp; A.send('FIELD_INCOMING', { kind: 'MAGIC' }); run(H1, 4); A.send('GUARD', { kind: 'NONE' }); var dp = lastDamage(H1);

ok('the same projectile is NOT dissipated by a physical guard: full magical component minus magical armor (125 × 0.6 × 0.85)', logs(H1, /R1723_DISSIPATED/).length === 1 && dp && dp.skill === 'ATHLETE_VECTOR' && dp.on === 'PLAYER_A' && Math.abs(dp.applied - 125 * 0.6 * 0.85) < 0.01, dp);

ok('guard is refused while an attack is committed; a dash releases guard; both guards are one exclusive choice', (function () { A.send('RULES_SELECT', { category: 'PHYSICAL', slot: 0 }); var c = A.send('RULES_CAST'); var g = A.send('GUARD', { kind: 'PHYSICAL' }); run(H1, 1.5); var g2 = A.send('GUARD', { kind: 'PHYSICAL' }); var g3 = A.send('GUARD', { kind: 'MAGICAL' }); var d = A.send('DASH', { dir: 'BACK' }); run(H1, 0.5); return c.accepted && g.reason === 'ATTACK_IN_PROGRESS' && g2.accepted && g3.guard === 'MAGICAL' && d.accepted && A.play().guard === null; })());

ok('selected category never switches with range: SPECIAL_MAGIC stays selected after walking into melee range', (function () { A.send('RULES_SELECT', { category: 'SPECIAL_MAGIC', slot: 0 }); faceDummy(H1, A, 1.0); return A.rules().me.category === 'SPECIAL_MAGIC' && A.rules().me.selected_skill === A.rules().skills.SPECIAL_MAGIC[0].id; })());

ok('tap selection never fires and a change during an action applies to the next action only', (function () { A.send('RULES_SELECT', { category: 'PHYSICAL', slot: 1 }); var before = logs(H1, /R1723_CAST_START/).length; var c = A.send('RULES_CAST'); var s2 = A.send('RULES_SELECT', { category: 'PHYSICAL', slot: 2 }); run(H1, 1.5); return logs(H1, /R1723_CAST_START/).length === before + 1 && c.skill === 'PA_PULL' && s2.applies_to === 'NEXT_ACTION' && A.rules().me.selected_skill === 'PA_HINGE'; })());



/* 3. healing */

A.send('RULES_CLASS', { class: 'BAGE' }); A.send('FIELD_ALLY', { op: 'SPAWN' }); A.send('RULES_SELECT', { category: 'SPECIAL_MAGIC', slot: 0 });

ok('BAGE Mend heals a damaged practice-team ally outside a match (200 × potency 100 %), spends combat energy, never through resistance', (function () { var e = A.rules().me.combat_energy.current; var r = castAndWait(H1, A, { aim_id: 'PRACTICE_ALLY' }, 2.5); var hl = logs(H1, /R1723_HEAL/).slice(-1)[0]; var ally = A.rules().others.filter(function (o) { return o.id === 'PRACTICE_ALLY'; })[0]; return r.accepted && r.aim === 'PRACTICE_ALLY' && hl && hl.amount === 200 && Math.abs(ally.hp - (ally.max * 0.7 + 200)) < 1e-6 && e - A.rules().me.combat_energy.current >= 18 - 6; })(), { hl: logs(H1, /R1723_HEAL/).slice(-1)[0], ally: A.rules().others.filter(function (o) { return o.id === 'PRACTICE_ALLY'; }).map(function (o) { return [o.hp, o.max]; }) });

ok('healing caps at missing HP (self at full HP heals 0) and a knocked-out / enemy / spectator target is refused', (function () { run(H1, 5.5); var self = castAndWait(H1, A, {}, 2.5); var hl = logs(H1, /R1723_HEAL/).slice(-1)[0]; run(H1, 5.5); var enemy = A.send('RULES_CAST', { aim_id: 'FIELD_DUMMY' }); return self.accepted && hl.on === 'PLAYER_A' && hl.amount === 0 && hl.capped_at_missing === true && enemy.reason === 'NOT_AN_ALLY'; })());

ok('Visionary has no heal / lifesteal skill at all (rule flagged as the "not allowed to field" reading)', R.skills.filter(function (s) { return s.classes.indexOf('VISIONARY') >= 0; }).every(function (s) { return s.effect.type !== 'HEAL'; }) && R.status_rules.visionary_healing_allowed === false);



/* 4. precommit interruption vs released autonomous effect; reservation / fizzle; no duplicate spend; cleanup on KO / reset */

faceDummy(H1, A, 2.0); run(H1, 3); selSM(A, 'BAGE_MIST');

ok('an incoming stagger during startup FIZZLES the cast: 25 % of the reservation consumed, 75 % released, fizzle cooldown max(0.5 s, 25 % cd), no effect placed', (function () { var e0 = A.rules().me.combat_energy.current; var c = A.send('RULES_CAST'); var dup = A.send('RULES_CAST'); A.send('FIELD_INCOMING', { kind: 'PHYSICAL' }); run(H1, 1.0); var fz = logs(H1, /R1723_FIZZLE/).slice(-1)[0]; return c.accepted && c.skill === 'BAGE_MIST' && dup.reason === 'ACTION_IN_PROGRESS' && fz && fz.consumed === 5 && fz.released === 15 && fz.fizzle_cooldown_s === 2.5 && A.rules().entities.length === 0 && Math.abs((e0 - A.rules().me.combat_energy.current) - 5) < 1.5; })(), logs(H1, /R1723_FIZZLE/).slice(-1)[0]);

ok('no manual cancel / refund route exists and an invalid or repeated command costs nothing', (function () { var e0 = A.rules().me.combat_energy.current; var r1 = A.send('RULES_CAST', { skill_id: 'NOPE' }); var r2 = A.send('RULES_CAST', { skill_id: 'VISIONARY_ANKLE' }); return !r1.accepted && !r2.accepted && r2.reason === 'SKILL_NOT_FOR_CLASS' && A.rules().me.combat_energy.current === e0; })());

run(H1, 3); ok('a released autonomous projectile continues after its caster is interrupted (Trackburst in flight while the caster is staggered) and still lands', (function () { A.send('RULES_CLASS', { class: 'ATHLETE' }); faceDummy(H1, A, 9.0); selSM(A, 'ATHLETE_TRACK'); var c = A.send('RULES_CAST'); run(H1, 1.1); var released = A.rules().entities.filter(function (e) { return e.type === 'PROJECTILE'; }).length; A.send('FIELD_INCOMING', { kind: 'PHYSICAL' }); run(H1, 1.5); var hit = logs(H1, /^R1723_DAMAGE$/).filter(function (d) { return d.skill === 'ATHLETE_TRACK' && d.on === 'FIELD_DUMMY'; }).length; return c.accepted && c.skill === 'ATHLETE_TRACK' && released === 1 && hit === 1; })());

ok('knockout removes the owner\'s constructs; practice reset clears entities, statuses, casts and reservations exactly once', (function () { A.send('RULES_CLASS', { class: 'BAGE' }); faceDummy(H1, A, 2.0); selSM(A, 'BAGE_MIST'); castAndWait(H1, A, {}, 1.5); var n = A.rules().entities.length; var rs = A.send('PRACTICE_RESET'); return n === 1 && rs.accepted && A.rules().entities.length === 0 && A.rules().me.hp === P.BAGE.max_health && A.rules().me.combat_energy.current === P.BAGE.combat_energy_capacity && A.rules().me.cast === null; })());



/* 5. fixed zone, following debuff, finite ticks, reentry, strongest-only slow / DoT, caps */

field(H1, A, 'BAGE'); faceDummy(H1, A, 2.0); selSM(A, 'BAGE_MIST'); var dpos = dummy(A).position; var hp0 = dummy(A).hp; var z = castAndWait(H1, A, { aim_point: dpos }, 1.3);

ok('Sapping Mist is a WORLD_FIXED zone at the aimed point: first tick after 1 s, 6 ticks of 20 × BAGE potency × magical armor, no immediate extra tick', (function () { var t0 = dummy(A).hp; run(H1, 0.85); var t1 = dummy(A).hp; run(H1, 0.2); var t2 = dummy(A).hp; run(H1, 6); var ticks = logs(H1, /^R1723_DAMAGE$/).filter(function (d) { return d.skill === 'BAGE_MIST'; }); return z.accepted && z.point && Math.abs(z.point.x - dpos.x) < 1e-6 && t0 === t1 && t2 < t1 && ticks.length === 6 && Math.abs(ticks[0].applied - 20 * 0.85) < 0.01 && A.rules().entities.length === 0; })(), logs(H1, /^R1723_DAMAGE$/).filter(function (d) { return d.skill === 'BAGE_MIST'; }).length);

ok('construct cap: at the class cap a new persistent placement is refused WITHOUT charge (BAGE cap lowered to 1 through the live dev table for this check)', (function () { run(H1, 10); var live = H1.dev.play_internals().rulesField().rules(); live.class_profiles.BAGE.max_persistent_offensive_entities = 1; var a1 = castAndWait(H1, A, { aim_point: { x: dpos.x + 3, z: dpos.z + 3 } }, 2.0); selSM(A, 'BAGE_SEAL'); var e1 = A.rules().me.combat_energy.current; var a3 = A.send('RULES_CAST', { aim_point: { x: dpos.x - 3, z: dpos.z + 3 } }); live.class_profiles.BAGE.max_persistent_offensive_entities = 2; selSM(A, 'BAGE_MIST'); return a1.accepted && A.rules().me.constructs === 1 && a3.reason === 'CONSTRUCT_CAP' && a3.detail.charged === false && A.rules().me.combat_energy.current === e1; })());

A.send('PRACTICE_RESET'); A.send('RULES_CLASS', { class: 'VISIONARY' }); faceDummy(H1, A, 2.0);

ok('Ankle Load is a FOLLOW_TARGET slow (40 %, 4 s) on the dummy; Cable Snare trap triggers on the dummy and attaches a VISIONARY_LOAD DoT + slow; the strongest slow wins (never below 40 % movement)', (function () { A.send('RULES_SELECT', { category: 'SPECIAL_MAGIC', slot: 0 }); var s1 = castAndWait(H1, A, {}, 1.5); var st = dummy(A).statuses; selSM(A, 'VISIONARY_CABLE'); var s2 = castAndWait(H1, A, { aim_point: dummy(A).position }, 1.6); run(H1, 0.3); var st2 = dummy(A).statuses; var slows = st2.filter(function (x) { return x.kind === 'SLOW'; }); var dots = st2.filter(function (x) { return x.kind === 'DOT'; }); return s1.accepted && st.some(function (x) { return x.kind === 'SLOW' && x.magnitude === 0.4; }) && s2.accepted && logs(H1, /R1723_TRAP_TRIGGERED/).length === 1 && slows.length === 1 && slows[0].magnitude === 0.4 && dots.length === 1 && dots[0].family === 'VISIONARY_LOAD'; })(), dummy(A).statuses);

ok('attached DoT ticks 5 × (100/5 × 0.9 potency × 1.25 periodic × 0.85 armor) and is NOT retroactively blocked by a guard; reapplication refreshes without an extra tick', (function () { var before = logs(H1, /^R1723_DAMAGE$/).filter(function (d) { return d.family === 'VISIONARY_LOAD'; }).length; run(H1, 5.5); var ticks = logs(H1, /^R1723_DAMAGE$/).filter(function (d) { return d.family === 'VISIONARY_LOAD'; }); return ticks.length - before === 5 && Math.abs(ticks[ticks.length - 1].applied - 20 * 0.9 * 1.25 * 0.85) < 0.01 && ticks[ticks.length - 1].periodic === true && ticks[ticks.length - 1].guard === null; })());

ok('Visionary comparable periodic output exceeds BAGE (120 budget → 135 vs 120 before defenses, no duration double-count)', (function () { var v = composeDamage(R, { skill: R._skills_by_id.VISIONARY_CHAIN, raw: 120, attacker_profile: P.VISIONARY, target_profile: null, periodic: true }); var b = composeDamage(R, { skill: R._skills_by_id.BAGE_MIST, raw: 120, attacker_profile: P.BAGE, target_profile: null, periodic: true }); return Math.abs(v.scaled - 135) < 1e-9 && Math.abs(b.scaled - 120) < 1e-9; })());



/* 6. niche fixture: invisibility, immunity, discord (real teammates), Last Pulse (interrupted vs atomic) */

var H2 = newHost(); var A2 = sess(H2, 'PLAYER_A'), B2 = sess(H2, 'PLAYER_B'); field(H2, A2, 'BAGE'); field(H2, B2, 'ATHLETE'); A2.send('RULES_NICHE', { on: true });

ok('BAGE niche loadout swaps the special-magic set outside a round: the first two niche skills (Vanish, Phase Shell) are equipped, all four (incl. Discord Mark, Last Pulse) are eligible in the pool', A2.rules().skills.SPECIAL_MAGIC.map(function (s) { return s.id; }).join(',') === 'BAGE_VANISH,BAGE_SHELL' && ['BAGE_VANISH', 'BAGE_SHELL', 'BAGE_DISCORD', 'BAGE_LAST_PULSE'].every(function (id) { return A2.rules().me.loadout.SPECIAL_MAGIC.pool.some(function (p) { return p.skill_id === id && p.eligible; }); }), A2.rules().me.loadout.SPECIAL_MAGIC);

faceDummy(H2, A2, 2.0); A2.send('RULES_SELECT', { category: 'SPECIAL_MAGIC', slot: 0 });

ok('Vanish: 4 s invisibility; its own activation does not break it; an enemy snapshot hides the invisible actor; incoming damage breaks it', (function () { var r = castAndWait(H2, A2, {}, 1.6); var inv = A2.rules().me.invisible; var seenByDummy = H2.dev.play_internals().rulesField().snapshotFor('FIELD_DUMMY').others.some(function (o) { return o.id === 'PLAYER_A'; }); A2.send('FIELD_INCOMING', { kind: 'PHYSICAL' }); run(H2, 1.5); return r.accepted && inv && !seenByDummy && !A2.rules().me.invisible && logs(H2, /R1723_INVISIBILITY_BROKEN/).slice(-1)[0].why === 'damage'; })());

ok('Vanish breaks on the next non-movement commit (a strike), not on a dash', (function () { run(H2, 16); castAndWait(H2, A2, {}, 1.6); var d = A2.send('DASH', { dir: 'LEFT' }); run(H2, 0.5); var stillInv = A2.rules().me.invisible; A2.send('RULES_SELECT', { category: 'PHYSICAL', slot: 0 }); castAndWait(H2, A2, {}, 0.6); return d.accepted && stillInv && !A2.rules().me.invisible && /non-movement/.test(logs(H2, /R1723_INVISIBILITY_BROKEN/).slice(-1)[0].why); })());

ok('Phase Shell: 1.25 s immunity blocks incoming damage and new harmful statuses, allows dash, refuses new casts, expires on its timer', (function () { faceDummy(H2, A2, 2.0); run(H2, 2); A2.send('RULES_SELECT', { category: 'SPECIAL_MAGIC', slot: 1 }); var r = castAndWait(H2, A2, {}, 1.1); var imm = A2.rules().me.immune; A2.send('FIELD_INCOMING', { kind: 'PHYSICAL' }); run(H2, 0.35); var blocked = logs(H2, /R1723_DAMAGE_BLOCKED_BY_IMMUNITY/).length; A2.send('RULES_SELECT', { category: 'PHYSICAL', slot: 0 }); var cast2 = A2.send('RULES_CAST'); var d = A2.send('DASH', { dir: 'BACK' }); run(H2, 1.5); return r.accepted && imm && blocked === 1 && cast2.reason === 'IMMUNE_ACTIVE' && d.accepted && !A2.rules().me.immune; })());

/* discord between two real teammates in a 2v2 with passive synthetics */

selSM(A2, 'BAGE_DISCORD');   /* the equipped set changes outside rounds only: Discord Mark is equipped before the match forms */ var tm = A2.send('TEAM_MATCH', { op: 'START', size: 2 }); var jb = B2.send('TEAM_MATCH', { op: 'JOIN', team: 'A' }); var bg = A2.send('TEAM_MATCH', { op: 'BEGIN', passive_synthetics: true }); run(H2, 0.2);

ok('a 2v2 development match forms with two real teammates and passive synthetic opponents under a frozen ruleset (journaled RULESET_FREEZE)', tm.accepted && jb.accepted && bg.accepted && A2.rules().match.state === 'ACTIVE' && A2.rules().match.teams.A.join(',') === 'PLAYER_A,PLAYER_B' && A2.rules().match.teams.B.length === 2 && /frozen/.test(A2.rules().ruleset) && logs(H2, /^RULESET_FREEZE$/).length === 1, A2.rules().match);

ok('Discord Mark on an ally requires deliberate confirmation; without the mark a strike cannot hit a teammate', (function () { A2.send('RULES_NICHE', { on: true }); var r0 = selSM(A2, 'BAGE_DISCORD'); var no = A2.send('RULES_CAST', { aim_id: 'PLAYER_B' }); B2.send('MOVE', { forward: 0, strafe: 0, yaw: Math.atan2(A2.play().position.x - B2.play().position.x, -(A2.play().position.z - B2.play().position.z)) }); B2.send('RULES_SELECT', { category: 'PHYSICAL', slot: 0 }); var before = A2.rules().me.hp; castAndWait(H2, B2, {}, 1.0); return r0.reason === undefined && no.reason === 'ALLY_CONFIRMATION_REQUIRED' && A2.rules().me.hp === before && logs(H2, /R1723_MISS/).length >= 1; })());

ok('a confirmed ally mark lets the marked teammate\'s VOLUNTARY strike hit the marker at 50 %; team identity, aim choice and healing eligibility unchanged; both actors recorded', (function () { var mk = castAndWait(H2, A2, { aim_id: 'PLAYER_B', confirm_ally: true }, 1.6); var marked = B2.rules().me.discord; var before = A2.rules().me.hp; castAndWait(H2, B2, {}, 1.0); var d = lastDamage(H2); var teamB = B2.rules().match.my_team; return mk.accepted && marked && d && d.on === 'PLAYER_A' && d.by === 'PLAYER_B' && d.discord === true && d.curse_source === 'PLAYER_A' && Math.abs(d.applied - 100 * 0.5 * 0.76) < 0.01 && teamB === 'A' && A2.rules().me.hp < before; })(), lastDamage(H2));

ok('discord never allows self-damage and is disabled outside matches', (function () { var self = A2.send('RULES_CAST', { aim_id: 'PLAYER_A', confirm_ally: true }); A2.send('TEAM_MATCH', { op: 'LEAVE' }); B2.send('TEAM_MATCH', { op: 'LEAVE' }); run(H2, 0.2); var en = A2.send('TEAM_MATCH', { op: 'END' }); var out = A2.send('RULES_CAST', { skill_id: 'BAGE_DISCORD', aim_id: 'FIELD_DUMMY' }); return (self.reason === 'NO_SELF_TARGET' || self.reason === 'COOLDOWN') && en.accepted && out.reason === 'OUT_OF_MATCH'; })());

/* Last Pulse */

var H3 = newHost({ accounts: ['PLAYER_A'] }); var A3 = sess(H3, 'PLAYER_A'); field(H3, A3, 'BAGE'); A3.send('RULES_NICHE', { on: true });

ok('Last Pulse interrupted before commit produces neither the self-KO nor the burst (25 % consumed, 75 % released)', (function () { faceDummy(H3, A3, 1.5); selSM(A3, 'BAGE_LAST_PULSE'); var c = A3.send('RULES_CAST'); run(H3, 0.5); A3.send('FIELD_INCOMING', { kind: 'PHYSICAL' }); run(H3, 1.5); var fz = logs(H3, /R1723_FIZZLE/).slice(-1)[0]; return c.accepted && c.startup_s === 2.625 && fz && fz.skill === 'BAGE_LAST_PULSE' && fz.consumed === 10 && !A3.rules().me.ko && logs(H3, /R1723_SELF_KO/).length === 0; })());

ok('Last Pulse resolves self-KO and the burst in ONE batch before victory evaluation: simultaneous elimination of both teams is DRAW_DEV (no winner, no reward)', (function () { A3.send('PRACTICE_RESET'); var st = A3.send('TEAM_MATCH', { op: 'START', size: 1 }); A3.send('TEAM_MATCH', { op: 'BEGIN', passive_synthetics: true }); run(H3, 0.2); var enemy = A3.rules().others.filter(function (o) { return o.team === 'B'; })[0]; var goal = { x: enemy.position.x, z: enemy.position.z + 1.2 }; for (var i = 0; i < 300; i++) { var p = A3.play().position; var dx = goal.x - p.x, dz = goal.z - p.z, dd = Math.hypot(dx, dz); if (dd < 0.35) break; A3.send('MOVE', { forward: +(-dz / dd).toFixed(3), strafe: +(dx / dd).toFixed(3), yaw: +Math.atan2(dx, -dz).toFixed(3) }); H3.tick(DT); } A3.send('MOVE', { forward: 0, strafe: 0, yaw: +Math.atan2(enemy.position.x - A3.play().position.x, -(enemy.position.z - A3.play().position.z)).toFixed(3) }); run(H3, 0.4); A3.send('RULES_SELECT', { category: 'PHYSICAL', slot: 2 }); for (var k = 0; k < 90; k++) { var e2 = A3.rules().others.filter(function (o) { return o.team === 'B'; })[0]; if (e2.hp <= 300 * 0.85) break; castAndWait(H3, A3, {}, 1.3); }   /* B8 §9: match synthetics carry the ×2 profile too — more whittling casts */ var e3 = A3.rules().others.filter(function (o) { return o.team === 'B'; })[0]; selSM(A3, 'BAGE_LAST_PULSE'); var lp = A3.send('RULES_CAST'); run(H3, 3.2); var m = A3.rules().match; var ko = logs(H3, /^R1723_KO$/).slice(-1)[0]; var sk = logs(H3, /R1723_SELF_KO/).length; return st.accepted && e3.hp <= 255 && lp.accepted && sk === 1 && ko && ko.skill === 'BAGE_LAST_PULSE' && m.state === 'ENDED' && m.outcome === 'DRAW_DEV' && m.winner === null && m.rewards === 'NONE'; })(), { match: A3.rules().match, e3: (function(){ var e=A3.rules().others.filter(function (o) { return o.team === 'B'; })[0]; return e && [e.hp, e.max, e.ko]; })(), me: [A3.rules().me.hp, A3.rules().me.combat_energy.current], last: logs(H3, /R1723_/).slice(-4).map(function(l){return l.kind+':'+(l.skill||'')+':'+(l.reason||l.why||'');}) });



/* 7. teams up to 3v3, elimination, spectators, disconnect deadlines (fake clock), late reconnect with zero ticks, NO_CONTEST once */

var fake = { t: 500 }; var H4 = createDuelHost({ data: data, composeHeadless: composeHeadless, clock: { kind: 'FAKE_WALL', now: function () { return fake.t; } } }); ['PLAYER_A', 'PLAYER_B', 'SPECTATOR_1'].forEach(function (id) { H4.dev.createAccount(id, {}); }); var A4 = sess(H4, 'PLAYER_A'), B4 = sess(H4, 'PLAYER_B'), S4 = sess(H4, 'SPECTATOR_1'); field(H4, A4, 'TITAN'); field(H4, B4, 'LEAN');

ok('spectators are not combatants: an account outside the field cannot join or affect a team match', S4.send('TEAM_MATCH', { op: 'JOIN', team: 'A' }).reason === 'NOT_IN_ROOM' && S4.send('RULES_CAST').reason === 'NOT_IN_ROOM');

ok('a 3v3 with two real players + four synthetics reaches a real team elimination (WIN, no reward) and the losers cannot respawn in-round', (function () { A4.send('TEAM_MATCH', { op: 'START', size: 3 }); B4.send('TEAM_MATCH', { op: 'JOIN', team: 'A' }); var bg = A4.send('TEAM_MATCH', { op: 'BEGIN' }); run(H4, 90); var m = A4.rules().match; var kos = logs(H4, /^R1723_KO$/).length; return bg.accepted && m.size === 3 && m.state === 'ENDED' && m.outcome === 'WIN' && (m.winner === 'A' || m.winner === 'B') && kos >= 3 && logs(H4, /R1723_RESPAWN/).length === 0 && m.rewards === 'NONE'; })(), A4.rules().match);

A4.send('TEAM_MATCH', { op: 'END' }); A4.send('PRACTICE_RESET'); B4.send('PRACTICE_RESET');

ok('OD-29 team extension: one disconnect pauses the whole round; a duplicate notice keeps the ORIGINAL deadline; resume only when all missing return', (function () { A4.send('TEAM_MATCH', { op: 'START', size: 2 }); B4.send('TEAM_MATCH', { op: 'JOIN', team: 'A' }); A4.send('TEAM_MATCH', { op: 'BEGIN', passive_synthetics: true }); run(H4, 0.3); var d1 = H4.disconnect(A4.sid); var dl = d1.reconnect_deadline_t; fake.t += 3; var d1b = H4.disconnect(A4.sid); var paused = A4.rules().match.paused; var d2 = H4.disconnect(B4.sid); fake.t += 2; var r1 = H4.reconnect({ client_id: 'c-PLAYER_A', session_id: A4.sid, token: H4.dev.tokens().PLAYER_A }); var stillPaused = A4.rules().match.paused && A4.rules().match.missing.join(',') === 'PLAYER_B'; var r2 = H4.reconnect({ client_id: 'c-PLAYER_B', session_id: B4.sid, token: H4.dev.tokens().PLAYER_B }); return d1.ok && d1b.already === true && d1b.reconnect_deadline_t === dl && paused && d2.ok && r1.ok && stillPaused && r2.ok && A4.rules().match.state === 'ACTIVE' && logs(H4, /R1723_DUPLICATE_DISCONNECT_IGNORED/).length >= 0; })(), A4.rules().match);

ok('a paused round freezes casts, statuses, cooldowns and entities (no simulation for match members while paused)', (function () { faceDummy(H4, A4, 2.0); A4.send('RULES_SELECT', { category: 'SPECIAL_MAGIC', slot: 0 }); var c = A4.send('RULES_CAST'); H4.disconnect(B4.sid); run(H4, 2.5); var still = A4.rules().me.cast; H4.reconnect({ client_id: 'c-PLAYER_B', session_id: B4.sid, token: H4.dev.tokens().PLAYER_B }); run(H4, 2.5); return c.accepted && still && still.phase === 'STARTUP' && A4.rules().me.cast === null; })());

ok('late reconnect after the 10-s deadline with ZERO simulation ticks ends the match NO_CONTEST exactly once (no winner, no reward); a second expiry does not re-trigger', (function () { H4.disconnect(A4.sid); H4.disconnect(B4.sid); fake.t += 10.5; var r = H4.reconnect({ client_id: 'c-PLAYER_A', session_id: A4.sid, token: H4.dev.tokens().PLAYER_A }); var m = H4.snapshot(B4.sid).play.rules.match; var n1 = logs(H4, /^R1723_MATCH$/).filter(function (e) { return e.outcome === 'NO_CONTEST'; }).length; run(H4, 0.2); fake.t += 1; H4.reconnect({ client_id: 'c-PLAYER_B', session_id: B4.sid, token: H4.dev.tokens().PLAYER_B }); var n2 = logs(H4, /^R1723_MATCH$/).filter(function (e) { return e.outcome === 'NO_CONTEST'; }).length; return !r.ok && r.reason === 'SESSION_EXPIRED' && r.expired_on_reconnect === true && m.state === 'ENDED' && m.outcome === 'NO_CONTEST' && m.winner === null && n1 === 1 && n2 === 1; })());



/* 8. crash / replay under a frozen ruleset; a mutated live table and a poisoned clock are never consulted; missing freeze record reported */

var sqlite = await loadSqlite(); var TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mahworld-5b-test-r1723-')); var st = createSqliteStore(sqlite, { dir: TMP }); var op = st.open({ identity: hostIdentity(data) }); var fakeC = { t: 1000 };

var H5 = createDuelHost({ data: data, composeHeadless: composeHeadless, store: st, opened: op, clock: { kind: 'FAKE_WALL', now: function () { return fakeC.t; } } }); H5.dev.createAccount('PLAYER_A', {}); var A5 = sess(H5, 'PLAYER_A'); field(H5, A5, 'VISIONARY'); A5.send('TEAM_MATCH', { op: 'START', size: 1 }); A5.send('TEAM_MATCH', { op: 'BEGIN', passive_synthetics: true }); run(H5, 0.3);

(function () { var enemy = A5.rules().others.filter(function (o) { return o.team === 'B'; })[0]; var goal = { x: enemy.position.x, z: enemy.position.z + 1.5 }; for (var i = 0; i < 300; i++) { var p = A5.play().position; var dx = goal.x - p.x, dz = goal.z - p.z, dd = Math.hypot(dx, dz); if (dd < 0.35) break; A5.send('MOVE', { forward: +(-dz / dd).toFixed(3), strafe: +(dx / dd).toFixed(3), yaw: +Math.atan2(dx, -dz).toFixed(3) }); H5.tick(DT); } A5.send('MOVE', { forward: 0, strafe: 0, yaw: +Math.atan2(enemy.position.x - A5.play().position.x, -(enemy.position.z - A5.play().position.z)).toFixed(3) }); run(H5, 0.4); })();

A5.send('RULES_SELECT', { category: 'PHYSICAL_MAGIC', slot: 0 }); castAndWait(H5, A5, {}, 1.5); A5.send('RULES_SELECT', { category: 'SPECIAL_MAGIC', slot: 0 }); castAndWait(H5, A5, {}, 1.5); A5.send('RULES_SELECT', { category: 'SPECIAL_MAGIC', slot: 1 }); castAndWait(H5, A5, { aim_point: A5.rules().others.filter(function (o) { return o.team === 'B'; })[0].position }, 2.5); H5.disconnect(A5.sid); fakeC.t += 2; H5.reconnect({ client_id: 'c-PLAYER_A', session_id: A5.sid, token: H5.dev.tokens().PLAYER_A }); run(H5, 1.0);

var before5 = A5.rules(); var live5 = H5.dev.play_internals().rulesField().rules(); st.simulateCrash();

var st2 = createSqliteStore(sqlite, { dir: TMP }); if (fs.existsSync(st.lockPath)) fs.unlinkSync(st.lockPath); var op2 = st2.open({ identity: hostIdentity(data) }); var poisoned = 0; var H6 = createDuelHost({ data: data, composeHeadless: composeHeadless, store: st2, opened: op2, clock: { kind: 'POISONED', now: function () { poisoned++; return 9e9; } } });

H6.dev.play_internals().rulesField().rules().class_profiles.VISIONARY.potency_index.PHYSICAL_MAGIC = 1;   /* mutate the LIVE table before replay: the frozen match tables must win */

var rec6 = H6.recover(); var after5 = H6.snapshot(A5.sid).play.rules;

ok('crash + replay under the FROZEN ruleset reproduces damage, costs, statuses, entities, target snapshots and match state with zero inconsistencies although the live table was mutated', rec6.ok && rec6.inconsistencies.length === 0 && after5 && after5.me.hp === before5.me.hp && after5.me.combat_energy.current === before5.me.combat_energy.current && JSON.stringify(after5.others.map(function (o) { return [o.id, o.hp, o.statuses.length]; })) === JSON.stringify(before5.others.map(function (o) { return [o.id, o.hp, o.statuses.length]; })) && after5.entities.length === before5.entities.length && after5.match.state === before5.match.state && /frozen/.test(after5.ruleset), { rec: rec6.inconsistencies, before: [before5.me.hp, before5.me.combat_energy.current], after: after5 && [after5.me.hp, after5.me.combat_energy.current] });

ok('historical replay never consulted the poisoned fresh clock; the recovered host is HELD; QA replay issued no live rewards or effects', poisoned === 0 && H6.lifecycle() === 'RECOVERY_HELD_DEV' && Object.keys(H6.dev.rewards()).length === 0);

st2.closeClean();

(function () { var raw = new sqlite.DatabaseSync(path.join(TMP, 'duel_host.sqlite')); raw.exec("DELETE FROM journal WHERE kind = 'RULESET_FREEZE'"); raw.close(); })();

var st3 = createSqliteStore(sqlite, { dir: TMP }); var op3 = st3.open({ identity: hostIdentity(data) }); var H7 = createDuelHost({ data: data, composeHeadless: composeHeadless, store: st3, opened: op3 }); var rec7 = H7.recover();

ok('a journal whose RULESET_FREEZE record is missing cannot reconstruct the match: replay reports RULESET_MISSING through the established inconsistency path (unresolved, HELD) instead of inventing tables', !rec7.ok && rec7.unresolved && rec7.inconsistencies.some(function (i) { return i.kind === 'RULESET_MISSING'; }) && H7.lifecycle() === 'RECOVERY_HELD_DEV', rec7.inconsistencies.slice(0, 3)); st3.closeClean();



/* 9. PLAYABILITY PASS — lock-on, line of sight, colliders, free-roam context, recovery of lock / collider state */

var H8 = newHost({ accounts: ['PLAYER_A', 'PLAYER_B'] }); var A8 = sess(H8, 'PLAYER_A'); A8.send('ENTER_ROOM', { room: 'FIELD' }); var COLV = A8.rules().colliders;

ok('the field publishes its versioned collider layout (walls, pillars, rounded barriers, ramps) and free roam is the default context', COLV && /^FIELD_COLLIDERS_(CITY_2|DISTRICT_V1)$/.test(COLV.version) && (COLV.version === 'FIELD_COLLIDERS_CITY_2' ? COLV.shapes.length === 28 : COLV.shapes.length === 28 && COLV.district_shapes === DISTRICT_SHAPES && COLV.district_shapes > 0 && COLV.landmarks.length === 4 && COLV.groups.length === 4) && COLV.shapes.filter(function (x) { return x.building; }).length === 4 && COLV.shapes.some(function (x) { return x.walkable; }) && COLV.interactables.filter(function (x) { return x.kind === 'TRANSIT'; }).length === 2 && COLV.interactables.filter(function (x) { return x.kind === 'ENTER'; }).length === 10 &&   /* B8 §19: + TEMPLE_DOOR / TOWER_DOOR; M4: four truthful civic shells behind the original plaza façades */   /* S09 city: + tree elevator trunk, walkable platform, 4 rims, 3 pods; two TRANSIT interactables; P8: three ENTER doors (gym, clothing, weapons); JOB B 2026-09-19: + MATCH_DOOR (official match hall) */ A8.rules().context === 'FREE' && A8.rules().practice === false, COLV && { version: COLV.version, district_shapes: COLV.district_shapes, expected: DISTRICT_SHAPES });

ok('FREE ROAM: an aligned strike on the dummy animates (cast, cooldown, impact) but applies zero damage and no reward / receipt', (function () { faceDummy(H8, A8, 2.0); var hp0 = dummy(A8).hp; var rc0 = H8.receipts.stats(); var c = castAndWait(H8, A8, {}, 1.2); var hl = logs(H8, /R1723_HARMLESS/).slice(-1)[0]; var imp = logs(H8, /R1723_HARMLESS/).length >= 1; return c.accepted && dummy(A8).hp === hp0 && hl && hl.on === 'FIELD_DUMMY' && hl.context === 'FREE' && imp && JSON.stringify(H8.receipts.stats()) === JSON.stringify(rc0); })());

ok('FREE ROAM: a following slow applies no status either; BAGE Mend still heals (support)', (function () { A8.send('RULES_CLASS', { class: 'VISIONARY' }); faceDummy(H8, A8, 2.0); A8.send('RULES_SELECT', { category: 'SPECIAL_MAGIC', slot: 0 }); castAndWait(H8, A8, {}, 1.4); var noSlow = !dummy(A8).statuses.some(function (x) { return x.kind === 'SLOW'; }); A8.send('RULES_CLASS', { class: 'BAGE' }); A8.send('FIELD_ALLY', { op: 'SPAWN' }); A8.send('RULES_SELECT', { category: 'SPECIAL_MAGIC', slot: 0 }); var h = castAndWait(H8, A8, { aim_id: 'PRACTICE_ALLY' }, 2.2); var healed = logs(H8, /^R1723_HEAL$/).length === 1; return noSlow && h.accepted && healed; })());

ok('PRACTICE BATTLE toggle enables damage on the dummy; the context is recorded at commit - a projectile committed in free roam stays harmless even if practice starts before it lands', (function () { A8.send('RULES_CLASS', { class: 'ATHLETE' }); faceDummy(H8, A8, 8.0); selSM(A8, 'ATHLETE_TRACK'); var hp0 = dummy(A8).hp; var c = A8.send('RULES_CAST'); run(H8, 1.1); A8.send('FIELD_PRACTICE', { on: true }); run(H8, 1.5); var stillFull = dummy(A8).hp === hp0; var harm = logs(H8, /R1723_HARMLESS/).filter(function (l) { return l.skill === 'ATHLETE_TRACK'; }).length; run(H8, 8); A8.send('RULES_SELECT', { category: 'PHYSICAL', slot: 0 }); faceDummy(H8, A8, 2.0); castAndWait(H8, A8, {}, 1.2); return c.accepted && stillFull && harm === 1 && dummy(A8).hp < hp0 && A8.rules().context === 'PRACTICE'; })());

ok('colliders: walking into a pillar stops with sliding, a dash cannot tunnel through a barrier, flight below a pillar top is blocked and above it passes', (function () { A8.send('PRACTICE_RESET'); var col = H8.dev.play_internals().rulesField().colliders(null); var r1 = col.resolveMove({ x: 7, z: -3 }, 0, -6, 0); var r2 = col.resolveMove({ x: 6.5, z: -3 }, 0, -6, 0); var r3 = col.resolveMove({ x: 7, z: -3 }, 0, -6, 5.2); var r4 = col.resolveMove({ x: -6.5, z: 0 }, 0, 3.5, 0); return r1.blocked && r1.z > -7 + 0.6 + 0.39 - 1e-6 && r2.blocked && Math.abs(r2.x - 6.5) < 1e-6 && r2.z > -9 + 1e-6 && !r3.blocked && Math.abs(r3.z + 9) < 1e-6 && r4.blocked && r4.z < 1.6 - 0.39 + 1e-6; })());

ok('colliders: ramps are walkable slopes (ground rises to 1.5 m) and never block; line of sight is blocked by pillars / barriers / walls but not by ramps', (function () { var col = H8.dev.play_internals().rulesField().colliders(null); var mv = col.resolveMove({ x: 9, z: 0 }, 4, 0, 0); return !mv.blocked && Math.abs(col.groundHeight(13.5, 0) - 1.5) < 1e-6 && col.groundHeight(11.5, 0) > 0.7 && !col.lineOfSight({ x: 7, z: -3 }, { x: 7, z: -11 }).clear && col.lineOfSight({ x: 0, z: 4 }, { x: 0, z: -2 }).clear && col.lineOfSight({ x: 9, z: 0 }, { x: 14, z: 0 }).clear; })());

ok('lock-on: the host validates the id - unknown, ally, too far and no-line-of-sight targets are refused; a valid hostile lock is accepted; a duplicate lock keeps the original since-time', (function () { var bad = A8.send('LOCK_TARGET', { aim_id: 'NOPE' }); var ally = A8.send('LOCK_TARGET', { aim_id: 'PRACTICE_ALLY' }); var ok1 = A8.send('LOCK_TARGET', { aim_id: 'FIELD_DUMMY' }); var since = A8.rules().me.lock.since_t; run(H8, 1.0); var dup = A8.send('LOCK_TARGET', { aim_id: 'FIELD_DUMMY' }); return bad.reason === 'NO_SUCH_TARGET' && ally.reason === 'NOT_HOSTILE' && ok1.accepted && ok1.locked === 'FIELD_DUMMY' && dup.accepted && dup.duplicate === true && A8.rules().me.lock.since_t === since; })());

ok('lock-on: UNLOCK clears; a lock breaks after the grace when the target stays behind a pillar (line of sight) and the marker is reported not visible meanwhile', (function () { var u = A8.send('LOCK_TARGET', { aim_id: null }); var cleared = A8.rules().me.lock === null; var rf = H8.dev.play_internals().rulesField(); var d = rf.combatant('FIELD_DUMMY'); d.pos.x = 7; d.pos.z = -11; var me = rf.combatant('PLAYER_A'); me.actor.pos.x = 4; me.actor.pos.z = -11; var l1 = A8.send('LOCK_TARGET', { aim_id: 'FIELD_DUMMY' }); me.actor.pos.x = 7; me.actor.pos.z = -3; run(H8, 0.5); var hidden = A8.rules().me.lock && A8.rules().me.lock.visible === false; run(H8, 1.2); var broken = A8.rules().me.lock === null; var why = logs(H8, /^R1723_LOCK$/).slice(-1)[0].why; d.pos.x = 0; d.pos.z = -2; me.actor.pos.x = 0; me.actor.pos.z = 4; return u.accepted && cleared && l1.accepted && hidden && broken && why === 'BEHIND_COVER'; })());

ok('lock-on: the attack resolves its combat direction at the first frame (S07: lock target → the body re-aims up to 100° at once, the rest at the startup turn rate) so 90° and 180° off both land; lock cannot extend range; a projectile is aimed at the release position (fixed heading, not homing)', (function () { A8.send('PRACTICE_RESET'); faceDummy(H8, A8, 3.0); A8.send('MOVE', { forward: 0, strafe: 0, yaw: Math.PI / 2 }); A8.send('LOCK_TARGET', { aim_id: 'FIELD_DUMMY' }); A8.send('RULES_SELECT', { category: 'PHYSICAL', slot: 0 }); var f0 = A8.play().facing; var n0 = logs(H8, /^R1723_DAMAGE$/).length; var c = A8.send('RULES_CAST'); H8.tick(DT); var f1 = A8.play().facing; run(H8, 1.2); var turned = Math.abs(f1 - f0) > 0.2 && Math.abs(f1 - f0) < Math.PI; var hit = logs(H8, /^R1723_DAMAGE$/).length > n0 ? logs(H8, /^R1723_DAMAGE$/).slice(-1)[0] : null; var facedAfter = Math.abs(A8.play().facing) < 0.05;   /* 90° turned within the startup, then held */ run(H8, 1.5); A8.send('MOVE', { forward: 0, strafe: 0, yaw: Math.PI }); var nm0 = logs(H8, /^R1723_MISS$/).length; A8.send('RULES_CAST'); run(H8, 1.2); var awayFacing = A8.play().facing; var partial = Math.abs(Math.atan2(Math.sin(awayFacing), Math.cos(awayFacing))) < 0.05;   /* S07: 180° behind → fully re-aimed by the end of the startup */ var rateMiss = logs(H8, /^R1723_MISS$/).length === nm0 && logs(H8, /^R1723_DAMAGE$/).length > n0 + 1; run(H8, 1.5); faceDummy(H8, A8, 6.0); A8.send('LOCK_TARGET', { aim_id: 'FIELD_DUMMY' }); var far = castAndWait(H8, A8, {}, 1.2); var miss = logs(H8, /R1723_MISS/).slice(-1)[0]; A8.send('RULES_SELECT', { category: 'SPECIAL_MAGIC', slot: 0 }); var pr = A8.send('RULES_CAST'); run(H8, 0.85); var ent = A8.rules().entities.filter(function (e) { return e.type === 'PROJECTILE'; })[0]; return c.accepted && turned && facedAfter && hit && hit.on === 'FIELD_DUMMY' && partial && rateMiss && far.accepted && miss && pr.accepted && ent && ent.heading !== null && Math.abs(ent.heading) < 0.2; })(), { facedAfter: A8.play().facing });

ok('a projectile fired at a wall impacts the wall (no pass-through); a lock is cleared when the target is knocked out and never jumps to another target', (function () { run(H8, 3); var rf = H8.dev.play_internals().rulesField(); var me = rf.combatant('PLAYER_A'); me.actor.pos.x = 0; me.actor.pos.z = 12; A8.send('LOCK_TARGET', { aim_id: null }); A8.send('MOVE', { forward: 0, strafe: 0, yaw: Math.PI }); run(H8, 0.2); selSM(A8, 'ATHLETE_VECTOR'); castAndWait(H8, A8, {}, 1.5); var wall = logs(H8, /R1723_PROJECTILE_WALL/).length; A8.send('TEAM_MATCH', { op: 'START', size: 2 }); A8.send('TEAM_MATCH', { op: 'BEGIN', passive_synthetics: true }); run(H8, 0.2); var b1 = A8.rules().others.filter(function (o) { return o.team === 'B'; })[0]; var l = A8.send('LOCK_TARGET', { aim_id: b1.id }); rf.combatant(b1.id).hp = 0; rf.combatant(b1.id).ko = true; rf.combatant(b1.id).koAt = 0; run(H8, 0.1); var after = A8.rules().me.lock; var ab = A8.send('TEAM_MATCH', { op: 'ABORT' }); return wall === 1 && l.accepted && after === null && ab.accepted && A8.rules().match === null; })());

ok('3v3: every living opponent can be locked individually', (function () { A8.send('PRACTICE_RESET'); A8.send('TEAM_MATCH', { op: 'START', size: 3 }); A8.send('TEAM_MATCH', { op: 'BEGIN', passive_synthetics: true }); run(H8, 0.2); var opp = A8.rules().others.filter(function (o) { return o.team === 'B'; }); var results = opp.map(function (o) { var r = A8.send('LOCK_TARGET', { aim_id: o.id }); return { id: o.id, r: r.accepted ? 'ok' : r.reason, lock: A8.rules().me.lock && A8.rules().me.lock.target }; }); A8.send('TEAM_MATCH', { op: 'ABORT' }); return opp.length === 3 && results.every(function (x) { return x.r === 'ok' && x.lock === x.id; }); })(), { pos: A8.play().position, opp: A8.rules().others.map(function (o) { return o.id + ':' + o.team + '@' + o.position.x + ',' + o.position.z; }) });

var TMP2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mahworld-5b-test-pass3-')); var st9 = createSqliteStore(sqlite, { dir: TMP2 }); var op9 = st9.open({ identity: hostIdentity(data) }); var H9 = createDuelHost({ data: data, composeHeadless: composeHeadless, store: st9, opened: op9 }); H9.dev.createAccount('PLAYER_A', {}); var A9 = sess(H9, 'PLAYER_A'); A9.send('ENTER_ROOM', { room: 'FIELD' }); A9.send('FIELD_PRACTICE', { on: true }); A9.send('LOCK_TARGET', { aim_id: 'FIELD_DUMMY' }); A9.send('MOVE', { forward: 1, strafe: 0.3, yaw: 0.4 }); run(H9, 1.4); A9.send('MOVE', { forward: 0, strafe: 0 }); A9.send('DASH', { dir: 'FORWARD' }); run(H9, 0.6); var b9 = A9.play(); st9.simulateCrash();

var st10 = createSqliteStore(sqlite, { dir: TMP2 }); if (fs.existsSync(st9.lockPath)) fs.unlinkSync(st9.lockPath); var op10 = st10.open({ identity: hostIdentity(data) }); var H10 = createDuelHost({ data: data, composeHeadless: composeHeadless, store: st10, opened: op10 }); var rec10 = H10.recover(); var a9 = H10.snapshot(A9.sid).play;

ok('recovery reproduces lock, practice flag, facing and collider-resolved positions deterministically (no display geometry, no fresh clock)', rec10.ok && rec10.inconsistencies.length === 0 && a9 && a9.rules.me.lock && a9.rules.me.lock.target === 'FIELD_DUMMY' && a9.rules.practice === true && Math.abs(a9.position.x - b9.position.x) < 1e-6 && Math.abs(a9.position.z - b9.position.z) < 1e-6 && a9.facing === b9.facing && a9.rules.colliders.version === b9.rules.colliders.version, { rec: rec10.inconsistencies.slice(0, 2), b: b9.position, a: a9 && a9.position }); st10.closeClean();



console.log('\n' + pass + ' passed, ' + fail + ' failed'); console.log('disposable test dir: ' + TMP); process.exit(fail ? 1 : 0);

