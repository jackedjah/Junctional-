/* POST { password } -> sets an HttpOnly session cookie on success. */
'use strict';
const S = require('./_session');

exports.handler = async function (event) {
  const H = Object.assign({ 'Content-Type': 'application/json' }, S.SECURITY_HEADERS);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  if (!process.env.ADMIN_PASSWORD_HASH || !process.env.SESSION_SECRET) {
    // Never leak which variable is missing.
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'Sign in is not available right now.' }) };
  }

  if (S.throttled(event)) {
    return { statusCode: 429, headers: H, body: JSON.stringify({ error: 'Too many attempts. Wait a few minutes and try again.' }) };
  }

  let password = '';
  try {
    password = (JSON.parse(event.body || '{}').password || '');
  } catch (e) {
    password = '';
  }

  if (!S.verifyPassword(password)) {
    S.noteFailure(event);
    // Deliberately vague, and identical timing regardless of reason.
    return { statusCode: 401, headers: H, body: JSON.stringify({ error: 'That password is not correct.' }) };
  }

  S.clearFailures(event);
  return {
    statusCode: 200,
    headers: Object.assign({}, H, { 'Set-Cookie': S.setCookieHeader(S.createToken()) }),
    body: JSON.stringify({ ok: true })
  };
};
