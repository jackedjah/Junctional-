import {updateMuscleNormals} from './mrs-body-muscle-volumes.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// Extend the retained neck skin into the existing lower cranial volume.
// This modifies the original neck, never a separate collar or cover mesh.
export function continueMrsNeckIntoCranium(g){
 const p=g.attributes.position,edited=new Uint8Array(p.count);let changedCorners=0,maximumRise=0,shoulderCorners=0,maximumShoulderDrop=0,maximumShoulderExtension=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const shoulder=ease((Math.abs(x)-.28)/.115)*ease((y-2.005)/.095)*(1-ease((y-2.16)/.045))*(1-ease((Math.abs(z)-.09)/.09));
  if(shoulder>0){
   const drop=.027*shoulder,extension=.022*shoulder;
   p.setX(i,x+Math.sign(x)*extension);p.setY(i,y-drop);edited[i]=1;shoulderCorners++;
   maximumShoulderDrop=Math.max(maximumShoulderDrop,drop);maximumShoulderExtension=Math.max(maximumShoulderExtension,extension);
  }
  if(y<=2.22)continue;
  const w=ease((y-2.22)/.115),rise=.080*w,posterior=(.057+.30*(p.getZ(i)+.073))*w;
  p.setY(i,y+rise);p.setZ(i,p.getZ(i)-posterior);edited[i]=1;changedCorners++;maximumRise=Math.max(maximumRise,rise);
 }
 updateMuscleNormals(g,edited,{angleWeighted:true});
 g.userData.mrsNeckContinuityM09={version:'R166-M09-D',changedCorners,maximumRise,minimumY:2.22,
  method:'Monotone axial continuation and posterior routing of retained neck into occipital shell, behind display cavity',
  protected:'Neck X; torso outside neck and narrow shoulder saddle; head shell, face, all arm meshes and other objects',
  status:'Geometric seating candidate; not a welded or skinned export'};
 g.userData.mrsShoulderContinuityM09={version:'R166-M09-D',shoulderCorners,maximumShoulderDrop,maximumShoulderExtension,
  domain:{minimumAbsX:.28,rangeY:[2.005,2.205],maximumAbsZ:.18},
  method:'Local clavicular/scapular saddle continued outward and down to the retained deltoid seat; arms and crowns exact'};return g;
}
