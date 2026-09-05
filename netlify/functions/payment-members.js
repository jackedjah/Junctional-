'use strict';
const S=require('./_session'),P=require('./_payment'),MC=require('./_member-community');
function out(code,obj){return{statusCode:code,headers:Object.assign({'Content-Type':'application/json'},S.SECURITY_HEADERS),body:JSON.stringify(obj)}}
function cleanDays(v,def){const n=parseInt(v,10);return Number.isFinite(n)?Math.max(0,n):def}
function expiresFromDays(v,def){const days=cleanDays(v,def);const d=new Date();d.setHours(23,59,59,999);d.setDate(d.getDate()+days);return d.toISOString()}
exports.handler=async function(event){
  if(!S.isAuthed(event))return out(401,{error:'Not authenticated.'});
  try{
    if(event.httpMethod==='GET'){
      const rows=await P.db('payment_vip_members?select=id,first_name,last_name,preferred_park,location_rate,sesh,sesh_left,expires_at,active,created_at,updated_at,gym_only&active=eq.true&order=created_at.asc');
      const parkRows=await P.db('session_parks?select=display_name,borough,is_preferred&is_active=eq.true&order=display_name.asc').catch(function(){return []});
      const parks=(parkRows||[]).map(function(r){return {n:r.display_name,b:r.borough||'',p:!!r.is_preferred}});
      return out(200,{items:rows||[],parks:parks});
    }
    let b={};try{b=JSON.parse(event.body||'{}')}catch(e){}
    if(event.httpMethod==='POST'){
      const first=String(b.firstName||'').trim(),last=String(b.lastName||'').trim();
      if(!first||!last)return out(400,{error:'First and last name are required.'});
      const body={first_name:first,last_name:last,normalized_first:P.normalize(first),normalized_last:P.normalize(last),gym_only:!(('confirmed'in b)?(b.confirmed===true||b.confirmed==='true'||b.confirmed===1):true),sesh:Math.max(0,parseInt(b.sesh,10)||0),sesh_left:Math.max(0,parseInt(b.seshLeft,10)||0),preferred_park:String(b.preferredPark||'').trim().slice(0,120)||null,expires_at:expiresFromDays(b.days,180),active:true};
      const rows=await P.db('payment_vip_members?on_conflict=normalized_first,normalized_last',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});
      /* New members are immediately valid everywhere because the ledger is the
         source of truth. Provision the shared Forum identity too so avatar and
         Forum/Gym profile data are ready before the member ever visits either. */
      let forumSynced=true;
      if(rows&&rows[0])try{await MC.syncAccess(rows[0])}catch(e){forumSynced=false;console.warn('member identity provision',e&&e.message)}
      return out(200,{ok:true,items:rows,forumSynced:forumSynced,locked:!!(rows&&rows[0]&&!P.hasSessionAccess(rows[0]))});
    }
    if(event.httpMethod==='PATCH'){
      if(!b.id)return out(400,{error:'Missing member id.'});
      const patch={};
      if('sesh'in b)patch.sesh=Math.max(0,parseInt(b.sesh,10)||0);
      if('seshLeft'in b)patch.sesh_left=Math.max(0,parseInt(b.seshLeft,10)||0);
      if('days'in b)patch.expires_at=expiresFromDays(b.days,0);
      if('preferredPark'in b)patch.preferred_park=String(b.preferredPark||'').trim().slice(0,120)||null;
      /* Admin only. The member never sends this: sesh-checkout reads the
         stored value, so a tampered page cannot buy at a cheaper rate. */
      if('locationRate'in b){const r=String(b.locationRate||'').trim();
        if(['standard','extended','distance'].indexOf(r)===-1)return out(400,{ok:false,error:'That location rate is not valid.'});
        patch.location_rate=r;}
      /* Confirmed toggles site access. Off means gym tracking only: the name
         opens /mygym and Gym Tracker and nothing else, because claim-access
         filters gym_only at the query. */
      if('confirmed'in b)patch.gym_only=!(b.confirmed===true||b.confirmed==='true'||b.confirmed===1);
      patch.updated_at=new Date().toISOString();
      const rows=await P.db('payment_vip_members?id=eq.'+encodeURIComponent(b.id),{method:'PATCH',headers:{'Prefer':'return=representation'},body:JSON.stringify(patch)});
      if(!rows||!rows[0])return out(404,{error:'Member not found.'});
      let forumSynced=true;
      try{await MC.syncAccess(rows[0])}catch(e){forumSynced=false;console.error('member access sync',e&&e.message)}
      return out(200,{ok:true,item:rows[0],forumSynced:forumSynced,locked:!P.hasSessionAccess(rows[0])});
    }
    if(event.httpMethod==='DELETE'){
      if(!b.id)return out(400,{error:'Missing member id.'});
      try{await MC.syncAccess({id:b.id,first_name:'',last_name:'',active:false,sesh_left:0})}catch(e){console.error('member delete access sync',e&&e.message)}
      await P.db('payment_vip_members?id=eq.'+encodeURIComponent(b.id),{method:'DELETE'});
      return out(200,{ok:true});
    }
    return out(405,{error:'Method not allowed.'});
  }catch(e){console.error('payment-members',e);return out(500,{error:'VIP list storage is not configured yet.'})}
};
