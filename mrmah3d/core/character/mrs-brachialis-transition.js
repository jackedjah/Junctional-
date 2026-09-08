import {Vector3} from '../../vendor/three/three.module.min.js';
import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};

// Continue the retained M11 upper-arm skin. A tapered lateral return separates
// the brachialis wedge from the triceps lateral head without adding arm bulk.
// The path follows the belly overlap toward its distal convergence; it never
// reaches the shoulder seat, deltoid, elbow contact or either belly crown.
export function differentiateMrsBrachialis(g,side){
 const f=g.userData.mrsOrganicMuscles.frame;
 const axis=new Vector3().fromArray(f.axis),out=new Vector3().fromArray(f.out),front=new Vector3().fromArray(f.front);
 const p=g.attributes.position,edited=new Uint8Array(p.count);let changedCorners=0,maximumMove=0;
 for(let i=0;i<p.count;i++){
  const v=new Vector3().fromBufferAttribute(p,i),t=v.dot(axis)/f.boneLength;
  if(t<=.24||t>=.86)continue;
  const x=v.dot(out),z=v.dot(front),r=Math.hypot(x,z),theta=Math.atan2(x,z);
  const u=(t-.24)/.62,center=1.78+.28*ease(u),distance=Math.abs(theta-center);
  const angular=Math.max(0,1-(distance/.29)**2);
  const taper=ease((t-.24)/.16)*(1-ease((t-.65)/.21));
  const depth=.008*taper*angular*angular;
  if(depth<=1e-10)continue;
  const q=v.clone().addScaledVector(out,-depth*x/r).addScaledVector(front,-depth*z/r);
  p.setXYZ(i,q.x,q.y,q.z);edited[i]=1;changedCorners++;maximumMove=Math.max(maximumMove,depth);
 }
 updateMuscleNormals(g,edited);
 g.userData.mrsBrachialisTransitionM13={version:'R166-M13-A',side,changedCorners,maximumMove,
  axialRange:[.24,.86],angularHalfWidth:.29,maximumDepth:.008,
  method:'Tapered inward intermuscular return between retained brachialis and triceps lateral head',
  protected:'Shoulder/deltoid t<=.24, distal elbow t>=.86, biceps and posterior triceps crowns, all other meshes and transforms'};
 return g;
}
