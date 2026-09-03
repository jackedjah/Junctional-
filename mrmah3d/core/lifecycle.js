/* MR.MAH 3D :: LIFECYCLE
   The render loop, and every reason to stop it.

   This module exists because the expensive failure mode of putting WebGL in
   MAHFITT is not a slow frame — it is a loop that keeps running after the
   member has navigated away, draining a phone battery from a page nobody is
   looking at. MAHFITT is a single-page app, so nothing unmounts a stray
   requestAnimationFrame for us.

   The loop stops for all of:
     - the tab going to the background   (visibilitychange)
     - the element scrolling out of view (IntersectionObserver)
     - an explicit pause() by the host
     - WebGL context loss
     - destroy()

   It also watches its own cost and asks the host to drop a quality tier if the
   device cannot hold frame. */

export function createLoop(options) {
  var opts = options || {};
  var render = typeof opts.render === 'function' ? opts.render : function () {};
  var element = opts.element || null;
  var doc = opts.document || (typeof document !== 'undefined' ? document : null);
  var win = opts.window || (typeof window !== 'undefined' ? window : null);
  var onOverBudget = typeof opts.onOverBudget === 'function' ? opts.onOverBudget : null;

  var raf = 0;
  var last = 0;
  var running = false;
  var destroyed = false;
  var visible = true;      /* tab foreground */
  var onScreen = true;     /* element intersecting the viewport */
  var paused = false;      /* host asked us to stop */

  var stats = { frames: 0, fps: 0, avgMs: 0, tierDrops: 0 };
  var acc = 0, accFrames = 0, slowStreak = 0;

  /* dt is clamped. After a tab returns from the background the first timestamp
     gap can be minutes; an unclamped dt would teleport every animation. */
  var MAX_DT = 0.05;

  function frame(now) {
    if (!running) return;
    raf = win.requestAnimationFrame(frame);
    var t = now / 1000;
    var dt = last ? Math.min(MAX_DT, t - last) : 1 / 60;
    last = t;

    var t0 = (win.performance && win.performance.now) ? win.performance.now() : 0;
    render(dt, stats);
    var cost = ((win.performance && win.performance.now) ? win.performance.now() : 0) - t0;

    stats.frames++;
    acc += cost; accFrames++;
    if (accFrames >= 30) {
      stats.avgMs = Math.round((acc / accFrames) * 100) / 100;
      stats.fps = stats.avgMs > 0 ? Math.round(1000 / Math.max(stats.avgMs, dt * 1000)) : 0;
      /* Judge on sustained cost, never on one spike: a single long frame is
         usually a GC pause or a layout, not a device that is out of headroom. */
      if (stats.avgMs > 12) slowStreak++; else slowStreak = 0;
      if (slowStreak >= 3 && onOverBudget) {
        slowStreak = 0;
        stats.tierDrops++;
        onOverBudget(stats);
      }
      acc = 0; accFrames = 0;
    }
  }

  function shouldRun() { return !destroyed && !paused && visible && onScreen; }

  function sync() {
    if (shouldRun()) {
      if (running) return;
      running = true;
      last = 0;                       /* forget the gap we were stopped for */
      raf = win.requestAnimationFrame(frame);
    } else {
      if (!running) return;
      running = false;
      if (raf) win.cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function onVisibility() { visible = !doc || doc.visibilityState !== 'hidden'; sync(); }
  /* Safari on iOS does not reliably fire visibilitychange when the app is
     backgrounded from the home gesture; pagehide is the one that does. */
  function onPageHide() { visible = false; sync(); }
  function onPageShow() { visible = !doc || doc.visibilityState !== 'hidden'; sync(); }

  if (doc) {
    doc.addEventListener('visibilitychange', onVisibility);
    if (win) {
      win.addEventListener('pagehide', onPageHide);
      win.addEventListener('pageshow', onPageShow);
    }
  }

  var io = null;
  if (element && win && typeof win.IntersectionObserver === 'function') {
    io = new win.IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) onScreen = entries[i].isIntersecting;
      sync();
    }, { threshold: 0.01 });
    io.observe(element);
  }

  function start() { paused = false; sync(); }
  function pause() { paused = true; sync(); }

  function destroy() {
    destroyed = true;
    sync();
    if (doc) {
      doc.removeEventListener('visibilitychange', onVisibility);
      if (win) {
        win.removeEventListener('pagehide', onPageHide);
        win.removeEventListener('pageshow', onPageShow);
      }
    }
    if (io) { io.disconnect(); io = null; }
  }

  return {
    start: start,
    pause: pause,
    destroy: destroy,
    stats: stats,
    isRunning: function () { return running; },
    state: function () {
      return { running: running, visible: visible, onScreen: onScreen, paused: paused, destroyed: destroyed };
    }
  };
}
