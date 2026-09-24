# MAHWORLD hosted demo — deployment package (development, 2026-09-15)

Target: `https://fob.systems/mahworld` (password-protected early demo). The demo has TWO parts and both need hosting:

| part | what it is | can Netlify (current fob.systems host) run it? |
|---|---|---|
| authoritative live backend | `lab_host_server.mjs --demo`: a long-running Node 22 process with in-memory game state, a 50 ms tick loop, HTTP polling API and the password gate | **No.** Netlify serves static files and short-lived functions; it cannot keep a stateful tick loop alive. |
| frontend | `lab/play.html` + modules + the 0.6 MB character preview, served BY the backend under `/mahworld` | Not needed separately: the backend serves it. Netlify only needs one proxy rule. |

## What is ready

- `node 26_LOCAL_AUTHORITY/deploy/build_demo_package.mjs` → `deploy/dist/` (runtime + view + preview asset + vendored three.js, no tests / evidence / checkpoints / stores / reports; private-content scan must print `clean`).
- `deploy/Dockerfile` → `docker build -t mahworld-demo 26_LOCAL_AUTHORITY/deploy`.
- Server flags: `--demo` (server-side password gate for demo entry, every API and the live connection; login rate limit 5/min/IP + 60 s lockout; HttpOnly SameSite=Lax cookie, `Secure` behind HTTPS; logout; dev endpoints `/api/dev/*` and `/api/hold` absent) · `--base-path /mahworld` (everything mounted under the prefix; direct navigation, refresh and trailing slash resolve to the login page or the game) · `--memory --field`.
- Verified locally (curl): login page 200 · unauthenticated page 401 · unauthenticated API 401 `DEMO_LOGIN_REQUIRED` · wrong password 401 · right password 303 + cookie · game, modules, GLB and three.js 200 with the session · dev endpoint 404 · outside the base path 404 · 5 bad attempts → 429 · logout → 401 again · the password never appears in logs.

## Environment (the only place the password lives)

```
MAHWORLD_DEMO_PASSWORD=<owner-supplied, ≥ 8 chars>   # never in files, HTML, JS, URLs, logs or this repo
DEMO_SECURE=1                                          # cookie Secure flag (or the proxy sends x-forwarded-proto: https)
DEMO_PUBLIC_ORIGIN=https://fob.systems                 # allowed Origin for API calls through the site proxy
MAHWORLD_THREE_DIR=/app/vendor/three                   # set by the Dockerfile
```

## Netlify side (one rule, added by whoever holds the fob.systems site source — it is not on this machine)

`netlify.toml` (or `_redirects`):
```
[[redirects]]
  from = "/mahworld/*"
  to = "https://<backend-host>/mahworld/:splat"
  status = 200
  force = true
[[redirects]]
  from = "/mahworld"
  to = "https://<backend-host>/mahworld/"
  status = 200
  force = true
```
No other route changes. The backend host must be a persistent Node 22 process reachable over HTTPS (any small container host; the smallest compatible options are a single small VPS or a container platform with an always-on instance — both cost money and were NOT provisioned).

## Behaviour to state to players

- Demo progress lives in the memory store: it resets when the server restarts. No real accounts, progression or rewards are involved (fixture accounts PLAYER_A / PLAYER_B, no persistent store, recovery-held policy untouched).
- The LAN development server (`--lan`) is never exposed to the Internet; only the `--demo` build is meant for hosting.

## Remaining blocker (exact)

1. A persistent backend host (container / VPS) with the environment above — none is configured in this session and no paid resource was provisioned.
2. Access to the fob.systems Netlify site source to add the two redirect lines (the repository is not on this machine; the Netlify MCP connection here is read-only for deploys).
3. The demo password, supplied by the owner directly into the host's environment.
