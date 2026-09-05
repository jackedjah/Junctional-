'use strict';
/* ══ FOB SYSTEMS :: GYM TRACKER ════════════════════════════════════════════
   Coach-facing. Serves the app shell at /gym-tracker and answers its API.

   SECURITY, and it follows the site's existing conventions exactly:
     - every request passes S.isAuthed(event), the same admin session that
       guards /fob-payment and /fob-progress. Signed out you get the same
       login card, and the API answers nothing.
     - all database access goes through P.db with the service role, server
       side. No key, no client record and no member id ever reaches the
       browser except in the response to an authed request.
     - noindex / nofollow / noarchive and no-store, matching the other
       private FOB surfaces.

   The UI itself lives in gym-app.css and gym-app.js as ordinary static
   files. They hold no data and no secrets, only interface code, so serving
   them normally is safe and lets the browser cache them between sessions.
   ═══════════════════════════════════════════════════════════════════════ */

const S = require('./_session');
const P = require('./_payment');
const MC = require('./_member-community');
const EXERCISE_CATALOG = require('./_gym-exercise-catalog').catalog;

const JSON_H = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive'
};
const HTML_H = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
};

const V = 446;                                   /* asset cache stamp */
const out = (code, body) => ({ statusCode: code, headers: JSON_H, body: JSON.stringify(body) });
const uuid = v => /^[0-9a-fA-F-]{36}$/.test(String(v || ''));

function coachTrainingText(v,max){return String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max)}
function coachTrainingDate(v){const x=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(x))return null;return Number.isNaN(new Date(x+'T12:00:00Z').getTime())?null:x}
function coachTrainingNum(v,min,max,integer){if(v==null||v==='')return null;const n=Number(v);if(!Number.isFinite(n))return null;const x=Math.max(min,Math.min(max,n));return integer?Math.round(x):x}
function coachNodeId(v,prefix){const x=String(v||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64);return x||String(prefix||'node')+'-'+Math.random().toString(36).slice(2,10)}
async function coachCleanPlan(memberId,raw){
  raw=raw&&typeof raw==='object'?raw:{};let programs=[];try{programs=await P.db('gym_member_programs?select=id,updated_at&member_id=eq.'+memberId+'&archived=eq.false&limit=1000')||[]}catch(e){}
  const allowed=new Set(programs.map(r=>String(r.id))),linked=uuid(raw.linkedProgramId)&&allowed.has(String(raw.linkedProgramId))?String(raw.linkedProgramId):null,linkedRow=programs.find(r=>String(r.id)===linked),unit=['weeks','workout_cycles'].includes(String(raw.durationUnit))?String(raw.durationUnit):'workout_cycles',enrollment=['draft','active','not_yet'].includes(String(raw.enrollmentState))?String(raw.enrollmentState):'draft';
  const questionnaire={};['goal','routine','effort','progression','protect'].forEach(k=>{const v=coachTrainingText(raw.questionnaire&&raw.questionnaire[k],900);if(v)questionnaire[k]=v});
  const micros=(arr)=> (Array.isArray(arr)?arr:[]).slice(0,52).map((m,i)=>{m=m&&typeof m==='object'?m:{};const ids=[];(Array.isArray(m.programIds)?m.programIds:[]).forEach(id=>{id=String(id||'');if(uuid(id)&&allowed.has(id)&&!ids.includes(id))ids.push(id)});return{id:coachNodeId(m.id,'micro'),name:coachTrainingText(m.name,80)||('Workout Cycle '+(i+1)),startDate:coachTrainingDate(m.startDate),endDate:coachTrainingDate(m.endDate),cycleNumber:coachTrainingNum(m.cycleNumber,1,500,true)||i+1,programIds:ids,plannedExercises:coachTrainingText(m.plannedExercises,1200),volumeTarget:coachTrainingText(m.volumeTarget,240),intensityTarget:coachTrainingText(m.intensityTarget,240),progressionTarget:coachTrainingText(m.progressionTarget,360),focus:coachTrainingText(m.focus,300),whatChanges:coachTrainingText(m.whatChanges,600),why:coachTrainingText(m.why,700),nextRecommendation:coachTrainingText(m.nextRecommendation,700),notes:coachTrainingText(m.notes,1200)}});
  return{name:coachTrainingText(raw.name,120)||'Training Plan',goal:coachTrainingText(raw.goal,500),startDate:coachTrainingDate(raw.startDate),endDate:coachTrainingDate(raw.endDate),notes:coachTrainingText(raw.notes,2000),linkedProgramId:linked,programRevision:linkedRow&&linkedRow.updated_at||null,durationUnit:unit,enrollmentState:enrollment,currentCycleIndex:coachTrainingNum(raw.currentCycleIndex,0,999,true)||0,questionnaire,generatedAt:coachTrainingText(raw.generatedAt,80)||null,generatorVersion:coachTrainingText(raw.generatorVersion,40)||'r49-guided-1',mesocycles:(Array.isArray(raw.mesocycles)?raw.mesocycles:[]).slice(0,20).map((m,i)=>{m=m&&typeof m==='object'?m:{};const mu=['weeks','workout_cycles'].includes(String(m.durationUnit))?String(m.durationUnit):unit;return{id:coachNodeId(m.id,'meso'),name:coachTrainingText(m.name,100)||('Chapter '+(i+1)),goal:coachTrainingText(m.goal,300),startDate:coachTrainingDate(m.startDate),endDate:coachTrainingDate(m.endDate),durationWeeks:coachTrainingNum(m.durationWeeks,1,104,true),durationUnit:mu,durationCount:coachTrainingNum(m.durationCount,1,104,true)||coachTrainingNum(m.durationWeeks,1,104,true)||1,frequency:coachTrainingNum(m.frequency,1,14,true),volumeTarget:coachTrainingText(m.volumeTarget,240),intensityTarget:coachTrainingText(m.intensityTarget,240),progressionStrategy:coachTrainingText(m.progressionStrategy,600),deload:coachTrainingText(m.deload,420),focus:coachTrainingText(m.focus,300),microcycles:micros(m.microcycles),notes:coachTrainingText(m.notes,1200)}})};
}
function coachPlanPublic(row){if(!row)return null;const body=row.body&&typeof row.body==='object'?row.body:{};return Object.assign({},body,{id:row.id,name:body.name||row.name||'Training Plan',goal:body.goal||row.goal||'',startDate:body.startDate||row.start_date||null,endDate:body.endDate||row.end_date||null,notes:body.notes||row.notes||'',version:Number(row.version)||1,updatedAt:row.updated_at||null,updatedBy:row.updated_by||'coach'})}
async function coachManagedMember(memberId){if(!uuid(memberId))return false;const rows=await P.db('payment_vip_members?select=id&id=eq.'+encodeURIComponent(memberId)+'&active=eq.true&limit=1');return !!(rows&&rows[0])}

async function coachTrainingFoundation(memberId){const parts=await Promise.all([P.db('member_body_profile?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&limit=1'),P.db('member_body_measurements?select=id,measured_on,weight_lb,waist_in,body_fat_pct,source,updated_at&member_id=eq.'+encodeURIComponent(memberId)+'&order=measured_on.asc&limit=1000'),P.db('member_health_daily?select=day,metrics,source,synced_at&member_id=eq.'+encodeURIComponent(memberId)+'&order=day.desc&limit=365'),P.db('member_activity_segments?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&order=started_at.desc&limit=500')]);return{profile:parts[0]&&parts[0][0]||null,measurements:parts[1]||[],healthDays:parts[2]||[],activitySegments:parts[3]||[]}}
async function coachSaveBodyProfile(memberId,b){const raw=b.profile&&typeof b.profile==='object'?b.profile:{},payload={member_id:memberId,age_years:coachTrainingNum(raw.ageYears,1,120,true),height_in:coachTrainingNum(raw.heightIn,1,120,false),goal_weight_lb:coachTrainingNum(raw.goalWeightLb,1,1500,false),body_fat_formula_sex:['male','female'].includes(String(raw.bodyFatFormulaSex))?String(raw.bodyFatFormulaSex):null,use_estimated_body_fat_for_ffmi:!!raw.useEstimatedBodyFatForFfmi,goal_body_fat_pct:coachTrainingNum(raw.goalBodyFatPct,1,69,false),goal_ffmi:coachTrainingNum(raw.goalFfmi,10,40,false),tdee_formula_sex:['male','female'].includes(String(raw.tdeeFormulaSex))?String(raw.tdeeFormulaSex):null,activity_factor:coachTrainingNum(raw.activityFactor,1,2.6,false),deficit_delta_kcal:coachTrainingNum(raw.deficitDeltaKcal,0,2000,true)??500,surplus_delta_kcal:coachTrainingNum(raw.surplusDeltaKcal,0,2000,true)??250,protein_g_per_lb:coachTrainingNum(raw.proteinGPerLb,0,3,false)??.8,fat_g_per_lb:coachTrainingNum(raw.fatGPerLb,0,2,false)??.3,macro_scenario:['maintenance','deficit','surplus'].includes(String(raw.macroScenario))?String(raw.macroScenario):'maintenance',updated_at:new Date().toISOString()};const rows=await P.db('member_body_profile?on_conflict=member_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});return rows&&rows[0]||payload}
async function coachSaveBodyMeasurement(memberId,b){const day=coachTrainingDate(b.measuredOn),weight=coachTrainingNum(b.weightLb,1,1500,false),waist=coachTrainingNum(b.waistIn,1,120,false),bodyFat=coachTrainingNum(b.bodyFatPct,.1,69.9,false);if(!day||weight==null&&waist==null&&bodyFat==null)return{status:400,error:'Enter a date and at least weight, waist or body-fat percentage.'};const payload={member_id:memberId,measured_on:day,weight_lb:weight,waist_in:waist,body_fat_pct:bodyFat,source:'manual',updated_at:new Date().toISOString()};const rows=await P.db('member_body_measurements?on_conflict=member_id,measured_on,source',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});return{status:200,measurement:rows&&rows[0]||payload}}
function coachActivityTitle(row){if(!row)return'ACTIVITY';if(row.activity_type==='misc')return coachTrainingText(row.activity_label,80)||'MISC. ACTIVITY';return String(row.activity_type||'activity').toUpperCase()}
function coachActivityCalendarMetadata(row){const paused=Math.max(0,Number(row.paused_ms)||0),duration=Math.max(0,(+new Date(row.ended_at)-(+new Date(row.started_at))-paused)/60000),src=row.source_summary&&row.source_summary.metricSource;return{activityType:row.activity_type,activityLabel:row.activity_label||null,durationMinutes:Math.round(duration*10)/10,calories:row.active_energy_kcal==null?null:Number(row.active_energy_kcal),calorieSource:row.energy_source==='healthkit'?'healthkit':'estimated',steps:row.steps==null?null:Number(row.steps),stepsMeasured:row.steps!=null&&(src==='healthkit'||src==='core_motion'),distanceMi:row.distance_mi==null?null:Number(row.distance_mi),distanceMeasured:row.distance_mi!=null&&(src==='healthkit'||src==='core_motion'),sourceAwareAggregation:true,mirroredSamplesBlindlySummed:false}}
async function coachSyncActivityCalendar(memberId,row){if(!row||!uuid(row.id)||!row.ended_at||row.state!=='closed')return null;const existing=await P.db('member_calendar_events?select=id&member_id=eq.'+encodeURIComponent(memberId)+'&activity_segment_id=eq.'+encodeURIComponent(row.id)+'&limit=1'),payload={member_id:memberId,kind:'activity',title:coachActivityTitle(row),notes:null,starts_at:row.started_at,ends_at:row.ended_at,all_day:false,color:'gold',status:'completed',source:'activity',created_by:'system',activity_segment_id:row.id,semantic_role:'activity',metadata:coachActivityCalendarMetadata(row),updated_at:new Date().toISOString()};if(existing&&existing[0]){const out=await P.db('member_calendar_events?id=eq.'+encodeURIComponent(existing[0].id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});return out&&out[0]||null}const out=await P.db('member_calendar_events',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});return out&&out[0]||null}
async function coachRemoveActivityCalendar(memberId,id){if(!uuid(id))return;await P.db('member_calendar_events?member_id=eq.'+encodeURIComponent(memberId)+'&activity_segment_id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{Prefer:'return=minimal'}})}
async function coachActivityEdit(memberId,b){
  const op=String(b.op||'relabel');
  if(op==='relabel'){
    const type=String(b.activityType||'');
    if(!uuid(b.id)||!['walk','run','misc','workout','unclassified'].includes(type))return{status:400,body:{ok:false,error:'Choose a valid activity segment.'}};
    const patch={activity_type:type,user_edited:true,updated_at:new Date().toISOString()};
    if(type==='misc')patch.activity_label=coachTrainingText(b.activityLabel,80)||'Misc Activity';else if(type!=='misc')patch.activity_label=null;
    const rows=await P.db('member_activity_segments?id=eq.'+encodeURIComponent(b.id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)}),row=rows&&rows[0];
    if(row)await coachSyncActivityCalendar(memberId,row);
    return{status:row?200:404,body:{ok:!!row,segment:row||null,error:row?undefined:'Activity segment not found.'}};
  }
  if(op==='merge'){
    const ids=(Array.isArray(b.ids)?b.ids:[]).map(String).filter(uuid).slice(0,20);
    if(ids.length<2)return{status:400,body:{ok:false,error:'Choose at least two segments to merge.'}};
    const rows=await P.db('member_activity_segments?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&id=in.('+ids.map(encodeURIComponent).join(',')+')&state=eq.closed&order=started_at.asc');
    if(!rows||rows.length!==ids.length)return{status:404,body:{ok:false,error:'One of those closed activity segments is no longer available.'}};
    const first=rows[0],last=rows[rows.length-1],overlap=rows.some((r,i)=>i&&new Date(r.started_at)<new Date(rows[i-1].ended_at)),sum=k=>rows.reduce((n,r)=>n+(Number(r[k])||0),0),max=k=>Math.max.apply(null,rows.map(r=>Number(r[k])||0)),sameType=rows.every(r=>r.activity_type===first.activity_type),payload={started_at:first.started_at,ended_at:last.ended_at,activity_type:sameType?first.activity_type:'unclassified',activity_label:sameType&&first.activity_type==='misc'?first.activity_label:null,state:'closed',steps:overlap?max('steps'):sum('steps'),distance_mi:overlap?max('distance_mi'):sum('distance_mi'),active_energy_kcal:overlap?max('active_energy_kcal'):sum('active_energy_kcal'),energy_source:rows.every(r=>r.energy_source===first.energy_source)?first.energy_source:null,source_summary:{mergedFrom:ids,overlapProtected:overlap,sourceAwareAggregation:true,mirroredSamplesBlindlySummed:false},confidence:'unknown',user_edited:true,updated_at:new Date().toISOString()};
    const updated=await P.db('member_activity_segments?id=eq.'+encodeURIComponent(first.id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)}),kept=updated&&updated[0];
    await P.db('member_activity_segments?member_id=eq.'+encodeURIComponent(memberId)+'&id=in.('+ids.slice(1).map(encodeURIComponent).join(',')+')',{method:'DELETE',headers:{Prefer:'return=minimal'}});
    for(const id of ids.slice(1))await coachRemoveActivityCalendar(memberId,id);
    if(kept)await coachSyncActivityCalendar(memberId,kept);
    return{status:200,body:{ok:true,segment:kept||null}};
  }
  if(op==='split'){
    if(!uuid(b.id))return{status:400,body:{ok:false,error:'Choose an activity segment to split.'}};
    const rows=await P.db('member_activity_segments?select=*&member_id=eq.'+encodeURIComponent(memberId)+'&id=eq.'+encodeURIComponent(b.id)+'&state=eq.closed&limit=1'),r=rows&&rows[0];
    if(!r)return{status:404,body:{ok:false,error:'Closed activity segment not found.'}};
    const a=+new Date(r.started_at),z=+new Date(r.ended_at),cut=+new Date(String(b.splitAt||''));if(!Number.isFinite(cut)||cut<=a||cut>=z)return{status:400,body:{ok:false,error:'Choose a split time inside the activity.'}};
    const ratio=(cut-a)/(z-a),part=(v,f)=>v==null?null:f(Number(v)*ratio),rest=(v,f)=>v==null?null:f(Number(v)*(1-ratio)),roundInt=n=>Math.round(n),round3=n=>Math.round(n*1000)/1000,round2=n=>Math.round(n*100)/100,common={activity_type:r.activity_type,activity_label:r.activity_label||null,state:'closed',energy_source:r.energy_source,confidence:r.confidence,user_edited:true,source_summary:{splitFrom:r.id,sourceAwareAggregation:true,mirroredSamplesBlindlySummed:false},updated_at:new Date().toISOString()},left=Object.assign({},common,{ended_at:new Date(cut).toISOString(),steps:part(r.steps,roundInt),distance_mi:part(r.distance_mi,round3),active_energy_kcal:part(r.active_energy_kcal,round2)}),right=Object.assign({member_id:memberId,started_at:new Date(cut).toISOString(),ended_at:r.ended_at},common,{steps:rest(r.steps,roundInt),distance_mi:rest(r.distance_mi,round3),active_energy_kcal:rest(r.active_energy_kcal,round2)});
    const updated=await P.db('member_activity_segments?id=eq.'+encodeURIComponent(r.id)+'&member_id=eq.'+encodeURIComponent(memberId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(left)}),inserted=await P.db('member_activity_segments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(right)}),parts=[updated&&updated[0],inserted&&inserted[0]].filter(Boolean);
    for(const row of parts)await coachSyncActivityCalendar(memberId,row);
    return{status:200,body:{ok:true,segments:parts}};
  }
  return{status:400,body:{ok:false,error:'Unknown activity edit.'}};
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ── login card, same shape as the other private surfaces ─────────────── */
function login() {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex,nofollow,noarchive">'
    + '<meta name="theme-color" content="#0E1114"><title>Gym Tracker</title><style>'
    + "body{margin:0;background:#14171B;color:#EFEAE0;font-family:'Space Grotesk',Arial,sans-serif;"
    + 'display:grid;place-items:center;min-height:100vh;padding:24px}'
    + '.c{width:min(390px,92vw);border:1px solid rgba(211,190,152,.28);background:#1B2026;'
    + 'border-radius:18px;padding:32px;text-align:center}'
    + 'p.e{letter-spacing:.28em;text-transform:uppercase;font-size:11px;color:#D3BE98;margin:0}'
    + 'h1{font-size:26px;margin:12px 0 10px}'
    + 'p.b{color:#9BA1A8;font-size:14px;line-height:1.6;margin:0 0 22px}'
    + 'a{display:block;min-height:52px;line-height:52px;border-radius:999px;'
    + 'border:1px solid rgba(211,190,152,.34);color:#E9C98F;text-decoration:none;'
    + 'letter-spacing:.24em;text-transform:uppercase;font-size:12px;font-weight:700}'
    + '</style><link rel="manifest" href="/manifest.webmanifest"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="FOB"><meta name="mobile-web-app-capable" content="yes"></head><body><div class="c"><p class="e">FOB Systems</p>'
    + '<h1>Gym Tracker</h1><p class="b">This is a private coaching tool. '
    + 'Sign in through FOB Payment first.</p><a href="/fob-payment">Sign in</a></div><script>if(\'serviceWorker\'in navigator){window.addEventListener(\'load\',function(){navigator.serviceWorker.register(\'/sw.js\',{updateViaCache:\'none\'}).then(function(r){return r.update();}).catch(function(){});});}</script></body></html>';
}

/* ── app shell ─────────────────────────────────────────────────────────── */
function shell() {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<meta name="robots" content="noindex,nofollow,noarchive">'
    + '<meta name="theme-color" content="#0E1114"><meta name="color-scheme" content="dark">'
    + '<title>Gym Tracker</title>'
    + '<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32.png">'
    + '<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">'
    + '<link rel="preconnect" href="https://fonts.googleapis.com">'
    + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    + '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">'
    + '<link rel="stylesheet" href="/gym-app.css?v=' + V + '&r48=1">'
    + '<link rel="stylesheet" href="/meal-gradient.css?v=' + V + '&r52=1&r54=1&r56=1"><link rel="stylesheet" href="/coach-shell.css?v=' + V + '&rc5c=1"><link rel="stylesheet" href="/mahfitt-atmosphere.css?v=' + V + '">'
    + '</head><body>'
    + '<div id="app" aria-live="polite"></div>'
    + '<script defer src="/gym-shared.js?v=' + V + '"></script><script defer src="/meal-gradient.js?v=' + V + '&r52=1&r54=1&r55=1"></script><script defer src="/coach-shell.js?v=' + V + '&rc5c=1"></script><script defer src="/gym-app.js?v=' + V + '&r48=1"></script>'
    + '</body></html>';
}

/* ══ API ═══════════════════════════════════════════════════════════════ */

/* Progression is a SUGGESTION, never applied. It reads the last completed
   session for this exercise and compares it against the prescribed rep
   target. Nothing here writes. */
function suggest(prev, target) {
  if (!prev || !prev.length) return null;
  const lo = target && target.lo, hi = target && target.hi;
  const w = prev[0].weight;
  const reps = prev.map(s => s.reps).filter(r => r != null);
  if (w == null || !reps.length) return null;
  const min = Math.min.apply(null, reps);
  if (hi != null && min >= hi) {
    const step = w >= 100 ? 5 : w >= 40 ? 5 : 2.5;
    return { text: 'Target met. +' + step + ' lb suggested', weight: w + step };
  }
  if (lo != null && min < lo) return { text: 'Below target. Hold or reduce', weight: w };
  return { text: 'Repeat weight, build reps', weight: w };
}

let catalogSeedPromise = null;
let catalogCheckedAt = 0;

/* Grow the existing exercise table without overwriting anything a coach has
   edited. A warm function checks at most once every ten minutes; cold starts
   compare all names case-insensitively, then insert only genuinely new rows.
   Archived names count as existing so a coach's removal decision is honored.
   Seeding is best-effort so a temporary database problem can never block the
   coach from opening or editing a workout. */
async function ensureExerciseCatalog() {
  if (Date.now() - catalogCheckedAt < 10 * 60 * 1000) return;
  if (catalogSeedPromise) return catalogSeedPromise;
  catalogSeedPromise = (async function () {
    try {
      const rows = await P.db('gym_exercises?select=name&limit=5000');
      const have = new Set((rows || []).map(r => String(r.name || '').trim().toLowerCase()).filter(Boolean));
      const missing = EXERCISE_CATALOG.filter(r => !have.has(String(r.name).trim().toLowerCase()));
      for (let i = 0; i < missing.length; i += 100) {
        await P.db('gym_exercises', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(missing.slice(i, i + 100))
        });
      }
      catalogCheckedAt = Date.now();
    } catch (e) {
      console.warn('Exercise catalog seed', e && (e.detail || e.message));
    }
  })();
  try { await catalogSeedPromise; } finally { catalogSeedPromise = null; }
}


/* ══ MEDIA HYDRATION ═══════════════════════════════════════════════════════
   A reference video belongs to the EXERCISE, not to a copy of it sitting
   inside somebody's program. Programs store a snapshot of each exercise taken
   when the program was built, so a clip attached afterwards never reached the
   member: their stored item still carried media:null.

   This stamps the exercise's current media onto every item on the way out, so
   a video attached today appears in every program that already contains that
   movement, for every member, immediately. One query for the whole payload.
   ═══════════════════════════════════════════════════════════════════════ */
async function hydrateMedia(P, programs) {
  const ids = {};
  const walk = function (items) {
    (items || []).forEach(function (it) { if (it && it.exerciseId) ids[it.exerciseId] = 1; });
  };
  (programs || []).forEach(function (p) {
    const days = (p && p.days) || (p && p.body && p.body.days) || [];
    days.forEach(function (d) { walk(d && d.items); });
  });
  const list = Object.keys(ids);
  if (!list.length) return programs;
  let rows = [];
  try {
    rows = await P.db('gym_exercises?select=id,media_url,media_poster,media_start,media_end&id=in.('
      + list.map(encodeURIComponent).join(',') + ')&limit=1000') || [];
  } catch (e) { return programs; }        /* never block a workout on media */
  const byId = {};
  rows.forEach(function (r) { byId[r.id] = r; });
  (programs || []).forEach(function (p) {
    const days = (p && p.days) || (p && p.body && p.body.days) || [];
    days.forEach(function (d) {
      (d && d.items || []).forEach(function (it) {
        const m = it && it.exerciseId && byId[it.exerciseId];
        if (!m) return;
        it.media = m.media_url || null;
        it.poster = m.media_poster || null;
        it.mediaStart = m.media_start == null ? 0 : Number(m.media_start);
        it.mediaEnd = m.media_end == null ? null : Number(m.media_end);
      });
    });
  });
  return programs;
}

async function api(event) {
  let b = {};
  try { b = JSON.parse(event.body || '{}'); } catch (e) {}
  const action = String(b.action || '');

  /* ---- boot: clients, their open session, templates ---- */
  if (action === 'boot') {
    const [clients, templates] = await Promise.all([
      P.db('payment_vip_members?select=id,first_name,last_name&active=eq.true'
        + '&order=first_name.asc,last_name.asc&limit=2000'),
      P.db('gym_templates?select=id,name,updated_at&order=updated_at.desc&limit=1000')
    ]);
    return out(200, {
      ok:true,
      clients:(clients||[]).map(m=>({id:m.id,name:((m.first_name||'')+' '+(m.last_name||'')).trim()})).filter(c=>c.name),
      templates:templates||[]
    });
  }

  /* ---- exercise library. Filtered and paged server side so the table can
         grow to thousands without the browser ever holding all of it. ---- */
  if (action === 'search') {
    await ensureExerciseCatalog();
    const q = String(b.q || '').trim();
    const bits = ['archived=eq.false'];
    if (q) bits.push('name=ilike.*' + encodeURIComponent(q.replace(/[%,()]/g, '')) + '*');
    ['category', 'region', 'equipment'].forEach(k => {
      if (b[k]) bits.push(k + '=eq.' + encodeURIComponent(String(b[k])));
    });
    if (b.unilateral === true) bits.push('unilateral=is.true');
    if (b.compound === true) bits.push('compound=is.true');
    if (b.custom === true) bits.push('is_custom=is.true');
    const rows = await P.db('gym_exercises?select=id,name,category,region,muscles,equipment,'
      + 'unilateral,compound,vars,instructions,media_url,is_custom&' + bits.join('&')
      + '&order=name.asc&limit=' + Math.min(200, parseInt(b.limit, 10) || 100)
      + '&offset=' + Math.max(0, parseInt(b.offset, 10) || 0));
    const pageSize = Math.min(200, parseInt(b.limit, 10) || 100);
    return out(200, { ok: true, exercises: rows || [], hasMore: (rows || []).length === pageSize });
  }

  /* Resolve a whole preset in one request. The old preset builder performed
     dozens of sequential exercise searches; on mobile that could leave the UI
     parked on "Resolving exercises" if one request stalled. This bulk lookup
     is intentionally tolerant: the client can preserve an unmatched exercise
     name as a name-keyed item and history will still remain valid. */
  if (action === 'resolveExercises') {
    const names = Array.isArray(b.names) ? b.names.map(x => String(x || '').trim()).filter(Boolean).slice(0, 150) : [];
    if (!names.length) return out(200, { ok: true, exercises: [] });
    const rows = await P.db('gym_exercises?select=id,name,category,region,muscles,equipment,unilateral,compound,vars,media_url,is_custom'
      + '&archived=eq.false&order=name.asc&limit=2000');
    const wanted = new Set(names.map(n => n.toLowerCase()));
    return out(200, { ok: true, exercises: (rows || []).filter(r => wanted.has(String(r.name || '').toLowerCase())) });
  }

  /* Attach or clear a reference video on the exercise itself, so it carries to
     every client and every future session rather than living on one card. */
  if (action === 'setMedia') {
    if (!uuid(b.id)) return out(400, { error: 'Bad exercise.' });
    const url = b.media_url == null ? null : String(b.media_url).trim();
    if (url && !/^https?:\/\//i.test(url)) return out(400, { error: 'Video link must start with http.' });
    await P.db('gym_exercises?id=eq.' + b.id, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ media_url: url || null,
        media_poster: b.media_poster == null ? null : String(b.media_poster).trim() || null,
        media_start: b.media_start == null ? null : Number(b.media_start),
        media_end: b.media_end == null ? null : Number(b.media_end) })
    });
    return out(200, { ok: true, media_url: url || null,
      media_poster: b.media_poster || null,
      media_start: b.media_start == null ? null : Number(b.media_start),
      media_end: b.media_end == null ? null : Number(b.media_end) });
  }

  if (action === 'mediaUploadTicket') {
    if (!uuid(b.id)) return out(400,{error:'Bad exercise.'});
    const name=String(b.fileName||'reference.mp4').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-90);
    const ext=(name.match(/\.[a-zA-Z0-9]{2,5}$/)||['.mp4'])[0].toLowerCase();
    const allowed=['.mp4','.mov','.webm','.m4v'];
    const safeExt=allowed.indexOf(ext)>=0?ext:'.mp4';
    const path='exercise/'+b.id+'/'+Date.now()+safeExt;
    const t=await MC.signedUpload('gym-exercise-media',path,false);
    return out(200,{ok:true,signedUrl:t.signedUrl,path:path,publicUrl:MC.SUPABASE_URL+'/storage/v1/object/public/gym-exercise-media/'+path});
  }

  if (action === 'avatarUploadTicket') {
    if (!uuid(b.memberId)) return out(400,{error:'Bad client.'});
    const rows=await P.db('payment_vip_members?select=id,first_name,last_name,active,sesh_left&id=eq.'+b.memberId+'&active=eq.true&limit=1');
    const member=rows&&rows[0]; if(!member)return out(404,{error:'Member not found.'});
    const t=await MC.avatarUploadTicket(member);
    return out(200,{ok:true,signedUrl:t.signedUrl,path:t.path,publicUrl:t.publicUrl});
  }

  if (action === 'saveAvatar') {
    if (!uuid(b.memberId)||!b.path) return out(400,{error:'Bad avatar update.'});
    const rows=await P.db('payment_vip_members?select=id,first_name,last_name,active,sesh_left&id=eq.'+b.memberId+'&active=eq.true&limit=1');
    const member=rows&&rows[0]; if(!member)return out(404,{error:'Member not found.'});
    const saved=await MC.saveAvatar(member,String(b.path));
    return out(200,{ok:true,url:saved.url,path:String(b.path)});
  }

  if (action === 'createExercise') {
    const name = String(b.name || '').trim();
    if (!name) return out(400, { error: 'Name required.' });
    const rows = await P.db('gym_exercises', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        name, category: b.category || 'custom', region: b.region || null,
        muscles: Array.isArray(b.muscles) ? b.muscles : [],
        equipment: b.equipment || null,
        unilateral: !!b.unilateral, compound: !!b.compound,
        vars: (Array.isArray(b.vars) && b.vars.length) ? b.vars : ['weight', 'reps'],
        instructions: b.instructions || null, media_url: b.media_url || null,
        is_custom: true
      })
    });
    return out(200, { ok: true, exercise: rows && rows[0] });
  }


  /* Admin exercise database management. Existing completed set history is never
     destroyed. "Delete" hard-deletes only an unused exercise; any exercise with
     history is archived so it disappears from future search while old sessions
     continue resolving against their stored name/id snapshot. */
  if (action === 'updateExercise') {
    if (!uuid(b.id)) return out(400,{error:'Bad exercise.'});
    const name=String(b.name||'').trim();
    if(!name) return out(400,{error:'Name required.'});
    const vars=Array.isArray(b.vars)&&b.vars.length?b.vars.filter(v=>['weight','reps','time','distance','resistance','rpe','rir','fm'].includes(String(v))):['weight','reps'];
    const payload={name:name,category:String(b.category||'custom'),region:b.region||null,equipment:b.equipment||null,vars:vars,instructions:b.instructions||null};
    if(Array.isArray(b.muscles))payload.muscles=b.muscles.map(v=>String(v||'').trim()).filter(Boolean);
    if(b.unilateral!==undefined)payload.unilateral=!!b.unilateral;
    if(b.compound!==undefined)payload.compound=!!b.compound;
    if(b.media_url!==undefined) payload.media_url=b.media_url?String(b.media_url).trim():null;
    const rows=await P.db('gym_exercises?id=eq.'+b.id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
    return out(200,{ok:true,exercise:rows&&rows[0]});
  }

  if (action === 'deleteExercise') {
    if (!uuid(b.id)) return out(400,{error:'Bad exercise.'});
    let used=[];
    try{used=await P.db('gym_sets?select=id&exercise_id=eq.'+b.id+'&limit=1');}catch(e){}
    if(used&&used.length){
      await P.db('gym_exercises?id=eq.'+b.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({archived:true})});
      return out(200,{ok:true,mode:'archived'});
    }
    await P.db('gym_exercises?id=eq.'+b.id,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    return out(200,{ok:true,mode:'deleted'});
  }

  /* R48 — coach view/edit of the same member-owned periodization rows used by /mygym. */
  if (action === 'periodization') {
    if (!uuid(b.memberId)) return out(400,{ok:false,error:'Bad client.'});
    if(!(await coachManagedMember(b.memberId)))return out(403,{ok:false,error:'That member is not available to this coach console.'});
    try {
      const rows=await P.db('member_periodization_plans?select=id,name,goal,start_date,end_date,notes,body,version,updated_by,updated_at&member_id=eq.'+b.memberId+'&archived=eq.false&order=updated_at.desc&limit=20');
      return out(200,{ok:true,plans:(rows||[]).map(coachPlanPublic)});
    } catch (e) {
      if(/member_periodization_plans|schema cache|does not exist/i.test(String(e&&e.detail||e&&e.message||''))) return out(503,{ok:false,error:'Training planning needs database migration 048.'});
      throw e;
    }
  }

  /* ══ R51 — COACH READ-ONLY ENFORCEMENT (BODY-009 / PER-009 / COACH-004) ══
     The Final Product Contract makes member Body Metrics and member
     Periodization VIEW ONLY for a coach. Removing the coach-side buttons is
     presentation, not security: a determined coach could still POST these
     actions directly. They are therefore denied HERE, at the write boundary,
     before any database call is reached. Member-owned writes are untouched —
     this file is the COACH console API, so the member's own save path through
     the member API is unaffected. COACH-004 still permits Program edits, so
     no Program action is denied. */
  if (action === 'savePeriodization' || action === 'saveBodyProfile' || action === 'saveBodyMeasurement') {
    return out(403, { ok:false, code:'COACH_READ_ONLY',
      error: action === 'savePeriodization'
        ? 'Periodization is view only. Only the member can change their plan.'
        : 'Body Metrics are view only. Only the member can change their body numbers.' });
  }

  if (action === 'savePeriodization') {
    if (!uuid(b.memberId)) return out(400,{ok:false,error:'Bad client.'});
    if(!(await coachManagedMember(b.memberId)))return out(403,{ok:false,error:'That member is not available to this coach console.'});
    const plan=await coachCleanPlan(b.memberId,b.plan),payload={member_id:b.memberId,name:plan.name,goal:plan.goal||null,start_date:plan.startDate,end_date:plan.endDate,notes:plan.notes||null,body:plan,updated_by:'coach',updated_at:new Date().toISOString()};
    try {
      let rows;
      if(uuid(b.id)){
        const version=Math.max(1,parseInt(b.version,10)||1);payload.version=version+1;
        rows=await P.db('member_periodization_plans?id=eq.'+b.id+'&member_id=eq.'+b.memberId+'&version=eq.'+version,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
        if(!rows||!rows[0])return out(409,{ok:false,code:'PLAN_CONFLICT',error:'This member plan changed elsewhere. Reload before saving again.'});
      } else {
        payload.version=1;rows=await P.db('member_periodization_plans',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
      }
      return out(200,{ok:true,plan:coachPlanPublic(rows&&rows[0])});
    } catch (e) {
      if(/member_periodization_plans|schema cache|does not exist/i.test(String(e&&e.detail||e&&e.message||''))) return out(503,{ok:false,error:'Training planning needs database migration 048.'});
      throw e;
    }
  }


  /* R48 — coach-side correlation for the same member-owned body/activity rows. */
  if (action === 'trainingFoundation') {
    if (!uuid(b.memberId)) return out(400,{ok:false,error:'Bad client.'});
    if(!(await coachManagedMember(b.memberId)))return out(403,{ok:false,error:'That member is not available to this coach console.'});
    try{return out(200,Object.assign({ok:true},await coachTrainingFoundation(b.memberId)))}
    catch(e){if(/member_body_profile|member_body_measurements|member_activity_segments|schema cache|does not exist/i.test(String(e&&e.detail||e&&e.message||'')))return out(503,{ok:false,error:'Training foundation needs database migration 048.'});throw e}
  }
  if (action === 'saveBodyProfile') {
    if (!uuid(b.memberId)) return out(400,{ok:false,error:'Bad client.'});
    if(!(await coachManagedMember(b.memberId)))return out(403,{ok:false,error:'That member is not available to this coach console.'});
    try{return out(200,{ok:true,profile:await coachSaveBodyProfile(b.memberId,b)})}
    catch(e){if(/member_body_profile|schema cache|does not exist/i.test(String(e&&e.detail||e&&e.message||'')))return out(503,{ok:false,error:'Body Progress needs database migration 048.'});throw e}
  }
  if (action === 'saveBodyMeasurement') {
    if (!uuid(b.memberId)) return out(400,{ok:false,error:'Bad client.'});
    if(!(await coachManagedMember(b.memberId)))return out(403,{ok:false,error:'That member is not available to this coach console.'});
    try{const r=await coachSaveBodyMeasurement(b.memberId,b);return out(r.status,{ok:r.status===200,measurement:r.measurement||null,error:r.error})}
    catch(e){if(/member_body_measurements|schema cache|does not exist/i.test(String(e&&e.detail||e&&e.message||'')))return out(503,{ok:false,error:'Body Progress needs database migration 048.'});throw e}
  }
  if (action === 'activitySegmentEdit') {
    if (!uuid(b.memberId)) return out(400,{ok:false,error:'Bad client.'});
    if(!(await coachManagedMember(b.memberId)))return out(403,{ok:false,error:'That member is not available to this coach console.'});
    try{const r=await coachActivityEdit(b.memberId,b);return out(r.status,r.body)}
    catch(e){if(/member_activity_segments|schema cache|does not exist/i.test(String(e&&e.detail||e&&e.message||'')))return out(503,{ok:false,error:'Activity segmentation needs database migration 048.'});throw e}
  }

  /* ---- persistent member programs: one member can own many ---- */
  /* Persistent programs use gym_member_programs when that migration is present.
     v248 also keeps a compatibility store in gym_sessions (status=program) so
     assigning a program can never strand the coach on a loading screen if an
     older deployment missed the program-table migration. There is intentionally
     no program-count cap here. */
  if (action === 'programs') {
    if (!uuid(b.memberId)) return out(400, { error: 'Bad client.' });
    let rows = [];
    try {
      rows = await P.db('gym_member_programs?select=id,name,sub,body,updated_at'
        + '&member_id=eq.' + b.memberId + '&archived=eq.false&order=updated_at.desc&limit=1000');
    } catch (e) {
      console.warn('gym_member_programs unavailable; reading compatibility programs', e && e.detail);
    }
    let compat = [];
    try {
      const legacy = await P.db('gym_sessions?select=id,name,notes,body,updated_at'
        + '&member_id=eq.' + b.memberId + '&status=eq.program&order=updated_at.desc&limit=1000');
      compat = (legacy || []).map(r => ({ id:r.id, name:r.name || 'Program', sub:r.notes || null, body:r.body || {}, updated_at:r.updated_at, compat:true }));
    } catch (e) { /* compatibility store is optional */ }
    const seen = new Set((rows || []).map(r => String(r.id)));
    compat.forEach(r => { if (!seen.has(String(r.id))) rows.push(r); });
    /* Stamp each item with its exercise's CURRENT video, so a clip attached
       after a program was built shows up here as well as on /mygym. */
    await hydrateMedia(P, rows || []);
    return out(200, { ok: true, programs: rows || [] });
  }

  if (action === 'saveProgram') {
    if (!uuid(b.memberId)) return out(400, { error: 'Bad client.' });
    const name = String(b.name || '').trim();
    if (!name) return out(400, { error: 'Program name required.' });
    const body = (b.body && typeof b.body === 'object') ? b.body : {};
    const payload = { member_id:b.memberId, name, sub:b.sub || null, body, updated_at:new Date().toISOString() };

    /* Primary store. */
    try {
      let rows;
      if (uuid(b.id)) {
        rows = await P.db('gym_member_programs?id=eq.' + b.id + '&member_id=eq.' + b.memberId, {
          method:'PATCH', headers:{Prefer:'return=representation'}, body:JSON.stringify(payload)
        });
      } else {
        rows = await P.db('gym_member_programs', {
          method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify(payload)
        });
      }
      if (rows && rows[0]) return out(200, { ok:true, program:rows[0], store:'programs' });
    } catch (e) {
      console.warn('saveProgram primary store failed; using compatibility store', e && e.detail);
    }

    /* Compatibility store: gym_sessions already exists in every Gym Tracker
       deployment and has member_id + jsonb body. A program row is never mixed
       with workout history because every history query explicitly requests
       status=done/open. */
    try {
      const compatPayload = {
        member_id:b.memberId, name, notes:b.sub || null, body,
        status:'program', duration_s:0, updated_at:new Date().toISOString()
      };
      let rows;
      if (uuid(b.id)) {
        rows = await P.db('gym_sessions?id=eq.' + b.id + '&member_id=eq.' + b.memberId + '&status=eq.program', {
          method:'PATCH', headers:{Prefer:'return=representation'}, body:JSON.stringify(compatPayload)
        });
      }
      if (!rows || !rows[0]) {
        rows = await P.db('gym_sessions', {
          method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify(compatPayload)
        });
      }
      const r = rows && rows[0];
      if (!r) throw new Error('Compatibility program insert returned no row');
      return out(200, { ok:true, program:{id:r.id,name:r.name,sub:r.notes||null,body:r.body||body,updated_at:r.updated_at,compat:true}, store:'sessions' });
    } catch (e) {
      console.error('saveProgram compatibility store failed', e && e.detail || e && e.message);
      return out(500, { ok:false, error:'Program could not be saved.' });
    }
  }

  if (action === 'deleteProgram') {
    if (!uuid(b.memberId) || !uuid(b.id)) return out(400,{error:'Bad program.'});
    let removed=false;
    try{await P.db('gym_member_programs?id=eq.'+b.id+'&member_id=eq.'+b.memberId,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({archived:true,updated_at:new Date().toISOString()})});removed=true;}catch(e){}
    try{await P.db('gym_sessions?id=eq.'+b.id+'&member_id=eq.'+b.memberId+'&status=eq.program',{method:'DELETE',headers:{Prefer:'return=minimal'}});removed=true;}catch(e){}
    return out(200,{ok:true,removed});
  }

  /* All completed gym work for the member, shaped for the graph view. */
  if (action === 'progress') {
    if (!uuid(b.memberId)) return out(400, { error: 'Bad client.' });
    const [sets, sessions] = await Promise.all([
      P.db('gym_sets?select=exercise_id,exercise_name,session_date,set_no,weight,reps,time_s,distance,resistance,rpe,rir,fm_distance,fm_time_s'
        + '&member_id=eq.' + b.memberId + '&order=session_date.asc,set_no.asc&limit=5000'),
      P.db('gym_sessions?select=id,name,session_date,duration_s,ended_at,status'
        + '&member_id=eq.' + b.memberId + '&status=eq.done&order=session_date.asc&limit=1000')
    ]);
    return out(200, { ok: true, sets: sets || [], sessions: sessions || [] });
  }

  /* ---- member home: side-effect free. No open session is created here. ---- */
  if (action === 'memberHome') {
    if (!uuid(b.memberId)) return out(400, { error: 'Bad client.' });
    const [recent,members] = await Promise.all([
      P.db('gym_sessions?select=id,name,session_date,duration_s,status&member_id=eq.' + b.memberId + '&status=eq.done&order=session_date.desc&limit=12'),
      P.db('payment_vip_members?select=id,first_name,last_name,active,sesh_left&id=eq.'+b.memberId+'&active=eq.true&limit=1')
    ]);
    const member=members&&members[0];
    const av=member?await MC.avatarForMember(member):{url:null,path:null};
    return out(200, { ok: true, recent: recent || [], avatarUrl:av.url||null, avatarPath:av.path||null });
  }

  /* ---- open (or create) the working session for a client ---- */
  if (action === 'session') {
    if (!uuid(b.memberId)) return out(400, { error: 'Bad client.' });
    let rows = await P.db('gym_sessions?select=*&member_id=eq.' + b.memberId
      + '&status=eq.open&order=updated_at.desc&limit=20');
    const seedBody = Array.isArray(b.body) ? b.body : [];
    if (b.reset === true && rows && rows.length) {
      /* Explicitly starting a workout reuses the newest open row as a clean
         working container instead of letting member selection create/resume
         state. Any duplicate open rows are closed so the backend has one
         canonical live session at most. */
      const keep = rows[0];
      await P.db('gym_sessions?id=eq.' + keep.id, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          name: b.name || 'Session', body: seedBody, notes: null,
          duration_s: 0, started_at: new Date().toISOString(), ended_at: null,
          client_rev: 0, updated_at: new Date().toISOString()
        })
      });
      for (const extra of rows.slice(1)) {
        await P.db('gym_sessions?id=eq.' + extra.id, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'abandoned', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        });
      }
      rows = await P.db('gym_sessions?select=*&id=eq.' + keep.id + '&limit=1');
    } else if (!rows || !rows.length) {
      rows = await P.db('gym_sessions', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          member_id: b.memberId, name: b.name || 'Session',
          template_id: uuid(b.templateId) ? b.templateId : null,
          body: seedBody, started_at: b.reset === true ? new Date().toISOString() : null
        })
      });
    }
    const recent = await P.db('gym_sessions?select=id,name,session_date,duration_s,status'
      + '&member_id=eq.' + b.memberId + '&status=eq.done&order=session_date.desc&limit=12');
    return out(200, { ok: true, session: rows && rows[0], recent: recent || [] });
  }

  /* ---- autosave. Whole-body upsert, so 200 taps stay ONE session row. ---- */
  if (action === 'save') {
    if (!uuid(b.id)) return out(400, { error: 'Bad session.' });
    await P.db('gym_sessions?id=eq.' + b.id, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        body: Array.isArray(b.body) ? b.body : [],
        name: b.name || null, notes: b.notes || null,
        duration_s: parseInt(b.duration, 10) || 0,
        started_at: b.startedAt || null,
        client_rev: parseInt(b.rev, 10) || 0,
        updated_at: new Date().toISOString()
      })
    });
    return out(200, { ok: true, rev: parseInt(b.rev, 10) || 0 });
  }

  /* ---- finish: close the session and flatten its sets for history.
         Idempotent: the sets for a session are cleared before reinsert, so
         finishing twice can never duplicate a client's history. ---- */
  if (action === 'finish') {
    if (!uuid(b.id)) return out(400, { error: 'Bad session.' });
    const rows = await P.db('gym_sessions?select=*&id=eq.' + b.id + '&limit=1');
    const s = rows && rows[0];
    if (!s) return out(404, { error: 'Session not found.' });
    const body = Array.isArray(b.body) ? b.body : (s.body || []);

    await P.db('gym_sets?session_id=eq.' + b.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    const flat = [];
    body.forEach(it => {
      (it.sets || []).forEach((st, i) => {
        if (!st.done) return;
        flat.push({
          session_id: s.id, member_id: s.member_id,
          exercise_id: uuid(it.exerciseId) ? it.exerciseId : null,
          exercise_name: it.name || 'Exercise',
          session_date: s.session_date, set_no: i + 1,
          weight: st.weight == null ? null : st.weight,
          reps: st.reps == null ? null : st.reps,
          time_s: st.time == null ? null : st.time,
          distance: st.distance == null ? null : st.distance,
          resistance: st.resistance || null,
          rpe: st.rpe == null ? null : st.rpe,
          rir: st.rir == null ? null : st.rir,
          fm_distance: st.fm == null ? null : st.fm,
          fm_time_s: st.fmTime == null ? null : st.fmTime
        });
      });
    });
    if (flat.length) {
      await P.db('gym_sets', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(flat) });
    }
    await P.db('gym_sessions?id=eq.' + b.id, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        status: 'done', body, ended_at: new Date().toISOString(),
        duration_s: parseInt(b.duration, 10) || 0,
        notes: b.notes || null, updated_at: new Date().toISOString()
      })
    });
    return out(200, { ok: true, logged: flat.length });
  }

  /* ---- previous performance + progression suggestion for one exercise ---- */
  if (action === 'history') {
    if (!uuid(b.memberId)) return out(400, { error: 'Bad client.' });
    const idFilter = uuid(b.exerciseId)
      ? 'exercise_id=eq.' + b.exerciseId
      : 'exercise_name=eq.' + encodeURIComponent(String(b.name || ''));
    const rows = await P.db('gym_sets?select=session_date,set_no,weight,reps,time_s,distance,fm_distance,fm_time_s'
      + '&member_id=eq.' + b.memberId + '&' + idFilter
      + '&order=session_date.desc,set_no.asc&limit=60');
    const byDate = {};
    (rows || []).forEach(r => { (byDate[r.session_date] = byDate[r.session_date] || []).push(r); });
    const days = Object.keys(byDate).sort().reverse().map(d => ({ date: d, sets: byDate[d] }));
    return out(200, {
      ok: true, days: days.slice(0, 8),
      suggestion: suggest(days[0] && days[0].sets, b.target || null)
    });
  }

  /* ---- templates ---- */
  if (action === 'saveTemplate') {
    const name = String(b.name || '').trim();
    if (!name) return out(400, { error: 'Name required.' });
    const payload = { name, notes: b.notes || null, body: Array.isArray(b.body) ? b.body : [], updated_at: new Date().toISOString() };
    let rows;
    if (uuid(b.id)) {
      rows = await P.db('gym_templates?id=eq.' + b.id, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload)
      });
    } else {
      rows = await P.db('gym_templates', {
        method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload)
      });
    }
    return out(200, { ok: true, template: rows && rows[0] });
  }
  if (action === 'loadTemplate') {
    if (!uuid(b.id)) return out(400, { error: 'Bad template.' });
    const rows = await P.db('gym_templates?select=*&id=eq.' + b.id + '&limit=1');
    return out(200, { ok: true, template: rows && rows[0] });
  }
  if (action === 'deleteTemplate') {
    if (!uuid(b.id)) return out(400, { error: 'Bad template.' });
    await P.db('gym_templates?id=eq.' + b.id, { method:'DELETE', headers:{Prefer:'return=minimal'} });
    return out(200, { ok:true });
  }

  return out(400, { error: 'Unknown action.' });
}

exports.handler = async function (event) {
  if (!S.isAuthed(event)) {
    return event.httpMethod === 'POST'
      ? { statusCode: 401, headers: JSON_H, body: JSON.stringify({ ok: false, authed: false }) }
      : { statusCode: 200, headers: HTML_H, body: login() };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, headers: HTML_H, body: shell() };
  }
  try {
    return await api(event);
  } catch (e) {
    console.error('gym-tracker', e && e.message, e && e.detail);
    return out(500, { error: 'Gym Tracker is unavailable right now.' });
  }
};
