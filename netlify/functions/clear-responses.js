/* Permanently deletes every stored inquiry submission.
   POST only, requires a valid session, and requires an explicit
   confirm token in the body so it can never fire by accident. */
'use strict';
const S = require('./_session');

exports.handler = async function (event) {
  const H = Object.assign({ 'Content-Type': 'application/json' }, S.SECURITY_HEADERS);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }
  if (!S.isAuthed(event)) {
    return { statusCode: 401, headers: H, body: JSON.stringify({ error: 'Not authenticated.' }) };
  }

  // Second gate: the browser must send the exact phrase the person typed.
  let confirm = '';
  try { confirm = (JSON.parse(event.body || '{}').confirm || '').trim(); } catch (e) { confirm = ''; }
  if (confirm !== 'DELETE') {
    return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Confirmation phrase did not match.' }) };
  }

  const token = process.env.NETLIFY_ACCESS_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  if (!token || !siteId) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'Response storage is not configured yet.' }) };
  }

  const auth = { Authorization: 'Bearer ' + token };

  try {
    let deleted = 0;
    let failed = 0;

    // Netlify pages submissions, so keep pulling until nothing is left.
    for (let pass = 0; pass < 20; pass++) {
      const listUrl = 'https://api.netlify.com/api/v1/sites/' + siteId + '/submissions?per_page=100';
      const listRes = await fetch(listUrl, { headers: auth });
      if (!listRes.ok) {
        return { statusCode: 502, headers: H, body: JSON.stringify({ error: 'We could not clear the responses. Please try again.' }) };
      }

      const batch = await listRes.json();
      if (!Array.isArray(batch) || batch.length === 0) break;

      for (const item of batch) {
        if (!item || !item.id) continue;
        const delRes = await fetch('https://api.netlify.com/api/v1/submissions/' + item.id, {
          method: 'DELETE',
          headers: auth
        });
        if (delRes.ok) { deleted++; } else { failed++; }
      }

      // If nothing in this batch could be removed, stop rather than loop forever.
      if (failed > 0 && deleted === 0) break;
    }

    if (deleted === 0 && failed > 0) {
      return { statusCode: 502, headers: H, body: JSON.stringify({ error: 'We could not clear the responses. Please try again.' }) };
    }

    return { statusCode: 200, headers: H, body: JSON.stringify({ deleted: deleted, failed: failed }) };
  } catch (err) {
    return { statusCode: 502, headers: H, body: JSON.stringify({ error: 'We could not clear the responses. Please try again.' }) };
  }
};
