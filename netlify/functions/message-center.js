'use strict';
/* MAHFITT R90 :: private coach/member Message Center
   MEMBER identity is derived only from the signed My Gym token/cookie.
   COACH access is either the existing FOB admin session or a server-verified
   MAHFITT coach relationship with messages permission. Sender identity never
   changes when a coach selects a client. Tables remain server-owned. */
const S=require('./_session');
const P=require('./_payment');
const MG=require('./mygym');
const MC=require('./_member-community');
const Role=require('./_mahfitt-role-context');
const crypto=require('crypto');

const V=446;
const H=Object.assign({'Content-Type':'application/json'},P.SEC);
const HH=Object.assign({},P.SEC,{'Content-Type':'text/html; charset=utf-8','Referrer-Policy':'no-referrer'});
const out=(code,body)=>({statusCode:code,headers:H,body:JSON.stringify(body)});
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
const text=(v,max)=>String(v==null?'':v).replace(/\r\n?/g,'\n').trim().slice(0,max||2000);
const fullName=m=>String((m&&m.first_name||'')+' '+(m&&m.last_name||'')).trim()||'Member';

function migrationMissing(error){
  const s=JSON.stringify(error&&error.detail||error&&error.message||error||'');
  return /member_message_threads|member_messages|member_message_notifications|theme_curation_requests|theme_curation_tracks|schema cache|does not exist/i.test(s);
}
async function actor(event,b){
  if(S.isAuthed(event)&&uuid(b&&b.memberId)) return {who:'coach',memberId:String(b.memberId),grant:'fob_admin'};
  const claim=(MG.memberFromRequest&&MG.memberFromRequest(event,b||{}))||(MG.memberFromToken&&MG.memberFromToken(b&&b.memberToken));
  if(!claim||!uuid(claim.id))return null;
  const member=await P.memberWithAccess(claim.id,'id,first_name,last_name,sesh_left,active,gym_only');
  if(!member)return null;
  const target=uuid(b&&b.memberId)?String(b.memberId).toLowerCase():String(member.id).toLowerCase();
  if(target!==String(member.id).toLowerCase()){
    const resolved=await Role.resolve(event,member,{action:'messageCenter',activeProfileId:target});
    if(!resolved.ok||!resolved.context||!resolved.context.isClientContext)return{denied:{status:resolved.status||403,code:resolved.code||'CLIENT_CONTEXT_FORBIDDEN',error:resolved.error||'That client is not authorized for this account.'}};
    if(!Role.permissionAllowed(resolved.context,'messages'))return{denied:Role.permissionError('messages')};
    return{who:'coach',memberId:resolved.activeMember.id,member:resolved.activeMember,account:member,roleContext:resolved.context,grant:resolved.context.grant};
  }
  return{who:'member',memberId:member.id,member};
}
async function memberRow(id){
  if(!uuid(id))return null;
  const rows=await P.db('payment_vip_members?select=id,first_name,last_name,active,sesh_left,gym_only&id=eq.'+encodeURIComponent(id)+'&limit=1');
  return rows&&rows[0]&&rows[0].active!==false?rows[0]:null;
}
async function ensureThread(memberId){
  let rows=await P.db('member_message_threads?select=id,member_id,status,last_message_at,created_at,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&limit=1');
  if(rows&&rows[0])return rows[0];
  try{
    rows=await P.db('member_message_threads',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({member_id:memberId})});
    if(rows&&rows[0])return rows[0];
  }catch(error){
    // Concurrent first-open requests can race the unique(member_id) insert.
    if(!(error&&Number(error.status)===409))throw error;
  }
  rows=await P.db('member_message_threads?select=id,member_id,status,last_message_at,created_at,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&limit=1');
  if(!rows||!rows[0])throw new Error('Message thread was not created');
  return rows[0];
}
function publicMessage(row,viewer){
  return {
    id:row.id, sender:row.sender_role, mine:row.sender_role===viewer,
    type:row.message_type||'message', requestType:row.request_type||null,
    requestStatus:row.request_status||null, body:String(row.body||''),
    metadata:row.metadata&&typeof row.metadata==='object'?row.metadata:{}, createdAt:row.created_at
  };
}
async function messagesFor(thread,viewer){
  const rows=await P.db('member_messages?select=id,sender_role,message_type,request_type,request_status,body,metadata,created_at&thread_id=eq.'+encodeURIComponent(thread.id)+'&order=created_at.asc,id.asc&limit=250');
  return (rows||[]).map(r=>publicMessage(r,viewer));
}
async function unreadCount(memberId,audience){
  const rows=await P.db('member_message_notifications?select=id&member_id=eq.'+encodeURIComponent(memberId)+'&audience=eq.'+audience+'&read_at=is.null&limit=500');
  return (rows||[]).length;
}
async function markRead(memberId,audience){
  const now=new Date().toISOString();
  await P.db('member_message_notifications?member_id=eq.'+encodeURIComponent(memberId)+'&audience=eq.'+audience+'&read_at=is.null',{
    method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({read_at:now})
  });
}
async function queueNotification(memberId,messageId,audience,kind,payload){
  try{
    await P.db('member_message_notifications',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({
      member_id:memberId,message_id:messageId,audience,kind:kind||'new_message',payload:payload||{}
    })});
  }catch(error){
    // Message persistence is authoritative. A duplicate notification must not
    // turn a successful send into a false failure.
    if(!(error&&Number(error.status)===409))throw error;
  }
}
async function insertMessage(memberId,senderRole,body,options){
  const thread=await ensureThread(memberId);const o=options||{};
  const payload={thread_id:thread.id,member_id:memberId,sender_role:senderRole,message_type:o.messageType||'message',body:text(body,2000)};
  if(o.requestType)payload.request_type=o.requestType;
  if(o.requestStatus)payload.request_status=o.requestStatus;
  if(o.metadata)payload.metadata=o.metadata;
  const rows=await P.db('member_messages',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
  if(!rows||!rows[0])throw new Error('Message was not saved');
  return rows[0];
}

const CURATION_MAX_BYTES=25*1024*1024;
const CURATION_MAX_DURATION=360.5;
async function removeCurationObject(path){path=String(path||'').trim();if(!path)return;const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';if(!key)return;const r=await fetch(MC.SUPABASE_URL+'/storage/v1/object/member-music',{method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})});if(!r.ok&&r.status!==404)throw new Error('Curated audio cleanup failed');}
function num(v,min,max,fallback){let n=Number(v);if(!Number.isFinite(n))n=Number(fallback)||0;return Math.max(min,Math.min(max,n))}
function extFor(name){const m=String(name||'track.mp3').match(/\.[a-zA-Z0-9]{2,5}$/);const ext=(m&&m[0]||'.mp3').toLowerCase();return ['.mp3','.m4a','.aac','.wav'].includes(ext)?ext:''}
async function curationRequest(memberId,requestId){
  if(!uuid(requestId))return null;const rows=await P.db('theme_curation_requests?select=*&id=eq.'+encodeURIComponent(requestId)+'&member_id=eq.'+encodeURIComponent(memberId)+'&limit=1');return rows&&rows[0]||null;
}
async function curationDetail(memberId,requestId){
  const req=await curationRequest(memberId,requestId);if(!req)return null;
  const links=await P.db('theme_curation_tracks?select=track_id,position&request_id=eq.'+encodeURIComponent(req.id)+'&order=position.asc&limit=20');
  let tracks=[];if(links&&links.length){const ids=links.map(x=>x.track_id).filter(uuid);if(ids.length){const rows=await P.db('member_music_tracks?select=id,status,title,artist,album,duration_s,file_size_bytes,created_at&id=in.('+ids.join(',')+')&member_id=eq.'+encodeURIComponent(memberId)+'&limit=30');const map=new Map((rows||[]).map(r=>[String(r.id),r]));tracks=links.map(l=>Object.assign({position:Number(l.position)||0},map.get(String(l.track_id))||{id:l.track_id,status:'missing',title:'Missing track'}));}}
  return {id:req.id,status:req.status,songCount:Number(req.song_count)||0,amountCents:Number(req.amount_cents)||0,favoriteArtists:req.favorite_artists||'',favoriteSongs:req.favorite_songs||'',vibe:req.vibe||'',motivation:req.motivation||'',placedAt:req.placed_at||'',deliveredAt:req.delivered_at||'',playlistId:req.playlist_id||'',tracks:tracks};
}
async function coachCurationUploadTicket(member,requestId,b){
  const req=await curationRequest(member.id,requestId);if(!req||!['paid','in_progress'].includes(req.status))return {code:409,body:{ok:false,error:'That Theme Curation is not ready for fulfillment.'}};
  const detail=await curationDetail(member.id,requestId);if(detail.tracks.length>=detail.songCount)return {code:409,body:{ok:false,error:'All paid song slots are already filled.'}};
  const size=Math.max(0,Number(b.fileSize)||0),duration=num(b.duration,0,CURATION_MAX_DURATION+1,0),ext=extFor(b.fileName);if(!size||size>CURATION_MAX_BYTES)return {code:400,body:{ok:false,error:'Choose an audio file under 25 MB.'}};if(!duration||duration>CURATION_MAX_DURATION)return {code:400,body:{ok:false,error:'Curated tracks must be 6 minutes or shorter.'}};if(!ext)return {code:400,body:{ok:false,error:'Use MP3, M4A, AAC, or WAV audio.'}};
  const current=await P.db('member_music_tracks?select=file_size_bytes,cover_size_bytes,status&member_id=eq.'+encodeURIComponent(member.id)+'&limit=100');const used=(current||[]).reduce((n,r)=>n+(Number(r.file_size_bytes)||0)+(Number(r.cover_size_bytes)||0),0);if(used+size>300*1024*1024)return {code:409,body:{ok:false,error:'That member’s 300 MB MAH PLAYER storage is full.'}};
  const id=crypto.randomUUID(),path='member/'+member.id+'/music/'+id+'/track'+ext,now=new Date().toISOString(),title=text(b.title||String(b.fileName||'').replace(/\.[^.]+$/,''),100)||'Curated Track';
  await P.db('member_music_tracks',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id:id,member_id:member.id,status:'pending',storage_path:path,title:title,artist:text(b.artist,100),album:'MAHFITT Curation',duration_s:duration,file_size_bytes:size,mime_type:text(b.contentType,80),created_at:now,updated_at:now})});
  try{const ticket=await MC.signedUpload('member-music',path,false);return {code:200,body:{ok:true,trackId:id,path:path,signedUrl:ticket.signedUrl}}}catch(e){await P.db('member_music_tracks?id=eq.'+id+'&member_id=eq.'+member.id,{method:'DELETE',headers:{Prefer:'return=minimal'}}).catch(()=>{});throw e}
}
async function coachCurationCommit(member,requestId,b){
  if(!uuid(b.trackId))return {code:400,body:{ok:false,error:'Curated track is unavailable.'}};const req=await curationRequest(member.id,requestId);if(!req||!['paid','in_progress'].includes(req.status))return {code:409,body:{ok:false,error:'That Theme Curation is not ready for fulfillment.'}};
  const rows=await P.db('member_music_tracks?select=*&id=eq.'+encodeURIComponent(b.trackId)+'&member_id=eq.'+encodeURIComponent(member.id)+'&limit=1');const track=rows&&rows[0];if(!track)return {code:404,body:{ok:false,error:'Curated track not found.'}};
  const now=new Date().toISOString();await P.db('member_music_tracks?id=eq.'+track.id+'&member_id=eq.'+member.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'ready',title:text(b.title,100)||track.title||'Curated Track',artist:text(b.artist,100),album:'MAHFITT Curation',updated_at:now})});
  await P.db('rpc/attach_theme_curation_track',{method:'POST',body:JSON.stringify({p_request_id:req.id,p_track_id:track.id})});return {code:200,body:{ok:true,detail:await curationDetail(member.id,req.id)}};
}
async function coachCurationDiscard(member,requestId,b){
  if(!uuid(b.trackId))return {code:400,body:{ok:false,error:'Curated track is unavailable.'}};const rows=await P.db('member_music_tracks?select=id,status,storage_path&member_id=eq.'+member.id+'&id=eq.'+b.trackId+'&limit=1');const track=rows&&rows[0];if(!track)return {code:200,body:{ok:true}};if(track.status!=='pending')return {code:409,body:{ok:false,error:'Committed curated tracks cannot be discarded here.'}};await P.db('member_music_tracks?id=eq.'+track.id+'&member_id=eq.'+member.id,{method:'DELETE',headers:{Prefer:'return=minimal'}});await removeCurationObject(track.storage_path).catch(()=>{});return {code:200,body:{ok:true}};
}
async function syncCurationDelivered(memberId,requestId,delivery){
  const rows=await P.db('member_messages?select=id,metadata&member_id=eq.'+encodeURIComponent(memberId)+'&request_type=eq.theme_curation&order=created_at.desc&limit=100');const linked=(rows||[]).find(r=>r&&r.metadata&&String(r.metadata.themeCurationRequestId||'')===String(requestId));if(linked)await P.db('member_messages?id=eq.'+linked.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({request_status:'resolved',updated_at:new Date().toISOString()})});const msg=await insertMessage(memberId,'system','Theme Curation delivered. Your '+Number(delivery.song_count||0)+'-song MAHFITT playlist is now inside MAH PLAYER.',{messageType:'system',metadata:{requestType:'theme_curation',themeCurationRequestId:requestId,status:'delivered',playlistId:delivery.playlist_id}});await queueNotification(memberId,msg.id,'member','request_update',{requestType:'theme_curation',themeCurationRequestId:requestId,status:'delivered',playlistId:delivery.playlist_id});
}
async function memberSummary(memberId){
  await ensureThread(memberId);
  const unread=await unreadCount(memberId,'member');
  const latest=await P.db('member_messages?select=id,sender_role,message_type,request_status,body,created_at&member_id=eq.'+encodeURIComponent(memberId)+'&order=created_at.desc,id.desc&limit=1');
  return {unread,latest:latest&&latest[0]?publicMessage(latest[0],'member'):null};
}
async function memberApi(event,b,a){
  const action=String(b.action||'summary');
  if(action==='summary')return out(200,{ok:true,summary:await memberSummary(a.memberId)});
  if(action==='curationStatus'){const rows=await P.db('theme_curation_requests?select=id,status,song_count,amount_cents,placed_at,delivered_at,playlist_id&member_id=eq.'+encodeURIComponent(a.memberId)+'&order=created_at.desc&limit=1');const r=rows&&rows[0]||null;return out(200,{ok:true,curation:r?{id:r.id,status:r.status,songCount:Number(r.song_count)||0,amountCents:Number(r.amount_cents)||0,placedAt:r.placed_at||'',deliveredAt:r.delivered_at||'',playlistId:r.playlist_id||''}:null});}
  if(action==='thread'){
    const thread=await ensureThread(a.memberId);await markRead(a.memberId,'member');
    return out(200,{ok:true,member:{id:a.memberId,name:fullName(a.member)},messages:await messagesFor(thread,'member'),unread:0});
  }
  if(action==='send'||action==='supportRequest'){
    const body=text(b.body,2000);if(!body)return out(400,{ok:false,error:'Write a message first.'});
    const support=action==='supportRequest';
    const row=await insertMessage(a.memberId,'member',body,support?{messageType:'support_request',requestType:'general_support',requestStatus:'pending'}:{});
    await queueNotification(a.memberId,row.id,'coach',support?'support_request':'new_message',{sender:'member'});
    return out(200,{ok:true,message:publicMessage(row,'member')});
  }
  return out(400,{ok:false,error:'Unknown member Message Center action.'});
}
async function coachBoot(){
  const members=await P.db('payment_vip_members?select=id,first_name,last_name,active,sesh_left,gym_only&active=eq.true&order=first_name.asc,last_name.asc&limit=10000');
  const threads=await P.db('member_message_threads?select=id,member_id,last_message_at,status,updated_at&order=updated_at.desc&limit=10000');
  const latest=await P.db('member_messages?select=id,member_id,sender_role,message_type,request_status,body,created_at&order=created_at.desc,id.desc&limit=2000');
  const pendingSupport=await P.db('member_messages?select=id,member_id&message_type=eq.support_request&request_status=eq.pending&limit=2000');
  const notes=await P.db('member_message_notifications?select=id,member_id,kind&audience=eq.coach&read_at=is.null&limit=2000');
  const tMap=new Map((threads||[]).map(t=>[String(t.member_id),t]));
  const lMap=new Map();(latest||[]).forEach(r=>{if(!lMap.has(String(r.member_id)))lMap.set(String(r.member_id),r)});
  const nMap=new Map();(notes||[]).forEach(n=>nMap.set(String(n.member_id),(nMap.get(String(n.member_id))||0)+1));
  const sMap=new Map();(pendingSupport||[]).forEach(r=>sMap.set(String(r.member_id),(sMap.get(String(r.member_id))||0)+1));
  const result=(members||[]).map(m=>({id:m.id,name:fullName(m),sessionsLeft:Math.max(0,Number(m.sesh_left)||0),gymOnly:m.gym_only===true,
    unread:nMap.get(String(m.id))||0,supportPending:sMap.get(String(m.id))||0,thread:tMap.get(String(m.id))||null,latest:lMap.get(String(m.id))?publicMessage(lMap.get(String(m.id)),'coach'):null}));
  result.sort((x,y)=>{if(y.unread!==x.unread)return y.unread-x.unread;return String(y.thread&&y.thread.last_message_at||'').localeCompare(String(x.thread&&x.thread.last_message_at||''))||x.name.localeCompare(y.name)});
  return result;
}
async function coachApi(b){
  const action=String(b.action||'coachBoot');
  if(action==='coachBoot')return out(200,{ok:true,members:await coachBoot()});
  if(!uuid(b.memberId))return out(400,{ok:false,error:'Choose a member first.'});
  const member=await memberRow(b.memberId);if(!member)return out(404,{ok:false,error:'That member is unavailable.'});
  if(action==='coachThread'){
    const thread=await ensureThread(member.id);await markRead(member.id,'coach');
    return out(200,{ok:true,member:{id:member.id,name:fullName(member)},messages:await messagesFor(thread,'coach')});
  }
  if(action==='coachSend'){
    const body=text(b.body,2000);if(!body)return out(400,{ok:false,error:'Write a message first.'});
    const row=await insertMessage(member.id,'coach',body,{});
    await queueNotification(member.id,row.id,'member','new_message',{sender:'coach'});
    return out(200,{ok:true,message:publicMessage(row,'coach')});
  }
  if(action==='coachCuration'){
    if(!uuid(b.requestId))return out(400,{ok:false,error:'Theme Curation request not found.'});const detail=await curationDetail(member.id,b.requestId);if(!detail)return out(404,{ok:false,error:'Theme Curation request not found.'});return out(200,{ok:true,detail:detail});
  }
  if(action==='coachCurationUploadTicket'){
    if(!uuid(b.requestId))return out(400,{ok:false,error:'Theme Curation request not found.'});const r=await coachCurationUploadTicket(member,b.requestId,b);return out(r.code,r.body);
  }
  if(action==='coachCurationCommit'){
    if(!uuid(b.requestId))return out(400,{ok:false,error:'Theme Curation request not found.'});const r=await coachCurationCommit(member,b.requestId,b);return out(r.code,r.body);
  }
  if(action==='coachCurationDiscard'){
    if(!uuid(b.requestId))return out(400,{ok:false,error:'Theme Curation request not found.'});const r=await coachCurationDiscard(member,b.requestId,b);return out(r.code,r.body);
  }
  if(action==='coachCurationDeliver'){
    if(!uuid(b.requestId))return out(400,{ok:false,error:'Theme Curation request not found.'});const result=await P.db('rpc/deliver_theme_curation',{method:'POST',body:JSON.stringify({p_request_id:b.requestId})});const delivery=Array.isArray(result)?result[0]:result;if(!delivery||!delivery.delivered)return out(409,{ok:false,error:'Theme Curation could not be delivered.'});await syncCurationDelivered(member.id,b.requestId,delivery);return out(200,{ok:true,delivery:delivery});
  }
  if(action==='resolveSupport'){
    if(!uuid(b.messageId))return out(400,{ok:false,error:'That support request is unavailable.'});
    const target=await P.db('member_messages?select=id,thread_id,member_id,message_type,request_type,request_status,metadata&member_id=eq.'+encodeURIComponent(member.id)+'&id=eq.'+encodeURIComponent(b.messageId)+'&limit=1');
    const request=target&&target[0];if(!request||request.message_type!=='support_request')return out(404,{ok:false,error:'Support request not found.'});
    if(request.request_type==='reschedule')return out(409,{ok:false,error:'Open Calendar Systems to approve or decline a reschedule request.'});
    if(request.request_type==='theme_curation')return out(409,{ok:false,error:'Open Theme Curation to fulfill and deliver this paid request.'});
    if(request.request_status!=='pending')return out(200,{ok:true,already:true});
    const now=new Date().toISOString();
    await P.db('member_messages?id=eq.'+encodeURIComponent(request.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({request_status:'resolved',updated_at:now})});
    const system=await insertMessage(member.id,'system','Coach marked the support request resolved.',{messageType:'system',metadata:{supportMessageId:request.id}});
    await queueNotification(member.id,system.id,'member','request_update',{requestId:request.id,status:'resolved'});
    return out(200,{ok:true});
  }
  return out(400,{ok:false,error:'Unknown coach Message Center action.'});
}

function coachShell(){
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    +'<meta name="robots" content="noindex,nofollow,noarchive"><meta name="theme-color" content="#0E1114"><meta name="color-scheme" content="dark">'
    +'<title>MAHFITT Message Center</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">'
    +'<link rel="stylesheet" href="/mahfitt-atmosphere.css?v='+V+'"><link rel="stylesheet" href="/coach-shell.css?v='+V+'&rc5c=1"><link rel="stylesheet" href="/message-center.css?v='+V+'"></head>'
    +'<body class="mc-coach" data-coach-surface="message-center"><main id="messageCenter" class="mc-loading">OPENING MESSAGE CENTER…</main><script defer src="/coach-shell.js?v='+V+'&rc5c=1"></script><script defer src="/message-center-client.js?v='+V+'"></script></body></html>';
}

exports.handler=async event=>{
  try{
    if(event.httpMethod==='GET'){
      if(!S.isAuthed(event))return {statusCode:302,headers:Object.assign({},P.SEC,{Location:'/admin'}),body:''};
      return {statusCode:200,headers:HH,body:coachShell()};
    }
    if(event.httpMethod!=='POST')return out(405,{ok:false,error:'Method not allowed.'});
    let b={};try{b=JSON.parse(event.body||'{}')}catch(e){return out(400,{ok:false,error:'Bad request.'})}
    if(S.isAuthed(event)&&String(b.action||'').indexOf('coach')===0)return await coachApi(b);
    if(S.isAuthed(event)&&String(b.action||'')==='resolveSupport')return await coachApi(b);
    const a=await actor(event,b);if(!a)return out(401,{ok:false,error:'Message Center sign-in expired.'});
    if(a.denied)return out(a.denied.status||403,{ok:false,code:a.denied.code||'CLIENT_OPERATION_FORBIDDEN',error:a.denied.error||'Messaging is not authorized for this client.'});
    if(a.who==='coach')return await coachApi(Object.assign({},b,{memberId:a.memberId}));
    return await memberApi(event,b,a);
  }catch(error){
    if(migrationMissing(error))return out(503,{ok:false,setupRequired:true,error:'Message Center needs Supabase migration 040 before first use.'});
    console.error('message-center',error&&error.message,error&&error.detail);
    return out(500,{ok:false,error:'Message Center is unavailable right now.'});
  }
};
