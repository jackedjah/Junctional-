import {Matrix4,Vector3} from '../../vendor/three/three.module.min.js';
import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};

// One shared anatomical-space return for the retained torso and medial delt.
// Contraction toward this envelope reduces their opposing surface slopes;
// an equal additive displacement would merely move the old V-shaped seam.
// The natural lower axilla and lateral deltoid crown are outside the mask.
export function relaxMrsShoulderFlow(g,toTorso=new Matrix4()){
 const p=g.attributes.position,edited=new Uint8Array(p.count),inverse=toTorso.clone().invert();
 let changedCorners=0,maximumMove=0;
 for(let i=0;i<p.count;i++){
  const local=new Vector3().fromBufferAttribute(p,i),v=local.clone().applyMatrix4(toTorso);
  const ax=Math.abs(v.x),az=Math.abs(v.z);
  if(ax<=.312||ax>=.460||v.y<=2.0||v.y>=2.14||az<=1e-10)continue;
  const across=1-ease(Math.abs(ax-.386)/.074);
  const along=1-ease(Math.abs(v.y-2.07)/.07);
  const weight=.55*across*along;
  if(weight<=0)continue;
  const depth=(v.z>0?.104:.112)+.09*(v.y-2.06);
  const shift=.024*Math.tanh(weight*(depth*Math.tanh(az/.040)-az)/.024);
  v.z+=Math.sign(v.z)*shift;
  const q=v.applyMatrix4(inverse);
  // The rest-frame mapping has no X/Z or Y/Z coupling. Retain original X/Y
  // bit-for-bit instead of round-tripping them through two matrix products.
  if(Math.abs(q.x-local.x)>1e-7||Math.abs(q.y-local.y)>1e-7)throw new Error('Shoulder flow requires the retained neutral frame');
  p.setZ(i,q.z);edited[i]=1;changedCorners++;
  maximumMove=Math.max(maximumMove,Math.abs(p.getZ(i)-local.z));
 }
 updateMuscleNormals(g,edited,{angleWeighted:true});
 g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.mrsShoulderFlowM15={version:'R166-M15-D',changedCorners,maximumMove,
  domain:{absX:[.312,.460],y:[2,2.14],minAbsZ:0},
  method:'Shared torso-space depth relaxation on existing shoulder surfaces; geometric normals recalculated from triangles',
  protected:'All X/Y, natural lower axilla, outer delt crown, distal arms and body outside shoulder corridor',
  limits:'Local neutral attachment return; separate meshes remain, no welded/skinned export claim'};
 return g;
}
