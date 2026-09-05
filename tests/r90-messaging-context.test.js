'use strict';
const assert=require('assert');
const P=require('../netlify/functions/_payment');
const Session=require('../netlify/functions/_session');
const MG=require('../netlify/functions/mygym');
const Role=require('../netlify/functions/_mahfitt-role-context');
const JAH='11111111-1111-4111-8111-111111111111';
const DOM='22222222-2222-4222-8222-222222222222';
const THREAD='44444444-4444-4444-8444-444444444444';
const MSG='55555555-5555-4555-8555-555555555555';
const jah={id:JAH,first_name:'Jah',last_name:'Matt',active:true,sesh_left:20};
const dom={id:DOM,first_name:'Dominic',last_name:'Malazarte',active:true,sesh_left:8,gym_only:false};
const originals={db:P.db,memberWithAccess:P.memberWithAccess,isAuthed:Session.isAuthed,memberFromRequest:MG.memberFromRequest,resolve:Role.resolve,permissionAllowed:Role.permissionAllowed};
let permission=true,authorize=true,writes=[];
Session.isAuthed=()=>false;
MG.memberFromRequest=()=>({id:JAH});
P.memberWithAccess=async()=>jah;
Role.resolve=async()=>authorize?{ok:true,activeMember:dom,context:{isClientContext:true,grant:'coach_relationship',permissions:{messages:permission},signedInAccountId:JAH,activeFitnessProfileId:DOM}}:{ok:false,status:403,code:'CLIENT_CONTEXT_FORBIDDEN',error:'Not authorized'};
Role.permissionAllowed=(ctx,key)=>key==='messages'?permission:true;
P.db=async function(path,opts){
  if(path.startsWith('payment_vip_members?'))return[dom];
  if(path.startsWith('member_message_threads?select='))return[{id:THREAD,member_id:DOM,status:'open'}];
  if(path.startsWith('member_message_notifications?')&&opts&&opts.method==='PATCH')return[];
  if(path.startsWith('member_messages?select='))return[{id:MSG,sender_role:'member',message_type:'message',body:'Existing note',metadata:{},created_at:'2026-09-04T10:00:00Z'}];
  if(path==='member_messages'&&opts&&opts.method==='POST'){
    const payload=JSON.parse(opts.body);writes.push(payload);
    return[Object.assign({id:MSG,metadata:{},created_at:'2026-09-04T10:01:00Z'},payload)];
  }
  if(path==='member_message_notifications'&&opts&&opts.method==='POST')return[];
  throw new Error('Unexpected DB path in R90 messaging test: '+path);
};
async function call(action,body){
  delete require.cache[require.resolve('../netlify/functions/message-center')];
  const api=require('../netlify/functions/message-center');
  const event={httpMethod:'POST',headers:{},body:JSON.stringify(Object.assign({action,memberId:DOM,memberToken:'test'},body||{}))};
  const res=await api.handler(event);return{status:res.statusCode,data:JSON.parse(res.body||'{}')};
}
async function run(){
  try{
    authorize=false;permission=true;let r=await call('coachThread');
    assert.equal(r.status,403,'arbitrary client messaging must be denied');
    assert.equal(r.data.code,'CLIENT_CONTEXT_FORBIDDEN');

    authorize=true;permission=false;r=await call('coachThread');
    assert.equal(r.status,403,'relationship without messages permission must be denied');
    assert.equal(r.data.code,'CLIENT_OPERATION_FORBIDDEN');

    permission=true;r=await call('coachThread');
    assert.equal(r.status,200,'authorized relationship coach must open canonical client thread');
    assert.equal(r.data.ok,true);
    assert.equal(r.data.member.id,DOM);
    assert.equal(r.data.messages.length,1);
    assert.equal(r.data.messages[0].mine,false,'client-authored history must not become coach-authored');

    writes=[];r=await call('coachSend',{body:'Coach follow-up'});
    assert.equal(r.status,200,'authorized relationship coach must send');
    assert.equal(r.data.ok,true);
    assert.equal(writes.length,1);
    assert.equal(writes[0].member_id,DOM,'message must target Dominic thread');
    assert.equal(writes[0].sender_role,'coach','message sender must remain Jah/coach, never impersonated client');
    assert.equal(writes[0].body,'Coach follow-up');
    assert.equal(r.data.message.mine,true,'coach should see their own sent message as mine');

    console.log('r90-messaging-context: 13/13 PASS');
  } finally {
    P.db=originals.db;P.memberWithAccess=originals.memberWithAccess;Session.isAuthed=originals.isAuthed;MG.memberFromRequest=originals.memberFromRequest;Role.resolve=originals.resolve;Role.permissionAllowed=originals.permissionAllowed;
  }
}
run().catch(e=>{console.error(e);process.exit(1)});
