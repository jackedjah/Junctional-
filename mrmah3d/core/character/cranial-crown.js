/* R192 Mr-only ordered biological crystal crown. Roots intersect the retained
 * shell; no visor holes, eye changes, hair fibres, or replacement head. */
import {Mesh,Vector3,Ray,Float32BufferAttribute,Triangle} from '../../vendor/three/three.module.min.js';
import {facetedGeometry} from './forge.js';
import {HEAD} from './proportions.js';
const V=a=>new Vector3(...a);
export function addMrCranialCrown(head,materials){
 const shell=head.geometry,p=shell.attributes.position,ray=new Ray(),hit=new Vector3(),records=[],positions=[],faces=[],upperRoots=[],keelTips=[],templeRoots=[];
 const designs=[{id:'CENTRAL_KEEL',root:[0,1,-.20],flow:[0,1,-.24],length:.161,width:.112}];
 for(const side of [-1,1]){
  designs.push({id:`UPPER_${side}`,root:[side*.48,.82,-.22],flow:[side*.40,.89,-.20],length:.115,width:.094});
  designs.push({id:`TEMPLE_${side}`,root:[side*.88,.37,-.18],flow:[side*.89,.20,-.30],length:.125,width:.102});
  designs.push({id:`REAR_${side}`,root:[side*.40,.46,-.85],flow:[side*.30,.60,-.74],length:.084,width:.080});
 }
 for(const d of designs){
  if(d.id.startsWith('REAR_'))continue;
  const radial=V(d.root).normalize();ray.origin.set(0,0,0);ray.direction.copy(radial);let distance=-Infinity;
  for(let i=0;i<p.count;i+=3){const a=new Vector3().fromBufferAttribute(p,i),b=new Vector3().fromBufferAttribute(p,i+1),c=new Vector3().fromBufferAttribute(p,i+2);
   if(ray.intersectTriangle(a,b,c,false,hit))distance=Math.max(distance,hit.dot(radial));}
  if(!Number.isFinite(distance))throw new Error('Crown root missed retained shell '+d.id);
  const seat=radial.clone().multiplyScalar(distance),axis=V(d.flow).normalize(),root=seat.clone().addScaledVector(radial,-.018),tip=seat.clone().addScaledVector(axis,d.length);
  if(d.id.startsWith('TEMPLE_'))templeRoots.push({side:Math.sign(d.root[0]),tip:tip.toArray(),kind:'temple'});
  if(d.id==='CENTRAL_KEEL')keelTips.push(tip.toArray());
  if(d.id.startsWith('UPPER_')){upperRoots.push({side:Math.sign(d.root[0]),tip:tip.toArray()});}
  const across=new Vector3(0,0,1).cross(axis).normalize(),depth=new Vector3().crossVectors(axis,across).normalize();
  const base=positions.length,ring=(center,w,h)=>{
   for(const [u,v]of [[1,0],[0,1],[-1,0],[0,-1]])positions.push(center.clone().addScaledVector(across,u*w).addScaledVector(depth,v*h).toArray());
  };
  ring(root,d.width*.5,d.width*.40);
  // Seat each root corner below the measured shell, including corners near
  // its sloping diamond edges. A centre-only inset leaves floating root lips.
  for(let k=base;k<base+4;k++){
   const q=V(positions[k]),dir=q.clone().normalize();ray.direction.copy(dir);let outer=0;
   for(let i=0;i<p.count;i+=3)if(ray.intersectTriangle(new Vector3().fromBufferAttribute(p,i),new Vector3().fromBufferAttribute(p,i+1),new Vector3().fromBufferAttribute(p,i+2),false,hit))outer=Math.max(outer,hit.dot(dir));
   if(outer<=.008)throw new Error('Crown root corner missed shell');positions[k]=dir.multiplyScalar(outer-.008).toArray();
  }
  ring(seat.clone().addScaledVector(axis,d.length*.23),d.width*.37,d.width*.29);positions.push(tip.toArray());
  if(d.id.startsWith('UPPER_'))upperRoots.find(r=>r.side===Math.sign(d.root[0])).body=positions.slice(base+4,base+8);
  faces.push([base+3,base+2,base+1,base]);
  for(let i=0;i<4;i++){const j=(i+1)%4;faces.push([base+i,base+j,base+4+j,base+4+i]);faces.push([base+4+i,base+4+j,base+8]);}
  if(d.id.startsWith('TEMPLE_'))templeRoots.find(r=>r.side===Math.sign(d.root[0])).body=positions.slice(base+4,base+8);
  records.push({id:d.id,root:root.toArray(),seat:seat.toArray(),tip:tip.toArray(),length:d.length,headHeightRatio:d.length/(2*HEAD.halfHeight),rootInset:.018,rootCornerInsets:.008});
 }
 for(const spec of upperRoots.sort((a,b)=>a.side-b.side))graftUpperPanel(shell,spec);
 graftRearRoot(shell,1);
 graftRearRoot(shell,-1);
 const upperExtra=upperRoots.filter(r=>r.body).length*8;
 graftNorthFold(shell,keelTips[0],upperRoots.find(r=>r.side>0)?.body?8:0);
 for(const spec of templeRoots.sort((a,b)=>a.side-b.side))graftUpperPanel(shell,{...spec,sourceTriangle:spec.side<0?86+upperExtra:10});
 shell.userData.cranialCrown={version:'R197',growths:records,northRoot:shell.userData.sharedNorthRoot,upperRoots:shell.userData.sharedUpperRoots,sharedRoots:shell.userData.sharedCrownRoots,templeRoots:shell.userData.sharedTempleRoots,allCrownRootsShared:true,watertightUnion:false,method:'seven growths share shell boundaries; whole asset watertightness not certified'};
 return head.shell;
}

// R195: replace one measured rear-shell triangle with a shared-edge growth.
// Boundary positions and all unaffected triangles retain their exact attributes.
function graftRearRoot(shell,side){
 const source=shell.attributes, p=source.position, ray=new Ray(), hit=new Vector3();
 ray.direction.set(side*.4,.46,-.85).normalize();let target=-1,distance=0;
 for(let i=0;i<p.count;i+=3)if(ray.intersectTriangle(...[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,i+k)),false,hit)&&hit.length()>distance){target=i;distance=hit.length();}
 if(target<0)throw new Error('Shared crown root triangle missing');
 const base=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,target+k));
 const normal=base[1].clone().sub(base[0]).cross(base[2].clone().sub(base[0])).normalize();
 const weights=[[1,0,0],[0,1,0],[0,0,1],[.7666666667,.1166666667,.1166666666],[.1166666667,.7666666667,.1166666666],[.1166666667,.1166666666,.7666666667],[1/3,1/3,1/3]];
 const positions=weights.map(w=>base.reduce((q,v,k)=>q.addScaledVector(v,w[k]),new Vector3()));
 // Root perimeter lies exactly on the existing rear plane.
 positions[6].add(new Vector3(side*.012,.052,-.068));
 const tris=[];for(let k=0;k<3;k++){let n=(k+1)%3;tris.push([k,n,n+3],[k,n+3,k+3],[k+3,n+3,6]);}
 const output=Object.fromEntries(Object.keys(source).map(n=>[n,[]]));
 for(let i=0;i<p.count;i+=3){
  if(i!==target){for(const [name,a]of Object.entries(source))for(let k=i*a.itemSize;k<(i+3)*a.itemSize;k++)output[name].push(a.array[k]);continue;}
  for(const tri of tris){
   const q=tri.map(k=>positions[k]),cross=q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[0])),norm=cross.clone().normalize();
   const radius=cross.length()/(q[0].distanceTo(q[1])+q[1].distanceTo(q[2])+q[2].distanceTo(q[0]));
   tri.forEach((idx,corner)=>{for(const [name,a]of Object.entries(source)){
    let values;
    if(name==='position')values=positions[idx].toArray();
    else if(name==='normal')values=norm.toArray();
    else if(name==='aSmooth'){const smooth=new Vector3(...Array.from({length:3},(_,c)=>weights[idx].reduce((sum,w,k)=>sum+w*a.array[(target+k)*3+c],0)));if(tri.includes(6))smooth.copy(norm);values=smooth.normalize().toArray();}
    else if(name==='aBary')values=[+(corner===0),+(corner===1),+(corner===2),radius];
    else values=Array.from({length:a.itemSize},(_,c)=>weights[idx].reduce((sum,w,k)=>sum+w*a.array[(target+k)*a.itemSize+c],0));
    output[name].push(...values);
   }});
  }
 }
 for(const [name,a]of Object.entries(source))shell.setAttribute(name,new Float32BufferAttribute(output[name],a.itemSize));
 for(const group of shell.groups){if(group.start>target)group.start+=24;else if(target>=group.start&&target<group.start+group.count)group.count+=24;}
 shell.computeBoundingBox();shell.computeBoundingSphere();
 (shell.userData.sharedCrownRoots ||= []).push({side,version:'R195',sourceTriangle:target/3,boundary:base.map(v=>v.toArray()),tip:positions[6].toArray(),addedTriangles:8,scope:'rear shell root; retained front unchanged'});
}

// Process the higher-index left panel first so the right source indices stay fixed.
function graftUpperPanel(shell,spec){
 const source=shell.attributes,p=source.position,start=(spec.sourceTriangle??(spec.side<0?34:16))*3;
 const vertices=Array.from({length:6},(_,k)=>new Vector3().fromBufferAttribute(p,start+k));
 const base=[vertices[0],vertices[1],vertices[2],vertices[5]],center=base.reduce((q,v)=>q.add(v),new Vector3()).multiplyScalar(.25);
 const positions=[...base.map(v=>v.clone()),...base.map(v=>v.clone().sub(center).multiplyScalar(.55).add(center)),V(spec.tip)];
 if(spec.body){let best=null;for(let r=0;r<4;r++){const ring=Array.from({length:4},(_,k)=>V(spec.body[(k+r)%4])),score=ring.reduce((sum,v,k)=>sum+v.distanceToSquared(positions[k+4]),0);if(!best||score<best.score)best={ring,score};}positions.push(...best.ring);}
 const reference=new Triangle(vertices[0],vertices[1],vertices[2]),other=new Triangle(vertices[3],vertices[4],vertices[5]);
 const weights=positions.map((v,i)=>{if(i>=8)return [0,.25,.25,0,0,.5];const a=reference.getBarycoord(v,new Vector3());if(Math.min(a.x,a.y,a.z)>-1e-6)return [a.x,a.y,a.z,0,0,0];const b=other.getBarycoord(v,new Vector3());return [0,0,0,b.x,b.y,b.z];});
 const tris=[];for(let k=0;k<4;k++){const n=(k+1)%4;tris.push([k,n,n+4],[k,n+4,k+4]);if(spec.body)tris.push([k+4,n+4,n+9],[k+4,n+9,k+9],[k+9,n+9,8]);else tris.push([k+4,n+4,8]);}
 const output=Object.fromEntries(Object.keys(source).map(n=>[n,[]]));
 for(let i=0;i<p.count;i+=3){
  if(i===start+3)continue;
  if(i!==start){for(const [name,a]of Object.entries(source))for(let k=i*a.itemSize;k<(i+3)*a.itemSize;k++)output[name].push(a.array[k]);continue;}
  for(const tri of tris){const q=tri.map(k=>positions[k]),cross=q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[0])),normal=cross.clone().normalize(),radius=cross.length()/(q[0].distanceTo(q[1])+q[1].distanceTo(q[2])+q[2].distanceTo(q[0]));
   tri.forEach((idx,corner)=>{for(const [name,a]of Object.entries(source)){let values;
    if(name==='position')values=positions[idx].toArray();
    else if(name==='normal'||(name==='aSmooth'&&tri.some(k=>k>=8)))values=normal.toArray();
    else if(name==='aBary')values=[+(corner===0),+(corner===1),+(corner===2),radius];
    else {values=Array.from({length:a.itemSize},(_,c)=>weights[idx].reduce((sum,w,k)=>sum+w*a.array[(start+k)*a.itemSize+c],0));if(name==='aSmooth')values=V(values).normalize().toArray();}
    output[name].push(...values);
   }});
  }
 }
 for(const [name,a]of Object.entries(source))shell.setAttribute(name,new Float32BufferAttribute(output[name],a.itemSize));
 for(const group of shell.groups){if(group.start>start)group.start+=spec.body?54:30;else if(start>=group.start&&start<group.start+group.count)group.count+=spec.body?54:30;}
 (shell.userData[spec.kind==='temple'?'sharedTempleRoots':'sharedUpperRoots'] ||= []).push({side:spec.side,sourceTriangle:start/3,boundary:base.map(v=>v.toArray()),tip:spec.tip,body:spec.body,addedTriangles:spec.body?18:10});
 shell.computeBoundingBox();shell.computeBoundingSphere();
}

// The keel crosses a fold: retain six boundary edges on the two original planes.
function graftNorthFold(shell,tip,sourceShift=0){
 const source=shell.attributes,p=source.position,ids=[32,33,38,39].map(i=>i+sourceShift),verts=ids.map(t=>Array.from({length:3},(_,k)=>new Vector3().fromBufferAttribute(p,t*3+k)));
 const base=[verts[0][0],verts[0][1],verts[0][2],verts[1][2],verts[3][2],verts[2][0]],center=base[0].clone().add(base[3]).multiplyScalar(.5);
 const positions=[...base.map(v=>v.clone()),...base.map(v=>v.clone().sub(center).multiplyScalar(.45).add(center)),V(tip),...[[0,.38,-.052],[.050,.38,-.068],[.050,.38,-.094],[0,.38,-.108],[-.050,.38,-.094],[-.050,.38,-.068]].map(V)];
 const weights=positions.map((q,i)=>{const sample=i>=12?center:q;let best=null;for(let t=0;t<4;t++){const tri=new Triangle(...verts[t]),w=tri.getBarycoord(sample,new Vector3()),error=Math.max(0,-w.x,-w.y,-w.z)+Math.abs(sample.clone().sub(verts[t][0]).dot(tri.getNormal(new Vector3())));if(!best||error<best.error)best={t,w,error};}if(best.error>1e-5)throw new Error('North root interpolation outside retained panels');return best;});
 const tris=[];for(let k=0;k<6;k++){const n=(k+1)%6;tris.push([k,n,n+6],[k,n+6,k+6],[k+6,n+6,n+13],[k+6,n+13,k+13],[k+13,n+13,12]);}
 const output=Object.fromEntries(Object.keys(source).map(n=>[n,[]]));
 for(let t=0;t<p.count/3;t++){
  if(ids.includes(t)&&t!==ids[0])continue;
  if(t!==ids[0]){for(const [name,a]of Object.entries(source))for(let k=t*3*a.itemSize;k<(t+1)*3*a.itemSize;k++)output[name].push(a.array[k]);continue;}
  for(const tri of tris){const q=tri.map(k=>positions[k]),cross=q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[0])),normal=cross.clone().normalize(),radius=cross.length()/(q[0].distanceTo(q[1])+q[1].distanceTo(q[2])+q[2].distanceTo(q[0]));
   tri.forEach((idx,corner)=>{const w=weights[idx],bary=w.w.toArray();for(const [name,a]of Object.entries(source)){let values;
    if(name==='position')values=positions[idx].toArray();
    else if(name==='normal'||(name==='aSmooth'&&tri.some(k=>k>=12)))values=normal.toArray();
    else if(name==='aBary')values=[+(corner===0),+(corner===1),+(corner===2),radius];
    else {values=Array.from({length:a.itemSize},(_,c)=>bary.reduce((sum,v,k)=>sum+v*a.array[(ids[w.t]*3+k)*a.itemSize+c],0));if(name==='aSmooth')values=V(values).normalize().toArray();}output[name].push(...values);
   }});
  }
 }
 for(const [name,a]of Object.entries(source))shell.setAttribute(name,new Float32BufferAttribute(output[name],a.itemSize));
 for(const group of shell.groups){if(group.start>ids.at(-1)*3)group.start+=78;else if(ids[0]*3>=group.start&&ids.at(-1)*3<group.start+group.count)group.count+=78;}
 shell.userData.sharedNorthRoot={version:'R197',sourceTriangles:ids,boundary:base.map(v=>v.toArray()),tip,foldEndpoints:[base[0].toArray(),base[3].toArray()],addedTriangles:26};shell.computeBoundingBox();shell.computeBoundingSphere();
}
