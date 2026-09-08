import {Matrix4,Vector3} from '../../vendor/three/three.module.min.js';
import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// Bring the exposed medial shoulder closer to one shared chest/delt return.
// Preserve a shallow anatomical depression and the natural lower axilla.
export function consolidateMrsShoulderReturn(g,toTorso=new Matrix4()){
 const p=g.attributes.position,edited=new Uint8Array(p.count),inverse=toTorso.clone().invert();let changedCorners=0,maximumMove=0;
 for(let i=0;i<p.count;i++){
  const local=new Vector3().fromBufferAttribute(p,i),v=local.clone().applyMatrix4(toTorso),ax=Math.abs(v.x);
  if(ax<=.312||ax>=.46||v.y<=2||v.y>=2.105)continue;
  const w=.90*(1-ease((v.y-2.085)/.020))*(1-ease(Math.abs(ax-.386)/.074))*(1-ease(Math.abs(v.y-2.07)/.07));
  const depth=(v.z>0?.104:.112)+.09*(v.y-2.06),az=Math.abs(v.z);
  const shift=Math.sign(v.z)*.030*Math.tanh(w*(depth*Math.tanh(az/.04)-az)/.030);
  if(Math.abs(shift)<1e-12)continue;
  v.z+=shift;const q=v.applyMatrix4(inverse);p.setZ(i,q.z);edited[i]=1;changedCorners++;maximumMove=Math.max(maximumMove,Math.abs(shift));
 }
 updateMuscleNormals(g,edited,{angleWeighted:true});g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.mrsShoulderReturnM19={version:'R166-M19-B',changedCorners,maximumMove,protected:'Outer crown, inferior deltoid sweeps, distal arms, lower axilla, all positions outside medial shoulder corridor',method:'Shared medial depth envelope on actual existing surfaces',limits:'Neutral local geometry; separate mesh topology remains'};return g;
}

