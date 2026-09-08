import {Vector3,Float32BufferAttribute} from '../../vendor/three/three.module.min.js';
const key=v=>v.toArray().map(x=>x.toFixed(6)).join(',');

// Remove only verified microscopic support edges with a valid manifold link.
// Previously authored facing vertices cannot participate in this repair.
export function repairMrsDeltoidSupport142(g,side){
 const attrs=g.attributes,p=attrs.position,alias=attrs.normal===attrs.aCrystalNormal,f=g.userData.mrsSurgical126.frame;
 const axis=new Vector3().fromArray(f.axis),front=new Vector3().fromArray(f.front),out=new Vector3().fromArray(f.out);
 const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i)),positions=new Map(stock.map(v=>[key(v),v]));
 const fields=['mrsBrachialisPatch127','mrsDeltoid128','mrsDeltoidInsertion129','mrsBiceps139','mrsBicepsProximal141'];
 const protectedKeys=new Set(fields.flatMap(k=>g.userData[k].planes.flatMap(pl=>pl.triangleIndices.flatMap(t=>stock.slice(t*3,t*3+3).map(key)))));
 let faces=Array.from({length:p.count/3},(_,i)=>({parent:i,keys:stock.slice(i*3,i*3+3).map(key)}));
 const replacements=new Map(),repairs=[];
 for(let pass=0;pass<12;pass++){
  const edges=new Map(),neighbors=new Map();
  for(const face of faces)for(let j=0;j<3;j++){const a=face.keys[j],b=face.keys[(j+1)%3],id=[a,b].sort().join('|');if(!edges.has(id))edges.set(id,{a,b,faces:[]});edges.get(id).faces.push(face);if(!neighbors.has(a))neighbors.set(a,new Set());if(!neighbors.has(b))neighbors.set(b,new Set());neighbors.get(a).add(b);neighbors.get(b).add(a);}
  const candidates=[...edges.values()].filter(e=>{const a=positions.get(e.a),b=positions.get(e.b),t=a.dot(axis)/f.boneLength,angle=Math.atan2(a.dot(out),a.dot(front));return t>-.06&&t<.14&&angle>.1&&angle<1.05&&a.distanceTo(b)<2e-5&&!protectedKeys.has(e.a)&&!protectedKeys.has(e.b);}).sort((a,b)=>positions.get(a.a).distanceTo(positions.get(a.b))-positions.get(b.a).distanceTo(positions.get(b.b)));
  if(!candidates.length)break;const e=candidates[0],common=[...neighbors.get(e.a)].filter(k=>neighbors.get(e.b).has(k));
  if(e.faces.length!==2||common.length!==2)throw new Error('M142 microscopic support edge fails manifold link');
  const [keep,drop]=[e.a,e.b].sort(),removed=e.faces.map(f=>f.parent),distance=positions.get(keep).distanceTo(positions.get(drop));
  replacements.set(drop,keep);faces=faces.map(f=>({...f,keys:f.keys.map(k=>k===drop?keep:k)})).filter(f=>new Set(f.keys).size===3);
  repairs.push({keep:positions.get(keep).toArray(),removedVertex:positions.get(drop).toArray(),displacement:distance,removedTriangles:removed,linkNeighbors:2});
 }
 if(repairs.length>=12)throw new Error('M142 microscopic support repair exceeded local scope');
 const mapping=Array.from({length:p.count/3},()=>[]),output=Object.fromEntries(Object.keys(attrs).map(k=>[k,[]])),changed=[];
 faces.forEach((face,ti)=>{
  mapping[face.parent].push(ti);const v=face.keys.map((k,j)=>k===key(stock[face.parent*3+j])?stock[face.parent*3+j]:positions.get(k)),moved=v.some((q,j)=>!q.equals(stock[face.parent*3+j])),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
  for(let j=0;j<3;j++)for(const[name,a]of Object.entries(attrs)){let val=Array.from(a.array.slice((face.parent*3+j)*a.itemSize,(face.parent*3+j+1)*a.itemSize));if(name==='position')val=v[j].toArray();if(name==='aPhysicalNormal'&&moved)val=n.toArray();output[name].push(...val);}if(moved)changed.push(ti);
 });
 for(const[name,a]of Object.entries(attrs))g.setAttribute(name,new Float32BufferAttribute(output[name],a.itemSize));if(alias)g.setAttribute('normal',g.attributes.aCrystalNormal);
 // Newly welded continuous corners receive one unit normal. No protected
 // facing vertex is touched, and physical per-face normals stay independent.
 const groups=new Map();faces.forEach((face,t)=>face.keys.forEach((k,j)=>{if(!groups.has(k))groups.set(k,[]);groups.get(k).push(t*3+j);}));
 for(const keep of replacements.values())for(const name of ['normal','aSmooth','aMoldNormal','aCrystalNormal']){const a=g.attributes[name],indices=groups.get(keep);if(!a||!indices)continue;const n=indices.reduce((s,i)=>s.add(new Vector3().fromBufferAttribute(a,i)),new Vector3()).normalize();for(const i of indices)a.setXYZ(i,n.x,n.y,n.z);}
 const visited=new WeakSet();
 const reindex=value=>{if(!value||typeof value!=='object'||visited.has(value))return;visited.add(value);if(Array.isArray(value)){for(const v of value)reindex(v);return;}for(const[k,v]of Object.entries(value)){if(k==='triangleIndices'&&Array.isArray(v))value[k]=v.flatMap(i=>mapping[i]);else reindex(v);}};
 reindex(g.userData);for(const r of g.userData.mrsBicepsReturn140.returns){if(mapping[r.triangle].length!==1)throw new Error('M142 repaired a retained biceps return');r.triangle=mapping[r.triangle][0];}
 g.userData.mrsDeltoidSupportRepair142={version:'M142',side,repairs,changedTriangles:changed,oldToNewTriangles:mapping,originalTriangleCount:p.count/3,triangleCount:faces.length,maximumDisplacement:Math.max(0,...repairs.map(r=>r.displacement)),protected:'Every previously authored physical facing vertex; repair restricted to unowned microscopic deltoid support edges'};
 return g;
}
