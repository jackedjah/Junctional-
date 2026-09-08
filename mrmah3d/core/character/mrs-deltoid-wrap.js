import {Vector3} from '../../vendor/three/three.module.min.js';
import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';

const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// Continue M06's actual skin. Two convergent, shallow inter-head returns
// preserve the clavicular root, outer crown, upper-arm bellies and topology.
export function articulateMrsDeltoid(g,side){
 const f=g.userData.mrsOrganicMuscles.frame;
 const axis=new Vector3().fromArray(f.axis),out=new Vector3().fromArray(f.out),front=new Vector3().fromArray(f.front);
 const p=g.attributes.position,edited=new Uint8Array(p.count);
 let changedCorners=0,maximumMove=0;
 for(let i=0;i<p.count;i++){
  const v=new Vector3().fromBufferAttribute(p,i),t=v.dot(axis)/f.boneLength;
  if(t<=-.16||t>=.20)continue;
  const x=v.dot(out),z=v.dot(front),a=Math.atan2(x,z),r=Math.hypot(x,z);
  if(a<=0||a>=Math.PI)continue;
  const u=smooth((t+.16)/.36),boundary=.78+.62*u;
  const weight=smooth((t+.16)/.10)*(1-smooth((t-.04)/.16));
  const distance=Math.min(Math.abs(a-boundary),Math.abs(a-(Math.PI-boundary)));
  const w=Math.max(0,1-(distance/.24)**2);
  const depth=.010*weight*w*w;
  if(depth<1e-10)continue;
  const q=v.clone().addScaledVector(out,-depth*x/r).addScaledVector(front,-depth*z/r);
  p.setXYZ(i,q.x,q.y,q.z);edited[i]=1;changedCorners++;maximumMove=Math.max(maximumMove,depth);
 }
 updateMuscleNormals(g,edited);
 g.userData.mrsDeltoidWrapM08={version:'R166-M08-A',side,changedCorners,maximumMove,axialRange:[-.16,.20],
  construction:'Two shallow convergent inter-head returns on retained deltoid volume',
  protected:'M06 shoulder seat; all t outside [-.16,.20]; no outward displacement; other meshes unchanged'};
 return g;
}
