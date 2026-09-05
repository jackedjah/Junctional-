/* Authenticated proxy for Netlify Form submissions.
   Returns 401 and no data unless a valid session cookie is present. */
'use strict';
const S = require('./_session');

const SYSTEM_FIELDS = ['inquiryType', 'submittedAt', 'source', 'formName'];

exports.handler = async function (event) {
  const H = Object.assign({ 'Content-Type': 'application/json' }, S.SECURITY_HEADERS);

  if (!S.isAuthed(event)) {
    return { statusCode: 401, headers: H, body: JSON.stringify({ error: 'Not authenticated.' }) };
  }

  const token = process.env.NETLIFY_ACCESS_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  if (!token || !siteId) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'Response storage is not configured yet.' }) };
  }

  try {
    /* Netlify holds spam-flagged submissions in a separate bucket that
       the default endpoint never returns. A real inquiry caught by that
       filter simply vanished from this dashboard with no trace, which
       is worse than showing it with a warning. Both buckets are fetched
       and merged; the flagged ones arrive tagged rather than hidden. */
    const base = 'https://api.netlify.com/api/v1/sites/' + siteId + '/submissions';
    const auth = { headers: { Authorization: 'Bearer ' + token } };

    /* Fetched one at a time rather than with Promise.all. Promise.all
       rejects as a whole the moment either call throws, so a hiccup on
       the optional spam request was taking the entire dashboard down
       with it. The main list must never depend on the extra one. */
    let failStatus = 0;
    let failBody = '';

    async function grab(qs) {
      try {
        const r = await fetch(base + qs, auth);
        if (!r.ok) {
          failStatus = r.status;
          failBody = (await r.text()).slice(0, 200);
          return null;
        }
        const j = await r.json();
        return Array.isArray(j) ? j : [];
      } catch (e) {
        failStatus = -1;
        failBody = e.message;
        return null;
      }
    }

    const clean = await grab('?per_page=200');
    if (clean === null) {
      /* The generic message hid WHY for three rounds. The status code
         carries no secret and turns guesswork into a diagnosis: 401
         means the access token is invalid or expired, 404 means the
         site id does not match, 403 means the token lacks scope. */
      console.error('responses: Netlify API failed', failStatus, failBody);
      const why = failStatus === 401 ? 'The Netlify access token is invalid or expired.'
                : failStatus === 403 ? 'The Netlify access token does not have permission for this site.'
                : failStatus === 404 ? 'That site id was not found.'
                : failStatus === -1  ? 'Could not reach Netlify.'
                : 'Netlify returned ' + failStatus + '.';
      return {
        statusCode: 502, headers: H,
        body: JSON.stringify({
          error: 'Could not load the responses. ' + why,
          status: failStatus
        })
      };
    }

    /* Spam is a bonus. If it fails, the dashboard still works. */
    const flagged = (await grab('?per_page=200&state=spam')) || [];
    flagged.forEach(function (f) { f.__spam = true; });

    const raw = clean.concat(flagged);

    const items = (Array.isArray(raw) ? raw : []).map(function (s) {
      const answers = Object.assign({}, s.data || {});
      // Netlify's own bookkeeping fields are not respondent answers.
      delete answers['form-name'];
      delete answers.ip;
      delete answers.user_agent;
      delete answers.referrer;

      return {
        id: s.id,
        formName: s.form_name || answers.source || 'inquiry',
        flagged: !!s.__spam,
        receivedAt: s.created_at || answers.submittedAt || null,
        answers: answers
      };
    });

    // Newest first.
    items.sort(function (a, b) {
      return new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0);
    });

    return { statusCode: 200, headers: H, body: JSON.stringify({ total: items.length, items: items, systemFields: SYSTEM_FIELDS }) };
  } catch (err) {
    return { statusCode: 502, headers: H, body: JSON.stringify({ error: 'We could not load the responses. Please try again.' }) };
  }
};
