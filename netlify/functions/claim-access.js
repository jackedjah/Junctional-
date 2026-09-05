'use strict';
const P=require('./_payment');
exports.handler=async function(event){
  const H=Object.assign({'Content-Type':'application/json'},P.SEC);
  if(event.httpMethod!=='POST')return{statusCode:405,headers:H,body:JSON.stringify({error:'Method not allowed.'})};
  let b={};try{b=JSON.parse(event.body||'{}')}catch(e){}
  const f=P.normalize(b.firstName),l=P.normalize(b.lastName);
  if(!f||!l)return{statusCode:400,headers:H,body:JSON.stringify({error:'Enter both your first and last name.'})};
  try{
    const q='payment_vip_members?select=id,first_name,last_name,sesh,sesh_left,active,location_rate&normalized_first=eq.'+encodeURIComponent(f)+'&normalized_last=eq.'+encodeURIComponent(l)+'&active=eq.true&sesh_left=gt.0&gym_only=eq.false&limit=1';
    const rows=await P.db(q);
    if(!rows||!rows.length)return{statusCode:403,headers:Object.assign({},H,{'Set-Cookie':P.clearCookie()}),body:JSON.stringify({error:'Member access is not active. Contact Jah directly.'})};
    return{statusCode:200,headers:Object.assign({},H,{'Set-Cookie':P.setCookie(P.createClaim(rows[0]))}),body:JSON.stringify({ok:true})};
  }catch(e){console.error(e);return{statusCode:500,headers:H,body:JSON.stringify({error:'Access checking is not configured yet.'})}
}
};
