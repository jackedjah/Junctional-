import {Vector3,EdgesGeometry} from '../../vendor/three/three.module.min.js';
import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const blend=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.max(a,b)+h*h*k*.25;};
function interpolate(rows,t){let i=0;while(i<rows.length-2&&rows[i+1][0]<t)i++;const a=rows[i],b=rows[i+1],u=ease((t-a[0])/(b[0]-a[0]));return a[1]*(1-u)+b[1]*u;}

export function refineMrsProximalForearm(g){
 const organic=g.userData.mrsOrganicMuscles;
 if(organic?.part!=='fore')throw Error('M22 requires retained organic forearm');
 const {frame,muscles,core}=organic,axis=new Vector3().fromArray(frame.axis),out=new Vector3().fromArray(frame.out),front=new Vector3().fromArray(frame.front),length=frame.boneLength;
 const corrected=core.map(row=>row.slice());corrected.find(row=>row[0]===.12)[1]=.058;
 function radius(rows,t,angle){let r=interpolate(rows,t);const sa=Math.sin(angle),ca=Math.cos(angle);
  for(const m of muscles){const u=(t-m.t)/m.h;if(Math.abs(u)>=1)continue;const taper=Math.sqrt(1-u*u),x=(m.x+(m.dx||0)*u)*taper,z=m.z*taper,A=(sa/m.rx)**2+(ca/m.rz)**2,B=-2*(sa*x/m.rx**2+ca*z/m.rz**2),C=(x/m.rx)**2+(z/m.rz)**2+u*u-1,D=B*B-4*A*C;if(D>0){const surface=(-B+Math.sqrt(D))/(2*A);if(surface>0)r=blend(r,surface,.014);}}
  return r;
 }
 const p=g.attributes.position,old={...g.attributes},edited=new Uint8Array(p.count);let moved=0,maxMove=0,maxParentRadiusError=0;
 for(let i=0;i<p.count;i++){
  const v=new Vector3().fromBufferAttribute(p,i),s=v.dot(axis),t=s/length;if(t<=0||t>=.20)continue;
  const angle=Math.atan2(v.dot(out),v.dot(front)),before=radius(core,t,angle),after=radius(corrected,t,angle),weight=ease(t/.045),dr=Math.min(0,after-before)*weight;
  if(Math.abs(dr)<1e-9)continue;
  const radial=v.clone().addScaledVector(axis,-s);maxParentRadiusError=Math.max(maxParentRadiusError,Math.abs(radial.length()-before));
  v.addScaledVector(radial.normalize(),dr);p.setXYZ(i,v.x,v.y,v.z);edited[i]=1;moved++;maxMove=Math.max(maxMove,-dr);
 }
 if(maxParentRadiusError>2e-6)throw Error('M22 source radius does not match retained forearm');
 updateMuscleNormals(g,edited,{angleWeighted:true});
 // Unchanged physical faces retain their exact stored normals.
 for(let i=0;i<p.count;i+=3)if(!edited[i]&&!edited[i+1]&&!edited[i+2])for(let j=0;j<9;j++)g.attributes.aPhysicalNormal.array[i*3+j]=old.aPhysicalNormal.array[i*3+j];
 g.userData.proximalForearmFlow={parent:'R166-M21-bf3eec48ee66',method:'Reduce short core bulge beneath elbow; original muscle solids and smooth union unchanged',coreBefore:core,coreAfter:corrected,support:[0,.20],contactFade:[0,.045],maxParentRadiusError,movedCorners:moved,maxMove};
}

export function refineMrsForearmFlow({limbs}){
 for(const side of ['left','right']){const mesh=limbs[side].group.getObjectByName(`arm-${side}-fore`);refineMrsProximalForearm(mesh.geometry);
  const siblings=mesh.parent.children,start=siblings.indexOf(mesh);for(const o of siblings.slice(start+1,start+3).filter(o=>o.isLineSegments)){const old=o.geometry;o.geometry=new EdgesGeometry(mesh.geometry,30);old.dispose();}
 }
}
