import {Vector3} from '../../vendor/three/three.module.min.js';
import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};

// R166-M06: carry the existing proximal deltoid skin into the clavicular
// attachment instead of terminating it on a high, exposed horizontal rim.
// This is a continuous transverse shear. The approved crown below t=-.16 and
// all elbow/forearm/wrist geometry remain exact. No extra shells or cuts.
export function seatMrsShoulder(g,side){
 const frame=g.userData.mrsOrganicMuscles.frame;
 const axis=new Vector3().fromArray(frame.axis),out=new Vector3().fromArray(frame.out);
 const lo=-.40,hi=-.16,medial=.020,distal=0;
 const p=g.attributes.position,edited=new Uint8Array(p.count);
 let maximumMove=0,changedCorners=0;
 for(let i=0;i<p.count;i++){
  const v=new Vector3().fromBufferAttribute(p,i),t=v.dot(axis)/frame.boneLength;
  if(t>=hi)continue;
  const weight=1-ease((t-lo)/(hi-lo));
  const q=v.clone().addScaledVector(out,-medial*weight).addScaledVector(axis,distal*weight);
  p.setXYZ(i,q.x,q.y,q.z);edited[i]=1;changedCorners++;
  maximumMove=Math.max(maximumMove,q.distanceTo(v));
 }
 updateMuscleNormals(g,edited);
 g.userData.mrsShoulderSeatM06={version:'R166-M06',side,range:[lo,hi],medial,distal,
  changedCorners,maximumMove,minimumAxialJacobian:1-1.5*distal/((hi-lo)*frame.boneLength),
  construction:'Monotone proximal deltoid transport into the retained clavicular seat',
  protected:'Upper muscle crowns below t=-.16, elbow, forearm, wrist, torso and pose'};
 return g;
}

// The retained torso terminates before the medial deltoid return. Supply a
// narrow clavicular/scapular support saddle on that existing torso skin.
// Crown and breast-facing depths are preserved; this only expands the local
// lateral wall toward the shoulder. The lower torso is outside the mask.
export function supportMrsShoulderTorso(g){
 const p=g.attributes.position,edited=new Uint8Array(p.count);
 let maximumMove=0,changedCorners=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const upper=ease((y-1.955)/.080)*(1-ease((y-2.130)/.065));
  const sidewall=ease((Math.abs(x)-.255)/.105)*(1-ease((Math.abs(z)-.110)/.070));
  const move=.032*upper*sidewall;if(move<=1e-12)continue;
  p.setX(i,x+Math.sign(x)*move);edited[i]=1;changedCorners++;maximumMove=Math.max(maximumMove,move);
 }
 updateMuscleNormals(g,edited,{angleWeighted:true});
 g.userData.mrsShoulderTorsoM06={version:'R166-M06',rangeY:[1.955,2.195],minimumAbsX:.255,
  maximumAbsZ:.180,maximumMove,changedCorners,construction:'Local clavicle/scapula lateral support saddle',
  protected:'All torso Y/Z depths, chest-facing crowns, abs, waist, hips, glutes and fused lower form'};
 return g;
}
