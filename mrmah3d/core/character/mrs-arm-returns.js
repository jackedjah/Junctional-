import {Vector3,Ray,Quaternion} from '../../vendor/three/three.module.min.js';

// M90: bounded, rail-owned posterior returns in the retained M89 arm.
// Insert only anatomical boundary/centre edges, after all mass and crown fits.
// Shared edge splits are conforming; there is no smoothing or crown refit here.
export function authorMrsPosteriorReturns(g,arm,side,part='upper'){
 const fore=part==='fore',crownKey=fore?'M88':'M86';
 const source={...g.attributes},p=source.position;
 const axis=(fore?arm.wristJoint.position:arm.elbowJoint.position).clone().normalize();
 const front=new Vector3(0,0,1);if(fore)front.applyQuaternion(arm.wristJoint.quaternion);
 front.addScaledVector(axis,-front.dot(axis)).normalize();
 const out=axis.clone().cross(front).normalize();
 if(fore){const thumb=new Vector3(-1,0,0).applyQuaternion(arm.wristJoint.quaternion);if(out.dot(thumb)<0)out.negate();}
 else if(out.x*arm.shoulderJoint.position.x<0)out.negate();
 const vertices=[],lookup=new Map(),key=v=>v.toArray().map(x=>x.toFixed(7)).join(',');
 const add=v=>{const k=key(v);if(!lookup.has(k)){lookup.set(k,vertices.length);vertices.push(v);}return lookup.get(k);};
 let faces=[];
 for(let i=0;i<p.count;i+=3)faces.push({ids:[0,1,2].map(j=>add(new Vector3().fromBufferAttribute(p,i+j))),refs:[0,1,2].map(j=>[[i+j,1]]),original:i/3});
 const originalFaces=faces.map(f=>f.ids.slice()),originalVertices=vertices.map(v=>v.clone());
 const lengths=vertices.map(v=>v.dot(axis)),lo=Math.min(...lengths),hi=Math.max(...lengths),length=hi-lo;
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 // M99: distinct longitudinal forearm owners use the proven conforming
 // support-wing construction. Staggered insertions avoid a circumferential cuff.
 const rails=(fore?[
  {name:'FOREARM_RADIAL_FLEXOR',owner:'brachioradialis / flexor separation',angle:.78,t:.405,halfT:.265,width:.020,lean:.055,recess:.003,support:true},
  {name:'FOREARM_RADIAL_EXTENSOR',owner:'brachioradialis / extensor separation',angle:2.35,t:.390,halfT:.230,width:.020,lean:-.055,recess:.003,support:true},
  {name:'FOREARM_ULNAR_FLEXOR',owner:'ulnar side / flexor separation',angle:-.78,t:.495,halfT:.235,width:.017,lean:-.040,recess:.0025,support:true},
  {name:'FOREARM_ULNAR_EXTENSOR',owner:'ulnar side / extensor separation',angle:-2.35,t:.470,halfT:.250,width:.017,lean:.040,recess:.0025,support:true}
 ]:[
  {name:'POSTERIOR_DELTOID',owner:'lateral / posterior deltoid insertion',angle:2.39,t:.244,halfT:.110,width:.012,lean:-.095,recess:.0030},
  {name:'TRICEPS_HEADS',owner:'lateral / long triceps intermuscular return',angle:2.68,t:.565,halfT:.145,width:.010,lean:.035,recess:.0035},
  // M93: full neighboring muscle support surfaces. The center follows the
  // retained anatomical boundary; two broad ruled wings connect it to the
  // existing muscle flanks. This changes ownership across the space between
  // crowns, rather than deepening a narrow crease or adding a separate badge.
  {name:'ANTERIOR_LATERAL_DELTOID',owner:'anterior / lateral deltoid support boundary',angle:.75,t:.245,halfT:.132,width:.028,lean:.090,recess:.0020,support:true},
  {name:'BICEPS_BRACHIALIS',owner:'biceps / brachialis intermuscular support',angle:.70,t:.578,halfT:.193,width:.030,lean:.055,recess:.0020,support:true,version:'M104',maxDepth:.010},
  // M103: the lateral wedge needs a posterior owner as well as its biceps
  // boundary. A bounded broad return links brachialis to the triceps flank.
  {name:'BRACHIALIS_TRICEPS',owner:'brachialis / lateral triceps support',angle:1.89,t:.619,halfT:.156,width:.025,lean:-.040,recess:.0015,support:true,version:'M103'}
 ]).map(r=>({...r,facing:front.clone().multiplyScalar(Math.cos(r.angle)).addScaledVector(out,Math.sin(r.angle)),
  tangent:out.clone().multiplyScalar(Math.cos(r.angle)).addScaledVector(front,-Math.sin(r.angle)),s0:lo+r.t*length}));
 // M91: tapered belly-to-tendon lofts, anchored at both existing cross-sections.
 // A continuous ruled return avoids an isolated inset badge and perimeter cut.
 const insertions=(fore?[]:[
  {name:'POSTERIOR_DELTOID_INSERTION',owner:'posterior deltoid distal insertion',angle:3.04,t:.356,halfT:.048,width:.043,endWidth:.021},
  {name:'TRICEPS_TENDON_INSERTION',owner:'triceps tendon convergence above elbow',angle:3.10,t:.757,halfT:.058,width:.040,endWidth:.022},
  // M102: stagger the anterior and lateral cap terminations. These are broad
  // muscle-to-insertion surfaces, not another circumferential shoulder groove.
  {name:'ANTERIOR_DELTOID_INSERTION',owner:'anterior deltoid termination above biceps',angle:.08,t:.383,halfT:.071,width:.046,endWidth:.034,continuousRamp:true,maxFill:.006,blendSupport:true,version:'M102'},
  {name:'LATERAL_DELTOID_INSERTION',owner:'lateral deltoid termination above brachialis',angle:1.55,t:.396,halfT:.048,width:.052,endWidth:.022,continuousRamp:true,maxFill:.004,version:'M102'}
 ]).map(r=>({...r,lean:0,insertion:true,core:.72,
  facing:front.clone().multiplyScalar(Math.cos(r.angle)).addScaledVector(out,Math.sin(r.angle)),
  tangent:out.clone().multiplyScalar(Math.cos(r.angle)).addScaledVector(front,-Math.sin(r.angle)),s0:lo+r.t*length}));
 const coords=(v,r)=>{const s=v.dot(axis);return {t:(s-lo)/length,x:v.dot(r.tangent)-r.lean*(s-r.s0),z:v.dot(r.facing),s};};
 const edgeKey=(a,b)=>a<b?a+':'+b:b+':'+a;
 let splitEdges=0;
 const blendRefs=(a,b,t)=>{const weights=new Map();for(const [i,w]of a)weights.set(i,(weights.get(i)||0)+w*(1-t));for(const [i,w]of b)weights.set(i,(weights.get(i)||0)+w*t);return [...weights];};
 for(const rail of [...rails,...insertions]){
  const low=rail.t-rail.halfT,high=rail.t+rail.halfT;
  const taper=c=>rail.width+(rail.endWidth-rail.width)*(c.t-low)/(high-low);
  const cuts=rail.insertion?
   [...[0,.12,.5,.88,1].map(f=>c=>c.t-(low+f*(high-low))),...[-1,-.72,0,.72,1].map(f=>c=>c.x-f*taper(c))]:
   [...[-1,-.66,.66,1].map(f=>c=>c.t-(rail.t+f*rail.halfT)),...[-1,0,1].map(f=>c=>c.x-f*rail.width)];
  for(const cut of cuts){
   const edges=new Map();
   for(const face of faces)for(let k=0;k<3;k++){
    const a=face.ids[k],b=face.ids[(k+1)%3],ek=edgeKey(a,b);if(edges.has(ek))continue;
    const ca=coords(vertices[a],rail),cb=coords(vertices[b],rail),da=cut(ca),db=cut(cb);
    if(da*db>=-1e-14||Math.abs(da)<1e-8||Math.abs(db)<1e-8)continue;
    const t=da/(da-db),v=vertices[a].clone().lerp(vertices[b],t),c=coords(v,rail);
    if(c.z<.035||c.t<low-.006||c.t>high+.006||Math.abs(c.x)>rail.width+.001)continue;
    // Crossing kite constraints can almost coincide with an existing split.
    // Keep that shared vertex instead of creating a micron-scale sliver edge.
    if(rail.insertion&&Math.min(v.distanceTo(vertices[a]),v.distanceTo(vertices[b]))<.000004)continue;
    edges.set(ek,add(v));
   }
   if(!edges.size)continue;splitEdges+=edges.size;
   const next=[];
   for(const face of faces){
    let ids=face.ids.slice(),refs=face.refs.slice(),marks=ids.map((a,k)=>edges.get(edgeKey(a,ids[(k+1)%3])));
    const n=marks.filter(v=>v!==undefined).length;
    if(!n){next.push(face);continue;}
    const rotate=()=>{ids.push(ids.shift());refs.push(refs.shift());marks.push(marks.shift());};
    if(n===1){while(marks[0]===undefined)rotate();}
    else if(n===2){while(marks[0]===undefined||marks[1]===undefined)rotate();}
    const midpoint=(k)=>{const a=vertices[ids[k]],b=vertices[ids[(k+1)%3]],v=vertices[marks[k]];
     return {id:marks[k],ref:blendRefs(refs[k],refs[(k+1)%3],v.clone().sub(a).dot(b.clone().sub(a))/a.distanceToSquared(b))};};
    const v=ids.map((id,k)=>({id,ref:refs[k]})),m=marks.map((id,k)=>id===undefined?null:midpoint(k));
    const emit=vs=>next.push({ids:vs.map(v=>v.id),refs:vs.map(v=>v.ref),original:face.original});
    if(n===1){emit([v[0],m[0],v[2]]);emit([m[0],v[1],v[2]]);}
    else if(n===2){emit([v[1],m[1],m[0]]);emit([v[0],m[0],v[2]]);emit([m[0],m[1],v[2]]);}
    else{emit([v[0],m[0],m[2]]);emit([m[0],v[1],m[1]]);emit([m[2],m[1],v[2]]);emit([m[0],m[1],m[2]]);}
   }
   faces=next;
  }
 }
 // Coalesce nearly coincident boundary intersections with a manifold-safe
 // edge collapse. Skipping a cut alone misses slivers formed by later cuts.
 let mergedInsertionEdges=0;
 const coalesceConstraints=()=>{
 for(let pass=0;pass<32;pass++){
  const neighbors=new Map(),edges=new Map(),sliverEdges=new Set();
  // M94: crossing crown/support constraints can enclose a tiny triangle
  // whose shortest edge exceeds the older coincidence tolerance. Consider
  // its tiny inserted edges in length order; the shortest can be unsafe when
  // its neighboring face is collinear. Keep the first manifold-safe option.
  for(const f of faces){
   const v=f.ids.map(i=>vertices[i]);
   if(v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).length()>=2e-10)continue;
   const lengths=v.map((p,k)=>p.distanceTo(v[(k+1)%3]));
   for(let k=0;k<3;k++)if(lengths[k]<2e-5)sliverEdges.add(edgeKey(f.ids[k],f.ids[(k+1)%3]));
  }
  for(const f of faces)for(let k=0;k<3;k++){
   const a=f.ids[k],b=f.ids[(k+1)%3];
   if(!neighbors.has(a))neighbors.set(a,new Set());if(!neighbors.has(b))neighbors.set(b,new Set());
   neighbors.get(a).add(b);neighbors.get(b).add(a);
   const distance=vertices[a].distanceTo(vertices[b]);
   if((distance<.000004||sliverEdges.has(edgeKey(a,b)))&&Math.max(a,b)>=originalVertices.length)edges.set(edgeKey(a,b),{a,b,distance});
  }
  const choice=[...edges.values()].sort((a,b)=>a.distance-b.distance).find(({a,b})=>{
   if([...neighbors.get(a)].filter(i=>neighbors.get(b).has(i)).length!==2)return false;
   const keep=Math.min(a,b),drop=Math.max(a,b);
   return faces.filter(f=>f.ids.includes(drop)&&!f.ids.includes(keep)).every(f=>{
    const old=f.ids.map(i=>vertices[i]),next=f.ids.map(i=>vertices[i===drop?keep:i]);
    const n=old[1].clone().sub(old[0]).cross(old[2].clone().sub(old[0]));
    const m=next[1].clone().sub(next[0]).cross(next[2].clone().sub(next[0]));
    return m.length()>1e-10&&n.dot(m)>0;
   });
  });
  if(!choice)break;
  const keep=Math.min(choice.a,choice.b),drop=Math.max(choice.a,choice.b);
  faces=faces.map(f=>({...f,ids:f.ids.map(i=>i===drop?keep:i)})).filter(f=>new Set(f.ids).size===3);
  mergedInsertionEdges++;
 }
 };
 coalesceConstraints();
 const railSample=(rail,s,x)=>{
  // A radial ray cannot hit a triangle outside its axial/tangent projection.
  // Cache this exact broad phase once per anatomical frame. Testing the whole
  // arm for every support vertex made authoring startup exceed the renderer
  // timeout; the surviving triangles retain their exact linear surface.
  if(!rail.sampleTriangles)rail.sampleTriangles=originalFaces.map(f=>{
   const v=f.map(i=>originalVertices[i]),ss=v.map(v=>v.dot(axis)),xx=v.map(v=>v.dot(rail.tangent));
   return {v,ss,xx,zz:v.map(v=>v.dot(rail.facing)),loS:Math.min(...ss),hiS:Math.max(...ss),loX:Math.min(...xx),hiX:Math.max(...xx)};
  });
  const tx=x+rail.lean*(s-rail.s0);
  let distance=Infinity;
  for(const f of rail.sampleTriangles){
   if(s<f.loS-1e-8||s>f.hiS+1e-8||tx<f.loX-1e-8||tx>f.hiX+1e-8)continue;
   // Inclusive projected barycentrics close the numerical gap when the sample
   // lies exactly on a shared edge. Ray.intersectTriangle rejected both sides
   // of one such edge, even though neighboring samples hit the closed surface.
   const [a,b,c]=f.ss,[u,v,w]=f.xx,den=(v-w)*(a-c)+(c-b)*(u-w);
   if(Math.abs(den)<1e-14)continue;
   const wa=((v-w)*(s-c)+(c-b)*(tx-w))/den;
   const wb=((w-u)*(s-c)+(a-c)*(tx-w))/den,wc=1-wa-wb;
   if(Math.min(wa,wb,wc)<-1e-8)continue;
   const z=wa*f.zz[0]+wb*f.zz[1]+wc*f.zz[2];
   if(z>=0)distance=Math.min(distance,z);
  }
  if(!Number.isFinite(distance))throw new Error('Arm support rail missed retained surface '+JSON.stringify({rail:rail.name,side,s,x,t:(s-lo)/length}));return distance;
 };
 const oldCrownTriangles=new Set(g.userData.mrsRefinement[crownKey].planes.flatMap(p=>p.triangleIndices));
 const crownVertices=new Set(faces.filter(f=>oldCrownTriangles.has(f.original)).flatMap(f=>f.ids));
 const before=vertices.map(v=>v.clone()),moved=new Set(),ownership=new Map(),foreTargets=[];let maximumInward=0;
 for(let i=0;i<vertices.length;i++)for(const rail of rails){
  const c=coords(before[i],rail),u=(c.t-rail.t)/rail.halfT;
  if(c.z<.035||Math.abs(u)>=1||Math.abs(c.x)>=rail.width-1e-8)continue;
  if(rail.support&&crownVertices.has(i))continue;
  const left=railSample(rail,c.s,-rail.width),right=railSample(rail,c.s,rail.width);
  const cross=1-Math.abs(c.x)/rail.width,fade=1-ease((Math.abs(u)-.66)/.34);
  const chord=left+(right-left)*(c.x/rail.width+1)/2;
  // Sample the actual intermuscular boundary, not the convex hull chord.
  // A center deeper than its neighbors stays anchored. Most of the edit is
  // on the two adjacent flanks, with independently tapering longitudinal ends.
  const center=rail.support?Math.min(railSample(rail,c.s,0),(left+right)/2-rail.recess):0;
  const target=rail.support
   ?(c.x<0?left+(center-left)*(c.x/rail.width+1):center+(right-center)*(c.x/rail.width))
   :chord-rail.recess*cross;
  const depth=Math.max(0,c.z-target)*fade;
  if(!fore&&rail.version!=='M103'&&!rail.maxDepth&&depth>.011)throw new Error('Posterior return exceeded local depth envelope '+rail.name+': '+depth);
  if(fore||rail.version==='M103'||rail.maxDepth){foreTargets.push({i,rail,depth});rail.unscaledMaximum=Math.max(rail.unscaledMaximum||0,depth);continue;}
  if(depth<1e-9)continue;
  vertices[i].addScaledVector(rail.facing,-depth);moved.add(i);ownership.set(i,rail.name);maximumInward=Math.max(maximumInward,depth);
 }
 // Scale the whole forearm return, not individual vertices. This preserves
 // its ruled flow and the existing depth guard without flat-bottom clamping.
 if(fore)for(const rail of rails)rail.strength=Math.min(1,.008/(rail.unscaledMaximum||1));
 for(const rail of rails)if(rail.version==='M103')rail.strength=Math.min(1,.006/(rail.unscaledMaximum||1));
 // M104: resampling the widened crown support can increase an old rail's
 // requested depth. Bound the whole ruled surface, preserving its flow rather
 // than clipping individual vertices or relaxing the existing depth limit.
 for(const rail of rails)if(rail.maxDepth)rail.strength=Math.min(1,rail.maxDepth/(rail.unscaledMaximum||1));
 for(const {i,rail,depth}of foreTargets){
  const d=depth*rail.strength;if(d<1e-9)continue;
  vertices[i].addScaledVector(rail.facing,-d);moved.add(i);ownership.set(i,rail.name);maximumInward=Math.max(maximumInward,d);
 }
 const insertionOwner=new Map(),supportHandoffs=[];
 for(const r of insertions){
  const low=r.t-r.halfT,high=r.t+r.halfT,midWidth=(r.width+r.endWidth)/2;
  r.chart=v=>{const c=coords(v,r),u=(c.t-low)/(high-low),w=r.width+(r.endWidth-r.width)*u;
   return {u,q:Math.abs(c.x/w),v:c.x/w,c};};
  const targets=[];let maxIn=0,maxOut=0;
  for(let i=0;i<before.length;i++){
   if(crownVertices.has(i))continue;
   const v=before[i],h=r.chart(v);if(h.c.z<.035||h.u<=0||h.u>=1||h.q>=1)continue;
   const z0=railSample(r,lo+low*length,h.v*r.width);
   const zm=railSample(r,r.s0,h.v*midWidth)-(r.midReturn??.0015)*(1-h.q)*(1-h.q);
   const z1=railSample(r,lo+high*length,h.v*r.endWidth);
   // A deltoid insertion follows one continuous cap-to-belly ramp. Sampling a
   // lower middle rail here created a folded pocket and thin terminal lip.
   const target=r.continuousRamp?z0+(z1-z0)*h.u:(h.u<.5?z0+(zm-z0)*h.u*2:zm+(z1-zm)*(h.u-.5)*2);
   const blend=(1-ease((h.q-r.core)/(1-r.core)))*ease(h.u/.12)*ease((1-h.u)/.12);
   const offset=(target-h.c.z)*blend,delta=r.inwardOnly?Math.min(0,offset):offset;
   // Bound the actual movement from the existing support, including its
   // component released by the insertion. The old stock-space delta alone
   // understated outward motion in the overlap.
   const guardedDelta=r.blendSupport?delta-vertices[i].clone().sub(before[i]).dot(r.facing)*blend:delta;
   maxIn=Math.max(maxIn,-guardedDelta);maxOut=Math.max(maxOut,guardedDelta);
   targets.push({i,delta,h,blend});
  }
  // One bounded blend for the complete loft keeps its continuous rail flow.
  r.strength=Math.min(1,.010/Math.max(maxIn,1e-12),(r.maxFill??.0075)/Math.max(maxOut,1e-12));
  r.maximumInward=0;r.maximumOutward=0;r.changedVertices=0;
  for(const {i,delta,h,blend}of targets){
   // Unmoved corners still belong to an authored support surface. Excluding
   // them erased the inward-only loft's region when part of it already sat
   // below the envelope. Geometry change counts remain separate and measured.
   if(r.version==='M102')insertionOwner.set(i,{r,q:h.q,u:h.u,blend});
   const d=delta*r.strength;if(Math.abs(d)<1e-9&&!r.blendSupport)continue;
   if(r.blendSupport){
    // M112: the insertion owns its core, while its perimeter belongs to the
    // pre-existing intermuscular support. Resetting to `before` discarded the
    // complete M90 support even where the insertion weight approached zero.
    // Compose both constructions with the same continuous partition of unity.
    const support=vertices[i].clone().sub(before[i]),weight=blend*r.strength;
    vertices[i].addScaledVector(support,-weight).addScaledVector(r.facing,d);
    if(support.lengthSq()>1e-16)supportHandoffs.push({vertex:i,weight,
     supportDisplacement:support.length(),retainedSupport:support.length()*(1-weight),
     chart:{t:h.c.t,q:h.q,u:h.u},owner:r.name});
   }else vertices[i].copy(before[i]).addScaledVector(r.facing,d);
   moved.add(i);ownership.set(i,r.name);
   insertionOwner.set(i,{r,q:h.q,u:h.u,blend});r.maximumInward=Math.max(r.maximumInward,-d);
   r.maximumOutward=Math.max(r.maximumOutward,d);r.changedVertices++;
   maximumInward=Math.max(maximumInward,-d);
  }
 }
 // Recheck the final support surface: two distinct stock-space cuts may
 // become nearly coincident when projected onto the same return plane.
 // Reindex crowns and transport normals only after this local repair.
 coalesceConstraints();
 // M113: a stock edge split can become a four-triangle needle when its
 // dependent knot is independently projected onto the insertion loft.
 // Remove only that interior knot. The four perimeter vertices stay fixed,
 // and each pair of triangles becomes one facing owned by its original side.
 const insertionFans=[],fanBoundaryLocks=new Set();
 const signedVolume=()=>faces.reduce((sum,f)=>sum+vertices[f.ids[0]].dot(vertices[f.ids[1]].clone().cross(vertices[f.ids[2]]))/6,0);
 const fanVolumeBefore=fore?0:Math.abs(signedVolume());
 if(!fore){
  const r=insertions.find(r=>r.name==='ANTERIOR_DELTOID_INSERTION');
  for(let pass=0;pass<16;pass++){
   const incident=new Map();
   faces.forEach((f,fi)=>f.ids.forEach(id=>{if(!incident.has(id))incident.set(id,[]);incident.get(id).push(fi);}));
   const candidates=[];
   for(const [id,fis]of incident){
    const h=r.chart(before[id]);
    if(fis.length!==4||h.c.z<.035||h.c.t<.315||h.c.t>.425||h.q>.82||crownVertices.has(id)||fanBoundaryLocks.has(id))continue;
    const ring=[...new Set(fis.flatMap(fi=>faces[fi].ids).filter(j=>j!==id))];
    if(ring.length!==4||ring.some(j=>crownVertices.has(j)||fanBoundaryLocks.has(j)))continue;
    for(let j=0;j<ring.length;j++)for(let k=j+1;k<ring.length;k++){
     const a=ring[j],b=ring[k],edge=before[b].clone().sub(before[a]),span=edge.length();
     if(span<.008||fis.some(fi=>faces[fi].ids.includes(a)&&faces[fi].ids.includes(b)))continue;
     const u=before[id].clone().sub(before[a]).dot(edge)/(span*span);
     if(u<.04||u>.96)continue;
     const stockResidual=before[id].distanceTo(before[a].clone().lerp(before[b],u));
     if(stockResidual>1e-6)continue;
     const target=vertices[a].clone().lerp(vertices[b],u),displacement=vertices[id].distanceTo(target);
     if(displacement<.000025||displacement>.0035)continue;
     const outer=ring.filter(v=>v!==a&&v!==b),replacement=[];let valid=true;
     for(const c of outer){
      const pair=fis.filter(fi=>faces[fi].ids.includes(c));
      if(pair.length!==2||faces[pair[0]].original!==faces[pair[1]].original){valid=false;break;}
      const oldNormal=new Vector3();let oldArea=0;
      for(const fi of pair){const v=faces[fi].ids.map(i=>vertices[i]),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));oldNormal.add(n);oldArea+=n.length();}
      const perimeter=pair.flatMap(fi=>{const v=faces[fi].ids;return v.map((i,k)=>[i,v[(k+1)%3]]).filter(e=>!e.includes(id));});
      const first=perimeter[0],other=[a,b,c].find(i=>!first.includes(i)),ids=[...first,other];
      const v=ids.map(i=>vertices[i]),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
      if(n.length()<1e-9||n.dot(oldNormal)<=0||n.length()/oldArea<.85||n.length()/oldArea>1.15){valid=false;break;}
      if(!perimeter.every(([x,y])=>ids.some((i,k)=>i===x&&ids[(k+1)%3]===y))){valid=false;break;}
      const refs=ids.map(i=>{const f=faces[pair.find(fi=>faces[fi].ids.includes(i))];return f.refs[f.ids.indexOf(i)];});
      replacement.push({ids,refs,original:faces[pair[0]].original});
     }
     if(valid)candidates.push({id,fis,ring,a,b,u,stockResidual,displacement,target,replacement,t:h.c.t,q:h.q});
    }
   }
   candidates.sort((a,b)=>b.displacement-a.displacement);const c=candidates[0];if(!c)break;
   const tag=insertionFans.length,removed=new Set(c.fis);
   faces=faces.filter((_,i)=>!removed.has(i));
   faces.push(...c.replacement.map(f=>({...f,insertionFan:tag})));
   c.ring.forEach(id=>{moved.add(id);fanBoundaryLocks.add(id);});fanBoundaryLocks.add(c.id);
   insertionFans.push({removedKnot:vertices[c.id].toArray(),boundary:c.ring.map(i=>vertices[i].toArray()),
    supportEdge:[vertices[c.a].toArray(),vertices[c.b].toArray()],axialFraction:c.u,
    axialT:c.t,transverseFraction:c.q,stockResidual:c.stockResidual,maximumSurfaceChange:c.displacement,
    projectedKnot:c.target.toArray(),trianglesBefore:4,trianglesAfter:2});
  }
 }
 const fanVolumeAfter=fore?0:Math.abs(signedVolume());
 // M114: fit the facing relationship across the front/side-deltoid support.
 // Crowns are Dirichlet constraints; M113 shared boundaries are revised locally. The scalar fit
 // contracts the signed slope jump at the authored boundary, while preserving
 // the adjacent broad faces; it neither changes the seam depth nor adds cuts.
 if(!fore){
  const fit=fitMrsDeltoidBoundaryFacing(vertices,faces,{axis,front,out,lo,hi},crownVertices);
  for(const id of fit.changedIds)moved.add(id);
  fit.boundaryRevisions=fit.changedVertices.filter(v=>insertionFans.some(p=>p.boundary.some(b=>new Vector3().fromArray(b).distanceToSquared(new Vector3().fromArray(v.before))<1e-14)));
  delete fit.changedIds;
  g.userData.mrsRefinement.M114=fit;
  const owned=fitMrsOwnedDeltoidNormals(vertices,faces,{axis,front,out,lo,hi},crownVertices);
  for(const id of owned.changedIds)moved.add(id);
  delete owned.changedIds;
  g.userData.mrsRefinement.M115=owned;
 }
 const normals=vertices.map(()=>new Vector3()),stockNormals=vertices.map(()=>new Vector3()),changedFaces=new Set(),normalVertices=new Set();
 for(let i=0;i<faces.length;i++){
  const f=faces[i],vs=f.ids.map(id=>vertices[id]),n=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0]));
  const stock=f.ids.map(id=>before[id]),stockNormal=stock[1].clone().sub(stock[0]).cross(stock[2].clone().sub(stock[0]));
  for(const id of f.ids){normals[id].add(n);stockNormals[id].add(stockNormal);}
  if(f.ids.some(id=>moved.has(id))){changedFaces.add(i);for(const id of f.ids)normalVertices.add(id);}
 }
 normals.forEach(n=>n.normalize());stockNormals.forEach(n=>n.normalize());
 const rotations=normals.map((n,i)=>new Quaternion().setFromUnitVectors(stockNormals[i],n));
 // Reindex retained crown faces; only undeformed fragments retain certification.
 const crown=g.userData.mrsRefinement[crownKey];
 for(const plane of crown.planes){
  const old=new Set(plane.triangleIndices),selected=[];let area=0;const center=new Vector3();
  faces.forEach((f,i)=>{if(!old.has(f.original)||f.ids.some(id=>moved.has(id)))return;
   const vs=f.ids.map(id=>vertices[id]),a=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).length()/2;
   selected.push(i);area+=a;center.addScaledVector(vs[0].clone().add(vs[1]).add(vs[2]).multiplyScalar(1/3),a);
  });
  if(!selected.length)throw new Error('Posterior return removed entire muscle crown '+plane.planeId);
  plane.triangleIndices=selected;plane.triangles=selected.length;plane.area=area;plane.centerPosition=center.divideScalar(area).toArray();
  plane.coreVertexIndices=[...new Set(selected.flatMap(i=>faces[i].ids))];plane.status=fore?'M99 held forearm crown with authored neighboring returns':'M90 retained crown, clipped only at owned posterior return';
 }
 const arrays=Object.fromEntries(Object.keys(source).map(name=>[name,[]]));
 faces.forEach(f=>{
  const vs=f.ids.map(id=>vertices[id]),flat=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).normalize();
  for(let k=0;k<3;k++){
   const id=f.ids[k],ref=f.refs[k];
   for(const [name,attr]of Object.entries(source)){
    let values=Array.from({length:attr.itemSize},(_,j)=>ref.reduce((sum,[i,w])=>sum+attr.array[i*attr.itemSize+j]*w,0));
    if(name==='position')values=vertices[id].toArray();
    else if(name==='normal'||name==='aPhysicalNormal')values=flat.toArray();
    // Rotate the retained authored normal by the measured geometric change.
    // Replacing it outright with a tessellation average erased crown shading
    // and exposed triangles outside the narrow anatomical return.
    else if((name==='aSmooth'||name==='aMoldNormal'||name==='aCrystalNormal')&&attr.itemSize===3){
     const n=new Vector3().fromArray(values).normalize();
     if(normalVertices.has(id))n.applyQuaternion(rotations[id]);
     values=n.toArray();
    }
    arrays[name].push(...values);
   }
  }
 });
 for(const [name,values]of Object.entries(arrays)){const src=source[name];g.setAttribute(name,new src.constructor(new src.array.constructor(values),src.itemSize,src.normalized));}
 // A collapsed tiny edge may carry two interpolation histories for the same
 // physical corner. Reconcile only disagreeing copies of the transported
 // authored field; do not replace it with geometric/tessellation normals.
 let normalReconciledCorners=0;
 for(const name of ['aSmooth','aMoldNormal',...(fore?['aCrystalNormal']:[])]){
  const attr=g.attributes[name],pos=g.attributes.position,corners=new Map();
  for(let i=0;i<pos.count;i+=3){
   const vs=[0,1,2].map(k=>new Vector3().fromBufferAttribute(pos,i+k));
   const area=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).length()/2;
   for(let k=0;k<3;k++){
    const id=i+k,key=vs[k].toArray().map(v=>Math.round(v*1e6)).join(','),n=new Vector3().fromBufferAttribute(attr,id);
    if(!corners.has(key))corners.set(key,{first:n.clone(),sum:new Vector3(),ids:[],differs:false});
    const c=corners.get(key);c.ids.push(id);c.sum.addScaledVector(n,area);if(c.first.distanceTo(n)>1e-8)c.differs=true;
   }
  }
  for(const c of corners.values())if(c.differs){
   const n=c.sum.normalize();for(const i of c.ids)attr.setXYZ(i,n.x,n.y,n.z);
   if(name==='aSmooth')normalReconciledCorners++;
  }
 }
 g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.mrsRefinement.M90={version:'M90',source:'M89',method:'explicit rail/centre edge insertion after crown fitting; inward ruled return sidewalls',
  trianglesBefore:p.count/3,trianglesAfter:faces.length,splitEdges,changedVertices:moved.size,maximumInward,normalReconciledCorners,
  frame:{axis:axis.toArray(),front:front.toArray(),out:out.toArray(),axialRange:[lo,hi]},
  returns:rails.map(r=>({id:'MRS_'+r.name+'_RETURN_'+(side==='left'?'L':'R'),mirroredId:'MRS_'+r.name+'_RETURN_'+(side==='left'?'R':'L'),owner:r.owner,version:r.version||(r.support?'M93':'M90'),angle:r.angle,centerT:r.t,halfT:r.halfT,width:r.width*2,lean:r.lean,recess:r.recess,...((fore||r.version==='M103'||r.maxDepth)?{strength:r.strength,unscaledMaximum:r.unscaledMaximum,maximumDepth:r.maxDepth}:{}),
   centerPosition:axis.clone().multiplyScalar(r.s0).addScaledVector(r.facing,railSample(r,r.s0,0)-r.recess).toArray(),
   status:r.support?'M93 broad muscle-to-muscle support wings; crowns protected; not a black-point pocket':'geometric anatomical return, not a black-point pocket; sidewalls follow retained rails',triangleIndices:[...changedFaces].filter(i=>faces[i].ids.some(id=>ownership.get(id)===r.name))}))};
 g.userData.mrsRefinement.M91={version:'M91',source:'M90',method:'three-rail anchored tapered insertion lofts; no isolated inset cores',
  mergedInsertionEdges,
  frame:g.userData.mrsRefinement.M90.frame,
  planes:insertions.flatMap(r=>[0,1].map(half=>{
   const ids=[];let area=0;const center=new Vector3(),normal=new Vector3();
   faces.forEach((f,i)=>{
    const own=f.ids.map(id=>insertionOwner.get(id));
    if(!own.every(o=>o?.r===r&&o.q<=r.core+1e-7&&o.u>=.12-1e-7&&o.u<=.88+1e-7))return;
    const u=own.reduce((s,o)=>s+o.u,0)/3;if((u<.5?0:1)!==half)return;
    const vs=f.ids.map(id=>vertices[id]),n=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])),a=n.length()/2;
    ids.push(i);area+=a;normal.add(n);center.addScaledVector(vs[0].clone().add(vs[1]).add(vs[2]).multiplyScalar(1/3),a);
   });
   if(ids.length<2||area<1e-6)throw new Error('Insertion lacks readable loft family '+r.name);
   return {planeId:'MRS_'+r.name+'_'+(side==='left'?'L':'R')+(half?'_TENDON':'_BELLY_RETURN'),
    mirroredId:'MRS_'+r.name+'_'+(side==='left'?'R':'L')+(half?'_TENDON':'_BELLY_RETURN'),
    side:side==='left'?'L':'R',region:r.name,planeType:'tapered ruled return family',anatomicalOwner:r.owner,
    centerPosition:center.divideScalar(area).toArray(),averageNormal:normal.normalize().toArray(),apexDirection:axis.toArray(),
    chart:{centerT:r.t,halfT:r.halfT,angle:r.angle,proximalHalfWidth:r.width,distalHalfWidth:r.endWidth,core:r.core,half},
    area,triangles:ids.length,triangleIndices:ids,strength:r.strength,
    maximumInward:r.maximumInward,maximumOutward:r.maximumOutward,changedVertices:r.changedVertices,blackPointAdjacency:[],
    status:(r.version||'M91')+' continuous muscle-to-tendon surface family; not certified flat'};
  }))};
 g.userData.mrsRefinement.M93={version:'M93',source:'M91',
  method:'broad paired ruled muscle support wings with protected crowns and original posterior insertion profiles',
  supports:g.userData.mrsRefinement.M90.returns.filter(r=>r.version==='M93'),
  normalReconciledCorners,frame:g.userData.mrsRefinement.M90.frame};

 if(!fore)g.userData.mrsRefinement.M102={version:'M102',source:'M101',
  method:'staggered anterior/lateral deltoid insertions with continuous cap-to-belly ramps; held crowns and bounded local support fill',
  planes:g.userData.mrsRefinement.M91.planes.filter(p=>p.status.startsWith('M102')),
  insertions:insertions.filter(r=>r.version==='M102').map(r=>({name:r.name,angle:r.angle,axialRange:[r.t-r.halfT,r.t+r.halfT],
   proximalHalfWidth:r.width,distalHalfWidth:r.endWidth,strength:r.strength,maximumInward:r.maximumInward,maximumOutward:r.maximumOutward,changedVertices:r.changedVertices}))};

 if(!fore)g.userData.mrsRefinement.M112={version:'M112',source:'M110',
  method:'continuous ownership blend from existing intermuscular support into anterior deltoid insertion; extended anterior insertion rails and broader terminal support; original muscle crowns held',
  insertions:['ANTERIOR_DELTOID_INSERTION'],supportHandoffs,
  maximumRetainedSupport:Math.max(0,...supportHandoffs.map(h=>h.retainedSupport)),
  planeIds:g.userData.mrsRefinement.M91.planes.filter(p=>p.region==='ANTERIOR_DELTOID_INSERTION').map(p=>p.planeId)};

 if(!fore)g.userData.mrsRefinement.M113={version:'M113',source:'M112',
  method:'remove dependent four-face insertion knots; retain perimeter and two original facing owners',
  patches:insertionFans.map((p,j)=>({...p,triangleIndices:faces.flatMap((f,i)=>f.insertionFan===j?[i]:[])})),
  trianglesRemoved:insertionFans.length*2,authoringVolumeDelta:fanVolumeAfter-fanVolumeBefore,
  planeIds:g.userData.mrsRefinement.M112.planeIds};

 if(fore){
  const ref=g.userData.mrsRefinement;
  // The pass runs after M97 so unedited surface triangles remain exactly held.
  // Remap the existing joint-transition subset indices through local edge splits.
  for(const plane of ref.M97?.returns||[]){
    const old=new Set(plane.triangleIndices);plane.triangleIndices=[];
    faces.forEach((f,i)=>{if(old.has(f.original))plane.triangleIndices.push(i);});
    plane.triangles=plane.triangleIndices.length;
  }
  g.setAttribute('normal',g.attributes.aCrystalNormal);
  let turn=0;for(let i=0;i<g.attributes.position.count;i++)turn=Math.max(turn,
    new Vector3().fromBufferAttribute(g.attributes.aSmooth,i).angleTo(new Vector3().fromBufferAttribute(g.attributes.aCrystalNormal,i))*180/Math.PI);
  g.userData.mrsCrystal.maxTurnDegrees=turn;

  ref.M99={...ref.M90,version:'M99',source:'M98',
   method:'four continuous muscle-owned forearm return rails; conforming topology; held planar crowns',
   mergedInsertionEdges,protectedAxialBands:[[0,.14],[.73,1]],
   returns:ref.M90.returns.map(r=>({...r,version:'M99',status:'M99 geometric forearm boundary; not a black-point pocket'}))};
  delete ref.M90;delete ref.M91;delete ref.M93;
 }

}

// M100: cant the radial and extensor facing planes toward their insertion.
// The named M99 separation centres and other crowns bound each local domain.
// Displacement depends only on axial/tangent coordinates: the facing shear
// has unit Jacobian determinant and retains a real planar crown core.
function fitMrsDeltoidBoundaryFacing(vertices,faces,{axis,front,out,lo,hi},locked){
 const facing=front.clone().multiplyScalar(Math.cos(.54)).addScaledVector(out,Math.sin(.54));
 const tangent=out.clone().multiplyScalar(Math.cos(.54)).addScaledVector(front,-Math.sin(.54));
 const chart=v=>[(v.dot(axis)-lo)/(hi-lo),Math.atan2(v.dot(out),v.dot(front))];
 const active=new Set(faces.flatMap(f=>f.ids));
 const free=[...active].filter(id=>{const [t,a]=chart(vertices[id]);return !locked.has(id)&&t>.285&&t<.425&&a>.20&&a<.90;});
 const columns=new Map(free.map((id,i)=>[id,i])),count=free.length;
 const matrix=Array.from({length:count},()=>new Float64Array(count)),rhs=new Float64Array(count);
 const addRow=(row,target,weight)=>{
  for(let i=0;i<count;i++)if(row[i]){
   rhs[i]+=row[i]*target*weight*weight;
   for(let j=0;j<count;j++)if(row[j])matrix[i][j]+=row[i]*row[j]*weight*weight;
  }
 };
 const stock=vertices.map(v=>v.clone()),normals=faces.map(f=>{
  const [a,b,c]=f.ids.map(id=>stock[id]);return b.clone().sub(a).cross(c.clone().sub(a));
 });
 const grads=new Map(),edges=new Map(),targets=[];
 faces.forEach((face,fi)=>{
  face.ids.forEach((a,k)=>{const b=face.ids[(k+1)%3],key=a<b?a+':'+b:b+':'+a;if(!edges.has(key))edges.set(key,{ids:[a,b],faces:[]});edges.get(key).faces.push(fi);});
  if(!face.ids.some(id=>columns.has(id)))return;
  const v=face.ids.map(id=>stock[id]),x=v.map(p=>p.dot(axis)),y=v.map(p=>p.dot(tangent)),z=v.map(p=>p.dot(facing));
  const det=x[0]*(y[1]-y[2])+x[1]*(y[2]-y[0])+x[2]*(y[0]-y[1]);
  if(Math.abs(det)<1e-11||Math.abs(normals[fi].clone().normalize().dot(facing))<.18)return;
  const co=[[y[1]-y[2],y[2]-y[0],y[0]-y[1]],[x[2]-x[1],x[0]-x[2],x[1]-x[0]]].map(r=>r.map(c=>c/det));
  grads.set(fi,{ids:face.ids,co,h:co.map(r=>r.reduce((s,c,k)=>s+c*z[k],0)),area:Math.abs(det)/2});
 });
 for(const edge of edges.values()){
  if(edge.faces.length!==2||edge.faces.some(i=>!grads.has(i)))continue;
  const [i,j]=edge.faces,a=grads.get(i),b=grads.get(j),mid=stock[edge.ids[0]].clone().add(stock[edge.ids[1]]).multiplyScalar(.5),[t,angle]=chart(mid);
  const turn=normals[i].angleTo(normals[j])*180/Math.PI;
  const seam=t>.306&&t<.401&&angle>.30&&angle<.68&&turn>12;
  let weight=Math.sqrt(2*a.area*b.area/(a.area+b.area))/.01;
  if(turn<3)weight*=2; // keep existing broad facing fragments coherent
  if(weight<.008)continue;
  for(let dim=0;dim<2;dim++){
   const row=new Float64Array(count);
   a.ids.forEach((id,k)=>{if(columns.has(id))row[columns.get(id)]+=a.co[dim][k];});
   b.ids.forEach((id,k)=>{if(columns.has(id))row[columns.get(id)]-=b.co[dim][k];});
   addRow(row,seam?-.55*(a.h[dim]-b.h[dim]):0,weight);
  }
  if(seam)targets.push({triangleIndices:edge.faces,edgeLength:stock[edge.ids[0]].distanceTo(stock[edge.ids[1]]),beforeDegrees:turn});
 }
 for(let i=0;i<count;i++)matrix[i][i]+=(.18/.005)**2;
 for(const g of grads.values())for(let dim=0;dim<2;dim++){
  const row=new Float64Array(count);g.ids.forEach((id,k)=>{if(columns.has(id))row[columns.get(id)]+=g.co[dim][k];});
  addRow(row,0,Math.sqrt(g.area)/.01*.12);
 }
 // Area-weighted orientation target for the broad insertion facing. M114-A
 // only contracted small boundary edges and left this surface visibly folded.
 const primary=[...grads].filter(([i])=>{const c=faces[i].ids.reduce((v,id)=>v.add(stock[id]),new Vector3()).multiplyScalar(1/3),[t,a]=chart(c);return t>.31&&t<.40&&a>.30&&a<.65;});
 const primaryArea=primary.reduce((s,[i,g])=>s+g.area,0),primaryGradient=[0,1].map(d=>primary.reduce((s,[i,g])=>s+g.h[d]*g.area,0)/primaryArea);
 for(const [i,g]of primary)for(let dim=0;dim<2;dim++){
  const row=new Float64Array(count);g.ids.forEach((id,k)=>{if(columns.has(id))row[columns.get(id)]+=g.co[dim][k];});
  addRow(row,(primaryGradient[dim]-g.h[dim])*.65,Math.sqrt(g.area)/.01*1.5);
 }
 // Small, regularized normal system; pivoting avoids sensitivity to tiny faces.
 for(let k=0;k<count;k++){
  let p=k;for(let j=k+1;j<count;j++)if(Math.abs(matrix[j][k])>Math.abs(matrix[p][k]))p=j;
  [matrix[k],matrix[p]]=[matrix[p],matrix[k]];[rhs[k],rhs[p]]=[rhs[p],rhs[k]];
  if(Math.abs(matrix[k][k])<1e-12)throw new Error('M114 singular deltoid facing fit');
  for(let j=k+1;j<count;j++){
   const q=matrix[j][k]/matrix[k][k];for(let i=k;i<count;i++)matrix[j][i]-=q*matrix[k][i];rhs[j]-=q*rhs[k];
  }
 }
 const delta=new Float64Array(count);
 for(let k=count-1;k>=0;k--){let v=rhs[k];for(let j=k+1;j<count;j++)v-=matrix[k][j]*delta[j];delta[k]=v/matrix[k][k];}
 const affected=faces.flatMap((f,i)=>f.ids.some(id=>columns.has(id))?[i]:[]);
 const evaluate=strength=>{
  const point=id=>columns.has(id)?stock[id].clone().addScaledVector(facing,delta[columns.get(id)]*strength):stock[id];
  let minAreaRatio=1,maxAreaRatio=1,minAltitudeRatio=1,minNormalDot=1;
  for(const i of affected){
   const f=faces[i],[a,b,c]=f.ids.map(point),n=b.clone().sub(a).cross(c.clone().sub(a)),old=normals[i],ratio=n.length()/old.length();
   const longest=v=>Math.max(v[0].distanceTo(v[1]),v[1].distanceTo(v[2]),v[2].distanceTo(v[0]));
   minAreaRatio=Math.min(minAreaRatio,ratio);maxAreaRatio=Math.max(maxAreaRatio,ratio);
   minAltitudeRatio=Math.min(minAltitudeRatio,ratio*longest(f.ids.map(id=>stock[id]))/longest([a,b,c]));
   minNormalDot=Math.min(minNormalDot,n.normalize().dot(old.clone().normalize()));
  }
  return {minAreaRatio,maxAreaRatio,minAltitudeRatio,minNormalDot,valid:minAreaRatio>=.80&&maxAreaRatio<=1.25&&minAltitudeRatio>=.80&&minNormalDot>=.90};
 };
 const cap=Math.min(1,.003/Math.max(...delta.map(Math.abs)));let strength=cap;
 if(!evaluate(strength).valid){let low=0,high=cap;for(let i=0;i<24;i++){const m=(low+high)/2;if(evaluate(m).valid)low=m;else high=m;}strength=low*.999;}
 const checks=evaluate(strength),changedIds=free.filter(id=>Math.abs(delta[columns.get(id)]*strength)>1e-12);
 for(const id of changedIds)vertices[id].addScaledVector(facing,delta[columns.get(id)]*strength);
 const normal=i=>{const [a,b,c]=faces[i].ids.map(id=>vertices[id]);return b.clone().sub(a).cross(c.clone().sub(a));};
 for(const t of targets)t.afterDegrees=normal(t.triangleIndices[0]).angleTo(normal(t.triangleIndices[1]))*180/Math.PI;
 return {version:'M114',source:'M113',method:'constrained signed facing-gradient fit across anterior/lateral deltoid boundary; fixed crowns with controlled shared insertion boundary revision',
  owner:'front / side deltoid support above biceps',axialRange:[.285,.425],angularRange:[.20,.90],targetAxialRange:[.306,.401],targetAngularRange:[.30,.68],
  facing:facing.toArray(),slopeContraction:.55,coplanarWeight:2,primaryGradient,primaryArea,primaryTriangleIndices:primary.map(([i])=>i),primaryFacingWeight:1.5,displacementCap:.003,strength,checks,
  changedIds,changedVertices:changedIds.map(id=>({before:stock[id].toArray(),after:vertices[id].toArray(),displacement:delta[columns.get(id)]*strength})),
  fixedVertexCount:[...active].filter(id=>locked.has(id)).length,maximumDisplacement:Math.max(...delta.map(v=>Math.abs(v*strength))),
  affectedTriangleIndices:affected,targetEdges:targets,status:'candidate; crown geometry held; M113 shared boundaries revised within the explicit facing domain'};
}

// M115: separate anatomical owners and true 3D face-normal constraints.
// Cross-product derivatives remain linear for parallel vertex displacements,
// including steep return faces that the earlier chart-gradient fit excluded.
function fitMrsOwnedDeltoidNormals(vertices,faces,{axis,front,out,lo,hi},locked){
 const stock=vertices.map(v=>v.clone()),facing=front.clone().multiplyScalar(Math.cos(.54)).addScaledVector(out,Math.sin(.54));
 const insertionTangent=out.clone().multiplyScalar(Math.cos(.08)).addScaledVector(front,-Math.sin(.08));
 const chart=v=>[(v.dot(axis)-lo)/(hi-lo),Math.atan2(v.dot(out),v.dot(front))];
 const owner=v=>{const [t]=chart(v),width=.046+(.034-.046)*(t-.312)/(.454-.312);return v.dot(insertionTangent)<width?0:1;};
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const frames=faces.map(f=>{
  const [a,b,c]=f.ids.map(i=>stock[i]),cross=b.clone().sub(a).cross(c.clone().sub(a)),center=a.clone().add(b).add(c).multiplyScalar(1/3);
  return {center,cross,area:cross.length()/2,normal:cross.clone().normalize(),chart:chart(center),owner:owner(center)};
 });
 const owners=['anterior deltoid insertion toward biceps','lateral deltoid support toward brachialis'].map((name,o)=>({name,
  anchors:[[.265,.295],[.425,.455]].map(([low,high])=>{
   const ids=frames.flatMap((f,i)=>f.chart[0]>low&&f.chart[0]<high&&f.chart[1]>.2&&f.chart[1]<1.05&&f.owner===o?[i]:[]);
   if(!ids.length)throw new Error('M115 missing intact anatomical anchor '+name);
   const n=ids.reduce((v,i)=>v.add(frames[i].cross),new Vector3()).normalize();
   return {axialRange:[low,high],triangleIndices:ids,averageNormal:n.toArray(),surfaceArea:ids.reduce((s,i)=>s+frames[i].area,0)};
  }),triangleIndices:[],surfaceArea:0,beforeError:0,afterError:0}));
 const active=new Set(faces.flatMap(f=>f.ids)),free=[...active].filter(i=>{const [t,a]=chart(stock[i]);return !locked.has(i)&&t>.285&&t<.435&&a>.2&&a<1.05;});
 const columns=new Map(free.map((id,i)=>[id,i])),count=free.length;
 const matrix=Array.from({length:count},()=>new Float64Array(count)),rhs=new Float64Array(count),primary=[];
 const addRow=(row,target,weight)=>{for(let i=0;i<count;i++)if(row[i]){rhs[i]+=row[i]*target*weight*weight;for(let j=0;j<count;j++)if(row[j])matrix[i][j]+=row[i]*row[j]*weight*weight;}};
 const affected=[];
 faces.forEach((face,i)=>{
  if(!face.ids.some(id=>columns.has(id)))return;affected.push(i);
  const f=frames[i],[t,a]=f.chart;
  const weight=ease((t-.285)/.025)*ease((.435-t)/.025)*ease((a-.2)/.1)*ease((1.05-a)/.15);
  const anchors=owners[f.owner].anchors,u=Math.max(0,Math.min(1,(t-.28)/(.44-.28)));
  const guide=new Vector3().fromArray(anchors[0].averageNormal).lerp(new Vector3().fromArray(anchors[1].averageNormal),u).normalize();
  const target=f.normal.clone().lerp(guide,.65*weight).normalize();
  const b1=target.clone().cross(axis).normalize(),b2=target.clone().cross(b1).normalize();
  const [p,q,r]=face.ids.map(id=>stock[id]),jac=[facing.clone().cross(q.clone().sub(r)),facing.clone().cross(r.clone().sub(p)),facing.clone().cross(p.clone().sub(q))];
  for(const b of [b1,b2]){
   const row=new Float64Array(count);face.ids.forEach((id,k)=>{if(columns.has(id))row[columns.get(id)]+=jac[k].dot(b)/(2*f.area);});
   addRow(row,-f.normal.dot(b),Math.sqrt(f.area)/.01);
  }
  if(weight>.6){primary.push({triangle:i,owner:f.owner,guide});const o=owners[f.owner];o.triangleIndices.push(i);o.surfaceArea+=f.area;o.beforeError+=f.area*f.normal.angleTo(guide)*180/Math.PI;}
 });
 // M115-B: cuts inside one original source face must not become alternating
 // raised strips. Couple their 3D normal responses within each anatomical owner.
 const edgeMap=new Map(),coherentEdges=[];
 faces.forEach((f,i)=>f.ids.forEach((a,k)=>{const b=f.ids[(k+1)%3],key=a<b?a+':'+b:b+':'+a;if(!edgeMap.has(key))edgeMap.set(key,[]);edgeMap.get(key).push(i);}));
 const affectedSet=new Set(affected);
 const derivative=i=>{const [p,q,r]=faces[i].ids.map(id=>stock[id]);return [facing.clone().cross(q.clone().sub(r)),facing.clone().cross(r.clone().sub(p)),facing.clone().cross(p.clone().sub(q))].map(v=>v.divideScalar(2*frames[i].area));};
 for(const pair of edgeMap.values()){
  if(pair.length!==2)continue;const [i,j]=pair;
  if(!affectedSet.has(i)||!affectedSet.has(j)||faces[i].original!==faces[j].original||frames[i].owner!==frames[j].owner)continue;
  const a=frames[i],b=frames[j],da=derivative(i),db=derivative(j),weight=Math.sqrt(2*a.area*b.area/(a.area+b.area))/.01*4;
  for(let dim=0;dim<3;dim++){
   const row=new Float64Array(count);
   faces[i].ids.forEach((id,k)=>{if(columns.has(id))row[columns.get(id)]+=da[k].getComponent(dim);});
   faces[j].ids.forEach((id,k)=>{if(columns.has(id))row[columns.get(id)]-=db[k].getComponent(dim);});
   addRow(row,-a.normal.getComponent(dim)+b.normal.getComponent(dim),weight);
  }
  coherentEdges.push({triangleIndices:pair,owner:a.owner,sourceFace:faces[i].original,beforeDegrees:a.normal.angleTo(b.normal)*180/Math.PI});
 }
 for(let i=0;i<count;i++)matrix[i][i]+=(.06/.005)**2;
 for(let k=0;k<count;k++){
  let p=k;for(let j=k+1;j<count;j++)if(Math.abs(matrix[j][k])>Math.abs(matrix[p][k]))p=j;
  [matrix[k],matrix[p]]=[matrix[p],matrix[k]];[rhs[k],rhs[p]]=[rhs[p],rhs[k]];
  if(Math.abs(matrix[k][k])<1e-12)throw new Error('M115 singular anatomical normal fit');
  for(let j=k+1;j<count;j++){const q=matrix[j][k]/matrix[k][k];for(let i=k;i<count;i++)matrix[j][i]-=q*matrix[k][i];rhs[j]-=q*rhs[k];}
 }
 const delta=new Float64Array(count);for(let k=count-1;k>=0;k--){let v=rhs[k];for(let j=k+1;j<count;j++)v-=matrix[k][j]*delta[j];delta[k]=v/matrix[k][k];}
 const cap=Math.min(1,.004/Math.max(...delta.map(Math.abs)));
 const evaluate=strength=>{
  const point=id=>columns.has(id)?stock[id].clone().addScaledVector(facing,delta[columns.get(id)]*strength):stock[id];
  let minimumAreaRatio=1,maximumAreaRatio=1,minimumAltitudeRatio=1,minimumNormalDot=1;
  const longest=v=>Math.max(v[0].distanceTo(v[1]),v[1].distanceTo(v[2]),v[2].distanceTo(v[0]));
  for(const i of affected){const vv=faces[i].ids.map(point),n=vv[1].clone().sub(vv[0]).cross(vv[2].clone().sub(vv[0])),ratio=n.length()/(2*frames[i].area);
   minimumAreaRatio=Math.min(minimumAreaRatio,ratio);maximumAreaRatio=Math.max(maximumAreaRatio,ratio);minimumNormalDot=Math.min(minimumNormalDot,n.normalize().dot(frames[i].normal));
   minimumAltitudeRatio=Math.min(minimumAltitudeRatio,ratio*longest(faces[i].ids.map(id=>stock[id]))/longest(vv));
  }
  return {minimumAreaRatio,maximumAreaRatio,minimumAltitudeRatio,minimumNormalDot,valid:minimumAreaRatio>=.8&&maximumAreaRatio<=1.25&&minimumAltitudeRatio>=.8&&minimumNormalDot>=.9};
 };
 let strength=cap;
 if(!evaluate(strength).valid){let low=0,high=cap;for(let i=0;i<24;i++){const m=(low+high)/2;if(evaluate(m).valid)low=m;else high=m;}strength=low*.999;}
 const checks=evaluate(strength),changedIds=free.filter(id=>Math.abs(delta[columns.get(id)]*strength)>1e-12);
 for(const id of changedIds)vertices[id].addScaledVector(facing,delta[columns.get(id)]*strength);
 for(const p of primary){const vv=faces[p.triangle].ids.map(id=>vertices[id]),n=vv[1].clone().sub(vv[0]).cross(vv[2].clone().sub(vv[0])).normalize();owners[p.owner].afterError+=frames[p.triangle].area*n.angleTo(p.guide)*180/Math.PI;}
 for(const o of owners){o.beforeError/=o.surfaceArea;o.afterError/=o.surfaceArea;}
 for(const e of coherentEdges){const nn=e.triangleIndices.map(i=>{const [a,b,c]=faces[i].ids.map(id=>vertices[id]);return b.clone().sub(a).cross(c.clone().sub(a)).normalize();});e.afterDegrees=nn[0].angleTo(nn[1])*180/Math.PI;}
 return {version:'M115',source:'M114',method:'two insertion-chart anatomical owners; intact section anchors; true-surface-area 3D normal fitting including steep return faces',
  ownerBoundary:'retained anterior insertion outer rail: angle .08, width .046 to .034 along t .312 to .454',
  axialRange:[.285,.435],angularRange:[.2,1.05],facing:facing.toArray(),normalBlend:.65,displacementCap:.004,strength,checks,owners,coherentEdges,coherenceWeight:4,
  changedIds,changedVertices:changedIds.map(id=>({before:stock[id].toArray(),after:vertices[id].toArray(),displacement:delta[columns.get(id)]*strength})),
  maximumDisplacement:Math.max(...delta.map(v=>Math.abs(v*strength))),affectedTriangleIndices:affected,
  status:'candidate; distinct anatomical return directions, fixed crown positions and topology'};
}

export function authorMrsForearmCrownFlow(g,arm,side){
 const ref=g.userData.mrsRefinement,p=g.attributes.position;
 const axis=new Vector3().fromArray(ref.M88.frame.axis),front=new Vector3().fromArray(ref.M88.frame.front),out=new Vector3().fromArray(ref.M88.frame.out);
 const [lo,hi]=ref.M99.frame.axialRange,length=hi-lo,at=i=>new Vector3().fromBufferAttribute(p,i);
 const stock=Array.from({length:p.count},(_,i)=>at(i));
 const stockNormals=Object.fromEntries(['aSmooth','aMoldNormal','aCrystalNormal'].map(k=>[k,g.attributes[k].clone()]));
 const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const hull=points=>{
  const list=[...new Map(points.map(p=>[p.map(v=>v.toFixed(10)).join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const lower=[],upper=[];for(const p of list){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=1e-13)lower.pop();lower.push(p);}
  for(const p of list.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=1e-13)upper.pop();upper.push(p);}
  return lower.slice(0,-1).concat(upper.slice(0,-1));
 };
 const distance=(poly,s,x)=>{
  let inside=true,best=Infinity;
  for(let j=0;j<poly.length;j++){
   const a=poly[j],b=poly[(j+1)%poly.length],ds=b[0]-a[0],dx=b[1]-a[1],l2=ds*ds+dx*dx;
   if(cross(a,b,[s,x])< -1e-11)inside=false;
   const u=Math.max(0,Math.min(1,((s-a[0])*ds+(x-a[1])*dx)/l2));best=Math.min(best,Math.hypot(s-a[0]-u*ds,x-a[1]-u*dx));
  }
  return inside?0:best;
 };
 const seamVertices=[];
 for(const r of ref.M99.returns){
  const f=front.clone().multiplyScalar(Math.cos(r.angle)).addScaledVector(out,Math.sin(r.angle));
  const tangent=out.clone().multiplyScalar(Math.cos(r.angle)).addScaledVector(front,-Math.sin(r.angle)),s0=lo+r.centerT*length;
  for(let i=0;i<stock.length;i++){
   const v=stock[i],s=v.dot(axis),t=(s-lo)/length,x=v.dot(tangent)-r.lean*(s-s0);
   if(v.dot(f)>.035&&Math.abs(x)<1e-7&&Math.abs(t-r.centerT)<r.halfT+1e-7)seamVertices.push(i);
  }
 }
 const models=[];
 for(const [name,drop]of [['FOREARM_RADIAL',.008],['FOREARM_EXTENSOR',.010]]){
  const plane=ref.M88.planes.find(p=>p.planeId==='MRS_'+name+'_'+(side==='left'?'L':'R'));
  const angle=plane.chart.angle,facing=front.clone().multiplyScalar(Math.cos(angle)).addScaledVector(out,Math.sin(angle));
  const tangent=out.clone().multiplyScalar(Math.cos(angle)).addScaledVector(front,-Math.sin(angle));
  const ids=[...new Set(plane.triangleIndices.flatMap(i=>[i*3,i*3+1,i*3+2]))],coords=ids.map(i=>[stock[i].dot(axis),stock[i].dot(tangent)]),poly=hull(coords);
  const minS=Math.min(...coords.map(p=>p[0])),maxS=Math.max(...coords.map(p=>p[0]));
  if(poly.length<3||maxS-minS<.015)throw new Error('M100 crown has no longitudinal support '+name);
  const protectedIds=[...seamVertices,...ref.M88.planes.filter(p=>p!==plane).flatMap(p=>p.triangleIndices.flatMap(i=>[i*3,i*3+1,i*3+2]))];
  let margin=Infinity;
  for(const i of protectedIds){const v=stock[i];if(v.dot(facing)<.035)continue;margin=Math.min(margin,distance(poly,v.dot(axis),v.dot(tangent)));}
  if(margin<.0003)throw new Error('M100 crown overlaps a protected muscle boundary '+name+' '+margin);
  const collar=Math.min(.014,margin*.72);
  const delta=(s,x)=>{
   const d=distance(poly,s,x);if(d>=collar)return 0;
   const u=d/collar,w=1-u*u*(3-2*u);
   return Math.max(0,.0015+drop*(s-minS)/(maxS-minS))*w;
  };
  let maximum=0;for(const v of stock)if(v.dot(facing)>.035)maximum=Math.max(maximum,delta(v.dot(axis),v.dot(tangent)));
  const strength=Math.min(1,.012/(maximum||1));
  models.push({name,plane,facing,tangent,poly,minS,maxS,collar,margin,delta,strength,drop,maximum:maximum*strength,changed:0});
 }
 let maximumDisplacement=0;
 const epsilon=1e-6;
 for(let i=0;i<p.count;i++){
  const before=stock[i],next=before.clone();
  const fields=['aSmooth','aMoldNormal','aCrystalNormal'].map(k=>[k,new Vector3().fromBufferAttribute(g.attributes[k],i)]);
  for(const m of models){
   if(next.dot(m.facing)<.035)continue;const s=next.dot(axis),x=next.dot(m.tangent),d=m.delta(s,x)*m.strength;if(d<1e-12)continue;
   const ds=(m.delta(s+epsilon,x)-m.delta(s-epsilon,x))*m.strength/(2*epsilon),dx=(m.delta(s,x+epsilon)-m.delta(s,x-epsilon))*m.strength/(2*epsilon);
   const gradient=axis.clone().multiplyScalar(ds).addScaledVector(m.tangent,dx);
   for(const [k,n]of fields)n.addScaledVector(gradient,n.dot(m.facing)).normalize();
   next.addScaledVector(m.facing,-d);m.changed++;
  }
  p.setXYZ(i,next.x,next.y,next.z);maximumDisplacement=Math.max(maximumDisplacement,before.distanceTo(next));
  for(const [k,n]of fields)g.attributes[k].setXYZ(i,n.x,n.y,n.z);
 }
 // M101: keep the accepted M100 crown targets, but replace the short radial
 // falloff collar with a positive, longitudinally weighted surface extension.
 // The Dirichlet boundary is actual anatomy: crown cores, return centres and
 // the elbow/wrist support limits. No Laplacian smoothing of the base mesh.
 const baseline=Array.from({length:p.count},(_,i)=>at(i));
 const nodeMap=new Map(),nodes=[],vertexNodes=[];
 for(let i=0;i<stock.length;i++){
  const key=stock[i].toArray().map(v=>v.toFixed(7)).join(',');
  if(!nodeMap.has(key)){nodeMap.set(key,nodes.length);nodes.push({v:stock[i],copies:[],neighbors:new Map()});}
  const j=nodeMap.get(key);vertexNodes.push(j);nodes[j].copies.push(i);
 }
 const fixed=new Set([...seamVertices,...ref.M88.planes.flatMap(c=>c.triangleIndices.flatMap(i=>[i*3,i*3+1,i*3+2]))].map(i=>vertexNodes[i]));
 const supportWidth=.040;
 for(const n of nodes){
  const s=n.v.dot(axis),t=(s-lo)/length;
  n.active=t>.12&&t<.76&&models.some(m=>n.v.dot(m.facing)>.035&&distance(m.poly,s,n.v.dot(m.tangent))<supportWidth);
  n.fixed=fixed.has(vertexNodes[n.copies[0]])||!n.active;
  n.offset=baseline[n.copies[0]].clone().sub(n.v);
 }
 // Positive mean-value weights remain bounded on the inherited skinny support
 // triangles. Axial weighting carries the insertion along the muscle instead
 // of creating another ring around its crown.
 for(let i=0;i<stock.length;i+=3)for(let corner=0;corner<3;corner++){
  const a=vertexNodes[i+corner],b=vertexNodes[i+(corner+1)%3],c=vertexNodes[i+(corner+2)%3];
  const ab=nodes[b].v.clone().sub(nodes[a].v),ac=nodes[c].v.clone().sub(nodes[a].v);
  const angle=ab.angleTo(ac),half=Math.tan(Math.min(Math.PI-1e-5,angle)/2);
  for(const [j,e]of [[b,ab],[c,ac]]){
   const length=e.length(),axial=e.dot(axis)/(length||1);
   const w=half*(1+2*axial*axial)/Math.max(length,1e-7);
   nodes[a].neighbors.set(j,(nodes[a].neighbors.get(j)||0)+w);
  }
 }
 let iterations=0,residual=Infinity;
 for(;iterations<1600&&residual>1e-10;iterations++){
  residual=0;
  for(const n of nodes){
   if(n.fixed)continue;const q=new Vector3();let total=0;
   for(const [j,w]of n.neighbors){q.addScaledVector(nodes[j].offset,w);total+=w;}
   q.divideScalar(total||1);residual=Math.max(residual,q.distanceTo(n.offset));n.offset.copy(q);
  }
 }
 if(residual>1e-7)throw new Error('M101 support extension did not converge '+residual);
 const oldNormals=nodes.map(()=>new Vector3()),newNormals=nodes.map(()=>new Vector3());
 let changedCopies=0,maxRevision=0;
 for(let i=0;i<p.count;i++){
  const n=nodes[vertexNodes[i]],q=n.fixed?baseline[i]:stock[i].clone().add(n.offset);
  p.setXYZ(i,q.x,q.y,q.z);const revision=baseline[i].distanceTo(at(i));
  if(revision>1e-8)changedCopies++;maxRevision=Math.max(maxRevision,revision);
 }
 // The remaining side lobe belongs to the proximal radial mass, outside the
 // crown collar. Give it its own elbow-to-belly envelope. The same inward-only
 // rule on both sides preserves already lean sections and never expands them.
 const loftStock=Array.from({length:p.count},(_,i)=>at(i));
 const crownIndices=new Set(ref.M88.planes.flatMap(c=>c.triangleIndices.flatMap(i=>[i*3,i*3+1,i*3+2])));
 const loftStart=.025,loftEnd=Math.min(.130,Math.min(...[...crownIndices].map(i=>stock[i].dot(axis)))-.004);
 const radiusAt=(s,dir)=>{
  const ray=new Ray(axis.clone().multiplyScalar(s),dir);let hit=Infinity;
  for(let i=0;i<loftStock.length;i+=3){const v=ray.intersectTriangle(loftStock[i],loftStock[i+1],loftStock[i+2],false,new Vector3());if(v)hit=Math.min(hit,v.distanceTo(ray.origin));}
  return hit;
 };
 const loftSamples=new Map(),loftChanged=[];let maxLoftReduction=0;
 for(let i=0;i<p.count;i++){
  const v=loftStock[i],s=v.dot(axis);if(s<=loftStart||s>=loftEnd||crownIndices.has(i))continue;
  const angle=Math.atan2(v.dot(out),v.dot(front)),a=Math.abs(Math.atan2(Math.sin(angle-Math.PI/2),Math.cos(angle-Math.PI/2)));
  if(a>=1.20)continue;const taper=Math.max(0,(a-.65)/.55),angular=1-taper*taper*(3-2*taper);
  const dir=front.clone().multiplyScalar(Math.cos(angle)).addScaledVector(out,Math.sin(angle)),key=angle.toFixed(7);
  if(!loftSamples.has(key))loftSamples.set(key,[radiusAt(loftStart,dir),radiusAt(loftEnd,dir)]);
  const [r0,r1]=loftSamples.get(key);if(!Number.isFinite(r0+r1))throw new Error('M101 proximal support section is open');
  const u=(s-loftStart)/(loftEnd-loftStart),envelope=r0*(1-u)+r1*u+.06*Math.min(r0,r1)*Math.sin(Math.PI*u);
  const excess=Math.max(0,v.dot(dir)-envelope),reduction=Math.min(.040,excess*excess/(excess+.002))*angular;
  if(reduction<1e-10)continue;const next=v.clone().addScaledVector(dir,-reduction);
  p.setXYZ(i,next.x,next.y,next.z);loftChanged.push(i);maxLoftReduction=Math.max(maxLoftReduction,reduction);
 }
 for(let i=0;i<p.count;i+=3){
  const a=stock[i],b=stock[i+1],c=stock[i+2],na=b.clone().sub(a).cross(c.clone().sub(a));
  const x=at(i),y=at(i+1),z=at(i+2),nb=y.sub(x).cross(z.sub(x));
  for(let k=0;k<3;k++){oldNormals[vertexNodes[i+k]].add(na);newNormals[vertexNodes[i+k]].add(nb);}
 }
 const rotations=nodes.map((n,i)=>new Quaternion().setFromUnitVectors(oldNormals[i].normalize(),newNormals[i].normalize()));
 for(let i=0;i<p.count;i++)for(const [k,source]of Object.entries(stockNormals)){
  const n=new Vector3().fromBufferAttribute(source,i).applyQuaternion(rotations[vertexNodes[i]]).normalize();
  g.attributes[k].setXYZ(i,n.x,n.y,n.z);
 }
 ref.M101={version:'M101',source:'M100',method:'positive mean-value Dirichlet extension of retained crown offsets on existing muscle topology',
  supportWidth,axialWeight:2,iterations,residual,changedVertexCopies:changedCopies,maximumRevision:maxRevision,
  fixedNodeCount:nodes.filter(n=>n.fixed).length,freeNodeCount:nodes.filter(n=>!n.fixed).length,
  protectedCrownAndSeamIndices:[...fixed].flatMap(j=>nodes[j].copies).filter(i=>!loftChanged.includes(i)),
  proximalLoft:{axialRange:[loftStart,loftEnd],centerAngle:Math.PI/2,innerHalfAngle:.65,outerHalfAngle:1.20,
   maximumReduction:maxLoftReduction,changedVertexCopies:loftChanged.length,changedIndices:loftChanged,
   method:'inward-only radial support envelope between retained elbow and belly sections; seam depth is not increased'},
  status:'support transition candidate; geometry and visual validation required'};
 // Physical normals stay separate from the active authored crystal normal.
 const normal=g.attributes.normal.clone();g.setAttribute('normal',normal);g.computeVertexNormals();
 g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',g.attributes.aCrystalNormal);
 for(const a of Object.values(g.attributes))a.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
 const measure=plane=>{
  let area=0;const normal=new Vector3(),center=new Vector3();
  for(const i of plane.triangleIndices){const v=[at(i*3),at(i*3+1),at(i*3+2)],n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),a=n.length()/2;area+=a;normal.add(n);center.addScaledVector(v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3),a);}
  normal.normalize();center.divideScalar(area);let residual=0,spread=0;
  for(const i of plane.triangleIndices){const v=[at(i*3),at(i*3+1),at(i*3+2)],n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();spread=Math.max(spread,n.angleTo(normal)*180/Math.PI);for(const q of v)residual=Math.max(residual,Math.abs(q.clone().sub(center).dot(normal)));}
  Object.assign(plane,{area,centerPosition:center.toArray(),averageNormal:normal.toArray(),maximumResidual:residual,maximumNormalSpreadDegrees:spread});
 };
 for(const m of models){measure(m.plane);m.plane.status='M101 retained tapered crown with extended anatomical support';m.plane.geometryVersion='M101';}
 for(const p of ref.M97?.returns||[])measure(p);
 let maxTurn=0;for(let i=0;i<p.count;i++)maxTurn=Math.max(maxTurn,new Vector3().fromBufferAttribute(g.attributes.aSmooth,i).angleTo(new Vector3().fromBufferAttribute(g.attributes.aCrystalNormal,i))*180/Math.PI);
 g.userData.mrsCrystal.maxTurnDegrees=maxTurn;
 ref.M100={version:'M100',source:'M99',method:'independent axial/tangent crown-facing shears; fixed seam centres and other crowns',
  maximumDisplacement,seamVertexCopies:seamVertices.length,protectedSeamIndices:seamVertices,unitJacobianDeterminant:true,
  crowns:models.map(m=>({planeId:m.plane.planeId,collarWidth:m.collar,seamMargin:m.margin,axialRange:[m.minS,m.maxS],drop:m.drop,strength:m.strength,
   maximumDisplacement:m.maximum,changedVertexCopies:m.changed,footprint:m.poly,frame:{axis:axis.toArray(),tangent:m.tangent.toArray(),facing:m.facing.toArray()}}))};
}
