'use strict';
/* Apple Shortcuts writes DAILY SUMMARIES here. This endpoint intentionally has
   no cookie auth, no GET data surface, no CORS dependency and no response that
   echoes private health values. */
const P=require('./_payment');
const H=require('./_health-sync');
const HEADERS=Object.assign({},P.SEC,{'Content-Type':'application/json','X-MAHFITT-Health-Schema':'1'});
const out=(statusCode,body)=>({statusCode,headers:HEADERS,body:JSON.stringify(body)});

exports.handler=async function(event){
  if(event.httpMethod!=='POST')return out(405,{ok:false,error:'POST required.'});
  if(H.bodyTooLarge(event))return out(413,{ok:false,error:'Health sync payload is too large.'});
  let body;try{body=JSON.parse(event.body||'{}')}catch(e){return out(400,{ok:false,error:'Invalid JSON.'})}
  try{
    const auth=await H.verifyEvent(event);
    if(auth&&auth.rateLimited)return out(429,{ok:false,error:'Too many health sync requests. Try again later.'});
    if(!auth)return out(401,{ok:false,error:'Health sync key is not valid.'});
    const payload=H.sanitizeSyncPayload(body,new Date());
    const accepted=await H.saveDays(auth.memberId,auth.tokenId,payload);
    /* Do not echo metrics. Shortcuts only needs an acknowledgement. */
    return out(200,{ok:true,accepted,schemaVersion:1});
  }catch(error){
    if(H.schemaMissing(error))return out(503,{ok:false,error:'MAHFITT Health needs database migration 044.'});
    if(H.credentialRevoked(error))return out(401,{ok:false,error:'Health sync key is not valid.'});
    if(error&&error.status)return out(error.status,{ok:false,error:error.message||'Bad health sync payload.'});
    console.error('mahfitt health sync',error&&error.message||'unknown error');
    return out(500,{ok:false,error:'Health sync is unavailable right now.'});
  }
};
