'use strict';
/* MAHFITT v405 — privacy-first Apple Health / Shortcuts bridge.
   The website cannot read HealthKit directly. A user-authorized Apple Shortcut
   sends small DAILY SUMMARIES to a scoped bearer endpoint. The usable bearer
   token is derived from server secret + opaque DB metadata and is never stored
   as plaintext in Supabase. */
const crypto=require('crypto');
const P=require('./_payment');

const TOKEN_PREFIX='mhf1';
const MAX_BODY_BYTES=32768;
const MAX_DAYS_PER_SYNC=14;
const MAX_DAYS_PER_IMPORT=120;
const WARM_RATE_WINDOW_MS=60*60*1000;
const WARM_RATE_MAX=90;
const warmRate=new Map();

const METRICS=Object.freeze({
  steps:{min:0,max:250000,places:0},
  activeEnergyKcal:{min:0,max:20000,places:1},
  restingHeartRateBpm:{min:20,max:250,places:1},
  hrvMs:{min:0,max:1000,places:1},
  sleepMinutes:{min:0,max:1440,places:0},
  bodyWeightLb:{min:40,max:1000,places:1},
  vo2Max:{min:5,max:100,places:1},
  walkingRunningDistanceMi:{min:0,max:200,places:2}
});

const uuid=v=>/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(String(v||''));
function secret(){
  const base=String(process.env.HEALTH_SYNC_SECRET||process.env.SESSION_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  /* Key separation: even when MAHFITT reuses an already-required deployment
     secret as the root material, Health Sync derives its own cryptographic
     key instead of using that root secret directly. */
  return base?crypto.createHmac('sha256',base).update('mahfitt-health-sync-signing-key-v1').digest():Buffer.alloc(0)
}
function signRow(row){
  const key=secret();
  if(!row||!uuid(row.member_id)||!uuid(row.token_id)||!row.nonce||!key.length)return'';
  return crypto.createHmac('sha256',key).update('mahfitt-health-v1|'+row.member_id+'|'+row.token_id+'|'+row.nonce).digest('hex');
}

function publicToken(row){const sig=signRow(row);return sig?TOKEN_PREFIX+'.'+row.token_id+'.'+sig:''}
function parsePublicToken(value){
  const s=String(value||'').trim(),p=s.split('.');
  if(p.length!==3||p[0]!==TOKEN_PREFIX||!uuid(p[1])||!/^[0-9a-f]{64}$/i.test(p[2]))return null;
  return{tokenId:p[1].toLowerCase(),sig:p[2].toLowerCase()};
}
function bearerFromEvent(event){
  const h=event&&event.headers||{},raw=String(h.authorization||h.Authorization||'');
  const m=raw.match(/^Bearer\s+(.+)$/i);return m?m[1].trim():'';
}
function safeEqualHex(a,b){
  try{const aa=Buffer.from(String(a||''),'hex'),bb=Buffer.from(String(b||''),'hex');return aa.length===bb.length&&aa.length>0&&crypto.timingSafeEqual(aa,bb)}catch(e){return false}
}
function rateAllowed(tokenId){
  const now=Date.now(),old=warmRate.get(tokenId);
  if(!old||now-old.at>=WARM_RATE_WINDOW_MS){warmRate.set(tokenId,{at:now,n:1});return true}
  if(old.n>=WARM_RATE_MAX)return false;old.n++;return true;
}
function timezone(value){
  const z=String(value||'').trim().slice(0,64);if(!z)return'';
  try{new Intl.DateTimeFormat('en-US',{timeZone:z}).format(new Date());return z}catch(e){return''}
}
function dateOnly(value){
  const s=String(value||'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return'';
  const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?s:'';
}
function dateWithinBridgeWindow(day,now){
  const d=new Date(day+'T00:00:00Z').getTime(),n=now instanceof Date?now.getTime():Date.now();
  return d>=n-45*86400000&&d<=n+2*86400000;
}
function rounded(value,places){const p=Math.pow(10,places);return Math.round(value*p)/p}
function cleanMetric(name,value){
  const rule=METRICS[name],n=Number(value);if(!rule||!Number.isFinite(n)||n<rule.min||n>rule.max)return null;
  return rounded(n,rule.places);
}
function sanitizeMetrics(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return{};
  const out={};Object.keys(METRICS).forEach(k=>{if(!Object.prototype.hasOwnProperty.call(input,k))return;const v=cleanMetric(k,input[k]);if(v!==null)out[k]=v});return out;
}
function sanitizeSyncPayload(body,now){
  if(!body||typeof body!=='object'||Array.isArray(body))throw Object.assign(new Error('Bad sync payload.'),{status:400});
  if(Number(body.schemaVersion||1)!==1)throw Object.assign(new Error('Unsupported sync version.'),{status:400});
  const tz=timezone(body.timeZone),raw=Array.isArray(body.days)?body.days:[];
  if(!raw.length||raw.length>MAX_DAYS_PER_SYNC)throw Object.assign(new Error('Send 1 to '+MAX_DAYS_PER_SYNC+' health days at a time.'),{status:400});
  const seen=new Map();
  raw.forEach(item=>{
    const day=dateOnly(item&&item.date);if(!day||!dateWithinBridgeWindow(day,now))throw Object.assign(new Error('Health date is outside the sync window.'),{status:400});
    const metrics=sanitizeMetrics(item&&item.metrics);if(!Object.keys(metrics).length)throw Object.assign(new Error('Health day has no supported metrics.'),{status:400});
    /* Duplicate dates inside one rapid/retried Shortcut request merge before DB
       access. Last supported value wins per metric; no duplicate DB rows exist. */
    seen.set(day,Object.assign({},seen.get(day)||{},metrics));
  });
  return{schemaVersion:1,timeZone:tz,days:Array.from(seen.entries()).map(([date,metrics])=>({date,metrics}))};
}

function historyDateAllowed(day,now){
  const d=new Date(day+'T00:00:00Z').getTime(),n=now instanceof Date?now.getTime():Date.now(),floor=Date.UTC(2000,0,1);
  return Number.isFinite(d)&&d>=floor&&d<=n+2*86400000;
}
function sanitizeImportPayload(body,now){
  if(!body||typeof body!=='object'||Array.isArray(body))throw Object.assign(new Error('Bad health history import.'),{status:400});
  const tz=timezone(body.timeZone),raw=Array.isArray(body.days)?body.days:[];
  if(!raw.length||raw.length>MAX_DAYS_PER_IMPORT)throw Object.assign(new Error('Import 1 to '+MAX_DAYS_PER_IMPORT+' health days at a time.'),{status:400});
  const seen=new Map();
  raw.forEach(item=>{
    const day=dateOnly(item&&item.date);if(!day||!historyDateAllowed(day,now))throw Object.assign(new Error('Health history date is outside the supported range.'),{status:400});
    const metrics=sanitizeMetrics(item&&item.metrics);if(!Object.keys(metrics).length)throw Object.assign(new Error('Health history day has no supported metrics.'),{status:400});
    seen.set(day,Object.assign({},seen.get(day)||{},metrics));
  });
  return{timeZone:tz,days:Array.from(seen.entries()).map(([date,metrics])=>({date,metrics}))};
}
function bodyTooLarge(event){
  const raw=String(event&&event.body||'');return Buffer.byteLength(raw,'utf8')>MAX_BODY_BYTES;
}
function errorText(error){const d=error&&error.detail;return String((d&&typeof d==='object'&&(d.message||d.details||d.hint))||d||error&&error.message||'')}
function schemaMissing(error){return /member_health_|ensure_member_health_sync_token|consume_member_health_sync_rate|upsert_member_health_daily|import_member_health_daily|schema cache|does not exist/i.test(errorText(error))}
function credentialRevoked(error){return /health sync credential (?:is )?revoked/i.test(errorText(error))}

async function ensureToken(memberId){
  const suppliedId=crypto.randomUUID(),nonce=crypto.randomBytes(24).toString('base64url');
  const rows=await P.db('rpc/ensure_member_health_sync_token',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_member_id:memberId,p_token_id:suppliedId,p_nonce:nonce})});
  const row=rows&&rows[0],token=publicToken(row);if(!token)throw new Error('Health sync token could not be created.');
  return{token,createdAt:row.created_at||null,lastUsedAt:row.last_used_at||null};
}
async function tokenStatus(memberId){
  const rows=await P.db('member_health_sync_tokens?select=token_id,created_at,last_used_at,revoked_at&member_id=eq.'+encodeURIComponent(memberId)+'&limit=1');
  const row=rows&&rows[0];return{connected:!!(row&&!row.revoked_at),createdAt:row&&row.created_at||null,lastUsedAt:row&&row.last_used_at||null,revokedAt:row&&row.revoked_at||null};
}
async function revokeToken(memberId){
  const now=new Date().toISOString();await P.db('member_health_sync_tokens?member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({revoked_at:now})});return{ok:true,revokedAt:now};
}
async function durableRateAllowed(tokenId){
  const rows=await P.db('rpc/consume_member_health_sync_rate',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_token_id:tokenId})});
  const value=Array.isArray(rows)?rows[0]:rows;
  return value===true||value==='true'||(value&&value.allowed===true);
}
async function verifyEvent(event){
  const parsed=parsePublicToken(bearerFromEvent(event));if(!parsed)return null;
  const rows=await P.db('member_health_sync_tokens?select=member_id,token_id,nonce,created_at,last_used_at,revoked_at&token_id=eq.'+encodeURIComponent(parsed.tokenId)+'&revoked_at=is.null&limit=1');
  const row=rows&&rows[0];if(!row||!safeEqualHex(parsed.sig,signRow(row)))return null;
  /* Do not allocate rate-limit state for random unauthenticated token ids. Only
     a cryptographically valid credential is allowed into the warm limiter. */
  if(!rateAllowed(parsed.tokenId))return{rateLimited:true};
  /* Serverless instances do not share memory, so the warm limiter above is
     only the fast first line. The durable database limiter is the authority
     across every Netlify instance and also catches accidental Shortcut loops. */
  if(!(await durableRateAllowed(parsed.tokenId)))return{rateLimited:true};
  /* A Shortcut does not outlive the member entitlement. This fresh ledger read
     revokes practical access as soon as My Gym access is no longer active. */
  const member=await P.memberWithAccess(row.member_id,'id,active,sesh_left,gym_only');if(!member)return null;
  try{await P.db('member_health_sync_tokens?member_id=eq.'+encodeURIComponent(row.member_id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({last_used_at:new Date().toISOString()})})}catch(e){}
  return{memberId:row.member_id,tokenId:row.token_id};
}
async function saveDays(memberId,tokenId,payload){
  let accepted=0;
  for(const item of payload.days){
    await P.db('rpc/upsert_member_health_daily',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({p_member_id:memberId,p_token_id:tokenId,p_day:item.date,p_time_zone:payload.timeZone||null,p_metrics:item.metrics,p_source:'apple_shortcuts'})});accepted++;
  }
  return accepted;
}

async function importDaysForMember(memberId,body){
  const payload=sanitizeImportPayload(body,new Date());
  const rows=await P.db('rpc/import_member_health_daily',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_member_id:memberId,p_time_zone:payload.timeZone||null,p_days:payload.days})});
  const raw=Array.isArray(rows)?rows[0]:rows;
  const imported=Math.max(0,parseInt(raw&&raw.import_member_health_daily!=null?raw.import_member_health_daily:raw,10)||0);
  return{imported,days:payload.days.length};
}
async function dailyForMember(memberId,limit){
  const n=Math.min(365,Math.max(1,parseInt(limit,10)||30));
  const rows=await P.db('member_health_daily?select=day,time_zone,metrics,source,synced_at&member_id=eq.'+encodeURIComponent(memberId)+'&order=day.desc&limit='+n);
  return rows||[];
}

module.exports={
  TOKEN_PREFIX,MAX_BODY_BYTES,MAX_DAYS_PER_SYNC,MAX_DAYS_PER_IMPORT,METRICS,
  publicToken,parsePublicToken,bearerFromEvent,safeEqualHex,timezone,dateOnly,dateWithinBridgeWindow,historyDateAllowed,cleanMetric,sanitizeMetrics,sanitizeSyncPayload,sanitizeImportPayload,bodyTooLarge,schemaMissing,credentialRevoked,
  ensureToken,tokenStatus,revokeToken,durableRateAllowed,verifyEvent,saveDays,importDaysForMember,dailyForMember,
  _test:{signRow,rateAllowed,warmRate}
};
