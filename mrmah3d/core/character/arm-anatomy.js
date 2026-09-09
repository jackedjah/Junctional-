/* R110 male arm anatomy. Build-time longitudinal fields retain the existing
   segment topology. d is measured from world-front in each segment frame;
   `inner` fixes handedness. Female geometry does not call these functions. */
import { limbSideDirection, sculptSurfaceRecesses, sculptSurfaceRegion } from './forge.js';
import { MRMAH_MORPHOLOGY, MRMAH_RECESSES } from './proportions.js';
import { Float32BufferAttribute, Vector3, Ray } from '../../vendor/three/three.module.min.js';
function smooth(a, b, x) {
  var q = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return q * q * (3 - 2 * q);
}

/* ARM GENERATIONS.

   Mrs. Mah's regional refiners (`mrs-*.js`) were authored against the arm this
   module built at R166, and they are not tolerant of it moving: they locate
   their control vertices by axial position and ring angle, and throw rather
   than sculpt the wrong ones. Every male arm advance since — the biceps
   footprint taper, the deltoid's insertion narrowing, the section-face wedge
   chart, the angular side-face regions and the brachialis return clamp — is a
   NEW KEY appended to `MRMAH_MORPHOLOGY.arms.planeDesign` (proportions.js),
   never an edit of an R166 value. So the retained arm is exactly this design
   with those keys removed, and `armDesign(true)` returns that view.

   This is a pin, not a fork: one module, one set of functions, two generations
   of the same authored data. Both characters can be built in one page. When
   Mrs. Mah's arms are next re-authored, her proportion set drops `legacyArms`
   and the view goes away. */
var LEGACY_DESIGN = null;
function armDesign(legacy) {
  var D = MRMAH_MORPHOLOGY.arms.planeDesign;
  if (!legacy) return D;
  if (LEGACY_DESIGN && LEGACY_DESIGN.__of === D) return LEGACY_DESIGN;
  var biceps = Object.assign({}, D.biceps); delete biceps.footprintWidth; delete biceps.surface;
  var triceps = Object.assign({}, D.triceps); delete triceps.surface; delete triceps.longSurface;
  var deltoid = Object.assign({}, D.deltoid); delete deltoid.insertionNarrowing;
  var regional = Object.assign({}, D.regionalPlanes);
  delete regional.preserveBrachialisReturns;
  regional.sideFaces = (D.regionalPlanes.sideFaces || []).map(function (f) {
    var g = Object.assign({}, f); delete g.angularRegion; return g;
  });
  LEGACY_DESIGN = Object.assign({}, D, { biceps: biceps, triceps: triceps, deltoid: deltoid,
    regionalPlanes: regional, sectionFaces: undefined, authoringMaster: undefined, __of: D });
  return LEGACY_DESIGN;
}
export function armGeneration(legacy) { return legacy ? 'R166-retained' : 'current'; }
function belly(t, origin, peak, insertion) {
  return smooth(origin, peak, t) * (1 - smooth(peak, insertion, t));
}
function footprintWidth(t,stations,fallback){
  if(!stations)return fallback;
  const w=smooth(.30,.39,t)*(1-smooth(.84,.90,t));
  if(!w)return fallback;
  if(t<=stations[0][0])return fallback+(stations[0][1]-fallback)*w;
  for(let i=1;i<stations.length;i++)if(t<=stations[i][0]){
    const a=stations[i-1],b=stations[i],u=(t-a[0])/(b[0]-a[0]);
    return fallback+(a[1]+(b[1]-a[1])*u-fallback)*w;
  }return fallback+(stations.at(-1)[1]-fallback)*w;
}
// A long belly has a facing interval rather than one spherical axial peak.
// Preserve the integral of the old longitudinal envelope while redistributing
// its relief. This does not enlarge the entire circumference or move anchors.
const crownProfileScales=new Map();
function crownedBelly(t,origin,peak,insertion,span){
  if(!span)return belly(t,origin,peak,insertion);
  const old=belly(t,origin,peak,insertion),weight=smooth(.30,.40,t);
  if(!weight)return old;
  const key=[origin,peak,insertion,...span].join(',');
  if(!crownProfileScales.has(key)){
    let a=0,b=0;
    for(let i=0;i<128;i++){
      const u=origin+(insertion-origin)*(i+.5)/128,w=smooth(.30,.40,u);
      a+=w*belly(u,origin,peak,insertion);
      b+=w*smooth(origin,span[0],u)*(1-smooth(span[1],insertion,u));
    }
    crownProfileScales.set(key,b?a/b:1);
  }
  const next=crownProfileScales.get(key)*smooth(origin,span[0],t)*(1-smooth(span[1],insertion,t));
  return old+(next-old)*weight;
}
function arc(d, centre, width) {
  var q = Math.atan2(Math.sin(d - centre), Math.cos(d - centre)) / width;
  return Math.exp(-q * q);
}
// Broad mildly convex crown with short oblique side turns, in bone-local angle.
function musclePlane(d,centre,width,convexity=.18){
  const q=Math.abs(Math.atan2(Math.sin(d-centre),Math.cos(d-centre)))/width;
  return q>=1?0:(1-convexity*q*q)*(1-smooth(.47,1,q));
}
// Two shallow curved head boundaries, limited to the shoulder territory.
// They converge distally; neither crosses the medial axilla or encircles arm.
function deltoidHeadJunction(h,d,out){
  const distal=smooth(-.20,.18,h),extent=belly(h,-.36,-.035,.26);
  return -.085*extent*(arc(d,out*(.76+.42*distal),.24)
    +arc(d,out*(2.37-.43*distal),.25));
}
// Retained normalized origin/belly/insertion tracks for future fiber treatment.
// Angular values are multiples of the limb's outer-side sign.
export var ARM_FIBER_PATHS = {
  biceps: [[0.08, -0.20], [0.43, -0.10], [0.89, 0.20]],
  brachialis: [[0.34, 1.42], [0.64, 1.32], [0.94, 1.16]],
  brachioradialis: [[0.00, 0.90], [0.30, 0.78], [0.84, 1.18]],
  flexors: [[0.02, -0.64], [0.34, -0.45], [0.92, -0.22]],
  extensors: [[0.02, 2.18], [0.26, 2.28], [0.92, 2.64]]
};
/* Shared proximal humeral envelope. The cap and arm meet tangentially at
   humeral t=0.20. The cap subsequently buries inside the arm; the anatomical
   shoulder field continues on the arm to t=0.46 instead of ending as a sleeve.
   The twelve cap steps span humeral -0.30..0.30, so every second ring coincides
   with an upper-arm ring. Its proximal centreline curves into the clavicle. */
export function maleDeltoid(spec, side, legacy) {
  var u = spec.elbow.map(function (v, i) { return v - spec.shoulder[i]; });
  var f = spec.wrist.map(function (v, i) { return v - spec.elbow[i]; });
  var ul = Math.hypot(u[0], u[1], u[2]), fl = Math.hypot(f[0], f[1], f[2]);
  var bend = Math.max(0, (u[0] * f[0] + u[1] * f[1] + u[2] * f[2]) / (ul * fl));
  u = u.map(function (v) { return v * (1 + 0.06 * bend * bend / ul); });
  var start = spec.shoulder.map(function (v, i) { return v - u[i] * 0.30; });
  var end = spec.shoulder.map(function (v, i) { return v + u[i] * 0.30; });
  var inn = limbSideDirection(start, end)[0] * -side > 0 ? 1 : -1;
  return {
    start: start, end: end, r0: spec.upperRadius, r1: spec.upperRadius, depthRatio: 1.12,
    profile: function (t) {
      var h = -0.30 + 0.60 * t;
      if (h < 0) {
        var crown = 0.02 + 0.98 * Math.pow(Math.sin((h + 0.30) / 0.30 * Math.PI / 2), 0.75);
        return 0.90 * 1.05 * crown;
      }
      var radius = spec.upperRadius + (spec.foreRadius * 1.02 - spec.upperRadius) * h;
      var overlap = 1 + 0.05 * (1 - smooth(0, 0.20, h)) - 0.12 * smooth(0.20, 0.30, h);
      return radius / spec.upperRadius * upperEnvelope(h) * overlap;
    },
    shape: function (t, d) {
      return maleUpperShape(Math.max(0, -0.30 + 0.60 * t), d, inn, legacy);
    },
    centreAt: function (t) {
      var h = -0.30 + 0.60 * t;
      return [-side * 0.14 * (1 - smooth(-0.30, -0.02, h)), 0, 0];
    }
  };
}
/* Profiles establish the bone envelope; angular fields carry muscle mass.
   The upper-arm root is tucked under the cap; its distal value stays 0.76.
   Forearm ends stay 0.77/0.58, preserving elbow fillers, cuffs and wrist size.
   Every joint location is unchanged. */
function upperEnvelope(t) {
  return 0.90 + 0.17 * Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.85) - 0.14 * Math.pow(t, 1.5);
}
export function maleUpperProfile(t) {
  return upperEnvelope(t) * (1 - 0.08 * (1 - smooth(0, 0.20, t)));
}
export function maleForeProfile(t, straightness, legacy) {
  const base=0.77 + 0.29 * Math.pow(Math.max(0, Math.sin(Math.pow(t, 0.80) * Math.PI)), 1.1) - 0.19 * Math.pow(t, 1.2);
  // Pose-supported burial of the proximal end disc. The long muscle envelope
  // is unchanged; a straight elbow lets its hidden origin extend up under the
  // humeral surface. At a folded elbow the joint retains the full root size.
  /* R255 — the burial is 0.18, not 0.32. At 0.32 the male forearm's root came
     out at 0.524 of its radius while the elbow ball was still being sized from
     the GENERIC `ARMS.profiles.fore(0)` = 0.77 (see limbs.js), so the ball stood
     at 1.47x the tube it emerges into: upper arm 0.120, ball 0.086, root 0.059,
     belly 0.098 — a bead on a string, which is section 16's "tiny neck between
     two balloons" exactly. The ball is sized from this function now, and the
     root comes up to meet it so the forearm RE-EXPANDS out of the joint instead
     of pinching first and blooming later. */
  /* GATED ON THE GENERATION, NOT ON `maleAnatomy`. Mrs. Mah's proportion set
     carries `maleAnatomy === true` — her arms are built by this same path and
     then sculpted by her own R166 refiners — so an ungated edit here moved HER
     forearm and elbow too (measured: arm-right-fore and both elbow solids
     changed hash). `legacy` is the existing R166-retained view; she keeps 0.32. */
  return base*(1-(legacy?.32:.18)*(straightness||0)*(1-smooth(0,.22,t)));
}
/* R111: cap and upper arm share ONE closed surface in the existing shoulder
   joint. h remains the humeral coordinate used by both homologous arms. No
   overlapping sleeve, independent cap pose, or cap-to-arm normal seam. */
export function maleShoulderArm(spec, upperEnd, inner, legacy) {
  var side = spec.shoulder[0] < 0 ? -1 : 1;
  return {
    start: upperEnd.map(v => -0.40 * v),
    end: upperEnd,
    radius: spec.upperRadius,
    profile: function(t) {
      var h = -0.40 + 1.40*t;
      // Redistribute the generic cap stock into its three directional heads.
      // The total envelope stays comparable instead of adding another sphere.
      var capStock=1-.10*belly(h,-.36,-.13,.04);
      if (h < 0) return .945*(.015+.985*Math.pow(Math.sin((h+.40)/.40*Math.PI/2),.48))*capStock;
      var radius = spec.upperRadius+(spec.foreRadius*1.02-spec.upperRadius)*h;
      return radius/spec.upperRadius*(.86+.10*Math.pow(Math.sin(Math.PI*h),.85)-.10*Math.pow(h,1.5))*(1-.24*smooth(.90,1,h))*capStock;
    },
    shape: function(t,d) {
      var h=-.40+1.40*t;
      if(h>=0)return maleUpperShape(h,d,inner,legacy);
      // Proximal heads have different growth and peak heights. Repeating the
      // h=0 section through the whole cap made a long undifferentiated dome.
      var out=-(inner||1),join=maleUpperShape(0,d,inner,legacy);
      return 1+(join-1)*smooth(-.40,-.045,h)
        +.25*musclePlane(d,out*Math.PI/2,.80)*belly(h,-.40,-.16,0)
        +.21*musclePlane(d,Math.PI-out*.42,.85)*belly(h,-.35,-.10,0)
        +.18*musclePlane(d,out*.27,.75)*belly(h,-.30,-.065,0)
        +deltoidHeadJunction(h,d,out)-deltoidHeadJunction(0,d,out)*smooth(-.40,-.045,h);
    },
    centreAt: function(t) {
      var h=-.40+1.40*t;
      // Rounded cap seats by its broad medial surface against the thorax.
      // A long medial centreline offset made a thin bridge over an open pocket.
      return [-side*.055*(1-smooth(-.20,.02,h)),0,0];
    }
  };
}
export function maleUpperShape(t, d, inner, legacy) {
  var inn = inner || 1, out = -inn, P=armDesign(legacy);
  var bicEnv = crownedBelly(t, 0.10, MRMAH_MORPHOLOGY.arms.bellyPeaks.biceps, 0.94,P.biceps.bellySpan);
  var triEnv = crownedBelly(t, -0.04, MRMAH_MORPHOLOGY.arms.bellyPeaks.tricepsLong, 0.98,P.triceps.longSpan);
  var distal = smooth(0.48, 0.95, t);
  // Bounded muscle territories narrow around their cross-section toward the
  // insertion, independently of the longitudinal belly taper. The previous
  // broad Gaussian tails merged all neighbouring heads into the same oval.
  var biceps = P.biceps.projection * musclePlane(d, inn * (0.14 - 0.28 * distal), footprintWidth(t,P.biceps.footprintWidth,P.biceps.crownBreadth-.22*distal),P.biceps.crownConvexity) * bicEnv;
  // Shallow proximal bifurcation merges into one elongated distal belly.
  biceps += 0.040 * (arc(d, out * 0.38, 0.30) + arc(d, inn * 0.48, 0.30)) * belly(t, 0.02, 0.22, 0.64);
  var longAxis = Math.PI - inn * (0.66 - 0.40 * distal);
  var lateralAxis = Math.PI + inn * (0.88 - 0.54 * distal);
  var triceps = P.triceps.longProjection * musclePlane(d, longAxis,P.triceps.longBreadth-.17*distal) * triEnv
    + P.triceps.lateralProjection * musclePlane(d, lateralAxis,P.triceps.lateralBreadth-.13*distal) * crownedBelly(t, 0.03, MRMAH_MORPHOLOGY.arms.bellyPeaks.tricepsLateral, 0.94,P.triceps.lateralSpan);
  var tendon = -0.070 * arc(d, Math.PI, 0.42) * smooth(0.43, 0.77, t);
  var B=P.brachialis;
  var brachAxis=out*(B.angularCentre-.30*smooth(.55,.95,t));
  var brachWidth=B.angularWidth*(.70+.30*belly(t,B.origin,B.peak,B.insertion));
  const brachAngle=Math.abs(Math.atan2(Math.sin(d-brachAxis),Math.cos(d-brachAxis)));
  // A tapered oblique wedge has its own entry, facing plane and distal return.
  // Its triangular footprint is smaller than either neighbouring arm mass.
  var brach=B.projection*Math.max(0,Math.min(1,(t-B.origin)/.17,
    (B.insertion-t)/.19,(brachWidth-brachAngle)/.24));
  // Different oblique boundaries: anterior return is shorter and deeper;
  // posterior territory merges gradually beneath the lateral triceps head.
  brach-=.060*arc(d,brachAxis-out*.45,.20)*belly(t,.42,.69,.90);
  brach-=.026*arc(d,brachAxis+out*.49,.27)*belly(t,.43,.66,.87);
  var septa=-.065*arc(d,inn*1.40,.34)*belly(t,.24,.58,.90)
    -.09*arc(d,out*(.94+.16*distal),.20)*belly(t,.27,.60,.88);
  // Anterior/posterior origins emerge beneath the descending deltoid edges.
  var origin = -0.075 * (arc(d, 0, 0.80) + arc(d, Math.PI, 0.84)) * (1 - smooth(0.02, 0.34, t));
  var elbow = -0.10 * arc(d, 0, 0.65) * smooth(0.82, 1.0, t)
    + 0.075 * arc(d, Math.PI, 0.44) * smooth(0.82, 1.0, t)
    + 0.14 * arc(d, out * 0.85, 0.50) * smooth(0.76, 1.0, t);
  // The three deltoid fields cross the cap/arm mesh boundary unchanged. Their
  // centres approach the lateral tuberosity; only that tongue reaches t=.46.
  var D=P.deltoid,lateral=Math.max(0,Math.sin(d*out));
  var endFront=D.anteriorEnd+(D.lateralEnd-D.anteriorEnd)*Math.pow(lateral,1.65);
  var endBack=D.posteriorEnd+(D.lateralEnd-D.posteriorEnd)*Math.pow(lateral,1.65);
  var deltAnterior=.30*musclePlane(d,out*.32,.92)*(1-smooth(0,endFront,t));
  var deltPosterior=.31*musclePlane(d,Math.PI+inn*.35,1.00)*(1-smooth(0,endBack,t));
  // The cap's lateral tongue narrows around the humerus while descending.
  // Its crest height and proximal shoulder span stay fixed; taper belongs to
  // the attachment footprint rather than a deeper circumferential groove.
  const insertionWidth=.88*(1-(D.insertionNarrowing||0)*smooth(.06,D.lateralEnd,t));
  var deltLateral=.27*musclePlane(d,out*Math.PI/2,insertionWidth)*(1-smooth(.060,D.lateralEnd,t));
  // The two oblique boundaries meet on the lateral humerus. Their end follows
  // anatomical angle, rather than fading away before reaching the V's apex.
  var outer=Math.max(0,Math.sin(d*out)),posterior=smooth(-.20,.20,-Math.cos(d));
  var end=endFront+(endBack-endFront)*posterior;
  var deltBorders=-D.valleyDepth*Math.exp(-Math.pow((t-end-.014)/D.valleyWidth,2))*Math.pow(outer,.65);

  return 1 + biceps + triceps + tendon + brach + septa + origin + elbow + deltAnterior + deltPosterior + deltLateral + deltBorders + deltoidHeadJunction(t,d,out);
}
export function maleForeShape(t, d, inner, palmAngle) {
  // A forearm's anterior surface follows its preserved palm, not world +Z.
  // In the wrist's right-handed frame +angular points toward local -X (thumb).
  // Keep the legacy three-argument frame available to older callers/tests.
  if(palmAngle!=null){d-=palmAngle;inner=-1;}
  var inn = inner || 1, out = -inn;
  var sweep = smooth(0.05, 0.90, t);
  var radial = 0.64 * musclePlane(d, out * (0.84 + 0.35 * sweep), .76,.12) * belly(t, -0.13, MRMAH_MORPHOLOGY.arms.bellyPeaks.brachioradialis, 0.90);
  var flexor = 0.45 * musclePlane(d, inn * (0.64 - 0.42 * sweep), .96-.22*sweep,.16) * belly(t, -0.02, 0.39, 0.90);
  var extensor = 0.29 * musclePlane(d, Math.PI + inn * (0.96 - 0.43 * sweep), .88-.16*sweep,.10) * belly(t, -0.10, 0.24, 0.87);
  var ulnar = 0.07 * arc(d, Math.PI - inn * 0.66, 0.43) * belly(t, 0.02, 0.40, 0.87);
  var channels = -0.085 * arc(d, out * (1.49 + 0.24 * sweep), 0.28) * belly(t, 0.08, 0.35, 0.87)
    -.11*arc(d,out*.16,.26)*belly(t,.18,.48,.88);
  var wrist = -(0.12 * arc(d, 0, 0.70) + 0.08 * arc(d, Math.PI, 0.70)) * smooth(0.69, 1, t);
  // Broad low relief tendon tracks, no literal fiber grooves.
  var tendons = 0.020 * (arc(d, inn * 0.25, 0.22) + arc(d, out * 0.33, 0.22)) * belly(t, 0.62, 0.83, 1.02);
  return 1 + radial + flexor + extensor + ulnar + channels + wrist + tendons;
}

// Independent width/depth planes in the actual preserved palm frame. A
// radial clamp changed both coordinates together and kept the forearm conical.
// This moves only the ulna-facing width or dorsal depth, leaving the thumb
// crest and flexor belly free. It runs before the shared elbow projection.
export function maleForePlanes(point,t,frame,spec,straightness,legacy){
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const x=dot(point,frame.thumb),z=dot(point,frame.palm);
  const r=(spec.foreRadius+(spec.wristRadius-spec.foreRadius)*t)*maleForeProfile(t,straightness,legacy);
  const w=smooth(.10,.29,t)*(1-smooth(.72,.94,t));
  const ulna=-r*(.88+.08*t),dorsal=-r*(1.00+.05*Math.sin(Math.PI*t));
  const P=MRMAH_MORPHOLOGY.arms.planeDesign.regionalPlanes;
  const extensor=P ? -r*(1.01+.10*Math.sin(Math.PI*t))+.18*x : dorsal;
  const extensorWeight=P?smooth(.35,.90,-z/r)*(1-smooth(.70,1.18,Math.abs(x)/r)):0;
  const dx=Math.max(0,ulna-x)*w,dz=(Math.max(0,dorsal-z)+Math.max(-.014,Math.min(.014,extensor-z))*extensorWeight)*w;
  return point.map((v,i)=>v+frame.thumb[i]*dx+frame.palm[i]*dz);
}

// R113: bounded anterior/posterior muscle-facing planes in the humeral frame.
// The plane depths follow each head's own longitudinal envelope. Side volume,
// shoulder crown and elbow support remain outside this local correction.
export function maleUpperPlanes(point,t,spec,axisVector,legacy){
  const unit=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);};
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),axis=unit(axisVector);
  const front=unit([0,0,1].map((v,i)=>v-axis[i]*axis[2]));
  let out=[axis[1]*front[2]-axis[2]*front[1],axis[2]*front[0]-axis[0]*front[2],axis[0]*front[1]-axis[1]*front[0]];
  if(out[0]*spec.shoulder[0]<0)out=out.map(v=>-v);
  const h=-.40+1.40*t,w=smooth(.10,.30,h)*(1-smooth(.78,.94,h));
  const cap=smooth(-.32,-.12,h)*(1-smooth(.10,.34,h));
  if(!w&&!cap)return point;
  const r=spec.upperRadius+(spec.foreRadius*1.02-spec.upperRadius)*h;
  const x=dot(point,out),z=dot(point,front),P=armDesign(legacy).crowns;
  const R=armDesign(legacy).regionalPlanes;
  let dz=0;
  if(R&&cap){
    // The cap keeps its outer span. Only its front/rear facing surfaces turn
    // into a broad lens; the lower V is carried by the existing envelope.
    const limit=r*(R.deltFacing-R.deltReturnSlope*Math.pow(x/r-.40,2));
    dz=-Math.sign(z)*Math.min(.015,Math.max(0,Math.abs(z)-limit))*cap;
  }
  for(const sign of [1,-1]){
    const peak=sign===1?MRMAH_MORPHOLOGY.arms.bellyPeaks.biceps:MRMAH_MORPHOLOGY.arms.bellyPeaks.tricepsLong;
    const crown=r*(P.base+P.growth*belly(h,.05,peak,.98)-P.convexity*Math.pow(x/r,2));
    const target=sign*crown+(sign===-1?.09*x:0);
    const face=smooth(.55,1.08,sign*z/r)*(1-smooth(.58,.92,Math.abs(x)/r));
    // Redistribute toward a true facing surface in the local normal direction.
    // Both signs are bounded: the crown lowers and its adjacent face can rise.
    const limit=R?.armLimit||.024;
    const correction=Math.max(-limit,Math.min(limit,target-z));
    // A crown plane may trim excess projection. Raising its entire adjacent
    // sector filled the biceps/triceps returns back toward one generic oval.
    dz+=(R?.preserveReturns?sign*Math.min(0,sign*correction):correction)*face*w;
  }
  let result=point.map((v,i)=>v+front[i]*dz);
  const wedge=belly(h,.40,.70,.92)*smooth(.55,.92,x/r)*smooth(-.52,-.18,z/r)*(1-smooth(.20,.50,z/r));
  const targetOut=r*((R?.brachialisCrown||.99)+.10*belly(h,.40,.70,.92))+(R?.brachialisTilt||.17)*z;
  // Preserve the bounded radial wedge's returns. Filling all lower lateral
  // samples to one outer plane overwrote their authored cross-section.
  const wedgeCorrection=Math.max(-.018,Math.min(.021,targetOut-x));
  const dx=(R?.preserveBrachialisReturns?Math.min(0,wedgeCorrection):wedgeCorrection)*wedge;
  result=result.map((v,i)=>v+out[i]*dx);
  if(R?.sideFaces){
    // Bounded oblique planes cut the two different side returns into the
    // existing mass. They do not draw grooves into one unchanged oval.
    // At a junction use the strongest penetration, not additive cuts.
    let chosen=null,amount=0;
    for(const face of R.sideFaces){
      const n=unit(out.map((v,i)=>v*face.normal[0]+front[i]*face.normal[1]));
      let weight=smooth(face.region[0],face.region[1],h)*(1-smooth(face.region[2],face.region[3],h));
      // A sidewall cannot trim the muscle's anterior/posterior crown merely
      // because that crown crosses the infinite continuation of its plane.
      // Bound the return in the same humeral chart as the muscle footprint.
      if(face.angularRegion){const a=Math.atan2(x,z),q=face.angularRegion;
        const local=smooth(.30,.39,h)*(1-smooth(.84,.90,h));
        weight*=1-local+local*smooth(q[0],q[1],a)*(1-smooth(q[2],q[3],a));}
      const penetration=Math.max(0,dot(result,n)-r*face.offset);
      const move=Math.min(face.limit,penetration)*weight;
      if(move>amount){amount=move;chosen=n;}
    }
    if(chosen)result=result.map((v,i)=>v-chosen[i]*amount);
  }
  return result;
}

// Connect existing muscle-boundary columns with broad facing sections. The
// anchors come from this very ring, before elbow accommodation and recesses;
// no final-pose dimensions are applied upstream or cut a second time.
function upperSectionLandmarks(h){
  const C=MRMAH_MORPHOLOGY.arms.planeDesign.sectionFaces,L=C.landmarks.slice();
  if(C.wedgeBounds){const rows=C.wedgeBounds;let j=1;while(j<rows.length-1&&rows[j][0]<h)j++;const a=rows[j-1],b=rows[j],f=Math.max(0,Math.min(1,(h-a[0])/(b[0]-a[0])));L[2]=a[1]+(b[1]-a[1])*f;L[3]=a[2]+(b[2]-a[2])*f;}
  return L;
}
export function maleUpperSectionFaces(points,t,angles,inner){
  const C=MRMAH_MORPHOLOGY.arms.planeDesign.sectionFaces;
  if(!C)return points;
  const h=-.4+1.4*t,w=smooth(C.region[0],C.region[1],h)*(1-smooth(C.region[2],C.region[3],h));
  const out=-(inner||1),tau=2*Math.PI,q=angles.map(d=>((d*out)%tau+tau)%tau);
  const cap=C.capFaces;
  if(cap){
    const weight=smooth(cap.region[0],cap.region[1],h)*(1-smooth(cap.region[2],cap.region[3],h));
    const ids=cap.landmarks.map(a=>q.findIndex(v=>Math.abs(v-a)<1e-6));
    if(weight&&ids.every(i=>i>=0))points=points.map((p,i)=>{
      const a=q[i];if(a<=cap.landmarks[0]||a>=cap.landmarks.at(-1)||ids.includes(i))return p;
      let j=1;while(cap.landmarks[j]<a)j++;
      const f=(a-cap.landmarks[j-1])/(cap.landmarks[j]-cap.landmarks[j-1]);
      const left=points[ids[j-1]],right=points[ids[j]];
      return p.map((v,k)=>v+(left[k]+(right[k]-left[k])*f-v)*weight);
    });
  }
  if(!w)return points;
  const L=upperSectionLandmarks(h);
  const knots=L.map(a=>q.findIndex(v=>Math.abs(v-a)<1e-6));
  if(knots.some(i=>i<0))return points;
  return points.map((p,i)=>{
    const a=q[i];if(a<=L[0]||a>=L.at(-1)||knots.includes(i))return p;
    let j=1;while(L[j]<a)j++;
    const f=(a-L[j-1])/(L[j]-L[j-1]);
    const left=points[knots[j-1]],right=points[knots[j]],target=left.map((v,k)=>v+(right[k]-v)*f);
    return p.map((v,k)=>v+(target[k]-v)*w);
  });
}

// Smooth within each authored section face, retaining its boundary turn.
// Uses final geometry after recess/joint fitting, not cached raw triangle
// normals or an arbitrary diamond grid. aSmooth remains the geometry proof.
export function maleUpperSectionNormals(geometry,frames,axisVector,spec,inner){
  const C=MRMAH_MORPHOLOGY.arms.planeDesign.sectionFaces;
  if(!C?.moldNormals||!frames.length)return;
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),unit=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const len=Math.hypot(...axisVector),axis=unit(axisVector),front=unit([0,0,1].map((v,i)=>v-axis[i]*axis[2]));
  let out=cross(axis,front);if(out[0]*spec.shoulder[0]<0)out=out.map(v=>-v);
  const chart=p=>[dot(p,axis)/len,Math.atan2(dot(p,out),dot(p,front))],tau=2*Math.PI;
  const rows=frames.map(s=>{const q=s.angles.map(d=>((d*-(inner||1))%tau+tau)%tau);return {h:s.h,angles:upperSectionLandmarks(s.h).map(a=>{const i=q.findIndex(v=>Math.abs(v-a)<1e-6);return chart(s.points[i])[1];})};});
  function sector(h,a){let j=1;while(j<rows.length-1&&rows[j].h<h)j++;const lo=rows[j-1],hi=rows[j],f=Math.max(0,Math.min(1,(h-lo.h)/(hi.h-lo.h)));const k=lo.angles.map((v,i)=>v+(hi.angles[i]-v)*f);if(a<k[0]||a>k.at(-1))return -1;let n=1;while(n<k.length-1&&k[n]<a)n++;return n-1;}
  const p=geometry.attributes.position,base=geometry.attributes.aSmooth,normal=base.array.slice(),groups=[],acc=new Map();
  const point=i=>[p.getX(i),p.getY(i),p.getZ(i)],key=(v,g)=>v.map(x=>Math.round(x*1e5)).join(',')+':'+g;
  for(let i=0;i<p.count;i+=3){
    const v=[point(i),point(i+1),point(i+2)],center=v[0].map((x,k)=>(x+v[1][k]+v[2][k])/3),[h,a]=chart(center);
    const g=h>C.region[0]&&h<C.region[3]?sector(h,a):-1;groups.push(g);if(g<0)continue;
    const n=unit(cross(v[1].map((x,k)=>x-v[0][k]),v[2].map((x,k)=>x-v[0][k])));
    for(let j=0;j<3;j++){const u=unit(v[(j+1)%3].map((x,k)=>x-v[j][k])),w=unit(v[(j+2)%3].map((x,k)=>x-v[j][k]));const angle=Math.acos(Math.max(-1,Math.min(1,dot(u,w)))),id=key(v[j],g),sum=acc.get(id)||[0,0,0];acc.set(id,sum.map((x,k)=>x+n[k]*angle));}
  }
  let changed=0,maxTurn=0;
  for(let i=0;i<p.count;i++){
    const g=groups[Math.floor(i/3)];if(g<0)continue;const v=point(i),h=chart(v)[0],w=smooth(C.region[0],C.region[1],h)*(1-smooth(C.region[2],C.region[3],h))*(C.normalFaces?.[g]??1);if(!w)continue;
    const n=unit(acc.get(key(v,g))),b=[base.getX(i),base.getY(i),base.getZ(i)];if(dot(n,b)<.5)continue;
    const result=unit(b.map((x,k)=>x+(n[k]-x)*w));for(let k=0;k<3;k++)normal[i*3+k]=result[k];const turn=Math.acos(Math.max(-1,Math.min(1,dot(result,b))));if(turn>1e-5){changed++;maxTurn=Math.max(maxTurn,turn);}
  }
  geometry.setAttribute('aMoldNormal',new Float32BufferAttribute(normal,3));
  geometry.userData.sectionFacing={method:'Final-face corner normals averaged within the five connected authored section territories; no position changes',changedCorners:changed,maxTurnDegrees:maxTurn*180/Math.PI};
}

/* Local bind-pose normal repair at intentional articulated overlaps. The ray
   audit shows continuous positions at the relaxed elbow; separate end-ring
   normal averages made a jagged cuff. Share nearby outward normals only in
   that contact region. Positions, bones and opposing crease normals stay put.
   This runs once at construction, never during animation. */
export function maleElbowEnvelope(spec,upper,fore,straightness) {
  const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
  if(straightness<.5){
    // A compact common support for the folded junction. Both arm end rings
    // and the existing joint shell share this ellipsoid and its smooth normal.
    // Bone positions and articulation remain separate and unchanged.
    const u=unit(upper),f=unit(fore),away=unit(u.map((v,i)=>v-f[i]));
    const cross=[u[1]*f[2]-u[2]*f[1],u[2]*f[0]-u[0]*f[2],u[0]*f[1]-u[1]*f[0]],hinge=unit(cross);
    const side=unit([hinge[1]*away[2]-hinge[2]*away[1],hinge[2]*away[0]-hinge[0]*away[2],hinge[0]*away[1]-hinge[1]*away[0]]);
    const axes=[hinge,away,side],radii=[.080,.085,.087];
    const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
    const foldAxis=unit(f.map((v,i)=>v-u[i])),separation=unit(f.map((v,i)=>v+u[i]));
    function project(q){const scale=1/Math.sqrt(axes.reduce((s,a,i)=>s+Math.pow(dot(q,a)/radii[i],2),0));return q.map(v=>v*scale);}
    function field(point,t,isFore){
      const q=point.map((v,i)=>v+(isFore?0:-upper[i])),distance=Math.hypot(...q);
      if(distance<1e-7)return point;
      const w=1-smooth(.070,.145,distance),target=w?project(q):q;
      let result=point.map((v,i)=>v+(target[i]-q[i])*w);
      // The canonical bent pose puts the two muscular envelopes into contact
      // above the hinge. Compress only their facing surfaces about the local
      // angle bisector; do not shrink either whole arm or move its bone axis.
      const s=dot(q,foldAxis),contact=smooth(.085,.17,s)*(1-smooth(.32,.46,s));
      const signed=dot(q,separation),limit=isFore?.007:-.007;
      // The rigid segment rig also supports opening the elbow. Bound this
      // rest-pose accommodation so it cannot carve away the relaxed belly.
      const correction=isFore?Math.min(.022,Math.max(0,limit-signed)):Math.max(-.022,Math.min(0,limit-signed));
      result=result.map((v,i)=>v+separation[i]*correction*contact);
      return result;
    }
    field.knob=q=>Math.hypot(...q)>1e-7?project(q):q;
    field.normal=function(point,isFore){
      const q=point.map((v,i)=>v+(isFore?0:-upper[i])),w=1-smooth(.085,.145,Math.hypot(...q));if(!w)return null;
      const n=[0,0,0];axes.forEach((a,j)=>{const v=dot(q,a)/(radii[j]*radii[j]);a.forEach((c,i)=>n[i]+=c*v);});
      return {n:unit(n),weight:w};
    };
    return field;
  }
  const u=unit(upper),f=unit(fore),axis=unit(u.map((v,i)=>v+f[i]));
  const forward=unit([0,0,1].map((v,i)=>v-axis[i]*axis[2]));
  const lateral=[axis[1]*forward[2]-axis[2]*forward[1],axis[2]*forward[0]-axis[0]*forward[2],axis[0]*forward[1]-axis[1]*forward[0]];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  function envelope(point,t,isFore){
    const q=point.map((v,i)=>v+(isFore?0:-upper[i]));
    const s=dot(q,axis),x=dot(q,lateral),z=dot(q,forward);
    const fade=smooth(-.125,-.025,s)*(1-smooth(.055,.145,s));
    const burial=isFore?smooth(0,.10,t):1-smooth(.92,1,t);
    const weight=fade*burial*straightness;
    if(!weight)return point;
    const proximal=1-smooth(-.125,0,s),distal=smooth(0,.145,s);
    const width=.084+.037*proximal+.027*distal;
    const depth=(z>=0?.089:.097)+(z>=0?.055:.033)*proximal+(z>=0?.025:.009)*distal;
    const theta=Math.atan2(z/depth,x/width),nx=Math.cos(theta)*width,nz=Math.sin(theta)*depth;
    const target=axis.map((v,i)=>v*s+lateral[i]*nx+forward[i]*nz+(isFore?0:upper[i]));
    return point.map((v,i)=>v+(target[i]-v)*weight);
  }
  // Analytic normal of the same support surface. This avoids averaging the
  // hidden end-disc normal into the visible overlap's anatomical surface.
  envelope.normal=function(point,isFore){
    const q=point.map((v,i)=>v+(isFore?0:-upper[i])),s=dot(q,axis),x=dot(q,lateral),z=dot(q,forward);
    const weight=smooth(-.09,-.025,s)*(1-smooth(.045,.105,s))*straightness;
    if(!weight)return null;
    const radii=h=>{const p=1-smooth(-.125,0,h),d=smooth(0,.145,h);return [.084+.037*p+.027*d,(z>=0?.089:.097)+(z>=0?.055:.033)*p+(z>=0?.025:.009)*d];};
    const [w,d]=radii(s),lo=radii(s-.0001),hi=radii(s+.0001),dw=(hi[0]-lo[0])/.0002,dd=(hi[1]-lo[1])/.0002;
    const n=unit(axis.map((v,i)=>-v*(x*x*dw/(w*w*w)+z*z*dd/(d*d*d))+lateral[i]*x/(w*w)+forward[i]*z/(d*d)));
    return {n,weight};
  };
  return envelope;
}

export function blendArmSeam(upper,fore,elbowOffset,junction) {
  function samples(g,offset){
    const p=g.attributes.position,n=g.attributes.aSmooth,map=new Map();
    for(let i=0;i<p.count;i++){
      const q=[p.getX(i)+offset[0],p.getY(i)+offset[1],p.getZ(i)+offset[2]];
      if(Math.hypot(q[0]-elbowOffset[0],q[1]-elbowOffset[1],q[2]-elbowOffset[2])>.17)continue;
      const key=q.map(v=>Math.round(v*1e6)).join(',');
      if(!map.has(key))map.set(key,{p:q,n:[n.getX(i),n.getY(i),n.getZ(i)],ids:[],sum:[0,0,0],w:0});
      map.get(key).ids.push(i);
    }
    return [...map.values()];
  }
  const a=samples(upper,[0,0,0]),b=samples(fore,elbowOffset);
  for(const u of a)for(const v of b){
    const d=Math.hypot(...u.p.map((x,i)=>x-v.p[i]));
    const dot=u.n.reduce((s,x,i)=>s+x*v.n[i],0);
    if(d>=.026||dot<.35)continue;
    const w=Math.pow(1-d/.026,2);
    for(let k=0;k<3;k++){u.sum[k]+=v.n[k]*w;v.sum[k]+=u.n[k]*w;}u.w+=w;v.w+=w;
  }
  for(const [g,list] of [[upper,a],[fore,b]]){
    const n=g.attributes.aSmooth;
    for(const s of list){if(!s.w)continue;const k=.72*Math.min(1,s.w*3),v=s.n.map((x,i)=>x*(1-k)+s.sum[i]/s.w*k),l=Math.hypot(...v);
      for(const i of s.ids)n.setXYZ(i,v[0]/l,v[1]/l,v[2]/l);
    }
    n.needsUpdate=true;
  }
  if(junction)for(const [g,isFore] of [[upper,false],[fore,true]]){
    const p=g.attributes.position,n=g.attributes.aSmooth;
    for(let i=0;i<p.count;i++){
      const field=junction.normal([p.getX(i),p.getY(i),p.getZ(i)],isFore);if(!field)continue;
      const a=[n.getX(i),n.getY(i),n.getZ(i)],b=a.map((v,k)=>v+(field.n[k]-v)*field.weight),l=Math.hypot(...b);
      n.setXYZ(i,b[0]/l,b[1]/l,b[2]/l);
    }
    n.needsUpdate=true;
  }
}

// Existing wrist connector, shaped between the actual distal forearm and the
// preserved pentagonal palm footprint. Coordinates are the wrist's own frame.
export function maleWristSurface(spec,hand,foreLength,straightness,closeAtPalm=false,legacy){
  return function(point){
    const y=point[1],length=Math.hypot(point[0],point[2])||1;
    const x=point[0]/length,z=point[2]/length;
    const t=Math.max(0,Math.min(1,1+y/foreLength));
    const angle=Math.atan2(-x,z/1.06);
    const r=(spec.foreRadius+(spec.wristRadius-spec.foreRadius)*t)*maleForeProfile(t,straightness,legacy);
    const foreR=r*maleForeShape(t,angle,-1,0)/Math.sqrt(x*x+z*z/(1.06*1.06));
    const u=Math.max(0,y/hand.palmLength),w=hand.palmHalfWidth*(.55+.45*u),d=hand.palmHalfDepth*(.75+.25*u),ridge=hand.palmHalfDepth*(1.02+.30*u);
    const polygon=[[-w,d],[0,ridge],[w,d],[w,-d],[-w,-d]];
    let palmR=Infinity;
    for(let i=0;i<5;i++){
      const a=polygon[i],b=polygon[(i+1)%5],ex=b[0]-a[0],ez=b[1]-a[1],den=x*ez-z*ex;
      if(Math.abs(den)<1e-8)continue;
      const ray=(a[0]*ez-a[1]*ex)/den,edge=(a[0]*z-a[1]*x)/den;
      if(ray>0&&edge>=0&&edge<=1)palmR=Math.min(palmR,ray);
    }
    if(!Number.isFinite(palmR))palmR=w;
    const blend=smooth(-.030,closeAtPalm?0:.015,y),burial=1-.018*smooth(closeAtPalm?0:.013,closeAtPalm?.015:.030,y);
    const radius=(foreR+(palmR-foreR)*blend)*burial-(closeAtPalm?.0002*smooth(-.012,0,y):0);
    return [x*radius,y,z*radius];
  };
}

// R115: fixed longitudinal columns straddle biceps/brachialis/triceps side
// turns. Same 24 samples; denser lateral territory, quieter medial territory.
export function maleUpperAngle(d,t,inner,legacy){
 const out=-(inner||1),tau=Math.PI*2;
 const q=((d*out)%tau+tau)%tau/tau*24,i=Math.min(23,Math.floor(q));
 const k=MRMAH_MORPHOLOGY.arms.planeDesign.angularSamples;
 let a=k[i]+(k[i+1]-k[i])*(q-i);
 const C=armDesign(legacy).sectionFaces;
 if(C?.wedgeBounds&&a>C.landmarks[0]&&a<C.landmarks.at(-1)){
   const L=upperSectionLandmarks(-.4+1.4*t);let j=1;while(C.landmarks[j]<a)j++;
   const f=(a-C.landmarks[j-1])/(C.landmarks[j]-C.landmarks[j-1]);a=L[j-1]+(L[j]-L[j-1])*f;
 }
 return out*a;
}

// R118 negative-space fitting in the bone's rest surface chart; poses move the
// completed mesh with its original joint, so paths cannot chase the camera.
export function maleArmRecesses(geometry,spec,axisVector,forearm=false){
  const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);},dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const axis=unit(axisVector),front=unit([0,0,1].map((x,i)=>x-axis[i]*axis[2]));
  let out=[axis[1]*front[2]-axis[2]*front[1],axis[2]*front[0]-axis[0]*front[2],axis[0]*front[1]-axis[1]*front[0]];
  if(out[0]*spec.shoulder[0]<0)out=out.map(x=>-x);
  const radius=forearm?spec.foreRadius:spec.upperRadius,len=Math.hypot(...axisVector);
  const channels=(forearm?MRMAH_RECESSES.forearm:MRMAH_RECESSES.upperArm).map(c=>({...c,path:c.path.map(([a,t])=>[a*radius,t*len])}));
  return sculptSurfaceRecesses(geometry,{name:forearm?'forearm rest polar chart':'humeral rest polar chart',seamSpan:Math.PI*radius,refine:56,
    project:p=>{const v=p.toArray();return [Math.atan2(dot(v,out),dot(v,front))*radius,dot(v,axis)];},accept:p=>true},channels);
}

// R133: one bounded lateral-triceps facing surface in the final rest mesh.
// Sample its support after the inherited local recesses, before joint-normal
// reconciliation. No final-pose dimensions are fed back into the loft.
export function maleTricepsSurface(geometry,spec,axisVector){
 const P=MRMAH_MORPHOLOGY.arms.planeDesign.triceps;
 for(const C of [P.surface,P.longSurface])shapeArmRegion(geometry,spec,axisVector,C);
 return geometry;
}
// R134: apply the wall to the refined rest mesh so the support cannot spread
// into the elbow through upstream loft interpolation.
export function maleBicepsReturn(geometry,spec,axisVector){
 const C=MRMAH_MORPHOLOGY.arms.planeDesign.sectionFaces?.bicepsReturn;if(!C)return geometry;
 const axis=new Vector3(...axisVector),length=axis.length();axis.normalize();
 const front=new Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),outer=new Vector3().crossVectors(axis,front);
 if(outer.x*spec.shoulder[0]<0)outer.negate();
 const p=geometry.attributes.position,vertices=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 function pointAt(h,angle){
  const d=front.clone().multiplyScalar(Math.cos(angle)).addScaledVector(outer,Math.sin(angle)),center=axis.clone().multiplyScalar(h*length);
  const ray=new Ray(center.clone().addScaledVector(d,.65),d.clone().negate()),hit=new Vector3();let best=null,radius=-Infinity;
  for(let i=0;i<vertices.length;i+=3)if(ray.intersectTriangle(vertices[i],vertices[i+1],vertices[i+2],false,hit)){const r=hit.clone().sub(center).dot(d);if(r>radius){radius=r;best=hit.clone();}}
  if(!best)throw new Error('Biceps return lacks baseline surface support');return best;
 }
 const stations=C.stations.map(h=>{
  const crown=pointAt(h,C.angles[0]),floor=pointAt(h,C.angles[1]),edge=floor.clone().sub(crown),n=new Vector3().crossVectors(edge,axis).normalize();
  if(n.dot(crown)<0)n.negate();return {h,span:edge.length(),normal:n,crown:crown.toArray(),floor:floor.toArray()};
 });
 sculptSurfaceRegion(geometry,{name:'biceps lateral crown return',sample:before=>{
  const v=new Vector3(...before),h=v.dot(axis)/length,angle=Math.atan2(v.dot(outer),v.dot(front));
  if(h<=C.region[0]||h>=C.region[3]||angle<=C.angles[0]||angle>=C.angles[1])return null;
  let j=1;while(j<stations.length-1&&stations[j].h<h)j++;
  const a=stations[j-1],b=stations[j],t=(h-a.h)/(b.h-a.h),normal=a.normal.clone().lerp(b.normal,t).normalize(),span=a.span+(b.span-a.span)*t;
  let f=(angle-C.angles[0])/(C.angles[1]-C.angles[0]);
  j=1;while(j<C.crestFlow.length-1&&C.crestFlow[j][0]<h)j++;
  const lo=C.crestFlow[j-1],hi=C.crestFlow[j],q=Math.max(0,Math.min(1,(h-lo[0])/(hi[0]-lo[0]))),crest=lo[1]+(hi[1]-lo[1])*q,base=C.profile[1][0];
  f=f<crest?f/crest*base:base+(f-crest)/(1-crest)*(1-base);
  j=1;while(j<C.profile.length-1&&C.profile[j][0]<f)j++;
  const left=C.profile[j-1],right=C.profile[j],s=(f-left[0])/(right[0]-left[0]);
  const rise=(left[1]+s*(right[1]-left[1]))*span*smooth(C.region[0],C.region[1],h)*(1-smooth(C.region[2],C.region[3],h));
  return v.addScaledVector(normal,rise).toArray();
 }});
 geometry.userData.bicepsReturn={frame:'final refined humeral rest axis; projected +Z anterior, mirrored outward transverse; model units',angles:C.angles,stations:stations.map(s=>({...s,normal:s.normal.toArray()}))};
 return geometry;
}
// The biceps uses the same bounded surface construction as the retained
// triceps. Its proximal footprint and longitudinal crown are independent;
// the existing lateral return and elbow are outside this field.
export function maleBicepsSurface(geometry,spec,axisVector){
 const C=MRMAH_MORPHOLOGY.arms.planeDesign.biceps.surface;
 shapeArmRegion(geometry,spec,axisVector,C,'bicepsSurface');return geometry;
}
// Average final triangle normals inside the three anatomical facing regions,
// retaining smooth normals separately. This is not per-triangle flat shading.
export function maleBicepsFacingNormals(geometry,spec,axisVector){
 const C=MRMAH_MORPHOLOGY.arms.planeDesign.biceps.surface;
 if(!C?.moldNormals||!MRMAH_MORPHOLOGY.arms.planeDesign.sectionFaces?.moldNormals)return;
 const axis=new Vector3(...axisVector),length=axis.length();axis.normalize();
 const front=new Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),outer=new Vector3().crossVectors(axis,front);if(outer.x*spec.shoulder[0]<0)outer.negate();
 const n=front.clone().multiplyScalar(Math.cos(C.angle)).addScaledVector(outer,Math.sin(C.angle));
 const tangent=outer.clone().multiplyScalar(Math.cos(C.angle)).addScaledVector(front,-Math.sin(C.angle));
 const polygon=C.footprint.map(([h,x])=>[h*length,x]);
 function region(v){
  const h=v.dot(axis),x=v.dot(tangent),angle=Math.atan2(v.dot(outer),v.dot(front));
  if(v.dot(n)<=0||angle<C.angularBounds[0]||angle>C.angularBounds[1])return null;
  let distance=Infinity;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dy=b[1]-a[1];distance=Math.min(distance,(dx*(x-a[1])-dy*(h-a[0]))/Math.hypot(dx,dy));}if(distance<=0)return null;
  const dx=x-C.crest[1]-(C.crestDrift||0)*(h-C.crest[0]*length),group=dx<-C.sideTurns[0][0]?0:dx>C.sideTurns[1][0]?2:1;
  return {group,weight:smooth(0,C.returnWidth,distance)*smooth(C.axialFade[0],C.axialFade[1],h/length)*(1-smooth(C.axialFade[2],C.axialFade[3],h/length))};
 }
 const p=geometry.attributes.position,base=geometry.attributes.aSmooth,normal=(geometry.attributes.aMoldNormal||base).array.slice(),groups=[],acc=new Map();
 const key=(v,g)=>v.toArray().map(x=>Math.round(x*1e6)).join(',')+':'+g;
 for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j)),r=region(v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3));groups.push(r?.group??-1);if(!r)continue;
  const f=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
  for(let j=0;j<3;j++){const angle=v[(j+1)%3].clone().sub(v[j]).angleTo(v[(j+2)%3].clone().sub(v[j])),id=key(v[j],r.group);if(!acc.has(id))acc.set(id,new Vector3());acc.get(id).addScaledVector(f,angle);}
 }
 let changed=0,maxTurn=0;
 for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i),r=region(v);if(!r)continue;const sum=acc.get(key(v,r.group));if(!sum)continue;const a=sum.clone().normalize(),b=new Vector3().fromBufferAttribute(base,i);if(a.dot(b)<.5)continue;
  const result=b.clone().lerp(a,r.weight).normalize(),turn=result.angleTo(b);normal.set(result.toArray(),i*3);if(turn>1e-5){changed++;maxTurn=Math.max(maxTurn,turn);}
 }
 geometry.setAttribute('aMoldNormal',new Float32BufferAttribute(normal,3));geometry.userData.bicepsFacing={method:'Final corner normals averaged within anterior crown and two bounded side turns',changedCorners:changed,maxTurnDegrees:maxTurn*180/Math.PI};
}
function shapeArmRegion(geometry,spec,axisVector,C,metadata='tricepsSurfaces'){
 if(!C||(C.side&&Math.sign(spec.shoulder[0])!==C.side))return geometry;
 const axis=new Vector3(...axisVector),length=axis.length();axis.normalize();
 const front=new Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
 const outer=new Vector3().crossVectors(axis,front);if(outer.x*spec.shoulder[0]<0)outer.negate();
 const n=front.clone().multiplyScalar(Math.cos(C.angle)).addScaledVector(outer,Math.sin(C.angle));
 const tangent=outer.clone().multiplyScalar(Math.cos(C.angle)).addScaledVector(front,-Math.sin(C.angle));
 const p=geometry.attributes.position,vertices=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 function depth(h,x){
  const origin=axis.clone().multiplyScalar(h*length).addScaledVector(tangent,x).addScaledVector(n,.60),ray=new Ray(origin,n.clone().negate()),hit=new Vector3();let d=-Infinity;
  for(let i=0;i<vertices.length;i+=3)if(ray.intersectTriangle(vertices[i],vertices[i+1],vertices[i+2],false,hit))d=Math.max(d,hit.dot(n));
  if(!Number.isFinite(d))throw new Error('Triceps crown lacks local mesh support');return d;
 }
 const [hc,xc]=C.crest,dc=depth(hc,xc),anchors=C.facingAnchors.map(([h,x])=>[h*length,x,depth(h,x)]);
 const a=new Vector3(...anchors[0]),b=new Vector3(...anchors[1]),c=new Vector3(...anchors[2]),normal=b.sub(a).cross(c.sub(a));
 if(Math.abs(normal.z)<1e-7)throw new Error('Triceps facing anchors do not define a surface');
 const slopeH=-normal.x/normal.z,slopeX=C.facingSlopeX??-normal.y/normal.z;
 const crownLine=C.crownStations?.map(h=>{const x=xc+(C.crestDrift||0)*(h-hc)*length;return [h*length,depth(h,x),x];});
 const polygon=C.footprint.map(([h,x])=>[h*length,x]);
 sculptSurfaceRegion(geometry,{name:C.name,sample:before=>{
  const v=new Vector3(...before),h=v.dot(axis),x=v.dot(tangent),z=v.dot(n);if(z<=0)return null;
  if(C.angularBounds){const angle=Math.atan2(v.dot(outer),v.dot(front));if(angle<=C.angularBounds[0]||angle>=C.angularBounds[1])return null;}
  let distance=Infinity;
  for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dy=b[1]-a[1];distance=Math.min(distance,(dx*(x-a[1])-dy*(h-a[0]))/Math.hypot(dx,dy));}
  if(distance<=0)return null;
  const weight=smooth(0,C.returnWidth,distance)*smooth(C.axialFade[0],C.axialFade[1],h/length)*(1-smooth(C.axialFade[2],C.axialFade[3],h/length));
  const dh=h-hc*length,crestX=xc+(C.crestDrift||0)*dh;
  let crown=dc+slopeH*dh-(C.longitudinalConvexity||0)*Math.pow(dh/(C.crownHalfLength||1),2);
  if(crownLine){let i=1;while(i<crownLine.length-1&&crownLine[i][0]<h)i++;const a=crownLine[i-1],b=crownLine[i],t=Math.max(0,Math.min(1,(h-a[0])/(b[0]-a[0])));crown=a[1]+(b[1]-a[1])*t;}
  let target=crown+slopeX*(x-crestX)-C.convexity*Math.pow((x-crestX)/C.crownHalfWidth,2);
  if(C.sideTurns){const [inner,outerTurn]=C.sideTurns,dx=x-crestX;
   const turn=(distance,width)=>{const a=Math.max(0,distance);return a<width?a*a/(2*width):a-width/2;};
   target-=inner[1]*turn(-dx-inner[0],C.sideBevel)+outerTurn[1]*turn(dx-outerTurn[0],C.sideBevel);
  }
  const delta=Math.max(-C.limit,Math.min(C.limit,target-z))*weight;
  return v.addScaledVector(n,delta).toArray();
 }});
 geometry.userData[metadata]=(geometry.userData[metadata]||[]).concat({name:C.name,frame:'h along actual extended humeral rest axis; x transverse to this head facing normal; depth along that normal',angle:C.angle,crest:[hc,xc,dc],facingAnchors:anchors,slopeH,slopeX,limit:C.limit,...(crownLine?{crownLine}: {})});
 return geometry;
}
