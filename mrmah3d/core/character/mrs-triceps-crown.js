import {Vector3,Quaternion} from '../../vendor/three/three.module.min.js';
import {coupleFacingReturns} from './mrs-deltoid-heads.js';
const key=v=>v.toArray().map(x=>x.toFixed(6)).join(',');
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};

export function authorMrsTricepsCrowns144(g,arm,side){

 const attr=g.attributes,p=attr.position,f=g.userData.mrsSurgical126.frame,axis=new Vector3().fromArray(f.axis),front=new Vector3().fromArray(f.front),out=new Vector3().fromArray(f.out),length=f.boneLength;
 const before=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i)),target=before.map(v=>v.clone());
 g.userData.mrsTricepsBoundary144={version:'M144',oldToNewTriangles:Array.from({length:p.count/3},(_,i)=>[i]),originalTriangleCount:p.count/3,triangleCount:p.count/3,refinedBaselinePositions:Array.from(p.array),stations:null,method:'Retained upper-arm topology; separate lateral and long triceps source-normal families straddle the existing anatomical return'};
 const protectedKeys=new Set(['mrsBrachialisPatch127','mrsDeltoid128','mrsDeltoidInsertion129','mrsBiceps139','mrsBicepsProximal141','mrsDeltoidFront142','mrsDeltoidSide143'].flatMap(k=>g.userData[k].planes.flatMap(p=>p.triangleIndices.flatMap(t=>before.slice(t*3,t*3+3).map(key)))));
 const coords=v=>({t:v.dot(axis)/length,angle:(Math.atan2(v.dot(out),v.dot(front))+Math.PI*2)%(Math.PI*2)});
 // Preserve the existing inter-head convergence rather than deepening it.
 for(const v of before){const c=coords(v);if(c.t>.20&&c.t<.69&&Math.abs(wrap(c.angle-2.68))<.10)protectedKeys.add(key(v));}
 const owners=[['TRICEPS_LATERAL',2.30,'lateral triceps crown',2.00,2.55,0.00],['TRICEPS_LONG',3.00,'long triceps crown',2.88,3.48,.04]];
 const fits=owners.map(([owner,angle,anatomicalOwner,angleMin,angleMax,guideSlope])=>{
  const guide=front.clone().multiplyScalar(Math.cos(angle)).addScaledVector(out,Math.sin(angle)).addScaledVector(axis,guideSlope).normalize(),eligible=[],edges=new Map();
  for(let i=0;i<p.count;i+=3){const v=before.slice(i,i+3),q=v.map(coords),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),area2=cross.length(),normal=cross.clone().normalize();
   if(v.some(p=>protectedKeys.has(key(p)))||!q.every(c=>c.t>=.28&&c.t<=.64)||q.reduce((s,c)=>s+c.t,0)/3<.34||q.reduce((s,c)=>s+c.t,0)/3>.58||q.reduce((s,c)=>s+c.angle,0)/3<angleMin||q.reduce((s,c)=>s+c.angle,0)/3>angleMax||normal.dot(guide)<.985)continue;
   const face={index:i/3,v,area2,normal,neighbors:new Set()};eligible.push(face);
   for(let k=0;k<3;k++){const id=[key(v[k]),key(v[(k+1)%3])].sort().join('|');if(edges.has(id)){const other=edges.get(id);face.neighbors.add(other);other.neighbors.add(face);}else edges.set(id,face);}
  }
  const todo=new Set(eligible),groups=[];
  while(todo.size){const queue=[todo.values().next().value],group=[];todo.delete(queue[0]);while(queue.length){const face=queue.pop();group.push(face);for(const n of face.neighbors)if(todo.delete(n))queue.push(n);}groups.push(group);}
  groups.sort((a,b)=>b.reduce((s,v)=>s+v.area2,0)-a.reduce((s,v)=>s+v.area2,0));let core=groups[0];if(!core||core.length<2)throw new Error('M144 missing connected '+side+' '+owner+' crown');
  // A concave facing footprint can pin all corners of an unowned return.
  // Leave its least costly non-anchor boundary node free rather than flatten
  // a differently directed anatomical wall into the crown family.
  let releasedSupportNodes=0;
  for(let pass=0;pass<12;pass++){const ids=new Set(core.map(q=>q.index)),ks=new Set(core.flatMap(q=>q.v.map(key)));let released=false;for(let i=0;i<p.count;i+=3){if(ids.has(i/3))continue;const v=before.slice(i,i+3);if(!v.every(q=>ks.has(key(q))))continue;const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();if(normal.dot(guide)>=.901)continue;const options=v.filter(q=>!protectedKeys.has(key(q))).map(q=>({id:key(q),cost:core.filter(f=>f.v.some(v=>key(v)===key(q))).reduce((s,f)=>s+f.area2,0)})).sort((a,b)=>a.cost-b.cost);if(!options.length)throw new Error('M144 unsupported fixed anatomical wall');core=core.filter(f=>!f.v.some(q=>key(q)===options[0].id));releasedSupportNodes++;released=true;break;}if(!released)break;}
  const vertices=[...new Map(core.flatMap(q=>q.v.map(v=>[key(v),v]))).values()],keys=new Set(vertices.map(key)),radial=vertices.map(v=>v.clone().addScaledVector(axis,-v.dot(axis)).normalize());
  const fixedFaces=[];for(let i=0;i<p.count;i+=3){const v=before.slice(i,i+3);if(v.some(q=>keys.has(key(q)))&&v.every(q=>keys.has(key(q))||protectedKeys.has(key(q))||coords(q).t<=.22||coords(q).t>=.71)){const cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));fixedFaces.push({v,normal:cross.clone().normalize(),area:cross.length()});}}
  const measure=(theta,slope)=>{
   if(Math.abs(wrap(theta-angle))>.50||Math.abs(slope)>1.10)return null;
   const normal=front.clone().multiplyScalar(Math.cos(theta)).addScaledVector(out,Math.sin(theta)).addScaledVector(axis,slope).normalize(),q=vertices.map(v=>v.dot(normal)),d=vertices.map(()=>normal.clone().addScaledVector(axis,-normal.dot(axis)).length());
   if(Math.min(...d)<.65||core.some(c=>c.normal.dot(normal)<.901))return null;let distance=0;
   for(let i=0;i<q.length;i++)for(let j=0;j<i;j++)distance=Math.max(distance,Math.abs(q[i]-q[j])/(d[i]+d[j]));
   const lo=Math.max(...q.map((v,i)=>v-distance*d[i])),hi=Math.min(...q.map((v,i)=>v+distance*d[i])),offset=(lo+hi)/2,flow=normal.clone().addScaledVector(axis,-normal.dot(axis)).normalize(),den=flow.dot(normal);
   for(const f of fixedFaces){const v=f.v.map(p=>keys.has(key(p))?p.clone().addScaledVector(flow,(offset-p.dot(normal))/den):p),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));if(cross.length()/f.area<.65||cross.normalize().dot(f.normal)<.901)return null;}return{normal,offset,distance,theta,slope};
  };
  const seed=core.reduce((n,v)=>n.addScaledVector(v.normal,v.area2),new Vector3()).normalize();let best=measure(Math.atan2(seed.dot(out),seed.dot(front)),Math.max(-1.05,Math.min(1.05,seed.dot(axis)/Math.hypot(seed.dot(out),seed.dot(front)))));
  // An inherited return can bias the area-weighted seed outside the crown chart.
  // Start from the anatomical radial guide when that seed is invalid.
  best ||= measure(angle,guideSlope);if(!best)for(let i=-10;i<=10;i++)for(let j=-8;j<=22;j++){const fit=measure(angle+i*.05,j*.05);if(fit&&(!best||fit.distance<best.distance))best=fit;}if(!best)throw new Error('M144 invalid crown chart '+owner);let radius=.24;
  for(let pass=0;pass<5;pass++){const center=best;for(let i=-5;i<=5;i++)for(let j=-5;j<=5;j++){const fit=measure(center.theta+i*radius/5,center.slope+j*radius/5);if(fit&&fit.distance<best.distance)best=fit;}radius*=.25;}
  if(best.distance>.008)throw new Error('M144 crown would erase retained mass '+side+' '+owner+' '+best.distance);
  return{...best,owner,anatomicalOwner,vertices,keys,triangles:core.map(v=>v.index)};
 });
 const coreKeys=new Set(fits.flatMap(q=>[...q.keys])),coreOwner=new Map();
 for(const fit of fits)for(const id of fit.keys){if(!coreOwner.has(id))coreOwner.set(id,[]);coreOwner.get(id).push(fit);}
 // Preserve axial stations. Shared ridge vertices satisfy both anatomical planes.
 for(let i=0;i<before.length;i++){
 const owners=coreOwner.get(key(before[i]));if(!owners)continue;const v=before[i];
  if(owners.length===1){const fit=owners[0],radial=fit.normal.clone().addScaledVector(axis,-fit.normal.dot(axis)).normalize();target[i].addScaledVector(radial,(fit.offset-v.dot(fit.normal))/radial.dot(fit.normal));}
  else {const[a,b]=owners,ax=a.normal.dot(out),az=a.normal.dot(front),bx=b.normal.dot(out),bz=b.normal.dot(front),da=a.offset-v.dot(a.normal),db=b.offset-v.dot(b.normal),det=ax*bz-az*bx;
   if(Math.abs(det)<.1)throw new Error('M144 unresolved ridge ownership');target[i].addScaledVector(out,(da*bz-db*az)/det).addScaledVector(front,(ax*db-bx*da)/det);}
  if(target[i].distanceTo(v)>.008)throw new Error('M144 excessive shared crown displacement '+side+' '+target[i].distanceTo(v));
 }
 const near=v=>Math.min(...fits.flatMap(q=>q.vertices.map(p=>v.distanceTo(p)))),start=.22;
 // Advance the fixed facing in small continuation steps. A single full
 // projection flips inherited return triangles before their normal constraints
 // can recover; every step is checked against the original retained normals.
 let current=before.map(v=>v.clone()),solve;const continuation=[];
 for(let stage=1;stage<=12;stage++){const map=new Map(current.map((v,i)=>[key(v),i])),stageTarget=current.map((v,i)=>coreKeys.has(key(before[i]))?before[i].clone().lerp(target[i],stage/12):v.clone());
  try{solve=coupleFacingReturns(current,stageTarget,v=>{const i=map.get(key(v));return coreKeys.has(key(before[i]))||protectedKeys.has(key(before[i]));},v=>{const q=before[map.get(key(v))],t=coords(q).t;return t>start&&t<.71&&near(q)<.035;},before,{normalCone:.90,lambda:.000065,stableTopology:true});}catch(e){throw new Error('M144 continuation stage '+stage+': '+e.message);}
  current=solve.positions;continuation.push({stage,...solve.orientationProjection});
 }
 solve.continuation=continuation;
 const after=solve.positions,oldNormals=new Map(),newNormals=new Map();let minArea=1,minDot=1,maxMove=0,changed=0;
 for(let i=0;i<p.count;i+=3){const a=before.slice(i,i+3),b=after.slice(i,i+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));minArea=Math.min(minArea,m.length()/n.length());minDot=Math.min(minDot,n.clone().normalize().dot(m.clone().normalize()));
  for(let k=0;k<3;k++){const id=key(a[k]);if(!oldNormals.has(id)){oldNormals.set(id,new Vector3());newNormals.set(id,new Vector3());}oldNormals.get(id).add(n);newNormals.get(id).add(m);}
 }
 if(minArea<.60||minDot<.89)throw new Error('M144 invalid physical support '+JSON.stringify({side,minArea,minDot}));
 const oldPhysical=attr.aPhysicalNormal.clone();
 for(let i=0;i<p.count;i++){const distance=after[i].distanceTo(before[i]);if(distance<1e-12)continue;changed++;maxMove=Math.max(maxMove,distance);const id=key(before[i]),rotation=new Quaternion().setFromUnitVectors(oldNormals.get(id).clone().normalize(),newNormals.get(id).clone().normalize()),seen=new Set();
  for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal']){const a=attr[name];if(seen.has(a))continue;seen.add(a);const n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(rotation).normalize();a.setXYZ(i,n.x,n.y,n.z);a.needsUpdate=true;}
  p.setXYZ(i,after[i].x,after[i].y,after[i].z);
 }
 const shown=attr.normal;g.setAttribute('normal',oldPhysical.clone());g.computeVertexNormals();g.setAttribute('aPhysicalNormal',g.attributes.normal);g.setAttribute('normal',shown);
 for(let i=0;i<p.count;i+=3)if([0,1,2].every(k=>new Vector3().fromBufferAttribute(p,i+k).equals(before[i+k])))for(let k=0;k<3;k++)g.attributes.aPhysicalNormal.setXYZ(i+k,oldPhysical.getX(i+k),oldPhysical.getY(i+k),oldPhysical.getZ(i+k));
 // Continue each physical crown normal through its own bordering return skin.
 const points=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i)),groups=new Map(),sharp=new Map(),planes=[];
 const lr=side==='left'?'L':'R';
 for(const fit of fits){const center=new Vector3(),normal=new Vector3();let area=0,residual=0,spread=0;
  for(const t of fit.triangles){const a=points.slice(t*3,t*3+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),w=n.length()/2;area+=w;normal.add(n);center.addScaledVector(a[0].clone().add(a[1]).add(a[2]).multiplyScalar(1/3),w);sharp.set(t,fit);}
  normal.normalize();center.divideScalar(area);
  for(const t of fit.triangles){const a=points.slice(t*3,t*3+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])).normalize();spread=Math.max(spread,n.angleTo(normal));for(const v of a)residual=Math.max(residual,Math.abs(v.clone().sub(center).dot(normal)));}
  if(residual>2e-7||spread>.2*Math.PI/180)throw new Error('M144 nonplanar muscle crown '+fit.owner);
  fit.normal=normal;fit.returnSeeds=[...new Map(fit.triangles.flatMap(t=>points.slice(t*3,t*3+3).map(v=>[key(v),v]))).values()];
  const id='MRS_UPPER_'+lr+'_144_'+fit.owner+'_CROWN';planes.push({id,planeId:id,side:lr,region:fit.owner,anatomicalOwner:fit.anatomicalOwner,type:'long connected anatomical facing',triangleIndices:fit.triangles,centerPosition:center.toArray(),averageNormal:normal.toArray(),apexDirection:axis.toArray(),area,maximumPlaneResidual:residual,maximumPhysicalNormalSpreadDegrees:spread*180/Math.PI,mirroredId:id.replace('_'+lr+'_','_'+(lr==='L'?'R':'L')+'_'),adjacentPlanes:[],blackPointAdjacency:[],status:'physical crown; anatomical closure requires matched proof'});
 }
 for(let i=0;i<p.count;i++){const id=key(points[i]);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(i);}
 let normalCorners=0;
 for(const corners of groups.values()){const v=points[corners[0]],t=coords(v).t;if(t<=start||t>=.71||protectedKeys.has(key(before[corners[0]])))continue;const ownersHere=[...new Set(corners.map(i=>sharp.get(Math.floor(i/3))).filter(Boolean))];let shared=ownersHere.length?ownersHere.reduce((n,p)=>n.add(p.normal),new Vector3()).normalize():null;
  let normal=shared,weight=normal?1:0;
  if(!normal){const sum=new Vector3();let total=0;for(const fit of fits){const distance=Math.min(...fit.returnSeeds.map(q=>v.distanceTo(q))),w=1-ease(distance/.018);if(w<=0)continue;weight=Math.max(weight,w);total+=w;sum.addScaledVector(fit.normal,w);}if(total)normal=sum.normalize();}
  if(!normal||!weight)continue;const original=new Vector3().fromBufferAttribute(attr.aCrystalNormal,corners[0]),n=original.lerp(normal,weight).normalize();for(const i of corners){attr.aCrystalNormal.setXYZ(i,n.x,n.y,n.z);normalCorners++;}
 }
 for(const fit of fits)for(const t of fit.triangles)for(let k=0;k<3;k++)attr.aCrystalNormal.setXYZ(t*3+k,fit.normal.x,fit.normal.y,fit.normal.z);
 p.needsUpdate=true;attr.aCrystalNormal.needsUpdate=true;
 g.userData.mrsTriceps144={version:'M144',parent:'M143',side,frame:f,method:'Connected lateral and long triceps physical crown families, preserving the existing inter-head return and all retained biceps/deltoid facings',planes,changedCopies:changed,maximumDisplacement:maxMove,minimumAreaRatio:minArea,minimumNormalDot:minDot,returnSolve:{freeNodes:solve.freeNodes,coreNodes:solve.coreNodes,...solve.orientationProjection},normalCorners,continuation:solve.continuation,protected:'All retained brachialis/deltoid facings, shoulder and elbow seats, forearms and other meshes; upper-arm silhouette measured independently',status:'candidate; actual geometry and views required'};
 g.computeBoundingBox();g.computeBoundingSphere();return g;
}

