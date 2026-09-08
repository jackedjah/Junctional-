import {Vector3,Quaternion} from '../../vendor/three/three.module.min.js';
import {coupleFacingReturns} from './mrs-deltoid-heads.js';

const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};
const key=p=>p.toArray().map(x=>x.toFixed(6)).join(',');

// M129: two lower deltoid returns share one insertion ridge. The retained
// shoulder crowns, brachialis and exterior skin are Dirichlet constraints.
export function reconstructMrsDeltoidInsertion129(g,arm,side){
 const attr=g.attributes,p=attr.position,frame=g.userData.mrsSurgical126.frame;
 const axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out),length=frame.boneLength;
 const before=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const coords=v=>({t:v.dot(axis)/length,x:v.dot(front)-.0015,z:v.dot(out)});
 const protectedKeys=new Set();
 for(const meta of [g.userData.mrsDeltoid128,g.userData.mrsBrachialisPatch127])for(const f of meta.planes)for(const t of f.triangleIndices)for(let k=0;k<3;k++)protectedKeys.add(key(before[t*3+k]));
 const inCore=v=>{const c=coords(v);return c.t>.05&&c.t<.22&&Math.abs(c.x)<.05-.13*c.t&&c.z>.07&&!protectedKeys.has(key(v));};
 const inHalo=v=>{const c=coords(v);return c.t>.018&&c.t<.30&&Math.abs(c.x)<.074&&c.z>.035&&!protectedKeys.has(key(v));};
 // Both sides use the same anatomical directions; only the fitted radial
 // offset follows each retained arm. No added groove or independent dents.
 const slopeT=-.245*length,slopeFront=-.35,slopeRear=.20,ridgeHalfWidth=.004;
 // A shared rounded ridge avoids driving a sharp crease through inherited
 // sub-millimetre triangles. Outside this narrow ridge both faces are affine.
 const flow=c=>{const absolute=Math.abs(c.x),ridge=absolute>=ridgeHalfWidth?absolute:.5*(c.x*c.x/ridgeHalfWidth+ridgeHalfWidth);return slopeT*c.t+(slopeFront+slopeRear)*.5*c.x+(slopeFront-slopeRear)*.5*ridge;};
 const samples=[...new Map(before.filter(inCore).map(v=>[key(v),v])).values()];
 if(samples.length<20)throw new Error('M129 insufficient insertion stock');
 const offsets=samples.map(v=>{const c=coords(v);return c.z-flow(c);});
 const offset=offsets.reduce((a,b)=>a+b,0)/offsets.length;
 const target=before.map(v=>{if(!inCore(v))return v.clone();const c=coords(v);return v.clone().addScaledVector(out,offset+flow(c)-c.z);});
 const solve=coupleFacingReturns(before,target,v=>inCore(v)||protectedKeys.has(key(v)),inHalo,before),after=solve.positions;
 let maximumDisplacement=0,minimumAreaRatio=1,minimumNormalDot=1;
 const oldNormals=new Map(),newNormals=new Map();
 for(let i=0;i<before.length;i+=3){const a=before.slice(i,i+3),b=after.slice(i,i+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));
  minimumAreaRatio=Math.min(minimumAreaRatio,m.length()/n.length());minimumNormalDot=Math.min(minimumNormalDot,n.clone().normalize().dot(m.clone().normalize()));
  for(let k=0;k<3;k++){const id=key(a[k]);if(!oldNormals.has(id)){oldNormals.set(id,new Vector3());newNormals.set(id,new Vector3());}oldNormals.get(id).add(n);newNormals.get(id).add(m);}
 }
 if(minimumAreaRatio<.35||minimumNormalDot<.55)throw new Error('M129 invalid support '+JSON.stringify({minimumAreaRatio,minimumNormalDot}));
 for(let i=0;i<p.count;i++){
  const d=before[i].distanceTo(after[i]);if(d<1e-12)continue;maximumDisplacement=Math.max(maximumDisplacement,d);
  const id=key(before[i]),rotation=new Quaternion().setFromUnitVectors(oldNormals.get(id).clone().normalize(),newNormals.get(id).clone().normalize()),seen=new Set();
  for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal']){const a=attr[name];if(seen.has(a))continue;seen.add(a);const n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(rotation).normalize();a.setXYZ(i,n.x,n.y,n.z);a.needsUpdate=true;}
  p.setXYZ(i,after[i].x,after[i].y,after[i].z);
 }
 if(maximumDisplacement>.016)throw new Error('M129 excessive insertion shift');
 const actual=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i)),planes=[],lr=side==='left'?'L':'R';
 for(const owner of ['ANTERIOR','POSTERIOR']){
  const sign=owner==='ANTERIOR'?1:-1,indices=[];
  for(let i=0;i<p.count;i+=3)if([0,1,2].every(k=>inCore(before[i+k])&&sign*coords(before[i+k]).x>=ridgeHalfWidth))indices.push(i/3);
  if(indices.length<2)throw new Error('M129 missing insertion facing '+owner);
  const normal=new Vector3(),center=new Vector3();let area=0;
  for(const t of indices){const v=actual.slice(t*3,t*3+3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),w=n.length()/2;normal.add(n);center.addScaledVector(v[0].clone().add(v[1]).add(v[2]).divideScalar(3),w);area+=w;}
  normal.normalize();center.divideScalar(area);let residual=0,spread=0;
  for(const t of indices){const v=actual.slice(t*3,t*3+3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();spread=Math.max(spread,n.angleTo(normal));for(let k=0;k<3;k++){residual=Math.max(residual,Math.abs(v[k].clone().sub(center).dot(normal)));attr.aCrystalNormal.setXYZ(t*3+k,normal.x,normal.y,normal.z);}}
  if(residual>2e-7||spread>.2*Math.PI/180)throw new Error('M129 nonplanar lower facing '+owner);
  const id='MRS_DELTOID_'+lr+'_129_'+owner+'_INSERTION';planes.push({id,planeId:id,region:'DELTOID_INSERTION',side:lr,anatomicalOwner:owner.toLowerCase()+' deltoid lower convergence',type:'tapered support wedge',triangleIndices:indices,centerPosition:center.toArray(),averageNormal:normal.toArray(),apexDirection:axis.toArray(),area,maximumPlaneResidual:residual,maximumPhysicalNormalSpreadDegrees:spread*180/Math.PI,mirroredId:id.replace('_'+lr+'_','_'+(lr==='L'?'R':'L')+'_'),adjacentPlanes:[],blackPointAdjacency:[],status:'physical insertion facing; visual closure requires proof'});
 }
 // Continue the physical facing normals into their neighboring returns.
 // Fixed older crown and brachialis normal fields never participate.
 const owners=new Set(planes.flatMap(f=>f.triangleIndices)),anchors=new Map();
 for(const f of planes){f.seeds=[];for(const t of f.triangleIndices)for(let k=0;k<3;k++){const v=actual[t*3+k],id=key(v);f.seeds.push(v);anchors.set(id,new Vector3().fromArray(f.averageNormal));}}
 const groups=new Map();for(let i=0;i<p.count;i++){const id=key(actual[i]);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(i);}
 let normalCorners=0;
 for(const[id,indices]of groups){const i=indices[0];if(!inHalo(before[i])||protectedKeys.has(key(before[i])))continue;const returns=indices.filter(i=>!owners.has(Math.floor(i/3)));if(!returns.length)continue;
  let normal=anchors.get(id),weight=normal?1:0;
  if(!normal){normal=new Vector3();for(const f of planes){const distance=Math.min(...f.seeds.map(v=>actual[i].distanceTo(v))),w=1-ease(distance/.014);if(w<=0)continue;normal.addScaledVector(new Vector3().fromArray(f.averageNormal),w);weight=Math.max(weight,w);}normal.normalize();}
  if(!weight)continue;const n=new Vector3().fromBufferAttribute(attr.aCrystalNormal,returns[0]).lerp(normal,weight).normalize();for(const j of returns){attr.aCrystalNormal.setXYZ(j,n.x,n.y,n.z);normalCorners++;}
 }
 for(const f of planes)delete f.seeds;
 for(let i=0;i<p.count;i+=3){if([0,1,2].every(k=>actual[i+k].equals(before[i+k])))continue;const v=actual.slice(i,i+3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();for(let k=0;k<3;k++)attr.aPhysicalNormal.setXYZ(i+k,n.x,n.y,n.z);}
 g.userData.mrsDeltoidInsertion129={version:'M129',parent:'M128',side,frame,planes,method:'paired convergent affine facing cores, common rounded insertion ridge, coupled fixed-boundary returns',controls:{offset,slopeT,slopeFront,slopeRear,ridgeHalfWidth,coreAxial:[.05,.22],taperHalfWidth:[.05,-.13],haloAxial:[.018,.30],haloHalfWidth:.074,normalSupport:.014},maximumDisplacement,minimumAreaRatio,minimumNormalDot,freeNodes:solve.freeNodes,coreNodes:solve.coreNodes,orientationProjection:solve.orientationProjection,normalCorners,protected:'M128 crowns and M127 brachialis positions and corner attributes; biceps belly; rest of body'};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();return g;
}
