
'use strict';
/* FOB Systems :: private member-owned Progress dashboard.
   Identity comes only from the existing signed Claim Your Slot cookie.
   No member id is accepted from the browser, so one member cannot change a URL
   to read another member's performance history. */
const P = require('./_payment');
const V = require('./fob-progress');
const H = {
  'Content-Type':'text/html; charset=utf-8',
  'X-Robots-Tag':'noindex, nofollow, noarchive',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
  'Cache-Control':'no-store, no-cache, must-revalidate, private'
};
function dead(){
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>FOB Progress</title><style>body{margin:0;background:#05090D;color:#EFEAE0;font-family:Arial,Helvetica,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px}a{color:#D3BE98}</style></head><body><div><p style="letter-spacing:.28em;text-transform:uppercase;font-size:11px;color:#D3BE98">FOB Systems</p><h1 style="font-size:28px;margin:12px 0 16px">Private Progress</h1><p style="color:#9BA1A8;font-size:14px;line-height:1.6">Enter through your approved FOB SESH access first.</p><p style="margin-top:18px"><a href="/?claim=1">Claim Your Slot</a></p></div></body></html>';
}
exports.handler=async function(event){
  if(event.httpMethod!=='GET') return {statusCode:405,headers:H,body:dead()};
  const claim=P.parseClaim(P.cookie(event.headers||{}));
  if(!claim) return {statusCode:401,headers:H,body:dead()};
  try{
    const member=await P.memberWithAccess(claim.id,'id,first_name,last_name,progress_share_from,active,sesh_left');
    if(!member) return {statusCode:401,headers:Object.assign({},H,{'Set-Cookie':P.clearCookie()}),body:dead()};
    const rows=await P.db('fob_performances?select=*&member_id=eq.'+encodeURIComponent(claim.id)+'&order=session_date.asc,completed_at.asc&limit=400');
    return {statusCode:200,headers:H,body:V.page(member,rows||[],{share:true})};
  }catch(e){
    console.error('member-progress',e&&e.message,e&&e.detail);
    return {statusCode:500,headers:H,body:V.shell('<div class="card"><div class="empty"><strong>Progress unavailable</strong>Your performance history could not be loaded right now.</div></div>')};
  }
};
