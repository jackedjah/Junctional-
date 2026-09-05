'use strict';
const crypto=require('crypto');
const CLAIM_COOKIE='fob_claim';
const CLAIM_HOURS=4;
const SUPABASE_URL=process.env.SUPABASE_URL||'https://hdyuolirdxnggmnpbhag.supabase.co';
function serviceKey(){return process.env.SUPABASE_SERVICE_ROLE_KEY||''}
function normalize(v){return String(v||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US')}
function headers(){return {'apikey':serviceKey(),'Authorization':'Bearer '+serviceKey(),'Content-Type':'application/json'}}
async function db(path,opts){
  if(!serviceKey()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  const extra=opts||{}; const merged=Object.assign({},headers(),extra.headers||{}); const config=Object.assign({},extra,{headers:merged});
  const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,config);
  const text=await r.text(); let body=null; try{body=text?JSON.parse(text):null}catch(e){body=text}
  if(!r.ok){const err=new Error('Database request failed');err.status=r.status;err.detail=body;throw err}
  return body;
}
function secret(){return process.env.SESSION_SECRET||''}
function sign(s){return crypto.createHmac('sha256',secret()).update(s).digest('hex')}
function createClaim(member){
  const payload=Buffer.from(JSON.stringify({id:member.id,exp:Date.now()+CLAIM_HOURS*3600000})).toString('base64url');
  return payload+'.'+sign(payload)
}
function parseClaim(token){
  if(!token||!secret()) return null;
  const p=String(token).split('.'); if(p.length!==2)return null;
  const a=Buffer.from(p[1]),b=Buffer.from(sign(p[0])); if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  try{const j=JSON.parse(Buffer.from(p[0],'base64url').toString('utf8'));return j.exp>Date.now()?j:null}catch(e){return null}
}
function cookie(headersIn){
  const raw=(headersIn&& (headersIn.cookie||headersIn.Cookie))||'';
  const f=raw.split(';').map(s=>s.trim()).find(s=>s.indexOf(CLAIM_COOKIE+'=')===0);
  return f?f.slice(CLAIM_COOKIE.length+1):''
}
function setCookie(token){
  const bits=[CLAIM_COOKIE+'='+token,'HttpOnly','Path=/','SameSite=Strict','Max-Age='+(CLAIM_HOURS*3600)];
  if((process.env.CONTEXT||'production')==='production')bits.push('Secure');
  return bits.join('; ')
}
function clearCookie(){
  const bits=[CLAIM_COOKIE+'=','HttpOnly','Path=/','SameSite=Strict','Max-Age=0'];
  if((process.env.CONTEXT||'production')==='production')bits.push('Secure');
  return bits.join('; ')
}
/* One entitlement rule for every member-facing surface. A signed cookie or
   token proves identity only; this fresh ledger read decides whether that
   identity is still allowed in. Keeping the balance check here means an
   already-open tab is revoked on its very next API request after the coach
   changes Sessions left to zero. */
function hasSessionAccess(member){
  return !!member&&member.active!==false&&Number.isFinite(Number(member.sesh_left))&&Number(member.sesh_left)>0;
}
async function memberWithAccess(id,select,options){
  const memberId=String(id||'').trim();
  if(!/^[0-9a-fA-F-]{36}$/.test(memberId))return null;
  const fields=String(select||'id,first_name,last_name,sesh,sesh_left,active,gym_only,location_rate')
    .replace(/[^a-zA-Z0-9_,*]/g,'');
  const fullOnly=options&&options.fullOnly===true?'&gym_only=eq.false':'';
  const rows=await db('payment_vip_members?select='+fields+'&id=eq.'+encodeURIComponent(memberId)
    +'&active=eq.true&sesh_left=gt.0'+fullOnly+'&limit=1');
  return rows&&hasSessionAccess(rows[0])?rows[0]:null;
}
const SEC={'X-Robots-Tag':'noindex, nofollow, noarchive','Cache-Control':'no-store, no-cache, must-revalidate, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
module.exports={db,normalize,createClaim,parseClaim,cookie,setCookie,clearCookie,hasSessionAccess,memberWithAccess,SEC};
