/* R192: small diamond normal cells over the retained anatomical surface.
 * No displacement. Cell boundaries only subdivide existing triangles using
 * barycentric interpolation. Smooth-clay normals and hero-pose lineage survive.
 * This is a bakeable surface-normal atlas, not planar game retopology.
 */
import {Vector3, Float32BufferAttribute} from '../../vendor/three/three.module.min.js';
const V=a=>new Vector3(...a), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function clip(poly,axis,limit,sign){
 const out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=(a.uv[axis]-limit)*sign,db=(b.uv[axis]-limit)*sign;
  if(da>=-1e-10)out.push(a);
  if((da>1e-10&&db< -1e-10)||(da< -1e-10&&db>1e-10)){
   const t=da/(da-db);out.push({uv:a.uv.map((v,k)=>v+(b.uv[k]-v)*t),w:a.w.map((v,k)=>v+(b.w[k]-v)*t)});
  }
 }return out;
}
function refine(g,chart,tag){
 if(g.index)throw new Error('Fine atlas requires retained expanded topology');
 const attrs=g.attributes,p=attrs.position,s=attrs.aSmooth||attrs.normal,records=[],cells=new Map(),parentIds=[];
 const read=(a,i)=>Array.from({length:a.itemSize},(_,k)=>a.array[i*a.itemSize+k]);
 const pos=(i,w)=>w.reduce((v,t,k)=>v.addScaledVector(V(read(p,i+k)),t),new Vector3());
 let omittedArea=0,originalArea=0,maxAngle=0,maxSurfaceError=0,floatSlivers=0;
 for(let i=0;i<p.count;i+=3){
  const xyz=[0,1,2].map(k=>V(read(p,i+k))),cross=xyz[1].clone().sub(xyz[0]).cross(xyz[2].clone().sub(xyz[0])),area=cross.length()*.5;originalArea+=area;
  const c=chart(xyz),tri=[0,1,2].map(k=>({uv:c?.uv[k]||[0,0],w:[+(k===0),+(k===1),+(k===2)]}));
  const append=(poly,key)=>{for(let j=1;j+1<poly.length;j++){
   const t=[poly[0],poly[j],poly[j+1]],points=t.map(v=>pos(i,v.w)),cr=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])),a=cr.length()*.5;
   if(a<1e-13){omittedArea+=a;continue;}
   if(cr.dot(cross)<0)throw new Error('Fine atlas reversed a face');
   const fp=points.map(v=>V(v.toArray().map(Math.fround))),fc=fp[1].clone().sub(fp[0]).cross(fp[2].clone().sub(fp[0]));
   if(fc.lengthSq()<1e-25||fc.dot(cross)<=0){omittedArea+=a;floatSlivers++;continue;}
   for(let k=0;k<3;k++)maxSurfaceError=Math.max(maxSurfaceError,fp[k].distanceTo(points[k]));
   records.push({i,t,key});parentIds.push(g.userData.heroPoseSupport?.triangleIds[i/3]??i/3);
   if(key){const cell=cells.get(key)||{normal:new Vector3(),area:0,triangles:0};
    for(const v of t)for(let k=0;k<3;k++)cell.normal.addScaledVector(V(read(s,i+k)),v.w[k]*a/3);
    cell.area+=a;cell.triangles++;cells.set(key,cell);}
  }};
  if(!c){append(tri,null);continue;}
  const lo=[0,1].map(k=>Math.floor(Math.min(...c.uv.map(v=>v[k])))),hi=[0,1].map(k=>Math.floor(Math.max(...c.uv.map(v=>v[k]))));
  if((hi[0]-lo[0]+1)*(hi[1]-lo[1]+1)>100)throw new Error('Fine atlas chart crossed seam');
  for(let u=lo[0];u<=hi[0];u++)for(let v=lo[1];v<=hi[1];v++){
   let poly=tri;for(const [axis,lim,sign]of [[0,u,1],[0,u+1,-1],[1,v,1],[1,v+1,-1]])poly=clip(poly,axis,lim,sign);
   if(poly.length>2)append(poly,`${c.owner}:${u}:${v}`);
  }
 }
 const result=Object.fromEntries(Object.entries(attrs).filter(([n])=>n!=='aCrystalNormal').map(([n])=>[n,[]]));
 for(const cell of cells.values())cell.normal.normalize();
 for(const rec of records)for(const q of rec.t){
  for(const [n,a]of Object.entries(attrs)){
   if(n==='aCrystalNormal')continue;
   let val=Array.from({length:a.itemSize},(_,k)=>q.w.reduce((sum,w,j)=>sum+w*a.array[(rec.i+j)*a.itemSize+k],0));
   if(n==='normal'&&rec.key){
    const smooth=q.w.reduce((v,w,j)=>v.addScaledVector(V(read(s,rec.i+j)),w),new Vector3()).normalize();
    const target=cells.get(rec.key).normal,angle=Math.acos(clamp(smooth.dot(target),-1,1));
    // Never collapse a broad crown into a large slab. Ten degrees is the
    // maximum local optical change; protected returns keep their own normal.
    const mix=angle>1e-9?Math.min(.92,(10*Math.PI/180)/angle):0;
    const normal=smooth.clone().lerp(target,mix).normalize();val=normal.toArray();maxAngle=Math.max(maxAngle,smooth.angleTo(normal));
   }else if(['normal','aSmooth','aMoldNormal'].includes(n))val=V(val).normalize().toArray();
   result[n].push(...val);
  }
 }
 for(const [n,a]of Object.entries(result))g.setAttribute(n,new Float32BufferAttribute(a,attrs[n].itemSize));
 g.setAttribute('aCrystalNormal',g.attributes.normal);
 if(g.userData.heroPoseSupport)g.userData.heroPoseSupport.triangleIds=Uint32Array.from(parentIds);
 g.computeBoundingBox();g.computeBoundingSphere();
 if(maxSurfaceError>3e-7||omittedArea/originalArea>1e-6)throw new Error('Fine atlas exceeded surface preservation bound');
 g.userData.fineCrystalAtlas={version:'R192',tag,cells:cells.size,trianglesBefore:p.count/3,trianglesAfter:records.length,maxNormalAngleDegrees:maxAngle*180/Math.PI,omittedArea,originalArea,floatSlivers,maxSurfaceError,displacement:0,method:'clipped diamond normal cells on exact retained triangles; no surface displacement; existing material unchanged'};
}
export function applyFineCrystalSurface(body,limbs){
 refine(body.torso.geometry,xyz=>{
  const c=xyz.reduce((v,p)=>v.add(p),new Vector3()).multiplyScalar(1/3),n=c.z>=0?'front':'back';
  // Lateral charts are defined from the body, never from the camera.
  const lateral=Math.abs(c.x)>.22&&Math.abs(c.z)<.075;
  const region=c.y>2.25?'neck':c.y>1.96?'pec':c.y>1.44?'core':c.y>.87?'quad':'taper';
  const side=c.x<0?-1:1,wide=region==='pec'?.057:region==='neck'?.024:.037,long=region==='pec'?.045:region==='core'?.051:.080;
  const uv=xyz.map(p=>{const across=lateral?p.z:p.x*side;
   // Pec fans descend toward the axilla; posterior torso cells track the
   // oblique lat/trap sweep. Lower-body cells remain longitudinal.
   const sweep=region==='pec'?(n==='front'?.20:-.42):region==='core'&&n==='back'?-.45:0;
   const x=across/wide,y=(p.y+sweep*across)/long;return [x+y,y-x];});
  return {owner:`${region}:${lateral?'side'+side:n+side}`,uv};
 },'TORSO_NECK_BACK_FUSED_LOWER');
 limbs.group.traverse(o=>{
  if(!o.isMesh||!/^arm-(left|right)-(upper|fore)$/.test(o.name))return;
  const f=o.geometry.userData.muscleBellyOnly?.frame||o.geometry.userData.proximalForearmSurface?.frame;
  if(!f)return;
  const axis=V(f.axis),front=V(f.front),outer=V(f.outer),fore=o.name.endsWith('fore');
  refine(o.geometry,xyz=>{
   const hs=xyz.map(p=>p.dot(axis)/f.length);
   // R191 exact elbow loops and the wrist support remain outside the new atlas.
   if(fore?(Math.min(...hs)<.14||Math.max(...hs)>.88):(Math.max(...hs)>.80||Math.min(...hs)<-.28))return null;
   const angles=xyz.map(p=>Math.atan2(p.dot(outer),p.dot(front)));
   for(let i=1;i<3;i++){while(angles[i]-angles[0]>Math.PI)angles[i]-=2*Math.PI;while(angles[i]-angles[0]<-Math.PI)angles[i]+=2*Math.PI;}
   const sectors=fore?24:32,axial=fore?.068:.079;
   return {owner:fore?'FOREARM':'DELT_UPPER_ARM',uv:xyz.map((p,i)=>{const u=angles[i]*sectors/(2*Math.PI),v=p.dot(axis)/axial;return [u+v,v-u];})};
  },o.name);
 });
}
