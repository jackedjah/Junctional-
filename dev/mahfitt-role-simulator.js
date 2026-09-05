(function(){'use strict';
var root=document.getElementById('sim'),KEY='fob.mahfitt.roleSim.r90.v1';
var local=location.protocol==='file:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.hostname==='::1';
if(!local){root.innerHTML='<section class="sim-blocked"><div><b>R90 ROLE SIMULATOR</b><p>This development-only decision harness is disabled on public hosts.</p></div></section>';return}
var BASE={persona:'jah',account:'jah',profile:'jah',page:'home',musicOwner:'jah',track:'Jah · Training Mix',playing:true,programs:{jah:'Jah Strength',dominic:'Dominic Foundation',cregy:'Cregy Build',jenn:'Jenn Strength'},rev:1};
var PEOPLE={jah:{name:'Jah Matt',roles:'COACH + MEMBER + FOB ADMIN'},dominic:{name:'Dominic Malazarte',roles:'COACHED CLIENT'},cregy:{name:'Cregy Patterson',roles:'COACHED CLIENT'},jenn:{name:'Jenn',roles:'COACHED CLIENT'},newmember:{name:'Independent Member',roles:'MEMBER'}};
var CLIENTS=['dominic','cregy','jenn'];
function clone(x){return JSON.parse(JSON.stringify(x))}
var memoryStore=null;
function storageGet(){try{return localStorage.getItem(KEY)}catch(e){return memoryStore}}
function storageSet(value){memoryStore=value;try{localStorage.setItem(KEY,value)}catch(e){/* opaque/file origins may deny storage; in-memory fallback keeps the harness functional */}}
function storageRemove(){memoryStore=null;try{localStorage.removeItem(KEY)}catch(e){}}
function load(){try{return Object.assign(clone(BASE),JSON.parse(storageGet()||'{}'))}catch(e){return clone(BASE)}}var S=load();
function save(){storageSet(JSON.stringify(S))}function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function person(id){return PEOPLE[id]||PEOPLE.newmember}function client(){return S.account!==S.profile}function canCoach(){return S.account==='jah'}function ownerName(){return person(S.musicOwner).name}function profileName(){return person(S.profile).name}
function setPersona(id){S.persona=id;S.account=id==='newmember'?'newmember':id;S.profile=S.account;S.musicOwner=S.account;S.track=person(S.account).name.split(' ')[0]+' · Training Mix';S.page='home';save();render()}
function transition(name,done){var m=document.createElement('section');m.className='sim-switch';m.innerHTML='<i></i><span>SWITCHING TO</span><b>'+esc(name)+'</b>';document.body.appendChild(m);requestAnimationFrame(function(){m.classList.add('on')});setTimeout(function(){done();m.classList.remove('on');setTimeout(function(){m.remove()},180)},360)}
function openClient(id){if(!canCoach()||CLIENTS.indexOf(id)<0)return;transition(person(id).name,function(){S.profile=id;S.page='home';/* signed-in music owner deliberately stays Jah */save();render()})}
function exitClient(){if(!client())return;transition(person(S.account).name,function(){S.profile=S.account;S.page='home';save();render()})}
function top(){var ctx=client()?'<span class="sim-context"><span>COACH MODE</span><b>VIEWING '+esc(profileName())+'</b><button data-act="exit">EXIT</button></span>':'<span></span>';return'<section class="sim-crown"><div class="sim-role">SIGNED IN<br><b>'+esc(person(S.account).name)+'</b></div><div class="sim-brand"><i></i><b>MAHFITT</b></div><div class="sim-music">MUSIC OWNER · '+esc(ownerName())+'<small>'+(S.playing?'PLAYING':'PAUSED')+' · '+esc(S.track)+'</small></div><div class="sim-crown-grid"><span>PLAYER</span><span class="diamond">◈</span><span>THEME</span></div></section><div class="sim-page-context"><strong>'+esc((S.page==='coach'?'COACH MODE':S.page).toUpperCase())+'</strong>'+ctx+'<time>R90</time></div>'}
function tool(id,title,sub){return'<button class="sim-tool" data-page="'+id+'"><i></i><span><b>'+esc(title)+'</b><small>'+esc(sub)+'</small></span><em>›</em></button>'}
function home(){var ai=client()?'Personal AI protected in Coach Mode':'Personal AI belongs to '+profileName();return'<header class="sim-hero"><span>ACTIVE FITNESS PROFILE</span><h1>'+esc(profileName())+'</h1><p>'+esc(person(S.profile).roles)+' · Fitness data owner is '+esc(profileName())+'. Music and Theme owner is '+esc(ownerName())+'.</p></header><div class="sim-actions">'+tool('gym','MAH GYM','Canonical training surface')+tool('programs','PROGRAMS',S.programs[S.profile]||'No demo program')+tool('calendar','MAH CALENDAR','Canonical calendar context')+tool('progress','MAH PROGRESS','Measurements + history')+tool('ai','MR.MAH',ai)+(canCoach()&&!client()?tool('coach','COACH MODE','Authorized client directory'):'')+'</div><div class="sim-status"><strong>OWNERSHIP PROOF</strong><br>AUTH = '+esc(person(S.account).name)+' · FITNESS = '+esc(profileName())+' · MUSIC = '+esc(ownerName())+' · AI = '+(client()?'BLOCKED FOR COACH':'SELF')+'</div>'}
function coachPage(){var q='';return'<header class="sim-hero"><span>AUTHORIZED FITNESS CONTEXT</span><h1>CLIENTS</h1><p>Search/select an authorized client. Authentication remains Jah; only fitness context changes.</p></header><input class="sim-search" id="simSearch" type="search" placeholder="Client name" aria-label="Search clients"><div class="sim-client-list" id="simClients">'+clientRows(q)+'</div>'}
function clientRows(q){q=String(q||'').toLowerCase();return CLIENTS.filter(function(id){return person(id).name.toLowerCase().indexOf(q)>=0}).map(function(id){var p=person(id);return'<button class="sim-client" data-client="'+id+'"><span class="avatar">'+esc(p.name.split(/\s+/).map(function(x){return x[0]}).join('').slice(0,2))+'</span><span><b>'+esc(p.name)+'</b><small>'+esc(S.programs[id]||'NO PROGRAM')+'</small></span><i>›</i></button>'}).join('')||'<p class="sim-note">No matching authorized clients.</p>'}
function programs(){var name=S.programs[S.profile]||'';return'<header class="sim-hero"><span>CANONICAL PROGRAM SYSTEM</span><h1>PROGRAMS</h1><p>'+esc(profileName())+' fitness data · edits persist across persona changes in this isolated demo namespace.</p></header><section class="sim-proof"><h2>Cross-persona data proof</h2><label>PROGRAM NAME<input id="programName" value="'+esc(name)+'" maxlength="60"></label>'+(client()?'<button data-act="save-program">SAVE AUTHORIZED CLIENT EDIT</button>':'<button data-act="save-program">SAVE MY PROGRAM</button>')+'<p class="sim-note">After editing Dominic as Jah, switch persona to Dominic. The same demo record appears — there is no coach-only shadow copy.</p></section>'}
function ai(){if(client())return'<section class="sim-ai-block"><div class="diamond"></div><span class="sim-label">PERSONAL AI OWNERSHIP</span><h2>MR.MAH IS PRIVATE TO '+esc(profileName()).toUpperCase()+'</h2><p>Jah may manage authorized fitness data but cannot invoke this client’s AI, quota, Protocol, Retrowork, Prowork, Meal Scan AI, or private AI history.</p></section>';return'<section class="sim-ai-block"><div class="diamond"></div><span class="sim-label">PERSONAL AI OWNERSHIP</span><h2>MR.MAH AVAILABLE</h2><p>'+esc(profileName())+' is acting as themselves. Their own AI entitlement may operate normally.</p></section>'}
function generic(){return'<header class="sim-hero"><span>CANONICAL MAHFITT</span><h1>'+esc(S.page.toUpperCase())+'</h1><p>This fixture demonstrates that the page shell remains the same while the active fitness owner changes. Current fitness owner: '+esc(profileName())+'. Current music owner: '+esc(ownerName())+'.</p></header><div class="sim-actions">'+tool('home','RETURN HOME','Same active fitness context')+'</div>'}
function personaBar(){return'<section class="sim-proof"><span class="sim-label">DEVELOPMENT PERSONA</span><div class="sim-personas"><button data-persona="newmember" data-on="'+(S.account==='newmember'?'1':'0')+'">INDEPENDENT MEMBER</button><button data-persona="dominic" data-on="'+(S.account==='dominic'?'1':'0')+'">DOMINIC · CLIENT</button><button data-persona="jah" data-on="'+(S.account==='jah'?'1':'0')+'">JAH · COACH/MEMBER</button><button data-persona="jah" data-admin="1">FOB ADMIN</button></div><button class="sim-reset" data-act="reset">RESET DEMO DATA</button><p class="sim-note">Local fixture only. No API calls. No real member records are read or written.</p></section>'}
function nav(){var ids=[['home','HOME'],['programs','PROGRAMS'],['calendar','CALENDAR'],['progress','PROGRESS'],['ai','AI']];return'<nav class="sim-toolbar">'+ids.map(function(x){return'<button data-page="'+x[0]+'" data-on="'+(S.page===x[0]?'1':'0')+'">'+x[1]+'</button>'}).join('')+'</nav>'}
function render(){var body=S.page==='coach'?coachPage():S.page==='home'?home():S.page==='programs'?programs():S.page==='ai'?ai():generic();root.innerHTML='<div class="sim-app">'+top()+'<main class="sim-main">'+body+personaBar()+'</main>'+nav()+'</div>';bind()}
function bind(){
  root.querySelectorAll('[data-page]').forEach(function(b){
    b.onclick=function(){
      S.page=this.dataset.page;
      if(S.page==='coach'&&!canCoach())S.page='home';
      save();render();
    };
  });
  root.querySelectorAll('[data-persona]').forEach(function(b){
    b.onclick=function(){setPersona(this.dataset.persona)};
  });
  root.querySelectorAll('[data-client]').forEach(function(b){
    b.onclick=function(){openClient(this.dataset.client)};
  });
  var search=document.getElementById('simSearch');
  if(search)search.oninput=function(){
    document.getElementById('simClients').innerHTML=clientRows(this.value);
    root.querySelectorAll('[data-client]').forEach(function(b){
      b.onclick=function(){openClient(this.dataset.client)};
    });
  };
  root.querySelectorAll('[data-act]').forEach(function(b){
    b.onclick=function(){
      var a=this.dataset.act;
      if(a==='exit'){exitClient();return}
      if(a==='reset'){storageRemove();S=clone(BASE);render();return}
      if(a==='save-program'){
        var x=document.getElementById('programName');
        S.programs[S.profile]=String(x&&x.value||'').trim()||'Untitled Program';
        S.rev++;save();render();
      }
    };
  });
}
render();
async function runE2E(){
  var results=[],pass=function(name,ok){results.push({name:name,ok:!!ok})},wait=function(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})};
  try{
    storageRemove();S=clone(BASE);render();
    var coach=root.querySelector('[data-page="coach"]');pass('coach mode entry visible',!!coach);if(coach)coach.click();
    var search=document.getElementById('simSearch');pass('client search opens',!!search);if(search){search.value='Dominic';search.dispatchEvent(new Event('input',{bubbles:true}))}
    var dom=root.querySelector('[data-client="dominic"]');pass('Dominic found by search',!!dom);if(dom)dom.click();await wait(520);
    pass('client context visible',!!root.querySelector('.sim-context b')&&/DOMINIC/i.test(root.querySelector('.sim-context b').textContent));
    pass('Jah remains music owner',/MUSIC OWNER · Jah Matt/i.test(root.textContent));
    var programs=root.querySelector('[data-page="programs"]');if(programs)programs.click();
    var input=document.getElementById('programName');pass('client program editor uses canonical fixture',!!input);if(input)input.value='Dominic R90 Coach Edit';
    var saveBtn=root.querySelector('[data-act="save-program"]');if(saveBtn)saveBtn.click();
    var aiBtn=root.querySelector('[data-page="ai"]');if(aiBtn)aiBtn.click();pass('client personal AI blocked',/MR\.MAH IS PRIVATE TO DOMINIC/i.test(root.textContent));
    var exit=root.querySelector('[data-act="exit"]');pass('client exit always reachable',!!exit);if(exit)exit.click();await wait(520);
    pass('exit restores Jah fitness context',/ACTIVE FITNESS PROFILE[\s\S]*Jah Matt/i.test(root.textContent));
    var domPersona=root.querySelector('[data-persona="dominic"]');if(domPersona)domPersona.click();
    var domPrograms=root.querySelector('[data-page="programs"]');if(domPrograms)domPrograms.click();
    var cross=document.getElementById('programName');pass('cross-persona program mutation persists',!!cross&&cross.value==='Dominic R90 Coach Edit');
    var domAi=root.querySelector('[data-page="ai"]');if(domAi)domAi.click();pass('Dominic self AI available',/MR\.MAH AVAILABLE/i.test(root.textContent));
  }catch(error){results.push({name:'runtime exception: '+String(error&&error.message||error),ok:false})}
  var box=document.createElement('pre');box.id='simE2EResults';box.dataset.passed=String(results.filter(function(x){return x.ok}).length);box.dataset.total=String(results.length);box.textContent=JSON.stringify(results);box.style.cssText='position:fixed;left:0;bottom:0;z-index:99;max-width:100%;max-height:30vh;overflow:auto;background:#000;color:#fff;font:10px monospace';document.body.appendChild(box);window.__R90_SIM_E2E=results;
}
if(new URLSearchParams(location.search).get('e2e')==='1')setTimeout(runE2E,0);
}());
