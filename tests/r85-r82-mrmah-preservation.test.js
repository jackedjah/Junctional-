'use strict';
/* R82 · MR.MAH MICRO-SPECULAR SILVER EDGE + FACET DEFINITION
 *
 * The pass condition this suite exists to defend:
 *
 *   "Mr.Mah remains a very dark low-poly character, but tiny, selectively
 *    illuminated silver/theme-tinted bevels now allow the eye to understand the
 *    head, shoulders, torso and arms as separate three-dimensional crystal-like
 *    planes."
 *
 * and the three ways it can fail:
 *
 *   "they added an outline"          -> R82-RHYTHM measures silhouette coverage
 *   "they made him brighter"         -> R82-DARK measures the lighting budget
 *   "there are lines on his face"    -> R82-FACE measures seam-to-feature distance
 *
 * Every number below is computed from the shipped rig geometry, not asserted.
 */
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'mygym.js'),'utf8');
const css=fs.readFileSync(path.join(root,'mygym.css'),'utf8');
const server=fs.readFileSync(path.join(root,'netlify/functions/mygym.js'),'utf8');
let passed=0;
function P(id,ok,msg){assert.ok(ok,id+' FAILED — '+msg);passed++;console.log('  '+id+' PASS')}
function ex(name){const start=js.indexOf('function '+name+'(');assert.ok(start>=0,'missing '+name);let i=js.indexOf('{',start),depth=0,quote='',esc=false;for(;i<js.length;i++){const c=js[i];if(quote){if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(c===quote)quote='';continue}if(c==='"'||c==="'"||c==='`'){quote=c;continue}if(c==='{')depth++;else if(c==='}'&&--depth===0)return js.slice(start,i+1)}throw new Error('unterminated '+name)}
function rule(sel){const i=css.indexOf(sel+'{');if(i<0)return'';return css.slice(i+sel.length+1,css.indexOf('}',i))}
const rig=ex('fabiRigHTML');

/* ── geometry helpers ─────────────────────────────────────────────────────── */
const num=s=>Number(s);
function subpaths(d){return String(d).split(/(?=M)/).filter(s=>/\d/.test(s)).map(s=>
  [...s.matchAll(/(-?[\d.]+)\s+(-?[\d.]+)/g)].map(m=>[num(m[1]),num(m[2])]))}
function segments(d){const out=[];for(const p of subpaths(d))for(let i=0;i+1<p.length;i++)out.push([p[i],p[i+1]]);return out}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const segLen=s=>dist(s[0],s[1]);
function pointToSeg(p,a,b){const vx=b[0]-a[0],vy=b[1]-a[1],L=vx*vx+vy*vy;
  const t=L?Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/L)):0;
  return Math.hypot(p[0]-(a[0]+vx*t),p[1]-(a[1]+vy*t))}
/* How much of segment S lies within `tol` of segment T, sampled along S. */
function overlap(S,T,tol){const n=40;let hit=0;
  for(let i=0;i<=n;i++){const t=i/n,p=[S[0][0]+(S[1][0]-S[0][0])*t,S[0][1]+(S[1][1]-S[0][1])*t];
    if(pointToSeg(p,T[0],T[1])<=tol)hit++}
  return hit/(n+1)}
function pathD(cls){const m=rig.match(new RegExp('class="[^"]*'+cls+'[^"]*"[^>]*?d="([^"]+)"'));return m?m[1]:''}

const EDGES={spark:pathD('fabi-rig__edge--spark'),key:pathD('fabi-rig__edge--key'),quiet:pathD('fabi-rig__edge--quiet')};

console.log('R82 · MR.MAH MICRO-SPECULAR SILVER EDGE + FACET DEFINITION');

console.log('\nOWNERSHIP — one character, one material, no new subsystem');
P('R82-OWN-01',(js.match(/function fabiRigHTML\(/g)||[]).length===1,'the canonical rig owner is still the only one that gained specular geometry');
P('R82-OWN-02',(js.match(/setProperty\('--fabi-spec-silver'/g)||[]).length===1,'exactly ONE canonical specular material colour is defined');
P('R82-OWN-03',!/<canvas|WebGL|getContext\(/i.test(rig)&&!/new Worker\(/.test(ex('fabiWriteMidpointPerspective')),'no renderer or worker was introduced for the lighting');
P('R82-OWN-04',(ex('fabiStartAnimation').match(/function tick\(/g)||[]).length===1&&!/setInterval\(/.test(ex('fabiStartAnimation')),'no duplicate animation loop was added');
{
  const binder=ex('bindFabiCharacterDrag');
  const ev=['pointerdown','pointermove','pointerup','pointercancel'].map(n=>(binder.match(new RegExp("addEventListener\\('"+n+"'",'g'))||[]).length);
  P('R82-OWN-05',ev.every(n=>n<=1)&&(js.match(/var FABI_CHARACTER_GESTURE/g)||[]).length===1,'no duplicate pointer/drag owner was added');
}
P('R82-OWN-06',(rig.match(/class="fabi-rig__edge /g)||[]).length===3,'the specular system reuses the three canonical edge layers rather than adding a parallel one');
P('R82-OWN-07',!/getBoundingClientRect|offsetWidth|getComputedStyle/.test(ex('fabiWriteMidpointPerspective')),'the lighting writer performs no layout read');

console.log('\nMATERIAL — reflected light, not coloured neon');
{
  const applyStart=js.indexOf('function applyTheme('),line=js.slice(applyStart,js.indexOf('--mah-demo-primary',applyStart));
  const m=line.match(/setProperty\('--fabi-spec-silver',mixHex\('(#[0-9A-Fa-f]{6})',a,\.(\d+)\)\)/);
  P('R82-MAT-01',!!m,'the specular colour is derived in the theme owner from the live accent');
  const neutral=m&&m[1],share=m&&Number('.'+m[2]);
  const rgb=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
  const sat=c=>{const mx=Math.max(...c),mn=Math.min(...c);return mx?(mx-mn)/mx:0};
  P('R82-MAT-02',share>=.15&&share<=.30,'the active Secondary contributes '+Math.round(share*100)+'% — present, but the neutral dominates');
  P('R82-MAT-03',sat(rgb(neutral))<.05,'the neutral component is a true pale silver (sat '+sat(rgb(neutral)).toFixed(3)+'), not a tinted colour');
  const L=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
  P('R82-MAT-04',L(rgb(neutral))>200,'the neutral sits at the LIGHT end (L '+Math.round(L(rgb(neutral)))+') — a reflection is the environment arriving at an edge, not a surface value');
  /* Resolved against four real themes: still reads as silver, never as the accent. */
  const ctx=vm.createContext({});vm.runInContext(ex('cleanHex')+ex('hexRgb')+ex('rgbHex')+ex('mixHex'),ctx);
  for(const [name,accent] of [['green','#3FCB7A'],['blue','#4FD8D0'],['purple','#9B7BE8'],['warm','#E08A4F']]){
    const out=vm.runInContext("mixHex('"+neutral+"','"+accent+"',"+share+")",ctx);
    const s=sat(rgb(out)),sa=sat(rgb(accent));
    P('R82-MAT-05:'+name,s<sa*.45&&s<.22,'in '+name+' the bevel resolves to sat '+s.toFixed(3)+' against the accent\'s '+sa.toFixed(3)+' — reflected light, not a coloured stroke');
  }
  P('R82-MAT-06',/stroke:var\(--fabi-spec-silver/.test(rule('#mygym .fabi-rig .fabi-rig__edge--spark'))
    &&/fabi-spec-silver/.test(rig),'the brightest tier and the sweep both paint from that one material');
  P('R82-MAT-07',!/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i.test(rig),'no literal colour was introduced into the rig itself');
  P('R82-MAT-08',!/#(?:00ffff|0ff|4fd8c6|2ec4e6|00e5ff|5cb8d6)\b/i.test(css.slice(css.indexOf('MR.MAH — R80')))
    &&!/\bcyan\b/i.test(css.slice(css.indexOf('MR.MAH — R80'))),'the reference blue/cyan is not hard-coded in the character owner');
}

console.log('\nTHICKNESS — a reflection, not a stroke');
{
  const tiers=[['spark','#mygym .fabi-rig .fabi-rig__edge--spark'],['key','#mygym .fabi-rig .fabi-rig__edge--key'],['quiet','#mygym .fabi-rig .fabi-rig__edge--quiet']];
  const w={};
  for(const [n,sel] of tiers){const r=rule(sel);w[n]=Number((r.match(/stroke-width:([\d.]+)px/)||[])[1])}
  P('R82-THIN-01',Object.values(w).every(v=>v>=.4&&v<=.9),'every tier is between 0.4 and 0.9 CSS px ('+JSON.stringify(w)+')');
  P('R82-THIN-02',w.quiet<w.spark&&w.spark<w.key,'interior seams are thinner than the reflections they support ('+w.quiet+' < '+w.spark+' < '+w.key+')');
  const base=rule('#mygym .fabi-rig .fabi-rig__edge');
  P('R82-THIN-03',/vector-effect:non-scaling-stroke/.test(base),'the shared edge rule makes every tier non-scaling, so iPad cannot thicken the bevel into a contour');
  P('R82-THIN-04',!/stroke-width:\s*\d+(\.\d+)?\s*[;}]/.test(base+Object.values(tiers).join('')),'no tier falls back to a scaling user-unit width');
  /* The forbidden thing is an outline as MATERIAL. The keyboard-focus ring on the
     character button is an accessibility affordance and must survive. */
  const charOutlines=[...css.matchAll(/([^{}]*fabi-(?:rig|character)[^{}]*)\{([^}]*)\}/g)]
    .filter(m=>/outline:/.test(m[2])&&!/:focus/.test(m[1]));
  P('R82-THIN-05',charOutlines.length===0,'no character rule paints an outline as material'+(charOutlines.length?': '+charOutlines[0][1]:''));
  P('R82-THIN-05b',/\.fabi-character:focus-visible\{outline:/.test(css),'the keyboard focus ring on the character button is preserved');
  const rigRule=rule('#mygym .fabi-rig');
  P('R82-THIN-06',!/filter:drop-shadow[^;]*\)\s*drop-shadow[^;]*\)\s*drop-shadow/.test(rigRule),'no filter stack was added over the whole character');
}

console.log('\nHIERARCHY — three strengths, measured as composites');
{
  const op=sel=>rule(sel);
  /* Derive the REACHABLE range of every input by evaluating the shipped formulas
     over the whole pose domain. Using the clamp limits instead would test corners
     the renderer can never actually produce. */
  const light=ex('fabiApplySceneLighting'),writer=ex('fabiWriteMidpointPerspective'),mid=ex('fabiMidpointPerspective');
  const ridgeExpr=(light.match(/ridgeOpacity=([^;]+);/)||[])[1];
  const shadowExpr=(light.match(/setProperty\('--fabi-shadow-opacity',(\(.+?\))\.toFixed/)||[])[1];
  const globalExpr=(mid.match(/var global=([^,]+),/)||[])[1];
  const swingExpr=(writer.match(/var swing=([^;]+);/)||[])[1];
  const centre=Number((writer.match(/'--fabi-spec-a',\((\.\d+)\+swing\)/)||[])[1]);
  P('R82-TIER-00',!!ridgeExpr&&!!shadowExpr&&!!swingExpr&&Number.isFinite(centre)&&typeof mid==='string'&&mid.length>0,
    'the tier inputs were read out of the shipped owners, not restated');
  const span=(f)=>{let lo=Infinity,hi=-Infinity;
    for(let i=-20;i<=20;i++)for(let j=-20;j<=20;j++){const v=f(i/20,j/20);lo=Math.min(lo,v);hi=Math.max(hi,v)}
    return[lo,hi]};
  const evalIn=(expr,px,py)=>vm.runInNewContext('var px='+px+',py='+py+';('+expr+')');
  const ridge=span((px,py)=>evalIn(ridgeExpr,px,py));
  const shadow=span((px,py)=>evalIn(shadowExpr,px,py));
  /* R83: evaluate the REAL calculator rather than regex-approximating its inputs.
     The swing now reads m.material, which folds in pose attitude, so reconstructing
     it from a single extracted sub-expression is no longer honest. */
  const midFn=vm.runInNewContext('('+mid+')');
  const stateless={_fabiHeadAngle:0,_fabiBodyAngle:0,_fabiLeftAngle:0,_fabiForeAngle:0};
  const swingOf=(px,py)=>{const m=midFn(stateless,px,py);
    return vm.runInNewContext('var m='+JSON.stringify(m)+';('+swingExpr+')')};
  const sweep=span((px,py)=>Math.min(1,centre+Math.abs(swingOf(px,py))));
  sweep[0]=span((px,py)=>Math.min(1,centre-Math.abs(swingOf(px,py))))[0];
  const sparkR=op('#mygym .fabi-rig .fabi-rig__edge--spark');
  P('R82-TIER-01',/opacity:var\(--fabi-opt-ridge-opacity/.test(sparkR),'PRIMARY follows the scene ridge state directly');
  const keyM=Number((op('#mygym .fabi-rig .fabi-rig__edge--key').match(/opacity:calc\(var\(--fabi-opt-ridge-opacity,\.\d+\) \* (\.\d+)\)/)||[])[1]);
  const quietM=Number((op('#mygym .fabi-rig .fabi-rig__edge--quiet').match(/opacity:calc\(var\(--fabi-shadow-opacity,\.\d+\) \* (\.\d+)\)/)||[])[1]);
  P('R82-TIER-02',Number.isFinite(keyM)&&Number.isFinite(quietM),'SECONDARY and GHOST are scaled from the existing optical state, not from new constants');
  const primary=ridge, secondary=[ridge[0]*keyM*sweep[0],ridge[1]*keyM*sweep[1]], ghost=[shadow[0]*quietM*sweep[0],shadow[1]*quietM*sweep[1]];
  const fmt=r=>r[0].toFixed(2)+'-'+r[1].toFixed(2);
  P('R82-TIER-03',primary[1]<=.80&&primary[1]>=.55,'PRIMARY composite lands at '+fmt(primary)+' against the .55-.80 target');
  P('R82-TIER-04',secondary[0]>=.22&&secondary[1]<=.48,'SECONDARY composite lands at '+fmt(secondary)+' inside the .22-.48 target');
  P('R82-TIER-05',ghost[0]>=.08&&ghost[1]<=.20,'GHOST composite lands at '+fmt(ghost)+' inside the .08-.20 target');
  P('R82-TIER-06',secondary[1]<primary[0]&&ghost[1]<secondary[0],'the three tiers never overlap, so the hierarchy cannot collapse into one strength');
  /* D6: the halo belongs to the brightest tier alone, and the core must win. */
  P('R82-TIER-07',/filter:/.test(sparkR)&&!/filter:/.test(op('#mygym .fabi-rig .fabi-rig__edge--key'))&&!/filter:/.test(op('#mygym .fabi-rig .fabi-rig__edge--quiet')),
    'only PRIMARY carries a halo');
  const blurs=[...sparkR.matchAll(/drop-shadow\(0 0 ([\d.]+)px rgba\(var\([^)]*\),([\d.]+)\)\)/g)].map(m=>[Number(m[1]),Number(m[2])]);
  P('R82-TIER-08',blurs.length===2&&Math.max(...blurs.map(b=>b[0]))<=3.5&&Math.max(...blurs.map(b=>b[1]))<=.45,
    'the halo is a tight core plus a faint trail ('+blurs.map(b=>b[0]+'px@'+b[1]).join(' + ')+')');
  P('R82-TIER-09',Math.max(...blurs.map(b=>b[1]))<primary[0],
    'the strongest halo alpha ('+Math.max(...blurs.map(b=>b[1]))+') stays below the core opacity ('+primary[0]+'), so the razor line reads first');
}

console.log('\nRHYTHM — interrupted, never a contour');
{
  /* The three silhouette loops the character actually has. If a tier covered most
     of one of these, "they added an outline" would be the correct verdict. */
  const LOOPS={
    head:[[180,31],[263,116],[180,205],[97,116],[180,31]],
    torso:[[86,213],[180,199],[274,216],[260,340],[228,450],[180,537],[132,450],[100,340],[86,213]],
    leftArm:[[91,214],[47,283],[51,309],[113,378],[132,391],[147,370],[132,357],[101,220],[91,214]]
  };
  const all=[].concat(...Object.values(EDGES).map(segments));
  for(const [name,pts] of Object.entries(LOOPS)){
    let total=0,covered=0;
    for(let i=0;i+1<pts.length;i++){
      const T=[pts[i],pts[i+1]],L=segLen(T);total+=L;
      let best=0;for(const S of all)best=Math.max(best,overlap(T,S,3)*1);
      /* fraction of THIS silhouette edge that any single specular segment shadows */
      let frac=0;for(const S of all){const n=24;let hit=0;
        for(let k=0;k<=n;k++){const t=k/n,p=[T[0][0]+(T[1][0]-T[0][0])*t,T[0][1]+(T[1][1]-T[0][1])*t];
          if(pointToSeg(p,S[0],S[1])<=3)hit++}
        frac=Math.max(frac,hit/(n+1))}
      covered+=L*frac;
    }
    const pct=covered/total;
    P('R82-RHYTHM-'+name,pct<.55,'specular light covers '+Math.round(pct*100)+'% of the '+name+' silhouette — the loop is broken, so it reads as reflection rather than outline');
  }
  P('R82-RHYTHM-BREAK',subpaths(EDGES.quiet).length>=2&&/M86 213 L100 340 M153 470/.test(EDGES.quiet),
    'the long shadow-side body silhouette is deliberately cut, leaving a dark gap in the middle');
  /* Segment length has to be judged per TIER, because length only matters in
     proportion to brightness: a long faint seam separates two dark planes, a long
     BRIGHT one is an outline. So the brighter the tier, the shorter it must run. */
  const lenOf=t=>segments(EDGES[t]).map(segLen);
  const sparkMax=Math.max(...lenOf('spark')),keyLens=lenOf('key');
  P('R82-RHYTHM-SHORT',sparkMax<=40,
    'every PRIMARY reflection is a short catch — longest '+Math.round(sparkMax)+' viewBox units');
  P('R82-RHYTHM-LONG',keyLens.filter(l=>l>90).length<=1&&Math.max(...keyLens)<=125,
    'exactly '+keyLens.filter(l=>l>90).length+' SECONDARY segment runs long, and it is the head key edge the reference itself carries continuously');
  P('R82-RHYTHM-FAINT',Math.max(...lenOf('quiet'))>Math.max(...lenOf('spark')),
    'the only segments allowed to run the length of a plane belong to the faintest tier');
}

console.log('\nGEOMETRY — every segment sits on an edge that already exists');
{
  /* Collect every edge of every filled polygon in the rig. A specular segment
     that does not lie along one of them is decoration. */
  const fills=[...rig.matchAll(/class="(fabi-rig__(?:plane|head-face|head-bevel|bevel|head-mass|projector-core|emblem-[a-z]+)[^"]*)"[^>]*?d="([^"]+)"/g)];
  const real=[];
  for(const [,,d] of fills){for(const p of subpaths(d)){
    for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if(dist(a,b)>4)real.push([a,b])}}}
  P('R82-GEO-00',real.length>60,'read '+real.length+' real polygon edges out of the rig to test against');
  let worst=null,worstFrac=1;
  for(const [tier,d] of Object.entries(EDGES)){
    for(const S of segments(d)){
      let best=0;for(const T of real)best=Math.max(best,overlap(S,T,2.5));
      if(best<worstFrac){worstFrac=best;worst=tier+' '+JSON.stringify(S)}
    }
  }
  P('R82-GEO-01',worstFrac>=.9,'every specular segment lies along a real polygon edge; the least-aligned is '+Math.round(worstFrac*100)+'% covered ('+worst+')');
}

console.log('\nFACE — the surface stays clean');
{
  const featurePts=[];
  for(const m of rig.matchAll(/data-fabi-face="[^"]*"\s+d="([^"]+)"/g)){
    const tok=m[1].match(/[A-Za-z]|-?\d*\.?\d+/g)||[];let i=0,cmd='',x=0,y=0,sx=0,sy=0;
    const n=()=>Number(tok[i++]);
    while(i<tok.length){if(/[A-Za-z]/.test(tok[i]))cmd=tok[i++];if(i>=tok.length)break;
      const rel=cmd===cmd.toLowerCase(),C=cmd.toUpperCase();
      if(C==='Z'){x=sx;y=sy;continue}
      if(C==='M'||C==='L'||C==='T'){const a=n(),b=n();x=rel?x+a:a;y=rel?y+b:b;if(C==='M'){sx=x;sy=y;cmd=rel?'l':'L'}featurePts.push([x,y]);continue}
      if(C==='H'){const a=n();x=rel?x+a:a;featurePts.push([x,y]);continue}
      if(C==='V'){const a=n();y=rel?y+a:a;featurePts.push([x,y]);continue}
      if(C==='Q'){const c1=n(),c2=n(),a=n(),b=n();const cx=rel?x+c1:c1,cy=rel?y+c2:c2,nx=rel?x+a:a,ny=rel?y+b:b;
        for(let t=.25;t<1;t+=.25)featurePts.push([(1-t)*(1-t)*x+2*(1-t)*t*cx+t*t*nx,(1-t)*(1-t)*y+2*(1-t)*t*cy+t*t*ny]);
        x=nx;y=ny;featurePts.push([x,y]);continue}
      i++;}
  }
  P('R82-FACE-00',featurePts.length>40,'read '+featurePts.length+' expression points from the shipped rig');
  let worst=Infinity,at=null,tierAt=null;
  for(const [tier,d] of Object.entries(EDGES))for(const S of segments(d))for(const f of featurePts){
    const g=pointToSeg(f,S[0],S[1]);if(g<worst){worst=g;at=f;tierAt=tier}}
  P('R82-FACE-01',worst>11,'the nearest specular segment clears every eye/mouth point by '+worst.toFixed(1)+' viewBox units (closest: '+tierAt+' near '+JSON.stringify(at)+')');
  /* Whatever comes closest to the face must be the FAINTEST tier. */
  P('R82-FACE-02',tierAt==='quiet','only the GHOST tier is allowed near the expression — the nearest segment belongs to '+tierAt);
  /* And nothing crosses the facial surface: the only in-head segment is the crown
     ridge, which is a real facet boundary above the eyes. */
  const inHead=[].concat(...Object.entries(EDGES).map(([t,d])=>segments(d).map(S=>[t,S])))
    .filter(([,S])=>S.every(p=>Math.abs(p[0]-180)+Math.abs(p[1]-118)<=86));
  P('R82-FACE-03',inHead.every(([,S])=>S.every(p=>p[1]<=95)),
    'every specular segment inside the head sits above y=95 — the crown, never the face ('+inHead.length+' segment(s))');
  P('R82-FACE-04',/\.fabi-rig__head-face\{stroke:none!important/.test(css),'head face planes still cannot paint a stroke of their own');
  P('R82-FACE-05',(rig.match(/data-fabi-face="[^"]+"/g)||[]).length>=15,'the expression state set is untouched');
}

console.log('\nMIDPOINT — one value in, a mirrored pair out');
{
  const w=ex('fabiWriteMidpointPerspective');
  P('R82-MID-01',/--fabi-spec-a/.test(w)&&/--fabi-spec-b/.test(w),'the two side weights are written by the existing midpoint writer');
  P('R82-MID-02',(js.match(/--fabi-spec-a/g)||[]).length===1&&(js.match(/--fabi-spec-b/g)||[]).length===1,'each weight has exactly one writer — no second position state');
  /* R83 moved the swing's source from m.global to m.material so the specular
     catches track the facet fills. The contract here was never WHICH member it
     reads -- it is that the clamp is symmetric and the scale matches it. */
  const m=w.match(/var swing=Math\.max\(-\.(\d+),Math\.min\(\.(\d+),m\.(global|material)\*\.(\d+)\)\)/);
  P('R82-MID-03',!!m&&m[1]===m[2]&&m[1]===m[4],'the swing is symmetric and clamped at ±.'+(m&&m[1])+' off m.'+(m&&m[3]));
  P('R82-MID-04',/'--fabi-spec-a',\(\.91\+swing\)/.test(w)&&/'--fabi-spec-b',\(\.91-swing\)/.test(w),
    'the pair is derived from the SAME value with opposite sign, so at the midpoint both resolve to .91 and the bias is exactly neutral');
  P('R82-MID-05',Number('.'+m[1])<=.15,'the maximum departure is '+Number('.'+m[1])+' — small enough that a viewer feels it rather than sees it');
  P('R82-MID-06',/\.fabi-rig\{--fabi-spec-l:var\(--fabi-spec-a/.test(css)
    &&/\[data-projector-side="left"\] \.fabi-rig\{--fabi-spec-l:var\(--fabi-spec-b/.test(css),
    'when the rig mirrors the weights swap in CSS, so the favoured side follows the world key rather than the flipped geometry');
  P('R82-MID-07',/stop-opacity:var\(--fabi-spec-l/.test(rig)&&/stop-opacity:var\(--fabi-spec-r/.test(rig),
    'the sweep is applied as a stroke gradient — a custom-property write, never a per-frame paint');
  P('R82-MID-08',/fabiWriteMidpointPerspective\(stage,Number\(stage\._fabiPerspectiveX\)/.test(ex('fabiStartAnimation')),
    'the existing animation tick already refreshes it; no new scheduler was introduced');
}

console.log('\nDARKNESS — the budget did not move');
{
  const spark=rule('#mygym .fabi-rig .fabi-rig__edge--spark');
  P('R82-DARK-01',!/opacity:1\b/.test(spark),'even the brightest tier is never fully opaque');
  /* The fills are what make him dark. None of them may have been lifted. */
  P('R82-DARK-02',/var\(--fabi-plane-deep\)/.test(rule('#mygym .fabi-rig__head-mass'))
    &&/var\(--fabi-plane-deep\)/.test(rule('#mygym .fabi-rig__plane--torso-mass')),'the head and torso base values are unchanged');
  P('R82-DARK-03',!/--fabi-plane-(?:void|deep|mid|lit):/.test(css),'the material ladder is still owned centrally, not overridden in the character sheet');
  const ladder=js.slice(js.indexOf("setProperty('--fabi-plane-occlude'"),js.indexOf("setProperty('--fabi-spec-silver'"));
  P('R82-DARK-04',/mixHex\(voidHex,a,\.045\)/.test(ladder)&&/mixHex\(voidHex,a,\.085\)/.test(ladder)&&/mixHex\(voidHex,a,\.42\)/.test(ladder),
    'the R77-R80 plane ladder is byte-identical — the specular pass added a colour, it did not brighten a single surface');
}

console.log('\nNON-REGRESSION');
P('R82-REG-01',/M378 164 L390 176 L378 188 L366 176 Z/.test(rig)&&(js.match(/function fabiUpdateProjectionGeometry\(/g)||[]).length===1,'projector geometry and its single owner are intact');
P('R82-REG-02',/contact-pool" cx="180" cy="537"/.test(rig)&&/transform-origin:180px 537px/.test(css),'grounding and hover origin are untouched');
P('R82-REG-03',/--fabi-character-scale:\.986/.test(css)&&/--fabi-stage-height:620px/.test(css)&&/--fabi-diamond:min\(92vw,372px\)/.test(css),'accepted size, stage reserve and response diamond are unchanged');
P('R82-REG-04',/prefers-reduced-motion:reduce[\s\S]*fabi-rig__figure[^\n]*transform:none!important/.test(css),'reduced motion still pins the rig to a complete static pose');
P('R82-REG-05',(rig.match(/fabi-rig__head-face--/g)||[]).length===4&&(rig.match(/fabi-rig__head-bevel--/g)||[]).length===4,'the R81 head construction is unchanged');
P('R82-REG-06',/fabi-diamond-edge--key/.test(css)&&/stroke-width:1\.2px/.test(rule('#mygym .fabi-diamond-edge--key')),'the response diamond laser is untouched, and stays a heavier architectural line than the character bevels');
P('R82-CACHE-01',/mygym\.css\?v='\+V\+'[^"]*&r81=1&r82=1/.test(server)&&/mygym\.js\?v='\+V\+'[^"]*&r81=1&r82=1/.test(server),'both changed assets advance through the existing delivery lineage');
P('R85-R82-CACHE-02',/const V = 449;/.test(server)&&/fob-shell-v449/.test(fs.readFileSync(path.join(root,'sw.js'),'utf8')),'R90 intentionally advances the shell identity while preserving every R82 Mr.Mah material/geometry contract');

console.log('\nR82 suite: '+passed+' assertions passed.');
