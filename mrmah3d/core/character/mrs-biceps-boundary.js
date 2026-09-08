import {Vector3,Float32BufferAttribute,Triangle} from '../../vendor/three/three.module.min.js';
const key=v=>v.toArray().map(x=>x.toFixed(6)).join(',');
export function cutMrsBicepsStations139(g,side){
 const attr=g.attributes,p=attr.position,frame=g.userData.mrsSurgical126.frame,displayCrystal=attr.normal===attr.aCrystalNormal;
 const axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.out),out=new Vector3().fromArray(frame.front),length=frame.boneLength;
 const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const xyz=v=>({x:v.dot(front),y:v.dot(axis),z:v.dot(out),t:v.dot(axis)/length});
 const nodes=[],lookup=new Map(),corners=stock.map((v,i)=>{const id=key(v);if(!lookup.has(id)){lookup.set(id,nodes.length);nodes.push({p:v.clone(),source:i});}return lookup.get(id);});
 const original=Array.from({length:p.count/3},(_,i)=>({ids:corners.slice(i*3,i*3+3),parent:i,untouched:true}));
 let faces=original.slice();
 const protectedTriangles=new Set(['mrsBrachialisPatch127','mrsDeltoid128','mrsDeltoidInsertion129'].flatMap(k=>g.userData[k].planes.flatMap(p=>p.triangleIndices)));
 const protectedKeys=new Set([...protectedTriangles].flatMap(t=>stock.slice(t*3,t*3+3).map(key)));
 const active=v=>{const q=xyz(v);return q.z>.025&&q.t>.30+1e-7&&q.t<.61-1e-7&&Math.abs(q.x)<.052;};
 const intersecting=vs=>{const q=vs.map(xyz);return q.every(p=>p.z>.025)&&Math.min(...q.map(p=>p.t))<.61&&Math.max(...q.map(p=>p.t))>.30&&Math.min(...q.map(p=>p.x))<.030&&Math.max(...q.map(p=>p.x))>-.095;};
 const cut=fn=>{
  const edges=new Map();
  for(const f of faces){const vs=f.ids.map(i=>nodes[i].p);if(!intersecting(vs))continue;
   for(let k=0;k<3;k++){
    const a=f.ids[k],b=f.ids[(k+1)%3],id=[a,b].sort((a,b)=>a-b).join(':');if(edges.has(id))continue;
    const [lo,hi]=a<b?[a,b]:[b,a],pa=nodes[lo].p,pb=nodes[hi].p,fa=fn(xyz(pa)),fb=fn(xyz(pb));
    if(fa*fb>=0||Math.abs(fa)<1e-9||Math.abs(fb)<1e-9)continue;
    const t=fa/(fa-fb);if(Math.min(t,1-t)<1e-6)continue;
    const v=pa.clone().lerp(pb,t),q=xyz(v);if(q.z<=.025||q.t<.30-1e-7||q.t>.61+1e-7||(q.x<-.095||q.x>.030))continue;
    const pointKey=key(v);let index=lookup.get(pointKey);
    if(index===undefined){index=nodes.length;nodes.push({p:v});lookup.set(pointKey,index);}if(index!==a&&index!==b)edges.set(id,index);
   }
  }
  const next=[],add=(ids,f)=>{if(new Set(ids).size===3)next.push({ids,parent:f.parent,untouched:false});};
  for(const f of faces){const v=f.ids,m=v.map((a,k)=>edges.get([a,v[(k+1)%3]].sort((a,b)=>a-b).join(':'))),count=m.filter(i=>i!==undefined).length;
   if(!count){next.push(f);continue;}
   if(protectedTriangles.has(f.parent))throw new Error('M139 boundary would split retained crown '+side+' '+f.parent);
   if(count===1){const k=m.findIndex(i=>i!==undefined);add([v[k],m[k],v[(k+2)%3]],f);add([m[k],v[(k+1)%3],v[(k+2)%3]],f);}
   else if(count===2){const k=[0,1,2].find(k=>m[(k+2)%3]!==undefined&&m[k]!==undefined),a=v[(k+2)%3],b=v[k],c=v[(k+1)%3],u=m[(k+2)%3],w=m[k];add([u,b,w],f);
    if(nodes[a].p.distanceTo(nodes[w].p)<=nodes[u].p.distanceTo(nodes[c].p)){add([a,u,w],f);add([a,w,c],f);}else{add([a,u,c],f);add([u,w,c],f);}
   }else{add([v[0],m[0],m[2]],f);add([m[0],v[1],m[1]],f);add([m[2],m[1],v[2]],f);add([m[0],m[1],m[2]],f);}
  }faces=next;
 };
 // Crown topology follows the measured biceps apex, not the humeral axis.
 for(const t of [.38,.54])cut(q=>q.t-t);
 // Coalesce cut-only sub-micron edges and thin intersection slivers. Retained
 // source vertices win every weld; no original-original edge is collapsed.
 const representative=nodes.map((_,i)=>i),root=i=>{while(representative[i]!==i)i=representative[i];return i;};let microWelds=0;
 for(const f of faces){const vs=f.ids.map(i=>nodes[i].p),area=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).length();
  const edges=f.ids.map((a,k)=>({a,b:f.ids[(k+1)%3],length:vs[k].distanceTo(vs[(k+1)%3])})).sort((a,b)=>a.length-b.length);
  for(const e of edges){let a=root(e.a),b=root(e.b);if(a===b||nodes[a].source!==undefined&&nodes[b].source!==undefined)continue;
   if(e.length>=1.2e-6&&!(area<2e-10&&e.length<2e-5))continue;
   if(nodes[b].source!==undefined||nodes[a].source===undefined&&a>b)[a,b]=[b,a];representative[b]=a;microWelds++;break;
  }
 }
 faces=faces.map(f=>({...f,ids:f.ids.map(root)})).filter(f=>new Set(f.ids).size===3);
 // Keep the first child at its parent's index; all untouched faces and M133
 // crown indices remain exact. Additional children are appended explicitly.
 const children=Array.from({length:original.length},()=>[]);for(const f of faces)children[f.parent].push(f);
 const final=children.map(fs=>fs[0]).concat(children.flatMap(fs=>fs.slice(1))),mapping=children.map(()=>[]);
 final.forEach((f,i)=>mapping[f.parent].push(i));
 const expanded=[],weights=[];
 for(const f of final){const source=stock.slice(f.parent*3,f.parent*3+3),triangle=new Triangle(...source);
  for(let k=0;k<3;k++){const v=f.untouched?source[k].clone():nodes[f.ids[k]].p.clone();expanded.push(v);weights.push(f.untouched?[k===0?1:0,k===1?1:0,k===2?1:0]:triangle.getBarycoord(v,new Vector3()).toArray());}
 }

 const output=Object.fromEntries(Object.keys(attr).map(k=>[k,[]]));
 final.forEach((f,ti)=>{for(let k=0;k<3;k++){const w=weights[ti*3+k];for(const[name,a]of Object.entries(attr)){
  let val=f.untouched?Array.from(a.array.slice((f.parent*3+k)*a.itemSize,(f.parent*3+k+1)*a.itemSize)):Array.from({length:a.itemSize},(_,j)=>w.reduce((sum,b,l)=>sum+b*a.array[(f.parent*3+l)*a.itemSize+j],0));
  if(name==='position')val=expanded[ti*3+k].toArray();
  else if(['normal','aSmooth','aMoldNormal','aCrystalNormal','aPhysicalNormal'].includes(name)&&!f.untouched)val=new Vector3().fromArray(val).normalize().toArray();
  if(name==='aBary'&&!f.untouched)val=[k===0?1:0,k===1?1:0,k===2?1:0,val[3]];
  output[name].push(...val);
 }}});
 for(const[name,a]of Object.entries(attr))g.setAttribute(name,new Float32BufferAttribute(output[name],a.itemSize));if(displayCrystal)g.setAttribute('normal',g.attributes.aCrystalNormal);
 g.userData.mrsBicepsBoundary139={version:'M139',oldToNewTriangles:mapping,originalTriangleCount:original.length,triangleCount:final.length,refinedBaselinePositions:expanded.flatMap(v=>v.toArray()),stations:[.38,.54],microWelds};
}
