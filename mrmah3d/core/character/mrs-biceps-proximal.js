import {cutMrsBicepsProximalStation141} from './mrs-biceps-proximal-boundary.js';
import {Vector3,Quaternion} from '../../vendor/three/three.module.min.js';
import {coupleFacingReturns} from './mrs-deltoid-heads.js';
const key=v=>v.toArray().map(x=>x.toFixed(6)).join(',');

// Paired anterior proximal return facings hinge on the retained biceps crowns. Their
// directions come from anatomical ownership, not an axis-aligned rectangle.
export function authorMrsBicepsProximal141(g,arm,side){
 cutMrsBicepsProximalStation141(g,side);
 const attrs=g.attributes,p=attrs.position,f=g.userData.mrsSurgical126.frame;
 const axis=new Vector3().fromArray(f.axis),front=new Vector3().fromArray(f.front),out=new Vector3().fromArray(f.out),length=f.boneLength;
 const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i)),target=stock.map(v=>v.clone());
 const protectedPlanes=['mrsBrachialisPatch127','mrsDeltoid128','mrsDeltoidInsertion129','mrsBiceps139'].flatMap(k=>g.userData[k].planes);
 const protectedKeys=new Set(protectedPlanes.flatMap(pl=>pl.triangleIndices.flatMap(t=>stock.slice(t*3,t*3+3).map(key))));
 const coords=v=>({t:v.dot(axis)/length,angle:Math.atan2(v.dot(out),v.dot(front))});
 const fits=g.userData.mrsBiceps139.planes.filter(p=>p.id.includes('ANTERIOR')).map(crown=>{
  const n0=new Vector3().fromArray(crown.averageNormal),d0=new Vector3().fromArray(crown.centerPosition).dot(n0),anchorT=.38*length;
  const ownKeys=new Set(crown.triangleIndices.flatMap(t=>stock.slice(t*3,t*3+3).map(key)));
  const guide=n0.clone().addScaledVector(axis,-.35).normalize(),eligible=[],edges=new Map();
  for(let i=0;i<p.count;i+=3){
   const v=stock.slice(i,i+3),c=v.map(coords),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),normal=cross.clone().normalize();
   if(!c.every(q=>q.t>=.30-1e-7&&q.t<=.380001)||c.reduce((s,q)=>s+q.angle,0)/3<-.85||c.reduce((s,q)=>s+q.angle,0)/3>.30||normal.dot(guide)<.94)continue;
   if(v.some(q=>protectedKeys.has(key(q))&&(!ownKeys.has(key(q))||Math.abs(coords(q).t-.38)>1e-6)))continue;
   const face={index:i/3,v,normal,area2:cross.length(),neighbors:new Set()};eligible.push(face);
   for(let k=0;k<3;k++){const id=[key(v[k]),key(v[(k+1)%3])].sort().join('|');if(edges.has(id)){const other=edges.get(id);face.neighbors.add(other);other.neighbors.add(face);}else edges.set(id,face);}
  }
  const todo=new Set(eligible),groups=[];
  while(todo.size){const stack=[todo.values().next().value],group=[];todo.delete(stack[0]);while(stack.length){const q=stack.pop();group.push(q);for(const n of q.neighbors)if(todo.delete(n))stack.push(n);}if(group.some(q=>q.v.some(v=>ownKeys.has(key(v)))))groups.push(group);}
  groups.sort((a,b)=>b.reduce((s,q)=>s+q.area2,0)-a.reduce((s,q)=>s+q.area2,0));let core=groups[0];
  if(!core||core.length<2)throw new Error('M141 missing connected proximal return '+side+' '+crown.id);
  // A concave facing footprint can pin all corners of an unowned return.
  // Leave its least costly non-anchor boundary node free rather than flatten
  // a differently directed anatomical wall into the crown family.
  let releasedSupportNodes=0;
  for(let pass=0;pass<12;pass++){const ids=new Set(core.map(q=>q.index)),ks=new Set(core.flatMap(q=>q.v.map(key)));let released=false;for(let i=0;i<p.count;i+=3){if(ids.has(i/3))continue;const v=stock.slice(i,i+3);if(!v.every(q=>ks.has(key(q))))continue;const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();if(normal.dot(guide)>=.901)continue;const options=v.filter(q=>!protectedKeys.has(key(q))).map(q=>({id:key(q),cost:core.filter(f=>f.v.some(v=>key(v)===key(q))).reduce((s,f)=>s+f.area2,0)})).sort((a,b)=>a.cost-b.cost);if(!options.length)throw new Error('M141 unsupported fixed anatomical wall');core=core.filter(f=>!f.v.some(q=>key(q)===options[0].id));releasedSupportNodes++;released=true;break;}if(!released)break;}
  const vertices=[...new Map(core.flatMap(q=>q.v.map(v=>[key(v),v]))).values()],keys=new Set(vertices.map(key));
  let best=null;
  for(let step=0;step<=700;step++){
   const hinge=-.8+step*.001,n=n0.clone().addScaledVector(axis,hinge),offset=(d0+hinge*anchorT)/n.length(),normal=n.normalize();
   if(core.some(q=>q.normal.dot(normal)<.901))continue;
   let distance=0;
   for(const v of vertices){const radial=v.clone().addScaledVector(axis,-v.dot(axis)).normalize(),den=radial.dot(normal);if(den<.6){distance=Infinity;break;}distance=Math.max(distance,Math.abs(offset-v.dot(normal))/den);}
   if(!best||distance<best.distance)best={normal,offset,distance,hinge};
  }
  if(!best||best.distance>.008)throw new Error('M141 unsupported return fit '+side+' '+crown.id+' '+best?.distance);
  return {...best,crown,releasedSupportNodes,vertices,keys,triangles:core.map(q=>q.index)};
 });
 const coreKeys=new Set(fits.flatMap(q=>[...q.keys])),owners=new Map();
 for(const fit of fits)for(const id of fit.keys){if(!owners.has(id))owners.set(id,[]);owners.get(id).push(fit);}
 for(let i=0;i<p.count;i++){
  const v=stock[i],fs=owners.get(key(v));if(!fs||protectedKeys.has(key(v)))continue;
  if(fs.length===1){const fit=fs[0],radial=v.clone().addScaledVector(axis,-v.dot(axis)).normalize();target[i].addScaledVector(radial,(fit.offset-v.dot(fit.normal))/radial.dot(fit.normal));}
  else{const[a,b]=fs,ax=a.normal.dot(out),az=a.normal.dot(front),bx=b.normal.dot(out),bz=b.normal.dot(front),da=a.offset-v.dot(a.normal),db=b.offset-v.dot(b.normal),det=ax*bz-az*bx;if(Math.abs(det)<.1)throw new Error('M141 ambiguous shared ridge');target[i].addScaledVector(out,(da*bz-db*az)/det).addScaledVector(front,(ax*db-bx*da)/det);}
  if(target[i].distanceTo(v)>.008)throw new Error('M141 excessive shared return displacement');
 }
 const near=v=>Math.min(...fits.flatMap(q=>q.vertices.map(p=>v.distanceTo(p))));
 const solve=coupleFacingReturns(stock,target,v=>coreKeys.has(key(v))||protectedKeys.has(key(v)),v=>{const t=coords(v).t;return t>.20&&t<.38&&near(v)<.035;},stock,{normalCone:.90,lambda:.000065});
 const moved=solve.positions,oldNormals=new Map(),newNormals=new Map();let maximumDisplacement=0,minimumNormalDot=1,minimumAreaRatio=1;
 for(const v of stock){oldNormals.set(key(v),new Vector3());newNormals.set(key(v),new Vector3());}
 for(let i=0;i<p.count;i+=3){const a=stock.slice(i,i+3),b=moved.slice(i,i+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));minimumNormalDot=Math.min(minimumNormalDot,n.clone().normalize().dot(m.clone().normalize()));minimumAreaRatio=Math.min(minimumAreaRatio,m.length()/n.length());for(let k=0;k<3;k++){oldNormals.get(key(a[k])).add(n);newNormals.get(key(a[k])).add(m);maximumDisplacement=Math.max(maximumDisplacement,a[k].distanceTo(b[k]));}if(b.some((v,k)=>v.distanceTo(a[k])>1e-12)){m.normalize();for(let k=0;k<3;k++)attrs.aPhysicalNormal.setXYZ(i+k,m.x,m.y,m.z);}}
 if(minimumNormalDot<.89||minimumAreaRatio<.60||maximumDisplacement>.008)throw new Error('M141 invalid proximal support '+JSON.stringify({side,minimumNormalDot,minimumAreaRatio,maximumDisplacement}));
 for(let i=0;i<p.count;i++){if(moved[i].distanceTo(stock[i])<1e-12)continue;const id=key(stock[i]),rotation=new Quaternion().setFromUnitVectors(oldNormals.get(id).clone().normalize(),newNormals.get(id).clone().normalize()),seen=new Set();for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal']){const a=attrs[name];if(!a||seen.has(a))continue;seen.add(a);const n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(rotation).normalize();a.setXYZ(i,n.x,n.y,n.z);}p.setXYZ(i,moved[i].x,moved[i].y,moved[i].z);}
 const points=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i)),planes=[],lr=side==='left'?'L':'R';
 for(const fit of fits){let area=0,residual=0,spread=0;const center=new Vector3(),normal=new Vector3();for(const t of fit.triangles){const a=points.slice(t*3,t*3+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),w=n.length()/2;area+=w;normal.add(n);center.addScaledVector(a[0].clone().add(a[1]).add(a[2]).multiplyScalar(1/3),w);}normal.normalize();center.divideScalar(area);for(const t of fit.triangles){const a=points.slice(t*3,t*3+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])).normalize();spread=Math.max(spread,n.angleTo(normal));for(const v of a)residual=Math.max(residual,Math.abs(v.clone().sub(center).dot(normal)));}
  if(residual>2e-7||spread>.2*Math.PI/180)throw new Error('M141 nonplanar proximal return '+fit.crown.id+' '+residual+' '+spread);
  for(const t of fit.triangles)for(let k=0;k<3;k++)attrs.aCrystalNormal.setXYZ(t*3+k,normal.x,normal.y,normal.z);
  const id=fit.crown.id.replace('_139_','_141_').replace('_CROWN','_PROXIMAL_RETURN');planes.push({id,planeId:id,side:lr,region:'UPPER_BICEPS_PROXIMAL_RETURN',anatomicalOwner:fit.crown.anatomicalOwner.replace('crown facing','proximal return'),type:'anchored anatomical return plane',triangleIndices:fit.triangles,centerPosition:center.toArray(),averageNormal:normal.toArray(),apexDirection:axis.clone().negate().toArray(),area,maximumPlaneResidual:residual,maximumPhysicalNormalSpreadDegrees:spread*180/Math.PI,hinge:fit.hinge,mirroredId:id.replace('_'+lr+'_','_'+(lr==='L'?'R':'L')+'_'),adjacentPlanes:[fit.crown.id],blackPointAdjacency:[],status:'candidate physical return; matched proof required'});
 }
 g.userData.mrsBicepsProximal141={version:'M141',parent:'M140',side,frame:f,planes,maximumDisplacement,minimumNormalDot,minimumAreaRatio,method:'Anatomical source-normal families fitted as anterior physical return planes hinged on the unchanged M139 proximal crown edges',returnSolve:{freeNodes:solve.freeNodes,coreNodes:solve.coreNodes,...solve.orientationProjection},protected:'All previous physical facing buffers, M140 distal support, joints, forearms and other canonical meshes'};
 p.needsUpdate=true;attrs.aCrystalNormal.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();return g;
}
