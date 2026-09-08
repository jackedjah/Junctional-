import {Matrix4,Vector3} from '../../vendor/three/three.module.min.js';
import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};

// Continue the retained M15/M16 return toward its common anatomical envelope.
// Work on both existing skins in the same rest space, without expanding the
// outer deltoid crown or substituting a normal/shader seam treatment.
export function continueMrsShoulderEnvelope(g,toTorso=new Matrix4()){
 const p=g.attributes.position,edited=new Uint8Array(p.count),inverse=toTorso.clone().invert();
 let changedCorners=0,maximumMove=0;
 for(let i=0;i<p.count;i++){
  const local=new Vector3().fromBufferAttribute(p,i),v=local.clone().applyMatrix4(toTorso),ax=Math.abs(v.x);
  if(ax<=.312||ax>=.46||v.y<=2||v.y>=2.145)continue;
  let dz=0,dy=0;
  if(v.y<2.14){
   const w=.60*(1-ease(Math.abs(ax-.386)/.074))*(1-ease(Math.abs(v.y-2.07)/.07));
   const depth=(v.z>0?.104:.112)+.09*(v.y-2.06),az=Math.abs(v.z);
   dz=Math.sign(v.z)*.018*Math.tanh(w*(depth*Math.tanh(az/.04)-az)/.018);
  }
  if(ax>.345&&ax<.455&&v.y>2.075&&Math.abs(v.z)<.065){
   const w=.75*(1-ease(Math.abs(ax-.4)/.055))*ease((v.y-2.075)/.02)*(1-ease((v.y-2.125)/.02))*(1-ease((Math.abs(v.z)-.025)/.04));
   const target=2.126-.26*(ax-.36)-1.9*v.z*v.z;
   dy=.006*Math.tanh(w*(target-v.y)/.006);
  }
  if(Math.abs(dz)+Math.abs(dy)<1e-12)continue;
  v.y+=dy;v.z+=dz;const q=v.applyMatrix4(inverse);
  if(dy)p.setXY(i,q.x,q.y);
  if(dz)p.setZ(i,q.z);
  edited[i]=1;changedCorners++;maximumMove=Math.max(maximumMove,q.distanceTo(local));
 }
 updateMuscleNormals(g,edited,{angleWeighted:true});g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.mrsShoulderEnvelopeM17={version:'R166-M17-A',changedCorners,maximumMove,
  method:'Bounded continuation toward the retained shared medial/superior envelope',
  protected:'Outer crown, lower axilla, all distal bellies, torso outside shoulder corridor, object/joint frames',
  limits:'Neutral geometric continuity only; separate meshes remain'};return g;
}
