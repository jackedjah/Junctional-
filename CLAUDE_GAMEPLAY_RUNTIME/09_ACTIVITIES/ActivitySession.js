/* MAHWORLD GAMEPLAY RUNTIME :: ACTIVITY ENGAGEMENT FRAMEWORK + CLIMBING HOOKS (headless; no activity physics)
   Generic joinable environmental engagement for CLIMBING · SWIMMING · RACING · GYM_WORKOUT · OUTDOOR_WORKOUT · BASKETBALL (future,
   OD-10) · MINIGAME (future). Presence-based joinability, capacity, scoring mode, start / finish, results, rewards hook.
   Climbing hooks: CLIMB_ENTER · HAND_CONTACT · LOWER_TIP_ATTACH · TIP_PROPULSION · CLIMB_ASCEND · CLIMB_LATERAL · CLIMB_RELEASE —
   recognisable human climbing (hands) + MAHBeing lower-tip propulsion; split form required; no IK, no physics. */
export var ACTIVITY_TYPES = { CLIMBING: { required_form: 'SPLIT', future: false }, SWIMMING: { required_form: 'ANY', future: false, open_decision: 'OD-09' }, RACING: { required_form: 'ANY', future: false }, GYM_WORKOUT: { required_form: 'SPLIT', future: false }, OUTDOOR_WORKOUT: { required_form: 'ANY', future: false }, BASKETBALL: { required_form: 'SPLIT', future: true, open_decision: 'OD-10' }, MINIGAME: { required_form: 'ANY', future: true } };
export var ACTIVITY_STATES = ['OPEN', 'RUNNING', 'SCORING', 'FINISHED', 'CLOSED'];
var ids = 0;

export function createActivitySession(cfg, bus, deps) {
  var type = deps.activity_type; if (!ACTIVITY_TYPES[type]) throw new Error('unknown activity type ' + type);
  var S = { id: deps.activity_id || (type + '_' + (++ids)), type: type, location: deps.location_id, participants: [], capacity: deps.capacity || cfg.dev('activity.default_capacity'), state: 'OPEN', scoring: deps.scoring_mode || 'TIME', scores: {}, results: null, t: 0, ts: {}, joins: 0 };
  function emit(n, p) { bus.emit(n, Object.assign({ activity: S.id, type: type }, p || {})); }
  return {
    id: S.id, type: type, meta: ACTIVITY_TYPES[type], state: function () { return S.state; },
    snapshot: function () { return { activity_id: S.id, type: type, location_id: S.location, participants: S.participants.slice(), capacity: S.capacity, state: S.state, scoring_mode: S.scoring, results: S.results, join_rule: 'PRESENCE', spectator_lock: false, required_form: ACTIVITY_TYPES[type].required_form, future: ACTIVITY_TYPES[type].future, timestamps: Object.assign({}, S.ts) }; },
    canJoin: function (player) { if (ACTIVITY_TYPES[type].future) return { ok: false, reason: 'FUTURE_ACTIVITY' }; if (S.state !== 'OPEN') return { ok: false, reason: 'NOT_OPEN' }; if (!player.present_at || player.present_at !== S.location) return { ok: false, reason: 'NOT_PRESENT' }; if (S.participants.indexOf(player.id) >= 0) return { ok: false, reason: 'ALREADY_JOINED' }; if (S.participants.length >= S.capacity) return { ok: false, reason: 'CAPACITY' }; var rf = ACTIVITY_TYPES[type].required_form; if (rf !== 'ANY' && player.form && player.form !== rf) return { ok: false, reason: 'REQUIRES_' + rf }; return { ok: true }; },
    join: function (player) { var c = this.canJoin(player); if (!c.ok) return c; S.participants.push(player.id); S.joins++; emit('ACTIVITY_JOINED', { player: player.id }); return { ok: true, participants: S.participants.length }; },
    leave: function (id) { var i = S.participants.indexOf(id); if (i < 0) return { ok: false, reason: 'NOT_A_PARTICIPANT' }; S.participants.splice(i, 1); delete S.scores[id]; emit('ACTIVITY_LEFT', { player: id }); return { ok: true }; },
    start: function () { if (S.state !== 'OPEN' || !S.participants.length) return { ok: false, reason: S.state !== 'OPEN' ? 'NOT_OPEN' : 'NO_PARTICIPANTS' }; S.state = 'RUNNING'; S.ts.start = S.t; emit('ACTIVITY_STARTED', { participants: S.participants.slice() }); return { ok: true }; },
    score: function (id, value) { if (S.state !== 'RUNNING' || S.participants.indexOf(id) < 0) return { ok: false }; S.scores[id] = value; return { ok: true }; },
    finish: function () { if (S.state !== 'RUNNING') return { ok: false, reason: 'NOT_RUNNING' }; S.state = 'SCORING'; var ranked = S.participants.slice().sort(function (a, b) { var sa = S.scores[a], sb = S.scores[b]; if (sa === undefined) return 1; if (sb === undefined) return -1; return S.scoring === 'TIME' ? sa - sb : sb - sa; }); S.results = { ranking: ranked, scores: Object.assign({}, S.scores), scoring_mode: S.scoring }; S.state = 'FINISHED'; S.ts.finish = S.t; emit('ACTIVITY_FINISHED', S.results); return { ok: true, results: S.results }; },
    rewards: function (hook) { if (S.state !== 'FINISHED') return { ok: false, reason: 'NOT_FINISHED' }; var out = S.results.ranking.map(function (id, i) { return hook ? hook({ player: id, rank: i + 1, activity: S.id, type: type }) : { player: id, rank: i + 1, reward: 'HOOK_NOT_PROVIDED' }; }); emit('ACTIVITY_REWARDS', { count: out.length }); return { ok: true, rewards: out }; },
    close: function () { S.state = 'CLOSED'; emit('ACTIVITY_CLOSED'); }, tick: function (dt) { S.t += dt; }, joins: function () { return S.joins; }
  };
}

export var CLIMB_EVENTS = ['CLIMB_ENTER', 'HAND_CONTACT', 'LOWER_TIP_ATTACH', 'TIP_PROPULSION', 'CLIMB_ASCEND', 'CLIMB_LATERAL', 'CLIMB_RELEASE'];
export function createClimbingHooks(bus, deps) {
  var loco = deps.locomotion; var S = { climbing: false, hands: { L: false, R: false }, tips: { L: false, R: false }, height: 0, lateral: 0, log: [] };
  function emit(n, p) { if (CLIMB_EVENTS.indexOf(n) < 0) throw new Error('not a climb event ' + n); S.log.push(n); bus.emit(n, Object.assign({ climb_height: S.height, lateral: S.lateral, hands: Object.assign({}, S.hands), tips: Object.assign({}, S.tips) }, p || {})); }
  return {
    events: CLIMB_EVENTS.slice(), state: function () { return { climbing: S.climbing, height: S.height, lateral: S.lateral, hands: Object.assign({}, S.hands), tips: Object.assign({}, S.tips) }; },
    enter: function (surface) { if (loco.form() !== 'SPLIT') return { ok: false, reason: 'REQUIRES_SPLIT' }; S.climbing = true; emit('CLIMB_ENTER', { surface: surface || null, principle: 'human hand climbing + MAHBeing lower-tip propulsion (no feet)' }); return { ok: true }; },
    handContact: function (side, point) { if (!S.climbing) return { ok: false, reason: 'NOT_CLIMBING' }; S.hands[side] = true; emit('HAND_CONTACT', { side: side, point: point || null }); return { ok: true }; },
    tipAttach: function (side, point) { if (!S.climbing) return { ok: false, reason: 'NOT_CLIMBING' }; S.tips[side] = true; emit('LOWER_TIP_ATTACH', { side: side, point: point || null, contact: 'MAHGIC_ATTACHMENT_NOT_FOOT' }); return { ok: true }; },
    tipPulse: function (side, power) { if (!S.climbing || !S.tips[side]) return { ok: false, reason: 'TIP_NOT_ATTACHED' }; emit('TIP_PROPULSION', { side: side, power: power === undefined ? null : power }); return { ok: true }; },
    ascend: function (dh) { if (!S.climbing) return { ok: false, reason: 'NOT_CLIMBING' }; if (!(S.hands.L || S.hands.R)) return { ok: false, reason: 'NO_HAND_CONTACT' }; if (!(S.tips.L || S.tips.R)) return { ok: false, reason: 'NO_TIP_ATTACH' }; S.height += dh; emit('CLIMB_ASCEND', { dh: dh }); return { ok: true, height: S.height }; },
    lateral: function (dx) { if (!S.climbing) return { ok: false, reason: 'NOT_CLIMBING' }; S.lateral += dx; emit('CLIMB_LATERAL', { dx: dx }); return { ok: true }; },
    release: function () { if (!S.climbing) return { ok: false, reason: 'NOT_CLIMBING' }; S.climbing = false; S.hands = { L: false, R: false }; S.tips = { L: false, R: false }; emit('CLIMB_RELEASE'); return { ok: true, height: S.height }; },
    log: function () { return S.log.slice(); }
  };
}
