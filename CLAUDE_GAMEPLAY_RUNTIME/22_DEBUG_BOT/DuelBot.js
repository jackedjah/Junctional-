/* MAHWORLD GAMEPLAY RUNTIME :: DETERMINISTIC DUEL BOT (development opponent — NOT production AI)
   States: IDLE · MOVE · DEFEND · ATTACK · RANGED · DEFEATED. Decisions every bot.decision_interval_s from a seeded PRNG (mulberry32), so a
   given seed + inputs reproduce the same fight. Attacks reuse the runtime attack fixtures through createAttackExecution (contact basic +
   the upright-row ranged manifestation); defend halves incoming damage (bot.defend_reduction); movement speed = the split walk band.
   All numbers come from dev tuning (EXPERIMENTAL). Purpose: repeatable combat testing. */
export function mulberry32(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export var BOT_STATES = ['IDLE', 'MOVE', 'DEFEND', 'ATTACK', 'RANGED', 'DEFEATED'];

export function createDuelBot(world, deps) {
  var d = deps; var cfg = world.cfg; var T = cfg.dev('bot'); var rnd = mulberry32(d.seed === undefined ? 1 : d.seed); var id = d.id || 'SPARRING_BOT';
  var basic = d.basicAttack || world.attacks.get('ATHLETE_HORIZONTAL_PUSH_BASIC'); var ranged = d.rangedAttack || world.attacks.get('ATHLETE_BILATERAL_UPRIGHT_ROW_MANIFESTATION');
  var S = { state: 'IDLE', pos: Object.assign({ x: 0, y: 0, z: 0 }, d.position || {}), t: 0, next: 0, defendUntil: -1, rangedReadyAt: 0, exec: null, decisions: [], health: null, seed: d.seed === undefined ? 1 : d.seed };
  var speed = cfg.speedRangeMps('SPLIT').min;
  function emit(n, p) { world.bus.emit(n, Object.assign({ bot: id, state: S.state }, p || {})); }
  function go(s, why) { if (S.state !== s) { S.state = s; emit('BOT_STATE', { why: why }); } }
  function dist(p) { var dx = p.x - S.pos.x, dz = p.z - S.pos.z; return Math.sqrt(dx * dx + dz * dz); }
  function attack(def, target) { if (S.exec && !['COMPLETE', 'REFUSED', 'INTERRUPTED'].includes(S.exec.state().state)) return false; S.exec = d.createAttackExecution(cfg, world.bus, { attack: def, attacker: id, target: target, resource: d.resource || null, applyDamage: d.applyDamage }); var r = S.exec.start(); return r.ok; }
  return {
    id: id, seed: S.seed, states: BOT_STATES.slice(), position: function () { return Object.assign({}, S.pos); }, state: function () { return { state: S.state, position: Object.assign({}, S.pos), decisions: S.decisions.length, defending: S.t < S.defendUntil, ranged_ready: S.t >= S.rangedReadyAt, health: S.health }; },
    /* incoming damage passes through here so DEFEND can reduce it deterministically */
    incoming: function (amount, meta) { if (S.state === 'DEFEATED') return 0; var f = S.t < S.defendUntil ? (1 - T.defend_reduction) : 1; var a = amount * f; emit('BOT_INCOMING', { amount: amount, applied: a, defended: f < 1, meta: meta || null }); return a; },
    defeat: function () { go('DEFEATED', 'health depleted'); if (S.exec) S.exec.interrupt('defeated'); },
    tick: function (dt, player, duelState, health) {
      S.t += dt; S.health = health; if (S.exec) S.exec.tick(dt); if (S.state === 'DEFEATED') return S.state; if (duelState !== 'ACTIVE') { go('IDLE', 'no active duel'); return S.state; }
      if (health !== undefined && health <= 0) { this.defeat(); return S.state; }
      var dp = dist(player.position);
      if (S.state === 'MOVE' && dp > T.approach_stop_m) { var dx = (player.position.x - S.pos.x) / dp, dz = (player.position.z - S.pos.z) / dp; S.pos.x += dx * speed * dt; S.pos.z += dz * speed * dt; }
      if (S.t < S.next) return S.state; S.next = S.t + T.decision_interval_s; var roll = rnd();
      var busy = S.exec && !['COMPLETE', 'REFUSED', 'INTERRUPTED'].includes(S.exec.state().state); if (busy) { S.decisions.push('BUSY'); return S.state; }
      var choice;
      if (dp <= T.attack_range_m) choice = roll < 0.3 ? 'DEFEND' : 'ATTACK'; else if (dp <= T.ranged_range_m && S.t >= S.rangedReadyAt && roll < 0.35) choice = 'RANGED'; else choice = roll < 0.15 ? 'IDLE' : 'MOVE';
      S.decisions.push(choice);
      if (choice === 'DEFEND') { S.defendUntil = S.t + T.defend_duration_s; go('DEFEND', 'roll'); }
      else if (choice === 'ATTACK') { go('ATTACK', 'in range'); attack(basic, player.id); }
      else if (choice === 'RANGED') { go('RANGED', 'ranged roll'); S.rangedReadyAt = S.t + T.ranged_cooldown_s; attack(ranged, player.id); }
      else go(choice, 'roll');
      return S.state;
    },
    decisions: function () { return S.decisions.slice(); }
  };
}
