'use strict';
/* FOB Systems :: FOB Rounds session persistence.

   Turns FOB Rounds from an in-memory calculator into the recording instrument
   for a member's training history.

   SECURITY MODEL
   report-cards.html is a public page. Member lookup and every write here is
   therefore gated behind the SAME admin session cookie that already protects
   /fob-payment and /form-review (S.isAuthed). Two reasons:
     1. Without it, anyone could probe "is <name> a member?" and turn this into
        a membership enumeration oracle against the approved list.
     2. Without it, anyone could write junk into a member's history.
   When Jah is not signed in, FOB Rounds behaves exactly as it always has:
   fully functional, in memory, untracked. Tracking is the added capability,
   never a prerequisite.

   The typed full name is only a lookup. Everything downstream references the
   stable payment_vip_members.id. */

const S = require('./_session');
const P = require('./_payment');

/* fob-v2 (Aug 2026): the FOB Score is now read against session completion,
   not against attempted work alone. Rounds gate the badge ladder. Performances
   already stored under fob-v1 keep that stamp and are NEVER recalculated, so a
   historical score always means what it meant on the day it was earned. */
const SCORING_VERSION = 'fob-v2';
/* An open session left untouched this long is treated as finished. Stops a
   forgotten session from silently absorbing tomorrow's work into one record,
   without cutting a real session that runs past midnight. */
const STALE_HOURS = 12;

function out(code, obj) {
  return {
    statusCode: code,
    headers: Object.assign({ 'Content-Type': 'application/json' }, S.SECURITY_HEADERS),
    body: JSON.stringify(obj)
  };
}

/* FOB Rounds has one "Athlete" field, the member ledger stores first and last
   separately. Try every sensible split of the typed name and match each with
   the exact query claim-access.js already uses, so one matching rule governs
   the whole site. */
function splits(full) {
  const parts = P.normalize(full).split(' ').filter(Boolean);
  if (parts.length < 2) return [];
  const out = [];
  for (let i = 1; i < parts.length; i++) {
    out.push([parts.slice(0, i).join(' '), parts.slice(i).join(' ')]);
  }
  /* Last token as surname is overwhelmingly the common case, so try it first. */
  out.sort(function (a, b) { return b[0].split(' ').length - a[0].split(' ').length; });
  const seen = {};
  return out.filter(function (p) {
    const k = p[0] + '|' + p[1];
    if (seen[k]) return false; seen[k] = 1; return true;
  });
}

async function findMember(full) {
  const cands = splits(full);
  for (let i = 0; i < cands.length; i++) {
    const q = 'payment_vip_members?select=id,first_name,last_name'
      + '&normalized_first=eq.' + encodeURIComponent(cands[i][0])
      + '&normalized_last=eq.' + encodeURIComponent(cands[i][1])
      + '&active=eq.true&limit=1';
    const rows = await P.db(q);
    if (rows && rows.length) return rows[0];
  }
  return null;
}

async function openSessionFor(memberId) {
  const rows = await P.db('fob_active_sessions?select=id,state,client_rev,started_at,updated_at'
    + '&member_id=eq.' + encodeURIComponent(memberId)
    + '&closed_at=is.null&order=updated_at.desc&limit=1');
  const cur = rows && rows[0];
  if (cur) {
    const age = Date.now() - new Date(cur.updated_at).getTime();
    if (age < STALE_HOURS * 3600000) return cur;
    await P.db('fob_active_sessions?id=eq.' + encodeURIComponent(cur.id),
      { method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ closed_at: new Date().toISOString() }) });
  }
  const made = await P.db('fob_active_sessions',
    { method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ member_id: memberId, state: {}, client_rev: 0 }) });
  return made && made[0];
}

function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : (d === undefined ? null : d); }
function int(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : (d === undefined ? null : d); }
function str(v, max) { return v == null ? null : String(v).slice(0, max || 80); }

/* The client sends the numbers FOB Rounds already computed. This function does
   not score anything: it stores what the deployed model produced, plus the raw
   state, so the report can be rebuilt later without re-running today's rules
   against tomorrow's formula. */
function performanceRow(memberId, sessionId, sum, state) {
  const s = sum || {};
  return {
    member_id: memberId,
    active_session_id: sessionId,
    session_date: str(s.sessionDate, 10) || new Date().toISOString().slice(0, 10),
    started_at: s.startedAt || null,
    completed_at: new Date().toISOString(),
    scoring_version: SCORING_VERSION,
    overall_score: num(s.pct, 0),
    points_earned: int(s.earned, 0),
    points_possible: int(s.possible, 0),
    badge_id: str(s.badgeId, 40) || 'fobaby',
    badge_name: str(s.badgeName, 40) || 'FOBaby',
    core_pct: num(s.corePct), iso_pct: num(s.isoPct),
    pp_pct: num(s.ppPct), tech_pct: num(s.techPct),
    drops: int(s.drops, 0),
    best_round_pct: num(s.bestRoundPct),
    round_delta_pct: num(s.deltaPct),
    sets_logged: int(s.logged, 0), sets_total: int(s.slots, 40),
    rounds_recorded: int(s.roundsRecorded, 0), rounds_total: int(s.roundsTotal, 4),
    bonus_seconds: int(s.bonusSeconds, 0),
    profile_key: str(s.profKey, 40), profile_label: str(s.profLabel, 40),
    block_lb: int(s.block), band_level: str(s.band, 10),
    marker_core_in: int(s.markerCore), marker_pp_in: int(s.markerPP),
    dur_core_s: int(s.durCore), dur_iso_s: int(s.durIso),
    dur_pp_s: int(s.durPP), dur_tech_s: int(s.durTech),
    state: state || {},
    round_scores: Array.isArray(s.rounds) ? s.rounds : []
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return out(405, { error: 'Method not allowed.' });
  /* Not signed in is not an error condition. It means untracked, and FOB Rounds
     carries on exactly as before. The client treats this as "no tracking". */
  if (!S.isAuthed(event)) return out(200, { tracking: false });

  let b = {};
  try { b = JSON.parse(event.body || '{}'); } catch (e) {}
  const action = String(b.action || '');

  try {
    /* Roster for the athlete picker. Sits behind the same admin gate as every
       other action here, and that gate is load-bearing: report-cards.html is a
       PUBLIC page, so an ungated roster would turn it into a membership
       enumeration oracle for anyone who found the URL. Signed out, the picker
       simply never appears and the free-text field is used as before.

       Returns id and display name only. No balances, no expiry, no rate, no
       park, no contact detail: nothing the picker does not draw. */
    if (action === 'members') {
      const rows = await P.db('payment_vip_members?select=id,first_name,last_name'
        + '&active=eq.true&order=first_name.asc,last_name.asc&limit=1000');
      return out(200, {
        tracking: true,
        members: (rows || []).map(function (m) {
          return { id: m.id, name: ((m.first_name || '') + ' ' + (m.last_name || '')).trim() };
        }).filter(function (m) { return m.name; })
      });
    }

    if (action === 'resolve') {
      const typed = String(b.name || '').trim();
      if (!typed) return out(200, { tracking: true, found: false });
      const m = await findMember(typed);
      if (!m) return out(200, { tracking: true, found: false });
      const sess = await openSessionFor(m.id);
      return out(200, {
        tracking: true, found: true,
        member: { id: m.id, name: (m.first_name + ' ' + m.last_name).trim() },
        session: { id: sess.id, rev: sess.client_rev || 0, startedAt: sess.started_at },
        state: sess.state && Object.keys(sess.state).length ? sess.state : null
      });
    }

    if (action === 'save') {
      if (!b.sessionId) return out(400, { error: 'Missing session.' });
      /* Monotonic revision guard. Out-of-order arrivals from a flaky connection
         cannot overwrite newer state with older state. */
      const cur = await P.db('fob_active_sessions?select=client_rev,closed_at&id=eq.'
        + encodeURIComponent(b.sessionId) + '&limit=1');
      if (!cur || !cur.length) return out(404, { error: 'Session not found.' });
      if (cur[0].closed_at) return out(409, { error: 'Session already closed.', closed: true });
      const rev = int(b.rev, 0);
      if (rev <= (cur[0].client_rev || 0)) return out(200, { ok: true, stale: true, rev: cur[0].client_rev });
      await P.db('fob_active_sessions?id=eq.' + encodeURIComponent(b.sessionId),
        { method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ state: b.state || {}, client_rev: rev, updated_at: new Date().toISOString() }) });
      return out(200, { ok: true, rev: rev });
    }

    if (action === 'finalize') {
      if (!b.memberId || !b.sessionId) return out(400, { error: 'Missing member or session.' });
      /* Idempotent. active_session_id is unique, so opening, refreshing or
         reopening FOBreakdown lands on the same single row every time. Later
         opens refresh that row rather than adding another. */
      const row = performanceRow(b.memberId, b.sessionId, b.summary, b.state);
      const saved = await P.db('fob_performances?on_conflict=active_session_id',
        { method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(row) });
      /* Keep the active session open. Jah often records more after looking at
         the report, and the next finalize simply refreshes the same row. */
      return out(200, { ok: true, performanceId: saved && saved[0] && saved[0].id });
    }

    /* Replay. Hands back the state that was actually recorded that day so a
       historical FOBreakdown rebuilds from it, never from the member's newest
       settings. Read only: this action writes nothing and never touches the
       member's open session. */
    if (action === 'perf') {
      const pid = String(b.id || '');
      if (!/^[0-9a-fA-F-]{36}$/.test(pid)) return out(400, { error: 'Bad performance id.' });
      const rows = await P.db('fob_performances?select=id,member_id,session_date,overall_score,'
        + 'badge_id,badge_name,scoring_version,state&id=eq.' + encodeURIComponent(pid) + '&limit=1');
      if (!rows || !rows.length) return out(404, { error: 'Performance not found.' });
      const r = rows[0];
      const mem = await P.db('payment_vip_members?select=first_name,last_name&id=eq.'
        + encodeURIComponent(r.member_id) + '&limit=1');
      return out(200, {
        ok: true,
        performance: {
          id: r.id, date: r.session_date, score: Number(r.overall_score),
          badgeId: r.badge_id, badgeName: r.badge_name,
          scoringVersion: r.scoring_version,
          member: mem && mem[0] ? (mem[0].first_name + ' ' + mem[0].last_name).trim() : ''
        },
        state: r.state || null
      });
    }

    if (action === 'newSession') {
      if (!b.memberId) return out(400, { error: 'Missing member.' });
      await P.db('fob_active_sessions?member_id=eq.' + encodeURIComponent(b.memberId) + '&closed_at=is.null',
        { method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ closed_at: new Date().toISOString() }) });
      const sess = await openSessionFor(b.memberId);
      return out(200, { ok: true, session: { id: sess.id, rev: 0 } });
    }

    return out(400, { error: 'Unknown action.' });
  } catch (e) {
    console.error('fob-rounds', action, e && e.message, e && e.detail);
    return out(500, { error: 'Session storage is not available right now.' });
  }
};
