/* FOB SESH Stripe fulfillment.
   A signed Stripe event reserves its one-use checkout ticket, then one atomic
   database transaction records the Checkout Session exactly once and adds
   the pack to the current balance. The browser never chooses a member id or
   quantity. */
'use strict';
const crypto=require('crypto');
const P=require('./_payment');
const Stripe=require('./_stripe');
const MC=require('./_member-community');
const Mail=require('./_calendar-email');

const H={'Content-Type':'application/json','Cache-Control':'no-store'};
const ok=b=>({statusCode:200,headers:H,body:JSON.stringify(b||{received:true})});
const bad=(code,message)=>({statusCode:code,headers:H,body:JSON.stringify({error:message})});

function verify(raw,header,secret){
  if(!secret||!header)return false;
  let stamp='';const signatures=[];
  String(header).split(',').forEach(function(pair){
    const i=pair.indexOf('=');if(i<1)return;
    const key=pair.slice(0,i).trim(),value=pair.slice(i+1).trim();
    if(key==='t')stamp=value;if(key==='v1')signatures.push(value);
  });
  const age=Math.abs(Math.floor(Date.now()/1000)-Number(stamp));
  if(!stamp||!signatures.length||!Number.isFinite(age)||age>300)return false;
  const expected=crypto.createHmac('sha256',secret).update(stamp+'.'+raw).digest('hex');
  return signatures.some(function(sig){
    const a=Buffer.from(expected),b=Buffer.from(sig);
    return a.length===b.length&&crypto.timingSafeEqual(a,b);
  });
}

function baseUrl(event){
  const h=event.headers||{};
  const proto=String(h['x-forwarded-proto']||'https').replace(/[^a-z]/gi,'')||'https';
  const host=String(h['x-forwarded-host']||h.host||'fob.systems').replace(/[\u0000-\u001f\s]/g,'').slice(0,220)||'fob.systems';
  return proto+'://'+host;
}

async function queuePurchaseSchedule(event,session){
  const paymentId=String(session&&session.id||'');
  if(!paymentId)return;
  const purchases=await P.db('sesh_purchases?select=id,member_id,package_quantity&stripe_payment_id=eq.'
    +encodeURIComponent(paymentId)+'&limit=1');
  const purchase=purchases&&purchases[0];
  if(!purchase)return;
  const [members,events]=await Promise.all([
    P.db('payment_vip_members?select=id,first_name,last_name,preferred_park&id=eq.'+encodeURIComponent(purchase.member_id)+'&limit=1'),
    P.db('member_calendar_events?select=starts_at,ends_at,kind,park_name,park_address,meeting_instructions&purchase_id=eq.'
      +encodeURIComponent(purchase.id)+'&status=eq.scheduled&order=starts_at.asc&limit=100')
  ]);
  const member=members&&members[0],first=events&&events[0];
  if(!member||!first)return;
  await Mail.queue('purchase_schedule','calendar-purchase/'+paymentId,purchase.member_id,{
    memberName:String(member.first_name||'')+' '+String(member.last_name||''),
    packageQuantity:Number(purchase.package_quantity)||events.length,
    sessionType:first.kind,parkName:first.park_name||member.preferred_park||'',
    parkAddress:first.park_address||'',meetingInstructions:first.meeting_instructions||'',slots:events,
    adminUrl:baseUrl(event)+'/calendar-admin'
  });
 }

async function ensureMessageThread(memberId){
  let rows=await P.db('member_message_threads?select=id&member_id=eq.'+encodeURIComponent(memberId)+'&limit=1');
  if(rows&&rows[0])return rows[0];
  try{rows=await P.db('member_message_threads',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({member_id:memberId})});if(rows&&rows[0])return rows[0]}catch(e){if(!(e&&Number(e.status)===409))throw e}
  rows=await P.db('member_message_threads?select=id&member_id=eq.'+encodeURIComponent(memberId)+'&limit=1');
  return rows&&rows[0]||null;
}
async function notifyLateReschedulePaid(data){
  if(!data||!data.member_id||!data.request_id)return;
  try{
    const thread=await ensureMessageThread(data.member_id);if(!thread)return;
    const rows=await P.db('member_messages?select=id,metadata&member_id=eq.'+encodeURIComponent(data.member_id)+'&request_type=eq.reschedule&order=created_at.desc&limit=100');
    const linked=(rows||[]).find(r=>r&&r.metadata&&String(r.metadata.calendarRequestId||'')===String(data.request_id));
    if(linked)await P.db('member_messages?id=eq.'+encodeURIComponent(linked.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({request_status:'approved',updated_at:new Date().toISOString()})});
    const msgs=await P.db('member_messages',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({thread_id:thread.id,member_id:data.member_id,sender_role:'system',message_type:'system',body:'$12 late-reschedule payment confirmed. Your calendar has now moved to the approved session time.',metadata:{requestType:'reschedule',calendarRequestId:data.request_id,status:'approved',paid:true}})});
    const msg=msgs&&msgs[0];if(msg)await P.db('member_message_notifications',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({member_id:data.member_id,message_id:msg.id,audience:'member',kind:'request_update',payload:{requestType:'reschedule',calendarRequestId:data.request_id,status:'approved',paid:true}})});
  }catch(e){console.warn('stripe-webhook: paid reschedule message sync will retry via visible calendar state',e&&e.message)}
}
async function notifyLateRescheduleRefunded(data){
  if(!data||!data.member_id||!data.request_id)return;
  const thread=await ensureMessageThread(data.member_id);if(!thread)return;
  const rows=await P.db('member_messages?select=id,metadata&member_id=eq.'+encodeURIComponent(data.member_id)+'&request_type=eq.reschedule&order=created_at.desc&limit=100');
  const linked=(rows||[]).find(r=>r&&r.metadata&&String(r.metadata.calendarRequestId||'')===String(data.request_id));
  if(linked)await P.db('member_messages?id=eq.'+encodeURIComponent(linked.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({request_status:'declined',updated_at:new Date().toISOString()})});
  const msgs=await P.db('member_messages',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({thread_id:thread.id,member_id:data.member_id,sender_role:'system',message_type:'system',body:'Your $12 late-reschedule payment was automatically refunded because the approved new time became unavailable before payment finalized. Your original session has not moved.',metadata:{requestType:'reschedule',calendarRequestId:data.request_id,status:'refunded',refundId:data.refund_id||''}})});
  const msg=msgs&&msgs[0];if(msg)await P.db('member_message_notifications',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({member_id:data.member_id,message_id:msg.id,audience:'member',kind:'request_update',payload:{requestType:'reschedule',calendarRequestId:data.request_id,status:'refunded'}})});
}

async function notifyThemeCurationPlaced(data){
  if(!data||!data.member_id||!data.request_id)return;
  const thread=await ensureMessageThread(data.member_id);if(!thread)throw new Error('Theme Curation message thread unavailable');
  const linked=await P.db('member_messages?select=id,metadata&member_id=eq.'+encodeURIComponent(data.member_id)+'&request_type=eq.theme_curation&order=created_at.desc&limit=100');
  if((linked||[]).some(function(row){return row&&row.metadata&&String(row.metadata.themeCurationRequestId||'')===String(data.request_id)}))return;
  const copy='Theme Curation placed and paid · '+Number(data.song_count||0)+' song'+(Number(data.song_count||0)===1?'':'s')+' · delivery target 2–3 days. Vibe: '+String(data.vibe||'').slice(0,500)+' · Motivation: '+String(data.motivation||'').slice(0,500);
  const msgs=await P.db('member_messages',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({thread_id:thread.id,member_id:data.member_id,sender_role:'member',message_type:'support_request',request_type:'theme_curation',request_status:'pending',body:copy.slice(0,2000),metadata:{themeCurationRequestId:data.request_id,songCount:Number(data.song_count)||0,amountCents:Number(data.amount_cents)||0,favoriteArtists:String(data.favorite_artists||''),favoriteSongs:String(data.favorite_songs||''),vibe:String(data.vibe||''),motivation:String(data.motivation||''),deliveryTarget:'2–3 days',paid:true}})});
  const msg=msgs&&msgs[0];if(!msg)throw new Error('Theme Curation placement message was not saved');
  await P.db('member_message_notifications',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({member_id:data.member_id,message_id:msg.id,audience:'coach',kind:'support_request',payload:{requestType:'theme_curation',themeCurationRequestId:data.request_id,paid:true}})});
}

async function servicePaymentEvent(type,session){
  const meta=session&&session.metadata||{},paymentId=String(meta.fob_service_payment_id||session.client_reference_id||'').trim();
  if(!/^[0-9a-fA-F-]{36}$/.test(paymentId))throw new Error('Service payment reference is missing');
  if(type==='checkout.session.expired'){
    await P.db('rpc/expire_service_payment',{method:'POST',body:JSON.stringify({p_payment_id:paymentId,p_stripe_checkout_session_id:String(session.id||'')})});
    return {received:true,expired:true};
  }
  const amount=Number.isFinite(Number(session.amount_total))?Number(session.amount_total):null;
  const payments=await P.db('service_payments?select=id,purpose,member_id,reference_id,amount_cents,status&id=eq.'+encodeURIComponent(paymentId)+'&limit=1');
  const payment=payments&&payments[0];if(!payment)throw new Error('Service payment was not found');
  await P.db('rpc/attach_service_payment_checkout',{method:'POST',body:JSON.stringify({p_payment_id:paymentId,p_stripe_checkout_session_id:String(session.id||''),p_checkout_url:String(session.url||''),p_expires_at:session.expires_at?new Date(Number(session.expires_at)*1000).toISOString():null,p_amount_total:amount})});
  if(session.payment_status!=='paid')return {received:true,pending:true,service:true};
  if(payment.purpose==='late_reschedule'){
    try{
      const result=await P.db('rpc/fulfill_late_reschedule_payment',{method:'POST',body:JSON.stringify({p_payment_id:paymentId,p_stripe_checkout_session_id:String(session.id||''),p_stripe_payment_intent_id:String(session.payment_intent||''),p_amount_total:amount})});
      const data=Array.isArray(result)?result[0]:result;await notifyLateReschedulePaid(data);return Object.assign({received:true,service:true},data||{});
    }catch(e){
      const msg=String(e&&e.detail||e&&e.message||'');
      const deterministic=/opening (?:is no longer available|conflicts|is being held|overlaps)|Original session (?:changed|is no longer available)/i.test(msg);
      const intent=String(session.payment_intent||'');
      if(!deterministic||!intent)throw e;
      const refund=await Stripe.refundPaymentIntent(intent,1200,'mahfitt-late-refund-'+paymentId);
      const result=await P.db('rpc/refund_late_reschedule_payment',{method:'POST',body:JSON.stringify({p_payment_id:paymentId,p_stripe_checkout_session_id:String(session.id||''),p_stripe_payment_intent_id:intent,p_stripe_refund_id:String(refund&&refund.id||'')})});
      const data=Array.isArray(result)?result[0]:result;await notifyLateRescheduleRefunded(data);return Object.assign({received:true,service:true,refunded:true},data||{});
    }
  }
  if(payment.purpose==='theme_curation'){
    const result=await P.db('rpc/fulfill_theme_curation_payment',{method:'POST',body:JSON.stringify({p_payment_id:paymentId,p_stripe_checkout_session_id:String(session.id||''),p_stripe_payment_intent_id:String(session.payment_intent||''),p_amount_total:amount})});
    const data=Array.isArray(result)?result[0]:result;await notifyThemeCurationPlaced(data);return Object.assign({received:true,service:true},data||{});
  }
  throw new Error('Unsupported service payment purpose');
}

exports.handler=async function(event){
  if(event.httpMethod!=='POST')return bad(405,'Method not allowed.');
  const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString('utf8'):(event.body||'');
  const headers=event.headers||{};
  const signature=headers['stripe-signature']||headers['Stripe-Signature'];
  if(!verify(raw,signature,process.env.STRIPE_WEBHOOK_SECRET||''))return bad(400,'Signature check failed.');
  let stripeEvent;try{stripeEvent=JSON.parse(raw)}catch(e){return bad(400,'Unreadable event.');}
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired'].includes(stripeEvent.type))return ok();
  const session=stripeEvent.data&&stripeEvent.data.object||{};
  const serviceMeta=session&&session.metadata||{};
  if(serviceMeta.fob_payment_kind==='service'){
    try{return ok(await servicePaymentEvent(stripeEvent.type,session))}
    catch(e){console.error('stripe-webhook: service fulfillment failed',e&&e.message,e&&e.detail);return bad(500,'Service payment fulfillment is waiting to retry.')}
  }
  if(stripeEvent.type==='checkout.session.expired')return ok();
  const checkoutTicket=String(session.client_reference_id||'').trim();
  if(!/^[0-9a-fA-F-]{36}$/.test(checkoutTicket)){
    console.error('stripe-webhook: session has no valid checkout ticket',session.id);
    return bad(422,'Paid session is missing its secure checkout reference.');
  }
  try{
    /* Reserve the one-use ticket to this Stripe Checkout Session even when an
       asynchronous payment is still pending. Stripe webhooks are not ordered,
       so the same idempotent reservation also runs on async success. */
    await P.db('rpc/reserve_member_checkout_ticket',{
      method:'POST',body:JSON.stringify({
        p_ticket_id:checkoutTicket,
        p_stripe_payment_id:String(session.id||''),
        p_amount_total:Number.isFinite(Number(session.amount_total))?Number(session.amount_total):null
      })
    });
    if(session.payment_status!=='paid')return ok({received:true,pending:true});
    const result=await P.db('rpc/credit_member_session_pack',{
      method:'POST',body:JSON.stringify({
        p_checkout_ticket:checkoutTicket,
        p_stripe_price_id:null,
        p_stripe_payment_id:String(session.id||'')
      })
    });
    const data=Array.isArray(result)?result[0]:result;
    if(data&&data.credited){
      try{
        const memberId=String(data.member_id||'');
        const memberRows=await P.db('payment_vip_members?select=id,first_name,last_name,active,sesh_left&id=eq.'+encodeURIComponent(memberId)+'&limit=1');
        if(memberRows&&memberRows[0])await MC.syncAccess(memberRows[0]);
      }catch(e){console.warn('stripe-webhook: Forum access sync will retry on the next coach edit',e&&e.message);}
    }
    if(data&&data.member_id){
      try{await queuePurchaseSchedule(event,session)}
      catch(e){console.warn('stripe-webhook: purchase schedule email is queued for retry',e&&e.message);}
    }
    return ok(Object.assign({received:true},data||{}));
  }catch(e){
    console.error('stripe-webhook: fulfillment failed',e&&e.message,e&&e.detail);
    /* Stripe retries non-2xx responses. Never acknowledge a paid event that
       failed before the atomic credit transaction committed. */
    return bad(500,'Purchase credit is waiting to retry.');
  }
};

exports._test={verify,baseUrl,servicePaymentEvent};
