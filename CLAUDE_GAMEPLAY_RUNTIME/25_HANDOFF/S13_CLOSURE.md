# S13 CLOSURE — public demo on the owner's domain (2026-09-17)

## Final canonical demo URL
**https://mahdemo.fob.systems** (password prompt → the S13 playable demo). The path form `https://fob.systems/mahdemo` was NOT created: the main
site's 93 redirect / 21 header rules live in its build source (MAHFITT v399 zip, not on this laptop), so any deploy of the main site from
here would drop them — see deploy/PUBLIC_ACCESS_STATUS.md. The main MAHFITT site was not redeployed and is unchanged.

## What was changed (owner-authorized, 2026-09-17)
| item | value |
|---|---|
| Netlify project | mahworld-test-preview · site id `968f80e5-889b-43a8-b2cd-5860c588546a` |
| custom domain (primary; Netlify requires a primary before aliases) | `mahdemo.fob.systems` — the netlify.app address keeps working (still gated, not redirected) |
| DNS | one managed record added to the fob.systems zone (`6a641287708a1b104e4b6245`): `NETLIFY mahdemo.fob.systems → mahworld-test-preview.netlify.app`; the two existing records (`fob.systems`, `www.fob.systems` → the main site) untouched; no other zone touched |
| certificate | Let's Encrypt wildcard `*.fob.systems` + `fob.systems`, issued 2026-07-25, valid to 2026-10-23, presented on mahdemo.fob.systems (curl ssl_verify 0) |
| live deploy | `6aab65567e997ae33c1da204` = the S13 build (git `6933aee`/`0839186`, ATHLETE_M_V8, daytime district, rear camera, endpoint emotes, exercise attacks, donor hit reaction) behind gate v2 |
| rollback deploy | `6aab35c5cedca9fb585a2fbe` (S11 world, V6 body, same gate) — Netlify UI → Deploys → publish; both permalinks answer 401 unauthenticated |
| main site | `da939c11-2915-43e5-9d61-a4b617eb7a5e` (unrivaled-quokka-ddcf49) — custom domain fob.systems, no aliases, published deploy `6aa2f29478e93e4711f7b9f6`, updated_at unchanged (2026-09-10) |

## Verification (all after the change; curl + real headless Chromium 1280×800 and EMULATED iPhone 390×844 Safari UA — no physical device)
1. resolves: `mahdemo.fob.systems` → 98.84.224.111 / 18.208.88.157 (Netlify) — PASS
2. HTTPS valid: Let's Encrypt `CN=*.fob.systems`, SAN `*.fob.systems, fob.systems`, curl `ssl_verify_result=0` — PASS
3. fail-closed unauthenticated: `release.mjs --check` → play page 401 (password page, no-store), private asset 401 JSON — PASS
4. password page loads (title "MAHWORLD DEMO", form) — desktop + iPhone PASS
5. wrong password → 303 to `?mahdemo_err=w4` → readable "Wrong password. 4 attempts left before a short pause." — PASS (both)
6. correct password → 303 back to `play?field=1`, game boots — PASS (both)
7. ATHLETE_M_V8 loads (`slot().id`) — PASS (both)
8. daytime district loads (scene background DAY, 4 landmark GLBs, ~230k tris) — PASS (both)
9. refresh keeps the session (game present, asset 200 with cookie) — PASS (both)
10. logout (`?mahdemo_logout=1`) → password page, asset 401 again — PASS (both)
11. direct navigation to the deep play URL works (steps D use it directly) and `/` → 303 relative to the play URL — PASS
12. desktop Chromium — PASS (A–H)
13. emulated iPhone — PASS (A–H)
14. `https://mahworld-test-preview.netlify.app/...play` still answers the gate (401, not redirected away); deploy permalink `6aab6556…` 401 — PASS
15. main site unchanged: `fob.systems/` 200, a published doc 200, `fob.systems/mahdemo` still the main site's own 404, custom domain / aliases / published deploy / updated_at unchanged — PASS
16. no unrelated DNS / domain settings changed: zone = 3 records (2 original + the new one), other zones untouched — PASS
Password never appears in served bytes (probe H) and is not in this file.

## To undo the alias later
Netlify UI → mahworld-test-preview → Domain management → remove `mahdemo.fob.systems` (and the auto-created DNS record). Nothing else depends on it.

## Standing state after S13
git `0839186` (tag `s13_convergence`); review video `26_LOCAL_AUTHORITY/deploy/review/s13/mahworld_s13_review.webm`; details in
25_HANDOFF/S13_CONVERGENCE_STATUS.md. Blender was not launched (slot reserved).
