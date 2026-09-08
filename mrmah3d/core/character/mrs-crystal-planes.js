import {Vector3,Float32BufferAttribute} from '../../vendor/three/three.module.min.js';

const sector=(u,v,n)=>Math.floor(((Math.atan2(v,u)+Math.PI)/(Math.PI*2)*n))%n;
function torsoFamily(p){
 const x=Math.abs(p.x),y=p.y,side=p.x<0?'L':'R',front=p.z>=0;
 const cap=(name,u,v)=>side+name+(Math.hypot(u,v)<.48?'crown':sector(u,v,6));
 if(front&&y>=1.79&&y<2.12)return cap('bust',(x-.177)/.185,(y-1.969)/.149);
 if(!front&&y>=1.06&&y<1.53)return cap('glute',(x-.18)/.208,(y-1.31)/.225);
 if(front&&y>=.58&&y<.91)return cap('knee',(x-.083)/.086,(y-.79)/.102);
 if(front&&y>=.91&&y<1.53){
  const axis=.115+.13*Math.min(1,Math.max(0,(y-.65)/.65));
  return side+'quad:'+Math.floor((y-.91+.38*(x-axis))/.30)+':'+Math.floor((x-axis+.18)/.105);
 }
 if(!front&&y>=1.68&&y<2.18)return cap('back',(x-.165-.26*(y-2.01))/.162,(y-2.01)/.19);
 // Long facets on the terminal taper, tighter families at the waist/neck.
 const rows=y<.58?0:Math.floor((y+.25*x)/.16);
 return (front?'front':'rear')+rows+':'+sector(p.x,p.z,y<.58?6:12);
}

// Optical families are derived from real triangle normals after the anatomical
// cap/plane geometry is fitted. No random cells, displacement or added mesh.
// Smooth clay and physical triangle normals remain available for inspection.
export function applyMrsCrystalPlanes(g,region,{axis=null,length=1}={}){
 const p=g.attributes.position,smooth=g.attributes.aSmooth;
 const tangent=axis?new Vector3(0,0,1).cross(axis).normalize():null;
 const bitangent=axis?axis.clone().cross(tangent).normalize():null;
 const groups=new Map(),faces=[];
 for(let i=0;i<p.count;i+=3){
  const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j));
  const c=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3);
  const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
  let key;
  if(region==='torso')key=torsoFamily(c);
  else{
   const t=c.dot(axis)/length,joint=t<.16||t>.82;
   key=region+':'+Math.floor(t/(joint?.09:.24))+':'+sector(c.dot(tangent),c.dot(bitangent),joint?12:8);
  }
  if(!groups.has(key))groups.set(key,{normal:new Vector3(),id:groups.size});
  groups.get(key).normal.add(normal);faces.push({i,key,c,area:normal.length()});
 }
 groups.forEach(v=>v.normal.normalize());
 const normals=new Float32Array(p.count*3),ids=new Float32Array(p.count);
 let maxTurn=0;
 for(const {i,key,c}of faces){
  const group=groups.get(key);
  // Early crystallization: retain the smooth anatomical normal at each
  // corner and introduce only a restrained family turn. A hard full-family
  // replacement produced patch borders that overpowered the female masses.
  const influence=region==='torso'?(c.y<.58?.40:c.y>1.06&&c.y<1.53&&c.z<0?.28:.35):.28;
  for(let j=0;j<3;j++){
    const base=new Vector3().fromBufferAttribute(smooth,i+j);
    const angle=Math.acos(Math.max(-1,Math.min(1,base.dot(group.normal))));
    const weight=influence*Math.min(1,(Math.PI*12/180)/(angle||1));
    const normal=base.clone().lerp(group.normal,weight).normalize();
    maxTurn=Math.max(maxTurn,Math.acos(Math.max(-1,Math.min(1,base.dot(normal))))*180/Math.PI);
    normal.toArray(normals,(i+j)*3);ids[i+j]=group.id;
  }
 }
 // M15/M18: reconcile the same physical corner across anatomical families.
 // Classification by triangle centre formerly gave two normals to one
 // corner, tracing staircase borders through an otherwise continuous mass.
 // Retain family interiors; reconcile shared boundaries with area weights.
 // Verified first on the lower body, then continued through torso and arms.
 let seamVertices=0,maxSeamJumpBefore=0,maxSeamJumpAfter=0;
 {
  const corners=new Map();
  for(const {i,key,area}of faces)for(let j=0;j<3;j++){
   const k=i+j,y=p.getY(k);
   const pointKey=[p.getX(k),y,p.getZ(k)].map(v=>Math.round(v*1e6)).join(',');
   if(!corners.has(pointKey))corners.set(pointKey,{indices:[],families:new Set(),sum:new Vector3(),y});
   const corner=corners.get(pointKey);corner.indices.push(k);corner.families.add(key);
   corner.sum.addScaledVector(new Vector3().fromArray(normals,k*3),area);
  }
  const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*180/Math.PI;
  for(const corner of corners.values()){
   if(corner.families.size<2)continue;
   const previous=corner.indices.map(k=>new Vector3().fromArray(normals,k*3));
   for(const a of previous)for(const b of previous)maxSeamJumpBefore=Math.max(maxSeamJumpBefore,angle(a,b));
   const shared=corner.sum.normalize();
   corner.indices.forEach(k=>shared.toArray(normals,k*3));
   seamVertices++;
    const revised=corner.indices.map(k=>new Vector3().fromArray(normals,k*3));
    for(const a of revised)for(const b of revised)maxSeamJumpAfter=Math.max(maxSeamJumpAfter,angle(a,b));
  }
 }
 maxTurn=0;
 for(let i=0;i<p.count;i++){
  const a=new Vector3().fromBufferAttribute(smooth,i),b=new Vector3().fromArray(normals,i*3);
  maxTurn=Math.max(maxTurn,Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*180/Math.PI);
 }
 g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());
 g.setAttribute('aCrystalNormal',new Float32BufferAttribute(normals,3));
 g.setAttribute('aCrystalFamily',new Float32BufferAttribute(ids,1));
 g.setAttribute('normal',g.attributes.aCrystalNormal);
 g.userData.mrsCrystal={region,families:groups.size,maxTurnDegrees:maxTurn,method:'restrained anatomical families with reconciled shared corners',addedTriangles:0,seamVertices,maxSeamJumpBeforeDegrees:maxSeamJumpBefore,maxSeamJumpAfterDegrees:maxSeamJumpAfter};
}
