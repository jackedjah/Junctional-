/* MAHWORLD JOB B :: AI-vs-AI SPAR SCHEDULER (owner directive 2026-09-19 §18 — occasional NPC-vs-NPC encounters the player can watch).
   Every interval_s (registry ai_encounters.spar) the scheduler rolls (a hash of the slot index — deterministic, replayable) and, on success,
   picks two fight-capable town NPCs that are free (not KO, not sparring with the player, not in an emote / pair / invite, cooldown elapsed) and
   walks them to the next spar location (≥ min_player_distance_m from every player), where they square up and alternate their OWN equipped
   PHYSICAL move through the rules field's one cast path (rf.cast). Both are team NPC in FREE context, so by the ruleset nothing is damaged —
   the encounter is the real cast motion (startup / recovery, whiffs) without a second combat system, loot or progression. It ends after
   duration_s (or when a participant is KO'd / pulled into a player spar); the NPCs return to their ordinary wander through PlayMode's npcTick,
   which leaves an NPC alone while `n.aiSpar` is set (the only hook). Nothing here touches the player, camera, HUD or match flows. */
function hash01(a, b, c) { var h = 2166136261; [a, b, c].forEach(function (v) { var s = String(v); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= 0x9e3779b9; h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; }); return (h >>> 8) / 16777216; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function turn(cur, want, k) { var diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur)); return cur + diff * Math.min(1, k); }
/* o = { registry, H (host clock), rec, npcs () → the town NPC list, rulesField () → FIELD rules field, colliders (), players () → [actor in FIELD] } */
export function createSparScheduler(o) {
  var reg = o.registry; var spec = reg && reg.ai_encounters && reg.ai_encounters.spar; var H = o.H; var rec = o.rec || function () { };
  if (!spec || spec.enabled === false) return { enabled: false, tick: function () { }, view: function () { return null; }, summary: function () { return { enabled: false }; } };
  var iv = spec.interval_s || [70, 140], du = spec.duration_s || [12, 20], prob = spec.probability === undefined ? 0.6 : spec.probability, cool = spec.cooldown_per_npc_s || 240, minP = spec.min_player_distance_m || 6; var spots = spec.locations || [];
  var st = { slot: 0, next_t: (H.t || 0) + iv[0] * 0.5, active: null, cooldownUntil: {}, count: 0, rolls: 0, skipped: 0 };
  function eligible(n) { var cb = n.combatant; if (!cb || cb.ko || n.spar || n.paired || n.emote || n.invitePending || (n.social && n.social.pending)) return false; if ((st.cooldownUntil[n.id] || -1) > H.t) return false; var f = o.rulesField(); var own = f && f.skillsFor ? f.skillsFor(cb) : null; return !!(own && own.PHYSICAL && own.PHYSICAL.filter(Boolean).length); }
  function firstPhysical(n) { var f = o.rulesField(); var own = f.skillsFor(n.combatant); return own.PHYSICAL.filter(Boolean)[0]; }
  function pickSpot(k) { if (!spots.length) return null; var players = o.players() || []; for (var i = 0; i < spots.length; i++) { var s = spots[(k + i) % spots.length]; var far = players.every(function (a) { return dist(a.pos, s) >= minP; }); if (far) return s; } return null; }
  function begin(k) { var npcs = (o.npcs() || []).filter(eligible); if (npcs.length < 2) { st.skipped++; return false; } var spot = pickSpot(k); if (!spot) { st.skipped++; return false; }
    npcs.sort(function (a, b) { return dist(a.pos, spot) - dist(b.pos, spot); }); var A = npcs[0], B = npcs[1]; var dur = du[0] + (du[1] - du[0]) * hash01('spar', k, 'd'); var ang = hash01('spar', k, 'a') * Math.PI * 2;
    st.active = { k: k, spot: spot, a: A.id, b: B.id, t0: H.t, until: H.t + dur, arrived: false, arrived_t: null, nextCast: H.t, turnA: true, casts: 0, fails: 0 };
    [[A, 1], [B, -1]].forEach(function (pr) { var n = pr[0]; n.aiSpar = { spot: { x: spot.x + Math.cos(ang) * 1.5 * pr[1], z: spot.z + Math.sin(ang) * 1.5 * pr[1] }, partner: n === A ? B.id : A.id, since: H.t }; st.cooldownUntil[n.id] = H.t + cool; });
    st.count++; rec('AI_SPAR_BEGIN', { a: A.id, b: B.id, spot: spot, duration_s: +dur.toFixed(1) }); return true; }
  function end(why) { var S = st.active; if (!S) return; (o.npcs() || []).forEach(function (n) { if (n.id === S.a || n.id === S.b) { n.aiSpar = null; n.mahloco = 'FUSED_IDLE'; } }); rec('AI_SPAR_END', { a: S.a, b: S.b, why: why, casts: S.casts }); st.active = null; st.next_t = H.t + iv[0] + (iv[1] - iv[0]) * hash01('spar', st.slot, 'i'); }
  function drive(n, dt, col) { var g = n.aiSpar.spot; var dx = g.x - n.pos.x, dz = g.z - n.pos.z; var d = Math.hypot(dx, dz); if (d > 0.35) { var sp = 2.2; var mv = col.resolveMove(n.pos, dx / d * Math.min(sp * dt, d), dz / d * Math.min(sp * dt, d), 0); n.pos.x = mv.x; n.pos.z = mv.z; n.facing = turn(n.facing, Math.atan2(dx, -dz), dt * 5); n.mahloco = 'FUSED_GLIDE'; return mv.blocked ? 'BLOCKED' : 'WALKING'; } n.mahloco = 'FUSED_IDLE'; return 'THERE'; }
  function tick(dt) { var f = o.rulesField(); if (!f) return; var npcs = o.npcs() || []; if (!npcs.length) return; var col = o.colliders();
    if (!st.active) { if (H.t >= st.next_t) { st.slot++; st.rolls++; var roll = hash01('spar', st.slot, 'p'); if (roll < prob) { if (!begin(st.slot)) st.next_t = H.t + 20; } else { st.next_t = H.t + iv[0] + (iv[1] - iv[0]) * hash01('spar', st.slot, 'i'); } } return; }
    var S = st.active; var A = npcs.filter(function (n) { return n.id === S.a; })[0], B = npcs.filter(function (n) { return n.id === S.b; })[0];
    if (!A || !B || !A.aiSpar || !B.aiSpar || A.spar || B.spar || (A.combatant && A.combatant.ko) || (B.combatant && B.combatant.ko)) { end(!A || !B ? 'NPC_GONE' : (A.spar || B.spar ? 'PLAYER_SPAR' : 'KO')); return; }
    if (H.t >= S.until) { end('DURATION'); return; }
    var ra = drive(A, dt, col), rb = drive(B, dt, col); if (ra === 'BLOCKED' && rb === 'BLOCKED') { end('BLOCKED'); return; }
    if (ra === 'THERE' && rb === 'THERE') { if (!S.arrived) { S.arrived = true; S.arrived_t = H.t; S.until = Math.max(S.until, H.t + (du[0] + (du[1] - du[0]) * hash01('spar', S.k, 'd')) * 0.8); }   /* the bout lasts from arrival, the walk is not the show */ A.facing = turn(A.facing, Math.atan2(B.pos.x - A.pos.x, -(B.pos.z - A.pos.z)), dt * 6); B.facing = turn(B.facing, Math.atan2(A.pos.x - B.pos.x, -(A.pos.z - B.pos.z)), dt * 6);
      if (H.t >= S.nextCast) { var n = S.turnA ? A : B; var other = S.turnA ? B : A; if (n.combatant && !n.combatant.cast && !(other.combatant && other.combatant.cast)) { var sk = firstPhysical(n); var r = f.cast(n.combatant, { skill_id: sk.id }); if (r.ok) { S.casts++; S.turnA = !S.turnA; S.nextCast = H.t + 1.3 + 0.9 * hash01('spar', S.k, S.casts); } else { S.fails = (S.fails || 0) + 1; if (S.fails <= 3) rec('AI_SPAR_CAST_FAIL', { npc: n.id, reason: r.reason, why: r.why || null }); S.nextCast = H.t + 0.5; if (S.fails > 20) { end('CAST_FAIL:' + r.reason); return; } } } } } }
  function view() { var S = st.active; return S ? { a: S.a, b: S.b, spot: S.spot, arrived: S.arrived, remaining_s: +(S.until - H.t).toFixed(1), casts: S.casts } : null; }
  function summary() { return { enabled: true, spars: st.count, rolls: st.rolls, skipped: st.skipped, next_in_s: st.active ? null : +(st.next_t - H.t).toFixed(1), active: view() }; }
  return { enabled: true, tick: tick, view: view, summary: summary, state: st };
}
