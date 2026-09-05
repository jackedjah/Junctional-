/* ---------------------------------------------------------------
   BOOKING AVAILABILITY (public)

   What the booking form needs and nothing more: the approved parks,
   and the slots that are genuinely open.

   Read with the service role because availability_windows,
   blackouts and bookings have no public read policy on purpose. A
   visitor should learn that 9am is taken, not that it is taken by a
   named person, nor what the underlying rule is, nor when the trainer
   is away and why. open_slots() returns only free times, so that is
   all this can hand back.

   No authentication: this is the public booking page. It is read-only
   and the payload is identical for everybody, so there is nothing here
   worth rate-limiting beyond what Netlify already does.
   --------------------------------------------------------------- */
'use strict';

const DAYS_AHEAD = 21;

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
      'Content-Type': 'application/json'
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(async function (r) {
    const text = await r.text();
    if (!r.ok) throw new Error(text || ('Supabase returned ' + r.status));
    return text ? JSON.parse(text) : null;
  });
}

exports.handler = async function () {
  const H = {
    'Content-Type': 'application/json',
    /* Never cached. Availability changes the moment hours are edited or
       a slot is booked, and a cached copy meant an edit appeared to do
       nothing at all. Netlify's CDN can also hold a public response far
       longer than the max-age suggests, so this has to be no-store
       rather than a short cache. */
    'Cache-Control': 'no-store, must-revalidate',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff'
  };

  try {
    const [parks, windows, slots, settings] = await Promise.all([
      db('session_parks?select=id,slug,display_name,official_name,latitude,longitude,' +
         'address,neighborhood,borough,facility_notes,meeting_instructions,' +
         'operating_hours,is_preferred,gate_status&is_active=eq.true' +
         '&order=is_preferred.desc,borough.asc,display_name.asc&limit=1000'),
      /* PostgREST caps rows by default. Ask for more than three weeks of
         30-minute slots could ever produce, so a busy calendar can never
         be silently truncated part way through the range. */
      db('availability_windows?select=start_time,end_time,weekdays&is_active=eq.true&order=start_time.asc'),
      db('rpc/open_slots?limit=5000', {
        method: 'POST',
        body: { from_ts: new Date().toISOString(), days: DAYS_AHEAD }
      }),
      db('booking_settings?select=session_minutes,timezone,booking_open&limit=1')
    ]);

    const s = (settings && settings[0]) || {};

    return {
      statusCode: 200,
      headers: H,
      body: JSON.stringify({
        /* the raw weekly rules, so the private SESH pages can describe the current
           recurring availability directly rather than inferring it from open slots */
        windows: windows || [],
        parks: parks || [],
        slots: (slots || []).map(function (r) { return r.slot_start; }),
        sessionMinutes: s.session_minutes || 60,
        timezone: s.timezone || 'America/New_York',
        bookingOpen: s.booking_open !== false
      })
    };
  } catch (err) {
    console.error('booking-availability failed:', err.message);
    /* Parks empty and bookingOpen false, so the form shows its "cannot
       load times" state rather than an empty list that looks like no
       availability. The two are different and should not look alike. */
    return {
      statusCode: 200,
      headers: H,
      body: JSON.stringify({
        configured: !/not configured/i.test(String(err && err.message || '')),
        parks: [], slots: [], sessionMinutes: 60,
        timezone: 'America/New_York', bookingOpen: false,
        error: 'unavailable'
      })
    };
  }
};
