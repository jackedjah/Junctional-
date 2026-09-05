'use strict';
const fs=require('fs'),assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');
const coach=read('coach-shell.js'),coachCss=read('coach-shell.css'),client=read('mygym.js'),server=read('netlify/functions/mygym.js'),admin=read('admin-app.js'),adminCss=read('admin-app.css'),shared=read('mahfitt-canonical-components.css'),sw=read('sw.js');
const checks=[
  [!coach.includes('new Audio('),'Admin crown owns no second audio element'],
  [!coach.includes('fob.coach.audio')&&!coach.includes('fob-coach-media'),'legacy coach media state/storage removed'],
  [!coach.includes('Backend Player')&&!coach.includes('SAVE COACH PLAYER'),'Backend Player UX removed'],
  [!coach.includes('MAHFITT Theme')&&!coach.includes('OPEN MAHFITT'),'backend Theme explanation UX removed'],
  [!coach.includes('type="file"')&&!coach.includes('type="range"'),'Admin crown exposes no native file/range controls'],
  [coach.includes("openCanonicalTool('player')")&&coach.includes('audio=')&&coach.includes('externalTool=1'),'Admin Player launches canonical MAHFITT tool route'],
  [coach.includes("openCanonicalTool('theme')"),'Admin Theme launches canonical Theme Editor route'],
  [coach.includes("openCanonicalTool('ai')"),'Admin AI crown action uses canonical MAHFITT route'],
  [client.includes("GLOBAL_TOOL_RETURN_KEY='fob.mygym.globalToolReturn.v1'"),'canonical MAHFITT owns external global-tool return context'],
  [client.includes("finishExternalGlobalTool('player')")&&client.includes("finishExternalGlobalTool('theme')"),'canonical Player and Theme close restore external Admin route'],
  [client.includes("q.delete('externalTool')"),'external tool launch marker is removed from canonical URL after entry'],
  [shared.includes('--mf-ui-button-h:48px')&&shared.includes('--mf-ui-primary-h:52px'),'shared controls inherit accepted member metrics'],
  [shared.includes('--mf-crown-height:281px')&&shared.includes('--mf-crown-collapsed-height:172px')&&shared.includes('--mf-crown-control:40px'),'Admin crown consumes canonical crown geometry tokens'],
  [coachCss.includes("@import url('/mahfitt-canonical-components.css?v=453')"),'Admin crown imports shared canonical owner'],
  [adminCss.includes("@import url('/mahfitt-canonical-components.css?v=453')"),'FOB Admin imports shared canonical owner'],
  [admin.includes('class="mf-canon-button" href="/mygym?entry=coach"'),'Coach Mode action uses shared canonical button primitive'],
  [admin.includes('admin-scan mf-canon-button'),'scanner launch uses shared canonical button primitive'],
  [adminCss.includes('border-radius:var(--mf-ui-control-radius)'),'Admin form/action geometry uses canonical radius token'],
  [adminCss.includes('.admin-scanner-close')&&adminCss.includes('width:var(--mf-crown-control)'),'scanner close uses canonical square touch target'],
  [coachCss.includes('.coach-shell__occlusion')&&coachCss.includes('var(--coach-surface) 0%,var(--coach-surface) 70%'),'crown has structural opaque occlusion zone before fade'],
  [!coachCss.includes('.coach-dialog'),'legacy backend modal CSS removed'],
  [!admin.includes('legacy')&&!admin.includes('fallback'),'normal FOB Admin UI exposes no migration/fallback jargon'],
  [server.includes('const V = 453;')&&sw.includes('fob-shell-v453'),'R85A advances current asset/cache identity'],
  [sw.includes("'/mahfitt-canonical-components.css'"),'service worker includes shared component owner']
];
let passed=0;for(const [ok,msg] of checks){assert.ok(ok,msg);passed++}console.log('r85a-canonical-component-closure: '+passed+'/'+checks.length+' PASS');
