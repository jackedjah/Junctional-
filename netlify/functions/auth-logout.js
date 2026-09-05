/* Clears the session cookie. The old token stops being accepted because the
   browser no longer sends it, and it carries an expiry that the server checks. */
'use strict';
const S = require('./_session');

exports.handler = async function () {
  return {
    statusCode: 200,
    headers: Object.assign(
      { 'Content-Type': 'application/json', 'Set-Cookie': S.clearCookieHeader() },
      S.SECURITY_HEADERS
    ),
    body: JSON.stringify({ ok: true })
  };
};
