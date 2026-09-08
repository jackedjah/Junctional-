import {Vector3,Ray,Triangle,Quaternion} from '../../vendor/three/three.module.min.js';
import {MRMAH_MORPHOLOGY} from './proportions.js';
import {refineRecessEdges,sculptSurfaceRegion,sculptSurfaceRecesses} from './forge.js';

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function weights(p,a,b,c){const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-12)return null;const x=((b[1]-c[1])*(p[0]-c[0])+(c[0]-b[0])*(p[1]-c[1]))/d,y=((c[1]-a[1])*(p[0]-c[0])+(a[0]-c[0])*(p[1]-c[1]))/d;return Math.min(x,y,1-x-y)<-1e-7?null:[x,y,1-x-y];}
function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}

function authorMuscleReturn(geometry,C,axis,front,outer,length){
 if(!C)return;
 const p=geometry.attributes.position,triangles=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 function radiusAt(h,a){const center=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(center.clone().addScaledVector(d,.7),d.clone().negate()),hit=new Vector3();let radius=-Infinity;
  for(let i=0;i<triangles.length;i+=3)if(ray.intersectTriangle(triangles[i],triangles[i+1],triangles[i+2],false,hit))radius=Math.max(radius,hit.clone().sub(center).dot(d));
  if(!Number.isFinite(radius))throw new Error('Triceps return support ray missed');return radius;
 }
 const intervalAt=a=>{if(!C.boundaries)return C.interval;let i=0;while(i<C.boundaries.length-2&&a>C.boundaries[i+1][0])i++;const x=C.boundaries[i],y=C.boundaries[i+1],t=Math.max(0,Math.min(1,(a-x[0])/(y[0]-x[0])));return[x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t];};
 const columns=Array.from({length:C.angularSamples},(_,i)=>{const a=C.angles[0]+(C.angles[1]-C.angles[0])*i/(C.angularSamples-1),[h0,h1]=intervalAt(a),r0=radiusAt(h0,a),r1=radiusAt(h1,a),secant=(r1-r0)/(h1-h0);
  let m0=(r0-radiusAt(h0-C.tangentStep,a))/C.tangentStep,m1=(radiusAt(h1+C.tangentStep,a)-r1)/C.tangentStep;
  // Shape-preserving endpoint slopes prevent a new maximum between crown
  // and tendon. Both endpoints come from the retained actual rest surface.
  if(Math.abs(secant)<1e-9)m0=m1=0;else{if(m0*secant<0)m0=0;if(m1*secant<0)m1=0;const norm=Math.hypot(m0/secant,m1/secant);if(norm>3){m0*=3/norm;m1*=3/norm;}}
  return{a,h0,h1,r0,r1,m0,m1};
 });
 const value=(c,h)=>{const span=c.h1-c.h0,t=Math.max(0,Math.min(1,(h-c.h0)/span)),t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*c.r0+(t3-2*t2+t)*span*c.m0+(-2*t3+3*t2)*c.r1+(t3-t2)*span*c.m1;};
 let changed=0,maxInward=0,maxOutward=0;
 sculptSurfaceRegion(geometry,{name:C.name||'triceps crown-to-tendon attached return',sample:before=>{
  const v=new Vector3(...before),h=v.dot(axis)/length;
  const radial=v.clone().addScaledVector(axis,-v.dot(axis)),a=Math.atan2(radial.dot(outer),radial.dot(front)),angle=a<0?a+2*Math.PI:a;
  if(angle<=C.angles[0]||angle>=C.angles[1])return null;const interval=intervalAt(angle);if(h<=interval[0]||h>=interval[1])return null;
  const u=(angle-C.angles[0])/(C.angles[1]-C.angles[0])*(columns.length-1),i=Math.min(columns.length-2,Math.floor(u)),f=u-i;
  const target=value(columns[i],h)*(1-f)+value(columns[i+1],h)*f;
  const weight=smooth(C.angles[0],C.angles[0]+C.angularFade,angle)*(1-smooth(C.angles[1]-C.angularFade,C.angles[1],angle))*smooth(interval[0],interval[0]+C.endpointBlend,h)*(1-smooth(interval[1]-C.endpointBlend,interval[1],h));
  const delta=(target-radial.length())*weight;if(Math.abs(delta)>C.safetyLimit)throw new Error((C.name||'Triceps return')+' exceeds local safety bound');
  changed++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(radial.normalize(),delta).toArray();
 }});
 geometry.userData[C.registryKey||'tricepsAttachedReturn']={source:C.source,frame:'retained post-cage humeral rest surface; h along actual axis; mirrored front/outward chart',columns,changedTriangleVertices:changed,maxInward,maxOutward,crownProtectedBelow:C.interval?.[0]??Math.min(...C.boundaries.map(x=>x[1])),bridgeProtectedAbove:C.interval?.[1]??Math.max(...C.boundaries.map(x=>x[2])),...(C.boundaries?{footprintBoundaries:C.boundaries}:{}),method:'monotone cubic radial return; measured endpoint positions/tangents; no additional recess and no target clipping'};
}


// The deltoid is one primary radial support surface. Broad axial faces
// meet transverse sections through shared chord planes. It replaces
// the old clipped displacement cage, before any overlapping muscle return.
function primaryDeltoid(C,sample,axis,front,outer,length,side){
 const d=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 const apex=new Vector3(...C.apexB0[side]),ah=apex.dot(axis)/length,ad=apex.clone().addScaledVector(axis,-apex.dot(axis)),aa=Math.atan2(ad.dot(outer),ad.dot(front));
 const angles=C.angles.map((a,i)=>i===4?aa:a),sign=Math.sign(outer.x),extent=sign*apex.x;
 const columns=angles.map((a,i)=>{
  const direction=d(a),hs=[C.starts[i],C.superior[i],i===4?ah:C.crests[i],C.returns[i],C.ends[i]];
  const rs=hs.map((h,j)=>{
   if(i===4&&j===2)return ad.length();
   const support=sample(h,a).addScaledVector(axis,-h*length).dot(direction)+C.offsets[j][i];
   // Every support node sits inside the measured lateral support plane.
   // This is part of the whole cage, not an extremal-vertex protection mask.
   const xDirection=sign*direction.x;
   return xDirection>.1?Math.min(support,(extent-sign*axis.x*h*length)/xDirection):support;
  });
  if(i>=3&&i<=5)rs[3]=Math.max(rs[3],Math.min(rs[2],rs[4]));
  return{a,hs,rs};
 });
 // Broad axial facing planes have a small explicit convex allowance. The
 // allowance is bounded by the section rise, so it cannot invent a second
 // peak or overshoot the crown. This replaces the rounded cubic envelope.
 const section=(c,h)=>{let j=0;while(j<3&&h>c.hs[j+1])j++;const span=c.hs[j+1]-c.hs[j],t=Math.max(0,Math.min(1,(h-c.hs[j])/span)),bow=Math.min(C.faceConvexity,Math.abs(c.rs[j+1]-c.rs[j])*.20);return c.rs[j]*(1-t)+c.rs[j+1]*t+bow*4*t*(1-t);};
 const record={source:C.source,frame:'actual extended humeral rest axis; mirrored projected front/outward; scene units',method:'primary shared support sections; broad convex axial faces and transverse chord planes; no displacement clipping; legacy cap return superseded',apexB0:apex.toArray(),columns,changedTriangleVertices:0,maxInward:0,maxOutward:0};
 const planes=Array.from({length:16},(_,k)=>{const row=Math.floor(k/8),col=k%8,indices=row===0?[0,2]:[2,4],nodes=[columns[col],columns[col+1]].flatMap(c=>indices.map(j=>axis.clone().multiplyScalar(c.hs[j]*length).addScaledVector(d(c.a),c.rs[j]))),id=`MR_DELTOID_${side}_${String(k+1).padStart(2,'0')}`;return{id,mirroredId:id.replace('_'+side+'_','_'+(side==='L'?'R':'L')+'_'),region:'DELTOID',side,row,col,type:row===0?'clipped diamond':'insertion wedge',anatomicalOwner:C.owners[col],centerPosition:nodes.reduce((q,v)=>q.add(v),new Vector3()).multiplyScalar(.25).toArray(),apexDirection:axis.toArray(),sum:new Vector3(),vertices:0};});
 return {record,finish(geometry){
  const p=geometry.attributes.position;for(let i=0;i<p.count;i+=3){const vs=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j)),v=vs.reduce((s,q)=>s.add(q),new Vector3()).multiplyScalar(1/3),h=v.dot(axis)/length;let a=Math.atan2(v.dot(outer),v.dot(front));if(a<-.5)a+=2*Math.PI;if(a<angles[0]||a>angles.at(-1))continue;let c=0;while(c<7&&a>angles[c+1])c++;const lo=columns[c],hi=columns[c+1],u=(a-lo.a)/(hi.a-lo.a),at=j=>lo.hs[j]*(1-u)+hi.hs[j]*u;if(h<at(0)||h>at(4))continue;const f=planes[(h<at(2)?0:8)+c];f.sum.add(vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])));f.vertices+=3;}
  record.planes=planes.map(({sum,row,col,...p})=>({...p,averageNormal:sum.normalize().toArray(),adjacentPlanes:planes.filter(q=>Math.abs(q.row-row)+Math.abs(q.col-col)===1).map(q=>q.id),blackPointAdjacency:[],status:'PARTIAL primary support face family; observed directions, not accepted visible-plane count'}));
 },evaluate(v){
  const h=v.dot(axis)/length,radial=v.clone().addScaledVector(axis,-v.dot(axis));let a=Math.atan2(radial.dot(outer),radial.dot(front));if(a<-.5)a+=Math.PI*2;
  if(a<=angles[0]||a>=angles.at(-1))return null;
  let i=0;while(i<columns.length-2&&a>angles[i+1])i++;const lo=columns[i],hi=columns[i+1],u=(a-lo.a)/(hi.a-lo.a),start=lo.hs[0]*(1-u)+hi.hs[0]*u,end=lo.hs[4]*(1-u)+hi.hs[4]*u;
  if(h<=start||h>=end)return null;
  // Evaluate equal normalized axial stations so the V-shaped terminal edge
  // is shared by both adjacent columns without a discontinuous cap seam.
  const t=(h-start)/(end-start),r0=section(lo,lo.hs[0]+t*(lo.hs[4]-lo.hs[0])),r1=section(hi,hi.hs[0]+t*(hi.hs[4]-hi.hs[0]));
  const target=r0*r1*Math.sin(hi.a-lo.a)/(r1*Math.sin(hi.a-a)+r0*Math.sin(a-lo.a));
  const blend=smooth(0,C.axialBlend,t)*(1-smooth(1-C.axialBlend,1,t))*smooth(angles[0],angles[0]+C.angularBlend,a)*(1-smooth(angles.at(-1)-C.angularBlend,angles.at(-1),a));
  const delta=(target-radial.length())*blend;
  if(Math.abs(delta)>C.safetyLimit)throw new Error('Primary deltoid support displacement exceeds '+C.safetyLimit+' scene units ('+Math.abs(delta)+')');
  record.changedTriangleVertices++;record.maxInward=Math.max(record.maxInward,-delta);record.maxOutward=Math.max(record.maxOutward,delta);
  return {delta:radial.normalize().multiplyScalar(delta),blend};
 }};
}


// A bounded biceps replacement patch owns its crown and both returns in one
// humeral rest chart. It targets positions rather than adding another bulge.
// Outside this footprint, including the retained cap overlap, B0 is exact.
function authorBicepsBelly(geometry,C,cap,axis,front,outer,length,side,region="BICEPS"){
 if(!C)return;
 const p=geometry.attributes.position,stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 const radiusAt=(h,a)=>{const center=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(center.clone().addScaledVector(d,.7),d.clone().negate()),hit=new Vector3();let radius=-Infinity;for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))radius=Math.max(radius,hit.clone().sub(center).dot(d));if(!Number.isFinite(radius))throw new Error('Biceps primary support ray missed');return radius;};
 const lerp=(a,b,t)=>a+(b-a)*t,interval=(xs,x)=>{let i=0;while(i<xs.length-2&&x>xs[i+1])i++;return[i,Math.max(0,Math.min(1,(x-xs[i])/(xs[i+1]-xs[i])))];};
 const start=radiusAt(C.rows[0][0],C.rows[0][1]),peakSamples=C.peakSupportH.flatMap(h=>C.peakSupportAngles.map(a=>({h,angle:a,depth:radiusAt(h,a)*Math.cos(a-C.peak[1])}))),peakSupport=peakSamples.reduce((a,b)=>a.depth>b.depth?a:b),peak=peakSupport.depth,end=radiusAt(C.rows.at(-1)[0],C.rows.at(-1)[1]);
 const nodes=C.rows.map(([h,a,width,crownMix])=>{const z=h<=C.peak[0]?lerp(start,peak,crownMix):lerp(end,peak,crownMix);return{h,a,width,z,inner:radiusAt(h,a-width),outer:radiusAt(h,a+width)};});
 // Side support is sampled on the actual boundary path rather than
 // interpolating five remote rim points across the retained shoulder/arm.
 const rims=Array.from({length:C.rimStations},(_,k)=>{const h=lerp(nodes[0].h,nodes.at(-1).h,k/(C.rimStations-1)),[i,t]=interval(nodes.map(n=>n.h),h),a=lerp(nodes[i].a,nodes[i+1].a,t),w=lerp(nodes[i].width,nodes[i+1].width,t);return{h,inner:radiusAt(h,a-w),outer:radiusAt(h,a+w)};});
 const rimAt=(h,left)=>{const[i,t]=interval(rims.map(r=>r.h),h),key=left?'inner':'outer';return lerp(rims[i][key],rims[i+1][key],t);};
 const capEnd=a=>{if(a<=cap.angles[0]||a>=cap.angles.at(-1))return-Infinity;const[i,t]=interval(cap.angles,a);return lerp(cap.ends[i],cap.ends[i+1],t);};
 const footprint=v=>{const h=v.dot(axis)/length;let a=Math.atan2(v.dot(outer),v.dot(front));if(region==='TRICEPS'&&a<0)a+=2*Math.PI;if(h<=nodes[0].h||h>=nodes.at(-1).h)return null;const[i,t]=interval(nodes.map(n=>n.h),h),lo=nodes[i],hi=nodes[i+1],center=lerp(lo.a,hi.a,t),width=lerp(lo.width,hi.width,t),u=(a-center)/width;if(Math.abs(u)>=1)return null;return{h,a,i,t,lo,hi,center,width,u};};
 let changed=0,maxInward=0,maxOutward=0;const phases=C.phases,owners=region==='BICEPS'?['medial biceps return','anterior biceps crown','lateral biceps return']:['lateral triceps return','posterior triceps crown','long-head medial return'];
 const planes=Array.from({length:9},(_,k)=>({id:`MR_${region}_${side}_${String(k+1).padStart(2,'0')}`,mirroredId:`MR_${region}_${side==='L'?'R':'L'}_${String(k+1).padStart(2,'0')}`,region,side,row:Math.floor(k/3),col:k%3,type:k>=6?'distal insertion wedge':k%3===1?'long diamond':'return plane',anatomicalOwner:owners[k%3],position:new Vector3(),sum:new Vector3(),vertices:0}));
 const phase=h=>h<phases[0]?0:h<phases[1]?1:2;
 sculptSurfaceRegion(geometry,{name:'primary biceps tapered belly and asymmetric attached returns',sample:before=>{
  const v=new Vector3(...before),f=footprint(v);if(!f)return null;const {h,a,i,t,lo,hi,center,width,u}=f,inner=C.crownSides[0],outerSide=C.crownSides[1],crown=lerp(lo.z,hi.z,t);
  // The facing plane has a shallow convex crown; the two sidewalls occupy
  // different fractions of the footprint and meet measured support rims.
  let target;if(u>=-inner&&u<=outerSide)target=(crown-C.convexity*Math.pow(u/(u<0?inner:outerSide),2))/Math.cos(a-center);
  else{const left=u<0,at=center+width*(left?-inner:outerSide),rimAngle=center+width*(left?-1:1),r0=(crown-C.convexity)/Math.cos(at-center),r1=rimAt(h,left);const aa=left?rimAngle:at,bb=left?at:rimAngle,ra=left?r1:r0,rb=left?r0:r1;target=ra*rb*Math.sin(bb-aa)/(rb*Math.sin(bb-a)+ra*Math.sin(a-aa));}
  const radial=v.clone().addScaledVector(axis,-v.dot(axis)),weight=smooth(nodes[0].h,nodes[0].h+C.axialBlend,h)*(1-smooth(nodes.at(-1).h-C.axialBlend,nodes.at(-1).h,h))*smooth(0,C.edgeBlend,1-Math.abs(u))*(Number.isFinite(capEnd(a))?smooth(capEnd(a),capEnd(a)+C.capBlend,h):1),delta=(target-radial.length())*weight;
  if(Math.abs(delta)>C.safetyLimit)throw new Error('Biceps primary support exceeds local displacement bound: '+Math.abs(delta));
  if(Math.abs(delta)<1e-12)return null;changed++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(radial.normalize(),delta).toArray();
 }});
 const final=geometry.attributes.position;for(let i=0;i<final.count;i+=3){const vs=[0,1,2].map(j=>new Vector3().fromBufferAttribute(final,i+j)),v=vs.reduce((q,s)=>q.add(s),new Vector3()).multiplyScalar(1/3),f=footprint(v);if(!f)continue;const col=f.u<-C.crownSides[0]?0:f.u>C.crownSides[1]?2:1,q=planes[phase(f.h)*3+col];q.sum.add(vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])));q.position.add(v);q.vertices+=3;}
 geometry.userData[region==='BICEPS'?'bicepsPrimarySurface':'tricepsPrimarySurface']={source:C.source,method:'bounded replacement surface; measured pre-patch crown/edge anchors, independent tapered footprint and asymmetric returns; cap overlap protected; no added groove',frame:'extended humeral rest h and mirrored front/outward angle; radii and lengths in scene units',nodes,rimSamples:rims,peakSupportSamples:peakSamples,peakAnchor:{targetH:C.peak[0],facingAngle:C.peak[1],support:peakSupport,projectedDepth:peak},changedTriangleVertices:changed,maxInward,maxOutward,capProtected:true,distalProtectedAbove:nodes.at(-1).h,planes:planes.map(({position,sum,row,col,...q})=>({...q,centerPosition:position.multiplyScalar(3/Math.max(3,q.vertices)).toArray(),averageNormal:sum.normalize().toArray(),apexDirection:axis.toArray(),adjacentPlanes:planes.filter(p=>Math.abs(p.row-row)+Math.abs(p.col-col)===1).map(p=>p.id),blackPointAdjacency:[],status:'PARTIAL authored belly face family; not accepted visible-face count'}))};
}

export function authorArmMaster(geometry,spec,axisVector,foreFrame){
 const C=MRMAH_MORPHOLOGY.arms.authoringMaster;if(!C)return geometry;
 const side=spec.shoulder[0]<0?'R':'L',other=side==='L'?'R':'L',axis=new Vector3(...axisVector),length=axis.length();axis.normalize();
 const front=foreFrame?new Vector3(...foreFrame.palm):new Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
 const outer=foreFrame?new Vector3(...foreFrame.thumb):new Vector3().crossVectors(axis,front);if(!foreFrame&&outer.x*spec.shoulder[0]<0)outer.negate();
 const radius=foreFrame?spec.foreRadius:spec.upperRadius;
 const pointArray=geometry.attributes.position,baseline=Array.from({length:pointArray.count},(_,i)=>new Vector3().fromBufferAttribute(pointArray,i));
 function chart(v){let a=Math.atan2(v.dot(outer),v.dot(front));if(a<-.50)a+=2*Math.PI;return [v.dot(axis),a*radius];}
 const cache=new Map();
 function sample(h,a){const key=h+':'+a;if(cache.has(key))return cache.get(key).clone();const center=axis.clone().multiplyScalar(h*length),d=front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a)),ray=new Ray(center.clone().addScaledVector(d,.7),d.clone().negate()),hit=new Vector3();let best=null,far=-Infinity;
  for(let i=0;i<baseline.length;i+=3)if(ray.intersectTriangle(baseline[i],baseline[i+1],baseline[i+2],false,hit)){const distance=hit.clone().sub(center).dot(d);if(distance>far){far=distance;best=hit.clone();}}
  if(!best)throw new Error('Authoring cage has no B0 support at '+key);cache.set(key,best);return best.clone();
 }
 const capSurface=!foreFrame&&C.cap?.primarySurface?primaryDeltoid(C.cap.primarySurface,sample,axis,front,outer,length,side):null;
 const definitions=foreFrame?[C.forearm]:[C.brachialis,C.biceps,C.triceps].filter(Boolean),patches=[];
 for(const def of definitions){const grid=def.grid||def.rows.map(h=>def.angles.map(a=>[h,a]));if(def.ends)grid.push(def.angles.map((a,i)=>[def.ends[i],a]));
  const rows=grid.length-1,columns=grid[0].length-1;
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const indices=[[row,col],[row+1,col],[row+1,col+1],[row,col+1]],uv=indices.map(([r,c])=>grid[r][c]),corners=uv.map(([h,a],i)=>{
    const [r,c]=indices[i],offset=def.radialOffsets?.[r]?.[c]||0;
    return sample(h,a).addScaledVector(front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a)),offset);
   });
   const id=`MR_${def.id}_${side}_${String(row*columns+col+1).padStart(2,'0')}`,normal=corners[2].clone().sub(corners[0]).cross(corners[3].clone().sub(corners[1])).normalize(),center=corners.reduce((s,v)=>s.add(v),new Vector3()).multiplyScalar(.25);if(normal.dot(center)<0)normal.negate();
   const edges=[];if(row===0)edges.push([0,3]);if(row===rows-1)edges.push([1,2]);if(!def.closed&&col===0)edges.push([0,1]);if(!def.closed&&col===columns-1)edges.push([3,2]);
   patches.push({id,mirroredId:id.replace('_'+side+'_','_'+other+'_'),region:def.id,side,type:row===rows-1?'long wedge':def.id==='DELTOID'?'clipped diamond':'kite',owner:def.owners[col],uv:uv.map(([h,a])=>[h*length,a*radius]),corners,center,normal,edges,limit:def.limit,edgeBlend:def.edgeBlend,row,col,rows,columns,closed:!!def.closed,radialProjection:!!def.radialProjection});
  }
 }
 const h0=foreFrame?.10:-.30,h1=foreFrame?.87:.90;
 const frame={name:foreFrame?'authoring forearm palm/thumb rest chart':'authoring humeral rest chart',project:v=>{const [h,a]=chart(v);return [a,h];},accept:v=>{const h=v.dot(axis)/length;return h>h0-.02&&h<h1+.02;},seamSpan:Math.PI*radius,minEdgeLength:C.refinement.minEdge};
 const density=[{path:[[1.57*radius,h0*length],[1.57*radius,h1*length]],width:radius*(foreFrame?8:6)}];
 const initialTriangles=geometry.attributes.position.count/3;
 for(let i=0;i<C.refinement.passes;i++)refineRecessEdges(geometry,frame,density,C.refinement.edgesPerPass);
 const locate=(p,region)=>{for(const patch of patches){if(region&&patch.region!==region)continue;for(const ids of [[0,1,2],[0,2,3]]){const w=weights(p,...ids.map(i=>patch.uv[i]));if(w)return {patch,ids,w};}}return null;};
 sculptSurfaceRegion(geometry,{name:foreFrame?'master forearm directional wedge cage':'master deltoid, brachialis and longitudinal arm mass cages',sample:before=>{
  const v=new Vector3(...before),p=chart(v),fields=definitions.map(d=>locate(p,d.id)).filter(Boolean),cap=capSurface?.evaluate(v);if(!fields.length&&!cap)return null;
  const combined=cap?cap.delta.clone():new Vector3();let coverage=cap?.blend||0;
  // Different muscle cages overlap through bounded support, rather than
  // dropping the brachialis wherever a zero-weight cap patch happens to win.
  for(const {patch,ids,w}of fields){
   let blend=1;for(const [a,b]of patch.edges)blend=Math.min(blend,smooth(0,patch.edgeBlend,segmentDistance(p,patch.uv[a],patch.uv[b])));
   let target=ids.reduce((s,id,i)=>s.addScaledVector(patch.corners[id],w[i]),new Vector3());
   // A mass cage must not pull vertices sideways toward its triangulation.
   // Intersect its facing plane along the same rest-chart radial direction.
   // This retains the original angle/h coordinates and the bounded footprint.
   if(patch.radialProjection){const center=axis.clone().multiplyScalar(v.dot(axis)),d=v.clone().sub(center).normalize(),n=patch.corners[ids[1]].clone().sub(patch.corners[ids[0]]).cross(patch.corners[ids[2]].clone().sub(patch.corners[ids[0]])).normalize(),den=n.dot(d);if(Math.abs(den)>.20)target=center.addScaledVector(d,n.dot(patch.corners[ids[0]].clone().sub(center))/den);}
   const delta=target.sub(v);if(delta.length()>patch.limit)delta.setLength(patch.limit);
   combined.addScaledVector(delta,blend);coverage+=blend;
  }
  return v.addScaledVector(combined,1/Math.max(1,coverage)).toArray();
 }});
 if(!foreFrame)authorBicepsBelly(geometry,C.biceps?.primaryBelly,C.cap.primarySurface,axis,front,outer,length,side);
 if(!foreFrame)authorBicepsBelly(geometry,C.triceps?.primaryBelly,C.cap.primarySurface,axis,front,outer,length,side,'TRICEPS');
 if(!foreFrame)authorMuscleReturn(geometry,C.triceps?.attachedReturn,axis,front,outer,length);
 if(capSurface)geometry.userData.deltoidPrimarySurface=capSurface.record;
 const pockets=[];
 if(!foreFrame)for(const pocket of C.pockets){
  const transverse=sample(pocket.h,pocket.angle+Math.PI/2).distanceTo(sample(pocket.h,pocket.angle-Math.PI/2));
  const width=transverse*pocket.widthW,path=[[pocket.angle*radius,(pocket.h-pocket.lengthH/2)*length],[pocket.angle*radius,(pocket.h+pocket.lengthH/2)*length]];
  const localFrame={...frame,minEdgeLength:C.refinement.minPocketEdge,accept:v=>{const [h,a]=chart(v);return Math.abs(h-pocket.h*length)<.04&&Math.abs(a-pocket.angle*radius)<.025;}};
  for(let i=0;i<C.refinement.pocketPasses;i++)refineRecessEdges(geometry,localFrame,[{path,width:Math.max(width*1.4,.04/Math.pow(2,i))}],C.refinement.pocketEdges);
  const name=`MR_BP_${pocket.id}_${side}`;
  sculptSurfaceRecesses(geometry,localFrame,[{name,class:'A',path,width,regionWidth:transverse,depthT:pocket.depthT,thickness:pocket.supportThicknessB0?.[side],maxDepth:.004,alpha:.5,floor:.18,walls:[.85,1.15],fade:.25,widthEnds:.55,samples:13,continuousStations:true}]);
  const fit=geometry.userData.recessFit.channels.at(-1);
  pockets.push({id:name,mirroredId:name.slice(0,-1)+other,region:pocket.id,anatomicalPurpose:pocket.owner,mouthWidth:width,visibleLength:pocket.lengthH*length,depthTarget:fit.target??null,fullThickness:fit.T??null,neighborPlanes:patches.filter(p=>p.region==='BRACHIALIS'&&Math.abs(p.center.dot(axis)/length-pocket.h)<.22).map(p=>p.id),status:fit.floorVertices>0?'PARTIAL geometry resolved; visual shadow unaccepted':'BLOCKED no resolved floor vertex',fit});
 }
 const sums=new Map();const positions=geometry.attributes.position;
 for(let i=0;i<positions.count;i+=3){const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(positions,i+j)),p=chart(v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3)),normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));for(const def of definitions){const f=locate(p,def.id);if(!f)continue;if(!sums.has(f.patch.id))sums.set(f.patch.id,new Vector3());sums.get(f.patch.id).add(normal);}}
 geometry.userData.diamondPlaneAtlas=patches.map(p=>({id:p.id,mirroredId:p.mirroredId,region:p.region,side:p.side,type:p.type,anatomicalOwner:p.owner,centerPosition:p.center.toArray(),apexDirection:axis.clone().toArray(),averageNormal:(sums.get(p.id)||p.normal).normalize().toArray(),adjacentPlanes:patches.filter(q=>q.region===p.region&&(Math.abs(q.row-p.row)+Math.abs(q.col-p.col)===1||(p.closed&&q.row===p.row&&Math.abs(q.col-p.col)===p.columns-1))).map(q=>q.id),blackPointAdjacency:pockets.filter(q=>q.neighborPlanes.includes(p.id)).map(q=>q.id),status:'PARTIAL authored cage; director acceptance pending'}));
 if(capSurface){capSurface.finish(geometry);const junction=pockets.find(p=>p.region==='BRACHIALIS_UPPER'),plane=capSurface.record.planes.find(p=>p.id===`MR_DELTOID_${side}_12`);if(junction&&plane){junction.neighborPlanes.push(plane.id);plane.blackPointAdjacency.push(junction.id);}geometry.userData.diamondPlaneAtlas.push(...capSurface.record.planes);}
 if(geometry.userData.bicepsPrimarySurface)geometry.userData.diamondPlaneAtlas=geometry.userData.diamondPlaneAtlas.filter(p=>p.region!=='BICEPS').concat(geometry.userData.bicepsPrimarySurface.planes);
 geometry.userData.blackPointRegistry=pockets;
 if(geometry.userData.tricepsPrimarySurface)geometry.userData.diamondPlaneAtlas=geometry.userData.diamondPlaneAtlas.filter(p=>p.region!=='TRICEPS').concat(geometry.userData.tricepsPrimarySurface.planes);
 if(!foreFrame){authorArmOwnership(geometry,axis,front,outer,length,side);authorBrachialisFace(geometry,axis,front,outer,length,side,spec);authorDeltoidInsertion(geometry,axis,front,outer,length,side);authorPosteriorArmFaces(geometry,axis,front,outer,length,side);authorLateralTriceps(geometry,axis,front,outer,length,side,spec);authorAnteriorBiceps(geometry,axis,front,outer,length,side,spec);authorDeltoidFace(geometry,axis,front,outer,length,side,spec,'anterior');authorDeltoidFace(geometry,axis,front,outer,length,side,spec,'lateral');authorDeltoidHandoff(geometry,axis,front,outer,length,side,spec);authorBicepsBrachialisInterface(geometry,axis,front,outer,length,side,spec);authorBrachialisTricepsInterface(geometry,axis,front,outer,length,side,spec);authorDistalTricepsTendon(geometry,axis,front,outer,length,side,spec);
  // Final bounded replacement uses completed R179 support. Neighboring
  // interface solvers must not resample this trial and move the brachialis.
  authorAnteriorBiceps(geometry,axis,front,outer,length,side,spec,true);
  {
   authorArmVolumeRhythm(geometry,axis,front,outer,length,side,spec);
   authorAnteriorBiceps(geometry,axis,front,outer,length,side,spec,true,{
    owner:'TRICEPS_LONG_HEAD',center:[3.35,.43],facing:3.35,axialFacing:.05,crownScale:[1,1],
    crownSupportOutline:[[3.30,.25],[3.60,.32],[3.67,.45],[3.22,.64],[2.98,.47],[3.00,.33]],
    outline:[[3.40,.18],[4.03,.28],[4.13,.47],[3.22,.75],[2.49,.54],[2.51,.31]],
    axialCrown:[[.18,-.024],[.28,-.004],[.40,0],[.52,-.008],[.64,-.022],[.75,-.044]]
   });
  }}
 if(foreFrame)authorProximalForearm(geometry,axis,front,outer,length,side);
 // Preserve the established joint-support tessellation; the muscle region
 // below has one final owner and supersedes the old surface fields there.
 geometry.userData.authoringMaster={stage:'G1/G2 mass and ownership; G3/G4 regional trials',source:C.source,initialTriangles,finalTriangles:geometry.attributes.position.count/3,runtimeMesh:false,geometryBuiltOnce:true,frame:foreFrame?'palm/front and thumb/positive-angle, actual forearm axis':'projected +Z front, mirrored outward, actual humeral axis'};
 return geometry;
}

// R146 precision pivot: one transverse control surface owns the biceps return,
// brachialis wedge and triceps return. Crown supports come from the incoming
// retained mesh. Finite valley floors replace existing relief exactly once.
function authorArmOwnership(geometry,axis,front,outer,length,side){
 const pos=geometry.attributes.position,source=Array.from({length:pos.count},(_,i)=>new Vector3().fromBufferAttribute(pos,i));
 const dir=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 const cache=new Map();
 function radius(h,a){const k=h+':'+a;if(cache.has(k))return cache.get(k);const c=axis.clone().multiplyScalar(h*length),d=dir(a),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<source.length;i+=3)if(ray.intersectTriangle(source[i],source[i+1],source[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Arm ownership support ray missed');cache.set(k,r);return r;
 }
 const chord=(a,ra,b,rb,t)=>ra*rb*Math.sin(b-a)/(rb*Math.sin(b-t)+ra*Math.sin(t-a));
 const rows=[],fits=[];
 for(let i=0;i<25;i++){
  const h=.32+i*(.79-.32)/24,t=smooth(.40,.78,h),an=1.00+.04*t,bp=1.43-.11*t,po=1.93-.13*t;
  const angles=[.12,.44,an-.18,an-.035,an+.035,an+.16,bp,po-.18,po-.030,po+.030,po+.26,2.85];
  if(angles.some((a,j)=>j&&a<=angles[j-1]))throw new Error('Arm ownership nodes crossed');
  const rs=angles.map(a=>radius(h,a));
  for(const [id,j0,j1,j2,j3,depthK]of [['BICEPS_BRACHIALIS',2,3,4,5,.022],['BRACHIALIS_TRICEPS',7,8,9,10,.018]]){
   const center=(angles[j1]+angles[j2])/2,T=radius(h,center)+radius(h,center+Math.PI),support=chord(angles[j0],rs[j0],angles[j3],rs[j3],center),floor=radius(h,center),d=T*depthK;
   for(const j of [j1,j2])rs[j]=chord(angles[j0],rs[j0],angles[j3],rs[j3],angles[j])-d;
   fits.push({id:side+'_'+id,h,angle:center,fullThickness:T,corridorSurfaceWidth:(angles[j3]-angles[j0])*support,floorSurfaceWidth:(angles[j2]-angles[j1])*support,baselineRadialDepth:support-floor,totalTargetRadialDepth:d,definition:'scene units; full axis-crossing thickness and total radial floor depth below chord joining frozen neighboring rims, not additional displacement'});
  }
  rows.push({h,angles,rs});
 }
 const sampleRow=(r,a)=>{let j=0;while(j<r.angles.length-2&&a>r.angles[j+1])j++;return chord(r.angles[j],r.rs[j],r.angles[j+1],r.rs[j+1],a);};
 let changed=0,inward=0,outward=0,protectedPocket=0;
 sculptSurfaceRegion(geometry,{name:'R146 biceps sidewall / brachialis wedge / posterior triceps ownership',sample:before=>{
  const v=new Vector3(...before),h=v.dot(axis)/length,a=Math.atan2(v.dot(outer),v.dot(front));if(h<=.32||h>=.79||a<=.12||a>=2.85)return null;
  // Preserve the existing upper convergence pocket and its rim neighborhood.
  const pocketFade=smooth(0,1,Math.max(Math.abs(h-.425)/.038,Math.abs(a-1.14)/.19)-1);if(pocketFade===0){protectedPocket++;return null;}
  const u=(h-.32)/(.79-.32)*24,j=Math.min(23,Math.floor(u)),f=u-j,target=sampleRow(rows[j],a)*(1-f)+sampleRow(rows[j+1],a)*f;
  const radial=v.clone().addScaledVector(axis,-v.dot(axis)),w=smooth(.32,.42,h)*(1-smooth(.70,.79,h))*smooth(.12,.27,a)*(1-smooth(2.64,2.85,a))*pocketFade;
  const d=(target-radial.length())*w;if(Math.abs(d)>.035)throw new Error('Arm ownership exceeds frozen local safety bound '+d);changed++;inward=Math.max(inward,-d);outward=Math.max(outward,d);return v.addScaledVector(radial.normalize(),d).toArray();
 }});
 // Two short head boundaries turn with the existing cap. Their total depth
 // is measured from nearby frozen cap support, never from world origin.
 const capRows=[];
 for(let i=0;i<15;i++){const h=-.19+i*.40/14,turn=smooth(-.05,.21,h),cs=[];for(const a of [.79+.28*turn,2.34-.24*turn]){
  const lo=a-.13,hi=a+.13,rl=radius(h,lo),rr=radius(h,hi),support=chord(lo,rl,hi,rr,a),T=radius(h,a)+radius(h,a+Math.PI);cs.push({a,lo,hi,rl,rr,target:support-.018*T,support,T});
 }capRows.push({h,cs});}
 sculptSurfaceRegion(geometry,{name:'R146 anterior/lateral and lateral/posterior deltoid returns',sample:before=>{
  const v=new Vector3(...before),h=v.dot(axis)/length,a=Math.atan2(v.dot(outer),v.dot(front));if(h<=-.19||h>=.21)return null;const u=(h+.19)/.40*14,j=Math.min(13,Math.floor(u)),f=u-j;
  let goal=null;for(let n=0;n<2;n++){const x=capRows[j].cs[n],y=capRows[j+1].cs[n],c={};for(const k in x)c[k]=x[k]*(1-f)+y[k]*f;if(a<=c.lo||a>=c.hi)continue;
   const q=(a-c.lo)/(c.hi-c.lo),floorA=c.a-.025,floorB=c.a+.025;
   goal=a<floorA?chord(c.lo,c.rl,floorA,c.target,a):a>floorB?chord(floorB,c.target,c.hi,c.rr,a):c.target;
   const weight=smooth(-.19,-.09,h)*(1-smooth(.10,.21,h))*smooth(0,.18,q)*(1-smooth(.82,1,q)),radial=v.clone().addScaledVector(axis,-v.dot(axis)),d=(goal-radial.length())*weight;
   if(Math.abs(d)>.018)throw new Error('Delt boundary exceeds local safety bound');return v.addScaledVector(radial.normalize(),d).toArray();
  }return null;
 }});
 geometry.userData.armOwnershipSurface={version:'R146',frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},method:'shared anatomical transverse chord surfaces with preserved crowns, asymmetric returns and finite local floors; immutable incoming support',rows,fits,capRows,changedTriangleVertices:changed,maxInward:inward,maxOutward:outward,protectedPocketVertices:protectedPocket,status:'PARTIAL geometry trial; compare neutral clay before accepting'};
}

// R147: a small directed muscle face between the two retained larger bellies.
// Frozen boundary supports remain attached. The crown plane inherits its depth
// and axial slope from B0 samples; this is not another additive muscle bulge.
function authorBrachialisFace(geometry,axis,front,outer,length,side,spec){
 const p=geometry.attributes.position,source=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 // Retain the old return at the elbow seam, including triangles feeding its
 // normal neighborhood. The generous guard covers the old return displacement.
 const joint=new Vector3(...spec.elbow).sub(new Vector3(...spec.shoulder)),locked=new Set(),key=v=>v.toArray().map(x=>Math.round(x*1e6)).join(',');
 for(let i=0;i<source.length;i+=3)if([0,1,2].some(j=>source[i+j].distanceTo(joint)<=.20))for(let j=0;j<3;j++)locked.add(key(source[i+j]));
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 function radius(h,a){const c=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<source.length;i+=3)if(ray.intersectTriangle(source[i],source[i+1],source[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Brachialis boundary support ray missed');return r;
 }
 const outline=[[1.19,.47],[1.44,.43],[1.71,.53],[1.47,.70],[1.22,.78],[1.11,.65]],center=[1.37,.585],inner=outline.map(p=>p.map((x,i)=>center[i]+.46*(x-center[i])));
 const rc=radius(center[1],center[0]),slope=(radius(.68,1.30)-radius(.52,1.46))/.16;
 const normal=direction(center[0]).addScaledVector(axis,-slope/length).normalize(),anchor=axis.clone().multiplyScalar(center[1]*length).addScaledVector(direction(center[0]),rc),offset=normal.dot(anchor);
 const point=(uv,r)=>axis.clone().multiplyScalar(uv[1]*length).addScaledVector(direction(uv[0]),r);
 const outerPoints=outline.map(uv=>point(uv,radius(uv[1],uv[0]))),innerPoints=inner.map(uv=>point(uv,(offset-normal.dot(axis)*uv[1]*length)/normal.dot(direction(uv[0]))));
 const patches=[];
 function add(uvs,points,owner){const n=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();patches.push({uvs,n,d:n.dot(points[0]),owner});}
 for(let j=0;j<6;j++){const k=(j+1)%6;add([center,inner[j],inner[k]],[anchor,innerPoints[j],innerPoints[k]],'crown');add([inner[j],outline[j],outline[k]],[innerPoints[j],outerPoints[j],outerPoints[k]],'return');add([inner[j],outline[k],inner[k]],[innerPoints[j],outerPoints[k],innerPoints[k]],'return');}
 let count=0,maxInward=0,maxOutward=0;
 sculptSurfaceRegion(geometry,{name:'R152 brachialis crown with ruled asymmetric returns',sample:before=>{
  const v=new Vector3(...before),h=v.dot(axis)/length,a=Math.atan2(v.dot(outer),v.dot(front)),uv=[a,h];
  if(h<.43||h>.78||a<1.11||a>1.71)return null;
  const patch=patches.find(f=>weights(uv,...f.uvs));if(!patch)return null;
  const d=direction(a),oldTarget=(patch.d-patch.n.dot(axis)*h*length)/patch.n.dot(d),radial=v.clone().addScaledVector(axis,-v.dot(axis));
  let target=oldTarget;
  if(patch.owner==='return'&&!locked.has(key(v))){
   const ray=[a-center[0],h-center[1]],cross=(x,y)=>x[0]*y[1]-x[1]*y[0];
   for(let j=0;j<6;j++){
    const k=(j+1)%6,e=[outline[k][0]-outline[j][0],outline[k][1]-outline[j][1]],q=[outline[j][0]-center[0],outline[j][1]-center[1]],den=cross(ray,e);if(Math.abs(den)<1e-12)continue;
    const t=cross(q,e)/den,u=cross(q,ray)/den;if(t<1-1e-7||u< -1e-7||u>1+1e-7)continue;
    const at=1/t,wall=Math.max(0,Math.min(1,(at-.46)/.54)),uvC=[center[0]+ray[0]*t*.46,center[1]+ray[1]*t*.46];
    const rC=(offset-normal.dot(axis)*uvC[1]*length)/normal.dot(direction(uvC[0]));
    const rO=outerPoints[j].clone().addScaledVector(axis,-outerPoints[j].dot(axis)).length()*(1-u)+outerPoints[k].clone().addScaledVector(axis,-outerPoints[k].dot(axis)).length()*u;
    // Short soft turns border a predominantly straight wall. The biceps side
    // turns more decisively; the triceps-facing side has a longer approach.
    const eTurn=a<center[0]?.12:.20;
    const f=wall<eTurn?wall*wall/(2*eTurn):wall>1-eTurn?1-eTurn-(1-wall)*(1-wall)/(2*eTurn):wall-eTurn/2;
    const wallMix=f/(1-eTurn),ruled=rC+(rO-rC)*wallMix;
    target=oldTarget+(ruled-oldTarget)*smooth(.22,.27,v.distanceTo(joint))*smooth(.10,.22,Math.abs(a-Math.PI/2));break;
   }
  }
  const scaled=q=>[q[0]*.24,q[1]],dist=Math.min(...outline.map((q,j)=>segmentDistance(scaled(uv),scaled(q),scaled(outline[(j+1)%6])))),blend=smooth(0,.012,dist);
  const delta=(target-radial.length())*blend;if(Math.abs(delta)>.026)throw new Error('Brachialis face exceeds bounded support '+delta);
  count++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(d,delta).toArray();
 }});
 geometry.userData.brachialisPrimaryFace={version:'R152',side,outline,inner,center,crownNormal:normal.toArray(),crownAnchor:anchor.toArray(),baselineCrownRadius:rc,baselineAxialRadiusSlope:slope,changedTriangleVertices:count,maxInward,maxOutward,method:'retained R147 crown and boundary; six ruled radial-height returns, short asymmetric turns; old elbow support protected; no additional relief or channel depth',elbowProtection:{radius:.20,fade:[.22,.27],lockedTriangleCorners:locked.size},returnTurns:{biceps:.12,triceps:.20},status:'PARTIAL regional plane authoring'};
}


// R148: shared cap-to-arm support surface, with different anterior and
// posterior overlaps. The upper cap and both arm-belly crowns are locked.
// All radial targets come from the incoming retained support. No extra ring,
// detached plate or additive groove field is introduced.
function authorDeltoidInsertion(geometry,axis,front,outer,length,side){
 const p=geometry.attributes.position,source=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 const cache=new Map();function radius(h,a){const key=h+':'+a;if(cache.has(key))return cache.get(key);const c=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<source.length;i+=3)if(ray.intersectTriangle(source[i],source[i+1],source[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Deltoid insertion support ray missed');cache.set(key,r);return r;
 }
 // The lateral insertion descends between the front and posterior overlaps.
 // h is normalized along the actual rest humerus, never screen coordinates.
 const path=[[.28,.205],[.62,.225],[.97,.275],[1.42,.365],[1.77,.302],[2.15,.218],[2.55,.177],[2.96,.190]];
 const at=a=>{let j=0;while(j<path.length-2&&a>path[j+1][0])j++;const q=(a-path[j][0])/(path[j+1][0]-path[j][0]);return path[j][1]+q*(path[j+1][1]-path[j][1]);};
 const columns=[];
 for(let j=0;j<49;j++){
  const a=path[0][0]+j*(path.at(-1)[0]-path[0][0])/48,end=at(a),posterior=smooth(1.6,2.45,a);
  const h0=Math.max(.065,end-(.170-.030*posterior)),h1=end-(.065-.016*posterior),h2=end-.012,h3=end+.009,h4=Math.min(.403,end+.095-.026*posterior);
  const r0=radius(h0,a),r4=radius(h4,a),rEnd=radius(end,a),T=rEnd+radius(end,a+Math.PI),support=r0+(r4-r0)*(end-h0)/(h4-h0);
  // A support-level attachment sits under the cap, rather than carrying its
  // inflated lower support into the next muscle. Use a total support target.
  // The smaller posterior relief and longer anterior return are intentional.
  const depth=T*(.018-.005*posterior),floor=support-depth;
  const crown=r0+(support-r0)*.30,rs=[r0,crown,floor,floor,r4];
  columns.push({a,hs:[h0,h1,h2,h3,h4],rs,end,baselineAtJoin:rEnd,fullThickness:T,support,totalTargetSupportDepth:depth});
 }
 // Linear facing intervals with a finite rounded crest at either end.
 // Unlike a full cubic ramp, the middle64% has a constant section slope.
 const section=(c,h)=>{let j=0;while(j<3&&h>c.hs[j+1])j++;const t=Math.max(0,Math.min(1,(h-c.hs[j])/(c.hs[j+1]-c.hs[j]))),k=.18,u=t<k?t*t/(2*k*(1-k)):t>1-k?1-(1-t)*(1-t)/(2*k*(1-k)):(t-k/2)/(1-k);return c.rs[j]*(1-u)+c.rs[j+1]*u;};
 let moved=0,maxInward=0,maxOutward=0;
 sculptSurfaceRegion(geometry,{name:'R148 tapered deltoid insertion and asymmetric cap-arm overlaps',sample:before=>{
  const v=new Vector3(...before),h=v.dot(axis)/length,a=Math.atan2(v.dot(outer),v.dot(front));if(a<=path[0][0]||a>=path.at(-1)[0]||h<=.065||h>=.403)return null;
  const u=(a-path[0][0])/(path.at(-1)[0]-path[0][0])*48,j=Math.min(47,Math.floor(u)),t=u-j,x=columns[j],y=columns[j+1],lo=x.hs[0]*(1-t)+y.hs[0]*t,hi=x.hs[4]*(1-t)+y.hs[4]*t;if(h<=lo||h>=hi)return null;
  const z=(h-lo)/(hi-lo),hx=x.hs[0]+z*(x.hs[4]-x.hs[0]),hy=y.hs[0]+z*(y.hs[4]-y.hs[0]),target=section(x,hx)*(1-t)+section(y,hy)*t;
  const fade=smooth(0,.12,z)*(1-smooth(.88,1,z))*smooth(.28,.46,a)*(1-smooth(2.76,2.96,a));
  // The retained upper black-point and the new brachialis footprint start
  // distally; their neighborhood is protected before any surface evaluation.
  const pocketFade=smooth(.038,.060,Math.abs(h-.425));
  const radial=v.clone().addScaledVector(axis,-v.dot(axis)),delta=(target-radial.length())*fade*pocketFade;
  if(Math.abs(delta)>.045)throw new Error('Deltoid insertion exceeds local support bound '+delta);
  if(Math.abs(delta)<1e-8)return null;moved++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(radial.normalize(),delta).toArray();
 }});
 geometry.userData.deltoidInsertionSurface={version:'R148',side,frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},path,columns,changedTriangleVertices:moved,maxInward,maxOutward,method:'single bounded longitudinal support surface with linear facing intervals and softened18% ends; full cap crown to finite attachment return to next muscle; different front/rear lengths and directions',status:'PARTIAL candidate; inspect actual clay and crystal normals'};
}

// R150: rear cap and long-head triceps have separate crown directions.
// Both replace a bounded part of the incoming surface; they do not add masses
// or recess depth. The perimeter is anchored to B0, with attached return faces.
function authorPosteriorArmFaces(geometry,axis,front,outer,length,side){
 const pos=geometry.attributes.position,stock=Array.from({length:pos.count},(_,i)=>new Vector3().fromBufferAttribute(pos,i));
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 function radius(h,a){const c=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Posterior arm support ray missed');return r;
 }
 const definitions=[
  {owner:'REAR_DELTOID',center:[2.94,.015],facing:2.94,axialFacing:-.30,crownScale:[.38,.64],outline:[[2.02,-.045],[2.42,-.16],[3.08,-.17],[3.65,-.105],[3.86,.06],[3.48,.17],[2.83,.215],[2.29,.18]]},
  {owner:'TRICEPS_LONG_HEAD',center:[3.38,.385],facing:3.40,axialFacing:.10,crownScale:[.48,.70],outline:[[2.62,.32],[2.92,.20],[3.40,.18],[3.94,.265],[4.08,.40],[3.75,.53],[3.32,.62],[2.89,.52]]}
 ];
 const records=[];
 for(const C of definitions){
  const {outline,center}=C,inner=outline.map(p=>p.map((x,i)=>center[i]+C.crownScale[i]*(x-center[i]))),r=radius(center[1],center[0]);
  const normal=direction(C.facing).addScaledVector(axis,C.axialFacing).normalize(),anchor=axis.clone().multiplyScalar(center[1]*length).addScaledVector(direction(center[0]),r),offset=normal.dot(anchor);
  const point=(uv,depth)=>axis.clone().multiplyScalar(uv[1]*length).addScaledVector(direction(uv[0]),depth);
  const rim=outline.map(uv=>point(uv,radius(uv[1],uv[0]))),crown=inner.map(uv=>point(uv,(offset-normal.dot(axis)*uv[1]*length)/normal.dot(direction(uv[0]))));
  const patches=[],add=(uvs,points,owner)=>{const n=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();patches.push({uvs,n,d:n.dot(points[0]),radii:points.map(p=>p.clone().addScaledVector(axis,-p.dot(axis)).length()),owner});};
  for(let j=0;j<outline.length;j++){const k=(j+1)%outline.length;add([center,inner[j],inner[k]],[anchor,crown[j],crown[k]],'crown');add([inner[j],outline[j],outline[k]],[crown[j],rim[j],rim[k]],'return');add([inner[j],outline[k],inner[k]],[crown[j],rim[k],crown[k]],'return');}
  let count=0,maxInward=0,maxOutward=0;
  sculptSurfaceRegion(geometry,{name:'R150 '+C.owner+' crown and attached directional returns',sample:before=>{
   const v=new Vector3(...before),h=v.dot(axis)/length;let a=Math.atan2(v.dot(outer),v.dot(front));if(a<0)a+=2*Math.PI;
   if(a<2.02||a>4.18||h<-.17||h>.62)return null;
   const uv=[a,h],patch=patches.find(f=>weights(uv,...f.uvs));if(!patch)return null;
   const d=direction(a),w=weights(uv,...patch.uvs),den=normal.dot(d);
   // A wide anatomical return wraps around the humerus; extending a single
   // Cartesian triangle plane can become tangent to its radial ray. Use a
   // bounded chart-height interpolation between its measured support nodes.
   const target=patch.owner==='crown'?(offset-normal.dot(axis)*h*length)/den:w.reduce((s,t,i)=>s+t*patch.radii[i],0),radial=v.clone().addScaledVector(axis,-v.dot(axis));
   const scaled=q=>[q[0]*.24,q[1]],distance=Math.min(...outline.map((q,j)=>segmentDistance(scaled(uv),scaled(q),scaled(outline[(j+1)%outline.length])))),blend=smooth(0,.018,distance),delta=(target-radial.length())*blend;
   if(Math.abs(delta)>.035)throw new Error('Posterior arm crown exceeds support bound '+delta);
   if(Math.abs(delta)<1e-8)return null;count++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(d,delta).toArray();
  }});
  records.push({...C,inner,crownNormal:normal.toArray(),crownAnchor:anchor.toArray(),baselineCrownRadius:r,changedTriangleVertices:count,maxInward,maxOutward,frame:'mirrored anatomical rest angle/h; h normalized along retained humeral length',status:'PARTIAL authored support surface; validate clay',planeIds:Array.from({length:9},(_,i)=>`MR_CRYSTAL_${C.owner}_${side}_R150_${String(i+1).padStart(2,'0')}`)});
 }
 geometry.userData.posteriorArmFaces={version:'R150',side,source:'Phase II Mr branch R2/R3/R6; original male clay arm/back close-ups',frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},patches:records,method:'two independent B0-anchored crowns with different facing normals and attached perimeter returns; no additive relief or new groove'};
}

// R151: lateral triceps occupies its own long wedge beside the retained
// brachialis, narrowing into a supported elbow/tendon return. Posterior R150
// crowns, brachialis and old pocket floors lie outside this footprint.
function authorLateralTriceps(geometry,axis,front,outer,length,side,spec){
 const pos=geometry.attributes.position,stock=Array.from({length:pos.count},(_,i)=>new Vector3().fromBufferAttribute(pos,i));
 // The elbow seam owns its 0.17-unit neighborhood. Lock every corner of
 // each triangle touching that neighborhood, so normal reconstruction also
 // cannot feed altered normals through blendArmSeam into the forearm.
 const joint=new Vector3(...spec.elbow).sub(new Vector3(...spec.shoulder)),locked=new Set(),key=v=>v.toArray().map(x=>Math.round(x*1e6)).join(',');
 for(let i=0;i<stock.length;i+=3)if([0,1,2].some(j=>stock[i+j].distanceTo(joint)<=.17))for(let j=0;j<3;j++)locked.add(key(stock[i+j]));
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 function radius(h,a){const c=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Lateral triceps support ray missed');return r;
 }
 const definitions=[
  {owner:'TRICEPS_LATERAL_HEAD',center:[2.31,.535],facing:2.28,axialFacing:.05,crownScale:[.58,.56],outline:[[1.94,.43],[2.15,.35],[2.53,.365],[2.78,.49],[2.65,.62],[2.27,.76],[2.00,.69],[1.82,.57]]}
 ];
 const records=[];
 for(const C of definitions){
  const {outline,center}=C,inner=outline.map(p=>p.map((x,i)=>center[i]+C.crownScale[i]*(x-center[i]))),r=radius(center[1],center[0]);
  const normal=direction(C.facing).addScaledVector(axis,C.axialFacing).normalize(),anchor=axis.clone().multiplyScalar(center[1]*length).addScaledVector(direction(center[0]),r),offset=normal.dot(anchor);
  const point=(uv,depth)=>axis.clone().multiplyScalar(uv[1]*length).addScaledVector(direction(uv[0]),depth);
  const rim=outline.map(uv=>point(uv,radius(uv[1],uv[0]))),crown=inner.map(uv=>point(uv,(offset-normal.dot(axis)*uv[1]*length)/normal.dot(direction(uv[0]))));
  const patches=[],add=(uvs,points,owner)=>{const n=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();patches.push({uvs,n,d:n.dot(points[0]),radii:points.map(p=>p.clone().addScaledVector(axis,-p.dot(axis)).length()),owner});};
  for(let j=0;j<outline.length;j++){const k=(j+1)%outline.length;add([center,inner[j],inner[k]],[anchor,crown[j],crown[k]],'crown');add([inner[j],outline[j],outline[k]],[crown[j],rim[j],rim[k]],'return');add([inner[j],outline[k],inner[k]],[crown[j],rim[k],crown[k]],'return');}
  let count=0,maxInward=0,maxOutward=0;
  sculptSurfaceRegion(geometry,{name:'R151 '+C.owner+' crown and attached directional returns',sample:before=>{
   const v=new Vector3(...before);if(locked.has(key(v)))return null;const h=v.dot(axis)/length;let a=Math.atan2(v.dot(outer),v.dot(front));if(a<0)a+=2*Math.PI;
   if(a<1.82||a>2.78||h<.35||h>.84)return null;
   const uv=[a,h],patch=patches.find(f=>weights(uv,...f.uvs));if(!patch)return null;
   const d=direction(a),w=weights(uv,...patch.uvs),den=normal.dot(d);
   // A wide anatomical return wraps around the humerus; extending a single
   // Cartesian triangle plane can become tangent to its radial ray. Use a
   // bounded chart-height interpolation between its measured support nodes.
   const target=patch.owner==='crown'?(offset-normal.dot(axis)*h*length)/den:w.reduce((s,t,i)=>s+t*patch.radii[i],0),radial=v.clone().addScaledVector(axis,-v.dot(axis));
   const scaled=q=>[q[0]*.24,q[1]],distance=Math.min(...outline.map((q,j)=>segmentDistance(scaled(uv),scaled(q),scaled(outline[(j+1)%outline.length])))),blend=smooth(0,.016,distance)*smooth(.19,.235,v.distanceTo(joint)),delta=(target-radial.length())*blend;
   if(Math.abs(delta)>.030)throw new Error('Lateral triceps crown exceeds support bound '+delta);
   if(Math.abs(delta)<1e-8)return null;count++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(d,delta).toArray();
  }});
  records.push({...C,inner,crownNormal:normal.toArray(),crownAnchor:anchor.toArray(),baselineCrownRadius:r,changedTriangleVertices:count,maxInward,maxOutward,frame:'mirrored anatomical rest angle/h; h normalized along retained humeral length',status:'PARTIAL authored support surface; validate clay',planeIds:Array.from({length:9},(_,i)=>`MR_CRYSTAL_${C.owner}_${side}_R151_${String(i+1).padStart(2,'0')}`)});
 }
 geometry.userData.lateralTricepsSurface={version:'R151',side,elbowProtection:{radius:.17,fade:[.19,.235],lockedTriangleCorners:locked.size,method:'fixed seam-support triangle corners plus spatial fade outside joint owner'},source:'Phase II Mr branch R2/R3/R6; original male clay arm/back close-ups',frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},patches:records,method:'B0-anchored lateral-head crown with oblique brachialis-facing wall and long distal tendon return; fixed boundary; no additive relief or new groove'};
}

// R153: keep the R152 crown while carrying its returns into the actual
// neighboring muscle support. Short endpoint turns join broad ruled walls.
// This replaces the inset perimeter; no raised rim or additional groove.
function authorAnteriorBiceps(geometry,axis,front,outer,length,side,spec,refined=false,authored=null){
 const pos=geometry.attributes.position,stock=Array.from({length:pos.count},(_,i)=>new Vector3().fromBufferAttribute(pos,i));
 // The elbow seam owns its 0.17-unit neighborhood. Lock every corner of
 // each triangle touching that neighborhood, so normal reconstruction also
 // cannot feed altered normals through blendArmSeam into the forearm.
 const joint=new Vector3(...spec.elbow).sub(new Vector3(...spec.shoulder)),locked=new Set(),key=v=>v.toArray().map(x=>Math.round(x*1e6)).join(',');
 for(let i=0;i<stock.length;i+=3)if([0,1,2].some(j=>stock[i+j].distanceTo(joint)<=.17||(authored&&stock[i+j].dot(axis)/length>=.70)))for(let j=0;j<3;j++)locked.add(key(stock[i+j]));
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 function radius(h,a){const c=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Anterior biceps support ray missed');return r;
 }
 const center=authored?.center||[.20,.485],axialFacing=authored?.axialFacing??-(radius(.57,.20)-radius(.40,.20))/(.17*length);
 const definitions=[{owner:'BICEPS_ANTERIOR',center,facing:.20,axialFacing,crownScale:[.42,.78],crownSupportOutline:[[.12,.29],[.58,.38],[.70,.51],[.26,.65],[-.29,.60],[-.34,.41]],outline:[[.12,.29],[.78,.355],[.97,.515],[.26,.72],[-.49,.63],[-.62,.37]]}];
 // R181: the belly has an upper crown and a narrowing distal continuation.
 // These are absolute footprint landmarks, not a groove or scaled capsule.
 if(authored)definitions.splice(0,1,authored);
 if(refined&&!authored)Object.assign(definitions[0],{
  crownScale:[1,1],
  crownSupportOutline:[[.14,.305],[.45,.37],[.49,.485],[.16,.645],[-.205,.53],[-.255,.36]],
  outline:[[.12,.24],[.82,.32],[.92,.50],[.18,.77],[-.50,.60],[-.62,.35]]
 });
 const records=[];
 for(const C of definitions){
  const {outline,center}=C,inner=C.crownSupportOutline.map(p=>p.map((x,i)=>center[i]+C.crownScale[i]*(x-center[i]))),r=radius(center[1],center[0]);
  const normal=direction(C.facing).addScaledVector(axis,C.axialFacing).normalize(),anchor=axis.clone().multiplyScalar(center[1]*length).addScaledVector(direction(center[0]),r),offset=normal.dot(anchor);
  const axialCrown=authored?.axialCrown||(refined?[[.24,-.016],[.305,-.009],[.43,0],[.56,-.005],[.645,-.021],[.77,-.029]]:null);
  // Broad axial planes with short softened crests; the distal belly turns
  // into its tendon instead of continuing the same flat crown to the elbow.
  function crownHeight(h){
   if(!axialCrown)return offset;
   let j=0;while(j<axialCrown.length-2&&h>axialCrown[j+1][0])j++;
   const [a,x]=axialCrown[j],[b,y]=axialCrown[j+1];let value=x+(y-x)*(h-a)/(b-a);
   for(let k=1;k<axialCrown.length-1;k++){
    const [q,z]=axialCrown[k],w=.014;if(Math.abs(h-q)>=w)continue;
    const left=(z-axialCrown[k-1][1])/(q-axialCrown[k-1][0]),right=(axialCrown[k+1][1]-z)/(axialCrown[k+1][0]-q),t=(h-q+w)/(2*w);
    value=z-left*w+2*w*(left*t+(right-left)*t*t/2);
   }
   return offset+value;
  }
  const point=(uv,depth)=>axis.clone().multiplyScalar(uv[1]*length).addScaledVector(direction(uv[0]),depth);
  const rim=outline.map(uv=>point(uv,radius(uv[1],uv[0]))),crown=inner.map(uv=>point(uv,(crownHeight(uv[1])-normal.dot(axis)*uv[1]*length)/normal.dot(direction(uv[0]))));
  const patches=[],add=(uvs,points,owner)=>{const n=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();patches.push({uvs,n,d:n.dot(points[0]),radii:points.map(p=>p.clone().addScaledVector(axis,-p.dot(axis)).length()),owner});};
  for(let j=0;j<outline.length;j++){const k=(j+1)%outline.length;add([center,inner[j],inner[k]],[anchor,crown[j],crown[k]],'crown');add([inner[j],outline[j],outline[k]],[crown[j],rim[j],rim[k]],'return');add([inner[j],outline[k],inner[k]],[crown[j],rim[k],crown[k]],'return');}
  // A ruled return has an independently fixed crown edge and anatomical
  // support edge. Sample the support ALONG the edge; six remote corner
  // radii cannot describe the shoulder-to-belly attachment surface.
  const lerp=(a,b,t)=>a+(b-a)*t,uvLerp=(a,b,t)=>a.map((x,i)=>lerp(x,b[i],t));
  const support=outline.map((o,j)=>Array.from({length:25},(_,k)=>{
   const u=k/24,at=uvLerp(o,outline[(j+1)%outline.length],u),from=uvLerp(inner[j],inner[(j+1)%outline.length],u),beyond=at.map((x,i)=>x+.03*(x-from[i]));
   const height=q=>normal.dot(axis)*q[1]*length+normal.dot(direction(q[0]))*radius(q[1],q[0]),z=height(at);return {u,height:z,slope:(height(beyond)-z)/.03};
  }));
  let maxChartResidual=0,returnSamples=0;
  function returnAt(uv){
   for(let j=0;j<outline.length;j++){
    const k=(j+1)%outline.length,I=inner[j],J=inner[k],O=outline[j],P=outline[k];
    if(!weights(uv,I,O,P)&&!weights(uv,I,P,J))continue;
    let u=.5,t=.5;
    for(let iter=0;iter<7;iter++){
     const i=uvLerp(I,J,u),o=uvLerp(O,P,u),q=uvLerp(i,o,t),du=[0,1].map(c=>(J[c]-I[c])*(1-t)+(P[c]-O[c])*t),dt=o.map((x,c)=>x-i[c]),e=q.map((x,c)=>x-uv[c]),det=du[0]*dt[1]-du[1]*dt[0];
     if(Math.abs(det)<1e-10)break;
     u-=(e[0]*dt[1]-e[1]*dt[0])/det;t-=(du[0]*e[1]-du[1]*e[0])/det;
    }
    if(u< -1e-6||u>1+1e-6||t< -1e-6||t>1+1e-6)continue;
    u=Math.max(0,Math.min(1,u));t=Math.max(0,Math.min(1,t));
    const reconstructed=uvLerp(uvLerp(I,J,u),uvLerp(O,P,u),t),residual=Math.hypot(...uv.map((v,c)=>v-reconstructed[c]));
    if(residual>1e-6)throw new Error('Biceps return chart did not reconstruct its surface point '+residual);
    maxChartResidual=Math.max(maxChartResidual,residual);returnSamples++;
    const i=uvLerp(I,J,u),o=uvLerp(O,P,u),step=o.map((x,c)=>x-i[c]);
    const ri=crownHeight(i[1]),mi=(crownHeight(i[1]+.001*step[1])-ri)/.001,slot=Math.min(23,Math.floor(u*24)),fraction=u*24-slot;
    const ro=lerp(support[j][slot].height,support[j][slot+1].height,fraction),mo=lerp(support[j][slot].slope,support[j][slot+1].slope,fraction),slope=ro-ri;
    // Keep a broad straight-facing wall with short non-piped C1 endpoint
    // turns. Different muscle-side widths reflect the two attachments.
    const crownTurn=j<3?.16:.12,supportTurn=j<3?.28:.22;
    let target=ri+slope*t;
    if(t<crownTurn)target+=(mi-slope)*t*Math.pow(1-t/crownTurn,2);
    if(t>1-supportTurn)target+=(mo-slope)*(t-1)*Math.pow(1-(1-t)/supportTurn,2);
    const denominator=normal.dot(direction(uv[0]));if(denominator<.5)throw new Error('Biceps return leaves its facing chart');
    return {target:(target-normal.dot(axis)*uv[1]*length)/denominator,t,edge:j};
   }
   return null;
  }
  let count=0,maxInward=0,maxOutward=0;
  sculptSurfaceRegion(geometry,{name:(authored?'R182 ':refined?'R181 ':'R153 ')+C.owner+' crown and integrated support returns',sample:before=>{
   const v=new Vector3(...before);if(locked.has(key(v)))return null;const h=v.dot(axis)/length;let a=Math.atan2(v.dot(outer),v.dot(front));
   if(authored){if(a<0)a+=2*Math.PI;if(a<2.49||a>4.13||h<.18||h>.75)return null;}
   else if(a<-.62||a>.97||h<(refined?.24:.29)||h>(refined?.77:.72))return null;
   const uv=[a,h],patch=patches.find(f=>weights(uv,...f.uvs));if(!patch)return null;
   const d=direction(a),w=weights(uv,...patch.uvs),den=normal.dot(d);
   // A wide anatomical return wraps around the humerus; extending a single
   // Cartesian triangle plane can become tangent to its radial ray. Use a
   // bounded chart-height interpolation between its measured support nodes.
   const returned=patch.owner==='return'?returnAt(uv):null;
   if(patch.owner==='return'&&!returned)return null;
   const target=patch.owner==='crown'?(crownHeight(h)-normal.dot(axis)*h*length)/den:returned.target,radial=v.clone().addScaledVector(axis,-v.dot(axis));
   // The new crown and its return share one outer-envelope blend. An
   // independent fade at their common inner edge would create a step.
   const boundary=refined?outline:patch.owner==='crown'?C.crownSupportOutline:outline,scaled=q=>[q[0]*.24,q[1]],distance=Math.min(...boundary.map((q,j)=>segmentDistance(scaled(uv),scaled(q),scaled(boundary[(j+1)%boundary.length])))),blend=smooth(0,refined?.012:patch.owner==='crown'?.016:.006,distance)*smooth(.19,.235,v.distanceTo(joint)),delta=(target-radial.length())*blend;
   if(Math.abs(delta)>.030)throw new Error(C.owner+' crown exceeds support bound '+JSON.stringify({delta,h,a,before,returned,target,normal:normal.toArray()}));
   if(Math.abs(delta)<1e-8)return null;count++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(d,delta).toArray();
  }});
  records.push({...C,inner,axialCrown,returnChart:{maxResidual:maxChartResidual,samples:returnSamples,method:'triangle containment before inverse bilinear solve; UV reconstruction tolerance1e-6'},returnSupport: support,returnMethod:refined?'longitudinal crown-height surface; shared crown/return boundary and fixed completed R179 outer support; no added recess':'crown-facing height strip, densely sampled fixed outer support, short asymmetric C1 endpoint turns; preserved R152 crown',crownNormal:normal.toArray(),crownAnchor:anchor.toArray(),baselineCrownRadius:r,changedTriangleVertices:count,maxInward,maxOutward,frame:'mirrored anatomical rest angle/h; h normalized along retained humeral length',status:'PARTIAL authored support surface; validate clay',planeIds:Array.from({length:C.outline.length+1},(_,i)=>`MR_CRYSTAL_${C.owner}_${side}_${authored?'R182':refined?'R181':'R152'}_${String(i+1).padStart(2,'0')}`)});
 }
 if(authored&&geometry.userData.posteriorArmFaces)geometry.userData.posteriorArmFaces.patches=geometry.userData.posteriorArmFaces.patches.filter(p=>p.owner!==authored.owner).concat(records);
 geometry.userData[authored?'posteriorLongHeadSurface':'anteriorBicepsSurface']={version:authored?'R182':refined?'R181':'R153',side,elbowProtection:{radius:.17,fade:[.19,.235],lockedTriangleCorners:locked.size,method:'fixed seam-support triangle corners plus spatial fade outside joint owner'},source:authored?'R166 primary five-view male mold and arm/shoulder inset':'Phase II Mr branch R2/R3/R6; original male clay arm/back close-ups',frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},patches:records,method:authored?'oblique long-head crown with longitudinal contraction; shared outer-envelope blend; attached sampled returns; supersedes row-based posterior trial':refined?'R166 focused belly trial: wider proximal/anterior crown, three longitudinal facing regions, narrowing distal footprint and attached taper; measured perimeter and elbow support retained; no added recess':'retained R152 anterior crown; expanded muscle-owned support returns replace inset rim; sampled support slope; no new pocket or muscle layer'};
}

// R154: one anterior deltoid mass turns into the retained lateral cap.
// The bounded rest-frame surface leaves R153 biceps and outer span intact.
function authorDeltoidFace(geometry,axis,front,outer,length,side,spec,region='anterior'){
 const lateral=region==='lateral',version=lateral?'R155':'R154';
 const pos=geometry.attributes.position,stock=Array.from({length:pos.count},(_,i)=>new Vector3().fromBufferAttribute(pos,i));
 // The elbow seam owns its 0.17-unit neighborhood. Lock every corner of
 // each triangle touching that neighborhood, so normal reconstruction also
 // cannot feed altered normals through blendArmSeam into the forearm.
 const joint=new Vector3(...spec.elbow).sub(new Vector3(...spec.shoulder)),locked=new Set(),key=v=>v.toArray().map(x=>Math.round(x*1e6)).join(',');
 for(let i=0;i<stock.length;i+=3)if([0,1,2].some(j=>stock[i+j].distanceTo(joint)<=.17))for(let j=0;j<3;j++)locked.add(key(stock[i+j]));
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 function radius(h,a){const c=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Anterior deltoid support ray missed');return r;
 }
 const center=lateral?[1.46,-.01]:[.35,-.018],axialFacing=lateral?0:-(radius(.055,.35)-radius(-.085,.35))/(.14*length);
 const definitions=lateral?[{owner:'DELTOID_LATERAL',center,
  outline:[[.68,-.19],[1.27,-.22],[1.86,-.16],[2.02,-.045],[1.99,.15],[1.78,.26],[1.42,.342],[1.08,.105],[.98,-.06]],
  crownBoundary:[[1.18,-.065],[1.40,-.08],[1.65,-.04],[1.77,.025],[1.77,.105],[1.62,.145],[1.43,.18],[1.27,.10],[1.18,.015]]}]:[{owner:'DELTOID_ANTERIOR',center,facing:.35,axialFacing,
  outline:[[-.30,-.18],[.20,-.225],[.68,-.19],[.98,-.06],[1.08,.105],[.73,.242],[.18,.205],[-.30,.065]],
  crownBoundary:[[.08,-.075],[.37,-.085],[.60,-.080],[.77,-.025],[.80,.06],[.67,.155],[.33,.10],[.06,.00]]}];
 const records=[];
 for(const C of definitions){
  const {outline,center}=C;let inner=C.crownBoundary.map(p=>p.slice());const r=radius(center[1],center[0]);
  let normal,anchor,supportCrest=null;
  if(lateral){
   // The measured lateral crest, not a new mass percentage, owns the span.
   // Its tangent support plane supplies the broad side crown. The crest must
   // lie inside that crown so the existing shoulder extreme remains exact.
   const sign=Math.sign(outer.x);let best=-Infinity;
   for(const v of stock){const uv=[Math.atan2(v.dot(outer),v.dot(front)),v.dot(axis)/length];if(!outline.some((p,j)=>weights(uv,center,p,outline[(j+1)%outline.length])))continue;if(sign*v.x>best){best=sign*v.x;supportCrest={position:v.toArray(),uv};}}
   if(!supportCrest)throw new Error('Lateral crest support missing');
   const crestH=supportCrest.uv[1],upperH=-.08,spanNormal=new Vector3(sign,0,0),upper=axis.clone().multiplyScalar(upperH*length).addScaledVector(direction(supportCrest.uv[0]),radius(upperH,supportCrest.uv[0]));
   inner=[[1.18,-.065],[1.40,-.08],[1.65,-.04],[1.77,.015],[1.72,crestH],[1.58,crestH],[1.39,crestH],[1.27,.035],[1.18,-.005]];
   if(!inner.some((p,j)=>weights(supportCrest.uv,center,p,inner[(j+1)%inner.length])))throw new Error('Lateral crest lies outside its authored crown');
   const pitch=(best-spanNormal.dot(upper))/((crestH-upperH)*length);
   normal=spanNormal.clone().addScaledVector(axis,-pitch).normalize();const planeOffset=normal.dot(new Vector3(...supportCrest.position));
   const cr=(planeOffset-normal.dot(axis)*center[1]*length)/normal.dot(direction(center[0]));anchor=axis.clone().multiplyScalar(center[1]*length).addScaledVector(direction(center[0]),cr);
   supportCrest.upperSupport=upper.toArray();supportCrest.pitch=pitch;C.crownBoundary=inner.map(q=>q.slice());
   C.facing=Math.atan2(normal.dot(outer),normal.dot(front));C.axialFacing=normal.dot(axis)/Math.hypot(normal.dot(front),normal.dot(outer));
  }else{normal=direction(C.facing).addScaledVector(axis,C.axialFacing).normalize();anchor=axis.clone().multiplyScalar(center[1]*length).addScaledVector(direction(center[0]),r);}
  const offset=normal.dot(anchor),returnNormal=lateral?new Vector3(Math.sign(outer.x),0,0):normal;
  const point=(uv,depth)=>axis.clone().multiplyScalar(uv[1]*length).addScaledVector(direction(uv[0]),depth);
  const rim=outline.map(uv=>point(uv,radius(uv[1],uv[0]))),crown=inner.map(uv=>point(uv,(offset-normal.dot(axis)*uv[1]*length)/normal.dot(direction(uv[0]))));
  const patches=[],add=(uvs,points,owner)=>{const n=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();patches.push({uvs,n,d:n.dot(points[0]),radii:points.map(p=>p.clone().addScaledVector(axis,-p.dot(axis)).length()),owner});};
  for(let j=0;j<outline.length;j++){const k=(j+1)%outline.length;add([center,inner[j],inner[k]],[anchor,crown[j],crown[k]],'crown');add([inner[j],outline[j],outline[k]],[crown[j],rim[j],rim[k]],'return');add([inner[j],outline[k],inner[k]],[crown[j],rim[k],crown[k]],'return');}
  // A ruled return has an independently fixed crown edge and anatomical
  // support edge. Sample the support ALONG the edge; six remote corner
  // radii cannot describe the shoulder-to-belly attachment surface.
  const lerp=(a,b,t)=>a+(b-a)*t,uvLerp=(a,b,t)=>a.map((x,i)=>lerp(x,b[i],t));
  const support=outline.map((o,j)=>Array.from({length:25},(_,k)=>{
   const u=k/24,at=uvLerp(o,outline[(j+1)%outline.length],u),from=uvLerp(inner[j],inner[(j+1)%outline.length],u),beyond=at.map((x,i)=>x+.03*(x-from[i]));
   const height=q=>returnNormal.dot(axis)*q[1]*length+returnNormal.dot(direction(q[0]))*radius(q[1],q[0]),z=height(at);return {u,height:z,slope:(height(beyond)-z)/.03};
  }));
  let maxChartResidual=0,returnSamples=0;
  function returnAt(uv){
   for(let j=0;j<outline.length;j++){
    const k=(j+1)%outline.length,I=inner[j],J=inner[k],O=outline[j],P=outline[k];
    if(!weights(uv,I,O,P)&&!weights(uv,I,P,J))continue;
    let u=.5,t=.5;
    for(let iter=0;iter<7;iter++){
     const i=uvLerp(I,J,u),o=uvLerp(O,P,u),q=uvLerp(i,o,t),du=[0,1].map(c=>(J[c]-I[c])*(1-t)+(P[c]-O[c])*t),dt=o.map((x,c)=>x-i[c]),e=q.map((x,c)=>x-uv[c]),det=du[0]*dt[1]-du[1]*dt[0];
     if(Math.abs(det)<1e-10)break;
     u-=(e[0]*dt[1]-e[1]*dt[0])/det;t-=(du[0]*e[1]-du[1]*e[0])/det;
    }
    if(u< -1e-6||u>1+1e-6||t< -1e-6||t>1+1e-6)continue;
    u=Math.max(0,Math.min(1,u));t=Math.max(0,Math.min(1,t));
    const reconstructed=uvLerp(uvLerp(I,J,u),uvLerp(O,P,u),t),residual=Math.hypot(...uv.map((v,c)=>v-reconstructed[c]));
    if(residual>1e-6)throw new Error('Deltoid return chart did not reconstruct its surface point '+residual);
    maxChartResidual=Math.max(maxChartResidual,residual);returnSamples++;
    const i=uvLerp(I,J,u),o=uvLerp(O,P,u),step=o.map((x,c)=>x-i[c]);
    const crownHeight=q=>{const r=(offset-normal.dot(axis)*q[1]*length)/normal.dot(direction(q[0]));return returnNormal.dot(axis)*q[1]*length+returnNormal.dot(direction(q[0]))*r;};
    const ri=lateral?crownHeight(i):offset,mi=lateral?(crownHeight(i.map((x,c)=>x+.001*step[c]))-ri)/.001:0,slot=Math.min(23,Math.floor(u*24)),fraction=u*24-slot;
    const ro=lerp(support[j][slot].height,support[j][slot+1].height,fraction),mo=lerp(support[j][slot].slope,support[j][slot+1].slope,fraction),slope=ro-ri;
    // Keep a broad straight-facing wall with short non-piped C1 endpoint
    // turns. Different muscle-side widths reflect the two attachments.
    const crownTurn=j<3?.16:.12,supportTurn=j<3?.28:.22;
    const innerSlope=lateral?(Math.abs(slope)<1e-10?0:Math.sign(slope)*Math.max(0,Math.min(3*Math.abs(slope),Math.sign(slope)*mi))):mi;
    const outerSlope=lateral?(Math.abs(slope)<1e-10?0:Math.sign(slope)*Math.max(0,Math.min(3*Math.abs(slope),Math.sign(slope)*mo))):mo;
    let target=ri+slope*t;
    if(t<crownTurn)target+=(innerSlope-slope)*t*Math.pow(1-t/crownTurn,2);
    if(t>1-supportTurn)target+=(outerSlope-slope)*(t-1)*Math.pow(1-(1-t)/supportTurn,2);
    const denominator=returnNormal.dot(direction(uv[0]));if(denominator<.5)throw new Error('Deltoid return leaves its facing chart');
    return {target:(target-returnNormal.dot(axis)*uv[1]*length)/denominator,t,edge:j};
   }
   return null;
  }
  let count=0,maxInward=0,maxOutward=0;
  sculptSurfaceRegion(geometry,{name:version+' '+C.owner+' sloping crown and connected cap returns',sample:before=>{
   const v=new Vector3(...before);if(locked.has(key(v)))return null;const h=v.dot(axis)/length;let a=Math.atan2(v.dot(outer),v.dot(front));
   if(lateral?(a<.68||a>2.02||h<-.22||h>.342):(a<-.30||a>1.08||h<-.225||h>.242))return null;
   const uv=[a,h],patch=patches.find(f=>weights(uv,...f.uvs));if(!patch)return null;
   const d=direction(a),w=weights(uv,...patch.uvs),den=normal.dot(d);
   // A wide anatomical return wraps around the humerus; extending a single
   // Cartesian triangle plane can become tangent to its radial ray. Use a
   // bounded chart-height interpolation between its measured support nodes.
   const returned=patch.owner==='return'?returnAt(uv):null;
   if(patch.owner==='return'&&!returned)return null;
   const target=patch.owner==='crown'?(offset-normal.dot(axis)*h*length)/den:returned.target,radial=v.clone().addScaledVector(axis,-v.dot(axis));
   // The whole cap remains connected. The outer boundary is fixed to the
   // existing support; the interior crown owns its oblique facing direction.
   const boundary=outline,scaled=q=>[q[0]*.24,q[1]],distance=Math.min(...boundary.map((q,j)=>segmentDistance(scaled(uv),scaled(q),scaled(boundary[(j+1)%boundary.length])))),blend=smooth(0,.006,distance)*smooth(.19,.235,v.distanceTo(joint)),delta=(target-radial.length())*blend;
   if(Math.abs(delta)>.026)throw new Error('Anterior deltoid crown exceeds support bound '+JSON.stringify({delta,h,a,before,returned,target,normal:normal.toArray()}));
   if(Math.abs(delta)<1e-8)return null;count++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(d,delta).toArray();
  }});
  records.push({...C,inner,supportCrest,returnChart:{maxResidual:maxChartResidual,samples:returnSamples,method:'triangle containment before inverse bilinear solve; UV reconstruction tolerance1e-6'},returnSupport: support,returnMethod:'crown-facing height strip, densely sampled fixed outer support, short asymmetric C1 endpoint turns; independent anterior cap crown',crownNormal:normal.toArray(),crownAnchor:anchor.toArray(),baselineCrownRadius:r,changedTriangleVertices:count,maxInward,maxOutward,frame:'mirrored anatomical rest angle/h; h normalized along retained humeral length',status:'PARTIAL authored support surface; validate clay',planeIds:Array.from({length:C.outline.length+1},(_,i)=>`MR_CRYSTAL_${C.owner}_${side}_${version}_${String(i+1).padStart(2,'0')}`)});
 }
 geometry.userData[lateral?'lateralDeltoidSurface':'anteriorDeltoidSurface']={version,side,elbowProtection:{radius:.17,fade:[.19,.235],lockedTriangleCorners:locked.size,method:'fixed seam-support triangle corners plus spatial fade outside joint owner'},source:'Phase II Mr branch R2/R3/R6; original male clay arm/back close-ups',frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},patches:records,method:lateral?'pitched superior lateral crown anchored to retained crest and upper support preserves shoulder span; connected front/rear returns and tapered insertion support; monotone side-plane endpoint slopes; no new groove':'anterior deltoid facing crown anchored to retained radius and axial slope; oblique outer turn into lateral cap and short distal return above biceps; no added pocket or circumferential seam'};
}

// R156: reshape the attachment walls around the retained V floor. The floor
// is sampled from the fully authored incoming mesh: no additional depth field.
function authorDeltoidHandoff(geometry,axis,front,outer,length,side,spec){
 const pos=geometry.attributes.position,stock=Array.from({length:pos.count},(_,i)=>new Vector3().fromBufferAttribute(pos,i));
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 const joint=new Vector3(...spec.elbow).sub(new Vector3(...spec.shoulder)),locked=new Set(),key=v=>v.toArray().map(x=>Math.round(x*1e6)).join(',');
 for(let i=0;i<stock.length;i+=3)if([0,1,2].some(j=>stock[i+j].distanceTo(joint)<=.17))for(let j=0;j<3;j++)locked.add(key(stock[i+j]));
 function radius(h,a){const c=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Deltoid handoff support ray missed');return r;
 }
 const path=[[1.02,.292],[1.43,.366],[1.81,.302]],endAt=a=>{const j=a<1.43?0:1,x=path[j],y=path[j+1];return x[1]+(y[1]-x[1])*(a-x[0])/(y[0]-x[0]);};
 const column=a=>{const end=endAt(a),hs=[end-.110,end-.029,end-.007,end+.008,end+.108],r0=radius(hs[0],a),r4=radius(hs[4],a),floor=radius(end,a),support=r0+(r4-r0)*(end-hs[0])/(hs[4]-hs[0]),T=floor+radius(end,a+Math.PI);
  // Preserve the established floor and outer anchors. Extend the descending
  // cap face, then turn into a short wall; the brachialis side approaches over
  // a longer interval. Both walls have finite soft ends, without raised piping.
  const r1=r0+(floor-r0)*.30;
  return {a,end,hs,rs:[r0,r1,floor,floor,r4],fullThickness:T,baselineFloorRadius:floor,baselineChordDepth:support-floor,corridorWidth:(hs[4]-hs[0])*length,floorWidth:(hs[3]-hs[2])*length};
 };
 const columns=Array.from({length:33},(_,i)=>column(path[0][0]+i*(path.at(-1)[0]-path[0][0])/32)),stations=path.map(p=>column(p[0]));
 const section=(c,h)=>{let j=0;while(j<3&&h>c.hs[j+1])j++;const t=Math.max(0,Math.min(1,(h-c.hs[j])/(c.hs[j+1]-c.hs[j]))),k=j===1?.12:j===3?.20:.16,u=t<k?t*t/(2*k*(1-k)):t>1-k?1-(1-t)*(1-t)/(2*k*(1-k)):(t-k/2)/(1-k);return c.rs[j]+(c.rs[j+1]-c.rs[j])*u;};
 let moved=0,maxInward=0,maxOutward=0;
 sculptSurfaceRegion(geometry,{name:'R156 lateral deltoid V wall and proximal brachialis approach',sample:before=>{
  const v=new Vector3(...before);if(locked.has(key(v)))return null;const a=Math.atan2(v.dot(outer),v.dot(front)),h=v.dot(axis)/length;if(a<=1.02||a>=1.81)return null;
  const end=endAt(a),lo=end-.110,hi=end+.108;if(h<=lo||h>=hi)return null;
  const u=(a-1.02)/(.79)*32,j=Math.min(31,Math.floor(u)),f=u-j,x=columns[j],y=columns[j+1],z=(h-lo)/(hi-lo),target=section(x,x.hs[0]+z*(x.hs[4]-x.hs[0]))*(1-f)+section(y,y.hs[0]+z*(y.hs[4]-y.hs[0]))*f;
  const pocketFade=smooth(0,1,Math.max(Math.abs(h-.425)/.038,Math.abs(a-1.14)/.19)-1);
  const blend=smooth(1.02,1.10,a)*(1-smooth(1.73,1.81,a))*smooth(0,.07,z)*(1-smooth(.93,1,z))*pocketFade*smooth(.19,.235,v.distanceTo(joint));
  const r=v.clone().addScaledVector(axis,-v.dot(axis)).length(),delta=(target-r)*blend;
  if(Math.abs(delta)>.020)throw new Error('Deltoid handoff exceeds local support bound '+delta);if(Math.abs(delta)<1e-8)return null;
  moved++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(direction(a),delta).toArray();
 }});
 geometry.userData.deltoidBrachialisHandoff={version:'R156',side,frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},path,columns,stations,changedTriangleVertices:moved,maxInward,maxOutward,elbowProtection:{radius:.17,fade:[.19,.235],lockedTriangleCorners:locked.size},pocketProtection:{center:[1.14,.425],halfExtents:[.19,.038]},planeIds:Array.from({length:8},(_,i)=>`MR_CRYSTAL_DELTOID_HANDOFF_${side}_R156_${String(i+1).padStart(2,'0')}`),method:'bounded rest-frame replacement; retained floor and perimeter; extended cap facing wedge, short asymmetric wall, finite floor and longer brachialis approach; no extra recess depth',status:'PARTIAL geometry candidate; verify reference and posed views'};
}

// R157: the biceps sidewall and anterior brachialis return own different
// directions. Retain the actual incoming floor; do not deepen an old channel.
function authorBicepsBrachialisInterface(geometry,axis,front,outer,length,side,spec){
 const pos=geometry.attributes.position,stock=Array.from({length:pos.count},(_,i)=>new Vector3().fromBufferAttribute(pos,i));
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 const joint=new Vector3(...spec.elbow).sub(new Vector3(...spec.shoulder)),locked=new Set(),key=v=>v.toArray().map(x=>Math.round(x*1e6)).join(',');
 for(let i=0;i<stock.length;i+=3)if([0,1,2].some(j=>stock[i+j].distanceTo(joint)<=.17))for(let j=0;j<3;j++)locked.add(key(stock[i+j]));
 function radius(h,a){const c=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Biceps-brachialis support ray missed');return r;
 }
 // The separation follows the retained long biceps envelope, rather than
 // a short, nearly vertical patch. The crown and joint retain ownership.
 const path=[[.78,.37],[.92,.43],[1.015,.515],[.86,.60],[.38,.70]],h0=path[0][1],h1=path.at(-1)[1],lo=.08,hi=1.20;
 const floorAt=h=>{let j=0;while(j<path.length-2&&h>path[j+1][1])j++;const x=path[j],y=path[j+1];return x[0]+(y[0]-x[0])*(h-x[1])/(y[1]-x[1]);};
 const crowns=[...(geometry.userData.anteriorBicepsSurface?.patches||[]),{inner:geometry.userData.brachialisPrimaryFace?.inner},...(geometry.userData.anteriorDeltoidSurface?.patches||[]),...(geometry.userData.lateralDeltoidSurface?.patches||[])].filter(x=>x.inner);
 const crownMask=uv=>{let distance=Infinity;for(const c of crowns){if(c.inner.some((q,j)=>j>0&&j<c.inner.length-1&&weights(uv,c.inner[0],q,c.inner[j+1])))return 0;const metric=q=>[q[0]*.20,q[1]*length];for(let j=0;j<c.inner.length;j++)distance=Math.min(distance,segmentDistance(metric(uv),metric(c.inner[j]),metric(c.inner[(j+1)%c.inner.length])));}return smooth(0,.008,distance);};
 const row=h=>{const floorAngle=floorAt(h),scale=.18+.82*smooth(h0,h0+.065,h)*(1-smooth(h1-.075,h1,h)),angles=[floorAngle-.25*scale,floorAngle-.075*scale,floorAngle-.014*scale,floorAngle+.014*scale,floorAngle+.145*scale],r0=radius(h,angles[0]),r4=radius(h,angles[4]),baselineFloor=radius(h,floorAngle),T=baselineFloor+radius(h,floorAngle+Math.PI);
  const support=r0+(r4-r0)*(floorAngle-angles[0])/(angles[4]-angles[0]),baselineDepth=support-baselineFloor,targetDepth=Math.min(.010,.020*T),trialDepth=baselineDepth+.5*(targetDepth-baselineDepth),floor=support-trialDepth;
  // Total support-relative floor depth, not an extra cut. A short biceps
  // wall and longer brachialis approach meet a finite narrow floor.
  const wallSpan=baselineFloor*(angles[2]-angles[1]),shoulder=Math.min(r0+(floor-r0)*.28,floor+wallSpan);
  return {h,scale,angles,rs:[r0,Math.max(floor,shoulder),floor,floor,r4],floorAngle,fullThickness:T,baselineFloorRadius:baselineFloor,supportRadius:support,baselineDepth,targetDepth,trialDepth,corridorWidth:baselineFloor*(angles[4]-angles[0]),floorWidth:baselineFloor*(angles[3]-angles[2]),radialWallSlopeLimit:1};
 };
 const rows=Array.from({length:65},(_,i)=>row(h0+(h1-h0)*i/64)),stations=path.map(q=>row(q[1]));
 const section=(r,a)=>{let j=0;while(j<3&&a>r.angles[j+1])j++;const t=Math.max(0,Math.min(1,(a-r.angles[j])/(r.angles[j+1]-r.angles[j]))),k=j===1?.12:j===3?.24:.18,u=t<k?t*t/(2*k*(1-k)):t>1-k?1-(1-t)*(1-t)/(2*k*(1-k)):(t-k/2)/(1-k);return r.rs[j]+(r.rs[j+1]-r.rs[j])*u;};
 let moved=0,maxInward=0,maxOutward=0;
 sculptSurfaceRegion(geometry,{name:'R161 long biceps boundary with measured finite floor and asymmetric returns',sample:before=>{
  const v=new Vector3(...before);if(locked.has(key(v)))return null;const a=Math.atan2(v.dot(outer),v.dot(front)),h=v.dot(axis)/length;if(h<=h0||h>=h1||a<=lo||a>=hi)return null;
  const u=(h-h0)/(h1-h0)*64,j=Math.min(63,Math.floor(u)),f=u-j,x=rows[j],y=rows[j+1],left=x.angles[0]*(1-f)+y.angles[0]*f,right=x.angles[4]*(1-f)+y.angles[4]*f;if(a<=left||a>=right)return null;
  const target=section(x,a)*(1-f)+section(y,a)*f,t=(a-left)/(right-left);
  const blend=crownMask([a,h])*smooth(h0,h0+.020,h)*(1-smooth(h1-.025,h1,h))*smooth(0,.08,t)*(1-smooth(.91,1,t))*smooth(.19,.235,v.distanceTo(joint));
  const r=v.clone().addScaledVector(axis,-v.dot(axis)).length(),delta=(target-r)*blend;if(Math.abs(delta)>.020)throw new Error('Biceps-brachialis return exceeds local support bound '+delta);if(Math.abs(delta)<1e-8)return null;
  moved++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(direction(a),delta).toArray();
 }});
 geometry.userData.bicepsBrachialisInterface={version:'R161',side,frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},bounds:{h:[h0,h1],angle:[lo,hi]},path,footprintScale:{method:'five mirrored anatomical landmarks follow the long biceps envelope; tapered endpoints; independent crown protection'},rows,stations,changedTriangleVertices:moved,maxInward,maxOutward,elbowProtection:{radius:.17,fade:[.19,.235],lockedTriangleCorners:locked.size},planeIds:Array.from({length:16},(_,i)=>`MR_CRYSTAL_BICEPS_BRACHIALIS_${side}_R161_${String(i+1).padStart(2,'0')}`),method:'long biceps-owned boundary; frozen support-relative TOTAL floor target at alpha0.5; actual crown masks, finite floor, asymmetric returns and fixed joint support; not a diamond edge or added depth multiplier',status:'PARTIAL inspect matched views before accepting'};
}

// R158: the posterior brachialis boundary has a longer, quieter approach
// than its anterior boundary. Replace the local support, retaining its floor.
function authorBrachialisTricepsInterface(geometry,axis,front,outer,length,side,spec){
 const pos=geometry.attributes.position,stock=Array.from({length:pos.count},(_,i)=>new Vector3().fromBufferAttribute(pos,i));
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 const joint=new Vector3(...spec.elbow).sub(new Vector3(...spec.shoulder)),locked=new Set(),key=v=>v.toArray().map(x=>Math.round(x*1e6)).join(',');
 for(let i=0;i<stock.length;i+=3)if([0,1,2].some(j=>stock[i+j].distanceTo(joint)<=.17))for(let j=0;j<3;j++)locked.add(key(stock[i+j]));
 function radius(h,a){const c=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Brachialis-triceps support ray missed');return r;
 }
 // The lateral-triceps crown begins above angle2.025; the brachialis crown
 // ends below1.527. This corridor owns only their connecting return surfaces.
 const h0=.475,h1=.705,lo=1.60,hi=2.018;
 const row=h=>{const floorAngle=1.93-.13*smooth(.40,.78,h),scale=h<.56?.30+.70*(h-h0)/(.56-h0):1-.82*(h-.56)/(h1-.56),angles=[floorAngle+(lo-floorAngle)*scale,floorAngle-.018*scale,floorAngle+.018*scale,floorAngle+(hi-floorAngle)*scale],floor=radius(h,floorAngle);
  return {h,scale,angles,rs:[radius(h,angles[0]),floor,floor,radius(h,angles[3])],floorAngle,fullThickness:floor+radius(h,floorAngle+Math.PI),baselineFloorRadius:floor};
 };
 const rows=Array.from({length:33},(_,i)=>row(h0+(h1-h0)*i/32)),stations=[row(h0),row(.56),row(h1)];
 const section=(r,a)=>{let j=0;while(j<2&&a>r.angles[j+1])j++;const t=Math.max(0,Math.min(1,(a-r.angles[j])/(r.angles[j+1]-r.angles[j]))),k=j===0?.26:j===2?.16:.20,u=t<k?t*t/(2*k*(1-k)):t>1-k?1-(1-t)*(1-t)/(2*k*(1-k)):(t-k/2)/(1-k);return r.rs[j]+(r.rs[j+1]-r.rs[j])*u;};
 let moved=0,maxInward=0,maxOutward=0;
 sculptSurfaceRegion(geometry,{name:'R158 posterior brachialis approach and lateral triceps return',sample:before=>{
  const v=new Vector3(...before);if(locked.has(key(v)))return null;const a=Math.atan2(v.dot(outer),v.dot(front)),h=v.dot(axis)/length;if(h<=h0||h>=h1||a<=lo||a>=hi)return null;
  const u=(h-h0)/(h1-h0)*32,j=Math.min(31,Math.floor(u)),f=u-j,x=rows[j],y=rows[j+1],left=x.angles[0]*(1-f)+y.angles[0]*f,right=x.angles[3]*(1-f)+y.angles[3]*f;if(a<=left||a>=right)return null;
  const target=section(x,a)*(1-f)+section(y,a)*f,t=(a-left)/(right-left),blend=smooth(h0,h0+.020,h)*(1-smooth(h1-.025,h1,h))*smooth(0,.08,t)*(1-smooth(.91,1,t))*smooth(.19,.235,v.distanceTo(joint));
  const r=v.clone().addScaledVector(axis,-v.dot(axis)).length(),delta=(target-r)*blend;if(Math.abs(delta)>.020)throw new Error('Brachialis-triceps return exceeds local support bound '+delta);if(Math.abs(delta)<1e-8)return null;
  moved++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(direction(a),delta).toArray();
 }});
 geometry.userData.brachialisTricepsInterface={version:'R158',side,frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},bounds:{h:[h0,h1],angle:[lo,hi]},footprintScale:{stations:[[h0,.30],[.56,1],[h1,.18]],method:'tapered posterior attachment footprint; independent of the sharper anterior boundary'},rows,stations,changedTriangleVertices:moved,maxInward,maxOutward,elbowProtection:{radius:.17,fade:[.19,.235],lockedTriangleCorners:locked.size},planeIds:Array.from({length:6},(_,i)=>`MR_CRYSTAL_BRACHIALIS_TRICEPS_${side}_R158_${String(i+1).padStart(2,'0')}`),method:'long posterior brachialis approach; finite retained floor; shorter lateral-triceps return; radial replacement of bounded support, no additional floor-depth target; existing crowns and anterior boundary protected',status:'PARTIAL verify matched lateral and rear views'};
}

// R159: an attached distal tendon face beneath the retained triceps crowns.
// Its facing plane is anchored to measured proximal/distal B0 support,
// with separate medial and lateral returns, not a new circumferential cut.
function authorDistalTricepsTendon(geometry,axis,front,outer,length,side,spec){
 const pos=geometry.attributes.position,stock=Array.from({length:pos.count},(_,i)=>new Vector3().fromBufferAttribute(pos,i));
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 const joint=new Vector3(...spec.elbow).sub(new Vector3(...spec.shoulder)),locked=new Set(),key=v=>v.toArray().map(x=>Math.round(x*1e6)).join(',');
 for(let i=0;i<stock.length;i+=3)if([0,1,2].some(j=>stock[i+j].distanceTo(joint)<=.17))for(let j=0;j<3;j++)locked.add(key(stock[i+j]));
 function radius(h,a){const c=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Distal triceps support ray missed');return r;
 }
 const path=[{h:.575,angles:[2.78,3.035,3.40,3.72]},{h:.69,angles:[2.38,2.81,3.45,3.97]},{h:.865,angles:[2.99,3.075,3.22,3.34]}],h0=path[0].h,h1=path[2].h,facing=3.17;
 const supportH=[.60,.83],supportR=supportH.map(h=>radius(h,facing)),slope=(supportR[1]-supportR[0])/((supportH[1]-supportH[0])*length),normal=direction(facing).addScaledVector(axis,-slope).normalize(),atH=.69,atR=supportR[0]+(supportR[1]-supportR[0])*(atH-supportH[0])/(supportH[1]-supportH[0]),anchor=axis.clone().multiplyScalar(atH*length).addScaledVector(direction(facing),atR),offset=normal.dot(anchor);
 const row=h=>{const k=h<path[1].h?0:1,x=path[k],y=path[k+1],t=(h-x.h)/(y.h-x.h),angles=x.angles.map((a,j)=>a+(y.angles[j]-a)*t),plane=a=>(offset-normal.dot(axis)*h*length)/normal.dot(direction(a));return{h,angles,rs:[radius(h,angles[0]),plane(angles[1]),plane(angles[2]),radius(h,angles[3])],baselineCenterRadius:radius(h,facing)};};
 const rows=Array.from({length:41},(_,i)=>row(h0+(h1-h0)*i/40)),stations=path.map(p=>row(p.h));
 const section=(r,a)=>{let j=0;while(j<2&&a>r.angles[j+1])j++;if(j===1)return(offset-normal.dot(axis)*r.h*length)/normal.dot(direction(a));const t=Math.max(0,Math.min(1,(a-r.angles[j])/(r.angles[j+1]-r.angles[j]))),k=j===0?.18:.28,u=t<k?t*t/(2*k*(1-k)):t>1-k?1-(1-t)*(1-t)/(2*k*(1-k)):(t-k/2)/(1-k);return r.rs[j]+(r.rs[j+1]-r.rs[j])*u;};
 let moved=0,maxInward=0,maxOutward=0;
 sculptSurfaceRegion(geometry,{name:'R159 distal triceps tendon face and attached side returns',sample:before=>{
  const v=new Vector3(...before);if(locked.has(key(v)))return null;let a=Math.atan2(v.dot(outer),v.dot(front));if(a<0)a+=2*Math.PI;const h=v.dot(axis)/length;if(h<=h0||h>=h1||a<=2.38||a>=3.97)return null;
  const u=(h-h0)/(h1-h0)*40,j=Math.min(39,Math.floor(u)),f=u-j,x=rows[j],y=rows[j+1],left=x.angles[0]*(1-f)+y.angles[0]*f,right=x.angles[3]*(1-f)+y.angles[3]*f;if(a<=left||a>=right)return null;
  const target=section(x,a)*(1-f)+section(y,a)*f,t=(a-left)/(right-left),blend=smooth(h0,h0+.025,h)*(1-smooth(h1-.025,h1,h))*smooth(0,.10,t)*(1-smooth(.90,1,t))*smooth(.19,.235,v.distanceTo(joint));
  const r=v.clone().addScaledVector(axis,-v.dot(axis)).length(),delta=(target-r)*blend;if(Math.abs(delta)>.025)throw new Error('Distal triceps tendon exceeds local support bound '+delta);if(Math.abs(delta)<1e-8)return null;
  moved++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(direction(a),delta).toArray();
 }});
 geometry.userData.distalTricepsTendon={version:'R159',side,frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},bounds:{h:[h0,h1],angle:[2.38,3.97]},path,rows,stations,support:{h:supportH,radius:supportR,facing,normal:normal.toArray(),anchor:anchor.toArray(),axialRadiusSlope:slope,definition:'one tendon facing plane through the measured proximal/distal baseline surface on angle3.17; side edges remain separately anchored'},changedTriangleVertices:moved,maxInward,maxOutward,elbowProtection:{radius:.17,fade:[.19,.235],lockedTriangleCorners:locked.size},planeIds:Array.from({length:6},(_,i)=>`MR_CRYSTAL_TRICEPS_TENDON_${side}_R159_${String(i+1).padStart(2,'0')}`),method:'tapered posterior tendon footprint below existing crowns; measured support plane with asymmetric attached side returns; no additional recess depth or joint edit',status:'PARTIAL verify lateral/rear and flexed elbow'};
}

// R160: separate radial-sweep and extensor primary faces in the actual
// palm/thumb forearm chart. Both replace bounded support, never add a bulb.
function authorProximalForearm(geometry,axis,front,outer,length,side){
 const pos=geometry.attributes.position,stock=Array.from({length:pos.count},(_,i)=>new Vector3().fromBufferAttribute(pos,i)),wrist=axis.clone().multiplyScalar(length);
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a)),locked=new Set(),key=v=>v.toArray().map(x=>Math.round(x*1e6)).join(',');
 // Keep actual joint-support vertices and their original normal fields; do not
 // freeze unrelated corners of neighboring muscle-facing triangles.
 const supportNormals=Object.fromEntries(['aSmooth','aMoldNormal'].filter(n=>geometry.attributes[n]).map(n=>[n,geometry.attributes[n].array.slice()]));
 for(const v of stock)if(v.length()<=.17||v.distanceTo(wrist)<=.12)locked.add(key(v));
 function radius(h,a){const c=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Proximal forearm support ray missed');return r;
 }
 // R167 keeps the actual joint support positions/normals, not every
 // distant corner on adjacent triangles. The muscle face can now approach
 // its attachment while the existing seam owner remains unchanged.
 const jointSupport=new Set(locked);
 const definitions=[
  {owner:'FOREARM_RADIAL_SWEEP',center:[1.12,.40],facing:1.12,crownScale:[.48,.56],slopeH:[.30,.51],outline:[[.55,.24],[1.07,.22],[1.50,.32],[1.62,.47],[1.35,.65],[1.05,.76],[.74,.56],[.48,.37]]},
  {owner:'FOREARM_EXTENSOR',center:[2.36,.435],facing:2.40,crownScale:[.54,.52],slopeH:[.31,.55],outline:[[1.82,.27],[2.34,.22],[2.89,.33],[3.08,.48],[2.68,.67],[2.22,.74],[1.87,.59],[1.77,.42]]}
 ];
 const records=[];
 for(const C of definitions){
  const {outline,center}=C,inner=outline.map(p=>p.map((x,i)=>center[i]+C.crownScale[i]*(x-center[i]))),r=radius(center[1],center[0]),supportR=C.slopeH.map(h=>radius(h,C.facing)),axialFacing=-(supportR[1]-supportR[0])/((C.slopeH[1]-C.slopeH[0])*length),normal=direction(C.facing).addScaledVector(axis,axialFacing).normalize(),anchor=axis.clone().multiplyScalar(center[1]*length).addScaledVector(direction(center[0]),r),offset=normal.dot(anchor);
  const point=(uv,r)=>axis.clone().multiplyScalar(uv[1]*length).addScaledVector(direction(uv[0]),r),rim=outline.map(uv=>point(uv,radius(uv[1],uv[0]))),crown=inner.map(uv=>point(uv,(offset-normal.dot(axis)*uv[1]*length)/normal.dot(direction(uv[0])))),patches=[];
  const add=(uvs,ps,owner)=>patches.push({uvs,radii:ps.map(p=>p.clone().addScaledVector(axis,-p.dot(axis)).length()),owner});
  for(let j=0;j<outline.length;j++){const k=(j+1)%outline.length;add([center,inner[j],inner[k]],[anchor,crown[j],crown[k]],'crown');add([inner[j],outline[j],outline[k]],[crown[j],rim[j],rim[k]],'return');add([inner[j],outline[k],inner[k]],[crown[j],rim[k],crown[k]],'return');}
  let count=0,maxInward=0,maxOutward=0;
  sculptSurfaceRegion(geometry,{name:'R167 '+C.owner+' primary face and directional returns',sample:before=>{
   const v=new Vector3(...before);if(locked.has(key(v)))return null;const h=v.dot(axis)/length;let a=Math.atan2(v.dot(outer),v.dot(front));if(a<-.5)a+=Math.PI*2;const uv=[a,h],patch=patches.find(f=>weights(uv,...f.uvs));if(!patch)return null;
   const d=direction(a),w=weights(uv,...patch.uvs),target=patch.owner==='crown'?(offset-normal.dot(axis)*h*length)/normal.dot(d):w.reduce((s,t,i)=>s+t*patch.radii[i],0),radial=v.clone().addScaledVector(axis,-v.dot(axis));
   const scaled=q=>[q[0]*.19,q[1]],distance=Math.min(...outline.map((q,j)=>segmentDistance(scaled(uv),scaled(q),scaled(outline[(j+1)%outline.length])))),blend=smooth(0,.015,distance)*smooth(.17,.205,v.length())*smooth(.12,.155,v.distanceTo(wrist)),delta=(target-radial.length())*blend;
   if(Math.abs(delta)>.025)throw new Error('Forearm primary face exceeds bounded support '+C.owner+' '+delta);if(Math.abs(delta)<1e-8)return null;
   count++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(d,delta).toArray();
  }});
  records.push({...C,inner,axialFacing,supportR,crownNormal:normal.toArray(),crownAnchor:anchor.toArray(),baselineCrownRadius:r,changedTriangleVertices:count,maxInward,maxOutward,planeIds:Array.from({length:9},(_,i)=>`MR_CRYSTAL_${C.owner}_${side}_R160_${String(i+1).padStart(2,'0')}`),status:'PARTIAL inspect actual neutral and bent-pose surfaces'});
 }
 for(let i=0;i<stock.length;i++)if(locked.has(key(stock[i])))for(const[n,values]of Object.entries(supportNormals)){const attr=geometry.attributes[n];for(let k=0;k<3;k++)attr.array[i*3+k]=values[i*3+k];attr.needsUpdate=true;}
 geometry.userData.proximalForearmSurface={version:'R167',side,frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length,coordinates:'forearm-local angle around palm/positive thumb; h from elbow toward wrist'},patches:records,jointProtection:{elbowRadius:.17,elbowFade:[.17,.205],wristRadius:.12,wristFade:[.12,.155],jointSupportCorners:jointSupport.size,lockedTriangleCorners:locked.size,normalSupportRings:0,exactSupportNormals:true},method:'two independently bounded B0-anchored crown planes with distinct axes, elongated footprints and attached radial-height returns; exact joint support normals restored; no added groove or global width target'};
}

// R169: the visible proximal ledge is a forearm-origin surface, not the knob.
// Replace its transverse shelf with an oblique, measured support transition.
export function authorForearmOrigin(geometry,axis,front,outer,length,side){
 const p=geometry.attributes.position,stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const boundaryNormals=Object.fromEntries(['aSmooth','aMoldNormal'].filter(n=>geometry.attributes[n]).map(n=>[n,geometry.attributes[n].array.slice()])),wrist=axis.clone().multiplyScalar(length);
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 const radius=(h,a)=>{const c=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(c.clone().addScaledVector(d,.6),d.clone().negate()),hit=new Vector3();let r=-Infinity;for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('Forearm origin support missing');return r;};
 const path=[[-.25,.035,.235],[.45,.030,.265],[1.25,.010,.305]],at=a=>{const k=a<.45?0:1,x=path[k],y=path[k+1],t=(a-x[0])/(y[0]-x[0]);return[x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t];};
 const columns=Array.from({length:33},(_,i)=>{const a=-.25+1.5*i/32,[h0,h1]=at(a),r0=radius(h0,a),r1=radius(h1,a),slope=(r1-r0)/(h1-h0),raw0=(radius(h0+.004,a)-r0)/.004,raw1=(r1-radius(h1-.004,a))/.004;
 // Monotone endpoint slopes prevent a new overshoot or second belly.
 const limit=x=>slope===0?0:Math.sign(slope)*Math.max(0,Math.min(Math.abs(x),3*Math.abs(slope))),m0=raw0*slope>0?limit(raw0):0,m1=raw1*slope>0?limit(raw1):0;
 const ratio=Math.hypot(m0/slope||0,m1/slope||0),k=ratio>3?3/ratio:1;return{a,h0,h1,r0,r1,m0:m0*k,m1:m1*k};});
 const section=(c,t)=>{const t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*c.r0+(t3-2*t2+t)*(c.h1-c.h0)*c.m0+(-2*t3+3*t2)*c.r1+(t3-t2)*(c.h1-c.h0)*c.m1;};
 const trialAlpha=.5;let moved=0,maxInward=0,maxOutward=0;
 sculptSurfaceRegion(geometry,{name:'R169 oblique radial-flexor origin support',sample:before=>{const v=new Vector3(...before),h=v.dot(axis)/length,a=Math.atan2(v.dot(outer),v.dot(front));if(a<=-.25||a>=1.25)return null;const [h0,h1]=at(a);if(h<=h0||h>=h1)return null;const t=(h-h0)/(h1-h0),j=Math.min(31,Math.floor((a+.25)/1.5*32)),f=(a+.25)/1.5*32-j,target=section(columns[j],t)*(1-f)+section(columns[j+1],t)*f,radial=v.clone().addScaledVector(axis,-v.dot(axis)),blend=trialAlpha*smooth(-.25,-.10,a)*(1-smooth(1.10,1.25,a))*smooth(0,.07,t)*(1-smooth(.93,1,t)),delta=(target-radial.length())*blend;
 if(Math.abs(delta)>.025)throw new Error('Forearm origin exceeds bounded support');if(Math.abs(delta)<1e-8)return null;moved++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(direction(a),delta).toArray();}});
 // Keep the unchanged end-cap/wrist normal boundary after the original
 // joint seam has been solved; new face normals stay local to this origin.
 for(let i=0;i<stock.length;i++)if(stock[i].dot(axis)/length<=.005||stock[i].distanceTo(wrist)<=.12)for(const[n,values]of Object.entries(boundaryNormals)){const attr=geometry.attributes[n];for(let k=0;k<3;k++)attr.array[i*3+k]=values[i*3+k];attr.needsUpdate=true;}
 geometry.userData.forearmOriginSupport={version:'R169',side,frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},path,columns,trialAlpha,changedTriangleVertices:moved,maxInward,maxOutward,source:'R167 ray-picked proximal forearm ledge; original male arm/shoulder mold',method:'oblique start/end bounds, measured current support radii/tangents, monotone Hermite transition; fixed distal belly and joint-end boundary; no recess or extra mass field',status:'PARTIAL inspect supported poses'};
}


// R166 focused mass pass. Coherent muscle-owned displacement acts on the
// completed anatomical skin, before normal/atlas partitioning. Each muscle
// has its own origin, broad crown interval and insertion, in the rest frame.
// No circular arm scale, rim tube, new recess or independent surface layer.
function authorArmVolumeRhythm(geometry,axis,front,outer,length,side,spec){
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};
 const envelope=(x,a,b,c,d)=>ease((x-a)/(b-a))*(1-ease((x-c)/(d-c)));
 const fields=[
  {owner:'ANTERIOR_DELTOID_INSERTION',h:[.08,.16,.205,.29],a:[-.65,-.24,.45,.94],direction:front.clone().negate(),travel:.008},
  {owner:'POSTERIOR_DELTOID_INSERTION',h:[.07,.145,.20,.295],a:[2.12,2.63,3.56,4.08],direction:front.clone(),travel:.010},
  {owner:'LATERAL_DELTOID_INSERTION',h:[.16,.24,.28,.38],a:[1.04,1.32,1.72,2.08],direction:outer.clone().negate(),travel:.007},
  {owner:'BICEPS_LONG_BELLY',h:[.245,.37,.51,.72],a:[-.74,-.33,.62,1.035],direction:front.clone(),travel:.019},
  {owner:'TRICEPS_LONG_AND_LATERAL_BELLY',h:[.19,.32,.475,.735],a:[1.96,2.50,3.74,4.39],direction:front.clone().negate(),travel:.018}
 ];
 const joint=new Vector3(...spec.elbow).sub(new Vector3(...spec.shoulder)),pos=geometry.attributes.position,key=a=>a.map(x=>Math.round(x*1e6)).join(','),locked=new Set();
 for(let i=0;i<pos.count;i+=3){const ps=[0,1,2].map(j=>new Vector3().fromBufferAttribute(pos,i+j));if(ps.some(p=>p.distanceTo(joint)<.19||p.dot(axis)/length>=.70))ps.forEach(p=>locked.add(key(p.toArray())));}
 let moved=0,maxTravel=0;
 const record=fields.map(f=>({owner:f.owner,axialEnvelope:f.h,angularEnvelope:f.a,direction:f.direction.toArray(),maxRequestedTravel:f.travel,affectedCorners:0,maximumWeight:0}));
 sculptSurfaceRegion(geometry,{name:'R182 under-delt contraction and competing anterior/posterior muscle bellies',sample:before=>{
  if(locked.has(key(before)))return null;
  const p=new Vector3(...before),h=p.dot(axis)/length;let a=Math.atan2(p.dot(outer),p.dot(front));if(a<-.8)a+=2*Math.PI;
  const delta=new Vector3();for(let i=0;i<fields.length;i++){const f=fields[i],w=envelope(h,...f.h)*envelope(a,...f.a);if(w<=1e-8)continue;delta.addScaledVector(f.direction,w*f.travel);record[i].affectedCorners++;record[i].maximumWeight=Math.max(record[i].maximumWeight,w);}
  delta.multiplyScalar(smooth(.205,.255,p.distanceTo(joint)));
  if(delta.length()<1e-8)return null;if(delta.length()>.025)throw new Error('Arm mass ownership exceeds its bounded travel');moved++;maxTravel=Math.max(maxTravel,delta.length());return p.add(delta).toArray();
 }});
 geometry.userData.armVolumeRhythm={version:'R182',source:'R166 controlling male mold, five-view arm and shoulder inset',frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},fields:record,changedTriangleCorners:moved,maxDisplacement:maxTravel,geometryBuiltOnce:true,elbowProtected:{lockedCorners:locked.size,radius:.19,fade:[.205,.255],distalTrianglesProtectedFromH:.70},method:'coherent directional muscle-envelope transport; separate deltoid insertion and biceps/triceps axial crowns; completed baseline surface, no added groove, no global scaling',status:'TRIAL: front/pure-side/three-quarter/rear parity required'};
}


// R184: replace the damaged lateral-head return as one two-dimensional
// surface. All four boundary curves remain on the retained skin. The actual
// bent-arm contact triangles, not a sphere around the elbow, own the joint.
export function authorDistalArmContactReturn(upper,fore,spec){
 if(spec.shoulder[0]<0)return;
 const f=upper.userData.anteriorBicepsSurface.frame,axis=new Vector3(...f.axis),front=new Vector3(...f.front),outer=new Vector3(...f.outer),length=f.length,offset=new Vector3(...spec.elbow).sub(new Vector3(...spec.shoulder));
 const p=upper.attributes.position,stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i)),h0=.565,h1=.87,a0=1.90,a1=3.02;
 const direction=a=>front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a));
 const key=v=>v.toArray().map(x=>Math.round(x*1e6)).join(',');
 function radius(h,a){const center=axis.clone().multiplyScalar(h*length),d=direction(a),ray=new Ray(center.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))r=Math.max(r,hit.clone().sub(center).dot(d));
  if(!Number.isFinite(r))throw new Error('Lateral triceps boundary has no retained surface');return r;
 }
 const count=65,hs=Array.from({length:count},(_,i)=>h0+(h1-h0)*i/(count-1)),angles=Array.from({length:count},(_,i)=>a0+(a1-a0)*i/(count-1));
 const left=hs.map(h=>radius(h,a0)),right=hs.map(h=>radius(h,a1)),top=angles.map(a=>radius(h0,a)),bottom=angles.map(a=>radius(h1,a));
 const sample=(values,t)=>{const u=Math.max(0,Math.min(1,t))*(count-1),i=Math.min(count-2,Math.floor(u));return values[i]+(values[i+1]-values[i])*(u-i);};
 const evaluate=v=>{
  const h=v.dot(axis)/length,a=Math.atan2(v.dot(outer),v.dot(front));if(h<=h0||h>=h1||a<=a0||a>=a1)return 0;
  const u=(a-a0)/(a1-a0),t=(h-h0)/(h1-h0),bilinear=(1-u)*(1-t)*left[0]+u*(1-t)*right[0]+(1-u)*t*left.at(-1)+u*t*right.at(-1);
  const target=(1-u)*sample(left,t)+u*sample(right,t)+(1-t)*sample(top,u)+t*sample(bottom,u)-bilinear;
  const weight=smooth(h0,h0+.035,h)*(1-smooth(h1-.035,h1,h))*smooth(a0,a0+.15,a)*(1-smooth(a1-.15,a1,a));
  const delta=(target-v.clone().addScaledVector(axis,-h*length).length())*weight;
  if(Math.abs(delta)>.025)throw new Error('Lateral triceps connected return exceeds retained support bound');return delta;
 };
 const nodes=[],byKey=new Map(),indices=stock.map(v=>{const k=key(v);if(!byKey.has(k)){byKey.set(k,nodes.length);nodes.push({p:v,links:new Map(),distance:Infinity});}return byKey.get(k);});
 const active=[];
 for(let i=0;i<stock.length;i+=3){
  if([0,1,2].some(j=>Math.abs(evaluate(stock[i+j]))>1e-8))active.push(i);
  for(const [a,b]of [[0,1],[1,2],[2,0]]){const x=indices[i+a],y=indices[i+b],d=stock[i+a].distanceTo(stock[i+b]);nodes[x].links.set(y,d);nodes[y].links.set(x,d);}
 }
 const intersects=(a,b)=>{
  for(const [x,y]of [[a,b],[b,a]])for(let j=0;j<3;j++){
   const delta=x[(j+1)%3].clone().sub(x[j]),length=delta.length();if(length<1e-10)continue;
   const ray=new Ray(x[j],delta.divideScalar(length)),hit=new Vector3();if(ray.intersectTriangle(y[0],y[1],y[2],false,hit)){const d=hit.distanceTo(x[j]);if(d>1e-8&&d<length-1e-8)return true;}
  }return false;
 };
 const fp=fore.attributes.position,foreStock=Array.from({length:fp.count},(_,i)=>new Vector3().fromBufferAttribute(fp,i));
 // Existing R166 inspection fixture, sampled from the authored raised-arm
 // rest pose through its neutral-down elbow rotation. This only constrains
 // the fixed master; no animation or camera-dependent geometry is added.
 const neutral=new Quaternion().setFromUnitVectors(new Vector3(...spec.wrist).sub(new Vector3(...spec.elbow)).normalize(),new Vector3(.035,-.35,.04).normalize()),protectedFaces=new Set();
 for(const t of [0,.25,.5,.75,1]){
  const q=new Quaternion().slerp(neutral,t),v=foreStock.map(p=>p.clone().applyQuaternion(q).add(offset)),triangles=[];
  for(let i=0;i<v.length;i+=3){const vs=v.slice(i,i+3);triangles.push({v:vs,min:vs[0].clone().min(vs[1]).min(vs[2]),max:vs[0].clone().max(vs[1]).max(vs[2])});}
  for(const i of active){if(protectedFaces.has(i))continue;const vs=stock.slice(i,i+3),min=vs[0].clone().min(vs[1]).min(vs[2]),max=vs[0].clone().max(vs[1]).max(vs[2]);
   for(const tri of triangles){if(tri.max.x<min.x||tri.min.x>max.x||tri.max.y<min.y||tri.min.y>max.y||tri.max.z<min.z||tri.min.z>max.z)continue;if(intersects(vs,tri.v)){protectedFaces.add(i);break;}}
  }
 }
 const queue=[],locked=new Set();for(const i of protectedFaces)for(let j=0;j<3;j++)locked.add(indices[i+j]);
 for(const i of locked){nodes[i].distance=0;queue.push({i,d:0});}
 while(queue.length){let best=0;for(let i=1;i<queue.length;i++)if(queue[i].d<queue[best].d)best=i;const {i,d}=queue.splice(best,1)[0];if(d!==nodes[i].distance||d>.035)continue;
  for(const[j,w]of nodes[i].links){const next=d+w;if(next<nodes[j].distance){nodes[j].distance=next;queue.push({i:j,d:next});}}
 }
 let changed=0,maxInward=0,maxOutward=0;
 sculptSurfaceRegion(upper,{name:'R184 connected lateral-triceps return with actual swept-contact boundary',sample:before=>{
  const v=new Vector3(...before),node=nodes[byKey.get(key(v))],delta=evaluate(v)*smooth(0,.035,node.distance);if(Math.abs(delta)<1e-8)return null;
  changed++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return v.addScaledVector(v.clone().addScaledVector(axis,-v.dot(axis)).normalize(),delta).toArray();
 }});
 upper.userData.distalLateralTricepsRepair={version:'R184',source:'R166 primary male mold; exact R182 distal lateral-head side picks',frame:f,bounds:{h:[h0,h1],angle:[a0,a1]},boundaryCurves:{hs,angles,left,right,top,bottom},contact:{support:'actual forearm triangles across five existing elbow poses',neutralQuaternion:neutral.toArray(),protectedTriangles:protectedFaces.size,lockedVertices:locked.size,surfaceDistanceFade:.035},changedTriangleVertices:changed,maxInward,maxOutward,method:'four-boundary Coons radial support; exact contact triangles with geodesic falloff; no extra groove or crown inflation',status:'TRIAL five-view clay and bend checks required'};
}



// R185 muscle-belly art: one continuous swept skin, with longitudinally
// authored crowns and tendon returns. Arm diamond partitioning is bypassed.
// R189: seat only the medial attachment against actual torso triangles.
// The lateral crown and superior shoulder silhouette remain the retained skin.
export function fitShoulderTorsoAttachment(g,torso,spec){
 const f=g.userData.muscleBellyOnly.frame,axis=new Vector3(...f.axis),front=new Vector3(...f.front),outer=new Vector3(...f.outer),offset=new Vector3(...spec.shoulder),side=Math.sign(offset.x),tp=torso.attributes.position,triangles=[];
 for(let i=0;i<tp.count;i+=3){const ps=[0,1,2].map(k=>new Vector3().fromBufferAttribute(tp,i+k));if(Math.max(...ps.map(p=>p.y))>1.94&&Math.min(...ps.map(p=>p.y))<2.20)triangles.push(ps);}
 const ray=new Ray(new Vector3(),new Vector3(-side,0,0)),hit=new Vector3();let changed=0,maxTravel=0;const seats=[];
 sculptSurfaceRegion(g,{name:'R189 medial deltoid attachment to measured torso skin',sample:before=>{
  const p=new Vector3(...before),h=p.dot(axis)/f.length;if(h<=-.43||h>=.16)return null;
  const angle=Math.atan2(p.dot(outer),p.dot(front)),medial=1-smooth(-.80,-.12,Math.sin(angle));if(medial<1e-6)return null;
  const q=p.clone().add(offset);if(q.y<1.94||q.y>2.20)return null;
  ray.origin.set(side*1.2,q.y,q.z);let boundary=-Infinity;
  for(const ps of triangles)if(ray.intersectTriangle(...ps,false,hit))boundary=Math.max(boundary,side*hit.x);
  if(!Number.isFinite(boundary))return null;
  const gap=side*q.x-boundary;
  const w=medial*smooth(-.43,-.29,h)*(1-smooth(.02,.16,h))*(1-smooth(.065,.10,gap));
  const originalTravel=Math.max(0,gap+.004)*w;
  const posterior=1-smooth(-.08,.02,p.dot(front));
  const axial=medial*smooth(-.43,-.29,h)*(1-smooth(.02,.16,h));
  const seatedTravel=Math.max(0,.044*Math.tanh((gap+.004)/.044))*axial;
  const travel=originalTravel+(seatedTravel-originalTravel)*posterior;if(travel<1e-8)return null;
  if(travel>.075)throw new Error('R189 medial shoulder seat exceeds measured local corridor');
  changed++;maxTravel=Math.max(maxTravel,travel);if(seats.length<32)seats.push({point:q.toArray(),torsoX:side*boundary,gap,travel});
  return p.add(new Vector3(-side*travel,0,0)).toArray();
 }});
 g.userData.shoulderAttachment={version:'R200-B',owner:'medial deltoid / pec and rear-delt attachment',source:'ray intersections with actual retained torso',changedCorners:changed,maxTravel,seats,protected:'lateral crown sin(angle)>=-.12; axial tips; all elbow/forearm/wrist/hand geometry',representation:'medial skin seated into torso surface; no new objects or topology',status:'TRIAL five-view clay and protected silhouette checks'};
}

export function authorMuscleBellies(geometry,spec,axisVector){
 const axis=new Vector3(...axisVector),length=axis.length();axis.normalize();
 const front=new Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),outer=new Vector3().crossVectors(axis,front);if(outer.x*spec.shoulder[0]<0)outer.negate();
 const initialTriangles=geometry.attributes.position.count/3;
 // Shape-preserving cubic interpolation: a crown stays broad, its return
 // meets the shared support with a finite slope instead of an ellipsoid cusp.
 const spline=(knots,x)=>{
  const n=knots.length; if(x<=knots[0][0])return knots[0][1];if(x>=knots[n-1][0])return knots[n-1][1];
  const slopes=knots.slice(1).map((b,i)=>(b[1]-knots[i][1])/(b[0]-knots[i][0]));
  const tangent=i=>{if(i===0||i===n-1)return 0;const a=slopes[i-1],b=slopes[i];return a*b<=0?0:2*a*b/(a+b);};
  let i=0;while(x>knots[i+1][0])i++;const a=knots[i],b=knots[i+1],dx=b[0]-a[0],t=(x-a[0])/dx;
  return (2*t*t*t-3*t*t+1)*a[1]+(t*t*t-2*t*t+t)*dx*tangent(i)+(-2*t*t*t+3*t*t)*b[1]+(t*t*t-t*t)*dx*tangent(i+1);
 };
 const core=[[-0.46, 0.0295], [-0.25, 0.11209999999999999], [-0.1, 0.11209999999999999], [0.16, 0.0826], [0.3, 0.0767], [0.58, 0.07315999999999999], [0.85, 0.06372], [1.09, 0.056639999999999996]];
 const forms=[{"owner": "LATERAL_DELTOID", "t": -0.09, "h": 0.32, "x": 0.09204, "z": 0.0, "rx": 0.12389999999999998, "rz": 0.12744, "dx": 0.0}, {"owner": "ANTERIOR_DELTOID", "t": -0.035, "h": 0.29, "x": 0.0413, "z": 0.0767, "rx": 0.1003, "rz": 0.0885, "dx": 0.0}, {"owner": "POSTERIOR_DELTOID", "t": -0.055, "h": 0.27, "x": 0.035399999999999994, "z": -0.07315999999999999, "rx": 0.1003, "rz": 0.09204, "dx": 0.0}, {"owner": "BICEPS", "t": 0.45, "h": 0.39, "x": -0.02242, "z": 0.0767, "rx": 0.09912, "rz": 0.10619999999999999, "dx": 0.0}, {"owner": "TRICEPS_LONG_HEAD", "t": 0.48, "h": 0.46, "x": -0.00944, "z": -0.07079999999999999, "rx": 0.0944, "rz": 0.11209999999999999, "dx": 0.0}, {"owner": "TRICEPS_LATERAL_HEAD", "t": 0.45, "h": 0.4, "x": 0.07788, "z": -0.04956, "rx": 0.08496, "rz": 0.09204, "dx": 0.0}, {"owner": "BRACHIALIS", "t": 0.63, "h": 0.36, "x": 0.08496, "z": 0.017699999999999997, "rx": 0.06608, "rz": 0.07434, "dx": 0.0}];
 const radial=(h,a)=>{
  const sa=Math.sin(a),ca=Math.cos(a);let r=spline(core,h),owner='SHARED_SUPPORT';
  for(const m of forms){const u=(h-m.t)/m.h;if(Math.abs(u)>=1)continue;
   const taper=Math.sqrt(1-u*u),x=(m.x+m.dx*u)*taper,z=m.z*taper,A=(sa/m.rx)**2+(ca/m.rz)**2,B=-2*(sa*x/m.rx**2+ca*z/m.rz**2),C=(x/m.rx)**2+(z/m.rz)**2+u*u-1,D=B*B-4*A*C;
   if(D<=0)continue;const surface=(-B+Math.sqrt(D))/(2*A);if(surface<=0)continue;
   const k=.01652,blend=Math.max(k-Math.abs(r-surface),0)/k;if(surface>r)owner=m.owner;r=Math.max(r,surface)+blend*blend*k*.25;
  }return {radius:r,owner};
 };
 // Fit the distal muscle return to the actual retained elbow-support
 // ring. A broad lerp against noisy interior points creates a false cuff;
 // this monotone bridge has one measured attachment boundary instead.
 const stock=Array.from({length:geometry.attributes.position.count},(_,i)=>new Vector3().fromBufferAttribute(geometry.attributes.position,i)),endAngles=Array.from({length:129},(_,i)=>-Math.PI+2*Math.PI*i/128);
 const endR=endAngles.map(a=>{const d=front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a)),c=axis.clone().multiplyScalar(.85*length),ray=new Ray(c.clone().addScaledVector(d,.8),d.clone().negate()),hit=new Vector3();let r=-Infinity;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))r=Math.max(r,hit.clone().sub(c).dot(d));if(!Number.isFinite(r))throw new Error('R185 distal attachment ring has no support');return r;
 });
 const distalRadius=(h,a)=>{const u=(a+Math.PI)/(2*Math.PI)*128,i=Math.min(127,Math.max(0,Math.floor(u))),mix=u-i,r1=endR[i]+(endR[i+1]-endR[i])*mix,h0=.64,h1=.85,r0=radial(h0,a).radius,secant=(r1-r0)/(h1-h0);
  let slope=(radial(h0+.001,a).radius-radial(h0-.001,a).radius)/.002;if(slope*secant<=0)slope=0;else slope=Math.sign(slope)*Math.min(Math.abs(slope),2*Math.abs(secant));
  const t=(h-h0)/(h1-h0),dx=h1-h0;return(2*t*t*t-3*t*t+1)*r0+(t*t*t-2*t*t+t)*dx*slope+(-2*t*t*t+3*t*t)*r1+(t*t*t-t*t)*dx*secant;
 };
 // R185: the retained left mesh has a small folded surface chart below
 // the biceps/brachialis junction. Redistribute EXISTING chart samples with
 // a fixed-boundary harmonic solve. No subdivision or detached patch.
 const chartNodes=new Map(),chartRecord={selected:0,iterations:0,maxTangentTravel:0};
 const pointKey=v=>v.toArray().map(x=>x.toFixed(6)).join(',');
 if(spec.shoulder[0]>0){
  const p=geometry.attributes.position,nodes=[],indices=[];
  for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i),key=pointKey(v);let n=chartNodes.get(key);if(!n){n={id:nodes.length,a:Math.atan2(v.dot(outer),v.dot(front)),h:v.dot(axis)/length,links:new Set()};n.original=[n.a,n.h];n.active=n.a>1.10&&n.a<1.20&&n.h>.40&&n.h<.447;chartNodes.set(key,n);nodes.push(n);}indices.push(n.id);}
  for(let i=0;i<indices.length;i+=3)for(const[x,y]of [[0,1],[1,2],[2,0]]){const a=indices[i+x],b=indices[i+y];if(a!==b){nodes[a].links.add(b);nodes[b].links.add(a);}}
  const active=nodes.filter(n=>n.active);chartRecord.selected=active.length;
  for(let k=0;k<10000;k++){let residual=0;for(const n of active){let a=0,h=0;for(const j of n.links){a+=nodes[j].a;h+=nodes[j].h;}a/=n.links.size;h/=n.links.size;residual=Math.max(residual,Math.abs(a-n.a),Math.abs(h-n.h));n.a=a;n.h=h;}chartRecord.iterations=k+1;if(residual<1e-12)break;}
  for(const n of active){const movement=Math.hypot((n.a-n.original[0])*.16,(n.h-n.original[1])*length);chartRecord.maxTangentTravel=Math.max(chartRecord.maxTangentTravel,movement);}
  if(chartRecord.maxTangentTravel>.006)throw new Error('R185 local folded-chart repair exceeds .006 rest-surface travel');
 }
 let changed=0,maxInward=0,maxOutward=0;
 sculptSurfaceRegion(geometry,{name:'R185 continuous elongated muscle bellies and shared tendon returns',sample:before=>{
  const v=new Vector3(...before),h=v.dot(axis)/length;if(h<=-.34||h>=.85)return null;
  const n=chartNodes.get(pointKey(v)),hh=n?.active?n.h:h,a=n?.active?n.a:Math.atan2(v.dot(outer),v.dot(front)),d=v.clone().addScaledVector(axis,-h*length),r=d.length(),target=h>.64?{radius:distalRadius(hh,a),owner:'DISTAL_MUSCLE_ATTACHMENT'}:radial(hh,a),rootProtection=(1-smooth(.05,.30,h))*(1-smooth(-.70,-.20,Math.sin(a))),blend=smooth(-.34,-.22,h)*(1-smooth(.835,.85,h))*(1-rootProtection),delta=(target.radius-r)*blend;
  const after=axis.clone().multiplyScalar(hh*length).addScaledVector(front,Math.cos(a)*(r+delta)).addScaledVector(outer,Math.sin(a)*(r+delta));
  if(after.distanceTo(v)>.10)throw new Error('R185 scoped muscle volume exceeded '+JSON.stringify({delta,h,a,r,target}));
  if(after.distanceTo(v)<1e-8)return null;changed++;maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);return after.toArray();
 }});
 geometry.userData.muscleBellyOnly={version:'R186-B',side:spec.shoulder[0]<0?'R':'L',frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},forms,core,attachment:{distalH:[.64,.85],angles:endAngles,radii:endR,method:'monotone crown-to-measured support bridge; medial shoulder root preserved through h.05 with fade to.30'},chartRepair:chartRecord,footprintH:[-.34,.85],changedTriangleVertices:changed,maxInward,maxOutward,initialTriangles,finalTriangles:geometry.attributes.position.count/3,method:'Mrs-photo muscle ownership adapted to male radial dimensions, tapered-offset organic solids blended into a continuous existing skin; retained Mr shoulder and elbow support; no detached muscle objects',status:'TRIAL: five-view and joint proof required'};
 geometry.userData.supersededArmAtlas={planes:geometry.userData.diamondPlaneAtlas?.length||0,pockets:geometry.userData.blackPointRegistry?.length||0,reason:'R185 user redirect: muscle-belly art owns upper-arm surface'};geometry.userData.diamondPlaneAtlas=[];geometry.userData.blackPointRegistry=[];
 geometry.userData.authoringMaster={stage:'G1 primary muscle-belly art',geometryBuiltOnce:true,runtimeMesh:false};return geometry;
}


// R186: continuous forearm bellies in the rest frame of the palm and thumb.
// The original elbow seat and distal wrist fit remain fixed. These are broad
// volumes with separate axial peaks, not diamond islands or engraved tracks.
export function authorForearmBellies(geometry,axis,front,outer,length,side){
 const core=[[-0.2, 0.054279999999999995], [0, 0.07197999999999999], [0.12, 0.07788], [0.2, 0.056639999999999996], [0.65, 0.04956], [1.04, 0.04956]];
 const forms=[{"owner": "BRACHIORADIALIS", "t": 0.28, "h": 0.36, "x": 0.05073999999999999, "z": 0.027139999999999997, "rx": 0.06844, "rz": 0.06135999999999999, "dx": -0.0472}, {"owner": "FLEXOR_MASS", "t": 0.36, "h": 0.44, "x": -0.03186, "z": 0.028319999999999998, "rx": 0.0649, "rz": 0.07079999999999999, "dx": 0.014159999999999999}, {"owner": "EXTENSOR_MASS", "t": 0.32, "h": 0.4, "x": 0.0295, "z": -0.025959999999999997, "rx": 0.07197999999999999, "rz": 0.0649, "dx": -0.02124}];
 const spline=(knots,x)=>{const n=knots.length;if(x<=knots[0][0])return knots[0][1];if(x>=knots[n-1][0])return knots[n-1][1];const ds=knots.slice(1).map((b,i)=>(b[1]-knots[i][1])/(b[0]-knots[i][0]));const m=i=>i===0||i===n-1||ds[i-1]*ds[i]<=0?0:2*ds[i-1]*ds[i]/(ds[i-1]+ds[i]);let i=0;while(x>knots[i+1][0])i++;const a=knots[i],b=knots[i+1],dt=b[0]-a[0],t=(x-a[0])/dt;return(2*t*t*t-3*t*t+1)*a[1]+(t*t*t-2*t*t+t)*dt*m(i)+(-2*t*t*t+3*t*t)*b[1]+(t*t*t-t*t)*dt*m(i+1);};
 const radial=(h,a)=>{
  const sa=Math.sin(a),ca=Math.cos(a);let r=spline(core,h),owner='SHARED_SUPPORT';
  for(const m of forms){const u=(h-m.t)/m.h;if(Math.abs(u)>=1)continue;
   const taper=Math.sqrt(1-u*u),x=(m.x+m.dx*u)*taper,z=m.z*taper,A=(sa/m.rx)**2+(ca/m.rz)**2,B=-2*(sa*x/m.rx**2+ca*z/m.rz**2),C=(x/m.rx)**2+(z/m.rz)**2+u*u-1,D=B*B-4*A*C;
   if(D<=0)continue;const surface=(-B+Math.sqrt(D))/(2*A);if(surface<=0)continue;
   const k=.01652,blend=Math.max(k-Math.abs(r-surface),0)/k;if(surface>r)owner=m.owner;r=Math.max(r,surface)+blend*blend*k*.25;
  }return r;
 };
 let changed=0,maxTravel=0,maxInward=0,maxOutward=0;
 sculptSurfaceRegion(geometry,{name:'R186 connected brachioradialis and flexor/extensor muscle bellies',sample:before=>{
  const p=new Vector3(...before),h=p.dot(axis)/length;if(h<=.06||h>=.82)return null;
  const a=Math.atan2(p.dot(outer),p.dot(front)),r=p.clone().addScaledVector(axis,-p.dot(axis)).length();
  const w=smooth(.06,.17,h)*(1-smooth(.69,.82,h)),delta=(radial(h,a)-r)*w;
  if(Math.abs(delta)<1e-8)return null;if(Math.abs(delta)>.065)throw new Error('R186 forearm primary transport exceeds local bound');
  changed++;maxTravel=Math.max(maxTravel,Math.abs(delta));maxInward=Math.max(maxInward,-delta);maxOutward=Math.max(maxOutward,delta);
  return p.addScaledVector(front,Math.cos(a)*delta).addScaledVector(outer,Math.sin(a)*delta).toArray();
 }});
 geometry.userData.forearmMuscleBellies={version:'R186-B',side,frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray(),length},core,forms,changedTriangleCorners:changed,maxTravel,maxInward,maxOutward,footprint:[.06,.82],protected:['proximal elbow seat h<=.06','distal wrist fit h>=.82'],method:'three long muscle-owned crowns on one connected support, unchanged topology; bounded origin and tendon blends',status:'TRIAL front/side/five-view and existing bend checks'};
 geometry.userData.blackPointRegistry=[];
}
