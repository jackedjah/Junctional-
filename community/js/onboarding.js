/* ============================================================
   FOB COMMUNITY :: ONBOARDING
   Five steps. Progress is saved to the profile row as the member
   advances, so a dropped connection does not lose their work.
   ============================================================ */
(function () {
  'use strict';

  var FOB = (window.FOB = window.FOB || {});
  var TOTAL = 5;

  var state = {
    userId: null,
    profile: null,
    avatarBlob: null,
    avatarPath: null,
    sports: [],
    interests: [],
    selectedSports: [],
    selectedInterests: []
  };

  var status, stepLabel, stepBar;

  function showStep(n) {
    document.querySelectorAll('[data-step]').forEach(function (panel) {
      panel.hidden = (Number(panel.getAttribute('data-step')) !== n);
    });
    stepLabel.textContent = 'Step ' + n + ' of ' + TOTAL;
    Array.prototype.forEach.call(stepBar.children, function (li, i) {
      li.className = (i < n - 1) ? 'is-done' : (i === n - 1 ? 'is-current' : '');
    });
    FOB.setStatus(status, '');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    var panel = document.querySelector('[data-step="' + n + '"]');
    var h = panel && panel.querySelector('.fob-community-title');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }

    if (n === 5) buildReview();
    saveProgress(n);
  }

  function saveProgress(step) {
    if (!state.userId) return;
    FOB.supabase.from('profiles')
      .update({ onboarding_step: step })
      .eq('id', state.userId)
      .then(function () {}, function () {});   // best effort, never blocks
  }

  /* ---------- avatar ---------------------------------------- */
  function wireAvatar() {
    var pick = document.getElementById('avatar-pick');
    var input = document.getElementById('avatar-file');
    var host = document.getElementById('avatar-preview-host');
    var note = document.getElementById('avatar-note');

    pick.addEventListener('click', function () { input.click(); });

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;

      var check = FOB.validateAvatarFile(file);
      if (!check.ok) {
        note.textContent = check.reason;
        note.className = 'is-error';
        input.value = '';
        return;
      }

      note.textContent = 'Preparing image...';
      note.className = '';

      openCropper(file, host, note);
    });
  }

  /* Square cropper: drag to move, slider to zoom. Exports exactly
     what the member framed rather than a blind centre crop. */
  function openCropper(file, host, note) {
    var reader = new FileReader();
    reader.onerror = function () { note.textContent = 'Could not read that file.'; note.className = 'is-error'; };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { note.textContent = 'That image could not be opened.'; note.className = 'is-error'; };
      img.onload = function () { buildCropUI(img, host, note); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function buildCropUI(img, host, note) {
    var wrap = document.getElementById('crop-ui');
    if (wrap) wrap.remove();

    wrap = document.createElement('div');
    wrap.className = 'fob-crop';
    wrap.id = 'crop-ui';

    var stage = document.createElement('div');
    stage.className = 'fob-crop-stage';
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    stage.appendChild(canvas);

    var zoomRow = document.createElement('div');
    zoomRow.className = 'fob-crop-zoom';
    var minus = document.createElement('span'); minus.textContent = 'Zoom';
    var range = document.createElement('input');
    range.type = 'range'; range.min = '100'; range.max = '300'; range.value = '100';
    range.setAttribute('aria-label', 'Zoom photo');
    zoomRow.appendChild(minus); zoomRow.appendChild(range);

    var hint = document.createElement('p');
    hint.className = 'fob-crop-hint';
    hint.textContent = 'Drag to position, slide to zoom.';

    wrap.appendChild(stage); wrap.appendChild(zoomRow); wrap.appendChild(hint);
    host.innerHTML = '';
    host.appendChild(wrap);
    note.textContent = 'Frame it how you like. It uploads when you finish.';
    note.className = '';

    var ctx = canvas.getContext('2d');
    var base = Math.max(512 / img.width, 512 / img.height);
    var scale = base, ox = 0, oy = 0;

    function clamp() {
      var w = img.width * scale, h = img.height * scale;
      var maxX = Math.max(0, (w - 512) / 2), maxY = Math.max(0, (h - 512) / 2);
      ox = Math.min(maxX, Math.max(-maxX, ox));
      oy = Math.min(maxY, Math.max(-maxY, oy));
    }
    function draw() {
      clamp();
      var w = img.width * scale, h = img.height * scale;
      ctx.fillStyle = '#20262D'; ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, (512 - w) / 2 + ox, (512 - h) / 2 + oy, w, h);
    }
    draw();

    range.addEventListener('input', function () {
      scale = base * (parseInt(range.value, 10) / 100);
      draw();
    });

    var dragging = false, lx = 0, ly = 0;
    function down(e) {
      dragging = true;
      var t = e.touches ? e.touches[0] : e;
      lx = t.clientX; ly = t.clientY;
    }
    function move(e) {
      if (!dragging) return;
      e.preventDefault();
      var t = e.touches ? e.touches[0] : e;
      var k = 512 / stage.offsetWidth;
      ox += (t.clientX - lx) * k; oy += (t.clientY - ly) * k;
      lx = t.clientX; ly = t.clientY;
      draw();
    }
    function up() { dragging = false; }

    stage.addEventListener('mousedown', down);
    stage.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('mousemove', move);
    stage.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', up);
    stage.addEventListener('touchend', up);

    state.getCroppedBlob = function () {
      return new Promise(function (resolve) {
        canvas.toBlob(function (b) { resolve(b); }, 'image/jpeg', 0.85);
      });
    };
    state.cropCanvas = canvas;
  }

  function uploadAvatar() {
    if (!state.getCroppedBlob) return Promise.resolve(null);
    return state.getCroppedBlob().then(function (blob) {
      if (!blob) return null;
      var path = state.userId + '/avatar-' + Date.now() + '.jpg';
      return FOB.supabase.storage.from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        .then(function (res) {
          if (res.error) throw res.error;
          return path;
        });
    });
  }

  /* ---------- vocabularies ---------------------------------- */
  function loadVocabularies() {
    return Promise.all([
      FOB.supabase.from('sports')
        .select('id, slug, name').eq('is_approved', true).order('sort_order'),
      FOB.supabase.from('interests')
        .select('id, slug, name, grouping').eq('is_approved', true).order('sort_order')
    ]).then(function (results) {
      if (results[0].error) throw results[0].error;
      if (results[1].error) throw results[1].error;
      state.sports = results[0].data || [];
      state.interests = results[1].data || [];
      renderSports();
      renderInterests();
    });
  }

  function renderSports() {
    var select = document.getElementById('ob-primary-sport');
    select.innerHTML = '<option value="">Choose one</option>';
    state.sports.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      select.appendChild(opt);
    });

    var host = document.getElementById('ob-other-sports');
    host.innerHTML = '';
    state.sports.forEach(function (s) {
      host.appendChild(makeChip(s.name, s.id, state.selectedSports));
    });
  }

  function renderInterests() {
    var host = document.getElementById('ob-interests');
    FOB.renderGroupedChips(host, state.interests, function (name, id) {
      return makeChip(name, id, state.selectedInterests, updateInterestCount);
    });
  }

  function makeChip(label, id, bucket, onToggle) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fob-community-chip';
    btn.textContent = label;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', function () {
      var at = bucket.indexOf(id);
      if (at === -1) { bucket.push(id); btn.setAttribute('aria-pressed', 'true'); }
      else { bucket.splice(at, 1); btn.setAttribute('aria-pressed', 'false'); }
      if (onToggle) onToggle();
    });
    return btn;
  }

  function updateInterestCount() {
    var el = document.getElementById('ob-interests-count');
    var n = state.selectedInterests.length;
    el.textContent = n + (n === 1 ? ' selected' : ' selected');
  }

  /* ---------- validation per step --------------------------- */
  function validate(step) {
    if (step === 1) {
      var name = document.getElementById('ob-display-name').value.trim();
      if (!name) return 'Enter a display name.';
    }
    if (step === 2) {
      if (!document.getElementById('ob-primary-sport').value) {
        return 'Choose your primary sport or activity.';
      }
    }
    if (step === 3) {
      if (state.selectedInterests.length === 0) {
        return 'Choose at least one training interest.';
      }
    }
    return null;
  }

  /* ---------- review ---------------------------------------- */
  function buildReview() {
    var name = document.getElementById('ob-display-name').value.trim();
    document.getElementById('review-name').textContent = name;
    document.getElementById('review-username').textContent = '@' + state.profile.username;

    var host = document.getElementById('review-avatar-host');
    host.innerHTML = '';
    var preview = state.cropCanvas || document.querySelector('#avatar-preview-host img');
    if (preview) {
      var img = document.createElement('img');
      img.className = 'fob-profile-avatar';
      img.src = state.cropCanvas ? state.cropCanvas.toDataURL('image/jpeg', 0.85) : preview.src;
      img.alt = 'Your profile photo';
      host.appendChild(img);
    } else {
      var fb = document.createElement('div');
      fb.className = 'fob-profile-avatar-fallback';
      fb.setAttribute('aria-hidden', 'true');
      fb.textContent = FOB.initialsFor(name, state.profile.username);
      host.appendChild(fb);
    }

    var sportId = document.getElementById('ob-primary-sport').value;
    var sport = state.sports.filter(function (s) { return s.id === sportId; })[0];
    var chosen = state.interests.filter(function (i) {
      return state.selectedInterests.indexOf(i.id) !== -1;
    }).map(function (i) { return i.name; });

    var rows = [
      ['Primary sport', sport ? sport.name : ''],
      ['Interests', chosen.join(', ')],
      ['Hidden for now', hiddenSummary()]
    ];

    var out = '<ul class="fob-edu-defs" style="margin-top:6px;">';
    rows.forEach(function (r) {
      if (!r[1]) return;
      out += '<li><b>' + FOB.escapeHtml(r[0]) + '</b>' + FOB.escapeHtml(r[1]) + '</li>';
    });
    out += '</ul>';
    document.getElementById('review-summary').innerHTML = out;
  }

  function hiddenSummary() {
    var hidden = [];
    if (document.getElementById('priv-age').value === 'only_me') hidden.push('age');
    if (document.getElementById('priv-hometown').value === 'only_me') hidden.push('hometown');
    if (document.getElementById('priv-city').value === 'only_me') hidden.push('current city');
    return hidden.length ? hidden.join(', ') : '';
  }

  /* ---------- save ------------------------------------------ */
  function finish() {
    var btn = document.getElementById('ob-finish');
    btn.disabled = true;
    FOB.setStatus(status, 'Saving your profile...', '');

    uploadAvatar()
      .then(function (path) {
        state.avatarPath = path;

        return FOB.supabase.from('profiles').update({
          display_name: document.getElementById('ob-display-name').value.trim(),
          pronouns: nullIfBlank(document.getElementById('ob-pronouns').value),
          bio: nullIfBlank(document.getElementById('ob-bio').value),
          training_goals: nullIfBlank(document.getElementById('ob-goals').value),
          hometown: nullIfBlank(document.getElementById('ob-hometown').value),
          current_city: nullIfBlank(document.getElementById('ob-city').value),
          experience_level: nullIfBlank(document.getElementById('ob-experience').value),
          avatar_path: path,
          onboarding_completed: true,
          onboarding_step: TOTAL
        }).eq('id', state.userId);
      })
      .then(function (res) {
        if (res.error) throw res.error;

        var primary = document.getElementById('ob-primary-sport').value;
        var sportRows = [{ user_id: state.userId, sport_id: primary, is_primary: true }];
        state.selectedSports.forEach(function (id) {
          if (id !== primary) {
            sportRows.push({ user_id: state.userId, sport_id: id, is_primary: false });
          }
        });
        var interestRows = state.selectedInterests.map(function (id) {
          return { user_id: state.userId, interest_id: id };
        });

        return Promise.all([
          FOB.supabase.from('user_sports').upsert(sportRows, { onConflict: 'user_id,sport_id' }),
          FOB.supabase.from('user_interests').upsert(interestRows, { onConflict: 'user_id,interest_id' }),
          FOB.supabase.from('privacy_settings').update({
            show_age: document.getElementById('priv-age').value,
            show_hometown: document.getElementById('priv-hometown').value,
            show_current_city: document.getElementById('priv-city').value,
            show_activity_status: document.getElementById('priv-activity').value === 'true',
            who_can_friend_request: document.getElementById('priv-requests').value
          }).eq('user_id', state.userId)
        ]);
      })
      .then(function (results) {
        var failed = results.filter(function (r) { return r && r.error; });
        if (failed.length) throw failed[0].error;
        /* Rooms is now where the forum opens for everyone, so no flag
           is needed to send a new member there. */
        window.location.replace('/community/discussions.html');
      })
      .catch(function (err) {
        FOB.setStatus(status, FOB.friendlyError(err), 'error');
        btn.disabled = false;
      });
  }

  function nullIfBlank(v) {
    var s = String(v || '').trim();
    return s === '' ? null : s;
  }

  /* ---------- boot ------------------------------------------ */
  document.addEventListener('fob:ready', function (e) {
    state.userId = e.detail.session.user.id;
    state.profile = e.detail.profile;

    status = document.getElementById('ob-status');
    stepLabel = document.getElementById('step-label');
    stepBar = document.getElementById('step-bar');

    document.getElementById('ob-display-name').value = state.profile.display_name || '';
    document.getElementById('avatar-fallback').textContent =
      FOB.initialsFor(state.profile.display_name, state.profile.username);

    wireAvatar();

    document.querySelectorAll('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var from = Number(btn.closest('[data-step]').getAttribute('data-step'));
        var problem = validate(from);
        if (problem) { FOB.setStatus(status, problem, 'error'); return; }
        showStep(Number(btn.getAttribute('data-next')));
      });
    });
    document.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showStep(Number(btn.getAttribute('data-back')));
      });
    });

    var bio = document.getElementById('ob-bio');
    bio.addEventListener('input', function () {
      document.getElementById('ob-bio-count').textContent = bio.value.length + ' / 500';
    });

    document.getElementById('ob-finish').addEventListener('click', finish);
    document.getElementById('onboarding-signout').addEventListener('click', function (ev) {
      ev.preventDefault();
      FOB.signOut();
    });

    loadVocabularies()
      .then(function () {
        var resume = state.profile.onboarding_step || 1;
        showStep(Math.min(Math.max(resume, 1), TOTAL));
      })
      .catch(function (err) {
        FOB.setStatus(status, FOB.friendlyError(err), 'error');
        showStep(1);
      });
  });
})();
