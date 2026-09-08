import { MRMAH_MORPHOLOGY as MORPHOLOGY } from './proportions.js';
/* R110 male anatomy, sampled once by the existing loft before normals are built.
 * Coordinates use the R109 skeleton: +Y superior, +Z anterior. The ring table
 * still owns topology, species proportions and all shell metadata. These fields
 * replace row-local swelling with continuous origin-to-insertion surfaces.
 */
export const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
const gauss = (x, w) => Math.exp(-Math.pow(x / w, 2));
const windowAt = (y, a, b, fade) => smooth((y-a)/fade) * smooth((b-y)/fade);
// Shape-preserving cubic profile. Derivatives share physical Y spacing; short
// sampling intervals cannot turn into the shoulders of separate stacked bulbs.
export function profileAt(knots, y) {
  if (y <= knots[0][0]) return knots[0][1];
  const n = knots.length;
  if (y >= knots[n-1][0]) return knots[n-1][1];
  let i = 0; while (y > knots[i+1][0]) i++;
  const slope = j => (knots[j+1][1]-knots[j][1])/(knots[j+1][0]-knots[j][0]);
  const tangent = j => {
    if (j === 0) return slope(0);
    if (j === n-1) return slope(n-2);
    const a = slope(j-1), b = slope(j);
    return a*b <= 0 ? 0 : 2*a*b/(a+b);
  };
  const h=knots[i+1][0]-knots[i][0], t=(y-knots[i][0])/h;
  return (2*t*t*t-3*t*t+1)*knots[i][1] + (t*t*t-2*t*t+t)*h*tangent(i)
       + (-2*t*t*t+3*t*t)*knots[i+1][1] + (t*t*t-t*t)*h*tangent(i+1);
}

const TRUNK_WIDTH = MORPHOLOGY.TRUNK_WIDTH;
const TRUNK_FRONT = MORPHOLOGY.TRUNK_FRONT;
const TRUNK_BACK = MORPHOLOGY.TRUNK_BACK;

// Centerlines follow origins through bellies into insertions. Width varies
// along each centerline; these are surface fields, not intersecting solids.
export function ribbonField(x,y,track,amplitude) {
  const first=track[0], last=track[track.length-1];
  if(y<=first[0]||y>=last[0])return 0;
  const center=profileAt(track.map(p=>[p[0],p[1]]),y);
  const width=profileAt(track.map(p=>[p[0],p[2]]),y);
  return amplitude*gauss(Math.abs(x)-center,width)*windowAt(y,first[0],last[0],Math.min(.09,(last[0]-first[0])*.25));
}
export const TRUNK_PATHS = MORPHOLOGY.TRUNK_PATHS;

// A muscle sheet has independently authored medial/lateral attachment routes.
// Its transverse convexity is bounded by that footprint, while each row owns
// the belly height. Broad posterior muscles need this fan/leaf construction;
// a radius around one centerline cannot describe their overlapping planes.
function sheetSample(x,y,rows,plane){
  if(rows.sections){
    const track=rows.sections;
    if(y<=track[0][0]||y>=track.at(-1)[0])return 0;
    const l=profileAt(track.map(k=>[k[0],k[1]]),y),r=profileAt(track.map(k=>[k[0],k[2]]),y);
    const u=(Math.abs(x)-l)/(r-l),height=profileAt(track.map(k=>[k[0],k[3]]),y);
    if(u<=0||u>=1)return 0;
    const q=Math.abs(2*u-1),edge=1-smooth((q-.36)/.64);
    return rows.depth*height*(1-.14*q*q)*edge;
  }
  if(!Array.isArray(rows)){
    const p=[Math.abs(x),y],poly=rows.footprint;
    let edge=Infinity,returnHeight=Infinity;
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1];
      const distance=(dx*(p[1]-a[1])-dy*(p[0]-a[0]))/Math.hypot(dx,dy);
      edge=Math.min(edge,distance);
      returnHeight=Math.min(returnHeight,rows.depth*distance/(rows.edgeReturns?.[i]||rows.bevel));
    }
    if(edge<=0)return 0;
    const dx=(p[0]-rows.crown[0])/rows.extent[0],dy=(y-rows.crown[1])/rows.extent[1];
    const face=rows.depth*(1-.16*dx*dx-.12*dy*dy)+rows.tilt[0]*(p[0]-rows.crown[0])+rows.tilt[1]*(y-rows.crown[1]);
    if(rows.planeReturns){const wall=returnHeight,k=rows.returnFillet||0;
      return Math.max(0,Math.min(face,wall)-(k?Math.pow(Math.max(0,k-Math.abs(face-wall)),2)/(4*k):0));}
    return Math.max(0,face)*smooth(edge/rows.bevel);
  }
  if(y<=rows[0][0]||y>=rows[rows.length-1][0])return 0;
  const left=profileAt(rows.map(p=>[p[0],p[1]]),y),right=profileAt(rows.map(p=>[p[0],p[2]]),y);
  const u=(Math.abs(x)-left)/(right-left);
  if(u<=0||u>=1)return 0;
  const height=profileAt(rows.map(p=>[p[0],p[3]]),y);
  // Squared sine has zero slope on both footprint boundaries. The former
  // fractional power produced sharp normal turns along the diagonal return.
  if(plane){const q=Math.abs(u*2-1);return height*plane.projectionScale*(1-plane.crownConvexity*q*q)*(1-smooth((q-plane.edgeStart)/(1-plane.edgeStart)));}
  return height*Math.pow(Math.sin(Math.PI*u),2);
}
function sheetField(x,y,rows,plane){
  if(rows.sections||rows.planeReturns)return sheetSample(x,y,rows,plane);
  if(!Array.isArray(rows)){
    // Integrate only the footprint return over a physical neighbourhood.
    // This is evaluated before vertices/normals; it is an actual soft bevel.
    let sum=0;const d=rows.bevel*.28;
    const offsets=[[-d,.25],[0,.5],[d,.25]];
    for(const [dx,wx] of offsets)for(const [dy,wy] of offsets)sum+=wx*wy*sheetSample(x+dx,y+dy,rows,plane);
    return sum;
  }
  const d=.028;
  return .5*sheetSample(x,y,rows,plane)+.25*sheetSample(x,y-d,rows,plane)+.25*sheetSample(x,y+d,rows,plane);
}

// A bounded, locally facing muscle surface on the shared abdominal wall.
// [Y, medial X, lateral X] routes are independent of the support envelope.
// The two returns may slope differently; a crown edit never scales a ring.
export function abdominalPatch(x,y,p,frame) {
  // R116: independent upper/lower/side routes in one continuous surface.
  // Per-edge return widths and a tilted crown replace a repeated axial window.
  // The legacy route remains the default for unchanged callers/diagnostics.
  if(p.contour){
    const ax=Math.abs(x),poly=p.contour;
    let blend=1;
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1];
      const distance=(dx*(y-a[1])-dy*(ax-a[0]))/Math.hypot(dx,dy);
      if(distance<=0)return 0;
      blend=Math.min(blend,smooth(distance/p.edgeReturns[i]));
    }
    const u=(ax-p.crest[0])/p.extent[0],v=(y-p.crest[1])/p.extent[1];
    // A one-sided belly diagnostic owns the crown, not the shared midline
    // support or its two-rim calibration. Leave one medial sample band quiet.
    const adjustment=(p.sideAdjust?.[x>=0?'right':'left']?.projection||0)*smooth((ax-.044)/.025);
    let face=p.projection+adjustment-p.convexity[0]*u*u-p.convexity[1]*v*v
      +p.sidePlane*(p.crownSideOnly?Math.max(0,ax-p.crest[0]):ax-p.crest[0])+(p.verticalPlane||0)*(y-p.crest[1]);
    // R120: a planar relief added to a curved rib wall is still curved.
    // The optional crown frame describes the final facing surface instead.
    // Footprint walls and the continuous column bed keep their own ownership.
    if(frame&&p.crownSurface){
      const C=p.crownSurface,dx=ax-p.crest[0],dy=y-p.crest[1];
      const crown=C.z+C.slope[0]*dx+C.slope[1]*dy
        -p.convexity[0]*u*u-p.convexity[1]*v*v;
      face=(crown-frame.support)/Math.max(.2,frame.front)+adjustment
        +(p.projection-C.reliefBaseline);
    }
    if(p.planarReturn){
      let height=Math.max(0,face);
      for(let i=0;i<poly.length;i++){
        const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1];
        const distance=(dx*(y-a[1])-dy*(ax-a[0]))/Math.hypot(dx,dy);
        const attached=p.supportReturns?.[i];
        let wall=p.projection*distance/p.edgeReturns[i];
        if(attached&&frame?.columnSupport!==undefined){
          if(distance>=attached.width)continue;
          // A lower return meets the continuous rectus stock, not the deeper
          // rib support. Shape this wall before the union, preserving the
          // independently authored crown and the unmodified neighbouring belly.
          let t=Math.min(1,distance/attached.width);
          const e=attached.endEase;
          const end=u=>u*u*(2*e-u)/(e*e);
          if(e>0)t=t<e?end(t):t>1-e?1-end(1-t):t;
          const floor=Math.min(Math.max(0,face),frame.columnSupport);
          wall=floor+Math.max(0,face-floor)*t;
        }
        const k=attached&&frame?.columnSupport!==undefined?0:p.returnFillet||0;
        height=Math.min(height,wall)-(k?Math.pow(Math.max(0,k-Math.abs(height-wall)),2)/(4*k):0);
      }
      return Math.max(0,height);
    }
    return Math.max(0,face)*blend;
  }
  const ax=Math.abs(x),cy=y-p.flow*(ax-p.crest[0]),route=p.footprint;
  if(cy<=route[0][0]||cy>=route.at(-1)[0])return 0;
  const left=profileAt(route.map(k=>[k[0],k[1]]),cy),right=profileAt(route.map(k=>[k[0],k[2]]),cy);
  if(ax<=left||ax>=right)return 0;
  const u=(ax-p.crest[0])/p.extent[0],v=(cy-p.crest[1])/p.extent[1];
  const medial=smooth((ax-left)/p.returns.medial),lateral=smooth((right-ax)/p.returns.lateral);
  const ends=windowAt(cy,route[0][0],route.at(-1)[0],p.returns.longitudinal);
  const adjustment=p.sideAdjust?.[x>=0?'right':'left']?.projection||0;
  const face=p.projection+adjustment-p.convexity[0]*u*u-p.convexity[1]*v*v+p.sidePlane*(ax-p.crest[0]);
  return Math.max(0,face)*medial*lateral*ends;
}

export function coreField(x,y) {
  const ax=Math.abs(x),p=MORPHOLOGY.rectus.crown,O=MORPHOLOGY.rectus.organization;
  let rectus=MORPHOLOGY.rectus.patches.reduce((v,patch)=>v+abdominalPatch(x,y,patch),0);
  // A rectus column continues beneath its three visible bellies. Independent
  // footprints control the crowns and returns, not three disconnected bases.
  // Smooth union fills only the low intervals; crest heights are preserved.
  const bed=(O.columnProfile?profileAt(O.columnProfile,y):O.columnBed)*windowAt(y,1.405,1.875,.075)*smooth(ax/.016)*smooth((.151-ax)/.032);
  const unionWidth=.006;
  if(rectus>0||bed>0)rectus=Math.max(rectus,bed)+Math.pow(Math.max(0,unionWidth-Math.abs(rectus-bed)),2)/(4*unionWidth);
  // The paired columns share a shallow midline bed. Filling only the bottom
  // of the separation avoids two tall inner walls reading as a zipper.
  const bridge=MORPHOLOGY.rectus.patches.reduce((v,patch)=>v+abdominalPatch(.040,y,{...patch,sideAdjust:null}),0)-O.bridgeRecess;
  rectus=Math.max(rectus,Math.max(0,bridge)*smooth((.026-ax)/.010));
  const wall=p.wallDepth*(1-.12*Math.pow(ax/.19,2))*smooth((.22-ax)/.07)*windowAt(y,1.30,1.93,.13);
  const linea=-O.lineaDepth*gauss(x,O.lineaHalfWidth)*windowAt(y,1.39,1.88,.08);
  // The lateral wall has its own long oblique facing region, independent of
  // the three central belly returns. It cannot inherit their axial rows.
  let flank=O.flankProjection*windowAt(y,1.43,1.89,.12)*smooth((ax-.145)/.035)*smooth((.34-ax)/.055)
    *(1-.16*Math.pow((y-(1.60+.65*(ax-.17)))/.28,2));
  let serratus=0;
  for(let k=0;k<3;k++){
    const cy=1.855-k*.052;
    serratus+=.010*gauss(y-cy-.48*(ax-.255),.032)*gauss(ax-(.280-k*.021),.065);
  }
  let oblique=ribbonField(x,y,TRUNK_PATHS.oblique,.023);
  if(O.lateralSheets){
    // Short rib slips and the longer flank sheet have their own boundaries,
    // independent of rectus rows. A smooth regional blend protects the root.
    const weight=smooth((y-1.48)/.09);
    const sheets=O.lateralSheets.reduce((sum,p)=>sum+sheetField(x,y,p),0);
    flank+=(sheets-flank)*weight;
    serratus*=1-weight;oblique*=1-weight;
  }
  const result=rectus+wall+linea+flank+serratus+oblique;
  if(y>=1.48)return result;
  // Preserve the accepted lower V/root bed below the torso experiment.
  // This is the incoming lower attachment evaluation, faded out above waist.
  const route=[[1.4,0,.105],[1.46,.022,.133],[1.515,.043,.140],[1.55,.044,.145],[1.59,.030,.155]];
  const outer=profileAt(route.map(k=>[k[0],k[2]]),y),u=ax/outer;
  const cy=y+.033*(u-.30)*windowAt(y,1.48,1.88,.07);
  const oldRectus=profileAt(route.map(k=>[k[0],k[1]]),cy)*smooth((ax-.007)/.023)*(1-smooth((u-.66)/.34))*(1-.10*Math.pow((u-.43)/.60,2));
  const rootWall=p.wallDepth*(1-.15*Math.pow(ax/.19,2))*smooth((.22-ax)/.07)*windowAt(y,1.30,1.93,.13);
  const rootLine=-.005*gauss(x,.020)*windowAt(y,1.39,1.86,.08);
  const rootSheath=.031*gauss(ax-.16,.12)*windowAt(y,1.31,1.88,.14);
  const rootIntersections=.003*(gauss(y-1.615,.026)+gauss(y-1.735,.026))*gauss(ax-.08,.065)*smooth(ax/.025);
  const prior=oldRectus+rootWall+rootLine+rootSheath+serratus+rootIntersections+ribbonField(x,y,TRUNK_PATHS.oblique,.023);
  return prior+(result-prior)*smooth((y-1.40)/.08);
}

export function backField(x,y) {
  const ax=Math.abs(x),sheets=MORPHOLOGY.back.sheets,P=MORPHOLOGY.back.planeDesign;
  const trap=sheetField(x,y,sheets.upperTrap,P)+sheetField(x,y,sheets.middleTrap,P);
  const scapula=sheetField(x,y,sheets.infraspinatus,P);
  const teres=sheetField(x,y,sheets.teres,P);
  const lat=sheetField(x,y,sheets.lat,P);
  const spine=-.007*gauss(x,.016)*windowAt(y,1.41,2.28,.07);
  const lateralStock=.029*gauss(ax-.22,.19)*gauss(y-1.88,.27);
  // A shallow common bed carries the scapular/teres overlap. Its diagonal
  // direction fills the excavated gap without flattening the blade crown.
  const scapularBed=.006*gauss(y-(1.935+.25*(ax-.19)),.11)*gauss(ax-.225,.17);
  // The old broad negative field excavated a spinal canyon. Fill its support
  // floor; reserve the narrow channel above for the actual spinal separation.
  const centralSupport=.009*gauss(x,.22)*windowAt(y,1.63,2.25,.14);
  // The measured posterior midline sat 0.06–0.07 behind neighbouring crowns.
  // Raise its narrow support floor; do not carve a second set of spinal cuts.
  const spinalFloor=P.spinalFloor*.70*gauss(x,P.spinalFloorWidth*.78)*windowAt(y,1.64,2.23,.13);
  const rearAxillary=sheetField(x,y,MORPHOLOGY.back.axillaryFold);
  return trap+scapula+teres+spine+lat+lateralStock+scapularBed+centralSupport+spinalFloor+rearAxillary+ribbonField(x,y,TRUNK_PATHS.erector,.019)*windowAt(y,1.40,1.88,.09);
}

// Final posterior facing surfaces, expressed above the recorded support frame.
// A tilted relief on an elliptical stock otherwise inherits that ellipse.
// This changes broad muscle faces, not the existing recess floors. Overlapping
// footprints share a bounded weighted displacement instead of adding bumps.
function backFacing(x,y,depth){
  const ax=Math.abs(x);let sum=0,weights=0,coverage=0;
  for(const sheet of Object.values(MORPHOLOGY.back.sheets)){
    const F=sheet.surfaceFrame;if(!F)continue;
    let distance=Infinity;
    for(let i=0;i<sheet.footprint.length;i++){
      const a=sheet.footprint[i],b=sheet.footprint[(i+1)%sheet.footprint.length];
      const dx=b[0]-a[0],dy=b[1]-a[1];
      distance=Math.min(distance,(dx*(y-a[1])-dy*(ax-a[0]))/Math.hypot(dx,dy));
    }
    if(distance<=0)continue;
    const w=smooth(distance/F.returnWidth)*smooth((ax-.045)/.025);
    let target=F.depth+(sheet.depth-F.reliefBaseline)
      +F.slope[0]*(ax-sheet.crown[0])+F.slope[1]*(y-sheet.crown[1]);
    if(F.outerTurn)target=Math.min(target,F.depth+F.outerTurn[1]*(ax-F.outerTurn[0]-(F.outerTurn[2]||0)*(y-sheet.crown[1]))+F.slope[1]*(y-sheet.crown[1]));
    const delta=Math.max(-F.limit,Math.min(F.limit,target-depth));
    sum+=w*delta;weights+=w;coverage=Math.max(coverage,w);
  }
  return depth+(weights?sum/weights*coverage:0);
}

// One exterior contour. Quad, glute and hamstring paths terminate *within*
// that contour; no limb split, calf swell or disconnected lower component.
export const LOWER_WIDTH = MORPHOLOGY.LOWER_WIDTH;
const LOWER_FRONT = MORPHOLOGY.LOWER_FRONT;
const LOWER_BACK = MORPHOLOGY.LOWER_BACK;
export const LOWER_PATHS = MORPHOLOGY.LOWER_PATHS;
export function lowerField(x,y,front) {
  const ax=Math.abs(x);
  const width=profileAt(LOWER_WIDTH,y),q=width>1e-6?ax/width:0;
  const quadPlane=.058*windowAt(y,.56,1.48,.23)*smooth((q-.10)/.27)*smooth((.95-q)/.24)*(1-.22*Math.abs(q-.50));
  // Paired knee-inspired changes are interior relief, not new silhouette bulbs.
  const kneeAccent=.012*gauss(y-(.70+.14*q),.065)*gauss(q-.36,.20)*windowAt(y,.58,.95,.10);
  const rail=profileAt([[.56,.028],[.80,.103],[1.10,.237],[1.29,.228],[1.46,.154]],y);
  const bevel=windowAt(y,.56,1.46,.17)*(.010*gauss(ax-rail,.025)-.007*gauss(ax-(rail-.030),.023));
  if(front && MORPHOLOGY.lower.planeDesign.directionalCrown){
    const P=MORPHOLOGY.lower.planeDesign.quadFaces;
    const crest=P.crestQ+P.upperOblique*(y-1.08);
    /* R233 / A2c — THE QUAD'S CROWN IS A C1 DOME, NOT A TENT.

       This term is the anterior quad's whole mass, and it was piecewise
       linear: `.044 - outerSlope*max(0,q-crest) - innerSlope*max(0,crest-q)`,
       clamped at zero. Its derivative jumps from +0.018 to -0.080 across the
       crest — a 5.4x corner — and `max(0, ...)` adds a second one where it
       clamps. A first-derivative discontinuity is invisible while it falls
       between samples and renders as a hard crease the moment a vertex lands
       on it, which is exactly what the 48-side trial produced. Subdivision did
       not create those wedges; it revealed a crease that was already authored
       into the field, which is why more triangles is not the fix.

       The replacement keeps the crest position, the peak and the footprint and
       only changes HOW it falls: a smoothstep dome with zero derivative at the
       crest and at both ends, so there is no corner anywhere for a vertex to
       find. Measured at the mesh's own vertex positions:

           worst first-derivative jump   0.332 -> 0.025   (13x smoother)
           max sample-rate curvature     53.4  -> 44.7    (-16%)
           peak relief                   57.5  -> 57.6    (unchanged)

       Zero slope at the crest is also the anatomically right shape — this
       package's own rule is that a belly is a plateau with steep flanks, not a
       cone — so the quad reads fuller and fleshier at identical mass. */
    const qIn=.10, qOut=Math.min(.97,crest+.044/P.outerSlope);
    const u=q<=crest?(crest-q)/(crest-qIn):(q-crest)/(qOut-crest);
    const plate=(q<=qIn||q>=qOut)?0:.044*(1-smooth(u))*windowAt(y,.52,1.48,.22);
    return plate+kneeAccent+bevel+.017*ribbonField(x,y,LOWER_PATHS.vastusMedialis,1)
      -.012*gauss(x,.022)*windowAt(y,.78,1.44,.17);
  }
  if(front) return quadPlane+kneeAccent
    + ribbonField(x,y,LOWER_PATHS.vastusMedialis,.023)
    + bevel
    - .014*gauss(x,.023)*windowAt(y,.78,1.44,.17);
  return .023*windowAt(y,.56,1.44,.22)*smooth((q-.10)/.27)*smooth((.93-q)/.30)
    +ribbonField(x,y,LOWER_PATHS.glute,.032)
    -.016*gauss(x,.027)*windowAt(y,1.03,1.48,.13);
}

function lowerSurface(a,section,raw) {
  const y=section.y, w=windowAt(y,.08,1.56,.08);
  if(!w)return raw;
  // The same topology follows a long quad axis; the distal boundary walks
  // down medially, instead of closing around the body as a horizontal knee.
  const yy=y+.018*Math.pow(Math.sin(a),2)*windowAt(y,.65,1.44,.16);
  const x=Math.cos(a)*profileAt(LOWER_WIDTH,yy), f=Math.max(0,Math.sin(a)), b=Math.max(0,-Math.sin(a));
  const z=f*(profileAt(LOWER_FRONT,yy)+lowerField(x,yy,true))
    - b*(profileAt(LOWER_BACK,yy)+lowerField(x,yy,false));
  return [raw[0]+(x-raw[0])*w,raw[1]+(yy-raw[1])*w,raw[2]+(z-raw[2])*w];
}

// A broad medial fan narrows and rises into the anterior axillary insertion.
// Its lower boundary is curved in XY, rather than a fixed-height pec ring.
// R121: a connected surface cage owns footprint, crown and attachment turns.
// Boundary nodes use the existing rib support; interior nodes own final Z.
// This replaces the pec field within its footprint, rather than stacking a
// compensating dent or another lobe onto it. Both sides share rest-space data.
let compiledPecCage=null;
function connectedRibSupport(x,y,front){
 const p=MORPHOLOGY.pec.surface,C=p.connectedSupport,ax=Math.abs(x),d=profileAt(p.supportDepth,y);
 let stock=Math.min(d*Math.pow(front,.45),Math.max(0,d-profileAt(C.sideSlope,y)*Math.max(0,ax-C.sideStart)));
 const U=C.underPecPlane;
 if(U){const weight=windowAt(ax,...U.x)*windowAt(y,...U.y),plane=U.z+U.slope[0]*(ax-U.origin[0])+U.slope[1]*(y-U.origin[1]);stock+=Math.max(0,plane-stock)*weight;}
 return stock;
}
function pecCageBoundary(cage){
 const E=MORPHOLOGY.pec.surface.envelope;
 return cage.boundary.map((p,i)=>[p[0],p[1]+(i<=2&&cage.baselineLower?profileAt(E.lower,p[0])-profileAt(cage.baselineLower,p[0]):0)]);
}
function pecCageHeight(ax,y,cage,supportAt,rawOnly=false) {
 if(!compiledPecCage||compiledPecCage.owner!==cage){
  const node=(p,weight)=>[p[0],p[1],p[2]??supportAt(p[0],p[1]),supportAt(p[0],p[1]),weight];
  const outer=pecCageBoundary(cage).map(p=>node(p,0));
  const inner=cage.crown.map(p=>node(p,1)),center=node(cage.crest,1);
  const triangles=[];
  for(let i=0;i<outer.length;i++){const j=(i+1)%outer.length;
    triangles.push([center,inner[i],inner[j],false],[inner[i],outer[i],outer[j],i<=2],[inner[i],outer[j],inner[j],i<=2]);
  }
  compiledPecCage={owner:cage,triangles,xMin:Math.min(...outer.map(p=>p[0])),xMax:Math.max(...outer.map(p=>p[0])),yMin:Math.min(...outer.map(p=>p[1])),yMax:Math.max(...outer.map(p=>p[1]))};
 }
 const compiled=compiledPecCage;
 if(ax<compiled.xMin||ax>compiled.xMax||y<compiled.yMin||y>compiled.yMax)return null;
  const sample=(a,b,c,lowerReturn)=>{
    const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    const u=((b[1]-c[1])*(ax-c[0])+(c[0]-b[0])*(y-c[1]))/d;
    const v=((c[1]-a[1])*(ax-c[0])+(a[0]-c[0])*(y-c[1]))/d,w=1-u-v;
    if(u < -1e-9||v < -1e-9||w < -1e-9)return null;
    const z=u*a[2]+v*b[2]+w*c[2],support=u*a[3]+v*b[3]+w*c[3];
    const crownWeight=u*a[4]+v*b[4]+w*c[4];
    // Match the actual curved support exactly at the footprint boundary,
    // while retaining the independently authored final crown plane inside.
    const local=supportAt(ax,y);
    const wallDelta=lowerReturn&&cage.baselineReturnSection?
      profileAt(MORPHOLOGY.pec.surface.envelope.returnCage.section,crownWeight)-profileAt(cage.baselineReturnSection,crownWeight):0;
    return z+(local-support)*(1-crownWeight)+wallDelta*Math.max(0,z-local);
  };
  for(const tri of compiled.triangles){const z=sample(...tri);if(z!==null){
    if(cage.returnBevel&&!rawOnly){
      let near=null;for(let i=1;i<4;i++){const a=cage.crown[i],b=cage.crown[i+1],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),t=clamp(((ax-a[0])*dx+(y-a[1])*dy)/(length*length)),distance=Math.hypot(ax-a[0]-dx*t,y-a[1]-dy*t);if(!near||distance<near.distance)near={distance,n:[-dy/length,dx/length]};}
      const width=cage.returnBevel;
      if(near.distance<width){const a=pecCageHeight(ax-near.n[0]*width,y-near.n[1]*width,cage,supportAt,true),b=pecCageHeight(ax+near.n[0]*width,y+near.n[1]*width,cage,supportAt,true);if(a!==null&&b!==null)return .25*a+.5*z+.25*b;}
    }
    return z;
  }}
  return null;
}

export function pectoralField(x,y,localSupport) {
  const p=MORPHOLOGY.pec.surface,ax=Math.abs(x);
  const width=profileAt(TRUNK_WIDTH,y)+.052*gauss(y-2.025,.066);
  const front=Math.sqrt(Math.max(0,1-Math.pow(ax/width,2)));
  const support=localSupport??(p.surfaceCage?connectedRibSupport(x,y,front):profileAt(p.supportDepth,y)*Math.pow(front,p.sideExponent));
  if(p.surfaceCage){
    const C=p.connectedSupport;
    const supportAt=(u,v)=>{
      const width=profileAt(TRUNK_WIDTH,v)+.052*gauss(v-2.025,.066);
      const f=Math.sqrt(Math.max(0,1-(u/width)**2)),d=profileAt(p.supportDepth,v);
      return connectedRibSupport(u,v,f);
    };
    const z=pecCageHeight(ax,y,p.surfaceCage,supportAt);
    if(z===null)return 0;
    const delta=(p.sideAdjust?.[x>=0?'right':'left']?.projection||0)*smooth((ax-.044)/.025)
      +profileAt(p.crownDepth,y)-profileAt(p.facingPlanes.baselineCrownDepth,y)
      +(p.facingPlanes.front.slope[0]-p.surfaceCage.baselineSlope[0])*(ax-.17)
      +(p.facingPlanes.front.slope[1]-p.surfaceCage.baselineSlope[1])*(y-2.01);
    return Math.max(0,z-support+delta)*smooth(ax/.020)*smooth((.423-ax)/.032);
  }
  if(p.envelope){
    const E=p.envelope,F=p.moldPlanes;
    const lower=profileAt(E.lower,ax),upper=profileAt(E.upper,ax);
    const fan=smooth((y-lower)/E.lowerReturn)*smooth((upper-y)/E.upperReturn);
    const facing=F.frontDepth-F.crownConvexity*Math.pow((ax-F.crownX)/F.halfWidth,2)
      +F.verticalTilt*(y-2.01);
    const outer=F.outerDepth-F.outerSlope*Math.max(0,ax-F.outerStart);
    let crest=Math.min(facing,outer,profileAt(p.crownDepth,y));
    if(p.facingPlanes){
      const F=p.facingPlanes;
      if(F.baselineCrownDepth)crest=F.front.z+F.front.slope[0]*(ax-F.front.at[0])+F.front.slope[1]*(y-F.front.at[1]);
      for(const plane of F.faces){
        const value=plane.z+plane.slope[0]*(ax-plane.at[0])+plane.slope[1]*(y-plane.at[1]);
        const k=F.fillet;
        crest=Math.min(crest,value)-Math.pow(Math.max(0,k-Math.abs(crest-value)),2)/(4*k);
      }
      // Keep the old crown control as an explicit baseline-relative edit,
      // rather than a hidden height-only cap overriding the authored fan.
      if(F.baselineCrownDepth)crest+=profileAt(p.crownDepth,y)-profileAt(F.baselineCrownDepth,y);
    }
    const adjustment=p.sideAdjust?.[x>=0?'right':'left']?.projection||0;
    // R119: the inferior return owns a curved local section, not a long
    // linear ramp. Its stock fills only the overly hollow costal attachment;
    // it vanishes before the crown and never reaches another torso side.
    if(E.returnCage){
      const R=E.returnCage,d=y-lower,t=d/R.height;
      const stock=R.supportLift*windowAt(d,-R.supportBelow,R.supportAbove,.025)
        *smooth(ax/R.medialFade)*(1-smooth((ax-R.lateralFade[0])/(R.lateralFade[1]-R.lateralFade[0])));
      const available=Math.max(0,crest-support+adjustment);
      // Continue the return beyond its last cage knot; a saturated .10 cap
      // would inadvertently clip a higher crown outside the return territory.
      // The return meets this crown above this local rib support. A fixed
      // .10 rise clipped lateral faces where the rib support slopes inward.
      const lowerWall=R.relativeToCrown?available*(t>=1?1:profileAt(R.section,clamp(t)))
        :.10*(t>1?t:profileAt(R.section,clamp(t)));
      const upperWall=Math.max(0,(upper-y)/E.upperReturn)*.10;
      // Small geometric fillets at wall/crown junctions, evaluated before
      // tessellation. This is not a normal-only bevel or a global smoother.
      const softMin=(a,b,k)=>Math.min(a,b)-Math.pow(Math.max(0,k-Math.abs(a-b)),2)/(4*k);
      const height=Math.max(0,softMin(softMin(available,lowerWall,R.crownJoin),upperWall,R.crownJoin));
      return (Math.max(stock,height))*profileAt(p.crownFootprint,ax)*smooth((width+.015-ax)/.050);
    }
    const relief=E.planarReturn?Math.min(Math.max(0,crest-support+adjustment),
      Math.max(0,(y-lower)/E.lowerReturn)*.10,Math.max(0,(upper-y)/E.upperReturn)*.10)
      :Math.max(0,crest-support+adjustment)*fan;
    return relief*profileAt(p.crownFootprint,ax)
      *smooth((width+.015-ax)/.050);
  }
  // End territories turn upward beneath the clavicle and anterior deltoid.
  const curve=p.lowerCurve*Math.pow((ax-.17)/.23,2)*windowAt(y,1.78,2.04,.09);
  const sectionCrown=profileAt(p.crownDepth,y-curve);
  const F=p.moldPlanes, facing=F.frontDepth-F.crownConvexity*Math.pow((ax-F.crownX)/F.halfWidth,2)+F.verticalTilt*(y-2.01);
  const turn=F.outerDepth-F.outerSlope*Math.max(0,ax-F.outerStart);
  const softMin=(a,b,k)=>Math.min(a,b)-Math.pow(Math.max(0,k-Math.abs(a-b)),2)/(4*k);
  const crown=softMin(softMin(sectionCrown,facing,F.bevel),turn,F.outerBevel);
  const footprint=profileAt(p.crownFootprint,ax);
  // The humeral route narrows beneath the anterior deltoid before it leaves
  // the supporting ribcage; an unbounded crown must not survive outside it.
  const projectionScale=(p.inferiorProjectionScale??1)+((p.projectionScale??1)-(p.inferiorProjectionScale??1))*smooth((y-1.965)/.075);
  const adjustment=p.sideAdjust?.[x>=0?'right':'left']?.projection||0;
  return Math.max(0,crown-support+adjustment)*footprint*windowAt(y,1.77,2.18,.06)*smooth((width+.015-ax)/.050)*projectionScale;
}

// Nonuniform transverse samples put vertices on both sides of a belly peak,
// including the narrow sternum and rectus returns. Angular order is preserved.
export function torsoAngle(a,s) {
  const f=Math.sin(a)>=0, x=Math.cos(a),q=Math.asin(Math.abs(x))/(Math.PI/2)*10;
  let knots=f?[0,.045,.10,.19,.31,.44,.59,.74,.86,.95,1]:[0,.07,.155,.265,.395,.535,.675,.80,.90,.965,1];
  if(f&&s&&MORPHOLOGY.rectus.organization.sampleX){
    const weight=windowAt(s.y,1.49,1.94,.09),width=profileAt(TRUNK_WIDTH,s.y);
    const limits=[0,.10,.19,.31,.44,.59,.74,.86,.93,.975,1];
    const target=MORPHOLOGY.rectus.organization.sampleX.map((k,i)=>i>=8?knots[i]:Math.min(limits[i],k/width));
    // Only interior front samples move; the side seam and posterior stay exact.
    knots=knots.map((k,i)=>i===10?1:k+(target[i]-k)*weight);
  }
  const i=Math.min(9,Math.floor(q)),u=q-i;let r=knots[i]+(knots[i+1]-knots[i])*u;
  const samples=MORPHOLOGY.rectus.organization.surfaceSamples;
  if(f&&s&&samples){
    const weight=windowAt(s.y,...samples.region),width=profileAt(TRUNK_WIDTH,s.y);
    if(weight){
      const patch=MORPHOLOGY.rectus.patches.find(p=>p.name===samples.patch),hits=[];
      for(let j=0;j<patch.contour.length;j++){
        const a=patch.contour[j],b=patch.contour[(j+1)%patch.contour.length];
        if((a[1]-s.y)*(b[1]-s.y)<=0&&Math.abs(b[1]-a[1])>1e-8)hits.push(a[0]+(b[0]-a[0])*(s.y-a[1])/(b[1]-a[1]));
      }
      if(hits.length){
        const edge=Math.max(...hits),n=s.y<1.83?12:16;
        const nodes=[0,.009,.021,.037,patch.crest[0]-.014,patch.crest[0],patch.crest[0]+.017,Math.max(.108,edge-.012),Math.max(.142,edge+.008)];
        const node=k=>{if(k<nodes.length)return nodes[k]/width;const a=Math.min(9,Math.floor(k/n*10)),t=k/n*10-a;return knots[a]+(knots[a+1]-knots[a])*t;};
        const p=q/10*n,k=Math.min(n-1,Math.floor(p)),t=p-k,target=node(k)+(node(k+1)-node(k))*t;
        r+=(target-r)*weight;
      }
    }
  }
  let angle=Math.acos(Math.sign(x)*r);if(!f)angle=2*Math.PI-angle;
  return angle;
}

export function maleTorsoSections(source) {
  // Derived construction cache only. Rebuild after every parameter edit/mount;
  // never make pose or a previous character instance part of morphology.
  compiledPecCage=null;
  return MORPHOLOGY.sampleY.map(y=>{
    const old=source.find(s=>s.y>=y)||source[source.length-1];
    return {...old,y,w:y===0?0:.2,d:y===0?0:.2,shape:undefined,widthShape:undefined,dip:0,facet:0,crystal:0,crystalY:0,cav:0,fg:undefined};
  });
}

function neckField(x,y,front) {
 const ax=Math.abs(x),w=windowAt(y,2.095,2.335,.03);
 const route=profileAt([[2.095,.195],[2.18,.119],[2.30,.066],[2.335,.053]],y);
 if(front){
  const clavicle=.033*gauss(y-(2.126+.085*ax),.022)*gauss(ax-.18,.15)*smooth(ax/.04);
  const anteriorRoute=profileAt(MORPHOLOGY.neck.anteriorRoute,y);
  return w*(MORPHOLOGY.neck.anteriorRelief*gauss(ax-anteriorRoute,.031)+.018*gauss(ax-route,.045)-MORPHOLOGY.neck.throatValley*gauss(x,.027))+clavicle;
 }
 return w*(.023*gauss(ax-route*.8,.044)-.013*gauss(x,.025));
}

// Male connected wall. A single support spans rectus and costal territories;
// independently bounded crowns sit on it. There is no height-only handoff
// between two incompatible front surfaces beneath the pectoral return.
export function connectedFront(x,y,front) {
 const p=MORPHOLOGY.pec.surface,C=p.connectedSupport,O=MORPHOLOGY.rectus.organization;
 const ax=Math.abs(x),depth=profileAt(p.supportDepth,y);
 const lateral=depth-profileAt(C.sideSlope,y)*Math.max(0,ax-C.sideStart);
 const support=connectedRibSupport(x,y,front);
 // The column stock must end before the lateral return; otherwise max()
 // replaces that independently authored wall with the old broad support.
 const S=O.supportReturn,sw=S?windowAt(y,...S.region):0;
 const edge=.151+((S?.outer||.151)-.151)*sw;
 const roll=.035+((S?.width||.035)-.035)*sw;
 let stock=profileAt(O.columnProfile,y);
 const saddle=O.inferiorSupport;
 if(saddle){
   // Restore only the support between the existing lower and middle bellies.
   // This is a total stock level, not another positive muscle or a groove cut.
   const w=windowAt(y,...saddle.region)*windowAt(ax,...saddle.lateral);
   stock+=Math.max(0,profileAt(saddle.stock,y)-stock)*w;
 }
 const bed=stock*smooth(ax/.015)*smooth((edge-ax)/roll);
 const crowns=MORPHOLOGY.rectus.patches.reduce((sum,patch)=>sum+abdominalPatch(x,y,patch,{support,front,columnSupport:bed}),0);
 const rectus=Math.max(crowns,bed);
 const flank=O.lateralSheets.reduce((sum,patch)=>sum+sheetField(x,y,patch),0);
 return support+front*(rectus+flank+neckField(x,y,true))+pectoralField(x,y,support);
}

// Final posterior triangle support, shared crown and return edges. Positive
// depth is posterior Z in the rest chart, not groove-normal relief.
// R166 authoring construction: one shared definition drives the actual
// scapular cage, inferior return and crystal atlas. Positive depth is the
// posterior surface coordinate, not a groove-depth increment.
export function scapularConstruction(authoringMaster=false){
 const retained=MORPHOLOGY.back.sheets.infraspinatus.surfacePatch;
 if(!authoringMaster||!retained)return retained;
 return {...retained,name:'R175 scapular diagonal crown and retained inferior return',
  source:'Original male back mold / Craftsman p12; bounded authoring surface, not scan measurements',
  boundary:[[.119,2.000],[.198,1.955],[.313,2.020],[.278,2.110],[.180,2.130],[.096,2.075]],
  crown:[[.152,2.034,.295],[.211,1.992,.279],[.282,2.038,.239],[.249,2.085,.2442],[.170,2.114,.275],[.128,2.079,.2947]],
  crest:[.192,2.064,.281],supportReturnEdges:[0,1],
  inferiorReturn:{...retained.inferiorReturn,path:[[.147,2.018],[.207,1.975],[.294,2.022]],width:.012,fade:.38,widthEnds:.25}
 };
}
export function scapularSurfacePatch(sign,supportAt,construction){
 return posteriorSurfacePatch(construction||scapularConstruction(),sign,supportAt);
}

export function teresLatSurfacePatch(sign,supportAt){
 return posteriorSurfacePatch(MORPHOLOGY.back.sheets.lat.surfacePatch,sign,supportAt);
}

// R131: a directional connecting face between the measured R130 crown edges.
// Its bounded walls restore the supporting transition; this is not a cut.
export function teresAttachmentRegion(scapularOwner){
 const C=MORPHOLOGY.back.sheets.teres.attachment;if(!C)return null;
 return {name:'teres upper lat attachment',sample:p=>{
  const [x,y,z]=p,ax=Math.abs(x);if(z>=-.015||ax<=C.range[0]||ax>=C.range[1])return null;
  const lower=profileAt(C.lower,ax);
  // Follow the authored scapular floor into the neighboring teres support;
  // retain the existing lat edge, side fade and absolute facing plane.
  const upper=scapularOwner?profileAt(scapularOwner.inferiorReturn.path,ax)-.018:profileAt(C.upper,ax);
  const t=(y-lower)/(upper-lower);
  if(t<=0||t>=1)return null;
  const side=smooth((ax-C.range[0])/C.endFade)*smooth((C.range[1]-ax)/C.endFade);
  const wall=smooth(t/C.walls[0])*smooth((1-t)/C.walls[1]);
  const depth=C.face[2]+C.slope[0]*(ax-C.face[0])+C.slope[1]*(y-C.face[1]);
  const dz=Math.max(-C.limit,Math.min(C.limit,-depth-z))*wall*side;
  return [x,y,z+dz];
 }};
}

// R163: crown-to-support returns in the original male rest chart. The two
// rims are read from immutable B0 geometry, not radial/world-origin depths.
// Hermite slope controls set the wall direction separately from its footprint.
// No new groove field, raised rim, detached plate, or circumference deformation.
export function anatomicalReturnRegions(supportAt){
 const hermite=(a,b,t,m0,m1)=>a+(b-a)*((-2*t*t*t+3*t*t)+(t*t*t-2*t*t+t)*m0+(t*t*t-t*t)*m1);
 const cache=new Map(),at=(x,y,h)=>{const k=[x,y,h].join(',');if(!cache.has(k))cache.set(k,supportAt(x,y,h));return cache.get(k);};
 const latTop=[[.150,1.798],[.209,1.787],[.272,1.867],[.293,1.895]];
 const latBottom=[[.150,1.720],[.209,1.706],[.272,1.797],[.293,1.865]];
 const upperY=x=>profileAt(latTop,x),lowerY=x=>profileAt(latBottom,x);
 const lat={name:'R163 lat crown to lumbar supporting return',sample:p=>{
   const [x,y,z]=p,ax=Math.abs(x);if(z>=-.015||ax<=.150||ax>=.293)return null;
   const a=upperY(ax),b=lowerY(ax),t=(a-y)/(a-b);if(t<=0||t>=1)return null;
   const crown=at(x,a,-1),wall=at(x,b,-1),target=hermite(crown,wall,t,.32,1.20);
   const fade=smooth((ax-.150)/.022)*smooth((.293-ax)/.018)*smooth(t/.16)*smooth((1-t)/.18);
   return [x,y,z+(-target-z)*fade];
 }};
 const quad={name:'R163 long quad outer turn into knee facet',sample:p=>{
   const [x,y,z]=p,ax=Math.abs(x);if(z<=.015||y<=.68||y>=1.38)return null;
   const width=profileAt(LOWER_WIDTH,y),q=ax/width;
   // The broad existing anterior crown is locked; its lateral rail turns
   // diagonally inward toward the internal knee landmark, above the one tip.
   const inner=profileAt([[.68,.48],[.84,.49],[1.10,.54],[1.38,.57]],y),outer=.90;
   const t=(q-inner)/(outer-inner);if(t<=0||t>=1)return null;
   const sign=Math.sign(x),a=at(sign*inner*width,y,1),b=at(sign*outer*width,y,1);
   const u=profileAt([[0,0],[.18,.09],[.74,.80],[1,1]],t);
   const target=a+(b-a)*u,fade=windowAt(y,.68,1.38,.10)*smooth(t/.12)*smooth((1-t)/.18);
   return [x,y,z+(target-z)*fade];
 }};
 const medial={name:'R163 quad medial return to shared knee convergence',sample:p=>{
   const [x,y,z]=p,ax=Math.abs(x);if(z<=.015||y<=.72||y>=1.38)return null;
   const width=profileAt(LOWER_WIDTH,y),q=ax/width;
   const outer=profileAt([[.72,.39],[.87,.36],[1.06,.29],[1.38,.27]],y),inner=.065;
   const t=(q-inner)/(outer-inner);if(t<=0||t>=1)return null;
   const sign=Math.sign(x),a=at(sign*inner*width,y,1),b=at(sign*outer*width,y,1);
   const u=profileAt([[0,0],[.20,.12],[.78,.88],[1,1]],t);
   const target=a+(b-a)*u,fade=windowAt(y,.72,1.38,.11)*smooth(t/.14)*smooth((1-t)/.15);
   return [x,y,z+(target-z)*fade];
 }};
 return [lat,quad,medial];
}

// R165: the upper medial rail converges obliquely into its crown attachment.
// The long medial quad return owns two rails into one shallow knee
// kite. It reuses the local triangle allocation; no groove-depth coefficient.
// Control Z is sampled from retained R163, so new planes explain that mass.
export const QUAD_KNEE_LAYOUT={
 // These first three positions are actual retained R163 crown vertices.
 crown:[[.08444856107234955,1.2799999713897705],[.13451461493968964,1.1399999856948853],[.10884512960910797,.9700000286102295],[.064,.90]],
 medial:[[.075,1.292],[.044,1.14],[.042,.97],[.039,.90]],
 knee:[[.064,.90],[.129,.79],[.063,.645],[.039,.79]],center:[.065,.79]
};
export function quadKneeSurfacePatch(sign,supportAt){
 const {crown,medial,knee,center}=QUAD_KNEE_LAYOUT;
 const z=p=>[...p,supportAt(sign*p[0],p[1])],triangles=[];
 for(let i=0;i<crown.length-1;i++){
   const a=z(crown[i]),b=z(crown[i+1]),c=z(medial[i+1]),d=z(medial[i]);
   triangles.push([a,b,c],[a,c,d]);
 }
 for(let i=0;i<knee.length;i++)triangles.push([z(center),z(knee[i]),z(knee[(i+1)%knee.length])]);
 const sample=(x,y)=>{
  const ax=Math.abs(x),incoming=supportAt(x,y);
  for(const[a,b,c]of triangles){
   const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
   const u=((b[1]-c[1])*(ax-c[0])+(c[0]-b[0])*(y-c[1]))/d,v=((c[1]-a[1])*(ax-c[0])+(a[0]-c[0])*(y-c[1]))/d,w=1-u-v;
   if(Math.min(u,v,w)<-1e-8)continue;
   // Only the superior attachment blends back to its retained support.
   // Its footprint narrows obliquely; the finite transition ends at the
   // next medial station. Crown anchors still sample their original Z.
   const target=u*a[2]+v*b[2]+w*c[2];
   const attachment=smooth((medial[0][1]-y)/(medial[0][1]-medial[1][1]));
   return [x,y,incoming+(target-incoming)*attachment];
  }return[x,y,incoming];
 };
 const paths=[medial,crown,...crown.map((p,i)=>[p,medial[i]]),knee.concat([knee[0]]),...knee.map(p=>[center,p])];
 return{name:'R164 quad medial rails and knee kite',sign,facing:1,
  accept:p=>p[2]>.04&&p[0]*sign>.015&&p[0]*sign<.21&&p[1]>.55&&p[1]<1.40,
  paths,sample};
}

function posteriorSurfacePatch(C,sign,supportAt){
 if(!C)return null;
 const outer=C.boundary.map(p=>[...p,supportAt(sign*p[0],p[1]),0]);
 const inner=C.crown.map(p=>[...p,1]),center=[...C.crest,1],triangles=[];
 for(let i=0;i<outer.length;i++){
  const j=(i+1)%outer.length,faces=[[center,inner[i],inner[j]],[inner[i],outer[i],outer[j]],[inner[i],outer[j],inner[j]]];
  faces.forEach((face,k)=>{face.returnEdge=k===0?-1:i;triangles.push(face);});
 }
 function depth(x,y){const ax=Math.abs(x),incoming=supportAt(x,y);
  for(const tri of triangles){
   const [a,b,c]=tri;
   const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
   const u=((b[1]-c[1])*(ax-c[0])+(c[0]-b[0])*(y-c[1]))/d,v=((c[1]-a[1])*(ax-c[0])+(a[0]-c[0])*(y-c[1]))/d,w=1-u-v;
   if(Math.min(u,v,w)<-1e-9)continue;
   const target=u*a[2]+v*b[2]+w*c[2],weight=u*a[3]+v*b[3]+w*c[3];
   // R166 inferior walls approach the crown through supporting volume.
   // Early support engagement removes the hollow shelf; crown and outer
   // boundary still meet their exact targets. Other regions retain B0.
   const blend=C.supportReturnEdges?.includes(tri.returnEdge)?weight*(2-weight):smooth(weight);
   return incoming+(target-incoming)*blend;
  }return incoming;
 }
 const returns=C.inferiorReturn;
 let floorPaths=[];
 if(returns){
  const path=returns.path,lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
  const total=lengths.at(-1),stations=[...new Set([0,.25,.5,.75,1,...lengths.map(l=>l/total)])].sort((a,b)=>a-b);
  floorPaths=[-.65,0,.65].map(offset=>stations.map(h=>{
   let j=1;while(j<path.length-1&&lengths[j]<h*total)j++;const a=path[j-1],b=path[j],length=lengths[j]-lengths[j-1],t=(h*total-lengths[j-1])/length,dx=b[0]-a[0],dy=b[1]-a[1];
   const half=returns.width*.5*(returns.widthEnds+(1-returns.widthEnds)*Math.sin(Math.PI*h));
   return [a[0]+t*dx-dy/length*half*offset,a[1]+t*dy+dx/length*half*offset];
  }));
 }
 const region=C.sampleRegion||[.075,.335,1.91,2.145];
 return {name:C.name||'scapular connected crown and inferior return',sign,facing:-1,
  normalCrown:C.moldNormals===false?undefined:C.crown.map(p=>p.slice(0,2)),
  accept:p=>p[2]<-.015&&p[0]*sign>region[0]&&p[0]*sign<region[1]&&p[1]>region[2]&&p[1]<region[3]
   &&(!C.upperLimit||p[1]<C.upperLimit[1]+Math.max(0,p[0]*sign-C.upperLimit[0])*C.upperLimit[2]),
  paths:[C.crown.map(p=>p.slice(0,2)).concat([C.crown[0].slice(0,2)])].concat(C.crown.map(p=>[C.crest.slice(0,2),p.slice(0,2)]),floorPaths),
  sample:(x,y)=>[x,y,-depth(x,y)]};
}

export function pectoralSurfacePatch(sign){
 const cage=MORPHOLOGY.pec.surface.surfaceCage;
 if(!cage?.conformOuterReturn)return null;
 const path=cage.crown.slice(1,5).map(p=>p.slice(0,2)),b=cage.returnBevel||0;
 const normals=path.map((p,i)=>{let nx=0,ny=0;for(const j of [i-1,i])if(j>=0&&j<path.length-1){const dx=path[j+1][0]-path[j][0],dy=path[j+1][1]-path[j][1],l=Math.hypot(dx,dy);nx-=dy/l;ny+=dx/l;}const l=Math.hypot(nx,ny);return [nx/l,ny/l];});
 return {name:'outer pec crown/return',sign,
  accept:p=>p[2]>.015&&p[0]*sign>.105&&p[0]*sign<.395&&p[1]>1.90&&p[1]<2.145,
  paths:(b?[-1,0,1].map(side=>path.map((p,i)=>[p[0]+side*b*normals[i][0],p[1]+side*b*normals[i][1]])):[path])
    .concat(cage.conformCrownFan?path.map((p,i)=>[cage.crest.slice(0,2),[p[0]+b*normals[i][0],p[1]+b*normals[i][1]]]):[]),
  sample:(x,y)=>{const width=profileAt(TRUNK_WIDTH,y),aw=.052*gauss(y-2.025,.066);let lo=0,hi=Math.PI/2;
   for(let i=0;i<36;i++){const a=(lo+hi)/2,xx=Math.cos(a)*(width+aw*smooth(Math.sin(a)/.55));if(xx>Math.abs(x))lo=a;else hi=a;}
   return [x,y,connectedFront(x,y,Math.sin((lo+hi)/2))];}
 };
}

// Shared abdominal return follows both current footprints in the rest chart.
// It carries the existing total-depth/floor/wall settings, without another
// positive mass or additive cut. A crown edit does not move its attachment.
export function rectusIntersectionPath(){
 const O=MORPHOLOGY.rectus.organization.sharedIntersection;
 if(!O)return null;
 function limits(poly,x){
  const ys=[];
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length];
   if(Math.abs(b[0]-a[0])<1e-10||x<Math.min(a[0],b[0])||x>Math.max(a[0],b[0]))continue;
   ys.push(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]));
  }
  return ys.length?[Math.min(...ys),Math.max(...ys)]:null;
 }
 const lower=MORPHOLOGY.rectus.patches[O.lowerPatch].contour,upper=MORPHOLOGY.rectus.patches[O.upperPatch].contour;
 return O.stations.flatMap(x=>{const a=limits(lower,x),b=limits(upper,x);return a&&b?[[x,(a[1]+b[0])*.5]]:[];});
}

export function torsoSurface(a,section,raw) {
 const y=section.y,sine=Math.abs(Math.sin(a))<1e-12?0:Math.sin(a),front=Math.max(0,sine),rear=Math.max(0,-sine);
 if(y===0)return [0,0,0];
 // Small bounded diagonal row flow follows the pec return and scapular planes.
 // Sample rows follow the actual inferior fan and scapular direction.
 // Both warps vanish at the side seam and maintain increasing row order.
 const axEstimate=Math.abs(Math.cos(a))*profileAt(TRUNK_WIDTH,y);
 let pecFlow=0;
 const cage=MORPHOLOGY.pec.surface.surfaceCage;
 if(cage?.alignedRows&&front>0&&y>=1.865&&y<=2.18){
   // A fixed column label is essential: allowing its X to drift with each
   // row's rib width can reverse the longitudinal map near a cage corner.
   const ax=Math.max(.041,Math.abs(Math.cos(a))*(profileAt(TRUNK_WIDTH,2.015)+.052*gauss(-.010,.066)));
   const limits=poly=>{
     const hits=[];
     for(let i=0;i<poly.length;i++){
       const p=poly[i],q=poly[(i+1)%poly.length];
       if((p[0]-ax)*(q[0]-ax)<=0&&Math.abs(q[0]-p[0])>1e-8)hits.push(p[1]+(q[1]-p[1])*(ax-p[0])/(q[0]-p[0]));
     }
     return hits.length?[Math.min(...hits),Math.max(...hits)]:null;
   };
   const b=limits(cage.boundary),c=limits(cage.crown);
   if(b&&c){
     const blend=(a,b,t)=>a+(b-a)*t;
     const ys=[1.865,b[0],blend(b[0],c[0],.5),c[0],blend(c[0],c[1],.25),blend(c[0],c[1],.5),blend(c[0],c[1],.75),c[1],blend(c[1],b[1],.33),blend(c[1],b[1],.66),b[1],blend(b[1],2.18,.5),2.18];
     const rows=[1.865,1.91,1.935,1.96,1.985,2.01,2.035,2.06,2.085,2.11,2.135,2.16,2.18];
     const i=Math.min(rows.length-2,Math.max(0,rows.findIndex(v=>v>=y)-1));
     const mapped=blend(ys[i],ys[i+1],(y-rows[i])/(rows[i+1]-rows[i]));
     pecFlow=(mapped-y)*smooth((.33-ax)/.065);
   }
 }
 const abdominalFlow=.014*Math.pow(Math.cos(a),2)*windowAt(y,1.46,1.85,.10);
 // The posterior sheets already carry their own diagonal boundaries. Warping
 // coarse neck rows diagonally made adjacent density transitions fold across
 // one another. Keep their sampling chart axial; retain the same shape field.
 const posteriorFlow=0;
 const yy=y+(pecFlow+abdominalFlow)*smooth(front/.28)+posteriorFlow*smooth(rear/.28);
 const low=1-smooth((yy-1.40)/.15);
 const width=profileAt(TRUNK_WIDTH,yy)*(1-low)+profileAt(LOWER_WIDTH,yy)*low;
 const latWidth=.025*windowAt(yy,1.57,2.06,.17)*smooth(rear/.7);
 const axillaryWidth=.052*gauss(yy-2.025,.066)*smooth(front/.55);
 const x=Math.cos(a)*(width+latWidth+axillaryWidth);
 const df=profileAt(TRUNK_FRONT,yy)*(1-low)+profileAt(LOWER_FRONT,yy)*low;
 const db=profileAt(TRUNK_BACK,yy)*(1-low)+profileAt(LOWER_BACK,yy)*low;
 // Abdominal attachment fields continue farther than the width-profile blend.
 // Ending both at the same ring made a belt below the third rectus pair.
 const frontOwner=MORPHOLOGY.pec.surface.connectedSupport;
 const joinedWeight=frontOwner&&front>0?windowAt(yy,...frontOwner.region)*smooth(front/.20):0;
 const frontRelief=joinedWeight===1?0:coreField(x,yy)*smooth((yy-1.30)/.25)+lowerField(x,yy,true)*low-.012*gauss(Math.abs(x)-.255,.080)*gauss(yy-1.867,.075);
 const backRelief=backField(x,yy)*(1-low)+lowerField(x,yy,false)*low;
 // The posterior ribcage is a broad support plane, not an ellipse whose
 // centre becomes a spinal ridge as soon as lateral muscles are added.
 // Width is unchanged; the bounded exponent fills the false lateral hollows.
 const posteriorStock=Math.pow(rear,1-.45*windowAt(yy,1.52,2.20,.14))*db;
 let anteriorStock=Math.pow(front,1-.50*windowAt(yy,1.42,1.94,.10))*df;
 const flankTurn=MORPHOLOGY.rectus.organization.flankTurn;
 const flankSlope=flankTurn.slopeProfile?profileAt(flankTurn.slopeProfile,yy):flankTurn.slope;
 const sideSupport=Math.max(0,df-flankSlope*Math.max(0,Math.abs(x)-flankTurn.startX));
 anteriorStock+=(Math.min(anteriorStock,sideSupport)-anteriorStock)*windowAt(yy,...flankTurn.region)*smooth(front/.30);
 const lowerWall=.030*gauss(x,.145)*windowAt(yy,1.31,1.65,.14);
 let anatomyFront=anteriorStock+front*(frontRelief+neckField(x,yy,true)+lowerWall);
 // Integrated quad-facing planes: only the excessive anterior crown is
 // clipped. X, the posterior field and the shared terminal topology stay put.
 const qLower=Math.abs(x)/Math.max(.001,width),L=MORPHOLOGY.lower.planeDesign;
 const lowerPlane=profileAt(LOWER_FRONT,yy)+L.crownLimit-L.crownConvexity*Math.pow(qLower-.42,2);
 const lowerPlaneWeight=windowAt(yy,.70,1.45,.16)*smooth((qLower-.12)/.18)*smooth((.94-qLower)/.20)*front;
 anatomyFront-=Math.max(0,anatomyFront-lowerPlane)*lowerPlaneWeight;
 if(front>0&&L.surfaceFaces){
   const F=L.surfaceFaces,q=qLower;
   let crest=profileAt(F.depth,yy);
   if(F.linearFaces){
     const i=Math.max(0,F.depth.findIndex(p=>p[0]>=yy)-1),a=F.depth[i],b=F.depth[Math.min(i+1,F.depth.length-1)];
     if(yy>=F.depth[0][0]&&yy<=F.depth.at(-1)[0])crest=a[1]+(b[1]-a[1])*clamp((yy-a[0])/(b[0]-a[0]||1));
   }
   const central=crest-F.convexity*Math.pow(q-F.crestQ,2);
   const inner=crest-width*F.innerSlope*Math.max(0,F.innerTurn-q);
   const outer=crest-width*F.outerSlope*Math.max(0,q-F.outerTurn);
   const target=Math.min(central,inner,outer);
   const weight=windowAt(yy,...F.region)*smooth((q-F.boundary[0])/F.edgeWidth)
     *smooth((F.boundary[1]-q)/F.edgeWidth);
   // Two facing fields inside the one exterior. X, posterior stock, terminal
   // point and waist remain unchanged. Boundaries blend into the shared wall.
   anatomyFront+=(target-anatomyFront)*weight;
 }
 const p=MORPHOLOGY.pec.surface,blend=windowAt(yy,...p.blend)*smooth(front/.20);
 // Numeric fit: fill the excessive upper sternum recess locally. The midline
 // was already recessed; subtracting its projection would deepen a false cut.
 const sternalFloor=(p.sternumSupport||0)*gauss(x,.027)*gauss(yy-2.045,.06)*smooth((yy-1.98)/.035)
   -(p.lowerSternumSeparation||0)*gauss(x,.017)*gauss(yy-1.97,.029);
 let thoracicFront=joinedWeight===1?0:profileAt(p.supportDepth,yy)*Math.pow(front,p.sideExponent)+pectoralField(x,yy)+sternalFloor;
 // The sternum is a narrow joined support surface, not a ridge added beside
 // two independent deep slots. It blends only within the medial pec return.
 const sternalBlend=(1-smooth((Math.abs(x)-.023)/.027))*windowAt(yy,1.825,2.18,.06)*front;
 const sternumBed=profileAt(p.sternumSurface,yy)+.12*Math.abs(x);
 thoracicFront+=Math.max(0,sternumBed-thoracicFront)*sternalBlend;
 // Broad posterior attachment sheets retain their own depth toward the
 // outer ribcage. A full radial multiplier had erased their lateral crowns.
 const posteriorWindow=windowAt(yy,1.58,2.18,.10);
 const posteriorResponse=rear+(Math.pow(rear,MORPHOLOGY.back.planeDesign.outerReliefExponent)*smooth(rear/.30)-rear)*posteriorWindow;
 let anterior=anatomyFront+(thoracicFront-anatomyFront)*blend;
 // Derive the narrow midline from its actual neighbouring wall. This avoids
 // a separately authored central bar or two raised inner edges beside a slit.
 if(p.connectedSupport && front>0){
   const C=p.connectedSupport,w=joinedWeight;
   let joined=connectedFront(x,yy,front);
   const T=C.thoracicMidline,tw=T?windowAt(yy,...T.region):0;
   const A=C.rectusMidline,aw=A?windowAt(yy,...A.region):0;
   const baseWidth=C.midlineHalfWidth+((A?.halfWidth||C.midlineHalfWidth)-C.midlineHalfWidth)*aw;
   const baseDepth=C.midlineRecess+((A?.recess||C.midlineRecess)-C.midlineRecess)*aw;
   const midWidth=baseWidth+((T?.halfWidth||baseWidth)-baseWidth)*tw;
   const midDepth=baseDepth+((T?.recess||baseDepth)-baseDepth)*tw;
   if(Math.abs(x)<midWidth){
     const nx=midWidth,nf=Math.sqrt(Math.max(0,1-Math.pow(nx/(width+axillaryWidth),2)));
     const neighbour=connectedFront(Math.sign(x||1)*nx,yy,nf);
     joined=neighbour-midDepth*Math.pow(1-Math.pow(Math.abs(x)/nx,2),2);
   }
   // R123: the medial attachment returns to its actual pec-side support.
   // The old near-centre rim inherited the low stock and made a deep slot.
   // This is one continuous bridge, with a finite floor and a tangent-matched
   // outer wall; the fixed pec crown and outer return are outside its footprint.
   const B=C.thoracicBridge,bw=B?windowAt(yy,...B.region):0;
   if(bw&&Math.abs(x)<B.halfWidth){
     const rimAt=nx=>connectedFront(Math.sign(x||1)*nx,yy,Math.sqrt(Math.max(0,1-Math.pow(nx/(width+axillaryWidth),2))));
     const rim=rimAt(B.halfWidth),floor=rim-B.floorOffsetZ,span=B.halfWidth-B.floorHalfWidth;
     const slope=Math.max(0,Math.min(2*B.floorOffsetZ/span,(rimAt(B.halfWidth+.001)-rimAt(B.halfWidth-.001))/.002));
     const q=clamp((Math.abs(x)-B.floorHalfWidth)/span);
     const bridge=(2*q*q*q-3*q*q+1)*floor+(-2*q*q*q+3*q*q)*rim+(q*q*q-q*q)*span*slope;
     joined+=(bridge-joined)*bw;
   }
   anterior+=(joined-anterior)*w;
 }

 let posterior=posteriorStock+posteriorResponse*backRelief+rear*neckField(x,yy,false);
 const spinal=MORPHOLOGY.back.midlineReturn;
 if(spinal&&rear>0){
   const hw=profileAt(spinal.halfWidth,yy),q=Math.abs(x)/hw;
   if(q<1){
     const nr=Math.sqrt(Math.max(0,1-Math.pow(hw/(width+latWidth),2)));
     const stock=Math.pow(nr,1-.45*windowAt(yy,1.52,2.20,.14))*db;
     const response=nr+(Math.pow(nr,MORPHOLOGY.back.planeDesign.outerReliefExponent)*smooth(nr/.30)-nr)*posteriorWindow;
     const rim=stock+response*(backField(hw,yy)*(1-low)+lowerField(hw,yy,false)*low)+nr*neckField(hw,yy,false);
     const floor=rim-spinal.depth*(1-smooth((q-spinal.floorFraction)/(1-spinal.floorFraction)));
     posterior+=(floor-posterior)*windowAt(yy,...spinal.region);
   }
 }
 if(rear>0)posterior=backFacing(x,yy,posterior);
 const z=anterior-posterior;
 return [x,yy,z];
}

// Cavity follows local separation territory, never inherited full ring belts.
export function torsoCavity(a,s,p) {
 const x=p[0],y=p[1],front=Math.max(0,Math.sin(a)),rear=Math.max(0,-Math.sin(a));
 return .20*front*gauss(x,.028)*windowAt(y,1.4,2.12,.08)+.16*rear*gauss(x,.028)*windowAt(y,1.4,2.25,.08);
}

// R115 optional broad-surface normals use derivatives of the exact active
// position field, not a normal texture or independent anatomy description.
export function torsoMoldNormal(a,s){
 if(s.y<.60||s.y>2.20)return null;
 const e=.002,at=(d,y)=>torsoSurface(d,{y},[0,y,0]);
 const lo=at(a-e,s.y),hi=at(a+e,s.y),down=at(a,s.y-e),up=at(a,s.y+e);
 const u=hi.map((v,i)=>v-lo[i]),v=up.map((n,i)=>n-down[i]);
 const n=[v[1]*u[2]-v[2]*u[1],v[2]*u[0]-v[0]*u[2],v[0]*u[1]-v[1]*u[0]],l=Math.hypot(...n);
 return l>1e-10?n.map(v=>v/l):null;
}
