/* Emails a plain-language summary of every inquiry.

   Netlify calls this automatically whenever a form is submitted, so it
   covers both fob-inquiry and fob-partners without either flow having to
   know about it. Nothing here can block or fail a submission: if the mail
   does not send, the inquiry is still recorded and the visitor still sees
   their confirmation.

   Field mapping is deliberate rather than a dump of the payload. Each
   sentence is built from the specific input that answers it, and anything
   missing is written as a plain gap instead of an empty blank. */
'use strict';

const TO   = process.env.INQUIRY_NOTIFY_TO   || 'fobsystems1@gmail.com';
const FROM = process.env.INQUIRY_NOTIFY_FROM || 'FOB Systems <onboarding@resend.dev>';

/* Sports you play. Everything else on that list is something you do. */
const PLAYED = ['tennis', 'handball', 'pickleball', 'basketball', 'golf',
                'baseball', 'softball', 'badminton', 'volleyball', 'soccer', 'football'];

const clean = (v) => String(v == null ? '' : v).trim();

/* "who plays tennis" / "who does conditioning" / "who is currently sedentary" */
function activity(d) {
  const active = clean(d.recreationalActive).toLowerCase();
  const sport = clean(d.sport) || clean(d.sportOther);
  if (active === 'no') return 'who is currently sedentary';
  if (!sport) return 'who did not say what they train for';
  const verb = PLAYED.indexOf(sport.toLowerCase()) > -1 ? 'plays' : 'does';
  return 'who ' + verb + ' ' + sport;
}

/* The channel they picked decides both the verb and which value to read. */
function reachThem(d) {
  const how = clean(d.contactMethod).toLowerCase();
  const phone = clean(d.phone), insta = clean(d.instagram), email = clean(d.email);
  if (how === 'phone' && phone) return 'text them at ' + phone;
  if (how === 'instagram' && insta) {
    return 'message them on Instagram at ' + (insta[0] === '@' ? insta : '@' + insta);
  }
  if (how === 'email' && email) return 'email them at ' + email;
  /* They chose a channel but the value is missing, or no channel at all. */
  if (phone) return 'text them at ' + phone;
  if (email) return 'email them at ' + email;
  if (insta) return 'message them on Instagram at ' + (insta[0] === '@' ? insta : '@' + insta);
  return 'no contact details came through, so check the Inquiry Review page';
}

/* The park picker writes the name into customLocation and the neighbourhood
   into locationArea. A typed-in location lands in the same place. */
function park(d) {
  const name = clean(d.customLocation) || clean(d.eventLocation);
  const area = clean(d.locationArea);
  if (name && area) return name + ' in ' + area;
  if (name) return name;
  if (area) return 'somewhere in ' + area;
  return 'not chosen yet';
}

/* preferredDay and preferredTime are what the member actually picked in the
   date and time controls. requestedStart is the machine timestamp behind it
   and is only used if the readable pair is missing. */
function when(d) {
  const day = clean(d.preferredDay), time = clean(d.preferredTime);
  if (day && time) return day + ' at ' + time;
  if (day) return day;
  const iso = clean(d.requestedStart);
  if (iso) {
    const t = new Date(iso);
    if (!isNaN(t)) {
      return t.toLocaleString('en-US', {
        timeZone: 'America/New_York', weekday: 'long', month: 'long',
        day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    }
  }
  if (clean(d.preferredDate)) return clean(d.preferredDate);
  if (clean(d.flexibleSchedule)) return 'flexible, see the notes';
  return 'not chosen yet';
}

function personalBody(d) {
  const who = clean(d.name) || 'someone who left their name blank';
  return 'We got a new inquiry from ' + who + ', ' + activity(d) + '. '
       + reachThem(d).replace(/^./, (c) => c.toUpperCase())
       + ' to confirm session(s). Their preferred park is ' + park(d) + '. '
       + 'Their preferred date is ' + when(d) + '.\n\n'
       + 'LOCATION REVIEW NEEDED\n'
       + 'Requested park: ' + (clean(d.customLocation) || 'not chosen') + '\n'
       + 'Area: ' + (clean(d.locationArea) || 'not given') + '\n'
       + 'Decide Standard, Extended +10% or Distance +18% when you approve their name.\n\n'
       + 'Be sure to assign them a name to access the FOB SESH payment portals. '
       + 'Bring a spare pair of gloves for them as well.';
}

function groupBody(d) {
  const org = clean(d.organizationName) || clean(d.eventName) || 'an organization';
  const who = clean(d.name);
  const kind = clean(d.orgType) || clean(d.inquiryType);
  return 'We got a new group inquiry from ' + org
       + (who ? ', through ' + who : '') + (kind ? ' (' + kind + ')' : '') + '. '
       + reachThem(d).replace(/^./, (c) => c.toUpperCase()) + ' to confirm sessions. '
       + 'Their location is ' + park(d) + '. '
       + 'Their preferred date is ' + when(d) + '.'
       + (clean(d.groupSize) ? '\nGroup size: ' + clean(d.groupSize) + '.' : '')
       + (clean(d.availabilityNotes) ? '\nAvailability: ' + clean(d.availabilityNotes) + '.' : '')
       + '\n\nBe sure to assign them a name to access the FOB SESH payment portals. '
       + 'Bring spare gloves for them as well.';
}

exports.handler = async function (event) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('inquiry-notify: RESEND_API_KEY is not set, no email sent.');
    return { statusCode: 200, body: 'no key' };
  }

  let payload, formName, data;
  try {
    payload = JSON.parse(event.body || '{}');
    formName = clean(payload.form_name || (payload.payload && payload.payload.form_name));
    data = (payload.payload && payload.payload.data) || payload.data || {};
  } catch (e) {
    console.error('inquiry-notify: could not read the submission.', e.message);
    return { statusCode: 200, body: 'unreadable' };
  }

  const isGroup = formName === 'fob-partners';
  if (formName !== 'fob-inquiry' && !isGroup) {
    return { statusCode: 200, body: 'ignored ' + formName };
  }

  const who = clean(data.name) || clean(data.organizationName) || 'someone';
  const subject = (isGroup ? 'New group inquiry from ' : 'New inquiry from ') + who;
  const text = isGroup ? groupBody(data) : personalBody(data);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: clean(data.email) || undefined,
        subject: subject,
        text: text
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('inquiry-notify: Resend refused it.', res.status, detail.slice(0, 200));
    }
  } catch (e) {
    /* Swallowed on purpose. A mail failure must never surface to the
       person who just filled the form in. */
    console.error('inquiry-notify: send failed.', e.message);
  }

  return { statusCode: 200, body: 'ok' };
};
