/* ---------------------------------------------------------------
   BOOKING ADMIN

   Read and write availability rules, blackout dates, booking settings
   and which parks are bookable. Gated by the same session cookie that
   already protects Form Review, so there is one password and one
   authentication path rather than a second one to keep in step.

   Everything here runs with the Supabase SERVICE ROLE key, which never
   reaches the browser. That is deliberate: availability rules and
   bookings are not public, so the tables have no public read policy.
   Only this endpoint can see them, and only after the session check.

   Writes are whitelisted field by field. A request cannot set columns
   that were not offered, so a crafted body cannot flip a booking's
   status or edit a park's coordinates through this route.
   --------------------------------------------------------------- */
'use strict';
const S = require('./_session');

/* No cap. Every Brooklyn and Manhattan park is bookable; the borough
   filter on the imported data is what bounds the network, not a count. */

function db(path, options) {
  /* Tolerate a trailing slash. It is easy to paste one in from the
     Supabase dashboard, and it would otherwise produce a double slash
     in every request path. */
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Booking storage is not configured.');

  const opts = options || {};
  return fetch(url + '/rest/v1/' + path, {
    method: opts.method || 'GET',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation'
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(async function (r) {
    const text = await r.text();
    if (!r.ok) throw new Error(text || ('Supabase returned ' + r.status));
    return text ? JSON.parse(text) : null;
  });
}

/* Only these may be written, and only with these shapes. */
const WINDOW_FIELDS = ['start_time', 'end_time', 'is_active', 'weekdays'];
const BLACKOUT_FIELDS = ['starts_at', 'ends_at', 'park_id', 'reason'];
const SETTING_FIELDS = ['service_radius_km', 'session_minutes', 'travel_buffer_min',
                        'lead_time_hours', 'booking_open'];
const PARK_FIELDS = ['is_active', 'is_preferred', 'meeting_instructions',
                     'facility_notes', 'operating_hours', 'sort_order', 'gate_status'];

function pick(source, allowed) {
  const out = {};
  allowed.forEach(function (k) {
    if (Object.prototype.hasOwnProperty.call(source, k)) out[k] = source[k];
  });
  return out;
}

function bad(H, message) {
  return { statusCode: 400, headers: H, body: JSON.stringify({ error: message }) };
}


/* Two blocks on the same day that touch or overlap are the same block.
   Left alone they read as a schedule while behaving as a single wide
   window, which is exactly how a day that should have been carved up
   ended up wide open again. Merge them the moment anything is written. */
async function mergeDay(db, day) {
  const rows = await db('availability_windows?select=id,start_time,end_time,weekdays'
    + '&is_active=eq.true&order=start_time.asc');
  const mine = (rows || []).filter(function (r) {
    return Array.isArray(r.weekdays) && r.weekdays.length === 1 && r.weekdays[0] === day;
  });
  if (mine.length < 2) return;
  const mins = function (t) { const q = String(t).split(':'); return (+q[0]) * 60 + (+q[1]); };
  mine.sort(function (a, b) { return mins(a.start_time) - mins(b.start_time); });

  const keep = [];
  let cur = null;
  for (const r of mine) {
    if (cur && mins(r.start_time) <= mins(cur.end_time)) {
      if (mins(r.end_time) > mins(cur.end_time)) cur.end_time = r.end_time;
      cur._absorbed.push(r.id);
    } else {
      cur = { id: r.id, start_time: r.start_time, end_time: r.end_time, _absorbed: [] };
      keep.push(cur);
    }
  }
  for (const k of keep) {
    if (k._absorbed.length) {
      await db('availability_windows?id=eq.' + encodeURIComponent(k.id),
        { method: 'PATCH', body: { start_time: k.start_time, end_time: k.end_time } });
      for (const gone of k._absorbed) {
        await db('availability_windows?id=eq.' + encodeURIComponent(gone), { method: 'DELETE' });
      }
    }
  }
}

exports.handler = async function (event) {
  const H = Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store, must-revalidate', 'Pragma': 'no-cache' }, S.SECURITY_HEADERS);

  if (!S.isAuthed(event)) {
    return { statusCode: 401, headers: H, body: JSON.stringify({ error: 'Not authenticated.' }) };
  }

  try {
    /* ---------- read everything the admin screen needs ---------- */
    if (event.httpMethod === 'GET') {
      const [windows, blackouts, settings, parks] = await Promise.all([
        db('availability_windows?select=*&order=start_time'),
        db('availability_blackouts?select=*&order=starts_at'),
        db('booking_settings?select=*&limit=1'),
        db('session_parks?select=*&order=borough,display_name&limit=1000')
      ]);
      return {
        statusCode: 200,
        headers: H,
        body: JSON.stringify({
          windows: windows || [],
          blackouts: blackouts || [],
          settings: (settings && settings[0]) || null,
          parks: parks || [],
        })
      };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'Method not allowed.' }) };
    }

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch (e) { return bad(H, 'Malformed request.'); }

    const action = body.action;

    /* ---------- availability ------------------------------------ */
    /* Windows apply to every day. There is no weekday: "I take
       sessions between 7 and 2" is the actual rule, and encoding it
       seven times was busywork that could drift out of step. */
    /* Replace one weekday outright. The week grid paints a whole day at a
       time, so sending the finished set of blocks is both fewer round trips
       and impossible to leave half applied. Days are recurring by nature:
       a block on Tuesday means every Tuesday. */
    if (action === 'set-day') {
      const day = body.day;
      if (typeof day !== 'number' || day < 0 || day > 6) return bad(H, 'That day is not valid.');
      const blocks = Array.isArray(body.blocks) ? body.blocks : [];
      for (const b of blocks) {
        if (!b || !b.start_time || !b.end_time) return bad(H, 'Every block needs a start and an end.');
        if (b.end_time <= b.start_time) return bad(H, 'The end time has to be after the start time.');
      }
      const existing = await db('availability_windows?select=id,weekdays&is_active=eq.true');
      const mine = (existing || []).filter(function (r) {
        return Array.isArray(r.weekdays) && r.weekdays.length === 1 && r.weekdays[0] === day;
      });
      for (const r of mine) {
        await db('availability_windows?id=eq.' + encodeURIComponent(r.id), { method: 'DELETE' });
      }
      const made = [];
      for (const b of blocks) {
        const row = await db('availability_windows', {
          method: 'POST',
          body: { start_time: b.start_time, end_time: b.end_time, weekdays: [day], is_active: true }
        });
        if (row && row[0]) made.push(row[0]);
      }
      return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, day: day, windows: made }) };
    }

    if (action === 'add-window') {
      const row = pick(body, WINDOW_FIELDS);
      if (!row.start_time || !row.end_time) return bad(H, 'Give a start and end time.');
      if (row.end_time <= row.start_time) return bad(H, 'The end time has to be after the start time.');
      if (row.weekdays) {
        if (!Array.isArray(row.weekdays) || !row.weekdays.length) {
          return bad(H, 'Pick at least one day.');
        }
        /* Anything outside 0-6 would silently never match a date. */
        if (row.weekdays.some(function (d) {
              return typeof d !== 'number' || d < 0 || d > 6;
            })) {
          return bad(H, 'Those days are not valid.');
        }
      }
      const made = await db('availability_windows', { method: 'POST', body: row });
      if (row.weekdays && row.weekdays.length === 1) await mergeDay(db, row.weekdays[0]);
      return { statusCode: 200, headers: H, body: JSON.stringify({ window: made && made[0] }) };
    }

    /* Edit an existing window rather than only adding new ones. Without
       this, unticking a day had nowhere to go: the checkboxes only ever
       fed a new row. */
    if (action === 'save-window') {
      if (!body.id) return bad(H, 'Missing window.');
      const row = pick(body, WINDOW_FIELDS);
      if (!Object.keys(row).length) return bad(H, 'Nothing to save.');
      if (row.start_time && row.end_time && row.end_time <= row.start_time) {
        return bad(H, 'The end time has to be after the start time.');
      }
      if (row.weekdays) {
        if (!Array.isArray(row.weekdays) || !row.weekdays.length) {
          return bad(H, 'Pick at least one day.');
        }
        if (row.weekdays.some(function (d) {
              return typeof d !== 'number' || d < 0 || d > 6;
            })) {
          return bad(H, 'Those days are not valid.');
        }
      }
      const saved = await db('availability_windows?id=eq.' + encodeURIComponent(body.id),
                             { method: 'PATCH', body: row });
      if (row.weekdays && row.weekdays.length === 1) await mergeDay(db, row.weekdays[0]);
      return { statusCode: 200, headers: H, body: JSON.stringify({ window: saved && saved[0] }) };
    }

    if (action === 'delete-window') {
      if (!body.id) return bad(H, 'Missing window.');
      await db('availability_windows?id=eq.' + encodeURIComponent(body.id), { method: 'DELETE' });
      return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
    }

    if (action === 'add-blackout') {
      const row = pick(body, BLACKOUT_FIELDS);
      if (!row.starts_at || !row.ends_at) return bad(H, 'Give a start and end.');
      if (new Date(row.ends_at) <= new Date(row.starts_at)) {
        return bad(H, 'The end has to be after the start.');
      }
      const made = await db('availability_blackouts', { method: 'POST', body: row });
      return { statusCode: 200, headers: H, body: JSON.stringify({ blackout: made && made[0] }) };
    }

    if (action === 'delete-blackout') {
      if (!body.id) return bad(H, 'Missing blackout.');
      await db('availability_blackouts?id=eq.' + encodeURIComponent(body.id), { method: 'DELETE' });
      return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
    }

    /* ---------- settings ---------------------------------------- */
    if (action === 'save-settings') {
      const row = pick(body, SETTING_FIELDS);
      if (!Object.keys(row).length) return bad(H, 'Nothing to save.');
      if (row.gate_status && ['good','none','unknown'].indexOf(row.gate_status) === -1) {
        return bad(H, 'Unknown gate status.');
      }
      if (row.session_minutes != null && (row.session_minutes < 15 || row.session_minutes > 240)) {
        return bad(H, 'Session length has to be between 15 and 240 minutes.');
      }
      if (row.travel_buffer_min != null && row.travel_buffer_min < 0) {
        return bad(H, 'Travel buffer cannot be negative.');
      }
      const saved = await db('booking_settings?id=eq.true', { method: 'PATCH', body: row });
      return { statusCode: 200, headers: H, body: JSON.stringify({ settings: saved && saved[0] }) };
    }

    /* ---------- parks -------------------------------------------- */
    if (action === 'save-park') {
      if (!body.id) return bad(H, 'Missing park.');
      const row = pick(body, PARK_FIELDS);
      if (!Object.keys(row).length) return bad(H, 'Nothing to save.');
      if (row.gate_status && ['good','none','unknown'].indexOf(row.gate_status) === -1) {
        return bad(H, 'Unknown gate status.');
      }

      /* Coordinates and names are not editable here on purpose: they
         were verified against public records, and a typo in a latitude
         would send somebody to the wrong place. */
      const saved = await db('session_parks?id=eq.' + encodeURIComponent(body.id),
                             { method: 'PATCH', body: row });
      return { statusCode: 200, headers: H, body: JSON.stringify({ park: saved && saved[0] }) };
    }

    /* ---------- bookings ----------------------------------------- */
    if (action === 'list-bookings') {
      const rows = await db('session_bookings?select=*,park:session_parks(display_name,address)' +
                            '&order=starts_at.desc&limit=100');
      return { statusCode: 200, headers: H, body: JSON.stringify({ bookings: rows || [] }) };
    }

    if (action === 'set-booking-status') {
      const allowed = ['new', 'availability_held', 'pending_confirmation', 'confirmed',
                       'reschedule_requested', 'cancelled', 'completed'];
      if (!body.id || allowed.indexOf(body.status) === -1) {
        return bad(H, 'Unknown status.');
      }
      const saved = await db('session_bookings?id=eq.' + encodeURIComponent(body.id),
                             { method: 'PATCH', body: { status: body.status } });
      return { statusCode: 200, headers: H, body: JSON.stringify({ booking: saved && saved[0] }) };
    }

    return bad(H, 'Unknown action.');
  } catch (err) {
    /* Never echo the Supabase error verbatim: it can name columns and
       policies. Log it for the function log, return something plain. */
    console.error('booking-admin failed:', err.message);
    return {
      statusCode: 500,
      headers: H,
      body: JSON.stringify({ error: 'Could not reach the booking settings.' })
    };
  }
};
