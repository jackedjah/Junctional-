'use strict';
/* MAHWORLD landing: the ground → rise → court frame follows the step in view (normal scrolling, no hijack),
   and the Serve Lab target picker previews a zone. Nothing here pretends to be gameplay. */
(() => {
  const frames = [...document.querySelectorAll('[data-frame]')];
  const steps = [...document.querySelectorAll('[data-shot]')];
  const label = document.querySelector('[data-alt]');
  const names = ['Ground', 'Rise · 240 m', 'Court'];
  function show(i) {
    frames.forEach(f => f.classList.toggle('is-on', Number(f.dataset.frame) === i));
    steps.forEach(s => s.classList.toggle('is-on', Number(s.dataset.shot) === i));
    if (label) label.textContent = names[i] || '';
  }
  show(0);
  if ('IntersectionObserver' in window && steps.length) {
    const io = new IntersectionObserver(entries => {
      const seen = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (seen) show(Number(seen.target.dataset.shot));
    }, { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] });
    steps.forEach(s => io.observe(s));
  }

  const aim = [...document.querySelectorAll('[data-aim]')];
  const zones = [...document.querySelectorAll('[data-zone]')];
  const note = document.querySelector('[data-aim-note]');
  const words = { left: 'Left', center: 'Center', right: 'Right' };
  function pick(side) {
    aim.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.aim === side)));
    zones.forEach(z => z.classList.toggle('is-on', z.dataset.zone === side));
    if (note) note.textContent = words[side] + ' picked. Now serve for real in the demo.';
  }
  aim.forEach(b => b.addEventListener('click', () => pick(b.dataset.aim)));
  pick('center');
})();
