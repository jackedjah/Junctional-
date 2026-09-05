'use strict';
/* MAHFITT FITNESS AI — research retrieval boundary.
   This module intentionally returns NO invented evidence. A deployment may
   connect a real retrieval service through MAHFITT_RESEARCH_ENDPOINT. Until
   then, callers receive available:false and the model is forbidden from
   manufacturing citations. */

const TIMEOUT_MS=9000;
function cleanText(v,max){return String(v==null?'':v).replace(/[\u0000-\u001F]/g,' ').trim().slice(0,max)}
function endpoint(){const v=String(process.env.MAHFITT_RESEARCH_ENDPOINT||'').trim();return /^https:\/\//i.test(v)?v:''}
function token(){return cleanText(process.env.MAHFITT_RESEARCH_TOKEN||'',500)}
function cleanSource(x){
  if(!x||typeof x!=='object')return null;
  const title=cleanText(x.title,240),url=cleanText(x.url,600),publisher=cleanText(x.publisher||x.journal||x.organization,180),year=Number(x.year)||null,type=cleanText(x.type||x.evidenceType,80),summary=cleanText(x.summary||x.abstract,1200);
  if(!title||!/^https:\/\//i.test(url))return null;
  return{title,url,publisher,year:Number.isInteger(year)&&year>1900&&year<2200?year:null,type,summary};
}
async function retrieve(input){
  input=input||{};const url=endpoint(),query=cleanText(input.query,1200);
  if(!query)return{available:false,sources:[],reason:'empty-query'};
  if(!url)return{available:false,sources:[],reason:'research-service-not-configured'};
  const controller=typeof AbortController==='function'?new AbortController():null,timer=setTimeout(()=>{try{controller&&controller.abort()}catch(e){}},TIMEOUT_MS);
  try{
    const headers={'Content-Type':'application/json'},auth=token();if(auth)headers.Authorization='Bearer '+auth;
    const response=await fetch(url,{method:'POST',headers,signal:controller?controller.signal:undefined,body:JSON.stringify({query,domain:'fitness-sports-performance',maxResults:8,preferredEvidence:['systematic-review','meta-analysis','consensus-statement','position-statement','peer-reviewed-study']})});
    if(!response.ok)return{available:false,sources:[],reason:'research-service-http-'+response.status};
    const payload=await response.json().catch(()=>({})),sources=(Array.isArray(payload.sources)?payload.sources:[]).map(cleanSource).filter(Boolean).slice(0,8);
    return{available:true,sources,reason:sources.length?'ok':'no-sources-returned'};
  }catch(error){return{available:false,sources:[],reason:error&&error.name==='AbortError'?'research-service-timeout':'research-service-unavailable'}}
  finally{clearTimeout(timer)}
}
module.exports={retrieve,endpoint,cleanSource};
