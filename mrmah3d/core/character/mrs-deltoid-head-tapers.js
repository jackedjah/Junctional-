import {Vector3} from '../../vendor/three/three.module.min.js';
import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// Different distal termination for anterior/posterior heads on retained skin.
// Keep the proximal attachment and lateral crown, and the lower arm bellies.
export function taperMrsDeltoidHeads(g,side){
 const f=g.userData.mrsOrganicMuscles.frame,axis=new Vector3().fromArray(f.axis),out=new Vector3().fromArray(f.out),front=new Vector3().fromArray(f.front);
 const p=g.attributes.position,edited=new Uint8Array(p.count);let changedCorners=0,maximumMove=0;
 for(let i=0;i<p.count;i++){
  const v=new Vector3().fromBufferAttribute(p,i),t=v.dot(axis)/f.boneLength;
  if(t<=-.12||t>=.235)continue;
  const x=v.dot(out),z=v.dot(front),r=Math.hypot(x,z),a=Math.atan2(x,z);
  // Front and rear sweeps taper independently, broad enough to shape volume.
  const posterior=z<0,center=posterior?Math.PI:0,distance=Math.abs(Math.atan2(Math.sin(a-center),Math.cos(a-center)));
  const angular=1-ease(distance/.95);
  const axial=ease((t+.12)/.18)*(1-ease((t-.06)/.175));
  const depth=(posterior?.038:.026)*f.boneLength*angular*axial;
  if(depth<=1e-10)continue;
  const q=v.clone().addScaledVector(axis,-depth);
  p.setXYZ(i,q.x,q.y,q.z);edited[i]=1;changedCorners++;maximumMove=Math.max(maximumMove,depth);
 }
 updateMuscleNormals(g,edited,{angleWeighted:true});g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.mrsDeltoidHeadTapersM18={version:'R166-M18-C',side,changedCorners,maximumMove,axialRange:[-.12,.235],method:'Smooth axial shortening of distal anterior and posterior head sweeps without cutting radial belly volume',protected:'Proximal shoulder t<=-.12, lateral crown, upper-arm bellies t>=.235, all other meshes',limits:'Local neutral geometry; final anatomy/fusion acceptance remains open'};
 return g;
}

