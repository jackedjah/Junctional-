'use strict';
const P = require('./_payment');

const TO = process.env.CALENDAR_NOTIFY_TO || process.env.INQUIRY_NOTIFY_TO || 'fobsystems1@gmail.com';
const FROM = process.env.CALENDAR_NOTIFY_FROM || process.env.INQUIRY_NOTIFY_FROM || 'FOB Systems <onboarding@resend.dev>';
const ZONE = 'America/New_York';

function text(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, max || 500);
}
function esc(value) {
  return text(value, 5000).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
function when(value) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, weekday:'long', month:'long', day:'numeric', year:'numeric',
    hour:'numeric', minute:'2-digit'
  }).format(d) + ' ET';
}
function list(slots, park) {
  return (Array.isArray(slots) ? slots : []).map(function (s) {
    return '<li style="margin:8px 0"><b>' + esc(when(s.starts_at || s.startsAt || s))
      + '</b>' + (park ? '<br><span style="color:#746d63">' + esc(park) + '</span>' : '') + '</li>';
  }).join('');
}
function template(type, payload) {
  const p = payload || {};
  const member = text(p.memberName, 160) || 'A FOB member';
  if (type === 'schedule_change') {
    return {
      subject: member + ' requested a FOB calendar change',
      html: '<div style="font-family:Arial,sans-serif;color:#171717;line-height:1.55;max-width:650px">'
        + '<p style="font-size:11px;letter-spacing:.2em;color:#8b6d3f">FOB SYSTEMS · SCHEDULE REQUEST</p>'
        + '<h1 style="font-size:22px">' + esc(member) + ' requested a schedule change.</h1>'
        + '<p><b>Current session</b><br>' + esc(when(p.currentStartsAt)) + '<br>' + esc(p.parkName || '') + '</p>'
        + '<p><b>Requested time</b><br>' + esc(when(p.proposedStartsAt)) + '</p>'
        + '<p><b>Reason</b><br>' + esc(p.reason || 'No reason added.') + '</p>'
        + (p.lateFeeRequired ? '<p><b>Late-reschedule condition:</b> Member accepted the $12 fee condition because the original or proposed session is within 16 hours. If approved, the original session stays active until payment is completed.</p>' : '')
        + '<p>This is a request only. Nothing moved automatically. Open Calendar Systems to approve or decline it.</p>'
        + (p.adminUrl ? '<p><a href="' + esc(p.adminUrl) + '">Open Calendar Systems</a></p>' : '')
        + '</div>'
    };
  }
  return {
    subject: member + ' scheduled ' + Number(p.packageQuantity || 0) + ' FOB sessions',
    html: '<div style="font-family:Arial,sans-serif;color:#171717;line-height:1.55;max-width:650px">'
      + '<p style="font-size:11px;letter-spacing:.2em;color:#8b6d3f">FOB SYSTEMS · NEW PAID SCHEDULE</p>'
      + '<h1 style="font-size:22px">' + esc(member) + ' scheduled ' + Number(p.packageQuantity || 0) + ' sessions.</h1>'
      + '<p><b>Session type:</b> ' + esc(p.sessionType === 'lift_sesh' ? 'Lift Sesh (logistics to be coordinated)' : 'FOB SESH') + '<br>'
      + '<b>Preferred park:</b> ' + esc(p.parkName || 'Confirm directly')
      + (p.parkAddress ? '<br><b>Address:</b> ' + esc(p.parkAddress) : '')
      + (p.meetingInstructions ? '<br><b>Meeting point:</b> ' + esc(p.meetingInstructions) : '') + '</p>'
      + '<ol style="padding-left:22px">' + list(p.slots, p.parkName) + '</ol>'
      + '<p><b>Next step:</b> Reach out to confirm the schedule and collect the waiver.</p>'
      + '<p>Remember to bring the FOBand, with an extra FOBlock for substitution. Get excited!</p>'
      + (p.adminUrl ? '<p><a href="' + esc(p.adminUrl) + '">Open Calendar Systems</a></p>' : '')
      + '</div>'
  };
}

async function queue(type, key, memberId, payload) {
  const cleanKey = text(key, 240);
  await P.db('calendar_notifications?on_conflict=notification_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ notification_key: cleanKey, type: type, member_id: memberId || null, payload: payload || {} })
  });
  const rows = await P.db('calendar_notifications?select=*&notification_key=eq.' + encodeURIComponent(cleanKey) + '&limit=1');
  const row = rows && rows[0];
  if (row && !row.delivered_at) await deliver(row);
  return row || null;
}

async function deliver(row) {
  if (!row || row.delivered_at) return { ok:true, duplicate:true };
  const key = process.env.RESEND_API_KEY || '';
  if (!key) return { ok:false, pending:true, error:'RESEND_API_KEY is not configured' };
  const built = template(row.type, row.payload || {});
  let response, body;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{
        Authorization:'Bearer ' + key,
        'Content-Type':'application/json',
        'Idempotency-Key':text(row.notification_key, 240)
      },
      body:JSON.stringify({ from:FROM, to:[TO], subject:built.subject, html:built.html })
    });
    body = await response.text();
    if (!response.ok) throw new Error('Resend ' + response.status + ': ' + body.slice(0, 240));
    await P.db('calendar_notifications?id=eq.' + encodeURIComponent(row.id), {
      method:'PATCH', headers:{Prefer:'return=minimal'},
      body:JSON.stringify({ delivered_at:new Date().toISOString(), attempts:Number(row.attempts || 0) + 1, last_error:null, updated_at:new Date().toISOString() })
    });
    return { ok:true };
  } catch (error) {
    await P.db('calendar_notifications?id=eq.' + encodeURIComponent(row.id), {
      method:'PATCH', headers:{Prefer:'return=minimal'},
      body:JSON.stringify({ attempts:Number(row.attempts || 0) + 1, last_error:text(error && error.message, 500), updated_at:new Date().toISOString() })
    }).catch(function () {});
    return { ok:false, pending:true, error:text(error && error.message, 500) };
  }
}

async function retryPending(limit) {
  const rows = await P.db('calendar_notifications?select=*&delivered_at=is.null&attempts=lt.12&order=created_at.asc&limit=' + (Number(limit) || 25));
  let sent = 0;
  for (const row of rows || []) {
    const result = await deliver(row);
    if (result && result.ok) sent++;
  }
  return { checked:(rows || []).length, sent:sent };
}

function byId(rows) {
  const map = new Map();
  (rows || []).forEach(function (row) { if (row && row.id) map.set(String(row.id), row); });
  return map;
}
function inList(values) {
  return Array.from(new Set((values || []).filter(Boolean).map(String))).join(',');
}

/* Rebuild any missing outbox rows from the durable request/purchase records.
   The normal request path queues immediately. This hourly reconciliation
   closes the tiny failure window where the business record committed but a
   transient network/database error prevented the follow-up outbox insert. */
async function reconcilePending(baseUrl, limit) {
  const max = Math.max(1, Math.min(100, Number(limit) || 40));
  const [requests, purchasedEvents] = await Promise.all([
    P.db('calendar_change_requests?select=id,event_id,member_id,original_starts_at,proposed_starts_at,reason,status,late_fee_required,created_at'
      + '&order=created_at.desc&limit=' + max),
    P.db('member_calendar_events?select=id,purchase_id,member_id,kind,starts_at,ends_at,park_name,park_address,meeting_instructions'
      + '&purchase_id=not.is.null&source=eq.purchase&order=starts_at.asc&limit=4000')
  ]);
  const eventIds = inList((requests || []).map(function (r) { return r.event_id; }));
  const purchaseIds = inList((purchasedEvents || []).map(function (e) { return e.purchase_id; }));
  const memberIds = inList([].concat(
    (requests || []).map(function (r) { return r.member_id; }),
    (purchasedEvents || []).map(function (e) { return e.member_id; })
  ));
  const [currentEvents, purchases, members] = await Promise.all([
    eventIds ? P.db('member_calendar_events?select=id,starts_at,park_name&id=in.(' + eventIds + ')&limit=' + max) : [],
    purchaseIds ? P.db('sesh_purchases?select=id,member_id,package_quantity,stripe_payment_id&id=in.(' + purchaseIds + ')&limit=1000') : [],
    memberIds ? P.db('payment_vip_members?select=id,first_name,last_name,preferred_park&id=in.(' + memberIds + ')&limit=1000') : []
  ]);
  const eventMap = byId(currentEvents), purchaseMap = byId(purchases), memberMap = byId(members);
  let requestsQueued = 0, purchasesQueued = 0;
  for (const req of requests || []) {
    const current = eventMap.get(String(req.event_id)), member = memberMap.get(String(req.member_id));
    if (!current || !member) continue;
    await queue('schedule_change', 'calendar-change/' + req.id, req.member_id, {
      memberName:text((member.first_name || '') + ' ' + (member.last_name || ''), 160),
      currentStartsAt:req.original_starts_at || current.starts_at, proposedStartsAt:req.proposed_starts_at,
      parkName:current.park_name || member.preferred_park || '', reason:req.reason || '', lateFeeRequired:req.late_fee_required === true,
      adminUrl:String(baseUrl || 'https://fob.systems').replace(/\/$/,'') + '/calendar-admin?request=' + encodeURIComponent(req.id)
    });
    requestsQueued++;
  }
  const grouped = new Map();
  (purchasedEvents || []).forEach(function (event) {
    const id = String(event.purchase_id || '');
    if (!id) return;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(event);
  });
  for (const pair of grouped) {
    const purchase = purchaseMap.get(pair[0]), slots = pair[1];
    if (!purchase || !slots.length || !purchase.stripe_payment_id) continue;
    const member = memberMap.get(String(purchase.member_id)), first = slots[0];
    if (!member) continue;
    await queue('purchase_schedule', 'calendar-purchase/' + purchase.stripe_payment_id, purchase.member_id, {
      memberName:text((member.first_name || '') + ' ' + (member.last_name || ''), 160),
      packageQuantity:Number(purchase.package_quantity) || slots.length,
      sessionType:first.kind, parkName:first.park_name || member.preferred_park || '',
      parkAddress:first.park_address || '', meetingInstructions:first.meeting_instructions || '',
      slots:slots,
      adminUrl:String(baseUrl || 'https://fob.systems').replace(/\/$/,'') + '/calendar-admin'
    });
    purchasesQueued++;
  }
  return { requestsQueued:requestsQueued, purchasesQueued:purchasesQueued };
}

module.exports = { queue, deliver, retryPending, reconcilePending, when, template };
