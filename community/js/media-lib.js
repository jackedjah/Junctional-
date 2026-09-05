/* ---------------------------------------------------------------
   MEDIA LIBRARY

   One place that knows how media is stored, sized and addressed, so
   the composer, the feed and the thread page never disagree about it.

   Storage buckets are PRIVATE. Nothing here builds a public URL; every
   uploaded item is addressed by a signed URL that expires. They are
   fetched in batches per feed page and cached for the life of the
   page, because asking for forty signatures one at a time is what
   makes a feed feel slow.

   Adding video or documents later means adding a KIND entry and a
   renderer. Nothing in this file assumes there are only three kinds.
   --------------------------------------------------------------- */
(function () {
  var FOB = window.FOB;

  var BUCKET_IMAGE = 'community-media';
  var BUCKET_AUDIO = 'voice-notes';

  /* Bucket ceilings, mirrored from the buckets themselves. Checking here
     too means a member is told the file is too big before waiting for an
     upload that storage was always going to reject. */
  var LIMIT_IMAGE = 15 * 1024 * 1024;
  var LIMIT_AUDIO = 5 * 1024 * 1024;

  /* Compression target. Large enough that a form check or a whiteboard
     of notes stays readable, small enough to open on mobile data. */
  var MAX_EDGE = 1600;
  var QUALITY = 0.82;

  var SIGN_TTL = 60 * 60;      /* one hour */
  var signedCache = {};        /* bucket + path -> { url, expires } */

  FOB.media = {
    BUCKET_IMAGE: BUCKET_IMAGE,
    BUCKET_AUDIO: BUCKET_AUDIO,
    LIMIT_IMAGE: LIMIT_IMAGE,
    LIMIT_AUDIO: LIMIT_AUDIO
  };

  /* ---------- validation ------------------------------------- */

  FOB.media.checkImage = function (file) {
    if (!/^image\//.test(file.type)) {
      return { ok: false, reason: 'That is not an image.' };
    }
    if (file.type === 'image/gif' && file.size > LIMIT_IMAGE) {
      return { ok: false, reason: 'That GIF is too large. 15MB is the limit.' };
    }
    return { ok: true };
  };

  /* A browser cannot re-encode video at any sane cost, so there is no
     compression step: it either fits the bucket or it does not. Saying
     so up front beats a failed upload after a long wait. */
  FOB.media.checkVideo = function (file) {
    if (!/^video\//.test(file.type)) {
      return { ok: false, reason: 'That is not a video.' };
    }
    if (file.size > LIMIT_IMAGE) {
      return { ok: false, reason: 'That video is too large. 15MB is the limit. ' +
                                  'Trim it in Photos first.' };
    }
    return { ok: true };
  };

  FOB.media.isVideo = function (file) { return /^video\//.test(file.type); };

  /* Dimensions and duration, read from the file itself so the feed can
     reserve the right shape before anything downloads. */
  FOB.media.readVideoMeta = function (file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = function () {
        resolve({
          width: v.videoWidth || null,
          height: v.videoHeight || null,
          duration_ms: isFinite(v.duration) ? Math.round(v.duration * 1000) : null
        });
        URL.revokeObjectURL(url);
      };
      v.onerror = function () {
        resolve({ width: null, height: null, duration_ms: null });
        URL.revokeObjectURL(url);
      };
      v.src = url;
    });
  };

  /* ---------- compression ------------------------------------ */

  /* Animated GIFs are passed through untouched: drawing one to a canvas
     would flatten it to a single frame, which silently destroys the
     thing the member was trying to share. */
  FOB.media.prepareImage = function (file) {
    if (file.type === 'image/gif') {
      return readSize(file).then(function (dim) {
        return {
          blob: file, mime: file.type,
          width: dim.width, height: dim.height, compressed: false
        };
      });
    }

    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read that file.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('That image could not be opened.')); };
        img.onload = function () {
          var w = img.width;
          var h = img.height;
          var scale = Math.min(1, MAX_EDGE / Math.max(w, h));

          /* Already small and already modest in weight: leave it alone
             rather than re-encoding and losing quality for nothing. */
          if (scale === 1 && file.size < 900 * 1024) {
            return resolve({
              blob: file, mime: file.type,
              width: w, height: h, compressed: false
            });
          }

          var cw = Math.round(w * scale);
          var ch = Math.round(h * scale);
          var canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, cw, ch);

          canvas.toBlob(function (blob) {
            if (!blob) return reject(new Error('That image could not be processed.'));
            /* If compressing made it bigger, keep the original. */
            var useOriginal = blob.size >= file.size && scale === 1;
            resolve({
              blob: useOriginal ? file : blob,
              mime: useOriginal ? file.type : 'image/jpeg',
              width: useOriginal ? w : cw,
              height: useOriginal ? h : ch,
              compressed: !useOriginal
            });
          }, 'image/jpeg', QUALITY);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  function readSize(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(url);
      };
      img.onerror = function () {
        resolve({ width: null, height: null });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }
  FOB.media.readSize = readSize;

  /* ---------- upload ----------------------------------------- */

  /* Storage policy keys off the first path segment being the user id,
     so every path must start with it. The random suffix means the same
     file picked twice cannot collide or overwrite. */
  FOB.media.pathFor = function (ext) {
    return FOB.currentProfile.id + '/' +
           Date.now() + '-' +
           Math.random().toString(36).slice(2, 8) + '.' + ext;
  };

  FOB.media.upload = function (bucket, path, blob, mime) {
    return FOB.supabase.storage.from(bucket)
      .upload(path, blob, { contentType: mime, upsert: false })
      .then(function (res) {
        if (res.error) throw res.error;
        return path;
      });
  };

  /* ---------- addressing ------------------------------------- */

  /* Batched on purpose: one request for a page of media rather than one
     per item. Results are cached until shortly before they expire. */
  FOB.media.signMany = function (bucket, paths) {
    var now = Date.now();
    var need = [];
    paths.forEach(function (p) {
      var hit = signedCache[bucket + '|' + p];
      if (!hit || hit.expires < now) need.push(p);
    });
    if (!need.length) return Promise.resolve(mapFrom(bucket, paths));

    return FOB.supabase.storage.from(bucket)
      .createSignedUrls(need, SIGN_TTL)
      .then(function (res) {
        if (res.error) throw res.error;
        (res.data || []).forEach(function (row) {
          if (!row || row.error || !row.signedUrl) return;
          signedCache[bucket + '|' + row.path] = {
            url: row.signedUrl,
            /* Refresh a minute early so nothing is served on its last breath. */
            expires: now + (SIGN_TTL - 60) * 1000
          };
        });
        return mapFrom(bucket, paths);
      })
      .catch(function () { return mapFrom(bucket, paths); });
  };

  function mapFrom(bucket, paths) {
    var out = {};
    paths.forEach(function (p) {
      var hit = signedCache[bucket + '|' + p];
      if (hit) out[p] = hit.url;
    });
    return out;
  }

  /* Resolve every attachment on a set of posts in as few calls as the
     buckets allow, then hand each row its display url. */
  FOB.media.resolve = function (rows) {
    var byBucket = {};
    rows.forEach(function (m) {
      if (!m.storage_path || !m.bucket) return;
      (byBucket[m.bucket] = byBucket[m.bucket] || []).push(m.storage_path);
    });

    var buckets = Object.keys(byBucket);
    if (!buckets.length) {
      rows.forEach(function (m) { m.url = m.external_url || null; });
      return Promise.resolve(rows);
    }

    return Promise.all(buckets.map(function (b) {
      return FOB.media.signMany(b, byBucket[b]).then(function (map) {
        return { bucket: b, map: map };
      });
    })).then(function (results) {
      var lookup = {};
      results.forEach(function (r) { lookup[r.bucket] = r.map; });
      rows.forEach(function (m) {
        m.url = m.storage_path
          ? (lookup[m.bucket] || {})[m.storage_path] || null
          : m.external_url;
      });
      return rows;
    });
  };

  /* ---------- fetch ------------------------------------------ */

  /* One query for a whole page of posts, grouped by discussion. Called
     before rendering so a card never has to fetch its own media and
     cause a second layout pass. */
  FOB.media.forDiscussions = function (ids) {
    if (!ids || !ids.length) return Promise.resolve({});
    return FOB.supabase.from('discussion_media')
      .select('id, discussion_id, kind, bucket, storage_path, external_url,' +
              'thumbnail_url, mime_type, width, height, duration_ms, alt_text, position')
      .in('discussion_id', ids)
      .is('reply_id', null)
      .order('position')
      .then(function (res) {
        if (res.error) throw res.error;
        var rows = res.data || [];
        return FOB.media.resolve(rows).then(function () {
          var byPost = {};
          rows.forEach(function (m) {
            (byPost[m.discussion_id] = byPost[m.discussion_id] || []).push(m);
          });
          return byPost;
        });
      })
      .catch(function () { return {}; });
  };

  /* ---------- helpers ---------------------------------------- */

  /* Attachments belonging to replies, keyed by reply id. Same shape and
     same resolver as post media, so one renderer serves both. */
  FOB.media.forReplies = function (replyIds) {
    if (!replyIds || !replyIds.length) return Promise.resolve({});
    return FOB.supabase.from('discussion_media')
      .select('id, reply_id, kind, bucket, storage_path, external_url,' +
              'thumbnail_url, mime_type, width, height, duration_ms, alt_text, position')
      .in('reply_id', replyIds)
      .order('position')
      .then(function (res) {
        if (res.error) throw res.error;
        var rows = res.data || [];
        return FOB.media.resolve(rows).then(function () {
          var byReply = {};
          rows.forEach(function (m) {
            (byReply[m.reply_id] = byReply[m.reply_id] || []).push(m);
          });
          return byReply;
        });
      })
      .catch(function () { return {}; });
  };

  FOB.media.extFor = function (mime) {
    if (/gif/.test(mime)) return 'gif';
    if (/png/.test(mime)) return 'png';
    if (/webp/.test(mime)) return 'webp';
    if (/mp4/.test(mime)) return 'mp4';
    if (/webm/.test(mime)) return 'webm';
    if (/ogg/.test(mime)) return 'ogg';
    if (/mpeg/.test(mime)) return 'mp3';
    return 'jpg';
  };

  FOB.media.clock = function (ms) {
    var total = Math.max(0, Math.round((ms || 0) / 1000));
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  };
})();
