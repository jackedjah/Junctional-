'use strict';
const P=require('./_payment');
const Stripe=require('./_stripe');
const MyGym=require('./mygym');
const UUID=/^[0-9a-fA-F-]{36}$/;
const H=Object.assign({'Content-Type':'application/json'},P.SEC);
const out=(code,body)=>({statusCode:code,headers:H,body:JSON.stringify(body)});
function clean(v,max){return String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max||300)}
function baseUrl(event){const h=event.headers||{},proto=clean(h['x-forwarded-proto'],10)||'https',host=clean(h['x-forwarded-host']||h.host,220)||'fob.systems';return proto+'://'+host}
async function actor(event,b){let claim=P.parseClaim(P.cookie(event.headers||{}));if(!claim&&MyGym&&typeof MyGym.memberFromRequest==='function')claim=MyGym.memberFromRequest(event,b||{});if(!claim||!UUID.test(String(claim.id||'')))return null;return P.memberWithAccess(claim.id,'id,first_name,last_name,active,sesh_left,gym_only',{fullOnly:true})}
async function lateReschedule(event,member,b){
  if(!UUID.test(String(b.requestId||'')))return out(400,{ok:false,error:'That reschedule payment is unavailable.'});
  let created=await P.db('rpc/create_late_reschedule_payment',{method:'POST',body:JSON.stringify({p_member_id:member.id,p_request_id:b.requestId})});
  let pay=Array.isArray(created)?created[0]:created;if(!pay||!UUID.test(String(pay.id||'')))throw new Error('Payment obligation was not created');
  if(pay.status==='checkout'&&pay.checkout_url&&pay.checkout_expires_at&&new Date(pay.checkout_expires_at).getTime()>Date.now()+15000){return out(200,{ok:true,url:pay.checkout_url,paymentId:pay.id,reused:true})}
  if(pay.status==='checkout'&&pay.checkout_expires_at&&new Date(pay.checkout_expires_at).getTime()<=Date.now()+15000){
    await P.db('rpc/expire_service_payment',{method:'POST',body:JSON.stringify({p_payment_id:pay.id,p_stripe_checkout_session_id:pay.stripe_checkout_session_id||''})});
    created=await P.db('rpc/create_late_reschedule_payment',{method:'POST',body:JSON.stringify({p_member_id:member.id,p_request_id:b.requestId})});pay=Array.isArray(created)?created[0]:created;
  }
  const base=baseUrl(event),expires=Math.floor(Date.now()/1000)+1800;
  const session=await Stripe.createCheckout({amountCents:1200,currency:'usd',name:'MAHFITT late reschedule',description:'Coach-approved late reschedule fee',
    successUrl:base+'/calendar?servicePayment=success',cancelUrl:base+'/calendar?servicePayment=cancelled',clientReferenceId:pay.id,
    paymentId:pay.id,purpose:'late_reschedule',memberId:member.id,referenceId:b.requestId,expiresAt:expires});
  if(!session||!session.id||!session.url)throw new Error('Stripe Checkout did not return a session');
  const attached=await P.db('rpc/attach_service_payment_checkout',{method:'POST',body:JSON.stringify({p_payment_id:pay.id,p_stripe_checkout_session_id:session.id,p_checkout_url:session.url,p_expires_at:new Date(expires*1000).toISOString(),p_amount_total:1200})});
  pay=Array.isArray(attached)?attached[0]:attached;
  return out(200,{ok:true,url:session.url,paymentId:pay&&pay.id||pay,purpose:'late_reschedule'});
}

async function themeCuration(event,member,b){
  if(!String(process.env.STRIPE_SECRET_KEY||'').trim())return out(503,{ok:false,setupRequired:true,error:'Theme Curation checkout needs STRIPE_SECRET_KEY in Netlify before first use.'});
  /* A cancelled Stripe browser visit leaves the Checkout Session open until it
     expires. Reuse that exact server-priced obligation instead of trapping the
     member behind the one-open-order guard or creating a second request. */
  const openRows=await P.db('theme_curation_requests?select=id,status,song_count,amount_cents,service_payment_id&member_id=eq.'+encodeURIComponent(member.id)+'&status=eq.pending_payment&order=created_at.desc&limit=1');
  const openReq=openRows&&openRows[0];
  if(openReq&&UUID.test(String(openReq.service_payment_id||''))){
    const payRows=await P.db('service_payments?select=*&id=eq.'+encodeURIComponent(openReq.service_payment_id)+'&member_id=eq.'+encodeURIComponent(member.id)+'&limit=1'),existing=payRows&&payRows[0];
    if(existing&&existing.status==='checkout'&&existing.checkout_url&&existing.checkout_expires_at&&new Date(existing.checkout_expires_at).getTime()>Date.now()+15000){
      return out(200,{ok:true,url:existing.checkout_url,paymentId:existing.id,requestId:openReq.id,purpose:'theme_curation',songCount:Number(openReq.song_count)||0,amountCents:Number(openReq.amount_cents)||0,reused:true});
    }
    if(existing&&['created','checkout'].includes(existing.status)){
      await P.db('rpc/expire_service_payment',{method:'POST',body:JSON.stringify({p_payment_id:existing.id,p_stripe_checkout_session_id:existing.stripe_checkout_session_id||''})});
    }
  }
  const count=Number(b.songCount);if(!Number.isInteger(count)||count<1||count>20)return out(400,{ok:false,error:'Choose 1 to 20 songs.'});
  const artists=clean(b.favoriteArtists,1200),songs=clean(b.favoriteSongs,1200),vibe=clean(b.vibe,800),motivation=clean(b.motivation,800);
  if(!artists&&!songs)return out(400,{ok:false,error:'Add at least a favorite artist or favorite song.'});
  if(!vibe)return out(400,{ok:false,error:'Describe the vibe you want.'});
  if(!motivation)return out(400,{ok:false,error:'Tell Jah what the music should make training feel like.'});
  let result=await P.db('rpc/create_theme_curation_order',{method:'POST',body:JSON.stringify({p_member_id:member.id,p_song_count:count,p_favorite_artists:artists,p_favorite_songs:songs,p_vibe:vibe,p_motivation:motivation})});
  result=Array.isArray(result)?result[0]:result;const req=result&&result.request,pay=result&&result.payment;
  if(!req||!pay||!UUID.test(String(req.id||''))||!UUID.test(String(pay.id||'')))throw new Error('Theme Curation order was not created');
  const amount=count*80,base=baseUrl(event),expires=Math.floor(Date.now()/1000)+1800;
  try{
    const session=await Stripe.createCheckout({amountCents:amount,currency:'usd',name:'MAHFITT Theme Curation · '+count+' song'+(count===1?'':'s'),
      description:'Private coach-curated training music · delivery target 2–3 days',successUrl:base+'/mygym?entry=meals&curationPayment=success',cancelUrl:base+'/mygym?entry=meals&curationPayment=cancelled',
      clientReferenceId:pay.id,paymentId:pay.id,purpose:'theme_curation',memberId:member.id,referenceId:req.id,expiresAt:expires});
    if(!session||!session.id||!session.url)throw new Error('Stripe Checkout did not return a session');
    await P.db('rpc/attach_service_payment_checkout',{method:'POST',body:JSON.stringify({p_payment_id:pay.id,p_stripe_checkout_session_id:session.id,p_checkout_url:session.url,p_expires_at:new Date(expires*1000).toISOString(),p_amount_total:amount})});
    return out(200,{ok:true,url:session.url,paymentId:pay.id,requestId:req.id,purpose:'theme_curation',songCount:count,amountCents:amount});
  }catch(e){
    await P.db('rpc/expire_service_payment',{method:'POST',body:JSON.stringify({p_payment_id:pay.id,p_stripe_checkout_session_id:''})}).catch(function(){});
    throw e;
  }
}

exports.handler=async function(event){
  if(event.httpMethod!=='POST')return out(405,{ok:false,error:'Method not allowed.'});
  let b={};try{b=JSON.parse(event.body||'{}')}catch(_e){return out(400,{ok:false,error:'Could not read that payment request.'})}
  try{
    const member=await actor(event,b);if(!member)return out(401,{ok:false,locked:true,error:'Member access is locked. Sign in again.'});
    if(String(b.action||'')==='lateReschedule')return await lateReschedule(event,member,b);
    if(String(b.action||'')==='themeCuration')return await themeCuration(event,member,b);
    return out(400,{ok:false,error:'Unknown service payment.'});
  }catch(e){
    const detail=JSON.stringify(e&&e.detail||e&&e.message||'');
    if(e&&e.code==='STRIPE_NOT_CONFIGURED')return out(503,{ok:false,setupRequired:true,error:'Service payments need STRIPE_SECRET_KEY in Netlify before first use.'});
    if(/043_theme_curation|theme_curation_requests|create_theme_curation_order/i.test(detail))return out(503,{ok:false,setupRequired:true,error:'Theme Curation needs Supabase migration 043 before first use.'});
    if(/042_service_payments|service_payments|create_late_reschedule_payment|schema cache|does not exist/i.test(detail))return out(503,{ok:false,setupRequired:true,error:'Service payments need Supabase migration 042 before first use.'});
    if(/active Theme Curation request/i.test(detail))return out(409,{ok:false,error:'You already have a Theme Curation request in progress.'});
    if(/unavailable|no longer payable/i.test(detail))return out(409,{ok:false,error:'That payment is no longer available. Refresh and try again.'});
    console.error('service-checkout',e&&e.message,e&&e.detail);return out(500,{ok:false,error:'Payment could not be opened right now.'});
  }
};
exports._test={baseUrl};
