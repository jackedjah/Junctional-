import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};

// Additional roundness follows the retained named bellies. Boundaries return
// with zero displacement and slope, preserving existing separating valleys.
// These are deformations of one skin, never spheres or extra muscle objects.
export const ROUNDNESS_M14=[
 {name:'latissimus',front:false,x:.194,y:1.938,rx:.113,ry:.173,depth:.018,slope:.44},
 {name:'infraspinatus',front:false,x:.184,y:2.064,rx:.088,ry:.065,depth:.012,slope:-.24},
 {name:'teres major',front:false,x:.265,y:2.015,rx:.061,ry:.049,depth:.010,slope:.20},
 {name:'lower trapezius',front:false,x:.074,y:2.002,rx:.043,ry:.127,depth:.010,slope:.27},
 {name:'erector spinae',front:false,x:.060,y:1.775,rx:.034,ry:.178,depth:.012,slope:.035},
 {name:'rectus upper',front:true,x:.071,y:1.797,rx:.059,ry:.055,depth:.010,slope:.07},
 {name:'rectus middle',front:true,x:.067,y:1.691,rx:.057,ry:.055,depth:.010,slope:.04},
 {name:'rectus lower',front:true,x:.061,y:1.612,rx:.049,ry:.035,depth:.007,slope:.06},
 {name:'gluteus maximus',front:false,x:.180,y:1.335,rx:.143,ry:.139,depth:.014,slope:0},
 {name:'gluteus medius',front:false,x:.278,y:1.444,rx:.062,ry:.077,depth:.009,slope:-.13},
 {name:'biceps femoris',front:false,x:.239,y:1.045,rx:.062,ry:.210,depth:.020,slope:.27},
 {name:'semitendinosus',front:false,x:.100,y:1.041,rx:.048,ry:.204,depth:.016,slope:.13},
 {name:'gastrocnemius medial',front:false,x:.066,y:.660,rx:.041,ry:.168,depth:.012,slope:.14},
 {name:'gastrocnemius lateral',front:false,x:.150,y:.746,rx:.044,ry:.156,depth:.010,slope:.24},
 {name:'rectus femoris',front:true,x:.208,y:1.180,rx:.089,ry:.238,depth:.024,slope:.29},
 {name:'vastus lateralis',front:true,x:.305,y:1.194,rx:.076,ry:.219,depth:.018,slope:.30},
 {name:'vastus medialis',front:true,x:.092,y:.945,rx:.049,ry:.118,depth:.017,slope:.16}
];
export function roundMrsBodyM14(g){
 const p=g.attributes.position,edited=new Uint8Array(p.count),regions={};let changed=0,maxMove=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y<=.45||y>=2.14||Math.abs(z)<=.035)continue;
  // Keep the established narrow waist band and the central spinal/abdominal
  // line, rather than merging opposed bellies into a single round column.
  if(y>=1.52&&y<=1.57)continue;
  let move=0;
  for(const m of ROUNDNESS_M14){if(m.front!==(z>0))continue;
   const u=(Math.abs(x)-m.x-(y-m.y)*m.slope)/m.rx,v=(y-m.y)/m.ry,q=u*u+v*v;if(q>=1)continue;
   const d=m.depth*(1-q)**2*ease((Math.abs(z)-.035)/.065)*ease((Math.abs(x)-.015)/.025);
   move+=d;regions[m.name]??={corners:0,maxContribution:0};regions[m.name].corners++;regions[m.name].maxContribution=Math.max(regions[m.name].maxContribution,d);
  }
  if(move<=1e-10)continue;p.setZ(i,z+Math.sign(z)*move);edited[i]=1;changed++;maxMove=Math.max(maxMove,move);
 }
 updateMuscleNormals(g,edited,{angleWeighted:true});
 g.userData.mrsBodyRoundnessM14={version:'R166-M14-A',changedCorners:changed,maxMove,regions,fields:ROUNDNESS_M14,
  method:'Anisotropic bilateral belly crowns with zero-slope insertion returns on the retained continuous skin',
  protected:'Every X/Y; waist band 1.52..1.57; terminal y<=.45; neck/shoulder y>=2.14; central line; all non-torso meshes',
  status:'Body-roundness candidate pending five-view clay and preservation checks'};
 return g;
}
