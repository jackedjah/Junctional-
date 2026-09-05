/* ══ FOB SYSTEMS :: GYM TRACKER ════════════════════════════════════════════
   Coach-facing workout terminal. One screen, one scroll, almost no navigation.

   PERSISTENCE, in three layers, because a gym has bad signal:
     1. memory        the live session object
     2. localStorage  written on every change, so a refresh, a crash or iOS
                      discarding the tab loses nothing
     3. Supabase      debounced upsert of the whole session body, plus a
                      flush on pagehide. 200 taps stay ONE session row.
   If the network is down the coach never notices: layer 2 keeps working and
   layer 3 retries. Nothing is ever blocked on a request.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API = '/api/gym-tracker';
  var LKEY = 'fob.gym.v1';
  var app = document.getElementById('app');

  var S = {
    clients: [], templates: [], client: null,
    routineDraft: null, routineEditId: null,
    session: null, items: [], name: 'Session', notes: '',
    program: null, programs: [], recent: [], progressData: null, periodizationPlans: [], periodizationDraft: null, trainingFoundation: {profile:null,measurements:[],healthDays:[],activitySegments:[]}, view: 'home', active: null,
    activeProgramId: null, activeDayIndex: null, fromScratch: false, saveCustomOffer: null,
    progressExerciseKey: null, progressSearch: '',
    started: 0, elapsed: 0, running: false,
    rev: 0, dirty: false, online: true, sheet: null,
    exMgr: { rows: [], q: '', filters: {}, offset: 0, hasMore: false, loading: false, request: 0 }
  };
  var saveT = null, tickT = null, restT = null, rest = 0, undo = null, undoT = null;
  var themeAudio = new Audio('/audio/fob-training-theme.mp3');
  themeAudio.loop = true; themeAudio.preload = 'none';

  /* ── tiny helpers ─────────────────────────────────────────────────── */
  function h(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function mmss(t) {
    t = Math.max(0, Math.round(t));
    var m = Math.floor(t / 60), s = t % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function hhmmss(t) {
    t = Math.max(0, Math.round(t));
    var hh = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (hh ? hh + ':' + (m < 10 ? '0' : '') : m + ':') + (m < 10 && hh ? m : '') + (hh ? '' : '') +
      (hh ? (m < 10 ? '' : '') : '') + (s < 10 ? '0' : '') + s;
  }
  function clock(t) {
    t = Math.max(0, Math.round(t));
    var hh = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(hh) + ':' + p(m) + ':' + p(s);
  }
  function todayLabel() {
    var d = new Date(), M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return M[d.getMonth()] + ' ' + d.getDate();
  }
  function uid() { return 'x' + Math.random().toString(36).slice(2, 9); }

  function uiIcon(name) {
    var base='viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
    if(name==='swap') return '<svg '+base+'><path d="M7 7h10l-2.6-2.6M17 17H7l2.6 2.6M18.5 6.5A7 7 0 0 1 19 14M5 10a7 7 0 0 0 .5 7.5"/></svg>';
    if(name==='history') return '<svg '+base+'><path d="M6 4.5h10.5A1.5 1.5 0 0 1 18 6v14H7.5A1.5 1.5 0 0 1 6 18.5z"/><path d="M6 4.5V19m3-10h6m-6 3h6m-6 3h4"/></svg>';
    if(name==='note') return '<svg '+base+'><path d="M5 4h10l4 4v12H5z"/><path d="M15 4v5h4M8 15l6.8-6.8 2 2L10 17l-3 .7z"/></svg>';
    if(name==='plus') return '<svg '+base+'><path d="M12 5v14M5 12h14"/></svg>';
    if(name==='play') return '<svg '+base+'><path d="M8 5l11 7-11 7z"/></svg>';
    if(name==='pause') return '<svg '+base+'><path d="M8 5v14M16 5v14"/></svg>';
    if(name==='camera') return '<svg '+base+'><circle cx="12" cy="12" r="4"/><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/></svg>';
    return '';
  }

  function initials(name){return String(name||'?').trim().split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x.charAt(0).toUpperCase();}).join('')||'?';}
  function avatarHTML(c){return c&&c.avatarUrl?'<img class="memberavatar__img" src="'+h(c.avatarUrl)+'" alt="">':'<span class="memberavatar__fallback">'+h(initials(c&&c.name))+'</span>';}
  function themeButton(){return '<button class="themeplay" data-act="theme" data-on="'+(themeAudio.paused?'0':'1')+'" aria-label="'+(themeAudio.paused?'Play':'Pause')+' FOB training theme">'+uiIcon(themeAudio.paused?'play':'pause')+'</button>';}
  function paintThemeButtons(){document.querySelectorAll('.themeplay').forEach(function(b){b.setAttribute('data-on',themeAudio.paused?'0':'1');b.setAttribute('aria-label',(themeAudio.paused?'Play':'Pause')+' FOB training theme');b.innerHTML=uiIcon(themeAudio.paused?'play':'pause');});}
  themeAudio.addEventListener('play',paintThemeButtons); themeAudio.addEventListener('pause',paintThemeButtons);
  function uploadToSigned(signedUrl,file){var fd=new FormData();fd.append('cacheControl','3600');fd.append('',file);return fetch(signedUrl,{method:'PUT',body:fd}).then(function(r){if(!r.ok)return r.text().then(function(t){throw new Error(t||'Upload failed')});return true;});}
  function squareAvatar(file){return new Promise(function(resolve,reject){var rd=new FileReader();rd.onerror=function(){reject(new Error('Could not read photo'));};rd.onload=function(){var im=new Image();im.onerror=function(){reject(new Error('Could not open photo'));};im.onload=function(){var side=Math.min(im.width,im.height),cv=document.createElement('canvas');cv.width=cv.height=512;cv.getContext('2d').drawImage(im,(im.width-side)/2,(im.height-side)/2,side,side,0,0,512,512);cv.toBlob(function(blob){blob?resolve(blob):reject(new Error('Could not prepare photo'));},'image/jpeg',0.88);};im.src=rd.result;};rd.readAsDataURL(file);});}

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function safeNum(v) { v = parseFloat(v); return isFinite(v) ? v : 0; }
  function workoutTone(name) {
    var n = String(name || '').toLowerCase();
    if (/^(full|total)$|full[\s-]*body|total[\s-]*body/.test(n)) return 'full';
    if (/lower|legs?|glute|hamstring|quad|calf/.test(n)) return 'lower';
    if (/upper|push|pull|chest|back|shoulder|arms?|biceps|triceps/.test(n)) return 'upper';
    return 'neutral';
  }
  function progressBookmarkKey() { return 'fob.gym.progress.bookmarks.' + (S.client ? S.client.id : 'none'); }
  function progressBookmarks() {
    try { var x = JSON.parse(localStorage.getItem(progressBookmarkKey()) || '[]'); return Array.isArray(x) ? x : []; }
    catch (e) { return []; }
  }
  function saveProgressBookmarks(v) {
    try { localStorage.setItem(progressBookmarkKey(), JSON.stringify(v || [])); } catch (e) {}
  }

  var SECTIONS = [
    { id:'warmup', label:'Warm-Up' },
    { id:'strength', label:'Main Strength' },
    { id:'core', label:'Core' },
    { id:'cooldown', label:'Cooldown / Stretch' }
  ];
  function defaultSectionForExercise(it) {
    var c = String(it && it.category || '').toLowerCase();
    if (c === 'warmup' || c === 'mobility') return 'warmup';
    if (c === 'stretch' || c === 'recovery') return 'cooldown';
    if (c === 'core') return 'core';
    return 'strength';
  }
  function inferSection(it) {
    if (it && it.section) return it.section;
    var categorySection = defaultSectionForExercise(it);
    if (categorySection !== 'strength') return categorySection;
    var n = String(it && it.name || '').toLowerCase();
    if (/plank|crunch|dead bug|pallof|hanging leg|russian twist|bird dog|copenhagen|woodchop|rotation|ab wheel/.test(n)) return 'core';
    return 'strength';
  }
  function normalizeSections(items) {
    (items || []).forEach(function (it) { if (!it.section) it.section = inferSection(it); });
    return items || [];
  }
  function cleanProgramItems(items) {
    return clone(items || []).map(function (it) {
      it.key = uid(); it.days = null; it.suggestion = null; it.open = false;
      it.section = inferSection(it);
      it.sets = (it.sets || []).map(function (st) { var x = clone(st); x.done = false; return x; });
      return it;
    });
  }

  function post(body) {
    return fetch(API, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) {
      if (r.status === 401) { location.reload(); return null; }
      S.online = true;
      return r.json();
    }).catch(function () { S.online = false; paintSync(); return null; });
  }

  /* ── local layer ──────────────────────────────────────────────────── */
  function localSave() {
    try {
      localStorage.setItem(LKEY, JSON.stringify({
        clientId: S.client && S.client.id, clientName: S.client && S.client.name,
        sessionId: S.session && S.session.id, items: S.items, name: S.name,
        notes: S.notes, elapsed: elapsed(), running: S.running, at: Date.now()
      }));
    } catch (e) { /* private mode or full quota must never break logging */ }
  }
  function localLoad() {
    try {
      var raw = localStorage.getItem(LKEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || !d.sessionId) return null;
      if (Date.now() - (d.at || 0) > 20 * 3600000) { localStorage.removeItem(LKEY); return null; }
      return d;
    } catch (e) { return null; }
  }

  function elapsed() { return S.elapsed + (S.running ? (Date.now() - S.started) / 1000 : 0); }

  function touch() {
    S.dirty = true;
    localSave();
    render();
    clearTimeout(saveT);
    saveT = setTimeout(flush, 900);
  }
  /* Persist without repainting. Used by the +/- keys so the UI never waits. */
  function quietSave() {
    S.dirty = true;
    localSave();
    paintSync();
    clearTimeout(saveT);
    saveT = setTimeout(flush, 900);
  }

  function flush() {
    if (!S.session || !S.dirty) return;
    S.rev++;
    post({ action: 'save', id: S.session.id, body: S.items, name: S.name,
           notes: S.notes, duration: Math.round(elapsed()), rev: S.rev })
      .then(function (j) { if (j && j.ok) { S.dirty = false; paintSync(); } });
  }
  function paintSync() {
    var el = document.getElementById('sync');
    if (el) { el.setAttribute('data-s', S.online ? 'on' : 'off');
      el.textContent = S.online ? (S.dirty ? 'Saving' : 'Saved') : 'Offline, saved on device'; }
  }

  /* ── progression / previous ───────────────────────────────────────── */
  function loadHistory(it) {
    if (!S.client) return;
    post({ action: 'history', memberId: S.client.id, exerciseId: it.exerciseId,
           name: it.name, target: it.target || null })
      .then(function (j) {
        if (!j || !j.ok) return;
        it.days = j.days || [];
        it.suggestion = j.suggestion || null;
        /* What they actually lifted last time beats any default table. Applied
           once, and never over a set the coach has already touched. */
        if (!it.seeded && it.days && it.days.length) {
          var lastSets = it.days[0].sets || [];
          var lw = null, lr = null;
          for (var q = 0; q < lastSets.length; q++) {
            if (lastSets[q].weight != null) { lw = Number(lastSets[q].weight); lr = lastSets[q].reps; break; }
          }
          if (lw != null) {
            it.sets.forEach(function (st) {
              if (st.done) return;
              if ('weight' in st) st.weight = lw;
              if ('reps' in st && lr != null) st.reps = lr;
            });
            it.seeded = true;
          }
        }
        render();
      });
  }
  function prevLine(it) {
    if (!it.days || !it.days.length) return null;
    var d = it.days[0], sets=d.sets||[];
    if(sets.length && sets.every(function(s){return s.weight!=null&&s.reps!=null&&+s.weight===+sets[0].weight&&+s.reps===+sets[0].reps;}))
      return sets.length+' sets: '+sets[0].weight+'lbs \u00d7 '+sets[0].reps+'reps';
    var parts = sets.map(function (s) {
      if (s.fm_distance != null) return s.fm_distance + '" / ' + mmss(s.fm_time_s || 0);
      if (s.weight != null && s.reps != null) return s.weight + 'lbs \u00d7 ' + s.reps+'reps';
      if (s.time_s != null) return mmss(s.time_s);
      if (s.reps != null) return s.reps + ' reps';
      return '\u2013';
    });
    return parts.join(' · ');
  }

  /* ── model ────────────────────────────────────────────────────────── */
  function blankSet(vars) {
    var s = { done: false };
    if (vars.indexOf('weight') >= 0) s.weight = 0;
    if (vars.indexOf('reps') >= 0) s.reps = 8;
    if (vars.indexOf('time') >= 0) s.time = 45;
    if (vars.indexOf('distance') >= 0) s.distance = 0;
    if (vars.indexOf('fm') >= 0) { s.fm = 60; s.fmTime = 60; }
    if (vars.indexOf('rpe') >= 0) s.rpe = 7;
    if (vars.indexOf('rir') >= 0) s.rir = 2;
    return s;
  }
  /* ══ STARTING PRESCRIPTION ══════════════════════════════════════════════
     Every exercise used to start at 0 lb and 8 reps, which meant tapping the
     weight up from zero on every single movement. These are conventional
     opening loads and rep ranges by equipment and role, chosen so the coach
     adjusts from something plausible rather than building from nothing.

     They are a STARTING POINT, not a prescription. Two things override them,
     in this order:
       1. the member's own last recorded session for that exercise, applied by
          loadHistory the moment it returns, because what they actually lifted
          beats any table
       2. the coach, always
     ═══════════════════════════════════════════════════════════════════════ */
  function openingSet(ex) {
    var name = String(ex.name || '').toLowerCase();
    var eq = String(ex.equipment || '').toLowerCase();
    var cat = String(ex.category || '').toLowerCase();
    var compound = !!ex.compound;

    if (cat === 'fob') return { weight: null, reps: null, lo: null, hi: null };
    if (cat === 'core' || cat === 'conditioning') return { weight: 0, reps: 12, lo: 10, hi: 20 };
    if (/deadlift|squat|hip thrust|leg press/.test(name) && eq === 'barbell') return { weight: 95, reps: 6, lo: 5, hi: 8 };
    if (eq === 'barbell') return compound ? { weight: 65, reps: 8, lo: 6, hi: 10 } : { weight: 30, reps: 10, lo: 8, hi: 12 };
    if (eq === 'machine') return compound ? { weight: 90, reps: 10, lo: 8, hi: 12 } : { weight: 50, reps: 12, lo: 10, hi: 15 };
    if (eq === 'dumbbell') return compound ? { weight: 25, reps: 10, lo: 8, hi: 12 } : { weight: 15, reps: 12, lo: 10, hi: 15 };
    if (eq === 'cable') return { weight: 30, reps: 12, lo: 10, hi: 15 };
    if (eq === 'kettlebell') return { weight: 35, reps: 10, lo: 8, hi: 12 };
    if (eq === 'bodyweight') return { weight: 0, reps: 10, lo: 8, hi: 15 };
    return { weight: 20, reps: 10, lo: 8, hi: 12 };
  }

  /* ══ PROGRAM EDITOR ════════════════════════════════════════════════════
     The old panel listed one "Edit <workout>" button per day and nothing
     else, so there was no way to ADD a workout to an existing program, and
     once you opened a workout there was no route back to the program. This is
     the workout manager that was missing.
     ═══════════════════════════════════════════════════════════════════════ */
  function progById(pid) {
    return S.programs.filter(function (x) { return String(x.dbId || x.id || '') === String(pid); })[0] || null;
  }

  /* saveProgram returns the row as { ok:true, program:{ id, ... } }, from both
     the primary store and the compatibility store. Reading j.id instead of
     j.program.id was the bug behind "I add a workout and it reverts": dbId
     never got set, so the NEXT save posted without an id and created a second
     program row rather than updating the first. One reader, used everywhere. */
  function programIdFrom(j) {
    if (!j) return null;
    return (j.program && j.program.id) || j.id || null;
  }

  function persistProgram(prog, msg) {
    return post({ action: 'saveProgram', id: prog.dbId || null, memberId: S.client.id,
                  name: prog.name, sub: prog.sub, body: prog })
      .then(function (j) {
        if (j && j.ok) {
          var nid = programIdFrom(j);
          if (nid) { prog.dbId = nid; prog.id = prog.id || nid; }
          if (msg) toast(msg);
        }
        else toast('Could not save. Your change is kept on this device.');
        return j;
      })
      .catch(function () { toast('Offline. Your change is kept on this device.'); });
  }

  function openProgramEditor(pid) {
    var p = progById(pid);
    if (!p) return;
    var days = p.days || [];
    var body = '<label class="fld"><span>Program name</span>'
      + '<input id="epname" value="' + h(p.name || 'Program') + '"></label>'
      + '<label class="fld"><span>Program note</span>'
      + '<input id="epsub" value="' + h(p.sub || '') + '"></label>'
      + '<button class="ghost" data-act="save-program-meta" data-pid="' + h(pid) + '">Save program details</button>'
      + '<div class="wkhead"><b>Workouts</b><span>' + days.length + '</span></div>'
      + '<div class="wklist">'
      + days.map(function (d, i) {
          return '<div class="wkrow">'
            + '<span class="wkrow__n">' + (i + 1) + '</span>'
            + '<input class="wkrow__name" id="wn_' + i + '" value="' + h(d.name || ('Workout ' + (i + 1))) + '">'
            + '<button class="wkrow__ic" data-act="rename-workout" data-day="' + i + '" aria-label="Save name">\u2713</button>'
            + '<button class="wkrow__ic" data-act="move-workout" data-day="' + i + '" data-dir="up" aria-label="Move up">\u2191</button>'
            + '<button class="wkrow__ic" data-act="move-workout" data-day="' + i + '" data-dir="down" aria-label="Move down">\u2193</button>'
            + '<button class="wkrow__ic warn" data-act="remove-workout" data-day="' + i + '" aria-label="Remove">\u00d7</button>'
            + '<div class="wkrow__foot"><span>' + ((d.items || []).length) + ' exercises</span>'
            + '<button class="chip" data-act="edit-program-day" data-pid="' + h(pid) + '" data-day="' + i + '">Edit exercises</button></div>'
            + '</div>';
        }).join('')
      + '</div>'
      + '<button class="primary" data-act="add-workout">+ Add workout</button>';
    openSheet('Edit ' + (p.name || 'program'), body, 'editor');
  }

  function addExercise(ex, atIndex, explicitSection) {
    var vars = (ex.vars && ex.vars.length) ? ex.vars : ['weight', 'reps'];
    var it = {
      key: uid(), exerciseId: ex.id, name: ex.name, vars: vars, category: ex.category || null,
      media: ex.media_url || null, note: '', circuit: null, section: explicitSection || libState.addSection || defaultSectionForExercise(ex),
      sets: [blankSet(vars), blankSet(vars), blankSet(vars)],
      target: { lo: 8, hi: 10 }, days: null, suggestion: null, seeded: false
    };
    var open = openingSet(ex);
    if (open.weight != null) {
      it.sets.forEach(function (st) {
        if ('weight' in st) st.weight = open.weight;
        if ('reps' in st) st.reps = open.reps;
      });
      it.target = { lo: open.lo, hi: open.hi };
    }
    if (atIndex == null) S.items.push(it); else S.items.splice(atIndex, 0, it);
    loadHistory(it);
    touch();
    return it;
  }

  /* The active exercise is simply the first with work left. No state to keep
     in sync, so it can never disagree with what is on screen. */
  function activeKey() {
    for (var i = 0; i < S.items.length; i++) {
      var it = S.items[i];
      for (var j = 0; j < it.sets.length; j++) if (!it.sets[j].done) return it.key;
    }
    return null;
  }

  function progress() {
    var tot = 0, done = 0;
    S.items.forEach(function (it) {
      it.sets.forEach(function (s) { tot++; if (s.done) done++; });
    });
    return tot ? Math.round(done / tot * 100) : 0;
  }

  /* ── render ───────────────────────────────────────────────────────── */
  /* The unit used to sit INSIDE the stepper, between the value and the plus
     key. On a 393px screen that left the reps input about 24px wide, which is
     why reps were unusable and why "190" would not fit. The unit is now a
     caption underneath, and the control is a fixed 3-column grid so the value
     always gets the middle. */
  function stepper(it, si, key, unit, step) {
    var v = it.sets[si][key];
    var show = (key === 'time' || key === 'fmTime') ? mmss(v) : v;
    var base = ' data-k="' + it.key + '" data-i="' + si + '" data-f="' + key + '"';
    return '<span class="fieldwrap"><span class="stepper">'
      + '<button type="button" data-act="step"' + base + ' data-d="-' + step + '" aria-label="Decrease">\u2212</button>'
      + '<input class="val" inputmode="decimal" enterkeyhint="done" data-act="typed"' + base
      + ' id="f_' + it.key + '_' + si + '_' + key + '" value="' + show + '">'
      + '<button type="button" data-act="step"' + base + ' data-d="' + step + '" aria-label="Increase">+</button>'
      + '</span>' + (unit ? '<span class="unit">' + unit + '</span>' : '<span class="unit">&nbsp;</span>') + '</span>';
  }

  function setRow(it, si) {
    var s = it.sets[si], cells = '';
    if (it.vars.indexOf('weight') >= 0) cells += stepper(it, si, 'weight', 'lb', it.wStep || 5);
    if (it.vars.indexOf('reps') >= 0) cells += stepper(it, si, 'reps', 'reps', 1);
    if (it.vars.indexOf('time') >= 0 && it.vars.indexOf('fm') < 0) cells += stepper(it, si, 'time', 'time', 15);
    if (it.vars.indexOf('fm') >= 0) {
      cells += stepper(it, si, 'fm', 'FM in', 6);
      cells += stepper(it, si, 'fmTime', 'interval', 15);
    }
    if (it.vars.indexOf('distance') >= 0) cells += stepper(it, si, 'distance', it.category === 'fob' ? 'FOB distance · in' : 'm', it.category === 'fob' ? 12 : 10);
    return '<div class="setwrap" data-k="' + it.key + '" data-i="' + si + '">'
      + '<button type="button" class="setdelete" data-act="delset" data-k="' + it.key + '" data-i="' + si + '" aria-label="Remove set">×</button>'
      + '<div class="set"><span class="set__n">' + (si + 1) + '</span>'
      + '<span class="fields">' + cells + '</span>'
      + '<button type="button" class="tick" data-act="tick" data-k="' + it.key + '" data-i="' + si
      + '" data-on="' + (s.done ? '1' : '0') + '" aria-label="Complete set"></button></div></div>';
  }

  /* The card shows the movement, not a glyph. Three levels, best first:
     a stored poster frame, then the clip's own first frame via a muted
     metadata-only video, then the play triangle when there is no video at
     all. The middle case covers clips attached before posters existed. */
  function thumbInner(it) {
    if (it.poster) return '<img class="thumbimg" src="' + h(it.poster) + '" alt="" loading="lazy" decoding="async">';
    if (it.media) return '<video class="thumbimg" src="' + h(it.media) + '#t=0.4" muted playsinline '
      + 'preload="metadata" tabindex="-1" aria-hidden="true"></video>';
    return '\u25B6';
  }

  function exCard(it) {
    var prev = prevLine(it);
    var allDone = it.sets.length && it.sets.every(function (s) { return s.done; });
    var open = it.open === true;                      /* collapsed by default */
    var doneN = it.sets.filter(function (s) { return s.done; }).length;
    /* Collapsed cards still say what happened, which is what the coach scans. */
    var summary = it.sets.filter(function (s) { return s.done; }).map(function (s) {
      if (s.fm != null) return s.fm + '\u2033/' + mmss(s.fmTime || 0);
      if (s.weight != null && s.reps != null) return s.weight + '\u00d7' + s.reps;
      if (s.time != null) return mmss(s.time);
      return s.reps != null ? s.reps : '\u2013';
    }).join('   ') || 'Not started';
    var meta = [it.muscle, it.equipment].filter(Boolean).join(' \u00b7 ')
      || (it.vars.join(' + '));
    return '<article class="ex" data-key="' + it.key + '" data-done="' + (allDone ? '1' : '0') + '"'
      + ' data-open="' + (open ? '1' : '0') + '"'
      + ' data-active="' + (it.key === S.active && open ? '1' : '0') + '">'
      + '<div class="ex__h" data-act="collapse" data-k="' + it.key + '">'
      + '<span class="grip" data-grip="' + it.key + '" aria-label="Drag to reorder" role="button"><s></s></span>'
      + '<button type="button" class="thumb" data-has="' + (it.media ? '1' : '0')
      + '" data-act="video" data-k="' + it.key + '" aria-label="Reference video">' + thumbInner(it) + '</button>'
      + '<span class="ex__n"><b>' + h(it.name) + '</b><span>'
      + h(meta) + ' \u00b7 ' + doneN + '/' + it.sets.length + ' sets'
      + (it.note ? ' \u00b7 ' + h(it.note) : '') + '</span></span>'
      + '<span class="ex__caret" aria-hidden="true"></span>'
      + '<button type="button" class="ex__more" data-act="menu" data-k="' + it.key + '" aria-label="Options">\u22EF</button>'
      + '</div>'
      + '<div class="ex__sum">' + h(summary) + '</div>'
      + (prev
        ? '<div class="prev"><em>Last \u00b7 ' + h(it.days[0].date) + '</em><p>' + h(prev) + '</p>'
          + (it.suggestion ? '<p class="sug">' + h(it.suggestion.text) + '</p>' : '') + '</div>'
        : '')
      + '<div class="sets">' + it.sets.map(function (_, i) { return setRow(it, i); }).join('') + '</div>'
      + '<div class="ex__f">'
      + '<button type="button" class="chip icochip" data-act="addset" data-k="' + it.key + '" aria-label="Add set" title="Add set">' + uiIcon('plus') + '</button>'
      + '<button type="button" class="chip icochip" data-act="history" data-k="' + it.key + '" aria-label="History" title="History">' + uiIcon('history') + '</button>'
      + '<button type="button" class="chip icochip" data-act="swap" data-k="' + it.key + '" aria-label="Swap exercise" title="Swap exercise">' + uiIcon('swap') + '</button>'
      + '<button type="button" class="chip icochip" data-act="note" data-k="' + it.key + '" aria-label="Exercise note" title="Exercise note">' + uiIcon('note') + '</button>'
      + '</div></article>';
  }

  function render() {
    if (!S.client) { renderPick(); return; }
    if (S.view === 'home') { renderHome(); return; }
    if (S.view === 'progbuild') { renderProgramBuilder(); return; }
    if (S.view === 'presets') { renderPresets(); return; }
    if (S.view === 'preview') { renderPreview(presetById(S.previewId)); return; }
    if (S.view === 'progress') { renderProgress(); return; }
    if (S.view === 'periodization') { renderCoachPeriodization(); return; }
    if (S.view === 'training-foundation') { renderCoachTrainingFoundation(); return; }
    if (S.view === 'routines') { renderRoutines(); return; }
    if (S.view === 'routine-builder') { renderRoutineBuilder(); return; }
    if (S.view === 'exercise-manager') { renderExerciseManager(); return; }
    var pct = progress();
    S.active = activeKey();
    var tone = workoutTone(S.name);
    var body = ''
      + '<header class="hd workout-hd tone-' + tone + '"><div class="hd__top">'
      + '<button class="client" data-act="clients"><b>' + h(S.client.name) + '</b><i>\u25BE</i></button>'
      + '<button class="hd__btn" data-act="rename">Edit</button>'
      + '<button class="hd__btn" data-act="timer" data-on="' + (S.running ? '1' : '0') + '">'
      + (S.running ? 'Pause' : 'Start') + '</button>'
      + '</div>'
      + '<div style="margin-top:9px"><div class="backbar"><button class="back" data-act="home">Member home</button><span class="backbar__t">Member home</span></div></div>'
      + '<div class="hd__meta"><h1>' + h(S.name) + '</h1><time>' + todayLabel() + '</time></div>'
      + '<div class="hd__bar"><span class="clock" data-run="' + (S.running ? '1' : '0') + '">'
      + clock(elapsed()) + '</span>'
      + '<span class="prog"><span style="width:' + pct + '%"></span></span>'
      + '<span class="pct">' + pct + '%</span></div>'
      + '<div style="margin-top:7px"><span class="sync" id="sync">Saved</span></div>'
      + '</header><main class="workout tone-' + tone + '">';

    normalizeSections(S.items);
    SECTIONS.forEach(function (sec, sx) {
      var list = S.items.filter(function (x) { return inferSection(x) === sec.id; });
      body += '<section class="worksec"><div class="worksec__head"><span>0' + (sx + 1) + '</span><b>' + h(sec.label) + '</b>'
        + '<button type="button" data-act="add-section" data-section="' + sec.id + '">+ Add</button></div>';
      if (!list.length) body += '<div class="worksec__empty">No exercises yet</div>';
      else {
        var i = 0;
        while (i < list.length) {
          var it = list[i];
          if (it.circuit) {
            var group = [], cid = it.circuit.id;
            while (i < list.length && list[i].circuit && list[i].circuit.id === cid) { group.push(list[i]); i++; }
            body += '<section class="circ"><div class="circ__h"><b>' + h(it.circuit.label || 'Circuit') + '</b><span>'
              + (it.circuit.rounds || group.length) + ' rounds \u00b7 rest ' + mmss(it.circuit.rest || 60) + '</span>'
              + '<button class="chip" data-act="ungroup" data-c="' + h(cid) + '">Ungroup</button></div>'
              + group.map(exCard).join('') + '</section>';
          } else { body += exCard(it); i++; }
        }
      }
      body += '</section>';
    });
    body += '</main>'
      + '<div class="rest' + (rest > 0 ? ' open' : '') + '" id="rest"><b>' + mmss(rest) + '</b>'
      + '<button data-act="rest15">+15s</button><button data-act="restskip">Skip</button></div>'
      + '<div class="bar">'
      + '<button data-act="library">+ Exercise</button>'
      + '<button data-act="tools">Tools</button>'
      + '<button class="go" data-act="finish">Finish</button>'
      + '</div>'
      + '<div class="veil" id="veil" data-act="closesheet"></div>'
      + '<div class="sheet" id="sheet"><div class="sheet__h"><b id="sheetT"></b>'
      + '<button data-act="closesheet" aria-label="Close">×</button></div>'
      + '<div class="sheet__b" id="sheetB"></div></div>'
      + '<div class="toast" id="toast"></div>';
    app.innerHTML = body;
    paintSync();
    if (S.sheet) reopenSheet();
  }

  function renderPick() {
    app.innerHTML = '<header class="hd"><div class="hd__meta"><h1>Gym Tracker</h1><time>' + todayLabel() + '</time></div></header>'
      + '<main class="membergate"><div class="membergate__intro"><span>Coach Access</span><h2>Select Member</h2>'
      + '<p>Open a member\'s programs, live workouts and training history.</p></div>'
      + '<div class="membergate__select"><input class="find" id="memberq" placeholder="Search members" autocomplete="off" autocorrect="off">'
      + '<div id="memberhits">' + S.clients.map(function (c) {
        return '<button class="membercard" data-act="pick" data-id="' + h(c.id) + '"><span><b>' + h(c.name) + '</b>'
          + '<small>Confirmed member</small></span><i>Open</i></button>';
      }).join('') + '</div></div>'
      + (S.clients.length ? '' : '<div class="empty">No active members found in the ledger.</div>') + '</main>';
  }

  /* ── sheets ───────────────────────────────────────────────────────── */
  function ensureSheetHost() {
    if (document.getElementById('sheet') && document.getElementById('veil')) return;
    var host = document.createElement('div');
    host.id = 'gym-sheet-host';
    host.innerHTML = '<div class="veil" id="veil" data-act="closesheet"></div>'
      + '<div class="sheet" id="sheet"><div class="sheet__h"><b id="sheetT"></b>'
      + '<button data-act="closesheet" aria-label="Close">×</button></div>'
      + '<div class="sheet__b" id="sheetB"></div></div>';
    document.body.appendChild(host);
  }
  function openSheet(title, html, kind) {
    ensureSheetHost();
    S.sheet = { title: title, html: html, kind: kind };
    document.getElementById('sheetT').textContent = title;
    document.getElementById('sheetB').innerHTML = html;
    document.getElementById('veil').classList.add('open');
    document.getElementById('sheet').classList.add('open');
    var f = document.querySelector('#sheetB .find');
    if (f) setTimeout(function () { f.focus(); }, 60);
  }
  function reopenSheet() {
    if (!S.sheet) return;
    document.getElementById('sheetT').textContent = S.sheet.title;
    document.getElementById('sheetB').innerHTML = S.sheet.html;
    document.getElementById('veil').classList.add('open');
    document.getElementById('sheet').classList.add('open');
  }
  function closeSheet() {
    S.sheet = null;
    var v = document.getElementById('veil'), s = document.getElementById('sheet');
    if (v) v.classList.remove('open');
    if (s) s.classList.remove('open');
  }

  var libState = { q: '', filters: {}, swapKey: null, addSection: null, routine: false, returnEditor: false, offset: 0, pageSize: 100, hasMore: false };

  function sectionLabel(id) {
    var sec = SECTIONS.filter(function (x) { return x.id === id; })[0];
    return sec ? sec.label : 'Workout';
  }

  
  /* The twelve movements that make up most programming. Shown only when the
     search box is empty, so they are a shortcut and never in the way. */
  var COMMON = ['Barbell Bench Press','Back Squat','Romanian Deadlift','Lat Pulldown',
    'Seated Cable Row','Overhead Press','Leg Press','Bulgarian Split Squat',
    'Incline Dumbbell Press','Lying Leg Curl','Cable Triceps Pressdown','Dumbbell Biceps Curl'];
  function commonStrip() {
    if (libState.q || hasLibraryFilters(libState.filters)) return '';
    return '<div class="commonhead">Common</div><div class="common">'
      + COMMON.map(function (n) {
          return '<button class="commonchip" data-act="quickpick" data-n="' + h(n) + '">' + h(n) + '</button>';
        }).join('') + '</div>';
  }
  var LIB_CATEGORIES = [
    ['category','warmup','Warm-Up'], ['category','stretch','Stretch'],
    ['category','push','Push'], ['category','pull','Pull'],
    ['category','squat','Squat'], ['category','hinge','Hinge'],
    ['category','core','Core'], ['category','isolation','Isolation'],
    ['category','carry','Carry'], ['category','conditioning','Conditioning'],
    ['category','plyometric','Plyometric'], ['category','balance','Balance'],
    ['category','fob','FOB']
  ];
  var LIB_WARMUP_AREAS = [
    ['region','shoulders','Shoulders / Cuff'], ['region','upper-back','Upper Back / Scapula'],
    ['region','chest','Chest'], ['region','arms','Arms / Elbows'],
    ['region','wrists','Wrists / Forearms'], ['region','spine','Spine / T-Spine'],
    ['region','core','Core'], ['region','hips','Hips'], ['region','glutes','Glutes'],
    ['region','groin','Groin / Adductors'], ['region','quads-knees','Quads / Knees'],
    ['region','hamstrings','Hamstrings'], ['region','calves-ankles','Calves / Ankles'],
    ['region','full-body','Full Body']
  ];
  var LIB_STRETCH_AREAS = [
    ['region','shoulders','Shoulders'], ['region','chest-upper-back','Chest / Upper Back'],
    ['region','arms-wrists','Arms / Wrists'], ['region','core-spine','Core / Spine'],
    ['region','hips-glutes-groin','Hips / Glutes / Groin'],
    ['region','quads-hamstrings','Quads / Hamstrings'],
    ['region','calves-ankles','Calves / Ankles']
  ];
  var LIB_GENERAL_REGIONS = [
    ['region','upper','Upper'], ['region','lower','Lower'],
    ['region','core','Core'], ['region','full','Full Body']
  ];
  var LIB_EQUIPMENT = [
    ['equipment','barbell','Barbell'], ['equipment','dumbbell','Dumbbell'],
    ['equipment','cable','Cable'], ['equipment','machine','Machine'],
    ['equipment','bodyweight','Bodyweight'], ['equipment','band','Band'],
    ['equipment','kettlebell','Kettlebell'], ['equipment','foam roller','Foam Roller'],
    ['equipment','medicine ball','Medicine Ball'], ['equipment','jump rope','Jump Rope'],
    ['equipment','stick','PVC / Stick'], ['equipment','massage ball','Massage Ball'],
    ['equipment','specialty','Specialty']
  ];
  var LIB_TRAITS = [
    ['unilateral','1','Unilateral'], ['compound','1','Compound'], ['custom','1','My Custom']
  ];

  function hasLibraryFilters(filters) {
    return Object.keys(filters || {}).some(function (k) { return !!filters[k]; });
  }
  function toggleLibraryFilter(filters, field, value) {
    var current = String(filters[field] || '');
    var next = current === value ? null : value;
    if (field === 'category' && current !== String(next || '')) filters.region = null;
    filters[field] = next;
  }
  function filterGroup(label, rows, filters, action) {
    return '<div class="filtergroup"><span class="filtergroup__label">' + h(label) + '</span><div class="filters">'
      + rows.map(function (f) {
        var on = String(filters[f[0]] || '') === f[1];
        return '<button data-act="' + action + '" data-f="' + f[0] + '" data-v="' + f[1]
          + '" data-on="' + (on ? '1' : '0') + '">' + h(f[2]) + '</button>';
      }).join('') + '</div></div>';
  }
  function exerciseFilterPanel(filters, action, clearAction) {
    filters = filters || {};
    var category = String(filters.category || '');
    var areaRows = category === 'warmup' ? LIB_WARMUP_AREAS
      : category === 'stretch' ? LIB_STRETCH_AREAS : LIB_GENERAL_REGIONS;
    var areaLabel = category === 'warmup' ? 'Warm-Up Muscle Group'
      : category === 'stretch' ? 'Stretch Muscle Group' : 'Body Region';
    return '<div class="filterstack">' + filterGroup('Movement Type', LIB_CATEGORIES, filters, action)
      + (category === 'warmup' || category === 'stretch'
        ? '<div class="filterstage">Choose a ' + (category === 'warmup' ? 'warm-up' : 'stretch') + ' area</div>' : '')
      + filterGroup(areaLabel, areaRows, filters, action)
      + '<details class="filtermore"><summary>Equipment & traits</summary>'
      + filterGroup('Equipment', LIB_EQUIPMENT, filters, action)
      + filterGroup('Traits', LIB_TRAITS, filters, action) + '</details>'
      + (hasLibraryFilters(filters) ? '<button class="filterclear" data-act="' + clearAction + '">Clear filters</button>' : '')
      + '</div>';
  }

function libraryHTML(rows) {
    var context = libState.routine
      ? '<div class="libcontext"><span>ADDING TO</span><b>' + h(sectionLabel(libState.addSection)) + '</b><small>Every exercise in the library is available here.</small></div>'
      : '';
    return context
      + '<input class="find" id="libq" placeholder="Search all exercises" autocomplete="off" '
      + 'autocorrect="off" autocapitalize="none" spellcheck="false" value="' + h(libState.q) + '">'
      + exerciseFilterPanel(libState.filters, 'filter', 'filter-clear')
      + commonStrip() + '<div id="libhits">' + (rows ? hits(rows) : '<div class="empty">Searching\u2026</div>') + '</div>'
      + (rows && libState.hasMore ? '<button class="ghost libmore" data-act="lib-more">Load more exercises</button>' : '')
      + '<button class="ghost" data-act="newex">+ Create exercise</button>';
  }
  function hits(rows) {
    if (!rows.length) return '<div class="empty">Nothing matched. Try fewer words, or create it.</div>';
    return rows.map(function (e) {
      var dest = libState.addSection ? ' data-section="' + h(libState.addSection) + '"' : '';
      var meta = [e.category, e.region, e.equipment].filter(Boolean).map(function (x) {
        return String(x).replace(/-/g, ' ');
      }).join(' \u00b7 ');
      return '<button class="hit" data-act="choose" data-id="' + h(e.id) + '"' + dest + '>'
        + '<b>' + h(e.name) + '</b><span>' + h(meta) + '</span></button>';
    }).join('');
  }
  var libRows = [];
  function libSearch(append) {
    if (!append) { libState.offset = 0; libRows = []; }
    var body = { action: 'search', q: libState.q, limit: libState.pageSize, offset: libState.offset };
    ['category','region','equipment'].forEach(function (k) {
      if (libState.filters[k]) body[k] = libState.filters[k];
    });
    if (libState.filters.unilateral) body.unilateral = true;
    if (libState.filters.compound) body.compound = true;
    if (libState.filters.custom) body.custom = true;
    post(body).then(function (j) {
      var incoming = (j && j.exercises) || [];
      if (append) {
        var seen = {};
        libRows.forEach(function (x) { seen[x.id] = true; });
        incoming.forEach(function (x) { if (!seen[x.id]) { libRows.push(x); seen[x.id] = true; } });
      } else libRows = incoming;
      libState.hasMore = !!(j && j.hasMore);
      if (append) libState.offset += incoming.length;
      else libState.offset = incoming.length;
      var t = document.getElementById('libhits');
      if (t) t.innerHTML = hits(libRows);
      if (S.sheet) {
        S.sheet.html = libraryHTML(libRows);
        var sb = document.getElementById('sheetB');
        if (sb) {
          var active = document.activeElement && document.activeElement.id === 'libq';
          var pos = active ? document.activeElement.selectionStart : null;
          sb.innerHTML = S.sheet.html;
          if (active) {
            var qel = document.getElementById('libq');
            if (qel) { qel.focus(); try { qel.setSelectionRange(pos, pos); } catch (e) {} }
          }
        }
      }
    });
  }
  function openLibrary(swapKey, section, returnEditor) {
    libState.routine = false;
    libState.swapKey = swapKey || null;
    libState.addSection = section || null;
    libState.returnEditor = !!returnEditor;
    libState.offset = 0; libState.hasMore = false;
    openSheet(swapKey ? 'Swap exercise' : ('Add to ' + sectionLabel(section || 'strength')), libraryHTML(null), 'lib');
    libSearch(false);
  }
  function openRoutineLibrary(section) {
    /* Routine building must always begin from the full exercise universe.
       Old filters from a live workout should never make a section look empty. */
    libState.routine = true; libState.swapKey = null; libState.addSection = section || 'strength'; libState.returnEditor = false;
    libState.q = ''; libState.filters = {}; libState.offset = 0; libState.hasMore = false; libRows = [];
    openSheet('Add to ' + sectionLabel(libState.addSection), libraryHTML(null), 'lib');
    libSearch(false);
  }

/* One video panel that handles the three cases a coach actually has: a direct
     file, a YouTube or Vimeo link, or nothing yet. */
  function videoBody(it) {
    var u = it.media || '';
    var player = '';
    if (u) {
      var yt = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
      var vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (yt) player = '<iframe class="vidframe" src="https://www.youtube-nocookie.com/embed/' + h(yt[1])
        + '" allowfullscreen loading="lazy" referrerpolicy="no-referrer"></iframe>';
      else if (vm) player = '<iframe class="vidframe" src="https://player.vimeo.com/video/' + h(vm[1])
        + '" allowfullscreen loading="lazy" referrerpolicy="no-referrer"></iframe>';
      else player = '<video class="vid" controls playsinline preload="metadata" src="' + h(u) + '"></video>';
    }
    return (player || '<div class="empty"><b>No reference video</b>'
        + 'Paste a link below. YouTube, Vimeo or a direct file all work.</div>')
      + '<label class="fld" style="margin-top:14px"><span>Video link</span>'
      + '<input id="vidurl" inputmode="url" placeholder="https://\u2026" value="' + h(u) + '"></label>'
      + '<button class="primary" data-act="savevid" data-k="' + it.key + '">'
      + (u ? 'Update link' : 'Attach link') + '</button>'
      + '<input id="vidfile" type="file" accept="video/*" hidden>'
      /* A second input carrying capture, so Record goes straight to the
         camera instead of the photo library. iOS records .mov, which the
         bucket now accepts. */
      + '<input id="vidcam" type="file" accept="video/*" capture="environment" hidden>'
      + '<button class="primary" data-act="recordvid" data-k="' + it.key + '" data-id="' + (it.exerciseId || '') + '">Record now</button>' + '<button class="ghost" data-act="uploadvid" data-k="' + it.key + '">Upload video</button>'
      + (u ? '<button class="ghost" data-act="clearvid" data-k="' + it.key + '">Remove video</button>' : '')
      + '<p class="vidnote">Choose a video from Photos or Files, or paste a link. Saved to the exercise for every client and future session.</p>';
  }

  function toast(msg, actLabel, fn) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = h(msg) + (actLabel ? ' <button data-act="undo">' + h(actLabel) + '</button>' : '');
    t.classList.add('open');
    undo = fn || null;
    clearTimeout(undoT);
    undoT = setTimeout(function () { t.classList.remove('open'); undo = null; }, 6000);
  }

  function find(k) { for (var i = 0; i < S.items.length; i++) if (S.items[i].key === k) return S.items[i]; return null; }

  function routineFind(k) {
    var arr = (S.routineDraft && S.routineDraft.items) || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].key === k) return arr[i];
    return null;
  }
  /* When Routine Creator is being used to edit a program day, every structural
     change is mirrored into that day immediately. This removes the old fragile
     "only commit when Back is pressed" behavior and makes Add / Move / Circuit /
     Delete truly WYSIWYG. */
  function syncRoutineToBuilderDay() {
    if (S.builderDay == null || !S.builder || !S.routineDraft) return;
    var day = S.builder.days && S.builder.days[S.builderDay];
    if (!day) return;
    var rn = document.getElementById('routineName');
    day.name = ((rn && rn.value) || S.routineDraft.name || day.name || ('Day ' + (S.builderDay + 1))).trim();
    day.items = clone(S.routineDraft.items || []);
    saveDraft();
  }

  function groupKey(it) { return it && it.circuit && it.circuit.id ? 'c:' + it.circuit.id : 'i:' + (it && it.key || ''); }
  function sectionGroups(items, section) {
    var list = (items || []).filter(function (x) { return inferSection(x) === section; });
    var groups = [], seen = {};
    list.forEach(function (x) {
      var k = groupKey(x);
      if (!seen[k]) { seen[k] = { key:k, items:[] }; groups.push(seen[k]); }
      seen[k].items.push(x);
    });
    return groups;
  }
  function replaceSectionOrder(items, section, ordered) {
    var q = ordered.slice(), out = [];
    (items || []).forEach(function (x) { out.push(inferSection(x) === section ? q.shift() : x); });
    return out;
  }
  function moveGrouped(items, key, dir) {
    var cur = (items || []).filter(function (x) { return x.key === key; })[0];
    if (!cur) return items;
    var sec = inferSection(cur), groups = sectionGroups(items, sec), gi = -1;
    groups.forEach(function (g, i) { if (g.items.some(function (x) { return x.key === key; })) gi = i; });
    var to = gi + dir;
    if (gi < 0 || to < 0 || to >= groups.length) return items;
    var tmp = groups[gi]; groups[gi] = groups[to]; groups[to] = tmp;
    var ordered = [];
    groups.forEach(function (g) { ordered = ordered.concat(g.items); });
    return replaceSectionOrder(items, sec, ordered);
  }
  function clearCircuitIds(items, ids) {
    if (!ids.length) return;
    (items || []).forEach(function (x) {
      if (x.circuit && ids.indexOf(x.circuit.id) >= 0) x.circuit = null;
    });
  }
  function applyCircuit(items, keys, label, rounds, rest) {
    keys = (keys || []).filter(Boolean);
    if (keys.length < 2) return false;
    var selected = (items || []).filter(function (x) { return keys.indexOf(x.key) >= 0; });
    if (selected.length < 2) return false;
    var sec = inferSection(selected[0]);
    if (!selected.every(function (x) { return inferSection(x) === sec; })) return false;
    var oldIds = [];
    selected.forEach(function (x) { if (x.circuit && oldIds.indexOf(x.circuit.id) < 0) oldIds.push(x.circuit.id); });
    clearCircuitIds(items, oldIds);
    var cid = uid(), c = { id:cid, label:label || 'Circuit', rounds:Math.max(1, parseInt(rounds,10)||3), rest:Math.max(0, parseInt(rest,10)||60) };
    selected.forEach(function (x) { x.circuit = c; });
    /* Circuits render as one visual block only when their members are adjacent.
       Rebuild this section so the selected exercises sit together in their
       existing relative order, without disturbing other workout sections. */
    var secItems = (items || []).filter(function (x) { return inferSection(x) === sec; });
    var first = secItems.findIndex(function (x) { return keys.indexOf(x.key) >= 0; });
    var picked = secItems.filter(function (x) { return keys.indexOf(x.key) >= 0; });
    var restItems = secItems.filter(function (x) { return keys.indexOf(x.key) < 0; });
    first = Math.max(0, Math.min(first, restItems.length));
    restItems.splice.apply(restItems, [first, 0].concat(picked));
    var rebuilt = replaceSectionOrder(items, sec, restItems);
    items.splice.apply(items, [0, items.length].concat(rebuilt));
    return true;
  }
  function circuitEditorHTML(items, anchorKey) {
    var anchor = (items || []).filter(function (x) { return x.key === anchorKey; })[0];
    if (!anchor) return '';
    var sec = inferSection(anchor), existing = anchor.circuit && anchor.circuit.id;
    var peers = (items || []).filter(function (x) { return inferSection(x) === sec; });
    var chosen = {};
    peers.forEach(function (x) { if (x.key === anchorKey || (existing && x.circuit && x.circuit.id === existing)) chosen[x.key] = true; });
    return '<div class="circuitbuilder"><p>Select 2 or more exercises from <b>' + h(sectionLabel(sec)) + '</b>.</p>'
      + '<div class="circuitbuilder__list">' + peers.map(function (x) {
        return '<label><input type="checkbox" data-circuit-pick="1" value="' + h(x.key) + '"' + (chosen[x.key] ? ' checked' : '') + '><span>' + h(x.name) + '</span></label>';
      }).join('') + '</div>'
      + '<div class="circuitbuilder__meta"><label><span>Rounds</span><input id="circuitRounds" type="number" min="1" value="' + h(anchor.circuit && anchor.circuit.rounds || 3) + '"></label>'
      + '<label><span>Rest (sec)</span><input id="circuitRest" type="number" min="0" step="15" value="' + h(anchor.circuit && anchor.circuit.rest || 60) + '"></label></div>'
      + '<div class="circuitbuilder__actions"><button class="primary" data-act="circuit-save" data-k="' + h(anchorKey) + '">Save circuit</button>'
      + (existing ? '<button class="ghost" data-act="circuit-remove" data-c="' + h(existing) + '">Remove circuit</button>' : '') + '</div></div>';
  }

  /* ── one delegated listener for the whole app ─────────────────────── */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-act]');
    if (!b) return;
    var a = b.getAttribute('data-act');
    var it = b.getAttribute('data-k') ? find(b.getAttribute('data-k')) : null;

    if (a === 'pick') {
      var id = b.getAttribute('data-id');
      var c = S.clients.filter(function (x) { return x.id === id; })[0];
      if (c) openClient(c);
      return;
    }
    if (a === 'clients') {
      openSheet('Client', '<input class="find" id="cq" placeholder="Search clients" autocomplete="off">'
        + '<div id="chits">' + S.clients.map(function (c) {
          return '<button class="hit" data-act="pick" data-id="' + h(c.id) + '"><b>'
            + h(c.name) + '</b><span>Open</span></button>'; }).join('') + '</div>', 'clients');
      return;
    }
    if (a === 'member-picker') {
      flush(); closeSheet(); S.client = null; S.session = null; S.items = []; S.view = 'pick';
      S.activeProgramId = null; S.activeDayIndex = null; S.fromScratch = false; renderPick(); return;
    }
    if (a === 'periodization') { S.periodizationDraft=null; S.view='periodization'; render(); return; }
    if (a === 'period-back') { S.view='home'; render(); return; }
    if (a === 'period-def') { var term=b.getAttribute('data-term'),def=COACH_PERIOD_DEFS[term]; if(def)openSheet(term,'<div class="coach-period-definition"><b>'+h(term)+'</b><p>'+h(def)+'</p></div>','periodization-definition'); return; }
    if (a === 'period-load') { var pid0=b.getAttribute('data-id'),found0=(S.periodizationPlans||[]).filter(function(x){return String(x.id)===String(pid0);})[0];if(found0){S.periodizationDraft=clone(found0);renderCoachPeriodization();}return; }
    if (a === 'period-new') { S.periodizationDraft=coachPeriodNew(); renderCoachPeriodization(); return; }
    if (a === 'period-add-meso') { coachPeriodAddMeso(); return; }
    if (a === 'period-remove-meso') { coachPeriodRemoveMeso(+b.getAttribute('data-m')); return; }
    if (a === 'period-add-micro') { coachPeriodAddMicro(+b.getAttribute('data-m')); return; }
    if (a === 'period-remove-micro') { coachPeriodRemoveMicro(+b.getAttribute('data-m'),+b.getAttribute('data-w')); return; }
    /* R51 — PER-009 / COACH-004. Coach Periodization is VIEW ONLY. The save
       action is removed here AND denied server-side, so hiding the button is
       not the security boundary. */
    if (a === 'period-save') { toast('Periodization is view only. Only the member can change their plan.'); return; }
    if (a === 'training-foundation') { S.view='training-foundation'; render(); return; }
    if (a === 'training-foundation-back') { S.view='home'; render(); return; }
    if (a === 'training-foundation-refresh') { refreshCoachTrainingFoundation(true); return; }
    /* R51 — BODY-009 / COACH-004. Coach Body Metrics are VIEW ONLY. */
    if (a === 'coach-body-profile-save') { toast('Body Metrics are view only. Only the member can change their body numbers.'); return; }
    if (a === 'coach-body-measure-save') { saveCoachBodyMeasurement(); return; }
    if (a === 'coach-activity-relabel') { coachRelabelActivity(b.getAttribute('data-id'),b.getAttribute('data-type')); return; }
    if (a === 'theme') {
      if(themeAudio.paused){themeAudio.play().catch(function(){toast('Tap play again to start the training theme');});}
      else themeAudio.pause(); paintThemeButtons(); return;
    }
    if (a === 'avatar') {
      if(!S.client)return;
      var inp=document.createElement('input');inp.type='file';inp.accept='image/jpeg,image/png,image/webp,image/*';inp.style.display='none';document.body.appendChild(inp);inp.click();
      inp.onchange=function(){var file=inp.files&&inp.files[0];if(!file){inp.remove();return;}if(file.size>8*1024*1024){toast('Use a photo under 8 MB.');inp.remove();return;}
        squareAvatar(file).then(function(blob){return post({action:'avatarUploadTicket',memberId:S.client.id}).then(function(t){if(!t||!t.ok)throw new Error('ticket');return uploadToSigned(t.signedUrl,blob).then(function(){return post({action:'saveAvatar',memberId:S.client.id,path:t.path});});});}).then(function(j){if(!j||!j.ok)throw new Error('save');S.client.avatarUrl=j.url+'?v='+Date.now();renderHome();toast('Profile photo updated');}).catch(function(){toast('That profile photo could not be updated.');}).finally(function(){inp.remove();});
      }; return;
    }
    if (a === 'meal-gradient') { if(window.FOBMealGradient&&S.client) window.FOBMealGradient.open({mode:'coach',memberId:S.client.id,memberName:S.client.name}); return; }
    if (a === 'exercise-manager') { S.view='exercise-manager'; S.exMgr.q=''; S.exMgr.filters={}; loadExerciseManager(true); renderExerciseManager(); return; }
    if (a === 'exercise-manager-back') { S.view='home'; render(); return; }
    if (a === 'exercise-more') { loadExerciseManager(false); return; }
    if (a === 'exercise-filter') {
      toggleLibraryFilter(S.exMgr.filters, b.getAttribute('data-f'), b.getAttribute('data-v'));
      loadExerciseManager(true); renderExerciseManager(); return;
    }
    if (a === 'exercise-filter-clear') {
      S.exMgr.filters={}; loadExerciseManager(true); renderExerciseManager(); return;
    }
    if (a === 'exercise-new') { openSheet('New exercise', exerciseEditorHTML(null), 'exercise-edit'); return; }
    if (a === 'exercise-edit') { var eid=b.getAttribute('data-id'), exm=(S.exMgr.rows||[]).filter(function(x){return String(x.id)===String(eid);})[0]; if(exm)openSheet('Edit exercise',exerciseEditorHTML(exm),'exercise-edit'); return; }
    if (a === 'exercise-save') {
      var eid2=b.getAttribute('data-id')||'', nm=(document.getElementById('exedName')||{}).value||'', cat=(document.getElementById('exedCat')||{}).value||'custom', region=(document.getElementById('exedRegion')||{}).value||'', eq=(document.getElementById('exedEquip')||{}).value||'', media=(document.getElementById('exedMedia')||{}).value||'', instructions=(document.getElementById('exedInstructions')||{}).value||'';
      var muscles=((document.getElementById('exedMuscles')||{}).value||'').split(',').map(function(x){return x.trim();}).filter(Boolean);
      var vv=[].slice.call(document.querySelectorAll('[data-exvar]:checked')).map(function(x){return x.getAttribute('data-exvar');}); if(!nm.trim()){toast('Exercise name is required.');return;} if(!vv.length){toast('Choose at least one tracking variable.');return;}
      var req={action:eid2?'updateExercise':'createExercise',name:nm,category:cat,region:region||null,muscles:muscles,equipment:eq||null,unilateral:!!((document.getElementById('exedUnilateral')||{}).checked),compound:!!((document.getElementById('exedCompound')||{}).checked),vars:vv,instructions:instructions||null,media_url:media||null};
      if(eid2)req.id=eid2;
      post(req).then(function(j){if(!j||!j.ok){toast((j&&j.error)||'Exercise could not be saved.');return;}closeSheet();S.exMgr.q='';loadExerciseManager(true);toast('Exercise saved');}); return;
    }
    if (a === 'exercise-delete') {
      var eid3=b.getAttribute('data-id'); if(!eid3)return; if(!confirm('Remove this exercise from the active library? Completed workout history will be preserved.'))return;
      post({action:'deleteExercise',id:eid3}).then(function(j){if(!j||!j.ok){toast((j&&j.error)||'Exercise could not be removed.');return;}closeSheet();loadExerciseManager(true);toast(j.mode==='archived'?'Exercise removed. History preserved.':'Exercise deleted.');}); return;
    }
    if (a === 'exercise-upload') {
      var eid4=b.getAttribute('data-id'); if(!eid4){toast('Save the new exercise first, then upload its video.');return;} var fi=document.createElement('input');fi.type='file';fi.accept='video/*';fi.style.display='none';document.body.appendChild(fi);fi.click();fi.onchange=function(){var f=fi.files&&fi.files[0];if(!f){fi.remove();return;}post({action:'mediaUploadTicket',id:eid4,fileName:f.name,contentType:f.type}).then(function(t){if(!t||!t.ok||!t.signedUrl)throw new Error('ticket');return uploadToSigned(t.signedUrl,f).then(function(){return post({action:'setMedia',id:eid4,media_url:t.publicUrl});});}).then(function(j){if(!j||!j.ok)throw new Error('save');var mi=document.getElementById('exedMedia');if(mi)mi.value=j.media_url||'';toast('Exercise video uploaded');}).catch(function(){toast('Video upload failed.');}).finally(function(){fi.remove();});};return;
    }
    if (a === 'routines') { S.view='routines'; render(); return; }
    if (a === 'routine-new') {
      S.routineEditId=null; S.routineDraft={name:'New Routine', notes:'', items:[]}; S.view='routine-builder'; render(); return;
    }
    if (a === 'routine-open') {
      var tid=b.getAttribute('data-id');
      post({action:'loadTemplate',id:tid}).then(function(j){
        if(!j||!j.ok||!j.template)return;
        S.routineEditId=j.template.id; S.routineDraft={name:j.template.name||'Routine',notes:j.template.notes||'',items:clone(j.template.body||[])};
        S.routineDraft.items.forEach(function(x){x.key=uid(); x.sets=(x.sets||[]).map(function(st){st.done=false;return st;});});
        S.view='routine-builder'; render();
      }); return;
    }
    if (a === 'routine-unsave') {
      var tid=b.getAttribute('data-id'); if(!tid)return;
      if(!confirm('Unsave this routine? Assigned member programs and completed workout history will stay intact.'))return;
      post({action:'deleteTemplate',id:tid}).then(function(j){
        if(!j||!j.ok){toast((j&&j.error)||'Routine could not be unsaved.');return;}
        S.templates=(S.templates||[]).filter(function(t){return String(t.id)!==String(tid);});
        renderRoutines(); toast('Routine unsaved');
      }); return;
    }
    if (a === 'routine-back') {
      /* When the Routine Creator was opened as a DAY of a program, going back
         commits that day into the draft and returns to the builder. Otherwise
         it behaves exactly as before. */
      if (S.builderDay != null && S.builder) {
        var rn = document.getElementById('routineName');
        var day = S.builder.days[S.builderDay];
        if (day) {
          day.name = (rn && rn.value.trim()) || day.name;
          day.items = clone((S.routineDraft && S.routineDraft.items) || []);
        }
        S.builderDay = null; S.routineDraft = null; S.routineEditId = null;
        saveDraft(); S.view = 'progbuild'; render(); return;
      }
      S.view='home'; S.routineDraft=null; S.routineEditId=null; render(); return;
    }
    if (a === 'routine-add') { openRoutineLibrary(b.getAttribute('data-section') || 'strength'); return; }
    if (a === 'routine-del') {
      if(!S.routineDraft)return; var rk=b.getAttribute('data-k');
      S.routineDraft.items=S.routineDraft.items.filter(function(x){return x.key!==rk;}); syncRoutineToBuilderDay(); renderRoutineBuilder(); return;
    }
    if (a === 'routine-move') {
      if(!S.routineDraft)return; var mk=b.getAttribute('data-k'), dir=parseInt(b.getAttribute('data-d'),10)||0;
      S.routineDraft.items = moveGrouped(S.routineDraft.items, mk, dir);
      syncRoutineToBuilderDay(); renderRoutineBuilder(); return;
    }
    if (a === 'routine-circuit') {
      if(!S.routineDraft)return; var rck=b.getAttribute('data-k');
      openSheet('Build circuit', circuitEditorHTML(S.routineDraft.items, rck).replace('data-act="circuit-save"','data-act="routine-circuit-save"'), 'circuit');
      return;
    }
    if (a === 'routine-circuit-save') {
      if(!S.routineDraft)return; var ranchor=b.getAttribute('data-k');
      var rkeys=[].slice.call(document.querySelectorAll('[data-circuit-pick]:checked')).map(function(x){return x.value;});
      if(rkeys.length<2){toast('Choose at least 2 exercises for the circuit.');return;}
      var rr=(document.getElementById('circuitRounds')||{}).value, rrest=(document.getElementById('circuitRest')||{}).value;
      if(!applyCircuit(S.routineDraft.items,rkeys,'Circuit',rr,rrest)){toast('Circuit exercises must stay in the same workout section.');return;}
      syncRoutineToBuilderDay(); closeSheet(); renderRoutineBuilder(); toast('Circuit saved'); return;
    }
    if (a === 'routine-save') {
      if(!S.routineDraft)return;
      var rn=(document.getElementById('routineName')||{}).value||S.routineDraft.name||'Routine';
      S.routineDraft.name=rn.trim()||'Routine';
      post({action:'saveTemplate',id:S.routineEditId||null,name:S.routineDraft.name,notes:'FOB Gym routine',body:S.routineDraft.items}).then(function(j){
        if(!j||!j.ok||!j.template){toast('Routine could not be saved.');return;}
        S.routineEditId=j.template.id;
        var idx=S.templates.findIndex(function(t){return t.id===j.template.id;}); if(idx>=0)S.templates[idx]=j.template;else S.templates.unshift(j.template);
        toast('Routine saved'); renderRoutineBuilder();
      }); return;
    }
    if (a === 'routine-assign') {
      if(!S.routineDraft||!S.client)return;
      var rn2=(document.getElementById('routineName')||{}).value||S.routineDraft.name||'Routine'; rn2=rn2.trim()||'Routine';
      var prog={name:rn2,sub:'Custom routine',days:[{name:rn2,items:clone(S.routineDraft.items)}]};
      post({action:'saveProgram',memberId:S.client.id,name:rn2,sub:'Custom routine',body:prog}).then(function(j){
        if(!j||!j.ok||!j.program){toast('Routine could not be assigned.');return;}
        prog.dbId=j.program.id; S.programs.unshift(prog); toast('Assigned to '+S.client.name); S.view='home'; render();
      }); return;
    }
    if (a === 'add-section') { openLibrary(null, b.getAttribute('data-section') || 'strength', !!(S.sheet && S.sheet.kind === 'editor')); return; }
    if (a === 'edit-workout') { openProgramEditor(); return; }
    if (a === 'save-program-layout') { saveProgramLayout(); return; }
    if (a === 'save-custom-workout') { saveCustomWorkout(); return; }
    if (a === 'dismiss-custom') { S.saveCustomOffer = null; renderHome(); return; }
    if (a === 'timer') {
      if (S.running) { S.elapsed = elapsed(); S.running = false; }
      else { S.started = Date.now(); S.running = true; }
      touch(); return;
    }
    if (a === 'home') { S.view = 'home'; render(); return; }
    if (a === 'choose-prog') { S.view = 'presets'; render(); return; }
    if (a === 'prev-prog') { S.previewId = b.getAttribute('data-id'); S.view = 'preview'; render(); return; }
    if (a === 'scratch') {
      app.innerHTML = '<div class="empty"><b>Opening blank workout</b>Ready for live programming.</div>';
      beginSession('Custom Workout', []).then(function (ok) {
        if (!ok) { S.view = 'home'; render(); return; }
        S.fromScratch = true; S.activeProgramId = null; S.activeDayIndex = null; render();
      });
      return;
    }
    if (a === 'assign') {
      var pre = presetById(b.getAttribute('data-id'));
      if (!pre) return;
      app.innerHTML = '<div class="empty buildstate"><b>Building program</b><span>Resolving exercises…</span><i class="buildbeam"></i></div>';
      var names = [];
      pre.days.forEach(function (d) { (d[1] || []).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); }); });
      post({ action: 'resolveExercises', names: names }).then(function (r) {
        var found = (r && r.ok && r.exercises) || [];
        var by = {};
        found.forEach(function (ex) { by[String(ex.name || '').toLowerCase()] = ex; });
        var days = pre.days.map(function (d) {
          var items = (d[1] || []).map(function (n) {
            var ex = by[String(n).toLowerCase()] || { id:null, name:n, vars:['weight','reps'], media_url:null };
            var vars = (ex.vars && ex.vars.length) ? ex.vars : ['weight','reps'];
            var sets = []; for (var i=0;i<pre.sets;i++) sets.push(blankSet(vars));
            return { key:uid(), exerciseId:ex.id || null, name:ex.name || n, vars:vars, media:ex.media_url || null, note:'', circuit:null,
              section: inferSection({name:ex.name || n}), sets:sets, target:pre.target, days:null, suggestion:null };
          });
          return { name:d[0], items:items };
        });
        var program = { presetId: pre.id, name: pre.name, sub: pre.sub, cursor: 0, days: days };
        return post({ action: 'saveProgram', memberId: S.client.id, name: program.name, sub: program.sub, body: program });
      }).then(function (j) {
        if (!j || !j.ok || !j.program) { S.view='preview'; render(); toast((j && j.error) || 'Program could not be saved. Please try again.'); return; }
        var body = j.program.body || {}; body.dbId = j.program.id;
        S.programs.unshift(body); S.program = body; saveProgram(S.client.id, body);
        S.view = 'home'; render();
      });
      return;
    }
    /* ══ PROGRAM BUILDER ACTIONS ══════════════════════════════════════ */
    if (a === 'pb-resume') {
      var dft = loadDraft(S.client && S.client.id);
      if (!dft) { toast('That draft is gone.'); return; }
      S.builder = dft; S.builderDay = null; S.view = 'progbuild'; render(); return;
    }
    if (a === 'build-program') {
      S.builder = newBuilder(null); saveDraft(); S.view = 'progbuild'; render(); return;
    }
    if (a === 'pb-exit') {
      pbSyncFields();
      if (S.builder && (S.builder.name || '').trim()) saveDraft(); else clearDraft();
      S.view = 'home'; render(); return;
    }
    if (a === 'pb-add') {
      pbSyncFields();
      S.builder.days.push({ name: 'Day ' + (S.builder.days.length + 1), items: [] });
      saveDraft(); renderProgramBuilder(); return;
    }
    if (a === 'pb-move') {
      pbSyncFields();
      var mi = parseInt(b.getAttribute('data-day'), 10);
      var to = mi + (b.getAttribute('data-dir') === 'up' ? -1 : 1);
      if (to < 0 || to >= S.builder.days.length) return;
      S.builder.days.splice(to, 0, S.builder.days.splice(mi, 1)[0]);
      saveDraft(); renderProgramBuilder(); return;
    }
    if (a === 'pb-dup') {
      pbSyncFields();
      var di2 = parseInt(b.getAttribute('data-day'), 10);
      var copy = clone(S.builder.days[di2]);
      copy.name = (copy.name || 'Day') + ' copy';
      (copy.items || []).forEach(function (x) { x.key = uid(); });
      S.builder.days.splice(di2 + 1, 0, copy);
      saveDraft(); renderProgramBuilder(); return;
    }
    if (a === 'pb-del') {
      pbSyncFields();
      if (S.builder.days.length <= 1) { toast('A program needs at least one day.'); return; }
      var xi2 = parseInt(b.getAttribute('data-day'), 10);
      var gone = S.builder.days.splice(xi2, 1)[0];
      saveDraft(); renderProgramBuilder();
      toast('Removed ' + (gone.name || 'day'), 'Undo', function () {
        S.builder.days.splice(xi2, 0, gone); saveDraft(); renderProgramBuilder();
      });
      return;
    }
    if (a === 'pb-open') {
      /* The day editor IS the Routine Creator, pointed at one day of the
         draft. Same library, same sections, same set editing. */
      pbSyncFields();
      var oi = parseInt(b.getAttribute('data-day'), 10);
      var day = S.builder.days[oi];
      S.builderDay = oi;
      S.routineEditId = null;
      S.routineDraft = { name: day.name || ('Day ' + (oi + 1)), notes: '', items: clone(day.items || []) };
      S.view = 'routine-builder'; render(); return;
    }
    if (a === 'pb-save') {
      pbSyncFields();
      var pb = S.builder;
      if (!(pb.name || '').trim()) { toast('Give the program a name.'); return; }
      var payload = { name: pb.name.trim(), sub: pb.sub || '', days: pb.days, dbId: pb.dbId || null };
      var btn = b; btn.disabled = true; btn.textContent = 'Saving\u2026';
      post({ action: 'saveProgram', id: pb.dbId || null, memberId: S.client.id,
             name: payload.name, sub: payload.sub, body: payload })
        .then(function (j) {
          btn.disabled = false;
          if (!j || !j.ok) { toast((j && j.error) || 'Could not save. Your draft is still here.'); return; }
          var nid = programIdFrom(j);
          payload.dbId = nid || pb.dbId || null;
          var ix = -1;
          S.programs.forEach(function (x, k) {
            if (String(x.dbId || x.id || '') === String(payload.dbId)) ix = k;
          });
          if (ix >= 0) S.programs[ix] = payload; else S.programs.unshift(payload);
          clearDraft(); S.builder = null; S.builderDay = null;
          S.view = 'home'; render();
          toast('Program saved');
        })
        .catch(function () { btn.disabled = false; toast('Offline. Your draft is kept on this device.'); });
      return;
    }

    if (a === 'edit-program') {
      var ep = b.getAttribute('data-pid'), pe = progById(ep);
      if (!pe) return;
      /* Editing uses the same full page as building. One surface, so the two
         never diverge and there is nothing cramped to fall back to. */
      S.builder = newBuilder(pe); S.builderDay = null; saveDraft();
      S.view = 'progbuild'; render(); return;
    }
    if (a === 'back-to-program') {
      if (S.editPid) openProgramEditor(S.editPid);
      return;
    }
    if (a === 'add-workout') {
      var ap = S.editPid, progA = progById(ap);
      if (!progA) return;
      progA.days = progA.days || [];
      progA.days.push({ name: 'Workout ' + (progA.days.length + 1), items: [] });
      persistProgram(progA, 'Workout added');
      openProgramEditor(ap);
      return;
    }
    if (a === 'rename-workout') {
      var rp = progById(S.editPid); if (!rp) return;
      var ri = parseInt(b.getAttribute('data-day'), 10);
      var inp = document.getElementById('wn_' + ri);
      if (inp) { rp.days[ri].name = (inp.value || '').trim() || rp.days[ri].name; persistProgram(rp, 'Renamed'); openProgramEditor(S.editPid); }
      return;
    }
    if (a === 'move-workout') {
      var mp = progById(S.editPid); if (!mp) return;
      var mi = parseInt(b.getAttribute('data-day'), 10);
      var to = mi + (b.getAttribute('data-dir') === 'up' ? -1 : 1);
      if (to < 0 || to >= mp.days.length) return;
      var moved = mp.days.splice(mi, 1)[0];
      mp.days.splice(to, 0, moved);
      persistProgram(mp, 'Reordered');
      openProgramEditor(S.editPid);
      return;
    }
    if (a === 'remove-workout') {
      var xp = progById(S.editPid); if (!xp) return;
      var xi = parseInt(b.getAttribute('data-day'), 10);
      if (xp.days.length <= 1) { toast('A program needs at least one workout.'); return; }
      var gone = xp.days.splice(xi, 1)[0];
      persistProgram(xp, 'Removed ' + (gone.name || 'workout'));
      openProgramEditor(S.editPid);
      return;
    }
    if (a === 'save-program-meta') {
      var sp=b.getAttribute('data-pid'), progS=S.programs.filter(function(x){return String(x.dbId||x.id||'')===String(sp);})[0];if(!progS)return;
      progS.name=((document.getElementById('epname')||{}).value||progS.name||'Program').trim(); progS.sub=((document.getElementById('epsub')||{}).value||'').trim();
      post({action:'saveProgram',id:progS.dbId||null,memberId:S.client.id,name:progS.name,sub:progS.sub,body:progS}).then(function(j){if(j&&j.ok){var nid=programIdFrom(j); if(nid){progS.dbId=nid; progS.id=progS.id||nid;} closeSheet();renderHome();toast('Program updated');}}); return;
    }
    if (a === 'edit-program-day') {
      S.editPid = b.getAttribute('data-pid'); var edp=b.getAttribute('data-pid'), edi=parseInt(b.getAttribute('data-day'),10)||0, progD=S.programs.filter(function(x){return String(x.dbId||x.id||'')===String(edp);})[0];if(!progD||!progD.days||!progD.days[edi])return;
      var dayD=progD.days[edi]; S.activeProgramId=String(progD.dbId||progD.id||''); S.activeDayIndex=edi; S.items=normalizeSections(clone(dayD.items||[]).map(function(x){x.key=uid();return x;})); S.name=dayD.name||'Workout'; S.notes=''; closeSheet(); openProgramEditor(); return;
    }
    if (a === 'delete-program') {
      var dp=b.getAttribute('data-pid'); if(!confirm('Remove this program from '+S.client.name+'? Completed workout history will stay saved.'))return;
      post({action:'deleteProgram',memberId:S.client.id,id:dp}).then(function(j){if(j&&j.ok){S.programs=S.programs.filter(function(x){return String(x.dbId||x.id||'')!==String(dp);});renderHome();toast('Program removed');}}); return;
    }
    if (a === 'start-day') {
      var pid = b.getAttribute('data-pid'), di = parseInt(b.getAttribute('data-day'), 10) || 0;
      var prog = S.programs.filter(function (x) { return String(x.dbId || x.id || '') === pid; })[0];
      if (!prog || !prog.days || !prog.days[di]) return;
      var day = prog.days[di];
      var startItems = normalizeSections(clone(day.items).map(function (x) { x.key = uid(); return x; }));
      app.innerHTML = '<div class="empty"><b>Opening workout</b>' + h(day.name) + '</div>';
      beginSession(day.name, startItems).then(function (ok) {
        if (!ok) { S.view = 'home'; render(); return; }
        S.program = prog; S.activeProgramId = String(prog.dbId || prog.id || ''); S.activeDayIndex = di; S.fromScratch = false;
        S.items.forEach(loadHistory); render();
      });
      return;
    }
    if (a === 'progress') { loadProgress(); return; }
    if (a === 'progress-exercise') {
      S.progressExerciseKey = b.getAttribute('data-key') || null;
      S.progressSearch = '';
      renderProgress(); return;
    }
    if (a === 'progress-bookmark') {
      var pk = b.getAttribute('data-key'); if (!pk) return;
      var bm = progressBookmarks(), bi = bm.indexOf(pk);
      if (bi >= 0) bm.splice(bi, 1); else bm.unshift(pk);
      saveProgressBookmarks(bm.slice(0, 20)); renderProgress(); return;
    }
    if (a === 'progress-bookmark-jump') {
      S.progressExerciseKey = b.getAttribute('data-key') || null; renderProgress(); return;
    }
    if (a === 'library') { openLibrary(null); return; }
    if (a === 'swap') { openLibrary(it && it.key, null, !!(S.sheet && S.sheet.kind === 'editor')); return; }
    if (a === 'closesheet') { closeSheet(); return; }
    if (a === 'filter') {
      var f = b.getAttribute('data-f'), v = b.getAttribute('data-v');
      toggleLibraryFilter(libState.filters, f, v);
      libState.offset = 0; libState.hasMore = false; libRows = [];
      S.sheet.html = libraryHTML(null);
      document.getElementById('sheetB').innerHTML = S.sheet.html;
      libSearch(false); return;
    }
    if (a === 'filter-clear') {
      libState.filters = {}; libState.offset = 0; libState.hasMore = false; libRows = [];
      S.sheet.html = libraryHTML(null);
      document.getElementById('sheetB').innerHTML = S.sheet.html;
      libSearch(false); return;
    }
    if (a === 'lib-more') { libSearch(true); return; }
    if (a === 'quickpick') {
      var qn = b.getAttribute('data-n') || '';
      post({ action: 'search', q: qn, limit: 5 }).then(function (j) {
        var rows = (j && j.exercises) || [];
        var hit = rows.filter(function (x) { return x.name.toLowerCase() === qn.toLowerCase(); })[0] || rows[0];
        if (!hit) { toast('Not found in the library.'); return; }
        /* Route through the real pick handler rather than a parallel path, so
           swap, routine-builder insertion and section placement all behave
           identically to picking from the list. */
        libRows = rows;
        var proxy = document.createElement('button');
        proxy.setAttribute('data-act', 'choose');
        proxy.setAttribute('data-id', hit.id);
        if (libState.addSection) proxy.setAttribute('data-section', libState.addSection);
        proxy.style.display = 'none';
        document.body.appendChild(proxy);
        proxy.click();
        proxy.remove();
      });
      return;
    }
    if (a === 'choose') {
      var ex = libRows.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
      if (!ex) return;
      if (libState.routine && S.routineDraft) {
        var rvars = (ex.vars && ex.vars.length) ? ex.vars : ['weight','reps'];
        /* Capture the destination from the clicked row itself. The library can
           rerender while searching, so relying only on mutable global state was
           the reason exercises occasionally landed in the wrong section. */
        var destSection = b.getAttribute('data-section') || libState.addSection || 'strength';
        S.routineDraft.items.push({ key:uid(), exerciseId:ex.id, name:ex.name, vars:rvars, category:ex.category || null,
          media:ex.media_url || null, note:'', circuit:null, section:destSection,
          sets:[blankSet(rvars),blankSet(rvars),blankSet(rvars)], target:{lo:8,hi:10} });
        syncRoutineToBuilderDay();
        libState.routine=false; libState.addSection=null; closeSheet(); renderRoutineBuilder();
        toast('Added ' + ex.name + ' to ' + sectionLabel(destSection)); return;
      }
      var returnEditor = !!libState.returnEditor;
      if (libState.swapKey) {
        /* Swap keeps position, circuit and set structure. History stays under
           the ORIGINAL exercise identity because gym_sets rows already written
           are never touched. */
        var t = find(libState.swapKey);
        if (t) {
          var wasName = t.name;
          t.exerciseId = ex.id; t.name = ex.name; t.category = ex.category || null;
          t.vars = (ex.vars && ex.vars.length) ? ex.vars : t.vars;
          t.media = ex.media_url || null; t.days = null; t.suggestion = null;
          loadHistory(t);
          toast('Swapped ' + wasName + ' for ' + ex.name);
        }
      } else { addExercise(ex, null, b.getAttribute('data-section') || libState.addSection || null); }
      libState.addSection = null; libState.returnEditor = false; closeSheet();
      if (returnEditor) openProgramEditor(); else touch();
      return;
    }
    if (a === 'delset') {
      var deleteKey=b.getAttribute('data-k')+'_'+b.getAttribute('data-i');
      if (COACH_SET_DELETE_ARM!==deleteKey) return;
      COACH_SET_DELETE_ARM='';COACH_SET_LONGPRESS_SUPPRESS='';
      if (it) {
        var dsi = parseInt(b.getAttribute('data-i'), 10);
        if (!isNaN(dsi) && it.sets[dsi]) { it.sets.splice(dsi, 1); touch(); }
      }
      return;
    }
    if (a === 'addset') {
      if (it) { it.sets.push(blankSet(it.vars)); touch(); } return;
    }
    if (a === 'tick') {
      if (!it) return;
      var si = parseInt(b.getAttribute('data-i'), 10), tickKey=b.getAttribute('data-k')+'_'+si;
      if(COACH_SET_LONGPRESS_SUPPRESS===tickKey){COACH_SET_LONGPRESS_SUPPRESS='';return;}
      it.sets[si].done = !it.sets[si].done;
      b.setAttribute('data-on', it.sets[si].done ? '1' : '0');
      if (it.sets[si].done) startRest();
      touch(); return;
    }
    if (a === 'step') {
      if (!it) return;
      var i2 = parseInt(b.getAttribute('data-i'), 10);
      var fld = b.getAttribute('data-f'), d = parseFloat(b.getAttribute('data-d'));
      var cur = it.sets[i2][fld] || 0;
      it.sets[i2][fld] = Math.max(0, Math.round((cur + d) * 100) / 100);
      /* Set 1 is the prescription seed. Until later sets are completed, a
         change to set 1 carries forward so the coach enters the intended load
         or reps once instead of repeating it three times. */
      if (i2 === 0) {
        for (var ps = 1; ps < it.sets.length; ps++) {
          if (!it.sets[ps].done && Object.prototype.hasOwnProperty.call(it.sets[ps], fld)) {
            it.sets[ps][fld] = it.sets[i2][fld];
            var pel = document.getElementById('f_' + it.key + '_' + ps + '_' + fld);
            if (pel) pel.value = (fld === 'time' || fld === 'fmTime')
              ? mmss(it.sets[ps][fld]) : it.sets[ps][fld];
          }
        }
      }
      /* Write straight to the input instead of re-rendering the page. The old
         code rebuilt every card on every tap, which is what made rapid tapping
         feel like it dropped presses. Saving still happens, just off the
         critical path. */
      var el = document.getElementById('f_' + it.key + '_' + i2 + '_' + fld);
      if (el) el.value = (fld === 'time' || fld === 'fmTime')
        ? mmss(it.sets[i2][fld]) : it.sets[i2][fld];
      quietSave();
      return;
    }
    if (a === 'collapse') {
      if (!it) return;
      if (e.target.closest('[data-act="menu"],[data-act="video"],[data-grip]')) return;
      it.open = it.open === false;
      render(); localSave(); return;
    }
    if (a === 'history') {
      if (!it) return;
      var rows = (it.days || []).map(function (d) {
        return '<div><em>' + h(d.date) + '</em><span>' + h(d.sets.map(function (s) {
          if (s.fm_distance != null) return s.fm_distance + '" / ' + mmss(s.fm_time_s || 0);
          if (s.weight != null && s.reps != null) return s.weight + ' \u00d7 ' + s.reps;
          if (s.time_s != null) return mmss(s.time_s);
          return s.reps != null ? s.reps : '\u2013';
        }).join('  /  ')) + '</span></div>';
      }).join('');
      openSheet(it.name, '<div class="hist">' + (rows || '<div class="empty">No recorded history yet.</div>') + '</div>', 'hist');
      return;
    }
    if (a === 'note') {
      if (!it) return;
      var cur2 = it.note || '';
      openSheet('Exercise note', '<label class="fld"><span>Persistent coach note</span>'
        + '<textarea id="exnote">' + h(cur2) + '</textarea></label>'
        + '<button class="primary" data-act="savenote" data-k="' + it.key + '">Save note</button>', 'note');
      return;
    }
    if (a === 'savenote') {
      if (it) { it.note = document.getElementById('exnote').value; closeSheet(); touch(); } return;
    }
    if (a === 'menu') {
      if (!it) return;
      openSheet(it.name,
        '<button class="ghost" data-act="dup" data-k="' + it.key + '">Duplicate</button>'
        + '<button class="ghost" data-act="up" data-k="' + it.key + '">Move up</button>'
        + '<button class="ghost" data-act="down" data-k="' + it.key + '">Move down</button>'
        + '<button class="ghost" data-act="circuit-edit" data-k="' + it.key + '">' + (it.circuit ? 'Edit circuit' : 'Build circuit') + '</button>'
        + '<button class="ghost" data-act="del" data-k="' + it.key + '">Remove</button>', 'menu');
      return;
    }
    if (a === 'dup' && it) {
      var copy = JSON.parse(JSON.stringify(it)); copy.key = uid();
      S.items.splice(S.items.indexOf(it) + 1, 0, copy); closeSheet(); touch(); return;
    }
    if ((a === 'up' || a === 'down') && it) {
      var keepEditor = !!(S.sheet && S.sheet.kind === 'editor');
      S.items = moveGrouped(S.items, it.key, a === 'up' ? -1 : 1);
      closeSheet(); if (keepEditor) openProgramEditor(); else touch(); return;
    }
    if (a === 'circuit-edit' && it) {
      S.returnToWorkoutEditor = !!(S.sheet && S.sheet.kind === 'editor');
      openSheet('Build circuit', circuitEditorHTML(S.items, it.key), 'circuit'); return;
    }
    if (a === 'circuit-save') {
      var anchor=b.getAttribute('data-k');
      var keys=[].slice.call(document.querySelectorAll('[data-circuit-pick]:checked')).map(function(x){return x.value;});
      if(keys.length<2){toast('Choose at least 2 exercises for the circuit.');return;}
      var rounds=(document.getElementById('circuitRounds')||{}).value, crest=(document.getElementById('circuitRest')||{}).value;
      if(!applyCircuit(S.items,keys,'Circuit',rounds,crest)){toast('Circuit exercises must stay in the same workout section.');return;}
      var backEditor = !!S.returnToWorkoutEditor; S.returnToWorkoutEditor = false;
      closeSheet(); if (backEditor) openProgramEditor(); else touch(); toast('Circuit saved'); return;
    }
    if (a === 'circuit-remove') {
      var rcid=b.getAttribute('data-c');
      S.items.forEach(function(x){if(x.circuit&&x.circuit.id===rcid)x.circuit=null;});
      if(S.routineDraft){S.routineDraft.items.forEach(function(x){if(x.circuit&&x.circuit.id===rcid)x.circuit=null;});syncRoutineToBuilderDay();}
      var keepEditor3 = !!S.returnToWorkoutEditor; S.returnToWorkoutEditor = false;
      closeSheet(); if(S.view==='routine-builder')renderRoutineBuilder();else if(keepEditor3)openProgramEditor();else touch(); return;
    }
    if (a === 'ungroup') {
      var cid3 = b.getAttribute('data-c');
      S.items.forEach(function (x) { if (x.circuit && x.circuit.id === cid3) x.circuit = null; });
      touch(); return;
    }
    if (a === 'del' && it) {
      var idx = S.items.indexOf(it), removed = it, keepEditor2 = !!(S.sheet && S.sheet.kind === 'editor');
      S.items.splice(idx, 1); closeSheet(); if (keepEditor2) openProgramEditor(); else touch();
      toast('Removed ' + removed.name, 'Undo', function () {
        S.items.splice(idx, 0, removed); if (keepEditor2) openProgramEditor(); else touch();
      });
      return;
    }
    if (a === 'undo') { if (undo) { undo(); undo = null; }
      document.getElementById('toast').classList.remove('open'); return; }
    if (a === 'video') {
      if (!it) return;
      openSheet(it.name, videoBody(it), 'video');
      return;
    }
  /* ══ VIDEO TRIM ════════════════════════════════════════════════════════
     Reference clips are demonstrations, not footage. A 10 second cap keeps
     every upload small, fast to open beside a client, and cheap to store.

     HOW THE TRIM ACTUALLY WORKS
     There is no client-side video encoder in a browser, so this plays the
     chosen window into a canvas and records the canvas with MediaRecorder.
     That is a real re-encode: the result is genuinely shorter AND smaller,
     because it is also downscaled to 720p on the long edge. It runs in real
     time, so a 10 second clip takes about 10 seconds.

     Audio is dropped deliberately. A canvas stream carries no audio, and a
     silent demonstration clip is what you want anyway.

     FALLBACK, and it is honest about itself
     If MediaRecorder or canvas capture is unavailable, the original file is
     uploaded with the trim stored as a start and end marker instead, and the
     player honours those markers. The clip still plays as 10 seconds; the
     file is simply not smaller. The panel says so rather than pretending.
     ═══════════════════════════════════════════════════════════════════════ */
  var TRIM_MAX = 10;                 /* seconds */
  var TRIM_EDGE = 720;               /* px on the long edge */

  function canReencode() {
    try {
      return typeof MediaRecorder !== 'undefined'
        && typeof document.createElement('canvas').captureStream === 'function';
    } catch (e) { return false; }
  }

  function pickMime() {
    var want = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9',
                'video/webm;codecs=vp8', 'video/webm'];
    for (var i = 0; i < want.length; i++) {
      try { if (MediaRecorder.isTypeSupported(want[i])) return want[i]; } catch (e) {}
    }
    return '';
  }

  /* Plays [start, start+len) into a canvas and records it. Resolves with a Blob. */
  function reencode(video, start, len, onProgress) {
    return new Promise(function (resolve, reject) {
      var vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh) { reject(new Error('no dimensions')); return; }
      var scale = Math.min(1, TRIM_EDGE / Math.max(vw, vh));
      var cv = document.createElement('canvas');
      cv.width = Math.round(vw * scale / 2) * 2;      /* even dimensions encode better */
      cv.height = Math.round(vh * scale / 2) * 2;
      var ctx = cv.getContext('2d');
      var stream = cv.captureStream(30);
      var mime = pickMime();
      var rec;
      try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 2500000 } : undefined); }
      catch (e) { reject(e); return; }
      var chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onerror = function () { reject(new Error('recorder failed')); };
      rec.onstop = function () {
        resolve(new Blob(chunks, { type: (rec.mimeType || mime || 'video/webm').split(';')[0] }));
      };

      var raf = 0, stopAt = start + len, finished = false;
      function draw() {
        if (finished) return;
        ctx.drawImage(video, 0, 0, cv.width, cv.height);
        if (onProgress) onProgress(Math.min(1, Math.max(0, (video.currentTime - start) / len)));
        if (video.currentTime >= stopAt || video.ended) { stop(); return; }
        raf = requestAnimationFrame(draw);
      }
      function stop() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf);
        try { video.pause(); } catch (e) {}
        try { rec.stop(); } catch (e) { reject(e); }
      }

      video.currentTime = start;
      video.onseeked = function () {
        video.onseeked = null;
        try { rec.start(); } catch (e) { reject(e); return; }
        video.play().then(function () { raf = requestAnimationFrame(draw); }, reject);
      };
      /* Never hang: if the source stalls, close out what was captured. */
      setTimeout(stop, (len + 6) * 1000);
    });
  }

  function trimBody(st) {
    var pct = st.dur ? (st.start / st.dur) * 100 : 0;
    var end = Math.min(st.dur, st.start + Math.min(TRIM_MAX, st.dur));
    return '<div class="trim">'
      + '<video id="trimvid" class="vid" playsinline muted preload="metadata" src="' + h(st.url) + '"></video>'
      + '<p class="trimnote">Reference clips are capped at ' + TRIM_MAX + ' seconds. '
      + 'Drag to choose which ' + Math.round(Math.min(TRIM_MAX, st.dur)) + ' seconds to keep.</p>'
      + '<div class="trimrow"><b id="trimlabel">' + mmss(st.start) + ' \u2013 ' + mmss(end) + '</b>'
      + '<span>' + mmss(st.dur) + ' total</span></div>'
      + '<input id="trimstart" class="trimrange" type="range" min="0" step="0.1" '
      + 'max="' + Math.max(0, st.dur - Math.min(TRIM_MAX, st.dur)).toFixed(1) + '" value="' + st.start + '">'
      + '<div class="trimrow"><button class="chip" data-act="trimplay">Preview</button>'
      + '<span id="trimhint">' + (canReencode()
          ? 'Trimming re-encodes at 720p, so the upload stays small.'
          : 'This browser cannot re-encode, so the clip is stored with trim markers and plays as ' + TRIM_MAX + ' seconds.')
      + '</span></div>'
      + '<div class="trimbar" id="trimbar" hidden><i></i></div>'
      + '<button class="primary" data-act="trimgo">Use this clip</button>'
      + '<button class="ghost" data-act="closesheet">Cancel</button></div>';
  }

    if (a === 'recordvid' || a === 'uploadvid') {
      if (!it) return;
      if (!it.exerciseId) { toast('Save this as a library exercise before adding a video.'); return; }
      pickVideo(it, a === 'recordvid');
      return;
    }

    if (a === 'trimplay') {
      var tv = document.getElementById('trimvid');
      if (tv && TRIM) { tv.currentTime = TRIM.start; tv.play().catch(function () {}); 
        setTimeout(function () { try { tv.pause(); } catch (e) {} }, Math.min(TRIM_MAX, TRIM.dur) * 1000); }
      return;
    }
    if (a === 'trimgo') {
      if (!TRIM) return;
      doUpload(TRIM, TRIM.start, Math.min(TRIM_MAX, TRIM.dur));
      return;
    }
  var TRIM = null;

  /* ══ VIDEO CAPTURE ═════════════════════════════════════════════════════
     Two entry points, one path. Record opens the camera directly via the
     capture attribute; Choose opens the library.

     WHAT WAS ACTUALLY BROKEN
     The gym-exercise-media bucket did not exist in production, so every upload
     failed at storage no matter what the browser did. That is fixed in the
     database. On top of that, iOS Safari does not support
     canvas.captureStream, so canReencode() is false on an iPhone and a clip
     recorded on the spot went up at full size. A 4K HEVC .mov can exceed 100MB
     and be rejected.

     So the size ceiling is now checked BEFORE anything else, with a message
     that tells you what to do about it, and iPhone users get a one-time hint
     to record at 1080p rather than being left guessing.
     ═══════════════════════════════════════════════════════════════════════ */
  var MEDIA_MAX = 100 * 1024 * 1024;

  function pickVideo(it, useCamera) {
    var input = document.getElementById(useCamera ? 'vidcam' : 'vidfile');
    if (!input) return;
    input.value = '';
    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) return;

      if (file.size > MEDIA_MAX) {
        toast('That clip is ' + Math.round(file.size / 1048576) + ' MB, over the 100 MB limit. '
          + 'Record a shorter clip, or set Camera to 1080p in iPhone Settings.');
        return;
      }

      var url = URL.createObjectURL(file);
      var probe = document.createElement('video');
      probe.preload = 'metadata'; probe.muted = true; probe.playsInline = true;
      var settled = false;
      var go = function (dur) {
        if (settled) return; settled = true;
        TRIM = { file: file, url: url, dur: dur || 0, start: 0, key: it.key, id: it.exerciseId };
        if (!TRIM.dur || TRIM.dur <= TRIM_MAX + 0.25) { doUpload(TRIM, 0, TRIM.dur || TRIM_MAX); return; }
        openSheet('Trim clip', trimBody(TRIM), 'trim');
      };
      probe.onloadedmetadata = function () { go(probe.duration); };
      /* A .mov the browser cannot read metadata for still uploads: the trim
         is skipped rather than the whole thing failing. */
      probe.onerror = function () { go(0); };
      setTimeout(function () { go(0); }, 4000);
      probe.src = url;
    };
    input.click();
  }

  /* ══ POSTER FRAME ══════════════════════════════════════════════════════
     Draws one frame of the clip to a canvas and uploads it as a small JPEG, so
     the exercise card shows the movement instead of a play glyph.

     canvas.drawImage from a video DOES work on iOS Safari, unlike
     canvas.captureStream which is why the trimmer cannot re-encode there. So
     this runs everywhere.

     Best effort throughout: if the frame cannot be grabbed or the upload
     fails, the video still saves and the card falls back to the clip's own
     first frame. A missing thumbnail is never worth failing an upload over.
     ═══════════════════════════════════════════════════════════════════════ */
  function grabPoster(src, at) {
    return new Promise(function (resolve) {
      var v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'metadata';
      v.crossOrigin = 'anonymous';
      var done = false;
      var give = function (b) { if (done) return; done = true; try { v.src = ''; } catch (e) {} resolve(b || null); };
      v.onloadeddata = function () {
        try { v.currentTime = Math.min(Math.max(0.1, at || 0.4), (v.duration || 1) - 0.05); }
        catch (e) { give(null); }
      };
      v.onseeked = function () {
        try {
          var w = v.videoWidth, hgt = v.videoHeight;
          if (!w || !hgt) { give(null); return; }
          var sc = Math.min(1, 480 / Math.max(w, hgt));
          var c = document.createElement('canvas');
          c.width = Math.round(w * sc); c.height = Math.round(hgt * sc);
          c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
          c.toBlob(function (b) { give(b); }, 'image/jpeg', 0.72);
        } catch (e) { give(null); }
      };
      v.onerror = function () { give(null); };
      setTimeout(function () { give(null); }, 6000);
      v.src = src;
    });
  }

  function uploadPoster(exerciseId, blob) {
    if (!blob) return Promise.resolve(null);
    return post({ action: 'mediaUploadTicket', id: exerciseId, fileName: 'poster', contentType: 'image/jpeg' })
      .then(function (t) {
        if (!t || !t.ok || !t.signedUrl) return null;
        return uploadToSigned(t.signedUrl, blob).then(function () { return t.publicUrl; });
      })
      .catch(function () { return null; });
  }

  function doUpload(st, start, len) {
    var bar = document.getElementById('trimbar');
    var fill = bar && bar.querySelector('i');
    if (bar) bar.hidden = false;
    var hint = document.getElementById('trimhint');
    function say(t) { if (hint) hint.textContent = t; }

    var ready;
    if (canReencode() && st.dur > 0) {
      say('Trimming\u2026 this takes about ' + Math.round(len) + ' seconds.');
      var v = document.getElementById('trimvid') || (function () {
        var x = document.createElement('video'); x.src = st.url; x.muted = true; x.playsInline = true; return x;
        var exMgrSearchTimer=null;
  document.addEventListener('input',function(e){var t=e.target;if(t&&t.dataset&&(t.dataset.cpField||t.dataset.cpMeso||t.dataset.cpMicro))coachPeriodInput(t);});
  document.addEventListener('change',function(e){var t=e.target;if(t&&t.dataset&&t.dataset.cpProgram)coachPeriodInput(t);});
  document.addEventListener('input',function(e){if(!e.target||e.target.id!=='exmgrq')return;S.exMgr.q=e.target.value||'';clearTimeout(exMgrSearchTimer);exMgrSearchTimer=setTimeout(function(){if(S.view==='exercise-manager')loadExerciseManager(true);},180);});
})();
      v.muted = true;
      ready = reencode(v, start, len, function (p) { if (fill) fill.style.width = Math.round(p * 100) + '%'; })
        .then(function (blob) { return { blob: blob, trimmed: true }; })
        .catch(function () { return { blob: st.file, trimmed: false }; });
    } else {
      ready = Promise.resolve({ blob: st.file, trimmed: false });
    }

    ready.then(function (r) {
      say(r.trimmed ? 'Uploading trimmed clip\u2026' : 'Uploading\u2026');
      if (fill) fill.style.width = '100%';
      var name = (st.file.name || 'clip').replace(/\.[^.]+$/, '') + (r.trimmed ? '-trim' : '');
      var type = r.blob.type || st.file.type || 'video/mp4';
      return post({ action: 'mediaUploadTicket', id: st.id, fileName: name, contentType: type })
        .then(function (t) {
          if (!t || !t.ok || !t.signedUrl) throw new Error('Upload could not start');
          return uploadToSigned(t.signedUrl, r.blob).then(function () {
            /* When the file could not be re-encoded, the trim survives as
               markers and the player honours them. */
            return grabPoster(st.url, (r.trimmed ? 0 : start) + 0.4)
              .then(function (pb) { return uploadPoster(st.id, pb); })
              .then(function (posterUrl) {
                return post({ action: 'setMedia', id: st.id, media_url: t.publicUrl,
                              media_poster: posterUrl || null,
                              media_start: r.trimmed ? 0 : start,
                              media_end: r.trimmed ? null : start + len });
              });
          });
        });
    }).then(function (j) {
      if (!j || !j.ok) throw new Error('save failed');
      var itx = find(st.key);
      if (itx) { itx.media = j.media_url || itx.media; itx.mediaStart = j.media_start || 0; itx.mediaEnd = j.media_end || null; }
      try { URL.revokeObjectURL(st.url); } catch (e) {}
      TRIM = null;
      closeSheet();
      if (itx) { openSheet(itx.name, videoBody(itx), 'video'); }
      toast('Reference clip saved');
      touch();
    }).catch(function () {
      say('That video could not be uploaded. Try again.');
      if (bar) bar.hidden = true;
      toast('That video could not be uploaded.');
    });
  }

    if (a === 'savevid') {
      if (!it) return;
      var inp = document.getElementById('vidurl');
      var url = inp ? inp.value.trim() : '';
      if (url && !/^https?:\/\//i.test(url)) { toast('Use a full http:// or https:// video link.'); return; }
      var persist = it.exerciseId ? post({ action:'setMedia', id:it.exerciseId, media_url:url || null }) : Promise.resolve({ok:true});
      persist.then(function (j) {
        if (!j || !j.ok) { toast('That video link could not be saved.'); return; }
        it.media = url || null;
        var body = videoBody(it);
        var sb = document.getElementById('sheetB'); if (sb) sb.innerHTML = body;
        if (S.sheet) S.sheet.html = body;
        touch(); toast(url ? 'Reference video saved' : 'Reference video removed');
      });
      return;
    }
    if (a === 'clearvid') {
      if (!it) return;
      it.media = null;
      if (it.exerciseId) post({ action: 'setMedia', id: it.exerciseId, media_url: null });
      document.getElementById('sheetB').innerHTML = videoBody(it);
      S.sheet.html = videoBody(it);
      touch();
      return;
    }
    if (a === 'rest15') { rest += 15; paintRest(); return; }
    if (a === 'restskip') { rest = 0; clearInterval(restT); paintRest(); return; }
    if (a === 'rename') { openProgramEditor(); return; }
    if (a === 'saveinfo') {
      S.name = document.getElementById('wname').value || 'Session';
      S.notes = document.getElementById('wnote').value;
      closeSheet(); touch(); return;
    }
    if (a === 'tools') {
      openSheet('Tools',
        '<button class="ghost" data-act="savetpl">Save as template</button>'
        + (S.templates.length
          ? '<div style="margin-top:14px">' + S.templates.map(function (t) {
              return '<button class="hit" data-act="loadtpl" data-id="' + h(t.id) + '"><b>'
                + h(t.name) + '</b><span>Load</span></button>'; }).join('') + '</div>'
          : '<div class="empty">No templates saved yet.</div>'), 'tools');
      return;
    }
    if (a === 'savetpl') {
      var nm = prompt('Template name', S.name);
      if (!nm) return;
      post({ action: 'saveTemplate', name: nm, body: S.items }).then(function (j) {
        if (j && j.ok) { S.templates.unshift(j.template); toast('Template saved'); }
      });
      closeSheet(); return;
    }
    if (a === 'loadtpl') {
      post({ action: 'loadTemplate', id: b.getAttribute('data-id') }).then(function (j) {
        if (!j || !j.ok || !j.template) return;
        S.items = (j.template.body || []).map(function (x) {
          x.key = uid(); x.days = null; x.suggestion = null; x.open = false;
          x.sets = (x.sets || []).map(function (s) { s.done = false; return s; });
          return x;
        });
        S.name = j.template.name || S.name;
        S.items.forEach(loadHistory);
        closeSheet(); touch();
      });
      return;
    }
    if (a === 'newex') {
      openSheet('Create exercise',
        '<label class="fld"><span>Name</span><input id="nx_name"></label>'
        + '<label class="fld"><span>Category</span><select id="nx_cat">'
        + ['custom','warmup','stretch','push','pull','squat','hinge','core','carry','conditioning','isolation','plyometric','balance','fob']
            .map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></label>'
        + '<label class="fld"><span>Muscle-group filter</span><input id="nx_region" placeholder="shoulders, hips, core…"></label>'
        + '<label class="fld"><span>Equipment</span><input id="nx_eq" placeholder="barbell, cable, band\u2026"></label>'
        + '<label class="fld"><span>Muscles</span><input id="nx_mus" placeholder="comma separated"></label>'
        + '<div class="exedit__flags"><label class="exvar"><input type="checkbox" id="nx_uni"><span>Unilateral</span></label><label class="exvar"><input type="checkbox" id="nx_comp"><span>Compound</span></label></div>'
        + '<label class="fld"><span>Reference video URL</span><input id="nx_vid" placeholder="https://\u2026"></label>'
        + '<label class="fld"><span>Instructions</span><textarea id="nx_ins"></textarea></label>'
        + '<label class="fld"><span>Tracking variables</span></label>'
        + '<div class="vars" id="nx_vars">'
        + ['weight','reps','time','distance','resistance','rpe','rir','fm'].map(function (v) {
            return '<button data-act="var" data-v="' + v + '" data-on="'
              + (v === 'weight' || v === 'reps' ? '1' : '0') + '">'
              + (v === 'fm' ? 'FM Distance' : v) + '</button>'; }).join('')
        + '</div><button class="primary" data-act="createex">Create</button>', 'newex');
      return;
    }
    if (a === 'var') {
      b.setAttribute('data-on', b.getAttribute('data-on') === '1' ? '0' : '1'); return;
    }
    if (a === 'createex') {
      var vars = [].slice.call(document.querySelectorAll('#nx_vars button'))
        .filter(function (x) { return x.getAttribute('data-on') === '1'; })
        .map(function (x) { return x.getAttribute('data-v'); });
      var nm2 = document.getElementById('nx_name').value.trim();
      if (!nm2) { toast('Give the exercise a name.'); return; }
      post({ action: 'createExercise', name: nm2,
             category: document.getElementById('nx_cat').value,
             region: document.getElementById('nx_region').value.trim() || null,
             equipment: document.getElementById('nx_eq').value.trim() || null,
             muscles: document.getElementById('nx_mus').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean),
             unilateral: document.getElementById('nx_uni').checked,
             compound: document.getElementById('nx_comp').checked,
             media_url: document.getElementById('nx_vid').value.trim() || null,
             instructions: document.getElementById('nx_ins').value.trim() || null,
             vars: vars.length ? vars : ['weight','reps'] })
        .then(function (j) {
          if (j && j.ok && j.exercise) { addExercise(j.exercise); closeSheet(); toast('Created ' + j.exercise.name); }
        });
      return;
    }
    if (a === 'finish') {
      var done = 0, tot = 0;
      S.items.forEach(function (x) { x.sets.forEach(function (st) { tot++; if (st.done) done++; }); });
      if (!confirm('Finish this session? ' + done + ' of ' + tot + ' sets logged.')) return;
      var completedName = S.name || 'Workout', completedItems = cleanProgramItems(S.items);
      var wasScratch = S.fromScratch, finishPid = S.activeProgramId, finishDay = S.activeDayIndex;
      S.elapsed = elapsed(); S.running = false;
      post({ action: 'finish', id: S.session.id, body: S.items,
             duration: Math.round(S.elapsed), notes: S.notes }).then(function (j) {
        if (!j || !j.ok) { toast('Could not finish session. Your entries remain on device.'); return null; }
        /* The completed workout becomes the new default workout automatically.
           New exercises, removed exercises, order, circuits and the final
           working values all carry forward without asking the coach twice. */
        if (!wasScratch && finishPid != null && finishDay != null) {
          var prog = progById(finishPid);
          if (prog && prog.days && prog.days[finishDay]) {
            prog.days[finishDay].name = completedName;
            prog.days[finishDay].items = completedItems;
            return persistProgram(prog).then(function(){ return j; });
          }
        } else if (wasScratch) {
          var np = { name:'N/A', sub:'Saved workout', cursor:0, days:[{name:completedName,items:completedItems}] };
          return post({action:'saveProgram',memberId:S.client.id,name:'N/A',sub:'Saved workout',body:np}).then(function(saved){
            if(saved&&saved.ok&&saved.program){np.dbId=saved.program.id;S.programs.unshift(np);} return j;
          });
        }
        return j;
      }).then(function (j2) {
        if (!j2) return null;
        try { localStorage.removeItem(LKEY); } catch (e) {}
        return post({ action: 'memberHome', memberId: S.client.id });
      }).then(function (fresh) {
        if (!fresh || !fresh.ok) return;
        S.session = null; S.recent = fresh.recent || [];
        S.items = []; S.name = 'Session'; S.notes = ''; S.elapsed = 0; S.started = 0;
        S.running = false; S.dirty = false; S.progressData = null; S.view = 'home';
        S.fromScratch = false; S.activeProgramId = null; S.activeDayIndex = null; S.saveCustomOffer = null;
        render();
        setTimeout(function(){ toast('Session saved · workout updated'); }, 20);
      });
      return;
    }

  });

  /* Typing is always available: tap the value and type. */
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t.getAttribute) return;
    if (t.getAttribute('data-act') === 'section-select') {
      var sit = find(t.getAttribute('data-k')); if (sit) { sit.section = t.value; touch(); if (S.sheet && S.sheet.kind === 'editor') openProgramEditor(); }
      return;
    }
    if (t.getAttribute('data-act') === 'routine-section') {
      if (!S.routineDraft) return;
      var rit = S.routineDraft.items.filter(function(x){return x.key===t.getAttribute('data-k');})[0];
      if (rit) {
        if (rit.circuit) { var oldcid=rit.circuit.id; S.routineDraft.items.forEach(function(x){if(x.circuit&&x.circuit.id===oldcid)x.circuit=null;}); }
        rit.section = t.value; syncRoutineToBuilderDay(); renderRoutineBuilder();
      }
      return;
    }
    if (t.getAttribute('data-act') !== 'typed') return;
    var it = find(t.getAttribute('data-k'));
    if (!it) return;
    var si = parseInt(t.getAttribute('data-i'), 10), f = t.getAttribute('data-f');
    var raw = String(t.value).trim(), v;
    if (f === 'time' || f === 'fmTime') {
      var m = raw.split(':');
      v = m.length > 1 ? (parseInt(m[0], 10) || 0) * 60 + (parseInt(m[1], 10) || 0) : parseInt(raw, 10) || 0;
    } else { v = parseFloat(raw) || 0; }
    it.sets[si][f] = Math.max(0, v);
    if (si === 0) {
      for (var ps = 1; ps < it.sets.length; ps++) {
        if (!it.sets[ps].done && Object.prototype.hasOwnProperty.call(it.sets[ps], f)) {
          it.sets[ps][f] = it.sets[si][f];
        }
      }
    }
    touch();
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'trimstart' && TRIM) {
      TRIM.start = parseFloat(e.target.value) || 0;
      var tlen = Math.min(TRIM_MAX, TRIM.dur);
      var tlab = document.getElementById('trimlabel');
      if (tlab) tlab.textContent = mmss(TRIM.start) + ' \u2013 ' + mmss(Math.min(TRIM.dur, TRIM.start + tlen));
      var tvid = document.getElementById('trimvid');
      if (tvid) { try { tvid.currentTime = TRIM.start; } catch (err) {} }
      return;
    }
    if (e.target.id === 'libq') { libState.q = e.target.value; libState.offset = 0; libState.hasMore = false; clearTimeout(libT); libT = setTimeout(function(){ libSearch(false); }, 180); }
    if (e.target.id === 'cq') {
      var q = e.target.value.toLowerCase();
      document.getElementById('chits').innerHTML = S.clients
        .filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0; })
        .map(function (c) { return '<button class="hit" data-act="pick" data-id="' + h(c.id) + '"><b>'
          + h(c.name) + '</b><span>Open</span></button>'; }).join('');
    }
    if (e.target.id === 'progressq') {
      S.progressSearch = String(e.target.value || '');
      paintProgressExerciseHits();
    }
  });
  var libT = null;

  /* ══ DRAG TO REORDER ═══════════════════════════════════════════════
     Pointer Events, and the only element that declares touch-action:none is
     the 34px grip. That is what makes this work on iOS without breaking the
     page: the browser decides at gesture start who owns the scroll, and it
     only ever hands it to the handle. Everywhere else scrolling stays native,
     and nothing here calls preventDefault on the document.

     No layout is measured during the drag. Card tops are read ONCE on
     pointerdown, then every frame is a transform. Auto-scroll near the edges
     runs off the same rAF loop rather than its own interval.
     ═══════════════════════════════════════════════════════════════════ */
  var drag = null;

  document.addEventListener('pointerdown', function (e) {
    var g = e.target.closest && e.target.closest('[data-grip]');
    if (!g || e.button > 0) return;
    var key = g.getAttribute('data-grip');
    var card = document.querySelector('.ex[data-key="' + key + '"]');
    if (!card) return;

    var cards = [].slice.call(document.querySelectorAll('.ex[data-key]'));
    var from = cards.indexOf(card);
    if (from < 0) return;

    drag = {
      key: key, card: card, from: from, to: from, y0: e.clientY, dy: 0,
      /* measured once */
      boxes: cards.map(function (c) {
        var r = c.getBoundingClientRect();
        return { el: c, top: r.top, h: r.height, mid: r.top + r.height / 2 };
      }),
      raf: 0, scroll: 0
    };
    card.classList.add('dragging');
    cards.forEach(function (c) { if (c !== card) c.classList.add('shift'); });
    try { g.setPointerCapture(e.pointerId); } catch (err) {}
  });

  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    drag.dy = e.clientY - drag.y0;
    drag.card.style.transform = 'translateY(' + drag.dy + 'px)';

    /* where would it land? compare the dragged midpoint against the others */
    var mid = drag.boxes[drag.from].mid + drag.dy;
    var to = drag.from;
    for (var i = 0; i < drag.boxes.length; i++) {
      if (i === drag.from) continue;
      var b = drag.boxes[i];
      if (i < drag.from && mid < b.mid) { to = Math.min(to, i); }
      if (i > drag.from && mid > b.mid) { to = Math.max(to, i); }
    }
    if (to !== drag.to) {
      drag.to = to;
      var h = drag.boxes[drag.from].h + 11;
      drag.boxes.forEach(function (b, i) {
        if (i === drag.from) return;
        var shift = 0;
        if (drag.to > drag.from && i > drag.from && i <= drag.to) shift = -h;
        if (drag.to < drag.from && i < drag.from && i >= drag.to) shift = h;
        b.el.style.transform = shift ? 'translateY(' + shift + 'px)' : '';
      });
    }

    /* auto-scroll when the finger nears an edge */
    var pad = 90, vh = window.innerHeight;
    drag.scroll = e.clientY < pad ? -10 : (e.clientY > vh - pad ? 10 : 0);
    if (drag.scroll && !drag.raf) {
      var step = function () {
        if (!drag || !drag.scroll) { if (drag) drag.raf = 0; return; }
        window.scrollBy(0, drag.scroll);
        drag.raf = requestAnimationFrame(step);
      };
      drag.raf = requestAnimationFrame(step);
    }
  }, { passive: true });

  function endDrag() {
    if (!drag) return;
    var d = drag; drag = null;
    if (d.raf) cancelAnimationFrame(d.raf);
    d.boxes.forEach(function (b) { b.el.style.transform = ''; b.el.classList.remove('shift'); });
    d.card.classList.remove('dragging');
    if (d.to !== d.from) {
      var it = find(d.key);
      if (it) {
        S.items.splice(S.items.indexOf(it), 1);
        S.items.splice(d.to, 0, it);
        /* a moved exercise leaves any circuit it was pinned into */
        if (it.circuit) it.circuit = null;
        touch();
        return;
      }
    }
    render();
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'memberq') {
      var q=String(e.target.value||'').toLowerCase().trim(), box=document.getElementById('memberhits');
      if (!box) return;
      box.innerHTML=S.clients.filter(function(c){return !q || String(c.name||'').toLowerCase().indexOf(q)>=0;}).map(function(c){
        return '<button class="membercard" data-act="pick" data-id="'+h(c.id)+'"><span><b>'+h(c.name)+'</b><small>Confirmed member</small></span><i>Open</i></button>';
      }).join('') || '<div class="empty">No matching member.</div>';
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && S.sheet) closeSheet();
  });

  /* ── rest timer ───────────────────────────────────────────────────── */
  function startRest() { rest = 90; clearInterval(restT); restT = setInterval(function () {
    rest--; if (rest <= 0) { rest = 0; clearInterval(restT); } paintRest(); }, 1000); paintRest(); }
  function paintRest() {
    var el = document.getElementById('rest');
    if (!el) return;
    el.classList.toggle('open', rest > 0);
    var b = el.querySelector('b'); if (b) b.textContent = mmss(rest);
  }

  function openProgramEditor() {
    normalizeSections(S.items);
    var rows = SECTIONS.map(function (sec) {
      var items = S.items.filter(function (it) { return inferSection(it) === sec.id; });
      return '<section class="editorsec"><div class="editorsec__head"><b>' + h(sec.label) + '</b>'
        + '<button data-act="add-section" data-section="' + sec.id + '">+ Exercise</button></div>'
        + (items.length ? items.map(function (it) {
          return '<div class="editrow"><span>' + h(it.name) + '</span><select data-act="section-select" data-k="' + it.key + '">'
            + SECTIONS.map(function (x) { return '<option value="' + x.id + '"' + (inferSection(it) === x.id ? ' selected' : '') + '>' + h(x.label) + '</option>'; }).join('')
            + '</select><button data-act="up" data-k="' + it.key + '" aria-label="Move up">↑</button><button data-act="down" data-k="' + it.key + '" aria-label="Move down">↓</button>'
            + '<button data-act="circuit-edit" data-k="' + it.key + '">' + (it.circuit ? 'Circuit ✓' : 'Circuit') + '</button>'
            + '<button data-act="swap" data-k="' + it.key + '">Swap</button><button data-act="del" data-k="' + it.key + '">Remove</button></div>';
        }).join('') : '<div class="editorsec__empty">Empty section</div>') + '</section>';
    }).join('');
    openSheet('Edit workout', '<label class="fld"><span>Workout name</span><input id="wname" value="' + h(S.name) + '"></label>'
      + '<label class="fld"><span>Session note</span><textarea id="wnote">' + h(S.notes) + '</textarea></label>'
      + '<p class="edithelp">Edit exercise selection, order and section placement without leaving the workout.</p>'
      + rows + '<button class="primary" data-act="save-program-layout">Save workout structure</button>', 'editor');
  }

  function saveProgramLayout() {
    var wn = document.getElementById('wname'), nt = document.getElementById('wnote');
    if (wn) S.name = wn.value.trim() || S.name || 'Session';
    if (nt) S.notes = nt.value;
    normalizeSections(S.items);
    var prog = (S.programs || []).filter(function (p) { return String(p.dbId || p.id || '') === String(S.activeProgramId || ''); })[0];
    if (prog && S.activeDayIndex != null && prog.days && prog.days[S.activeDayIndex]) {
      prog.days[S.activeDayIndex].name = S.name;
      prog.days[S.activeDayIndex].items = cleanProgramItems(S.items);
      saveProgram(S.client.id, prog);
      post({ action:'saveProgram', id:prog.dbId || null, memberId:S.client.id, name:prog.name || 'Program', sub:prog.sub || null, body:prog })
        .then(function (j) {
          var nid2=programIdFrom(j); if(nid2&&prog){prog.dbId=nid2;}
          if (j && j.ok) toast('Workout structure saved');
          else toast('Could not sync workout yet. Your edits are kept on this device.');
        });
    } else { toast('Workout structure updated'); }
    closeSheet(); touch();
  }

  function saveCustomWorkout() {
    var o = S.saveCustomOffer;
    if (!o || !S.client) return;
    var workoutName = prompt('Workout name', o.name || 'Custom Workout');
    if (!workoutName) return;
    var prog = { name:'N/A', sub:'Saved workout', cursor:0, days:[{ name:workoutName, items:cleanProgramItems(o.items) }] };
    post({ action:'saveProgram', memberId:S.client.id, name:'N/A', sub:'Saved workout', body:prog }).then(function (j) {
      if (!j || !j.ok || !j.program) return;
      var body=j.program.body || prog; body.dbId=j.program.id; body.name='N/A'; body.sub='Saved workout';
      S.programs.unshift(body); S.saveCustomOffer=null; renderHome();
    });
  }

  /* ══ PROGRAM PRESETS ═══════════════════════════════════════════════
     STRUCTURES, not prescriptions. Each is a weekly split with a sensible
     exercise order and a rep target; the coach edits everything before it is
     assigned, and nothing here overrides a coaching decision.

     These follow ordinary, widely published resistance-training structure:
     ACSM and NSCA guidance for untrained adults (2 to 3 non-consecutive
     full-body days, compound-first ordering, roughly 8 to 12 reps), and the
     conventional upper/lower and push/pull/legs splits used to raise weekly
     frequency per muscle group as training age increases.

     They are NOT attributed to any gym, brand or proprietary system, and
     nothing here is drawn from a commercial programming database. The
     beginner options are deliberately the shortest.
     ═══════════════════════════════════════════════════════════════════ */
  var PRESETS = [
    { id:'begin-fb2', name:'Foundational Beginner', sub:'2 days · full body · start here',
      days:[
        ['Full Body A',['Goblet Squat','Dumbbell Bench Press','Seated Cable Row','Romanian Deadlift','Plank']],
        ['Full Body B',['Leg Press','Lat Pulldown','Seated Dumbbell Shoulder Press','Lying Leg Curl','Dead Bug']]
      ], target:{lo:8,hi:12}, sets:2 },
    { id:'begin-fb3', name:'Beginner Full Body', sub:'3 days · full body',
      days:[
        ['Full Body A',['Goblet Squat','Dumbbell Bench Press','Seated Cable Row','Glute Bridge','Plank']],
        ['Full Body B',['Romanian Deadlift','Lat Pulldown','Machine Chest Press','Leg Press','Pallof Press']],
        ['Full Body C',['Back Squat','Seated Dumbbell Shoulder Press','Chest Supported Row','Lying Leg Curl','Farmer Carry']]
      ], target:{lo:8,hi:12}, sets:3 },
    { id:'fb2', name:'Full Body', sub:'2 days',
      days:[
        ['Full Body A',['Back Squat','Barbell Bench Press','Barbell Row','Romanian Deadlift','Cable Crunch']],
        ['Full Body B',['Front Squat','Overhead Press','Lat Pulldown','Lying Leg Curl','Hanging Leg Raise']]
      ], target:{lo:6,hi:10}, sets:3 },
    { id:'fb3', name:'Full Body', sub:'3 days',
      days:[
        ['Full Body A',['Back Squat','Barbell Bench Press','Seated Cable Row','Lateral Raise','Plank']],
        ['Full Body B',['Romanian Deadlift','Overhead Press','Lat Pulldown','Leg Extension','Pallof Press']],
        ['Full Body C',['Front Squat','Incline Dumbbell Press','Chest Supported Row','Lying Leg Curl','Farmer Carry']]
      ], target:{lo:6,hi:10}, sets:3 },
    { id:'ul3', name:'Upper / Lower', sub:'3 days · alternating',
      days:[
        ['Upper A',['Barbell Bench Press','Barbell Row','Seated Dumbbell Shoulder Press','Lat Pulldown','Dumbbell Biceps Curl','Cable Triceps Pressdown']],
        ['Lower A',['Back Squat','Romanian Deadlift','Leg Press','Lying Leg Curl','Standing Calf Raise']],
        ['Upper B',['Overhead Press','Chest Supported Row','Incline Dumbbell Press','Single Arm Dumbbell Row','Lateral Raise','Face Pull']]
      ], target:{lo:6,hi:10}, sets:3 },
    { id:'ul4', name:'Upper / Lower', sub:'4 days',
      days:[
        ['Upper A',['Barbell Bench Press','Barbell Row','Seated Dumbbell Shoulder Press','Lat Pulldown','Dumbbell Biceps Curl','Cable Triceps Pressdown']],
        ['Lower A',['Back Squat','Romanian Deadlift','Leg Press','Lying Leg Curl','Standing Calf Raise']],
        ['Upper B',['Incline Dumbbell Press','Seated Cable Row','Overhead Press','Pull-Up','Lateral Raise','Face Pull']],
        ['Lower B',['Conventional Deadlift','Bulgarian Split Squat','Hip Thrust','Seated Leg Curl','Seated Calf Raise']]
      ], target:{lo:6,hi:10}, sets:3 },
    { id:'ppl3', name:'Push / Pull / Legs', sub:'3 days',
      days:[
        ['Push',['Barbell Bench Press','Overhead Press','Incline Dumbbell Press','Lateral Raise','Cable Triceps Pressdown']],
        ['Pull',['Barbell Row','Lat Pulldown','Chest Supported Row','Face Pull','Dumbbell Biceps Curl']],
        ['Legs',['Back Squat','Romanian Deadlift','Leg Press','Lying Leg Curl','Standing Calf Raise']]
      ], target:{lo:6,hi:10}, sets:3 },
    { id:'ppl6', name:'Push / Pull / Legs', sub:'6 days',
      days:[
        ['Push A',['Barbell Bench Press','Overhead Press','Incline Dumbbell Press','Lateral Raise','Rope Triceps Pressdown']],
        ['Pull A',['Barbell Row','Pull-Up','Chest Supported Row','Face Pull','Barbell Biceps Curl']],
        ['Legs A',['Back Squat','Romanian Deadlift','Leg Press','Lying Leg Curl','Standing Calf Raise']],
        ['Push B',['Seated Dumbbell Shoulder Press','Dumbbell Bench Press','Cable Fly','Cable Lateral Raise','Skull Crusher']],
        ['Pull B',['Conventional Deadlift','Lat Pulldown','Seated Cable Row','Reverse Fly','Hammer Curl']],
        ['Legs B',['Front Squat','Hip Thrust','Bulgarian Split Squat','Seated Leg Curl','Seated Calf Raise']]
      ], target:{lo:6,hi:12}, sets:3 },
    { id:'arnold', name:'Arnold Split', sub:'Chest + Back · Shoulders + Arms · Legs',
      days:[
        ['Chest + Back',['Barbell Bench Press','Barbell Row','Incline Dumbbell Press','Lat Pulldown','Cable Fly','Straight Arm Pulldown']],
        ['Shoulders + Arms',['Overhead Press','Lateral Raise','Reverse Fly','Barbell Biceps Curl','Skull Crusher','Hammer Curl']],
        ['Legs',['Back Squat','Romanian Deadlift','Leg Press','Lying Leg Curl','Standing Calf Raise']]
      ], target:{lo:8,hi:12}, sets:3 },
    { id:'bb4', name:'Bodybuilding', sub:'4 days',
      days:[
        ['Chest + Triceps',['Barbell Bench Press','Incline Dumbbell Press','Cable Fly','Rope Triceps Pressdown','Overhead Cable Triceps Extension']],
        ['Back + Biceps',['Barbell Row','Lat Pulldown','Seated Cable Row','Barbell Biceps Curl','Incline Dumbbell Curl']],
        ['Legs',['Back Squat','Romanian Deadlift','Leg Press','Leg Extension','Standing Calf Raise']],
        ['Shoulders + Arms',['Overhead Press','Lateral Raise','Reverse Fly','Hammer Curl','Skull Crusher']]
      ], target:{lo:8,hi:12}, sets:3 },
    { id:'bb5', name:'Bodybuilding', sub:'5 days',
      days:[
        ['Chest',['Barbell Bench Press','Incline Dumbbell Press','Cable Fly','Machine Chest Press','Dip']],
        ['Back',['Barbell Row','Pull-Up','Seated Cable Row','Straight Arm Pulldown','Shrug']],
        ['Legs',['Back Squat','Romanian Deadlift','Leg Press','Lying Leg Curl','Standing Calf Raise']],
        ['Shoulders',['Overhead Press','Lateral Raise','Reverse Fly','Face Pull','Upright Row']],
        ['Arms',['Barbell Biceps Curl','Skull Crusher','Hammer Curl','Rope Triceps Pressdown','Cable Curl']]
      ], target:{lo:8,hi:12}, sets:3 },
    { id:'sh', name:'General Strength + Hypertrophy', sub:'4 days · heavy first, volume after',
      days:[
        ['Lower Strength',['Back Squat','Romanian Deadlift','Bulgarian Split Squat','Lying Leg Curl','Standing Calf Raise']],
        ['Upper Strength',['Barbell Bench Press','Barbell Row','Overhead Press','Pull-Up','Face Pull']],
        ['Lower Volume',['Conventional Deadlift','Leg Press','Hip Thrust','Leg Extension','Seated Calf Raise']],
        ['Upper Volume',['Incline Dumbbell Press','Seated Cable Row','Lateral Raise','Dumbbell Biceps Curl','Cable Triceps Pressdown']]
      ], target:{lo:5,hi:10}, sets:4 }
  ];

  function presetById(id) { for (var i=0;i<PRESETS.length;i++) if (PRESETS[i].id===id) return PRESETS[i]; return null; }

  /* Turn a preset day into real items by resolving each name against the
     library, so a preset never invents an exercise that does not exist. */
  function buildDay(preset, dayIx) {
    var names = preset.days[dayIx][1];
    return post({ action: 'search', q: '', limit: 200 }).then(function () {
      return Promise.all(names.map(function (n) {
        return post({ action: 'search', q: n, limit: 5 }).then(function (j) {
          var rows = (j && j.exercises) || [];
          var hit = rows.filter(function (e) { return e.name.toLowerCase() === n.toLowerCase(); })[0] || rows[0];
          return hit || null;
        });
      }));
    }).then(function (found) {
      return found.filter(Boolean).map(function (ex) {
        var vars = (ex.vars && ex.vars.length) ? ex.vars : ['weight','reps'];
        var sets = [];
        for (var i=0;i<preset.sets;i++) sets.push(blankSet(vars));
        return { key: uid(), exerciseId: ex.id, name: ex.name, vars: vars, category: ex.category || null,
                 media: ex.media_url || null, note: '', circuit: null,
                 sets: sets, target: preset.target, days: null, suggestion: null };
      });
    });
  }

  /* ══ R48 · CANONICAL MEMBER PERIODIZATION — COACH VIEW ═══════════════ */
  var COACH_PERIOD_DEFS={
    'Macrocycle':'The largest training plan: a long-term goal or season containing multiple focused training blocks.',
    'Mesocycle':'A focused block inside a macrocycle, usually several weeks long and built around a specific adaptation or objective.',
    'Microcycle':'The smallest programmed cycle, commonly about one week, containing the individual workouts or training sessions.',
    'Progressive Overload':'A deliberate increase in training challenge over time using load, repetitions, sets, range of motion, difficulty, density, frequency or another appropriate variable.',
    'Deload':'A planned period of reduced training stress used to support recovery.',
    'Volume':'How much training work is performed, such as sets, reps, distance, time or total external load.',
    'Intensity':'How demanding the work is: load, pace, effort, speed or proximity to failure depending on the activity.',
    'Frequency':'How often training is performed within a period.',
    'RPE':'Rate of Perceived Exertion, usually a 1–10 effort scale.',
    'RIR':'Repetitions in Reserve: the estimated good repetitions left before failure.'
  };
  function coachPeriodDef(term){return '<button type="button" class="coach-period-term" data-act="period-def" data-term="'+h(term)+'">'+h(term)+'</button>';}
  function coachPeriodUid(prefix){return String(prefix||'n')+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);}
  function coachPeriodNew(){return{id:'',version:1,name:'12-Week Training Plan',goal:'',startDate:new Date().toISOString().slice(0,10),endDate:'',notes:'',mesocycles:[{id:coachPeriodUid('meso'),name:'Block 1',goal:'',startDate:'',endDate:'',durationWeeks:4,frequency:3,volumeTarget:'',intensityTarget:'',progressionStrategy:'',deload:'',notes:'',microcycles:[{id:coachPeriodUid('micro'),name:'Week 1',startDate:'',endDate:'',programIds:[],plannedExercises:'',volumeTarget:'',intensityTarget:'',progressionTarget:'',notes:''}]}]};}
  function coachPeriodDraft(){if(!S.periodizationDraft)S.periodizationDraft=clone((S.periodizationPlans&&S.periodizationPlans[0])||coachPeriodNew());return S.periodizationDraft;}
  function coachPeriodPrograms(mc,mi,wi){var selected=Array.isArray(mc.programIds)?mc.programIds:[];if(!(S.programs||[]).length)return '<p class="coach-period-empty">No saved program is available to link yet.</p>';return '<div class="coach-period-programs">'+S.programs.map(function(p){var id=String(p.dbId||p.id||'');return '<label><input type="checkbox" data-cp-program="'+mi+':'+wi+'" value="'+h(id)+'" '+(selected.indexOf(id)>=0?'checked':'')+'><span>'+h(p.name||'Program')+'</span></label>';}).join('')+'</div>';}
  function renderCoachPeriodization(){var p=coachPeriodDraft(),plans=S.periodizationPlans||[],html='<header class="hd"><div class="hd__meta"><h1>Periodization</h1><time>'+todayLabel()+'</time></div></header><div class="home coach-periodization"><div class="coach-period-top"><button class="ghost" data-act="period-back">← Member home</button><div><span>MEMBER</span><b>'+h(S.client&&S.client.name||'')+'</b></div></div><nav class="coach-period-defs">'+coachPeriodDef('Macrocycle')+coachPeriodDef('Mesocycle')+coachPeriodDef('Microcycle')+coachPeriodDef('Progressive Overload')+'</nav>';
    if(plans.length>1)html+='<div class="coach-period-existing"><span>SAVED PLANS</span>'+plans.map(function(x){return '<button data-act="period-load" data-id="'+h(x.id)+'" data-on="'+(String(x.id)===String(p.id)?'1':'0')+'">'+h(x.name||'Training Plan')+'</button>';}).join('')+'</div>';
    html+='<section class="coach-period-card coach-period-macro"><header><div><span>'+coachPeriodDef('Macrocycle')+'</span><h2>LONG-TERM PLAN</h2></div><button data-act="period-new">NEW PLAN</button></header><div class="coach-period-grid"><label><span>NAME</span><input data-cp-field="name" value="'+h(p.name||'')+'"></label><label><span>GOAL</span><input data-cp-field="goal" value="'+h(p.goal||'')+'"></label><label><span>START</span><input type="date" data-cp-field="startDate" value="'+h(p.startDate||'')+'"></label><label><span>END</span><input type="date" data-cp-field="endDate" value="'+h(p.endDate||'')+'"></label></div><label class="coach-period-notes"><span>NOTES</span><textarea data-cp-field="notes">'+h(p.notes||'')+'</textarea></label></section>';
    (p.mesocycles||[]).forEach(function(m,mi){html+='<section class="coach-period-card coach-period-meso"><header><div><em>'+String(mi+1).padStart(2,'0')+'</em><div><span>'+coachPeriodDef('Mesocycle')+'</span><h3>'+h(m.name||('Block '+(mi+1)))+'</h3></div></div><button data-act="period-remove-meso" data-m="'+mi+'">×</button></header><div class="coach-period-grid"><label><span>BLOCK NAME</span><input data-cp-meso="'+mi+':name" value="'+h(m.name||'')+'"></label><label><span>EMPHASIS / GOAL</span><input data-cp-meso="'+mi+':goal" value="'+h(m.goal||'')+'"></label><label><span>START</span><input type="date" data-cp-meso="'+mi+':startDate" value="'+h(m.startDate||'')+'"></label><label><span>END</span><input type="date" data-cp-meso="'+mi+':endDate" value="'+h(m.endDate||'')+'"></label><label><span>DURATION · WEEKS</span><input type="number" min="1" max="104" data-cp-meso="'+mi+':durationWeeks" value="'+h(m.durationWeeks||'')+'"></label><label><span>'+coachPeriodDef('Frequency')+' · DAYS/WK</span><input type="number" min="1" max="14" data-cp-meso="'+mi+':frequency" value="'+h(m.frequency||'')+'"></label><label><span>'+coachPeriodDef('Volume')+' TARGET</span><input data-cp-meso="'+mi+':volumeTarget" value="'+h(m.volumeTarget||'')+'"></label><label><span>'+coachPeriodDef('Intensity')+' TARGET</span><input data-cp-meso="'+mi+':intensityTarget" value="'+h(m.intensityTarget||'')+'"></label><label><span>PROGRESSION STRATEGY</span><input data-cp-meso="'+mi+':progressionStrategy" value="'+h(m.progressionStrategy||'')+'"></label><label><span>'+coachPeriodDef('Deload')+'</span><input data-cp-meso="'+mi+':deload" value="'+h(m.deload||'')+'"></label></div><div class="coach-period-micros">';
      (m.microcycles||[]).forEach(function(mc,wi){html+='<article class="coach-period-micro"><header><div><span>'+coachPeriodDef('Microcycle')+' '+(wi+1)+'</span><b>'+h(mc.name||('Week '+(wi+1)))+'</b></div><button data-act="period-remove-micro" data-m="'+mi+'" data-w="'+wi+'">×</button></header><div class="coach-period-grid"><label><span>WEEK / NAME</span><input data-cp-micro="'+mi+':'+wi+':name" value="'+h(mc.name||'')+'"></label><label><span>START</span><input type="date" data-cp-micro="'+mi+':'+wi+':startDate" value="'+h(mc.startDate||'')+'"></label><label><span>END</span><input type="date" data-cp-micro="'+mi+':'+wi+':endDate" value="'+h(mc.endDate||'')+'"></label></div><span class="coach-period-label">LINKED PROGRAMS / WORKOUTS</span>'+coachPeriodPrograms(mc,mi,wi)+'<label class="coach-period-notes"><span>PLANNED EXERCISES / FOCUS</span><textarea data-cp-micro="'+mi+':'+wi+':plannedExercises">'+h(mc.plannedExercises||'')+'</textarea></label><div class="coach-period-grid"><label><span>'+coachPeriodDef('Volume')+' TARGET</span><input data-cp-micro="'+mi+':'+wi+':volumeTarget" value="'+h(mc.volumeTarget||'')+'"></label><label><span>'+coachPeriodDef('Intensity')+' TARGET</span><input data-cp-micro="'+mi+':'+wi+':intensityTarget" value="'+h(mc.intensityTarget||'')+'"></label><label><span>PROGRESSION TARGET</span><input data-cp-micro="'+mi+':'+wi+':progressionTarget" value="'+h(mc.progressionTarget||'')+'"></label></div><label class="coach-period-notes"><span>NOTES</span><textarea data-cp-micro="'+mi+':'+wi+':notes">'+h(mc.notes||'')+'</textarea></label></article>';});
      html+='<button class="ghost coach-period-add" data-act="period-add-micro" data-m="'+mi+'">＋ ADD MICROCYCLE</button></div></section>';});
    html+='<button class="ghost coach-period-add" data-act="period-add-meso">＋ ADD MESOCYCLE</button><section class="coach-period-truth"><b>PLANNED ≠ ACTUAL</b><p>Periodization edits the member’s future plan. Completed sessions remain canonical workout history and are never rewritten to make progression appear successful.</p></section><button class="primary coach-period-save" data-act="period-save">SAVE MEMBER PERIODIZATION</button></div>';app.innerHTML=html;}
  function coachPeriodInput(t){var p=S.periodizationDraft;if(!p)return;if(t.dataset.cpField){p[t.dataset.cpField]=t.value;return;}if(t.dataset.cpMeso){var a=t.dataset.cpMeso.split(':'),m=p.mesocycles&&p.mesocycles[+a[0]];if(m)m[a[1]]=t.type==='number'?(t.value===''?null:Number(t.value)):t.value;return;}if(t.dataset.cpMicro){var b=t.dataset.cpMicro.split(':'),me=p.mesocycles&&p.mesocycles[+b[0]],mc=me&&me.microcycles&&me.microcycles[+b[1]];if(mc)mc[b[2]]=t.value;return;}if(t.dataset.cpProgram){var c=t.dataset.cpProgram.split(':'),meso=p.mesocycles&&p.mesocycles[+c[0]],micro=meso&&meso.microcycles&&meso.microcycles[+c[1]];if(!micro)return;micro.programIds=Array.isArray(micro.programIds)?micro.programIds:[];var id=t.value,ix=micro.programIds.indexOf(id);if(t.checked&&ix<0)micro.programIds.push(id);if(!t.checked&&ix>=0)micro.programIds.splice(ix,1);}}
  function coachPeriodAddMeso(){var p=coachPeriodDraft();p.mesocycles=Array.isArray(p.mesocycles)?p.mesocycles:[];p.mesocycles.push({id:coachPeriodUid('meso'),name:'Block '+(p.mesocycles.length+1),goal:'',startDate:'',endDate:'',durationWeeks:4,frequency:3,volumeTarget:'',intensityTarget:'',progressionStrategy:'',deload:'',notes:'',microcycles:[{id:coachPeriodUid('micro'),name:'Week 1',startDate:'',endDate:'',programIds:[],plannedExercises:'',volumeTarget:'',intensityTarget:'',progressionTarget:'',notes:''}]});renderCoachPeriodization();}
  function coachPeriodAddMicro(mi){var p=coachPeriodDraft(),m=p.mesocycles&&p.mesocycles[mi];if(!m)return;m.microcycles=Array.isArray(m.microcycles)?m.microcycles:[];m.microcycles.push({id:coachPeriodUid('micro'),name:'Week '+(m.microcycles.length+1),startDate:'',endDate:'',programIds:[],plannedExercises:'',volumeTarget:'',intensityTarget:'',progressionTarget:'',notes:''});renderCoachPeriodization();}
  function coachPeriodRemoveMeso(mi){var p=coachPeriodDraft();if(!p.mesocycles||p.mesocycles.length<2){toast('Keep at least one mesocycle.');return;}p.mesocycles.splice(mi,1);renderCoachPeriodization();}
  function coachPeriodRemoveMicro(mi,wi){var p=coachPeriodDraft(),m=p.mesocycles&&p.mesocycles[mi];if(!m||!m.microcycles||m.microcycles.length<2){toast('Keep at least one microcycle in that block.');return;}m.microcycles.splice(wi,1);renderCoachPeriodization();}
  function saveCoachPeriodization(){var p=coachPeriodDraft();post({action:'savePeriodization',memberId:S.client.id,id:p.id||'',version:p.version||1,plan:p}).then(function(j){if(!j||!j.ok){toast((j&&j.error)||'Periodization could not be saved.');return;}S.periodizationDraft=clone(j.plan);var ix=S.periodizationPlans.findIndex(function(x){return String(x.id)===String(j.plan.id);});if(ix>=0)S.periodizationPlans[ix]=clone(j.plan);else S.periodizationPlans.unshift(clone(j.plan));renderCoachPeriodization();toast('Member periodization saved.');});}


  /* R48 — BODY / ACTIVITY coach mirror. This is not a second data model:
     every read/write below uses the same member_body_* / member_activity_*
     rows as the member MAH Progress surfaces. */
  function coachTrainingModel(){var x=S.trainingFoundation||{};return{profile:x.profile||{},measurements:Array.isArray(x.measurements)?x.measurements:[],healthDays:Array.isArray(x.healthDays)?x.healthDays:[],activitySegments:Array.isArray(x.activitySegments)?x.activitySegments:[]};}
  function coachLatestBody(){var f=coachTrainingModel(),weights=[];f.healthDays.forEach(function(d){var w=d&&d.metrics&&Number(d.metrics.bodyWeightLb);if(Number.isFinite(w))weights.push({date:d.day,weight:w});});f.measurements.forEach(function(m){var w=Number(m.weight_lb);if(Number.isFinite(w))weights.push({date:m.measured_on,weight:w});});weights.sort(function(a,b){return String(a.date).localeCompare(String(b.date));});var waist=f.measurements.filter(function(m){return m.waist_in!=null;}).sort(function(a,b){return String(a.measured_on).localeCompare(String(b.measured_on));}),bf=f.measurements.filter(function(m){return m.body_fat_pct!=null;}).sort(function(a,b){return String(a.measured_on).localeCompare(String(b.measured_on));});return{weight:weights.length?Number(weights[weights.length-1].weight):null,waist:waist.length?Number(waist[waist.length-1].waist_in):null,bodyFatPct:bf.length?Number(bf[bf.length-1].body_fat_pct):null};}
  function coachRfmEstimate(heightIn,waistIn,sex){heightIn=Number(heightIn);waistIn=Number(waistIn);sex=String(sex||'');if(!Number.isFinite(heightIn)||heightIn<=0||!Number.isFinite(waistIn)||waistIn<=0||['male','female'].indexOf(sex)<0)return null;var value=(sex==='male'?64:76)-20*(heightIn/waistIn);return Number.isFinite(value)&&value>1&&value<70?value:null;}
  function coachLatestBodyFat(){var f=coachTrainingModel(),p=f.profile||{},hgt=Number(p.height_in),by={};f.measurements.forEach(function(m){var date=String(m.measured_on||'');if(!date)return;var manual=Number(m.body_fat_pct);if(Number.isFinite(manual)&&manual>0&&manual<70){by[date]={date:date,value:manual,estimated:false,low:manual,high:manual};return;}var est=coachRfmEstimate(hgt,m.waist_in,p.body_fat_formula_sex);if(est!=null)by[date]={date:date,value:est,estimated:true,low:Math.max(1,est-3),high:Math.min(69,est+3)};});var dates=Object.keys(by).sort();return dates.length?by[dates[dates.length-1]]:null;}
  function coachBodyCalc(){var f=coachTrainingModel(),p=f.profile||{},latest=coachLatestBody(),bfRow=coachLatestBodyFat(),hgt=Number(p.height_in),w=Number(latest.weight),bf=bfRow?Number(bfRow.value):null,bfEstimated=!!(bfRow&&bfRow.estimated),bmi=Number.isFinite(w)&&w>0&&Number.isFinite(hgt)&&hgt>0?w*703/(hgt*hgt):null,ff=null;if(Number.isFinite(bf)&&(!bfEstimated||p.use_estimated_body_fat_for_ffmi)){var hm=hgt*.0254,leanKg=w*(1-bf/100)*.45359237,raw=leanKg/(hm*hm);if(Number.isFinite(raw))ff={raw:raw,normalized:raw+6.1*(1.8-hm)};}return{bmi:bmi,bodyFatPct:Number.isFinite(bf)?bf:null,bodyFatEstimated:bfEstimated,bodyFatLow:bfRow?bfRow.low:null,bodyFatHigh:bfRow?bfRow.high:null,ffmi:ff};}
  function coachFFMI(){return coachBodyCalc().ffmi;}
  function coachBodyProfilePayload(){function v(id){var n=document.getElementById(id);return n?n.value:'';}function c(id){var n=document.getElementById(id);return!!(n&&n.checked);}return{ageYears:v('cfAge'),heightIn:v('cfHeight'),goalWeightLb:v('cfGoalWeight'),bodyFatFormulaSex:v('cfBodyFatSex'),useEstimatedBodyFatForFfmi:c('cfUseEstimatedBf'),goalBodyFatPct:v('cfGoalBodyFat'),goalFfmi:v('cfGoalFfmi'),tdeeFormulaSex:v('cfSex'),activityFactor:v('cfActivity'),deficitDeltaKcal:v('cfDeficit'),surplusDeltaKcal:v('cfSurplus'),proteinGPerLb:v('cfProtein'),fatGPerLb:v('cfFat'),macroScenario:v('cfMacroScenario')};}
  function renderCoachTrainingFoundation(){var f=coachTrainingModel(),p=f.profile||{},latest=coachLatestBody(),calc=coachBodyCalc(),ff=calc.ffmi,segments=f.activitySegments||[],ms=f.measurements.slice().reverse().slice(0,12),html='<header class="hd"><div class="hd__meta"><h1>Body / Activity</h1><time>'+todayLabel()+'</time></div></header><main class="home coach-foundation"><div class="coach-period-top"><button class="ghost" data-act="training-foundation-back">← Member home</button><div><span>MEMBER</span><b>'+h(S.client&&S.client.name||'')+'</b></div></div><div class="coach-foundation-actions"><button data-act="training-foundation-refresh">REFRESH CANONICAL DATA</button></div>';
    html+='<section class="coach-foundation-panel"><header><span>BODY PROFILE</span><b>MEMBER + COACH SHARE THESE VALUES</b></header><div class="coach-foundation-grid"><label><span>AGE</span><input id="cfAge" type="number" min="1" max="120" value="'+h(p.age_years==null?'':p.age_years)+'"></label><label><span>HEIGHT · IN</span><input id="cfHeight" type="number" step="0.1" value="'+h(p.height_in==null?'':p.height_in)+'"></label><label><span>GOAL WEIGHT · LB</span><input id="cfGoalWeight" type="number" step="0.1" value="'+h(p.goal_weight_lb==null?'':p.goal_weight_lb)+'"></label><label><span>BODY-FAT FORMULA</span><select id="cfBodyFatSex"><option value="">NOT SET</option><option value="male" '+(p.body_fat_formula_sex==='male'?'selected':'')+'>MALE</option><option value="female" '+(p.body_fat_formula_sex==='female'?'selected':'')+'>FEMALE</option></select></label><label><span>HYPOTHETICAL BODY-FAT GOAL · %</span><input id="cfGoalBodyFat" type="number" min="1" max="69" step="0.1" value="'+h(p.goal_body_fat_pct==null?'':p.goal_body_fat_pct)+'"></label><label><span>HYPOTHETICAL FFMI GOAL</span><input id="cfGoalFfmi" type="number" min="10" max="40" step="0.1" value="'+h(p.goal_ffmi==null?'':p.goal_ffmi)+'"></label><label class="coach-estimate-toggle"><input id="cfUseEstimatedBf" type="checkbox" '+(p.use_estimated_body_fat_for_ffmi?'checked':'')+'><span>USE ESTIMATED BODY FAT FOR FFMI</span></label><label><span>TDEE FORMULA</span><select id="cfSex"><option value="">NOT SET</option><option value="male" '+(p.tdee_formula_sex==='male'?'selected':'')+'>MALE</option><option value="female" '+(p.tdee_formula_sex==='female'?'selected':'')+'>FEMALE</option></select></label><label><span>ACTIVITY FACTOR</span><input id="cfActivity" type="number" step="0.025" value="'+h(p.activity_factor==null?'':p.activity_factor)+'"></label><label><span>MACRO SCENARIO</span><select id="cfMacroScenario"><option value="maintenance" '+((p.macro_scenario||'maintenance')==='maintenance'?'selected':'')+'>MAINTENANCE</option><option value="deficit" '+(p.macro_scenario==='deficit'?'selected':'')+'>DEFICIT</option><option value="surplus" '+(p.macro_scenario==='surplus'?'selected':'')+'>SURPLUS</option></select></label><label><span>DEFICIT · KCAL</span><input id="cfDeficit" type="number" value="'+h(p.deficit_delta_kcal==null?500:p.deficit_delta_kcal)+'"></label><label><span>SURPLUS · KCAL</span><input id="cfSurplus" type="number" value="'+h(p.surplus_delta_kcal==null?250:p.surplus_delta_kcal)+'"></label><label><span>PROTEIN · G/LB</span><input id="cfProtein" type="number" step="0.05" value="'+h(p.protein_g_per_lb==null?.8:p.protein_g_per_lb)+'"></label><label><span>FAT · G/LB</span><input id="cfFat" type="number" step="0.05" value="'+h(p.fat_g_per_lb==null?.3:p.fat_g_per_lb)+'"></label></div><button class="primary coach-foundation-save" data-act="coach-body-profile-save">SAVE MEMBER BODY PROFILE</button></section>';
    html+='<section class="coach-foundation-panel"><header><span>DATED BODY MEASUREMENT</span><b>WRITES THE SAME HISTORY THE MEMBER SEES</b></header><div class="coach-foundation-grid"><label><span>DATE</span><input id="cfMeasureDate" type="date" value="'+new Date().toISOString().slice(0,10)+'"></label><label><span>WEIGHT · LB</span><input id="cfMeasureWeight" type="number" step="0.1"></label><label><span>WAIST · IN</span><input id="cfMeasureWaist" type="number" step="0.1"></label><label><span>BODY FAT · %</span><input id="cfMeasureBodyFat" type="number" step="0.1" min="0.1" max="69.9"></label></div><button class="primary coach-foundation-save" data-act="coach-body-measure-save">ADD / UPDATE DATED ENTRY</button><div class="coach-foundation-current coach-foundation-current--calc"><span><small>LATEST WEIGHT</small><b>'+(latest.weight==null?'—':latest.weight.toFixed(1)+' LB')+'</b></span><span><small>BMI</small><b>'+(calc.bmi==null?'—':calc.bmi.toFixed(1))+'</b></span><span><small>BODY FAT</small><b>'+(calc.bodyFatPct==null?'—':calc.bodyFatPct.toFixed(1)+'%'+(calc.bodyFatEstimated?' EST.':''))+'</b></span><span><small>FFMI · NORMALIZED</small><b>'+(ff?ff.normalized.toFixed(1):'—')+'</b></span></div><div class="coach-calculator-goals"><span>GOAL WEIGHT <b>'+(p.goal_weight_lb==null?'—':h(p.goal_weight_lb)+' LB')+'</b></span><span>GOAL BODY FAT <b>'+(p.goal_body_fat_pct==null?'—':h(p.goal_body_fat_pct)+'%')+'</b></span><span>GOAL FFMI <b>'+(p.goal_ffmi==null?'—':h(p.goal_ffmi))+'</b></span></div><p class="coach-foundation-note">Same calculator inputs the member sees: BMI uses height + weight; the simple body-fat estimate uses height + relaxed waist + the selected formula and displays a ±3-point range; FFMI uses manual body fat first and only uses the estimate when that option is enabled. Higher FFMI generally means more muscular / more jacked; a very high score can look steroid-level, but it cannot prove PED use.</p><div class="coach-measure-list">'+(ms.length?ms.map(function(m){return'<div><b>'+h(m.measured_on||'')+'</b><span>'+(m.weight_lb==null?'—':h(m.weight_lb)+' LB')+'</span><span>'+(m.waist_in==null?'—':h(m.waist_in)+' IN WAIST')+'</span><span>'+(m.body_fat_pct==null?'—':h(m.body_fat_pct)+'% BF')+'</span></div>';}).join(''):'<p>No manual body measurements yet.</p>')+'</div></section>';
    html+='<section class="coach-foundation-panel"><header><span>ACTIVITY / PEDOMETER</span><b>SAME MEMBER ACTIVITY SEGMENTS</b></header><p class="coach-foundation-note">Member merge/split/relabel edits update these same rows. Device-derived totals remain source-aware; MAHFITT does not blindly add overlapping phone + Watch samples.</p><div class="coach-activity-list">'+(segments.length?segments.slice(0,30).map(function(a){return'<article><div><span>'+h(String(a.started_at||'').slice(0,16).replace('T',' '))+'</span><b>'+h(String(a.activity_type||'unclassified').toUpperCase())+'</b></div><div class="coach-activity-metrics"><span>'+Number(a.steps||0).toLocaleString()+' STEPS</span><span>'+Number(a.distance_mi||0).toFixed(2)+' MI</span><span>'+Math.round(Number(a.active_energy_kcal||0))+' KCAL</span><span>'+h(a.energy_source==='estimated'?'ESTIMATED':(a.energy_source?'MEASURED':'SOURCE UNKNOWN'))+'</span></div><div class="coach-activity-actions">'+['walk','run','workout','unclassified'].map(function(t){return'<button data-act="coach-activity-relabel" data-id="'+h(a.id)+'" data-type="'+t+'" '+(a.activity_type===t?'disabled':'')+'>'+t.toUpperCase()+'</button>';}).join('')+'</div></article>';}).join(''):'<div class="empty">No episode-level movement segments yet.</div>')+'</div></section></main>';app.innerHTML=html;}
  function refreshCoachTrainingFoundation(announce){if(!S.client)return;post({action:'trainingFoundation',memberId:S.client.id}).then(function(j){if(!j||!j.ok)throw new Error(j&&j.error||'Training data could not load.');S.trainingFoundation={profile:j.profile||null,measurements:j.measurements||[],healthDays:j.healthDays||[],activitySegments:j.activitySegments||[]};if(S.view==='training-foundation')renderCoachTrainingFoundation();if(announce)toast('Member body/activity refreshed.');}).catch(function(e){toast(e.message||'Training data could not load.');});}
  function saveCoachBodyProfile(){if(!S.client)return;post({action:'saveBodyProfile',memberId:S.client.id,profile:coachBodyProfilePayload()}).then(function(j){if(!j||!j.ok)throw new Error(j&&j.error||'Body profile could not save.');S.trainingFoundation.profile=j.profile||null;renderCoachTrainingFoundation();toast('Member body profile saved.');}).catch(function(e){toast(e.message||'Body profile could not save.');});}
  function saveCoachBodyMeasurement(){if(!S.client)return;function v(id){var x=document.getElementById(id);return x?x.value:'';}post({action:'saveBodyMeasurement',memberId:S.client.id,measuredOn:v('cfMeasureDate'),weightLb:v('cfMeasureWeight'),waistIn:v('cfMeasureWaist'),bodyFatPct:v('cfMeasureBodyFat')}).then(function(j){if(!j||!j.ok)throw new Error(j&&j.error||'Body measurement could not save.');return post({action:'trainingFoundation',memberId:S.client.id});}).then(function(j){if(!j||!j.ok)throw new Error(j&&j.error||'Body data could not reload.');S.trainingFoundation={profile:j.profile||null,measurements:j.measurements||[],healthDays:j.healthDays||[],activitySegments:j.activitySegments||[]};renderCoachTrainingFoundation();toast('Dated member body entry saved.');}).catch(function(e){toast(e.message||'Body measurement could not save.');});}
  function coachRelabelActivity(id,type){if(!S.client)return;post({action:'activitySegmentEdit',memberId:S.client.id,op:'relabel',id:id,activityType:type}).then(function(j){if(!j||!j.ok)throw new Error(j&&j.error||'Activity could not update.');return post({action:'trainingFoundation',memberId:S.client.id});}).then(function(j){if(!j||!j.ok)throw new Error(j&&j.error||'Activity could not reload.');S.trainingFoundation={profile:j.profile||null,measurements:j.measurements||[],healthDays:j.healthDays||[],activitySegments:j.activitySegments||[]};renderCoachTrainingFoundation();toast('Member activity relabeled.');}).catch(function(e){toast(e.message||'Activity could not update.');});}

  /* ══ MEMBER HOME ═══════════════════════════════════════════════════ */
  function renderHome() {
    var programs = S.programs || [];
    var html = '<header class="hd"><div class="hd__meta">'
      + '<h1>Gym Tracker</h1><time>' + todayLabel() + '</time></div></header>'
      + '<div class="home"><div class="memberhomehead"><div class="memberidentity">'
      + '<button class="memberavatar" data-act="avatar" aria-label="Change profile photo">' + avatarHTML(S.client) + '<i>'+uiIcon('camera')+'</i></button>'
      + '<div class="memberidentity__text"><h2>' + h(S.client.name) + '</h2><span>Member program</span></div>' + themeButton() + '</div>'
      + '<button class="memberchange" data-act="member-picker">Change member</button></div>'
      + (S.saveCustomOffer ? '<div class="saveoffer"><b>Keep this custom workout?</b><span>Save it as a reusable workout under program N/A.</span><div><button data-act="save-custom-workout">Save workout</button><button data-act="dismiss-custom">Not now</button></div></div>' : '')
      + '<div class="homeactions"><button class="ghost" data-act="progress">Gym progress</button>'
      + '<button class="ghost" data-act="choose-prog">+ Program</button>'
      + '<button class="ghost routine-launch" data-act="routines">Routine creator</button>'
      + '<button class="ghost routine-launch" data-act="exercise-manager">Exercise database</button></div>'
      + '<button class="coach-periodization-entry" data-act="periodization"><span>PERIODIZATION</span><small>Edit this member’s canonical training plan</small><i>›</i></button>'
      + '<button class="coach-periodization-entry coach-foundation-entry" data-act="training-foundation"><span>BODY / ACTIVITY</span><small>View the same member body, FFMI, Health and movement records</small><i>›</i></button>'
      + '<div class="gym-motion-divider is-motion-active" aria-hidden="true"><span></span></div>';
    if (!programs.length) {
      html += '<p class="lab">Programs</p><div class="panel"><b>No gym program yet</b>'
        + '<span>Choose a structure or build a session from scratch.</span></div>'
        + '<button class="primary" data-act="choose-prog">Choose program</button>'
        + '<button class="ghost" data-act="build-program">Build a program</button>';
    } else {
      html += '<p class="lab">Programs</p>';
      programs.forEach(function (p) {
        var pid = String(p.dbId || p.id || '');
        html += '<details class="program"><summary class="program__head"><div><b>' + h(p.name) + '</b>'
          + '<span>' + h(p.sub || ((p.days || []).length + ' workouts')) + '</span></div><span class="program__count">' + ((p.days || []).length) + ' workouts</span><i class="program__chev" aria-hidden="true"></i></summary>'
          + '<div class="program__days">'
          + '<div class="program__tools"><button data-act="edit-program" data-pid="' + h(pid) + '">Edit program</button><button data-act="delete-program" data-pid="' + h(pid) + '">Remove program</button></div>'
          + (p.days || []).map(function (d, i) {
              var dtone = workoutTone(d.name);
              return '<button class="tone-' + dtone + '" data-act="start-day" data-pid="' + h(pid) + '" data-day="' + i + '">'
                + '<b>' + h(d.name) + '</b><span>' + ((d.items || []).length) + ' exercises</span></button>';
            }).join('')
          + '</div></details>';
      });
      html += '<button class="ghost" data-act="scratch">Open blank workout</button>';
    }
    html += '<div class="gym-motion-divider is-motion-active" aria-hidden="true"><span></span></div><button class="mg-button" data-act="meal-gradient">Meal Grade</button>';
    if (S.recent && S.recent.length) {
      html += '<p class="lab">Recent sessions</p><div class="rec">' + S.recent.slice(0,8).map(function (r) {
        return '<div><em>' + h(String(r.session_date).slice(5).replace('-','/')) + '</em><span>'
          + h(r.name || 'Session') + '</span></div>'; }).join('') + '</div>';
    }
    html += '</div>'; 
    var draft = loadDraft(S.client && S.client.id);
    var resume = draft ? '<button class="ghost" data-act="pb-resume">Resume "'
      + h(draft.name || 'unnamed program') + '" (' + (draft.days || []).length + ' days)</button>' : '';
    app.innerHTML = html;
  }


  function loadExerciseManager(reset) {
    if (S.exMgr.loading && !reset) return;
    if (reset) { S.exMgr.offset = 0; S.exMgr.rows = []; }
    S.exMgr.loading = true; var request=++S.exMgr.request;
    var body={action:'search',q:S.exMgr.q||'',limit:100,offset:S.exMgr.offset};
    ['category','region','equipment'].forEach(function(k){if(S.exMgr.filters[k])body[k]=S.exMgr.filters[k];});
    if(S.exMgr.filters.unilateral)body.unilateral=true;
    if(S.exMgr.filters.compound)body.compound=true;
    if(S.exMgr.filters.custom)body.custom=true;
    post(body).then(function(j){
      if(request!==S.exMgr.request)return;
      if(!j||!j.ok) throw new Error('search');
      S.exMgr.rows = reset ? (j.exercises||[]) : S.exMgr.rows.concat(j.exercises||[]);
      S.exMgr.offset = S.exMgr.rows.length; S.exMgr.hasMore=!!j.hasMore;
    }).catch(function(){if(request===S.exMgr.request)toast('Exercise database could not be loaded.');}).finally(function(){if(request===S.exMgr.request){S.exMgr.loading=false;if(S.view==='exercise-manager')renderExerciseManager();}});
  }
  function exerciseVarsLabel(ex){return (ex.vars||[]).map(function(v){return v==='distance'&&ex.category==='fob'?'FOB Distance':v;}).join(' + ')||'No variables';}
  function renderExerciseManager(){
    var rows=S.exMgr.rows||[];
    app.innerHTML='<header class="hd"><div class="hd__meta"><h1>Exercise Database</h1><time>ADMIN</time></div></header>'
      +'<main class="home exmanager"><div class="exmanager__top"><div><h2>Exercise library</h2><p>Edit the source library used by programs, live workouts, and MAH GYM.</p></div><button class="primary" data-act="exercise-new">+ New Exercise</button></div>'
      +'<input class="find" id="exmgrq" placeholder="Search exercises" autocomplete="off" value="'+h(S.exMgr.q||'')+'">'
      +exerciseFilterPanel(S.exMgr.filters,'exercise-filter','exercise-filter-clear')
      +'<div class="exmanager__rows">'+(rows.length?rows.map(function(ex){var meta=[ex.category,ex.region,exerciseVarsLabel(ex)].filter(Boolean).join(' · ');return '<button class="exmanager__row" data-act="exercise-edit" data-id="'+h(ex.id)+'"><span><b>'+h(ex.name)+'</b><small>'+h(meta)+(ex.media_url?' · VIDEO':'')+'</small></span><i>EDIT</i></button>';}).join(''):'<div class="empty"><b>No exercises shown</b>Search or adjust the filters.</div>')+'</div>'
      +(S.exMgr.hasMore?'<button class="ghost exmanager__more" data-act="exercise-more">Load more</button>':'')
      +'<div class="backbar"><button class="back" data-act="exercise-manager-back">Member home</button><span class="backbar__t">Gym administration</span></div></main>';
  }
  function exerciseEditorHTML(ex){
    ex=ex||{id:'',name:'',category:'custom',region:'',muscles:[],equipment:'',vars:['weight','reps'],instructions:'',media_url:'',unilateral:false,compound:false};var vars=ex.vars||[];
    function ck(v,l){return '<label class="exvar"><input type="checkbox" data-exvar="'+v+'" '+(vars.indexOf(v)>=0?'checked':'')+'><span>'+l+'</span></label>';}
    var categories=['custom','warmup','stretch','push','pull','squat','hinge','core','isolation','carry','conditioning','plyometric','balance','fob'];
    var regions=['shoulders','upper-back','chest','arms','wrists','spine','core','hips','glutes','groin','quads-knees','hamstrings','calves-ankles','full-body','upper','lower','full'];
    return '<div class="exedit" data-id="'+h(ex.id||'')+'"><label class="fld"><span>Exercise name</span><input id="exedName" value="'+h(ex.name||'')+'"></label>'
      +'<div class="exedit__grid"><label class="fld"><span>Category</span><input id="exedCat" list="exedCategories" value="'+h(ex.category||'custom')+'"><datalist id="exedCategories">'+categories.map(function(x){return '<option value="'+h(x)+'">';}).join('')+'</datalist></label><label class="fld"><span>Muscle-group filter</span><input id="exedRegion" list="exedRegions" value="'+h(ex.region||'')+'" placeholder="shoulders, hips, core…"><datalist id="exedRegions">'+regions.map(function(x){return '<option value="'+h(x)+'">';}).join('')+'</datalist></label></div>'
      +'<div class="exedit__grid"><label class="fld"><span>Equipment</span><input id="exedEquip" value="'+h(ex.equipment||'')+'"></label><label class="fld"><span>Muscles</span><input id="exedMuscles" value="'+h((ex.muscles||[]).join(', '))+'" placeholder="comma separated"></label></div>'
      +'<div class="exedit__flags"><label class="exvar"><input type="checkbox" id="exedUnilateral" '+(ex.unilateral?'checked':'')+'><span>Unilateral</span></label><label class="exvar"><input type="checkbox" id="exedCompound" '+(ex.compound?'checked':'')+'><span>Compound</span></label></div>'
      +'<p class="lab">Tracking variables</p><div class="exvars">'+ck('weight','Weight')+ck('reps','Reps')+ck('time','Time')+ck('distance',ex.category==='fob'?'FOB Distance':'Distance')+ck('resistance','Resistance')+ck('rpe','RPE')+ck('rir','RIR')+ck('fm','FM Distance')+'</div>'
      +'<label class="fld"><span>Instructions</span><textarea id="exedInstructions" placeholder="Optional coaching cues">'+h(ex.instructions||'')+'</textarea></label>'
      +'<label class="fld"><span>Video link</span><input id="exedMedia" value="'+h(ex.media_url||'')+'" placeholder="https://..."></label>'
      +'<div class="exedit__media"><button class="ghost" data-act="exercise-upload" data-id="'+h(ex.id||'')+'">Upload video</button>'+(ex.media_url?'<a href="'+h(ex.media_url)+'" target="_blank" rel="noopener">Preview video</a>':'')+'</div>'
      +'<div class="exedit__actions"><button class="primary" data-act="exercise-save" data-id="'+h(ex.id||'')+'">Save exercise</button>'+(ex.id?'<button class="danger" data-act="exercise-delete" data-id="'+h(ex.id)+'">Remove exercise</button>':'')+'</div></div>';
  }
  function renderRoutines() {
    var rows=S.templates||[];
    app.innerHTML='<header class="hd"><div class="hd__meta"><h1>Routine Creator</h1><time>Coach tool</time></div></header>'
      +'<main class="home routinehome"><div class="routineintro"><span>PROGRAMMING LAB</span><h2>Build reusable workouts</h2><p>Create a routine once, then assign it to any member without rebuilding it.</p></div>'
      +'<button class="primary" data-act="routine-new">+ New Routine</button>'
      +'<p class="lab">Saved routines</p>'
      +(rows.length?'<div class="routinegrid">'+rows.map(function(t){return '<div class="routinecard"><button class="routinecard__open" type="button" data-act="routine-open" data-id="'+h(t.id)+'"><b>'+h(t.name)+'</b><span>Open builder</span></button><button class="routinecard__unsave" type="button" data-act="routine-unsave" data-id="'+h(t.id)+'" aria-label="Unsave '+h(t.name)+'">×</button></div>';}).join('')+'</div>':'<div class="empty"><b>No routines yet</b>Create your first reusable workout.</div>')
      +'<div class="backbar"><button class="back" data-act="routine-back">'+(S.builderDay!=null?'Back to program':'Routines')+'</button><button class="chip" data-act="back-to-program">Program</button><span class="backbar__t">Member home</span></div></main>';
  }

  function routineRow(it,idx){
    var sec=inferSection(it), ccount = 0;
    if (it.circuit && it.circuit.id && S.routineDraft) ccount = S.routineDraft.items.filter(function(x){return x.circuit&&x.circuit.id===it.circuit.id;}).length;
    return '<div class="routineitem'+(it.circuit?' is-circuit':'')+'"><div class="routineitem__body"><b>'+h(it.name)+'</b><span>'+h((it.vars||[]).map(function(v){return v==='distance'&&it.category==='fob'?'FOB distance (in)':v;}).join(' + '))+(ccount?' · CIRCUIT '+ccount:'')+'</span>'
      +'<select class="routineitem__section" data-act="routine-section" data-k="'+h(it.key)+'" aria-label="Workout section">'+SECTIONS.map(function(x){return '<option value="'+x.id+'" '+(x.id===sec?'selected':'')+'>'+h(x.label)+'</option>';}).join('')+'</select></div>'
      +'<div class="routineitem__acts"><button data-act="routine-circuit" data-k="'+h(it.key)+'" aria-label="Build circuit" title="Circuit">C</button><button data-act="routine-move" data-k="'+h(it.key)+'" data-d="-1" aria-label="Move up">↑</button><button data-act="routine-move" data-k="'+h(it.key)+'" data-d="1" aria-label="Move down">↓</button><button data-act="routine-del" data-k="'+h(it.key)+'" aria-label="Remove">×</button></div></div>';
  }

/* ══ PROGRAM BUILDER ═══════════════════════════════════════════════════
     A full page, not a modal. Building a program means naming it, deciding how
     many days it has, naming each one, filling each one, and reordering them,
     and none of that fits in a bottom sheet. The modal version is why it felt
     cramped and why you lost your place the moment you opened a day.

     One draft object, S.builder, holds the whole program. A day editor is the
     existing Routine Creator pointed at one day of that draft, so the exercise
     library, sections, reordering and set editing are the same code. Coming
     back from a day returns here with the draft intact.

     Nothing is written to the server until Save, so a half-built program never
     lands on a member. The draft survives a reload in localStorage.
     ═══════════════════════════════════════════════════════════════════════ */
  var BKEY = 'fob.gym.builder';

  function saveDraft() {
    try { localStorage.setItem(BKEY, JSON.stringify({ b: S.builder, c: S.client && S.client.id })); }
    catch (e) {}
  }
  function loadDraft(clientId) {
    try {
      var d = JSON.parse(localStorage.getItem(BKEY) || 'null');
      return (d && d.c === clientId && d.b) ? d.b : null;
    } catch (e) { return null; }
  }
  function clearDraft() { try { localStorage.removeItem(BKEY); } catch (e) {} }

  function newBuilder(prog) {
    return prog
      ? { dbId: prog.dbId || prog.id || null, name: prog.name || 'Program',
          sub: prog.sub || '', days: clone(prog.days || []) }
      : { dbId: null, name: '', sub: '', days: [{ name: 'Day 1', items: [] }] };
  }

  /* Read the live inputs into the draft before any structural change, so a
     half-typed name is never lost by adding or reordering a day. */
  function pbSyncFields() {
    if (!S.builder) return;
    var n = document.getElementById('pbname'), sb = document.getElementById('pbsub');
    if (n) S.builder.name = n.value;
    if (sb) S.builder.sub = sb.value;
    (S.builder.days || []).forEach(function (d, i) {
      var el = document.getElementById('pbd_' + i);
      if (el) d.name = (el.value || '').trim() || d.name;
    });
  }

  function renderProgramBuilder() {
    var b = S.builder;
    if (!b) { S.view = 'home'; render(); return; }
    var days = b.days || [];
    var ready = (b.name || '').trim() && days.length
      && days.every(function (d) { return (d.items || []).length; });

    app.innerHTML = '<header class="hd"><div class="hd__meta">'
      + '<h1>' + (b.dbId ? 'Edit program' : 'Build program') + '</h1>'
      + '<time>' + h(S.client && S.client.name || '') + '</time></div></header>'
      + '<div class="backbar"><button class="back" data-act="pb-exit">Member home</button>'
      + '<span class="backbar__t">' + days.length + ' day' + (days.length === 1 ? '' : 's') + '</span></div>'
      + '<main class="home">'
      + '<label class="fld"><span>Program name</span>'
      + '<input id="pbname" value="' + h(b.name) + '" placeholder="Upper / Lower" autocomplete="off"></label>'
      + '<label class="fld"><span>Description</span>'
      + '<input id="pbsub" value="' + h(b.sub) + '" placeholder="4 days \u00b7 alternating" autocomplete="off"></label>'

      + '<div class="wkhead"><b>Days</b><span>' + days.length + '</span></div>'
      + '<div class="wklist">'
      + days.map(function (d, i) {
          var n = (d.items || []).length;
          return '<div class="wkrow">'
            + '<span class="wkrow__n">' + (i + 1) + '</span>'
            + '<input class="wkrow__name" id="pbd_' + i + '" data-act="pb-dayname" data-day="' + i + '" '
            + 'value="' + h(d.name || ('Day ' + (i + 1))) + '" autocomplete="off">'
            + '<button class="wkrow__ic" data-act="pb-move" data-day="' + i + '" data-dir="up" '
            + (i === 0 ? 'disabled ' : '') + 'aria-label="Move up">\u2191</button>'
            + '<button class="wkrow__ic" data-act="pb-move" data-day="' + i + '" data-dir="down" '
            + (i === days.length - 1 ? 'disabled ' : '') + 'aria-label="Move down">\u2193</button>'
            + '<button class="wkrow__ic" data-act="pb-dup" data-day="' + i + '" aria-label="Duplicate">\u29C9</button>'
            + '<button class="wkrow__ic warn" data-act="pb-del" data-day="' + i + '" aria-label="Remove">\u00d7</button>'
            + '<div class="wkrow__foot"><span' + (n ? '' : ' class="warnT"') + '>'
            + (n ? n + ' exercise' + (n === 1 ? '' : 's') : 'Empty') + '</span>'
            + '<button class="chip" data-act="pb-open" data-day="' + i + '">'
            + (n ? 'Edit workout' : 'Build workout') + '</button></div>'
            + '</div>';
        }).join('')
      + '</div>'
      + '<button class="ghost" data-act="pb-add">+ Add day</button>'
      + '<button class="primary" data-act="pb-save"' + (ready ? '' : ' data-soft="1"') + '>'
      + (b.dbId ? 'Save program' : 'Assign to ' + h(S.client && S.client.name || 'member')) + '</button>'
      + (ready ? '' : '<p class="pbnote">Name the program and put at least one exercise in every day '
          + 'before assigning. You can save a partial program and come back to it.</p>')
      + '</main>';
  }

  function renderRoutineBuilder(){
    var d=S.routineDraft||{name:'New Routine',items:[]}; S.routineDraft=d; normalizeSections(d.items);
    var html='<header class="hd"><div class="hd__meta"><h1>Routine Creator</h1><time>'+h(S.client&&S.client.name||'Coach')+'</time></div></header><main class="home routinebuilder">'
      +'<label class="fld routine-name"><span>Routine name</span><input id="routineName" value="'+h(d.name)+'" autocomplete="off"></label>';
    SECTIONS.forEach(function(sec,sx){var list=d.items.filter(function(x){return inferSection(x)===sec.id;});html+='<section class="routine-section" data-routine-section="'+sec.id+'"><div class="routine-section__head"><span>0'+(sx+1)+'</span><b>'+h(sec.label)+'</b><button type="button" data-act="routine-add" data-section="'+sec.id+'">+ Exercise</button></div>'+(list.length?list.map(routineRow).join(''):'<div class="routine-empty"><span>No exercises yet</span></div>')+'<button type="button" class="routine-addzone" data-act="routine-add" data-section="'+sec.id+'"><span>+</span> Add exercise to '+h(sec.label)+'</button></section>';});
    html+='<div class="routine-savebar"><button class="ghost" data-act="routine-save">Save routine</button><button class="primary" data-act="routine-assign">Save + assign to '+h(S.client.name)+'</button></div><div class="backbar"><button class="back" data-act="routines">All routines</button><span class="backbar__t">All routines</span></div></main>'
      /* Routine Creator used to render without the shared modal shell. The
         + Exercise buttons therefore called openSheet() against DOM nodes that
         did not exist. Keep the same library/modal infrastructure used by the
         live workout so every section can actually add from the full library. */
      +'<div class="veil" id="veil" data-act="closesheet"></div>'
      +'<div class="sheet" id="sheet"><div class="sheet__h"><b id="sheetT"></b><button data-act="closesheet" aria-label="Close">×</button></div><div class="sheet__b" id="sheetB"></div></div>'
      +'<div class="toast" id="toast"></div>';
    app.innerHTML=html;
    if(S.sheet) reopenSheet();
  }

  function renderPresets() {
    app.innerHTML = '<header class="hd"><div class="hd__meta">'
      + '<h1>Choose program</h1><time>' + h(S.client.name) + '</time></div></header>'
      + '<div class="home">'
      + PRESETS.map(function (p) {
          return '<button class="pre" data-act="prev-prog" data-id="' + p.id + '"><b>'
            + h(p.name) + '</b><span>' + h(p.sub) + '</span></button>'; }).join('')
      + '<button class="ghost" data-act="build-program">Build a program</button>'
      + '<div class="backbar"><button class="back" data-act="home">Member home</button><span class="backbar__t">Member home</span></div></div>';
  }

  function renderPreview(p) {
    app.innerHTML = '<header class="hd"><div class="hd__meta">'
      + '<h1>' + h(p.name) + '</h1><time>' + h(p.sub) + '</time></div></header>'
      + '<div class="home">'
      + p.days.map(function (d, i) {
          return '<div class="day"><b>Day ' + (i+1) + ' \u00b7 ' + h(d[0]) + '</b><p>'
            + h(d[1].join(' \u00b7 ')) + '</p></div>'; }).join('')
      + '<button class="primary" data-act="assign" data-id="' + p.id + '">Assign program</button>'
      + '<p class="lab">Every exercise, set count and rep target stays editable '
      + 'once the workout is open.</p>'
      + '<div class="backbar"><button class="back" data-act="choose-prog">All programs</button><span class="backbar__t">All programs</span></div></div>';
  }

  /* ── session open ─────────────────────────────────────────────────── */
  /* Selecting a member lands on their HOME, not straight into a workout.
     The coach sees today, the program and recent sessions first. */
  function resetLiveState() {
    S.session = null; S.items = []; S.name = 'Session'; S.notes = '';
    S.elapsed = 0; S.started = 0; S.running = false; S.dirty = false;
    S.activeProgramId = null; S.activeDayIndex = null; S.fromScratch = false;
    clearInterval(restT); rest = 0;
  }

  function beginSession(name, items) {
    if (!S.client) return Promise.resolve(false);
    try { localStorage.removeItem(LKEY); } catch (e) {}
    return post({ action: 'session', memberId: S.client.id, name: name || 'Session', body: items || [], reset: true })
      .then(function (j) {
        if (!j || !j.ok || !j.session) return false;
        S.session = j.session;
        S.items = normalizeSections(clone(items || [])).map(function (it) { it.open = false; return it; });
        S.name = name || 'Session'; S.notes = ''; S.elapsed = 0;
        S.started = Date.now(); S.running = true; S.dirty = false; S.view = 'workout';
        localSave(); return true;
      });
  }

  function openClient(c) {
    S.client = c; S.progressData = null; S.progressExerciseKey = null; S.progressSearch = ''; closeSheet();
    resetLiveState();
    return Promise.all([
      post({ action: 'memberHome', memberId: c.id }),
      post({ action: 'programs', memberId: c.id }),
      post({ action: 'periodization', memberId: c.id }),
      post({ action: 'trainingFoundation', memberId: c.id })
    ]).then(function (all) {
      var j = all[0], pj = all[1], period = all[2], foundation = all[3];
      if (!j || !j.ok) { S.view = 'home'; render(); return; }
      S.recent = j.recent || [];
      S.client.avatarUrl = j.avatarUrl || null; S.client.avatarPath = j.avatarPath || null;
      S.programs = ((pj && pj.programs) || []).map(function (row) {
        var body = row.body || {}; body.dbId = row.id;
        body.name = body.name || row.name; body.sub = body.sub || row.sub; return body;
      });
      if (!S.programs.length) {
        var legacy = loadProgram(c.id);
        if (legacy && legacy.days) {
          S.programs = [legacy];
          post({ action: 'saveProgram', memberId: c.id, name: legacy.name || 'Program',
            sub: legacy.sub || null, body: legacy }).then(function (r) {
              if (r && r.ok && r.program) { legacy.dbId = r.program.id; render(); }
            });
        }
      }
      S.program = S.programs[0] || null;
      S.periodizationPlans = period && period.ok && Array.isArray(period.plans) ? period.plans : []; S.periodizationDraft = null;
      S.trainingFoundation = foundation && foundation.ok ? {profile:foundation.profile||null,measurements:foundation.measurements||[],healthDays:foundation.healthDays||[],activitySegments:foundation.activitySegments||[]} : {profile:null,measurements:[],healthDays:[],activitySegments:[]};
      /* Selecting a member is deliberately side-effect free: no gym session is
         created, resumed or timed until the coach explicitly starts a workout. */
      S.view = 'home'; render();
    });
  }

  function loadProgram(id) {
    try { return JSON.parse(localStorage.getItem('fob.gym.prog.' + id) || 'null'); }
    catch (e) { return null; }
  }
  function saveProgram(id, prog) {
    try { localStorage.setItem('fob.gym.prog.' + id, JSON.stringify(prog)); } catch (e) {}
  }

  function loadProgress() {
    if (!S.client) return;
    app.innerHTML = '<div class="empty"><b>Gym progress</b>Loading training history…</div>';
    post({ action: 'progress', memberId: S.client.id }).then(function (j) {
      if (!j || !j.ok) { S.view = 'home'; render(); return; }
      S.progressData = j; S.view = 'progress'; render();
    });
  }

  var FOB_STYLE_NAMES = ['Reversal','Arm Rock (A.R.)','A.R. Reversal','Underhand Swing','Pullback','Bottom Reverse','Star Stance','Lateral Raises / Lats','Upright Row and Press Down','Break Stance','Overstance','Power Reversal','Upper Cut','High Upright Row','High Pullover','Forward Slash','Back Slash','Slash Loop','360 Pendulum (Unanchored)','Yank Row (Anchored)','Yank Tricep Extension (Anchored)','Yank Chest Press (Anchored)'];
  function isFobStyle(name){ return FOB_STYLE_NAMES.indexOf(String(name||''))>=0; }

  function graphPoints(values, w, hgt, pad) {
    if (!values.length) return [];
    var ys = values.map(function (v) { return safeNum(v.v); });
    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    if (hi === lo) { hi += 1; lo -= 1; }
    return values.map(function (v, i) {
      var x = values.length === 1 ? w / 2 : pad + i * (w - pad * 2) / (values.length - 1);
      var y = pad + (hi - safeNum(v.v)) * (hgt - pad * 2) / (hi - lo);
      return { x:x, y:y, v:v.v, date:v.date };
    });
  }

  function miniGraph(title, unit, values) {
    values = values || [];
    var W=640,H=190,P=28, pts=graphPoints(values,W,H,P);
    var path=pts.map(function (p,i) { return (i?'L':'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' ');
    var latest=values.length ? values[values.length-1] : null;
    var last=latest ? latest.v : '–';
    var context=latest && latest.context ? ' <small>(' + h(latest.context) + ')</small>' : '';
    var marks=pts.map(function(p){return '<circle cx="'+p.x+'" cy="'+p.y+'" r="4" />';}).join('');
    return '<section class="chart"><div class="chart__head"><b>'+h(title)+'</b><span>'+h(last)+' '+h(unit)+context+'</span></div>'
      + '<div class="chart__plot" data-empty="'+(values.length?'0':'1')+'"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-label="'+h(title)+' over time">'
      + '<line class="grid" x1="'+P+'" y1="'+(H/2)+'" x2="'+(W-P)+'" y2="'+(H/2)+'" />'
      + '<line class="axis" x1="'+P+'" y1="'+(H-P)+'" x2="'+(W-P)+'" y2="'+(H-P)+'" />'
      + '<line class="axis" x1="'+P+'" y1="'+P+'" x2="'+P+'" y2="'+(H-P)+'" />'
      + (values.length ? '<path class="trend" d="'+path+'" />'+marks : '') + '</svg><i class="chartbeam"></i>'
      + (!values.length ? '<span class="chartzero">Awaiting data</span>' : '') + '</div>'
      + '<div class="chart__dates"><span>'+(values.length?h(values[0].date):'First session')+'</span><span>'+(values.length?h(values[values.length-1].date):'Latest')+'</span></div></section>';
  }

  function buildExerciseSeries(g) {
    var dates = Object.keys((g && g.days) || {}).sort();
    var out = { wt:[], reps:[], vol:[], time:[], dist:[], fm:[], rpe:[], rir:[] };
    dates.forEach(function(date){ var rows=g.days[date];
      var ws=rows.map(function(r){return r.weight}).filter(function(v){return v!=null});
      var rs=rows.map(function(r){return r.reps}).filter(function(v){return v!=null});
      var peakWRow = rows.filter(function(r){return r.weight!=null;}).sort(function(a,b){return safeNum(b.weight)-safeNum(a.weight) || safeNum(b.reps)-safeNum(a.reps);})[0] || null;
      var peakRRow = rows.filter(function(r){return r.reps!=null;}).sort(function(a,b){return safeNum(b.reps)-safeNum(a.reps) || safeNum(b.weight)-safeNum(a.weight);})[0] || null;
      var ts=rows.map(function(r){return r.time_s}).filter(function(v){return v!=null});
      var ds=rows.map(function(r){return r.distance}).filter(function(v){return v!=null});
      var fs=rows.map(function(r){return r.fm_distance}).filter(function(v){return v!=null});
      var rpes=rows.map(function(r){return r.rpe}).filter(function(v){return v!=null});
      var rirs=rows.map(function(r){return r.rir}).filter(function(v){return v!=null});
      var d=date.slice(5);
      if(peakWRow) out.wt.push({date:d,v:safeNum(peakWRow.weight),context:(peakWRow.reps!=null?safeNum(peakWRow.reps)+' reps':'reps n/a')});
      if(peakRRow) out.reps.push({date:d,v:safeNum(peakRRow.reps),context:(peakRRow.weight!=null?safeNum(peakRRow.weight)+' lb':'bodyweight')});
      if(ws.length&&rs.length) out.vol.push({date:d,v:Math.round(rows.reduce(function(a,r){return a+safeNum(r.weight)*safeNum(r.reps);},0))});
      if(ts.length) out.time.push({date:d,v:Math.max.apply(null,ts)});
      if(ds.length) out.dist.push({date:d,v:Math.max.apply(null,ds)});
      if(fs.length) out.fm.push({date:d,v:Math.max.apply(null,fs)});
      if(rpes.length) out.rpe.push({date:d,v:Math.max.apply(null,rpes)});
      if(rirs.length) out.rir.push({date:d,v:Math.min.apply(null,rirs)});
    });
    out.dates = dates; return out;
  }

  function progressGroups() {
    var d=S.progressData || {sets:[]}, by={};
    (d.sets||[]).forEach(function(r){
      var k=String(r.exercise_id || r.exercise_name || '');
      if(!by[k]) by[k]={key:k,name:r.exercise_name || 'Exercise',days:{}};
      if(!by[k].days[r.session_date]) by[k].days[r.session_date]=[];
      by[k].days[r.session_date].push(r);
    });
    return Object.keys(by).map(function(k){return by[k];}).sort(function(a,b){return a.name.localeCompare(b.name);});
  }

  function paintProgressExerciseHits() {
    var box=document.getElementById('progressExerciseHits'); if(!box) return;
    var q=String(S.progressSearch||'').toLowerCase().trim(), groups=progressGroups();
    var rows=groups.filter(function(g){return !q || g.name.toLowerCase().indexOf(q)>=0;});
    box.innerHTML=rows.map(function(g){
      var on=String(S.progressExerciseKey||'')===g.key;
      return '<button class="progresshit" data-act="progress-exercise" data-key="'+h(g.key)+'" data-on="'+(on?'1':'0')+'"><b>'+h(g.name)+'</b><span>'+Object.keys(g.days).length+' session'+(Object.keys(g.days).length===1?'':'s')+'</span></button>';
    }).join('') || '<div class="progressnohit">No matching exercise</div>';
  }

  function renderProgress() {
    var d=S.progressData || {sets:[],sessions:[]}, groups=progressGroups();
    var bookmarks=progressBookmarks().filter(function(k){return groups.some(function(g){return g.key===k;});});
    if(bookmarks.length!==progressBookmarks().length) saveProgressBookmarks(bookmarks);
    if (!S.progressExerciseKey || !groups.some(function(g){return g.key===S.progressExerciseKey;})) {
      S.progressExerciseKey = bookmarks[0] || (groups[0] && groups[0].key) || null;
    }
    var selected=groups.filter(function(g){return g.key===S.progressExerciseKey;})[0] || null;
    var series=selected ? buildExerciseSeries(selected) : {wt:[],reps:[],vol:[],time:[],dist:[],fm:[],rpe:[],rir:[],dates:[]};
    var isBookmarked=selected && bookmarks.indexOf(selected.key)>=0;
    var html='<header class="hd"><div class="hd__meta"><h1>Gym Progress</h1><time>'+h(S.client.name)+'</time></div>'
      + '<div style="margin-top:9px"><div class="backbar"><button class="back" data-act="home">Member home</button><span class="backbar__t">Member home</span></div></div></header><main class="progressview">'
      + '<div class="progresshero"><b>'+(d.sessions||[]).length+'</b><span>Completed gym sessions</span></div>'
      + '<section class="progresspicker"><div class="progresspicker__label"><span>Exercise Progress</span><small>Choose any recorded exercise</small></div>';
    if (bookmarks.length) {
      html+='<div class="progressmarks"><span>Bookmarked</span><div>'+bookmarks.map(function(k){var g=groups.filter(function(x){return x.key===k;})[0];return g?'<button data-act="progress-bookmark-jump" data-key="'+h(k)+'">'+h(g.name)+'</button>':'';}).join('')+'</div></div>';
    }
    html+='<details class="progresschoose"><summary><span>'+(selected?h(selected.name):'Select exercise')+'</span><i>⌄</i></summary>'
      + '<div class="progresschoose__body"><input class="find" id="progressq" placeholder="Search exercise history" autocomplete="off" value="'+h(S.progressSearch)+'">'
      + '<div id="progressExerciseHits">'+groups.map(function(g){var on=selected&&selected.key===g.key;return '<button class="progresshit" data-act="progress-exercise" data-key="'+h(g.key)+'" data-on="'+(on?'1':'0')+'"><b>'+h(g.name)+'</b><span>'+Object.keys(g.days).length+' session'+(Object.keys(g.days).length===1?'':'s')+'</span></button>';}).join('')+'</div></div></details>';
    if (selected) html+='<button class="bookmark" data-act="progress-bookmark" data-key="'+h(selected.key)+'" data-on="'+(isBookmarked?'1':'0')+'">'+(isBookmarked?'★ Bookmarked':'☆ Bookmark exercise')+'</button>';
    html+='</section>'
      + '<section class="progressmatrix"><div class="progressmatrix__head"><b>'+(selected?h(selected.name):'Exercise graphs')+'</b><span>'+(selected?(series.dates.length+' recorded session'+(series.dates.length===1?'':'s')):'Graphs are ready for the first completed workout')+'</span></div>'
      + miniGraph('Peak load','lb',series.wt)+miniGraph('Peak reps','reps',series.reps)+miniGraph('Training volume','lb·reps',series.vol)
      + miniGraph('Time','sec',series.time)+miniGraph(selected && isFobStyle(selected.name) ? 'FOB Distance' : 'Distance',selected && isFobStyle(selected.name) ? 'in' : 'm',series.dist)+miniGraph('FM distance','in',series.fm)
      + (series.rpe.length?miniGraph('RPE','',series.rpe):'')+(series.rir.length?miniGraph('RIR','',series.rir):'')+'</section>';
    if (!groups.length) html+='<div class="empty progressnote"><b>No completed exercise history yet</b>The graph axes remain ready and will populate after the first completed workout.</div>';
    html+='</main>'; app.innerHTML=html;
  }

  /* ── v433 long-press check to reveal remove; iOS native selection off ── */
  var COACH_SET_DELETE_ARM='',COACH_SET_LONGPRESS_SUPPRESS='',coachSetLongPress=null,COACH_SET_LONGPRESS_MOVE_PX=10;
  document.addEventListener('pointerdown',function(e){
    var tick=e.target&&e.target.closest?e.target.closest('[data-act="tick"]'):null;if(!tick)return;if(e.pointerType==='mouse'&&e.button!==0)return;if(e.cancelable)e.preventDefault();
    var key=tick.getAttribute('data-k')+'_'+tick.getAttribute('data-i'),g={id:e.pointerId,key:key,tick:tick,timer:0,x:Number(e.clientX)||0,y:Number(e.clientY)||0};
    if(coachSetLongPress&&coachSetLongPress.timer)clearTimeout(coachSetLongPress.timer);coachSetLongPress=g;try{tick.setPointerCapture&&tick.setPointerCapture(e.pointerId)}catch(x){}
    g.timer=setTimeout(function(){if(coachSetLongPress!==g)return;COACH_SET_DELETE_ARM=key;COACH_SET_LONGPRESS_SUPPRESS=key;var wrap=tick.closest('.setwrap');document.querySelectorAll('.setwrap[data-reveal="1"]').forEach(function(x){if(x!==wrap)x.removeAttribute('data-reveal')});if(wrap)wrap.setAttribute('data-reveal','1');try{navigator.vibrate&&navigator.vibrate(18)}catch(x){}},620);
  },true);
  function cancelCoachSetLongPress(e){var g=coachSetLongPress;if(!g||e&&e.pointerId!==g.id)return;if(g.timer)clearTimeout(g.timer);try{if(g.tick&&g.tick.hasPointerCapture&&g.tick.hasPointerCapture(g.id))g.tick.releasePointerCapture(g.id)}catch(x){}coachSetLongPress=null;}
  document.addEventListener('pointermove',function(e){var g=coachSetLongPress;if(!g||e.pointerId!==g.id)return;var dx=(Number(e.clientX)||0)-g.x,dy=(Number(e.clientY)||0)-g.y;if(Math.sqrt(dx*dx+dy*dy)>COACH_SET_LONGPRESS_MOVE_PX)cancelCoachSetLongPress(e)},true);
  document.addEventListener('pointerup',cancelCoachSetLongPress,true);document.addEventListener('pointercancel',cancelCoachSetLongPress,true);document.addEventListener('lostpointercapture',cancelCoachSetLongPress,true);
  document.addEventListener('contextmenu',function(e){if(e.target&&e.target.closest&&e.target.closest('[data-act="tick"]'))e.preventDefault()},true);

  /* ── boot ─────────────────────────────────────────────────────────── */
  post({ action: 'boot' }).then(function (j) {
    if (!j || !j.ok) {
      app.innerHTML = '<div class="empty"><b>Unavailable</b>Could not reach the server. Check your connection and reload.</div>';
      return;
    }
    S.clients = j.clients || [];
    S.templates = j.templates || [];
    /* Gym Tracker always opens at member selection. Existing open sessions are
       recovered after that member is chosen, so no work is lost and entry is predictable. */
    S.client = null; S.view = 'pick';
    var route=new URLSearchParams(location.search||''),wanted=route.get('member')||'',tool=route.get('tool')||'';
    var target=S.clients.find(function(c){return String(c.id)===String(wanted)});
    if(target){
      openClient(target).then(function(){
        if(tool==='meal'&&window.FOBMealGradient){setTimeout(function(){window.FOBMealGradient.open({mode:'coach',memberId:target.id,memberName:target.name})},80)}
      });
    }else renderPick();
  });

  setInterval(function () {
    if (!S.running) return;
    var c = document.querySelector('.clock');
    if (c) c.textContent = clock(elapsed());
  }, 1000);

  window.addEventListener('pagehide', function () { localSave(); flush(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { localSave(); flush(); }
  });
}());
