import {Vector3,Quaternion,Matrix3,Matrix4} from '../../vendor/three/three.module.min.js';

// M95: a reversible presentation pose over the retained anatomical master.
// Bone lengths and neutral plane indices stay untouched. A cached shoulder
// skin delta restores its authoring buffers exactly on returning to neutral.
// This is a pose preset, not a claim of deformation-rig closure.
export function createMrsHeroPose({body,head,limbs,handSpec}){
 const up=new Vector3(0,1,0),front=new Vector3(0,0,1),rad=Math.PI/180;
 const arm=limbs.left;
 const nodes=[body.group,head.group,limbs.group,...['left','right'].flatMap(s=>[
  limbs[s].shoulderJoint,limbs[s].elbowJoint,limbs[s].wristJoint]),arm.crystal.plate,arm.crystal.glow];
 if(limbs.handLamp)nodes.push(limbs.handLamp);
 const rest=nodes.map(node=>({node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()}));
 const base=node=>rest.find(r=>r.node===node);
 const restore=()=>rest.forEach(r=>{r.node.position.copy(r.position);r.node.quaternion.copy(r.quaternion);r.node.scale.copy(r.scale);});
 let active='neutral';
 const upper=base(arm.elbowJoint).position.clone(),fore=base(arm.wristJoint).position.clone();
 const shoulder=base(arm.shoulderJoint).position.clone();
 const upperLength=upper.length(),foreLength=fore.length();
 // Solve the existing two-bone chain toward a chest-height hand target.
 // The outward/down pole keeps the elbow outside the ribcage, without
 // translating the shoulder seat or lengthening either bone.
 const wristTarget=new Vector3(1.00,1.88,.30);
 const delta=wristTarget.clone().sub(shoulder),distance=delta.length(),aim=delta.clone().normalize();
 if(distance>=upperLength+foreLength||distance<=Math.abs(upperLength-foreLength))throw new Error('Mrs. hero wrist target is unreachable');
 const along=(upperLength**2-foreLength**2+distance**2)/(2*distance);
 const poleHint=new Vector3(.25,-1.25,.10);
 const pole=poleHint.clone().addScaledVector(aim,-poleHint.dot(aim)).normalize();
 const elbow=shoulder.clone().addScaledVector(aim,along).addScaledVector(pole,Math.sqrt(upperLength**2-along**2));
 const upperDirection=elbow.clone().sub(shoulder).normalize(),foreDirection=wristTarget.clone().sub(elbow).normalize();
 const shoulderQ=new Quaternion().setFromUnitVectors(upper.clone().normalize(),upperDirection);
 const foreQ=new Quaternion().setFromUnitVectors(fore.clone().normalize(),foreDirection);
 const neutralPalm=front.clone().applyQuaternion(base(arm.wristJoint).quaternion);
 const movedPalm=neutralPalm.clone().applyQuaternion(foreQ);
 const desiredPalm=up.clone().addScaledVector(foreDirection,-up.dot(foreDirection)).normalize();
 const twist=Math.atan2(foreDirection.dot(movedPalm.clone().cross(desiredPalm)),movedPalm.dot(desiredPalm));
 foreQ.premultiply(new Quaternion().setFromAxisAngle(foreDirection,twist));
 const elbowQ=shoulderQ.clone().invert().multiply(foreQ);
 // Keep the proximal deltoid seated on the torso. Rigid shoulder rotation
 // exposed its buried root; blend that root from the original seated frame
 // into the raised arm over the deltoid, before the biceps begins.
 const upperMesh=arm.group.getObjectByName('arm-left-upper');
 const axis=upper.clone().normalize(),positions=upperMesh.geometry.attributes.position;
 let lo=Infinity,hi=-Infinity;
 for(let i=0;i<positions.count;i++){const t=new Vector3().fromBufferAttribute(positions,i).dot(axis);lo=Math.min(lo,t);hi=Math.max(hi,t);}
 const seatQ=shoulderQ.clone().invert().multiply(base(arm.shoulderJoint).quaternion);
 const seatMatrix=new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromQuaternion(seatQ));
 const unionFrame=upperMesh.geometry.userData.shoulderUnion?.poseFrame;
 if(unionFrame){lo=unionFrame.lo;hi=unionFrame.hi;}
 const blendStart=unionFrame?.start??.10,blendEnd=unionFrame?.end??.46;
 const length=hi-lo,skins=[];let minDeterminant=Infinity,seatedVertices=0;
 const deform=v=>{
  const t=(v.dot(axis)-lo)/length,u=Math.max(0,Math.min(1,(t-blendStart)/(blendEnd-blendStart)));
  const weight=u*u*(3-2*u),derivative=u>0&&u<1?6*u*(1-u)/((blendEnd-blendStart)*length):0;
  const seated=v.clone().applyQuaternion(seatQ),difference=v.clone().sub(seated);
  const j=seatMatrix.clone(),e=j.elements;
  for(let column=0;column<3;column++)for(let row=0;row<3;row++){
   const k=column*3+row;
   e[k]=e[k]*(1-weight)+(row===column?weight:0)+difference.getComponent(row)*axis.getComponent(column)*derivative;
  }
  const det=j.determinant();minDeterminant=Math.min(minDeterminant,det);
  if(det<.20)throw new Error('Mrs. hero shoulder skin folds');
  return {position:seated.lerp(v,weight),normal:j.invert().transpose(),seated:weight===0};
 };
 const siblings=upperMesh.parent.children,start=siblings.indexOf(upperMesh);
 for(const object of [upperMesh,...siblings.slice(start+1,start+3).filter(o=>o.isLineSegments)]){
  const g=object.geometry,p=g.attributes.position,entries=new Map();
  for(const name of ['position','normal','aSmooth','aMoldNormal','aCrystalNormal','aPhysicalNormal']){
   const attr=g.attributes[name];if(attr&&!entries.has(attr))entries.set(attr,{attr,original:attr.array.slice(),posed:attr.array.slice(),name});
  }
  for(let i=0;i<p.count;i++){
   const fit=deform(new Vector3().fromBufferAttribute(p,i));if(object===upperMesh&&fit.seated)seatedVertices++;
   for(const record of entries.values()){
    const value=record.name==='position'?fit.position:new Vector3().fromBufferAttribute(record.attr,i).applyMatrix3(fit.normal).normalize();
    value.toArray(record.posed,i*3);
   }
  }
  if(object===upperMesh){
   const posed=entries.get(p).posed;
   for(let i=0;i<p.count;i+=3){
    const v=[0,1,2].map(k=>new Vector3().fromArray(posed,(i+k)*3));
    const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
    for(const record of entries.values())if(record.name==='normal'||record.name==='aPhysicalNormal')
     for(let k=0;k<3;k++)normal.toArray(record.posed,(i+k)*3);
   }
  }
  skins.push({g,entries:[...entries.values()]});
 }
 const applySkin=hero=>skins.forEach(({g,entries})=>{
  entries.forEach(r=>{r.attr.array.set(hero?r.posed:r.original);r.attr.needsUpdate=true;});
  g.computeBoundingBox();g.computeBoundingSphere();
 });
 // Fifteen degrees of wrist extension, with the forearm's supination doing
 // the palm orientation. Do not fold the wrist 90 degrees to fake palm-up.
 const horizontal=foreDirection.clone().addScaledVector(up,-foreDirection.y).normalize();
 const turnAxis=foreDirection.clone().cross(horizontal).normalize();
 const finger=foreDirection.clone().applyAxisAngle(turnAxis,15*rad);
 const palm=up.clone().addScaledVector(finger,-finger.y).normalize();
 const across=finger.clone().cross(palm).normalize();
 const handQ=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(across,finger,palm));
 const wristQ=foreQ.clone().invert().multiply(handQ);
 const lean=new Quaternion();
 const palmLocal=new Vector3(0,handSpec.palmLength*.52,handSpec.palmHalfDepth);
 const palmCenter=palmLocal.clone().applyQuaternion(handQ).add(wristTarget);
 const handLength=handSpec.palmLength+handSpec.digitLength;
 // A palm-only offset can put the crystal's tip among the raised fingers.
 // Bound its lowest point against the actual posed hand, not a guessed
 // finger length; retain a minimum palm clearance and a visible finger gap.
 const handPositions=arm.hand.getObjectByName('hand-solid').geometry.attributes.position;
 let handTop=-Infinity;
 for(let i=0;i<handPositions.count;i++)handTop=Math.max(handTop,new Vector3().fromBufferAttribute(handPositions,i).applyQuaternion(handQ).add(wristTarget).y);
 const fingerGap=.12*handLength;
 const diamondGap=Math.max(.28*handLength,handTop+fingerGap-palmCenter.y);
 const diamondCenter=palmCenter.clone().addScaledVector(up,handSpec.tipDiamond+diamondGap);
 const diamondLocal=diamondCenter.clone().sub(wristTarget).applyQuaternion(handQ.clone().invert());
 const angles={upperAbduction:Math.atan2(Math.abs(upperDirection.x),-upperDirection.y)/rad,
  upperFlexion:Math.atan2(upperDirection.z,-upperDirection.y)/rad,
  elbowFlexion:upperDirection.angleTo(foreDirection)/rad,
  forearmTwist:twist/rad,wristExtension:15,palmUpDot:palm.y};
 const diagnostics={version:'M95-organic-upright',source:'Retained neutral and M95 arm pose',globalPosteriorLeanDegrees:0,
  thoracicExtensionDegrees:0,shoulderTranslation:[0,0,0],upperLength,foreLength,
  wristTarget:wristTarget.toArray(),elbowTarget:elbow.toArray(),palmCenter:palmCenter.toArray(),
  diamondGap,diamondGapHandLengths:diamondGap/handLength,minimumPalmGapHandLengths:.28,
  posedHandTop:handTop,diamondFingerGap:palmCenter.y+diamondGap-handTop,minimumFingerGap:fingerGap,angles,
  shoulderSkin:{startT:blendStart,endT:blendEnd,seatedVertexCopies:seatedVertices,minimumJacobianDeterminant:minDeterminant,method:'seated proximal frame to posed deltoid; inverse-transpose normal transport; exact neutral buffer restore'},
  limits:'Chest-height IK target and neutral recovery validated separately. No spine skinning or finger deformation added.'};
 const apply=()=>{
  if(active!=='hero')return;
  restore();
  for(const group of [body.group,head.group,limbs.group]){
   group.position.applyQuaternion(lean);group.quaternion.premultiply(lean);
  }
  arm.shoulderJoint.quaternion.copy(shoulderQ);
  arm.elbowJoint.quaternion.copy(elbowQ);
  arm.wristJoint.quaternion.copy(wristQ);
  for(const mesh of [arm.crystal.plate,arm.crystal.glow]){
   mesh.position.copy(diamondLocal);mesh.quaternion.copy(handQ).invert();
  }
  if(limbs.handLamp)limbs.handLamp.position.copy(diamondLocal);
 };
 return {names:['neutral','hero'],diagnostics,apply,get:()=>active,
  set(name){if(!['neutral','hero'].includes(name))throw new Error('Unknown Mrs. Mah pose: '+name);
   if(active==='hero')restore();active=name;applySkin(active==='hero');if(active==='hero')apply();return active;},
  dispose(){restore();applySkin(false);active='neutral';}};
}
