'use strict';
const fs=require('fs'),assert=require('assert');
const admin=fs.readFileSync('admin-app.js','utf8');
const adminCss=fs.readFileSync('admin-app.css','utf8');
const review=fs.readFileSync('netlify/functions/form-review.js','utf8');
const coach=fs.readFileSync('coach-shell.js','utf8');
const mygym=fs.readFileSync('mygym.js','utf8');
const payment=fs.readFileSync('netlify/functions/fob-payment.js','utf8');
const netlify=fs.readFileSync('netlify.toml','utf8');
const checks=[
 [!admin.includes('LEGACY / DIRECT FALLBACK')&&!admin.includes('LEGACY GYM TRACKER')&&!admin.includes('LEGACY MESSAGE CENTER'),'legacy/direct fallback is not user-facing'],
 [!adminCss.includes('.admin-legacy'),'legacy fallback component CSS removed'],
 [netlify.includes('from = "/gym-tracker"')&&netlify.includes('from = "/calendar-admin"')&&netlify.includes('from = "/message-center"'),'compatibility routes remain available'],
 [review.includes('--gold:var(--coach-primary')&&review.includes('--ink:var(--coach-surface'),'MAH Inquiries aliases canonical coach Theme tokens'],
 [review.includes("--body:'Space Grotesk'")&&!review.includes("font-family:var(--body);font-size:15px;padding:12px 14px;min-height:46px"),'MAH Inquiries uses canonical typography/control geometry'],
 [review.includes('.fr-top-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'),'MAH Inquiries mobile actions use contained two-column grid'],
 [review.includes('html,body{width:100%;max-width:100%;overflow-x:hidden}'),'MAH Inquiries owns page overflow containment'],
 [!review.includes('fob-wordmark-nav.png'),'duplicate FOB wordmark removed from Inquiries body'],
 [review.includes('v=449')&&!review.includes('v=446'),'MAH Inquiries consumes current R85B assets'],
 [mygym.includes("fob.mygym.theme.active-account.v1"),'canonical MAHFITT writes active-account Theme bridge'],
 [coach.includes("BRIDGE_KEY='fob.mygym.theme.active-account.v1'")&&coach.includes('canonicalTheme()'),'FOB Admin crown reads canonical MAHFITT Theme bridge'],
 [coach.includes('There is no separate backend color theme.'),'separate backend Theme editor removed'],
 [payment.includes('Open MAHFITT Coach Mode')&&!payment.includes('>Gym Tracker</a>'),'Members Edit routes fitness work back to canonical Coach Mode'],
 [payment.includes('Session Calendar')&&!payment.includes('>MAH Calendar</a>'),'FOB business calendar is not mislabeled as canonical MAH Calendar'],
];
let n=0;for(const [ok,msg] of checks){assert.ok(ok,msg);n++;}
console.log('r85b-admin-canonical-closure: '+n+'/'+checks.length+' PASS');
