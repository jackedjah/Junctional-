import {Vector3,EdgesGeometry} from '../../vendor/three/three.module.min.js';
// Regional volume correction after M28. Preserves every X/Y coordinate and
// changes only the posterior glute belly and its transition into the thigh.
export function shapeMrsPosteriorTransition(g){
 const p=g.attributes.position,edited=new Set();let maxMove=0,changedCorners=0;
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10-15*t+6*t*t);};
 const bump=(x,y,cx,cy,rx,ry)=>Math.pow(Math.max(0,1-((x-cx)/rx)**2-((y-cy)/ry)**2),3);
 for(let i=0;i<p.count;i++){
  const x=Math.abs(p.getX(i)),y=p.getY(i),z=p.getZ(i);
  if(z>=-.08||y<=1.04||y>=1.48)continue;
  const dz=(.027*bump(x,y,.184,1.178,.21,.123)+.008*bump(x,y,.185,1.386,.185,.093))*ease(x/.055);
  if(dz===0)continue;p.setZ(i,z-dz);if(p.getZ(i)===z)continue;
  maxMove=Math.max(maxMove,Math.abs(p.getZ(i)-z));changedCorners++;edited.add(Math.floor(i/3));
 }
 refresh(g,edited);const meta={parent:'R166-M28-a62c624b3e0c',method:'Regional posterior glute belly and glute-to-hamstring volume correction',maxMove,changedCorners};g.userData.mrsPosteriorTransition=meta;return meta;
}
function refresh(g,edited){
 const p=g.attributes.position,groups=new Map(),keys=[];
 for(let i=0;i<p.count;i++){const k=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e7)).join(',');keys.push(k);if(!groups.has(k))groups.set(k,{n:new Vector3(),active:false});if(edited.has(Math.floor(i/3)))groups.get(k).active=true;}
 for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j)),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),len=cross.length();if(edited.has(i/3)&&len<1e-12)throw Error('Edited face collapsed');if(!len)continue;const n=cross.clone().normalize();for(let j=0;j<3;j++){const a=groups.get(keys[i+j]);if(a.active)a.n.addScaledVector(n,v[(j+1)%3].clone().sub(v[j]).angleTo(v[(j+2)%3].clone().sub(v[j])));}if(edited.has(i/3))for(let j=0;j<3;j++){g.attributes.aPhysicalNormal.setXYZ(i+j,n.x,n.y,n.z);g.attributes.aBary.setW(i+j,len/(v[0].distanceTo(v[1])+v[1].distanceTo(v[2])+v[2].distanceTo(v[0])));}}
 for(const group of groups.values())if(group.active)group.n.normalize();for(let i=0;i<p.count;i++){const a=groups.get(keys[i]);if(a.active)for(const n of ['normal','aSmooth','aMoldNormal','aCrystalNormal'])g.attributes[n]?.setXYZ(i,a.n.x,a.n.y,a.n.z);}
 for(const a of Object.values(g.attributes))a.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}
export function refineMrsPosteriorTransition({body}){const mesh=body.group.getObjectByName('torso');shapeMrsPosteriorTransition(mesh.geometry);const siblings=mesh.parent.children,start=siblings.indexOf(mesh);for(const o of siblings.slice(start+1,start+3).filter(o=>o.isLineSegments)){const old=o.geometry;o.geometry=new EdgesGeometry(mesh.geometry,30);old.dispose();}}
