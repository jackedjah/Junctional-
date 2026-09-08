import {Vector3,Float32BufferAttribute} from '../../vendor/three/three.module.min.js';

// M125 revised method: continuous thigh field sampled from retained anatomy.
// The rejected inset crown is archived in evidence/M125, never used here.
export function rebuildMrsQuadCrown(g,{sides=[-1]}={}){
 const attr=g.attributes,stock=attr.position,point=i=>new Vector3().fromBufferAttribute(stock,i);
 const key=v=>v.toArray().map(x=>x.toFixed(6)).join(','),nodes=[],lookup=new Map(),corners=[];
 for(let i=0;i<stock.count;i++){const v=point(i),k=key(v);if(!lookup.has(k)){lookup.set(k,nodes.length);nodes.push({p:v,source:i});}corners.push(lookup.get(k));}
 const faces=Array.from({length:stock.count/3},(_,i)=>({ids:corners.slice(i*3,i*3+3),old:i,owner:null}));
 let work=faces.slice();const reports=[],removed=new Set(),added=[];
 const sampleXY=(x,y)=>{
  let best;for(const f of faces){const[a,b,c]=f.ids.map(i=>nodes[i].p);if(Math.min(a.z,b.z,c.z)<=0||x<Math.min(a.x,b.x,c.x)-1e-7||x>Math.max(a.x,b.x,c.x)+1e-7||y<Math.min(a.y,b.y,c.y)-1e-7||y>Math.max(a.y,b.y,c.y)+1e-7)continue;
   const d=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(d)<1e-14)continue;
   const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/d,v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/d,w=1-u-v;if(Math.min(u,v,w)<-1e-6)continue;
   const z=u*a.z+v*b.z+w*c.z;if(!best||z>best.z)best={z,old:f.old,weights:[u,v,w]};
  }if(!best)throw new Error('M125 chart outside surface '+[x,y]);return best;
 };
 const makePoint=(v,retained=false)=>{const id=nodes.length;nodes.push({p:v,interpolation:sampleXY(v.x,v.y),retained});return id;};
 for(const sign of sides){
  const side=sign<0?'L':'R',spec={x:.19,y:1.195,w:.19,h:.285,flow:.23,radius:.84,stations:[-1,-.45,.45,1]};
  const uv=p=>[(sign*p.x-spec.x-spec.flow*(p.y-spec.y))/spec.w,(p.y-spec.y)/spec.h];
  const xy=(u,v)=>[sign*(spec.x+spec.w*u+spec.flow*spec.h*v),spec.y+spec.h*v];
  const sample=(u,v)=>sampleXY(...xy(u,v));
  const make=(u,v,z)=>{const[x,y]=xy(u,v);return makePoint(new Vector3(x,y,z));};
  // Cut a real convex chart perimeter. Split incident triangles consistently;
  // every split remains on its original triangle, preserving the outer surface.
  const cut=fn=>{
   const edges=new Map();for(const f of work){const p=f.ids.map(i=>nodes[i].p);if(p.some(v=>v.z<=0))continue;const q=p.map(uv);
    if(Math.min(...q.map(v=>v[0]))>1.08||Math.max(...q.map(v=>v[0]))< -1.08||Math.min(...q.map(v=>v[1]))>1.08||Math.max(...q.map(v=>v[1]))< -1.08)continue;
    for(let k=0;k<3;k++){const a=f.ids[k],b=f.ids[(k+1)%3],key=a<b?a+':'+b:b+':'+a;if(edges.has(key))continue;const pa=nodes[a].p,pb=nodes[b].p,fa=fn(...uv(pa)),fb=fn(...uv(pb));if(fa*fb>=0||Math.abs(fa)<1e-8||Math.abs(fb)<1e-8)continue;const t=fa/(fa-fb);if(Math.min(t,1-t)<1e-7)continue;edges.set(key,makePoint(pa.clone().lerp(pb,t),true));}
   }
   const next=[];const add=(ids,f)=>next.push({ids,old:-1,parent:f.old>=0?f.old:f.parent,owner:null});
   for(const f of work){const m=f.ids.map((a,k)=>{const b=f.ids[(k+1)%3];return edges.get(a<b?a+':'+b:b+':'+a);}),n=m.filter(i=>i!==undefined).length;
    if(!n){next.push(f);continue;}const v=f.ids;
    if(n===1){const k=m.findIndex(i=>i!==undefined);add([v[k],m[k],v[(k+2)%3]],f);add([m[k],v[(k+1)%3],v[(k+2)%3]],f);}
    else if(n===2){const k=[0,1,2].find(k=>m[(k+2)%3]!==undefined&&m[k]!==undefined),a=v[(k+2)%3],b=v[k],c=v[(k+1)%3],u=m[(k+2)%3],w=m[k];add([u,b,w],f);
     if(nodes[a].p.distanceTo(nodes[w].p)<=nodes[u].p.distanceTo(nodes[c].p)){add([a,u,w],f);add([a,w,c],f);}else{add([a,u,c],f);add([u,w,c],f);}
    }else{add([v[0],m[0],m[2]],f);add([m[0],v[1],m[1]],f);add([m[2],m[1],v[2]],f);add([m[0],m[1],m[2]],f);}
   }work=next;
  };
  for(const a of [-1,1])for(const b of [-1,1])cut((u,v)=>a*u+b*v-1);
  // Every facing-cell boundary must have a corresponding outer station so
  // a collar segment cannot bridge over a grid corner and create a T-junction.
  for(const t of [-.725,-.275,.275,.725]){cut((u,v)=>u-t);cut((u,v)=>v-t);}
  const patch=work.filter(f=>{const p=f.ids.map(i=>nodes[i].p);if(p.some(v=>v.z<=0))return false;const q=uv(p.reduce((v,p)=>v.add(p),new Vector3()).multiplyScalar(1/3));return Math.abs(q[0])+Math.abs(q[1])<1-1e-7;});
  const edgeMap=new Map();for(const f of patch)for(let k=0;k<3;k++){const a=f.ids[k],b=f.ids[(k+1)%3],key=a<b?a+':'+b:b+':'+a,e=edgeMap.get(key)||{a,b,count:0};e.count++;edgeMap.set(key,e);}
  const boundary=[...edgeMap.values()].filter(e=>e.count===1),next=new Map(boundary.map(e=>[e.a,e.b]));
  const ring=[boundary[0].a];while(next.get(ring.at(-1))!==ring[0]){const n=next.get(ring.at(-1));if(n===undefined||ring.includes(n))throw new Error('M125 broken chart boundary');ring.push(n);}
  if(ring.length!==boundary.length)throw new Error('M125 multiple chart boundary');
  const boundaryDeviation=Math.max(...ring.map(i=>{const q=uv(nodes[i].p);return Math.abs(Math.abs(q[0])+Math.abs(q[1])-1);}));if(boundaryDeviation>1e-5)throw new Error('M125 perimeter drift '+boundaryDeviation);
  const local=[],add=(ids,owner)=>{const[a,b,c]=ids.map(i=>nodes[i].p);if((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)<0)ids=[ids[0],ids[2],ids[1]];const f={ids,old:-1,owner,side};local.push(f);added.push(f);};
  const prefix='MRS_QUAD_'+side+'_125_',grid=[],r=spec.radius;
  for(const t of spec.stations)for(const s of spec.stations){const u=r*(s+t)/2,v=r*(s-t)/2;grid.push(make(u,v,sample(u,v).z));}
  // One dominant facing owns the central cell. Fit only its four vertices;
  // surrounding, smaller support cells retain the sampled anatomical curvature.
  const crownIds=[grid[5],grid[6],grid[10],grid[9]],mat=Array.from({length:3},()=>[0,0,0,0]);
  for(const id of crownIds){const p=nodes[id].p,[u,v]=uv(p),a=[1,u,v];for(let i=0;i<3;i++){for(let j=0;j<3;j++)mat[i][j]+=a[i]*a[j];mat[i][3]+=a[i]*p.z;}}
  for(let k=0;k<3;k++){const d=mat[k][k];for(let j=k;j<4;j++)mat[k][j]/=d;for(let i=0;i<3;i++)if(i!==k){const t=mat[i][k];for(let j=k;j<4;j++)mat[i][j]-=t*mat[k][j];}}
  const fit=mat.map(v=>v[3]);fit[0]=Math.max(fit[0],sample(0,0).z-.0035);for(const id of crownIds){const[u,v]=uv(nodes[id].p);nodes[id].p.z=fit[0]+fit[1]*u+fit[2]*v;}
  const gridFaces=[];for(let j=0;j<3;j++)for(let i=0;i<3;i++){const a=grid[j*4+i],b=grid[j*4+i+1],c=grid[(j+1)*4+i+1],d=grid[(j+1)*4+i],crown=i===1&&j===1,name=prefix+(crown?'CROWN':'FLOW_'+j+'_'+i);
   gridFaces.push({ids:[a,b,c],owner:name+(crown?'':'_A')},{ids:[a,c,d],owner:name+(crown?'':'_B')});}
  const gridEdges=new Map();for(const f of gridFaces)for(let k=0;k<3;k++){const a=f.ids[k],b=f.ids[(k+1)%3],key=a<b?a+':'+b:b+':'+a,e=gridEdges.get(key)||{a,b,count:0};e.count++;gridEdges.set(key,e);}
  const outerEdges=[...gridEdges.values()].filter(e=>e.count===1),stationMap=new Map();
  // Use an outer support envelope instead of inscribed chords that cut into
  // the convex thigh and create a dark attachment slash. The actual perimeter
  // remains fixed; only the internal support vertices receive this bounded lift.
  const supportLift=new Map();for(const e of outerEdges){const a=nodes[e.a].p,b=nodes[e.b].p;let gap=0;for(const t of [.25,.5,.75]){const p=a.clone().lerp(b,t);gap=Math.max(gap,sampleXY(p.x,p.y).z-p.z);}for(const id of[e.a,e.b])supportLift.set(id,Math.max(supportLift.get(id)||0,gap));}
  for(const[id,lift]of supportLift)nodes[id].p.z+=lift;
  const station=(u,v)=>{u*=r;v*=r;const key=[u,v].map(v=>v.toFixed(7)).join(',');if(stationMap.has(key))return stationMap.get(key);
   for(const id of grid){const q=uv(nodes[id].p);if(Math.hypot(q[0]-u,q[1]-v)<1e-6){stationMap.set(key,id);return id;}}
   for(const e of outerEdges){const a=uv(nodes[e.a].p),b=uv(nodes[e.b].p),dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=((u-a[0])*dx+(v-a[1])*dy)/l;
    if(t< -1e-6||t>1+1e-6||Math.abs((u-a[0])*dy-(v-a[1])*dx)>1e-7)continue;
    const id=make(u,v,nodes[e.a].p.z+(nodes[e.b].p.z-nodes[e.a].p.z)*t);stationMap.set(key,id);return id;
   }throw new Error('M125 perimeter station lacks plane owner');
  };
  const directions=[[1,0],[0,1],[-1,0],[0,-1]],sectors=[];
  for(let k=0;k<4;k++){const a=directions[k],b=directions[(k+1)%4],dx=b[0]-a[0],dy=b[1]-a[1];
   const edgeIds=ring.filter(i=>{const q=uv(nodes[i].p);return Math.abs((q[0]-a[0])*dy-(q[1]-a[1])*dx)<1e-5;}).sort((i,j)=>{const a=uv(nodes[i].p),b=uv(nodes[j].p);return(a[0]-b[0])*dx+(a[1]-b[1])*dy;});
   sectors.push({edgeIds,inner:edgeIds.map(i=>station(...uv(nodes[i].p)))});
  }
  const stations=[...new Set(sectors.flatMap(s=>s.inner))];
  for(const f of gridFaces){const polygon=[];for(let k=0;k<3;k++){const a=f.ids[k],b=f.ids[(k+1)%3],qa=uv(nodes[a].p),qb=uv(nodes[b].p),dx=qb[0]-qa[0],dy=qb[1]-qa[1],l=dx*dx+dy*dy;polygon.push(a);
    const extra=stations.filter(i=>i!==a&&i!==b).map(id=>{const q=uv(nodes[id].p);return{id,t:((q[0]-qa[0])*dx+(q[1]-qa[1])*dy)/l,cross:(q[0]-qa[0])*dy-(q[1]-qa[1])*dx};}).filter(v=>v.t>1e-6&&v.t<1-1e-6&&Math.abs(v.cross)<1e-7).sort((a,b)=>a.t-b.t);polygon.push(...extra.map(v=>v.id));
   }
   if(polygon.length===3)add(f.ids,f.owner);else{const p=f.ids.reduce((v,i)=>v.add(nodes[i].p),new Vector3()).multiplyScalar(1/3),id=makePoint(p);for(let k=0;k<polygon.length;k++)add([id,polygon[k],polygon[(k+1)%polygon.length]],f.owner);}
  }
  const gridNormals=new Map();for(const f of gridFaces){const[a,b,c]=f.ids.map(i=>nodes[i].p),n=b.clone().sub(a).cross(c.clone().sub(a));if(n.z<0)n.negate();for(const i of f.ids){if(!gridNormals.has(i))gridNormals.set(i,new Vector3());gridNormals.get(i).add(n);}}
  for(const n of gridNormals.values())n.normalize();
  const perimeterNormal=p=>{const q=uv(p);for(const e of outerEdges){const a=uv(nodes[e.a].p),b=uv(nodes[e.b].p),dx=b[0]-a[0],dy=b[1]-a[1],t=((q[0]-a[0])*dx+(q[1]-a[1])*dy)/(dx*dx+dy*dy);if(t>=-1e-6&&t<=1+1e-6&&Math.abs((q[0]-a[0])*dy-(q[1]-a[1])*dx)<1e-7)return gridNormals.get(e.a).clone().lerp(gridNormals.get(e.b),Math.max(0,Math.min(1,t))).normalize();}throw new Error('M125 missing perimeter tangent');};
  const guideMap=new Map();for(const{edgeIds,inner}of sectors){const rows=[inner];
   for(const t of [.25,.5,.75])rows.push(inner.map((id,j)=>{
    const key=id+':'+t;if(guideMap.has(key))return guideMap.get(key);const a=nodes[id].p,b=nodes[edgeIds[j]].p,dx=b.x-a.x,dy=b.y-a.y,delta=b.z-a.z;
    const innerNormal=perimeterNormal(a),s=sampleXY(b.x,b.y),outerNormal=s.weights.reduce((v,w,k)=>v.addScaledVector(new Vector3().fromBufferAttribute(attr.aSmooth,s.old*3+k),w),new Vector3()).normalize();
    let m0=-(innerNormal.x*dx+innerNormal.y*dy)/innerNormal.z,m1=-(outerNormal.x*dx+outerNormal.y*dy)/outerNormal.z;
    const limit=Math.max(Math.abs(delta)*3,Math.hypot(dx,dy)*.12);m0=Math.max(-limit,Math.min(limit,m0));m1=Math.max(-limit,Math.min(limit,m1));
    const z=(2*t*t*t-3*t*t+1)*a.z+(t*t*t-2*t*t+t)*m0+(-2*t*t*t+3*t*t)*b.z+(t*t*t-t*t)*m1,p=a.clone().lerp(b,t);p.z=z;const n=makePoint(p);guideMap.set(key,n);return n;
   }));rows.push(edgeIds);
   for(let j=0;j<inner.length-1;j++)for(let k=0;k<rows.length-1;k++){const a=rows[k],b=rows[k+1];add([a[j],b[j],b[j+1]],prefix+'RETURN');add([a[j],b[j+1],a[j+1]],prefix+'RETURN');}
  }
  let minimumForwardNormal=1,maximumSurfaceShift=0,deltaVolume=0,minimumArea=Infinity;
  for(const f of local){const[a,b,c]=f.ids.map(i=>nodes[i].p),n=b.clone().sub(a).cross(c.clone().sub(a));minimumArea=Math.min(minimumArea,n.length()/2);minimumForwardNormal=Math.min(minimumForwardNormal,n.clone().normalize().z);deltaVolume+=a.dot(b.clone().cross(c))/6;for(const p of[a,b,c])maximumSurfaceShift=Math.max(maximumSurfaceShift,Math.abs(p.z-sampleXY(p.x,p.y).z));}
  for(const f of patch){const[a,b,c]=f.ids.map(i=>nodes[i].p);deltaVolume-=a.dot(b.clone().cross(c))/6;}
  if(minimumArea<5e-11||minimumForwardNormal<.12||maximumSurfaceShift>.025)throw new Error('M125 invalid field '+JSON.stringify({minimumArea,minimumForwardNormal,maximumSurfaceShift}));
  reports.push({side,spec,fit,removedTriangles:patch.length,addedTriangles:local.length,boundaryVertices:ring.length,boundaryDeviation,maximumBoundaryDrift:0,maximumSurfaceShift,minimumForwardNormal,minimumArea,deltaVolume,planeCount:17,returnMethod:'four bounded Hermite bands using continuous grid-boundary and retained-surface normals; endpoint positions fixed',method:'continuous hip-to-knee field; one broad diamond crown and sixteen curvature-sampled supports'});
  const patchSet=new Set(patch);work=work.filter(f=>!patchSet.has(f));
 }
 const final=work.concat(added),mapping=Array(faces.length).fill(-1),children=Array.from({length:faces.length},()=>[]);final.forEach((f,i)=>{if(f.old>=0){mapping[f.old]=i;children[f.old].push(i);}else if(f.parent>=0)children[f.parent].push(i);});
 const out=Object.fromEntries(Object.entries(attr).map(([k,a])=>[k,[]])),aliases=Object.keys(attr).filter(k=>attr[k]===attr.normal);
 const newSmooth=new Map();for(const f of final){const[a,b,c]=f.ids.map(i=>nodes[i].p),n=b.clone().sub(a).cross(c.clone().sub(a));for(const id of f.ids){if(!newSmooth.has(id))newSmooth.set(id,new Vector3());newSmooth.get(id).add(n);}}
 const registry=new Map(),creases=[];
 final.forEach((f,ti)=>{
  const[a,b,c]=f.ids.map(i=>nodes[i].p),physical=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),isPlane=f.owner&&!f.owner.endsWith('RETURN');
  if(isPlane){if(!registry.has(f.owner))registry.set(f.owner,{id:f.owner,region:'QUADRICEPS',side:f.side,type:f.owner.endsWith('CROWN')?'elongated diamond':'directional wedge',anatomicalOwner:'quadriceps crown and directional support',triangleIndices:[],averageNormal:physical.toArray(),status:'AUTHORED; closure pending checkpoint validation',adjacentPlanes:[],blackPointAdjacency:[]});registry.get(f.owner).triangleIndices.push(ti);}
  for(let k=0;k<3;k++){
   const id=f.ids[k],node=nodes[id];for(const[name,a]of Object.entries(attr)){
    let values;if(f.old>=0)values=Array.from(a.array.slice((f.old*3+k)*a.itemSize,(f.old*3+k+1)*a.itemSize));
    else if(node.source!==undefined)values=Array.from(a.array.slice(node.source*a.itemSize,(node.source+1)*a.itemSize));
    else {const s=node.interpolation;values=Array.from({length:a.itemSize},(_,j)=>s.weights.reduce((sum,w,l)=>sum+w*a.array[(s.old*3+l)*a.itemSize+j],0));}
    if(name==='position'&&f.old<0)values=node.p.toArray();
    if(f.old<0){
     if(name==='aPhysicalNormal')values=physical.toArray();
     // aFacet contains roughness/metalness/darkness/tint, not a normal.
     // Preserve the source or barycentrically interpolated optical values.
     // Geometric face normals belong exclusively in aPhysicalNormal.
     if(name==='aBary')values=[k===0?1:0,k===1?1:0,k===2?1:0,values[3]];
     if(['aSmooth','aMoldNormal','aCrystalNormal','normal'].includes(name)){
      if(node.source===undefined)values=node.retained?new Vector3().fromArray(values).normalize().toArray():newSmooth.get(id).clone().normalize().toArray();
      if(isPlane&&(name==='aCrystalNormal'||(name==='normal'&&aliases.includes('aCrystalNormal'))))values=physical.toArray();
     }
     if(name==='aCrystalFamily'&&isPlane)values=[600+[...registry.keys()].indexOf(f.owner)];
    }out[name].push(...values);
   }
  }
 });
 for(const[name,a]of Object.entries(attr))g.setAttribute(name,new Float32BufferAttribute(out[name],a.itemSize));
 if(aliases.includes('aCrystalNormal'))g.setAttribute('normal',g.attributes.aCrystalNormal);
 const edgeOwners=new Map();final.forEach((f,i)=>{for(let k=0;k<3;k++){const a=f.ids[k],b=f.ids[(k+1)%3],key=a<b?a+':'+b:b+':'+a;if(!edgeOwners.has(key))edgeOwners.set(key,{a,b,faces:[]});edgeOwners.get(key).faces.push({i,owner:f.owner});}});
 for(const e of edgeOwners.values()){
  if(e.faces.length!==2)throw new Error('M125 open edge '+JSON.stringify({points:[nodes[e.a].p,nodes[e.b].p],faces:e.faces}));const[a,b]=e.faces;
  if(a.owner===b.owner||(!registry.has(a.owner)&&!registry.has(b.owner)))continue;
  creases.push({positions:[nodes[e.a].p.toArray(),nodes[e.b].p.toArray()],triangles:[a.i,b.i],planes:[a.owner,b.owner]});
  for(const[x,y]of[[a,b],[b,a]])if(registry.has(x.owner)&&y.owner&&!registry.get(x.owner).adjacentPlanes.includes(y.owner))registry.get(x.owner).adjacentPlanes.push(y.owner);
 }
 const physicalAt=i=>new Vector3().fromBufferAttribute(g.attributes.position,i);
 const regionOwners=[['inner quadriceps sweep','proximal inner quadriceps support','superior quadriceps support'],['distal inner quadriceps return','anterior quadriceps crown','proximal outer quadriceps support'],['quadriceps-to-knee insertion','distal outer quadriceps return','outer vastus sweep']];
 for(const r of registry.values()){
  let area=0;const normal=new Vector3(),center=new Vector3();
  for(const t of r.triangleIndices){const[a,b,c]=[0,1,2].map(k=>physicalAt(t*3+k)),n=b.clone().sub(a).cross(c.clone().sub(a)),a2=n.length();normal.add(n);center.addScaledVector(a.clone().add(b).add(c).multiplyScalar(1/3),a2/2);area+=a2/2;}
  normal.normalize();center.divideScalar(area);let residual=0,spread=0;
  for(const t of r.triangleIndices){const[a,b,c]=[0,1,2].map(k=>physicalAt(t*3+k)),n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();spread=Math.max(spread,n.angleTo(normal)*180/Math.PI);for(let k=0;k<3;k++){
    const i=t*3+k;residual=Math.max(residual,Math.abs(physicalAt(i).sub(center).dot(normal)));g.attributes.aCrystalNormal.setXYZ(i,normal.x,normal.y,normal.z);g.attributes.aPhysicalNormal.setXYZ(i,n.x,n.y,n.z);
   }}
  if(residual>2e-7||spread>.2)throw new Error('M125 facing family is not coplanar '+r.id);
  const cell=r.id.match(/FLOW_(\d)_(\d)_/);r.anatomicalOwner=cell?regionOwners[Number(cell[1])][Number(cell[2])]:'anterior quadriceps crown';
  r.mirroredId=r.id.replace(r.side==='L'?'_L_':'_R_',r.side==='L'?'_R_':'_L_');r.centerPosition=center.toArray();r.averageNormal=normal.toArray();r.apexDirection=[r.side==='L'?.23:-.23,-1,0];r.area=area;r.maximumPlaneResidual=residual;r.maximumPhysicalNormalSpreadDegrees=spread;
 }
 g.userData.mrsCrystal.explicitGeometryPlanes={version:'M125',count:registry.size,ownership:'Final torso triangle registry; actual coplanar facings override the earlier continuous normal field only within the registered regions.'};
 // Only M87 entries carry final torso triangle indices; M84 lower atlas indices
 // intentionally retain their stage-local scope and are not remapped as final.
 for(const p of g.userData.mrsAbdominalPlanes?.planes||[])if(p.triangleIndices){if(p.triangleIndices.some(i=>!children[i].length))throw new Error('M125 removed abdominal owner '+p.id);p.triangleIndices=p.triangleIndices.flatMap(i=>children[i]);}
 g.userData.mrsQuadCrown125={version:'M125',parent:'M124',reports,planes:[...registry.values()],creases,oldToNewTriangle:mapping,oldToNewTriangles:children,oldTriangleCount:faces.length,triangleCount:final.length};
 g.computeBoundingBox();g.computeBoundingSphere();return g;
}
