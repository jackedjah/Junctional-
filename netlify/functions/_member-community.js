'use strict';
/* Shared bridge between the private FOB member ledger and Forum identity.
   payment_vip_members remains the source of truth. A Forum/Auth identity is
   provisioned lazily or at member creation and permanently linked through
   user_metadata.payment_member_id. */
const P=require('./_payment');
const SUPABASE_URL=process.env.SUPABASE_URL||'https://hdyuolirdxnggmnpbhag.supabase.co';
function key(){return process.env.SUPABASE_SERVICE_ROLE_KEY||''}
function headers(){return {'apikey':key(),'Authorization':'Bearer '+key(),'Content-Type':'application/json'}}
async function auth(path,opts){
  if(!key()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  const r=await fetch(SUPABASE_URL+'/auth/v1/'+path,Object.assign({},opts||{},{headers:Object.assign({},headers(),(opts&&opts.headers)||{})}));
  const text=await r.text();let body=null;try{body=text?JSON.parse(text):null}catch(e){body=text}
  if(!r.ok){const err=new Error('Auth request failed');err.status=r.status;err.detail=body;throw err}return body;
}
function fullName(m){return ((m.first_name||'')+' '+(m.last_name||'')).trim()}
function safeEmail(id){return 'member-'+String(id).toLowerCase()+'@community.fob.systems'}
async function authUsers(){
  const listed=await auth('admin/users?page=1&per_page=1000',{method:'GET'});
  return Array.isArray(listed)?listed:((listed&&listed.users)||[]);
}
async function linkedIdentity(memberId){
  if(!memberId)return null;
  const users=await authUsers();
  return users.find(function(u){
    return u&&u.user_metadata&&String(u.user_metadata.payment_member_id||'')===String(memberId);
  })||null;
}
async function syncAccess(member){
  if(!member||!member.id)throw new Error('Member required');
  const allowed=P.hasSessionAccess(member);
  let user=null;
  try{user=await linkedIdentity(member.id)}catch(e){
    console.warn('member community identity scan',e&&e.message);
    throw e;
  }
  if(!user){
    if(allowed)return ensureIdentity(member);
    return {uid:null,allowed:false};
  }
  const metadata=Object.assign({},user.user_metadata||{},
    {display_name:fullName(member),payment_member_id:member.id,fob_name_access:allowed});
  await auth('admin/users/'+encodeURIComponent(user.id),{method:'PUT',body:JSON.stringify({
    ban_duration:allowed?'none':'876000h',
    user_metadata:metadata
  })});
  return {uid:user.id,allowed:allowed};
}
async function ensureIdentity(member){
  if(!member||!member.id) throw new Error('Member required');
  const allowed=P.hasSessionAccess(member);
  let users=[];try{users=await authUsers()}catch(e){users=[]}
  let user=users.find(u=>u&&u.user_metadata&&String(u.user_metadata.payment_member_id||'')===String(member.id))||null;
  let uid=user&&user.id;
  if(!uid){
    const profiles=await P.db('profiles?select=id,display_name,avatar_path&deleted_at=is.null&limit=1000').catch(()=>[]);
    const target=P.normalize(fullName(member));
    const matches=(profiles||[]).filter(r=>P.normalize(r.display_name)===target);
    if(matches.length===1){uid=matches[0].id;try{user=await auth('admin/users/'+encodeURIComponent(uid),{method:'GET'})}catch(e){}}
  }
  if(!uid){
    user=await auth('admin/users',{method:'POST',body:JSON.stringify({
      email:safeEmail(member.id),email_confirm:true,
      user_metadata:{display_name:fullName(member),payment_member_id:member.id,fob_name_access:allowed}
    })});
    uid=user&&user.id;if(!uid)throw new Error('Community identity was not created');
  }
  try{
    await auth('admin/users/'+encodeURIComponent(uid),{method:'PUT',body:JSON.stringify({
      ban_duration:allowed?'none':'876000h',
      user_metadata:Object.assign({},(user&&user.user_metadata)||{},{display_name:fullName(member),payment_member_id:member.id,fob_name_access:allowed})
    })});
  }catch(e){}
  /* Auth creation is wired to the existing handle_new_user trigger, which
     creates the required profile/username row. Preserve its identity fields
     and only sync the display/onboarding values used by name access. */
  await P.db('profiles?id=eq.'+encodeURIComponent(uid),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({display_name:fullName(member),onboarding_completed:true,onboarding_step:5})});
  return {uid,email:(user&&user.email)||safeEmail(member.id)};
}
async function avatarForMember(member){
  try{
    const ident=await ensureIdentity(member);
    const rows=await P.db('profiles?select=id,avatar_path&id=eq.'+encodeURIComponent(ident.uid)+'&limit=1');
    const path=rows&&rows[0]&&rows[0].avatar_path||null;
    return {uid:ident.uid,path,url:path?SUPABASE_URL+'/storage/v1/object/public/avatars/'+path:null};
  }catch(e){return {uid:null,path:null,url:null}}
}
async function signedUpload(bucket,path,upsert){
  const clean=String(path||'').split('/').map(encodeURIComponent).join('/');
  const r=await fetch(SUPABASE_URL+'/storage/v1/object/upload/sign/'+encodeURIComponent(bucket)+'/'+clean,{
    method:'POST',headers:Object.assign({},headers(),upsert?{'x-upsert':'true'}:{}),body:'{}'
  });
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch(e){data=text}
  if(!r.ok)throw new Error('Storage upload ticket failed');
  const partial=data&&data.url;if(!partial)throw new Error('No signed upload URL returned');
  return {signedUrl:SUPABASE_URL+'/storage/v1'+partial,path:path,token:(new URL(SUPABASE_URL+'/storage/v1'+partial)).searchParams.get('token')||null};
}
async function avatarUploadTicket(member){
  const ident=await ensureIdentity(member);
  const path=ident.uid+'/avatar-'+Date.now()+'.jpg';
  const ticket=await signedUpload('avatars',path,false);
  return Object.assign(ticket,{uid:ident.uid,publicUrl:SUPABASE_URL+'/storage/v1/object/public/avatars/'+path});
}
async function saveAvatar(member,path){
  const ident=await ensureIdentity(member);
  await P.db('profiles?id=eq.'+encodeURIComponent(ident.uid),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({avatar_path:path})});
  return {uid:ident.uid,url:SUPABASE_URL+'/storage/v1/object/public/avatars/'+path};
}
module.exports={SUPABASE_URL,fullName,linkedIdentity,syncAccess,ensureIdentity,avatarForMember,avatarUploadTicket,saveAvatar,signedUpload};
