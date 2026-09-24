/* MAHWORLD GAMEPLAY RUNTIME :: DUEL SESSION (headless civilised 1v1)
   States: AVAILABLE → CHALLENGE_PENDING → ACCEPTED → LOCKING → ACTIVE → ROUND_ENDING → RESULT → POST_FIGHT → CLOSED (+ CANCELLED).
   Participants fighter_a / fighter_b with health; combat boundary (dev tuning radius) and the canon combat flight ceiling
   (cfg.combatFlightCapM(), the SAME cap for both forms). No camera graphics; camera metadata only.

       var duel = createDuelSession(cfg, bus, { fighter_a: 'P1', fighter_b: 'BOT' }); duel.challenge(); duel.accept(); duel.lock(); duel.tick(dt); duel.applyDamage('BOT', 24) */
export var DUEL_STATES = ['AVAILABLE', 'CHALLENGE_PENDING', 'ACCEPTED', 'LOCKING', 'ACTIVE', 'ROUND_ENDING', 'RESULT', 'POST_FIGHT', 'CLOSED', 'CANCELLED'];
var NEXT = { AVAILABLE: ['CHALLENGE_PENDING'], CHALLENGE_PENDING: ['ACCEPTED', 'CANCELLED'], ACCEPTED: ['LOCKING', 'CANCELLED'], LOCKING: ['ACTIVE', 'CANCELLED'], ACTIVE: ['ROUND_ENDING', 'CANCELLED'], ROUND_ENDING: ['RESULT'], RESULT: ['POST_FIGHT'], POST_FIGHT: ['CLOSED'], CLOSED: [], CANCELLED: [] };
var ids = 0;

export function createDuelSession(cfg, bus, deps) {
  var hp = cfg.dev('health.max'); var S = { id: 'DUEL_' + (++ids), state: 'AVAILABLE', fighters: { a: deps.fighter_a, b: deps.fighter_b }, health: {}, t: 0, ts: {}, winner: null, loser: null, result: null, boundary_m: cfg.dev('duel.boundary_radius_m'), flight_cap_m: cfg.combatFlightCapM(), graceLeft: 0, spectators: deps.spectators || null };
  S.health[deps.fighter_a] = hp; S.health[deps.fighter_b] = hp;
  function go(next, why) { if (NEXT[S.state].indexOf(next) < 0) return { ok: false, reason: 'ILLEGAL_TRANSITION', from: S.state, to: next }; var from = S.state; S.state = next; S.ts[next] = S.t; bus.emit('DUEL_STATE', { session: S.id, from: from, to: next, why: why || null }); return { ok: true, state: next }; }
  return {
    id: S.id, state: function () { return S.state; },
    snapshot: function () { return { id: S.id, state: S.state, fighters: Object.assign({}, S.fighters), health: Object.assign({}, S.health), winner: S.winner, loser: S.loser, result: S.result, timestamps: Object.assign({}, S.ts), combat_boundary_m: S.boundary_m, combat_flight_ceiling_m: S.flight_cap_m, camera: { mode: 'FOLLOW_BOTH', targets: [S.fighters.a, S.fighters.b], classification: 'METADATA_ONLY' }, duration_s: S.ts.ACTIVE !== undefined ? (S.ts.ROUND_ENDING !== undefined ? S.ts.ROUND_ENDING : S.t) - S.ts.ACTIVE : 0 }; },
    challenge: function () { return go('CHALLENGE_PENDING', 'challenge issued'); }, accept: function () { return go('ACCEPTED', 'challenge accepted'); }, decline: function () { return go('CANCELLED', 'challenge declined'); },
    lock: function () { var r = go('LOCKING', 'engagement lock'); if (!r.ok) return r; bus.emit('DUEL_LOCKED', { session: S.id, combat_flight_ceiling_m: S.flight_cap_m, boundary_m: S.boundary_m, fighters: [S.fighters.a, S.fighters.b] }); return go('ACTIVE', 'fight begins'); },
    cancel: function (why) { return go('CANCELLED', why); },
    isFighter: function (id) { return id === S.fighters.a || id === S.fighters.b; },
    inCombat: function () { return S.state === 'ACTIVE' || S.state === 'LOCKING' || S.state === 'ROUND_ENDING'; },
    flightCeilingM: function () { return S.flight_cap_m; }, boundaryM: function () { return S.boundary_m; },
    validatePosition: function (id, pos) { var r = Math.sqrt(pos.x * pos.x + pos.z * pos.z); return { ok: r <= S.boundary_m && (pos.y || 0) <= S.flight_cap_m, out_of_bounds: r > S.boundary_m, above_cap: (pos.y || 0) > S.flight_cap_m }; },
    applyDamage: function (id, amount, meta) {
      if (S.state !== 'ACTIVE') return { applied: 0, reason: 'NOT_ACTIVE' }; if (!this.isFighter(id)) return { applied: 0, reason: 'NOT_A_FIGHTER' };
      var before = S.health[id]; S.health[id] = Math.max(0, before - amount); bus.emit('DUEL_DAMAGE', { session: S.id, target: id, amount: amount, health: S.health[id], meta: meta || null });
      if (S.health[id] === 0) { S.loser = id; S.winner = id === S.fighters.a ? S.fighters.b : S.fighters.a; S.result = 'KO'; S.graceLeft = cfg.dev('duel.round_end_grace_s'); go('ROUND_ENDING', 'health depleted'); }
      return { applied: before - S.health[id], health: S.health[id] };
    },
    concede: function (id) { if (S.state !== 'ACTIVE') return { ok: false }; S.loser = id; S.winner = id === S.fighters.a ? S.fighters.b : S.fighters.a; S.result = 'CONCEDE'; S.graceLeft = cfg.dev('duel.round_end_grace_s'); return go('ROUND_ENDING', 'concede'); },
    tick: function (dt) { S.t += dt; if (S.state === 'ROUND_ENDING') { S.graceLeft -= dt; if (S.graceLeft <= 0) { go('RESULT', 'grace over'); bus.emit('DUEL_RESULT', { session: S.id, winner: S.winner, loser: S.loser, result: S.result, duration_s: this.snapshot().duration_s }); go('POST_FIGHT', 'result shown'); } } return S.state; },
    close: function () { return go('CLOSED', 'session closed'); }
  };
}
