'use strict';
function secret(){return String(process.env.STRIPE_SECRET_KEY||'').trim()}
async function request(path,params,method,extraHeaders){
  if(!secret())throw Object.assign(new Error('STRIPE_SECRET_KEY is not configured'),{code:'STRIPE_NOT_CONFIGURED'});
  const body=new URLSearchParams();Object.keys(params||{}).forEach(function(k){const v=params[k];if(v!==undefined&&v!==null&&v!=='')body.append(k,String(v))});
  const r=await fetch('https://api.stripe.com/v1/'+String(path||'').replace(/^\//,''),{
    method:method||'POST',headers:Object.assign({Authorization:'Bearer '+secret(),'Content-Type':'application/x-www-form-urlencoded'},extraHeaders||{}),body:body.toString()
  });
  const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch(_e){data={error:{message:text||'Stripe request failed'}}}
  if(!r.ok){const e=new Error(data&&data.error&&data.error.message||'Stripe request failed');e.status=r.status;e.detail=data;throw e}
  return data;
}
async function createCheckout(opts){
  opts=opts||{};const params={
    mode:'payment',success_url:opts.successUrl,cancel_url:opts.cancelUrl,
    'line_items[0][quantity]':1,'line_items[0][price_data][currency]':opts.currency||'usd',
    'line_items[0][price_data][unit_amount]':Math.round(Number(opts.amountCents)||0),
    'line_items[0][price_data][product_data][name]':opts.name||'MAHFITT service',
    client_reference_id:opts.clientReferenceId,
    expires_at:opts.expiresAt,
    'metadata[fob_payment_kind]':'service','metadata[fob_service_payment_id]':opts.paymentId,
    'metadata[fob_service_purpose]':opts.purpose||''
  };
  if(opts.description)params['line_items[0][price_data][product_data][description]']=opts.description;
  if(opts.memberId)params['metadata[fob_member_id]']=opts.memberId;
  if(opts.referenceId)params['metadata[fob_reference_id]']=opts.referenceId;
  return request('checkout/sessions',params,'POST');
}
async function refundPaymentIntent(paymentIntent,amountCents,idempotencyKey){
  const params={payment_intent:String(paymentIntent||''),amount:Math.round(Number(amountCents)||0)};
  const headers=idempotencyKey?{'Idempotency-Key':String(idempotencyKey).slice(0,255)}:{};
  return request('refunds',params,'POST',headers);
}
module.exports={request,createCheckout,refundPaymentIntent};
