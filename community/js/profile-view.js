/* ---------------------------------------------------------------
   PROFILE SHEET

   Tapping a member's name or avatar anywhere opens a read-only
   sheet with whatever that member has chosen to show. The privacy
   decisions are not made here: public.view_profile() returns NULL
   for any field the viewer is not allowed to see, so this file
   renders what it is handed and never asks the profiles table
   directly. One delegated listener covers cards that do not exist
   yet, which matters because the feed pages in more as you scroll.
   --------------------------------------------------------------- */
(function () {
  var els = null;

  /* Called by the card renderers. Keeps the markup contract in one
     place so a future card type only has to call this. */
  window.FOB.markProfileTarget = function (node, username) {
    node.setAttribute('data-profile', username);
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.style.cursor = 'pointer';
  };

  function build() {
    if (els) return els;

    var backdrop = document.createElement('div');
    backdrop.className = 'fob-pv-backdrop';
    backdrop.hidden = true;
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Member profile');

    var card = document.createElement('div');
    card.className = 'fob-pv-card';
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop) close();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !backdrop.hidden) close();
    });

    els = { backdrop: backdrop, card: card };
    return els;
  }

  function close() {
    if (els) els.backdrop.hidden = true;
    window.FOB.unlockScroll();
  }

  function open(username) {
    var e = build();
    e.card.innerHTML = '<p class="fob-pv-empty">Loading...</p>';
    e.backdrop.hidden = false;
    window.FOB.lockScroll();

    loadProfile(username)
      .then(function (res) {
        var p = res;
        if (!p) {
          e.card.innerHTML = '<p class="fob-pv-empty">That profile is not available.</p>';
          return;
        }
        render(e.card, p);
      })
      .catch(function () {
        e.card.innerHTML = '<p class="fob-pv-empty">Could not load that profile.</p>';
      });
  }

  function loadProfile(username) {
    return window.FOB.supabase
      .rpc('view_profile', { target_username: username })
      .then(function (res) {
        var profile = !res.error && res.data && res.data[0];
        if (profile) return profile;
        return loadProfileFallback(username);
      });
  }

  function loadProfileFallback(username) {
    return window.FOB.supabase.from('profiles')
      .select('id, username, display_name, avatar_path, bio, pronouns, experience_level, fob_experience, website_url, member_since')
      .eq('username', String(username || '').trim().toLowerCase())
      .is('deleted_at', null)
      .maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        if (!res.data) return null;
        res.data.roles = [];
        res.data.is_self = !!(window.FOB.currentProfile && window.FOB.currentProfile.id === res.data.id);
        return res.data;
      });
  }

  function render(card, p) {
    card.innerHTML = '';

    var top = document.createElement('div');
    top.className = 'fob-pv-top';

    var url = window.FOB.avatarUrl(p.avatar_path);
    var pic;
    if (url) {
      pic = document.createElement('img');
      pic.className = 'fob-profile-avatar';
      pic.src = url; pic.alt = '';
    } else {
      pic = document.createElement('div');
      pic.className = 'fob-profile-avatar-fallback';
      pic.setAttribute('aria-hidden', 'true');
      pic.textContent = window.FOB.initialsFor(p.display_name, p.username);
    }
    top.appendChild(pic);

    var who = document.createElement('div');
    var name = document.createElement('div');
    name.className = 'fob-pv-name';
    name.textContent = p.display_name || 'Member';
    var handle = document.createElement('div');
    handle.className = 'fob-pv-handle';
    handle.textContent = '@' + p.username;
    who.appendChild(name);
    who.appendChild(handle);
    top.appendChild(who);
    card.appendChild(top);

    addBlock(card, 'About', p.bio || 'N/A');

    /* Only render values returned by the privacy-aware profile call.
       N/A covers both unfilled and unavailable optional fields without
       exposing which privacy choice produced an empty value. */
    var LEVELS = {
      beginner: 'Beginner', intermediate: 'Intermediate',
      advanced: 'Advanced', professional: 'Professional'
    };
    var facts = [
      p.pronouns,
      p.current_city,
      p.hometown ? 'From ' + p.hometown : null,
      p.age_years ? p.age_years + ' years old' : null,
      p.experience_level ? LEVELS[p.experience_level] || p.experience_level : null,
      p.member_since ? 'Member since ' + new Date(p.member_since).getFullYear() : null
    ].filter(Boolean);

    var factsRow = document.createElement('div');
    factsRow.className = 'fob-pv-facts';
    (facts.length ? facts : ['N/A']).forEach(function (f) {
      var tag = document.createElement('span');
      tag.className = 'fob-pv-fact';
      tag.textContent = f;
      factsRow.appendChild(tag);
    });
    card.appendChild(factsRow);

    var stats = document.createElement('div');
    stats.className = 'fob-pv-stats';
    stats.innerHTML = '<span class="fob-pv-stat">&nbsp;</span>';
    card.appendChild(stats);
    loadStats(p.username, stats);

    var rooms = document.createElement('div');
    rooms.className = 'fob-pv-rooms';
    card.appendChild(rooms);
    loadRooms(p.id, rooms);

    var recent = document.createElement('div');
    recent.className = 'fob-pv-recent';
    card.appendChild(recent);
    loadRecent(p.id, recent);

    addBlock(card, 'Working toward', p.training_goals || 'N/A');
    addBlock(card, 'Experience with FOB', p.fob_experience || 'N/A');

    if (p.website_url) {
      var link = document.createElement('a');
      link.className = 'fob-pv-bio';
      link.href = p.website_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = p.website_url;
      card.appendChild(link);
    } else addBlock(card, 'Website', 'N/A');

    var row = document.createElement('div');
    row.className = 'fob-community-btn-row';
    row.style.marginTop = '18px';

    /* No follow control on your own profile: there is nothing to
       follow, and offering it would only produce an error. */
    if (!p.is_self) {
      var following = !!window.FOB.myFollows[p.id];
      var follow = document.createElement('button');
      follow.type = 'button';
      follow.className = 'fob-community-btn ' +
        (following ? 'fob-community-btn-ghost' : 'fob-community-btn-primary');
      follow.textContent = following ? 'Following' : 'Follow';
      follow.addEventListener('click', function () {
        follow.disabled = true;
        window.FOB.toggleFollow({
          id: p.id, username: p.username,
          display_name: p.display_name || p.username
        }, null)
          .then(function () {
            var now = !!window.FOB.myFollows[p.id];
            follow.textContent = now ? 'Following' : 'Follow';
            follow.className = 'fob-community-btn ' +
              (now ? 'fob-community-btn-ghost' : 'fob-community-btn-primary');
            if (window.FOB.refreshFollowStrip) window.FOB.refreshFollowStrip();
            /* Re-read rather than adjusting the number locally: the count
               is the source of truth and a failed write must not leave a
               figure on screen that the database disagrees with. */
            var stats = card.querySelector('.fob-pv-stats');
            if (stats) loadStats(p.username, stats);
          })
          .finally(function () { follow.disabled = false; });
      });
      row.appendChild(follow);
    }

    var done = document.createElement('button');
    done.type = 'button';
    done.className = 'fob-community-btn fob-community-btn-ghost';
    done.textContent = 'Close';
    done.addEventListener('click', close);
    row.appendChild(done);
    card.appendChild(row);
  }

  function statEl(n, label) {
    var s = document.createElement('div');
    s.className = 'fob-pv-stat';
    s.innerHTML = '<b>' + n + '</b><span>' + label + '</span>';
    return s;
  }

  function loadStats(username, host) {
    window.FOB.supabase.rpc('profile_stats', { target_username: username })
      .then(function (res) {
        if (res.error) throw res.error;
        var s = (res.data && res.data[0]) || null;
        if (!s) { host.remove(); return; }
        host.innerHTML = '';
        host.appendChild(statEl(s.posts, s.posts === 1 ? 'post' : 'posts'));
        host.appendChild(statEl(s.replies, s.replies === 1 ? 'comment' : 'comments'));
        host.appendChild(statEl(s.reposts, s.reposts === 1 ? 'repost' : 'reposts'));
        host.appendChild(statEl(s.followers, s.followers === 1 ? 'follower' : 'followers'));
        host.appendChild(statEl(s.following, 'following'));
      })
      .catch(function () { host.remove(); });
  }

  /* Which rooms this member actually posts in. Participation says more
     about someone here than a bio does, and it is derived from their
     posts rather than anything they had to fill in. */
  function loadRooms(userId, host) {
    window.FOB.supabase.from('discussions')
      .select('category:categories!discussions_category_id_fkey(name)')
      .eq('author_id', userId)
      .is('deleted_at', null)
      .eq('visibility', 'members')
      .limit(60)
      .then(function (res) {
        if (res.error) throw res.error;
        var counts = {};
        (res.data || []).forEach(function (r) {
          if (r.category && r.category.name) {
            counts[r.category.name] = (counts[r.category.name] || 0) + 1;
          }
        });
        var names = Object.keys(counts).sort(function (a, b) {
          return counts[b] - counts[a];
        }).slice(0, 5);
        if (!names.length) { host.remove(); return; }

        var head = document.createElement('span');
        head.className = 'fob-pv-room';
        head.textContent = 'Active in';
        head.style.borderColor = 'transparent';
        host.appendChild(head);

        names.forEach(function (n) {
          var tag = document.createElement('span');
          tag.className = 'fob-pv-room';
          tag.textContent = n;
          host.appendChild(tag);
        });
      })
      .catch(function () { host.remove(); });
  }

  /* Their five most recent posts, each opening the thread. Deleted rows
     are excluded by the same filter the feed uses. */
  function loadRecent(userId, host) {
    window.FOB.supabase.from('discussions')
      .select('slug, title, created_at')
      .eq('author_id', userId)
      .is('deleted_at', null)
      .eq('visibility', 'members')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(function (res) {
        if (res.error) throw res.error;
        var list = res.data || [];
        if (!list.length) { host.remove(); return; }
        var head = document.createElement('p');
        head.className = 'fob-chip-group';
        head.textContent = 'Recent posts';
        host.appendChild(head);
        list.forEach(function (d) {
          var a = document.createElement('a');
          a.className = 'fob-pv-post';
          a.href = '/community/discussion.html?d=' + encodeURIComponent(d.slug);
          a.textContent = d.title;
          host.appendChild(a);
        });
      })
      .catch(function () { host.remove(); });
  }

  function addBlock(card, label, text) {
    var head = document.createElement('p');
    head.className = 'fob-chip-group';
    head.textContent = label;
    var body = document.createElement('p');
    body.className = 'fob-pv-bio';
    body.textContent = text;
    card.appendChild(head);
    card.appendChild(body);
  }

  function targetFrom(ev) {
    var node = ev.target.closest && ev.target.closest('[data-profile]');
    return node ? node.getAttribute('data-profile') : null;
  }

  document.addEventListener('click', function (ev) {
    var username = targetFrom(ev);
    if (!username) return;
    ev.preventDefault();
    open(username);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var username = targetFrom(ev);
    if (!username) return;
    ev.preventDefault();
    open(username);
  });

  window.FOB.openProfile = open;
})();
