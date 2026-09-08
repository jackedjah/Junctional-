import {facetedGeometry} from './forge.js';
import {MALE} from './proportions.js';

// M43: constrain the actual triangle planes, rather than an analytic curve
// which can fold again when sampled onto the widening loft. Mirror groups
// share their correction. All outside vertices and band endpoints are fixed.
export function resolveMrsKneeTransition(result){
  const {positions:p,faces}=result,groups=new Map(),owners=[];
  for(let i=0;i<p.length/3;i++){
    const x=p[3*i],y=p[3*i+1],z=p[3*i+2];
    const editable=z>0&&y>.945&&y<1.125&&Math.abs(x)>.030&&Math.abs(x)<.255;
    if(!editable){owners[i]=null;continue;}
    const key=[Math.abs(x),y].map(v=>Math.round(v*1e6)).join(',');
    if(!groups.has(key))groups.set(key,{ids:[],initial:z,z});
    const group=groups.get(key);group.ids.push(i);owners[i]=group;
  }
  const constraints=[];
  for(const f of faces){
    const v=f.map(i=>p.slice(3*i,3*i+3));
    if(v.some(q=>q[2]<=0)||v.some(q=>q[1]<.945||q[1]>1.125))continue;
    const ax=v.map(q=>Math.abs(q[0]));
    if(Math.max(...ax)<.065||Math.min(...ax)>.245)continue;
    const dx1=v[1][0]-v[0][0],dy1=v[1][1]-v[0][1];
    const dx2=v[2][0]-v[0][0],dy2=v[2][1]-v[0][1];
    const determinant=dx1*dy2-dy1*dx2;
    if(Math.abs(determinant)<1e-10)continue;
    const coefficients=[(dx2-dx1)/determinant,-dx2/determinant,dx1/determinant];
    const adjustable=new Map();
    for(let j=0;j<3;j++)if(owners[f[j]])adjustable.set(owners[f[j]],(adjustable.get(owners[f[j]])||0)+coefficients[j]);
    if(adjustable.size)constraints.push({f,coefficients,adjustable});
  }
  const slope=c=>c.f.reduce((sum,id,j)=>sum+c.coefficients[j]*(owners[id]?.z??p[3*id+2]),0);
  const initialMinimum=Math.min(...constraints.map(slope)),minimumSlope=.005;
  let sweeps=0;
  for(;sweeps<96;sweeps++){
    let maximumViolation=0;
    for(const c of constraints){
      const violation=minimumSlope-slope(c);
      maximumViolation=Math.max(maximumViolation,violation);
      if(violation<=1e-9)continue;
      const denominator=[...c.adjustable.values()].reduce((sum,v)=>sum+v*v,0);
      for(const [group,coefficient]of c.adjustable)group.z+=violation*coefficient/denominator;
    }
    if(maximumViolation<1e-7)break;
  }
  const finalMinimum=Math.min(...constraints.map(slope));
  const maximumCorrection=Math.max(...[...groups.values()].map(g=>Math.abs(g.z-g.initial)));
  if(finalMinimum<minimumSlope-1e-6||maximumCorrection>.006)throw new Error('Mrs. Mah knee support constraints did not converge within the local correction budget');
  let changedGroups=0;
  for(const group of groups.values())if(Math.abs(group.z-group.initial)>1e-12){
    changedGroups++;for(const id of group.ids)p[3*id+2]=group.z;
  }
  const inherited=result.geometry;
  result.geometry=facetedGeometry(p,faces,null,{lift:MALE.TORSO.classLift,inner:true,normalWeight:'angle'});
  // Rebuild only geometric fields. Keep authored material classes, cavity
  // and coating buffers unchanged even where triangle area was corrected.
  for(const [name,attribute]of Object.entries(inherited.attributes))
    if(!['position','normal','aSmooth','aMoldNormal','aBary'].includes(name))result.geometry.setAttribute(name,attribute);
  inherited.dispose();
  result.geometry.userData.mrsKneeTransition={method:'mirror-coupled triangle slope constraints',constraints:constraints.length,sweeps:sweeps+1,initialMinimum,finalMinimum,minimumSlope,maximumCorrection,changedGroups};
  return result;
}
