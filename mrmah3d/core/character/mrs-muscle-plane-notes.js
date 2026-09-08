import {Vector3} from '../../vendor/three/three.module.min.js';
import {BODY_MUSCLES_M05,updateMuscleNormals} from './mrs-body-muscle-volumes.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};

// Sparse diamond-shaped tangent cuts in the real skin, rather than a second
// shell, painted outline or optical-normal substitute. The full-strength core
// is planar; its narrow return blends back into the approved muscular volume.
function cutNotes(g,specs,{depthOnly=false,limit=.002}={}){
 const p=g.attributes.position,n=g.attributes.aSmooth;
 const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const offsets=new Float64Array(p.count),weights=new Float64Array(p.count),directions=new Array(p.count),records=[];
 for(const spec of specs){
  let best=Infinity,id=-1;
  for(let i=0;i<stock.length;i++){const score=spec.score(stock[i]);if(score<best){best=score;id=i;}}
  if(id<0)continue;
  const center=stock[id].clone(),normal=new Vector3().fromBufferAttribute(n,id).normalize();
  if(depthOnly&&Math.abs(normal.z)<.55)continue;
  const along=spec.axis.clone().addScaledVector(normal,-spec.axis.dot(normal)).normalize(),across=along.clone().cross(normal).normalize();
  let selected=[],mean=0,total=0,scale=1;
  for(let iteration=0;iteration<5;iteration++){
   selected=[];mean=0;total=0;
   for(let i=0;i<stock.length;i++){
    const d=stock[i].clone().sub(center),u=d.dot(across)/(spec.width*scale),v=d.dot(along)/(spec.height*scale),r=Math.abs(u)+Math.abs(v);
    if(r>=1||Math.abs(d.dot(normal))>spec.width*.7)continue;
    const fn=new Vector3().fromBufferAttribute(n,i);if(fn.dot(normal)<.60)continue;
    if(spec.guard&&!spec.guard(stock[i]))continue;
    const w=1-ease((r-.62)/.38);if(w<=0)continue;
    selected.push([i,w,d.dot(normal),r]);mean+=d.dot(normal)*w;total+=w;
   }
   if(!selected.length)break;
   const plane=mean/total,required=Math.max(...selected.map(([,w,d])=>Math.abs((plane-d)/(depthOnly?normal.z:1))));
   if(required<=limit*.98)break;
   // Fit the note to the curvature. Clamping an oversized tangent cut caused
   // scalloped rims; shrinking its footprint keeps the entire core on a plane.
   scale*=Math.max(.55,Math.min(.90,Math.sqrt(limit/required)*.92));
  }
  if(!selected.length)continue;
  const plane=mean/total;let changed=0,max=0,planar=0;
  for(const[i,w,d,r]of selected){
   const raw=(plane-d)/(depthOnly?normal.z:1),move=clamp(raw,-limit,limit)*w;
   // Strongest note owns a shared corner. Cuts never accumulate into trenches.
   if(w>weights[i]){weights[i]=w;offsets[i]=move;directions[i]=depthOnly?new Vector3(0,0,1):normal;}
   max=Math.max(max,Math.abs(move));changed++;if(r<.62&&Math.abs(raw)<limit)planar++;
  }
  records.push({owner:spec.name,center:center.toArray(),normal:normal.toArray(),width:spec.width*scale,height:spec.height*scale,curvatureFitScale:scale,planeOffset:plane,selectedCorners:changed,unclampedPlanarCoreCorners:planar,maxMove:max});
 }
 const edited=new Uint8Array(p.count);let maximumChange=0;
 for(let i=0;i<stock.length;i++)if(weights[i]>0&&Math.abs(offsets[i])>1e-10){
  const q=stock[i].clone().addScaledVector(directions[i],offsets[i]);p.setXYZ(i,q.x,q.y,q.z);edited[i]=1;maximumChange=Math.max(maximumChange,q.distanceTo(stock[i]));
 }
 updateMuscleNormals(g,edited);
 return{notes:records,maximumChange,limit,depthOnly,method:'Bounded physical diamond tangent cuts with continuous muscular returns; no extra shell or fake normals'};
}

export function noteMrsBodyPlanes(g){
 const specs=[];
 for(const m of BODY_MUSCLES_M05)for(const side of [-1,1]){
  const visits=m.ry>.20?[-.34,.28]:[0];
  for(const offset of visits){
   const y=m.y+offset*m.ry,x=side*(m.x+(y-m.y)*(m.slope||0)),front=m.front;
   specs.push({name:(side<0?'L ':'R ')+m.name+' '+offset,axis:new Vector3(side*(m.slope||0),1,0),width:Math.min(.105,m.rx*.70),height:Math.min(.115,m.ry*.55),
    score:v=>(v.z>=0)!==front?Infinity:(v.x-x)**2+(v.y-y)**2,
    guard:v=>(v.z>=0)===front&&Math.abs(v.x)>.018&&Math.abs(v.z)>.09});
  }
 }
 g.userData.mrsBodyPlaneNotesM05=cutNotes(g,specs,{depthOnly:true,limit:.004});return g;
}

export function noteMrsArmPlanes(g,part){
 const f=g.userData.mrsOrganicMuscles.frame,axis=new Vector3().fromArray(f.axis),out=new Vector3().fromArray(f.out),front=new Vector3().fromArray(f.front),length=f.boneLength;
 const specs=[];
 const rows=part==='upper'?[
  ['anterior delt',-.075,0,.055,.065],['lateral delt',-.06,1.5,.060,.062],['posterior delt',-.075,2.8,.055,.065],
  ['biceps crown',.40,0,.059,.076],['biceps distal',.64,.08,.045,.060],['triceps long',.44,3.2,.060,.076],['triceps lateral',.52,2.2,.051,.066],['brachialis',.63,1.2,.039,.052]
 ]:[['brachioradialis',.28,.85,.046,.073],['flexor',.32,-.25,.044,.071],['extensor',.30,2.35,.047,.077],['forearm return',.58,.55,.032,.055]];
 for(const[name,t,a,width,height]of rows){const facing=out.clone().multiplyScalar(Math.sin(a)).addScaledVector(front,Math.cos(a));
  specs.push({name,width,height,axis,score:v=>{const tt=v.dot(axis)/length,radial=v.clone().addScaledVector(axis,-v.dot(axis));return (tt-t)**2*length**2+(1-radial.normalize().dot(facing))*.015;},guard:v=>{const t=v.dot(axis)/length;return t>-.23&&t<(part==='upper'?.82:.73);}});
 }
 g.userData.mrsArmPlaneNotesM05=cutNotes(g,specs,{limit:.0018});return g;
}
