'use strict';
/* MAHFITT FITNESS AI — provider + domain-policy owner.
   The provider performs semantic domain classification and answer generation
   in ONE bounded request. This is deliberately not a presentation-layer
   keyword gate. Research citations are allowed only from retrieval results
   supplied by _mahfitt-research.js. */

const TIMEOUT_MS=30000;
const RESPONSE_SCHEMA={
  type:'object',additionalProperties:false,
  required:['domain_allowed','domain_reason','answer','evidence_level','uncertainty','sources_used'],
  properties:{
    domain_allowed:{type:'boolean'},
    domain_reason:{type:'string',maxLength:300},
    answer:{type:'string',maxLength:9000},
    evidence_level:{type:'string',enum:['established','mixed','emerging','coaching-convention','hypothesis','not-applicable']},
    uncertainty:{type:'string',maxLength:800},
    sources_used:{type:'array',maxItems:8,items:{type:'integer',minimum:0,maximum:7}}
  }
};
const SYSTEM=[
  'You are MAHFITT FITNESS AI, a fitness, exercise-science and sports-performance assistant.',
  'DOMAIN POLICY: accept questions whose meaningful intent is fitness, exercise science, anatomy relevant to training, physiology, biomechanics, strength, hypertrophy, endurance, conditioning, recovery, programming, periodization, progressive overload, exercise selection, sports performance, fitness-related nutrition, energy systems, body composition, or academic sports/exercise research.',
  'Mixed-context questions are allowed when the actual goal is sports/fitness performance (for example travel logistics only insofar as they affect tournament recovery).',
  'Reject requests whose meaningful intent is unrelated general-purpose assistance such as coding, politics, travel planning, history, unrelated homework, or random general knowledge. Do not force-fit unrelated questions into fitness.',
  'Do not diagnose or prescribe medical treatment. You may provide ordinary fitness education and clearly suggest professional medical care when the question crosses into diagnosis/treatment or urgent symptoms.',
  'Use serious scientific reasoning internally, then explain in extremely simple practical language unless the member asks for technical depth.',
  'Differentiate established evidence, mixed evidence, emerging evidence, coaching convention, and hypothesis. State uncertainty when it matters.',
  'RESEARCH INTEGRITY: citations/sources may come ONLY from the supplied RESEARCH_SOURCES array. Never invent a paper, author, DOI, journal, organization, URL, or citation. If no research source is supplied, sources_used must be empty. You may still answer from general fitness knowledge, but must not pretend live retrieval occurred.',
  'Do not make consequential changes to saved MAHFITT data. This chat is advisory; specialized MAHFITT tools own writes.',
  'Return JSON only through the required schema.'
].join(' ');
function cleanText(v,max){return String(v==null?'':v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ').trim().slice(0,max)}
function readKey(){const v=String(process.env.OPENAI_API_KEY||'').replace(/\r/g,'').trim().replace(/^["']|["']$/g,'').trim();return v.length>=20&&!/\s/.test(v)?v:''}
function baseUrl(){const v=String(process.env.OPENAI_BASE_URL||'').trim().replace(/\/+$/,'');return /^https:\/\//i.test(v)?v:'https://api.openai.com'}
function responsesUrl(){const b=baseUrl();return /\/v1$/i.test(b)?b+'/responses':b+'/v1/responses'}
function modelName(){const v=String(process.env.MAHFITT_AI_MODEL||'').trim();if(v&&/^(?:gpt-|o[1-9](?:-|$)|chatgpt-)/i.test(v))return /^gpt-5\.6$/i.test(v)?'gpt-5.4-mini':v;return'gpt-5.4-mini'}
function outputText(payload){if(typeof payload.output_text==='string')return payload.output_text;for(const item of (Array.isArray(payload.output)?payload.output:[])){for(const part of (item&&Array.isArray(item.content)?item.content:[])){if(part&&part.type==='output_text'&&typeof part.text==='string')return part.text;if(part&&part.type==='refusal'){const e=new Error('fitness ai refusal');e.code='PROVIDER_REFUSAL';throw e}}}return''}
function cleanMessages(messages){return(Array.isArray(messages)?messages:[]).slice(-20).map(m=>({role:m&&m.role==='assistant'?'assistant':'user',content:cleanText(m&&m.content,5000)})).filter(m=>m.content)}
function cleanResearch(input){return(Array.isArray(input)?input:[]).slice(0,8).map((s,index)=>({index,title:cleanText(s&&s.title,240),publisher:cleanText(s&&s.publisher,180),year:Number(s&&s.year)||null,type:cleanText(s&&s.type,80),summary:cleanText(s&&s.summary,1200),url:cleanText(s&&s.url,600)})).filter(s=>s.title&&/^https:\/\//i.test(s.url))}
function validate(raw,research){if(!raw||typeof raw!=='object')throw Object.assign(new Error('Invalid Fitness AI response.'),{code:'INVALID_RESPONSE'});const allowed=raw.domain_allowed===true,used=[];for(const n of (Array.isArray(raw.sources_used)?raw.sources_used:[])){const i=Number(n);if(Number.isInteger(i)&&i>=0&&i<research.length&&!used.includes(i))used.push(i)}return{domainAllowed:allowed,domainReason:cleanText(raw.domain_reason,300),answer:cleanText(raw.answer,9000)|| (allowed?'I could not form a useful answer.':'That question is outside MAHFITT Fitness AI.'),evidenceLevel:['established','mixed','emerging','coaching-convention','hypothesis','not-applicable'].includes(String(raw.evidence_level))?String(raw.evidence_level):'not-applicable',uncertainty:cleanText(raw.uncertainty,800),sources:used.map(i=>research[i])}}
async function answer(input){
  input=input||{};const key=readKey();if(!key){const e=new Error('MAHFITT Fitness AI is not configured on the server.');e.code='NO_PROVIDER';throw e}
  const question=cleanText(input.question,5000);if(!question){const e=new Error('Ask a fitness question first.');e.code='EMPTY_INPUT';throw e}
  const research=cleanResearch(input.researchSources),context=input.context&&typeof input.context==='object'?input.context:{},history=cleanMessages(input.messages);
  const user={question,conversation:history,member_context:context,research_available:research.length>0,research_sources:research};
  const requestBody={model:modelName(),instructions:SYSTEM,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(user)}]}],text:{format:{type:'json_schema',name:'mahfitt_fitness_ai',strict:true,schema:RESPONSE_SCHEMA}},max_output_tokens:7000};
  if(/^gpt-5\.(?:4|6)(?:-|$)/i.test(requestBody.model))requestBody.reasoning={effort:'medium'};
  const controller=typeof AbortController==='function'?new AbortController():null,timer=setTimeout(()=>{try{controller&&controller.abort()}catch(e){}},TIMEOUT_MS);
  let response;try{response=await fetch(responsesUrl(),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},signal:controller?controller.signal:undefined,body:JSON.stringify(requestBody)})}catch(error){const e=new Error(error&&error.name==='AbortError'?'Fitness AI timed out.':'Fitness AI could not reach its provider.');e.code=error&&error.name==='AbortError'?'AI_TIMEOUT':'AI_NETWORK';throw e}finally{clearTimeout(timer)}
  if(!response.ok){const e=new Error('Fitness AI provider returned '+response.status+'.');e.code='AI_HTTP';e.status=response.status;throw e}
  const payload=await response.json();if(payload.status==='incomplete'){const e=new Error('Fitness AI response was incomplete.');e.code='AI_INCOMPLETE';throw e}
  let raw;try{raw=JSON.parse(outputText(payload))}catch(error){raw=null}return validate(raw,research)
}
module.exports={answer,RESPONSE_SCHEMA,modelName,responsesUrl,validate,SYSTEM};
