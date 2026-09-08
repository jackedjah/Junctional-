import {facetedGeometry} from './forge.js';

// M57: Mrs-only authoring geometry. The M56 foundation remains available through
// buildMrsTorso({representation:'foundation'}). This is not shipping retopology.
export const MRS_AUTHORING_VERSION='M84';
const unit=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const minus=(a,b)=>a.map((x,i)=>x-b[i]);
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};

// Coordinates are anatomical, in unscaled authoring units. Each facing has a
// broad diamond crown, four support kites and four continuous perimeter returns.
// Different aspect ratios and axial directions follow the individual muscle.
const crowns=[
 {region:'LATERAL_RETURN',owner:'lateral glute / proximal hamstring insertion',x:.319,y:1.163,w:.053,h:.082,flow:.18,back:true,inset:0,fall:0,pairedReturn:true},
 {region:'GLUTE',owner:'gluteus maximus',x:.183,y:1.308,w:.135,h:.143,flow:.06,back:true,inset:.0025,fall:.024},
 {region:'HAMSTRING',owner:'hamstring return',x:.169,y:1.014,w:.084,h:.118,flow:.28,back:true,inset:.002,fall:.015},
 {region:'QUAD',owner:'quadriceps crown',x:.173,y:1.088,w:.106,h:.175,flow:.25,back:false,inset:.0015,fall:.022},
 {region:'KNEE',owner:'patella pseudo-joint',x:.082,y:.799,w:.057,h:.073,flow:.10,back:false,inset:-.0015,fall:.016},
 {region:'TAPER',owner:'anterior tendon and lower taper',x:.063,y:.592,w:.041,h:.103,flow:.16,back:false,inset:.001,fall:.009}
];
const pockets=[
 {region:'KNEE_SUPERIOR',owner:'quadriceps tendon / patella lateral return convergence',x:.132,y:.891-.35*(Math.hypot(.132-.090,.003)-.003),w:.0060,h:.013,depth:.0025,flow:-.30,back:false,neighbors:['QUAD','KNEE']},
 {region:'KNEE_LATERAL',owner:'patella / lateral tendon return',x:.128,y:.753,w:.0055,h:.011,depth:.0024,flow:.35,back:false,neighbors:['KNEE','TAPER']},
 {region:'GLUTE_RETURN',owner:'glute / hamstring insertion convergence',x:.250,y:1.156,w:.0070,h:.014,depth:.0033,flow:-.40,back:true,neighbors:['GLUTE','HAMSTRING']}
];

export function authorMrsLowerBody(result){
 const old=result.geometry,stock=result.positions.slice(),original=result.faces.map(f=>f.slice());
 const p=result.positions;
 let faces=original.map(f=>f.slice()),parents=faces.map((_,i)=>i);
 const point=id=>p.slice(id*3,id*3+3);
 const defs=[];
 for(const side of ['L','R'])for(const source of [...crowns,...pockets]){
  const d={...source,side,sign:side==='L'?-1:1,pocket:'depth' in source};
  d.id='MRS_'+d.region+'_'+side;
  d.uv=(x,y)=>[(d.sign*x-d.x-d.flow*(y-d.y))/d.w,(y-d.y)/d.h];
  if(d.pocket)d.uv=(x,y)=>[(d.sign*x-d.x-d.flow*(y-d.y))/(d.w/2),(y-d.y)/(d.h/2)];
  d.xy=(u,v)=>{const h=d.pocket?d.h/2:d.h,w=d.pocket?d.w/2:d.w;return[d.sign*(d.x+w*u+d.flow*h*v),d.y+h*v];};
  defs.push(d);
 }
 const triangles=original.map(f=>f.map(id=>stock.slice(id*3,id*3+3)));
 function sample(x,y,back){
  let z=back?Infinity:-Infinity;
  for(const [a,b,c] of triangles){
   if((back?a[2]>=0:a[2]<=0))continue;
   const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(det)<1e-14)continue;
   const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/det;
   const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det;
   if(u>=-1e-9&&v>=-1e-9&&u+v<=1+1e-9){const q=u*a[2]+v*b[2]+(1-u-v)*c[2];z=back?Math.min(z,q):Math.max(z,q);}
  }
  if(!Number.isFinite(z))throw new Error('Authoring landmark outside stock '+[x,y,back]);return z;
 }
 for(const d of defs){
  const x=d.sign*d.x,delta=.004,sgn=d.back?-1:1;
  d.stockCenter=sample(x,d.y,d.back);
  d.slopeX=(sample(x+delta,d.y,d.back)-sample(x-delta,d.y,d.back))/(2*delta);
  d.slopeY=(sample(x,d.y+delta,d.back)-sample(x,d.y-delta,d.back))/(2*delta);
  d.plane=(x,y)=>d.stockCenter+d.slopeX*(x-d.sign*d.x)+d.slopeY*(y-d.y)-sgn*d.inset;
 }
 for(const d of defs.filter(d=>!d.pocket)){
  if(d.pairedReturn){
   // Two longitudinal facing wedges share one anatomical ridge. The four
   // anchor heights come from the retained support, never a lifted badge.
   const r=.60,top=sample(...d.xy(0,r),true),bottom=sample(...d.xy(0,-r),true);
   const center=(top+bottom)/2,sv=(top-bottom)/(2*r);
   const outward=sample(...d.xy(r,0),true),inward=sample(...d.xy(-r,0),true);
   d.returnFacing=(u,v)=>center+sv*v+(u>=0?(outward-center)/r:(center-inward)/r)*u;
  }
  const fitPoints=[[0,0],[.48,0],[-.48,0],[0,.48],[0,-.48],[.24,.24],[-.24,.24],[.24,-.24],[-.24,-.24]];
  const samples=fitPoints.map(([u,v])=>[u,v,sample(...d.xy(u,v),d.back)]);
  d.fit=[samples.reduce((s,q)=>s+q[2],0)/samples.length,
   samples.reduce((s,q)=>s+q[0]*q[2],0)/samples.reduce((s,q)=>s+q[0]*q[0],0),
   samples.reduce((s,q)=>s+q[1]*q[2],0)/samples.reduce((s,q)=>s+q[1]*q[1],0)];
 }

 // Split existing edges, propagating each split to every incident face. This
 // retains a closed integrated surface; there are no floating cap/pocket meshes.
 function cut(d,fn){
  const edges=new Map();
  for(const f of faces){
   const v=f.map(point);if(v.some(q=>d.back?q[2]>=0:q[2]<=0))continue;
   const uv=v.map(q=>d.uv(q[0],q[1]));
   if(Math.min(...uv.map(q=>q[0]))>1.12||Math.max(...uv.map(q=>q[0]))< -1.12||
      Math.min(...uv.map(q=>q[1]))>1.12||Math.max(...uv.map(q=>q[1]))< -1.12)continue;
   for(let k=0;k<3;k++){
    const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a;if(edges.has(key))continue;
    const u=point(a),v=point(b),su=fn(...d.uv(u[0],u[1])),sv=fn(...d.uv(v[0],v[1]));
    if(su*sv>=0||Math.abs(su)<1e-9||Math.abs(sv)<1e-9)continue;
    const t=su/(su-sv),length=Math.hypot(...minus(v,u));
    if(length*Math.min(t,1-t)<.000006)continue;
    const id=p.length/3;p.push(...u.map((q,i)=>q+(v[i]-q)*t));edges.set(key,id);
   }
  }
  const next=[],ps=[],add=(f,parent)=>{next.push(f);ps.push(parent);};
  faces.forEach((f,i)=>{
   const m=f.map((a,k)=>{const b=f[(k+1)%3];return edges.get(a<b?a+':'+b:b+':'+a);});
   const n=m.filter(x=>x!==undefined).length,parent=parents[i];
   if(n===0){add(f,parent);return;}
   if(n===1){const k=m.findIndex(x=>x!==undefined),a=f[k],b=f[(k+1)%3],c=f[(k+2)%3];add([a,m[k],c],parent);add([m[k],b,c],parent);}
   else if(n===2){
    const k=[0,1,2].find(k=>m[(k+2)%3]!==undefined&&m[k]!==undefined);
    const a=f[(k+2)%3],b=f[k],c=f[(k+1)%3],u=m[(k+2)%3],v=m[k];
    add([u,b,v],parent);
    const dist=(a,b)=>Math.hypot(...minus(point(a),point(b)));
    if(dist(a,v)<=dist(u,c)){add([a,u,v],parent);add([a,v,c],parent);}
    else {add([a,u,c],parent);add([u,v,c],parent);}
   }else{add([f[0],m[0],m[2]],parent);add([m[0],f[1],m[1]],parent);add([m[2],m[1],f[2]],parent);add([m[0],m[1],m[2]],parent);}
  });
  faces=next;parents=ps;
 }
 for(const d of defs){
  // Local intersections follow authored diamond boundaries, not random triangles.
  const rings=d.pocket?[.22,1]:d.pairedReturn?[.60,1]:[.48,1];
  for(const r of rings)for(const a of [-1,1])for(const b of [-1,1])cut(d,(u,v)=>a*u+b*v-r);
  cut(d,(u,v)=>u);if(!d.pairedReturn)cut(d,(u,v)=>v);
 }
 // Remove numerical slivers by collapsing their near-coincident edge globally,
 // before displacement. Original retained vertices always win over inserted ones.
 const representative=Array.from({length:p.length/3},(_,i)=>i);
 const rootId=id=>{while(representative[id]!==id){representative[id]=representative[representative[id]];id=representative[id];}return id;};
 let collapsedEdges=0;
 for(const f of faces)for(let k=0;k<3;k++){
  const a=rootId(f[k]),b=rootId(f[(k+1)%3]);if(a===b)continue;
  if(Math.hypot(...minus(point(a),point(b)))<.000020){representative[Math.max(a,b)]=Math.min(a,b);collapsedEdges++;}
 }
 // Collapsing a near-duplicate can leave a collinear three-corner face.
 // Resolve these in the projected authoring chart before any depth edit.
 for(let pass=0;pass<12;pass++){
  let changes=0;
  for(const source of faces){
   const f=source.map(rootId);if(new Set(f).size<3||f.every(id=>id<stock.length/3))continue;
   const [a,b,c]=f.map(point),areaXY=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));
   if(areaXY>=2e-10)continue;
   const candidates=f.map((id,k)=>[id,f[(k+1)%3]])
    .filter(([i,j])=>!(i<stock.length/3&&j<stock.length/3))
    .sort((u,v)=>Math.hypot(...minus(point(u[0]),point(u[1])))-Math.hypot(...minus(point(v[0]),point(v[1]))));
   const edge=candidates[0];if(!edge||Math.hypot(...minus(point(edge[0]),point(edge[1])))>.0002)continue;
   representative[Math.max(...edge)]=Math.min(...edge);changes++;collapsedEdges++;
  }
  if(!changes)break;
 }

 const kept=[],keptParents=[];
 faces.forEach((f,i)=>{const q=f.map(rootId);if(new Set(q).size===3){kept.push(q);keptParents.push(parents[i]);}});
 faces=kept;parents=keptParents;

 // A collinear face means its long edge skipped a real middle vertex.
 // Restore the edge topology by splitting the adjacent face at that vertex;
 // deleting the zero-area face alone would open the mesh.
 let repairedCollinearFaces=0;
 for(let pass=0;pass<32;pass++){
  const i=faces.findIndex(f=>{
   if(f.every(id=>id<stock.length/3))return false;
   const [a,b,c]=f.map(point);
   return Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))<1e-12&&
    Math.abs(a[2])>.1&&a[1]>.48&&a[1]<1.46;
  });
  if(i<0)break;
  const f=faces[i],edges=f.map((a,k)=>[a,f[(k+1)%3]]);
  edges.sort((a,b)=>Math.hypot(...minus(point(b[0]),point(b[1])))-Math.hypot(...minus(point(a[0]),point(a[1]))));
  const [a,b]=edges[0],middle=f.find(id=>id!==a&&id!==b);
  const j=faces.findIndex((q,k)=>k!==i&&q.includes(a)&&q.includes(b)&&!q.includes(middle));
  if(j<0)throw new Error('Unresolved collinear authoring edge');
  const q=faces[j],k=q.findIndex((id,k)=>(id===a&&q[(k+1)%3]===b)||(id===b&&q[(k+1)%3]===a));
  const u=q[k],v=q[(k+1)%3],w=q[(k+2)%3],parent=parents[j];
  faces[j]=[u,middle,w];faces.push([middle,v,w]);parents.push(parent);
  faces.splice(i,1);parents.splice(i,1);repairedCollinearFaces++;
 }

 const undeformed=p.slice();
 let moved=0,maxDisplacement=0;
 for(let id=0;id<p.length/3;id++){
  const [x,y,z]=point(id);let dz=0;
  for(const d of defs){
   if(d.back?z>=0:z<=0)continue;
   const [u,v]=d.uv(x,y),r=Math.abs(u)+Math.abs(v);if(r>=1)continue;
   const sign=d.back?-1:1;
   if(d.pocket){
    // Tiny four-sided bounded well, with a small floor. Depth remains local.
    dz-=sign*d.depth*Math.min(1,(1-r)/.78);
   }else if(d.pairedReturn){
    let target=d.returnFacing(u,v);
    if(r>.60){
     const inner=d.returnFacing(u*.60/r,v*.60/r),outer=sample(...d.xy(u/r,v/r),true);
     target=inner+(outer-inner)*(r-.60)/.40;
    }
    dz+=target-z;
   }else{
    const target=d.fit[0]+d.fit[1]*u+d.fit[2]*v;
    const blend=r<=.48?1:1-smooth((r-.48)/.52);
    // Facing planes subtract from retained muscle stock; never add a badge.
    dz-=sign*Math.max(0,sign*(z-target))*blend;
   }
  }
  p[3*id+2]+=dz;if(Math.abs(dz)>1e-10)moved++;maxDisplacement=Math.max(maxDisplacement,Math.abs(dz));
 }
 for(const d of defs.filter(d=>d.pairedReturn)){
   // M84: fit the lateral return collar as one geometric system. Match
   // neighboring plane gradients with fixed crown and perimeter positions.
   const usedIds=[...new Set(faces.flat())];
   const supportIds=usedIds.filter(id=>{const q=point(id),[u,v]=d.uv(q[0],q[1]),r=Math.abs(u)+Math.abs(v);return q[2]<0&&r>.60+1e-8&&r<1-1e-8;}).sort((a,b)=>{const x=point(a),y=point(b);return Math.round(x[1]*1e10)-Math.round(y[1]*1e10)||Math.round(Math.abs(x[0])*1e10)-Math.round(Math.abs(y[0])*1e10);});
   const supportIndex=new Map(supportIds.map((id,i)=>[id,i])),count=supportIds.length,matrix=Array.from({length:count},()=>new Float64Array(count+1)),edges=new Map(),terms=[];
   const gradients=faces.map(f=>{const[a,b,c]=f.map(point),d=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
    if(Math.abs(d)<1e-14)return null;
    return{f,coeff:[[b[1]-c[1],c[1]-a[1],a[1]-b[1]],[c[0]-b[0],a[0]-c[0],b[0]-a[0]]].map(q=>q.map(v=>v/d))};});
   faces.forEach((f,i)=>{for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a,e=edges.get(key)||{a,b,faces:[]};e.faces.push(i);edges.set(key,e);}});
   for(const edge of edges.values()){
    if(edge.faces.length!==2)continue;const[a,b]=edge.faces.map(i=>gradients[i]);if(!a||!b||!a.f.concat(b.f).some(id=>supportIndex.has(id)))continue;
    const pa=point(edge.a),pb=point(edge.b),weight=Math.max(1e-8,Math.hypot(pa[0]-pb[0],pa[1]-pb[1]));
    for(let axis=0;axis<2;axis++){
     const coefficients=new Map();let residual=0;
     for(const[g,sign]of[[a,1],[b,-1]])for(let k=0;k<3;k++){const value=sign*g.coeff[axis][k],id=g.f[k];residual+=value*p[id*3+2];if(supportIndex.has(id)){const j=supportIndex.get(id);coefficients.set(j,(coefficients.get(j)||0)+value);}}
     const values=[...coefficients].filter(([,q])=>Math.abs(q)>1e-10);if(!values.length)continue;terms.push({values,residual,weight});
     for(const[i,q]of values){matrix[i][count]-=weight*q*residual;for(const[j,v]of values)matrix[i][j]+=weight*q*v;}
    }
   }
   for(let i=0;i<count;i++)matrix[i][i]*=1+1e-9;
   for(let k=0;k<count;k++){let pivot=k;for(let i=k+1;i<count;i++)if(Math.abs(matrix[i][k])>Math.abs(matrix[pivot][k]))pivot=i;
    [matrix[k],matrix[pivot]]=[matrix[pivot],matrix[k]];const d=matrix[k][k];if(Math.abs(d)<1e-12)throw new Error('Lateral support fit is singular');
    for(let j=k;j<=count;j++)matrix[k][j]/=d;
    for(let i=0;i<count;i++)if(i!==k){const f=matrix[i][k];if(!f)continue;for(let j=k;j<=count;j++)matrix[i][j]-=f*matrix[k][j];}}
   const delta=matrix.map(row=>row[count]),maximumMove=Math.max(...delta.map(Math.abs));if(maximumMove>.01)throw new Error('Lateral support fit exceeds local displacement bound');
   const energy=ds=>terms.reduce((s,t)=>s+t.weight*(t.residual+t.values.reduce((a,[i,q])=>a+q*ds[i],0))**2,0);
   const beforeEnergy=energy(delta.map(()=>0)),afterEnergy=energy(delta);if(afterEnergy>beforeEnergy+1e-10)throw new Error('Lateral support fit increased bending');
   supportIds.forEach((id,i)=>p[id*3+2]+=delta[i]);
   d.supportFit={method:'coupled plane-gradient least squares over lateral return collar',vertices:count,terms:terms.length,maximumMove,beforeEnergy,afterEnergy,crownAndPerimeterFixed:true};
  }

 const next=facetedGeometry(p,faces,null,{inner:true,normalWeight:'angle'});
 const pre=facetedGeometry(undeformed,faces,null,{inner:true,normalWeight:'angle'});
 // Transfer retained attributes from their actual parent triangle. Inserting
 // control edges alone must not change the retained smooth normal field.
 for(const [name,attr] of Object.entries(old.attributes)){
  if(['position','normal','aPhysicalNormal','aCrystalNormal','aCrystalFamily','aBary','aMoldNormal'].includes(name))continue;
  const values=new attr.array.constructor(faces.length*3*attr.itemSize);
  faces.forEach((f,i)=>{
   const parent=parents[i],base=original[parent],[a,b,c]=triangles[parent];
   f.forEach((id,j)=>{
    const exact=base.indexOf(id);let weights;
    if(exact>=0)weights=[0,1,2].map(k=>k===exact?1:0);
    else{
     const [x,y]=point(id),det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
     const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/det;
     const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det;weights=[u,v,1-u-v];
    }
    for(let k=0;k<attr.itemSize;k++)values[(i*3+j)*attr.itemSize+k]=weights.reduce((s,w,n)=>s+w*attr.array[(parent*3+n)*attr.itemSize+k],0);
    if(name==='aSmooth'){
     const start=(i*3+j)*3;
     const transferred=unit(Array.from(values.slice(start,start+3)));
     const n=unit(transferred.map((q,k)=>q+next.attributes.aSmooth.array[start+k]-pre.attributes.aSmooth.array[start+k]));
     values.set(n,start);
    }
   });
  });
  next.setAttribute(name,new attr.constructor(values,attr.itemSize,attr.normalized));
 }
 // Reconcile transferred physical-normal deltas at all shared corners.
 const corners=new Map(),field=next.attributes.aSmooth;
 faces.forEach((f,i)=>f.forEach((id,j)=>{
  const k=i*3+j,[x,y,z]=point(id),key=[x,y,z].map(v=>Math.round(v*1e6)).join(',');
  const c=corners.get(key)||{indices:[],sum:[0,0,0]};c.indices.push(k);
  c.sum=c.sum.map((q,n)=>q+field.array[k*3+n]);corners.set(key,c);
 }));
 for(const c of corners.values()){const n=unit(c.sum);for(const i of c.indices)field.setXYZ(i,...n);}

 next.userData={...old.userData};
 const atlas=[],blackPoints=[],faceOwners=[];
 function ownerFor(d,x,y){
  const [u,v]=d.uv(x,y),r=Math.abs(u)+Math.abs(v),quadrant=(u>=0?'OUT':'IN')+'_'+(v>=0?'UP':'DOWN');
  if(d.pairedReturn)return d.id+'_'+(r<=.60?'FACING_'+(u>=0?'OUT':'IN'):(r<=.82?'SUPPORT_':'RETURN_')+quadrant);
  return d.id+'_'+(r<=.48?'CROWN':(r<=.82?'SUPPORT_':'RETURN_')+quadrant);
 }
 for(const d of defs.filter(d=>!d.pocket)){
  const ids=[...(d.pairedReturn?['FACING_OUT','FACING_IN']:['CROWN']),...['SUPPORT_','RETURN_'].flatMap(prefix=>['OUT_UP','OUT_DOWN','IN_UP','IN_DOWN'].map(q=>prefix+q))];
  for(const part of ids){
   const id=d.id+'_'+part;
   const near=pockets.filter(q=>q.neighbors.includes(d.region)).map(q=>'MRS_BP_'+q.region+'_'+d.side);
   atlas.push({region:d.region,side:d.side,planeId:id,planeType:part.startsWith('FACING')?'long wedge':part==='CROWN'?'diamond':part.startsWith('SUPPORT')?'kite':'return plane',
    anatomicalOwner:d.owner,centerPosition:[0,0,0],apexDirection:[d.sign*d.flow,1,0],
    averageNormal:[0,0,0],adjacentPlanes:[],blackPointAdjacency:near,status:part.startsWith('FACING')?'authored coplanar facing; visual review pending':part==='CROWN'?'partial inward planar facing':'mapped transition region; plane closure pending',area:0,triangles:0});
  }
 }
 const byId=new Map(atlas.map(a=>[a.planeId,a]));
 faces.forEach((f,i)=>{
  const verts=f.map(point),c=verts[0].map((q,k)=>(q+verts[1][k]+verts[2][k])/3);
  for(const d of defs.filter(d=>!d.pocket)){
   if(d.back?c[2]>=0:c[2]<=0)continue;
   const uv=d.uv(c[0],c[1]);if(Math.abs(uv[0])+Math.abs(uv[1])>=1)continue;
   const id=ownerFor(d,c[0],c[1]),entry=byId.get(id);
   const n=cross(minus(verts[1],verts[0]),minus(verts[2],verts[0])),area=Math.hypot(...n)/2;
   if(d.pairedReturn){const nn=unit(n);if(!entry.referenceNormal)entry.referenceNormal=nn;entry.maximumNormalSpreadDegrees=Math.max(entry.maximumNormalSpreadDegrees||0,Math.acos(Math.max(-1,Math.min(1,nn.reduce((s,q,k)=>s+q*entry.referenceNormal[k],0))))*180/Math.PI);}
   entry.area+=area;entry.triangles++;entry.centerPosition=entry.centerPosition.map((q,k)=>q+c[k]*area);
   entry.averageNormal=entry.averageNormal.map((q,k)=>q+n[k]);faceOwners[i]=id;break;
  }
 });
 const edgeOwners=new Map();
 faces.forEach((f,i)=>{for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a;const owners=edgeOwners.get(key)||new Set();if(faceOwners[i])owners.add(faceOwners[i]);edgeOwners.set(key,owners);}});
 for(const set of edgeOwners.values())for(const a of set)for(const b of set)if(a!==b&&!byId.get(a).adjacentPlanes.includes(b))byId.get(a).adjacentPlanes.push(b);
 for(const a of atlas){if(a.area)a.centerPosition=a.centerPosition.map(q=>q/a.area);a.averageNormal=unit(a.averageNormal);delete a.referenceNormal;}
 for(const d of defs.filter(d=>d.pocket)){
  const mirroredId='MRS_BP_'+d.region+'_'+(d.side==='L'?'R':'L');
  blackPoints.push({id:'MRS_BP_'+d.region+'_'+d.side,region:d.region,anatomicalPurpose:d.owner,
   centerPosition:[d.sign*d.x,d.y,d.stockCenter],mouthWidth:d.w,depth:d.depth,visibleLength:d.h,
   floorRatio:.22,neighborPlanes:atlas.filter(a=>a.side===d.side&&d.neighbors.includes(a.region)).map(a=>a.planeId),
   mirroredId,status:'local geometry; shadow readability pending'});
 }
 const report={version:MRS_AUTHORING_VERSION,representation:'anatomical-authoring-master',foundation:'retained M56',
  runtimeMeshStatus:'not retopologized or baked; authoring mesh only',originalVertices:stock.length/3,
  addedVertices:(p.length-stock.length)/3,originalTriangles:original.length,addedTriangles:faces.length-original.length,
  movedVertices:moved,maxDisplacement,collapsedEdges,repairedCollinearFaces,atlas,blackPoints,
  lateralReturnControl:{method:'coupled plane-gradient collar fit',innerRadius:.60,outerRadius:1,charts:defs.filter(d=>d.pairedReturn).map(d=>({side:d.side,...d.supportFit})),facingPlanesHeld:true,boundaryHeld:true}};
 next.userData.mrsAuthoring=report;result.mrsAuthoring=report;
 result.geometry=next;result.faces=faces;pre.dispose();old.dispose();rebuildPatellaSupport(result);
 rebuildLongitudinalMusclePatch(result,'HAMSTRING');
 rebuildLongitudinalMusclePatch(result,'QUAD');
 return indexLateralInsertions(result);
}

// M62: replace only the interior of two bounded patella charts. The outer
// boundary is sampled from the final retained M59 surface and is never moved.
function rebuildPatellaSupport(result){
 const old=result.geometry,p=result.positions,stock=p.slice(),original=result.faces.map(f=>f.slice());
 let faces=original.map(f=>f.slice()),parents=faces.map((_,i)=>i);
 const point=id=>p.slice(id*3,id*3+3),charts=[],innerNormals=new Map(),faceRegions=[];
 const sourceTriangles=original.map(f=>f.map(id=>stock.slice(id*3,id*3+3)));
 function lookup(x,y){
  let best=null;
  sourceTriangles.forEach(([a,b,c],i)=>{
   if(a[2]<=0)return;
   const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-13)return;
   const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d;
   const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
   if(u< -1e-8||v< -1e-8||u+v>1+1e-8)return;
   const z=u*a[2]+v*b[2]+(1-u-v)*c[2];if(!best||z>best.z)best={i,w:[u,v,1-u-v],z};
  });
  if(!best)throw new Error('Patella chart escaped retained surface');return best;
 }
 function cut(chart,fn){
  const edges=new Map();
  for(const f of faces){
   const v=f.map(point);if(v.some(q=>q[2]<=0))continue;
   const uv=v.map(q=>chart.uv(q));
   if(Math.min(...uv.map(q=>q[0]))>1.12||Math.max(...uv.map(q=>q[0]))< -1.12||
      Math.min(...uv.map(q=>q[1]))>1.12||Math.max(...uv.map(q=>q[1]))< -1.12)continue;
   for(let k=0;k<3;k++){
    const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a;if(edges.has(key))continue;
    const u=point(a),v=point(b),su=fn(...chart.uv(u)),sv=fn(...chart.uv(v));
    if(su*sv>=0||Math.abs(su)<1e-9||Math.abs(sv)<1e-9)continue;
    const t=su/(su-sv);if(Math.min(t,1-t)<1e-8)continue;
    const id=p.length/3;p.push(...u.map((q,j)=>q+(v[j]-q)*t));edges.set(key,id);
   }
  }
  const next=[],ps=[],add=(f,parent)=>{next.push(f);ps.push(parent);};
  faces.forEach((f,i)=>{
   const m=f.map((a,k)=>{const b=f[(k+1)%3];return edges.get(a<b?a+':'+b:b+':'+a);});
   const n=m.filter(x=>x!==undefined).length,parent=parents[i];
   if(n===0){add(f,parent);return;}
   if(n===1){const k=m.findIndex(x=>x!==undefined),a=f[k],b=f[(k+1)%3],c=f[(k+2)%3];add([a,m[k],c],parent);add([m[k],b,c],parent);}
   else if(n===2){const k=[0,1,2].find(k=>m[(k+2)%3]!==undefined&&m[k]!==undefined);
    const a=f[(k+2)%3],b=f[k],c=f[(k+1)%3],u=m[(k+2)%3],v=m[k];
    add([u,b,v],parent);
    const dist=(a,b)=>Math.hypot(...minus(point(a),point(b)));
    if(dist(a,v)<=dist(u,c)){add([a,u,v],parent);add([a,v,c],parent);}
    else{add([a,u,c],parent);add([u,v,c],parent);}
   }else{add([f[0],m[0],m[2]],parent);add([m[0],f[1],m[1]],parent);add([m[2],m[1],f[2]],parent);add([m[0],m[1],m[2]],parent);}
  });faces=next;parents=ps;
 }
 const cornersUV=[[1,0],[0,1],[-1,0],[0,-1]];
 for(const sign of [-1,1]){
  const chart={sign,side:sign<0?'L':'R',center:[sign*.081,.802],w:.052,h:.079,flow:.10};
  // M71: the upper insertion reaches the quad; inner crown/support landmarks
  // keep the retained M64 coordinates supplied by chart.xy below.
  chart.upperInsertion={height:.130,flow:.20};
  chart.uv=q=>{const dy=q[1]-.802;return[(sign*q[0]-.081-(dy>0?.20:.10)*dy)/.052,dy/(dy>0?.130:.079)];};
  chart.xy=(u,v)=>[sign*(.081+.052*u+.10*.079*v),.802+.079*v];
  // Split the chart hinge in physical coordinates before either affine half.
  cut(chart,(u,v)=>v*(v>0?.130:.079));
  cut(chart,(u,v)=>v-.55);
  for(const a of [-1,1])for(const b of [-1,1])cut(chart,(u,v)=>a*u+b*v-1);
  const inside=faces.map(f=>{
   const q=f.map(point);if(q.some(v=>v[2]<=0))return false;
   const uv=q.map(v=>chart.uv(v)),u=uv.reduce((s,q)=>s+q[0],0)/3,v=uv.reduce((s,q)=>s+q[1],0)/3;
   return Math.abs(u)+Math.abs(v)<1-1e-8;
  });
  const boundary=new Map();
  faces.forEach((f,i)=>{if(!inside[i])return;for(let k=0;k<3;k++){
   const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a;
   const e=boundary.get(key)||{a,b,count:0};e.count++;boundary.set(key,e);
  }});
  const edges=[...boundary.values()].filter(e=>e.count===1),ids=[...new Set(edges.flatMap(e=>[e.a,e.b]))];
  const degree=new Map();for(const e of edges)for(const id of [e.a,e.b])degree.set(id,(degree.get(id)||0)+1);
  if(!ids.length||[...degree.values()].some(n=>n!==2))throw new Error('Patella boundary must be one closed disk');
  const deviation=Math.max(...ids.map(id=>{const[u,v]=chart.uv(point(id));return Math.abs(Math.abs(u)+Math.abs(v)-1);}));
  if(deviation>1e-5)throw new Error('Patella boundary escaped authored diamond '+deviation);
  const retainedBoundary=ids.map(id=>[id,point(id)]),kept=[],kp=[];
  faces.forEach((f,i)=>{if(!inside[i]){kept.push(f);kp.push(parents[i]);}});faces=kept;parents=kp;
  const cx=chart.center[0],cy=chart.center[1],z=lookup(cx,cy).z+.0008;
  // Fit the broad crown direction to the retained center, not an older stock.
  const gx=(lookup(cx+.018,cy).z-lookup(cx-.018,cy).z)/.036;
  const gy=(lookup(cx,cy+.025).z-lookup(cx,cy-.025).z)/.050;
  const crownNormal=unit([-gx,-gy,1]);
  const ring=(radius,inset)=>cornersUV.map(([u,v])=>{
   const [x,y]=chart.xy(u*radius,v*radius),id=p.length/3;
   p.push(x,y,z+gx*(x-cx)+gy*(y-cy)-inset);return id;
  });
  const crown=ring(.42,0),support=ring(.70,.0015);
  // M63: the two inferior return sectors use corresponding stations rather
  // than one-corner fans. The guide at radius .85 lies on the retained radial
  // endpoints; only the interior interpolation changes.
  const guideCorners=new Map();
  function outerCorner(k){
   const [u,v]=cornersUV[k];
   return ids.reduce((best,id)=>{const q=chart.uv(point(id));const score=(q[0]-u)**2+(q[1]-v)**2;return !best||score<best.score?{id,score}:best;},null).id;
  }
  for(const k of [0,1,2,3]){
   const a=point(support[k]),b=point(outerCorner(k)),id=p.length/3;
   const guide=a.map((q,j)=>(q+b[j])/2);
   if(k===1)guide[2]=lookup(guide[0],guide[1]).z;
   p.push(...guide);guideCorners.set(k,id);
  }
  crown.forEach(id=>innerNormals.set(id,crownNormal));
  const bridgeSplits=new Map();
  function add(f,part){
   if(new Set(f).size<3)return;
   for(let j=0;j<3;j++){
    const a=f[j],b=f[(j+1)%3],c=f[(j+2)%3],m=bridgeSplits.get([a,b].sort((a,b)=>a-b).join(':'));
    if(m!==undefined){add([a,m,c],part);add([m,b,c],part);return;}
   }
   const[a,b,c]=f.map(point);if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<0)f=[f[0],f[2],f[1]];
   faces.push(f);parents.push(-1);faceRegions.push({face:f,chart,part});
  }
  add([crown[0],crown[1],crown[2]],'CROWN');add([crown[0],crown[2],crown[3]],'CROWN');
  const sectors=[];
  for(let k=0;k<4;k++){
   const next=(k+1)%4,[a,b]=[cornersUV[k],cornersUV[next]],dx=b[0]-a[0],dy=b[1]-a[1];
   const edgeIds=ids.filter(id=>{const[u,v]=chart.uv(point(id));return Math.abs((u-a[0])*dy-(v-a[1])*dx)<1e-5;})
    .sort((ia,ib)=>{const x=chart.uv(point(ia)),y=chart.uv(point(ib));return (x[0]-y[0])*dx+(x[1]-y[1])*dy;});
   if(edgeIds.length<2)throw new Error('Missing patella boundary side');
   const sector={k,next,edgeIds};
   {
    const start=point(support[k]),end=point(support[next]);
    sector.inner=edgeIds.map((id,j)=>{
     if(j===0)return support[k];if(j===edgeIds.length-1)return support[next];
     const uv=chart.uv(point(id)),t=((uv[0]-a[0])*dx+(uv[1]-a[1])*dy)/(dx*dx+dy*dy),index=p.length/3;
     p.push(...start.map((q,n)=>q+t*(end[n]-q)));return index;
    });
    sector.guide=edgeIds.map((id,j)=>{
     if(j===0)return guideCorners.get(k);if(j===edgeIds.length-1)return guideCorners.get(next);
     const a=point(sector.inner[j]),b=point(id),index=p.length/3,guide=a.map((q,n)=>(q+b[n])/2);
     if(k<2){
      // Two authored guide spans meet at the quad-facing shoulder. Dense source
      // boundary stations no longer dictate one unrelated normal per sliver.
      const q0=point(guideCorners.get(k===0?0:2)),q1=point(guideCorners.get(1)),t=(guide[1]-q0[1])/(q1[1]-q0[1]);
      const hinge=q0.map((q,n)=>q+.55*(q1[n]-q));hinge[2]=lookup(hinge[0],hinge[1]).z;
      const lo=t<=.55?q0:hinge,hi=t<=.55?hinge:q1,f=t<=.55?t/.55:(t-.55)/.45;
      guide[2]=lo[2]+f*(hi[2]-lo[2]);
     }
     p.push(...guide);return index;
    });
   }
   sectors.push(sector);
  }
  // Collapse only sub-micron duplicate stations on the new upper guide.
  // Use ascending anatomical height for the same canonical choice on both sides.
  for(const sector of sectors.slice(0,2)){
   const stations=[...sector.guide].sort((a,b)=>point(a)[1]-point(b)[1]),aliases=new Map();let previous=null;
   for(const id of stations){if(previous!==null&&Math.hypot(...minus(point(id),point(previous)))<1e-6)aliases.set(id,previous);else previous=id;}
   sector.guide=sector.guide.map(id=>aliases.get(id)??id);
  }
  // M72: a real quadriceps insertion hinge breaks the long raised chord above
  // the fixed crown. Its depth belongs to the retained anatomical surface.
  const supportTop=point(support[1]),guideTop=point(guideCorners.get(1));
  const insertionPosition=supportTop.map((q,n)=>(q+guideTop[n])/2);
  insertionPosition[2]=lookup(insertionPosition[0],insertionPosition[1]).z;
  const insertion=p.length/3;p.push(...insertionPosition);
  // M64: clip the inferior guide between two retained stations. The short
  // cross-edge and fixed support apex define a real terminal-facing plane.
  const nearestStation=(sector,target)=>sector.guide.reduce((best,id,index)=>{
   if(index===0||index===sector.guide.length-1)return best;
   const score=Math.abs(chart.uv(point(id))[0]-target);
   return !best||score<best.score?{index,id,score}:best;
  },null);
  const left=nearestStation(sectors[2],-.080),right=nearestStation(sectors[3],.080);
  if(!left||!right)throw new Error('Missing terminal clipping stations');
  const leftPosition=point(left.id),rightPosition=point(right.id);
  const u0=chart.uv(leftPosition)[0],u1=chart.uv(rightPosition)[0];
  const clippedIds=new Set([...sectors[2].guide.slice(left.index),...sectors[3].guide.slice(0,right.index+1)]);
  let terminalGuideDisplacement=0;
  for(const id of clippedIds){
   if(id===left.id||id===right.id)continue;
   const before=point(id),u=chart.uv(before)[0],t=(u-u0)/(u1-u0);
   const after=leftPosition.map((q,n)=>q+t*(rightPosition[n]-q));
   terminalGuideDisplacement=Math.max(terminalGuideDisplacement,Math.hypot(...minus(after,before)));
   p.splice(id*3,3,...after);
  }
  chart.terminal={leftPosition,rightPosition,apexPosition:point(support[3]),guideVertices:clippedIds.size,maximumGuideDisplacement:terminalGuideDisplacement};
  // M73: broad outer tendon supports own most of the former narrow ruled strip.
  // The retained perimeter remains fixed; a short boundary band absorbs its
  // inherited curvature. Side bridge points split the adjacent lower faces.
  const outerSupportFraction=.72,returnCorners=new Map();
  for(const k of [0,1,2]){
   const g=guideCorners.get(k),o=outerCorner(k),a=point(g),b=point(o),q=a.map((v,n)=>v+outerSupportFraction*(b[n]-v));
   if(k===1)q[2]=lookup(q[0],q[1]).z;
   const id=p.length/3;p.push(...q);returnCorners.set(k,id);
   if(k!==1)bridgeSplits.set([g,o].sort((a,b)=>a-b).join(':'),id);
  }
  chart.outerSupport={fraction:outerSupportFraction,guideHinge:.55,broadPlanesPerSector:4,perimeterHeld:true};
  for(const sector of sectors){
   const {k,next,edgeIds,inner,guide}=sector;
   if(k<2){
    // Four geometric faces per superior sector: two broad facing wedges,
    // a crown return and a central insertion return. Internal tessellation
    // only follows collinear boundary stations, so each owner is planar.
    for(let j=0;j<inner.length-1;j++)add([crown[k],inner[j],inner[j+1]],'SUPPORT_'+k);
    add([crown[k],inner.at(-1),crown[next]],'SUPPORT_'+k);
    const sideGuide=guideCorners.get(k===0?0:2),top=support[1];
    const h=guide.findIndex(id=>Math.abs((point(id)[1]-.802)/(guideTop[1]-.802)-.55)<1e-6);
    if(h<0)throw new Error('Missing authored upper tendon guide hinge');
    for(let j=0;j<inner.length-1;j++)add([sideGuide,inner[j],inner[j+1]],'TENDON_'+k+'_CROWN_RETURN');
    add([top,insertion,guide[h]],'TENDON_'+k+'_CENTRAL_RETURN');
    for(let j=0;j<guide.length-1;j++){
     const lower=k===0?j<h:j>=h;
     add([lower?top:insertion,guide[j],guide[j+1]],'TENDON_'+k+(lower?'_LATERAL_WEDGE':'_QUAD_WEDGE'));
    }
    const ga=point(guide[h]),oa=point(edgeIds[h]),shoulder=ga.map((v,n)=>v+outerSupportFraction*(oa[n]-v));
    shoulder[2]=lookup(shoulder[0],shoulder[1]).z;
    const lowerCorner=point(returnCorners.get(k===0?0:2)),upperCorner=point(returnCorners.get(1));
    const row=edgeIds.map((id,j)=>{
     if(j===0)return returnCorners.get(k);if(j===edgeIds.length-1)return returnCorners.get(next);
     const t=chart.uv(point(id))[1],a=t<=.55?lowerCorner:shoulder,b=t<=.55?shoulder:upperCorner,f=t<=.55?t/.55:(t-.55)/.45;
     const q=a.map((v,n)=>v+f*(b[n]-v)),index=p.length/3;p.push(...q);return index;
    });
    // Preserve the established weld tolerance without duplicate support stations.
    const ordered=[...row].sort((a,b)=>point(a)[1]-point(b)[1]),aliases=new Map();let previous=null;
    for(const id of ordered){if(previous!==null&&Math.hypot(...minus(point(id),point(previous)))<1e-6)aliases.set(id,previous);else previous=id;}
    for(let j=0;j<row.length;j++)row[j]=aliases.get(row[j])??row[j];
    for(const [start,end,label] of [[0,h,k===0?'LOWER':'UPPER'],[h,row.length-1,k===0?'UPPER':'LOWER']]){
     for(let j=start;j<end;j++){
      add([row[end],guide[j],guide[j+1]],'RETURN_'+k+'_'+label+'_GUIDE');
      add([guide[start],row[j],row[j+1]],'RETURN_'+k+'_'+label+'_SUPPORT');
     }
    }
    for(let j=0;j<row.length-1;j++){
     add([row[j],edgeIds[j],edgeIds[j+1]],'RETURN_'+k+'_BOUNDARY');
     add([row[j],edgeIds[j+1],row[j+1]],'RETURN_'+k+'_BOUNDARY');
    }
   }else{
    for(let j=0;j<inner.length-1;j++)add([crown[k],inner[j],inner[j+1]],'SUPPORT_'+k);
    add([crown[k],inner.at(-1),crown[next]],'SUPPORT_'+k);
    for(let j=0;j<inner.length-1;j++){
     const terminal=k===2?j>=left.index:j<right.index;
     if(!terminal){
      add([inner[j],guide[j],guide[j+1]],'TENDON_'+k);
      add([inner[j],guide[j+1],inner[j+1]],'TENDON_'+k);
     }
     add([guide[j],edgeIds[j],edgeIds[j+1]],'RETURN_'+k);
     add([guide[j],edgeIds[j+1],guide[j+1]],'RETURN_'+k);
    }
    const first=k===2?left.index:0,last=k===2?inner.length-1:right.index,anchor=k===2?left.id:right.id;
    for(let j=first;j<last;j++){
     add([anchor,inner[j],inner[j+1]],'TENDON_'+k);
     add([support[3],guide[j],guide[j+1]],'TERMINAL');
    }
   }
  }
  chart.boundaryVertices=ids.length;chart.removedFaces=inside.filter(Boolean).length;
  chart.maximumBoundaryDrift=Math.max(...retainedBoundary.map(([id,q])=>Math.hypot(...minus(point(id),q))));
  chart.crownNormal=crownNormal;charts.push(chart);
 }
 const next=facetedGeometry(p,faces,null,{inner:true,normalWeight:'angle'});
 const lookupCache=new Map();
 function sampleFor(id,parent){
  if(parent>=0){const exact=original[parent].indexOf(id);if(exact>=0)return {i:parent,w:[0,1,2].map(k=>k===exact?1:0)};}
  if(!lookupCache.has(id))lookupCache.set(id,lookup(...point(id)));return lookupCache.get(id);
 }
 for(const[name,attr]of Object.entries(old.attributes)){
  if(['position','normal','aPhysicalNormal','aCrystalNormal','aCrystalFamily','aBary','aMoldNormal'].includes(name))continue;
  const values=new attr.array.constructor(faces.length*3*attr.itemSize);
  faces.forEach((f,i)=>f.forEach((id,j)=>{
   const q=sampleFor(id,parents[i]);
   for(let k=0;k<attr.itemSize;k++)values[(i*3+j)*attr.itemSize+k]=q.w.reduce((s,w,n)=>s+w*attr.array[(q.i*3+n)*attr.itemSize+k],0);
   if(name==='aSmooth'){
    let normal=unit(Array.from(values.slice((i*3+j)*3,(i*3+j+1)*3)));
    if(innerNormals.has(id))normal=innerNormals.get(id);
    else if(id>=stock.length/3&&charts.some(c=>{const[u,v]=c.uv(point(id));return Math.abs(u)+Math.abs(v)<.86;}))
     normal=Array.from(next.attributes.aSmooth.array.slice((i*3+j)*3,(i*3+j+1)*3));
    values.set(normal,(i*3+j)*3);
   }
  }));
  next.setAttribute(name,new attr.constructor(values,attr.itemSize,attr.normalized));
 }
 // A shared position owns one clay normal; no lighting seams at stitched edges.
 const copies=new Map(),field=next.attributes.aSmooth;
 faces.forEach((f,i)=>f.forEach((id,j)=>{const key=point(id).map(q=>Math.round(q*1e6)).join(','),c=copies.get(key)||{sum:[0,0,0],ids:[]};
  const index=i*3+j;c.ids.push(index);c.sum=c.sum.map((q,k)=>q+field.array[index*3+k]);copies.set(key,c);}));
 for(const c of copies.values()){const n=unit(c.sum);for(const i of c.ids)field.setXYZ(i,...n);}
 const entries=new Map();
 for(const {face,chart,part}of faceRegions){
  const id='MRS_PATELLA_'+chart.side+'_'+part,[a,b,c]=face.map(point),n=cross(minus(b,a),minus(c,a)),area=Math.hypot(...n)/2;
  const e=entries.get(id)||{region:'PATELLA_PATCH',side:chart.side,planeId:id,planeType:part==='CROWN'?'kite':part.startsWith('SUPPORT')?'trapezoid':part.startsWith('TENDON')&&!part.endsWith('_RETURN')?'long wedge':'return plane',
   anatomicalOwner:part==='TERMINAL'?'patellar tendon terminal facing':/^(TENDON|RETURN)_[01]_/.test(part)?'quadriceps tendon / superior patella insertion':part.endsWith('_2')||part.endsWith('_3')?'patellar tendon return':'patella pseudo-joint',centerPosition:[0,0,0],apexDirection:[chart.sign*.1,1,0],averageNormal:[0,0,0],adjacentPlanes:[],blackPointAdjacency:['MRS_BP_KNEE_SUPERIOR_'+chart.side,'MRS_BP_KNEE_LATERAL_'+chart.side],status:part.startsWith('RETURN')?'stitched boundary return; visual review pending':part.startsWith('TENDON')?'authored tendon strip; visual review pending':'authored planar surface; visual review pending',area:0,triangles:0};
  const currentNormal=unit(n);if(!e.referenceNormal)e.referenceNormal=currentNormal;
  e.maximumNormalSpreadDegrees=Math.max(e.maximumNormalSpreadDegrees||0,Math.acos(Math.max(-1,Math.min(1,currentNormal.reduce((sum,q,k)=>sum+q*e.referenceNormal[k],0))))*180/Math.PI);
  e.area+=area;e.triangles++;e.centerPosition=e.centerPosition.map((q,k)=>q+(a[k]+b[k]+c[k])/3*area);e.averageNormal=e.averageNormal.map((q,k)=>q+n[k]);entries.set(id,e);
 }
 const owners=new Map();for(const f of faceRegions)for(let k=0;k<3;k++){const a=f.face[k],b=f.face[(k+1)%3],key=a<b?a+':'+b:b+':'+a,s=owners.get(key)||new Set();s.add('MRS_PATELLA_'+f.chart.side+'_'+f.part);owners.set(key,s);}
 for(const set of owners.values())for(const a of set)for(const b of set)if(a!==b&&!entries.get(a).adjacentPlanes.includes(b))entries.get(a).adjacentPlanes.push(b);
 for(const e of entries.values()){e.centerPosition=e.centerPosition.map(q=>q/e.area);e.averageNormal=unit(e.averageNormal);delete e.referenceNormal;}
 const report=result.mrsAuthoring;
 report.atlas=report.atlas.filter(e=>e.region!=='KNEE').concat([...entries.values()]);
 for(const pocket of report.blackPoints)if(pocket.region.startsWith('KNEE'))pocket.neighborPlanes=[...new Set([...pocket.neighborPlanes.filter(id=>!id.startsWith('MRS_KNEE_')),...[...entries.keys()].filter(id=>id.includes('_'+pocket.id.at(-1)+'_'))])];
 report.patellaPatch={method:'bounded integrated patch with coplanar kite crown, four support trapezoids and retained perimeter returns',baseline:'retained inner crown/support landmarks; outer attachment sampled from current pre-patella anatomical geometry',upperInsertion:{height:.130,flow:.20,innerCrownUnchanged:true,guideShoulderStation:.55,centralHingeFraction:.50,centralHingeDepthOwner:'retained anatomical surface',facingWedgesPerSector:2,returnPlanesPerSector:2},returnStrip:{sectors:[0,1,2,3],supportRadius:.70,guideRadius:.85,outerRadius:1,method:'superior guide uses two anatomical spans with a source-sampled central insertion hinge and four planar owners per sector; inferior strips and terminal retained'},charts:charts.map(c=>({side:c.side,center:c.center,width:2*c.w,height:c.h+c.upperInsertion.height,lowerExtent:c.h,upperExtent:c.upperInsertion.height,innerLandmarkHeight:2*c.h,boundaryVertices:c.boundaryVertices,removedFaces:c.removedFaces,maximumBoundaryDrift:c.maximumBoundaryDrift,crownNormal:c.crownNormal,outerSupport:c.outerSupport,terminal:c.terminal})),originalTriangles:original.length,finalTriangles:faces.length,addedPositions:(p.length-stock.length)/3};
 report.retainedStageCounters={originalTriangles:report.originalTriangles,addedTriangles:report.addedTriangles,originalVertices:report.originalVertices,addedVertices:report.addedVertices};
 report.addedTriangles=faces.length-report.originalTriangles;report.addedVertices=p.length/3-report.originalVertices;
 next.userData={...old.userData,mrsAuthoring:report};result.geometry=next;result.faces=faces;old.dispose();
 return report;
}

// M65 posterior muscle ownership; the retained M64 front/knee system is untouched.
function rebuildLongitudinalMusclePatch(result,kind='HAMSTRING'){
 const back=kind==='HAMSTRING',surfaceSign=back?-1:1,patchRegion=kind+'_PATCH',prefix='MRS_'+kind+'_';
 // M82: a broader posterior crown reaches the glute return while the distal tendon stays fixed.
 const spec=back?{x:.142,y:.976,w:.112,h:.184,flow:.26,lowerHeight:.144,lowerFlow:.32,lift:.011}:{x:.173,y:1.088,w:.106,h:.175,flow:.25,lowerHeight:.151,lowerFlow:.42,lift:0};
 const ownerName=back?'hamstring':'quadriceps';
 const old=result.geometry,p=result.positions,stock=p.slice(),original=result.faces.map(f=>f.slice());
 let faces=original.map(f=>f.slice()),parents=faces.map((_,i)=>i);
 const point=id=>p.slice(id*3,id*3+3),charts=[],innerNormals=new Map(),faceRegions=[];
 const sourceTriangles=original.map(f=>f.map(id=>stock.slice(id*3,id*3+3)));
 function lookup(x,y){
  let best=null;
  sourceTriangles.forEach(([a,b,c],i)=>{
   if(a[2]*surfaceSign<=0)return;
   const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-13)return;
   const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d;
   const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
   if(u< -1e-8||v< -1e-8||u+v>1+1e-8)return;
   const z=u*a[2]+v*b[2]+(1-u-v)*c[2];if(!best||(back?z<best.z:z>best.z))best={i,w:[u,v,1-u-v],z};
  });
  if(!best)throw new Error('Hamstring chart escaped retained surface');return best;
 }
 function cut(chart,fn,interiorOnly=false,capBounds=false){
  const edges=new Map(),oldRegions=new Map(faceRegions.map(q=>[q.face,q])),nextRegions=[];let currentRegion=null;
  for(const f of faces){
   const v=f.map(point);if(v.some(q=>q[2]*surfaceSign<=0))continue;
   const uv=v.map(q=>chart.uv(q));
   const box=Array.isArray(capBounds)?capBounds:[-.10,.10,.79,.96];
   if(capBounds&&(Math.min(...uv.map(q=>q[0]))>box[1]||Math.max(...uv.map(q=>q[0]))<box[0]||Math.min(...uv.map(q=>q[1]))>box[3]||Math.max(...uv.map(q=>q[1]))<box[2]))continue;
   // Front flow stations belong to the interior already cut by the diamond.
   // Still propagate boundary-edge splits to all incident faces below; do not
   // extend station lines into the retained knee or create remote slivers.
   if(interiorOnly){const u=uv.reduce((s,q)=>s+q[0],0)/3,v=uv.reduce((s,q)=>s+q[1],0)/3;if(Math.abs(u)+Math.abs(v)>=1-1e-8)continue;}
   if(Math.min(...uv.map(q=>q[0]))>1.12||Math.max(...uv.map(q=>q[0]))< -1.12||
      Math.min(...uv.map(q=>q[1]))>1.12||Math.max(...uv.map(q=>q[1]))< -1.12)continue;
   for(let k=0;k<3;k++){
    const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a;if(edges.has(key))continue;
    const u=point(a),v=point(b),su=fn(...chart.uv(u)),sv=fn(...chart.uv(v));
    if(su*sv>=0||Math.abs(su)<1e-9||Math.abs(sv)<1e-9)continue;
    const t=su/(su-sv);if(Math.min(t,1-t)<1e-8||(capBounds&&Math.hypot(...minus(v,u))*Math.min(t,1-t)<1e-6))continue;
    const id=p.length/3;p.push(...u.map((q,j)=>q+(v[j]-q)*t));edges.set(key,id);
   }
  }
  const next=[],ps=[],add=(f,parent)=>{next.push(f);ps.push(parent);if(currentRegion)nextRegions.push({...currentRegion,face:f});};
  faces.forEach((f,i)=>{
   currentRegion=oldRegions.get(f);
   const m=f.map((a,k)=>{const b=f[(k+1)%3];return edges.get(a<b?a+':'+b:b+':'+a);});
   const n=m.filter(x=>x!==undefined).length,parent=parents[i];
   if(n===0){add(f,parent);return;}
   if(n===1){const k=m.findIndex(x=>x!==undefined),a=f[k],b=f[(k+1)%3],c=f[(k+2)%3];add([a,m[k],c],parent);add([m[k],b,c],parent);}
   else if(n===2){const k=[0,1,2].find(k=>m[(k+2)%3]!==undefined&&m[k]!==undefined);
    const a=f[(k+2)%3],b=f[k],c=f[(k+1)%3],u=m[(k+2)%3],v=m[k];
    add([u,b,v],parent);
    const dist=(a,b)=>Math.hypot(...minus(point(a),point(b)));
    if(dist(a,v)<=dist(u,c)){add([a,u,v],parent);add([a,v,c],parent);}
    else{add([a,u,c],parent);add([u,v,c],parent);}
   }else{add([f[0],m[0],m[2]],parent);add([m[0],f[1],m[1]],parent);add([m[2],m[1],f[2]],parent);add([m[0],m[1],m[2]],parent);}
  });faces=next;parents=ps;faceRegions.length=0;faceRegions.push(...nextRegions);
 }
 const cornersUV=[[1,0],[0,1],[-1,0],[0,-1]];
 for(const sign of [-1,1]){
  const chart={sign,side:sign<0?'L':'R',center:[sign*spec.x,spec.y],w:spec.w,h:spec.h,flow:spec.flow};
  chart.uv=q=>{const dy=q[1]-spec.y,h=dy<0?spec.lowerHeight:spec.h,flow=dy<0?spec.lowerFlow:spec.flow;return[(sign*q[0]-spec.x-flow*dy)/spec.w,dy/h];};
  chart.xy=(u,v)=>{const h=v<0?spec.lowerHeight:spec.h,flow=v<0?spec.lowerFlow:spec.flow;return[sign*(spec.x+spec.w*u+flow*h*v),spec.y+h*v];};
  // The front patch shares the retained upper quad footprint. Only its lower
  // insertion chart redirects toward the accepted knee; split the physical
  // equator before cutting the two affine halves.
  cut(chart,(u,v)=>v*(v<0?spec.lowerHeight:spec.h));
  for(const a of [-1,1])for(const b of [-1,1])cut(chart,(u,v)=>a*u+b*v-1);
  // Match three broad stations per diamond edge before replacing the interior.
  for(const t of [-2/3,-1/3,1/3,2/3]){cut(chart,(u,v)=>u-t,true);cut(chart,(u,v)=>v-t,true);}

  const inside=faces.map(f=>{
   const q=f.map(point);if(q.some(v=>v[2]*surfaceSign<=0))return false;
   const uv=q.map(v=>chart.uv(v)),u=uv.reduce((s,q)=>s+q[0],0)/3,v=uv.reduce((s,q)=>s+q[1],0)/3;
   return Math.abs(u)+Math.abs(v)<1-1e-8;
  });
  const boundary=new Map();
  faces.forEach((f,i)=>{if(!inside[i])return;for(let k=0;k<3;k++){
   const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a;
   const e=boundary.get(key)||{a,b,count:0};e.count++;boundary.set(key,e);
  }});
  const edges=[...boundary.values()].filter(e=>e.count===1),ids=[...new Set(edges.flatMap(e=>[e.a,e.b]))];
  const degree=new Map();for(const e of edges)for(const id of [e.a,e.b])degree.set(id,(degree.get(id)||0)+1);
  if(!ids.length||[...degree.values()].some(n=>n!==2))throw new Error('Hamstring boundary must be one closed disk');
  const deviation=Math.max(...ids.map(id=>{const[u,v]=chart.uv(point(id));return Math.abs(Math.abs(u)+Math.abs(v)-1);}));
  if(deviation>1e-5)throw new Error('Hamstring boundary escaped authored diamond '+deviation);
  const retainedBoundary=ids.map(id=>[id,point(id)]),kept=[],kp=[];
  faces.forEach((f,i)=>{if(!inside[i]){kept.push(f);kp.push(parents[i]);}});faces=kept;parents=kp;
  // M65 revision: longitudinal surface stations follow the actual retained
  // hamstring curvature. Each coarse cell has deliberate diagonal flow; no
  // single tangent crown is extrapolated through the glute insertion.
  const grid=[],gridFaces=[],radius=.74,extent=radius/2;
  for(let j=0;j<4;j++)for(let i=0;i<4;i++){
   const s=-1+i*2/3,t=-1+j*2/3,u=extent*(s+t),v=extent*(s-t),[x,y]=chart.xy(u,v),id=p.length/3;
   const r=Math.abs(u)+Math.abs(v),bell=Math.max(0,1-(r/radius)**2);
   p.push(x,y,lookup(x,y).z+surfaceSign*spec.lift*bell*bell);grid.push(id);
  }
  for(let j=0;j<3;j++)for(let i=0;i<3;i++){
   const a=grid[j*4+i],b=grid[j*4+i+1],c=grid[(j+1)*4+i+1],d=grid[(j+1)*4+i];
   // Alternating within the anatomical chart makes elongated kite pairs.
   const name=(i===1&&j===1?'CROWN':'FLOW')+'_'+(j*3+i);
   if((i+j)%2===0){gridFaces.push({f:[a,b,c],part:name+'_A'},{f:[a,c,d],part:name+'_B'});}
   else{gridFaces.push({f:[a,b,d],part:name+'_A'},{f:[b,c,d],part:name+'_B'});}
  }
  function add(f,part){const[a,b,c]=f.map(point);
   if(((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))*surfaceSign<0)f=[f[0],f[2],f[1]];
   faces.push(f);parents.push(-1);faceRegions.push({face:f,chart,part});
  }
  const stationMap=new Map(),sectors=[];
  function station(u,v){
   const key=[u,v].map(q=>q.toFixed(8)).join(',');if(stationMap.has(key))return stationMap.get(key);
   const innerUV=[u*radius,v*radius];
   const close=grid.find(id=>{const q=chart.uv(point(id));return Math.hypot(q[0]-innerUV[0],q[1]-innerUV[1])<1e-7;});
   if(close!==undefined){stationMap.set(key,close);return close;}
   const candidates=grid.filter(id=>{const q=chart.uv(point(id));return Math.abs(Math.abs(q[0])+Math.abs(q[1])-radius)<1e-7;});
   for(const a of candidates)for(const b of candidates){if(a>=b)continue;
    const qa=chart.uv(point(a)),qb=chart.uv(point(b)),dx=qb[0]-qa[0],dy=qb[1]-qa[1],l=dx*dx+dy*dy;
    if(l>radius*radius*.24)continue;
    const t=((innerUV[0]-qa[0])*dx+(innerUV[1]-qa[1])*dy)/l;
    if(t< -1e-8||t>1+1e-8||Math.abs((innerUV[0]-qa[0])*dy-(innerUV[1]-qa[1])*dx)>1e-8)continue;
    const pa=point(a),pb=point(b),id=p.length/3;p.push(...pa.map((q,k)=>q+t*(pb[k]-q)));stationMap.set(key,id);return id;
   }
   throw new Error('Hamstring grid boundary station has no owner '+key);
  }
  for(let k=0;k<4;k++){
   const next=(k+1)%4,[a,b]=[cornersUV[k],cornersUV[next]],dx=b[0]-a[0],dy=b[1]-a[1];
   const edgeIds=ids.filter(id=>{const[u,v]=chart.uv(point(id));return Math.abs((u-a[0])*dy-(v-a[1])*dx)<1e-5;})
    .sort((ia,ib)=>{const x=chart.uv(point(ia)),y=chart.uv(point(ib));return (x[0]-y[0])*dx+(x[1]-y[1])*dy;});
   const inner=edgeIds.map(id=>station(...chart.uv(point(id))));sectors.push({k,edgeIds,inner});
  }
  // Subdivide only the perimeter edges of each planar cell to stitch every
  // retained station. All internal fan vertices remain exactly coplanar.
  const innerBoundary=[...new Set(sectors.flatMap(q=>q.inner))];
  for(const {f,part}of gridFaces){
   const polygon=[];
   for(let k=0;k<3;k++){
    const a=f[k],b=f[(k+1)%3],qa=chart.uv(point(a)),qb=chart.uv(point(b)),dx=qb[0]-qa[0],dy=qb[1]-qa[1],l=dx*dx+dy*dy;
    polygon.push(a);
    const extra=innerBoundary.filter(id=>id!==a&&id!==b).map(id=>{const q=chart.uv(point(id));return {id,t:((q[0]-qa[0])*dx+(q[1]-qa[1])*dy)/l,cross:(q[0]-qa[0])*dy-(q[1]-qa[1])*dx};})
     .filter(q=>q.t>1e-7&&q.t<1-1e-7&&Math.abs(q.cross)<1e-8).sort((a,b)=>a.t-b.t);
    polygon.push(...extra.map(q=>q.id));
   }
   if(polygon.length===3)add(f,part);
   else{const center=p.length/3;p.push(...[0,1,2].map(k=>f.reduce((s,id)=>s+point(id)[k],0)/3));
    for(let k=0;k<polygon.length;k++)add([center,polygon[k],polygon[(k+1)%polygon.length]],part);
   }
  }
  const guideByStation=new Map();
  for(const {k,edgeIds,inner}of sectors){
   if(!back){
    // M75 revision: fixed inner and outer edges have different curvature.
    // Match their directional slopes with a bounded cubic transition instead
    // of forcing that curved attachment into a short planar fan.
    function gridHeight(x,y){
     for(const {f} of gridFaces){
      const[a,b,c]=f.map(point),d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
      if(Math.abs(d)<1e-13)continue;
      const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d;
      const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
      if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)return u*a[2]+v*b[2]+(1-u-v)*c[2];
     }
     throw new Error('Quad transition lost inner facing owner');
    }
    const fractions=[0,.25,.5,.75,1],rows=[inner];
    for(const t of fractions.slice(1,-1)){
     const row=edgeIds.map((id,j)=>{
      const key=inner[j]+':'+t;if(guideByStation.has(key))return guideByStation.get(key);
      const a=point(inner[j]),b=point(id),dx=b[0]-a[0],dy=b[1]-a[1],delta=b[2]-a[2];
      let m0=(a[2]-gridHeight(a[0]-.02*dx,a[1]-.02*dy))/.02;
      let m1=(lookup(b[0]+.02*dx,b[1]+.02*dy).z-b[2])/.02;
      // Bound tangent overshoot locally; this is a geometric attachment,
      // not a new crown or a recess. Exact endpoint positions remain fixed.
      const limit=Math.max(Math.abs(delta)*3,Math.hypot(dx,dy)*.12);
      m0=Math.max(-limit,Math.min(limit,m0));m1=Math.max(-limit,Math.min(limit,m1));
      const h00=2*t*t*t-3*t*t+1,h10=t*t*t-2*t*t+t,h01=-2*t*t*t+3*t*t,h11=t*t*t-t*t;
      const z=h00*a[2]+h10*m0+h01*b[2]+h11*m1,index=p.length/3;
      p.push(a[0]+t*dx,a[1]+t*dy,z);guideByStation.set(key,index);return index;
     });
     rows.push(row);
    }
    rows.push(edgeIds);
    for(let band=0;band<rows.length-1;band++)for(let j=0;j<inner.length-1;j++){
     const a=rows[band],b=rows[band+1],part='RETURN_'+k+'_BLEND_'+band;
     add([a[j],b[j],b[j+1]],part);add([a[j],b[j+1],a[j+1]],part);
    }
    chart.returnSupport={method:'bounded cubic directional-slope transition',fractions,perimeterHeld:true,centralPlanesHeld:true};
    continue;
   }
   const guide=edgeIds.map((id,j)=>{
    if(guideByStation.has(inner[j]))return guideByStation.get(inner[j]);
    const a=point(inner[j]),b=point(id),x=(a[0]+b[0])/2,y=(a[1]+b[1])/2,index=p.length/3;
    // Corresponding-station return follows the authored posterior crown.
    const v=chart.uv([x,y,0])[1],blend=smooth(v/.22),retainedZ=lookup(x,y).z;
    const guideZ=retainedZ+blend*((a[2]+b[2])/2-retainedZ);
    p.push(x,y,guideZ);guideByStation.set(inner[j],index);return index;
   });
   for(let j=0;j<inner.length-1;j++){
    add([inner[j],guide[j],guide[j+1]],'RETURN_'+k);add([inner[j],guide[j+1],inner[j+1]],'RETURN_'+k);
    add([guide[j],edgeIds[j],edgeIds[j+1]],'RETURN_'+k);add([guide[j],edgeIds[j+1],guide[j+1]],'RETURN_'+k);
   }
  }
  if(back){
   // M83: fit the proximal support row as one geometric system. Match
   // neighboring plane gradients with fixed crown and perimeter positions.
   const supportIds=[...new Set(guideByStation.values())].filter(id=>chart.uv(point(id))[1]>.03).sort((a,b)=>{const x=chart.uv(point(a)),y=chart.uv(point(b));return Math.round(x[1]*1e10)-Math.round(y[1]*1e10)||Math.round(x[0]*1e10)-Math.round(y[0]*1e10);});
   const supportIndex=new Map(supportIds.map((id,i)=>[id,i])),count=supportIds.length,matrix=Array.from({length:count},()=>new Float64Array(count+1)),edges=new Map(),terms=[];
   const gradients=faces.map(f=>{const[a,b,c]=f.map(point),d=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
    if(Math.abs(d)<1e-14)return null;
    return{f,coeff:[[b[1]-c[1],c[1]-a[1],a[1]-b[1]],[c[0]-b[0],a[0]-c[0],b[0]-a[0]]].map(q=>q.map(v=>v/d))};});
   faces.forEach((f,i)=>{for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a,e=edges.get(key)||{a,b,faces:[]};e.faces.push(i);edges.set(key,e);}});
   for(const edge of edges.values()){
    if(edge.faces.length!==2)continue;const[a,b]=edge.faces.map(i=>gradients[i]);if(!a||!b||!a.f.concat(b.f).some(id=>supportIndex.has(id)))continue;
    const pa=point(edge.a),pb=point(edge.b),weight=Math.max(1e-8,Math.hypot(pa[0]-pb[0],pa[1]-pb[1]));
    for(let axis=0;axis<2;axis++){
     const coefficients=new Map();let residual=0;
     for(const[g,sign]of[[a,1],[b,-1]])for(let k=0;k<3;k++){const value=sign*g.coeff[axis][k],id=g.f[k];residual+=value*p[id*3+2];if(supportIndex.has(id)){const j=supportIndex.get(id);coefficients.set(j,(coefficients.get(j)||0)+value);}}
     const values=[...coefficients].filter(([,q])=>Math.abs(q)>1e-10);if(!values.length)continue;terms.push({values,residual,weight});
     for(const[i,q]of values){matrix[i][count]-=weight*q*residual;for(const[j,v]of values)matrix[i][j]+=weight*q*v;}
    }
   }
   for(let i=0;i<count;i++)matrix[i][i]*=1+1e-9;
   for(let k=0;k<count;k++){let pivot=k;for(let i=k+1;i<count;i++)if(Math.abs(matrix[i][k])>Math.abs(matrix[pivot][k]))pivot=i;
    [matrix[k],matrix[pivot]]=[matrix[pivot],matrix[k]];const d=matrix[k][k];if(Math.abs(d)<1e-12)throw new Error('Hamstring support fit is singular');
    for(let j=k;j<=count;j++)matrix[k][j]/=d;
    for(let i=0;i<count;i++)if(i!==k){const f=matrix[i][k];if(!f)continue;for(let j=k;j<=count;j++)matrix[i][j]-=f*matrix[k][j];}}
   const delta=matrix.map(row=>row[count]),maximumMove=Math.max(...delta.map(Math.abs));if(maximumMove>.004)throw new Error('Hamstring support fit exceeds local displacement bound');
   const energy=ds=>terms.reduce((s,t)=>s+t.weight*(t.residual+t.values.reduce((a,[i,q])=>a+q*ds[i],0))**2,0);
   const beforeEnergy=energy(delta.map(()=>0)),afterEnergy=energy(delta);if(afterEnergy>beforeEnergy+1e-10)throw new Error('Hamstring support fit increased bending');
   supportIds.forEach((id,i)=>p[id*3+2]+=delta[i]);
   chart.proximalSupportFit={method:'coupled plane-gradient least squares on existing support row',vertices:count,terms:terms.length,maximumMove,beforeEnergy,afterEnergy,crownAndPerimeterFixed:true};
  }
  if(!back){
   // M76: two-dimensional corner reconstruction. Fair the offset from the
   // retained anatomical stock, not the body itself. Positive mean-value
   // coordinates preserve its broad curvature while removing radial fold lines.
   const active=faceRegions.filter(q=>q.chart===chart),neighbors=new Map();
   const residual=new Map(),originalCornerZ=new Map(),unknown=[];
   const getResidual=id=>{
    if(!residual.has(id)){const q=point(id);residual.set(id,q[2]-lookup(q[0],q[1]).z);}
    return residual.get(id);
   };
   for(const {face}of active)for(let i=0;i<3;i++){
    const id=face[i],a=point(id),left=face[(i+1)%3],right=face[(i+2)%3],b=point(left),c=point(right);
    const ux=b[0]-a[0],uy=b[1]-a[1],vx=c[0]-a[0],vy=c[1]-a[1],lu=Math.hypot(ux,uy),lv=Math.hypot(vx,vy);
    const den=lu*lv+ux*vx+uy*vy,half=Math.abs(ux*vy-uy*vx)/Math.max(1e-20,den);
    if(lu<1e-10||lv<1e-10||!Number.isFinite(half))continue;
    const n=neighbors.get(id)||new Map();
    n.set(left,(n.get(left)||0)+half/lu);n.set(right,(n.get(right)||0)+half/lv);neighbors.set(id,n);
   }
   for(const [id,n]of neighbors){
    const q=point(id),[u,v]=chart.uv(q),r=Math.abs(u)+Math.abs(v);
    if(r<=.805+1e-7||r>=1-1e-7)continue;
    const corner=cornersUV.map(([a,b],index)=>({index,amount:Math.max(Math.abs(u/r-a),Math.abs(v/r-b))})).sort((a,b)=>a.amount-b.amount)[0];
    if(corner.index===2||corner.amount>=.22)continue;
    const weights=[...n].map(([j,w])=>[j,w]),sum=weights.reduce((s,q)=>s+q[1],0);
    if(!(sum>0))continue;
    originalCornerZ.set(id,q[2]);getResidual(id);weights.forEach(([j])=>getResidual(j));
    unknown.push({id,corner:corner.index,weights:weights.map(([j,w])=>[j,w/sum])});
   }
   // Exact local Dirichlet solve: the tiny perimeter triangles make
   // fixed-iteration relaxation converge too slowly and drift across mirrors.
   const count=unknown.length,indexById=new Map(unknown.map((q,i)=>[q.id,i]));
   const matrix=unknown.map(({weights},i)=>{
    const row=new Float64Array(count+1);row[i]=1;
    for(const[j,w]of weights){const k=indexById.get(j);if(k===undefined)row[count]+=w*residual.get(j);else row[k]-=w;}
    return row;
   });
   for(let k=0;k<count;k++){
    let pivot=k;for(let i=k+1;i<count;i++)if(Math.abs(matrix[i][k])>Math.abs(matrix[pivot][k]))pivot=i;
    if(Math.abs(matrix[pivot][k])<1e-14)throw new Error('Quad corner support system is singular');
    [matrix[k],matrix[pivot]]=[matrix[pivot],matrix[k]];
    for(let i=k+1;i<count;i++){
     const f=matrix[i][k]/matrix[k][k];matrix[i][k]=0;
     for(let j=k+1;j<=count;j++)matrix[i][j]-=f*matrix[k][j];
    }
   }
   const solution=new Float64Array(count);
   for(let i=count-1;i>=0;i--){
    let value=matrix[i][count];for(let j=i+1;j<count;j++)value-=matrix[i][j]*solution[j];
    solution[i]=value/matrix[i][i];residual.set(unknown[i].id,solution[i]);
   }
   const maximumResidual=Math.max(0,...unknown.map(({id,weights})=>Math.abs(residual.get(id)-weights.reduce((s,[j,w])=>s+w*residual.get(j),0))));
   let maximumMove=0;
   for(const {id}of unknown){
    const q=point(id),z=lookup(q[0],q[1]).z+residual.get(id);
    maximumMove=Math.max(maximumMove,Math.abs(z-originalCornerZ.get(id)));p[id*3+2]=z;
   }
   chart.cornerReconstruction={method:'mean-value harmonic residual over retained anatomical stock',scope:'outer, superior and inferior corners; fixed inner collar, inner corner and outer/side boundaries',cornerSpan:.22,fixedInnerRadius:.805,vertices:unknown.length,solver:'pivoted direct linear solve',maximumResidual,maximumMove};
  }
  if(!back){
   // M77: a six-sided clipped support cap replaces the superior radial fan.
   // Its facing is a real plane fitted to the retained local anatomy. The
   // perimeter is fixed; six small return sectors join it into the live mesh.
   const capPolygon=[[.075,.86],[.04,.94],[-.04,.94],[-.075,.86],[-.04,.81],[.04,.81]];
   const capCenter=[0,.875],capScale=.65;
   const capSides=capPolygon.map((a,k)=>({a,b:capPolygon[(k+1)%capPolygon.length]}));
   const capInside=(u,v)=>capSides.every(({a,b})=>(b[0]-a[0])*(v-a[1])-(b[1]-a[1])*(u-a[0])>=-1e-8);
   const liveTriangles=faces.map(f=>f.map(point));
   function capSample(x,y){
    let best=-Infinity;
    for(const[a,b,c]of liveTriangles){
     if(a[2]<=0)continue;
     const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-13)continue;
     const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
     if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)best=Math.max(best,u*a[2]+v*b[2]+(1-u-v)*c[2]);
    }
    if(!Number.isFinite(best))throw new Error('Superior cap escaped retained surface');return best;
   }
   for(const {a,b}of capSides)cut(chart,(u,v)=>(b[0]-a[0])*(v-a[1])-(b[1]-a[1])*(u-a[0]),false,true);
   const capFaces=faces.filter(f=>{
    const q=f.map(point);if(q.some(q=>q[2]<=0))return false;
    const uv=q.map(q=>chart.uv(q));return capInside(uv.reduce((s,q)=>s+q[0],0)/3,uv.reduce((s,q)=>s+q[1],0)/3);
   });
   const selected=new Set(capFaces),boundary=new Map();
   for(const f of capFaces)for(let k=0;k<3;k++){
    const a=f[k],b=f[(k+1)%3],key=[a,b].sort((a,b)=>a-b).join(':');
    const e=boundary.get(key)||{a,b,count:0};e.count++;boundary.set(key,e);
   }
   const outerEdges=[...boundary.values()].filter(e=>e.count===1),outerIds=[...new Set(outerEdges.flatMap(e=>[e.a,e.b]))];
   const degrees=new Map();for(const e of outerEdges)for(const id of[e.a,e.b])degrees.set(id,(degrees.get(id)||0)+1);
   if(!outerIds.length||[...degrees.values()].some(n=>n!==2))throw new Error('Superior cap boundary is not one disk');
   const oldCapPoints=new Map(outerIds.map(id=>[id,point(id)]));
   const fitMatrix=Array.from({length:3},()=>[0,0,0,0]);
   for(const [u,v]of capPolygon){
    const q=[capCenter[0]+capScale*(u-capCenter[0]),capCenter[1]+capScale*(v-capCenter[1])],basis=[1,q[0],q[1]-capCenter[1]],z=capSample(...chart.xy(...q));
    for(let i=0;i<3;i++){for(let j=0;j<3;j++)fitMatrix[i][j]+=basis[i]*basis[j];fitMatrix[i][3]+=basis[i]*z;}
   }
   for(let k=0;k<3;k++){
    let pivot=k;for(let i=k+1;i<3;i++)if(Math.abs(fitMatrix[i][k])>Math.abs(fitMatrix[pivot][k]))pivot=i;
    [fitMatrix[k],fitMatrix[pivot]]=[fitMatrix[pivot],fitMatrix[k]];
    const d=fitMatrix[k][k];if(Math.abs(d)<1e-14)throw new Error('Superior cap fit is singular');
    for(let j=k;j<4;j++)fitMatrix[k][j]/=d;
    for(let i=0;i<3;i++)if(i!==k){const f=fitMatrix[i][k];for(let j=k;j<4;j++)fitMatrix[i][j]-=f*fitMatrix[k][j];}
   }
   const fit=fitMatrix.map(q=>q[3]),height=(u,v)=>fit[0]+fit[1]*u+fit[2]*(v-capCenter[1]);
   const keptFaces=[],keptParents=[];
   faces.forEach((f,i)=>{if(!selected.has(f)){keptFaces.push(f);keptParents.push(parents[i]);}});
   faces=keptFaces;parents=keptParents;
   const remaining=faceRegions.filter(q=>!selected.has(q.face));faceRegions.length=0;faceRegions.push(...remaining);
   const innerByOuter=new Map();
   for(const id of outerIds){
    const [u,v]=chart.uv(point(id)),iu=capCenter[0]+capScale*(u-capCenter[0]),iv=capCenter[1]+capScale*(v-capCenter[1]),[x,y]=chart.xy(iu,iv),j=p.length/3;
    p.push(x,y,height(iu,iv));innerByOuter.set(id,j);
   }
   const centerId=p.length/3;p.push(...chart.xy(...capCenter),height(...capCenter));
   for(const edge of outerEdges){
    let a=edge.a,b=edge.b;
    const [u,v]=chart.uv(point(a).map((q,k)=>(q+point(b)[k])/2));
    const sector=capSides.map(({a,b},k)=>({k,d:Math.abs((b[0]-a[0])*(v-a[1])-(b[1]-a[1])*(u-a[0]))/Math.hypot(b[0]-a[0],b[1]-a[1])})).sort((a,b)=>a.d-b.d)[0].k;
    // Mirror the anatomical diagonal, not the winding-dependent edge order.
    // These return quads have curved outer edges, so opposite diagonals would
    // otherwise create a different visible surface on the two sides.
    const qa=chart.uv(point(a)),qb=chart.uv(point(b)),side=capSides[sector];
    if((qb[0]-qa[0])*(side.b[0]-side.a[0])+(qb[1]-qa[1])*(side.b[1]-side.a[1])<0)[a,b]=[b,a];
    const ia=innerByOuter.get(a),ib=innerByOuter.get(b);
    add([centerId,ia,ib],'RETURN_CAP_FACING');
    add([ia,a,b],'RETURN_CAP_TRANSITION_'+sector);add([ia,b,ib],'RETURN_CAP_TRANSITION_'+sector);
   }
   chart.superiorCap={method:'fitted clipped-hexagon support plane with six perimeter returns',polygon:capPolygon,center:capCenter,innerScale:capScale,fit,
    removedTriangles:capFaces.length,addedTriangles:outerEdges.length*3,boundaryVertices:outerIds.length,maximumBoundaryDrift:Math.max(...outerIds.map(id=>Math.hypot(...minus(point(id),oldCapPoints.get(id)))))};

   // M78: broad cap-to-thigh insertion plane with bounded side returns.
   // Reuse the live mesh; only cut the three facing boundaries. The cap's
   // lower edge owns the upper attachment and the retained thigh owns the base.
   const bridgeTop=capCenter[1]+capScale*(.81-capCenter[1]),bridgeBase=.778,bridgeFloor=.742;
   const bridgeTopZ=height(0,bridgeTop),bridgeBaseZ=capSample(...chart.xy(0,bridgeBase));
   const bridgeSlope=(bridgeTopZ-bridgeBaseZ)/(bridgeTop-bridgeBase);
   const bridgeHeight=(u,v)=>bridgeTopZ+fit[1]*u+bridgeSlope*(v-bridgeTop);
   const bridgeCoreWidth=v=>.035+(.026-.035)*(v-bridgeBase)/(bridgeTop-bridgeBase);
   const bridgeOuterWidth=v=>v<.81?.08+(.065-.08)*(v-bridgeFloor)/(.81-bridgeFloor):.065+(.026-.065)*(v-.81)/(bridgeTop-.81);
   const bounds=[-.081,.081,bridgeFloor-1e-8,bridgeTop+1e-8];
   cut(chart,(u,v)=>v-bridgeBase,false,bounds);
   for(const side of [-1,1])cut(chart,(u,v)=>side*u-bridgeCoreWidth(v),false,bounds);
   let bridgeMoved=0,bridgeMaxMove=0;
   const usedBridge=new Set(faces.flat()),oldBridge=new Map();
   for(const id of usedBridge){
    const q=point(id),[u,v]=chart.uv(q);if(q[2]<=0||v<bridgeFloor||v>bridgeTop-1e-9)continue;
    const outer=bridgeOuterWidth(v),core=bridgeCoreWidth(v);if(Math.abs(u)>=outer)continue;
    const lateral=Math.max(0,Math.min(1,(outer-Math.abs(u))/(outer-core)));
    const longitudinal=Math.max(0,Math.min(1,(v-bridgeFloor)/(bridgeBase-bridgeFloor)));
    const ease=t=>t*t*(3-2*t);
    const weight=ease(lateral)*ease(longitudinal),z=q[2]+weight*(bridgeHeight(u,v)-q[2]);
    oldBridge.set(id,q);p[id*3+2]=z;bridgeMoved++;bridgeMaxMove=Math.max(bridgeMaxMove,Math.abs(z-q[2]));
   }
   for(const e of faceRegions){
    if(e.chart!==chart)continue;
    const uv=e.face.map(id=>chart.uv(point(id))),u=uv.reduce((s,q)=>s+q[0],0)/3,v=uv.reduce((s,q)=>s+q[1],0)/3;
    if(v<bridgeFloor||v>bridgeTop-1e-9||Math.abs(u)>bridgeOuterWidth(v))continue;
    const core=uv.every(([u,v])=>v>=bridgeBase-1e-8&&v<=bridgeTop+1e-8&&Math.abs(u)<=bridgeCoreWidth(v)+1e-8);
    e.part=core?'RETURN_BRIDGE_FACING':v<bridgeBase?'RETURN_BRIDGE_BASE':u<0?'RETURN_BRIDGE_MEDIAL':'RETURN_BRIDGE_LATERAL';
   }
   chart.superiorBridge={method:'cap-edge anchored insertion plane with derivative-matched transverse and basal returns',top:bridgeTop,base:bridgeBase,floor:bridgeFloor,coreWidths:[.035,.026],plane:[bridgeTopZ,fit[1],bridgeSlope],movedVertices:bridgeMoved,maximumMove:bridgeMaxMove};


   // M80: clip the unresolved quad apex to a shared transverse support edge.
   // Replace the old tip and basal fan in the live mesh. Two ruled wedges join
   // that edge directly to the retained lower edge of the M78 bridge.
   const junctionPolygon=[[-.022,.718],[.022,.718],[.035,.778],[-.035,.778]];
   const junctionSides=junctionPolygon.map((a,k)=>({a,b:junctionPolygon[(k+1)%4]}));
   const junctionInside=(u,v)=>junctionSides.every(({a,b})=>(b[0]-a[0])*(v-a[1])-(b[1]-a[1])*(u-a[0])>=-1e-9);
   const junctionStock=faces.map(f=>f.map(point));
   const junctionSample=(u,v)=>{const[x,y]=chart.xy(u,v);let z=-Infinity;
    for(const[a,b,c]of junctionStock){if(a[2]<=0)continue;const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-13)continue;
     const s=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d,t=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
     if(s>=-1e-8&&t>=-1e-8&&s+t<=1+1e-8)z=Math.max(z,s*a[2]+t*b[2]+(1-s-t)*c[2]);}
    if(!Number.isFinite(z))throw new Error('Quad apex junction escaped stock');return z;
   };
   const junctionCorners=junctionPolygon.map(([u,v])=>[...chart.xy(u,v),junctionSample(u,v)]);
   const junctionBounds=[-.041,.041,.710,.785];
   for(const {a,b}of junctionSides)cut(chart,(u,v)=>(b[0]-a[0])*(v-a[1])-(b[1]-a[1])*(u-a[0]),false,junctionBounds);
   const ja=junctionPolygon[0],jb=junctionPolygon[2],diagonal=(u,v)=>(jb[0]-ja[0])*(v-ja[1])-(jb[1]-ja[1])*(u-ja[0]);
   cut(chart,diagonal,false,junctionBounds);
   const selectedJunction=faces.filter(f=>{const q=f.map(point);if(q.some(q=>q[2]<=0))return false;const uv=q.map(chart.uv);return junctionInside(uv.reduce((s,q)=>s+q[0],0)/3,uv.reduce((s,q)=>s+q[1],0)/3);});
   const selectedSet=new Set(selectedJunction),junctionBoundary=new Map();
   for(const f of selectedJunction)for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a,e=junctionBoundary.get(key)||{a,b,count:0};e.count++;junctionBoundary.set(key,e);}
   const junctionEdges=[...junctionBoundary.values()].filter(e=>e.count===1),junctionIds=[...new Set(junctionEdges.flatMap(e=>[e.a,e.b]))],junctionDegrees=new Map();
   for(const e of junctionEdges)for(const id of[e.a,e.b])junctionDegrees.set(id,(junctionDegrees.get(id)||0)+1);
   if(!junctionIds.length||[...junctionDegrees.values()].some(q=>q!==2))throw new Error('Quad apex junction is not a disk');
   const junctionTriangles=[[0,1,2],[0,2,3]],junctionPlane=(u,v,sector)=>{
    const ids=junctionTriangles[sector],[a,b,c]=ids.map(i=>junctionPolygon[i]),zs=ids.map(i=>junctionCorners[i][2]),d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    const s=((b[1]-c[1])*(u-c[0])+(c[0]-b[0])*(v-c[1]))/d,t=((c[1]-a[1])*(u-c[0])+(a[0]-c[0])*(v-c[1]))/d;return s*zs[0]+t*zs[1]+(1-s-t)*zs[2];
   };
   const junctionBefore=new Map(junctionIds.map(id=>[id,p[id*3+2]]));
   let junctionMove=0;
   for(const id of junctionIds){const[u,v]=chart.uv(point(id)),z=junctionPlane(u,v,diagonal(u,v)>=0?1:0);junctionMove=Math.max(junctionMove,Math.abs(z-p[id*3+2]));p[id*3+2]=z;}
   const jf=[],jp=[];faces.forEach((f,i)=>{if(!selectedSet.has(f)){jf.push(f);jp.push(parents[i]);}});faces=jf;parents=jp;
   const jr=faceRegions.filter(e=>!selectedSet.has(e.face));faceRegions.length=0;faceRegions.push(...jr);

   // Carry the changed side-edge offset into its neighboring return geometry.
   // Crown and bridge owners remain Dirichlet boundaries; solve only the narrow
   // exterior collar, rather than leaving a displaced edge against stale stock.
   const junctionAdj=new Map(),junctionFixed=new Set();
   for(const f of faces)for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],as=junctionAdj.get(a)||new Set(),bs=junctionAdj.get(b)||new Set();as.add(b);bs.add(a);junctionAdj.set(a,as);junctionAdj.set(b,bs);}
   for(const e of faceRegions)if(e.chart===chart&&(e.part.startsWith('CROWN')||e.part.startsWith('FLOW')||e.part==='RETURN_CAP_FACING'||e.part==='RETURN_BRIDGE_FACING'))for(const id of e.face)junctionFixed.add(id);
   const junctionBoundarySet=new Set(junctionIds),junctionBoundaryDelta=new Map(junctionIds.map(id=>[id,p[id*3+2]-junctionBefore.get(id)]));
   const junctionUnknown=[...junctionAdj.keys()].filter(id=>{
    if(junctionBoundarySet.has(id)||junctionFixed.has(id))return false;const q=point(id),[u,v]=chart.uv(q);if(q[2]<=0||Math.abs(u)>.12||v<.69||v>.80)return false;
    return Math.min(...junctionIds.map(j=>{const a=point(j);return Math.hypot(q[0]-a[0],q[1]-a[1]);}))<.0035;
   }).sort((a,b)=>{const x=chart.uv(point(a)),y=chart.uv(point(b));return Math.round(x[1]*1e10)-Math.round(y[1]*1e10)||Math.round(x[0]*1e10)-Math.round(y[0]*1e10);});
   const junctionIndex=new Map(junctionUnknown.map((id,i)=>[id,i])),count=junctionUnknown.length,junctionMatrix=Array.from({length:count},()=>new Float64Array(count+1));
   for(let i=0;i<count;i++){const id=junctionUnknown[i],a=point(id);for(const j of junctionAdj.get(id)){const b=point(j),w=1/Math.max(1e-6,Math.hypot(b[0]-a[0],b[1]-a[1]));junctionMatrix[i][i]+=w;if(junctionIndex.has(j))junctionMatrix[i][junctionIndex.get(j)]-=w;else junctionMatrix[i][count]+=w*(junctionBoundaryDelta.get(j)||0);}}
   for(let k=0;k<count;k++){
    let pivot=k;for(let i=k+1;i<count;i++)if(Math.abs(junctionMatrix[i][k])>Math.abs(junctionMatrix[pivot][k]))pivot=i;
    [junctionMatrix[k],junctionMatrix[pivot]]=[junctionMatrix[pivot],junctionMatrix[k]];const d=junctionMatrix[k][k];if(Math.abs(d)<1e-12)throw new Error('Apex return collar is singular');
    for(let j=k;j<=count;j++)junctionMatrix[k][j]/=d;
    for(let i=0;i<count;i++)if(i!==k){const f=junctionMatrix[i][k];if(!f)continue;for(let j=k;j<=count;j++)junctionMatrix[i][j]-=f*junctionMatrix[k][j];}
   }
   let junctionHaloMove=0;for(let i=0;i<count;i++){const delta=junctionMatrix[i][count];p[junctionUnknown[i]*3+2]+=delta;junctionHaloMove=Math.max(junctionHaloMove,Math.abs(delta));}
   // Each triangle family is one actual plane. Extra boundary vertices only
   // maintain watertight attachment; they do not create extra visible facets.
   const junctionCornerIds=junctionPolygon.map(([u,v])=>junctionIds.find(id=>{const q=chart.uv(point(id));return Math.hypot(q[0]-u,q[1]-v)<1e-6;}));
   if(junctionCornerIds.some(id=>id===undefined))throw new Error('Quad apex corner missing after cuts');
   let junctionAdded=0;
   for(let sector=0;sector<2;sector++){
    const boundary=[];
    for(let k=0;k<3;k++){
     const ia=junctionTriangles[sector][k],ib=junctionTriangles[sector][(k+1)%3],a=junctionPolygon[ia],b=junctionPolygon[ib],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
     const candidates=junctionIds.map(id=>{const q=chart.uv(point(id));return{id,t:((q[0]-a[0])*dx+(q[1]-a[1])*dy)/length,d:Math.abs((q[0]-a[0])*dy-(q[1]-a[1])*dx)};}).filter(q=>q.t>=-1e-7&&q.t<1-1e-7&&q.d<1e-8).sort((a,b)=>a.t-b.t);
     boundary.push(...candidates.map(q=>q.id));
    }
    const uv=junctionTriangles[sector].reduce((s,i)=>s.map((q,k)=>q+junctionPolygon[i][k]/3),[0,0]),center=p.length/3;p.push(...chart.xy(...uv),junctionPlane(...uv,sector));
    for(let k=0;k<boundary.length;k++){add([center,boundary[k],boundary[(k+1)%boundary.length]],'RETURN_APEX_RELAY_'+(sector===0?'A':'B'));junctionAdded++;}
   }
   chart.apexJunction={method:'clipped quad tip joined to retained bridge by two ruled wedge planes',polygon:junctionPolygon,corners:junctionCorners,removedTriangles:selectedJunction.length,addedTriangles:junctionAdded,boundaryVertices:junctionIds.length,maximumBoundaryMove:junctionMove,returnCollar:{method:"harmonic boundary-offset continuation with fixed facing owners",radius:.0035,vertices:count,maximumMove:junctionHaloMove}};
   // M79: remove redundant cut vertices instead of adding another surface patch.
   // The link condition protects manifold topology. Existing anatomical facing
   // planes and owner boundaries constrain which endpoint may survive a collapse.
   const cleanup={method:'bounded owner-constrained redundant-edge collapse',collapsedEdges:0,removedTriangles:0,maximumEdgeLength:0,maximumFacingError:0};
   const protectedPart=part=>part==='RETURN_CAP_FACING'||part==='RETURN_BRIDGE_FACING'||part?.startsWith('RETURN_APEX_RELAY_')||part?.startsWith('CROWN')||part?.startsWith('FLOW');
   const angleQuality=f=>{const q=f.map(point),lens=q.map((a,k)=>Math.hypot(...minus(a,q[(k+1)%3])));return Math.min(...lens.map((a,k)=>Math.acos(Math.max(-1,Math.min(1,(a*a+lens[(k+2)%3]**2-lens[(k+1)%3]**2)/(2*a*lens[(k+2)%3]))))*180/Math.PI));};
   const local=id=>{const q=point(id),[u,v]=chart.uv(q);return q[2]>0&&Math.abs(u)<.16&&v>.685&&v<.84;};
   const canonical=id=>chart.uv(point(id)).map(v=>Math.round(v*1e10));
   for(let pass=0;pass<60;pass++){
    const regionByFace=new Map(faceRegions.map(e=>[e.face,e])),adjacent=new Map(),edges=new Map();
    faces.forEach((f,i)=>{for(const id of f){const s=adjacent.get(id)||[];s.push(i);adjacent.set(id,s);}for(let k=0;k<3;k++){
     const a=f[k],b=f[(k+1)%3];if(!local(a)||!local(b))continue;const key=a<b?a+':'+b:b+':'+a,e=edges.get(key)||{a,b,faces:[]};e.faces.push(i);edges.set(key,e);
    }});
    const candidates=[...edges.values()].filter(e=>e.faces.length===2).map(e=>({...e,length:Math.hypot(...minus(point(e.a),point(e.b)))})).filter(e=>e.length<.00055);
    const edgeKey=e=>[canonical(e.a),canonical(e.b)].sort((a,b)=>a[1]-b[1]||a[0]-b[0]).flat();
    candidates.sort((a,b)=>{const d=Math.round(a.length*1e10)-Math.round(b.length*1e10);if(d)return d;const ka=edgeKey(a),kb=edgeKey(b);for(let k=0;k<4;k++)if(ka[k]!==kb[k])return ka[k]-kb[k];return 0;});
    let accepted=null;
    for(const edge of candidates){
     const ends=[edge.a,edge.b].sort((a,b)=>canonical(a)[1]-canonical(b)[1]||canonical(a)[0]-canonical(b)[0]);
     for(const [keep,remove]of [[ends[0],ends[1]],[ends[1],ends[0]]]){
      const ri=adjacent.get(remove),ki=adjacent.get(keep),rf=ri.map(i=>faces[i]),regions=rf.map(f=>regionByFace.get(f));
      if(regions.some(e=>!e||e.chart!==chart)||rf.some(f=>f.some(id=>!local(id))))continue;
      const ownKeep=new Set(ki.map(i=>regionByFace.get(faces[i])?.part));if(regions.some(e=>!ownKeep.has(e.part)))continue;
      const rn=new Set(rf.flat().filter(id=>id!==remove)),kn=new Set(ki.flatMap(i=>faces[i]).filter(id=>id!==keep));
      const common=[...rn].filter(id=>id!==keep&&kn.has(id)),opposites=edge.faces.map(i=>faces[i].find(id=>id!==keep&&id!==remove));
      if(common.length!==2||common.some(id=>!opposites.includes(id)))continue;
      const replacements=[],kp=point(keep);let valid=true,planeError=0;
      for(let j=0;j<rf.length;j++){
       const f=rf[j],g=f.map(id=>id===remove?keep:id);if(new Set(g).size<3)continue;
       const[a,b,c]=f.map(point),[x,y,z]=g.map(point),n=cross(minus(b,a),minus(c,a)),m=cross(minus(y,x),minus(z,x));
       if(Math.hypot(...m)<2e-12||n[2]*m[2]<=0){valid=false;break;}
       if(protectedPart(regions[j].part)){
        const un=unit(n),error=Math.abs(minus(kp,a).reduce((s,q,k)=>s+q*un[k],0));planeError=Math.max(planeError,error);if(error>1e-10){valid=false;break;}
       }
       replacements.push({i:ri[j],face:g,region:regions[j]});
      }
      if(!valid||replacements.length!==rf.length-2)continue;
      const oldQuality=Math.min(...rf.map(angleQuality)),newQuality=Math.min(...replacements.map(e=>angleQuality(e.face)));
      if(newQuality<oldQuality+.01)continue;

      // Shape quality alone can rotate a skinny curved return into a crease.
      // Include the neighboring triangles and reject any worse maximum fold.
      const context=new Set([...ri,...ki]);
      for(const i of [...context])for(let k=0;k<3;k++){
       const a=faces[i][k],b=faces[i][(k+1)%3],bs=new Set(adjacent.get(b));for(const j of adjacent.get(a))if(bs.has(j))context.add(j);
      }
      const replacementByIndex=new Map(replacements.map(e=>[e.i,e.face])),removedIndices=new Set(ri);
      const beforeContext=[...context].map(i=>faces[i]),afterContext=[...context].flatMap(i=>replacementByIndex.has(i)?[replacementByIndex.get(i)]:removedIndices.has(i)?[]:[faces[i]]);
      const foldQuality=fs=>{
       const ns=fs.map(f=>{const[a,b,c]=f.map(point);return unit(cross(minus(b,a),minus(c,a)));}),es=new Map();
       fs.forEach((f,i)=>{for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a,e=es.get(key)||{a,b,indices:[]};e.indices.push(i);es.set(key,e);}});
       let maximum=0,energy=0;
       for(const e of es.values())if(e.indices.length===2){const[n,m]=e.indices.map(i=>ns[i]),angle=Math.acos(Math.max(-1,Math.min(1,n.reduce((s,q,k)=>s+q*m[k],0))))*180/Math.PI;maximum=Math.max(maximum,angle);energy+=angle*Math.hypot(...minus(point(e.a),point(e.b)));}
       return{maximum,energy};
      };
      const beforeFold=foldQuality(beforeContext),afterFold=foldQuality(afterContext);
      if(afterFold.maximum>beforeFold.maximum+1e-7||afterFold.energy>beforeFold.energy*1.02+1e-10)continue;
      accepted={keep,remove,ri,replacements,length:edge.length,planeError};break;
     }
     if(accepted)break;
    }
    if(!accepted)break;
    const changed=new Map(accepted.replacements.map(e=>[e.i,e])),removed=new Set(accepted.ri),nf=[],np=[],nr=[];
    faces.forEach((f,i)=>{const replacement=changed.get(i);if(replacement){nf.push(replacement.face);np.push(parents[i]);nr.push({...replacement.region,face:replacement.face});}
     else if(!removed.has(i)){nf.push(f);np.push(parents[i]);const e=regionByFace.get(f);if(e)nr.push(e);}});
    faces=nf;parents=np;faceRegions.length=0;faceRegions.push(...nr);
    cleanup.collapsedEdges++;cleanup.removedTriangles+=2;cleanup.maximumEdgeLength=Math.max(cleanup.maximumEdgeLength,accepted.length);cleanup.maximumFacingError=Math.max(cleanup.maximumFacingError,accepted.planeError);
   }
   chart.bridgeTopology=cleanup;
   // M81: one owned medial return wedge replaces the folded basal fan.
   // The inner side is the M80 support edge; the outer apex is sampled from
   // retained stock. Project only this bounded return triangle onto its plane.
   const medialPolygon=[[-.022,.718],[-.035,.778],[-.066,.758]];
   const medialStock=faces.map(f=>f.map(point));
   const medialSample=(u,v)=>{const[x,y]=chart.xy(u,v);let z=-Infinity;
    for(const[a,b,c]of medialStock){if(a[2]<=0)continue;const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-13)continue;
     const s=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d,t=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
     if(s>=-1e-8&&t>=-1e-8&&s+t<=1+1e-8)z=Math.max(z,s*a[2]+t*b[2]+(1-s-t)*c[2]);}
    if(!Number.isFinite(z))throw new Error('Medial return escaped retained stock');return z;};
   const medialCorners=medialPolygon.map(([u,v])=>[...chart.xy(u,v),medialSample(u,v)]);
   const medialSides=medialPolygon.map((a,k)=>({a,b:medialPolygon[(k+1)%3]}));
   const medialInside=(u,v)=>medialSides.every(({a,b})=>(b[0]-a[0])*(v-a[1])-(b[1]-a[1])*(u-a[0])>=-1e-10);
   const medialNormal=unit(cross(minus(medialCorners[1],medialCorners[0]),minus(medialCorners[2],medialCorners[0])));
   const medialHeight=(x,y)=>medialCorners[0][2]-(medialNormal[0]*(x-medialCorners[0][0])+medialNormal[1]*(y-medialCorners[0][1]))/medialNormal[2];
   for(const{a,b}of medialSides)cut(chart,(u,v)=>(b[0]-a[0])*(v-a[1])-(b[1]-a[1])*(u-a[0]),false,[-.074,-.016,.712,.784]);
   const medialVertices=new Set();let medialFaces=0;
   for(const e of faceRegions){if(e.chart!==chart)continue;const q=e.face.map(point),uv=q.map(chart.uv);
    if(q.some(q=>q[2]<=0)||!medialInside(uv.reduce((s,q)=>s+q[0],0)/3,uv.reduce((s,q)=>s+q[1],0)/3))continue;
    if(e.part==='RETURN_CAP_FACING'||e.part==='RETURN_BRIDGE_FACING'||e.part.startsWith('RETURN_APEX_RELAY')||e.part.startsWith('CROWN')||e.part.startsWith('FLOW'))throw new Error('Medial return overlaps protected facing');
    e.part='RETURN_APEX_MEDIAL_WEDGE';medialFaces++;for(const id of e.face)medialVertices.add(id);
   }
   let medialMove=0;for(const id of medialVertices){const q=point(id),z=medialHeight(q[0],q[1]);medialMove=Math.max(medialMove,Math.abs(z-q[2]));p[id*3+2]=z;}
   chart.apexMedialReturn={method:'retained support-edge anchored planar return wedge',polygon:medialPolygon,corners:medialCorners,averageNormal:medialNormal,vertices:medialVertices.size,triangles:medialFaces,maximumMove:medialMove};

  }
  const fit=null,crownNormal=null;
  chart.fit=fit;chart.boundaryVertices=ids.length;chart.removedFaces=inside.filter(Boolean).length;
  chart.maximumBoundaryDrift=Math.max(...retainedBoundary.map(([id,q])=>Math.hypot(...minus(point(id),q))));
  chart.crownNormal=crownNormal;charts.push(chart);
 }
 const next=facetedGeometry(p,faces,null,{inner:true,normalWeight:'angle'});
 const lookupCache=new Map();
 function sampleFor(id,parent){
  if(parent>=0){const exact=original[parent].indexOf(id);if(exact>=0)return {i:parent,w:[0,1,2].map(k=>k===exact?1:0)};}
  if(!lookupCache.has(id))lookupCache.set(id,lookup(...point(id)));return lookupCache.get(id);
 }
 for(const[name,attr]of Object.entries(old.attributes)){
  if(['position','normal','aPhysicalNormal','aCrystalNormal','aCrystalFamily','aBary','aMoldNormal'].includes(name))continue;
  const values=new attr.array.constructor(faces.length*3*attr.itemSize);
  faces.forEach((f,i)=>f.forEach((id,j)=>{
   const q=sampleFor(id,parents[i]);
   for(let k=0;k<attr.itemSize;k++)values[(i*3+j)*attr.itemSize+k]=q.w.reduce((s,w,n)=>s+w*attr.array[(q.i*3+n)*attr.itemSize+k],0);
   if(name==='aSmooth'){
    let normal=unit(Array.from(values.slice((i*3+j)*3,(i*3+j+1)*3)));
    if(innerNormals.has(id))normal=innerNormals.get(id);
    else if(id>=stock.length/3&&charts.some(c=>{const[u,v]=c.uv(point(id));return Math.abs(u)+Math.abs(v)<.99;}))
     normal=Array.from(next.attributes.aSmooth.array.slice((i*3+j)*3,(i*3+j+1)*3));
    values.set(normal,(i*3+j)*3);
   }
  }));
  next.setAttribute(name,new attr.constructor(values,attr.itemSize,attr.normalized));
 }
 // A shared position owns one clay normal; no lighting seams at stitched edges.
 const copies=new Map(),field=next.attributes.aSmooth;
 faces.forEach((f,i)=>f.forEach((id,j)=>{const key=point(id).map(q=>Math.round(q*1e6)).join(','),c=copies.get(key)||{sum:[0,0,0],ids:[]};
  const index=i*3+j;c.ids.push(index);c.sum=c.sum.map((q,k)=>q+field.array[index*3+k]);copies.set(key,c);}));
 for(const c of copies.values()){const n=unit(c.sum);for(const i of c.ids)field.setXYZ(i,...n);}
 const entries=new Map();
 for(const {face,chart,part}of faceRegions){
  const id=prefix+chart.side+'_'+part,[a,b,c]=face.map(point),n=cross(minus(b,a),minus(c,a)),area=Math.hypot(...n)/2;
  const sector=Number(part.split('_')[1]),owner=part.startsWith('CROWN')?ownerName+' muscle belly':part.startsWith('FLOW')?'longitudinal '+ownerName+' support':ownerName+' perimeter insertion';
  const e=entries.get(id)||{region:patchRegion,side:chart.side,planeId:id,planeType:part==='RETURN_CAP_FACING'?'clipped diamond':(part==='RETURN_BRIDGE_FACING'||part.startsWith('RETURN_APEX_RELAY_')||part==='RETURN_APEX_MEDIAL_WEDGE')?'long wedge':part.startsWith('RETURN')?'return plane':'long wedge',
   anatomicalOwner:owner,centerPosition:[0,0,0],apexDirection:[chart.sign*spec.flow,1,0],averageNormal:[0,0,0],adjacentPlanes:[],blackPointAdjacency:[],nearbyBlackPoints:[(back?'MRS_BP_GLUTE_RETURN_':'MRS_BP_KNEE_SUPERIOR_')+chart.side],adjacencyNote:'Convergence pocket lies outside this muscle patch; nearby anatomical association, no direct pocket-sidewall adjacency.',
   status:part.startsWith('RETURN')?'stitched retained contour; visual review pending':'authored planar surface; visual review pending',area:0,triangles:0};
  const normal=unit(n);if(!e.referenceNormal)e.referenceNormal=normal;
  e.maximumNormalSpreadDegrees=Math.max(e.maximumNormalSpreadDegrees||0,Math.acos(Math.max(-1,Math.min(1,normal.reduce((s,q,k)=>s+q*e.referenceNormal[k],0))))*180/Math.PI);
  e.area+=area;e.triangles++;e.centerPosition=e.centerPosition.map((q,k)=>q+(a[k]+b[k]+c[k])/3*area);e.averageNormal=e.averageNormal.map((q,k)=>q+n[k]);entries.set(id,e);
 }
 const owners=new Map();for(const f of faceRegions)for(let k=0;k<3;k++){
  const a=f.face[k],b=f.face[(k+1)%3],key=a<b?a+':'+b:b+':'+a,s=owners.get(key)||new Set();s.add(prefix+f.chart.side+'_'+f.part);owners.set(key,s);
 }
 for(const set of owners.values())for(const a of set)for(const b of set)if(a!==b&&!entries.get(a).adjacentPlanes.includes(b))entries.get(a).adjacentPlanes.push(b);
 for(const e of entries.values()){e.centerPosition=e.centerPosition.map(q=>q/e.area);e.averageNormal=unit(e.averageNormal);delete e.referenceNormal;}
 const report=result.mrsAuthoring;
 report.atlas=report.atlas.filter(e=>e.region!==kind).concat([...entries.values()]);
 for(const pocket of report.blackPoints)if(pocket.region===(back?'GLUTE_RETURN':'KNEE_SUPERIOR')){
  pocket.neighborPlanes=pocket.neighborPlanes.filter(id=>!id.startsWith(prefix));
  pocket[back?'downstreamRegion':'upstreamRegion']=patchRegion;
 }
 const families=new Map();
 for(const e of report.atlas){
  e.mirroredId=e.planeId.replace(e.side==='L'?'_L_':'_R_',e.side==='L'?'_R_':'_L_');
  if(e.region===patchRegion&&!e.planeId.includes('_RETURN_')){
   const family=e.planeId.slice(0,-2);e.designFamilyId=family;
   const members=families.get(family)||[];members.push(e);families.set(family,members);
  }
 }
 report.designFamilies=(report.designFamilies||[]).filter(f=>!f.familyId.startsWith(prefix)).concat([...families].map(([familyId,members])=>({familyId,side:members[0].side,familyType:'elongated diamond cell',memberPlanes:members.map(e=>e.planeId),
  memberNormalAngleDegrees:Math.acos(Math.max(-1,Math.min(1,members[0].averageNormal.reduce((s,q,k)=>s+q*members[1].averageNormal[k],0))))*180/Math.PI,
  status:'directional family; readable-plane closure remains open'})));
 report[back?'hamstringPatch':'quadPatch']={method:'longitudinal retained-surface diamond grid with eighteen facing/support planes per side and corresponding-station perimeter returns',baseline:back?'exact M64 after retained patella construction':'M73 retained quadriceps stock; fixed anatomical perimeter and knee patch',
  gridRadius:.74,gridCells:[3,3],crownLift:spec.lift,guideRadius:back?.87:null,proximalReturnMethod:back?'coupled plane-gradient support fit; crown and perimeter fixed':'bounded cubic directional-slope transition across four geometric support bands; fixed central planes and outer perimeter',
  charts:charts.map(c=>({side:c.side,center:c.center,width:2*c.w,height:spec.h+spec.lowerHeight,flow:c.flow,lowerExtent:spec.lowerHeight,upperExtent:spec.h,lowerFlow:spec.lowerFlow,fit:c.fit,boundaryVertices:c.boundaryVertices,removedFaces:c.removedFaces,maximumBoundaryDrift:c.maximumBoundaryDrift,crownNormal:c.crownNormal,...(back?{proximalSupportFit:c.proximalSupportFit}:{}),...(!back?{returnSupport:c.returnSupport,cornerReconstruction:c.cornerReconstruction,superiorCap:c.superiorCap,superiorBridge:c.superiorBridge,bridgeTopology:c.bridgeTopology,apexJunction:c.apexJunction}:{})})),
  originalTriangles:original.length,finalTriangles:faces.length,addedPositions:(p.length-stock.length)/3};
 report.addedTriangles=faces.length-report.originalTriangles;report.addedVertices=p.length/3-report.originalVertices;
 next.userData={...old.userData,mrsAuthoring:report};result.geometry=next;result.faces=faces;old.dispose();return report;
}

// M69: index the existing lateral return system on the final authoring surface.
// These are mapped curved return regions; their triangles are not a claim of
// fully closed major diamond faces. No additional geometry is created here.
function indexLateralInsertions(result){
 const report=result.mrsAuthoring,entries=new Map(),ownerByFace=new Map(),p=result.positions;
 const point=id=>p.slice(id*3,id*3+3);
 for(let i=0;i<result.faces.length;i++){
  const f=result.faces[i],q=f.map(point),c=q[0].map((v,k)=>(v+q[1][k]+q[2][k])/3);
  if(q.some(v=>v[2]>=0)||Math.abs(c[0])<.265||Math.abs(c[0])>.380||c[1]<1.035||c[1]>1.205)continue;
  const side=c[0]<0?'L':'R',part=c[1]<1.105?'DISTAL':'PROXIMAL',id='MRS_LATERAL_INSERTION_'+side+'_'+part;
  const n=cross(minus(q[1],q[0]),minus(q[2],q[0])),area=Math.hypot(...n)/2,normal=unit(n);
  const e=entries.get(id)||{region:'LATERAL_INSERTION',side,planeId:id,planeType:'return plane',faceFamily:'long wedge',anatomicalOwner:part==='PROXIMAL'?'lateral glute / hamstring insertion':'outer hamstring / thigh support',centerPosition:[0,0,0],apexDirection:unit([side==='L'?-.28:.28,1,0]),averageNormal:[0,0,0],adjacentPlanes:[],adjacencyCoverage:'between indexed lateral return regions',blackPointAdjacency:[],nearbyBlackPoints:['MRS_BP_GLUTE_RETURN_'+side],mirroredId:'MRS_LATERAL_INSERTION_'+(side==='L'?'R':'L')+'_'+part,status:'mapped curved return; broad-plane closure remains open',area:0,triangles:0,referenceNormal:normal,maximumNormalSpreadDegrees:0};
  e.area+=area;e.triangles++;e.centerPosition=e.centerPosition.map((v,k)=>v+c[k]*area);e.averageNormal=e.averageNormal.map((v,k)=>v+n[k]);
  e.maximumNormalSpreadDegrees=Math.max(e.maximumNormalSpreadDegrees,Math.acos(Math.max(-1,Math.min(1,normal.reduce((s,v,k)=>s+v*e.referenceNormal[k],0))))*180/Math.PI);
  entries.set(id,e);ownerByFace.set(i,id);
 }
 const edgeOwners=new Map();result.faces.forEach((f,i)=>{const id=ownerByFace.get(i);if(!id)return;for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a,ids=edgeOwners.get(key)||new Set();ids.add(id);edgeOwners.set(key,ids);}});
 for(const ids of edgeOwners.values())for(const a of ids)for(const b of ids)if(a!==b&&!entries.get(a).adjacentPlanes.includes(b))entries.get(a).adjacentPlanes.push(b);
 for(const e of entries.values()){e.centerPosition=e.centerPosition.map(v=>v/e.area);e.averageNormal=unit(e.averageNormal);delete e.referenceNormal;}
 report.atlas=report.atlas.filter(e=>e.region!=='LATERAL_INSERTION').concat([...entries.values()]);
 report.lateralInsertion={method:'existing lateral support released .45 from obsolete crease restoration, with original slope constraints',newTriangles:0,regions:[...entries.keys()],majorPlaneClosure:false};
 return report;
}


// M87: exact diamond crowns and four planar supports for the abdomen.
// Added after the retained lower-body master. XY and all outer chart stock
// remain fixed; this authors the surface rather than expanding the waist.
export function authorMrsAbdominalPlanes(result){
 const old=result.geometry,stock=result.positions.slice(),original=result.faces.map(f=>f.slice());
 const p=result.positions;let faces=original.map(f=>f.slice()),parents=faces.map((_,i)=>i);
 const point=id=>p.slice(id*3,id*3+3);
 const triangles=original.map(f=>f.map(id=>stock.slice(id*3,id*3+3)));
 const front=triangles.filter(t=>t.every(v=>v[2]>0)&&Math.max(...t.map(v=>v[1]))>1.40&&Math.min(...t.map(v=>v[1]))<1.87);
 const sample=(x,y)=>{
   let z=-Infinity;
   for(const [a,b,c]of front){
     const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(det)<1e-14)continue;
     const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/det;
     const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det;
     if(u>=-1e-9&&v>=-1e-9&&u+v<=1+1e-9)z=Math.max(z,u*a[2]+v*b[2]+(1-u-v)*c[2]);
   }
   if(!Number.isFinite(z))throw new Error('M87 chart outside retained torso '+[x,y]);return z;
 };
 const source=[
  ['RECTUS_SUPERIOR','upper rectus belly',.070,1.788,.052,.047,0],
  ['RECTUS_MIDDLE','middle rectus belly',.068,1.686,.048,.047,0],
  ['RECTUS_INFERIOR','lower rectus belly',.065,1.567,.045,.071,.10],
  ['OBLIQUE_RIB','oblique insertion at lower ribs',.210,1.783,.024,.030,.45],
  ['OBLIQUE_WAIST','oblique return into waist',.182,1.721,.024,.030,.45],
  ['OBLIQUE_PELVIC','oblique insertion above pelvis',.220,1.500,.024,.038,-.45],
  ['OBLIQUE_COMPRESS','oblique waist compression',.184,1.580,.024,.038,-.45]
 ];
 const defs=[];
 for(const [region,owner,x,y,w,h,flow]of source)for(const side of ['L','R']){
  const sign=side==='L'?-1:1,d={region,owner,x,y,w,h,flow,side,sign,back:false,id:'MRS_'+region+'_'+side};
  d.uv=(x,y)=>[(sign*x-d.x-d.flow*(y-d.y))/d.w,(y-d.y)/d.h];
  d.xy=(u,v)=>[sign*(d.x+d.w*u+d.flow*d.h*v),d.y+d.h*v];
  // Nine prescribed independent chart samples avoid the sparse-row fit failure.
  const samples=[[0,0],[.40,0],[-.40,0],[0,.40],[0,-.40],[.28,.28],[-.28,.28],[.28,-.28],[-.28,-.28]].map(([u,v])=>[u,v,(sample(...d.xy(u,v))+sample(-d.xy(u,v)[0],d.xy(u,v)[1]))/2]);
  d.fit=[samples.reduce((s,q)=>s+q[2],0)/samples.length,
    samples.reduce((s,q)=>s+q[0]*q[2],0)/samples.reduce((s,q)=>s+q[0]*q[0],0),
    samples.reduce((s,q)=>s+q[1]*q[2],0)/samples.reduce((s,q)=>s+q[1]*q[1],0)];
  d.fall=0;d.target=(u,v)=>d.fit[0]+d.fit[1]*u+d.fit[2]*v;
  defs.push(d);
 }
 // Adjacent authored charts need separate return collars. Overlap can
 // give one support face two incompatible heights and fold a narrow sliver.
 for(let i=0;i<defs.length;i++)for(let j=i+1;j<defs.length;j++){
  const a=defs[i],b=defs[j];if(a.side!==b.side)continue;
  for(let iu=0;iu<=16;iu++)for(let iv=0;iv<=16;iv++){
   const u=-1+iu/8,v=-1+iv/8;if(Math.abs(u)+Math.abs(v)>=1)continue;
   const xy=a.xy(u,v),uv=b.uv(...xy);
   if(Math.abs(uv[0])+Math.abs(uv[1])<1-1e-7)throw new Error('Overlapping M87 chart ownership '+a.id+' '+b.id);
  }
 }
 function cut(d,fn){
  const edges=new Map();
  for(const f of faces){
   const v=f.map(point);if(v.some(q=>d.back?q[2]>=0:q[2]<=0))continue;
   const uv=v.map(q=>d.uv(q[0],q[1]));
   if(Math.min(...uv.map(q=>q[0]))>1.12||Math.max(...uv.map(q=>q[0]))< -1.12||
      Math.min(...uv.map(q=>q[1]))>1.12||Math.max(...uv.map(q=>q[1]))< -1.12)continue;
   for(let k=0;k<3;k++){
    const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a;if(edges.has(key))continue;
    const u=point(a),v=point(b),su=fn(...d.uv(u[0],u[1])),sv=fn(...d.uv(v[0],v[1]));
    if(su*sv>=0||Math.abs(su)<1e-9||Math.abs(sv)<1e-9)continue;
    const t=su/(su-sv),length=Math.hypot(...minus(v,u));
    if(length*Math.min(t,1-t)<.000006)continue;
    const id=p.length/3;p.push(...u.map((q,i)=>q+(v[i]-q)*t));edges.set(key,id);
   }
  }
  const next=[],ps=[],add=(f,parent)=>{next.push(f);ps.push(parent);};
  faces.forEach((f,i)=>{
   const m=f.map((a,k)=>{const b=f[(k+1)%3];return edges.get(a<b?a+':'+b:b+':'+a);});
   const n=m.filter(x=>x!==undefined).length,parent=parents[i];
   if(n===0){add(f,parent);return;}
   if(n===1){const k=m.findIndex(x=>x!==undefined),a=f[k],b=f[(k+1)%3],c=f[(k+2)%3];add([a,m[k],c],parent);add([m[k],b,c],parent);}
   else if(n===2){
    const k=[0,1,2].find(k=>m[(k+2)%3]!==undefined&&m[k]!==undefined);
    const a=f[(k+2)%3],b=f[k],c=f[(k+1)%3],u=m[(k+2)%3],v=m[k];
    add([u,b,v],parent);
    const dist=(a,b)=>Math.hypot(...minus(point(a),point(b)));
    if(dist(a,v)<=dist(u,c)){add([a,u,v],parent);add([a,v,c],parent);}
    else {add([a,u,c],parent);add([u,v,c],parent);}
   }else{add([f[0],m[0],m[2]],parent);add([m[0],f[1],m[1]],parent);add([m[2],m[1],f[2]],parent);add([m[0],m[1],m[2]],parent);}
  });
  faces=next;parents=ps;
 }

 for(const d of defs){
  for(const r of [.54,1])for(const a of [-1,1])for(const b of [-1,1])cut(d,(u,v)=>a*u+b*v-r);
  cut(d,(u,v)=>u);cut(d,(u,v)=>v);
 }
 // Remove numerical slivers by collapsing their near-coincident edge globally,
 // before displacement. Original retained vertices always win over inserted ones.
 const representative=Array.from({length:p.length/3},(_,i)=>i);
 const rootId=id=>{while(representative[id]!==id){representative[id]=representative[representative[id]];id=representative[id];}return id;};
 let collapsedEdges=0;
 for(const f of faces)for(let k=0;k<3;k++){
  const a=rootId(f[k]),b=rootId(f[(k+1)%3]);if(a===b||(a<stock.length/3&&b<stock.length/3))continue;
  if(Math.hypot(...minus(point(a),point(b)))<.000020){representative[Math.max(a,b)]=Math.min(a,b);collapsedEdges++;}
 }
 // Collapsing a near-duplicate can leave a collinear three-corner face.
 // Resolve these in the projected authoring chart before any depth edit.
 for(let pass=0;pass<12;pass++){
  let changes=0;
  for(const source of faces){
   const f=source.map(rootId);if(new Set(f).size<3||f.every(id=>id<stock.length/3))continue;
   const [a,b,c]=f.map(point),areaXY=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));
   if(areaXY>=2e-10)continue;
   const candidates=f.map((id,k)=>[id,f[(k+1)%3]])
    .filter(([i,j])=>!(i<stock.length/3&&j<stock.length/3))
    .sort((u,v)=>Math.hypot(...minus(point(u[0]),point(u[1])))-Math.hypot(...minus(point(v[0]),point(v[1]))));
   const edge=candidates[0];if(!edge||Math.hypot(...minus(point(edge[0]),point(edge[1])))>.0002)continue;
   representative[Math.max(...edge)]=Math.min(...edge);changes++;collapsedEdges++;
  }
  if(!changes)break;
 }

 const kept=[],keptParents=[];
 faces.forEach((f,i)=>{const q=f.map(rootId);if(new Set(q).size===3){kept.push(q);keptParents.push(parents[i]);}});
 faces=kept;parents=keptParents;

 // A collinear face means its long edge skipped a real middle vertex.
 // Restore the edge topology by splitting the adjacent face at that vertex;
 // deleting the zero-area face alone would open the mesh.
 let repairedCollinearFaces=0;
 for(let pass=0;pass<32;pass++){
  const i=faces.findIndex(f=>{
   if(f.every(id=>id<stock.length/3))return false;
   const [a,b,c]=f.map(point);
   return Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))<1e-12&&
    Math.abs(a[2])>.1&&a[1]>1.40&&a[1]<1.86;
  });
  if(i<0)break;
  const f=faces[i],edges=f.map((a,k)=>[a,f[(k+1)%3]]);
  edges.sort((a,b)=>Math.hypot(...minus(point(b[0]),point(b[1])))-Math.hypot(...minus(point(a[0]),point(a[1]))));
  const [a,b]=edges[0],middle=f.find(id=>id!==a&&id!==b);
  const j=faces.findIndex((q,k)=>k!==i&&q.includes(a)&&q.includes(b)&&!q.includes(middle));
  if(j<0)throw new Error('Unresolved collinear authoring edge');
  const q=faces[j],k=q.findIndex((id,k)=>(id===a&&q[(k+1)%3]===b)||(id===b&&q[(k+1)%3]===a));
  const u=q[k],v=q[(k+1)%3],w=q[(k+2)%3],parent=parents[j];
  faces[j]=[u,middle,w];faces.push([middle,v,w]);parents.push(parent);
  faces.splice(i,1);parents.splice(i,1);repairedCollinearFaces++;
 }


 const undeformed=p.slice();
 // Constrain one shared offset per mirrored chart, preserving coplanarity.
 for(const region of source.map(s=>s[0])){
  const pair=defs.filter(d=>d.region===region);let lower=-Infinity,upper=Infinity;
  for(const d of pair)for(let id=0;id<p.length/3;id++){
    const [x,y,z]=point(id),[u,v]=d.uv(x,y),r=Math.abs(u)+Math.abs(v);
    if(z<=0||r>.54+1e-8)continue;
    const target=d.target(u,v);
    lower=Math.max(lower,z-.012-target);upper=Math.min(upper,z+.004-target);
  }
  if(lower>upper+1e-9)throw new Error('M87 facing cannot fit retained envelope '+region+' '+[lower,upper]);
  const offset=Math.max(lower,Math.min(upper,0));for(const d of pair){d.fit[0]+=offset;d.offset=offset;}
 }
 const changed=new Set();let maximumInward=0,maximumOutward=0;
 for(let id=0;id<p.length/3;id++){
  const [x,y,z]=point(id);if(z<=0)continue;
  for(const d of defs){
    const [u,v]=d.uv(x,y),r=Math.abs(u)+Math.abs(v);if(r>=1-1e-10)continue;
    const weight=r<=.54+1e-8?1:0;
    const dz=(d.target(u,v)-z)*weight;p[id*3+2]+=dz;
    if(Math.abs(dz)>1e-10)changed.add(id);
    maximumInward=Math.max(maximumInward,-dz);maximumOutward=Math.max(maximumOutward,dz);break;
  }
 }
 for(const d of defs){
   // M84: fit the abdominal support collar as one geometric system. Match
   // neighboring plane gradients with fixed crown and perimeter positions.
   const usedIds=[...new Set(faces.flat())];
   const supportIds=usedIds.filter(id=>{const q=point(id),[u,v]=d.uv(q[0],q[1]),r=Math.abs(u)+Math.abs(v);return q[2]>0&&r>.54+1e-8&&r<1-1e-8;}).sort((a,b)=>{const x=point(a),y=point(b);return Math.round(x[1]*1e10)-Math.round(y[1]*1e10)||Math.round(Math.abs(x[0])*1e10)-Math.round(Math.abs(y[0])*1e10);});
   const supportIndex=new Map(supportIds.map((id,i)=>[id,i])),count=supportIds.length,matrix=Array.from({length:count},()=>new Float64Array(count+1)),edges=new Map(),terms=[];
   const gradients=faces.map(f=>{const[a,b,c]=f.map(point),d=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
    if(Math.abs(d)<1e-14)return null;
    return{f,coeff:[[b[1]-c[1],c[1]-a[1],a[1]-b[1]],[c[0]-b[0],a[0]-c[0],b[0]-a[0]]].map(q=>q.map(v=>v/d))};});
   faces.forEach((f,i)=>{for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a,e=edges.get(key)||{a,b,faces:[]};e.faces.push(i);edges.set(key,e);}});
   for(const edge of edges.values()){
    if(edge.faces.length!==2)continue;const[a,b]=edge.faces.map(i=>gradients[i]);if(!a||!b||!a.f.concat(b.f).some(id=>supportIndex.has(id)))continue;
    const pa=point(edge.a),pb=point(edge.b),weight=Math.max(1e-8,Math.hypot(pa[0]-pb[0],pa[1]-pb[1]));
    for(let axis=0;axis<2;axis++){
     const coefficients=new Map();let residual=0;
     for(const[g,sign]of[[a,1],[b,-1]])for(let k=0;k<3;k++){const value=sign*g.coeff[axis][k],id=g.f[k];residual+=value*p[id*3+2];if(supportIndex.has(id)){const j=supportIndex.get(id);coefficients.set(j,(coefficients.get(j)||0)+value);}}
     const values=[...coefficients].filter(([,q])=>Math.abs(q)>1e-10);if(!values.length)continue;terms.push({values,residual,weight});
     for(const[i,q]of values){matrix[i][count]-=weight*q*residual;for(const[j,v]of values)matrix[i][j]+=weight*q*v;}
    }
   }
   for(let i=0;i<count;i++)matrix[i][i]*=1+1e-9;
   const system=matrix.map(row=>Array.from(row));
   for(let k=0;k<count;k++){let pivot=k;for(let i=k+1;i<count;i++)if(Math.abs(matrix[i][k])>Math.abs(matrix[pivot][k]))pivot=i;
    [matrix[k],matrix[pivot]]=[matrix[pivot],matrix[k]];const d=matrix[k][k];if(Math.abs(d)<1e-12)throw new Error('Abdominal support fit is singular');
    for(let j=k;j<=count;j++)matrix[k][j]/=d;
    for(let i=0;i<count;i++)if(i!==k){const f=matrix[i][k];if(!f)continue;for(let j=k;j<=count;j++)matrix[i][j]-=f*matrix[k][j];}}
   const delta=matrix.map(row=>Math.max(-.012,Math.min(.004,row[count])));
   let boundedSweeps=0;
   for(;boundedSweeps<160;boundedSweeps++){
    let change=0;for(let i=0;i<count;i++){
     let rhs=system[i][count];for(let j=0;j<count;j++)if(i!==j)rhs-=system[i][j]*delta[j];
     const next=Math.max(-.012,Math.min(.004,rhs/system[i][i]));
     change=Math.max(change,Math.abs(next-delta[i]));delta[i]=next;
    }if(change<1e-10)break;
   }
   const maximumMove=Math.max(...delta.map(Math.abs));if(maximumMove>.025)throw new Error('Abdominal support fit exceeds local displacement bound');
   const energy=ds=>terms.reduce((s,t)=>s+t.weight*(t.residual+t.values.reduce((a,[i,q])=>a+q*ds[i],0))**2,0);
   const beforeEnergy=energy(delta.map(()=>0)),afterEnergy=energy(delta);if(afterEnergy>beforeEnergy+1e-10)throw new Error('Abdominal support fit increased bending');
   supportIds.forEach((id,i)=>p[id*3+2]+=delta[i]);
   d.supportFit={method:'bounded coupled plane-gradient fit over abdominal support collar',boundedSweeps:boundedSweeps+1,vertices:count,terms:terms.length,maximumMove,beforeEnergy,afterEnergy,crownAndPerimeterFixed:true};
  }

 changed.clear();maximumInward=0;maximumOutward=0;
 for(let id=0;id<p.length/3;id++){const dz=p[3*id+2]-undeformed[3*id+2];
  if(Math.abs(dz)>1e-10)changed.add(id);maximumInward=Math.max(maximumInward,-dz);maximumOutward=Math.max(maximumOutward,dz);
 }
 const next=facetedGeometry(p,faces,null,{inner:true,normalWeight:'angle'});
 const pre=facetedGeometry(undeformed,faces,null,{inner:true,normalWeight:'angle'});
 // Transfer retained attributes from their actual parent triangle. Inserting
 // control edges alone must not change the retained smooth normal field.
 for(const [name,attr] of Object.entries(old.attributes)){
  if(['position','normal','aPhysicalNormal','aCrystalNormal','aCrystalFamily','aBary','aMoldNormal'].includes(name))continue;
  const values=new attr.array.constructor(faces.length*3*attr.itemSize);
  faces.forEach((f,i)=>{
   const parent=parents[i],base=original[parent],[a,b,c]=triangles[parent];
   f.forEach((id,j)=>{
    const exact=base.indexOf(id);let weights;
    if(exact>=0)weights=[0,1,2].map(k=>k===exact?1:0);
    else{
     const [x,y]=point(id),det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
     const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/det;
     const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det;weights=[u,v,1-u-v];
    }
    for(let k=0;k<attr.itemSize;k++)values[(i*3+j)*attr.itemSize+k]=weights.reduce((s,w,n)=>s+w*attr.array[(parent*3+n)*attr.itemSize+k],0);
    if(name==='aSmooth'){
     const start=(i*3+j)*3;
     const transferred=unit(Array.from(values.slice(start,start+3)));
     const n=unit(transferred.map((q,k)=>q+next.attributes.aSmooth.array[start+k]-pre.attributes.aSmooth.array[start+k]));
     values.set(n,start);
    }
   });
  });
  next.setAttribute(name,new attr.constructor(values,attr.itemSize,attr.normalized));
 }
 // Reconcile transferred physical-normal deltas at all shared corners.
 const corners=new Map(),field=next.attributes.aSmooth;
 faces.forEach((f,i)=>f.forEach((id,j)=>{
  const k=i*3+j,[x,y,z]=point(id),key=[x,y,z].map(v=>Math.round(v*1e6)).join(',');
  const c=corners.get(key)||{indices:[],sum:[0,0,0]};c.indices.push(k);
  c.sum=c.sum.map((q,n)=>q+field.array[k*3+n]);corners.set(key,c);
 }));
 for(const c of corners.values()){const n=unit(c.sum);for(const i of c.indices)field.setXYZ(i,...n);}


 // The planar crown's true normal is shared at its vertices; support returns
 // keep continuous corner normals. Physical-flat inspection uses real normals.
 const planes=[],ownerByFace=new Map();
 for(const d of defs)for(const part of ['CROWN','OUT_UP','OUT_DOWN','IN_UP','IN_DOWN']){
  const signs=part==='CROWN'?[0,0]:[part.startsWith('OUT')?1:-1,part.endsWith('UP')?1:-1];
  const du=d.fit[1]-d.fall*signs[0],dv=d.fit[2]-d.fall*signs[1];
  const nx=-d.sign*du/d.w,ny=du*d.flow/d.w-dv/d.h,normal=unit([nx,ny,1]);
  const entry={planeId:d.id+'_'+part,mirroredId:'MRS_'+d.region+'_'+(d.side==='L'?'R':'L')+'_'+part,
    region:d.region,side:d.side,planeType:part==='CROWN'?'diamond':'trapezoid',anatomicalOwner:d.owner,
    centerPosition:[0,0,0],averageNormal:normal,apexDirection:unit([d.sign*d.flow,1,0]),adjacentPlanes:[],
    blackPointAdjacency:[],area:0,triangles:0,triangleIndices:[],normalSum:[0,0,0],maximumNormalSpreadDegrees:0,
    status:part==='CROWN'?'M87 geometric facing; exact diamond boundary topology':'M87 coupled anatomical support; geometric plane closure pending',chart:{x:d.x,y:d.y,w:d.w,h:d.h,flow:d.flow,core:.54,support:1,outer:1},fit:d.fit,fall:d.fall};
  faces.forEach((f,i)=>{
    const v=f.map(point);if(v.some(q=>q[2]<=0))return;
    const center=v[0].map((q,k)=>(q+v[1][k]+v[2][k])/3),uv=d.uv(center[0],center[1]),r=Math.abs(uv[0])+Math.abs(uv[1]);
    if(r>1-1e-8)return;
    const owner=r<=.54+1e-8?'CROWN':(uv[0]>=0?'OUT':'IN')+'_'+(uv[1]>=0?'UP':'DOWN');
    if(owner!==part)return;
    const n=cross(minus(v[1],v[0]),minus(v[2],v[0])),area=Math.hypot(...n)/2;
    entry.normalSum=entry.normalSum.map((q,k)=>q+n[k]);entry.area+=area;entry.triangles++;entry.triangleIndices.push(i);ownerByFace.set(i,entry);
    for(let k=0;k<3;k++)entry.centerPosition[k]+=center[k]*area;
    entry.maximumNormalSpreadDegrees=Math.max(entry.maximumNormalSpreadDegrees,Math.acos(Math.max(-1,Math.min(1,unit(n).reduce((s,q,k)=>s+q*normal[k],0))))*180/Math.PI);
  });
  if(!entry.triangles)throw new Error('M87 unsupported facing '+entry.planeId);
  entry.centerPosition=entry.centerPosition.map(v=>v/entry.area);if(part!=='CROWN')entry.averageNormal=unit(entry.normalSum);delete entry.normalSum;planes.push(entry);
  if(part==='CROWN')for(let i=0;i<next.attributes.position.count;i++){
    const x=next.attributes.position.getX(i),y=next.attributes.position.getY(i),z=next.attributes.position.getZ(i),uv=d.uv(x,y);
    if(z>0&&Math.abs(uv[0])+Math.abs(uv[1])<=.54+1e-7)next.attributes.aSmooth.setXYZ(i,...normal);
  }
 }
 const edges=new Map();
 faces.forEach((f,i)=>{for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a,owners=edges.get(key)||new Set();if(ownerByFace.has(i))owners.add(ownerByFace.get(i));edges.set(key,owners);}});
 for(const set of edges.values())for(const a of set)for(const b of set)if(a!==b&&!a.adjacentPlanes.includes(b.planeId))a.adjacentPlanes.push(b.planeId);
 const report={version:'M87',source:'retained M86 torso',planes,changedVertices:changed.size,addedVertices:(p.length-stock.length)/3,
  trianglesBefore:original.length,trianglesAfter:faces.length,maximumInward,maximumOutward,collapsedEdges,repairedCollinearFaces,
  xyPositionsHeld:true,controlRegions:defs.map(d=>({id:d.id,region:d.region,side:d.side,x:d.x,y:d.y,w:d.w,h:d.h,flow:d.flow,fit:d.fit,fall:d.fall,offset:d.offset,supportFit:d.supportFit})),
  method:'exact diamond-core cuts with coupled geometric support-gradient solve; paired bounded crown offsets'};
 next.setAttribute('aMoldNormal',next.attributes.aSmooth.clone());
 next.userData={...old.userData,mrsAbdominalPlanes:report};
 result.geometry=next;result.faces=faces;result.mrsAbdominalPlanes=report;old.dispose();pre.dispose();
 return report;
}
