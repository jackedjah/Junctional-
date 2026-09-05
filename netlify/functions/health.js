/* Diagnostic only. Reports WHETHER each configuration value is visible to the
   function at runtime. It never returns a value, a length, or any fragment of
   one, so it cannot leak a secret. Safe to leave in place. */
'use strict';

exports.handler = async function () {
  const present = function (name) {
    const v = process.env[name];
    return typeof v === 'string' && v.trim().length > 0;
  };

  const hashLooksValid = (function () {
    const v = process.env.ADMIN_PASSWORD_HASH || '';
    const parts = v.split(':');
    // shape check only: "salt:hash", both hex. No value is revealed.
    return parts.length === 2 &&
           /^[0-9a-f]+$/i.test(parts[0]) &&
           /^[0-9a-f]+$/i.test(parts[1]) &&
           parts[1].length === 128;
  })();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    },
    body: JSON.stringify({
      functionsRunning: true,
      context: process.env.CONTEXT || 'unknown',
      config: {
        ADMIN_PASSWORD_HASH: present('ADMIN_PASSWORD_HASH'),
        SESSION_SECRET: present('SESSION_SECRET'),
        NETLIFY_ACCESS_TOKEN: present('NETLIFY_ACCESS_TOKEN'),
        NETLIFY_SITE_ID: present('NETLIFY_SITE_ID')
      },
      adminHashShapeValid: hashLooksValid,
      loginWillWork: present('ADMIN_PASSWORD_HASH') && present('SESSION_SECRET') && hashLooksValid,
      dashboardWillLoadData: present('NETLIFY_ACCESS_TOKEN') && present('NETLIFY_SITE_ID')
    }, null, 2)
  };
};
