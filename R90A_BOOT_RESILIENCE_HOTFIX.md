# MAHFITT R90A — Entry Boot Resilience Hotfix

## Field evidence
A physical iPhone capture after the R90 deployment showed the normal MAH GYM name-entry screen with the red fallback message:

`MAH GYM is unavailable right now.`

That string is emitted only by the outer `netlify/functions/mygym.js` 500 catch. A normal signed-out boot is supposed to return 401 and show the entry form without a server-error banner.

## Root cause
R90 correctly separated signed-in account from active fitness profile, but ordinary `boot` also queried the new Coach Mode capability layer so the client could decide whether to expose Coach Mode. That capability discovery is optional to self/member MAHFITT. It was nevertheless allowed to throw into the critical app bootstrap if the coach-relationship lookup had an unexpected schema/service failure.

That violated ownership: optional coach discovery was able to take down canonical member boot.

## Fix
`netlify/functions/_mahfitt-role-context.js` now enforces three separate behaviors:

1. **Self/member context:** Coach capability discovery is best-effort. Failure degrades `canCoach` to the independently authenticated FOB-admin grant (or false) and self MAHFITT continues to boot.
2. **Client context:** authorization remains strict. If the relationship service cannot prove access, client context fails closed with `503 COACH_CONTEXT_UNAVAILABLE`.
3. **Coach Directory:** returns the same specific 503 instead of bubbling into the generic MAH GYM 500.

No client CSS, crown, audio, Mr.Mah, Protocol, Calendar, Program, workout, Theme, or navigation owner changed.

## Cache/version
No browser asset changed. This is a Netlify server-function/module hotfix, so R90's v447 client/service-worker cache identity remains correct and intentionally unchanged.

## Deployment note
Migration `supabase/migrations/052_mahfitt_role_context.sql` is still required to enable ordinary relationship-based Coach Mode. The difference after R90A is that migration/service problems cannot take down a member's own MAHFITT entry path.
