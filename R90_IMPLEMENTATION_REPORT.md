# MAHFITT / FOB SYSTEMS — R90 UNIFIED ROLE + UI CONVERGENCE

R90 applies the requested R84 unified-role product contract to the newer complete `MAHFITT_R89_FULL_SITE_DEPLOY.zip` source instead of regressing to the older R83 delta.

## Starting checkpoint

- Source: `MAHFITT_R89_FULL_SITE_DEPLOY.zip`
- SHA-256: `d782a03034d28e1cf7f4248b96499480e34145ef32afad9ca65780970004a64d`
- Fresh extraction baseline taken before edits.
- R89 was verified as a complete FOB/MAHFITT deployment tree, including service worker, Netlify configuration/functions, Supabase migrations, canonical member application, admin/business surfaces and accepted Mr.Mah/Protocol work.

## Architecture delivered

There is one canonical MAHFITT application. R90 separates authenticated account from active fitness profile and permission context. Coach self uses ordinary canonical MAHFITT. Coach Mode adds a searchable authorized Client Directory. Entering a client changes only the active fitness owner and permission context; it does not impersonate the client or replace the signed-in account.

The server independently re-authorizes non-self targets through `netlify/functions/_mahfitt-role-context.js`. The new `mahfitt_coach_relationships` table expresses ordinary coach relationships and per-domain permissions without weakening the existing FOB admin grant.

## Canonical client experience

Jah -> Coach Mode -> Clients -> Dominic -> short `SWITCHING TO Dominic` transition -> canonical MAHFITT. A compact shared `COACH MODE / VIEWING DOMINIC / EXIT` treatment remains visible across client-context pages. Context survives normal MAHFITT navigation through a single session owner and server-side revalidation.

Canonical Program, Calendar, Meal Log, Progress and Media owners receive active-profile context instead of creating coach copies. Program writes target the client's existing canonical program rows. Calendar client data is client-owned while Theme/music remain account-owned. Relationship-coach messages reuse the existing message tables and persist with `sender_role = coach`.

## Protected ownership

Client-context personal AI is blocked at UI and server/action levels: Mr.Mah, MAH Protocol, Prowork, Retrowork and Meal Scan AI cannot be operated as another member. A coach using MAHFITT as self retains their own permitted AI.

Music and Theme are explicitly signed-in-account owned. Client profile hydration is fitness-only; context switching does not call Theme/music hydration or teardown owners. Calendar also reads account Theme/music state while rendering client calendar data.

## FOB administration

The legacy separate-looking `/admin` experience is no longer presented as the ordinary coaching application. It is clearly positioned as FOB business administration and points primary coaching work to canonical MAHFITT Coach Mode. Members Edit, inquiries, session/QR controls, FOBreakdown, legacy admin Calendar/Message Center and other existing business operations remain reachable.

## Decision simulator

`dev/mahfitt-role-simulator.html` is an isolated local/localhost-only decision harness with independent member, Dominic client, Jah coach/member and FOB admin perspectives. Fixture edits persist across persona changes and can be reset. It does not call production APIs or read/write real member records.

## Verification summary

- 244 / 244 targeted automated assertions PASS.
- 66 / 66 required responsive role-flow interactions PASS in headless Chromium simulation.
- Current full-tree syntax/structure/release gate PASS.
- R82 70/70 and R83 62/62 Mr.Mah preservation assertions PASS under the deliberate R90 v447 deployment contract.
- No production/source file from R89 was deleted.

Physical iPhone/iPad validation and live authenticated audio playback across a real backend/device remain explicitly unverified; see `R90_TEST_RESULTS.md`.

## Deployment note

Apply Supabase migration `052_mahfitt_role_context.sql` before expecting ordinary relationship-based Coach Mode clients. If that table is absent, the resolver fails closed for ordinary coach relationships; the independently authenticated legacy FOB admin grant remains available as before.
