/* MAHWORLD GAMEPLAY RUNTIME :: LOCAL AUTHORITY PROTOCOL (Phase 5A, development lab)
   Clients submit INTENT in a command envelope; the host owns every outcome. Envelope:
     { protocol, session_id, client_id, command_id, seq, action, payload }
   Allowed player actions are a closed list; anything that would set damage / xp / health / position / identity / winner is not an
   action and any such field inside a payload is rejected (FORBIDDEN_FIELD). Developer fixture operations are NOT envelopes (host.dev.*). */
export var PROTOCOL_VERSION = 'MAHWORLD_LAB_1';
export var PLAYER_ACTIONS = ['JOIN_DUEL', 'SPECTATE', 'MOVE', 'TRANSFORM', 'SELECT_PATTERN', 'ATTACK', 'CONCEDE', 'LEAVE', 'CALL_NEXT', 'ACCEPT_NEXT', 'DECLINE_NEXT', 'PING',
  /* playable local sample (2026-09-14): room-play intents — still intents only; the host owns every outcome */
  'ENTER_ROOM', 'ACCEPT_QUEST', 'NPC_TALK', 'TRANSIT', 'FLIGHT', 'GUARD', 'DASH', 'EMOTE', 'SET_LOADOUT', 'PRACTICE_DUEL', 'LEAVE_ARENA',
  /* stage-1 mechanics field (2026-09-14): synthetic practice fixtures — still intents */
  'FIELD_INCOMING', 'PRACTICE_RESET',
  /* rules 17–23 (owner packet 2026-09-14): category / skill selection, casts, class fixture, niche fixture, team matches, practice ally */
  'RULES_SELECT', 'RULES_CAST', 'RULES_CLASS', 'RULES_NICHE', 'TEAM_MATCH', 'FIELD_ALLY',
  /* complete playable demo pass (2026-09-15): 4/2/2 attack loadout — equip / unequip one slot; host validates capacity, class, band unlock, ids */
  'RULES_LOADOUT',
  /* playability pass (2026-09-14): manual target lock (id only; host validates) and the explicit practice-battle toggle */
  'LOCK_TARGET', 'FIELD_PRACTICE',
  /* destination navigation (owner 2026-09-18 section 4): ONE nearby destination per deliberate tap / click / map point; the host validates range, route and takeover */
  'NAV',
  /* owner B8 §10–§15 (2026-09-20): guide equipment manifestation + the MAHGIC economy — intents only; the host (EquipmentManager) owns costs, positions, pickup, reclaim and refills */
  'EQUIP_MANIFEST', 'EQUIP_PICKUP', 'EQUIP_DISMISS', 'USE_REFILL',
  /* living character pass (2026-09-15): social emotes — directed (`to`), stop, partner invitation / join; still intents, the host owns every outcome */
  'EMOTE_STOP', 'EMOTE_INVITE', 'EMOTE_JOIN'];
export var FLIGHT_OPS = ['ENTER', 'EXIT', 'ASCEND', 'DESCEND', 'HOVER']; export var GUARD_KINDS = ['PHYSICAL', 'MAGICAL', 'NONE']; export var DASH_DIRS = ['FORWARD', 'BACK', 'LEFT', 'RIGHT'];
export var FORBIDDEN_FIELDS = ['damage', 'xp', 'health', 'position', 'x', 'y', 'z', 'winner', 'loser', 'actor', 'actor_id', 'target', 'target_id', 'level', 'stats', 'receipt', 'receipt_id', 'resource', 'mahgic', 'role', 'session_state', 'version'];
export var ATTACK_HINTS = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'TAP', 'HOLD'];

function finiteDeep(v, depth) { if (depth > 4) return false; if (typeof v === 'number') return Number.isFinite(v); if (Array.isArray(v)) return v.length <= 16 && v.every(function (x) { return finiteDeep(x, depth + 1); }); if (v && typeof v === 'object') return Object.keys(v).every(function (k) { return finiteDeep(v[k], depth + 1); }); return v === null || typeof v === 'string' || typeof v === 'boolean' || v === undefined; }

export function validateEnvelope(env, limits) {
  var L = limits || {}; var maxBytes = L.max_envelope_bytes || 4096, maxKeys = L.max_payload_keys || 12;
  if (!env || typeof env !== 'object') return { ok: false, reason: 'NOT_AN_ENVELOPE' };
  if (env.protocol !== PROTOCOL_VERSION) return { ok: false, reason: 'INCOMPATIBLE_PROTOCOL', detail: String(env.protocol) + ' != ' + PROTOCOL_VERSION };
  var need = ['session_id', 'client_id', 'command_id', 'action']; for (var i = 0; i < need.length; i++) if (typeof env[need[i]] !== 'string' || !env[need[i]] || env[need[i]].length > 128) return { ok: false, reason: 'MISSING_OR_BAD_FIELD', detail: need[i] };
  if (typeof env.seq !== 'number' || !Number.isInteger(env.seq) || env.seq < 0) return { ok: false, reason: 'BAD_SEQ' };
  var bytes; try { bytes = JSON.stringify(env).length; } catch (e) { return { ok: false, reason: 'UNSERIALISABLE' }; } if (bytes > maxBytes) return { ok: false, reason: 'OVERSIZED', detail: bytes + ' > ' + maxBytes };
  if (PLAYER_ACTIONS.indexOf(env.action) < 0) return { ok: false, reason: 'UNKNOWN_ACTION', detail: env.action };
  var p = env.payload === undefined ? {} : env.payload; if (p === null || typeof p !== 'object' || Array.isArray(p)) return { ok: false, reason: 'BAD_PAYLOAD' };
  var keys = Object.keys(p); if (keys.length > maxKeys) return { ok: false, reason: 'OVERSIZED', detail: 'payload keys ' + keys.length };
  for (var k = 0; k < keys.length; k++) if (FORBIDDEN_FIELDS.indexOf(keys[k]) >= 0) return { ok: false, reason: 'FORBIDDEN_FIELD', detail: keys[k] };
  if (!finiteDeep(p, 0)) return { ok: false, reason: 'NON_FINITE_OR_TOO_DEEP' };
  if (env.action === 'MOVE') { var f = p.forward === undefined ? 0 : p.forward, s = p.strafe === undefined ? 0 : p.strafe; if (typeof f !== 'number' || typeof s !== 'number' || Math.abs(f) > 1 || Math.abs(s) > 1) return { ok: false, reason: 'BAD_MOVE_VECTOR' }; }
  if (env.action === 'ATTACK' && ATTACK_HINTS.indexOf(p.hint) < 0) return { ok: false, reason: 'BAD_ATTACK_HINT', detail: String(p.hint) };
  if (env.action === 'TRANSFORM' && p.to !== undefined && p.to !== 'SPLIT' && p.to !== 'FUSED') return { ok: false, reason: 'BAD_TRANSFORM_TARGET' };
  if (env.action === 'SELECT_PATTERN' && (typeof p.pattern_id !== 'string' || p.pattern_id.length > 64)) return { ok: false, reason: 'BAD_PATTERN_ID' };
  if (env.action === 'DECLINE_NEXT' && p.choice !== undefined && typeof p.choice !== 'string') return { ok: false, reason: 'BAD_CHOICE' };
  if (env.action === 'NAV' && p.dest_y !== undefined && (typeof p.dest_y !== 'number' || !isFinite(p.dest_y) || Math.abs(p.dest_y) > 1e4)) return { ok: false, reason: 'BAD_DESTINATION' };
  if (env.action === 'NAV' && !p.cancel && (typeof p.dest_x !== 'number' || typeof p.dest_z !== 'number' || !isFinite(p.dest_x) || !isFinite(p.dest_z) || Math.abs(p.dest_x) > 1e4 || Math.abs(p.dest_z) > 1e4)) return { ok: false, reason: 'BAD_DESTINATION' };   /* a destination is an INTENT (dest_x / dest_z): the host validates range, support and route and owns the position throughout — the forbidden position / x / z fields stay forbidden */
  if (env.action === 'MOVE' && p.yaw !== undefined && (typeof p.yaw !== 'number' || Math.abs(p.yaw) > 32)) return { ok: false, reason: 'BAD_YAW' };
  if (env.action === 'ENTER_ROOM' && (typeof p.room !== 'string' || !/^[A-Z_]{1,32}$/.test(p.room))) return { ok: false, reason: 'BAD_ROOM' };
  if (env.action === 'FLIGHT' && FLIGHT_OPS.indexOf(p.op) < 0) return { ok: false, reason: 'BAD_FLIGHT_OP', detail: String(p.op) };
  if (env.action === 'GUARD' && GUARD_KINDS.indexOf(p.kind) < 0) return { ok: false, reason: 'BAD_GUARD_KIND', detail: String(p.kind) };
  if (env.action === 'DASH' && DASH_DIRS.indexOf(p.dir) < 0) return { ok: false, reason: 'BAD_DASH_DIR', detail: String(p.dir) };
  if (env.action === 'EMOTE' && (typeof p.emote_id !== 'string' || !/^[A-Z_]{1,32}$/.test(p.emote_id))) return { ok: false, reason: 'BAD_EMOTE_ID' };
  if ((env.action === 'EMOTE' || env.action === 'EMOTE_INVITE') && p.to !== undefined && p.to !== null && (typeof p.to !== 'string' || !/^[A-Z0-9_\-]{1,48}$/.test(p.to))) return { ok: false, reason: 'BAD_SOCIAL_TARGET' };
  if (env.action === 'EMOTE_INVITE' && (typeof p.emote_id !== 'string' || !/^[A-Z_]{1,32}$/.test(p.emote_id) || typeof p.to !== 'string')) return { ok: false, reason: 'BAD_INVITE' };
  if (env.action === 'EMOTE_JOIN' && (typeof p.from !== 'string' || !/^[A-Z0-9_\-]{1,48}$/.test(p.from))) return { ok: false, reason: 'BAD_JOIN' };
  if (env.action === 'SET_LOADOUT' && (!Array.isArray(p.patterns) || p.patterns.length < 1 || p.patterns.length > 8 || p.patterns.some(function (x) { return typeof x !== 'string' || x.length > 64; }))) return { ok: false, reason: 'BAD_LOADOUT' };
  if (env.action === 'FIELD_INCOMING' && p.kind !== 'PHYSICAL' && p.kind !== 'MAGIC' && p.kind !== 'MIXED') return { ok: false, reason: 'BAD_INCOMING_KIND', detail: String(p.kind) };
  if (env.action === 'RULES_SELECT' && ((p.category !== undefined && ['PHYSICAL', 'PHYSICAL_MAGIC', 'SPECIAL_MAGIC'].indexOf(p.category) < 0) || (p.mode !== undefined && ['PHYSICAL', 'PHYSICAL_MAHGIC', 'SPECIAL_MAHGIC'].indexOf(p.mode) < 0) || (p.slot !== undefined && (!Number.isInteger(p.slot) || p.slot < 0 || p.slot > 7)))) return { ok: false, reason: 'BAD_SELECTION' };
  if (env.action === 'RULES_LOADOUT' && ((p.category !== undefined && ['PHYSICAL', 'PHYSICAL_MAGIC', 'SPECIAL_MAGIC'].indexOf(p.category) < 0) || (p.mode !== undefined && ['PHYSICAL', 'PHYSICAL_MAHGIC', 'SPECIAL_MAHGIC'].indexOf(p.mode) < 0) || (p.category === undefined && p.mode === undefined) || !Number.isInteger(p.slot) || p.slot < 0 || p.slot > 7 || (p.skill_id !== null && p.skill_id !== undefined && (typeof p.skill_id !== 'string' || p.skill_id.length > 48)))) return { ok: false, reason: 'BAD_LOADOUT_REQUEST' };
  if (env.action === 'RULES_CAST' && ((p.skill_id !== undefined && (typeof p.skill_id !== 'string' || p.skill_id.length > 48)) || (p.aim_id !== undefined && (typeof p.aim_id !== 'string' || p.aim_id.length > 48)) || (p.aim_point !== undefined && (typeof p.aim_point !== 'object' || typeof p.aim_point.x !== 'number' || typeof p.aim_point.z !== 'number')))) return { ok: false, reason: 'BAD_CAST' };
  if (env.action === 'RULES_CLASS' && (typeof p.class !== 'string' || p.class.length > 24)) return { ok: false, reason: 'BAD_CLASS' };
  if (env.action === 'TEAM_MATCH' && (['START', 'JOIN', 'BEGIN', 'END', 'LEAVE', 'ABORT'].indexOf(p.op) < 0 || (p.size !== undefined && [1, 2, 3].indexOf(p.size) < 0) || (p.team !== undefined && p.team !== 'A' && p.team !== 'B'))) return { ok: false, reason: 'BAD_TEAM_OP' };
  if (env.action === 'FIELD_ALLY' && p.op !== 'SPAWN' && p.op !== 'REMOVE') return { ok: false, reason: 'BAD_ALLY_OP' };
  if (env.action === 'LOCK_TARGET' && p.aim_id !== undefined && p.aim_id !== null && (typeof p.aim_id !== 'string' || p.aim_id.length > 48)) return { ok: false, reason: 'BAD_LOCK' };
  if (env.action === 'FIELD_PRACTICE' && typeof p.on !== 'boolean') return { ok: false, reason: 'BAD_PRACTICE_FLAG' };
  if (env.action === 'PRACTICE_DUEL' && p.seed !== undefined && (!Number.isInteger(p.seed) || p.seed < 0 || p.seed > 1e9)) return { ok: false, reason: 'BAD_SEED' };
  return { ok: true, payload: p, bytes: bytes };
}
export function payloadHash(p) { var s = JSON.stringify(p === undefined ? {} : p, Object.keys(p || {}).sort()); var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16) + ':' + s.length; }
export function makeEnvelope(session, seq, action, payload) { return { protocol: PROTOCOL_VERSION, session_id: session.session_id, client_id: session.client_id, command_id: session.client_id + '-' + seq, seq: seq, action: action, payload: payload || {} }; }
