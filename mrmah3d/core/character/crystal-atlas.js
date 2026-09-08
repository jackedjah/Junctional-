/* R144: anatomy-following crystal face atlas, separate from the retained mass.
 * No mass displacement, textures, objects or frame work; local face-boundary splits only.
 * Face normals and optical response are grouped over subdivisions of the existing surface.
 * This is a shading representation, not a claim of planar retopology closure.
 */
import { Vector3, Float32BufferAttribute } from '../../vendor/three/three.module.min.js';
import { ARMS, MRMAH_MORPHOLOGY as M } from './proportions.js';
import { QUAD_KNEE_LAYOUT, scapularConstruction } from './myofascial.js';

const V=a=>new Vector3(...a), clamp=x=>Math.max(0,Math.min(1,x));
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;
}return yes;}
function torsoOwner(p){
 const x=Math.abs(p.x),y=p.y,a=Math.atan2(x,Math.abs(p.z)),side=p.x<0?'R':'L';let owner;
 if(y>2.20)owner='NECK';
 else if(y<.76)owner='TERMINAL_TAPER';
 else if(y<.91)owner='KNEE_RETURN';
 else if(y<1.41)owner=p.z>=0?'FUSED_QUAD':'LOWER_POSTERIOR';
 else if(p.z>=0){
  if(x<.014)owner='MIDLINE';
  else if(inside([x,y],M.pec.surface.surfaceCage.boundary))owner='PEC';
  else {const b=M.rectus.patches.find(b=>inside([x,y],b.contour));
   owner=b?'RECTUS_'+b.name.toUpperCase():y>1.78&&a<1.45?'SERRATUS':y>2.13?'CLAVICLE':'OBLIQUE_V';}
 }else owner=x<.055?'SPINAL_SUPPORT':y>2.10?'TRAP':y>1.92?'SCAPULAR_TERES':y>1.65?'LAT':'LUMBAR';
 return {owner,side,x,y,a};
}
function torsoSeeds(){
 const seeds=[];
 function add(owner,x,y,z,sx,sy,sz,type='kite'){for(const side of ['L','R'])seeds.push({owner,side,center:V([side==='L'?x:-x,y,z]),scale:V([sx,sy,sz]),type});}
 // Pec fan follows the existing cage, not the enlarged reference inset's proportions.
 const pc=M.pec.surface.surfaceCage;
 add('PEC',...pc.crest,.12,.09,.10,'clipped diamond');
 pc.crown.forEach(p=>add('PEC',...p,.095,.070,.08,'kite'));
 for(const b of M.rectus.patches){
  const [x,y]=b.crest,[w,h]=b.extent,owner='RECTUS_'+b.name.toUpperCase();
  add(owner,x,y,.30,w*.75,h*.70,.20,'diamond');
  for(const [u,v]of [[-.60,0],[.60,.12],[-.12,.60],[.20,-.64]])add(owner,x+u*w,y+v*h,.28,w*.60,h*.52,.20,'return plane');
 }
 for(const [x,y,z]of [[.205,1.875,.25],[.27,1.93,.22],[.18,1.80,.25],[.245,1.83,.22],[.30,1.865,.18]])add('SERRATUS',x,y,z,.048,.035,.16,'long wedge');
 for(const [x,y,z]of [[.175,1.70,.23],[.215,1.79,.20],[.165,1.59,.23],[.14,1.48,.23],[.235,1.65,.16],[.27,1.75,.12]])add('OBLIQUE_V',x,y,z,.052,.09,.13,'long wedge');
 for(const [owner,points,scale]of [
  ['TRAP',[[.095,2.17,-.15],[.20,2.19,-.17],[.25,2.12,-.20],[.12,2.10,-.22]],[.075,.075,.10]],
  ['SCAPULAR_TERES',[[.12,2.045,-.28],[.23,2.04,-.26],[.30,2.07,-.20],[.17,1.975,-.29],[.285,1.965,-.22]],[.062,.070,.09]],
  ['LAT',[[.20,1.90,-.24],[.28,1.88,-.18],[.16,1.80,-.25],[.23,1.78,-.18],[.12,1.68,-.24]],[.058,.09,.10]],
  ['SPINAL_SUPPORT',[[.035,2.17,-.15],[.037,2.04,-.24],[.035,1.86,-.25],[.027,1.67,-.23],[.023,1.49,-.21]],[.04,.10,.10]],
  ['LUMBAR',[[.08,1.56,-.23],[.16,1.58,-.20],[.12,1.46,-.22]],[.065,.09,.10]],
  ['CLAVICLE',[[.07,2.18,.12],[.21,2.16,.13],[.32,2.13,.10]],[.075,.05,.09]],
  ['NECK',[[.035,2.23,.08],[.05,2.34,.04],[.07,2.25,-.05],[.035,2.34,-.055]],[.037,.075,.06]],
  ['MIDLINE',[[.005,2.055,.30],[.005,1.91,.25],[.005,1.76,.26],[.005,1.55,.23]],[.02,.11,.10]]
 ])points.forEach(p=>add(owner,...p,...scale,'long wedge'));
 // Longitudinal quad diamonds remain INSIDE one silhouette; no split or calf.
 for(const [owner,zsign]of [['FUSED_QUAD',1],['LOWER_POSTERIOR',-1]]){
  for(const [x,y,z]of [[.09,1.34,.20],[.20,1.29,.19],[.28,1.20,.10],[.125,1.16,.235],[.22,1.07,.14],[.065,1.02,.19],[.125,.93,.14]])add(owner,x,y,z*zsign,.070,.105,.11,'long diamond');
 }
 for(const [x,y,z]of [[.055,.865,.125],[.115,.83,.08],[.052,.79,-.10],[.125,.88,-.06]])add('KNEE_RETURN',x,y,z,.050,.055,.07,'clipped diamond');
 for(const y of [.66,.43,.18])for(const a of [.25,1.05,1.95,2.80])add('TERMINAL_TAPER',.15*y*Math.sin(a),y,.22*y*Math.cos(a),.055,.18,.055,'long wedge');
 const counts={};for(const s of seeds){const key=s.owner+'_'+s.side;s.id='MR_CRYSTAL_'+key+'_'+String(counts[key]=(counts[key]||0)+1).padStart(2,'0');}return seeds;
}
function apply(geometry,seeds,ownerAt,retainTriangleOwners=false){
 const p=geometry.attributes.position;if(geometry.index)throw new Error('Crystal atlas expects existing expanded triangle geometry');
 const stock=geometry.attributes.aSmooth,faceNormals=geometry.attributes.normal;
 const records=seeds.map(s=>({...s,sum:new Vector3(),centroid:new Vector3(),area:0,triangles:[],neighbors:new Set()}));
 const assigned=[],edgeOwners=new Map();
 function key(v){return [v.x,v.y,v.z].map(x=>Math.round(x*1e6)).join(',');}
 for(let i=0;i<p.count;i+=3){
  const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j)),c=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),area=cross.length()*.5,n=cross.clone().normalize();
  const owner=ownerAt?.(c),allowed=owner?records.filter(s=>s.owner===owner.owner&&s.side===owner.side):records;
  let best=null,dist=Infinity;
  for(const s of allowed){const delta=c.clone().sub(s.center),q=delta.clone().divide(s.scale);let d=q.lengthSq();if(s.normal)d+=6*Math.pow(1-clamp(n.dot(s.normal)),2);if(d<dist){dist=d;best=s;}}
  if(!best){assigned.push(null);continue;}
  best.sum.add(cross);best.centroid.addScaledVector(c,area);best.area+=area;best.triangles.push(i);assigned.push(best);
  for(let j=0;j<3;j++){const e=[key(v[j]),key(v[(j+1)%3])].sort().join('|');if(!edgeOwners.has(e))edgeOwners.set(e,[]);edgeOwners.get(e).push(best);}
 }
 for(const owners of edgeOwners.values())for(const a of owners)for(const b of owners)if(a!==b)a.neighbors.add(b.id);
 for(const s of records)if(s.area){s.normal=s.sum.normalize();s.centroid.multiplyScalar(1/s.area);}

 // R144 B: clip the existing surface triangles at the atlas boundaries.
 // A triangle-centre label alone creates sawtooth rims on the arm's fine grid.
 // Affine distances on each original triangle produce shared crossing points;
 // barycentric interpolation preserves the original piecewise-linear surface.
 const active=records.filter(s=>s.area),attributes=Object.entries(geometry.attributes).filter(([n])=>n!=='aCrystalNormal');
 const output=Object.fromEntries(attributes.map(([n])=>[n,[]]));let added=0,maxSupportError=0,subUlpDiscarded=0;
 active.forEach(s=>{s.sourceCenter=s.center;s.center=s.centroid.clone();s.triangles=[];});
 const dims=new Vector3(.080,.100,.080);
 function score(v,n,s){const q=v.clone().sub(s.center).divide(dims);return q.lengthSq()+3*(1-clamp(n.dot(s.normal)))**2;}
 function clip(poly,d){const out=[];for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=a.reduce((t,w,j)=>t+w*d[j],0),db=b.reduce((t,w,j)=>t+w*d[j],0);
  if(da<=1e-9)out.push(a);
  if((da<0)!==(db<0)){const t=da/(da-db);out.push(a.map((w,j)=>w+(b[j]-w)*t));}
 }return out;}
 function emit(weights,seed,first,sourcePoints){
  const pts=weights.map(w=>w.reduce((v,k,j)=>v.addScaledVector(sourcePoints[j],k),new Vector3())),cross=pts[1].clone().sub(pts[0]).cross(pts[2].clone().sub(pts[0]));if(cross.lengthSq()<1e-24)return;
  const fp=pts.map(v=>V(v.toArray().map(Math.fround)));
  if(fp[1].clone().sub(fp[0]).cross(fp[2].clone().sub(fp[0])).lengthSq()<=1e-32)return;
  const sourceNormal=sourcePoints[1].clone().sub(sourcePoints[0]).cross(sourcePoints[2].clone().sub(sourcePoints[0])).normalize();
  if(!crystalTriangleWinds(pts,fp,sourceNormal)){subUlpDiscarded++;return;}
  const exposure=V([seed.normal.x*(seed.side==='R'?-1:1),seed.normal.y,seed.normal.z]).dot(V([.32,.72,.62]).normalize());
  const facing=exposure>.63?'platinum':exposure>.08?'graphite':'obsidian';seed.opticalFamily=facing;
  const optical=facing==='platinum'?[-.045,.14,.025,.06]:facing==='graphite'?[.015,.02,.27,.14]:[.035,-.08,.50,.10];
  seed.triangles.push(added++);
  const area=cross.length()*.5,perimeter=pts[0].distanceTo(pts[1])+pts[1].distanceTo(pts[2])+pts[2].distanceTo(pts[0]),radius=2*area/perimeter;
  for(let j=0;j<3;j++){
   const w=weights[j];maxSupportError=Math.max(maxSupportError,Math.abs(pts[j].clone().sub(sourcePoints[0]).dot(sourceNormal)));
   for(const [name,a]of attributes){let value=Array.from({length:a.itemSize},(_,k)=>w.reduce((sum,t,v)=>sum+t*a.array[(first+v)*a.itemSize+k],0));
    if(['normal','aSmooth','aMoldNormal'].includes(name)){const v=name==='normal'?w.reduce((v,k,l)=>v.addScaledVector(new Vector3().fromBufferAttribute(stock,first+l),k),new Vector3()).normalize():V(value).normalize();if(name==='normal'){const blend=.90*clamp((clamp(v.dot(seed.normal))-.68)/.22);v.lerp(seed.normal,blend).normalize();}value=v.toArray();}
    if(name==='aFacet')value=optical;
    if(name==='aCoat')value=[facing==='platinum'?.72:.12];
    if(name==='aBary')value=[j===0?1:0,j===1?1:0,j===2?1:0,radius];
    output[name].push(...value);
   }
  }
 }
 for(let i=0;i<p.count;i+=3){
  const vs=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j)),ns=[0,1,2].map(j=>new Vector3().fromBufferAttribute(stock,i+j));
  const sc=active.map(s=>({s,d:vs.map((v,j)=>score(v,ns[j],s))}));
  const candidates=new Set();for(let j=0;j<3;j++)sc.slice().sort((a,b)=>a.d[j]-b.d[j]).slice(0,3).forEach(c=>candidates.add(c));
  const cs=[...candidates];
  for(const a of cs){let poly=[[1,0,0],[0,1,0],[0,0,1]];
   for(const b of cs){if(a===b)continue;poly=clip(poly,a.d.map((v,j)=>v-b.d[j]));if(poly.length<3)break;}
   for(let j=1;j<poly.length-1;j++)emit([poly[0],poly[j],poly[j+1]],a.s,i,vs);
  }
 }
 for(const [name,a]of attributes)geometry.setAttribute(name,new Float32BufferAttribute(output[name],a.itemSize,a.normalized));
 geometry.setAttribute('aCrystalNormal',geometry.attributes.normal);
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.crystalBoundarySplit={subUlpDiscarded,sourceTriangles:p.count/3,finalTriangles:added,trianglesAdded:added-p.count/3,maxBarycentricSupportError:maxSupportError,method:'Voronoi face crossings clipped inside each retained source triangle; no mass displacement'};
 const atlas=records.filter(s=>s.area).map(s=>({id:s.id,mirroredId:s.id.replace('_'+s.side+'_','_'+(s.side==='L'?'R':'L')+'_'),side:s.side,anatomicalOwner:s.owner,type:s.type,centerPosition:s.centroid.toArray(),averageNormal:s.normal.toArray(),surfaceArea:s.area,triangleCount:s.triangles.length,adjacentPlanes:[...s.neighbors],opticalFamily:s.opticalFamily,status:'PARTIAL surface-normal/optical face group; positions unchanged'}));
 if(retainTriangleOwners){const ids=Array(added);for(const r of active)for(const t of r.triangles)ids[t]=r.id;geometry.userData.__crystalOwners=ids;}
 geometry.userData.crystalPlaneAtlas=atlas;
 geometry.userData.crystallization={version:'R144',representation:'retained positions + anatomical normal/optical atlas',positionsChanged:0,trianglesAdded:added-p.count/3,coveredTriangles:added,totalTriangles:added,reference:'original Mr. Mah large fileset: clay construction + blue/platinum male sheet',geometryBuiltOnce:true};
 return atlas;
}
export function applyAnatomicalCrystalAtlas(body,limbs,materials){
 // R149: retain anatomical parent identity through static crystal splitting.
 // Temporary IDs never reach the GPU. Hero posing uses one affine map per
 // original triangle, so nonlinear bending cannot fold thin atlas slivers.
 const poseGeometry=body.torso.geometry,poseSource=poseGeometry.attributes.position.array.slice();
 poseGeometry.setAttribute('aPresentationParent',new Float32BufferAttribute(Array.from({length:poseGeometry.attributes.position.count},(_,i)=>Math.floor(i/3)),1));
 apply(body.torso.geometry,torsoSeeds(),torsoOwner,true);
 authorTorsoCrystalFans(body.torso.geometry);
 const poseIds=poseGeometry.attributes.aPresentationParent.array;
 poseGeometry.userData.heroPoseSupport={positions:poseSource,triangleIds:Uint32Array.from({length:poseIds.length/3},(_,i)=>Math.round(poseIds[i*3])),frame:'retained local anatomical triangles before crystal clipping'};
 poseGeometry.deleteAttribute('aPresentationParent');
 const atlas=body.torso.geometry.userData.crystalPlaneAtlas.slice();
 limbs.group.traverse(o=>{if(!o.isMesh||!/^arm-(left|right)-(upper|fore)$/.test(o.name))return;
  const seeds=(o.geometry.userData.diamondPlaneAtlas||[]).map(s=>({id:s.id.replace('MR_','MR_CRYSTAL_'),owner:s.anatomicalOwner,side:s.side,center:V(s.centerPosition),normal:V(s.averageNormal),scale:V(o.name.endsWith('fore')?[.050,.095,.060]:[.065,.090,.065]),type:s.type}));
  if(seeds.length){const fore=!!o.geometry.userData.proximalForearmSurface;apply(o.geometry,seeds,undefined,o.name.endsWith('upper')||fore);if(o.name.endsWith('upper')||fore)authorArmCrystalFans(o.geometry,o.name.includes('left')?'L':'R');if(o.name.endsWith('upper'))protectArmReturnNormals(o.geometry,o.name.includes('left')?'L':'R');atlas.push(...o.geometry.userData.crystalPlaneAtlas);}
 });
 // Same existing shader and world rig. Disable painted cavity attenuation;
 // retain real wall normals. No new cyan edge network or optical dependency.
 const u=materials.body.userData.crystal;
 u.uCavity.value=0;u.uDome.value=.08;u.uBevelAmount.value=.16;
 u.uInnerStrength.value=0;u.uCoreStrength.value=0;u.uFresnelBoost.value=.34;
 protectElbowContactNormals(limbs.group);
 body.group.userData.crystalPlaneAtlas=atlas;
}

/* R145: explicit pec and rectus crystal-face fans on the R144 retained surface.
 * XY is the anatomical local chart, not a camera projection. Crossings subdivide
 * existing triangles only. No mass, recess, shader or world-light modification.
 */
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
function area(p){return p.reduce((s,a,i)=>s+cross(a,p[(i+1)%p.length]),0)/2;}
function rayHit(poly,c,d){let best=null,nearest=Infinity;for(let i=0;i<poly.length;i++){
 const a=poly[i],e=sub(poly[(i+1)%poly.length],a),q=sub(a,c),den=cross(d,e);if(Math.abs(den)<1e-10)continue;
 const t=cross(q,e)/den,u=cross(q,d)/den;if(t>0&&u>=-1e-9&&u<=1+1e-9&&t<nearest){nearest=t;best=[c[0]+t*d[0],c[1]+t*d[1]];}
}if(!best)throw new Error('Crystal fan ray missed its bounded outline');return best;}
function makeCells(){const cells=[];
 function fan(owner,outer,center,inner,pecFan=false,design=null){
  // Explicit diamond corners are included as rays, so Voronoi cells cannot
  // turn the broad crown into an arbitrary rounded polygon.
  if(inner){outer=outer.concat(inner.map(p=>rayHit(outer,center,sub(p,center))));outer.sort((a,b)=>Math.atan2(a[1]-center[1],a[0]-center[0])-Math.atan2(b[1]-center[1],b[0]-center[0]));
   outer=outer.filter((p,i)=>i===0||Math.hypot(...sub(p,outer[i-1]))>1e-6);
  }
  const crown=inner?outer.map(p=>rayHit(inner,center,sub(p,center))):outer.map(p=>design?mix(center,p,design.crownFraction):mix(center,p,pecFan?.62:.48));
  const crowns=pecFan?[{poly:[crown[0],crown[1],crown[2],center],type:'inferior crown kite'},{poly:[crown[2],crown[3],crown[4],center],type:'outer crown kite'},{poly:[crown[4],crown[5],crown[6],center],type:'clavicular crown kite'},{poly:[crown[6],crown[0],center],type:'medial crown wedge'}]:[{poly:crown,type:'clipped diamond crown'}];
  const shapes=[...crowns,...outer.map((p,i)=>({poly:[crown[i],crown[(i+1)%crown.length],outer[(i+1)%outer.length],p],type:'anatomical return kite'}))];
  for(const side of ['L','R'])shapes.forEach((shape,i)=>{let poly=shape.poly.map(p=>[p[0]*(side==='R'?-1:1),p[1]]);if(area(poly)<0)poly.reverse();
   const turns=poly.map((p,j)=>cross(sub(poly[(j+1)%poly.length],p),sub(poly[(j+2)%poly.length],poly[(j+1)%poly.length])));
   if(turns.some(x=>x< -1e-7))throw new Error('Nonconvex authored crystal cell '+owner+' '+i);
   const id=`MR_CRYSTAL_${owner}_${side}_${design?'R162':'FAN'}_${String(i+1).padStart(2,'0')}`;
   cells.push({id,side,owner,hemisphere:design?.hemisphere||1,design,type:shape.type,poly,center:[center[0]*(side==='R'?-1:1),center[1]],crown:i<crowns.length,sum:new Vector3(),sumCenter:new Vector3(),area:0,triangles:[],neighbors:new Set(),bounds:[Math.min(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[1]))]});
  });
 }
 const pc=M.pec.surface.surfaceCage,c=pc.crest;
 fan('PEC',pc.boundary.map(p=>p.slice()),[.175,2.020],null,true);
 for(const b of M.rectus.patches)fan('RECTUS_'+b.name.toUpperCase(),b.contour.map(p=>p.slice()),b.crest.slice());
 // R162: body-wide anatomical plane atlas. Boundaries live in the retained
 // local XY chart; front/rear support is explicitly owned. These subdivide
 // the existing surface without moving it or inventing a new muscle mass.
 const regional=(owner,outline,center,hemisphere,scale,flow,source)=>fan(owner,outline,center,null,false,{hemisphere,crownFraction:Math.min(...scale),flow,source});
 for(const [i,sheet] of M.rectus.organization.lateralSheets.entries())regional(i?'SERRATUS_BLADE_'+i:'OBLIQUE_DESCENT',sheet.footprint,sheet.crown,1,[.62,.66],i?[.7,.5]:[-.4,-1],'retained independently authored rib/flank sheet');
 const back=M.back.sheets,scap=scapularConstruction(true);
 regional('SCAPULAR_CROWN',scap.boundary,scap.crest.slice(0,2),-1,[.63,.63],[-.3,-1],'R175 shared diagonal scapular crown; R166 inferior return retained');
 regional('TERES_BRIDGE',[[.18,1.922],[.279,1.926],[.314,2.005],[.255,1.990]],[.252,1.958],-1,[.60,.55],[1,.55],'R131 teres-to-lat attachment');
 regional('TRAP_SUPERIOR',back.upperTrap.footprint,back.upperTrap.crown,-1,[.56,.72],[-.2,1],'retained upper-trap sheet');
 regional('TRAP_DESCENT',[[.021,1.79],[.113,1.926],[.16,2.104],[.10,2.21],[.015,2.14]],[.075,2.04],-1,[.50,.74],[-.25,-1],'retained middle-trap descent');
 regional('LAT_DIAGONAL',[[.13,1.75],[.215,1.73],[.302,1.86],[.304,1.921],[.14,1.892]],[.220,1.829],-1,[.60,.72],[-.6,-1],'R130 lat support inside recorded boundary');
 regional('ERECTOR_SUPPORT',[[.012,1.46],[.071,1.56],[.102,1.80],[.058,1.94],[.012,1.81]],[.047,1.68],-1,[.48,.79],[-.12,-1],'narrow longitudinal spinal support; midline uncut');
 regional('LUMBAR_RETURN',[[.042,1.425],[.166,1.47],[.205,1.65],[.13,1.69]],[.121,1.553],-1,[.60,.71],[-.45,-1],'lumbar-to-sacral flow on retained surface');
 regional('LOWER_V',[[.015,1.405],[.152,1.515],[.191,1.618],[.07,1.56]],[.098,1.507],1,[.50,.68],[-.65,-1],'abdominal/oblique V integrated above fused quad');
 const quad=[[.018,.785],[.128,.89],[.27,1.19],[.232,1.365],[.10,1.425],[.018,1.245]];
 regional('QUAD_LONG_CROWN',quad,[.126,1.15],1,[.58,.80],[-.15,-1],'original male lower mold: one paired quad crown inside one envelope');
 regional('GLUTE_SUPPORT',[[.022,1.16],[.14,1.10],[.26,1.22],[.218,1.42],[.06,1.45],[.014,1.32]],[.13,1.29],-1,[.62,.64],[.25,-1],'restrained male glute; no projection increase');
 regional('POSTERIOR_QUAD_FLOW',[[.015,.79],[.108,.84],[.214,1.09],[.15,1.23],[.026,1.18]],[.095,1.00],-1,[.55,.79],[-.12,-1],'long posterior fused surface, not independent legs');
 for(const hemisphere of [1,-1]){
  const suffix=hemisphere===1?'ANTERIOR':'POSTERIOR';
  regional('KNEE_RETURN_'+suffix,hemisphere===1?QUAD_KNEE_LAYOUT.knee.slice().reverse():[[.012,.77],[.061,.62],[.13,.78],[.066,.91]],hemisphere===1?QUAD_KNEE_LAYOUT.center:[.063,.775],hemisphere,[.50,.58],[0,-1],hemisphere===1?'R164 shared anatomical knee cage; same surface and crystal boundary':'shallow posterior knee landmark; no ring or new joint');
  regional('TAPER_WEDGE_'+suffix,[[.002,.085],[.083,.56],[.069,.675],[.01,.58]],[.036,.46],hemisphere,[.50,.81],[-.10,-1],'long faces converge inside the single terminal taper');
 }

 return cells;
}
export function authorTorsoCrystalFans(geometry){
 const oldOwners=geometry.userData.__crystalOwners,newOwners=[],cells=makeCells(),p=geometry.attributes.position,attrs=Object.entries(geometry.attributes),output=Object.fromEntries(attrs.map(([name])=>[name,[]]));
 if(geometry.index)throw new Error('Crystal fan source must be the retained expanded surface');
 const stock=geometry.attributes.aSmooth;let triangles=0,affectedSource=0,maxSupportError=0,subUlpDiscarded=0;
 function evaluate(w,vs){return w.reduce((v,k,i)=>v.addScaledVector(vs[i],k),new Vector3());}
 function cut(poly,d){const inside=[],outside=[];for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=a.reduce((s,v,j)=>s+v*d[j],0),db=b.reduce((s,v,j)=>s+v*d[j],0);
  if(da>=0)inside.push(a);if(da<=0)outside.push(a);
  if((da>0&&db<0)||(da<0&&db>0)){const q=mix(a,b,da/(da-db));inside.push(q);outside.push(q);}
 }return {inside,outside};}
 function carve(poly,cell,vs){let inside=poly;const outside=[];
  for(let k=0;k<cell.poly.length;k++){const a=cell.poly[k],edge=sub(cell.poly[(k+1)%cell.poly.length],a),d=vs.map(p=>cross(edge,[p.x-a[0],p.y-a[1]])),r=cut(inside,d);if(r.outside.length>=3)outside.push(r.outside);inside=r.inside;if(inside.length<3)break;}
  return {inside,outside};
 }
 function emit(poly,cell,first,vs){for(let t=1;t<poly.length-1;t++){
  const weights=[poly[0],poly[t],poly[t+1]],points=weights.map(w=>evaluate(w,vs));
  // Collinear clipping vertices have no surface area. Quantizing them first
  // can manufacture a reversed Float32 sliver; reject before quantization.
  const doubleN=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));if(doubleN.lengthSq()<1e-24)continue;
  const fp=points.map(v=>new Vector3(...v.toArray().map(Math.fround))),n=fp[1].clone().sub(fp[0]).cross(fp[2].clone().sub(fp[0]));if(n.lengthSq()<=1e-32)continue;
  const sourceN=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).normalize();if(!crystalTriangleWinds(points,fp,sourceN)){subUlpDiscarded++;continue;}const a=n.length()*.5,start=triangles++*3;newOwners.push(cell?cell.id:oldOwners[Math.floor(first/3)]);
  if(cell){cell.sum.add(n);cell.sumCenter.addScaledVector(points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3),a);cell.area+=a;cell.triangles.push(start);}
  for(let j=0;j<3;j++){
   const w=weights[j];maxSupportError=Math.max(maxSupportError,Math.abs(points[j].clone().sub(vs[0]).dot(sourceN)));
   for(const [name,attr]of attrs){let value=Array.from({length:attr.itemSize},(_,k)=>w.reduce((s,v,i)=>s+v*attr.array[(first+i)*attr.itemSize+k],0));
    if(['normal','aSmooth','aMoldNormal','aCrystalNormal'].includes(name))value=new Vector3(...value).normalize().toArray();
    if(name==='aBary'){const perimeter=points[0].distanceTo(points[1])+points[1].distanceTo(points[2])+points[2].distanceTo(points[0]);value=[j===0?1:0,j===1?1:0,j===2?1:0,2*a/perimeter];}
    output[name].push(...value);
   }
  }
 }}
 for(let i=0;i<p.count;i+=3){
  const vs=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j)),xs=vs.map(p=>p.x),ys=vs.map(p=>p.y),zs=vs.map(p=>p.z);
  const candidates=cells.filter(c=>(c.design?Math.min(...zs.map(z=>z*c.hemisphere))>0:Math.min(...zs)>.12)&&Math.max(...xs)>=c.bounds[0]&&Math.min(...xs)<=c.bounds[1]&&Math.max(...ys)>=c.bounds[2]&&Math.min(...ys)<=c.bounds[3]);
  if(!candidates.length){for(const [name,a]of attrs)for(let j=0;j<3;j++)for(let k=0;k<a.itemSize;k++)output[name].push(a.array[(i+j)*a.itemSize+k]);newOwners.push(oldOwners[i/3]);triangles++;continue;}
  affectedSource++;let remaining=[[[1,0,0],[0,1,0],[0,0,1]]];
  for(const c of candidates){const next=[];for(const poly of remaining){const pieces=carve(poly,c,vs);if(pieces.inside.length>=3)emit(pieces.inside,c,i,vs);next.push(...pieces.outside);}remaining=next;if(!remaining.length)break;}
  for(const poly of remaining)emit(poly,null,i,vs);
 }
 for(const [name,a]of attrs)geometry.setAttribute(name,new Float32BufferAttribute(output[name],a.itemSize,a.normalized));
 const n=geometry.attributes.normal,sm=geometry.attributes.aSmooth,facet=geometry.attributes.aFacet,coat=geometry.attributes.aCoat;
 for(const c of cells){if(!c.area)continue;c.normal=c.sum.normalize();c.centroid=c.sumCenter.multiplyScalar(1/c.area);
  // Facing is derived from this cell's actual surface, not from a camera light.
  // Quiet convexity remains inside a face; strong pre-existing valley walls
  // retain more of their geometric normal than broad crowns do.
  const exposure=new Vector3(c.normal.x*(c.side==='R'?-1:1),c.normal.y,c.normal.z).dot(new Vector3(.32,.72,.62).normalize());
  c.opticalFamily=exposure>.63?'platinum':exposure>.08?'graphite':'obsidian';
  const optical=c.opticalFamily==='platinum'?[-.045,.14,.025,.06]:c.opticalFamily==='graphite'?[.015,.02,.27,.14]:[.035,-.08,.50,.10];
  for(const first of c.triangles)for(let j=0;j<3;j++){const i=first+j,base=new Vector3().fromBufferAttribute(sm,i),dot=base.dot(c.normal),blend=.96*Math.max(0,Math.min(1,(dot-.58)/.32)),v=base.lerp(c.normal,blend).normalize();n.setXYZ(i,v.x,v.y,v.z);facet.setXYZW(i,...optical);coat.setX(i,c.opticalFamily==='platinum'?.72:.12);}
 }
 geometry.setAttribute('aCrystalNormal',n);n.needsUpdate=facet.needsUpdate=coat.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();
 // Design adjacency is exact in the common surface chart, independent of the
 // incidental implementation triangulation. Outer boundary has legacy neighbors.
 for(const a of cells)for(const b of cells){if(a===b||a.side!==b.side||a.owner!==b.owner)continue;let shared=0;for(const p of a.poly)if(b.poly.some(q=>Math.hypot(...sub(p,q))<1e-6))shared++;if(shared>=2)a.neighbors.add(b.id);}
 const records=cells.filter(c=>c.area).map(c=>({id:c.id,mirroredId:c.id.replace('_'+c.side+'_','_'+(c.side==='L'?'R':'L')+'_'),side:c.side,anatomicalOwner:c.owner,type:c.type,boundaryLocalXY:c.poly,hemisphere:c.hemisphere,apexDirection:[(c.design?.flow[0]||0)*(c.side==='R'?-1:1),c.design?.flow[1]||1,0],source:c.design?.source||'original pec/rectus controls',centerPosition:c.centroid.toArray(),averageNormal:c.normal.toArray(),surfaceArea:c.area,triangleCount:c.triangles.length,adjacentPlanes:[...c.neighbors],adjacencyBasis:'exact shared authored cell-chart edges; outside legacy adjacency unverified',opticalFamily:c.opticalFamily,status:'PARTIAL explicit crown/return face cell on preserved surface'}));
 // Recount inherited regions after explicit clipping; do not leave stale
 // overlapping atlas coverage or claim faces that no longer own triangles.
 const inherited=new Map(geometry.userData.crystalPlaneAtlas.map(r=>[r.id,{...r,triangleCount:0,surfaceArea:0,sumCenter:new Vector3()}])),now=geometry.attributes.position;
 for(let i=0;i<triangles;i++){const r=inherited.get(newOwners[i]);if(!r)continue;const vs=[0,1,2].map(j=>new Vector3().fromBufferAttribute(now,i*3+j)),ar=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).length()*.5;r.triangleCount++;r.surfaceArea+=ar;r.sumCenter.addScaledVector(vs[0].clone().add(vs[1]).add(vs[2]).multiplyScalar(1/3),ar);}
 geometry.userData.crystalPlaneAtlas=[...inherited.values()].filter(r=>r.triangleCount).map(({sumCenter,...r})=>({...r,centerPosition:sumCenter.multiplyScalar(1/r.surfaceArea).toArray()})).concat(records);
 const validIds=new Set(geometry.userData.crystalPlaneAtlas.map(r=>r.id));for(const r of geometry.userData.crystalPlaneAtlas)r.adjacentPlanes=r.adjacentPlanes.filter(id=>validIds.has(id));
 delete geometry.userData.__crystalOwners;
 geometry.userData.crystalTorsoFans={subUlpDiscarded,version:'R162',source:'original male clay whole-body/regional mold and crystalline sheet; existing anatomical support frames',representation:'mirrored anterior/posterior muscle-owned crown/return polygons; inherited shape and motion preserved',sourceTriangles:p.count/3,finalTriangles:triangles,addedTriangles:triangles-p.count/3,affectedSourceTriangles:affectedSource,maxBarycentricSupportError:maxSupportError,cells:records};
 geometry.userData.crystallization={...geometry.userData.crystallization,version:'R162',totalTriangles:triangles,coveredTriangles:triangles,trianglesAdded:geometry.userData.crystallization.trianglesAdded+triangles-p.count/3};
 return records;
}


/* R146: biceps and triceps crystal faces follow their own humeral footprints.
 * Static surface subdivision + face normals; retained volume and pockets do not move.
 * Local arm chart is shared with the existing anatomical authoring representation.
 */
function armCrystalChart(side){
 const spec=ARMS[side==='L'?'left':'right'],upper=V(spec.elbow).sub(V(spec.shoulder)),fore=V(spec.wrist).sub(V(spec.elbow));
 const axis=upper.clone().normalize(),bend=Math.max(0,axis.dot(fore.normalize())),length=upper.length()+.06*bend*bend;
 const front=V([0,0,1]).addScaledVector(axis,-axis.z).normalize(),outer=new Vector3().crossVectors(axis,front);if(outer.x*spec.shoulder[0]<0)outer.negate();
 return {axis,front,outer,length,project:p=>{let a=Math.atan2(p.dot(outer),p.dot(front));if(a< -1)a+=2*Math.PI;return [a,p.dot(axis)/length];}};
}
function armCrystalCells(side,insertion,posterior,lateral,brachialis,biceps,deltoid,sideDelt,handoff,interfaceSurface,posteriorInterface,tendon){const cells=[];
 // R159: the tendon and its side returns share the authored support stations.
 if(tendon){for(let j=0;j<2;j++)for(let band=0;band<3;band++){
  const x=tendon.stations[j],y=tendon.stations[j+1],poly=[[x.angles[band],x.h],[x.angles[band+1],x.h],[y.angles[band+1],y.h],[y.angles[band],y.h]];if(area(poly)<0)poly.reverse();
  if(poly.some((p,k)=>cross(sub(poly[(k+1)%4],p),sub(poly[(k+2)%4],poly[(k+1)%4]))< -1e-8))throw new Error('Nonconvex distal triceps tendon cell');
  cells.push({id:tendon.planeIds[j*3+band],side,owner:'TRICEPS_DISTAL_TENDON',type:['lateral tendon return','long tendon facing wedge','medial tendon return'][band],poly,crown:false,sum:new Vector3(),sumCenter:new Vector3(),area:0,triangles:[],neighbors:new Set(),bounds:[Math.min(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[1]))]});
 }}
 // R158: a quiet posterior approach, finite floor and triceps return.
 if(posteriorInterface){for(let j=0;j<2;j++)for(let band=0;band<3;band++){
  const x=posteriorInterface.stations[j],y=posteriorInterface.stations[j+1],poly=[[x.angles[band],x.h],[x.angles[band+1],x.h],[y.angles[band+1],y.h],[y.angles[band],y.h]];if(area(poly)<0)poly.reverse();
  if(poly.some((p,k)=>cross(sub(poly[(k+1)%4],p),sub(poly[(k+2)%4],poly[(k+1)%4]))< -1e-8))throw new Error('Nonconvex posterior brachialis interface cell');
  cells.push({id:posteriorInterface.planeIds[j*3+band],side,owner:band===0?'BRACHIALIS_POSTERIOR_RETURN':band===1?'BRACHIALIS_TRICEPS_FLOOR':'LATERAL_TRICEPS_RETURN',type:['long posterior brachialis approach','finite posterior anatomical floor','short lateral triceps return'][band],poly,crown:false,sum:new Vector3(),sumCenter:new Vector3(),area:0,triangles:[],neighbors:new Set(),bounds:[Math.min(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[1]))]});
 }}
 // R157 faces derive from the same biceps/brachialis wall stations.
 if(interfaceSurface){for(let j=0;j<interfaceSurface.stations.length-1;j++)for(let band=0;band<4;band++){
  const x=interfaceSurface.stations[j],y=interfaceSurface.stations[j+1],poly=[[x.angles[band],x.h],[x.angles[band+1],x.h],[y.angles[band+1],y.h],[y.angles[band],y.h]];if(area(poly)<0)poly.reverse();
  if(poly.some((p,k)=>cross(sub(poly[(k+1)%4],p),sub(poly[(k+2)%4],poly[(k+1)%4]))< -1e-8))throw new Error('Nonconvex biceps-brachialis interface cell');
  cells.push({id:interfaceSurface.planeIds[j*4+band],side,owner:band<2?'BICEPS_LATERAL_RETURN':'BRACHIALIS_ANTERIOR_RETURN',type:['biceps side-facing wedge','short biceps wall','finite anatomical floor','anterior brachialis approach'][band],poly,crown:false,sum:new Vector3(),sumCenter:new Vector3(),area:0,triangles:[],neighbors:new Set(),bounds:[Math.min(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[1]))]});
 }}
 // R156 attachment faces precede the older overlapping cap-return cells.
 if(handoff){for(let j=0;j<2;j++)for(let band=0;band<4;band++){
  const x=handoff.stations[j],y=handoff.stations[j+1],poly=[[x.a,x.hs[band]],[y.a,y.hs[band]],[y.a,y.hs[band+1]],[x.a,x.hs[band+1]]];if(area(poly)<0)poly.reverse();
  if(poly.some((p,k)=>cross(sub(poly[(k+1)%4],p),sub(poly[(k+2)%4],poly[(k+1)%4]))< -1e-8))throw new Error('Nonconvex deltoid handoff cell');
  cells.push({id:handoff.planeIds[j*4+band],side,owner:'DELTOID_BRACHIALIS_HANDOFF',type:['descending cap wedge','short cap return','finite attachment floor','proximal brachialis approach'][band],poly,crown:false,sum:new Vector3(),sumCenter:new Vector3(),area:0,triangles:[],neighbors:new Set(),bounds:[Math.min(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[1]))]});
 }}
 // R150: the local atlas follows the actual new posterior support surfaces.
 // These cells own their footprint before the older overlapping display fans.
 for(const patch of [...(posterior?.patches||[]),...(lateral?.patches||[]),...(biceps?.patches||[]),...(deltoid?.patches||[]),...(sideDelt?.patches||[])]){
  const shapes=[{poly:patch.inner,type:'anatomical crown',crown:true},...patch.outline.map((p,i)=>({poly:[patch.inner[i],patch.inner[(i+1)%patch.outline.length],patch.outline[(i+1)%patch.outline.length],p],type:'attached anatomical return',crown:false}))];
  shapes.forEach((s,i)=>{const poly=s.poly.map(p=>p.slice());if(area(poly)<0)poly.reverse();
   if(poly.some((p,j)=>cross(sub(poly[(j+1)%poly.length],p),sub(poly[(j+2)%poly.length],poly[(j+1)%poly.length]))< -1e-8))throw new Error('Nonconvex posterior cell '+patch.owner+' '+i);
   cells.push({id:patch.planeIds[i],side,owner:patch.owner,type:s.type,poly,crown:s.crown,sum:new Vector3(),sumCenter:new Vector3(),area:0,triangles:[],neighbors:new Set(),bounds:[Math.min(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[1]))]});
  });
 }
 // R148: clipped wedge faces follow the same lower-cap support columns.
 // They are authored from the actual attachment boundary, not a second cage.
 if(insertion){
  const at=a=>insertion.columns.reduce((best,c)=>Math.abs(c.a-a)<Math.abs(best.a-a)?c:best);
  const stations=insertion.path.map(p=>at(p[0]));
  for(let j=0;j<stations.length-1;j++)for(let band=0;band<2;band++){
   const x=stations[j],y=stations[j+1],top=c=>band===0?Math.max(c.hs[0],c.hs[1]-.045):c.hs[2],bottom=c=>band===0?c.hs[2]:c.hs[4];
   const poly=[[x.a,top(x)],[y.a,top(y)],[y.a,bottom(y)],[x.a,bottom(x)]];if(area(poly)<0)poly.reverse();
   const id=`MR_CRYSTAL_DELTOID_INSERTION_${side}_${String(j*2+band+1).padStart(2,'0')}`;
   cells.push({id,side,owner:'DELTOID_INSERTION',type:band===0?'tapered cap wedge':'attached arm return',poly,crown:false,sum:new Vector3(),sumCenter:new Vector3(),area:0,triangles:[],neighbors:new Set(),bounds:[Math.min(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[1]))]});
  }
 }

 function fan(owner,outer,center,scale){
  if(area(outer)<0)outer.reverse();const inner=outer.map(p=>mix(center,p,scale));
  // Four longitudinal crown kites, with independent oblique perimeter returns.
  // Both muscles retain their different taper and apex; no angular grid wraps the arm.
  const shapes=[...Array.from({length:4},(_,i)=>({poly:[inner[i*2],inner[(i*2+1)%8],inner[(i*2+2)%8],center],type:i===3?'insertion crown wedge':'long crown kite'})),...outer.map((p,i)=>({poly:[inner[i],inner[(i+1)%8],outer[(i+1)%8],p],type:'oblique anatomical return'}))];
  shapes.forEach((shape,i)=>{const poly=shape.poly;if(area(poly)<0)poly.reverse();
   if(poly.some((p,j)=>cross(sub(poly[(j+1)%poly.length],p),sub(poly[(j+2)%poly.length],poly[(j+1)%poly.length]))< -1e-8))throw new Error('Nonconvex arm crystal cell '+owner+' '+i);
   const id=`MR_CRYSTAL_${owner}_${side}_FAN_${String(i+1).padStart(2,'0')}`;
   cells.push({id,side,owner,type:shape.type,poly,crown:i<4,sum:new Vector3(),sumCenter:new Vector3(),area:0,triangles:[],neighbors:new Set(),bounds:[Math.min(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[1]))]});
  });
 }
 const nodes=M.arms.authoringMaster.biceps.primaryBelly.rows;
 const bicep=[[nodes[0][1],nodes[0][0]],...nodes.slice(1,-1).map(([h,a,w])=>[a+w,h]),[nodes.at(-1)[1],nodes.at(-1)[0]],...nodes.slice(1,-1).reverse().map(([h,a,w])=>[a-w,h])];
 fan('BICEPS',bicep,[.13,.50],.60);
 fan('TRICEPS',[[2.06,.44],[2.54,.30],[3.30,.26],[4.32,.31],[4.28,.48],[3.78,.64],[2.74,.64],[2.19,.57]],[3.24,.455],.58);
 {const owner='BRACHIALIS',outer=brachialis.outline.map(p=>p.slice()),inner=brachialis.inner.map(p=>p.slice());if(area(outer)<0){outer.reverse();inner.reverse();}
  const shapes=[{poly:inner,type:'small elongated brachialis crown'},...outer.map((p,i)=>({poly:[inner[i],inner[(i+1)%6],outer[(i+1)%6],p],type:'ruled anatomical return'}))];
  shapes.forEach((shape,i)=>{const poly=shape.poly;if(area(poly)<0)poly.reverse();const id=`MR_CRYSTAL_${owner}_${side}_FAN_${String(i+1).padStart(2,'0')}`;cells.push({id,side,owner,type:shape.type,poly,crown:i===0,sum:new Vector3(),sumCenter:new Vector3(),area:0,triangles:[],neighbors:new Set(),bounds:[Math.min(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[1]))]});});
 }

 return cells;
}
function forearmCrystalCells(side,surface,origin){const cells=[];
 // R176: follow the actual R169 oblique elbow-to-radial support. This
 // chart refines face ownership only; it cannot inflate or recut anatomy.
 // Crown polygons below are retained, as are wrist and hinge surfaces.
 if(origin){
  const path=origin.path,at=a=>{let j=0;while(j<path.length-2&&a>path[j+1][0])j++;const x=path[j],y=path[j+1],t=(a-x[0])/(y[0]-x[0]);return[Math.min(origin.jointReturnStartH??Infinity,x[1]+(y[1]-x[1])*t),x[2]+(y[2]-x[2])*t];};
  const angles=[path[0][0],(path[0][0]+path[1][0])/2,path[1][0],(path[1][0]+path[2][0])/2,path[2][0]];
  for(let i=0;i<angles.length-1;i++){
   const a=angles[i],b=angles[i+1],x=at(a),y=at(b),poly=[[a,x[0]],[b,y[0]],[b,y[1]],[a,x[1]]];if(area(poly)<0)poly.reverse();
   if(poly.some((p,j)=>cross(sub(poly[(j+1)%4],p),sub(poly[(j+2)%4],poly[(j+1)%4]))< -1e-8))throw new Error('Nonconvex radial-origin return cell');
   cells.push({id:`MR_CRYSTAL_RADIAL_ORIGIN_${side}_R176_${i+1}`,side,owner:'FOREARM_RADIAL_ORIGIN',type:'long oblique insertion trapezoid',poly,crown:false,sum:new Vector3(),sumCenter:new Vector3(),area:0,triangles:[],neighbors:new Set(),bounds:[a,b,Math.min(x[0],y[0]),Math.max(x[1],y[1])]});
  }
 }

 for(const patch of surface.patches){const shapes=[{poly:patch.inner,type:'elongated forearm crown',crown:true},...patch.outline.map((p,i)=>({poly:[patch.inner[i],patch.inner[(i+1)%patch.outline.length],patch.outline[(i+1)%patch.outline.length],p],type:'forearm insertion return',crown:false}))];
  shapes.forEach((s,i)=>{const poly=s.poly.map(p=>p.slice());if(area(poly)<0)poly.reverse();if(poly.some((p,j)=>cross(sub(poly[(j+1)%poly.length],p),sub(poly[(j+2)%poly.length],poly[(j+1)%poly.length]))< -1e-8))throw new Error('Nonconvex forearm cell '+patch.owner+' '+i);
   cells.push({id:patch.planeIds[i],side,owner:patch.owner,type:s.type,poly,crown:s.crown,sum:new Vector3(),sumCenter:new Vector3(),area:0,triangles:[],neighbors:new Set(),bounds:[Math.min(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[1]))]});
  });
 }return cells;
}
function authorArmCrystalFans(geometry,side){
 const foreSurface=geometry.userData.proximalForearmSurface,ff=foreSurface?.frame,frame=ff?(()=>{const axis=V(ff.axis),front=V(ff.front),outer=V(ff.outer);return{axis,front,outer,length:ff.length,project:p=>{let a=Math.atan2(p.dot(outer),p.dot(front));if(a<-.5)a+=Math.PI*2;return[a,p.dot(axis)/ff.length];}};})():armCrystalChart(side),cells=foreSurface?forearmCrystalCells(side,foreSurface,geometry.userData.forearmOriginSupport):armCrystalCells(side,geometry.userData.deltoidInsertionSurface,geometry.userData.posteriorArmFaces,geometry.userData.lateralTricepsSurface,geometry.userData.brachialisPrimaryFace,geometry.userData.anteriorBicepsSurface,geometry.userData.anteriorDeltoidSurface,geometry.userData.lateralDeltoidSurface,geometry.userData.deltoidBrachialisHandoff,geometry.userData.bicepsBrachialisInterface,geometry.userData.brachialisTricepsInterface,geometry.userData.distalTricepsTendon),oldOwners=geometry.userData.__crystalOwners,newOwners=[],p=geometry.attributes.position,attrs=Object.entries(geometry.attributes),output=Object.fromEntries(attrs.map(([name])=>[name,[]]));
 if(geometry.index)throw new Error('Crystal fan source must be the retained expanded surface');
 const stock=geometry.attributes.aSmooth;let triangles=0,affectedSource=0,maxSupportError=0,subUlpDiscarded=0;
 function evaluate(w,vs){return w.reduce((v,k,i)=>v.addScaledVector(vs[i],k),new Vector3());}
 function cut(poly,d){const inside=[],outside=[];for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=a.reduce((s,v,j)=>s+v*d[j],0),db=b.reduce((s,v,j)=>s+v*d[j],0);
  if(da>=0)inside.push(a);if(da<=0)outside.push(a);
  if((da>0&&db<0)||(da<0&&db>0)){const q=mix(a,b,da/(da-db));inside.push(q);outside.push(q);}
 }return {inside,outside};}
 function carve(poly,cell,vs){let inside=poly;const outside=[];
  for(let k=0;k<cell.poly.length;k++){const a=cell.poly[k],edge=sub(cell.poly[(k+1)%cell.poly.length],a),d=vs.map(p=>cross(edge,sub(frame.project(p),a))),r=cut(inside,d);if(r.outside.length>=3)outside.push(r.outside);inside=r.inside;if(inside.length<3)break;}
  return {inside,outside};
 }
 function emit(poly,cell,first,vs){for(let t=1;t<poly.length-1;t++){
  const weights=[poly[0],poly[t],poly[t+1]],points=weights.map(w=>evaluate(w,vs));
  // Collinear clipping vertices have no surface area. Quantizing them first
  // can manufacture a reversed Float32 sliver; reject before quantization.
  const doubleN=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));if(doubleN.lengthSq()<1e-24)continue;
  const fp=points.map(v=>new Vector3(...v.toArray().map(Math.fround))),n=fp[1].clone().sub(fp[0]).cross(fp[2].clone().sub(fp[0]));if(n.lengthSq()<=1e-32)continue;
  const sourceN=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).normalize();if(!crystalTriangleWinds(points,fp,sourceN)){subUlpDiscarded++;continue;}const a=n.length()*.5,start=triangles++*3;newOwners.push(cell?.id||oldOwners[first/3]);
  if(cell){cell.sum.add(n);cell.sumCenter.addScaledVector(points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3),a);cell.area+=a;cell.triangles.push(start);}
  for(let j=0;j<3;j++){
   const w=weights[j];maxSupportError=Math.max(maxSupportError,Math.abs(points[j].clone().sub(vs[0]).dot(sourceN)));
   for(const [name,attr]of attrs){let value=Array.from({length:attr.itemSize},(_,k)=>w.reduce((s,v,i)=>s+v*attr.array[(first+i)*attr.itemSize+k],0));
    if(['normal','aSmooth','aMoldNormal','aCrystalNormal'].includes(name))value=new Vector3(...value).normalize().toArray();
    if(name==='aBary'){const perimeter=points[0].distanceTo(points[1])+points[1].distanceTo(points[2])+points[2].distanceTo(points[0]);value=[j===0?1:0,j===1?1:0,j===2?1:0,2*a/perimeter];}
    output[name].push(...value);
   }
  }
 }}
 for(let i=0;i<p.count;i+=3){
  const vs=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j)),uv=vs.map(frame.project),xs=uv.map(q=>q[0]),ys=uv.map(q=>q[1]);
  const candidates=Math.max(...xs)-Math.min(...xs)<Math.PI?cells.filter(c=>Math.max(...xs)>=c.bounds[0]&&Math.min(...xs)<=c.bounds[1]&&Math.max(...ys)>=c.bounds[2]&&Math.min(...ys)<=c.bounds[3]):[];
  if(!candidates.length){for(const [name,a]of attrs)for(let j=0;j<3;j++)for(let k=0;k<a.itemSize;k++)output[name].push(a.array[(i+j)*a.itemSize+k]);newOwners.push(oldOwners[i/3]);triangles++;continue;}
  affectedSource++;let remaining=[[[1,0,0],[0,1,0],[0,0,1]]];
  for(const c of candidates){const next=[];for(const poly of remaining){const pieces=carve(poly,c,vs);if(pieces.inside.length>=3)emit(pieces.inside,c,i,vs);next.push(...pieces.outside);}remaining=next;if(!remaining.length)break;}
  for(const poly of remaining)emit(poly,null,i,vs);
 }
 for(const [name,a]of attrs)geometry.setAttribute(name,new Float32BufferAttribute(output[name],a.itemSize,a.normalized));
 const n=geometry.attributes.normal,sm=geometry.attributes.aSmooth,facet=geometry.attributes.aFacet,coat=geometry.attributes.aCoat;
 for(const c of cells){if(!c.area)continue;c.normal=c.sum.normalize();c.centroid=c.sumCenter.multiplyScalar(1/c.area);
  // Facing is derived from this cell's actual surface, not from a camera light.
  // Quiet convexity remains inside a face; strong pre-existing valley walls
  // retain more of their geometric normal than broad crowns do.
  const exposure=new Vector3(c.normal.x*(c.side==='R'?-1:1),c.normal.y,c.normal.z).dot(new Vector3(.32,.72,.62).normalize());
  c.opticalFamily=exposure>.63?'platinum':exposure>.08?'graphite':'obsidian';
  const optical=c.opticalFamily==='platinum'?[-.045,.14,.025,.06]:c.opticalFamily==='graphite'?[.015,.02,.27,.14]:[.035,-.08,.50,.10];
  for(const first of c.triangles)for(let j=0;j<3;j++){const i=first+j,base=new Vector3().fromBufferAttribute(sm,i),dot=base.dot(c.normal),blend=.96*Math.max(0,Math.min(1,(dot-.58)/.32)),v=base.lerp(c.normal,blend).normalize();n.setXYZ(i,v.x,v.y,v.z);facet.setXYZW(i,...optical);coat.setX(i,c.opticalFamily==='platinum'?.72:.12);}
 }
 geometry.setAttribute('aCrystalNormal',n);n.needsUpdate=facet.needsUpdate=coat.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();
 // Design adjacency is exact in the common surface chart, independent of the
 // incidental implementation triangulation. Outer boundary has legacy neighbors.
 for(const a of cells)for(const b of cells){if(a===b||a.side!==b.side||a.owner!==b.owner)continue;let shared=0;for(const p of a.poly)if(b.poly.some(q=>Math.hypot(...sub(p,q))<1e-6))shared++;if(shared>=2)a.neighbors.add(b.id);}
 const records=cells.filter(c=>c.area).map(c=>({id:c.id,mirroredId:c.id.replace('_'+c.side+'_','_'+(c.side==='L'?'R':'L')+'_'),side:c.side,anatomicalOwner:c.owner,type:c.type,...(foreSurface?{boundaryForearmAngleH:c.poly}:{boundaryHumeralAngleH:c.poly}),apexDirection:frame.axis.toArray(),centerPosition:c.centroid.toArray(),averageNormal:c.normal.toArray(),surfaceArea:c.area,triangleCount:c.triangles.length,adjacentPlanes:[...c.neighbors],adjacencyBasis:'exact shared authored cell-chart edges; outside legacy adjacency unverified',opticalFamily:c.opticalFamily,status:'PARTIAL explicit crown/return face cell on preserved surface'}));
 // Preserve and recount every legacy face left outside the new footprints.
 // No old record is discarded merely because it shares a muscle name.
 const byId=new Map(geometry.userData.crystalPlaneAtlas.map(r=>[r.id,{...r,triangleCount:0,surfaceArea:0,center:new Vector3(),sum:new Vector3()}]));
 const pos=geometry.attributes.position;
 for(let t=0;t<newOwners.length;t++){const r=byId.get(newOwners[t]);if(!r)continue;const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(pos,t*3+j)),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),a=n.length()*.5;r.triangleCount++;r.surfaceArea+=a;r.sum.add(n);r.center.addScaledVector(v[0].clone().add(v[1]).add(v[2]),a/3);}
 const remaining=[...byId.values()].filter(r=>r.triangleCount).map(({center,sum,...r})=>({...r,centerPosition:center.multiplyScalar(1/r.surfaceArea).toArray(),averageNormal:sum.normalize().toArray(),status:'PARTIAL retained legacy face outside new biceps/triceps fans; coverage recounted'}));
 geometry.userData.crystalPlaneAtlas=remaining.concat(records);delete geometry.userData.__crystalOwners;
 geometry.userData[foreSurface?'crystalForearmFans':'crystalArmFans']={subUlpDiscarded,version:'R146',source:'original large male clay shoulder/arm and blue/platinum male three-quarter reference',frame:{origin:foreSurface?'actual elbow local origin':'actual shoulder local origin',axis:frame.axis.toArray(),front:frame.front.toArray(),outer:frame.outer.toArray(),length:frame.length,coordinates:foreSurface?'angle around palm/thumb, h along elbow-to-wrist forearm axis':'angle in radians around projected front/outward, h along extended retained humeral axis'},representation:'explicit diamond crown and return polygons on retained source triangles',sourceTriangles:p.count/3,finalTriangles:triangles,addedTriangles:triangles-p.count/3,affectedSourceTriangles:affectedSource,maxBarycentricSupportError:maxSupportError,cells:records};
 geometry.userData.crystallization={...geometry.userData.crystallization,version:'R146',totalTriangles:triangles,coveredTriangles:triangles,trianglesAdded:geometry.userData.crystallization.trianglesAdded+triangles-p.count/3};
 return records;
}

// A clipped polygon can leave a sliver smaller than one Float32 position ULP.
// Quantizing such a sliver can reverse its orientation. Reject only those
// numerically unresolvable pieces; a resolvable reversed surface is an error.
function crystalTriangleWinds(points,fp,sourceNormal){
 const fn=fp[1].clone().sub(fp[0]).cross(fp[2].clone().sub(fp[0]));if(fn.dot(sourceNormal)>0)return true;
 const dn=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
 const edge=Math.max(points[0].distanceTo(points[1]),points[1].distanceTo(points[2]),points[2].distanceTo(points[0]));
 const magnitude=Math.max(...points.flatMap(p=>p.toArray().map(Math.abs))),ulp=Math.pow(2,Math.floor(Math.log2(Math.max(magnitude,1e-30)))-23);
 if(dn.length()>8*ulp*edge)throw new Error('Resolved crystal triangle reversed: '+dn.length());
 return false;
}

// R147: the crystal atlas must not average across opposite anatomical walls.
// Reuse the authored R146 surface rows: same rest frame, floors and endpoint
// fades. Only shade the existing returns with their resolved surface normals.
// Crowns, positions, facet masks, topology and the production light are fixed.
function protectArmReturnNormals(geometry,side){
 const surface=geometry.userData.armOwnershipSurface;if(!surface)return;
 const {frame,rows,capRows}=surface,axis=V(frame.axis),front=V(frame.front),outer=V(frame.outer);
 const p=geometry.attributes.position,n=geometry.attributes.normal,sm=geometry.attributes.aSmooth;
 const smooth=(lo,hi,x)=>{const t=clamp((x-lo)/(hi-lo));return t*t*(3-2*t);};
 const interpolate=(list,h)=>{let j=0;while(j<list.length-2&&h>list[j+1].h)j++;return [list[j],list[j+1],clamp((h-list[j].h)/(list[j+1].h-list[j].h))];};
 const mix=(a,b,t)=>a+(b-a)*t;
 const ids=['BICEPS_BRACHIALIS','BRACHIALIS_TRICEPS','FRONT_SIDE_DELTOID','SIDE_REAR_DELTOID'];
 const insertion=geometry.userData.deltoidInsertionSurface;if(insertion)ids.push('DELTOID_ARM_INSERTION');
 const regions=ids.map(id=>({id:`MR_RETURN_${side}_${id}`,mirroredId:`MR_RETURN_${side==='L'?'R':'L'}_${id}`,side,anatomicalBoundary:id,affectedVertices:0,maxNormalTurnRadians:0,positionDisplacement:0,source:'armOwnershipSurface immutable control rows; R146 retained walls',status:'PARTIAL normal preservation; not new geometry or approved anatomy'}));
 let affected=0;
 for(let i=0;i<p.count;i++){
  const v=new Vector3().fromBufferAttribute(p,i),h=v.dot(axis)/frame.length,a=Math.atan2(v.dot(outer),v.dot(front));let weights=ids.map(()=>0);
  if(h>rows[0].h&&h<rows.at(-1).h){
   const [x,y,t]=interpolate(rows,h),fade=smooth(.32,.42,h)*(1-smooth(.70,.79,h));
   for(const [k,lo,hi]of [[0,2,5],[1,7,10]]){
    const l=mix(x.angles[lo],y.angles[lo],t),r=mix(x.angles[hi],y.angles[hi],t),q=(a-l)/(r-l);
    weights[k]=fade*smooth(0,.18,q)*(1-smooth(.82,1,q));
   }
  }
  if(h>capRows[0].h&&h<capRows.at(-1).h){
   const [x,y,t]=interpolate(capRows,h),fade=smooth(-.19,-.09,h)*(1-smooth(.10,.21,h));
   for(let k=0;k<2;k++){
    const lo=mix(x.cs[k].lo,y.cs[k].lo,t),hi=mix(x.cs[k].hi,y.cs[k].hi,t),q=(a-lo)/(hi-lo);
    weights[k+2]=fade*smooth(0,.18,q)*(1-smooth(.82,1,q));
   }
  }
  if(insertion&&a>insertion.columns[0].a&&a<insertion.columns.at(-1).a){
   const list=insertion.columns;let j=0;while(j<list.length-2&&a>list[j+1].a)j++;const x=list[j],y=list[j+1],t=(a-x.a)/(y.a-x.a),end=mix(x.end,y.end,t),lo=end-.055,hi=Math.min(.403,end+.065);
   const q=(h-lo)/(hi-lo);weights[4]=smooth(0,.25,q)*(1-smooth(.75,1,q))*smooth(.28,.46,a)*(1-smooth(2.76,2.96,a))*smooth(.038,.060,Math.abs(h-.425));
  }
  const w=Math.max(...weights);if(w<=0)continue;
  const before=new Vector3().fromBufferAttribute(n,i),base=new Vector3().fromBufferAttribute(sm,i),after=before.clone().lerp(base,w).normalize();
  n.setXYZ(i,after.x,after.y,after.z);affected++;
  const turn=before.angleTo(after);weights.forEach((w,k)=>{if(w>0){regions[k].affectedVertices++;regions[k].maxNormalTurnRadians=Math.max(regions[k].maxNormalTurnRadians,turn);}});
 }
 n.needsUpdate=true;geometry.setAttribute('aCrystalNormal',n);
 geometry.userData.armReturnNormals={version:'R148',frame,method:'bounded preservation of actual smooth surface normals at authored floors and asymmetric walls; crystal crowns untouched',affectedVertices:affected,positionsChanged:0,trianglesAdded:0,regions};
 for(const face of geometry.userData.crystalPlaneAtlas){
  if(!['BICEPS','TRICEPS','BRACHIALIS','DELTOID'].some(owner=>face.anatomicalOwner?.includes(owner)))continue;
  face.returnNormalPolicy='R147 local anatomical wall normals override average crystal normals; see armReturnNormals';
 }
}

// R178: the shared elbow envelope owns normals at the overlap.
// This is a rendering diagnostic over R177's verified contact geometry.
// Protect every crown and the radial return outside this short junction.
function protectElbowContactNormals(group){
 const upper=group.getObjectByName('arm-right-upper')?.geometry,fore=group.getObjectByName('arm-right-fore')?.geometry,fit=upper?.userData.elbowOverlapSeating,origin=fore?.userData.forearmOriginSupport;
 if(!fit||!origin)return;
 const axis=V(fit.axis),offset=V(fit.elbowOffset),front=V(origin.frame.front),outer=V(origin.frame.outer),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
 for(const[g,shift]of [[upper,offset],[fore,new Vector3()]]){
  const p=g.attributes.position,n=g.attributes.normal,sm=g.attributes.aSmooth;let affected=0,maxTurn=0;
  for(let i=0;i<p.count;i++){
   const q=new Vector3().fromBufferAttribute(p,i).sub(shift),h=q.dot(axis),a=Math.atan2(q.dot(outer),q.dot(front));
   const w=smooth(-.025,-.012,h)*(1-smooth(.003,.018,h))*smooth(-.25,-.10,a)*(1-smooth(1.10,1.25,a));if(w<=0)continue;
   const before=new Vector3().fromBufferAttribute(n,i),after=before.clone().lerp(new Vector3().fromBufferAttribute(sm,i),w).normalize();
   maxTurn=Math.max(maxTurn,before.angleTo(after));n.setXYZ(i,after.x,after.y,after.z);affected++;
  }
  n.needsUpdate=true;g.setAttribute('aCrystalNormal',n);g.userData.elbowContactNormalPolicy={version:'R178',affectedVertices:affected,maxTurnRadians:maxTurn,positionDisplacement:0,axis:axis.toArray(),axialSupport:[-.025,.018],angleSupport:[-.25,1.25],method:'bounded return to retained common elbow-envelope normals; broad muscle/forearm crowns fixed',status:'PARTIAL local joint-normal ownership; geometry and crown directions preserved'};
 }
}
