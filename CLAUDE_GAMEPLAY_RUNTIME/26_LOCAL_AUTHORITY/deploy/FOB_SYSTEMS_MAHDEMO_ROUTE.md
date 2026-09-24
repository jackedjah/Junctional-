> SUPERSEDED 2026-09-17 by PUBLIC_ACCESS_STATUS.md: the bare /mahdemo and /mahdemo/ entries must be 302 redirects to
> /mahdemo/claude_gameplay_runtime/26_local_authority/lab/play?field=1 (not 200 proxies); only /mahdemo/* proxies. deploy/fob_add_mahdemo_route.mjs applies it.

# fob.systems/mahdemo — the one change needed in the fob.systems site source

The demo is live at https://mahworld-test-preview.netlify.app (static, self-updating from this repo's deploys).
fob.systems (Netlify project `unrivaled-quokka-ddcf49`) is deployed from a source tree that is NOT on this machine and carries 54
serverless functions, so it must not be re-uploaded blind. Add these lines to that site's `_redirects` (or the equivalent in its
`netlify.toml`) and redeploy it once; nothing else on fob.systems changes:

```
/mahdemo        https://mahworld-test-preview.netlify.app/claude_gameplay_runtime/26_local_authority/lab/play?field=1   200!
/mahdemo/*      https://mahworld-test-preview.netlify.app/:splat   200!
```

Why this works with the demo's code: every asset URL in the game is relative to `play.html` (modules, GLBs, JSON, three.js, shims), the
in-page authority computes its base from `location.pathname`, and the only absolute redirects (`/` and `/go`) live on the demo site
itself. Under the proxy the browser stays on fob.systems/mahdemo/... and the splat forwards each relative fetch unchanged.

netlify.toml form:
```
[[redirects]]
  from = "/mahdemo"
  to = "https://mahworld-test-preview.netlify.app/claude_gameplay_runtime/26_local_authority/lab/play?field=1"
  status = 200
  force = true
[[redirects]]
  from = "/mahdemo/*"
  to = "https://mahworld-test-preview.netlify.app/:splat"
  status = 200
  force = true
```
