import {Vector3,Quaternion} from '../../vendor/three/three.module.min.js';
import {coupleFacingReturns} from './mrs-deltoid-heads.js';
const key=v=>v.toArray().map(x=>x.toFixed(6)).join(',');
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};
export function orientMrsRadialFacings137(g,arm,side){
 const attrs=g.attributes,p=attrs.position,frame=g.userData.mrsSurgical126.frame;
 const axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out),length=frame.boneLength;
 const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const chart=v=>({x:v.dot(front),t:v.dot(axis)/length,z:v.dot(out)});
 const radial=[...g.userData.mrsRadialBoundary135.planes,...g.userData.mrsRadialInsertion136.planes];
 const protectedKeys=new Set(g.userData.mrsForearmCrowns133.planes.flatMap(p=>p.triangleIndices.flatMap(t=>stock.slice(t*3,t*3+3).map(key))));
 const coreKeys=new Set(radial.flatMap(p=>p.triangleIndices.flatMap(t=>stock.slice(t*3,t*3+3).map(key))));
 const width=t=>t<.46?.012+.012*(t-.30)/.16:t<.62?.024-.006*(t-.46)/.16:.018-.009*(t-.62)/.14;
 const domain=v=>{const q=chart(v);return q.t>.18+1e-7&&q.t<.82-1e-7&&q.z>.025&&Math.abs(q.x)<width(q.t)+.022;};
 const slopeDelta=.12;
 const targets=stock.map(v=>{if(protectedKeys.has(key(v))||!domain(v))return v.clone();const q=chart(v),w=coreKeys.has(key(v))?1:ease((q.t-.18)/.12)*(1-ease((q.t-.76)/.06))*(1-ease((Math.abs(q.x)-width(q.t))/.022));return v.clone().addScaledVector(out,slopeDelta*q.x*w);});
 const solve=coupleFacingReturns(stock,targets,v=>protectedKeys.has(key(v))||coreKeys.has(key(v)),domain,stock,{normalCone:.90,lambda:.00004});
 const moved=solve.positions,oldNormals=new Map(),newNormals=new Map();let maximumDisplacement=0,minimumNormalDot=1,minimumAreaRatio=1;
 for(const v of stock){oldNormals.set(key(v),new Vector3());newNormals.set(key(v),new Vector3());}
 for(let i=0;i<stock.length;i+=3){const a=stock.slice(i,i+3),b=moved.slice(i,i+3),n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));
  minimumNormalDot=Math.min(minimumNormalDot,n.clone().normalize().dot(m.clone().normalize()));minimumAreaRatio=Math.min(minimumAreaRatio,m.length()/n.length());
  for(let k=0;k<3;k++){oldNormals.get(key(a[k])).add(n);newNormals.get(key(a[k])).add(m);maximumDisplacement=Math.max(maximumDisplacement,a[k].distanceTo(b[k]));}
  if(b.some((v,k)=>v.distanceTo(a[k])>1e-12)){m.normalize();for(let k=0;k<3;k++)attrs.aPhysicalNormal.setXYZ(i+k,m.x,m.y,m.z);}
 }
 if(minimumNormalDot<.89||minimumAreaRatio<.60||maximumDisplacement>.010)throw new Error('M137 radial orientation support invalid '+JSON.stringify({minimumNormalDot,minimumAreaRatio,maximumDisplacement}));
 for(let i=0;i<stock.length;i++){
  if(moved[i].distanceTo(stock[i])<1e-12)continue;
  const id=key(stock[i]),rotation=new Quaternion().setFromUnitVectors(oldNormals.get(id).normalize(),newNormals.get(id).normalize()),seen=new Set();
  for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal']){const a=attrs[name];if(!a||seen.has(a))continue;seen.add(a);const n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(rotation).normalize();a.setXYZ(i,n.x,n.y,n.z);}
  p.setXYZ(i,moved[i].x,moved[i].y,moved[i].z);
 }
 const revisions=[];
 for(const plane of radial){
  const before={centerPosition:plane.centerPosition,averageNormal:plane.averageNormal,area:plane.area};let area=0;const normal=new Vector3(),center=new Vector3();
  for(const t of plane.triangleIndices){const v=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,t*3+k)),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),a=cross.length()/2;normal.add(cross);center.addScaledVector(v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3),a);area+=a;}
  normal.normalize();center.divideScalar(area);let residual=0,spread=0;
  for(const t of plane.triangleIndices){const v=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,t*3+k)),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();spread=Math.max(spread,n.angleTo(normal)*180/Math.PI);for(let k=0;k<3;k++){residual=Math.max(residual,Math.abs(v[k].clone().sub(center).dot(normal)));attrs.aCrystalNormal.setXYZ(t*3+k,normal.x,normal.y,normal.z);}}
  if(residual>2e-7||spread>.2)throw new Error('M137 nonplanar radial owner '+plane.id);
  plane.centerPosition=center.toArray();plane.averageNormal=normal.toArray();plane.area=area;plane.maximumPlaneResidual=residual;plane.maximumPhysicalNormalSpreadDegrees=spread;plane.geometryRevision='M137';revisions.push({id:plane.id,before,after:{centerPosition:plane.centerPosition,averageNormal:plane.averageNormal,area}});
 }
 g.userData.mrsRadialOrientation137={version:'M137',parent:'M136',side,frame,maximumDisplacement,minimumNormalDot,minimumAreaRatio,slopeDelta,revisions,
  method:'Orient three connected radial facings toward the flexor return; fixed longitudinal crowns, topology and joint seats; coupled support with orientation and area validation',
  protected:'M133 flexor/extensor crowns exact. M135/M136 broad radial ownership, widths, longitudinal stations and shared edges retained; lateral facing inclination revised.'};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();return g;
}
