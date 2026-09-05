/* ---------------------------------------------------------------
   PARK MAP

   The park picker. MapLibre GL against the FOB MapTiler style, with a
   plain list underneath that does the same job without the map.

   The list is not a fallback bolted on afterwards. It is rendered
   first, from the same data, and the map enhances it. If MapLibre
   fails to load, if the tile request is refused, if WebGL is
   unavailable, or if somebody is using a screen reader, the list is
   already there and already works. That is also what makes this
   usable without a mouse: every park is a real button in the DOM,
   not a canvas coordinate.

   Nothing here decides what is bookable. It offers approved parks the
   server sent and reports which one was chosen; the booking endpoint
   re-resolves that id server-side and ignores anything else the
   browser claims.
   --------------------------------------------------------------- */
(function () {
  var CFG = window.FOB_BOOKING_CONFIG || {};
  var MAPLIBRE_JS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
  var MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';

  var state = {
    parks: [],
    filtered: [],
    selectedId: null,
    map: null,
    markers: {},
    onSelect: null,
    reducedMotion: false,
    borough: 'brooklyn',
    searchTerm: ''
  };

  window.FOBParkMap = {
    mount: mount,
    selected: function () { return state.selectedId; },
    /* Called after the container changes size. MapLibre measures its
       box once on create, so without this the canvas keeps the old
       dimensions and the map appears cropped inside a bigger frame. */
    resize: function () {
      if (!state.map) return;
      state.map.resize();
      frameParks(state.filtered.length ? state.filtered : state.parks);
    }
  };

  function mount(opts) {
    var host = document.getElementById(opts.hostId);
    if (!host) return;
    state.parks = opts.parks || [];
    state.borough = 'brooklyn';
    state.searchTerm = '';
    state.filtered = [];
    state.onSelect = opts.onSelect || null;
    state.reducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    host.innerHTML =
      '<div class="fob-map-borough">' +
        '<label class="fob-iq-label" for="fob-map-borough">Borough</label>' +
        '<select class="fob-iq-select" id="fob-map-borough" aria-label="Select borough">' +
          '<option value="brooklyn" selected>Brooklyn</option>' +
          '<option value="manhattan">Manhattan</option>' +
          '<option value="queens">Queens</option>' +
        '</select>' +
        '<p class="fob-map-range-note" id="fob-map-range-note" role="status" aria-live="polite"></p>' +
      '</div>' +
      '<div class="fob-map-search">' +
        '<input type="search" id="fob-map-q" autocomplete="off" ' +
          'placeholder="Search parks or neighborhoods" aria-label="Search approved parks" />' +
        '<p class="fob-map-hint" id="fob-map-hint" role="status" aria-live="polite"></p>' +
      '</div>' +
      '<label class="fob-map-toggle" for="fob-map-on">' +
        '<input type="checkbox" id="fob-map-on" />' +
        '<span class="fob-map-toggle-text">' +
          '<b>Show the map</b>' +
          '<small>Browse parks visually instead of by name</small>' +
        '</span>' +
      '</label>' +
      '<div class="fob-map-canvas" id="fob-map-canvas" hidden></div>' +
      '<div class="fob-map-sheet" id="fob-map-sheet" hidden></div>' +
      '<div class="fob-map-list" id="fob-map-list" role="listbox" ' +
        'aria-label="Approved parks"></div>';

    applyFilters();
    wireBorough();
    wireSearch();
    wireToggle();
  }

  /* ---------- the list (always present) ----------------------- */

  function boroughKey(p) {
    var b = String((p && p.borough) || '').trim().toLowerCase();
    if (b.indexOf('brooklyn') !== -1) return 'brooklyn';
    if (b.indexOf('manhattan') !== -1) return 'manhattan';
    if (b.indexOf('queens') !== -1) return 'queens';
    return b;
  }

  function updateRangeNote() {
    var note = document.getElementById('fob-map-range-note');
    if (!note) return;
    if (state.borough === 'brooklyn') {
      note.textContent = 'Choose your Brooklyn park. FOB comes to you; the exact meetup point is confirmed directly.';
    } else if (state.borough === 'manhattan') {
      note.textContent = 'Manhattan parks are welcome. Locations above Lower Manhattan will likely include a distance fee. You are always welcome to meet within FOB\'s Standard Range instead.';
    } else if (state.borough === 'queens') {
      note.textContent = 'Queens parks are welcome, but most will likely include a distance fee. You are always welcome to meet within FOB\'s Standard Range instead.';
    } else {
      note.textContent = '';
    }
  }

  function applyFilters() {
    var term = (state.searchTerm || '').trim().toLowerCase();
    var base = state.parks.filter(function (p) { return boroughKey(p) === state.borough; });
    if (!term) {
      state.filtered = base;
    } else {
      var byArea = [], byName = [];
      base.forEach(function (p) {
        var area = (p.neighborhood || '').toLowerCase();
        var name = ((p.display_name || '') + ' ' + (p.official_name || '')).toLowerCase();
        if (area.indexOf(term) !== -1) byArea.push(p);
        else if (name.indexOf(term) !== -1) byName.push(p);
      });
      state.filtered = byArea.concat(byName);
    }
    updateRangeNote();
    drawList();
    if (state.map && state.filtered.length) frameParks(state.filtered);
    syncMarkers();
  }

  function wireBorough() {
    var sel = document.getElementById('fob-map-borough');
    var q = document.getElementById('fob-map-q');
    if (!sel) return;
    sel.addEventListener('change', function () {
      state.borough = sel.value || 'brooklyn';
      state.searchTerm = '';
      if (q) q.value = '';
      state.selectedId = null;
      var sheet = document.getElementById('fob-map-sheet');
      if (sheet) sheet.hidden = true;
      if (state.onSelect) state.onSelect(null);
      var hint = document.getElementById('fob-map-hint');
      if (hint) hint.textContent = '';
      applyFilters();
    });
  }

  function drawList() {
    var host = document.getElementById('fob-map-list');
    host.innerHTML = '';

    if (!state.filtered.length) {
      var none = document.createElement('p');
      none.className = 'fob-map-empty';
      none.textContent = 'This location is outside the current FOB session network. ' +
        'You may suggest an accommodation in the notes, but the session cannot be ' +
        'confirmed there.';
      host.appendChild(none);
      return;
    }

    var LIST_CAP = 60;
    var shown = state.filtered.slice(0, LIST_CAP);

    shown.forEach(function (p) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'fob-map-row' + (p.id === state.selectedId ? ' is-on' : '') +
                      (p.gate_status === 'none' ? ' is-nogate' : '');
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', p.id === state.selectedId ? 'true' : 'false');
      row.dataset.park = p.id;

      var name = document.createElement('span');
      name.className = 'fob-map-row-name';
      name.textContent = (p.gate_status === 'none' ? '\u26A0 ' : '') +
        p.display_name + (p.is_preferred ? ' \u00B7 preferred' : '');
      if (p.id === state.selectedId) {
        var tick = document.createElement('span');
        tick.className = 'fob-map-tick';
        tick.setAttribute('aria-hidden', 'true');
        tick.textContent = '\u2713';
        row.appendChild(tick);
      }

      var where = document.createElement('span');
      where.className = 'fob-map-row-where';
      where.textContent = p.borough;

      row.appendChild(name);
      row.appendChild(where);
      row.addEventListener('click', function () { select(p.id, true); });
      host.appendChild(row);
    });

    if (state.filtered.length > LIST_CAP) {
      var more = document.createElement('p');
      more.className = 'fob-map-more-note';
      more.textContent = 'Showing ' + LIST_CAP + ' of ' + state.filtered.length +
        '. Search to narrow it down, or pick from the map.';
      host.appendChild(more);
    }
  }

  /* The map is loaded on first tick, not on page load. Nothing about
     MapLibre is fetched unless somebody actually wants it. */
  function wireToggle() {
    var box = document.getElementById('fob-map-on');
    var canvas = document.getElementById('fob-map-canvas');

    box.addEventListener('change', function () {
      var expand = document.querySelector('.fob-iq-map-expand');
      if (!box.checked) {
        canvas.hidden = true;
        if (expand) expand.hidden = true;
        return;
      }
      canvas.hidden = false;
      if (expand) expand.hidden = false;

      if (!state.map && !state.mapRequested) {
        state.mapRequested = true;
        loadMap();
      } else if (state.map) {
        /* Coming back to a map that was hidden: it needs to re-measure,
           and it should land on whatever is already chosen. */
        window.setTimeout(function () {
          state.map.resize();
          var sel = state.selectedId ? byId(state.selectedId) : null;
          if (sel) flyTo(sel);
          else syncMarkers();
        }, 60);
      }
    });
  }

  /* Selecting from the list moves the map to that park and zooms in
     close enough to see the entrance, which is the point of looking. */
  function flyTo(p) {
    if (!state.map || !p) return;
    state.map.easeTo({
      center: [Number(p.longitude), Number(p.latitude)],
      zoom: 16.2,
      duration: state.reducedMotion ? 0 : 800
    });
    syncMarkers();
  }

  /* ---------- search ------------------------------------------ */

  function wireSearch() {
    var q = document.getElementById('fob-map-q');
    var hint = document.getElementById('fob-map-hint');

    q.addEventListener('input', function () {
      state.searchTerm = q.value.trim().toLowerCase();

      if (state.selectedId) {
        state.selectedId = null;
        var sheet = document.getElementById('fob-map-sheet');
        if (sheet) sheet.hidden = true;
        if (state.onSelect) state.onSelect(null);
      }

      applyFilters();

      if (!state.searchTerm) {
        hint.textContent = '';
      } else if (!state.filtered.length) {
        hint.textContent = 'Nothing matches that in ' +
          (state.borough.charAt(0).toUpperCase() + state.borough.slice(1)) + '.';
      } else {
        var areas = {};
        state.filtered.forEach(function (p) { areas[p.neighborhood] = true; });
        var names = Object.keys(areas);
        hint.textContent = state.filtered.length + ' park' +
          (state.filtered.length === 1 ? '' : 's') +
          (names.length === 1 ? ' in ' + names[0] : '');
      }
    });
  }

  /* ---------- selection --------------------------------------- */

  function select(id, fly) {
    state.selectedId = id;
    drawList();
    syncMarkers();
    showSheet(byId(id));
    if (fly) flyTo(byId(id));
    if (state.onSelect) state.onSelect(byId(id));
  }

  function byId(id) {
    return state.parks.filter(function (p) { return p.id === id; })[0] || null;
  }

  function showSheet(p) {
    var sheet = document.getElementById('fob-map-sheet');
    if (!p) { sheet.hidden = true; return; }

    sheet.innerHTML = '';
    var h = document.createElement('h4');
    h.textContent = p.display_name;

    var sub = document.createElement('p');
    sub.className = 'fob-map-sheet-sub';
    sub.textContent = p.neighborhood + ', ' + p.borough;

    sheet.appendChild(h);
    sheet.appendChild(sub);

    if (p.gate_status === 'none') {
      var bad = el2('p', 'fob-map-flag is-bad');
      bad.textContent = 'No usable fencing. Sessions cannot run here.';
      sheet.appendChild(bad);
    } else if (p.gate_status === 'good') {
      var ok = el2('p', 'fob-map-flag is-ok');
      ok.textContent = 'Fenced courts confirmed.';
      sheet.appendChild(ok);
    } else {
      var unk = el2('p', 'fob-map-flag is-unknown');
      unk.textContent = 'Fencing not confirmed yet.';
      sheet.appendChild(unk);
    }

    if (p.operating_hours) sheet.appendChild(line('Open', p.operating_hours));
    if (p.meeting_instructions) sheet.appendChild(line('Meet at', p.meeting_instructions));
    if (p.facility_notes) sheet.appendChild(line('Space', p.facility_notes));

    /* Hands off to the maps app already on the phone. That app has live
       traffic, rerouting and a voice, none of which a route line drawn
       on our own map would have. Coordinates rather than a name, so it
       lands on the park itself and not a similarly named place. */
    var dir = document.createElement('a');
    dir.className = 'fob-map-directions';
    dir.target = '_blank';
    dir.rel = 'noopener noreferrer';
    dir.textContent = 'Directions';
    dir.setAttribute('aria-label', 'Directions to ' + p.display_name +
      ', opens your maps app');

    var lat = Number(p.latitude), lng = Number(p.longitude);
    var label = encodeURIComponent(p.display_name);
    /* Apple platforms get Apple Maps because that is what is installed
       and set as default; everywhere else Google Maps is the safe bet. */
    var apple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent || '');
    dir.href = apple
      ? 'https://maps.apple.com/?daddr=' + lat + ',' + lng + '&q=' + label
      : 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng;
    sheet.appendChild(dir);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'fob-map-sheet-x';
    close.setAttribute('aria-label', 'Close park details');
    close.innerHTML = '&times;';
    close.addEventListener('click', dismissSheet);
    sheet.appendChild(close);
    sheet.hidden = false;

    /* Tap anywhere outside to dismiss. Bound once and removed with the
       sheet, so repeated selections do not stack listeners. */
    if (state.awayHandler) {
      document.removeEventListener('click', state.awayHandler, true);
    }
    state.awayHandler = function (ev) {
      if (sheet.hidden) return;
      if (sheet.contains(ev.target)) return;
      /* A marker or list row is a different selection, not a dismissal;
         those replace the sheet rather than closing it. */
      if (ev.target.closest &&
          ev.target.closest('.fob-pin, .fob-map-row')) return;
      dismissSheet();
    };
    window.setTimeout(function () {
      document.addEventListener('click', state.awayHandler, true);
    }, 0);
  }

  /* Put the card away without un-choosing the park. Tapping the map is
     not a change of mind, and clearing the choice there silently emptied
     the form field the visitor had just filled. */
  function dismissSheet() {
    var sheet = document.getElementById('fob-map-sheet');
    if (sheet) sheet.hidden = true;
    if (state.awayHandler) {
      document.removeEventListener('click', state.awayHandler, true);
      state.awayHandler = null;
    }
  }

  /* The x is an explicit "not this one", so that one does clear it. */
  function closeSheet() {
    dismissSheet();
    state.selectedId = null;
    drawList();
    syncMarkers();
    if (state.onSelect) state.onSelect(null);
  }

  function el2(tag, cls) {
    var n = document.createElement(tag);
    n.className = cls;
    return n;
  }

  function line(label, text) {
    var w = document.createElement('p');
    w.className = 'fob-map-sheet-line';
    var b = document.createElement('b');
    b.textContent = label;
    w.appendChild(b);
    w.appendChild(document.createTextNode(' ' + text));
    return w;
  }

  /* ---------- map ---------------------------------------------- */

  function mapNote(text, retry) {
    var c = document.getElementById('fob-map-canvas');
    if (!c) return;
    c.innerHTML = '';
    c.classList.add('is-note');
    var p = document.createElement('p');
    p.className = 'fob-map-note';
    p.textContent = text;
    c.appendChild(p);
    if (retry) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'fob-map-retry';
      b.textContent = 'Try the map again';
      b.addEventListener('click', function () {
        c.classList.remove('is-note');
        c.innerHTML = '';
        loadMap();
      });
      c.appendChild(b);
    }
  }

  function loadMap() {
    var canvas = document.getElementById('fob-map-canvas');
    if (canvas) canvas.removeAttribute('aria-hidden');
    if (!CFG.MAP_STYLE_URL) {
      mapNote('The map is not configured. Pick a park from the list below.', false);
      return;
    }
    if (!window.WebGLRenderingContext) {
      mapNote('This browser cannot draw the map. Pick a park from the list below.', false);
      return;
    }

    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = MAPLIBRE_CSS;
    document.head.appendChild(css);

    var js = document.createElement('script');
    js.src = MAPLIBRE_JS;
    js.async = true;
    js.onload = initMap;
    js.onerror = function () {
      mapNote('The map could not load. Pick a park from the list below.', true);
    };
    document.head.appendChild(js);
  }

  function initMap() {
    var el = document.getElementById('fob-map-canvas');
    if (!el || !window.maplibregl) return;

    try {
      state.map = new maplibregl.Map({
        container: el,
        style: CFG.MAP_STYLE_URL,
        center: CFG.DEFAULT_CENTER || [-73.9417, 40.6872],
        zoom: CFG.DEFAULT_ZOOM || 12.4,
        minZoom: CFG.MIN_ZOOM || 10,
        maxZoom: CFG.MAX_ZOOM || 18,
        attributionControl: true,
        /* North-up. Rotation adds a gesture to get wrong and buys
           nothing when every location is inside two neighborhoods. */
        pitchWithRotate: false,
        dragRotate: false,
        touchZoomRotate: true
      });
    } catch (e) {
      mapNote('The map could not start. Pick a park from the list below.', true);
      return;
    }

    /* A style that 404s or a rejected key surfaces here rather than
       leaving an empty grey box with no explanation. */
    state.map.on('error', function (ev) {
      var msg = (ev && ev.error && ev.error.message) || '';
      if (/style|401|403|Forbidden|Unauthorized/i.test(msg)) {
        mapNote('The map style was refused. Check the MapTiler key is ' +
                'allowed on this domain. Pick a park from the list below.', true);
      }
    });

    state.map.touchZoomRotate.disableRotation();
    state.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    state.map.on('load', function () {
      /* No fit-to-all on open. With several hundred parks that frames
         two boroughs and nothing is legible; the config's resting
         position is deliberate. */
      syncMarkers();
    });

    /* moveend, not move: rebuilding mid-drag is exactly what would make
       it stutter. */
    state.map.on('moveend', syncMarkers);

    /* Tapping empty map clears the selection, which is what people
       expect and saves hunting for the close button. */
    state.map.on('click', function (ev) {
      if (ev.originalEvent && ev.originalEvent.__fobMarker) return;
      if (!state.selectedId) return;
      state.selectedId = null;
      /* Guarded. The inquiry form is torn down and rebuilt whenever the
         organization type changes, while this map instance and its click
         handler survive. If the sheet has gone, this line would throw a
         TypeError inside a Leaflet event handler and take the rest of
         the click with it. */
      var sheet = document.getElementById('fob-map-sheet');
      if (sheet) sheet.hidden = true;
      drawList();
      syncMarkers();
      if (state.onSelect) state.onSelect(null);
    });
  }

  var MAX_MARKERS = 120;

  function inView(p) {
    if (!state.map) return true;
    var b = state.map.getBounds();
    return b.contains([Number(p.longitude), Number(p.latitude)]);
  }

  /* Rebuilt on move rather than created once: with several hundred parks,
     keeping every marker in the DOM is what makes dragging stutter. */
  function syncMarkers() {
    if (!state.map) return;

    var visible = {};
    state.filtered.forEach(function (p) { visible[p.id] = true; });

    var wanted = state.filtered.filter(inView).slice(0, MAX_MARKERS);
    /* The selected park keeps its marker even if panned out of view, so
       the choice never silently loses its pin. */
    if (state.selectedId && !wanted.some(function (p) { return p.id === state.selectedId; })) {
      var sel = byId(state.selectedId);
      if (sel) wanted.push(sel);
    }

    var keep = {};
    wanted.forEach(function (p) { keep[p.id] = true; });

    Object.keys(state.markers).forEach(function (id) {
      if (!keep[id]) {
        state.markers[id].marker.remove();
        delete state.markers[id];
      }
    });

    wanted.forEach(function (p) {
      if (state.markers[p.id]) return;
      addMarker(p);
    });

    paintMarkers();
  }

  function addMarker(p) {
    var pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'fob-pin' + (p.is_preferred ? ' is-preferred' : '') +
                    (p.gate_status === 'none' ? ' is-nogate' : '');
    pin.setAttribute('aria-label', p.display_name + ', ' + p.borough);
    pin.innerHTML = '<span class="fob-pin-dot"></span><span class="fob-pin-ring"></span>';

    pin.addEventListener('click', function (ev) {
      ev.stopPropagation();
      select(p.id, true);
    });

    var marker = new maplibregl.Marker({ element: pin, anchor: 'center' })
      .setLngLat([Number(p.longitude), Number(p.latitude)])
      .addTo(state.map);

    state.markers[p.id] = { marker: marker, el: pin };
  }

  function paintMarkers() {
    var visible = {};
    state.filtered.forEach(function (p) { visible[p.id] = true; });

    Object.keys(state.markers).forEach(function (id) {
      var m = state.markers[id];
      m.el.classList.toggle('is-on', id === state.selectedId);
      m.el.classList.toggle('is-dim', !visible[id]);
    });
  }

  /* Fit every relevant park rather than guessing a zoom. Opening the
     map frames the whole approved set; searching reframes to matches. */
  function frameParks(list) {
    if (!state.map || !list || !list.length || !window.maplibregl) return;
    if (list.length === 1) {
      state.map.easeTo({
        center: [Number(list[0].longitude), Number(list[0].latitude)],
        zoom: 15,
        duration: state.reducedMotion ? 0 : 600
      });
      return;
    }
    var b = new maplibregl.LngLatBounds();
    list.forEach(function (p) { b.extend([Number(p.longitude), Number(p.latitude)]); });
    state.map.fitBounds(b, {
      padding: { top: 60, bottom: 140, left: 40, right: 40 },
      duration: state.reducedMotion ? 0 : 700,
      maxZoom: 15
    });
  }
})();
