import {Vector3} from '../../vendor/three/three.module.min.js';
import {deformMrsRetainedSurface} from './mrs-surgical-reconstruction.js';

// Move the retained belly along its bone, rather than inflate another mass.
// The map is monotone, with unit tangents at the fixed joint/wrist domains.
function axialMap(stations,t){
 if(t<=stations[0][0]||t>=stations.at(-1)[0])return t;
 let i=0;while(i<stations.length-2&&t>stations[i+1][0])i++;
 const slope=j=>(stations[j+1][1]-stations[j][1])/(stations[j+1][0]-stations[j][0]);
 const tangent=j=>{
  if(j===0||j===stations.length-1)return 1;
  const a=slope(j-1),b=slope(j),h0=stations[j][0]-stations[j-1][0],h1=stations[j+1][0]-stations[j][0];
  return 3*(h0+h1)/((2*h1+h0)/a+(h1+2*h0)/b);
 };
 const[a,x]=stations[i],[b,y]=stations[i+1],h=b-a,u=(t-a)/h;
 return(2*u*u*u-3*u*u+1)*x+(u*u*u-2*u*u+u)*h*tangent(i)+(-2*u*u*u+3*u*u)*y+(u*u*u-u*u)*h*tangent(i+1);
}

export function redistributeMrsForearmBelly131(g,arm,side){
 if(side!=='left')return g;
 const retained=g.userData.mrsSurgical126,frame=retained.frame,axis=new Vector3().fromArray(frame.axis),length=frame.boneLength;
 const stations=[[.12,.12],[.18,.20],[.25,.34],[.32,.39],[.38,.43],[.46,.49],[.55,.55],[.65,.65]];
 const p=g.attributes.position,before=p.array.slice(),physical=g.attributes.aPhysicalNormal.clone();
 const map=v=>{const t=v.dot(axis)/length;return v.clone().addScaledVector(axis,(axialMap(stations,t)-t)*length);};
 deformMrsRetainedSurface(g,map,{region:'left proximal forearm belly placement',side,frame,regularization:.00004,stations,
  ownership:'Retained brachioradialis/flexor/extensor envelope moves coherently; radial section coordinates and existing relief are preserved.',
  protected:'First .12 bone span, all t>=.65, elbow cap, wrist and other meshes'});
 const meta=g.userData.mrsSurgical126;g.userData.mrsSurgical126=retained;
 // Keep untouched triangle attributes byte-for-byte, including stored normals.
 for(let i=0;i<p.count;i+=3)if([0,1,2].every(k=>[0,1,2].every(j=>p.array[(i+k)*3+j]===before[(i+k)*3+j])))for(let k=0;k<3;k++)g.attributes.aPhysicalNormal.setXYZ(i+k,physical.getX(i+k),physical.getY(i+k),physical.getZ(i+k));
 g.userData.mrsForearmBelly131={...meta,version:'M131',parent:'M130',method:'Monotone axial target with coupled fixed-boundary surface displacement; geometric normal transport; radial coordinates held',status:'candidate; actual mesh and matched views required'};
 return g;
}
