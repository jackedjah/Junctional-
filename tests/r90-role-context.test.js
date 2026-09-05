'use strict';
const assert=require('assert');
const P=require('../netlify/functions/_payment');
const Session=require('../netlify/functions/_session');
const Role=require('../netlify/functions/_mahfitt-role-context');
const JAH='11111111-1111-4111-8111-111111111111';
const DOM='22222222-2222-4222-8222-222222222222';
const JENN='33333333-3333-4333-8333-333333333333';
const jah={id:JAH,first_name:'Jah',last_name:'Matt',active:true,sesh_left:20};
const dom={id:DOM,first_name:'Dominic',last_name:'Malazarte',active:true,sesh_left:8,preferred_park:'McCarren'};
const jenn={id:JENN,first_name:'Jenn',last_name:'',active:true,sesh_left:4};
const origDb=P.db,origAuthed=Session.isAuthed;
let admin=false,rels=[],relationshipFailure=false;
P.db=async function(path){
  if(path.startsWith('mahfitt_coach_relationships?')){if(relationshipFailure)throw new Error('role relationship service unavailable');return rels;}
  if(path.startsWith('payment_vip_members?')){
    if(path.includes('id=in.(')) return [dom,jenn].filter(m=>path.includes(m.id));
    if(path.includes('id=eq.'+encodeURIComponent(DOM))) return [dom];
    if(path.includes('id=eq.'+encodeURIComponent(JENN))) return [jenn];
    if(path.includes('active=eq.true')) return [jah,dom,jenn];
  }
  throw new Error('Unexpected DB path in R90 test: '+path);
};
Session.isAuthed=()=>admin;
async function run(){
  try{
    rels=[];admin=false;
    let r=await Role.resolve({},jah,{action:'boot'});
    assert.equal(r.ok,true,'self boot must resolve');
    assert.equal(r.context.isClientContext,false);
    assert.equal(r.context.signedInAccountId,JAH);
    assert.equal(r.context.activeFitnessProfileId,JAH);
    assert.equal(r.context.musicOwnerId,JAH);
    assert.equal(r.context.themeOwnerId,JAH);
    assert.equal(r.context.clientAiBlocked,false);

    /* R90A regression: optional Coach Mode discovery may degrade, but it must
       never turn ordinary member/self boot into the generic MAH GYM 500 screen. */
    relationshipFailure=true;
    r=await Role.resolve({},jah,{action:'boot'});
    assert.equal(r.ok,true,'self boot must survive unavailable coach capability discovery');
    assert.equal(r.context.isClientContext,false);
    assert.equal(r.context.canCoach,false);
    assert.equal(r.context.coachCapabilityDegraded,true);
    r=await Role.resolve({},jah,{action:'coachProfileBoot',activeProfileId:DOM});
    assert.equal(r.ok,false,'client context must still fail closed when authorization service is unavailable');
    assert.equal(r.status,503);
    assert.equal(r.code,'COACH_CONTEXT_UNAVAILABLE');
    const degradedDirectory=await Role.directory({},jah);
    assert.equal(degradedDirectory.ok,false);
    assert.equal(degradedDirectory.status,503);
    assert.equal(degradedDirectory.code,'COACH_CONTEXT_UNAVAILABLE');
    relationshipFailure=false;

    r=await Role.resolve({},jah,{action:'coachProfileBoot',activeProfileId:DOM});
    assert.equal(r.ok,false,'arbitrary activeProfileId must not authorize');
    assert.equal(r.code,'CLIENT_CONTEXT_FORBIDDEN');

    rels=[{id:'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',coach_member_id:JAH,client_member_id:DOM,status:'active',permissions:{fitness:true,programs:true,calendar:true,logs:true,progress:true,media:true,messages:true},updated_at:new Date().toISOString()}];
    r=await Role.resolve({},jah,{action:'coachProfileBoot',activeProfileId:DOM});
    assert.equal(r.ok,true,'active coach relationship must authorize target');
    assert.equal(r.context.isClientContext,true);
    assert.equal(r.context.grant,'coach_relationship');
    assert.equal(r.context.signedInAccountId,JAH);
    assert.equal(r.context.activeFitnessProfileId,DOM);
    assert.equal(r.context.musicOwnerId,JAH,'music owner must stay signed-in coach');
    assert.equal(r.context.themeOwnerId,JAH,'theme owner must stay signed-in coach');
    assert.equal(r.context.aiOwnerId,DOM);
    assert.equal(r.context.clientAiBlocked,true);

    rels=[{id:'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',coach_member_id:JAH,client_member_id:DOM,status:'active',permissions:{fitness:true,programs:false,calendar:false,logs:false,progress:true,media:true,messages:false},updated_at:new Date().toISOString()}];
    r=await Role.resolve({},jah,{action:'coachProfileBoot',activeProfileId:DOM});
    assert.equal(r.ok,true);
    assert.equal(Role.permissionAllowed(r.context,'programs'),false,'program permission must be independently enforced');
    assert.equal(Role.permissionAllowed(r.context,'calendar'),false);
    assert.equal(Role.permissionAllowed(r.context,'progress'),true);

    rels=[];admin=true;
    r=await Role.resolve({headers:{cookie:'irrelevant'}},jah,{action:'coachProfileBoot',activeProfileId:DOM});
    assert.equal(r.ok,true,'FOB admin grant must preserve current legitimate global admin capability');
    assert.equal(r.context.grant,'fob_admin');
    assert.equal(r.context.isFobAdmin,true);
    assert.equal(Role.permissionAllowed(r.context,'programs'),true);

    admin=false;rels=[{id:'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3',coach_member_id:JAH,client_member_id:DOM,status:'active',permissions:{fitness:true},updated_at:new Date().toISOString()}];
    const d=await Role.directory({},jah);
    assert.equal(d.ok,true);
    assert.equal(d.clients.length,1);
    assert.equal(d.clients[0].id,DOM);
    assert.equal(d.clients[0].name,'Dominic Malazarte');

    console.log('r90a-role-context: 35/35 PASS');
  } finally {P.db=origDb;Session.isAuthed=origAuthed;}
}
run().catch(e=>{P.db=origDb;Session.isAuthed=origAuthed;console.error(e);process.exit(1)});
