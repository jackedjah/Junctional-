/* R149 / Phase II: reversible presentation deformation, never sculpt data.
 * Neutral geometry remains the source of truth. The hero cache is built once
 * on first use; pose switching swaps geometry and joint rest transforms only.
 */
import {Matrix3,Matrix4,Quaternion,Vector3} from '../../vendor/three/three.module.min.js';
import {HEAD} from './proportions.js';

export const MR_HERO_POSE=Object.freeze({
 id:'MR_GODFORM_HERO_R149',source:'Phase II master sections2–3,7,16; R03 hero authority',
 waistAnchorY:1.60,shoulderY:2.20,thoracicDegrees:4,
 verticalExtension:0.040,shoulderDepression:0.003,
 shoulderRetractionDegrees:6,armDisplayDegrees:3,cervicalDegrees:1.5
});
const D=Math.PI/180,axisX=new Vector3(1,0,0);

// Analytic deformation and Jacobian in the retained body-local frame.
// Everything at/below the waist anchor, including the terminal point, is exact.
export function heroPoseField(v){
 const C=MR_HERO_POSE,q=v.y-C.waistAnchorY;
 if(q<=0)return {point:v.clone(),jacobian:new Matrix3(),angle:0};
 // One affine upper-body support: no changing curvature across tiny clipped
 // crystal triangles. The waist plane is fixed; shoulder display is joint-owned.
 const angle=-C.thoracicDegrees*D,slope=Math.tan(angle);
 const point=new Vector3(v.x,v.y+C.verticalExtension*q,v.z+slope*q);
 const jacobian=new Matrix3().set(
  1,0,0,
  0,1+C.verticalExtension,0,
  0,slope,1
 );
 return {point,jacobian,angle};
}

export function createHeroPresentation(body,limbs,head,rest){
 let mode='neutral',built=false,disposed=false;
 const entries=[],base={headPosition:head.group.position.clone(),headX:rest.headRotX};
 const stats={id:MR_HERO_POSE.id,source:MR_HERO_POSE.source,mode:'neutral',builds:0,
  geometryRegeneratedPerFrame:false,sculptGeometryModified:false,trianglesAdded:0,
  movedVertices:0,maxDisplacement:0,minJacobianDeterminant:Infinity,geometryBytes:0,
  status:'PARTIAL hero presentation; anatomical closure remains independent'};
 body.group.updateMatrixWorld(true);
 const invBody=body.group.matrixWorld.clone().invert();
 body.group.traverse(o=>{
  if(!o.geometry?.attributes.position)return;
  const m=new Matrix4().multiplyMatrices(invBody,o.matrixWorld),inv=m.clone().invert();
  entries.push({o,neutral:o.geometry,neutralFacet:o.geometry.attributes.normal,m,inv,
   normalToBody:new Matrix3().getNormalMatrix(m),normalToLocal:new Matrix3().getNormalMatrix(inv)});
 });
 for(const side of ['left','right'])base[side]={position:limbs[side].shoulderJoint.position.clone(),rotation:rest[side+'Shoulder'].clone()};

 function build(){
  if(built)return;
  try{
  for(const e of entries){
   const g=e.neutral.clone(),p=g.attributes.position,src=e.neutral.attributes.position;
   e.hero=g;
   g.userData={...g.userData};
   const support=e.neutral.userData.heroPoseSupport,maps=new Map(),welds=new Map();
   function parentMap(index){
    const id=support.triangleIds[Math.floor(index/3)];if(maps.has(id))return maps.get(id);
    const a=[0,1,2].map(j=>new Vector3(...support.positions.slice(id*9+j*3,id*9+j*3+3)).applyMatrix4(e.m));
    const z=a.map(v=>heroPoseField(v).point),e1=a[1].clone().sub(a[0]),e2=a[2].clone().sub(a[0]),n=e1.clone().cross(e2).normalize(),f=heroPoseField(a[0].clone().add(a[1]).add(a[2]).multiplyScalar(1/3));
    const columns=(u,v,w)=>new Matrix3().set(u.x,v.x,w.x,u.y,v.y,w.y,u.z,v.z,w.z);
    const jacobian=columns(z[1].clone().sub(z[0]),z[2].clone().sub(z[0]),n.clone().applyMatrix3(f.jacobian)).multiply(columns(e1,e2,n).invert());
    const map={source:a[0],target:z[0],jacobian};maps.set(id,map);return map;
   }
   // Debug clay can swap the neutral normal attribute. Use its stored facing
   // normals as the cache source, independent of the active inspection mode.
   if(e.neutralFacet)g.setAttribute('normal',e.neutralFacet.clone());
   const normals=['normal','aSmooth','aMoldNormal','aCrystalNormal'].filter(n=>g.attributes[n]);
   for(let i=0;i<p.count;i++){
    const local=new Vector3().fromBufferAttribute(src,i),v=local.clone().applyMatrix4(e.m);
    if(v.y<=MR_HERO_POSE.waistAnchorY)continue;
    let f;
    if(support){const a=parentMap(i);f={point:v.clone().sub(a.source).applyMatrix3(a.jacobian).add(a.target),jacobian:a.jacobian};}
    else f=heroPoseField(v);
    const det=f.jacobian.determinant();
    if(!Number.isFinite(det)||det<=.70)throw new Error('Hero pose invalid local Jacobian: '+det);
    stats.minJacobianDeterminant=Math.min(stats.minJacobianDeterminant,det);
    const key=local.x+':'+local.y+':'+local.z;
    let posed=welds.get(key);if(!posed){posed=f.point.applyMatrix4(e.inv);welds.set(key,posed);}
    const distance=posed.distanceTo(local);
    if(distance>1e-9){stats.movedVertices++;stats.maxDisplacement=Math.max(stats.maxDisplacement,distance);}
    p.setXYZ(i,posed.x,posed.y,posed.z);
    const nm=f.jacobian.clone().invert().transpose();
    for(const n of normals){const a=g.attributes[n],v=new Vector3().fromBufferAttribute(a,i).applyMatrix3(e.normalToBody).applyMatrix3(nm).applyMatrix3(e.normalToLocal).normalize();a.setXYZ(i,v.x,v.y,v.z);}
   }
   for(const a of Object.values(g.attributes)){a.needsUpdate=true;stats.geometryBytes+=a.array.byteLength;}
   if(g.index)stats.geometryBytes+=g.index.array.byteLength;
   g.computeBoundingBox();g.computeBoundingSphere();
   g.userData.presentationPose={id:MR_HERO_POSE.id,source:'immutable neutral geometry',restSpaceRegistries:true};
   e.hero=g;e.heroFacet=g.attributes.normal;
  }
  built=true;stats.builds++;
  }catch(error){for(const e of entries){e.hero?.dispose();delete e.hero;delete e.heroFacet;}throw error;}
 }

 function set(next){
  if(next!=='neutral'&&next!=='hero')return mode;
  if(disposed)throw new Error('Presentation controller disposed');
  if(next===mode)return mode;
  if(next==='hero')build();
  mode=next;stats.mode=mode;
  for(const e of entries){
   const g=mode==='hero'?e.hero:e.neutral,facet=mode==='hero'?e.heroFacet:e.neutralFacet;
   e.o.geometry=g;
   if(e.o.userData.__facetNormal){e.o.userData.__facetNormal=facet;g.setAttribute('normal',g.attributes.aSmooth||facet);}
   else if(facet)g.setAttribute('normal',facet);
  }
  for(const side of ['left','right']){
   const b=base[side],joint=limbs[side].shoulderJoint;
   joint.position.copy(mode==='hero'?heroPoseField(b.position).point:b.position);
   if(mode==='hero')joint.position.y=b.position.y-MR_HERO_POSE.shoulderDepression;
   rest[side+'Shoulder'].copy(b.rotation);
   if(mode==='hero'){
    const sign=Math.sign(b.position.x),r=rest[side+'Shoulder'];
    r.x+=heroPoseField(b.position).angle;r.y+=sign*MR_HERO_POSE.shoulderRetractionDegrees*D;r.z+=sign*MR_HERO_POSE.armDisplayDegrees*D;
   }
   joint.rotation.copy(rest[side+'Shoulder']);
  }
  head.group.position.copy(base.headPosition);rest.headRotX=base.headX;
  if(mode==='hero'){
   // Anchor at the lower diamond point so cervical correction cannot open a
   // gap between the rigid head and the posed neck root.
   const anchor=new Vector3(0,HEAD.centreY-HEAD.halfHeight,0),tilt=-MR_HERO_POSE.cervicalDegrees*D;
   head.group.position.copy(heroPoseField(anchor).point).add(base.headPosition.clone().sub(anchor).applyQuaternion(new Quaternion().setFromAxisAngle(axisX,tilt)));
   rest.headRotX+=tilt;
  }
  head.group.rotation.x=rest.headRotX;
  return mode;
 }
 return {set,get:()=>mode,stats,dispose(){
  if(disposed)return;if(mode!=='neutral')set('neutral');
  for(const e of entries)e.hero?.dispose();disposed=true;
 }};
}
