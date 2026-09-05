'use strict';
/* FOB Systems :: public read-only progress dashboard.

   This is the ONLY public surface that can read performance data, and it can
   only ever read one member: the one named inside a valid signed token. There
   is no member id parameter, so there is no id to tamper with. Editing the
   token breaks the HMAC and the request is refused before any query runs.

   What a holder of a valid link can see:
     that member's name, badges, scores, prescription history, session list.
   What they cannot see or reach:
     the member ledger, balances, days, location rate, payment or Stripe data,
     any other member, FOB Rounds, the admin session, or any admin route.

   Rendering is delegated to fob-progress.js so the member-facing dashboard is
   literally the same code as the admin one, with the admin affordances off.
   A second copy would drift and eventually leak something. */

const P = require('./_payment');
const SH = require('./_share');
const V = require('./fob-progress');

const H = {
  'Content-Type': 'text/html; charset=utf-8',
  /* A private link should never be indexed, archived, or leak through a
     referrer header when the member taps something on the page. */
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private'
};

/* Best effort, same shape as the login throttle in _session.js. Serverless
   instances are recycled, so this slows a sustained probe from one warm
   instance rather than guaranteeing a lockout. The real protection is that
   tokens are unguessable, not that requests are rare. */
const hits = new Map();
const MAX = 40;
const WINDOW_MS = 10 * 60 * 1000;

function clientKey(event) {
  const h = event.headers || {};
  return String(h['x-nf-client-connection-ip'] || h['client-ip'] || h['x-forwarded-for'] || 'unknown')
    .split(',')[0].trim();
}

function tooMany(event) {
  const k = clientKey(event);
  const rec = hits.get(k);
  if (!rec || Date.now() - rec.first > WINDOW_MS) { hits.set(k, { n: 1, first: Date.now() }); return false; }
  rec.n += 1;
  return rec.n > MAX;
}

function notice(title, body) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex,nofollow,noarchive"><title>FOB Progress</title><style>'
    + 'body{margin:0;background:#14171B;color:#EFEAE0;font-family:Arial,Helvetica,sans-serif;'
    + 'display:grid;place-items:center;min-height:100vh;text-align:center;padding:26px}'
    + 'p.ey{letter-spacing:.28em;text-transform:uppercase;font-size:11px;color:#D3BE98;margin:0}'
    + 'h1{font-size:26px;margin:13px 0 14px;font-weight:600}'
    + 'p.b{color:#9BA1A8;font-size:14px;line-height:1.6;margin:0;max-width:34ch}'
    + '</style></head><body><div><p class="ey">FOB Systems</p><h1>' + title + '</h1>'
    + '<p class="b">' + body + '</p></div></body></html>';
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: H, body: notice('Not available', 'This link is read only.') };
  }
  if (tooMany(event)) {
    return { statusCode: 429, headers: H, body: notice('Slow down', 'Too many requests. Try again shortly.') };
  }

  const token = String((event.queryStringParameters || {}).t || '');
  const claim = SH.parse(token);
  /* One message for every failure mode. A bad signature, an expired link and a
     well-formed link for a member who no longer exists must be indistinguishable
     from outside, or the response itself becomes an oracle. */
  const dead = notice('Link not available',
    'This progress link is no longer valid. Ask your coach for a new one.');
  if (!claim) return { statusCode: 404, headers: H, body: dead };

  try {
    const mem = await P.db('payment_vip_members?select=id,first_name,last_name,progress_share_from'
      + '&id=eq.' + encodeURIComponent(claim.m) + '&active=eq.true&limit=1');
    if (!mem || !mem.length) return { statusCode: 404, headers: H, body: dead };
    if (SH.revoked(claim, mem[0].progress_share_from)) {
      return { statusCode: 404, headers: H, body: dead };
    }

    const rows = await P.db('fob_performances?select=*&member_id=eq.' + encodeURIComponent(claim.m)
      + '&order=session_date.asc,completed_at.asc&limit=400');

    return { statusCode: 200, headers: H, body: V.page(mem[0], rows || [], { share: true }) };
  } catch (e) {
    console.error('fob-share', e && e.message, e && e.detail);
    return { statusCode: 500, headers: H, body: notice('Unavailable', 'Progress could not be loaded right now.') };
  }
};
