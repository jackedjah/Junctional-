/* Workout video: plays muted on a loop; one tap on the button pauses or plays it.
   Reduced-motion visitors get a still poster until they press Play. */
(function () {
  var v = document.querySelector('video[data-loop]'), b = document.querySelector('[data-video-toggle]');
  if (!v || !b) return;
  var face = b.querySelector('.face');
  b.removeAttribute('aria-pressed');
  function paint() {
    var word = v.paused ? 'Play' : 'Pause';
    face.textContent = word;
    b.setAttribute('aria-label', word + ' the workout video');
  }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    v.removeAttribute('autoplay');
    v.pause();
  }
  b.addEventListener('click', function () {
    if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () { paint(); }); }
    else v.pause();
  });
  v.addEventListener('play', paint);
  v.addEventListener('pause', paint);
  paint();
})();
