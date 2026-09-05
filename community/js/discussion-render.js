/* ============================================================
   FOB COMMUNITY :: DISCUSSION HELPERS
   Rendering, formatting, and the pieces shared between the feed
   and the thread view.
   ============================================================ */
(function () {
  'use strict';

  var FOB = (window.FOB = window.FOB || {});

  FOB.REACTIONS = [
    { kind: 'like',      label: 'Like',       glyph: '\uD83D\uDC4D' },
    { kind: 'insightful',label: 'Insightful', glyph: '\uD83D\uDCA1' },
    { kind: 'strong',    label: 'Strong',     glyph: '\uD83D\uDCAA' },
    { kind: 'helpful',   label: 'Helpful',    glyph: '\uD83D\uDE4F' },
    { kind: 'celebrate', label: 'Celebrate',  glyph: '\uD83C\uDF89' }
  ];
  FOB.reactionByKind = function (kind) {
    for (var i = 0; i < FOB.REACTIONS.length; i++) {
      if (FOB.REACTIONS[i].kind === kind) return FOB.REACTIONS[i];
    }
    return FOB.REACTIONS[0];
  };

  /* Which reaction I gave each post, by discussion id. One per post:
     picking a second one replaces the first, the way every platform
     with a reaction row behaves. myLikes is kept in step so nothing
     that already reads it has to change. */
  FOB.myReaction = {};

  FOB.RESEARCH_LABELS = {
    framework_principle:   'Framework Principle',
    research_question:     'Research Question',
    founder_observation:   'Founder Observation',
    community_observation: 'Community Observation',
    evidence_requested:    'Evidence Requested',
    field_test:            'Field Test',
    unresolved:            'Unresolved'
  };

  /* ---------- safe rendering ---------------------------------
     Order matters. Everything is HTML-escaped FIRST, so by the
     time the markdown pass runs there are no angle brackets left
     in the string and no user input can become a tag. The only
     HTML in the output is what this function itself writes.
  ------------------------------------------------------------ */
  FOB.renderBody = function (raw) {
    var text = FOB.escapeHtml(raw || '');

    // inline code, before other inline rules
    text = text.replace(/`([^`\n]{1,200})`/g, '<code>$1</code>');

    // bold then italic
    text = text.replace(/\*\*([^*\n]{1,300})\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*])\*([^*\n]{1,300})\*/g, '$1<em>$2</em>');

    // links: only http(s), and the URL is already escaped
    text = text.replace(
      /\bhttps?:\/\/[^\s<]{4,300}/g,
      function (url) {
        // Stop the URL at the first escaped quote or bracket. Those
        // came from characters the author typed after the link, not
        // from the link itself.
        var cut = url.search(/&(quot|#39|lt|gt);/);
        var clean = cut === -1 ? url : url.slice(0, cut);
        var trimmed = clean.replace(/[.,;:)\]]+$/, '');
        if (trimmed.length < 11) return url;   // nothing usable left
        var tail = url.slice(trimmed.length);
        return '<a href="' + trimmed + '" target="_blank" rel="noopener noreferrer nofollow">' +
               trimmed + '</a>' + tail;
      }
    );

    // block level
    var lines = text.split(/\r?\n/);
    var out = [];
    var listType = null;

    function closeList() {
      if (listType) { out.push('</' + listType + '>'); listType = null; }
    }

    lines.forEach(function (line) {
      var bullet = /^\s*[-*]\s+(.*)$/.exec(line);
      var numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);

      if (bullet) {
        if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
        out.push('<li>' + bullet[1] + '</li>');
      } else if (numbered) {
        if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
        out.push('<li>' + numbered[1] + '</li>');
      } else if (line.trim() === '') {
        closeList();
      } else {
        closeList();
        out.push('<p>' + line + '</p>');
      }
    });
    closeList();

    return out.join('');
  };

  /* ---------- time ------------------------------------------- */
  FOB.timeAgo = function (iso) {
    if (!iso) return '';
    var then = new Date(iso).getTime();
    var secs = Math.floor((Date.now() - then) / 1000);
    if (secs < 60) return 'just now';
    var mins = Math.floor(secs / 60);
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd ago';
    if (days < 365) {
      return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return new Date(then).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };

  /* ---------- avatar element --------------------------------- */
  FOB.avatarEl = function (profile, size) {
    var px = size || 38;
    var url = profile && profile.avatar_path ? FOB.avatarUrl(profile.avatar_path) : null;
    var node;
    if (url) {
      node = document.createElement('img');
      node.src = url;
      node.alt = '';
      node.loading = 'lazy';
    } else {
      node = document.createElement('div');
      node.textContent = FOB.initialsFor(
        profile && profile.display_name, profile && profile.username
      );
      node.setAttribute('aria-hidden', 'true');
    }
    node.className = 'fob-thread-avatar';
    node.style.width = px + 'px';
    node.style.height = px + 'px';
    if (px < 34) node.style.fontSize = '11px';
    return node;
  };

  /* ---------- role badge ------------------------------------- */
  var BADGE_ORDER = ['founder', 'moderator', 'admin', 'coach'];
  var BADGE_LABEL = {
    founder: 'Founder', moderator: 'Moderator',
    admin: 'Admin', coach: 'Coach'
  };

  FOB.badgeEl = function (roles) {
    if (!roles || !roles.length) return null;
    var top = BADGE_ORDER.filter(function (r) { return roles.indexOf(r) !== -1; })[0];
    if (!top) return null;
    var span = document.createElement('span');
    span.className = 'fob-thread-badge is-' + top;
    span.textContent = BADGE_LABEL[top];
    return span;
  };

  /* ---------- empty state ------------------------------------ */
  FOB.emptyState = function (title, body, actionLabel, actionHref) {
    var wrap = document.createElement('div');
    wrap.className = 'fob-community-empty';
    var h = document.createElement('h3');
    h.textContent = title;
    var p = document.createElement('p');
    p.textContent = body;
    wrap.appendChild(h);
    wrap.appendChild(p);
    if (actionLabel && actionHref) {
      var a = document.createElement('a');
      a.className = 'fob-community-btn fob-community-btn-ghost fob-community-btn-auto';
      a.href = actionHref;
      a.textContent = actionLabel;
      wrap.appendChild(a);
    }
    return wrap;
  };

  FOB.skeleton = function (count) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < (count || 3); i++) {
      var s = document.createElement('div');
      s.className = 'fob-community-skeleton';
      s.setAttribute('aria-hidden', 'true');
      frag.appendChild(s);
    }
    return frag;
  };

  /* ---------- post card --------------------------------------
     Social layout: avatar row, body, count strip, action bar.
     The card surface colour comes from the AUTHOR's chosen theme,
     so a member's posts look the same wherever they appear.
  ------------------------------------------------------------ */
  FOB.THEMES = [
    { id: 'paper', name: 'Paper', bg: '#FFFFFF', fg: '#15181C' },
    { id: 'cream', name: 'Cream', bg: '#FAF6ED', fg: '#1E1A13' },
    { id: 'sand',  name: 'Sand',  bg: '#EFE8DA', fg: '#211D15' },
    { id: 'mist',  name: 'Mist',  bg: '#EDF1F5', fg: '#161A1F' },
    { id: 'slate', name: 'Slate', bg: '#333A43', fg: '#F4F6F8' },
    { id: 'ink',   name: 'Ink',   bg: '#191D22', fg: '#F4F6F8' }
  ];

  var ICONS = {
    like: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 8.6c0 4.4-7.1 9.1-8.8 10.2-1.7-1.1-8.8-5.8-8.8-10.2A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.8 2z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5A8.4 8.4 0 0 1 12 20a9 9 0 0 1-3.8-.8L3 20.5l1.4-4.9A8.4 8.4 0 0 1 3.5 11 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V3"/><path d="m8 7 4-4 4 4"/></svg>'
  };

  ICONS.repost = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M17 2.5 21 6.5 17 10.5"/><path d="M21 6.5H7a3 3 0 0 0-3 3v1.5"/>' +
    '<path d="M7 21.5 3 17.5 7 13.5"/><path d="M3 17.5h14a3 3 0 0 0 3-3V13"/></svg>';

  function actionBtn(kind, label, pressed) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'fob-post-action';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.setAttribute('aria-label', label);
    /* Icon only. The label is kept in the DOM but visually hidden: it is
       what a screen reader announces, and what the repost toggle rewrites
       when the state flips. Removing it outright would break both. */
    b.innerHTML = ICONS[kind] +
      '<span class="fob-community-sr">' + FOB.escapeHtml(label) + '</span>';
    return b;
  }

  var ICONS = {
    like: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 8.6c0 4.4-7.1 9.1-8.8 10.2-1.7-1.1-8.8-5.8-8.8-10.2A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.8 2z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5A8.4 8.4 0 0 1 12 20a9 9 0 0 1-3.8-.8L3 20.5l1.4-4.9A8.4 8.4 0 0 1 3.5 11 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V3"/><path d="m8 7 4-4 4 4"/></svg>'
  };

  /* Silhouette used wherever a person is missing or unknown. */
  FOB.SILHOUETTE =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<circle cx="12" cy="8.2" r="4.1"/>' +
    '<path d="M3.6 21c0-4.3 3.8-7.4 8.4-7.4s8.4 3.1 8.4 7.4z"/></svg>';

  /* My likes and saves, loaded once per feed page so buttons
     render in the correct state instead of resetting on reload. */
  FOB.myLikes = {};
  FOB.mySaves = {};
  FOB.myFollows = {};
  FOB.myReposts = {};

  ICONS.repost = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M17 2.5 21 6.5 17 10.5"/><path d="M21 6.5H7a3 3 0 0 0-3 3v1.5"/>' +
    '<path d="M7 21.5 3 17.5 7 13.5"/><path d="M3 17.5h14a3 3 0 0 0 3-3V13"/></svg>';

  function actionBtn(kind, label, pressed) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'fob-post-action';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.setAttribute('aria-label', label);
    /* Icon only. The label is kept in the DOM but visually hidden: it is
       what a screen reader announces, and what the repost toggle rewrites
       when the state flips. Removing it outright would break both. */
    b.innerHTML = ICONS[kind] +
      '<span class="fob-community-sr">' + FOB.escapeHtml(label) + '</span>';
    return b;
  }

  FOB.avatarNode = function (person, cls) {
    var url = person && person.avatar_path ? FOB.avatarUrl(person.avatar_path) : null;
    var node;
    if (url) {
      node = document.createElement('img');
      node.src = url; node.alt = ''; node.loading = 'lazy';
    } else if (person && (person.display_name || person.username)) {
      node = document.createElement('div');
      node.setAttribute('aria-hidden', 'true');
      node.textContent = FOB.initialsFor(person.display_name, person.username);
    } else {
      node = document.createElement('div');
      node.setAttribute('aria-hidden', 'true');
      node.className = 'is-silhouette';
      node.innerHTML = FOB.SILHOUETTE;
    }
    node.classList.add(cls || 'fob-post-avatar');
    return node;
  };

  /* ---------- post card ------------------------------------- */
  /* Role check kept in one place so a badge, a card treatment and
     anything added later all agree on what "founder" means. Tolerant of
     shape: a missing or non-array roles value means no role, never a
     thrown error that takes the whole feed down. */
  FOB.hasRole = function (person, role) {
    if (!person || !Array.isArray(person.roles)) return false;
    for (var i = 0; i < person.roles.length; i++) {
      if (person.roles[i] && person.roles[i].role === role) return true;
    }
    return false;
  };

  FOB.discussionCard = function (d, opts) {
    opts = opts || {};
    var author = d.author || {};
    var mine = author.id === FOB.currentProfile.id;

    var card = document.createElement('article');
    card.className = 'fob-post theme-' + (author.card_theme || 'paper');
    /* Deliberately understated: a permanent animation in a scrolling
       feed is a nuisance, so this is a slow low-contrast breath rather
       than something that pulls the eye off what was written. */
    if (FOB.hasRole(author, 'founder')) card.classList.add('is-founder');
    card.setAttribute('data-post', d.id);

    /* --- header --- */
    var head = document.createElement('div');
    head.className = 'fob-post-head';

    /* Avatar and name open the author's profile sheet. Marked with
       data-profile and handled by one delegated listener in
       profile-view.js, so cards rendered later work without rewiring. */
    var avatarNode = FOB.avatarNode(author);
    if (author.username && FOB.markProfileTarget) FOB.markProfileTarget(avatarNode, author.username);
    head.appendChild(avatarNode);

    var ident = document.createElement('div');
    ident.className = 'fob-post-ident';

    var nameRow = document.createElement('div');
    nameRow.className = 'fob-post-name';
    if (author.username && FOB.markProfileTarget) FOB.markProfileTarget(nameRow, author.username);
    nameRow.appendChild(document.createTextNode(author.display_name || 'Member'));
    var badge = FOB.badgeEl(d.author_roles);
    if (badge) { badge.className = 'fob-post-badge'; nameRow.appendChild(badge); }
    if (d.is_pinned) {
      var pin = document.createElement('span');
      pin.className = 'fob-post-badge';
      pin.textContent = 'Pinned';
      nameRow.appendChild(pin);
    }

    var meta = document.createElement('div');
    meta.className = 'fob-post-meta';
    meta.textContent = '@' + (author.username || '') + '  \u00B7  ' +
      FOB.timeAgo(d.last_activity_at || d.created_at) + (d.edited_at ? '  \u00B7  Edited' : '');

    ident.appendChild(nameRow);
    ident.appendChild(meta);
    head.appendChild(ident);
    if (!opts.preview) head.appendChild(buildMenu(d, card, mine, author));
    card.appendChild(head);

    /* --- body --- */
    var link = document.createElement('a');
    link.className = 'fob-post-title';
    link.href = '/community/discussion.html?d=' + encodeURIComponent(d.slug);
    link.textContent = d.title || '';
    /* Titles are optional. Rendering an empty heading leaves a gap the
       eye reads as a loading error, so the element is left out entirely
       and the body becomes the opening line. */
    if (d.title) card.appendChild(link);

    var body = document.createElement('p');
    body.className = 'fob-post-body';
    setBodyText(body, d.body);
    card.appendChild(body);

    if (d.category_name) {
      var topic = document.createElement('span');
      topic.className = 'fob-post-topic';
      topic.textContent = d.category_name;
      card.appendChild(topic);
    }

    /* --- media --- */
    /* Attached by the feed before render, so a card never fetches its
       own media and never causes a second layout pass. */
    if (d.media && d.media.length && FOB.renderMedia) {
      var mediaEl = FOB.renderMedia(d.media);
      if (mediaEl) card.appendChild(mediaEl);
    }

    /* --- counts --- */
    var counts = document.createElement('div');
    counts.className = 'fob-post-counts';
    renderCounts(counts, d);
    card.appendChild(counts);

    /* --- actions --- */
    var actions = document.createElement('div');
    actions.className = 'fob-post-actions';

    var likeBtn = actionBtn('like', 'React', false);
    paintReactionBtn(d, likeBtn);
    likeBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      openReactionPicker(d, likeBtn, counts);
    });

    var commentBtn = actionBtn('comment', 'Comment', false);
    var saveBtn = actionBtn('save', 'Save', !!FOB.mySaves[d.id]);
    saveBtn.addEventListener('click', function () { toggleSave(d, saveBtn); });

    var reposted = !!FOB.myReposts[d.id];
    var repostBtn = actionBtn('repost', reposted ? 'Reposted' : 'Repost', reposted);
    repostBtn.addEventListener('click', function () {
      FOB.repostPrompt(d, repostBtn, counts);
    });

    var shareBtn = actionBtn('share', 'Share', false);
    shareBtn.addEventListener('click', function () { FOB.sharePost(d, link.href); });

    actions.appendChild(likeBtn);
    actions.appendChild(commentBtn);
    actions.appendChild(repostBtn);
    actions.appendChild(saveBtn);
    actions.appendChild(shareBtn);
    card.appendChild(actions);

    /* --- inline comments --- */
    var panel = document.createElement('div');
    panel.className = 'fob-post-comments';
    panel.hidden = true;
    card.appendChild(panel);

    commentBtn.addEventListener('click', function () {
      /* A sheet rather than an inline panel: expanding in place pushes
         every post below it down the page, so closing loses your place,
         and it left no room for a composer that can hold a photo. */
      if (FOB.openComments) {
        FOB.openComments(d, function () { renderCounts(counts, d); });
        return;
      }
      var opening = panel.hidden;
      panel.hidden = !opening;
      commentBtn.setAttribute('aria-pressed', opening ? 'true' : 'false');
      if (opening && !panel.dataset.loaded) buildComments(d, panel, counts);
    });

    if (opts.openComments) commentBtn.click();
    return card;
  };

  function setBodyText(el, raw) {
    var text = String(raw || '').replace(/\s+/g, ' ');
    el.textContent = text.length > 260 ? text.slice(0, 260) + '\u2026' : text;
  }

  function renderCounts(el, d) {
    var bits = [];
    if (d.reaction_count) {
      bits.push(d.reaction_count === 1 ? '1 reaction' : d.reaction_count + ' reactions');
    }
    bits.push(d.reply_count === 1 ? '1 comment' : d.reply_count + ' comments');
    if (d.repost_count) bits.push(repostLabel(d.repost_count));
    if (d.view_count > 1) bits.push('Seen by ' + d.view_count);
    el.textContent = bits.join('  \u00B7  ');
  }

  /* ---------- overflow menu ---------------------------------- */
  function buildMenu(d, card, mine, author) {
    var wrap = document.createElement('div');
    wrap.className = 'fob-post-menu-wrap';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fob-post-more';
    btn.setAttribute('aria-label', 'More options');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = '\u22EF';

    var menu = document.createElement('div');
    menu.className = 'fob-post-menu';
    menu.hidden = true;

    function item(label, fn, danger) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'fob-post-menu-item' + (danger ? ' is-danger' : '');
      b.textContent = label;
      b.addEventListener('click', function () { close(); fn(); });
      menu.appendChild(b);
      return b;
    }
    function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }

    if (mine) {
      item('Edit post', function () { startEdit(d, card); });
      item('Delete post', function () { deletePost(d, card); }, true);
    } else {
      var followItem = item(
        FOB.myFollows[author.id] ? 'Unfollow @' + author.username : 'Follow @' + author.username,
        function () { FOB.toggleFollow(author, followItem); }
      );
    }
    item('Copy link', function () {
      var href = window.location.origin + '/community/discussion.html?d=' + encodeURIComponent(d.slug);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(href)
          .then(function () { FOB.toast('Link copied'); });
      }
    });

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      document.querySelectorAll('.fob-post-menu').forEach(function (m) {
        if (m !== menu) m.hidden = true;
      });
      menu.hidden = !menu.hidden;
      btn.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
    });
    document.addEventListener('click', close);

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    return wrap;
  }

  /* ---------- edit / delete ---------------------------------- */
  function startEdit(d, card) {
    if (card.querySelector('.fob-post-edit')) return;
    var body = card.querySelector('.fob-post-body');
    var title = card.querySelector('.fob-post-title');

    var box = document.createElement('div');
    box.className = 'fob-post-edit';

    var ti = document.createElement('input');
    ti.className = 'fob-post-edit-input';
    ti.value = d.title || ''; ti.maxLength = 160;
    ti.placeholder = 'Title (optional)';
    ti.setAttribute('aria-label', 'Edit title');

    var ta = document.createElement('textarea');
    ta.className = 'fob-post-edit-area';
    ta.value = d.body; ta.maxLength = 20000;
    ta.setAttribute('aria-label', 'Edit post');

    var row = document.createElement('div');
    row.className = 'fob-post-edit-row';

    var save = document.createElement('button');
    save.type = 'button'; save.className = 'fob-post-btn is-primary'; save.textContent = 'Save';
    var cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'fob-post-btn'; cancel.textContent = 'Cancel';

    row.appendChild(cancel); row.appendChild(save);
    box.appendChild(ti); box.appendChild(ta); box.appendChild(row);
    body.after(box);
    body.hidden = true;
    ta.focus();

    cancel.addEventListener('click', function () { box.remove(); body.hidden = false; });

    save.addEventListener('click', function () {
      var nt = ti.value.trim(), nb = ta.value.trim();
      if (nt.length > 160) { FOB.toast('Titles are limited to 160 characters.', 'error'); return; }
      /* Media can carry a post, so an empty body is only a problem when
         there is nothing attached either. */
      if (!nb && !(d.media && d.media.length)) {
        FOB.toast('Add some text, or keep the attachment.', 'error');
        return;
      }
      save.disabled = true;

      FOB.supabase.from('discussions')
        .update({ title: nt, body: nb })
        .eq('id', d.id)
        .then(function (res) {
          if (res.error) throw res.error;
          d.title = nt; d.body = nb; d.edited_at = new Date().toISOString();
          if (title) {
            title.textContent = nt;
            title.hidden = !nt;
          }
          setBodyText(body, nb);
          var meta = card.querySelector('.fob-post-meta');
          if (meta && meta.textContent.indexOf('Edited') === -1) meta.textContent += '  \u00B7  Edited';
          box.remove(); body.hidden = false;
          FOB.toast('Post updated');
        })
        .catch(function (err) {
          FOB.toast(FOB.friendlyError(err), 'error');
          save.disabled = false;
        });
    });
  }

  function deletePost(d, card) {
    if (!window.confirm('Delete this post? It is removed from the feed but kept for moderation.')) return;

    FOB.supabase.from('discussions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', d.id)
      .select('id')
      .then(function (res) {
        if (res.error) throw res.error;

        /* Zero rows means row-level security refused the update. That
           returns no error, so without asking for the row back this
           reported a delete that never happened. */
        if (!res.data || !res.data.length) {
          FOB.toast(d.is_locked
            ? 'This post is locked and cannot be deleted.'
            : 'That post could not be deleted. It may already be gone.', 'error');
          return;
        }

        d.deleted_at = new Date().toISOString();

        /* A reposted card is wrapped by the "X reposted" entry. Removing
           only the card left the header and caption behind as a ghost. */
        var owner = card.parentNode &&
                    card.parentNode.querySelector('.fob-repost-head')
          ? card.parentNode : card;
        owner.style.opacity = '0';
        window.setTimeout(function () { owner.remove(); }, 200);
        FOB.toast('Post deleted');
      })
      .catch(function (err) { FOB.toast(FOB.friendlyError(err), 'error'); });
  }

  /* ---------- inline comments -------------------------------- */
  function buildComments(d, panel, counts) {
    panel.dataset.loaded = '1';
    panel.innerHTML = '<p class="fob-post-comment-loading">Loading comments...</p>';

    FOB.supabase.from('replies')
      .select('id, body, created_at, author_id, author:profiles!replies_author_id_fkey(id, username, display_name, avatar_path)')
      .eq('discussion_id', d.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(20)
      .then(function (res) {
        if (res.error) throw res.error;
        panel.innerHTML = '';

        var list = document.createElement('div');
        list.className = 'fob-post-comment-list';
        (res.data || []).forEach(function (r) { list.appendChild(commentEl(r, d, counts)); });
        if (!res.data || !res.data.length) {
          var none = document.createElement('p');
          none.className = 'fob-post-comment-loading';
          none.textContent = 'No comments yet. Start it off.';
          list.appendChild(none);
        }
        panel.appendChild(list);

        /* composer */
        var form = document.createElement('div');
        form.className = 'fob-post-comment-form';
        form.appendChild(FOB.avatarNode(FOB.currentProfile, 'fob-post-comment-avatar'));

        var ta = document.createElement('textarea');
        ta.className = 'fob-post-comment-input';
        ta.rows = 1;
        ta.placeholder = 'Write a comment...';
        ta.setAttribute('aria-label', 'Write a comment');
        ta.addEventListener('input', function () {
          ta.style.height = 'auto';
          ta.style.height = Math.min(ta.scrollHeight, 130) + 'px';
        });

        var send = document.createElement('button');
        send.type = 'button';
        send.className = 'fob-post-comment-send';
        send.textContent = 'Post';

        function submit() {
          var text = ta.value.trim();
          if (!text) return;
          send.disabled = true;
          FOB.supabase.from('replies').insert({
            discussion_id: d.id,
            author_id: FOB.currentProfile.id,
            body: text
          }).select('id, body, created_at, author_id').single()
            .then(function (res) {
              if (res.error) throw res.error;
              var row = res.data;
              row.author = FOB.currentProfile;
              var placeholder = list.querySelector('.fob-post-comment-loading');
              if (placeholder) placeholder.remove();
              list.appendChild(commentEl(row, d, counts));
              ta.value = ''; ta.style.height = 'auto';
              d.reply_count = (d.reply_count || 0) + 1;
              renderCounts(counts, d);
            })
            .catch(function (err) { FOB.toast(FOB.friendlyError(err), 'error'); })
            .finally(function () { send.disabled = false; });
        }

        send.addEventListener('click', submit);
        ta.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
        });

        form.appendChild(ta);
        form.appendChild(send);
        panel.appendChild(form);
        ta.focus();
      })
      .catch(function (err) {
        panel.innerHTML = '';
        var p = document.createElement('p');
        p.className = 'fob-post-comment-loading';
        p.textContent = FOB.friendlyError(err);
        panel.appendChild(p);
      });
  }

  function commentEl(r, d, counts) {
    var wrap = document.createElement('div');
    wrap.className = 'fob-post-comment';
    wrap.appendChild(FOB.avatarNode(r.author, 'fob-post-comment-avatar'));

    var bubble = document.createElement('div');
    bubble.className = 'fob-post-comment-bubble';

    var who = document.createElement('div');
    who.className = 'fob-post-comment-who';
    who.textContent = (r.author && r.author.display_name) || 'Member';

    var txt = document.createElement('div');
    txt.className = 'fob-post-comment-text';
    txt.textContent = r.body;

    bubble.appendChild(who);
    bubble.appendChild(txt);
    wrap.appendChild(bubble);

    if (r.author_id === FOB.currentProfile.id) {
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'fob-post-comment-del';
      del.setAttribute('aria-label', 'Delete comment');
      del.textContent = '\u00D7';
      del.addEventListener('click', function () {
        if (!window.confirm('Delete this comment?')) return;
        FOB.supabase.from('replies')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', r.id)
          .then(function (res) {
            if (res.error) throw res.error;
            wrap.remove();
            d.reply_count = Math.max(0, (d.reply_count || 1) - 1);
            renderCounts(counts, d);
          })
          .catch(function (err) { FOB.toast(FOB.friendlyError(err), 'error'); });
      });
      wrap.appendChild(del);
    }
    return wrap;
  }

  /* ---------- like / save / follow / share -------------------- */
  /* The row is built on demand and removed on close, so a feed of forty
     cards is not carrying forty hidden pickers. */
  function openReactionPicker(d, btn, counts) {
    var existing = document.querySelector('.fob-react-pop');
    if (existing) {
      var sameCard = existing.parentNode === btn.parentNode;
      existing.remove();
      if (sameCard) return;
    }

    var pop = document.createElement('div');
    pop.className = 'fob-react-pop';
    pop.setAttribute('role', 'group');
    pop.setAttribute('aria-label', 'Choose a reaction');

    FOB.REACTIONS.forEach(function (r, i) {
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'fob-react-opt';
      opt.style.animationDelay = (i * 28) + 'ms';
      opt.setAttribute('aria-label', r.label);
      opt.setAttribute('aria-pressed', FOB.myReaction[d.id] === r.kind ? 'true' : 'false');
      opt.innerHTML = '<span aria-hidden="true">' + r.glyph + '</span>' +
        '<span class="fob-react-tip">' + FOB.escapeHtml(r.label) + '</span>';
      opt.addEventListener('click', function (ev) {
        ev.stopPropagation();
        setReaction(d, r.kind, btn, counts);
        pop.remove();
      });
      pop.appendChild(opt);
    });

    btn.parentNode.appendChild(pop);

    /* One listener, removed with the row, so closing cannot leak. */
    setTimeout(function () {
      document.addEventListener('click', function away(ev) {
        if (pop.contains(ev.target)) return;
        pop.remove();
        document.removeEventListener('click', away);
      });
    }, 0);
  }

  function paintReactionBtn(d, btn) {
    var kind = FOB.myReaction[d.id];
    var r = kind ? FOB.reactionByKind(kind) : null;
    btn.setAttribute('aria-pressed', kind ? 'true' : 'false');
    btn.setAttribute('aria-label', r ? r.label : 'React');
    btn.innerHTML = (r
      ? '<span class="fob-react-mine" aria-hidden="true">' + r.glyph + '</span>'
      : ICONS.like) +
      '<span class="fob-community-sr">' + FOB.escapeHtml(r ? r.label : 'React') + '</span>';
  }

  /* Tapping the one you already gave removes it; tapping a different one
     swaps it, which is a delete plus an insert rather than two rows. */
  function setReaction(d, kind, btn, counts) {
    var prev = FOB.myReaction[d.id] || null;
    var next = (prev === kind) ? null : kind;
    var uid = FOB.currentProfile.id;

    FOB.myReaction[d.id] = next;
    FOB.myLikes[d.id] = !!next;
    if (!prev && next) d.reaction_count = (d.reaction_count || 0) + 1;
    if (prev && !next) d.reaction_count = Math.max(0, (d.reaction_count || 0) - 1);
    paintReactionBtn(d, btn);
    renderCounts(counts, d);

    var work = Promise.resolve();
    if (prev) {
      work = work.then(function () {
        return FOB.supabase.from('discussion_reactions').delete()
          .eq('discussion_id', d.id).eq('user_id', uid).eq('kind', prev);
      });
    }
    if (next) {
      work = work.then(function () {
        return FOB.supabase.from('discussion_reactions')
          .insert({ discussion_id: d.id, user_id: uid, kind: next });
      });
    }

    return work.then(function (r) {
      if (r && r.error) throw r.error;
    }).catch(function (err) {
      FOB.myReaction[d.id] = prev;
      FOB.myLikes[d.id] = !!prev;
      if (!prev && next) d.reaction_count = Math.max(0, (d.reaction_count || 0) - 1);
      if (prev && !next) d.reaction_count = (d.reaction_count || 0) + 1;
      paintReactionBtn(d, btn);
      renderCounts(counts, d);
      FOB.toast(FOB.friendlyError(err), 'error');
    });
  }
  FOB.paintReactionBtn = paintReactionBtn;
  FOB.openReactionPicker = openReactionPicker;

  function toggleLike(d, btn, counts) {
    var on = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', on ? 'false' : 'true');
    FOB.myLikes[d.id] = !on;
    d.reaction_count = Math.max(0, (d.reaction_count || 0) + (on ? -1 : 1));
    renderCounts(counts, d);

    var uid = FOB.currentProfile.id;
    var op = on
      ? FOB.supabase.from('discussion_reactions').delete()
          .eq('discussion_id', d.id).eq('user_id', uid).eq('kind', 'like')
      : FOB.supabase.from('discussion_reactions')
          .insert({ discussion_id: d.id, user_id: uid, kind: 'like' });

    op.then(function (r) { if (r.error) throw r.error; })
      .catch(function (err) {
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        FOB.myLikes[d.id] = on;
        d.reaction_count = Math.max(0, (d.reaction_count || 0) + (on ? 1 : -1));
        renderCounts(counts, d);
        FOB.toast(FOB.friendlyError(err), 'error');
      });
  }

  function toggleSave(d, btn) {
    var on = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', on ? 'false' : 'true');
    FOB.mySaves[d.id] = !on;

    var uid = FOB.currentProfile.id;
    var op = on
      ? FOB.supabase.from('saved_discussions').delete()
          .eq('discussion_id', d.id).eq('user_id', uid)
      : FOB.supabase.from('saved_discussions')
          .insert({ discussion_id: d.id, user_id: uid });

    op.then(function (r) {
      if (r.error) throw r.error;
      FOB.toast(on ? 'Removed from saved' : 'Saved');
    }).catch(function (err) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      FOB.mySaves[d.id] = on;
      FOB.toast(FOB.friendlyError(err), 'error');
    });
  }

  /* Reposts are a plain toggle against discussion_reposts. The count on
     the discussion row is maintained by a database trigger, so the client
     never writes it and two devices cannot disagree about the total. */
  /* Tapping Repost when you have not reposted opens a caption box.
     The caption is optional: posting it empty is a plain repost, so
     there is one button rather than two that do almost the same thing.
     Tapping again when already reposted removes it without asking,
     because there is nothing to compose. */
  FOB.repostPrompt = function (d, btn, countEl) {
    if (FOB.myReposts[d.id]) return FOB.toggleRepost(d, btn, countEl, null);

    var backdrop = document.createElement('div');
    backdrop.className = 'fob-pv-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Repost');

    var card = document.createElement('div');
    card.className = 'fob-pv-card';

    var head = document.createElement('div');
    head.className = 'fob-pv-name';
    head.textContent = 'Repost';
    card.appendChild(head);

    var who = document.createElement('p');
    who.className = 'fob-pv-handle';
    who.style.marginBottom = '14px';
    who.textContent = (d.author && d.author.display_name ? d.author.display_name : 'Member') +
      '  \u00B7  ' + (d.title || '');
    card.appendChild(who);

    var box = document.createElement('textarea');
    box.className = 'fob-community-textarea';
    box.maxLength = 500;
    box.placeholder = 'Add your two cents (optional)';
    card.appendChild(box);

    var row = document.createElement('div');
    row.className = 'fob-community-btn-row';
    row.style.marginTop = '14px';

    var go = document.createElement('button');
    go.type = 'button';
    go.className = 'fob-community-btn fob-community-btn-primary';
    go.textContent = 'Repost';
    go.addEventListener('click', function () {
      go.disabled = true;
      FOB.toggleRepost(d, btn, countEl, box.value.trim() || null)
        .finally(function () { backdrop.remove(); window.FOB.unlockScroll(); });
    });

    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'fob-community-btn fob-community-btn-ghost';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', function () {
      backdrop.remove(); window.FOB.unlockScroll();
    });

    row.appendChild(go); row.appendChild(cancel);
    card.appendChild(row);
    backdrop.appendChild(card);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) { backdrop.remove(); window.FOB.unlockScroll(); }
    });
    document.body.appendChild(backdrop);
    window.FOB.lockScroll();
    box.focus();
  };

  FOB.toggleRepost = function (d, btn, countEl, caption) {
    var on = !!FOB.myReposts[d.id];
    FOB.myReposts[d.id] = !on;
    btn.setAttribute('aria-pressed', !on ? 'true' : 'false');
    btn.querySelector('span').textContent = !on ? 'Reposted' : 'Repost';

    var table = FOB.supabase.from('discussion_reposts');
    var work = on
      ? table.delete().eq('user_id', FOB.currentProfile.id).eq('discussion_id', d.id)
      : table.upsert({ user_id: FOB.currentProfile.id, discussion_id: d.id,
                       comment: caption || null },
                     { onConflict: 'user_id,discussion_id' });

    return Promise.resolve(work).then(function (res) {
      if (res && res.error) throw res.error;
      d.repost_count = Math.max((d.repost_count || 0) + (on ? -1 : 1), 0);
      if (countEl) renderCounts(countEl, d);
      /* Show it in the timeline now rather than on the next reload. The
         same refresh a new post uses, so the two cannot drift apart. */
      if (!on && FOB.refreshFeedAfterRepost) FOB.refreshFeedAfterRepost(d.id);
      FOB.toast(on ? 'Repost removed' : 'Reposted');
    }).catch(function (err) {
      /* Put the button back rather than leaving it claiming something
         that did not happen. */
      FOB.myReposts[d.id] = on;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.querySelector('span').textContent = on ? 'Reposted' : 'Repost';
      FOB.toast(FOB.friendlyError(err), 'error');
    });
  };

  function repostLabel(n) {
    if (!n) return '';
    return n === 1 ? '1 repost' : n + ' reposts';
  }
  FOB.repostLabel = repostLabel;

  FOB.toggleFollow = function (person, labelEl) {
    var uid = FOB.currentProfile.id;

    /* The database has a no_self_follow check, so this would fail on the
       round trip anyway. Stopping here keeps the optimistic state honest
       rather than flipping a button that is about to be reverted. */
    if (person.id === uid) {
      FOB.toast('You cannot follow yourself.', 'error');
      return Promise.resolve();
    }

    var on = !!FOB.myFollows[person.id];
    FOB.myFollows[person.id] = !on;
    if (labelEl) {
      labelEl.textContent = (!on ? 'Unfollow @' : 'Follow @') + person.username;
    }

    /* upsert rather than insert: the primary key already makes a second
       follow impossible, but a double tap would otherwise surface a
       duplicate-key error instead of doing nothing. */
    var op = on
      ? FOB.supabase.from('user_follows').delete()
          .eq('follower_id', uid).eq('followee_id', person.id)
      : FOB.supabase.from('user_follows')
          .upsert({ follower_id: uid, followee_id: person.id },
                  { onConflict: 'follower_id,followee_id' });

    return op.then(function (r) {
      if (r.error) throw r.error;
      FOB.toast(on ? 'Unfollowed ' + person.display_name : 'Following ' + person.display_name);
      if (FOB.refreshFollowStrip) FOB.refreshFollowStrip();
      /* The Following feed is a filtered view of this relationship, so it
         is now stale. Refetching is what keeps it from showing someone
         who was just unfollowed, and it cannot duplicate rows because the
         list is rebuilt rather than appended to. */
      if (FOB.onFollowChanged) FOB.onFollowChanged(person.id, !on);
    }).catch(function (err) {
      FOB.myFollows[person.id] = on;
      if (labelEl) {
        labelEl.textContent = (on ? 'Unfollow @' : 'Follow @') + person.username;
      }
      FOB.toast(FOB.friendlyError(err), 'error');
    });
  };

  FOB.sharePost = function (d, href) {
    var full = window.location.origin + href;

    /* Two destinations now, so ask rather than guess. If stories are
       not on this page the sheet is skipped entirely and sharing
       behaves exactly as it did before. */
    if (!FOB.openStoryPoster) return shareLink(d, full);

    var back = document.createElement('div');
    back.className = 'fob-pv-backdrop';
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.setAttribute('aria-label', 'Share');

    var card = document.createElement('div');
    card.className = 'fob-pv-card';
    card.innerHTML = '<div class="fob-pv-name">Share</div>';

    var toStory = document.createElement('button');
    toStory.type = 'button';
    toStory.className = 'fob-room';
    toStory.innerHTML = '<span>Add to your story</span>' +
      '<span class="fob-room-meta">Gone in an hour</span>';
    toStory.addEventListener('click', function () {
      close();
      FOB.openStoryPoster({ discussionId: d.id, title: d.title });
    });

    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'fob-room';
    copy.innerHTML = '<span>Share a link</span>' +
      '<span class="fob-room-meta">Copy or send</span>';
    copy.addEventListener('click', function () {
      close();
      shareLink(d, full);
    });

    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'fob-community-btn fob-community-btn-ghost';
    cancel.style.cssText = 'margin-top:12px;width:100%;';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', function () { close(); });

    card.appendChild(toStory);
    card.appendChild(copy);
    card.appendChild(cancel);
    back.appendChild(card);
    document.body.appendChild(back);
    if (FOB.lockScroll) FOB.lockScroll();

    back.addEventListener('click', function (ev) {
      if (ev.target === back) close();
    });

    function close() {
      back.remove();
      if (FOB.unlockScroll) FOB.unlockScroll();
    }
  };

  function shareLink(d, full) {
    if (navigator.share) {
      navigator.share({ title: d.title, url: full }).catch(function () {});
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(full)
        .then(function () { FOB.toast('Link copied'); })
        .catch(function () { FOB.toast('Could not copy the link', 'error'); });
    }
  }

})();
