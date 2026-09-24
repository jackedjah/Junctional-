# fob.systems/mahdemo — public access repair (2026-09-17)

## Cause of the blockage
`https://fob.systems/mahdemo` (and `/mahdemo/`) returns the main site's own 404 page ("Off the Map"): the main Netlify project
(unrivaled-quokka-ddcf49, da939c11-2915-43e5-9d61-a4b617eb7a5e, current deploy 6aa2f29478e93e4711f7b9f6, a zip "drop" build with 93 redirect
rules and 54 functions) has NO rule for /mahdemo. Its source tree is not on this machine, so the previous handoff could only write the two lines
down (deploy/FOB_SYSTEMS_MAHDEMO_ROUTE.md). Nothing else is broken: DNS/TLS fine, no service worker, no stale build; the demo site itself was
reachable at its netlify.app address with NO gate at all (an unauthenticated bypass, now closed).

## What is deployed now (demo project mahworld-test-preview, 968f80e5-889b-43a8-b2cd-5860c588546a)
deploy 6aab65567e997ae33c1da204 = the S13 build (git ae2a9b4: daytime district, ATHLETE_M_V8 surgical legs, rear camera, endpoint emotes, exercise attacks, donor hit reaction) behind the reviewed gate v2; rollback = the previous gated deploy 6aab35c5cedca9fb585a2fbe (S11 world, V6 body) via the Netlify UI 'publish deploy' — every earlier gated deploy stays gated at its permalink (verified 401) with the edge-function gate
`netlify/edge-functions/gate.js` on every path: password page (401 + HTML at the same URL), same-origin POST with an Origin/Referer check,
sha256(salt+password) verifier and HMAC session secret held ONLY in the site's environment variables (MAHDEMO_PASSWORD_HASH,
MAHDEMO_SESSION_SECRET, MAHDEMO_SESSION_HOURS — plain env vars: the free tier rejected the "secret" flag), signed 12 h cookie
(HttpOnly, Secure, SameSite=Lax, Path=/), logout via ?mahdemo_logout=1, 5 failures/60 s → 429 for 60 s (signed cookie + per-edge memory,
keyed by the platform-attested address, 30/60 s for a cookie-less burst), unauthenticated assets → 401 JSON, private cache headers plus
`Netlify-CDN-Cache-Control: no-store` / `Netlify-Vary: cookie=mahdemo_s` so neither CDN (demo or proxying main site) can cache gated bytes,
relative redirects so the browser stays on whatever prefix the proxy used, post/redirect/get for failures (refresh never re-submits), sessions
bound to the password verifier (changing the password logs everyone out; rotating MAHDEMO_SESSION_SECRET is the kill switch), env values
trimmed + validated (misconfiguration → 503, logged by variable NAME only), fail-closed (`onError: 'fail'`, any throw → 503), origin
redirects rewritten relative, `/.netlify/images` closed. Adversarial review (auth / proxy / abuse lenses) applied; remaining accepted notes:
cookies are Path=/ on the shared origin (HttpOnly; the proxying origin already sees every gated byte) and the memory limiter is per edge isolate. Verified with curl and a fresh Chromium (desktop 1280×800 and emulated iPhone 390×844 Safari UA — emulated,
not a physical device): prompt → wrong password error → correct password → game loads (ATHLETE_M_V6, district 4 landmarks, in-page
single-player authority, zero private-network requests) → refresh keeps the session → logout closes it → password absent from every served
byte. Harness: 16_TESTS/gameplay_demo_gate.test.mjs (24/24); `node deploy/release.mjs --check <url>` is the fail-closed post-deploy assertion
(401 page + 401 JSON asset, never 200); the three deploy permalinks known to this session all answer 401. Older permalinks cannot be listed
without credentials: `node deploy/purge_open_deploys.mjs --dry` (same token as below) finds and deletes any pre-gate deploy that still serves
the game openly.

## The one remaining step (main site) — what the login revealed (2026-09-17)
With the owner's `netlify login` I inspected the main site (unrivaled-quokka-ddcf49): its published deploy is a "drop" build whose 100 published
files are handoff documents + 404.html; every page is served through **93 redirect rules and 21 header rules compiled from the netlify.toml
of the build SOURCE** (the MAHFITT v399 project zip), which is on neither this laptop (searched: no MAHFITT folder / zip / netlify.toml anywhere)
nor downloadable from the API. So the planned digest-clone deploy (`fob_add_mahdemo_route.mjs`) would have shipped only our three lines and
DROPPED the site's own rules — it now refuses to run (exit 7) unless the rules exist as files.

Two safe ways to get the demo onto fob.systems:
1. **Path route (canonical `https://fob.systems/mahdemo`)** — put the MAHFITT project folder / zip (v399: `netlify.toml` + `netlify/functions`)
   on this laptop; I add the three lines (two 302s + the `/mahdemo/*` proxy, kept in `fob_add_mahdemo_route.mjs`) to its `netlify.toml`
   redirects and run `netlify deploy` (draft) → verify → `netlify deploy --prod`. Nothing else on the site changes.
2. **Sub-domain (`https://mahdemo.fob.systems`) — DONE 2026-09-17 with the owner's authorization**: primary custom domain on the DEMO site,
   one managed DNS record in the fob.systems zone, wildcard certificate already valid; verified 16/16 (25_HANDOFF/S13_CLOSURE.md). This is the
   canonical public address until the path route (option 1) is possible.
