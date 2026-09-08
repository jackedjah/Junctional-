import {BufferGeometry,Float32BufferAttribute,Vector3,Quaternion,Bone,Skeleton,SkinnedMesh,Uint16BufferAttribute} from '../../vendor/three/three.module.min.js';

// R191 experiment: cut real skin boundaries and connect their exact vertices.
// This is a rest-pose geometric junction, not an exported skinning solution.
export function createElbowContinuity(upper,fore,offset,axis,front,outer,limits={}){
 const key=v=>v.map(x=>Math.round(x*1e7)).join(','),normalNames=new Set(['normal','aSmooth','aMoldNormal']);
 const schemas=Object.fromEntries(Object.entries(upper.attributes).map(([n,a])=>[n,a.itemSize]));
 const dot=(p,v)=>p[0]*v.x+p[1]*v.y+p[2]*v.z;
 const interpolate=(a,b,t)=>Object.fromEntries(Object.keys(schemas).map(n=>[n,a[n].map((x,i)=>x+(b[n][i]-x)*t)]));
 function geometry(triangles,shift=new Vector3()){
  const out=Object.fromEntries(Object.keys(schemas).map(n=>[n,[]]));
  for(const tri of triangles){
   const pts=tri.map(v=>new Vector3(...v.position));
   if(new Vector3().subVectors(pts[1],pts[0]).cross(new Vector3().subVectors(pts[2],pts[0])).lengthSq()<1e-22)continue;
   for(let j=0;j<3;j++)for(const [n,size] of Object.entries(schemas)){
    let v=tri[j][n].slice();
    if(n==='position')v=new Vector3(...v).add(shift).toArray();
    if(normalNames.has(n)&&Math.abs(new Vector3(...v).length()-1)>2e-6)v=new Vector3(...v).normalize().toArray();
    if(n==='aBary'){
     const a=new Vector3(...tri[0].position),b=new Vector3(...tri[1].position),c=new Vector3(...tri[2].position);
     const twiceArea=b.clone().sub(a).cross(c.clone().sub(a)).length(),perimeter=a.distanceTo(b)+b.distanceTo(c)+c.distanceTo(a);
     v=[j===0?1:0,j===1?1:0,j===2?1:0];
     if(size===4)v.push(perimeter>0?twiceArea/perimeter:0);
    }
    out[n].push(...v);
   }
  }
  const g=new BufferGeometry();for(const[n,size]of Object.entries(schemas))g.setAttribute(n,new Float32BufferAttribute(out[n],size));
  g.computeBoundingBox();g.computeBoundingSphere();return g;
 }
 function cut(g,shift,h,keepLow){
  if(g.index)throw new Error('R191 requires the retained expanded skin topology');
  const tris=[],boundary=new Map(),edges=new Map(),inside=v=>keepLow?dot(v.position,axis)<=h:dot(v.position,axis)>=h;
  const vertex=i=>Object.fromEntries(Object.keys(schemas).map(n=>{const a=g.attributes[n]||(n==='aMoldNormal'?g.attributes.aSmooth:null);if(!a)throw new Error('Missing junction attribute '+n);let v=Array.from(a.array.slice(i*a.itemSize,(i+1)*a.itemSize));if(n==='position')v=new Vector3(...v).sub(shift).toArray();return[n,v];}));
  for(let i=0;i<g.attributes.position.count;i+=3){
   const input=[vertex(i),vertex(i+1),vertex(i+2)],poly=[],hits=[];
   for(let j=0;j<3;j++){
    const a=input[j],b=input[(j+1)%3],ia=inside(a),ib=inside(b);
    if(ia)poly.push(a);
    if(ia!==ib){const t=(h-dot(a.position,axis))/(dot(b.position,axis)-dot(a.position,axis)),v=interpolate(a,b,t),k=key(v.position);if(!boundary.has(k))boundary.set(k,v);const shared=boundary.get(k);poly.push(shared);hits.push(k);}
   }
   if(hits.length===2&&hits[0]!==hits[1])for(const[a,b]of[[hits[0],hits[1]],[hits[1],hits[0]]]){if(!edges.has(a))edges.set(a,new Set());edges.get(a).add(b);}
   for(let j=1;j+1<poly.length;j++)tris.push([poly[0],poly[j],poly[j+1]]);
  }
  for(const[k,e]of edges)if(e.size!==2)throw new Error('R191 cut is not one closed skin loop: degree '+e.size);
  const loop=[...boundary.values()].map(v=>({v,a:Math.atan2(dot(v.position,outer),dot(v.position,front))})).sort((a,b)=>a.a-b.a);
  if(loop.length<8)throw new Error('Insufficient real cut boundary');
  // Verify angular sorting follows original boundary edges; do not bridge holes.
  for(let i=0;i<loop.length;i++)if(!edges.get(key(loop[i].v.position))?.has(key(loop[(i+1)%loop.length].v.position)))throw new Error('R191 boundary is not a single star-shaped loop');
  return{g:geometry(tris,shift),loop};
 }
 const low=limits.low??-.025,high=limits.high??.035,a=cut(upper,offset,low,true),b=cut(fore,new Vector3(),high,false),tris=[];
 let i=0,j=0;const A=a.loop,B=b.loop,angle=(arr,k)=>arr[k%arr.length].a+Math.floor(k/arr.length)*Math.PI*2;
 while(i<A.length||j<B.length){
  const av=A[i%A.length].v,bv=B[j%B.length].v;
  let tri;
  if(j===B.length||(i<A.length&&angle(A,i+1)<angle(B,j+1))){tri=[av,A[(i+1)%A.length].v,bv];i++;}
  else{tri=[av,B[(j+1)%B.length].v,bv];j++;}
  const q=tri.map(v=>new Vector3(...v.position)),n=q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[0])),c=q[0].clone().add(q[1]).add(q[2]).multiplyScalar(1/3);c.addScaledVector(axis,-c.dot(axis));if(n.dot(c)<0)tri.reverse();tris.push(tri);
 }
 const midCache=new Map();let maxCurveOffset=0;
 function midpoint(a,b){
  const k=[key(a.position),key(b.position)].sort().join('|');if(midCache.has(k))return midCache.get(k);
  const h0=dot(a.position,axis),h1=dot(b.position,axis),v=interpolate(a,b,.5);
  if(Math.abs(h1-h0)>1e-6){
   const lo=h0<h1?a:b,hi=h0<h1?b:a;
   const slope=x=>{const q=new Vector3(...x.position),r=q.clone().addScaledVector(axis,-q.dot(axis)).normalize(),n=new Vector3(...x.aSmooth);return -n.dot(axis)/Math.max(.20,n.dot(r));};
   const delta=(high-low)*(slope(lo)-slope(hi))/8;
   if(Math.abs(delta)>.020)throw new Error('R191 measured endpoint slopes exceed local transition bound '+delta);
   const q=new Vector3(...v.position),r=q.clone().addScaledVector(axis,-q.dot(axis)).normalize();q.addScaledVector(r,delta);v.position=q.toArray();maxCurveOffset=Math.max(maxCurveOffset,Math.abs(delta));
  }
  midCache.set(k,v);return v;
 }
 const curved=[];
 for(const tri of tris){
  const hs=tri.map(v=>dot(v.position,axis)),pair=hs[0]*hs[1]>0?[0,1,2]:hs[1]*hs[2]>0?[1,2,0]:[2,0,1],a=tri[pair[0]],b=tri[pair[1]],c=tri[pair[2]],ac=midpoint(a,c),bc=midpoint(b,c);
  for(const t of [[a,b,bc],[a,bc,ac],[ac,bc,c]]){const q=t.map(v=>new Vector3(...v.position)),n=q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[0])),center=q[0].clone().add(q[1]).add(q[2]).multiplyScalar(1/3);center.addScaledVector(axis,-center.dot(axis));if(n.dot(center)<0)t.reverse();curved.push(t);}
 }
 let rendered=curved;
 if(limits.rings){
  const sample=(loop,theta)=>{let i=loop.findIndex((v,k)=>theta>=v.a&&theta<(loop[(k+1)%loop.length].a+(k===loop.length-1?Math.PI*2:0)));if(i<0)i=loop.length-1;
   const a=loop[i].v,b=loop[(i+1)%loop.length].v,dx=Math.cos(theta),dy=Math.sin(theta),ax=dot(a.position,front),ay=dot(a.position,outer),bx=dot(b.position,front),by=dot(b.position,outer),den=(bx-ax)*dy-(by-ay)*dx;
   return interpolate(a,b,Math.max(0,Math.min(1,-(ax*dy-ay*dx)/den)));
  };
  const rings=[A];for(const t of [.25,.5,.75]){const ring=[];for(let k=0;k<64;k++){
   const theta=-Math.PI+k*Math.PI/32,a=sample(A,theta),b=sample(B,theta),v=interpolate(a,b,t),radial=front.clone().multiplyScalar(Math.cos(theta)).addScaledVector(outer,Math.sin(theta));
   const slope=x=>{const n=new Vector3(...x.aSmooth);return -n.dot(axis)/Math.max(.20,n.dot(radial));};
   const d=(high-low)*(slope(a)*(t*t*t-2*t*t+t)+slope(b)*(t*t*t-t*t));if(Math.abs(d)>.020)throw new Error('R201 section tangent exceeds local bound');
   v.position=new Vector3(...v.position).addScaledVector(radial,d).toArray();ring.push({a:theta,v});
  }rings.push(ring);}rings.push(B);rendered=[];
  for(let r=0;r<rings.length-1;r++){const U=rings[r],V=rings[r+1];let i=0,j=0;while(i<U.length||j<V.length){const a=U[i%U.length].v,b=V[j%V.length].v;let tri;if(j===V.length||(i<U.length&&angle(U,i+1)<angle(V,j+1))){tri=[a,U[(i+1)%U.length].v,b];i++;}else{tri=[a,V[(j+1)%V.length].v,b];j++;}
   const q=tri.map(v=>new Vector3(...v.position)),n=q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[0])),c=q[0].clone().add(q[1]).add(q[2]).multiplyScalar(1/3);c.addScaledVector(axis,-c.dot(axis));if(n.dot(c)<0)tri.reverse();rendered.push(tri);
  }}
 }
 const bridge=geometry(rendered);
 bridge.userData.elbowContinuity={version:'R191',cuts:[low,high],boundaryVertices:[A.length,B.length],maxCurveOffset,triangles:bridge.attributes.position.count/3,method:'exact clipped anatomical boundaries, angular zipper with midpoint Hermite support from boundary tangents; no sphere or collar',status:'EXPERIMENT: rest junction; deformation not certified'};
 const ua=upper.userData,fa=fore.userData;for(const n of Object.keys(b.g.attributes))if(!fore.attributes[n])b.g.deleteAttribute(n);upper.copy(a.g);fore.copy(b.g);upper.userData=ua;fore.userData=fa;a.g.dispose();b.g.dispose();
 return bridge;
}

// R201: clip the folded arm in a common straight bind frame. The retained
// forearm is rotated back after clipping; only the junction uses this frame.
export function createFoldedElbowContinuity(upper,fore,offset,foreAxis){
 const axis=offset.clone().normalize(),q=new Quaternion().setFromUnitVectors(foreAxis,axis),back=q.clone().invert();
 const rotate=(g,r)=>{for(const n of ['position','normal','aSmooth','aMoldNormal']){const a=g.attributes[n];if(!a)continue;for(let i=0;i<a.count;i++){const v=new Vector3().fromBufferAttribute(a,i).applyQuaternion(r);a.setXYZ(i,v.x,v.y,v.z);}a.needsUpdate=true;}g.computeBoundingBox();g.computeBoundingSphere();};
 const neutral=fore.clone();rotate(neutral,q);
 const front=new Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),outer=new Vector3().crossVectors(axis,front).normalize();
 const bridge=createElbowContinuity(upper,neutral,offset,axis,front,outer,{low:-.045,high:.045,rings:true});
 rotate(neutral,back);const data=fore.userData;fore.copy(neutral);fore.userData=data;neutral.dispose();
 bridge.userData.elbowNeutralBind={axis:axis.toArray(),distalQuaternion:back.toArray(),side:'left'};
 bridge.userData.elbowContinuity.version='R201-left';
 bridge.userData.elbowContinuity.method='exact clipped boundaries; three regular 64-vertex sections with Hermite radial support in neutral bind space';
 bridge.userData.elbowContinuity.status='PARTIAL: local junction; complete export and deformation acceptance remain open';
 return bridge;
}

// The middle joint follows half the bend during the renderer's skeleton phase,
// before bone matrices are uploaded. Vertex buffers remain authored geometry.
class FoldedElbowSkeleton extends Skeleton {
 update(){const middle=this.bones[2],distal=this.bones[1],elbow=distal.parent;
  middle.position.copy(elbow.position);middle.quaternion.identity().slerp(elbow.quaternion.clone().multiply(distal.quaternion),.5);
  middle.updateMatrixWorld(true);super.update();
 }
 clone(){return new FoldedElbowSkeleton(this.bones,this.boneInverses);}
}

// Native skinning updates in the renderer's established skeleton phase.
// Only this junction is skinned; the two existing rigid limb frames own it.
export function createBoundElbowSkin(g,material,elbow,axis){
 const index=[],weights=[],p=g.attributes.position,bind=g.userData.elbowNeutralBind,bindAxis=bind?new Vector3(...bind.axis):axis,[low,high]=g.userData.elbowContinuity?.cuts||[-.025,.035];
 for(let i=0;i<p.count;i++){const w=Math.max(0,Math.min(1,bind?(high-new Vector3().fromBufferAttribute(p,i).dot(bindAxis))/(high-low):(.035-new Vector3().fromBufferAttribute(p,i).dot(axis))/.060));if(bind){index.push(0,1,2,0);const t=Math.abs(2*w-1),s=t*t*(3-2*t);weights.push(w>.5?s:0,w<.5?s:0,1-s,0);}else{index.push(0,1,0,0);weights.push(w,1-w,0,0);}}
 g.setAttribute('skinIndex',new Uint16BufferAttribute(index,4));g.setAttribute('skinWeight',new Float32BufferAttribute(weights,4));
 const proximal=new Bone(),distal=new Bone();proximal.name='right-elbow-skin-humerus';distal.name='right-elbow-skin-radius';elbow.parent.add(proximal);elbow.add(distal);
 const mesh=new SkinnedMesh(g,material);elbow.add(mesh);elbow.parent.updateWorldMatrix(true,true);
 const middle=bind?new Bone():null;if(middle){middle.name='left-elbow-skin-fold';middle.position.copy(elbow.position);elbow.parent.add(middle);elbow.parent.updateWorldMatrix(true,true);}mesh.bind(bind?new FoldedElbowSkeleton([proximal,distal,middle]):new Skeleton([proximal,distal]));if(bind){proximal.name='left-elbow-skin-humerus';distal.name='left-elbow-skin-radius';distal.quaternion.fromArray(bind.distalQuaternion);elbow.parent.updateWorldMatrix(true,true);mesh.skeleton.update();}mesh.frustumCulled=false;
 mesh.userData.continuityBinding=bind?'three-bone neutral-bind junction; middle bone follows half the elbow bend during skeleton update; export driver must be preserved':'native two-bone junction skin driven by retained rigid limb frames; whole-character export gate remains open';
 if(bind)mesh.userData.elbowPoseDriver={type:'half-bend',version:'R201',middleBone:middle.name,restDistalQuaternion:bind.distalQuaternion};
 return mesh;
}
