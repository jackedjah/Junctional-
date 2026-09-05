'use strict';
/* MAHFITT :: AI RETROWORK
   Bounded workout-language interpreter. The model never owns database ids:
   it may only return an index into the server-supplied candidate list. The
   caller resolves that index back to canonical exercise metadata and validates
   every number before anything can be persisted. */

const PROVIDER_TIMEOUT_MS=28000,TRANSCRIBE_TIMEOUT_MS=45000;

const RETROWORK_SCHEMA={
  type:'object',additionalProperties:false,
  required:['session_title','session_date','session_duration_s','session_notes','clarification_needed','clarification_question','exercises'],
  properties:{
    session_title:{anyOf:[{type:'string',maxLength:100},{type:'null'}]},
    session_date:{anyOf:[{type:'string',maxLength:10},{type:'null'}]},
    session_duration_s:{anyOf:[{type:'integer',minimum:0,maximum:86400},{type:'null'}]},
    session_notes:{anyOf:[{type:'string',maxLength:1200},{type:'null'}]},
    clarification_needed:{type:'boolean'},
    clarification_question:{anyOf:[{type:'string',maxLength:240},{type:'null'}]},
    exercises:{type:'array',maxItems:60,items:{
      type:'object',additionalProperties:false,
      required:['reported_name','candidate_index','confidence','status','substitution_for','notes','sets'],
      properties:{
        reported_name:{type:'string',maxLength:140},
        candidate_index:{anyOf:[{type:'integer',minimum:0},{type:'null'}]},
        confidence:{type:'string',enum:['high','moderate','ambiguous']},
        status:{type:'string',enum:['performed','skipped','added','substituted']},
        substitution_for:{anyOf:[{type:'string',maxLength:140},{type:'null'}]},
        notes:{anyOf:[{type:'string',maxLength:600},{type:'null'}]},
        sets:{type:'array',maxItems:50,items:{
          type:'object',additionalProperties:false,
          required:['weight','reps','duration_s','distance','distance_unit','resistance','rpe','rir','fm_distance','fm_time_s'],
          properties:{
            weight:{anyOf:[{type:'number',minimum:0,maximum:3000},{type:'null'}]},
            reps:{anyOf:[{type:'integer',minimum:0,maximum:1000},{type:'null'}]},
            duration_s:{anyOf:[{type:'integer',minimum:0,maximum:86400},{type:'null'}]},
            distance:{anyOf:[{type:'number',minimum:0,maximum:1000000},{type:'null'}]},
            distance_unit:{anyOf:[{type:'string',enum:['mi','km','m','yd','ft','in']},{type:'null'}]},
            resistance:{anyOf:[{type:'string',maxLength:80},{type:'null'}]},
            rpe:{anyOf:[{type:'number',minimum:0,maximum:10},{type:'null'}]},
            rir:{anyOf:[{type:'number',minimum:0,maximum:20},{type:'null'}]},
            fm_distance:{anyOf:[{type:'number',minimum:0,maximum:100000},{type:'null'}]},
            fm_time_s:{anyOf:[{type:'integer',minimum:0,maximum:86400},{type:'null'}]}
          }
        }}
      }
    }}
  }
};

const RETROWORK_PROGRAM_SCHEMA={
  type:'object',additionalProperties:false,
  required:['name','sub','days'],
  properties:{
    name:{type:'string',maxLength:100},
    sub:{anyOf:[{type:'string',maxLength:140},{type:'null'}]},
    days:{type:'array',minItems:1,maxItems:14,items:{
      type:'object',additionalProperties:false,
      required:['name','exercises'],
      properties:{
        name:{type:'string',maxLength:80},
        exercises:{type:'array',maxItems:30,items:{
          type:'object',additionalProperties:false,
          required:['candidate_index','set_count'],
          properties:{
            candidate_index:{type:'integer',minimum:0},
            set_count:{type:'integer',minimum:1,maximum:12}
          }
        }}
      }
    }}
  }
};

const PROGRAM_SYSTEM=[
  'You are MAHFITT AI RETROWORK in Program Builder mode.',
  'Turn the member request into a reviewable MAHFITT program draft, not completed workout history.',
  'Exercise identity is constrained to the supplied candidate list. Use candidate_index only, never database ids.',
  'If a current program draft is supplied, preserve every unaffected day and exercise unless the member clearly asks to replace or remove it.',
  'Use only the requested or clearly implied number of days, exercises, and sets. Do not invent detailed loads or completed performance.',
  'The result is only a PROGRAM_DRAFT for the member to review in Program Editor. It must never imply the permanent program was saved.',
  'Return JSON only through the required schema.'
].join(' ');

const SYSTEM=[
  'You are MAHFITT AI RETROWORK, a bounded workout logging interpreter.',
  'Your only job is to turn a member workout description into reviewable structured workout data.',
  'Never coach, motivate, diagnose, or chat about unrelated topics.',
  'Never invent a set, repetition, load, duration, distance, date, substitution, or completed exercise that the member did not state or explicitly confirm as normal/as planned.',
  'If the member gives total workout duration, store it in session_duration_s. Set or interval durations belong in duration_s. FOB motion distance/time belongs in fm_distance/fm_time_s when clearly applicable.',
  'Unknown values must stay null.',
  'Exercise matching is constrained to the supplied candidate list. candidate_index is the zero-based candidate list index, never a database id.',
  'Use high confidence only when the intended candidate is clear; moderate when plausible but review-worthy; ambiguous when materially uncertain.',
  'If materially ambiguous, set clarification_needed=true and ask exactly one concise clarification question.',
  'Do not ask questions merely because optional performance fields are missing.',
  'If the member says everything was normal/as planned, you may copy planned values for the applicable expected exercises/sets from PROGRAM CONTEXT. Otherwise planned values are context, not completed truth.',
  'If the member says an expected exercise was skipped, mark it skipped and give it no performed sets.',
  'When the member says they performed X instead of planned Y, X is the performed record: mark X substituted, set substitution_for to Y, and never mark Y performed.',
  'Expand phrases such as "two sets of six" into two distinct set objects.',
  'Corrections modify the intended existing value/set rather than adding a duplicate unless the member explicitly says they added another set.',
  'Return JSON only through the required schema.'
].join(' ');

function readKey(name){
  const raw=process.env[name];if(typeof raw!=='string')return'';
  const v=raw.replace(/\r/g,'').trim().replace(/^["']|["']$/g,'').trim();
  if(v.length<20||/\s/.test(v))return'';return v;
}
function openAIKey(){return readKey('OPENAI_API_KEY')}
function openAIBaseUrl(){
  const configured=String(process.env.OPENAI_BASE_URL||'').trim().replace(/\/+$/,'');
  return /^https:\/\//i.test(configured)?configured:'https://api.openai.com';
}
function openAIResponsesUrl(){const base=openAIBaseUrl();return /\/v1$/i.test(base)?base+'/responses':base+'/v1/responses'}
function openAITranscriptionsUrl(){const base=openAIBaseUrl();return /\/v1$/i.test(base)?base+'/audio/transcriptions':base+'/v1/audio/transcriptions'}
function transcribeModelName(){const value=String(process.env.RETROWORK_TRANSCRIBE_MODEL||'').trim();return value&&/^[a-z0-9._-]{2,80}$/i.test(value)?value:'gpt-4o-mini-transcribe'}
function modelName(){
  const value=String(process.env.RETROWORK_MODEL||'').trim();
  if(value&&/^(?:gpt-|o[1-9](?:-|$)|chatgpt-)/i.test(value))return /^gpt-5\.6$/i.test(value)?'gpt-5.4-mini':value;
  return'gpt-5.4-mini';
}
function outputText(payload){
  if(typeof payload.output_text==='string')return payload.output_text;
  for(const item of (Array.isArray(payload.output)?payload.output:[])){
    for(const part of (item&&Array.isArray(item.content)?item.content:[])){
      if(part&&part.type==='refusal'){const e=new Error('retrowork refusal');e.code='RETROWORK_REFUSAL';throw e}
      if(part&&part.type==='output_text'&&typeof part.text==='string')return part.text;
    }
  }
  return'';
}
function withTimeout(promise,ms,onTimeout){let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{if(onTimeout)onTimeout();const e=new Error('retrowork timeout');e.code='RETROWORK_TIMEOUT';reject(e)},ms)});return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer))}
function cleanText(value,max){return String(value==null?'':value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ').trim().slice(0,max)}
function cleanCandidate(c,index){return{index,name:cleanText(c&&c.name,140),category:cleanText(c&&c.category,80),equipment:cleanText(c&&c.equipment,80),vars:Array.isArray(c&&c.vars)?c.vars.map(v=>cleanText(v,24)).filter(Boolean).slice(0,8):[]}}
function cleanProgram(program){
  if(!program||typeof program!=='object')return null;
  return{
    name:cleanText(program.name,100),
    programName:cleanText(program.programName,100),
    dayIndex:Number.isInteger(program.dayIndex)?program.dayIndex:null,
    expected:(Array.isArray(program.expected)?program.expected:[]).slice(0,50).map(it=>({
      name:cleanText(it&&it.name,140),candidate_index:Number.isInteger(it&&it.candidate_index)?it.candidate_index:null,
      sets:(Array.isArray(it&&it.sets)?it.sets:[]).slice(0,30).map(st=>({
        weight:Number.isFinite(Number(st&&st.weight))?Number(st.weight):null,
        reps:Number.isFinite(Number(st&&st.reps))?Math.round(Number(st.reps)):null,
        duration_s:Number.isFinite(Number(st&&st.duration_s))?Math.round(Number(st.duration_s)):null,
        distance:Number.isFinite(Number(st&&st.distance))?Number(st.distance):null,
        fm_distance:Number.isFinite(Number(st&&st.fm_distance))?Number(st.fm_distance):null,
        fm_time_s:Number.isFinite(Number(st&&st.fm_time_s))?Math.round(Number(st.fm_time_s)):null
      }))
    }))
  };
}
function cleanProgramBaseDraft(program,candidates){
  if(!program||typeof program!=='object')return null;
  const byId=new Map((candidates||[]).map((c,i)=>[String(c&&c.id||''),i]));
  return{
    name:cleanText(program.name,100)||'My Program',
    sub:cleanText(program.sub,140)||'',
    days:(Array.isArray(program.days)?program.days:[]).slice(0,14).map((day,di)=>({
      name:cleanText(day&&day.name,80)||('Workout '+(di+1)),
      exercises:(Array.isArray(day&&day.items)?day.items:[]).slice(0,30).map(it=>({
        name:cleanText(it&&it.name,140),
        candidate_index:byId.has(String(it&&it.exerciseId||''))?byId.get(String(it.exerciseId)):null,
        set_count:Math.max(1,Math.min(12,Array.isArray(it&&it.sets)&&it.sets.length?it.sets.length:3))
      })).filter(it=>it.candidate_index!=null)
    }))
  };
}
function validateProgram(raw,candidateCount){
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.days)){const e=new Error('retrowork program output');e.code='RETROWORK_PROGRAM_OUTPUT';throw e}
  const out={name:cleanText(raw.name,100)||'AI Program',sub:cleanText(raw.sub,140)||'',days:[]};
  raw.days.slice(0,14).forEach((day,di)=>{
    if(!day||typeof day!=='object')return;
    const exercises=[];
    (Array.isArray(day.exercises)?day.exercises:[]).slice(0,30).forEach(ex=>{
      const ci=Number.isInteger(ex&&ex.candidate_index)&&ex.candidate_index>=0&&ex.candidate_index<candidateCount?ex.candidate_index:null;
      if(ci==null)return;
      const count=Math.max(1,Math.min(12,Math.round(Number(ex.set_count)||3)));
      exercises.push({candidate_index:ci,set_count:count});
    });
    out.days.push({name:cleanText(day.name,80)||('Workout '+(di+1)),exercises});
  });
  if(!out.days.length){const e=new Error('retrowork program output');e.code='RETROWORK_PROGRAM_OUTPUT';throw e}
  return out;
}

function cleanPrevious(previous,candidates){
  if(!previous||typeof previous!=='object')return null;
  const byId=new Map((candidates||[]).map((c,i)=>[String(c&&c.id||''),i]));
  return{
    session_title:cleanText(previous.session_title,100)||null,
    session_date:/^\d{4}-\d{2}-\d{2}$/.test(String(previous.session_date||''))?String(previous.session_date):null,
    session_duration_s:Number.isFinite(Number(previous.session_duration_s))?Math.max(0,Math.min(86400,Math.round(Number(previous.session_duration_s)))):null,
    session_notes:cleanText(previous.session_notes,1200)||null,
    exercises:(Array.isArray(previous.exercises)?previous.exercises:[]).slice(0,60).map(ex=>({
      reported_name:cleanText(ex&&ex.reported_name||ex&&ex.exercise_name,140),
      candidate_index:byId.has(String(ex&&ex.exercise_id||''))?byId.get(String(ex.exercise_id)):null,
      confidence:['high','moderate','ambiguous'].includes(String(ex&&ex.confidence))?String(ex.confidence):'ambiguous',
      status:['performed','skipped','added','substituted'].includes(String(ex&&ex.status))?String(ex.status):'performed',
      substitution_for:cleanText(ex&&ex.substitution_for,140)||null,
      notes:cleanText(ex&&ex.notes,600)||null,
      sets:(Array.isArray(ex&&ex.sets)?ex.sets:[]).slice(0,50).map(st=>({
        weight:Number.isFinite(Number(st&&st.weight))?Number(st.weight):null,
        reps:Number.isFinite(Number(st&&st.reps))?Math.round(Number(st.reps)):null,
        duration_s:Number.isFinite(Number(st&&st.duration_s))?Math.round(Number(st.duration_s)):null,
        distance:Number.isFinite(Number(st&&st.distance))?Number(st.distance):null,
        distance_unit:['mi','km','m','yd','ft','in'].includes(String(st&&st.distance_unit))?String(st.distance_unit):null,
        resistance:cleanText(st&&st.resistance,80)||null,
        rpe:Number.isFinite(Number(st&&st.rpe))?Number(st.rpe):null,
        rir:Number.isFinite(Number(st&&st.rir))?Number(st.rir):null,
        fm_distance:Number.isFinite(Number(st&&st.fm_distance))?Number(st.fm_distance):null,
        fm_time_s:Number.isFinite(Number(st&&st.fm_time_s))?Math.round(Number(st.fm_time_s)):null
      }))
    }))
  };
}
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return null;const d=new Date(String(value)+'T12:00:00Z');return Number.isNaN(d.getTime())?null:String(value)}
function validate(raw,candidateCount){
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.exercises)){const e=new Error('retrowork output');e.code='RETROWORK_OUTPUT';throw e}
  const out={
    session_title:cleanText(raw.session_title,100)||null,
    session_date:validDate(raw.session_date),
    session_duration_s:Number.isFinite(Number(raw.session_duration_s))?Math.max(0,Math.min(86400,Math.round(Number(raw.session_duration_s)))):null,
    session_notes:cleanText(raw.session_notes,1200)||null,
    clarification_needed:raw.clarification_needed===true,
    clarification_question:cleanText(raw.clarification_question,240)||null,
    exercises:[]
  };
  raw.exercises.slice(0,60).forEach(ex=>{
    if(!ex||typeof ex!=='object')return;
    const ci=Number.isInteger(ex.candidate_index)&&ex.candidate_index>=0&&ex.candidate_index<candidateCount?ex.candidate_index:null;
    const confidence=['high','moderate','ambiguous'].includes(String(ex.confidence))?String(ex.confidence):'ambiguous';
    const status=['performed','skipped','added','substituted'].includes(String(ex.status))?String(ex.status):'performed';
    const row={reported_name:cleanText(ex.reported_name,140)||'Exercise',candidate_index:ci,confidence,status,substitution_for:cleanText(ex.substitution_for,140)||null,notes:cleanText(ex.notes,600)||null,sets:[]};
    (Array.isArray(ex.sets)?ex.sets:[]).slice(0,50).forEach(st=>{
      if(!st||typeof st!=='object')return;
      const num=(v,min,max)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):null};
      const integer=(v,min,max)=>{const n=num(v,min,max);return n==null?null:Math.round(n)};
      row.sets.push({
        weight:num(st.weight,0,3000),reps:integer(st.reps,0,1000),duration_s:integer(st.duration_s,0,86400),distance:num(st.distance,0,1000000),
        distance_unit:['mi','km','m','yd','ft','in'].includes(String(st.distance_unit))?String(st.distance_unit):null,
        resistance:cleanText(st.resistance,80)||null,rpe:num(st.rpe,0,10),rir:num(st.rir,0,20),fm_distance:num(st.fm_distance,0,100000),fm_time_s:integer(st.fm_time_s,0,86400)
      });
    });
    if(status==='skipped')row.sets=[];
    out.exercises.push(row);
  });
  if(!out.clarification_needed)out.clarification_question=null;
  return out;
}

async function transcribe(input){
  input=input||{};const key=openAIKey();
  if(!key){const e=new Error('AI Retrowork is not configured.');e.code='NO_PROVIDER';throw e}
  const audio=Buffer.isBuffer(input.audio)?input.audio:Buffer.from(input.audio||[]);
  if(!audio.length){const e=new Error('No voice audio was captured.');e.code='EMPTY_AUDIO';throw e}
  if(audio.length>2621440){const e=new Error('Voice clip is too large.');e.code='AUDIO_TOO_LARGE';throw e}
  let mime=String(input.mimeType||'audio/webm').toLowerCase().split(';')[0].trim();
  if(!['audio/mp4','audio/webm','audio/ogg','audio/aac','audio/wav','audio/mpeg','video/mp4'].includes(mime))mime='audio/webm';
  const ext=mime==='audio/mp4'||mime==='video/mp4'?'m4a':mime==='audio/ogg'?'ogg':mime==='audio/aac'?'aac':mime==='audio/wav'?'wav':mime==='audio/mpeg'?'mp3':'webm';
  const FormDataCtor=globalThis.FormData,BlobCtor=globalThis.Blob||require('buffer').Blob;
  if(typeof FormDataCtor!=='function'||typeof BlobCtor!=='function'){const e=new Error('Voice transcription runtime unavailable.');e.code='TRANSCRIBE_RUNTIME';throw e}
  const form=new FormDataCtor();form.append('model',transcribeModelName());form.append('language','en');form.append('response_format','json');form.append('file',new BlobCtor([audio],{type:mime}),'mahfitt-retrowork.'+ext);
  const controller=typeof AbortController==='function'?new AbortController():null;
  let response;
  try{
    response=await withTimeout(fetch(openAITranscriptionsUrl(),{method:'POST',headers:{Authorization:'Bearer '+key},signal:controller?controller.signal:undefined,body:form}),TRANSCRIBE_TIMEOUT_MS,()=>{if(controller)controller.abort()});
  }catch(error){
    if(error&&error.code==='RETROWORK_TIMEOUT')throw error;
    const e=new Error('retrowork transcription network failure');e.code='TRANSCRIBE_NETWORK';throw e;
  }
  if(!response.ok){
    const status=Number(response.status)||0;let providerCode='';
    try{const detail=await response.json();providerCode=cleanText(detail&&detail.error&&detail.error.code||detail&&detail.error&&detail.error.type||'',80)}catch(error){}
    const e=new Error('retrowork transcription '+status);e.status=status;e.providerCode=providerCode;
    if(status===401||status===403)e.code='TRANSCRIBE_AUTH';
    else if(status===413)e.code='AUDIO_TOO_LARGE';
    else if(status===429)e.code='TRANSCRIBE_RATE_LIMIT';
    else if(status===400||status===415||status===422)e.code='TRANSCRIBE_AUDIO_FORMAT';
    else if(status>=500)e.code='TRANSCRIBE_SERVICE';
    else e.code='TRANSCRIBE_REQUEST';
    throw e;
  }
  const payload=await response.json(),text=cleanText(payload&&payload.text,6000);
  if(!text){const e=new Error('No speech detected.');e.code='EMPTY_TRANSCRIPT';throw e}
  return text;
}

async function interpret(input){
  input=input||{};const key=openAIKey();
  if(!key){const e=new Error('AI Retrowork is not configured.');e.code='NO_PROVIDER';throw e}
  const transcript=cleanText(input.transcript,6000),correction=cleanText(input.correction,1600);
  if(!transcript&&!correction){const e=new Error('Describe the workout first.');e.code='EMPTY_INPUT';throw e}
  const candidates=(Array.isArray(input.candidates)?input.candidates:[]).slice(0,120).map(cleanCandidate);
  if(!candidates.length){const e=new Error('No exercise candidates are available.');e.code='NO_CANDIDATES';throw e}
  const previous=cleanPrevious(input.previous,input.candidates||[]),program=cleanProgram(input.programContext);
  const user={
    task:correction?'Apply the member correction to the previous Retrowork draft. Preserve every unaffected exercise/set exactly.':'Interpret this workout for review.',
    member_input:transcript||null,correction:correction||null,
    current_date:validDate(input.currentDate)||new Date().toISOString().slice(0,10),
    program_context:program,
    previous_draft:previous,
    exercise_candidates:candidates
  };
  const model=modelName(),requestBody={
    model,instructions:SYSTEM,
    input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(user)}]}],
    text:{format:{type:'json_schema',name:'mahfitt_retrowork',strict:true,schema:RETROWORK_SCHEMA}},
    max_output_tokens:5000
  };
  if(/^gpt-5\.(?:4|6)(?:-|$)/i.test(model))requestBody.reasoning={effort:'none'};
  const controller=typeof AbortController==='function'?new AbortController():null;
  const response=await withTimeout(fetch(openAIResponsesUrl(),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},signal:controller?controller.signal:undefined,body:JSON.stringify(requestBody)}),PROVIDER_TIMEOUT_MS,()=>{if(controller)controller.abort()});
  if(!response.ok){const e=new Error('retrowork '+response.status);e.code='RETROWORK_HTTP';e.status=response.status;throw e}
  const payload=await response.json();if(payload.status==='incomplete'){const e=new Error('retrowork incomplete');e.code='RETROWORK_INCOMPLETE';throw e}
  let raw=null;try{raw=JSON.parse(outputText(payload))}catch(error){raw=null}
  return validate(raw,candidates.length);
}

async function interpretProgram(input){
  input=input||{};const key=openAIKey();
  if(!key){const e=new Error('AI Retrowork is not configured.');e.code='NO_PROVIDER';throw e}
  const transcript=cleanText(input.transcript,6000);
  if(!transcript){const e=new Error('Describe the program first.');e.code='EMPTY_INPUT';throw e}
  const candidates=(Array.isArray(input.candidates)?input.candidates:[]).slice(0,120).map(cleanCandidate);
  if(!candidates.length){const e=new Error('No exercise candidates are available.');e.code='NO_CANDIDATES';throw e}
  const base=cleanProgramBaseDraft(input.programBase,input.candidates||[]),user={task:'Build or revise a MAHFITT program draft for review.',member_input:transcript,current_program_draft:base,exercise_candidates:candidates};
  const requestBody={model:modelName(),instructions:PROGRAM_SYSTEM,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(user)}]}],text:{format:{type:'json_schema',name:'mahfitt_retrowork_program',strict:true,schema:RETROWORK_PROGRAM_SCHEMA}},max_output_tokens:5000};
  if(/^gpt-5\.(?:4|6)(?:-|$)/i.test(requestBody.model))requestBody.reasoning={effort:'none'};
  const controller=typeof AbortController==='function'?new AbortController():null;
  const response=await withTimeout(fetch(openAIResponsesUrl(),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},signal:controller?controller.signal:undefined,body:JSON.stringify(requestBody)}),PROVIDER_TIMEOUT_MS,()=>{if(controller)controller.abort()});
  if(!response.ok){const e=new Error('retrowork program '+response.status);e.code='RETROWORK_HTTP';e.status=response.status;throw e}
  const payload=await response.json();if(payload.status==='incomplete'){const e=new Error('retrowork program incomplete');e.code='RETROWORK_INCOMPLETE';throw e}
  let raw=null;try{raw=JSON.parse(outputText(payload))}catch(error){raw=null}
  return validateProgram(raw,candidates.length);
}

module.exports={interpret,interpretProgram,transcribe,RETROWORK_SCHEMA,RETROWORK_PROGRAM_SCHEMA,validate,validateProgram,modelName,transcribeModelName,openAIBaseUrl,openAIResponsesUrl,openAITranscriptionsUrl};
