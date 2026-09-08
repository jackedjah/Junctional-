import {Vector3,Quaternion} from '../../vendor/three/three.module.min.js';
import {coupleFacingReturns} from './mrs-deltoid-heads.js';
const key=v=>v.toArray().map(x=>x.toFixed(6)).join(',');
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};
const band=(x,a,b,c,d)=>ease((x-a)/(b-a))*(1-ease((x-c)/(d-c)));

export function reconstructMrsRadialBelly134(g,arm,side){
 const attr=g.attributes,p=attr.position,frame=g.userData.mrsSurgical126.frame;
 const axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out),length=frame.boneLength;
 const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const protectedKeys=new Set(g.userData.mrsForearmCrowns133.planes.flatMap(plane=>plane.triangleIndices.flatMap(t=>[0,1,2].map(k=>key(stock[t*3+k])))));
 const coords=v=>({t:v.dot(axis)/length,x:v.dot(out),z:v.dot(front),theta:Math.atan2(v.dot(out),v.dot(front))});
 // Left proximal crown is already established by M131; start its recovery
 // distally so return regularization cannot move that maximum toward the elbow.
 const domain=side==='left'?[.365,.44,.65,.82]:[.23,.34,.65,.82];
 const target=stock.map(v=>{
  const {t,x,z,theta}=coords(v),r=Math.hypot(x,z);
  if(protectedKeys.has(key(v))||r<1e-8)return v.clone();
  const w=band(t,...domain)*band(theta,.85,1.13,2.12,2.5);
  const envelope=.0715-.018*(t-.34),d=.85*w*Math.max(0,envelope-r);
  return v.clone().addScaledVector(out,d*x/r).addScaledVector(front,d*z/r);
 });
 const solve=coupleFacingReturns(stock,target,v=>protectedKeys.has(key(v)),v=>{
  const{t,theta}=coords(v);return t>domain[0]&&t<domain[3]&&theta>.85&&theta<2.5;
 },stock,{normalCone:.90,lambda:.00004});
 const after=solve.positions,oldNormals=new Map(),newNormals=new Map(),physical=attr.aPhysicalNormal.clone();
 let minimumAreaRatio=1,minimumNormalDot=1,maximumDisplacement=0,changedCopies=0,volumeBefore=0,volumeAfter=0;
 for(let i=0;i<p.count;i+=3){
  const a=stock.slice(i,i+3),b=after.slice(i,i+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));
  minimumAreaRatio=Math.min(minimumAreaRatio,m.length()/n.length());minimumNormalDot=Math.min(minimumNormalDot,n.clone().normalize().dot(m.clone().normalize()));
  volumeBefore+=a[0].dot(a[1].clone().cross(a[2]))/6;volumeAfter+=b[0].dot(b[1].clone().cross(b[2]))/6;
  for(let k=0;k<3;k++){const id=key(a[k]);if(!oldNormals.has(id)){oldNormals.set(id,new Vector3());newNormals.set(id,new Vector3());}oldNormals.get(id).add(n);newNormals.get(id).add(m);}
 }
 if(minimumAreaRatio<.60||minimumNormalDot<.89)throw new Error('M134 invalid radial support '+JSON.stringify({side,minimumAreaRatio,minimumNormalDot}));
 for(let i=0;i<p.count;i++){
  const distance=after[i].distanceTo(stock[i]);if(distance<1e-12)continue;
  maximumDisplacement=Math.max(maximumDisplacement,distance);changedCopies++;
  const id=key(stock[i]),rotation=new Quaternion().setFromUnitVectors(oldNormals.get(id).clone().normalize(),newNormals.get(id).clone().normalize()),seen=new Set();
  for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal']){
   const a=attr[name];if(seen.has(a))continue;seen.add(a);const n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(rotation).normalize();a.setXYZ(i,n.x,n.y,n.z);a.needsUpdate=true;
  }
  p.setXYZ(i,after[i].x,after[i].y,after[i].z);
 }
 const displayed=attr.normal;g.setAttribute('normal',physical.clone());g.computeVertexNormals();g.setAttribute('aPhysicalNormal',g.attributes.normal);g.setAttribute('normal',displayed);
 for(let i=0;i<p.count;i+=3)if([0,1,2].every(k=>new Vector3().fromBufferAttribute(p,i+k).equals(stock[i+k])))for(let k=0;k<3;k++)g.attributes.aPhysicalNormal.setXYZ(i+k,physical.getX(i+k),physical.getY(i+k),physical.getZ(i+k));
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.mrsRadialBelly134={version:'M134',parent:'M133',side,frame,
  region:'brachioradialis belly into radial tendon',axialDomain:domain,angularDomain:[.85,1.13,2.12,2.5],
  envelope:{radiusAt34:.0715,axialSlope:-.018,recovery:.85},method:'One longitudinal radial support field, coupled on retained surface with fixed muscle crowns and physical-normal cones',
  changedCopies,maximumDisplacement,minimumAreaRatio,minimumNormalDot,volumeRatio:volumeAfter/volumeBefore,
  solve:{freeNodes:solve.freeNodes,coreNodes:solve.coreNodes,...solve.orientationProjection},
  protected:'All M133 crown corners and attributes; elbow and wrist seats; other meshes',
  status:'candidate; source-bound proof required'};
 return g;
}
