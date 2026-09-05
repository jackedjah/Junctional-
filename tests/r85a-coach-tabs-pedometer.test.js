'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const P=require('../netlify/functions/_payment');
const Session=require('../netlify/functions/_session');
const Role=require('../netlify/functions/_mahfitt-role-context');
const CoachX=require('../netlify/functions/_mahfitt-coach-experience');

const JAH='11111111-1111-4111-8111-111111111111';
const DOM='22222222-2222-4222-8222-222222222222';
const JENN='33333333-3333-4333-8333-333333333333';
const jah={id:JAH,first_name:'Jah',last_name:'Matt',active:true,sesh_left:20};
const dom={id:DOM,first_name:'Dominic',last_name:'Malazarte',active:true,sesh_left:8};
const jenn={id:JENN,first_name:'Jenn',last_name:'',active:true,sesh_left:4};
const origDb=P.db,origAuthed=Session.isAuthed;
let checks=0;
function ok(v,msg){assert.ok(v,msg);checks++}
function eq(a,b,msg){assert.strictEqual(a,b,msg);checks++}

async function main(){
  try{
    Session.isAuthed=()=>true;
    P.db=async function(q){
      if(q.startsWith('mahfitt_coach_relationships?')) throw new Error('relationship service unavailable');
      if(q.startsWith('payment_vip_members?')){
        if(q.includes('id=eq.'+encodeURIComponent(DOM))) return [dom];
        if(q.includes('id=eq.'+encodeURIComponent(JENN))) return [jenn];
        if(q.includes('active=eq.true')) return [jah,dom,jenn];
      }
      if(q.startsWith('mahfitt_resources?')) throw new Error('relation mahfitt_resources does not exist');
      throw new Error('Unexpected query '+q);
    };

    const dir=await Role.directory({headers:{}},jah);
    ok(dir.ok,'FOB Admin directory must survive relationship outage');
    eq(dir.clients.length,2,'FOB Admin directory uses existing active members');
    eq(dir.clients[0].grant,'fob_admin','directory rows retain explicit admin grant');

    const ctx=await Role.resolve({headers:{}},jah,{action:'coachProfileBoot',activeProfileId:DOM});
    ok(ctx.ok,'FOB Admin client switch must survive relationship outage');
    eq(ctx.context.activeFitnessProfileId,DOM,'client switch resolves requested fitness profile');
    eq(ctx.context.signedInAccountId,JAH,'signed-in account stays Jah');
    eq(ctx.context.grant,'fob_admin','client switch uses explicit FOB admin grant');

    const roleContext=Role.publicContext(jah,jah,'fob_admin',{});roleContext.canCoach=true;roleContext.isFobAdmin=true;
    const resources=await CoachX.run('coachResources',{event:{headers:{}},accountMember:jah,activeMember:jah,roleContext,body:{}});
    ok(resources.ok,'Resources remains a working destination without migration 053');
    eq(resources.storageAvailable,false,'fallback library never pretends saved storage exists');
    eq(resources.resources.length,3,'three shipped FOB resources are available');
    ok(resources.resources.every(r=>r.builtin&&/^\//.test(r.url)),'fallback resources are real shipped site files');

    const src=fs.readFileSync(path.join(__dirname,'..','mygym.js'),'utf8');
    const a=src.indexOf('function activityStepEstimatorNew');
    const b=src.indexOf('function activityMotionDynamicMagnitude',a);
    ok(a>0&&b>a,'cadence estimator is present in production owner');
    const sandbox={Date};vm.createContext(sandbox);
    vm.runInContext(src.slice(a,b)+'\nthis.newState=activityStepEstimatorNew;this.sample=activityStepEstimatorSample;',sandbox);
    function feed(type,events){let st=sandbox.newState(type),n=0;for(const [t,v] of events){const r=sandbox.sample(st,v,t);st=r.state;n+=r.count;}return n}
    let walk=[],t=1000;
    for(let step=0;step<20;step++){
      for(const v of [.10,.25,.55,2.40,3.00,1.30,.50,.18]){walk.push([t,v]);t+=35}
      t+=220;
    }
    const counted=feed('walk',walk);
    ok(counted>=18&&counted<=20,'20 walking-like pulses should count within tight tolerance, got '+counted);
    let noise=[],nt=1000;
    for(let i=0;i<120;i++){noise.push([nt,i%9===0?2.8:(i%7)*.06]);nt+=55}
    eq(feed('walk',noise),0,'isolated vibration spikes must not become steps');
    let shake=[],st=1000;
    for(let i=0;i<30;i++){for(const v of [.2,3.5,.2]){shake.push([st,v]);st+=35}st+=80}
    eq(feed('walk',shake),0,'rapid phone shaking must be rejected by cadence gate');
    ok(src.includes('activityBrowserCheckpointSave')&&src.includes('activityBrowserCheckpointApply'),'foreground estimates have reload/background checkpoint ownership');
    ok(src.includes('RESUME STEP SENSOR')&&src.includes("a==='activity-resume-sensor'"),'reopened walk/run exposes a user-gesture motion resume path');
    ok(src.includes("['coach-mode','TODAY'")&&src.includes("['coach-clients','CLIENTS'")&&src.includes("['coach-inbox','MESSAGES'")&&src.includes("['coach-resources','RESOURCES'")&&src.includes("['coach-admin','ADMIN'"),'all five Coach primary destinations remain routed');

    console.log('r85a-coach-tabs-pedometer: '+checks+'/'+checks+' PASS');
  } finally {P.db=origDb;Session.isAuthed=origAuthed;}
}
main().catch(e=>{P.db=origDb;Session.isAuthed=origAuthed;console.error(e);process.exit(1)});
