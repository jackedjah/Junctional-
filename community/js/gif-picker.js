/* ---------------------------------------------------------------
   GIF PICKER

   Tenor search in a sheet, so the member never leaves the composer.

   The key is read from config.js rather than baked in here. Tenor
   keys are per-project and rate limited, so a shared one would break
   for everybody the moment it was throttled.

   Only what is needed to render a result is kept: the media url, a
   small preview, and the dimensions. Nothing is proxied through our
   storage; a GIF stays where it is already hosted and cached.
   --------------------------------------------------------------- */
(function () {
  var FOB = window.FOB;
  var sheet = null;
  var lastQuery = '';
  var timer = null;

  FOB.gifPicker = function (key, onPick) {
    build(key, onPick);
    sheet.back.hidden = false;
    if (FOB.lockScroll) FOB.lockScroll();
    sheet.input.value = '';
    sheet.input.focus();
    load(key, '', onPick);
  };

  function build(key, onPick) {
    if (sheet) return;

    var back = document.createElement('div');
    back.className = 'fob-pv-backdrop fob-gif-backdrop';
    back.hidden = true;
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.setAttribute('aria-label', 'Search GIFs');

    var card = document.createElement('div');
    card.className = 'fob-pv-card fob-gif-card';

    var head = document.createElement('div');
    head.className = 'fob-gif-head';

    var input = document.createElement('input');
    input.type = 'search';
    input.className = 'fob-community-input';
    input.placeholder = 'Search GIFs';
    input.setAttribute('aria-label', 'Search GIFs');

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'fob-community-btn fob-community-btn-ghost fob-community-btn-auto';
    close.textContent = 'Close';
    close.addEventListener('click', hide);

    head.appendChild(input);
    head.appendChild(close);

    var grid = document.createElement('div');
    grid.className = 'fob-gif-grid';

    var note = document.createElement('p');
    note.className = 'fob-community-field-note';
    var p = provider();
    note.textContent = p ? 'Powered by ' + p.name : '';

    card.appendChild(head);
    card.appendChild(grid);
    card.appendChild(note);
    back.appendChild(card);
    document.body.appendChild(back);

    back.addEventListener('click', function (ev) {
      if (ev.target === back) hide();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && sheet && !sheet.back.hidden) hide();
    });

    /* Debounced: a request per keystroke would burn the rate limit and
       arrive out of order anyway. */
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        load(key, input.value.trim(), onPick);
      }, 320);
    });

    sheet = { back: back, card: card, input: input, grid: grid };
  }

  function hide() {
    if (!sheet) return;
    sheet.back.hidden = true;
    if (FOB.unlockScroll) FOB.unlockScroll();
  }

  function provider() {
    var c = window.FOB_COMMUNITY_CONFIG || {};
    if (c.TENOR_KEY) return { name: 'Tenor', key: c.TENOR_KEY };
    if (c.GIPHY_KEY) return { name: 'GIPHY', key: c.GIPHY_KEY };
    return null;
  }
  FOB.gifProvider = provider;

  function load(key, query, onPick) {
    if (!sheet) return;
    var p = provider();
    if (!p) return;

    lastQuery = query;
    sheet.grid.innerHTML = '<p class="fob-community-field-note">Loading...</p>';

    var url = p.name === 'Tenor' ? tenorUrl(p.key, query) : giphyUrl(p.key, query);

    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error(p.name + ' returned ' + r.status);
        return r.json();
      })
      .then(function (data) {
        /* A slower earlier request must not overwrite a newer one. */
        if (lastQuery !== query) return;
        var items = p.name === 'Tenor'
          ? (data.results || []).map(fromTenor)
          : (data.data || []).map(fromGiphy);
        paint(items.filter(Boolean), onPick);
      })
      .catch(function (err) {
        if (lastQuery !== query) return;
        sheet.grid.innerHTML =
          '<p class="fob-community-field-note">Could not reach ' + p.name +
          '. ' + String(err.message || '') +
          ' Check the key in config.js.</p>';
      });
  }

  function tenorUrl(key, query) {
    var base = query
      ? 'https://tenor.googleapis.com/v2/search?q=' + encodeURIComponent(query)
      : 'https://tenor.googleapis.com/v2/featured?';
    return base + '&key=' + encodeURIComponent(key) +
           '&client_key=fob_forums&limit=24&media_filter=tinygif,gif' +
           '&contentfilter=medium';
  }

  function giphyUrl(key, query) {
    var base = query
      ? 'https://api.giphy.com/v1/gifs/search?q=' + encodeURIComponent(query)
      : 'https://api.giphy.com/v1/gifs/trending?';
    return base + '&api_key=' + encodeURIComponent(key) +
           '&limit=24&rating=pg-13';
  }

  /* Both providers are flattened to the same shape so paint() and the
     composer never have to know which one answered. */
  function fromTenor(r) {
    var f = (r.media_formats || {});
    if (!f.gif || !f.tinygif) return null;
    return {
      url: f.gif.url, preview: f.tinygif.url,
      width: (f.gif.dims || [])[0] || null,
      height: (f.gif.dims || [])[1] || null,
      label: r.content_description || ''
    };
  }

  function fromGiphy(r) {
    var i = (r.images || {});
    var full = i.downsized_medium || i.original;
    var tiny = i.fixed_width_small || i.preview_gif || full;
    if (!full || !tiny) return null;
    return {
      url: full.url, preview: tiny.url,
      width: parseInt(full.width, 10) || null,
      height: parseInt(full.height, 10) || null,
      label: r.title || ''
    };
  }

  function paint(results, onPick) {
    sheet.grid.innerHTML = '';
    if (!results.length) {
      sheet.grid.innerHTML =
        '<p class="fob-community-field-note">Nothing found.</p>';
      return;
    }

    results.forEach(function (g) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fob-gif-cell';
      btn.setAttribute('aria-label', g.label || 'GIF');

      var img = document.createElement('img');
      img.src = g.preview;
      img.alt = g.label || '';
      img.loading = 'lazy';
      btn.appendChild(img);

      btn.addEventListener('click', function () {
        onPick(g);
        hide();
      });

      sheet.grid.appendChild(btn);
    });
  }
})();
