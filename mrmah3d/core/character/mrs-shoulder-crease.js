import {Vector3,EdgesGeometry} from '../../vendor/three/three.module.min.js';
import {shoulderCreaseData} from './mrs-shoulder-crease-data.js';

// M21: an implicit cotangent surface correction, measured on the retained
// M20 joined topology. Positions and normals are from the same actual mesh.
// Support is a .022-unit band around the shared shoulder boundary; unchanged
// corners retain every attribute. No material or normal-only concealment.
export function refineMrsShoulderCrease({body,limbs}){
 const meshes=[body.group.getObjectByName('torso'),...['left','right'].map(s=>limbs[s].group.getObjectByName(`arm-${s}-upper`))];
 for(const mesh of meshes){
  const g=mesh.geometry,spec=shoulderCreaseData[mesh.name],p=g.attributes.position;
  if(!g.userData.shoulderUnion||p.count!==spec.corners)throw Error('M21 crease requires retained M20 joined topology');
  const changed=new Set();
  for(const[i,x,y,z]of spec.position){p.setXYZ(i,x,y,z);changed.add(Math.floor(i/3));}
  for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal']){
   const a=g.attributes[name];if(a){for(const[i,x,y,z]of spec.normal)a.setXYZ(i,x,y,z);a.needsUpdate=true;}
  }
  for(const f of changed){
   const a=new Vector3().fromBufferAttribute(p,3*f),b=new Vector3().fromBufferAttribute(p,3*f+1),c=new Vector3().fromBufferAttribute(p,3*f+2),cross=b.clone().sub(a).cross(c.clone().sub(a)),area=cross.length(),radius=area/(a.distanceTo(b)+b.distanceTo(c)+c.distanceTo(a));
   if(area===0)throw Error('M21 degenerate shoulder triangle');cross.normalize();
   for(let j=0;j<3;j++){g.attributes.aPhysicalNormal?.setXYZ(3*f+j,cross.x,cross.y,cross.z);g.attributes.aBary?.setW(3*f+j,radius);}
  }
  for(const name of ['position','aPhysicalNormal','aBary'])if(g.attributes[name])g.attributes[name].needsUpdate=true;
  g.computeBoundingBox();g.computeBoundingSphere();g.userData.shoulderCrease={parent:'R166-M20-c3ff811a34f4',method:'implicit cotangent geometric fairing; shared angle-weighted geometric normals',support:.022,maxDisplacement:.0024278893482590595};
  const siblings=mesh.parent.children,start=siblings.indexOf(mesh);
  for(const o of siblings.slice(start+1,start+3).filter(o=>o.isLineSegments)){const old=o.geometry;o.geometry=new EdgesGeometry(g,30);old.dispose();}
 }
}
