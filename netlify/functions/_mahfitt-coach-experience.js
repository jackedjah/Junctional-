'use strict';
/* MAHFITT R85 :: friendly coach experience data owner
   --------------------------------------------------
   This module owns the NEW coach-facing information architecture data only:
   Today, the relationship-scoped Inbox, Resources and MAH Habits.

   It does not create a parallel fitness account. The caller passes the already
   server-resolved signed-in account + active fitness member + role context.
   Any operation naming ANOTHER client is resolved again through
   _mahfitt-role-context before a write occurs. */
const P=require('./_payment');
const Role=require('./_mahfitt-role-context');

const UUID=/^[0-9a-fA-F-]{36}$/;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const BUILTIN_COACH_RESOURCES=[
  {id:'builtin-coach-science',title:'FOB Coach Science Compendium',category:'COACHING',resource_type:'link',url:'/FOB-Coach-Science-Compendium-v1.0.pdf',body:null,archived:false,created_at:null,updated_at:null,builtin:true},
  {id:'builtin-pre-sesh',title:'FOB Pre-Sesh Checklist',category:'SESSION',resource_type:'link',url:'/FOB-Pre-Sesh-Checklist.pdf',body:null,archived:false,created_at:null,updated_at:null,builtin:true},
  {id:'builtin-participation',title:'FOB Session Participation Agreement',category:'SESSION',resource_type:'link',url:'/FOB-Session-Participation-Agreement.pdf',body:null,archived:false,created_at:null,updated_at:null,builtin:true}
];
function uuid(v){return UUID.test(String(v||''))}
function txt(v,max){return String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,max||120)}
function bodyText(v,max){return String(v==null?'':v).replace(/\r\n?/g,'\n').trim().slice(0,max||12000)}
function schemaMissing(error){return /mahfitt_resources|mahfitt_resource_assignments|mahfitt_habits|mahfitt_habit_completions|schema cache|does not exist|relation .* does not exist/i.test(String(error&&error.detail||error&&error.message||error||''))}
function resultError(status,code,error){return{ok:false,status,code,error}}
function publicDate(v){const n=Date.parse(String(v||''));return Number.isFinite(n)?new Date(n).toISOString():''}
function isoRange(body){
  let start=Date.parse(String(body&&body.dayStart||'')),end=Date.parse(String(body&&body.dayEnd||''));
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>36*3600*1000){
    const d=new Date();d.setUTCHours(0,0,0,0);start=d.getTime();end=start+86400000;
  }
  return{start:new Date(start).toISOString(),end:new Date(end).toISOString()};
}
function todayDay(v){if(DAY.test(String(v||'')))return String(v);return new Date().toISOString().slice(0,10)}
function safeUrl(v){
  const s=String(v||'').trim().slice(0,2000);if(!s)return'';
  if(/^\/(?!\/)/.test(s))return s;
  try{const u=new URL(s);return /^https?:$/.test(u.protocol)?u.toString():''}catch(e){return''}
}
function coachRequired(roleContext){return !roleContext||roleContext.isClientContext||!roleContext.canCoach?resultError(403,'COACH_REQUIRED','Coach Mode authorization is required.'):null}
async function directory(event,account){
  const d=await Role.directory(event,account);if(!d.ok)return d;
  return Object.assign({},d,{clients:(d.clients||[]).slice(0,1000)});
}
function idList(clients){return(clients||[]).map(c=>String(c.id||'').toLowerCase()).filter(uuid)}
function inFilter(ids){return ids.length?'('+ids.map(x=>String(x).toLowerCase()).join(',')+')':'()'}

async function coachInbox(event,account,roleContext){
  const denied=coachRequired(roleContext);if(denied)return denied;
  const dir=await directory(event,account);if(!dir.ok)return dir;
  const ids=idList(dir.clients);if(!ids.length)return{ok:true,status:200,threads:[]};
  const [messages,notes]=await Promise.all([
    P.db('member_messages?select=id,member_id,sender_role,message_type,request_status,body,created_at&member_id=in.'+inFilter(ids)+'&order=created_at.desc,id.desc&limit=2000').catch(()=>[]),
    P.db('member_message_notifications?select=id,member_id,kind,created_at&member_id=in.'+inFilter(ids)+'&audience=eq.coach&read_at=is.null&order=created_at.desc&limit=2000').catch(()=>[])
  ]);
  const latest=new Map(),unread=new Map();
  (messages||[]).forEach(m=>{const k=String(m.member_id||'');if(!latest.has(k))latest.set(k,m)});
  (notes||[]).forEach(n=>{const k=String(n.member_id||'');unread.set(k,(unread.get(k)||0)+1)});
  const threads=(dir.clients||[]).map(c=>{
    const m=latest.get(String(c.id))||null;
    return{id:c.id,name:c.name||'Client',unread:unread.get(String(c.id))||0,latest:m?{id:m.id,sender:m.sender_role,type:m.message_type||'message',requestStatus:m.request_status||null,body:txt(m.body,160),createdAt:publicDate(m.created_at)}:null};
  }).filter(x=>x.latest||x.unread).sort((a,b)=>b.unread-a.unread||String(b.latest&&b.latest.createdAt||'').localeCompare(String(a.latest&&a.latest.createdAt||''))||a.name.localeCompare(b.name));
  return{ok:true,status:200,threads};
}

async function coachToday(event,account,roleContext,body){
  const denied=coachRequired(roleContext);if(denied)return denied;
  const dir=await directory(event,account);if(!dir.ok)return dir;
  const ids=idList(dir.clients);if(!ids.length)return{ok:true,status:200,attention:[],clientCount:0};
  const names=new Map((dir.clients||[]).map(c=>[String(c.id),c.name||'Client']));
  const range=isoRange(body),set=inFilter(ids);
  const [notes,messages,calendar,workouts]=await Promise.all([
    P.db('member_message_notifications?select=id,member_id,kind,created_at&member_id=in.'+set+'&audience=eq.coach&read_at=is.null&order=created_at.desc&limit=500').catch(()=>[]),
    P.db('member_messages?select=id,member_id,sender_role,body,created_at&member_id=in.'+set+'&order=created_at.desc,id.desc&limit=1000').catch(()=>[]),
    P.db('member_calendar_events?select=id,member_id,kind,title,starts_at,ends_at,status&member_id=in.'+set+'&status=eq.scheduled&starts_at=gte.'+encodeURIComponent(range.start)+'&starts_at=lt.'+encodeURIComponent(range.end)+'&order=starts_at.asc&limit=500').catch(()=>[]),
    P.db('gym_sessions?select=id,member_id,name,ended_at,session_date,updated_at&member_id=in.'+set+'&status=eq.done&ended_at=gte.'+encodeURIComponent(range.start)+'&ended_at=lt.'+encodeURIComponent(range.end)+'&order=ended_at.desc&limit=500').catch(()=>[])
  ]);
  const latestMsg=new Map();(messages||[]).forEach(m=>{const k=String(m.member_id||'');if(!latestMsg.has(k))latestMsg.set(k,m)});
  const unreadBy=new Map();(notes||[]).forEach(n=>{const k=String(n.member_id||'');unreadBy.set(k,(unreadBy.get(k)||0)+1)});
  const attention=[];
  unreadBy.forEach((count,id)=>{const m=latestMsg.get(id);attention.push({type:'message',clientId:id,clientName:names.get(id)||'Client',label:count===1?'NEW MESSAGE':count+' NEW MESSAGES',detail:m?txt(m.body,110):'Open private thread',at:publicDate(m&&m.created_at),priority:3})});
  (calendar||[]).forEach(e=>attention.push({type:'calendar',clientId:String(e.member_id),clientName:names.get(String(e.member_id))||'Client',label:'SESSION TODAY',detail:txt(e.title||'Scheduled session',110),at:publicDate(e.starts_at),priority:2,eventId:e.id}));
  const workoutClient=new Set();(workouts||[]).forEach(w=>{const id=String(w.member_id);if(workoutClient.has(id))return;workoutClient.add(id);attention.push({type:'workout',clientId:id,clientName:names.get(id)||'Client',label:'WORKOUT COMPLETED',detail:txt(w.name||'Workout',110),at:publicDate(w.ended_at||w.updated_at),priority:1,workoutId:w.id})});
  attention.sort((a,b)=>b.priority-a.priority||String(b.at||'').localeCompare(String(a.at||'')));
  return{ok:true,status:200,attention:attention.slice(0,12),clientCount:ids.length,dayStart:range.start,dayEnd:range.end};
}

function publicResource(row,assignment){return{id:row.id,title:row.title,category:row.category||'GENERAL',type:row.resource_type,url:row.resource_type==='link'?safeUrl(row.url):'',body:row.resource_type==='text'?String(row.body||''):'',createdAt:publicDate(row.created_at),updatedAt:publicDate(row.updated_at),assignedAt:assignment?publicDate(assignment.assigned_at):'',builtin:!!row.builtin}}
async function resourceRow(ownerId,id){if(!uuid(id))return null;const rows=await P.db('mahfitt_resources?select=*&id=eq.'+encodeURIComponent(id)+'&owner_coach_member_id=eq.'+encodeURIComponent(ownerId)+'&limit=1');return rows&&rows[0]||null}
async function resourcesForCoach(account,roleContext){
  const denied=coachRequired(roleContext);if(denied)return denied;
  const rows=await P.db('mahfitt_resources?select=id,title,category,resource_type,url,body,archived,created_at,updated_at&owner_coach_member_id=eq.'+encodeURIComponent(account.id)+'&archived=eq.false&order=category.asc,title.asc&limit=500');
  const ids=(rows||[]).map(r=>r.id).filter(uuid);let assigns=[];
  if(ids.length)assigns=await P.db('mahfitt_resource_assignments?select=id,resource_id,client_member_id,assigned_at&resource_id=in.'+inFilter(ids)+'&order=assigned_at.desc&limit=5000').catch(()=>[]);
  const by=new Map();(assigns||[]).forEach(a=>{const k=String(a.resource_id);if(!by.has(k))by.set(k,[]);by.get(k).push({clientId:a.client_member_id,assignedAt:publicDate(a.assigned_at)})});
  return{ok:true,status:200,storageAvailable:true,resources:(rows||[]).map(r=>Object.assign(publicResource(r),{assignments:by.get(String(r.id))||[]}))};
}
function builtinResourcesResult(){return{ok:true,status:200,storageAvailable:false,degraded:true,resources:BUILTIN_COACH_RESOURCES.map(r=>Object.assign(publicResource(r),{assignments:[]}))}}
async function resourceCreate(account,roleContext,b){
  const denied=coachRequired(roleContext);if(denied)return denied;
  const title=txt(b.title,120),category=txt(b.category,60).toUpperCase()||'GENERAL',type=String(b.type||'link').toLowerCase()==='text'?'text':'link';
  const url=type==='link'?safeUrl(b.url):'',body=type==='text'?bodyText(b.body,12000):'';
  if(!title)return resultError(400,'RESOURCE_TITLE_REQUIRED','Give the resource a title.');
  if(type==='link'&&!url)return resultError(400,'RESOURCE_URL_INVALID','Use a valid https:// or site-relative resource link.');
  if(type==='text'&&!body)return resultError(400,'RESOURCE_BODY_REQUIRED','Write the resource text first.');
  const payload={owner_coach_member_id:account.id,title,category,resource_type:type,url:type==='link'?url:null,body:type==='text'?body:null,archived:false,updated_at:new Date().toISOString()};
  const rows=await P.db('mahfitt_resources',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
  return{ok:true,status:200,resource:rows&&rows[0]?publicResource(rows[0]):null};
}
async function authorizedTarget(event,account,targetId,permission){
  if(!uuid(targetId))return resultError(400,'CLIENT_REQUIRED','Choose an authorized client.');
  const r=await Role.resolve(event,account,{action:'coachResourceTarget',activeProfileId:String(targetId).toLowerCase()});
  if(!r.ok)return resultError(r.status||403,r.code||'CLIENT_CONTEXT_FORBIDDEN',r.error||'That client is not authorized.');
  if(!r.context.isClientContext)return resultError(400,'CLIENT_REQUIRED','Choose a client other than your own profile.');
  if(!Role.permissionAllowed(r.context,permission)){const d=Role.permissionError(permission);return resultError(d.status,d.code,d.error)}
  return{ok:true,target:r.activeMember,context:r.context};
}
async function resourceAssign(event,account,roleContext,b,remove){
  const denied=coachRequired(roleContext);if(denied)return denied;
  const resource=await resourceRow(account.id,b.resourceId);if(!resource||resource.archived)return resultError(404,'RESOURCE_NOT_FOUND','That resource is unavailable.');
  const target=await authorizedTarget(event,account,b.clientId,'resources');if(!target.ok)return target;
  const where='mahfitt_resource_assignments?resource_id=eq.'+encodeURIComponent(resource.id)+'&client_member_id=eq.'+encodeURIComponent(target.target.id);
  if(remove){await P.db(where,{method:'DELETE',headers:{Prefer:'return=minimal'}});return{ok:true,status:200,assigned:false,clientId:target.target.id,resourceId:resource.id}}
  try{await P.db('mahfitt_resource_assignments',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({resource_id:resource.id,client_member_id:target.target.id,assigned_by_member_id:account.id})})}
  catch(error){if(Number(error&&error.status)!==409)throw error}
  return{ok:true,status:200,assigned:true,clientId:target.target.id,resourceId:resource.id};
}
async function resourceArchive(account,roleContext,b){
  const denied=coachRequired(roleContext);if(denied)return denied;const resource=await resourceRow(account.id,b.resourceId);if(!resource)return resultError(404,'RESOURCE_NOT_FOUND','That resource is unavailable.');
  await P.db('mahfitt_resources?id=eq.'+encodeURIComponent(resource.id)+'&owner_coach_member_id=eq.'+encodeURIComponent(account.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({archived:true,updated_at:new Date().toISOString()})});
  return{ok:true,status:200};
}
async function assignedResources(member,roleContext){
  if(roleContext&&roleContext.isClientContext&&!Role.permissionAllowed(roleContext,'resources')){const d=Role.permissionError('resources');return resultError(d.status,d.code,d.error)}
  const assigns=await P.db('mahfitt_resource_assignments?select=id,resource_id,assigned_at,assigned_by_member_id&client_member_id=eq.'+encodeURIComponent(member.id)+'&order=assigned_at.desc&limit=500');
  const ids=(assigns||[]).map(a=>a.resource_id).filter(uuid);if(!ids.length)return{ok:true,status:200,resources:[]};
  const rows=await P.db('mahfitt_resources?select=id,title,category,resource_type,url,body,archived,created_at,updated_at&id=in.'+inFilter(ids)+'&archived=eq.false&order=category.asc,title.asc&limit=500');
  const aMap=new Map((assigns||[]).map(a=>[String(a.resource_id),a]));return{ok:true,status:200,resources:(rows||[]).map(r=>publicResource(r,aMap.get(String(r.id))))};
}

function publicHabit(row,completion,account,roleContext){
  const client=!!(roleContext&&roleContext.isClientContext),createdBy=String(row.created_by_member_id||'')===String(account.id||'');
  const editable=createdBy&&((client&&row.source_type==='coach')||(!client&&row.source_type==='self'));
  return{id:row.id,title:row.title,source:row.source_type||'self',schedule:row.schedule&&typeof row.schedule==='object'?row.schedule:{kind:'daily'},completed:!!(completion&&completion.completed),editable,createdAt:publicDate(row.created_at),updatedAt:publicDate(row.updated_at)};
}
async function habitRow(memberId,id){if(!uuid(id))return null;const rows=await P.db('mahfitt_habits?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(id)+'&limit=1');return rows&&rows[0]||null}
async function habitList(account,member,roleContext,b){
  if(roleContext&&roleContext.isClientContext&&!Role.permissionAllowed(roleContext,'habits')){const d=Role.permissionError('habits');return resultError(d.status,d.code,d.error)}
  const day=todayDay(b.day),rows=await P.db('mahfitt_habits?select=id,member_id,created_by_member_id,source_type,title,schedule,active,created_at,updated_at&member_id=eq.'+encodeURIComponent(member.id)+'&active=eq.true&order=created_at.asc&limit=300');
  const ids=(rows||[]).map(r=>r.id).filter(uuid);let comps=[];if(ids.length)comps=await P.db('mahfitt_habit_completions?select=id,habit_id,completed,updated_at&member_id=eq.'+encodeURIComponent(member.id)+'&day=eq.'+day+'&habit_id=in.'+inFilter(ids)+'&limit=500').catch(()=>[]);
  const map=new Map((comps||[]).map(c=>[String(c.habit_id),c]));return{ok:true,status:200,day,habits:(rows||[]).map(r=>publicHabit(r,map.get(String(r.id)),account,roleContext))};
}
function habitSchedule(v){const raw=v&&typeof v==='object'&&!Array.isArray(v)?v:{};const kind=['daily','weekdays'].includes(String(raw.kind||''))?String(raw.kind):'daily';return{kind}}
async function habitCreate(account,member,roleContext,b){
  if(roleContext&&roleContext.isClientContext&&!Role.permissionAllowed(roleContext,'habits')){const d=Role.permissionError('habits');return resultError(d.status,d.code,d.error)}
  const title=txt(b.title,120);if(!title)return resultError(400,'HABIT_TITLE_REQUIRED','Give the habit a short title.');
  const source=roleContext&&roleContext.isClientContext?'coach':'self',payload={member_id:member.id,created_by_member_id:account.id,source_type:source,title,schedule:habitSchedule(b.schedule),active:true,updated_at:new Date().toISOString()};
  const rows=await P.db('mahfitt_habits',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});const row=rows&&rows[0];return{ok:true,status:200,habit:row?publicHabit(row,null,account,roleContext):null};
}
function habitOwnsEdit(row,account,roleContext){if(!row)return false;const mine=String(row.created_by_member_id||'')===String(account.id||'');return mine&&((roleContext&&roleContext.isClientContext&&row.source_type==='coach')||(!roleContext.isClientContext&&row.source_type==='self'))}
async function habitUpdate(account,member,roleContext,b,archive){
  if(roleContext&&roleContext.isClientContext&&!Role.permissionAllowed(roleContext,'habits')){const d=Role.permissionError('habits');return resultError(d.status,d.code,d.error)}
  const row=await habitRow(member.id,b.habitId);if(!row)return resultError(404,'HABIT_NOT_FOUND','That habit is unavailable.');if(!habitOwnsEdit(row,account,roleContext))return resultError(403,'HABIT_EDIT_FORBIDDEN','Only the person or coach who created this habit can edit it here.');
  const patch={updated_at:new Date().toISOString()};if(archive)patch.active=false;else{const title=txt(b.title,120);if(!title)return resultError(400,'HABIT_TITLE_REQUIRED','Give the habit a short title.');patch.title=title;patch.schedule=habitSchedule(b.schedule)}
  await P.db('mahfitt_habits?id=eq.'+encodeURIComponent(row.id)+'&member_id=eq.'+encodeURIComponent(member.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(patch)});return{ok:true,status:200};
}
async function habitToggle(account,member,roleContext,b){
  if(roleContext&&roleContext.isClientContext&&!Role.permissionAllowed(roleContext,'habits')){const d=Role.permissionError('habits');return resultError(d.status,d.code,d.error)}
  const row=await habitRow(member.id,b.habitId);if(!row||row.active===false)return resultError(404,'HABIT_NOT_FOUND','That habit is unavailable.');const day=todayDay(b.day),completed=b.completed!==false;
  await P.db('mahfitt_habit_completions?on_conflict=habit_id,day',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({habit_id:row.id,member_id:member.id,day,completed,updated_by_member_id:account.id,updated_at:new Date().toISOString()})});return{ok:true,status:200,habitId:row.id,day,completed};
}

async function run(action,ctx){
  const {event,accountMember:account,activeMember:member,roleContext,body:b}=ctx;
  try{
    if(action==='coachToday')return await coachToday(event,account,roleContext,b);
    if(action==='coachInbox')return await coachInbox(event,account,roleContext);
    if(action==='coachResources')return await resourcesForCoach(account,roleContext);
    if(action==='coachResourceCreate')return await resourceCreate(account,roleContext,b);
    if(action==='coachResourceAssign')return await resourceAssign(event,account,roleContext,b,false);
    if(action==='coachResourceUnassign')return await resourceAssign(event,account,roleContext,b,true);
    if(action==='coachResourceArchive')return await resourceArchive(account,roleContext,b);
    if(action==='memberResources')return await assignedResources(member,roleContext);
    if(action==='habitList')return await habitList(account,member,roleContext,b);
    if(action==='habitCreate')return await habitCreate(account,member,roleContext,b);
    if(action==='habitUpdate')return await habitUpdate(account,member,roleContext,b,false);
    if(action==='habitArchive')return await habitUpdate(account,member,roleContext,b,true);
    if(action==='habitToggle')return await habitToggle(account,member,roleContext,b);
    return resultError(400,'UNKNOWN_COACH_EXPERIENCE_ACTION','Unknown Coach Experience action.');
  }catch(error){
    /* Resources should remain a useful destination even if migration 053 has
       not reached production yet. The shipped FOB documents are real static
       resources and require no fake persistence. Mutating resource actions
       still fail closed until canonical storage exists. */
    if(schemaMissing(error)&&action==='coachResources')return builtinResourcesResult();
    if(schemaMissing(error))return resultError(503,'R85_SETUP_REQUIRED','Saved Coach Resources and MAH Habits are temporarily unavailable.');
    throw error;
  }
}
module.exports={schemaMissing,safeUrl,isoRange,todayDay,coachInbox,coachToday,run};
