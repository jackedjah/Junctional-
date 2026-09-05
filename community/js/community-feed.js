/* ============================================================
   FOB COMMUNITY :: FEED
   Discussion list, category filtering, search, and the Current
   Research Question module.
   ============================================================ */
(function () {
  'use strict';

  var FOB = (window.FOB = window.FOB || {});
  var PAGE = 15;

  var state = {
    feedMode: 'latest',
    categoryId: null,
    categoryName: null,
    cursor: null,
    loading: false,
    exhausted: false,
    categories: [],
    followIds: null
  };

  var els = {};

  /* Author profile and roles ride along on every row so the feed
     is one query rather than one per card. */
  var SELECT = [
    'id, slug, title, body, reply_count, reaction_count, repost_count, view_count,',
    'is_pinned, is_locked, is_research, is_current_research, research_label,',
    'created_at, last_activity_at, deleted_at,',
    'author:profiles!discussions_author_id_fkey(id, username, display_name, avatar_path, card_theme, roles:user_roles!user_roles_user_id_fkey(role)),',
    'category:categories!discussions_category_id_fkey(id, name, slug)'
  ].join(' ');

  function shape(row) {
    return {
      id: row.id, slug: row.slug, title: row.title, body: row.body,
      reply_count: row.reply_count, reaction_count: row.reaction_count,
      repost_count: row.repost_count,
      view_count: row.view_count, is_pinned: row.is_pinned,
      is_locked: row.is_locked || false,
      is_research: row.is_research, is_current_research: row.is_current_research,
      research_label: row.research_label,
      created_at: row.created_at, last_activity_at: row.last_activity_at,
      deleted_at: row.deleted_at || null,
      author: row.author || {},
      category_id: row.category ? row.category.id : null,
      category_name: row.category ? row.category.name : '',
      category_slug: row.category ? row.category.slug : ''
    };
  }

  /* ---------- categories ------------------------------------- */
  function loadCategories() {
    return FOB.supabase.from('categories')
      .select('id, slug, name, description, grouping, sort_order')
      .eq('is_archived', false)
      .order('sort_order')
      .then(function (res) {
        if (res.error) throw res.error;
        state.categories = res.data || [];
        renderCategoryFilters();
        renderCategoryPicker();
      });
  }

  /* Categories live in the Explore sheet, not above the feed.
     A 27-item wall between the composer and the first post is the
     single biggest reason posts were invisible on mobile. */
  function renderCategoryFilters() {
    var host = document.getElementById('explore-categories');
    if (!host) return;
    host.innerHTML = '';

    var groups = {
      social: 'Social', fitness: 'Gym & Training', sports: 'Sports',
      fob: 'FOB', general: 'More', science: 'Deep Dives'
    };

    Object.keys(groups).forEach(function (g) {
      var inGroup = state.categories.filter(function (c) { return c.grouping === g; });
      if (!inGroup.length) return;

      var head = document.createElement('p');
      head.className = 'fob-social-cat-group';
      head.textContent = groups[g];
      host.appendChild(head);

      inGroup.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'fob-social-cat';
        b.setAttribute('aria-pressed', state.categoryId === c.id ? 'true' : 'false');
        b.innerHTML = FOB.escapeHtml(c.name) +
          (c.description ? '<small>' + FOB.escapeHtml(c.description) + '</small>' : '');
        b.addEventListener('click', function () {
          selectCategory(state.categoryId === c.id ? null : c.id, c.name);
        });
        host.appendChild(b);
      });
    });
  }

  function renderCategoryPicker() {
    var sel = document.getElementById('composer-category');
    if (!sel) return;
    sel.innerHTML = '<option value="">All groups (no specific room)</option>';

    /* Sixty-three rooms in one flat list means scrolling to find the
       obvious one. The handful of rooms most posts belong in are lifted
       to the top; they still appear in their own group below, because
       removing them there would make the grouping look broken to
       anybody who scrolled looking for them. */
    var COMMON = ['general-fitness',       /* Gym Talk       */
                  'training-questions',    /* Advice Needed  */
                  'field-notes',           /* Progress Pics  */
                  'framework-questions',   /* Ask About FOB  */
                  'daily-check-in',
                  'off-topic'];
    var common = [];
    COMMON.forEach(function (slug) {
      var hit = state.categories.filter(function (c) { return c.slug === slug; })[0];
      if (hit) common.push(hit);
    });
    if (common.length) {
      var og0 = document.createElement('optgroup');
      og0.label = 'Most posts go here';
      common.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.name;
        og0.appendChild(o);
      });
      sel.appendChild(og0);
    }

    var groups = { social: 'Social', casual: 'Casual', fitness: 'Gym & Training', sports: 'Sports', fob: 'FOB', general: 'More', science: 'Deep Dives' };
    Object.keys(groups).forEach(function (g) {
      var inGroup = state.categories.filter(function (c) { return c.grouping === g; });
      if (!inGroup.length) return;
      var og = document.createElement('optgroup');
      og.label = groups[g];
      inGroup.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.name;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  }

  function selectCategory(id, name) {
    state.categoryId = id;
    state.categoryName = name || null;
    state.cursor = null;
    state.exhausted = false;
    els.list.innerHTML = '';
    renderCategoryFilters();

    var chip = document.getElementById('active-filter');
    var label = document.getElementById('active-filter-name');
    if (chip && label) {
      chip.hidden = !id;
      label.textContent = name || '';
    }
    if (FOB.closeExplore) FOB.closeExplore();
    loadPage();
  }
  FOB.selectCategory = selectCategory;

  var ROOM_GROUPS = [
    ['casual',  'Casual'],
    ['social',  'Hanging Out'],
    ['sports',  'Sports'],
    ['fitness', 'Training'],
    ['science', 'Training Science'],
    ['fob',     'FOB']
  ];

  /* Rooms is not a feed. It replaces the post list with the category
     list, and picking one drops you into Latest already filtered to
     that room, which is the same filter the Explore sheet sets. */
  function renderRooms() {
    els.list.innerHTML = '';
    els.more.hidden = true;

    var all = document.createElement('button');
    all.type = 'button';
    all.className = 'fob-room fob-room-all';
    all.innerHTML = '<span>All</span><span class="fob-room-meta">Every discussion</span>';
    all.addEventListener('click', function () {
      activateLatestTab();
      selectCategory(null, null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    els.list.appendChild(all);

    renderThingsToDo();
    renderRecommendedRooms();

    var known = {};
    ROOM_GROUPS.forEach(function (g) { known[g[0]] = true; });
    var buckets = {};
    state.categories.forEach(function (c) {
      var key = known[c.grouping] ? c.grouping : 'social';
      (buckets[key] = buckets[key] || []).push(c);
    });

    ROOM_GROUPS.forEach(function (g) {
      var list = buckets[g[0]];
      if (!list || !list.length) return;
      var head = document.createElement('p');
      head.className = 'fob-rooms-group';
      head.textContent = g[1];
      els.list.appendChild(head);

      list.forEach(function (c) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fob-room';
        var left = document.createElement('span');
        left.textContent = c.name;
        btn.appendChild(left);
        if (c.description) {
          var meta = document.createElement('span');
          meta.className = 'fob-room-meta';
          meta.textContent = 'Enter';
          btn.appendChild(meta);
        }
        btn.addEventListener('click', function () {
          activateLatestTab();
          selectCategory(c.id, c.name);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        els.list.appendChild(btn);
      });
    });
  }

  /* Called after any follow or unfollow. Only the Following tab depends
     on the relationship, so nothing else is disturbed. The list is
     cleared and reloaded rather than patched, which is what guarantees
     no duplicate and no survivor from the previous set. */
  FOB.onFollowChanged = function () {
    state.followIds = null;
    if (state.feedMode !== 'following') return;
    state.cursor = null;
    state.exhausted = false;
    els.list.innerHTML = '';
    loadPage();
  };

  FOB.setFeedMode = function (mode) {
    state.feedMode = mode;
    state.cursor = null;
    state.exhausted = false;
    els.list.innerHTML = '';
    if (mode === 'rooms') { renderRooms(); return; }
    loadPage();
  };

  function activateLatestTab() {
    document.querySelectorAll('.fob-social-tab').forEach(function (tab) {
      tab.setAttribute('aria-selected', tab.getAttribute('data-feed') === 'latest' ? 'true' : 'false');
    });
    state.feedMode = 'latest';
  }

  /* Navigation, not a pitch. Each entry is a real destination, so this
     answers "what is this place for" by being usable rather than by
     explaining it. Anything whose room is missing is dropped instead of
     rendering a dead link. */
  var THINGS_TO_DO = [
    ['Ask a question',         'training-questions'],
    ['Share progress',         'field-notes'],
    ['Find training partners', 'training-partners'],
    ['Discuss equipment',      'gym-fits'],
    ['Join classes',           'coaching-and-sessions'],
    ['Beta test FOB',          'beta-testing']
  ];

  function renderThingsToDo() {
    var bySlug = {};
    state.categories.forEach(function (c) { bySlug[c.slug] = c; });

    var available = THINGS_TO_DO.filter(function (t) { return bySlug[t[1]]; });
    if (!available.length) return;

    var head = document.createElement('p');
    head.className = 'fob-rooms-group';
    head.textContent = 'Popular things to do';
    els.list.appendChild(head);

    var row = document.createElement('div');
    row.className = 'fob-do-row';
    available.forEach(function (t) {
      var c = bySlug[t[1]];
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'fob-do-chip';
      chip.textContent = t[0];
      chip.addEventListener('click', function () {
        activateLatestTab();
        selectCategory(c.id, c.name);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      row.appendChild(chip);
    });
    els.list.appendChild(row);
  }

  function renderRecommendedRooms() {
    if (!FOB.loadRecommendedRooms || !FOB.currentProfile) return;
    FOB.loadRecommendedRooms(FOB.currentProfile.id, state.categories)
      .then(function (rooms) {
        if (!rooms.length || state.feedMode !== 'rooms') return;

        var marker = els.list.querySelector('.fob-room-all');
        var head = document.createElement('p');
        head.className = 'fob-rooms-group';
        head.textContent = 'Recommended';
        marker.insertAdjacentElement('afterend', head);

        rooms.slice().reverse().forEach(function (c) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'fob-room';
          btn.innerHTML = '<span>' + FOB.escapeHtml(c.name) + '</span>' +
            '<span class="fob-room-meta">Recommended</span>';
          btn.addEventListener('click', function () {
            activateLatestTab();
            selectCategory(c.id, c.name);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
          head.insertAdjacentElement('afterend', btn);
        });
      })
      .catch(function () { /* Recommendations never block the room list. */ });
  }

  /* A repost lifts an existing post back to the top of the timeline.
     Only meaningful on a feed that is showing posts, so the Rooms and
     Saved tabs are left alone. */
  FOB.refreshFeedAfterRepost = function () {
    if (state.feedMode === 'rooms' || state.feedMode === 'saved') return;
    /* Keep the tab and the room exactly as they are; a repost is not a
       reason to move somebody. If the post does not belong in the room
       they are looking at, it simply will not come back in the reload. */
    state.cursor = null;
    state.exhausted = false;
    state.loading = false;
    els.list.innerHTML = '';
    return loadPage();
  };

  FOB.refreshFeedAfterPost = function (discussionId) {
    activateLatestTab();
    state.categoryId = null;
    state.categoryName = null;
    state.cursor = null;
    state.exhausted = false;
    state.loading = false;
    els.list.innerHTML = '';
    renderCategoryFilters();

    var chip = document.getElementById('active-filter');
    if (chip) chip.hidden = true;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    return FOB.supabase.from('discussions')
      .select(SELECT)
      .eq('id', discussionId)
      .is('deleted_at', null)
      .single()
      .then(function (res) {
        if (res.error) throw res.error;
        var discussion = shape(res.data);
        /* The card built here bypasses the feed's normal render, so it
           has to load its own attachments. Without this the post went up
           with no photo, and skipDiscussionId then stopped the regular
           fetch from ever redrawing it, so it stayed empty until a full
           reload. */
        return Promise.all([
          hydrateMyState([discussion.id]),
          FOB.media ? FOB.media.forDiscussions([discussion.id]) : Promise.resolve({})
        ]).then(function (out) {
          discussion.media = (out[1] || {})[discussion.id] || [];
          els.list.appendChild(FOB.discussionCard(discussion));
          state.skipDiscussionId = discussion.id;
          loadPage();
        });
      })
      .catch(function () { loadPage(); });
  };

  /* ---------- current research ------------------------------- */
  function loadCurrentResearch() {
    return FOB.supabase.from('discussions')
      .select(SELECT)
      .eq('is_current_research', true)
      .is('deleted_at', null)
      .maybeSingle()
      .then(function (res) {
        if (res.error || !res.data) { els.research.hidden = true; return; }
        var d = shape(res.data);
        els.research.hidden = false;
        els.research.href = '/community/discussion.html?d=' + encodeURIComponent(d.slug);
        els.researchTitle.textContent = d.title;
      })
      .catch(function () { els.research.hidden = true; });
  }

  /* ---------- feed ------------------------------------------- */
  function loadPage() {
    if (state.loading || state.exhausted) return;
    state.loading = true;
    els.more.disabled = true;

    if (!state.cursor) els.list.appendChild(FOB.skeleton(3));

    return idsForMode().then(function (ids) {
      var authorFilter = null;
      if (ids && ids.authors) { authorFilter = ids.authors; ids = null; }

      if ((ids !== null && ids.length === 0) ||
          (authorFilter !== null && authorFilter.length === 0)) {
        finishEmpty();
        return null;
      }

      var q = FOB.supabase.from('discussions')
        .select(SELECT)
        .is('deleted_at', null)
        .eq('visibility', 'members')
        .order('last_activity_at', { ascending: false })
        .limit(PAGE);

      if (ids !== null) q = q.in('id', ids);
      if (authorFilter !== null) q = q.in('author_id', authorFilter);
      if (state.categoryId) q = q.eq('category_id', state.categoryId);
      if (state.skipDiscussionId) q = q.neq('id', state.skipDiscussionId);
      if (state.cursor) q = q.lt('last_activity_at', state.cursor);
      return q;
    }).then(function (res) {
      if (!res) return;
      if (res.error) throw res.error;
      clearSkeletons();

      var rows = (res.data || []).map(shape);

      /* Reposts re-enter the timeline as their own entry, dated by when
         they were reposted rather than when the original was written, so
         a repost lifts a post back up the feed the way a new post would.
         Only fetched on the first page: paging further back is by the
         original post's activity, and mixing two clocks mid-scroll would
         make the order look random. */
      /* state.followIds was set by idsForMode() moments ago in this same
         chain, so it is this request's data rather than a previous
         session's. Any feed other than Following is unfiltered. */
      var allowedActors = (state.feedMode === 'following')
        ? (state.followIds || [])
        : null;

      var repostsReady = (state.cursor || state.feedMode === 'saved')
        ? Promise.resolve([])
        : loadReposts(allowedActors, state.categoryId);

      return repostsReady.then(function (reposts) {
        var merged = rows.map(function (d) {
          return { at: d.last_activity_at, d: d, repost: null };
        }).concat(reposts);

        merged.sort(function (a, b) {
          return (a.at < b.at) ? 1 : (a.at > b.at ? -1 : 0);
        });

        if (!merged.length) {
          if (!state.cursor && !state.skipDiscussionId) {
            els.list.appendChild(emptyForMode());
          }
          return null;
        }

        var ids = merged.map(function (e) { return e.d.id; });
        /* One media query for the page rather than one per card, and
           resolved before anything is drawn so images can reserve their
           aspect ratio instead of shifting the feed as they land. */
        return Promise.all([
          hydrateMyState(ids),
          FOB.media ? FOB.media.forDiscussions(ids) : Promise.resolve({})
        ]).then(function (out) {
          var byPost = out[1] || {};
          var failed = 0;
          merged.forEach(function (e) {
            try {
              e.d.media = byPost[e.d.id] || [];
              els.list.appendChild(e.repost ? repostEntry(e) : FOB.discussionCard(e.d));
            } catch (err) {
              /* One malformed row must not empty the feed. Skip it, keep
                 the rest, and say so rather than showing a blank page. */
              failed += 1;
              if (window.console && console.error) {
                console.error('Could not render post', e.d && e.d.id, err);
              }
            }
          });
          if (failed && !els.list.children.length) {
            els.list.appendChild(FOB.emptyState(
              'Could not load the feed',
              'Something is wrong with this page of posts. Reload to try again.'));
          }
        });
      });

      if (rows.length) state.cursor = rows[rows.length - 1].last_activity_at;
      if (rows.length < PAGE) state.exhausted = true;
      els.more.hidden = state.exhausted;
    }).catch(function (err) {
      clearSkeletons();
      FOB.toast(FOB.friendlyError(err), 'error');
    }).finally(function () {
      state.skipDiscussionId = null;
      state.loading = false;
      els.more.disabled = false;
    });
  }

  /* A repost carries the whole original post plus who lifted it and
     anything they said about it. */
  function loadReposts(allowedActors, categoryId) {
    var q = FOB.supabase.from('discussion_reposts')
      .select('created_at, comment,' +
              'actor:profiles!discussion_reposts_user_id_fkey(id, username, display_name, avatar_path),' +
              'discussion:discussions!discussion_reposts_discussion_id_fkey(' + SELECT + ')')
      .order('created_at', { ascending: false })
      .limit(15);

    return q.then(function (res) {
      if (res.error) throw res.error;
      return (res.data || [])
        .filter(function (r) { return r.discussion && r.actor; })
        .filter(function (r) {
          /* The feed filters deleted posts; this path did not. The
             select policy deliberately still shows an author their own
             deleted posts, so deleting one you had reposted handed it
             straight back through here and looked like the delete had
             failed. */
          return !r.discussion.deleted_at;
        })
        .filter(function (r) {
          /* In Following, a repost qualifies on who REPOSTED it, not who
             wrote the original. allowedActors is null only for feeds that
             are not filtered by relationship; in Following it is always an
             array, so an empty one correctly admits nothing. */
          if (!allowedActors) return true;
          return allowedActors.indexOf(r.actor.id) !== -1;
        })
        .filter(function (r) {
          /* A room filter applies to everything in the room, reposts
             included. Without this a repost from any room appeared while
             a different room was selected. */
          if (!categoryId) return true;
          return r.discussion.category && r.discussion.category.id === categoryId;
        })
        .map(function (r) {
          return { at: r.created_at, d: shape(r.discussion), repost: r };
        });
    }).catch(function () { return []; });
  }

  function repostEntry(entry) {
    var wrap = document.createElement('div');

    var head = document.createElement('div');
    head.className = 'fob-repost-head';
    head.innerHTML = ICON_REPOST;
    var who = document.createElement('span');
    var actor = entry.repost.actor;
    var mine = actor.id === FOB.currentProfile.id;
    who.textContent = (mine ? 'You' : (actor.display_name || actor.username)) + ' reposted';
    head.appendChild(who);
    if (actor.username) FOB.markProfileTarget(who, actor.username);
    wrap.appendChild(head);

    if (entry.repost.comment) {
      var note = document.createElement('p');
      note.className = 'fob-repost-note';
      note.textContent = entry.repost.comment;
      wrap.appendChild(note);
    }

    wrap.appendChild(FOB.discussionCard(entry.d));
    return wrap;
  }

  var ICON_REPOST = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M17 2.5 21 6.5 17 10.5"/><path d="M21 6.5H7a3 3 0 0 0-3 3v1.5"/>' +
    '<path d="M7 21.5 3 17.5 7 13.5"/><path d="M3 17.5h14a3 3 0 0 0 3-3V13"/></svg>';

  function clearSkeletons() {
    els.list.querySelectorAll('.fob-community-skeleton').forEach(function (n) { n.remove(); });
  }

  function finishEmpty() {
    clearSkeletons();
    els.list.appendChild(emptyForMode());
    state.exhausted = true;
    els.more.hidden = true;
    state.loading = false;
    els.more.disabled = false;
  }

  /* null means "no id filter", i.e. the whole feed. */
  function idsForMode() {
    var uid = FOB.currentProfile.id;

    if (state.feedMode === 'following') {
      // posts written by people this member follows
      return FOB.supabase.from('user_follows')
        .select('followee_id').eq('follower_id', uid)
        .then(function (r) {
          if (r.error) throw r.error;
          state.followIds = (r.data || []).map(function (x) { return x.followee_id; });
          return { authors: state.followIds };
        });
    }
    if (state.feedMode === 'saved') {
      return FOB.supabase.from('saved_discussions')
        .select('discussion_id').eq('user_id', uid)
        .then(function (r) {
          if (r.error) throw r.error;
          return (r.data || []).map(function (x) { return x.discussion_id; });
        });
    }
    return Promise.resolve(null);
  }

  /* An empty room should say what belongs in it. Specific slugs get
     specific wording; everything else falls back to its grouping, so a
     room added later still reads as an invitation rather than a dead
     end. Nothing here needs a schema change. */
  var ROOM_INVITE = {
    'movies-tv':           'What you are watching, what is worth it, what is not.',
    'gaming':              'What you are playing and what you are waiting on.',
    'music':               'What is on repeat right now.',
    'off-topic':           'Anything that does not fit anywhere else.',
    'memes':               'Post the thing you keep rewatching.',
    'sports-talk':         'Games, takes, arguments. Go.',
    'gym-fits':            'Show your setup, ask about gear, or review equipment.',
    'prototype-feedback':  'Show your setup, ask about gear, or review equipment.',
    'beta-testing':        'Tried something unreleased? Say what worked and what did not.',
    'mobility-recovery':   'Discuss soreness, recovery, injuries, and what worked.',
    'general-fitness':     'Share today\'s workout or ask for advice.',
    'strength-and-muscle': 'Share today\'s workout or ask for advice.',
    'conditioning':        'Share today\'s workout or ask for advice.',
    'training-questions':  'Ask anything. Somebody here has hit the same wall.',
    'framework-questions': 'Ask anything about FOB. No question is too basic.',
    'form-checks':         'Post a clip and ask what to fix.',
    'field-notes':         'Post where you started and where you are now.',
    'personal-records':    'Post the number and how you got there.',
    'movement-analysis':   'Break down a movement or ask what you are seeing.',
    'training-partners':   'Say where you train and when. Somebody is looking too.',
    'coaching-and-sessions': 'Ask about classes, sessions, or coaching.',
    'founder-updates':     'Nothing posted yet. Updates on what is being built land here.',
    'introduce-yourself':  'Say who you are and what you are working on.',
    'nutrition':           'Share what you are eating or ask what works.'
  };
  var GROUP_INVITE = {
    fitness: 'Share today\'s session or ask for advice.',
    science: 'Post what you have read, tested, or noticed.',
    sports:  'Talk about your sport, your games, your training for it.',
    fob:     'Ask, share what you have tried, or say what you would change.',
    social:  'Start a conversation. Somebody will pick it up.',
    casual:  'Nothing here yet. Post what you are into and see who bites.'
  };

  function roomInvite(categoryId) {
    var cat = null;
    for (var i = 0; i < state.categories.length; i++) {
      if (state.categories[i].id === categoryId) { cat = state.categories[i]; break; }
    }
    if (!cat) return 'Start it off.';
    return ROOM_INVITE[cat.slug]
        || GROUP_INVITE[cat.grouping]
        || 'Start it off.';
  }

  function emptyForMode() {
    if (state.feedMode === 'following') {
      return FOB.followEmptyState();
    }
    if (state.feedMode === 'saved') {
      return FOB.emptyState('Nothing saved yet',
        'Save a post to come back to it later.');
    }
    if (state.categoryId) {
      return FOB.emptyState('No discussions yet', roomInvite(state.categoryId));
    }
    return FOB.emptyState('Quiet in here',
      'Ask a question, share a session, or show what you are working on.');
  }

  /* Fetch my likes, saves, reposts and follows for the posts about to
     render, so a button never comes back unpressed after a reload.

     Follows used to be loaded only by the follow strip, which runs in
     parallel with the feed. Whichever finished first decided whether
     the menu said Follow or Unfollow, so a real follow could look
     undone after signing back in. Loading it here, awaited before the
     cards render, makes it deterministic. Follows are fetched whole
     rather than filtered by the visible authors, because the same map
     is read by the strip and by every card rendered later. */
  function hydrateMyState(ids) {
    if (!ids.length) return Promise.resolve();
    var uid = FOB.currentProfile.id;
    return Promise.all([
      FOB.supabase.from('discussion_reactions')
        .select('discussion_id, kind').eq('user_id', uid).in('discussion_id', ids),
      FOB.supabase.from('saved_discussions')
        .select('discussion_id').eq('user_id', uid).in('discussion_id', ids),
      FOB.supabase.from('user_follows')
        .select('followee_id').eq('follower_id', uid),
      FOB.supabase.from('discussion_reposts')
        .select('discussion_id').eq('user_id', uid).in('discussion_id', ids)
    ]).then(function (res) {
      ((res[0] && res[0].data) || []).forEach(function (r) {
        FOB.myReaction[r.discussion_id] = r.kind;
        FOB.myLikes[r.discussion_id] = true;
      });
      ((res[1] && res[1].data) || []).forEach(function (r) { FOB.mySaves[r.discussion_id] = true; });
      ((res[2] && res[2].data) || []).forEach(function (r) { FOB.myFollows[r.followee_id] = true; });
      ((res[3] && res[3].data) || []).forEach(function (r) { FOB.myReposts[r.discussion_id] = true; });
    }).catch(function () { /* buttons simply render unpressed */ });
  }

  /* ---------- search ----------------------------------------- */
  var runSearch = FOB.debounce(function (term) {
    if (!term || term.trim().length < 2) {
      els.searchResults.hidden = true;
      els.searchResults.innerHTML = '';
      return;
    }

    Promise.all([
      FOB.supabase.rpc('search_discussions', { q: term, max_rows: 8 }),
      FOB.supabase.rpc('search_members', { q: term, max_rows: 5 })
    ]).then(function (res) {
      els.searchResults.hidden = false;
      els.searchResults.innerHTML = '';

      var discussions = (res[0] && res[0].data) || [];
      var members = (res[1] && res[1].data) || [];

      if (!discussions.length && !members.length) {
        els.searchResults.appendChild(
          FOB.emptyState('No matches', 'Nothing found for that search.')
        );
        return;
      }

      if (members.length) {
        els.searchResults.appendChild(groupHeading('Members'));
        members.forEach(function (m) {
          var row = document.createElement('a');
          row.className = 'fob-community-search-row';
          row.href = '/community/discussion.html?d=';   // profiles land in Phase C
          row.removeAttribute('href');
          row.appendChild(FOB.avatarEl(m, 30));
          var t = document.createElement('div');
          t.innerHTML = '<b>' + FOB.escapeHtml(m.display_name) + '</b>' +
                        '<span>@' + FOB.escapeHtml(m.username) + '</span>';
          row.appendChild(t);
          els.searchResults.appendChild(row);
        });
      }

      if (discussions.length) {
        els.searchResults.appendChild(groupHeading('Discussions'));
        discussions.forEach(function (d) {
          var row = document.createElement('a');
          row.className = 'fob-community-search-row';
          row.href = '/community/discussion.html?d=' + encodeURIComponent(d.slug);
          var t = document.createElement('div');
          t.innerHTML = '<b>' + FOB.escapeHtml(d.title) + '</b>' +
                        '<span>' + FOB.escapeHtml(d.category_name) + '</span>';
          row.appendChild(t);
          els.searchResults.appendChild(row);
        });
      }
    }).catch(function (err) {
      FOB.toast(FOB.friendlyError(err), 'error');
    });
  }, 320);

  function groupHeading(text) {
    var h = document.createElement('p');
    h.className = 'fob-community-search-group';
    h.textContent = text;
    return h;
  }

  /* ---------- boot ------------------------------------------- */
  document.addEventListener('fob:ready', function () {
    els.list = document.getElementById('feed-list');
    els.filters = document.getElementById('feed-filters');
    els.more = document.getElementById('feed-more');
    els.research = document.getElementById('research-module');
    els.researchTitle = document.getElementById('research-title');
    els.researchExcerpt = document.getElementById('research-excerpt');
    els.researchMeta = document.getElementById('research-meta');
    els.search = document.getElementById('feed-search');
    els.searchResults = document.getElementById('search-results');

    if (!els.list) return;

    els.more.addEventListener('click', loadPage);
    if (els.search) {
      els.search.addEventListener('input', function () { runSearch(els.search.value); });
    }

    /* Straight after onboarding, open Rooms rather than Latest, so the
       first thing a new member sees is where things happen with their
       own interests already reflected. Checked once at boot; every
       later visit behaves normally. */
    /* The forum opens on Rooms. Landing straight in a firehose of Latest
       says nothing about where anything lives; the room list does. Any
       tab tapped afterwards behaves exactly as before. */
    var roomsTab = document.querySelector('.fob-social-tab[data-feed="rooms"]');
    if (roomsTab) {
      state.feedMode = 'rooms';
      Array.prototype.forEach.call(
        document.querySelectorAll('.fob-social-tab'),
        function (t) {
          t.setAttribute('aria-selected', t === roomsTab ? 'true' : 'false');
        });
    }

    loadCategories()
      .then(loadCurrentResearch)
      .then(function () {
        if (state.feedMode === 'rooms') { renderRooms(); return null; }
        return loadPage();
      })
      .catch(function (err) { FOB.toast(FOB.friendlyError(err), 'error'); });
  });
})();
