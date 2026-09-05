/* FOB Systems - shared auth helpers for the private Form Review area.
   Uses only Node's built-in crypto: no packages, nothing to audit. */
'use strict';
const crypto = require('crypto');

const COOKIE = 'fob_review';
const SESSION_HOURS = 8;

/* ---- password ---------------------------------------------------------- */
/* ADMIN_PASSWORD_HASH is stored as "salt:scryptHash" (both hex).
   The plain password never exists anywhere in the repo or the browser. */
function verifyPassword(candidate) {
  const stored = process.env.ADMIN_PASSWORD_HASH || '';
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  let actual;
  try {
    actual = crypto.scryptSync(String(candidate), salt, 64).toString('hex');
  } catch (e) {
    return false;
  }
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b); // constant time, no timing leak
}

/* ---- session token ----------------------------------------------------- */
/* token = base64(expiryMs).hmac  -- signed, so it cannot be forged, and it
   carries no password material. */
function secret() {
  return process.env.SESSION_SECRET || '';
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

function createToken() {
  const expiry = String(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  const payload = Buffer.from(expiry).toString('base64');
  return payload + '.' + sign(payload);
}

function tokenValid(token) {
  if (!token || !secret()) return false;
  const parts = String(token).split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const expiry = parseInt(Buffer.from(payload, 'base64').toString('utf8'), 10);
  return Number.isFinite(expiry) && Date.now() < expiry;
}

/* ---- cookies ----------------------------------------------------------- */
function readCookie(headers) {
  const raw = (headers && (headers.cookie || headers.Cookie)) || '';
  const found = raw.split(';').map(s => s.trim()).find(s => s.indexOf(COOKIE + '=') === 0);
  return found ? found.slice(COOKIE.length + 1) : '';
}

function isProd() {
  return (process.env.CONTEXT || 'production') === 'production';
}

function setCookieHeader(token) {
  const bits = [
    COOKIE + '=' + token,
    'HttpOnly',                       // unreachable from JavaScript
    'Path=/',
    'SameSite=Strict',                // not sent on cross-site requests
    'Max-Age=' + SESSION_HOURS * 60 * 60
  ];
  if (isProd()) bits.push('Secure');  // HTTPS only in production
  return bits.join('; ');
}

function clearCookieHeader() {
  const bits = [COOKIE + '=', 'HttpOnly', 'Path=/', 'SameSite=Strict', 'Max-Age=0'];
  if (isProd()) bits.push('Secure');
  return bits.join('; ');
}

function isAuthed(event) {
  return tokenValid(readCookie(event.headers || {}));
}

/* ---- failed attempt throttling ----------------------------------------- */
/* Best effort: serverless instances are recycled, so this slows down a
   sustained attack from one warm instance rather than guaranteeing a lockout. */
const attempts = new Map();
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 10 * 60 * 1000;

function clientKey(event) {
  const h = event.headers || {};
  return (h['x-nf-client-connection-ip'] || h['client-ip'] || h['x-forwarded-for'] || 'unknown')
    .split(',')[0].trim();
}

function throttled(event) {
  const rec = attempts.get(clientKey(event));
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) { attempts.delete(clientKey(event)); return false; }
  return rec.count >= MAX_ATTEMPTS;
}

function noteFailure(event) {
  const key = clientKey(event);
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else rec.count += 1;
}

function clearFailures(event) {
  attempts.delete(clientKey(event));
}

const SECURITY_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
};

module.exports = {
  COOKIE, SESSION_HOURS, verifyPassword, createToken, tokenValid,
  readCookie, setCookieHeader, clearCookieHeader, isAuthed,
  throttled, noteFailure, clearFailures, SECURITY_HEADERS
};
