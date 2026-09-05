'use strict';
const fs=require('fs'),assert=require('assert');
function read(f){return fs.readFileSync(f,'utf8')}
const client=read('mygym.js'),server=read('netlify/functions/mygym.js'),role=read('netlify/functions/_mahfitt-role-context.js'),cal=read('netlify/functions/calendar-api.js'),meal=read('netlify/functions/meal-gradient.js'),messages=read('netlify/functions/message-center.js'),admin=read('admin-app.js'),sim=read('dev/mahfitt-role-simulator.js'),sw=read('sw.js');
const checks=[
  [server.includes('CLIENT_CONTEXT_AI_ACTIONS'),'client AI action denylist exists'],
  [server.includes("code:'CLIENT_AI_PROTECTED'"),'client AI server guard exists'],
  [server.includes("action==='checkInCode'" )&&server.includes('CLIENT_CHECKIN_PROTECTED'),'coach cannot mint client check-in identity'],
  [server.includes('themeForMember(accountMemberId)'),'boot theme is account-owned'],
  [server.includes('musicLibraryForMember(accountMemberId)'),'boot music is account-owned'],
  [server.includes('musicSaveState(accountMemberId,b)'),'music mutation is account-owned'],
  [server.includes('saveThemeForMember(accountMemberId,b.theme)'),'Theme mutation is account-owned'],
  [server.includes('memberToken(accountMember)'),'client boot refreshes account token, not client token'],
  [role.includes('activeProfileId is never authorization by itself'),'role owner documents active-profile authorization boundary'],
  [role.includes('permissionAllowed'),'per-domain relationship permission owner exists'],
  [client.includes("COACH_CONTEXT_KEY='fob.mahfitt.coachContext.v1'"),'client context has one session owner'],
  [client.includes("action:'coachProfileBoot'"),'client switch uses fitness-only profile boot'],
  [client.includes('resetPersonalAiRuntime()'),'client switch clears private AI runtime'],
  [client.includes("data-a=\"coach-exit\""),'persistent client context has explicit exit'],
  [client.includes('mahfittClientContextHTML'),'custom canonical pages share client context primitive'],
  [client.includes("id==='check-in'"),'client context hides self check-in action'],
  [cal.includes("permissionAllowed(roleContext,'calendar')"),'Calendar enforces calendar permission'],
  [cal.includes('CLIENT_MEMBER_ACTION_PROTECTED'),'Calendar blocks client impersonation booking/reschedule'],
  [meal.includes("who.who==='coach'&&action==='analyze'"),'Meal Scan AI blocked for coach/client actor'],
  [meal.includes("permissionAllowed(who.roleContext,'logs')"),'Meal Log honors relationship log permission'],
  [messages.includes("permissionAllowed(resolved.context,'messages')"),'Messages enforce relationship message permission'],
  [messages.includes("Object.assign({},b,{memberId:a.memberId})"),'Messages use the server-resolved client target'],
  [client.includes("view==='coach-messages'")&&client.includes("coachMessageApi('coachSend'"),'canonical MAHFITT client thread exists'],
  [client.includes('resetCoachMessages()'),'client switch clears stale message-thread runtime'],
  [admin.includes('MAHFITT COACH MODE'),'legacy admin points to canonical Coach Mode'],
  [admin.includes('/mygym?entry=coach'),'FOB admin canonical coaching entry exists'],
  [sim.includes("KEY='fob.mahfitt.roleSim.r90.v1'"),'simulator uses isolated fixture namespace'],
  [sim.includes("No API calls")||sim.includes('No real member records'),'simulator declares no production record use'],
  [sim.includes("location.hostname==='127.0.0.1'")&&!sim.includes("get('demo')==='1'"),'simulator is blocked on public hosts even with query parameters'],
  [server.includes('const V = 452;')&&sw.includes("fob-shell-v452"),'R90 cache identity advances canonical role-context assets']
];
let passed=0;for(const [ok,msg] of checks){assert.ok(ok,msg);passed++}console.log('r85a-source-guards: '+passed+'/'+checks.length+' PASS');
