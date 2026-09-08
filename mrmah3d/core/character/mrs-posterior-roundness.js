import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// Rounded crowns return into the same retained skin at zero value and slope.
export const POSTERIOR_M11=[
 {name:'gluteus maximus',x:.18,y:1.333,rx:.157,ry:.181,depth:.033,slope:0},
 {name:'gluteus medius',x:.275,y:1.445,rx:.073,ry:.112,depth:.009,slope:-.13},
 {name:'biceps femoris',x:.239,y:1.045,rx:.078,ry:.237,depth:.014,slope:.27},
 {name:'semitendinosus',x:.10,y:1.040,rx:.060,ry:.240,depth:.011,slope:.13},
 {name:'gastrocnemius medial',x:.066,y:.660,rx:.050,ry:.220,depth:.009,slope:.14},
 {name:'gastrocnemius lateral',x:.150,y:.746,rx:.054,ry:.190,depth:.006,slope:.24}
];
export function roundMrsPosteriorBellies(g){
 const p=g.attributes.position,edited=new Uint8Array(p.count),regions={};let changed=0,maxDepth=0,maxReturn=0,returnCorners=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(z>=0||y<=.4||y>=1.56)continue;
  let depth=0;
  for(const m of POSTERIOR_M11){const u=(Math.abs(x)-m.x-(y-m.y)*m.slope)/m.rx,v=(y-m.y)/m.ry,q=u*u+v*v;
   if(q>=1)continue;const d=m.depth*(1-q)**2*ease((-z-.035)/.065);depth+=d;
   regions[m.name]=regions[m.name]||{changedCorners:0,maximum:0};regions[m.name].changedCorners++;regions[m.name].maximum=Math.max(regions[m.name].maximum,d);
  }
  const ax=Math.abs(x),foldY=1.190+1.8*(ax-.190)**2,foldV=(y-foldY)/.022;
  const fold= Math.abs(foldV)<1 ? .009*(1-foldV*foldV)**2*ease((ax-.045)/.070)*(1-ease((ax-.285)/.065))*ease((-z-.035)/.065):0;
  if(fold>1e-9){returnCorners++;maxReturn=Math.max(maxReturn,fold);}
  if(depth>1e-9||fold>1e-9){p.setZ(i,z-depth+fold);edited[i]=1;changed++;maxDepth=Math.max(maxDepth,depth);}
 }
 updateMuscleNormals(g,edited,{angleWeighted:true});
 g.userData.mrsPosteriorRoundnessM11={version:'R166-M11-B',changedCorners:changed,maximumDepth:maxDepth,maximumFoldReturn:maxReturn,returnCorners,regions,fields:POSTERIOR_M11,protected:'Every X/Y; anterior surface; upper body y>=1.56; terminal y<=.4; arms/head unchanged',method:'Local rounded muscle crowns and narrow curved infragluteal return within continuous posterior skin, with smooth zero-slope insertion returns'};
 return g;
}
