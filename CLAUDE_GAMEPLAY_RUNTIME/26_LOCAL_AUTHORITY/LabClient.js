/* MAHWORLD GAMEPLAY RUNTIME :: LAB CLIENT (Phase 5A) — transport-neutral player / spectator client for the local authority host.
   States: CONNECTING · READY · IN_DUEL · RECONNECTING · CLOSED. The client holds only a VIEW (last snapshot, last ack / rejection);
   it never applies damage, XP or health itself and never trusts its own values over the host. Un-acknowledged commands stay pending
   and are re-sent with the SAME command_id after reconnect, so the host deduplicates them (no double spending / damage).
   Transports: in-process (direct host calls), lossy wrapper (test: drop the next ack), HTTP (fetch against the loopback lab server). */
import { makeEnvelope } from './Protocol.js';

export function createInProcessTransport(host) { return { kind: 'IN_PROCESS', connect: function (r) { return Promise.resolve(host.connect(r)); }, submit: function (e) { return Promise.resolve(host.submit(e)); }, snapshot: function (id) { return Promise.resolve(host.snapshot(id)); }, disconnect: function (id) { return Promise.resolve(host.disconnect(id)); }, reconnect: function (r) { return Promise.resolve(host.reconnect(r)); } }; }
export function createLossyTransport(inner) { var plan = { dropNextAck: false, dropped: 0 }; return { kind: 'LOSSY(' + inner.kind + ')', plan: plan, connect: inner.connect, snapshot: inner.snapshot, disconnect: inner.disconnect, reconnect: inner.reconnect, submit: function (e) { return inner.submit(e).then(function (ack) { if (plan.dropNextAck) { plan.dropNextAck = false; plan.dropped++; throw new Error('ACK_LOST (simulated)'); } return ack; }); } }; }
export function createHttpTransport(baseUrl, fetchImpl) {
  var F = fetchImpl || (typeof fetch === 'function' ? fetch : null); if (!F) throw new Error('no fetch available'); var base = baseUrl.replace(/\/$/, '');
  function post(p, body) { return F(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
  return { kind: 'HTTP', connect: function (r) { return post('/api/connect', r); }, submit: function (e) { return post('/api/command', e); }, snapshot: function (id) { return F(base + '/api/snapshot?session=' + encodeURIComponent(id)).then(function (r) { return r.json(); }); }, disconnect: function (id) { return post('/api/disconnect', { session_id: id }); }, reconnect: function (r) { return post('/api/reconnect', r); } };
}

export function createLabClient(o) {
  var T = o.transport; var S = { state: 'CONNECTING', session: null, seq: 0, pending: {}, last_ack: null, last_rejection: null, snapshot: null, visibility: 'visible', role: 'LOBBY', errors: [] };
  function fromSnapshot(snap) { if (!snap || !snap.session) return; S.snapshot = snap; S.role = snap.session.role; if (S.state !== 'CLOSED') S.state = snap.session.state; }
  var api = {
    client_id: o.client_id, account_id: o.account_id,
    connect: async function () { S.state = 'CONNECTING'; var r = await T.connect({ client_id: o.client_id, account_id: o.account_id, token: o.token }); if (!r.ok) { S.state = 'CLOSED'; S.errors.push(r.reason); return r; } S.session = { session_id: r.session_id, client_id: o.client_id }; fromSnapshot(r.snapshot); S.state = r.state; return r; },
    send: async function (action, payload) {
      if (S.state === 'CLOSED' || S.state === 'CONNECTING') return { accepted: false, reason: 'CLIENT_' + S.state }; if (S.state === 'RECONNECTING') return { accepted: false, reason: 'CLIENT_RECONNECTING', hint: 'reconnect first' };
      var env = makeEnvelope(S.session, S.seq++, action, payload || {}); S.pending[env.command_id] = env; var ack;
      try { ack = await T.submit(env); } catch (e) { S.errors.push(String(e.message || e)); return { accepted: false, reason: 'ACK_LOST', command_id: env.command_id, pending: true }; }
      delete S.pending[env.command_id]; if (ack.accepted) S.last_ack = ack; else S.last_rejection = ack; if (ack.reason === 'STALE_SESSION') S.state = 'CLOSED'; if (ack.accepted && (action === 'LEAVE')) S.state = 'CLOSED'; return ack;
    },
    refresh: async function () { if (!S.session) return null; var snap = await T.snapshot(S.session.session_id); if (snap && snap.ok) fromSnapshot(snap); return snap; },
    /* transport-level loss (simulated by the lab): the host keeps the session in RECONNECTING for the configured window */
    disconnect: async function () { if (!S.session) return { ok: false }; var r = await T.disconnect(S.session.session_id); if (r.ok) S.state = 'RECONNECTING'; return r; },
    reconnect: async function () {
      if (!S.session) return { ok: false, reason: 'NO_SESSION' }; var r = await T.reconnect({ client_id: o.client_id, session_id: S.session.session_id, token: o.token }); if (!r.ok) { if (r.reason === 'SESSION_EXPIRED') S.state = 'CLOSED'; S.errors.push(r.reason); return r; }
      S.state = r.state; fromSnapshot(r.snapshot); S.last_ack = r.last_ack || S.last_ack; if (typeof r.last_seq === 'number') S.seq = Math.max(S.seq, r.last_seq + 1);   /* resync the sequence from the host's committed history (a re-bound client would otherwise restart at 0 → OUT_OF_ORDER) */
      /* resynchronise: re-send un-acknowledged commands with their original ids — the host answers from its ack cache, never re-executes */
      var ids = Object.keys(S.pending).sort(function (a, b) { return S.pending[a].seq - S.pending[b].seq; }); var resent = 0, dup = 0, results = [];
      for (var i = 0; i < ids.length; i++) { var env = S.pending[ids[i]]; try { var ack = await T.submit(env); delete S.pending[ids[i]]; resent++; if (ack.duplicate) dup++; results.push(ack); } catch (e) { S.errors.push(String(e.message || e)); } }
      await api.refresh(); return Object.assign({}, r, { resent: resent, duplicates: dup, results: results });
    },
    /* a client that lost its process (page reload, host restart) re-binds a KNOWN session id; the host still checks client_id + dev token before answering */
    adopt: function (sessionId) { S.session = { session_id: sessionId, client_id: o.client_id }; S.state = 'RECONNECTING'; return S.session; },
    visibility: function (v) { S.visibility = v === 'hidden' ? 'hidden' : 'visible'; return S.visibility; },   /* page visibility is a client-side signal only; the host state does not change */
    view: function () { return { state: S.state, role: S.role, session_id: S.session ? S.session.session_id : null, last_ack: S.last_ack, last_rejection: S.last_rejection, pending: Object.keys(S.pending).length, snapshot: S.snapshot, visibility: S.visibility, errors: S.errors.slice() }; },
    destroy: function () { S.pending = {}; S.state = 'CLOSED'; S.snapshot = null; }
  }; return api;
}
