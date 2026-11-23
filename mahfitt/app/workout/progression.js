'use strict';
/* MAHFITT progression — one versioned deterministic resolver (policy mahfitt-prog-v2).
   Owner-proposed first-release product defaults (docs/progression/OWNER-INTEGRATION-BRIEF.md §7), NOT validated coaching thresholds.
   The resolver only computes; application (mode, permissions, locks, revisions, idempotency) happens in one SQL transaction
   (supabase/migrations/071_program_progression.sql apply_progression_job). Off / Review First / Automatic share this calculation.

   Version 2 makes phase permission and prescribed identity/order mandatory before numerical progression.
   Recent increase means the immediately preceding applied increase to this current load; one near-max
   prescribed attempt below the lower rep bound can restore the prior load. Two comparable material dips
   permit one configured decrement; continuing trouble after that decrement requests review.
   Three comparable exposures without earned improvement request plateau review. These are explicit
   product defaults, not validated coaching thresholds. Phase-versus-hold conflicts and easy progression
   for set counts other than three remain review gates. See SOURCE-RECONCILIATION.md. */

const POLICY=Object.freeze({
  version:'mahfitt-prog-v2',
  supportedConventions:Object.freeze(['total']),          // total barbell/machine load; per-hand, assisted, bodyweight -> manual
  easyMinSetsAt4Plus:2, easySetCount:3, easyMinRir:2, easyRir:4,
  dipMinSets:2, dipMaxRir:1,
  topRangeExposures:2, unknownEffortExposures:2,
  excessiveEffortExposures:2,plateauExposures:3,baselineRepMultiplier:2,
  gated:Object.freeze({phaseConflict:true,easyOtherSetCounts:true})
});

const fill=(n,v)=>Array.from({length:n},()=>v);
const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>Number(x)===Number(b[i]));
const contextKey=rx=>JSON.stringify([rx.load_unit||'lb',rx.load_convention||'total',rx.load,rx.reps,rx.set_ids,rx.rep_min,rx.rep_max,rx.target_rir,rx.phase_name||'']);
function out(branch,reason,rx,next,extra){
  const changes=!!next&&(Number(next.load)!==Number(rx.load)||!same(next.reps,rx.reps));
  return Object.assign({policy:POLICY.version,contextKey:contextKey(rx),branch,reason,changes,load:Number(rx.load),reps:rx.reps.slice(),
    next:next?{load:Number(next.load),reps:next.reps.slice(),rep_min:rx.rep_min,rep_max:rx.rep_max,target_rir:rx.target_rir}:null},extra||{});
}
function recentTransitionMatches(rx,prev){
 const t=prev&&prev.transition;return !!t&&t.runId===rx.run_id&&t.dayIndex===rx.day_index&&t.exerciseKey===rx.exercise_key&&t.sourceId&&t.sourceSeq===rx.seq-1
  &&t.targetId===rx.id&&t.targetRev===rx.rev&&t.loadUnit===rx.load_unit&&t.loadConvention===rx.load_convention&&Array.isArray(t.targetSetIds)
  &&Array.isArray(rx.set_ids)&&t.targetSetIds.length===rx.set_ids.length&&t.targetSetIds.every((id,i)=>id===rx.set_ids[i])&&same(prev.next&&prev.next.reps,rx.reps);
}
function reduction(rx,load,branch,reason){
 const step=Number(rx.increment),cap=Number(rx.cap_pct==null?5:rx.cap_pct),delta=Number(rx.load)-load;
 if(!(step>0)||!(load>0)||delta>step+1e-6||delta/Number(rx.load)*100>cap+1e-6)
  return hold('review_reduction_limit','The proposed reduction exceeds the available increment or configured cap; review the baseline.',rx);
 return out(branch,reason,rx,{load,reps:fill(rx.reps.length,rx.rep_min)},{reductionUsed:branch==='dip_reduction',reducedFrom:Number(rx.load)});
}
const hold=(branch,reason,rx,extra)=>out(branch,reason,rx,{load:rx.load,reps:rx.reps},extra);

function loadStep(rx,branch){
  const inc=Number(rx.increment),load=Number(rx.load),cap=Number(rx.cap_pct==null?5:rx.cap_pct);
  if(!(inc>0)||!(load>0))return hold('review_increment','No available increment is configured; hold for review.',rx);
  if(inc/load*100>cap+1e-9)return hold('review_cap','The next available increment exceeds the '+cap+'% cap; hold for review.',rx);
  return out(branch,'Rep-range target achieved; next load '+(load+inc)+' '+(rx.load_unit||'lb')+'.',rx,{load:load+inc,reps:fill(rx.reps.length,rx.rep_min)});
}

/* rx: absolute prescription {load,load_unit,load_convention,reps[],rep_min,rep_max,target_rir,increment,cap_pct}
   sets: completed sets of this exercise [{reps,rir|null,weight,role?,pain?,stop?:'time'|'intentional'}]
   prev: the previous decision result for the same run+exercise (stored jsonb) or null
   planned: next planned structure from the frozen template version {load?,reps?} or null
   painReported: explicit same-movement body annotation, including unchecked sets; no completion credit */
function resolve(rx,sets,prev,planned,painReported){
  if(!rx||!Array.isArray(rx.reps)||!rx.reps.length||rx.rep_min==null||rx.rep_max==null||rx.target_rir==null)
    return {policy:POLICY.version,branch:'manual_unsupported',reason:'This prescription has no supported rep range / effort target; adaptive changes stay manual.',changes:false,next:null};
  if(!POLICY.supportedConventions.includes(rx.load_convention||'total')||!(Number(rx.load)>0))
    return hold('manual_unsupported','Adaptive changes stay manual for this load convention until it is explicitly supported.',rx);
  const w=(sets||[]).filter(s=>(s.role||'working')==='working');
  // Pain belongs to this movement; body-only evidence never becomes a completed set.
  if(painReported===true||(sets||[]).some(s=>s.pain))return hold('review_pain','Pain was reported; increases stay blocked for this movement and need review.',rx);
  if(!w.length)return hold('hold_no_work','No completed working sets; no progression credit.',rx);
  if(w.some(s=>s.stop==='time'||s.stop==='intentional'))return hold('hold_nonexertion','Stopped for time or by choice; not treated as a strength change.',rx);
  if(w.some(s=>s.weight==null||s.reps==null))return hold('review_unknown_actuals','Load or reps were not recorded; keep them unknown and review before changing the next target.',rx);
  const ids=w.map(s=>s.prescribed_set_id),expected=rx.set_ids||[];
  if(!expected.length||new Set(ids).size!==ids.length||ids.some(id=>!id||!expected.includes(id)))
    return hold('review_set_identity','Added, removed, skipped or substituted sets need review against the prescribed set identities.',rx);
  if(ids.some((id,i)=>id!==expected[i]))return hold('review_set_order','Set order or roles changed; the original prescribed set comparisons need review.',rx);
  if(['manual','coach'].includes(rx.source))return hold('manual_override','This exposure used an explicit target override; approved future targets are preserved.',rx);
  if(rx.ordinary_allowed!==true)return hold('hold_phase','This phase does not permit ordinary adaptive progression; approved structure is preserved.',rx);
  // A single near-max attempted prescribed set can undo an unconfirmed earned increase after completion.
  const recentIncrease=recentTransitionMatches(rx,prev)&&prev&&prev.next&&Number(prev.next.load)===Number(rx.load)&&Number(prev.load)<Number(rx.load)&&prev.applied===true;
  if(recentIncrease&&w.some(s=>Math.abs(Number(s.weight)-Number(rx.load))<1e-6&&Number(s.reps)<rx.rep_min&&s.rir!=null&&Number(s.rir)<=POLICY.dipMaxRir))
    return reduction(rx,Number(prev.load),'recent_increase_reverted','Recent increase was not yet supported.');
  if(w.length!==rx.reps.length||expected.some(id=>!ids.includes(id))||w.some(s=>Math.abs(Number(s.weight)-Number(rx.load))>=1e-6))
    return hold('review_not_comparable','Completed sets did not match the prescribed load or set count; not a comparable exposure.',rx);
  const t=rx.reps,a=w.map(s=>Number(s.reps)),r=w.map(s=>s.rir==null||s.rir===''?null:Number(s.rir));
  const samePrev=prev&&Number(prev.load)===Number(rx.load)&&prev.contextKey===contextKey(rx);
  if(a.some(x=>x>=rx.rep_max*POLICY.baselineRepMultiplier))return hold('review_baseline','Reported reps are at least twice the range maximum; review the baseline instead of accelerating.',rx);
  const dip=w.filter((s,i)=>a[i]<rx.rep_min&&r[i]!=null&&r[i]<=POLICY.dipMaxRir).length>=POLICY.dipMinSets;
  if(dip){
    if(prev&&prev.reductionUsed&&(Number(prev.load)===Number(rx.load)||prev.applied!==false&&Number(prev.next?.load)===Number(rx.load)))
      return hold('review_after_reduction','Underperformance continued after one reduction; review or re-establish the baseline.',rx,{reductionUsed:true});
    if(samePrev&&prev.branch==='dip_block')return reduction(rx,Number(rx.load)-Number(rx.increment||0),'dip_reduction','Second comparable material dip; one available decrement, with set count and effort unchanged.');
    return hold('dip_block','Material dip below the range: increases are blocked; no strength loss inferred.',rx);
  }
  if(!a.every((x,i)=>x>=t[i]))return hold('hold_shortfall','Targets were not all met; hold and reset the success streak.',rx);
  if(r.some(x=>x!=null&&x<rx.target_rir))return hold('hold_effort','Targets met with less reserve than prescribed; hold.',rx);
  const unknown=r.some(x=>x==null),atTop=t.every(x=>x>=rx.rep_max);
  if(unknown&&!(samePrev&&prev.branch==='unknown_first'&&same(prev.reps,t)))
    return hold('unknown_first','Effort was not recorded; a second comparable success is needed before advancing.',rx);
  if(!unknown){
    if(t.length!==POLICY.easySetCount){
      /* v2 narrow gate: only the accelerated EASY branch is undefined for set counts other than three.
         Ordinary rep progression (owner section 7.A) and the missing-effort two-success rule remain in force
         for other counts. See SOURCE-RECONCILIATION.md:9 and OWNER-2213-BROWSER-TEXT.txt section 7 A/B/Limits. */
      if(r.filter(x=>x>=POLICY.easyRir).length>=POLICY.easyMinSetsAt4Plus&&r.every(x=>x>=POLICY.easyMinRir))
        return hold('review_easy_set_count','Easy progression is defined for three working sets only; other set counts need review.',rx);
    }
    else if(r.filter(x=>x>=POLICY.easyRir).length>=POLICY.easyMinSetsAt4Plus&&r.every(x=>x>=POLICY.easyMinRir)){
      if(atTop)return loadStep(rx,'easy_top');
      /* Reason text names exactly the sets that changed (sets already at the range top stay); the decision itself is unchanged. */
      const easyReps=t.map(x=>Math.min(x+1,rx.rep_max)),moved=easyReps.map((x,i)=>x!==t[i]?i+1:0).filter(Boolean);
      const where=moved.length===t.length?'every set':moved.length===1?'set '+moved[0]+' (others at the range top)':'sets '+moved.slice(0,-1).join(', ')+' and '+moved[moved.length-1]+' (others at the range top)';
      return out('easy','Unexpectedly easy: one rep added to '+where+'.',rx,{load:rx.load,reps:easyReps});
    }
  }
  if(atTop){
    if(unknown||(samePrev&&prev.branch==='top_hold_first'&&same(prev.reps,t)))return loadStep(rx,'top_increase');
    return hold('top_hold_first','Top of the range reached; one more comparable success before a load increase.',rx);
  }
  let k=-1;t.forEach((x,i)=>{if(x<rx.rep_max&&(k<0||x<t[k]))k=i});
  const reps=t.slice();reps[k]+=1;
  return out(unknown?'unknown_second':'ordinary','Rep target achieved; one rep added to the lowest-target set.',rx,{load:rx.load,reps});
}

/* One reconciliation with the planned phase structure (never a second independent increment). */
function reconcile(res,rx,planned){
  if(!planned||!res.next||/^(review|gated|manual)_/.test(res.branch))return res;
  const pl=planned.load==null?Number(rx.load):Number(planned.load),reps=Array.isArray(planned.reps)?planned.reps.slice():fill(rx.reps.length,rx.rep_min);
  if(planned.ordinary_allowed===false||res.branch==='hold_phase')return Object.assign({},res,{branch:'hold_phase_structure',reason:'Approved phase structure is preserved; no ordinary adaptive adjustment was earned in the restricted phase.',
    changes:false,next:Object.assign({},res.next,{load:pl,reps})});
  if(pl===Number(rx.load)){
    if(!Array.isArray(planned.reps)||same(planned.reps,rx.reps))return res;
    return Object.assign({},res,{branch:res.branch+'+phase_structure',reason:'Planned rep/set phase structure; not a strength change.',
      changes:!same(reps,rx.reps),next:Object.assign({},res.next,{load:pl,reps})});
  }
  if(pl<Number(rx.load))return Object.assign({},res,{branch:res.branch+'+phase_lighter',reason:'Planned lighter week (structure, not a strength change).',changes:true,next:Object.assign({},res.next,{load:pl,reps})});
  if(/^(hold|review|gated|dip|unknown_first|top_hold_first)/.test(res.branch)&&!/^(top_hold_first|unknown_first)$/.test(res.branch))
    return Object.assign({},res,{branch:'gated_phase_conflict',reason:'The planned phase increase conflicts with a hold; needs review under this policy.',proposal:{load:pl,reps}});
  return Object.assign({},res,{branch:res.branch+'+phase',reason:'Planned phase load '+pl+'; earned progress is not added on top.',changes:true,next:Object.assign({},res.next,{load:pl,reps})});
}

function decide(rx,sets,prev,planned,painReported){
 let res=resolve(rx,sets,prev,planned,painReported);if(!res.next)return res;
 const w=(sets||[]).filter(s=>(s.role||'working')==='working'),comparable=rx.ordinary_allowed===true&&painReported!==true&&!(sets||[]).some(s=>s.pain)&&w.length===rx.reps.length&&w.every((s,i)=>s.prescribed_set_id===rx.set_ids?.[i]&&Math.abs(Number(s.weight)-Number(rx.load))<1e-6&&!s.pain&&!s.stop);
 const previousSame=prev&&prev.contextKey===contextKey(rx),earned=/^(ordinary|unknown_second|easy|easy_top|top_increase)$/.test(res.branch);
 res.noProgressCount=comparable&&!earned?(previousSame?Number(prev.noProgressCount)||0:0)+1:0;
 const excess=comparable&&w.every((s,i)=>s.reps>=rx.reps[i])&&w.some(s=>s.rir!=null&&s.rir<rx.target_rir);
 res.excessiveEffortCount=excess?(previousSame?Number(prev.excessiveEffortCount)||0:0)+1:0;
 const success=comparable&&w.every((s,i)=>s.reps>=rx.reps[i]&&(s.rir==null||s.rir>=rx.target_rir));
 res.freshSuccesses=success?(prev&&Number(prev.load)===Number(rx.load)?Number(prev.freshSuccesses)||0:0)+1:0;
 if(res.reductionUsed===undefined)res.reductionUsed=!!(prev&&prev.reductionUsed&&(Number(prev.load)===Number(rx.load)||prev.applied!==false&&Number(prev.next?.load)===Number(rx.load)));
 if(res.freshSuccesses>=2)res.reductionUsed=false;
 if(res.excessiveEffortCount>=POLICY.excessiveEffortExposures)res=Object.assign(res,hold('review_excessive_effort','Two comparable exposures exceeded the effort target; review the baseline.',rx));
 else if(res.noProgressCount>=POLICY.plateauExposures&&!res.changes&&!/^review/.test(res.branch))res=Object.assign(res,hold('review_plateau','Three comparable exposures without earned improvement; plateau review, no added sets.',rx));
 return reconcile(res,rx,planned);
}

/* Durable worker: completion is already committed; failures are recorded and retried, never lose the log. */
async function processJob(adapter,sessionId){
  try{
    const ctx=await adapter.load(sessionId);
    if(!ctx||ctx.job.status==='done')return {ok:true,reused:true};
    if(!ctx.run||ctx.run.policy_version!==POLICY.version)throw new Error('POLICY_VERSION_CONFLICT');
    if(!ctx.targets)throw new Error('TARGET_EXPECTATION_REQUIRED');
    const decisions=ctx.prescriptions.map(rx=>{
      const sets=ctx.sets.filter(s=>String(s.exercise_key)===String(rx.exercise_key));
      const painReported=Array.isArray(ctx.painKeys)&&ctx.painKeys.includes(String(rx.exercise_key));
      const d=decide(rx,sets,ctx.prev[rx.exercise_key]||null,(ctx.planned||{})[rx.exercise_key]||null,painReported);
      const target=ctx.targets[rx.exercise_key]||null;
      return Object.assign({exercise_key:rx.exercise_key,source_prescription_id:rx.id,source_rev:rx.rev,
        run_rev:ctx.run.rev,target_id:target?target.id:null,target_rev:target?target.rev:null,
        before_target:target?{load:Number(target.load),reps:target.reps,source:target.source,decision_id:target.decision_id,set_ids:target.set_ids,ordinary_allowed:target.ordinary_allowed}:null},d);
    });
    const rows=await adapter.apply(sessionId,POLICY.version,decisions);
    return {ok:true,rows};
  }catch(e){
    try{await adapter.fail(sessionId,String(e&&e.message||e))}catch(_){/* the job row stays pending/failed and is retried */}
    return {ok:false,error:String(e&&e.message||e)};
  }
}

module.exports={POLICY,resolve,reconcile,decide,processJob};
