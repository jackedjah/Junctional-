import {Vector3,EdgesGeometry} from '../../vendor/three/three.module.min.js';
import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';

// Pair the distal forearm taper with its cuff seat; keep the palm rim exact.
export function refineMrsDistalForearm(g){
 const p=g.attributes.position,frame=g.userData.mrsOrganicMuscles.frame;
 const axis=new Vector3().fromArray(frame.axis),edited=new Set();let maxDisplacement=0,corners=0;
 for(let i=0;i<p.count;i++){
  const v=new Vector3().fromBufferAttribute(p,i),axial=v.dot(axis),t=axial/frame.boneLength;
  if(t<=.78)continue;
  const u=Math.max(0,Math.min(1,(t-.78)/.20)),w=u*u*u*(10-15*u+6*u*u);
  const radial=v.clone().addScaledVector(axis,-axial),delta=radial.clone().multiplyScalar(-(.004/.042)*w);
  v.add(delta);p.setXYZ(i,v.x,v.y,v.z);edited.add(Math.floor(i/3));corners++;
  maxDisplacement=Math.max(maxDisplacement,delta.length());
 }
 refresh(g,edited);g.userData.distalWristConvergence={parent:'R166-M25-9952735fbe66',corners,maxDisplacement,start:.78,end:.98,radius:.038};
}
export function refineMrsWristConvergence(g){
 const p=g.attributes.position,edited=new Set();let maxDisplacement=0,corners=0;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i);if(y>=.015)continue;
  const seat=y<=-.02,x=p.getX(i),z=p.getZ(i),nx=x*(seat?.0372/.0412:.84),nz=z*(seat?.0372/.0412:.94);
  p.setXYZ(i,nx,y,nz);edited.add(Math.floor(i/3));corners++;
  maxDisplacement=Math.max(maxDisplacement,Math.hypot(nx-x,nz-z));
 }
 refresh(g,edited);
 g.userData.wristConvergence={parent:'R166-M25-9952735fbe66',corners,maxDisplacement,protected:'Distal palm attachment and hands unchanged; cuff seat paired with distal forearm taper'};
}
function refresh(g,edited){
 const p=g.attributes.position,physical=g.attributes.aPhysicalNormal?.array.slice();
 updateMuscleNormals(g,edited,{angleWeighted:true});
 if(physical)for(let f=0;f<p.count/3;f++)if(!edited.has(f))for(let j=0;j<9;j++)g.attributes.aPhysicalNormal.array[f*9+j]=physical[f*9+j];
 for(const f of edited){
  const a=new Vector3().fromBufferAttribute(p,3*f),b=new Vector3().fromBufferAttribute(p,3*f+1),c=new Vector3().fromBufferAttribute(p,3*f+2);
  const radius=b.clone().sub(a).cross(c.clone().sub(a)).length()/(a.distanceTo(b)+b.distanceTo(c)+c.distanceTo(a));
  for(let j=0;j<3;j++)g.attributes.aBary?.setW(3*f+j,radius);
 }
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}
export function refineMrsWristBridges({limbs}){
 for(const side of ['left','right'])for(const part of ['fore','wrist-cuff']){
  const mesh=limbs[side].group.getObjectByName(`arm-${side}-${part}`);(part==='fore'?refineMrsDistalForearm:refineMrsWristConvergence)(mesh.geometry);
  const siblings=mesh.parent.children,start=siblings.indexOf(mesh);
  for(const o of siblings.slice(start+1,start+3).filter(o=>o.isLineSegments)){const old=o.geometry;o.geometry=new EdgesGeometry(mesh.geometry,30);old.dispose();}
 }
}
