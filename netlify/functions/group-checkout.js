'use strict';
const P=require('./_payment');
const GATE=require('./_group-gate');
const crypto=require('crypto');
const GROUP_COOKIE='fob_group_access';
const LINKS={sat:'FOB_GROUP_PAYMENT_SAT',mon:'FOB_GROUP_PAYMENT_MON',wed:'FOB_GROUP_PAYMENT_WED'};
function secret(){return process.env.SESSION_SECRET||''}
function sign(v){return crypto.createHmac('sha256',secret()).update(v).digest('hex')}
function rawCookie(headers,name){
  const raw=(headers&&(headers.cookie||headers.Cookie))||'';
  const f=raw.split(';').map(s=>s.trim()).find(s=>s.indexOf(name+'=')===0);
  return f?f.slice(name.length+1):'';
}
function parse(token){
  if(!token||!secret())return null;
  const p=String(token).split('.');if(p.length!==2)return null;
  const a=Buffer.from(p[1]),b=Buffer.from(sign(p[0]));if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  try{const j=JSON.parse(Buffer.from(p[0],'base64url').toString('utf8'));return j.exp>Date.now()?j:null}catch(e){return null}
}
exports.handler=async function(event){
  const H=Object.assign({'Content-Type':'application/json'},P.SEC);
  if(event.httpMethod!=='POST')return{statusCode:405,headers:H,body:JSON.stringify({ok:false,error:'Method not allowed.'})};
  const claim=P.parseClaim(P.cookie(event.headers||{}));
  if(!claim)return{statusCode:401,headers:H,body:JSON.stringify({ok:false,error:'Member access expired. Re-enter through FOB SESH Access.'})};
  /* Gate before the cookie check, so a gated member always gets the same
     comingSoon refusal rather than a message that depends on whether they
     happen to hold a group cookie. Also stops a cookie minted before the
     feature closed from still buying a spot. */
  if(!(await GATE.allowsClaimId(claim.id)))return GATE.deny(H);
  const group=parse(rawCookie(event.headers||{},GROUP_COOKIE));
  if(!group||group.memberId!==claim.id)return{statusCode:401,headers:H,body:JSON.stringify({ok:false,error:'Group access expired. Unlock your cohort again.'})};
  let b={};try{b=JSON.parse(event.body||'{}')}catch(e){}
  const cohort=String(b.cohort||'').toLowerCase();
  if(!LINKS[cohort]||group.cohort!==cohort)return{statusCode:403,headers:H,body:JSON.stringify({ok:false,error:'This cohort is not unlocked.'})};
  /* One $60 spot, same link for every cohort. A per-cohort env var still
   wins if one is set, so a single cohort can be pointed elsewhere
   without touching this file. */
  const GROUP_SPOT='https://buy.stripe.com/bJe4gy8Y70H37l16FG7IY05';
  const url=String(process.env[LINKS[cohort]]||process.env.FOB_GROUP_PAYMENT||GROUP_SPOT||'').trim();
  if(!/^https:\/\//i.test(url))return{statusCode:503,headers:H,body:JSON.stringify({ok:false,error:'Payment for this cohort has not been connected yet.'})};
  return{statusCode:200,headers:H,body:JSON.stringify({ok:true,url})};
};
