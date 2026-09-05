'use strict';
/* Ends a name-driven membership session.

   Clears both member-scoped cookies so a sign-out is a clean slate:
     fob_claim         the membership session itself
     fob_group_access  a cohort unlock, which belongs to that member

   Does NOT touch fob_review, the admin session. Jah needs that to survive a
   trip through the homepage or FOB Rounds tracking would drop every time.

   Called by the homepage on every load, so it must stay cheap: no database
   read, no lookup, just cookie expiry. Accepts GET as well as POST because
   it is also reachable as a plain link.

   Set-Cookie goes in multiValueHeaders because two cookies cannot share one
   header key; putting either in headers as well would drop one of them. */
const P=require('./_payment');

function expire(name){
  const bits=[name+'=','HttpOnly','Path=/','SameSite=Strict','Max-Age=0'];
  if((process.env.CONTEXT||'production')==='production')bits.push('Secure');
  return bits.join('; ');
}

exports.handler=async function(event){
  const H=Object.assign({'Content-Type':'application/json'},P.SEC);
  const cookies={'Set-Cookie':[P.clearCookie(),expire('fob_group_access')]};
  if(event.httpMethod!=='POST'&&event.httpMethod!=='GET'){
    return{statusCode:405,headers:H,multiValueHeaders:cookies,
      body:JSON.stringify({ok:false,error:'Method not allowed.'})};
  }
  return{statusCode:200,headers:H,multiValueHeaders:cookies,body:JSON.stringify({ok:true})};
};
