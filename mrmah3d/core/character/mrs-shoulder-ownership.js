import {Vector3} from '../../vendor/three/three.module.min.js';
import {rebuildMrsBrachialisPatch} from './mrs-brachialis-patch.js';

export function reconstructMrsShoulder127(g,arm,side){
 const f=g.userData.mrsSurgical126.frame,axis=new Vector3().fromArray(f.axis),front=new Vector3().fromArray(f.front),out=new Vector3().fromArray(f.out);
 const handed=Math.sign(front.clone().cross(axis).dot(out)),across=front.clone().multiplyScalar(handed);
 const before=g.clone(),forward=v=>new Vector3(v.dot(across),v.dot(axis),v.dot(out));
 const inverse=v=>across.clone().multiplyScalar(v.x).addScaledVector(axis,v.y).addScaledVector(out,v.z);
 const transform=fn=>{const seen=new Set();for(const name of ['position','normal','aSmooth','aMoldNormal','aCrystalNormal','aPhysicalNormal','aFacet']){
  const a=g.attributes[name];if(!a||seen.has(a))continue;seen.add(a);for(let i=0;i<a.count;i++){const v=fn(new Vector3().fromBufferAttribute(a,i));a.setXYZ(i,v.x,v.y,v.z);}a.needsUpdate=true;
 }};
 transform(forward);
 const collarWidth=side==='left'?.080:.086;
 // Own the complete origin-to-insertion corridor, not an isolated mid-belly
 // diamond. The anterior biceps crown remains outside this lateral chart.
 rebuildMrsBrachialisPatch(g,{characterSide:side,patchSpec:{x:handed*.008,y:.585*f.boneLength,w:collarWidth,h:.325*f.boneLength,flow:0,radius:.72,radiusU:.04104/collarWidth,stations:[-1,-.6,.6,1]}});
 transform(inverse);
 const meta=g.userData.mrsBrachialisPatch127;
 // Surviving triangles keep their exact retained buffers after the chart roundtrip.
 meta.oldToNewTriangle.forEach((to,from)=>{if(to<0)return;for(const[name,a]of Object.entries(g.attributes)){
  const old=before.attributes[name];for(let k=0;k<3;k++)for(let j=0;j<a.itemSize;j++)a.array[(to*3+k)*a.itemSize+j]=old.array[(from*3+k)*a.itemSize+j];a.needsUpdate=true;
 }});
 // Barycentric normals at new cuts are not unit length. Resolve one unit
 // normal per continuous welded corner, anchored to untouched stock where
 // available; registered physical faces keep their deliberate sharp normals.
 const held=new Set(meta.oldToNewTriangle.filter(t=>t>=0).flatMap(t=>[3*t,3*t+1,3*t+2]));
 const sharp=new Set(meta.planes.flatMap(p=>p.triangleIndices.flatMap(t=>[3*t,3*t+1,3*t+2]))),corners=new Map();
 const position=g.attributes.position;
 for(let i=0;i<position.count;i++){const key=new Vector3().fromBufferAttribute(position,i).toArray().map(v=>Math.round(v*1e6)).join(',');if(!corners.has(key))corners.set(key,[]);corners.get(key).push(i);}
 const seenNormals=new Set();for(const name of ['aSmooth','aMoldNormal','aCrystalNormal','normal']){
  const attr=g.attributes[name];if(seenNormals.has(attr))continue;seenNormals.add(attr);
  const crystal=attr===g.attributes.aCrystalNormal;
  for(const group of corners.values()){
   const indices=crystal?group.filter(i=>!sharp.has(i)):group;if(!indices.length)continue;
   const anchor=indices.find(i=>held.has(i)),n=anchor===undefined?indices.reduce((sum,i)=>sum.add(new Vector3().fromBufferAttribute(attr,i)),new Vector3()).normalize():new Vector3().fromBufferAttribute(attr,anchor);
   for(const i of indices)if(!held.has(i))attr.setXYZ(i,n.x,n.y,n.z);
  }attr.needsUpdate=true;
 }
 for(const plane of meta.planes){
  const center=inverse(new Vector3().fromArray(plane.centerPosition)),t=center.dot(axis)/f.boneLength,z=center.dot(front);
  plane.centerPosition=center.toArray();plane.averageNormal=inverse(new Vector3().fromArray(plane.averageNormal)).normalize().toArray();plane.apexDirection=axis.toArray();plane.frame='upper-arm mesh local';
  plane.anatomicalOwner=plane.id.endsWith('CROWN')?'lateral brachialis crown':`${t<.51?'proximal':t>.66?'distal':'middle'} ${z>.006?'anterior':z<-.006?'posterior':'lateral'} brachialis support`;
  const cell=plane.id.match(/FLOW_(\d)_(\d)_([AB])/);
  if(cell)plane.mirroredId=plane.mirroredId.replace(/FLOW_\d_\d_[AB]/,`FLOW_${2-Number(cell[2])}_${2-Number(cell[1])}_${cell[3]}`);
 }
 for(const edge of meta.creases)edge.positions=edge.positions.map(p=>inverse(new Vector3().fromArray(p)).toArray());
 const remap=value=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){for(const v of value)remap(v);return;}
  if(Array.isArray(value.triangleIndices)){const old=value.triangleIndices;value.triangleIndices=[...new Set(old.flatMap(i=>meta.oldToNewTriangles[i]||[]))];if(value.triangleIndices.length!==old.length)value.status='M127 surviving support only; brachialis patch has new ownership';value.topologyVersion='M127';}
  for(const[k,v]of Object.entries(value))if(k!=='triangleIndices')remap(v);
 };
 for(const[k,v]of Object.entries(g.userData))if(k!=='mrsBrachialisPatch127')remap(v);
 g.userData.mrsShoulder127={version:'M127',parent:'M126',side,frame:f,region:'brachialis',method:'fixed-boundary anatomical patch; physical crown, convex support envelope and coupled return skin',planes:meta.planes.length,report:meta.reports[0],protected:'Shoulder, anterior biceps crown, elbow and all other meshes retained'};
 g.computeBoundingBox();g.computeBoundingSphere();return g;
}
