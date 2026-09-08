import {Vector3,Float32BufferAttribute,Triangle,Quaternion} from '../../vendor/three/three.module.min.js';
import {coupleFacingReturns} from './mrs-deltoid-heads.js';
const key=v=>v.toArray().map(x=>x.toFixed(6)).join(',');
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};

// A proximal brachioradialis insertion joins the retained radial crown.
// The boundary is cut into retained triangles before the physical-plane solve.
export function connectMrsRadialInsertion136(g,arm,side){
 const attr=g.attributes,p=attr.position,frame=g.userData.mrsSurgical126.frame,displayCrystal=attr.normal===attr.aCrystalNormal;
 const axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out),length=frame.boneLength;
 const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const xyz=v=>({x:v.dot(front),y:v.dot(axis),z:v.dot(out),t:v.dot(axis)/length});
 const nodes=[],lookup=new Map(),corners=stock.map((v,i)=>{const id=key(v);if(!lookup.has(id)){lookup.set(id,nodes.length);nodes.push({p:v.clone(),source:i});}return lookup.get(id);});
 const original=Array.from({length:p.count/3},(_,i)=>({ids:corners.slice(i*3,i*3+3),parent:i,untouched:true}));
 let faces=original.slice();
 const protectedTriangles=new Set([...g.userData.mrsForearmCrowns133.planes,...g.userData.mrsRadialBoundary135.planes].flatMap(p=>p.triangleIndices));
 const protectedKeys=new Set([...protectedTriangles].flatMap(t=>stock.slice(t*3,t*3+3).map(key)));
 const active=v=>{const q=xyz(v);return q.z>.025&&q.t>.18+1e-7&&q.t<.46-1e-7&&Math.abs(q.x)<.048;};
 const intersecting=vs=>{const q=vs.map(xyz);return q.every(p=>p.z>.025)&&Math.min(...q.map(p=>p.t))<.46&&Math.max(...q.map(p=>p.t))>.18&&Math.min(...q.map(p=>p.x))<.048&&Math.max(...q.map(p=>p.x))>-.048;};
 const cut=fn=>{
  const edges=new Map();
  for(const f of faces){const vs=f.ids.map(i=>nodes[i].p);if(!intersecting(vs))continue;
   for(let k=0;k<3;k++){
    const a=f.ids[k],b=f.ids[(k+1)%3],id=[a,b].sort((a,b)=>a-b).join(':');if(edges.has(id))continue;
    const [lo,hi]=a<b?[a,b]:[b,a],pa=nodes[lo].p,pb=nodes[hi].p,fa=fn(xyz(pa)),fb=fn(xyz(pb));
    if(fa*fb>=0||Math.abs(fa)<1e-9||Math.abs(fb)<1e-9)continue;
    const t=fa/(fa-fb);if(Math.min(t,1-t)<1e-6)continue;
    const v=pa.clone().lerp(pb,t),q=xyz(v);if(q.z<=.025||q.t<.18-1e-7||q.t>=.46-1e-7||Math.abs(q.x)>.048)continue;
    const pointKey=key(v);let index=lookup.get(pointKey);
    if(index===undefined){index=nodes.length;nodes.push({p:v});lookup.set(pointKey,index);}if(index!==a&&index!==b)edges.set(id,index);
   }
  }
  const next=[],add=(ids,f)=>{if(new Set(ids).size===3)next.push({ids,parent:f.parent,untouched:false});};
  for(const f of faces){const v=f.ids,m=v.map((a,k)=>edges.get([a,v[(k+1)%3]].sort((a,b)=>a-b).join(':'))),count=m.filter(i=>i!==undefined).length;
   if(!count){next.push(f);continue;}
   if(protectedTriangles.has(f.parent))throw new Error('M136 boundary would split retained crown '+side+' '+f.parent);
   if(count===1){const k=m.findIndex(i=>i!==undefined);add([v[k],m[k],v[(k+2)%3]],f);add([m[k],v[(k+1)%3],v[(k+2)%3]],f);}
   else if(count===2){const k=[0,1,2].find(k=>m[(k+2)%3]!==undefined&&m[k]!==undefined),a=v[(k+2)%3],b=v[k],c=v[(k+1)%3],u=m[(k+2)%3],w=m[k];add([u,b,w],f);
    if(nodes[a].p.distanceTo(nodes[w].p)<=nodes[u].p.distanceTo(nodes[c].p)){add([a,u,w],f);add([a,w,c],f);}else{add([a,u,c],f);add([u,w,c],f);}
   }else{add([v[0],m[0],m[2]],f);add([m[0],v[1],m[1]],f);add([m[2],m[1],v[2]],f);add([m[0],m[1],m[2]],f);}
  }faces=next;
 };
 // Proximal insertion widens toward the fixed M135 crown boundary.
 for(const t of [.18,.24,.30,.46])cut(q=>q.t-t);
 const width=t=>.012+.012*(t-.30)/.16;
 for(const sign of [-1,1])for(const extra of [0,.012,.020])cut(q=>sign*q.x-width(q.t)-extra);
 // Coalesce cut-only sub-micron edges and thin intersection slivers. Retained
 // source vertices win every weld; no original-original edge is collapsed.
 const representative=nodes.map((_,i)=>i),root=i=>{while(representative[i]!==i)i=representative[i];return i;};let microWelds=0;
 for(const f of faces){const vs=f.ids.map(i=>nodes[i].p),area=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).length();
  const edges=f.ids.map((a,k)=>({a,b:f.ids[(k+1)%3],length:vs[k].distanceTo(vs[(k+1)%3])})).sort((a,b)=>a.length-b.length);
  for(const e of edges){let a=root(e.a),b=root(e.b);if(a===b||nodes[a].source!==undefined&&nodes[b].source!==undefined)continue;
   if(e.length>=1.2e-6&&!(area<2e-10&&e.length<2e-5))continue;
   if(nodes[b].source!==undefined||nodes[a].source===undefined&&a>b)[a,b]=[b,a];representative[b]=a;microWelds++;break;
  }
 }
 faces=faces.map(f=>({...f,ids:f.ids.map(root)})).filter(f=>new Set(f.ids).size===3);
 // Keep the first child at its parent's index; all untouched faces and M133
 // crown indices remain exact. Additional children are appended explicitly.
 const children=Array.from({length:original.length},()=>[]);for(const f of faces)children[f.parent].push(f);
 const final=children.map(fs=>fs[0]).concat(children.flatMap(fs=>fs.slice(1))),mapping=children.map(()=>[]);
 final.forEach((f,i)=>mapping[f.parent].push(i));
 const expanded=[],weights=[];
 for(const f of final){const source=stock.slice(f.parent*3,f.parent*3+3),triangle=new Triangle(...source);
  for(let k=0;k<3;k++){const v=f.untouched?source[k].clone():nodes[f.ids[k]].p.clone();expanded.push(v);weights.push(f.untouched?[k===0?1:0,k===1?1:0,k===2?1:0]:triangle.getBarycoord(v,new Vector3()).toArray());}
 }
 const crown=q=>q.z>.025&&q.t>=.30-1e-7&&q.t<=.46+1e-7&&Math.abs(q.x)<=width(q.t)+1e-7;
 const retained=g.userData.mrsRadialBoundary135.controls;
 const offset=retained.offset+retained.crownSlope*(.46-.54)*length;
 const insertionSlope=side==='left'?.071:.090;
 const height=q=>offset+.15*q.x+insertionSlope*(q.y-.46*length);
 const targets=expanded.map(v=>{
  const q=xyz(v);if(!active(v)||protectedKeys.has(key(v)))return v.clone();
  const ax=ease((q.t-.18)/(.30-.18));
  const lateral=1-ease((Math.abs(q.x)-width(q.t))/.020);
  return v.clone().addScaledVector(out,(height(q)-q.z)*ax*lateral);
 });
 const solve=coupleFacingReturns(expanded,targets,v=>protectedKeys.has(key(v))||crown(xyz(v)),active,expanded,{normalCone:.90,lambda:.00004});
 const moved=solve.positions,oldNormals=new Map(),newNormals=new Map();
 let minimumNormalDot=1,minimumAreaRatio=1,maximumDisplacement=0;
 for(let i=0;i<expanded.length;i+=3){const a=expanded.slice(i,i+3),b=moved.slice(i,i+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));
  minimumNormalDot=Math.min(minimumNormalDot,n.clone().normalize().dot(m.clone().normalize()));minimumAreaRatio=Math.min(minimumAreaRatio,m.length()/n.length());
  for(let k=0;k<3;k++){const id=key(a[k]);if(!oldNormals.has(id)){oldNormals.set(id,new Vector3());newNormals.set(id,new Vector3());}oldNormals.get(id).add(n);newNormals.get(id).add(m);maximumDisplacement=Math.max(maximumDisplacement,a[k].distanceTo(b[k]));}
 }
 if(minimumNormalDot<.89||minimumAreaRatio<.60||maximumDisplacement>.015)throw new Error('M136 invalid rebuilt support '+JSON.stringify({side,minimumNormalDot,minimumAreaRatio,maximumDisplacement}));
 const output=Object.fromEntries(Object.keys(attr).map(k=>[k,[]])),owners=new Map(),normalNames=['normal','aSmooth','aMoldNormal','aCrystalNormal'];
 final.forEach((f,ti)=>{
  const vs=moved.slice(ti*3,ti*3+3),physical=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).normalize();
  let owner=null;if(vs.every(v=>crown(xyz(v))))owner='INSERTION';if(owner)owners.set(ti,owner);
  for(let k=0;k<3;k++){const i=ti*3+k,v=moved[i],before=expanded[i],w=weights[i],rot=new Quaternion().setFromUnitVectors(oldNormals.get(key(before)).clone().normalize(),newNormals.get(key(before)).clone().normalize()),changed=v.distanceTo(before)>1e-12;
   for(const[name,a]of Object.entries(attr)){
    let val=f.untouched?Array.from(a.array.slice((f.parent*3+k)*a.itemSize,(f.parent*3+k+1)*a.itemSize)):Array.from({length:a.itemSize},(_,j)=>w.reduce((sum,b,l)=>sum+b*a.array[(f.parent*3+l)*a.itemSize+j],0));
    if(name==='position')val=v.toArray();
    else if(name==='aPhysicalNormal'&&(!f.untouched||vs.some((v,k)=>v.distanceTo(expanded[ti*3+k])>1e-12)))val=physical.toArray();
    else if(normalNames.includes(name)&&(!f.untouched||changed)){const n=new Vector3().fromArray(val).normalize();if(changed)n.applyQuaternion(rot).normalize();val=n.toArray();}
    if(name==='aBary'&&!f.untouched)val=[k===0?1:0,k===1?1:0,k===2?1:0,val[3]];
    if(owner&&(name==='aCrystalNormal'||name==='normal'&&displayCrystal))val=physical.toArray();
    output[name].push(...val);
   }
  }
 });
 for(const[name,a]of Object.entries(attr))g.setAttribute(name,new Float32BufferAttribute(output[name],a.itemSize));
 if(displayCrystal)g.setAttribute('normal',g.attributes.aCrystalNormal);
 // Continuous return normals share one geometric displacement field. At each
 // fixed/inserted station average only the non-facing corners, keeping physical
 // crown and tendon planes as deliberately separate normal owners.
 const groups=new Map();for(let i=0;i<moved.length;i++){const id=key(moved[i]);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(i);}
 for(const ids of groups.values()){
  if(ids.some(i=>protectedKeys.has(key(expanded[i]))))continue;
  const regular=ids.filter(i=>!owners.has(Math.floor(i/3)));if(!regular.length||!ids.some(i=>!final[Math.floor(i/3)].untouched||moved[i].distanceTo(expanded[i])>1e-12))continue;
  const n=regular.reduce((v,i)=>v.add(new Vector3().fromBufferAttribute(g.attributes.aCrystalNormal,i)),new Vector3()).normalize();for(const i of regular)g.attributes.aCrystalNormal.setXYZ(i,n.x,n.y,n.z);
 }
 const lr=side==='left'?'L':'R',planes=[];
 for(const owner of ['INSERTION']){
  const triangles=[...owners].filter(([,v])=>v===owner).map(([i])=>i);if(!triangles.length)throw new Error('M136 missing physical '+owner);
  let area=0,residual=0,spread=0;const center=new Vector3(),normal=new Vector3();
  for(const t of triangles){const v=[0,1,2].map(k=>new Vector3().fromBufferAttribute(g.attributes.position,t*3+k)),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),a=n.length()/2;area+=a;normal.add(n);center.addScaledVector(v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3),a);}
  normal.normalize();center.divideScalar(area);
  for(const t of triangles){const v=[0,1,2].map(k=>new Vector3().fromBufferAttribute(g.attributes.position,t*3+k)),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();spread=Math.max(spread,n.angleTo(normal)*180/Math.PI);for(const p of v)residual=Math.max(residual,Math.abs(p.clone().sub(center).dot(normal)));for(let k=0;k<3;k++)g.attributes.aCrystalNormal.setXYZ(t*3+k,normal.x,normal.y,normal.z);}
  if(residual>2e-7||spread>.2)throw new Error('M136 non-planar '+owner+' '+JSON.stringify({residual,spread}));
  const id='MRS_FOREARM_'+lr+'_136_RADIAL_'+owner;
  planes.push({id,planeId:id,region:'FOREARM_RADIAL',side:lr,type:'widening insertion wedge',anatomicalOwner:'proximal brachioradialis attachment',triangleIndices:triangles,centerPosition:center.toArray(),averageNormal:normal.toArray(),apexDirection:axis.toArray(),area,maximumPlaneResidual:residual,maximumPhysicalNormalSpreadDegrees:spread,mirroredId:id.replace('_'+lr+'_','_'+(lr==='L'?'R':'L')+'_'),adjacentPlanes:['MRS_FOREARM_'+lr+'_135_RADIAL_CROWN'],blackPointAdjacency:[],status:'candidate; actual proof required'});
 }
 // Carry each actual facing normal through its bordering support skin. Hard
 // physical/display mismatch at a new chart edge otherwise reads as a cutout.
 const seeds=planes.map(p=>({normal:new Vector3().fromArray(p.averageNormal),points:[...new Map(p.triangleIndices.flatMap(t=>moved.slice(t*3,t*3+3).map(v=>[key(v),v]))).values()]}));
 for(const ids of groups.values()){
  const v=moved[ids[0]],t=xyz(v).t;if(t<=.18||t>=.46||ids.some(i=>protectedKeys.has(key(expanded[i]))))continue;
  const regular=ids.filter(i=>!owners.has(Math.floor(i/3)));if(!regular.length)continue;
  let weight=0,total=0;const target=new Vector3();
  for(const s of seeds){const distance=Math.min(...s.points.map(p=>p.distanceTo(v))),w=1-ease(distance/.020);if(w<=0)continue;weight=Math.max(weight,w);total+=w;target.addScaledVector(s.normal,w);}
  if(!total)continue;target.normalize();const n=new Vector3().fromBufferAttribute(g.attributes.aCrystalNormal,regular[0]).lerp(target,weight).normalize();for(const i of regular)g.attributes.aCrystalNormal.setXYZ(i,n.x,n.y,n.z);
 }
 g.userData.mrsRadialInsertion136={version:'M136',parent:'M135',side,frame,planes,oldToNewTriangles:mapping,
  refinedBaselinePositions:expanded.flatMap(v=>v.toArray()),
  microWelds,
  oldTriangleCount:original.length,triangleCount:final.length,minimumNormalDot,minimumAreaRatio,maximumDisplacement,
  controls:{insertion:[.30,.46],widthAtAttachment:.024,widthAtCrown:.048,offset,lateralSlope:.15,insertionSlope,outerDomain:[.18,.46],returnWidth:.020},
  method:'Explicit axial and taper-boundary cuts; one proximal insertion owner; coupled return solve with retained orientation cones',
  returnSolve:{freeNodes:solve.freeNodes,coreNodes:solve.coreNodes,...solve.orientationProjection},protected:'M133 and M135 physical facings and elbow/wrist seats; all other meshes'};
 g.computeBoundingBox();g.computeBoundingSphere();return g;
}
