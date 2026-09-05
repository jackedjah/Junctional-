'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(require('path').join(__dirname,'..',p),'utf8')}
const server=read('netlify/functions/mygym.js');
const client=read('mygym.js');
const cal=read('netlify/functions/calendar-api.js');
function block(src,start,end){const a=src.indexOf(start);assert(a>=0,'missing '+start);const b=end?src.indexOf(end,a+start.length):-1;return src.slice(a,b>=0?b:src.length)}
let n=0;function ok(v,m){assert.ok(v,m);n++}
ok(server.includes('memberId=member.id,accountMemberId=accountMember.id'),'server must name separate fitness/account owners');
ok(server.includes('themeForMember(accountMemberId)'),'boot Theme must use authenticated account');
ok(server.includes('musicLibraryForMember(accountMemberId)'),'boot music must use authenticated account');
['musicLibrary','musicUploadTicket','musicTrackCommit','musicCoverUploadTicket','musicTrackUpdate','musicStateSave','themeSavedLibrary','themeSavedCreate','saveTheme','themeAudioLibrary','themeAudioLibraryCommit'].forEach(function(action){ok(server.includes("action==='"+action+"'")&&server.slice(server.indexOf("action==='"+action+"'"),server.indexOf("action==='"+action+"'")+650).includes('accountMemberId'),action+' must stay account-owned')});
const profile=block(server,"if(action==='coachProfileBoot')","if(action==='boot')");
ok(!profile.includes('themeForMember('),'client profile boot must not reload client Theme');
ok(!profile.includes('musicLibraryForMember('),'client profile boot must not reload client music');
const apply=block(client,'function coachApplyFitnessProfile','function coachSwitchProfile');
['setThemeAudio','hydrateMusic','stopThemeAudio','destroyYoutube','destroyTikTok','MUSIC.currentTrackId'].forEach(function(token){ok(!apply.includes(token),'coach profile apply must not mutate audio owner via '+token)});
const reset=block(client,'function resetFitnessContextRuntime','function resetPersonalAiRuntime');
['stopThemeAudio','destroyYoutube','destroyTikTok','hydrateMusic','setThemeAudio'].forEach(function(token){ok(!reset.includes(token),'fitness reset must not touch audio via '+token)});
ok(cal.includes('memberTheme(account.id)'),'Calendar Theme must remain authenticated-account owned');
ok(cal.includes("member_music_state?select=*&member_id=eq.' + account.id"),'Calendar music state must remain authenticated-account owned');
ok(client.includes("post({action:'coachProfileBoot',activeProfileId:target})"),'context switch must use fitness-only profile boot');
ok(client.includes('S.account=r.data.account||r.data.member'),'boot must retain signed-in account object');
console.log('r90-audio-ownership: '+n+'/'+n+' PASS');
