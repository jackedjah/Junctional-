import {Vector3,Float32BufferAttribute} from '../../vendor/three/three.module.min.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const smoothMax=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.max(a,b)+h*h*k*.25;};
function interpolate(rows,t){let i=0;while(i<rows.length-2&&rows[i+1][0]<t)i++;const a=rows[i],b=rows[i+1],u=ease((t-a[0])/(b[0]-a[0]));return a[1]*(1-u)+b[1]*u;}

export const ORGANIC_ARM_MUSCLES={
 upper:[
  {name:'lateral deltoid',t:-.09,h:.32,x:.078,z:0,rx:.105,rz:.108},
  {name:'anterior deltoid',t:-.035,h:.29,x:.035,z:.065,rx:.085,rz:.075},
  {name:'posterior deltoid',t:-.055,h:.27,x:.030,z:-.062,rx:.085,rz:.078},
  {name:'biceps',t:.45,h:.39,x:-.019,z:.065,rx:.084,rz:.090},
  {name:'triceps long head',t:.48,h:.46,x:-.008,z:-.060,rx:.080,rz:.095},
  {name:'triceps lateral head',t:.45,h:.40,x:.066,z:-.042,rx:.072,rz:.078},
  {name:'brachialis',t:.63,h:.36,x:.072,z:.015,rx:.056,rz:.063}
 ],
 fore:[
  {name:'brachioradialis',t:.28,h:.36,x:.043,z:.023,rx:.058,rz:.052,dx:-.040},
  {name:'flexor compartment',t:.36,h:.44,x:-.027,z:.024,rx:.055,rz:.060,dx:.012},
  {name:'extensor compartment',t:.32,h:.40,x:.025,z:-.022,rx:.061,rz:.055,dx:-.018}
 ]
};

// The user superseded arm diamond topology. Loft one continuous organic skin
// over explicit muscle solids, retaining the same objects, bone frames and
// attachment envelopes. Torso, hips/glutes, hands and lower Godform are untouched.
export function shapeMrsOrganicArm(g,arm,part,side){
 const original=g.attributes.position,frame=g.userData.mrsSurgical126.frame;
 const axis=new Vector3().fromArray(frame.axis),out=new Vector3().fromArray(frame.out),front=new Vector3().fromArray(frame.front),length=frame.boneLength;
 const stock=Array.from({length:original.count},(_,i)=>{const v=new Vector3().fromBufferAttribute(original,i);return [v.dot(axis)/length,v.dot(out),v.dot(front)];});
 const lo=part==='upper'?-.40:-.20,hi=part==='upper'?1.035:1.025,rows=part==='upper'?112:80,columns=80;
 const muscles=ORGANIC_ARM_MUSCLES[part],core=part==='upper'?[[-.46,.025],[-.25,.095],[-.1,.095],[.16,.070],[.30,.065],[.58,.062],[.85,.054],[1.09,.048]]:[[-.20,.046],[0,.061],[.12,.066],[.20,.048],[.65,.042],[1.04,.042]];
 const radius=(t,a)=>{
  const sa=Math.sin(a),ca=Math.cos(a);let r=interpolate(core,t);
  for(const m of muscles){const u=(t-m.t)/m.h;if(Math.abs(u)>=1)continue;
   // Bring each offset belly back toward its insertion axis at both ends.
   // A fixed offset at a zero-radius ellipsoid tip makes a discontinuous lip.
   const taper=Math.sqrt(1-u*u),x=(m.x+(m.dx||0)*u)*taper,z=m.z*taper,A=(sa/m.rx)**2+(ca/m.rz)**2,B=-2*(sa*x/m.rx**2+ca*z/m.rz**2),C=(x/m.rx)**2+(z/m.rz)**2+u*u-1,D=B*B-4*A*C;
   if(D<=0)continue;const surface=(-B+Math.sqrt(D))/(2*A);if(surface>0)r=smoothMax(r,surface,.014);
  }return r;
 };
 // Plane/triangle sections supply the retained root, elbow and wrist envelopes.
 function section(t){const segments=[];
  for(let i=0;i<stock.length;i+=3){const f=stock.slice(i,i+3),hits=[];
   for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3];if((a[0]<=t&&b[0]>t)||(b[0]<=t&&a[0]>t)){const u=(t-a[0])/(b[0]-a[0]);hits.push([a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u]);}}
   if(hits.length===2)segments.push(hits);
  }return segments;
 }
 function retainedRadius(segments,a,t){const d=[Math.sin(a),Math.cos(a)];let best=0;
  for(const[p,q]of segments){const e=[q[0]-p[0],q[1]-p[1]],den=d[0]*e[1]-d[1]*e[0];if(Math.abs(den)<1e-10)continue;
   const r=(p[0]*e[1]-p[1]*e[0])/den,u=(p[0]*d[1]-p[1]*d[0])/den;if(r>0&&u>=-1e-7&&u<=1.0000001)best=Math.max(best,r);
  }return best||interpolate(core,t);
 }
 const points=[],faces=[];let maximumRadialChange=0;
 for(let row=0;row<=rows;row++){const t=lo+(hi-lo)*row/rows,segments=section(t);
  for(let col=0;col<columns;col++){const a=2*Math.PI*col/columns,old=retainedRadius(segments,a,t);
   const w=part==='upper'?ease((t+.37)/.14):1;
   let r=old*(1-w)+radius(t,a)*w;maximumRadialChange=Math.max(maximumRadialChange,Math.abs(r-old));
   // Bury the closed proximal cap medially inside the shoulder attachment.
   // Its old full-radius ring protruded above the seated left deltoid.
   const seat=part==='upper'?ease((t-lo)/.15):1,medial=.085*(1-seat);
   if(part==='upper')r=.003+(r-.003)*seat;
   points.push(axis.clone().multiplyScalar(t*length).addScaledVector(out,r*Math.sin(a)-medial).addScaledVector(front,r*Math.cos(a)));
  }
 }
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const a=row*columns+col,b=row*columns+(col+1)%columns,c=(row+1)*columns+col,d=(row+1)*columns+(col+1)%columns;faces.push([a,b,c],[b,d,c]);}
 for(const row of [0,rows]){const center=points.length;points.push(axis.clone().multiplyScalar((row?hi:lo)*length).addScaledVector(out,part==='upper'&&!row?-.085:0));for(let col=0;col<columns;col++)faces.push(row?[row*columns+col,row*columns+(col+1)%columns,center]:[row*columns+(col+1)%columns,row*columns+col,center]);}
 // Derive winding and all shading normals from this mesh's real triangles.
 const test=faces[Math.floor(rows/2)*columns*2],n=points[test[1]].clone().sub(points[test[0]]).cross(points[test[2]].clone().sub(points[test[0]])),c=points[test[0]].clone(),radial=c.clone().addScaledVector(axis,-c.dot(axis));
 if(n.dot(radial)<0)for(const f of faces)[f[1],f[2]]=[f[2],f[1]];
 for(const p of points)p.set(Math.fround(p.x),Math.fround(p.y),Math.fround(p.z));
 const normals=points.map(()=>new Vector3()),physical=[];let minimumArea=Infinity;
 for(const f of faces){const n=points[f[1]].clone().sub(points[f[0]]).cross(points[f[2]].clone().sub(points[f[0]]));minimumArea=Math.min(minimumArea,n.length()*.5);if(n.length()<1e-12)throw new Error('Organic skin degenerate face');for(const id of f)normals[id].add(n);physical.push(n.normalize());}
 normals.forEach(n=>n.normalize());
 const arrays=Object.fromEntries(Object.keys(g.attributes).map(k=>[k,[]]));
 faces.forEach((f,fi)=>f.forEach((id,corner)=>{
  for(const[k,a]of Object.entries(g.attributes)){let v;
   if(k==='position')v=points[id].toArray();
   else if(k==='aPhysicalNormal')v=physical[fi].toArray();
   else if(['normal','aSmooth','aMoldNormal','aCrystalNormal'].includes(k))v=normals[id].toArray();
   else if(k==='aBary')v=[+(corner===0),+(corner===1),+(corner===2),0];
   else if(k==='aFacet')v=[0,0,0,.172];
   else if(k==='aCoat')v=[.34];
   else v=Array(a.itemSize).fill(0);
   arrays[k].push(...v);
  }
 }));
 for(const[k,a]of Object.entries(g.attributes))g.setAttribute(k,new Float32BufferAttribute(arrays[k],a.itemSize));
 g.setAttribute('normal',g.attributes.aCrystalNormal);
 // New forearm skin owns the proximal cuff fit. The palm-side cuff rim stays.
 if(part==='fore')delete g.userData.mrsWristSeat120;
 g.userData.mrsOrganicMuscles={version:'R166-M04',authority:'User redirect: organic oblong muscle volumes; no arm diamond structuring',part,side,frame,muscles,core,lo,hi,rows,columns,originalFaces:original.count/3,faces:faces.length,maximumRadialChange,minimumArea,normalRepresentation:'Area-weighted normals of actual continuous organic skin',protected:'Other body regions, object frames, bone lengths; proximal cuff fitted to wrist envelope',status:'Organic volume candidate; five-view clay validation required'};
 g.userData.activeArmRepresentation='organic-muscle-volumes';
 g.computeBoundingBox();g.computeBoundingSphere();return g;
}
