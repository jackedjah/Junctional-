/* FOB SYSTEMS - nav, reveals, FOBible modal */
(function () {
  // Mobile menu
  var btn = document.querySelector('.fob-menu-btn');
  var links = document.querySelector('.fob-nav-links');
  if (btn && links) {
    btn.addEventListener('click', function () {
      links.classList.toggle('open');
      btn.setAttribute('aria-expanded', links.classList.contains('open'));
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     LAUNCH FILM :: the single authoritative hero controller.

     Supersedes every earlier generation of hero playback logic. There is
     no autoplay attempt at parse, no IntersectionObserver playback, no
     timer, no requestIdleCallback, no scroll-driven retry loop.

     BEHAVIOUR
     The film loads paused with the branded FOB play button over it. The
     first genuine user gesture anywhere on the page starts it, and that
     same gesture goes on to do exactly what it was always going to do.

     WHY THIS CANNOT INTERFERE WITH SCROLLING
     Every unlock listener is registered { passive: true }. That is a
     promise to the browser that the handler will never call
     preventDefault, which means Safari never has to wait for this code
     before moving the page: the scroll starts on the compositor while
     play() is still resolving. Beyond that, nothing in here calls
     preventDefault or stopPropagation, reads or writes layout, or
     touches scroll position, and the listeners are torn down the moment
     playback actually begins.

     touchmove, pointermove and wheel are deliberately NOT used. Those are
     continuous, and continuous handlers on the vertical gesture path are
     what made this page feel like it was catching.
     ═══════════════════════════════════════════════════════════════════ */
  var soundBtn = document.querySelector('[data-film-sound]');
  var film = document.getElementById('launch-film');
  var filmPlayBtn = document.querySelector('[data-launch-film-play]');
  if (film) {
    /* Discrete gestures only. Each one is a valid user activation in
       WebKit, and touchstart fires at the very beginning of a swipe, so a
       scroll flick starts the film without the film delaying the flick. */
    var GESTURES = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];
    var armed = false;
    var everPlayed = false;

    function stripPlayerChrome() {
      try {
        film.controls = false;
        film.removeAttribute('controls');
        film.setAttribute('controlslist', 'nodownload noplaybackrate nofullscreen noremoteplayback');
        film.disablePictureInPicture = true;
        film.disableRemotePlayback = true;
        film.setAttribute('x-webkit-airplay', 'deny');
        film.setAttribute('playsinline', '');
        film.setAttribute('webkit-playsinline', 'true');
        film.playsInline = true;
        film.muted = true;
        film.defaultMuted = true;
        film.setAttribute('muted', '');
        film.loop = true;
        /* Autoplay is intentionally NOT set. The branded button is the
           advertised affordance and the first gesture is the trigger. */
        film.autoplay = false;
        film.removeAttribute('autoplay');
      } catch (e) {}
    }

    function showPlayButton(show) {
      if (filmPlayBtn) filmPlayBtn.hidden = !show;
    }

    /* Deliberately tiny: this runs on the leading edge of the user's first
       swipe, so it must not do anything that could cost a frame. */
    function attemptPlay() {
      if (!film.paused) return;
      var p;
      try { p = film.play(); } catch (e) { return; }
      if (p && typeof p.then === 'function') p.then(null, function () {});
    }

    function onGesture() { attemptPlay(); }

    function arm() {
      if (armed) return;
      armed = true;
      for (var i = 0; i < GESTURES.length; i++) {
        document.addEventListener(GESTURES[i], onGesture, { passive: true, capture: true });
      }
    }
    function disarm() {
      if (!armed) return;
      armed = false;
      for (var i = 0; i < GESTURES.length; i++) {
        document.removeEventListener(GESTURES[i], onGesture, { capture: true });
      }
    }

    film.addEventListener('playing', function () {
      everPlayed = true;
      showPlayButton(false);
      disarm();
    });
    /* If it stops later, the branded button comes back and the unlock is
       re-armed, so the next gesture resumes it. */
    film.addEventListener('pause', function () {
      if (film.ended) return;
      showPlayButton(true);
      arm();
    });
    film.addEventListener('error', function () { showPlayButton(true); });

    if (filmPlayBtn) {
      filmPlayBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        attemptPlay();
      });
    }

    stripPlayerChrome();
    showPlayButton(true);   /* visible before any interaction, by design */
    arm();

    /* Coming back to the tab resumes a film that was already running. This
       needs no gesture because the page already holds user activation, and
       it never fires before the first play. */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && everPlayed && film.paused) attemptPlay();
    });
  }
  if (soundBtn && film) {
    soundBtn.addEventListener('click', function () {
      film.muted = false;
      film.volume = 1;
      var p = film.play();
      if (p && p.catch) p.catch(function () {});
      soundBtn.classList.add('is-hidden');
    });
    film.addEventListener('volumechange', function () {
      soundBtn.classList.toggle('is-hidden', !film.muted);
    });
  }

  // Scroll reveals
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.fob-reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.fob-reveal').forEach(function (el) { el.classList.add('in'); });
  }

  // FOBible modal
  var modal = document.getElementById('fobible-modal');
  if (modal) {
    var lastFocus = null;
    function openModal() {
      lastFocus = document.activeElement;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('fob-modal-open');
      var closeBtn = modal.querySelector('.fob-modal-close');
      if (closeBtn) closeBtn.focus();
    }
    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('fob-modal-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    document.querySelectorAll('[data-fobible-open]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); openModal(); });
    });
    modal.querySelectorAll('[data-fobible-close]').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });
    // clicking a download link closes the modal after the download fires
    var dl = modal.querySelector('a[download]');
    if (dl) dl.addEventListener('click', function () { setTimeout(closeModal, 400); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });
  }

  // FOB Education: tab switching (only runs on the education page)
  var eduTabs = document.querySelectorAll('.fob-edu-tab');
  var eduPanels = document.querySelectorAll('.fob-edu-panel');
  if (eduTabs.length && eduPanels.length) {
    function activateEduTab(name, focusTab) {
      eduTabs.forEach(function (t) {
        var on = t.getAttribute('data-edu-tab') === name;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on && focusTab) t.focus();
      });
      eduPanels.forEach(function (p) {
        var on = p.getAttribute('data-edu-panel') === name;
        p.classList.toggle('is-active', on);
        // reveals inside a hidden panel never intersect, so show them on activate
        if (on) {
          p.querySelectorAll('.fob-reveal').forEach(function (el) { el.classList.add('in'); });
        }
      });
    }
    eduTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var name = tab.getAttribute('data-edu-tab');
        activateEduTab(name, false);
        history.replaceState(null, '', '#' + name);
        // keep the reader at the top of the newly opened section
        var bar = document.querySelector('.fob-edu-tabs');
        if (bar) {
          var y = bar.getBoundingClientRect().top + window.pageYOffset - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 74);
          if (window.pageYOffset > y) window.scrollTo({ top: y, behavior: 'smooth' });
        }
      });
    });
    var initial = (location.hash || '').replace('#', '');
    var hasInitial = initial && document.querySelector('.fob-edu-tab[data-edu-tab="' + initial + '"]');
    activateEduTab(hasInitial ? initial : eduTabs[0].getAttribute('data-edu-tab'), false);
  }

})();


/* Divider motion. The animation itself is pure CSS; this only decides
   which dividers are close enough to the viewport to be worth running,
   and hands each one a small starting offset so the page is not all
   moving in lockstep. Every beam and diamond inside a single divider
   still shares that one delay, so they stay phase-locked. */
(function () {
  'use strict';
  var divs = document.querySelectorAll('.fob-scroll-div, .fob-pencil-div');
  if (!divs.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  Array.prototype.forEach.call(divs, function (d, i) {
    d.style.setProperty('--fob-divider-delay', ((i % 4) * 0.14).toFixed(2) + 's');
  });
  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(divs, function (d) { d.classList.add('is-motion-active'); });
    return;
  }
  var mo = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      e.target.classList.toggle('is-motion-active', e.isIntersecting);
    });
  }, { rootMargin: '180px 0px' });
  Array.prototype.forEach.call(divs, function (d) { mo.observe(d); });


})();

/* FOB Systems :: Claim Your Slot VIP gate.
   Deliberately top-level. It used to sit inside the divider-motion block,
   which returns early on any page without decorative dividers (the Course
   page) or when reduced motion is on — so the gate was never created there
   and CLAIM YOUR SLOT! did nothing. ---------------------------------- */
  /* gate ----------------------------- */
  /* v354 — one member identity gate for every app-bound surface. The old
     Claim Your Slot modal is intentionally retired; legacy deep links are
     routed through the same MAH login shell used by Tracker, Meals + Calendar. */
  (function claimSlotGate(){
    var target='/mygym?entry=slots';
    Array.prototype.slice.call(document.querySelectorAll('[data-claim-slot="true"]')).forEach(function(a){a.href=target;a.removeAttribute('data-claim-slot')});
    window.FOBOpenClaimGate=function(){location.href=target};
    var isVipEntry=location.pathname==='/vip'||location.pathname==='/vip/';
    if(/[?&]claim=1(?:&|$)/.test(location.search)||isVipEntry)location.replace(target);
  })();

