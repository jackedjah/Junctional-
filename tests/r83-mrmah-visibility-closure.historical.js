'use strict';
/* R83 · MR.MAH MICRO-VISIBILITY CLOSURE
 *   secondary-rim separation + crystal facet micro-polish
 *   + horizontal-midpoint lighting equilibrium
 *   + Protocol response-text Secondary parity
 *
 * The nine contracts this pass owes, in the order they were specified:
 *   1 HD facet / micro-specular optical closure
 *   2 horizontal-midpoint-OWNED left/right lighting equilibrium
 *   3 vertical position must NOT determine left/right light bias
 *   4 facet fills and specular catches respond as ONE material system
 *   5 centre / left / right lighting mirrors correctly
 *   6 Protocol response text receives Secondary luminous parity
 *   7 Protocol response diamond geometry unchanged
 *   8 no duplicate RAF, pointer listener, character state or renderer
 *   9 all accepted R82 behaviour preserved
 *
 * 2, 3 and 5 are proved by RUNNING the shipped calculator over its whole input
 * domain rather than by reading its source.
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
const num=s=>Number(s);
function subpaths(d){return String(d).split(/(?=M)/).filter(s=>/\d/.test(s)).map(s=>
  [...s.matchAll(/(-?[\d.]+)\s+(-?[\d.]+)/g)].map(m=>[num(m[1]),num(m[2])]))}
function segments(d){const out=[];for(const p of subpaths(d))for(let i=0;i+1<p.length;i++)out.push([p[i],p[i+1]]);return out}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function pointToSeg(p,a,b){const vx=b[0]-a[0],vy=b[1]-a[1],L=vx*vx+vy*vy;
  const t=L?Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/L)):0;
  return Math.hypot(p[0]-(a[0]+vx*t),p[1]-(a[1]+vy*t))}
function overlap(S,T,tol){const n=40;let hit=0;
  for(let i=0;i<=n;i++){const t=i/n,p=[S[0][0]+(S[1][0]-S[0][0])*t,S[0][1]+(S[1][1]-S[0][1])*t];
    if(pointToSeg(p,T[0],T[1])<=tol)hit++}
  return hit/(n+1)}
function pathD(cls){const m=rig.match(new RegExp('class="[^"]*'+cls+'[^"]*"[^>]*?d="([^"]+)"'));return m?m[1]:''}
const LAYERS={spark:pathD('fabi-rig__edge--spark'),key:pathD('fabi-rig__edge--key'),
              quiet:pathD('fabi-rig__edge--quiet'),rim:pathD('fabi-rig__rim')};

console.log('R83 · MR.MAH MICRO-VISIBILITY CLOSURE');

/* ══ 2 / 3 / 5 — the left/right axis, proved over its whole input domain ══ */
console.log('\nMIDPOINT EQUILIBRIUM — horizontal-owned, vertical-blind, exactly mirrored');
{
  const mid=vm.runInNewContext('('+ex('fabiMidpointPerspective')+')');
  const rest={_fabiHeadAngle:0,_fabiBodyAngle:0,_fabiLeftAngle:0,_fabiForeAngle:0};
  const w=ex('fabiWriteMidpointPerspective');
  const swingExpr=(w.match(/var swing=([^;]+);/)||[])[1];
  const swingOf=m=>vm.runInNewContext('var m='+JSON.stringify(m)+';('+swingExpr+')');

  /* REQUIREMENT 3. Vertical position may drive symmetric illumination, but it may
     not vote on which SIDE catches light. Swept across the full py domain at many
     px, the left/right axis must not move by even a float epsilon. */
  let worstDrift=0,driftAt=null;
  for(let i=-10;i<=10;i++){
    const px=i/10, base=mid(rest,px,0);
    for(let j=-10;j<=10;j++){
      const m=mid(rest,px,j/10);
      const d=Math.max(Math.abs(m.global-base.global),Math.abs(m.material-base.material));
      if(d>worstDrift){worstDrift=d;driftAt='px='+px+' py='+(j/10)}
    }
  }
  P('R83-MID-01',worstDrift===0,
    'vertical position moves the left/right axis by exactly '+worstDrift+' across the full domain (worst '+driftAt+')');
  P('R83-MID-02',!/py/.test((ex('fabiMidpointPerspective').match(/var global=([^,]+),/)||[])[1]||'py'),
    'the axis expression contains no vertical term at all');

  /* REQUIREMENT 2. The resting assemblyY is 0, which arrives here as py = -1.
     Equilibrium therefore has to hold at py = -1, not just at py = 0 — that is
     precisely what R80-R82 got wrong. */
  for(const py of [-1,-0.5,0,0.5,1]){
    const m=mid(rest,0,py),sw=swingOf(m);
    P('R83-MID-03:py'+py,Math.abs(m.global)<1e-12&&Math.abs(m.material)<1e-12&&Math.abs(sw)<1e-12,
      'at the horizontal midpoint with py='+py+' the bias is exactly neutral (swing '+sw+')');
  }
  P('R83-MID-04',Math.abs(swingOf(mid(rest,0,-1)))<1e-12,
    'the RESTING pose (assemblyY 0 -> py -1) is neutral, which is the state a member actually sees first');

  /* REQUIREMENT 5. Mirroring must be exact, and must survive different vertical
     positions on the two sides. */
  let worstMirror=0;
  for(let i=1;i<=10;i++){
    const k=i/10;
    for(const [pyL,pyR] of [[0,0],[-1,1],[0.6,-0.9]]){
      const L=mid(rest,-k,pyL),R=mid(rest,k,pyR);
      worstMirror=Math.max(worstMirror,Math.abs(L.global+R.global),Math.abs(L.material+R.material),
        Math.abs(swingOf(L)+swingOf(R)));
    }
  }
  P('R83-MID-05',worstMirror<1e-12,
    'left and right mirror to within '+worstMirror+' at every horizontal offset, including when the two sides sit at different heights');
  const a=(w.match(/'--fabi-spec-a',\((\.\d+)\+swing\)/)||[])[1];
  const b=(w.match(/'--fabi-spec-b',\((\.\d+)-swing\)/)||[])[1];
  P('R83-MID-06',!!a&&a===b,'both specular side weights share one centre ('+a+') and one signed departure');
  const rl=(w.match(/'--fabi-rim-l',\((\.\d+)\+swing\*([\d.]+)\)/)||[]);
  const rr=(w.match(/'--fabi-rim-r',\((\.\d+)-swing\*([\d.]+)\)/)||[]);
  P('R83-MID-07',rl[1]&&rl[1]===rr[1]&&rl[2]===rr[2],
    'the rim rides the same signed value with the same centre ('+rl[1]+') and gain ('+rl[2]+'), so it cannot disagree with the facets');
  P('R83-MID-08',/prefers-reduced-motion/.test(css)&&/reduced&&!direct/.test(ex('fabiApplySceneLighting')),
    'reduced motion still pins the lighting inputs to neutral');
}

/* ══ 4 — fills and catches are one material system ══ */
console.log('\nONE MATERIAL SYSTEM — fills and catches share a single signed source');
{
  const mid=vm.runInNewContext('('+ex('fabiMidpointPerspective')+')');
  const src=ex('fabiMidpointPerspective');
  P('R83-MAT-01',/material:material/.test(src),'the calculator publishes one canonical material value');
  P('R83-MAT-02',/m\.material\*/.test(ex('fabiWriteMidpointPerspective')),
    'the specular sweep reads that value rather than a parallel one');
  P('R83-MAT-03',/--fabi-mid-head-bias/.test(rig)&&/--fabi-mid-torso-bias/.test(rig),
    'the facet FILLS still read the head/torso members of the same calculator');
  /* With no pose attitude the shared value must collapse onto the body axis, so
     every R82 relationship is preserved bit-for-bit. */
  const rest={_fabiHeadAngle:0,_fabiBodyAngle:0,_fabiLeftAngle:0,_fabiForeAngle:0};
  let worst=0;for(let i=-10;i<=10;i++){const m=mid(rest,i/10,0);worst=Math.max(worst,Math.abs(m.material-m.global))}
  P('R83-MAT-04',worst<1e-12,'with no pose attitude material === global to within '+worst+', so R82 behaviour is unchanged');
  /* Under attitude it must track the fills, never run off on its own. */
  let outside=0;
  for(const st of [{_fabiHeadAngle:1.4,_fabiBodyAngle:-.9,_fabiLeftAngle:.5,_fabiForeAngle:-.4},
                   {_fabiHeadAngle:-1.1,_fabiBodyAngle:1.2,_fabiLeftAngle:-.6,_fabiForeAngle:.7}])
    for(let i=-10;i<=10;i++){const m=mid(st,i/10,0);
      const lo=Math.min(m.global,m.head,m.torso),hi=Math.max(m.global,m.head,m.torso);
      if(m.material<lo-1e-9||m.material>hi+1e-9)outside++}
  P('R83-MAT-05',outside===0,'under every posed attitude the catch value stays bracketed by the fill values it must track');
}

/* ══ 1 — the rim, and the anti-outline guarantee extended to cover it ══ */
console.log('\nSECONDARY RIM — separation without a contour');
{
  P('R83-RIM-01',!!LAYERS.rim,'the rim layer exists as its own owner');
  P('R83-RIM-02',(rig.match(/class="fabi-rig__edge /g)||[]).length===3,
    'it did NOT inflate the three canonical specular tiers');
  const r=rule('#mygym .fabi-rig .fabi-rig__rim');
  P('R83-RIM-03',/var\(--secondary,var\(--bright\)\)/.test(rig.slice(rig.indexOf('rimSweep'),rig.indexOf('rimSweep')+900)),
    'the rim is painted from the Secondary family, unlike the neutral specular tiers');
  P('R83-RIM-04',/vector-effect:non-scaling-stroke/.test(r),'the rim is non-scaling, so iPad cannot thicken it into an outline');
  const rw=Number((r.match(/stroke-width:([\d.]+)px/)||[])[1]);
  P('R83-RIM-05',rw>0&&rw<=.9,'the rim is '+rw+'px — a crystal edge, not a stroke');
  P('R83-RIM-06',/stop-opacity:var\(--fabi-rim-l/.test(rig)&&/stop-opacity:var\(--fabi-rim-r/.test(rig),
    'the rim is driven declaratively by custom properties — no per-frame work');
  /* Every rim segment must sit on a real polygon edge. */
  const fills=[...rig.matchAll(/class="(fabi-rig__(?:plane|head-face|head-bevel|bevel|head-mass)[^"]*)"[^>]*?d="([^"]+)"/g)];
  const real=[];for(const [,,d] of fills)for(const p of subpaths(d))
    for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if(dist(a,b)>4)real.push([a,b])}
  let worstFrac=1,worstSeg=null;
  for(const S of segments(LAYERS.rim)){let best=0;for(const T of real)best=Math.max(best,overlap(S,T,2.5));
    if(best<worstFrac){worstFrac=best;worstSeg=JSON.stringify(S)}}
  P('R83-RIM-07',worstFrac>=.9,'every rim segment lies on a real silhouette edge; least-aligned is '+Math.round(worstFrac*100)+'% ('+worstSeg+')');
  /* THE ANTI-OUTLINE GUARANTEE, now measured across ALL FOUR light layers. */
  const LOOPS={
    head:[[180,31],[263,116],[180,205],[97,116],[180,31]],
    torso:[[86,213],[180,199],[274,216],[260,340],[228,450],[180,537],[132,450],[100,340],[86,213]],
    leftArm:[[91,214],[47,283],[51,309],[113,378],[132,391],[147,370],[132,357],[101,220],[91,214]]
  };
  const all=[].concat(...Object.values(LAYERS).map(segments));
  for(const [name,pts] of Object.entries(LOOPS)){
    let total=0,covered=0;
    for(let i=0;i+1<pts.length;i++){
      const T=[pts[i],pts[i+1]],L=dist(T[0],T[1]);total+=L;
      let frac=0;for(const S of all){const n=24;let hit=0;
        for(let k=0;k<=n;k++){const t=k/n,p=[T[0][0]+(T[1][0]-T[0][0])*t,T[0][1]+(T[1][1]-T[0][1])*t];
          if(pointToSeg(p,S[0],S[1])<=3)hit++}
        frac=Math.max(frac,hit/(n+1))}
      covered+=L*frac;
    }
    P('R83-RIM-RHYTHM-'+name,covered/total<.6,
      'all four light layers together cover '+Math.round(covered/total*100)+'% of the '+name+' silhouette — still broken, still not a contour');
  }
}

/* ══ 1 / master §7 — face readability came from the expression, not the head ══ */
console.log('\nFACE — lifted without brightening the head');
{
  const face=rule('#mygym .fabi-rig__face-plane .fabi-eye path,#mygym .fabi-rig__face-plane .fabi-mouth path');
  const mix=face.match(/color-mix\(in srgb,var\(--cream\) (\d+)%,var\(--bright\) (\d+)%\)/);
  P('R83-FACE-01',!!mix&&Number(mix[1])>=75,'the expression stroke sits at '+(mix&&mix[1])+'% cream — luminance, not accent tint');
  const op=Number((face.match(/opacity:([\d.]+)/)||[])[1]);
  P('R83-FACE-02',op>.94&&op<1,'expression opacity is '+op+' — lifted, not opaque');
  P('R83-FACE-03',/stroke-width:3\.7/.test(face),'stroke width is untouched, so no facial line got thicker');
  P('R83-FACE-04',/var\(--fabi-plane-deep\)/.test(rule('#mygym .fabi-rig__head-mass'))
    &&/var\(--fabi-plane-deep\)/.test(rule('#mygym .fabi-rig__head-face--front')),
    'the head mass and the plane the face sits on were NOT brightened');
  P('R83-FACE-05',(rig.match(/data-fabi-face="[^"]+"/g)||[]).length>=15,'every expression state is intact');
  /* No light layer may have crept toward the expression. */
  const featurePts=[];
  for(const m of rig.matchAll(/data-fabi-face="[^"]*"\s+d="([^"]+)"/g))
    for(const mm of m[1].matchAll(/(-?[\d.]+)\s+(-?[\d.]+)/g))featurePts.push([Number(mm[1]),Number(mm[2])]);
  let near=Infinity;
  for(const d of Object.values(LAYERS))for(const S of segments(d))for(const f of featurePts)
    near=Math.min(near,pointToSeg(f,S[0],S[1]));
  P('R83-FACE-06',near>11,'the nearest light segment of ANY layer still clears the expression by '+near.toFixed(1)+' viewBox units');
}

/* ══ master §8 — emblem cohesion without a torso wash ══ */
console.log('\nEMBLEM COHESION — adjacent plane, not a glow');
{
  P('R83-EMB-01',/fabi-rig__emblem-bounce/.test(rig)
    &&rig.indexOf('emblem-bounce')<rig.indexOf('emblem-mark'),'the reflection is painted UNDER the emblem, so the emblem stays the accent');
  const g=(rig.match(/<radialGradient id="[^"]+emblemBounce"[^>]*>([\s\S]*?)<\/radialGradient>/)||[])[1]||'';
  const alphas=[...g.matchAll(/stop-opacity:([\d.]+)/g)].map(m=>Number(m[1]));
  P('R83-EMB-02',alphas.length>=3&&Math.max(...alphas)<=.09&&Math.min(...alphas)===0,
    'the reflection peaks at '+Math.max(...alphas)+' alpha and falls to zero — a pickup, not a glow');
  P('R83-EMB-03',/var\(--secondary,var\(--bright\)\)/.test(g),'it is the Secondary the emblem itself emits');
  const rr=Number((rig.match(/<radialGradient id="[^"]+emblemBounce"[^>]*\br="(\d+)"/)||[])[1]);
  P('R83-EMB-04',rr>0&&rr<=60,'its radius is '+rr+' viewBox units — local to the chest, not a torso wash');
  P('R83-EMB-05',!/mix-blend-mode/.test(rule('#mygym .fabi-rig .fabi-rig__emblem-bounce')),
    'no blend mode amplifies it into a uniform chest lift');
  P('R83-EMB-06',/fabi-rig__transport-fill/.test(rig)&&/fabi-rig__transport-diamond/.test(rig)
    &&/fabi-rig__emblem-mark/.test(rig),'the emblem identity itself is unchanged');
}

/* ══ 6 / 7 — Protocol text parity, Protocol geometry frozen ══ */
console.log('\nPROTOCOL — Secondary luminous parity, geometry untouched');
{
  /* This selector appears several times across breakpoints; the one that owns
     COLOUR is the contract here, so collect them all rather than taking the first. */
  const sel='#mygym .protocol-dialogue-flow .protocol-fabi-copy .fabi-response-copy>p';
  const all=[];{let i=0;for(;;){i=css.indexOf(sel+'{',i);if(i<0)break;all.push(css.slice(i+sel.length+1,css.indexOf('}',i)));i++}}
  const r=all.find(x=>/color:/.test(x))||'';
  P('R83-PROTO-01',all.length>0&&!!r,'located the Protocol paragraph colour owner among '+all.length+' breakpoint rules');
  P('R83-PROTO-01b',all.every(x=>!/color:var\(--cream\)/.test(x)),
    'no breakpoint rule still pins Protocol answer text to flat cream');
  P('R83-PROTO-02',/color:var\(--bright\)/.test(r)&&!/color:var\(--cream\)/.test(r),
    'Protocol answer text now renders in the member Secondary, as AI Chat already did');
  P('R83-PROTO-03',/text-shadow:0 0 7px rgba\(var\(--bright-rgb/.test(r),
    'it carries the same luminous treatment as the AI Chat response copy');
  const ai=rule('#mygym .fabi-response-copy p');
  P('R83-PROTO-04',/color:var\(--bright\)/.test(ai),'the AI owner it is now at parity with is unchanged');
  /* REQUIREMENT 7 — every geometry value in that rule is byte-identical. */
  P('R83-PROTO-05',/max-width:calc\(var\(--fabi-diamond,340px\) \* \.67\)/.test(r)&&/margin:0 auto/.test(r)
    &&/font-size:13\.25px/.test(r)&&/line-height:1\.32/.test(r)&&/text-wrap:pretty/.test(r),
    'max-width, margin, font-size, line-height and text-wrap are all unchanged');
  P('R83-PROTO-06',/--fabi-diamond:min\(86vw,350px\)/.test(css)&&/--fabi-diamond:min\(89vw,386px\)/.test(css)
    &&/#mygym \.protocol-fabi-stage\{--fabi-character-scale:\.998/.test(css),
    'the Protocol response diamond sizing and character scale are untouched');
  P('R83-PROTO-07',(css.match(/\.protocol-fabi-stage \.fabi-character\{bottom:\d+px\}/g)||[]).length>=3,
    'Protocol keeps its own independent character anchors');
}

/* ══ 8 — no duplicate runtime ══ */
console.log('\nRUNTIME — nothing was duplicated');
{
  P('R83-RUN-01',(js.match(/function fabiRigHTML\(/g)||[]).length===1
    &&(js.match(/function fabiMidpointPerspective\(/g)||[]).length===1
    &&(js.match(/function fabiWriteMidpointPerspective\(/g)||[]).length===1
    &&(js.match(/function fabiApplySceneLighting\(/g)||[]).length===1,'one rig, one calculator, one writer, one scene-light owner');
  P('R83-RUN-02',(ex('fabiStartAnimation').match(/function tick\(/g)||[]).length===1
    &&!/setInterval\(/.test(ex('fabiStartAnimation')),'no second animation clock');
  const binder=ex('bindFabiCharacterDrag');
  P('R83-RUN-03',['pointerdown','pointermove','pointerup','pointercancel']
    .every(n=>(binder.match(new RegExp("addEventListener\\('"+n+"'",'g'))||[]).length<=1)
    &&(js.match(/var FABI_CHARACTER_GESTURE/g)||[]).length===1,'no duplicate pointer owner or gesture state');
  P('R83-RUN-04',!/getBoundingClientRect|getComputedStyle/.test(ex('fabiWriteMidpointPerspective')),
    'the lighting writer still performs no layout read');
  P('R83-RUN-05',!/<canvas|WebGL|getContext\(|three\.|THREE\./i.test(rig),'no canvas/WebGL/library was introduced');
  P('R83-RUN-06',(js.match(/setProperty\('--fabi-spec-a'/g)||[]).length===1
    &&(js.match(/setProperty\('--fabi-rim-l'/g)||[]).length===1,'each lighting property has exactly one writer');
}

/* ══ 9 — accepted R82 behaviour preserved ══ */
console.log('\nR82 PRESERVATION');
{
  P('R83-R82-01',(js.match(/setProperty\('--fabi-spec-silver'/g)||[]).length===1
    &&/mixHex\('#E6EBE9',a,\.22\)/.test(js),'the R82 canonical specular material is unchanged');
  const w={};for(const n of ['spark','key','quiet'])
    w[n]=Number((rule('#mygym .fabi-rig .fabi-rig__edge--'+n).match(/stroke-width:([\d.]+)px/)||[])[1]);
  P('R83-R82-02',w.quiet===.55&&w.spark===.72&&w.key===.85,'the R82 three-tier widths are unchanged ('+JSON.stringify(w)+')');
  P('R83-R82-03',/--fabi-character-scale:\.986/.test(css)&&/--fabi-stage-height:620px/.test(css)
    &&/--fabi-diamond:min\(92vw,372px\)/.test(css),'accepted AI size, stage reserve and response diamond are unchanged');
  P('R83-R82-04',(rig.match(/fabi-rig__head-face--/g)||[]).length===4
    &&(rig.match(/fabi-rig__head-bevel--/g)||[]).length===4,'the R81 head construction is unchanged');
  P('R83-R82-05',/contact-pool" cx="180" cy="537"/.test(rig)&&/transform-origin:180px 537px/.test(css),
    'grounding and hover origin are unchanged');
  P('R83-R82-06',!/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i.test(rig),'the rig still contains no literal colour — the rim is theme-derived');
  P('R83-R82-07',/stroke-width:1\.2px/.test(rule('#mygym .fabi-diamond-edge--key')),'the response diamond laser is untouched');
}

console.log('\nDELIVERY');
P('R83-CACHE-01',/mygym\.css\?v='\+V\+'[^"]*&r82=1&r83=1/.test(server)&&/mygym\.js\?v='\+V\+'[^"]*&r82=1&r83=1/.test(server),
  'both changed assets advance through the existing delivery lineage');
P('R83-CACHE-02',/const V = 446;/.test(server)&&/fob-shell-v446/.test(fs.readFileSync(path.join(root,'sw.js'),'utf8')),
  'the protected V446 shell identity is unchanged');

console.log('\nR83 suite: '+passed+' assertions passed.');
