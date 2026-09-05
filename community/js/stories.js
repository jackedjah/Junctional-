/* ---------------------------------------------------------------
   STORIES

   Ephemeral posts that expire after an hour. Three parts:

     rail    a row of avatars above the feed
     viewer  full screen, tap to advance, timed progress bars
     poster  photo / video / GIF / text, or somebody else's post

   Expiry is the database's job, not this file's: the select policy
   hides anything past its hour, so a story cannot linger because a
   tab was left open or a clock was wrong.

   The viewer takes over the screen, so it uses the shared scroll lock
   and its own layer above everything. It never touches the feed's
   markup, which is what keeps it from disturbing the page underneath.
   --------------------------------------------------------------- */
(function () {
  var FOB = window.FOB;
  var SLIDE_MS = 5000;      /* photos and shared posts */
  var groups = [];          /* [{ author, stories: [] }] */
  var viewer = null;
  var poster = null;

  /* ---------- data ------------------------------------------- */

  var seen = {};

  function loadSeen() {
    return FOB.supabase.from('story_views')
      .select('story_id')
      .eq('viewer_id', FOB.currentProfile.id)
      .then(function (res) {
        if (res.error) throw res.error;
        seen = {};
        (res.data || []).forEach(function (r) { seen[r.story_id] = true; });
      })
      .catch(function () { seen = {}; });
  }

  function loadStories() {
    return FOB.supabase.from('stories')
      .select('id, author_id, kind, bucket, storage_path, external_url,' +
              'mime_type, width, height, duration_ms, body, glow_color,' +
              'shared_discussion_id, created_at, expires_at,' +
              'author:profiles!stories_author_id_fkey(id, username, display_name, avatar_path, story_glow),' +
              'shared:discussions!stories_shared_discussion_id_fkey(' +
              '  id, slug, title, body,' +
              '  author:profiles!discussions_author_id_fkey(id, username, display_name, avatar_path))')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .then(function (res) {
        if (res.error) throw res.error;
        var rows = res.data || [];
        return FOB.media.resolve(rows).then(function () { return rows; });
      })
      .catch(function () { return []; });
  }

  /* Grouped by author, mine first: your own story is the one you
     check, and hunting for it in a row of avatars is friction. */
  function group(rows) {
    var byAuthor = {};
    var order = [];
    rows.forEach(function (r) {
      if (!r.author) return;
      if (!byAuthor[r.author_id]) {
        byAuthor[r.author_id] = { author: r.author, stories: [] };
        order.push(r.author_id);
      }
      byAuthor[r.author_id].stories.push(r);
    });
    var me = FOB.currentProfile.id;
    return order.map(function (id) { return byAuthor[id]; })
      .sort(function (a, b) {
        if (a.author.id === me) return -1;
        if (b.author.id === me) return 1;
        return 0;
      });
  }

  /* ---------- rail ------------------------------------------- */

  FOB.refreshStories = function () {
    var host = document.getElementById('story-rail');
    if (!host) return Promise.resolve();

    return Promise.all([loadStories(), loadSeen()]).then(function (out) {
      var rows = out[0];
      groups = group(rows);
      host.innerHTML = '';

      /* Your own entry is always present, so posting a story is one
         tap from the feed whether or not anybody has posted one. */
      host.appendChild(addButton());

      groups.forEach(function (g, i) {
        if (g.author.id === FOB.currentProfile.id) return;
        host.appendChild(bubble(g, i));
      });

      var mine = groups.filter(function (g) {
        return g.author.id === FOB.currentProfile.id;
      })[0];
      if (mine) {
        host.insertBefore(bubble(mine, groups.indexOf(mine)), host.children[1] || null);
      }

      host.hidden = false;
    });
  };

  function addButton() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'fob-story-item fob-story-add';
    b.setAttribute('aria-label', 'Add to your story');
    b.innerHTML =
      '<span class="fob-story-ring is-add">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>' +
      '</span><span class="fob-story-name">Your story</span>';
    b.addEventListener('click', openPoster);
    return b;
  }

  function bubble(g, index) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'fob-story-item';
    b.setAttribute('aria-label',
      'Story from ' + (g.author.display_name || g.author.username));

    var ring = document.createElement('span');
    var unseen = g.stories.some(function (st) { return !seen[st.id]; });
    ring.className = 'fob-story-ring' + (unseen ? '' : ' is-seen');

    /* One colour per person, from their profile. Per-story colours are
       still honoured if one was set before the setting moved. */
    var tint = g.author.story_glow || null;
    if (!tint) {
      for (var gi = g.stories.length - 1; gi >= 0; gi--) {
        if (g.stories[gi].glow_color) { tint = g.stories[gi].glow_color; break; }
      }
    }
    if (tint && unseen) ring.style.setProperty('--story-glow', tint);

    var url = FOB.avatarUrl(g.author.avatar_path);
    if (url) {
      var img = document.createElement('img');
      img.src = url;
      img.alt = '';
      ring.appendChild(img);
    } else {
      var fb = document.createElement('span');
      fb.className = 'fob-story-fallback';
      fb.textContent = FOB.initialsFor(g.author.display_name, g.author.username);
      ring.appendChild(fb);
    }

    var name = document.createElement('span');
    name.className = 'fob-story-name';
    name.textContent = g.author.id === FOB.currentProfile.id
      ? 'Your story'
      : (g.author.display_name || g.author.username);

    b.appendChild(ring);
    b.appendChild(name);
    b.addEventListener('click', function () { openViewer(index, 0); });
    return b;
  }

  /* ---------- viewer ----------------------------------------- */

  function buildViewer() {
    if (viewer) return;

    var back = document.createElement('div');
    back.className = 'fob-story-viewer';
    back.hidden = true;
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.setAttribute('aria-label', 'Stories');

    back.innerHTML =
      '<div class="fob-story-bars"></div>' +
      '<div class="fob-story-head">' +
        '<span class="fob-story-who"></span>' +
        '<span class="fob-story-when"></span>' +
        '<button type="button" class="fob-story-close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="fob-story-stage"></div>' +
      '<button type="button" class="fob-story-half fob-story-back" aria-label="Previous"></button>' +
      '<button type="button" class="fob-story-half fob-story-next" aria-label="Next"></button>';

    document.body.appendChild(back);

    viewer = {
      back: back,
      bars: back.querySelector('.fob-story-bars'),
      who: back.querySelector('.fob-story-who'),
      when: back.querySelector('.fob-story-when'),
      stage: back.querySelector('.fob-story-stage'),
      g: 0, i: 0, timer: null, startedAt: 0
    };

    back.querySelector('.fob-story-close').addEventListener('click', closeViewer);
    back.querySelector('.fob-story-next').addEventListener('click', function () { step(1); });
    back.querySelector('.fob-story-back').addEventListener('click', function () { step(-1); });

    document.addEventListener('keydown', function (ev) {
      if (!viewer || viewer.back.hidden) return;
      if (ev.key === 'Escape') closeViewer();
      if (ev.key === 'ArrowRight') step(1);
      if (ev.key === 'ArrowLeft') step(-1);
      if (ev.key === 'ArrowDown') skipAuthor();
    });

    /* Holding pauses, the way people expect when they want to read
       something before it moves on. Bound to the tap zones because
       those sit above the stage; on the stage they would never fire. */
    ['.fob-story-back', '.fob-story-next'].forEach(function (sel) {
      var zone = back.querySelector(sel);
      zone.addEventListener('pointerdown', pause);
      zone.addEventListener('pointerup', resume);
      zone.addEventListener('pointercancel', resume);
    });
  }

  function openViewer(groupIndex, storyIndex) {
    buildViewer();
    viewer.g = groupIndex;
    viewer.i = storyIndex;
    viewer.back.hidden = false;
    if (FOB.lockScroll) FOB.lockScroll();
    paint();
  }

  function closeViewer() {
    if (!viewer || viewer.back.hidden) return;
    stopTimer();
    viewer.stage.innerHTML = '';
    viewer.back.hidden = true;
    if (FOB.unlockScroll) FOB.unlockScroll();
  }

  /* Straight to the next author, skipping whatever is left of this
     one. Closes at the end rather than looping, because looping means
     somebody sees the same story twice trying to leave. */
  function skipAuthor() {
    if (viewer.g >= groups.length - 1) return closeViewer();
    viewer.g += 1;
    viewer.i = 0;
    paint();
  }

  function step(by) {
    var g = groups[viewer.g];
    if (!g) return closeViewer();
    var next = viewer.i + by;

    if (next < 0) {
      if (viewer.g === 0) return;
      viewer.g -= 1;
      viewer.i = Math.max(0, groups[viewer.g].stories.length - 1);
      return paint();
    }
    if (next >= g.stories.length) {
      if (viewer.g >= groups.length - 1) return closeViewer();
      viewer.g += 1;
      viewer.i = 0;
      return paint();
    }
    viewer.i = next;
    paint();
  }

  function paint() {
    var g = groups[viewer.g];
    if (!g) return closeViewer();
    var s = g.stories[viewer.i];
    if (!s) return closeViewer();

    viewer.who.textContent = g.author.display_name || g.author.username;
    viewer.when.textContent = FOB.timeAgo(s.created_at);

    viewer.bars.innerHTML = '';
    g.stories.forEach(function (_, i) {
      var bar = document.createElement('span');
      bar.className = 'fob-story-bar';
      var fill = document.createElement('i');
      if (i < viewer.i) fill.style.width = '100%';
      bar.appendChild(fill);
      viewer.bars.appendChild(bar);
    });

    viewer.stage.innerHTML = '';
    viewer.stage.appendChild(frameFor(s));
    var glow = (g.author && g.author.story_glow) || s.glow_color || null;
    if (glow) {
      viewer.back.style.setProperty('--story-glow', glow);
      viewer.back.classList.add('has-glow');
    } else {
      viewer.back.classList.remove('has-glow');
    }
    seen[s.id] = true;
    markSeen(s.id);

    var ms = SLIDE_MS;
    if (s.kind === 'video') ms = Math.min(30000, s.duration_ms || 10000);
    runTimer(ms);
  }

  function frameFor(s) {
    if (s.kind === 'shared_post') return sharedFrame(s);

    if (s.kind === 'video' && s.url) {
      var v = document.createElement('video');
      v.className = 'fob-story-media';
      v.src = s.url;
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.controls = false;
      v.addEventListener('ended', function () { step(1); });
      return v;
    }

    if ((s.kind === 'photo' || s.kind === 'gif') && s.url) {
      var img = document.createElement('img');
      img.className = 'fob-story-media';
      img.src = s.url;
      img.alt = s.body || '';
      return img;
    }

    var text = document.createElement('div');
    text.className = 'fob-story-text';
    text.textContent = s.body || '';
    return text;
  }

  /* A shared post is rendered as the post, not as a screenshot of one:
     the words stay selectable and the original author stays credited. */
  function sharedFrame(s) {
    var card = document.createElement('div');
    card.className = 'fob-story-shared';

    var d = s.shared;
    if (!d) {
      card.textContent = 'That post is no longer available.';
      return card;
    }

    var head = document.createElement('div');
    head.className = 'fob-story-shared-head';
    if (d.author) head.appendChild(FOB.avatarNode(d.author));
    var who = document.createElement('div');
    who.innerHTML = '<b>' + FOB.escapeHtml(d.author ? (d.author.display_name || d.author.username) : 'Member') +
                    '</b><span>@' + FOB.escapeHtml(d.author ? d.author.username : '') + '</span>';
    head.appendChild(who);
    card.appendChild(head);

    var title = document.createElement('h3');
    title.textContent = d.title || '';
    card.appendChild(title);

    if (d.body) {
      var body = document.createElement('p');
      body.textContent = d.body.length > 280 ? d.body.slice(0, 280) + '...' : d.body;
      card.appendChild(body);
    }

    if (s.body) {
      var note = document.createElement('p');
      note.className = 'fob-story-shared-note';
      note.textContent = s.body;
      card.insertBefore(note, card.firstChild);
    }

    var open = document.createElement('a');
    open.className = 'fob-community-btn fob-community-btn-ghost fob-community-btn-auto';
    open.href = '/community/discussion.html?d=' + encodeURIComponent(d.slug);
    open.textContent = 'Open post';
    open.addEventListener('click', function () { closeViewer(); });
    card.appendChild(open);

    return card;
  }

  function runTimer(ms) {
    stopTimer();
    var fill = viewer.bars.children[viewer.i]
      ? viewer.bars.children[viewer.i].firstChild : null;
    viewer.startedAt = Date.now();
    viewer.duration = ms;

    if (fill) {
      fill.style.transition = 'none';
      fill.style.width = '0%';
      /* Next frame, or the browser collapses the two writes into one
         and the bar jumps straight to full. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          fill.style.transition = 'width ' + ms + 'ms linear';
          fill.style.width = '100%';
        });
      });
    }
    viewer.timer = setTimeout(function () { step(1); }, ms);
  }

  function stopTimer() {
    if (viewer && viewer.timer) { clearTimeout(viewer.timer); viewer.timer = null; }
  }

  function pause() {
    if (!viewer || !viewer.timer) return;
    clearTimeout(viewer.timer);
    viewer.timer = null;
    viewer.remaining = viewer.duration - (Date.now() - viewer.startedAt);
    var fill = viewer.bars.children[viewer.i]
      ? viewer.bars.children[viewer.i].firstChild : null;
    if (fill) {
      var w = getComputedStyle(fill).width;
      fill.style.transition = 'none';
      fill.style.width = w;
    }
    var v = viewer.stage.querySelector('video');
    if (v) v.pause();
  }

  function resume() {
    if (!viewer || viewer.timer || viewer.back.hidden) return;
    var left = Math.max(400, viewer.remaining || viewer.duration);
    runTimerFrom(left);
    var v = viewer.stage.querySelector('video');
    if (v) v.play().catch(function () {});
  }

  function runTimerFrom(ms) {
    var fill = viewer.bars.children[viewer.i]
      ? viewer.bars.children[viewer.i].firstChild : null;
    viewer.startedAt = Date.now();
    viewer.duration = ms;
    if (fill) {
      requestAnimationFrame(function () {
        fill.style.transition = 'width ' + ms + 'ms linear';
        fill.style.width = '100%';
      });
    }
    viewer.timer = setTimeout(function () { step(1); }, ms);
  }

  function markSeen(storyId) {
    FOB.supabase.from('story_views')
      .upsert({ story_id: storyId, viewer_id: FOB.currentProfile.id },
              { onConflict: 'story_id,viewer_id' })
      .then(function () {}, function () {});
  }

  /* ---------- poster ----------------------------------------- */

  function openPoster(prefill) {
    buildPoster();
    poster.prefill = prefill && prefill.discussionId ? prefill : null;
    poster.file = null;
    poster.gif = null;
    poster.text.value = '';
    poster.preview.innerHTML = '';
    poster.preview.hidden = true;

    poster.sharedNote.hidden = !poster.prefill;
    if (poster.prefill) {
      poster.sharedNote.textContent = 'Sharing: ' + poster.prefill.title;
      poster.text.placeholder = 'Say something about it (optional)';
    } else {
      poster.text.placeholder = 'Write something, or add a photo or video';
    }

    poster.back.hidden = false;
    if (FOB.lockScroll) FOB.lockScroll();
  }
  FOB.openStoryPoster = openPoster;

  function buildPoster() {
    if (poster) return;

    var back = document.createElement('div');
    back.className = 'fob-pv-backdrop';
    back.hidden = true;
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.setAttribute('aria-label', 'Add to your story');

    var card = document.createElement('div');
    card.className = 'fob-pv-card';
    card.innerHTML =
      '<div class="fob-pv-name">Add to your story</div>' +
      '<p class="fob-community-field-note">Disappears after one hour.</p>' +
      '<p class="fob-community-field-note fob-story-sharing" hidden></p>' +
      '<div class="fob-story-preview" hidden></div>' +
      '<textarea class="fob-community-textarea" maxlength="400"></textarea>' +
      '<div class="fob-compose-tools">' +
        '<button class="fob-tool" type="button" data-act="photo" aria-label="Add a photo or video">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m3.5 17 4.8-4.6a2 2 0 0 1 2.7 0l6.4 6.1"/></svg>' +
        '</button>' +
        '<button class="fob-tool" type="button" data-act="gif" aria-label="Add a GIF">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M10 9.5H7.8A1.8 1.8 0 0 0 6 11.3v1.4a1.8 1.8 0 0 0 1.8 1.8H10v-2.1"/><path d="M12.9 9.5v5"/><path d="M18.4 9.5h-2.6v5m0-2.7h2.2"/></svg>' +
        '</button>' +
        '<input type="file" accept="image/*,video/*" hidden />' +
      '</div>' +
      '<div class="fob-community-btn-row">' +
        '<button class="fob-community-btn fob-community-btn-primary" data-act="share" type="button">Share</button>' +
        '<button class="fob-community-btn fob-community-btn-ghost" data-act="cancel" type="button">Cancel</button>' +
      '</div>' +
      '<div class="fob-community-status" role="status" aria-live="polite" hidden></div>';

    back.appendChild(card);
    document.body.appendChild(back);

    poster = {
      back: back, card: card,
      text: card.querySelector('textarea'),
      preview: card.querySelector('.fob-story-preview'),
      sharedNote: card.querySelector('.fob-story-sharing'),
      input: card.querySelector('input[type=file]'),
      status: card.querySelector('.fob-community-status'),
      file: null, gif: null, prefill: null
    };

    card.querySelector('[data-act=photo]').addEventListener('click', function () {
      poster.input.click();
    });
    poster.input.addEventListener('change', function () {
      var f = poster.input.files && poster.input.files[0];
      poster.input.value = '';
      if (!f) return;
      var isVideo = FOB.media.isVideo(f);
      var check = isVideo ? FOB.media.checkVideo(f) : FOB.media.checkImage(f);
      if (!check.ok) return FOB.setStatus(poster.status, check.reason, 'error');
      poster.file = f;
      poster.gif = null;
      showPreview(f, isVideo);
    });

    card.querySelector('[data-act=gif]').addEventListener('click', function () {
      var key = (window.FOB_COMMUNITY_CONFIG || {}).TENOR_KEY ||
                (window.FOB_COMMUNITY_CONFIG || {}).GIPHY_KEY;
      if (!key) {
        return FOB.setStatus(poster.status,
          'GIF search needs a key in config.js.', 'error');
      }
      FOB.gifPicker(key, function (gif) {
        poster.gif = gif;
        poster.file = null;
        poster.preview.hidden = false;
        poster.preview.innerHTML = '';
        var img = document.createElement('img');
        img.src = gif.preview;
        img.alt = '';
        poster.preview.appendChild(img);
      });
    });

    card.querySelector('[data-act=cancel]').addEventListener('click', closePoster);
    card.querySelector('[data-act=share]').addEventListener('click', publish);
    back.addEventListener('click', function (ev) {
      if (ev.target === back) closePoster();
    });
  }

  function showPreview(file, isVideo) {
    poster.preview.hidden = false;
    poster.preview.innerHTML = '';
    var url = URL.createObjectURL(file);
    var node = document.createElement(isVideo ? 'video' : 'img');
    node.src = url;
    if (isVideo) { node.muted = true; node.playsInline = true; node.controls = true; }
    poster.preview.appendChild(node);
  }

  function closePoster() {
    if (!poster) return;
    poster.back.hidden = true;
    if (FOB.unlockScroll) FOB.unlockScroll();
  }

  function publish() {
    var body = poster.text.value.trim();
    var hasMedia = !!(poster.file || poster.gif);
    var shared = poster.prefill;

    if (!body && !hasMedia && !shared) {
      return FOB.setStatus(poster.status,
        'Write something, or add a photo, video or GIF.', 'error');
    }

    FOB.setStatus(poster.status, 'Sharing...', '');
    var btn = poster.card.querySelector('[data-act=share]');
    btn.disabled = true;

    var row = {
      author_id: FOB.currentProfile.id,
      body: body || null
    };

    var work;

    if (shared) {
      row.kind = 'shared_post';
      row.shared_discussion_id = shared.discussionId;
      work = Promise.resolve(row);
    } else if (poster.gif) {
      row.kind = 'gif';
      row.external_url = poster.gif.url;
      row.width = poster.gif.width;
      row.height = poster.gif.height;
      row.mime_type = 'image/gif';
      work = Promise.resolve(row);
    } else if (poster.file) {
      var isVideo = FOB.media.isVideo(poster.file);
      row.kind = isVideo ? 'video' : 'photo';
      row.mime_type = poster.file.type;
      var meta = isVideo
        ? FOB.media.readVideoMeta(poster.file)
        : FOB.media.readSize(poster.file);
      var prepared = isVideo
        ? Promise.resolve({ blob: poster.file, mime: poster.file.type })
        : FOB.media.prepareImage(poster.file);

      work = Promise.all([meta, prepared]).then(function (out) {
        row.width = out[0].width;
        row.height = out[0].height;
        if (out[0].duration_ms) row.duration_ms = out[0].duration_ms;
        row.bucket = FOB.media.BUCKET_IMAGE;
        row.mime_type = out[1].mime || poster.file.type;
        var path = FOB.media.pathFor(FOB.media.extFor(row.mime_type));
        return FOB.media.upload(FOB.media.BUCKET_IMAGE, path,
                                out[1].blob, row.mime_type)
          .then(function () { row.storage_path = path; return row; });
      });
    } else {
      row.kind = 'text';
      work = Promise.resolve(row);
    }

    work
      .then(function (finalRow) {
        return FOB.supabase.from('stories').insert(finalRow);
      })
      .then(function (res) {
        if (res && res.error) throw res.error;
        FOB.setStatus(poster.status, '', '');
        closePoster();
        FOB.toast('Added to your story.');
        return FOB.refreshStories();
      })
      .catch(function (err) {
        FOB.setStatus(poster.status, FOB.friendlyError(err), 'error');
      })
      .finally(function () { btn.disabled = false; });
  }

  /* ---------- boot ------------------------------------------- */

  document.addEventListener('fob:ready', function () {
    if (!document.getElementById('story-rail')) return;
    FOB.refreshStories();
  });
})();
