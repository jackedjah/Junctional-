(function () {
  'use strict';

  /* Internal API and storage names intentionally retain meal-gradient for
     compatibility. Everything a person sees is now Meal Grade. */
  var API = '/api/meal-gradient';
  var MESSAGE_API = '/api/message-center';
  var TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
  var MAX_PHOTOS = 4;
  var HOLD_MS = 3000;
  var RECOVERY_MS = 2000;
  /* Stability is intentionally sampled far below the video frame rate. The
     preview keeps the camera's native/compositor path while a tiny 40x30
     surface does the only pixel read. Photo resolution remains ample for the
     vision model without making iPhone Safari encode a 2K canvas four times. */
  var ANALYSIS_MS = 180;
  var THUMB_ANALYSIS_MS = 520;
  var MAX_IMAGE_EDGE = 1280;
  var JPEG_QUALITY = 0.84;
  var DEFAULT_CALORIE_GOAL = 2500;
  var MAH_CONTEXT_LIMIT = 250;

  var C = null;
  /* R52 — the feedback/message surface is still one canonical owner. The new
     crown launcher opens that same surface above the current page, so its top
     Back action closes to the page instead of forcing a trip through MAH LOG. */
  var feedbackReturnMode = 'log';
  var feedbackReturnView = '';
  var overlay = null;
  var previousOverflow = null;
  var stream = null;
  var cameraAudioScope = false;
  var cameraSession = 0;
  var cameraStarting = false;
  var holdRAF = 0;
  var cameraTimers = [];

  var photos = [];
  var mealType = 'breakfast';
  var entryId = null;
  var submissionId = null;
  var captureFinalized = false;
  var uploadTail = Promise.resolve();
  var attachmentTail = Promise.resolve();

  var stableMS = 0;
  var badSince = 0;
  var goodTick = 0;
  var lastSample = null;
  var captureLock = false;
  var captureHeld = false;
  var captureStarted = false;
  var captureWasReleased = false;
  var capturePointerId = null;
  var captureKey = '';
  var submitting = false;
  /* Job III browser-history preservation: page history may temporarily suspend
     a Meal surface without discarding its in-memory Scanner draft. Normal new
     navigation still uses close()/open() and therefore keeps existing reset
     semantics. */
  var scannerSurfaceMode = 'picker';
  var mahContext = '';
  var mahContextResolved = false;
  var mahContextOpen = false;
  var mahContextBusy = false;
  var lastStatus = '';
  var lastTimer = '';
  var lastProgress = -1;

  var currentFilter = '';
  var logRows = [];
  var logLoaded = false;
  var logContextKey = '';
  var logLoadId = 0;
  var lastGoalValue = null;
  var lastPhysiqueGoalValue = null;
  var settingsCache;
  var physiqueGoalCache;
  var storageCache = null;
  var storageLoaded = false;
  var nutritionHistoryCache = null;
  var currentEntry = null;
  var carouselIndex = 0;
  var dailySummary = null;
  var pendingAnalysisAttempts = {};
  var pendingAnalysisInFlight = {};
  var pendingAnalysisQueueActive = false;

  var touchX = null;
  var touchY = null;
  var touchMode = '';
  var touchRow = null;
  var touchOffset = 0;
  var swipeOpenId = '';
  var swipeSuppressClickUntil = 0;
  var swipePointerId = null;
  var swipeStartX = 0;
  var swipeStartY = 0;
  var swipeStartAt = 0;
  var swipeStartOffset = 0;
  var swipeIntent = '';
  var swipeRow = null;
  var reviewReturnScroll = 0;
  var reviewDraftRating = '';
  var reviewSaving = false;
  var messageRows = [];
  var messageSummary = null;
  var messageBusy = false;
  var messageLoadId = 0;
  var messageActionIndex = 0;
  var messageActionSwipe = null;
  var thumbSignalState = { left: null, right: null, leftUntil: 0, rightUntil: 0 };

  function h(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function mealDisplayName(value) {
    var text = String(value || 'Meal photo').trim() || 'Meal photo';
    return text.replace(/(^|[\s\-\/(])([a-z])/g, function (_, lead, letter) {
      return lead + letter.toUpperCase();
    });
  }

  function token() {
    try { return localStorage.getItem('fob.mygym.memberToken') || ''; }
    catch (e) { return ''; }
  }

  function contextKey() {
    if (C && C.mode === 'coach') return 'coach:' + String(C.memberId || '');
    var memberToken = token();
    return 'member:' + (memberToken ? memberToken.slice(-16) : String(C && C.memberName || ''));
  }

  function requestContext() {
    return {
      mode: C && C.mode,
      memberId: C && C.memberId,
      memberToken: token()
    };
  }

  function contextualBody(body, context) {
    body = Object.assign({}, body || {});
    var active = context || requestContext();
    if (active.mode === 'coach' && active.memberId) {
      body.memberId = active.memberId;
    } else {
      var memberToken = active.memberToken || token();
      if (memberToken) body.memberToken = memberToken;
      else if (active.memberId) body.memberId = active.memberId;
    }
    return body;
  }

  function req(body, context) {
    body = contextualBody(body, context);
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timeout = controller ? window.setTimeout(function () { controller.abort(); }, body.action === 'analyze' ? 36000 : 45000) : 0;
    return fetch(API, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      return response.json().then(function (json) {
        json._status = response.status;
        return json;
      }).catch(function () {
        return { ok: false, error: 'Invalid response.', code: 'INVALID_RESPONSE', _status: response.status };
      });
    }).catch(function (error) {
      return {
        ok: false,
        error: error && error.name === 'AbortError' ? 'Request timed out.' : 'Connection unavailable.',
        code: error && error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK',
        _status: 0
      };
    }).then(function (result) {
      if (timeout) window.clearTimeout(timeout);
      return result;
    });
  }

  function messageReq(body, context) {
    body = contextualBody(body, context);
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timeout = controller ? window.setTimeout(function () { controller.abort(); }, 30000) : 0;
    return fetch(MESSAGE_API, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      return response.json().then(function (json) {
        json._status = response.status; return json;
      }).catch(function () { return { ok: false, error: 'Invalid response.', _status: response.status }; });
    }).catch(function (error) {
      return { ok: false, error: error && error.name === 'AbortError' ? 'Request timed out.' : 'Connection unavailable.',
        code: error && error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK', _status: 0 };
    }).then(function (result) { if (timeout) window.clearTimeout(timeout); return result; });
  }

  function friendlyError(result, fallback) {
    if (result && result._status === 401) return 'YOUR SESSION EXPIRED · RETURN TO MAH GYM AND SIGN IN AGAIN';
    if (result && (result.code === 'NETWORK' || result.code === 'TIMEOUT' || result._status === 0)) {
      return 'CONNECTION INTERRUPTED · TAP SUBMIT TO RETRY';
    }
    if (result && result.code === 'STORAGE_FAILED') return 'PHOTO STORAGE WAS INTERRUPTED · TAP SUBMIT TO RETRY';
    return fallback || 'MEAL GRADE IS UNAVAILABLE · TRY AGAIN';
  }

  function cameraLater(fn, delay, session) {
    var id = window.setTimeout(function () {
      var index = cameraTimers.indexOf(id);
      if (index >= 0) cameraTimers.splice(index, 1);
      if (session == null || session === cameraSession) fn();
    }, delay);
    cameraTimers.push(id);
    return id;
  }

  function clearCameraTimers() {
    cameraTimers.forEach(function (id) { window.clearTimeout(id); });
    cameraTimers = [];
  }

  function cancelFrame() {
    if (holdRAF) cancelAnimationFrame(holdRAF);
    holdRAF = 0;
  }

  function stopCamera() {
    cameraSession += 1;
    cameraStarting = false;
    cancelFrame();
    clearCameraTimers();
    stableMS = 0;
    badSince = 0;
    goodTick = 0;
    lastSample = null;
    captureLock = false;
    captureHeld = false;
    captureStarted = false;
    captureWasReleased = false;
    capturePointerId = null;
    captureKey = '';
    lastStatus = '';
    lastTimer = '';
    lastProgress = -1;
    thumbSignalState = { left: null, right: null, leftUntil: 0, rightUntil: 0 };
    var video = document.getElementById('mgVideo');
    if (video) {
      video.onloadedmetadata = null;
      try { video.pause(); } catch (e) {}
      try { video.srcObject = null; } catch (e) {}
    }
    if (stream) {
      stream.getTracks().forEach(function (track) {
        track.onended = null;
        try { track.stop(); } catch (e) {}
      });
      stream = null;
    }
    if (cameraAudioScope && C && typeof C.onCameraStop === 'function') {
      cameraAudioScope = false;
      try { C.onCameraStop(); } catch (e) {}
    }
  }

  function notifyWorkoutDockVisibility() {
    if (C && typeof C.syncWorkoutDock === 'function') {
      try { C.syncWorkoutDock(); } catch (e) {}
    }
  }

  function removeOverlay(restorePage, suppressDockSync) {
    stopCamera();
    if (overlay) overlay.remove();
    overlay = null;
    document.body.classList.remove('mg-page-open');
    if (restorePage && previousOverflow !== null) {
      document.documentElement.style.overflow = previousOverflow;
      previousOverflow = null;
    }
    if (!suppressDockSync) notifyWorkoutDockVisibility();
  }

  function standaloneDisplay() {
    try {
      return !!(window.navigator && window.navigator.standalone)
        || !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    } catch (e) { return false; }
  }

  function shell(inner, className) {
    removeOverlay(false, true);
    overlay = document.createElement('div');
    overlay.className = 'mg-shell' + (C && C.mode === 'member' ? ' mg-member-theme' : '')
      + (className ? ' ' + className : '') + (standaloneDisplay() ? ' mg-standalone' : '');
    overlay.innerHTML = inner;
    /* ══ PAGE-BLEED GUARD ══════════════════════════════════════════════════
       Set as inline style, not CSS. The camera overlay had accumulated many
       competing background rules across member-theme, [data-mg-camera] and
       !important variants, and the one that won made the shell transparent,
       which is what let My Gym cards show through the control zones.

       An inline style beats every stylesheet rule regardless of specificity or
       source order, so this cannot be lost to a future override. It is the
       floor: the live feed and the 35% control tint still paint on top of it,
       and it is also the fallback surface while the camera is starting,
       denied, or unavailable. */
    if (className && className.indexOf('mg-camera-shell') >= 0) {
      var ground = (C && C.mode === 'member')
        ? 'rgb(var(--ink-rgb, 14, 17, 20))'
        : '#050607';
      overlay.style.setProperty('position', 'fixed', 'important');
      overlay.style.setProperty('inset', '0', 'important');
      overlay.style.setProperty('background', ground, 'important');
      overlay.style.setProperty('z-index', '9000', 'important');
      overlay.style.setProperty('isolation', 'isolate', 'important');
      overlay.style.setProperty('overflow', 'hidden', 'important');
    } else {
      /* v361 — Meal Scanner / Log are true full-page destinations.  The v360
         shared atmosphere intentionally made app roots transparent, but a
         transparent fixed Meal Grade shell exposes the already-rendered MAH
         GYM page underneath it.  That is why the log/scanner looked like a
         skeleton laid over Recent Sessions.  Give every non-camera Meal Grade
         shell its own opaque themed atmosphere and temporarily suppress the
         underlying app paint while the destination is open. */
      overlay.style.setProperty('position', 'fixed', 'important');
      overlay.style.setProperty('inset', '0', 'important');
      overlay.style.setProperty('background',
        'radial-gradient(ellipse 48% 34% at 22% 22%,color-mix(in srgb,var(--mg-bright,#e9c98f) 5%,transparent),transparent 74%),' +
        'radial-gradient(ellipse 54% 38% at 78% 55%,color-mix(in srgb,var(--mg-bright,#e9c98f) 4%,transparent),transparent 76%),' +
        'radial-gradient(ellipse at 50% 43%,color-mix(in srgb,var(--mg-bg,#0e1114) 95%,white 5%) 0%,var(--mg-bg,#0e1114) 55%,color-mix(in srgb,var(--mg-bg,#0e1114) 82%,#000 18%) 84%,#000 125%)',
        'important');
      overlay.style.setProperty('isolation', 'isolate', 'important');
    }
    document.body.appendChild(overlay);
    document.body.classList.add('mg-page-open');
    if (previousOverflow === null) previousOverflow = document.documentElement.style.overflow || '';
    document.documentElement.style.overflow = 'hidden';
    overlay.addEventListener('click', click);
    overlay.addEventListener('touchstart', touchStart, { passive: true });
    overlay.addEventListener('touchmove', touchMove, { passive: false });
    overlay.addEventListener('touchend', touchEnd, { passive: true });
    overlay.addEventListener('pointerdown', swipePointerDown);
    overlay.addEventListener('pointermove', swipePointerMove);
    overlay.addEventListener('pointerup', swipePointerUp);
    overlay.addEventListener('pointercancel', swipePointerCancel);
    overlay.addEventListener('lostpointercapture', swipePointerCancel);
    notifyWorkoutDockVisibility();
    return overlay;
  }

  /* Same markup contract as mygym's banner skips. mygym.js delegates the
     handler on document, so these work here without any bridge. */
  function mgLogoGlyph(kind) {
    if (kind === 'play') return '<span class="mg-logo-diamond" aria-hidden="true"></span>';
    var back = kind === 'back';
    var d = back ? 'M20 4 8 12l12 8V4Zm-8 0L0 12l12 8V4Z' : 'M4 4l12 8L4 20V4Zm8 0l12 8-12 8V4Z';
    return '<svg viewBox="0 0 32 24" aria-hidden="true"><path d="' + d + '"></path></svg>';
  }
  function mgSkipGlyph(dir) {
    var back = dir < 0;
    return '<button class="mg-logo-skip mg-logo-skip--' + (back ? 'back' : 'forward') + '" data-a="theme-logo-skip" data-dir="' + (back ? '-1' : '1') + '" aria-label="' + (back ? 'Previous track' : 'Next track') + '">' + mgLogoGlyph(back ? 'back' : 'forward') + '</button>';
  }
  function mgLogoTransport(extraClass){return '<span class="mg-logo-transport '+h(extraClass||'')+'" role="group" aria-label="MAHFITT Theme transport">'+mgSkipGlyph(-1)+'<button class="mg-logo-play" data-a="theme" aria-label="Play or pause MAHFITT Theme">'+mgLogoGlyph('play')+'</button>'+mgSkipGlyph(1)+'</span>'}


  function top(title, action, label) {
    return '<div class="mg-top"><b>' + h(title) + '</b>'
      + '<button class="mg-close" data-mg="' + h(action || 'close') + '" aria-label="'
      + h(label || 'Close') + '">×</button></div>';
  }

  function recaptureIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.25 8.35h3.15l1.35-2h4.5l1.35 2h3.15v9.3H5.25z"></path>'
      + '<circle class="mg-camera-lens" cx="12" cy="13" r="2.05"></circle><path class="mg-camera-glint" d="M16.35 10.2h.01"></path></svg>';
  }

  function calendarIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="1"></rect>'
      + '<path d="M7 3.5v4M17 3.5v4M3.5 10h17"></path></svg>';
  }

  function pencilIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16z"></path>'
      + '<path d="m13.8 6.2 4 4"></path></svg>';
  }

  function thumbIcon(rotation) {
    return '<svg class="mg-thumb-icon" style="--mg-thumb-rotate:' + Number(rotation || 0) + 'deg" viewBox="0 0 24 24" aria-hidden="true">'
      + '<path d="M7 10v10H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Zm0 0 4-7c.7-1.2 2.7-.8 2.7.7V7h4.8c1.6 0 2.8 1.5 2.3 3l-2 7.2A3 3 0 0 1 16 19H7"></path></svg>';
  }

  function wordmark() {
    return '<span class="mg-fob-wordmark mg-mahfitt-wordmark" aria-hidden="true"></span>';
  }

  function logDate() {
    try { return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(); }
    catch (e) { return ''; }
  }

  function musicIsPlaying() {
    try { return !!(C && typeof C.isMusicPlaying === 'function' && C.isMusicPlaying()); }
    catch (e) { return false; }
  }
  function studioIsPlaying() {
    try { return !!(C && typeof C.isStudioPlaying === 'function' && C.isStudioPlaying()); }
    catch (e) { return false; }
  }

  function musicButton(extraClass) {
    if (!C || C.mode !== 'member' || typeof C.toggleMusic !== 'function') return '';
    return '<button class="mg-music-toggle mg-theme-play-toggle ' + h(extraClass || '') + '" data-mg="theme-audio" data-playing="'
      + (musicIsPlaying() ? '1' : '0') + '" aria-label="' + (musicIsPlaying() ? 'Pause' : 'Play') + ' theme music">'
      + '<span class="mg-music-play" aria-hidden="true"></span><span class="mg-music-pause" aria-hidden="true"><i></i><i></i></span></button>';
  }
  function studioButton(extraClass) {
    if (!C || C.mode !== 'member' || typeof C.openMusicStudio !== 'function') return '';
    return '<button class="mg-studio-toggle ' + h(extraClass || '') + '" data-mg="music-studio" aria-label="Open mah player music library"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="musiclib__wave" d="M2.8 10.9v2.2M4.3 9.7v4.6M5.8 7.9v8.2M7.3 10.2v3.6M8.8 6.1v11.8M10.3 8.7v6.6M11.8 4.8v14.4M13.3 8.1v7.8M14.8 6.8v10.4M16.3 9.3v5.4M17.8 5.7v12.6M19.3 8.4v7.2M20.8 10v4M22.1 11v2"></path><path class="musiclib__wave-spine" d="M2.2 12h20"></path></svg></button>';
  }
  function studioPlayButton(extraClass) {
    if (!C || C.mode !== 'member' || typeof C.toggleStudioMusic !== 'function') return '';
    return '<button class="mg-music-toggle mg-studio-play-toggle ' + h(extraClass || '') + '" data-mg="music-studio-play" data-playing="'
      + (studioIsPlaying() ? '1' : '0') + '" aria-label="' + (studioIsPlaying() ? 'Pause' : 'Play') + ' mah player track">'
      + '<span class="mg-music-play" aria-hidden="true"></span><span class="mg-music-pause" aria-hidden="true"><i></i><i></i></span></button>';
  }
  function themeEditorButton(extraClass) {
    if (!C || C.mode !== 'member' || typeof C.openThemeEditor !== 'function') return '';
    return '<button class="mg-theme-edit-toggle ' + h(extraClass || '') + '" data-mg="theme-edit" aria-label="Edit theme music"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="palette" d="M11.4 3.2C6.2 3.2 2.2 6.8 2.2 11.3c0 4.6 3.7 8.2 8.5 8.2h1.1c1.3 0 2.1-.9 1.7-1.9-.4-1.1.2-2.1 1.5-2.1h1.3c3.2 0 5.5-2.4 5.5-5.4 0-4-4.3-6.9-10.4-6.9Z"/><circle cx="6.5" cy="10" r=".9"/><circle cx="8.9" cy="6.9" r=".9"/><circle cx="13" cy="6.4" r=".9"/><path class="brush" d="m20.7 2.6-8.2 8.2 2.5 2.5 6.8-9.5c.6-.9-.3-1.9-1.1-1.2ZM12.4 11c-1.9.3-3 1.2-3.2 2.7-.2 1.3-1.1 1.9-2.2 2.2 2.9.8 5.4.1 7.4-2.3"/></svg></button>';
  }

  function paintMusicButtons() {
    if (!overlay) return;
    var playing = musicIsPlaying(), studioPlaying = studioIsPlaying();
    Array.prototype.forEach.call(overlay.querySelectorAll('.mg-theme-play-toggle'), function (button) {
      button.setAttribute('data-playing', playing ? '1' : '0');button.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' theme music');
    });
    Array.prototype.forEach.call(overlay.querySelectorAll('.mg-studio-play-toggle'), function (button) {
      button.setAttribute('data-playing', studioPlaying ? '1' : '0');button.setAttribute('aria-label', (studioPlaying ? 'Pause' : 'Play') + ' mah player track');
    });
  }

  function toggleMusicFromMealGrade() {
    if (!C || typeof C.toggleMusic !== 'function') return;
    try { C.toggleMusic(); } catch (e) {}
    paintMusicButtons();
    /* YouTube state arrives asynchronously. These tiny paints update only the
       icon state; the audio engine remains the single source of truth. */
    window.setTimeout(paintMusicButtons, 80);
    window.setTimeout(paintMusicButtons, 280);
  }
  function toggleStudioFromMealGrade() {
    if (!C || typeof C.toggleStudioMusic !== 'function') return;
    try { C.toggleStudioMusic(); } catch (e) {}
    paintMusicButtons();window.setTimeout(paintMusicButtons, 80);window.setTimeout(paintMusicButtons, 280);
  }

  /* Job III: Meal Log + Scanner keep their existing overlay/router ownership,
     but the expanded music rack itself comes from mygym.js's one canonical
     transport factory.  No audio element or page-local DSP state is created
     here. */
  function crownTransport(scope) {
    if (!C || C.mode !== 'member' || typeof C.musicTransportHTML !== 'function') return '';
    try { return C.musicTransportHTML(scope || 'meal'); } catch (e) { return ''; }
  }
  /* R52 — Meal Log / Scanner are body-level route surfaces, but their ordinary
     crown Message hardware is still generated by mygym.js's one canonical
     factory. This module only asks for the markup; it does not clone the icon
     or create a second message state owner. */
  function crownMessageButton() {
    if (!C || C.mode !== 'member' || typeof C.crownMessageHTML !== 'function') return '';
    try { return C.crownMessageHTML(); } catch (e) { return ''; }
  }
  function crownAiButton() {
    if (!C || C.mode !== 'member' || typeof C.crownAiHTML !== 'function') return '';
    try { return C.crownAiHTML(); } catch (e) { return ''; }
  }
  function crownCalendarButton() {
    if (C && C.mode === 'member' && typeof C.crownCalendarHTML === 'function') {
      try { return C.crownCalendarHTML(); } catch (e) {}
    }
    return '<button class="themeplay crowncalendar mg-log-calendar-crown" data-mg="calendar" aria-label="Open MAH Calendar">' + calendarIcon() + '</button>';
  }
  function crownThemeEditorButton() {
    if (C && C.mode === 'member' && typeof C.crownThemeEditHTML === 'function') {
      try { return C.crownThemeEditHTML(); } catch (e) {}
    }
    return themeEditorButton('mg-log-theme-edit');
  }
  function crownCollapsed() {
    try { return !!(window.MAHFITT_UI_STATE && window.MAHFITT_UI_STATE.getCrownCollapsed()); } catch (e) { return false; }
  }
  function crownCollapseButton() {
    var collapsed = crownCollapsed();
    return '<button type="button" class="mf-banner__collapse" data-a="banner-collapse" aria-label="' + (collapsed ? 'Expand' : 'Collapse') + ' audio crown" aria-expanded="' + (collapsed ? 'false' : 'true') + '"><svg class="mf-banner__chevron" viewBox="0 0 16 10" aria-hidden="true" focusable="false"><path d="M2.5 7.5 8 2.5l5.5 5"/></svg></button>';
  }

  function logTop() {
    var member = C && C.mode === 'member';
    var recapture = member
      ? '<button class="mg-top-icon mg-recapture-button" data-mg="picker" aria-label="Take another Meal Grade photo">' + recaptureIcon() + '</button>'
      : '';
    /* R54 — Member MAH LOG local utility deck is intentionally TWO controls:
       PHOTO + CODE only. Calendar is now the canonical ordinary-crown quick key;
       Message remains in the shared crown and X remains removed from member DOM.
       Coach mode keeps its existing CODE + close header. */
    var actions = member
      ? '<span class="mg-top-actions">' + recapture + codeButton() + '</span>'
      : '<span class="mg-top-actions">' + codeButton()
        + '<button class="mg-close" data-mg="close" aria-label="Close Meal Grade">×</button></span>';
    return member
      /* v408 canonical MAH LOG masthead: Player pair mirrors Theme pair around
         an independent physical 50% MAHFITT/transport axis. Page/date remain
         in the frame corners; the two utility keys are the sibling deck below
         so they scroll away while the hardware masthead stays fixed. */
      ? '<div class="mg-top mg-log-top mg-log-top-member mg-log-top-centered mf-banner mf-banner--member mf-banner--meal" data-collapsed="' + (crownCollapsed() ? '1' : '0') + '">'
        + '<span class="mf-banner__center mg-log-center"><span class="mg-log-brandrow"><button class="mg-fob-home" data-mg="gym-home" aria-label="Back to MAH Gym">' + wordmark() + '</button></span>'
        + mgLogoTransport('mg-log-banner-transport') + '</span>'
        + '<span class="mg-log-musicpair mg-log-musicpair--studio mf-banner__player">' + studioButton('mg-log-studio') + studioPlayButton('mg-log-studio-play') + '<span class="mg-log-pairlabel">Player</span></span>'
        + '<span class="mg-log-musicpair mg-log-musicpair--theme mf-banner__theme">' + crownAiButton() + crownThemeEditorButton() + '<span class="mg-log-pairlabel">Theme</span></span>'
        + crownMessageButton() + crownTransport('meal-log') + crownCollapseButton()
        + '</div>'
        + '<div class="mf-page-context mg-page-context"><strong>MAH LOG</strong><time>' + h(logDate()) + '</time></div>'
        + '<div class="mg-log-tools"><span class="mg-log-membername">' + h(C && C.memberName || 'Member') + '</span>'
        + actions
        + '</div>'
      : '<div class="mg-top mg-log-top"><b>Meal Grade Log</b>' + actions + '</div>';
  }

  /* Member Meal Log renders the exact shared transport owned by mygym.js.
     This module receives markup + a paint callback only; it never creates an
     Audio element, Web Audio graph, provider player or competing music state. */
  function musicTransport() { return ''; }

  function reviewTop(title, action, label) {
    return '<div class="mg-top mg-review-top"><button class="mg-review-back" data-mg="' + h(action)
      + '" aria-label="' + h(label) + '"><span aria-hidden="true">‹</span> Back</button><b>' + h(title) + '</b><i></i></div>';
  }

  function divider(extraClass) {
    return '<div class="mg-motion-divider' + (extraClass ? ' ' + h(extraClass) : '') + '" aria-hidden="true"><span></span></div>';
  }

  function makeSubmissionId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return 'mg-' + window.crypto.randomUUID();
    }
    return 'mg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  function releasePhoto(photo) {
    if (photo && photo.previewUrl) {
      try { URL.revokeObjectURL(photo.previewUrl); } catch (e) {}
      photo.previewUrl = '';
    }
  }

  function releasePhotos(list) {
    (list || photos).forEach(releasePhoto);
  }

  function abandonPhotos(list) {
    (list || photos).forEach(function (photo) {
      photo.removed = true;
      releasePhoto(photo);
    });
  }

  function resetMahContext() {
    mahContext = '';
    mahContextResolved = false;
    mahContextOpen = false;
    mahContextBusy = false;
  }

  function resetCaptureData() {
    releasePhotos();
    photos = [];
    entryId = null;
    submissionId = makeSubmissionId();
    captureFinalized = false;
    submitting = false;
    resetMahContext();
    uploadTail = Promise.resolve();
    attachmentTail = Promise.resolve();
  }

  function discardDraft() {
    if (captureFinalized || !submissionId || (!entryId && !photos.length)) return;
    var draftSubmission = submissionId;
    var draftContext = requestContext();
    var pending = uploadTail.catch(function () {});
    pending.then(function () {
      return req({ action: 'discardDraft', submissionId: draftSubmission }, draftContext);
    });
  }

  function close() {
    discardDraft();
    abandonPhotos();
    photos = [];
    entryId = null;
    pendingAnalysisQueueActive = false;
    removeOverlay(true);
    feedbackReturnMode = 'log';
    feedbackReturnView = '';
  }

  function canHistoryNavigate() {
    return !submitting && !mahContextBusy && !mahContextOpen && !captureHeld;
  }

  function suspend() {
    if (!canHistoryNavigate()) return false;
    /* removeOverlay stops camera hardware but intentionally does NOT discard
       photos/submission/context. Forward history can rebuild the same surface. */
    removeOverlay(true);
    return true;
  }

  function resume(context, view) {
    C = Object.assign({}, C || {}, context || {});
    if (!C.mode) C.mode = C.memberId ? 'coach' : 'member';
    if (view === 'meal-log') { logUI(currentFilter, false); return true; }
    if (scannerSurfaceMode === 'camera') cameraUI();
    else pickerUI();
    return true;
  }

  function open(context) {
    close();
    C = context || {};
    if (!C.mode) C.mode = C.memberId ? 'coach' : 'member';
    var nextContext = contextKey();
    if (nextContext !== logContextKey) {
      logContextKey = nextContext;
      logRows = [];
      logLoaded = false;
      settingsCache = undefined;
      physiqueGoalCache = undefined;
      storageCache = null;
      storageLoaded = false;
      nutritionHistoryCache = null;
    }
    mealType = 'breakfast';
    currentFilter = '';
    resetCaptureData();
    pickerUI();
  }

  /* ---------- meal selection: deliberately before camera permission ---------- */
  function pickerUI() {
    scannerSurfaceMode = 'picker';
    /* v324 header: BACK | FOB SYSTEMS wordmark | MUSIC, then the animated
       border beam, then MEAL GRADE as the page title beneath it. The wordmark
       is the existing circle-free mark and takes the Secondary theme colour
       through .mg-fob-home, exactly like the Meal Log. Its data-mg="site-home"
       action already asks for confirmation before leaving. The coach header is
       deliberately unchanged; the brief and screenshot scope this to the
       member surface. */
    var member = !!(C && C.mode === 'member');
    var pickerHead = member
      ? '<span class="mg-picker-brandrow"><button class="mg-fob-home mg-picker-home" data-mg="gym-home" aria-label="Back to MAH Gym">' + wordmark() + '</button></span>'
      : '<b>Meal Grade</b>';
    var canonicalHead = member
      ? '<div class="mg-picker-top mg-picker-top-canonical mg-log-top-centered mf-banner mf-banner--member mf-banner--meal" data-collapsed="' + (crownCollapsed() ? '1' : '0') + '"><span class="mf-banner__center mg-log-center">' + pickerHead + mgLogoTransport('mg-picker-banner-transport') + '</span>'
        + '<span class="mg-log-musicpair mg-log-musicpair--studio mf-banner__player">' + studioButton('mg-picker-studio') + studioPlayButton('mg-picker-studio-play') + '<span class="mg-log-pairlabel">Player</span></span>'
        + '<span class="mg-log-musicpair mg-log-musicpair--theme mf-banner__theme">' + crownAiButton() + crownThemeEditorButton() + '<span class="mg-log-pairlabel">Theme</span></span>'
        + crownMessageButton() + crownTransport('meal-scanner') + crownCollapseButton() + '</div>'
        + '<div class="mf-page-context mg-page-context mg-picker-page-context"><strong>MAH SCANNER</strong><time>' + h(logDate()) + '</time></div>'
        + '<div class="mg-picker-backrow"><button class="mg-back mf-back-control" data-mg="close" aria-label="Back to gym"><span class="mf-back-arrow" aria-hidden="true"></span></button></div>'
      : '<div class="mg-picker-top"><button class="mg-back mf-back-control" data-mg="close" aria-label="Back to gym"><span class="mf-back-arrow" aria-hidden="true"></span></button>' + pickerHead + '</div>';
    shell(
      canonicalHead
      + '<div class="mg-picker"><span class="mg-kicker">Choose meal</span>'
      + '<div class="mg-picker-stage">'
      + '<button class="mg-nav prev" data-mg="meal-prev" aria-label="Previous meal">‹</button>'
      + '<button class="mg-meal-choice beam" data-mg="meal-confirm"><span>' + h(mealType) + '</span></button>'
      + '<button class="mg-nav next" data-mg="meal-next" aria-label="Next meal">›</button></div>'
      + divider('mg-picker-fobeam')
      + '<div class="mg-picker-tips"><b>How to use it</b><ul>'
      + '<li>Choose the meal being logged.</li>'
      + '<li>Frame the entire meal.</li>'
      + '<li>Align a thumb with either guide when possible for a stronger portion-size reference.</li>'
      + '<li>Press and hold Ready while the 3-second capture runs.</li>'
      + '<li>Capture up to four angles.</li>'
      + '<li>Release to pause, then hold Resume to continue.</li>'
      + '<li>At least one photo is required to submit.</li>'
      + '</ul></div>'
      + '<button class="mg-picker-log" data-mg="log">Open mah log</button></div>',
      'mg-picker-shell'
    );
    if (member && C && typeof C.paintMusicTransport === 'function') {
      window.requestAnimationFrame(function () { try { C.paintMusicTransport(); } catch (e) {} });
    }
  }

  function cycleMeal(direction) {
    var index = TYPES.indexOf(mealType);
    mealType = TYPES[(index + direction + TYPES.length) % TYPES.length];
    var label = overlay && overlay.querySelector('.mg-meal-choice span');
    if (!label) return;
    label.classList.remove('slide-left', 'slide-right');
    label.textContent = mealType;
    label.classList.add(direction > 0 ? 'slide-left' : 'slide-right');
  }

  function cameraUI() {
    scannerSurfaceMode = 'camera';
    captureHeld = false;
    captureStarted = false;
    captureWasReleased = false;
    capturePointerId = null;
    captureKey = '';
    submitting = false;
    stableMS = 0;
    badSince = 0;
    goodTick = 0;
    lastSample = null;
    shell(
      '<div class="mg-camwrap">'
      + '<div class="mg-camera-top">'
      + '<button class="mg-cam-back" data-mg="picker" aria-label="Back to meal selection">'
      + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 5 8.5 12l7 7"/></svg></button>'
      + '<div class="mg-camera-title"><b>' + h(mealType) + '</b>'
      + '<span id="mgGuide">Frame the full meal · align either thumb with a side guide for scale</span></div>'
      + '<span class="mg-camera-spacer" aria-hidden="true"></span></div>'
      /* One full-screen video is the complete camera surface. The clear
         rounded frame and the 35% control zones are overlays on this same
         element, so iPhone Safari never has to render one MediaStream through
         two competing video decoders and the My Gym page cannot bleed in. */
      + '<video class="mg-camfeed" id="mgVideo" autoplay playsinline webkit-playsinline muted aria-label="Live Meal Grade camera"></video>'
      + '<div class="mg-view" id="mgView">'
      + '<div class="mg-mask"><div class="mg-grid"></div><div class="mg-cross"></div>'
      + thumbGuide('left') + thumbGuide('right')
      + '<div class="mg-read"><i id="mgBar"></i></div>'
      + '<div class="mg-timer" id="mgTimer">3.0</div>'
      + '<div class="mg-status" id="mgStatus" role="status" aria-live="polite">PRESS AND HOLD READY</div>'
      + '<div class="mg-flash" id="mgFlash"></div></div></div>'
      + '<div class="mg-camera-dock"><div class="mg-captured"><span>Photos</span>'
      + '<div class="mg-countline"><b id="mgCount">' + photos.length + ' / 4</b></div>'
      + '<div class="mg-thumbs" id="mgThumbs"></div></div>'
      + '<div class="mg-ready-slot"><button class="mg-ready beam" data-mg="ready" id="mgReady" disabled>Ready</button></div>'
      + '<div class="mg-dock-actions">'
      + '<button class="mg-attach" data-mg="choose" id="mgAttach" aria-label="Attach photo">'
      + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.7 12.9l6.2-6.2a3.1 3.1 0 014.4 4.4l-8 8a5 5 0 01-7.1-7.1l8.5-8.5"/></svg></button>'
      + '<button class="mg-submit" data-mg="submit" id="mgSubmit" disabled>Submit</button></div></div>'
      + '<input id="mgFile" type="file" accept="image/*" multiple hidden></div>',
      'mg-camera-shell'
    );
    overlay.setAttribute('data-mg-camera', 'hold');
    var fileInput = document.getElementById('mgFile');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        var chosen = Array.prototype.slice.call(fileInput.files || [], 0, MAX_PHOTOS - photos.length);
        fileInput.value = '';
        chosen.forEach(function (file) {
          attachmentTail = attachmentTail.then(function () { return fileToPhoto(file); });
        });
      });
    }
    bindReadyHold();
    renderThumbs();
    startCamera();
  }

  function thumbGuide(side) {
    return '<div class="mg-thumb-guide ' + side + '" id="mgThumb' + (side === 'left' ? 'Left' : 'Right') + '" aria-hidden="true">'
      + '<svg viewBox="0 0 56 104"><path class="skin" d="M35 96C21 94 13 85 14 70l2-27c1-9 3-18 8-25 4-6 9-9 14-7 5 2 7 8 5 15l-4 17c5-2 10 0 13 5 4 6 3 15-1 23l-6 13c-3 7-6 10-10 12z"/>'
      + '<path class="nail" d="M31 19c4-3 8-1 8 4l-3 13c-1 4-4 6-7 5-3-1-4-4-3-8l2-9c1-2 1-4 3-5z"/></svg></div>';
  }

  function cameraError(error) {
    var name = error && error.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      status('CAMERA PERMISSION DENIED · USE ATTACHMENT OR ENABLE CAMERA ACCESS');
    } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      status('NO CAMERA FOUND · USE ATTACHMENT');
    } else if (name === 'NotReadableError' || name === 'TrackStartError') {
      status('CAMERA IS IN USE ELSEWHERE · CLOSE IT THERE OR USE ATTACHMENT');
    } else {
      status('CAMERA UNAVAILABLE · USE ATTACHMENT');
    }
    var readyButton = document.getElementById('mgReady');
    if (readyButton) readyButton.disabled = true;
  }

  function startCamera() {
    var video = document.getElementById('mgVideo');
    if (!video || cameraStarting) return;
    var liveTrack = stream && stream.getVideoTracks && stream.getVideoTracks()[0];
    if (stream && liveTrack && liveTrack.readyState === 'live') {
      var existingPlay = video.play();
      if (existingPlay && existingPlay.catch) existingPlay.catch(function () {});
      updateReadyLabel();
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraError({ name: 'Unsupported' });
      return;
    }
    if (C && typeof C.onCameraStart === 'function') {
      cameraAudioScope = true;
      try { C.onCameraStart(); } catch (e) {}
    }
    cameraStarting = true;
    var session = ++cameraSession;
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 960, max: 1280 },
        frameRate: { ideal: 30, max: 30 }
      },
      audio: false
    }).then(function (mediaStream) {
      cameraStarting = false;
      if (session !== cameraSession || !document.body.contains(video)) {
        mediaStream.getTracks().forEach(function (track) { track.stop(); });
        return;
      }
      stream = mediaStream;
      video.srcObject = mediaStream;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', 'true');
      var track = mediaStream.getVideoTracks && mediaStream.getVideoTracks()[0];
      if (track) track.onended = function () {
        if (session !== cameraSession) return;
        stream = null;
        captureHeld = false;
        capturePointerId = null;
        captureKey = '';
        if (captureStarted) captureWasReleased = true;
        renderThumbs();
        updateReadyLabel();
        status('CAMERA STOPPED · USE ATTACHMENT OR RETURN AND TRY AGAIN');
      };
      var begin = function () {
        if (session !== cameraSession) return;
        var play = video.play();
        if (play && play.then) play.then(function () {
          updateReadyLabel();
          status('PRESS AND HOLD READY WHEN FRAMED');
          monitor(session);
        }).catch(cameraError);
        else {
          updateReadyLabel();
          status('PRESS AND HOLD READY WHEN FRAMED');
          monitor(session);
        }
      };
      if (video.readyState >= 1) begin();
      else video.onloadedmetadata = begin;
    }).catch(function (error) {
      cameraStarting = false;
      if (session === cameraSession) cameraError(error);
    });
  }

  function status(text) {
    if (text === lastStatus) return;
    lastStatus = text;
    var element = document.getElementById('mgStatus');
    if (element) element.textContent = text;
  }

  function timerText() {
    var text = (Math.max(0, HOLD_MS - stableMS) / 1000).toFixed(1);
    if (text === lastTimer) return;
    lastTimer = text;
    var element = document.getElementById('mgTimer');
    if (element) element.textContent = text;
  }

  function progress(value) {
    value = Math.max(0, Math.min(1, value));
    var rounded = Math.round(value * 100) / 100;
    if (rounded === lastProgress) return;
    lastProgress = rounded;
    var bar = document.getElementById('mgBar');
    if (bar) bar.style.transform = 'scaleX(' + rounded + ')';
  }

  function resetHold() {
    stableMS = 0;
    badSince = 0;
    goodTick = 0;
    lastTimer = '';
    progress(0);
    timerText();
  }

  function beginCaptureHold() {
    if (captureHeld || submitting || !stream || photos.length >= MAX_PHOTOS) return false;
    captureHeld = true;
    captureStarted = true;
    badSince = 0;
    goodTick = 0;
    lastSample = null;
    updateReadyLabel();
    renderThumbs();
    status('HOLD STEADY · PHOTO ' + (photos.length + 1) + ' OF 4');
    return true;
  }

  function pauseCaptureHold(markReleased) {
    var wasHeld = captureHeld;
    captureHeld = false;
    capturePointerId = null;
    captureKey = '';
    goodTick = 0;
    badSince = 0;
    lastSample = null;
    if (markReleased && captureStarted) captureWasReleased = true;
    if (!wasHeld && !markReleased) return;
    updateReadyLabel();
    renderThumbs();
    if (photos.length >= MAX_PHOTOS) status('4 / 4 PHOTOS READY');
    else if (captureStarted) status('PAUSED · HOLD RESUME TO CONTINUE');
    queuePendingUploads(120, cameraSession);
  }

  function bindReadyHold() {
    var button = document.getElementById('mgReady');
    if (!button) return;

    button.addEventListener('pointerdown', function (event) {
      if (event.button != null && event.button !== 0) return;
      event.preventDefault();
      if (!beginCaptureHold()) return;
      capturePointerId = event.pointerId;
      try { button.setPointerCapture(event.pointerId); } catch (e) {}
    });

    var releasePointer = function (event) {
      if (capturePointerId != null && event.pointerId != null && event.pointerId !== capturePointerId) return;
      pauseCaptureHold(true);
    };
    button.addEventListener('pointerup', releasePointer);
    button.addEventListener('pointercancel', releasePointer);
    button.addEventListener('lostpointercapture', releasePointer);
    button.addEventListener('contextmenu', function (event) { event.preventDefault(); });

    button.addEventListener('keydown', function (event) {
      if ((event.key !== ' ' && event.key !== 'Enter') || event.repeat) return;
      event.preventDefault();
      if (beginCaptureHold()) captureKey = event.key;
    });
    button.addEventListener('keyup', function (event) {
      if (!captureKey || event.key !== captureKey) return;
      event.preventDefault();
      pauseCaptureHold(true);
    });
    button.addEventListener('blur', function () { pauseCaptureHold(true); });
  }

  function thumbGuideSignal(data, width, height) {
    function zone(x0, x1, y0, y1) {
      var sum = 0;
      var sumSquares = 0;
      var count = 0;
      var minimum = 255;
      var maximum = 0;
      for (var y = y0; y < y1; y += 1) {
        for (var x = x0; x < x1; x += 1) {
          var offset = (y * width + x) * 4;
          var luminance = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
          sum += luminance;
          sumSquares += luminance * luminance;
          minimum = Math.min(minimum, luminance);
          maximum = Math.max(maximum, luminance);
          count += 1;
        }
      }
      var average = sum / Math.max(1, count);
      var variance = Math.max(0, sumSquares / Math.max(1, count) - average * average);
      return { average: average, variance: variance, range: maximum - minimum };
    }
    function active(side, metric, now) {
      var prior = thumbSignalState[side];
      var changed = prior && (Math.abs(metric.average - prior.average) > 4.5
        || Math.abs(Math.sqrt(metric.variance) - Math.sqrt(prior.variance)) > 2.8);
      /* Any finger-like object entering a guide produces either local contrast
         or a quick regional change. This deliberately sensitive cue remains
         cosmetic and never participates in capture readiness. */
      var visibleObject = metric.range > 34 && metric.variance > 62;
      if (changed || (!prior && visibleObject)) thumbSignalState[side + 'Until'] = now + 850;
      if (!prior || now >= thumbSignalState[side + 'Until']) {
        thumbSignalState[side] = prior ? {
          average: prior.average * 0.86 + metric.average * 0.14,
          variance: prior.variance * 0.86 + metric.variance * 0.14
        } : metric;
      }
      return now < thumbSignalState[side + 'Until'];
    }
    var y0 = Math.floor(height * 0.48);
    var now = Date.now();
    var leftHot = active('left', zone(0, Math.max(5, Math.floor(width * 0.30)), y0, height), now);
    var rightHot = active('right', zone(Math.floor(width * 0.70), width, y0, height), now);
    var left = document.getElementById('mgThumbLeft');
    var right = document.getElementById('mgThumbRight');
    if (left && left.classList.contains('hot') !== leftHot) left.classList.toggle('hot', leftHot);
    if (right && right.classList.contains('hot') !== rightHot) right.classList.toggle('hot', rightHot);
  }

  function monitor(session) {
    var video = document.getElementById('mgVideo');
    if (!video || !stream || session !== cameraSession) return;
    cancelFrame();
    var canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 30;
    var context = canvas.getContext('2d', { willReadFrequently: true });
    var lastAnalysis = 0;
    var lastThumbAnalysis = 0;
    var lastFrameAt = 0;
    var previousAverage = 0;
    var motionEMA = null;
    var frameIsGood = false;
    var lightState = 'ok';

    function frame(timestamp) {
      if (session !== cameraSession || !stream || !document.body.contains(video)) return;
      holdRAF = requestAnimationFrame(frame);
      if (document.visibilityState && document.visibilityState !== 'visible') {
        goodTick = 0;
        lastSample = null;
        frameIsGood = false;
        lastFrameAt = timestamp;
        return;
      }
      var needsMotion = captureHeld && !captureLock;
      var needsThumb = timestamp - lastThumbAnalysis >= THUMB_ANALYSIS_MS;
      var motionDue = needsMotion && timestamp - lastAnalysis >= ANALYSIS_MS;
      if ((motionDue || needsThumb) && video.readyState >= 2 && video.videoWidth) {
        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          var image = context.getImageData(0, 0, canvas.width, canvas.height);
          var data = image.data;
          if (needsThumb) {
            thumbGuideSignal(data, canvas.width, canvas.height);
            lastThumbAnalysis = timestamp;
          }
          if (motionDue) {
            lastAnalysis = timestamp;
            var luminanceTotal = 0;
            var difference = 0;
            var sampleCount = Math.ceil(data.length / 24);
            var sample = new Float32Array(sampleCount);
            var sampleIndex = 0;
            for (var i = 0; i < data.length; i += 24) {
              var luminance = (data[i] + data[i + 1] + data[i + 2]) / 3;
              luminanceTotal += luminance;
              if (lastSample) difference += Math.abs(luminance - lastSample[sampleIndex]);
              sample[sampleIndex] = luminance;
              sampleIndex += 1;
            }
            var averageLight = luminanceTotal / Math.max(1, sampleIndex);
            var rawMotion = lastSample ? difference / Math.max(1, sampleIndex) : 0;
            /* Discount exposure shifts: Safari often changes brightness while
               focus settles even when the phone itself is perfectly still. */
            var exposureShift = lastSample ? Math.abs(averageLight - previousAverage) : 0;
            var structuralMotion = Math.max(0, rawMotion - exposureShift * 0.72);
            var motion = structuralMotion + exposureShift * 0.16;
            motionEMA = motionEMA == null ? motion : motionEMA * 0.62 + motion * 0.38;
            lastSample = sample;
            previousAverage = averageLight;
            var goodLight = averageLight > 22 && averageLight < 250;
            var still = motionEMA < (frameIsGood ? 19 : 15.5);
            frameIsGood = goodLight && still;
            lightState = goodLight ? 'ok' : (averageLight <= 22 ? 'dark' : 'glare');
            if (frameIsGood) badSince = 0;
            else if (!badSince) badSince = timestamp;
          }
        } catch (e) {
          /* A transient canvas read failure must not stop the live preview. */
        }
      }

      if (!needsMotion) {
        goodTick = 0;
        lastFrameAt = timestamp;
        return;
      }

      if (frameIsGood) {
        var elapsed = lastFrameAt ? Math.max(0, timestamp - lastFrameAt) : 0;
        /* Count real elapsed time even on a busy frame, but never jump across
           a long suspension/orientation change. */
        stableMS += Math.min(250, elapsed);
        goodTick = timestamp;
        progress(stableMS / HOLD_MS);
        timerText();
        status(stableMS >= HOLD_MS ? 'CAPTURING…' : 'HOLD STEADY');
        if (stableMS >= HOLD_MS && photos.length < MAX_PHOTOS && !captureLock) beginCapture(session);
      } else {
        goodTick = 0;
        if (!badSince) badSince = timestamp;
        if (timestamp - badSince > RECOVERY_MS && stableMS > 0) {
          stableMS = 0;
          lastTimer = '';
          progress(0);
        }
        timerText();
        status(lightState === 'dark' ? 'MORE LIGHT · TIMER PAUSED'
          : lightState === 'glare' ? 'REDUCE GLARE · TIMER PAUSED'
            : 'HOLD STILL · TIMER PAUSED');
      }
      lastFrameAt = timestamp;
    }

    holdRAF = requestAnimationFrame(frame);
  }

  function sourceCrop(video, view, mask) {
    var sourceWidth = video.videoWidth;
    var sourceHeight = video.videoHeight;
    if (!view || !view.clientWidth || !view.clientHeight || !mask) {
      return { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
    }
    /* The single video is full-screen and object-fit:cover. Translate the
       clear rounded frame from screen coordinates into that video's source
       coordinates so saved photos match exactly what the member framed. */
    var videoRect = video.getBoundingClientRect();
    var maskRect = mask.getBoundingClientRect();
    var scale = Math.max(videoRect.width / sourceWidth, videoRect.height / sourceHeight);
    var renderedWidth = sourceWidth * scale;
    var renderedHeight = sourceHeight * scale;
    var offsetX = (videoRect.width - renderedWidth) / 2;
    var offsetY = (videoRect.height - renderedHeight) / 2;
    var x = (maskRect.left - videoRect.left - offsetX) / scale;
    var y = (maskRect.top - videoRect.top - offsetY) / scale;
    var width = maskRect.width / scale;
    var height = maskRect.height / scale;
    x = Math.max(0, Math.min(sourceWidth - 2, x));
    y = Math.max(0, Math.min(sourceHeight - 2, y));
    width = Math.max(2, Math.min(sourceWidth - x, width));
    height = Math.max(2, Math.min(sourceHeight - y, height));
    return { x: x, y: y, width: width, height: height };
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('encode'));
        }, 'image/jpeg', JPEG_QUALITY);
        return;
      }
      try {
        var data = canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1];
        var binary = atob(data);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        resolve(new Blob([bytes], { type: 'image/jpeg' }));
      } catch (e) { reject(e); }
    });
  }

  function nextAngle() {
    var used = photos.map(function (photo) { return photo.angle; });
    for (var angle = 0; angle < MAX_PHOTOS; angle += 1) {
      if (used.indexOf(angle) < 0) return angle;
    }
    return -1;
  }

  function beginCapture(session) {
    var video = document.getElementById('mgVideo');
    var view = document.getElementById('mgView');
    var mask = view && view.querySelector('.mg-mask');
    if (!video || !video.videoWidth || photos.length >= MAX_PHOTOS || captureLock
        || !captureHeld || session !== cameraSession) return;
    var angle = nextAngle();
    if (angle < 0) return;
    captureLock = true;
    var crop = sourceCrop(video, view, mask);
    var scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(crop.width, crop.height));
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(2, Math.round(crop.width * scale));
    canvas.height = Math.max(2, Math.round(crop.height * scale));
    canvas.getContext('2d', { alpha: false }).drawImage(
      video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height
    );
    var photo = {
      angle: angle,
      submissionId: submissionId,
      requestContext: requestContext(),
      width: canvas.width,
      height: canvas.height,
      blob: null,
      previewUrl: '',
      processing: true,
      uploading: false,
      uploaded: false,
      error: false,
      removed: false,
      entryId: null,
      uploadPromise: null
    };
    photos.push(photo);
    renderThumbs();
    neutralFlash(session);
    resetHold();
    updateReadyLabel();

    photo.readyPromise = canvasToBlob(canvas).then(function (blob) {
      if (photo.removed) return photo;
      photo.blob = blob;
      photo.previewUrl = URL.createObjectURL(blob);
      photo.processing = false;
      renderThumbs();
      /* Keep base64 conversion/network work out of the automatic camera
         sequence. Submit handles any pending photo immediately; a completed
         or paused series may warm storage in the background. */
      queuePendingUploads(520, session);
      return photo;
    }).catch(function () {
      photo.processing = false;
      photo.error = true;
      photo.removed = true;
      var index = photos.indexOf(photo);
      if (index >= 0) photos.splice(index, 1);
      renderThumbs();
      status('PHOTO COULD NOT BE PREPARED · HOLD STEADY TO TRY AGAIN');
      return photo;
    });

    if (photos.length >= MAX_PHOTOS) {
      captureHeld = false;
      capturePointerId = null;
      captureKey = '';
      captureWasReleased = true;
      renderThumbs();
      updateReadyLabel();
      cameraLater(function () {
        captureLock = false;
        status('4 / 4 PHOTOS READY');
        queuePendingUploads(300, session);
      }, 240, session);
    } else {
      renderThumbs();
      cameraLater(function () {
        captureLock = false;
        status(captureHeld
          ? 'PHOTO ' + photos.length + '/4 · KEEP HOLDING FOR NEXT'
          : 'PHOTO ' + photos.length + '/4 · HOLD RESUME FOR NEXT');
      }, 240, session);
    }
  }

  function neutralFlash(session) {
    var flash = document.getElementById('mgFlash');
    if (!flash) return;
    flash.className = 'mg-flash neutral on';
    cameraLater(function () { flash.classList.remove('on'); }, 260, session);
  }

  function decodeImage(file) {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () {
        return createImageBitmap(file);
      });
    }
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function () { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      image.src = url;
    });
  }

  function fileToPhoto(file) {
    if (photos.length >= MAX_PHOTOS) return Promise.resolve();
    status('PREPARING ATTACHMENT…');
    return decodeImage(file).then(function (image) {
      var width = image.width || image.naturalWidth;
      var height = image.height || image.naturalHeight;
      var scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(2, Math.round(width * scale));
      canvas.height = Math.max(2, Math.round(height * scale));
      canvas.getContext('2d', { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height);
      if (image.close) image.close();
      return canvasToBlob(canvas).then(function (blob) {
        addBlobPhoto(blob, canvas.width, canvas.height);
        status(captureHeld
          ? 'ATTACHMENT ADDED · KEEP HOLDING FOR NEXT PHOTO'
          : 'ATTACHMENT ADDED');
      });
    }).catch(function () {
      status('THAT IMAGE IS NOT SUPPORTED · CHOOSE JPEG, PNG, OR WEBP');
    });
  }

  function addBlobPhoto(blob, width, height) {
    var angle = nextAngle();
    if (angle < 0) return;
    var photo = {
      angle: angle,
      submissionId: submissionId,
      requestContext: requestContext(),
      width: width,
      height: height,
      blob: blob,
      previewUrl: URL.createObjectURL(blob),
      processing: false,
      uploading: false,
      uploaded: false,
      error: false,
      removed: false,
      entryId: null,
      uploadPromise: null,
      readyPromise: Promise.resolve()
    };
    photos.push(photo);
    renderThumbs();
    enqueueUpload(photo, false).catch(function () {
      if (!submitting) status('UPLOAD PENDING · SUBMIT WILL RETRY');
    });
    updateReadyLabel();
  }

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('read')); };
      reader.readAsDataURL(blob);
    });
  }

  function performUpload(photo) {
    if (!photo || photo.removed || photo.uploaded) return Promise.resolve({ ok: true });
    if (!photo.blob) return Promise.reject(new Error('photo-not-ready'));
    var photoSubmission = photo.submissionId || submissionId;
    var photoContext = photo.requestContext || requestContext();
    var activeEntry = photo.entryId || (photoSubmission === submissionId ? entryId : null);
    photo.uploading = true;
    photo.error = false;
    renderThumbs();
    return blobToDataURL(photo.blob).then(function (data) {
      return req({
        action: 'uploadPhoto',
        entryId: activeEntry,
        submissionId: photoSubmission,
        mealType: mealType,
        angleIndex: photo.angle,
        image: data,
        width: photo.width,
        height: photo.height,
        photoType: 'meal'
      }, photoContext);
    }).then(function (result) {
      if (!result || !result.ok) {
        var error = new Error(friendlyError(result, (result && result.error) ? String(result.error) : 'PHOTO UPLOAD INTERRUPTED · TAP SUBMIT TO RETRY'));
        error.stage = 'UPLOAD';
        error.result = result;
        throw error;
      }
      photo.entryId = result.entryId;
      photo.uploaded = true;
      photo.error = false;
      if (photoSubmission === submissionId && !photo.removed) entryId = result.entryId;
      if (photo.removed) {
        return req({ action: 'deletePhoto', entryId: photo.entryId, angleIndex: photo.angle }, photoContext).then(function (deleted) {
          photo.deleted = !!(deleted && deleted.ok);
          return deleted;
        });
      }
      return result;
    }).catch(function (error) {
      photo.error = true;
      photo.uploaded = false;
      photo.lastError = error.result || null;
      throw error;
    }).then(function (result) {
      photo.uploading = false;
      renderThumbs();
      return result;
    }, function (error) {
      photo.uploading = false;
      renderThumbs();
      throw error;
    });
  }

  function enqueueUpload(photo, forceRetry) {
    if (!photo || photo.removed || photo.uploaded) return Promise.resolve({ ok: true });
    if (photo.uploading && photo.uploadPromise) return photo.uploadPromise;
    if (photo.uploadPromise && !photo.error && !forceRetry) return photo.uploadPromise;
    var run = uploadTail.then(function () { return performUpload(photo); });
    photo.uploadPromise = run;
    uploadTail = run.catch(function () {});
    return run;
  }

  function queuePendingUploads(delay, session) {
    cameraLater(function () {
      /* HOTFIX: this was the last exact-four-photo assumption in the chain.
         While the automatic series was running with fewer than four photos,
         background uploads never started, so an early SUBMIT had to upload
         everything from cold inside the submit path. Photos now upload as they
         are taken, whatever the count, which is what makes an early submit
         responsive rather than slow. Only an in-flight submit defers it. */
      if (submitting) return;
      photos.slice().forEach(function (photo) {
        if (!photo.removed && photo.blob && !photo.uploaded && !photo.uploading) {
          enqueueUpload(photo, false).catch(function () {
            if (!submitting) status('UPLOAD PENDING · SUBMIT WILL RETRY');
          });
        }
      });
    }, delay == null ? 300 : delay, session);
  }

  function availablePhotos() {
    return photos.filter(function (photo) { return photo && !photo.removed; }).slice(0, MAX_PHOTOS);
  }

  function renderThumbs() {
    var list = document.getElementById('mgThumbs');
    var count = document.getElementById('mgCount');
    var submitButton = document.getElementById('mgSubmit');
    var attachButton = document.getElementById('mgAttach');
    if (count) count.textContent = photos.length + ' / ' + MAX_PHOTOS;
    if (submitButton) submitButton.disabled = submitting || availablePhotos().length < 1;
    if (attachButton) attachButton.disabled = submitting || photos.length >= MAX_PHOTOS;
    if (overlay) {
      overlay.classList.toggle('mg-capture-held', captureHeld && !submitting);
      overlay.classList.toggle('mg-is-saving', submitting);
    }
    if (!list) return;
    list.innerHTML = photos.map(function (photo, index) {
      var state = photo.processing ? ' processing' : photo.uploading ? ' uploading' : photo.error ? ' retry' : photo.uploaded ? ' stored' : '';
      return '<div class="mg-thumb' + state + '">'
        + (photo.previewUrl ? '<img src="' + h(photo.previewUrl) + '" alt="Captured meal angle ' + (index + 1) + '" decoding="async">' : '<span aria-hidden="true">•••</span>')
        + '<button data-mg="remove" data-i="' + index + '" aria-label="Remove photo ' + (index + 1) + '"'
        + (submitting ? ' disabled' : '') + '>×</button></div>';
    }).join('');
  }

  function updateReadyLabel() {
    var button = document.getElementById('mgReady');
    if (!button) return;
    var ariaLabel = '';
    if (!stream) {
      button.disabled = true;
      button.textContent = 'Ready';
      ariaLabel = 'Camera is not ready';
    } else if (submitting) {
      button.disabled = true;
      button.textContent = 'Saving';
      ariaLabel = 'Meal Grade is saving';
    } else if (photos.length >= MAX_PHOTOS) {
      button.disabled = true;
      button.textContent = '4 / 4';
      ariaLabel = 'Four of four meal photos captured';
    } else {
      button.disabled = false;
      button.textContent = captureWasReleased ? 'Resume' : 'Ready';
      ariaLabel = captureWasReleased
        ? 'Press and hold to resume meal photo capture'
        : 'Press and hold Ready to begin meal photo capture';
    }
    button.classList.toggle('is-held', captureHeld);
    button.setAttribute('aria-label', ariaLabel);
  }

  function ensureUploaded(snapshot) {
    snapshot = (snapshot || availablePhotos()).slice(0, MAX_PHOTOS);
    if (!snapshot.length) return Promise.reject(new Error('photo-required'));
    return Promise.all(snapshot.map(function (photo) {
      return photo.readyPromise || Promise.resolve();
    })).then(function () {
      var chain = Promise.resolve();
      snapshot.forEach(function (photo) {
        chain = chain.then(function () {
          if (photo.removed || photo.uploaded) return null;
          return enqueueUpload(photo, true);
        });
      });
      return chain;
    }).then(function () {
      var failed = snapshot.some(function (photo) { return photo.removed || !photo.uploaded; });
      if (failed) throw new Error('upload');
    });
  }

  function optimisticEntry(result, finalResult, submittedPhotos) {
    submittedPhotos = submittedPhotos || availablePhotos();
    var firstPhoto = submittedPhotos[0];
    var score = result && result.result && result.result.score;
    var analysis = result && result.result || {};
    var nutrition = analysis.nutrition_estimate || null;
    if (!score && finalResult && finalResult.score) score = finalResult.score;
    return {
      id: entryId,
      mealType: mealType,
      capturedAt: new Date().toISOString(),
      score: score || null,
      name: result && result.result && result.result.meal_name || 'Meal photo',
      reason: result && result.result && result.result.reason_short || '',
      analysisPending: false,
      improvement: result && result.result && result.result.improvement_short || '',
      numericScore: analysis.final_numeric_score == null ? null : Number(analysis.final_numeric_score),
      nutrition: nutrition ? {
        available: nutrition.available === true,
        estimated: true,
        caloriesEstimate: nutrition.calories_estimate,
        caloriesLow: nutrition.calories_low,
        caloriesHigh: nutrition.calories_high,
        proteinG: nutrition.protein_g_estimate,
        proteinGLow: nutrition.protein_g_low,
        proteinGHigh: nutrition.protein_g_high,
        carbsG: nutrition.carbs_g_estimate,
        carbsGLow: nutrition.carbs_g_low,
        carbsGHigh: nutrition.carbs_g_high,
        fatG: nutrition.fat_g_estimate,
        fatGLow: nutrition.fat_g_low,
        fatGHigh: nutrition.fat_g_high,
        confidence: nutrition.confidence,
        portionBasis: nutrition.portion_basis,
        assumptions: nutrition.assumptions || []
      } : null,
      thumb: firstPhoto && firstPhoto.previewUrl || null,
      photoCount: submittedPhotos.length,
      optimistic: true
    };
  }

  /* The one place a grade colour is derived, and it derives nothing: it reads
     the value the Meal Grade service already decided. */
  function canonicalGrade(finalResult, analysisResult) {
    var g = (finalResult && (finalResult.finalScore || finalResult.final_score
              || (finalResult.entry && (finalResult.entry.final_score || finalResult.entry.ai_score))))
         || (analysisResult && analysisResult.result && analysisResult.result.score);
    g = String(g || '').toLowerCase();
    if (g !== 'green' && g !== 'yellow' && g !== 'red') return null;
    /* A deferred preservation write is not a real grade and must not flash. */
    if (finalResult && (finalResult.analysisDeferred || finalResult.betaFallback || finalResult.beta)) return null;
    return g;
  }

  function gradeFlash(grade) {
    if (!grade) return;
    var el = document.getElementById('mgFlash');
    if (!el) return;
    el.className = 'mg-flash ' + grade;
    void el.offsetWidth;                       /* restart the animation cleanly */
    el.className = 'mg-flash ' + grade + ' on';
  }

  function normalizeMahContext(value) {
    return String(value == null ? '' : value).slice(0, MAH_CONTEXT_LIMIT);
  }

  function paintMahContextCounter(field) {
    if (!field) return;
    var clean = normalizeMahContext(field.value);
    if (field.value !== clean) field.value = clean;
    mahContext = clean;
    var counter = document.getElementById('mgContextCount');
    if (counter) counter.textContent = clean.length + ' / ' + MAH_CONTEXT_LIMIT;
  }

  function closeMahContextPrompt() {
    var layer = overlay && overlay.querySelector('.mg-context-layer');
    if (layer) layer.remove();
    mahContextOpen = false;
    mahContextBusy = false;
    notifyWorkoutDockVisibility();
  }

  function showMahContextPrompt() {
    if (!overlay || !overlay.classList.contains('mg-camera-shell') || mahContextOpen
        || mahContextBusy || submitting || availablePhotos().length < 1) return;
    pauseCaptureHold(true);
    mahContextOpen = true;
    var layer = document.createElement('div');
    layer.className = 'mg-context-layer';
    layer.setAttribute('role', 'presentation');
    layer.innerHTML = '<div class="mg-context-backdrop" aria-hidden="true"></div>'
      + '<section class="mg-context-card" role="dialog" aria-modal="true" aria-labelledby="mgContextTitle" aria-describedby="mgContextHelp">'
      + '<div class="mg-context-head"><span class="mg-context-diamond" aria-hidden="true"></span><b id="mgContextTitle">MAH CONTEXT</b></div>'
      + '<label id="mgContextHelp" for="mgContextInput">Ingredients / serving size / details the camera may miss. <em>(Optional)</em></label>'
      + '<textarea id="mgContextInput" maxlength="250" rows="4" autocomplete="off" autocapitalize="sentences" spellcheck="true" placeholder="Example: Oats with one scoop whey and 2% milk. About 1 cup cooked."></textarea>'
      + '<div class="mg-context-meta"><span>Optional meal detail</span><output id="mgContextCount">0 / 250</output></div>'
      + '<div class="mg-context-actions"><button type="button" data-mg="context-skip">SKIP</button><button type="button" class="primary" data-mg="context-continue">CONTINUE</button></div>'
      + '</section>';
    overlay.appendChild(layer);
    notifyWorkoutDockVisibility();
    layer.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        return;
      }
      if (event.key !== 'Tab') return;
      var focusable = layer.querySelectorAll('textarea,button:not([disabled])');
      if (!focusable || !focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    var field = document.getElementById('mgContextInput');
    if (field) {
      field.value = normalizeMahContext(mahContext);
      field.addEventListener('input', function () { paintMahContextCounter(field); });
      field.addEventListener('paste', function () {
        window.setTimeout(function () { paintMahContextCounter(field); }, 0);
      });
      paintMahContextCounter(field);
      window.setTimeout(function () {
        if (!mahContextOpen || document.getElementById('mgContextInput') !== field) return;
        try { field.focus({ preventScroll: true }); } catch (e) { try { field.focus(); } catch (ignore) {} }
      }, 60);
    }
  }

  function resolveMahContext(skip) {
    if (!mahContextOpen || mahContextBusy || submitting) return;
    mahContextBusy = true;
    var field = document.getElementById('mgContextInput');
    mahContext = skip ? '' : normalizeMahContext(field ? field.value : mahContext);
    mahContextResolved = true;
    closeMahContextPrompt();
    submitResolvedMeal();
  }

  function submit() {
    if (submitting || mahContextBusy || availablePhotos().length < 1) return;
    if (!mahContextResolved) { showMahContextPrompt(); return; }
    submitResolvedMeal();
  }

  function submitResolvedMeal() {
    var submitPhotos = availablePhotos();
    if (submitting || submitPhotos.length < 1) return;
    var submitSubmission = submissionId;
    var submitContext = requestContext();
    submitting = true;
    captureHeld = false;
    capturePointerId = null;
    captureKey = '';
    if (captureStarted) captureWasReleased = true;
    captureLock = true;
    goodTick = 0;
    cancelFrame();
    clearCameraTimers();
    status('SAVING MEAL…');
    var button = document.getElementById('mgSubmit');
    if (button) button.textContent = 'Saving…';
    renderThumbs();
    updateReadyLabel();
    var analysisResult = null;
    var finalResult = null;

    ensureUploaded(submitPhotos).then(function () {
      if (!entryId) { var e0 = new Error('upload'); e0.stage = 'UPLOAD'; throw e0; }
      status('PHOTOS STORED · READING MEAL…');
      return req({ action: 'analyze', entryId: entryId, mealType: mealType, note: mahContext }, submitContext);
    }).then(function (result) {
      analysisResult = result;
      if (result && result.ok && result.result) {
        return req({ action: 'finalize', id: entryId, mealType: mealType }, submitContext);
      }
      /* Preserve the already-uploaded meal without pretending it was graded.
         The camera stays open with an immediate retry action; no pending card,
         fabricated colour or success transition is shown. */
      return req({ action: 'finalize', id: entryId, mealType: mealType, analysisDeferred: true }, submitContext)
        .then(function (preserved) {
          if (!preserved || !preserved.ok) {
            var finalizeError = new Error('finalize');
            finalizeError.stage = 'FINALIZE';
            finalizeError.result = preserved;
            throw finalizeError;
          }
          captureFinalized = true;
          storageLoaded = false;
          var analysisError = new Error('analysis');
          analysisError.stage = 'ANALYSIS';
          analysisError.result = analysisResult;
          analysisError.preserved = true;
          throw analysisError;
        });
    }).then(function (result) {
      finalResult = result;
      if (!result || !result.ok) {
        var error = new Error('finalize');
        error.stage = 'FINALIZE';
        error.result = result;
        throw error;
      }
      if (submitSubmission !== submissionId) return;
      captureFinalized = true;
      storageLoaded = false;
      status('SAVED TO MEAL GRADE LOG');
      /* HOTFIX: one restrained tint, and ONLY for a grade the analysis really
         returned. A fallback, an error or a pending result never flashes, so
         the colour can never imply a grade that was not earned. The canonical
         value is read from the finalize result first, then the analysis, and
         no second score-to-grade formula is introduced here. */
      gradeFlash(canonicalGrade(finalResult, analysisResult));
      var optimistic = optimisticEntry(analysisResult, finalResult, submitPhotos);
      cameraLater(function () { logUI('', true, optimistic); }, 180, cameraSession);
    }).catch(function (error) {
      if (submitSubmission !== submissionId) return;
      submitting = false;
      captureHeld = false;
      captureStarted = true;
      captureWasReleased = true;
      capturePointerId = null;
      captureKey = '';
      captureLock = false;
      if (button) button.textContent = 'Submit';
      renderThumbs();
      updateReadyLabel();
      if (stream) monitor(cameraSession);
      /* The generic line told neither the member nor us anything. Name the
         stage that actually failed and the server's own reason when it gave
         one, so a screenshot is diagnosable. Photos are retained either way. */
      var stage = (error && error.stage) || 'SAVE';
      var why = friendlyError(error && error.result, '');
      if (!why && error && error.result && error.result.error) why = String(error.result.error);
      if (!why && error && error.message && error.message !== 'upload'
          && error.message !== 'analysis' && error.message !== 'finalize') why = String(error.message);
      if (error && error.preserved) {
        /* The meal IS safe: photos and entry are preserved and retry updates
           the same record. But hiding the reason left nobody able to tell a
           missing API key from a timeout from a rejected model. Name it. */
        var code = (error && error.result && (error.result.code || error.result.error)) || '';
        var plain = String(code || '').toUpperCase()
          .replace('NO_PROVIDER', 'AI NOT CONFIGURED')
          .replace('VISION_TIMEOUT', 'AI TIMED OUT')
          .replace('ANALYSIS_TIMEOUT', 'AI TIMED OUT')
          .replace('MODEL_UNSUPPORTED', 'MODEL NOT SUPPORTED')
          .replace('AI_AUTH_FAILED', 'AI CONNECTION REJECTED')
          .replace('AI_ACCESS_DENIED', 'AI MODEL ACCESS DENIED')
          .replace('AI_RATE_LIMITED', 'AI TEMPORARILY BUSY')
          .replace('AI_PROVIDER_UNAVAILABLE', 'AI PROVIDER UNAVAILABLE')
          .replace('ANALYSIS_REQUEST_REJECTED', 'AI REQUEST REJECTED')
          .replace('ANALYSIS_REFUSED', 'AI COULD NOT READ THIS MEAL')
          .replace('ANALYSIS_INVALID', 'AI RETURNED AN UNUSABLE READING')
          .replace('ANALYSIS_FAILED', 'AI REQUEST FAILED')
          .replace('INVALID_RESPONSE', 'SERVER RESPONSE INVALID')
          .replace('NETWORK', 'CONNECTION INTERRUPTED')
          .replace('TIMEOUT', 'CONNECTION TIMED OUT');
        status('MEAL SAVED · ' + (plain || 'READING INTERRUPTED') + ' · TAP SUBMIT TO RETRY');
      } else {
        status(stage + ' FAILED' + (why ? ' · ' + why.toUpperCase() : '') + ' · TAP SUBMIT TO RETRY');
      }
      try { window.__FOB_MG_LAST_ERROR = { stage: stage, result: (error && error.result) || null,
        message: (error && error.message) || null }; } catch (e) {}
    });
  }

  /* ---------- log ---------- */
  function codeButton() {
    return '<button class="mg-top-icon mg-code" data-mg="code" aria-label="Explain Meal Grade color code">'
      + '<i></i><i></i><i></i><span>CODE</span></button>';
  }

  function reviewRatingMeta(value) {
    if (value === 'down') return { label: 'Inaccurate', rotation: 180 };
    if (value === 'neutral') return { label: 'Partly accurate / uncertain', rotation: 90 };
    if (value === 'up') return { label: 'Accurate', rotation: 0 };
    return null;
  }

  function compactNutritionText(nutrition) {
    if (!nutrition || !nutrition.available) return '';
    return nutritionValue(nutrition.caloriesEstimate, ' kcal') + ' · '
      + nutritionValue(nutrition.proteinG, 'g protein') + ' · '
      + nutritionValue(nutrition.carbsG, 'g carbs') + ' · '
      + nutritionValue(nutrition.fatG, 'g fat');
  }

  function rememberReviewReturnScroll() {
    reviewReturnScroll = overlay ? Math.max(0, Number(overlay.scrollTop) || 0) : 0;
  }

  function returnToLogFromReview() {
    logUI(currentFilter, false);
    window.requestAnimationFrame(function () {
      if (overlay && overlay.classList.contains('mg-log-shell')) overlay.scrollTop = reviewReturnScroll;
    });
  }

  function reviewQuoteHTML(row) {
    var score = safeScore(row.score);
    var nutrition = compactNutritionText(row.nutrition);
    return '<div class="mg-review-quote ' + (row.thumb ? 'has-thumb ' : 'no-thumb ') + (score || 'unscored') + '">'
      + (row.thumb ? '<img src="' + h(row.thumb) + '" alt="Logged meal thumbnail" loading="lazy" decoding="async">' : '')
      + '<div class="mg-review-quote-copy"><b>' + h(mealDisplayName(row.name)) + '</b>'
      + '<span>' + h(dateTime(row.capturedAt) + ' · ' + (row.mealType || '')) + '</span>'
      + '<em class="' + score + '">' + h(score || (row.analysisPending ? 'retry grade' : 'unscored')) + '</em>'
      + (row.reason ? '<p>' + h(row.reason) + '</p>' : '')
      + (nutrition ? '<small>' + h(nutrition) + '</small>' : '') + '</div></div>';
  }

  function renderReviews(rows, error) {
    var target = document.getElementById('mgReviews');
    if (!target) return;
    if (error) { target.innerHTML = '<div class="mg-empty">' + h(error) + '</div>'; return; }
    var visible = currentFilter
      ? (rows || []).filter(function (row) { return row.mealType === currentFilter; })
      : (rows || []).slice();
    if (!visible.length) { target.innerHTML = '<div class="mg-empty">No meals logged yet.</div>'; return; }
    target.innerHTML = visible.map(function (row) {
      var review = row.review;
      var meta = review && reviewRatingMeta(review.aiAccuracyRating);
      var response = review
        ? '<div class="mg-coach-response reviewed"><div class="mg-review-status"><i aria-hidden="true">✓</i><b>Coach reviewed</b></div>'
          + (review.feedback ? '<p>' + h(review.feedback) + '</p>' : '')
          + (meta ? '<div class="mg-review-reaction">' + thumbIcon(meta.rotation) + '<span>' + h(meta.label) + '</span></div>' : '')
          + (review.reviewedAt ? '<time>' + h(dateTime(review.reviewedAt)) + '</time>' : '') + '</div>'
        : '<div class="mg-coach-response awaiting"><div class="mg-review-status"><i aria-hidden="true"></i><b>Awaiting coach review</b></div></div>';
      return '<article class="mg-review-item">' + reviewQuoteHTML(row) + response + '</article>';
    }).join('');
  }

  function reviewsUI() {
    if (!C || C.mode !== 'member') return;
    if (overlay && overlay.classList.contains('mg-log-shell')) rememberReviewReturnScroll();
    shell(reviewTop('Meal Grade Reviews', 'feedback-hub', 'Back to Coach and Feedback')
      + '<div class="mg-reviews" id="mgReviews"><div class="mg-empty">Loading…</div></div>', 'mg-reviews-shell');
    if (logLoaded) { renderReviews(logRows); return; }
    var loadId = ++logLoadId;
    req({ action: 'log', limit: 120 }).then(function (result) {
      if (loadId !== logLoadId || !document.getElementById('mgReviews')) return;
      if (!result || !result.ok) {
        renderReviews([], friendlyError(result, 'Coach feedback could not load right now.'));
        return;
      }
      logRows = result.entries || [];
      logLoaded = true;
      renderReviews(logRows);
    });
  }

  function messageFriendly(result, fallback) {
    if (result && result.setupRequired) return 'MESSAGE CENTER SETUP REQUIRED · RUN MIGRATION 040';
    if (result && result._status === 401) return 'YOUR SESSION EXPIRED · RETURN TO MAH GYM AND SIGN IN AGAIN';
    if (result && (result.code === 'NETWORK' || result.code === 'TIMEOUT' || result._status === 0)) return 'CONNECTION INTERRUPTED · TRY AGAIN';
    return result && result.error ? String(result.error).toUpperCase() : (fallback || 'MESSAGE CENTER IS UNAVAILABLE RIGHT NOW');
  }

  function refreshFeedbackBadge() {
    /* R52: the old MAH LOG Message key moved into the crown; preserve its
       existing unread state/badge on the relocated control. */
    var button = overlay && overlay.querySelector('.crownmessage');
    if (!button) return;
    messageReq({ action: 'summary' }).then(function (result) {
      if (!overlay || !button.isConnected || !result || !result.ok) return;
      messageSummary = result.summary || {};
      var unread = Math.max(0, Number(messageSummary.unread) || 0);
      button.setAttribute('data-unread', unread ? String(Math.min(99, unread)) : '');
      button.setAttribute('aria-label', unread ? ('Open coach messages and Meal Grade feedback · ' + unread + ' unread') : 'Open coach messages and Meal Grade feedback');
    });
  }

  function feedbackHubUI() {
    if (!C || C.mode !== 'member') return;
    if (overlay && overlay.classList.contains('mg-log-shell')) rememberReviewReturnScroll();
    var feedbackBackLabel = feedbackReturnView === 'meal-scanner'
      ? 'Back to MAH Scanner'
      : feedbackReturnView === 'meal-log' || feedbackReturnMode === 'log'
        ? 'Back to MAH LOG'
        : 'Back';
    shell(reviewTop('Coach & Feedback', 'feedback-back', feedbackBackLabel)
      + '<div class="mg-feedback-hub">'
      + '<p class="mg-feedback-intro">Private coach communication and Meal Grade reviews live together here.</p>'
      + '<button class="mg-feedback-route mg-feedback-route--messages beam" data-mg="messages"><span>MESSAGES</span><b>Coach / member board</b><small>Questions, support requests and replies.</small><i id="mgMessageUnread" hidden></i></button>'
      + '<button class="mg-feedback-route" data-mg="reviews"><span>MEAL FEEDBACK</span><b>Meal Grade reviews</b><small>Coach notes attached to your logged meals.</small></button>'
      + '</div>', 'mg-feedback-shell');
    messageReq({ action: 'summary' }).then(function (result) {
      if (!overlay || !overlay.classList.contains('mg-feedback-shell') || !result || !result.ok) return;
      messageSummary = result.summary || {};
      var badge = document.getElementById('mgMessageUnread'), unread = Math.max(0, Number(messageSummary.unread) || 0);
      if (badge && unread) { badge.hidden = false; badge.textContent = unread > 99 ? '99+' : String(unread); }
    });
  }

  function messageTime(value) {
    if (!value) return '';
    var d = new Date(value); if (!Number.isFinite(d.getTime())) return '';
    try { return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
    catch (e) { return dateTime(value); }
  }

  function messageBubbleHTML(row) {
    var sender = String(row && row.sender || ''), system = sender === 'system';
    var cls = system ? 'system' : (row.mine ? 'mine' : 'theirs');
    var request = row && row.type === 'support_request';
    return '<article class="mg-message-bubble ' + cls + (request ? ' is-request' : '') + '">'
      + '<div class="mg-message-meta"><b>' + h(system ? 'SYSTEM' : (row.mine ? 'YOU' : 'COACH')) + '</b><time>' + h(messageTime(row.createdAt)) + '</time></div>'
      + '<p>' + h(row.body || '').replace(/\n/g, '<br>') + '</p>'
      + (request ? '<div class="mg-message-request"><span>SUPPORT REQUEST</span><strong>' + h(String(row.requestStatus || 'pending').toUpperCase()) + '</strong></div>' : '')
      + '</article>';
  }

  function renderMessageThread(error) {
    var target = document.getElementById('mgMessageThread'); if (!target) return;
    if (error) { target.innerHTML = '<div class="mg-empty">' + h(error) + '</div>'; return; }
    target.innerHTML = messageRows.length ? messageRows.map(messageBubbleHTML).join('')
      : '<div class="mg-message-empty"><b>YOUR PRIVATE COACH THREAD</b><span>Send the first message whenever you need something.</span></div>';
    window.requestAnimationFrame(function () { if (target) target.scrollTop = target.scrollHeight; });
  }

  function messageActionCarouselHTML() {
    return '<div class="mg-message-actionshelf" data-message-action-carousel>'
      + '<button type="button" class="mg-message-action-arrow prev" data-mg="message-action-prev" aria-label="Previous member action">‹</button>'
      + '<div class="mg-message-action-viewport"><div class="mg-message-action-track">'
      + '<button type="button" class="mg-message-action-card" data-mg="theme-curation"><span>THEME CURATION</span><b>BUILD MY TRAINING MUSIC</b><small>$0.80 per song · 1–20 songs · delivered in 2–3 days</small></button>'
      + '<button type="button" class="mg-message-action-card" data-mg="message-reschedule"><span>CALENDAR REQUEST</span><b>REQUEST SESSION DATE CHANGE</b><small>Missed sessions that are not successfully rescheduled are deducted from your session inventory. Send requests early when possible.</small></button>'
      + '</div></div>'
      + '<button type="button" class="mg-message-action-arrow next" data-mg="message-action-next" aria-label="Next member action">›</button>'
      + '<div class="mg-message-action-dots" aria-hidden="true"><i></i><i></i></div>'
      + '</div>';
  }

  function paintMessageActionCarousel() {
    var shelf = overlay && overlay.querySelector('[data-message-action-carousel]');
    if (!shelf) return;
    messageActionIndex = Math.max(0, Math.min(1, Number(messageActionIndex) || 0));
    var track = shelf.querySelector('.mg-message-action-track');
    if (track) track.style.transform = 'translate3d(' + (-messageActionIndex * 100) + '%,0,0)';
    var dots = shelf.querySelectorAll('.mg-message-action-dots i');
    Array.prototype.forEach.call(dots, function (dot, i) { dot.classList.toggle('is-on', i === messageActionIndex); });
  }

  function bindMessageActionCarousel() {
    var shelf = overlay && overlay.querySelector('[data-message-action-carousel]');
    if (!shelf) return;
    paintMessageActionCarousel();
    var viewport = shelf.querySelector('.mg-message-action-viewport');
    if (!viewport) return;
    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      messageActionSwipe = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
      try { viewport.setPointerCapture(e.pointerId); } catch (x) {}
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!messageActionSwipe || messageActionSwipe.id !== e.pointerId) return;
      var dx = e.clientX - messageActionSwipe.x, dy = e.clientY - messageActionSwipe.y;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15) { messageActionSwipe.moved = true; if (e.cancelable) e.preventDefault(); }
    }, { passive: false });
    function finish(e) {
      if (!messageActionSwipe || messageActionSwipe.id !== e.pointerId) return;
      var dx = e.clientX - messageActionSwipe.x, dy = e.clientY - messageActionSwipe.y, moved = messageActionSwipe.moved;
      messageActionSwipe = null;
      if (moved && Math.abs(dx) >= 34 && Math.abs(dx) > Math.abs(dy)) {
        messageActionIndex = dx < 0 ? Math.min(1, messageActionIndex + 1) : Math.max(0, messageActionIndex - 1);
        paintMessageActionCarousel();
      }
    }
    viewport.addEventListener('pointerup', finish);
    viewport.addEventListener('pointercancel', function () { messageActionSwipe = null; });
  }

  function messageCenterUI() {
    if (!C || C.mode !== 'member') return;
    messageBusy = false;
    shell(reviewTop('Messages', 'feedback-hub', 'Back to Coach and Feedback')
      + '<div class="mg-message-center">'
      + '<div class="mg-message-thread" id="mgMessageThread"><div class="mg-empty">Loading…</div></div>'
      + '<div class="mg-message-compose">' + messageActionCarouselHTML() + '<label for="mgMessageText">MESSAGE JAH</label>'
      + '<textarea id="mgMessageText" maxlength="2000" rows="4" placeholder="Ask a question, share an update, or tell me what you need…"></textarea>'
      + '<div class="mg-message-status" id="mgMessageStatus" role="status" aria-live="polite"></div>'
      + '<div class="mg-message-actions"><button data-mg="message-support">REQUEST COACH</button><button class="primary" data-mg="message-send">SEND MESSAGE</button></div>'
      + '<p class="mg-message-note">Request Coach flags the note for attention. Meal-specific coaching stays in Meal Feedback.</p>'
      + '</div></div>', 'mg-message-shell');
    bindMessageActionCarousel();
    var loadId = ++messageLoadId;
    messageReq({ action: 'thread' }).then(function (result) {
      if (loadId !== messageLoadId || !document.getElementById('mgMessageThread')) return;
      if (!result || !result.ok) { renderMessageThread(messageFriendly(result)); return; }
      messageRows = Array.isArray(result.messages) ? result.messages : [];
      renderMessageThread();
    });
  }


  function curationPrice(count) {
    count = Math.max(1, Math.min(20, Number(count) || 1));
    return '$' + (count * 0.8).toFixed(2);
  }

  function themeCurationUI() {
    if (!C || C.mode !== 'member') return;
    shell(reviewTop('Theme Curation', 'messages', 'Back to Messages')
      + '<div class="mg-curation">'
      + '<div class="mg-curation-hero"><span>PRIVATE COACH CURATION</span><h3>Your training soundtrack, built for you.</h3><p>Tell Jah what you already like and what you want the music to do to your training energy.</p></div>'
      + '<label>FAVORITE ARTISTS<textarea id="mgCurationArtists" maxlength="1200" rows="3" placeholder="Artists you already reach for…"></textarea></label>'
      + '<label>FAVORITE SONGS<textarea id="mgCurationSongs" maxlength="1200" rows="3" placeholder="Specific songs, albums, eras, edits…"></textarea></label>'
      + '<label>VIBE<textarea id="mgCurationVibe" maxlength="800" rows="3" placeholder="Dark, cinematic, aggressive, nostalgic, smooth, futuristic…"></textarea></label>'
      + '<label>MOTIVATIONAL EFFECT<textarea id="mgCurationMotivation" maxlength="800" rows="3" placeholder="How should the playlist make you feel or perform?"></textarea></label>'
      + '<label class="mg-curation-count">SONGS<input id="mgCurationCount" type="number" min="1" max="20" step="1" value="10" inputmode="numeric"><strong id="mgCurationPrice">' + curationPrice(10) + '</strong></label>'
      + '<div class="mg-curation-terms"><b>2–3 DAY DELIVERY TARGET</b><span>Trusted price is calculated on the server at exactly $0.80 × song count. Payment must complete before the request is placed.</span></div>'
      + '<div id="mgCurationStatus" class="mg-message-status" role="status" aria-live="polite"></div>'
      + '<button type="button" class="mg-curation-pay" data-mg="curation-pay">CONTINUE TO PAYMENT</button>'
      + '</div>', 'mg-curation-shell');
    var count = document.getElementById('mgCurationCount');
    if (count) count.addEventListener('input', function () { var n = Math.max(1, Math.min(20, Number(count.value) || 1)); count.value = n; var price = document.getElementById('mgCurationPrice'); if (price) price.textContent = curationPrice(n); });
    messageReq({ action: 'curationStatus' }).then(function (result) {
      if (!result || !result.ok || !result.curation || !document.getElementById('mgCurationStatus')) return;
      var c = result.curation, label = String(c.status || '').replace(/_/g, ' ').toUpperCase();
      document.getElementById('mgCurationStatus').textContent = 'LATEST CURATION · ' + label + ' · ' + Number(c.songCount || 0) + ' SONGS';
      var pay = overlay && overlay.querySelector('[data-mg="curation-pay"]');
      if (String(c.status || '') === 'pending_payment') { if (pay) { pay.disabled = false; pay.textContent = 'RESUME SECURE PAYMENT'; } }
      else if (['paid','in_progress'].indexOf(String(c.status || '')) >= 0) { if (pay) { pay.disabled = true; pay.textContent = 'CURATION ALREADY IN PROGRESS'; } }
    });
  }

  function startThemeCuration(button) {
    if (messageBusy) return;
    var count = Math.max(1, Math.min(20, Number((document.getElementById('mgCurationCount') || {}).value) || 0));
    var body = { action: 'themeCuration', songCount: count,
      favoriteArtists: String((document.getElementById('mgCurationArtists') || {}).value || '').trim(),
      favoriteSongs: String((document.getElementById('mgCurationSongs') || {}).value || '').trim(),
      vibe: String((document.getElementById('mgCurationVibe') || {}).value || '').trim(),
      motivation: String((document.getElementById('mgCurationMotivation') || {}).value || '').trim(), memberToken: token() };
    var status = document.getElementById('mgCurationStatus');
    if (!body.favoriteArtists && !body.favoriteSongs) { if (status) status.textContent = 'ADD AT LEAST ONE FAVORITE ARTIST OR SONG.'; return; }
    if (!body.vibe) { if (status) status.textContent = 'DESCRIBE THE VIBE YOU WANT.'; return; }
    if (!body.motivation) { if (status) status.textContent = 'TELL JAH WHAT THE MUSIC SHOULD DO FOR YOUR TRAINING.'; return; }
    messageBusy = true; var original = button && button.textContent; if (button) { button.disabled = true; button.textContent = 'OPENING SECURE PAYMENT…'; }
    if (status) status.textContent = 'Creating your private curation checkout…';
    fetch('/api/service-checkout', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (response) { return response.json().then(function (json) { if (!response.ok || !json.ok || !json.url) throw new Error(json.error || 'Payment could not be opened.'); return json; }); })
      .then(function (result) { window.location.assign(result.url); })
      .catch(function (error) { messageBusy = false; if (button && button.isConnected) { button.disabled = false; button.textContent = original; } if (status) status.textContent = String(error.message || 'Payment could not be opened.').toUpperCase(); });
  }

  function messageStatus(message) {
    var target = document.getElementById('mgMessageStatus'); if (target) target.textContent = message || '';
  }

  function sendMemberMessage(kind, button) {
    if (messageBusy) return;
    var box = document.getElementById('mgMessageText'), body = String(box && box.value || '').trim();
    if (!body) { messageStatus(kind === 'support' ? 'Write what you need help with first.' : 'Write a message first.'); return; }
    messageBusy = true;
    var original = button && button.textContent;
    if (button) { button.disabled = true; button.textContent = kind === 'support' ? 'REQUESTING…' : 'SENDING…'; }
    messageStatus(kind === 'support' ? 'Flagging coach support…' : 'Sending…');
    messageReq({ action: kind === 'support' ? 'supportRequest' : 'send', body: body }).then(function (result) {
      messageBusy = false;
      if (button && button.isConnected) { button.disabled = false; button.textContent = original; }
      if (!result || !result.ok) { messageStatus(messageFriendly(result)); return; }
      if (result.message) messageRows.push(result.message);
      if (box) box.value = '';
      renderMessageThread();
      messageStatus(kind === 'support' ? 'Coach support requested.' : 'Message sent.');
    });
  }

  function reviewUncertainty(row) {
    if (row.needsMore) return 'AI flagged that more visual evidence could improve confidence.';
    var confidence = Number(row.confidence);
    if (Number.isFinite(confidence)) {
      return 'AI confidence: ' + Math.round(Math.max(0, Math.min(1, confidence)) * 100) + '%.';
    }
    return 'No additional AI uncertainty flag is stored for this entry.';
  }

  function reviewReactionButtons() {
    return ['down', 'neutral', 'up'].map(function (value) {
      var meta = reviewRatingMeta(value);
      var selected = reviewDraftRating === value;
      return '<button type="button" class="mg-review-rate ' + (selected ? 'selected' : '') + '" data-mg="review-rate" data-v="' + value
        + '" aria-pressed="' + selected + '" aria-label="AI accuracy: ' + h(meta.label) + '">'
        + thumbIcon(meta.rotation) + '<span>' + h(meta.label) + '</span></button>';
    }).join('');
  }

  function reviewEditorUI(id) {
    if (!C || C.mode !== 'coach') return;
    var row = logRows.find(function (item) { return item && item.id === id; });
    if (!row) { logUI(currentFilter, false); return; }
    rememberReviewReturnScroll();
    reviewSaving = false;
    reviewDraftRating = row.review && row.review.aiAccuracyRating || '';
    var score = safeScore(row.score);
    var scoreText = score || (row.analysisPending ? 'reading interrupted' : 'unscored');
    if (Number.isFinite(Number(row.numericScore))) scoreText += ' · ' + Math.round(Number(row.numericScore)) + '/100';
    var nutrition = compactNutritionText(row.nutrition);
    var feedback = row.review && row.review.feedback || '';
    shell(reviewTop('Coach Review', 'review-back', 'Back to Meal Grade Log')
      + '<div class="mg-review-editor" data-review-entry="' + h(row.id) + '">'
      + '<section class="mg-review-context"><span class="mg-kicker">' + h((row.mealType || '') + ' · ' + dateTime(row.capturedAt)) + '</span>'
      + '<div class="mg-review-context-head ' + (row.thumb ? 'has-thumb' : 'no-thumb') + '">' + (row.thumb ? '<img src="' + h(row.thumb) + '" alt="Logged meal thumbnail" loading="lazy" decoding="async">' : '')
      + '<div><h2>' + h(mealDisplayName(row.name)) + '</h2><div class="mg-score ' + score + '">' + h(scoreText) + '</div></div></div>'
      + '<dl><div><dt>AI reason</dt><dd>' + h(row.reason || 'No AI reason is stored for this entry.') + '</dd></div>'
      + '<div><dt>Estimated nutrition</dt><dd>' + h(nutrition || 'No responsible nutrition estimate is available.') + '</dd></div>'
      + '<div><dt>Uncertainty</dt><dd>' + h(reviewUncertainty(row)) + '</dd></div></dl></section>'
      + '<section class="mg-review-compose"><label for="mgCoachFeedback">Coach feedback</label>'
      + '<textarea id="mgCoachFeedback" maxlength="2000" rows="6" placeholder="Add a concise coaching note…">' + h(feedback) + '</textarea>'
      + '<fieldset><legend>How accurate was the AI reading?</legend><p>This rates the AI interpretation, not whether the member ate a “good” meal.</p>'
      + '<div class="mg-review-rates" id="mgReviewRates">' + reviewReactionButtons() + '</div></fieldset>'
      + '<div class="mg-review-editor-status" id="mgReviewStatus" role="status" aria-live="polite"></div>'
      + '<div class="mg-review-editor-actions"><button data-mg="review-back">Cancel</button><button class="primary" data-mg="review-save" data-id="' + h(row.id) + '">Save review</button></div>'
      + (row.review ? '<button class="mg-review-remove" data-mg="review-remove" data-id="' + h(row.id) + '">Remove review</button>' : '')
      + '</section></div>', 'mg-review-editor-shell');
  }

  function setReviewRating(value) {
    if (['down', 'neutral', 'up'].indexOf(value) < 0) return;
    reviewDraftRating = reviewDraftRating === value ? '' : value;
    var target = document.getElementById('mgReviewRates');
    if (target) target.innerHTML = reviewReactionButtons();
  }

  function reviewStatus(message) {
    var target = document.getElementById('mgReviewStatus');
    if (target) target.textContent = message || '';
  }

  function saveReview(id, button) {
    if (!C || C.mode !== 'coach' || reviewSaving) return;
    var textarea = document.getElementById('mgCoachFeedback');
    var feedback = textarea ? String(textarea.value || '').trim() : '';
    if (!feedback && !reviewDraftRating) {
      reviewStatus('Add feedback or choose an AI accuracy reaction before saving.');
      return;
    }
    reviewSaving = true;
    if (button) { button.disabled = true; button.textContent = 'Saving…'; }
    reviewStatus('Saving review…');
    req({ action: 'saveReview', entryId: id, feedback: feedback, aiAccuracyRating: reviewDraftRating }).then(function (result) {
      if (!result || !result.ok) {
        reviewSaving = false;
        if (button) { button.disabled = false; button.textContent = 'Save review'; }
        reviewStatus(friendlyError(result, 'Coach review could not be saved.'));
        return;
      }
      logRows.forEach(function (row) { if (row.id === id) row.review = result.review || null; });
      reviewSaving = false;
      returnToLogFromReview();
    });
  }

  function removeReview(id, button) {
    if (!C || C.mode !== 'coach' || reviewSaving) return;
    if (!window.confirm('Remove this coach review? The Meal Grade entry and AI result will be kept.')) return;
    reviewSaving = true;
    if (button) button.disabled = true;
    reviewStatus('Removing review…');
    req({ action: 'removeReview', entryId: id }).then(function (result) {
      if (!result || !result.ok) {
        reviewSaving = false;
        if (button) button.disabled = false;
        reviewStatus(friendlyError(result, 'Coach review could not be removed.'));
        return;
      }
      logRows.forEach(function (row) { if (row.id === id) row.review = null; });
      reviewSaving = false;
      returnToLogFromReview();
    });
  }

  function logUI(filter, forceReload, optimistic) {
    currentFilter = TYPES.indexOf(filter) >= 0 ? filter : '';
    stopCamera();
    shell(
      logTop()
      + '<div class="mg-loghead">' + ((C && C.mode === 'member') ? '' : '<span class="mg-kicker">' + h(C && C.memberName || 'Member') + '</span>')
      + '<div class="mg-goalblock"><button class="mg-day-progress" data-mg="nutrition-summary" '
      + 'aria-label="Open today’s estimated calories and macros"><i id="mgDayBar"></i></button>'
      + '<div class="mg-setting"><input id="mgGoal" type="number" inputmode="numeric" placeholder="2500" '
      + 'aria-label="Daily calorie goal"><span>calories per day</span></div>'
      + '<label class="mg-physique-setting"><select id="mgPhysiqueGoal" aria-label="Physique goal">'
      + '<option value="gain">Gain</option><option value="maintain" selected>Maintain</option><option value="lose">Lose</option>'
      + '</select><span>physique goal</span></label></div>'
      + divider()
      + '<div class="mg-filters">' + ['', 'breakfast', 'lunch', 'dinner', 'snack'].map(function (value) {
        return '<button data-mg="filter" data-v="' + value + '" aria-pressed="' + (value === currentFilter) + '" '
          + 'class="' + (value === currentFilter ? 'on beam' : '') + '">' + (value || 'all') + '</button>';
      }).join('') + '</div>'
      + '<div class="mg-storage" id="mgStorage"><div class="mg-storage-copy">'
      + '<span>Private Meal Grade storage</span><b>Checking…</b></div>'
      + '<div class="mg-storage-track"><i></i></div><button data-mg="wipe">Wipe</button></div>'
      + '<div class="mg-dots" id="mgDots"></div>'
      + '<div id="mgEntries"><div class="mg-empty">Loading…</div></div></div>',
      'mg-log-shell'
    );
    if (C && typeof C.paintMusicTransport === 'function') {
      window.requestAnimationFrame(function () { try { C.paintMusicTransport(); } catch (e) {} });
    }
    if (C && C.mode === 'member') refreshFeedbackBadge();

    var key = contextKey();
    if (key !== logContextKey) {
      logContextKey = key;
      logRows = [];
      logLoaded = false;
      settingsCache = undefined;
      physiqueGoalCache = undefined;
      storageCache = null;
      storageLoaded = false;
      nutritionHistoryCache = null;
    }
    if (optimistic) {
      logRows = [optimistic].concat(logRows.filter(function (row) { return row.id !== optimistic.id; }));
      logLoaded = true;
      applyFilter();
    } else if (logLoaded && !forceReload) {
      applyFilter();
      queuePendingLogAnalysis();
    }

    loadSettings();
    loadStorage();
    if (!logLoaded || forceReload) loadLog(optimistic);
  }

  function normalizePhysiqueGoal(value) {
    value = String(value || '').toLowerCase();
    return ['gain', 'maintain', 'lose'].indexOf(value) >= 0 ? value : 'maintain';
  }

  function currentPhysiqueGoal() {
    var select = document.getElementById('mgPhysiqueGoal');
    return normalizePhysiqueGoal(select && select.value || physiqueGoalCache || 'maintain');
  }

  function loadSettings() {
    var goal = document.getElementById('mgGoal');
    var physique = document.getElementById('mgPhysiqueGoal');
    if (!goal || !physique) return;
    var key = contextKey();
    goal.addEventListener('input', renderDailyNutrition);
    goal.addEventListener('change', saveGoal);
    goal.addEventListener('blur', saveGoal);
    physique.addEventListener('change', savePhysiqueGoal);
    if (settingsCache !== undefined && physiqueGoalCache !== undefined) {
      goal.value = settingsCache || '';
      physique.value = normalizePhysiqueGoal(physiqueGoalCache);
      lastGoalValue = String(goal.value || '');
      lastPhysiqueGoalValue = physique.value;
      renderDailyNutrition();
      return;
    }
    req({ action: 'settings' }).then(function (result) {
      if (key !== contextKey()) return;
      var current = document.getElementById('mgGoal');
      var currentPhysique = document.getElementById('mgPhysiqueGoal');
      if (!current || !currentPhysique || !result || !result.ok) return;
      settingsCache = result.calorieGoal == null || Number(result.calorieGoal) <= 0
        ? DEFAULT_CALORIE_GOAL : Number(result.calorieGoal);
      physiqueGoalCache = normalizePhysiqueGoal(result.physiqueGoal);
      current.value = settingsCache;
      currentPhysique.value = physiqueGoalCache;
      lastGoalValue = String(current.value || '');
      lastPhysiqueGoalValue = currentPhysique.value;
      renderDailyNutrition();
    });
  }

  function loadStorage() {
    if (storageLoaded) { renderStorage(storageCache); return; }
    var key = contextKey();
    req({ action: 'storageStats' }).then(function (result) {
      if (key !== contextKey()) return;
      storageCache = result;
      storageLoaded = true;
      renderStorage(result);
    });
  }

  function loadLog(optimistic) {
    var loadId = ++logLoadId;
    req({ action: 'log', limit: 120 }).then(function (result) {
      if (loadId !== logLoadId || !document.getElementById('mgEntries')) return;
      if (result && result.ok) {
        logRows = result.entries || [];
        logLoaded = true;
        applyFilter();
        renderDailyNutrition();
        queuePendingLogAnalysis();
        releasePhotos();
        photos = [];
        entryId = null;
        return;
      }
      if (optimistic) {
        applyFilter('Saved, but the Log could not refresh. Reopen the Log when your connection returns.');
      } else {
        renderLog([], friendlyError(result, 'The Meal Grade Log could not load.'));
      }
    });
  }

  function saveGoal() {
    var goal = document.getElementById('mgGoal');
    if (!goal) return;
    var value = String(goal.value || '');
    var physique = currentPhysiqueGoal();
    var key = contextKey();
    if (value === lastGoalValue && physique === lastPhysiqueGoalValue) return;
    lastGoalValue = value;
    lastPhysiqueGoalValue = physique;
    renderDailyNutrition();
    req({ action: 'saveSettings', calorieGoal: value, physiqueGoal: physique }).then(function (result) {
      if (key !== contextKey()) return;
      if (!result || !result.ok) { lastGoalValue = null; lastPhysiqueGoalValue = null; }
      else {
        settingsCache = result.calorieGoal == null || Number(result.calorieGoal) <= 0
          ? DEFAULT_CALORIE_GOAL : Number(result.calorieGoal);
        physiqueGoalCache = normalizePhysiqueGoal(result.physiqueGoal);
        var current = document.getElementById('mgGoal');
        var currentPhysique = document.getElementById('mgPhysiqueGoal');
        if (current && !String(current.value || '').trim()) current.value = settingsCache;
        if (currentPhysique) currentPhysique.value = physiqueGoalCache;
        renderDailyNutrition();
      }
    });
  }

  function savePhysiqueGoal() {
    var select = document.getElementById('mgPhysiqueGoal');
    var goal = document.getElementById('mgGoal');
    if (!select) return;
    var physique = normalizePhysiqueGoal(select.value);
    if (physique === lastPhysiqueGoalValue) return;
    lastPhysiqueGoalValue = physique;
    var key = contextKey();
    req({ action: 'saveSettings', calorieGoal: goal ? String(goal.value || '') : null, physiqueGoal: physique }).then(function (result) {
      if (key !== contextKey()) return;
      if (!result || !result.ok) { lastPhysiqueGoalValue = null; return; }
      physiqueGoalCache = normalizePhysiqueGoal(result.physiqueGoal);
      settingsCache = result.calorieGoal == null || Number(result.calorieGoal) <= 0
        ? DEFAULT_CALORIE_GOAL : Number(result.calorieGoal);
      var current = document.getElementById('mgPhysiqueGoal');
      if (current) current.value = physiqueGoalCache;
    });
  }

  function localDayKey(value) {
    var date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    var pad = function (number) { return String(number).padStart(2, '0'); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function nutritionTotals(rows, dayKey) {
    var meals = (rows || []).filter(function (row) { return localDayKey(row.capturedAt) === dayKey; });
    var usable = meals.filter(function (row) {
      return row.nutrition
        && row.nutrition.caloriesEstimate != null && Number.isFinite(Number(row.nutrition.caloriesEstimate));
    });
    function total(key) {
      if (!usable.length || usable.some(function (row) {
        return row.nutrition[key] == null || !Number.isFinite(Number(row.nutrition[key]));
      })) return null;
      return Math.round(usable.reduce(function (sum, row) { return sum + Number(row.nutrition[key]); }, 0));
    }
    return {
      dayKey: dayKey,
      mealCount: meals.length,
      estimateCount: usable.length,
      calories: total('caloriesEstimate'),
      caloriesLow: total('caloriesLow'),
      caloriesHigh: total('caloriesHigh'),
      protein: total('proteinG'),
      carbs: total('carbsG'),
      fat: total('fatG')
    };
  }

  function renderDailyNutrition() {
    var bar = document.getElementById('mgDayBar');
    if (!bar) return;
    dailySummary = nutritionTotals(logRows, localDayKey(new Date()));
    var goalInput = document.getElementById('mgGoal');
    var goal = Math.max(0, Number(goalInput && goalInput.value) || Number(settingsCache) || DEFAULT_CALORIE_GOAL);
    var progressValue = goal > 0 && dailySummary.calories != null ? dailySummary.calories / goal : 0;
    bar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, progressValue)) + ')';
    var button = bar.parentNode;
    if (button) {
      button.classList.toggle('over', progressValue > 1);
      button.classList.toggle('empty', dailySummary.estimateCount < 1);
      button.setAttribute('aria-label', dailySummary.calories == null
        ? 'No estimated calories are available for today. Open estimated nutrition summary.'
        : 'Estimated ' + dailySummary.calories + ' calories today out of a ' + (goal || 'not set') + ' calorie goal. Open summary.');
    }
  }

  function nutritionValue(value, suffix) {
    return value == null || !Number.isFinite(Number(value)) ? '—' : Math.round(Number(value)) + (suffix || '');
  }

  function nutritionDateLabel(dayKey) {
    var bits = String(dayKey || '').split('-').map(Number);
    if (bits.length !== 3) return dayKey;
    var date = new Date(bits[0], bits[1] - 1, bits[2], 12, 0, 0);
    try { return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch (e) { return dayKey; }
  }

  function nutritionSummaryHTML(summary) {
    var goalInput = document.getElementById('mgGoal');
    var goal = Math.max(0, Number(goalInput && goalInput.value) || Number(settingsCache) || DEFAULT_CALORIE_GOAL);
    var calorieLine = summary.calories == null ? 'Not enough visible evidence yet'
      : nutritionValue(summary.calories, '') + ' kcal <small>(' + nutritionValue(summary.caloriesLow, '')
        + '–' + nutritionValue(summary.caloriesHigh, '') + ' estimated range)</small>';
    var coverage = summary.mealCount
      ? summary.estimateCount + ' of ' + summary.mealCount + ' logged meal' + (summary.mealCount === 1 ? '' : 's') + ' estimated'
      : 'No meals logged for this date';
    return '<span class="mg-kicker">' + h(nutritionDateLabel(summary.dayKey)) + '</span>'
      + '<h3>Estimated daily nutrition</h3><div class="mg-nutrition-calories">' + calorieLine + '</div>'
      + '<div class="mg-macro-grid"><span><b>' + nutritionValue(summary.protein, 'g') + '</b><small>protein</small></span>'
      + '<span><b>' + nutritionValue(summary.carbs, 'g') + '</b><small>carbs</small></span>'
      + '<span><b>' + nutritionValue(summary.fat, 'g') + '</b><small>fat</small></span></div>'
      + '<p class="mg-estimate-note">' + h(coverage) + (goal ? ' · ' + h(nutritionValue(summary.calories, '')) + ' / ' + h(goal) + ' calorie goal.' : '.')
      + ' These are photo-based estimates, not measured nutrition.</p>';
  }

  function nutritionPopup(history) {
    var existing = document.getElementById('mgNutritionModal');
    if (existing) existing.remove();
    if (!overlay) return;
    var modal = document.createElement('div');
    modal.id = 'mgNutritionModal';
    modal.className = 'mg-nutrition-modal';
    var body = history
      ? '<div id="mgNutritionHistory"><div class="mg-empty">Loading estimated history…</div></div>'
      : nutritionSummaryHTML(dailySummary || nutritionTotals(logRows, localDayKey(new Date())));
    modal.innerHTML = '<button class="mg-nutrition-backdrop" data-mg="nutrition-close" aria-label="Close estimated nutrition"></button>'
      + '<section class="mg-nutrition-dialog" role="dialog" aria-modal="true" aria-labelledby="mgNutritionTitle">'
      + '<header>' + (history
        ? '<button data-mg="nutrition-summary" class="mg-history-button">Today</button>'
        : '<button data-mg="nutrition-history" class="mg-history-button">History</button>')
      + '<b id="mgNutritionTitle">Estimated nutrition</b><button data-mg="nutrition-close" class="mg-nutrition-x" aria-label="Close">×</button></header>'
      + '<div class="mg-nutrition-body">' + body + '</div></section>';
    overlay.appendChild(modal);
    if (history) loadNutritionHistory();
  }

  function loadNutritionHistory() {
    var target = document.getElementById('mgNutritionHistory');
    if (!target) return;
    function paint(rows) {
      var groups = {};
      (rows || []).forEach(function (row) {
        var key = localDayKey(row.capturedAt);
        if (!key) return;
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });
      var keys = Object.keys(groups).sort().reverse();
      if (!keys.length) { target.innerHTML = '<div class="mg-empty">No estimated history yet.</div>'; return; }
      target.innerHTML = keys.map(function (key) {
        var summary = nutritionTotals(groups[key], key);
        return '<div class="mg-history-row"><span><b>' + h(nutritionDateLabel(key)) + '</b><small>'
          + h(summary.estimateCount + ' meal' + (summary.estimateCount === 1 ? '' : 's') + ' estimated') + '</small></span>'
          + '<em>' + h(nutritionValue(summary.calories, ' kcal')) + '</em></div>';
      }).join('');
    }
    if (nutritionHistoryCache) { paint(nutritionHistoryCache); return; }
    req({ action: 'nutritionHistory' }).then(function (result) {
      var current = document.getElementById('mgNutritionHistory');
      if (!current) return;
      if (!result || !result.ok) {
        current.innerHTML = '<div class="mg-empty">Estimated history could not load right now.</div>';
        return;
      }
      nutritionHistoryCache = result.entries || [];
      target = current;
      paint(nutritionHistoryCache);
    });
  }

  function closeNutritionPopup() {
    var modal = document.getElementById('mgNutritionModal');
    if (modal) modal.remove();
  }

  function fmtBytes(number) {
    number = Math.max(0, Number(number) || 0);
    if (number < 1024 * 1024) return (number / 1024).toFixed(number < 10240 ? 1 : 0) + ' KB';
    return (number / (1024 * 1024)).toFixed(number < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
  }

  function renderStorage(result) {
    var element = document.getElementById('mgStorage');
    if (!element) return;
    var label = element.querySelector('b');
    var bar = element.querySelector('.mg-storage-track i');
    if (!result || !result.ok) {
      element.classList.add('unavailable');
      label.textContent = 'Usage unavailable';
      return;
    }
    var count = Math.max(0, Number(result.photoCount) || 0);
    if (result.limitBytes && result.usedBytes != null && result.percent != null) {
      var percent = Math.max(0, Math.min(100, Number(result.percent) || 0));
      label.textContent = fmtBytes(result.usedBytes) + ' / ' + fmtBytes(result.limitBytes) + ' · ' + Math.round(percent) + '%';
      if (bar) bar.style.transform = 'scaleX(' + (percent / 100) + ')';
    } else {
      element.classList.add('no-quota');
      label.textContent = count + ' private photo' + (count === 1 ? '' : 's') + ' stored';
      if (bar) bar.style.transform = 'scaleX(0)';
    }
  }

  function applyFilter(syncMessage) {
    if (!overlay) return;
    Array.prototype.forEach.call(overlay.querySelectorAll('.mg-filters button'), function (button) {
      var on = button.getAttribute('data-v') === currentFilter;
      button.classList.toggle('on', on);
      button.classList.toggle('beam', on);
      button.setAttribute('aria-pressed', String(on));
    });
    var rows = currentFilter
      ? logRows.filter(function (row) { return row.mealType === currentFilter; })
      : logRows.slice();
    renderLog(rows, null, syncMessage);
    renderDailyNutrition();
  }

  function safeScore(value) {
    return ['green', 'yellow', 'red'].indexOf(String(value || '').toLowerCase()) >= 0
      ? String(value).toLowerCase() : '';
  }

  function dateTime(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    try {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · '
        + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      return (date.getMonth() + 1) + '/' + date.getDate();
    }
  }

  /* ── Meal Log timeline grouping ────────────────────────────────────────
     Grouping reuses the EXISTING localDayKey defined above, which the
     nutrition summary already depends on. Do not add a second copy: a
     duplicate declaration hoists over the original, and loadNutritionHistory
     sorts its keys lexicographically, so an unpadded variant would order
     October before August.

     That helper reads the instant back with getFullYear/getMonth/getDate, so
     the day is the LOCAL displayed one. A meal captured at 11:50 PM stays on
     that local day even though its UTC timestamp is already the next date.
     Nothing here writes: the stored timestamp is untouched. */
  function dayStamp(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    try { return date.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase(); }
    catch (e) { return (date.getMonth() + 1) + '/' + date.getDate(); }
  }

  /* A restrained contextual label. The real date always stays visible; this
     only ever adds to it. Compared as whole local days, so an entry from
     11:50 PM yesterday never reads as "Today" at 12:10 AM. */
  function relativeDay(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    var now = new Date();
    var then = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.round((today - then) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return '';
  }

  function renderLog(rows, error, syncMessage) {
    var dots = document.getElementById('mgDots');
    var list = document.getElementById('mgEntries');
    if (dots) {
      dots.innerHTML = rows.filter(function (row) { return safeScore(row.score); }).slice(0, 30).reverse()
        .map(function (row) { return '<i class="mg-dot ' + safeScore(row.score) + '"></i>'; }).join('');
    }
    if (!list) return;
    if (error) {
      list.innerHTML = '<div class="mg-empty">' + h(error) + '</div>';
      return;
    }
    var note = syncMessage ? '<div class="mg-sync-note">' + h(syncMessage) + '</div>' : '';
    if (!rows.length) {
      list.innerHTML = note + '<div class="mg-empty">No meals logged yet.</div>';
      return;
    }
    swipeOpenId = '';
    /* rows arrives already filtered and already sorted, so grouping is purely
       visual: a marker is emitted only when the local calendar day changes.
       The same date can therefore never repeat, and a day whose only matching
       entry was filtered out simply never emits one. */
    var lastDayKey = '';
    list.innerHTML = note + rows.map(function (row) {
      /* new Date(null) is the epoch rather than an error, so an entry with no
         timestamp would otherwise open a JAN 1 1970 group. Guarded here rather
         than inside localDayKey, which the nutrition summary shares. */
      var dayKey = row.capturedAt ? localDayKey(row.capturedAt) : '', mark = '';
      if (dayKey && dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        var context = relativeDay(row.capturedAt);
        /* The shortcut rides on TODAY's marker only. data-mg="picker" is the
           same action as the header camera button, and it always logs into the
           current day, so offering it beside AUG 18 would promise a back-date
           the product does not support. Member surface only, like the header
           camera button it clones. */
        var addHere = context === 'Today' && C && C.mode === 'member'
          ? '<button class="mg-daymark-add" data-mg="picker" aria-label="Log a meal for today">'
            + recaptureIcon() + '</button>'
          : '';
        mark = '<p class="mg-daymark"><b>' + h(dayStamp(row.capturedAt)) + '</b>'
          + (context ? '<span>' + h(context) + '</span>' : '') + addHere + '</p>';
      }
      var score = safeScore(row.score);
      var scoreLabel = row.analysisPending ? 'retry grade' : (score || 'unscored');
      var count = Math.max(1, Number(row.photoCount) || 1);
      var coach = C && C.mode === 'coach';
      var reviewed = !!row.review;
      return mark + '<div class="mg-entry-row" data-entry-row="' + h(row.id) + '">'
        + (coach ? '<button class="mg-entry-review" data-mg="review-editor" data-id="' + h(row.id)
          + '" aria-label="Review this Meal Grade AI reading">' + pencilIcon() + '</button>' : '')
        + '<button class="mg-entry-delete" data-mg="delete" data-id="' + h(row.id)
        + '" aria-label="Permanently delete this Meal Grade entry">×</button>'
        + '<button class="mg-entry ' + (score || 'unscored') + '" data-mg="entry" data-id="' + h(row.id) + '">'
        + '<span class="mg-entry-photo ' + (row.thumb ? '' : 'ph') + '">'
        + (row.thumb ? '<img src="' + h(row.thumb) + '" alt="Logged meal" loading="lazy" decoding="async">' : '<b>' + count + ' photo' + (count === 1 ? '' : 's') + '</b>')
        + '</span><span class="mg-entry-copy"><b>' + h(mealDisplayName(row.name)) + '</b>'
        + '<span>' + h(dateTime(row.capturedAt) + ' · ' + (row.mealType || '')) + '</span>'
        + '<small>' + count + ' photo' + (count === 1 ? '' : 's') + '</small></span>'
        + '<span class="mg-entry-grade"><em class="' + score + '">' + h(scoreLabel) + '</em>'
        + (reviewed ? '<i class="mg-review-check" aria-label="Coach reviewed">✓</i>' : '') + '</span></button>'
        + (coach ? '<button class="mg-entry-review-direct" data-mg="review-editor" data-id="' + h(row.id)
          + '" aria-label="Open coach review editor">' + pencilIcon() + '</button>' : '') + '</div>';
    }).join('');
  }

  function codeUI() {
    if (overlay && document.body.contains(overlay) && C && C.mode === 'member') {
      var old = overlay.querySelector('.mg-code-modal');
      if (old) old.remove();
      var modal = document.createElement('div');
      modal.className = 'mg-code-modal';
      modal.innerHTML = '<section class="mg-card mg-code-card mg-code-card--modal" role="dialog" aria-modal="true" aria-label="Meal Grade color code">'
        + '<button class="mg-code-modal-x" data-mg="code-close" aria-label="Close color code">×</button>'
        + '<span class="mg-code-modal-kicker">MAH LOG</span><h2>COLOR CODE</h2>'
        + '<p class="mg-code-row"><span class="mg-code-swatch red" aria-hidden="true"></span><b>= OCCASIONAL CHOICE</b><br><span class="mg-code-copy">A meal that visible evidence suggests is better kept occasional rather than repeated routinely for body-composition goals.</span></p>'
        + '<p class="mg-code-row"><span class="mg-code-swatch yellow" aria-hidden="true"></span><b>= MODERATE CHOICE</b><br><span class="mg-code-copy">A usable meal with one or more visible factors that make it less ideal for frequent repetition.</span></p>'
        + '<p class="mg-code-row"><span class="mg-code-swatch green" aria-hidden="true"></span><b>= ROUTINE CHOICE</b><br><span class="mg-code-copy">A meal that appears broadly appropriate to repeat regularly for body-composition goals.</span></p>'
        + '<button class="mg-wide" data-mg="code-close">BACK TO LOG</button></section>';
      overlay.appendChild(modal);
      return;
    }
    shell(top('Color Code', 'log', 'Back to Meal Grade Log') + '<div class="mg-card mg-code-card">'
      + '<p class="mg-code-row"><span class="mg-code-swatch red" aria-hidden="true"></span><b>= OCCASIONAL CHOICE</b><br><span class="mg-code-copy">A meal that visible evidence suggests is better kept occasional rather than repeated routinely for body-composition goals.</span></p>'
      + '<p class="mg-code-row"><span class="mg-code-swatch yellow" aria-hidden="true"></span><b>= MODERATE CHOICE</b><br><span class="mg-code-copy">A usable meal with one or more visible factors that make it less ideal for frequent repetition.</span></p>'
      + '<p class="mg-code-row"><span class="mg-code-swatch green" aria-hidden="true"></span><b>= ROUTINE CHOICE</b><br><span class="mg-code-copy">A meal that appears broadly appropriate to repeat regularly for body-composition goals.</span></p>'
      + '<button class="mg-wide" data-mg="log">Back to Log</button></div>');
  }

  function clientAnalysis(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(String(value)); } catch (e) { return {}; }
  }

  function detailSection(title, text, grade) {
    if (!text) return '';
    return '<section class="mg-guidance-section ' + (safeScore(grade) || '') + '"><b>' + h(title) + '</b><p>' + h(text) + '</p></section>';
  }

  function entryNutritionHTML(nutrition) {
    if (!nutrition || !nutrition.available) {
      return '<aside class="mg-entry-nutrition"><b>Estimated nutrition</b><span>Not enough visible evidence for a responsible estimate.</span></aside>';
    }
    return '<aside class="mg-entry-nutrition"><b>Estimated nutrition</b>'
      + '<span>' + h(nutritionValue(nutrition.caloriesEstimate, ' kcal')) + ' · '
      + h(nutritionValue(nutrition.proteinG, 'g protein')) + ' · '
      + h(nutritionValue(nutrition.carbsG, 'g carbs')) + ' · '
      + h(nutritionValue(nutrition.fatG, 'g fat')) + '</span>'
      + '<small>' + h(nutritionValue(nutrition.caloriesLow, '') + '–'
        + nutritionValue(nutrition.caloriesHigh, '') + ' kcal estimated range · photo-based, not measured') + '</small></aside>';
  }

  /* A saved entry must not remain permanently unread because one provider
     request was interrupted. Retry one meal once per page session
     automatically; an explicit member tap may try again. Neither path creates
     a client-side grade: success still comes only from the server's MG-2.1
     scorer. */
  function retryPendingAnalysis(row, manual) {
    if (!row || !row.id || !row.analysisPending) return Promise.resolve(false);
    if (pendingAnalysisInFlight[row.id]) return pendingAnalysisInFlight[row.id];
    var attempts = Number(pendingAnalysisAttempts[row.id]) || 0;
    if (!manual && attempts >= 1) return Promise.resolve(false);
    if (!manual) pendingAnalysisAttempts[row.id] = attempts + 1;
    var request = req({ action: 'analyze', entryId: row.id, mealType: row.mealType })
      .then(function (result) {
        return !!(result && result.ok && result.result && safeScore(result.result.score));
      });
    pendingAnalysisInFlight[row.id] = request.then(function (success) {
      delete pendingAnalysisInFlight[row.id];
      return success;
    }, function () {
      delete pendingAnalysisInFlight[row.id];
      return false;
    });
    return pendingAnalysisInFlight[row.id];
  }

  function queuePendingLogAnalysis() {
    if (pendingAnalysisQueueActive || !document.getElementById('mgEntries')) return;
    var row = logRows.find(function (candidate) {
      return candidate && candidate.analysisPending
        && (Number(pendingAnalysisAttempts[candidate.id]) || 0) < 1;
    });
    if (!row) return;
    pendingAnalysisQueueActive = true;
    retryPendingAnalysis(row).then(function (success) {
      pendingAnalysisQueueActive = false;
      if (!document.getElementById('mgEntries')) return;
      if (success) {
        logLoaded = false;
        nutritionHistoryCache = null;
        loadLog();
        return;
      }
      /* The failed automatic attempt remains visibly retryable. Do not stack
         another provider timeout behind the first one. */
      renderLog(currentFilter
        ? logRows.filter(function (candidate) { return candidate.mealType === currentFilter; })
        : logRows.slice());
    });
  }

  function entryUI(id) {
    req({ action: 'entry', id: id }).then(function (result) {
      if (!result || !result.ok) {
        shell(top('Meal Entry', 'log', 'Back to Meal Grade Log') + '<div class="mg-empty">' + h(friendlyError(result, 'This meal entry could not load.'))
          + '</div><button class="mg-wide" data-mg="log">Back to Log</button>');
        return;
      }
      var row = result.entry;
      currentEntry = row;
      var analysis = clientAnalysis(row.analysis);
      var guidance = analysis.guidance && typeof analysis.guidance === 'object' ? analysis.guidance : {};
      var number = analysis.final_numeric_score == null ? null : Math.max(0, Math.min(100, Number(analysis.final_numeric_score)));
      var grade = safeScore(row.score);
      var photoCount = (row.photos || []).filter(function (photo) { return photo && photo.url; }).length;
      var scoreLabel = h(row.analysisPending ? 'Reading interrupted' : (grade || 'Unscored'))
        + (Number.isFinite(number) ? ' · ' + Math.round(number) + '/100' : '');
      var why = guidance.why_this_grade || row.reason || 'This entry does not yet contain a complete AI summary.';
      var greener = guidance.path_to_greener || row.improvement || 'Use a clearer full-meal angle so Meal Grade can give a more specific improvement.';
      var nextTime = guidance.next_time_application || greener;
      var frequency = guidance.suggested_frequency || 'Use the visible grade as a guide for how often to repeat this exact version.';
      var goal = guidance.goal_application || 'Judge this meal as one part of the full day and the habit you are repeating.';
      var course = guidance.course_application || 'Use the FOB Course hand-portion guide when building the next version of this meal.';
      var override = '<div class="mg-scorepick">'
        + '<button class="green" data-mg="override" data-id="' + h(row.id) + '" data-v="green">Green</button>'
        + '<button class="yellow" data-mg="override" data-id="' + h(row.id) + '" data-v="yellow">Yellow</button>'
        + '<button class="red" data-mg="override" data-id="' + h(row.id) + '" data-v="red">Red</button></div>';
      var pendingContent = row.analysisPending
        ? detailSection('Meal Grade reading', 'Your photos are saved, but the last AI reading did not finish. Retry when your connection is ready.', grade)
          + '<button class="mg-wide" data-mg="retry-analysis" data-id="' + h(row.id) + '">Retry grade</button>'
        : detailSection('Why this grade', why, grade)
          + detailSection('How to get greener', greener, grade)
          + detailSection('Next time with this meal', nextTime, grade)
          + detailSection('Use this meal moving forward', frequency, grade)
          + detailSection('How it connects to your goal', goal, grade)
          + '<section class="mg-guidance-section mg-course-application ' + (grade || '') + '"><b>' + h(guidance.course_principle || 'FOB Course application') + '</b><p>'
          + h(course) + '</p><a href="/education#mindful-eating">Open FOB Course · Portion Guide</a></section>'
          + entryNutritionHTML(row.nutrition);
      shell(
        top('Meal Entry', 'log', 'Back to Meal Grade Log') + '<div class="mg-card mg-entry-detail">'
        + '<span class="mg-kicker">' + h((row.mealType || '') + ' · ' + dateTime(row.capturedAt)) + '</span>'
        + '<h2>' + h(mealDisplayName(row.name)) + '</h2>'
        + '<div class="mg-score ' + grade + '">' + scoreLabel + '</div>'
        + pendingContent
        + (photoCount ? '<button class="mg-view-photos" data-mg="view-photos">View photos · ' + photoCount + '</button>' : '')
        + override
        + '<div class="mg-actions"><button data-mg="log">Back to Log</button>'
        + '<button data-mg="delete" data-id="' + h(row.id) + '">Delete</button></div></div>'
      );
      retryPendingAnalysis(row, false).then(function (success) {
        if (success && currentEntry && currentEntry.id === row.id
            && !document.getElementById('mgEntries')) {
          logLoaded = false;
          nutritionHistoryCache = null;
          entryUI(row.id);
        }
      });
    });
  }

  function photoCarouselUI() {
    var row = currentEntry;
    var pictures = row && (row.photos || []).filter(function (photo) { return photo && photo.url; }) || [];
    if (!row || !pictures.length) { if (row) entryUI(row.id); else logUI(currentFilter, false); return; }
    carouselIndex = Math.max(0, Math.min(pictures.length - 1, carouselIndex));
    shell(
      top('Meal Photos', 'entry-back', 'Back to meal summary')
      + '<div class="mg-photo-carousel" data-photo-carousel>'
      + '<div class="mg-photo-stage"><button data-mg="photo-prev" class="mg-photo-arrow prev" aria-label="Previous photo">‹</button>'
      + '<img id="mgCarouselImage" src="' + h(pictures[carouselIndex].url) + '" alt="Meal photo ' + (carouselIndex + 1) + ' of ' + pictures.length + '">' 
      + '<button data-mg="photo-next" class="mg-photo-arrow next" aria-label="Next photo">›</button></div>'
      + '<div class="mg-photo-index" id="mgPhotoIndex">' + (carouselIndex + 1) + ' / ' + pictures.length + '</div>'
      + '<div class="mg-photo-dots" id="mgPhotoDots">' + pictures.map(function (_, index) {
        return '<i class="' + (index === carouselIndex ? 'on' : '') + '"></i>';
      }).join('') + '</div></div>',
      'mg-photo-shell'
    );
    paintCarousel();
  }

  function paintCarousel() {
    var pictures = currentEntry && (currentEntry.photos || []).filter(function (photo) { return photo && photo.url; }) || [];
    if (!pictures.length) return;
    carouselIndex = Math.max(0, Math.min(pictures.length - 1, carouselIndex));
    var image = document.getElementById('mgCarouselImage');
    var index = document.getElementById('mgPhotoIndex');
    if (image) {
      image.src = pictures[carouselIndex].url;
      image.alt = 'Meal photo ' + (carouselIndex + 1) + ' of ' + pictures.length;
    }
    if (index) index.textContent = (carouselIndex + 1) + ' / ' + pictures.length;
    Array.prototype.forEach.call(document.querySelectorAll('#mgPhotoDots i'), function (dot, i) {
      dot.classList.toggle('on', i === carouselIndex);
    });
    var previous = overlay && overlay.querySelector('[data-mg="photo-prev"]');
    var next = overlay && overlay.querySelector('[data-mg="photo-next"]');
    if (previous) previous.disabled = carouselIndex <= 0;
    if (next) next.disabled = carouselIndex >= pictures.length - 1;
  }

  function removePhoto(index) {
    var photo = photos[index];
    if (!photo || submitting) return;
    photo.removed = true;
    photos.splice(index, 1);
    releasePhoto(photo);
    var deleteWhenReady = photo.uploadPromise || Promise.resolve();
    deleteWhenReady.catch(function () {}).then(function () {
      if (photo.uploaded && photo.entryId && !photo.deleted) {
        return req({ action: 'deletePhoto', entryId: photo.entryId, angleIndex: photo.angle }, photo.requestContext).then(function (deleted) {
          photo.deleted = !!(deleted && deleted.ok);
          return deleted;
        });
      }
    });
    if (photos.length < MAX_PHOTOS && captureStarted) captureWasReleased = true;
    renderThumbs();
    updateReadyLabel();
  }

  function cancelCaptureAndReturn() {
    discardDraft();
    abandonPhotos();
    photos = [];
    entryId = null;
    captureFinalized = false;
    submissionId = makeSubmissionId();
    resetMahContext();
    uploadTail = Promise.resolve();
    pickerUI();
  }

  function swipeOffset(row) {
    if (!row) return 0;
    if (row.classList.contains('swiped-left')) return -76;
    if (row.classList.contains('swiped-right')) return 76;
    return 0;
  }

  function paintSwipe(row, value) {
    if (!row) return;
    var card = row.querySelector('.mg-entry');
    if (!card) return;
    card.style.transition = 'none';
    card.style.transform = 'translate3d(' + value + 'px,0,0)';
  }

  function closeSwipeRows(except) {
    if (!overlay) return;
    Array.prototype.forEach.call(overlay.querySelectorAll('.mg-entry-row'), function (row) {
      if (row === except) return;
      row.classList.remove('swiped-left', 'swiped-right');
      var card = row.querySelector('.mg-entry');
      if (card) { card.style.transition = ''; card.style.transform = ''; }
    });
    if (!except) swipeOpenId = '';
  }

  function settleSwipe(row, direction) {
    if (!row) return;
    closeSwipeRows(row);
    row.classList.remove('swiped-left', 'swiped-right');
    if (direction === 'left') row.classList.add('swiped-left');
    if (direction === 'right' && C && C.mode === 'coach') row.classList.add('swiped-right');
    var card = row.querySelector('.mg-entry');
    if (card) { card.style.transition = ''; card.style.transform = ''; }
    swipeOpenId = direction ? String(row.getAttribute('data-entry-row') || '') : '';
  }

  function resetSwipePointer() {
    swipePointerId = null;
    swipeStartX = 0;
    swipeStartY = 0;
    swipeStartAt = 0;
    swipeStartOffset = 0;
    swipeIntent = '';
    swipeRow = null;
  }

  function swipePointerDown(event) {
    if (!overlay || !overlay.classList.contains('mg-log-shell') || swipePointerId != null) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    var row = event.target.closest && event.target.closest('.mg-entry-row');
    if (!row) return;
    if (event.target.closest && event.target.closest('.mg-entry-delete,.mg-entry-review,.mg-entry-review-direct')) return;
    closeSwipeRows(row);
    swipePointerId = event.pointerId;
    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
    swipeStartAt = Date.now();
    swipeStartOffset = swipeOffset(row);
    swipeIntent = '';
    swipeRow = row;
    try { row.setPointerCapture(event.pointerId); } catch (e) {}
  }

  function swipePointerMove(event) {
    if (swipePointerId == null || event.pointerId !== swipePointerId || !swipeRow) return;
    var dx = event.clientX - swipeStartX;
    var dy = event.clientY - swipeStartY;
    if (!swipeIntent) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.15) { swipeIntent = 'vertical'; return; }
      if (Math.abs(dx) > Math.abs(dy) * 1.08) swipeIntent = 'horizontal';
      else return;
    }
    if (swipeIntent !== 'horizontal') return;
    if (event.cancelable) event.preventDefault();
    var maxRight = C && C.mode === 'coach' ? 82 : 0;
    var value = Math.max(-82, Math.min(maxRight, swipeStartOffset + dx));
    paintSwipe(swipeRow, value);
  }

  function swipePointerUp(event) {
    if (swipePointerId == null || event.pointerId !== swipePointerId || !swipeRow) return;
    var row = swipeRow;
    var dx = event.clientX - swipeStartX;
    var dy = event.clientY - swipeStartY;
    var elapsed = Math.max(1, Date.now() - swipeStartAt);
    var velocity = dx / elapsed;
    var raw = swipeStartOffset + dx;
    var direction = '';
    if (swipeIntent === 'horizontal' && Math.abs(dx) > Math.abs(dy)) {
      /* Pointer gestures synthesize a click after pointerup in browsers. Keep
         that click from immediately closing/opening the row that was just
         deliberately swiped; the revealed action still requires its own tap. */
      swipeSuppressClickUntil = Date.now() + 450;
      if (raw <= -42 || velocity <= -0.48) direction = 'left';
      else if (C && C.mode === 'coach' && (raw >= 42 || velocity >= 0.48)) direction = 'right';
    } else if (!swipeIntent && swipeStartOffset < 0) direction = 'left';
    else if (!swipeIntent && swipeStartOffset > 0 && C && C.mode === 'coach') direction = 'right';
    resetSwipePointer();
    settleSwipe(row, direction);
  }

  function swipePointerCancel(event) {
    if (swipePointerId == null || (event.pointerId != null && event.pointerId !== swipePointerId)) return;
    var row = swipeRow;
    var direction = swipeStartOffset < 0 ? 'left' : (swipeStartOffset > 0 ? 'right' : '');
    resetSwipePointer();
    settleSwipe(row, direction);
  }

  function touchStart(event) {
    var touch = event.changedTouches && event.changedTouches[0];
    if (!overlay || !touch) return;
    touchX = touch.clientX;
    touchY = touch.clientY;
    touchMode = '';
    touchRow = null;
    touchOffset = 0;
    if (overlay.classList.contains('mg-picker-shell')) touchMode = 'picker';
    else if (overlay.classList.contains('mg-photo-shell')) touchMode = 'carousel';
  }

  function touchMove() {
    /* Log rows use Pointer Events so vertical scrolling can cancel cleanly.
       Picker and photo-carousel swipes only need start/end coordinates. */
  }

  function touchEnd(event) {
    if (touchX == null) return;
    var touch = event.changedTouches && event.changedTouches[0];
    if (touch) {
      var dx = touch.clientX - touchX;
      var dy = touch.clientY - touchY;
      if (touchMode === 'picker' && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        cycleMeal(dx < 0 ? 1 : -1);
      } else if (touchMode === 'carousel' && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        carouselIndex += dx < 0 ? 1 : -1;
        paintCarousel();
      }
    }
    touchX = null;
    touchY = null;
    touchMode = '';
    touchRow = null;
    touchOffset = 0;
  }

  function click(event) {
    var clickedRow = event.target.closest && event.target.closest('.mg-entry-row');
    if (overlay && overlay.classList.contains('mg-log-shell') && swipeOpenId) {
      var clickedId = clickedRow && String(clickedRow.getAttribute('data-entry-row') || '');
      if (!clickedRow || clickedId !== swipeOpenId) closeSwipeRows();
    }
    var button = event.target.closest && event.target.closest('[data-mg]');
    if (!button) return;
    var action = button.getAttribute('data-mg');
    if (button.closest && button.closest('.mf-banner')) { event.preventDefault(); event.stopPropagation(); }
    if (action === 'entry' && swipeSuppressClickUntil > Date.now()) {
      swipeSuppressClickUntil = 0;
      event.preventDefault();
      return;
    }
    if (action === 'close') {
      if (submitting) { status('SAVING MEAL…'); return; }
      close();
      if (C && typeof C.navigateBack === 'function' && C.navigateBack()) return;
      if (C && typeof C.navigatePage === 'function') C.navigatePage('home');
      return;
    }
    if (action === 'gym-home') {
      close();
      if (C && typeof C.navigatePage === 'function') C.navigatePage('home');
      return;
    }
    if (action === 'site-home') {
      if (window.confirm('Return to FOB Systems home?')) window.location.assign('/');
      return;
    }
    if (action === 'theme-audio') { toggleMusicFromMealGrade(); return; }
    if (action === 'music-studio-play') { toggleStudioFromMealGrade(); return; }
    if (action === 'music-studio') { try { C.openMusicStudio(); } catch (e) {} return; }
    if (action === 'theme-edit') { try { C.openThemeEditor(); } catch (e) {} return; }
    if (action === 'calendar') { event.preventDefault(); event.stopPropagation(); try { if (C && typeof C.openCalendar === 'function') C.openCalendar(); } catch (e) {} return; }
    if (action === 'meal-prev') { cycleMeal(-1); return; }
    if (action === 'meal-next') { cycleMeal(1); return; }
    if (action === 'meal-confirm') { cameraUI(); return; }
    if (action === 'picker' && C && typeof C.navigatePage === 'function') { C.navigatePage('meal-scanner'); return; }
    if (action === 'picker') {
      if (submitting) { status('SAVING MEAL…'); return; }
      cancelCaptureAndReturn(); return;
    }
    if (action === 'ready') {
      /* Pointer/keyboard hold listeners own this control. Suppress the
         synthetic click that follows pointerup so it cannot start a second
         sequence. */
      event.preventDefault();
      return;
    }
    if (action === 'choose') {
      if (photos.length >= MAX_PHOTOS || submitting) return;
      var input = document.getElementById('mgFile');
      if (input) input.click();
      return;
    }
    if (action === 'remove') { removePhoto(Number(button.getAttribute('data-i'))); return; }
    if (action === 'context-skip') { resolveMahContext(true); return; }
    if (action === 'context-continue') { resolveMahContext(false); return; }
    if (action === 'submit') { submit(); return; }
    if (action === 'log') { if (C && typeof C.navigatePage === 'function') C.navigatePage('meal-log'); else logUI(currentFilter || '', false); return; }
    if (action === 'feedback-hub') { feedbackHubUI(); return; }
    if (action === 'feedback-back') {
      if (feedbackReturnView === 'meal-log') { feedbackReturnView = ''; feedbackReturnMode = 'log'; logUI(currentFilter || '', false); return; }
      if (feedbackReturnView === 'meal-scanner') { feedbackReturnView = ''; feedbackReturnMode = 'log'; if (scannerSurfaceMode === 'camera') cameraUI(); else pickerUI(); return; }
      if (feedbackReturnMode === 'close') close(); else returnToLogFromReview();
      return;
    }
    if (action === 'messages') { messageCenterUI(); return; }
    if (action === 'theme-curation') { themeCurationUI(); return; }
    if (action === 'message-action-prev') { messageActionIndex = Math.max(0, messageActionIndex - 1); paintMessageActionCarousel(); return; }
    if (action === 'message-action-next') { messageActionIndex = Math.min(1, messageActionIndex + 1); paintMessageActionCarousel(); return; }
    if (action === 'message-reschedule') { try { if (C && typeof C.openCalendar === 'function') C.openCalendar({ reschedule: true }); } catch (e) {} return; }
    if (action === 'curation-pay') { startThemeCuration(button); return; }
    if (action === 'message-send') { sendMemberMessage('message', button); return; }
    if (action === 'message-support') { sendMemberMessage('support', button); return; }
    if (action === 'reviews') { reviewsUI(); return; }
    if (action === 'reviews-back') { feedbackHubUI(); return; }
    if (action === 'review-back') { returnToLogFromReview(); return; }
    if (action === 'review-editor') {
      if (C && C.mode === 'coach') reviewEditorUI(button.getAttribute('data-id'));
      return;
    }
    if (action === 'review-rate') { setReviewRating(button.getAttribute('data-v')); return; }
    if (action === 'review-save') { saveReview(button.getAttribute('data-id'), button); return; }
    if (action === 'review-remove') { removeReview(button.getAttribute('data-id'), button); return; }
    if (action === 'nutrition-summary') { nutritionPopup(false); return; }
    if (action === 'nutrition-history') { nutritionPopup(true); return; }
    if (action === 'nutrition-close') { closeNutritionPopup(); return; }
    if (action === 'filter') {
      currentFilter = TYPES.indexOf(button.getAttribute('data-v')) >= 0 ? button.getAttribute('data-v') : '';
      applyFilter();
      return;
    }
    if (action === 'code') { codeUI(); return; }
    if (action === 'code-close') { var codeModal=overlay&&overlay.querySelector('.mg-code-modal'); if(codeModal)codeModal.remove(); return; }
    if (action === 'entry') {
      var entryRow = button.closest('.mg-entry-row');
      if (entryRow && (entryRow.classList.contains('swiped-left') || entryRow.classList.contains('swiped-right'))) {
        settleSwipe(entryRow, '');
        return;
      }
      entryUI(button.getAttribute('data-id')); return;
    }
    if (action === 'view-photos') { carouselIndex = 0; photoCarouselUI(); return; }
    if (action === 'retry-analysis') {
      var retryId = button.getAttribute('data-id');
      var retryRow = currentEntry && currentEntry.id === retryId ? currentEntry
        : logRows.find(function (row) { return row.id === retryId; });
      if (!retryRow) return;
      button.disabled = true;
      button.textContent = 'Reading meal…';
      retryPendingAnalysis(retryRow, true).then(function (success) {
        if (success) {
          logLoaded = false;
          nutritionHistoryCache = null;
          entryUI(retryId);
          return;
        }
        button.disabled = false;
        button.textContent = 'Retry grade';
      });
      return;
    }
    if (action === 'entry-back') {
      if (currentEntry && currentEntry.id) entryUI(currentEntry.id);
      else logUI(currentFilter, false);
      return;
    }
    if (action === 'photo-prev') { carouselIndex -= 1; paintCarousel(); return; }
    if (action === 'photo-next') { carouselIndex += 1; paintCarousel(); return; }
    if (action === 'override') {
      var overrideId = button.getAttribute('data-id');
      var overrideScore = button.getAttribute('data-v');
      button.disabled = true;
      req({ action: 'update', id: overrideId, finalScore: overrideScore }).then(function (result) {
        if (result && result.ok) {
          logRows.forEach(function (row) { if (row.id === overrideId) row.score = overrideScore; });
          entryUI(overrideId);
        } else button.disabled = false;
      });
      return;
    }
    if (action === 'delete') {
      var deleteId = button.getAttribute('data-id');
      if (!window.confirm('Delete this Meal Grade entry and its photos?')) return;
      button.disabled = true;
      req({ action: 'delete', id: deleteId }).then(function (result) {
        if (result && result.ok) {
          logRows = logRows.filter(function (row) { return row.id !== deleteId; });
          storageLoaded = false;
          nutritionHistoryCache = null;
          if (currentEntry && currentEntry.id === deleteId) currentEntry = null;
          logUI(currentFilter, false);
        } else button.disabled = false;
      });
      return;
    }
    if (action === 'wipe') {
      if (!window.confirm('Wipe every Meal Grade photo and journal entry for this member?')) return;
      if (!window.confirm('This permanently deletes this member’s entire Meal Grade history. Continue?')) return;
      button.disabled = true;
      button.textContent = 'Wiping…';
      req({ action: 'wipeAll' }).then(function (result) {
        if (result && result.ok) {
          logRows = [];
          logLoaded = true;
          storageLoaded = false;
          storageCache = null;
          settingsCache = undefined;
          physiqueGoalCache = undefined;
          nutritionHistoryCache = null;
          currentEntry = null;
          logUI('', true);
        } else {
          button.disabled = false;
          button.textContent = 'Wipe';
          var storage = document.querySelector('#mgStorage .mg-storage-copy b');
          if (storage) storage.textContent = 'Wipe interrupted · try again';
        }
      });
    }
  }

  function resetForegroundInteractionState() {
    resetSwipePointer();
    touchX = null;
    touchY = null;
    touchMode = '';
    touchRow = null;
    touchOffset = 0;
    swipeSuppressClickUntil = 0;
  }

  function resumeForeground() {
    resetForegroundInteractionState();
    if (!overlay) {
      if (previousOverflow !== null) {
        document.documentElement.style.overflow = previousOverflow;
        previousOverflow = null;
      }
      return;
    }
    if (!overlay.classList.contains('mg-camera-shell') || document.hidden) return;
    goodTick = 0;
    lastSample = null;
    var track = stream && stream.getVideoTracks && stream.getVideoTracks()[0];
    if (!stream || !track || track.readyState !== 'live') {
      status('RESTORING CAMERA…');
      startCamera();
      return;
    }
    var video = document.getElementById('mgVideo');
    if (video) {
      var play = video.play();
      if (play && play.catch) play.catch(function () {});
    }
    updateReadyLabel();
    if (captureStarted && photos.length < MAX_PHOTOS) status('PAUSED · HOLD RESUME TO CONTINUE');
  }

  document.addEventListener('visibilitychange', function () {
    if (!overlay || !overlay.classList.contains('mg-camera-shell')) {
      if (!document.hidden) resetForegroundInteractionState();
      return;
    }
    goodTick = 0;
    lastSample = null;
    if (document.hidden) pauseCaptureHold(true);
    else window.setTimeout(resumeForeground, 80);
  });

  window.addEventListener('pageshow', function () {
    window.setTimeout(resumeForeground, 80);
  });

  window.addEventListener('focus', function () {
    if (!document.hidden) window.setTimeout(resumeForeground, 100);
  });

  window.addEventListener('blur', function () {
    if (overlay && overlay.classList.contains('mg-camera-shell')) pauseCaptureHold(true);
  });

  window.addEventListener('fob-theme-audio-state', function () {
    paintMusicButtons();
  });

  window.addEventListener('pagehide', function () {
    if (!captureFinalized && !submitting && entryId && submissionId && navigator.sendBeacon) {
      try {
        var body = contextualBody({ action: 'discardDraft', submissionId: submissionId });
        navigator.sendBeacon(API, new Blob([JSON.stringify(body)], { type: 'application/json' }));
      } catch (e) {}
    }
    stopCamera();
  });

  var publicAPI = {
    open: open,
    log: function (context) {
      C = Object.assign({}, C || {}, context || {});
      if (!C.mode) C.mode = C.memberId ? 'coach' : 'member';
      feedbackReturnMode = 'log';
      feedbackReturnView = '';
      var key = contextKey();
      if (key !== logContextKey) {
        logContextKey = key;
        logRows = [];
        logLoaded = false;
        settingsCache = undefined;
        physiqueGoalCache = undefined;
        storageCache = null;
        storageLoaded = false;
        nutritionHistoryCache = null;
      }
      logUI('', false);
    },
    /* R52 shared-crown entry. Reuses feedbackHubUI/messageCenterUI and all of
       their existing request/state ownership; only the return destination is
       different because the crown can launch it from any ordinary page. */
    feedback: function (context) {
      /* Preserve the surface beneath the relocated crown control. The feedback
         hub remains the same state owner; this only records where its Back key
         should return after shell() replaces the body-level overlay. */
      if (overlay && overlay.classList.contains('mg-log-shell')) feedbackReturnView = 'meal-log';
      else if (overlay && overlay.classList.contains('mg-picker-shell')) feedbackReturnView = 'meal-scanner';
      else feedbackReturnView = '';
      C = Object.assign({}, C || {}, context || {});
      if (!C.mode) C.mode = C.memberId ? 'coach' : 'member';
      feedbackReturnMode = feedbackReturnView ? 'surface' : 'close';
      feedbackHubUI();
    },
    close: close,
    suspend: suspend,
    resume: resume,
    canHistoryNavigate: canHistoryNavigate
  };
  window.FOBMealGrade = publicAPI;
  window.FOBMealGradient = publicAPI;
}());
