/* MAHWORLD :: SHELL  (Phase 0 — the minimal internal control-deck surface)
   A development-only page inside MAHFITT that proves the round trip

       MAHFITT  ->  MAHWORLD domain  ->  MAHFITT

   without coupling the two: it reads the domain through `window.MAHWORLD`,
   renders with MAHFITT's own settings-page primitives (.mahset-*, .mg-button,
   .mf-canon-*), and is reached only through mygym.js's guarded 'mahworld'
   route, which exists only while the development flag is on. Ordinary
   members never see it (brief §42, §49). It is NOT a fake MMO: the "world
   session" it enters is a labelled simulation whose only purpose is to walk
   the state machine WORLD_AVAILABLE -> ENTERING -> ACTIVE -> EXITING ->
   AVAILABLE and return to the same MAHFITT control deck.

   Ownership: this file owns nothing that MAHFITT owns. Fitness truth is
   never read here; the "sample derivation" runs the adapter on a labelled
   FIXTURE and stores a client PREVIEW under the account-namespaced local
   draft key — never an authoritative value (brief §27). */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var M = window.MAHWORLD;
  var root = null, mounted = false, rerender = null, timers = [];
  var session = null;
  /* The world session belongs to ONE owner account. Sign-out, session loss
     or another account signing in on the same device discards it — a
     fresh WORLD_OFF session — so no member ever inherits another's state.
     `undefined` means no owner has been observed yet. */
  var sessionOwner;

  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function later(fn, ms) { var t = setTimeout(function () { timers = timers.filter(function (x) { return x !== t; }); fn(); }, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ---- development switch -----------------------------------------------
     `?mahworld=1` / `?mahworld=0` toggles the device flag. Honoured only off
     the production deploy context or on a local host — the same gating idea
     as dev/mahfitt-role-simulator.js. On production the only way in is the
     explicit localStorage key (an internal capability, brief §49). */
  function deployContext() {
    var f = window.MAHWORLD_FLAGS || {};
    return String(f.context || 'production');
  }
  function localHost() {
    try { return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); } catch (e) { return false; }
  }
  function applyDevSwitchFromUrl() {
    if (!M) return false;
    var v = null;
    try { v = new URLSearchParams(location.search || '').get('mahworld'); } catch (e) { v = null; }
    if (v == null) return false;
    var allowed = localHost() || deployContext() !== 'production';
    if (!allowed) return false;
    if (v === '1' || v === 'dev' || v === 'on') return M.flags.enableDev();
    if (v === '0' || v === 'off') return M.flags.disableDev();
    return false;
  }

  /* ---- presentation hook ----------------------------------------------- */
  function paintState() {
    if (!M || !session) return;
    var on = M.flags.isEnabled();
    M.presentation.applyState(document.documentElement, on ? session.state : M.STATES.OFF);
  }

  function onSessionChange() {
    paintState();
    if (mounted && typeof rerender === 'function') rerender();
  }
  function freshSession() {
    clearTimers();
    session = M.createSession();
    session.subscribe(onSessionChange);
    return session;
  }
  if (M) freshSession();

  /* ---- profile helpers ------------------------------------------------- */
  function current() {
    if (!M) return { ok: false, reason: 'NO_DOMAIN', profile: null };
    return M.currentProfile();
  }
  /* Bind the live session to the current owner; a different owner (or
     none) gets a fresh session and the root attribute is repainted. */
  function ensureOwner() {
    if (!M) return null;
    var cur = current();
    var owner = cur.ok ? String(cur.profile.ownerAccountId) : null;
    if (owner !== sessionOwner) {
      if (sessionOwner !== undefined) freshSession();
      sessionOwner = owner;
      paintState();
    }
    return cur;
  }
  function saveProfile(p) { if (M && p) M.store.save(p); return p; }
  function syncAvailability(p) {
    if (!session || !p) return;
    if (p.mahworldEnabled) { if (session.state === M.STATES.OFF) session.makeAvailable(p, 'profile-enabled'); }
    else session.makeUnavailable('profile-disabled');
  }

  /* ---- fixture for the preview derivation (labelled, never real data) -- */
  var FIXTURE_WORKOUT = {
    id: 'fixture-upper-lower', completedAt: null,
    exercises: [
      { name: 'Back squat (fixture)', region: 'lower', sets: [{ reps: 5, weight: 120, completed: true }, { reps: 5, weight: 120, completed: true }, { reps: 5, weight: 120, completed: true }] },
      { name: 'Bench press (fixture)', region: 'upper', sets: [{ reps: 8, weight: 80, completed: true }, { reps: 8, weight: 80, completed: true }] },
      { name: 'Plank (fixture)', region: 'core', sets: [{ reps: 1, control: true, completed: true }] }
    ]
  };
  var FIXTURE_ACTIVITY = { id: 'fixture-walk', type: 'walk', distanceMeters: 3000, durationSeconds: 2100, completedAt: null };

  /* ---- markup ---------------------------------------------------------- */
  function row(label, value, small) {
    return '<div class="mahset-row mahworld-row"><span><b>' + h(label) + '</b>' + (small ? '<small>' + h(small) + '</small>' : '') + '</span><output class="mf-canon-micro">' + h(value) + '</output></div>';
  }
  function action(id, label, small, disabled) {
    return '<button class="mahset-action" data-mahworld-action="' + h(id) + '"' + (disabled ? ' disabled aria-disabled="true"' : '') + '><span><b>' + h(label) + '</b>' + (small ? '<small>' + h(small) + '</small>' : '') + '</span><i>›</i></button>';
  }
  function stateLabel(s) {
    return { WORLD_OFF: 'WORLD OFF', WORLD_AVAILABLE: 'WORLD AVAILABLE · OFFLINE (DEVELOPMENT)', WORLD_ENTERING: 'ENTERING…', WORLD_ACTIVE: 'WORLD SESSION ACTIVE · SIMULATED', WORLD_EXITING: 'RETURNING TO MAHFITT…' }[s] || String(s);
  }

  function pageHTML() {
    if (!M || !session) return '<main class="home mahset-view mahworld-view" data-mahworld-page><section class="mahset-intro"><span>MAHWORLD</span><h1>NOT LOADED.</h1><p>The MAHWORLD domain module is not available on this page.</p></section></main>';
    var cur = ensureOwner(), p = cur.profile, st = session.state;
    var html = '<main class="home mahset-view mahworld-view" data-mahworld-page data-mahworld-session="' + h(st) + '">'
      + '<section class="mahset-intro"><span>MAHWORLD</span><h1>WORLD OFFLINE / DEVELOPMENT.</h1><p>Phase 0 foundation. MAHFITT stays your control deck; nothing here changes your training data.</p></section>';
    if (!cur.ok) {
      var why = cur.reason === 'CLIENT_CONTEXT_BLOCKED' ? 'Coach Mode is viewing a client. MAHWORLD belongs to the signed-in account only, so there is no world here.' : cur.reason === 'NO_ACCOUNT' ? 'No signed-in account.' : 'Not available in this context (' + cur.reason + ').';
      return html + '<section class="mahset-group"><header>STATUS</header>' + row('OWNER', 'NONE', why) + '</section></main>';
    }
    var prog = p.progression, mg = p.mahgic;
    html += '<section class="mahset-group"><header>STATUS</header>'
      + row('WORLD', stateLabel(st))
      + row('OWNER', String(p.ownerAccountId).slice(0, 8).toUpperCase(), 'Signed-in account · never the active fitness profile')
      + row('AUTHORITY', p.authority === 'server' ? 'SERVER' : 'LOCAL DRAFT · PREVIEW ONLY', 'Progression is derived from MAHFITT truth; a client preview is never authoritative')
      + '</section>'
      + '<section class="mahset-group"><header>PROGRESSION</header>'
      + row('LEVEL', prog.level + ' / ' + M.Progression.MAX_LEVEL)
      + row('XP', prog.xpIntoLevel + ' / ' + (prog.xpForNextLevel - (prog.lifetimeXp - prog.xpIntoLevel)), 'lifetime ' + prog.lifetimeXp + ' · curve ' + prog.curveVersion)
      + row(M.RESOURCE_NAME, Math.round(mg.current) + ' / ' + Math.round(mg.capacity), 'recovers ' + mg.recoveryPerMinute.toFixed(2) + ' per minute')
      + row('AVATAR STATUS', p.avatarCreated ? 'CREATED' : 'NOT CREATED', 'Renderer-independent avatar data; how it is drawn is a later decision')
      + '</section>'
      + '<section class="mahset-group"><header>CONTROLS</header>'
      + (p.mahworldEnabled
        ? action('disable', 'LEAVE MAHWORLD FOR THIS ACCOUNT', 'Turns the world off. Your MAHFITT data is untouched.', st === M.STATES.ACTIVE || st === M.STATES.ENTERING || st === M.STATES.EXITING)
        : action('enable', 'ENABLE MAHWORLD FOR THIS ACCOUNT', 'Explicit opt-in. Presence stays off until you turn it on separately.'))
      + (st === M.STATES.AVAILABLE ? action('enter', 'ENTER MAHWORLD', 'Development control · a simulated world session that returns you here.') : '')
      + (st === M.STATES.ACTIVE ? action('exit', 'EXIT TO MAHFITT', 'Ends the simulated session and returns to the control deck.') : '')
      + (st === M.STATES.ENTERING ? action('cancel', 'CANCEL ENTRY', 'Returns to available.') : '')
      + action('preview', 'RUN SAMPLE DERIVATION · PREVIEW', 'Feeds a labelled fixture workout through the adapter. Not your real training.', !p.mahworldEnabled)
      + action('reset', 'RESET LOCAL DRAFT', 'Clears the development draft for this account on this device.')
      + '</section>'
      + '<section class="mahset-group"><header>PRESENCE</header>'
      + row('PUBLIC PRESENCE', p.presenceOptIn ? 'ON' : 'OFF', 'Separate opt-in. Device location is never public presence.')
      + '</section>'
      + '<section class="mahset-group"><header>MAHTROPOLIS · PORTALS TO MAHFITT</header>'
      + M.MAHTROPOLIS.map(function (d) {
        var later = !M.destinationOpens(d);
        return action('portal:' + d.id, d.label.toUpperCase(), later ? 'Later phase · no MAHFITT surface yet' : 'Opens ' + d.mahfittOwner, later);
      }).join('')
      + '</section></main>';
    return html;
  }

  /* ---- behaviour ------------------------------------------------------- */
  /* The ONE place an exit completes: the draft forgets the world it was in,
     then the session returns to AVAILABLE. Used by the simulated exit timer
     and by unmount(), so leaving the page mid-exit cannot strand a ref. */
  function settleExit(reason) {
    var cur = current();
    if (cur.ok && cur.profile.currentWorldRef) { cur.profile.currentWorldRef = null; saveProfile(cur.profile); }
    session.exited(reason);
  }
  function onAction(id) {
    if (!M || !session) return;
    var cur = ensureOwner(); if (!cur.ok) return;
    var p = cur.profile;
    if (id === 'enable') { p.mahworldEnabled = true; p.onboarding = M.ONBOARDING.IN_PROGRESS; saveProfile(p); syncAvailability(p); if (mounted && rerender) rerender(); return; }
    if (id === 'disable') { p.mahworldEnabled = false; saveProfile(p); syncAvailability(p); if (mounted && rerender) rerender(); return; }
    if (id === 'enter') {
      if (!session.enter('dev-control')) return;
      /* The simulated world takes a moment to be "ready"; a real world would
         call session.entered() when its own runtime is up. */
      later(function () { if (session.state === M.STATES.ENTERING) { p.currentWorldRef = { worldId: 'mahtropolis-dev', sessionId: 'sim-' + Date.now().toString(36) }; saveProfile(p); session.entered('simulated-world-ready'); } }, 700);
      return;
    }
    if (id === 'cancel') { session.cancelEntry('dev-cancel'); return; }
    if (id === 'exit') {
      if (!session.exit('dev-control')) return;
      later(function () { if (session.state === M.STATES.EXITING) settleExit('returned-to-mahfitt'); }, 500);
      return;
    }
    if (id === 'preview') {
      var now = new Date().toISOString();
      var w = JSON.parse(JSON.stringify(FIXTURE_WORKOUT)); w.completedAt = now;
      var a = JSON.parse(JSON.stringify(FIXTURE_ACTIVITY)); a.completedAt = now;
      var sig = M.signals.normalizeWorkout(w).concat(M.signals.normalizeActivity(a));
      var d = M.derive(sig);
      var next = M.antiExploit.applyDerivation(p, d, { authority: M.antiExploit.AUTHORITY.PREVIEW });
      saveProfile(next);
      if (mounted && rerender) rerender();
      return;
    }
    if (id === 'reset') { M.store.clear(p.ownerAccountId); if (session.state === M.STATES.AVAILABLE) session.makeUnavailable('draft-reset'); if (mounted && rerender) rerender(); return; }
    if (id.indexOf('portal:') === 0) { M.openDestination(id.slice(7)); return; }
  }

  function mount(el, opts) {
    root = el || null; mounted = !!root; rerender = opts && typeof opts.rerender === 'function' ? opts.rerender : null;
    if (!root) return;
    var cur = ensureOwner();
    if (cur && cur.ok) syncAvailability(cur.profile);
    paintState();
    if (!root._mahworldBound) {
      root._mahworldBound = true;
      root.addEventListener('click', function (e) {
        var b = e.target && e.target.closest && e.target.closest('[data-mahworld-action]');
        if (!b || !root.querySelector('[data-mahworld-page]')) return;
        if (b.disabled) return;
        e.preventDefault(); e.stopPropagation();
        onAction(String(b.getAttribute('data-mahworld-action') || ''));
      }, true);
    }
  }
  /* Leaving the page (the app's page-teardown owner calls this on every
     route boundary) drops the pending simulated transitions and settles a
     half-way state, so nothing can fire later over another page. */
  function unmount() {
    mounted = false; rerender = null; clearTimers();
    if (M && session) {
      if (session.state === M.STATES.ENTERING) session.cancelEntry('left-the-deck');
      else if (session.state === M.STATES.EXITING) settleExit('left-the-deck');
    }
  }
  /* For the app: call after sign-in, sign-out or session loss. */
  function syncOwner() { ensureOwner(); return sessionOwner; }

  applyDevSwitchFromUrl();
  paintState();

  window.MAHWORLD_SHELL = {
    version: 'phase0',
    get session() { return session; },
    pageHTML: pageHTML,
    mount: mount,
    unmount: unmount,
    syncOwner: syncOwner,
    applyDevSwitchFromUrl: applyDevSwitchFromUrl,
    paintState: paintState
  };
})();
