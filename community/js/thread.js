/* ============================================================
   FOB COMMUNITY :: THREAD
   A single discussion with its replies, reactions and actions.
   ============================================================ */
(function () {
  'use strict';

  var FOB = (window.FOB = window.FOB || {});

  var state = {
    discussion: null,
    replies: [],
    myReactions: {},
    saved: false,
    following: false,
    sort: 'oldest',
    replyingTo: null
  };

  var els = {};

  function slugFromUrl() {
    return new URLSearchParams(window.location.search).get('d');
  }

  /* ---------- load -------------------------------------------- */
  function loadDiscussion(slug) {
    return FOB.supabase.from('discussions')
      .select([
        'id, slug, title, body, reply_count, reaction_count, view_count,',
        'is_pinned, is_locked, is_research, is_current_research, research_label,',
        'author_id, created_at, edited_at, last_activity_at,',
        'author:profiles!discussions_author_id_fkey(id, username, display_name, avatar_path, card_theme),',
        'category:categories!discussions_category_id_fkey(id, name, slug)'
      ].join(' '))
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        if (!res.data) return null;
        state.discussion = res.data;
        return res.data;
      });
  }

  function loadReplies() {
    var order = state.sort === 'newest' ? false : true;
    return FOB.supabase.from('replies')
      .select([
        'id, body, author_id, parent_reply_id, depth, reaction_count,',
        'created_at, edited_at,',
        'author:profiles!replies_author_id_fkey(id, username, display_name, avatar_path)'
      ].join(' '))
      .eq('discussion_id', state.discussion.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: order })
      .limit(200)
      .then(function (res) {
        if (res.error) throw res.error;
        state.replies = res.data || [];
      });
  }

  function loadMyState() {
    var uid = FOB.currentProfile.id;
    return Promise.all([
      FOB.supabase.from('discussion_reactions')
        .select('kind').eq('discussion_id', state.discussion.id).eq('user_id', uid),
      FOB.supabase.from('saved_discussions')
        .select('discussion_id').eq('discussion_id', state.discussion.id).eq('user_id', uid).maybeSingle(),
      FOB.supabase.from('followed_discussions')
        .select('discussion_id').eq('discussion_id', state.discussion.id).eq('user_id', uid).maybeSingle()
    ]).then(function (res) {
      state.myReactions = {};
      ((res[0] && res[0].data) || []).forEach(function (r) { state.myReactions[r.kind] = true; });
      state.saved = !!(res[1] && res[1].data);
      state.following = !!(res[2] && res[2].data);
    });
  }

  /* ---------- render ------------------------------------------ */
  function renderDiscussion() {
    var d = state.discussion;
    var mine = d.author_id === FOB.currentProfile.id;

    document.title = (d.title || 'Post') + ' | FOB Community';

    /* Titles are optional, so an untitled thread shows its body as the
       opening line rather than an empty heading. */
    els.title.textContent = d.title || '';
    els.title.hidden = !d.title;
    if (els.category) {
      els.category.textContent = d.category ? d.category.name : '';
      els.category.hidden = !d.category;
    }

    els.byline.innerHTML = '';
    els.byline.appendChild(FOB.avatarEl(d.author, 40));
    var meta = document.createElement('div');
    var nameRow = document.createElement('div');
    nameRow.className = 'fob-thread-byline';
    var n = document.createElement('span');
    n.className = 'fob-thread-author';
    n.textContent = d.author.display_name;
    nameRow.appendChild(n);
    var sub = document.createElement('div');
    sub.className = 'fob-thread-submeta';
    sub.textContent = '@' + d.author.username + ' \u00B7 ' + FOB.timeAgo(d.created_at) +
      (d.edited_at ? ' \u00B7 Edited' : '');
    meta.appendChild(nameRow);
    meta.appendChild(sub);
    els.byline.appendChild(meta);

    if (d.is_current_research) {
      els.researchFlag.hidden = false;
      els.researchFlag.textContent = 'Current Research Question';
    } else if (d.research_label) {
      els.researchFlag.hidden = false;
      els.researchFlag.textContent = FOB.RESEARCH_LABELS[d.research_label] || '';
    }

    els.body.innerHTML = FOB.renderBody(d.body);

    /* Same attachments as the feed card. Opening a post must not lose
       what was attached to it. */
    var mediaHost = document.getElementById('thread-media');
    if (mediaHost && FOB.media) {
      mediaHost.innerHTML = '';
      FOB.media.forDiscussions([d.id]).then(function (byPost) {
        var items = (byPost || {})[d.id] || [];
        var node = items.length && FOB.renderMedia ? FOB.renderMedia(items) : null;
        if (node) mediaHost.appendChild(node);
      });
    }

    var parts = [d.reply_count === 1 ? '1 reply' : d.reply_count + ' replies'];
    if (d.view_count > 1) parts.push('Seen by ' + d.view_count);
    els.stats.textContent = parts.join('  \u00B7  ');

    renderReactions();
    renderActions(mine);

    if (d.is_locked) {
      els.replyForm.hidden = true;
      els.lockedNote.hidden = false;
    }
  }

  function renderReactions() {
    els.reactions.innerHTML = '';
    FOB.REACTIONS.forEach(function (r) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'fob-thread-react';
      b.setAttribute('aria-pressed', state.myReactions[r.kind] ? 'true' : 'false');
      b.innerHTML = '<span aria-hidden="true">' + r.glyph + '</span>' +
                    FOB.escapeHtml(r.label);
      b.addEventListener('click', function () { toggleReaction(r.kind, b); });
      els.reactions.appendChild(b);
    });
  }

  function renderActions(mine) {
    els.save.setAttribute('aria-pressed', state.saved ? 'true' : 'false');
    els.save.textContent = state.saved ? 'Saved' : 'Save';
    els.follow.setAttribute('aria-pressed', state.following ? 'true' : 'false');
    els.follow.textContent = state.following ? 'Following' : 'Follow';
    els.edit.hidden = !mine;
    els.remove.hidden = !mine;
  }

  function renderReplies() {
    /* One query for the whole thread, then draw. Resolving first means
       a reply never reflows as its attachment arrives. */
    if (FOB.media && state.replies.length && !state.replyMediaLoaded) {
      state.replyMediaLoaded = true;
      return FOB.media.forReplies(state.replies.map(function (r) { return r.id; }))
        .then(function (byReply) {
          state.replies.forEach(function (r) { r.media = byReply[r.id] || []; });
          drawReplies();
        });
    }
    drawReplies();
  }

  function drawReplies() {
    els.replyList.innerHTML = '';
    if (!state.replies.length) {
      els.replyList.appendChild(FOB.emptyState(
        'No replies yet', 'Be the first to respond.'
      ));
      return;
    }

    var tops = state.replies.filter(function (r) { return !r.parent_reply_id; });
    var kids = {};
    state.replies.forEach(function (r) {
      if (r.parent_reply_id) {
        (kids[r.parent_reply_id] = kids[r.parent_reply_id] || []).push(r);
      }
    });

    tops.forEach(function (r) {
      els.replyList.appendChild(replyEl(r, false));
      (kids[r.id] || []).forEach(function (k) {
        els.replyList.appendChild(replyEl(k, true));
      });
    });
  }

  function replyEl(r, nested) {
    var wrap = document.createElement('article');
    wrap.className = 'fob-thread-reply' + (nested ? ' is-nested' : '');
    wrap.id = 'reply-' + r.id;

    var head = document.createElement('div');
    head.className = 'fob-thread-card-head';
    head.appendChild(FOB.avatarEl(r.author, 30));
    var meta = document.createElement('div');
    var line = document.createElement('div');
    line.className = 'fob-thread-byline';
    var nm = document.createElement('span');
    nm.className = 'fob-thread-author';
    nm.textContent = r.author.display_name;
    line.appendChild(nm);
    var sm = document.createElement('div');
    sm.className = 'fob-thread-submeta';
    sm.textContent = FOB.timeAgo(r.created_at) + (r.edited_at ? ' \u00B7 Edited' : '');
    meta.appendChild(line);
    meta.appendChild(sm);
    head.appendChild(meta);
    wrap.appendChild(head);

    var body = document.createElement('div');
    body.className = 'fob-thread-body';
    body.innerHTML = FOB.renderBody(r.body);
    wrap.appendChild(body);

    /* Same renderer as posts, so a photo in a reply behaves exactly
       like a photo in a post: lazy, aspect-reserved, tap for lightbox. */
    if (r.media && r.media.length && FOB.renderMedia) {
      var node = FOB.renderMedia(r.media);
      if (node) wrap.appendChild(node);
    }

    var actions = document.createElement('div');
    actions.className = 'fob-thread-reply-actions';

    if (!nested && !state.discussion.is_locked) {
      var replyBtn = document.createElement('button');
      replyBtn.type = 'button';
      replyBtn.className = 'fob-community-textlink';
      replyBtn.textContent = 'Reply';
      replyBtn.addEventListener('click', function () { startReplyTo(r); });
      actions.appendChild(replyBtn);
    }

    if (r.author_id === FOB.currentProfile.id) {
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'fob-community-textlink';
      del.textContent = 'Delete';
      del.addEventListener('click', function () { deleteReply(r); });
      actions.appendChild(del);
    }

    wrap.appendChild(actions);
    return wrap;
  }

  /* ---------- actions ------------------------------------------ */
  function toggleReaction(kind, btn) {
    var uid = FOB.currentProfile.id;
    var on = !!state.myReactions[kind];

    // Optimistic, with rollback on failure.
    state.myReactions[kind] = !on;
    btn.setAttribute('aria-pressed', !on ? 'true' : 'false');

    var op = on
      ? FOB.supabase.from('discussion_reactions').delete()
          .eq('discussion_id', state.discussion.id).eq('user_id', uid).eq('kind', kind)
      : FOB.supabase.from('discussion_reactions')
          .insert({ discussion_id: state.discussion.id, user_id: uid, kind: kind });

    op.then(function (res) {
      if (res.error) throw res.error;
    }).catch(function (err) {
      state.myReactions[kind] = on;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      FOB.toast(FOB.friendlyError(err), 'error');
    });
  }

  function toggleSave() {
    var uid = FOB.currentProfile.id;
    var was = state.saved;
    state.saved = !was;
    renderActions(state.discussion.author_id === uid);

    var op = was
      ? FOB.supabase.from('saved_discussions').delete()
          .eq('discussion_id', state.discussion.id).eq('user_id', uid)
      : FOB.supabase.from('saved_discussions')
          .insert({ discussion_id: state.discussion.id, user_id: uid });

    op.then(function (r) { if (r.error) throw r.error; })
      .catch(function (err) {
        state.saved = was;
        renderActions(state.discussion.author_id === uid);
        FOB.toast(FOB.friendlyError(err), 'error');
      });
  }

  function toggleFollow() {
    var uid = FOB.currentProfile.id;
    var was = state.following;
    state.following = !was;
    renderActions(state.discussion.author_id === uid);

    var op = was
      ? FOB.supabase.from('followed_discussions').delete()
          .eq('discussion_id', state.discussion.id).eq('user_id', uid)
      : FOB.supabase.from('followed_discussions')
          .insert({ discussion_id: state.discussion.id, user_id: uid });

    op.then(function (r) { if (r.error) throw r.error; })
      .catch(function (err) {
        state.following = was;
        renderActions(state.discussion.author_id === uid);
        FOB.toast(FOB.friendlyError(err), 'error');
      });
  }

  function startReplyTo(r) {
    state.replyingTo = r.id;
    els.replyingNote.hidden = false;
    els.replyingName.textContent = r.author.display_name;
    els.replyBody.focus();
    els.replyBody.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function cancelReplyTo() {
    state.replyingTo = null;
    els.replyingNote.hidden = true;
  }

  function submitReply() {
    var body = els.replyBody.value.trim();
    var hasMedia = window.FOB.replyMedia && FOB.replyMedia.count() > 0;
    if (!body && !hasMedia) {
      FOB.setStatus(els.replyStatus,
        'Write something, or add a photo, voice note or GIF.', 'error');
      return;
    }
    if (body.length > 10000) {
      FOB.setStatus(els.replyStatus, 'Replies are limited to 10,000 characters.', 'error');
      return;
    }

    els.replySubmit.disabled = true;
    FOB.setStatus(els.replyStatus, 'Posting...', '');

    FOB.supabase.from('replies').insert({
      discussion_id: state.discussion.id,
      author_id: FOB.currentProfile.id,
      parent_reply_id: state.replyingTo,
      body: body
    }).select('id').single().then(function (res) {
      if (res.error) throw res.error;

      var attaching = (FOB.replyMedia && FOB.replyMedia.count())
        ? (FOB.setStatus(els.replyStatus, 'Uploading attachments...', ''),
           FOB.replyMedia.attachAll(res.data.id, state.discussion.id))
        : Promise.resolve({ ok: 0, failed: 0 });

      return attaching.then(function (out) {
        els.replyBody.value = '';
        cancelReplyTo();
        if (FOB.replyMedia) FOB.replyMedia.clear();
        FOB.setStatus(els.replyStatus, '');
        if (out.failed) {
          FOB.toast(out.failed + ' attachment' + (out.failed === 1 ? '' : 's') +
                    ' did not upload.', 'error');
        }
        state.replyMediaLoaded = false;
        return loadReplies().then(renderReplies);
      });
    }).catch(function (err) {
      FOB.setStatus(els.replyStatus, FOB.friendlyError(err), 'error');
    }).finally(function () {
      els.replySubmit.disabled = false;
    });
  }

  function deleteReply(r) {
    if (!window.confirm('Delete this reply? It is removed from the thread but kept for moderation.')) return;
    FOB.supabase.from('replies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', r.id)
      .select('id')
      .then(function (res) {
        if (res.error) throw res.error;
        if (!res.data || !res.data.length) {
          FOB.toast('That reply could not be deleted.', 'error');
          return null;
        }
        state.replyMediaLoaded = false;
        return loadReplies().then(renderReplies);
      })
      .catch(function (err) { FOB.toast(FOB.friendlyError(err), 'error'); });
  }

  function deleteDiscussion() {
    if (!window.confirm('Delete this discussion? It is removed from the community but kept for moderation.')) return;
    FOB.supabase.from('discussions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', state.discussion.id)
      .select('id')
      .then(function (res) {
        if (res.error) throw res.error;
        if (!res.data || !res.data.length) {
          FOB.toast(state.discussion.is_locked
            ? 'This discussion is locked and cannot be deleted.'
            : 'That discussion could not be deleted.', 'error');
          return;
        }
        window.location.href = '/community/discussions.html';
      })
      .catch(function (err) { FOB.toast(FOB.friendlyError(err), 'error'); });
  }

  function startEdit() {
    els.editBody.value = state.discussion.body;
    els.editPanel.hidden = false;
    els.body.hidden = true;
    els.editBody.focus();
  }

  function saveEdit() {
    var body = els.editBody.value.trim();
    if (!body) { FOB.toast('Post cannot be empty.', 'error'); return; }
    els.editSave.disabled = true;

    FOB.supabase.from('discussions')
      .update({ body: body })
      .eq('id', state.discussion.id)
      .then(function (res) {
        if (res.error) throw res.error;
        state.discussion.body = body;
        state.discussion.edited_at = new Date().toISOString();
        els.body.innerHTML = FOB.renderBody(body);
        els.editPanel.hidden = true;
        els.body.hidden = false;
        renderDiscussion();
      })
      .catch(function (err) { FOB.toast(FOB.friendlyError(err), 'error'); })
      .finally(function () { els.editSave.disabled = false; });
  }

  /* ---------- boot --------------------------------------------- */
  document.addEventListener('fob:ready', function () {
    [
      'category','title','byline','body','stats','reactions','researchFlag',
      'save','follow','edit','remove','replyList','replyBody','replySubmit',
      'replyStatus','replyForm','replyingNote','replyingName','lockedNote',
      'editPanel','editBody','editSave','editCancel','sort','notFound','content'
    ].forEach(function (k) {
      els[k] = document.getElementById('thread-' + k.replace(/([A-Z])/g, '-$1').toLowerCase());
    });

    var slug = slugFromUrl();
    if (!slug) { els.notFound.hidden = false; return; }

    loadDiscussion(slug)
      .then(function (d) {
        if (!d) {
          els.notFound.hidden = false;
          els.content.hidden = true;
          return null;
        }
        els.content.hidden = false;
        return Promise.all([loadReplies(), loadMyState()]);
      })
      .then(function (ok) {
        if (!ok) return;
        renderDiscussion();
        renderReplies();
        // Fire and forget: a failed view count must not break the page.
        FOB.supabase.rpc('record_discussion_view', { target: state.discussion.id })
          .then(function () {}, function () {});
      })
      .catch(function (err) {
        FOB.toast(FOB.friendlyError(err), 'error');
      });

    els.save.addEventListener('click', toggleSave);
    els.follow.addEventListener('click', toggleFollow);
    els.edit.addEventListener('click', startEdit);
    els.remove.addEventListener('click', deleteDiscussion);
    els.editSave.addEventListener('click', saveEdit);
    els.editCancel.addEventListener('click', function () {
      els.editPanel.hidden = true;
      els.body.hidden = false;
    });
    els.replySubmit.addEventListener('click', submitReply);
    document.getElementById('thread-replying-cancel')
      .addEventListener('click', cancelReplyTo);

    els.sort.addEventListener('change', function () {
      state.sort = els.sort.value;
      loadReplies().then(renderReplies);
    });
  });
})();
