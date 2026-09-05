/* ---------------------------------------------------------------
   MEDIA RENDERING

   Draws attachments inside a post, and owns the lightbox.

   Two things shape the layout choices here. Aspect ratio is reserved
   before the image loads, from the width and height stored at upload,
   so the feed does not jump as pictures arrive. And everything is
   lazy: nothing below the fold is fetched until it is near.

   The renderer switches on `kind`, so a new kind is a new branch, not
   a rewrite.
   --------------------------------------------------------------- */
(function () {
  var FOB = window.FOB;

  FOB.renderMedia = function (items) {
    if (!items || !items.length) return null;

    var wrap = document.createElement('div');
    wrap.className = 'fob-media';

    var pictures = items.filter(function (m) {
      return m.kind === 'image' || m.kind === 'gif' || m.kind === 'video';
    });
    var sounds = items.filter(function (m) { return m.kind === 'audio'; });

    if (pictures.length) wrap.appendChild(gallery(pictures));
    sounds.forEach(function (m) { wrap.appendChild(audioPlayer(m)); });

    return wrap.childNodes.length ? wrap : null;
  };

  /* ---------- pictures --------------------------------------- */

  /* One frame at a time, swiped. Native scroll-snap does the gesture,
     which means the physics are the platform's own rather than a
     re-implementation that feels almost right. The whole strip shares
     one aspect ratio, taken from the first item, so the card does not
     resize as you move between a portrait and a landscape shot. */
  function gallery(pictures) {
    var wrap = document.createElement('div');
    wrap.className = 'fob-carousel';

    var first = pictures[0];
    var ratio = (first.width && first.height)
      ? Math.max(0.6, Math.min(1.25, first.width / first.height))
      : 1;
    wrap.style.aspectRatio = String(ratio);

    var track = document.createElement('div');
    track.className = 'fob-carousel-track';
    track.setAttribute('role', 'group');
    track.setAttribute('aria-label', pictures.length + ' items. Swipe to browse.');

    pictures.forEach(function (m, i) {
      track.appendChild(slide(m, i, pictures));
    });
    wrap.appendChild(track);

    if (pictures.length > 1) {
      var dots = document.createElement('div');
      dots.className = 'fob-carousel-dots';
      pictures.forEach(function (m, i) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'fob-carousel-dot' + (i === 0 ? ' is-on' : '');
        d.setAttribute('aria-label', 'Go to item ' + (i + 1));
        d.addEventListener('click', function () {
          track.scrollTo({ left: track.clientWidth * i, behavior: 'smooth' });
        });
        dots.appendChild(d);
      });
      wrap.appendChild(dots);

      var counter = document.createElement('span');
      counter.className = 'fob-carousel-count';
      counter.textContent = '1/' + pictures.length;
      wrap.appendChild(counter);

      /* Driven by scroll position rather than by the taps, so a swipe
         and a dot press stay in agreement. */
      var raf = null;
      track.addEventListener('scroll', function () {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var at = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
          at = Math.max(0, Math.min(pictures.length - 1, at));
          counter.textContent = (at + 1) + '/' + pictures.length;
          Array.prototype.forEach.call(dots.children, function (d, i) {
            d.classList.toggle('is-on', i === at);
          });
          /* Never leave a video playing off screen. */
          Array.prototype.forEach.call(track.children, function (sl, i) {
            var v = sl.querySelector('video');
            if (v && i !== at && !v.paused) v.pause();
          });
        });
      }, { passive: true });
    }

    return wrap;
  }

  function slide(m, index, all) {
    var cell = document.createElement('div');
    cell.className = 'fob-carousel-slide';

    if (!m.url) {
      cell.classList.add('is-missing');
      cell.textContent = m.kind === 'video' ? 'Video unavailable' : 'Image unavailable';
      return cell;
    }

    if (m.kind === 'video') {
      /* playsinline stops iOS taking over the whole screen; muted plus
         no autoplay means a scrolled feed stays silent until asked. */
      var v = document.createElement('video');
      v.src = m.url;
      v.controls = true;
      v.playsInline = true;
      v.preload = 'metadata';
      v.setAttribute('playsinline', '');
      v.addEventListener('play', function () {
        FOB.stopAllAudio(null);
        Array.prototype.forEach.call(document.querySelectorAll('video'), function (o) {
          if (o !== v && !o.paused) o.pause();
        });
      });
      cell.appendChild(v);
      return cell;
    }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fob-carousel-open';
    btn.setAttribute('aria-label',
      (m.alt_text || (m.kind === 'gif' ? 'GIF' : 'Photo')) +
      ' ' + (index + 1) + ' of ' + all.length + '. Open larger.');

    var img = document.createElement('img');
    img.src = m.url;
    img.alt = m.alt_text || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    btn.appendChild(img);

    if (m.kind === 'gif') {
      var tag = document.createElement('span');
      tag.className = 'fob-media-tag';
      tag.textContent = 'GIF';
      btn.appendChild(tag);
    }

    btn.addEventListener('click', function () {
      openLightbox(all.filter(function (x) { return x.kind !== 'video'; }),
                   all.filter(function (x) { return x.kind !== 'video'; }).indexOf(m));
    });
    cell.appendChild(btn);
    return cell;
  }

  /* ---------- audio ------------------------------------------ */

  /* Deliberately not an <audio controls>: the native player is a
     different size and shape in every browser and would be the one
     element on the card that does not look like the rest of it. */
  function audioPlayer(m) {
    var box = document.createElement('div');
    box.className = 'fob-voice';

    var play = document.createElement('button');
    play.type = 'button';
    play.className = 'fob-voice-play';
    play.setAttribute('aria-label', 'Play voice note');
    play.innerHTML = ICON_PLAY;

    var bar = document.createElement('div');
    bar.className = 'fob-voice-bar';
    var fill = document.createElement('div');
    fill.className = 'fob-voice-fill';
    bar.appendChild(fill);

    var time = document.createElement('span');
    time.className = 'fob-voice-time';
    time.textContent = FOB.media.clock(m.duration_ms);

    box.appendChild(play);
    box.appendChild(bar);
    box.appendChild(time);

    if (!m.url) {
      box.classList.add('is-missing');
      time.textContent = 'Unavailable';
      play.disabled = true;
      return box;
    }

    /* Created but not loaded: preload none means a feed full of voice
       notes costs nothing until one is actually played. */
    var audio = new Audio();
    audio.preload = 'none';
    audio.src = m.url;

    play.addEventListener('click', function () {
      if (audio.paused) {
        /* Only one voice note at a time, or a scrolled feed turns into
           several people talking over each other. */
        FOB.stopAllAudio(audio);
        audio.play().catch(function () {
          time.textContent = 'Could not play';
        });
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('play', function () {
      play.innerHTML = ICON_PAUSE;
      play.setAttribute('aria-label', 'Pause voice note');
    });
    audio.addEventListener('pause', function () {
      play.innerHTML = ICON_PLAY;
      play.setAttribute('aria-label', 'Play voice note');
    });
    audio.addEventListener('timeupdate', function () {
      var d = audio.duration || (m.duration_ms / 1000) || 0;
      if (!d) return;
      fill.style.width = Math.min(100, (audio.currentTime / d) * 100) + '%';
      time.textContent = FOB.media.clock((d - audio.currentTime) * 1000);
    });
    audio.addEventListener('ended', function () {
      fill.style.width = '0%';
      time.textContent = FOB.media.clock(m.duration_ms);
    });

    bar.addEventListener('click', function (ev) {
      var d = audio.duration;
      if (!d) return;
      var box2 = bar.getBoundingClientRect();
      audio.currentTime = ((ev.clientX - box2.left) / box2.width) * d;
    });

    FOB.registerAudio(audio);
    return box;
  }

  /* One registry so any player can silence the others. */
  var players = [];
  FOB.registerAudio = function (a) { players.push(a); };
  FOB.stopAllAudio = function (except) {
    players.forEach(function (a) {
      if (a !== except && !a.paused) a.pause();
    });
  };

  /* ---------- lightbox --------------------------------------- */

  var box = null;

  function openLightbox(items, index) {
    build();
    show(items, index);
  }

  function build() {
    if (box) return;

    var back = document.createElement('div');
    back.className = 'fob-lightbox';
    back.hidden = true;
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.setAttribute('aria-label', 'Image viewer');

    var stage = document.createElement('div');
    stage.className = 'fob-lightbox-stage';

    var img = document.createElement('img');
    img.className = 'fob-lightbox-img';
    img.alt = '';
    stage.appendChild(img);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'fob-lightbox-close';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = '&times;';

    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'fob-lightbox-nav fob-lightbox-prev';
    prev.setAttribute('aria-label', 'Previous image');
    prev.innerHTML = '&#8249;';

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'fob-lightbox-nav fob-lightbox-next';
    next.setAttribute('aria-label', 'Next image');
    next.innerHTML = '&#8250;';

    var count = document.createElement('div');
    count.className = 'fob-lightbox-count';

    back.appendChild(stage);
    back.appendChild(close);
    back.appendChild(prev);
    back.appendChild(next);
    back.appendChild(count);
    document.body.appendChild(back);

    box = { back: back, img: img, prev: prev, next: next, count: count,
            items: [], at: 0 };

    close.addEventListener('click', hide);
    back.addEventListener('click', function (ev) {
      if (ev.target === back || ev.target === stage) hide();
    });
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });

    document.addEventListener('keydown', function (ev) {
      if (box.back.hidden) return;
      if (ev.key === 'Escape') hide();
      if (ev.key === 'ArrowLeft') step(-1);
      if (ev.key === 'ArrowRight') step(1);
    });

    /* Swipe. Horizontal intent only, so a vertical drag to dismiss the
       keyboard or scroll does not skip an image by accident. */
    var startX = 0, startY = 0, tracking = false;
    stage.addEventListener('touchstart', function (ev) {
      if (ev.touches.length !== 1) return;
      startX = ev.touches[0].clientX;
      startY = ev.touches[0].clientY;
      tracking = true;
    }, { passive: true });
    stage.addEventListener('touchend', function (ev) {
      if (!tracking) return;
      tracking = false;
      var t = ev.changedTouches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        step(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  function show(items, index) {
    box.items = items;
    box.at = index;
    paint();
    box.back.hidden = false;
    if (FOB.lockScroll) FOB.lockScroll();
  }

  function hide() {
    if (!box || box.back.hidden) return;
    box.back.hidden = true;
    if (FOB.unlockScroll) FOB.unlockScroll();
  }

  function step(by) {
    if (!box.items.length) return;
    box.at = (box.at + by + box.items.length) % box.items.length;
    paint();
  }

  function paint() {
    var m = box.items[box.at];
    box.img.src = m.url || '';
    box.img.alt = m.alt_text || '';
    var many = box.items.length > 1;
    box.prev.hidden = !many;
    box.next.hidden = !many;
    box.count.hidden = !many;
    box.count.textContent = (box.at + 1) + ' / ' + box.items.length;
  }

  var ICON_PLAY = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" ' +
    'aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" ' +
    'aria-hidden="true"><path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z"/></svg>';
})();
