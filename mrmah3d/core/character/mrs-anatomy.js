import { reconstructMrsChest126 } from './mrs-surgical-reconstruction.js';
/* Mrs. Mah. Authority: MRS_MAH_CLAY_FOUNDATION_ULTRA_REFERENCE_PACK_48P.pdf.
   Independent morphology on the live R121 loft / rig / hand framework.
   +Y up, +Z front, origin at the single lower point; units before stature scale.
   The two incompatible hip/waist ranges on p18 are recorded in CURRENT_STATE.
   The p11/p15 silhouette and explicit 1.75-2.10 front ratio take precedence. */
import {Vector3,Quaternion,Float32BufferAttribute} from '../../vendor/three/three.module.min.js';
import {rebuildMrsQuadCrown} from './mrs-quad-crown.js';
import { MALE } from './proportions.js';
import { loft, facetedGeometry } from './forge.js';
import { applyMrsCrystalPlanes } from './mrs-crystal-planes.js';
import { authorMrsLowerBody, authorMrsAbdominalPlanes } from './mrs-authoring.js';
import { resolveMrsKneeTransition } from './mrs-knee-transition.js';
import {shapeMrsBodyMuscles,finishMrsBodyNormals} from './mrs-body-muscle-volumes.js';
import {noteMrsBodyPlanes} from './mrs-muscle-plane-notes.js';
import {supportMrsShoulderTorso} from './mrs-shoulder-seat.js';
import {continueMrsNeckIntoCranium} from './mrs-attachment-continuity.js';
import {roundMrsPosteriorBellies} from './mrs-posterior-roundness.js';
import {roundMrsBodyM14} from './mrs-body-roundness.js';
import {relaxMrsShoulderFlow} from './mrs-shoulder-flow.js';
import {liftMrsSuperiorShoulder} from './mrs-superior-shoulder-flow.js';
import {continueMrsShoulderEnvelope} from './mrs-shoulder-envelope-return.js';
import {consolidateMrsShoulderReturn} from './mrs-shoulder-return-consolidation.js';

export const MRS_MAH = {
  stature: .95,
  armLateralScale: .96,
  // y, half-width, anterior support, posterior support, posterior axis offset
  profile: [
    [0,0,0,0,0], [.18,.038,.034,.033,0], [.40,.095,.080,.085,0],
    [.60,.175,.135,.150,0], [.78,.248,.180,.205,-.002],
    [.97,.343,.226,.245,-.010], [1.15,.408,.245,.272,-.012],
    [1.28,.414,.243,.273,-.012], [1.42,.367,.221,.240,-.008],
    [1.485,.315,.204,.214,-.003],
    [1.54,.266,.188,.184,0], [1.64,.214,.176,.165,0],
    [1.72,.229,.191,.176,0], [1.82,.280,.226,.195,0],
    [1.94,.343,.258,.215,0], [2.045,.355,.248,.216,0],
    [2.12,.371,.209,.202,-.004], [2.18,.247,.145,.142,-.010],
    [2.25,.119,.094,.096,-.027], [2.29,.097,.085,.087,-.040],
    [2.318,.069,.080,.082,-.044], [2.335,.052,.075,.077,-.044]
  ],
  bust: { x:.177, y:1.969, width:.185, height:.149, projection:.156, sternumRadius:.022 },
  glutes: { x:.180, y:1.310, width:.208, height:.225, projection:.110 },
  neckBearing: { startY:2.290, topY:2.335, tipHalfWidth:.032, depthScale:.56, forwardShift:.014 },
  eyes: { diameterScale:1.18, lashes:5 },
  planes: .70,
  recesses: .65
};

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const gauss=(v)=>Math.exp(-v*v);
// M16/M20: lifted posterior stock resolves through a controlled lower return.
// The crown and upper support remain the accepted Gaussian; its lower tail
// meets the hamstring foundation with zero value, tangent and curvature.
function gluteSupport(v){
  const root=-1.20,join=-.40;
  if(v>=join)return gauss(v);if(v<=root)return 0;
  const value=gauss(join),length=join-root;
  const tangent=-2*join*value*length;
  const curvature=(4*join*join-2)*value*length*length;
  const t=(v-root)/length;
  return t*t*t*((10*value-4*tangent+.5*curvature)
    +t*((-15*value+7*tangent-curvature)+t*(6*value-3*tangent+.5*curvature)));
}
// M8 lower support cage. Match value, tangent and curvature to the retained
// crown, and meet the chest wall with zero displacement/tangent/curvature.
// Extending only the lower return avoids the steep compact-cap rim that made
// neighbouring physical faces and smooth normals disagree by up to 70 degrees.
export function bustSupport(bx,by,root=-1.20){
  const q=Math.max(0,1-bx*bx);if(q===0)return 0;
  const extent=Math.sqrt(q),v=by/extent;
  const cap=t=>{const f=Math.max(0,q*(1-t*t));return Math.sqrt(f)*smooth(0,.38,f);};
  const join=-.25;
  if(v>=join)return cap(v);
  if(v<=root)return 0;
  const h=.0001,length=join-root,value=cap(join);
  const tangent=(cap(join+h)-cap(join-h))/(2*h)*length;
  const curvature=(cap(join+h)-2*value+cap(join-h))/(h*h)*length*length;
  const t=(v-root)/length;
  const a=10*value-4*tangent+.5*curvature;
  const b=-15*value+7*tangent-curvature;
  const c=6*value-3*tangent+.5*curvature;
  return t*t*t*(a+t*(b+t*c));
}
// Shape-preserving Hermite interpolation: a profile station never overshoots
// into a calf bulb, a pinched waist, or a shelf between its neighbours.
export function profileAt(y,column){
  const rows=MRS_MAH.profile,n=rows.length;
  let i=0;while(i<n-2&&y>rows[i+1][0])i++;
  const slope=j=>(rows[j+1][column]-rows[j][column])/(rows[j+1][0]-rows[j][0]);
  const tangent=j=>{
    if(j===0)return slope(0);if(j===n-1)return slope(n-2);
    const a=slope(j-1),b=slope(j);if(a*b<=0)return 0;
    const ha=rows[j][0]-rows[j-1][0],hb=rows[j+1][0]-rows[j][0];
    const w1=2*hb+ha,w2=hb+2*ha;return (w1+w2)/(w1/a+w2/b);
  };
  const h=rows[i+1][0]-rows[i][0],t=clamp((y-rows[i][0])/h),t2=t*t,t3=t2*t;
  return (2*t3-3*t2+1)*rows[i][column]+(t3-2*t2+t)*h*tangent(i)
    +(-2*t3+3*t2)*rows[i+1][column]+(t3-t2)*h*tangent(i+1);
}

export function mrsSurface(a,s,resolveThighPlanes=true,resolveOuterThigh=true,resolveInnerThigh=true,resolvePosteriorSweep=true,resolveLumbar=true,resolveLowerCaps=true,resolveHamstringCaps=true){
  const y=s.y,c=Math.cos(a),f=Math.sin(a),front=Math.max(0,f),back=Math.max(0,-f);
  const w=profileAt(y,1),x=c*w;
  let z=f*(f>=0?profileAt(y,2):profileAt(y,3))+profileAt(y,4);
  const B=MRS_MAH.bust,G=MRS_MAH.glutes;
  // These are displacements of one closed chest wall, never added spheres.
  // A differentiable sternum return replaces the absolute-value cusp. The
  // two crown supports remain distinct; their shared centre is rounded.
  const bustX=Math.hypot(x,B.sternumRadius);
  const bx=(bustX-B.x)/B.width,by=(y-B.y)/B.height;
  const bustFootprint=Math.max(0,1-bx*bx-by*by);
  // M46: extend only the lateral lower return into the oblique sidewall.
  // The same C2 support reaches a slightly lower root while keeping its
  // crown join, tangent and curvature. No second mass or deeper groove.
  const lateralReturn=.20*smooth(.190,.270,Math.abs(x))
    *(1-smooth(.310,.355,Math.abs(x)));
  z+=B.projection*bustSupport(bx,by,-1.20-lateralReturn)*Math.pow(front,.45);
  z-=.009*gauss(x/.048)*gauss((y-1.985)/.16)*front;
  // M26: paired clavicular roofs follow the existing shoulder sweep, with
  // a broader lower support return and a small central sternal notch.
  // Blend the old stock outside this finite upper-chest band.
  const clavicleOld=.011*gauss((y-(2.167-.16*Math.abs(x)))/.023)*smooth(.025,.075,Math.abs(x))*front;
  const clavicleBand=smooth(2.075,2.105,y)*(1-smooth(2.21,2.26,y));
  const clavicleY=2.166-.10*Math.abs(x)-.20*x*x;
  const clavicleDy=y-clavicleY;
  const clavicleRadius=Math.abs(clavicleDy)/(clavicleDy>=0?.032:.048);
  const clavicleSpan=smooth(.027,.067,Math.abs(x))*(1-smooth(.29,.37,Math.abs(x)))*front;
  const clavicleRoof=.024*(1-smooth(.16,1.10,clavicleRadius));
  const clavicleReturn=.004*gauss((clavicleDy+.042)/.020);
  z+=clavicleOld*(1-clavicleBand)+(clavicleRoof-clavicleReturn)*clavicleSpan*clavicleBand;
  z-=.010*gauss(x/.032)*gauss((y-2.172)/.025)*clavicleBand*front;
  // Restrained abdominal rhythm and long oblique-to-pelvis transition.
  const abs=gauss((Math.abs(x)-.070)/.050);
  z+=abs*(.025*gauss((y-1.79)/.052)+.022*gauss((y-1.69)/.052)
    +.014*gauss((y-1.58)/.072))*front*front;
  z-=.007*gauss(x/.029)*gauss((y-1.73)/.18)*front;
  z+=.061*gauss((Math.abs(x)-.186)/.145)*gauss((y-1.06)/.34)*front;
  z-=.014*gauss(x/.038)*gauss((y-1.08)/.30)*front;
  // Full posterior bellies flow into a monotone hamstring / terminal taper.
  z-=G.projection*gauss((Math.abs(x)-G.x)/G.width)
    *gluteSupport((y-G.y)/G.height)*Math.pow(back,.8);
  // M32: the central split keeps its accepted middle depth, then narrows
  // into a finite lens at each end. This releases the sacral and fused
  // hamstring surfaces without widening the groove or changing the crowns.
  const splitStock=.034*gauss(x/.038)*gauss((y-1.31)/.205);
  const splitEnvelope=smooth(1.075,1.235,y)*(1-smooth(1.395,1.580,y));
  const splitTaper=.034*gauss(x/(.020+.018*splitEnvelope))
    *gauss((y-1.31)/.205)*splitEnvelope;
  const splitEdit=smooth(1.00,1.070,y)*(1-smooth(1.580,1.680,y))
    *(1-smooth(.050,.080,Math.abs(x)));
  z+=(splitStock+(splitTaper-splitStock)*splitEdit)*back;
  // Lifted glute apex, thin central split and paired lumbar support. The added
  // stock sits high; the hamstring/terminal cage remains a descending sweep.
  const lumbarAxis=.078+.24*(1.60-y);
  const lumbarStock=.009*gauss((Math.abs(x)-lumbarAxis)/.061)*gauss((y-1.535)/.145);
  // M45: paired capped lumbar supports fan down into the upper glutes.
  // Replace only their finite inner stock with a broad roof and a longer
  // lateral return. The sacral centre and glute crowns remain unchanged.
  const lumbarBand=resolveLumbar?smooth(1.405,1.500,y)*(1-smooth(1.720,1.825,y)):0;
  const lumbarFan=.072+.36*clamp(1.700-y,0,.30);
  const lumbarWidth=.050+.10*clamp(1.700-y,0,.30);
  const lumbarU=Math.abs(Math.abs(x)-lumbarFan)/lumbarWidth;
  const lumbarRoof=.018*(1-smooth(.16,1,lumbarU));
  const lumbarSpan=smooth(.030,.065,Math.abs(x))*(1-smooth(.245,.285,Math.abs(x)));
  z-=(lumbarStock+(lumbarRoof-lumbarStock)*lumbarBand*lumbarSpan)*back;
  // Athletic scapular and erector support, shallower than the male mold.
  z-=.025*gauss((Math.abs(x)-.166)/.122)*gauss((y-2.00)/.145)*back;
  const erectorStock=.015*gauss((Math.abs(x)-.056)/.033);
  const erectorRefined=.010*gauss((Math.abs(x)-.056)/.041);
  const erectorBand=smooth(1.62,1.77,y)*(1-smooth(2.10,2.20,y));
  z-=(erectorStock+(erectorRefined-erectorStock)*erectorBand)*gauss((y-1.85)/.24)*back;
  z+=.005*gauss(x/.027)*gauss((y-1.96)/.22)*back;
  // Broad anatomical facing surfaces. Each has a local target plane with a
  // smooth return into the underlying shell; no random faceting or overlays.
  const ax=Math.abs(x),mixPlane=(target,weight,limit=.026)=>{
    z+=clamp(target-z,-limit,limit)*weight*MRS_MAH.planes;
  };
  const roundedAbs=t=>Math.sqrt(t*t+.003*.003)-.003;
  // M23: restrained abdominal crown planes sit inside the retained soft
  // muscle stock. Their staggered lower slopes lead into the pelvic face.
  // A common broad return keeps these from becoming separate armour blocks.
  for(const [abY,abHeight,abLift] of [[1.790,.067,.027],[1.686,.069,.025],[1.574,.092,.020]]){
    const abX=ax-(.062+.018*(y-abY)/abHeight);
    const abRadius=roundedAbs(abX)/.063+roundedAbs(y-abY)/abHeight;
    const abFacing=profileAt(y,2)+abLift-.11*roundedAbs(abX)+.08*(y-abY);
    mixPlane(abFacing,(1-smooth(.24,1.12,abRadius))*front*front*.68
      *(1-smooth(1.827,1.865,y)),.023);
  }
  // M22: long oblique supports guide the compressed waist into the pelvis.
  // The side silhouette stays in the accepted profile. Facing stock and its
  // inner return live in the same shell, with no separate plates or belts.
  const obliqueAxis=.160+.75*(y-1.68)**2+.30*Math.max(0,1.66-y);
  const obliqueBand=smooth(1.40,1.49,y)*(1-smooth(1.78,1.85,y));
  const obliqueRadius=((ax-obliqueAxis)/.069)**2;
  mixPlane(.88*profileAt(y,2)-.72*(ax-obliqueAxis),
    (1-smooth(.18,1.10,obliqueRadius))*obliqueBand*smooth(.40,.72,front),.029);
  // A broad lower abdominal face closes the torso above the hip bloom.
  // The paired V returns taper out before touching the centreline.
  const pelvicWidth=.042+.55*clamp(y-1.40,0,.24);
  const pelvicBand=smooth(1.38,1.47,y)*(1-smooth(1.62,1.72,y));
  mixPlane(profileAt(y,2)+.018-.20*ax,
    (1-smooth(.35,1.15,ax/pelvicWidth))*pelvicBand*front,.022);
  const quad=smooth(.52,.78,y)*(1-smooth(1.27,1.48,y));
  const quadAxis=.115+.13*clamp((y-.65)/.65);
  const quadRadius=Math.abs(ax-quadAxis)/.15+Math.abs(y-1.11)/.35;
  // M21: stock for the thigh crown is resolved into a longer facing plane,
  // with a shallow medial falloff and the retained outer support plane.
  mixPlane(.298+.18*(y-1.10)-.24*roundedAbs(ax-quadAxis)-.035*roundedAbs(y-1.13),
    (1-smooth(.30,1.12,quadRadius))*quad*smooth(.4,.78,front),.042);
  mixPlane(.181+.10*(y-1.10)-.63*(ax-.30),
    gauss((ax-(quadAxis+.12))/.066)*quad*smooth(.25,.57,front),.029);
  // A broad target cage, rather than another bump laid over an elliptical
  // shell. Its four facing surfaces share one smooth perimeter transition.
  const kneeY=y-.772,kneeRadius=ax/.170+Math.abs(kneeY)/.220;
  const kneePlane=.212+.25*kneeY-.26*roundedAbs(x)-.10*roundedAbs(kneeY);
  z+=(kneePlane-z)*(1-smooth(.40,1.05,kneeRadius))*smooth(.55,.9,front);
  // Paired patellar faces share the same continuous foundation. The upper
  // crown turns into a shorter support face, then two slim tendon ridges
  // converge into the retained terminal taper; no new width maximum.
  // M19: elongated diamond caps with a calm primary face and shorter lower
  // support face. The angled perimeter belongs to the same shell; two round
  // bump masks formerly dissolved into the broad knee foundation.
  const patellaY=y-.792,patellaX=ax-(.081+.10*patellaY);
  const patellaRadius=roundedAbs(patellaX)/.078+roundedAbs(patellaY)/.123;
  const patellaPlane=.224+.48*patellaY-.14*roundedAbs(patellaX)
    -.24*Math.max(0,-patellaY);
  z+=(patellaPlane-z)*(1-smooth(.30,1.22,patellaRadius))*smooth(.60,.93,front);
  const tendonAxis=.022+.085*clamp((y-.30)/.52);
  const tendonDistance=Math.abs(ax-tendonAxis);
  const tendonRoof=.012*(1-smooth(.006,.033,tendonDistance));
  z+=tendonRoof*smooth(.22,.40,y)*(1-smooth(.70,.80,y))*front;
  const adductorAxis=.035+.05*clamp((y-.8)/.6);
  z-=.006*gauss((ax-adductorAxis)/.018)*smooth(.79,.92,y)
    *(1-smooth(1.35,1.49,y))*front;
  // Bust crowns face forward, with their lateral support turning around the
  // rib cage. Mask stays inside the breast footprint and preserves its rim.
  mixPlane(.377-.13*(ax-.18)+.075*(y-1.97),
    smooth(.34,.74,bustFootprint)*front*.50,.018);
  // M29: resolve the paired crowns into broad, slightly outward-facing
  // terminal planes, supported by a shorter lower return. The old shell
  // reaches its widest projection near the sternum; bounded lateral stock
  // lets each mass carry an apex without replacing the integrated chest wall.
  const bustCapRadius=roundedAbs(ax-.164)/.153+roundedAbs(y-1.975)/.133;
  const bustCapBand=smooth(1.820,1.935,y)*(1-smooth(2.040,2.075,y));
  const bustCapSpan=smooth(.035,.075,ax)*(1-smooth(.275,.325,ax))*front;
  mixPlane(.397-.11*roundedAbs(ax-.170)+.065*(y-1.970),
    (1-smooth(.28,1.10,bustCapRadius))*bustCapBand*bustCapSpan*.90,.040);
  const bustReturnY=1.902+.32*(ax-.164)**2;
  const bustReturnRadius=((ax-.164)/.150)**2+((y-bustReturnY)/.046)**2;
  mixPlane(.369+1.10*(y-1.910)-.16*roundedAbs(ax-.164),
    (1-smooth(.14,1.10,bustReturnRadius))*bustCapBand*bustCapSpan*.50,.030);
  const scapY=y-2.01,scapX=ax-.165-.26*scapY;
  const scapRadius=Math.abs(scapX)/.162+Math.abs(scapY)/.190;
  // M24: the scapular facing cage follows the back's longitudinal curve.
  // Lower cap edges and a longer return replace the raised diamond rim.
  const scapPlane=-profileAt(y,3)-.025+.36*roundedAbs(scapX)+.12*roundedAbs(scapY);
  z+=(scapPlane-z)*(1-smooth(.30,1.18,scapRadius))*smooth(.40,.75,back)*.88;
  const latAxis=.195+.32*(y-1.87);
  mixPlane(-.222+.44*(ax-latAxis)-.20*(y-1.87),
    gauss((ax-latAxis)/.069)*gauss((y-1.87)/.145)*back,.035);
  mixPlane(-.350+.39*(ax-.18)-.075*(y-1.35),
    gauss((ax-.19)/.14)*gauss((y-1.39)/.12)*back*.7,.018);
  const gluteCrown=((ax-.170)/.145)**2+((y-1.310)/.150)**2;
  mixPlane(-.362+.24*(ax-.170)+.055*(y-1.310),
    (1-smooth(.08,.95,gluteCrown))*back*.42,.018);
  // M20: a broad lower support face turns each capped posterior mass into
  // the hamstring sweep. Its return curves upward at the inner/outer edges.
  const gluteSupportY=1.155+1.70*(ax-.180)**2;
  const gluteSupportRadius=((ax-.180)/.173)**2+((y-gluteSupportY)/.082)**2;
  mixPlane(-.292-.78*(y-1.155)+.22*roundedAbs(ax-.180),
    (1-smooth(.14,1.0,gluteSupportRadius))*back*.62,.024);
  // M33: broad hamstring faces follow the existing longitudinal stock.
  // Anchor their cross-section planes to the elliptical shell plus glute
  // support, rather than adding a raised patch with a short lower falloff.
  const hamstringAxis=.142+.28*(y-.940);
  const hamstringWidth=.105+.06*clamp(y-.86,0,.26);
  const hamstringRadius=roundedAbs(ax-hamstringAxis)/hamstringWidth
    +roundedAbs(y-1.005)/.200;
  const hamstringBand=smooth(.860,.925,y)*(1-smooth(1.075,1.120,y));
  const hamstringSpan=smooth(.080,.115,ax)*(1-smooth(.280,.335,ax))
    *smooth(.50,.85,back);
  if(hamstringBand&&hamstringSpan){
    const anchorBack=Math.sqrt(Math.max(.01,1-(hamstringAxis/w)**2));
    const anchor=-anchorBack*profileAt(y,3)+profileAt(y,4)
      -G.projection*gauss((hamstringAxis-G.x)/G.width)
        *gluteSupport((y-G.y)/G.height)*Math.pow(anchorBack,.8);
    const crossSlope=profileAt(y,3)*hamstringAxis/(w*w*anchorBack);
    mixPlane(anchor+.006+crossSlope*(ax-hamstringAxis),
      (1-smooth(.30,1.10,hamstringRadius))*hamstringBand*hamstringSpan*.94,.014);
  }
  // M25: taper the bearing inside the diamond and route paired front neck
  // supports upward/outward from their shared clavicular root. The finite
  // band preserves the previously accepted chest and the top bearing depth.
  const neckOriginal=.010*gauss((ax-(.061+.20*(2.27-y)))/.023)*gauss((y-2.23)/.10)*front;
  const neckBand=smooth(2.12,2.17,y)*(1-smooth(2.29,2.335,y));
  const neckAxis=.022+.31*clamp(y-2.14,0,.17);
  z+=neckOriginal*(1-neckBand);
  mixPlane(profileAt(y,2)+profileAt(y,4)+.012-.50*roundedAbs(ax-neckAxis),
    (1-smooth(.16,1.10,((ax-neckAxis)/.030)**2))*neckBand*front,.026);
  z-=.006*gauss(x/.027)*neckBand*front;
  // Fine channels are physical displacements on the existing support. The
  // under-bust is already clear from mass; its extra return is only .002.
  const underY=B.y-B.height*1.14*Math.sqrt(Math.max(0,1-bx*bx));
  const under=.002*gauss((y-underY)/.016)*smooth(.035,.08,ax)*(1-smooth(.31,.37,ax))*front;
  const oblique=.007*gauss((ax-(obliqueAxis-.044))/.020)*obliqueBand*front;
  const pelvicV=.006*gauss((y-(1.40+.70*ax+.40*ax*ax))/.022)
    *smooth(.025,.065,ax)*(1-smooth(.225,.295,ax))*pelvicBand*front;
  const gluteReturn=.004*gauss((y-(1.478-.26*ax))/.022)
    *smooth(.07,.13,ax)*(1-smooth(.28,.37,ax))*back;
  const gluteUnder=.005*gauss((y-(1.135+2.4*(ax-.18)**2))/.019)
    *smooth(.04,.09,ax)*(1-smooth(.30,.37,ax))*back;
  // M31: a narrow under-glute floor and a shallow upper support edge.
  // The medial/lateral ends close within the existing posterior mass; the
  // glute crown and centre split stay outside the finite edit footprint.
  const gluteUnderBand=smooth(1.05,1.09,y)*(1-smooth(1.22,1.255,y));
  // M68: the M31 broad floor plus raised lip duplicated the later geometric
  // glute/hamstring support and M57 localized convergence pockets. Let the
  // existing supported masses own this return; preserve the legacy falloff
  // outside the bounded authoring band and retain actual pocket geometry.
  const gluteUnderChannel=gluteUnder*(1-gluteUnderBand);
  const knee=.005*gauss((y-(.708+.68*Math.abs(ax-.073)))/.016)
    *gauss((ax-.081)/.065)*front*smooth(.58,.70,y);
  const kneeUpper=.004*gauss((y-(.891-.35*Math.abs(ax-.090)))/.018)
    *gauss((ax-.090)/.076)*front;
  // M30: finite channel floors with tapered ends replace the diffuse knee
  // recesses inside this band. A shallow lip joins the existing patellar face;
  // the paired tendon-edge returns die out before the terminal taper.
  const kneeChannelBand=smooth(.56,.64,y)*(1-smooth(.94,1.01,y));
  const kneeChannelSpan=smooth(.021,.053,ax)*(1-smooth(.134,.181,ax))*front;
  const kneeLowerY=.708+.68*roundedAbs(ax-.073);
  const kneeUpperY=.891-.35*roundedAbs(ax-.090);
  const kneeFloor=.008*(1-smooth(.004,.025,Math.abs(y-kneeLowerY)))*kneeChannelSpan;
  const kneeUpperFloor=.006*(1-smooth(.004,.022,Math.abs(y-kneeUpperY)))*kneeChannelSpan;
  const kneeReturnLip=.0025*(1-smooth(.004,.019,Math.abs(y-kneeLowerY-.030)))*kneeChannelSpan;
  const kneeChannels=(knee+kneeUpper)*(1-kneeChannelBand)
    +(kneeFloor+kneeUpperFloor-kneeReturnLip)*kneeChannelBand;
  const tendonChannelBand=smooth(.36,.46,y)*(1-smooth(.65,.72,y));
  const tendonChannel=.0042*(1-smooth(.003,.014,Math.abs(ax-tendonAxis-.026)))
    *tendonChannelBand*front;
  z+=MRS_MAH.recesses*(-under-oblique-pelvicV+gluteReturn+gluteUnderChannel-kneeChannels-tendonChannel);
  // M47: finite facing planes tighten the existing patella and calf stock.
  // Use section chords, not fixed-depth patches: the longitudinal taper and
  // apex envelopes remain authored by the accepted shell. Patellar returns
  // stay inside the two channel floors; the rear calf faces converge toward
  // the single point without adding an isolated calf volume.
  if(resolveLowerCaps&&y>.340&&y<.880){
    const stock=at=>mrsSurface((front>0?1:-1)*Math.acos(clamp(at/w,-1,1)),
      {y},false,false,false,false,false,false)[2];
    if(front>0){
      const centre=.081+.10*(y-.792),halfSpan=.058;
      const t=(ax-centre+halfSpan)/(2*halfSpan);
      const across=smooth(0,.18,t)*(1-smooth(.82,1,t));
      const lower=.708+.68*roundedAbs(ax-.073);
      const upper=.891-.35*roundedAbs(ax-.090);
      const band=smooth(.026,.055,y-lower)*smooth(.026,.052,upper-y);
      const weight=across*band*smooth(.60,.93,front);
      if(weight){
        const low=stock(centre-halfSpan),high=stock(centre+halfSpan);
        z-=Math.min(.010,Math.max(0,z-(low+(high-low)*t)))*weight;
      }
    }else if(back>0){
      const inside=.30*w,outside=.92*w,t=(ax-inside)/(outside-inside);
      const across=smooth(0,.18,t)*(1-smooth(.82,1,t));
      const band=smooth(.340,.470,y)*(1-smooth(.680,.820,y));
      const weight=across*band;
      if(weight){
        const low=stock(inside),high=stock(outside);
        z+=Math.min(.014,Math.max(0,(low+(high-low)*t)-z))*weight;
      }
    }
  }

  // M40: cap the thigh crown with a cross-section chord sampled from the
  // accepted stock. This follows its longitudinal flow and cannot add a
  // raised patch. Finite returns preserve the knee channels, hip perimeter
  // and inner compression line. The same existing rings carry the planes.
  const thighBand=smooth(1.010,1.100,y)*(1-smooth(1.300,1.430,y));
  if(resolveThighPlanes&&front>0&&thighBand){
    const centre=.115+.13*clamp((y-.65)/.65);
    const halfSpan=.080+.020*clamp((y-1.01)/.35);
    const t=(ax-centre+halfSpan)/(2*halfSpan);
    const across=smooth(0,.22,t)*(1-smooth(.78,1,t));
    const weight=across*thighBand*smooth(.55,.80,front);
    if(weight){
      const stock=at=>mrsSurface(Math.acos(clamp(at/w,-1,1)),{y},false,false,false)[2];
      const inner=stock(centre-halfSpan),outer=stock(centre+halfSpan);
      const chord=inner+(outer-inner)*t;
      z-=Math.min(.014,Math.max(0,z-chord))*weight*.95;
    }
  }
  // M41: turn the outer thigh into a long support plane which converges
  // toward the knee. Sample the retained crown stock at the two lateral
  // boundaries; trim inward only. Keep the crown footprint, widest side
  // vertices and patellar channels outside the finite transition band.
  const outerBand=smooth(.850,.980,y)*(1-smooth(1.210,1.395,y));
  if(resolveOuterThigh&&front>0&&outerBand){
    const crownEdge=.115+.13*clamp((y-.65)/.65)+.080+.020*clamp((y-1.01)/.35);
    const inner=Math.max(.81*w,crownEdge+.004),outer=.995*w;
    const t=(ax-inner)/(outer-inner);
    const weight=smooth(0,.18,t)*(1-smooth(.82,1,t))*outerBand;
    if(outer>inner&&weight){
      const stock=at=>mrsSurface(Math.acos(clamp(at/w,-1,1)),{y},true,false,false)[2];
      const inside=stock(inner),outside=stock(outer);
      const chord=inside+(outside-inside)*t;
      z-=Math.min(.014,Math.max(0,z-chord))*weight*.85;
    }
  }
  // M42: the fused inner-thigh corridor rises into paired medial support
  // planes. Their targets join existing stock beside the centre valley
  // to the retained crown's inner edge. Finite returns keep the centre
  // seam and patellar floor unchanged; no additional longitudinal groove.
  const innerBand=smooth(1.010,1.100,y)*(1-smooth(1.330,1.460,y));
  if(resolveInnerThigh&&front>0&&innerBand){
    const crownStart=.115+.13*clamp((y-.65)/.65)-.080-.020*clamp((y-1.01)/.35);
    const inside=.018,outside=crownStart-.003;
    const t=(ax-inside)/(outside-inside);
    const weight=smooth(0,.18,t)*(1-smooth(.85,1,t))*innerBand;
    if(outside>inside&&weight){
      const stock=at=>mrsSurface(Math.acos(clamp(at/w,-1,1)),{y},true,true,false)[2];
      const low=stock(inside),high=stock(outside);
      const ramp=low+(high-low)*t;
      z-=Math.min(.010,Math.max(0,z-ramp))*weight*.88;
    }
  }
  // M44: a long outer posterior support turns the lifted glute into the
  // thigh sweep. Its section chord is anchored to the retained shell, with
  // inward-only motion and soft terminal returns. The central crowns,
  // hamstring core and the narrow under-glute floor keep their stock.
  const posteriorBand=smooth(.880,.995,y)*(1-smooth(1.120,1.210,y));
  if(resolvePosteriorSweep&&back>0&&posteriorBand){
    const inside=Math.max(.270,.70*w),outside=.995*w;
    const t=(ax-inside)/(outside-inside);
    // Signed distance confines the plane below the supported mass. The
    // initial two-sided crease mask cut an angular patch into its crown.
    const belowCrease=1.135+2.4*(ax-.180)**2-y;
    const creaseReturn=smooth(.028,.085,belowCrease);
    const weight=smooth(0,.20,t)*(1-smooth(.83,1,t))*posteriorBand
      *smooth(.270,.320,ax)*creaseReturn;
    if(outside>inside&&weight){
      const stock=at=>mrsSurface(-Math.acos(clamp(at/w,-1,1)),{y},false,false,false,false)[2];
      const low=stock(inside),high=stock(outside);
      const chord=low+(high-low)*t;
      z+=Math.min(.022,Math.max(0,chord-z))*weight*.95;
    }
  }
  // M48: paired hamstring facing planes converge into the accepted calf.
  // Chords follow the existing posterior stock at each height, preserving
  // its longitudinal support instead of introducing a fixed-depth patch.
  // Finite inner/outer returns leave the fused centre, lateral support and
  // under-glute channel outside this edit. No added volume or separate legs.
  const hamstringFacingBand=smooth(.820,.935,y)*(1-smooth(1.010,1.090,y));
  if(resolveHamstringCaps&&back>0&&hamstringFacingBand){
    const along=clamp(y-.820,0,.270);
    const inside=.075+.12*along,outside=.205+.22*along;
    const t=(ax-inside)/(outside-inside);
    const weight=smooth(0,.18,t)*(1-smooth(.82,1,t))*hamstringFacingBand;
    if(weight){
      const stock=at=>mrsSurface(-Math.acos(clamp(at/w,-1,1)),{y},
        false,false,false,true,true,true,false)[2];
      const low=stock(inside),high=stock(outside);
      z+=Math.min(.010,Math.max(0,low+(high-low)*t-z))*weight;
    }
  }
  // M36: bury the terminal bearing inside the actual diamond casing.
  // The old elliptical cap protruded behind the lower chamfer. Only the
  // final .045 of the support narrows and shifts forward; the lower neck,
  // clavicles and face remain untouched, with no separate collar mesh.
  const N=MRS_MAH.neckBearing,bearingWeight=smooth(N.startY,N.topY,y);
  if(bearingWeight){
    const fittedX=x*(1+(N.tipHalfWidth/profileAt(N.topY,1)-1)*bearingWeight);
    const centre=profileAt(y,4);
    z=centre+N.forwardShift*bearingWeight+(z-centre)*(1+(N.depthScale-1)*bearingWeight);
    return [fittedX,y,z];
  }
  return [x,y,z];
}

// M12: route existing chest rows along the supported lower footprint. The
// curve is sampled by its anatomy, rather than splitting arbitrary edges.
// Monotone root-to-crown interpolation preserves row order and triangle count.
function supportedTorsoSample(a,s){
  const f=Math.sin(a),weight=smooth(.50,.90,f);
  // M31: existing rear rows follow the under-glute return, preserving the
  // boundary rows, angular count and analytic glute/hamstring foundation.
  const rearWeight=smooth(.40,.80,-f);
  if(rearWeight&&s.y>1.017&&s.y<1.255){
    let y=s.y;
    for(let i=0;i<4;i++){
      const ax=Math.abs(Math.cos(a)*profileAt(y,1));
      const span=smooth(.055,.115,ax)*(1-smooth(.280,.355,ax));
      const target=1.135+2.4*(ax-.180)**2;
      const mapped=s.y<=1.125
        ?1.017+(target-1.017)*(s.y-1.017)/.108
        :target+(1.255-target)*(s.y-1.125)/.130;
      y=s.y+(mapped-s.y)*rearWeight*span;
    }
    return mrsSurface(a,{...s,y});
  }
  // M30: route existing front knee rows through the channel centre-lines.
  // Piecewise monotone charts retain their boundary rows and triangle count.
  // The underlying anatomical surface is sampled, not replaced or subdivided.
  if(weight&&s.y>.621&&s.y<.945){
    let y=s.y;
    for(let i=0;i<4;i++){
      const ax=Math.abs(Math.cos(a)*profileAt(y,1));
      const span=smooth(.021,.053,ax)*(1-smooth(.134,.181,ax));
      const upper=s.y>.801,lo=upper?.801:.621,hi=upper?.945:.801;
      const sourceCentre=upper?.873:.729;
      const rounded=t=>Math.hypot(t,.003)-.003;
      const targetCentre=upper?.891-.35*rounded(ax-.090):.708+.68*rounded(ax-.073);
      const mapped=s.y<=sourceCentre
        ?lo+(targetCentre-lo)*(s.y-lo)/(sourceCentre-lo)
        :targetCentre+(hi-targetCentre)*(s.y-sourceCentre)/(hi-sourceCentre);
      y=s.y+(mapped-s.y)*weight*span;
    }
    return mrsSurface(a,{...s,y});
  }
  if(!weight||s.y<1.79||s.y>2.008)return mrsSurface(a,s);
  const t=(s.y-1.79)/(2.008-1.79),B=MRS_MAH.bust;
  let y=s.y;
  for(let i=0;i<4;i++){
    const x=Math.hypot(Math.cos(a)*profileAt(y,1),B.sternumRadius);
    const extent=Math.sqrt(Math.max(0,1-((x-B.x)/B.width)**2));
    const root=B.y-B.height*1.20*extent;
    const mapped=root+(2.008-root)*t;
    y=s.y+(mapped-s.y)*weight;
  }
  return mrsSurface(a,{...s,y});
}

function supportAngle(a,s){
  const d=Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2));
  if(Math.abs(d)>=Math.PI/2)return a;
  // Reallocate the same angular samples only around the inner return. The
  // derivative stays positive (.28 minimum); outer crowns retain their stock.
  const band=smooth(1.75,1.84,s.y)*(1-smooth(2.08,2.18,s.y));
  return a-.72*d*Math.exp(-((d/.28)**2))*band;
}

// Preserve the actual triangles crossing the M31 under-glute channel. An
// analytic zero-displacement strip alone does not protect a triangle whose
// lower corner still moves. Conservative curve/triangle bounds keep that
// entire support band fixed before the shared geometry rebuild below.
function protectPosteriorCrease(result){
  const p=result.positions,locked=new Set();let protectedFaces=0;
  for(const face of result.faces){
    const v=face.map(i=>p.slice(3*i,3*i+3));
    if(v.some(q=>q[2]>=0))continue;
    const ys=v.map(q=>q[1]),xs=v.map(q=>Math.abs(q[0]));
    if(Math.max(...ys)<1.05||Math.min(...ys)>1.255||Math.max(...xs)<.270)continue;
    const lo=Math.min(...xs),hi=Math.max(...xs);
    const curve=x=>1.135+2.4*(x-.180)**2;
    const minCurve=lo<=.180&&hi>=.180?1.135:Math.min(curve(lo),curve(hi));
    const maxCurve=Math.max(curve(lo),curve(hi));
    if(Math.min(...ys)<=maxCurve+.028&&Math.max(...ys)>=minCurve-.028){
      protectedFaces++;for(const id of face)locked.add(id);
    }
  }
  const lateralRelease=.45;
  let restoredVertices=0,releasedSupportVertices=0;
  for(const id of locked){
    const x=p[3*id],y=p[3*id+1],angle=-Math.acos(clamp(x/profileAt(y,1),-1,1));
    const stock=mrsSurface(angle,{y},false,false,false,false)[2];
    // M69: the M31 floor/lip is gone. Let the existing lateral support reach
    // its upper insertion; the slope solver below still rejects reversals.
    if(Math.abs(x)>.270&&Math.abs(x)<.370&&y>1.035&&y<1.190){
      if(Math.abs(p[3*id+2]-stock)>1e-12)releasedSupportVertices++;
      p[3*id+2]=stock+(p[3*id+2]-stock)*lateralRelease;
    }else if(Math.abs(p[3*id+2]-stock)>1e-12){p[3*id+2]=stock;restoredVertices++;}
  }
  // Constrain actual face slopes along the widening thigh, x'=x*w'/w.
  // A monotone angular column still permits reversals inside its triangles.
  // Start from the desired inward trims and only reduce them. The retained
  // surface is feasible, so this cannot force a new outward lump or groove.
  const groups=new Map(),owners=[],stockZ=[];
  for(let id=0;id<p.length/3;id++){
    const x=p[3*id],y=p[3*id+1],z=p[3*id+2];
    stockZ[id]=z;
    if(z>=0||y<.84||y>1.25||Math.abs(x)<.260)continue;
    const ratio=x/profileAt(y,1);
    const stock=mrsSurface(-Math.acos(clamp(ratio,-1,1)),{y},false,false,false,false)[2];
    stockZ[id]=stock;
    if(z-stock<=1e-12)continue;
    const key=[Math.abs(x),y].map(v=>Math.round(v*1e6)).join(',');
    if(!groups.has(key))groups.set(key,{ids:[],offset:z-stock,initial:z-stock});
    owners[id]=groups.get(key);owners[id].ids.push(id);
  }
  const constraints=[];
  for(const face of result.faces){
    if(!face.some(id=>owners[id]))continue;
    const v=face.map(i=>p.slice(3*i,3*i+3));
    const dx1=v[1][0]-v[0][0],dy1=v[1][1]-v[0][1],dx2=v[2][0]-v[0][0],dy2=v[2][1]-v[0][1];
    const determinant=dx1*dy2-dy1*dx2;if(Math.abs(determinant)<1e-10)continue;
    const cx=[(dy1-dy2)/determinant,dy2/determinant,-dy1/determinant];
    const cy=[(dx2-dx1)/determinant,-dx2/determinant,dx1/determinant];
    const ymin=Math.min(...v.map(q=>q[1])),ymax=Math.max(...v.map(q=>q[1]));
    const xmin=Math.min(...v.map(q=>q[0])),xmax=Math.max(...v.map(q=>q[0]));
    const velocities=[];
    for(let j=0;j<=8;j++){
      const y=ymin+(ymax-ymin)*j/8,h=.00001;
      const rate=(profileAt(y+h,1)-profileAt(y-h,1))/(2*h*profileAt(y,1));
      velocities.push(xmin*rate,xmax*rate);
    }
    for(const velocity of [Math.min(...velocities),Math.max(...velocities)]){
      const coefficients=cy.map((c,j)=>c+velocity*cx[j]);
      const stockSlope=face.reduce((sum,id,j)=>sum+coefficients[j]*stockZ[id],0);
      const adjustable=new Map();
      face.forEach((id,j)=>{if(owners[id])adjustable.set(owners[id],(adjustable.get(owners[id])||0)+coefficients[j]);});
      constraints.push({stockSlope,limit:Math.max(stockSlope,-.005),adjustable});
    }
  }
  const violation=c=>c.stockSlope+[...c.adjustable].reduce((s,[g,a])=>s+a*g.offset,0)-c.limit;
  let sweeps=0;
  for(;sweeps<192;sweeps++){
    let maximumViolation=0;
    for(const c of constraints){
      const error=violation(c);maximumViolation=Math.max(maximumViolation,error);
      if(error<=1e-9)continue;
      const active=[...c.adjustable].filter(([g,a])=>a>0&&g.offset>0);
      const norm=active.reduce((sum,[g,a])=>sum+a*a,0);
      for(const [g,a]of active)g.offset=Math.max(0,g.offset-error*a/norm);
    }
    if(maximumViolation<1e-7)break;
  }
  const maximumViolation=Math.max(0,...constraints.map(violation));
  if(maximumViolation>1e-6)throw new Error('Posterior support face constraints did not converge');
  let limitedVertices=0;
  for(const g of groups.values())for(const id of g.ids){
    if(g.offset<g.initial-1e-12)limitedVertices++;
    p[3*id+2]=stockZ[id]+g.offset;
  }
  return {method:'M69 lateral insertion release with retained mirror-coupled longitudinal slope constraints',protectedFaces,lockedVertices:locked.size,restoredVertices,releasedSupportVertices,lateralRelease,limitedVertices,constraints:constraints.length,sweeps:sweeps+1,maximumViolation};
}

// Cap the new supports against the accepted rear contour at each actual
// lumbar row. Keep the original extrema fixed; neighboring roofs may gain
// definition without producing a new bump in the side silhouette.
function capLumbarSupports(result){
  const p=result.positions,rows=new Map();
  for(let id=0;id<p.length/3;id++){
    const x=p[3*id],y=p[3*id+1],z=p[3*id+2];
    if(z>=0||y<=1.405||y>=1.825)continue;
    const stock=mrsSurface(-Math.acos(clamp(x/profileAt(y,1),-1,1)),{y},false,false,false,false,false)[2];
    if(!rows.has(y))rows.set(y,[]);rows.get(y).push({id,stock});
  }
  let capped=0,extrema=0;
  for(const row of rows.values()){
    const minimum=Math.min(...row.map(v=>v.stock));
    for(const v of row){
      const i=3*v.id+2;
      if(v.stock<=minimum+1e-12){p[i]=v.stock;extrema++;}
      else if(p[i]<minimum){p[i]=minimum;capped++;}
    }
  }
  return {method:'existing rear-row extrema preserved; lumbar roofs capped to retained projection',rows:rows.size,cappedVertices:capped,protectedExtrema:extrema};
}


// M52: three broad section planes carry each quadriceps into its patella.
// Sample the real accepted triangles at each vertex height; warped support rows
// cannot be treated as flat rings. Only inward trims in the anterior transition.
function resolveMrsQuadKneeFlow(result){
  const p=result.positions,stock=p.slice(),triangles=[];
  for(const f of result.faces){
    const v=f.map(i=>stock.slice(3*i,3*i+3));
    if(v.some(q=>q[2]<=0)||Math.max(...v.map(q=>q[1]))<.865||Math.min(...v.map(q=>q[1]))>1.195)continue;
    const [a,b,c]=v,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if(Math.abs(den)<1e-12)continue;
    triangles.push({a,b,c,den,xmin:Math.min(...v.map(q=>q[0])),xmax:Math.max(...v.map(q=>q[0])),
      ymin:Math.min(...v.map(q=>q[1])),ymax:Math.max(...v.map(q=>q[1]))});
  }
  const sample=(x,y)=>{
    let z=-Infinity;
    for(const {a,b,c,den,xmin,xmax,ymin,ymax}of triangles){
      if(x<xmin-1e-9||x>xmax+1e-9||y<ymin-1e-9||y>ymax+1e-9)continue;
      const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den;
      const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den;
      if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)z=Math.max(z,u*a[2]+v*b[2]+(1-u-v)*c[2]);
    }
    return z;
  };
  let changedVertices=0,maximumTrim=0;
  for(let id=0;id<stock.length/3;id++){
    const x=stock[3*id],y=stock[3*id+1],z=stock[3*id+2],ax=Math.abs(x);
    const band=smooth(.875,.950,y)*(1-smooth(1.090,1.185,y));
    if(z<=0||!band||ax<=.030)continue;
    const crown=.115+.13*clamp((y-.65)/.65),patella=.081+.10*(y-.792);
    const centre=patella+(crown-patella)*smooth(.860,1.140,y);
    const nodes=[Math.max(.030,centre-.075),centre-.022,centre+.022,Math.min(.91*profileAt(y,1),centre+.110)];
    if(ax<=nodes[0]||ax>=nodes[3]||nodes.some((v,i)=>i&&v<=nodes[i-1]))continue;
    let segment=0;while(segment<2&&ax>nodes[segment+1])segment++;
    const a=nodes[segment],b=nodes[segment+1];
    const za=sample(a,y),zb=sample(b,y);if(!Number.isFinite(za+zb))throw new Error('Mrs. Mah quad support misses its stock');
    const target=za+(zb-za)*(ax-a)/(b-a);
    const t=(ax-nodes[0])/(nodes[3]-nodes[0]);
    const across=smooth(0,.16,t)*(1-smooth(.84,1,t));
    const trim=Math.min(.011,Math.max(0,z-target))*band*across*.90;
    p[3*id+2]=z-trim;
    if(trim>1e-10)changedVertices++;maximumTrim=Math.max(maximumTrim,trim);
  }
  return {method:'inward-only three-face quadriceps flow sampled from actual stock triangles',
    regionY:[.875,.950,1.090,1.185],maximumAllowedTrim:.0099,changedVertices,maximumTrim};
}


// M56: cap the paired lower abdominal crowns inside their shared pelvic return.
// Retained triangle chords define each face; the seam and neighboring grooves stay fixed.
function resolveMrsLowerAbdomen(result){
  const p=result.positions,stock=p.slice(),faces=result.faces;
  const oblique=y=>.160+.75*(y-1.68)**2+.30*Math.max(0,1.66-y)-.044;
  const pelvic=x=>1.40+.70*Math.abs(x)+.40*x*x;
  const axis=y=>.062+.018*(y-1.574)/.092;
  const triangles=faces.map(f=>f.map(id=>stock.slice(id*3,id*3+3)))
    .filter(v=>v.every(q=>q[2]>0)&&Math.max(...v.map(q=>q[1]))>1.43&&Math.min(...v.map(q=>q[1]))<1.68);
  const sample=(x,y)=>{
    let z=-Infinity;
    for(const [a,b,c]of triangles){
      const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-12)continue;
      const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d;
      const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
      if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)z=Math.max(z,u*a[2]+v*b[2]+(1-u-v)*c[2]);
    }return z;
  };
  const locked=new Set();let protectedFaces=0;
  for(const f of faces){
    const v=f.map(id=>stock.slice(id*3,id*3+3)),ys=v.map(q=>q[1]),xs=v.map(q=>Math.abs(q[0]));
    if(v.some(q=>q[2]<=0)||Math.max(...ys)<1.43||Math.min(...ys)>1.68||Math.min(...xs)>.18)continue;
    const side=v.map(q=>Math.abs(q[0])-oblique(q[1])),base=v.map(q=>q[1]-pelvic(q[0]));
    const seam=Math.min(...xs)<.016;
    const groove=Math.min(...side)<=.012&&Math.max(...side)>=-.012;
    const pelvicReturn=Math.min(...base)<=.014&&Math.max(...base)>=-.014;
    const upperReturn=Math.max(...ys)>=1.65;
    if(seam||groove||pelvicReturn||upperReturn){protectedFaces++;for(const id of f)locked.add(id);}
  }
  const groups=new Map(),owners=[];
  for(let id=0;id<p.length/3;id++){
    const [x,y,z]=stock.slice(id*3,id*3+3),ax=Math.abs(x);
    const band=smooth(1.455,1.505,y)*(1-smooth(1.605,1.65,y));
    if(z<=0||!band||locked.has(id))continue;
    const lo=.018,hi=Math.min(axis(y)+.058,oblique(y)-.020),t=(ax-lo)/(hi-lo);
    const weight=band*smooth(0,.16,t)*(1-smooth(.84,1,t));
    if(hi<=lo||!weight)continue;
    const a=sample(lo,y),b=sample(hi,y);
    if(!Number.isFinite(a+b))throw new Error('Missing retained lower abdominal stock');
    const trim=Math.min(.012,Math.max(0,z-(a+(b-a)*t)))*weight*.90;
    if(trim<=1e-12)continue;
    const key=[ax,y].map(v=>Math.round(v*1e6)).join(',');
    if(!groups.has(key))groups.set(key,{ids:[],offset:trim});
    const group=groups.get(key);group.offset=Math.min(group.offset,trim);group.ids.push(id);owners[id]=group;
  }
  // Keep the existing direction of every affected face gradient while flattening
  // its rounded excess. The reduction-only solve cannot introduce a raised block.
  const constraints=[];
  for(const f of faces){
    if(!f.some(id=>owners[id]))continue;
    const v=f.map(id=>stock.slice(id*3,id*3+3));
    const dx1=v[1][0]-v[0][0],dy1=v[1][1]-v[0][1],dx2=v[2][0]-v[0][0],dy2=v[2][1]-v[0][1];
    const d=dx1*dy2-dx2*dy1;if(Math.abs(d)<1e-12)continue;
    const cx=[(dy1-dy2)/d,dy2/d,-dy1/d],cy=[(dx2-dx1)/d,-dx2/d,dx1/d],sign=Math.sign(v[0][0]);
    for(const coefficients of [cx.map(c=>c*sign),cy.map((c,k)=>c+sign*.018/.092*cx[k])]){
      const slope=f.reduce((sum,id,k)=>sum+coefficients[k]*stock[3*id+2],0);
      const direction=slope<=0?1:-1,adjustable=new Map();
      f.forEach((id,k)=>{if(owners[id])adjustable.set(owners[id],(adjustable.get(owners[id])||0)-direction*coefficients[k]);});
      constraints.push({slope:direction*slope,limit:Math.max(direction*slope,-.003),adjustable});
    }
  }
  const violation=c=>c.slope+[...c.adjustable].reduce((sum,[g,a])=>sum+a*g.offset,0)-c.limit;
  let sweeps=0;
  for(;sweeps<160;sweeps++){
    let max=0;
    for(const c of constraints){
      const error=violation(c);max=Math.max(max,error);if(error<1e-10)continue;
      const active=[...c.adjustable].filter(([g,a])=>a>0&&g.offset>0),den=active.reduce((sum,[g,a])=>sum+a*a,0);
      for(const [g,a]of active)g.offset=Math.max(0,g.offset-error*a/den);
    }if(max<1e-7)break;
  }
  const maximumSlopeViolation=Math.max(0,...constraints.map(violation));
  if(maximumSlopeViolation>1e-6)throw new Error('Lower abdominal gradient constraints failed');
  let changedVertices=0,maximumTrim=0;
  for(const g of groups.values())for(const id of g.ids){
    p[3*id+2]=stock[3*id+2]-g.offset;
    if(g.offset>1e-10)changedVertices++;maximumTrim=Math.max(maximumTrim,g.offset);
  }
  return {method:'paired retained lower-abdominal chord caps with protected seam and returns',
    protectedFaces,lockedVertices:locked.size,changedVertices,maximumTrim,maximumAllowedTrim:.0108,
    constraints:constraints.length,sweeps:sweeps+1,maximumSlopeViolation,
    region:{y:[1.455,1.505,1.605,1.65],innerX:.018,axisOffset:.058,obliqueGuard:.020}};
}

// M55: a long lower-oblique facing plane carries the hip into waist compression.
// Its cross-section chord comes from retained triangles; the inner groove stays fixed.
function resolveMrsLowerOblique(result){
  const p=result.positions,stock=p.slice(),faces=result.faces;
  const axis=y=>.160+.75*(y-1.68)**2+.30*Math.max(0,1.66-y);
  const triangles=faces.map(f=>f.map(id=>stock.slice(id*3,id*3+3)))
    .filter(v=>v.every(q=>q[2]>0)&&Math.max(...v.map(q=>q[1]))>1.36&&Math.min(...v.map(q=>q[1]))<1.69);
  const sample=(x,y)=>{
    let z=-Infinity;
    for(const [a,b,c]of triangles){
      const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-12)continue;
      const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d;
      const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
      if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)z=Math.max(z,u*a[2]+v*b[2]+(1-u-v)*c[2]);
    }return z;
  };
  const locked=new Set();let protectedFaces=0;
  for(const f of faces){
    const v=f.map(id=>stock.slice(id*3,id*3+3));
    if(v.some(q=>q[2]<=0)||Math.max(...v.map(q=>q[1]))<1.37||Math.min(...v.map(q=>q[1]))>1.68)continue;
    const distance=v.map(q=>Math.abs(q[0])-axis(q[1])+.044);
    if(Math.min(...distance)<=.012&&Math.max(...distance)>=-.012){
      protectedFaces++;for(const id of f)locked.add(id);
    }
  }
  const groups=new Map(),owners=[];
  for(let id=0;id<p.length/3;id++){
    const [x,y,z]=stock.slice(id*3,id*3+3),ax=Math.abs(x);
    const band=smooth(1.40,1.455,y)*(1-smooth(1.595,1.65,y));
    if(z<=0||!band||locked.has(id))continue;
    const lo=axis(y)-.020,hi=Math.min(axis(y)+.065,.95*profileAt(y,1));
    const t=(ax-lo)/(hi-lo),weight=smooth(0,.16,t)*(1-smooth(.86,1,t))*band;
    if(hi<=lo||!weight)continue;
    const a=sample(lo,y),b=sample(hi,y);
    if(!Number.isFinite(a+b))throw new Error('Missing lower-oblique retained stock');
    const trim=Math.min(.014,Math.max(0,z-(a+(b-a)*t)))*weight*.95;
    if(trim<=1e-12)continue;
    const key=[ax,y].map(v=>Math.round(v*1e6)).join(',');
    if(!groups.has(key))groups.set(key,{ids:[],offset:trim});
    const group=groups.get(key);group.offset=Math.min(group.offset,trim);group.ids.push(id);owners[id]=group;
  }
  // Keep actual affected triangle gradients from reversing across the support
  // or along its descending anatomical axis. Reduce trims, never add a ridge.
  const constraints=[];
  for(const f of faces){
    if(!f.some(id=>owners[id]))continue;
    const v=f.map(id=>stock.slice(3*id,3*id+3));
    const dx1=v[1][0]-v[0][0],dy1=v[1][1]-v[0][1],dx2=v[2][0]-v[0][0],dy2=v[2][1]-v[0][1];
    const d=dx1*dy2-dx2*dy1;if(Math.abs(d)<1e-12)continue;
    const cx=[(dy1-dy2)/d,dy2/d,-dy1/d],cy=[(dx2-dx1)/d,-dx2/d,dx1/d];
    const sign=Math.sign(v[0][0]),ys=v.map(q=>q[1]);
    const velocities=[Math.min(...ys),Math.max(...ys)].map(y=>sign*(1.5*(y-1.68)-(y<1.66?.30:0)));
    for(const coefficients of [cx.map(c=>c*sign),...velocities.map(velocity=>cy.map((c,k)=>c+velocity*cx[k]))]){
      const slope=f.reduce((sum,id,k)=>sum+coefficients[k]*stock[3*id+2],0);
      const direction=slope<=0?1:-1,adjustable=new Map();
      f.forEach((id,k)=>{if(owners[id])adjustable.set(owners[id],(adjustable.get(owners[id])||0)-direction*coefficients[k]);});
      constraints.push({slope:direction*slope,limit:Math.max(direction*slope,-.005),adjustable});
    }
  }
  const violation=c=>c.slope+[...c.adjustable].reduce((sum,[g,a])=>sum+a*g.offset,0)-c.limit;
  let sweeps=0;
  for(;sweeps<128;sweeps++){
    let max=0;
    for(const c of constraints){
      const error=violation(c);max=Math.max(max,error);if(error<1e-10)continue;
      const active=[...c.adjustable].filter(([g,a])=>a>0&&g.offset>0),den=active.reduce((sum,[g,a])=>sum+a*a,0);
      for(const [g,a]of active)g.offset=Math.max(0,g.offset-error*a/den);
    }if(max<1e-7)break;
  }
  const maximumSlopeViolation=Math.max(0,...constraints.map(violation));
  if(maximumSlopeViolation>1e-6)throw new Error('Lower-oblique support slope constraints failed');
  let changedVertices=0,maximumTrim=0;
  for(const g of groups.values())for(const id of g.ids){
    p[3*id+2]=stock[3*id+2]-g.offset;
    if(g.offset>1e-10)changedVertices++;maximumTrim=Math.max(maximumTrim,g.offset);
  }
  return {method:'retained lower-oblique chord facing with protected inner-groove triangles',
    protectedFaces,lockedVertices:locked.size,changedVertices,maximumTrim,maximumAllowedTrim:.0133,
    constraints:constraints.length,sweeps:sweeps+1,maximumSlopeViolation,
    region:{y:[1.40,1.455,1.595,1.65],innerOffset:-.020,outerOffset:.065,outerWidthFraction:.95}};
}

// M54: the lower glute return follows a chord of the retained posterior surface.
// Keep the crown and crease faces fixed; trim only excess convexity between them.
function resolveMrsGluteSupport(result){
  const p=result.positions,stock=p.slice(),faces=result.faces;
  const floor=x=>1.135+2.4*(Math.abs(x)-.180)**2;
  const tris=faces.map(f=>f.map(id=>stock.slice(id*3,id*3+3)))
    .filter(v=>v.every(q=>q[2]<0)&&Math.max(...v.map(q=>q[1]))>1.08&&Math.min(...v.map(q=>q[1]))<1.32);
  const sample=(x,y)=>{
    let z=Infinity;
    for(const [a,b,c]of tris){
      const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-12)continue;
      const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d;
      const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
      if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)z=Math.min(z,u*a[2]+v*b[2]+(1-u-v)*c[2]);
    }return z;
  };
  const locked=new Set();let protectedFaces=0;
  for(const f of faces){
    const v=f.map(id=>stock.slice(id*3,id*3+3));
    if(v.some(q=>q[2]>=0))continue;
    const ys=v.map(q=>q[1]),xs=v.map(q=>Math.abs(q[0]));
    if(Math.max(...ys)<1.09||Math.min(...ys)>1.31||Math.min(...xs)>.34)continue;
    const lo=Math.min(...xs),hi=Math.max(...xs);
    const lowFloor=lo<=.18&&hi>=.18?1.135:Math.min(floor(lo),floor(hi));
    const highFloor=Math.max(floor(lo),floor(hi));
    const crossesCrease=Math.min(...ys)<=highFloor+.020&&Math.max(...ys)>=lowFloor-.020;
    const crossesCrown=Math.max(...ys)>=1.28;
    if(crossesCrease||crossesCrown){protectedFaces++;for(const id of f)locked.add(id);}
  }
  const groups=new Map(),owners=[];
  for(let id=0;id<p.length/3;id++){
    const [x,y,z]=stock.slice(id*3,id*3+3),ax=Math.abs(x),lo=floor(x)+.024,hi=1.28;
    if(z>=0||locked.has(id)||y<=lo||y>=hi||ax<=.065||ax>=.310)continue;
    const t=(y-lo)/(hi-lo),a=sample(ax,lo),b=sample(ax,hi);
    if(!Number.isFinite(a+b))throw new Error('Missing retained glute support surface');
    const weight=smooth(.065,.110,ax)*(1-smooth(.255,.310,ax))
      *smooth(0,.20,t)*(1-smooth(.72,1,t));
    const trim=Math.min(.012,Math.max(0,a+(b-a)*t-z))*weight*.90;
    if(trim<=1e-12)continue;
    const key=[ax,y].map(v=>Math.round(v*1e6)).join(',');
    if(!groups.has(key))groups.set(key,{ids:[],offset:trim});
    const group=groups.get(key);group.offset=Math.min(group.offset,trim);group.ids.push(id);owners[id]=group;
  }
  // Prevent a tighter return from producing a reversed face along either
  // a vertical section or the widening lower-body flow.
  const constraints=[];
  for(const f of faces){
    if(!f.some(id=>owners[id]))continue;
    const v=f.map(id=>stock.slice(3*id,3*id+3));
    const dx1=v[1][0]-v[0][0],dy1=v[1][1]-v[0][1],dx2=v[2][0]-v[0][0],dy2=v[2][1]-v[0][1];
    const d=dx1*dy2-dx2*dy1;if(Math.abs(d)<1e-12)continue;
    const cx=[(dy1-dy2)/d,dy2/d,-dy1/d],cy=[(dx2-dx1)/d,-dx2/d,dx1/d];
    const velocities=[0];
    for(const q of v){
      const h=.00001;velocities.push(q[0]*(profileAt(q[1]+h,1)-profileAt(q[1]-h,1))/(2*h*profileAt(q[1],1)));
    }
    for(const velocity of [0,Math.min(...velocities),Math.max(...velocities)]){
      const coefficients=cy.map((c,k)=>c+velocity*cx[k]);
      const slope=f.reduce((sum,id,k)=>sum+coefficients[k]*stock[3*id+2],0),adjustable=new Map();
      f.forEach((id,k)=>{if(owners[id])adjustable.set(owners[id],(adjustable.get(owners[id])||0)+coefficients[k]);});
      constraints.push({slope,limit:Math.max(slope,-.005),adjustable});
    }
  }
  const violation=c=>c.slope+[...c.adjustable].reduce((sum,[g,a])=>sum+a*g.offset,0)-c.limit;
  let sweeps=0;
  for(;sweeps<128;sweeps++){
    let max=0;
    for(const c of constraints){
      const error=violation(c);max=Math.max(max,error);if(error<1e-10)continue;
      const active=[...c.adjustable].filter(([g,a])=>a>0&&g.offset>0),den=active.reduce((sum,[g,a])=>sum+a*a,0);
      for(const [g,a]of active)g.offset=Math.max(0,g.offset-error*a/den);
    }if(max<1e-7)break;
  }
  const maximumSlopeViolation=Math.max(0,...constraints.map(violation));
  if(maximumSlopeViolation>1e-6)throw new Error('Glute return slope constraint failed');
  let changedVertices=0,maximumTrim=0;
  for(const g of groups.values())for(const id of g.ids){
    p[3*id+2]=stock[3*id+2]+g.offset;
    if(g.offset>1e-10)changedVertices++;maximumTrim=Math.max(maximumTrim,g.offset);
  }
  return {method:'retained posterior chord cap with protected crown and crease faces',
    protectedFaces,lockedVertices:locked.size,changedVertices,maximumTrim,maximumAllowedTrim:.0108,
    constraints:constraints.length,sweeps:sweeps+1,maximumSlopeViolation,
    region:{minAbsX:.065,maxAbsX:.310,lowerReturnOffset:.024,upperY:1.28}};
}

// M53: isolate the knee return with two guard rows and one anatomical control
// row. New points initially lie on retained triangles; the isolated return moves
// inward as one field. Shared-edge insertion preserves the mesh and both borders.
function resolveMrsPatellaReturn(result){
  const p=result.positions,stock=p.slice(),originalFaces=result.faces.map(f=>f.slice());
  if(originalFaces.some(f=>f.length!==3))throw new Error('Patella support requires triangular stock');
  let faces=originalFaces.map(f=>f.slice()),parents=faces.map((_,i)=>i);
  const free=new Set(),floor=x=>.708+.68*(Math.hypot(Math.abs(x)-.073,.003)-.003);
  const point=id=>p.slice(3*id,3*id+3);
  function cutRow(guide,isControl){
    const edges=new Map();
    for(const f of faces){
      const v=f.map(point),xs=v.map(q=>Math.abs(q[0]));
      if(v.some(q=>q[2]<=0)||Math.max(...xs)<.012||Math.min(...xs)>.175
        ||Math.max(...v.map(q=>q[1]))<.680||Math.min(...v.map(q=>q[1]))>.805)continue;
      for(let k=0;k<3;k++){
        const a=f[k],b=f[(k+1)%3],key=a<b?a+':'+b:b+':'+a;
        if(edges.has(key))continue;
        const u=point(a),v=point(b),su=u[1]-guide(u[0]),sv=v[1]-guide(v[0]);
        if(su*sv>=0||Math.abs(su)<1e-8||Math.abs(sv)<1e-8)continue;
        let lo=0,hi=1;
        for(let j=0;j<36;j++){
          const t=(lo+hi)/2,x=u[0]+(v[0]-u[0])*t,y=u[1]+(v[1]-u[1])*t;
          if((y-guide(x))*su>0)lo=t;else hi=t;
        }
        const t=(lo+hi)/2;
        // Snap near-corner cuts to their existing corner by leaving that edge
        // intact. The opposite cut still splits the neighbour consistently.
        if(Math.hypot(...v.map((q,i)=>q-u[i]))*Math.min(t,1-t)<.0001)continue;
        const id=p.length/3;
        p.push(...u.map((q,i)=>q+(v[i]-q)*t));edges.set(key,id);
        if(isControl)free.add(id);
      }
    }
    const next=[],nextParents=[];
    const add=(f,parent)=>{next.push(f);nextParents.push(parent);};
    faces.forEach((f,index)=>{
      const m=f.map((a,k)=>{const b=f[(k+1)%3];return edges.get(a<b?a+':'+b:b+':'+a);});
      const count=m.filter(v=>v!==undefined).length,parent=parents[index];
      if(!count){add(f,parent);return;}
      if(count===1){
        const k=m.findIndex(v=>v!==undefined),a=f[k],b=f[(k+1)%3],c=f[(k+2)%3],q=m[k];
        add([a,q,c],parent);add([q,b,c],parent);
      }else if(count===2){
        const k=[0,1,2].find(k=>m[(k+2)%3]!==undefined&&m[k]!==undefined);
        const a=f[(k+2)%3],b=f[k],c=f[(k+1)%3],u=m[(k+2)%3],v=m[k];
        add([u,b,v],parent);
        // Pick the same diagonal on reflected triangles, independent of winding.
        const distance=(i,j)=>point(i).reduce((sum,q,k)=>sum+(q-point(j)[k])**2,0);
        if(distance(a,v)<=distance(u,c)){
          add([a,u,v],parent);add([a,v,c],parent);
        }else{
          add([a,u,c],parent);add([u,v,c],parent);
        }
      }else{
        add([f[0],m[0],m[2]],parent);add([m[0],f[1],m[1]],parent);
        add([m[2],m[1],f[2]],parent);add([m[0],m[1],m[2]],parent);
      }
    });
    faces=next;parents=nextParents;
  }
  cutRow(x=>floor(x)+.008,false);
  cutRow(()=>.784,false);
  cutRow(x=>(floor(x)+.012+.789)/2,true);
  const stockTriangles=originalFaces.map(f=>f.map(id=>stock.slice(3*id,3*id+3)))
    .filter(v=>v.every(q=>q[2]>0)&&Math.max(...v.map(q=>q[1]))>=.675&&Math.min(...v.map(q=>q[1]))<=.810);
  const sample=(x,y)=>{
    let z=-Infinity;
    for(const [a,b,c]of stockTriangles){
      const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-12)continue;
      const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d;
      const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
      if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)z=Math.max(z,u*a[2]+v*b[2]+(1-u-v)*c[2]);
    }
    return z;
  };
  const undeformed=p.slice(),editable=new Set(free),groups=new Map(),owners=[];
  for(let id=0;id<stock.length/3;id++){
    const [x,y,z]=point(id);
    if(z>0&&y>floor(x)+.008&&y<.784&&Math.abs(x)>.025&&Math.abs(x)<.155)editable.add(id);
  }
  for(const id of editable){
    const x=p[3*id],y=p[3*id+1],z=p[3*id+2],ax=Math.abs(x);
    const across=smooth(.025,.047,ax)*(1-smooth(.123,.155,ax));if(!across)continue;
    const lo=floor(x)+.012,hi=.789,t=(y-lo)/(hi-lo);
    const guardT=(y-floor(x)-.008)/(.784-floor(x)-.008);
    const weight=across*smooth(0,.18,guardT)*(1-smooth(.80,1,guardT));if(!weight)continue;
    const a=sample(ax,lo),b=sample(ax,hi);if(!Number.isFinite(a+b))throw new Error('Missing patellar return stock');
    const trim=Math.min(.008,Math.max(0,z-(a+(b-a)*t)))*weight*.95;if(trim<=1e-12)continue;
    const key=[ax,y].map(v=>Math.round(v*1e6)).join(',');
    if(!groups.has(key))groups.set(key,{ids:[],offset:trim});
    const group=groups.get(key);group.offset=Math.min(group.offset,trim);group.ids.push(id);owners[id]=group;
  }
  // A boundary-isolated edit can still fold a small triangle. Reduce only the
  // proposed inward offsets until every affected longitudinal slope retains
  // the stock slope, or at least a small positive value where stock is positive.
  const constraints=[];
  for(const f of faces){
    if(!f.some(id=>owners[id]))continue;
    const [a,b,c]=f.map(id=>undeformed.slice(3*id,3*id+3));
    const d=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(d)<1e-12)continue;
    const coefficients=[(c[0]-b[0])/d,(a[0]-c[0])/d,(b[0]-a[0])/d];
    const stockSlope=f.reduce((sum,id,j)=>sum+coefficients[j]*undeformed[3*id+2],0);
    const adjustable=new Map();
    f.forEach((id,j)=>{if(owners[id])adjustable.set(owners[id],(adjustable.get(owners[id])||0)+coefficients[j]);});
    constraints.push({stockSlope,limit:Math.min(stockSlope,.010),adjustable});
  }
  const violation=c=>c.limit-c.stockSlope+[...c.adjustable].reduce((s,[g,a])=>s+a*g.offset,0);
  let sweeps=0;
  for(;sweeps<128;sweeps++){
    let max=0;
    for(const c of constraints){
      const error=violation(c);max=Math.max(max,error);if(error<1e-10)continue;
      const active=[...c.adjustable].filter(([g,a])=>a>0&&g.offset>0),den=active.reduce((s,[g,a])=>s+a*a,0);
      for(const [g,a]of active)g.offset=Math.max(0,g.offset-error*a/den);
    }
    if(max<1e-7)break;
  }
  const maximumSlopeViolation=Math.max(0,...constraints.map(violation));
  if(maximumSlopeViolation>1e-6)throw new Error('Patellar return slope constraints did not converge');
  let changedVertices=0,maximumTrim=0,originalChangedVertices=0;
  for(const g of groups.values())for(const id of g.ids){
    p[3*id+2]=undeformed[3*id+2]-g.offset;
    if(g.offset>1e-10){changedVertices++;if(id<stock.length/3)originalChangedVertices++;}
    maximumTrim=Math.max(maximumTrim,g.offset);
  }
  // Preserve every authored class/coating/cavity through the local split.
  const old=result.geometry,next=facetedGeometry(p,faces,null,{lift:MALE.TORSO.classLift,inner:true,normalWeight:'angle'});
  const preSplit=facetedGeometry(undeformed,faces,null,{normalWeight:'angle'});
  const normalField={indices:[],values:[]};
  const unit=v=>{const l=Math.hypot(...v);return v.map(q=>q/l);};
  for(const [name,attr]of Object.entries(old.attributes)){
    if(['position','normal','aMoldNormal','aBary'].includes(name))continue;
    const values=new attr.array.constructor(faces.length*3*attr.itemSize);
    faces.forEach((f,i)=>{
      const parent=parents[i],base=originalFaces[parent],v=base.map(id=>stock.slice(3*id,3*id+3));
      f.forEach((id,j)=>{
        const exact=base.indexOf(id);let weights;
        if(exact>=0)weights=[0,1,2].map(k=>k===exact?1:0);
        else{
          const [a,b,c]=v,x=p[3*id],y=p[3*id+1];
          const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
          const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d;
          const w=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
          weights=[u,w,1-u-w];
        }
        for(let k=0;k<attr.itemSize;k++)values[(i*3+j)*attr.itemSize+k]=
          weights.reduce((sum,w,n)=>sum+w*attr.array[(parent*3+n)*attr.itemSize+k],0);
      });
    });
    if(name==='aSmooth'){
      // Inserting coplanar control points must not create a new lighting crease.
      // Transfer the retained smooth field, then add only the physical normal
      // change caused by displacement on this same subdivided topology.
      for(let i=0;i<values.length/3;i++){
        const id=faces[Math.floor(i/3)][i%3],[x,y,z]=point(id);
        if(z<=0||y<.665||y>.835||Math.abs(x)>.190)continue;
        const base=unit(Array.from(values.slice(i*3,i*3+3)));
        const corrected=unit(base.map((v,k)=>v+next.attributes.aSmooth.array[i*3+k]-preSplit.attributes.aSmooth.array[i*3+k]));
        normalField.indices.push(i);normalField.values.push(...corrected);
      }
    }else next.setAttribute(name,new attr.constructor(values,attr.itemSize,attr.normalized));
  }
  preSplit.dispose();result.mrsPatellaNormalField=normalField;
  result.geometry=next;old.dispose();result.faces=faces;result.mrsPatellaFaceParents=parents;
  return {method:'two boundary guard rows and one anatomical support row on retained triangles',
    lowerGuardOffset:.008,upperGuardY:.784,controlRow:'midway between lower groove + .012 and y .789',
    originalVertices:stock.length/3,addedVertices:(p.length-stock.length)/3,
    originalTriangles:originalFaces.length,addedTriangles:faces.length-originalFaces.length,
    controlVertices:free.size,changedVertices,originalChangedVertices,maximumTrim,maximumAllowedTrim:.0076,
    normalFieldCopies:normalField.indices.length,normalMethod:'retained smooth field plus physical displacement normal delta on identical split topology',
    slopeConstraints:constraints.length,slopeSweeps:sweeps+1,maximumSlopeViolation};
}

export function buildMrsTorso({representation='authoring'}={}){
  const ys=new Set(MRS_MAH.profile.map(p=>p[0]));
  const addStation=y=>{if([...ys].every(s=>Math.abs(s-y)>.009))ys.add(+y.toFixed(5));};
  for(let y=.045;y<2.335;y+=.036)if(y<1.79||y>2.14)addStation(y);
  for(let y=1.79;y<2.14;y+=.018)addStation(y);
  const rings=[...ys].sort((a,b)=>a-b).map(y=>({y,w:profileAt(y,1),d:profileAt(y,2)}));
  const result=loft(rings,48,{capTop:true,capBottom:false,jitter:0,refine:0,
    sidesAt:s=>s.y<.55?24:s.y>=1.79&&s.y<=2.14?64:48,normalWeight:'angle',surface:supportedTorsoSample,angleAt:supportAngle,
    lift:MALE.TORSO.classLift,inner:true});
  const posteriorProtection=protectPosteriorCrease(result);
  const lumbarSupport=capLumbarSupports(result);
  const gluteSupport=resolveMrsGluteSupport(result);
  const lowerOblique=resolveMrsLowerOblique(result);
  const lowerAbdomen=resolveMrsLowerAbdomen(result);
  const patellaReturn=resolveMrsPatellaReturn(result);
  const quadKneeFlow=resolveMrsQuadKneeFlow(result);
  resolveMrsKneeTransition(result);
  const field=result.mrsPatellaNormalField;
  field.indices.forEach((index,i)=>{
    for(const name of ['aSmooth','aMoldNormal'])if(result.geometry.attributes[name])result.geometry.attributes[name].setXYZ(index,...field.values.slice(i*3,i*3+3));
  });
  result.geometry.userData.mrsQuadKneeFlow=quadKneeFlow;
  result.geometry.userData.mrsPatellaReturn=patellaReturn;
  result.geometry.userData.mrsLumbarSupport=lumbarSupport;
  result.geometry.userData.mrsGluteSupport=gluteSupport;
  result.geometry.userData.mrsLowerOblique=lowerOblique;
  result.geometry.userData.mrsLowerAbdomen=lowerAbdomen;
  result.geometry.userData.mrsPosteriorProtection=posteriorProtection;
  if(representation==='authoring'){authorMrsLowerBody(result);authorMrsAbdominalPlanes(result);}
  result.geometry.userData.productionLayer=representation;
  applyMrsCrystalPlanes(result.geometry,'torso');
  if(representation==='authoring'){reduceMrsSupportedBust124(result.geometry);rebuildMrsQuadCrown(result.geometry,{sides:[-1,1]});reconstructMrsChest126(result.geometry,{bust:MRS_MAH.bust,support:bustSupport,profile:profileAt});}
  if(representation==='authoring'){shapeMrsBodyMuscles(result.geometry,{profile:profileAt,landmarks:MRS_MAH.profile.map(p=>p[0])});noteMrsBodyPlanes(result.geometry);finishMrsBodyNormals(result.geometry);supportMrsShoulderTorso(result.geometry);continueMrsNeckIntoCranium(result.geometry);}
  if(representation==='authoring')roundMrsPosteriorBellies(result.geometry);
  if(representation==='authoring')roundMrsBodyM14(result.geometry);
  if(representation==='authoring')relaxMrsShoulderFlow(result.geometry);
  if(representation==='authoring')liftMrsSuperiorShoulder(result.geometry);
  if(representation==='authoring'){continueMrsShoulderEnvelope(result.geometry);consolidateMrsShoulderReturn(result.geometry);}
  result.geometry.userData.mrsMah={version:'M31',authority:'PDF pp10-15,18,22-34',singleSurface:true};
  return result;
}

export function mrsProportions(){
  // `legacyArms`: her regional arm refiners below were authored against the
  // R166 arm. See `armDesign` in arm-anatomy.js — this pins that generation
  // until they are re-authored, and pins nothing else.
  return {...MALE,name:'mrs-mah',buildTorso:buildMrsTorso,legacyArms:true,stature:MRS_MAH.stature,
    faceStyle:{eyeScale:MRS_MAH.eyes.diameterScale/MRS_MAH.stature,lashCount:MRS_MAH.eyes.lashes},
    armLateralScale:MRS_MAH.armLateralScale,
    INSIGNIA:{...MALE.INSIGNIA,emblemY:2.068,symbolsY:1.818}};
}


// M124: supported bust reduction after retained topology construction.
function reduceMrsSupportedBust124(g){
 const p=g.attributes.position,stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const B=MRS_MAH.bust,deltas=stock.map(v=>{
  if(v.z<=0||v.y<1.75||v.y>2.14)return 0;
  const bx=(Math.hypot(v.x,B.sternumRadius)-B.x)/B.width,by=(v.y-B.y)/B.height;
  const lateral=.20*smooth(.190,.270,Math.abs(v.x))*(1-smooth(.310,.355,Math.abs(v.x)));
  const front=Math.sqrt(Math.max(0,1-(v.x/profileAt(v.y,1))**2));
  return -.06*B.projection*bustSupport(bx,by,-1.20-lateral)*Math.pow(front,.45);
 });
 // Couple displacement across the existing thin support triangles. Independent
 // crown offsets folded a sliver despite a modest displacement bound.
 const nodes=[],lookup=new Map(),corners=[],positionKey=v=>v.toArray().map(x=>x.toFixed(6)).join(',');
 // Pair mirrored degrees of freedom. The retained left/right triangulations
 // differ locally; independent stiffness solves introduced small asymmetry.
 stock.forEach((v,i)=>{const k=positionKey(new Vector3(Math.abs(v.x),v.y,v.z));if(!lookup.has(k)){lookup.set(k,nodes.length);nodes.push({v,target:deltas[i],fixed:Math.abs(deltas[i])<1e-12,mass:0,row:new Map()});}corners.push(lookup.get(k));});
 const addWeight=(i,j,w)=>nodes[i].row.set(j,(nodes[i].row.get(j)||0)+w),regularization=.00004;
 for(let i=0;i<stock.length;i+=3){const ids=corners.slice(i,i+3),v=stock.slice(i,i+3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),a2=n.length();n.divideScalar(a2);
  const grad=v.map((_,k)=>n.clone().cross(v[(k+2)%3].clone().sub(v[(k+1)%3])).divideScalar(a2));
  for(let k=0;k<3;k++){nodes[ids[k]].mass+=a2/6;for(let j=0;j<3;j++)addWeight(ids[k],ids[j],a2*.5*regularization*grad[k].dot(grad[j]));}
 }
 nodes.forEach((n,i)=>addWeight(i,i,n.mass));
 const free=nodes.map((n,i)=>n.fixed?-1:i).filter(i=>i>=0),count=nodes.length,x=new Float64Array(count),r=new Float64Array(count),z=new Float64Array(count),d=new Float64Array(count),ad=new Float64Array(count);
 let rz=0,bnorm=0;for(const i of free){r[i]=nodes[i].mass*nodes[i].target;z[i]=r[i]/nodes[i].row.get(i);d[i]=z[i];rz+=r[i]*z[i];bnorm+=r[i]*r[i];}
 let residual=Math.sqrt(bnorm),iterations=0;const threshold=Math.max(1e-14,Math.sqrt(bnorm)*1e-9);
 for(;iterations<4000&&residual>threshold;iterations++){
  let denom=0;for(const i of free){let v=0;for(const [j,w]of nodes[i].row)v+=w*d[j];ad[i]=v;denom+=d[i]*v;}
  if(!(denom>0))throw new Error('M124 invalid surface system');
  const alpha=rz/denom;let nextRz=0,norm=0;
  for(const i of free){x[i]+=alpha*d[i];r[i]-=alpha*ad[i];z[i]=r[i]/nodes[i].row.get(i);nextRz+=r[i]*z[i];norm+=r[i]*r[i];}
  const beta=nextRz/rz;for(const i of free)d[i]=z[i]+beta*d[i];rz=nextRz;residual=Math.sqrt(norm);
 }
 if(residual>threshold*1.1)throw new Error('M124 surface system did not converge');
 for(let i=0;i<deltas.length;i++)deltas[i]=x[corners[i]];
 const oldNormals=new Map(),newNormals=new Map(),key=v=>v.toArray().map(x=>x.toFixed(6)).join(',');
 const add=(map,k,n)=>{if(!map.has(k))map.set(k,new Vector3());map.get(k).add(n);};
 let minDot=1,minAreaRatio=1,maximumShift=0,changedCopies=0;
 for(let i=0;i<p.count;i++){p.setZ(i,stock[i].z+deltas[i]);if(Math.abs(deltas[i])>1e-10)changedCopies++;maximumShift=Math.max(maximumShift,Math.abs(deltas[i]));}
 for(let i=0;i<p.count;i+=3){
  const a=stock.slice(i,i+3),b=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,i+k));
  const n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0]));
  minDot=Math.min(minDot,n.clone().normalize().dot(m.clone().normalize()));minAreaRatio=Math.min(minAreaRatio,m.length()/n.length());
  for(const v of a){add(oldNormals,key(v),n);add(newNormals,key(v),m);}
 }
 if(minDot<.75||minAreaRatio<.45)throw new Error('M124 crown map folded support '+[minDot,minAreaRatio]);
 const rotations=new Map([...oldNormals].map(([k,n])=>[k,new Quaternion().setFromUnitVectors(n.normalize(),newNormals.get(k).normalize())]));
 for(let i=0;i<p.count;i++)for(const name of ['aSmooth','aMoldNormal','aCrystalNormal']){
  const a=g.attributes[name],n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(rotations.get(key(stock[i]))).normalize();a.setXYZ(i,n.x,n.y,n.z);a.needsUpdate=true;
 }
 const displayed=g.attributes.normal;g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));g.computeVertexNormals();g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);
 g.userData.mrsBust124={version:'M124',source:'M123',requestedProjectionReduction:.06,method:'supported chest-wall displacement on retained final topology; mirror-coupled surface solve; geometric normal transport',regularization,iterations,relativeResidual:residual/Math.sqrt(bnorm),maximumShift,changedCopies,minimumFaceDot:minDot,minimumAreaRatio:minAreaRatio};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}


