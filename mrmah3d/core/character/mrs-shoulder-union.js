import {BufferAttribute,EdgesGeometry,Vector3,Matrix4} from '../../vendor/three/three.module.min.js';
import {shoulderUnionData} from './mrs-shoulder-union-data.js';

// Source-face subdivisions of the retained M19 surface union. No remeshing,
// silhouette inflation or edits to the protected original triangles.
export function joinMrsShoulderSurfaces({body,limbs}){
 const meshes=[body.group.getObjectByName('torso'),...['left','right'].map(s=>limbs[s].group.getObjectByName(`arm-${s}-upper`))];
 for(const mesh of meshes){
  const g=mesh.geometry,spec=shoulderUnionData[mesh.name],attrs={...g.attributes};
  if(!spec||attrs.position.count!==spec.originalCorners)throw Error('M20 union requires retained M19 topology');
  const output=Object.fromEntries(Object.keys(attrs).map(n=>[n,[]]));
  for(let f=0;f<attrs.position.count/3;f++){
   const patch=spec.patches[f];
   if(patch===undefined){for(const[n,a]of Object.entries(attrs))for(let i=f*3*a.itemSize;i<(f+1)*3*a.itemSize;i++)output[n].push(a.array[i]);continue;}
   for(const weights of patch){
    const points=weights.map(w=>{const p=new Vector3();w.forEach((v,j)=>p.addScaledVector(new Vector3().fromBufferAttribute(attrs.position,f*3+j),v));return p;});
    const cross=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])),normal=cross.clone().normalize(),radius=cross.length()/(points[0].distanceTo(points[1])+points[1].distanceTo(points[2])+points[2].distanceTo(points[0]));
    for(let j=0;j<3;j++)for(const[n,a]of Object.entries(attrs)){
     if(n==='aBary'){output[n].push(+(j===0),+(j===1),+(j===2),radius);continue;}
     if(n==='aPhysicalNormal'){output[n].push(...normal.toArray());continue;}
     const v=Array.from({length:a.itemSize},(_,k)=>weights[j].reduce((sum,w,c)=>sum+w*a.array[(f*3+c)*a.itemSize+k],0));
     if(a.itemSize===3&&(n==='normal'||n.includes('Normal')||n==='aSmooth')){const length=Math.hypot(...v)||1;for(let k=0;k<3;k++)v[k]/=length;}
     output[n].push(...v);
    }
   }
  }
  for(const[n,a]of Object.entries(attrs))g.setAttribute(n,new BufferAttribute(new a.array.constructor(output[n]),a.itemSize,a.normalized));
  g.setIndex(null);g.clearGroups();g.computeBoundingBox();g.computeBoundingSphere();
  g.userData.shoulderUnion={parent:'R166-M19-4934f9d69db0',method:'source-face union',removedInternalSurfaces:true};
  // Preserve the old polar frame: trimming the buried root must not change
  // the pose's coordinate normalization. End of blend remains at .46.
  if(mesh.name==='arm-left-upper'){
   const axis=limbs.left.elbowJoint.position.clone().normalize();let lo=Infinity,hi=-Infinity;
   for(let i=0;i<attrs.position.count;i++){const t=new Vector3().fromBufferAttribute(attrs.position,i).dot(axis);lo=Math.min(lo,t);hi=Math.max(hi,t);}
   g.userData.shoulderUnion.poseFrame={lo,hi,start:.195,end:.46};
  }
  const siblings=mesh.parent.children,start=siblings.indexOf(mesh);
  for(const o of siblings.slice(start+1,start+3).filter(o=>o.isLineSegments)){const old=o.geometry;o.geometry=new EdgesGeometry(g,30);old.dispose();}
 }
}
