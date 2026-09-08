import {Vector3,Quaternion,Float32BufferAttribute} from '../../vendor/three/three.module.min.js';

const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};
export {deform as deformMrsRetainedSurface};
const band=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
const bell=(x,c,h)=>{const q=Math.abs((x-c)/h);return q>=1?0:(1-q*q)**3;};
function interpolate(rows,t){
 let i=0;while(i<rows.length-2&&t>rows[i+1][0])i++;
 const slope=j=>(rows[j+1][1]-rows[j][1])/(rows[j+1][0]-rows[j][0]);
 const tangent=j=>{if(j===0)return slope(0);if(j===rows.length-1)return slope(j-1);const a=slope(j-1),b=slope(j);return a*b<=0?0:2*a*b/(a+b);};
 const[a,x]=rows[i],[b,y]=rows[i+1],h=b-a,u=Math.max(0,Math.min(1,(t-a)/h));
 return(2*u*u*u-3*u*u+1)*x+(u*u*u-2*u*u+u)*h*tangent(i)+(-2*u*u*u+3*u*u)*y+(u*u*u-u*u)*h*tangent(i+1);
}
function sectionWidths(g,axis,out,length,stations){
 const p=g.attributes.position,points=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 return stations.map(t=>{let lo=Infinity,hi=-Infinity;
  for(let i=0;i<points.length;i+=3)for(let k=0;k<3;k++){const a=points[i+k],b=points[i+(k+1)%3],at=a.dot(axis)/length,bt=b.dot(axis)/length;
   if((at<=t&&bt>t)||(bt<=t&&at>t)){const x=a.dot(out)+(b.dot(out)-a.dot(out))*(t-at)/(bt-at);lo=Math.min(lo,x);hi=Math.max(hi,x);}
  }if(!Number.isFinite(hi-lo))throw new Error('M126 missing section '+t);return[t,hi-lo];
 });
}

function coupleSurface(stock,map,regularization){
 const nodes=[],lookup=new Map(),corners=[];
 for(const v of stock){const key=v.toArray().map(x=>x.toFixed(7)).join(',');if(!lookup.has(key)){const target=map(v).sub(v);lookup.set(key,nodes.length);nodes.push({v,target,fixed:target.length()<1e-12,mass:0,row:new Map()});}corners.push(lookup.get(key));}
 const add=(i,j,w)=>nodes[i].row.set(j,(nodes[i].row.get(j)||0)+w);
 for(let i=0;i<stock.length;i+=3){const ids=corners.slice(i,i+3),v=stock.slice(i,i+3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),a2=n.length();n.divideScalar(a2);
  const grad=v.map((_,k)=>n.clone().cross(v[(k+2)%3].clone().sub(v[(k+1)%3])).divideScalar(a2));
  for(let k=0;k<3;k++){nodes[ids[k]].mass+=a2/6;for(let j=0;j<3;j++)add(ids[k],ids[j],a2*.5*regularization*grad[k].dot(grad[j]));}
 }
 nodes.forEach((n,i)=>add(i,i,n.mass));const free=nodes.map((n,i)=>n.fixed?-1:i).filter(i=>i>=0),stats=[];
 const solve=component=>{
  const x=new Float64Array(nodes.length),r=x.slice(),z=x.slice(),d=x.slice(),ad=x.slice();let rz=0,bnorm=0;
  for(const i of free){r[i]=nodes[i].mass*nodes[i].target.getComponent(component);z[i]=r[i]/nodes[i].row.get(i);d[i]=z[i];rz+=r[i]*z[i];bnorm+=r[i]*r[i];}
  let residual=Math.sqrt(bnorm),iterations=0;const threshold=Math.max(1e-14,residual*1e-9);
  for(;iterations<4000&&residual>threshold;iterations++){
   let denom=0;for(const i of free){let v=0;for(const[j,w]of nodes[i].row)v+=w*d[j];ad[i]=v;denom+=d[i]*v;}
   if(!(denom>0))throw new Error('M126 invalid support solve');
   const alpha=rz/denom;let nextRz=0,norm=0;
   for(const i of free){x[i]+=alpha*d[i];r[i]-=alpha*ad[i];z[i]=r[i]/nodes[i].row.get(i);nextRz+=r[i]*z[i];norm+=r[i]*r[i];}
   const beta=nextRz/rz;for(const i of free)d[i]=z[i]+beta*d[i];rz=nextRz;residual=Math.sqrt(norm);
  }
  if(residual>threshold*1.1)throw new Error('M126 support solve did not converge');stats.push({component,iterations,relativeResidual:residual/Math.max(1e-30,Math.sqrt(bnorm))});return x;
 };
 const values=[0,1,2].map(solve),after=stock.map((v,i)=>v.clone().add(new Vector3(...values.map(a=>a[corners[i]]))));
 const oldNormals=nodes.map(()=>new Vector3()),newNormals=nodes.map(()=>new Vector3());
 for(let i=0;i<stock.length;i+=3){const a=stock.slice(i,i+3),b=after.slice(i,i+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));for(let k=0;k<3;k++){oldNormals[corners[i+k]].add(n);newNormals[corners[i+k]].add(m);}}
 const rotations=nodes.map((_,i)=>new Quaternion().setFromUnitVectors(oldNormals[i].normalize(),newNormals[i].normalize()));
 return{after,rotations:corners.map(i=>rotations[i]),stats,freeNodes:free.length};
}

// The final retained mesh owns the surface. A differentiable anatomical map
// redistributes volume without rerunning the old support-loop constructors.
function deform(g,map,control){
 const p=g.attributes.position,stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const coupled=control.regularization?coupleSurface(stock,map,control.regularization):null;
 const epsilon=1e-5,derivative=(v,k)=>{const a=v.clone(),b=v.clone();a.setComponent(k,a.getComponent(k)+epsilon);b.setComponent(k,b.getComponent(k)-epsilon);return map(a).sub(map(b)).multiplyScalar(.5/epsilon);};
 let changedCopies=0,maximumDisplacement=0,minimumJacobian=1,minimumAreaRatio=1,minimumNormalDot=1,volumeBefore=0,volumeAfter=0,worstFace=null;
 for(let i=0;i<p.count;i++){
  const before=stock[i],after=coupled?coupled.after[i]:map(before),distance=before.distanceTo(after);if(distance<1e-12)continue;
  const dx=derivative(before,0),dy=derivative(before,1),dz=derivative(before,2),cx=dy.clone().cross(dz),cy=dz.clone().cross(dx),cz=dx.clone().cross(dy),det=dx.dot(cx);
  if(!Number.isFinite(det)||det<.35)throw new Error('M126 non-injective '+control.region+' map: '+det);
  minimumJacobian=Math.min(minimumJacobian,det);
  // Attributes may alias. Transform each buffer once, retaining the alias.
  const seen=new Set();for(const name of ['aSmooth','aMoldNormal','aCrystalNormal','normal']){
   const a=g.attributes[name];if(!a||seen.has(a))continue;seen.add(a);
   const n=new Vector3().fromBufferAttribute(a,i),v=coupled?n.applyQuaternion(coupled.rotations[i]).normalize():cx.clone().multiplyScalar(n.x).addScaledVector(cy,n.y).addScaledVector(cz,n.z).normalize();a.setXYZ(i,v.x,v.y,v.z);a.needsUpdate=true;
  }
  p.setXYZ(i,after.x,after.y,after.z);changedCopies++;maximumDisplacement=Math.max(maximumDisplacement,distance);
 }
 for(let i=0;i<p.count;i+=3){
  const a=stock.slice(i,i+3),b=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,i+k)),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));
  minimumAreaRatio=Math.min(minimumAreaRatio,m.length()/n.length());const faceDot=n.clone().normalize().dot(m.clone().normalize());
  if(faceDot<minimumNormalDot){minimumNormalDot=faceDot;worstFace={triangle:i/3,before:a.map(v=>v.toArray()),after:b.map(v=>v.toArray()),doubleAreaBefore:n.length(),doubleAreaAfter:m.length()};}
  volumeBefore+=a[0].dot(a[1].clone().cross(a[2]))/6;volumeAfter+=b[0].dot(b[1].clone().cross(b[2]))/6;
 }
 if(minimumAreaRatio<.35||minimumNormalDot<.55)throw new Error('M126 support face fold '+control.region+' '+JSON.stringify({minimumAreaRatio,minimumNormalDot,worstFace}));
 const displayed=g.attributes.normal;g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));g.computeVertexNormals();g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);
 g.userData.mrsSurgical126={version:'M126',parent:'M125',...control,method:coupled?'final retained anatomy-space redistribution, surface Dirichlet coupling and geometric normal transport':'final retained anatomy-space volume redistribution; inverse-transpose normal transport',solve:coupled?{freeNodes:coupled.freeNodes,components:coupled.stats}:null,changedCopies,maximumDisplacement,minimumJacobian,minimumAreaRatio,minimumNormalDot,volumeRatio:volumeAfter/volumeBefore};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();return g;
}

export function reconstructMrsArm126(g,arm,part,side){
 const axis=(part==='upper'?arm.elbowJoint.position:arm.wristJoint.position).clone(),length=axis.length();axis.divideScalar(length);
 const ref=g.userData.mrsRefinement,front=part==='fore'?new Vector3().fromArray(ref.M99.frame.front):new Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
 const out=part==='fore'?new Vector3().fromArray(ref.M99.frame.out):axis.clone().cross(front).normalize();
 if(part==='upper'&&out.x*arm.shoulderJoint.position.x<0)out.negate();
 const controls={region:part,side,frame:{axis:axis.toArray(),front:front.toArray(),out:out.toArray(),boneLength:length},biceps:part==='upper'?{targetPeakBoneFraction:[.44,.48],fieldCenterBoneFraction:side==='left'?.50:.46,projectionGain:side==='left'?.17:.14,distalReduction:.20,distalCenter:.82}:null,forearm:part==='fore'?{peakBoneFraction:.35,lateralGain:side==='right'?.32:.05,proximalReduction:side==='left'?.18:0,distalReduction:.10}:null};
 let oldWidth,targetWidth;
 if(part==='fore'){
  controls.regularization=.00004;
  const stations=[.03,.10,.18,.25,.32,.38,.46,.55,.65,.74,.82,.90,.97];
  oldWidth=sectionWidths(g,axis,out,length,stations);
  const target=[null,.109,.124,.138,.147,.150,.146,.137,.127,.120,.114,null,null];
  targetWidth=oldWidth.map(([t,w],i)=>[t,target[i]??w]);
  controls.forearm={peakBoneFraction:.38,targetMaximumWidth:.150,retainedSections:oldWidth,targetSections:targetWidth,method:'monotone section-envelope reconstruction, preserved angular relief and wrist contact'};
 }
 return deform(g,source=>{
  const v=source.clone(),t=v.dot(axis)/length,x=v.dot(out),z=v.dot(front);
  if(part==='upper'){
   const core=band(t,.18,.31,.67,.92),distal=bell(t,.82,.19),biceps=bell(t,side==='left'?.50:.46,side==='left'?.21:.245),frontWeight=ease((z+.015)/.055);
   const lateralScale=1-.055*core-.145*distal;
   let depthScale=1+(side==='left'?.17:.14)*biceps*frontWeight-.20*distal-.045*core*(1-frontWeight);
   // Dominant lateral shoulder crown with wrapping anterior/posterior heads.
   // Tighten their lower convergence; no added V-shaped incision.
   const shoulder=band(t,-.22,-.08,.08,.29),terminal=bell(t,.24,.14),angle=Math.atan2(x,z);
   const wrap=Math.atan2(Math.sin(angle-Math.PI/2),Math.cos(angle-Math.PI/2));
   const lateralHead=bell(wrap,0,.72);
   depthScale-=.065*shoulder*(1-.55*lateralHead)+.055*terminal*(1-lateralHead);
   v.addScaledVector(out,x*(lateralScale-1-.045*shoulder)).addScaledVector(front,z*(depthScale-1));
   const wrapHead=a=>Math.atan2(Math.sin(angle-a),Math.cos(angle-a));
   const wrapMass=.0045*bell(t,.035,.22)*(bell(wrapHead(.05),0,.68)+.8*bell(wrapHead(3.10),0,.70));
   const radial=source.clone().addScaledVector(axis,-source.dot(axis)).normalize();v.addScaledVector(radial,wrapMass);
   // Small secondary brachialis facing, carried by the same continuous skin.
   const wedge=.0045*bell(t,.63,.18)*bell(wrap,0,.55);
   v.addScaledVector(out,wedge);
  }else{
   // Axial joint ownership avoids a spherical mask slicing diagonally across
   // the proximal return. The first 3% and wrist seats remain exactly fixed.
   const protect=band(t,.03,.12,.76,.84),proximal=bell(t,.35,.35),distal=bell(t,.69,.16);
   const outGain=interpolate(targetWidth,t)/interpolate(oldWidth,t)-1;
   const frontGain=-(side==='right'?.035:.11)*proximal-(side==='left'?.12:0)*bell(t,.18,.20)-.055*distal;
   v.addScaledVector(out,x*outGain*protect).addScaledVector(front,z*frontGain*protect);
  }
  return v;
 },controls);
}

export function reconstructMrsChest126(g,{bust:B,support,profile}){
 // Compact supported hemispheres; the chest wall, central sternum, posterior
 // torso and all geometry below the lower-bust return remain fixed.
 return deform(g,source=>{
  const v=source.clone();if(v.z<=0||v.y<=1.75||v.y>=2.15)return v;
  const ax=Math.abs(v.x),bx=(Math.hypot(v.x,B.sternumRadius)-B.x)/B.width,by=(v.y-B.y)/B.height;
  const facing=Math.sqrt(Math.max(0,1-(v.x/profile(v.y,1))**2));
  const lower=.20*ease((ax-.190)/.080)*(1-ease((ax-.310)/.045));
  const supported=support(bx,by,-1.20-lower)*Math.pow(facing,.45);
  v.z-=.15*(B.projection*.94)*supported;
  const heightBand=band(v.y,1.75,1.88,2.015,2.15),lateral=band(ax,.025,.09,.32,.40),front= ease((v.z-.02)/.12);
  v.x-=Math.sign(v.x)*.08*Math.max(0,ax-.025)*heightBand*lateral*front;
  v.y-=.06*Math.max(0,source.y-B.y)*band(source.y,B.y,B.y+.025,2.065,2.15)*lateral*front;
  return v;
 },{region:'chest',regularization:.00004,projectionReduction:.15,lateralReduction:.08,upperFullnessReduction:.06,projectionBasis:'94% of original supported projection after M124; not a whole-bust volume percentage'});
}
