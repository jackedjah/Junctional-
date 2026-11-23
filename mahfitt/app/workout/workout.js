/* MAHFITT guest workout controller. One gesture = one result: every action checks the current state first,
   so a double tap, a refresh or a stale button cannot log a set twice or finish twice. */
'use strict';
(function () {
  var G = window.MAHFITT_GUEST;
  var KEY = 'mahfitt.guest.workout.v1';
  var main = document.getElementById('wk-main');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var locks = Object.create(null);
  function lock(key, ms) { var now = Date.now(); if (locks[key] && now - locks[key] < (ms || 450)) return false; locks[key] = now; return true; }

  if (!G || !G.RULES_LOADED) {
    main.innerHTML = '<p class="wk-guide">The workout rules did not load. Refresh the page, or <a href="../../#watch">watch a recorded workout</a>.</p>';
    return;
  }
  var P = G.PLAN, TOTAL = P.setIds.length;

  /* ── State ─────────────────────────────────────────────── */
  function freshSets(t) { return t.reps.map(function (r) { return { weight: t.load, reps: r, rir: null, done: false, pain: false, stop: null }; }); }
  function fresh() {
    var t = { load: P.start.load, reps: P.start.reps.slice(), source: 'template' };
    return { v: 1, unit: 'lb', mode: 'automatic', seq: 1, target: t, prev: null, last: null, phase: 'today',
      startedAt: null, finishedAt: null, sets: freshSets(t), decision: null, view: { open: true, why: false, set: 0, nextWhy: false, nextSet: 0 } };
  }
  var num = function (x) { return typeof x === 'number' && isFinite(x); };
  function valid(s) {
    try {
      if (!s || s.v !== 1 || ['lb', 'kg'].indexOf(s.unit) < 0 || !G.MODES[s.mode]) return false;
      if (!Number.isInteger(s.seq) || s.seq < 1 || s.seq > 500) return false;
      if (['today', 'live', 'finished'].indexOf(s.phase) < 0) return false;
      if (!s.target || !num(s.target.load) || s.target.load <= 0 || !Array.isArray(s.target.reps) || s.target.reps.length !== TOTAL) return false;
      if (!s.target.reps.every(function (r) { return Number.isInteger(r) && r > 0 && r < 100; })) return false;
      if (!Array.isArray(s.sets) || s.sets.length !== TOTAL) return false;
      if (!s.sets.every(function (st) { return st && (st.weight === null || num(st.weight)) && (st.reps === null || num(st.reps)) && (st.rir === null || [0, 1, 2, 3, 4].indexOf(st.rir) > -1) && typeof st.done === 'boolean'; })) return false;
      if (s.phase !== 'today' && !num(s.startedAt)) return false;
      if (s.phase === 'finished' && !(s.decision && s.decision.result && s.decision.rx)) return false;
      if (!s.view || typeof s.view !== 'object') s.view = fresh().view;
      return true;
    } catch (e) { return false; }
  }
  function load() {
    try { var raw = sessionStorage.getItem(KEY); if (raw) { var s = JSON.parse(raw); if (valid(s)) return s; } } catch (e) {}
    return fresh();
  }
  var S = load();
  var storageOK = true;
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(S)); storageOK = true; }
    catch (e) { storageOK = false; }
    paintSave();
  }

  /* ── Helpers ─────────────────────────────────────────── */
  var U = function () { return S.unit; };
  function weightValue(lb) { var v = G.display(lb, U(), U() === 'kg' ? 2 : 1); return v == null ? '' : String(v); }
  function doneCount() { return S.sets.filter(function (s) { return s.done; }).length; }
  function currentIndex() { for (var i = 0; i < TOTAL; i++) if (!S.sets[i].done) return i; return -1; }
  function elapsed() { if (!S.startedAt) return 0; return ((S.finishedAt || Date.now()) - S.startedAt) / 1000; }
  var chevron = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 9.5l5-5 5 5M3 13l5-5 5 5"/></svg>';
  var info = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="6" r="5"/><circle cx="6" cy="3.5" r=".5" fill="currentColor" stroke="none"/><path d="M6 5.5v3"/></svg>';
  var arrow = function (d) { return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="' + (d < 0 ? 'M8.5 2.5L4 7l4.5 4.5M12 2.5L7.5 7l4.5 4.5' : 'M5.5 2.5L10 7l-4.5 4.5M2 2.5L6.5 7 2 11.5') + '"/></svg>'; };
  var tick = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3.5 9.5l3.5 3.5 7.5-8"/></svg>';
  function chip(v, unit) { return '<b class="mf-pg-n" data-v="new">' + v + (unit ? ' <small>' + esc(unit) + '</small>' : '') + '</b>'; }
  function repsList(r) { return r.join('/'); }

  /* ── Crown ───────────────────────────────────────────── */
  var clockEl = $('[data-clock]'), track = $('[data-track]'), pctEl = $('[data-pct]'), saveEl = $('[data-save]');
  function paintClock() { var s = elapsed(); clockEl.textContent = G.clock(s); clockEl.setAttribute('datetime', 'PT' + Math.floor(s) + 'S'); }
  function paintProgress() {
    var pct = S.phase === 'today' ? 0 : Math.round(doneCount() / TOTAL * 100);
    track.style.setProperty('--pct', pct + '%'); track.setAttribute('aria-valuenow', String(pct)); pctEl.textContent = pct + '%';
  }
  function paintSave() {
    var label = S.phase === 'today' ? 'READY' : storageOK ? 'SAVED · THIS TAB' : 'NOT SAVED · ON SCREEN ONLY';
    saveEl.textContent = label; saveEl.dataset.state = S.phase === 'today' ? 'ready' : storageOK ? 'saved' : 'error';
  }
  function paintCrown() {
    $('[data-title]').textContent = P.title + (S.seq > 1 ? ' · WORKOUT ' + S.seq : '');
    var dt = $('[data-date]'); if (dt) dt.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    paintClock(); paintProgress(); paintSave();
  }
  var timer = null;
  function runClock() {
    clearInterval(timer); timer = null;
    if (S.phase === 'live') timer = setInterval(paintClock, 1000);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) paintClock(); });

  /* ── See Why content ────────────────────────────────── */
  /* d: {result, rx, outcome, choice}. role: 'live' (this target came from d) or 'next' (d decides the next target). */
  function whyHTML(d, setIx, role) {
    var e = G.explain({ result: d.result, rx: d.rx, policy: d.policy }, U(), d.sets || []);
    var outcome = d.outcome, waiting = outcome === 'pending_review' && !d.choice;
    /* The row shows the target actually used next. Off and Keep current leave it unchanged. */
    var res = waiting ? e.next : nextTargetFor(d), prev = e.previous;
    var notUsed = e.changes && (outcome === 'off' || d.choice === 'decline');
    var reasonLine = outcome === 'off' ? 'Adjustments are Off · targets as written.' : esc(e.reason);
    var loadMoved = res.load !== prev.load;
    var repsPrev = prev.reps.map(function (r, i) { return i === setIx ? '<mark>' + r + '</mark>' : String(r); }).join(' / ');
    var repsRes = res.reps.map(function (r, i) { var c = r !== prev.reps[i]; return (i === setIx ? '<mark>' : '') + (c ? '<span class="changed">' + r + '</span>' : String(r)) + (i === setIx ? '</mark>' : ''); }).join(' / ');
    var loadChange = loadMoved ? '<span class="changed">' + esc(G.deltaText(res.load - prev.load, 'load', U())) + '</span>' : '<span class="same">Kept</span>';
    var repMoves = res.reps.map(function (r, i) { return r - prev.reps[i]; }).map(function (dlt, i) { return dlt ? G.deltaText(dlt, 'reps') + ' on set ' + (i + 1) : ''; }).filter(Boolean);
    var repChange = repMoves.length ? '<span class="changed">' + esc(repMoves.join(', ')) + '</span>' : '<span class="same">Kept</span>';
    var resultLabel = waiting ? 'Suggested' : role === 'live' ? 'This target' : 'Next target';
    var nextLine = notUsed ? holdText(d) : e.nextStep;
    void role;
    return '<div class="wk-why">' +
      '<p class="wk-why__reason"><b>Why:</b> ' + reasonLine + '</p>' +
      '<div class="wk-grid" role="table" aria-label="Target change by weight and reps">' +
        '<span class="h" role="columnheader"><span class="sr">Row</span></span><span class="h" role="columnheader">Weight</span><span class="h" role="columnheader">Reps per set</span>' +
        '<span class="k" role="rowheader">Previous</span><span role="cell">' + esc(G.loadText(prev.load, U())) + '</span><span role="cell">' + repsPrev + '</span>' +
        '<span class="k" role="rowheader">Effort</span><span class="wide" role="cell">' + esc(e.effort) + ' reps left (prescribed)</span>' +
        '<span class="k" role="rowheader">' + resultLabel + '</span><span role="cell">' + (loadMoved ? '<span class="changed">' + esc(G.loadText(res.load, U())) + '</span>' : esc(G.loadText(res.load, U()))) + '</span><span role="cell">' + repsRes + '</span>' +
        '<span class="k" role="rowheader">Change</span><span role="cell">' + loadChange + '</span><span role="cell">' + repChange + '</span>' +
      '</div>' +
      '<p class="wk-why__next">' + esc(nextLine) + '</p>' +
      '<p class="wk-why__foot"><span class="wk-provenance">Calculated from your demo entries</span> MAHFITT progression rules (' + esc(e.policy || G.policy()) + '). Targets are saved separately from your actual set entries.</p>' +
      '</div>';
  }
  function holdText(d) {
    if (d.outcome === 'off') return 'Adjustments are Off, so the next workout keeps the same target.';
    if (d.choice === 'decline') return 'You kept the current target. The suggested change was not used.';
    return 'Target holds.';
  }
  function startWhyHTML() {
    return '<div class="wk-why">' +
      '<p class="wk-why__reason"><b>Why:</b> This is the sample program’s starting target. It changes only after you finish a workout.</p>' +
      '<div class="wk-grid" role="table" aria-label="Starting target">' +
        '<span class="h" role="columnheader"><span class="sr">Row</span></span><span class="h" role="columnheader">Weight</span><span class="h" role="columnheader">Reps per set</span>' +
        '<span class="k" role="rowheader">Previous</span><span class="wide" role="cell">None yet. This is workout 1.</span>' +
        '<span class="k" role="rowheader">Effort</span><span class="wide" role="cell">' + P.targetRir + ' reps left (prescribed)</span>' +
        '<span class="k" role="rowheader">Target</span><span role="cell">' + esc(G.loadText(S.target.load, U())) + '</span><span role="cell">' + repsList(S.target.reps) + '</span>' +
      '</div>' +
      '<p class="wk-why__next">Log your sets and finish. The rules then compare what you did with this target and set the next one.</p>' +
      '<p class="wk-why__foot">Targets are saved separately from your actual set entries.</p></div>';
  }

  /* The target a decision leads to, given the mode and the visitor's review choice. */
  function nextTargetFor(d) {
    var r = d.result, current = { load: d.rx.load, reps: d.rx.reps.slice() };
    if (d.outcome === 'applied' || (d.outcome === 'pending_review' && d.choice === 'approve')) return { load: r.next.load, reps: r.next.reps.slice(), source: 'decision' };
    return current;
  }

  /* ── TARGET card ─────────────────────────────────────── */
  function targetCardHTML(opts) {
    // opts: {title, values:{load,reps}, base:{load,reps}|null, why:html, open, whyOpen, set, id, sample:false}
    var k = Math.max(0, Math.min(TOTAL - 1, opts.set | 0));
    var load = opts.values.load, reps = opts.values.reps[k];
    var dl = opts.base ? load - opts.base.load : 0, dr = opts.base ? reps - opts.base.reps[k] : 0;
    var changed = !!(dl || dr);
    var bid = opts.id + '-body';
    return '<section class="mf-live-targets" data-target-card="' + opts.id + '" aria-label="' + esc(opts.title) + '">' +
      '<h3 class="wk-target-h">' + esc(opts.title) + '</h3>' +
      '<button type="button" class="mf-live-target-toggle" data-a="toggle" data-card="' + opts.id + '" data-fk="toggle-' + opts.id + '" aria-expanded="' + (opts.open ? 'true' : 'false') + '" aria-controls="' + bid + '" aria-label="' + (opts.open ? 'Collapse ' : 'Expand ') + esc(opts.title) + '">' + chevron + '</button>' +
      '<div class="mf-live-target-body" id="' + bid + '"' + (opts.open ? '' : ' hidden') + '>' +
        '<details class="mf-pg-info" data-why="' + opts.id + '"' + (opts.whyOpen ? ' open' : '') + '><summary data-fk="why-' + opts.id + '">SEE WHY ' + info + '</summary>' + opts.why + '</details>' +
        '<div class="mf-pg-setnav"><button type="button" class="mf-pg-setbtn" data-a="setnav" data-card="' + opts.id + '" data-step="-1" data-fk="prev-' + opts.id + '" aria-label="Previous target set"' + (k === 0 ? ' disabled' : '') + '>' + arrow(-1) + '</button>' +
        '<span class="mf-pg-setlabel" aria-live="polite">SET ' + (k + 1) + '</span>' +
        '<button type="button" class="mf-pg-setbtn" data-a="setnav" data-card="' + opts.id + '" data-step="1" data-fk="next-' + opts.id + '" aria-label="Next target set"' + (k === TOTAL - 1 ? ' disabled' : '') + '>' + arrow(1) + '</button></div>' +
        '<div class="mf-pg-delta" data-progression="' + (changed ? '1' : '0') + '">' +
          '<div class="mf-live-target-values">' + chip(esc(weightValue(load)), G.unitWord(U())) + '<i class="mf-live-target-separator" aria-hidden="true">•</i>' + chip(String(reps), reps === 1 ? 'rep' : 'reps') + '</div>' +
          (changed ? '<div class="mf-live-target-change"><i>RECOMMENDED</i><em>' + esc([dl ? G.deltaText(dl, 'load', U()) : '', dr ? G.deltaText(dr, 'reps') : ''].filter(Boolean).join(' · ')) + '</em></div>' : '') +
        '</div>' +
        (opts.model ? '<small class="wk-model">' + esc(opts.model) + '</small>' : '') +
      '</div></section>';
  }

  /* ── Screens ─────────────────────────────────────────── */
  function settingsHTML(prefix) {
    return '<div class="wk-setting"><span id="' + prefix + '-unit">Units</span><div class="wk-seg" role="group" aria-labelledby="' + prefix + '-unit">' +
        ['lb', 'kg'].map(function (u) { return '<button type="button" data-a="unit" data-unit="' + u + '" data-fk="' + prefix + '-u-' + u + '" aria-pressed="' + (S.unit === u) + '">' + u.toUpperCase() + '</button>'; }).join('') + '</div></div>' +
      '<label class="wk-setting wk-setting--stack" for="' + prefix + '-mode">Adjustments<select class="wk-select" id="' + prefix + '-mode" data-a="mode" data-fk="' + prefix + '-mode">' +
        Object.keys(G.MODES).map(function (m) { return '<option value="' + m + '"' + (S.mode === m ? ' selected' : '') + '>' + esc(G.MODES[m].label) + '</option>'; }).join('') + '</select></label>' +
      '<p class="wk-note" data-mode-note>' + esc(G.MODES[S.mode].status) + (S.unit === 'kg' ? ' Weights show in kg; MAHFITT stores pounds.' : '') + '</p>';
  }

  function renderToday() {
    var t = S.target, changedNote = '';
    if (S.last && S.seq > 1) {
      var e = G.explain({ result: S.last.result, rx: S.last.rx }, U(), S.last.sets || []);
      var applied = S.last.outcome === 'applied' || S.last.choice === 'approve';
      changedNote = '<p class="wk-note"><b>Since workout ' + (S.seq - 1) + ':</b> ' + (applied && e.changes ? esc(changeSummary(e)) + ' See why on the next screen.' : esc(S.last.outcome === 'off' ? 'Adjustments are Off, so the target is the same.' : S.last.choice === 'decline' ? 'You kept the same target.' : 'The target is the same. See why on the next screen.')) + '</p>';
    }
    main.innerHTML =
      '<p class="wk-sec">MAH PROGRAMS</p>' +
      '<section class="wk-panel wk-prog" aria-labelledby="today-h">' +
        '<header class="wk-prog__head"><h2 class="wk-h2" id="today-h" tabindex="-1">' + esc(P.program) + '</h2><p class="wk-prog__sub">1 WORKOUT · GUEST</p></header>' +
        '<div class="wk-day"><p class="wk-kicker">' + esc(P.title) + ' · workout ' + S.seq + '</p>' +
        '<p class="wk-day__ex">' + esc(P.exercise) + '</p>' +
        '<div class="wk-tags"><span class="wk-tag">Suggested</span><span class="wk-tag wk-tag--plain">Not scheduled</span><span class="wk-tag wk-tag--plain">Sample data</span></div>' +
        '<p class="wk-note">Suggested by the sample program. It isn’t on a calendar.</p>' +
        '<dl class="wk-rx"><div><dt>SETS</dt><dd>' + TOTAL + '</dd></div><div><dt>REPS</dt><dd>' + repsList(t.reps) + '</dd></div><div><dt>LOAD</dt><dd>' + esc(weightValue(t.load)) + '<small>' + G.unitWord(U()) + '</small></dd></div></dl>' +
        '<p class="wk-note">Effort: stop with <b>' + P.targetRir + ' reps left</b>. Range ' + P.repMin + '–' + P.repMax + ' reps. Load goes up in ' + esc(G.loadText(P.increment, U())) + ' steps, never more than ' + P.capPct + '% at once.</p>' +
        changedNote +
        '<div class="wk-row-actions"><button class="wk-go" type="button" data-a="start" data-fk="start">Start workout</button></div></div>' +
        '<details class="wk-how" open><summary data-fk="how">HOW IT WORKS</summary><div class="wk-settings">' + settingsHTML('today') + '</div></details>' +
      '</section>';
  }
  function changeSummary(e) {
    var parts = [];
    if (e.loadChanged) parts.push('load ' + G.deltaText(e.next.load - e.previous.load, 'load', U()));
    e.perSet.forEach(function (p) { if (p.repDelta) parts.push(G.deltaText(p.repDelta, 'reps') + ' on set ' + p.set); });
    return 'Target changed: ' + parts.join(', ') + '.';
  }

  function liveTargetHTML() {
    var base = null, why;
    if (S.last && S.seq > 1) {
      var applied = S.last.outcome === 'applied' || S.last.choice === 'approve';
      base = applied ? { load: S.last.rx.load, reps: S.last.rx.reps } : null;
      why = whyHTML(S.last, S.view.set, 'live');
    } else why = startWhyHTML();
    var model = S.mode === 'automatic' ? '' : S.mode === 'review' ? 'Review First' : 'Targets as written';
    return targetCardHTML({ id: 'live', title: 'TARGET', values: S.target, base: base, why: why, open: S.view.open, whyOpen: S.view.why, set: S.view.set, model: model });
  }

  function setRowHTML(i) {
    var st = S.sets[i], cur = currentIndex(), isCur = i === cur, w = weightValue(st.weight), unit = G.unitLabel(U());
    var field = function (k, value, label, sfx) {
      var dis = st.done ? ' disabled' : '';
      return '<span class="wk-field"><button type="button" data-a="step" data-i="' + i + '" data-k="' + k + '" data-d="-1" data-fk="m-' + k + i + '" aria-label="Decrease set ' + (i + 1) + ' ' + label + '"' + dis + '>−</button>' +
        '<label for="in-' + k + i + '"><input id="in-' + k + i + '" class="' + (k === 'weight' && U() === 'kg' ? 'is-kg' : '') + '" data-a="typed" data-i="' + i + '" data-k="' + k + '" data-fk="in-' + k + i + '" inputmode="decimal" enterkeyhint="done" autocomplete="off" value="' + esc(value) + '" aria-label="Set ' + (i + 1) + ' ' + label + '"' + (st.done ? ' readonly aria-readonly="true"' : '') + '><span aria-hidden="true">' + sfx + '</span></label>' +
        '<button type="button" data-a="step" data-i="' + i + '" data-k="' + k + '" data-d="1" data-fk="p-' + k + i + '" aria-label="Increase set ' + (i + 1) + ' ' + label + '"' + dis + '>+</button></span>';
    };
    var h = '<li class="wk-set' + (st.done ? ' is-done' : '') + (isCur ? ' is-current' : '') + '" data-set="' + i + '">' +
      '<span class="wk-set__no" aria-hidden="true">' + (i + 1) + '</span>' +
      field('weight', w, 'weight in ' + (U() === 'kg' ? 'kilograms' : 'pounds'), U() === 'kg' ? 'kg' : 'lbs') +
      field('reps', st.reps == null ? '' : String(st.reps), 'reps', 'reps') +
      '<button type="button" class="wk-check" data-a="log" data-i="' + i + '" data-fk="log-' + i + '" aria-label="' + (st.done ? 'Set ' + (i + 1) + ' logged' : 'Log set ' + (i + 1)) + '" aria-pressed="' + st.done + '"' + (st.done ? ' aria-disabled="true"' : '') + '>' + tick + '</button>';
    if (st.done) {
      h += '<div class="wk-set__done"><span>Logged · ' + esc(G.rirText(st.rir)) + '. ' + esc(G.setComparison(st, i, S.target, U())) + '</span>' +
        (S.phase === 'live' ? '<button type="button" class="wk-text" data-a="edit" data-i="' + i + '" data-fk="edit-' + i + '">Edit set ' + (i + 1) + '</button>' : '') + '</div>';
    } else if (isCur) {
      h += '<fieldset class="wk-effort"><legend>Set ' + (i + 1) + ' · reps left · <b>target ' + P.targetRir + '</b></legend><div class="wk-chips">' +
        [['', 'Not recorded'], [0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4+']].map(function (o) {
          var v = o[0], checked = (v === '' ? st.rir == null : st.rir === v);
          return '<label class="' + (v === P.targetRir ? 'target' : '') + '"><input type="radio" name="rir-' + i + '" data-a="rir" data-i="' + i + '" value="' + v + '" data-fk="rir-' + i + '-' + v + '"' + (checked ? ' checked' : '') + (v === '' ? ' aria-label="Reps left not recorded"' : ' aria-label="' + o[1] + ' reps left"') + '><span>' + (v === '' ? 'Not<br>recorded' : o[1]) + '</span></label>';
        }).join('') + '</div></fieldset>' +
        '<details class="wk-more"><summary data-fk="more-' + i + '">MORE FOR THIS SET</summary>' +
          '<label><input type="checkbox" data-a="pain" data-i="' + i + '" data-fk="pain-' + i + '"' + (st.pain ? ' checked' : '') + '> Pain or discomfort</label>' +
          '<label><input type="checkbox" data-a="stop" data-i="' + i + '" data-fk="stop-' + i + '"' + (st.stop ? ' checked' : '') + '> Stopped early by choice</label>' +
        '</details>';
    }
    return h + '</li>';
  }

  function guideHTML() {
    var n = doneCount(), cur = currentIndex();
    if (n === 0) return '<b>Log a set.</b> Change the numbers if you did something different, pick reps left, then tap ✓.';
    if (cur > -1) return '<b>Next: set ' + (cur + 1) + '.</b> Same steps. Your next target is worked out when you finish.';
    return '<b>All sets logged.</b> Tap Finish workout to get your next target and see why.';
  }

  function renderLive() {
    main.innerHTML =
      '<figure class="wk-gym" aria-hidden="true"><img src="../../media/gym.webp" width="708" height="286" alt=""></figure>' +
      '<p class="wk-guide" data-guide aria-live="polite">' + guideHTML() + '</p>' +
      '<article class="wk-panel wk-ex" aria-labelledby="ex-name">' +
        '<p class="wk-ex__sec">' + esc(P.section) + '</p>' +
        '<header class="wk-ex__head"><span class="wk-ex__thumb" aria-hidden="true"></span><div class="wk-ex__id"><h2 class="wk-ex__name" id="ex-name" tabindex="-1">' + esc(P.exercise) + '</h2><span class="wk-ex__count" data-count></span></div></header>' +
        '<div data-target-slot>' + liveTargetHTML() + '</div>' +
        '<ol class="wk-sets" data-sets aria-label="Sets for ' + esc(P.exercise) + '"></ol>' +
        '<div class="wk-status" role="status" data-status></div>' +
      '</article>' +
      '<div class="wk-finishbar"><button class="wk-go" type="button" data-a="finish" data-fk="finish">Finish workout</button></div>';
    paintRows(); paintCount();
  }
  function paintCount() { var c = $('[data-count]'); if (c) c.textContent = 'WEIGHT • REPS • ' + doneCount() + '/' + TOTAL + ' SETS'; }
  function paintRows() {
    var list = $('[data-sets]'); if (!list) return;
    withFocus(function () { list.innerHTML = S.sets.map(function (_, i) { return setRowHTML(i); }).join(''); });
  }
  function paintLiveTarget() {
    var slot = $('[data-target-slot]'); if (!slot) return;
    withFocus(function () { slot.innerHTML = liveTargetHTML(); });
  }
  function paintGuide() { var g = $('[data-guide]'); if (g) g.innerHTML = guideHTML(); }
  var lastStatus = { html: '', undo: null };
  function status(html, undoIndex) {
    var el = $('[data-status]'); lastStatus = { html: html, undo: undoIndex == null ? null : undoIndex };
    if (!el) return;
    el.innerHTML = html + (undoIndex != null ? ' <button type="button" class="wk-text" data-a="undo" data-i="' + undoIndex + '" data-fk="undo">Undo</button>' : '');
  }

  function renderFinished() {
    var d = S.decision, rc = G.recap(S.sets, Math.floor(elapsed())), top = rc.top;
    var next = nextTargetFor(d), base = { load: d.rx.load, reps: d.rx.reps };
    var showNext = d.outcome === 'pending_review' && !d.choice ? { load: d.result.next.load, reps: d.result.next.reps } : next;
    var title = d.outcome === 'pending_review' && !d.choice ? 'SUGGESTED TARGET' : 'NEXT TARGET';
    var decisionHTML;
    if (d.outcome === 'pending_review' && !d.choice) {
      decisionHTML = '<p><b>Review First:</b> choose an update to use.</p><div class="wk-acts"><button type="button" class="wk-go" data-a="approve" data-fk="approve">Use update</button><button type="button" class="wk-ghost" data-a="decline" data-fk="decline">Keep current</button></div>';
    } else if (d.outcome === 'pending_review') {
      decisionHTML = '<p>' + (d.choice === 'approve' ? 'You used the update for workout ' + (S.seq + 1) + '.' : 'You kept the current target for workout ' + (S.seq + 1) + '.') + ' <button type="button" class="wk-text" data-a="rechoose" data-fk="rechoose">Change choice</button></p>';
    } else if (d.outcome === 'review_required') {
      decisionHTML = '<p class="wk-alert" role="alert">Review required before the next workout. The target holds.</p>';
    } else if (d.outcome === 'off') {
      decisionHTML = '<p>Adjustments are Off · targets as written.</p>';
    } else if (d.outcome === 'applied') {
      decisionHTML = '<p>Applied to workout ' + (S.seq + 1) + ' automatically.</p>';
    } else {
      decisionHTML = '<p>The target holds for workout ' + (S.seq + 1) + '.</p>';
    }
    var waiting = d.outcome === 'pending_review' && !d.choice;
    main.innerHTML =
      '<section class="wk-panel wk-summary" aria-labelledby="sum-h">' +
        '<p class="wk-kicker">LIVE WORKOUT · SAVED</p>' +
        '<h2 class="wk-h2" id="sum-h" tabindex="-1">' + esc(P.title) + (S.seq > 1 ? ' · ' + S.seq : '') + '</h2>' +
        '<dl class="wk-stats"><div><dt>TIME</dt><dd>' + G.clock(rc.duration) + '</dd></div><div><dt>SETS</dt><dd>' + rc.sets + '</dd></div><div><dt>REPS</dt><dd>' + rc.reps + '</dd></div><div><dt>' + (U() === 'kg' ? 'KG' : 'LB') + ' MOVED</dt><dd>' + esc(Math.round(G.display(rc.tonnage, U(), 0)).toLocaleString('en-US')) + '</dd></div></dl>' +
        '<div class="wk-top"><b>TOP SETS</b><strong>' + (top ? esc(P.exercise.toUpperCase() + ' ' + weightValue(top.weight) + ' ' + G.unitLabel(U()) + ' × ' + top.reps) : 'No completed sets') + '</strong></div>' +
      '</section>' +
      '<section class="wk-panel" aria-labelledby="next-h">' +
        '<p class="wk-kicker" id="next-h">Next workout</p>' +
        '<p class="wk-guide" data-guide><b>See why.</b> Tap SEE WHY in the target below to read the reason.</p>' +
        targetCardHTML({ id: 'next', title: title, values: showNext, base: (showNext.load !== base.load || showNext.reps.join() !== base.reps.join()) ? base : null, why: whyHTML(d, S.view.nextSet, 'next'), open: S.view.nextOpen !== false, whyOpen: S.view.nextWhy, set: S.view.nextSet, model: '' }) +
        '<div class="wk-decision">' + decisionHTML + '</div>' +
        '<div class="wk-row-actions"><button class="wk-go" type="button" data-a="next" data-fk="nextw"' + (waiting ? ' disabled aria-describedby="wait-note"' : '') + '>Start workout ' + (S.seq + 1) + '</button>' +
        (waiting ? '<p class="wk-note" id="wait-note">Choose Use update or Keep current first.</p>' : '') +
        '<button type="button" class="wk-text" data-a="reopen" data-fk="reopen">Reopen this workout</button></div>' +
      '</section>';
  }

  /* Re-render while keeping keyboard focus on the same control. */
  function withFocus(fn) {
    var a = document.activeElement, fk = a && a.dataset ? a.dataset.fk : null;
    var selStart = null;
    try { if (a && a.tagName === 'INPUT' && a.type !== 'radio' && a.type !== 'checkbox') selStart = a.selectionStart; } catch (e) {}
    fn();
    if (fk) {
      var el = document.querySelector('[data-fk="' + fk + '"]');
      if (el && !el.disabled) { el.focus({ preventScroll: true }); try { if (selStart != null) el.setSelectionRange(selStart, selStart); } catch (e) {} }
    }
  }

  function render(focusSel) {
    paintCrown();
    if (S.phase === 'today') renderToday();
    else if (S.phase === 'live') { renderLive(); if (lastStatus.html) status(lastStatus.html, lastStatus.undo); }
    else renderFinished();
    runClock();
    if (focusSel) { var f = $(focusSel); if (f) f.focus({ preventScroll: false }); }
  }

  /* ── Actions ─────────────────────────────────────────── */
  function start() {
    if (S.phase !== 'today' || !lock('start')) return;
    S.phase = 'live'; S.startedAt = Date.now(); S.finishedAt = null; S.view.open = true; S.view.why = false; S.view.set = 0;
    lastStatus = { html: '', undo: null };
    save(); render('#ex-name');
  }
  function parseInput(k, raw) {
    var v = String(raw).trim().replace(',', '.');
    if (v === '') return null;
    var n = Number(v);
    if (!isFinite(n) || n < 0) return NaN;
    return k === 'reps' ? Math.round(n) : n;
  }
  function typed(input) {
    var i = Number(input.dataset.i), k = input.dataset.k, st = S.sets[i];
    if (!st || st.done || S.phase !== 'live') return;
    var v = parseInput(k, input.value);
    if (v !== v) { input.setAttribute('aria-invalid', 'true'); return; }
    input.removeAttribute('aria-invalid');
    if (k === 'weight') st.weight = v == null ? null : G.toPounds(v, U(), S.target.load);
    else st.reps = v == null ? null : Math.min(99, v);
    save();
  }
  function step(btn) {
    var i = Number(btn.dataset.i), k = btn.dataset.k, d = Number(btn.dataset.d), st = S.sets[i];
    if (!st || st.done || S.phase !== 'live') return;
    if (k === 'reps') st.reps = Math.max(0, Math.min(99, (st.reps == null ? S.target.reps[i] : st.reps) + d));
    else {
      var shown = G.display(st.weight == null ? S.target.load : st.weight, U(), 2), inc = U() === 'kg' ? 2.5 : P.increment;
      var nextShown = Math.max(0, Math.round((shown + d * inc) * 100) / 100);
      st.weight = G.toPounds(nextShown, U(), S.target.load);
    }
    var input = document.getElementById('in-' + k + i);
    if (input) input.value = k === 'reps' ? String(st.reps) : weightValue(st.weight);
    save();
  }
  function logSet(i) {
    var st = S.sets[i];
    if (S.phase !== 'live' || !st || st.done || !lock('log-' + i, 600)) return;
    // Read any value still being typed.
    ['weight', 'reps'].forEach(function (k) { var el = document.getElementById('in-' + k + i); if (el) typed(el); });
    if (st.reps == null || !(st.reps > 0)) { status('<b>Set ' + (i + 1) + ' needs reps.</b> Enter how many you did, then tap ✓.'); var r = document.getElementById('in-reps' + i); if (r) r.focus(); return; }
    if (st.weight == null || !isFinite(st.weight)) { status('<b>Set ' + (i + 1) + ' needs a weight.</b> Enter it, then tap ✓.'); var w = document.getElementById('in-weight' + i); if (w) w.focus(); return; }
    st.done = true; st.doneAt = Date.now();
    save();
    var cur = currentIndex();
    var msg = '<b>Set ' + (i + 1) + ' logged</b> · ' + esc(weightValue(st.weight) + ' ' + G.unitWord(U()) + ' × ' + st.reps + ' · ' + G.rirText(st.rir)) + '. ' + esc(G.setComparison(st, i, S.target, U())) + ' ' + (cur > -1 ? '<b>Next: set ' + (cur + 1) + '.</b>' : '<b>All sets logged.</b> Tap Finish workout.');
    paintRows(); paintCount(); paintProgress(); paintGuide(); status(msg, i);
    var nextBtn = cur > -1 ? document.querySelector('[data-a="log"][data-i="' + cur + '"]') : document.querySelector('[data-a="finish"]');
    if (nextBtn) nextBtn.focus({ preventScroll: true });
  }
  function undo(i) {
    var st = S.sets[i];
    if (S.phase !== 'live' || !st || !st.done || !lock('undo-' + i)) return;
    st.done = false; delete st.doneAt; save();
    paintRows(); paintCount(); paintProgress(); paintGuide();
    status('<b>Set ' + (i + 1) + ' reopened.</b> Change it, then tap ✓ again.');
    var b = document.querySelector('[data-a="log"][data-i="' + i + '"]'); if (b) b.focus();
  }
  var finishDialog = document.getElementById('finish-dialog');
  function askFinish() {
    if (S.phase !== 'live' || finishDialog.open) return;
    var missing = S.sets.map(function (s, i) { return s.done ? 0 : i + 1; }).filter(Boolean);
    document.getElementById('finish-body').textContent = 'Your sets and workout time will be saved.' +
      (missing.length ? ' ' + (missing.length === 1 ? 'Set ' + missing[0] + ' isn’t' : 'Sets ' + missing.join(' and ') + ' aren’t') + ' logged and won’t count.' : '');
    finishDialog.returnValue = '';
    finishDialog.showModal();
  }
  finishDialog.addEventListener('close', function () {
    if (finishDialog.returnValue === 'finish') finish();
    else { var f = document.querySelector('[data-a="finish"]'); if (f) f.focus(); }
  });
  function finish() {
    if (S.phase !== 'live' || !lock('finish', 1000)) return;
    var d = G.decideWorkout(S.target, S.seq, S.sets, S.prev);
    S.decision = { result: d.result, rx: d.rx, policy: d.policy, sets: JSON.parse(JSON.stringify(S.sets)), outcome: G.outcomeFor(d.result, S.mode), mode: S.mode, choice: null };
    S.phase = 'finished'; S.finishedAt = Date.now(); S.view.nextWhy = false;
    S.view.nextSet = Math.max(0, d.result.next ? d.result.next.reps.findIndex(function (r, k) { return r !== d.rx.reps[k]; }) : 0);
    lastStatus = { html: '', undo: null };
    save(); render('#sum-h');
  }
  function reopen() {
    if (S.phase !== 'finished' || !lock('reopen')) return;
    S.phase = 'live'; S.decision = null;
    S.startedAt = S.startedAt + (Date.now() - S.finishedAt); S.finishedAt = null; // paused time is not workout time
    save(); render('#ex-name');
    status('<b>Workout reopened.</b> Change a set or finish again. Nothing was applied.');
  }
  function choose(choice) {
    if (S.phase !== 'finished' || !S.decision || S.decision.outcome !== 'pending_review' || !lock('choose')) return;
    S.decision.choice = choice; save(); render(choice ? '[data-fk="nextw"]' : '[data-fk="approve"]');
  }
  function nextWorkout() {
    var d = S.decision;
    if (S.phase !== 'finished' || !d || (d.outcome === 'pending_review' && !d.choice) || !lock('next', 800)) return;
    var t = nextTargetFor(d);
    var applied = d.outcome === 'applied' || d.choice === 'approve';
    S.prev = G.storedDecision(d.result, d.rx, applied);
    S.last = { result: d.result, rx: d.rx, policy: d.policy, sets: d.sets, outcome: d.outcome, choice: d.choice };
    S.target = { load: t.load, reps: t.reps.slice(), source: applied ? 'decision' : S.target.source };
    S.seq += 1; S.sets = freshSets(S.target); S.decision = null;
    S.phase = 'today'; S.startedAt = null; S.finishedAt = null;
    S.view = { open: true, why: false, set: Math.max(0, S.last.result.next ? S.last.result.next.reps.findIndex(function (r, k) { return r !== S.last.rx.reps[k]; }) : 0), nextWhy: false, nextSet: 0 };
    lastStatus = { html: '', undo: null };
    save(); render('#today-h');
  }
  function setUnit(u) {
    if (['lb', 'kg'].indexOf(u) < 0 || S.unit === u) return;
    S.unit = u; save(); render(); var b = document.querySelector('[data-a="unit"][data-unit="' + u + '"]'); if (b) b.focus();
    paintMenu();
  }
  function setMode(m) {
    m = G.cleanMode(m); if (S.mode === m) return;
    S.mode = m; save();
    document.querySelectorAll('[data-mode-note]').forEach(function (n) { n.textContent = G.MODES[m].status + (S.unit === 'kg' ? ' Weights show in kg; MAHFITT stores pounds.' : ''); });
    document.querySelectorAll('[data-a="mode"]').forEach(function (s) { s.value = m; });
    if (S.phase === 'live') paintLiveTarget();
  }

  /* Dialogs: menu and confirm */
  var menu = document.getElementById('menu-dialog'), confirmDlg = document.getElementById('confirm-dialog'), confirmAction = null;
  function paintMenu() {
    var box = $('[data-menu-settings]'); if (box) box.innerHTML = settingsHTML('menu');
    var discard = menu.querySelector('[data-a="discard"]'); if (discard) discard.hidden = S.phase !== 'live';
  }
  function openMenu() { if (menu.open) return; paintMenu(); menu.showModal(); }
  function askConfirm(kind) {
    var copy = kind === 'discard'
      ? ['LIVE WORKOUT', 'Discard ' + P.title.toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + '?', 'The sets you logged in it are not kept. Your finished guest workouts are not touched.', 'Discard workout']
      : ['GUEST SESSION', 'Reset the guest session?', 'All sample workouts and targets in this tab are cleared. You start again at workout 1.', 'Reset'];
    $('[data-confirm-kicker]').textContent = copy[0]; $('[data-confirm-title]').textContent = copy[1];
    $('[data-confirm-body]').textContent = copy[2]; $('[data-confirm-ok]').textContent = copy[3];
    confirmAction = kind; if (menu.open) menu.close('close');
    confirmDlg.returnValue = ''; confirmDlg.showModal();
  }
  confirmDlg.addEventListener('close', function () {
    if (confirmDlg.returnValue !== 'ok') { confirmAction = null; return; }
    if (confirmAction === 'reset') {
      try { sessionStorage.removeItem(KEY); } catch (e) {}
      S = fresh(); lastStatus = { html: '', undo: null }; save(); render('#today-h');
    } else if (confirmAction === 'discard' && S.phase === 'live') {
      S.phase = 'today'; S.startedAt = null; S.finishedAt = null; S.sets = freshSets(S.target); lastStatus = { html: '', undo: null };
      save(); render('#today-h');
    }
    confirmAction = null;
  });

  /* ── Events (delegated, one owner) ─────────────────── */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.dataset.a;
    switch (a) {
      case 'start': start(); break;
      case 'step': step(b); break;
      case 'log': logSet(Number(b.dataset.i)); break;
      case 'undo': case 'edit': undo(Number(b.dataset.i)); break;
      case 'finish': askFinish(); break;
      case 'approve': choose('approve'); break;
      case 'decline': choose('decline'); break;
      case 'rechoose': choose(null); break;
      case 'next': nextWorkout(); break;
      case 'reopen': reopen(); break;
      case 'unit': setUnit(b.dataset.unit); break;
      case 'menu': openMenu(); break;
      case 'reset': askConfirm('reset'); break;
      case 'discard': askConfirm('discard'); break;
      case 'toggle': {
        var card = b.dataset.card, flag = card === 'next' ? 'nextOpen' : 'open';
        var openNow = card === 'next' ? S.view.nextOpen !== false : S.view.open;
        S.view[flag] = !openNow; save();
        var body = document.getElementById(card + '-body'); if (body) body.hidden = openNow;
        var title = b.closest('[data-target-card]').querySelector('.wk-target-h').textContent;
        b.setAttribute('aria-expanded', String(!openNow)); b.setAttribute('aria-label', (!openNow ? 'Collapse ' : 'Expand ') + title);
        break;
      }
      case 'setnav': {
        var key = b.dataset.card === 'next' ? 'nextSet' : 'set';
        S.view[key] = Math.max(0, Math.min(TOTAL - 1, S.view[key] + Number(b.dataset.step))); save();
        if (b.dataset.card === 'next') { withFocus(function () { render(); }); } else paintLiveTarget();
        break;
      }
    }
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.matches('[data-a="typed"]')) typed(t);
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-a="typed"]')) { typed(t); var i = Number(t.dataset.i), st = S.sets[i]; if (st && !st.done && t.getAttribute('aria-invalid') !== 'true') t.value = t.dataset.k === 'reps' ? (st.reps == null ? '' : String(st.reps)) : weightValue(st.weight); }
    else if (t.matches('[data-a="rir"]')) {
      var j = Number(t.dataset.i); if (S.sets[j] && !S.sets[j].done) { S.sets[j].rir = t.value === '' ? null : Number(t.value); save(); }
    } else if (t.matches('[data-a="pain"]')) { var p = S.sets[Number(t.dataset.i)]; if (p && !p.done) { p.pain = t.checked; save(); } }
    else if (t.matches('[data-a="stop"]')) { var q = S.sets[Number(t.dataset.i)]; if (q && !q.done) { q.stop = t.checked ? 'intentional' : null; save(); } }
    else if (t.matches('[data-a="mode"]')) setMode(t.value);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-a="typed"]')) { e.preventDefault(); e.target.blur(); }
  });
  document.addEventListener('toggle', function (e) {
    var d = e.target; if (!d || !d.matches || !d.matches('details[data-why]')) return;
    if (d.dataset.why === 'live') S.view.why = d.open; else S.view.nextWhy = d.open;
    save();
  }, true);
  window.addEventListener('pageshow', function (e) { if (e.persisted) { S = load(); render(); } });

  render();
})();
