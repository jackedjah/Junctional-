'use strict';
/* FOB Systems :: signed, expiring, member-scoped progress share links.

   WHY A SEPARATE KEY
   The admin session cookie (_session.js) and the member claim cookie
   (_payment.js) both sign with SESSION_SECRET directly. If share links used the
   same key, a share token and a claim token would be mutually forgeable: the
   signatures would validate across contexts and only the payload shape would
   differ. So the share key is DERIVED from SESSION_SECRET through a fixed
   label. A share token cannot be presented as a session, and a session cannot
   be presented as a share token, even though one secret is configured.

   WHAT A TOKEN CARRIES
   Only a member id, an issue time and an expiry. No score data, no admin
   claim, no route. Whoever holds it can read exactly one member's performance
   history through /fob-share and nothing else.

   REVOCATION
   payment_vip_members.progress_share_from is the per-member cut-off. Setting it
   to now() invalidates every link already issued for that member, because a
   token is only accepted when it was issued at or after that moment. Rotating
   SESSION_SECRET remains the global kill switch for everything at once. */

const crypto = require('crypto');

const LABEL = 'fob-progress-share-v1';
const DEFAULT_DAYS = 90;

function baseSecret() { return process.env.SESSION_SECRET || ''; }

/* Derived key, so share signatures live in their own namespace. */
function key() {
  return crypto.createHmac('sha256', baseSecret()).update(LABEL).digest();
}

function sign(payload) {
  return crypto.createHmac('sha256', key()).update(payload).digest('base64url');
}

function create(memberId, days) {
  if (!baseSecret()) return null;
  const now = Date.now();
  const span = Math.max(1, Math.min(365, parseInt(days, 10) || DEFAULT_DAYS));
  const body = { v: 1, m: String(memberId), iat: now, exp: now + span * 86400000 };
  const payload = Buffer.from(JSON.stringify(body)).toString('base64url');
  return payload + '.' + sign(payload);
}

/* Returns the payload only when the signature, shape and expiry all hold.
   Never throws on malformed input: a share link is public, so garbage is the
   expected case rather than an exceptional one. */
function parse(token) {
  if (!token || !baseSecret()) return null;
  const parts = String(token).split('.');
  if (parts.length !== 2) return null;
  let a, b;
  try {
    a = Buffer.from(parts[1]);
    b = Buffer.from(sign(parts[0]));
  } catch (e) { return null; }
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  let j;
  try { j = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); }
  catch (e) { return null; }
  if (!j || j.v !== 1) return null;
  if (!/^[0-9a-fA-F-]{36}$/.test(String(j.m || ''))) return null;
  if (!Number.isFinite(j.exp) || Date.now() >= j.exp) return null;
  if (!Number.isFinite(j.iat)) return null;
  return j;
}

/* A token is dead if it was issued before the member's revocation cut-off. */
function revoked(payload, revokedFrom) {
  if (!revokedFrom) return false;
  const cut = new Date(revokedFrom).getTime();
  if (!Number.isFinite(cut)) return false;
  return payload.iat < cut;
}

function expiryLabel(payload) {
  const d = new Date(payload.exp);
  return d.toISOString().slice(0, 10);
}

module.exports = { create, parse, revoked, expiryLabel, DEFAULT_DAYS };
