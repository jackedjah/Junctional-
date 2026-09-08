import {Vector3,EdgesGeometry} from '../../vendor/three/three.module.min.js';

const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10-15*x+6*x*x);};
const bump=(y,c,r)=>{const u=(y-c)/r;return Math.abs(u)>=1?0:(1-u*u)**3;};
const belly=(x,y,cx,cy,rx,ry,slope=0)=>{
 const v=(y-cy)/ry,u=(Math.abs(x)-cx-slope*(y-cy))/rx,q=u*u+v*v;
 return q>=1?0:(1-q)**3;
};

// Regional deformation of M27's retained continuous skin. No new shell,
// seam, legs, topology, material or pose construction is introduced.
export function shapeMrsMuscleTrueTeardrop(g){
 const p=g.attributes.position,old=p.array.slice(),edited=new Set();let moved=0,maxDisplacement=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y<=.27||y>=1.52)continue;
  const band=ease((y-.27)/.16)*(1-ease((y-1.41)/.11));
  // Broad vastus crest and medial convergence now author the contour.
  // The knee ghost is a contraction in a closed muscle envelope.
  const scale=1+band*(.064*bump(y,1.10,.32)+.026*bump(y,1.365,.13)-.085*bump(y,.735,.215));
  const nx=x*scale;
  const front=z>=0,wall=ease(Math.abs(z)/.085),mid=ease(Math.abs(x)/.045);
  let depth=front?
   .020*belly(x,y,.196,1.087,.139,.287,.29)+.013*belly(x,y,.287,1.17,.112,.242,.29)+.010*belly(x,y,.079,.902,.063,.176,.14):
   .024*belly(x,y,.207,1.035,.113,.253,.24)+.016*belly(x,y,.089,1.022,.068,.242,.14)+.009*belly(x,y,.291,1.354,.106,.146,-.08);
  // Subtle depth contraction continues the medial convergence around the
  // tibial transition; it cannot open a center seam or separate the legs.
  // Broad posterior handoff fills the narrow fold shelf without inflating
  // the glute crown. Both changes terminate before the center valley.
  if(!front)depth+=.013*belly(x,y,.183,1.192,.183,.103)-.007*belly(x,y,.187,1.322,.177,.090);
  const nz=z*(1-.035*band*bump(y,.745,.17))+(front?1:-1)*depth*band*wall*mid;
  p.setXYZ(i,nx,y,nz);
  if(nx!==x||nz!==z){edited.add(Math.floor(i/3));moved++;maxDisplacement=Math.max(maxDisplacement,Math.hypot(nx-x,nz-z));}
 }
 // Refresh only the changed triangles and their shared-corner normal ring.
 // The retained shoulder micro-triangles are outside this region.
 const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e7)).join(','),groups=new Map(),keys=[];
 for(let i=0;i<p.count;i++){const k=key(i);keys.push(k);if(!groups.has(k))groups.set(k,{n:new Vector3(),affected:false});if(edited.has(Math.floor(i/3)))groups.get(k).affected=true;}
 for(let i=0;i<p.count;i+=3){
  const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j)),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),len=cross.length();
  if(edited.has(i/3)&&len<1e-12)throw Error('M28 collapsed edited face');
  if(len===0)continue;const n=cross.clone().normalize();
  for(let j=0;j<3;j++){const group=groups.get(keys[i+j]);if(group.affected)group.n.addScaledVector(n,v[(j+1)%3].clone().sub(v[j]).angleTo(v[(j+2)%3].clone().sub(v[j])));}
  if(edited.has(i/3)){
   const radius=len/(v[0].distanceTo(v[1])+v[1].distanceTo(v[2])+v[2].distanceTo(v[0]));
   for(let j=0;j<3;j++){g.attributes.aPhysicalNormal?.setXYZ(i+j,n.x,n.y,n.z);g.attributes.aBary?.setW(i+j,radius);}
  }
 }
 for(const group of groups.values())if(group.affected)group.n.normalize();
 for(let i=0;i<p.count;i++){const group=groups.get(keys[i]);if(!group.affected)continue;for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal'])g.attributes[name]?.setXYZ(i,group.n.x,group.n.y,group.n.z);}
 for(const a of Object.values(g.attributes))a.needsUpdate=true;
 g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.muscleTrueTeardrop={parent:'R166-M27-72c790ca75d2',movedCorners:moved,maxDisplacement,editedFaces:edited.size,scope:[.27,1.52],method:'Retained bilateral quad/hamstring volumes drive closed contour; broad vastus crest, glute-med attachment, medial convergence, continuous tibial taper',splitState:'Closed only; no split implementation'};
 return g.userData.muscleTrueTeardrop;
}
export function refineMrsMuscleTrueLowerBody({body}){
 const mesh=body.group.getObjectByName('torso');shapeMrsMuscleTrueTeardrop(mesh.geometry);
 const siblings=mesh.parent.children,start=siblings.indexOf(mesh);
 for(const o of siblings.slice(start+1,start+3).filter(o=>o.isLineSegments)){const old=o.geometry;o.geometry=new EdgesGeometry(mesh.geometry,30);old.dispose();}
}
