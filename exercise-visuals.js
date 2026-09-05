/* FOB SYSTEMS / MAHFITT — RepDB free-tier exercise visual resolver.
 * v403 data foundation only. No Live Workout UI is mounted here.
 *
 * RepDB Free Tier License: commercial in-app use is permitted with visible
 * attribution. Do not expose this resolver as a dataset/API and do not use
 * paid preview animations. Source snapshot: 250 exercises, 2026-08.
 */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MahfittExerciseVisuals=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var VERSION='repdb-free-2026-08-250';
  var SOURCE='RepDB';
  var SOURCE_BASE='https://exercise-dataset.com';
  var ATTRIBUTION_TEXT='Exercise data by RepDB';
  var ATTRIBUTION_URL='https://repdb.co';

  /* Canonical production IDs from RepDB's 2026-08 free-tier sitemap.
     Keeping only IDs here avoids republishing the third-party dataset itself;
     MAHFITT continues to own its exercise names, coaching metadata and logic. */
  var IDS=[
    'ab-wheel-rollout','air-bike','archer-pull-ups','archer-push-ups','arnold-press','assisted-dips','assisted-pull-ups','back-extension','band-assisted-pull-ups','banded-adductor-stretch','banded-ankle-stretch','banded-calf-stretch','banded-chest-stretch','banded-figure-4-stretch','banded-hamstring-stretch','banded-it-band-stretch','banded-lat-stretch','banded-rear-delt-stretch','banded-shoulder-stretch','banded-triceps-stretch','barbell-calf-raise','barbell-curl','barbell-front-raise','barbell-glute-bridge','barbell-lunge','barbell-pullover','barbell-reverse-lunge','barbell-row','battle-ropes','behind-the-back-barbell-shrug','behind-the-neck-press','bench-adductor-stretch','bench-ankle-stretch','bench-bulgarian-split-stretch','bench-calf-stretch','bench-chest-stretch','bench-childs-pose','bench-couch-stretch','bench-dips','bench-figure-4-glute-stretch','bench-hamstring-stretch','bench-lat-stretch','bench-press','bench-pull','bent-arm-barbell-pullover','bent-over-ez-bar-row','bicep-curl','bicycle-crunch','bird-dog-hold','bodyweight-calf-raise','bodyweight-good-morning','bodyweight-lateral-raise','bodyweight-overhead-press','bodyweight-squat','box-jump','box-squat','bulgarian-split-squat','burpees','cable-bent-over-row','cable-chest-press','cable-crunch','cable-curl','cable-external-rotation','cable-fly','cable-front-raise','cable-hammer-curl','cable-kickback','cable-lateral-raise','cable-tricep-kickback','cable-upright-row','cable-wrist-curl','captains-chair-knee-raise','captains-chair-leg-raise','cheat-curl','chest-press-machine','chest-supported-db-row','chest-supported-dumbbell-shrug','chin-tuck-hold','chin-ups','clamshells','clap-push-ups','clean','clean-and-jerk','close-grip-bench-press','close-grip-db-bench-press','close-grip-ez-bar-bench-press','close-grip-incline-bench','close-grip-lat-pulldown','close-grip-pull-ups','close-grip-push-ups','concentration-curl','cross-body-hammer-curl','crunches','db-bench-press','db-fly','db-lunge','db-pullover','db-reverse-curl','db-shrug','db-skull-crusher','dead-bug','dead-hang','deadlift','decline-bench-press','decline-bench-press-barbell','decline-bench-press-ez-bar','decline-crunch','decline-db-fly','decline-push-up','deficit-deadlift','deficit-push-ups','diamond-push-ups','dips','donkey-calf-raise','double-kettlebell-dead-clean','double-kettlebell-dead-split-snatch','double-kettlebell-overhead-press','double-kettlebell-row','double-kettlebell-split-jerk','double-kettlebell-swing-snatch','dragon-flag','dumbbell-bench-pull','dumbbell-calf-raise','dumbbell-deadlift','dumbbell-face-pull','dumbbell-floor-press','dumbbell-front-raise','dumbbell-front-squat','dumbbell-push-press','dumbbell-reverse-fly','dumbbell-romanian-deadlift','dumbbell-shoulder-press','dumbbell-side-bend','dumbbell-snatch','dumbbell-split-squat','dumbbell-tricep-extension','dumbbell-upright-row','dumbbell-wrist-curl','ez-bar-curl','ez-bar-reverse-curl','ez-bar-shrug','ez-bar-spider-curl','ez-bar-upright-row','face-pull','floor-ez-bar-press','floor-press','flutter-kicks','front-lever','front-squat','glute-bridge','glute-kickback','goblet-squat','good-morning','hack-squat','hack-squat-calf-raise','hammer-curl','handstand-push-ups','hang-clean','hang-power-clean','hanging-knee-raise','hanging-leg-raise','heel-elevated-squat','hex-bar-deadlift','high-plank','hip-abduction','hip-adduction','hip-thrust','horizontal-leg-press','incline-bench-ez-bar-press','incline-bench-press','incline-db-curl','incline-db-press','incline-dumbbell-fly','incline-hammer-curl','incline-push-ups','inverted-row','jump-squat','jumping-jacks','kettlebell-deadlift','kettlebell-farmers-walk','kettlebell-lunge-press','kettlebell-offset-reverse-lunge-and-press','kettlebell-pistol-squat','kettlebell-rotational-lunge','kettlebell-russian-twist','kettlebell-single-leg-deadlift','kettlebell-swing','kettlebell-turkish-get-ups','kettlebell-windmills','knee-push-ups','l-sit','landmine-press','lat-pulldown','lateral-raise','leg-curl','leg-extension','leg-press','lunge','lying-leg-raise','lying-tricep-extension','machine-back-extension','machine-bicep-curl','machine-calf-raise','machine-chest-fly','machine-seated-crunch','machine-shoulder-press','machine-triceps-extension','mountain-climbers','muscle-ups','negative-pull-ups','neutral-grip-pull-ups','nordic-hamstring-curl','ohp','one-arm-kettlebell-bicep-curl','overhead-tricep-extension','pause-deadlift','planche','plank','preacher-curl','pull-up','push-press','push-up','rear-delt-fly','reverse-curl','reverse-lunge','ring-dips','ring-face-pull','romanian-deadlift','russian-twist','seated-calf-raise','seated-db-press','shrug','side-lying-hip-abduction','side-plank','single-arm-db-row','sit-ups','skull-crusher','smith-machine-bulgarian-split','squat','standing-calf-raise','straight-arm-pulldown','sumo-deadlift','superman','tricep-kickback','tricep-pushdown','upright-row','wall-sit','weighted-wall-crunch','wide-grip-bench-press','wide-grip-seated-cable-row'
  ];
  var ID_SET=Object.create(null);
  IDS.forEach(function(id){ID_SET[id]=true;});

  /* Only names that cannot be safely reduced by deterministic normalization
     belong here. This list maps MAHFITT language to RepDB language; it does not
     alter MAHFITT's exercise catalog. */
  var ALIASES={
    'barbell bench press':'bench-press',
    'flat barbell bench press':'bench-press',
    'incline barbell bench press':'incline-bench-press',
    'barbell incline bench press':'incline-bench-press',
    'dumbbell bench press':'db-bench-press',
    'flat dumbbell bench press':'db-bench-press',
    'incline dumbbell bench press':'incline-db-press',
    'incline dumbbell press':'incline-db-press',
    'dumbbell incline bench press':'incline-db-press',
    'barbell back squat':'squat',
    'back squat':'squat',
    'air squat':'bodyweight-squat',
    'bodyweight squat':'bodyweight-squat',
    'overhead press':'ohp',
    'barbell overhead press':'ohp',
    'standing overhead press':'ohp',
    'standing barbell overhead press':'ohp',
    'military press':'ohp',
    'dumbbell overhead press':'dumbbell-shoulder-press',
    'seated dumbbell shoulder press':'seated-db-press',
    'seated dumbbell press':'seated-db-press',
    'barbell bent over row':'barbell-row',
    'bent over barbell row':'barbell-row',
    'barbell bent-over row':'barbell-row',
    'one arm dumbbell row':'single-arm-db-row',
    'one-arm dumbbell row':'single-arm-db-row',
    'single arm dumbbell row':'single-arm-db-row',
    'single-arm dumbbell row':'single-arm-db-row',
    'chest supported dumbbell row':'chest-supported-db-row',
    'chest-supported dumbbell row':'chest-supported-db-row',
    'romanian deadlift barbell':'romanian-deadlift',
    'barbell romanian deadlift':'romanian-deadlift',
    'rdl':'romanian-deadlift',
    'dumbbell rdl':'dumbbell-romanian-deadlift',
    'db romanian deadlift':'dumbbell-romanian-deadlift',
    'trap bar deadlift':'hex-bar-deadlift',
    'trap-bar deadlift':'hex-bar-deadlift',
    'barbell deadlift':'deadlift',
    'conventional deadlift':'deadlift',
    'pull up':'pull-up',
    'pull-up':'pull-up',
    'pull ups':'pull-up',
    'pull-ups':'pull-up',
    'chin up':'chin-ups',
    'chin-up':'chin-ups',
    'chin ups':'chin-ups',
    'push up':'push-up',
    'push-up':'push-up',
    'push ups':'push-up',
    'push-ups':'push-up',
    'close grip push up':'close-grip-push-ups',
    'close-grip push-up':'close-grip-push-ups',
    'diamond push up':'diamond-push-ups',
    'diamond push-up':'diamond-push-ups',
    'rear delt fly':'rear-delt-fly',
    'rear delt reverse fly':'rear-delt-fly',
    'reverse dumbbell fly':'dumbbell-reverse-fly',
    'dumbbell reverse fly':'dumbbell-reverse-fly',
    'lateral raise dumbbell':'lateral-raise',
    'dumbbell lateral raise':'lateral-raise',
    'standing dumbbell lateral raise':'lateral-raise',
    'cable triceps pushdown':'tricep-pushdown',
    'cable tricep pushdown':'tricep-pushdown',
    'cable triceps pressdown':'tricep-pushdown',
    'cable tricep pressdown':'tricep-pushdown',
    'rope triceps pressdown':'tricep-pushdown',
    'rope tricep pressdown':'tricep-pushdown',
    'triceps pushdown':'tricep-pushdown',
    'triceps pressdown':'tricep-pushdown',
    'tricep pressdown':'tricep-pushdown',
    'skull crushers':'skull-crusher',
    'lying triceps extension':'lying-tricep-extension',
    'overhead triceps extension':'overhead-tricep-extension',
    'barbell biceps curl':'barbell-curl',
    'barbell bicep curl':'barbell-curl',
    'dumbbell biceps curl':'bicep-curl',
    'dumbbell bicep curl':'bicep-curl',
    'standing dumbbell curl':'bicep-curl',
    'ez bar curl':'ez-bar-curl',
    'ez-bar curl':'ez-bar-curl',
    'machine biceps curl':'machine-bicep-curl',
    'machine bicep curl':'machine-bicep-curl',
    'leg press machine':'leg-press',
    'seated leg press':'horizontal-leg-press',
    'leg extension machine':'leg-extension',
    'seated leg curl':'leg-curl',
    'lying leg curl':'leg-curl',
    'machine leg curl':'leg-curl',
    'barbell hip thrust':'hip-thrust',
    'hip thrust barbell':'hip-thrust',
    'machine hip abduction':'hip-abduction',
    'machine hip adduction':'hip-adduction',
    'calf raise':'standing-calf-raise',
    'standing calf raises':'standing-calf-raise',
    'seated calf raises':'seated-calf-raise',
    'bulgarian split squat dumbbell':'dumbbell-split-squat',
    'dumbbell bulgarian split squat':'dumbbell-split-squat',
    'smith machine bulgarian split squat':'smith-machine-bulgarian-split',
    'barbell reverse lunge':'barbell-reverse-lunge',
    'dumbbell reverse lunge':'db-lunge',
    'reverse lunges':'reverse-lunge',
    'walking lunge':'lunge',
    'walking lunges':'lunge',
    'lat pulldown machine':'lat-pulldown',
    'wide grip lat pulldown':'lat-pulldown',
    'straight arm lat pulldown':'straight-arm-pulldown',
    'straight-arm lat pulldown':'straight-arm-pulldown',
    'cable face pull':'face-pull',
    'face pulls':'face-pull',
    'barbell shrug':'shrug',
    'dumbbell shrug':'db-shrug',
    'dips parallel bars':'dips',
    'parallel bar dips':'dips',
    'bench dip':'bench-dips',
    'bench dips':'bench-dips',
    'hanging knee raises':'hanging-knee-raise',
    'hanging leg raises':'hanging-leg-raise',
    'ab wheel':'ab-wheel-rollout',
    'ab wheel rollout':'ab-wheel-rollout',
    'dead bug':'dead-bug',
    'bird dog':'bird-dog-hold',
    'side plank hold':'side-plank',
    'plank hold':'plank',
    'front plank':'plank',
    'russian twists':'russian-twist',
    'mountain climber':'mountain-climbers',
    'mountain climbers':'mountain-climbers',
    'jumping jack':'jumping-jacks',
    'jumping jacks':'jumping-jacks',
    'battle rope':'battle-ropes',
    'battle ropes':'battle-ropes',
    'kettlebell farmer carry':'kettlebell-farmers-walk',
    'kettlebell farmers carry':'kettlebell-farmers-walk',
    'farmers walk kettlebell':'kettlebell-farmers-walk',
    'turkish get up':'kettlebell-turkish-get-ups',
    'turkish get-up':'kettlebell-turkish-get-ups',
    'kettlebell turkish get up':'kettlebell-turkish-get-ups',
    'kettlebell windmill':'kettlebell-windmills',
    'kettlebell windmill press':'kettlebell-windmills',
    'kettlebell swing russian':'kettlebell-swing',
    'russian kettlebell swing':'kettlebell-swing',
    'nordic curl':'nordic-hamstring-curl',
    'nordic hamstring curl':'nordic-hamstring-curl',
    'back extensions':'back-extension',
    'hyperextension':'back-extension',
    'machine back extension':'machine-back-extension',
    'decline barbell press':'decline-bench-press-barbell',
    'machine chest press':'chest-press-machine',
    'pec deck':'machine-chest-fly',
    'deficit push up':'deficit-push-ups',
    'deficit push-up':'deficit-push-ups',
    'dip':'dips',
    'assisted pull up':'assisted-pull-ups',
    'assisted pull-up':'assisted-pull-ups',
    'reverse fly':'rear-delt-fly',
    'chest supported row':'chest-supported-db-row',
    'chest-supported row':'chest-supported-db-row',
    'split squat':'dumbbell-split-squat',
    'overhead cable triceps extension':'overhead-tricep-extension',
    'dumbbell overhead extension':'overhead-tricep-extension',
    'single arm cable kickback':'cable-tricep-kickback',
    'single-arm cable kickback':'cable-tricep-kickback',
    'assault bike':'air-bike',
    'airdyne bike':'air-bike'
  };


  var EQUIPMENT_ALIASES={
    'front raise|dumbbell':'dumbbell-front-raise',
    'front raise|barbell':'barbell-front-raise',
    'wrist curl|dumbbell':'dumbbell-wrist-curl',
    'wrist curl|cable':'cable-wrist-curl',
    'farmer carry|kettlebell':'kettlebell-farmers-walk',
    'farmers carry|kettlebell':'kettlebell-farmers-walk',
    'single leg romanian deadlift|kettlebell':'kettlebell-single-leg-deadlift',
    'single-leg romanian deadlift|kettlebell':'kettlebell-single-leg-deadlift'
  };

  function normalizeName(value){
    return String(value||'')
      .toLowerCase()
      .replace(/\([^)]*\)/g,' ')
      .replace(/&/g,' and ')
      .replace(/[’']/g,'')
      .replace(/[^a-z0-9]+/g,' ')
      .trim()
      .replace(/\s+/g,' ');
  }
  function slug(value){return normalizeName(value).replace(/\s+/g,'-');}
  function pushUnique(list,value){if(value&&list.indexOf(value)<0)list.push(value);}

  function inputParts(input){
    if(input&&typeof input==='object')return {name:String(input.name||''),equipment:normalizeName(input.equipment||'')};
    return {name:String(input||''),equipment:''};
  }

  function candidates(input){
    var parts=inputParts(input),n=normalizeName(parts.name),out=[];
    if(!n)return out;
    var eqKey=n+'|'+parts.equipment;
    if(parts.equipment&&EQUIPMENT_ALIASES[eqKey])pushUnique(out,EQUIPMENT_ALIASES[eqKey]);
    if(ALIASES[n])pushUnique(out,ALIASES[n]);
    pushUnique(out,slug(n));

    /* Common MAHFITT → RepDB wording reductions. Each result still must exist
       in ID_SET before it can resolve, so an aggressive candidate never turns
       into an invented visual. */
    var variants=[
      n.replace(/\bdumbbell\b/g,'db'),
      n.replace(/\bdb\b/g,'dumbbell'),
      n.replace(/\bbarbell\b/g,'').replace(/\s+/g,' ').trim(),
      n.replace(/\bmachine\b/g,'').replace(/\s+/g,' ').trim(),
      n.replace(/\bseated\b/g,'').replace(/\s+/g,' ').trim(),
      n.replace(/\bstanding\b/g,'').replace(/\s+/g,' ').trim(),
      n.replace(/\bone arm\b/g,'single arm'),
      n.replace(/\bsingle arm\b/g,'one arm'),
      n.replace(/\btriceps\b/g,'tricep'),
      n.replace(/\bbiceps\b/g,'bicep')
    ];
    variants.forEach(function(v){pushUnique(out,slug(v));});
    return out;
  }

  function resolve(input){
    var parts=inputParts(input),list=candidates(input),id=null,via='';
    var n=normalizeName(parts.name),eqKey=n+'|'+parts.equipment;
    for(var i=0;i<list.length;i++)if(ID_SET[list[i]]){
      id=list[i];
      via=parts.equipment&&EQUIPMENT_ALIASES[eqKey]===id?'equipment-alias':ALIASES[n]===id?'alias':'normalized';
      break;
    }
    if(!id)return null;
    var base=SOURCE_BASE+'/images/flat/'+id;
    return {
      provider:SOURCE,
      datasetVersion:VERSION,
      id:id,
      via:via,
      pageUrl:SOURCE_BASE+'/exercise/'+id+'/',
      images:{
        start:base+'-start.webp',
        peak:base+'-peak.webp',
        main:base+'-main.webp'
      },
      attribution:{text:ATTRIBUTION_TEXT,url:ATTRIBUTION_URL}
    };
  }

  function coverage(names){
    var total=0,resolved=0,unmatched=[];
    (names||[]).forEach(function(name){total++;if(resolve(name))resolved++;else unmatched.push(inputParts(name).name);});
    return {total:total,resolved:resolved,unmatched:unmatched,ratio:total?resolved/total:0};
  }

  return {
    version:VERSION,
    source:SOURCE,
    sourceBase:SOURCE_BASE,
    attribution:{text:ATTRIBUTION_TEXT,url:ATTRIBUTION_URL},
    ids:IDS.slice(),
    aliases:Object.assign({},ALIASES),
    equipmentAliases:Object.assign({},EQUIPMENT_ALIASES),
    normalizeName:normalizeName,
    candidates:candidates,
    resolve:resolve,
    coverage:coverage
  };
});
