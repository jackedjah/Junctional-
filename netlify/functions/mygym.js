'use strict';
/* FOB SYSTEMS :: MY GYM
   Member-facing training surface. Identity is derived ONLY from the signed
   FOB member claim cookie after a successful full-name access check.
   No member id supplied by the browser is ever trusted. */
const crypto = require('crypto');
const P = require('./_payment');
const MC = require('./_member-community');
const Role = require('./_mahfitt-role-context');
let HS=null,RW=null,FAI=null,FRES=null,MPAI=null,COACHX=null;
function healthSync(){return HS||(HS=require('./_health-sync'))}
function retroworkAI(){return RW||(RW=require('./_retrowork-ai'))}
function fitnessAI(){return FAI||(FAI=require('./_mahfitt-ai'))}
function fitnessResearch(){return FRES||(FRES=require('./_mahfitt-research'))}
function coachExperience(){return COACHX||(COACHX=require('./_mahfitt-coach-experience'))}

const JSON_H = Object.assign({'Content-Type':'application/json'}, P.SEC);
/* YouTube's IFrame API now returns error 153 when the embedding request has
   no Referer/client identity. Keep the private API on no-referrer, but allow
   the My Gym document to send only its origin to third-party embeds. */
const HTML_H = Object.assign({}, P.SEC, {
  'Content-Type':'text/html; charset=utf-8',
  'Referrer-Policy':'strict-origin-when-cross-origin'
});
const V = 453;   /* MAHWORLD Phase 0: the shell gains the guarded MAHWORLD domain/shell scripts and mygym.js gains the guarded route, so the cache identity advances (R85A1 practice) */
const out=(code,body,extra)=>({statusCode:code,headers:Object.assign({},JSON_H,extra||{}),body:JSON.stringify(body)});
const uuid=v=>/^[0-9a-fA-F-]{36}$/.test(String(v||''));
const MY_COOKIE='fob_mygym';
/* R90 — personal-AI ownership never follows an authorized fitness-profile
   switch.  The UI also protects these routes, but the server is authoritative:
   a coach cannot consume/read/change a client's AI state by calling the action
   directly. */
const COACH_EXPERIENCE_ACTIONS=new Set(['coachToday','coachInbox','coachResources','coachResourceCreate','coachResourceAssign','coachResourceUnassign','coachResourceArchive','memberResources','habitList','habitCreate','habitUpdate','habitArchive','habitToggle']);
const CLIENT_CONTEXT_AI_ACTIONS=new Set([
  'fitnessAiState','fitnessAiClearHistory','fitnessAiAsk',
  'retroworkTranscribe','retroworkProgramInterpret','retroworkInterpret','retroworkCommit',
  'programCreatorDraft',
  'protocolFoundation','protocolContext','protocolPreferencesSave','protocolGenerate',
  'protocolVisualReview','protocolVisualClear','protocolSave','protocolArchive','protocolRestore',
  'protocolScheduleReview','protocolScheduleCommit','protocolScheduleRemove'
]);

function shell(){
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    +'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    +'<meta name="robots" content="noindex,nofollow,noarchive">'
    +'<meta name="theme-color" content="#0E1114"><meta name="color-scheme" content="dark">'
    +'<title>MAH GYM · FOB Systems</title>'
    +'<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32.png">'
    +'<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">'
    +'<link rel="preconnect" href="https://fonts.googleapis.com"><script>/* Boot warm-up: mygym.js is deferred, so the boot round trip could not even start until the bundle downloaded, parsed and ran. This fires the identical request now, in parallel with that download. Entry is recorded so boot() can verify a match; any mismatch, error or absence falls through to the normal request. */(function(){try{var q=new URLSearchParams(location.search||"");var e=q.get("entry")||"tracker";if(["slots","tracker","meals","calendar","coach"].indexOf(e)<0)e="tracker";var b={action:"boot",entry:e},p="";try{var c=JSON.parse(sessionStorage.getItem("fob.mahfitt.coachContext.v1")||"null");if(c&&/^[0-9a-fA-F-]{36}$/.test(String(c.profileId||""))){p=String(c.profileId);b.activeProfileId=p}}catch(x){}try{var t=localStorage.getItem("fob.mygym.memberToken");if(t)b.memberToken=t}catch(x){}window.__FOB_BOOT={entry:e,profile:p,p:fetch("/api/mygym",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(function(r){return r.json().then(function(d){return{status:r.status,data:d||{}}},function(){return{status:r.status,data:{}}})}).catch(function(){return null})};}catch(x){window.__FOB_BOOT=null}})();</script>'
    +'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    +'<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">'
    +'<link rel="stylesheet" href="/mahfitt-canonical-components.css?v='+V+'">'
    +'<link rel="stylesheet" href="/gym-app.css?v='+V+'&r48=1&r70=1">'
    +'<link rel="stylesheet" href="/mygym.css?v='+V+'&r=fc1&j3=crown-final1&p=phys3&job3=prefabi1&r4=6&r7=2&r45=1&r46=1&r48=1&r49=1&r50=1&r52=2&r55=1&r56=1&r57=1&r58=1&r59=1&r60=1&r61=1&r62=1&r63=1&r64=1&r65=1&r67=11&r68=1&r69=1&r70=2&postr70=horizon2&protocol=3&protocolworld=2&protocolparity=1&rc5c=1&r76=1&r77=1&r78=1&r79=1&r80=1&r81=1&r82=1&r83=1&r84=1&r85=1&r86=1&r87=1&r88=1&r89=2"><link rel="stylesheet" href="/meal-gradient.css?v='+V+'&r=fc2&j3=crown-final1&p=phys3&job3=master1&r4=5&r52=1&r54=1&r56=1&r70=1"><link rel="stylesheet" href="/music-studio.css?v='+V+'&r=fc1&j3=crown-final1&r44=1&r45=1&r46=1&r70=1"><link rel="stylesheet" href="/mahfitt-geometry.css?v='+V+'&r=fc2&j3=p0&r4=5&r65=1&r67=1"><link rel="stylesheet" href="/mahfitt-atmosphere.css?v='+V+'"><link rel="stylesheet" href="/mahworld/mahworld-menu.css?v='+V+'"><link rel="stylesheet" href="/mahfitt-banner.css?v='+V+'&r=fc2&j3=crown-final1&job3=prefabi1&r4=8&r6=1&volfix=1&fxclose=1&airclean=1&r16=1&r17=1&r19=1&r52=1&r53=1&r54=1&r55=1&r65=1&r67=8&postr67=crownfade1&r68=1&r69=1&r70=2">'
    +'<link rel="manifest" href="/manifest.webmanifest"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="MAHFITT"><meta name="mobile-web-app-capable" content="yes"><script>(function(){try{if(navigator.standalone||(matchMedia&&matchMedia("(display-mode: standalone)").matches))document.documentElement.dataset.mahfittStandalone="1"}catch(e){}})();</script></head><body class="mahfitt-member"><svg class="mahfitt-filter-defs" aria-hidden="true" width="0" height="0" focusable="false"><defs><filter id="mahfitt-exercise-duotone" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" result="mahLum" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .2126 .7152 .0722 0 0"/><feComponentTransfer in="mahLum" result="mahFigureMask"><feFuncA type="table" tableValues="1 1 1 .99 .97 .94 .9 .82 .08 0"/></feComponentTransfer><feComposite in="SourceGraphic" in2="mahFigureMask" operator="in" result="mahFigure"/><feComponentTransfer in="mahFigure" result="mahFigureBoost"><feFuncR type="gamma" amplitude="1.04" exponent=".94" offset=".01"/><feFuncG type="gamma" amplitude="1.04" exponent=".94" offset=".01"/><feFuncB type="gamma" amplitude="1.04" exponent=".94" offset=".01"/></feComponentTransfer><feMorphology in="mahFigureMask" operator="dilate" radius="1.15" result="mahFigureDilated"/><feComposite in="mahFigureDilated" in2="mahFigureMask" operator="out" result="mahOutlineMask"/><feFlood result="mahSecondaryPaint" style="flood-color:var(--mah-demo-secondary,#E9C98F)"/><feComposite in="mahSecondaryPaint" in2="mahOutlineMask" operator="in" result="mahOutline"/><feMerge><feMergeNode in="mahOutline"/><feMergeNode in="mahFigureBoost"/></feMerge></filter></defs></svg><main id="mygym"></main><script defer src="/gym-shared.js?v='+V+'"></script><script defer src="/mahfitt-ui-state.js?v='+V+'&r4=2&r46=1&r51=1&r67=1"></script><script defer src="/mahfitt-navigation.js?v='+V+'&r=job3-prefabi1"></script><script defer src="/meal-gradient.js?v='+V+'&r=fc2&j3=crown-final1&p=phys3&job3=prefabi1&r4=3&r52=1&r54=1&r55=1"></script><script defer src="/image-crop.js?v='+V+'"></script><script defer src="/qr-lite.js?v='+V+'"></script><script defer src="/exercise-visuals.js?v='+V+'"></script><script defer src="/mahfitt-health.js?v='+V+'"></script><script defer src="/mahfitt-atmosphere.js?v='+V+'"></script><script defer src="/mahfitt-listening.js?v='+V+'"></script><script defer src="/mahfitt-mmw.js?v='+V+'"></script><script>window.MAHWORLD_FLAGS={context:'+JSON.stringify(String(process.env.CONTEXT||'production'))+'};</script><script defer src="/mahworld/mahworld-domain.js?v='+V+'"></script><script defer src="/mahworld/mahworld-shell.js?v='+V+'"></script><script defer src="/mygym.js?v='+V+'&r=fc2&j3=crown-final1&job3=prefabi1&r4=6&r5=1&r7=1&air=1&pc=16c1bb5&fxclose=1&airclean=1&r16=1&r17=1&r18=1&r19=1&r20=1&r21=1&r22=1&r23=1&r24=1&r25=1&r26=1&r27=1&r28=1&r29=2&r30=1&r31=1&r32=1&r33=1&r34=1&r35=1&diag=9&r36=1&r37=1&r38=1&r39=1&r40=1&r41=1&r42=1&r43=1&r44=1&r45=1&r46=1&r48=1&r49=1&r50=1&r51=1&r52=2&r53=1&r54=1&r55=1&r56=1&r57=1&r58=1&r59=1&r60=1&r61=1&r62=1&r63=1&r64=1&r65=1&r67=9&r68=1&r70=2&protocol=3&protocolworld=2&protocolparity=1&rc5c=1&r76=1&r77=1&r78=1&r79=1&r80=1&r81=1&r82=1&r83=1&r84=1&r85=1&r86=1&r87=1&r88=1&r89=2"></script><script>if(\'serviceWorker\'in navigator){window.addEventListener(\'load\',function(){navigator.serviceWorker.register(\'/sw.js\',{updateViaCache:\'none\'}).then(function(r){return r.update();}).catch(function(){});});}</script></body></html>';
}

/* best-effort warm-instance throttling for the intentionally low-friction name gate */
const attempts=new Map();
function clientKey(event){const h=event.headers||{};return String(h['x-nf-client-connection-ip']||h['client-ip']||h['x-forwarded-for']||'unknown').split(',')[0].trim()}
function allowed(event){const k=clientKey(event),r=attempts.get(k),now=Date.now();if(!r||now-r.at>10*60*1000){attempts.set(k,{n:0,at:now});return true}return r.n<12}
function fail(event){const k=clientKey(event),r=attempts.get(k)||{n:0,at:Date.now()};r.n++;attempts.set(k,r)}
function clear(event){attempts.delete(clientKey(event))}

function rawCookie(headersIn,name){
  const raw=(headersIn&&(headersIn.cookie||headersIn.Cookie))||'';
  const f=raw.split(';').map(x=>x.trim()).find(x=>x.indexOf(name+'=')===0);
  return f?f.slice(name.length+1):'';
}
function myCookie(token){
  const bits=[MY_COOKIE+'='+token,'HttpOnly','Path=/','SameSite=Lax','Max-Age='+(12*3600)];
  if((process.env.CONTEXT||'production')==='production')bits.push('Secure');
  return bits.join('; ');
}
function clearMyCookie(){
  const bits=[MY_COOKIE+'=','HttpOnly','Path=/','SameSite=Lax','Max-Age=0'];
  if((process.env.CONTEXT||'production')==='production')bits.push('Secure');
  return bits.join('; ');
}
/* My Gym uses its own signed member token. It falls back to the already-required
   Supabase service key when SESSION_SECRET is not present. Earlier builds
   delegated to _payment.parseClaim(), which rejects every token when
   SESSION_SECRET is unset; login then looked successful but boot returned 401. */
function tokenSecret(){
  return String(process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
}
function tokenSign(payload){
  const sec=tokenSecret(); if(!sec) return '';
  return crypto.createHmac('sha256',sec).update(payload).digest('hex');
}
function memberToken(member){
  const payload=Buffer.from(JSON.stringify({id:member.id,exp:Date.now()+12*3600000,scope:'mygym'})).toString('base64url');
  const sig=tokenSign(payload); return sig?payload+'.'+sig:'';
}
function parseMemberToken(token){
  if(!token||!tokenSecret()) return null;
  const parts=String(token).split('.'); if(parts.length!==2) return null;
  const expected=tokenSign(parts[0]);
  try{
    const a=Buffer.from(parts[1]), b=Buffer.from(expected);
    if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) return null;
    const data=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
    return data&&data.scope==='mygym'&&data.exp>Date.now()?data:null;
  }catch(e){return null}
}
function claimFromRequest(event,b){
  const bodyToken=b&&b.memberToken?String(b.memberToken):'';
  return parseMemberToken(bodyToken)||parseMemberToken(rawCookie(event.headers||{},MY_COOKIE));
}
function withCookies(code,body,cookies){
  const r=out(code,body),list=(Array.isArray(cookies)?cookies:[cookies]).filter(Boolean);
  if(list.length)r.multiValueHeaders={'Set-Cookie':list};
  return r;
}
function withCookie(code,body,cookie){return withCookies(code,body,[cookie])}
async function memberFromClaim(event,b){
  const claim=claimFromRequest(event,b);
  if(!claim||!uuid(claim.id)) return null;
  return P.memberWithAccess(claim.id,'id,first_name,last_name,sesh_left,active,gym_only');
}

function fullName(m){return ((m.first_name||'')+' '+(m.last_name||'')).trim()}

/* My Gym appearance is member-owned and intentionally stored inside the
   existing Gym data store. A dedicated status keeps it out of workout,
   program and progress queries, all of which already filter their status.
   This makes the theme editor deployable with the site files alone. */
const FOB_TRACK_BPM=117.5;
const FOB_TRACK_BEAT_OFFSET=.557;
const THEME_DEFAULT={dark:'#0E1114',accent:'#E9C98F',preset:'fob-original',scene:'mesh',atmospherePalette:[],youtubeUrl:'',tiktokUrl:'',tiktokId:'',audioPath:'',audioUrl:'',audioSequence:[],bpm:FOB_TRACK_BPM,beatOffset:FOB_TRACK_BEAT_OFFSET,audioViz:[],playbackRate:1,reverb:false};
/* v354 — stable cassette transport. The client and persistence layer share the
   same 0.50x-2.00x envelope; saved legacy extremes are safely normalized. */
function themePlaybackRate(v){const n=Number(v);if(!isFinite(n))return 1;return Math.round(Math.max(.5,Math.min(2,n))*100)/100}
function themeHex(v,fallback){
  const s=String(v||'').trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(s)?s:fallback;
}
function themeAtmospherePalette(value){
  if(!Array.isArray(value))return[];const out=value.slice(0,6).map(v=>themeHex(v,'')).filter(Boolean);
  return out.length>=3?out:[];
}
const THEME_SCENES=new Set(['mesh','storm','waterfall','mountain','disco','space']);
function cleanThemeScene(value){value=String(value||'mesh').toLowerCase();return THEME_SCENES.has(value)?value:'mesh'}
function themeBpm(v,fallback){
  const n=Number(v);
  if(Number.isFinite(n)&&n>=45&&n<=220)return Math.round(n*10)/10;
  return Number(fallback)||0;
}
function themeBeatOffset(v,fallback){
  const n=Number(v);
  if(Number.isFinite(n)&&n>=0&&n<=360)return Math.round(n*1000)/1000;
  const f=Number(fallback);
  return Number.isFinite(f)&&f>=0&&f<=360?Math.round(f*1000)/1000:0;
}
function themeAudioPath(memberId,value){
  const path=String(value||'').trim().slice(0,500);
  const prefix='member/'+memberId+'/theme-audio/';
  return path.indexOf(prefix)===0&&/^[a-zA-Z0-9/_\-.]+$/.test(path)?path:'';
}
function themeAudioUrl(path){
  return path?MC.SUPABASE_URL+'/storage/v1/object/public/gym-exercise-media/'
    +path.split('/').map(encodeURIComponent).join('/'):'';
}
function themeAudioCoverPath(memberId,value){
  const path=String(value||'').trim().slice(0,500),prefix='member/'+memberId+'/theme-audio-cover/';
  return path.indexOf(prefix)===0&&/^[a-zA-Z0-9/_\-.]+$/.test(path)?path:'';
}
function themeAudioCoverUrl(path){
  return path?MC.SUPABASE_URL+'/storage/v1/object/public/gym-exercise-media/'+path.split('/').map(encodeURIComponent).join('/'):'';
}
async function removeThemeAudioCover(memberId,path){
  path=themeAudioCoverPath(memberId,path);if(!path)return false;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
  const response=await fetch(MC.SUPABASE_URL+'/storage/v1/object/gym-exercise-media',{method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})});
  if(!response.ok&&response.status!==404)throw new Error('Theme cover cleanup failed');return true;
}
async function removeThemeAudio(memberId,path){
  path=themeAudioPath(memberId,path);if(!path)return false;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
  const response=await fetch(MC.SUPABASE_URL+'/storage/v1/object/gym-exercise-media',{
    method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({prefixes:[path]})
  });
  if(!response.ok&&response.status!==404)throw new Error('Theme audio cleanup failed');
  return true;
}
function cleanTheme(raw,memberId){
  raw=raw&&typeof raw==='object'?raw:{};
  let youtubeUrl=String(raw.youtubeUrl||'').trim().slice(0,500);
  if(youtubeUrl&&!/^https:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\//i.test(youtubeUrl))youtubeUrl='';
  let tiktokUrl=String(raw.tiktokUrl||'').trim().slice(0,500);
  if(tiktokUrl&&!/^https:\/\/(?:www\.|m\.|vm\.|vt\.)?tiktok\.com\//i.test(tiktokUrl))tiktokUrl='';
  let tiktokId=String(raw.tiktokId||'').trim();if(!/^\d{10,25}$/.test(tiktokId))tiktokId=tiktokVideoId(tiktokUrl);
  const cleanTrackId=value=>uuid(String(value||'').trim())?String(value).toLowerCase():'';
  let musicTrackId=cleanTrackId(raw.musicTrackId),audioPath=memberId?themeAudioPath(memberId,raw.audioPath):'';
  let audioSequence=Array.isArray(raw.audioSequence)?raw.audioSequence.slice(0,12).map(item=>{
    item=item&&typeof item==='object'?item:{};const sharedId=cleanTrackId(item.musicTrackId),path=memberId?themeAudioPath(memberId,item.path):'',coverPath=memberId?themeAudioCoverPath(memberId,item.coverPath):'';
    if(sharedId)return{id:sharedId,musicTrackId:sharedId,path:'',audioUrl:'',coverPath,coverUrl:themeAudioCoverUrl(coverPath),title:musicText(item.title,80,'MAH PLAYER track'),duration:musicNumber(item.duration,0,360.5,0,2),bpm:themeBpm(item.bpm,0),beatOffset:themeBeatOffset(item.beatOffset,0),audioViz:cleanMusicViz(item.audioViz)};
    if(!path)return null;
    return{id:String(item.id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64),musicTrackId:'',path,audioUrl:themeAudioUrl(path),coverPath,coverUrl:themeAudioCoverUrl(coverPath),title:musicText(item.title,80,'Full Effects Audio'),duration:musicNumber(item.duration,0,360.5,0,2),bpm:themeBpm(item.bpm,0),beatOffset:themeBeatOffset(item.beatOffset,0),audioViz:cleanMusicViz(item.audioViz)};
  }).filter(Boolean):[];
  if(audioSequence.length){
    audioSequence=audioSequence.filter((item,index,array)=>array.findIndex(other=>(item.musicTrackId&&other.musicTrackId===item.musicTrackId)||(!item.musicTrackId&&other.path===item.path))===index).slice(0,12);
    const first=audioSequence[0];musicTrackId=first.musicTrackId||'';audioPath=first.path||'';
  }else if(musicTrackId)audioSequence=[{id:musicTrackId,musicTrackId,path:'',audioUrl:'',title:'MAH PLAYER track',duration:0,bpm:themeBpm(raw.bpm,0),beatOffset:themeBeatOffset(raw.beatOffset,0),audioViz:cleanMusicViz(raw.audioViz)}];
  else if(audioPath)audioSequence=[{id:'',musicTrackId:'',path:audioPath,audioUrl:themeAudioUrl(audioPath),title:'Full Effects Audio',duration:0,bpm:themeBpm(raw.bpm,0),beatOffset:themeBeatOffset(raw.beatOffset,0),audioViz:cleanMusicViz(raw.audioViz)}];
  if(musicTrackId||audioPath){youtubeUrl='';tiktokUrl='';tiktokId=''}else if(tiktokUrl){youtubeUrl=''}else if(youtubeUrl){tiktokUrl='';tiktokId=''}
  const customSource=!!(youtubeUrl||tiktokUrl||musicTrackId||audioPath);
  let bpm=themeBpm(raw.bpm,customSource?0:FOB_TRACK_BPM),beatOffset=themeBeatOffset(raw.beatOffset,customSource?0:FOB_TRACK_BEAT_OFFSET),audioViz=cleanMusicViz(raw.audioViz);
  if(audioSequence.length){const first=audioSequence[0];bpm=themeBpm(first.bpm,bpm);beatOffset=themeBeatOffset(first.beatOffset,beatOffset);if(first.audioViz.length)audioViz=first.audioViz.slice()}
  if(youtubeUrl||tiktokUrl){audioViz=[];audioSequence=[];musicTrackId='';audioPath=''}
  return {
    dark:themeHex(raw.dark,THEME_DEFAULT.dark),accent:themeHex(raw.accent,THEME_DEFAULT.accent),preset:String(raw.preset||'custom').replace(/[^a-z0-9-]/gi,'').slice(0,64)||'custom',scene:cleanThemeScene(raw.scene),atmospherePalette:themeAtmospherePalette(raw.atmospherePalette),
    youtubeUrl,tiktokUrl,tiktokId,musicTrackId,audioPath,audioUrl:themeAudioUrl(audioPath),audioSequence,bpm,beatOffset,audioViz,
    playbackRate:themePlaybackRate(raw.playbackRate),reverb:raw.reverb===true||raw.reverb==='true'||raw.reverb===1
  };
}
async function themeForMember(memberId){
  try{
    const rows=await P.db('gym_sessions?select=id,body,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.theme&order=updated_at.desc&limit=1');
    return rows&&rows[0]?cleanTheme(rows[0].body,memberId):null;
  }catch(e){
    console.warn('mygym theme read',e&&e.detail||e&&e.message);
    return null;
  }
}
async function saveThemeForMember(memberId,raw){
  const theme=cleanTheme(raw,memberId),now=new Date().toISOString();
  const rows=await P.db('gym_sessions?select=id,body&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.theme&order=updated_at.desc&limit=1');
  const previous=rows&&rows[0]?cleanTheme(rows[0].body,memberId):THEME_DEFAULT;
  if(rows&&rows[0]){
    await P.db('gym_sessions?id=eq.'+rows[0].id+'&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.theme',{
      method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({body:theme,updated_at:now})
    });
  }else{
    await P.db('gym_sessions',{
      method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({member_id:memberId,name:'My Gym Theme',status:'theme',body:theme,duration_s:0,updated_at:now})
    });
  }
  /* Full Effects Audio is now a member library. Changing the active theme must
     not delete the previous song; objects are removed only by an explicit
     library delete action. This is what makes returning to old theme audio and
     building a small sequence possible. */
  return theme;
}


/* ══ v381 — SAVED MEMBER THEMES ══════════════════════════════════════════
   Named visual+audio presets live in gym_sessions JSON, so this feature needs
   no schema migration and remains scoped to the authenticated member. */
const SAVED_THEME_STATUS='theme_saved_library';
const SAVED_THEME_LIMIT=18;
function cleanSavedThemeName(value,fallback){return musicText(value,48,fallback||'Saved Theme')}
function cleanSavedThemeLibrary(raw,memberId){
  raw=raw&&typeof raw==='object'?raw:{};const seen=new Set(),items=[];
  (Array.isArray(raw.items)?raw.items:[]).forEach(item=>{if(!item||typeof item!=='object'||items.length>=SAVED_THEME_LIMIT)return;const id=uuid(String(item.id||''))?String(item.id).toLowerCase():'';if(!id||seen.has(id))return;seen.add(id);items.push({id,name:cleanSavedThemeName(item.name,'Saved Theme'),theme:cleanTheme(item.theme,memberId),createdAt:String(item.createdAt||''),updatedAt:String(item.updatedAt||'')})});
  const order=(Array.isArray(raw.order)?raw.order:[]).map(x=>String(x||'').slice(0,90)).filter((id,i,a)=>id&&(uuid(id)||/^system:[a-z0-9_-]{1,70}$/i.test(id))&&a.indexOf(id)===i).slice(0,SAVED_THEME_LIMIT+24);
  return{items,order};
}
async function savedThemeLibraryForMember(memberId){let row=null;try{const rows=await P.db('gym_sessions?select=id,body,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.'+SAVED_THEME_STATUS+'&order=updated_at.desc&limit=1');row=rows&&rows[0]||null}catch(e){console.warn('saved theme library read',e&&e.message)}return{row,lib:cleanSavedThemeLibrary(row&&row.body,memberId)}}
async function saveSavedThemeLibrary(memberId,lib,row){lib=cleanSavedThemeLibrary(lib,memberId);const now=new Date().toISOString();if(row&&row.id)await P.db('gym_sessions?id=eq.'+row.id+'&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.'+SAVED_THEME_STATUS,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({body:lib,updated_at:now})});else await P.db('gym_sessions',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({member_id:memberId,name:'Saved MAHFITT Themes',status:SAVED_THEME_STATUS,body:lib,duration_s:0,updated_at:now})});return lib}
async function createSavedTheme(memberId,b){const loaded=await savedThemeLibraryForMember(memberId),lib=loaded.lib;if(lib.items.length>=SAVED_THEME_LIMIT)return{code:400,body:{ok:false,error:'Your Saved Themes row is full.'}};const now=new Date().toISOString(),item={id:crypto.randomUUID(),name:cleanSavedThemeName(b.name,'Saved Theme'),theme:cleanTheme(b.theme,memberId),createdAt:now,updatedAt:now};lib.items.push(item);await saveSavedThemeLibrary(memberId,lib,loaded.row);return{code:200,body:{ok:true,item,items:lib.items,order:lib.order}}}
async function updateSavedTheme(memberId,b){const loaded=await savedThemeLibraryForMember(memberId),lib=loaded.lib,id=String(b.id||'').toLowerCase();if(!uuid(id))return{code:400,body:{ok:false,error:'Saved theme not found.'}};const item=lib.items.find(x=>x.id===id);if(!item)return{code:404,body:{ok:false,error:'Saved theme not found.'}};item.name=cleanSavedThemeName(b.name,item.name);item.theme=cleanTheme(b.theme,memberId);item.updatedAt=new Date().toISOString();await saveSavedThemeLibrary(memberId,lib,loaded.row);return{code:200,body:{ok:true,item,items:lib.items,order:lib.order}}}
async function deleteSavedTheme(memberId,b){const loaded=await savedThemeLibraryForMember(memberId),lib=loaded.lib,id=String(b.id||'').toLowerCase();const before=lib.items.length;lib.items=lib.items.filter(item=>item.id!==id);if(lib.items.length===before)return{code:404,body:{ok:false,error:'Saved theme not found.'}};lib.order=lib.order.filter(x=>x!==id);await saveSavedThemeLibrary(memberId,lib,loaded.row);return{code:200,body:{ok:true,items:lib.items,order:lib.order}}}
async function reorderSavedThemes(memberId,b){const loaded=await savedThemeLibraryForMember(memberId),lib=loaded.lib;lib.order=(Array.isArray(b.order)?b.order:[]).map(x=>String(x||'').slice(0,90)).filter((id,i,a)=>id&&(uuid(id)||/^system:[a-z0-9_-]{1,70}$/i.test(id))&&a.indexOf(id)===i).slice(0,SAVED_THEME_LIMIT+24);await saveSavedThemeLibrary(memberId,lib,loaded.row);return{code:200,body:{ok:true,items:lib.items,order:lib.order}}}

/* ══ v370 — FULL EFFECTS AUDIO LIBRARY ═══════════════════════════════════
   The Theme editor keeps a deliberately small private-by-member catalogue in
   the existing gym_sessions JSON store. Audio objects stay in the same public
   CORS-capable bucket as the original one-song route so iOS/Web Audio can use
   them without introducing a second storage architecture. */
const THEME_AUDIO_LIBRARY_STATUS='theme_audio_library';
const THEME_AUDIO_MAX_BYTES=48*1024*1024;
const THEME_AUDIO_LIBRARY_LIMIT=30;
const THEME_AUDIO_LIBRARY_QUOTA=300*1024*1024;
function cleanThemeLibraryTrack(memberId,raw){
  raw=raw&&typeof raw==='object'?raw:{};const path=themeAudioPath(memberId,raw.path);if(!path)return null;
  const id=uuid(raw.id)?String(raw.id):crypto.createHash('sha1').update(path).digest('hex').slice(0,32),coverPath=themeAudioCoverPath(memberId,raw.coverPath);
  return{id,path,audioUrl:themeAudioUrl(path),coverPath,coverUrl:themeAudioCoverUrl(coverPath),title:musicText(raw.title,80,'Full Effects Audio'),duration:musicNumber(raw.duration,0,360.5,0,2),fileSize:Math.max(0,Math.min(THEME_AUDIO_MAX_BYTES,Number(raw.fileSize)||0)),bpm:themeBpm(raw.bpm,0),beatOffset:themeBeatOffset(raw.beatOffset,0),audioViz:cleanMusicViz(raw.audioViz),createdAt:String(raw.createdAt||new Date().toISOString()).slice(0,40)};
}
function cleanThemeLibrary(raw,memberId){
  raw=raw&&typeof raw==='object'?raw:{};const seen=new Set(),tracks=[];
  (Array.isArray(raw.tracks)?raw.tracks:[]).forEach(item=>{const t=cleanThemeLibraryTrack(memberId,item);if(t&&!seen.has(t.path)&&tracks.length<THEME_AUDIO_LIBRARY_LIMIT){seen.add(t.path);tracks.push(t)}});
  return{tracks};
}
async function themeAudioLibraryForMember(memberId){
  let row=null;try{const rows=await P.db('gym_sessions?select=id,body,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.'+THEME_AUDIO_LIBRARY_STATUS+'&order=updated_at.desc&limit=1');row=rows&&rows[0]||null}catch(e){console.warn('theme audio library read',e&&e.message)}
  const lib=cleanThemeLibrary(row&&row.body,memberId),theme=await themeForMember(memberId);
  /* Adopt a pre-v370 active upload into the catalogue once, without copying the
     object or disturbing the active theme. */
  if(theme&&theme.audioPath&&!lib.tracks.some(t=>t.path===theme.audioPath))lib.tracks.unshift(cleanThemeLibraryTrack(memberId,{path:theme.audioPath,title:'Current Full Effects Audio',duration:0,bpm:theme.bpm,beatOffset:theme.beatOffset,audioViz:theme.audioViz,createdAt:new Date().toISOString()}));
  return{row,lib:cleanThemeLibrary(lib,memberId)};
}
async function saveThemeAudioLibrary(memberId,lib,row){
  lib=cleanThemeLibrary(lib,memberId);const now=new Date().toISOString();
  if(row&&row.id)await P.db('gym_sessions?id=eq.'+row.id+'&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.'+THEME_AUDIO_LIBRARY_STATUS,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({body:lib,updated_at:now})});
  else await P.db('gym_sessions',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({member_id:memberId,name:'Full Effects Audio Library',status:THEME_AUDIO_LIBRARY_STATUS,body:lib,duration_s:0,updated_at:now})});
  return lib;
}
function publicThemeAudioLibrary(lib){return{tracks:(lib&&lib.tracks||[]).map(t=>Object.assign({},t,{audioUrl:themeAudioUrl(t.path),coverUrl:themeAudioCoverUrl(t.coverPath)})),limit:THEME_AUDIO_LIBRARY_LIMIT,quotaBytes:THEME_AUDIO_LIBRARY_QUOTA,usageBytes:(lib&&lib.tracks||[]).reduce((n,t)=>n+(Number(t.fileSize)||0),0)}}
async function themeAudioLibraryCommit(memberId,b){
  const loaded=await themeAudioLibraryForMember(memberId),lib=loaded.lib,path=themeAudioPath(memberId,b.path);if(!path)return{code:400,body:{ok:false,error:'Bad audio path.'}};
  const existing=lib.tracks.findIndex(t=>t.path===path),prior=existing>=0?lib.tracks[existing]:null;
  let track=cleanThemeLibraryTrack(memberId,{id:b.trackId,path,coverPath:prior&&prior.coverPath,title:b.title,duration:b.duration,fileSize:b.fileSize,bpm:b.bpm,beatOffset:b.beatOffset,audioViz:b.audioViz,createdAt:new Date().toISOString()});if(!track)return{code:400,body:{ok:false,error:'Bad audio track.'}};
  if(existing>=0)lib.tracks[existing]=track;else lib.tracks.unshift(track);
  const saved=await saveThemeAudioLibrary(memberId,lib,loaded.row);return{code:200,body:{ok:true,track:publicThemeAudioLibrary({tracks:[track]}).tracks[0],library:publicThemeAudioLibrary(saved)}};
}
async function themeAudioCoverCommit(memberId,b){
  const loaded=await themeAudioLibraryForMember(memberId),lib=loaded.lib,id=String(b.trackId||''),at=lib.tracks.findIndex(t=>t.id===id);if(at<0)return{code:404,body:{ok:false,error:'Audio track not found.'}};
  const path=themeAudioCoverPath(memberId,b.path);if(!path)return{code:400,body:{ok:false,error:'Bad cover path.'}};
  const prior=lib.tracks[at].coverPath||'';lib.tracks[at]=cleanThemeLibraryTrack(memberId,Object.assign({},lib.tracks[at],{coverPath:path}));const saved=await saveThemeAudioLibrary(memberId,lib,loaded.row);
  if(prior&&prior!==path)await removeThemeAudioCover(memberId,prior).catch(e=>console.warn('theme cover replace cleanup',e&&e.message));
  return{code:200,body:{ok:true,track:publicThemeAudioLibrary({tracks:[lib.tracks[at]]}).tracks[0],library:publicThemeAudioLibrary(saved)}};
}
async function themeWorkoutCoverCommit(memberId,b){
  const path=themeAudioCoverPath(memberId,b.path);if(!path)return{code:400,body:{ok:false,error:'Bad workout cover path.'}};
  const target=b&&b.target&&typeof b.target==='object'?b.target:{};const shared=uuid(String(target.musicTrackId||''))?String(target.musicTrackId).toLowerCase():'',id=String(target.id||''),audioPath=themeAudioPath(memberId,target.path);
  const theme=await themeForMember(memberId);if(!theme)return{code:404,body:{ok:false,error:'Theme not found.'}};
  let matched=false,prior='';theme.audioSequence=(theme.audioSequence||[]).map(item=>{const hit=(shared&&item.musicTrackId===shared)||(!shared&&id&&String(item.id||'')===id)||(!shared&&audioPath&&item.path===audioPath);if(!hit)return item;matched=true;prior=item.coverPath||'';return Object.assign({},item,{coverPath:path,coverUrl:themeAudioCoverUrl(path)})});
  if(!matched)return{code:404,body:{ok:false,error:'That Theme track is not active.'}};
  const saved=await saveThemeForMember(memberId,theme);if(prior&&prior!==path)await removeThemeAudioCover(memberId,prior).catch(e=>console.warn('theme workout cover replace cleanup',e&&e.message));return{code:200,body:{ok:true,theme:saved}};
}
async function themeAudioLibraryDelete(memberId,b){
  const loaded=await themeAudioLibraryForMember(memberId),lib=loaded.lib,id=String(b.trackId||''),at=lib.tracks.findIndex(t=>t.id===id);if(at<0)return{code:404,body:{ok:false,error:'Audio track not found.'}};
  const track=lib.tracks[at],theme=await themeForMember(memberId),used=new Set([theme&&theme.audioPath].concat((theme&&theme.audioSequence||[]).map(t=>t.path)).filter(Boolean));
  if(used.has(track.path))return{code:409,body:{ok:false,error:'Choose another active Theme audio before deleting this track.'}};
  lib.tracks.splice(at,1);await saveThemeAudioLibrary(memberId,lib,loaded.row);await removeThemeAudio(memberId,track.path).catch(e=>console.warn('theme library object cleanup',e&&e.message));if(track.coverPath)await removeThemeAudioCover(memberId,track.coverPath).catch(e=>console.warn('theme cover object cleanup',e&&e.message));return{code:200,body:{ok:true,library:publicThemeAudioLibrary(lib)}};
}

/* ══ v343 — PRIVATE MEMBER MUSIC STUDIO ═══════════════════════════════════
   Theme audio remains the lightweight one-song route above. The Studio is a
   separate private vault: every row and object path is derived from the
   authenticated member, and playback/cover URLs are short-lived signatures.
   A member id supplied by the browser is never used. */
const MUSIC_BUCKET='member-music';
const MUSIC_TRACK_LIMIT=60;
const MUSIC_TRACK_MAX_BYTES=25*1024*1024;
const MUSIC_COVER_MAX_BYTES=4*1024*1024;
const MUSIC_MEMBER_QUOTA_BYTES=300*1024*1024;
const MUSIC_MAX_DURATION=360.5;
function musicText(value,max,fallback){
  const clean=String(value==null?'':value).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
  return clean||String(fallback||'');
}
function musicNumber(value,min,max,fallback,places){
  let n=Number(value);if(!Number.isFinite(n))n=Number(fallback)||0;
  n=Math.max(min,Math.min(max,n));const p=Math.pow(10,places==null?2:places);return Math.round(n*p)/p;
}
function cleanMusicSettings(raw){
  raw=raw&&typeof raw==='object'?raw:{};const eq=raw.eq&&typeof raw.eq==='object'?raw.eq:{};
  const beats=[0,1,2,4,8,16].includes(Number(raw.loopBeats))?Number(raw.loopBeats):0;
  /* v387: the library category rides in this same member-owned JSON so
     EDIT AUDIOS needs no schema migration. This sanitizer is a WHITELIST --
     it silently drops anything not named here, which is exactly how v382 lost
     `pitch` -- so any new field must be listed explicitly. '' means the client
     has not classified this track yet and may apply its heuristic. */
  const category=['music','edit'].includes(String(raw.category||''))?String(raw.category):'';
  return{
    category,
    playbackRate:themePlaybackRate(raw.playbackRate),
    /* v383: true pitch was already emitted by the client but v382's server
       sanitizer accidentally dropped it on every save. Keep all Studio sound
       axes in the same member-owned JSON settings payload. */
    pitch:musicNumber(raw.pitch,-12,12,0,1),
    reverb:raw.reverb===true||raw.reverb==='true'||raw.reverb===1,
    vhs:raw.vhs===true||raw.vhs==='true'||raw.vhs===1,
    radio:raw.radio===true||raw.radio==='true'||raw.radio===1,
    eq:{low:musicNumber(eq.low,-12,12,0,1),mid:musicNumber(eq.mid,-12,12,0,1),high:musicNumber(eq.high,-12,12,0,1)},
    reverse:raw.reverse===true||raw.reverse==='true'||raw.reverse===1,
    loopBeats:beats,
    loopStart:musicNumber(raw.loopStart,0,MUSIC_MAX_DURATION,0,3)
  };
}
function cleanMusicViz(value){return Array.isArray(value)?value.slice(0,240).map(v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)))):[]}
function musicTrackPath(memberId,trackId,value,kind){
  if(!uuid(memberId)||!uuid(trackId))return'';
  const path=String(value||'').trim().slice(0,500),leaf=kind==='cover'?'cover':'track';
  const prefix='member/'+String(memberId).toLowerCase()+'/music/'+String(trackId).toLowerCase()+'/'+leaf;
  return path.indexOf(prefix)===0&&/^[a-zA-Z0-9/_\-.]+$/.test(path)&&!path.includes('..')?path:'';
}
async function musicUsageForMember(memberId){
  const rows=await P.db('member_music_tracks?select=id,file_size_bytes,cover_size_bytes,status&member_id=eq.'+memberId+'&limit=100');
  const used=(rows||[]).reduce((sum,row)=>sum+Math.max(0,Number(row.file_size_bytes)||0)+Math.max(0,Number(row.cover_size_bytes)||0),0);
  return{rows:rows||[],usedBytes:used,trackCount:(rows||[]).filter(row=>row.status==='ready'||row.status==='pending').length};
}
async function musicTrackForMember(memberId,trackId,status){
  if(!uuid(trackId))return null;
  const filter=status?'&status=eq.'+encodeURIComponent(status):'';
  const rows=await P.db('member_music_tracks?select=*&member_id=eq.'+memberId+'&id=eq.'+trackId+filter+'&limit=1');
  return rows&&rows[0]||null;
}
async function musicPlaylistForMember(memberId,playlistId){
  if(!uuid(playlistId))return null;
  const rows=await P.db('member_music_playlists?select=*&member_id=eq.'+memberId+'&id=eq.'+playlistId+'&limit=1');
  return rows&&rows[0]||null;
}
async function removeMusicObjects(paths){
  paths=(paths||[]).filter(Boolean);if(!paths.length)return;
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');if(!key)return;
  const response=await fetch(MC.SUPABASE_URL+'/storage/v1/object/'+MUSIC_BUCKET,{
    method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({prefixes:paths})
  });
  if(!response.ok&&response.status!==404)throw new Error('Music storage cleanup failed');
}
async function signedMusicPath(memberId,trackId,value,kind){
  const path=musicTrackPath(memberId,trackId,value,kind);if(!path)throw new Error('Music ownership mismatch');
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');if(!key)throw new Error('Music signing unavailable');
  const target=MC.SUPABASE_URL+'/storage/v1/object/sign/'+MUSIC_BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/');
  const response=await fetch(target,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:21600})});
  if(!response.ok)throw new Error('Music signing failed');
  const data=await response.json(),signed=String(data.signedURL||data.signedUrl||data.url||'');
  if(!signed)throw new Error('Music signing failed');
  if(/^https?:\/\//i.test(signed))return signed;
  if(signed.indexOf('/storage/v1/')===0)return MC.SUPABASE_URL+signed;
  return MC.SUPABASE_URL+'/storage/v1'+(signed[0]==='/'?'':'/')+signed;
}
function publicMusicTrack(row){
  const settings=cleanMusicSettings(row&&row.settings),id=String(row&&row.id||'');
  return{
    id,
    title:musicText(row&&row.title,100,'Untitled Track'),
    artist:musicText(row&&row.artist,100,''),
    album:musicText(row&&row.album,100,''),
    duration:musicNumber(row&&row.duration_s,0,MUSIC_MAX_DURATION,0,3),
    fileSize:Math.max(0,Number(row&&row.file_size_bytes)||0),
    bpm:themeBpm(row&&row.bpm,0),
    beatOffset:themeBeatOffset(row&&row.beat_offset,0),
    audioViz:cleanMusicViz(row&&row.audio_viz),
    settings,
    hasCover:!!(row&&row.cover_path),
    coverUrl:row&&row.cover_path?('/api/mygym?musicCover='+encodeURIComponent(id)+'&v='+encodeURIComponent(String(row.updated_at||''))):'',
    createdAt:row&&row.created_at||'',updatedAt:row&&row.updated_at||''
  };
}
async function musicLibraryForMember(memberId){
  try{
    const [tracks,playlists,state]=await Promise.all([
      P.db('member_music_tracks?select=*&member_id=eq.'+memberId+'&status=eq.ready&order=created_at.desc&limit='+MUSIC_TRACK_LIMIT),
      P.db('member_music_playlists?select=id,name,created_at,updated_at&member_id=eq.'+memberId+'&order=updated_at.desc&limit=30'),
      P.db('member_music_state?select=*&member_id=eq.'+memberId+'&limit=1')
    ]);
    const ids=(playlists||[]).map(row=>row.id),links=ids.length
      ?await P.db('member_music_playlist_tracks?select=playlist_id,track_id,position&playlist_id=in.('+ids.join(',')+')&order=position.asc&limit=1500')
      :[];
    const byPlaylist={};(links||[]).forEach(link=>{(byPlaylist[link.playlist_id]||(byPlaylist[link.playlist_id]=[])).push(String(link.track_id))});
    const trackList=(tracks||[]).map(publicMusicTrack),valid=new Set(trackList.map(track=>track.id)),s=state&&state[0]||{};
    const usage=(tracks||[]).reduce((sum,track)=>sum+Math.max(0,Number(track.file_size_bytes)||0)+Math.max(0,Number(track.cover_size_bytes)||0),0);
    return{available:true,tracks:trackList,playlists:(playlists||[]).map(row=>({id:String(row.id),name:musicText(row.name,60,'Playlist'),trackIds:(byPlaylist[row.id]||[]).filter(id=>valid.has(id)),updatedAt:row.updated_at||''})),usageBytes:usage,quotaBytes:MUSIC_MEMBER_QUOTA_BYTES,trackLimit:MUSIC_TRACK_LIMIT,currentTrackId:valid.has(String(s.current_track_id||''))?String(s.current_track_id):'',currentPlaylistId:String(s.current_playlist_id||''),shuffle:!!s.shuffle,repeatMode:['off','all','one'].includes(s.repeat_mode)?s.repeat_mode:'off',masterVolume:s.master_volume==null?null:musicNumber(s.master_volume,0,1,1,3)};
  }catch(e){
    console.warn('member music library unavailable',e&&e.detail||e&&e.message);
    return{available:false,needsSetup:true,tracks:[],playlists:[],usageBytes:0,quotaBytes:MUSIC_MEMBER_QUOTA_BYTES,trackLimit:MUSIC_TRACK_LIMIT,currentTrackId:'',currentPlaylistId:'',shuffle:false,repeatMode:'off'};
  }
}
async function musicUploadTicket(memberId,b){
  const size=Math.max(0,Number(b.fileSize)||0),duration=musicNumber(b.duration,0,MUSIC_MAX_DURATION+1,0,3),maxBytes=String(b.source||'')==='theme'?48*1024*1024:MUSIC_TRACK_MAX_BYTES;
  if(!size||size>maxBytes)return{code:400,body:{ok:false,error:'Choose an audio file under '+(maxBytes>MUSIC_TRACK_MAX_BYTES?'48':'25')+' MB.'}};
  if(!duration||duration>MUSIC_MAX_DURATION)return{code:400,body:{ok:false,error:'Studio tracks must be 6 minutes or shorter.'}};
  const rawName=String(b.fileName||'track.mp3').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-100),ext=(rawName.match(/\.[a-zA-Z0-9]{2,5}$/)||['.mp3'])[0].toLowerCase();
  if(!['.mp3','.m4a','.aac','.wav'].includes(ext))return{code:400,body:{ok:false,error:'Use MP3, M4A, AAC, or WAV audio.'}};
  const usage=await musicUsageForMember(memberId);
  if(usage.trackCount>=MUSIC_TRACK_LIMIT)return{code:400,body:{ok:false,error:'Your 60-track Studio library is full.'}};
  if(usage.usedBytes+size>MUSIC_MEMBER_QUOTA_BYTES)return{code:400,body:{ok:false,error:'Your 300 MB Studio storage is full.'}};
  const id=crypto.randomUUID(),path='member/'+memberId+'/music/'+id+'/track'+ext,now=new Date().toISOString();
  await P.db('member_music_tracks',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id,member_id:memberId,status:'pending',storage_path:path,title:musicText(b.title||rawName.replace(/\.[^.]+$/,''),100,'Untitled Track'),artist:'',album:'',duration_s:duration,file_size_bytes:size,mime_type:musicText(b.contentType,80,''),created_at:now,updated_at:now})});
  try{const ticket=await MC.signedUpload(MUSIC_BUCKET,path,false);return{code:200,body:{ok:true,trackId:id,path,signedUrl:ticket.signedUrl,usageBytes:usage.usedBytes,quotaBytes:MUSIC_MEMBER_QUOTA_BYTES}}}
  catch(e){await P.db('member_music_tracks?id=eq.'+id+'&member_id=eq.'+memberId,{method:'DELETE',headers:{Prefer:'return=minimal'}}).catch(()=>{});throw e}
}
async function musicCoverTicket(memberId,b){
  const track=await musicTrackForMember(memberId,b.trackId);if(!track)return{code:404,body:{ok:false,error:'Track not found.'}};
  const size=Math.max(0,Number(b.fileSize)||0);if(!size||size>MUSIC_COVER_MAX_BYTES)return{code:400,body:{ok:false,error:'Choose cover art under 4 MB.'}};
  const name=String(b.fileName||'cover.jpg'),ext=(name.match(/\.[a-zA-Z0-9]{2,5}$/)||['.jpg'])[0].toLowerCase();
  if(!['.jpg','.jpeg','.png','.webp'].includes(ext))return{code:400,body:{ok:false,error:'Use JPG, PNG, or WEBP cover art.'}};
  const path='member/'+memberId+'/music/'+track.id+'/cover'+ext,ticket=await MC.signedUpload(MUSIC_BUCKET,path,true);
  return{code:200,body:{ok:true,trackId:track.id,path,signedUrl:ticket.signedUrl}};
}
async function musicCommitTrack(memberId,b){
  const track=await musicTrackForMember(memberId,b.trackId);if(!track)return{code:404,body:{ok:false,error:'Track not found.'}};
  const now=new Date().toISOString(),bpm=themeBpm(b.bpm,0)||null,body={status:'ready',title:musicText(b.title,100,'Untitled Track'),artist:musicText(b.artist,100,''),album:musicText(b.album,100,''),bpm,beat_offset:themeBeatOffset(b.beatOffset,0),audio_viz:cleanMusicViz(b.audioViz),settings:cleanMusicSettings(b.settings),updated_at:now};
  const rows=await P.db('member_music_tracks?id=eq.'+track.id+'&member_id=eq.'+memberId,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
  return{code:200,body:{ok:true,track:publicMusicTrack(rows&&rows[0]||Object.assign({},track,body))}};
}
async function musicSaveCover(memberId,b){
  const track=await musicTrackForMember(memberId,b.trackId);if(!track)return{code:404,body:{ok:false,error:'Track not found.'}};
  const path=musicTrackPath(memberId,track.id,b.path,'cover');if(!path)return{code:403,body:{ok:false,error:'Bad cover path.'}};
  const old=track.cover_path,now=new Date().toISOString();
  await P.db('member_music_tracks?id=eq.'+track.id+'&member_id=eq.'+memberId,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({cover_path:path,cover_size_bytes:Math.min(MUSIC_COVER_MAX_BYTES,Math.max(0,Number(b.fileSize)||0)),updated_at:now})});
  if(old&&old!==path)removeMusicObjects([old]).catch(()=>{});
  return{code:200,body:{ok:true,coverUrl:'/api/mygym?musicCover='+encodeURIComponent(track.id)+'&v='+encodeURIComponent(now)}};
}
async function musicUpdateTrack(memberId,b){
  const track=await musicTrackForMember(memberId,b.trackId,'ready');if(!track)return{code:404,body:{ok:false,error:'Track not found.'}};
  const body={updated_at:new Date().toISOString()};
  if(Object.prototype.hasOwnProperty.call(b,'title'))body.title=musicText(b.title,100,'Untitled Track');
  if(Object.prototype.hasOwnProperty.call(b,'artist'))body.artist=musicText(b.artist,100,'');
  if(Object.prototype.hasOwnProperty.call(b,'album'))body.album=musicText(b.album,100,'');
  if(Object.prototype.hasOwnProperty.call(b,'bpm'))body.bpm=themeBpm(b.bpm,0)||null;
  if(Object.prototype.hasOwnProperty.call(b,'beatOffset'))body.beat_offset=themeBeatOffset(b.beatOffset,0);
  if(Object.prototype.hasOwnProperty.call(b,'settings'))body.settings=cleanMusicSettings(b.settings);
  const rows=await P.db('member_music_tracks?id=eq.'+track.id+'&member_id=eq.'+memberId,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
  return{code:200,body:{ok:true,track:publicMusicTrack(rows&&rows[0]||Object.assign({},track,body))}};
}
async function musicDeleteTrack(memberId,trackId){
  const track=await musicTrackForMember(memberId,trackId);if(!track)return{code:404,body:{ok:false,error:'Track not found.'}};
  await P.db('member_music_tracks?id=eq.'+track.id+'&member_id=eq.'+memberId,{method:'DELETE',headers:{Prefer:'return=minimal'}});
  removeMusicObjects([track.storage_path,track.cover_path]).catch(e=>console.warn('music cleanup',e&&e.message));
  return{code:200,body:{ok:true}};
}
async function musicCreatePlaylist(memberId,b){
  const name=musicText(b.name,60,'New Playlist'),rows=await P.db('member_music_playlists',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({member_id:memberId,name,updated_at:new Date().toISOString()})});
  return{code:200,body:{ok:true,playlist:{id:String(rows&&rows[0]&&rows[0].id||''),name,trackIds:[]}}};
}
async function musicSetPlaylistTracks(memberId,b){
  const playlist=await musicPlaylistForMember(memberId,b.playlistId);if(!playlist)return{code:404,body:{ok:false,error:'Playlist not found.'}};
  const ids=Array.from(new Set((Array.isArray(b.trackIds)?b.trackIds:[]).filter(uuid).map(String))).slice(0,200);
  if(ids.length){const owned=await P.db('member_music_tracks?select=id&member_id=eq.'+memberId+'&status=eq.ready&id=in.('+ids.join(',')+')&limit=200'),valid=new Set((owned||[]).map(row=>String(row.id)));if(ids.some(id=>!valid.has(id)))return{code:403,body:{ok:false,error:'A playlist track is unavailable.'}}}
  await P.db('member_music_playlist_tracks?playlist_id=eq.'+playlist.id,{method:'DELETE',headers:{Prefer:'return=minimal'}});
  if(ids.length)await P.db('member_music_playlist_tracks',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(ids.map((trackId,position)=>({playlist_id:playlist.id,track_id:trackId,position})))});
  await P.db('member_music_playlists?id=eq.'+playlist.id+'&member_id=eq.'+memberId,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({updated_at:new Date().toISOString()})});
  return{code:200,body:{ok:true,trackIds:ids}};
}
async function listeningFlush(memberId,b){
  const batchId=String(b.batchId||'').trim(),rows=Array.isArray(b.rows)?b.rows:[],days=Array.isArray(b.days)?b.days:[],hours=Array.isArray(b.hours)?b.hours:[];
  if(!uuid(batchId)||(rows.length<1&&days.length<1&&hours.length<1)||rows.length>80||days.length>40||hours.length>72)return{code:400,body:{ok:false,error:'Invalid listening batch.'}};
  try{
    const result=await P.db('rpc/merge_member_listening_batch',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_member_id:memberId,p_batch_id:batchId,p_rows:{tracks:rows,days:days,hours:hours}})});
    const value=Array.isArray(result)?result[0]:result;return{code:200,body:Object.assign({ok:true},value&&typeof value==='object'?value:{})};
  }catch(e){
    const detail=String(e&&e.detail||e&&e.message||'');
    if(/merge_member_listening_batch|member_listening_|schema cache|does not exist|PGRST202/i.test(detail))return{code:503,body:{ok:false,needsSetup:true,error:'Listening Intelligence is waiting for migration 047.'}};
    throw e;
  }
}

function listeningMonthKey(value){
  const m=/^(\d{4})-(\d{2})$/.exec(String(value||''));if(!m)return'';const y=+m[1],mo=+m[2];if(y<2020||y>2200||mo<1||mo>12)return'';
  const requested=new Date(Date.UTC(y,mo-1,1)),now=new Date(),current=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)),oldest=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-23,1));
  return requested>=oldest&&requested<=current?m[1]+'-'+m[2]:'';
}
function nextListeningMonth(month){const m=/^(\d{4})-(\d{2})$/.exec(month);const d=new Date(Date.UTC(+m[1],+m[2],1));return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')}
function publicListeningMonthRow(row){return{trackKey:String(row.track_key||''),sourceType:String(row.source_type||''),scene:String(row.scene||'mesh'),themeKey:String(row.theme_key||''),themeLabel:String(row.theme_label||''),workoutContext:String(row.workout_context||'none'),title:String(row.title||'MAHFITT Audio'),artist:String(row.artist||''),listenedSeconds:Number(row.listened_seconds)||0,starts:Number(row.starts)||0,completions:Number(row.completions)||0,skips:Number(row.skips)||0,replays:Number(row.replays)||0,workoutSeconds:Number(row.workout_seconds)||0,reverbSeconds:Number(row.reverb_seconds)||0,vhsSeconds:Number(row.vhs_seconds)||0,radioSeconds:Number(row.radio_seconds)||0,pitchSeconds:Number(row.pitch_seconds)||0,speedSeconds:Number(row.speed_seconds)||0,effectSampleSeconds:Number(row.effect_sample_seconds)||0}}
async function listeningMonth(memberId,b){
  const month=listeningMonthKey(b.month);if(!month)return{code:400,body:{ok:false,error:'Choose a valid recent month.'}};const start=month+'-01',next=nextListeningMonth(month),id=encodeURIComponent(memberId),date=encodeURIComponent(start);
  try{
    const [tracks,days,hours]=await Promise.all([
      P.db('member_listening_monthly?select=track_key,source_type,scene,theme_key,theme_label,workout_context,title,artist,listened_seconds,starts,completions,skips,replays,workout_seconds,reverb_seconds,vhs_seconds,radio_seconds,pitch_seconds,speed_seconds,effect_sample_seconds&member_id=eq.'+id+'&month=eq.'+date+'&order=listened_seconds.desc&limit=5000'),
      P.db('member_listening_daily?select=day,listened_seconds,workout_seconds&member_id=eq.'+id+'&day=gte.'+encodeURIComponent(start)+'&day=lt.'+encodeURIComponent(next+'-01')+'&order=day.asc&limit=40'),
      P.db('member_listening_monthly_hours?select=hour_of_day,listened_seconds,workout_seconds&member_id=eq.'+id+'&month=eq.'+date+'&order=hour_of_day.asc&limit=24')
    ]);
    return{code:200,body:{ok:true,month,rows:(tracks||[]).map(publicListeningMonthRow),days:(days||[]).map(r=>({day:String(r.day||''),listenedSeconds:Number(r.listened_seconds)||0,workoutSeconds:Number(r.workout_seconds)||0})),hours:(hours||[]).map(r=>({hour:Number(r.hour_of_day)||0,listenedSeconds:Number(r.listened_seconds)||0,workoutSeconds:Number(r.workout_seconds)||0}))}};
  }catch(e){
    const detail=String(e&&e.detail||e&&e.message||'');if(/member_listening_|schema cache|does not exist|PGRST/i.test(detail))return{code:503,body:{ok:false,needsSetup:true,error:'MAHFITT Month Wrapped is waiting for Listening Intelligence setup.'}};throw e;
  }
}
async function musicSaveState(memberId,b){
  let trackId=uuid(b.currentTrackId)?String(b.currentTrackId):null,playlistId=uuid(b.currentPlaylistId)?String(b.currentPlaylistId):null;
  if(trackId&&!await musicTrackForMember(memberId,trackId,'ready'))trackId=null;
  if(playlistId&&!await musicPlaylistForMember(memberId,playlistId))playlistId=null;
  const state={member_id:memberId,current_track_id:trackId,current_playlist_id:playlistId,shuffle:!!b.shuffle,repeat_mode:['off','all','one'].includes(b.repeatMode)?b.repeatMode:'off',master_volume:musicNumber(b.masterVolume,0,1,1,3),updated_at:new Date().toISOString()};
  const target='member_music_state?on_conflict=member_id',options={method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'}};
  try{await P.db(target,Object.assign({},options,{body:JSON.stringify(state)}))}
  catch(e){
    /* v411 deploy-order compatibility: the UI remembers Volume locally even if
       046 has not been installed yet. Retry only the exact missing-column case;
       never mask an unrelated database failure. */
    const detail=JSON.stringify(e&&e.detail||'')+' '+String(e&&e.message||'');
    if(!/master_volume|PGRST204/i.test(detail))throw e;
    const legacy=Object.assign({},state);delete legacy.master_volume;
    await P.db(target,Object.assign({},options,{body:JSON.stringify(legacy)}));
  }
  return{code:200,body:{ok:true}};
}

async function musicCoverRedirect(event,trackId){
  const member=await memberFromClaim(event,{});if(!member)return{statusCode:401,headers:JSON_H,body:''};
  const track=await musicTrackForMember(member.id,trackId,'ready');if(!track||!track.cover_path)return{statusCode:404,headers:JSON_H,body:''};
  const url=await signedMusicPath(member.id,track.id,track.cover_path,'cover');
  return{statusCode:302,headers:Object.assign({},P.SEC,{Location:url,'Cache-Control':'private, max-age=300','Referrer-Policy':'no-referrer'}),body:''};
}
async function musicTrackRedirect(event,trackId){
  const member=await memberFromClaim(event,{});if(!member)return{statusCode:401,headers:JSON_H,body:''};
  const track=await musicTrackForMember(member.id,trackId,'ready');if(!track||!track.storage_path)return{statusCode:404,headers:JSON_H,body:''};
  const url=await signedMusicPath(member.id,track.id,track.storage_path,'track');
  return{statusCode:302,headers:Object.assign({},P.SEC,{Location:url,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}),body:''};
}
async function musicActionResponse(run){
  try{const result=await run();return out(result.code||200,result.body||{ok:true})}
  catch(e){console.warn('member music action',e&&e.detail||e&&e.message);return out(503,{ok:false,error:'Music Studio needs its one-time database setup.'})}
}

/* Read member programs through the same primary + compatibility path as the
   coach tracker. A missing/older program table must never bounce a valid member
   back to the login screen. */

/* ══ v316 — automatic YouTube BPM metadata lookup ════════════════════════
   YouTube's iframe does not expose raw audio to this page. For YouTube themes
   we identify the video, read its public title/author metadata, then query a
   BPM catalogue server-side. The API key never reaches the browser. Uncertain
   matches never auto-apply: Tap BPM remains the safe fallback. */
const THEME_BPM_CACHE=new Map();
function youtubeVideoId(value){
  try{
    const u=new URL(String(value||'').trim());
    const host=u.hostname.toLowerCase().replace(/^www\./,'').replace(/^m\./,'').replace(/^music\./,'');
    let id='';
    if(host==='youtu.be') id=u.pathname.split('/').filter(Boolean)[0]||'';
    else if(host==='youtube.com'||host.endsWith('.youtube.com')){
      id=u.searchParams.get('v')||'';
      if(!id){const parts=u.pathname.split('/').filter(Boolean);if(['shorts','embed','live'].includes(parts[0]))id=parts[1]||'';}
    }
    return /^[A-Za-z0-9_-]{6,20}$/.test(id)?id:'';
  }catch(e){return''}
}
function tiktokVideoId(value){
  const m=String(value||'').match(/\/(?:video|player\/v1)\/(\d{10,25})(?:[/?#]|$)/i);return m?m[1]:'';
}
function tiktokSafeUrl(value){
  try{
    const u=new URL(String(value||'').trim()),host=u.hostname.toLowerCase();
    if(u.protocol!=='https:'||!(host==='tiktok.com'||host.endsWith('.tiktok.com')))return'';
    return u.href;
  }catch(e){return''}
}
function htmlText(value){return String(value||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(m,n)=>String.fromCharCode(Number(n)||32)).replace(/\s+/g,' ').trim()}
function tiktokIdFromHtml(html){
  html=String(html||'');
  const patterns=[
    /data-video-id=["'](\d{10,25})["']/i,
    /\/(?:video|player\/v1)\/(\d{10,25})(?:[/?#"'\\]|$)/i,
    /["'](?:itemId|item_id|videoId|video_id|aweme_id)["']\s*[:=]\s*["']?(\d{10,25})["']?/i,
    /\\u002Fvideo\\u002F(\d{10,25})/i,
    /\\\/video\\\/(\d{10,25})/i
  ];
  for(const re of patterns){const m=html.match(re);if(m)return m[1]}
  return'';
}
function tiktokCanonicalFromHtml(html,base){
  html=String(html||'');
  const candidates=[];
  const canonical=html.match(/<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=["']([^"']+)["']/i)||html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*canonical[^"']*["']/i);
  const og=html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)||html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i);
  const direct=html.match(/https?:\/\/(?:www\.)?tiktok\.com\/@[^"'<>\s\\]+\/video\/\d{10,25}[^"'<>\s\\]*/i);
  if(canonical)candidates.push(canonical[1]);if(og)candidates.push(og[1]);if(direct)candidates.push(direct[0]);
  for(let raw of candidates){
    raw=String(raw||'').replace(/&amp;/g,'&').replace(/\\u002F/g,'/').replace(/\\\//g,'/');
    try{raw=new URL(raw,base||'https://www.tiktok.com/').href}catch(e){}
    const safe=tiktokSafeUrl(raw);if(safe&&tiktokVideoId(safe))return safe;
  }
  return'';
}
function tiktokRedirectHeaders(){return{
  'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language':'en-US,en;q=0.9',
  'Cache-Control':'no-cache'
}}
async function tiktokManualRedirect(value,method){
  let current=tiktokSafeUrl(value);if(!current)return{url:'',id:'',html:''};
  for(let hop=0;hop<8;hop++){
    const ctrl=typeof AbortController!=='undefined'?new AbortController():null,timer=ctrl?setTimeout(()=>ctrl.abort(),3500):null;
    try{
      const r=await fetch(current,{method:method||'HEAD',redirect:'manual',headers:tiktokRedirectHeaders(),...(ctrl?{signal:ctrl.signal}:{})});
      const location=String(r&&r.headers&&r.headers.get&&r.headers.get('location')||'').trim();
      if(location){
        let next='';try{next=tiktokSafeUrl(new URL(location,current).href)}catch(e){}if(!next)break;
        current=next;const id=tiktokVideoId(current);if(id)return{url:current,id,html:''};continue;
      }
      let html='';
      if((method||'HEAD')==='GET')try{
        const len=Number(r&&r.headers&&r.headers.get&&r.headers.get('content-length'))||0;
        if(!len||len<=1500000)html=await r.text();
      }catch(e){}
      const canonical=tiktokCanonicalFromHtml(html,current),id=tiktokVideoId(canonical)||tiktokIdFromHtml(html)||tiktokVideoId(current);
      return{url:canonical||current,id,html};
    }catch(e){return{url:current,id:tiktokVideoId(current),html:''}}
    finally{if(timer)clearTimeout(timer)}
  }
  return{url:current,id:tiktokVideoId(current),html:''};
}
async function tiktokResolveShareUrl(value){
  const input=tiktokSafeUrl(value);if(!input)throw new Error('BAD_TIKTOK_URL');
  const direct=tiktokVideoId(input);if(direct)return{url:input,id:direct};

  /* Short TikTok share URLs are ordinary redirectors, but serverless egress can
     receive different anti-bot responses than a phone browser. Resolve the
     redirect headers first (HEAD, then GET) before falling back to a followed
     document request. This avoids depending on TikTok returning a full HTML
     page just to recover the public numeric post ID. */
  let resolved=await tiktokManualRedirect(input,'HEAD');
  if(resolved.id)return resolved;
  resolved=await tiktokManualRedirect(resolved.url||input,'GET');
  if(resolved.id)return resolved;

  const ctrl=typeof AbortController!=='undefined'?new AbortController():null;
  const timer=ctrl?setTimeout(()=>ctrl.abort(),7000):null;
  try{
    const r=await fetch(resolved.url||input,{method:'GET',redirect:'follow',headers:tiktokRedirectHeaders(),...(ctrl?{signal:ctrl.signal}:{})});
    const finalUrl=tiktokSafeUrl(r&&r.url||'')||resolved.url||input;
    let id=tiktokVideoId(finalUrl),html='';if(id)return{url:finalUrl,id};
    try{const len=Number(r&&r.headers&&r.headers.get&&r.headers.get('content-length'))||0;if(!len||len<=1500000)html=await r.text()}catch(e){}
    const canonical=tiktokCanonicalFromHtml(html,finalUrl);id=tiktokVideoId(canonical)||tiktokIdFromHtml(html);
    return{url:canonical||finalUrl,id:id||''};
  }catch(e){}
  finally{if(timer)clearTimeout(timer)}
  const fallback=await tiktokPublicRedirectFallback(resolved.url||input);
  if(fallback.id)return fallback;
  return{url:resolved.url||input,id:resolved.id||''};
}
async function tiktokPublicRedirectFallback(value){
  const input=tiktokSafeUrl(value);if(!input)return{url:'',id:''};
  try{
    const data=await fetchJsonTimed('https://api.domainee.dev/v1/tools/redirect-checker?url='+encodeURIComponent(input),{headers:{'Accept':'application/json'}},6500);
    const finalUrl=tiktokSafeUrl(data&&data.ok&&data.data&&data.data.finalUrl||''),id=tiktokVideoId(finalUrl);
    if(finalUrl&&id)return{url:finalUrl,id};
  }catch(e){}
  return{url:input,id:''};
}
async function tiktokOembed(url){
  return fetchJsonTimed('https://www.tiktok.com/oembed?url='+encodeURIComponent(url),{headers:{
    'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
    'Accept':'application/json,text/plain,*/*'
  }},6500);
}
async function tiktokPublicMetadata(url){
  const input=tiktokSafeUrl(url);if(!input)throw new Error('BAD_TIKTOK_URL');
  let canonical=input,id=tiktokVideoId(input),data=null,html='';

  /* Ask TikTok's public oEmbed endpoint first. Some short/share links are
     accepted there directly; when they are not, resolve the redirect chain and
     retry with the canonical post URL. */
  try{data=await tiktokOembed(input)}catch(e){}
  html=String(data&&data.html||'');
  id=id||tiktokIdFromHtml(html);
  const oembedCanonical=tiktokCanonicalFromHtml(html,input);
  if(oembedCanonical){canonical=oembedCanonical;id=id||tiktokVideoId(canonical)}

  if(!id){
    try{
      const resolved=await tiktokResolveShareUrl(input);
      canonical=resolved.url||canonical;id=resolved.id||tiktokVideoId(canonical)||'';
    }catch(e){}
  }

  /* If the first oEmbed call was a short URL or returned no useful markup,
     retry against the resolved canonical URL. A valid numeric ID is enough for
     playback even if metadata is temporarily unavailable; BPM then falls back
     to Tap BPM instead of rejecting the theme source. */
  if((!data||!html||!tiktokIdFromHtml(html))&&canonical&&canonical!==input){
    try{data=await tiktokOembed(canonical);html=String(data&&data.html||'')}catch(e){}
  }

  id=id||tiktokVideoId(canonical)||tiktokIdFromHtml(html);
  if(!id)throw new Error('BAD_TIKTOK_URL');
  let soundTitle='';
  const musicAnchor=html.match(/<a[^>]+href=["'][^"']*\/music\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
  const sm=musicAnchor||html.match(/title=["']([^"']*♬[^"']*)["']/i)||html.match(/>\s*(♬[^<]+)<\/a>/i);
  if(sm)soundTitle=htmlText(sm[1]);
  return{id:String(id),canonicalUrl:canonical,title:String(data&&data.title||''),author_name:String(data&&data.author_name||''),soundTitle:soundTitle};
}

function parseTikTokTrack(meta){
  let sound=String(meta&&meta.soundTitle||'').replace(/^\s*♬\s*/,'').trim(),raw=[sound,String(meta&&meta.title||'')].filter(Boolean).join(' ');
  if(!sound||/^original\s+sound\s*-/i.test(sound))return{title:'',artist:'',rawTitle:raw,reason:'original-sound'};
  let title=sound,artist='';const parts=sound.split(/\s+[\-–—]\s+/).map(x=>x.trim()).filter(Boolean);
  if(parts.length>=2){title=parts[0];artist=parts.slice(1).join(' - ')}
  return{title:cleanYoutubeTitle(title),artist:cleanYoutubeArtist(artist),rawTitle:raw};
}
function metaNorm(value){
  return String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/&/g,' and ').replace(/\b(feat(?:uring)?|ft)\.?\b.*$/,' ')
    .replace(/[^a-z0-9]+/g,' ').trim();
}
function tokenSimilarity(a,b){
  a=metaNorm(a);b=metaNorm(b);if(!a||!b)return 0;if(a===b)return 1;
  const A=new Set(a.split(/\s+/).filter(Boolean)),B=new Set(b.split(/\s+/).filter(Boolean));
  let hit=0;A.forEach(x=>{if(B.has(x))hit++});
  const union=new Set([...A,...B]).size||1;
  const j=hit/union;
  const contain=(a.includes(b)||b.includes(a))?0.9:0;
  return Math.max(j,contain);
}
function cleanYoutubeArtist(value){
  let x=String(value||'').trim().replace(/\s+-\s+Topic$/i,'').replace(/\bVEVO$/i,'').trim();
  return x;
}
function cleanYoutubeTitle(value){
  let x=String(value||'').trim();
  /* Remove presentation labels, but deliberately retain musical variants such
     as remix/live/slowed/sped-up because those may have a different tempo. */
  x=x.replace(/\([^)]*(?:official\s+)?(?:music\s+)?video[^)]*\)/ig,' ')
     .replace(/\[[^\]]*(?:official\s+)?(?:music\s+)?video[^\]]*\]/ig,' ')
     .replace(/\([^)]*(?:official\s+)?audio[^)]*\)/ig,' ')
     .replace(/\[[^\]]*(?:official\s+)?audio[^\]]*\]/ig,' ')
     .replace(/\([^)]*(?:official\s+)?lyrics?[^)]*\)/ig,' ')
     .replace(/\[[^\]]*(?:official\s+)?lyrics?[^\]]*\]/ig,' ')
     .replace(/\([^)]*visuali[sz]er[^)]*\)/ig,' ')
     .replace(/\[[^\]]*visuali[sz]er[^\]]*\]/ig,' ')
     .replace(/[\[(](?:4k|hd|hq)[\])]/ig,' ')
     .replace(/\s+/g,' ').trim();
  return x;
}
function parseYoutubeTrack(meta){
  let title=cleanYoutubeTitle(meta&&meta.title),artist=cleanYoutubeArtist(meta&&meta.author_name);
  const parts=title.split(/\s+[\-–—]\s+/).map(x=>x.trim()).filter(Boolean);
  if(parts.length>=2){
    const left=parts[0],right=parts.slice(1).join(' - ');
    if(!artist||tokenSimilarity(left,artist)>=0.55){artist=left;title=right;}
  }
  if(artist&&/\s+-\s+Topic$/i.test(String(meta&&meta.author_name||'')))artist=cleanYoutubeArtist(meta.author_name);
  return{title:cleanYoutubeTitle(title),artist:cleanYoutubeArtist(artist),rawTitle:String(meta&&meta.title||'')};
}
function changedSpeedVariant(value){return /\b(slowed|sped\s*up|speed\s*up|nightcore|pitch(?:ed)?|reverb(?:ed)?)\b/i.test(String(value||''))}
function candidateArtistName(c){
  const a=c&&c.artist;
  if(Array.isArray(a))return String(a[0]&&a[0].name||'');
  if(a&&typeof a==='object')return String(a.name||'');
  return String(a||'');
}
function scoreBpmCandidate(c,wanted){
  const tempo=Number(c&&c.tempo);if(!Number.isFinite(tempo)||tempo<45||tempo>220)return 0;
  const ts=tokenSimilarity(c&&c.title,wanted.title),as=wanted.artist?tokenSimilarity(candidateArtistName(c),wanted.artist):0.5;
  let score=ts*0.74+as*0.26;
  if(changedSpeedVariant(wanted.rawTitle)&&!changedSpeedVariant(c&&c.title))score*=0.48;
  return score;
}
async function fetchJsonTimed(url,options,ms){
  const ctrl=typeof AbortController!=='undefined'?new AbortController():null;
  const timer=ctrl?setTimeout(()=>ctrl.abort(),ms||5500):null;
  try{
    const r=await fetch(url,Object.assign({},options||{},ctrl?{signal:ctrl.signal}:{}));
    if(!r.ok)throw new Error('HTTP '+r.status);
    return await r.json();
  }finally{if(timer)clearTimeout(timer)}
}
async function youtubePublicMetadata(url){
  const data=await fetchJsonTimed('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent(url),{headers:{'User-Agent':'FOB-Systems-BPM/1.0'}},5000);
  return{title:String(data&&data.title||''),author_name:String(data&&data.author_name||'')};
}
async function getSongBpmSearch(track,key){
  const lookups=[];
  if(track.title&&track.artist)lookups.push({type:'both',lookup:'song:'+track.title+' artist:'+track.artist});
  if(track.title)lookups.push({type:'song',lookup:track.title});
  let all=[];
  for(const item of lookups){
    const q=new URLSearchParams({type:item.type,lookup:item.lookup,limit:'12'});
    const data=await fetchJsonTimed('https://api.getsong.co/search/?'+q.toString(),{headers:{'X-API-KEY':key,'User-Agent':'FOB-Systems-BPM/1.0'}},5500);
    const rows=Array.isArray(data&&data.search)?data.search:[];all=all.concat(rows);
    if(rows.length)break;
  }
  return all;
}
async function detectThemeBpmSource(source,url){
  source=source==='tiktok'?'tiktok':'youtube';url=String(url||'').trim();
  let id=source==='tiktok'?tiktokVideoId(url):youtubeVideoId(url),meta=null,track=null;
  if(source==='youtube'&&!id)return{ok:false,error:'BAD_YOUTUBE_LINK'};
  const key=String(process.env.GETSONGBPM_API_KEY||'').trim();if(!key)return{ok:true,configured:false,bpm:0,apply:false,phaseNeedsLock:true};
  try{if(source==='tiktok'){meta=await tiktokPublicMetadata(url);id=meta.id||id;if(!id)return{ok:false,error:'BAD_TIKTOK_LINK'};track=parseTikTokTrack(meta)}else{meta=await youtubePublicMetadata(url);track=parseYoutubeTrack(meta)}}catch(e){return{ok:true,configured:true,bpm:0,apply:false,reason:'metadata'}}
  const cacheKey=source+':'+id,cached=THEME_BPM_CACHE.get(cacheKey),now=Date.now();if(cached&&now-cached.at<6*60*60*1000)return cached.value;
  if(!track||!track.title){const v={ok:true,configured:true,bpm:0,apply:false,reason:track&&track.reason||'title'};THEME_BPM_CACHE.set(cacheKey,{at:now,value:v});return v}
  let rows=[];try{rows=await getSongBpmSearch(track,key)}catch(e){return{ok:true,configured:true,bpm:0,apply:false,reason:'provider'}}
  const ranked=rows.map(c=>({c,score:scoreBpmCandidate(c,track)})).sort((a,b)=>b.score-a.score),best=ranked[0];
  if(!best||best.score<0.60){const v={ok:true,configured:true,bpm:0,apply:false,reason:'no-match',track:track.title,artist:track.artist};THEME_BPM_CACHE.set(cacheKey,{at:now,value:v});return v}
  const bpm=Math.round(Number(best.c.tempo)*10)/10,variant=changedSpeedVariant(track.rawTitle),threshold=source==='tiktok'?0.82:0.78,apply=best.score>=threshold&&!variant;
  const confidence=best.score>=0.90?'high':best.score>=threshold?'medium':'low';
  const v={ok:true,configured:true,bpm,apply,confidence,phaseNeedsLock:true,track:String(best.c.title||track.title),artist:candidateArtistName(best.c)||track.artist,source:'GetSongBPM',mediaSource:source};THEME_BPM_CACHE.set(cacheKey,{at:now,value:v});return v;
}
async function detectThemeBpm(youtubeUrl){return detectThemeBpmSource('youtube',youtubeUrl)}

/* Member-uploaded exercise clips are private workout data, not exercise-library
   media. The object path is the ownership boundary: the browser never chooses
   an owner, and every read/write is re-checked against the signed member. */
const MEMBER_MEDIA_BUCKET='gym-exercise-media';
function storageMediaPath(value){
  let raw=String(value||'').trim();if(!raw)return'';
  try{
    const markers=[
      '/storage/v1/object/public/'+MEMBER_MEDIA_BUCKET+'/',
      '/storage/v1/object/sign/'+MEMBER_MEDIA_BUCKET+'/',
      '/storage/v1/object/'+MEMBER_MEDIA_BUCKET+'/'
    ];
    for(const marker of markers){const at=raw.indexOf(marker);if(at>=0){raw=raw.slice(at+marker.length);break}}
    raw=raw.split(/[?#]/)[0].replace(/^\/+/, '');
    try{raw=decodeURIComponent(raw)}catch(e){}
  }catch(e){return''}
  if(!raw||raw.includes('..')||!/^[a-zA-Z0-9/_\-.]+$/.test(raw))return'';
  return raw;
}
function memberMediaOwner(value){
  const path=storageMediaPath(value),m=path.match(/^member\/([0-9a-f-]{36})\//i);
  return m&&uuid(m[1])?m[1].toLowerCase():'';
}
function ownMemberMediaPath(memberId,value){
  const path=storageMediaPath(value),owner=memberMediaOwner(path);
  return owner&&owner===String(memberId||'').toLowerCase()?path:'';
}
function clearMemberMedia(item){
  item.media=null;item.poster=null;item.mediaStart=0;item.mediaEnd=null;
  delete item.mediaPath;delete item.posterPath;delete item.mediaScope;delete item.mediaOwner;
  return item;
}
function sanitizeMemberItem(item,memberId){
  if(!item||typeof item!=='object')return item;
  const id=String(memberId||'').toLowerCase();
  const pathOwner=memberMediaOwner(item.mediaPath)||memberMediaOwner(item.media);
  const declared=uuid(item.mediaOwner)?String(item.mediaOwner).toLowerCase():'';
  const memberScoped=String(item.mediaScope||'').toLowerCase()==='member'||!!pathOwner||!!item.mediaPath;
  if((pathOwner&&pathOwner!==id)||(declared&&declared!==id))return clearMemberMedia(item);
  if(!memberScoped)return item;
  const ownPath=ownMemberMediaPath(id,item.mediaPath)||ownMemberMediaPath(id,item.media);
  if(ownPath){
    item.mediaPath=ownPath;item.mediaScope='member';item.mediaOwner=id;
    /* Signed playback URLs are runtime credentials. Persist only the owned
       path, then mint a fresh URL after member authentication on every boot. */
    item.media=null;item.poster=null;delete item.posterPath;
    return item;
  }
  const external=String(item.media||'').trim();
  if(/^https?:\/\//i.test(external)&&String(item.mediaScope||'').toLowerCase()==='member'){
    item.media=external;item.mediaScope='member';item.mediaOwner=id;delete item.mediaPath;
    return item;
  }
  return clearMemberMedia(item);
}
function sanitizeMemberBody(raw,memberId){
  let body=[];try{body=JSON.parse(JSON.stringify(Array.isArray(raw)?raw:[]))}catch(e){body=[]}
  return body.map(item=>sanitizeMemberItem(item,memberId));
}
/* R67 — MAH MEDIA uses the same authenticated signed-upload pattern as the
   existing member media systems, but body-progress media is private and therefore
   owns a dedicated non-public bucket. Paths are always server-generated beneath
   the signed member id. */
const PROGRESS_MEDIA_BUCKET='member-progress-media';
const PROGRESS_MEDIA_ANGLES=new Set(['Front','Left Side','Right Side','Back','Diagonal','Professional']);
function progressMediaPath(memberId,value){
  const raw=String(value||'').trim().split(/[?#]/)[0].replace(/^\/+/,''),prefix='member/'+String(memberId||'').toLowerCase()+'/progress/';
  return raw.indexOf(prefix)===0&&!raw.includes('..')&&/^[a-zA-Z0-9/_\-.]+$/.test(raw)?raw:'';
}
function progressMediaMime(kind,fileName,value){
  kind=String(kind||'').toLowerCase();let mime=String(value||'').toLowerCase().trim().slice(0,90),name=String(fileName||'').toLowerCase(),ext=(name.match(/\.([a-z0-9]{2,5})$/)||[])[1]||'',map={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif',mp4:'video/mp4',mov:'video/quicktime',m4v:'video/x-m4v',webm:'video/webm',mpeg:'video/mpeg',mpg:'video/mpeg'};
  if(!mime)mime=map[ext]||'';
  if(kind==='photo'&&!/^image\/(jpeg|png|webp|heic|heif)$/i.test(mime))return'';
  if(kind==='video'&&!/^video\/(mp4|quicktime|webm|x-m4v|mpeg)$/i.test(mime))return'';
  return mime;
}
function progressMediaMaxBytes(kind){return String(kind||'').toLowerCase()==='photo'?25*1024*1024:120*1024*1024}
function progressMediaDate(value){const raw=String(value||'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return'';const d=new Date(raw+'T12:00:00Z');return Number.isFinite(+d)?raw:''}
function progressMediaPresentation(raw){raw=raw&&typeof raw==='object'?raw:{};const num=(v,f)=>Number.isFinite(Number(v))?Number(v):f;return{x:Math.max(0,Math.min(100,num(raw.x,50))),y:Math.max(0,Math.min(100,num(raw.y,50))),zoom:Math.max(1,Math.min(2.5,num(raw.zoom,1)))}}
async function signedProgressMediaUrl(memberId,value){
  const path=progressMediaPath(memberId,value);if(!path)throw new Error('Progress media ownership mismatch');
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');if(!key)throw new Error('Progress media signing unavailable');
  const target=MC.SUPABASE_URL+'/storage/v1/object/sign/'+PROGRESS_MEDIA_BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/');
  const response=await fetch(target,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:21600})});
  if(!response.ok)throw new Error('Progress media signing failed');const data=await response.json(),signed=String(data.signedURL||data.signedUrl||data.url||'');if(!signed)throw new Error('Progress media signing failed');
  if(/^https?:\/\//i.test(signed))return signed;if(signed.indexOf('/storage/v1/')===0)return MC.SUPABASE_URL+signed;return MC.SUPABASE_URL+'/storage/v1'+(signed[0]==='/'?'':'/')+signed;
}
async function removeProgressMediaObject(memberId,value){
  const path=progressMediaPath(memberId,value);if(!path)return false;const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  const response=await fetch(MC.SUPABASE_URL+'/storage/v1/object/'+PROGRESS_MEDIA_BUCKET,{method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})});
  if(!response.ok&&response.status!==404)throw new Error('Progress media cleanup failed');return true;
}
function publicProgressMediaRow(row,url){const p=progressMediaPresentation(row&&row.presentation);return{id:String(row&&row.id||''),kind:String(row&&row.kind||''),date:String(row&&row.captured_on||''),angle:row&&row.angle||'',title:row&&row.title||'',duration:Number(row&&row.duration_s)||0,presentation:p,url:url||'',createdAt:row&&row.created_at||''}}
async function progressMediaRows(memberId,offset,limit){
  offset=Math.max(0,Math.floor(Number(offset)||0));limit=Math.max(1,Math.min(40,Math.floor(Number(limit)||24)));
  /* R67 memory/network bound: fetch one metadata row beyond the requested page
     so a long body-progress history never signs or activates the entire archive
     at once. The browser appends chronological pages as the member scrolls. */
  const rows=await P.db('member_progress_media?select=id,kind,storage_path,captured_on,angle,title,duration_s,presentation,created_at&member_id=eq.'+encodeURIComponent(memberId)+'&order=captured_on.asc,created_at.asc&offset='+offset+'&limit='+(limit+1)),page=(rows||[]).slice(0,limit),items=await Promise.all(page.map(async row=>publicProgressMediaRow(row,await signedProgressMediaUrl(memberId,row.storage_path).catch(()=>''))));
  return{items:items,hasMore:(rows||[]).length>limit,nextOffset:offset+page.length};
}
async function signedMemberMediaUrl(memberId,value){
  const path=ownMemberMediaPath(memberId,value);if(!path)throw new Error('Member media ownership mismatch');
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');if(!key)throw new Error('Member media signing unavailable');
  const target=MC.SUPABASE_URL+'/storage/v1/object/sign/'+MEMBER_MEDIA_BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/');
  const response=await fetch(target,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:21600})});
  if(!response.ok)throw new Error('Member media signing failed');
  const data=await response.json(),signed=String(data.signedURL||data.signedUrl||data.url||'');
  if(!signed)throw new Error('Member media signing failed');
  if(/^https?:\/\//i.test(signed))return signed;
  if(signed.indexOf('/storage/v1/')===0)return MC.SUPABASE_URL+signed;
  return MC.SUPABASE_URL+'/storage/v1'+(signed[0]==='/'?'':'/')+signed;
}
async function hydrateMemberMedia(programs,memberId){
  const ids={},privateItems=[];
  (programs||[]).forEach(program=>{
    const days=(program&&program.days)||(program&&program.body&&program.body.days)||[];
    days.forEach(day=>{
      if(!day||typeof day!=='object')return;
      day.items=sanitizeMemberBody(day&&day.items,memberId);
      (day.items||[]).forEach(item=>{
        if(item&&item.exerciseId)ids[item.exerciseId]=1;
        if(item&&item.mediaScope==='member')privateItems.push(item);
      });
    });
  });
  const signed=new Map();
  await Promise.all(privateItems.map(async item=>{
    if(!item.mediaPath)return;
    let promise=signed.get(item.mediaPath);
    if(!promise){promise=signedMemberMediaUrl(memberId,item.mediaPath).catch(()=>null);signed.set(item.mediaPath,promise)}
    item.media=await promise;
  }));
  const list=Object.keys(ids);if(!list.length)return programs;
  let rows=[];try{
    rows=await P.db('gym_exercises?select=id,name,category,region,muscles,equipment,instructions,vars,media_url,media_poster,media_start,media_end&id=in.('
      +list.map(encodeURIComponent).join(',')+')&limit=1000')||[];
  }catch(e){return programs}
  const byId={},metaById={};rows.forEach(row=>{
    /* Metadata is non-sensitive and may still hydrate the exact movement
       profile, but a legacy member URL must never enter the shared coach-media
       map merely because it once landed in gym_exercises.media_url. */
    metaById[row.id]=row;
    if(memberMediaOwner(row&&row.media_url))return;
    byId[row.id]=row;
  });
  (programs||[]).forEach(program=>{
    const days=(program&&program.days)||(program&&program.body&&program.body.days)||[];
    days.forEach(day=>(day&&day.items||[]).forEach(item=>{
      if(!item)return;
      const meta=item.exerciseId&&metaById[item.exerciseId];
      if(meta){
        /* v416 — hydrate authoritative movement-profile metadata at runtime.
           Member program bodies remain small/sanitized; they cannot forge the
           library's instruction text, equipment or target-muscle metadata. */
        item.category=meta.category||item.category||'';
        item.region=meta.region||'';
        item.equipment=meta.equipment||'';
        item.muscles=Array.isArray(meta.muscles)?meta.muscles.slice():[];
        item.muscle=item.muscles.join(', ');
        item.instructions=String(meta.instructions||'').trim();
      }
      if(item.mediaScope==='member')return;
      const media=item.exerciseId&&byId[item.exerciseId];if(!media)return;
      item.media=media.media_url||null;item.poster=media.media_poster||null;
      item.mediaStart=media.media_start==null?0:Number(media.media_start);
      item.mediaEnd=media.media_end==null?null:Number(media.media_end);
      if(item.media){item.mediaScope='coach';delete item.mediaOwner;delete item.mediaPath}
    }));
  });
  return programs;
}

const MEMBER_PROGRAM_MARK='mahfitt-member-v1';
function memberProgramText(value,max,fallback){const s=String(value==null?'':value).trim().slice(0,max);return s||fallback||''}
function memberProgramVars(value){const allowed=['weight','reps','time','distance','fm'],out=[];(Array.isArray(value)?value:[]).forEach(v=>{v=String(v||'');if(allowed.includes(v)&&!out.includes(v))out.push(v)});return out.length?out:['weight','reps']}
function memberProgramNumber(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function cleanMemberProgramSet(raw,vars){raw=raw&&typeof raw==='object'?raw:{};const st={done:false};if(vars.includes('weight'))st.weight=memberProgramNumber(raw.weight,0,3000,0);if(vars.includes('reps'))st.reps=Math.round(memberProgramNumber(raw.reps,0,500,8));if(vars.includes('time'))st.time=Math.round(memberProgramNumber(raw.time,0,86400,45));if(vars.includes('distance'))st.distance=memberProgramNumber(raw.distance,0,1000000,0);if(vars.includes('fm')){st.fm=memberProgramNumber(raw.fm,0,100000,60);st.fmTime=Math.round(memberProgramNumber(raw.fmTime,0,86400,60))}return st}
function cleanMemberProgramItem(raw){raw=raw&&typeof raw==='object'?raw:{};const vars=memberProgramVars(raw.vars),sourceSets=Array.isArray(raw.sets)?raw.sets.slice(0,12):[],sets=sourceSets.length?sourceSets.map(st=>cleanMemberProgramSet(st,vars)):[cleanMemberProgramSet({},vars),cleanMemberProgramSet({},vars),cleanMemberProgramSet({},vars)];const target=raw.target&&typeof raw.target==='object'?raw.target:{},roles=['warmup','performance_indicator','compound','accessory','isolation_or_targeted','mobility','cooldown','main'],role=roles.includes(String(raw.exerciseRole))?String(raw.exerciseRole):(roles.includes(String(raw.section))?String(raw.section):'main');return{exerciseId:uuid(raw.exerciseId)?String(raw.exerciseId):null,name:memberProgramText(raw.name,120,'Exercise'),vars,category:memberProgramText(raw.category,80,''),section:memberProgramText(raw.section,48,'main'),exerciseRole:role,dynamicWarmup:raw.dynamicWarmup===true,note:memberProgramText(raw.note,800,''),sets,target:{lo:Math.round(memberProgramNumber(target.lo,0,500,8)),hi:Math.round(memberProgramNumber(target.hi,0,500,12))}}}
function cleanMemberProgramBody(raw,name,sub){raw=raw&&typeof raw==='object'?raw:{};const programType=String(raw.programType)==='outdoor'?'outdoor':'regular',days=(Array.isArray(raw.days)?raw.days:[]).slice(0,14).map((day,index)=>{day=day&&typeof day==='object'?day:{};const workoutType=programType==='outdoor'?'outdoor':(String(day.workoutType)==='outdoor'?'outdoor':'regular');return{name:memberProgramText(day.name,80,'Workout '+(index+1)),workoutType,purpose:memberProgramText(day.purpose,120,''),cooldownDurationSeconds:Math.round(memberProgramNumber(day.cooldownDurationSeconds,0,7200,0)),guidedBuilder:day.guidedBuilder===true,items:(Array.isArray(day.items)?day.items:[]).slice(0,40).map(cleanMemberProgramItem)}});return{name:memberProgramText(name||raw.name,80,'My Program'),sub:memberProgramText(sub||raw.sub,140,days.length+' workouts'),programType,days:days.length?days:[{name:'Workout 1',workoutType:programType,purpose:'',cooldownDurationSeconds:0,guidedBuilder:false,items:[]}],_memberProgram:MEMBER_PROGRAM_MARK}}
function outdoorProgramCandidate(c){const n=String(c&&c.name||c&&c.exercise_name||'').toLowerCase();if(!n)return false;const deny=/(machine|cable|pulldown|leg press|hack squat|treadmill|smith|pec deck|seated row machine|selectorized)/;if(deny.test(n))return false;const allow=/(pull[- ]?up|chin[- ]?up|push[- ]?up|dip|squat|lunge|split squat|step[- ]?up|calf raise|plank|leg raise|knee raise|mountain climber|bear crawl|sprint|run|jog|walk|jump|bound|burpee|a-skip|high knee|arm circle|leg swing|glute bridge|nordic|copenhagen|inverted row|bodyweight|mobility|stretch)/;return allow.test(n)}
function isMemberOwnedProgramBody(body){return !!(body&&typeof body==='object'&&body._memberProgram===MEMBER_PROGRAM_MARK)}
const COACH_PROGRAM_MARK='mahfitt-coach-v1';
function coachProgramBody(raw,name,sub){const body=cleanMemberProgramBody(raw,name,sub);delete body._memberProgram;body._coachAssigned=COACH_PROGRAM_MARK;return body}
function preserveProgramOwnership(body,current,asCoach){
  if(!asCoach)return body;
  if(isMemberOwnedProgramBody(current&&current.body)){body._memberProgram=MEMBER_PROGRAM_MARK;delete body._coachAssigned;}
  else{delete body._memberProgram;body._coachAssigned=COACH_PROGRAM_MARK;}
  return body;
}
async function memberProgramRow(memberId,id){if(!uuid(id))return null;const rows=await P.db('gym_member_programs?select=id,name,sub,body,updated_at&id=eq.'+encodeURIComponent(id)+'&member_id=eq.'+encodeURIComponent(memberId)+'&limit=1');return rows&&rows[0]||null}

async function programsForMember(memberId){
  let primary=[];
  try{
    primary=await P.db('gym_member_programs?select=id,name,sub,body,updated_at&member_id=eq.'
      +encodeURIComponent(memberId)+'&archived=eq.false&order=updated_at.desc&limit=1000')||[];
  }catch(e){console.warn('mygym program table fallback',e&&e.detail||e&&e.message)}
  let compat=[];
  try{
    const rows=await P.db('gym_sessions?select=id,name,notes,body,updated_at&member_id=eq.'
      +encodeURIComponent(memberId)+'&status=eq.program&order=updated_at.desc&limit=1000');
    compat=(rows||[]).map(r=>({id:r.id,name:r.name,sub:r.notes||null,body:r.body||{},updated_at:r.updated_at,compat:true}));
  }catch(e){console.warn('mygym compatibility program read',e&&e.detail||e&&e.message)}
  const seen=new Set(primary.map(r=>String(r.id)));
  compat.forEach(r=>{if(!seen.has(String(r.id)))primary.push(r)});
  return primary.sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
}


/* MAHFITT R48 — one canonical member-owned planning/body/activity foundation.
   Member and coach surfaces point at the same rows; page-local storage is not
   an authority for these systems. */
function trainingText(value,max){return String(value==null?'':value).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max)}
function trainingDate(value){const s=String(value||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const d=new Date(s+'T12:00:00Z');return Number.isNaN(d.getTime())?null:s}
function trainingNumber(value,min,max,integer){if(value==null||value==='')return null;const n=Number(value);if(!Number.isFinite(n))return null;const v=Math.max(min,Math.min(max,n));return integer?Math.round(v):Math.round(v*1000)/1000}
function trainingNodeId(value,prefix){const s=String(value||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64);return s||String(prefix||'node')+'-'+crypto.randomBytes(5).toString('hex')}
function cleanPeriodQuestionnaire(raw){raw=raw&&typeof raw==='object'?raw:{};const out={};['goal','routine','effort','progression','protect'].forEach(k=>{const v=trainingText(raw[k],900);if(v)out[k]=v});return out}
function cleanProtocolSession(raw,index){raw=raw&&typeof raw==='object'?raw:{};const status=['current','completed','upcoming','skipped','rescheduled'].includes(String(raw.status))?String(raw.status):'upcoming',pt=raw.plannedTargets&&typeof raw.plannedTargets==='object'?protocolJsonObject(raw.plannedTargets,20):{};return{stableKey:trainingNodeId(raw.stableKey,'session'),programDayReference:trainingNumber(raw.programDayReference,0,13,true),calendarReference:uuid(raw.calendarReference)?String(raw.calendarReference):null,label:trainingText(raw.label,90)||('Training Day '+(index+1)),status,plannedTargets:pt,completedData:raw.completedData&&typeof raw.completedData==='object'?protocolJsonObject(raw.completedData,24):null}}
function cleanMicrocycle(raw,index,allowedPrograms){raw=raw&&typeof raw==='object'?raw:{};const ids=[];(Array.isArray(raw.programIds)?raw.programIds:[]).forEach(id=>{id=String(id||'');if(uuid(id)&&allowedPrograms.has(id)&&!ids.includes(id))ids.push(id)});const rl=raw.repeatLength&&typeof raw.repeatLength==='object'?raw.repeatLength:{},status=['current','completed','upcoming'].includes(String(raw.status))?String(raw.status):'upcoming';return{id:trainingNodeId(raw.id,'micro'),name:trainingText(raw.name||raw.userLabel,80)||('Training Loop '+(index+1)),userLabel:trainingText(raw.userLabel||raw.name,80)||('LOOP '+(index+1)),startDate:trainingDate(raw.startDate),endDate:trainingDate(raw.endDate),cycleNumber:trainingNumber(raw.cycleNumber||raw.order,1,500,true)||index+1,programIds:ids,repeatLength:{value:trainingNumber(rl.value,1,60,true)||Math.max(1,(Array.isArray(raw.sessions)?raw.sessions.length:1)),unit:['sessions','days'].includes(String(rl.unit))?String(rl.unit):'sessions'},status,sessions:(Array.isArray(raw.sessions)?raw.sessions:[]).slice(0,24).map(cleanProtocolSession),plannedExercises:trainingText(raw.plannedExercises,1200),volumeTarget:trainingText(raw.volumeTarget,240),intensityTarget:trainingText(raw.intensityTarget,240),progressionTarget:trainingText(raw.progressionTarget||raw.progression,600),focus:trainingText(raw.focus,300),whatChanges:trainingText(raw.whatChanges||raw.progression,600),why:trainingText(raw.why,700),nextRecommendation:trainingText(raw.nextRecommendation,700),notes:trainingText(raw.notes,1200)}}
function cleanMesocycle(raw,index,allowedPrograms){raw=raw&&typeof raw==='object'?raw:{};const unit=['weeks','workout_cycles','training_loops'].includes(String(raw.durationUnit))?String(raw.durationUnit):'training_loops',status=['current','completed','upcoming'].includes(String(raw.status))?String(raw.status):'upcoming';return{id:trainingNodeId(raw.id,'meso'),name:trainingText(raw.name||raw.userLabel,100)||('Phase '+(index+1)),userLabel:trainingText(raw.userLabel||raw.name,100)||('PHASE '+(index+1)),goal:trainingText(raw.goal,300),intent:trainingText(raw.intent,600),status,startDate:trainingDate(raw.startDate),endDate:trainingDate(raw.endDate),durationWeeks:trainingNumber(raw.durationWeeks,1,104,true),durationUnit:unit,durationCount:trainingNumber(raw.durationCount,1,104,true)||trainingNumber(raw.durationWeeks,1,104,true)||Math.max(1,(Array.isArray(raw.microcycles)?raw.microcycles.length:1)),frequency:trainingNumber(raw.frequency,1,14,true),volumeTarget:trainingText(raw.volumeTarget,240),intensityTarget:trainingText(raw.intensityTarget,240),progressionStrategy:trainingText(raw.progressionStrategy,600),deload:trainingText(raw.deload,420),focus:trainingText(raw.focus,300),microcycles:(Array.isArray(raw.microcycles)?raw.microcycles:[]).slice(0,52).map((x,i)=>cleanMicrocycle(x,i,allowedPrograms)),notes:trainingText(raw.notes,1200)}}
/* MAH PROTOCOL body, carried inside the canonical periodization plan record.
   This is an extension of the existing owner rather than a competing plan
   table: the training structure still lives in mesocycles/microcycles, and
   this holds only the Protocol-specific layers (chosen destination, activity,
   nutrition framework, schedule proposal, cautions, uncertainty). Everything
   is re-cleaned on the way in, so a draft cannot smuggle arbitrary state into
   a saved plan. */
function cleanProtocolBody(raw){
  if(!raw||typeof raw!=='object')return null;
  const AI=protocolAI(),num=(v,lo,hi)=>trainingNumber(v,lo,hi,true);
  const nf=raw.nutritionFramework&&typeof raw.nutritionFramework==='object'?raw.nutritionFramework:{};
  const list=(v,max,len)=>(Array.isArray(v)?v:[]).slice(0,max).map(x=>trainingText(x,len)).filter(Boolean);
  const calEstimated=nf.calorieEstimated===true&&num(nf.calorieLow,800,8000)!=null&&num(nf.calorieHigh,800,8000)!=null;
  return{
    schemaVersion:AI.PROTOCOL_SCHEMA_VERSION,
    protocolName:trainingText(raw.protocolName,100)||'MAH Protocol',
    targetPhysiquePath:AI.PHYSIQUE_IDS.includes(String(raw.targetPhysiquePath))?String(raw.targetPhysiquePath):'hybrid',
    primaryGoal:trainingText(raw.primaryGoal,300),
    strategy:raw.strategy&&typeof raw.strategy==='object'?{id:trainingText(raw.strategy.id,40),userLabel:trainingText(raw.strategy.userLabel,80),scientificLabel:trainingText(raw.strategy.scientificLabel,120),reason:trainingText(raw.strategy.reason,700),modifiers:list(raw.strategy.modifiers,8,120)}:null,
    physiqueProgramming:raw.physiqueProgramming&&typeof raw.physiqueProgramming==='object'?{leannessBias:trainingNumber(raw.physiqueProgramming.leannessBias,0,1,false),densityBias:trainingNumber(raw.physiqueProgramming.densityBias,0,1,false),taperBias:trainingNumber(raw.physiqueProgramming.taperBias,0,1,false),sessionDensity:trainingText(raw.physiqueProgramming.sessionDensity,40),pairingPolicy:trainingText(raw.physiqueProgramming.pairingPolicy,700),activityBias:trainingText(raw.physiqueProgramming.activityBias,700),musclePriority:list(raw.physiqueProgramming.musclePriority,8,80),exerciseOrderRule:trainingText(raw.physiqueProgramming.exerciseOrderRule,700),existingProgramRule:trainingText(raw.physiqueProgramming.existingProgramRule,700)}:null,
    generatedFrom:raw.generatedFrom&&typeof raw.generatedFrom==='object'?protocolJsonObject(raw.generatedFrom,80):{},
    durationWeeks:num(raw.durationWeeks,1,104)||8,
    sessionMinutes:AI.SESSION_MINUTES.includes(Number(raw.sessionMinutes))?Number(raw.sessionMinutes):60,
    startDateProposal:trainingDate(raw.startDateProposal),
    plainSummary:trainingText(raw.plainSummary,1200),
    trainingLoops:(Array.isArray(raw.trainingLoops)?raw.trainingLoops:[]).slice(0,52).map((l,i)=>({
      loopNumber:num(l&&l.loopNumber,1,104)||(i+1),
      chapterName:trainingText(l&&l.chapterName,100)||('Chapter '+(i+1)),
      emphasis:trainingText(l&&l.emphasis,300),
      whatChanges:trainingText(l&&l.whatChanges,600),
      why:trainingText(l&&l.why,700),
      easierRecoveryStretch:!!(l&&l.easierRecoveryStretch)})),
    progressionRules:list(raw.progressionRules,10,400),
    recoveryLogic:trainingText(raw.recoveryLogic,900),
    activityRecommendations:(Array.isArray(raw.activityRecommendations)?raw.activityRecommendations:[]).slice(0,12).map(a=>({
      activityType:trainingText(a&&a.activityType,60),
      frequencyPerWeek:num(a&&a.frequencyPerWeek,0,14)||0,
      minutes:num(a&&a.minutes,5,300)||30,
      effort:['easy','moderate','hard'].includes(String(a&&a.effort))?String(a.effort):'easy',
      why:trainingText(a&&a.why,300)})).filter(a=>a.activityType),
    nutritionFramework:{
      calorieEstimated:calEstimated,
      calorieLow:calEstimated?num(nf.calorieLow,800,8000):null,
      calorieHigh:calEstimated?num(nf.calorieHigh,800,8000):null,
      proteinLowG:num(nf.proteinLowG,20,500),
      proteinHighG:num(nf.proteinHighG,20,500),
      mealStructure:trainingText(nf.mealStructure,700),
      exampleMeals:list(nf.exampleMeals,10,220),
      substitutions:list(nf.substitutions,12,220),
      groceryFoundation:list(nf.groceryFoundation,24,80),
      trainingDayGuidance:trainingText(nf.trainingDayGuidance,600),
      restDayGuidance:trainingText(nf.restDayGuidance,600),
      estimateBasis:trainingText(nf.estimateBasis,400)},
    calendarProposal:(Array.isArray(raw.calendarProposal)?raw.calendarProposal:[]).slice(0,200).map((c,i)=>({
      key:trainingText(c&&c.key,120)||('p'+i),
      dayOffset:num(c&&c.dayOffset,0,730)||0,
      startMinute:num(c&&c.startMinute,0,1425)||0,
      durationMinutes:num(c&&c.durationMinutes,10,300)||30,
      itemType:AI.ITEM_TYPES.includes(String(c&&c.itemType))?String(c.itemType):'workout',
      title:trainingText(c&&c.title,110)||'MAH Protocol',
      programDayIndex:Number.isInteger(c&&c.programDayIndex)?c.programDayIndex:null})),
    adaptationRules:list(raw.adaptationRules,10,400),
    cautions:list(raw.cautions,10,300),
    uncertainty:trainingText(raw.uncertainty,900),
    /* AI-005: a source survives only when it carries a real https URL. */
    sources:(Array.isArray(raw.sources)?raw.sources:[]).slice(0,8).map(x=>({
      title:trainingText(x&&x.title,240),publisher:trainingText(x&&x.publisher,180),
      year:num(x&&x.year,1800,2200),url:trainingText(x&&x.url,600)}))
      .filter(x=>x.title&&/^https:\/\//i.test(x.url)),
    generatorVersion:trainingText(raw.generatorVersion,40)||'mah-protocol-1'
  };
}
async function cleanPeriodizationForMember(memberId,raw){raw=raw&&typeof raw==='object'?raw:{};let rows=[];try{rows=await P.db('gym_member_programs?select=id,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&archived=eq.false&limit=1000')||[]}catch(e){}const allowedPrograms=new Set(rows.map(r=>String(r.id))),linked=uuid(raw.linkedProgramId)&&allowedPrograms.has(String(raw.linkedProgramId))?String(raw.linkedProgramId):null,linkedRow=rows.find(r=>String(r.id)===linked),unit=['weeks','workout_cycles','training_loops'].includes(String(raw.durationUnit))?String(raw.durationUnit):'training_loops',enrollment=['draft','active','not_yet'].includes(String(raw.enrollmentState))?String(raw.enrollmentState):'draft',cp=raw.currentPosition&&typeof raw.currentPosition==='object'?raw.currentPosition:{};return{name:trainingText(raw.name,120)||'Training Plan',goal:trainingText(raw.goal,500),startDate:trainingDate(raw.startDate),endDate:trainingDate(raw.endDate),notes:trainingText(raw.notes,2000),linkedProgramId:linked,programRevision:linkedRow&&linkedRow.updated_at||null,durationUnit:unit,enrollmentState:enrollment,currentCycleIndex:trainingNumber(raw.currentCycleIndex,0,999,true)||0,currentPosition:{mesocycleId:cp.mesocycleId?trainingNodeId(cp.mesocycleId,'meso'):null,microcycleId:cp.microcycleId?trainingNodeId(cp.microcycleId,'micro'):null,sessionKey:cp.sessionKey?trainingNodeId(cp.sessionKey,'session'):null},questionnaire:cleanPeriodQuestionnaire(raw.questionnaire),generatedAt:trainingText(raw.generatedAt,80)||null,generatorVersion:trainingText(raw.generatorVersion,40)||'r49-guided-1',mesocycles:(Array.isArray(raw.mesocycles)?raw.mesocycles:[]).slice(0,20).map((x,i)=>cleanMesocycle(x,i,allowedPrograms)),protocol:cleanProtocolBody(raw.protocol)}}
/* R76: current Protocol position is no longer inferred from elapsed 7-day
   blocks. A microcycle is one repeat of the programmed session structure and
   may span any number of calendar days. Calendar/completion correlation owns
   date-based position; absent that evidence, the saved structured pointer is
   preserved instead of fabricated. */
function periodizationPublic(row){if(!row)return null;const body=row.body&&typeof row.body==='object'?Object.assign({},row.body):{},start=body.startDate||row.start_date||null;return Object.assign({},body,{id:row.id,name:body.name||row.name||'Training Plan',goal:body.goal||row.goal||'',startDate:start,endDate:body.endDate||row.end_date||null,notes:body.notes||row.notes||'',version:Number(row.version)||1,updatedAt:row.updated_at||null,updatedBy:row.updated_by||'member'})}
async function periodizationRows(memberId){try{return await P.db('member_periodization_plans?select=id,name,goal,start_date,end_date,notes,body,version,updated_by,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&archived=eq.false&order=updated_at.desc&limit=20')||[]}catch(error){if(/member_periodization_plans|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))error.code='TRAINING_SCHEMA';throw error}}
async function protocolArchivedRows(memberId){try{return await P.db('member_periodization_plans?select=id,name,goal,start_date,end_date,notes,body,version,updated_by,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&archived=eq.true&order=updated_at.desc&limit=20')||[]}catch(error){if(/member_periodization_plans|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))error.code='TRAINING_SCHEMA';throw error}}
async function savePeriodization(memberId,b,actor){const clean=await cleanPeriodizationForMember(memberId,b.plan),payload={member_id:memberId,name:clean.name,goal:clean.goal||null,start_date:clean.startDate,end_date:clean.endDate,notes:clean.notes||null,body:clean,updated_by:actor==='coach'?'coach':'member',updated_at:new Date().toISOString()};try{if(uuid(b.id)){const currentVersion=Math.max(1,parseInt(b.version,10)||1);payload.version=currentVersion+1;const rows=await P.db('member_periodization_plans?id=eq.'+encodeURIComponent(b.id)+'&member_id=eq.'+encodeURIComponent(memberId)+'&version=eq.'+currentVersion,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});if(!rows||!rows[0])return{status:409,body:{ok:false,code:'PLAN_CONFLICT',error:'This plan changed somewhere else. Reload it before saving again.'}};return{status:200,body:{ok:true,plan:periodizationPublic(rows[0])}}}payload.version=1;const rows=await P.db('member_periodization_plans',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});return{status:200,body:{ok:true,plan:periodizationPublic(rows&&rows[0])}}}catch(error){if(/member_periodization_plans|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))return{status:503,body:{ok:false,error:'Training planning needs database migration 048.'}};throw error}}
async function bodyFoundation(memberId){let profile=null,measurements=[],health=[],activities=[];try{const parts=await Promise.all([P.db('member_body_profile?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&limit=1'),P.db('member_body_measurements?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&order=measured_on.asc&limit=1000'),P.db('member_health_daily?select=day,metrics,source,synced_at&member_id=eq.'+encodeURIComponent(memberId)+'&order=day.desc&limit=365'),P.db('member_activity_segments?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&order=started_at.desc&limit=500')]);profile=parts[0]&&parts[0][0]||null;measurements=parts[1]||[];health=parts[2]||[];activities=parts[3]||[]}catch(error){if(/member_body_profile|member_body_measurements|member_activity_segments|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))error.code='TRAINING_SCHEMA';throw error}return{profile,measurements,healthDays:health,activitySegments:activities}}
async function saveBodyProfile(memberId,b){const raw=b.profile&&typeof b.profile==='object'?b.profile:{},payload={member_id:memberId,age_years:trainingNumber(raw.ageYears,1,120,true),height_in:trainingNumber(raw.heightIn,1,120,false),goal_weight_lb:trainingNumber(raw.goalWeightLb,1,1500,false),body_fat_formula_sex:['male','female'].includes(String(raw.bodyFatFormulaSex))?String(raw.bodyFatFormulaSex):null,use_estimated_body_fat_for_ffmi:!!raw.useEstimatedBodyFatForFfmi,goal_body_fat_pct:trainingNumber(raw.goalBodyFatPct,1,69,false),goal_ffmi:trainingNumber(raw.goalFfmi,10,40,false),tdee_formula_sex:['male','female'].includes(String(raw.tdeeFormulaSex))?String(raw.tdeeFormulaSex):null,activity_factor:trainingNumber(raw.activityFactor,1,2.6,false),deficit_delta_kcal:trainingNumber(raw.deficitDeltaKcal,0,2000,true)??500,surplus_delta_kcal:trainingNumber(raw.surplusDeltaKcal,0,2000,true)??250,protein_g_per_lb:trainingNumber(raw.proteinGPerLb,0,3,false)??.8,fat_g_per_lb:trainingNumber(raw.fatGPerLb,0,2,false)??.3,macro_scenario:['maintenance','deficit','surplus'].includes(String(raw.macroScenario))?String(raw.macroScenario):'maintenance',updated_at:new Date().toISOString()};try{const rows=await P.db('member_body_profile?on_conflict=member_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});return{ok:true,profile:rows&&rows[0]||payload}}catch(error){if(/member_body_profile|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))return{ok:false,status:503,error:'Body Progress needs database migration 048.'};throw error}}
async function saveBodyMeasurement(memberId,b){const day=trainingDate(b.measuredOn),weight=trainingNumber(b.weightLb,1,1500,false),waist=trainingNumber(b.waistIn,1,120,false),bodyFat=trainingNumber(b.bodyFatPct,.1,69.9,false);if(!day||weight==null&&waist==null&&bodyFat==null)return{ok:false,status:400,error:'Enter a date and at least weight, waist or body-fat percentage.'};const payload={member_id:memberId,measured_on:day,weight_lb:weight,waist_in:waist,body_fat_pct:bodyFat,source:'manual',updated_at:new Date().toISOString()};try{const rows=await P.db('member_body_measurements?on_conflict=member_id,measured_on,source',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});return{ok:true,measurement:rows&&rows[0]||payload}}catch(error){if(/member_body_measurements|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))return{ok:false,status:503,error:'Body Progress needs database migration 048.'};throw error}}

/* ══ MAH PROTOCOL — server owner ═══════════════════════════════════════════
   MAH PROTOCOL is the approachable umbrella over the systems MAHFITT already
   owns. It deliberately adds NO second calendar, NO second program store, NO
   second body-metrics table and NO second periodization owner:

     * plan record      -> member_periodization_plans (via savePeriodization)
     * program          -> gym_member_programs (via the canonical Program Editor)
     * body data        -> member_body_profile / member_body_measurements
     * photos           -> member_progress_media (ids only; never copied)
     * calendar         -> member_calendar_events (kind 'protocol', migration 051)
     * reusable inputs  -> member_protocol_preferences (migration 051)

   Every consequential write is an explicit member action. The AI boundary in
   _mah-protocol-ai.js proposes; nothing here saves on its own. */
function protocolAI(){return MPAI||(MPAI=require('./_mah-protocol-ai'))}
function protocolSchemaMissing(error){return /member_protocol_preferences|protocol_plan_id|protocol_item_key|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||''))}
function protocolOptionalFailure(error){const m=String(error&&error.detail||error&&error.message||''),code=String(error&&error.code||'');if(code==='PROTOCOL_SCHEMA'||protocolSchemaMissing(error))return{kind:'schema',message:'Database setup is missing for this optional Protocol context.'};if(/jwt|auth|unauthor|forbidden|401|403/i.test(m+code))return{kind:'auth',message:'Your session could not read this optional Protocol context.'};if(/timeout|timed out|fetch|network|ECONN|ENOTFOUND|socket/i.test(m+code))return{kind:'network',message:'This optional Protocol context could not be reached right now.'};return{kind:'service',message:'This optional Protocol context is temporarily unavailable.'}}
function protocolPathId(value){return protocolAI().PHYSIQUE_IDS.includes(String(value||''))?String(value):null}
/* UX-004/UX-005. A member who has not chosen gets 8. A member who HAS chosen
   keeps exactly what they chose, within the backend range the AI Program
   Creator already supports (1..104). Nothing here resets a deliberate value. */
function protocolDurationWeeks(value){const n=trainingNumber(value,1,104,true);return n==null?8:n}
function protocolSessionMinutes(value){const n=Number(value);return protocolAI().SESSION_MINUTES.includes(n)?n:60}
function protocolJsonObject(raw,max){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return{};
  const out={},keys=Object.keys(raw).slice(0,Math.max(1,max||40));
  for(const k of keys){
    const key=trainingText(k,60);if(!key)continue;const v=raw[k];
    if(v==null){out[key]=null;continue}
    if(typeof v==='boolean'||typeof v==='number'){out[key]=typeof v==='number'&&!Number.isFinite(v)?null:v;continue}
    if(Array.isArray(v)){out[key]=v.slice(0,40).map(x=>typeof x==='boolean'||typeof x==='number'?x:trainingText(x,300)).filter(x=>x!==''&&x!=null);continue}
    if(typeof v==='object'){out[key]=protocolJsonObject(v,24);continue}
    out[key]=trainingText(v,2000);
  }
  return out;
}
function protocolMediaIds(raw){
  const ids=[];(Array.isArray(raw)?raw:[]).forEach(v=>{const id=String(v||'').toLowerCase();if(uuid(id)&&!ids.includes(id))ids.push(id)});
  return ids.slice(0,12);
}
function protocolPreferencesPublic(row){
  row=row&&typeof row==='object'?row:{};
  return{
    targetPhysiquePath:row.target_physique_path||null,
    primaryGoal:row.primary_goal||'',
    secondaryGoal:row.secondary_goal||'',
    durationWeeks:row.duration_weeks==null?null:Number(row.duration_weeks),
    trainingPreferences:row.training_preferences||{},
    equipment:row.equipment||{},
    availability:row.availability||{},
    activityPreferences:row.activity_preferences||{},
    foodPreferences:row.food_preferences||{},
    onboardingDraft:row.onboarding_draft||{},
    onboardingStep:Math.max(1,Math.min(7,Number(row.onboarding_step)||1)),
    onboardingQuestionId:trainingText(row.onboarding_draft&&row.onboarding_draft._resumeQuestionId,60)||'',
    visualConsent:row.visual_consent||{},
    visualMediaIds:Array.isArray(row.visual_media_ids)?row.visual_media_ids:[],
    visualReview:row.visual_review||null,
    visualReviewAt:row.visual_review_at||null,
    updatedAt:row.updated_at||null
  };
}
async function protocolPreferencesRow(memberId){
  try{const rows=await P.db('member_protocol_preferences?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&limit=1');return rows&&rows[0]||null}
  catch(error){if(protocolSchemaMissing(error))error.code='PROTOCOL_SCHEMA';throw error}
}
async function saveProtocolPreferences(memberId,b){
  const current=await protocolPreferencesRow(memberId),prev=current||{};
  const pick=(incoming,fallback)=>incoming===undefined?fallback:incoming;
  const payload={
    member_id:memberId,
    target_physique_path:b.targetPhysiquePath===undefined?(prev.target_physique_path||null):protocolPathId(b.targetPhysiquePath),
    primary_goal:pick(b.primaryGoal===undefined?undefined:trainingText(b.primaryGoal,300)||null,prev.primary_goal||null),
    secondary_goal:pick(b.secondaryGoal===undefined?undefined:trainingText(b.secondaryGoal,300)||null,prev.secondary_goal||null),
    /* UX-005 again at the persistence layer: an omitted duration never
       overwrites a stored deliberate one, and an explicit one is kept as-is. */
    duration_weeks:b.durationWeeks===undefined?(prev.duration_weeks==null?null:Number(prev.duration_weeks)):trainingNumber(b.durationWeeks,1,104,true),
    training_preferences:b.trainingPreferences===undefined?(prev.training_preferences||{}):protocolJsonObject(b.trainingPreferences,40),
    equipment:b.equipment===undefined?(prev.equipment||{}):protocolJsonObject(b.equipment,40),
    availability:b.availability===undefined?(prev.availability||{}):protocolJsonObject(b.availability,40),
    activity_preferences:b.activityPreferences===undefined?(prev.activity_preferences||{}):protocolJsonObject(b.activityPreferences,40),
    food_preferences:b.foodPreferences===undefined?(prev.food_preferences||{}):protocolJsonObject(b.foodPreferences,60),
    onboarding_draft:b.onboardingDraft===undefined?(prev.onboarding_draft||{}):protocolJsonObject(b.onboardingDraft,80),
    onboarding_step:b.onboardingStep===undefined?(Math.max(1,Math.min(7,Number(prev.onboarding_step)||1))):Math.max(1,Math.min(7,trainingNumber(b.onboardingStep,1,7,true)||1)),
    visual_consent:b.visualConsent===undefined?(prev.visual_consent||{}):protocolJsonObject(b.visualConsent,12),
    visual_media_ids:b.visualMediaIds===undefined?(Array.isArray(prev.visual_media_ids)?prev.visual_media_ids:[]):protocolMediaIds(b.visualMediaIds),
    updated_at:new Date().toISOString()
  };
  try{
    const rows=await P.db('member_protocol_preferences?on_conflict=member_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
    return{status:200,body:{ok:true,preferences:protocolPreferencesPublic(rows&&rows[0]||payload)}};
  }catch(error){
    if(protocolSchemaMissing(error))return{status:503,body:{ok:false,code:'PROTOCOL_SCHEMA',error:'MAH PROTOCOL needs database migration 051.'}};
    throw error;
  }
}
/* PHOTO-002 / PRIVACY-001. Only rows this member owns can ever be referenced,
   and the check happens before any provider call. */
async function protocolOwnedMedia(memberId,ids){
  const wanted=protocolMediaIds(ids);if(!wanted.length)return[];
  const rows=await P.db('member_progress_media?select=id,kind,storage_path,angle,captured_on&member_id=eq.'+encodeURIComponent(memberId)
    +'&kind=eq.photo&id=in.('+wanted.map(encodeURIComponent).join(',')+')&limit=12');
  return rows||[];
}
function protocolCalendarSemanticRole(itemType){
  return itemType==='activity'?'protocol_activity':itemType==='recovery'?'protocol_recovery':itemType==='nutrition'?'protocol_nutrition':'protocol_workout';
}
/* CAL-005/CAL-006. Protocol events carry a semantic role, never a stored theme
   colour. `color` remains the legacy non-null column; the renderer resolves the
   live theme from semantic_role, exactly as Activity does since migration 049. */
function protocolCalendarPayload(memberId,planId,item){
  return{
    member_id:memberId,kind:'protocol',
    title:trainingText(item.title,110)||'MAH Protocol',
    notes:trainingText(item.notes,1200)||null,
    starts_at:item.startsAt,ends_at:item.endsAt,all_day:false,
    color:'white',status:'scheduled',source:'protocol',created_by:'member',
    protocol_plan_id:planId,protocol_item_key:trainingText(item.key,120),
    semantic_role:protocolCalendarSemanticRole(item.itemType),
    metadata:{itemType:String(item.itemType||'workout'),programDayIndex:item.programDayIndex==null?null:Number(item.programDayIndex),protocolItemKey:trainingText(item.key,120)},
    updated_at:new Date().toISOString()
  };
}
function protocolIsoInstant(value){const d=new Date(String(value||''));return Number.isFinite(+d)?d.toISOString():null}
function protocolCleanScheduleItems(raw){
  const items=[],seen=new Set();
  (Array.isArray(raw)?raw:[]).slice(0,200).forEach(x=>{
    const key=trainingText(x&&x.key,120),startsAt=protocolIsoInstant(x&&x.startsAt),endsAt=protocolIsoInstant(x&&x.endsAt);
    if(!key||!startsAt||!endsAt||new Date(endsAt)<=new Date(startsAt)||seen.has(key))return;
    seen.add(key);
    items.push({key,startsAt,endsAt,title:trainingText(x&&x.title,110)||'MAH Protocol',
      notes:trainingText(x&&x.notes,1200),
      itemType:protocolAI().ITEM_TYPES.includes(String(x&&x.itemType))?String(x.itemType):'workout',
      programDayIndex:Number.isInteger(x&&x.programDayIndex)?x.programDayIndex:null});
  });
  return items;
}
/* CAL-002/CAL-004. Conflicts are read from the canonical calendar, and a paid
   FOB / LIFT SESH booking is only ever an obstacle to route around — Protocol
   scheduling holds no write path that can reach one. */
async function protocolCalendarWindow(memberId,fromIso,toIso){
  try{
    return await P.db('member_calendar_events?select=id,kind,title,starts_at,ends_at,status,semantic_role,protocol_plan_id,protocol_item_key,metadata,notes'
      +'&member_id=eq.'+encodeURIComponent(memberId)
      +'&status=neq.cancelled'
      +'&ends_at=gt.'+encodeURIComponent(fromIso)
      +'&starts_at=lt.'+encodeURIComponent(toIso)
      +'&order=starts_at.asc&limit=1000')||[];
  }catch(error){if(protocolSchemaMissing(error))error.code='PROTOCOL_SCHEMA';throw error}
}
function protocolOverlaps(aStart,aEnd,bStart,bEnd){
  return new Date(aStart)<new Date(bEnd)&&new Date(aEnd)>new Date(bStart);
}
function protocolConflictsFor(item,existing,planId){
  return (existing||[]).filter(row=>{
    if(String(row.protocol_plan_id||'')===String(planId||'')&&String(row.protocol_item_key||'')===item.key)return false;
    return protocolOverlaps(item.startsAt,item.endsAt,row.starts_at,row.ends_at);
  }).map(row=>({id:row.id,kind:row.kind,title:row.title,startsAt:row.starts_at,endsAt:row.ends_at,
    paidBooking:row.kind==='fob_sesh'||row.kind==='lift_sesh'}));
}
/* CAL-002b. When a proposal collides, offer a real open time on the same local
   day rather than silently dropping the session. */
function protocolAlternateSlot(item,existing,planId){
  const durationMs=new Date(item.endsAt)-new Date(item.startsAt);
  for(let step=1;step<=16;step++){
    for(const dir of [1,-1]){
      const start=new Date(new Date(item.startsAt).getTime()+dir*step*30*60000),end=new Date(start.getTime()+durationMs);
      if(start.getTime()<Date.now())continue;
      const probe={key:item.key,startsAt:start.toISOString(),endsAt:end.toISOString()};
      if(!protocolConflictsFor(probe,existing,planId).length)return{startsAt:probe.startsAt,endsAt:probe.endsAt};
    }
  }
  return null;
}
async function protocolScheduleReview(memberId,b){
  const planId=uuid(b.planId)?String(b.planId):'';
  if(!planId)return{status:400,body:{ok:false,error:'Save the Protocol before reviewing its schedule.'}};
  const items=protocolCleanScheduleItems(b.items);
  if(!items.length)return{status:400,body:{ok:false,error:'There is nothing to schedule yet.'}};
  const sorted=items.slice().sort((x,y)=>String(x.startsAt).localeCompare(String(y.startsAt)));
  const existing=await protocolCalendarWindow(memberId,sorted[0].startsAt,sorted[sorted.length-1].endsAt);
  const occupied=(existing||[]).slice(),rows=[];
  for(const item of sorted){
    const conflicts=protocolConflictsFor(item,occupied,planId);
    const already=(existing||[]).find(r=>String(r.protocol_plan_id||'')===planId&&String(r.protocol_item_key||'')===item.key);
    const row=Object.assign({},item,{state:conflicts.length?'conflict':already?'existing':'new',conflicts,alternate:null});
    if(conflicts.length)row.alternate=protocolAlternateSlot(item,occupied,planId);
    rows.push(row);
    if(!conflicts.length){occupied.push({id:'proposal:'+item.key,kind:'protocol',title:item.title,starts_at:item.startsAt,ends_at:item.endsAt,status:'scheduled',semantic_role:protocolCalendarSemanticRole(item.itemType),protocol_plan_id:planId,protocol_item_key:item.key})}
  }
  return{status:200,body:{ok:true,planId,items:rows,counts:{total:rows.length,new:rows.filter(r=>r.state==='new').length,existing:rows.filter(r=>r.state==='existing').length,conflict:rows.filter(r=>r.state==='conflict').length}}};
}
/* CAL-003/CAL-009. One authoritative server-side write path. Repeating the same
   confirmation reuses the same rows via (member_id, protocol_plan_id,
   protocol_item_key); it never inserts a duplicate and never touches a row that
   is not kind='protocol' for this member and this plan. */
async function protocolScheduleCommit(memberId,b){
  const planId=uuid(b.planId)?String(b.planId):'';
  if(!planId)return{status:400,body:{ok:false,error:'Save the Protocol before adding it to MAH Calendar.'}};
  const items=protocolCleanScheduleItems(b.items);
  if(!items.length)return{status:400,body:{ok:false,error:'Choose at least one item to add.'}};
  const payload=items.map(item=>({key:item.key,startsAt:item.startsAt,endsAt:item.endsAt,title:item.title,notes:item.notes||'',itemType:item.itemType,semanticRole:protocolCalendarSemanticRole(item.itemType),programDayIndex:item.programDayIndex}));
  try{
    const raw=await P.db('rpc/commit_mah_protocol_schedule',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_member_id:memberId,p_plan_id:planId,p_items:payload})});
    const result=Array.isArray(raw)?raw[0]:raw;
    if(!result||result.ok!==true){const conflicts=result&&Array.isArray(result.conflicts)?result.conflicts:[];return{status:409,body:{ok:false,code:'PROTOCOL_SCHEDULE_CONFLICT',error:'The calendar changed before commit. Nothing was written.',conflicts,items:result&&result.items||[]}}}
    return{status:200,body:{ok:true,planId,written:Array.isArray(result.written)?result.written:[],skipped:[],events:await protocolPlanEvents(memberId,planId)}};
  }catch(error){
    if(protocolSchemaMissing(error))return{status:503,body:{ok:false,code:'PROTOCOL_SCHEMA',error:'MAH PROTOCOL Calendar scheduling needs database migration 051.'}};
    throw error;
  }
}
/* CAL-010. Removing a scheduled instance deletes a Protocol calendar row and
   nothing else. Completed workout history lives in gym_sessions/sets and is
   never reachable from here. */
async function protocolScheduleRemove(memberId,b){
  const planId=uuid(b.planId)?String(b.planId):'',key=trainingText(b.key,120);
  if(!planId||!key)return{status:400,body:{ok:false,error:'That scheduled item was not found.'}};
  try{
    await P.db('member_calendar_events?member_id=eq.'+encodeURIComponent(memberId)+'&kind=eq.protocol'
      +'&protocol_plan_id=eq.'+encodeURIComponent(planId)+'&protocol_item_key=eq.'+encodeURIComponent(key),
      {method:'DELETE',headers:{Prefer:'return=minimal'}});
    return{status:200,body:{ok:true,events:await protocolPlanEvents(memberId,planId)}};
  }catch(error){
    if(protocolSchemaMissing(error))return{status:503,body:{ok:false,code:'PROTOCOL_SCHEMA',error:'MAH PROTOCOL Calendar scheduling needs database migration 051.'}};
    throw error;
  }
}
async function protocolPlanEvents(memberId,planId){
  if(!uuid(planId))return[];
  try{
    const rows=await P.db('member_calendar_events?select=id,title,starts_at,ends_at,status,semantic_role,metadata,protocol_item_key'
      +'&member_id=eq.'+encodeURIComponent(memberId)+'&kind=eq.protocol&protocol_plan_id=eq.'+encodeURIComponent(planId)
      +'&order=starts_at.asc&limit=500');
    return (rows||[]).map(r=>({id:r.id,title:r.title,startsAt:r.starts_at,endsAt:r.ends_at,status:r.status,
      semanticRole:r.semantic_role||'protocol_workout',itemKey:r.protocol_item_key||'',
      itemType:(r.metadata&&r.metadata.itemType)||'workout',
      programDayIndex:(r.metadata&&r.metadata.programDayIndex)==null?null:Number(r.metadata.programDayIndex)}));
  }catch(error){if(protocolSchemaMissing(error))return[];throw error}
}
/* UX-007. The overview is calendar-sensitive from canonical rows served here.
   It never reads scheduling out of the Calendar iframe's DOM. */
async function protocolFoundation(memberId,b){
  const fromIso=protocolIsoInstant(b.windowFrom)||new Date(Date.now()-7*86400000).toISOString();
  const toIso=protocolIsoInstant(b.windowTo)||new Date(Date.now()+35*86400000).toISOString();
  /* R71 / ERROR-03 — the Protocol entry and tutorial need NEITHER stored
     preferences NOR a calendar window to be useful. Before this pass a
     transient non-schema read failure on either optional layer escaped this
     function, missed the PROTOCOL_SCHEMA guard in the action, reached the
     outer handler and became a blanket 500 that blanked the whole page.
     Each optional layer now degrades in place and reports itself honestly;
     nothing is claimed to have loaded that did not. */
  let preferences=null,schemaReady=true,preferencesUnavailable=false,calendarUnavailable=false,preferencesFailure=null,calendarFailure=null;
  try{preferences=protocolPreferencesPublic(await protocolPreferencesRow(memberId))}
  catch(error){
    if(error&&error.code==='PROTOCOL_SCHEMA'){schemaReady=false;preferences=protocolPreferencesPublic(null)}
    else{preferencesUnavailable=true;preferencesFailure=protocolOptionalFailure(error);preferences=protocolPreferencesPublic(null);console.warn('mah protocol preferences foundation',error&&error.message)}
  }
  let calendar=[];
  try{calendar=(await protocolCalendarWindow(memberId,fromIso,toIso)).map(r=>({
    id:r.id,kind:r.kind,title:r.title,startsAt:r.starts_at,endsAt:r.ends_at,status:r.status,
    semanticRole:r.semantic_role||null,protocolPlanId:r.protocol_plan_id||null,itemKey:r.protocol_item_key||null,
    paidBooking:r.kind==='fob_sesh'||r.kind==='lift_sesh'}))}
  catch(error){
    if(error&&error.code==='PROTOCOL_SCHEMA')schemaReady=false;
    else{calendarUnavailable=true;calendarFailure=protocolOptionalFailure(error);console.warn('mah protocol calendar foundation',error&&error.message)}
  }
  return{ok:true,protocolSchemaReady:schemaReady,preferencesUnavailable,calendarUnavailable,preferencesFailure,calendarFailure,preferences,calendar,windowFrom:fromIso,windowTo:toIso,
    physiquePaths:protocolAI().PHYSIQUE_PATHS,sessionMinutes:protocolAI().SESSION_MINUTES};
}
/* AI-002 / FAIL-004. Retry-safe generation. The same clientKey returns the
   previously generated draft instead of paying for and producing a second one.
   The cache is per warm instance and intentionally small; a cold miss simply
   regenerates, which is still safe because generation writes nothing. */
const PROTOCOL_DRAFTS=new Map();
const PROTOCOL_DRAFT_TTL_MS=15*60*1000;
function protocolDraftKey(memberId,clientKey){return memberId+'::'+clientKey}
function protocolDraftGet(memberId,clientKey){
  const hit=PROTOCOL_DRAFTS.get(protocolDraftKey(memberId,clientKey));
  if(!hit)return null;
  if(Date.now()-hit.at>PROTOCOL_DRAFT_TTL_MS){PROTOCOL_DRAFTS.delete(protocolDraftKey(memberId,clientKey));return null}
  return hit.draft;
}
function protocolDraftPut(memberId,clientKey,draft){
  if(PROTOCOL_DRAFTS.size>200)PROTOCOL_DRAFTS.clear();
  PROTOCOL_DRAFTS.set(protocolDraftKey(memberId,clientKey),{at:Date.now(),draft});
  return draft;
}
/* DATA-003 / AI-005. The brief carries only values that genuinely exist. A
   missing optional measurement is simply absent — it is never defaulted, and
   the model is told nothing that would let it invent one. */
async function protocolBrief(memberId,b,preferences){
  const foundation=await bodyFoundation(memberId).catch(()=>({profile:null,measurements:[],healthDays:[],activitySegments:[]}));
  const profile=foundation.profile||{},measurements=Array.isArray(foundation.measurements)?foundation.measurements:[];
  const latest=measurements.length?measurements[measurements.length-1]:null;
  const body={};
  if(profile.age_years!=null)body.ageYears=Number(profile.age_years);
  if(profile.height_in!=null)body.heightIn=Number(profile.height_in);
  if(latest&&latest.weight_lb!=null)body.currentWeightLb=Number(latest.weight_lb);
  if(latest&&latest.waist_in!=null)body.waistIn=Number(latest.waist_in);
  if(latest&&latest.body_fat_pct!=null)body.measuredBodyFatPct=Number(latest.body_fat_pct);
  if(profile.goal_weight_lb!=null)body.goalWeightLb=Number(profile.goal_weight_lb);
  if(profile.goal_body_fat_pct!=null)body.goalBodyFatPct=Number(profile.goal_body_fat_pct);
  let recentSessions=[];
  try{
    const progress=await memberGymProgress(memberId),seen=new Set();
    for(const row of (progress.sessions||[])){
      const id=String(row&&row.id||row&&row.session_date||'');if(!id||seen.has(id))continue;seen.add(id);
      const date=trainingDate(row&&row.session_date)||trainingDate(String(row&&row.ended_at||'').slice(0,10));
      recentSessions.push({date:date||null,name:trainingText(row&&row.name,80)||'Workout'});
      if(recentSessions.length>=10)break;
    }
  }catch(e){}
  let savedPrograms=[],currentProgram=null;
  try{
    const rows=await programsForMember(memberId);
    savedPrograms=(rows||[]).slice(0,12).map(r=>({id:String(r.id||''),name:trainingText(r.name,80),sub:trainingText(r.sub,100)}));
    if(String(b.startPath)==='current-program'&&uuid(b.selectedProgramId)){
      const hit=(rows||[]).find(r=>String(r.id||'')===String(b.selectedProgramId));
      if(hit){
        /* Keep the canonical Program body byte-for-structure intact in server
           memory. A bounded AI view is derived separately at the provider
           boundary so Protocol can reference the real Program without ever
           rewriting or normalizing it into the AI draft shape. */
        currentProgram={id:String(hit.id),name:trainingText(hit.name,80)||'Program',sub:trainingText(hit.sub,140),updatedAt:trainingText(hit.updated_at,80),body:(hit.body&&typeof hit.body==='object'?hit.body:{}),aiBody:protocolJsonObject(hit.body||{},120)};
      }
    }
  }catch(e){console.warn('mah protocol program context',e&&e.message)}
  const draft=protocolJsonObject(b.inputs,80);delete draft._resumeQuestionId;
  let calendarContext=[];try{calendarContext=(await protocolCalendarWindow(memberId,new Date(Date.now()-7*86400000).toISOString(),new Date(Date.now()+35*86400000).toISOString())).slice(0,120).map(r=>({kind:r.kind,title:trainingText(r.title,100),startsAt:r.starts_at,status:r.status,semanticRole:r.semantic_role||null,protocolPlanId:r.protocol_plan_id||null}))}catch(e){}
  let currentPeriodization=null;try{const pr=await periodizationRows(memberId);const active=(pr||[]).map(periodizationPublic).find(x=>x&&x.protocol);if(active)currentPeriodization={id:active.id,name:active.name,goal:active.goal,linkedProgramId:active.linkedProgramId,currentPosition:active.currentPosition||null,mesocycleCount:Array.isArray(active.mesocycles)?active.mesocycles.length:0}}catch(e){}
  return{
    mission:{
      primaryGoal:trainingText(b.primaryGoal||preferences.primaryGoal,300),
      secondaryGoal:trainingText(b.secondaryGoal||preferences.secondaryGoal,300),
      durationWeeks:protocolDurationWeeks(b.durationWeeks!=null?b.durationWeeks:preferences.durationWeeks),
      targetPhysiquePath:protocolPathId(b.targetPhysiquePath||preferences.targetPhysiquePath)||'hybrid',
      startPath:String(b.startPath)==='current-program'?'current-program':'build-for-me'
    },
    bodyFoundation:body,
    /* Explicitly naming what is absent stops the model from filling the gap. */
    missingOptionalMeasurements:['waistIn','measuredBodyFatPct','goalWeightLb','goalBodyFatPct'].filter(k=>body[k]==null),
    sessionMinutes:protocolSessionMinutes(b.sessionMinutes),
    onboarding:draft,
    savedPrograms,
    currentProgram,
    recentCompletedSessions:recentSessions,
    calendarContext,
    currentPeriodization,
    /* Browser-estimated Activity is labelled as exactly that. */
    activityDataNote:'Any step or movement figure here is MAHFITT Activity, which may be browser-estimated. Do not describe it as Watch- or HealthKit-measured unless the source says so.',
    visualReview:preferences.visualReview||null
  };
}

function protocolProgramFactSummary(program){
  if(!program||!program.body||typeof program.body!=='object')return null;
  const days=Array.isArray(program.body.days)?program.body.days:[];let exercises=0,sets=0,repsKnown=0;
  const dayNames=[];days.forEach(d=>{dayNames.push(trainingText(d&&d.name,80)||'Training Day');const items=Array.isArray(d&&d.items)?d.items:[];exercises+=items.length;items.forEach(it=>{const ss=Array.isArray(it&&it.sets)?it.sets:[];sets+=ss.length;ss.forEach(st=>{if(st&&st.reps!=null)repsKnown++})})});
  return{id:program.id,name:program.name,dayCount:days.length,dayNames,exerciseCount:exercises,setCount:sets,repsKnown,canonical:true};
}
function protocolKnownFactsFromBrief(brief){
  brief=brief||{};const facts={},add=(key,value,source,confidence)=>{if(value==null||value===''||(Array.isArray(value)&&!value.length))return;facts[key]={value,source,confidence:confidence||'high'}};
  const m=brief.mission||{},on=brief.onboarding||{},body=brief.bodyFoundation||{};
  add('goal.primary',m.primaryGoal,on.primaryGoal?'saved_protocol_answer':'protocol_preference');add('goal.physiquePath',m.targetPhysiquePath,on.targetPhysiquePath?'saved_protocol_answer':'protocol_preference');
  ['physiqueLeannessBias','physiqueTaperBias','trainingBackground','equipmentKit','limitCategory','sessionsPerWeek','sessionMinutes','trainingWindow','activityLevel','conditioningEmphasis','foodGuidance','usePhotos'].forEach(k=>add('answer.'+k,on[k],'saved_protocol_answer'));
  Object.keys(body).forEach(k=>add('body.'+k,body[k],'body_progress'));
  const pf=protocolProgramFactSummary(brief.currentProgram);if(pf)add('program.structure',pf,'selected_program');
  if(Array.isArray(brief.recentCompletedSessions)&&brief.recentCompletedSessions.length)add('history.recentSessions',brief.recentCompletedSessions,'workout_history');
  if(Array.isArray(brief.calendarContext)&&brief.calendarContext.length)add('calendar.window',brief.calendarContext,'mah_calendar','high');
  if(brief.currentPeriodization)add('periodization.current',brief.currentPeriodization,'current_periodization');
  return facts;
}
function protocolQuestionPlanFromBrief(brief){
  const on=brief&&brief.onboarding||{},skip=[],because={};const known=(id,condition,reason)=>{if(condition){skip.push(id);because[id]=reason}};
  known('mission',!!(brief&&brief.mission&&brief.mission.primaryGoal&&brief.mission.targetPhysiquePath),'Goal + physique destination already saved.');
  known('build-texture',on.physiqueLeannessBias!=null&&on.physiqueLeannessBias!=='','Leanness/density preference already saved.');
  known('taper',on.physiqueTaperBias!=null&&on.physiqueTaperBias!=='','Taper preference already saved.');
  ['background','limits','sessions','activity','conditioning','food','photos'].forEach(id=>{const key={background:'trainingBackground',limits:'limitCategory',sessions:'sessionsPerWeek',activity:'activityLevel',conditioning:'conditioningEmphasis',food:'foodGuidance',photos:'usePhotos'}[id];known(id,on[key]!=null&&on[key]!=='','Previous Protocol answer already exists.')});
  if(brief&&brief.mission&&brief.mission.startPath==='current-program')known('equipment',true,'The selected canonical Program already determines its exercise/session skeleton; MAHFITT will not ask you to rebuild it.');
  return{skipQuestionIds:Array.from(new Set(skip)),reasons:because};
}
async function protocolContext(memberId,b){
  let preferences=protocolPreferencesPublic(null),preferencesFailure=null;
  try{preferences=protocolPreferencesPublic(await protocolPreferencesRow(memberId))}catch(error){if(error&&error.code==='PROTOCOL_SCHEMA')preferencesFailure={kind:'schema',message:'Saved Protocol answers are unavailable until database setup is complete.'};else preferencesFailure=protocolOptionalFailure(error)}
  const brief=await protocolBrief(memberId,b,preferences);
  if(String(b.startPath)==='current-program'&&!brief.currentProgram)return{status:404,body:{ok:false,code:'PROTOCOL_PROGRAM_NOT_FOUND',error:'That saved Program is no longer available.'}};
  const plan=protocolQuestionPlanFromBrief(brief),facts=protocolKnownFactsFromBrief(brief);
  return{status:200,body:{ok:true,knownFacts:facts,questionPlan:plan,currentProgram:protocolProgramFactSummary(brief.currentProgram),currentPeriodization:brief.currentPeriodization||null,calendarAvailable:Array.isArray(brief.calendarContext)&&brief.calendarContext.length>0,preferencesFailure}};
}
async function protocolGenerate(memberId,b){
  const clientKey=trainingText(b.clientKey,80);
  if(!clientKey)return{status:400,body:{ok:false,error:'A retry-safe request key is required.'}};
  const cached=protocolDraftGet(memberId,clientKey);
  if(cached)return{status:200,body:{ok:true,draft:cached,idempotent:true}};
  let preferences;
  try{preferences=protocolPreferencesPublic(await protocolPreferencesRow(memberId))}
  catch(error){if(error&&error.code==='PROTOCOL_SCHEMA')return{status:503,body:{ok:false,code:'PROTOCOL_SCHEMA',error:'MAH PROTOCOL needs database migration 051.'}};throw error}
  const brief=await protocolBrief(memberId,b,preferences);
  if(!brief.mission.primaryGoal)return{status:400,body:{ok:false,error:'Choose the mission before building the Protocol.'}};
  if(brief.mission.startPath==='current-program'&&!brief.currentProgram)return{status:404,body:{ok:false,code:'PROTOCOL_PROGRAM_NOT_FOUND',error:'That saved Program is no longer available. Choose another Program and try again.'}};
  const library=await retroworkLibrary();
  const hint=[brief.mission.primaryGoal,brief.mission.secondaryGoal,JSON.stringify(brief.onboarding||{})].join(' ');
  const candidates=retroworkProgramCandidatePool(library,hint,null);
  try{
    /* The provider receives the bounded AI view, never the canonical body.
       The exact body remains server-side and is reattached after validation. */
    const providerBrief=Object.assign({},brief);
    if(brief.currentProgram){
      providerBrief.currentProgram=Object.assign({},brief.currentProgram,{body:brief.currentProgram.aiBody||protocolJsonObject(brief.currentProgram.body||{},120)});
      delete providerBrief.currentProgram.aiBody;
    }
    const draft=await protocolAI().generateProtocol({
      brief:providerBrief,candidates,research:[],
      requestedPath:brief.mission.targetPhysiquePath,
      requestedGoal:brief.mission.primaryGoal,
      requestedDurationWeeks:brief.mission.durationWeeks,
      sessionMinutes:brief.sessionMinutes
    });
    draft.startPath=brief.mission.startPath;
    draft.generatedFrom={knownFacts:protocolKnownFactsFromBrief(brief),questionPlan:protocolQuestionPlanFromBrief(brief),selectedProgram:protocolProgramFactSummary(brief.currentProgram)};
    if(brief.mission.startPath==='current-program'&&brief.currentProgram){
      draft.linkedProgramId=brief.currentProgram.id;
      draft.programRevision=brief.currentProgram.updatedAt||null;
      draft.programDraft=brief.currentProgram.body;
      draft.usesExistingProgram=true;
      draft.existingProgramName=brief.currentProgram.name;
    }
    draft.clientKey=clientKey;
    return{status:200,body:{ok:true,draft:protocolDraftPut(memberId,clientKey,draft)}};
  }catch(error){
    const code=String(error&&error.code||'');
    /* FAIL-001 / AI-007 / AI-008. Every branch preserves the member's inputs;
       none of them fabricates a plan and calls it AI. */
    if(code==='NO_PROVIDER')return{status:503,body:{ok:false,code,error:'MAH PROTOCOL AI is not configured on this server yet. Your answers are saved.'}};
    if(code==='NO_CANDIDATES')return{status:503,body:{ok:false,code,error:'The MAHFITT exercise catalog is unavailable right now. Your answers are saved.'}};
    if(code==='PROTOCOL_TIMEOUT')return{status:504,body:{ok:false,code,error:'MAH PROTOCOL took too long to build. Your answers are saved — try again.'}};
    if(code==='PROTOCOL_UNRESOLVED')return{status:422,body:{ok:false,code,error:'MAH PROTOCOL could not match its exercises to the MAHFITT catalog. Nothing was saved — adjust your equipment or preferences and rebuild.'}};
    if(code==='PROTOCOL_INVALID'||code==='PROTOCOL_SCHEMA_VERSION'||code==='PROTOCOL_REFUSAL')return{status:422,body:{ok:false,code,error:'MAH PROTOCOL returned a plan MAHFITT could not verify, so nothing was saved. Your answers are still here.'}};
    console.warn('mah protocol generate',code,error&&error.message);
    return{status:502,body:{ok:false,code:code||'PROTOCOL_ERROR',error:'MAH PROTOCOL could not build a plan right now. Your answers are still here.'}};
  }
}
/* PHOTO-002/003/005. Consent is required, ownership is verified, and the
   analysis can only produce the four neutral focus labels the schema allows. */
async function protocolVisualReview(memberId,b){
  let row;
  try{row=await protocolPreferencesRow(memberId)}
  catch(error){if(error&&error.code==='PROTOCOL_SCHEMA')return{status:503,body:{ok:false,code:'PROTOCOL_SCHEMA',error:'MAH PROTOCOL needs database migration 051.'}};throw error}
  const consent=(b.consent&&typeof b.consent==='object'?b.consent:(row&&row.visual_consent)||{});
  if(consent.adult!==true||consent.ownImages!==true)
    return{status:400,body:{ok:false,code:'PROTOCOL_CONSENT',error:'Confirm that you are an adult and that the photos are of you before MAHFITT looks at them.'}};
  const owned=await protocolOwnedMedia(memberId,b.mediaIds);
  if(!owned.length)return{status:404,body:{ok:false,code:'PROTOCOL_MEDIA',error:'Those MAH MEDIA photos were not found in your private library.'}};
  const images=[];
  for(const media of owned){
    /* Signed, member-scoped access only. The bytes are fetched server-side and
       never handed to the browser as a public URL, never logged, and never
       copied into a second bucket. */
    let url='';try{url=await signedProgressMediaUrl(memberId,media.storage_path)}catch(e){continue}
    if(!url)continue;
    try{
      const response=await fetch(url);if(!response.ok)continue;
      const buffer=Buffer.from(await response.arrayBuffer());
      if(!buffer.length||buffer.length>8*1024*1024)continue;
      const mime=progressMediaMime('photo',media.storage_path,response.headers.get('content-type'))||'image/jpeg';
      images.push({angle:String(media.angle||''),dataUrl:'data:'+mime+';base64,'+buffer.toString('base64')});
    }catch(e){}
  }
  if(!images.length)return{status:502,body:{ok:false,code:'PROTOCOL_MEDIA',error:'Those photos could not be opened right now. The rest of your Protocol is unaffected.'}};
  try{
    const review=await protocolAI().reviewPhysiqueImages({images,path:b.targetPhysiquePath,goal:b.primaryGoal});
    review.mediaIds=owned.map(m=>String(m.id));
    const saved=await P.db('member_protocol_preferences?on_conflict=member_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify({member_id:memberId,visual_consent:protocolJsonObject(consent,12),visual_media_ids:review.mediaIds,visual_review:review,visual_review_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
    return{status:200,body:{ok:true,visualReview:review,preferences:protocolPreferencesPublic(saved&&saved[0])}};
  }catch(error){
    const code=String(error&&error.code||'');
    if(code==='NO_PROVIDER')return{status:503,body:{ok:false,code,error:'The optional visual review is not configured on this server. Your Protocol can still be built without photos.'}};
    if(code==='PROTOCOL_TIMEOUT')return{status:504,body:{ok:false,code,error:'The optional visual review took too long. Your Protocol can still be built without photos.'}};
    if(protocolSchemaMissing(error))return{status:503,body:{ok:false,code:'PROTOCOL_SCHEMA',error:'MAH PROTOCOL needs database migration 051.'}};
    console.warn('mah protocol visual',code||'error');
    return{status:502,body:{ok:false,code:code||'PROTOCOL_VISUAL',error:'The optional visual review could not run. Your Protocol can still be built without photos.'}};
  }
}
/* PHOTO-004. Clearing the review removes the analysis only. The original MAH
   MEDIA entries are untouched. */
async function protocolVisualClear(memberId){
  try{
    const rows=await P.db('member_protocol_preferences?on_conflict=member_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify({member_id:memberId,visual_review:null,visual_review_at:null,visual_media_ids:[],updated_at:new Date().toISOString()})});
    return{status:200,body:{ok:true,preferences:protocolPreferencesPublic(rows&&rows[0])}};
  }catch(error){
    if(protocolSchemaMissing(error))return{status:503,body:{ok:false,code:'PROTOCOL_SCHEMA',error:'MAH PROTOCOL needs database migration 051.'}};
    throw error;
  }
}
/* PHOTO-006. A selected photo that no longer exists marks the review stale
   rather than breaking the Protocol. */
async function protocolVisualFreshness(memberId,preferences){
  const ids=Array.isArray(preferences&&preferences.visualMediaIds)?preferences.visualMediaIds:[];
  if(!ids.length||!preferences.visualReview)return{stale:false,missing:[]};
  const owned=await protocolOwnedMedia(memberId,ids).catch(()=>[]);
  const have=new Set((owned||[]).map(r=>String(r.id)));
  const missing=ids.filter(id=>!have.has(String(id)));
  return{stale:missing.length>0,missing};
}

function activitySchemaMissing(error){return /member_activity_segments|activity_segment_id|semantic_role|schema cache|does not exist|ended_at/i.test(String(error&&error.detail||error&&error.message||''))}
async function activityLatestWeight(memberId){let candidates=[];try{const rows=await P.db('member_body_measurements?select=measured_on,weight_lb&member_id=eq.'+encodeURIComponent(memberId)+'&weight_lb=not.is.null&order=measured_on.desc&limit=1');if(rows&&rows[0])candidates.push({day:rows[0].measured_on,value:Number(rows[0].weight_lb)})}catch(e){}try{const rows=await P.db('member_health_daily?select=day,metrics&member_id=eq.'+encodeURIComponent(memberId)+'&order=day.desc&limit=45');const row=(rows||[]).find(r=>r&&r.metrics&&Number.isFinite(Number(r.metrics.bodyWeightLb)));if(row)candidates.push({day:row.day,value:Number(row.metrics.bodyWeightLb)})}catch(e){}candidates=candidates.filter(x=>Number.isFinite(x.value)&&x.value>0).sort((a,b)=>String(b.day||'').localeCompare(String(a.day||'')));return candidates[0]?candidates[0].value:null}
function activityElapsedMs(row,at){if(!row)return 0;const now=at instanceof Date?+at:+new Date(at||Date.now()),start=+new Date(row.started_at),paused=Math.max(0,Number(row.paused_ms)||0),openPause=row.state==='paused'&&row.paused_at?Math.max(0,now-(+new Date(row.paused_at))):0;return Number.isFinite(start)?Math.max(0,now-start-paused-openPause):0}
const ACTIVITY_CORE_TYPES=['walk','run','misc','cycling','hiking','fobbing','basketball','tennis','bouldering'];
const ACTIVITY_STATIC_MET={cycling:7.5,hiking:6.0,basketball:6.5,tennis:7.3,bouldering:8.0};
function activityMet(type,effort,incline){if(type==='run')return 8.3;if(type==='walk')return Math.max(3.0,3.5+Math.min(15,Math.max(0,Number(incline)||0))*.08);if(type==='fobbing')return{easy:4,moderate:6,hard:8,very_hard:10}[effort]||6;if(ACTIVITY_STATIC_MET[type])return ACTIVITY_STATIC_MET[type];const map={easy:2.8,moderate:4.0,hard:6.0,very_hard:8.0};return map[effort]||4.0}
function activityEstimatedCalories(row,endedAt){const weight=Number(row&&row.body_weight_lb),minutes=activityElapsedMs(row,endedAt)/60000;if(!Number.isFinite(weight)||weight<=0||minutes<=0)return null;const kg=weight*.45359237,met=activityMet(row.activity_type,row.effort_level,row.incline_pct),kcal=met*3.5*kg/200*minutes;return Math.max(0,Math.round(kcal*10)/10)}
function activityTitle(row){if(row&&row.activity_type==='misc')return trainingText(row.activity_label,80)||'Activity';const labels={walk:'Walk',run:'Run',cycling:'Cycling',hiking:'Hiking',fobbing:'Fobbing',basketball:'Basketball',tennis:'Tennis',bouldering:'Bouldering',workout:'Workout'};return labels[row&&row.activity_type]||'Activity'}
function activityCalendarMetadata(row){const src=row.source_summary&&row.source_summary.metricSource,duration=activityElapsedMs(row,row.ended_at||Date.now())/60000;return{activityType:row.activity_type||'unclassified',activityLabel:row.activity_label||null,durationMinutes:Math.round(Math.max(0,duration)*10)/10,calories:row.active_energy_kcal==null?null:Number(row.active_energy_kcal),calorieSource:row.energy_source==='healthkit'?'healthkit':'estimated',steps:row.steps==null?null:Number(row.steps),stepsMeasured:row.steps!=null&&(src==='healthkit'||src==='core_motion'),distanceMi:row.distance_mi==null?null:Number(row.distance_mi),distanceMeasured:row.distance_mi!=null&&(src==='healthkit'||src==='core_motion'),sourceAwareAggregation:true,mirroredSamplesBlindlySummed:false}}
async function syncActivityCalendar(memberId,row){if(!row||!uuid(row.id)||!row.ended_at||row.state!=='closed')return null;const existing=await P.db('member_calendar_events?select=id&member_id=eq.'+encodeURIComponent(memberId)+'&activity_segment_id=eq.'+encodeURIComponent(row.id)+'&limit=1'),payload={member_id:memberId,kind:'activity',title:activityTitle(row),notes:null,starts_at:row.started_at,ends_at:row.ended_at,all_day:false,color:'gold',status:'completed',source:'activity',created_by:'system',activity_segment_id:row.id,semantic_role:'activity',metadata:activityCalendarMetadata(row),updated_at:new Date().toISOString()};if(existing&&existing[0]){const rows=await P.db('member_calendar_events?id=eq.'+encodeURIComponent(existing[0].id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});return rows&&rows[0]||null}const rows=await P.db('member_calendar_events',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});return rows&&rows[0]||null}
async function activityLiveState(memberId){const rows=await P.db('member_activity_segments?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&state=in.(active,paused)&order=started_at.desc&limit=1');return rows&&rows[0]||null}
async function activityStart(memberId,b){const type=String(b.activityType||'');if(!ACTIVITY_CORE_TYPES.includes(type))return{status:400,body:{ok:false,error:'Choose a supported MAHFITT Activity.'}};const existing=await activityLiveState(memberId);if(existing)return{status:200,body:{ok:true,activity:existing,reused:true}};const weight=await activityLatestWeight(memberId);if(weight==null)return{status:409,body:{ok:false,code:'BODY_WEIGHT_REQUIRED',error:'Add body weight in Body Progress before starting an Activity.'}};const clientKey=trainingText(b.clientKey,120)||crypto.randomUUID(),now=new Date().toISOString(),label=type==='misc'?trainingText(b.activityLabel,80):null;if(type==='misc'&&!label)return{status:400,body:{ok:false,error:'Name the Misc Activity first.'}};const effort=['easy','moderate','hard','very_hard'].includes(String(b.effortLevel))?String(b.effortLevel):null,usesIncline=type==='walk'||type==='run'||type==='hiking';const payload={member_id:memberId,started_at:now,ended_at:null,activity_type:type,activity_label:label,state:'active',target_minutes:trainingNumber(b.targetMinutes,1,1440,true),incline_pct:usesIncline?(trainingNumber(b.inclinePct,0,50,false)??0):null,effort_level:usesIncline?null:effort,paused_at:null,paused_ms:0,client_key:clientKey,body_weight_lb:weight,steps:null,distance_mi:null,active_energy_kcal:null,energy_source:null,source_summary:{runtime:'web',metricSource:'estimated-only-until-native-bridge',nativeBridgeContract:'MAHFITT_ACTIVITY_NATIVE_V1',energyModel:'MET-context-unless-healthkit'},confidence:'unknown',user_edited:false,updated_at:now};try{const rows=await P.db('member_activity_segments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});return{status:200,body:{ok:true,activity:rows&&rows[0]||payload}}}catch(error){if(/duplicate key|member_activity_client_key_uq/i.test(String(error&&error.detail||error&&error.message||''))){const rows=await P.db('member_activity_segments?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&client_key=eq.'+encodeURIComponent(clientKey)+'&limit=1');if(rows&&rows[0])return{status:200,body:{ok:true,activity:rows[0],reused:true}}}throw error}}
async function activityTransition(memberId,b,op){if(!uuid(b.id))return{status:400,body:{ok:false,error:'Active Activity was not found.'}};const rows=await P.db('member_activity_segments?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(b.id)+'&limit=1'),row=rows&&rows[0];if(!row)return{status:404,body:{ok:false,error:'Active Activity was not found.'}};const now=new Date(),patch={updated_at:now.toISOString()};if(op==='pause'){if(row.state==='paused')return{status:200,body:{ok:true,activity:row,reused:true}};if(row.state!=='active')return{status:409,body:{ok:false,error:'That Activity is already finished.'}};patch.state='paused';patch.paused_at=now.toISOString()}else if(op==='resume'){if(row.state==='active')return{status:200,body:{ok:true,activity:row,reused:true}};if(row.state!=='paused')return{status:409,body:{ok:false,error:'That Activity is already finished.'}};patch.state='active';patch.paused_ms=Math.max(0,Number(row.paused_ms)||0)+Math.max(0,+now-(+new Date(row.paused_at||now)));patch.paused_at=null}else return{status:400,body:{ok:false,error:'Unknown Activity transition.'}};const saved=await P.db('member_activity_segments?id=eq.'+encodeURIComponent(row.id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});return{status:200,body:{ok:true,activity:saved&&saved[0]||Object.assign({},row,patch)}}}
async function activityEstimateUpdate(memberId,b){if(!uuid(b.id))return{status:400,body:{ok:false,error:'Active Activity was not found.'}};const rows=await P.db('member_activity_segments?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(b.id)+'&limit=1'),row=rows&&rows[0];if(!row)return{status:404,body:{ok:false,error:'Active Activity was not found.'}};const current=row.source_summary&&row.source_summary.metricSource;if(current==='healthkit'||current==='core_motion')return{status:200,body:{ok:true,activity:row,reused:true}};const steps=trainingNumber(b.steps,0,10000000,true),summary=Object.assign({},row.source_summary&&typeof row.source_summary==='object'?row.source_summary:{},{runtime:'web',metricSource:'browser_estimate',estimated:true,sourceAwareAggregation:true,mirroredSamplesBlindlySummed:false}),patch={steps:steps==null?row.steps:steps,source_summary:summary,confidence:'low',updated_at:new Date().toISOString()};const saved=await P.db('member_activity_segments?id=eq.'+encodeURIComponent(row.id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});return{status:200,body:{ok:true,activity:saved&&saved[0]||Object.assign({},row,patch)}}}
async function activityNativeUpdate(memberId,b){if(!uuid(b.id))return{status:400,body:{ok:false,error:'Active Activity was not found.'}};const source=String(b.metricSource||'');if(!['healthkit','core_motion'].includes(source))return{status:400,body:{ok:false,error:'Native measured metrics require a HealthKit or Core Motion source.'}};const rows=await P.db('member_activity_segments?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(b.id)+'&limit=1'),row=rows&&rows[0];if(!row)return{status:404,body:{ok:false,error:'Active Activity was not found.'}};const summary=Object.assign({},row.source_summary&&typeof row.source_summary==='object'?row.source_summary:{},{runtime:'native',metricSource:source,sourceAwareAggregation:true,mirroredSamplesBlindlySummed:false});const patch={source_summary:summary,confidence:'high',updated_at:new Date().toISOString()};if(b.steps!=null)patch.steps=trainingNumber(b.steps,0,10000000,true);if(b.distanceMi!=null)patch.distance_mi=trainingNumber(b.distanceMi,0,100000,false);if(b.activeEnergyKcal!=null){if(source!=='healthkit')return{status:400,body:{ok:false,error:'Measured active energy must come from HealthKit.'}};patch.active_energy_kcal=trainingNumber(b.activeEnergyKcal,0,100000,false);patch.energy_source='healthkit'}const saved=await P.db('member_activity_segments?id=eq.'+encodeURIComponent(row.id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});return{status:200,body:{ok:true,activity:saved&&saved[0]||Object.assign({},row,patch)}}}
async function activityFinish(memberId,b){if(!uuid(b.id))return{status:400,body:{ok:false,error:'Active Activity was not found.'}};let rows=await P.db('member_activity_segments?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(b.id)+'&limit=1'),row=rows&&rows[0];if(!row)return{status:404,body:{ok:false,error:'Active Activity was not found.'}};if(row.state==='closed'){let event=null;try{event=await syncActivityCalendar(memberId,row)}catch(e){if(!activitySchemaMissing(e))throw e}return{status:200,body:{ok:true,activity:row,calendarEvent:event,reused:true}}}const now=new Date(),pausedMs=Math.max(0,Number(row.paused_ms)||0)+(row.state==='paused'&&row.paused_at?Math.max(0,+now-(+new Date(row.paused_at))):0),patch={ended_at:now.toISOString(),state:'closed',paused_at:null,paused_ms:pausedMs,updated_at:now.toISOString()};if(row.active_energy_kcal==null){const estimate=activityEstimatedCalories(Object.assign({},row,{paused_ms:pausedMs,state:'closed'}),now);if(estimate!=null){patch.active_energy_kcal=estimate;patch.energy_source='estimated'}}rows=await P.db('member_activity_segments?id=eq.'+encodeURIComponent(row.id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});row=rows&&rows[0]||Object.assign({},row,patch);const event=await syncActivityCalendar(memberId,row);return{status:200,body:{ok:true,activity:row,calendarEvent:event}}}
async function removeActivityCalendar(memberId,id){if(!uuid(id))return;await P.db('member_calendar_events?member_id=eq.'+encodeURIComponent(memberId)+'&activity_segment_id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{Prefer:'return=minimal'}})}
async function updateActivitySegment(memberId,b){const op=String(b.op||'relabel');if(op==='relabel'){if(!uuid(b.id)||!ACTIVITY_CORE_TYPES.concat(['workout','unclassified']).includes(String(b.activityType)))return{status:400,body:{ok:false,error:'Choose a valid activity segment.'}};const payload={activity_type:String(b.activityType),activity_label:String(b.activityType)==='misc'?trainingText(b.activityLabel,80)||'Misc Activity':null,user_edited:true,updated_at:new Date().toISOString()},rows=await P.db('member_activity_segments?id=eq.'+encodeURIComponent(b.id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)}),row=rows&&rows[0]||null;if(row&&row.state==='closed')await syncActivityCalendar(memberId,row);return{status:row?200:404,body:{ok:!!row,segment:row,error:row?undefined:'Activity segment not found.'}}}if(op==='merge'){const ids=(Array.isArray(b.ids)?b.ids:[]).map(String).filter(uuid).slice(0,20);if(ids.length<2)return{status:400,body:{ok:false,error:'Choose at least two segments to merge.'}};const rows=await P.db('member_activity_segments?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&id=in.('+ids.map(encodeURIComponent).join(',')+')&state=eq.closed&order=started_at.asc');if(!rows||rows.length!==ids.length)return{status:404,body:{ok:false,error:'One of those closed activity segments is no longer available.'}};const first=rows[0],last=rows[rows.length-1],overlap=rows.some((r,i)=>i&&new Date(r.started_at)<new Date(rows[i-1].ended_at)),sum=k=>rows.reduce((n,r)=>n+(Number(r[k])||0),0),max=k=>Math.max.apply(null,rows.map(r=>Number(r[k])||0)),sameType=rows.every(r=>r.activity_type===first.activity_type),payload={started_at:first.started_at,ended_at:last.ended_at,activity_type:sameType?first.activity_type:'unclassified',activity_label:sameType&&first.activity_type==='misc'?first.activity_label:null,state:'closed',steps:overlap?max('steps'):sum('steps'),distance_mi:overlap?max('distance_mi'):sum('distance_mi'),active_energy_kcal:overlap?max('active_energy_kcal'):sum('active_energy_kcal'),energy_source:rows.every(r=>r.energy_source===first.energy_source)?first.energy_source:null,source_summary:{mergedFrom:ids,overlapProtected:overlap,metricSource:'reconciled',sourceAwareAggregation:true,mirroredSamplesBlindlySummed:false},confidence:'unknown',user_edited:true,updated_at:new Date().toISOString()};const updated=await P.db('member_activity_segments?id=eq.'+encodeURIComponent(first.id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)}),row=updated&&updated[0]||null;for(const id of ids.slice(1))await removeActivityCalendar(memberId,id);await P.db('member_activity_segments?member_id=eq.'+encodeURIComponent(memberId)+'&id=in.('+ids.slice(1).map(encodeURIComponent).join(',')+')',{method:'DELETE',headers:{Prefer:'return=minimal'}});if(row)await syncActivityCalendar(memberId,row);return{status:200,body:{ok:true,segment:row}}}if(op==='split'){if(!uuid(b.id))return{status:400,body:{ok:false,error:'Choose an activity segment to split.'}};const rows=await P.db('member_activity_segments?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(b.id)+'&state=eq.closed&limit=1'),r=rows&&rows[0];if(!r)return{status:404,body:{ok:false,error:'Closed activity segment not found.'}};const a=+new Date(r.started_at),z=+new Date(r.ended_at),cut=+new Date(String(b.splitAt||''));if(!Number.isFinite(cut)||cut<=a||cut>=z)return{status:400,body:{ok:false,error:'Choose a split time inside the activity.'}};const ratio=(cut-a)/(z-a),part=(v,f)=>v==null?null:f(Number(v)*ratio),rest=(v,f)=>v==null?null:f(Number(v)*(1-ratio)),roundInt=n=>Math.round(n),round3=n=>Math.round(n*1000)/1000,round2=n=>Math.round(n*100)/100,common={activity_type:r.activity_type,activity_label:r.activity_label,state:'closed',energy_source:r.energy_source,confidence:r.confidence,user_edited:true,body_weight_lb:r.body_weight_lb,source_summary:{splitFrom:r.id,metricSource:'reconciled',sourceAwareAggregation:true,mirroredSamplesBlindlySummed:false},updated_at:new Date().toISOString()},left=Object.assign({},common,{ended_at:new Date(cut).toISOString(),steps:part(r.steps,roundInt),distance_mi:part(r.distance_mi,round3),active_energy_kcal:part(r.active_energy_kcal,round2)}),right=Object.assign({member_id:memberId,started_at:new Date(cut).toISOString(),ended_at:r.ended_at,client_key:null},common,{steps:rest(r.steps,roundInt),distance_mi:rest(r.distance_mi,round3),active_energy_kcal:rest(r.active_energy_kcal,round2)}),updated=await P.db('member_activity_segments?id=eq.'+encodeURIComponent(r.id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(left)}),inserted=await P.db('member_activity_segments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(right)}),result=[updated&&updated[0],inserted&&inserted[0]].filter(Boolean);for(const row of result)await syncActivityCalendar(memberId,row);return{status:200,body:{ok:true,segments:result}}}return{status:400,body:{ok:false,error:'Unknown activity edit.'}}}


/* ULTIMATE JOB III — AI RETROWORK canonical server boundary.
   Natural language may suggest candidate indexes, but the application owns all
   identity, value validation and persistence. Retrowork writes the same
   gym_sessions/gym_sets history as manual tracking without calling `finish`,
   because `finish` intentionally carries actuals into future program plans. */
function retroworkText(value,max){return String(value==null?'':value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ').trim().slice(0,max)}
function retroworkStem(word){word=String(word||'').toLowerCase();const aliases={ran:'run',jogged:'run',jogging:'run',running:'run',benched:'bench',squats:'squat',rows:'row',curls:'curl',presses:'press',lunges:'lunge'};if(aliases[word])return aliases[word];if(word.length>5&&word.endsWith('ing'))word=word.slice(0,-3);else if(word.length>4&&word.endsWith('ed'))word=word.slice(0,-2);else if(word.length>4&&word.endsWith('es'))word=word.slice(0,-2);else if(word.length>3&&word.endsWith('s'))word=word.slice(0,-1);return word}
function retroworkWords(value){const out=new Set();String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(Boolean).forEach(w=>{if(w.length>1)out.add(retroworkStem(w))});return out}
function retroworkSetNumber(value,min,max,integer){if(value==null||value==='')return null;const n=Number(value);if(!Number.isFinite(n))return null;const c=Math.max(min,Math.min(max,n));return integer?Math.round(c):c}
function retroworkDate(value){const s=String(value||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return'';const d=new Date(s+'T12:00:00Z');return Number.isNaN(d.getTime())?'':s}
async function retroworkProgramForMember(memberId,programId,dayIndex){
  if(!uuid(programId)||!Number.isInteger(Number(dayIndex))||Number(dayIndex)<0)return null;
  const di=Number(dayIndex);let row=null,kind='member';
  try{const rows=await P.db('gym_member_programs?select=id,name,sub,body&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(programId)+'&archived=eq.false&limit=1');row=rows&&rows[0]||null}catch(e){console.warn('retrowork member program',e&&e.message)}
  if(!row){kind='compat';try{const rows=await P.db('gym_sessions?select=id,name,notes,body&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(programId)+'&status=eq.program&limit=1');row=rows&&rows[0]||null}catch(e){console.warn('retrowork compat program',e&&e.message)}}
  if(!row)return null;const body=row.body&&typeof row.body==='object'?row.body:{},days=Array.isArray(body.days)?body.days:[],day=days[di];if(!day)return null;
  return{programId:row.id,programName:retroworkText(body.name||row.name,100),name:retroworkText(day.name||'Workout',100),dayIndex:di,kind,items:Array.isArray(day.items)?day.items.slice(0,50):[]};
}
async function retroworkLibrary(){return await P.db('gym_exercises?select=id,name,category,equipment,vars&archived=eq.false&order=name.asc&limit=2000')||[]}
function retroworkCandidateScore(row,inputWords,inputText,expectedIds){
  const id=String(row&&row.id||''),name=String(row&&row.name||'').toLowerCase(),words=retroworkWords(name);let score=expectedIds.has(id)?500:0;
  if(name&&inputText.includes(name))score+=160;
  words.forEach(w=>{if(inputWords.has(w))score+=18});
  const category=retroworkWords((row&&row.category||'')+' '+(row&&row.equipment||''));category.forEach(w=>{if(inputWords.has(w))score+=4});
  return score;
}
function retroworkCandidates(rows,input,program){
  const expectedIds=new Set((program&&program.items||[]).map(it=>uuid(it&&it.exerciseId)?String(it.exerciseId):'').filter(Boolean)),words=retroworkWords(input),text=String(input||'').toLowerCase();
  const scored=(rows||[]).filter(r=>uuid(r&&r.id)).map((r,index)=>({r,index,score:retroworkCandidateScore(r,words,text,expectedIds)}));
  scored.sort((a,b)=>b.score-a.score||String(a.r.name||'').localeCompare(String(b.r.name||''))||a.index-b.index);
  const picked=[],seen=new Set();
  (program&&program.items||[]).forEach(it=>{const id=String(it&&it.exerciseId||''),hit=scored.find(x=>String(x.r.id)===id);if(hit&&!seen.has(id)){picked.push(hit.r);seen.add(id)}});
  scored.forEach(x=>{const id=String(x.r.id);if(picked.length<120&&!seen.has(id)){picked.push(x.r);seen.add(id)}});
  return picked;
}
function retroworkProgramContext(program,candidates){
  if(!program)return null;const byId=new Map((candidates||[]).map((c,i)=>[String(c.id),i]));
  return{name:program.name,programName:program.programName,dayIndex:program.dayIndex,expected:(program.items||[]).map(it=>({name:retroworkText(it&&it.name,140),candidate_index:byId.has(String(it&&it.exerciseId||''))?byId.get(String(it.exerciseId)):null,sets:(Array.isArray(it&&it.sets)?it.sets:[]).slice(0,30).map(st=>({weight:retroworkSetNumber(st&&st.weight,0,3000,false),reps:retroworkSetNumber(st&&st.reps,0,1000,true),duration_s:retroworkSetNumber(st&&st.time,0,86400,true),distance:retroworkSetNumber(st&&st.distance,0,1000000,false),fm_distance:retroworkSetNumber(st&&st.fm,0,100000,false),fm_time_s:retroworkSetNumber(st&&st.fmTime,0,86400,true)}))}))};
}
function retroworkResolvedDraft(raw,candidates,program){
  raw=raw&&typeof raw==='object'?raw:{};let ambiguity=false;
  const draft={session_title:retroworkText(raw.session_title,100)||retroworkText(program&&program.name,100)||'AI Retrowork',session_date:retroworkDate(raw.session_date)||null,session_duration_s:retroworkSetNumber(raw.session_duration_s,0,86400,true),session_notes:retroworkText(raw.session_notes,1200)||'',clarification_needed:raw.clarification_needed===true,clarification_question:retroworkText(raw.clarification_question,240)||'',program_id:program&&program.programId||null,day_index:program&&program.dayIndex!=null?program.dayIndex:null,program_name:program&&program.programName||'',exercises:[]};
  (Array.isArray(raw.exercises)?raw.exercises:[]).slice(0,60).forEach(ex=>{const idx=Number.isInteger(ex&&ex.candidate_index)?ex.candidate_index:-1,c=idx>=0&&idx<candidates.length?candidates[idx]:null,status=['performed','skipped','added','substituted'].includes(String(ex&&ex.status))?String(ex.status):'performed',confidence=['high','moderate','ambiguous'].includes(String(ex&&ex.confidence))?String(ex.confidence):'ambiguous';if(!c||confidence==='ambiguous')ambiguity=true;draft.exercises.push({reported_name:retroworkText(ex&&ex.reported_name,140)||retroworkText(c&&c.name,140)||'Exercise',exercise_id:c&&uuid(c.id)?String(c.id):null,exercise_name:retroworkText(c&&c.name,140)||'',vars:Array.isArray(c&&c.vars)?c.vars.slice(0,8):[],confidence,status,substitution_for:retroworkText(ex&&ex.substitution_for,140)||'',notes:retroworkText(ex&&ex.notes,600)||'',sets:status==='skipped'?[]:(Array.isArray(ex&&ex.sets)?ex.sets:[]).slice(0,50).map(st=>({weight:retroworkSetNumber(st&&st.weight,0,3000,false),reps:retroworkSetNumber(st&&st.reps,0,1000,true),duration_s:retroworkSetNumber(st&&st.duration_s,0,86400,true),distance:retroworkSetNumber(st&&st.distance,0,1000000,false),distance_unit:['mi','km','m','yd','ft','in'].includes(String(st&&st.distance_unit))?String(st.distance_unit):null,resistance:retroworkText(st&&st.resistance,80)||null,rpe:retroworkSetNumber(st&&st.rpe,0,10,false),rir:retroworkSetNumber(st&&st.rir,0,20,false),fm_distance:retroworkSetNumber(st&&st.fm_distance,0,100000,false),fm_time_s:retroworkSetNumber(st&&st.fm_time_s,0,86400,true)}))})});
  if(ambiguity){draft.clarification_needed=true;if(!draft.clarification_question)draft.clarification_question='Which MAHFITT exercise did you mean for the unresolved movement?'}
  if(!draft.clarification_needed)draft.clarification_question='';return draft;
}
function retroworkProgramCandidatePool(rows,input,base){
  const items=[];(base&&Array.isArray(base.days)?base.days:[]).forEach(day=>(Array.isArray(day&&day.items)?day.items:[]).forEach(it=>items.push(it)));
  return retroworkCandidates(rows,input,{items});
}
function retroworkProgramBlankSet(vars){const st={done:false},clean=Array.isArray(vars)?vars:[];if(clean.includes('weight'))st.weight=0;if(clean.includes('reps'))st.reps=8;if(clean.includes('time'))st.time=45;if(clean.includes('distance'))st.distance=0;if(clean.includes('fm')){st.fm=60;st.fmTime=60}return st}
function retroworkResolvedProgramDraft(raw,candidates,base){
  raw=raw&&typeof raw==='object'?raw:{};const days=[];
  (Array.isArray(raw.days)?raw.days:[]).slice(0,14).forEach((day,di)=>{const items=[];(Array.isArray(day&&day.exercises)?day.exercises:[]).slice(0,30).forEach(ex=>{const idx=Number.isInteger(ex&&ex.candidate_index)?ex.candidate_index:-1,c=idx>=0&&idx<candidates.length?candidates[idx]:null;if(!c||!uuid(c.id))return;const vars=Array.isArray(c.vars)?c.vars.slice(0,8):['weight','reps'],count=Math.max(1,Math.min(12,Math.round(Number(ex.set_count)||3))),sets=[];for(let i=0;i<count;i++)sets.push(retroworkProgramBlankSet(vars));items.push({exerciseId:String(c.id),name:retroworkText(c.name,140),vars,category:retroworkText(c.category,80),section:'main',equipment:retroworkText(c.equipment,80),note:'',circuit:null,open:false,sets,target:{lo:8,hi:10}})});days.push({name:retroworkText(day&&day.name,80)||('Workout '+(di+1)),items})});
  if(!days.length)days.push({name:'Workout 1',items:[]});
  return{name:retroworkText(raw.name,100)||retroworkText(base&&base.name,100)||'AI Program',sub:retroworkText(raw.sub,140)||retroworkText(base&&base.sub,140)||'',days,_memberProgram:'mahfitt-member-v1'};
}
function retroworkDeterministicUuid(seed){const bytes=crypto.createHash('sha256').update(String(seed)).digest().subarray(0,16);bytes[6]=(bytes[6]&0x0f)|0x50;bytes[8]=(bytes[8]&0x3f)|0x80;const h=bytes.toString('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)}
async function retroworkCommitDraft(memberId,b){
  const id=String(b.commitId||'');if(!uuid(id))return{status:400,body:{ok:false,error:'Retrowork draft id is invalid.'}};
  const existing=await P.db('gym_sessions?select=id,status,name,session_date&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(id)+'&limit=1');
  if(existing&&existing[0]&&existing[0].status==='done')return{status:200,body:{ok:true,session:existing[0],idempotent:true}};
  const draft=b.draft&&typeof b.draft==='object'?b.draft:{},sessionDate=retroworkDate(draft.session_date);if(!sessionDate)return{status:400,body:{ok:false,error:'Choose a valid session date before saving.'}};
  const incomingExercises=(Array.isArray(draft.exercises)?draft.exercises:[]).slice(0,60);
  if(!incomingExercises.length)return{status:400,body:{ok:false,error:'Retrowork needs at least one exercise before saving.'}};
  if(incomingExercises.some(ex=>!uuid(ex&&ex.exercise_id)||String(ex&&ex.confidence)==='ambiguous'))return{status:409,body:{ok:false,error:'Resolve the Retrowork clarification before saving.'}};
  const wantedIds=[];incomingExercises.forEach(ex=>{if(uuid(ex&&ex.exercise_id)&&!wantedIds.includes(String(ex.exercise_id)))wantedIds.push(String(ex.exercise_id))});
  if(!wantedIds.length)return{status:400,body:{ok:false,error:'Retrowork needs at least one matched exercise before saving.'}};
  const all=await retroworkLibrary(),byId=new Map(all.map(x=>[String(x.id),x])),items=[],flat=[];
  if(incomingExercises.some(ex=>!byId.has(String(ex.exercise_id))))return{status:400,body:{ok:false,error:'One Retrowork exercise no longer exists in the MAHFITT library. Re-run review.'}};
  incomingExercises.forEach((ex,ei)=>{const c=byId.get(String(ex&&ex.exercise_id||''));if(!c)return;const status=['performed','skipped','added','substituted'].includes(String(ex.status))?String(ex.status):'performed',confidence=['high','moderate','ambiguous'].includes(String(ex.confidence))?String(ex.confidence):'moderate';if(status!=='skipped'&&confidence==='ambiguous')return;const sets=status==='skipped'?[]:(Array.isArray(ex.sets)?ex.sets:[]).slice(0,50).map(st=>({done:true,weight:retroworkSetNumber(st&&st.weight,0,3000,false),reps:retroworkSetNumber(st&&st.reps,0,1000,true),time:retroworkSetNumber(st&&st.duration_s,0,86400,true),distance:retroworkSetNumber(st&&st.distance,0,1000000,false),distanceUnit:['mi','km','m','yd','ft','in'].includes(String(st&&st.distance_unit))?String(st.distance_unit):null,resistance:retroworkText(st&&st.resistance,80)||null,rpe:retroworkSetNumber(st&&st.rpe,0,10,false),rir:retroworkSetNumber(st&&st.rir,0,20,false),fm:retroworkSetNumber(st&&st.fm_distance,0,100000,false),fmTime:retroworkSetNumber(st&&st.fm_time_s,0,86400,true)}));
    const item={exerciseId:String(c.id),name:retroworkText(c.name,140),vars:Array.isArray(c.vars)?c.vars.slice(0,8):[],section:'main',note:retroworkText(ex.notes,600),sets,retrowork:{status,confidence,reportedName:retroworkText(ex.reported_name,140),substitutionFor:retroworkText(ex.substitution_for,140)}};items.push(item);
    sets.forEach((st,si)=>flat.push({id:retroworkDeterministicUuid(id+':'+ei+':'+si),session_id:id,member_id:memberId,exercise_id:String(c.id),exercise_name:retroworkText(c.name,140),session_date:sessionDate,set_no:si+1,weight:st.weight,reps:st.reps,time_s:st.time,distance:st.distance,resistance:st.resistance,rpe:st.rpe,rir:st.rir,fm_distance:st.fm,fm_time_s:st.fmTime}));
  });
  if(!items.some(it=>it.retrowork.status!=='skipped'))return{status:400,body:{ok:false,error:'Retrowork has no completed exercise to save.'}};
  const title=retroworkText(draft.session_title,100)||'AI Retrowork',duration=retroworkSetNumber(draft.session_duration_s,0,86400,true)||0,notes=retroworkText(draft.session_notes,1200)||null,now=new Date().toISOString(),body={source:'ai-retrowork-v1',programId:uuid(draft.program_id)?String(draft.program_id):null,dayIndex:Number.isInteger(Number(draft.day_index))&&Number(draft.day_index)>=0?Number(draft.day_index):null,programName:retroworkText(draft.program_name,100)||null,items};
  await P.db('gym_sessions?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id,member_id:memberId,name:title,session_date:sessionDate,started_at:now,ended_at:now,duration_s:duration,notes,status:'retrowork-writing',body,updated_at:now})});
  await P.db('gym_sets?session_id=eq.'+encodeURIComponent(id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
  if(flat.length)await P.db('gym_sets?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(flat)});
  await P.db('gym_sessions?id=eq.'+encodeURIComponent(id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'done',ended_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
  return{status:200,body:{ok:true,session:{id,name:title,session_date:sessionDate,status:'done'},setCount:flat.length,idempotent:false}};
}


/* Canonical completed-workout projection used by both the Progress overview
   and per-exercise History. New finishes already write gym_sets directly; this
   idempotent repair covers older member-owned completed session snapshots that
   still contain done sets but predate that projection. */
async function memberGymProgress(memberId){
  const [storedSets,sessions]=await Promise.all([
    P.db('gym_sets?select=session_id,exercise_id,exercise_name,session_date,set_no,weight,reps,time_s,distance,resistance,rpe,rir,fm_distance,fm_time_s&member_id=eq.'+memberId+'&order=session_date.asc,set_no.asc&limit=5000'),
    P.db('gym_sessions?select=id,name,session_date,duration_s,ended_at,status,body&member_id=eq.'+memberId+'&status=eq.done&order=session_date.asc&limit=1000')
  ]);
  const sets=Array.isArray(storedSets)?storedSets.slice():[],sessionTimes=Object.create(null),existing=new Set(),missing=[],storedBySessionName=Object.create(null);
  function cleanName(name){return String(name||'').trim().toLowerCase().replace(/\s+/g,' ')}
  function rowKeys(row){const base=String(row&&row.session_id||'')+'|',setNo='|'+String(Number(row&&row.set_no)||0),keys=[base+'n:'+cleanName(row&&row.exercise_name)+setNo];if(uuid(row&&row.exercise_id))keys.push(base+'id:'+String(row.exercise_id).toLowerCase()+setNo);return keys}
  function markExisting(row){rowKeys(row).forEach(key=>existing.add(key));const byName=String(row&&row.session_id||'')+'|'+cleanName(row&&row.exercise_name);(storedBySessionName[byName]=storedBySessionName[byName]||[]).push(row)}
  sets.forEach(markExisting);
  (sessions||[]).forEach((session)=>{
    sessionTimes[session.id]=session.ended_at||session.session_date||'';
    const raw=session&&session.body,items=Array.isArray(raw)?raw:(raw&&Array.isArray(raw.items)?raw.items:[]),safe=sanitizeMemberBody(items,memberId);
    safe.forEach((it,exerciseIndex)=>{const name=retroworkText(it&&it.name,140)||'Exercise',exerciseId=uuid(it&&it.exerciseId)?String(it.exerciseId):null;
      /* Some older canonical rows were saved before exercise_id was populated.
         Re-associate same-session/same-name rows in the response so Bench (and
         every other movement) stays one graph series instead of splitting into
         an old name-only group and a newer id-backed group. */
      if(exerciseId)(storedBySessionName[String(session.id)+'|'+cleanName(name)]||[]).forEach(row=>{if(!uuid(row.exercise_id)){row.exercise_id=exerciseId;rowKeys(row).forEach(key=>existing.add(key))}});
      (Array.isArray(it&&it.sets)?it.sets:[]).forEach((st,setIndex)=>{
      if(!st||st.done!==true)return;
      const row={
        id:retroworkDeterministicUuid('progress-backfill:'+String(session.id)+':'+exerciseIndex+':'+setIndex),session_id:session.id,member_id:memberId,
        exercise_id:exerciseId,exercise_name:name,session_date:session.session_date,set_no:setIndex+1,
        weight:st.weight==null?null:st.weight,reps:st.reps==null?null:st.reps,time_s:st.time==null?null:st.time,distance:st.distance==null?null:st.distance,
        resistance:st.resistance||null,rpe:st.rpe==null?null:st.rpe,rir:st.rir==null?null:st.rir,fm_distance:st.fm==null?null:st.fm,fm_time_s:st.fmTime==null?null:st.fmTime
      },keys=rowKeys(row);
      if(keys.some(key=>existing.has(key)))return;keys.forEach(key=>existing.add(key));missing.push(row);sets.push(row);
    })})
  });
  /* Historical rows from early Gym Tracker versions can have the canonical
     exercise name but no exercise_id. Once any later completed row establishes
     one unambiguous id for that same normalized movement name, reconcile every
     older row in THIS response to it. This keeps old Bench/Incline Bench points
     on the same timeline without inventing weight/reps or merging two genuinely
     distinct ids that happen to share a label. */
  const idsByName=Object.create(null);
  sets.forEach(row=>{const name=cleanName(row&&row.exercise_name);if(!name||!uuid(row&&row.exercise_id))return;(idsByName[name]=idsByName[name]||new Set()).add(String(row.exercise_id).toLowerCase())});
  sets.forEach(row=>{if(uuid(row&&row.exercise_id))return;const name=cleanName(row&&row.exercise_name),ids=idsByName[name];if(ids&&ids.size===1)row.exercise_id=Array.from(ids)[0]});
  /* Durable, deterministic repair. The current response already includes the
     synthesized rows, while this best-effort upsert heals future reads. */
  if(missing.length){try{await P.db('gym_sets?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(missing)})}catch(e){console.warn('mygym progress history backfill',e&&e.message||e)}}
  sets.forEach(x=>{x.session_ended_at=sessionTimes[x.session_id]||x.session_date||''});
  return{sets,sessions:sessions||[],repairedSetCount:missing.length};
}

/* Expanded R52 — canonical Fitness AI usage/conversation owner. The daily
   allowance lives here once; UI reads the returned limit instead of hard-coding
   tier rules. State uses the same non-workout gym_sessions status pattern as
   Theme persistence, so it cannot enter workout history/progress queries. */
const FREE_FITNESS_AI_QUESTIONS_PER_DAY=2,FITNESS_AI_STATE_STATUS='mahfitt-ai-state';
function fitnessAiText(v,max){return String(v==null?'':v).replace(/[\u0000-\u001F]/g,' ').trim().slice(0,max)}
function fitnessAiDay(timeZone){try{const tz=fitnessAiText(timeZone,80)||'UTC',parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),get=t=>parts.find(x=>x.type===t);return get('year').value+'-'+get('month').value+'-'+get('day').value}catch(e){return new Date().toISOString().slice(0,10)}}
function fitnessAiCleanSource(s){if(!s||typeof s!=='object')return null;const title=fitnessAiText(s.title,240),url=fitnessAiText(s.url,600);if(!title||!/^https:\/\//i.test(url))return null;return{title,url,publisher:fitnessAiText(s.publisher,180),year:Number.isInteger(Number(s.year))?Number(s.year):null,type:fitnessAiText(s.type,80)}}
function fitnessAiCleanMessage(m){if(!m||typeof m!=='object'||!['user','assistant'].includes(String(m.role)))return null;const content=fitnessAiText(m.content,m.role==='assistant'?9000:5000);if(!content)return null;return{id:fitnessAiText(m.id,100)||crypto.randomUUID(),role:String(m.role),content,at:fitnessAiText(m.at,40)||new Date().toISOString(),evidenceLevel:fitnessAiText(m.evidenceLevel,40),uncertainty:fitnessAiText(m.uncertainty,800),domainAllowed:m.domainAllowed!==false,sources:(Array.isArray(m.sources)?m.sources:[]).map(fitnessAiCleanSource).filter(Boolean).slice(0,8)}}
function fitnessAiCleanState(raw,day){raw=raw&&typeof raw==='object'?raw:{};const usage=raw.usage&&typeof raw.usage==='object'?raw.usage:{},same=String(usage.day||'')===day,count=same?Math.max(0,Math.min(FREE_FITNESS_AI_QUESTIONS_PER_DAY,Number(usage.count)||0)):0;return{version:1,usage:{day,count},messages:(Array.isArray(raw.messages)?raw.messages:[]).map(fitnessAiCleanMessage).filter(Boolean).slice(-60),requests:(Array.isArray(raw.requests)?raw.requests:[]).map(x=>({key:fitnessAiText(x&&x.key,120),messageId:fitnessAiText(x&&x.messageId,100)})).filter(x=>x.key&&x.messageId).slice(-30)}}
async function fitnessAiStateRow(memberId,day){let rows=[];try{rows=await P.db('gym_sessions?select=id,body,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.'+FITNESS_AI_STATE_STATUS+'&order=updated_at.desc&limit=1')}catch(error){throw error}const row=rows&&rows[0]||null;return{row,state:fitnessAiCleanState(row&&row.body,day)}}
async function fitnessAiSaveState(memberId,row,state){const now=new Date().toISOString(),body=fitnessAiCleanState(state,state.usage&&state.usage.day||fitnessAiDay('UTC'));if(row&&row.id){await P.db('gym_sessions?id=eq.'+encodeURIComponent(row.id)+'&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.'+FITNESS_AI_STATE_STATUS,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({body,updated_at:now})})}else{await P.db('gym_sessions',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({member_id:memberId,name:'MAHFITT Fitness AI',status:FITNESS_AI_STATE_STATUS,body,duration_s:0,updated_at:now})})}return body}
function fitnessAiPublicState(state){const count=Math.max(0,Number(state&&state.usage&&state.usage.count)||0);return{messages:state&&state.messages||[],usage:{day:state&&state.usage&&state.usage.day||'',count,limit:FREE_FITNESS_AI_QUESTIONS_PER_DAY,remaining:Math.max(0,FREE_FITNESS_AI_QUESTIONS_PER_DAY-count)}}}
async function fitnessAiMemberContext(memberId){const [programs,weight]=await Promise.all([programsForMember(memberId).catch(()=>[]),activityLatestWeight(memberId).catch(()=>null)]);return{programs:(programs||[]).slice(0,12).map(p=>({name:fitnessAiText(p&&p.name,100),type:p&&p.body&&p.body.programType==='outdoor'?'outdoor':'regular',workouts:Array.isArray(p&&p.body&&p.body.days)?p.body.days.length:0})),bodyWeightLb:Number.isFinite(Number(weight))?Number(weight):null}}
async function fitnessAiClearHistory(memberId,b){const day=fitnessAiDay(b.timeZone),loaded=await fitnessAiStateRow(memberId,day),state=loaded.state;state.messages=[];state.requests=[];const saved=await fitnessAiSaveState(memberId,loaded.row,state);return fitnessAiPublicState(saved)}
async function fitnessAiAsk(memberId,b){const day=fitnessAiDay(b.timeZone),loaded=await fitnessAiStateRow(memberId,day),state=loaded.state,key=fitnessAiText(b.clientKey,120),question=fitnessAiText(b.question,5000);if(!question)return{status:400,body:{ok:false,error:'Ask a fitness question first.',state:fitnessAiPublicState(state)}};if(key){const prior=state.requests.find(x=>x.key===key),message=prior&&state.messages.find(x=>x.id===prior.messageId);if(message)return{status:200,body:{ok:true,reused:true,message,state:fitnessAiPublicState(state)}}}if(state.usage.count>=FREE_FITNESS_AI_QUESTIONS_PER_DAY)return{status:429,body:{ok:false,code:'FITNESS_AI_DAILY_LIMIT',error:'You used today’s '+FREE_FITNESS_AI_QUESTIONS_PER_DAY+' Fitness AI questions. Your conversation stays right here.',state:fitnessAiPublicState(state)}};const [research,context]=await Promise.all([fitnessResearch().retrieve({query:question}),fitnessAiMemberContext(memberId)]),history=state.messages.slice(-16).map(m=>({role:m.role,content:m.content}));let result;try{result=await fitnessAI().answer({question,messages:history,context,researchSources:research.sources||[]})}catch(error){error.fitnessAiState=fitnessAiPublicState(state);throw error}const now=new Date().toISOString(),userMessage={id:crypto.randomUUID(),role:'user',content:question,at:now,domainAllowed:true,sources:[]},assistantMessage={id:crypto.randomUUID(),role:'assistant',content:result.answer,at:new Date().toISOString(),domainAllowed:result.domainAllowed!==false,evidenceLevel:result.evidenceLevel,uncertainty:result.uncertainty,sources:result.sources||[]};state.messages.push(userMessage,assistantMessage);if(result.domainAllowed)state.usage.count++;if(key)state.requests.push({key,messageId:assistantMessage.id});state.messages=state.messages.slice(-60);state.requests=state.requests.slice(-30);const saved=await fitnessAiSaveState(memberId,loaded.row,state);return{status:200,body:{ok:true,reused:false,domainAllowed:result.domainAllowed!==false,message:assistantMessage,research:{available:!!research.available,reason:research.reason||'',sourceCount:(research.sources||[]).length},state:fitnessAiPublicState(saved)}}}

async function api(event,b){
  const action=String(b.action||'');

  if(action==='login'){
    if(!allowed(event)) return out(429,{ok:false,error:'Too many attempts. Try again in a few minutes.'});
    const wanted=P.normalize(b.fullName);
    if(!wanted||wanted.indexOf(' ')<1) return out(400,{ok:false,error:'Enter your full first and last name.'});
    const parts=wanted.split(' ').filter(Boolean);
    let match=null;
    if(parts.length>=2){
      const first=parts[0], last=parts.slice(1).join(' ');
      try{
        const exact=await P.db('payment_vip_members?select=id,first_name,last_name,normalized_first,normalized_last,sesh_left,active,gym_only&normalized_first=eq.'+encodeURIComponent(first)+'&normalized_last=eq.'+encodeURIComponent(last)+'&active=eq.true&sesh_left=gt.0&limit=1');
        match=exact&&exact[0]||null;
      }catch(e){}
    }
    if(!match){
      /* Canonical fields are enough for the authoritative fallback. Do not make
         member access depend on optional normalized_* columns existing on a
         particular production migration. */
      const rows=await P.db('payment_vip_members?select=id,first_name,last_name,sesh_left,active,gym_only&active=eq.true&sesh_left=gt.0&order=first_name.asc,last_name.asc&limit=10000');
      match=(rows||[]).find(m=>P.normalize(fullName(m))===wanted);
      if(!match&&parts.length>=2){
        const first=parts[0], last=parts.slice(1).join(' ');
        match=(rows||[]).find(m=>P.normalize(m.first_name)===first&&P.normalize(m.last_name)===last);
      }
    }
    const entry=['slots','tracker','meals','calendar','coach'].includes(String(b.entry||''))?String(b.entry):'tracker';
    if(!match||!P.hasSessionAccess(match)){fail(event);return withCookies(403,{ok:false,locked:true,error:'Member access is not active. Contact Jah directly.'},[clearMyCookie(),P.clearCookie()]);}
    if(match.gym_only===true&&(entry==='slots'||entry==='calendar')){fail(event);return withCookies(403,{ok:false,locked:true,error:'This member view is not included with gym-only access.'},[clearMyCookie(),P.clearCookie()]);}
    clear(event);
    const token=memberToken(match); if(!token) return out(500,{ok:false,error:'Member access is not configured on the server.'});
    const cookies=[myCookie(token)];if(match.gym_only!==true)cookies.push(P.setCookie(P.createClaim(match)));
    return withCookies(200,{ok:true,name:fullName(match),memberToken:token,entry},cookies);
  }

  if(action==='logout') return withCookies(200,{ok:true},[clearMyCookie(),P.clearCookie()]);

  /* The 1 -> 0 scan still has to close the already-open member QR. Polling
     therefore validates the signed identity directly, then reads the fresh
     balance without the positive-balance access helper. */
  if(action==='checkInStatus'){
    const claim=claimFromRequest(event,b);
    if(!claim||!uuid(claim.id))return out(401,{ok:false,authed:false});
    try{
      const live=await P.db('payment_vip_members?select=id,active,sesh_left&id=eq.'+encodeURIComponent(claim.id)+'&limit=1');
      if(!live||!live[0]||live[0].active===false)return out(401,{ok:false,authed:false});
      const rows=await P.db('member_checkins?select=id,remaining_after,checked_in_at&member_id=eq.'+encodeURIComponent(claim.id)+'&order=checked_in_at.desc&limit=1');
      return out(200,{ok:true,lastCheckIn:rows&&rows[0]||null,sessionsLeft:Math.max(0,Number(live[0].sesh_left)||0)});
    }catch(error){
      if(/member_checkins|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))return out(503,{ok:false,error:'QR check-in needs migration 039.'});
      throw error;
    }
  }

  const accountMember=await memberFromClaim(event,b);
  /* R71 / ERROR-02 — an expired identity now says so. The bare {authed:false}
     body left every caller to invent its own wording, which is how MAH PROTOCOL
     ended up reporting a signed-out member as a connection failure. The 401
     status is unchanged, so existing status-based handling is untouched. */
  if(!accountMember) return out(401,{ok:false,authed:false,error:'Your MAHFITT session has expired. Sign in again.'});
  /* R90 — active fitness profile is data context, never authentication. Every
     request that names another member is resolved again against either an
     explicit active coach relationship or the independently authenticated FOB
     admin grant. No browser-supplied id can grant itself access. */
  const resolved=await Role.resolve(event,accountMember,b);
  if(!resolved.ok)return out(resolved.status||403,{ok:false,code:resolved.code||'CLIENT_CONTEXT_FORBIDDEN',error:resolved.error||'That client context is not authorized.'});
  const member=resolved.activeMember,memberId=member.id,accountMemberId=accountMember.id,roleContext=resolved.context;

  /* R90 — relationship existence and operation permission are separate. The
     active profile resolver proves WHO may be targeted; these domain guards
     prove WHAT this coach may do against that profile. FOB admin retains the
     product's existing explicit business-admin grant. */
  if(roleContext.isClientContext){
    let permission='fitness';
    if(/^memberProgram/.test(action))permission='programs';
    else if(/^mahMedia|^memberMedia|^mediaUploadTicket$/.test(action))permission='media';
    else if(/^habit/.test(action))permission='habits';
    else if(action==='memberResources')permission='resources';
    else if(/^(progress|history|trainingFoundation|periodizationSave|bodyProfileSave|bodyMeasurementSave|healthDaily)$/.test(action))permission='progress';
    else if(/^(coachDirectory|coachProfileBoot|boot|exerciseLibrary|avatarUploadTicket|saveAvatar|inspectTikTok|detectThemeBpm)$/.test(action))permission='fitness';
    if(!Role.permissionAllowed(roleContext,permission)){
      const denied=Role.permissionError(permission);return out(denied.status,{ok:false,code:denied.code,error:denied.error});
    }
  }

  if(roleContext.isClientContext&&CLIENT_CONTEXT_AI_ACTIONS.has(action)){
    return out(403,{ok:false,code:'CLIENT_AI_PROTECTED',error:'Personal MAHFITT AI stays private to '+fullName(member)+'. Exit client view to use your own AI.'});
  }
  if(roleContext.isClientContext&&['healthSyncStatus','healthSyncToken','healthSyncRevoke','healthImportDays'].includes(action)){
    return out(403,{ok:false,code:'CLIENT_DEVICE_SYNC_PROTECTED',error:'Device health-sync credentials stay with the member. Client health data remains available read-only through the authorized profile.'});
  }
  if(roleContext.isClientContext&&action==='checkInCode'){
    return out(403,{ok:false,code:'CLIENT_CHECKIN_PROTECTED',error:'Member check-in identity cannot be generated by a coach viewing the client profile.'});
  }

  /* R85 — Today, Inbox, Resources and MAH Habits share one server owner.
     The active fitness profile has already been independently authorized above;
     actions which name a different client (resource assignment) re-resolve that
     target inside the owner before writing. */
  if(COACH_EXPERIENCE_ACTIONS.has(action)){
    const result=await coachExperience().run(action,{event,accountMember,activeMember:member,roleContext,body:b});
    return out(result.status||200,result);
  }

  /* R46: Spotify integration removed from active runtime. Apple Music is
     Coming Soon only and requires no server-side provider configuration. */

  /* Netlify AI Gateway runtime guard. Public /api/mygym requests enter through
     mygym-runtime.mjs, which marks the Lambda-compatible event after Netlify
     has placed it on the modern Functions runtime. The legacy direct function
     may continue serving non-AI compatibility traffic, but it must never own
     an AI Gateway request. */
  if((action==='fitnessAiAsk'||action==='retroworkTranscribe'||action==='retroworkProgramInterpret'||action==='retroworkInterpret'||action==='programCreatorDraft'||action==='protocolGenerate'||action==='protocolVisualReview')
    &&event.__netlifyModernAiRuntime!==true&&typeof event.path==='string'&&event.path){
    return out(503,{ok:false,code:'AI_RUNTIME_REQUIRED',error:'AI Retrowork requires the modern Netlify Functions runtime.'});
  }

  if(action==='fitnessAiState'){
    try{const day=fitnessAiDay(b.timeZone),loaded=await fitnessAiStateRow(memberId,day);return out(200,Object.assign({ok:true},fitnessAiPublicState(loaded.state)))}
    catch(error){console.warn('fitness ai state',error&&error.message);return out(500,{ok:false,error:'Fitness AI conversation could not load right now.'})}
  }
  if(action==='fitnessAiClearHistory'){
    try{return out(200,Object.assign({ok:true},await fitnessAiClearHistory(memberId,b)))}
    catch(error){console.warn('fitness ai clear history',error&&error.message);return out(500,{ok:false,error:'Mr.Mah history could not be cleared right now.'})}
  }
  if(action==='fitnessAiAsk'){
    try{const result=await fitnessAiAsk(memberId,b);return out(result.status,result.body)}
    catch(error){const code=error&&error.code||'FITNESS_AI_UNKNOWN';console.warn('fitness ai ask',code,error&&error.message);if(code==='NO_PROVIDER')return out(503,{ok:false,code,error:'MAHFITT Fitness AI needs its server AI provider configured.',state:error.fitnessAiState});if(code==='AI_TIMEOUT'||code==='AI_NETWORK'||code==='AI_HTTP'||code==='AI_INCOMPLETE'||code==='INVALID_RESPONSE'||code==='PROVIDER_REFUSAL')return out(502,{ok:false,code,error:'MAHFITT Fitness AI could not answer that right now. Your question was not charged.',state:error.fitnessAiState});return out(500,{ok:false,code,error:'MAHFITT Fitness AI hit an unexpected server error. Your question was not charged.',state:error.fitnessAiState})}
  }

  /* v405 — Apple Health / Shortcuts bridge. These controls are web-member
     authenticated; the Shortcut itself receives a separate revocable key. */
  if(action==='healthSyncStatus'){
    try{return out(200,Object.assign({ok:true},await healthSync().tokenStatus(memberId)))}
    catch(error){if(healthSync().schemaMissing(error))return out(503,{ok:false,error:'MAHFITT Health needs database migration 044.'});throw error}
  }
  if(action==='healthSyncToken'){
    try{return out(200,Object.assign({ok:true},await healthSync().ensureToken(memberId)))}
    catch(error){if(healthSync().schemaMissing(error))return out(503,{ok:false,error:'MAHFITT Health needs database migration 044.'});throw error}
  }
  if(action==='healthSyncRevoke'){
    try{return out(200,await healthSync().revokeToken(memberId))}
    catch(error){if(healthSync().schemaMissing(error))return out(503,{ok:false,error:'MAHFITT Health needs database migration 044.'});throw error}
  }
  if(action==='healthDaily'){
    try{return out(200,{ok:true,days:await healthSync().dailyForMember(memberId,b.limit)})}
    catch(error){if(healthSync().schemaMissing(error))return out(503,{ok:false,error:'MAHFITT Health needs database migration 044.'});throw error}
  }
  if(action==='healthImportDays'){
    try{return out(200,Object.assign({ok:true},await healthSync().importDaysForMember(memberId,b)))}
    catch(error){if(error&&error.status)return out(error.status,{ok:false,error:error.message});if(healthSync().schemaMissing(error))return out(503,{ok:false,error:'MAHFITT Health history import needs database migration 045.'});throw error}
  }

  if(action==='trainingFoundation'){
    try{
      const plans=await periodizationRows(memberId),foundation=await bodyFoundation(memberId);
      return out(200,Object.assign({ok:true,plans:plans.map(periodizationPublic)},foundation));
    }catch(error){if(error&&error.code==='TRAINING_SCHEMA')return out(503,{ok:false,error:'MAHFITT training planning needs database migration 048.'});throw error}
  }
  if(action==='periodizationSave'){
    const result=await savePeriodization(memberId,b,roleContext.isClientContext?'coach':'member');return out(result.status,result.body);
  }
  if(action==='bodyProfileSave'){
    const result=await saveBodyProfile(memberId,b);return out(result.status||200,result);
  }
  if(action==='bodyMeasurementSave'){
    const result=await saveBodyMeasurement(memberId,b);return out(result.status||200,result);
  }
  if(action==='activityLiveState'){
    try{return out(200,{ok:true,activity:await activityLiveState(memberId)})}
    catch(error){if(activitySchemaMissing(error))return out(503,{ok:false,error:'Live Activity needs database migration 049.'});throw error}
  }
  if(action==='activityStart'){
    try{const result=await activityStart(memberId,b);return out(result.status,result.body)}
    catch(error){if(activitySchemaMissing(error))return out(503,{ok:false,error:'Live Activity needs database migration 049.'});throw error}
  }
  if(action==='activityPause'||action==='activityResume'){
    try{const result=await activityTransition(memberId,b,action==='activityPause'?'pause':'resume');return out(result.status,result.body)}
    catch(error){if(activitySchemaMissing(error))return out(503,{ok:false,error:'Live Activity needs database migration 049.'});throw error}
  }
  if(action==='activityEstimateUpdate'){
    try{const result=await activityEstimateUpdate(memberId,b);return out(result.status,result.body)}
    catch(error){if(activitySchemaMissing(error))return out(503,{ok:false,error:'Live Activity estimates need database migration 049.'});throw error}
  }
  if(action==='activityNativeUpdate'){
    try{const result=await activityNativeUpdate(memberId,b);return out(result.status,result.body)}
    catch(error){if(activitySchemaMissing(error))return out(503,{ok:false,error:'Live Activity native metrics need database migration 049.'});throw error}
  }
  if(action==='activityFinish'){
    try{const result=await activityFinish(memberId,b);return out(result.status,result.body)}
    catch(error){if(activitySchemaMissing(error))return out(503,{ok:false,error:'Live Activity Calendar sync needs database migration 049.'});throw error}
  }
  if(action==='activitySegmentEdit'){
    try{const result=await updateActivitySegment(memberId,b);return out(result.status,result.body)}
    catch(error){if(/member_activity_segments|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))return out(503,{ok:false,error:'Activity editing needs database migrations 048 + 049.'});throw error}
  }
  /* ══ MAH PROTOCOL actions ═══════════════════════════════════════════════
     Separate actions from fitnessAiAsk on purpose (AI-011): building a
     Protocol must not consume the member's two free Mr.Mah questions, and no
     new quota or paywall is invented here. */
  if(action==='protocolFoundation'){
    try{
      const data=await protocolFoundation(memberId,b);
      let plans=[],archivedPlans=[],foundation={profile:null,measurements:[],healthDays:[],activitySegments:[]};
      try{plans=(await periodizationRows(memberId)).map(periodizationPublic);archivedPlans=(await protocolArchivedRows(memberId)).map(periodizationPublic)}
      catch(error){data.trainingSchemaReady=false;data.planDataUnavailable=true;console.warn('mah protocol plan foundation',error&&error.message)}
      try{foundation=await bodyFoundation(memberId)}
      catch(error){data.bodyDataUnavailable=true;console.warn('mah protocol body foundation',error&&error.message)}
      const freshness=await protocolVisualFreshness(memberId,data.preferences).catch(()=>({stale:false,missing:[]}));
      return out(200,Object.assign({},data,foundation,{plans,archivedPlans,visualReviewStale:freshness.stale,visualReviewMissing:freshness.missing}));
    }catch(error){
      if(error&&error.code==='PROTOCOL_SCHEMA')return out(503,{ok:false,code:'PROTOCOL_SCHEMA',error:'MAH PROTOCOL needs database migration 051.'});
      throw error;
    }
  }
  if(action==='protocolContext'){
    const result=await protocolContext(memberId,b);return out(result.status,result.body);
  }
  if(action==='protocolPreferencesSave'){
    const result=await saveProtocolPreferences(memberId,b);return out(result.status,result.body);
  }
  if(action==='protocolGenerate'){
    const result=await protocolGenerate(memberId,b);return out(result.status,result.body);
  }
  if(action==='protocolVisualReview'){
    const result=await protocolVisualReview(memberId,b);return out(result.status,result.body);
  }
  if(action==='protocolVisualClear'){
    const result=await protocolVisualClear(memberId);return out(result.status,result.body);
  }
  /* SAVE-004..007. The Protocol IS the periodization plan: this reuses the one
     canonical owner, its optimistic version/conflict behaviour and its
     member/coach authorship, and adds no competing plan table. */
  if(action==='protocolSave'){
    const result=await savePeriodization(memberId,b,roleContext.isClientContext?'coach':'member');return out(result.status,result.body);
  }
  if(action==='protocolArchive'||action==='protocolRestore'){
    const planId=uuid(b.planId)?String(b.planId):'';
    if(!planId)return out(400,{ok:false,error:'Protocol not found.'});
    const rows=await P.db('member_periodization_plans?select=id,body,archived&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(planId)+'&limit=1')||[];
    const row=rows[0];if(!row||!(row.body&&row.body.protocol))return out(404,{ok:false,error:'Protocol not found.'});
    if(action==='protocolRestore'){
      const active=await periodizationRows(memberId).catch(()=>[]);
      for(const other of active){if(String(other.id)!==planId&&other.body&&other.body.protocol)await P.db('member_periodization_plans?id=eq.'+encodeURIComponent(other.id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({archived:true,updated_at:new Date().toISOString()})})}
      await P.db('member_periodization_plans?id=eq.'+encodeURIComponent(planId)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({archived:false,updated_at:new Date().toISOString()})});
      return out(200,{ok:true});
    }
    await P.db('member_periodization_plans?id=eq.'+encodeURIComponent(planId)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({archived:true,updated_at:new Date().toISOString()})});
    if(b.removeFuture){
      const now=new Date().toISOString();
      await P.db('member_calendar_events?member_id=eq.'+encodeURIComponent(memberId)+'&protocol_plan_id=eq.'+encodeURIComponent(planId)+'&kind=eq.protocol&starts_at=gte.'+encodeURIComponent(now),{method:'DELETE',headers:{Prefer:'return=minimal'}}).catch(()=>{});
    }
    return out(200,{ok:true});
  }
  if(action==='protocolScheduleReview'){
    try{const result=await protocolScheduleReview(memberId,b);return out(result.status,result.body)}
    catch(error){if(error&&error.code==='PROTOCOL_SCHEMA')return out(503,{ok:false,code:'PROTOCOL_SCHEMA',error:'MAH PROTOCOL Calendar scheduling needs database migration 051.'});throw error}
  }
  if(action==='protocolScheduleCommit'){
    const result=await protocolScheduleCommit(memberId,b);return out(result.status,result.body);
  }
  if(action==='protocolScheduleRemove'){
    const result=await protocolScheduleRemove(memberId,b);return out(result.status,result.body);
  }
  if(action==='programCreatorDraft'){
    const goal=trainingText(b.goal,700),duration=trainingNumber(b.durationWeeks,1,104,true),days=trainingNumber(b.daysPerWeek,1,7,true),programType=String(b.programType)==='outdoor'?'outdoor':'regular';
    if(!goal)return out(400,{ok:false,error:'Tell AI Program Creator the goal first.'});
    /* R48 context is read-only and member-scoped. The creator may use existing
       canonical programs/history as evidence, but it never writes either one. */
    let existingProgramContext='',recentHistoryContext='';
    try{
      const rows=await P.db('gym_member_programs?select=id,name,sub,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&archived=eq.false&order=updated_at.desc&limit=6');
      existingProgramContext=(rows||[]).map(r=>trainingText(r.name,80)+(trainingText(r.sub,100)?' — '+trainingText(r.sub,100):'')).filter(Boolean).join(' | ');
    }catch(e){}
    try{
      const progress=await memberGymProgress(memberId),seen=new Set(),recent=[];
      for(const row of (progress.sessions||[])){
        const key=String(row&&row.id||row&&row.session_date||'');if(!key||seen.has(key))continue;seen.add(key);
        const label=trainingText(row&&row.name,80)||'Workout',date=trainingDate(row&&row.session_date)||trainingDate(String(row&&row.ended_at||'').slice(0,10));
        recent.push((date?date+' · ':'')+label);if(recent.length>=6)break;
      }
      recentHistoryContext=recent.join(' | ');
    }catch(e){}
    const fields=[
      'PROGRAM TYPE: '+programType.toUpperCase(),
      programType==='outdoor'?'OUTDOOR RULE: use only movements realistic in a park, field, track, running path, calisthenics area, or open outdoor space. No gym machines, cables, treadmill dependence, or fixed indoor equipment.': '',
      'GOAL: '+goal,
      duration?'DURATION: '+duration+' weeks':'',
      days?'DAYS PER WEEK: '+days:'',
      trainingText(b.preferredDays,240)?'PREFERRED DAYS: '+trainingText(b.preferredDays,240):'',
      trainingText(b.experience,120)?'EXPERIENCE: '+trainingText(b.experience,120):'',
      trainingText(b.equipment,500)?'AVAILABLE EQUIPMENT: '+trainingText(b.equipment,500):'',
      trainingNumber(b.sessionMinutes,10,300,true)?'SESSION LENGTH: '+trainingNumber(b.sessionMinutes,10,300,true)+' minutes':'',
      trainingText(b.preferences,700)?'PREFERENCES: '+trainingText(b.preferences,700):'',
      trainingText(b.avoid,700)?'AVOID: '+trainingText(b.avoid,700):'',
      trainingText(b.periodizationContext,900)?'CURRENT PERIODIZATION CONTEXT: '+trainingText(b.periodizationContext,900):'',
      existingProgramContext?'CURRENT SAVED PROGRAMS (READ-ONLY CONTEXT): '+existingProgramContext:'',
      recentHistoryContext?'RECENT COMPLETED SESSIONS (READ-ONLY EVIDENCE): '+recentHistoryContext:'',
      'Return a future program draft only. Do not claim any workout has already happened or been saved.'
    ].filter(Boolean);
    const transcript=fields.join('\n'),library=await retroworkLibrary();
    let candidates=retroworkProgramCandidatePool(library,transcript,null);
    if(programType==='outdoor')candidates=candidates.filter(c=>outdoorProgramCandidate(c));
    try{
      const raw=await retroworkAI().interpretProgram({transcript,candidates,programBase:null}),program=retroworkResolvedProgramDraft(raw,candidates,null);
      program._aiProgramCreatorDraft=true;
      program.programType=programType;
      (program.days||[]).forEach(d=>{d.workoutType=programType==='outdoor'?'outdoor':(d.workoutType||'regular')});
      program.creatorBrief={goal,durationWeeks:duration,daysPerWeek:days,programType};
      return out(200,{ok:true,program});
    }catch(error){
      const code=String(error&&error.code||'');
      if(code==='NO_PROVIDER')return out(503,{ok:false,error:'AI Program Creator is not configured on the server yet.'});
      if(code==='RETROWORK_TIMEOUT')return out(504,{ok:false,error:'AI Program Creator took too long. Your inputs are still here — try again.'});
      if(code==='RETROWORK_REFUSAL'||code==='RETROWORK_PROGRAM_OUTPUT')return out(422,{ok:false,error:'AI Program Creator could not structure that request. Rephrase the programming goal.'});
      console.warn('program creator',code,error&&error.message);return out(502,{ok:false,error:'AI Program Creator could not build a draft right now. Your inputs are still here.'});
    }
  }

  if(action==='checkInCode'){
    try{
      const rows=await P.db('payment_vip_members?select=checkin_token,sesh_left&id=eq.'+encodeURIComponent(memberId)+'&active=eq.true&limit=1');
      const row=rows&&rows[0],token=String(row&&row.checkin_token||'');
      if(!uuid(token))return out(503,{ok:false,error:'QR check-in needs migration 039.'});
      const recent=await P.db('member_checkins?select=id,remaining_after,checked_in_at&member_id=eq.'+encodeURIComponent(memberId)+'&order=checked_in_at.desc&limit=1');
      const incoming=String((event.headers||{}).host||(event.headers||{})['x-forwarded-host']||'fob.systems').toLowerCase();
      const host=/^[a-z0-9.-]+(?::\d+)?$/.test(incoming)?incoming:'fob.systems';
      return out(200,{ok:true,payload:'https://'+host+'/admin?checkin='+token,lastCheckInId:recent&&recent[0]&&recent[0].id||'',sessionsLeft:Math.max(0,Number(row.sesh_left)||0)});
    }catch(error){
      if(/checkin_token|member_checkins|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))return out(503,{ok:false,error:'QR check-in needs migration 039.'});
      throw error;
    }
  }

  if(action==='retroworkTranscribe'){
    const encoded=String(b.audioBase64||''),mimeType=String(b.mimeType||'audio/webm').slice(0,80);
    if(!encoded||encoded.length>3600000)return out(400,{ok:false,error:'Keep each Retrowork voice clip shorter, then try again.'});
    let audio;try{audio=Buffer.from(encoded,'base64')}catch(error){audio=null}
    if(!audio||!audio.length)return out(400,{ok:false,error:'No voice audio was captured.'});
    if(audio.length>2621440)return out(400,{ok:false,error:'Keep each Retrowork voice clip shorter, then try again.'});
    try{const transcript=await retroworkAI().transcribe({audio,mimeType});return out(200,{ok:true,transcript})}
    catch(error){
      const code=String(error&&error.code||'');
      if(code==='NO_PROVIDER'||code==='TRANSCRIBE_AUTH')return out(503,{ok:false,code,error:'AI Retrowork voice transcription is not configured correctly. Typed input still works.'});
      if(code==='EMPTY_AUDIO'||code==='EMPTY_TRANSCRIPT')return out(422,{ok:false,code,error:'No speech was detected. Your typed workout is unchanged.'});
      if(code==='AUDIO_TOO_LARGE')return out(400,{ok:false,code,error:'Keep each Retrowork voice clip shorter, then try again.'});
      if(code==='TRANSCRIBE_AUDIO_FORMAT'||code==='TRANSCRIBE_REQUEST')return out(422,{ok:false,code,error:'That voice clip could not be read for transcription. Your typed workout is unchanged.'});
      if(code==='TRANSCRIBE_NETWORK')return out(503,{ok:false,code,error:'The transcription service could not be reached. Your typed workout is unchanged.'});
      if(code==='TRANSCRIBE_RATE_LIMIT'||code==='TRANSCRIBE_SERVICE')return out(503,{ok:false,code,error:'The transcription service is temporarily busy. Your typed workout is unchanged.'});
      if(code==='TRANSCRIBE_RUNTIME')return out(503,{ok:false,code,error:'Voice transcription is unavailable in the server runtime. Typed input still works.'});
      if(code==='RETROWORK_TIMEOUT')return out(504,{ok:false,code,error:'Voice transcription took too long. Your typed workout is unchanged.'});
      console.warn('retrowork transcribe',code,error&&error.message);return out(502,{ok:false,code:code||'TRANSCRIBE_UNKNOWN',error:'Voice transcription failed after recording. Your typed workout is unchanged.'});
    }
  }
  if(action==='retroworkProgramInterpret'){
    const transcript=retroworkText(b.text,6000);if(!transcript)return out(400,{ok:false,error:'Describe the program first.'});
    const base=b.programBase&&typeof b.programBase==='object'?b.programBase:null,library=await retroworkLibrary(),candidates=retroworkProgramCandidatePool(library,transcript,base);
    try{
      const raw=await retroworkAI().interpretProgram({transcript,candidates,programBase:base}),program=retroworkResolvedProgramDraft(raw,candidates,base);
      return out(200,{ok:true,program});
    }catch(error){
      const code=String(error&&error.code||'');
      if(code==='NO_PROVIDER')return out(503,{ok:false,error:'AI Retrowork is not configured on the server yet.'});
      if(code==='EMPTY_INPUT')return out(400,{ok:false,error:'Describe the program first.'});
      if(code==='RETROWORK_TIMEOUT')return out(504,{ok:false,error:'AI Retrowork took too long. Your program draft is still here — try again.'});
      if(code==='RETROWORK_REFUSAL'||code==='RETROWORK_PROGRAM_OUTPUT')return out(422,{ok:false,error:'AI Retrowork could not structure that program. Rephrase the program details.'});
      console.warn('retrowork program interpret',code,error&&error.message);return out(502,{ok:false,error:'AI Retrowork could not build that program right now. Your draft is still here.'});
    }
  }
  if(action==='retroworkInterpret'){
    const transcript=retroworkText(b.text,6000),correction=retroworkText(b.correction,1600);
    if(!transcript&&!correction)return out(400,{ok:false,error:'Describe the workout first.'});
    const program=await retroworkProgramForMember(memberId,b.programId,b.dayIndex),library=await retroworkLibrary(),candidates=retroworkCandidates(library,(transcript+' '+correction).trim(),program),programContext=retroworkProgramContext(program,candidates);
    try{
      const raw=await retroworkAI().interpret({transcript,correction,previous:b.previous,candidates,programContext,currentDate:retroworkDate(b.currentDate)||new Date().toISOString().slice(0,10)}),draft=retroworkResolvedDraft(raw,candidates,program);
      return out(200,{ok:true,draft});
    }catch(error){
      const code=String(error&&error.code||'');
      if(code==='NO_PROVIDER')return out(503,{ok:false,error:'AI Retrowork is not configured on the server yet. Text entry remains available after setup.'});
      if(code==='EMPTY_INPUT')return out(400,{ok:false,error:'Describe the workout first.'});
      if(code==='RETROWORK_TIMEOUT')return out(504,{ok:false,error:'AI Retrowork took too long. Your draft is still here — try again.'});
      if(code==='RETROWORK_REFUSAL')return out(422,{ok:false,error:'AI Retrowork could not structure that description. Rephrase only the workout details.'});
      console.warn('retrowork interpret',code,error&&error.message);return out(502,{ok:false,error:'AI Retrowork could not structure that workout right now. Your draft is still here.'});
    }
  }
  if(action==='retroworkCommit'){
    try{const result=await retroworkCommitDraft(memberId,b);return out(result.status,result.body)}
    catch(error){console.warn('retrowork commit',error&&error.message,error&&error.detail);return out(500,{ok:false,error:'Retrowork could not save that workout. Your review is still here.'})}
  }

  /* Read-only member view of the same exercise library used by the coach
     builder. This is intentionally placed after signed member resolution and
     exposes no create/update/archive path. Search and paging stay server-side
     so a large library is never loaded into the workout all at once. */
  if(action==='exerciseLibrary'){
    const q=String(b.q||'').trim().replace(/[%,()]/g,'').slice(0,120);
    const limit=Math.min(200,Math.max(1,parseInt(b.limit,10)||60));
    const offset=Math.max(0,parseInt(b.offset,10)||0);
    const filters=['archived=eq.false'];
    if(q){
      /* Search is intentionally global. A member who starts in Warm-Up and
         types "bench" should immediately see Bench results, not an empty
         filtered list. */
      filters.push('name=ilike.*'+encodeURIComponent(q)+'*');
    }else{
      ['category','region','equipment'].forEach(key=>{
        const value=String(b[key]||'').trim().slice(0,80);
        if(value&&/^[a-z0-9 -]+$/i.test(value))filters.push(key+'=eq.'+encodeURIComponent(value));
      });
      if(b.unilateral===true)filters.push('unilateral=is.true');
      if(b.compound===true)filters.push('compound=is.true');
      if(b.custom===true)filters.push('is_custom=is.true');
    }
    const rows=await P.db('gym_exercises?select=id,name,category,region,muscles,equipment,unilateral,compound,vars,instructions,media_url,media_poster,media_start,media_end,is_custom&'
      +filters.join('&')+'&order='+(q?'name.asc':'category.asc,name.asc')+'&limit='+limit+'&offset='+offset);
    const safe=(rows||[]).map(row=>{
      if(!memberMediaOwner(row&&row.media_url))return row;
      return Object.assign({},row,{media_url:null,media_poster:null,media_start:0,media_end:null});
    });
    return out(200,{ok:true,exercises:safe,hasMore:safe.length===limit});
  }


  if(action==='coachDirectory'){
    const dir=await Role.directory(event,accountMember);return out(dir.status||200,dir);
  }
  if(action==='coachProfileBoot'){
    /* Fitness-only hydration for profile switches.  Deliberately excludes
       Theme/music so entering or leaving a client never restarts or replaces
       the signed-in coach's single global audio owner. */
    const [programs,recent,activeWorkout]=await Promise.all([
      programsForMember(memberId),
      P.db('gym_sessions?select=id,name,session_date,duration_s,status&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.done&order=session_date.desc&limit=12'),
      P.db('gym_sessions?select=id,name,body,started_at,duration_s,status,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.open&order=updated_at.desc&limit=1').then(rows=>rows&&rows[0]||null).catch(()=>null)
    ]);
    const av=await MC.avatarForMember(member);await hydrateMemberMedia(programs||[],memberId);
    return out(200,{ok:true,member:{id:memberId,name:fullName(member),avatarUrl:av.url||null},roleContext,programs:programs||[],recent:recent||[],activeWorkout});
  }

  if(action==='boot'){
    const entry=['slots','tracker','meals','calendar','coach'].includes(String(b.entry||''))?String(b.entry):'tracker';
    if(member.gym_only===true&&(entry==='slots'||entry==='calendar'))return withCookies(403,{ok:false,locked:true,error:'This member view is not included with gym-only access.'},[clearMyCookie(),P.clearCookie()]);
    const [programs,recent,theme,music,activeWorkout]=await Promise.all([
      programsForMember(memberId),
      P.db('gym_sessions?select=id,name,session_date,duration_s,status&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.done&order=session_date.desc&limit=12'),
      /* R90: Theme/music belong to the authenticated human, even while their
         authorized fitness context is another member. */
      themeForMember(accountMemberId),
      musicLibraryForMember(accountMemberId),
      P.db('gym_sessions?select=id,name,body,started_at,duration_s,status,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&status=eq.open&order=updated_at.desc&limit=1').then(rows=>rows&&rows[0]||null).catch(()=>null)
    ]);
    const av=await MC.avatarForMember(member),accountAvatar=String(accountMember.id)===String(member.id)?av:await MC.avatarForMember(accountMember).catch(()=>({url:null}));
    await hydrateMemberMedia(programs||[],memberId);
    const body={ok:true,
      account:{id:accountMemberId,name:fullName(accountMember),avatarUrl:accountAvatar&&accountAvatar.url||null},
      member:{id:memberId,name:fullName(member),avatarUrl:av.url||null},
      roleContext:Object.assign({},roleContext,{canCoach:!!(resolved.capability&&resolved.capability.canCoach),isFobAdmin:!!(resolved.capability&&resolved.capability.isFobAdmin)}),
      programs:programs||[],recent:recent||[],theme,music,activeWorkout};
    /* Cookies refresh the AUTHENTICATED ACCOUNT only. A client context must
       never mint a member token/claim for the client. */
    return accountMember.gym_only===true?out(200,body):withCookies(200,body,[myCookie(memberToken(accountMember)),P.setCookie(P.createClaim(accountMember))]);
  }

  /* v399 — member-owned Program Library. Identity always comes from the
     signed My Gym claim above. Coach-assigned rows are readable but never
     writable through these actions. The ownership marker is written only on
     CREATE and must already exist on a row before UPDATE/ARCHIVE succeeds. */
  if(action==='memberPrograms'){
    const rows=await programsForMember(memberId);await hydrateMemberMedia(rows,memberId);return out(200,{ok:true,programs:rows});
  }
  if(action==='memberProgramCreate'){
    const name=memberProgramText(b.name,80,'My Program'),sub=memberProgramText(b.sub,140,''),body=roleContext.isClientContext?coachProgramBody(b.body,name,sub):cleanMemberProgramBody(b.body,name,sub),payload={member_id:memberId,name:body.name,sub:body.sub||null,body,archived:false,updated_at:new Date().toISOString()};
    try{const rows=await P.db('gym_member_programs',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});return out(200,{ok:true,program:rows&&rows[0]||null});}
    catch(error){if(/gym_member_programs|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))return out(503,{ok:false,error:'Program Library needs the existing Gym program migration 026.'});throw error}
  }
  if(action==='memberProgramUpdate'){
    let current;try{current=await memberProgramRow(memberId,b.id)}catch(error){if(/gym_member_programs|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))return out(503,{ok:false,error:'Program Library needs the existing Gym program migration 026.'});throw error}
    if(!current)return out(404,{ok:false,error:'Program not found.'});if(!roleContext.isClientContext&&!isMemberOwnedProgramBody(current.body))return out(403,{ok:false,error:'Coach-assigned programs are read-only here.'});
    const expected=trainingText(b.expectedUpdatedAt,80),name=memberProgramText(b.name,80,current.name||'My Program'),sub=memberProgramText(b.sub,140,current.sub||''),body=preserveProgramOwnership(cleanMemberProgramBody(b.body,name,sub),current,roleContext.isClientContext),now=new Date().toISOString();
    if(expected&&String(current.updated_at||'')!==expected)return out(409,{ok:false,code:'PROGRAM_CONFLICT',error:'This Program changed somewhere else. Reload it before saving.'});
    const where='gym_member_programs?id=eq.'+encodeURIComponent(current.id)+'&member_id=eq.'+encodeURIComponent(memberId)+(expected?'&updated_at=eq.'+encodeURIComponent(expected):'');
    const rows=await P.db(where,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({name:body.name,sub:body.sub||null,body,updated_at:now})});if(expected&&(!rows||!rows[0]))return out(409,{ok:false,code:'PROGRAM_CONFLICT',error:'This Program changed somewhere else. Reload it before saving.'});return out(200,{ok:true,program:rows&&rows[0]||null});
  }
  if(action==='memberProgramArchive'){
    let current;try{current=await memberProgramRow(memberId,b.id)}catch(error){if(/gym_member_programs|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))return out(503,{ok:false,error:'Program Library needs the existing Gym program migration 026.'});throw error}
    if(!current)return out(404,{ok:false,error:'Program not found.'});if(!roleContext.isClientContext&&!isMemberOwnedProgramBody(current.body))return out(403,{ok:false,error:'Coach-assigned programs cannot be removed here.'});await P.db('gym_member_programs?id=eq.'+encodeURIComponent(current.id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({archived:true,updated_at:new Date().toISOString()})});return out(200,{ok:true});
  }

  if(action==='inspectTikTok'){
    const raw=String(b.tiktokUrl||'');
    let meta=null;
    try{meta=await tiktokPublicMetadata(raw)}catch(e){}
    if(!meta||!meta.id){
      /* Final resolver-only fallback: a TikTok post ID is sufficient for the
         official Embed Player even when oEmbed metadata is temporarily blocked. */
      try{
        const resolved=await tiktokResolveShareUrl(raw);
        if(resolved&&resolved.id)meta={id:resolved.id,canonicalUrl:resolved.url||raw,title:'',author_name:'',soundTitle:''};
      }catch(e){}
    }
    if(!meta||!meta.id)return out(400,{ok:false,error:'TIKTOK_RESOLVE_FAILED'});
    return out(200,{ok:true,id:meta.id,canonicalUrl:meta.canonicalUrl||raw,title:meta.title||'',author_name:meta.author_name||'',soundTitle:meta.soundTitle||''});
  }

  if(action==='detectThemeBpm'){
    const source=String(b.source||'youtube')==='tiktok'?'tiktok':'youtube';
    const url=String(b.url||b[source==='tiktok'?'tiktokUrl':'youtubeUrl']||'');
    const result=await detectThemeBpmSource(source,url);
    return out(result.ok===false?400:200,result);
  }

  if(action==='musicLibrary')return musicActionResponse(async()=>({code:200,body:Object.assign({ok:true},await musicLibraryForMember(accountMemberId))}));
  if(action==='musicUploadTicket')return musicActionResponse(()=>musicUploadTicket(accountMemberId,b));
  if(action==='musicTrackCommit')return musicActionResponse(()=>musicCommitTrack(accountMemberId,b));
  if(action==='musicCoverUploadTicket')return musicActionResponse(()=>musicCoverTicket(accountMemberId,b));
  if(action==='musicTrackCover')return musicActionResponse(()=>musicSaveCover(accountMemberId,b));
  if(action==='musicTrackUpdate')return musicActionResponse(()=>musicUpdateTrack(accountMemberId,b));
  if(action==='musicTrackDelete'||action==='musicTrackDiscard')return musicActionResponse(()=>musicDeleteTrack(accountMemberId,b.trackId));
  if(action==='musicTrackUrl')return musicActionResponse(async()=>{
    const track=await musicTrackForMember(accountMemberId,b.trackId,'ready');if(!track)return{code:404,body:{ok:false,error:'Track not found.'}};
    const signedUrl=await signedMusicPath(accountMemberId,track.id,track.storage_path,'track');return{code:200,body:{ok:true,track:publicMusicTrack(track),signedUrl}};
  });
  if(action==='musicPlaylistCreate')return musicActionResponse(()=>musicCreatePlaylist(accountMemberId,b));
  if(action==='musicPlaylistSetTracks')return musicActionResponse(()=>musicSetPlaylistTracks(accountMemberId,b));
  if(action==='musicPlaylistRename')return musicActionResponse(async()=>{
    const playlist=await musicPlaylistForMember(accountMemberId,b.playlistId);if(!playlist)return{code:404,body:{ok:false,error:'Playlist not found.'}};
    const name=musicText(b.name,60,'Playlist');await P.db('member_music_playlists?id=eq.'+playlist.id+'&member_id=eq.'+accountMemberId,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({name,updated_at:new Date().toISOString()})});return{code:200,body:{ok:true,name}};
  });
  if(action==='musicPlaylistDelete')return musicActionResponse(async()=>{
    const playlist=await musicPlaylistForMember(accountMemberId,b.playlistId);if(!playlist)return{code:404,body:{ok:false,error:'Playlist not found.'}};
    await P.db('member_music_playlists?id=eq.'+playlist.id+'&member_id=eq.'+accountMemberId,{method:'DELETE',headers:{Prefer:'return=minimal'}});return{code:200,body:{ok:true}};
  });
  if(action==='musicStateSave')return musicActionResponse(()=>musicSaveState(accountMemberId,b));
  if(action==='listeningFlush')return musicActionResponse(()=>listeningFlush(accountMemberId,b));
  if(action==='listeningMonth')return musicActionResponse(()=>listeningMonth(accountMemberId,b));

  if(action==='themeSavedLibrary'){const loaded=await savedThemeLibraryForMember(accountMemberId);return out(200,{ok:true,items:loaded.lib.items,order:loaded.lib.order,limit:SAVED_THEME_LIMIT});}
  if(action==='themeSavedCreate'){const result=await createSavedTheme(accountMemberId,b);return out(result.code,result.body);}
  if(action==='themeSavedUpdate'){const result=await updateSavedTheme(accountMemberId,b);return out(result.code,result.body);}
  if(action==='themeSavedReorder'){const result=await reorderSavedThemes(accountMemberId,b);return out(result.code,result.body);}
  if(action==='themeSavedDelete'){const result=await deleteSavedTheme(accountMemberId,b);return out(result.code,result.body);}

  if(action==='saveTheme'){
    const theme=await saveThemeForMember(accountMemberId,b.theme);
    return out(200,{ok:true,theme});
  }

  if(action==='themeAudioLibrary'){
    const loaded=await themeAudioLibraryForMember(accountMemberId);return out(200,Object.assign({ok:true},publicThemeAudioLibrary(loaded.lib)));
  }
  if(action==='themeAudioLibraryCommit'){
    const result=await themeAudioLibraryCommit(accountMemberId,b);return out(result.code,result.body);
  }
  if(action==='themeAudioLibraryDelete'){
    const result=await themeAudioLibraryDelete(accountMemberId,b);return out(result.code,result.body);
  }
  if(action==='themeWorkoutCoverCommit'){
    const result=await themeWorkoutCoverCommit(accountMemberId,b);return out(result.code,result.body);
  }
  if(action==='themeWorkoutCoverUploadTicket'){
    const size=Math.max(0,Number(b.fileSize)||0);if(!size||size>8*1024*1024)return out(400,{ok:false,error:'Choose a cover image under 8 MB.'});
    const target=b&&b.target&&typeof b.target==='object'?b.target:{},shared=uuid(String(target.musicTrackId||''))?String(target.musicTrackId).toLowerCase():'',id=String(target.id||''),audioPath=themeAudioPath(accountMemberId,target.path);
    if(!shared&&!id&&!audioPath)return out(400,{ok:false,error:'Play an uploaded Theme track first.'});
    const name=String(b.fileName||'workout-cover.jpg').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-90),ext=(name.match(/\.[a-zA-Z0-9]{2,5}$/)||['.jpg'])[0].toLowerCase();if(!['.jpg','.jpeg','.png','.webp'].includes(ext))return out(400,{ok:false,error:'Use JPG, PNG, or WebP cover art.'});
    const key=(shared||id||crypto.createHash('sha1').update(audioPath).digest('hex').slice(0,16)).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64),path='member/'+accountMemberId+'/theme-audio-cover/workout-'+key+'-'+crypto.randomUUID().slice(0,8)+ext,t=await MC.signedUpload('gym-exercise-media',path,false);return out(200,{ok:true,signedUrl:t.signedUrl,path,publicUrl:themeAudioCoverUrl(path)});
  }
  if(action==='themeAudioCoverCommit'){
    const result=await themeAudioCoverCommit(accountMemberId,b);return out(result.code,result.body);
  }
  if(action==='themeAudioCoverUploadTicket'){
    const size=Math.max(0,Number(b.fileSize)||0);if(!size||size>8*1024*1024)return out(400,{ok:false,error:'Choose a cover image under 8 MB.'});
    const loaded=await themeAudioLibraryForMember(accountMemberId),track=loaded.lib.tracks.find(t=>t.id===String(b.trackId||''));if(!track)return out(404,{ok:false,error:'Choose a Theme audio track first.'});
    const name=String(b.fileName||'theme-cover.jpg').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-90),ext=(name.match(/\.[a-zA-Z0-9]{2,5}$/)||['.jpg'])[0].toLowerCase();if(!['.jpg','.jpeg','.png','.webp'].includes(ext))return out(400,{ok:false,error:'Use JPG, PNG, or WebP cover art.'});
    const path='member/'+accountMemberId+'/theme-audio-cover/'+track.id+'-'+crypto.randomUUID().slice(0,8)+ext,t=await MC.signedUpload('gym-exercise-media',path,false);return out(200,{ok:true,trackId:track.id,signedUrl:t.signedUrl,path,publicUrl:themeAudioCoverUrl(path)});
  }
  if(action==='themeAudioUploadTicket'){
    const size=Math.max(0,Number(b.fileSize)||0);
    if(!size||size>THEME_AUDIO_MAX_BYTES) return out(400,{ok:false,error:'Choose an audio file under 48 MB.'});
    const loaded=await themeAudioLibraryForMember(accountMemberId),usage=publicThemeAudioLibrary(loaded.lib);
    if(usage.tracks.length>=THEME_AUDIO_LIBRARY_LIMIT)return out(400,{ok:false,error:'Your 30-track Full Effects library is full.'});
    if(usage.usageBytes+size>THEME_AUDIO_LIBRARY_QUOTA)return out(400,{ok:false,error:'Your 300 MB Full Effects library is full.'});
    const name=String(b.fileName||'theme-audio.mp3').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-90);
    const ext=(name.match(/\.[a-zA-Z0-9]{2,5}$/)||['.mp3'])[0].toLowerCase();
    const allowed=['.mp3','.m4a','.aac','.wav'];
    if(!allowed.includes(ext)) return out(400,{ok:false,error:'Use MP3, M4A, AAC, or WAV audio.'});
    const trackId=crypto.randomUUID(),path='member/'+accountMemberId+'/theme-audio/'+trackId+ext;
    const t=await MC.signedUpload('gym-exercise-media',path,false);
    return out(200,{ok:true,trackId,signedUrl:t.signedUrl,path,publicUrl:themeAudioUrl(path)});
  }

  if(action==='discardThemeAudio'){
    const path=themeAudioPath(accountMemberId,b.path);
    if(!path)return out(400,{ok:false,error:'Bad audio file.'});
    await removeThemeAudio(accountMemberId,path);
    return out(200,{ok:true});
  }

  if(action==='avatarUploadTicket'){
    const t=await MC.avatarUploadTicket(member);
    return out(200,{ok:true,signedUrl:t.signedUrl,path:t.path,publicUrl:t.publicUrl});
  }

  if(action==='saveAvatar'){
    if(!b.path) return out(400,{ok:false,error:'Bad avatar update.'});
    const saved=await MC.saveAvatar(member,String(b.path));
    return out(200,{ok:true,url:saved.url,path:String(b.path)});
  }


  /* Member reference clips are scoped to that member's live workout/program
     body. The storage path is member-specific; this does not grant members
     permission to mutate the global coach exercise library. */
  if(action==='memberMediaUrl'){
    const path=ownMemberMediaPath(memberId,b.path);
    if(!path)return out(403,{ok:false,error:'That video is not available to this member.'});
    const signedUrl=await signedMemberMediaUrl(memberId,path);
    return out(200,{ok:true,path,signedUrl});
  }

  if(action==='mediaUploadTicket'){
    const size=Math.max(0,Number(b.fileSize)||0);
    if(size>120*1024*1024)return out(400,{ok:false,error:'Choose a video under 120 MB.'});
    const name=String(b.fileName||'reference.mp4').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-90);
    const ext=(name.match(/\.[a-zA-Z0-9]{2,5}$/)||['.mp4'])[0].toLowerCase();
    const allowed=['.mp4','.mov','.webm','.m4v']; const safeExt=allowed.includes(ext)?ext:'.mp4';
    const exercise=uuid(b.exerciseId)?String(b.exerciseId).toLowerCase():'exercise';
    const path='member/'+memberId+'/exercise/'+exercise+'/'+Date.now()+'-'+crypto.randomBytes(10).toString('hex')+safeExt;
    const t=await MC.signedUpload(MEMBER_MEDIA_BUCKET,path,false);
    /* Deliberately no publicUrl. Playback is obtained only from the authenticated
       memberMediaUrl action after an exact owner/path check. */
    return out(200,{ok:true,signedUrl:t.signedUrl,path});
  }

  /* R67 — MAH MEDIA. Upload and metadata are two phases so a rejected 31-second
     clip never becomes a journal row. If commit fails, the browser calls discard;
     deletes remove both the owned row and its private object. */
  if(action==='mahMediaList'){
    try{const page=await progressMediaRows(memberId,b.offset,b.limit);return out(200,{ok:true,items:page.items,hasMore:page.hasMore,nextOffset:page.nextOffset})}
    catch(error){if(/member_progress_media|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))return out(503,{ok:false,error:'MAH MEDIA needs database migration 050.'});throw error}
  }
  if(action==='mahMediaUploadTicket'){
    const kind=String(b.kind||'').toLowerCase(),size=Math.max(0,Number(b.fileSize)||0),raw=String(b.fileName||'media').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-90);if(kind!=='photo'&&kind!=='video')return out(400,{ok:false,error:'Choose a photo or video.'});
    const max=progressMediaMaxBytes(kind),mime=progressMediaMime(kind,raw,b.contentType);if(!size||size>max)return out(400,{ok:false,error:kind==='photo'?'Choose a progress photo under 25 MB.':'Choose a progress video under 120 MB.'});
    if(!mime)return out(400,{ok:false,error:kind==='photo'?'Choose a JPEG, PNG, WEBP, HEIC, or HEIF photo.':'Choose an MP4, MOV, M4V, WEBM, or MPEG video.'});
    const fallback=kind==='photo'?'.jpg':'.mp4',ext=(raw.match(/\.[a-zA-Z0-9]{2,5}$/)||[fallback])[0].toLowerCase(),safePhoto=['.jpg','.jpeg','.png','.webp','.heic','.heif'],safeVideo=['.mp4','.mov','.m4v','.webm','.mpeg','.mpg'],safeExt=(kind==='photo'?safePhoto:safeVideo).includes(ext)?ext:fallback,path='member/'+memberId+'/progress/'+kind+'/'+Date.now()+'-'+crypto.randomBytes(12).toString('hex')+safeExt,t=await MC.signedUpload(PROGRESS_MEDIA_BUCKET,path,false);return out(200,{ok:true,path,signedUrl:t.signedUrl,mime:mime});
  }
  if(action==='mahMediaCommit'){
    const kind=String(b.kind||'').toLowerCase(),path=progressMediaPath(memberId,b.path),date=progressMediaDate(b.date),size=Math.max(0,Number(b.fileSize)||0),mime=progressMediaMime(kind,path,b.contentType),presentation=progressMediaPresentation(b.presentation);if(!path||!date||(kind!=='photo'&&kind!=='video')||!size||size>progressMediaMaxBytes(kind)||!mime)return out(400,{ok:false,error:'That MAH MEDIA entry is incomplete or invalid.'});
    let angle=null,title=null,duration=null;if(kind==='photo'){angle=String(b.angle||'');if(!PROGRESS_MEDIA_ANGLES.has(angle))return out(400,{ok:false,error:'Choose a valid progress-photo angle.'})}else{title=String(b.title||'').trim().slice(0,120);duration=Number(b.duration)||0;if(!title)return out(400,{ok:false,error:'Give this progress video a title.'});if(!(duration>0&&duration<=30))return out(400,{ok:false,error:'MAH MEDIA videos can be up to 30 seconds.'})}
    const payload={member_id:memberId,kind,storage_path:path,captured_on:date,angle,title,duration_s:duration,mime_type:mime,file_size_bytes:size,presentation,updated_at:new Date().toISOString()};
    try{const rows=await P.db('member_progress_media',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)}),row=rows&&rows[0];return out(200,{ok:true,item:publicProgressMediaRow(row,await signedProgressMediaUrl(memberId,path))})}
    catch(error){if(/member_progress_media|schema cache|does not exist/i.test(String(error&&error.detail||error&&error.message||'')))return out(503,{ok:false,error:'MAH MEDIA needs database migration 050.'});throw error}
  }
  if(action==='mahMediaUpdate'){
    const id=uuid(b.id)?String(b.id).toLowerCase():'';if(!id)return out(400,{ok:false,error:'Bad MAH MEDIA entry.'});const rows=await P.db('member_progress_media?select=id,kind,storage_path,captured_on,angle,title,duration_s,presentation,created_at&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(id)+'&limit=1'),row=rows&&rows[0];if(!row)return out(404,{ok:false,error:'MAH MEDIA entry not found.'});
    const patch={presentation:progressMediaPresentation(b.presentation),updated_at:new Date().toISOString()};if(row.kind==='video'&&b.title!=null){const title=String(b.title||'').trim().slice(0,120);if(!title)return out(400,{ok:false,error:'Give this progress video a title.'});patch.title=title}if(b.date!=null){const date=progressMediaDate(b.date);if(!date)return out(400,{ok:false,error:'Choose a valid date.'});patch.captured_on=date}if(row.kind==='photo'&&b.angle!=null){const angle=String(b.angle||'');if(!PROGRESS_MEDIA_ANGLES.has(angle))return out(400,{ok:false,error:'Choose a valid progress-photo angle.'});patch.angle=angle}
    const updated=await P.db('member_progress_media?id=eq.'+encodeURIComponent(id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)}),saved=updated&&updated[0];return out(200,{ok:true,item:publicProgressMediaRow(saved,await signedProgressMediaUrl(memberId,saved.storage_path))});
  }
  if(action==='mahMediaDelete'){
    const id=uuid(b.id)?String(b.id).toLowerCase():'';if(!id)return out(400,{ok:false,error:'Bad MAH MEDIA entry.'});const rows=await P.db('member_progress_media?select=id,storage_path&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(id)+'&limit=1'),row=rows&&rows[0];if(!row)return out(200,{ok:true});await P.db('member_progress_media?id=eq.'+encodeURIComponent(id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'DELETE',headers:{Prefer:'return=minimal'}});await removeProgressMediaObject(memberId,row.storage_path).catch(()=>{});return out(200,{ok:true});
  }
  if(action==='mahMediaDiscard'){const path=progressMediaPath(memberId,b.path);if(path)await removeProgressMediaObject(memberId,path).catch(()=>{});return out(200,{ok:true})}

  if(action==='progress'){
    const progress=await memberGymProgress(memberId);
    return out(200,{ok:true,sets:progress.sets,sessions:progress.sessions,repairedSetCount:progress.repairedSetCount});
  }

  if(action==='history'){
    /* History uses the same repaired projection as the overview, so opening an
       exercise directly (without first visiting Progress) still sees older
       completed Bench/other work. Each completed workout remains an independent
       session for the client time-series peak calculation. */
    const progress=await memberGymProgress(memberId),wantedId=uuid(b.exerciseId)?String(b.exerciseId).toLowerCase():'',wantedName=String(b.name||'').trim().toLowerCase().replace(/\s+/g,' ');
    const rows=progress.sets.filter(row=>wantedId?String(row&&row.exercise_id||'').toLowerCase()===wantedId:String(row&&row.exercise_name||'').trim().toLowerCase().replace(/\s+/g,' ')===wantedName)
      .sort((a,b)=>String(b&&b.session_date||'').localeCompare(String(a&&a.session_date||''))||(Number(a&&a.set_no)||0)-(Number(b&&b.set_no)||0)).slice(0,48)
      .map(row=>({session_date:row.session_date,set_no:row.set_no,weight:row.weight,reps:row.reps,time_s:row.time_s,distance:row.distance,fm_distance:row.fm_distance,fm_time_s:row.fm_time_s,rpe:row.rpe,rir:row.rir}));
    return out(200,{ok:true,sets:rows,repairedSetCount:progress.repairedSetCount});
  }

  if(action==='session'){
    const body=sanitizeMemberBody(b.body,memberId);
    /* Expanded R52: one member owns at most one active Live Workout. A repeated
       start request resumes the canonical open row instead of abandoning it and
       creating a parallel timer/history identity. Explicit DISCARD still owns
       abandonment. */
    const open=await P.db('gym_sessions?select=*&member_id=eq.'+memberId+'&status=eq.open&order=updated_at.desc&limit=1');
    if(open&&open[0])return out(200,{ok:true,session:open[0],reused:true});
    const rows=await P.db('gym_sessions',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({member_id:memberId,name:String(b.name||'Workout'),body,started_at:new Date().toISOString()})});
    return out(200,{ok:true,session:rows&&rows[0],reused:false});
  }

  if(action==='abandon'){
    if(!uuid(b.id)) return out(400,{error:'Bad session.'});
    const rows=await P.db('gym_sessions?select=id,status&member_id=eq.'+memberId+'&id=eq.'+b.id+'&limit=1');
    const session=rows&&rows[0];
    if(!session) return out(200,{ok:true});
    if(session.status==='open') await P.db('gym_sessions?id=eq.'+b.id+'&member_id=eq.'+memberId,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'abandoned',body:[],duration_s:0,notes:null,ended_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
    return out(200,{ok:true});
  }

  if(action==='save'){
    if(!uuid(b.id)) return out(400,{error:'Bad session.'});
    const rows=await P.db('gym_sessions?select=id,status&member_id=eq.'+memberId+'&id=eq.'+b.id+'&limit=1');
    if(!rows||!rows.length||rows[0].status!=='open') return out(403,{error:'That workout is not available.'});
    const body=sanitizeMemberBody(b.body,memberId);
    await P.db('gym_sessions?id=eq.'+b.id+'&member_id=eq.'+memberId+'&status=eq.open',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({body,name:b.name||null,notes:b.notes||null,duration_s:parseInt(b.duration,10)||0,updated_at:new Date().toISOString()})});
    return out(200,{ok:true});
  }

  if(action==='finish'){
    if(!uuid(b.id)) return out(400,{error:'Bad session.'});
    const rows=await P.db('gym_sessions?select=*&member_id=eq.'+memberId+'&id=eq.'+b.id+'&limit=1');
    const s=rows&&rows[0]; if(!s)return out(403,{error:'That workout is not available.'});if(s.status==='done')return out(200,{ok:true,session:s,reused:true});if(s.status!=='open')return out(403,{error:'That workout is not available.'});
    const body=sanitizeMemberBody(Array.isArray(b.body)?b.body:(s.body||[]),memberId);
    await P.db('gym_sets?session_id=eq.'+s.id+'&member_id=eq.'+memberId,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    const flat=[];
    body.forEach(it=>(it.sets||[]).forEach((st,i)=>{if(!st.done)return;flat.push({session_id:s.id,member_id:memberId,exercise_id:uuid(it.exerciseId)?it.exerciseId:null,exercise_name:it.name||'Exercise',session_date:s.session_date,set_no:i+1,weight:st.weight==null?null:st.weight,reps:st.reps==null?null:st.reps,time_s:st.time==null?null:st.time,distance:st.distance==null?null:st.distance,resistance:st.resistance||null,rpe:st.rpe==null?null:st.rpe,rir:st.rir==null?null:st.rir,fm_distance:st.fm==null?null:st.fm,fm_time_s:st.fmTime==null?null:st.fmTime})}));
    if(flat.length) await P.db('gym_sets',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(flat)});
    await P.db('gym_sessions?id=eq.'+s.id+'&member_id=eq.'+memberId,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'done',body,ended_at:new Date().toISOString(),duration_s:parseInt(b.duration,10)||0,notes:b.notes||null,updated_at:new Date().toISOString()})});

    /* A completed member workout becomes the next version of that same
       assigned workout. This mirrors the coach console: changed loads/reps,
       set counts and any allowed structural edits carry forward automatically.
       Historical gym_sessions/gym_sets above remain immutable snapshots. */
    if(uuid(b.programId) && Number.isInteger(Number(b.dayIndex)) && Number(b.dayIndex)>=0){
      const di=Number(b.dayIndex);
      const resetBody=JSON.parse(JSON.stringify(body||[]));
      resetBody.forEach(it=>{(it.sets||[]).forEach(st=>{st.done=false})});
      let updated=false;
      try{
        const pr=await P.db('gym_member_programs?select=id,body,name,sub&member_id=eq.'+memberId+'&id=eq.'+b.programId+'&limit=1');
        if(pr&&pr[0]){
          const pb=pr[0].body||{}; pb.days=Array.isArray(pb.days)?pb.days:[];
          if(pb.days[di]){pb.days[di].name=String(b.name||pb.days[di].name||'Workout');pb.days[di].items=resetBody;
            await P.db('gym_member_programs?id=eq.'+b.programId+'&member_id=eq.'+memberId,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({body:pb,updated_at:new Date().toISOString()})});updated=true;}
        }
      }catch(e){console.warn('mygym program carry-forward primary',e&&e.message||e)}
      if(!updated){
        try{
          const cp=await P.db('gym_sessions?select=id,body&member_id=eq.'+memberId+'&id=eq.'+b.programId+'&status=eq.program&limit=1');
          if(cp&&cp[0]){const pb=cp[0].body||{};pb.days=Array.isArray(pb.days)?pb.days:[];if(pb.days[di]){pb.days[di].name=String(b.name||pb.days[di].name||'Workout');pb.days[di].items=resetBody;await P.db('gym_sessions?id=eq.'+b.programId+'&member_id=eq.'+memberId,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({body:pb,updated_at:new Date().toISOString()})});}}
        }catch(e){console.warn('mygym program carry-forward compatibility',e&&e.message||e)}
      }
    }
    return out(200,{ok:true,logged:flat.length});
  }

  return out(400,{error:'Unknown action.'});
}

/* Shared with Meal Grade so the member-facing nutrition journal uses the
   exact same signed My Gym identity instead of a second auth system. */
exports.memberFromToken=parseMemberToken;
exports.memberFromRequest=claimFromRequest;
exports._memberMediaPrivacy={storageMediaPath,memberMediaOwner,ownMemberMediaPath,sanitizeMemberBody};
exports._memberMusic={musicTrackPath,cleanMusicSettings,publicMusicTrack};
/* R71 — the Protocol foundation is exported the same way the media/music
   internals already are, so its optional-layer degradation can be EXECUTED by
   the targeted suite instead of pattern-matched in the source. */
exports._protocolFoundation=protocolFoundation;
exports._protocolContext=protocolContext;
exports._protocolKnownFactsFromBrief=protocolKnownFactsFromBrief;
exports._protocolQuestionPlanFromBrief=protocolQuestionPlanFromBrief;
exports._protocolProgramFactSummary=protocolProgramFactSummary;
exports._periodizationPublic=periodizationPublic;

exports.handler=async function(event){
  if(event.httpMethod==='GET'){
    const q=event.queryStringParameters||{};
    if(q.musicCover){try{return await musicCoverRedirect(event,String(q.musicCover))}catch(e){return{statusCode:404,headers:JSON_H,body:''}}}
    if(q.musicTrack){try{return await musicTrackRedirect(event,String(q.musicTrack))}catch(e){return{statusCode:404,headers:JSON_H,body:''}}}
    return {statusCode:200,headers:HTML_H,body:shell()};
  }
  if(event.httpMethod!=='POST') return out(405,{error:'Method not allowed.'});
  let b={};try{b=JSON.parse(event.body||'{}')}catch(e){}
  if(b.action==='healthImportDays'&&Buffer.byteLength(String(event.body||''),'utf8')>192*1024)return out(413,{ok:false,error:'Health history batch is too large.'});
  try{return await api(event,b)}catch(e){console.error('mygym',e&&e.message,e&&e.detail);return out(500,{error:'MAH GYM is unavailable right now.'})}
};
