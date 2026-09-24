/* MAHWORLD demo gate (Netlify edge function) — behaviour harness on Node's Web APIs (Request/Response/crypto.subtle, same as the edge runtime).
   node 16_TESTS/gameplay_demo_gate.test.mjs */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
var HERE = path.dirname(fileURLToPath(import.meta.url));
var pass = 0, fail = 0; function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }
/* test-only secrets (never the real ones): the gate reads Netlify.env.get */
var SALT = 'test-salt', PW = 'correct horse battery', SECRET = 'unit-test-signing-secret';
async function sha256hex(s) { var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }
var ENV = { MAHDEMO_PASSWORD_HASH: await sha256hex(SALT + PW), MAHDEMO_SALT: SALT, MAHDEMO_SESSION_SECRET: SECRET, MAHDEMO_SESSION_HOURS: '12' };
globalThis.Netlify = { env: { get: function (k) { return ENV[k]; } } };
/* the gate reads Date.now(): a shifted clock lets the harness walk through the lock window */
var realNow = Date.now; var shift = 0; Date.now = function () { return realNow() + shift; };
var gate = (await import(path.join(HERE, '..', '26_LOCAL_AUTHORITY', 'deploy', 'static', 'edge', 'gate.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'))).default;
var ORIGIN = 'https://mahworld-test-preview.netlify.app'; var PLAY = '/claude_gameplay_runtime/26_local_authority/lab/play?field=1';
var served = 0; var nextImpl = async function () { served++; return new Response('<html>GAME</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }); };
var ctx = { ip: '203.0.113.9', next: function () { return nextImpl(); } };
function req(p, o) { o = o || {}; var h = new Headers(o.headers || {}); if (o.html !== false && !h.has('accept')) h.set('accept', 'text/html,application/xhtml+xml'); if (o.cookie) h.set('cookie', o.cookie); if (o.headers && o.headers.origin === null) h.delete('origin'); return new Request(ORIGIN + p, { method: o.method || 'GET', headers: h, body: o.body }); }
function form(pw, origin) { return { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: origin === undefined ? 'https://fob.systems' : origin }, body: 'password=' + encodeURIComponent(pw) }; }
function setCookies(res) { var out = []; res.headers.forEach(function (v, k) { if (k.toLowerCase() === 'set-cookie') out.push(v); }); if (res.headers.getSetCookie) out = res.headers.getSetCookie(); return out; }
function cookieOf(res, name) { var c = setCookies(res).filter(function (x) { return x.indexOf(name + '=') === 0; })[0] || ''; return c.split(';')[0]; }
/* A. fresh visit → password prompt at the same URL, 401, no-store, no game bytes, CDN told never to cache */
var r = await gate(req(PLAY), ctx); var body = await r.text();
ok('A. unauthenticated navigation gets the password page (401, no-store) at the same URL — no redirect', r.status === 401 && /MAHWORLD DEMO/.test(body) && /name="password"/.test(body) && /Enter Demo/.test(body) && r.headers.get('cache-control') === 'no-store' && served === 0, { status: r.status, served: served });
ok('A2. the page never contains the password or the hash', body.indexOf(PW) < 0 && body.indexOf(ENV.MAHDEMO_PASSWORD_HASH) < 0);
ok('A3. the form posts to the SAME url (action="") so the fob.systems/mahdemo prefix is preserved; username field for password managers', /action=""/.test(body) && /autocomplete="username"/.test(body));
ok('A4. every gate response carries Netlify-CDN-Cache-Control: no-store + Netlify-Vary on the session cookie', r.headers.get('netlify-cdn-cache-control') === 'no-store' && /mahdemo_s/.test(r.headers.get('netlify-vary') || ''));
/* F. asset without a session → 401 JSON, never HTML */
var a = await gate(req('/claude_gameplay_runtime/26_local_authority/lab/play.js', { html: false, headers: { accept: '*/*' } }), ctx); var at = await a.text();
ok('F. unauthenticated asset request → 401 JSON (not a 200 login page)', a.status === 401 && /DEMO_LOGIN_REQUIRED/.test(at) && (a.headers.get('content-type') || '').indexOf('application/json') === 0 && served === 0);
/* B. wrong password → post/redirect/get: 303 to the same relative URL with ?mahdemo_err, the GET renders 401 + a readable error */
var w = await gate(req(PLAY, form('nope')), ctx); var wc = setCookies(w);
ok('B. wrong password → 303 to play?field=1&mahdemo_err=w4 with a signed HttpOnly Secure failure cookie (refresh never re-submits)', w.status === 303 && w.headers.get('location') === 'play?field=1&mahdemo_err=w4' && wc.some(function (c) { return /^mahdemo_f=/.test(c) && /HttpOnly/.test(c) && /Secure/.test(c); }), { status: w.status, loc: w.headers.get('location'), cookies: wc });
var wp = await gate(req(PLAY + '&mahdemo_err=w4'), ctx); var wpt = await wp.text();
ok('B1. the GET after a wrong password shows the readable error and the form again (401)', wp.status === 401 && /Wrong password\. 4 attempts left/.test(wpt) && /name="password"/.test(wpt), { status: wp.status });
/* rate limit: 5 failures within the window → locked for 60 s (429 on the rendered page, Retry-After ≤ 60), then open again */
var failCookie = cookieOf(w, 'mahdemo_f'); var last = null; for (var i = 0; i < 5; i++) { last = await gate(req(PLAY, Object.assign(form('nope' + i), { cookie: failCookie })), ctx); var fc = cookieOf(last, 'mahdemo_f'); if (fc) failCookie = fc; }
var lockLoc = last.headers.get('location') || ''; var lockPage = await gate(req(PLAY + '&' + lockLoc.split('?')[1], { cookie: failCookie }), ctx); var lockText = await lockPage.text();
ok('B2. five failures in a minute → locked: 303 with Retry-After ≤ 60, rendered as 429 "Too many attempts" (no permanent lockout)', last.status === 303 && /mahdemo_err=l\d+/.test(lockLoc) && parseInt(last.headers.get('retry-after') || '0', 10) > 0 && parseInt(last.headers.get('retry-after') || '0', 10) <= 60 && lockPage.status === 429 && /Too many attempts/.test(lockText), { status: last.status, loc: lockLoc, retry: last.headers.get('retry-after'), page: lockPage.status });
var during = await gate(req(PLAY, Object.assign(form(PW), { cookie: failCookie })), ctx);
shift = 61 * 1000; var afterLock = await gate(req(PLAY, Object.assign(form(PW), { cookie: failCookie })), ctx); shift = 0;
ok('B3. the correct password is refused while locked (303 to the lock message) and accepted 61 s later (303 + session)', during.status === 303 && /mahdemo_err=l/.test(during.headers.get('location') || '') && afterLock.status === 303 && /^mahdemo_s=/.test(cookieOf(afterLock, 'mahdemo_s')), { during: during.headers.get('location'), after: afterLock.headers.get('location') });
/* B4. a script that discards cookies and rotates X-Forwarded-For still hits the address limiter (context.ip is what counts) */
var ctxB = Object.assign({}, ctx, { ip: '198.51.100.77' }); var lastB = null; for (var j = 0; j < 31; j++) { lastB = await gate(req(PLAY, Object.assign(form('nope' + j), { headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://fob.systems', 'x-forwarded-for': '10.0.0.' + j + ', 198.51.100.77' } })), ctxB); }
ok('B4. cookie-less burst with rotating first-hop XFF from one attested address → locked at the memory limit (Retry-After set)', lastB.status === 303 && /mahdemo_err=l/.test(lastB.headers.get('location') || ''), { loc: lastB.headers.get('location') });
/* C. correct password (fresh client) → 303 to the same relative URL + signed HttpOnly Secure session cookie */
var ctx2 = Object.assign({}, ctx, { ip: '198.51.100.4' }); var c = await gate(req(PLAY + '&mahdemo_err=w4', form(PW)), ctx2); var cc = setCookies(c); var sess = cc.filter(function (x) { return /^mahdemo_s=/.test(x); })[0] || '';
ok('C. correct password → 303 back to the SAME relative URL (play?field=1, error flag dropped) with a signed session cookie: HttpOnly, Secure, SameSite=Lax, expiring', c.status === 303 && c.headers.get('location') === 'play?field=1' && /HttpOnly/.test(sess) && /Secure/.test(sess) && /SameSite=Lax/.test(sess) && /Max-Age=43200/.test(sess), { status: c.status, loc: c.headers.get('location'), sess: sess.replace(/mahdemo_s=[^;]+/, 'mahdemo_s=<token>') });
var token = sess.split(';')[0];
/* D. refresh with the cookie → the game is served; asset with cookie → served with private cache headers; glb content-type */
var d = await gate(req(PLAY, { cookie: token }), ctx2); var dt = await d.text();
ok('D. refresh with the session → the game page is served (context.next), private cache, CDN no-store', d.status === 200 && dt === '<html>GAME</html>' && /private/.test(d.headers.get('cache-control') || '') && d.headers.get('netlify-cdn-cache-control') === 'no-store', { status: d.status, cc: d.headers.get('cache-control') });
var g = await gate(req('/x/model.glb', { html: false, cookie: token, headers: { accept: '*/*' } }), ctx2);
ok('D2. a GLB with the session is served as model/gltf-binary, private immutable', g.status === 200 && g.headers.get('content-type') === 'model/gltf-binary' && /private, max-age=31536000, immutable/.test(g.headers.get('cache-control') || ''));
/* tampered / expired tokens are refused */
var bad = token.replace(/.$/, function (ch) { return ch === 'a' ? 'b' : 'a'; }); var t1 = await gate(req(PLAY, { cookie: bad }), ctx2);
var expired = 'mahdemo_s=' + (Math.floor(Date.now() / 1000) - 10) + '.abc.' + '0'.repeat(64); var t2 = await gate(req(PLAY, { cookie: expired }), ctx2);
ok('D3. a tampered or expired session token is refused (401 page)', t1.status === 401 && t2.status === 401);
/* D4. an origin redirect with an absolute same-origin Location is rewritten relative (the browser stays under the proxy prefix) */
nextImpl = async function () { return new Response(null, { status: 301, headers: { Location: ORIGIN + '/claude_gameplay_runtime/26_local_authority/lab/play' } }); };
var rd = await gate(req('/claude_gameplay_runtime/26_local_authority/lab/play.html', { cookie: token }), ctx2); nextImpl = async function () { served++; return new Response('<html>GAME</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }); };
ok('D4. an absolute same-origin Location from the origin becomes a relative reference ("play")', rd.status === 301 && rd.headers.get('location') === 'play', { loc: rd.headers.get('location') });
/* D5. an authenticated form POST is not treated as a login attempt (falls through to the site) */
var ap = await gate(req(PLAY, Object.assign(form('anything'), { cookie: token })), ctx2);
ok('D5. an authenticated urlencoded POST falls through to context.next (not consumed as a login)', ap.status === 200);
/* E. logout → cookie cleared, redirected to the same URL without the logout flag, then the prompt again */
var e = await gate(req(PLAY + '&mahdemo_logout=1', { cookie: token }), ctx2); var ec = setCookies(e).filter(function (x) { return /^mahdemo_s=/.test(x); })[0] || '';
ok('E. logout clears the cookie (Max-Age=0) and returns 303 to play?field=1', e.status === 303 && e.headers.get('location') === 'play?field=1' && /Max-Age=0/.test(ec), { status: e.status, loc: e.headers.get('location'), ec: ec });
/* login CSRF: a cross-site auto-submit is refused; a same-site or fob.systems origin is accepted; no Origin/Referer at all is refused */
var x1 = await gate(req(PLAY, form(PW, 'https://evil.example')), ctx2); var x2 = await gate(req(PLAY, form(PW, null)), ctx2); var x3 = await gate(req(PLAY, form(PW, ORIGIN)), ctx2);
ok('I. cross-site login POST refused (403), missing Origin refused, same-origin accepted (303)', x1.status === 403 && x2.status === 403 && x3.status === 303, { x1: x1.status, x2: x2.status, x3: x3.status });
/* entry redirects stay relative */
var root = await gate(req('/'), ctx2); var goUp = await gate(req('/INDEX.html'), ctx2);
ok('G. "/" (and /INDEX.html, case-insensitive) → 303 with a RELATIVE Location (survives the fob.systems/mahdemo/ proxy prefix)', root.status === 303 && root.headers.get('location') === 'claude_gameplay_runtime/26_local_authority/lab/play?field=1' && goUp.status === 303);
/* misconfiguration is a closed gate, not an open one; env hygiene */
var saved = Object.assign({}, ENV);
ENV.MAHDEMO_SESSION_SECRET = undefined; var m1 = await gate(req(PLAY, { cookie: token }), ctx2); ENV.MAHDEMO_SESSION_SECRET = 'short'; var m2 = await gate(req(PLAY, { cookie: token }), ctx2); Object.assign(ENV, saved);
ok('H. without its secrets (or with a 5-char secret) the gate refuses (503), it never falls open', m1.status === 503 && m2.status === 503, { m1: m1.status, m2: m2.status });
ENV.MAHDEMO_PASSWORD_HASH = saved.MAHDEMO_PASSWORD_HASH.toUpperCase() + '\n'; var hy = await gate(req(PLAY, form(PW)), ctx2); Object.assign(ENV, saved);
ok('H2. a pasted hash with trailing newline / upper-case hex still verifies (values are trimmed + lower-cased)', hy.status === 303 && /^mahdemo_s=/.test(cookieOf(hy, 'mahdemo_s')), { status: hy.status });
ENV.MAHDEMO_SESSION_HOURS = '-1'; var hh = await gate(req(PLAY, form(PW)), ctx2); Object.assign(ENV, saved);
ok('H3. MAHDEMO_SESSION_HOURS <= 0 falls back to 12 h (no login loop)', hh.status === 303 && /Max-Age=43200/.test(cookieOf(hh, 'mahdemo_s') ? setCookies(hh).filter(function (x) { return /^mahdemo_s=/.test(x); })[0] : ''));
/* password change revokes existing sessions */
ENV.MAHDEMO_PASSWORD_HASH = await sha256hex(SALT + 'a new password'); var rev = await gate(req(PLAY, { cookie: token }), ctx2); Object.assign(ENV, saved);
ok('H4. changing the password invalidates every existing session (401 page)', rev.status === 401);
/* the gate fails closed on an unexpected error */
nextImpl = async function () { throw new Error('origin exploded'); }; var boom = await gate(req(PLAY, { cookie: token }), ctx2); nextImpl = async function () { served++; return new Response('<html>GAME</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }); };
ok('H5. a throw inside the gate → 503 no-store (never a 200 bypass)', boom.status === 503 && boom.headers.get('cache-control') === 'no-store');
Date.now = realNow;
console.log('RESULT demo gate: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
