import {Vector3,EdgesGeometry} from '../../vendor/three/three.module.min.js';
import {elbowCreaseData} from './mrs-elbow-crease-data.js';

// M25: an implicit cotangent surface correction, measured on the retained
// M20 joined topology. Positions and normals are from the same actual mesh.
// Support is a .022-unit band around the shared elbow boundary; unchanged
// corners retain every attribute. No material or normal-only concealment.
export function refineMrsElbowCrease({limbs}){
 const meshes=['left','right'].flatMap(s=>['fore','elbow-knob'].map(p=>limbs[s].group.getObjectByName(`arm-${s}-${p}`)));
 for(const mesh of meshes){
  const g=mesh.geometry,spec=elbowCreaseData[mesh.name],p=g.attributes.position;
  if(!g.userData.elbowUnion||p.count!==spec.corners)throw Error('M25 crease requires M25 source-face union topology');
  const changed=new Set();
  for(const[i,x,y,z]of spec.position){p.setXYZ(i,x,y,z);changed.add(Math.floor(i/3));}
  for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal']){
   const a=g.attributes[name];if(a){for(const[i,x,y,z]of spec.normal)a.setXYZ(i,x,y,z);a.needsUpdate=true;}
  }
  for(const f of changed){
   const a=new Vector3().fromBufferAttribute(p,3*f),b=new Vector3().fromBufferAttribute(p,3*f+1),c=new Vector3().fromBufferAttribute(p,3*f+2),cross=b.clone().sub(a).cross(c.clone().sub(a)),area=cross.length(),radius=area/(a.distanceTo(b)+b.distanceTo(c)+c.distanceTo(a));
   if(area===0)throw Error('M25 degenerate elbow triangle');cross.normalize();
   for(let j=0;j<3;j++){g.attributes.aPhysicalNormal?.setXYZ(3*f+j,cross.x,cross.y,cross.z);g.attributes.aBary?.setW(3*f+j,radius);}
  }
  for(const name of ['position','aPhysicalNormal','aBary'])if(g.attributes[name])g.attributes[name].needsUpdate=true;
  g.computeBoundingBox();g.computeBoundingSphere();g.userData.elbowCrease={parent:'R166-M23-4e47231a1df8',method:'implicit cotangent geometric fairing; shared angle-weighted geometric normals',support:.022,maxDisplacement:.0029490450266426603};
  const siblings=mesh.parent.children,start=siblings.indexOf(mesh);
  for(const o of siblings.slice(start+1,start+3).filter(o=>o.isLineSegments)){const old=o.geometry;o.geometry=new EdgesGeometry(g,30);old.dispose();}
 }
}
