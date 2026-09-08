import {Vector3,Quaternion,Ray} from '../../vendor/three/three.module.min.js';
import {coupleFacingReturns} from './mrs-deltoid-heads.js';
const key=v=>v.toArray().map(x=>x.toFixed(6)).join(',');
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};

// R166-M02: sample the retained muscle envelope and its actual distal seat.
// An oblique, monotone longitudinal loft replaces interrupted distal returns.
export function authorMrsR166DistalReturn(g,arm,side){
 const attrs=g.attributes,p=attrs.position,frame=g.userData.mrsSurgical126.frame;
 const axis=new Vector3().fromArray(frame.axis),out=new Vector3().fromArray(frame.out),front=new Vector3().fromArray(frame.front),length=frame.boneLength;
 const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const coords=v=>({t:v.dot(axis)/length,a:Math.atan2(v.dot(out),v.dot(front)),r:Math.hypot(v.dot(out),v.dot(front))});
 const fields=['mrsDeltoid128','mrsBiceps139','mrsTriceps144','mrsDeltoidInsertion129','mrsBicepsProximal141','mrsDeltoidFront142','mrsDeltoidSide143','mrsPosterior146'];
 const protectedPlanes=fields.flatMap(f=>g.userData[f].planes).concat(g.userData.mrsBrachialisPatch127.planes.filter(pl=>pl.id.endsWith('_CROWN')));
 const held=new Set(protectedPlanes.flatMap(pl=>pl.triangleIndices.flatMap(t=>stock.slice(3*t,3*t+3).map(key))));
 // Freeze whole faces across the seat and angular boundaries. The anterior
 // tendon and posterior midline are different owners, not part of this loft.
 for(let i=0;i<stock.length;i+=3)if(stock.slice(i,i+3).some(v=>{const {t,a}=coords(v);return t>=.86||a<=.92||a>=2.75;}))for(const v of stock.slice(i,i+3))held.add(key(v));
 const ray=new Ray(),hit=new Vector3(),sample=(t,a)=>{
  ray.origin.copy(axis).multiplyScalar(t*length);ray.direction.copy(front).multiplyScalar(Math.cos(a)).addScaledVector(out,Math.sin(a));let radius=-Infinity;
  for(let i=0;i<stock.length;i+=3){if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))radius=Math.max(radius,hit.clone().sub(ray.origin).dot(ray.direction));}
  if(!(radius>.015&&radius<.25))throw new Error('R166 distal loft lacks an actual radial section '+JSON.stringify({side,t,a,radius}));return radius;
 };
 const count=96,sections=[];
 for(let i=0;i<count;i++){
  const a=-Math.PI+2*Math.PI*i/count,c=Math.cos(a),start=.59+.05*Math.max(0,-c)-.05*Math.max(0,c),end=.86;
  const r0=sample(start,a),r1=sample(end,a),secant=(r1-r0)/(end-start);
  // The biceps/brachialis valley can be narrower than the distal seat on an
  // individual ray. Preserve that measured transition instead of forcing a
  // fictitious contraction in every angular sector.
  const slope=(r,t,direction)=>{const q=(sample(t+direction*.025,a)-r)/(direction*.025);return Math.max(Math.min(0,3*secant),Math.min(Math.max(0,3*secant),q));};
  sections.push({a,start,end,r0,r1,m0:slope(r0,start,-1),m1:slope(r1,end,1)});
 }
 const loft=(t,a)=>{
  const index=(a+Math.PI)/(2*Math.PI)*count,i=Math.floor(index)%count,w=index-Math.floor(index);
  const evaluate=s=>{const u=Math.max(0,Math.min(1,(t-s.start)/(s.end-s.start))),u2=u*u,u3=u2*u;return (2*u3-3*u2+1)*s.r0+(u3-2*u2+u)*(s.end-s.start)*s.m0+(-2*u3+3*u2)*s.r1+(u3-u2)*(s.end-s.start)*s.m1;};
  return evaluate(sections[i])*(1-w)+evaluate(sections[(i+1)%count])*w;
 };
 const domain=v=>{const {t,a}=coords(v);return t>.535&&t<.86&&a>.92&&a<2.75&&!held.has(key(v));};
 const targets=stock.map(v=>{
  const {t,a,r}=coords(v);if(!domain(v))return v.clone();
  const start=.59+.05*Math.max(0,-Math.cos(a))-.05*Math.max(0,Math.cos(a));
  const weight=.86*ease((t-start)/.07)*(1-ease((t-.815)/.045))*ease((a-.92)/.25)*(1-ease((a-2.52)/.23));
  const shift=(loft(t,a)-r)*weight;
  return v.clone().addScaledVector(out,shift*Math.sin(a)).addScaledVector(front,shift*Math.cos(a));
 });
 let current=stock.map(v=>v.clone()),solve;const stages=[];
 for(let stage=1;stage<=8;stage++){
  const lookup=new Map(current.map((v,i)=>[key(v),i])),at=v=>stock[lookup.get(key(v))];
  solve=coupleFacingReturns(current,stock.map((v,i)=>v.clone().lerp(targets[i],stage/8)),v=>held.has(key(at(v))),v=>domain(at(v)),stock,{normalCone:.70,minimumAreaRatio:.60,lambda:.00012,stableTopology:true});
  current=solve.positions;stages.push({stage,...solve.orientationProjection});
 }
 const moved=current,groups=new Map();for(let i=0;i<stock.length;i++){const id=key(stock[i]);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(i);}
 for(const ids of groups.values()){if(ids.every(i=>moved[i].distanceTo(stock[i])<1e-12))continue;const v=moved[ids[0]];if(ids.some(i=>moved[i].distanceTo(v)>2e-7))throw new Error('R166 distal topology group split');for(const i of ids)moved[i].copy(v);}
 // Geometry is stored as Float32. Decide which normals to refresh against
 // those committed positions, so sub-ULP solver motion cannot touch fixed faces.
 for(const v of moved)v.set(Math.fround(v.x),Math.fround(v.y),Math.fround(v.z));
 const oldNormals=new Map(),newNormals=new Map();for(const v of stock){oldNormals.set(key(v),new Vector3());newNormals.set(key(v),new Vector3());}
 let maxMove=0,minArea=1,minDot=1,movedCorners=0;
 for(let i=0;i<stock.length;i+=3){const a=stock.slice(i,i+3),b=moved.slice(i,i+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));minArea=Math.min(minArea,m.length()/n.length());minDot=Math.min(minDot,n.clone().normalize().dot(m.clone().normalize()));
  for(let k=0;k<3;k++){oldNormals.get(key(a[k])).add(n);newNormals.get(key(a[k])).add(m);maxMove=Math.max(maxMove,a[k].distanceTo(b[k]));}
  if(b.some((v,k)=>v.distanceTo(a[k])>1e-12)){m.normalize();for(let k=0;k<3;k++)attrs.aPhysicalNormal.setXYZ(i+k,m.x,m.y,m.z);}
 }
 if(minArea<.59||minDot<.69||maxMove>.025)throw new Error('R166 distal loft violates physical support '+JSON.stringify({side,minArea,minDot,maxMove}));
 for(let i=0;i<stock.length;i++){
  if(moved[i].distanceTo(stock[i])<1e-12)continue;movedCorners++;
  const id=key(stock[i]),rotation=new Quaternion().setFromUnitVectors(oldNormals.get(id).clone().normalize(),newNormals.get(id).clone().normalize()),seen=new Set();
  for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal']){const a=attrs[name];if(!a||seen.has(a))continue;seen.add(a);const n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(rotation).normalize();a.setXYZ(i,n.x,n.y,n.z);}
  p.setXYZ(i,moved[i].x,moved[i].y,moved[i].z);
 }
 const changedSupports=[];
 for(const pl of g.userData.mrsBrachialisPatch127.planes){
  if(!pl.triangleIndices.some(t=>moved.slice(t*3,t*3+3).some((v,k)=>v.distanceTo(stock[t*3+k])>1e-12)))continue;
  const normal=new Vector3(),center=new Vector3();let area=0;
  for(const t of pl.triangleIndices){const v=moved.slice(t*3,t*3+3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),w=n.length()/2;normal.add(n);center.addScaledVector(v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3),w);area+=w;}normal.normalize();center.divideScalar(area);
  let residual=0,spread=0;for(const t of pl.triangleIndices){const v=moved.slice(t*3,t*3+3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();spread=Math.max(spread,n.angleTo(normal));for(const q of v)residual=Math.max(residual,Math.abs(q.clone().sub(center).dot(normal)));}
  // Continuous supports use normals derived from their real incident faces.
  // Do not keep the obsolete flat-patch normal after the support has curved.
  const geometricNormals=new Map();
  for(const t of pl.triangleIndices){const v=moved.slice(t*3,t*3+3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));for(const q of v){const id=key(q);if(!geometricNormals.has(id))geometricNormals.set(id,new Vector3());geometricNormals.get(id).add(n);}}
  for(const t of pl.triangleIndices)for(let k=0;k<3;k++){const n=geometricNormals.get(key(moved[t*3+k])).clone().normalize();attrs.aCrystalNormal.setXYZ(t*3+k,n.x,n.y,n.z);}
  Object.assign(pl,{type:'continuous distal insertion support',geometryRevision:'R166-M02',centerPosition:center.toArray(),averageNormal:normal.toArray(),area,maximumPlaneResidual:residual,maximumPhysicalNormalSpreadDegrees:spread*180/Math.PI,normalRepresentation:'area-weighted actual incident faces within registered support',status:'Distal brachialis loft; main crown retained exactly'});changedSupports.push(pl.id);
 }
 g.userData.mrsR166Distal={version:'R166-M02',parent:'R166-M01',side,frame,method:'Oblique lateral Hermite return sampled from retained proximal crown envelope and distal joint seat; fixed crowns and whole-triangle seat/angular boundaries',sections,controls:{domain:[.535,.86],angularDomain:[.92,2.75],maximumBlend:.86,anteriorStart:.54,lateralStart:.59,posteriorStart:.64},maximumDisplacement:maxMove,minimumAreaRatio:minArea,minimumNormalDot:minDot,movedCorners,changedSupports,stages,protected:'All deltoid/biceps/triceps crowns, brachialis primary crown, anterior/posterior midlines, proximal arm, elbow seat, other meshes and transforms',status:'Candidate; clay multiview gate required'};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();return g;
}
