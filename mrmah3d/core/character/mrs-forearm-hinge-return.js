import {Vector3,EdgesGeometry} from '../../vendor/three/three.module.min.js';
import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';

// Monotone axial contraction of only the proximal closure behind the elbow.
// Integral of quintic smoothstep makes the transition C2 at t=-.05 and t=0.
export function refineMrsForearmHinge(g){
 const frame=g.userData.mrsOrganicMuscles?.frame;
 if(g.userData.mrsOrganicMuscles?.part!=='fore')throw Error('M23 requires retained organic forearm');
 const axis=new Vector3().fromArray(frame.axis),length=frame.boneLength,p=g.attributes.position;
 const physical=g.attributes.aPhysicalNormal.array.slice(),edited=new Uint8Array(p.count);
 let movedCorners=0,maxMove=0;
 for(let i=0;i<p.count;i++){
  const v=new Vector3().fromBufferAttribute(p,i),t=v.dot(axis)/length;if(t>=0)continue;
  const u=Math.min(1,-t/.05),integral=2.5*u**4-3*u**5+u**6;
  const delta=.55*length*(t<-.05?-t-.025:.05*integral);
  if(delta<1e-10)continue;
  v.addScaledVector(axis,delta);p.setXYZ(i,v.x,v.y,v.z);edited[i]=1;movedCorners++;maxMove=Math.max(maxMove,delta);
 }
 updateMuscleNormals(g,edited,{angleWeighted:true});
 for(let i=0;i<p.count;i+=3)if(!edited[i]&&!edited[i+1]&&!edited[i+2])for(let j=0;j<9;j++)g.attributes.aPhysicalNormal.array[3*i+j]=physical[3*i+j];
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.forearmHingeReturn={parent:'R166-M22-05867f3fd721',support:'t<0 only',minimumAnalyticJacobian:.45,transition:[-.05,0],movedCorners,maxMove,method:'Monotone axial contraction of proximal forearm closure into retained elbow envelope; radial coordinates and all t>=0 positions unchanged'};
}
export function refineMrsHingeReturns({limbs}){
 for(const side of ['left','right']){
  const mesh=limbs[side].group.getObjectByName(`arm-${side}-fore`);refineMrsForearmHinge(mesh.geometry);
  const siblings=mesh.parent.children,i=siblings.indexOf(mesh);
  for(const line of siblings.slice(i+1,i+3).filter(o=>o.isLineSegments)){const old=line.geometry;line.geometry=new EdgesGeometry(mesh.geometry,30);old.dispose();}
 }
}
