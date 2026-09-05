/* ---------------------------------------------------------------
   REPLY MEDIA

   The same three controls as the composer, attached to the reply box.

   This deliberately does not duplicate the upload pipeline: it holds a
   pending list in the same shape and hands it to FOB.media for
   compression, upload and addressing, exactly as the composer does.
   The only difference is that the finished rows carry a reply_id, so
   one renderer and one storage path serve both.
   --------------------------------------------------------------- */
(function () {
  var FOB = window.FOB;
  var MAX_ITEMS = 4;

  var pending = [];
  var els = {};
  var recorder = null;

  function cfg() { return window.FOB_COMMUNITY_CONFIG || {}; }

  FOB.replyMedia = {
    count: function () { return pending.length; },
    clear: clearAll,
    attachAll: attachAll
  };

  document.addEventListener('fob:ready', function () {
    els.strip = document.getElementById('reply-media');
    els.file = document.getElementById('reply-file');
    els.photo = document.getElementById('reply-photo');
    els.voice = document.getElementById('reply-voice');
    els.gif = document.getElementById('reply-gif');
    els.status = document.getElementById('thread-reply-status');
    if (!els.strip || !els.file) return;

    els.photo.addEventListener('click', function () { els.file.click(); });
    els.file.addEventListener('change', function () {
      addFiles(Array.prototype.slice.call(els.file.files || []));
      els.file.value = '';
    });
    els.voice.addEventListener('click', toggleRecording);
    els.gif.addEventListener('click', openGif);

    var flags = cfg().FEATURES || {};
    if (flags.voiceNotes === false || !window.MediaRecorder) els.voice.hidden = true;
    if (flags.gifs === false || !(cfg().TENOR_KEY || cfg().GIPHY_KEY)) els.gif.hidden = true;
  });

  function say(message) {
    if (els.status && FOB.setStatus) FOB.setStatus(els.status, message, 'error');
    else FOB.toast(message, 'error');
  }

  /* ---------- pickers ---------------------------------------- */

  function addFiles(files) {
    files.filter(function (f) {
        return /^image\//.test(f.type) || /^video\//.test(f.type);
      })
      .forEach(function (file) {
        if (pending.length >= MAX_ITEMS) {
          return say('Up to ' + MAX_ITEMS + ' attachments per reply.');
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
        render();
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
      els.voice.removeAttribute('data-time');
      return;
    }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      return say('Recording is not supported in this browser.');
    }
    if (pending.length >= MAX_ITEMS) {
      return say('Up to ' + MAX_ITEMS + ' attachments per reply.');
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
        els.voice.classList.remove('is-recording');
        els.voice.removeAttribute('data-time');

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
        render();
      };

      recorder.start();
      els.voice.classList.add('is-recording');
      recorder._tick = setInterval(function () {
        var ms = Date.now() - startedAt;
        els.voice.setAttribute('data-time', FOB.media.clock(ms));
        if (ms > 3 * 60 * 1000) recorder.stop();
      }, 200);
    }).catch(function (err) {
      var name = (err && err.name) || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        say('Microphone is blocked by iOS, not by this site. ' +
            'Check Settings > Apps > Safari > Camera & Microphone Access ' +
            'is on, then reload this page.');
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
    if (!key) return say('GIF search needs a key in community/js/config.js.');
    FOB.gifPicker(key, function (gif) {
      if (pending.length >= MAX_ITEMS) {
        return say('Up to ' + MAX_ITEMS + ' attachments per reply.');
      }
      pending.push({
        uid: uid(), kind: 'gif',
        external_url: gif.url, thumbnail_url: gif.preview,
        width: gif.width, height: gif.height,
        mime: 'image/gif', previewUrl: gif.preview,
        status: 'ready', pct: 0
      });
      render();
    });
  }

  /* ---------- strip ------------------------------------------ */

  function render() {
    els.strip.innerHTML = '';
    els.strip.hidden = pending.length === 0;

    pending.forEach(function (item) {
      var cell = document.createElement('div');
      cell.className = 'fob-attach' + (item.kind === 'audio' ? ' is-audio' : '');

      if (item.kind === 'audio') {
        var play = document.createElement('audio');
        play.controls = true;
        play.src = item.previewUrl;
        play.className = 'fob-attach-audio';
        cell.appendChild(play);
      } else if (item.kind === 'video') {
        var vid = document.createElement('video');
        vid.src = item.previewUrl;
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = 'metadata';
        cell.appendChild(vid);
      } else {
        var img = document.createElement('img');
        img.src = item.previewUrl;
        img.alt = '';
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
        render();
      });
      cell.appendChild(kill);
      els.strip.appendChild(cell);
    });
  }

  function clearAll() {
    pending.forEach(function (i) {
      if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
    });
    pending = [];
    if (els.strip) { els.strip.innerHTML = ''; els.strip.hidden = true; }
  }

  /* ---------- publish ---------------------------------------- */

  function attachAll(replyId, discussionId) {
    if (!pending.length) return Promise.resolve({ ok: 0, failed: 0 });

    var rows = [];
    var failed = 0;

    var work = pending.reduce(function (chain, item, index) {
      return chain.then(function () {
        if (item.status === 'done') return null;
        item.status = 'uploading';
        item.pct = 20;
        render();

        var base = {
          discussion_id: discussionId,
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
          item.pct = 100; item.status = 'done'; render();
          rows.push(Object.assign(base, {
            external_url: item.external_url,
            thumbnail_url: item.thumbnail_url || null
          }));
          return null;
        }

        var isAudio = item.kind === 'audio';
        var passthrough = isAudio || item.kind === 'video';
        var bucket = isAudio ? FOB.media.BUCKET_AUDIO : FOB.media.BUCKET_IMAGE;
        var prepared = passthrough
          ? Promise.resolve({ blob: item.blob || item.file, mime: item.mime,
                              width: item.width, height: item.height })
          : FOB.media.prepareImage(item.file);

        return prepared.then(function (out) {
          item.pct = 60; render();
          var path = FOB.media.pathFor(FOB.media.extFor(out.mime || item.mime));
          return FOB.media.upload(bucket, path, out.blob, out.mime || item.mime)
            .then(function () {
              item.pct = 100; item.status = 'done'; render();
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
          item.status = 'failed'; item.pct = 0; failed += 1; render();
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
