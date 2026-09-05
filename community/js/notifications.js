/* ---------------------------------------------------------------
   NOTIFICATIONS

   Rows are written by database triggers, never by the browser, so
   this file only reads and marks notifications as read. The triggers
   skip the case where the actor is the recipient, which is why
   nothing here filters out your own activity.

   Opening the bell clears every unread notification. Notification
   rows are intentionally informational and never navigate.
   --------------------------------------------------------------- */
(function () {
  var SELECT =
    'id, kind, discussion_id, reply_id, read_at, created_at,' +
    'actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_path),' +
    'discussion:discussions!notifications_discussion_id_fkey(slug, title)';

  var els = {};
  var rows = [];

  function unreadCount() {
    return rows.filter(function (r) { return !r.read_at; }).length;
  }

  function paintBadge() {
    if (!els.badge) return;
    var n = unreadCount();
    els.badge.textContent = n > 9 ? '9+' : String(n);
    els.badge.hidden = n === 0;
  }

  function load() {
    return window.FOB.supabase.from('notifications')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .limit(40)
      .then(function (res) {
        if (res.error) throw res.error;
        rows = res.data || [];
        paintBadge();
      })
      .catch(function () { /* the bell simply shows no badge */ });
  }

  function phrase(n) {
    var who = (n.actor && (n.actor.display_name || n.actor.username)) || 'Someone';
    switch (n.kind) {
      case 'reply':          return who + ' replied to you';
      case 'reaction':       return who + ' reacted to your post';
      case 'reply_reaction': return who + ' reacted to your comment';
      case 'repost':         return who + ' reposted your post';
      case 'follow':         return who + ' followed you';
      default:         return who;
    }
  }

  function markAllRead() {
    var stamp = new Date().toISOString();
    rows.forEach(function (r) {
      if (!r.read_at) r.read_at = stamp;
    });
    paintBadge();
    return window.FOB.supabase.from('notifications')
      .update({ read_at: stamp }).is('read_at', null)
      .then(function (res) { if (res.error) throw res.error; })
      .catch(function () { /* it will still read as unread next load */ });
  }

  function render() {
    var card = els.card;
    card.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'fob-pv-top';
    var title = document.createElement('div');
    title.className = 'fob-pv-name';
    title.textContent = 'Notifications';
    head.appendChild(title);
    card.appendChild(head);

    if (!rows.length) {
      var empty = document.createElement('p');
      empty.className = 'fob-pv-empty';
      empty.textContent = 'Nothing yet. Replies, reposts and follows land here.';
      card.appendChild(empty);
    } else {
      rows.forEach(function (n) {
        var item = document.createElement('div');
        item.className = 'fob-notif' + (n.read_at ? '' : ' is-unread');

        if (n.actor) {
          item.appendChild(window.FOB.avatarNode(n.actor, 'fob-notif-avatar'));
        }

        var text = document.createElement('div');
        text.className = 'fob-notif-text';
        var line = document.createElement('div');
        line.textContent = phrase(n);
        text.appendChild(line);

        if (n.discussion && n.discussion.title) {
          var sub = document.createElement('div');
          sub.className = 'fob-notif-sub';
          sub.textContent = n.discussion.title;
          text.appendChild(sub);
        }

        var when = document.createElement('div');
        when.className = 'fob-notif-sub';
        when.textContent = window.FOB.timeAgo(n.created_at);
        text.appendChild(when);
        item.appendChild(text);

        card.appendChild(item);
      });
    }

    var done = document.createElement('button');
    done.type = 'button';
    done.className = 'fob-community-btn fob-community-btn-ghost';
    done.style.cssText = 'margin-top:10px;width:100%;';
    done.textContent = 'Close';
    done.addEventListener('click', close);
    card.appendChild(done);
  }

  function build() {
    if (els.backdrop) return;
    var backdrop = document.createElement('div');
    backdrop.className = 'fob-pv-backdrop';
    backdrop.hidden = true;
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Notifications');
    var card = document.createElement('div');
    card.className = 'fob-pv-card';
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !backdrop.hidden) close();
    });
    els.backdrop = backdrop;
    els.card = card;
  }

  function open() {
    build();
    els.backdrop.hidden = false;
    window.FOB.lockScroll();
    var cleared = markAllRead();
    render();
    cleared.then(load).then(render);
  }

  function close() {
    if (els.backdrop) els.backdrop.hidden = true;
    window.FOB.unlockScroll();
  }

  document.addEventListener('fob:ready', function () {
    var btn = document.getElementById('open-notifications');
    if (!btn) return;
    els.badge = document.getElementById('notif-badge');
    btn.addEventListener('click', open);
    load();
  });

  window.FOB.openNotifications = open;
})();
