import {Vector3,Quaternion} from '../../vendor/three/three.module.min.js';
import {deformMrsRetainedSurface} from './mrs-surgical-reconstruction.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};
const band=(x,a,b,c,d)=>ease((x-a)/(b-a))*(1-ease((x-c)/(d-c)));
const bell=(x,c,h)=>{const q=Math.abs((x-c)/h);return q>=1?0:(1-q*q)**3;};
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

export function reconstructMrsDeltoid128(g,arm,side){
 const retained=g.userData.mrsSurgical126,frame=retained.frame,axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out),length=frame.boneLength;
 const coords=p=>({t:p.dot(axis)/length,x:p.dot(out),z:p.dot(front),theta:Math.atan2(p.dot(out),p.dot(front))});
 const heads=[{id:'ANTERIOR',angle:.72,lift:.0045},{id:'LATERAL',angle:Math.PI/2,lift:0},{id:'POSTERIOR',angle:2.42,lift:.004}];
 const stock=Array.from({length:g.attributes.position.count},(_,i)=>new Vector3().fromBufferAttribute(g.attributes.position,i));
 const oldPhysical=g.attributes.aPhysicalNormal.clone();
 const broadMap=p=>{
  const v=p.clone(),{t,x,z,theta}=coords(p),r=Math.hypot(x,z);if(t<=-.37||t>=.26||x<=0||r<.02)return v;
  const domain=band(t,-.37,-.25,.16,.26)*band(theta,.03,.26,2.91,3.12);
  const lower=ease((t+.14)/.39),half=.40*(1-lower)+.22*lower;
  const lines=[Math.PI/2-half,Math.PI/2+half];
  // Two oblique insertion valleys turn the cap into three owned bellies.
  // They converge proximally to the retained brachialis, without a cuff cut.
  const valley=Math.max(...lines.map(a=>bell(wrap(theta-a),0,.13)))*(1-ease((t-.025)/.155));
  const mass=heads.reduce((sum,h)=>sum+h.lift*bell(t,-.115,.235)*bell(wrap(theta-h.angle),0,.62),0);
  const broadInsertion=.0025*bell(t,.13,.125)*bell(wrap(theta-Math.PI/2),0,.70);
  const delta=domain*(mass-.0065*valley-broadInsertion);
  const outwardSupport=.006*domain*bell(t,-.11,.275)*(bell(wrap(theta-.72),0,.60)+bell(wrap(theta-2.42),0,.60));
  v.addScaledVector(out,outwardSupport);
  return v.addScaledVector(out,delta*x/r).addScaledVector(front,delta*z/r);
 };
 for(const h of heads){
  h.normal=out.clone().multiplyScalar(Math.sin(h.angle)).addScaledVector(front,Math.cos(h.angle));
  const samples=stock.filter(p=>{const c=coords(p);return c.t>-.27&&c.t<.06&&Math.abs(wrap(c.theta-h.angle))<.34;}).map(p=>broadMap(p).dot(h.normal));
  if(!samples.length)throw new Error('M128 missing '+h.id+' crown stock');
  h.offset=Math.max(...samples)-(h.id==='LATERAL'?.0015:.0035);
 }
 const map=p=>{
  const v=broadMap(p),c=coords(p);if(c.t<=-.37||c.t>=.26||c.x<=0)return v;
  for(const h of heads){
   const w=band(c.t,-.34,-.25,.035,.15)*band(wrap(c.theta-h.angle),-.48,-.29,.29,.48);
   const excess=Math.max(0,v.dot(h.normal)-h.offset);if(excess)v.addScaledVector(h.normal,-excess*w*.55);
  }return v;
 };
 deformMrsRetainedSurface(g,map,{region:'three-head-deltoid',side,frame,regularization:.000012,domain:[-.37,.26],capCompression:.55,
  heads:heads.map(h=>({id:h.id,angle:h.angle,lift:h.lift,normal:h.normal.toArray(),offset:h.offset})),
  valley:{depth:.0065,angularHalfWidth:.13,method:'paired oblique returns converging into lateral insertion; no circumferential groove'},
  protected:'All t>=.26, retained brachialis planes, biceps peak, elbow, forearm, torso and lower body'});
 const result=g.userData.mrsSurgical126;g.userData.mrsSurgical126=retained;
 const p=g.attributes.position,n=g.attributes.aPhysicalNormal;
 for(let i=0;i<p.count;i+=3)if([0,1,2].every(k=>new Vector3().fromBufferAttribute(p,i+k).equals(stock[i+k]))){for(let k=0;k<3;k++)n.setXYZ(i+k,oldPhysical.getX(i+k),oldPhysical.getY(i+k),oldPhysical.getZ(i+k));}
 g.userData.mrsDeltoid128={...result,version:'M128',parent:'M127',status:'candidate; matched visual proof required'};
 fitDeltoidFacings(g,heads,frame,side,stock);
 harmonizeMrsDeltoidReturnNormals(g);
 return g;
}

function fitDeltoidFacings(g,heads,frame,side,retainedStock){
 const axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out),length=frame.boneLength;
 const attr=g.attributes,p=attr.position,before=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const after=before.map(v=>v.clone()),key=v=>v.toArray().map(x=>x.toFixed(6)).join(',');
 const coords=v=>({t:v.dot(axis)/length,angle:Math.atan2(v.dot(out),v.dot(front))});
 const fits=heads.map(h=>{
  if(h.id!=='LATERAL'){
   const bounds=h.id==='ANTERIOR'?[-.20,-.045,.35,1.04]:[-.16,.035,2.04,2.85],eligible=[],edges=new Map();
   for(let i=0;i<before.length;i+=3){const v=before.slice(i,i+3),q=v.map(coords),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),area2=n.length(),longest=Math.max(...v.map((a,k)=>a.distanceToSquared(v[(k+1)%3])));n.normalize();
    if(!q.every(c=>c.t>=bounds[0]&&c.t<=bounds[1]&&c.angle>=bounds[2]&&c.angle<=bounds[3])||Math.abs(n.dot(axis))>=.45||n.dot(h.normal)<=.80||area2/longest<=.015)continue;
    const f={index:i/3,vertices:v,neighbors:new Set(),area2,normal:n};eligible.push(f);
    for(let k=0;k<3;k++){const e=[key(v[k]),key(v[(k+1)%3])].sort().join('|');if(edges.has(e)){const other=edges.get(e);f.neighbors.add(other);other.neighbors.add(f);}else edges.set(e,f);}
   }
   const unseen=new Set(eligible),components=[];while(unseen.size){const todo=[unseen.values().next().value],component=[];unseen.delete(todo[0]);while(todo.length){const f=todo.pop();component.push(f);for(const n of f.neighbors)if(unseen.delete(n))todo.push(n);}components.push(component);}
   components.sort((a,b)=>b.reduce((s,f)=>s+f.area2,0)-a.reduce((s,f)=>s+f.area2,0));const core=components[0];if(!core||core.length<2)throw new Error('M128 missing connected '+h.id+' crown');
   const vertices=[...new Map(core.flatMap(f=>f.vertices.map(v=>[key(v),v]))).values()],coreKeys=new Set(vertices.map(key));
   const radial=vertices.map(v=>v.clone().addScaledVector(axis,-v.dot(axis)).normalize());
   const measure=(theta,slope)=>{if(Math.abs(slope)>.45)return null;const normal=out.clone().multiplyScalar(Math.sin(theta)).addScaledVector(front,Math.cos(theta)).addScaledVector(axis,slope).normalize();if(normal.dot(h.normal)<.8)return null;
    const q=vertices.map(v=>v.dot(normal)),f=radial.map(v=>v.dot(normal));if(Math.min(...f)<=.5)return null;let distance=0;
    for(let i=0;i<q.length;i++)for(let j=0;j<i;j++)distance=Math.max(distance,Math.abs(q[i]-q[j])/(f[i]+f[j]));
    const lo=Math.max(...q.map((v,i)=>v-distance*f[i])),hi=Math.min(...q.map((v,i)=>v+distance*f[i]));return{normal,offset:(lo+hi)/2,distance,theta,slope};
   };
   const seed=core.reduce((n,f)=>n.addScaledVector(f.normal,f.area2),new Vector3()).normalize(),seedTheta=Math.atan2(seed.dot(out),seed.dot(front)),seedSlope=seed.dot(axis)/Math.hypot(seed.dot(out),seed.dot(front));
   let best=measure(seedTheta,Math.max(-.44,Math.min(.44,seedSlope))),radius=.30;
   for(let pass=0;pass<5;pass++){const center=best;for(let i=-5;i<=5;i++)for(let j=-5;j<=5;j++){const candidate=measure(center.theta+i*radius/5,center.slope+j*radius/5);if(candidate&&candidate.distance<best.distance)best=candidate;}radius*=.25;}
   if(best.distance>.008)throw new Error('M128 connected crown requires excessive displacement '+h.id);
   return{...h,...best,domain:v=>coreKeys.has(key(v))?1:0,coreTriangles:core.map(f=>f.index),fitMethod:'connected anatomical crown; minimax radial plane fit; no offset bias or core clamp'};
  }
  const limits=h.id==='LATERAL'?[-.35,-.24,.005,.17]:h.id==='ANTERIOR'?[-.36,-.29,-.035,.14]:[-.35,-.25,.025,.20];
  const width=h.id==='LATERAL'?.30:.32,domain=v=>{const c=coords(v);return band(c.t,...limits)*band(wrap(c.angle-h.angle),-width-.14,-width,width,width+.14);};
  const crown=[],sumNormal=new Vector3();let totalArea=0;
  for(let i=0;i<before.length;i+=3){const v=before.slice(i,i+3);if(!v.every(p=>domain(p)>.99999))continue;const n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),area=n.length()*.5;sumNormal.add(n);totalArea+=area;crown.push({center:v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3),area});}
  if(!crown.length)throw new Error('M128 empty physical crown '+h.id);
  const normal=h.id==='LATERAL'?out.clone():sumNormal.normalize();
  if(normal.dot(h.normal)<.8)throw new Error('M128 crown fit disagrees with anatomical facing '+h.id);
  const offset=h.id==='LATERAL'?Math.max(...before.filter(v=>coords(v).t<.26).map(v=>v.dot(out))):crown.reduce((sum,s)=>sum+s.area*s.center.dot(normal),0)/totalArea+.0015;
  return{...h,normal,limits,width,domain,offset};
 });
 for(let i=0;i<after.length;i++)for(const h of fits){const w=h.domain(before[i]);if(!w)continue;const radial=before[i].clone().addScaledVector(axis,-before[i].dot(axis)).normalize(),facing=radial.dot(h.normal);if(facing<=.3)throw new Error('M128 invalid radial crown chart');const raw=(h.offset-before[i].dot(h.normal))/facing,distance=h.coreTriangles?raw:Math.max(-.008,Math.min(.014,raw));after[i].addScaledVector(radial,w*distance);}
 const returnSolve=coupleFacingReturns(before,after,v=>fits.some(h=>h.domain(v)>.99999),v=>{const c=coords(v);return c.t>-.36&&c.t<.25&&v.dot(out)>0;},retainedStock);
 for(let i=0;i<after.length;i++)after[i].copy(returnSolve.positions[i]);
 // Project the two-dimensional surface, then validate its actual triangles.
 // A volume-map determinant is not the validity criterion for a flat facing.
 const oldNormals=new Map(),newNormals=new Map();let minArea=1,minDot=1,maxShift=0,worst=null;
 for(let i=0;i<p.count;i+=3){const a=before.slice(i,i+3),b=after.slice(i,i+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));
  minArea=Math.min(minArea,m.length()/n.length());const dot=n.clone().normalize().dot(m.clone().normalize());if(dot<minDot){minDot=dot;worst={triangle:i/3,before:a.map(v=>v.toArray()),after:b.map(v=>v.toArray()),beforeNormal:n.clone().normalize().toArray(),afterNormal:m.clone().normalize().toArray()};}
  for(let k=0;k<3;k++){const id=key(a[k]);if(!oldNormals.has(id)){oldNormals.set(id,new Vector3());newNormals.set(id,new Vector3());}oldNormals.get(id).add(n);newNormals.get(id).add(m);}
 }
 if(minArea<.35||minDot<.55)throw new Error('M128 physical facing support invalid '+JSON.stringify({minArea,minDot,worst}));
 for(let i=0;i<p.count;i++){
  const distance=before[i].distanceTo(after[i]);if(distance<1e-12)continue;maxShift=Math.max(maxShift,distance);
  const id=key(before[i]),rotation=new Quaternion().setFromUnitVectors(oldNormals.get(id).clone().normalize(),newNormals.get(id).clone().normalize()),seen=new Set();
  for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal']){const a=attr[name];if(seen.has(a))continue;seen.add(a);const n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(rotation).normalize();a.setXYZ(i,n.x,n.y,n.z);a.needsUpdate=true;}
  p.setXYZ(i,after[i].x,after[i].y,after[i].z);
 }
 const positions=i=>new Vector3().fromBufferAttribute(p,i),planes=[];
 for(const h of fits){
  const indices=[];for(let i=0;i<p.count;i+=3){if(![0,1,2].every(k=>h.domain(before[i+k])>.99999))continue;
   if([0,1,2].every(k=>Math.abs(positions(i+k).dot(h.normal)-h.offset)<2e-7))indices.push(i/3);
  }
  if(indices.length<2)throw new Error('M128 insufficient physical crown triangles '+h.id+': '+indices.length);
  const center=new Vector3(),normal=new Vector3();let area=0;
  for(const t of indices){const a=[0,1,2].map(k=>positions(3*t+k)),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),w=n.length()*.5;area+=w;normal.add(n);center.addScaledVector(a[0].clone().add(a[1]).add(a[2]).multiplyScalar(1/3),w);}
  normal.normalize();center.divideScalar(area);let residual=0,spread=0;
  for(const t of indices){const a=[0,1,2].map(k=>positions(3*t+k)),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])).normalize();spread=Math.max(spread,n.angleTo(normal));
   for(let k=0;k<3;k++){residual=Math.max(residual,Math.abs(a[k].clone().sub(center).dot(normal)));attr.aCrystalNormal.setXYZ(3*t+k,normal.x,normal.y,normal.z);}
  }
  if(residual>2e-7||spread>.2*Math.PI/180)throw new Error('M128 noncoplanar crown '+h.id);
  const lr=side==='left'?'L':'R',id='MRS_DELTOID_'+lr+'_128_'+h.id+'_CROWN';
  planes.push({id,planeId:id,region:'DELTOID_'+h.id,side:lr,anatomicalOwner:h.id.toLowerCase()+' deltoid crown',type:'broad anatomical facing',triangleIndices:indices,centerPosition:center.toArray(),averageNormal:normal.toArray(),apexDirection:axis.toArray(),area,maximumPlaneResidual:residual,maximumPhysicalNormalSpreadDegrees:spread*180/Math.PI,mirroredId:id.replace('_'+lr+'_','_'+(lr==='L'?'R':'L')+'_'),adjacentPlanes:[],blackPointAdjacency:[],status:'physical crown; anatomical closure requires matched proof'});
 }
 for(let i=0;i<p.count;i+=3){if([0,1,2].every(k=>positions(i+k).equals(before[i+k])))continue;const a=[0,1,2].map(k=>positions(i+k)),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])).normalize();for(let k=0;k<3;k++)attr.aPhysicalNormal.setXYZ(i+k,n.x,n.y,n.z);}
 g.userData.mrsDeltoid128.planes=planes;g.userData.mrsDeltoid128.surfaceProjection={maximumDisplacement:maxShift,minimumAreaRatio:minArea,minimumNormalDot:minDot,returnSolve:{freeNodes:returnSolve.freeNodes,coreNodes:returnSolve.coreNodes,orientationProjection:returnSolve.orientationProjection},fits:fits.map(h=>({head:h.id,normal:h.normal.toArray(),offset:h.offset,coreTriangles:h.coreTriangles||null,maximumCoreRadialDisplacement:h.distance||null,method:h.fitMethod||'lateral envelope facing'})),method:'connected crowns, minimax radial projection, fixed cores, coupled support and retained physical-normal cones'};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}

export function coupleFacingReturns(before,target,isCore,inHalo,retainedStock,options={}){
 const nodes=[],map=new Map(),ids=[];
 for(let i=0;i<before.length;i++){const key=(options.stableTopology?retainedStock[i]:before[i]).toArray().map(v=>v.toFixed(6)).join(',');if(!map.has(key)){map.set(key,nodes.length);nodes.push({p:before[i],delta:target[i].clone().sub(before[i]),core:isCore(before[i]),halo:inHalo(before[i]),neighbors:new Set(),row:new Map(),mass:0});}ids.push(map.get(key));}
 const add=(i,j,w)=>nodes[i].row.set(j,(nodes[i].row.get(j)||0)+w),lambda=options.lambda??.000065,cone=options.normalCone??.60;
 for(let i=0;i<before.length;i+=3){const q=ids.slice(i,i+3),v=q.map(id=>nodes[id].p),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),area2=n.length();n.divideScalar(area2);
  const grad=v.map((_,k)=>n.clone().cross(v[(k+2)%3].clone().sub(v[(k+1)%3])).divideScalar(area2));
  for(let k=0;k<3;k++){nodes[q[k]].mass+=area2/6;for(let j=0;j<3;j++){add(q[k],q[j],lambda*area2*.5*grad[k].dot(grad[j]));if(j!==k)nodes[q[k]].neighbors.add(q[j]);}}
 }
 const free=nodes.flatMap((n,i)=>!n.core&&n.halo?[i]:[]),freeSet=new Set(free);
 nodes.forEach((n,i)=>add(i,i,n.mass));const output=[];
 for(let k=0;k<3;k++){
  const x=new Float64Array(nodes.length),r=x.slice(),z=x.slice(),d=x.slice(),ad=x.slice();let rz=0;
  nodes.forEach((n,i)=>x[i]=n.delta.getComponent(k));
  for(const i of free){const n=nodes[i];let v=n.mass*n.delta.getComponent(k);for(const[j,w]of n.row)v-=w*x[j];r[i]=v;z[i]=v/n.row.get(i);d[i]=z[i];rz+=v*z[i];}
  const start=Math.sqrt(rz);let iterations=0;
  for(;iterations<4000&&Math.sqrt(rz)>Math.max(1e-13,start*1e-9);iterations++){
   let den=0;for(const i of free){let v=0;for(const[j,w]of nodes[i].row)if(freeSet.has(j))v+=w*d[j];ad[i]=v;den+=d[i]*v;}
   if(!(den>0))throw new Error('M128 invalid facing support system');const alpha=rz/den;let next=0;
   for(const i of free){x[i]+=alpha*d[i];r[i]-=alpha*ad[i];z[i]=r[i]/nodes[i].row.get(i);next+=r[i]*z[i];}const beta=next/rz;for(const i of free)d[i]=z[i]+beta*d[i];rz=next;
  }
  if(Math.sqrt(rz)>Math.max(1e-12,start*1e-8))throw new Error('M128 facing support solve did not converge');output.push(x);
 }
 // A membrane energy alone does not constrain the orientation of narrow
 // inherited return triangles. Project its solution into the retained
 // physical-normal cones while keeping every crown and exterior node fixed.
 const solved=nodes.map((n,i)=>n.p.clone().add(new Vector3(...output.map(v=>v[i]))));
 const faces=[];
 for(let i=0;i<before.length;i+=3){const v=retainedStock.slice(i,i+3),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));faces.push({ids:ids.slice(i,i+3),normal:cross.clone().normalize(),area2:cross.length()});}
 let iterations=0,minimumDot=1;
 for(;iterations<600;iterations++){
  let worst=0;minimumDot=1;
  for(const f of faces){const[a,b,c]=f.ids.map(id=>solved[id]);
   if(options.minimumAreaRatio){
    const cross=b.clone().sub(a).cross(c.clone().sub(a)),deficit=options.minimumAreaRatio*f.area2-f.normal.dot(cross);
    if(deficit>f.area2*1e-8){
     worst=Math.max(worst,deficit/f.area2);
     const grad=[b.clone().sub(c).cross(f.normal),c.clone().sub(a).cross(f.normal),a.clone().sub(b).cross(f.normal)];let den=0;
     for(let k=0;k<3;k++)if(freeSet.has(f.ids[k]))den+=grad[k].lengthSq();
     if(den<1e-22)throw new Error('Fixed crown compresses support area '+JSON.stringify({ids:f.ids,ratio:f.normal.dot(cross)/f.area2}));
     for(let k=0;k<3;k++)if(freeSet.has(f.ids[k]))solved[f.ids[k]].addScaledVector(grad[k],deficit/den*.9);
    }
   }
   const m=b.clone().sub(a).cross(c.clone().sub(a)),len=m.length(),unit=m.clone().divideScalar(len),dot=f.normal.dot(unit);minimumDot=Math.min(minimumDot,dot);
   const deficit=cone*len-f.normal.dot(m);if(deficit<=len*1e-8)continue;
   worst=Math.max(worst,deficit/len);const g=f.normal.clone().addScaledVector(unit,-cone),grad=[b.clone().sub(c).cross(g),c.clone().sub(a).cross(g),a.clone().sub(b).cross(g)];
   let den=0;for(let k=0;k<3;k++)if(freeSet.has(f.ids[k]))den+=grad[k].lengthSq();
   if(den<1e-22)throw new Error('M128 fixed crown violates retained normal cone '+JSON.stringify({ids:f.ids,dot}));
   const step=deficit/den;for(let k=0;k<3;k++)if(freeSet.has(f.ids[k]))solved[f.ids[k]].addScaledVector(grad[k],step*.9);
  }
  // Opt-in R166 crown-sidewall constraints act on positions, not shading.
  for(const constraint of options.boundaryCones||[]){
   const f=faces[constraint.triangle],v=f.ids.map(id=>solved[id]),[a,b,c]=v,normal=constraint.normal;
   const m=b.clone().sub(a).cross(c.clone().sub(a)),len=m.length(),unit=m.clone().divideScalar(len),deficit=constraint.cosine*len-normal.dot(m);
   if(deficit<=len*1e-8)continue;worst=Math.max(worst,deficit/len);
   const g=normal.clone().addScaledVector(unit,-constraint.cosine),grad=[b.clone().sub(c).cross(g),c.clone().sub(a).cross(g),a.clone().sub(b).cross(g)];let den=0;
   for(let k=0;k<3;k++)if(freeSet.has(f.ids[k]))den+=grad[k].lengthSq();
   if(den<1e-22)throw new Error('Fixed crown boundary cannot satisfy physical sidewall cone');
   for(let k=0;k<3;k++)if(freeSet.has(f.ids[k]))solved[f.ids[k]].addScaledVector(grad[k],deficit/den*.9);
  }
  if(worst<1e-7)break;
 }
 if(minimumDot<cone-.01)throw new Error('M128 constrained return failed '+JSON.stringify({minimumDot,iterations}));
 if(options.minimumAreaRatio){const minimumSignedArea=Math.min(...faces.map(f=>{const[a,b,c]=f.ids.map(id=>solved[id]);return b.clone().sub(a).cross(c.clone().sub(a)).dot(f.normal)/f.area2;}));if(minimumSignedArea<options.minimumAreaRatio-.01)throw new Error('Constrained support area failed '+JSON.stringify({minimumSignedArea,iterations}));}
 for(const constraint of options.boundaryCones||[]){const f=faces[constraint.triangle],[a,b,c]=f.ids.map(id=>solved[id]),n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();if(n.dot(constraint.normal)<constraint.cosine-.005)throw new Error('R166 crown sidewall cone did not converge '+constraint.triangle);}
 return{positions:before.map((p,i)=>p.clone().add(solved[ids[i]].clone().sub(nodes[ids[i]].p))),freeNodes:free.length,coreNodes:nodes.filter(n=>n.core).length,orientationProjection:{iterations,minimumDot}};
}

export function harmonizeMrsDeltoidReturnNormals(g){
 const meta=g.userData.mrsDeltoid128,p=g.attributes.position,n=g.attributes.aCrystalNormal,axis=new Vector3().fromArray(meta.frame.axis),out=new Vector3().fromArray(meta.frame.out),length=meta.frame.boneLength;
 const key=v=>v.toArray().map(x=>x.toFixed(6)).join(','),points=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const owners=new Map(),anchors=new Map(),groups=new Map();
 for(const plane of meta.planes){const normal=new Vector3().fromArray(plane.averageNormal),vertices=new Map();for(const t of plane.triangleIndices){owners.set(t,plane);for(let k=0;k<3;k++){const v=points[3*t+k],id=key(v);vertices.set(id,v);if(anchors.has(id)&&anchors.get(id).distanceTo(normal)>1e-5)throw new Error('M128 conflicting crown corner');anchors.set(id,normal);}}plane.returnSeeds=[...vertices.values()];}
 for(let i=0;i<p.count;i++){const id=key(points[i]);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(i);}
 let changedCorners=0,maximumBoundaryTurnBefore=0,maximumBoundaryTurnAfter=0;
 for(const[id,corners]of groups){const v=points[corners[0]],t=v.dot(axis)/length;if(t<=-.37||t>=.26||v.dot(out)<=0)continue;
  const returns=corners.filter(i=>!owners.has(Math.floor(i/3)));if(!returns.length)continue;
  const original=new Vector3().fromBufferAttribute(n,returns[0]);let target=anchors.get(id),weight=target?1:0;
  if(!target){const sum=new Vector3();let total=0;for(const plane of meta.planes){const distance=Math.min(...plane.returnSeeds.map(q=>v.distanceTo(q))),w=1-ease(distance/.022);if(w<=0)continue;weight=Math.max(weight,w);total+=w;sum.addScaledVector(new Vector3().fromArray(plane.averageNormal),w);}if(total)target=sum.normalize();}
  if(!target||!weight)continue;
  const blended=original.clone().lerp(target,weight).normalize();
  for(const i of returns){const old=new Vector3().fromBufferAttribute(n,i);if(anchors.has(id))maximumBoundaryTurnBefore=Math.max(maximumBoundaryTurnBefore,old.angleTo(target));n.setXYZ(i,blended.x,blended.y,blended.z);changedCorners++;if(anchors.has(id))maximumBoundaryTurnAfter=Math.max(maximumBoundaryTurnAfter,blended.angleTo(target));}
 }
 for(const plane of meta.planes)delete plane.returnSeeds;
 n.needsUpdate=true;meta.returnNormals={method:'physical crown normal continued across its shared boundary and blended through adjacent return skin; crown geometry and its flat normals remain exact',supportDistance:.022,changedCorners,maximumBoundaryTurnBeforeDegrees:maximumBoundaryTurnBefore*180/Math.PI,maximumBoundaryTurnAfterDegrees:maximumBoundaryTurnAfter*180/Math.PI};
 return g;
}
