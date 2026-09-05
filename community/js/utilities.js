/* ============================================================
   FOB COMMUNITY :: UTILITIES
   Shared helpers. No feature logic lives here.
   ============================================================ */
(function () {
  'use strict';

  var FOB = (window.FOB = window.FOB || {});
  var cfg = window.FOB_COMMUNITY_CONFIG || {};

  /* ---------- escaping ---------------------------------------
     Every piece of user-generated text passes through this
     before touching innerHTML. Nothing in the community writes
     raw user input into the DOM.
  ------------------------------------------------------------ */
  FOB.escapeHtml = function (value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /* ---------- status messages -------------------------------- */
  FOB.setStatus = function (el, message, tone) {
    if (!el) return;
    el.textContent = message || '';
    el.className = 'fob-community-status' + (tone ? ' is-' + tone : '');
    el.hidden = !message;
  };

  FOB.toast = function (message, tone) {
    var host = document.getElementById('fob-community-toasts');
    if (!host) return;

    /* Tapping a denied microphone three times produced three identical
       toasts stacked over the nav. Refresh the existing one instead. */
    var existing = host.lastElementChild;
    if (existing && existing.textContent === message) {
      existing.classList.remove('is-leaving');
      return;
    }
    /* Never more than three on screen at once. */
    while (host.children.length >= 3) host.removeChild(host.firstElementChild);

    var node = document.createElement('div');
    node.className = 'fob-community-toast' + (tone ? ' is-' + tone : '');
    node.setAttribute('role', 'status');
    node.textContent = message;
    host.appendChild(node);
    window.setTimeout(function () {
      node.classList.add('is-leaving');
      window.setTimeout(function () { node.remove(); }, 300);
    }, 4200);
  };

  /* ---------- setup banner -----------------------------------
     Shown when config.js still holds placeholders, so the owner
     is never left guessing why nothing works.
  ------------------------------------------------------------ */
  FOB.guardConfigured = function () {
    if (FOB.configured) return true;
    var banner = document.getElementById('fob-community-setup-banner');
    if (banner) banner.hidden = false;
    document.querySelectorAll('[data-requires-supabase]').forEach(function (el) {
      el.setAttribute('disabled', 'disabled');
      el.setAttribute('aria-disabled', 'true');
    });
    return false;
  };

  /* ---------- validation ------------------------------------- */
  var USERNAME_RE = /^[a-z0-9._]{3,24}$/;

  FOB.validateUsername = function (raw) {
    var value = String(raw || '').trim().toLowerCase();
    if (!value) return { ok: false, reason: 'Pick a username.' };
    if (value.length < 3) return { ok: false, reason: 'At least 3 characters.' };
    if (value.length > 24) return { ok: false, reason: 'Keep it to 24 characters or fewer.' };
    if (!USERNAME_RE.test(value)) {
      return { ok: false, reason: 'Letters, numbers, periods and underscores only.' };
    }
    if (/^[._]/.test(value) || /[._]$/.test(value)) {
      return { ok: false, reason: 'Cannot start or end with a period or underscore.' };
    }
    return { ok: true, value: value };
  };

  FOB.validateEmail = function (raw) {
    var value = String(raw || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  FOB.passwordStrength = function (pw) {
    var value = String(pw || '');
    if (value.length < 10) return { ok: false, reason: 'Use at least 10 characters.' };
    var classes = 0;
    if (/[a-z]/.test(value)) classes++;
    if (/[A-Z]/.test(value)) classes++;
    if (/[0-9]/.test(value)) classes++;
    if (/[^A-Za-z0-9]/.test(value)) classes++;
    if (classes < 2) {
      return { ok: false, reason: 'Mix letters with numbers or symbols.' };
    }
    return { ok: true };
  };

  /* ---------- age gate ---------------------------------------
     Client-side courtesy only. The real gate is the check
     constraint on profile_private.date_of_birth.
  ------------------------------------------------------------ */
  FOB.ageFrom = function (dobString) {
    if (!dobString) return null;
    var dob = new Date(dobString + 'T00:00:00');
    if (isNaN(dob.getTime())) return null;
    var now = new Date();
    var age = now.getFullYear() - dob.getFullYear();
    var m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  };

  FOB.meetsMinimumAge = function (dobString) {
    var age = FOB.ageFrom(dobString);
    return age !== null && age >= (cfg.MINIMUM_AGE || 18);
  };

  /* ---------- initials avatar -------------------------------- */
  FOB.initialsFor = function (displayName, username) {
    var source = String(displayName || username || '?').trim();
    var parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  };

  FOB.avatarUrl = function (path) {
    if (!path || !FOB.supabase) return null;
    var res = FOB.supabase.storage.from('avatars').getPublicUrl(path);
    return (res && res.data && res.data.publicUrl) || null;
  };

  /* ---------- media validation ------------------------------- */
  var AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  FOB.validateAvatarFile = function (file) {
    if (!file) return { ok: false, reason: 'No file selected.' };
    if (AVATAR_TYPES.indexOf(file.type) === -1) {
      return { ok: false, reason: 'Use a JPEG, PNG or WebP image.' };
    }
    var max = (cfg.LIMITS && cfg.LIMITS.avatarMaxBytes) || 8388608;
    if (file.size > max) {
      return { ok: false, reason: 'That image is over ' + Math.round(max / 1048576) + ' MB.' };
    }
    return { ok: true };
  };

  /* Square-crop and downscale in the browser so we never upload
     a 12 MP phone photo to serve a 96 px avatar. */
  FOB.prepareAvatar = function (file, size) {
    var target = size || 512;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read that file.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('That image could not be opened.')); };
        img.onload = function () {
          var side = Math.min(img.width, img.height);
          var sx = (img.width - side) / 2;
          var sy = (img.height - side) / 2;
          var canvas = document.createElement('canvas');
          canvas.width = canvas.height = target;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);
          canvas.toBlob(function (blob) {
            if (!blob) { reject(new Error('Could not process that image.')); return; }
            resolve({ blob: blob, previewUrl: canvas.toDataURL('image/jpeg', 0.85) });
          }, 'image/jpeg', 0.85);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  /* ---------- misc ------------------------------------------- */
  FOB.debounce = function (fn, wait) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 300);
    };
  };

  FOB.friendlyError = function (error) {
    if (!error) return 'Something went wrong. Try again.';
    var msg = String(error.message || error);

    if (/body_len/i.test(msg)) {
      return 'Add some text, or attach a photo or voice note.';
    }
    if (/title_len/i.test(msg)) {
      return 'Titles need to be between 4 and 160 characters.';
    }
    if (/row-level security|violates row-level/i.test(msg)) {
      return 'You do not have permission to do that.';
    }
    if (/payload too large|exceeded the maximum|file size/i.test(msg)) {
      return 'That file is too large.';
    }
    if (/mime type|not supported/i.test(msg)) {
      return 'That file type is not supported.';
    }
    /* A constraint name nobody has mapped yet is far more useful shown
       than hidden behind a generic apology. */
    if (/violates check constraint/i.test(msg)) {
      return 'That post did not meet a required rule. (' + msg.slice(0, 90) + ')';
    }
    if (/already registered|already exists/i.test(msg)) {
      return 'An account already uses that email. Try signing in.';
    }
    if (/invalid login credentials/i.test(msg)) {
      return 'That email and password combination is not right.';
    }
    if (/email not confirmed/i.test(msg)) {
      return 'Confirm your email first. Check your inbox for the link.';
    }
    /* Supabase returns "email rate limit exceeded" when the PROJECT's
       hourly outbound email quota is spent. That is a server-side cap
       shared by every visitor, so it can fire on a member's very first
       signup. Blaming their attempts is wrong and makes them retry,
       which cannot help. Keep it separate from a genuine per-user
       throttle. Root fix is custom SMTP (Resend), not a copy change. */
    if (/email rate limit|over_email_send_rate_limit/i.test(msg)) {
      return 'Our email service is temporarily at its sending limit. ' +
             'This is on our side, not something you did. ' +
             'Please try again in a few minutes.';
    }
    /* "For security purposes, you can only request this after 47 seconds." */
    var wait = msg.match(/after (\d+) seconds?/i);
    if (wait) {
      return 'Please wait ' + wait[1] + ' seconds before trying again.';
    }
    if (/rate limit|too many/i.test(msg)) {
      return 'Too many attempts. Wait a moment and try again.';
    }
    if (/duplicate key.*username/i.test(msg)) {
      return 'That username was just taken. Pick another.';
    }
    if (/dob_min_age|date_of_birth/i.test(msg)) {
      return 'You must be ' + (cfg.MINIMUM_AGE || 18) + ' or older to join.';
    }
    if (/Failed to fetch|NetworkError/i.test(msg)) {
      return 'Connection interrupted. Check your network and try again.';
    }
    // Never surface a raw Postgres or JS error to a member.
    console.error('[FOB Community]', error);
    return 'Something went wrong. Try again.';
  };

  FOB.redirectParam = function () {
    var params = new URLSearchParams(window.location.search);
    var next = params.get('next');
    // Only same-origin relative paths, so ?next= cannot be used
    // as an open redirect to an attacker's site.
    if (next && /^\/[A-Za-z0-9/_\-.]*$/.test(next) && next.indexOf('//') !== 0) {
      return next;
    }
    return null;
  };
})();

/* ---------- leaving the community ---------------------------
   The forum banner logo and account-page brand mark point back
   at the marketing site. Tapping one mid-scroll drops a member
   out of the feed with no warning, which reads as a bug rather
   than a choice. Ask first, but only for the banner marks: the
   footer links are read as deliberate exits and stay silent. */
(function () {
  if (!document.body || !document.body.classList.contains('fob-community-page')) return;

  document.addEventListener('click', function (ev) {
    var link = ev.target.closest && ev.target.closest('a[href]');
    if (!link) return;
    if (!link.closest('.fob-social-top, .fob-nav, .fob-brand')) return;

    var url;
    try { url = new URL(link.getAttribute('href'), window.location.href); }
    catch (e) { return; }

    if (url.origin !== window.location.origin) return;
    if (url.pathname.indexOf('/community') === 0) return;

    if (!window.confirm('Leave FOB Community and go back to the FOB Systems site?')) {
      ev.preventDefault();
    }
  });
})();


/* ---------- interest groups ---------------------------------
   The interests table carries a `grouping` column. Both the
   onboarding picker and the profile editor render the same
   headings in the same order, so the vocabulary lives here
   rather than being written out twice. Anything with a grouping
   not listed below falls to the end under "More". */
window.FOB.INTEREST_GROUPS = [
  ['screen',   'Screen'],
  ['heroes',   'Comics and Heroes'],
  ['games',    'Gaming'],
  ['music',    'Music'],
  ['sports',   'Sports'],
  ['food',     'Food'],
  ['animals',  'Animals'],
  ['strange',  'Strange and Unexplained'],
  ['style',    'Style'],
  ['life',     'Life'],
  ['training', 'Training'],
  ['science',  'Training Science'],
  ['fob',      'FOB']
];

/* Renders grouped chips into `host`. makeChip(name, id) must return
   the button element; selection state stays with the caller. */
window.FOB.renderGroupedChips = function (host, rows, makeChip) {
  host.innerHTML = '';
  var order = window.FOB.INTEREST_GROUPS;
  var seen = {};
  order.forEach(function (pair) { seen[pair[0]] = true; });

  var buckets = {};
  rows.forEach(function (r) {
    var key = seen[r.grouping] ? r.grouping : 'more';
    (buckets[key] = buckets[key] || []).push(r);
  });

  var sequence = order.slice();
  if (buckets.more) sequence.push(['more', 'More']);

  sequence.forEach(function (pair) {
    var list = buckets[pair[0]];
    if (!list || !list.length) return;
    var head = document.createElement('p');
    head.className = 'fob-chip-group';
    head.textContent = pair[1];
    host.appendChild(head);
    var wrap = document.createElement('div');
    wrap.className = 'fob-community-chips';
    list.forEach(function (r) { wrap.appendChild(makeChip(r.name, r.id)); });
    host.appendChild(wrap);
  });
};


/* ---------- scroll lock ------------------------------------
   Overlays used to set body.overflow themselves and restore it on
   the paths their author remembered. Any missed path left the page
   permanently unscrollable, which is the "sometimes I click
   something and cannot scroll" bug. Counted, so two overlays open
   at once still unlock exactly once. */
(function () {
  var depth = 0;
  window.FOB.lockScroll = function () {
    depth += 1;
    document.body.style.overflow = 'hidden';
  };
  window.FOB.unlockScroll = function () {
    depth = Math.max(0, depth - 1);
    if (depth === 0) document.body.style.overflow = '';
  };
  /* Anything that removes an overlay without going through close()
     still gets cleaned up on the next navigation. */
  window.addEventListener('pageshow', function () {
    depth = 0;
    document.body.style.overflow = '';
  });
})();
