'use strict';
/* FOB Forum :: self-service training share payload.
   Validates the caller's Supabase bearer token, then uses the immutable
   payment_member_id stored in that Auth identity. No member id is accepted
   from the browser. */
const P=require('./_payment');
const SUPABASE_URL=process.env.SUPABASE_URL||'https://hdyuolirdxnggmnpbhag.supabase.co';
const H=Object.assign({'Content-Type':'application/json'},P.SEC);
function serviceKey(){return process.env.SUPABASE_SERVICE_ROLE_KEY||''}
async function authUser(token){
  const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:serviceKey(),Authorization:'Bearer '+token}});
  if(!r.ok) return null; return await r.json();
}
function bearer(event){ const h=(event.headers&& (event.headers.authorization||event.headers.Authorization))||''; return /^Bearer\s+(.+)$/i.test(h)?h.replace(/^Bearer\s+/i,'').trim():''; }
function n(v){ const x=Number(v); return Number.isFinite(x)?x:null; }
function pct(v){ const x=n(v); return x==null?null:Math.round(x); }
exports.handler=async function(event){
  if(event.httpMethod!=='GET') return{statusCode:405,headers:H,body:JSON.stringify({error:'Method not allowed.'})};
  const token=bearer(event); if(!token)return{statusCode:401,headers:H,body:JSON.stringify({error:'Sign in to the Forum first.'})};
  try{
    const user=await authUser(token); const memberId=user&&user.user_metadata&&user.user_metadata.payment_member_id;
    if(!user||!memberId)return{statusCode:403,headers:H,body:JSON.stringify({error:'This Forum profile is not linked to a FOB member record.'})};
    const member=await P.memberWithAccess(memberId,'id,first_name,last_name,active,sesh_left');
    if(!member)return{statusCode:403,headers:H,body:JSON.stringify({error:'Member access is locked. Contact Jah directly.'})};
    const rows=await P.db('fob_performances?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&order=session_date.asc,completed_at.asc&limit=400');
    const perf=rows||[]; const latest=perf.length?perf[perf.length-1]:null;
    const best=perf.reduce((a,r)=>!a||Number(r.overall_score)>Number(a.overall_score)?r:a,null);
    function shape(row){
      if(!row)return null;
      return {
        score:pct(row.overall_score), badge:row.badge_name||'', date:row.session_date||row.completed_at||null,
        rounds_recorded:n(row.rounds_recorded), rounds_total:n(row.rounds_total),
        block_lb:n(row.block_lb), band_level:row.band_level||null,
        marker_distance:n(row.marker_distance), core_set_seconds:n(row.core_set_seconds),
        core_pct:pct(row.core_pct), iso_pct:pct(row.iso_pct), pp_pct:pct(row.pp_pct), tech_pct:pct(row.tech_pct),
        session_label:row.session_label||row.session_type||'Standard'
      };
    }
    return{statusCode:200,headers:H,body:JSON.stringify({
      ok:true,
      member:{name:[member.first_name,member.last_name].filter(Boolean).join(' ')},
      count:perf.length,
      latest:shape(latest),
      best:shape(best)
    })};
  }catch(e){console.error('community-training-data',e&&e.message,e&&e.detail);return{statusCode:500,headers:H,body:JSON.stringify({error:'Training data could not be loaded right now.'})}}
};
