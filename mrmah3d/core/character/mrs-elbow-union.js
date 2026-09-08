import {BufferAttribute,EdgesGeometry,Vector3} from '../../vendor/three/three.module.min.js';
import {elbowUnionData} from './mrs-elbow-union-data.js';

// M25: trim buried elbow/forearm surfaces using the retained M23 source faces.
// Both components share a rigid frame in neutral and the existing hero pose.
// Barycentric ownership preserves all uncut source-corner attributes exactly.
export function joinMrsElbowSurfaces({limbs}){
 for(const side of ['left','right'])for(const part of ['fore','elbow-knob']){
  const mesh=limbs[side].group.getObjectByName(`arm-${side}-${part}`),g=mesh.geometry;
  const spec=elbowUnionData[mesh.name],attrs={...g.attributes};
  if(attrs.position.count!==spec.originalCorners)throw Error('M25 union requires retained M23 topology');
  const output=Object.fromEntries(Object.keys(attrs).map(n=>[n,[]]));
  for(const [f,weights] of spec.triangles){
   const basis=weights.map(w=>{const k=w.indexOf(Math.max(...w));return w.every((v,j)=>Math.abs(v-+(j===k))<1e-8)?k:-1;});
   const points=weights.map((w,j)=>basis[j]>=0?new Vector3().fromBufferAttribute(attrs.position,f*3+basis[j]):w.reduce((p,v,k)=>p.addScaledVector(new Vector3().fromBufferAttribute(attrs.position,f*3+k),v),new Vector3()));
   const cross=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
   const normal=cross.clone().normalize(),radius=cross.length()/(points[0].distanceTo(points[1])+points[1].distanceTo(points[2])+points[2].distanceTo(points[0]));
   const uncut=basis.every(k=>k>=0)&&new Set(basis).size===3;
   for(let j=0;j<3;j++)for(const[n,a]of Object.entries(attrs)){
    if(n==='aBary'&&!uncut){output[n].push(+(j===0),+(j===1),+(j===2),radius);continue;}
    if(n==='aPhysicalNormal'&&!uncut){output[n].push(...normal.toArray());continue;}
    if(basis[j]>=0){for(let k=0;k<a.itemSize;k++)output[n].push(a.array[(f*3+basis[j])*a.itemSize+k]);continue;}
    const v=Array.from({length:a.itemSize},(_,k)=>weights[j].reduce((sum,w,c)=>sum+w*a.array[(f*3+c)*a.itemSize+k],0));
    if(a.itemSize===3&&(n==='normal'||n.includes('Normal')||n==='aSmooth')){const length=Math.hypot(...v)||1;for(let k=0;k<3;k++)v[k]/=length;}
    output[n].push(...v);
   }
  }
  for(const[n,a]of Object.entries(attrs))g.setAttribute(n,new BufferAttribute(new a.array.constructor(output[n]),a.itemSize,a.normalized));
  g.setIndex(null);g.clearGroups();g.computeBoundingBox();g.computeBoundingSphere();
  g.userData.elbowUnion={parent:'R166-M23-4e47231a1df8',method:'native source-face union',removedInternalSurfaces:true,sourceCornerCount:spec.originalCorners};
  const siblings=mesh.parent.children,start=siblings.indexOf(mesh);
  for(const o of siblings.slice(start+1,start+3).filter(o=>o.isLineSegments)){const old=o.geometry;o.geometry=new EdgesGeometry(g,30);old.dispose();}
 }
}
