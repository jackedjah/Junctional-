/* ============================================================
   FOB COMMUNITY :: FOLLOW STRIP
   The row of people you follow, shown above the Following feed.
   ============================================================ */
(function () {
  'use strict';

  var FOB = (window.FOB = window.FOB || {});

  /* Empty state used when the Following feed has nobody in it. */
  FOB.followEmptyState = function () {
    var wrap = document.createElement('div');
    wrap.className = 'fob-follow-empty';

    var ghosts = document.createElement('div');
    ghosts.className = 'fob-follow-ghosts';
    for (var i = 0; i < 3; i++) {
      var g = document.createElement('span');
      g.className = 'fob-follow-ghost';
      g.setAttribute('aria-hidden', 'true');
      g.innerHTML = FOB.SILHOUETTE;
      ghosts.appendChild(g);
    }

    var h = document.createElement('h3');
    h.textContent = 'You are not following anyone yet';

    var p = document.createElement('p');
    p.textContent = 'Follow people and their posts show up here. ' +
      'Tap anyone\'s name to see their profile and follow them.';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fob-community-btn fob-community-btn-ghost fob-community-btn-auto';
    btn.textContent = 'Browse the Latest feed';
    btn.addEventListener('click', function () {
      var tab = document.querySelector('.fob-social-tab[data-feed="latest"]');
      if (tab) tab.click();
    });

    wrap.appendChild(ghosts);
    wrap.appendChild(h);
    wrap.appendChild(p);
    wrap.appendChild(btn);
    return wrap;
  };

  /* ---------- the strip ------------------------------------- */
  function render(people) {
    var strip = document.getElementById('follow-strip');
    if (!strip) return;

    strip.innerHTML = '';
    if (!people.length) { strip.hidden = true; return; }
    strip.hidden = false;

    var head = document.createElement('div');
    head.className = 'fob-follow-strip-head';
    head.textContent = people.length === 1
      ? 'Following 1 person'
      : 'Following ' + people.length + ' people';
    strip.appendChild(head);

    var row = document.createElement('div');
    row.className = 'fob-follow-row';

    people.forEach(function (p) {
      var cell = document.createElement('div');
      cell.className = 'fob-follow-cell';

      var av = FOB.avatarNode(p, 'fob-follow-avatar');
      cell.appendChild(av);

      var name = document.createElement('span');
      name.className = 'fob-follow-name';
      name.textContent = p.display_name || p.username;
      cell.appendChild(name);

      var un = document.createElement('button');
      un.type = 'button';
      un.className = 'fob-follow-remove';
      un.setAttribute('aria-label', 'Unfollow ' + (p.display_name || p.username));
      un.textContent = '\u00D7';
      un.addEventListener('click', function () {
        if (!window.confirm('Unfollow ' + (p.display_name || p.username) + '?')) return;
        FOB.toggleFollow(p, null).then(function () {
          if (FOB.setFeedMode) FOB.setFeedMode('following');
        });
      });
      cell.appendChild(un);

      row.appendChild(cell);
    });

    strip.appendChild(row);

    var note = document.createElement('p');
    note.className = 'fob-follow-note';
    note.textContent = 'Tap \u00D7 to unfollow. Private messages are coming next.';
    strip.appendChild(note);
  }

  FOB.refreshFollowStrip = function () {
    var strip = document.getElementById('follow-strip');
    if (!strip) return Promise.resolve();

    return FOB.supabase.from('user_follows')
      .select('followee_id, followee:profiles!user_follows_followee_id_fkey(id, username, display_name, avatar_path)')
      .eq('follower_id', FOB.currentProfile.id)
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        var people = (res.data || [])
          .map(function (r) { return r.followee; })
          .filter(Boolean);
        /* This response is the complete, current set, so rebuild the map
           from it rather than merging into it. Merging only ever added
           ids, which meant a relationship ended in another tab or on
           another device stayed marked as followed here. */
        var fresh = {};
        people.forEach(function (p) { fresh[p.id] = true; });
        FOB.myFollows = fresh;
        render(people);
      })
      .catch(function () { strip.hidden = true; });
  };

  document.addEventListener('fob:ready', function () {
    if (!document.getElementById('follow-strip')) return;
    FOB.refreshFollowStrip();

    document.querySelectorAll('.fob-social-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var strip = document.getElementById('follow-strip');
        if (!strip) return;
        if (tab.getAttribute('data-feed') === 'following') {
          FOB.refreshFollowStrip();
        } else {
          strip.hidden = true;
        }
      });
    });
  });
})();
