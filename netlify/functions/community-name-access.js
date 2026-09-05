'use strict';
/* FOB Forum :: approved-name access
   A member types the same confirmed full name already used by FOB Systems.
   The server resolves that private member record, binds it to one stable
   Supabase Auth identity, then returns a one-time hashed magic-link token.
   The browser exchanges that token with Supabase and receives a normal auth
   session, so all existing Forum RLS policies continue to work unchanged. */
const P = require('./_payment');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hdyuolirdxnggmnpbhag.supabase.co';
const H = Object.assign({'Content-Type':'application/json'}, P.SEC);
function serviceKey(){ return process.env.SUPABASE_SERVICE_ROLE_KEY || ''; }
function authHeaders(){ return {'apikey':serviceKey(),'Authorization':'Bearer '+serviceKey(),'Content-Type':'application/json'}; }
async function auth(path, opts){
  if(!serviceKey()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  const r = await fetch(SUPABASE_URL + '/auth/v1/' + path, Object.assign({}, opts || {}, {headers:Object.assign({},authHeaders(),(opts&&opts.headers)||{})}));
  const text = await r.text(); let body = null; try{ body=text?JSON.parse(text):null; }catch(e){ body=text; }
  if(!r.ok){ const err=new Error('Auth request failed'); err.status=r.status; err.detail=body; throw err; }
  return body;
}
function safeEmail(memberId){ return 'member-' + String(memberId).toLowerCase() + '@community.fob.systems'; }
function fullName(m){ return String(m.first_name||'').trim() + ' ' + String(m.last_name||'').trim(); }
async function bindExistingByName(member){
  const rows = await P.db('profiles?select=id,display_name&deleted_at=is.null&limit=1000');
  const target = P.normalize(fullName(member));
  const matches = (rows||[]).filter(r => P.normalize(r.display_name) === target);
  if(matches.length !== 1) return null;
  return matches[0].id;
}
async function ensureIdentity(member){
  let uid = null;
  let user = null;
  /* First recover any identity already provisioned by this name-access bridge.
     This keeps the link stable even if the member later changes their Forum display name. */
  try{
    const listed = await auth('admin/users?page=1&per_page=1000', {method:'GET'});
    const users = Array.isArray(listed) ? listed : ((listed && listed.users) || []);
    user = users.find(function(u){ return u && u.user_metadata && String(u.user_metadata.payment_member_id||'') === String(member.id); }) || null;
    if(user) uid = user.id;
  }catch(e){ console.warn('community-name-access identity scan', e && e.message); }
  /* Preserve an older email/password Forum profile when its display name is an exact match. */
  if(!uid){
    uid = await bindExistingByName(member);
    if(uid){
      user = await auth('admin/users/' + encodeURIComponent(uid), {method:'GET'});
    }
  }
  if(!uid){
    user = await auth('admin/users', {method:'POST', body:JSON.stringify({
      email:safeEmail(member.id),
      email_confirm:true,
      user_metadata:{display_name:fullName(member), payment_member_id:member.id, fob_name_access:true}
    })});
    uid = user && user.id;
    if(!uid) throw new Error('Community identity was not created');
  }
  const email = (user && user.email) || safeEmail(member.id);
  /* Keep the Auth identity linked to the private FOB member id. */
  try{
    await auth('admin/users/' + encodeURIComponent(uid), {method:'PUT', body:JSON.stringify({
      ban_duration:'none',
      user_metadata:Object.assign({},(user&&user.user_metadata)||{}, {display_name:fullName(member),payment_member_id:member.id,fob_name_access:true})
    })});
  }catch(e){ console.warn('community-name-access metadata sync', e && e.message); }
  /* Name access is the gate. Do not force a five-step onboarding wall after it.
     Existing profile customizations are preserved; only the completion flag is set. */
  await P.db('profiles?id=eq.'+encodeURIComponent(uid), {
    method:'PATCH', headers:{Prefer:'return=minimal'}, body:JSON.stringify({display_name:fullName(member),onboarding_completed:true,onboarding_step:5})
  });
  return {uid,email};
}
exports.handler = async function(event){
  if(event.httpMethod !== 'POST') return {statusCode:405,headers:H,body:JSON.stringify({error:'Method not allowed.'})};
  let b={}; try{ b=JSON.parse(event.body||'{}'); }catch(e){}
  const raw=P.normalize(b.fullName);
  if(raw.split(' ').filter(Boolean).length<2) return {statusCode:400,headers:H,body:JSON.stringify({error:'Enter your confirmed first and last name.'})};
  try{
    /* Match the whole confirmed name rather than guessing where a compound
       first or last name splits. The list is private and server-only. */
    const rows=await P.db('payment_vip_members?select=id,first_name,last_name,active,sesh_left&active=eq.true&sesh_left=gt.0&limit=2000');
    const member=(rows||[]).find(function(m){ return P.normalize(fullName(m))===raw; });
    if(!member||!P.hasSessionAccess(member)) return {statusCode:403,headers:H,body:JSON.stringify({error:'Member access is locked. Contact Jah directly.'})};
    const ident=await ensureIdentity(member);
    const link=await auth('admin/generate_link',{method:'POST',body:JSON.stringify({type:'magiclink',email:ident.email})});
    const token=(link&&link.hashed_token)||(link&&link.properties&&link.properties.hashed_token)||'';
    if(!token) throw new Error('One-time community token was not generated');
    return {statusCode:200,headers:H,body:JSON.stringify({ok:true,token_hash:token,type:'email'})};
  }catch(e){
    console.error('community-name-access',e&&e.message,e&&e.detail);
    return {statusCode:500,headers:H,body:JSON.stringify({error:'Forum access could not be opened right now.'})};
  }
};
