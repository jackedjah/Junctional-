'use strict';
const P=require('./_payment');
const crypto=require('crypto');
const G=require('./_group-passwords');
const GATE=require('./_group-gate');
const GROUP_COOKIE='fob_group_access';
const GROUP_MINUTES=30;

function safeEq(a,b){
  const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));
  if(aa.length!==bb.length)return false;
  return crypto.timingSafeEqual(aa,bb);
}
function secret(){return process.env.SESSION_SECRET||''}
function sign(v){return crypto.createHmac('sha256',secret()).update(v).digest('hex')}
function groupToken(cohort,memberId){
  const payload=Buffer.from(JSON.stringify({cohort,memberId,exp:Date.now()+GROUP_MINUTES*60000})).toString('base64url');
  return payload+'.'+sign(payload);
}
function setGroupCookie(token){
  const bits=[GROUP_COOKIE+'='+token,'HttpOnly','Path=/','SameSite=Strict','Max-Age='+(GROUP_MINUTES*60)];
  if((process.env.CONTEXT||'production')==='production')bits.push('Secure');
  return bits.join('; ');
}
exports.handler=async function(event){
  const H=Object.assign({'Content-Type':'application/json'},P.SEC);
  if(event.httpMethod!=='POST')return{statusCode:405,headers:H,body:JSON.stringify({ok:false,error:'Method not allowed.'})};
  const claim=P.parseClaim(P.cookie(event.headers||{}));
  if(!claim)return{statusCode:401,headers:H,body:JSON.stringify({ok:false,error:'Member access expired. Re-enter through FOB SESH Access.'})};
  /* Gate first, before any cohort or password work, so a closed feature
     cannot be used to probe which cohorts exist or whether a password
     was close. See _group-gate.js for the one switch that opens it. */
  if(!(await GATE.allowsClaimId(claim.id)))return GATE.deny(H);
  let b={};try{b=JSON.parse(event.body||'{}')}catch(e){}
  const cohort=String(b.cohort||'').toLowerCase(),weekly=G.passwords(),expected=weekly[cohort];
  if(!expected)return{statusCode:400,headers:H,body:JSON.stringify({ok:false,error:'Choose a valid cohort.'})};
  if(!safeEq(b.password,expected))return{statusCode:403,headers:H,body:JSON.stringify({ok:false,error:'That password does not match this cohort.'})};
  if(!secret())return{statusCode:500,headers:H,body:JSON.stringify({ok:false,error:'Group access is not configured.'})};
  H['Set-Cookie']=setGroupCookie(groupToken(cohort,claim.id));
  return{statusCode:200,headers:H,body:JSON.stringify({ok:true,cohort,week:weekly.week})};
};
