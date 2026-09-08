import {Vector3} from '../../vendor/three/three.module.min.js';
import {deformMrsRetainedSurface} from './mrs-surgical-reconstruction.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};
const band=(x,a,b,c,d)=>ease((x-a)/(b-a))*(1-ease((x-c)/(d-c)));

export function returnMrsForearmAttachment132(g,arm,side){
 if(side!=='left')return g;
 const retained=g.userData.mrsSurgical126,frame=retained.frame,axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out),length=frame.boneLength;
 const before=g.attributes.position.array.slice(),physical=g.attributes.aPhysicalNormal.clone();
 // The projected three-quarter spike is the retained t=.11998, theta=.3076
 // rail vertex. Give its attachment a rising radius bound between the joint
 // and muscle belly; keep the crown, opposite sector and wrist outside it.
 const map=p=>{
  const t=p.dot(axis)/length,x=p.dot(out),z=p.dot(front),theta=Math.atan2(x,z),r=Math.hypot(x,z);
  if(r<1e-8)return p.clone();
  const w=band(t,.04,.08,.18,.27)*band(theta,.08,.20,.44,.74);
  // Preserve a .45 radial derivative instead of collapsing stock onto a shell.
  const limit=.077+.072*t,d=-.55*Math.max(0,r-limit)*w;
  return p.clone().addScaledVector(front,d*z/r).addScaledVector(out,d*x/r);
 };
 deformMrsRetainedSurface(g,map,{region:'left proximal forearm attachment return',side,frame,regularization:.00004,
  axialDomain:[.04,.08,.18,.27],angularDomain:[.08,.20,.44,.74],radiusLimit:{base:.077,slope:.072,compression:.55,minimumRadialDerivative:.45},
  ownership:'Narrow raised proximal flexor/radial attachment; no circumferential cut or new muscle inflation',
  protected:'Joint core, crown t>=.27, opposite sector, distal forearm and all other meshes'});
 const meta=g.userData.mrsSurgical126;g.userData.mrsSurgical126=retained;
 const p=g.attributes.position;
 for(let i=0;i<p.count;i+=3)if([0,1,2].every(k=>[0,1,2].every(j=>p.array[(i+k)*3+j]===before[(i+k)*3+j])))for(let k=0;k<3;k++)g.attributes.aPhysicalNormal.setXYZ(i+k,physical.getX(i+k),physical.getY(i+k),physical.getZ(i+k));
 g.userData.mrsForearmAttachment132={...meta,version:'M132',parent:'M131',status:'candidate; actual source-bound proof required'};
 return g;
}
