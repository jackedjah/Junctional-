/* ============================================================
   FOB COMMUNITY :: POST COLOUR PICKER
   Lets a member choose which surface their posts render on.
   Saves to profiles.card_theme, which the existing
   profiles_update_self RLS policy already permits.
   ============================================================ */
(function () {
  'use strict';

  var FOB = (window.FOB = window.FOB || {});

  document.addEventListener('fob:ready', function (e) {
    var grid = document.getElementById('theme-grid');
    if (!grid) return;

    var profile = e.detail.profile;
    var status = document.getElementById('theme-status');
    var previewHost = document.getElementById('theme-preview');
    var current = profile.card_theme || 'paper';

    function renderPreview(theme) {
      previewHost.innerHTML = '';
      previewHost.appendChild(FOB.discussionCard({
        id: 'preview',
        slug: '',
        title: 'This is how your posts will look',
        body: 'Everyone in the community sees your posts on this colour. ' +
              'Pick whatever is easiest on your eyes.',
        reply_count: 3,
        reaction_count: 12,
        view_count: 41,
        created_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        category_name: 'The Locker Room',
        author: {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_path: profile.avatar_path,
          card_theme: theme
        },
        author_roles: []
      }, { preview: true }));
      // The preview is illustrative only; stop its buttons doing anything.
      previewHost.querySelectorAll('button, a').forEach(function (el) {
        el.setAttribute('tabindex', '-1');
        el.addEventListener('click', function (ev) { ev.preventDefault(); });
      });
    }

    function save(theme) {
      FOB.setStatus(status, 'Saving...', '');
      FOB.supabase.from('profiles')
        .update({ card_theme: theme })
        .eq('id', profile.id)
        .then(function (res) {
          if (res.error) throw res.error;
          current = theme;
          profile.card_theme = theme;
          FOB.setStatus(status, 'Saved.', 'ok');
          window.setTimeout(function () { FOB.setStatus(status, ''); }, 2200);
        })
        .catch(function (err) {
          FOB.setStatus(status, FOB.friendlyError(err), 'error');
        });
    }

    FOB.THEMES.forEach(function (t) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fob-theme-swatch';
      btn.setAttribute('aria-pressed', t.id === current ? 'true' : 'false');
      btn.setAttribute('aria-label', t.name + ' post colour');

      var prev = document.createElement('span');
      prev.className = 'fob-theme-preview';
      prev.style.background = t.bg;
      prev.style.color = t.fg;
      prev.innerHTML = '<i></i><i></i>';

      var name = document.createElement('span');
      name.className = 'fob-theme-name';
      name.textContent = t.name;

      btn.appendChild(prev);
      btn.appendChild(name);

      btn.addEventListener('click', function () {
        grid.querySelectorAll('.fob-theme-swatch').forEach(function (b) {
          b.setAttribute('aria-pressed', 'false');
        });
        btn.setAttribute('aria-pressed', 'true');
        renderPreview(t.id);
        save(t.id);
      });

      grid.appendChild(btn);
    });

    renderPreview(current);
  });
})();
