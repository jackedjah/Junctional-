import {Vector3,Matrix4,Ray,Quaternion} from '../../vendor/three/three.module.min.js';
import {coupleFacingReturns} from './mrs-deltoid-heads.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};
const key=v=>v.toArray().map(x=>x.toFixed(7)).join(',');

// Fit only the supported neutral equator. Swept witnesses pin uncovered
// hinge faces; the five existing physical cap landmarks remain unchanged.
export function fitMrsElbowEnvelope130(arm,side){

 const capMesh=arm.group.getObjectByName('arm-'+side+'-elbow-knob'),g=capMesh.geometry;
 const info=m=>({attributes:m.geometry.attributes,userData:m.geometry.userData,matrixWorld:m.matrixWorld.elements});
 const cap=info(capMesh),upper=info(arm.group.getObjectByName('arm-'+side+'-upper')),fore=info(arm.group.getObjectByName('arm-'+side+'-fore'));
 const inverse=new Matrix4().fromArray(cap.matrixWorld).invert(),upperToCap=inverse.clone().multiply(new Matrix4().fromArray(upper.matrixWorld));
 const axis=new Vector3().fromArray(upper.userData.mrsSurgical126.frame.axis).transformDirection(upperToCap);
 const stock=Array.from({length:cap.attributes.position.array.length/3},(_,i)=>new Vector3().fromArray(cap.attributes.position.array,3*i)),after=stock.map(v=>v.clone());
 const fixed=new Set(cap.userData.mrsElbow98.planes.flatMap(f=>f.triangleIndices.flatMap(t=>[0,1,2].map(k=>key(stock[3*t+k])))));
 const surfaces=[upper,fore].map(m=>{const matrix=inverse.clone().multiply(new Matrix4().fromArray(m.matrixWorld));return Array.from({length:m.attributes.position.array.length/3},(_,i)=>new Vector3().fromArray(m.attributes.position.array,3*i).applyMatrix4(matrix));});
 const ray=new Ray(),hit=new Vector3(),support=(s,dir)=>{ray.origin.copy(axis).multiplyScalar(s);ray.direction.copy(dir);let radius=0;for(const points of surfaces)for(let i=0;i<points.length;i+=3){const found=ray.intersectTriangle(points[i],points[i+1],points[i+2],false,hit);if(found){const r=hit.clone().sub(ray.origin).dot(dir);if(r>0&&r<.15)radius=Math.max(radius,r);}}return radius;};

 // Vertex-only witnesses miss an uncovered sector inside a cap triangle.
 // Sweep the hinge and pin every triangle touched by an unsupported ray.
 const witnessFront=new Vector3().fromArray(upper.userData.mrsSurgical126.frame.front).transformDirection(upperToCap);witnessFront.addScaledVector(axis,-witnessFront.dot(axis)).normalize();
 let uncoveredRayCount=0;const uncoveredFaces=new Set();
 for(const s of [-.01,0,.01])for(let j=0;j<72;j++){
  const direction=witnessFront.clone().applyAxisAngle(axis,j*Math.PI/36);if(support(s,direction)>=.025)continue;
  ray.origin.copy(axis).multiplyScalar(s);ray.direction.copy(direction);let nearest=Infinity,face=-1;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit)){const r=hit.clone().sub(ray.origin).dot(direction);if(r>0&&r<nearest){nearest=r;face=i/3;}}
  if(face<0)continue;uncoveredRayCount++;uncoveredFaces.add(face);for(let k=0;k<3;k++)fixed.add(key(stock[face*3+k]));
 }

 const changes=new Map(),uncovered=new Set();let preservedUncovered=0;
 for(let i=0;i<stock.length;i++){const p=stock[i],id=key(p);if(changes.has(id)){after[i].add(changes.get(id));continue;}if(fixed.has(id))continue;
  const s=p.dot(axis),weight=1-ease(Math.abs(s)/.026),radial=p.clone().addScaledVector(axis,-s),radius=radial.length();if(!weight||radius<1e-6)continue;radial.divideScalar(radius);
  const witness=[-.10,0,.10].map(a=>support(s,radial.clone().applyAxisAngle(axis,a)));
  if(witness.some(r=>r<.025)){preservedUncovered++;uncovered.add(id);continue;}
  const covered=witness[1]+.0005,delta=-Math.min(Math.max(0,radius-covered),radius*.10)*weight;
  const displacement=radial.clone().multiplyScalar(delta);changes.set(id,displacement);after[i].add(displacement);
 }
 const coupled=coupleFacingReturns(stock,after,v=>fixed.has(key(v))||uncovered.has(key(v)),v=>Math.abs(v.dot(axis))<.035&&!fixed.has(key(v))&&!uncovered.has(key(v)),stock,{normalCone:.90});
 for(let i=0;i<after.length;i++)after[i].copy(coupled.positions[i]);
 const oldNormals=new Map(),newNormals=new Map();let minDot=1,minArea=1,maxMove=0,changed=0;
 for(let i=0;i<stock.length;i+=3){const a=stock.slice(i,i+3),b=after.slice(i,i+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));minArea=Math.min(minArea,m.length()/n.length());minDot=Math.min(minDot,n.clone().normalize().dot(m.clone().normalize()));
  for(let k=0;k<3;k++){const id=key(a[k]);if(!oldNormals.has(id)){oldNormals.set(id,new Vector3());newNormals.set(id,new Vector3());}oldNormals.get(id).add(n);newNormals.get(id).add(m);}
 }
 if(minDot<.85||minArea<.65)throw new Error('Elbow support guard failed '+JSON.stringify({side,minDot,minArea}));
 for(let i=0;i<stock.length;i++){const distance=stock[i].distanceTo(after[i]);if(distance<1e-12)continue;changed++;maxMove=Math.max(maxMove,distance);cap.attributes.position.array.set(after[i].toArray(),3*i);
  const id=key(stock[i]),rotation=new Quaternion().setFromUnitVectors(oldNormals.get(id).clone().normalize(),newNormals.get(id).clone().normalize());
  const seen=new Set();for(const name of ['normal','aSmooth','aCrystalNormal','aMoldNormal']){const a=cap.attributes[name];if(!a||seen.has(a))continue;seen.add(a);const n=new Vector3().fromArray(a.array,3*i).applyQuaternion(rotation).normalize();a.array.set(n.toArray(),3*i);}
 }
 if(cap.attributes.aPhysicalNormal)for(let i=0;i<stock.length;i+=3){if([0,1,2].every(k=>stock[i+k].equals(after[i+k])))continue;const v=[0,1,2].map(k=>new Vector3().fromArray(cap.attributes.position.array,3*(i+k))),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();for(let k=0;k<3;k++)cap.attributes.aPhysicalNormal.array.set(n.toArray(),3*(i+k));}
 g.userData.mrsElbowEnvelope130={version:'M130',parent:'M129',side,changedCorners:changed,maximumMove:maxMove,minimumNormalDot:minDot,minimumAreaRatio:minArea,preservedUncoveredWitnesses:preservedUncovered,uncoveredRayCount,uncoveredFaces:[...uncoveredFaces],fixedVertices:[...fixed],fixedCrownAndHingeVertices:fixed.size,axis:axis.toArray(),coupled:{freeNodes:coupled.freeNodes,coreNodes:coupled.coreNodes,orientationProjection:coupled.orientationProjection},method:'coupled cap-only covered equator fit; three angular witnesses, five landmarks and uncovered hinge fixed; neutral authoring, deformation validation remains open'};
 for(const a of Object.values(g.attributes))a.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();return g;
}
