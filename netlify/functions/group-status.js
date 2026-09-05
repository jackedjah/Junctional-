'use strict';
const P=require('./_payment');
const crypto=require('crypto');
const GROUP_COOKIE='fob_group_access';
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
  if(event.httpMethod!=='GET')return{statusCode:405,headers:H,body:JSON.stringify({ok:false})};
  const claim=P.parseClaim(P.cookie(event.headers||{}));
  const group=parse(rawCookie(event.headers||{},GROUP_COOKIE));
  if(!claim||!group||group.memberId!==claim.id)return{statusCode:401,headers:H,body:JSON.stringify({ok:false})};
  const member=await P.memberWithAccess(claim.id,'id,active,sesh_left');
  if(!member)return{statusCode:403,headers:Object.assign({},H,{'Set-Cookie':P.clearCookie()}),body:JSON.stringify({ok:false,locked:true,error:'Member access is locked. Contact Jah directly.'})};
  return{statusCode:200,headers:H,body:JSON.stringify({ok:true,cohort:group.cohort})};
};
