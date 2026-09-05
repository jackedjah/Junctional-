/* ---------------------------------------------------------------
   FOB COURSE

   One module on screen at a time, with progress kept between visits.

   The whole course is in the HTML. This file hides all but one module
   rather than fetching or building anything, so the page still works
   with JavaScript off: every module simply shows as one long readable
   article. That is also what search engines and screen readers get.
   --------------------------------------------------------------- */
(function () {
  'use strict';

  var KEY = 'fob-course-progress';
  var course = document.getElementById('course');
  if (!course) return;

  var mods = Array.prototype.slice.call(course.querySelectorAll('.fob-mod'));
  if (!mods.length) return;

  var bar = document.getElementById('course-bar');
  var fill = document.getElementById('course-fill');
  var pct = document.getElementById('course-pct');
  var meter = document.getElementById('course-meter');
  var where = document.getElementById('course-where');
  var menuBtn = document.getElementById('course-menu-btn');
  var toc = document.getElementById('course-toc');
  var tocList = document.getElementById('course-toc-list');

  var at = 0;
  var seen = load();

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(seen)); }
    catch (e) { /* private browsing; progress just will not persist */ }
  }


  /* ---------- one question per module -------------------------
     Deliberately easy. The point is a moment of active recall, not a
     test: the answer is stated plainly in the module you just read,
     there is no attempt limit, no score kept, and a wrong answer costs
     nothing but another tap. It gates Next only so nobody skims twelve
     modules without once checking they took anything in. */
  var QUIZ = {
    'welcome': {
      q: 'This course marks each idea as Established practice, Observed pattern, or one more. What is the third one called?',
      a: ['Proven fact', 'Expert opinion', 'Working hypothesis', 'Common knowledge'],
      right: 2,
      why: 'Established practice, Observed pattern, Working hypothesis. If something is uncertain, it says so.'
    },
    'what-is-fob': {
      q: 'What does FOB stand for?',
      a: ['Force Output Band', 'Full Body Oscillation', 'Flexible Overload Bar', 'Functional Oscillation Ballast'],
      right: 3,
      why: 'Functional Oscillation Ballast. The ballast is the part that carries the mass.'
    },
    'resistance': {
      q: 'When you stretch an elastic band further, does it pull back harder or softer?',
      a: ['Softer', 'Exactly the same', 'It stops pulling', 'Harder'],
      right: 3,
      why: 'The further it stretches, the more it generally resists. That is why FOB resistance changes while you move.'
    },
    'oscillation': {
      q: 'Was oscillatory training invented by FOB?',
      a: ['No, it has been used in sports science for decades', 'Yes, recently', 'Yes, for the upper body only', 'It has never been studied'],
      right: 0,
      why: 'It predates FOB by decades. FOB applies the same principle toward a different goal.'
    },
    'loop': {
      q: 'The four parts of a FOB repetition are initiate, receive, redirect, and one more. What is the fourth?',
      a: ['Rest', 'Repeat', 'Reverse', 'Record'],
      right: 1,
      why: 'Initiate, receive, redirect, repeat. Receiving the weight is the part most people skip.'
    },
    'body-learns': {
      q: 'When you first start getting better at a new exercise, what improves before muscle size does?',
      a: ['Coordination', 'Bone density', 'Height', 'Lung capacity'],
      right: 0,
      why: 'Early improvement is mostly coordination. That is well established, and it counts as real progress.'
    },
    'reactive-endurance': {
      q: 'Reactive Endurance measures how well you keep going once you are what?',
      a: ['Warmed up', 'Tired', 'Outdoors', 'Finished'],
      right: 1,
      why: 'Strength asks how much you can do. Reactive Endurance asks how much you keep once you are tired.'
    },
    'work-capacity': {
      q: 'Being able to rest briefly and then perform well again is called what?',
      a: ['Durability', 'Resilience', 'Repeatability', 'Fatigability'],
      right: 2,
      why: 'The four are durability, fatigability, repeatability and resilience. This one is repeatability.'
    },
    'direction': {
      q: 'A vector means a force together with one other thing. What is it?',
      a: ['The direction it goes', 'How heavy it is', 'How long it lasts', 'How loud it is'],
      right: 0,
      why: 'A force plus its direction. Change the direction and you change the exercise.'
    },
    'movement-system': {
      q: 'What does a Movement Style describe?',
      a: ['The park where you train', 'The exact way you perform the movement', 'Only the weight of the FOBlock', 'The number of sessions you purchased'],
      right: 1,
      why: 'A Movement Style is the specific strategy: when you produce force in the oscillation and how you coordinate the limbs and torso.'
    },
    'progression': {
      q: 'If you want to know why your training improved, what should you do?',
      a: ['Change everything at once', 'Change one main thing at a time', 'Add more weight every time', 'Avoid keeping notes'],
      right: 1,
      why: 'Changing one thing at a time is what makes the result readable.'
    },
    'safety': {
      q: 'If you cannot stop the movement calmly at the end of a set, what does that tell you?',
      a: ['You are doing it right', 'It is too much for now', 'You should speed up', 'You need a longer band'],
      right: 1,
      why: 'If you cannot stop it calmly, it is too much. Stopping is part of the exercise.'
    },
    'faq': {
      q: 'Does FOB replace your sport?',
      a: ['Yes, completely', 'No, specific training stays specific', 'Only for runners', 'Only in winter'],
      right: 1,
      why: 'Runners still need to run. Swimmers still need water.'
    }
  };

  function buildQuiz(mod, i, nextBtn) {
    var data = QUIZ[mod.dataset.mod];
    if (!data) return null;

    var wrap = document.createElement('section');
    wrap.className = 'fob-quiz';

    var kick = document.createElement('p');
    kick.className = 'fob-quiz-kick';
    kick.textContent = 'Quick check';
    wrap.appendChild(kick);

    var q = document.createElement('p');
    q.className = 'fob-quiz-q';
    q.textContent = data.q;
    wrap.appendChild(q);

    var opts = document.createElement('div');
    opts.className = 'fob-quiz-opts';
    opts.setAttribute('role', 'group');
    opts.setAttribute('aria-label', 'Answer options');

    var note = document.createElement('p');
    note.className = 'fob-quiz-note';
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');

    var passed = !!seen[mod.dataset.mod + ':quiz'];

    data.a.forEach(function (text, n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'fob-quiz-opt';
      b.textContent = text;
      b.addEventListener('click', function () {
        if (b.classList.contains('is-right')) return;
        if (n === data.right) {
          Array.prototype.forEach.call(opts.children, function (o) {
            o.classList.remove('is-wrong');
            o.disabled = true;
          });
          b.classList.add('is-right');
          b.disabled = false;
          note.className = 'fob-quiz-note is-good';
          note.textContent = 'That is it. ' + data.why;
          seen[mod.dataset.mod + ':quiz'] = true;
          save();
          unlock(nextBtn, true);
        } else {
          /* No penalty and no lockout. Wrong answers simply dim. */
          b.classList.add('is-wrong');
          b.disabled = true;
          note.className = 'fob-quiz-note is-try';
          note.textContent = 'Not quite. Try another, there is no limit.';
        }
      });
      opts.appendChild(b);
    });

    wrap.appendChild(opts);
    wrap.appendChild(note);

    if (passed) {
      Array.prototype.forEach.call(opts.children, function (o, n) {
        o.disabled = n !== data.right;
        if (n === data.right) o.classList.add('is-right');
      });
      note.className = 'fob-quiz-note is-good';
      note.textContent = data.why;
    }
    unlock(nextBtn, passed);
    return wrap;
  }

  function unlock(nextBtn, ok) {
    if (!nextBtn) return;
    nextBtn.disabled = !ok;
    nextBtn.title = ok ? '' : 'Answer the quick check to continue';
  }

  /* ---------- navigation footer added to each module ---------- */

  mods.forEach(function (mod, i) {
    var nav = document.createElement('div');
    nav.className = 'fob-mod-nav';

    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'fob-mod-back';
    back.textContent = 'Back';
    back.disabled = i === 0;
    back.addEventListener('click', function () { go(i - 1); });

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'fob-mod-next';
    next.textContent = i === mods.length - 1 ? 'Finish' : 'Next';
    next.addEventListener('click', function () {
      markSeen(i);
      if (i === mods.length - 1) {
        /* Finishing lands you back at the top of the last screen rather
           than nowhere, and the bar shows 100 percent. */
        paint();
        window.scrollTo({ top: bar.offsetTop, behavior: 'smooth' });
        return;
      }
      go(i + 1);
    });

    var step = document.createElement('span');
    step.className = 'fob-mod-step';
    step.textContent = (i + 1) + ' of ' + mods.length;

    var host = mod.querySelector('.fob-wrap-narrow');
    var quiz = buildQuiz(mod, i, next);
    if (quiz) host.appendChild(quiz);

    nav.appendChild(back);
    nav.appendChild(step);
    nav.appendChild(next);
    host.appendChild(nav);
  });

  function markSeen(i) {
    seen[mods[i].dataset.mod] = true;
    save();
    paint();
  }

  /* ---------- showing one at a time -------------------------- */

  function go(i, quiet) {
    if (i < 0 || i >= mods.length) return;
    at = i;

    mods.forEach(function (m, n) { m.hidden = n !== i; });

    /* Reaching a module counts as reading it. Requiring a button press
       would leave somebody who read every word sitting at zero. */
    seen[mods[i].dataset.mod] = true;
    save();
    paint();

    var id = mods[i].dataset.mod;
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#' + id);
    }

    if (!quiet) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      /* Move focus to the heading so a screen reader announces the new
         module instead of silently swapping the page under them. */
      var h = mods[i].querySelector('.fob-mod-title');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
    closeToc();
  }

  function paint() {
    /* The bar shows WHERE YOU ARE, not the furthest you have reached.
       Reading it as a high-water mark meant going back three modules
       left it stuck at the top, which is confusing when the whole point
       of the bar is to tell you your position. Completion is still
       tracked separately and shown as ticks in the module list. */
    var v = Math.round(((at + 1) / mods.length) * 100);
    fill.style.width = v + '%';
    pct.textContent = v + '%';
    meter.setAttribute('aria-valuenow', String(v));
    where.textContent = mods[at].dataset.title;
    if (tocList.children.length) {
      Array.prototype.forEach.call(tocList.children, function (b, n) {
        b.classList.toggle('is-on', n === at);
        b.classList.toggle('is-done', !!seen[mods[n].dataset.mod]);
      });
    }
  }

  /* ---------- module list ------------------------------------ */

  mods.forEach(function (mod, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'fob-toc-item';

    var n = document.createElement('span');
    n.className = 'fob-toc-num';
    n.textContent = i === 0 ? '\u2022' : String(i);

    var t = document.createElement('span');
    t.className = 'fob-toc-title';
    t.textContent = mod.dataset.title;

    var mins = document.createElement('span');
    mins.className = 'fob-toc-mins';
    mins.textContent = mod.dataset.mins + ' min';

    b.appendChild(n);
    b.appendChild(t);
    b.appendChild(mins);
    b.addEventListener('click', function () { go(i); });
    tocList.appendChild(b);
  });

  function openToc() {
    toc.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
  }
  function closeToc() {
    toc.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  menuBtn.addEventListener('click', function () {
    if (toc.hidden) openToc(); else closeToc();
  });
  document.addEventListener('click', function (ev) {
    if (toc.hidden) return;
    if (toc.contains(ev.target) || menuBtn.contains(ev.target)) return;
    closeToc();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && !toc.hidden) closeToc();
    if (toc.hidden && !ev.metaKey && !ev.ctrlKey &&
        document.activeElement === document.body) {
      if (ev.key === 'ArrowRight') go(at + 1);
      if (ev.key === 'ArrowLeft') go(at - 1);
    }
  });

  /* ---------- glossary search --------------------------------- */

  var gq = document.getElementById('gloss-q');
  if (gq) {
    var items = Array.prototype.slice.call(
      document.querySelectorAll('.fob-gloss-item'));
    var none = document.getElementById('gloss-none');
    gq.addEventListener('input', function () {
      var term = gq.value.trim().toLowerCase();
      var hits = 0;
      items.forEach(function (it) {
        var match = !term ||
          it.dataset.name.indexOf(term) !== -1 ||
          it.textContent.toLowerCase().indexOf(term) !== -1;
        it.hidden = !match;
        if (match) hits++;
      });
      none.hidden = hits > 0;
    });
  }

  /* ---------- start where they left off ----------------------- */

  var fromHash = window.location.hash.replace('#', '');
  var startAt = 0;
  if (fromHash) {
    mods.forEach(function (m, i) { if (m.dataset.mod === fromHash) startAt = i; });
  } else {
    /* Resume at the first unread module rather than the very start. */
    for (var i = 0; i < mods.length; i++) {
      if (!seen[mods[i].dataset.mod]) { startAt = i; break; }
      startAt = i;
    }
  }
  go(startAt, true);
  paint();
  /* A direct course deep-link (for example from Meal Grade) should land at
     the top of that module after the one-at-a-time layout has collapsed the
     earlier modules. Native hash scrolling happens before that collapse and
     can otherwise leave the module heading hidden above the viewport. */
  if (fromHash) window.scrollTo({ top: 0, behavior: 'auto' });
})();
