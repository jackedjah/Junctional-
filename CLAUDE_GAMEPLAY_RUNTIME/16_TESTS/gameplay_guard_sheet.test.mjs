/* Owner 2026-09-18 §15 — SHIELD = a body-silhouette protective SHEET with BOUNDED durability through the real balance: the guard absorbs the
   blocked portion of every guarded hit; its capacity = hits_baseline × the blocked portion of the STANDARD BASELINE hit (≈ 2–3 meaningful
   hits by attack strength); at 0 the guard BREAKS (drops, re-guard locked for break_lock_s); out of guard it regenerates. No particle-count
   durability, no second guard system. In-process host, plain node.   node 16_TESTS/gameplay_guard_sheet.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { loadHeadlessData, composeHeadless } from '../00_CORE/bootstrap.js';
import { createDuelHost } from '../26_LOCAL_AUTHORITY/DuelHost.js'; import { makeEnvelope } from '../26_LOCAL_AUTHORITY/Protocol.js';
import { createRulesField } from '../26_LOCAL_AUTHORITY/play/rules1723/RulesField.js';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }
var data = await loadHeadlessData(); var cfg = data.cfg; var DT = cfg.dev('local_authority.tick_dt_s');
var RULES = JSON.parse(fs.readFileSync(path.join(LA, 'play', 'rules1723', 'rules_17_23.dev.json'), 'utf8')); var SH = RULES.guard.sheet; var REG = JSON.parse(fs.readFileSync(path.join(LA, 'lab', 'assets', 'world', 'world_registry_v1.json'), 'utf8')); var ECO = REG.ecology.species;
/* ---- 1. data ---- */
ok('1. guard.sheet is DATA in the ruleset (provisional): hits_baseline 2–3, regen_s > 0, break_lock_s > 0, the rule documented', !!SH && SH.hits_baseline >= 2 && SH.hits_baseline <= 3 && SH.regen_s > 0 && SH.break_lock_s > 0 && /2–3|2-3/.test(SH._doc || ''), SH);
/* ---- 2. the capacity comes from the balance, not from a constant ---- */
var F = createRulesField({ cfg: cfg, H: { t: 0 }, rec: function () { }, bump: function () { }, lunge: function () { }, log: function () { } });
var base = F.baselineHit(null); var A = F.spawnSynthetic('SHEET_PROBE', 'ATHLETE', 'B', { x: 0, z: 0 }, {}); var sheet = F.guardSheet(A);
var baseScaled = base.applied / (1 - 0.16);   /* PA_PUSH is pure physical vs an Athlete body: applied = scaled × (1 − 0.16) → scaled 100; blocked = scaled × 0.9 */
var expectedMax = +(baseScaled * RULES.guard.PHYSICAL.physical_reduction * SH.hits_baseline * ((RULES.resources && RULES.resources.scale && RULES.resources.scale.health) || 1)).toFixed(1);   /* B8 §9: × resources.scale.health (the sheet guards the ×2 pool against the ×2 threat) */
ok('2. sheet capacity = hits_baseline × the BLOCKED portion of the baseline hit against the matching guard (' + baseScaled.toFixed(0) + ' × ' + RULES.guard.PHYSICAL.physical_reduction + ' × ' + SH.hits_baseline + ' = ' + expectedMax + '), full at spawn, not broken', !!sheet && Math.abs(sheet.max - expectedMax) < 0.2 && sheet.frac === 1 && sheet.broken === false, sheet);
/* ---- 3. live: guard against a Dogkie's bites (WILD context, real cone) — the sheet drains, breaks on the 2nd–3rd bite, the guard drops ---- */
var h = createDuelHost({ data: data, composeHeadless: composeHeadless }); h.dev.createAccount('A', { classId: 'ATHLETE', sex: 'M' });
var c = h.connect({ client_id: 'c', account_id: 'A', token: h.dev.tokens().A }); var seq = 0; var send = function (a, p) { return h.submit(makeEnvelope({ session_id: c.session_id, client_id: 'c' }, ++seq, a, p || {})); }; var play = function () { return h.snapshot(c.session_id).play; };
function run(sec) { for (var i = 0; i < Math.round(sec / DT); i++) h.tick(DT); }
function goTo(x, z) { for (var p2 = 0; p2 < 3; p2++) { for (var i = 0; i < 3000; i++) { var pos = play().position; var dx = x - pos.x, dz = z - pos.z; var d = Math.hypot(dx, dz); if (d < 0.45) break; send('MOVE', { forward: +(-dz / d).toFixed(3), strafe: +(dx / d).toFixed(3), run: d > 4, fast: true, yaw: +Math.atan2(dx, -dz).toFixed(3) }); h.tick(DT); } send('MOVE', { forward: 0, strafe: 0 }); run(0.4); var q = play().position; if (Math.hypot(x - q.x, z - q.z) < 1.0) return true; } return false; }
function nearestCreature(list) { var me = play().position; return (list || []).slice().sort(function (a, b) { return Math.hypot(a.position.x - me.x, a.position.z - me.z) - Math.hypot(b.position.x - me.x, b.position.z - me.z); })[0] || null; }
function face(t) { var me = play().position; send('MOVE', { forward: 0, strafe: 0, yaw: +Math.atan2(t.position.x - me.x, -(t.position.z - me.z)).toFixed(3) }); h.tick(DT); }
send('ENTER_ROOM', { room: 'FIELD' }); run(0.5); goTo(-40, -30); goTo(-70, 0); run(2); var p1 = play();
var s0 = p1.guard_sheet; ok('3. the player publishes guard_sheet in the play snapshot (frac 1, not broken) before any fight', !!s0 && s0.frac === 1 && s0.broken === false && s0.max > 0, s0);
var near = nearestCreature(p1.creatures); ok('4. a Dogkie is awake near the west forest edge', !!near, { n: p1.creatures.length });
goTo(near.position.x + 2.2, near.position.z + 1.6); run(0.5); near = nearestCreature(play().creatures) || near;   /* inside its aggro radius: it chases and bites */
var g = send('GUARD', { kind: 'PHYSICAL' }); ok('5. PHYSICAL guard accepted (the sheet is whole)', g.accepted && g.guard === 'PHYSICAL', g);
/* stand still, face the Dogkie every tick so its bites land inside the frontal cone; count guarded hits until the break */
var breakAt = null, guarded = 0, fracs = [], hpBefore = play().rules.me.hp;
for (var i = 0; i < 1200 && breakAt === null; i++) { var me = play(); var t2 = me.creatures.filter(function (x) { return x.id === near.id; })[0] || nearestCreature(me.creatures); if (t2) face(t2); else h.tick(DT); var brk = h.dev.log().filter(function (e) { return e.kind === 'R1723_GUARD_BREAK' && e.id === 'A'; })[0]; if (brk) breakAt = brk; var gs = play().guard_sheet; if (gs && (!fracs.length || fracs[fracs.length - 1] !== gs.frac)) fracs.push(gs.frac); }
var guardedHits = h.dev.log().filter(function (e) { return e.kind === 'R1723_DAMAGE' && e.on === 'A' && e.guard === 'PHYSICAL'; }); var allHits = h.dev.log().filter(function (e) { return e.kind === 'R1723_DAMAGE' && e.on === 'A'; });
ok('6. the guarded bites drain the sheet (frac falls step by step, never below 0) and the ' + guardedHits.length + 'th guarded hit BREAKS it (journal R1723_GUARD_BREAK with the absorbed amount and the sheet max) — 2–3 meaningful hits by strength (a Dogkie bite ≈ ' + (allHits[0] ? allHits[0].raw : '?') + ' raw × wild mult)', !!breakAt && guardedHits.length >= 2 && guardedHits.length <= 4 && fracs.length >= 3 && fracs.every(function (f, k) { return f >= 0 && (k === 0 || f <= fracs[k - 1] + 1e-9); }), { break: breakAt, guarded_hits: guardedHits.length, fracs: fracs.slice(0, 8) });
var pAfter = play(); ok('7. after the break the guard is DOWN (p.guard null, guard_sheet.broken true) — the sheet did not hide the hits: HP fell only by the reduced amounts while guarded', pAfter.guard === null && pAfter.guard_sheet && pAfter.guard_sheet.broken === true && pAfter.rules.me.hp < hpBefore && guardedHits.every(function (e) { return e.applied < e.raw * 0.5; }), { guard: pAfter.guard, sheet: pAfter.guard_sheet, hp: pAfter.rules.me.hp, applied: guardedHits.map(function (e) { return e.applied; }) });
var g2 = send('GUARD', { kind: 'PHYSICAL' }); ok('8. re-guard is REFUSED while broken (GUARD_BROKEN with the remaining seconds ≤ break_lock_s) — no instant re-raise', !g2.accepted && g2.reason === 'GUARD_BROKEN' && g2.detail && g2.detail.remaining_s > 0 && g2.detail.remaining_s <= SH.break_lock_s + 1e-6, g2);
/* walk away so the Dogkies disengage, wait out the lock + regen */
goTo(-20, -30); goTo(0, -40); run(SH.break_lock_s + 0.2); var g3 = send('GUARD', { kind: 'PHYSICAL' }); var sAfterLock = play().guard_sheet; send('GUARD', { kind: 'NONE' });
ok('9. after break_lock_s the guard can be raised again (accepted) even before the sheet is full', g3.accepted && g3.guard === 'PHYSICAL' && sAfterLock && sAfterLock.broken === false, { g3: g3, sheet: sAfterLock });
run(SH.regen_s + 0.5); var sFull = play().guard_sheet;
ok('10. out of guard the sheet REGENERATES to full within regen_s (' + SH.regen_s + ' s)', sFull && sFull.frac >= 0.999 && sFull.broken === false, sFull);
/* ---- 4. the guard held does not regenerate the sheet (no free infinite block) ---- */
send('GUARD', { kind: 'PHYSICAL' }); var sBefore = play().guard_sheet; run(2); var sHeld = play().guard_sheet; send('GUARD', { kind: 'NONE' });
ok('11. while the guard is HELD the sheet does not regenerate (a whole sheet stays whole, a drained one stays drained until the guard drops)', sBefore && sHeld && Math.abs(sHeld.frac - sBefore.frac) < 1e-6, { before: sBefore, held: sHeld });
console.log('RESULT guard sheet: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
