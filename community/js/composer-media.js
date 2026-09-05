/* ---------------------------------------------------------------
   COMPOSER MEDIA

   Photo, Voice and GIF, held as a single pending list until the post
   is submitted. Nothing is uploaded on pick: a member who changes
   their mind should not have left files behind, and a post that is
   never sent should not cost storage.

   The list is the contract with composer.js. It calls attachAll(id)
   once the discussion row exists, because discussion_media has a
   foreign key and the RLS insert policy checks that the post is
   yours. That ordering is not incidental.

   Adding video later means one more picker writing the same shape
   into the same list.
   --------------------------------------------------------------- */
(function () {
  var FOB = window.FOB;
  var MAX_ITEMS = 8;

  /* { uid, kind, file|blob, mime, width, height, duration_ms,
       previewUrl, external_url, thumbnail_url, status, pct } */
  var pending = [];
  var els = {};
  var recorder = null;

  function cfg() { return window.FOB_COMMUNITY_CONFIG || {}; }

  /* Guidance the member has to act on belongs somewhere that stays put.
     A toast is gone in four seconds, which is not long enough to read a
     two-step settings path, let alone follow it. */
  function say(message) {
    var status = document.getElementById('composer-status');
    if (status && window.FOB.setStatus) {
      FOB.setStatus(status, message, 'error');
    } else {
      FOB.toast(message, 'error');
    }
  }

  FOB.composerMedia = {
    count: function () { return pending.length; },
    clear: clearAll,
    attachAll: attachAll,
    addGeneratedImage: addGeneratedImage
  };


  /* Branded FOB data cards are generated in-browser, then enter the exact
     same pending-media pipeline as a photo selected from the camera roll.
     This keeps Forum posts image-native without creating a parallel upload
     path or exposing member links. */
  function addGeneratedImage(blob, filename, width, height) {
    if (!blob || !/^image\//.test(blob.type || '')) {
      return Promise.reject(new Error('The FOB data image could not be created.'));
    }
    if (pending.length >= MAX_ITEMS) {
      return Promise.reject(new Error('Up to ' + MAX_ITEMS + ' attachments per post.'));
    }
    var file;
    try {
      file = new File([blob], filename || 'fob-data.png', { type: blob.type || 'image/png' });
    } catch (e) {
      file = blob;
      file.name = filename || 'fob-data.png';
    }
    var item = {
      uid: uid(), kind: 'image', file: file, mime: file.type || blob.type || 'image/png',
      width: width || null, height: height || null, status: 'ready', pct: 0,
      previewUrl: URL.createObjectURL(blob)
    };
    pending.push(item);
    render();
    return Promise.resolve(item);
  }
  document.addEventListener('fob:ready', function () {
    els.strip = document.getElementById('composer-media');
    els.file = document.getElementById('composer-file');
    els.photoBtn = document.getElementById('composer-photo');
    els.voiceBtn = document.getElementById('composer-voice');
    els.gifBtn = document.getElementById('composer-gif');
    els.shell = document.getElementById('composer-expanded');
    if (!els.strip || !els.file) return;

    els.photoBtn.addEventListener('click', function () { els.file.click(); });
    els.file.addEventListener('change', function () {
      addFiles(Array.prototype.slice.call(els.file.files || []));
      els.file.value = '';
    });

    els.voiceBtn.addEventListener('click', toggleRecording);
    els.gifBtn.addEventListener('click', openGifPicker);

    /* The FEATURES flags exist for exactly this: a control that cannot
       work should not be on screen. Voice also needs the browser to
       support recording at all, which Safari on older iOS does not. */
    var flags = (cfg().FEATURES || {});
    if (flags.voiceNotes === false || !window.MediaRecorder) {
      els.voiceBtn.hidden = true;
    }
    if (flags.gifs === false || !(cfg().TENOR_KEY || cfg().GIPHY_KEY)) {
      els.gifBtn.hidden = true;
    }

    /* Drag and drop onto the composer. Guarded on the drag actually
       carrying files, so dragging selected text does not arm it. */
    if (els.shell) {
      ['dragenter', 'dragover'].forEach(function (evt) {
        els.shell.addEventListener(evt, function (ev) {
          if (!hasFiles(ev)) return;
          ev.preventDefault();
          els.shell.classList.add('is-dropping');
        });
      });
      ['dragleave', 'drop'].forEach(function (evt) {
        els.shell.addEventListener(evt, function (ev) {
          if (evt === 'drop' && hasFiles(ev)) {
            ev.preventDefault();
            addFiles(Array.prototype.slice.call(ev.dataTransfer.files));
          }
          els.shell.classList.remove('is-dropping');
        });
      });
    }
  });

  function hasFiles(ev) {
    return ev.dataTransfer && ev.dataTransfer.types &&
           Array.prototype.indexOf.call(ev.dataTransfer.types, 'Files') !== -1;
  }

  /* ---------- photos ----------------------------------------- */

  function addFiles(files) {
    files.filter(function (f) {
        return /^image\//.test(f.type) || /^video\//.test(f.type);
      })
      .forEach(function (file) {
        if (pending.length >= MAX_ITEMS) {
          return FOB.toast('Up to ' + MAX_ITEMS + ' attachments per post.', 'error');
        }
        var isVideo = FOB.media.isVideo(file);
        var check = isVideo ? FOB.media.checkVideo(file) : FOB.media.checkImage(file);
        if (!check.ok) return FOB.toast(check.reason, 'error');

        var item = {
          uid: uid(),
          kind: isVideo ? 'video' : (file.type === 'image/gif' ? 'gif' : 'image'),
          file: file, mime: file.type, status: 'ready', pct: 0,
          previewUrl: URL.createObjectURL(file)
        };
        pending.push(item);
        render();

        /* Read dimensions now so the feed can reserve the right shape
           later without waiting for the image to decode. */
        (isVideo ? FOB.media.readVideoMeta(file) : FOB.media.readSize(file))
          .then(function (meta) {
            item.width = meta.width;
            item.height = meta.height;
            if (meta.duration_ms) item.duration_ms = meta.duration_ms;
          });
      });
  }

  /* ---------- voice ------------------------------------------ */

  function toggleRecording() {
    if (recorder && recorder.state === 'recording') return stopRecording();
    startRecording();
  }

  function startRecording() {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      return FOB.toast('Recording is not supported in this browser.', 'error');
    }
    if (pending.length >= MAX_ITEMS) {
      return FOB.toast('Up to ' + MAX_ITEMS + ' attachments per post.', 'error');
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      /* Container support differs by browser: Safari gives mp4, others
         webm. Ask for what is available rather than forcing one and
         getting silence on iOS. */
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
        els.voiceBtn.classList.remove('is-recording');
        els.voiceBtn.setAttribute('aria-label', 'Record a voice note');

        var type = recorder.mimeType || 'audio/webm';
        var blob = new Blob(chunks, { type: type });
        if (blob.size > FOB.media.LIMIT_AUDIO) {
          FOB.toast('That recording is too long. 5MB is the limit.', 'error');
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
      els.voiceBtn.classList.add('is-recording');
      els.voiceBtn.setAttribute('aria-label', 'Stop recording');

      /* Live timer, and a hard stop so a forgotten recording cannot
         run past what the bucket will accept. */
      recorder._tick = setInterval(function () {
        var ms = Date.now() - startedAt;
        els.voiceBtn.setAttribute('data-time', FOB.media.clock(ms));
        if (ms > 5 * 60 * 1000) stopRecording();
      }, 200);
    }).catch(function (err) {
      var name = (err && err.name) || '';

      if (name === 'NotAllowedError' || name === 'SecurityError') {
        /* Two different switches produce the same error. The per-site
           one is the obvious suspect, but iOS also has a GLOBAL Safari
           toggle, and while that is off the per-site menu does not even
           offer Microphone — so telling somebody to look for it sends
           them somewhere the option is not. Global first. */
        say('Microphone is blocked by iOS, not by this site. ' +
            'Check Settings > Apps > Safari > Camera & Microphone Access ' +
            'is on. Then reload this page and tap the mic again. ' +
            'If it is already on, tap "aA" in the address bar > ' +
            'Website Settings > Microphone > Allow.');
      } else if (name === 'NotFoundError') {
        say('No microphone found on this device.');
      } else if (name === 'NotReadableError') {
        say('The microphone is being used by another app. Close it and try again.');
      } else {
        say('Could not start recording. ' + (name || 'Unknown error') + '.');
      }
    });
  }

  function stopRecording() {
    if (recorder && recorder.state === 'recording') recorder.stop();
    els.voiceBtn.removeAttribute('data-time');
  }

  function pickAudioMime() {
    var options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    for (var i = 0; i < options.length; i++) {
      if (window.MediaRecorder.isTypeSupported &&
          MediaRecorder.isTypeSupported(options[i])) return options[i];
    }
    return '';
  }

  /* ---------- GIFs ------------------------------------------- */

  function openGifPicker() {
    var key = cfg().TENOR_KEY || cfg().GIPHY_KEY;
    if (!key) {
      return say('GIF search needs a Tenor or GIPHY key in ' +
                 'community/js/config.js.');
    }
    FOB.gifPicker(key, function (gif) {
      if (pending.length >= MAX_ITEMS) {
        return FOB.toast('Up to ' + MAX_ITEMS + ' attachments per post.', 'error');
      }
      /* Held as a provider URL rather than copied into storage: it is
         already hosted, already cached at the edge, and re-hosting
         somebody else's GIF is not ours to do. */
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

  /* ---------- pending strip ---------------------------------- */

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
        var len = document.createElement('span');
        len.className = 'fob-attach-len';
        len.textContent = FOB.media.clock(item.duration_ms);
        cell.appendChild(len);
      } else if (item.kind === 'video') {
        var vid = document.createElement('video');
        vid.src = item.previewUrl;
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = 'metadata';
        cell.appendChild(vid);
        var badge = document.createElement('span');
        badge.className = 'fob-attach-kind';
        badge.textContent = item.duration_ms
          ? FOB.media.clock(item.duration_ms) : 'Video';
        cell.appendChild(badge);
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
      kill.addEventListener('click', function () { remove(item.uid); });
      cell.appendChild(kill);

      els.strip.appendChild(cell);
    });
  }

  function remove(id) {
    pending = pending.filter(function (i) {
      if (i.uid !== id) return true;
      if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
      return false;
    });
    render();
  }

  function clearAll() {
    pending.forEach(function (i) {
      if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
    });
    pending = [];
    if (els.strip) { els.strip.innerHTML = ''; els.strip.hidden = true; }
  }

  /* ---------- publish ---------------------------------------- */

  /* Uploads happen here, after the discussion exists. Each item is
     marked as it goes so a retry cannot upload the same blob twice.
     A failure on one attachment does not lose the post: the text is
     already saved, and the member is told which part did not make it. */
  function attachAll(discussionId) {
    if (!pending.length) return Promise.resolve({ ok: 0, failed: 0 });

    var rows = [];
    var failed = 0;

    var work = pending.reduce(function (chain, item, index) {
      return chain.then(function () {
        if (item.status === 'done') return null;
        item.status = 'uploading';
        item.pct = 10;
        render();

        var base = {
          discussion_id: discussionId,
          author_id: FOB.currentProfile.id,
          kind: item.kind,
          mime_type: item.mime || null,
          width: item.width || null,
          height: item.height || null,
          duration_ms: item.duration_ms || null,
          position: index
        };

        /* Provider-hosted: nothing to upload. */
        if (item.external_url) {
          item.pct = 100;
          item.status = 'done';
          render();
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
          item.pct = 55;
          render();
          var path = FOB.media.pathFor(FOB.media.extFor(out.mime || item.mime));
          return FOB.media.upload(bucket, path, out.blob, out.mime || item.mime)
            .then(function () {
              item.pct = 100;
              item.status = 'done';
              render();
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
          item.status = 'failed';
          item.pct = 0;
          failed += 1;
          render();
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
        .catch(function () {
          return { ok: 0, failed: failed + rows.length };
        });
    });
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }
})();
