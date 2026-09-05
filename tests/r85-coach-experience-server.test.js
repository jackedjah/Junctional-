'use strict';
const assert=require('assert');
const P=require('../netlify/functions/_payment');
const Role=require('../netlify/functions/_mahfitt-role-context');
const X=require('../netlify/functions/_mahfitt-coach-experience');
const JAH='11111111-1111-4111-8111-111111111111';
const DOM='22222222-2222-4222-8222-222222222222';
const JENN='33333333-3333-4333-8333-333333333333';
const RID='44444444-4444-4444-8444-444444444444';
const HID='55555555-5555-4555-8555-555555555555';
const jah={id:JAH,first_name:'Jah',last_name:'Matt'};
const dom={id:DOM,first_name:'Dominic',last_name:'Malazarte'};
const selfCtx={isClientContext:false,canCoach:true,isFobAdmin:false,permissions:Role.cleanPermissions({})};
const clientCtx={isClientContext:true,canCoach:true,grant:'coach_relationship',permissions:Role.cleanPermissions({habits:true,resources:true})};
const origDb=P.db,origDir=Role.directory,origResolve=Role.resolve;
let writes=[],resource={id:RID,owner_coach_member_id:JAH,title:'Protein Guide',category:'NUTRITION',resource_type:'link',url:'https://example.com/protein',body:null,archived:false,created_at:'2026-09-04T10:00:00Z',updated_at:'2026-09-04T10:00:00Z'};
let habit={id:HID,member_id:DOM,created_by_member_id:JAH,source_type:'coach',title:'10-minute walk',schedule:{kind:'daily'},active:true,created_at:'2026-09-04T10:00:00Z',updated_at:'2026-09-04T10:00:00Z'};
let n=0;function ok(v,m){assert.ok(v,m);n++}function eq(a,b,m){assert.equal(a,b,m);n++}
Role.directory=async()=>({ok:true,status:200,clients:[{id:DOM,name:'Dominic Malazarte',permissions:Role.cleanPermissions({})}]});
Role.resolve=async(_event,_account,b)=>String(b.activeProfileId)===DOM?{ok:true,activeMember:dom,context:clientCtx}:{ok:false,status:403,code:'CLIENT_CONTEXT_FORBIDDEN',error:'denied'};
P.db=async function(path,opts){
  if(opts){const payload=opts.body?JSON.parse(opts.body):null;writes.push({path,method:opts.method,payload});
    if(path==='mahfitt_resources'&&opts.method==='POST')return[Object.assign({},resource,payload)];
    if(path==='mahfitt_habits'&&opts.method==='POST')return[Object.assign({},habit,payload)];
    return [];
  }
  if(path.startsWith('member_message_notifications?'))return[{id:'n1',member_id:DOM,kind:'new_message',created_at:'2026-09-04T12:00:00Z'}];
  if(path.startsWith('member_messages?'))return[{id:'m1',member_id:DOM,sender_role:'member',message_type:'message',body:'Can we adjust tomorrow?',created_at:'2026-09-04T12:00:00Z'}];
  if(path.startsWith('member_calendar_events?'))return[{id:'c1',member_id:DOM,kind:'lift_sesh',title:'FOB Session',starts_at:'2026-09-04T18:00:00Z',ends_at:'2026-09-04T19:00:00Z',status:'scheduled'}];
  if(path.startsWith('gym_sessions?'))return[{id:'w1',member_id:DOM,name:'Upper A',ended_at:'2026-09-04T11:00:00Z',updated_at:'2026-09-04T11:00:00Z'}];
  if(path.startsWith('mahfitt_resources?')&&path.includes('id=eq.'+encodeURIComponent(RID)))return[resource];
  if(path.startsWith('mahfitt_resources?'))return[resource];
  if(path.startsWith('mahfitt_resource_assignments?'))return[];
  if(path.startsWith('mahfitt_habits?')&&path.includes('id=eq.'+encodeURIComponent(HID)))return[habit];
  if(path.startsWith('mahfitt_habits?'))return[habit];
  if(path.startsWith('mahfitt_habit_completions?'))return[];
  throw new Error('Unexpected R85 DB read: '+path);
};
(async function(){try{
  let r=await X.coachToday({},jah,selfCtx,{dayStart:'2026-09-04T00:00:00Z',dayEnd:'2026-09-05T00:00:00Z'});
  eq(r.ok,true,'Today must load for coach self');eq(r.clientCount,1);eq(r.attention.length,3,'Today must be sourced only from real message/calendar/workout data');
  ok(r.attention.some(x=>x.type==='message'&&x.clientId===DOM),'Today must surface authorized unread message');
  ok(r.attention.some(x=>x.type==='calendar'&&x.detail==='FOB Session'),'Today must surface real scheduled event');
  ok(r.attention.some(x=>x.type==='workout'&&x.detail==='Upper A'),'Today must surface real completed workout');
  ok(!JSON.stringify(r).includes(JENN),'Today must not leak a non-directory member');

  r=await X.coachInbox({},jah,selfCtx);eq(r.ok,true);eq(r.threads.length,1);eq(r.threads[0].id,DOM);eq(r.threads[0].unread,1);eq(r.threads[0].latest.body,'Can we adjust tomorrow?');

  writes=[];r=await X.run('coachResourceCreate',{event:{},accountMember:jah,activeMember:jah,roleContext:selfCtx,body:{title:'Protein Guide',category:'nutrition',type:'link',url:'https://example.com/protein'}});
  eq(r.ok,true);let w=writes.find(x=>x.path==='mahfitt_resources');ok(!!w,'resource create must write canonical resource table');eq(w.payload.owner_coach_member_id,JAH,'resource owner must be signed-in coach');eq(w.payload.category,'NUTRITION');

  writes=[];r=await X.run('coachResourceAssign',{event:{},accountMember:jah,activeMember:jah,roleContext:selfCtx,body:{resourceId:RID,clientId:DOM}});
  eq(r.ok,true);w=writes.find(x=>x.path==='mahfitt_resource_assignments');ok(!!w,'assignment must use canonical join table');eq(w.payload.client_member_id,DOM);eq(w.payload.assigned_by_member_id,JAH,'assignment actor must remain signed-in coach');

  writes=[];r=await X.run('habitCreate',{event:{},accountMember:jah,activeMember:dom,roleContext:clientCtx,body:{title:'10-minute walk',schedule:{kind:'daily'}}});
  eq(r.ok,true);w=writes.find(x=>x.path==='mahfitt_habits');ok(!!w);eq(w.payload.member_id,DOM,'habit fitness owner must be active client');eq(w.payload.created_by_member_id,JAH,'habit actor must remain coach');eq(w.payload.source_type,'coach','coach-created habit provenance must be explicit');

  writes=[];r=await X.run('habitToggle',{event:{},accountMember:jah,activeMember:dom,roleContext:clientCtx,body:{habitId:HID,day:'2026-09-04',completed:true}});
  eq(r.ok,true);w=writes.find(x=>x.path.startsWith('mahfitt_habit_completions?on_conflict='));ok(!!w);eq(w.payload.member_id,DOM);eq(w.payload.updated_by_member_id,JAH,'habit completion must record actual coach actor');eq(w.payload.completed,true);

  const deniedCtx=Object.assign({},clientCtx,{permissions:Role.cleanPermissions({habits:false,resources:false})});
  writes=[];r=await X.run('habitCreate',{event:{},accountMember:jah,activeMember:dom,roleContext:deniedCtx,body:{title:'No'}});eq(r.ok,false);eq(r.status,403);eq(writes.length,0,'denied habit permission must fail before write');
  console.log('r85-coach-experience-server: '+n+'/'+n+' PASS');
}finally{P.db=origDb;Role.directory=origDir;Role.resolve=origResolve}})().catch(e=>{P.db=origDb;Role.directory=origDir;Role.resolve=origResolve;console.error(e);process.exit(1)});
