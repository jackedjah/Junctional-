/* ---------------------------------------------------------------
   COMMENT SHEET

   Tapping Comment on a feed card opens this rather than expanding the
   card in place. An inline panel pushes every post below it down the
   page, which loses your reading position the moment you close it, and
   it left no room for a composer that can hold a photo.

   Everything a post can carry, a comment can carry: text, photos,
   video, voice notes, GIFs. It reuses FOB.media for compression,
   upload and addressing, and writes the same discussion_media rows a
   reply on the thread page writes, with reply_id set. One pipeline,
   one renderer, three places that use them.
   --------------------------------------------------------------- */
(function () {
  var FOB = window.FOB;
  var MAX_ITEMS = 4;

  var sheet = null;
  var current = null;      /* the discussion being commented on */
  var onCount = null;      /* callback so the card's count stays true */
  var pending = [];
  var recorder = null;

  function cfg() { return window.FOB_COMMUNITY_CONFIG || {}; }

  FOB.openComments = function (d, updateCounts) {
    build();
    current = d;
    onCount = updateCounts || null;
    clearPending();
    sheet.input.value = '';
    sheet.title.textContent = d.title || 'Comments';
    sheet.list.innerHTML = '<p class="fob-post-comment-loading">Loading...</p>';
    sheet.back.hidden = false;
    if (FOB.lockScroll) FOB.lockScroll();
    load();
  };

  /* ---------- shell ------------------------------------------ */

  function build() {
    if (sheet) return;

    var back = document.createElement('div');
    back.className = 'fob-pv-backdrop fob-comments-backdrop';
    back.hidden = true;
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.setAttribute('aria-label', 'Comments');

    var card = document.createElement('div');
    card.className = 'fob-pv-card fob-comments-card';
    card.innerHTML =
      '<div class="fob-comments-head">' +
        '<span class="fob-pv-name fob-comments-title"></span>' +
        '<button type="button" class="fob-community-btn fob-community-btn-ghost ' +
          'fob-community-btn-auto" data-act="close">Close</button>' +
      '</div>' +
      '<div class="fob-comments-list"></div>' +
      '<div class="fob-comments-compose">' +
        '<div class="fob-media-strip" data-strip hidden></div>' +
        '<textarea class="fob-post-comment-input" rows="1" ' +
          'placeholder="Write a comment"></textarea>' +
        '<div class="fob-compose-tools">' +
          '<button class="fob-tool" type="button" data-act="photo" aria-label="Add a photo or video">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m3.5 17 4.8-4.6a2 2 0 0 1 2.7 0l6.4 6.1"/></svg>' +
          '</button>' +
          '<button class="fob-tool" type="button" data-act="voice" aria-label="Record a voice note">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/></svg>' +
          '</button>' +
          '<button class="fob-tool" type="button" data-act="gif" aria-label="Add a GIF">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M10 9.5H7.8A1.8 1.8 0 0 0 6 11.3v1.4a1.8 1.8 0 0 0 1.8 1.8H10v-2.1"/><path d="M12.9 9.5v5"/><path d="M18.4 9.5h-2.6v5m0-2.7h2.2"/></svg>' +
          '</button>' +
          '<input type="file" accept="image/*,video/*" multiple hidden />' +
          '<button class="fob-community-btn fob-community-btn-primary fob-community-btn-auto" ' +
            'data-act="send" type="button">Send</button>' +
        '</div>' +
        '<div class="fob-community-status" role="status" aria-live="polite" hidden></div>' +
      '</div>';

    back.appendChild(card);
    document.body.appendChild(back);

    sheet = {
      back: back, card: card,
      title: card.querySelector('.fob-comments-title'),
      list: card.querySelector('.fob-comments-list'),
      input: card.querySelector('textarea'),
      strip: card.querySelector('[data-strip]'),
      file: card.querySelector('input[type=file]'),
      voice: card.querySelector('[data-act=voice]'),
      gif: card.querySelector('[data-act=gif]'),
      status: card.querySelector('.fob-community-status')
    };

    card.querySelector('[data-act=close]').addEventListener('click', close);
    back.addEventListener('click', function (ev) { if (ev.target === back) close(); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && sheet && !sheet.back.hidden) close();
    });

    card.querySelector('[data-act=photo]').addEventListener('click', function () {
      sheet.file.click();
    });
    sheet.file.addEventListener('change', function () {
      addFiles(Array.prototype.slice.call(sheet.file.files || []));
      sheet.file.value = '';
    });
    sheet.voice.addEventListener('click', toggleRecording);
    sheet.gif.addEventListener('click', openGif);
    card.querySelector('[data-act=send]').addEventListener('click', send);

    var flags = cfg().FEATURES || {};
    if (flags.voiceNotes === false || !window.MediaRecorder) sheet.voice.hidden = true;
    if (flags.gifs === false || !(cfg().TENOR_KEY || cfg().GIPHY_KEY)) sheet.gif.hidden = true;
  }

  function close() {
    if (!sheet || sheet.back.hidden) return;
    if (recorder && recorder.state === 'recording') recorder.stop();
    sheet.back.hidden = true;
    clearPending();
    if (FOB.unlockScroll) FOB.unlockScroll();
  }

  function say(msg, tone) {
    if (sheet && sheet.status) FOB.setStatus(sheet.status, msg, tone || 'error');
  }

  /* ---------- comments --------------------------------------- */

  function load() {
    FOB.supabase.from('replies')
      .select('id, body, created_at, author_id,' +
              'author:profiles!replies_author_id_fkey(id, username, display_name, avatar_path)')
      .eq('discussion_id', current.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(function (res) {
        if (res.error) throw res.error;
        var rows = res.data || [];
        if (!rows.length) {
          sheet.list.innerHTML =
            '<p class="fob-post-comment-loading">No comments yet. Start it off.</p>';
          return null;
        }
        /* One media query for the whole thread, resolved before drawing
           so nothing reflows as attachments arrive. */
        return FOB.media.forReplies(rows.map(function (r) { return r.id; }))
          .then(function (byReply) {
            sheet.list.innerHTML = '';
            rows.forEach(function (r) {
              r.media = byReply[r.id] || [];
              sheet.list.appendChild(commentEl(r));
            });
            sheet.list.scrollTop = sheet.list.scrollHeight;
          });
      })
      .catch(function (err) {
        sheet.list.innerHTML = '';
        sheet.list.appendChild(FOB.emptyState(
          'Could not load comments', FOB.friendlyError(err)));
      });
  }

  function commentEl(r) {
    var wrap = document.createElement('div');
    wrap.className = 'fob-post-comment';
    var av = FOB.avatarNode(r.author, 'fob-post-comment-avatar');
    if (r.author && r.author.username && FOB.markProfileTarget) {
      FOB.markProfileTarget(av, r.author.username);
    }
    wrap.appendChild(av);

    var bubble = document.createElement('div');
    bubble.className = 'fob-post-comment-bubble';

    var who = document.createElement('div');
    who.className = 'fob-post-comment-who';
    who.textContent = (r.author && (r.author.display_name || r.author.username)) || 'Member';
    if (r.author && r.author.username && FOB.markProfileTarget) {
      FOB.markProfileTarget(who, r.author.username);
    }
    bubble.appendChild(who);

    if (r.body) {
      var txt = document.createElement('div');
      txt.className = 'fob-post-comment-text';
      txt.textContent = r.body;
      bubble.appendChild(txt);
    }

    /* Same renderer as posts, so a photo in a comment behaves the same
       way: lazy, aspect reserved, tap for the lightbox. */
    if (r.media && r.media.length && FOB.renderMedia) {
      var node = FOB.renderMedia(r.media);
      if (node) bubble.appendChild(node);
    }

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
          .select('id')
          .then(function (res) {
            if (res.error) throw res.error;
            if (!res.data || !res.data.length) {
              return FOB.toast('That comment could not be deleted.', 'error');
            }
            wrap.remove();
            current.reply_count = Math.max(0, (current.reply_count || 1) - 1);
            if (onCount) onCount();
          })
          .catch(function (err) { FOB.toast(FOB.friendlyError(err), 'error'); });
      });
      wrap.appendChild(del);
    }

    return wrap;
  }

  /* ---------- attachments ------------------------------------ */

  function addFiles(files) {
    files.filter(function (f) {
        return /^image\//.test(f.type) || /^video\//.test(f.type);
      })
      .forEach(function (file) {
        if (pending.length >= MAX_ITEMS) {
          return say('Up to ' + MAX_ITEMS + ' attachments per comment.');
        }
        var isVideo = FOB.media.isVideo(file);
        var check = isVideo ? FOB.media.checkVideo(file) : FOB.media.checkImage(file);
        if (!check.ok) return say(check.reason);

        var item = {
          uid: uid(),
          kind: isVideo ? 'video' : (file.type === 'image/gif' ? 'gif' : 'image'),
          file: file, mime: file.type, status: 'ready', pct: 0,
          previewUrl: URL.createObjectURL(file)
        };
        pending.push(item);
        renderStrip();

        (isVideo ? FOB.media.readVideoMeta(file) : FOB.media.readSize(file))
          .then(function (meta) {
            item.width = meta.width;
            item.height = meta.height;
            if (meta.duration_ms) item.duration_ms = meta.duration_ms;
          });
      });
  }

  function toggleRecording() {
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      sheet.voice.removeAttribute('data-time');
      return;
    }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      return say('Recording is not supported in this browser.');
    }
    if (pending.length >= MAX_ITEMS) {
      return say('Up to ' + MAX_ITEMS + ' attachments per comment.');
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var mime = pickAudioMime();
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime })
                      : new MediaRecorder(stream);
      var chunks = [];
      var startedAt = Date.now();

      recorder.ondataavailable = function (e) {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      recorder.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        clearInterval(recorder._tick);
        sheet.voice.classList.remove('is-recording');
        sheet.voice.removeAttribute('data-time');

        var type = recorder.mimeType || 'audio/webm';
        var blob = new Blob(chunks, { type: type });
        if (blob.size > FOB.media.LIMIT_AUDIO) {
          say('That recording is too long. 5MB is the limit.');
          recorder = null;
          return;
        }
        pending.push({
          uid: uid(), kind: 'audio', blob: blob, mime: type,
          duration_ms: Date.now() - startedAt,
          previewUrl: URL.createObjectURL(blob),
          status: 'ready', pct: 0
        });
        recorder = null;
        renderStrip();
      };

      recorder.start();
      sheet.voice.classList.add('is-recording');
      recorder._tick = setInterval(function () {
        var ms = Date.now() - startedAt;
        sheet.voice.setAttribute('data-time', FOB.media.clock(ms));
        if (ms > 3 * 60 * 1000) recorder.stop();
      }, 200);
    }).catch(function (err) {
      var name = (err && err.name) || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        say('Microphone is blocked by iOS, not by this site. Check ' +
            'Settings > Apps > Safari > Camera & Microphone Access is on, ' +
            'then reload this page.');
      } else if (name === 'NotReadableError') {
        say('The microphone is being used by another app.');
      } else {
        say('Could not start recording. ' + (name || 'Unknown error') + '.');
      }
    });
  }

  function pickAudioMime() {
    var options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    for (var i = 0; i < options.length; i++) {
      if (window.MediaRecorder.isTypeSupported &&
          MediaRecorder.isTypeSupported(options[i])) return options[i];
    }
    return '';
  }

  function openGif() {
    var key = cfg().TENOR_KEY || cfg().GIPHY_KEY;
    if (!key) return say('GIF search needs a key in config.js.');
    FOB.gifPicker(key, function (gif) {
      if (pending.length >= MAX_ITEMS) {
        return say('Up to ' + MAX_ITEMS + ' attachments per comment.');
      }
      pending.push({
        uid: uid(), kind: 'gif',
        external_url: gif.url, thumbnail_url: gif.preview,
        width: gif.width, height: gif.height,
        mime: 'image/gif', previewUrl: gif.preview,
        status: 'ready', pct: 0
      });
      renderStrip();
    });
  }

  function renderStrip() {
    sheet.strip.innerHTML = '';
    sheet.strip.hidden = pending.length === 0;

    pending.forEach(function (item) {
      var cell = document.createElement('div');
      cell.className = 'fob-attach' + (item.kind === 'audio' ? ' is-audio' : '');

      if (item.kind === 'audio') {
        var a = document.createElement('audio');
        a.controls = true; a.src = item.previewUrl;
        a.className = 'fob-attach-audio';
        cell.appendChild(a);
      } else if (item.kind === 'video') {
        var v = document.createElement('video');
        v.src = item.previewUrl; v.muted = true;
        v.playsInline = true; v.preload = 'metadata';
        cell.appendChild(v);
      } else {
        var img = document.createElement('img');
        img.src = item.previewUrl; img.alt = '';
        cell.appendChild(img);
      }

      var bar = document.createElement('div');
      bar.className = 'fob-attach-progress';
      bar.style.width = item.pct + '%';
      cell.appendChild(bar);
      if (item.status === 'uploading') cell.classList.add('is-uploading');
      if (item.status === 'failed') cell.classList.add('is-failed');

      var kill = document.createElement('button');
      kill.type = 'button';
      kill.className = 'fob-attach-remove';
      kill.setAttribute('aria-label', 'Remove attachment');
      kill.innerHTML = '&times;';
      kill.addEventListener('click', function () {
        pending = pending.filter(function (i) {
          if (i.uid !== item.uid) return true;
          if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
          return false;
        });
        renderStrip();
      });
      cell.appendChild(kill);
      sheet.strip.appendChild(cell);
    });
  }

  function clearPending() {
    pending.forEach(function (i) {
      if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
    });
    pending = [];
    if (sheet && sheet.strip) {
      sheet.strip.innerHTML = '';
      sheet.strip.hidden = true;
    }
  }

  /* ---------- send ------------------------------------------- */

  function send() {
    var body = sheet.input.value.trim();
    if (!body && !pending.length) {
      return say('Write something, or add a photo, voice note or GIF.');
    }

    var btn = sheet.card.querySelector('[data-act=send]');
    btn.disabled = true;
    say('Posting...', '');

    FOB.supabase.from('replies').insert({
      discussion_id: current.id,
      author_id: FOB.currentProfile.id,
      body: body
    }).select('id').single()
      .then(function (res) {
        if (res.error) throw res.error;
        return attachAll(res.data.id);
      })
      .then(function (out) {
        sheet.input.value = '';
        clearPending();
        say('', '');
        if (out && out.failed) {
          FOB.toast(out.failed + ' attachment' + (out.failed === 1 ? '' : 's') +
                    ' did not upload.', 'error');
        }
        current.reply_count = (current.reply_count || 0) + 1;
        if (onCount) onCount();
        load();
      })
      .catch(function (err) { say(FOB.friendlyError(err)); })
      .finally(function () { btn.disabled = false; });
  }

  /* Uploads happen after the reply exists, because the insert policy on
     discussion_media checks the reply belongs to you. */
  function attachAll(replyId) {
    if (!pending.length) return Promise.resolve({ ok: 0, failed: 0 });

    var rows = [];
    var failed = 0;

    var work = pending.reduce(function (chain, item, index) {
      return chain.then(function () {
        if (item.status === 'done') return null;
        item.status = 'uploading';
        item.pct = 25;
        renderStrip();

        var base = {
          discussion_id: current.id,
          reply_id: replyId,
          author_id: FOB.currentProfile.id,
          kind: item.kind,
          mime_type: item.mime || null,
          width: item.width || null,
          height: item.height || null,
          duration_ms: item.duration_ms || null,
          position: index
        };

        if (item.external_url) {
          item.pct = 100; item.status = 'done'; renderStrip();
          rows.push(Object.assign(base, {
            external_url: item.external_url,
            thumbnail_url: item.thumbnail_url || null
          }));
          return null;
        }

        var passthrough = item.kind === 'audio' || item.kind === 'video';
        var bucket = item.kind === 'audio'
          ? FOB.media.BUCKET_AUDIO : FOB.media.BUCKET_IMAGE;
        var prepared = passthrough
          ? Promise.resolve({ blob: item.blob || item.file, mime: item.mime,
                              width: item.width, height: item.height })
          : FOB.media.prepareImage(item.file);

        return prepared.then(function (out) {
          item.pct = 65; renderStrip();
          var path = FOB.media.pathFor(FOB.media.extFor(out.mime || item.mime));
          return FOB.media.upload(bucket, path, out.blob, out.mime || item.mime)
            .then(function () {
              item.pct = 100; item.status = 'done'; renderStrip();
              rows.push(Object.assign(base, {
                bucket: bucket,
                storage_path: path,
                mime_type: out.mime || item.mime,
                width: out.width || item.width || null,
                height: out.height || item.height || null,
                byte_size: out.blob.size
              }));
            });
        }).catch(function () {
          item.status = 'failed'; item.pct = 0; failed += 1; renderStrip();
        });
      });
    }, Promise.resolve());

    return work.then(function () {
      if (!rows.length) return { ok: 0, failed: failed };
      return FOB.supabase.from('discussion_media').insert(rows)
        .then(function (res) {
          if (res.error) throw res.error;
          return { ok: rows.length, failed: failed };
        })
        .catch(function () { return { ok: 0, failed: failed + rows.length }; });
    });
  }

  function uid() { return Math.random().toString(36).slice(2, 10); }
})();
