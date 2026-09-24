/* MAHWORLD GAMEPLAY RUNTIME :: SPECTATOR SYSTEM + CALL-NEXT QUEUE
   Spectators join a duel's list up to the canon cap (cfg.spectatorMax(), CANON_TUNABLE), lose normal movement authority while
   spectating, receive fight-camera metadata (no graphics), may leave, may request CALL NEXT.
   Call Next: uncontroversial mechanics implemented (FCFS, join / leave, no duplicates, next challenger, winner offer). What happens
   after the winner DECLINES is OPEN_DECISION OD-02: three EXPERIMENTAL_POLICY strategies are provided through the policy registry
   and none is canonical.
     A: declined challenger loses position; next queued player is offered
     B: winner may choose another queued challenger (the declined one keeps position)
     C: winner exits the defending state; the two front queued players match each other

       var spec = createSpectatorSystem(cfg, bus, { duel, policies }); spec.join('P7'); spec.callNext('P7'); spec.offerNext(); spec.decline() */
export var CALL_NEXT_POLICIES = {
  A: { id: 'A', classification: 'EXPERIMENTAL_POLICY', open_decision: 'OD-02', describe: 'declined challenger loses position; next queued player offered', onDecline: function (q, winner, declined) { q.remove(declined); return { next_offer: q.peek(), defender: winner, matched: null }; } },
  B: { id: 'B', classification: 'EXPERIMENTAL_POLICY', open_decision: 'OD-02', describe: 'winner may choose another queued challenger; declined keeps position', onDecline: function (q, winner, declined, choice) { var pick = choice && q.contains(choice) ? choice : q.entries().filter(function (e) { return e !== declined; })[0] || null; return { next_offer: pick, defender: winner, matched: null, choice_required: !choice }; } },
  C: { id: 'C', classification: 'EXPERIMENTAL_POLICY', open_decision: 'OD-02', describe: 'winner exits defending state; two queued players match', onDecline: function (q, winner, declined) { var pair = q.entries().slice(0, 2); if (pair.length === 2) { q.remove(pair[0]); q.remove(pair[1]); } return { next_offer: null, defender: null, matched: pair.length === 2 ? pair : null, winner_released: true }; } }
};

export function createCallNextQueue(bus) {
  var entries = []; var requestedAt = {}; var seq = 0; var requests = 0;
  var q = {
    policy: 'FIRST_COME_FIRST_SERVED',
    join: function (id) { requests++; if (entries.indexOf(id) >= 0) return { ok: false, reason: 'ALREADY_QUEUED', position: entries.indexOf(id) }; entries.push(id); requestedAt[id] = ++seq; bus.emit('CALL_NEXT_REQUESTED', { player: id, position: entries.length - 1 }); return { ok: true, position: entries.length - 1 }; },
    leave: function (id) { var i = entries.indexOf(id); if (i < 0) return { ok: false, reason: 'NOT_QUEUED' }; entries.splice(i, 1); delete requestedAt[id]; bus.emit('CALL_NEXT_LEFT', { player: id }); return { ok: true }; },
    remove: function (id) { return q.leave(id); }, contains: function (id) { return entries.indexOf(id) >= 0; }, peek: function () { return entries[0] || null; }, entries: function () { return entries.slice(); }, size: function () { return entries.length; }, requests: function () { return requests; }
  }; return q;
}

export function createSpectatorSystem(cfg, bus, deps) {
  var duel = deps.duel, policies = deps.policies; var max = cfg.spectatorMax(); var list = []; var queue = createCallNextQueue(bus); var offer = null; var stats = { joins: 0, leaves: 0 };
  Object.keys(CALL_NEXT_POLICIES).forEach(function (k) { policies.register('CALL_NEXT_POLICY', k, CALL_NEXT_POLICIES[k], 'OD-02'); });
  function meta(id) { return { player: id, movement_authority: 'NONE_WHILE_SPECTATING', camera: { mode: 'FOLLOW_BOTH', targets: [duel.snapshot().fighters.a, duel.snapshot().fighters.b], classification: 'METADATA_ONLY' } }; }
  return {
    max: max, queue: queue,
    join: function (id) { if (duel.isFighter(id)) return { ok: false, reason: 'IS_FIGHTER' }; if (list.indexOf(id) >= 0) return { ok: false, reason: 'ALREADY_SPECTATING' }; if (list.length >= max) { bus.emit('SPECTATOR_REFUSED', { player: id, reason: 'CAP', max: max }); return { ok: false, reason: 'SPECTATOR_CAP', max: max }; } list.push(id); stats.joins++; var m = meta(id); bus.emit('SPECTATOR_JOINED', m); return Object.assign({ ok: true }, m); },
    leave: function (id) { var i = list.indexOf(id); if (i < 0) return { ok: false, reason: 'NOT_SPECTATING' }; list.splice(i, 1); queue.leave(id); stats.leaves++; bus.emit('SPECTATOR_LEFT', { player: id, movement_authority: 'RESTORED' }); return { ok: true, movement_authority: 'RESTORED' }; },
    spectators: function () { return list.slice(); }, count: function () { return list.length; }, hasMovementAuthority: function (id) { return list.indexOf(id) < 0; },
    callNext: function (id) { if (list.indexOf(id) < 0) return { ok: false, reason: 'MUST_BE_SPECTATING' }; return queue.join(id); },
    nextChallenger: function () { return queue.peek(); },
    offerNext: function () { var snap = duel.snapshot(); if (snap.state !== 'POST_FIGHT' && snap.state !== 'RESULT') return { ok: false, reason: 'DUEL_NOT_RESOLVED' }; var n = queue.peek(); if (!n) return { ok: false, reason: 'QUEUE_EMPTY' }; offer = { winner: snap.winner, challenger: n }; bus.emit('CALL_NEXT_OFFER', offer); return Object.assign({ ok: true }, offer); },
    accept: function () { if (!offer) return { ok: false, reason: 'NO_OFFER' }; var o = offer; offer = null; queue.remove(o.challenger); list.splice(list.indexOf(o.challenger), 1); bus.emit('CALL_NEXT_ACCEPTED', o); return { ok: true, next_fighters: { a: o.winner, b: o.challenger }, movement_authority_restored: o.challenger }; },
    decline: function (choice) { if (!offer) return { ok: false, reason: 'NO_OFFER' }; var o = offer; offer = null; var pol = policies.get('CALL_NEXT_POLICY'); var r = pol.strategy.onDecline(queue, o.winner, o.challenger, choice); var out = Object.assign({ ok: true, policy: pol.id, classification: pol.classification, open_decision: pol.open_decision, declined: o.challenger }, r); bus.emit('CALL_NEXT_DECLINED', out); return out; },
    stats: function () { return Object.assign({ call_next_requests: queue.requests() }, stats); }
  };
}
