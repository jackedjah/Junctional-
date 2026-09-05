'use strict';
const S=require('./_session');
const G=require('./_group-passwords');
const H={'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex, nofollow, noarchive','Cache-Control':'no-store'};
function page(){
  const weekly=G.passwords();
return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MEMBERS EDIT · MAHFITT</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/mahfitt-canonical-components.css?v=452"><style>
:root{--ink:#14171B;--panel:#1B2026;--panel2:#20262D;--gold:#D3BE98;--bright:#E9C98F;--dim:#A8946F;--text:#EFEAE0;--muted:#9BA1A8;--line:rgba(211,190,152,.28);--warn:#E6C45D;--danger:#D99A8A}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% 0,rgba(233,201,143,.07),transparent 28%),var(--ink);color:var(--text);font-family:"Space Grotesk",system-ui,-apple-system,sans-serif;min-height:100vh}
main{width:min(760px,92vw);margin:auto;padding:38px 0 84px}.top{display:grid;justify-items:center;text-align:center;gap:20px;margin-bottom:24px}.top-right{width:100%;display:grid;justify-items:center;gap:14px}.logo{display:block;width:143px;height:48px;order:-1;transform:translateY(-6px);background:var(--bright);-webkit-mask:url('/images/mahfitt-mark-mask.png') center/contain no-repeat;mask:url('/images/mahfitt-mark-mask.png') center/contain no-repeat;filter:drop-shadow(0 0 16px rgba(233,201,143,.15))}.weekly{width:min(100%,360px);min-width:205px;border:1px solid rgba(211,190,152,.19);background:linear-gradient(145deg,rgba(32,38,45,.88),rgba(20,23,27,.9));border-radius:2px;padding:12px;text-align:left}.weekly-title{font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin:0 0 4px}.weekly-week{font-size:10px;color:var(--muted);margin:0 0 9px}.pw-row{display:grid;grid-template-columns:54px 1fr auto;align-items:center;gap:7px;padding:5px 0;border-top:1px solid rgba(211,190,152,.08)}.pw-row:first-of-type{border-top:0}.pw-day{font-size:8px;letter-spacing:.13em;text-transform:uppercase;color:var(--dim)}.pw-code{font:700 12px/1 monospace;color:var(--text)}.pw-copy{border:1px solid rgba(211,190,152,.22);background:transparent;color:var(--gold);border-radius:2px;padding:5px 7px;font-size:8px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}.pw-copy.copied{background:rgba(211,190,152,.12);color:var(--bright)}.ey{font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);margin:0 0 9px}.title{font-size:clamp(28px,7vw,42px);font-weight:600;line-height:1;margin:0;color:#EEE7D8;letter-spacing:-.025em}.sub{color:var(--muted);line-height:var(--mf-ui-body-line,1.6);max-width:560px;margin:14px auto 0;font-size:var(--mf-ui-body-size,13px)}
.actions{display:flex;gap:8px;margin:4px 0 26px}.btn{min-height:var(--mf-ui-button-h,48px);display:flex;align-items:center;justify-content:center;border:1px solid var(--line);background:transparent;color:var(--gold);padding:0 16px;border-radius:2px;cursor:pointer;text-decoration:none;font-family:var(--mf-ui-font);font-size:var(--mf-ui-button-size);font-weight:600;letter-spacing:var(--mf-ui-button-tracking);text-transform:uppercase}.btn.gold{min-height:var(--mf-ui-primary-h,52px);background:linear-gradient(180deg,var(--bright),var(--gold));border-color:transparent;color:var(--ink)}
.add-shell{background:linear-gradient(145deg,rgba(32,38,45,.98),rgba(27,32,38,.98));border:1px solid var(--line);padding:18px;border-radius:2px;box-shadow:0 18px 50px rgba(0,0,0,.14)}.section-kicker{margin:0 0 12px;color:var(--dim);font-size:9px;letter-spacing:.22em;text-transform:uppercase}.add{display:grid;grid-template-columns:1fr 1fr;gap:10px}.add .wide{grid-column:1/-1}.field{position:relative}.field label{display:block;color:var(--dim);font-size:9px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px 2px}.field input{width:100%;min-height:50px;border-radius:2px;border:1px solid rgba(211,190,152,.20);background:#171A1E;color:var(--text);padding:12px 13px;font-size:16px;outline:none}.field input:focus,.metric input:focus{border-color:rgba(233,201,143,.7);box-shadow:0 0 0 2px rgba(233,201,143,.08)}
.add .btn{min-height:52px;width:100%;margin-top:2px}.status{min-height:22px;color:var(--gold);font-size:13px;margin:10px 2px 16px}
.metric.park.empty .ledger-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin:30px 2px 12px}.ledger-head h2{margin:0;font-size:12px;letter-spacing:.20em;text-transform:uppercase;color:var(--gold)}.ledger-head span{color:var(--muted);font-size:12px}.list{display:flex;flex-direction:column;gap:10px}
.row-tools{display:flex;align-items:center;gap:8px;flex:0 0 auto}.prog{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);text-decoration:none;border:1px solid rgba(211,190,152,.22);border-radius:2px;padding:6px 9px;white-space:nowrap}.prog:hover{color:var(--bright);border-color:rgba(233,201,143,.5)}.row{position:relative;display:flex;flex-direction:column;gap:12px;padding:16px;background:linear-gradient(120deg,rgba(32,38,45,.96),rgba(27,32,38,.96));border:1px solid rgba(211,190,152,.15);border-radius:2px}.row.is-target{border-color:var(--bright);box-shadow:0 0 24px rgba(233,201,143,.09)}.row.is-locked{border-color:rgba(217,154,138,.56);background:linear-gradient(120deg,rgba(60,35,34,.42),rgba(27,32,38,.98))}.identity{min-width:0}.access-state{display:inline-flex;margin-top:8px;padding:6px 8px;border:1px solid rgba(217,154,138,.52);border-radius:2px;color:#E5A294;background:rgba(217,154,138,.07);font-size:8px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.access-state::before{content:'●';font-size:6px;margin-right:7px;align-self:center}
.row-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.row-park{display:flex;flex-direction:column;gap:6px;min-width:0}
.row-rate{display:flex;flex-direction:column;gap:6px;min-width:0}
/* Standard reads as normal. The two adjusted rates warm the border only,
   enough to spot at a glance without turning the ledger into a dashboard. */
.rate-select{width:100%;height:40px;border-radius:2px;padding:0 32px 0 12px;cursor:pointer;
  border:1px solid rgba(211,190,152,.24);background:#161A1E;color:var(--text);font-size:13.5px;
  -webkit-appearance:none;appearance:none;
  background-image:linear-gradient(45deg,transparent 50%,rgba(211,190,152,.7) 50%),
                   linear-gradient(135deg,rgba(211,190,152,.7) 50%,transparent 50%);
  background-position:calc(100% - 17px) 18px,calc(100% - 12px) 18px;
  background-size:5px 5px,5px 5px;background-repeat:no-repeat}
.rate-select:focus{border-color:#e9c98f;outline:none}
.rate-select.is-extended{border-color:rgba(206,166,108,.6);color:#e9cf9d}
.rate-select.is-distance{border-color:rgba(196,124,102,.65);color:#e8bba6}
.rate-select option{background:#161A1E;color:#f3ece0}
.row-stats{display:flex;align-items:flex-end;gap:16px}
.row-stats .metric{min-width:0}
.row-stats .metric.days{margin-left:auto;text-align:right}
.row-stats .metric.days .metric-label{white-space:nowrap}
.park-select{width:100%;max-width:100%;height:42px;border-radius:2px;
  border:1px solid rgba(211,190,152,.24);background:#161A1E;color:var(--text);
  font-size:14px;padding:0 34px 0 12px;outline:none;cursor:pointer;
  -webkit-appearance:none;appearance:none;text-overflow:ellipsis;
  background-image:linear-gradient(45deg,transparent 50%,rgba(211,190,152,.75) 50%),
                   linear-gradient(135deg,rgba(211,190,152,.75) 50%,transparent 50%);
  background-position:calc(100% - 18px) 19px,calc(100% - 13px) 19px;
  background-size:5px 5px,5px 5px;background-repeat:no-repeat}
.park-select:focus{border-color:#e9c98f}
.park-select option,.park-select optgroup{background:#161A1E;color:#f3ece0}.name{font-weight:700;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#F2EDE4}.meta{color:var(--dim);font-size:9px;letter-spacing:.16em;text-transform:uppercase;margin-top:4px}.metric{display:flex;flex-direction:column;gap:5px;min-width:98px}.metric-label{font-size:8px;letter-spacing:.17em;text-transform:uppercase;color:var(--dim)}.fraction{display:flex;align-items:center;gap:5px}.fraction input,.days-input{width:50px;height:40px;border-radius:2px;border:1px solid rgba(211,190,152,.2);background:#161A1E;color:var(--text);font-size:16px;font-weight:700;text-align:center;outline:none}.fraction .slash{color:var(--dim);font-weight:700}.days-input{width:66px}.metric.days.warn .days-input{border-color:rgba(230,196,93,.7);color:#F0D778;background:rgba(230,196,93,.06)}.metric.days.expired .days-input{border-color:rgba(217,154,138,.75);color:#E5A294;background:rgba(217,154,138,.07)}.row .del{height:40px;width:40px;border:1px solid rgba(217,154,138,.30);background:transparent;color:var(--danger);border-radius:2px;cursor:pointer;font-size:19px}.conf{display:inline-flex;align-items:center;gap:9px;cursor:pointer;margin-top:4px;-webkit-user-select:none;user-select:none}.conf input{position:absolute;opacity:0;width:0;height:0}.conf__t{flex:0 0 auto;width:38px;height:22px;border-radius:999px;background:#22272D;border:1px solid rgba(211,190,152,.22);position:relative;transition:background .16s,border-color .16s}.conf__t::after{content:'';position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:#6E757C;transition:transform .16s,background .16s}.conf input:checked + .conf__t{background:rgba(233,201,143,.22);border-color:rgba(233,201,143,.5)}.conf input:checked + .conf__t::after{transform:translateX(16px);background:#E9C98F}.conf input:focus-visible + .conf__t{outline:2px solid rgba(233,201,143,.6);outline-offset:2px}.conf b{font-size:10px;letter-spacing:.16em;text-transform:uppercase;font-weight:600;color:var(--dim)}.conf input:checked ~ b{color:var(--gold)}.conf--add{margin-top:2px}.confhint{margin:8px 0 0;font-size:11px;line-height:1.55;color:var(--dim)}.gymlink{display:flex;align-items:center;justify-content:center;min-height:52px;margin:26px 2px 0;border:1px solid rgba(211,190,152,.30);border-radius:2px;color:var(--gold);text-decoration:none;font-size:11px;letter-spacing:.24em;text-transform:uppercase;font-weight:700;background:linear-gradient(180deg,rgba(211,190,152,.09),rgba(211,190,152,.03))}.gymlink:hover{color:var(--bright);border-color:rgba(233,201,143,.5)}.find{margin:30px 2px 0}.find-box{position:relative;display:flex;align-items:center}.find-box .ico{position:absolute;left:14px;width:16px;height:16px;color:var(--dim);opacity:.75;pointer-events:none}.find-box input{width:100%;min-height:50px;border-radius:2px;border:1px solid rgba(211,190,152,.20);background:#171A1E;color:var(--text);padding:12px 44px 12px 40px;font-size:16px;outline:none;-webkit-appearance:none;appearance:none}.find-box input::-webkit-search-cancel-button{display:none}.find-box input:focus{border-color:rgba(233,201,143,.45)}.find-box input::placeholder{color:#6E757C}.find-clear{position:absolute;right:8px;width:34px;height:34px;border:0;border-radius:2px;background:transparent;color:var(--dim);font-size:20px;line-height:1;cursor:pointer}.find-clear:hover{color:var(--bright);background:rgba(211,190,152,.10)}.find-count{display:block;margin:9px 2px 0;font-size:10px;letter-spacing:.17em;text-transform:uppercase;color:var(--dim);min-height:13px}.row[hidden]{display:none}.empty{color:var(--muted);padding:22px 4px;text-align:center;border:1px dashed rgba(211,190,152,.16);border-radius:2px}
@media(max-width:650px){main{padding-top:28px}.top{gap:14px}.top-right{width:100%}.weekly{min-width:0}.logo{width:125px;height:43px}.sub{font-size:14px}.row{grid-template-columns:1fr 1fr 42px;gap:12px}.row-head{position:relative;min-height:46px}.identity{grid-column:1/-1;padding-right:170px}.row-tools{position:absolute;right:0;top:0;display:flex;align-items:center;gap:9px}.prog{padding:6px 7px;min-width:44px;text-align:center}.row .del{position:static;right:auto;top:auto;flex:0 0 40px;margin:0}.metric{min-width:0}.ledger-head span{display:none}}
@media(max-width:460px){.actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.actions .btn{width:100%;min-width:0;padding-inline:8px}.add{grid-template-columns:1fr}.add .wide{grid-column:auto}.row{padding:14px}.name{font-size:16px}}

/* R85A — Members Edit consumes the same squared MAHFITT form/action geometry. */
.status{margin:14px 2px 26px;min-height:20px}.gymlink{margin:0 2px;min-height:var(--mf-ui-button-h,48px);background:transparent;box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}
.find{margin:36px 2px 0}.find-box input{min-height:var(--mf-ui-primary-h,52px);background:#171A1E}.ledger-head{margin:28px 2px 14px}.row{background:linear-gradient(145deg,#1b2026,#15191d);background-clip:padding-box;box-shadow:inset 0 1px 0 rgba(255,255,255,.026)}.row.is-target{box-shadow:inset 0 1px 0 rgba(255,255,255,.026)}
@media(max-width:650px){.status{margin-bottom:24px}.find{margin-top:32px}.ledger-head{margin-top:26px}}
/* Canonical restrained atmosphere; business logic remains FOB-owned. */
body{background:
  radial-gradient(ellipse 58% 32% at 50% 10%,rgba(233,201,143,.055),transparent 74%),
  radial-gradient(ellipse at 50% 46%,#151a1f 0%,var(--ink) 58%,#090c0f 118%)!important}
.add-shell,.weekly,.row,.find-box input,.gymlink,.field input,.park-select,.rate-select,.fraction input,.days-input{
  background-clip:padding-box!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.025)
}
.actions .btn{background:transparent;border-color:var(--line)}
.actions .btn.gold{background:linear-gradient(180deg,var(--bright),var(--gold));color:var(--ink);border-color:transparent}
</style><link rel="stylesheet" href="/coach-shell.css?v=452&rc5c=1"><link rel="stylesheet" href="/mahfitt-atmosphere.css?v=452"></head><body><main>
<div class="top"><div><p class="ey">FOB ADMIN · MEMBERS</p><h1 class="title">MEMBERS EDIT</h1><p class="sub">Add, edit, or remove member profiles and session balances. <strong>Sessions Left = 0 locks every member area, including checkout.</strong> Raise the balance here to reopen access.</p></div><div class="top-right"><section class="weekly" aria-label="Passwords of the week"><p class="weekly-title">Passwords of the week</p><p class="weekly-week">Group week ${weekly.week}</p><div class="pw-row"><span class="pw-day">Monday</span><code class="pw-code">${weekly.mon}</code><button class="pw-copy" data-copy="${weekly.mon}" type="button">Copy</button></div><div class="pw-row"><span class="pw-day">Wed</span><code class="pw-code">${weekly.wed}</code><button class="pw-copy" data-copy="${weekly.wed}" type="button">Copy</button></div><div class="pw-row"><span class="pw-day">Sat</span><code class="pw-code">${weekly.sat}</code><button class="pw-copy" data-copy="${weekly.sat}" type="button">Copy</button></div></section><span class="logo" role="img" aria-label="MAHFITT"></span></div></div>
<div class="actions"><a class="btn" href="/admin">Admin</a><a class="btn" href="/calendar-admin">Session Calendar</a><a class="btn" href="/form-review">MAH Inquiries</a><button class="btn" id="logout">Log Out</button></div>
<section class="add-shell"><p class="section-kicker">Add confirmed member</p><div class="add">
<div class="field"><label for="first">First name</label><input id="first" placeholder="First name" autocomplete="off"></div>
<div class="field"><label for="last">Last name</label><input id="last" placeholder="Last name" autocomplete="off"></div>
<div class="field"><label for="left">Sessions left</label><input id="left" type="number" min="0" placeholder="0"></div>
<div class="field"><label for="sesh">Total sessions</label><input id="sesh" type="number" min="0" placeholder="0"></div>
<div class="field wide"><label for="park">Preferred park</label><select id="park" class="park-select"></select></div>
<div class="field wide"><label for="days">Amount of days</label><input id="days" type="number" min="0" value="180" inputmode="numeric"></div>
<div class="field wide"><label class="conf conf--add"><input type="checkbox" id="confirmed" checked><span class="conf__t"></span><b>Confirmed member</b></label><p class="confhint">Off means gym tracking only while Sessions Left is above 0. A zero balance always locks every member-facing area.</p></div><button class="btn gold wide" id="add">Add Member</button></div></section>
<p class="status" id="status"></p><a class="gymlink" href="/mygym?entry=coach">Open MAHFITT Coach Mode</a><div class="find"><div class="find-box"><svg class="ico" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.4" stroke="currentColor" stroke-width="1.8"/><path d="M15.8 15.8 20 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><input id="find" type="search" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" placeholder="Search members by name" aria-label="Search members"><button class="find-clear" id="findClear" type="button" aria-label="Clear search" hidden>&times;</button></div><span class="find-count" id="findCount" aria-live="polite"></span></div><div class="ledger-head"><h2>Member Ledger</h2><span>Sessions · Days remaining</span></div><div class="list" id="list"></div>
<script>
let PARKS=[];
function paintRates(){document.querySelectorAll('.rate-select').forEach(function(sel){sel.classList.toggle('is-extended',sel.value==='extended');sel.classList.toggle('is-distance',sel.value==='distance')})}
function rateOptions(v){var cur=String(v||'standard');var R=[['standard','Standard Range'],['extended','Extended Range +10%'],['distance','Distance Range +18%']];return R.map(function(r){return '<option value="'+r[0]+'"'+(r[0]===cur?' selected':'')+'>'+r[1]+'</option>'}).join('')}
function parkOptions(cur){cur=String(cur||'');const pref=PARKS.filter(p=>p.p),rest=PARKS.filter(p=>!p.p);const opt=p=>'<option value="'+esc(p.n)+'"'+(p.n===cur?' selected':'')+'>'+esc(p.n)+(p.b?' \u00b7 '+esc(p.b):'')+'</option>';let h='<option value=""'+(cur?'':' selected')+'>No park set</option>';if(cur&&!PARKS.some(p=>p.n===cur))h+='<option value="'+esc(cur)+'" selected>'+esc(cur)+'</option>';if(pref.length)h+='<optgroup label="Preferred">'+pref.map(opt).join('')+'</optgroup>';if(rest.length)h+='<optgroup label="All parks">'+rest.map(opt).join('')+'</optgroup>';return h}
const $=s=>document.querySelector(s),list=$('#list'),status=$('#status'),WANTED_MEMBER=(new URLSearchParams(location.search)).get('member')||'';
document.querySelectorAll('.pw-copy').forEach(btn=>btn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(btn.dataset.copy)}catch(e){const ta=document.createElement('textarea');ta.value=btn.dataset.copy;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}btn.textContent='Copied';btn.classList.add('copied');setTimeout(()=>{btn.textContent='Copy';btn.classList.remove('copied')},1200)}));
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function daysLeft(expiresAt){if(!expiresAt)return 180;const end=new Date(expiresAt);if(Number.isNaN(end.getTime()))return 180;const now=new Date();const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());const endDay=Date.UTC(end.getFullYear(),end.getMonth(),end.getDate());return Math.max(0,Math.ceil((endDay-today)/86400000))}
function dayClass(n){return n<=0?'expired':n<90?'warn':''}
async function api(method,body){const r=await fetch('/api/payment-members',{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(r.status===401){location.href='/fob-payment';throw new Error('auth')}const j=await r.json();if(!r.ok)throw new Error(j.error||'Request failed');return j}
/* MEMBER SEARCH
   Filters the rows already on the page. No new endpoint, no new query, no
   extra auth surface: the ledger is fetched exactly as before and this only
   decides which rows are shown. A filtered row keeps every control and
   handler it already had, so nothing about editing a member changes.

   Matching is token-AND over a normalized haystack, so "jah fob" and
   "fob jah" both find Jah Fobin, accents and casing are ignored, and a park
   or location rate can be searched as well as a name. */
function norm(v){return String(v==null?'':v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()}
function findKey(m){return norm([m.first_name,m.last_name,m.preferred_park,m.location_rate].filter(Boolean).join(' '))}

function applyFind(){
  var box=document.getElementById('find'); if(!box) return;
  var q=norm(box.value), tokens=q?q.split(' '):[];
  var rows=list.querySelectorAll('.row'), shown=0;
  for(var i=0;i<rows.length;i++){
    var hay=rows[i].getAttribute('data-find')||'', hit=true;
    for(var t=0;t<tokens.length;t++){ if(hay.indexOf(tokens[t])===-1){hit=false;break;} }
    rows[i].hidden=!hit;
    if(hit)shown++;
  }
  var clear=document.getElementById('findClear');
  if(clear)clear.hidden=!q;
  var count=document.getElementById('findCount');
  if(count){
    count.textContent = rows.length===0 ? ''
      : (q ? (shown+' of '+rows.length+' member'+(rows.length===1?'':'s'))
           : (rows.length+' member'+(rows.length===1?'':'s')));
  }
  var none=document.getElementById('findNone');
  if(shown===0&&rows.length>0&&q){
    if(!none){ none=document.createElement('div'); none.id='findNone'; none.className='empty';
      none.textContent='No member matches that search.'; list.appendChild(none); }
    none.hidden=false;
  } else if(none){ none.hidden=true; }
}

function memberRow(m){const d=daysLeft(m.expires_at),locked=Number(m.sesh_left)<=0;return '<div class="row'+(locked?' is-locked':'')+'" data-id="'+m.id+'" data-find="'+esc(findKey(m))+'"><div class="row-head"><div class="identity"><div class="name">'+esc(m.first_name)+' '+esc(m.last_name)+'</div><label class="conf"><input type="checkbox" data-k="confirmed"'+(m.gym_only?'':' checked')+'><span class="conf__t"></span><b>'+(m.gym_only?'Gym tracking only':'Confirmed member')+'</b></label>'+(locked?'<div class="access-state">Access locked · contact required</div>':'')+'</div><div class="row-tools"><a class="prog" href="/fob-progress?m=\'+encodeURIComponent(m.id)+\'" title="FOB Progress">FOB</a><a class="prog" href="/fob-progress?m=\'+encodeURIComponent(m.id)+\'&amp;tab=gym" title="Gym Progress">Gym</a><button class="del" aria-label="Remove member">&times;</button></div></div><div class="row-rate"><span class="metric-label">Location rate</span><select class="rate-select" data-k="locationRate" aria-label="Location rate">'+rateOptions(m.location_rate)+'</select></div><div class="row-park"><span class="metric-label">Preferred park</span><select class="park-select" data-k="preferredPark" aria-label="Preferred park">'+parkOptions(m.preferred_park)+'</select></div><div class="row-stats"><div class="metric"><span class="metric-label">Sessions</span><div class="fraction"><input aria-label="Sessions left" data-k="seshLeft" type="number" min="0" value="'+m.sesh_left+'"><span class="slash">/</span><input aria-label="Total sessions" data-k="sesh" type="number" min="0" value="'+m.sesh+'"></div></div><div class="metric days '+dayClass(d)+'"><span class="metric-label">Days left</span><input class="days-input" aria-label="Days remaining" data-k="days" type="number" min="0" value="'+d+'"></div></div></div>'}
async function load(){try{const j=await api('GET');if(Array.isArray(j.parks))PARKS=j.parks;const cur=$('#park').value;$('#park').innerHTML=parkOptions(cur);list.innerHTML=(j.items||[]).map(memberRow).join('')||'<div class="empty">No confirmed members yet.</div>';paintRates();if(WANTED_MEMBER){const row=list.querySelector('[data-id="'+CSS.escape(WANTED_MEMBER)+'"]');if(row){row.classList.add('is-target');setTimeout(()=>row.scrollIntoView({block:'center'}),80)}}/* v365: a deep link may target a member card, but search is always an explicit coach action. Never seed or restore a member name into the search field. */if($('#find'))$('#find').value='';applyFind()}catch(e){status.textContent=e.message}}
(function(){
  var box=document.getElementById('find'), clear=document.getElementById('findClear');
  if(box){
    box.addEventListener('input',applyFind);
    box.addEventListener('keydown',function(e){ if(e.key==='Escape'){box.value='';applyFind();box.blur();} });
  }
  if(clear)clear.addEventListener('click',function(){ box.value=''; applyFind(); box.focus(); });
}());
$('#add').onclick=async()=>{const cb=$('#confirmed');const b={firstName:$('#first').value,lastName:$('#last').value,preferredPark:$('#park').value,sesh:$('#sesh').value,seshLeft:$('#left').value,days:$('#days').value||180,confirmed:cb?cb.checked:true};try{const j=await api('POST',b);['#first','#last','#sesh','#left','#park'].forEach(s=>$(s).value='');if(cb)cb.checked=true;$('#days').value='180';status.textContent=j.locked?'Member added with access locked.':'Member added.';load()}catch(e){status.textContent=e.message}}
list.addEventListener('change',function(){setTimeout(paintRates,0)});list.addEventListener('change',async e=>{const row=e.target.closest('.row');if(!row||!e.target.dataset.k)return;const body={id:row.dataset.id};body[e.target.dataset.k]=(e.target.type==='checkbox')?e.target.checked:e.target.value;try{const j=await api('PATCH',body);status.textContent=j.locked?'Saved. Member access is now fully locked.':(j.forumSynced===false?'Saved. Forum identity sync needs another try.':'Saved.');if(e.target.dataset.k==='days'||e.target.dataset.k==='confirmed'||e.target.dataset.k==='seshLeft')load()}catch(err){status.textContent=err.message}})
list.addEventListener('click',async e=>{if(!e.target.classList.contains('del'))return;const row=e.target.closest('.row');if(!confirm('Remove this member from payment access?'))return;try{await api('DELETE',{id:row.dataset.id});status.textContent='Member removed.';load()}catch(err){status.textContent=err.message}})
$('#logout').onclick=async()=>{await fetch('/api/logout',{method:'POST'});location.href='/fob-payment'};load();
</script></main><script defer src="/coach-shell.js?v=452&rc5c=1"></script></body></html>`;
}
function login(){
return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>MEMBERS EDIT</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/mahfitt-canonical-components.css?v=452"><style>
body{margin:0;background:#14171B;color:#EFEAE0;font-family:var(--mf-ui-font,"Space Grotesk",system-ui,sans-serif);display:grid;place-items:center;min-height:100vh}.c{width:min(390px,90vw);border:1px solid rgba(211,190,152,.28);background:#1B2026;border-radius:2px;padding:30px;text-align:center}.c img{width:88px}.c h1{font-size:30px;font-weight:600;margin:14px 0 20px}.c input,.c button{width:100%;box-sizing:border-box;min-height:var(--mf-ui-primary-h,52px);border-radius:2px;margin:6px 0;padding:12px}.c input{background:#14171B;border:1px solid rgba(211,190,152,.28);color:#EFEAE0;font-size:16px}.c button{background:#D3BE98;border:0;color:#14171B;font-family:var(--mf-ui-font);font-size:var(--mf-ui-primary-size,12px);font-weight:700;letter-spacing:var(--mf-ui-primary-tracking,.22em);text-transform:uppercase;cursor:pointer}.e{color:#D99A8A;min-height:20px;font-size:13px}</style></head><body><div class="c"><img src="/images/fob-emblem.png"><h1>MEMBERS EDIT</h1><input id="p" type="password" placeholder="Private password"><p class="e" id="e"></p><button id="b">Enter</button></div><script>
async function go(){let b=document.getElementById('b'),e=document.getElementById('e');b.disabled=true;let r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('p').value})});let j=await r.json();if(r.ok)location.reload();else{e.textContent=j.error||'Could not sign in.';b.disabled=false}}document.getElementById('b').onclick=go;document.getElementById('p').onkeydown=e=>{if(e.key==='Enter')go()}</script></body></html>`;
}
exports.handler=async event=>({statusCode:200,headers:H,body:S.isAuthed(event)?page():login()});
