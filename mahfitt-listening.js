/* MAHFITT v414 — privacy-first listening intelligence.
   This module stores compact monthly deltas only. It never records a raw
   playback timeline, URLs, search history, or per-second events. */
(function(global){
  'use strict';
  var VERSION=1,HEARTBEAT_MS=4000,NETWORK_FLUSH_MS=60000,LOCAL_WRITE_MS=15000,MAX_ROWS=80;
  function clamp(n,a,b){n=Number(n);return isFinite(n)?Math.max(a,Math.min(b,n)):a}
  function text(v,n,f){v=String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').trim();return(v||String(f||'')).slice(0,n)}
  function token(v,n,f){v=String(v||'').toLowerCase().replace(/[^a-z0-9:_-]/g,'').slice(0,n);return v||String(f||'')}
  function monthKey(d){d=d instanceof Date?d:new Date(d||Date.now());return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
  function dayKey(d){d=d instanceof Date?d:new Date(d||Date.now());return monthKey(d)+'-'+String(d.getDate()).padStart(2,'0')}
  function hourOf(d){d=d instanceof Date?d:new Date(d||Date.now());return Math.max(0,Math.min(23,d.getHours()))}
  function randomId(){try{if(global.crypto&&typeof global.crypto.randomUUID==='function')return global.crypto.randomUUID()}catch(e){}var a=[];for(var i=0;i<16;i++)a.push(Math.floor(Math.random()*256));a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;var h=a.map(function(v){return v.toString(16).padStart(2,'0')}).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)}
  function safeStorage(value){return value&&typeof value.getItem==='function'&&typeof value.setItem==='function'?value:null}
  function normalizeDescriptor(raw){
    raw=raw&&typeof raw==='object'?raw:{};
    var source=token(raw.sourceType,16,'theme');if(['studio','theme','youtube','tiktok','fob'].indexOf(source)<0)source='theme';
    var scene=token(raw.scene,20,'mesh');if(['mesh','storm','waterfall','mountain','disco','space'].indexOf(scene)<0)scene='mesh';
    return{trackKey:token(raw.trackKey,160,'fob:default'),sourceType:source,title:text(raw.title,100,'MAHFITT Audio'),artist:text(raw.artist,100,''),scene:scene,themeKey:token(raw.themeKey,120,'theme:default'),themeLabel:text(raw.themeLabel,80,'MAHFITT Theme')};
  }
  function normalizeContext(v){v=token(v,24,'none');return['none','workout','warmup','strength','core','cooldown'].indexOf(v)>=0?v:'workout'}
  function normalizeEffects(raw){raw=raw&&typeof raw==='object'?raw:{};return{rate:clamp(raw.rate,.25,4),pitch:clamp(raw.pitch,-12,12),reverb:!!raw.reverb,vhs:!!raw.vhs,radio:!!raw.radio,loopBeats:Math.max(0,Math.round(Number(raw.loopBeats)||0)),trackLoop:!!raw.trackLoop}}
  function emptyRow(desc,context,now){return{month:monthKey(now),trackKey:desc.trackKey,sourceType:desc.sourceType,scene:desc.scene,themeKey:desc.themeKey,themeLabel:desc.themeLabel,workoutContext:context,title:desc.title,artist:desc.artist,listenedSeconds:0,starts:0,completions:0,skips:0,replays:0,workoutSeconds:0,reverbSeconds:0,vhsSeconds:0,radioSeconds:0,pitchSeconds:0,speedSeconds:0,effectSampleSeconds:0,lastPlayedAt:new Date(now).toISOString()}}
  function rowIdentity(desc,context,now){return[monthKey(now),desc.trackKey,desc.sourceType,desc.scene,desc.themeKey,context].join('|')}
  function sanitizeRow(row){return{month:text(row.month,7,monthKey()),trackKey:token(row.trackKey,160,'fob:default'),sourceType:token(row.sourceType,16,'theme'),scene:token(row.scene,20,'mesh'),themeKey:token(row.themeKey,120,'theme:default'),themeLabel:text(row.themeLabel,80,'MAHFITT Theme'),workoutContext:normalizeContext(row.workoutContext),title:text(row.title,100,'MAHFITT Audio'),artist:text(row.artist,100,''),listenedSeconds:+clamp(row.listenedSeconds,0,86400).toFixed(3),starts:Math.round(clamp(row.starts,0,10000)),completions:Math.round(clamp(row.completions,0,10000)),skips:Math.round(clamp(row.skips,0,10000)),replays:Math.round(clamp(row.replays,0,10000)),workoutSeconds:+clamp(row.workoutSeconds,0,86400).toFixed(3),reverbSeconds:+clamp(row.reverbSeconds,0,86400).toFixed(3),vhsSeconds:+clamp(row.vhsSeconds,0,86400).toFixed(3),radioSeconds:+clamp(row.radioSeconds,0,86400).toFixed(3),pitchSeconds:+clamp(row.pitchSeconds,-1036800,1036800).toFixed(3),speedSeconds:+clamp(row.speedSeconds,0,345600).toFixed(3),effectSampleSeconds:+clamp(row.effectSampleSeconds,0,86400).toFixed(3),lastPlayedAt:text(row.lastPlayedAt,40,new Date().toISOString())}}
  function hasPayload(row){return!!row&&(row.listenedSeconds>.05||row.starts||row.completions||row.skips||row.replays)}
  function sanitizeDay(row){row=row&&typeof row==='object'?row:{};var day=text(row.day,10,dayKey()),listened=clamp(row.listenedSeconds,0,86400);return{day:day,listenedSeconds:+listened.toFixed(3),workoutSeconds:+Math.min(listened,clamp(row.workoutSeconds,0,86400)).toFixed(3)}}
  function sanitizeHour(row){row=row&&typeof row==='object'?row:{};var listened=clamp(row.listenedSeconds,0,200000);return{month:text(row.month,7,monthKey()),hour:Math.round(clamp(row.hour,0,23)),listenedSeconds:+listened.toFixed(3),workoutSeconds:+Math.min(listened,clamp(row.workoutSeconds,0,200000)).toFixed(3)}}
  function hasPattern(row){return!!row&&row.listenedSeconds>.05}
  function create(options){
    options=options&&typeof options==='object'?options:{};
    var memberId=text(options.memberId,64,''),storage=safeStorage(options.storage||global.localStorage),storageKey='mahfitt.listening.v'+VERSION+'.'+memberId;
    var nowFn=typeof options.now==='function'?options.now:function(){return Date.now()},timerSet=typeof options.setTimeout==='function'?options.setTimeout:global.setTimeout.bind(global),timerClear=typeof options.clearTimeout==='function'?options.clearTimeout:global.clearTimeout.bind(global);
    var describe=typeof options.describe==='function'?options.describe:function(){return{}},getTime=typeof options.getTime==='function'?options.getTime:function(){return 0},isActive=typeof options.isActive==='function'?options.isActive:function(){return false},getContext=typeof options.getContext==='function'?options.getContext:function(){return'none'},getEffects=typeof options.getEffects==='function'?options.getEffects:function(){return{}},send=typeof options.send==='function'?options.send:function(){return Promise.resolve({ok:false})},online=typeof options.online==='function'?options.online:function(){return !global.navigator||global.navigator.onLine!==false};
    var deltas={},dayDeltas={},hourDeltas={},pending=[],session=null,heartbeat=0,flushTimer=0,writeTimer=0,flushPromise=null,destroyed=false;
    function persist(){if(!storage||!memberId)return;try{storage.setItem(storageKey,JSON.stringify({deltas:deltas,days:dayDeltas,hours:hourDeltas,pending:pending.slice(0,8)}))}catch(e){}}
    function restore(){if(!storage||!memberId)return;try{var raw=JSON.parse(storage.getItem(storageKey)||'null');if(raw&&raw.deltas&&typeof raw.deltas==='object'){Object.keys(raw.deltas).slice(0,320).forEach(function(k){var r=sanitizeRow(raw.deltas[k]);if(hasPayload(r)){var id=[r.month,r.trackKey,r.sourceType,r.scene,r.themeKey,r.workoutContext].join('|');deltas[id]=r}})}if(raw&&raw.days&&typeof raw.days==='object'){Object.keys(raw.days).slice(0,160).forEach(function(k){var r=sanitizeDay(raw.days[k]);if(hasPattern(r))dayDeltas[r.day]=r})}if(raw&&raw.hours&&typeof raw.hours==='object'){Object.keys(raw.hours).slice(0,120).forEach(function(k){var r=sanitizeHour(raw.hours[k]);if(hasPattern(r))hourDeltas[r.month+'|'+r.hour]=r})}if(raw&&Array.isArray(raw.pending))pending=raw.pending.filter(function(b){return b&&/^[0-9a-f-]{36}$/i.test(String(b.id||''))}).slice(0,8).map(function(b){var tracks=(b.rows||b.tracks||[]).map(sanitizeRow).filter(hasPayload).slice(0,MAX_ROWS),days=(b.days||[]).map(sanitizeDay).filter(hasPattern).slice(0,40),hours=(b.hours||[]).map(sanitizeHour).filter(hasPattern).slice(0,72);return{id:String(b.id),rows:tracks,days:days,hours:hours}}).filter(function(b){return b.rows.length||b.days.length||b.hours.length})}catch(e){deltas={};dayDeltas={};hourDeltas={};pending=[]}}
    restore();
    function schedulePersist(force){if(force){if(writeTimer){timerClear(writeTimer);writeTimer=0}persist();return}if(writeTimer)return;writeTimer=timerSet(function(){writeTimer=0;persist()},LOCAL_WRITE_MS)}
    function row(desc,context,now){var id=rowIdentity(desc,context,now),r=deltas[id];if(!r){r=deltas[id]=emptyRow(desc,context,now)}else{r.themeLabel=desc.themeLabel;r.title=desc.title;r.artist=desc.artist}return r}
    function sessionKey(desc,context){return[desc.trackKey,desc.sourceType,desc.scene,desc.themeKey,context].join('|')}
    function activeDescriptor(){try{return normalizeDescriptor(describe())}catch(e){return normalizeDescriptor({})}}
    function mediaTime(){try{return Math.max(0,Number(getTime())||0)}catch(e){return 0}}
    function active(){try{return!!isActive()}catch(e){return false}}
    function context(){try{return normalizeContext(getContext())}catch(e){return'none'}}
    function effects(){try{return normalizeEffects(getEffects())}catch(e){return normalizeEffects({})}}
    function closeSession(){session=null}
    function addPatterns(now,seconds,ctx){var d=dayKey(now),m=monthKey(now),hour=hourOf(now),day=dayDeltas[d]||(dayDeltas[d]={day:d,listenedSeconds:0,workoutSeconds:0}),hk=m+'|'+hour,hr=hourDeltas[hk]||(hourDeltas[hk]={month:m,hour:hour,listenedSeconds:0,workoutSeconds:0});day.listenedSeconds+=seconds;hr.listenedSeconds+=seconds;if(ctx!=='none'){day.workoutSeconds+=seconds;hr.workoutSeconds+=seconds}}
    function account(now,currentlyActive){
      now=Number(now)||nowFn();var desc=activeDescriptor(),ctx=context(),key=sessionKey(desc,ctx),time=mediaTime(),fx=effects();
      if(!session||session.key!==key){var trackSession=[desc.trackKey,desc.sourceType,desc.scene,desc.themeKey].join('|'),carry=!!(session&&session.trackSession===trackSession&&session.started);session={key:key,trackSession:trackSession,lastWall:now,lastMedia:time,started:carry};return false}
      var wall=Math.max(0,Math.min(12,(now-session.lastWall)/1000)),mediaDelta=time-session.lastMedia,progress=false,wrapped=false;
      if(wall>.04){var ceiling=wall*Math.max(.25,fx.rate)*2.4+2;progress=mediaDelta>.08&&mediaDelta<=ceiling;wrapped=fx.trackLoop&&session.lastMedia>.5&&mediaDelta<-.25;if(!progress&&wrapped)progress=true;if(!progress&&fx.loopBeats>0&&mediaDelta<-.08&&Math.abs(mediaDelta)<=30)progress=true}
      if(progress){var r=row(desc,ctx,now);if(!session.started){r.starts+=1;session.started=true}if(wrapped)r.completions+=1;r.listenedSeconds+=wall;if(ctx!=='none')r.workoutSeconds+=wall;if(fx.reverb)r.reverbSeconds+=wall;if(fx.vhs)r.vhsSeconds+=wall;if(fx.radio)r.radioSeconds+=wall;r.pitchSeconds+=fx.pitch*wall;r.speedSeconds+=fx.rate*wall;r.effectSampleSeconds+=wall;r.lastPlayedAt=new Date(now).toISOString();addPatterns(now,wall,ctx);schedulePersist(false);scheduleFlush()}
      session.lastWall=now;session.lastMedia=time;
      if(!currentlyActive)closeSession();return progress
    }
    function heartbeatTick(){heartbeat=0;if(destroyed)return;var on=active();account(nowFn(),on);if(on)heartbeat=timerSet(heartbeatTick,HEARTBEAT_MS)}
    function sync(){if(destroyed)return;var on=active();account(nowFn(),on);if(on&&!heartbeat)heartbeat=timerSet(heartbeatTick,HEARTBEAT_MS);if(!on&&heartbeat){timerClear(heartbeat);heartbeat=0}if(!on)schedulePersist(false)}
    function mark(kind){if(destroyed)return false;var on=active();account(nowFn(),on);var desc=activeDescriptor(),ctx=context(),r=row(desc,ctx,nowFn());if(kind==='replay')r.replays+=1;else if(kind==='skip')r.skips+=1;else return false;r.lastPlayedAt=new Date(nowFn()).toISOString();schedulePersist(true);scheduleFlush(true);if(kind==='replay'){var replayTrack=[desc.trackKey,desc.sourceType,desc.scene,desc.themeKey].join('|');session={key:sessionKey(desc,ctx),trackSession:replayTrack,lastWall:nowFn(),lastMedia:mediaTime(),started:session&&session.started||false}}return true}
    function rebase(){if(destroyed)return false;var desc=activeDescriptor(),ctx=context(),key=sessionKey(desc,ctx),trackSession=[desc.trackKey,desc.sourceType,desc.scene,desc.themeKey].join('|'),started=!!(session&&session.trackSession===trackSession&&session.started),now=nowFn();session={key:key,trackSession:trackSession,lastWall:now,lastMedia:mediaTime(),started:started};return true}
    function complete(){if(destroyed)return false;account(nowFn(),active());var desc=activeDescriptor(),ctx=context(),r=row(desc,ctx,nowFn());r.completions+=1;r.lastPlayedAt=new Date(nowFn()).toISOString();schedulePersist(true);scheduleFlush(true);closeSession();return true}
    function currentRows(){return Object.keys(deltas).map(function(k){return sanitizeRow(deltas[k])}).filter(hasPayload)}
    function currentDays(){return Object.keys(dayDeltas).map(function(k){return sanitizeDay(dayDeltas[k])}).filter(hasPattern)}
    function currentHours(){return Object.keys(hourDeltas).map(function(k){return sanitizeHour(hourDeltas[k])}).filter(hasPattern)}
    function makeBatch(){if(pending.length)return null;var keys=Object.keys(deltas).filter(function(k){return hasPayload(sanitizeRow(deltas[k]))}).slice(0,MAX_ROWS),dayKeys=Object.keys(dayDeltas).filter(function(k){return hasPattern(sanitizeDay(dayDeltas[k]))}).slice(0,40),hourKeys=Object.keys(hourDeltas).filter(function(k){return hasPattern(sanitizeHour(hourDeltas[k]))}).slice(0,72);if(!keys.length&&!dayKeys.length&&!hourKeys.length)return null;var batch={id:randomId(),rows:keys.map(function(k){return sanitizeRow(deltas[k])}),days:dayKeys.map(function(k){return sanitizeDay(dayDeltas[k])}),hours:hourKeys.map(function(k){return sanitizeHour(hourDeltas[k])})};pending.push(batch);keys.forEach(function(k){delete deltas[k]});dayKeys.forEach(function(k){delete dayDeltas[k]});hourKeys.forEach(function(k){delete hourDeltas[k]});persist();return batch}
    function scheduleFlush(soon){if(destroyed||flushTimer||flushPromise)return;flushTimer=timerSet(function(){flushTimer=0;flush(false)},soon?5000:NETWORK_FLUSH_MS)}
    function flush(force,keepalive){
      if(destroyed&& !force)return Promise.resolve(false);if(flushPromise)return flushPromise;if(!online()){schedulePersist(true);return Promise.resolve(false)};
      var batch=pending[0]||makeBatch();if(!batch)return Promise.resolve(true);
      flushPromise=Promise.resolve().then(function(){return send({batchId:batch.id,rows:batch.rows,days:batch.days||[],hours:batch.hours||[],keepalive:!!keepalive})}).then(function(result){if(result&&result.ok!==false){if(pending[0]&&pending[0].id===batch.id)pending.shift();persist();flushPromise=null;if(pending.length||currentRows().length||currentDays().length||currentHours().length)return flush(force,keepalive);return true}flushPromise=null;scheduleFlush(false);return false}).catch(function(){flushPromise=null;scheduleFlush(false);return false});return flushPromise
    }
    function onVisibility(){if(global.document&&global.document.visibilityState==='hidden'){sync();flush(true,true)}else sync()}
    function onPageHide(){sync();schedulePersist(true);flush(true,true)}
    function onOnline(){scheduleFlush(true)}
    if(global.document&&global.document.addEventListener)global.document.addEventListener('visibilitychange',onVisibility);
    if(global.addEventListener){global.addEventListener('pagehide',onPageHide);global.addEventListener('online',onOnline)}
    function destroy(){destroyed=true;if(heartbeat)timerClear(heartbeat);if(flushTimer)timerClear(flushTimer);if(writeTimer)timerClear(writeTimer);heartbeat=flushTimer=writeTimer=0;schedulePersist(true);if(global.document&&global.document.removeEventListener)global.document.removeEventListener('visibilitychange',onVisibility);if(global.removeEventListener){global.removeEventListener('pagehide',onPageHide);global.removeEventListener('online',onOnline)}}
    return{sync:sync,mark:mark,rebase:rebase,complete:complete,flush:flush,destroy:destroy,_debug:function(){return{deltas:deltas,days:currentDays(),hours:currentHours(),pending:pending,session:session,rows:currentRows()}}};
  }
  global.MahfittListening={create:create,monthKey:monthKey,normalizeDescriptor:normalizeDescriptor,normalizeEffects:normalizeEffects};
})(window);
