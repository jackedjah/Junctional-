/* LOCAL AUTHORITY LAB PAGE — three transport-neutral clients over the HTTP transport; state-only panels (no renderer, no gameplay logic).
   Every button submits INTENT; every number shown comes from the host snapshot. Polling is a client-side timer (250 ms; health 1 s).
   Phase 5B: the header shows the host lifecycle — LIVE → HOST UNAVAILABLE → RECOVERED / HELD → (developer resume) → CONTINUED STATE.
   Developer controls (resume / close / fault / clean shutdown) appear only when the host was started with --dev-hooks; they are not
   player actions. After a host restart the existing RECONNECT button re-binds each client through the guarded reconnect flow.
   ?smoke=1 runs a scripted sequence and prints MAHWORLD_LAB_SMOKE {...} to the console (headless evidence). */
import { createLabClient, createHttpTransport } from './LabClient.js';

var base = location.origin; var T = createHttpTransport(base); var tokens = null; var clients = {}; var params = new URLSearchParams(location.search || '');
if (params.get('smoke') === '1') { var holdImg = new Image(); holdImg.src = base + '/api/hold?ms=' + (params.get('hold') || 16000); }   /* keeps the document load event pending until the smoke has run (headless evidence only) */
var ACCOUNT = { A: 'PLAYER_A', B: 'PLAYER_B', S: 'SPECTATOR_1' }; var LIFE = { last: null, unavailable: false, seenGeneration: null };
function panel(k) { return document.querySelector('section[data-client="' + k + '"]'); }
function setF(k, f, v) { var e = panel(k).querySelector('[data-f="' + f + '"]'); if (e) e.textContent = typeof v === 'string' ? v : JSON.stringify(v); }
function client(k) { if (!clients[k]) clients[k] = createLabClient({ client_id: 'client-' + k, account_id: ACCOUNT[k], token: tokens[ACCOUNT[k]], transport: T }); return clients[k]; }
var OPS = {
  connect: function (c) { return c.connect(); }, join: function (c) { return c.send('JOIN_DUEL'); }, spectate: function (c) { return c.send('SPECTATE'); }, fwd: function (c) { return c.send('MOVE', { forward: 1, strafe: 0 }); }, stop: function (c) { return c.send('MOVE', { forward: 0, strafe: 0 }); },
  transform: function (c) { return c.send('TRANSFORM'); }, p1: function (c) { return c.send('SELECT_PATTERN', { pattern_id: 'HORIZONTAL_PUSH' }); }, p2: function (c) { return c.send('SELECT_PATTERN', { pattern_id: 'VERTICAL_PULL' }); }, atk: function (c) { return c.send('ATTACK', { hint: 'UP' }); }, special: function (c) { return c.send('ATTACK', { hint: 'HOLD' }); },
  concede: function (c) { return c.send('CONCEDE'); }, accept: function (c) { return c.send('ACCEPT_NEXT'); }, decline: function (c) { return c.send('DECLINE_NEXT', { choice: 'A' }); }, callnext: function (c) { return c.send('CALL_NEXT'); }, drop: function (c) { return c.disconnect(); }, reconnect: function (c) { return c.reconnect(); }, leave: function (c) { return c.send('LEAVE'); }
};
document.querySelectorAll('section[data-client] button[data-op]').forEach(function (b) { b.addEventListener('click', function () { var k = b.closest('section').dataset.client; OPS[b.dataset.op](client(k)).then(render); }); });
document.addEventListener('visibilitychange', function () { Object.keys(clients).forEach(function (k) { clients[k].visibility(document.visibilityState); }); });
function devPost(p) { return fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(function (r) { return r.json(); }); }
document.querySelectorAll('#devctl button[data-dev]').forEach(function (b) { b.addEventListener('click', function () { devPost('/api/dev/' + b.dataset.dev).then(function (r) { document.getElementById('devout').textContent = JSON.stringify(r); }).catch(function (e) { document.getElementById('devout').textContent = 'host unreachable: ' + e.message; }); }); });
function lifecycleLabel(h) {
  if (!h) return 'HOST UNAVAILABLE';
  if (h.lifecycle === 'RECOVERY_HELD_DEV') return 'RECOVERED / HELD (RECOVERY_HELD_DEV) · generation ' + h.generation + ' · committed version ' + h.committed_version + (h.recovery ? ' · ' + h.recovery.records + ' journal records' + (h.recovery.unresolved ? ' · UNRESOLVED inconsistencies' : '') : '') + ' · previous shutdown ' + (h.store.previous_clean_shutdown === true ? 'clean' : h.store.previous_clean_shutdown === false ? 'NOT confirmed clean' : 'n/a') + (h.recovery && h.recovery.terminal ? ' · terminal result recovered' : ' · no result, no rewards while held');
  if (h.lifecycle === 'FAULTED') return 'HOST FAULTED — ' + JSON.stringify(h.fault);
  return (h.generation > 1 ? 'CONTINUED STATE after developer resume · generation ' + h.generation : 'LIVE · generation ' + h.generation) + ' · version ' + h.version + ' · duel ' + (h.duel || 'none') + (h.paused ? ' · PAUSED' : '');
}
async function healthPoll() {
  try { var h = await fetch(base + '/api/health').then(function (r) { return r.json(); }); LIFE.unavailable = false; LIFE.last = h; document.getElementById('hoststat').textContent = lifecycleLabel(h); document.getElementById('devctl').hidden = !h.dev_hooks; document.getElementById('storestat').textContent = 'store ' + h.store.kind + (h.store.persistent ? ' (durable, ' + (h.store.path || '') + ')' : ' (NOT persistent)') + ' · dev hooks ' + (h.dev_hooks ? 'ON' : 'off'); }
  catch (e) { LIFE.unavailable = true; document.getElementById('hoststat').textContent = 'HOST UNAVAILABLE — ' + e.message + ' (restart the lab host; clients keep their session ids and can RECONNECT)'; }
}
function render() {
  var shared = null;
  Object.keys(clients).forEach(function (k) { var v = clients[k].view(); setF(k, 'state', LIFE.unavailable ? v.state + ' (host unavailable)' : v.state); setF(k, 'role', v.role); setF(k, 'pending', v.pending); setF(k, 'ack', v.last_ack ? (v.last_ack.command_id + ' ' + JSON.stringify(v.last_ack).slice(0, 160)) : '—'); setF(k, 'rej', v.last_rejection ? (v.last_rejection.command_id + ' ' + v.last_rejection.reason + (v.last_rejection.detail ? ' (' + (typeof v.last_rejection.detail === 'string' ? v.last_rejection.detail : JSON.stringify(v.last_rejection.detail)) + ')' : '')) : '—'); var s = v.snapshot; setF(k, 'view', s ? JSON.stringify({ lifecycle: s.lifecycle, generation: s.generation, version: s.version, committed_version: s.committed_version, match_id: s.match_id, session: s.session, me: s.me || null, opponent: s.opponent || null, spectator: s.spectator || null }, null, 1) : '—'); if (s && (!shared || s.version > shared.version)) shared = s; });
  document.getElementById('shared-view').textContent = shared ? JSON.stringify({ lifecycle: shared.lifecycle, generation: shared.generation, version: shared.version, committed_version: shared.committed_version, t: shared.t, paused: shared.paused, pause_reason: shared.pause_reason, match_id: shared.match_id, duel: shared.duel, forms: shared.forms, positions: shared.positions, spectators: shared.spectators + '/' + shared.spectator_max, queue: shared.queue, terminal: shared.terminal, recovery: shared.recovery, classification: shared.classification }, null, 1) : '—';
}
async function poll() { var ks = Object.keys(clients); for (var i = 0; i < ks.length; i++) { try { await clients[ks[i]].refresh(); } catch (e) { /* host unreachable: the view keeps its last state */ } } render(); }
try { var j = await fetch(base + '/api/tokens').then(function (r) { return r.json(); }); tokens = j.tokens; await healthPoll(); LIFE.seenGeneration = LIFE.last ? LIFE.last.generation : null; setInterval(poll, 250); setInterval(healthPoll, 1000); } catch (e) { document.getElementById('hoststat').textContent = 'HOST UNAVAILABLE — ' + e.message; }
if (tokens && params.get('smoke') === '1') { var smokeResult = await smoke(); document.getElementById('hoststat').textContent = 'SMOKE ' + JSON.stringify(smokeResult); }

async function smoke() {
  var r = {}; var A = client('A'), B = client('B'), S = client('S'); var wait = function (ms) { return new Promise(function (res) { setTimeout(res, ms); }); };
  r.lifecycle_at_start = LIFE.last ? LIFE.last.lifecycle : null; r.generation = LIFE.last ? LIFE.last.generation : null;
  if (LIFE.last && LIFE.last.lifecycle === 'RECOVERY_HELD_DEV') { r.recovered = LIFE.last.recovery; r.reconnect = [(await A.reconnect()).ok, (await B.reconnect()).ok, (await S.reconnect()).ok]; var held = await A.send('PING'); r.ping_while_held = held.accepted; var blocked = await A.send('ATTACK', { hint: 'UP' }); r.attack_while_held = blocked.reason; if (LIFE.last.dev_hooks) { r.dev_resume = (await devPost('/api/dev/resume')).ok; await wait(600); await healthPoll(); r.lifecycle_after_resume = LIFE.last.lifecycle; } render(); console.log('MAHWORLD_LAB_SMOKE ' + JSON.stringify(r)); return r; }
  r.connect = [(await A.connect()).ok, (await B.connect()).ok, (await S.connect()).ok]; r.join = [(await A.send('JOIN_DUEL')).accepted, (await B.send('JOIN_DUEL')).accepted]; await wait(700);
  r.spectate = (await S.send('SPECTATE')).accepted; r.spectator_attack = (await S.send('ATTACK', { hint: 'UP' })).reason; r.transform = (await A.send('TRANSFORM', { to: 'SPLIT' })).accepted; await wait(400);
  r.pattern = (await A.send('SELECT_PATTERN', { pattern_id: 'VERTICAL_PULL' })).accepted; r.special = (await A.send('ATTACK', { hint: 'HOLD' })).accepted; await wait(4200);
  r.callnext = (await S.send('CALL_NEXT')).accepted; r.callnext_dup = (await S.send('CALL_NEXT')).reason; r.drop = (await B.disconnect()).ok; await wait(300); var pausedSnap = await A.refresh(); r.paused = pausedSnap.paused; r.reconnect = (await B.reconnect()).ok; await wait(300);
  r.concede = (await B.send('CONCEDE')).accepted; await wait(2600); var sa = await A.refresh(), sb = await B.refresh(), ss = await S.refresh(); r.agree = sa.duel.state === sb.duel.state && JSON.stringify(sa.duel.health) === JSON.stringify(sb.duel.health) && sa.terminal && sb.terminal && sa.terminal.winner === sb.terminal.winner && ss.terminal && ss.terminal.winner === sa.terminal.winner; r.terminal = sa.terminal; r.xp_A = sa.me.xp; r.xp_B = sb.me.xp;
  r.leave = [(await A.send('LEAVE')).accepted, (await B.send('LEAVE')).accepted, (await S.send('LEAVE')).accepted]; render(); console.log('MAHWORLD_LAB_SMOKE ' + JSON.stringify(r)); return r;
}
