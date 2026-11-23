/* MAHFITT guest workout · shared logic (no DOM).
   Next targets come from progression.js: the unchanged MAHFITT resolver (same file as the current app), policy mahfitt-prog-v2.
   This file only builds the resolver's inputs from guest entries and turns its output into plain words.
   In the real app a database transaction applies the decision; the guest demo applies it in this tab. */
(function (root, factory) {
  'use strict';
  if (typeof window === 'undefined' && typeof module === 'object' && module.exports) {
    module.exports = factory(require('./progression.js'));
  } else {
    var rules = root.module && root.module.exports && root.module.exports.decide ? root.module.exports : null;
    try { delete root.module; delete root.exports; } catch (e) { root.module = undefined; root.exports = undefined; }
    root.MAHFITT_RULES = rules;
    root.MAHFITT_GUEST = factory(rules);
  }
})(typeof self !== 'undefined' ? self : this, function (RULES) {
  'use strict';

  var KG_PER_LB = 0.45359237;

  /* The guest program. Rep range, effort, increment and cap match the app’s Target test fixture
     (Bench, 8–12 reps, 2 reps left, +5 lb, 5% cap, 135 lb × 10/10/10). */
  var PLAN = Object.freeze({
    program: 'Upper Strength',
    title: 'UPPER A',
    section: 'MAIN STRENGTH',
    exercise: 'Bench Press',
    exerciseKey: 'bench-press',
    start: Object.freeze({ load: 135, reps: Object.freeze([10, 10, 10]) }),
    repMin: 8,
    repMax: 12,
    targetRir: 2,
    increment: 5,
    capPct: 5,
    setIds: Object.freeze(['set-1', 'set-2', 'set-3']),
    runId: 'guest-run',
    dayIndex: 0
  });

  function round(value, dec) {
    var p = Math.pow(10, dec);
    return Math.round(value * p) / p;
  }
  /* Same rule as the app’s wNum(): the app stores pounds and converts only for display. */
  function display(lb, unit, dec) {
    if (lb == null || !isFinite(lb)) return null;
    return round(unit === 'kg' ? lb * KG_PER_LB : lb, dec == null ? 2 : dec);
  }
  /* The app’s KG2 rule (wKgToCanonical): a kg value equal to the target as shown keeps the target's exact pounds;
     any other kg value is a real change, converted once. */
  function toPounds(value, unit, targetLb) {
    if (value == null || !isFinite(value)) return null;
    if (unit !== 'kg') return value;
    if (targetLb > 0 && Math.abs(value - display(targetLb, 'kg', 2)) < 1e-9) return targetLb;
    return value / KG_PER_LB;
  }
  function unitWord(unit) { return unit === 'kg' ? 'kg' : 'lbs'; }
  function unitLabel(unit) { return unit === 'kg' ? 'KG' : 'LB'; }
  function loadText(lb, unit) {
    var v = display(lb, unit, unit === 'kg' ? 2 : 1);
    return v == null ? '—' : String(v) + ' ' + unitWord(unit);
  }
  function setWord(n) { return n === 1 ? 'set' : 'sets'; }
  function repWord(n) { return Math.abs(n) === 1 ? 'rep' : 'reps'; }

  function copyTarget(t) { return { load: Number(t.load), reps: t.reps.map(Number) }; }

  /* Resolver input for one workout (absolute prescription, the app’s shape). */
  function rxFor(target, seq) {
    return {
      id: 'guest-rx-' + seq,
      rev: 1,
      seq: seq,
      run_id: PLAN.runId,
      day_index: PLAN.dayIndex,
      exercise_key: PLAN.exerciseKey,
      load: Number(target.load),
      load_unit: 'lb',
      load_convention: 'total',
      reps: target.reps.map(Number),
      rep_min: PLAN.repMin,
      rep_max: PLAN.repMax,
      target_rir: PLAN.targetRir,
      increment: PLAN.increment,
      cap_pct: PLAN.capPct,
      set_ids: PLAN.setIds.slice(),
      ordinary_allowed: true,
      source: target.source === 'decision' ? 'decision' : 'template',
      phase_name: ''
    };
  }

  /* Completed guest sets in resolver shape. Unlogged sets are left out, as in the app (no completion credit). */
  function resolverSets(sets) {
    var out = [];
    sets.forEach(function (st, i) {
      if (!st || !st.done) return;
      var row = {
        exercise_key: PLAN.exerciseKey,
        prescribed_set_id: PLAN.setIds[i],
        role: 'working',
        weight: st.weight == null ? null : Number(st.weight),
        reps: st.reps == null ? null : Number(st.reps),
        rir: st.rir == null ? null : Number(st.rir)
      };
      if (st.pain) row.pain = true;
      if (st.stop) row.stop = st.stop;
      out.push(row);
    });
    return out;
  }

  /* The stored previous decision, shaped like the app's progression_decisions row result. */
  function storedDecision(result, rx, applied) {
    var copy = JSON.parse(JSON.stringify(result));
    copy.applied = !!applied;
    if (result.next) {
      copy.transition = {
        runId: rx.run_id, dayIndex: rx.day_index, exerciseKey: rx.exercise_key,
        sourceId: rx.id, sourceSeq: rx.seq, targetId: 'guest-rx-' + (rx.seq + 1), targetRev: 1,
        loadUnit: rx.load_unit, loadConvention: rx.load_convention, targetSetIds: rx.set_ids.slice()
      };
    }
    return copy;
  }

  function isReview(branch) { return /^(review|manual|gated)/.test(String(branch || '')); }

  /* Mode wording is the app's own: Off · targets as written / Review First · you choose / Automatic · after workouts. */
  var MODES = Object.freeze({
    automatic: Object.freeze({ id: 'automatic', label: 'Automatic · after workouts', status: 'Targets update automatically after each workout.' }),
    review: Object.freeze({ id: 'review', label: 'Review First · you choose', status: 'Updates wait for your choice after each workout.' }),
    off: Object.freeze({ id: 'off', label: 'Off · targets as written', status: 'Targets stay as written.' })
  });
  function cleanMode(m) { return Object.prototype.hasOwnProperty.call(MODES, m) ? m : 'automatic'; }

  function outcomeFor(result, mode) {
    mode = cleanMode(mode);
    if (mode === 'off') return 'off';
    if (result && result.changes && result.next) return mode === 'review' ? 'pending_review' : 'applied';
    return result && isReview(result.branch) ? 'review_required' : 'held';
  }

  /* Run the real rules for a finished guest workout. */
  function decideWorkout(target, seq, sets, prev) {
    if (!RULES || typeof RULES.decide !== 'function') throw new Error('MAHFITT rules did not load');
    var rx = rxFor(target, seq);
    var input = resolverSets(sets);
    var pain = sets.some(function (s) { return s && s.pain; });
    var result = RULES.decide(rx, input, prev || null, null, pain);
    return { rx: rx, sets: input, result: result, policy: RULES.POLICY && RULES.POLICY.version };
  }

  /* Plain-English "what happens next", derived from the branch the rules actually used. */
  function nextStep(result, rx, sets, unit) {
    var L = loadText(rx.load, unit), b = String(result.branch || ''), base = b.split('+')[0];
    var min = rx.rep_min, max = rx.rep_max;
    var nextLoad = result.next ? loadText(result.next.load, unit) : L;
    var shortSets = [];
    sets.forEach(function (st, i) {
      if (st && st.done && st.reps != null && st.reps < rx.reps[i]) shortSets.push('set ' + (i + 1) + ': ' + st.reps + ' of ' + rx.reps[i]);
    });
    var lowEffort = [];
    sets.forEach(function (st, i) {
      if (st && st.done && st.rir != null && st.rir < rx.target_rir) lowEffort.push('set ' + (i + 1));
    });
    switch (base) {
      case 'ordinary':
      case 'unknown_second':
        return 'Load stays at ' + L + '. Reps rise one set at a time first. The load goes up after every set reaches ' + max + ' reps on two comparable workouts.';
      case 'easy':
        return 'Load stays at ' + L + '. Every set below ' + max + ' gets one more rep because the work felt easy.';
      case 'easy_top':
        return 'Load rises to ' + nextLoad + ': every set was at ' + max + ' reps with plenty left. Reps restart at ' + min + '.';
      case 'top_increase':
        return 'Load rises to ' + nextLoad + ': every set reached ' + max + ' reps on two comparable workouts. Reps restart at ' + min + '.';
      case 'top_hold_first':
        return 'Load stays at ' + L + ' for now. Hit ' + max + ' reps on every set once more and the load goes up.';
      case 'hold_shortfall':
        return 'Same target next time. ' + (shortSets.length ? capital(shortSets.join(', ')) + ' reps.' : 'A set came in under its target.');
      case 'hold_effort':
        return 'Same target next time. ' + (lowEffort.length ? capital(lowEffort.join(', ')) : 'A set') + ' had fewer than ' + rx.target_rir + ' reps left.';
      case 'unknown_first':
        return 'Same target next time. Record reps left so one workout can count; without it the rules wait for a second match.';
      case 'dip_block':
        return 'Increases pause. Two or more sets fell below ' + min + ' reps with 1 or fewer reps left.';
      case 'dip_reduction':
        return 'Load drops one step to ' + nextLoad + ' after a second dip. Sets and effort stay the same.';
      case 'review_not_comparable':
        return 'Target holds for review. A changed load or a missing set means this workout can’t be compared with the plan.';
      case 'review_set_order':
      case 'review_set_identity':
        return 'Target holds for review. A set was skipped, added or done out of order.';
      case 'review_pain':
        return 'Target holds for review. Pain was reported, so increases stay blocked for this movement.';
      case 'hold_nonexertion':
        return 'Same target next time. A set stopped early by choice or for time, which isn’t treated as a strength change.';
      case 'review_unknown_actuals':
        return 'Target holds for review. A logged set is missing its load or reps.';
      case 'hold_no_work':
        return 'Same target next time. No sets were logged.';
      case 'review_baseline':
        return 'Target holds for review. Reps were at least double the top of the range, so the starting point needs a look.';
      case 'review_cap':
      case 'review_increment':
        return 'Target holds for review. The next load step would break the ' + rx.cap_pct + '% cap.';
      case 'review_plateau':
        return 'Target holds for review after three comparable workouts without progress.';
      case 'review_excessive_effort':
        return 'Target holds for review after two workouts harder than the effort target.';
      default:
        return result.changes ? 'The target changes as shown.' : 'Load stays at ' + L + '.';
    }
  }
  function capital(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* One See Why model. Order follows the brief: reason, previous target, prescribed effort, resulting target. */
  function explain(decision, unit, sets) {
    var r = decision.result, rx = decision.rx;
    var prev = { load: rx.load, reps: rx.reps.slice() };
    var next = r.next ? { load: Number(r.next.load), reps: r.next.reps.map(Number) } : copyTarget(prev);
    var perSet = prev.reps.map(function (was, i) {
      var now = next.reps[i];
      return { set: i + 1, loadWas: prev.load, loadNow: next.load, loadDelta: next.load - prev.load, repsWas: was, repsNow: now, repDelta: now - was };
    });
    return {
      branch: r.branch,
      reason: r.reason,
      review: isReview(r.branch),
      changes: !!r.changes,
      previous: prev,
      next: next,
      effort: rx.target_rir,
      perSet: perSet,
      loadChanged: next.load !== prev.load,
      nextStep: nextStep(r, rx, sets || [], unit),
      policy: decision.policy || ''
    };
  }

  function deltaText(n, kind, unit) {
    if (!n) return '';
    var sign = n > 0 ? '+' : '−';
    if (kind === 'load') return sign + String(display(Math.abs(n), unit, unit === 'kg' ? 2 : 1)) + ' ' + unitWord(unit);
    return sign + Math.abs(n) + ' ' + repWord(n);
  }

  /* Same arithmetic as the app’s workoutRecapCompute for one weight × reps exercise. */
  function recap(sets, durationS) {
    var done = sets.filter(function (s) { return s && s.done; });
    var reps = 0, tonnage = 0, top = null;
    done.forEach(function (s) {
      var w = Number(s.weight) || 0, r = Number(s.reps) || 0;
      if (r > 0) reps += r;
      if (w > 0 && r > 0) tonnage += w * r;
      if (r >= 1 && (!top || w > (Number(top.weight) || 0) || (w === (Number(top.weight) || 0) && r > (Number(top.reps) || 0)))) top = s;
    });
    return { duration: Math.max(0, Math.round(Number(durationS) || 0)), sets: done.length, reps: reps, tonnage: Math.round(tonnage), top: top };
  }

  function clock(seconds) {
    seconds = Math.max(0, Math.floor(Number(seconds) || 0));
    var h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60;
    return [h, m, s].map(function (n) { return n < 10 ? '0' + n : String(n); }).join(':');
  }

  /* How a logged set compares with its prescription, in words. */
  function setComparison(st, i, target, unit) {
    var parts = [], tReps = target.reps[i];
    if (st.weight != null && Math.abs(st.weight - target.load) >= 1e-6) {
      parts.push((st.weight > target.load ? deltaText(st.weight - target.load, 'load', unit) + ' over' : deltaText(target.load - st.weight, 'load', unit).replace('+', '') + ' under') + ' the target load');
    }
    if (st.reps != null && st.reps !== tReps) {
      var d = st.reps - tReps;
      parts.push(Math.abs(d) + ' ' + repWord(d) + (d > 0 ? ' over' : ' under') + ' target');
    }
    if (st.rir == null) parts.push('reps left not recorded');
    else if (st.rir < PLAN.targetRir) parts.push((PLAN.targetRir - st.rir) + ' fewer ' + repWord(PLAN.targetRir - st.rir) + ' left than prescribed');
    else if (st.rir > PLAN.targetRir) parts.push((st.rir - PLAN.targetRir) + ' more ' + repWord(st.rir - PLAN.targetRir) + ' left than prescribed');
    if (st.pain) parts.push('pain noted');
    if (st.stop) parts.push(st.stop === 'time' ? 'stopped for time' : 'stopped by choice');
    return parts.length ? capital(parts.join(', ')) + '.' : 'Matches the target.';
  }

  function rirText(rir) { return rir == null ? 'not recorded' : rir >= 4 ? '4+ left' : rir + ' left'; }

  return Object.freeze({
    KG_PER_LB: KG_PER_LB,
    PLAN: PLAN,
    MODES: MODES,
    RULES_LOADED: !!(RULES && RULES.decide),
    policy: function () { return RULES && RULES.POLICY ? RULES.POLICY.version : ''; },
    cleanMode: cleanMode,
    display: display,
    toPounds: toPounds,
    unitWord: unitWord,
    unitLabel: unitLabel,
    loadText: loadText,
    rxFor: rxFor,
    resolverSets: resolverSets,
    decideWorkout: decideWorkout,
    storedDecision: storedDecision,
    outcomeFor: outcomeFor,
    isReview: isReview,
    explain: explain,
    nextStep: nextStep,
    deltaText: deltaText,
    recap: recap,
    clock: clock,
    setComparison: setComparison,
    rirText: rirText,
    repWord: repWord,
    setWord: setWord
  });
});
