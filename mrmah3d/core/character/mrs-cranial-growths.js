import {Float32BufferAttribute} from '../../vendor/three/three.module.min.js';

// Grown shell: replace six rear triangles with open-root, swept crystalline
// continuations. The parent triangle is NOT left underneath a separate mesh.
// Float-identical perimeter corners preserve the retained shell attachment.
export function growMrsCranialProjections(g) {
  if(g.index)throw new Error('Cranial growth expects retained expanded shell');
  const attrs=g.attributes, p=attrs.position, out=Object.fromEntries(Object.keys(attrs).map(k=>[k,[]]));
  const roots=new Set([104,105,106,109,110,111]), records=[], groups=[];
  const read=i=>[p.getX(i),p.getY(i),p.getZ(i)];
  const sub=(a,b)=>a.map((v,j)=>v-b[j]);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function tri(points, source, original=false){
    const n=cross(sub(points[1],points[0]),sub(points[2],points[0])),len=Math.hypot(...n);
    if(len<1e-12)throw new Error('Degenerate cranial face');
    for(let v=0;v<3;v++)for(const [k,a]of Object.entries(attrs)){
      if(k==='position')out[k].push(...points[v]);
      else if(!original&&['normal','aSmooth','aPhysicalNormal','aMoldNormal'].includes(k))out[k].push(...n.map(x=>x/len));
      else if(!original&&k==='aBarycentric')out[k].push(...[0,1,2].map(j=>j===v?1:0));
      else for(let j=0;j<a.itemSize;j++)out[k].push(a.array[(source+v)*a.itemSize+j]);
    }
  }
  for(const group of g.groups){
    const start=out.position.length/3;
    for(let i=group.start;i<group.start+group.count;i+=3){
      const a=[read(i),read(i+1),read(i+2)];
      if(!roots.has(i/3)){tri(a,i,true);continue;}
      if(group.materialIndex!==0||a.some(v=>Math.abs(v[2]+.1872)>1e-6))throw new Error('Retained rear root landmark changed');
      const c=[0,1,2].map(j=>a.reduce((s,v)=>s+v[j],0)/3), s=Math.sign(c[0]);
      const length=Math.abs(c[0])>.125?.35:Math.abs(c[0])>.085?.30:.22;
      const rings=[a.map(v=>v.map((x,j)=>c[j]+(x-c[j])*.18))];
      // Transport a genuinely volumetric section around the bend. Keeping
      // sections in the rear plate's XY plane made trial A read as ribbons.
      const stations=[[.08,.38,.10,.026,.72],[.34,.76,.40,.023,1.12],[.70,.96,.78,.015,1.42],[1,1,1,.004,1.50]];
      for(const [drop,rear,lateral,radius,angle]of stations)rings.push(a.map(v=>{
        const dx=v[0]-c[0],dy=v[1]-c[1],r=Math.hypot(dx,dy),ux=dx/r,uy=dy/r;
        return [c[0]+ux*radius+s*.035*lateral,
          c[1]+uy*radius*Math.cos(angle)-length*drop,
          c[2]-uy*radius*Math.sin(angle)-.105*rear];
      }));
      // Annulus keeps the original triangle boundary and removes its centre.
      for(let j=0;j<3;j++){const k=(j+1)%3;tri([a[j],a[k],rings[0][k]],i);tri([a[j],rings[0][k],rings[0][j]],i);}
      for(let r=0;r<rings.length-1;r++)for(let j=0;j<3;j++){
        const k=(j+1)%3;tri([rings[r][j],rings[r][k],rings[r+1][k]],i);tri([rings[r][j],rings[r+1][k],rings[r+1][j]],i);
      }
      tri(rings.at(-1),i);
      records.push({sourceTriangle:i/3,root:c,drop:length,rearward:.105,lateral:.035,rootSpan:Math.max(...a.map((v,j)=>Math.hypot(...sub(v,a[(j+1)%3]))))*.18,maximumSectionRadius:.026,terminalRadius:.004});
    }
    groups.push({start,count:out.position.length/3-start,materialIndex:group.materialIndex});
  }
  for(const[k,a]of Object.entries(attrs))g.setAttribute(k,new Float32BufferAttribute(out[k],a.itemSize));
  g.clearGroups();for(const gr of groups)g.addGroup(gr.start,gr.count,gr.materialIndex);
  g.computeBoundingBox();g.computeBoundingSphere();
  g.userData.mrsCranialGrowths={version:'R166-M10-C',records,method:'Six rear shell patches replaced with connected faceted backward/downward continuations; layered transported solid sections, no root caps, no separate strands',protected:'Original shell outside six rear triangles; entire glass, cavity and bezel; original material assignments'};
  return g;
}
