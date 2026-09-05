'use strict';
const S = require('./_session');
const P = require('./_payment');

const H = Object.assign({ 'Content-Type':'application/json' }, S.SECURITY_HEADERS);
const out = (code, body) => ({ statusCode:code, headers:H, body:JSON.stringify(body) });
const uuid = value => /^[0-9a-fA-F-]{36}$/.test(String(value || ''));
const clean = (value, max) => String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max || 500);

async function ensureMessageThread(memberId) {
  let rows = await P.db('member_message_threads?select=id&member_id=eq.' + encodeURIComponent(memberId) + '&limit=1');
  if (rows && rows[0]) return rows[0];
  try {
    rows = await P.db('member_message_threads', { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify({ member_id:memberId }) });
    if (rows && rows[0]) return rows[0];
  } catch (error) { if (!(error && Number(error.status) === 409)) throw error; }
  rows = await P.db('member_message_threads?select=id&member_id=eq.' + encodeURIComponent(memberId) + '&limit=1');
  if (!rows || !rows[0]) throw new Error('Message thread was not created');
  return rows[0];
}
async function syncRescheduleMessage(requestRow, decision) {
  if (!requestRow || !uuid(requestRow.member_id)) return;
  try {
    const candidates = await P.db('member_messages?select=id,metadata,request_status&member_id=eq.' + encodeURIComponent(requestRow.member_id)
      + '&request_type=eq.reschedule&order=created_at.desc&limit=100');
    const linked = (candidates || []).find(function (row) {
      return row && row.metadata && String(row.metadata.calendarRequestId || '') === String(requestRow.id || '');
    });
    const state = decision === 'declined' ? 'declined' : (requestRow.status === 'awaiting_payment' ? 'awaiting_payment' : 'approved');
    if (linked) await P.db('member_messages?id=eq.' + encodeURIComponent(linked.id), {
      method:'PATCH', headers:{Prefer:'return=minimal'}, body:JSON.stringify({ request_status:state, updated_at:new Date().toISOString() })
    });
    const thread = await ensureMessageThread(requestRow.member_id);
    let copy;
    if (state === 'declined') copy = 'Reschedule request declined. Your original session remains on the calendar.';
    else if (state === 'awaiting_payment') copy = 'Reschedule approved by coach. The $12 late-reschedule payment is required before the session can move. Your original session remains active until payment is completed.';
    else copy = 'Reschedule approved. Your calendar has been moved to the requested session time.';
    const msgs = await P.db('member_messages', { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify({
      thread_id:thread.id, member_id:requestRow.member_id, sender_role:'system', message_type:'system', body:copy,
      metadata:{ requestType:'reschedule', calendarRequestId:requestRow.id, status:state, proposedStartsAt:requestRow.proposed_starts_at,
        lateFeeRequired:requestRow.late_fee_required === true, lateFeeAmountCents:Number(requestRow.late_fee_amount_cents)||1200 }
    }) });
    const msg = msgs && msgs[0];
    if (msg) await P.db('member_message_notifications', { method:'POST', headers:{Prefer:'return=minimal'}, body:JSON.stringify({
      member_id:requestRow.member_id, message_id:msg.id, audience:'member', kind:'request_update',
      payload:{ requestType:'reschedule', calendarRequestId:requestRow.id, status:state }
    }) });
  } catch (error) {
    console.error('calendar admin reschedule message sync', error && error.message);
  }
}

function shell() {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<meta name="robots" content="noindex,nofollow,noarchive"><title>MAH Calendar · Coach</title>'
    + '<meta name="theme-color" content="#0E1114"><link rel="preconnect" href="https://fonts.googleapis.com">'
    + '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">'
    + '<link rel="stylesheet" href="/calendar-admin.css?v=394"><link rel="stylesheet" href="/calendar-admin-ui.css?v=394"><link rel="stylesheet" href="/coach-shell.css?v=453&rc5c=1"><link rel="stylesheet" href="/mahfitt-atmosphere.css?v=453"></head><body data-coach-surface="calendar">'
    + '<main id="calendarAdmin"><section class="admin-loading"><b>MAHFITT</b><span>Opening coach calendar…</span></section></main>'
    + '<script defer src="/coach-shell.js?v=453&rc5c=1"></script><script defer src="/calendar-admin-client.js?v=394"></script></body></html>';
}
async function openSlots(days) {
  const now = new Date(), count = days || 190, until = new Date(now.getTime() + count * 86400000);
  const [rows, plans, events, settings] = await Promise.all([
    P.db('rpc/open_slots?limit=10000', { method:'POST', body:JSON.stringify({ from_ts:now.toISOString(), days:count }) }),
    P.db('calendar_checkout_plans?select=id&status=in.(ready,checkout)&expires_at=gt.'
      + encodeURIComponent(now.toISOString()) + '&limit=10000'),
    P.db('member_calendar_events?select=starts_at,ends_at&kind=in.(fob_sesh,lift_sesh)&status=eq.scheduled'
      + '&ends_at=gt.' + encodeURIComponent(now.toISOString())
      + '&starts_at=lt.' + encodeURIComponent(until.toISOString()) + '&limit=10000'),
    P.db('booking_settings?select=session_minutes&limit=1')
  ]);
  const blocked = (events || []).map(row => [new Date(row.starts_at).getTime(), new Date(row.ends_at).getTime()]);
  if (plans && plans.length) {
    const holds = await P.db('calendar_checkout_plan_slots?select=starts_at,ends_at&plan_id=in.('
      + plans.map(p => p.id).join(',') + ')&limit=10000');
    (holds || []).forEach(row => blocked.push([new Date(row.starts_at).getTime(), new Date(row.ends_at).getTime()]));
  }
  const minutes = Number(settings && settings[0] && settings[0].session_minutes) || 60;
  return (rows || []).map(r => r.slot_start).filter(function (slot) {
    const start = new Date(slot).getTime(), end = start + minutes * 60000;
    return !blocked.some(range => range[0] < end && range[1] > start);
  });
}

exports.handler = async function (event) {
  if (!S.isAuthed(event)) {
    if (event.httpMethod === 'GET') return { statusCode:302, headers:{ Location:'/member-access?next=/calendar-admin', 'Cache-Control':'no-store' }, body:'' };
    return out(401, { ok:false, error:'Not authenticated.' });
  }
  if (event.httpMethod === 'GET') {
    return { statusCode:200, headers:Object.assign({}, S.SECURITY_HEADERS, { 'Content-Type':'text/html; charset=utf-8' }), body:shell() };
  }
  if (event.httpMethod !== 'POST') return out(405, { ok:false, error:'Method not allowed.' });
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (error) { return out(400, { ok:false, error:'Malformed request.' }); }
  try {
    if (body.action === 'boot') {
      const members = await P.db('payment_vip_members?select=id,first_name,last_name,sesh_left,active,preferred_park,location_rate,gym_only'
        + '&order=active.desc,first_name.asc,last_name.asc&limit=10000');
      const pending = await P.db('calendar_change_requests?select=id,status,created_at,member_id&status=in.(pending,awaiting_payment)&limit=1000');
      return out(200, { ok:true, members:members || [], pending:pending || [] });
    }
    if (body.action === 'member') {
      if (!uuid(body.memberId)) return out(400, { ok:false, error:'Choose a member.' });
      const [events, requests, member] = await Promise.all([
        P.db('member_calendar_events?select=*&member_id=eq.' + body.memberId + '&order=starts_at.asc&limit=3000'),
        P.db('calendar_change_requests?select=*,event:member_calendar_events(title,starts_at,ends_at,park_name)'
          + '&member_id=eq.' + body.memberId + '&order=created_at.desc&limit=500'),
        P.db('payment_vip_members?select=id,first_name,last_name,sesh_left,preferred_park,active&id=eq.' + body.memberId + '&limit=1')
      ]);
      return out(200, { ok:true, member:member && member[0], events:events || [], requests:requests || [], slots:await openSlots(190) });
    }
    if (body.action === 'eventSave') {
      if (!uuid(body.memberId)) return out(400, { ok:false, error:'Choose a member.' });
      const start = new Date(body.startsAt), end = new Date(body.endsAt);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return out(400, { ok:false, error:'Choose a valid start and end.' });
      const kind = ['personal','fob_sesh','lift_sesh'].includes(body.kind) ? body.kind : 'personal';
      try {
        const result = await P.db('rpc/save_coach_calendar_event', {
          method:'POST', body:JSON.stringify({
            p_event_id:uuid(body.eventId) ? body.eventId : null,
            p_member_id:body.memberId,
            p_kind:kind,
            p_title:clean(body.title,120) || (kind === 'personal' ? 'Personal event' : kind === 'lift_sesh' ? 'Lift Sesh' : 'FOB SESH'),
            p_notes:clean(body.notes,1200) || '',
            p_starts_at:start.toISOString(), p_ends_at:end.toISOString(),
            p_all_day:body.allDay === true,
            p_color:['gold','blue','green','white','orange','purple','yellow','beige'].includes(body.color) ? body.color : 'gold',
            p_park_name:clean(body.parkName,160) || ''
          })
        });
        return out(200, { ok:true, event:Array.isArray(result) ? result[0] : result });
      } catch (error) {
        const detail = JSON.stringify(error && error.detail || error && error.message || '');
        if (/overlap|held for checkout|live availability|another booking/i.test(detail)) {
          return out(409, { ok:false, error:'That session time is not available. Refresh and choose another opening.' });
        }
        throw error;
      }
    }
    if (body.action === 'eventDelete') {
      if (!uuid(body.memberId) || !uuid(body.eventId)) return out(400, { ok:false, error:'Event not found.' });
      await P.db('member_calendar_events?id=eq.' + body.eventId + '&member_id=eq.' + body.memberId, { method:'DELETE', headers:{Prefer:'return=minimal'} });
      return out(200, { ok:true });
    }
    if (body.action === 'requestResolve') {
      if (!uuid(body.requestId) || !['approved','declined'].includes(body.decision)) return out(400, { ok:false, error:'Request not found.' });
      try {
        const result = await P.db('rpc/resolve_calendar_change_request_v2', {
          method:'POST', body:JSON.stringify({ p_request_id:body.requestId, p_decision:body.decision })
        });
        const request = Array.isArray(result) ? result[0] : result;
        await syncRescheduleMessage(request, body.decision);
        return out(200, { ok:true, request:request,
          message:request && request.status === 'awaiting_payment'
            ? 'Coach approval recorded. $12 payment is required before the calendar moves; the original session remains active.'
            : body.decision === 'approved' ? 'Reschedule approved and calendar updated.' : 'Reschedule declined; original session remains active.' });
      } catch (error) {
        const detail = JSON.stringify(error && error.detail || error && error.message || '');
        if (/no longer|conflict|held for checkout|another booking|original session changed/i.test(detail)) {
          return out(409, { ok:false, error:'That request can no longer be approved safely. Decline it or edit the session directly in the authoritative coach calendar.' });
        }
        if (/resolve_calendar_change_request_v2|schema cache|does not exist/i.test(detail)) {
          return out(503, { ok:false, setupRequired:true, error:'Reschedule v2 needs Supabase migration 041 before first use.' });
        }
        throw error;
      }
    }
    return out(400, { ok:false, error:'Unknown action.' });
  } catch (error) {
    console.error('calendar-admin', body.action, error && error.message, error && error.detail);
    return out(500, { ok:false, error:'Calendar Systems could not finish that action.' });
  }
};
