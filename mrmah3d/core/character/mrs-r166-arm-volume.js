import {Vector3,Quaternion} from '../../vendor/three/three.module.min.js';
import {coupleFacingReturns} from './mrs-deltoid-heads.js';
const key=v=>v.toArray().map(x=>x.toFixed(6)).join(',');
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};
const band=(t,a,b,c,d)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));

// R166 volume ownership: the existing authored crowns translate as coherent
// surfaces; a coupled skin distributes the change through their insertions.
export function authorMrsR166ArmVolume(g,arm,side){
 if(!['left','right'].includes(side))throw new Error('R166 unknown arm side');
 const attrs=g.attributes,p=attrs.position,frame=g.userData.mrsSurgical126.frame;
 const axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out),length=frame.boneLength;
 const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const movement=(field,pl)=>{
  if(field==='mrsBrachialisPatch127')return out.clone().multiplyScalar(.004);
  if(field==='mrsBiceps139'||field==='mrsBicepsProximal141')return front.clone().multiplyScalar(.013).addScaledVector(out,.002);
  if(field==='mrsTriceps144')return front.clone().multiplyScalar(-.012).addScaledVector(out,.002);
  if(field==='mrsDeltoid128')return pl.region==='DELTOID_ANTERIOR'?front.clone().multiplyScalar(.008).addScaledVector(out,.003):pl.region==='DELTOID_POSTERIOR'?front.clone().multiplyScalar(-.007).addScaledVector(out,.002):out.clone().multiplyScalar(.004);
  if(field==='mrsDeltoidInsertion129')return out.clone().multiplyScalar(-.006);
  if(field==='mrsDeltoidFront142')return front.clone().multiplyScalar(.004);
  if(field==='mrsDeltoidSide143')return front.clone().multiplyScalar(-.003).addScaledVector(out,-.004);
  return front.clone().multiplyScalar(pl.region==='DELTOID_POSTERIOR_RETURN'?-.004:.005);
 };
 const fields=['mrsBrachialisPatch127','mrsDeltoid128','mrsBiceps139','mrsTriceps144'];
 const planes=fields.flatMap(field=>g.userData[field].planes.map(pl=>({field,pl,normal:new Vector3().fromArray(pl.averageNormal),delta:movement(field,pl)}))),owners=new Map();
 for(const owner of planes)for(const t of owner.pl.triangleIndices)for(const v of stock.slice(t*3,t*3+3)){const id=key(v);if(!owners.has(id))owners.set(id,new Set());owners.get(id).add(owner);}
 const upperFields=new Set(['mrsBrachialisPatch127','mrsBiceps139','mrsTriceps144']);
 const upperMap=v=>v.clone().addScaledVector(front,.12*v.dot(front)).addScaledVector(out,.075*v.dot(out));
 const target=stock.map(v=>{
  const t=v.dot(axis)/length,radial=v.clone().addScaledVector(axis,-v.dot(axis)),theta=Math.atan2(v.dot(out),v.dot(front));
  const anterior=Math.pow(Math.max(0,Math.cos(theta)),2),posterior=Math.pow(Math.max(0,-Math.cos(theta)),2),lateral=Math.max(0,Math.sin(theta));
  const result=v.clone().addScaledVector(front,.013*anterior*band(t,.18,.38,.54,.84)-.012*posterior*band(t,.18,.34,.56,.84)).addScaledVector(out,.003*lateral*band(t,.24,.38,.69,.84));
  result.addScaledVector(radial,-.12*band(t,.04,.16,.23,.34)-.04*band(t,.62,.75,.80,.86));
  result.addScaledVector(front,.008*anterior*band(t,-.34,-.22,-.10,.08)-.007*posterior*band(t,-.34,-.20,-.06,.10)).addScaledVector(out,.004*lateral*band(t,-.34,-.20,-.08,.09));
  if(t<=-.34||t>=.86)return v.clone();
  const shared=owners.get(key(v));if(!shared)return result;
  const list=[...shared],delta=result.clone().sub(v);
  if(list.every(o=>upperFields.has(o.field)))return upperMap(v);
  if(list.every(o=>o.delta.distanceTo(list[0].delta)<1e-12))return v.clone().add(list[0].delta);
  // Solve shared crown plane offsets, keeping intersection vertices common.
  for(let pass=0;pass<300;pass++)for(const o of list)delta.addScaledVector(o.normal,o.delta.dot(o.normal)-delta.dot(o.normal));
  const residual=Math.max(...list.map(o=>Math.abs(o.normal.dot(delta.clone().sub(o.delta)))));
  if(residual>1e-7)throw new Error('R166 conflicting crown ownership '+side+' '+key(v)+' '+residual);
  return v.clone().add(delta);
 });
 // Preserve the angular handoff at each real biceps/triceps crown edge.
 // Broad volume changes must not turn an existing return into a raised plate.
 const edgeFaces=new Map(),triangleOwners=new Map(),boundaryCones=[];
 for(const owner of planes)for(const t of owner.pl.triangleIndices)triangleOwners.set(t,owner);
 for(let i=0;i<stock.length;i+=3)for(let k=0;k<3;k++){const id=[key(stock[i+k]),key(stock[i+(k+1)%3])].sort().join('|');if(!edgeFaces.has(id))edgeFaces.set(id,[]);edgeFaces.get(id).push(i/3);}
 for(const adjacent of edgeFaces.values())if(adjacent.length===2)for(let k=0;k<2;k++){
  const owner=triangleOwners.get(adjacent[k]),other=adjacent[1-k];
  if(!owner||!['mrsBiceps139','mrsTriceps144'].includes(owner.field)||triangleOwners.has(other))continue;
  const v=stock.slice(other*3,other*3+3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
  const normal=owner.normal.clone().addScaledVector(front,(1/1.12-1)*owner.normal.dot(front)).addScaledVector(out,(1/1.075-1)*owner.normal.dot(out)).normalize();
  boundaryCones.push({triangle:other,normal,cosine:Math.min(Math.cos(7*Math.PI/180),n.dot(owner.normal)-.025)});
 }
 let current=stock.map(v=>v.clone()),solve;const stages=[];
 for(let stage=1;stage<=16;stage++){
  const indices=new Map(current.map((v,i)=>[key(v),i])),stageTarget=stock.map((v,i)=>v.clone().lerp(target[i],stage/16));
  solve=coupleFacingReturns(current,stageTarget,v=>owners.has(key(stock[indices.get(key(v))])),v=>{const q=stock[indices.get(key(v))],t=q.dot(axis)/length;return t>-.34&&t<.86;},stock,{normalCone:.90,minimumAreaRatio:.65,lambda:.0015,stableTopology:true,boundaryCones});
  current=solve.positions;stages.push({stage,...solve.orientationProjection});
 }
 // A .039-unit coupling length carries each physical crown into its
 // support envelope, avoiding a tiny return collar around a translated patch.
 const moved=current,coincident=new Map();let coincidentRepairs=0;
 for(let i=0;i<stock.length;i++){const id=key(stock[i]);if(!coincident.has(id))coincident.set(id,[]);coincident.get(id).push(i);}
 for(const ids of coincident.values()){
  if(ids.every(i=>moved[i].distanceTo(stock[i])<1e-12))continue;
  const v=moved[ids[0]];
  if(ids.some(i=>moved[i].distanceTo(v)>2e-7))throw new Error('R166 original topology group split');
  for(const i of ids)if(!moved[i].equals(v)){moved[i].copy(v);coincidentRepairs++;}
 }
 const oldNormals=new Map(),newNormals=new Map();let maxMove=0,minDot=1,minArea=1;
 for(const v of stock){oldNormals.set(key(v),new Vector3());newNormals.set(key(v),new Vector3());}
 for(let i=0;i<p.count;i+=3){const a=stock.slice(i,i+3),b=moved.slice(i,i+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));minDot=Math.min(minDot,n.clone().normalize().dot(m.clone().normalize()));minArea=Math.min(minArea,m.length()/n.length());
  for(let k=0;k<3;k++){oldNormals.get(key(a[k])).add(n);newNormals.get(key(a[k])).add(m);maxMove=Math.max(maxMove,a[k].distanceTo(b[k]));}
  if(b.some((v,k)=>v.distanceTo(a[k])>1e-12)){m.normalize();for(let k=0;k<3;k++)attrs.aPhysicalNormal.setXYZ(i+k,m.x,m.y,m.z);}
 }
 if(minDot<.89||minArea<.60||maxMove>.025)throw new Error('R166 invalid arm volume support '+JSON.stringify({side,minDot,minArea,maxMove}));
 for(let i=0;i<p.count;i++){if(moved[i].distanceTo(stock[i])<1e-12)continue;const id=key(stock[i]),rotation=new Quaternion().setFromUnitVectors(oldNormals.get(id).normalize(),newNormals.get(id).normalize()),seen=new Set();
  for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal']){const a=attrs[name];if(!a||seen.has(a))continue;seen.add(a);const n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(rotation).normalize();a.setXYZ(i,n.x,n.y,n.z);}p.setXYZ(i,moved[i].x,moved[i].y,moved[i].z);
 }
 for(const {pl} of planes){const normal=new Vector3(),center=new Vector3();let area=0;
  for(const t of pl.triangleIndices){const v=moved.slice(t*3,t*3+3),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),w=cross.length()/2;normal.add(cross);center.addScaledVector(v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3),w);area+=w;}normal.normalize();center.divideScalar(area);
  let residual=0,spread=0;for(const t of pl.triangleIndices){const v=moved.slice(t*3,t*3+3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();spread=Math.max(spread,n.angleTo(normal));for(const q of v)residual=Math.max(residual,Math.abs(q.clone().sub(center).dot(normal)));for(let k=0;k<3;k++)attrs.aCrystalNormal.setXYZ(t*3+k,normal.x,normal.y,normal.z);}
  if(residual>2e-7||spread>.2*Math.PI/180)throw new Error('R166 crown lost planarity '+pl.id);
  Object.assign(pl,{centerPosition:center.toArray(),averageNormal:normal.toArray(),area,maximumPlaneResidual:residual,maximumPhysicalNormalSpreadDegrees:spread*180/Math.PI,geometryRevision:'R166-M01'});
 }
 // Old secondary patches are now continuous insertion supports. Keeping them
 // rigid was preventing the primary bellies from acquiring their R166 volume.
 const secondary=['mrsDeltoidInsertion129','mrsBicepsProximal141','mrsDeltoidFront142','mrsDeltoidSide143','mrsPosterior146'];
 for(const field of secondary){
  g.userData[field].representation='R166 continuous anatomical support';
  for(const pl of g.userData[field].planes){
   const center=new Vector3(),normal=new Vector3();let area=0;
   for(const t of pl.triangleIndices){const v=moved.slice(t*3,t*3+3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),w=n.length()/2;normal.add(n);center.addScaledVector(v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3),w);area+=w;}normal.normalize();center.divideScalar(area);let residual=0,spread=0;
   for(const t of pl.triangleIndices){const v=moved.slice(t*3,t*3+3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();spread=Math.max(spread,n.angleTo(normal));for(const q of v)residual=Math.max(residual,Math.abs(q.clone().sub(center).dot(normal)));}
   Object.assign(pl,{centerPosition:center.toArray(),averageNormal:normal.toArray(),area,maximumPlaneResidual:residual,maximumPhysicalNormalSpreadDegrees:spread*180/Math.PI,geometryRevision:'R166-M01',type:'continuous insertion support',status:'REVISE secondary plane closure after volume gate'});
  }
 }
 g.userData.mrsR166Volume={version:'R166-M01',parent:'M146',side,frame,maximumDisplacement:maxMove,minimumNormalDot:minDot,minimumAreaRatio:minArea,coincidentRepairs,boundaryConstraintCount:boundaryCones.length,stages,controls:planes.map(o=>({id:o.pl.id,anatomicalOwner:o.pl.anatomicalOwner,method:upperFields.has(o.field)?'shared muscle-frame affine expansion':'deltoid crown translation',frontScale:upperFields.has(o.field)?1.12:undefined,lateralScale:upperFields.has(o.field)?1.075:undefined,translation:upperFields.has(o.field)?undefined:o.delta.toArray()})),protected:'Elbows, forearms, wrists, hands, torso, face, head and fused lower body',status:'R166 volume continuity; full arm closure remains open'};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();return g;
}
