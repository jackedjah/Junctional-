'use strict';
/* MAHFITT ROLE / ACTIVE FITNESS PROFILE OWNER
   -------------------------------------------
   The authenticated account and the fitness profile being rendered are two
   different concepts.  This module is the ONLY server owner that resolves a
   requested client profile for canonical MAHFITT surfaces.

   Authorization rules:
     * self context always resolves to the signed-in member;
     * a non-admin coach must have an active mahfitt_coach_relationships row;
     * the existing FOB admin session remains an explicit global business-admin
       grant (the legacy product already authorizes that session for all active
       members), but it still has to resolve the target through this module;
     * a browser-supplied activeProfileId is never authorization by itself.

   The relationship table is optional during deploy-order rollout.  A missing
   table never grants access.  Only the independently authenticated FOB admin
   session can use the legacy global grant while migration 052 is pending. */
const P = require('./_payment');
const AdminSession = require('./_session');

const UUID=/^[0-9a-fA-F-]{36}$/;
function uuid(v){return UUID.test(String(v||''))}
function name(member){return String(((member&&member.first_name)||'')+' '+((member&&member.last_name)||'')).trim()}
function schemaMissing(error){return /mahfitt_coach_relationships|schema cache|does not exist|relation .* does not exist/i.test(String(error&&error.detail||error&&error.message||''))}
function cleanPermissions(raw){
  raw=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  return{
    fitness:raw.fitness!==false,
    programs:raw.programs!==false,
    calendar:raw.calendar!==false,
    logs:raw.logs!==false,
    progress:raw.progress!==false,
    media:raw.media!==false,
    messages:raw.messages!==false,
    habits:raw.habits!==false,
    resources:raw.resources!==false
  };
}
function permissionAllowed(context,key){
  if(!context||!context.isClientContext)return true;
  if(context.grant==='fob_admin')return true;
  const permissions=cleanPermissions(context.permissions);
  return Object.prototype.hasOwnProperty.call(permissions,key)?permissions[key]!==false:false;
}
function permissionError(key){return{ok:false,status:403,code:'CLIENT_OPERATION_FORBIDDEN',error:'This coach relationship does not permit '+String(key||'this')+' operations for the selected client.'};}
async function memberById(id){
  if(!uuid(id))return null;
  /* Keep client-context authorization on the canonical core member columns.
     Older production member tables do not all carry optional profile/admin
     columns (preferred_park, location_rate, etc.).  Authorization must not go
     down merely because one of those presentation fields is absent. */
  const rows=await P.db('payment_vip_members?select=id,first_name,last_name,sesh_left,active,gym_only&id=eq.'+encodeURIComponent(String(id).toLowerCase())+'&active=eq.true&limit=1');
  return rows&&rows[0]||null;
}
async function relationship(coachId,clientId){
  if(!uuid(coachId)||!uuid(clientId))return null;
  try{
    const rows=await P.db('mahfitt_coach_relationships?select=id,coach_member_id,client_member_id,status,permissions,updated_at&coach_member_id=eq.'+encodeURIComponent(String(coachId).toLowerCase())+'&client_member_id=eq.'+encodeURIComponent(String(clientId).toLowerCase())+'&status=eq.active&limit=1');
    return rows&&rows[0]||null;
  }catch(error){if(schemaMissing(error))return null;throw error}
}
async function relationshipClients(coachId){
  if(!uuid(coachId))return[];
  try{
    const rels=await P.db('mahfitt_coach_relationships?select=id,client_member_id,status,permissions,updated_at&coach_member_id=eq.'+encodeURIComponent(String(coachId).toLowerCase())+'&status=eq.active&order=updated_at.desc&limit=1000')||[];
    const ids=rels.map(r=>String(r.client_member_id||'').toLowerCase()).filter(uuid);
    if(!ids.length)return[];
    const rows=await P.db('payment_vip_members?select=id,first_name,last_name,sesh_left,active,gym_only&id=in.('+ids.join(',')+')&active=eq.true&order=first_name.asc,last_name.asc&limit=1000')||[];
    const map=new Map(rels.map(r=>[String(r.client_member_id||'').toLowerCase(),r]));
    return rows.map(row=>({member:row,relationship:map.get(String(row.id).toLowerCase())||null}));
  }catch(error){if(schemaMissing(error))return[];throw error}
}
async function adminClients(){
  return await P.db('payment_vip_members?select=id,first_name,last_name,sesh_left,active,gym_only&active=eq.true&order=first_name.asc,last_name.asc&limit=10000')||[];
}
function publicContext(account,active,grant,permissions){
  const client=!!(account&&active&&String(account.id)!==String(active.id));
  return{
    signedInAccountId:account&&account.id||null,
    activeFitnessProfileId:active&&active.id||null,
    signedInAccountName:name(account),
    activeFitnessProfileName:name(active),
    isClientContext:client,
    grant:client?grant:'self',
    canCoach:!!(grant&&grant!=='none') || !client&&false,
    isFobAdmin:grant==='fob_admin',
    permissions:cleanPermissions(permissions),
    musicOwnerId:account&&account.id||null,
    themeOwnerId:account&&account.id||null,
    aiOwnerId:active&&active.id||null,
    clientAiBlocked:client
  };
}
async function capability(event,account){
  const isFobAdmin=!!AdminSession.isAuthed(event);
  let rels=[],degraded=false;
  try{rels=await relationshipClients(account&&account.id)}catch(error){
    /* FOB admin is an independently authenticated grant. A temporary
       relationship-service failure may reduce relationship metadata, but it
       must not make the five Coach Mode destinations unusable for an already
       authenticated FOB administrator. Non-admin coaches remain strict. */
    if(!isFobAdmin)throw error;
    degraded=true;
    console.warn('mahfitt relationship capability degraded for FOB admin',error&&error.message||error);
  }
  return{isFobAdmin,hasRelationships:rels.length>0,canCoach:isFobAdmin||rels.length>0,relationshipClients:rels,degraded};
}
function fallbackSelfCapability(event,error){
  let isFobAdmin=false;
  try{isFobAdmin=!!AdminSession.isAuthed(event)}catch(e){}
  if(error)console.warn('mahfitt role capability degraded',error&&error.message||error);
  return{isFobAdmin,hasRelationships:false,canCoach:isFobAdmin,relationshipClients:[],degraded:true};
}
async function resolve(event,account,body){
  if(!account||!uuid(account.id))return{ok:false,status:401,code:'AUTH_REQUIRED'};
  const requested=body&&uuid(body.activeProfileId)?String(body.activeProfileId).toLowerCase():String(account.id).toLowerCase();
  const self=requested===String(account.id).toLowerCase();
  /* R90A — Coach Mode discovery is optional to ordinary MAHFITT boot. A
     relationship-table/schema/service failure must never take down self mode.
     Another-member context remains strict and independently authorized. */
  if(self){
    let cap;
    if(['boot','coachDirectory','coachProfileBoot'].includes(String(body&&body.action||''))){
      try{cap=await capability(event,account)}catch(error){cap=fallbackSelfCapability(event,error)}
    }else cap=fallbackSelfCapability(event,null);
    const context=publicContext(account,account,cap.isFobAdmin?'fob_admin':cap.hasRelationships?'coach_relationship':'none',{});
    context.canCoach=cap.canCoach;context.isFobAdmin=cap.isFobAdmin;context.coachCapabilityDegraded=!!cap.degraded;
    return{ok:true,accountMember:account,activeMember:account,context,capability:cap};
  }
  /* The FOB admin grant predates relationship rows and is independently
     authenticated by _session. Resolve that grant directly before touching
     the optional relationship service. This keeps client switching functional
     during migration/service degradation without weakening ordinary coach
     authorization. */
  let directAdmin=false;
  try{directAdmin=!!AdminSession.isAuthed(event)}catch(e){}
  if(directAdmin){
    const target=await memberById(requested);
    if(!target)return{ok:false,status:403,code:'CLIENT_CONTEXT_FORBIDDEN',error:'That client is not available for this FOB administrator.'};
    const context=publicContext(account,target,'fob_admin',{});context.canCoach=true;context.isFobAdmin=true;
    return{ok:true,accountMember:account,activeMember:target,context,relationship:null,capability:{isFobAdmin:true,hasRelationships:false,canCoach:true,relationshipClients:[],degraded:false}};
  }
  let cap;
  try{cap=await capability(event,account)}catch(error){
    console.warn('mahfitt client context unavailable',error&&error.message||error);
    return{ok:false,status:503,code:'COACH_CONTEXT_UNAVAILABLE',error:'Coach Mode is temporarily unavailable. Your own MAHFITT account is still available.'};
  }
  let rel=(cap.relationshipClients||[]).find(x=>String(x.member&&x.member.id||'').toLowerCase()===requested)||null;
  let target=rel&&rel.member||null,grant=rel?'coach_relationship':'none',permissions=rel&&rel.relationship&&rel.relationship.permissions||{};
  if(!target&&cap.isFobAdmin){target=await memberById(requested);grant=target?'fob_admin':'none';permissions={};}
  if(!target){
    return{ok:false,status:403,code:'CLIENT_CONTEXT_FORBIDDEN',error:'That client is not authorized for this signed-in account.',capability:cap};
  }
  const context=publicContext(account,target,grant,permissions);context.canCoach=true;context.isFobAdmin=cap.isFobAdmin;
  return{ok:true,accountMember:account,activeMember:target,context,relationship:rel&&rel.relationship||null,capability:cap};
}
async function directory(event,account){
  /* Directory availability for an authenticated FOB administrator cannot be
     coupled to the optional relationship service. Use the existing active
     FOB member database as the authoritative compatibility source, while
     ordinary coaches continue to require explicit relationship rows. */
  let directAdmin=false;
  try{directAdmin=!!AdminSession.isAuthed(event)}catch(e){}
  if(directAdmin){
    const all=await adminClients();
    const entries=all.filter(member=>member&&String(member.id)!==String(account&&account.id)).map(member=>({member,grant:'fob_admin',permissions:cleanPermissions({})}));
    entries.sort((a,b)=>name(a.member).localeCompare(name(b.member)));
    return{ok:true,isFobAdmin:true,degraded:false,clients:entries.map(x=>({id:x.member.id,name:name(x.member),sessionsLeft:Math.max(0,Number(x.member.sesh_left)||0),preferredPark:'',grant:x.grant,permissions:x.permissions}))};
  }
  let cap;
  try{cap=await capability(event,account)}catch(error){
    console.warn('mahfitt coach directory unavailable',error&&error.message||error);
    return{ok:false,status:503,code:'COACH_CONTEXT_UNAVAILABLE',error:'Coach Mode is temporarily unavailable. Your own MAHFITT account is still available.'};
  }
  if(!cap.canCoach)return{ok:false,status:403,code:'COACH_REQUIRED',error:'Coach authorization is required.'};
  let entries=(cap.relationshipClients||[]).map(x=>({member:x.member,grant:'coach_relationship',permissions:cleanPermissions(x.relationship&&x.relationship.permissions)}));
  if(cap.isFobAdmin){
    const all=await adminClients(),seen=new Set(entries.map(x=>String(x.member.id)));
    all.forEach(member=>{if(!seen.has(String(member.id))&&String(member.id)!==String(account.id))entries.push({member,grant:'fob_admin',permissions:cleanPermissions({})})});
  }
  entries=entries.filter(x=>x.member&&String(x.member.id)!==String(account.id));
  entries.sort((a,b)=>name(a.member).localeCompare(name(b.member)));
  return{ok:true,isFobAdmin:cap.isFobAdmin,clients:entries.map(x=>({id:x.member.id,name:name(x.member),sessionsLeft:Math.max(0,Number(x.member.sesh_left)||0),preferredPark:x.member.preferred_park||'',grant:x.grant,permissions:x.permissions}))};
}
module.exports={uuid,schemaMissing,cleanPermissions,permissionAllowed,permissionError,memberById,relationship,relationshipClients,capability,resolve,directory,publicContext};
