/* ══ FOB SYSTEMS :: SERVICE WORKER ═════════════════════════════════════════
   Deliberately conservative. This caches the interface only, never data.

   WHY NOT CACHE DATA
   Every Gym request is member-scoped and admin-gated. A cached API response
   is a member's training record sitting in a shared browser store, and a
   stale one is worse than no data at all when a coach is reading a
   prescription beside a client. So: /api/ is never touched, and any request
   carrying credentials goes straight to the network.

   WHAT IT DOES CACHE
   The shell: stylesheets, scripts, icons. Stale-while-revalidate, so the app
   opens instantly from cache and quietly updates behind you. HTML is
   network-first, so a deploy is picked up on the next load rather than
   pinning you to an old build.
   ═══════════════════════════════════════════════════════════════════════ */
/* R85 coach-experience convergence changes canonical MAHFITT and Coach Mode assets.
   Bump the shell identity so no R90A/v447 script or stylesheet can win from
   CacheStorage after the humanized Coach Mode deployment. API/member data is
   still never cached. */
const V = 'fob-shell-v452';
/* The stamp the PAGES actually ask for. Precaching '/mygym.js' while the
   document requests '/mygym.js?v=332' meant the two never matched: every shell
   file was downloaded once into an entry nothing would ever read, then
   downloaded again on first use. Derived from V so it cannot drift. */
const N = V.replace(/\D+/g, '');
const SHELL = [
  '/mahfitt-canonical-components.css', '/gym-app.css', '/gym-app.js', '/gym-shared.js',
  '/mygym.css', '/mygym.js', '/mahfitt-ui-state.js', '/mahfitt-navigation.js', '/exercise-visuals.js', '/mahfitt-health.js', '/mahfitt-listening.js', '/mahfitt-mmw.js', '/meal-gradient.css', '/meal-gradient.js', '/music-studio.css', '/image-crop.js',
  '/fob-pitch-worklet.js',
  '/calendar.css', '/calendar-layout.css', '/calendar.js', '/mahfitt-public.css',
  '/mahfitt-geometry.css', '/mahfitt-banner.css', '/mahfitt-atmosphere.js', '/qr-lite.js', '/admin-app.css', '/admin-app.js', '/message-center.css', '/message-center-client.js', '/coach-shell.css', '/coach-shell.js', '/mahfitt-atmosphere.css'
].map(u => u + '?v=' + N).concat([
  '/images/pwa-192.png', '/images/pwa-512.png',
  '/images/favicon-32.png', '/images/apple-touch-icon.png',
  '/images/mahfitt-mark-mask.png', '/images/mahfitt-mark-gold.png'
]);

/* Shown only when a navigation cannot reach the network. Generated here, so
   nothing member-scoped is ever stored in order to satisfy it. */
function offlinePage() {
  return new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<meta name="theme-color" content="#0E1114"><title>Offline</title><style>'
    + 'html,body{margin:0;height:100%;background:#0E1114;color:#EFE8DC;'
    + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}'
    + 'main{min-height:100%;min-height:100dvh;display:grid;place-content:center;'
    + 'text-align:center;padding:28px calc(22px + env(safe-area-inset-left,0px))}'
    + 'p.k{margin:0 0 14px;font-size:10px;letter-spacing:.28em;color:#D3BE98}'
    + 'h1{margin:0 0 10px;font-size:20px;font-weight:600}'
    + 'p.b{margin:0 0 26px;font-size:13px;line-height:1.55;color:#8F969F;max-width:34ch}'
    + 'button{min-height:50px;padding:0 30px;border:1px solid rgba(211,190,152,.34);'
    + 'background:transparent;color:#E9C98F;font:600 11px/1 inherit;letter-spacing:.2em;'
    + 'text-transform:uppercase;touch-action:manipulation}'
    + '</style></head><body><main><p class="k">FOB SYSTEMS</p>'
    + '<h1>You are offline</h1>'
    + '<p class="b">Your training is saved on this device. Reconnect and it will sync.</p>'
    + '<button onclick="location.reload()">Try again</button>'
    + '</main></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
  );
}

self.addEventListener('install', e => {
  /* addAll fails the whole install if one file 404s, so add them one by one. */
  e.waitUntil(caches.open(V).then(c =>
    Promise.all(SHELL.map(u => c.add(u).catch(() => null)))
  ).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* RepDB free-tier exercise illustrations are public, non-member data.
     Cache only the official flat WebP image path after first use. Never cache
     RepDB pages/JSON and never precache the catalog; this keeps MAHFITT from
     becoming a redistributed copy of the third-party dataset. Cross-origin
     image responses may be opaque in Safari, which is valid for CacheStorage. */
  if (url.origin === 'https://exercise-dataset.com'
      && url.pathname.startsWith('/images/flat/')
      && req.destination === 'image') {
    e.respondWith(caches.open(V).then(c => c.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()).catch(() => null);
        return res;
      });
    })));
    return;
  }

  if (url.origin !== location.origin) return;

  /* Pages: always the network, never stored. A page is where a Set-Cookie and
     a member's identity live, so nothing here is written to the cache. The old
     fallback read a cache that navigations never populated, so an offline
     launch resolved to undefined and threw; it now lands on a small branded
     page that says what is happening and offers a retry. */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => offlinePage()));
    return;
  }

  /* Never cache anything member-scoped or authenticated. */
  if (url.pathname.startsWith('/api/')
      || url.pathname === '/mygym' || url.pathname === '/gym-tracker'
      || url.pathname === '/fob-payment' || url.pathname === '/fob-progress'
      || url.pathname === '/calendar' || url.pathname === '/calendar-admin'
      || url.pathname === '/admin' || url.pathname.startsWith('/admin/')
      || req.headers.get('accept') === 'application/json') return;

  /* Media must bypass the shell cache entirely. Safari/iOS uses byte-range
     requests for audio; putting those through stale-while-revalidate can add a
     service-worker hop to every range and can leave a partial response in the
     wrong caching path. Let the browser's native media cache own streaming. */
  if (req.destination === 'audio' || req.destination === 'video'
      || url.pathname.startsWith('/audio/')) return;

  /* Assets: instant from cache, refreshed in the background. */
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
