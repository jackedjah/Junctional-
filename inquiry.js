/* FOB SYSTEMS - adaptive inquiry engine.
   Schema-driven: six flows share one renderer and one set of field builders.
   Locations come from inquiry-locations.js (window.FOB_LOCATIONS). */
(function () {
  'use strict';

  /* A page can host more than one inquiry (personal booking and
     organisations). Each .fob-iq-root becomes its own instance. */
  function initInquiry(root) {
  var scope = root.closest('section') || document;
  var typeWrap = scope.querySelector('[data-iq-types]');
  var singleFlow = root.getAttribute('data-iq-single');
  var NETLIFY_FORM = root.getAttribute('data-iq-form') || 'fob-inquiry';
  if (!typeWrap && !singleFlow) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── utilities ── */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function timeOptions(startHour, endHour, stepMin) {
    var out = [];
    for (var m = startHour * 60; m <= endHour * 60; m += stepMin) {
      var h = Math.floor(m / 60), mm = m % 60;
      var h12 = ((h + 11) % 12) + 1;
      var label = h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + (h < 12 ? 'AM' : 'PM');
      var value = (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
      out.push({ value: value, label: label });
    }
    return out;
  }
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var TIMES = timeOptions(6, 15, 30);

  function activeLocations(borough, sport) {
    var list = (window.FOB_LOCATIONS || []).filter(function (l) {
      return l.active === true && l.gated === true && l.borough === borough;
    });
    if (sport) {
      list.sort(function (a, b) {
        var am = a.supportedSports.indexOf(sport) > -1 ? 0 : 1;
        var bm = b.supportedSports.indexOf(sport) > -1 ? 0 : 1;
        return am - bm;
      });
    }
    return list;
  }

  /* ── field builders (all return a .fob-iq-field wrapper) ── */
  var uid = 0;
  function fieldWrap(label, inputEl, hint, required) {
    var id = 'iq-f-' + (++uid);
    var w = el('div', 'fob-iq-field');
    var lab = el('label', 'fob-iq-label', label + (required ? '' : ' <span class="fob-iq-opt">optional</span>'));
    lab.setAttribute('for', id);
    inputEl.id = id;
    var err = el('p', 'fob-iq-error');
    err.id = id + '-err';
    inputEl.setAttribute('aria-describedby', err.id);
    w.appendChild(lab); w.appendChild(inputEl);
    if (hint) w.appendChild(el('p', 'fob-iq-hint', hint));
    w.appendChild(err);
    w._input = inputEl; w._err = err; w._required = !!required;
    return w;
  }
  function selectField(name, label, options, opts) {
    opts = opts || {};
    var s = el('select', 'fob-iq-select');
    s.name = name;
    s.appendChild(new Option(opts.placeholder || 'Select', ''));
    options.forEach(function (o) {
      if (typeof o === 'string') s.appendChild(new Option(o, o.toLowerCase().replace(/[^a-z0-9]+/g, '-')));
      else s.appendChild(new Option(o.label, o.value));
    });
    return fieldWrap(label, s, opts.hint, opts.required);
  }
  function textField(name, label, opts) {
    opts = opts || {};
    var i = el('input', 'fob-iq-input');
    i.type = opts.type || 'text'; i.name = name;
    if (opts.type === 'tel') { i.autocomplete = 'tel'; i.inputMode = 'tel'; }
    if (opts.placeholder) i.placeholder = opts.placeholder;
    return fieldWrap(label, i, opts.hint, opts.required);
  }
  function textareaField(name, label, opts) {
    opts = opts || {};
    var t = el('textarea', 'fob-iq-input fob-iq-textarea');
    t.name = name; t.rows = 3;
    return fieldWrap(label, t, opts.hint, opts.required);
  }
  function radioCards(name, label, options, opts) {
    opts = opts || {};
    var fs = el('fieldset', 'fob-iq-cards');
    var lg = el('legend', 'fob-iq-label', label);
    fs.appendChild(lg);
    var grid = el('div', 'fob-iq-cardgrid');
    options.forEach(function (o) {
      var val = o.value != null ? o.value : (o.label || o).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      var lab = el('label', 'fob-iq-card');
      var inp = el('input'); inp.type = 'radio'; inp.name = name; inp.value = val;
      lab.appendChild(inp);
      lab.appendChild(el('span', 'fob-iq-card-txt', o.label || o));
      if (o.note) lab.appendChild(el('span', 'fob-iq-card-note', o.note));
      grid.appendChild(lab);
    });
    fs.appendChild(grid);
    var err = el('p', 'fob-iq-error'); err.id = 'iq-f-' + (++uid) + '-err';
    fs.appendChild(err);
    fs._err = err; fs._required = !!opts.required; fs._radioName = name;
    return fs;
  }
  function scaleField(name, label, hint) {
    var w = el('div', 'fob-iq-field');
    var id = 'iq-f-' + (++uid);
    var lab = el('label', 'fob-iq-label', label); lab.setAttribute('for', id);
    var row = el('div', 'fob-iq-scale');
    var r = el('input'); r.type = 'range'; r.min = 1; r.max = 10; r.step = 1; r.value = 5; r.name = name; r.id = id;
    var out = el('output', 'fob-iq-scale-num', '5');
    r.addEventListener('input', function () { out.textContent = r.value; });
    row.appendChild(r); row.appendChild(out);
    w.appendChild(lab); w.appendChild(row);
    if (hint) w.appendChild(el('p', 'fob-iq-hint', hint));
    w._input = r;
    return w;
  }

  /* ── contact method (phone or instagram, one required) ── */
  function contactField(includeEmail) {
    var box = el('div', 'fob-iq-field');
    var opts = [{ label: 'Phone number', value: 'phone' }, { label: 'Instagram', value: 'instagram' }];
    if (includeEmail) opts.splice(1, 0, { label: 'Email', value: 'email' });
    var cards = radioCards('contactMethod', 'How should we contact you?', opts, { required: true });
    box.appendChild(cards);
    var phone = textField('phone', 'Phone number', { type: 'tel', required: true, placeholder: '(555) 555-5555' });
    var insta = textField('instagram', 'Instagram handle', { required: true, placeholder: '@yourhandle' });
    var email = includeEmail ? textField('email', 'Email address', { type: 'email', required: true }) : null;
    [phone, insta].concat(email ? [email] : []).forEach(function (f) { f.classList.add('fob-iq-reveal'); f.hidden = true; box.appendChild(f); });
    box.appendChild(el('p', 'fob-iq-hint', 'We will contact you directly to confirm the session, location, and availability.'));
    cards.addEventListener('change', function (e) {
      phone.hidden = e.target.value !== 'phone';
      insta.hidden = e.target.value !== 'instagram';
      if (email) email.hidden = e.target.value !== 'email';
    });
    box._contact = { cards: cards, phone: phone, insta: insta, email: email };
    return box;
  }

  /* ── location selector: approved parks on a map ──
     Replaces the old region dropdown. A visitor no longer picks a
     vague area and waits to be told where to go; they pick the actual
     park. The hidden locationArea / locationId / customLocation fields
     are still written so the tracker keeps its existing shape. */
  /* Real open slots, grouped by day. Replaces the day and time
     dropdowns for private sessions: those offered times that might
     already be taken, which is worse than offering fewer. */
  /* Date then time, both as selects, so it matches every other field in
     the form. Chips read like a different product bolted on, and this is
     shorter. Both lists come from real open slots. */
  function slotPicker() {
    var box = el('div', 'fob-iq-field');

    var label = el('label', 'fob-iq-label');
    label.textContent = 'When suits you?';
    box.appendChild(label);

    var row = el('div', 'fob-iq-twocol');

    var dateWrap = el('div', 'fob-iq-field');
    var dateLab = el('label', 'fob-iq-sublabel');
    dateLab.textContent = 'Date';
    var dateSel = document.createElement('input');
    dateSel.type = 'date';
    dateSel.className = 'fob-iq-input';
    dateSel.setAttribute('aria-label', 'Session date');
    dateLab.setAttribute('for', 'fob-slot-date');
    dateSel.id = 'fob-slot-date';
    dateWrap.appendChild(dateLab); dateWrap.appendChild(dateSel);

    var timeWrap = el('div', 'fob-iq-field');
    var timeLab = el('label', 'fob-iq-sublabel');
    timeLab.textContent = 'Time';
    var timeSel = document.createElement('select');
    timeSel.className = 'fob-iq-select';
    timeSel.setAttribute('aria-label', 'Session time');
    timeLab.setAttribute('for', 'fob-slot-time');
    timeSel.id = 'fob-slot-time';
    timeWrap.appendChild(timeLab); timeWrap.appendChild(timeSel);

    row.appendChild(dateWrap); row.appendChild(timeWrap);
    box.appendChild(row);

    var hidden = document.createElement('input');
    hidden.type = 'hidden'; hidden.name = 'requestedStart';
    box.appendChild(hidden);

    /* Kept so the tracker keeps receiving the names it always has. */
    var hDay = document.createElement('input');
    hDay.type = 'hidden'; hDay.name = 'preferredDay';
    var hTime = document.createElement('input');
    hTime.type = 'hidden'; hTime.name = 'preferredTime';
    box.appendChild(hDay); box.appendChild(hTime);

    box._required = true;
    box._validate = function () { return hidden.value ? '' : 'Choose a date and time.'; };

    /* The date field is a real <input type=date>; it never held options.
       It also stays enabled no matter what the endpoint says, so the
       picker always opens. */
    timeSel.innerHTML = '<option value="">Loading</option>';
    var todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    dateSel.min = todayKey;
    var note = el('p', 'fob-iq-hint fob-slot-note');
    note.hidden = true;
    box.appendChild(note);

    var byDay = {};
    var tz = 'America/New_York';

    function fillTimes() {
      var key = dateSel.value;
      timeSel.innerHTML = '';
      hidden.value = '';
      if (!key) {
        timeSel.innerHTML = '<option value="">Pick a date first</option>';
        return;
      }
      if (!byDay[key]) {
        timeSel.innerHTML = '<option value="">Nothing open that day</option>';
        return;
      }
      var blank = document.createElement('option');
      blank.value = ''; blank.textContent = 'Choose a time';
      timeSel.appendChild(blank);
      byDay[key].forEach(function (slot) {
        var o = document.createElement('option');
        o.value = slot.iso;
        o.textContent = slot.d.toLocaleTimeString('en-US',
          { hour: 'numeric', minute: '2-digit', timeZone: tz });
        timeSel.appendChild(o);
      });
    }

    dateSel.addEventListener('change', function () {
      fillTimes();
      hDay.value = dateSel.value || '';
      hTime.value = '';
    });
    timeSel.addEventListener('change', function () {
      var v = timeSel.value || '';
      /* In request mode there is no real slot, so requestedStart stays
         empty and the chosen day and time carry the intent instead. */
      hidden.value = v.indexOf('request:') === 0 ? '' : v;
      hDay.value = dateSel.value || '';
      hTime.value = v ? timeSel.options[timeSel.selectedIndex].textContent : '';
    });

    /* Booking genuinely closed. Saying so plainly is right, and there is
       nothing to pick, so the controls do close. */
    function closed(msg) {
      dateSel.disabled = true; timeSel.disabled = true;
      dateSel.setAttribute('aria-label', msg);
      timeSel.innerHTML = '<option value="">' + msg + '</option>';
      box._validate = function () { return ''; };
    }

    /* The live times could not be loaded. That is a very different thing
       from having no availability, and it must never leave a dead date
       box: the member picks any date and time and we confirm it. The same
       hidden fields are filled, so the submission is unchanged. */
    function requestMode(note) {
      dateSel.disabled = false; timeSel.disabled = false;
      dateSel.removeAttribute('min'); dateSel.removeAttribute('max');
      var today = new Date();
      dateSel.min = today.toLocaleDateString('en-CA', { timeZone: tz });
      timeSel.innerHTML = '';
      var ph = document.createElement('option');
      ph.value = ''; ph.textContent = 'Choose a time';
      timeSel.appendChild(ph);
      for (var h = 6; h <= 20; h++) {
        [0, 30].forEach(function (m) {
          var o = document.createElement('option');
          var hh = ((h + 11) % 12) + 1, ap = h < 12 ? 'AM' : 'PM';
          o.value = 'request:' + (h < 10 ? '0' : '') + h + ':' + (m ? '30' : '00');
          o.textContent = hh + ':' + (m ? '30' : '00') + ' ' + ap;
          timeSel.appendChild(o);
        });
      }
      var msg = box.querySelector('.fob-iq-hint.fob-iq-reqnote');
      if (!msg) {
        msg = el('p', 'fob-iq-hint fob-iq-reqnote');
        box.appendChild(msg);
      }
      msg.textContent = note;
      /* fillTimes() would wipe the list, so the day change only records */
      dateSel.removeEventListener('change', fillTimes);
      box._validate = function () {
        if (!dateSel.value) return 'Choose a date.';
        if (!timeSel.value) return 'Choose a time.';
        return '';
      };
    }

    fetch('/api/booking-availability?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.bookingOpen === false && !data.error) {
          closed('Not taking bookings right now');
          return;
        }
        if (!data || data.error || !data.slots || !data.slots.length) {
          requestMode('We could not load live times just now. Pick the day and time that suit you and we will confirm it with you directly.');
          return;
        }
        tz = data.timezone || tz;

        var order = [];
        data.slots.forEach(function (iso) {
          var d = new Date(iso);
          /* Key on the date as it reads in Eastern, so a late-evening
             slot does not land on tomorrow for somebody further west. */
          var key = d.toLocaleDateString('en-CA', { timeZone: tz });
          if (!byDay[key]) { byDay[key] = []; order.push(key); }
          byDay[key].push({ iso: iso, d: d });
        });

        order.sort();
        note.hidden = true;
        dateSel.min = order[0];
        dateSel.max = order[order.length - 1];
        dateSel.value = '';
        fillTimes();
      })
      .catch(function () { requestMode('We could not load live times just now. Pick the day and time that suit you and we will confirm it with you directly.'); });

    return box;
  }

  function parkSelector() {
    try { return buildParkSelector(); }
    catch (e) {
      /* Never lose the question. A basic select still lets somebody
         choose a park and still fills the same hidden fields. */
      var fb = el('div', 'fob-iq-field');
      var fl = el('label', 'fob-iq-label');
      fl.textContent = 'Where do you want to train?';
      fb.appendChild(fl);
      var sel = document.createElement('select');
      sel.className = 'fob-iq-select';
      sel.innerHTML = '<option value="">Loading parks...</option>';
      fb.appendChild(sel);
      var hid = document.createElement('input');
      hid.type = 'hidden'; hid.name = 'locationId';
      var hnm = document.createElement('input');
      hnm.type = 'hidden'; hnm.name = 'customLocation';
      var har = document.createElement('input');
      har.type = 'hidden'; har.name = 'locationArea';
      fb.appendChild(hid); fb.appendChild(hnm); fb.appendChild(har);
      fb._required = true;
      fb._validate = function () { return hid.value ? '' : 'Choose a park.'; };
      fetch('/api/booking-availability?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
        .then(function (d) {
          sel.innerHTML = '<option value="">Choose a park</option>';
          (d.parks || []).forEach(function (p) {
            var o = document.createElement('option');
            o.value = p.id;
            o.textContent = p.display_name + ' - ' + p.neighborhood;
            o.dataset.name = p.display_name;
            o.dataset.area = p.neighborhood;
            sel.appendChild(o);
          });
        });
      sel.addEventListener('change', function () {
        hid.value = sel.value;
        var o = sel.options[sel.selectedIndex];
        hnm.value = o ? (o.dataset.name || '') : '';
        har.value = o ? (o.dataset.area || '') : '';
      });
      return fb;
    }
  }

  function buildParkSelector() {
    var box = el('div', 'fob-iq-field');

    var label = el('label', 'fob-iq-label');
    label.textContent = 'Where do you want to train?';
    box.appendChild(label);

    var hint = el('p', 'fob-iq-hint');
    /* Transparency without asking anyone to classify themselves. Far
       requests stay submittable; Jah decides the range afterwards. */
    hint.textContent = '';
    hint.hidden = true;
    box.appendChild(hint);

    var host = el('div', 'fob-iq-map');
    host.id = 'fob-iq-map-host';
    box.appendChild(host);

    var expand = el('button', 'fob-iq-map-expand');
    expand.type = 'button';
    expand.hidden = true;   /* only once the map is actually showing */
    expand.textContent = 'Open map full screen';
    expand.addEventListener('click', function () {
      var on = host.classList.toggle('is-big');
      expand.textContent = on ? 'Shrink map' : 'Open map full screen';
      /* MapLibre only measures its container once, so it has to be told
         the box changed or the canvas keeps the old size. */
      window.setTimeout(function () {
        if (window.FOBParkMap && window.FOBParkMap.resize) window.FOBParkMap.resize();
      }, 260);
    });
    box.appendChild(expand);

    var chosen = el('p', 'fob-iq-picked');
    chosen.setAttribute('role', 'status');
    chosen.setAttribute('aria-live', 'polite');
    box.appendChild(chosen);

    var hiddenArea = document.createElement('input');
    hiddenArea.type = 'hidden'; hiddenArea.name = 'locationArea';
    var hiddenId = document.createElement('input');
    hiddenId.type = 'hidden'; hiddenId.name = 'locationId';
    var hiddenName = document.createElement('input');
    hiddenName.type = 'hidden'; hiddenName.name = 'customLocation';
    box.appendChild(hiddenArea); box.appendChild(hiddenId); box.appendChild(hiddenName);

    box._required = true;
    box._validate = function () {
      return hiddenId.value ? '' : 'Choose a park.';
    };

    function pick(p) {
      hiddenId.value = p ? p.id : '';
      hiddenName.value = p ? (p.display_name || p.name) : '';
      hiddenArea.value = p ? p.neighborhood : '';
      chosen.textContent = p ? 'Selected: ' + (p.display_name || p.name) + ', ' + p.neighborhood : '';
    }

    /* The map needs coordinates, which only the availability endpoint has.
       If it cannot answer we still let people choose from the approved list
       in inquiry-locations.js, so the step is never a dead end and the same
       hidden fields still reach the backend. */
    function localFallback() {
      var list = (window.FOB_LOCATIONS || []).filter(function (p) { return p.active && p.gated; });
      if (!list.length) {
        host.innerHTML = '<p class="fob-iq-hint">Locations cannot be loaded right now. ' +
          'Tell us where you would like to train in the notes and we will confirm it.</p>';
        box._validate = function () { return ''; };
        return;
      }
      host.innerHTML = '';
      var hint = el('p', 'fob-iq-hint',
        'Live map unavailable right now. Pick from the approved parks and we will confirm it with you.');
      var sel = el('select', 'fob-iq-input fob-iq-parkselect');
      sel.setAttribute('aria-label', 'Approved training parks');
      var ph = el('option', null, 'Select a park'); ph.value = '';
      sel.appendChild(ph);
      list.forEach(function (p) {
        var o = el('option', null, p.name + ' \u2014 ' + p.neighborhood);
        o.value = p.id; sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        var p = null;
        for (var i = 0; i < list.length; i++) if (list[i].id === sel.value) p = list[i];
        pick(p);
      });
      host.appendChild(hint); host.appendChild(sel);
    }

    function loadParks(attempt) {
      fetch('/api/booking-availability?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.parks || !data.parks.length) throw new Error('no parks');
          window.FOBParkMap.mount({ hostId: 'fob-iq-map-host', parks: data.parks, onSelect: pick });
        })
        .catch(function () {
          if (attempt < 1) { window.setTimeout(function () { loadParks(attempt + 1); }, 1200); return; }
          localFallback();
        });
    }
    loadParks(0);

    return box;
  }

  /* Kept for the organisation and coach flows, which are about a region
     rather than a specific park. */
  function locationSelector(getSport) {
    var box = el('div', 'fob-iq-field');
    var area = selectField('locationArea', 'Where would you prefer to train?', [
      { label: 'Brooklyn', value: 'brooklyn' },
      { label: 'Northern Manhattan', value: 'northern-manhattan' },
      { label: 'I have a private location', value: 'private' },
      { label: 'I want to suggest a location', value: 'suggest' }
    ], { required: true, hint: 'Sessions run primarily in Brooklyn, with limited availability in northern Manhattan. Final location is confirmed after contact.' });
    box.appendChild(area);
    var venue = selectField('locationId', 'Training location', [], { required: true });
    venue.classList.add('fob-iq-reveal'); venue.hidden = true; box.appendChild(venue);
    var custom = textField('customLocation', 'Court, park, or field name (or nearest cross streets)', { required: true });
    custom.classList.add('fob-iq-reveal'); custom.hidden = true; box.appendChild(custom);

    area._input.addEventListener('change', function () {
      var v = area._input.value;
      if (v === 'brooklyn' || v === 'northern-manhattan') {
        var sel = venue._input; sel.innerHTML = '';
        sel.appendChild(new Option('Select a location', ''));
        activeLocations(v, getSport ? getSport() : null).forEach(function (l) {
          sel.appendChild(new Option(l.name + ' (' + l.neighborhood + ')', l.id));
        });
        sel.appendChild(new Option('My usual court, park, or field', 'custom'));
        venue.hidden = false; custom.hidden = true;
      } else if (v === 'private' || v === 'suggest') {
        venue.hidden = true; custom.hidden = false;
      } else { venue.hidden = true; custom.hidden = true; }
    });
    venue._input.addEventListener('change', function () {
      custom.hidden = venue._input.value !== 'custom';
    });
    box._loc = { area: area, venue: venue, custom: custom };
    return box;
  }

  /* ── day / time with flexible option ── */
  function scheduleFields() {
    var box = el('div', 'fob-iq-twocol');
    var day = selectField('preferredDay', 'Preferred day', DAYS, { required: true });
    var time = selectField('preferredTime', 'Preferred start time', TIMES, { required: true });
    box.appendChild(day); box.appendChild(time);
    var wrap = el('div', 'fob-iq-field');
    wrap.appendChild(box);
    var flexLab = el('label', 'fob-iq-check');
    var flex = el('input'); flex.type = 'checkbox'; flex.name = 'flexibleSchedule';
    flexLab.appendChild(flex);
    flexLab.appendChild(el('span', null, 'My schedule is flexible'));
    wrap.appendChild(flexLab);
    var avail = textField('availabilityNotes', 'General availability', { placeholder: 'e.g. weekday mornings, Saturday before noon' });
    avail.classList.add('fob-iq-reveal'); avail.hidden = true; wrap.appendChild(avail);
    flex.addEventListener('change', function () {
      avail.hidden = !flex.checked;
      day._required = time._required = !flex.checked;
      box.classList.toggle('fob-iq-dim', flex.checked);
    });
    day._required = time._required = true;
    wrap._sched = { day: day, time: time, flex: flex, avail: avail };
    return wrap;
  }

  function formatCards(name) {
    return radioCards(name, 'How many people will be training?', [
      { label: 'One-on-one', value: 'one-on-one' },
      { label: 'Semi-private, 2 people', value: 'semi-private-2' },
      { label: 'Semi-private, 3 to 4 people', value: 'semi-private-3-4' },
      { label: 'Small group class, 6 to 8 people', value: 'group-6-8', note: 'Group class availability depends on equipment and scheduling.' }
    ], { required: true });
  }

  /* ── flow definitions ── */
  function gymFlow(form) {
    form.appendChild(textField('organizationName', 'Organization or gym name', { required: true }));
    form.appendChild(selectField('role', 'Your role', ['Owner', 'Fitness Director', 'Athletic Director', 'General Manager', 'Coach', 'Trainer', 'Program Director', 'Other']));
    form.appendChild(selectField('gymType', 'Gym type', ['Commercial gym', 'Boutique studio', 'Strength and conditioning facility', 'Sports facility', 'Private training space', 'University or school', 'Other']));
    var oregion = selectField('locationArea', 'Preferred location', [
      { label: 'Lower Manhattan', value: 'lower-manhattan' },
      { label: 'Brooklyn', value: 'brooklyn' },
      { label: 'Queens', value: 'queens' },
      { label: 'Jamaica / Eastern Queens', value: 'jamaica-eastern-queens' },
      { label: 'I am flexible', value: 'flexible' },
      { label: 'We already have a possible training space', value: 'have-space' }
    ], { required: true });
    form.appendChild(oregion);
    var ospace = textField('customLocation', 'Specific location or neighborhood', { required: true });
    ospace.classList.add('fob-iq-reveal'); ospace.hidden = true; form.appendChild(ospace);
    oregion._input.addEventListener('change', function () {
      ospace.hidden = oregion._input.value !== 'have-space';
    });
    form.appendChild(selectField('interest', 'What are you interested in?', ['Product demonstration', 'Staff training', 'Member workshop', 'Pilot class', 'Recurring classes', 'Athlete development', 'Equipment partnership', 'Larger partnership or pitch', 'Not sure yet'], { required: true }));
    form.appendChild(selectField('participants', 'Approximate number of participants', [
      { label: 'Under 10', value: 'under-10' }, { label: '10 to 25', value: '10-25' },
      { label: '25 to 60', value: '25-60' }, { label: '60 or more', value: '60-plus' }
    ]));
    form.appendChild(selectField('meetingFormat', 'Preferred meeting format', ['Meet at the gym', 'Phone call', 'Video call', 'FOB demonstration', 'Open to suggestions']));
    form.appendChild(contactField(true));
    form.appendChild(textareaField('message', 'Details'));
  }

  var flows = {
    /* coach certification interest: minimal, it is a waiting list */
    coach: function (form) {
      form.appendChild(textField('name', 'Your name', { required: true }));
      form.appendChild(selectField('role', 'What do you do now?', [
        'Personal trainer', 'Strength coach', 'Sport coach', 'Physical therapist or rehab',
        'Group fitness instructor', 'Gym owner', 'Student', 'Other'
      ], { required: true }));
      form.appendChild(textField('city', 'Where are you based?'));
      form.appendChild(contactField(true));
      form.appendChild(textareaField('message', 'Anything you want us to know?'));
    },

    /* homepage booking: the fewest fields that still let Jah confirm a session */
    session: function (form) {
      form.appendChild(textField('name', 'Your name', { required: true }));
      /* Yes or no first, then the detail only if it applies. Asking
         everybody to scroll a sport list they do not belong in was the
         longest field in the form for the least information. */
      var active = selectField('recreationalActive',
        'Do you participate in recreational fitness or athletics?', [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ], { required: true });
      form.appendChild(active);

      var what = selectField('sport', 'What do you do?', [
        'General fitness',
        'Strength and muscle endurance',
        'Conditioning',
        'Core strength and body control',
        'Tennis',
        'Handball',
        'Pickleball',
        'Basketball',
        'Boxing or martial arts',
        'Golf',
        'Another sport'
      ], { required: true });
      what.classList.add('fob-iq-reveal');
      what.hidden = true;
      form.appendChild(what);

      /* Said plainly rather than left as an inference. Somebody answering
         "no" should know that is what it means and that it is fine. */
      var sedentary = el('p', 'fob-iq-note');
      sedentary.textContent = 'Noted as currently sedentary. That is a normal place ' +
        'to start and sessions are built from there.';
      sedentary.hidden = true;
      form.appendChild(sedentary);

      active._input.addEventListener('change', function () {
        var yes = active._input.value === 'yes';
        what.hidden = !yes;
        sedentary.hidden = yes || !active._input.value;
        if (!yes && what._input) what._input.value = '';
      });
      form.appendChild(parkSelector());
      form.appendChild(slotPicker());
      form.appendChild(contactField(false));
      form.appendChild(textareaField('message', 'Anything else we should know?'));
    },

    athlete: function (form) {
      form.appendChild(el('blockquote', 'fob-iq-excerpt',
        'Your sport asks you to repeat explosive upper-body and core actions long after the first clean rep. The problem is not whether you can produce one hard swing, throw, strike, or change of direction. It is how quickly your speed, control, and power fall off as fatigue builds. FOB training develops durability, fatigability, repeatability, and resilience so more of your force is still available on the next point, rally, possession, or round. The goal is simple: stay dangerous deeper into play.'));
      var sport = selectField('sport', 'What sport do you play?', ['Tennis', 'Handball', 'Golf', 'Badminton', 'Basketball', 'Baseball', 'Softball', 'Boxing', 'Martial Arts', 'Volleyball', 'Pickleball', 'Lacrosse', 'Swimming', 'Rowing', 'Climbing', 'Other'], { required: true });
      form.appendChild(sport);
      var sportOther = textField('sportOther', 'Your sport', { required: true });
      sportOther.classList.add('fob-iq-reveal'); sportOther.hidden = true; form.appendChild(sportOther);
      sport._input.addEventListener('change', function () { sportOther.hidden = sport._input.value !== 'other'; });

      form.appendChild(radioCards('playEnough', 'Are you able to play as much or as often as you would like?', [
        { label: 'Yes' }, { label: 'Not really' }, { label: 'It depends' }, { label: 'I am returning after time away', value: 'returning' }
      ], { required: true }));
      form.appendChild(selectField('currentFrequency', 'How often do you currently play?', [
        { label: 'Less than once per week', value: 'lt-1-per-week' },
        { label: 'Once per week', value: '1-per-week' },
        { label: 'Two to three times per week', value: '2-3-per-week' },
        { label: 'Four or more times per week', value: '4-plus-per-week' },
        { label: 'Seasonal or inconsistent', value: 'seasonal' }
      ], { required: true }));
      form.appendChild(scaleField('competitiveLevel', 'How competitive are you?', '1 means casual. 10 means Michael Jordan-level obsession.'));
      form.appendChild(formatCards('trainingFormat'));
      form.appendChild(parkSelector());
      form.appendChild(slotPicker());
      form.appendChild(contactField(false));
      form.appendChild(textareaField('message', 'Anything else we should know?'));
    },

    individual: function (form) {
      form.appendChild(selectField('interest', 'What are you most interested in?', ['General fitness', 'Conditioning', 'Muscle endurance', 'Core and movement control', 'Learning FOB', 'Returning to exercise', 'Other'], { required: true }));
      form.appendChild(formatCards('trainingFormat'));
      form.appendChild(parkSelector());
      form.appendChild(slotPicker());
      form.appendChild(contactField(false));
      form.appendChild(textareaField('message', 'Anything else we should know?'));
    },

    gym: gymFlow,
    privateGym: gymFlow,

    outdoorEvent: function (form) {
      form.appendChild(textField('eventName', 'Event name', { required: true }));
      form.appendChild(selectField('eventType', 'Type of event', ['Community fitness event', 'Sports event', 'Wellness event', 'Brand activation', 'Park class', 'Private gathering', 'Other'], { required: true }));
      form.appendChild(selectField('participants', 'Estimated number of people', [
        { label: 'Under 20', value: 'under-20' }, { label: '20 to 50', value: '20-50' },
        { label: '50 to 150', value: '50-150' }, { label: '150 or more', value: '150-plus' }
      ]));
      form.appendChild(textField('preferredDate', 'Preferred date', { type: 'date' }));
      form.appendChild(textField('eventLocation', 'Location'));
      form.appendChild(selectField('involvement', 'Desired FOB involvement', ['Live FOB demonstration', 'Participant workout', 'Short competition or challenge', 'Educational station', 'Full class', 'Not sure yet'], { required: true }));
      form.appendChild(contactField(true));
      form.appendChild(textareaField('message', 'Notes'));
    },

    presentation: function (form) {
      form.appendChild(textField('organizationName', 'Organization name', { required: true }));
      form.appendChild(selectField('audience', 'Who is the audience?', ['Athletes', 'Coaches', 'Personal trainers', 'Students', 'Fitness professionals', 'Physical performance staff', 'Entrepreneurs', 'General audience', 'Other']));
      form.appendChild(selectField('audienceSize', 'Approximate audience size', [
        { label: 'Under 25', value: 'under-25' }, { label: '25 to 75', value: '25-75' },
        { label: '75 to 200', value: '75-200' }, { label: '200 or more', value: '200-plus' }
      ]));
      form.appendChild(textareaField('outcome', 'What should the audience understand or leave with?'));
      form.appendChild(selectField('format', 'Presentation format', ['Talk', 'Seminar', 'Demonstration', 'Interactive workshop', 'Panel', 'Classroom presentation', 'Not sure yet']));
      form.appendChild(selectField('length', 'Desired length', [
        { label: '20 to 30 minutes', value: '20-30' }, { label: '45 to 60 minutes', value: '45-60' },
        { label: '90 minutes or more', value: '90-plus' }, { label: 'Flexible', value: 'flexible' }
      ]));
      form.appendChild(textField('preferredDate', 'Preferred date', { type: 'date' }));
      form.appendChild(selectField('venue', 'Location or virtual', [
        { label: 'In person', value: 'in-person' }, { label: 'Virtual', value: 'virtual' }, { label: 'Either', value: 'either' }
      ]));
      form.appendChild(contactField(true));
      form.appendChild(textareaField('message', 'Context'));
    }
  };

  /* ── render + progressive disclosure ── */
  var currentType = null;
  var fieldLabels = {
    sport: 'Primary interest',
    preferredTime: 'Preferred start time',
    inquiryFocus: 'Inquiring about',
    recreationalActive: 'Recreationally active',
    locationArea: 'Preferred location',
    customLocation: 'Specific location',
    contactMethod: 'Contact method',
    instagram: 'Instagram',
    phone: 'Phone',
    name: 'Name',
    message: 'Notes'
  };

  var typeLabels = { session: 'First Session Booking', coach: 'Coach Certification Interest', individual: 'Individual', athlete: 'Athlete', gym: 'Gym', privateGym: 'Private Gym', outdoorEvent: 'Outdoor Event', presentation: 'Presentation / Seminar' };

  if (!typeWrap) {
    currentType = singleFlow;
    renderFlow(singleFlow);
    return startSingle();
  }

  /* One selection path, shared by the tap handler and by the default below,
     so the painted button state and the rendered flow can never disagree. */
  function selectType(btn) {
    if (!btn) return;
    var type = btn.getAttribute('data-iq-type');
    typeWrap.querySelectorAll('[data-iq-type]').forEach(function (b) {
      b.classList.toggle('sel', b === btn);
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    });
    if (type === currentType) return;
    currentType = type;
    renderFlow(type);
  }

  typeWrap.addEventListener('click', function (e) {
    selectType(e.target.closest('[data-iq-type]'));
  });

  /* Default selection. The group inquiry now opens on Gym or training
     facility instead of an unanswered question above an empty panel. The
     choice is declared in the markup as data-iq-default and falls back to the
     first option, so changing it later is a markup edit, not a code edit.

     Two things this deliberately does not do. It runs during initial script
     execution, which is parser-blocking at the end of <body>, so the flow is
     in the DOM before first paint and this section's height is final on frame
     one, matching the session inquiry. And it never moves the page: show() is
     not called during wizard setup, so positionPanel() and its scrollTo
     cannot fire from here. */
  var wantType = typeWrap.getAttribute('data-iq-default');
  selectType(
    (wantType && typeWrap.querySelector('[data-iq-type="' + wantType + '"]'))
    || typeWrap.querySelector('[data-iq-type]')
  );

  function startSingle() { /* flow already rendered; handlers are bound in renderFlow */ }

  /* ── step wizard ───────────────────────────────────────────────────
     The flow builders are untouched: they still append their fields to a
     single form. Afterwards each top-level field group is wrapped in a
     step and shown one at a time. Inactive steps are hidden with CSS, not
     the hidden attribute, so isHidden() still reports them as visible and
     collect()/validate() keep seeing every field exactly as before. */
  function stepFields(step) {
    return {
      wraps: step.querySelectorAll('.fob-iq-field'),
      sets: step.querySelectorAll('fieldset.fob-iq-cards')
    };
  }
  function validateStep(step) {
    step.querySelectorAll('.fob-iq-error').forEach(function (p) { p.textContent = ''; });
    step.querySelectorAll('.err').forEach(function (n) { n.classList.remove('err'); });
    var bad = null, f = stepFields(step);
    Array.prototype.forEach.call(f.wraps, function (w) {
      if (!w._required || !w._input || isHidden(w)) return;
      if (!String(w._input.value || '').trim()) bad = bad || fail(w, 'This field is required.');
    });
    Array.prototype.forEach.call(f.sets, function (fs) {
      if (!fs._required || isHidden(fs)) return;
      if (!fs.querySelector('input:checked')) bad = bad || fail(fs, 'Choose one option.');
    });
    if (bad) {
      var focusable = bad._input || bad.querySelector('input,select,textarea,button');
      if (focusable && focusable.focus) focusable.focus();
      if (bad.scrollIntoView) bad.scrollIntoView({ block: 'nearest' });
    }
    return !bad;
  }

  function stepComplete(step) {
    var ok = true;
    Array.prototype.forEach.call(step.querySelectorAll('.fob-iq-field'), function (w) {
      if (!w._required || !w._input || isHidden(w)) return;
      if (!String(w._input.value || '').trim()) ok = false;
    });
    Array.prototype.forEach.call(step.querySelectorAll('fieldset.fob-iq-cards'), function (fs) {
      if (!fs._required || isHidden(fs)) return;
      if (!fs.querySelector('input:checked')) ok = false;
    });
    return ok;
  }

  function wizardize(form, tail, consent, submit) {
    var groups = Array.prototype.filter.call(form.children, function (n) { return n !== tail; });
    if (!groups.length) return null;

    var rail = el('div', 'fob-iq-rail');
    rail.setAttribute('role', 'tablist');
    rail.setAttribute('aria-label', 'Inquiry sections');
    var stage = el('div', 'fob-iq-stage');
    var track = el('div', 'fob-iq-steps');

    var steps = [];
    groups.forEach(function (node) {
      var isFollowOn = node.hidden ||
        (node.classList && (node.classList.contains('fob-iq-reveal') || node.classList.contains('fob-iq-note')));
      if (isFollowOn && steps.length) { steps[steps.length - 1].appendChild(node); return; }
      var st = el('div', 'fob-iq-step');
      st.appendChild(node); track.appendChild(st); steps.push(st);
    });
    var finalStep = el('div', 'fob-iq-step fob-iq-step--final');
    finalStep.appendChild(tail); track.appendChild(finalStep); steps.push(finalStep);

    var prev = el('button', 'fob-iq-arrow fob-iq-prev');
    prev.type = 'button'; prev.setAttribute('aria-label', 'Previous step');
    prev.innerHTML = '<span aria-hidden="true">&#8592;</span>';
    var next = el('button', 'fob-iq-arrow fob-iq-next');
    next.type = 'button'; next.setAttribute('aria-label', 'Next step');
    next.innerHTML = '<span aria-hidden="true">&#8594;</span>';
    stage.appendChild(prev); stage.appendChild(track); stage.appendChild(next);
    form.appendChild(rail); form.appendChild(stage);

    /* one diamond per section. Any of them can be reached at any time —
       nothing is gated. Only the send button waits for a complete form. */
    var marks = steps.map(function (st, i) {
      var d = el('button', 'fob-iq-diamond');
      d.type = 'button'; d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', 'Section ' + (i + 1) + ' of ' + steps.length);
      d.addEventListener('click', function () { show(i); });
      rail.appendChild(d); return d;
    });

    var at = 0;
    function paint() {
      marks.forEach(function (m, i) {
        m.classList.toggle('is-on', i === at);
        if (i === at) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current');
        m.setAttribute('aria-selected', i === at ? 'true' : 'false');
      });
      prev.disabled = at === 0;
      next.disabled = at === steps.length - 1;
    }
    function refreshSubmit() {
      var all = steps.every(stepComplete) && consent.checked;
      submit.disabled = !all;
      submit.classList.toggle('is-locked', !all);
      submit.title = all ? '' : 'Fill in every section to send.';
      paint();
    }
    /* The panel is one moving object: its height eases to whatever the next
       question needs, so nothing jumps, nothing crops and the page under it
       never lurches. Height is only pinned during the change; the rest of
       the time it is auto, so a map or a revealed field can still grow. */
    var hTimer = null;
    var sessionFrameTop = null;

    function sessionFrameParts() {
      var section = form.closest('#book');
      if (!section) return null;
      var north = section.previousElementSibling;
      while (north && !(north.classList && north.classList.contains('fob-scroll-div'))) north = north.previousElementSibling;
      var south = section.nextElementSibling;
      while (south && !(south.classList && south.classList.contains('fob-scroll-div'))) south = south.nextElementSibling;
      return north && south ? { section:section, north:north, south:south } : null;
    }

    function liveSessionFrameTop(head) {
      var parts = sessionFrameParts();
      if (!parts) return null;
      var nr = parts.north.getBoundingClientRect(), sr = parts.south.getBoundingClientRect();
      var northAbs = window.pageYOffset + nr.top + nr.height / 2;
      var southAbs = window.pageYOffset + sr.top + sr.height / 2;
      var frameCenterAbs = (northAbs + southAbs) / 2;
      var usableCenter = head + (window.innerHeight - head) / 2;
      return Math.max(0, frameCenterAbs - usableCenter);
    }

    /* Non-map prompts deliberately share one fixed phone framing. The first
       calibrated prompt establishes the north/south divider composition and
       every normal step returns to that same scrollTop. The park-map step is
       the one exception because its expandable map/list needs its live height. */
    function positionPanel(instant) {
      var nav = document.querySelector('.fob-nav, header');
      var head = nav && getComputedStyle(nav).position === 'fixed'
        ? nav.getBoundingClientRect().height : 0;

      if (singleFlow === 'session') {
        var active = steps[at];
        var isMap = !!(active && active.querySelector('.fob-iq-parkmap, [data-park-map], #fob-park-map'));
        var target;
        if (isMap) {
          target = liveSessionFrameTop(head);
        } else {
          if (sessionFrameTop === null) sessionFrameTop = liveSessionFrameTop(head);
          target = sessionFrameTop;
        }
        if (target !== null) {
          if (Math.abs(window.pageYOffset - target) >= 2) {
            window.scrollTo({
              top: target,
              behavior: (instant || reduceMotion) ? 'auto' : 'smooth'
            });
          }
          return;
        }
      }

      /* Organization flows keep their established panel-top positioning. */
      var panel = form.closest('.fob-iq-shell') || form;
      var drift = panel.getBoundingClientRect().top - (head + 18);
      if (Math.abs(drift) < 2) return;
      window.scrollTo({
        top: Math.max(0, window.pageYOffset + drift),
        behavior: (instant || reduceMotion) ? 'auto' : 'smooth'
      });
    }

    if (singleFlow === 'session') {
      window.FOBPositionSessionInquiry = function (instant) {
        positionPanel(!!instant);
      };
      window.addEventListener('resize', function () { sessionFrameTop = null; }, { passive:true });
      window.addEventListener('orientationchange', function () { sessionFrameTop = null; });
    }

    function show(i, instant) {
      if (i === at || i < 0 || i >= steps.length) return;
      var dir = i > at ? 1 : -1, cur = steps[at], nx = steps[i];
      var from = track.offsetHeight;
      at = i;
      cur.classList.remove('is-active', 'in-r', 'in-l');
      cur.style.transform = ''; cur.style.opacity = '';
      nx.classList.remove('in-r', 'in-l');
      nx.style.transform = ''; nx.style.opacity = '';
      nx.classList.add('is-active');
      var to = nx.offsetHeight;
      if (!reduceMotion && !instant) {
        track.classList.add('is-moving');
        track.style.height = from + 'px';
        void track.offsetWidth;
        nx.classList.add(dir > 0 ? 'in-r' : 'in-l');
        requestAnimationFrame(function () { track.style.height = to + 'px'; });
        window.clearTimeout(hTimer);
        hTimer = window.setTimeout(function () {
          track.style.height = '';
          track.classList.remove('is-moving');
          nx.classList.remove('in-r', 'in-l');
          positionPanel(true);
        }, 280);
      }
      paint();
      requestAnimationFrame(function () { positionPanel(false); });
      if (window.FOBParkMap && window.FOBParkMap.resize &&
          nx.querySelector('.fob-iq-parkmap, [data-park-map], #fob-park-map')) {
        window.setTimeout(function () { window.FOBParkMap.resize(); }, 80);
      }
    }

    /* Drag handling: the panel follows the thumb, so the gesture feels
       attached rather than fired-and-forgotten. A vertical drag is handed
       straight back to the page and two fingers are always left alone. */
    var swipeZone = form.closest('.fob-iq-shell') || form;
    var x0 = null, y0 = null, t0 = 0, lock = null;
    function reset(animate) {
      var st = steps[at];
      st.style.transition = animate ? 'transform .22s cubic-bezier(.22,1,.36,1),opacity .22s' : '';
      st.style.transform = ''; st.style.opacity = '';
      if (animate) window.setTimeout(function () { st.style.transition = ''; }, 240);
    }
    swipeZone.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) { x0 = null; reset(true); return; }
      if (e.target.closest && e.target.closest('input,select,textarea,button,a,.fob-iq-parkmap,[data-park-map],#fob-park-map')) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); lock = null;
    }, { passive: true });
    swipeZone.addEventListener('touchmove', function (e) {
      if (x0 === null) return;
      if (e.touches.length > 1) { x0 = null; reset(true); return; }
      var dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
      if (lock === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (lock !== 'x') return;
      var edge = (dx > 0 && at === 0) || (dx < 0 && at === steps.length - 1);
      var pull = Math.max(-90, Math.min(90, dx * (edge ? 0.16 : 0.42)));
      var st = steps[at];
      st.style.transition = '';
      st.style.transform = 'translateX(' + pull + 'px)';
      st.style.opacity = String(Math.max(0.55, 1 - Math.abs(pull) / 240));
    }, { passive: true });
    function endDrag(e) {
      if (x0 === null) return;
      var dx = (e.changedTouches ? e.changedTouches[0].clientX : x0) - x0;
      /* a flick only counts if it actually took time; otherwise judge on
         distance, so a stray 15px twitch never changes the question */
      var ms = Date.now() - t0;
      var fast = ms >= 20 && (Math.abs(dx) / ms) > 0.32;
      var go = lock === 'x' && (Math.abs(dx) > 42 || (fast && Math.abs(dx) > 24));
      var target = dx < 0 ? at + 1 : at - 1;
      x0 = y0 = null; lock = null;
      if (go && target >= 0 && target < steps.length) { reset(false); show(target); }
      else reset(true);
    }
    swipeZone.addEventListener('touchend', endDrag);
    swipeZone.addEventListener('touchcancel', endDrag);

    prev.addEventListener('click', function () { show(at - 1); });
    next.addEventListener('click', function () { show(at + 1); });
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
    });
    form.addEventListener('input', refreshSubmit);
    form.addEventListener('change', refreshSubmit);

    steps.forEach(function (st, i) {
      if (i === steps.length - 1) return;
      var nb = el('button', 'fob-iq-nextlink', 'Next');
      nb.type = 'button';
      nb.addEventListener('click', function () { show(i + 1); });
      st.appendChild(nb);
    });
    steps[0].classList.add('is-active');
    refreshSubmit();
    return {
      show: show, count: steps.length, refresh: refreshSubmit,
      /* used by the submit handler to land on the first gap */
      jumpToFirstIncomplete: function () {
        for (var i = 0; i < steps.length; i++) if (!stepComplete(steps[i])) { show(i); return i; }
        return -1;
      }
    };
  }

  function renderFlow(type) {
    root.classList.remove('in');
    var build = function () {
      root.innerHTML = '';
      uid = 0;
      var form = el('form', 'fob-iq-form fob-iq-form--wizard');
      form.noValidate = true;
      flows[type](form);

      /* consent + submit live together on the closing step */
      var tail = el('div', 'fob-iq-tail');
      var consentLab = el('label', 'fob-iq-check fob-iq-consent');
      var consent = el('input'); consent.type = 'checkbox'; consent.name = 'consentToContact';
      consentLab.appendChild(consent);
      consentLab.appendChild(el('span', null, 'I understand that FOB Systems may contact me using the information I provided.'));
      var consentErr = el('p', 'fob-iq-error'); consentErr.id = 'iq-consent-err';
      consent.setAttribute('aria-describedby', consentErr.id);
      tail.appendChild(consentLab); tail.appendChild(consentErr);

      var actions = el('div', 'fob-iq-actions');
      var submit = el('button', 'fob-btn fob-btn-solid fob-iq-submit', 'Send Inquiry');
      submit.type = 'submit';
      actions.appendChild(submit);
      var status = el('p', 'fob-iq-status'); status.setAttribute('aria-live', 'polite');
      actions.appendChild(status);
      tail.appendChild(actions);

      form.appendChild(tail);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (root._wizard && root._wizard.jumpToFirstIncomplete() !== -1) {
          validate(form, consent, consentErr);
          return;
        }
        handleSubmit(form, submit, status, consent, consentErr);
      });

      root.appendChild(form);
      root._wizard = wizardize(form, tail, consent, submit);
      requestAnimationFrame(function () { root.classList.add('in'); });
    };
    /* Built synchronously. This script is parser-blocking at the end of
       <body>, so building here puts the whole form in the DOM before the
       browser's first paint and the document reaches its real scroll
       height immediately. The previous 180ms timer pushed construction
       past first paint, which is why the page visibly grew a moment after
       load and could not be scrolled to the bottom straight away. The
       fade-in is unaffected: .in is still added on the next frame. */
    build();
  }

  /* ── validation + submission ── */
  function clearErrors(form) {
    form.querySelectorAll('.fob-iq-error').forEach(function (p) { p.textContent = ''; });
    form.querySelectorAll('.err').forEach(function (n) { n.classList.remove('err'); });
  }
  function fail(wrap, msg) {
    if (wrap._err) wrap._err.textContent = msg;
    wrap.classList.add('err');
    return wrap;
  }
  function isHidden(node) {
    for (var n = node; n && n !== root; n = n.parentElement) { if (n.hidden) return true; }
    return false;
  }
  function validate(form, consent, consentErr) {
    clearErrors(form); consentErr.textContent = '';
    var firstBad = null;
    form.querySelectorAll('.fob-iq-field').forEach(function (w) {
      if (!w._required || !w._input || isHidden(w)) return;
      if (!String(w._input.value || '').trim()) firstBad = firstBad || fail(w, 'This field is required.');
    });
    form.querySelectorAll('fieldset.fob-iq-cards').forEach(function (fs) {
      if (!fs._required || isHidden(fs)) return;
      if (!fs.querySelector('input:checked')) firstBad = firstBad || fail(fs, 'Choose one option.');
    });
    if (!consent.checked) {
      consentErr.textContent = 'Please confirm so we can reach out.';
      firstBad = firstBad || consentErr;
    }
    if (firstBad && firstBad.scrollIntoView) firstBad.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    return !firstBad;
  }

  function collect(form) {
    var data = {
      inquiryType: currentType,
      submittedAt: new Date().toISOString(),
      source: 'homepage-inquiry',
      consentToContact: true
    };
    Array.prototype.forEach.call(form.elements, function (elm) {
      if (!elm.name || elm.name === 'consentToContact') return;
      if (isHidden(elm.closest('.fob-iq-field') || elm)) {
        if (!(elm.name in data)) data[elm.name] = '';
        return;
      }
      if (elm.type === 'radio') { if (elm.checked) data[elm.name] = elm.value; else if (!(elm.name in data)) data[elm.name] = data[elm.name] || ''; return; }
      if (elm.type === 'checkbox') { data[elm.name] = elm.checked; return; }
      data[elm.name] = elm.value || '';
    });
    return data;
  }

  /* url-encode a flat object for a Netlify Forms POST */
  function encodeForm(obj) {
    return Object.keys(obj).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(String(obj[k]));
    }).join('&');
  }

  function handleSubmit(form, submit, status, consent, consentErr) {
    /* A disabled button still lets requestSubmit() and Enter through, so the
       in-flight guard lives on the form itself. One inquiry, one POST. */
    if (form._sending) return;
    if (!validate(form, consent, consentErr)) return;
    form._sending = true;
    submit.disabled = true;
    submit.textContent = 'Sending';
    submit.classList.add('busy');
    status.textContent = 'Sending your inquiry.';

    var data = collect(form);
    var payload = { 'form-name': NETLIFY_FORM, 'bot-field': '' };
    Object.keys(data).forEach(function (k) { payload[k] = data[k]; });

    var reset = function (msg) {
      submit.disabled = false;
      submit.textContent = 'Send Inquiry';
      submit.classList.remove('busy');
      form._sending = false;
      status.textContent = msg;
    };

    /* Inquiries go straight into FOB storage. We never hand the visitor
       off to an email client. If the send fails, keep their answers and
       let them retry. */
    if (!window.fetch) {
      reset('Your browser could not send this. Please try again, or contact us on Instagram.');
      return;
    }

    /* A private-session request with a park and a time reserves the slot
       BEFORE it reaches the tracker. Order matters: reserving first
       means a taken slot is caught while the visitor can still pick
       another, and it is the reservation that prevents two people
       holding the same time. The tracker submission carries the server's
       resolved values, so what lands there matches what was reserved. */
    var reserving = (payload.locationId && payload.requestedStart)
      ? window.fetch('/api/booking-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: payload.name || payload.contactName || '',
            email: payload.email || '',
            phone: payload.phone || '',
            instagram: payload.instagram || '',
            notes: payload.message || '',
            parkId: payload.locationId,
            startsAt: payload.requestedStart
          })
        }).then(function (r) {
          return r.json().then(function (d) {
            if (!r.ok) { var e = new Error(d.error || 'Reservation failed'); e.code = d.code; throw e; }
            return d;
          });
        })
      : Promise.resolve(null);

    reserving.then(function (held) {
      if (held && held.tracker) {
        /* Server-resolved park, time and reference, so the tracker never
           records something the browser made up. */
        Object.keys(held.tracker).forEach(function (k) {
          payload[k] = held.tracker[k];
        });
      }
      return window.fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForm(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        showSuccess(data, held);
      });
    }).catch(function (err) {
      if (err && err.code === 'slot-taken') {
        reset(err.message + ' Your answers are still here.');
        return;
      }
      var why = (err && err.message) ? ' (' + err.message + ')' : '';
      reset('We could not send that just now' + why + '. Your answers are still here, please try again.');
    });
  }

  /* Gloves dialog. Shown once after any inquiry, private or
     organisation. Built on demand and removed on close, so it leaves
     nothing behind that could sit over the page or catch clicks. */
  /* The agreement is the one thing that has to be seen, so it interrupts.
     Tap outside, press the X or hit Escape to dismiss. */
  function showAgreement() {
    var back = el('div', 'fob-agr-back');
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.setAttribute('aria-labelledby', 'agr-title');

    var card = el('div', 'fob-agr-card');
    var x = el('button', 'fob-agr-x'); x.type = 'button';
    x.setAttribute('aria-label', 'Close'); x.innerHTML = '&times;';
    card.appendChild(x);
    card.appendChild(el('p', 'fob-agr-kick', 'Before your first session'));
    card.appendChild(el('h3', 'fob-agr-h', 'Session Participation Agreement'));
    card.appendChild(el('p', 'fob-agr-line',
      'Open it, sign it, and send it back through the same channel we contact you on. ' +
      'We cannot train together until it is signed.'));
    var dl = el('a', 'fob-agr-btn', 'Open the agreement');
    dl.href = 'FOB-Session-Participation-Agreement.pdf';
    dl.setAttribute('target', '_blank');
    dl.setAttribute('rel', 'noopener');
    dl.setAttribute('download', 'FOB-Session-Participation-Agreement.pdf');
    card.appendChild(dl);
    card.appendChild(el('p', 'fob-agr-note',
      'One thing to bring: Work gloves. Stop by your local convenience store \u2014 they will have them behind the counter.'));
    back.appendChild(card);
    document.body.appendChild(back);

    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    var opener = document.activeElement;

    function close() {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      back.classList.remove('in');
      window.setTimeout(function () {
        if (back.parentNode) back.parentNode.removeChild(back);
        if (opener && opener.focus) { try { opener.focus(); } catch (e) {} }
      }, reduceMotion ? 0 : 200);
    }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
    x.addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(function () { back.classList.add('in'); dl.focus(); });
  }

  function showSuccess(data, held) {
    root.classList.remove('in');
    setTimeout(function () {
      var box = el('div', 'fob-iq-success');
      box.appendChild(el('p', 'fob-classification', 'INQUIRY RECEIVED'));
      box.appendChild(el('h3', 'fob-iq-success-h', 'Your inquiry is in.'));
      var msg = 'Jah will reach out to you directly to confirm. Once we have spoken, we will lock in your payment and booking details as soon as possible.';
      if (data.contactMethod === 'instagram') msg += ' Keep an eye on your message requests.';
      if (data.contactMethod === 'phone') msg += ' Expect a text or call from FOB Systems.';
      if (data.contactMethod === 'email') msg += ' Check your inbox, and your spam folder just in case.';
      box.appendChild(el('p', 'fob-iq-intro', msg));
      window.setTimeout(showAgreement, reduceMotion ? 0 : 480);


      root.innerHTML = '';
      root.appendChild(box);
      root.classList.add('in');
    }, reduceMotion ? 0 : 200);
  }
  }

  var roots = document.querySelectorAll('.fob-iq-root');
  Array.prototype.forEach.call(roots, function (r) { initInquiry(r); });

  /* Every homepage entry point into the personal inquiry uses the exact same
     calibrated frame as step navigation, instead of relying on browser anchor
     positioning. This covers the nav banner, hero CTA and footer CTA. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var isSessionJump = href === '#first-session-form' || href === '#book' ||
      href === 'index.html#book' || href === 'index.html#first-session-form';
    if (!isSessionJump || !window.FOBPositionSessionInquiry) return;
    e.preventDefault();
    window.FOBPositionSessionInquiry(false);
    if (history && history.replaceState) history.replaceState(null, '', '#first-session-form');
  });

  /* Links arriving from another FOB page carry the hash through navigation.
     Let the browser load normally, then replace its default anchor alignment
     with the exact same calibrated inquiry frame used by local CTA taps. */
  if ((window.location.hash === '#book' || window.location.hash === '#first-session-form') &&
      window.FOBPositionSessionInquiry) {
    window.setTimeout(function () { window.FOBPositionSessionInquiry(false); }, 80);
    window.setTimeout(function () { window.FOBPositionSessionInquiry(true); }, 360);
  }
})();
