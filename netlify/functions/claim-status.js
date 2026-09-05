'use strict';
const P=require('./_payment');
const GATE=require('./_group-gate');
exports.handler=async function(event){
  const H=Object.assign({'Content-Type':'application/json'},P.SEC),c=P.parseClaim(P.cookie(event.headers||{}));
  if(!c)return{statusCode:401,headers:H,body:JSON.stringify({ok:false})};
  try{
    const member=await P.memberWithAccess(c.id,'id,first_name,last_name,sesh,sesh_left,active,location_rate',{fullOnly:true});
    if(!member)return{statusCode:401,headers:Object.assign({},H,{'Set-Cookie':P.clearCookie()}),body:JSON.stringify({ok:false,locked:true})};
    /* groupAllowed is computed from the same gate the group endpoints
       enforce, so the button, the /small-group-access page and the API
       can never disagree about who is in. */
    return{statusCode:200,headers:H,body:JSON.stringify({ok:true,member:member,groupOpen:GATE.isOpen(),groupAllowed:GATE.allowsMember(member)})};
  }catch(e){return{statusCode:500,headers:H,body:JSON.stringify({ok:false,error:'Status unavailable.'})}
}
};
