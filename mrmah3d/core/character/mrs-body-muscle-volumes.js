import {Vector3,Float32BufferAttribute} from '../../vendor/three/three.module.min.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};

// Bilateral muscular relief on the retained continuous Godform skin.
// Coordinates are the established torso frame (+Y up, +Z anterior).
// rx/ry describe a muscle's territory, not an interchangeable spherical part.
// slope makes the insertion axis follow the adductor, quad or scapular flow.
export const BODY_MUSCLES_M05=[
 {name:'rectus upper',front:true,x:.071,y:1.797,rx:.071,ry:.070,depth:.035,slope:.07},
 {name:'rectus middle',front:true,x:.067,y:1.691,rx:.068,ry:.068,depth:.035,slope:.04},
 {name:'rectus lower',front:true,x:.061,y:1.586,rx:.064,ry:.077,depth:.027,slope:.06},
 {name:'external oblique',front:true,x:.169,y:1.711,rx:.053,ry:.168,depth:.026,slope:.34},
 {name:'serratus superior',front:true,x:.235,y:1.881,rx:.071,ry:.044,depth:.018,slope:.40},
 {name:'serratus inferior',front:true,x:.204,y:1.819,rx:.069,ry:.044,depth:.018,slope:.40},
 {name:'rectus femoris',front:true,x:.208,y:1.182,rx:.111,ry:.287,depth:.060,slope:.29},
 {name:'vastus lateralis',front:true,x:.305,y:1.197,rx:.099,ry:.259,depth:.045,slope:.30},
 {name:'vastus medialis',front:true,x:.092,y:.945,rx:.061,ry:.145,depth:.042,slope:.16},
 {name:'adductor',front:true,x:.092,y:1.254,rx:.061,ry:.230,depth:.027,slope:.10},
 {name:'tibialis anterior',front:true,x:.085,y:.588,rx:.047,ry:.259,depth:.024,slope:.20},
 {name:'gastrocnemius medial',front:false,x:.066,y:.660,rx:.054,ry:.240,depth:.034,slope:.14},
 {name:'gastrocnemius lateral',front:false,x:.150,y:.746,rx:.057,ry:.208,depth:.023,slope:.24},
 {name:'biceps femoris',front:false,x:.239,y:1.051,rx:.084,ry:.242,depth:.036,slope:.27},
 {name:'semitendinosus',front:false,x:.100,y:1.046,rx:.063,ry:.256,depth:.029,slope:.13},
 {name:'gluteus maximus',front:false,x:.180,y:1.333,rx:.179,ry:.210,depth:.022,slope:0},
 {name:'gluteus medius',front:false,x:.279,y:1.457,rx:.082,ry:.130,depth:.018,slope:-.13},
 {name:'latissimus',front:false,x:.198,y:1.933,rx:.124,ry:.219,depth:.044,slope:.44},
 {name:'infraspinatus',front:false,x:.183,y:2.062,rx:.101,ry:.093,depth:.035,slope:-.24},
 {name:'teres major',front:false,x:.271,y:2.020,rx:.081,ry:.063,depth:.025,slope:.20},
 {name:'lower trapezius',front:false,x:.073,y:2.035,rx:.053,ry:.186,depth:.032,slope:.27},
 {name:'erector spinae',front:false,x:.060,y:1.756,rx:.045,ry:.233,depth:.025,slope:.035}
];

function local(m,x,y){const v=(y-m.y)/m.ry,u=(x-m.x-(y-m.y)*(m.slope||0))/m.rx;return [u,v];}
function belly(u,v){const q=u*u+v*v;return q>=1?0:(1-q)**2;}

// Recompute from shared physical positions, including duplicate triangle corners.
// Clay, mold and crystal fields all describe this same edited mesh at this stage.
export function updateMuscleNormals(g,edited,{angleWeighted=false}={}){
 const p=g.attributes.position,groups=new Map(),keys=[],physical=new Float32Array(p.count*3);
 const old=g.attributes.aSmooth;
 for(let i=0;i<p.count;i++){
  const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');keys.push(key);
  if(!groups.has(key))groups.set(key,{n:new Vector3(),edited:false});
  if(edited[i])groups.get(key).edited=true;
 }
 for(let i=0;i<p.count;i+=3){
  const vertices=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j));
  const [a,b,c]=vertices,n=b.clone().sub(a).cross(c.clone().sub(a));
  if(n.length()<1e-12)throw new Error('M05 degenerate muscle face');
  const affected=edited[i]||edited[i+1]||edited[i+2];
  for(let j=0;j<3;j++){
   const group=groups.get(keys[i+j]);
   if(angleWeighted){const u=vertices[(j+1)%3].clone().sub(vertices[j]),v=vertices[(j+2)%3].clone().sub(vertices[j]);group.n.addScaledVector(n.clone().normalize(),u.angleTo(v));}
   else group.n.add(n);
   if(affected)group.edited=true;
  }
  n.normalize();for(let j=0;j<3;j++)n.toArray(physical,(i+j)*3);
 }
 for(const v of groups.values())v.n.normalize();
 const normals=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){
  const group=groups.get(keys[i]);
  (group.edited?group.n:new Vector3().fromBufferAttribute(old,i)).toArray(normals,i*3);
 }
 for(const name of ['aSmooth','aMoldNormal','aCrystalNormal'])g.setAttribute(name,new Float32BufferAttribute(normals.slice(),3));
 g.setAttribute('aPhysicalNormal',new Float32BufferAttribute(physical,3));g.setAttribute('normal',g.attributes.aCrystalNormal);
 g.computeBoundingBox();g.computeBoundingSphere();
}

// The silhouette landmarks create deliberately uneven row spacing. Corner
// angles prevent the adjacent wide row from biasing the visible smooth normal.
// This final step changes no vertex and leaves physical face normals intact.
export function finishMrsBodyNormals(g){
 updateMuscleNormals(g,new Uint8Array(g.attributes.position.count).fill(1),{angleWeighted:true});
 g.userData.mrsBodyMusclesM05.normalMethod='Corner-angle weighting of actual skin triangles; stable across nonuniform silhouette stations';
 return g;
}

// Re-sample the retained cross sections as a continuous front/back skin. Old
// authored plate triangles double back in XY inside recesses; displacing those
// triangles onto a height field makes coincident slivers. A regular section
// cage removes that ambiguity while retaining the source section outlines.
function continuousBodySkin(g,landmarks){
 const source=g.attributes.position,attrs=g.attributes,columns=128,low=0,high=2.335;
 const stations=[...new Set([...Array.from({length:224},(_,i)=>(high-low)*(i+1)/224),...(landmarks||[]).filter(y=>y>0&&y<=high)])].sort((a,b)=>a-b);
 const rows=stations.length;
 const nodes=[],faces=[],sourceCount=source.count;
 const get=i=>[source.getX(i),source.getY(i),source.getZ(i)];
 for(let row=1;row<=rows;row++){
  const y=stations[row-1],cutY=Math.min(y,high-.000001),segments=[];
  for(let i=0;i<sourceCount;i+=3){
   const hits=[];
   for(let j=0;j<3;j++){
    const ia=i+j,ib=i+(j+1)%3,a=get(ia),b=get(ib);
    if((a[1]<=cutY&&b[1]>cutY)||(b[1]<=cutY&&a[1]>cutY)){
     const t=(cutY-a[1])/(b[1]-a[1]);hits.push({x:a[0]+(b[0]-a[0])*t,z:a[2]+(b[2]-a[2])*t,weights:[[ia,1-t],[ib,t]]});
    }
   }
   if(hits.length===2)segments.push(hits);
  }
  if(!segments.length)throw new Error('Missing retained body section '+y);
  const points=segments.flat(),minX=Math.min(...points.map(v=>v.x)),maxX=Math.max(...points.map(v=>v.x));
  for(let col=0;col<columns;col++){
   const a=2*Math.PI*col/columns,c=Math.cos(a),front=Math.sin(a)>=0,x=c*(c>=0?maxX:-minX),hits=[];
   for(const[u,v]of segments){
    if(Math.abs(v.x-u.x)<1e-12)continue;
    const t=(x-u.x)/(v.x-u.x);if(t<-1e-6||t>1.000001)continue;
    hits.push({z:u.z+(v.z-u.z)*t,weights:[...u.weights.map(([i,w])=>[i,w*(1-t)]),...v.weights.map(([i,w])=>[i,w*t])]});
   }
   let hit=hits.sort((u,v)=>front?v.z-u.z:u.z-v.z)[0];
   if(!hit){const near=points.reduce((a,b)=>Math.abs(a.x-x)<Math.abs(b.x-x)?a:b);hit=near;}
   nodes.push({p:[x,y,hit.z],weights:hit.weights});
  }
 }
 for(let row=0;row<rows-1;row++)for(let col=0;col<columns;col++){
  const a=row*columns+col,b=row*columns+(col+1)%columns,c=a+columns,d=b+columns;faces.push([a,c,b],[b,c,d]);
 }
 const bottom=nodes.length;nodes.push({p:[0,0,0],weights:[[0,1]]});
 for(let col=0;col<columns;col++)faces.push([bottom,col,(col+1)%columns]);
 const top=nodes.length;nodes.push({p:[0,high,nodes.slice(-columns).reduce((s,n)=>s+n.p[2],0)/columns],weights:nodes[(rows-1)*columns].weights});
 for(let col=0;col<columns;col++)faces.push([top,(rows-1)*columns+(col+1)%columns,(rows-1)*columns+col]);
 for(const[name,attr]of Object.entries(attrs)){
  const size=attr.itemSize,values=new Float32Array(faces.length*3*size);
  faces.forEach((f,i)=>f.forEach((id,j)=>{const node=nodes[id];for(let k=0;k<size;k++)values[(i*3+j)*size+k]=name==='position'?node.p[k]:name==='aBary'?(j===k?1:0):node.weights.reduce((v,[id,w])=>v+w*attr.array[id*size+k],0);}));
  g.setAttribute(name,new Float32BufferAttribute(values,size));
 }
 return{originalFaces:sourceCount/3,faces:faces.length,rows,columns,landmarks,method:'Continuous loft sampled from actual retained front/back section envelopes; original silhouette control stations included'};
}

export function shapeMrsBodyMuscles(g,{profile,landmarks}={}){
 const refinement=continuousBodySkin(g,landmarks);
 const p=g.attributes.position,edited=new Uint8Array(p.count),counts={},extents={};let maximumDepthChange=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ax=Math.abs(x),front=z>=0;
  let delta=0;
  for(const m of BODY_MUSCLES_M05){
   if(front!==m.front)continue;
   const [u,v]=local(m,ax,y),weight=belly(u,v);if(!weight)continue;
   // All relief returns into the original sidewall. X/Y coordinates, the waist
   // width and the shared terminal tip are never moved by these depth fields.
   const sidewall=ease(Math.abs(z)/.085),d=m.depth*weight*sidewall;
   delta+=d;counts[m.name]=(counts[m.name]||0)+1;extents[m.name]=Math.max(extents[m.name]||0,d);
  }
  const band=front?ease((y-.29)/.11)*(1-ease((y-1.845)/.070)):ease((y-.32)/.12)*(1-ease((y-2.105)/.065));
  const side=ease(Math.abs(z)/.095),weight=band*side;
  if(weight>0&&profile){
   const w=profile(y,1),f=Math.sqrt(Math.max(0,1-(ax/w)**2));
   let base=(front?profile(y,2):profile(y,3))*f;
   if(front){
    base+=.050*Math.exp(-(((ax-.186)/.145)**2)-((y-1.06)/.34)**2)*f;
    base-=.009*Math.exp(-((x/.034)**2)-((y-1.12)/.29)**2)*f;
   }else{
    base+=.110*Math.exp(-(((ax-.180)/.208)**2)-((y-1.31)/.225)**2)*Math.pow(f,.8);
    base-=.022*Math.exp(-((x/.028)**2)-((y-1.31)/.17)**2)*f;
   }
   const target=profile(y,4)+(front?1:-1)*(base+delta),next=z+(target-z)*weight;
   p.setZ(i,next);edited[i]=1;maximumDepthChange=Math.max(maximumDepthChange,Math.abs(next-z));
  }else if(delta>1e-9&&!profile){p.setZ(i,z+(front?1:-1)*delta);edited[i]=1;maximumDepthChange=Math.max(maximumDepthChange,delta);}
 }
 updateMuscleNormals(g,new Uint8Array(p.count).fill(1));
 g.userData.mrsBodyMusclesM05={version:'R166-M05',muscles:BODY_MUSCLES_M05,refinement,counts,maximumContributions:extents,maximumDepthChange,changedCorners:edited.reduce((a,b)=>a+b,0),method:'Retained silhouette with continuous muscular depth fields; old shallow body plate artifacts replaced inside authorized regions',protected:'Retained section widths, chest-wall shape and small-waist/large-hip envelope, approved arms, chest/head/hand identity; fused single-point lower body'};
 return g;
}
