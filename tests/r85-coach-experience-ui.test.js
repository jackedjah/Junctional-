'use strict';
const fs=require('fs'),assert=require('assert');
function read(f){return fs.readFileSync(f,'utf8')}
const client=read('mygym.js'),css=read('mygym.css'),admin=read('admin-app.js'),adminCss=read('admin-app.css'),netlify=read('netlify.toml');
function sliceFn(name,next){const a=client.indexOf('function '+name+'(');assert(a>=0,'missing '+name);const b=next?client.indexOf('function '+next+'(',a+1):-1;return client.slice(a,b>0?b:Math.min(client.length,a+12000))}
const coachHome=sliceFn('coachModePage','coachDirectoryRowsHTML');
const clients=sliceFn('coachClientsPage','coachInboxRowsHTML');
const inbox=sliceFn('coachInboxPage','coachResourcesRowsByCategory');
const habits=sliceFn('mahHabitsPage','coachExerciseDatabasePage');
const homePrimary=client.slice(client.indexOf("var HOME_PRIMARY_DEFAULT="),client.indexOf('function homePrimaryOrder',client.indexOf("var HOME_PRIMARY_DEFAULT=")));
const r85Css=css.slice(css.indexOf('R85 — COACH EXPERIENCE HUMANIZATION'));
const programToolsAt=client.indexOf('programlib-coach-tools');
const programLibAt=client.indexOf('function programLibraryPage');
const checks=[
 [coachHome.includes('TODAY')&&coachHome.includes('coachGreeting()'),'Coach Home opens with greeting + Today'],
 [coachHome.includes('coach-clients')&&coachHome.includes('coach-inbox')&&coachHome.includes('coach-resources'),'Coach Home surfaces Clients, Messages, Resources'],
 [!coachHome.includes('PERIODIZATION')&&!coachHome.includes('ROUTINE CREATOR')&&!coachHome.includes('EXERCISE DATABASE')&&!coachHome.includes('BODY / ACTIVITY'),'Coach Home does not front-load advanced programming machinery'],
 [client.includes("['coach-mode','TODAY'")&&client.includes("['coach-clients','CLIENTS'")&&client.includes("['coach-inbox','MESSAGES'")&&client.includes("['coach-resources','RESOURCES'"),'Primary Coach IA is Today / Clients / Messages / Resources'],
 [client.includes("items.push(['coach-admin','ADMIN'")&&client.includes('isFobAdmin'),'Admin nav is FOB-admin conditional'],
 [clients.includes('SEARCH CLIENTS')&&clients.includes('type="search"')&&clients.includes('coach-search-clear'),'Client Directory has canonical searchable/clearable interaction'],
 [client.includes('RECENT')&&client.includes('coachRememberClient'),'Client Directory supports recent-client convenience'],
 [client.includes('COACH_SWITCH_BUSY')&&client.includes('if(COACH_SWITCH_BUSY||!S.account||!S.account.id)return'),'Client switching has rapid-tap guard'],
 [client.includes("action:'coachProfileBoot'")&&client.includes('coachSwitchProfile'),'Client switching still uses authorized canonical profile boot'],
 [client.includes("coachExitClient('coach-clients')")&&client.includes("data-a=\"coach-back-to-clients\""),'Protected client flows can safely exit back to Clients'],
 [inbox.includes('Private client conversations')&&client.includes("coachMessageApi('coachSend'"),'Messages use canonical private thread and existing sender-aware API'],
 [client.includes("S.view='coach-resources'")&&client.includes("S.view='resources'"),'Coach Resources and assigned-member Resources are deliberate canonical surfaces'],
 [client.includes("'coachResourceAssign'")&&client.includes("action:'memberResources'"),'Resource assignment and member retrieval use shared backend ownership'],
 [habits.includes("S.view='mah-habits'")&&habits.includes('MAH HABITS · TODAY'),'MAH Habits is one canonical member/client page'],
 [client.includes("'habitCreate'")&&client.includes("action:'habitToggle'")&&client.includes("'habitUpdate'")&&client.includes("action:'habitArchive'"),'MAH Habits supports create/edit/toggle/archive behavior'],
 [client.includes('programlib-coach-tools')&&client.includes("data-a=\"coach-periodization\"")&&client.includes("data-a=\"coach-exercises\""),'Advanced coach tools are contextual Program Library tools'],
 [programToolsAt>programLibAt,'Program tools live inside/after Program Library owner rather than Coach Home'],
 [client.includes("function periodizationPage(coachMode)")&&client.includes("backAction=coachMode?'program-library':'progress'"),'Coach periodization reuses canonical periodization with Program Library back path'],
 [client.includes("HOME_PRIMARY_DEFAULT=['protocol','calendar','progress','meal-gradient','check-in']"),'Canonical member Home primary stack remains unchanged'],
 [homePrimary.includes("label:'MAH PROTOCOL'")&&homePrimary.includes("label:'mah calendar'")&&homePrimary.includes("label:'MAH PROGRESS'")&&homePrimary.includes("label:'MAH SCANNER'")&&homePrimary.includes("label:'CHECK IN'"),'Canonical Home control labels remain owned by original Home metadata'],
 [admin.includes('MAHFITT COACH MODE')&&admin.includes('/mygym?entry=coach'),'FOB Admin points coaching into canonical Coach Mode'],
 [!admin.includes('LEGACY / DIRECT FALLBACK')&&!admin.includes('LEGACY GYM TRACKER')&&!admin.includes('LEGACY MESSAGE CENTER'),'Legacy/direct fallback language is not exposed in FOB Admin'],
 [netlify.includes('from = "/gym-tracker"')&&netlify.includes('from = "/calendar-admin"')&&netlify.includes('from = "/message-center"'),'Compatibility routes remain available without being primary UI'],
 [admin.includes('/mygym?entry=coach&amp;coachView=coach-inbox'),'FOB admin Messages entry deep-links canonical Coach Inbox'],
 [!adminCss.includes('.admin-legacy'),'FOB Admin no longer maintains a user-facing legacy fallback component'],
 [r85Css.includes('.coach-primary-nav')&&r85Css.includes('.coach-home-shortcuts'),'Coach IA has dedicated canonical-dark navigation ownership'],
 [r85Css.includes('var(--bright)')&&r85Css.includes('var(--ink)')&&!r85Css.includes('background:#fff'),'R85 Coach styles remain Theme-token dark rather than PTD white cloning'],
 [client.includes("if(isCoachClientContext()){mahfittNavigate('home');return}"),'Entering Coach Mode while already in client context returns to canonical client Home']
];
let passed=0;for(const [ok,msg] of checks){assert.ok(ok,msg);passed++}
console.log('r85-coach-experience-ui: '+passed+'/'+checks.length+' PASS');
