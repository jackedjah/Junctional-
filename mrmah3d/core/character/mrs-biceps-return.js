import {Vector3,Quaternion,Line3} from '../../vendor/three/three.module.min.js';
import {coupleFacingReturns} from './mrs-deltoid-heads.js';
const key=v=>v.toArray().map(x=>x.toFixed(6)).join(',');
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};

// Continue the actual distal crown boundary into its existing return skin.
// The crown planes and their common ridge remain fixed.
export function continueMrsBicepsReturn140(g,arm,side){
 const attrs=g.attributes,p=attrs.position,frame=g.userData.mrsSurgical126.frame,axis=new Vector3().fromArray(frame.axis),length=frame.boneLength;
 const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const planes=g.userData.mrsBiceps139.planes,protectedPlanes=['mrsBrachialisPatch127','mrsDeltoid128','mrsDeltoidInsertion129','mrsBiceps139'].flatMap(k=>g.userData[k].planes);
 const protectedKeys=new Set(protectedPlanes.flatMap(p=>p.triangleIndices.flatMap(t=>stock.slice(t*3,t*3+3).map(key))));
 const edges=new Map();
 for(let t=0;t<stock.length/3;t++)for(let k=0;k<3;k++){const a=stock[t*3+k],b=stock[t*3+(k+1)%3],id=[key(a),key(b)].sort().join('|');if(!edges.has(id))edges.set(id,{a,b,triangles:[]});edges.get(id).triangles.push(t);}
 const core=new Set(planes.flatMap(p=>p.triangleIndices)),boundary=[];
 for(const pl of planes){const ids=new Set(pl.triangleIndices),normal=new Vector3().fromArray(pl.averageNormal),center=new Vector3().fromArray(pl.centerPosition);
  for(const e of edges.values())if(e.triangles.some(t=>ids.has(t))&&e.triangles.some(t=>!core.has(t))&&(e.a.dot(axis)+e.b.dot(axis))/(2*length)>.47)
   boundary.push({...e,line:new Line3(e.a,e.b),normal,center,owner:pl.id});
 }
 if(!boundary.length)throw new Error('M140 missing actual distal facing boundary');
 const near=v=>Math.min(...boundary.map(e=>e.line.closestPointToPoint(v,true,new Vector3()).distanceTo(v)));
 const domain=v=>{const t=v.dot(axis)/length;return t>.47&&t<.74&&near(v)<.035;};
 const targets=stock.map(v=>{
  if(protectedKeys.has(key(v))||!domain(v))return v.clone();
  const t=v.dot(axis)/length,radial=v.clone().addScaledVector(axis,-v.dot(axis)).normalize();let sum=0,total=0,weight=0;
  for(const e of boundary){const c=e.line.closestPointToPoint(v,true,new Vector3()),distance=c.distanceTo(v);if(distance>=.035||v.clone().sub(c).dot(axis)<-1e-7)continue;
   const w=1-ease(distance/.035),den=radial.dot(e.normal);if(den<.6)continue;sum+=w*e.center.clone().sub(v).dot(e.normal)/den;total+=w;weight=Math.max(weight,w);
  }
  if(!total)return v.clone();return v.clone().addScaledVector(radial,sum/total*weight*ease((t-.47)/.045)*(1-ease((t-.68)/.06)));
 });
 const solve=coupleFacingReturns(stock,targets,v=>protectedKeys.has(key(v)),domain,stock,{normalCone:.90,lambda:.00004});
 const moved=solve.positions,oldNormals=new Map(),newNormals=new Map(),oldFaces=[],newFaces=[];let maximumDisplacement=0,minimumNormalDot=1,minimumAreaRatio=1;
 for(const v of stock){oldNormals.set(key(v),new Vector3());newNormals.set(key(v),new Vector3());}
 for(let i=0;i<stock.length;i+=3){const a=stock.slice(i,i+3),b=moved.slice(i,i+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));
  oldFaces.push(n.clone().normalize());newFaces.push(m.clone().normalize());minimumNormalDot=Math.min(minimumNormalDot,oldFaces.at(-1).dot(newFaces.at(-1)));minimumAreaRatio=Math.min(minimumAreaRatio,m.length()/n.length());
  for(let k=0;k<3;k++){oldNormals.get(key(a[k])).add(n);newNormals.get(key(a[k])).add(m);maximumDisplacement=Math.max(maximumDisplacement,a[k].distanceTo(b[k]));}
  if(b.some((v,k)=>v.distanceTo(a[k])>1e-12)){m.normalize();for(let k=0;k<3;k++)attrs.aPhysicalNormal.setXYZ(i+k,m.x,m.y,m.z);}
 }
 if(minimumNormalDot<.89||minimumAreaRatio<.60||maximumDisplacement>.008)throw new Error('M140 invalid distal support '+JSON.stringify({side,minimumNormalDot,minimumAreaRatio,maximumDisplacement}));
 for(let i=0;i<stock.length;i++){
  if(moved[i].distanceTo(stock[i])<1e-12)continue;
  const id=key(stock[i]),rotation=new Quaternion().setFromUnitVectors(oldNormals.get(id).normalize(),newNormals.get(id).normalize()),seen=new Set();
  for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal']){const a=attrs[name];if(!a||seen.has(a))continue;seen.add(a);const n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(rotation).normalize();a.setXYZ(i,n.x,n.y,n.z);}
  p.setXYZ(i,moved[i].x,moved[i].y,moved[i].z);
 }
 const returns=boundary.map(e=>{const t=e.triangles.find(t=>!core.has(t));return {owner:e.owner,triangle:t,edge:[e.a.toArray(),e.b.toArray()],length:e.a.distanceTo(e.b),beforeDegrees:e.normal.angleTo(oldFaces[t])*180/Math.PI,afterDegrees:e.normal.angleTo(newFaces[t])*180/Math.PI};});
 const total=returns.reduce((s,e)=>s+e.length,0),mean=field=>returns.reduce((s,e)=>s+e.length*e[field],0)/total;
 g.userData.mrsBicepsReturn140={version:'M140',parent:'M139',side,frame,maximumDisplacement,minimumNormalDot,minimumAreaRatio,returns,weightedReturnAngleBefore:mean('beforeDegrees'),weightedReturnAngleAfter:mean('afterDegrees'),returnSolve:{freeNodes:solve.freeNodes,coreNodes:solve.coreNodes,...solve.orientationProjection},method:'Actual distal boundary continuation with fixed physical crowns and a coupled anatomical return skin',controls:{domain:[.47,.74],supportDistance:.035},protected:'M127/M128/M129/M139 physical facing buffers, joint seats, forearms and other meshes'};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();return g;
}
