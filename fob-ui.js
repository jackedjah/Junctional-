/* FOB SYSTEMS - InlineNavigator.
   One embedded horizontal navigator, used by the benefits cards. It never
   leaves the page: no dialog, no overlay, no scroll lock. The inquiry
   stepper in inquiry.js follows the same rail/arrow/transition contract so
   all three sections behave identically. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function InlineNavigator(stage) {
    var viewport = stage.querySelector('.fob-nav-viewport');
    var track = stage.querySelector('.fob-nav-track');
    var slides = Array.prototype.slice.call(track.children);
    if (slides.length < 2) return;
    var prev = stage.querySelector('.fob-nav-prev');
    var next = stage.querySelector('.fob-nav-next');
    var rail = stage.querySelector('.fob-nav-rail');
    var live = stage.querySelector('.fob-nav-live');
    var at = 0, marks = [];

    slides.forEach(function (s, i) {
      s.setAttribute('role', 'group');
      s.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
      if (!rail) return;
      var d = document.createElement('button');
      d.type = 'button'; d.className = 'fob-nav-diamond';
      d.setAttribute('aria-label', 'Go to ' + (i + 1) + ' of ' + slides.length);
      d.addEventListener('click', function () { go(i); });
      rail.appendChild(d); marks.push(d);
    });

    /* the viewport takes the measured height of the live slide, so a taller
       card is never cropped and a shorter one leaves no dead space */
    function sizeToActive() {
      var h = slides[at].offsetHeight;
      if (h) viewport.style.height = h + 'px';
    }
    function go(i) {
      at = Math.max(0, Math.min(slides.length - 1, i));
      track.style.transform = 'translate3d(' + (-at * 100) + '%,0,0)';
      slides.forEach(function (s, n) {
        var on = n === at;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
        /* an off-stage slide must not be tabbable */
        Array.prototype.forEach.call(s.querySelectorAll('a,button,input,select,textarea'), function (f) {
          f.tabIndex = on ? 0 : -1;
        });
      });
      marks.forEach(function (m, n) {
        m.classList.toggle('is-on', n === at);
        if (n === at) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current');
      });
      if (prev) prev.disabled = at === 0;
      if (next) next.disabled = at === slides.length - 1;
      if (live) live.textContent = (at + 1) + ' of ' + slides.length;
      sizeToActive();
    }
    if (prev) prev.addEventListener('click', function () { go(at - 1); });
    if (next) next.addEventListener('click', function () { go(at + 1); });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(at - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); }
    });

    /* horizontal swipe only; a vertical drag still scrolls the page */
    var x0 = null, y0 = null, t0 = 0, lock = null;
    stage.addEventListener('touchstart', function (e) {
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); lock = null;
    }, { passive: true });
    stage.addEventListener('touchmove', function (e) {
      if (x0 === null) return;
      var dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
      if (lock === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      /* let the card follow the thumb a little so the gesture reads live */
      if (lock === 'x') track.style.transform =
        'translate3d(calc(' + (-at * 100) + '% + ' + Math.max(-70, Math.min(70, dx * 0.32)) + 'px),0,0)';
    }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      var fast = Math.abs(dx) / Math.max(1, Date.now() - t0) > 0.35;
      if (lock === 'x' && (Math.abs(dx) > 26 || (fast && Math.abs(dx) > 12))) go(dx < 0 ? at + 1 : at - 1);
      else go(at);
      x0 = y0 = null; lock = null;
    });

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { sizeToActive(); });
      slides.forEach(function (s) { ro.observe(s); });
    }
    window.addEventListener('resize', sizeToActive);
    window.addEventListener('orientationchange', function () { window.setTimeout(sizeToActive, 120); });
    /* images arrive late and change the height */
    Array.prototype.forEach.call(stage.querySelectorAll('img'), function (im) {
      if (!im.complete) im.addEventListener('load', sizeToActive);
    });
    if (reduce) stage.classList.add('is-static');
    stage.classList.add('is-ready');
    go(0);
    window.setTimeout(sizeToActive, 200);
  }

  document.querySelectorAll('[data-fob-nav]').forEach(function (s) { new InlineNavigator(s); });
})();
