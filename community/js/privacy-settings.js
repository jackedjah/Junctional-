/* ---------------------------------------------------------------
   PRIVACY SETTINGS

   The privacy_settings table already governed what the profile sheet
   would show, but nothing could change it, so whatever was picked at
   onboarding was permanent. This is the missing screen.

   Two honest notes carried into the labels:

   1. The "Friends only" tier exists in the database but friendship
      itself is not built yet, so view_profile() resolves the friend
      test to false. Choosing it therefore behaves exactly like
      "Only me" today. That fails closed, which is the safe way round,
      but a member picking it deserves to know rather than assume
      their friends can see something they cannot.

   2. Direct messages are not built either, so the messaging control
      is stored and honoured the moment they are, but changes nothing
      right now.

   A row may not exist yet, so every save is an upsert on user_id.
   --------------------------------------------------------------- */
(function () {
  var VISIBILITY = [
    ['members',  'All members'],
    ['friends',  'Friends only (acts as private for now)'],
    ['only_me',  'Only me']
  ];
  var REQUEST = [
    ['everyone',           'Anyone'],
    ['friends_of_friends', 'Friends of friends'],
    ['nobody',             'Nobody']
  ];
  var MESSAGE = [
    ['friends',                'Friends'],
    ['friends_and_moderators', 'Friends and moderators'],
    ['moderators_only',        'Moderators only']
  ];

  /* Field, label, option set. Order is what reads best on the page,
     not the column order in the table. */
  var FIELDS = [
    ['show_current_city',      'Where you are now',        VISIBILITY],
    ['show_hometown',          'Where you are from',       VISIBILITY],
    ['show_age',               'Your age',                 VISIBILITY],
    ['show_training_goals',    'What you are working toward', VISIBILITY],
    ['show_sports',            'Your sports',              VISIBILITY],
    ['show_recent_activity',   'Your recent posts',        VISIBILITY],
    ['show_friends_list',      'Who you follow',           VISIBILITY],
    ['who_can_friend_request', 'Who can send you a request', REQUEST],
    ['who_can_mention',        'Who can mention you',      REQUEST],
    ['who_can_message',        'Who can message you',      MESSAGE]
  ];

  var els = {};
  var userId = null;

  document.addEventListener('fob:ready', function (e) {
    var host = document.getElementById('privacy-fields');
    if (!host || !e.detail || !e.detail.profile) return;
    userId = e.detail.profile.id;

    build(host);
    load();

    document.getElementById('privacy-save')
      .addEventListener('click', save);
  });

  function build(host) {
    host.innerHTML = '';

    FIELDS.forEach(function (f) {
      var wrap = document.createElement('div');
      wrap.className = 'fob-community-field';

      var label = document.createElement('label');
      label.setAttribute('for', 'pv-' + f[0]);
      label.textContent = f[1];
      wrap.appendChild(label);

      var sel = document.createElement('select');
      sel.className = 'fob-community-select';
      sel.id = 'pv-' + f[0];
      f[2].forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt[0];
        o.textContent = opt[1];
        sel.appendChild(o);
      });
      wrap.appendChild(sel);
      host.appendChild(wrap);

      els[f[0]] = sel;
    });

    /* The only boolean in the set, so it gets a checkbox rather than a
       two-option dropdown pretending to be one. */
    var row = document.createElement('label');
    row.className = 'fob-community-check';
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.id = 'pv-show_activity_status';
    var text = document.createElement('span');
    text.textContent = 'Show when you were last active';
    row.appendChild(box);
    row.appendChild(text);
    host.appendChild(row);
    els.show_activity_status = box;
  }

  function load() {
    window.FOB.supabase.from('privacy_settings')
      .select('*').eq('user_id', userId).maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        var row = res.data;
        if (!row) return;   /* defaults already selected */
        FIELDS.forEach(function (f) {
          if (row[f[0]] && els[f[0]]) els[f[0]].value = row[f[0]];
        });
        if (els.show_activity_status) {
          els.show_activity_status.checked = !!row.show_activity_status;
        }
      })
      .catch(function () {
        window.FOB.setStatus(
          document.getElementById('privacy-status'),
          'Could not load your current settings.', 'error');
      });
  }

  function save() {
    var btn = document.getElementById('privacy-save');
    var status = document.getElementById('privacy-status');

    var patch = { user_id: userId };
    FIELDS.forEach(function (f) {
      if (els[f[0]]) patch[f[0]] = els[f[0]].value;
    });
    if (els.show_activity_status) {
      patch.show_activity_status = els.show_activity_status.checked;
    }

    btn.disabled = true;
    window.FOB.setStatus(status, 'Saving...', '');

    window.FOB.supabase.from('privacy_settings')
      .upsert(patch, { onConflict: 'user_id' })
      .then(function (res) {
        if (res.error) throw res.error;
        window.FOB.setStatus(status, 'Privacy settings saved.', 'ok');
      })
      .catch(function (err) {
        window.FOB.setStatus(status, window.FOB.friendlyError(err), 'error');
      })
      .finally(function () { btn.disabled = false; });
  }
})();
