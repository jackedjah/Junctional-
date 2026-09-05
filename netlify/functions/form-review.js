/* Serves the Form Review area.
   Unauthenticated -> login page only. The dashboard markup is never sent
   to a visitor without a valid session, so the route gives nothing away. */
'use strict';
const S = require('./_session');

const HEAD = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="noindex, nofollow, noarchive" />
  <title>MAH Inquiries</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/coach-shell.css?v=453&rc5c=1" />
  <link rel="stylesheet" href="/mahfitt-atmosphere.css?v=453" />
  <style>
    :root{
      --ink:var(--coach-surface,#0e1114);
      --tone-black:var(--coach-surface,#0e1114);
      --tone-deep:color-mix(in srgb,var(--coach-surface,#0e1114) 92%,#000 8%);
      --tone-gold:color-mix(in srgb,var(--coach-surface,#0e1114) 88%,var(--coach-primary,#e9c98f) 12%);
      --gold:var(--coach-primary,#e9c98f);
      --gold-bright:var(--coach-primary,#e9c98f);
      --gold-dim:color-mix(in srgb,var(--coach-primary,#e9c98f) 68%,#7e858e 32%);
      --cream:#f7f3ec; --text:#f7f3ec; --muted:#8b929b;
      --line:color-mix(in srgb,var(--coach-primary,#e9c98f) 25%,transparent);
      --line-soft:color-mix(in srgb,var(--coach-primary,#e9c98f) 13%,transparent);
      --display:'Space Grotesk',system-ui,sans-serif; --body:'Space Grotesk',system-ui,sans-serif;
    }
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:100%;max-width:100%;overflow-x:hidden}
    body{background:
      radial-gradient(ellipse 64% 34% at 50% 14%,color-mix(in srgb,var(--gold) 5%,transparent),transparent 76%),
      linear-gradient(180deg,var(--ink),color-mix(in srgb,var(--ink) 94%,#000 6%));
      color:var(--text);font-family:var(--body);-webkit-font-smoothing:antialiased;min-height:100vh}
    a{color:var(--gold)}
    .fr-eyebrow{font-family:var(--display);font-size:11px;font-weight:500;
      letter-spacing:.28em;text-transform:uppercase;color:var(--gold)}
    .fr-btn{font-family:var(--display);font-size:12.5px;font-weight:600;
      letter-spacing:.16em;text-transform:uppercase;cursor:pointer;
      border-radius:2px;border:1px solid transparent;padding:12px 16px;min-height:48px;
      transition:transform .18s ease,background .25s,border-color .25s,color .25s}
    .fr-btn:active{transform:translateY(1px)}
    .fr-btn-solid{background:var(--gold);color:var(--ink)}
    .fr-btn-solid:hover{background:color-mix(in srgb,var(--gold) 88%,white 12%)}
    .fr-btn-ghost{background:color-mix(in srgb,var(--gold) 4%,transparent);border-color:var(--line);color:var(--gold)}
    .fr-btn-ghost:hover{border-color:var(--gold-bright);color:var(--gold-bright)}
    .fr-btn:focus-visible,input:focus-visible,button:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  </style>
</head>`;

/* ------------------------------------------------------------------ login */
function loginPage(message) {
  return `${HEAD}
<body>
  <main class="fr-login">
    <div class="fr-card">
      <img class="fr-logo" src="/images/fob-emblem.png" alt="FOB Systems" />
      <p class="fr-eyebrow">FOB Systems</p>
      <h1>MAH INQUIRIES</h1>
      <form id="fr-form" novalidate>
        <label class="fr-label" for="fr-pw">Password</label>
        <div class="fr-pw-wrap">
          <input id="fr-pw" name="password" type="password" autocomplete="current-password"
                 autocapitalize="off" autocorrect="off" spellcheck="false" required />
          <button type="button" id="fr-show" class="fr-show" aria-pressed="false">Show</button>
        </div>
        <p class="fr-error" id="fr-error" role="alert">${message || ''}</p>
        <button type="submit" class="fr-btn fr-btn-solid fr-full" id="fr-submit">Log In</button>
      </form>
      <a class="fr-back" href="/">Back to FOB Systems</a>
    </div>
  </main>
  <style>
    .fr-login{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px 20px;
      background:radial-gradient(ellipse 70% 55% at 50% 0%,color-mix(in srgb,var(--gold) 7%,transparent),transparent 65%),var(--ink)}
    .fr-card{width:100%;max-width:400px;text-align:center;
      background:linear-gradient(150deg,color-mix(in srgb,var(--gold) 7%,transparent),rgba(18,22,26,.92));
      border:1px solid var(--line);border-radius:3px;padding:clamp(26px,5vw,40px);
      box-shadow:0 24px 60px rgba(0,0,0,.45)}
    .fr-logo{width:88px;height:auto;display:block;margin:0 auto 18px;
      filter:drop-shadow(0 6px 20px rgba(0,0,0,.5))}
    .fr-card h1{font-family:var(--display);font-size:clamp(26px,6vw,32px);font-weight:600;
      letter-spacing:.01em;color:var(--cream);margin:10px 0 26px}
    .fr-label{display:block;text-align:left;font-family:var(--display);font-size:10.5px;
      font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:9px}
    .fr-pw-wrap{position:relative;display:flex;align-items:center}
    #fr-pw{width:100%;background:rgba(12,14,17,.85);border:1px solid var(--line);border-radius:2px;
      color:var(--text);font-family:var(--body);font-size:16px;padding:14px 74px 14px 14px;min-height:48px}
    #fr-pw:hover{border-color:color-mix(in srgb,var(--gold) 45%,transparent)}
    #fr-pw:focus{outline:none;border-color:var(--gold-bright)}
    .fr-show{position:absolute;right:7px;background:none;border:none;cursor:pointer;
      font-family:var(--display);font-size:10px;letter-spacing:.16em;text-transform:uppercase;
      color:var(--gold-dim);padding:9px 8px;min-height:38px}
    .fr-show:hover{color:var(--gold-bright)}
    .fr-error{min-height:19px;margin:11px 0 4px;text-align:left;font-size:13px;color:#D99A8A}
    .fr-full{width:100%;margin-top:10px}
    .fr-back{display:inline-block;margin-top:22px;font-family:var(--display);font-size:10.5px;
      letter-spacing:.16em;text-transform:uppercase;color:var(--muted);text-decoration:none;
      border-bottom:1px solid color-mix(in srgb,var(--gold) 25%,transparent);padding-bottom:3px}
    .fr-back:hover{color:var(--gold)}
  </style>
  <script>
    (function(){
      var form=document.getElementById('fr-form'),pw=document.getElementById('fr-pw'),
          err=document.getElementById('fr-error'),btn=document.getElementById('fr-submit'),
          show=document.getElementById('fr-show');
      show.addEventListener('click',function(){
        var hidden=pw.type==='password';
        pw.type=hidden?'text':'password';
        show.textContent=hidden?'Hide':'Show';
        show.setAttribute('aria-pressed',hidden?'true':'false');
        pw.focus();
      });
      form.addEventListener('submit',function(e){
        e.preventDefault();
        err.textContent='';
        btn.disabled=true;btn.textContent='Checking';
        fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({password:pw.value})})
          .then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d};});})
          .then(function(res){
            if(res.ok){ window.location.replace('/form-review'); return; }
            err.textContent=(res.d&&res.d.error)||'That password is not correct.';
            btn.disabled=false;btn.textContent='Log In';pw.select();
          })
          .catch(function(){
            err.textContent='We could not reach the server. Please try again.';
            btn.disabled=false;btn.textContent='Log In';
          });
      });
    })();
  </script>
</body></html>`;
}

/* -------------------------------------------------------------- dashboard */
function dashboardPage() {
  return `${HEAD}
<body>
  <header class="fr-top">
    <div class="fr-top-in">
      <div class="fr-top-brand">
        <span class="fr-eyebrow">FOB ADMIN · MAH INQUIRIES</span>
      </div>
      <div class="fr-top-actions">
        <a class="fr-btn fr-btn-ghost fr-sm" href="/admin">Admin</a>
        <a class="fr-btn fr-btn-ghost fr-sm" href="/calendar-admin">Session Calendar</a>
        <a class="fr-btn fr-btn-ghost fr-sm" href="/fob-payment">Members Edit</a>
        <button class="fr-btn fr-btn-ghost fr-sm" id="fr-avail">Availability</button>
        <button class="fr-btn fr-btn-ghost fr-sm" id="fr-refresh">Refresh</button>
        <button class="fr-btn fr-btn-ghost fr-sm fr-danger" id="fr-clear">Clear All</button>
        <button class="fr-btn fr-btn-ghost fr-sm" id="fr-logout">Log Out</button>
      </div>
    </div>
  </header>

  <div class="fr-modal" id="fr-clear-modal" hidden role="dialog" aria-modal="true" aria-labelledby="fr-clear-title">
    <div class="fr-modal-back" data-clear-close></div>
    <div class="fr-modal-panel fr-clear-panel">
      <button class="fr-modal-x" data-clear-close aria-label="Cancel">&times;</button>

      <div id="fr-clear-step1">
        <p class="fr-eyebrow">Step 1 of 2</p>
        <h2 id="fr-clear-title">Delete every response?</h2>
        <p class="fr-clear-warn">This permanently deletes <b id="fr-clear-n">all</b> stored inquiries, including names and contact details. It cannot be undone, and anyone you have not contacted yet will be unreachable.</p>
        <div class="fr-clear-actions">
          <button class="fr-btn fr-btn-ghost" data-clear-close>Cancel</button>
          <button class="fr-btn fr-btn-ghost fr-danger" id="fr-clear-next">Continue</button>
        </div>
      </div>

      <div id="fr-clear-step2" hidden>
        <p class="fr-eyebrow">Step 2 of 2</p>
        <h2>Last check.</h2>
        <p class="fr-clear-warn">Type <b>DELETE</b> below to confirm. Make sure you have already reached out to everyone on the list.</p>
        <input id="fr-clear-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Type DELETE to confirm" placeholder="DELETE" />
        <div class="fr-clear-actions">
          <button class="fr-btn fr-btn-ghost" data-clear-close>Cancel</button>
          <button class="fr-btn fr-btn-ghost fr-danger" id="fr-clear-go" disabled>Delete everything</button>
        </div>
        <p class="fr-clear-status" id="fr-clear-status" aria-live="polite"></p>
      </div>
    </div>
  </div>

  <div class="fr-modal" id="fr-avail-modal" hidden role="dialog" aria-modal="true" aria-labelledby="fr-avail-title">
    <div class="fr-modal-back" data-avail-close></div>
    <div class="fr-modal-panel fr-avail-panel">
      <button class="fr-modal-x" data-avail-close aria-label="Close">&times;</button>
      <h2 id="fr-avail-title">Session availability</h2>
      <p class="fr-avail-note">Whatever you set here is what visitors can book. Times are Eastern.</p>

      <div class="fr-avail-sec">
        <h3>Hours</h3><button class="fr-btn fr-btn-ghost fr-sm" id="fr-expand" type="button">Full week</button><button class="fr-btn fr-btn-ghost fr-sm" id="fr-undo" type="button" disabled>Undo</button><button class="fr-btn fr-btn-ghost fr-sm" id="fr-print-week" type="button">Print week</button>
        <p class="fr-avail-note">Drag down a day to paint the hours you are free. Drag back over gold to clear it. Every day is a weekly rule, so Tuesday means every Tuesday.</p>
        <div id="fr-rules" class="fr-avail-list"><p class="fr-avail-empty">Loading...</p></div>
      </div>

      <div class="fr-avail-sec">
        <h3>Rules</h3>
        <div class="fr-avail-grid">
          <label>Session length
            <input type="number" id="fr-set-len" min="15" max="240" step="5" />
          </label>
          <label>Travel buffer
            <input type="number" id="fr-set-buf" min="0" max="180" step="5" />
          </label>
          <label>Notice needed (hours)
            <input type="number" id="fr-set-lead" min="0" max="168" />
          </label>
          <label class="fr-avail-check">
            <input type="checkbox" id="fr-set-open" />
            <span>Accepting bookings</span>
          </label>
        </div>
        <button class="fr-btn fr-btn-ghost fr-sm" id="fr-set-save">Save rules</button>
      </div>

      <div class="fr-avail-sec">
        <h3>Parks <span class="fr-avail-note" id="fr-park-count"></span></h3>
        <p class="fr-avail-note">Every Brooklyn and Manhattan park. Switch one off to stop people booking it.</p>
        <input type="search" id="fr-park-q" placeholder="Filter by name or borough" aria-label="Filter parks" />
        <div id="fr-parks" class="fr-avail-list fr-avail-scroll"></div>
      </div>

      <p class="fr-clear-status" id="fr-avail-status" aria-live="polite"></p>
    </div>
  </div>

  <main class="fr-main">
    <div class="fr-head">
      <h1>Inquiry Responses</h1>
      <p class="fr-count" id="fr-count">Loading</p>
    </div>

    <nav class="fr-groups" id="fr-groups" aria-label="Filter by inquiry type"></nav>

    <div class="fr-tools">
      <input id="fr-search" type="search" placeholder="Search name, email, phone, or Instagram" aria-label="Search responses" />
      <select id="fr-filter" aria-label="Filter by form"><option value="">All forms</option></select>
    </div>

    <div id="fr-state" class="fr-state">Loading responses.</div>
    <div id="fr-list" class="fr-list" hidden></div>
  </main>

  <div class="fr-modal" id="fr-modal" hidden role="dialog" aria-modal="true" aria-labelledby="fr-modal-title">
    <div class="fr-modal-back" data-close></div>
    <div class="fr-modal-panel">
      <button class="fr-modal-x" data-close aria-label="Close detail view">&times;</button>
      <p class="fr-eyebrow" id="fr-modal-kicker"></p>
      <h2 id="fr-modal-title">Response</h2>
      <div id="fr-modal-body"></div>
    </div>
  </div>

  <style>
    .fr-top{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--ink) 94%,transparent);
      backdrop-filter:blur(10px);border-bottom:1px solid var(--line-soft)}
    body.coach-shell-mounted .fr-top{top:var(--coach-crown-h)}
    body.coach-shell-mounted.coach-shell-collapsed .fr-top{top:var(--coach-crown-collapsed-h)}
    .fr-top-in{width:min(980px,100%);margin:0 auto;padding:10px 16px;display:grid;
      grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px}
    .fr-top-brand{display:flex;align-items:center;min-width:0}
    .fr-top-brand .fr-eyebrow{white-space:normal;color:var(--gold)}
    .fr-top-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;min-width:0}
    .fr-sm{padding:9px 12px;min-height:42px;font-size:9px;letter-spacing:.14em}
    .fr-main{width:min(980px,100%);margin:0 auto;padding:clamp(22px,4vw,38px) 16px max(80px,calc(env(safe-area-inset-bottom) + 54px))}
    .fr-head{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:22px}
    .fr-head h1{font-family:var(--display);font-size:clamp(26px,4.6vw,40px);font-weight:600;color:var(--cream)}
    .fr-count{font-family:var(--display);font-size:11px;letter-spacing:.2em;
      text-transform:uppercase;color:var(--gold-dim)}
    .fr-tools{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px}
    #fr-search,#fr-filter{background:color-mix(in srgb,var(--ink) 88%,white 2%);border:1px solid var(--line);border-radius:2px;
      color:var(--text);font-family:var(--body);font-size:15px;padding:12px 14px;min-height:48px}
    #fr-search{flex:1 1 260px}
    #fr-filter{flex:0 0 auto}
    #fr-search:focus,#fr-filter:focus{outline:none;border-color:var(--gold-bright)}
    .fr-state{padding:44px 20px;text-align:center;color:var(--muted);font-size:15px;
      border:1px solid var(--line);border-radius:3px;background:rgba(12,14,17,.5)}
    .fr-state.err{color:#D99A8A}
    .fr-list{display:flex;flex-direction:column;gap:10px}
    .fr-row{width:100%;text-align:left;cursor:pointer;display:grid;gap:4px 18px;
      grid-template-columns:150px 1.1fr 1.1fr 1fr;align-items:center;
      background:linear-gradient(150deg,color-mix(in srgb,var(--gold) 5%,transparent),rgba(14,16,20,.92));
      border:1px solid var(--line);border-radius:2px;padding:15px 18px;
      color:var(--text);font-family:var(--body);font-size:14.5px;
      transition:border-color .2s,transform .16s ease,background .2s}
    .fr-row:hover{border-color:color-mix(in srgb,var(--gold) 50%,transparent);transform:translateY(-1px)}
    .fr-cell-label{display:none;font-family:var(--display);font-size:9.5px;letter-spacing:.2em;
      text-transform:uppercase;color:var(--gold-dim);margin-bottom:2px}
    .fr-when{font-family:var(--display);font-size:12px;letter-spacing:.06em;color:var(--gold-dim)}
    .fr-who{color:var(--cream);font-weight:500}
    .fr-tag{display:inline-block;font-family:var(--display);font-size:9.5px;letter-spacing:.18em;
      text-transform:uppercase;color:var(--gold);border:1px solid var(--line);
      border-radius:2px;padding:4px 10px}
    .fr-trunc{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)}
    @media(max-width:820px){
      .fr-row{grid-template-columns:1fr;gap:11px}
      .fr-cell-label{display:block}
      .fr-trunc{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
    }
    .fr-modal{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:20px}
    .fr-modal[hidden]{display:none}
    .fr-danger{border-color:rgba(190,110,95,.45);color:#D9A196}
    .fr-danger:hover{border-color:#C9705F;color:#F0B7AA;background:rgba(190,110,95,.1)}
    .fr-clear-panel{max-width:520px}
    /* Availability editor. Same panel language as the clear dialog so it
       reads as part of the same tool, not a bolted-on settings screen. */
    .fr-avail-panel{max-width:640px;max-height:86vh;max-height:86dvh;overflow-y:auto}
    .fr-avail-note{font-size:13px;color:var(--muted);line-height:1.55;font-weight:400}
    .fr-avail-sec{margin-top:24px;padding-top:18px;border-top:1px solid var(--line)}
    .fr-avail-sec h3{font-family:var(--display);font-size:14px;letter-spacing:.06em;
      text-transform:uppercase;color:var(--gold);margin-bottom:10px}
    #fr-rules{min-width:0;max-width:100%}
.fr-avail-list{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
    .fr-avail-scroll{max-height:300px;overflow-y:auto}
    .wk{user-select:none;-webkit-user-select:none;
  -webkit-tap-highlight-color:transparent}
.wk-scroll{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;
  padding-bottom:6px;max-width:100%;overscroll-behavior-x:contain;scroll-snap-type:x proximity}
.wk-scroll::-webkit-scrollbar{height:5px}
.wk-scroll::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--gold) 40%,transparent);border-radius:5px}
.wk-scroll::-webkit-scrollbar-track{background:rgba(255,255,255,.04);border-radius:5px}
.wk-col{scroll-snap-align:start}
/* full week, edge to edge. Rotate the phone and it simply gets wider. */
.wk-full{position:fixed;inset:0;z-index:9999;background:var(--ink);padding:14px 12px;overflow:auto}
.wk-full .wk-inner{min-width:0;width:100%}
.wk-full .wk-scroll{overflow-x:visible}
.wk-full .wk-body,.wk-full .wk-head{grid-template-columns:44px repeat(7,minmax(0,1fr))}
.wk-full .wk-foot{display:none}
.fr-expand-close{position:sticky;top:0;float:right;z-index:3;margin-bottom:6px}
.wk-inner{min-width:520px}
.wk-head{display:grid;grid-template-columns:46px repeat(7,minmax(56px,1fr));gap:4px;margin-bottom:8px}
.wk-dh{text-align:center;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);font-weight:600}
.wk-body{display:grid;grid-template-columns:46px repeat(7,minmax(56px,1fr));gap:4px;touch-action:pan-x}
.wk-gutter{display:flex;flex-direction:column}
.wk-hr{height:22px;font:500 10px/22px ui-monospace,monospace;color:#8d867a;text-align:right;padding-right:7px}
.wk-col{display:flex;flex-direction:column;border-radius:2px;overflow:hidden;
  border:1px solid rgba(190,90,80,.26);
  background:repeating-linear-gradient(135deg,rgba(190,90,80,.15) 0 6px,rgba(190,90,80,.06) 6px 12px)}
.wk-cell{height:22px;cursor:pointer;touch-action:pan-x;transition:background .08s ease}
.wk-cell.hour{box-shadow:inset 0 1px 0 color-mix(in srgb,var(--gold) 14%,transparent)}
.wk-cell.on{background:linear-gradient(180deg,var(--gold),color-mix(in srgb,var(--gold) 78%,var(--ink) 22%))}
.wk-cell:active{filter:brightness(1.25)}
.wk-cell.on+.wk-cell.on{border-top:0}
.wk-foot{margin-top:14px;display:grid;gap:7px}
.wk-fd{display:flex;justify-content:space-between;gap:12px;font-size:12px;
  padding-bottom:6px;border-bottom:1px solid color-mix(in srgb,var(--gold) 9%,transparent)}
.wk-fd b{color:#F3ECE0;font-weight:600}
.wk-fd .wk-sum{font:500 11px/1.5 ui-monospace,monospace;color:#9d968a;text-align:right}
.fr-day.is-off .fr-win{padding:12px;margin-bottom:10px;background:var(--surface);
      border:1px solid var(--line);border-radius:2px}
    .fr-win-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .fr-win-top input[type=time]{background:var(--ink);border:1px solid var(--line);
      color:var(--text);font-family:var(--body);font-size:14px;padding:8px 10px;
      border-radius:2px;min-height:40px}
    .fr-win-to{color:var(--muted);font-size:13px}
    .fr-win-top .fr-avail-x{margin-left:auto}
    .fr-win-note{font-size:12.5px;color:var(--muted);align-self:center}
    #fr-park-q{width:100%;box-sizing:border-box;background:var(--surface);
      border:1px solid var(--line);color:var(--text);font-family:var(--body);
      font-size:14px;padding:10px 12px;border-radius:2px;min-height:44px;margin-bottom:10px}
    .fr-avail-empty{font-size:13.5px;color:var(--muted)}
    .fr-avail-item{display:flex;align-items:center;gap:10px;padding:10px 12px;
      background:var(--surface);border:1px solid var(--line);border-radius:2px;font-size:14px}
    .fr-avail-item span{flex:1;min-width:0}
    .fr-avail-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .fr-avail-row input,.fr-avail-row select{background:var(--surface);border:1px solid var(--line);
      color:var(--text);font-family:var(--body);font-size:14px;padding:9px 10px;border-radius:2px;
      min-height:42px}
    .fr-avail-row input[type=text]{flex:1;min-width:130px}
    .fr-avail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
      gap:12px;margin-bottom:14px}
    .fr-avail-grid label{display:flex;flex-direction:column;gap:5px;font-size:13px;color:var(--muted)}
    .fr-avail-grid input[type=number]{background:var(--surface);border:1px solid var(--line);
      color:var(--text);font-family:var(--body);font-size:15px;padding:9px 10px;border-radius:2px;
      min-height:42px}
    .fr-avail-check{flex-direction:row!important;align-items:center;gap:9px}
    .fr-avail-check input{width:20px;height:20px}
    .fr-avail-x{background:none;border:none;color:var(--muted);cursor:pointer;font-size:19px;
      line-height:1;padding:4px 8px;min-height:36px}
    .fr-avail-x:hover{color:#E8B4A6}
    .fr-avail-toggle{display:flex;align-items:center;gap:9px;font-size:14px}
    .fr-avail-toggle input{width:20px;height:20px}
    .fr-clear-warn{font-size:14.5px;line-height:1.65;color:var(--muted);margin:14px 0 20px}
    .fr-clear-warn b{color:#E8B4A6}
    .fr-clear-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
    #fr-clear-input{width:100%;background:rgba(23,26,30,.85);color:var(--cream);
      border:1px solid color-mix(in srgb,var(--gold) 25%,transparent);border-radius:2px;padding:12px 14px;
      font-family:var(--display);font-size:14px;letter-spacing:.18em;text-transform:uppercase}
    #fr-clear-input:focus-visible{outline:none;border-color:var(--gold-bright)}
    .fr-clear-status{margin-top:14px;font-size:13px;color:var(--muted);min-height:1em}
    .fr-groups{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
    .fr-group{display:inline-flex;align-items:center;gap:8px;cursor:pointer;
      font-family:var(--display);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
      color:color-mix(in srgb,var(--cream) 80%,var(--muted) 20%);background:linear-gradient(180deg,color-mix(in srgb,var(--gold) 5%,transparent),transparent),color-mix(in srgb,var(--ink) 92%,white 8%);
      border:1px solid color-mix(in srgb,var(--gold) 20%,transparent);border-radius:2px;padding:9px 13px;
      transition:color .2s,border-color .2s,background .2s}
    .fr-group:hover{color:var(--gold-bright);border-color:color-mix(in srgb,var(--gold) 45%,transparent)}
    .fr-group:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
    .fr-group.on{color:var(--cream);border-color:var(--gold);
      background:linear-gradient(180deg,color-mix(in srgb,var(--gold) 16%,transparent),color-mix(in srgb,var(--gold) 5%,transparent)),color-mix(in srgb,var(--ink) 92%,white 8%);
      box-shadow:inset 0 1px 0 color-mix(in srgb,var(--gold) 25%,transparent)}
    .fr-group b{font-weight:600;color:var(--gold-bright);font-size:11.5px}
    .fr-group.on b{color:var(--cream)}
    .fr-modal-back{position:absolute;inset:0;background:rgba(8,10,12,.84);backdrop-filter:blur(5px)}
    .fr-modal-panel{position:relative;width:min(680px,100%);max-height:88vh;overflow-y:auto;
      background:var(--tone-gold);border:1px solid var(--line);border-radius:3px;
      padding:clamp(24px,4vw,36px);box-shadow:0 30px 90px rgba(0,0,0,.6)}
    .fr-modal-panel h2{font-family:var(--display);font-size:clamp(21px,3.6vw,27px);
      font-weight:600;color:var(--cream);margin:8px 0 20px}
    .fr-modal-x{position:absolute;top:12px;right:16px;background:none;border:none;cursor:pointer;
      color:var(--muted);font-size:30px;line-height:1;padding:4px 8px}
    .fr-modal-x:hover{color:var(--gold-bright)}
    .fr-field{padding:13px 0;border-top:1px solid color-mix(in srgb,var(--gold) 14%,transparent)}
    .fr-field:first-child{border-top:none}
    .fr-field dt{font-family:var(--display);font-size:10px;letter-spacing:.2em;
      text-transform:uppercase;color:var(--gold);margin-bottom:6px}
    .fr-field dd{font-size:15.5px;line-height:1.6;color:var(--text);white-space:pre-wrap;word-break:break-word}
    @media(max-width:720px){
      .fr-top{position:relative;top:auto!important}
      .fr-top-in{grid-template-columns:1fr;padding:11px 14px 13px}
      .fr-top-brand{padding:2px 0 4px}
      .fr-top-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%;gap:7px}
      .fr-top-actions .fr-btn,.fr-top-actions a{width:100%;min-width:0;padding-inline:7px;white-space:normal;text-align:center}
      .fr-main{padding-left:14px;padding-right:14px}
      .fr-head{gap:8px;margin-bottom:17px}
      .fr-head h1{font-size:clamp(27px,8vw,36px)}
      .fr-tools{display:grid;grid-template-columns:1fr;gap:8px}
      #fr-search,#fr-filter{width:100%;min-width:0}
      .fr-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .fr-group{min-width:0;justify-content:center;padding-inline:7px;text-align:center}
      .fr-modal{padding:12px}
      .fr-modal-panel{width:100%;padding:20px 16px;max-height:calc(100dvh - 24px)}
      .fr-clear-actions{display:grid;grid-template-columns:1fr;gap:8px}
    }
    @media(max-width:390px){
      .fr-top-actions{grid-template-columns:1fr 1fr}
      .fr-sm{font-size:8.2px;letter-spacing:.11em}
    }
    @media(prefers-reduced-motion:reduce){.fr-row,.fr-btn{transition:none}}
  </style>

  <script>
  (function(){
    var LABELS={
      name:'Name',sport:'Primary interest',sportOther:'Sport (other)',
      preferredTime:'Preferred start time',preferredDay:'Preferred day',
      availabilityNotes:'Availability',flexibleSchedule:'Flexible schedule',
      contactMethod:'Contact method',phone:'Phone',instagram:'Instagram',email:'Email',
      message:'Notes',interest:'Interest',organizationName:'Organization',role:'Role',
      gymType:'Facility type',city:'Borough or city',participants:'Approx. participants',
      meetingFormat:'Preferred meeting format',eventName:'Event name',eventType:'Event type',
      eventLocation:'Event location',involvement:'Desired involvement',preferredDate:'Preferred date',
      audience:'Audience',audienceSize:'Audience size',outcome:'Desired outcome',
      format:'Presentation format',length:'Desired length',venue:'Location or virtual',
      locationArea:'Preferred area',locationId:'Training location',customLocation:'Custom location',
      competitiveLevel:'Competitive level',currentFrequency:'Current frequency',
      playEnough:'Plays as often as wanted',inquiryType:'Inquiry type',
      submittedAt:'Submitted (client time)',source:'Source form',consentToContact:'Consent to contact'
    };
    var HIDE=['form-name','bot-field','consentToContact','submittedAt','source',
              'parkId','parkLat','parkLng','locationId','requestedStart',
              'sourceForm','formName'];
    var all=[],view=[];
    var listEl=document.getElementById('fr-list'),stateEl=document.getElementById('fr-state'),
        countEl=document.getElementById('fr-count'),searchEl=document.getElementById('fr-search'),
        filterEl=document.getElementById('fr-filter'),modal=document.getElementById('fr-modal');

    /* Entity groups: which part of the site the inquiry came from.
       Purely organisational, every row still opens its real submission. */
    var GROUPS=[
      {id:'',            label:'All'},
      {id:'session',     label:'Sessions'},
      {id:'coach',       label:'Coach interest'},
      {id:'gym',         label:'Gyms'},
      {id:'privateGym',  label:'Private spaces'},
      {id:'outdoorEvent',label:'Events'},
      {id:'presentation',label:'Workshops'},
      {id:'individual',  label:'Individual'},
      {id:'athlete',     label:'Athletes'}
    ];
    var group='';
    function entityOf(it){
      var a=it.answers||{};
      return a.inquiryType||(it.formName==='fob-partners'?'gym':'session');
    }
    function renderGroups(){
      var counts={};
      all.forEach(function(it){var e=entityOf(it);counts[e]=(counts[e]||0)+1;});
      var host=document.getElementById('fr-groups');
      host.innerHTML=GROUPS.filter(function(g){
        return g.id===''||counts[g.id];
      }).map(function(g){
        var n=g.id===''?all.length:(counts[g.id]||0);
        return '<button type="button" class="fr-group'+(group===g.id?' on':'')+'" data-g="'+g.id+'"'+
               ' aria-pressed="'+(group===g.id)+'">'+esc(g.label)+' <b>'+n+'</b></button>';
      }).join('');
      Array.prototype.forEach.call(host.querySelectorAll('.fr-group'),function(b){
        b.addEventListener('click',function(){group=b.dataset.g;renderGroups();applyFilters();});
      });
    }

    function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
    function when(iso){
      if(!iso)return 'Unknown';
      var d=new Date(iso); if(isNaN(d))return 'Unknown';
      return d.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
    }
    var AREA_NAMES={'lower-manhattan':'Lower Manhattan','downtown-brooklyn':'Downtown Brooklyn',
      'central-brooklyn':'Central Brooklyn','north-brooklyn':'North Brooklyn','south-brooklyn':'South Brooklyn',
      'east-brooklyn':'East Brooklyn','western-queens':'Western Queens','central-queens':'Central Queens',
      'jamaica-eastern-queens':'Jamaica / Eastern Queens','brooklyn':'Brooklyn','queens':'Queens',
      'flexible':'Flexible','suggest':'Suggesting a location','have-space':'Has a possible space'};
    function locationOf(a){
      var area=a.locationArea?(AREA_NAMES[a.locationArea]||a.locationArea):'';
      var spec=a.customLocation||a.eventLocation||'';
      if(area&&spec)return area+' \u00b7 '+spec;
      return area||spec||'Not given';
    }
    function labelFor(id){
      for(var i=0;i<GROUPS.length;i++){if(GROUPS[i].id===id)return GROUPS[i].label.replace(/s$/,'');}
      return id||'Inquiry';
    }
    function who(a){return a.name||a.organizationName||a.eventName||'No name given';}
    function contact(a){return a.phone||a.instagram||a.email||'';}
    function primary(a){return a.sport||a.interest||a.involvement||a.audience||'';}
    function showState(msg,isErr){
      stateEl.textContent=msg; stateEl.hidden=false;
      stateEl.className='fr-state'+(isErr?' err':''); listEl.hidden=true;
    }

    function render(){
      if(!view.length){
        showState(all.length?'No responses match that search.':'No inquiry responses have been received yet.');
        return;
      }
      stateEl.hidden=true; listEl.hidden=false;
      listEl.innerHTML=view.map(function(it,i){
        var a=it.answers||{};
        return '<button class="fr-row" data-i="'+i+'">'+
          '<span><span class="fr-cell-label">Submitted</span><span class="fr-when">'+esc(when(it.receivedAt))+'</span></span>'+
          '<span><span class="fr-cell-label">Name</span><span class="fr-who">'+esc(who(a))+'</span></span>'+
          '<span><span class="fr-cell-label">Contact</span><span class="fr-trunc">'+esc(contact(a)||'Not given')+'</span></span>'+
          '<span><span class="fr-cell-label">Interest</span><span class="fr-trunc">'+esc(primary(a)||'')+'</span> <span class="fr-tag">'+esc(labelFor(entityOf(it)))+'</span></span>'+
          '<span><span class="fr-cell-label">Location</span><span class="fr-trunc">'+esc(locationOf(a))+'</span></span>'+
        '</button>';
      }).join('');
      Array.prototype.forEach.call(listEl.querySelectorAll('.fr-row'),function(b){
        b.addEventListener('click',function(){openDetail(view[+b.dataset.i]);});
      });
    }

    function openDetail(item){
      var a=item.answers||{};
      document.getElementById('fr-modal-kicker').textContent=labelFor(entityOf(item))+' \\u00b7 '+when(item.receivedAt);
      document.getElementById('fr-modal-title').textContent=who(a);
      var keys=Object.keys(a).filter(function(k){
        return HIDE.indexOf(k)===-1 && a[k]!=='' && a[k]!=null;
      });
      /* Ordered by what you need first when you open one of these:
         who it is and how to reach them, then what they asked for,
         then the booking specifics. Anything not listed keeps its
         original order at the end, so a new field is never dropped. */
      var ORDER=['name','organizationName','role','contactMethod','phone','email',
                 'instagram','city','inquiryFocus','gymType','eventType','eventName',
                 'participants','audience','audienceSize','sport','sportOther',
                 'recreationalActive','interest','experience','currentFrequency',
                 'competitiveLevel','trainingFormat','meetingFormat','involvement',
                 'bookingReference','requestedDate','preferredDay','preferredTime',
                 'timezone','parkName','parkNeighborhood','parkAddress',
                 'meetingInstructions','locationArea','customLocation','eventLocation',
                 'preferredDate','availabilityNotes','flexibleSchedule','message'];
      keys.sort(function(x,y){
        var ix=ORDER.indexOf(x), iy=ORDER.indexOf(y);
        if(ix===-1&&iy===-1) return 0;
        if(ix===-1) return 1;
        if(iy===-1) return -1;
        return ix-iy;
      });
      document.getElementById('fr-modal-body').innerHTML='<dl>'+keys.map(function(k){
        return '<div class="fr-field"><dt>'+esc(LABELS[k]||k)+'</dt><dd>'+esc(a[k])+'</dd></div>';
      }).join('')+
      '<div class="fr-field"><dt>Received</dt><dd>'+esc(when(item.receivedAt))+'</dd></div>'+
      '<div class="fr-field"><dt>Source form</dt><dd>'+esc(item.formName||'inquiry')+
        (item.flagged?' <b style="color:#E8B4A6">(was filtered as spam)</b>':'')+
        '</dd></div></dl>';
      modal.hidden=false; document.body.style.overflow='hidden';
      modal.querySelector('.fr-modal-x').focus();
    }
    function closeDetail(){modal.hidden=true;document.body.style.overflow='';}
    modal.addEventListener('click',function(e){if(e.target.hasAttribute('data-close'))closeDetail();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!modal.hidden)closeDetail();});

    function applyFilters(){
      var q=(searchEl.value||'').trim().toLowerCase(), f=filterEl.value;
      view=all.filter(function(it){
        if(group&&entityOf(it)!==group)return false;
        if(f&&it.formName!==f)return false;
        if(!q)return true;
        var a=it.answers||{};
        return [a.name,a.organizationName,a.eventName,a.email,a.phone,a.instagram]
          .filter(Boolean).join(' ').toLowerCase().indexOf(q)>-1;
      });
      countEl.textContent=view.length===all.length
        ? all.length+(all.length===1?' response':' responses')
        : view.length+' of '+all.length+' responses';
      render();
    }
    searchEl.addEventListener('input',applyFilters);
    filterEl.addEventListener('change',applyFilters);

    /* Clear all history: two explicit confirmations before anything is deleted. */
    var clearModal=document.getElementById('fr-clear-modal'),
        clearStep1=document.getElementById('fr-clear-step1'),
        clearStep2=document.getElementById('fr-clear-step2'),
        clearInput=document.getElementById('fr-clear-input'),
        clearGo=document.getElementById('fr-clear-go'),
        clearStatus=document.getElementById('fr-clear-status');

    function closeClear(){
      clearModal.hidden=true; document.body.style.overflow='';
      clearStep1.hidden=false; clearStep2.hidden=true;
      clearInput.value=''; clearGo.disabled=true; clearStatus.textContent='';
    }
    document.getElementById('fr-clear').addEventListener('click',function(){
      if(!all.length){ showState('There is nothing to clear yet.'); return; }
      document.getElementById('fr-clear-n').textContent=all.length+(all.length===1?' response':' responses');
      clearModal.hidden=false; document.body.style.overflow='hidden';
      clearModal.querySelector('#fr-clear-next').focus();
    });
    clearModal.addEventListener('click',function(e){
      if(e.target.hasAttribute('data-clear-close'))closeClear();
    });
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&!clearModal.hidden)closeClear();
    });
    document.getElementById('fr-clear-next').addEventListener('click',function(){
      clearStep1.hidden=true; clearStep2.hidden=false; clearInput.focus();
    });
    clearInput.addEventListener('input',function(){
      clearGo.disabled=clearInput.value.trim().toUpperCase()!=='DELETE';
    });
    clearGo.addEventListener('click',function(){
      clearGo.disabled=true; clearStatus.textContent='Deleting.';
      fetch('/api/clear-responses',{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({confirm:'DELETE'})
      }).then(function(r){
        if(r.status===401){window.location.replace('/form-review');return null;}
        return r.json().then(function(d){ if(!r.ok)throw new Error(d.error||'failed'); return d; });
      }).then(function(d){
        if(!d)return;
        closeClear(); load();
      }).catch(function(err){
        clearGo.disabled=false;
        clearStatus.textContent=(err&&err.message)?err.message:'We could not clear the responses. Please try again.';
      });
    });

    function load(){
      showState('Loading responses.');
      countEl.textContent='Loading';
      fetch('/api/responses',{credentials:'same-origin',cache:'no-store'})
        .then(function(r){
          if(r.status===401){
            showState('Your session has expired. Please log in again.',true);
            setTimeout(function(){window.location.replace('/form-review');},1600);
            return null;
          }
          /* Read the server's explanation instead of discarding it.
             Throwing a bare Error here meant a token or permission
             problem showed as the same unhelpful line every time. */
          if(!r.ok){
            return r.json().then(function(d){
              throw new Error((d&&d.error)||'Netlify returned '+r.status+'.');
            },function(){
              throw new Error('The server returned '+r.status+'.');
            });
          }
          return r.json();
        })
        .then(function(d){
          if(!d)return;
          all=d.items||[];
          var forms=[];
          all.forEach(function(it){if(forms.indexOf(it.formName)===-1)forms.push(it.formName);});
          filterEl.innerHTML='<option value="">All forms</option>'+
            forms.map(function(f){return '<option value="'+esc(f)+'">'+esc(f)+'</option>';}).join('');
          filterEl.style.display='none';
          renderGroups();
          applyFilters();
        })
        .catch(function(err){
          countEl.textContent='';
          showState((err&&err.message)||'We could not load the responses. Please try again.',true);
        });
    }

    document.getElementById('fr-refresh').addEventListener('click',load);
    document.getElementById('fr-logout').addEventListener('click',function(){
      fetch('/api/logout',{method:'POST',credentials:'same-origin'})
        .then(function(){window.location.replace('/form-review');})
        .catch(function(){window.location.replace('/form-review');});
    });
    /* ---------------- availability ----------------------------
       Everything here goes through /api/booking-admin, which checks
       the same session cookie this page was served under. The browser
       never touches the availability tables directly. */
    var availModal = document.getElementById('fr-avail-modal');
    var availStatus = document.getElementById('fr-avail-status');
    var availState = {windows:[],parks:[],settings:null,max:0};

    function availSay(msg,bad){
      availStatus.textContent = msg || '';
      availStatus.style.color = bad ? '#E8B4A6' : 'var(--muted)';
    }

    function admin(payload){
      var opts = payload
        ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}
        : {};
      opts.cache = 'no-store';
      return fetch('/api/booking-admin?t=' + Date.now(),opts).then(function(r){
        return r.json().then(function(d){
          if(!r.ok) throw new Error(d.error||'That did not work.');
          return d;
        });
      });
    }

    function hhmm(t){ return (t||'').slice(0,5); }

    var DAYNAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var SHORTDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    /* The week grid is the editor now. Drag down a day to paint the hours you
       are free, drag over gold to clear it. A day is a weekly rule, so
       anything painted on Tuesday means every Tuesday. Each finished drag
       replaces that one day through set-day, which is why the picker and the
       printed sheet can never drift from what is on screen. */
    var GRID_START = 4 * 60, GRID_END = 21 * 60, STEP = 30;
    var ROWS = (GRID_END - GRID_START) / STEP;
    var painted = null;          /* day -> array of booleans, one per row */
    var undoStack = [];          /* snapshots of whole days, newest last */
    var paintMode = null, paintDay = null, dirtyDays = {}, gestureBefore = null;

    function mins(t){ var q = String(t || '0:0').slice(0,5).split(':'); return (+q[0]) * 60 + (+q[1]); }
    function pad(m){ return String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0'); }
    function pretty(m){
      var h = Math.floor(m/60), x = m % 60, ap = h < 12 ? 'AM' : 'PM', hh = h % 12 || 12;
      return hh + (x ? ':' + String(x).padStart(2,'0') : '') + ' ' + ap;
    }
    function blocksFor(day){
      var out = [];
      (availState.windows || []).forEach(function(w){
        var ds = w.weekdays || [];
        if (ds.length === 1 && ds[0] === day) out.push(w);
      });
      out.sort(function(a,b){ return mins(a.start_time) - mins(b.start_time); });
      return out;
    }
    /* windows -> cells */
    function loadPainted(){
      painted = [];
      for (var d = 0; d < 7; d++){
        var col = new Array(ROWS);
        for (var i = 0; i < ROWS; i++) col[i] = false;
        blocksFor(d).forEach(function(b){
          var a = mins(b.start_time), z = mins(b.end_time);
          for (var m = Math.max(a, GRID_START); m < Math.min(z, GRID_END); m += STEP){
            col[(m - GRID_START) / STEP] = true;
          }
        });
        painted.push(col);
      }
    }
    /* cells -> blocks */
    function blocksFromColumn(col){
      var out = [], run = null;
      for (var i = 0; i < ROWS; i++){
        if (col[i] && run === null) run = i;
        if ((!col[i] || i === ROWS - 1) && run !== null){
          var endRow = col[i] && i === ROWS - 1 ? i + 1 : i;
          out.push({ start_time: pad(GRID_START + run * STEP) + ':00',
                     end_time:   pad(GRID_START + endRow * STEP) + ':00' });
          run = null;
        }
      }
      return out;
    }
    function daySummary(d){
      var b = blocksFromColumn(painted[d]);
      if (!b.length) return 'Closed';
      return b.map(function(x){ return pretty(mins(x.start_time)) + ' to ' + pretty(mins(x.end_time)); }).join(',  ');
    }

    function paintCell(d, row, on){
      if (!painted[d] || row < 0 || row >= ROWS) return;
      if (painted[d][row] === on) return;
      painted[d][row] = on;
      dirtyDays[d] = true;
      var cell = document.querySelector('.wk-cell[data-d="' + d + '"][data-r="' + row + '"]');
      if (cell) cell.classList.toggle('on', on);
      var sum = document.querySelector('.wk-sum[data-d="' + d + '"]');
      if (sum) sum.textContent = daySummary(d);
    }

    /* One entry per gesture, holding the days it touched exactly as they
       were beforehand. Undo replays that snapshot through the same set-day
       call a drag uses, so there is no second path to keep in step. */
    function pushUndo(days, before){
      undoStack.push({ days: days.slice(), cols: before });
      if (undoStack.length > 25) undoStack.shift();
      var b = document.getElementById('fr-undo');
      if (b) { b.disabled = false; b.textContent = 'Undo (' + undoStack.length + ')'; }
    }
    function undoLast(){
      var last = undoStack.pop();
      var b = document.getElementById('fr-undo');
      if (b) { b.disabled = !undoStack.length; b.textContent = undoStack.length ? 'Undo (' + undoStack.length + ')' : 'Undo'; }
      if (!last) return;
      last.days.forEach(function(d, i){ painted[d] = last.cols[i].slice(); dirtyDays[d] = true; });
      drawRules();
      commitDirty(true);
      availSay('Reverted ' + last.days.map(function(d){ return SHORTDAYS[d]; }).join(', ') + '.');
    }

    function commitDirty(skipUndo){
      var days = Object.keys(dirtyDays).map(Number);
      dirtyDays = {};
      if (!days.length) return;
      if (!skipUndo && gestureBefore) {
        pushUndo(days, days.map(function(d){ return gestureBefore[d] || painted[d].slice(); }));
      }
      gestureBefore = null;
      availSay('Saving...');
      var chain = Promise.resolve();
      days.forEach(function(d){
        chain = chain.then(function(){
          return admin({ action:'set-day', day:d, blocks:blocksFromColumn(painted[d]) })
            .then(function(res){
              /* keep local state in step with what the server stored */
              availState.windows = (availState.windows || []).filter(function(w){
                return !(w.weekdays && w.weekdays.length === 1 && w.weekdays[0] === d);
              }).concat(res.windows || []);
            });
        });
      });
      chain.then(function(){
        availSay('Saved. ' + days.map(function(d){ return SHORTDAYS[d] + ' ' + daySummary(d); }).join('   '));
      }).catch(function(e){ availSay(e.message, true); });
    }

    function drawRules(){
      var host = document.getElementById('fr-rules');
      if (!painted) loadPainted();
      host.innerHTML = '';

      var scroll = document.createElement('div');
      scroll.className = 'wk-scroll';
      var wrap = document.createElement('div');
      wrap.className = 'wk wk-inner';

      var head = document.createElement('div');
      head.className = 'wk-head';
      head.appendChild(document.createElement('span'));      /* gutter */
      for (var d = 0; d < 7; d++){
        var h = document.createElement('div');
        h.className = 'wk-dh';
        h.innerHTML = '<b>' + SHORTDAYS[d] + '</b>';
        head.appendChild(h);
      }
      wrap.appendChild(head);

      var body = document.createElement('div');
      body.className = 'wk-body';

      var gutter = document.createElement('div');
      gutter.className = 'wk-gutter';
      for (var r = 0; r < ROWS; r++){
        var lab = document.createElement('div');
        lab.className = 'wk-hr';
        if (((GRID_START + r * STEP) % 60) === 0) lab.textContent = pretty(GRID_START + r * STEP);
        gutter.appendChild(lab);
      }
      body.appendChild(gutter);

      for (var d2 = 0; d2 < 7; d2++){
        var col = document.createElement('div');
        col.className = 'wk-col';
        col.setAttribute('data-d', d2);
        for (var r2 = 0; r2 < ROWS; r2++){
          var c = document.createElement('div');
          c.className = 'wk-cell' + (painted[d2][r2] ? ' on' : '')
                      + (((GRID_START + r2 * STEP) % 60) === 0 ? ' hour' : '');
          c.setAttribute('data-d', d2); c.setAttribute('data-r', r2);
          c.setAttribute('role','button');
          c.setAttribute('aria-label', SHORTDAYS[d2] + ' ' + pretty(GRID_START + r2 * STEP));
          col.appendChild(c);
        }
        body.appendChild(col);
      }
      wrap.appendChild(body);

      var foot = document.createElement('div');
      foot.className = 'wk-foot';
      for (var d3 = 0; d3 < 7; d3++){
        var f = document.createElement('div');
        f.className = 'wk-fd';
        f.innerHTML = '<b>' + DAYNAMES[d3] + '</b><span class="wk-sum" data-d="' + d3 + '">'
                    + daySummary(d3) + '</span>';
        foot.appendChild(f);
      }
      wrap.appendChild(foot);
      scroll.appendChild(wrap);
      host.appendChild(scroll);

      /* One pointer handler for the whole grid: press sets the mode from the
         cell you started on, so dragging across gold erases and dragging
         across empty paints. */
      function cellAt(x, y){
        var el = document.elementFromPoint(x, y);
        return el && el.classList && el.classList.contains('wk-cell') ? el : null;
      }
      function apply(el){
        if (!el) return;
        var d = +el.getAttribute('data-d'), r = +el.getAttribute('data-r');
        if (paintDay === null) paintDay = d;
        if (d !== paintDay) return;
        paintCell(d, r, paintMode);
      }
      /* Painting runs down a day and scrolling runs across the week, so the
         axis of the first few pixels decides which one you get. Nothing is
         painted until that choice is made, which leaves the browser free to
         scroll horizontally at its own speed. */
      var downX = 0, downY = 0, axis = null, startCell = null;
      body.addEventListener('pointerdown', function(ev){
        var el = ev.target.classList && ev.target.classList.contains('wk-cell') ? ev.target : null;
        if (!el) return;
        downX = ev.clientX; downY = ev.clientY; axis = null; startCell = el;
        paintMode = null; paintDay = null;
      });
      body.addEventListener('pointermove', function(ev){
        if (!startCell) return;
        if (axis === null){
          var dx = Math.abs(ev.clientX - downX), dy = Math.abs(ev.clientY - downY);
          if (dx < 5 && dy < 5) return;
          axis = dy > dx ? 'paint' : 'scroll';
          if (axis === 'paint'){
            paintMode = !startCell.classList.contains('on');
            paintDay = +startCell.getAttribute('data-d');
            gestureBefore = {}; gestureBefore[paintDay] = painted[paintDay].slice();
            apply(startCell);
            try { body.setPointerCapture(ev.pointerId); } catch(e){}
          }
        }
        if (axis !== 'paint') return;
        ev.preventDefault();
        apply(cellAt(ev.clientX, ev.clientY));
      });
      function stop(ev){
        var wasPainting = axis === 'paint';
        axis = null; startCell = null; paintDay = null;
        try { body.releasePointerCapture(ev.pointerId); } catch(e){}
        if (wasPainting){ paintMode = null; commitDirty(); }
        else paintMode = null;
      }
      body.addEventListener('pointerup', stop);
      body.addEventListener('pointercancel', stop);
      body.addEventListener('click', function(ev){
        var el = ev.target.classList && ev.target.classList.contains('wk-cell') ? ev.target : null;
        if (!el || paintMode !== null) return;
        var d = +el.getAttribute('data-d'), r = +el.getAttribute('data-r');
        gestureBefore = {}; gestureBefore[d] = painted[d].slice();
        paintCell(d, r, !el.classList.contains('on'));
        commitDirty();
      });
    }

    /* A week at a glance, built from the same blocks the picker reads, so
       the sheet can never disagree with what people can actually book.
       Gold is free, red is not. Opens as its own document so printing it
       does not drag the dashboard along. */
    function printWeek(){
      var DN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      var SH = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      var mins = function(t){ var q = String(t||'0:0').slice(0,5).split(':'); return (+q[0])*60 + (+q[1]); };
      var pad  = function(m){ var h = Math.floor(m/60), x = m%60;
        var ap = h < 12 ? 'AM' : 'PM', hh = h % 12; if (!hh) hh = 12;
        return hh + (x ? ':' + String(x).padStart(2,'0') : '') + ' ' + ap; };

      var byDay = [], lo = 24*60, hi = 0, any = false;
      for (var d = 0; d < 7; d++){
        var bl = blocksFor(d).map(function(b){ return { a: mins(b.start_time), z: mins(b.end_time) }; })
                             .sort(function(x,y){ return x.a - y.a; });
        byDay.push(bl);
        bl.forEach(function(b){ any = true; if (b.a < lo) lo = b.a; if (b.z > hi) hi = b.z; });
      }
      if (!any) { lo = 6*60; hi = 22*60; }
      /* a little air above and below so the first and last blocks are not
         flush against the frame */
      lo = Math.max(0, Math.floor((lo - 60)/60)*60);
      hi = Math.min(24*60, Math.ceil((hi + 60)/60)*60);
      var span = hi - lo;

      var setts = availState.settings || {};
      var rows = '';
      for (var m = lo; m <= hi; m += 60){
        var top = ((m - lo) / span * 100).toFixed(3);
        rows += '<div class="hr" style="top:' + top + '%"></div>'
              + '<div class="hl" style="top:' + top + '%">' + pad(m) + '</div>';
      }

      var cols = '';
      for (var d2 = 0; d2 < 7; d2++){
        var bars = '';
        byDay[d2].forEach(function(b){
          var t = ((b.a - lo) / span * 100).toFixed(3);
          var h = ((b.z - b.a) / span * 100).toFixed(3);
          bars += '<div class="free" style="top:' + t + '%;height:' + h + '%">'
                + '<span>' + pad(b.a) + '</span><span>' + pad(b.z) + '</span></div>';
        });
        var total = byDay[d2].reduce(function(n,b){ return n + (b.z - b.a); }, 0);
        var label = total ? (Math.round(total/60*10)/10) + ' h' : 'Closed';
        cols += '<div class="col"><div class="ch"><b>' + SH[d2] + '</b><i>' + label + '</i></div>'
              + '<div class="track">' + bars + '</div></div>';
      }

      var doc = '<!doctype html><html><head><meta charset="utf-8">'
        + '<title>FOB Systems - Weekly Availability</title>'
        + '<style>'
        + '@page{size:landscape;margin:14mm}'
        + '*{box-sizing:border-box}'
        + 'body{margin:0;background:#14171B;color:#F3ECE0;'
        + "font-family:'Archivo',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:34px 30px}"
        + '.top{display:flex;align-items:flex-end;justify-content:space-between;'
        + 'border-bottom:1px solid rgba(211,190,152,.3);padding-bottom:14px;margin-bottom:8px}'
        + '.top h1{margin:0;font-size:21px;letter-spacing:-.01em}'
        + '.top p{margin:5px 0 0;font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:#D3BE98}'
        + '.top .rule{font-size:11px;color:#9d968a;text-align:right;line-height:1.7}'
        + '.key{display:flex;gap:20px;margin:16px 0 12px;font-size:11px;color:#9d968a;align-items:center}'
        + '.key i{display:inline-block;width:22px;height:10px;border-radius:3px;margin-right:7px;vertical-align:-1px}'
        + '.grid{display:flex;gap:8px;position:relative;padding-left:62px;height:560px}'
        + '.lines{position:absolute;inset:0 0 0 62px;pointer-events:none}'
        + '.hr{position:absolute;left:0;right:0;height:1px;background:rgba(211,190,152,.1)}'
        + '.hl{position:absolute;left:-62px;width:54px;text-align:right;transform:translateY(-50%);'
        + "font-family:ui-monospace,monospace;font-size:10px;color:#8d867a}"
        + '.col{flex:1;display:flex;flex-direction:column;min-width:0}'
        + '.ch{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:7px}'
        + '.ch b{font-size:12.5px;letter-spacing:.1em;text-transform:uppercase}'
        + '.ch i{font-style:normal;font-family:ui-monospace,monospace;font-size:10px;color:#9d968a}'
        + '.track{position:relative;flex:1;border-radius:2px;overflow:hidden;'
        + 'background:repeating-linear-gradient(135deg,rgba(190,90,80,.16) 0 7px,rgba(190,90,80,.07) 7px 14px);'
        + 'border:1px solid rgba(190,90,80,.28)}'
        + '.free{position:absolute;left:2px;right:2px;border-radius:7px;'
        + 'background:linear-gradient(180deg,rgba(211,190,152,.95),rgba(185,163,124,.9));'
        + 'border:1px solid #E9C98F;color:#14171B;padding:5px 6px;'
        + 'display:flex;flex-direction:column;justify-content:space-between;'
        + "font-family:ui-monospace,monospace;font-size:9.5px;font-weight:600;overflow:hidden}"
        + '.foot{margin-top:14px;font-size:10px;color:#7d766a;display:flex;justify-content:space-between}'
        + '@media print{body{background:#14171B;-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
        + '</style></head><body>'
        + '<div class="top"><div><h1>Weekly Availability</h1><p>FOB Systems</p></div>'
        + '<div class="rule">' + (setts.session_minutes || 75) + ' minute sessions<br>'
        + (setts.travel_buffer_min || 45) + ' minute travel buffer<br>'
        + (setts.lead_time_hours || 12) + ' hours notice</div></div>'
        + '<div class="key"><span><i class="k1" style="background:linear-gradient(180deg,#D3BE98,#b9a37c)"></i>Available</span>'
        + '<span><i style="background:repeating-linear-gradient(135deg,rgba(190,90,80,.5) 0 5px,rgba(190,90,80,.2) 5px 10px);'
        + 'border:1px solid rgba(190,90,80,.45)"></i>Not available</span>'
        + '<span style="margin-left:auto">Times are Eastern</span></div>'
        + '<div class="grid"><div class="lines">' + rows + '</div>' + cols + '</div>'
        + '<div class="foot"><span>fob.systems</span><span>Generated '
        + new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) + '</span></div>'
        + '</body></html>';

      var w = window.open('', '_blank');
      if (!w) { availSay('Allow pop-ups to print the week.', true); return; }
      w.document.write(doc);
      w.document.close();
      setTimeout(function(){ try { w.focus(); w.print(); } catch(e){} }, 350);
    }

    function drawParks(){
      var host = document.getElementById('fr-parks');
      host.innerHTML = '';
      var on = availState.parks.filter(function(p){return p.is_active;}).length;
      document.getElementById('fr-park-count').textContent =
        '(' + on + ' of ' + availState.parks.length + ' on)';

      var q = (document.getElementById('fr-park-q').value||'').toLowerCase();
      var shown = q ? availState.parks.filter(function(p){
        return (p.display_name+' '+p.borough).toLowerCase().indexOf(q)!==-1;
      }) : availState.parks;
      shown.slice(0,300).forEach(function(p){
        var row = document.createElement('div');
        row.className = 'fr-avail-item';

        var wrap = document.createElement('label');
        wrap.className = 'fr-avail-toggle';
        var box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = !!p.is_active;
        var txt = document.createElement('span');
        txt.textContent = p.display_name + '  ' + p.borough +
                          (p.is_preferred ? '  (preferred)' : '');
        wrap.appendChild(box); wrap.appendChild(txt);

        box.addEventListener('change',function(){
          var want = box.checked;
          availSay('Saving...');
          admin({action:'save-park',id:p.id,is_active:want}).then(function(d){
            p.is_active = d.park ? d.park.is_active : want;
            drawParks(); availSay('Saved.');
          }).catch(function(e){
            /* The cap is enforced on the server, so put the box back
               rather than leaving it showing a state that was refused. */
            box.checked = !want;
            drawParks();
            availSay(e.message,true);
          });
        });

        row.appendChild(wrap);
        host.appendChild(row);
      });
    }

    function drawSettings(){
      var s = availState.settings;
      if(!s) return;
      document.getElementById('fr-set-len').value = s.session_minutes;
      document.getElementById('fr-set-buf').value = s.travel_buffer_min;
      document.getElementById('fr-set-lead').value = s.lead_time_hours;
      document.getElementById('fr-set-open').checked = !!s.booking_open;
    }

    function loadAvail(){
      availSay('Loading...');
      admin(null).then(function(d){
        availState.windows = d.windows||[];
          availState.parks = d.parks||[];
        availState.settings = d.settings;
        availState.max = 0;
        drawRules(); drawParks(); drawSettings();
        availSay('');
      }).catch(function(e){availSay(e.message,true);});
    }



    document.getElementById('fr-park-q').addEventListener('input',drawParks);
    document.getElementById('fr-avail').addEventListener('click',function(){
      availModal.hidden = false;
      loadAvail();
    });
    availModal.addEventListener('click',function(e){
      if(e.target.hasAttribute('data-avail-close')) availModal.hidden = true;
    });
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape' && !availModal.hidden) availModal.hidden = true;
    });

    /* Full week fills the screen and drops the horizontal scroll, so all
       seven days fit at once. Turning the phone sideways just makes each
       column wider. Escape or the close button puts it back. */
    (function(){
      var host = document.getElementById('fr-rules');
      var closeBtn = null;
      function exit(){
        host.classList.remove('wk-full');
        if (closeBtn && closeBtn.parentNode) closeBtn.parentNode.removeChild(closeBtn);
        closeBtn = null;
        document.removeEventListener('keydown', onKey);
        if (screen.orientation && screen.orientation.unlock) { try { screen.orientation.unlock(); } catch(e){} }
        if (document.fullscreenElement && document.exitFullscreen) { try { document.exitFullscreen(); } catch(e){} }
        drawRules();
      }
      function onKey(e){ if (e.key === 'Escape') exit(); }
      document.getElementById('fr-expand').addEventListener('click', function(){
        if (host.classList.contains('wk-full')) { exit(); return; }
        host.classList.add('wk-full');
        closeBtn = document.createElement('button');
        closeBtn.className = 'fr-btn fr-btn-ghost fr-sm fr-expand-close';
        closeBtn.type = 'button';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', exit);
        host.appendChild(closeBtn);
        document.addEventListener('keydown', onKey);
        /* Landscape where the browser allows it. iOS Safari does not, which
           is why the layout works turned or unturned rather than relying on
           the lock succeeding. */
        if (host.requestFullscreen) { host.requestFullscreen().catch(function(){}); }
        if (screen.orientation && screen.orientation.lock) {
          try { screen.orientation.lock('landscape').catch(function(){}); } catch(e){}
        }
        drawRules();
      });
    })();

    document.getElementById('fr-undo').addEventListener('click', undoLast);
    document.getElementById('fr-print-week').addEventListener('click', printWeek);

    document.getElementById('fr-set-save').addEventListener('click',function(){
      availSay('Saving...');
      admin({action:'save-settings',
        session_minutes:parseInt(document.getElementById('fr-set-len').value,10),
        travel_buffer_min:parseInt(document.getElementById('fr-set-buf').value,10),
        lead_time_hours:parseInt(document.getElementById('fr-set-lead').value,10),
        booking_open:document.getElementById('fr-set-open').checked
      }).then(function(d){
        availState.settings = d.settings || availState.settings;
        availSay('Saved.');
      }).catch(function(e){availSay(e.message,true);});
    });

    load();
  })();
  </script>
  <script defer src="/coach-shell.js?v=453&rc5c=1"></script>
</body></html>`;
}

exports.handler = async function (event) {
  /* Never cached. This page is served from a function, so there is no
     filename to version, and a stale copy showed empty settings fields
     while the real values sat in the database. It is also behind a
     password, which is its own reason not to sit in a cache. */
  const headers = Object.assign({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, must-revalidate',
    'Pragma': 'no-cache'
  }, S.SECURITY_HEADERS);
  const body = S.isAuthed(event) ? dashboardPage() : loginPage('');
  return { statusCode: 200, headers, body };
};
