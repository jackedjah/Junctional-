/* ---------------------------------------------------------------
   BOOKING SUBMIT

   The only path that can reserve a session.

   Nothing the browser sends about the session itself is trusted. The
   park is re-resolved from its id, so coordinates, name and address
   come from the database rather than the request. Availability is
   recomputed here, so a slot the client believed was open is checked
   again against blackouts, existing bookings and the travel buffer.

   The final guarantee is not in this file: session_bookings carries an
   exclusion constraint on its time range, so if two requests pass the
   availability check in the same instant, the database rejects the
   second. That is deliberate. A check-then-insert in application code
   always has a gap between the two; a constraint does not.

   Status is 'pending_confirmation', never 'confirmed'. Nothing here
   can confirm a session, because confirming one is a decision Jah
   makes, not a side effect of a form.
   --------------------------------------------------------------- */
'use strict';

const MAX_NOTES = 1200;

function db(path, options) {
  /* Tolerate a trailing slash. It is easy to paste one in from the
     Supabase dashboard, and it would otherwise produce a double slash
     in every request path. */
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('not-configured');

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
    if (!r.ok) {
      const err = new Error(text || ('Supabase returned ' + r.status));
      err.status = r.status;
      err.body = text;
      throw err;
    }
    return text ? JSON.parse(text) : null;
  });
}

function clean(v, max) {
  if (typeof v !== 'string') return '';
  /* Strip control characters, collapse whitespace, cap length. Notes
     are rendered as text in the tracker, never as markup. */
  return v.replace(/[\u0000-\u001F\u007F]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, max || 200);
}

function looksLikeEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

function looksLikePhone(v) {
  const digits = v.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function reference() {
  /* Short, unambiguous, no lookalike characters. Enough entropy that a
     collision is unlikely, and the unique constraint catches it if not. */
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return 'FOB-' + out;
}

function reply(code, payload) {
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return reply(405, { error: 'Method not allowed.' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return reply(400, { error: 'Malformed request.' }); }

  const fullName = clean(body.fullName, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 40);
  const notes = clean(body.notes, MAX_NOTES);
  const parkId = clean(body.parkId, 60);
  const startsAt = clean(body.startsAt, 40);

  const instagram = clean(body.instagram, 60);

  if (!fullName) return reply(400, { error: 'Add your name.' });

  /* The form asks HOW to reach somebody and collects only that one
     answer: phone, email or Instagram. Demanding all three rejected
     every submission that picked phone. Validate what was given, and
     require that at least one of them was. */
  if (email && !looksLikeEmail(email)) {
    return reply(400, { error: 'That email does not look right.' });
  }
  if (phone && !looksLikePhone(phone)) {
    return reply(400, { error: 'That phone number does not look right.' });
  }
  if (!email && !phone && !instagram) {
    return reply(400, { error: 'Add a phone number, email or Instagram so we can reach you.' });
  }
  if (!parkId) return reply(400, { error: 'Choose a park.' });
  if (!startsAt) return reply(400, { error: 'Choose a time.' });

  const when = new Date(startsAt);
  if (isNaN(when.getTime())) return reply(400, { error: 'That time is not valid.' });

  try {
    const settingsRows = await db('booking_settings?select=*&limit=1');
    const settings = settingsRows && settingsRows[0];
    if (!settings || settings.booking_open === false) {
      return reply(409, { error: 'Bookings are closed right now.' });
    }

    /* Park re-resolved from the id. Whatever the browser claimed about
       coordinates, name or address is discarded. An inactive park is
       treated as if it does not exist. */
    const parks = await db('session_parks?select=*&is_active=eq.true&id=eq.' +
                           encodeURIComponent(parkId));
    const park = parks && parks[0];
    if (!park) {
      return reply(400, {
        error: 'That location is outside the current FOB session network.'
      });
    }

    /* Availability recomputed, not taken on trust. If the slot went
       while the form was open, this is where that is caught. */
    const slots = await db('rpc/open_slots', {
      method: 'POST',
      body: { from_ts: new Date().toISOString(), days: 30 }
    });
    const wanted = when.getTime();
    const stillOpen = (slots || []).some(function (s) {
      return new Date(s.slot_start).getTime() === wanted;
    });
    if (!stillOpen) {
      return reply(409, {
        code: 'slot-taken',
        error: 'That time is no longer available. Pick another and we will hold it.'
      });
    }

    const endsAt = new Date(when.getTime() + (settings.session_minutes || 60) * 60000);
    const ref = reference();

    let created;
    try {
      created = await db('session_bookings', {
        method: 'POST',
        body: {
          reference: ref,
          full_name: fullName,
          email: email || '',
          phone: phone || (instagram ? 'IG: ' + instagram : ''),
          park_id: park.id,
          starts_at: when.toISOString(),
          ends_at: endsAt.toISOString(),
          timezone: settings.timezone || 'America/New_York',
          notes: notes || null,
          status: 'pending_confirmation',
          source_form: 'start-fobbing'
        }
      });
    } catch (err) {
      /* The exclusion constraint firing means somebody else took the
         slot between the check above and this insert. That is the race
         the constraint exists to lose safely. */
      if (err.body && /no_overlapping_sessions|exclusion/i.test(err.body)) {
        return reply(409, {
          code: 'slot-taken',
          error: 'Somebody just took that time. Pick another and we will hold it.'
        });
      }
      throw err;
    }

    const booking = created && created[0];

    /* Everything the tracker needs, resolved server-side. Returned to
       the client so the existing Netlify Forms submission carries the
       same values rather than re-deriving them in the browser. */
    return reply(200, {
      ok: true,
      reference: booking ? booking.reference : ref,
      status: 'pending_confirmation',
      tracker: {
        inquiryType: 'private-session',
        bookingReference: booking ? booking.reference : ref,
        requestedDate: when.toISOString().slice(0, 10),
        requestedStart: when.toISOString(),
        timezone: settings.timezone || 'America/New_York',
        parkId: park.id,
        parkName: park.display_name,
        parkAddress: park.address || '',
        parkNeighborhood: park.neighborhood,
        parkLat: String(park.latitude),
        parkLng: String(park.longitude),
        meetingInstructions: park.meeting_instructions || '',
        bookingStatus: 'Pending confirmation',
        sourceForm: 'start-fobbing'
      }
    });
  } catch (err) {
    if (err.message === 'not-configured') {
      console.error('booking-submit: SUPABASE env vars missing');
      return reply(503, { error: 'Booking is not available right now.' });
    }
    /* Never echo the database error: it can name columns and policies. */
    console.error('booking-submit failed:', err.message);
    return reply(500, { error: 'That did not go through. Try again in a moment.' });
  }
};
