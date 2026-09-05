'use strict';
/* MAHFITT coach backend hub. This is only a router over the existing private
   tools; their database and business logic stay authoritative. QR scans are
   the one write owned here, and they execute atomically in migration 039. */
const S = require('./_session');
const P = require('./_payment');

const H = {
  'Content-Type':'application/json', 'Cache-Control':'no-store',
  'X-Robots-Tag':'noindex, nofollow, noarchive',
  'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer'
};
const HH = Object.assign({}, H, {'Content-Type':'text/html; charset=utf-8'});
const out = (code, body) => ({statusCode:code, headers:H, body:JSON.stringify(body)});
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

function login(){
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<meta name="robots" content="noindex,nofollow,noarchive"><meta name="theme-color" content="#0E1114">'
    + '<title>MAHFITT Admin</title><link rel="stylesheet" href="/admin-app.css?v=453&rc5c=1"><link rel="stylesheet" href="/mahfitt-atmosphere.css?v=453"></head>'
    + '<body class="admin-login-page"><main class="admin-login"><section class="admin-login-card">'
    + '<span class="admin-login-mark" aria-hidden="true"></span><span class="admin-login-brand">MAHFITT COACH</span><span class="admin-login-kicker">PRIVATE COACH OPERATIONS</span>'
    + '<h1>ADMIN</h1><p>Enter the private coach password.</p>'
    + '<label><span>Password</span><input id="adminPassword" type="password" autocomplete="current-password" placeholder="Private password"></label>'
    + '<button id="adminEnter" type="button">ENTER ADMIN</button><div id="adminLoginError" class="admin-login-error" role="alert"></div>'
    + '</section></main><script>(function(){var p=document.getElementById("adminPassword"),b=document.getElementById("adminEnter"),e=document.getElementById("adminLoginError");async function go(){e.textContent="";b.disabled=true;b.textContent="CHECKING…";try{var r=await fetch("/api/login",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:p.value})}),j=await r.json();if(!r.ok)throw new Error(j.error||"That password is not correct.");location.reload()}catch(x){e.textContent=x.message;b.disabled=false;b.textContent="ENTER ADMIN"}}b.onclick=go;p.onkeydown=function(x){if(x.key==="Enter")go()};p.focus()}())</script></body></html>';
}

function shell(){
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<meta name="robots" content="noindex,nofollow,noarchive"><meta name="theme-color" content="#0E1114"><meta name="color-scheme" content="dark">'
    + '<title>MAHFITT Coach Admin</title><link rel="preconnect" href="https://fonts.googleapis.com">'
    + '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">'
    + '<link rel="stylesheet" href="/admin-app.css?v=453&rc5c=1"><link rel="stylesheet" href="/coach-shell.css?v=453&rc5c=1"><link rel="stylesheet" href="/mahfitt-atmosphere.css?v=453">'
    + '</head><body data-coach-surface="admin"><main id="adminApp" class="admin-loading"><section><b>MAHFITT</b><span>Opening coach admin…</span></section></main>'
    + '<script defer src="/qr-lite.js?v=453"></script><script defer src="/coach-shell.js?v=453&rc5c=1"></script><script defer src="/admin-app.js?v=453&rc5c=1"></script>'
    + '</body></html>';
}

async function api(event){
  let body={}; try{body=JSON.parse(event.body||'{}')}catch(e){return out(400,{ok:false,error:'Bad request.'})}
  const action=String(body.action||'boot');
  if(action==='boot'){
    const members=await P.db('payment_vip_members?select=id,first_name,last_name,sesh_left,sesh,preferred_park,active,gym_only&active=eq.true&order=first_name.asc,last_name.asc&limit=10000');
    let recent=[],checkinReady=true,messageUnread=0;
    try{recent=await P.db('member_checkins?select=id,member_id,remaining_after,checked_in_at&order=checked_in_at.desc&limit=20')}catch(e){checkinReady=false}
    try{const messageNotes=await P.db('member_message_notifications?select=id&audience=eq.coach&read_at=is.null&limit=999');messageUnread=(messageNotes||[]).length}catch(e){messageUnread=0}
    return out(200,{ok:true,members:members||[],recent:recent||[],checkinReady,messageUnread});
  }
  if(action==='scan'){
    const token=String(body.token||'').trim();
    if(!uuid(token))return out(400,{ok:false,error:'That is not a MAHFITT member check-in code.'});
    try{
      const rows=await P.db('rpc/coach_check_in_member',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_token:token})});
      const row=Array.isArray(rows)?rows[0]:rows;
      if(!row)return out(404,{ok:false,error:'That member check-in code is not active.'});
      return out(200,{ok:true,checkin:{id:row.checkin_id,memberId:row.member_id,name:row.member_name,remaining:Number(row.remaining),checkedInAt:row.checked_in_at}});
    }catch(error){
      const message=String(error&&error.message||error&&error.detail||'');
      if(/no sessions left/i.test(message))return out(409,{ok:false,error:'This member has no sessions left.'});
      if(/not active/i.test(message))return out(404,{ok:false,error:'That member check-in code is not active.'});
      if(/coach_check_in_member|schema cache|does not exist/i.test(message))return out(503,{ok:false,error:'QR check-in needs migration 039 before the first scan.'});
      console.error('admin check-in',message);
      return out(500,{ok:false,error:'Check-in could not finish. No session was deducted.'});
    }
  }
  return out(400,{ok:false,error:'Unknown admin action.'});
}

exports.handler=async event=>{
  if(!S.isAuthed(event)){
    if(event.httpMethod==='GET')return{statusCode:200,headers:HH,body:login()};
    return out(401,{ok:false,error:'Coach sign-in required.'});
  }
  if(event.httpMethod==='GET')return{statusCode:200,headers:HH,body:shell()};
  if(event.httpMethod==='POST')return api(event);
  return out(405,{ok:false,error:'Method not allowed.'});
};
