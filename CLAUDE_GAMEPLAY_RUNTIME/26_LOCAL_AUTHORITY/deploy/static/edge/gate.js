/* MAHWORLD DEMO — access gate (Netlify Edge Function, runs before every asset of the demo site).
 *
 * Serves as the ONE password gate for the demo whether it is reached through the fob.systems proxy (/mahdemo/...) or the underlying
 * netlify.app address (which is therefore gated too, not a bypass). Everything is relative to the requested URL, so the browser stays on
 * whatever public prefix the proxy used:
 *   · unauthenticated navigation (Accept: text/html)  -> 401 + the login page at the SAME URL, no redirect
 *   · unauthenticated asset / API request              -> 401 JSON (never login HTML with a 200 for a module or a GLB)
 *   · POST password (same URL, same-origin form)       -> verify -> 303 to the same relative URL with a signed, expiring session cookie
 *   · wrong password                                   -> 303 back to the page with ?mahdemo_err=... (post/redirect/get, so refresh never
 *                                                         re-submits) which renders 401 + a readable error; 5 failures / 60 s -> 60 s pause (429)
 *   · ?mahdemo_logout=1                                -> cookie cleared, back to the login page
 *   · valid session                                    -> context.next() (the static file), browser-private cache headers, CDN never caches
 * Secrets live ONLY in environment variables (MAHDEMO_PASSWORD_HASH = 'sha256$<salt>$<sha256(salt + password) hex>', MAHDEMO_SESSION_SECRET).
 * Nothing here is served to the browser; the password never appears in this file, in HTML, in URLs or in logs (log lines carry event names
 * only). Sessions are signed with the secret AND the password verifier, so changing the password logs everyone out; rotating
 * MAHDEMO_SESSION_SECRET (then redeploy) is the kill switch. The memory limiter is per edge isolate and advisory; the signed cookie carries
 * the per-browser count; the password's entropy is the real defence. The function fails CLOSED (onError: 'fail', every throw -> 503).
 */
const COOKIE = 'mahdemo_s';
const FAIL_COOKIE = 'mahdemo_f';
const SESSION_HOURS_DEFAULT = 12;
const FAIL_LIMIT = 5, FAIL_WINDOW_S = 60, LOCK_S = 60, MEM_LIMIT = 30;
const PLAY = 'claude_gameplay_runtime/26_local_authority/lab/play?field=1';

const enc = new TextEncoder();
function hex(buf) { return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
async function sha256hex(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
async function hmacHex(secret, msg) { const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg))); }
function timingSafeEqual(a, b) { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
function cookies(req) { const out = {}; (req.headers.get('cookie') || '').split(';').forEach(function (p) { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); }); return out; }
function env(name, d) { try { const v = (typeof Netlify !== 'undefined' && Netlify.env && Netlify.env.get) ? Netlify.env.get(name) : undefined; const t = v === undefined || v === null ? '' : String(v).trim(); return t === '' ? d : t; } catch (e) { return d; } }
function now() { return Math.floor(Date.now() / 1000); }
function wantsHtml(req) { const a = req.headers.get('accept') || ''; const m = req.headers.get('sec-fetch-mode') || ''; return a.indexOf('text/html') >= 0 || m === 'navigate'; }
function clientId(req, context) { /* platform-attested address first (a client can prepend anything to X-Forwarded-For); behind the fob.systems proxy this is the proxy's address, so the cookie limiter carries the per-browser count and the memory limiter is a coarse anti-burst guard */ const ip = (context && context.ip) || ''; const xff = (req.headers.get('x-forwarded-for') || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); return ip || xff[xff.length - 1] || 'unknown'; }
function sameSiteOrigin(req) { /* login CSRF guard: the form is same-origin (action=""), so a real submit carries an Origin (or Referer) whose host is the request host (netlify.app / deploy alias) or one of the public hosts the proxy answers on */ const reqHost = (new URL(req.url)).host.toLowerCase(); const allowed = [reqHost].concat(String(env('MAHDEMO_PUBLIC_HOSTS', 'fob.systems,www.fob.systems')).split(',').map(function (h) { return h.trim().toLowerCase(); }).filter(Boolean)); const src = req.headers.get('origin') || req.headers.get('referer') || ''; if (!src) return false; let host = ''; try { host = new URL(src).host.toLowerCase(); } catch (e) { return false; } return allowed.indexOf(host) >= 0 || /(^|\.)netlify\.app$/.test(host) && host.indexOf('mahworld-test-preview') >= 0; }
/* the browser must stay on the public URL: every Location is a RELATIVE reference (last path segment + query), which resolves the same
   under fob.systems/mahdemo/... and under the netlify.app origin */
function selfRef(url, dropParams, add) { const segs = url.pathname.split('/'); let last = segs[segs.length - 1]; const sp = new URLSearchParams(url.search); (dropParams || []).forEach(function (k) { sp.delete(k); }); if (add) Object.keys(add).forEach(function (k) { sp.set(k, add[k]); }); const q = sp.toString(); if (!last) last = './'; else if (last.indexOf(':') >= 0) last = './' + last; return last + (q ? '?' + q : ''); }
/* a same-origin absolute Location from the origin (e.g. Netlify's trailing-slash normalisation) becomes a relative reference too */
function relRef(fromPath, toPath) { const from = fromPath.split('/').slice(1, -1), to = toPath.split('/').slice(1); let i = 0; while (i < from.length && i < to.length - 1 && from[i] === to[i]) i++; const ref = '../'.repeat(from.length - i) + to.slice(i).join('/'); return ref === '' ? './' : (/^[^/?#]*:/.test(ref) ? './' + ref : ref); }
function cookieHeader(name, value, maxAge, secure) { return name + '=' + value + '; Path=/; Max-Age=' + maxAge + '; HttpOnly; SameSite=Lax' + (secure ? '; Secure' : ''); }
function isSecure(req) { const u = new URL(req.url); return u.protocol === 'https:' || (req.headers.get('x-forwarded-proto') || '') === 'https'; }
function baseHeaders(h) { /* browser: no shared cache; Netlify CDN (both the demo site's and the proxying main site's): never cache, vary on the session cookie */ h.set('Cache-Control', h.get('Cache-Control') || 'no-store'); h.set('Netlify-CDN-Cache-Control', 'no-store'); h.set('Netlify-Vary', 'cookie=' + COOKIE); h.set('Vary', 'Cookie'); h.set('X-Robots-Tag', 'noindex, nofollow, noarchive'); return h; }
function logEv(ev, extra) { try { console.log(JSON.stringify(Object.assign({ gate: 'mahdemo', ev: ev }, extra || {}))); } catch (e) { } }

async function makeSession(key, hours) { const exp = now() + Math.round(hours * 3600); const nonce = crypto.randomUUID().replace(/-/g, ''); const sig = await hmacHex(key, exp + '.' + nonce); return exp + '.' + nonce + '.' + sig; }
async function validSession(key, token) { if (!token || typeof token !== 'string') return false; const parts = token.split('.'); if (parts.length !== 3) return false; const exp = parseInt(parts[0], 10); if (!isFinite(exp) || exp < now()) return false; const sig = await hmacHex(key, parts[0] + '.' + parts[1]); return timingSafeEqual(sig, parts[2]); }
/* failure counter: a signed cookie the client carries (n.t.until.sig — count, window start, lock end) plus a per-isolate memory table keyed by
   client address with a higher threshold (a scripted burst that discards cookies is still slowed; a shared proxy address is not locked by one
   person's typos). Lockouts are 60 s, never permanent; success clears the address entry. */
const MEM = new Map();
function memEvict() { if (MEM.size <= 2000) return; const cut = now() - (FAIL_WINDOW_S + LOCK_S); MEM.forEach(function (v, k) { if ((v.t || 0) < cut && (v.until || 0) < now()) MEM.delete(k); }); if (MEM.size > 4000) { let n = MEM.size - 2000; for (const k of MEM.keys()) { if (n-- <= 0) break; MEM.delete(k); } } }
async function failState(req, id, secret) { const c = cookies(req)[FAIL_COOKIE]; let rec = null; if (c) { const p = c.split('.'); if (p.length === 4 && timingSafeEqual(await hmacHex(secret, p[0] + '.' + p[1] + '.' + p[2]), p[3])) rec = { n: parseInt(p[0], 10) || 0, t: parseInt(p[1], 10) || 0, until: parseInt(p[2], 10) || 0 }; } return { id: id, rec: rec, mem: MEM.get(id) || null }; }
function lockLeftOf(rec, limit) { if (!rec) return 0; const t = now(); if (rec.until && rec.until > t) return rec.until - t; if (rec.n >= limit && (t - (rec.t || 0)) < FAIL_WINDOW_S) return FAIL_WINDOW_S - (t - rec.t); return 0; }
function locked(state) { return Math.max(lockLeftOf(state.rec, FAIL_LIMIT), lockLeftOf(state.mem, MEM_LIMIT)); }
function bump(rec, limit) { const t = now(); const r = rec && (t - (rec.t || 0)) < FAIL_WINDOW_S && !(rec.until && rec.until <= t) ? { n: (rec.n || 0) + 1, t: rec.t, until: rec.until || 0 } : { n: 1, t: t, until: 0 }; if (r.n >= limit && !r.until) r.until = t + LOCK_S; return r; }
async function recordFailure(state, secret, headers, secure) { const rec = bump(state.rec, FAIL_LIMIT); MEM.set(state.id, bump(state.mem, MEM_LIMIT)); memEvict(); const sig = await hmacHex(secret, rec.n + '.' + rec.t + '.' + rec.until); headers.append('Set-Cookie', cookieHeader(FAIL_COOKIE, rec.n + '.' + rec.t + '.' + rec.until + '.' + sig, FAIL_WINDOW_S + LOCK_S, secure)); return rec; }

function page(opts) { const err = opts.error ? '<p class="err" role="alert">' + opts.error + '</p>' : ''; return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="theme-color" content="#05080f"><title>MAHWORLD DEMO</title><style>html,body{margin:0;min-height:100%;background:#05080f;color:#eef4ff;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}main{min-height:100vh;min-height:100svh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}form{width:100%;max-width:360px;background:rgba(12,20,36,.85);border:1px solid rgba(190,220,255,.18);border-radius:16px;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,.5)}h1{margin:0 0 6px;font-size:22px;letter-spacing:.16em}p.sub{margin:0 0 20px;color:rgba(205,225,255,.6);font-size:13px}label{display:block;font-size:12px;letter-spacing:.12em;color:rgba(205,225,255,.75);margin-bottom:6px}input{width:100%;box-sizing:border-box;font-size:18px;padding:12px 14px;border-radius:10px;border:1px solid rgba(190,220,255,.28);background:#0b1424;color:#eef4ff;outline:none}input:focus{border-color:#8fd0ff}.u{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}button{margin-top:16px;width:100%;font-size:16px;font-weight:600;letter-spacing:.08em;padding:14px;border-radius:10px;border:0;background:#8fd0ff;color:#05080f;cursor:pointer}button:active{transform:translateY(1px)}.err{margin:12px 0 0;color:#ffb27a;font-size:14px}.hint{margin:14px 0 0;color:rgba(205,225,255,.45);font-size:12px}</style></head><body><main><form method="post" action="" autocomplete="on"><h1>MAHWORLD DEMO</h1><p class="sub">Private preview — enter the shared password to open the playable demo.</p><input class="u" type="text" name="username" value="mahdemo" autocomplete="username" readonly tabindex="-1" aria-hidden="true"><label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" required autofocus><button type="submit">Enter Demo</button>' + err + '<p class="hint">Works in Chrome, Safari and iPad Safari. Nothing to install.</p></form></main></body></html>'; }
function htmlResponse(status, body, extraHeaders) { const h = baseHeaders(new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff' })); if (extraHeaders) extraHeaders.forEach(function (v, k) { h.append(k, v); }); return new Response(body, { status: status, headers: h }); }
function redirect(location, extraHeaders) { const h = baseHeaders(new Headers({ Location: location, 'Cache-Control': 'no-store' })); if (extraHeaders) extraHeaders.forEach(function (v, k) { h.append(k, v); }); return new Response(null, { status: 303, headers: h }); }
function errMessage(code) { /* ?mahdemo_err=w<attempts left> | l<seconds> — rendered on the GET after a failed POST */ if (!code) return null; const m = /^([wl])(\d+)$/.exec(code); if (!m) return null; if (m[1] === 'l') return { status: 429, retry: parseInt(m[2], 10), text: 'Too many attempts. Try again in ' + m[2] + ' s.' }; const left = parseInt(m[2], 10); return { status: 401, text: 'Wrong password. ' + (left > 0 ? left + ' attempt' + (left === 1 ? '' : 's') + ' left before a short pause.' : 'Wait a moment, then try again.') }; }

let misconfigLogged = false;
async function handle(req, context) {
  const url = new URL(req.url); const secret = env('MAHDEMO_SESSION_SECRET'); const pwRaw = env('MAHDEMO_PASSWORD_HASH'); /* verifier formats: 'sha256$<salt>$<hex>' (salt embedded) or '<hex>' with MAHDEMO_SALT */ const pwParts = pwRaw ? String(pwRaw).split('$') : []; const pwHash = String(pwParts.length === 3 ? pwParts[2] : (pwRaw || '')).trim().toLowerCase(); const salt = pwParts.length === 3 ? pwParts[1] : env('MAHDEMO_SALT', ''); const hRaw = parseFloat(env('MAHDEMO_SESSION_HOURS', String(SESSION_HOURS_DEFAULT))); const hours = hRaw > 0 && hRaw <= 168 ? hRaw : SESSION_HOURS_DEFAULT;
  const missing = [!secret || secret.length < 16 ? 'MAHDEMO_SESSION_SECRET' : '', !/^[0-9a-f]{64}$/.test(pwHash) ? 'MAHDEMO_PASSWORD_HASH' : ''].filter(Boolean);
  if (missing.length) { if (!misconfigLogged) { misconfigLogged = true; logEv('misconfig', { missing: missing }); } return new Response('MAHWORLD demo gate is not configured on this deploy.', { status: 503, headers: baseHeaders(new Headers({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })) }); }
  const sessionKey = secret + '|' + pwHash.slice(0, 16); /* sessions die with a password change */
  const secure = isSecure(req); const ck = cookies(req); const authed = await validSession(sessionKey, ck[COOKIE]); const lowerPath = url.pathname.toLowerCase();
  /* logout */
  if (url.searchParams.get('mahdemo_logout') === '1') { const h = new Headers(); h.append('Set-Cookie', cookieHeader(COOKIE, '', 0, secure)); return redirect(selfRef(url, ['mahdemo_logout', 'mahdemo_err']), h); }
  /* entry redirects, kept relative so the proxy prefix survives */
  if (lowerPath === '/' || lowerPath === '/go' || lowerPath === '/index.html') return redirect(PLAY);
  /* login (only for a client without a session: an authenticated form POST is the site's business, not a login) */
  if (!authed && req.method === 'POST' && (req.headers.get('content-type') || '').indexOf('application/x-www-form-urlencoded') === 0) {
    if (!sameSiteOrigin(req)) return htmlResponse(403, page({ error: 'This form must be submitted from the demo page itself.' }));
    const id = clientId(req, context); const state = await failState(req, id, secret); const lockLeft = locked(state);
    if (lockLeft > 0) { logEv('lockout', { left: lockLeft }); return redirect(selfRef(url, ['mahdemo_logout', 'mahdemo_err'], { mahdemo_err: 'l' + lockLeft }), new Headers({ 'Retry-After': String(lockLeft) })); }
    let pw = ''; try { const form = await req.formData(); pw = String(form.get('password') || ''); } catch (e) { pw = ''; }
    const ok = pw.length > 0 && timingSafeEqual(await sha256hex(salt + pw), pwHash);
    if (ok) { MEM.delete(id); logEv('login_ok'); const h = new Headers(); h.append('Set-Cookie', cookieHeader(COOKIE, await makeSession(sessionKey, hours), Math.round(hours * 3600), secure)); h.append('Set-Cookie', cookieHeader(FAIL_COOKIE, '', 0, secure)); return redirect(selfRef(url, ['mahdemo_logout', 'mahdemo_err']), h); }
    const h = new Headers(); const rec = await recordFailure(state, secret, h, secure); const left = Math.max(0, FAIL_LIMIT - rec.n); const nowLocked = locked({ rec: rec, mem: MEM.get(id) }); logEv('login_fail', { n: rec.n });
    if (nowLocked > 0) h.set('Retry-After', String(nowLocked));
    return redirect(selfRef(url, ['mahdemo_logout', 'mahdemo_err'], { mahdemo_err: nowLocked > 0 ? 'l' + nowLocked : 'w' + left }), h);
  }
  if (!authed) {
    if (wantsHtml(req)) { const m = errMessage(url.searchParams.get('mahdemo_err')); return htmlResponse(m ? m.status : 401, page({ error: m && m.text }), m && m.retry ? new Headers({ 'Retry-After': String(m.retry) }) : undefined); }
    return new Response(JSON.stringify({ ok: false, reason: 'DEMO_LOGIN_REQUIRED' }), { status: 401, headers: baseHeaders(new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })) });
  }
  /* authenticated: serve the static file; browser-private caching only (never a shared cache for gated bytes); an origin redirect (e.g. a
     trailing-slash normalisation with an absolute same-origin Location) is turned into a relative one so the browser stays under the proxy prefix */
  const res = await context.next(); const out = new Response(res.body, res); const p = url.pathname;
  if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { let loc = res.headers.get('location'); try { const lu = new URL(loc, url); if (lu.origin === url.origin) loc = relRef(url.pathname, lu.pathname) + lu.search; } catch (e) { } out.headers.set('Location', loc); }
  out.headers.set('Cache-Control', /\.glb$/i.test(p) ? 'private, max-age=31536000, immutable' : 'private, max-age=0, must-revalidate'); if (/\.glb$/i.test(p)) out.headers.set('Content-Type', 'model/gltf-binary'); baseHeaders(out.headers); return out;
}

export default async (req, context) => { try { return await handle(req, context); } catch (e) { logEv('error', { name: e && e.name, message: String(e && e.message || e).slice(0, 200) }); return new Response('MAHWORLD demo gate error.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Netlify-CDN-Cache-Control': 'no-store' } }); } };

export const config = { path: '/*', onError: 'fail' }; /* NEVER bypass on failure: the gate fails closed */
