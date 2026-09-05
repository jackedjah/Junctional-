'use strict';
const P = require('./_payment');
const MyGym = require('./mygym');
const Role = require('./_mahfitt-role-context');
const Price = require('./_sesh-pricing');
const Mail = require('./_calendar-email');

const UUID = /^[0-9a-fA-F-]{36}$/;
const COLORS = ['gold','blue','green','white','orange','purple','yellow','beige'];
const SESSION_TYPES = ['fob_sesh','lift_sesh'];
const JSON_H = Object.assign({ 'Content-Type':'application/json' }, P.SEC);
const reply = (code, body, extra) => ({ statusCode:code, headers:Object.assign({}, JSON_H, extra || {}), body:JSON.stringify(body) });

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/\s+/g,' ').trim().slice(0, max || 300);
}
function iso(value) {
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : '';
}
function fullName(member) { return clean((member.first_name || '') + ' ' + (member.last_name || ''), 160); }
function baseUrl(event) {
  const h = event.headers || {};
  const proto = clean(h['x-forwarded-proto'], 10) || 'https';
  const host = clean(h['x-forwarded-host'] || h.host, 220) || 'fob.systems';
  return proto + '://' + host;
}

async function ensureMessageThread(memberId) {
  let rows = await P.db('member_message_threads?select=id&member_id=eq.' + encodeURIComponent(memberId) + '&limit=1');
  if (rows && rows[0]) return rows[0];
  try {
    rows = await P.db('member_message_threads', { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify({ member_id:memberId }) });
    if (rows && rows[0]) return rows[0];
  } catch (error) {
    if (!(error && Number(error.status) === 409)) throw error;
  }
  rows = await P.db('member_message_threads?select=id&member_id=eq.' + encodeURIComponent(memberId) + '&limit=1');
  if (!rows || !rows[0]) throw new Error('Message thread was not created');
  return rows[0];
}
async function notifyRescheduleRequest(member, current, requestRow, reason) {
  try {
    const thread = await ensureMessageThread(member.id);
    const fee = requestRow && requestRow.late_fee_required === true;
    const body = 'Reschedule request: ' + new Date(current.starts_at).toLocaleString('en-US', { timeZone:'America/New_York', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })
      + ' → ' + new Date(requestRow.proposed_starts_at).toLocaleString('en-US', { timeZone:'America/New_York', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })
      + (fee ? '. Member accepted the $12 late-reschedule condition.' : '.')
      + (reason ? ' Reason: ' + clean(reason, 700) : '');
    const messages = await P.db('member_messages', { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify({
      thread_id:thread.id, member_id:member.id, sender_role:'member', message_type:'support_request', request_type:'reschedule', request_status:'pending',
      body:body.slice(0,2000), metadata:{ calendarRequestId:requestRow.id, eventId:current.id, originalStartsAt:current.starts_at,
        proposedStartsAt:requestRow.proposed_starts_at, lateFeeRequired:fee, lateFeeAmountCents:Number(requestRow.late_fee_amount_cents)||1200 }
    }) });
    const message = messages && messages[0];
    if (message) await P.db('member_message_notifications', { method:'POST', headers:{Prefer:'return=minimal'}, body:JSON.stringify({
      member_id:member.id, message_id:message.id, audience:'coach', kind:'support_request', payload:{ requestType:'reschedule', calendarRequestId:requestRow.id }
    }) });
  } catch (error) {
    console.error('calendar reschedule message notification', error && error.message);
  }
}
function theme(raw, memberId) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const hex = (v, fallback) => /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toUpperCase() : fallback;
  let audioUrl=/^https:\/\//i.test(String(raw.audioUrl||''))?String(raw.audioUrl).slice(0,1000):'';
  const path=String(raw.audioPath||'').trim(),prefix='member/'+String(memberId||'')+'/theme-audio/';
  if(!audioUrl&&memberId&&path.indexOf(prefix)===0&&/^[a-zA-Z0-9/_\-.]+$/.test(path)){
    const supabase=String(process.env.SUPABASE_URL||'https://hdyuolirdxnggmnpbhag.supabase.co').replace(/\/$/,'');
    audioUrl=supabase+'/storage/v1/object/public/gym-exercise-media/'+path.split('/').map(encodeURIComponent).join('/');
  }
  const atmospherePalette=Array.isArray(raw.atmospherePalette)?raw.atmospherePalette.slice(0,6).map(v=>hex(v,'')).filter(Boolean):[];
  const scene=['mesh','storm','waterfall','mountain','disco','space'].includes(String(raw.scene||'').toLowerCase())?String(raw.scene).toLowerCase():'mesh';
  return { primary:hex(raw.dark, '#0E1114'), secondary:hex(raw.accent, '#E9C98F'), scene, atmospherePalette:atmospherePalette.length>=3?atmospherePalette:[], bpm:Math.max(45, Math.min(220, Number(raw.bpm) || 120)), audioUrl };
}
async function auth(event, body) {
  let claim = P.parseClaim(P.cookie(event.headers || {}));
  if (!claim && MyGym && typeof MyGym.memberFromRequest === 'function') claim = MyGym.memberFromRequest(event, body || {});
  if (!claim || !UUID.test(String(claim.id || ''))) return null;
  const account = await P.memberWithAccess(claim.id,
    'id,first_name,last_name,sesh,sesh_left,active,gym_only,location_rate,preferred_park', { fullOnly:true });
  if(!account)return null;
  const resolved=await Role.resolve(event,account,body||{});
  if(!resolved.ok){const error=new Error(resolved.error||'That client context is not authorized.');error.status=resolved.status||403;error.code=resolved.code||'CLIENT_CONTEXT_FORBIDDEN';throw error}
  return { account:account, member:resolved.activeMember, context:resolved.context };
}
async function openData(days, options) {
  const n = Math.max(21, Math.min(190, Number(days) || 190));
  const now = new Date(), until = new Date(now.getTime() + n * 86400000);
  const opts = options || {};
  const [windows, settings, slots, parks, plans, scheduled] = await Promise.all([
    P.db('availability_windows?select=start_time,end_time,weekdays&is_active=eq.true&order=start_time.asc'),
    P.db('booking_settings?select=session_minutes,timezone,booking_open&limit=1'),
    P.db('rpc/open_slots?limit=10000', { method:'POST', body:JSON.stringify({ from_ts:now.toISOString(), days:n }) }),
    P.db('session_parks?select=id,display_name,official_name,address,meeting_instructions,is_preferred&is_active=eq.true&order=is_preferred.desc,display_name.asc&limit=1000'),
    P.db('calendar_checkout_plans?select=id,member_id,status,expires_at&status=in.(ready,checkout)'
      + '&expires_at=gt.' + encodeURIComponent(now.toISOString()) + '&limit=10000'),
    P.db('member_calendar_events?select=starts_at,ends_at&kind=in.(fob_sesh,lift_sesh)&status=eq.scheduled'
      + '&ends_at=gt.' + encodeURIComponent(now.toISOString())
      + '&starts_at=lt.' + encodeURIComponent(until.toISOString()) + '&limit=10000')
  ]);
  const blocked = (scheduled || []).map(function (row) {
    return [new Date(row.starts_at).getTime(), new Date(row.ends_at).getTime()];
  });
  const activePlans = (plans || []).filter(function (p) {
    return String(p.id) !== String(opts.allowPlanId || '')
      && !(opts.allowMemberId && String(p.member_id) === String(opts.allowMemberId) && p.status === 'ready');
  });
  if (activePlans.length) {
    const ids = activePlans.map(function (p) { return p.id; }).join(',');
    const holds = await P.db('calendar_checkout_plan_slots?select=starts_at,ends_at&plan_id=in.(' + ids + ')&limit=10000');
    (holds || []).forEach(function (row) {
      blocked.push([new Date(row.starts_at).getTime(), new Date(row.ends_at).getTime()]);
    });
  }
  const s = settings && settings[0] || {};
  const minutes = Number(s.session_minutes) || 60;
  return {
    windows:windows || [],
    settings:{ sessionMinutes:minutes, timezone:s.timezone || 'America/New_York', bookingOpen:s.booking_open !== false },
    slots:(slots || []).map(function (row) { return row.slot_start; }).filter(function (slot) {
      const start = new Date(slot).getTime(), end = start + minutes * 60000;
      return slot && !blocked.some(function (range) { return range[0] < end && range[1] > start; });
    }),
    parks:parks || []
  };
}
async function memberTheme(memberId) {
  try {
    const rows = await P.db('gym_sessions?select=body&member_id=eq.' + encodeURIComponent(memberId)
      + '&status=eq.theme&order=updated_at.desc&limit=1');
    return theme(rows && rows[0] && rows[0].body, memberId);
  } catch (error) { return theme(null, memberId); }
}
function rangeBounds(body) {
  let from = new Date(body.rangeFrom || Date.now() - 62 * 86400000);
  let to = new Date(body.rangeTo || Date.now() + 200 * 86400000);
  if (!Number.isFinite(from.getTime())) from = new Date(Date.now() - 62 * 86400000);
  if (!Number.isFinite(to.getTime())) to = new Date(Date.now() + 200 * 86400000);
  if (to <= from || to - from > 430 * 86400000) to = new Date(from.getTime() + 365 * 86400000);
  return { from:from.toISOString(), to:to.toISOString() };
}
async function boot(event, access, body) {
  const member=access.member,account=access.account,roleContext=access.context;
  const bounds = rangeBounds(body);
  const checkout = body.checkout === true || body.checkout === 'true';
  const eventPath = 'member_calendar_events?select=*&member_id=eq.' + member.id
    + '&starts_at=lt.' + encodeURIComponent(bounds.to) + '&ends_at=gt.' + encodeURIComponent(bounds.from)
    + '&order=starts_at.asc&limit=4000';
  const requestPath = 'calendar_change_requests?select=id,event_id,original_starts_at,original_ends_at,proposed_starts_at,proposed_ends_at,reason,status,late_fee_required,late_fee_amount_cents,late_fee_accepted_at,payment_status,coach_decision_at,resolved_at,created_at'
    + '&member_id=eq.' + member.id + '&order=created_at.desc&limit=200';
  const needsAvailability = checkout || body.availability === true || body.availability === 'true';
  const [events, requests, appearance, availability, musicState] = await Promise.all([
    P.db(eventPath), P.db(requestPath), memberTheme(account.id),
    needsAvailability
      ? openData(190, checkout ? { allowMemberId:member.id, allowPlanId:body.planId } : null)
      : Promise.resolve({ windows:[], slots:[], settings:{}, parks:[] }),
    /* v411: select=* stays deploy-order safe before migration 046 exists. */
    P.db('member_music_state?select=*&member_id=eq.' + account.id + '&limit=1').catch(function(){ return []; })
  ]);
  let plan = null;
  if (UUID.test(String(body.planId || ''))) {
    const plans = await P.db('calendar_checkout_plans?select=*,slots:calendar_checkout_plan_slots(starts_at,ends_at)'
      + '&id=eq.' + encodeURIComponent(body.planId) + '&member_id=eq.' + member.id + '&limit=1');
    plan = plans && plans[0] || null;
    if (plan && ['ready','checkout'].includes(plan.status) && new Date(plan.expires_at) <= new Date()) {
      await P.db('calendar_checkout_plan_slots?plan_id=eq.' + encodeURIComponent(plan.id), {
        method:'DELETE', headers:{Prefer:'return=minimal'}
      });
      await P.db('calendar_checkout_plans?id=eq.' + encodeURIComponent(plan.id) + '&member_id=eq.' + member.id, {
        method:'PATCH', headers:{Prefer:'return=minimal'},
        body:JSON.stringify({ status:'expired', updated_at:new Date().toISOString() })
      });
      plan.status = 'expired'; plan.slots = [];
    }
  }
  const park = (availability.parks || []).find(function (p) {
    return String(p.display_name || '').toLowerCase() === String(member.preferred_park || '').toLowerCase()
      || String(p.official_name || '').toLowerCase() === String(member.preferred_park || '').toLowerCase();
  }) || null;
  return reply(200, {
    ok:true,
    account:{ id:account.id, name:fullName(account) },
    member:{ id:member.id, name:fullName(member), sessionsLeft:Number(member.sesh_left) || 0,
      preferredPark:member.preferred_park || '', locationRate:Price.range(member.location_rate) },
    roleContext:roleContext,
    theme:appearance,
    music:{ masterVolume:musicState&&musicState[0]&&musicState[0].master_volume!=null?Math.max(0,Math.min(1,Number(musicState[0].master_volume)||0)):null },
    events:events || [],
    requests:requests || [],
    availability:{ windows:availability.windows, slots:availability.slots, settings:availability.settings,
      preferredPark:park, loaded:needsAvailability },
    packages:Price.publicPacks(member.location_rate),
    plan:plan
  });
}
function eventPayload(member, body, current) {
  const starts = iso(body.startsAt != null ? body.startsAt : current && current.starts_at);
  const ends = iso(body.endsAt != null ? body.endsAt : current && current.ends_at);
  if (!starts || !ends || new Date(ends) <= new Date(starts)) throw new Error('Choose a valid start and end time.');
  return {
    member_id:member.id,
    kind:'personal',
    title:clean(body.title != null ? body.title : current && current.title, 120) || 'Personal event',
    notes:clean(body.notes != null ? body.notes : current && current.notes, 1200) || null,
    starts_at:starts,
    ends_at:ends,
    all_day:body.allDay === true || body.allDay === 'true',
    color:COLORS.includes(body.color) ? body.color : (current && current.color || 'gold'),
    status:'scheduled', source:'personal', created_by:'member', updated_at:new Date().toISOString()
  };
}
async function personal(event, member, body, roleContext) {
  if (body.action === 'personalCreate') {
    const row = eventPayload(member, body, null);
    if(roleContext&&roleContext.isClientContext){row.source='coach';row.created_by='coach';}
    const rows = await P.db('member_calendar_events', { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify(row) });
    return reply(200, { ok:true, event:rows && rows[0] });
  }
  if (!UUID.test(String(body.eventId || ''))) return reply(400, { ok:false, error:'That event was not found.' });
  const path = 'member_calendar_events?select=*&id=eq.' + encodeURIComponent(body.eventId)
    + '&member_id=eq.' + member.id + '&kind=eq.personal&limit=1';
  const rows = await P.db(path), current = rows && rows[0];
  if (!current) return reply(404, { ok:false, error:'Only your own personal events can be changed here.' });
  if (body.action === 'personalDelete') {
    await P.db('member_calendar_events?id=eq.' + current.id + '&member_id=eq.' + member.id + '&kind=eq.personal', {
      method:'DELETE', headers:{Prefer:'return=minimal'}
    });
    return reply(200, { ok:true });
  }
  const row = eventPayload(member, body, current);
  delete row.member_id; delete row.kind; delete row.source; delete row.created_by;
  const saved = await P.db('member_calendar_events?id=eq.' + current.id + '&member_id=eq.' + member.id + '&kind=eq.personal', {
    method:'PATCH', headers:{Prefer:'return=representation'}, body:JSON.stringify(row)
  });
  return reply(200, { ok:true, event:saved && saved[0] });
}
async function requestChange(event, member, body) {
  if (!UUID.test(String(body.eventId || ''))) return reply(400, { ok:false, error:'That session was not found.' });
  const events = await P.db('member_calendar_events?select=*&id=eq.' + encodeURIComponent(body.eventId)
    + '&member_id=eq.' + member.id + '&kind=in.(fob_sesh,lift_sesh)&status=eq.scheduled&limit=1');
  const current = events && events[0];
  if (!current) return reply(404, { ok:false, error:'That scheduled session was not found.' });
  const proposed = iso(body.proposedStartsAt);
  if (!proposed) return reply(400, { ok:false, error:'Choose a new available time.' });
  const availability = await openData(190);
  if (!availability.slots.some(function (slot) { return new Date(slot).getTime() === new Date(proposed).getTime(); })) {
    return reply(409, { ok:false, error:'That proposed time is no longer open. Choose another.' });
  }
  const ends = new Date(new Date(proposed).getTime() + availability.settings.sessionMinutes * 60000).toISOString();
  try {
    const result = await P.db('rpc/create_calendar_change_request_v2', {
      method:'POST', body:JSON.stringify({ p_member_id:member.id, p_event_id:current.id,
        p_proposed_starts_at:proposed, p_proposed_ends_at:ends,
        p_reason:clean(body.reason, 1200) || '', p_late_fee_accepted:body.lateFeeAccepted === true })
    });
    const row = Array.isArray(result) ? result[0] : result;
    if (!row || !UUID.test(String(row.id || ''))) throw new Error('Reschedule request was not returned.');
    await notifyRescheduleRequest(member, current, row, clean(body.reason,1200));
    const payload = { memberName:fullName(member), currentStartsAt:current.starts_at,
      proposedStartsAt:proposed, parkName:current.park_name || member.preferred_park,
      reason:clean(body.reason, 1200), lateFeeRequired:row.late_fee_required === true,
      adminUrl:baseUrl(event) + '/calendar-admin?request=' + encodeURIComponent(row.id) };
    await Mail.queue('schedule_change', 'calendar-change/' + row.id, member.id, payload).catch(function (error) {
      console.error('calendar request email queued for retry', error && error.message);
    });
    return reply(200, { ok:true, request:row, lateFeeRequired:row.late_fee_required === true,
      message:row.late_fee_required === true
        ? 'Request sent. You accepted the $12 late-reschedule condition. Your original session stays active unless Jah approves and payment is completed.'
        : 'Request sent. Your original session stays active until Jah approves the change.' });
  } catch (error) {
    const detail = JSON.stringify(error && error.detail || error && error.message || '');
    if (/LATE_FEE_ACCEPTANCE_REQUIRED/i.test(detail)) return reply(409, { ok:false, lateFeeRequired:true,
      error:'This reschedule falls inside the 16-hour window. Accept the $12 late-reschedule condition before sending the request.' });
    if (/already open|duplicate|unique/i.test(detail)) return reply(409, { ok:false, error:'A reschedule request for this session is already open.' });
    if (/no longer available|conflict|held for checkout|another booking/i.test(detail)) return reply(409, { ok:false, error:'That proposed opening is no longer available. Choose another.' });
    if (/create_calendar_change_request_v2|schema cache|does not exist/i.test(detail)) return reply(503, { ok:false, setupRequired:true, error:'Reschedule v2 needs Supabase migration 041 before first use.' });
    throw error;
  }
}

async function scheduleData(member, body) {
  const availability = await openData(190, null);
  const park = (availability.parks || []).find(function (p) {
    return String(p.display_name || '').toLowerCase() === String(member.preferred_park || '').toLowerCase()
      || String(p.official_name || '').toLowerCase() === String(member.preferred_park || '').toLowerCase();
  }) || null;
  return reply(200, { ok:true,
    availability:{ windows:availability.windows, slots:availability.slots, settings:availability.settings,
      preferredPark:park, loaded:true },
    packages:Price.publicPacks(member.location_rate)
  });
}

async function abandonPlan(member, body) {
  const id = clean(body.planId, 80);
  if (!UUID.test(id)) return reply(400, { ok:false, error:'That checkout hold could not be identified.' });
  const plans = await P.db('calendar_checkout_plans?select=id,status,member_id,expires_at&id=eq.'
    + encodeURIComponent(id) + '&member_id=eq.' + member.id + '&limit=1');
  const plan = plans && plans[0];
  if (!plan) return reply(200, { ok:true, released:false, status:'missing' });
  if (!['ready','checkout'].includes(plan.status)) return reply(200, { ok:true, released:false, status:plan.status });
  if (plan.status === 'checkout') {
    const tickets = await P.db('sesh_checkout_tickets?select=id,stripe_payment_id,used_at,expires_at&calendar_plan_id=eq.'
      + encodeURIComponent(id) + '&order=created_at.desc&limit=4');
    if ((tickets || []).some(function (t) { return t && (t.stripe_payment_id || t.used_at); })) {
      return reply(200, { ok:true, released:false, status:'payment_processing' });
    }
  }
  await P.db('calendar_checkout_plan_slots?plan_id=eq.' + encodeURIComponent(id), {
    method:'DELETE', headers:{Prefer:'return=minimal'}
  });
  await P.db('calendar_checkout_plans?id=eq.' + encodeURIComponent(id) + '&member_id=eq.' + member.id, {
    method:'PATCH', headers:{Prefer:'return=minimal'},
    body:JSON.stringify({ status:'cancelled', updated_at:new Date().toISOString() })
  });
  return reply(200, { ok:true, released:true, status:'cancelled' });
}

async function createPlan(member, body) {
  /* v365: starting a new hold is an explicit replacement intent. Release any
     older checkout hold that has never received a Stripe payment reservation,
     so a closed checkout tab cannot lock this member for 24 hours. */
  try {
    const stale = await P.db('calendar_checkout_plans?select=id,status&member_id=eq.' + member.id
      + '&status=eq.checkout&expires_at=gt.' + encodeURIComponent(new Date().toISOString()) + '&order=updated_at.desc&limit=5');
    for (const plan of (stale || [])) {
      const tickets = await P.db('sesh_checkout_tickets?select=id,stripe_payment_id,used_at&calendar_plan_id=eq.'
        + encodeURIComponent(plan.id) + '&order=created_at.desc&limit=4');
      if ((tickets || []).some(function (t) { return t && (t.stripe_payment_id || t.used_at); })) continue;
      await P.db('calendar_checkout_plan_slots?plan_id=eq.' + encodeURIComponent(plan.id), {
        method:'DELETE', headers:{Prefer:'return=minimal'}
      });
      await P.db('calendar_checkout_plans?id=eq.' + encodeURIComponent(plan.id) + '&member_id=eq.' + member.id, {
        method:'PATCH', headers:{Prefer:'return=minimal'},
        body:JSON.stringify({ status:'cancelled', updated_at:new Date().toISOString() })
      });
    }
  } catch (cleanupError) {
    console.error('calendar stale checkout cleanup', cleanupError && cleanupError.message);
  }
  const quantity = Price.pack(body.pack);
  const type = SESSION_TYPES.includes(body.sessionType) ? body.sessionType : 'fob_sesh';
  const slots = Array.isArray(body.slots) ? body.slots.map(iso).filter(Boolean) : [];
  if (!quantity || slots.length !== quantity) return reply(400, { ok:false, error:'Choose one available time for every session in your pack.' });
  if (!member.preferred_park) return reply(409, { ok:false, error:'Confirm your preferred park with Jah before scheduling.' });
  try {
    const result = await P.db('rpc/create_calendar_checkout_plan', {
      method:'POST', body:JSON.stringify({ p_member_id:member.id, p_package_quantity:quantity,
        p_session_type:type, p_slots:slots })
    });
    const id = String(Array.isArray(result) ? result[0] : result || '').replace(/^"|"$/g,'');
    if (!UUID.test(id)) throw new Error('Calendar plan was not returned.');
    return reply(200, { ok:true, planId:id, pack:quantity, sessionType:type,
      priceCents:Price.cents(member.location_rate, quantity), price:Price.cents(member.location_rate, quantity) / 100,
      expiresInMinutes:120 });
  } catch (error) {
    const detail = JSON.stringify(error && error.detail || error && error.message || '');
    const friendly = /preferred park/i.test(detail) ? 'Confirm your preferred park with Jah before scheduling.'
      : /checkout is already in progress/i.test(detail) ? 'A payment checkout is already open for this member. Finish it or wait for that secure checkout to expire.'
      : /conflicts with your calendar/i.test(detail) ? 'One of those times conflicts with your calendar. Move the personal event or choose another time.'
      : /just taken|no longer available|duplicate/i.test(detail) ? 'One of those times was just taken. Refresh and choose another opening.'
      : 'That schedule could not be held. Refresh the openings and try again.';
    return reply(409, { ok:false, error:friendly });
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return reply(405, { ok:false, error:'Method not allowed.' });
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (error) { return reply(400, { ok:false, error:'Could not read that request.' }); }
  let access;
  try { access = await auth(event, body); }
  catch (error) { console.error('calendar auth', error && error.message);if(error&&error.status===403)return reply(403,{ok:false,code:error.code||'CLIENT_CONTEXT_FORBIDDEN',error:error.message}); }
  if (!access) return reply(401, { ok:false, locked:true, error:'Enter the confirmed member name attached to an active FOB membership.' });
  const member=access.member,roleContext=access.context||{};
  if(roleContext.isClientContext&&!Role.permissionAllowed(roleContext,'calendar')){const denied=Role.permissionError('calendar');return reply(denied.status,{ok:false,code:denied.code,error:denied.error});}
  try {
    const action = clean(body.action, 40);
    if (action === 'boot' || action === 'planStatus') return boot(event, access, body);
    if (['personalCreate','personalUpdate','personalDelete'].includes(action)) return personal(event, member, body, roleContext);
    if(roleContext.isClientContext&&['requestChange','scheduleData','planAbandon','planCreate'].includes(action))return reply(403,{ok:false,code:'CLIENT_MEMBER_ACTION_PROTECTED',error:'Member booking and reschedule requests must be sent by the member. Coach Mode can edit authorized calendar items without impersonating the client.'});
    if (action === 'requestChange') return requestChange(event, member, body);
    if (action === 'scheduleData') return scheduleData(member, body);
    if (action === 'planAbandon') return abandonPlan(member, body);
    if (action === 'planCreate') return createPlan(member, body);
    return reply(400, { ok:false, error:'Unknown calendar action.' });
  } catch (error) {
    console.error('calendar-api', body.action, error && error.message, error && error.detail);
    return reply(500, { ok:false, error:'The calendar could not finish that action. Try again.' });
  }
};

exports._test = { theme, rangeBounds, eventPayload, clean };
