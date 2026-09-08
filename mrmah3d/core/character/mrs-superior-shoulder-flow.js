import {Matrix4,Vector3} from '../../vendor/three/three.module.min.js';
import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};

// A small shared superior return softens the retained clavicle/cap tangent
// step. It is a physical Y change; the outer crown and all front/rear depth
// crowns stay outside this top-only corridor. No new cap or overlay mesh.
export function liftMrsSuperiorShoulder(g,toTorso=new Matrix4()){
 const p=g.attributes.position,edited=new Uint8Array(p.count),inverse=toTorso.clone().invert();
 let changedCorners=0,maximumMove=0,maximumRise=0;
 for(let i=0;i<p.count;i++){
  const local=new Vector3().fromBufferAttribute(p,i),v=local.clone().applyMatrix4(toTorso),ax=Math.abs(v.x),az=Math.abs(v.z);
  if(ax<=.345||ax>=.455||v.y<=2.075||v.y>=2.145||az>=.065)continue;
  const across=1-ease(Math.abs(ax-.400)/.055),along=ease((v.y-2.075)/.020)*(1-ease((v.y-2.125)/.020));
  const depth=1-ease((az-.025)/.040),weight=.65*across*along*depth;
  const target=2.126-.26*(ax-.36)-1.9*v.z*v.z;
  const rise=.008*Math.tanh(weight*(target-v.y)/.008);
  if(Math.abs(rise)<1e-12)continue;
  v.y+=rise;const q=v.applyMatrix4(inverse);
  p.setXY(i,q.x,q.y);edited[i]=1;changedCorners++;
  maximumMove=Math.max(maximumMove,q.distanceTo(local));maximumRise=Math.max(maximumRise,rise);
 }
 updateMuscleNormals(g,edited,{angleWeighted:true});g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.mrsSuperiorShoulderM16={version:'R166-M16-A',changedCorners,maximumMove,maximumRise,
  domain:{absX:[.345,.455],y:[2.075,2.145],absZ:[0,.065]},
  method:'Shared superior Y-envelope relaxation, original topology and triangle-derived normals',
  protected:'Torso-space X/Z, outer crown, lower axilla, distal arms and all non-shoulder regions',
  limits:'Local neutral surface continuity; no welded or skinned export claim'};return g;
}
